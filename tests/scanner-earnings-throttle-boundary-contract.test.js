'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// SCANNER EARNINGS THROTTLE — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #446 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/scanner-earnings-throttle-undo.js
// reconstructs the pre-extraction document byte for byte, and §8 asserts the
// production footprint is index.html plus the one new file.
//
// WHAT MOVED. [80720,85602) in monolith coordinates — 4,882 units: the region's
// own banner and header, eleven top-level owners, one closing newline. Three
// tuning constants, five pieces of queue/cache state, three functions, and zero
// top-level statements.
//
// FOUR REFERENCES IN THE ENTIRE APPLICATION. One awaited call to
// `fetchScannerEarnings` inside a batch function, and three reads of
// `_scannerEarningsDiag` in a perf-diag dump, each already guarded by
// `typeof … === 'object'`. §5 measures all seven directions the screen counts.
//
// THE ONE DIRECTION THAT IS NOT ZERO, and why it did not disqualify this layer.
// It names `fetchEarningsForTicker`, which stays in the monolith. #444 took the
// IVR sibling first precisely because that one named nothing — but a RUNTIME
// dependency is not a LOAD-TIME one. The call sits inside `fetchScannerEarnings`
// and never runs while the module evaluates, so §6 still loads the module in a
// COMPLETELY empty VM: no stub, no shim, no ordering requirement. §5 also counts
// how many shipped contracts already pin a non-empty MONOLITH_DEPENDENCIES,
// because "is this normal for the chain?" is a question about a set, and the
// audit's first draft answered it from the two layers nearest to hand and was
// wrong by four.
//
// THE TWO NEWEST DIRECTIONS CHANGED THE RANKING BEFORE THIS LAYER WAS CHOSEN.
// `literalView` and `isPropertyWriteAt` live in tests/lib/extraction-boundary.js
// rather than in the audits that found them. On the five-direction screen four
// regions tied ahead of this one; under seven, two of them collapse — the
// scanner's filter handlers to 13 on generated-markup callers, the option-chain
// region to 6 on inbound property writes. This one did not improve. The screen
// stopped flattering its rivals. The audit that measured that is deleted by this
// PR; the two directions are not.
//
// ITS MIRROR SIBLING DID NOT COME WITH IT. The candle throttle is contiguous
// with this region and written as a copy of it, and §5 keeps alive the fact that
// makes separating them free: neither references the other, so every reference
// stays external however they are grouped. Shared shape is not shared state.
//
// SEVENTH-SMALLEST OF TWENTY-EIGHT, measured and not described. At 4,881 units
// this layer changes no superlative: the vega monitor (1,761) and the IVR
// throttle (4,050) keep first and second, so unlike #445 this change re-pins
// nothing in the previous layer's contract. §4 measures the rank rather than
// asserting it — the equivalent line one cycle ago said "third-largest" and was
// wrong by twenty-three places, against a chain whose largest is 71,811.
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
const UNDO = require('./lib/scanner-earnings-throttle-undo.js');

const MODULE_REL = 'js/services/scanner-earnings-throttle.js';
const TAG = '<script src="./js/services/scanner-earnings-throttle.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/scanner-ivr-throttle.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = 'a899cb4';
const CONTRACT_REL = 'tests/scanner-earnings-throttle-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/scanner-earnings-throttle-undo.js';
const AUDIT_REL = 'tests/temporary-scanner-earnings-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/scanner-earnings-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/scanner-earnings-contract.spec.js';

// The suite does NOT ratchet: the audit leaves as this contract arrives.
const TEST_FILE_COUNT = 157;
const LOCAL_SCRIPT_COUNT = 72;
const MODULE_POSITION = 71;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 114091;
const CODE_CHARS = 1450076;
const RAW_AT_IN_CODE = 80720;
const RAW_END_IN_CODE = 85602;
const BODY_END_IN_CODE = 85601;
const TOP_LEVEL_BANNERS = 181;
const RESIDUAL_MONOLITH = 1445194;
const TAG_GAP = 80728;
const NET_REDUCTION = 4815;

