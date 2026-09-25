'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO SPY PRICE — PERMANENT BOUNDARY CONTRACT.
//
// A RELOCATION, NOT A REWRITE. One contiguous fragment of the inline monolith,
// [794432,805265) in monolith coordinates at the base, is now
// js/portfolio/portfolio-spy-price.js. The module is the block's bytes
// verbatim, and tests/lib/portfolio-spy-price-undo.js reconstructs the
// pre-extraction index.html byte for byte. EVERY coordinate below is measured
// on THAT reconstruction, so nothing here is a remembered copy of the base.
//
// FIVE OWNERS, the Portfolio's SPY benchmark price resolver and the validity
// helpers it shares: `_spyFreshNum` (93), `_spyContextPrice` (1,088),
// `_spyContextAvailableKeys` (524), `resolveFreshSpyPrice` (5,798) and
// `_portfolioRowUnderlyingPrice` (355). All five are functions, so this layer
// ships no mutable binding at all.
//
// ── THE FINDING THIS LAYER SHIPPED: THE NAMING SIGNAL MOVED ────────────────
//
// The cycle before this one measured that NO `// ── ` dash banner in this
// document names a declaration it governs, and cut its region on a call-graph
// argument because of it. That measurement still holds here — §4 re-runs it on
// every push and gets zero again.
//
// BUT THE SAME PREDICATE, ASKED OF ORDINARY COMMENT BLOCKS, IS NOT ZERO. Of the
// 935 top-level declarations, 444 are headed by a comment block, and SIXTEEN of
// those blocks name the declaration they head on their first line. §4 measures
// both numbers with one predicate over two input classes, which is what makes
// the zero a measurement rather than a metric that measures nothing.
//
// AND THE SIXTEEN ARE NOT SCATTERED. THIRTEEN of them sit under a single
// banner, `// ── UNREALIZED P&L`. FOUR are inside this cut, and the NEXT one
// after those four — the block heading `resolvePortfolioLivePrice` — begins at
// EXACTLY the raw end.
// This boundary is therefore not argued against the document, as the last one
// had to be: both of its ends are marked by the rarest structural signal the
// monolith still carries, and §2 pins both ends on the reconstruction.
//
// THE ONE BANNER THAT NAMES ANYTHING names `journalManager`, declared 56,932
// units earlier under a different banner — so the single counterexample to the
// banner zero is a banner naming something it does not govern. §4 pins that
// too, because "zero" and "zero except one that points elsewhere" are different
// claims and only one of them is true.
//
// ── COUPLING ───────────────────────────────────────────────────────────────
//
// THREE edges reach in, all three hosted by `refreshPositionsLive` — 138,483
// units, the largest top-level declaration in the monolith, which §3 asserts
// over all 935 rather than from the ones nearby. That is ONE consumer at three
// sites, and it is the third consecutive layer answering to that one function:
// of the SIX chain layers whose contract pins EDGE_HOSTS at all — the constant
// is a recent convention, not a chain-wide one — FOUR name
// `refreshPositionsLive`, and the THREE newest are consecutive, this one among
// them. §3 reads all six off their own shipped contracts rather than recalling
// them, and names the layer that breaks the run.
//
// ONE monolith dependency, `S`. SIX references reach out to modules that
// already shipped, and all six are to FOUNDATION modules — `BACKEND`,
// `_backendAuthHeaders`, `ttCall` — with ZERO into anything this programme
// extracted. That split is the reading #465 established; §3 keeps the two
// halves apart because they are different claims.
//
// AND ALL TEN OF THOSE OUTWARD REFERENCES ARE `typeof`-GUARDED. Every one sits
// behind a `typeof` test AND behind an override on the `deps` argument the
// resolver takes. This region does not merely resolve its outward names at
// CALL time — the distinction that separated audit #424's rejection from every
// layer accepted since; it is written to work when the name is not there at
// all.
//
// THAT IS RARE BUT NOT UNPRECEDENTED, and the first draft of this paragraph
// said "first" because it asked a narrower question. §3 asks the same question
// of the shipped modules that pin a non-empty MONOLITH_DEPENDENCIES — each
// against its OWN pinned list, which is the only outward surface those
// contracts record — and counts how many guard every reference on it. This
// module is one of TWO, the other being js/services/swing-weekly-candles.js,
// which shipped first and is NAMED there rather than merely counted: a bare
// count is what let the first draft say "first". §7 spends the property: the
// resolver is driven to a real answer in an EMPTY VM with every outward name
// injected, rather than merely loaded and looked at.
//
// Every other direction is ZERO: no inbound write, no inbound property write,
// no write to a global it does not own, no sibling-module reference in, no
// static markup, no generated markup, no generated reference in.
//
// ── WHY THE OTHER BOUNDARIES WERE REFUSED ──────────────────────────────────
//
// §5 measures four alternatives and publishes why each loses:
//
//   (a) starting at the FUNCTION instead of its comment block — identical
//       coupling, 230 units smaller, and it leaves behind the very block that
//       names the owner. The block is separated from what precedes it by a
//       blank line, so it belongs to what follows.
//   (b) adding `_portfolioPriceFreshness` — a second consumer arrives,
//       `window.apexDebugPortfolioPrices`, for 1,623 more units.
//   (c) adding both freshness helpers — the same second consumer, 3,657 more.
//   (d) extending through `resolvePortfolioLivePrice`, which reads like this
//       region's sibling and is wired like nothing of the sort: four
//       consumers, four dependencies, an order more sites reaching in, a
//       sibling-module reference in, and byConsumerSplit from 2 to 11.
//
// THE SCREEN CANNOT SEE THIS CUT, and that is a fact about the screen. A run
// begins only at a region start or a declaration start, and this one begins on
// a comment block — the gap audits #462 and #466 both recorded. §6 asserts it
// rather than glossing it, and shows the run the screen DOES enumerate is this
// cut minus exactly those 230 units.
//
// ── THE RUNNER-UP, PUBLISHED RATHER THAN HIDDEN ────────────────────────────
//
// [730399,734655), the non-destructive storage recovery helpers: 4,256 units,
// one consumer, byConsumerSplit 2 — the same score as this cut — and a cleaner
// nine-direction total, because it reaches no module at all. It lost on size at
// equal coupling, and §5 keeps its numbers, measured on the reconstruction, so
// a later cycle can take it without re-deriving them.
//
// ── WHAT THIS CONTRACT IS FOR ───────────────────────────────────────────────
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 83rd and final local
// script (index 82 of 83), which is what MODULE_POSITION pins, and §7 loads it
// in a COMPLETELY empty VM: five globals defined, and no fetch, timer, socket,
// storage read or listener touched while it loads.
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

