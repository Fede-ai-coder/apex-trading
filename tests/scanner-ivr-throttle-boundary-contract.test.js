'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER IVR THROTTLE — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #444 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/scanner-ivr-throttle-undo.js
// reconstructs the pre-extraction document byte for byte, and §8 asserts the
// production footprint is index.html plus the one new file.
//
// WHAT MOVED. [80720,84771) in monolith coordinates — 4,051 units: the region's
// own banner and header, twelve top-level owners, one closing newline. Four
// tuning constants, five pieces of queue/cache state, three functions, and zero
// top-level statements.
//
// FOUR REFERENCES IN THE ENTIRE APPLICATION. One awaited call to
// `fetchScannerIvr` inside a batch function, and three reads of
// `_scannerIvrDiag` in a perf-diag dump, each already guarded by
// `typeof … === 'object'`. §5 measures all seven directions the screen now
// counts and every other one is zero.
//
// THE TWO NEWEST DIRECTIONS ARE THE REASON THIS LAYER IS THE ONE THAT MOVED,
// and they live in tests/lib/extraction-boundary.js now rather than in the audit
// that measured them — `literalView` and `isPropertyWriteAt`. The audit is
// deleted by this PR; the directions are not.
//
//   - GENERATED MARKUP. Every direction before these read the monolith through
//     `maskLiterals`, so a handler reached only from `onclick=` written into
//     innerHTML was invisible. On the five-direction screen the scanner's
//     filter-handler region scored exactly what this one scored, and the two
//     tied; it carries nine generated callers and this one carries none.
//   - INBOUND PROPERTY WRITES. A write THROUGH a name the region owns is not an
//     assignment TO it, and only the second was ever counted. The candle
//     throttle beside this one takes four such writes from a function that
//     stays behind. This one takes none.
//
// ITS TWO MIRROR SIBLINGS DID NOT COME WITH IT, measured rather than assumed.
// Audit #444 scored the three at 9, 4 and 5 apart and 18 together — the sum
// exactly. §5 keeps the fact that makes that true alive on the shipped tree:
// none of the three references another, so combining them removes no coupling.
// The audit's totals themselves are not re-derived here; the cross-reference
// zero is, because it is the load-bearing half.
//
// SECOND-SMALLEST, AND IT MOVED THE PREVIOUS LAYER'S PIN. At 4,050 units it
// displaces journal-migration (4,461) from second place behind the vega monitor,
// so #443's contract had to be re-pinned in this change. That is a superlative
// over the whole set behaving as one should: it moves when the set does. The
// first draft of this file's own header called this module the "third-largest"
// in the chain — written from the impression that 4,051 is a lot next to the
// 1,761 before it, when the chain's largest is 71,811. §4 measures the rank.
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
const UNDO = require('./lib/scanner-ivr-throttle-undo.js');

const MODULE_REL = 'js/services/scanner-ivr-throttle.js';
const TAG = '<script src="./js/services/scanner-ivr-throttle.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '2343566';
const CONTRACT_REL = 'tests/scanner-ivr-throttle-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/scanner-ivr-throttle-undo.js';
const AUDIT_REL = 'tests/temporary-scanner-ivr-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-ivr-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/scanner-ivr-contract.spec.js';

// The suite does NOT ratchet: the audit leaves as this contract arrives.
const TEST_FILE_COUNT = 155;
const LOCAL_SCRIPT_COUNT = 71;
const MODULE_POSITION = 70;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 114029;
const CODE_CHARS = 1454127;
const RAW_AT_IN_CODE = 80720;
const RAW_END_IN_CODE = 84771;
const BODY_END_IN_CODE = 84770;
const TOP_LEVEL_BANNERS = 182;
const RESIDUAL_MONOLITH = 1450076;
const TAG_GAP = 80728;
const NET_REDUCTION = 3989;

