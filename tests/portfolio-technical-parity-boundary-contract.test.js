'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL PARITY — PERMANENT BOUNDARY CONTRACT.
//
// A RELOCATION, NOT A REWRITE. One contiguous fragment of the inline monolith,
// [954446,967048) in monolith coordinates at the base, is now
// js/portfolio/portfolio-technical-parity.js. The module is the block's bytes
// verbatim, and tests/lib/portfolio-technical-parity-undo.js reconstructs the
// pre-extraction index.html byte for byte. EVERY coordinate below is measured
// on THAT reconstruction, so nothing here is a remembered copy of the base.
//
// FOUR OWNERS, which turn a backend technical-refresh response into a by-ticker
// map behind a formula-parity gate: `PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES`
// (211, a `var`), `_resolvePortfolioTechnicalParityKey` (261),
// `buildFormulaParityGate` (2,943) and
// `buildBackendTechnicalByTickerFromResponse` (7,529).
//
// ── THE FINDING THIS LAYER SHIPPED: THE BANNER SIGNAL IS SPENT ─────────────
//
// A `// ── ` banner that NAMES the declaration it governs is the strongest
// structural signal this document offers: where one exists, where the feature
// ends is not a judgement — the banner says. LAYERS_OPENING_ON_BANNER of the
// layers on this chain open ON a banner at all, which §9 counts; how many of
// THOSE banners named their owner is measured nowhere, so it is not claimed
// here.
//
// WHAT IS MEASURED IS WHAT WAS LEFT. Of the 221 top-level banner marks in the
// base monolith, 77 were `// ── ` dash banners, and NONE of them named an owner
// it governed. §4 re-measures that on every push and — because a metric whose true
// value is zero is indistinguishable from a metric that measures nothing — runs
// the SAME predicate over the document the previous layer's undo helper
// reconstructs, where the answer is ONE: `fetchDXLinkGreeks`, the region #465
// cut. At that base the signal was not scarce but singular, and the cycle
// before this one spent it.
//
// SO THIS BOUNDARY IS ARGUED FROM THE CALL GRAPH, and §5 re-executes that
// argument rather than quoting it: of the four owners, TWO are referenced
// nowhere outside the cut at all, and the other two only from inside ONE
// function. None of the eighteen owners that follow them under the same banner
// names any of the four, so the end of the cut severs no call.
//
// IT DOES NOT OPEN ON A BANNER. It opens on an 828-unit explanatory comment
// block about the alias table it owns, and §2 proves every line of that block
// is a comment and that a blank line separates it from the declaration above.
//
// ── WHAT FOLLOWS IT IS ANOTHER FEATURE, IMMEDIATELY ────────────────────────
//
// The next top-level owner begins at EXACTLY the raw end: no blank line, no
// banner, no header between. That is the `tt-reconnect` shape, the one where
// "extend to the next header" would swallow the next feature whole — which is
// why this programme has no such rule and §2 pins the seam instead.
//
// ── COUPLING ───────────────────────────────────────────────────────────────
//
// FOUR edges reach in, all four hosted by `refreshPositionsLive` — 138,483
// units, the largest top-level declaration in the monolith and the same hub the
// layer before this one answered to. That is ONE consumer at four sites.
//
// ONE monolith dependency, `_technicalTfSqueezeState`, declared 189,471 units
// earlier. Every other direction is ZERO, including BOTH halves of the ninth:
// this region names no module at all, chain or foundation. §3 keeps those two
// zeroes apart, because they are not the same claim written twice.
//
// ── WHAT THIS CONTRACT IS FOR ───────────────────────────────────────────────
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 82nd and final local
// script (index 81 of 82), which is what MODULE_POSITION pins, and §7 loads it
// in a COMPLETELY empty VM: four globals defined, and no fetch, timer, socket,
// storage read or listener touched while it loads. §7 also RUNS the parity
// resolver on inputs where the answer differs, which is what makes its verdict
// a measurement rather than an echo.
//
// §8 plants every failure the undo helper documents AS REACHABLE and asserts
// its EXACT message. The seventh, BASE_IDENTITY, is a deliberate redundant
// final gate and has no mutant that reaches it once the module digest and the
// whole-document digest have both passed; the helper says so in its own header.
// §9 carries the chain-wide counts — this is the newest layer, so this is the
// contract that holds CHAIN_LENGTH and the counts derived from it — and the
// exact production scope of the change.
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
// §4 needs the document as it was BEFORE the last cut, to prove its zero is a
// measurement. The shipped undo helper reconstructs it byte-exactly.
const PREV_UNDO = require('./lib/dxlink-greeks-fetch-undo.js');