// ── The eleven owners ────────────────────────────────────────────────────────
const OWNERS_EXPECTED = [
  { name: '_SCANNER_EARNINGS_CONCURRENCY', form: 'var', start: 362, chars: 38 },
  { name: '_SCANNER_EARNINGS_CACHE_TTL_MS', form: 'var', start: 401, chars: 52 },
  { name: '_SCANNER_EARNINGS_SOURCE', form: 'var', start: 468, chars: 49 },
  { name: '_scannerEarningsCache', form: 'var', start: 518, chars: 48 },
  { name: '_scannerEarningsInFlight', form: 'var', start: 594, chars: 51 },
  { name: '_scannerEarningsQueue', form: 'var', start: 665, chars: 31 },
  { name: '_scannerEarningsActive', form: 'var', start: 697, chars: 31 },
  { name: '_scannerEarningsDiag', form: 'var', start: 729, chars: 312 },
  { name: '_scannerEarningsCacheKey', form: 'function', start: 1042, chars: 169 },
  { name: '_scannerEarningsPumpQueue', form: 'function', start: 1212, chars: 2235 },
  { name: 'fetchScannerEarnings', form: 'function', start: 3448, chars: 1432 },
];
const OWNER_COUNT = 11;
const FUNCTION_OWNERS = 3;
const BODY_ENDING = '}\n';

// ── Coupling, in all SEVEN directions ────────────────────────────────────────
const EXTERNAL_EDGES = 4;
const EDGE_SITES = [95154, 733846, 733883, 733907];
const CONSUMER_SITE = 95154;
const CONSUMER_NAME = 'fetchScannerEarnings';
const DIAG_SITES = [733846, 733883, 733907];
const INBOUND_WRITES = 0;
const INBOUND_PROPERTY_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = ['fetchEarningsForTicker'];
const DEPENDENCY_NAME = 'fetchEarningsForTicker';
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const GENERATED_MARKUP_REFERENCES = 0;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 11;
// A runtime dependency is the COMMON case in this chain, not an exception made
// for this layer. Counted, because the audit's first draft said "two" from the
// layers nearest to hand and the real answer was six — this contract makes it
// eight, the chart-interactions layer of #449 having joined them.
const CONTRACTS_WITH_A_DEPENDENCY = 8;

// ── The family it was cut out of ─────────────────────────────────────────────
const CANDLES = [75943, 80720];
const CANDLES_INBOUND_PROPERTY_WRITES = 4;
const CANDLES_DEPENDENCIES = ['fetchCandles'];

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
  'js/services/scanner-ivr-throttle.js',
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
  // Newest last, for the same reason recorded above.
  'js/ui/chart-interactions.js',
];
const CHAIN_LENGTH = 29;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const SECOND_SMALLEST = 'js/services/scanner-ivr-throttle.js';
const SECOND_SMALLEST_CHARS = 4050;
// THIS layer's own rank, which is the number the equivalent line got wrong last
// cycle. It is not a superlative and is not meant to be: it is the measurement
// that stops one being invented.
const MODULE_SIZE_RANK = 7;
const LARGEST_CHARS = 71811;
const LAYERS_ENDING_BRACE = 26;
// CHAIN-WIDE COUNTS LIVE IN THE NEWEST LAYER'S CONTRACT, and move forward with
// it each cycle. #443 introduced these after finding the bridge had stated them
// in prose for four cycles with nothing executing them; they moved out of the
// bridge in #445 rather than being copied, because the newest contract is the
// one that always carries a mutation spec, and a chain-wide number nobody
// mutates is a number nobody checks.
const LAYERS_WITH_SEPARATOR = 21;
const LAYERS_WITH_RAW_PAIR = 18;
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

console.log('SCANNER EARNINGS THROTTLE — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited #446 · base=' + BASE_SHA);