// ── The twelve owners ────────────────────────────────────────────────────────
const OWNERS_EXPECTED = [
  { name: '_SCANNER_IVR_CONCURRENCY', form: 'var', start: 297, chars: 33 },
  { name: '_SCANNER_IVR_CACHE_TTL_MS', form: 'var', start: 331, chars: 47 },
  { name: '_SCANNER_IVR_SOURCE', form: 'var', start: 393, chars: 39 },
  { name: '_SCANNER_IVR_DEBUG_PARITY', form: 'var', start: 433, chars: 38 },
  { name: '_scannerIvrCache', form: 'var', start: 524, chars: 43 },
  { name: '_scannerIvrInFlight', form: 'var', start: 595, chars: 46 },
  { name: '_scannerIvrQueue', form: 'var', start: 661, chars: 26 },
  { name: '_scannerIvrActive', form: 'var', start: 688, chars: 26 },
  { name: '_scannerIvrDiag', form: 'var', start: 715, chars: 267 },
  { name: '_scannerIvrCacheKey', form: 'function', start: 983, chars: 154 },
  { name: '_scannerIvrPumpQueue', form: 'function', start: 1138, chars: 1691 },
  { name: 'fetchScannerIvr', form: 'function', start: 2830, chars: 1219 },
];
const OWNER_COUNT = 12;
const FUNCTION_OWNERS = 3;
const BODY_ENDING = '}\n';

// ── Coupling, in all SEVEN directions ────────────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [58584, 737805, 737837, 737856];
const CONSUMER_SITE = 58584;
const CONSUMER_NAME = 'fetchScannerIvr';
const DIAG_SITES = [737805, 737837, 737856];
const INBOUND_WRITES = 0;
const INBOUND_PROPERTY_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = [];
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const GENERATED_MARKUP_REFERENCES = 0;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 12;

// ── The family it was cut out of ─────────────────────────────────────────────
const CANDLES = [75943, 80720];
const EARNINGS = [84771, 89653];
const CANDLES_INBOUND_PROPERTY_WRITES = 4;
const CANDLES_DEPENDENCIES = ['fetchCandles'];
const EARNINGS_DEPENDENCIES = ['fetchEarningsForTicker'];

