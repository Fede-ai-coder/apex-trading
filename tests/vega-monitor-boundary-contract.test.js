'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// VEGA MONITOR RATIOS — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #442 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/vega-monitor-undo.js reconstructs
// the pre-extraction document byte for byte, and §8 asserts the production
// footprint is index.html plus the one new file.
//
// WHAT MOVED. [891660,893422) in monolith coordinates — 1,762 units: 1,220 of
// header, one function of 540, one closing newline. It is the SMALLEST module
// in the chain by a wide margin (the next is journal-migration at 4,461) and
// the FIFTH with a single owner. §4 measures both over all twenty-six.
//
// ONE REFERENCE IN THE ENTIRE APPLICATION. A single call inside
// renderPositionsPanel. Nothing else in the monolith names it, none of the
// sixty-nine sibling modules does, and neither does the generated markup — the
// property that put it first on a screen counting five directions, and the
// reason this layer is as close to free as the programme has had.
//
// THE INBOUND ZERO IS A MEASUREMENT, AND SAYING SO CORRECTLY IS THE POINT.
// `bindingNames` returns the empty list here, because BINDING_FORMS is
// ['var','const','let'] and this owner is a function declaration. Audit #442
// measured what that omission costs: `function f(){}; f = 42;` leaves f === 42,
// so a function declaration is an assignable binding and an outside write to it
// is legal. FOUR shipped contracts read that empty list as "owns no binding for
// a write to reach" and call their inbound zero VACUOUS.
//
// This contract does not repeat that. §5 proves the assignability in a VM,
// asserts that bindingNames is silent about it, and only then reports the zero
// — as a measurement over a region where a write was possible. Fixing the four
// contracts and BINDING_FORMS itself is a separate change; what is fixed here
// is that the newest layer does not add a fifth instance.
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
  topLevelBanners, bindingNames, BINDING_FORMS, evaluationTimeReads,
} = require('./lib/extraction-boundary.js');
const UNDO = require('./lib/vega-monitor-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-vega-monitor.js';
const TAG = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/config/strategy-templates.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '6fb7acadf9ad2615e00e673487d208606a5143f3';
const CONTRACT_REL = 'tests/vega-monitor-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/vega-monitor-undo.js';
const AUDIT_REL = 'tests/temporary-vega-monitor-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/vega-monitor-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/vega-monitor-contract.spec.js';

// The suite does NOT ratchet: the audit leaves as this contract arrives.
const TEST_FILE_COUNT = 154;
const LOCAL_SCRIPT_COUNT = 70;
const MODULE_POSITION = 69;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 113964;
const CODE_CHARS = 1455889;
const RAW_AT_IN_CODE = 891660;
const RAW_END_IN_CODE = 893422;
const BODY_END_IN_CODE = 893421;
const TOP_LEVEL_BANNERS = 183;
const RESIDUAL_MONOLITH = 1454127;
const TAG_GAP = 891668;

// ── The one owner ────────────────────────────────────────────────────────────
const OWNERS_EXPECTED = [
  { name: 'computeVegaMonitorRatios', form: 'function', start: 1220, chars: 540 },
];
const OWNER_COUNT = 1;
const BODY_ENDING = '}\n';

// ── Coupling, in every direction the screen counts ───────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [914871];
const EDGE_ENCLOSING = 'renderPositionsPanel';
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = [];
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;
const APPLICATION_REFERENCES = 1;
const VM_GLOBALS = 1;
const MONOLITH_DECLS_MIN = 900;

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
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
];
const CHAIN_LENGTH = 26;
const SMALLEST_MODULE = MODULE_REL;
const SECOND_SMALLEST = 'js/services/journal-migration.js';
const SECOND_SMALLEST_CHARS = 4461;
const SINGLE_OWNER_LAYERS = 5;
const LAYERS_ENDING_BRACE = 23;
// The reconstruction bridge states these two in prose, and this cycle restated
// them. Nothing executed either, which is how "the eighteen newest" survives a
// cycle that makes it nineteen. They are measurements now.
const LAYERS_WITH_SEPARATOR = 18;
const LAYERS_WITH_RAW_PAIR = 15;