const UNDO = require('./lib/portfolio-spy-price-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-spy-price.js';
const TAG = '<script src="./js/portfolio/portfolio-spy-price.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-technical-parity.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base ─────────────────────────────────────────────────────────────────
// THE AUDIT'S base was c65d065; this phase's base is the commit that merged the
// audit, which carries the same index.html byte for byte — Phase 1 moves no
// production file. So the document constants below are the audit's unchanged,
// and only the commit-scoped ones (the change set, the mutant totals) move.
const BASE_SHA = 'ae7cf10';
const BASE_CHARS = 1478773;
const BASE_UTF8 = 1507516;
const BASE_LF = 25605;
const BASE_SHA256 = '9e0265d2f7c53266d34f71a2b492f990f12fc6c35707300a6cbca3abc5817e66';
const BASE_LOCAL_SCRIPTS = 82;
const LOCAL_SCRIPT_COUNT = 83;
const MODULE_POSITION = 82;
const BASE_TEST_FILE_COUNT = 167;
const TEST_FILE_COUNT = 168;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-portfolio-spy-price-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-spy-price-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-spy-price-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/portfolio-spy-price-undo.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-spy-price-contract.spec.js';
// The commit that retired it, so the negations below are pinned against a path
// that really existed rather than one that never did. It is also the revision
// the spec's own numbers are read out of, now that the file is gone.
const SPEC_RETIRED_FROM = '0d0a3ec';
const RATCHETED_CONTRACTS = 30;
// Chain-order retirement: the layer that was newest at the base is no longer
// newest, so its spec goes. §9 pins that path by what the BASE commit carried,
// because absence alone is satisfied by any wrong path, including one that
// never existed.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-technical-parity-contract.spec.js';
const RETIRED_CONTRACT_REL = 'tests/portfolio-technical-parity-boundary-contract.test.js';
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 249;
const RETIRED_MUTANTS = 122 + 121;
// This layer's own contribution to the mutant budget. The LIVE total is not
// pinned here: it is a fact about the suite TODAY, which every later audit
// moves by design.
const CONTRACT_SPEC_MUTANTS = 140;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: the audit's between
// Phase 1 and Phase 2, the newest contract's after it. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js` — the narrower one
// could not see an audit spec at all, so it read 1 during Phase 1 while TWO
// specs were committed, and that blind spot is what overflowed the ceiling.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114802;
const CODE_CHARS = 1363945;
const TOP_LEVEL_DECLS = 935;
const TOP_LEVEL_BANNERS = 221;
const OWNER_REGIONS = 120;

// ── The region this layer cut ────────────────────────────────────────────────
const RAW_AT_IN_CODE = 794432;
const RAW_END_IN_CODE = 805265;
const BODY_END_IN_CODE = 805264;
const RAW_CHARS = 10833;
const BODY_CHARS = 10832;
const BODY_UTF8 = 10866;
const BODY_LF = 185;
const BODY_SHA256 = '6a8d2aae2d6b9ea4db9bb70f6f5329dcd21bdab5420866986bebb910864ef9b3';
const BODY_ENDING = '}\n';
const OWNERS_EXPECTED = [
  '_spyFreshNum',
  '_spyContextPrice',
  '_spyContextAvailableKeys',
  'resolveFreshSpyPrice',
  '_portfolioRowUnderlyingPrice',
];
const OWNER_COUNT = 5;
const OWNER_SIZES = [93, 1088, 524, 5798, 355];
// The owners nothing outside the cut ever named: after the move they appear in
// the residual monolith not at all, which §2 measures on the shipped document.
const OWNERS_WITH_NO_OUTSIDE_REFERENCE = ['_spyContextPrice', '_spyContextAvailableKeys'];
const TOTAL_LINES = 186;
const CODE_LINES = 127;
const OPENING_COMMENT_LINES = 49;
// The comment block the cut OPENS on. Unlike every earlier cut's opening block,
// this one NAMES its owner on its first line — which is the finding §4 measures
// and the reason the boundary can be read off the document.
const OPENING_BLOCK_CHARS = 230;
const OPENING_BLOCK_FIRST_LINE =
  '// _spyFreshNum — accept a strictly positive finite number, else null. Shared by the';
const NET_REDUCTION = 10771;
const RESIDUAL_MONOLITH = 1353112;
const INDEX_AFTER = 1468002;
const TAG_GAP = 794440;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 3;
const EDGE_SITES = [1086099, 1089314, 1089602];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = ['S'];
const DEPENDENCY_AT = 1067;
const DEPENDENCY_DISTANCE = 793365;
const DEPENDENCY_REFS = 4;
// EVERY outward reference the region makes — the one monolith dependency and
// all six module references — sits behind a `typeof` test.
const OUTWARD_REFS = 10;
const OUTWARD_GUARDED_REFS = 10;
const INJECTION_POINTS = [
  'backend', 'fetchImpl', 'headers', 'log', 'snapshot', 'ttCallImpl', 'ttConnected',
];
// The same question asked of every shipped module that pins its dependencies.
// TWO of them guard every reference on their own list, this one and the one
// that shipped before it. That is an `eq` over the set with the precedent
// named, not an adjective about this one.
const MODULES_PINNING_DEPENDENCIES = 13;
const MODULES_GUARDING_EVERY_REFERENCE = 2;
const MODULE_ALREADY_GUARDING = 'js/services/swing-weekly-candles.js';
// outboundModule is NOT among the zeroes here, and it is the only direction of
// the nine that is not: six references reach out, all of them to foundation.
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 6;
const FOUNDATION_NAMES = ['BACKEND', '_backendAuthHeaders', 'ttCall'];
const FULL_NINE = 10;
const BY_CONSUMER = 8;
const BY_CONSUMER_SPLIT = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 5;

// ── The hub this cut answers to, counted over the contracts that pin it ──────
const LAYERS_PINNING_EDGE_HOSTS = 6;
const LAYERS_ON_THIS_HUB = 4;
const CONSECUTIVE_NEWEST_ON_THIS_HUB = 3;
const LAYER_BREAKING_THE_RUN = 'js/services/journal-map-audit.js';
const LAYER_BREAKING_THE_RUN_HOST = 'positionManager';

// ── THE FINDING: the naming signal moved out of the banners ──────────────────
const DASH_BANNERS = 77;
const BANNERS_NAMING_AN_OWNER_THEY_GOVERN = 0;
// The single banner that names a declaration at all names one declared under a
// DIFFERENT banner, so the zero above is not "zero except one".
const BANNERS_NAMING_ANY_DECLARATION = 1;
const STRAY_BANNER_AT = 1318955;
const STRAY_BANNER_NAMES = 'journalManager';
const STRAY_BANNER_TARGET_AT = 1262023;
// The same predicate over comment blocks, where the answer is NOT zero.
const DECLS_WITH_A_COMMENT_BLOCK = 444;
const BLOCKS_NAMING_THEIR_OWNER = 16;
// Relaxing the predicate from the first line to the whole block moves it, which
// is what proves it measures the first line rather than the presence of text.
const BLOCKS_NAMING_THEIR_OWNER_ANYWHERE = 23;
const NAMING_BLOCKS_UNDER_ONE_BANNER = 13;
const NAMING_BLOCKS_INSIDE_THE_CUT = 4;
const HUB_BANNER_AT = 759274;
const HUB_BANNER_END = 830760;
const HUB_BANNER_LINE =
  '// ── UNREALIZED P&L ────────────────────────────────────────────────────────────';
// The fifth naming block begins at EXACTLY the raw end, which is what marks the
// far side of this boundary.
const BLOCK_AT_RAW_END = 'resolvePortfolioLivePrice';

// ── The four refused boundaries, and the runner-up ───────────────────────────
// (a) start at the function, leaving the block that names it behind.
const ALT_FN_START_AT = 794662;
// (b) and (c) admit a second consumer: a debug entry point assigned to window.
const ALT_ONE_FRESH_AT = 792809;
const ALT_BOTH_FRESH_AT = 790775;
const ALT_SECOND_CONSUMER_AT = 830450;
const ALT_SECOND_CONSUMER_OWNER = '_portfolioPriceFreshness';
const ALT_FRESH_BY_CONSUMER_SPLIT = 3;
// (d) extending through the sibling resolver.
const ALT_LIVE_PRICE_END = 817159;
const ALT_LIVE_PRICE_CONSUMERS = 4;
const ALT_LIVE_PRICE_DEPS = 4;
const ALT_LIVE_PRICE_BY_CONSUMER_SPLIT = 11;
// The runner-up, published with its numbers so the next cycle need not re-derive.
const RUNNER_UP_AT = 730399;
const RUNNER_UP_END = 734655;
const RUNNER_UP_BY_CONSUMER_SPLIT = 2;
const RUNNER_UP_FULL_NINE = 6;
const RUNNER_UP_CONSUMER = 'journalManager';
const RUNNER_UP_OWNERS = 5;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7531;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3169;
const CLEAN_CANDIDATES = 1942;
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 3;
const ONE_CONSUMER_MULTI_SITE = 116;

// ── Where this layer sits ────────────────────────────────────────────────────
const CHAIN_LENGTH = 39;
const MODULE_SIZE_RANK = 25;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const LAYERS_LARGER_THAN_THIS_CUT = 14;
const LAYERS_ENDING_BRACE = 36;
const LAYERS_WITH_SEPARATOR = 31;
const LAYERS_WITH_RAW_PAIR = 28;
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
  'js/portfolio/portfolio-spy-price.js',
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

console.log('PORTFOLIO SPY PRICE — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited by #468 · base=' + BASE_SHA);

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
const INDEX = UNDO.undoPortfolioSpyPrice(LIVE_INDEX, MODULE);
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
// Which KIND of module owns a name: one this programme extracted, or one that
// predates it. CHAIN is read off the newest contract above; the split is the
// reading #465 established and §3 keeps its two halves apart.
for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }

// The comment block that heads a declaration: the contiguous run of `//` lines
// ending where the declaration starts. THE FINDING in §4 rests on this, so it
// is one function used for every measurement rather than three spellings.
function blockAbove(d) {
  let at = CODE.lastIndexOf('\n', d.start - 1) + 1;
  let first = null;
  while (at > 0) {
    const ls = CODE.lastIndexOf('\n', at - 2) + 1;
    if (/^\s*\/\//.test(CODE.slice(ls, at - 1))) { first = ls; at = ls; } else break;
  }
  return first === null ? null : { start: first, text: CODE.slice(first, d.start) };
}
const namesIt = (text, name) =>
  new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(text);
const firstLineOf = (text) => text.slice(0, text.indexOf('\n'));
const lineAt = (at) => CODE.slice(at, CODE.indexOf('\n', at));
const nextMarkAfter = (m) => {
  const n = SORTED_MARKS.filter((x) => x > m)[0];
  return n === undefined ? CODE.length : n;
};
// Is every reference to `name` inside `text` behind a `typeof` test on it?
function guardedRefs(text, name) {
  const sites = refSites(maskLiterals(text), name);
  let guarded = 0;
  for (const at of sites) {
    const ls = text.lastIndexOf('\n', at) + 1;
    const le = text.indexOf('\n', at);
    const line = text.slice(ls, le < 0 ? text.length : le);
    if (new RegExp("typeof\\s+" + name.replace(/\$/g, '\\$') + "\\s*(!==|===)\\s*'(undefined|function)'")
      .test(line)) guarded++;
  }
  return { total: sites.length, guarded };
}

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
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n',
  '…and that separator is a single newline');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
  '…and the fragment IS the module followed by that separator, which is why the module file '
  + 'ends line-terminated and index.html needs no reflow');
eq(MODULE.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line');
ok(/[^\x00-\x7F]/.test(MODULE),
  'it is NOT pure ASCII — the prose in its comment blocks settles that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  // THE FAR SIDE IS MARKED BY THE DOCUMENT ITSELF, which §4 is the measurement
  // for: the next owner's own naming comment block begins at the raw end.
  const block = blockAbove(next);
  ok(block, 'the next top-level owner is headed by a comment block of its own');
  eq(block.start, RAW_END_IN_CODE,
    '…which begins at EXACTLY the raw end, so the seam falls between two blocks '
    + 'rather than inside either');
  eq(next.name, BLOCK_AT_RAW_END, '…and that owner is BLOCK_AT_RAW_END');
  ok(namesIt(firstLineOf(block.text), next.name),
    '…whose first line names it, the same rare signal the cut opens on');
}
// THE NEAR SIDE: the cut opens on a comment block, not on a declaration and not
// on a banner, and the block belongs to what FOLLOWS it.
eq(MARKS.indexOf(RAW_AT_IN_CODE), -1, 'the cut does NOT begin on a banner mark');
eq(DECLS.filter((d) => d.start === RAW_AT_IN_CODE).length, 0, '…nor on a declaration');
eq(firstLineOf(MODULE), OPENING_BLOCK_FIRST_LINE, '…it begins on OPENING_BLOCK_FIRST_LINE');
eq(BY_NAME.get(OWNERS_EXPECTED[0]).start - RAW_AT_IN_CODE, OPENING_BLOCK_CHARS,
  '…which runs OPENING_BLOCK_CHARS units before the first declaration');
{
  const block = CODE.slice(RAW_AT_IN_CODE, RAW_AT_IN_CODE + OPENING_BLOCK_CHARS);
  ok(block.split('\n').filter(Boolean).every((l) => /^\s*\/\//.test(l)),
    '…every line of it is a comment, so nothing executable was swept in');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    '…with a BLANK LINE before it, so the block belongs to what FOLLOWS it and not to the '
    + 'declaration above');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE - 2), '}',
    '…and that declaration closed on a brace, so nothing was left dangling');
  ok(namesIt(OPENING_BLOCK_FIRST_LINE, OWNERS_EXPECTED[0]),
    '…and its FIRST LINE names the owner it heads, which is the finding §4 measures');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these five names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…and ALL of them are functions, so this layer ships no mutable binding at all');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes');
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, TOTAL_LINES - CODE_LINES,
    '…and the rest are not, which is the two counts above and no third constant');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment');
}
// What the move cost, predicted by the audit and now realised.
eq(BASE_CHARS - LIVE_INDEX.length, NET_REDUCTION,
  'index.html fell by NET_REDUCTION units net: the span left and a tag arrived');
eq(RAW_CHARS - NET_REDUCTION, TAG.length,
  '…and the difference is exactly the tag line this layer added');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, '…leaving index.html at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…and the monolith at RESIDUAL_MONOLITH');
{
  const liveCode = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  eq(liveCode.length, RESIDUAL_MONOLITH,
    '…which the shipped document confirms, not only the arithmetic');
  eq(liveCode.indexOf(OPENING_BLOCK_FIRST_LINE), -1,
    '…and the opening block is gone from it entirely');
  // THE OWNERS' NAMES SURVIVE IN THE RESIDUE, at exactly their call sites and
  // nowhere else — which is what makes this a relocation rather than a deletion.
  // Counted on the MASKED residue, so a name that also appears inside a log
  // string is not read as a reference.
  {
    const liveMasked = maskLiterals(liveCode);
    const per = OWNERS_EXPECTED.map((n) => refSites(liveMasked, n).length);
    eq(per.reduce((a2, b2) => a2 + b2, 0), EXTERNAL_EDGES,
      '…and they total EXTERNAL_EDGES references, the same three edges §3 pins');
    eq(OWNERS_EXPECTED.filter((n, i) => per[i] === 0), OWNERS_WITH_NO_OUTSIDE_REFERENCE,
      '…with the private owners appearing in the residue not at all');
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
    'the tag line sits TAG_GAP units before the fragment it replaced, in base coordinates');
  eq(TAG_GAP - RAW_AT_IN_CODE, INLINE_OPEN.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
  eq(UNDO.RAW_AT - tagAt, TAG_GAP,
    '…and the helper\'s RAW_AT sits the SAME distance past the tag, which is what makes it a\n'
    + '   TAG-FREE offset: it is where the fragment goes back AFTER the tag line is removed, so\n'
    + '   the two coordinates coincide rather than differing by the width of the tag');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions, and the guarded outward surface');
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
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and it is declared outside the region, so the edges really do cross the boundary');
}
// THE HUB, COUNTED OVER THE CONTRACTS THAT PIN IT rather than over the chain:
// EDGE_HOSTS is a recent convention and most layers do not carry it, so the
// denominator is the five that do.
{
  const pinned = [];
  for (const rel of CHAIN) {
    const base = path.basename(rel).replace(/\.js$/, '');
    const f = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((x) => x.endsWith('-boundary-contract.test.js'))
      .find((x) => x.replace('-boundary-contract.test.js', '') === base);
    if (!f) continue;
    const m = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')
      .match(/^const EDGE_HOSTS = (\[[^\]]*\]);$/m);
    if (m) pinned.push({ rel, hosts: m[1] });
  }
  eq(pinned.length, LAYERS_PINNING_EDGE_HOSTS,
    'LAYERS_PINNING_EDGE_HOSTS shipped layers pin EDGE_HOSTS at all');
  eq(pinned.filter((x) => x.hosts === "['refreshPositionsLive']").length, LAYERS_ON_THIS_HUB,
    '…LAYERS_ON_THIS_HUB of them name this same hub');
  const tail = pinned.slice().reverse();
  let run = 0;
  while (run < tail.length && tail[run].hosts === "['refreshPositionsLive']") run++;
  eq(run, CONSECUTIVE_NEWEST_ON_THIS_HUB,
    '…and CONSECUTIVE_NEWEST_ON_THIS_HUB of them are the newest, consecutively, this cut '
    + 'being the third in that row');
  eq(tail[run].rel, LAYER_BREAKING_THE_RUN, '…the run being broken by LAYER_BREAKING_THE_RUN');
  eq(tail[run].hosts, "['" + LAYER_BREAKING_THE_RUN_HOST + "']", '…which answers to another function');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names exactly ONE monolith declaration, and the list is the name rather than a count');
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT');
  eq(Math.abs(dep.start - RAW_AT_IN_CODE), DEPENDENCY_DISTANCE,
    '…DEPENDENCY_DISTANCE units away, so it is not a neighbour the cut could absorb');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS,
'seven of the nine directions are ZERO, and OUTBOUND WRITES is among them — the direction '
+ 'that disqualified a candidate which scored a perfect zero inbound');
// THE NINTH, SPLIT. Its two halves are different claims and are pinned apart.
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND,
    'it reaches into NO module this programme extracted: CHAIN_OUTBOUND references');
  eq(split.foundation, FOUNDATION_OUTBOUND,
    '…and FOUNDATION_OUTBOUND into modules that predate it, which is the other half');
  eq(split.foundationNames, FOUNDATION_NAMES, '…to exactly these names');
  eq(split.chain + split.foundation, REC.outModule,
    '…and the two halves account for every outbound module reference, none left over');
}
eq(REC.nine, FULL_NINE, 'the nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…BY_CONSUMER when the edges are counted per consumer');
eq(byConsumerSplit(REC, outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
  '…and BY_CONSUMER_SPLIT once the foundation half is set aside');
// EVERY OUTWARD REFERENCE IS GUARDED. This is what separates the region from
// audit #424's rejection by more than call-time resolution.
{
  const raw = CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  const outward = MONOLITH_DEPENDENCIES.concat(FOUNDATION_NAMES);
  let total = 0, guarded = 0;
  for (const n of outward) { const g = guardedRefs(raw, n); total += g.total; guarded += g.guarded; }
  eq(total, OUTWARD_REFS, 'the region makes OUTWARD_REFS references to names outside it');
  eq(guarded, OUTWARD_GUARDED_REFS, '…and EVERY ONE of them is behind a `typeof` test');
  eq(guardedRefs(raw, MONOLITH_DEPENDENCIES[0]).total, DEPENDENCY_REFS,
    '…DEPENDENCY_REFS of them being the monolith dependency');
  const deps = Array.from(new Set((maskLiterals(raw).match(/\bdeps\.([A-Za-z_$][A-Za-z0-9_$]*)/g) || [])
    .map((s) => s.slice(5)))).sort();
  eq(deps, INJECTION_POINTS,
    '…and each is ALSO overridable through the resolver\'s `deps` argument, at these points');
  // THE CONTROL. A predicate that answered "guarded" for everything would say
  // so here too, and the whole chain says otherwise.
  let pinning = 0;
  const fullyGuarded = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'tests')).filter((x) => /-boundary-contract\.test\.js$/.test(x))) {
    const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
    const dm = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
    const rm = src.match(/^const MODULE_REL = '([^']+)';$/m);
    if (!dm || !rm) continue;
    let names;
    try { names = JSON.parse(dm[1].replace(/'/g, '"')); } catch (e) { continue; }
    if (!names.length || !fs.existsSync(path.join(ROOT, rm[1]))) continue;
    pinning++;
    const msrc = fs.readFileSync(path.join(ROOT, rm[1]), 'utf8');
    let t = 0, g = 0;
    for (const n of names) { const r = guardedRefs(msrc, n); t += r.total; g += r.guarded; }
    if (t > 0 && t === g) fullyGuarded.push(rm[1]);
  }
  eq(pinning, MODULES_PINNING_DEPENDENCIES,
    'MODULES_PINNING_DEPENDENCIES shipped modules pin a non-empty MONOLITH_DEPENDENCIES');
  eq(fullyGuarded.length, MODULES_GUARDING_EVERY_REFERENCE,
    '…and MODULES_GUARDING_EVERY_REFERENCE of them guard every one of their own references, '
    + 'this module being the SECOND and not the first');
  eq(fullyGuarded.slice().sort(), [MODULE_ALREADY_GUARDING, MODULE_REL].sort(),
    '…the other being MODULE_ALREADY_GUARDING, named rather than counted, because a bare '
    + 'count is what let the first draft of this claim say "first"');
  // THE CONTROL IS TWO-SIDED, which a bare count would not be: the same
  // predicate says YES to two shipped modules and NO to the other eleven, so it
  // is neither constant-true nor constant-false.
  ok(fullyGuarded.length > 0 && fullyGuarded.length < pinning,
    '…and it answers both ways over the same set, which is what makes it a measurement');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the naming signal moved out of the banners');
// ─────────────────────────────────────────────────────────────────────────────
{
  const dash = SORTED_MARKS.filter((m) => /^\/\/ ── /.test(lineAt(m)));
  eq(dash.length, DASH_BANNERS, 'DASH_BANNERS of the top-level banner marks are `── ` banners');
  let governs = 0, anyDecl = 0, strayAt = -1, strayName = null;
  for (const m of dash) {
    const line = lineAt(m);
    const hit = DECLS.filter((d) => namesIt(line, d.name));
    const gov = DECLS.filter((d) => d.start >= m && d.start < nextMarkAfter(m));
    if (hit.some((d) => gov.indexOf(d) >= 0)) governs++;
    if (hit.length) { anyDecl++; strayAt = m; strayName = hit[0].name; }
  }
  eq(governs, BANNERS_NAMING_AN_OWNER_THEY_GOVERN,
    'NONE of them names a declaration it governs — the measurement the last cycle shipped, '
    + 're-run on the document that cycle left behind');
  // "ZERO" AND "ZERO EXCEPT ONE POINTING ELSEWHERE" ARE DIFFERENT CLAIMS.
  eq(anyDecl, BANNERS_NAMING_ANY_DECLARATION,
    '…while exactly BANNERS_NAMING_ANY_DECLARATION names a declaration at all');
  eq(strayAt, STRAY_BANNER_AT, '…that one being the banner at STRAY_BANNER_AT');
  eq(strayName, STRAY_BANNER_NAMES, '…which names STRAY_BANNER_NAMES');
  eq(BY_NAME.get(STRAY_BANNER_NAMES).start, STRAY_BANNER_TARGET_AT,
    '…declared at STRAY_BANNER_TARGET_AT');
  ok(STRAY_BANNER_TARGET_AT < STRAY_BANNER_AT &&
    nextMarkAfter(bannerOf(STRAY_BANNER_TARGET_AT, SORTED_MARKS)) <= STRAY_BANNER_AT,
  '…declared EARLIER and under a different banner, so the one counterexample points away '
  + 'from what it heads');
}
// THE SAME PREDICATE, ASKED OF COMMENT BLOCKS, IS NOT ZERO.
{
  let blocks = 0, firstLine = 0, anywhere = 0;
  const naming = [];
  for (const d of DECLS) {
    const b = blockAbove(d);
    if (!b) continue;
    blocks++;
    if (namesIt(firstLineOf(b.text), d.name)) { firstLine++; naming.push({ d, at: b.start }); }
    if (namesIt(b.text, d.name)) anywhere++;
  }
  eq(blocks, DECLS_WITH_A_COMMENT_BLOCK,
    'DECLS_WITH_A_COMMENT_BLOCK of the declarations are headed by a comment block');
  eq(firstLine, BLOCKS_NAMING_THEIR_OWNER,
    '…and BLOCKS_NAMING_THEIR_OWNER of those blocks name their owner on the first line: the '
    + 'signal the banners have lost is alive here');
  // A PREDICATE THAT ALWAYS SAID YES WOULD SAY BLOCKS; ONE THAT MEASURED
  // NOTHING WOULD SAY ZERO. Relaxing it to the whole block moves the answer,
  // which is what proves it reads the first line.
  eq(anywhere, BLOCKS_NAMING_THEIR_OWNER_ANYWHERE,
    '…BLOCKS_NAMING_THEIR_OWNER_ANYWHERE name it somewhere in the block, a different number '
    + 'from both the count and the corpus');
  ok(firstLine < anywhere && anywhere < blocks,
    '…strictly between them, so neither degenerate reading is what was measured');
  ok(!namesIt(OPENING_BLOCK_FIRST_LINE, EDGE_HOSTS[0]),
    'control — the predicate says NO to a real declaration that the line does not name');
  // AND THE SIXTEEN ARE NOT SCATTERED.
  eq(lineAt(HUB_BANNER_AT), HUB_BANNER_LINE, 'the banner at HUB_BANNER_AT is HUB_BANNER_LINE');
  eq(nextMarkAfter(HUB_BANNER_AT), HUB_BANNER_END, '…and it runs to HUB_BANNER_END');
  eq(naming.filter((x) => x.at >= HUB_BANNER_AT && x.at < HUB_BANNER_END).length,
    NAMING_BLOCKS_UNDER_ONE_BANNER,
    '…and NAMING_BLOCKS_UNDER_ONE_BANNER of the sixteen sit under that ONE banner');
  eq(naming.filter((x) => x.at >= RAW_AT_IN_CODE && x.at < RAW_END_IN_CODE).length,
    NAMING_BLOCKS_INSIDE_THE_CUT,
    '…NAMING_BLOCKS_INSIDE_THE_CUT of them inside this cut');
  eq(naming.filter((x) => x.at === RAW_END_IN_CODE).map((x) => x.d.name), [BLOCK_AT_RAW_END],
    '…and one beginning at EXACTLY the raw end, which is what marks the far side of the '
    + 'boundary §2 pins');
  ok(NAMING_BLOCKS_INSIDE_THE_CUT + NAMING_BLOCKS_UNDER_ONE_BANNER > BLOCKS_NAMING_THEIR_OWNER / 2,
    '…so the signal is concentrated rather than spread, which is why this boundary can be '
    + 'read off the document instead of argued from the call graph');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The four refused boundaries, and the runner-up');
// ─────────────────────────────────────────────────────────────────────────────
// (a) START AT THE FUNCTION. Identical coupling, and it abandons the block that
//     names the owner — the very signal §4 measures.
{
  const p = profileOf([ALT_FN_START_AT, RAW_END_IN_CODE]);
  eq(ALT_FN_START_AT - RAW_AT_IN_CODE, OPENING_BLOCK_CHARS,
    '(a) begins OPENING_BLOCK_CHARS later: exactly the comment block, and nothing else');
  eq(RAW_END_IN_CODE - ALT_FN_START_AT, RAW_CHARS - OPENING_BLOCK_CHARS,
    '…so it is the raw span less that block, and no separate size constant');
  eq(byConsumerSplit(p, outboundSplit(ALT_FN_START_AT, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
    '…scoring the SAME as the cut that shipped, so coupling does not decide this one');
  eq(BY_NAME.get(OWNERS_EXPECTED[0]).start, ALT_FN_START_AT,
    '…and what it leaves behind is the block heading the first owner');
}
// (b) and (c) ADMIT A SECOND CONSUMER.
{
  // EACH OFFSET IS ANCHORED TO THE BLOCK IT STARTS ON. Trading the derived
  // size constants for inequalities left these pinned by nothing, and the
  // mutation pass said so: an offset shifted by one still satisfies "wider".
  eq(ALT_ONE_FRESH_AT, blockAbove(BY_NAME.get('_portfolioPriceFreshness')).start,
    'ALT_ONE_FRESH_AT is where _portfolioPriceFreshness\'s own comment block begins');
  eq(ALT_BOTH_FRESH_AT, blockAbove(BY_NAME.get('_portfolioGreeksFreshness')).start,
    '…and ALT_BOTH_FRESH_AT where _portfolioGreeksFreshness\'s does');
  for (const at of [ALT_ONE_FRESH_AT, ALT_BOTH_FRESH_AT]) {
    const p = profileOf([at, RAW_END_IN_CODE]);
    ok(RAW_END_IN_CODE - at > RAW_CHARS, 'the cut at ' + at + ' is WIDER than the one that shipped');
    eq(consumersOf(p).length, 2, '…and admits a SECOND consumer');
    eq(byConsumerSplit(p, outboundSplit(at, RAW_END_IN_CODE)), ALT_FRESH_BY_CONSUMER_SPLIT,
      '…pushing byConsumerSplit to ALT_FRESH_BY_CONSUMER_SPLIT');
  }
  // WHAT THAT SECOND CONSUMER IS. `hostOf` calls it top level, and that is the
  // tool being wrong rather than the document: the call sits inside a function
  // EXPRESSION assigned to window, which the declaration scanner does not track.
  ok(insideFunction(ALT_SECOND_CONSUMER_AT),
    'the second consumer\'s call site is inside a function body');
  eq(hostOf(ALT_SECOND_CONSUMER_AT), undefined,
    '…while no top-level DECLARATION contains it, which is why the profiler labels it top '
    + 'level — the scanner tracks declarations, not `window.x = function () {}`');
  ok(/window\.[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*function/
    .test(CODE.slice(ALT_SECOND_CONSUMER_AT - 600, ALT_SECOND_CONSUMER_AT)),
  '…and the enclosing form is exactly that, so it runs when called and not at load');
  eq(CODE.slice(ALT_SECOND_CONSUMER_AT, ALT_SECOND_CONSUMER_AT + ALT_SECOND_CONSUMER_OWNER.length),
    ALT_SECOND_CONSUMER_OWNER,
    '…and ALT_SECOND_CONSUMER_AT is the exact offset of that call, not merely a line that '
    + 'contains it: an offset pinned by a line lookup survives being shifted by one');
}
// (d) EXTEND THROUGH THE SIBLING RESOLVER. It reads like this region's other
//     half and is wired like nothing of the sort.
{
  const p = profileOf([RAW_AT_IN_CODE, ALT_LIVE_PRICE_END]);
  eq(ALT_LIVE_PRICE_END, blockAbove(BY_NAME.get('refreshPortfolioBetas')).start,
    'ALT_LIVE_PRICE_END is where the NEXT feature\'s comment block begins, so the wider cut '
    + 'ends where the document does and not at a chosen number');
  ok(ALT_LIVE_PRICE_END - RAW_AT_IN_CODE > RAW_CHARS * 2, '…and (d) is more than twice the span');
  eq(consumersOf(p).length, ALT_LIVE_PRICE_CONSUMERS, '…ALT_LIVE_PRICE_CONSUMERS consumers');
  eq(p.deps.length, ALT_LIVE_PRICE_DEPS, '…ALT_LIVE_PRICE_DEPS monolith dependencies');
  ok(p.sites.length > EXTERNAL_EDGES * 5, '…and an order more sites reaching in');
  ok(p.sib > 0, '…and a sibling MODULE reaching in, which this layer has none of');
  eq(byConsumerSplit(p, outboundSplit(RAW_AT_IN_CODE, ALT_LIVE_PRICE_END)),
    ALT_LIVE_PRICE_BY_CONSUMER_SPLIT,
    '…for a byConsumerSplit of ALT_LIVE_PRICE_BY_CONSUMER_SPLIT against this layer\'s two');
}
// THE RUNNER-UP, published with its numbers rather than described.
{
  const p = profileOf([RUNNER_UP_AT, RUNNER_UP_END]);
  ok(SORTED_MARKS.indexOf(RUNNER_UP_AT) >= 0,
    'the runner-up opens ON a banner mark, which is what RUNNER_UP_AT is pinned to');
  eq(snapBodyEnd(CODE, RUNNER_UP_AT, DECLS.filter((d) => d.start >= RUNNER_UP_END)[0].start),
    RUNNER_UP_END,
    '…and RUNNER_UP_END is where snapping its last construct lands, not a number chosen for it');
  eq(DECLS.filter((d) => d.start >= RUNNER_UP_AT && d.end < RUNNER_UP_END).length, RUNNER_UP_OWNERS,
    '…RUNNER_UP_OWNERS owners');
  eq(consumersOf(p), [RUNNER_UP_CONSUMER], '…answering to RUNNER_UP_CONSUMER alone');
  eq(byConsumerSplit(p, outboundSplit(RUNNER_UP_AT, RUNNER_UP_END)), RUNNER_UP_BY_CONSUMER_SPLIT,
    '…at the SAME byConsumerSplit as the cut that shipped');
  eq(p.nine, RUNNER_UP_FULL_NINE,
    '…and a LOWER nine-direction total, because it reaches no module at all');
  ok(RUNNER_UP_FULL_NINE < FULL_NINE,
    '…which is stated as the measurement it is: on the raw nine it is the cleaner region');
  ok((RUNNER_UP_END - RUNNER_UP_AT) * 2 < BODY_CHARS,
    '…and it loses on size at equal coupling, which is the whole of the argument against it');
  ok(runsNothingAtLoad(loadTimeProfile(RUNNER_UP_AT, RUNNER_UP_END)),
    '…it too runs nothing at load, so the next cycle can take it as it stands');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and the cut it cannot see');
// ─────────────────────────────────────────────────────────────────────────────
eq(rawRunCount, RAW_RUNS, 'the screen enumerated RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…SEAM_REJECTED of which assertSeam refused');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
    'ONE_CONSUMER_RAW scores one on the RAW reading');
  eq(clean.filter((c) => byConsumerSplit(c.p, c.split) === 1).length, ONE_CONSUMER_SPLIT,
    '…ONE_CONSUMER_SPLIT on the split reading, which is the reading #465 established');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE have one consumer and more than one site');
  // THE RECOMMENDATION IS NOT REACHABLE BY THE SCREEN, and that is a fact about
  // the screen. A run begins only at a REGION start or a DECLARATION start, and
  // this cut begins on a comment block — the gap audits #462 and #466 recorded.
  eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).length, 0,
    'no enumerated run begins where this cut begins');
  const rec = candidateRuns.filter((c) => c.lo === ALT_FN_START_AT && c.hi === BODY_END_IN_CODE)[0];
  ok(rec, 'what the screen DOES enumerate is the same cut starting at its first declaration');
  eq(RAW_AT_IN_CODE + OPENING_BLOCK_CHARS, rec.lo,
    '…and the difference between the two is exactly the opening comment block');
  eq(byConsumerSplit(rec.p, rec.split), BY_CONSUMER_SPLIT, '…scoring BY_CONSUMER_SPLIT there');
  ok(clean.filter((c) => c.units > rec.units).length > 0,
    'control — larger clean candidates exist, so this was not chosen for being the biggest');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, and the resolver runs on injected dependencies');
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
// THE OWNERS RUN, on inputs where the answer DIFFERS. A helper that always
// returned null would pass a test that only ever fed it one shape.
{
  const ctx = { console: { log() {}, warn() {}, error() {}, debug() {} } };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const { _spyFreshNum: fresh, _spyContextPrice: ctxPrice,
    _spyContextAvailableKeys: keys, _portfolioRowUnderlyingPrice: rowPrice } = ctx;
  eq(fresh('412.5'), 412.5, 'a positive numeric string is a price');
  eq(fresh(0), null, '…zero is not');
  eq(fresh(-3), null, '…nor a negative');
  eq(fresh('abc'), null, '…nor a non-number, which is the "identical validity semantics" its '
    + 'own comment block claims, executed');
  eq(ctxPrice(null), null, 'the context reader refuses an absent snapshot');
  eq(ctxPrice({ data: { spyPrice: 400 } }), 400, '…reads an explicit SPY price');
  eq(ctxPrice({ data: { spy: { mark: 401 } } }), 401, '…falls back to the mark');
  eq(ctxPrice({ data: { technicals: { SPY: { '1D': { close: 402 } } } } }), 402,
    '…then to the 1D technical close');
  eq(ctxPrice({ data: { technicals: { SPY: { '1D': { ok: false, close: 402 }, '4H': { close: 403 } } } } }), 403,
    '…and skips a 1D marked not ok for the 4H, which is the preference its comment states');
  eq(keys(null), 'none', 'the key summary says so when there is no snapshot');
  ok(keys({ data: { technicals: { SPY: { '1D': {} } } } }).indexOf('SPY=1D') >= 0,
    '…and names what it found when there is');
  eq(rowPrice(null), null, 'the row price refuses an absent position');
  eq(rowPrice({ underlyingPrice: 10 }), 10, '…reads the direct field');
  eq(rowPrice({ live: { underlying_price: 11 } }), 11, '…and the snake-cased live one');
  eq(rowPrice({ underlyingPrice: 0, live: { underlyingPrice: 12 } }), 12,
    '…skipping a zero rather than returning it, the same validity rule again');
  eq(typeof ctx.resolveFreshSpyPrice, 'function', 'the resolver is a function');
}
// THE RESOLVER, DRIVEN. Every outward name injected, in a VM with no globals at
// all: this is what the guarded surface measured in §3 buys.
{
  const ctx = { console: { log() {}, warn() {}, error() {}, debug() {} } };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const calls = [];
  const offline = (extra) => Object.assign({
    log: false,
    backend: 'https://example.invalid',
    headers: {},
    fetchImpl: (u) => { calls.push('fetch ' + String(u)); throw new Error('no network in this test'); },
    ttCallImpl: () => { calls.push('ttCall'); throw new Error('no network in this test'); },
    ttConnected: false,
  }, extra);
  // (i) THE SNAPSHOT ANSWERS, but only after the live sources are tried and
  //     fail — which is the priority order the block above it states.
  const fromSnapshot = await ctx.resolveFreshSpyPrice(offline({ snapshot: { data: { spyPrice: 444.25 } } }));
  ok(fromSnapshot && typeof fromSnapshot === 'object',
    'the resolver returns a result with every outward name injected and no globals at all');
  eq(fromSnapshot.price, 444.25, '…the price the injected snapshot carried');
  eq(fromSnapshot.source, 'market_context', '…attributed to the snapshot');
  eq(fromSnapshot.isLive, false, '…and NOT marked live, because a snapshot is not a quote');
  eq(calls, [
    'fetch https://example.invalid/market/live/SPY',
    'fetch https://example.invalid/market/quotes?symbols=SPY',
  ], '…having tried the two live endpoints FIRST, against the injected backend: the priority '
  + 'the comment block claims, executed rather than read');
  // Array.from, because the value crosses out of the VM: an array built inside
  // it is a foreign-realm Array and deepStrictEqual compares prototypes.
  eq(Array.from(fromSnapshot.attempts, (a) => a.source + ':' + (a.reason || 'ok')),
    ['market_live:fetch_failed', 'scanner:backend_auth_not_ready', 'market_context:ok'],
    '…and it records why each source did or did not answer');
  // (ii) THE SAME CALL WITH NOTHING TO FIND. A resolver that always returned
  //      its snapshot would pass (i) alone; this is the input where it differs.
  const nothing = await ctx.resolveFreshSpyPrice(offline({ snapshot: null }));
  eq(nothing.price, null, 'with no snapshot and no network it resolves to NO price');
  eq(nothing.reason, 'no_fresh_spy_source', '…and says why');
  eq(nothing.attempts.length, fromSnapshot.attempts.length,
    '…having tried exactly as many sources, so the difference is the answer and not the effort');
  // (iii) A LIVE SOURCE OUTRANKS THE SNAPSHOT, which is the other half of the
  //       priority claim and the half (i) cannot show.
  const live = await ctx.resolveFreshSpyPrice(offline({
    snapshot: { data: { spyPrice: 444.25 } },
    ttConnected: true,
    ttCallImpl: () => ({ quotes: [{ symbol: 'SPY', last: 450.75 }] }),
  }));
  eq(live.price, 450.75, 'with a working quote source the LIVE price wins over the snapshot');
  eq(live.source, 'scanner', '…attributed to that source');
  eq(live.isLive, true, '…and marked live, which the snapshot result was not');
  ok(live.price !== fromSnapshot.price,
    '…so the three drives disagree, and the resolver is being measured rather than echoed');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
eq(UNDO.undoPortfolioSpyPrice(LIVE_INDEX, MODULE), INDEX,
  'the undo reconstructs the base exactly — the whole point of the helper');
eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied answers true for the shipped document');
eq(UNDO.isApplied(INDEX), false, '…and false for the document that predates this layer');
eq(UNDO.isApplied(42), false, '…and false, rather than throwing, for a non-string');
throwsWith(() => UNDO.undoPortfolioSpyPrice(42, MODULE),
  'PORTFOLIO_SPY_PRICE_UNDO_BAD_INPUT', 'a non-string document is refused by name');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX, 42),
  'PORTFOLIO_SPY_PRICE_UNDO_BAD_INPUT', '…as is a non-string module');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX, MODULE + 'x'),
  'PORTFOLIO_SPY_PRICE_UNDO_MODULE_IDENTITY', 'a padded module is refused');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX, MODULE.slice(0, -1)),
  'PORTFOLIO_SPY_PRICE_UNDO_MODULE_IDENTITY', '…as is a truncated one');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX, MODULE + '\n'),
  'PORTFOLIO_SPY_PRICE_UNDO_MODULE_IDENTITY',
  '…and so is one that RE-ABSORBED the structural separator: it is one unit too long');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX, MODULE.slice(0, -2) + 'x\n'),
  'PORTFOLIO_SPY_PRICE_UNDO_MODULE_SEPARATOR',
  'a module of the right LENGTH that no longer ends on a closing brace gets its own error');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX, ' ' + MODULE.slice(1)),
  'PORTFOLIO_SPY_PRICE_UNDO_MODULE_IDENTITY',
  'a module of the right length and ending whose BYTES differ is caught by the digest');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX.replace(TAG, ''), MODULE),
  'PORTFOLIO_SPY_PRICE_UNDO_TAG_IDENTITY', 'a document with no tag is refused');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX.replace(TAG, TAG + TAG), MODULE),
  'PORTFOLIO_SPY_PRICE_UNDO_TAG_IDENTITY', '…as is one with the tag twice');
throwsWith(() => UNDO.undoPortfolioSpyPrice(
  LIVE_INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
'PORTFOLIO_SPY_PRICE_UNDO_TAG_ADJACENCY', 'a REORDERED tag is refused by adjacency');
throwsWith(() => UNDO.undoPortfolioSpyPrice(LIVE_INDEX + 'x', MODULE),
  'PORTFOLIO_SPY_PRICE_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere is refused');
{
  const stranded = LIVE_INDEX.slice(0, UNDO.RAW_AT) + '\n' + LIVE_INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoPortfolioSpyPrice(stranded, MODULE),
    'PORTFOLIO_SPY_PRICE_UNDO_EXTRACTED_IDENTITY',
    '…and a structural separator left inline is rejected by the whole-document gate');
}
throwsWith(() => UNDO.undoPortfolioSpyPrice(INDEX, MODULE),
  'PORTFOLIO_SPY_PRICE_UNDO_TAG_IDENTITY',
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
    '…and NO owner of this cut is among them: all five are live code');
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
  // THE RANK AND THE COUNT ABOVE IT ARE PINNED SEPARATELY AND TIED TOGETHER, so
  // neither can drift alone. #467's mutation pass found the count version of
  // this constant checking nothing, because the assertion that read it had been
  // left behind in the audit.
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
    '…and this one does NOT: §4 is the reason there was no such banner to open on');
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
  // EXISTENCE ALONE DOES NOT NAME IT, and #467's mutation pass proved that on
  // this exact clause: a mutant pointing RETIRED_CONTRACT_REL at a NEIGHBOURING
  // contract survived, because that file still ships too. The name is pinned to
  // the one the retired spec itself targeted, read out of the commit that still
  // carried it.
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + RETIRED_CONTRACT_REL + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  // RETIRED IN #470, one phase earlier than the rhythm that shipped this layer.
  // Every assertion in this file still runs on every push; what stops is the
  // mutation pass proving those pins load-bearing — and #469's pass ran all 140
  // of them with no survivors, so what ends is the re-proving, not the proof.
  // The assertion is kept as its NEGATION rather than deleted, because a deleted
  // line would pass for the wrong reason.
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    'this contract\'s mutation spec was RETIRED, so the audit of the next cycle carries the pass');
  eq(git(['cat-file', '-e', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]), '',
    '…and that path is the one this cycle removed, not merely a path that never existed');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
  // THE RATCHET, which this phase does not move: the audit leaves as this
  // contract arrives, one for one. TEST_FILE_COUNT is the LIVE count, which
  // every later audit moves by design; BASE_TEST_FILE_COUNT is a fact about the
  // base commit and never moves. Their DIFFERENCE was pinned at zero here, and
  // that was the same mistake this file warns about two paragraphs down: it
  // held for exactly one commit and then failed on the next cycle's Phase 1, a
  // PR that had not touched this contract. What replaces it is the one-for-one
  // fact itself, stated about the two commits rather than about today's total.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this contract in it');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, BASE_TEST_FILE_COUNT,
  '…and BASE_TEST_FILE_COUNT is what the base commit carried, read out of git');
  {
    const atBase = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/']).split('\n');
    ok(atBase.indexOf(AUDIT_REL) >= 0, 'the base carried the temporary audit');
    ok(atBase.indexOf(CONTRACT_REL) < 0, '…and did NOT carry this contract');
    ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)) && fs.existsSync(path.join(ROOT, CONTRACT_REL)),
      '…and today it is the other way round: one file for one file, which stays true however '
      + 'many audits ship after this one');
  }
  {
    const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => f.endsWith('.test.js') &&
        RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
    ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
      .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
    '…and every one of them reads the same value, none left behind');
  }
  // The budget, executed rather than narrated.
  {
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
    // READ OUT OF THE REVISION THAT LAST CARRIED IT. The spec is retired, so
    // requiring it would throw; what it HELD is a fact about that commit and
    // stays true forever, which is why the pin survives the retirement.
    const specAt = git(['show', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]);
    eq((specAt.match(/\n  \{ id: "/g) || []).length, CONTRACT_SPEC_MUTANTS,
      'this contract\'s spec carried CONTRACT_SPEC_MUTANTS mutants, one per pin');
    ok(specAt.indexOf("target: '" + CONTRACT_REL + "'") >= 0,
      '…and it targeted THIS contract, not a neighbouring one');
    // HOW BIG THE RETIREMENT WAS, read out of the base commit rather than
    // remembered. A constant nothing reads is a constant whose mutant survives,
    // which is how this assertion came to be written.
    const entriesAt = (rel) => (git(['show', BASE_SHA + ':' + rel]).match(/\n  \{ id: "/g) || []).length;
    eq(entriesAt(AUDIT_SPEC_REL) + entriesAt(RETIRED_SPEC_REL), RETIRED_MUTANTS,
      '…and the two spec paths this cycle removes carried RETIRED_MUTANTS between them, '
      + 'counted in the base commit that still holds both');
    ok(entriesAt(AUDIT_SPEC_REL) > 0 && entriesAt(RETIRED_SPEC_REL) > 0,
      '…each of them non-empty, so the sum is two real specs and not one plus a typo');
    // WHAT THE LIVE TOTAL NO LONGER COUNTS is this contract's mutants: they left
    // with the spec. The live number is read only for the ceiling invariant below,
    // which is the part that stays true however many layers ship after this one.
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow, '…and the live declared total is under it');
    const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
      .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
    eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
    eq(layerSpecs.indexOf(path.basename(CONTRACT_SPEC_REL)), -1,
      '…and it is NOT this one: the spec moved on to the cycle in flight');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_SPY_PRICE_CONTRACT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
