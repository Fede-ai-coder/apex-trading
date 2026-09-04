'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO ALIGNMENT + ROW TRAFFIC LIGHT — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// THE RESULT IS A JOINT CUT, AND THE ARGUMENT IS THE SPLIT COST.
//
// The corrected screen offers these two adjacent regions, each of which looks
// like a candidate on its own:
//
//     PORTFOLIO DIRECTIONAL ALIGNMENT ENGINE   [991380,1011292)   19,912 units
//     PORTFOLIO ROW TRAFFIC LIGHT — helpers    [1011292,1063192)  51,900 units
//
// They are mutually recursive across that boundary. The alignment engine calls
// SEVEN of the traffic light's owners; the traffic light calls THREE of the
// alignment engine's. Cutting between them is what is expensive:
//
//     taken separately   16 external executable edges over 13 names
//     taken together      6 external executable edges over  3 names
//
// So the boundary this audit publishes spans a `// ══` feature header. The
// shipped history already contains a region that spans a `// ── ` section
// banner — journal-trade-detail, pinned in §5 of the seam contract — so this is
// not a new kind of boundary; it is the same lesson at header level. How many
// other recorded boundaries span a mark of either kind is NOT measured here,
// and no ordinal is claimed.
//
// WHY IT CAN BE TAKEN AT ALL. `evaluationTimeReads` returns the EMPTY LIST: the
// region is 26 top-level declarations and not one line of top-level statement,
// so nothing runs at load and nothing can be read at load. It depends on 17
// names the monolith declares — `S` among them, the `const` that disqualified
// the swing block — but every one of the references sits inside a declaration
// and resolves at call time. §7 measures the distinction rather than asserting
// it, because it is the whole reason the swing block was rejected and this
// region is not.
//
// SIZE IS NOT THE CRITERION AND IS NOT THE ARGUMENT. Coupling is. The size is
// recorded because it is measured: at 71,811 units this region is larger than
// any single module the programme has shipped (the largest is js/ui/journal-ui.js
// at 54,513) and is 21.7% of all eighteen combined. No claim is made about
// regions this screen did not measure.
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
const {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, bindingNames, evaluationTimeReads,
} = require('./lib/extraction-boundary.js');

// ── The base this audit measures ─────────────────────────────────────────────
const BASE_SHA = '754e41c7a943929d014af76ff2ba27a65799db9c';
const BASE_CHARS = 1715096;
const BASE_SHA256 = '6592efa65f0d71ab12fce84e31ea6acf0f9f1868066107d87b16e2711f9376de';
const CODE_AT = 113514;
const CODE_CHARS = 1601556;
const LOCAL_SCRIPT_COUNT = 62;
// This audit is the 146th file. Phase 2 replaces it one for one and the count
// returns to what the eight permanent contracts pin today.
const TEST_FILE_COUNT = 146;

// ── The region, as a judgement ───────────────────────────────────────────────
// Monolith coordinates. RAW_AT is the column-0 `// ══` header that opens the
// alignment engine; RAW_END is the first unit of the `// ── ADD POSITION FORM`
// banner that opens the next feature.
const RAW_AT = 991380;
const RAW_END = 1063192;
const RAW_CHARS = 71812;
const BODY_END = 1063191;
const MODULE_CHARS = 71811;
const MODULE_SHA256 = 'c95f8156e0dacd67360e0f0410cc9bd6db00b401664305b59b2bea82a64da1fb';
const OWNER_COUNT = 26;
const OWNER_SPAN_SUM = 67659;
// The header the region spans, which is why no banner rule finds this boundary.
const SPANNED_HEADER_AT = 1011292;

// ── What the screen saw ──────────────────────────────────────────────────────
const TOP_LEVEL_BANNERS = 198;
const SCREEN_FLOOR = 8000;
const SCREENED_REGIONS = 47;

// ── Coupling, both directions ────────────────────────────────────────────────
const EXTERNAL_EDGES = { _pfUpdateAlignment: 1, _pfRefreshAllRowTrafficLights: 4,
  _pfComputeAndRenderRowTrafficLight: 1 };