// ── The chain this joins ─────────────────────────────────────────────────────
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
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
];
const CHAIN_LENGTH = 27;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const SECOND_SMALLEST = MODULE_REL;
const SECOND_SMALLEST_CHARS = 4050;
const DISPLACED_LAYER = 'js/services/journal-migration.js';
const DISPLACED_CHARS = 4461;
const LARGEST_CHARS = 71811;
const LAYERS_ENDING_BRACE = 24;
// CHAIN-WIDE COUNTS LIVE IN THE NEWEST LAYER'S CONTRACT, and move forward with
// it each cycle. #443 introduced these two after finding the bridge had stated
// them in prose for four cycles with nothing executing them; they moved here in
// #445 rather than being copied, because the newest contract is the one that
// always carries a mutation spec, and a chain-wide number nobody mutates is a
// number nobody checks.
const LAYERS_WITH_SEPARATOR = 19;
const LAYERS_WITH_RAW_PAIR = 16;
const LAYERS_WITHOUT_SEPARATOR = 8;

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
function propertyWriteBases(masked) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(masked))) out.push(m[1]);
  return out;
}
function statementLines(src, decls) {
  const ch = Array.from(src);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  return ch.join('').split('\n').filter((l) => !isBlankOrComment(l));
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
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('SCANNER IVR THROTTLE — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited #444 · base=' + BASE_SHA);

// This is the NEWEST layer, so the live document is the one it shipped: there
// is nothing on top to peel. When a later layer lands it goes here, first —
// which is exactly what happened to #443's contract in this very change.
const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// The BASE document, reached through the undo rather than re-read from git, so
// every coordinate below is proved by the reconstruction that shipped.
const BASE = UNDO.undoScannerIvrThrottle(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(BASE_CODE);
const STRINGS = literalView(BASE_CODE, maskLiterals, stripComments);
const ALL_DECLS = scanTopLevelDeclarations(BASE_CODE);
const BY_NAME = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const OWNERS = scanTopLevelDeclarations(MODULE);
const MASKED_MODULE = maskLiterals(MODULE);

const SIBLINGS = LOCALS.filter((rel) => rel !== MODULE_REL).map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return { rel, masked: maskLiterals(src), bound: locallyBound(src) };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,564,193 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,593,963 bytes');
  eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…27,201 line feeds');
  eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
  eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'seventy-one local scripts');
  eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last, at index 70 — the 71st');
  eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
    '…immediately after the vega-monitor anchor and immediately before the inline monolith');
  eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, NET_REDUCTION,
    'the document lost 3,989 units: 4,051 of code out, 62 of tag in');

  // The base is the merged #444 commit, reached by the undo and checked against
  // git rather than assumed.
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(BASE, fromGit, 'the undo reconstructs the base commit\'s index.html byte for byte');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…and its digest');
  eq(BASE.length, UNDO.BASE_CHARS, '…and its length');
  ok(UNDO.isApplied(INDEX), 'the layer reads as applied on the shipped document');
  ok(!UNDO.isApplied(BASE), '…and not applied on the base it came from');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 4,050 units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…4,060 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…90 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the audited digest');
  eq(MODULE, BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'it is the audited block\'s bytes, verbatim — not a re-indented copy');
  eq(MODULE + '\n', BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'body + one structural line feed IS the raw fragment');
  eq(MODULE.slice(-2), BODY_ENDING, 'it ends `}\\n`');
  ok(!MODULE.endsWith('\n\n'), '…and carries no trailing blank line: the separator stayed behind');
  eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the residual monolith is 1,450,076 units');
  eq(BASE_CODE.length, CODE_CHARS, '…where the base carried 1,454,127');
  eq(BASE_CODE.length - LIVE_CODE.length, UNDO.RAW_CHARS,
    '…the difference being exactly the raw fragment');
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the base monolith starts at 114,029');
  eq(UNDO.RAW_AT - (INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length), TAG_GAP,
    'the anchor tag ends 80,728 units before the fragment began');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  const firstLine = BASE_CODE.slice(RAW_AT_IN_CODE, BASE_CODE.indexOf('\n', RAW_AT_IN_CODE));
  eq(firstLine, '// ── Scanner IVR throttle/dedup/cache (mirrors fetchScannerCandles) ──',
    'the region opens on the feature\'s own banner line, not a header\'s closing rule');
  ok(BASE_CODE[RAW_AT_IN_CODE - 1] === '\n', '…which begins a line');
  eq(BASE_CODE.slice(RAW_END_IN_CODE, BASE_CODE.indexOf('\n', RAW_END_IN_CODE)),
    '// ── Scanner Earnings throttle/dedup/cache (mirrors fetchScannerIvr) ──',
    'and it ends where the next sibling\'s banner begins');

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of that banner');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');

  eq(topLevelBanners(BASE_CODE, FN_BODIES).length, TOP_LEVEL_BANNERS,
    'the base monolith carried 182 top-level banner marks');
  const last = OWNERS[OWNERS.length - 1];
  eq(last.start + last.chars + 1, MODULE.length,
    'the last declaration runs to the body\'s final newline: no trailing IIFE, no trailing statement');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Twelve owners — and where this lands in the chain');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares twelve names at top level');
  eq(OWNERS.map((d) => ({ name: d.name, form: d.form, start: d.start, chars: d.chars })),
    OWNERS_EXPECTED, '…four config vars, five state vars, three functions');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, 'three of them are functions');
  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declarations');

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'twenty-seven layers ship today');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at 1,761 units');
  eq(bySize[1].rel, SECOND_SMALLEST, 'and THIS is the second-smallest');
  eq(bySize[1].units, SECOND_SMALLEST_CHARS, '…at 4,050');
  eq(bySize[2].rel, DISPLACED_LAYER, '…displacing journal-migration to third');
  eq(bySize[2].units, DISPLACED_CHARS, '…which is 4,461 — 411 units more');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS,
    'the chain\'s largest is 71,811, which is why "third-largest" was never close');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'twenty-four of the twenty-seven end `}\\n`, this one among them');

  // The bridge's two separator claims, executed. Helpers are matched by the
  // module path in their own TAG, not by filename: this layer's helper is
  // `scanner-ivr-throttle-undo.js` and the one before it is `vega-monitor-undo.js`,
  // neither of which a basename matcher derives from the module path.
  const HELPERS = fs.readdirSync(path.join(ROOT, 'tests/lib'))
    .filter((f) => /-undo\.js$/.test(f) && f !== 'post-journal-mcx-pr3-undo.js')
    .map((f) => require(path.join(ROOT, 'tests/lib', f)));
  const forLayer = CHAIN.map((rel) => {
    const hit = HELPERS.filter((M) => typeof M.TAG === 'string' && M.TAG.indexOf('/' + rel + '"') >= 0);
    return hit.length === 1 ? hit[0] : null;
  });
  eq(forLayer.filter(Boolean).length, CHAIN_LENGTH,
    'every one of the twenty-seven resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'nineteen layers carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, LAYERS_WITHOUT_SEPARATOR,
    '…and the eight oldest have no separator concept at all');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…but only sixteen of the nineteen pin a single RAW_CHARS one unit longer than MODULE_CHARS, '
    + 'so the pair is not the tell the separator is');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling, in all seven directions');