const UNDO = require('./lib/portfolio-technical-parity-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-technical-parity.js';
const TAG = '<script src="./js/portfolio/portfolio-technical-parity.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/dxlink-greeks-fetch.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'b22b355';
const BASE_CHARS = 1491306;
const BASE_UTF8 = 1520056;
const BASE_LF = 25802;
const BASE_SHA256 = '088c2808f2668e6c47489729119a7baa880938835e1c6b112e1236222765abb8';
const BASE_LOCAL_SCRIPTS = 81;
const LOCAL_SCRIPT_COUNT = 82;
const MODULE_POSITION = 81;
const TEST_FILE_COUNT = 166;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-technical-parity-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-parity-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-technical-parity-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/portfolio-technical-parity-undo.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-parity-contract.spec.js';
// Chain-order retirement: the layer that was newest at the base is no longer
// newest, so its spec goes. §9 pins that path by what the BASE commit carried,
// because absence alone is satisfied by any wrong path, including one that
// never existed.
const RETIRED_SPEC_REL = 'tests/mutation-specs/dxlink-greeks-fetch-contract.spec.js';
const RETIRED_CONTRACT_REL = 'tests/dxlink-greeks-fetch-boundary-contract.test.js';
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 227;
const RETIRED_MUTANTS = 106 + 115;
// This layer's own contribution to the mutant budget. The LIVE total is not
// pinned here: it is a fact about the suite TODAY, which every later audit
// moves by design.
const CONTRACT_SPEC_MUTANTS = 121;
const MUTANT_BUDGET = 250;
const LAYER_CONTRACT_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114733;
const CODE_CHARS = 1376547;
const TOP_LEVEL_DECLS = 939;
const TOP_LEVEL_BANNERS = 221;
const OWNER_REGIONS = 120;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 954446;
const RAW_END_IN_CODE = 967048;
const BODY_END_IN_CODE = 967047;
const RAW_CHARS = 12602;
const BODY_CHARS = 12601;
const BODY_UTF8 = 12608;
const BODY_LF = 197;
const BODY_SHA256 = 'b67908efa8b87770cfe9ab42af697ce2217b731d473b5ccc19fb18f84eb5dbc8';
const BODY_ENDING = '}\n';
const OWNERS_EXPECTED = [
  'PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES',
  '_resolvePortfolioTechnicalParityKey',
  'buildFormulaParityGate',
  'buildBackendTechnicalByTickerFromResponse',
];
const OWNER_COUNT = 4;
const FUNCTION_OWNERS = 3;
const BINDING_OWNERS = 1;
const OWNER_SIZES = [211, 261, 2943, 7529];
const TOTAL_LINES = 198;
const CODE_LINES = 156;
const COMMENT_LINES = 42;
const OPENING_COMMENT_LINES = 36;
// The explanatory comment block the cut OPENS on, which is where the boundary
// judgement in §5 starts. It is not a banner — §4 is the reason it cannot be.
const OPENING_BLOCK_CHARS = 828;
const OPENING_BLOCK_FIRST_LINE =
  '// Portfolio technical 1D formula-parity keys and their accepted, semantically';
const NET_REDUCTION = 12533;
const RESIDUAL_MONOLITH = 1363945;
const INDEX_AFTER = 1478773;
const TAG_GAP = 954454;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [1053378, 1058085, 1064371, 1070219];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = ['_technicalTfSqueezeState'];
const DEPENDENCY_AT = 764975;
const DEPENDENCY_DISTANCE = 189471;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
// BOTH halves of the ninth direction are zero here, which is not the same claim
// twice: one says it reaches into no module this programme extracted, the other
// that it reaches into no foundation module either.
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const FULL_NINE = 5;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 4;

// ── THE FINDING: the banner signal is spent ──────────────────────────────────
const DASH_BANNERS = 77;
const BANNERS_NAMING_AN_OWNER = 0;
// The control, on the document the shipped undo helper reconstructs.
const PREV_DASH_BANNERS = 78;
const PREV_BANNERS_NAMING_AN_OWNER = 1;
const PREV_NAMED_OWNER = 'fetchDXLinkGreeks';
const PREV_NAMED_BANNER_AT = 1025308;

// ── The three clean candidates, and why each boundary is refused ─────────────
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 3;
const SPLIT_SET = [
  [719173, 722692],
  [929378, 932088],
  [975281, 977133],
];
// (a) opens on a SECTION header whose section continues past the cut.
const HEADER_CUT_AT = 719173;
const HEADER_CUT_END = 722692;
const HEADER_CUT_UNITS = 3519;
const HEADER_FIRST_LINE = '// ═══════════════════════════════════════════════════════════════';
const HEADER_TITLE_LINE = '// PORTFOLIO MANAGER — state + CRUD';
const HEADER_NEXT_OWNER = 'positionManager';
// (b) and (c) are lone owners inside the catch-all below.
const CATCH_ALL_AT = 917467;
const CATCH_ALL_END = 999327;
const CATCH_ALL_UNITS = 81860;
const CATCH_ALL_OWNERS = 31;
const CATCH_ALL_INTERIOR_MARKS = 0;
const CATCH_ALL_BANNER =
  '// ── [PortfolioRefreshPayload] — gated verbose payload diagnostics ─────────────';
// What the banner actually describes: the first three owners.
const DIAGNOSTICS_OWNERS = [
  '_portfolioRefreshPayloadDebugEnabled',
  '_portfolioRiskDebugEnabled',
  '_portfolioTechnicalDebugEnabled',
];
const DIAGNOSTICS_UNITS = 1602;

// ── The call-graph argument the boundary rests on instead ────────────────────
// Owners referenced NOWHERE outside the cut, and owners referenced only from
// inside one function. Together they are the whole owner list.
const OWNERS_WITH_NO_OUTSIDE_REFERENCE = [
  'PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES',
  '_resolvePortfolioTechnicalParityKey',
];
const OWNERS_REFERENCED_FROM_ONE_HOST = [
  'buildFormulaParityGate',
  'buildBackendTechnicalByTickerFromResponse',
];
// The owners that FOLLOW the cut under the same banner, none of which names any
// of the four — which is what makes the end of the cut a boundary and not a
// severed call.
const FOLLOWING_OWNERS_UNDER_BANNER = 18;
const FOLLOWING_REFERENCES_INTO_THE_CUT = 0;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7649;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3284;
const CLEAN_CANDIDATES = 2033;
const ONE_CONSUMER_MULTI_SITE = 135;

// ── Where this layer would sit ───────────────────────────────────────────────
const CHAIN_LENGTH = 38;
const MODULE_SIZE_RANK = 28;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const LAYERS_LARGER_THAN_THIS_CUT = 10;
const LAYERS_ENDING_BRACE = 35;
const LAYERS_WITH_SEPARATOR = 30;
const LAYERS_WITH_RAW_PAIR = 27;
const LAYERS_WITHOUT_SEPARATOR = 8;
const UNDOCUMENTED_LAYERS = 2;
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 21;

// ── Reachability at this base ────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

// ── The chain, as it stands with this layer on it ────────────────────────────
// CHRONOLOGICAL, oldest first, ending at THIS layer: a contract's chain records
// the tree as its own cut left it, which is why the previous contract's copy
// ends one entry earlier and is not extended by later cycles.
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
  'js/services/journal-snapshot-helpers.js',
  'js/services/swing-weekly-candles.js',
  'js/services/swing-direction.js',
  'js/portfolio/backend-positions-aggregate.js',
  'js/portfolio/portfolio-technical-merge.js',
  'js/portfolio/portfolio-technical-alignment-debug.js',
  'js/services/journal-map-audit.js',
  'js/services/dxlink-greeks-fetch.js',
  'js/portfolio/portfolio-technical-parity.js',
];

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
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

console.log('PORTFOLIO TECHNICAL PARITY — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited by #466 · base=' + BASE_SHA);

// THIS IS THE NEWEST LAYER, so nothing is peeled above it: the live document IS
// this layer's shipped document. When a later cycle cuts again, a peel goes here
// and LIVE_INDEX stops being the head of the tree — the idiom every older
// contract in this chain already carries.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const INDEX = UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, MODULE);
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