// A later layer landed, so it is peeled here, first — which is exactly what the
// previous version of this comment said would happen. INDEX below is therefore
// this layer's own extracted document, not the live one, and §8 keeps the two
// apart: the production footprint is measured against the LIVE tree.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const CHART_INTERACTIONS_U = require('./lib/chart-interactions-undo.js');
const INDEX = CHART_INTERACTIONS_U.isApplied(LIVE_INDEX)
  ? CHART_INTERACTIONS_U.undoChartInteractions(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/ui/chart-interactions.js'), 'utf8'))
  : LIVE_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// The BASE document, reached through the undo rather than re-read from git, so
// every coordinate below is proved by the reconstruction that shipped.
const BASE = UNDO.undoScannerEarningsThrottle(INDEX, MODULE);
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
  eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,559,378 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,589,134 bytes');
  eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…27,106 line feeds');
  eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
  eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'seventy-two local scripts');
  eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last, at index 71 — the 72nd');
  eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
    '…immediately after the IVR-throttle anchor and immediately before the inline monolith');
  eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, NET_REDUCTION,
    'the document lost 4,815 units: 4,882 of code out, 67 of tag in');

  // The base is the merged #446 commit, reached by the undo and checked against
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
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 4,881 units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…4,895 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…95 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the audited digest');
  eq(MODULE, BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'it is the audited block\'s bytes, verbatim — not a re-indented copy');
  eq(MODULE + '\n', BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'body + one structural line feed IS the raw fragment');
  eq(MODULE.slice(-2), BODY_ENDING, 'it ends `}\\n`');
  ok(!MODULE.endsWith('\n\n'), '…and carries no trailing blank line: the separator stayed behind');
  eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the residual monolith is 1,445,194 units');
  eq(BASE_CODE.length, CODE_CHARS, '…where the base carried 1,450,076');
  eq(BASE_CODE.length - LIVE_CODE.length, UNDO.RAW_CHARS,
    '…the difference being exactly the raw fragment');
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the base monolith starts at 114,091');
  eq(UNDO.RAW_AT - (INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length), TAG_GAP,
    'the anchor tag ends 80,728 units before the fragment began');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  const firstLine = BASE_CODE.slice(RAW_AT_IN_CODE, BASE_CODE.indexOf('\n', RAW_AT_IN_CODE));
  eq(firstLine, '// ── Scanner Earnings throttle/dedup/cache (mirrors fetchScannerIvr) ──',
    'the region opens on the feature\'s own banner line, not a header\'s closing rule');
  ok(BASE_CODE[RAW_AT_IN_CODE - 1] === '\n', '…which begins a line');
  eq(BASE_CODE.slice(RAW_END_IN_CODE, BASE_CODE.indexOf('\n', RAW_END_IN_CODE)),
    '// ── DXLink Candle subscription guard during scanner_refresh ─────',
    'and it ends where the next feature\'s banner begins');

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of that banner');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');

  eq(topLevelBanners(BASE_CODE, FN_BODIES).length, TOP_LEVEL_BANNERS,
    'the base monolith carried 181 top-level banner marks');
  const last = OWNERS[OWNERS.length - 1];
  eq(last.start + last.chars + 1, MODULE.length,
    'the last declaration runs to the body\'s final newline: no trailing IIFE, no trailing statement');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Eleven owners — and where this lands in the chain');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares eleven names at top level');
  eq(OWNERS.map((d) => ({ name: d.name, form: d.form, start: d.start, chars: d.chars })),
    OWNERS_EXPECTED, '…three config vars, five state vars, three functions');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, 'three of them are functions');
  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declarations');

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'twenty-nine layers ship today');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at 1,761 units');
  eq(bySize[1].rel, SECOND_SMALLEST, 'and the IVR throttle is still second');
  eq(bySize[1].units, SECOND_SMALLEST_CHARS, '…at 4,050');
  // THIS layer's rank, which is the whole point of measuring rather than saying.
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer is SEVENTH-smallest of the twenty-eight — not any superlative');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS, '…at 4,881 units');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[1].units < UNDO.MODULE_CHARS,
    '…so it displaces neither of the two it ranks behind, and re-pins no earlier contract');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS,
    'the chain\'s largest is 71,811, which is why "third-largest" was never close');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\n`, this one among them — the counts are '
    + 'pinned above rather than spelled out here, which is how the suite-count messages '
    + 'drifted to four different wrong numbers before #448 repaired them');

  // The bridge's two separator claims, executed. Helpers are matched by the
  // module path in their own TAG, not by filename: a basename matcher does not
  // derive `vega-monitor-undo.js` from `js/portfolio/portfolio-vega-monitor.js`,
  // and silently read one layer short when it was tried.
  const HELPERS = fs.readdirSync(path.join(ROOT, 'tests/lib'))
    .filter((f) => /-undo\.js$/.test(f) && f !== 'post-journal-mcx-pr3-undo.js')
    .map((f) => require(path.join(ROOT, 'tests/lib', f)));
  const forLayer = CHAIN.map((rel) => {
    const hit = HELPERS.filter((M) => typeof M.TAG === 'string' && M.TAG.indexOf('/' + rel + '"') >= 0);
    return hit.length === 1 ? hit[0] : null;
  });
  eq(forLayer.filter(Boolean).length, CHAIN_LENGTH,
    'every one of the twenty-nine resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'twenty-one layers carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, LAYERS_WITHOUT_SEPARATOR,
    '…and the eight oldest have no separator concept at all');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…but only eighteen of the twenty-one pin a single RAW_CHARS one unit longer than MODULE_CHARS, '
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
  // The WHOLE identifier at that site, not a slice of CONSUMER_NAME.length —
  // which is what this assertion used to take, and so passed for any PREFIX of
  // the real name. The mutation pass caught it: 'fetchScannerEarning' survived.
  eq(BASE_CODE.slice(CONSUMER_SITE).match(/^[A-Za-z0-9_$]+/)[0], CONSUMER_NAME,
    'the site at 95,154 names fetchScannerEarnings, whole identifier and not a prefix');
  ok(/await fetchScannerEarnings\(/.test(BASE_CODE.slice(CONSUMER_SITE - 8, CONSUMER_SITE + 30)),
    '…as the real consumer: an awaited call');
  for (const at of DIAG_SITES) {
    ok(/^_scannerEarningsDiag/.test(BASE_CODE.slice(at, at + 20)),
      'the other three read _scannerEarningsDiag at ' + at);
  }
  // All three sit in ONE guarded expression, which is the claim worth making —
  // and the claim has to be made about the expression, not about each site.
  // Only the FIRST of the three is the `typeof` operand; the second and third
  // are the guarded uses that follow it. An assertion demanding `typeof` beside
  // each of them is simply false, and said so on the first run.
  {
    const span = BASE_CODE.slice(DIAG_SITES[0] - 10, DIAG_SITES[2] + 30);
    ok(/typeof _scannerEarningsDiag === 'object' && _scannerEarningsDiag\) \? _scannerEarningsDiag : \{\}/
      .test(span),
      'the three reads are one `(typeof … === \'object\' && …) ? … : {}` expression');
    eq(DIAG_SITES.filter((at) => span.indexOf('_scannerEarningsDiag',
      at - (DIAG_SITES[0] - 10)) === at - (DIAG_SITES[0] - 10)).length, DIAG_SITES.length,
      '…and all three of the recorded sites fall inside it');
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

  // 5. outbound dependency names — THE ONE DIRECTION THAT IS NOT ZERO.
  const local = locallyBound(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE));
  const deps = new Set();
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) deps.add(d.name);
  }
  eq(Array.from(deps).sort(), MONOLITH_DEPENDENCIES,
    'it names exactly ONE thing the monolith declares: fetchEarningsForTicker');

  // …and the distinction that makes that safe rather than merely tolerated:
  // every call site is INSIDE a function body, so none of them runs while the
  // module evaluates. §6 then proves the consequence in an empty VM.
  const depCalls = refSites(MASKED_MODULE, DEPENDENCY_NAME);
  ok(depCalls.length > 0, 'the dependency really is referenced from the module');
  const MODULE_FN_BODIES = functionBodyRanges(MODULE);
  ok(depCalls.every((i) => MODULE_FN_BODIES.some((r) => i >= r.start && i <= r.end)),
    '…and every reference to it sits inside a function body, never at evaluation time');

  // Is a runtime dependency NORMAL for this chain, or an exception? A question
  // about a set, so it is counted over the set.
  {
    const withDeps = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /boundary-contract\.test\.js$/.test(f))
      .filter((f) => {
        const m = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')
          .match(/^const MONOLITH_DEPENDENCIES = (\[[^;]*\]);$/m);
        return m && m[1].trim() !== '[]';
      });
    eq(withDeps.length, CONTRACTS_WITH_A_DEPENDENCY,
      'EIGHT shipped contracts now pin a non-empty MONOLITH_DEPENDENCIES, this one included');
    ok(withDeps.indexOf(path.basename(CONTRACT_REL)) >= 0, '…and this contract is one of them');
  }

  // …and the control, from the sibling that also depends.
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
  }

  // The sibling range is anchored to THIS layer's boundary, not carried as a
  // free-floating pair: candles ends exactly where this region begins. Without
  // this, a mutant moving either endpoint by one changed no answer and survived.
  eq(CANDLES[1], RAW_AT_IN_CODE, 'the candle sibling ends exactly where this region begins');
  // The candle region opens on a four-line `═══` box header, not a `──` banner
  // — which is why the screen's header-merge rule matters for it and not for
  // this one. Pinned by its TITLE line, the part a closing-rule cut would strand.
  eq(BASE_CODE.slice(CANDLES[0], BASE_CODE.indexOf('\n', CANDLES[0])),
    '// ═══════════════════════════════════════════════════════════════',
    '…and the candle region opens on a box-header rule');
  eq(BASE_CODE.split('\n')[BASE_CODE.slice(0, CANDLES[0]).split('\n').length],
    '// DATA FETCH — cascade TT → TD → AV → Yahoo',
    '…whose title line is what a closing-rule cut would have stranded');

  // WHY THE FAMILY WAS NOT TAKEN WHOLE. The mirror siblings are contiguous and
  // written as copies of each other, so taking them together looked obvious. It
  // buys nothing, and this is the reason: neither references the other, so every
  // reference stays external however they are grouped.
  {
    const namesOf = (r) => ALL_DECLS.filter((d) => d.start >= r[0] && d.end < r[1]).map((d) => d.name);
    const HERE = [RAW_AT_IN_CODE, RAW_END_IN_CODE];
    for (const [from, fr, to, tr] of [['candles', CANDLES, 'earnings', HERE],
                                      ['earnings', HERE, 'candles', CANDLES]]) {
      let crossing = 0;
      for (const n of namesOf(fr)) {
        crossing += refSites(MASKED, n).filter((i) => i >= tr[0] && i < tr[1]).length;
      }
      eq(crossing, 0, from + ' is never named from inside ' + to);
    }
    ok(namesOf(CANDLES).length > 0, 'control — the candle sibling does own names that could have crossed');
  }

  // 6. sibling modules, guarded against the `field` confound #442 found
  let sib = 0;
  for (const n of names) for (const s of SIBLINGS) if (!s.bound.has(n)) sib += refSites(s.masked, n).length;
  eq(sib, SIBLING_REFERENCES, 'none of the seventy-one sibling modules names it');
  eq(SIBLINGS.length, LOCAL_SCRIPT_COUNT - 1, '…and there are seventy-one of them to have named it');

  // 7. static markup, and generated markup
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
  // THE POINT OF THIS SECTION, for this layer specifically: it carries a
  // monolith dependency and STILL loads with nothing defined around it.
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining eleven globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.map((d) => d.name).sort(), '…exactly its own owners');
  ok(!(DEPENDENCY_NAME in ctx),
    '…and fetchEarningsForTicker is NOT among them: the dependency is called, never defined');
  eq(typeof ctx.fetchScannerEarnings, 'function', 'the entry point is there');
  eq(ctx._scannerEarningsActive, 0, 'the queue starts idle');
  eq(ctx._scannerEarningsCacheKey('AAPL'), ctx._scannerEarningsCacheKey('AAPL'),
    'the cache key is deterministic');
  ok(ctx._scannerEarningsCacheKey('AAPL') !== ctx._scannerEarningsCacheKey('MSFT'),
    '…and distinguishes tickers');

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
  throwsWith(() => UNDO.undoScannerEarningsThrottle(null, MODULE),
    'SCANNER_EARNINGS_UNDO_BAD_INPUT', 'a non-string document is refused');
  throwsWith(() => UNDO.undoScannerEarningsThrottle(INDEX, null),
    'SCANNER_EARNINGS_UNDO_BAD_INPUT', '…and a non-string module');
  throwsWith(() => UNDO.undoScannerEarningsThrottle(INDEX, MODULE.slice(0, -1)),
    'SCANNER_EARNINGS_UNDO_MODULE_IDENTITY', 'a truncated module is refused');
  // WHICH GUARD ACTUALLY CATCHES A RE-ABSORBED SEPARATOR, measured rather than
  // assumed. A module carrying the separator is 4,882 units with 96 line feeds,
  // so the SIZE guard fires first and MODULE_SEPARATOR never sees it. The
  // `endsWith('\n\n')` clause beside it is therefore unreachable without also
  // failing size — the undo helper's header records it as one of the clauses
  // kept for naming their failure rather than for being load-bearing.
  throwsWith(() => UNDO.undoScannerEarningsThrottle(INDEX, MODULE + '\n'),
    'SCANNER_EARNINGS_UNDO_MODULE_IDENTITY',
    'a module that re-absorbed the separator is caught by SIZE, not by the separator clause');
  eq((MODULE + '\n').length, UNDO.MODULE_CHARS + 1, '…because it is one unit too long');
  eq(((MODULE + '\n').match(/\n/g) || []).length, UNDO.MODULE_LF + 1, '…and carries one line feed too many');
  {
    const swapped = MODULE.slice(0, -2) + 'x\n';
    throwsWith(() => UNDO.undoScannerEarningsThrottle(INDEX, swapped),
      'SCANNER_EARNINGS_UNDO_MODULE_SEPARATOR', 'a module not ending `}\\n` is refused');
  }
  throwsWith(() => UNDO.undoScannerEarningsThrottle(BASE, MODULE),
    'SCANNER_EARNINGS_UNDO_TAG_IDENTITY', 'an already-unextracted document is refused');
  {
    const doubled = INDEX.replace(TAG, TAG + TAG);
    throwsWith(() => UNDO.undoScannerEarningsThrottle(doubled, MODULE),
      'SCANNER_EARNINGS_UNDO_TAG_IDENTITY', 'a duplicated tag is refused');
  }
  {
    const moved = INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG);
    throwsWith(() => UNDO.undoScannerEarningsThrottle(moved, MODULE),
      'SCANNER_EARNINGS_UNDO_TAG_ADJACENCY', 'a reordered tag is refused');
  }
  {
    const padded = INDEX.replace(INLINE_OPEN, '<!-- x -->' + INLINE_OPEN);
    throwsWith(() => UNDO.undoScannerEarningsThrottle(padded, MODULE),
      'SCANNER_EARNINGS_UNDO_TAG_ADJACENCY', 'content wedged between the tag and the monolith is refused');
  }
  {
    const foreign = INDEX.replace('</body>', '<!-- foreign --></body>');
    throwsWith(() => UNDO.undoScannerEarningsThrottle(foreign, MODULE),
      'SCANNER_EARNINGS_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  }
  // The round trip, which is the whole point of the helper.
  eq(UNDO.undoScannerEarningsThrottle(INDEX, MODULE), BASE,
    'and the accepted path reconstructs the base exactly');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  // A LATER LAYER HAS LANDED SINCE THIS ONE, so the footprint since THIS layer's
  // base carries the module #449 cut as well. Re-terminated each time the chain
  // grows, rather than loosened to a prefix match that would stop noticing.
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', MODULE_REL, 'js/ui/chart-interactions.js'].sort(),
    'production footprint is index.html, this module, and the layer cut after it');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so a mutant that
  // renamed this constant survived the first pass in an earlier cycle. The name
  // has to be the one the base actually carried.
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit’s mutation spec is gone with the audit it targeted');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely a path that does not exist');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '',
    '…as is the audit\'s own path');
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), '…replaced by one for this contract');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite matches the pin above, which a new Phase 1 audit ratchets by one');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'js/ui/chart-interactions.js' ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('SCANNER_EARNINGS_THROTTLE_BOUNDARY_OK');