// ─────────────────────────────────────────────────────────────────────────────
{
  const names = OWNERS.map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < RAW_AT_IN_CODE || i >= RAW_END_IN_CODE;

  // 1. inbound references
  const sites = [];
  for (const n of names) for (const at of refSites(MASKED, n).filter(outside)) sites.push(at);
  sites.sort((a, b) => a - b);
  eq(sites, EDGE_SITES, 'FOUR references reach in from the rest of the monolith');
  eq(sites.length, EXTERNAL_EDGES, '…exactly four');
  ok(sites.every(insideFunction), '…every one inside a function body, so none runs at load');
  eq(BASE_CODE.slice(CONSUMER_SITE, CONSUMER_SITE + CONSUMER_NAME.length), CONSUMER_NAME,
    'the site at 58,584 names fetchScannerIvr');
  ok(/await fetchScannerIvr\(/.test(BASE_CODE.slice(CONSUMER_SITE - 8, CONSUMER_SITE + 30)),
    '…as the real consumer: an awaited call');
  for (const at of DIAG_SITES) {
    ok(/_scannerIvrDiag/.test(BASE_CODE.slice(at, at + 20)),
      'the other three read _scannerIvrDiag at ' + at);
  }

  // 2. inbound writes, and 3. inbound PROPERTY writes — not the same direction.
  let inWrites = 0, inPropWrites = 0;
  for (const n of names) for (const at of refSites(MASKED, n).filter(outside)) {
    if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
    if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
  }
  eq(inWrites, INBOUND_WRITES, 'nothing outside assigns TO a name this region owns');
  eq(inPropWrites, INBOUND_PROPERTY_WRITES, '…and nothing writes THROUGH one either');

  // The control the seventh direction needs: a region where the answer differs,
  // or `return 0` is indistinguishable from measuring.
  {
    const candleNames = ALL_DECLS.filter((d) => d.start >= CANDLES[0] && d.end < CANDLES[1]).map((d) => d.name);
    let candleProp = 0;
    for (const n of candleNames) {
      for (const at of refSites(MASKED, n).filter((i) => i < CANDLES[0] || i >= CANDLES[1])) {
        if (isPropertyWriteAt(MASKED, at, n)) candleProp++;
      }
    }
    eq(candleProp, CANDLES_INBOUND_PROPERTY_WRITES,
      'control — the candle sibling takes FOUR writes through a name it owns, so the zero above measures');
  }

  // 4. outbound property writes
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  eq(outWrites.length, OUTBOUND_WRITES, 'it writes through no name it does not own');

  // 5. outbound dependency names
  const local = locallyBound(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE));
  const deps = new Set();
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) deps.add(d.name);
  }
  eq(Array.from(deps).sort(), MONOLITH_DEPENDENCIES, 'it names nothing the monolith declares');
  // …and the control, from the siblings that DO depend.
  {
    const each = (range) => {
      const own = new Set(ALL_DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name));
      const lb = locallyBound(BASE_CODE.slice(range[0], range[1]));
      const bm = MASKED.slice(range[0], range[1]);
      const out = new Set();
      for (const d of ALL_DECLS) {
        if (own.has(d.name) || lb.has(d.name)) continue;
        if (refSites(bm, d.name).length) out.add(d.name);
      }
      return Array.from(out).sort();
    };
    eq(each(CANDLES), CANDLES_DEPENDENCIES, 'control — the candle sibling calls fetchCandles');
    eq(each(EARNINGS), EARNINGS_DEPENDENCIES, 'control — the earnings sibling calls fetchEarningsForTicker');
  }

  // The sibling ranges are anchored to THIS layer's boundary, not carried as
  // free-floating numbers: candles ends exactly where this region begins and
  // earnings begins exactly where it ends. Without this, a mutant moving either
  // endpoint by one changed no answer and survived.
  eq(CANDLES[1], RAW_AT_IN_CODE, 'the candle sibling ends exactly where this region begins');
  eq(EARNINGS[0], RAW_END_IN_CODE, '…and the earnings sibling begins exactly where it ends');
  // The candle region opens on a four-line `═══` box header, not a `──` banner
  // — which is why the screen's header-merge rule matters for it and not for
  // this one. Pinned by its TITLE line, the part a closing-rule cut would strand.
  eq(BASE_CODE.slice(CANDLES[0], BASE_CODE.indexOf('\n', CANDLES[0])),
    '// ═══════════════════════════════════════════════════════════════',
    '…and the candle region opens on a box-header rule');
  eq(BASE_CODE.split('\n')[BASE_CODE.slice(0, CANDLES[0]).split('\n').length],
    '// DATA FETCH — cascade TT → TD → AV → Yahoo',
    '…whose title line is what a closing-rule cut would have stranded');

  // WHY THE FAMILY WAS NOT TAKEN WHOLE. The three mirror siblings are
  // contiguous and written as copies of each other, so taking all three looked
  // obvious. It buys nothing, and this is the reason: none of them references
  // another, so every reference stays external however they are grouped.
  {
    const rangeOf = { candles: CANDLES, ivr: [RAW_AT_IN_CODE, RAW_END_IN_CODE], earnings: EARNINGS };
    const namesOf = (r) => ALL_DECLS.filter((d) => d.start >= r[0] && d.end < r[1]).map((d) => d.name);
    for (const [from, to] of [['candles', 'ivr'], ['ivr', 'earnings'], ['earnings', 'candles'],
                              ['ivr', 'candles'], ['earnings', 'ivr'], ['candles', 'earnings']]) {
      const target = rangeOf[to];
      let crossing = 0;
      for (const n of namesOf(rangeOf[from])) {
        crossing += refSites(MASKED, n).filter((i) => i >= target[0] && i < target[1]).length;
      }
      eq(crossing, 0, from + ' is never named from inside ' + to);
    }
    ok(namesOf(CANDLES).length > 0 && namesOf(EARNINGS).length > 0,
      'control — both siblings do own names that could have crossed');
  }

  // 6. sibling modules, guarded against the `field` confound #442 found
  let sib = 0;
  for (const n of names) for (const s of SIBLINGS) if (!s.bound.has(n)) sib += refSites(s.masked, n).length;
  eq(sib, SIBLING_REFERENCES, 'none of the seventy sibling modules names it');
  eq(SIBLINGS.length, LOCAL_SCRIPT_COUNT - 1, '…and there are seventy of them to have named it');

  // 7. static markup, and generated markup — the direction #444 added.
  let mkp = 0;
  for (const n of names) mkp += refSites(STATIC_MARKUP, n).length;
  eq(mkp, MARKUP_REFERENCES, 'static markup does not name it');
  let gen = 0;
  for (const n of names) gen += refSites(STRINGS, n).filter(outside).length;
  eq(gen, GENERATED_MARKUP_REFERENCES, 'and neither does markup the monolith generates at runtime');
  // The control: the direction can find references when they exist.
  ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
    'control — the literal view DOES find rsApplyFilters, which is reachable only from generated markup');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(MODULE, OWNERS, maskLiterals), EVALUATION_TIME_READS,
    'the module reads NO name at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining twelve globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.map((d) => d.name).sort(), '…exactly its own owners');
  eq(typeof ctx.fetchScannerIvr, 'function', 'the entry point is there');
  eq(ctx._scannerIvrActive, 0, 'the queue starts idle');
  eq(ctx._scannerIvrCacheKey('AAPL'), ctx._scannerIvrCacheKey('AAPL'), 'the cache key is deterministic');
  ok(ctx._scannerIvrCacheKey('AAPL') !== ctx._scannerIvrCacheKey('MSFT'), '…and distinguishes tickers');

  const watched = [];
  const ctx2 = {
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    document: { getElementById: () => { watched.push('document'); return null; } },
  };
  vm.createContext(ctx2);
  vm.runInContext(MODULE, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer and touches no DOM');
  ok(!/\bdocument\s*\./.test(MASKED_MODULE), 'the module owns no DOM access at all');
  ok(!/\bnew\s+WebSocket\b/.test(MASKED_MODULE), '…and opens no socket');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  throwsWith(() => UNDO.undoScannerIvrThrottle(null, MODULE),
    'SCANNER_IVR_UNDO_BAD_INPUT', 'a non-string document is refused');
  throwsWith(() => UNDO.undoScannerIvrThrottle(INDEX, null),
    'SCANNER_IVR_UNDO_BAD_INPUT', '…and a non-string module');
  throwsWith(() => UNDO.undoScannerIvrThrottle(INDEX, MODULE.slice(0, -1)),
    'SCANNER_IVR_UNDO_MODULE_IDENTITY', 'a truncated module is refused');
  // WHICH GUARD ACTUALLY CATCHES A RE-ABSORBED SEPARATOR, measured rather than
  // assumed. A module carrying the separator is 4,051 units with 91 line feeds,
  // so the SIZE guard fires first and MODULE_SEPARATOR never sees it. The
  // `endsWith('\n\n')` clause beside it is therefore unreachable without also
  // failing size — the undo helper's header records it as one of the two
  // clauses kept for naming their failure rather than for being load-bearing.
  throwsWith(() => UNDO.undoScannerIvrThrottle(INDEX, MODULE + '\n'),
    'SCANNER_IVR_UNDO_MODULE_IDENTITY',
    'a module that re-absorbed the separator is caught by SIZE, not by the separator clause');
  eq((MODULE + '\n').length, UNDO.MODULE_CHARS + 1, '…because it is one unit too long');
  eq(((MODULE + '\n').match(/\n/g) || []).length, UNDO.MODULE_LF + 1, '…and carries one line feed too many');
  {
    const swapped = MODULE.slice(0, -2) + 'x\n';
    throwsWith(() => UNDO.undoScannerIvrThrottle(INDEX, swapped),
      'SCANNER_IVR_UNDO_MODULE_SEPARATOR', 'a module not ending `}\\n` is refused');
  }
  throwsWith(() => UNDO.undoScannerIvrThrottle(BASE, MODULE),
    'SCANNER_IVR_UNDO_TAG_IDENTITY', 'an already-unextracted document is refused');
  {
    const doubled = INDEX.replace(TAG, TAG + TAG);
    throwsWith(() => UNDO.undoScannerIvrThrottle(doubled, MODULE),
      'SCANNER_IVR_UNDO_TAG_IDENTITY', 'a duplicated tag is refused');
  }
  {
    const moved = INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG);
    throwsWith(() => UNDO.undoScannerIvrThrottle(moved, MODULE),
      'SCANNER_IVR_UNDO_TAG_ADJACENCY', 'a reordered tag is refused');
  }
  {
    const padded = INDEX.replace(INLINE_OPEN, '<!-- x -->' + INLINE_OPEN);
    throwsWith(() => UNDO.undoScannerIvrThrottle(padded, MODULE),
      'SCANNER_IVR_UNDO_TAG_ADJACENCY', 'content wedged between the tag and the monolith is refused');
  }
  {
    const foreign = INDEX.replace('</body>', '<!-- foreign --></body>');
    throwsWith(() => UNDO.undoScannerIvrThrottle(foreign, MODULE),
      'SCANNER_IVR_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  }
  // The round trip, which is the whole point of the helper.
  eq(UNDO.undoScannerIvrThrottle(INDEX, MODULE), BASE, 'and the accepted path reconstructs the base exactly');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', MODULE_REL],
    'production footprint is exactly index.html plus the one new module');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so a mutant that
  // renamed this constant survived the first pass. The name has to be the one
  // the base actually carried.
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit’s mutation spec is gone with the audit it targeted');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely a path that does not exist');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '',
    '…as is the audit\'s own path');
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), '…replaced by one for this contract');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite does not ratchet: 155 files before and after');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('SCANNER_IVR_THROTTLE_BOUNDARY_OK');