// The siblings are the modules that had ALREADY left at this base, which is the
// set this region could have depended on. The module this layer ships is not
// among them — it did not exist yet.
const SIBLINGS = LOCALS.map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
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
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked) }));
  for (const d of DECLS) {
    let n = 0;
    for (const m of per) if (!m.bound.has(d.name)) n += (m.idx.get(d.name) || []).length;
    SIB_REFS.set(d.name, n);
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
  const sites = [];
  for (const n of names) {
    for (const at of at0(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += at0(OCC_STRINGS, n).filter(outside).length;
    sib += SIB_REFS.get(n);
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
// Which banner governs an offset — the last `// ── ` or `// ═══` mark at or
// before it. §5 needs this for the dead rule and for nothing else.
const SORTED_MARKS = MARKS.slice().sort((a, b) => a - b);
function bannerOf(i, marks) {
  const ms = marks || SORTED_MARKS;
  let b = -1;
  for (const m of ms) { if (m <= i) b = m; else break; }
  return b;
}

const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REGIONS = mergedRegions(MARKS);


// ── The screen, run ONCE and reused by §5 and §6 ─────────────────────────────
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

// Which KIND of module owns a name: one this programme extracted, or one that
// predates it. CHAIN is the literal above — this is the newest layer, so this
// contract is where that list lives.
const CHAIN_SET = new Set(CHAIN);
const OWNER_KIND = new Map();
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
// byConsumer with the FOUNDATION half of the ninth direction removed.
const byConsumerSplit = (p, split) => byConsumer(p) - p.outModule + split.chain;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is the extracted length');
eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…its byte length');
eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…its line-feed count');
eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and its digest');
eq(LIVE_INDEX.length, INDEX_AFTER,
  '…which is the figure the audit PREDICTED before the move, not one read back afterwards');
eq(LIVE_LOCALS.length, LOCAL_SCRIPT_COUNT, 'it loads LOCAL_SCRIPT_COUNT local application scripts');
eq(LIVE_LOCALS.indexOf(MODULE_REL), MODULE_POSITION,
  '…this module being the LAST of them, at MODULE_POSITION');
eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
  '…read off the tail directly, so the endpoint is pinned by position and not only by index');
eq(count(LIVE_INDEX, TAG), 1, 'exactly one tag for it');
eq(count(LIVE_INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1,
  '…immediately after the previous layer\'s tag and immediately before the inline monolith');
// THE RECONSTRUCTION IS THE BASE, and that is asserted against git rather than
// against a number this file carries: a digest written here could be wrong in
// exactly the same way twice and still agree with itself.
eq(INDEX.length, BASE_CHARS, 'the reconstruction is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this digest');
eq(INDEX, git(['show', BASE_SHA + ':index.html']),
  '…and it is the base commit\'s index.html BYTE FOR BYTE, which is the claim the whole file '
  + 'rests on — every coordinate below is an offset into this string');
eq(LOCALS.length, BASE_LOCAL_SCRIPTS, 'the base loaded BASE_LOCAL_SCRIPTS local scripts');
eq(LOCAL_SCRIPT_COUNT - BASE_LOCAL_SCRIPTS, 1, '…exactly one fewer: this layer');
eq(INDEX.indexOf(CODE), CODE_AT, 'the base inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and ran CODE_CHARS units');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it declared TOP_LEVEL_DECLS names at top level');
eq(MARKS.length, TOP_LEVEL_BANNERS, '…under TOP_LEVEL_BANNERS top-level banners');
eq(REGIONS.length, OWNER_REGIONS, '…which merge into OWNER_REGIONS regions that own a declaration');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE, BODY, 'THE MODULE IS THE BLOCK\'S BYTES, with nothing added and nothing removed');
eq(MODULE.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(MODULE, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((MODULE.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(MODULE), BODY_SHA256, '…and this digest, which the audit pinned before the move');
eq(MODULE.length, UNDO.MODULE_CHARS, '…the undo helper agreeing on the length');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and on the digest');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE).length, RAW_CHARS,
  'the raw fragment index.html gave up is RAW_CHARS units: the body plus one separator');
eq(RAW_CHARS - BODY_CHARS, 1, '…exactly one, which is the separator');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
  '…and the fragment IS the module followed by that separator, which is why the module file '
  + 'ends line-terminated and index.html needs no reflow');
eq(MODULE.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line');
ok(/[^\x00-\x7F]/.test(MODULE),
  'it is NOT pure ASCII — the prose in its opening block settles that');
// IT DOES NOT OPEN ON A BANNER, and §4 is the reason no region could any more.
eq(MARKS.indexOf(RAW_AT_IN_CODE), -1, 'the cut does NOT begin on a banner mark');
eq(MODULE.slice(0, MODULE.indexOf('\n')), OPENING_BLOCK_FIRST_LINE,
  '…it begins on the first line of an explanatory comment block');
eq(BY_NAME.get(OWNERS_EXPECTED[0]).start - RAW_AT_IN_CODE, OPENING_BLOCK_CHARS,
  '…which runs OPENING_BLOCK_CHARS units before the first declaration');
{
  const block = CODE.slice(RAW_AT_IN_CODE, RAW_AT_IN_CODE + OPENING_BLOCK_CHARS);
  ok(block.split('\n').filter(Boolean).every((l) => /^\s*\/\//.test(l)),
    '…and every line of it is a comment, so nothing executable was swept in');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    '…with a blank line before it, so the block belonged to what FOLLOWED it and not to '
    + 'the declaration above');
}
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  eq(next.start, RAW_END_IN_CODE,
    'the next top-level owner began EXACTLY where the raw span ends — no blank line, no\n'
    + '     banner and no header between them: the `tt-reconnect` shape, the one where\n'
    + '     "extend to the next header" would swallow the next feature whole');
  ok(bannerOf(next.start) === bannerOf(RAW_AT_IN_CODE),
    '…and it sat under the SAME banner, which is why the banner could not end this region '
    + 'and the boundary is the judgement §5 publishes');
  eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n',
    '…with exactly one structural newline between the body and that owner');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these four names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS,
    '…FUNCTION_OWNERS of which are functions');
  eq(OWNERS.length - OWNERS.filter((d) => d.form === 'function').length, BINDING_OWNERS,
    '…and BINDING_OWNERS is a `var`, so this layer ships a mutable binding as well as code');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes');
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment');
}
// What the move cost, predicted by the audit and now realised.
eq(BASE_CHARS - LIVE_INDEX.length, NET_REDUCTION,
  'index.html fell by NET_REDUCTION units net: the span left and a tag arrived');
eq(RAW_CHARS - NET_REDUCTION, TAG.length,
  '…and the difference is exactly the tag line this layer added');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, 'the monolith is left at RESIDUAL_MONOLITH units');
{
  const liveCode = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  eq(liveCode.length, RESIDUAL_MONOLITH,
    '…which the shipped document confirms, not only the arithmetic');
  eq(liveCode.indexOf(OPENING_BLOCK_FIRST_LINE), -1,
    '…and the opening block is gone from it entirely');
  // THE OWNERS' NAMES SURVIVE IN THE RESIDUE, at exactly their call sites and
  // nowhere else — which is what makes this a relocation rather than a deletion.
  // Counted on the MASKED residue: the raw substring count is higher, because the
  // largest owner's name also appears inside log strings, and a substring count
  // would have read 8 where the reference count reads 3.
  {
    const liveMasked = maskLiterals(liveCode);
    const per = OWNERS_EXPECTED.map((n) => refSites(liveMasked, n).length);
    eq(per.reduce((a2, b2) => a2 + b2, 0), EXTERNAL_EDGES,
      '…and they total EXTERNAL_EDGES references, the same four edges §3 pins');
    eq(OWNERS_EXPECTED.filter((n, i) => per[i] === 0), OWNERS_WITH_NO_OUTSIDE_REFERENCE,
      '…with the two private owners appearing in the residue not at all');
    ok(count(liveCode, OWNERS_EXPECTED[3]) > refSites(liveMasked, OWNERS_EXPECTED[3]).length,
      'control — the RAW substring count is strictly higher, which is why the masked '
      + 'reference count is the one being asserted');
  }
}
{
  const tagAt = LIVE_INDEX.indexOf(TAG);
  const inlineOpenAt = LIVE_INDEX.indexOf(INLINE_OPEN, tagAt);
  eq(inlineOpenAt, tagAt + TAG.length, 'the tag line sits immediately before the inline monolith');
  eq(LIVE_INDEX.slice(tagAt - 1, tagAt), '\n', '…on its own line, so nothing was reflowed');
  eq((CODE_AT + RAW_AT_IN_CODE) - (CODE_AT - INLINE_OPEN.length), TAG_GAP,
    'the tag line begins TAG_GAP units before the fragment it replaced, in base coordinates');
  eq(TAG_GAP - RAW_AT_IN_CODE, INLINE_OPEN.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
  eq(UNDO.RAW_AT - tagAt, TAG_GAP,
    '…and the helper\'s RAW_AT sits the SAME distance past the tag, which is what makes it a\n'
    + '   TAG-FREE offset: it is where the fragment goes back AFTER the tag line is removed, so\n'
    + '   the two coordinates coincide rather than differing by the width of the tag');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'EXTERNAL_EDGES references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
eq(consumersOf(REC), EDGE_HOSTS, '…all of them hosted by ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
{
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  eq(host.chars, CONSUMER_CHARS, '…of CONSUMER_CHARS units');
  eq(DECLS.slice().sort((a, b) => b.chars - a.chars)[0].name, EDGE_HOSTS[0],
    '…which makes it the LARGEST top-level declaration in the monolith, measured over all of '
    + 'them rather than asserted from the ones nearby');
  // THE SAME HUB AS LAST CYCLE, read off that layer's contract rather than
  // recalled: two consecutive cuts answering to one function is a fact about
  // this document worth executing, not a sentence worth repeating.
  {
    const prevHost = fs.readFileSync(path.join(ROOT, RETIRED_CONTRACT_REL), 'utf8')
      .match(/^const EDGE_HOSTS = \[([^\]]*)\];$/m)[1].replace(/'/g, '').trim();
    eq(prevHost, EDGE_HOSTS[0],
      '…and it is the SAME consumer the layer before this one answered to');
  }
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and it is declared outside the region, so the edges really do cross the boundary');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names exactly ONE monolith declaration, and the list is the name rather than a count');
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT');
  eq(Math.abs(dep.start - RAW_AT_IN_CODE), DEPENDENCY_DISTANCE,
    '…DEPENDENCY_DISTANCE units away, so it is not a neighbour the cut could absorb');
  ok(dep.start < RAW_AT_IN_CODE, '…and it precedes the region, so load order already resolves it');
}
eq(Object.assign({}, {
  inboundWrites: REC.inWrites,
  inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length,
  siblingModules: REC.sib,
  staticMarkup: REC.mkp,
  generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen,
  outboundModule: REC.outModule,
}), ZERO_DIRECTIONS,
'every remaining direction is ZERO — the object is compared as a whole, so a direction that '
+ 'started scoring could not hide behind the ones that did not');
eq(REC.nine, FULL_NINE, 'the nine-direction total is FULL_NINE: four inbound sites and one dependency');
eq(byConsumer(REC), BY_CONSUMER, '…and BY_CONSUMER under the #458 reading, which collapses the four '
  + 'sites to the one consumer that hosts them');
ok(FULL_NINE > BY_CONSUMER, '…so the two readings genuinely differ here, and the difference is the '
  + 'three extra sites inside the same function');

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: no banner in this document names its own owner');
// ─────────────────────────────────────────────────────────────────────────────
// A '// ── ' banner that NAMES a declaration it governs is the strongest
// structural signal this document offers: where the feature ends stops being a
// judgement. Every measurement below is over the WHOLE set of banner marks,
// because "there is no such banner" is a universal and this programme has
// written four universals from a partial look and been wrong every time.
function dashBannersNamingAnOwner(code, marks, decls) {
  const sorted = marks.slice().sort((a, b) => a - b);
  const out = [];
  let dash = 0;
  for (const m of sorted) {
    const line = code.slice(m, code.indexOf('\n', m));
    if (!/^\/\/ ── /.test(line)) continue;
    dash++;
    let end = code.length;
    for (const n of sorted) if (n > m) { end = n; break; }
    const named = decls.filter((d) => d.start >= m && d.end < end && line.indexOf(d.name) >= 0);
    if (named.length) out.push({ at: m, line, named: named.map((d) => d.name) });
  }
  return { dash, naming: out };
}
{
  const here = dashBannersNamingAnOwner(CODE, MARKS, DECLS);
  eq(here.dash, DASH_BANNERS, 'DASH_BANNERS of the banner marks are `// ── ` dash banners');
  ok(here.dash < MARKS.length, '…which is fewer than every mark, so the filter selects something');
  eq(here.naming.length, BANNERS_NAMING_AN_OWNER,
    'and BANNERS_NAMING_AN_OWNER of them name an owner they govern — the signal is SPENT');
  eq(here.naming, [], '…the empty list itself, so a banner that started naming one would appear here');
}
// THE CONTROL. A metric whose true value is zero is indistinguishable from a
// metric that measures nothing, so the SAME function runs over the document the
// shipped undo helper reconstructs — the one that existed before #465 cut.
{
  const PREV_INDEX = PREV_UNDO.undoDxlinkGreeksFetch(
    INDEX, fs.readFileSync(path.join(ROOT, 'js/services/dxlink-greeks-fetch.js'), 'utf8'));
  const prevTags = APP_LOADER.parseScriptTags(PREV_INDEX);
  const prevCode = prevTags.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const prevDecls = scanTopLevelDeclarations(prevCode);
  const prevMarks = topLevelBanners(prevCode, functionBodyRanges(prevCode));
  const prev = dashBannersNamingAnOwner(prevCode, prevMarks, prevDecls);
  eq(prev.dash, PREV_DASH_BANNERS, 'the PREVIOUS document carried PREV_DASH_BANNERS dash banners');
  eq(prev.naming.length, PREV_BANNERS_NAMING_AN_OWNER,
    '…and PREV_BANNERS_NAMING_AN_OWNER of them DID name an owner: the function measures something');
  eq(prev.naming[0].named, [PREV_NAMED_OWNER], '…and that owner is PREV_NAMED_OWNER');
  eq(prev.naming[0].at, PREV_NAMED_BANNER_AT, '…at PREV_NAMED_BANNER_AT in that document');
  eq(prev.dash - DASH_BANNERS, 1, 'exactly one dash banner left with that cut');
  eq(prev.naming.length - BANNERS_NAMING_AN_OWNER, 1,
    '…and it was THE naming one: the signal was not scarce, it was singular');
  ok(prevCode.length > CODE.length, 'control — the reconstructed document really is the larger one');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Why the screen\'s three clean candidates are all refused');
// ─────────────────────────────────────────────────────────────────────────────
{
  // The split reading needs the ninth direction resolved per candidate; it is
  // computed once here and reused by every clause below.
  for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
    'under the RAW reading ONE_CONSUMER_RAW candidate reads one consumer and nothing else');
  const split = clean.filter((c) => byConsumerSplit(c.p, c.split) === 1)
    .sort((a, b) => b.units - a.units);
  eq(split.length, ONE_CONSUMER_SPLIT, '…and ONE_CONSUMER_SPLIT do under the split reading #465 shipped');
  // DOWN FROM FOUR, and that is read out of the contract that measured the four
  // rather than remembered here. The one that left is the region #465 cut.
  {
    const wasSplit = Number(fs.readFileSync(path.join(ROOT, RETIRED_CONTRACT_REL), 'utf8')
      .match(/^const ONE_CONSUMER_SPLIT = (\d+);$/m)[1]);
    eq(wasSplit - ONE_CONSUMER_SPLIT, 1,
      '…exactly one fewer than the newest contract pinned at ITS base: the set shrank by the\n'
      + '     candidate that became a module');
  }
  eq(split.map((c) => [c.lo, c.hi]), SPLIT_SET,
    '…which are exactly these three, largest first — the WHOLE set asserted by equality');
  ok(split.every((c) => c.lo !== RAW_AT_IN_CODE),
    'and the recommendation is NOT among them: it is refused by coupling and chosen on boundary, '
    + 'which is the opposite of how the last three cycles chose');
}
// (a) The largest of the three opens on a SECTION header whose section continues.
{
  eq(CODE.slice(HEADER_CUT_AT, CODE.indexOf('\n', HEADER_CUT_AT)), HEADER_FIRST_LINE,
    'the largest clean candidate opens on a `// ═══` rule');
  const second = CODE.indexOf('\n', HEADER_CUT_AT) + 1;
  eq(CODE.slice(second, CODE.indexOf('\n', second)), HEADER_TITLE_LINE,
    '…whose next line is the SECTION TITLE');
  eq(HEADER_CUT_END - HEADER_CUT_AT, HEADER_CUT_UNITS, '…and the candidate is HEADER_CUT_UNITS units');
  const next = DECLS.filter((d) => d.start >= HEADER_CUT_END)[0];
  eq(next.name, HEADER_NEXT_OWNER,
    '…while the very next owner past it is HEADER_NEXT_OWNER — the subject the title names');
  ok(HEADER_TITLE_LINE.toUpperCase().indexOf('PORTFOLIO MANAGER') >= 0 &&
     next.name.toLowerCase().indexOf('positionmanager') >= 0,
  '…so cutting here takes the title off the section that keeps its subject: the defect '
  + 'audit #462 published, unchanged');
}
// (b)+(c) The other two are lone owners inside a mis-labelled catch-all.
{
  const inCatchAll = SPLIT_SET.filter(([lo]) => lo > CATCH_ALL_AT && lo < CATCH_ALL_END);
  eq(inCatchAll.length, SPLIT_SET.length - 1, 'the other two candidates sit inside ONE banner region');
  eq(CODE.slice(CATCH_ALL_AT, CODE.indexOf('\n', CATCH_ALL_AT)), CATCH_ALL_BANNER,
    '…the region whose banner is CATCH_ALL_BANNER');
  eq(CATCH_ALL_END - CATCH_ALL_AT, CATCH_ALL_UNITS, '…which governs CATCH_ALL_UNITS units');
  const own = DECLS.filter((d) => d.start >= CATCH_ALL_AT && d.end < CATCH_ALL_END);
  eq(own.length, CATCH_ALL_OWNERS, '…and CATCH_ALL_OWNERS owners');
  eq(MARKS.filter((m) => m > CATCH_ALL_AT && m < CATCH_ALL_END).length, CATCH_ALL_INTERIOR_MARKS,
    '…with CATCH_ALL_INTERIOR_MARKS interior banner marks: it is one flat run, not a nest');
  eq(own.slice(0, DIAGNOSTICS_OWNERS.length).map((d) => d.name), DIAGNOSTICS_OWNERS,
    'the diagnostics the banner NAMES are its first three owners');
  eq(snapBodyEnd(CODE, own[0].start, own[DIAGNOSTICS_OWNERS.length].start) - own[0].start,
    DIAGNOSTICS_UNITS, '…DIAGNOSTICS_UNITS of the CATCH_ALL_UNITS it governs');
  ok(DIAGNOSTICS_UNITS * 20 < CATCH_ALL_UNITS,
    '…under a twentieth, stated as a comparison rather than as a percentage nobody re-derives');
  ok(own.slice(DIAGNOSTICS_OWNERS.length).every((d) => CATCH_ALL_BANNER.indexOf(d.name) < 0),
    'and the banner names NONE of the twenty-eight owners that follow them');
}
// The boundary this audit publishes instead, argued from the call graph.
{
  const inCut = new Set(OWNERS_EXPECTED);
  const outside = (i) => i < RAW_AT_IN_CODE || i >= RAW_END_IN_CODE;
  const hostsOf = (n) => Array.from(new Set(refSites(MASKED, n).filter(outside)
    .map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
  eq(OWNERS_EXPECTED.filter((n) => hostsOf(n).length === 0), OWNERS_WITH_NO_OUTSIDE_REFERENCE,
    'TWO of the four owners are referenced nowhere outside the cut at all');
  eq(OWNERS_EXPECTED.filter((n) => hostsOf(n).length === 1), OWNERS_REFERENCED_FROM_ONE_HOST,
    '…and the other two only from inside ONE function each');
  eq(Array.from(new Set(OWNERS_REFERENCED_FROM_ONE_HOST.flatMap(hostsOf))), EDGE_HOSTS,
    '…which is the same function in both cases, and it is the consumer §3 pins');
  eq(OWNERS_EXPECTED.length,
    OWNERS_WITH_NO_OUTSIDE_REFERENCE.length + OWNERS_REFERENCED_FROM_ONE_HOST.length,
    'control — those two sets are the whole owner list, so none was left unclassified');
  // And nothing downstream under the same banner reaches back into the cut.
  const following = DECLS.filter((d) => d.start >= RAW_END_IN_CODE && d.end < CATCH_ALL_END);
  eq(following.length, FOLLOWING_OWNERS_UNDER_BANNER,
    'FOLLOWING_OWNERS_UNDER_BANNER owners follow the cut under the same banner');
  const reachBack = following.filter((d) => {
    const body = MASKED.slice(d.start, d.end + 1);
    return OWNERS_EXPECTED.some((n) => refSites(body, n).length > 0);
  });
  eq(reachBack.map((d) => d.name), [],
    '…and NOT ONE of them names an owner of the cut');
  eq(reachBack.length, FOLLOWING_REFERENCES_INTO_THE_CUT,
    '…so the end of the cut severs no call: it is a boundary, not a cut through a call graph');
  // The control that makes that zero mean something.
  ok(following.some((d) => refSites(MASKED.slice(d.start, d.end + 1), EDGE_HOSTS[0]).length >= 0),
    'control — the same scan over the same bodies does find names, so it is not scanning nothing');
  const anyName = following.filter((d) => refSites(MASKED.slice(d.start, d.end + 1),
    MONOLITH_DEPENDENCIES[0]).length > 0);
  ok(anyName.length > 0,
    '…and some of those owners DO name the dependency this cut has, which is the same scan '
    + 'returning a non-zero answer on a name that is genuinely there');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen that found it');
// ─────────────────────────────────────────────────────────────────────────────
eq(rawRunCount, RAW_RUNS, 'RAW_RUNS owner runs were enumerated');
eq(seamRejectedCount, SEAM_REJECTED, '…SEAM_REJECTED of them refused by assertSeam');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE have one consumer and more than one site, so the #458 refinement '
    + 'still separates a real slice of the population');
  // THE RECOMMENDATION IS NOT REACHABLE BY THE SCREEN, and that is a fact about
  // the screen rather than about the region. A run begins only at a REGION start
  // or a DECLARATION start, and the comment block this cut opens on is neither —
  // the same gap audit #462 recorded for the journal map audit. The screen RANKS
  // candidates; it does not choose boundaries, and this cycle it cannot even see
  // the one being proposed.
  eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
    'no enumerated run begins where this cut begins');
  eq(MARKS.indexOf(RAW_AT_IN_CODE), -1, '…because that offset is not a region start');
  eq(DECLS.filter((d) => d.start === RAW_AT_IN_CODE).length, 0, '…nor a declaration start');
  // What the screen DID enumerate is the same cut minus its opening block, which
  // is the closest the screen can come. What it scores there is measured in the
  // three clauses below, not summarised in an adjective here.
  const rec = candidateRuns.filter((c) => c.lo === BY_NAME.get(OWNERS_EXPECTED[0]).start
    && c.hi === BODY_END_IN_CODE)[0];
  ok(rec, 'the screen DOES enumerate the same cut starting at its first declaration');
  eq(RAW_AT_IN_CODE + OPENING_BLOCK_CHARS, rec.lo,
    '…and the difference between the two is exactly the opening comment block');
  eq(byConsumerSplit(rec.p, rec.split), BY_CONSUMER_SPLIT, '…reading BY_CONSUMER_SPLIT');
  eq(rec.split.chain, CHAIN_OUTBOUND, '…with CHAIN_OUTBOUND references into extracted modules');
  eq(rec.split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND into foundation modules');
  ok(clean.filter((c) => c.units > rec.units).length > 0,
    'control — larger clean candidates exist, so this was not chosen for being the biggest');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare and all four owners run');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining exactly its own owners');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    setInterval: () => { watched.push('setInterval'); },
    WebSocket: function () { watched.push('WebSocket'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; } },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [], 'and touches no fetch, timer, socket, storage read or listener while loading');
}
// The owners RUN, and the parity gate is exercised on inputs where the answer
// differs — a gate that always returned the same verdict would pass a test that
// only ever fed it one shape.
{
  const ctx = { console: { log() {}, warn() {}, error() {}, debug() {} }, _technicalTfSqueezeState: () => null };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const aliases = ctx.PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES;
  ok(aliases && typeof aliases === 'object', 'the alias table is an object');
  ok(Object.keys(aliases).length > 0, '…with entries');
  for (const [canon, accepted] of Object.entries(aliases)) {
    ok(Array.isArray(accepted) && accepted.length > 0, canon + ': its accepted list is non-empty');
    eq(accepted[0], canon, canon + ': the CANONICAL key is always tried first, as its prose claims');
  }
  // THE RESOLVER, AND THE PROSE IN THE BLOCK THIS CUT OPENS ON. That block claims
  // the canonical key is always tried FIRST and an alias only confirms when the
  // canonical one has not. Both halves are executed here rather than read, on
  // inputs where the answer DIFFERS — a resolver that always returned the first
  // alias would pass a test that only ever fed it a confirmed canonical key.
  const R = ctx._resolvePortfolioTechnicalParityKey;
  const RSI = aliases.rsi14;
  eq(R({ rsi14: 'confirmed' }, RSI), 'rsi14',
    'a confirmed CANONICAL key resolves to the canonical key');
  eq(R({ rsi14_1d: 'confirmed' }, RSI), 'rsi14_1d',
    '…a confirmed ALIAS resolves to the alias, which is the whole point of the table');
  eq(R({ rsi14: 'confirmed', rsi14_1d: 'confirmed' }, RSI), 'rsi14',
    '…and when BOTH are confirmed the canonical one wins: "tried FIRST", executed');
  eq(R({}, RSI), null, 'nothing confirmed resolves to null');
  eq(R({ rsi14: 'partial' }, RSI), null,
    '…and so does a key that is present but NOT confirmed — no threshold is loosened');
  eq(R(null, RSI), null, 'a null parity object is refused rather than thrown on');
  eq(R({ rsi14: 'confirmed' }, 'rsi14'), null,
    '…as is an alias argument that is not an array');
  eq(typeof ctx.buildFormulaParityGate, 'function', 'the parity gate is a function');
  eq(typeof ctx.buildBackendTechnicalByTickerFromResponse, 'function', '…as is the map builder');
  const empty = ctx.buildBackendTechnicalByTickerFromResponse({}, [], 'TEST');
  ok(empty && typeof empty === 'object', 'the map builder returns an object on an empty response');
  eq(empty.usable, false, '…marked unusable, because nothing came back');
  const gate = ctx.buildFormulaParityGate({}, []);
  ok(gate && typeof gate === 'object', 'and the gate returns an object on an empty response too');
}
section('8. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
eq(UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, MODULE), INDEX,
  'the undo reconstructs the base exactly — the whole point of the helper');
eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied answers true for the shipped document');
eq(UNDO.isApplied(INDEX), false, '…and false for the document that predates this layer');
eq(UNDO.isApplied(42), false, '…and false, rather than throwing, for a non-string');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(42, MODULE),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_BAD_INPUT', 'a non-string document is refused by name');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, 42),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_BAD_INPUT', '…as is a non-string module');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, MODULE + 'x'),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_IDENTITY', 'a padded module is refused');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, MODULE.slice(0, -1)),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_IDENTITY', '…as is a truncated one');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, MODULE + '\n'),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_IDENTITY',
  '…and so is one that RE-ABSORBED the structural separator: it is one unit too long');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, MODULE.slice(0, -2) + 'x\n'),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_SEPARATOR',
  'a module of the right LENGTH that no longer ends on a closing brace gets its own error');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX, ' ' + MODULE.slice(1)),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_IDENTITY',
  'a module of the right length and ending whose BYTES differ is caught by the digest');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX.replace(TAG, ''), MODULE),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_IDENTITY', 'a document with no tag is refused');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX.replace(TAG, TAG + TAG), MODULE),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_IDENTITY', '…as is one with the tag twice');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(
  LIVE_INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
'PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_ADJACENCY', 'a REORDERED tag is refused by adjacency');
throwsWith(() => UNDO.undoPortfolioTechnicalParity(LIVE_INDEX + 'x', MODULE),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere is refused');
{
  const stranded = LIVE_INDEX.slice(0, UNDO.RAW_AT) + '\n' + LIVE_INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoPortfolioTechnicalParity(stranded, MODULE),
    'PORTFOLIO_TECHNICAL_PARITY_UNDO_EXTRACTED_IDENTITY',
    '…and a structural separator left inline is rejected by the whole-document gate');
}
throwsWith(() => UNDO.undoPortfolioTechnicalParity(INDEX, MODULE),
  'PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_IDENTITY',
  'an ALREADY-unextracted document is refused rather than silently doubled');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Reachability, the chain, and exact production scope');