const EXTERNAL_EDGE_TOTAL = 6;
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
// The one binding the region writes without owning. Both writes are BY KEY on a
// cache object the monolith declares, not rebindings of the name.
const OUTBOUND_BINDING = '_pfAlignmentCache';
const OUTBOUND_WRITES = 2;
const OUTBOUND_DECLARED_AT = 935029;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The split, which is the point ────────────────────────────────────────────
const SPLIT_AT = 1011292;
const ALIGNMENT_CHARS = 19912;
const ALIGNMENT_OWNERS = 5;
const ALIGNMENT_EDGES = 4;
const TRAFFIC_CHARS = 51900;
const TRAFFIC_OWNERS = 21;
const TRAFFIC_EDGES = 12;
const SPLIT_EDGE_TOTAL = 16;
const SPLIT_EDGE_NAMES = 13;

// ── Dependencies ─────────────────────────────────────────────────────────────
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
const INDICATORS_POSITION = 1;
const OPTION_SYMBOLS_POSITION = 2;
const MODULE_POSITION = 63;
const VM_GLOBALS = 26;

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/portfolio/portfolio-traffic-light.js';
const TAG = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>\n';
const TAG_CHARS = 66;
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>\n';
const EXTRACTED_CHARS = 1643350;
const EXTRACTED_SHA256 = '63dbe633ddb5edaa2a2343c161120b78275eac20a0bfc41b1f1fa1bd6127206f';
const LARGEST_SHIPPED = 'js/ui/journal-ui.js';
const LARGEST_SHIPPED_CHARS = 54513;
const SHIPPED_TOTAL_CHARS = 330611;
const SHIPPED_LAYERS = 18;
// The eighteen extracted layers, oldest first — the set both size claims in
// this file's header quantify over.
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
];

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

console.log('PORTFOLIO ALIGNMENT + ROW TRAFFIC LIGHT — TEMPORARY BOUNDARY AUDIT');

const INDEX = APP_LOADER.loadIndexHtml();
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const VIEWS = lexicalViews(CODE);
const BODY = CODE.slice(RAW_AT, BODY_END);
const OWNERS = scanTopLevelDeclarations(BODY);
const OWNED = new Set(OWNERS.map((d) => d.name));

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(Array.from(INDEX).length, BASE_CHARS, 'index.html is 1,715,096 units');
eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned digest');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at the pinned offset');
eq(Array.from(CODE).length, CODE_CHARS, '…and is 1,601,556 units');
eq(TAGS.filter((t) => !t.src && t.inline.length > 1000).length, 1, 'there is exactly ONE inline monolith');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-two local scripts precede it');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 146 files — this audit is the one that was added');
eq(git(['diff', '--name-only', '--diff-filter=A', BASE_SHA]).split('\n').filter(Boolean),
  ['tests/temporary-portfolio-traffic-light-boundary-audit.test.js'],
  '…and it is the ONLY file this PR adds');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The screen, run with the corrected rules');
// ─────────────────────────────────────────────────────────────────────────────
{
  const marks = topLevelBanners(CODE, functionBodyRanges(CODE));
  eq(marks.length, TOP_LEVEL_BANNERS, '198 banners sit at top level');
  // Control: the rule really does exclude function bodies. Widening to every
  // mark regardless of nesting must produce MORE, or the filter does nothing.
  const all = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m; while ((m = re.exec(CODE))) all.push(m.index);
  }
  ok(all.length > marks.length,
    'control — the unfiltered count is strictly larger, so the top-level filter is doing work');
  eq(marks.indexOf(RAW_AT) >= 0, true, 'the chosen region opens on one of them');
  eq(marks.indexOf(SPANNED_HEADER_AT) >= 0, true, '…and SPANS another one');
  ok(marks.indexOf(SPANNED_HEADER_AT) === marks.indexOf(RAW_AT) + 2,
    '…which is two marks later, with the engine body between them');

  let screened = 0;
  for (let i = 0; i < marks.length; i++) {
    const end = (i + 1 < marks.length ? marks[i + 1] : CODE.length);
    if (end - marks[i] >= SCREEN_FLOOR) screened++;
  }
  eq(screened, SCREENED_REGIONS, '47 banner-to-banner regions clear the 8,000-unit floor');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary is a judgement — this one spans a header');
// ─────────────────────────────────────────────────────────────────────────────
{
  // A banner rule would stop at the spanned header and cut the feature in two.
  // Recorded here for the same reason journal-trade-detail is recorded: it is
  // a counterexample to a rule someone will try to write again.
  ok(SPANNED_HEADER_AT > RAW_AT && SPANNED_HEADER_AT < BODY_END,
    'a `// ══` feature header sits INSIDE the chosen region');
  eq(CODE.slice(SPANNED_HEADER_AT, CODE.indexOf('\n', SPANNED_HEADER_AT)).indexOf('// ══'), 0,
    '…and it is a real header, at column 0');
  ok(CODE.slice(SPANNED_HEADER_AT, SPANNED_HEADER_AT + 200).indexOf('PORTFOLIO ROW TRAFFIC LIGHT') > 0,
    '…naming the second half of the feature');

  // The seam itself IS mechanical, and the shared guard accepts it.
  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END,
    'snapBodyEnd lands one unit short of the next banner — the trailing blank line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END,
    'assertSeam accepts the boundary and resumes at the next feature');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 71,812 units');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 71,811');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  ok(CODE.slice(RAW_END, RAW_END + 80).indexOf('ADD POSITION FORM') > 0,
    'what follows the seam is a different feature');

  // Controls: the guard rejects the boundaries a careless Phase 2 would pick.
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, BODY_END - 1),
    'EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED', 'control — a body one unit short is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending to the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The twenty-six owners');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares twenty-six names at top level');
  eq(OWNERS.reduce((a, d) => a + d.chars, 0), OWNER_SPAN_SUM,
    '…spanning 67,659 units, so 4,152 units are comment and blank line');
  eq(OWNERS.filter((d) => d.form === 'var').map((d) => d.name), ['VOL_DELTA_TOLERANCE'],
    'exactly one is a binding rather than a function');
  eq(OWNERS.filter((d) => d.isAsync).length, 0, 'not one owner is async');
  eq((BODY.match(/\basync function\b/g) || []).length, 0,
    '…confirmed textually, not only by the scanner');
  eq(OWNERS.filter((d) => d.form === 'function').length, OWNER_COUNT - 1,
    'the other twenty-five are function declarations');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling, measured in BOTH directions');
// ─────────────────────────────────────────────────────────────────────────────
{
  const edges = {};
  let total = 0;
  for (const n of OWNED) {
    for (const p of refSites(VIEWS.code, n)) {
      if (p < RAW_AT || p >= BODY_END) { edges[n] = (edges[n] || 0) + 1; total++; }
    }
  }
  eq(edges, EXTERNAL_EDGES, 'six external executable edges, over three names');
  eq(total, EXTERNAL_EDGE_TOTAL, '…six references in total');

  // Every one at call time. An edge at evaluation time would run before the
  // module exists and is the failure this metric is for.
  const spans = scanTopLevelDeclarations(CODE).map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  let evalTime = 0;
  for (const n of Object.keys(EXTERNAL_EDGES)) {
    for (const p of refSites(VIEWS.code, n)) if ((p < RAW_AT || p >= BODY_END) && outside(p)) evalTime++;
  }
  eq(evalTime, 0, 'every one of the six sits inside a declaration — call time');

  // Nothing is reached through generated markup, the edge an executable count
  // cannot see. Manual expiry had exactly one; this region has none.
  let markup = 0;
  for (const n of OWNED) {
    for (const p of refSites(VIEWS.strings, n)) if (p < RAW_AT || p >= BODY_END) markup++;
  }
  eq(markup, MARKUP_REFERENCES, 'no owner is named inside a string the monolith builds');
  // Control: the string view is not simply empty.
  ok(refSites(VIEWS.strings, 'onclick').length > 0,
    'control — the string view does contain markup, so the zero above is a measurement');

  // Controls for the write detector itself. Every write this region performs is
  // BY KEY, so the direct-assignment branch is never exercised by the real data
  // and the inbound zero below would survive a detector that had lost it. These
  // pin both branches, and the two shapes that must NOT count.
  eq(isWriteAt('x = 1;', 0, 'x'), true, 'control — a direct assignment counts');
  eq(isWriteAt('x[k] = 1;', 0, 'x'), true, 'control — a keyed assignment counts');
  eq(isWriteAt('x === y;', 0, 'x'), false, 'control — a comparison does not');
  eq(isWriteAt('f(x);', 2, 'x'), false, 'control — an argument does not');

  // INBOUND: writes from outside into a binding the region owns.
  const ownedBindings = new Set(bindingNames(OWNERS));
  eq(Array.from(ownedBindings), ['VOL_DELTA_TOLERANCE'], 'the region owns one binding');
  let inbound = 0;
  for (const n of ownedBindings) {
    for (const p of refSites(VIEWS.code, n)) {
      if ((p < RAW_AT || p >= BODY_END) && isWriteAt(VIEWS.code, p, n)) inbound++;
    }
  }
  eq(inbound, INBOUND_WRITES, 'nothing outside writes it');

  // OUTBOUND: writes from inside to a binding the region does NOT own. This is
  // the direction that disqualified the swing candidate, so it is scanned over
  // var, const AND let, which is what the shared helper enforces.
  const monolithBindings = new Set(bindingNames(scanTopLevelDeclarations(CODE)));
  ok(monolithBindings.has('S'), 'control — the binding set includes the const S, so it is not var-only');
  const bodyMasked = VIEWS.code.slice(RAW_AT, BODY_END);
  const outbound = {};
  let outboundTotal = 0;
  for (const n of monolithBindings) {
    if (ownedBindings.has(n)) continue;
    for (const p of refSites(bodyMasked, n)) {
      if (isWriteAt(bodyMasked, p, n)) { outbound[n] = (outbound[n] || 0) + 1; outboundTotal++; }
    }
  }
  eq(Object.keys(outbound), [OUTBOUND_BINDING], 'it writes exactly one binding it does not own');
  eq(outboundTotal, OUTBOUND_WRITES, '…twice');
  // And what those writes ARE matters: both set a key on a cache object the
  // monolith declares. Neither rebinds the name, so the module never needs the
  // binding to exist at load — only when the function runs.
  const writes = refSites(bodyMasked, OUTBOUND_BINDING)
    .filter((p) => isWriteAt(bodyMasked, p, OUTBOUND_BINDING))
    .map((p) => BODY.slice(p, p + OUTBOUND_BINDING.length + 2));
  eq(writes.map((w) => w.slice(OUTBOUND_BINDING.length, OUTBOUND_BINDING.length + 1)), ['[', '['],
    'both writes are BY KEY, not rebindings of the name');
  const declared = scanTopLevelDeclarations(CODE).filter((d) => d.name === OUTBOUND_BINDING);
  eq(declared.length, 1, 'the cache is declared exactly once in the monolith');
  eq(declared[0].start, OUTBOUND_DECLARED_AT, '…outside this region, and it stays there');
  ok(declared[0].start < RAW_AT, '…before it, in the inline chart state section');

  // No top-level statements at all.
  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'the region is declarations only — zero top-level statement lines');
  // Control: the counter is not stuck at zero.
  ok(statementLines(CODE, scanTopLevelDeclarations(CODE)).length > 0,
    'control — the same counter finds statements in the monolith as a whole');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. THE SPLIT IS THE EXPENSIVE PART — the audit’s actual finding');
// ─────────────────────────────────────────────────────────────────────────────
{
  // Measure each half exactly as §5 measured the whole, and compare.
  function halfEdges(at, end) {
    const decls = scanTopLevelDeclarations(CODE.slice(at, end));
    const names = new Set(decls.map((d) => d.name));
    const seen = {};
    let total = 0;
    for (const n of names) {
      for (const p of refSites(VIEWS.code, n)) {
        if (p < at || p >= end) { seen[n] = (seen[n] || 0) + 1; total++; }
      }
    }
    return { owners: decls.length, names: Object.keys(seen).length, total, chars: end - at };
  }
  const A = halfEdges(RAW_AT, SPLIT_AT);
  const B = halfEdges(SPLIT_AT, RAW_END);

  eq(A.chars, ALIGNMENT_CHARS, 'the alignment engine alone is 19,912 units');
  eq(A.owners, ALIGNMENT_OWNERS, '…five owners');
  eq(A.total, ALIGNMENT_EDGES, '…and four external edges');
  eq(B.chars, TRAFFIC_CHARS, 'the traffic light alone is 51,900 units');
  eq(B.owners, TRAFFIC_OWNERS, '…twenty-one owners');
  eq(B.total, TRAFFIC_EDGES, '…and twelve external edges');
  eq(A.owners + B.owners, OWNER_COUNT, 'the two halves account for every owner');
  eq(A.chars + B.chars, RAW_CHARS, '…and for every unit');

  eq(A.total + B.total, SPLIT_EDGE_TOTAL, 'split, the pair costs SIXTEEN edges');
  eq(A.names + B.names, SPLIT_EDGE_NAMES, '…over thirteen distinct names');
  eq(EXTERNAL_EDGE_TOTAL, 6, 'together, it costs six');
  eq(Object.keys(EXTERNAL_EDGES).length, 3, '…over three');
  ok(A.total + B.total > EXTERNAL_EDGE_TOTAL * 2,
    'the split costs more than twice the joint cut, which is why they go together');

  // And the reason, MEASURED rather than subtracted: the edges that disappear
  // are calls that cross the split point, in both directions.
  function crossings(fromAt, fromEnd, intoAt, intoEnd) {
    const names = new Set(scanTopLevelDeclarations(CODE.slice(fromAt, fromEnd)).map((d) => d.name));
    let n = 0;
    for (const name of names) {
      for (const p of refSites(VIEWS.code, name)) if (p >= intoAt && p < intoEnd) n++;
    }
    return n;
  }
  const aCalledFromB = crossings(RAW_AT, SPLIT_AT, SPLIT_AT, RAW_END);
  const bCalledFromA = crossings(SPLIT_AT, RAW_END, RAW_AT, SPLIT_AT);
  eq(aCalledFromB, 3, 'the traffic light calls three of the alignment engine’s owners');
  eq(bCalledFromA, 7, '…and the alignment engine calls seven of the traffic light’s');
  eq(aCalledFromB + bCalledFromA, SPLIT_EDGE_TOTAL - EXTERNAL_EDGE_TOTAL,
    'and those crossings are exactly the ten edges the joint cut removes');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Can it be a module — the test the swing block failed');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(BODY, OWNERS, maskLiterals), [],
    'NOTHING is read at evaluation time — the list is empty');
  // A metric whose true value is the empty list needs an input where it is not.
  const probe = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals),
    ['elsewhere', 'window'], 'control — on a region that DOES read at load, the same call reports it');

  // It depends on seventeen monolith names, S among them, all at call time.
  const monolith = new Map(scanTopLevelDeclarations(CODE).map((d) => [d.name, d.form]));
  const masked = maskLiterals(BODY);
  const referenced = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) if (!OWNED.has(m[2])) referenced.add(m[2]);
  const fromMonolith = Array.from(referenced).filter((n) => monolith.has(n)).sort();
  eq(fromMonolith, MONOLITH_DEPENDENCIES, 'it depends on exactly these seventeen monolith names');
  eq(monolith.get('S'), 'const', 'S among them is the const that cannot be supplied by a module');
  ok(fromMonolith.indexOf('S') >= 0,
    '…and this region does depend on it — the difference from swing is WHEN, not WHETHER');

  // Sibling modules, and the load order that makes them safe. #423 shipped a
  // module whose sibling dependencies nothing pinned; this records them first.
  const fromModules = {};
  for (const rel of LOCALS) {
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, SIBLING_DEPENDENCIES, 'and on three names from two sibling modules');
  eq(LOCALS.indexOf('js/utils/indicators.js') + 1, INDICATORS_POSITION, 'indicators loads first');
  eq(LOCALS.indexOf('js/utils/option-symbols.js') + 1, OPTION_SYMBOLS_POSITION, 'option-symbols second');
  eq(LOCAL_SCRIPT_COUNT + 1, MODULE_POSITION, 'the new module would load 63rd — after both');

  // The load itself, in a completely empty VM.
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(BODY, sandbox, { filename: MODULE_REL });
  eq(Object.keys(sandbox).length, VM_GLOBALS, 'it loads bare and defines its twenty-six names');
  eq(Object.keys(sandbox).sort(), Array.from(OWNED).sort(), '…exactly the owners, nothing more');
  eq(typeof sandbox.computePortfolioRowTrafficLight, 'function',
    '…and they are callable, not just present');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The extraction Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag is 66 units');
  ok(INDEX.indexOf(ANCHOR_TAG) > 0, 'the anchor tag — the newest layer — is present');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT present: this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');

  const at = INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const withTag = INDEX.slice(0, at) + TAG + INDEX.slice(at);
  const raw = CODE.slice(RAW_AT, RAW_END);
  eq(withTag.split(raw).length - 1, 1, 'the raw block occurs exactly once in the document');
  const extracted = withTag.replace(raw, '');
  eq(Array.from(extracted).length, EXTRACTED_CHARS, 'index.html would become 1,643,350 units');
  eq(sha256(extracted), EXTRACTED_SHA256, '…hashing to the digest Phase 2 must match');
  eq(BASE_CHARS - EXTRACTED_CHARS, RAW_CHARS - TAG_CHARS, 'the arithmetic closes: 71,812 out, 66 in');
  eq(APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src)).length,
    MODULE_POSITION, 'sixty-three local scripts afterwards');

  // The round trip, modelled: putting the bytes back reproduces the base exactly.
  const restored = extracted.replace(TAG, '');
  const back = restored.slice(0, CODE_AT + RAW_AT) + raw + restored.slice(CODE_AT + RAW_AT);
  eq(sha256(back), BASE_SHA256, 'and the reverse transform reproduces the base byte for byte');

  // Size, recorded because measured — not offered as the reason. Both claims
  // in this file's header quantify over the whole chain, so both are counted
  // over the whole chain rather than over the layers nearest to hand.
  const sizes = CHAIN.map((rel) => Array.from(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length);
  eq(CHAIN.length, SHIPPED_LAYERS, 'eighteen layers have shipped');
  eq(Math.max.apply(null, sizes), LARGEST_SHIPPED_CHARS, 'the largest of them is 54,513 units');
  eq(CHAIN[sizes.indexOf(Math.max.apply(null, sizes))], LARGEST_SHIPPED,
    '…and it is js/ui/journal-ui.js');
  ok(MODULE_CHARS > LARGEST_SHIPPED_CHARS, 'this region is larger than any of them');
  eq(sizes.reduce((a, b) => a + b, 0), SHIPPED_TOTAL_CHARS, 'the eighteen total 330,611 units');
  eq((MODULE_CHARS / SHIPPED_TOTAL_CHARS * 100).toFixed(1), '21.7',
    '…so this one region is 21.7% of everything extracted so far');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  // NOT `HEAD === BASE_SHA`: the audit commit sits ON TOP of the base, so that
  // holds only in the working tree before committing — which is exactly when it
  // was first run, and why it passed locally and failed in CI. What is true at
  // every point after the commit is that the base is an ancestor.
  const isAncestor = (a, b) => {
    try { git(['merge-base', '--is-ancestor', a, b]); return true; } catch (e) { return false; }
  };
  ok(isAncestor(BASE_SHA, 'HEAD'), 'the pinned base is an ancestor of HEAD');
  eq(isAncestor('HEAD', BASE_SHA), false,
    'control — the relation is directional, so the check is not vacuously true');
  const changed = git(['diff', '--name-only', BASE_SHA]).split('\n').filter(Boolean);
  eq(changed.filter((f) => !/^tests\//.test(f)), [],
    'not one file outside tests/ differs from the base');
  eq(git(['show', BASE_SHA + ':index.html']), INDEX, 'index.html is byte-identical to the base');
  for (const rel of LOCALS) {
    eq(git(['show', BASE_SHA + ':' + rel]), fs.readFileSync(path.join(ROOT, rel), 'utf8'),
      rel + ' is byte-identical to the base');
  }
}

console.log('\n' + pass + ' assertions passed.');