// ── The bindingNames gap this layer must not repeat ──────────────────────────
const BINDING_FORMS_EXPECTED = ['var', 'const', 'let'];
const VACUITY_CLAIM_CONTRACTS = [
  'tests/journal-rich-snapshot-boundary-contract.test.js',
  'tests/journal-snapshot-prefetch-boundary-contract.test.js',
  'tests/portfolio-backend-candles-boundary-contract.test.js',
  'tests/portfolio-dxlink-greeks-boundary-contract.test.js',
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
// Names a source binds itself, at any nesting. Over-collecting is the safe
// direction: it can only drop a sibling reference, never invent one. The same
// scan audit #442 introduced after `field` was counted as a monolith call.
function locallyBound(src) {
  const out = new Set();
  let m;
  const decl = /\b(?:var|let|const|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = decl.exec(src))) out.add(m[1]);
  const params = /\bfunction\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m = params.exec(src))) {
    for (const p of m[1].split(',')) {
      const n = p.trim().replace(/=.*$/, '').trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) out.add(n);
    }
  }
  return out;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('VEGA MONITOR RATIOS — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited #442 · base=' + BASE_SHA.slice(0, 7));

// This is the NEWEST layer, so the live document is the one it shipped: there
// is nothing on top to peel. When a later layer lands it goes here, first.
const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// The BASE document, reached through the undo rather than re-read from git, so
// every coordinate below is proved by the reconstruction that shipped.
const BASE = UNDO.undoVegaMonitor(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const VIEWS = lexicalViews(BASE_CODE);
const ALL_DECLS = scanTopLevelDeclarations(BASE_CODE);
const MONOLITH_OWNED = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const OWNERS = scanTopLevelDeclarations(MODULE);
const MASKED_MODULE = maskLiterals(MODULE);
const MARKS = topLevelBanners(BASE_CODE, FN_BODIES);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,568,182 units');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,597,962 bytes');
eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…27,291 line feeds');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'seventy local scripts');
eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last, at index 69 — the 70th');
eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
  '…immediately after the strategy-templates anchor and immediately before the inline monolith');
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the pinned base carries the pre-extraction index.html');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…byte for byte');
  // PIN THE BASE BY SOMETHING ONLY IT HAS. #442 was an audit and changed
  // nothing outside tests/, so index.html is byte-identical at this commit and
  // at its parent — a mutant swapping one for the other survives every hash
  // above. That gap now appears on every Phase 2, by construction. The
  // discriminator is the audit this contract retires.
  const parent = git(['rev-parse', BASE_SHA + '^']).trim();
  eq(git(['show', parent + ':index.html']), fromGit,
    'the parent commit carries the SAME index.html — which is why the hashes cannot pin the base');
  ok(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]) === '',
    '…so the base is pinned by the audit #442 added');
  assert.throws(() => git(['cat-file', '-e', parent + ':' + AUDIT_REL]),
    'control — its parent does NOT carry that file, so the two commits are told apart');
  pass++;
}
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 154 files — unchanged, the audit left as this contract arrived');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the inline monolith begins at 113964 in the base');
  eq(BASE_CODE.length, CODE_CHARS, '…and ran 1,455,889 units');
  const raw = BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(raw.length, UNDO.RAW_CHARS, 'the raw block is 1,762 units');
  eq(sha256(raw), UNDO.RAW_SHA256, '…hashing to the pinned digest');
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 1,761');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…1,861 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…31 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the pinned module digest');
  eq(MODULE, raw.slice(0, -1), 'the module is the block minus its final LF — byte for byte');
  eq(raw, MODULE + UNDO.SEPARATOR, '…and the block is the module plus the structural separator');
  eq(CODE_AT + RAW_AT_IN_CODE, UNDO.RAW_AT, 'the document offset is the monolith offset plus 113964');
  eq(CODE_AT + RAW_END_IN_CODE, UNDO.RAW_END, '…and so is its end');
  eq(UNDO.SEPARATOR_AT, UNDO.RAW_END - 1, 'the separator is the last unit of the block');
  eq(MODULE.slice(-2), BODY_ENDING, 'the module ends on a closing brace and a newline');
  ok(!MODULE.endsWith('\n\n'), '…and not on a blank line');

  ok(INDEX.indexOf(TAG) < UNDO.RAW_AT, 'the tag sits before the fragment it replaced');
  eq(UNDO.RAW_AT - INDEX.indexOf(TAG), TAG_GAP, '…891,668 units before it');
  eq(UNDO.REINSERT_AT, UNDO.RAW_AT, '…so the re-insert offset is the base offset directly');
  eq(CODE_CHARS - UNDO.RAW_CHARS, RESIDUAL_MONOLITH, 'the residual monolith is 1,454,127 units');
  eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000)[0].inline.length,
    RESIDUAL_MONOLITH, '…which is what the shipped document actually carries');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MARKS.length, TOP_LEVEL_BANNERS, '183 banner marks sat at top level in the base');
  ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0, 'the region opened on one of them');
  ok(MARKS.indexOf(RAW_END_IN_CODE) >= 0, '…and its seam was another');
  ok(/^\/\/ ── VEGA MONITOR RATIOS/.test(BASE_CODE.slice(RAW_AT_IN_CODE, BASE_CODE.indexOf('\n', RAW_AT_IN_CODE))),
    'it opens on a single-line `// ── ` banner');
  ok(/^\/\/ ── POSITIONS PANEL/.test(BASE_CODE.slice(RAW_END_IN_CODE, BASE_CODE.indexOf('\n', RAW_END_IN_CODE))),
    '…and the seam is the POSITIONS PANEL banner — a different concern');
  // The header-splitting shape #441 found cannot apply to a `// ── ` banner:
  // it has no closing rule, so it yields exactly one mark.
  {
    const dash = '// ── THING ──\nvar y = 1;\n';
    eq(topLevelBanners(dash, []).length, 1, 'control — a `// ── ` banner yields ONE mark');
    const rule = '// ═══════════\n';
    eq(topLevelBanners(rule + '// TITLE\n' + rule + 'var x = 1;\n', []).length, 2,
      '…where a four-line `// ═══` header yields two, which is what #441 corrected');
  }

  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. One owner — and the smallest module in the chain');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares exactly one name at top level');
  eq(OWNERS.map((d) => ({ name: d.name, form: d.form, start: d.start, chars: d.chars })),
    OWNERS_EXPECTED, '…computeVegaMonitorRatios, a function of 540 units starting 1,220 in');
  eq(OWNERS[0].start + OWNERS[0].chars + 1, MODULE.length,
    'header + declaration + the closing newline is the whole module');
  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declaration');

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'twenty-six layers ship today');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'this is the SMALLEST module in the chain');
  eq(bySize[0].units, UNDO.MODULE_CHARS, '…at 1,761 units');
  eq(bySize[1].rel, SECOND_SMALLEST, '…and the next smallest is journal-migration');
  eq(bySize[1].units, SECOND_SMALLEST_CHARS, '…at 4,461, more than twice as large');
  ok(bySize[1].units > bySize[0].units * 2, 'so "by a wide margin" is a measurement, not a flourish');

  const decls = sources.map((s) => scanTopLevelDeclarations(s));
  eq(decls.filter((d) => d.length === 1).length, SINGLE_OWNER_LAYERS,
    'five layers have a single owner');
  eq(CHAIN.filter((rel, i) => decls[i].length === 1).sort(), [
    'js/config/strategy-templates.js',
    'js/portfolio/portfolio-backend-candles.js',
    'js/portfolio/portfolio-vega-monitor.js',
    'js/services/apex-post-auth-init.js',
    'js/services/journal-rich-snapshot.js',
  ], '…and this is the fifth of them');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'twenty-three of the twenty-six end `}\\n`, this one among them');

  // The bridge's two separator claims, executed. Helpers are matched by the
  // module path in their own TAG, not by filename: this layer's helper is
  // `vega-monitor-undo.js`, not `portfolio-vega-monitor-undo.js`, and a
  // basename matcher silently drops it — which is exactly how the count would
  // read seventeen and look plausible.
  const HELPERS = fs.readdirSync(path.join(ROOT, 'tests/lib'))
    .filter((f) => /-undo\.js$/.test(f) && f !== 'post-journal-mcx-pr3-undo.js')
    .map((f) => require(path.join(ROOT, 'tests/lib', f)));
  const forLayer = CHAIN.map((rel) => {
    const hit = HELPERS.filter((M) => typeof M.TAG === 'string' && M.TAG.indexOf('/' + rel + '"') >= 0);
    return hit.length === 1 ? hit[0] : null;
  });
  eq(forLayer.filter(Boolean).length, CHAIN_LENGTH,
    'every one of the twenty-six resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'eighteen layers carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, 8, '…and the eight oldest have no separator concept at all');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…but only fifteen of the eighteen pin a single RAW_CHARS one unit longer than MODULE_CHARS, '
    + 'so the pair is not the tell the separator is');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling — and an inbound zero that is NOT a vacuity');
// ─────────────────────────────────────────────────────────────────────────────
{
  // FIRST, why the usual sentence would be wrong here.
  eq(BINDING_FORMS, BINDING_FORMS_EXPECTED, 'BINDING_FORMS is var, const and let — `function` is absent');
  eq(bindingNames(OWNERS), [], '…so bindingNames reports NO binding for this module');
  {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext('function f(){ return 1; }\nf = 42;\n', ctx);
    eq(ctx.f, 42, 'yet a function declaration IS assignable — f === 42 after `f = 42`');
  }
  {
    // The same, on the shipped module itself: an outside write really lands.
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(MODULE, ctx);
    vm.runInContext('computeVegaMonitorRatios = 7;\n', ctx);
    eq(ctx.computeVegaMonitorRatios, 7,
      '…including this owner, so a write from the monolith would have been legal');
  }
  ok(VACUITY_CLAIM_CONTRACTS.every((rel) => fs.existsSync(path.join(ROOT, rel))),
    'the four contracts that call such a zero VACUOUS are still shipped, and still wrong to');
  // …and FOUR is a measurement, not a list written from the layers nearest to
  // hand. Scanned over every shipped contract: a fifth one adopting the same
  // reasoning fails here instead of going unnoticed.
  {
    const measured = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => f.endsWith('.test.js')).sort()
      .map((f) => 'tests/' + f)
      .filter((rel) => {
        const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        return /eq\(\s*bindingNames\([^)]*\)\.length,\s*0/.test(src) && /vacuous/i.test(src);
      })
      .filter((rel) => rel !== CONTRACT_REL);
    eq(measured, VACUITY_CLAIM_CONTRACTS,
      '…and those four are ALL of them — measured over every shipped contract, not sampled');
  }

  // THEREFORE the zero below is a measurement, over a region a write could reach.
  const sites = refSites(VIEWS.code, OWNERS[0].name)
    .filter((p) => p < RAW_AT_IN_CODE || p >= RAW_END_IN_CODE);
  eq(sites, EDGE_SITES, 'ONE reference reaches in from the rest of the monolith');
  eq(sites.length, EXTERNAL_EDGES, '…exactly one');
  ok(sites.every(insideFunction), '…inside a function body, so it does not run at load');
  {
    const enclosing = FN_BODIES.filter((r) => sites[0] >= r.start && sites[0] <= r.end)
      .sort((a, b) => b.start - a.start)[0];
    const head = BASE_CODE.lastIndexOf('function ', enclosing.start);
    ok(BASE_CODE.slice(head, head + 60).indexOf(EDGE_ENCLOSING) > 0,
      '…and that function is renderPositionsPanel');
  }
  eq(sites.filter((p) => isWriteAt(VIEWS.code, p, OWNERS[0].name)).length, INBOUND_WRITES,
    'it is a READ — the zero this contract reports, and it measures something');
  {
    const probe = OWNERS[0].name + ' = 1;\n';
    eq(refSites(probe, OWNERS[0].name).filter((p) => isWriteAt(probe, p, OWNERS[0].name)).length, 1,
      'control — the write detector finds a write when there is one');
  }
  eq(refSites(VIEWS.strings, OWNERS[0].name).length, 0, 'no string or comment in the monolith names it');

  // Outbound, both kinds.
  eq(propertyWriteBases(MASKED_MODULE)
    .filter((b) => b !== OWNERS[0].name && MONOLITH_OWNED.has(b)).length, OUTBOUND_WRITES,
    'it writes no property on any binding the monolith owns');
  {
    const probe = maskLiterals('S.swing = {}; window.x = 1;\n');
    eq(propertyWriteBases(probe).sort(), ['S', 'window'],
      'control — the base detector finds them when they exist');
  }
  const deps = ALL_DECLS.filter((d) => d.name !== OWNERS[0].name && refSites(MASKED_MODULE, d.name).length)
    .map((d) => d.name).sort();
  eq(deps, MONOLITH_DEPENDENCIES, 'and it names NOTHING the monolith declares — both inputs are parameters');
  ok(ALL_DECLS.length > MONOLITH_DECLS_MIN,
    '…checked against every top-level name the monolith declares');

  // The two directions outside the monolith, which audit #442 added.
  let sib = 0;
  for (const rel of LOCALS) {
    if (rel === MODULE_REL) continue;
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (locallyBound(raw).has(OWNERS[0].name)) continue;
    sib += refSites(maskLiterals(raw), OWNERS[0].name).length;
  }
  eq(sib, SIBLING_REFERENCES, 'not one of the sixty-nine sibling modules names it');
  const markup = BASE.slice(0, CODE_AT) + BASE.slice(CODE_AT + BASE_CODE.length);
  eq(refSites(maskLiterals(markup), OWNERS[0].name).length, MARKUP_REFERENCES,
    'nor does the generated markup');
  eq(EXTERNAL_EDGES + SIBLING_REFERENCES + MARKUP_REFERENCES, APPLICATION_REFERENCES,
    'ONE reference in the entire application');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, COMPUTES, and the byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(MODULE, OWNERS, maskLiterals), [], 'nothing is read at evaluation time');
  {
    // #440 measured that this scan is blind to declaration initialisers. There
    // is no initialiser here, but the VM load is what the claim rests on.
    const stmt = 'window.h = elsewhere;\n';
    eq(evaluationTimeReads(stmt, scanTopLevelDeclarations(stmt), maskLiterals), ['elsewhere', 'window'],
      'control — it reports a top-level STATEMENT correctly');
  }
  const bare = {};
  vm.createContext(bare);
  vm.runInContext(MODULE, bare, { filename: MODULE_REL });
  eq(Object.keys(bare).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(bare), [OWNERS[0].name], '…defining exactly its one owner');
  eq(bare[OWNERS[0].name].constructor.name, 'Function', '…a plain function, not async');

  // It WORKS with no host — loading is not the same as running.
  eq(bare[OWNERS[0].name](100, { callLongVega: 20, callShortVegaAbs: 10 }).vegaLongCallOverShortCall, 2,
    'the ratio computes from its two arguments alone');
  eq(bare[OWNERS[0].name](0, { callLongVega: 1, callShortVegaAbs: 0 }).vegaLongCallOverShortCall, null,
    '…a zero denominator returns null rather than Infinity');
  eq(bare[OWNERS[0].name](100, {}).bwdOverVegaLongPut, null, '…and a missing input returns null');

  eq(UNDO.undoVegaMonitor(INDEX, MODULE), BASE, 'the undo reconstructs the base document byte for byte');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…hashing to the pinned base digest');
  eq(BASE.length, UNDO.BASE_CHARS, '…at the pinned length');
  eq(Buffer.byteLength(BASE, 'utf8'), UNDO.BASE_UTF8, '…and byte count');
  eq(APP_LOADER.parseScriptTags(BASE).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying the sixty-nine local scripts of the base');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
const P = 'VEGA_MONITOR_UNDO_';
throwsWith(() => UNDO.undoVegaMonitor(null, MODULE), P + 'BAD_INPUT',
  '7.1 a non-string document is rejected');
throwsWith(() => UNDO.undoVegaMonitor(INDEX, null), P + 'BAD_INPUT',
  '7.2 a non-string module is rejected');
throwsWith(() => UNDO.undoVegaMonitor(INDEX, MODULE.slice(0, -1)), P + 'MODULE_IDENTITY',
  '7.3 a truncated module is rejected');
throwsWith(() => UNDO.undoVegaMonitor(INDEX, MODULE + '\n'), P + 'MODULE_IDENTITY',
  '7.4 a module that re-absorbed the separator is one unit too long');
{
  // A SAME-LENGTH, same-byte-count, same-line-count probe, so the hash check is
  // reached in isolation. Built by index rather than by substitution, because a
  // substitution silently produces an IDENTICAL probe when its needle is absent.
  let at = 1300;
  while (at < MODULE.length && !/[a-z]/.test(MODULE[at])) at++;
  const probe = MODULE.slice(0, at) + (MODULE[at] === 'z' ? 'y' : 'z') + MODULE.slice(at + 1);
  eq(probe.length, MODULE.length, 'the probe is the same length as the module');
  eq(Buffer.byteLength(probe, 'utf8'), UNDO.MODULE_UTF8, '…the same byte count');
  eq((probe.match(/\n/g) || []).length, UNDO.MODULE_LF, '…with the same line count');
  ok(probe !== MODULE, '…and different bytes');
  ok(probe.endsWith(BODY_ENDING), '…and the same ending, so the separator guard passes it');
  throwsWith(() => UNDO.undoVegaMonitor(INDEX, probe), P + 'MODULE_IDENTITY',
    '7.5 a same-length mutated module is rejected by the HASH, not the size');
}
{
  // MODULE_SEPARATOR in isolation: same length, bytes and line count, different
  // ending. Swapping the final `}` for `;` does it.
  const swapped = MODULE.slice(0, -2) + ';\n';
  eq(swapped.length, MODULE.length, 'the swapped-terminator probe is the same length');
  eq((swapped.match(/\n/g) || []).length, UNDO.MODULE_LF, '…with the same line count');
  ok(!swapped.endsWith(BODY_ENDING), '…and no longer ends on `}\\n`');
  throwsWith(() => UNDO.undoVegaMonitor(INDEX, swapped), P + 'MODULE_SEPARATOR',
    '7.6 a module of the right size that no longer ends on a closing brace');
}
{
  // The `\n\n` clause beside it is SUBSUMED, and this is what that means.
  const absorbed = MODULE + UNDO.SEPARATOR;
  ok(absorbed.endsWith('\n\n'), 'the re-absorbed module does end on a blank line');
  ok(!absorbed.endsWith(BODY_ENDING),
    '…and ALSO fails the `}\\n` clause, so the blank-line clause adds no rejection');
}
throwsWith(() => UNDO.undoVegaMonitor(BASE, MODULE), P + 'TAG_IDENTITY',
  '7.7 an already-unextracted document has no tag and is rejected');
throwsWith(() => UNDO.undoVegaMonitor(INDEX.replace(TAG, TAG + TAG), MODULE),
  P + 'TAG_IDENTITY', '7.8 a duplicate tag is rejected');
{
  const reordered = INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG);
  eq(countLiteral(reordered, TAG), 1, 'the reordered mutant still has exactly one tag');
  throwsWith(() => UNDO.undoVegaMonitor(reordered, MODULE), P + 'TAG_ADJACENCY',
    '7.9 a tag moved before its anchor fails adjacency, not identity');
}
throwsWith(() => UNDO.undoVegaMonitor(INDEX + ' ', MODULE), P + 'EXTRACTED_IDENTITY',
  '7.10 one foreign byte anywhere in the document is rejected');
{
  const stranded = INDEX.slice(0, UNDO.RAW_AT) + '\n' + INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoVegaMonitor(stranded, MODULE), P + 'EXTRACTED_IDENTITY',
    '7.11 a structural separator left inline is rejected');
}
eq(UNDO.isApplied(BASE), false, '7.12 isApplied is false for a document predating this layer');
eq(UNDO.isApplied(INDEX), true, '…and true for the shipped one');
eq(UNDO.isApplied(INDEX.replace(TAG, TAG + TAG)), false,
  '7.13 …and false for a duplicated tag, so the guards below it do the real work');

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
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit’s mutation spec is gone with the audit it targeted');
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), '…replaced by one for this contract');
  ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
  ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
    'no documentation changed, except the repository working notes');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('VEGA_MONITOR_BOUNDARY_OK');