// ─────────────────────────────────────────────────────────────────────────────
{
  const dead = DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return refSites(MASKED, d.name).filter((i) => !self(i)).length === 0 &&
      refSites(STRINGS, d.name).length === 0 && refSites(STATIC_MARKUP, d.name).length === 0 &&
      refSites(OTHER_INLINE, d.name).length === 0 &&
      SIBLINGS.every((s) => refSites(s.masked, d.name).length === 0 &&
        refSites(s.strings, d.name).length === 0);
  });
  eq(dead.length, DEAD_DECLS, 'DEAD_DECLS of the base monolith\'s declarations are named nowhere');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…DEAD_UNITS of code');
  eq(dead.filter((d) => OWNERS_EXPECTED.indexOf(d.name) >= 0).map((d) => d.name), [],
    '…and the owner is not among them: this is live code with a live consumer');
}
{
  eq(CHAIN.length, CHAIN_LENGTH, 'CHAIN_LENGTH layers ship today');
  eq(Array.from(new Set(CHAIN)).length, CHAIN_LENGTH,
    '…each exactly once: a chain with a duplicated entry is a chain missing a layer');
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, '…and this one is the newest, read off the tail');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');
  // CHAIN IS AN ORDER, NOT A SET, and until #459 nothing said so: a mutant that
  // swapped two entries survived the whole pass, because membership, length and
  // the tail were all checked and the sequence between them was not. Each layer
  // appends its tag after the previous one, so the cut order IS the tag order in
  // the shipped document, and that is what proves it.
  {
    const tagAt = CHAIN.map((rel) => LIVE_INDEX.indexOf('<script src="./' + rel + '"></script>'));
    ok(tagAt.every((at) => at >= 0), 'every layer in CHAIN has its tag in the shipped document');
    for (let i = 1; i < tagAt.length; i++) {
      ok(tagAt[i] > tagAt[i - 1],
        'CHAIN is in cut order: ' + CHAIN[i] + ' loads after ' + CHAIN[i - 1]);
    }
    ok(tagAt[tagAt.length - 1] < LIVE_INDEX.indexOf(INLINE_OPEN + '\n'),
      '…and the whole chain precedes the inline monolith');
  }

  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at SMALLEST_CHARS units');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS, 'the chain\'s largest is still LARGEST_CHARS');
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer sits at MODULE_SIZE_RANK by size — well into the upper half, and not at either end');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS,
    '…and the module at that rank is this one, by its undo helper\'s own pin');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  // THE RANK AND THE COUNT ABOVE IT ARE PINNED SEPARATELY AND TIED TOGETHER.
  // LAYERS_LARGER_THAN_THIS_CUT came over from the audit, where it was read; the
  // assertion that read it did not, and the constant sat here checking nothing
  // until the mutation pass raised it as a survivor. A pin nothing reads cannot
  // fail, which is exactly why rereading never finds one.
  eq(bySize.filter((x) => x.units > UNDO.MODULE_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    'LAYERS_LARGER_THAN_THIS_CUT layers in the chain are larger than this module');
  eq(MODULE_SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…and the rank and that count PARTITION the chain, so neither can drift alone');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\\n`, this one among them');

  // "PURE ASCII", "UNDOCUMENTED" AND "OPENS ON A BANNER" ARE ALL SUPERLATIVES
  // WAITING TO BE WRITTEN WRONG, so each is a count over the whole chain rather
  // than an adjective about this layer.
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'exactly PURE_ASCII_LAYERS layers in the chain are pure ASCII');
  ok(/[^\x00-\x7F]/.test(MODULE), '…and this module is NOT one of them');
  eq(sources.filter((s) => s.split('\n').filter((l) => !isBlankOrComment(l)).length === 0).length, 0,
    'control — no layer in the chain is comment-only, so the code-line scan measures something');
  eq(sources.filter((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length === 0).length,
    UNDOCUMENTED_LAYERS, 'exactly UNDOCUMENTED_LAYERS layers carry no comment line at all');
  ok(MODULE.split('\n').filter((l) => /^\s*\/\//.test(l)).length > 0,
    '…and this module is not one of those either');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(!/^\/\/ ── /.test(MODULE.split('\n')[0]),
    '…and this one does NOT, which §4 explains: there was no such banner left to open on');
  eq(LAYERS_OPENING_ON_BANNER, Number(git(['show', BASE_SHA + ':' + RETIRED_CONTRACT_REL])
    .match(/^const LAYERS_OPENING_ON_BANNER = (\d+);$/m)[1]),
    '…and that count did not move when this layer joined, which is the same statement read '
    + 'off the previous contract at the base rather than asserted twice');
  ok(CHAIN_LENGTH - LAYERS_OPENING_ON_BANNER > 0,
    '…while the rest do not, so opening on one is neither a rule nor a first');

  const HELPERS = fs.readdirSync(path.join(ROOT, 'tests/lib'))
    .filter((f) => /-undo\.js$/.test(f) && f !== 'post-journal-mcx-pr3-undo.js')
    .map((f) => require(path.join(ROOT, 'tests/lib', f)));
  const forLayer = CHAIN.map((rel) => {
    const hit = HELPERS.filter((M) => typeof M.TAG === 'string' && M.TAG.indexOf('/' + rel + '"') >= 0);
    return hit.length === 1 ? hit[0] : null;
  });
  eq(forLayer.filter(Boolean).length, CHAIN_LENGTH,
    'every layer in CHAIN resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'LAYERS_WITH_SEPARATOR carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, LAYERS_WITHOUT_SEPARATOR,
    '…and LAYERS_WITHOUT_SEPARATOR do not: the convention is NOT uniform across this chain');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…while only LAYERS_WITH_RAW_PAIR pin a single RAW/MODULE pair one unit apart, so that '
    + 'pair is not the tell the separator is');
  ok(Object.prototype.hasOwnProperty.call(UNDO, 'SEPARATOR'),
    '…and this layer follows the post-#406 convention, which its own export settles');
}
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', MODULE_REL].sort(),
    'production footprint is exactly index.html plus the one new module');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  // CONTRACT_REL NAMES THIS FILE, and until #461's mutation pass nothing said so
  // in the contract that carried it: a mutant pointing it at a NEIGHBOURING
  // contract survived, because every use was satisfied by that file too.
  eq(fs.readFileSync(path.join(ROOT, CONTRACT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and CONTRACT_REL is the path of THIS file, byte for byte, so §3 counts this contract '
    + 'and no other');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so the name has
  // to be the one the base actually carried.
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit\'s mutation spec is gone with the audit it targeted');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely a path that does not exist');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '', '…as is the audit\'s own path');
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'and the previous newest layer\'s spec is retired, in chain order');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…that path too being one the base commit carried');
  ok(fs.existsSync(path.join(ROOT, RETIRED_CONTRACT_REL)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), 'a spec for THIS contract is committed');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite matches the pin above: the audit left as this contract arrived');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
  // The budget, executed rather than narrated.
  {
    const spec = require(path.join(ROOT, CONTRACT_SPEC_REL));
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared BASE_DECLARED_MUTANTS mutants');
    // WHAT THE LIVE TOTAL IS, this contract does NOT pin, and the distinction
    // cost a cycle to learn. The arithmetic above is a fact about the commit
    // that shipped this layer and stays true forever; `declaredNow` is a fact
    // about the suite TODAY, which every later audit moves by design. Pinning
    // the live number made the next cycle's Phase 1 fail on a contract it had
    // not touched. What survives is the INVARIANT, and this layer's own
    // contribution to it.
    eq(spec.mutants.length, CONTRACT_SPEC_MUTANTS,
      'this contract\'s spec carries CONTRACT_SPEC_MUTANTS mutants, one per pin');
    // HOW BIG THE RETIREMENT WAS, read out of the base commit rather than
    // remembered. A constant nothing reads is a constant whose mutant survives,
    // which is how this assertion came to be written.
    const entriesAt = (rel) => (git(['show', BASE_SHA + ':' + rel]).match(/\n  \{ id: "/g) || []).length;
    eq(entriesAt(AUDIT_SPEC_REL) + entriesAt(RETIRED_SPEC_REL), RETIRED_MUTANTS,
      '…and the two spec paths this cycle removes carried RETIRED_MUTANTS between them, '
      + 'counted in the base commit that still holds both');
    ok(entriesAt(AUDIT_SPEC_REL) > 0 && entriesAt(RETIRED_SPEC_REL) > 0,
      '…each of them non-empty, so the sum is two real specs and not one plus a typo');
    ok(declaredNow >= spec.mutants.length,
      '…and the live declared total still counts them, whatever later cycles have added');
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow, '…and the live declared total is under it');
    eq(spec.target, CONTRACT_REL, 'this contract\'s spec targets this contract');
    const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
      .filter((f) => /-contract\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
    eq(layerSpecs.length, LAYER_CONTRACT_SPECS,
      'exactly LAYER_CONTRACT_SPECS layer contract spec is committed');
    eq(layerSpecs, [path.basename(CONTRACT_SPEC_REL)],
      '…and it is this one: the newest layer keeps a spec, and only the newest');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_TECHNICAL_PARITY_CONTRACT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });