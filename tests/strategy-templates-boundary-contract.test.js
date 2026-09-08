'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// STRATEGY TEMPLATES — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #440 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/strategy-templates-undo.js
// reconstructs the pre-extraction document byte for byte, and §10 asserts the
// production footprint is index.html plus the one new file.
//
// THE AUDITED BOUNDARY WAS 178 UNITS SHORT, and correcting it is the substance
// of this PR. Audit #440 recommended [1102,8553). 1102 IS a top-level banner
// mark and `assertSeam` accepts it — but it is the CLOSING rule of the section
// header, not the opening one:
//
//     // ═══════════════════════════════════…    924   <- opens the header
//     // MULTI-LEG STRATEGY TEMPLATES
//     // Each template defines the leg skeleton. Null fields are filled …
//     // ═══════════════════════════════════…   1102   <- ALSO a banner mark
//     var STRATEGY_TEMPLATES = {
//
// `topLevelBanners` matches every `// ═══` rule line, so a four-line header
// yields TWO marks and a banner-to-banner screen splits it. Cutting at 1102
// would move the closing rule and the declaration and strand the opening rule,
// the title and the description in the monolith, running straight into the next
// section's header. §3 builds that document and asserts the orphan is there.
//
// THIS IS NOT A ONE-OFF. §3 measures the whole screen: of the ninety-nine
// owner-carrying regions it produces, THIRTY-THREE start on a closing rule, and
// the header each would strand runs from 73 to 1,435 units. That is a third of
// the candidate list.
//
// It also fails on a side no earlier cycle has. Every boundary dispute CLAUDE.md
// records — the two dead end-rules, the trade-detail region that spans a banner,
// the tt-reconnect and post-auth regions followed immediately by another
// feature, the 551 and 17,734 units the screening rule would have swallowed — is
// about where a region ENDS. This one is about where it BEGINS. That is scoped
// to that document's record, which is the set actually checked; what §3 asserts
// instead of narrating is the thirty-three.
//
// The cut is 924, which is what every `// ═══`-headed layer already shipped
// did: §4 reads all twenty-five modules and NONE opens on a naked rule.
//
// WHAT MOVED. One contiguous fragment, [924,8553) in monolith coordinates:
// 245 units of header, one `var` of 7,382 units, one closing newline. It is
// PURE DATA — the ONLY layer of the twenty-five with no function at all, and
// the fourth with a single owner.
//
// TWO ZEROES THAT ARE NOT THE SAME KIND OF FACT, which is the distinction the
// greeks layer below this one got to state in one direction and this one states
// in the other:
//
//   - The INBOUND zero is a MEASUREMENT. This region owns a mutable `var`, so
//     an outside write is possible; §5 looks across the monolith, the generated
//     markup and all sixty-eight siblings and finds every one of the twelve
//     external references is a read. (#439's inbound zero was VACUOUS: that
//     region owned no binding for a write to reach.)
//   - The `evaluationTimeReads` zero is VACUOUS. That scan walks top-level
//     STATEMENTS and this region has none, so it CANNOT report anything. §7
//     shows it stays empty for a probe that plainly reads a foreign name at
//     load. The bare VM load is what proves the claim, and §8 rests it there.
//
// This contract reads the LIVE index.html and reaches the base through the undo
// helper, so every coordinate below is proved by the reconstruction that ships.
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
const UNDO = require('./lib/strategy-templates-undo.js');

const MODULE_REL = 'js/config/strategy-templates.js';
const TAG = '<script src="./js/config/strategy-templates.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = 'd3a93f8fca6a9513dec9f2a93be646bd27cdb4db';
const CONTRACT_REL = 'tests/strategy-templates-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/strategy-templates-undo.js';
const AUDIT_REL = 'tests/temporary-strategy-templates-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/strategy-templates-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/strategy-templates-contract.spec.js';

// The suite does NOT ratchet this cycle: the audit leaves as this contract
// arrives, one for one.
const TEST_FILE_COUNT = 154;
const LOCAL_SCRIPT_COUNT = 69;
const MODULE_POSITION = 68;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 113906;
const RAW_AT_IN_CODE = 924;
const RAW_END_IN_CODE = 8553;
const BODY_END_IN_CODE = 8552;
// What audit #440 published, and by how much it fell short. Pinned as REFUTED.
const AUDITED_START = 1102;
const AUDITED_SHORTFALL = 178;

// ── The one owner ────────────────────────────────────────────────────────────
const OWNERS_EXPECTED = [
  { name: 'STRATEGY_TEMPLATES', form: 'var', start: 245, chars: 7382 },
];
const OWNER_COUNT = 1;
const FUNCTION_OWNERS = 0;
const TEMPLATE_COUNT = 22;

// ── Coupling, all THREE directions ───────────────────────────────────────────
const EXTERNAL_EDGES = 3;
const EDGE_SITES = [1061098, 1061232, 1068631];
const MARKUP_REFERENCES = 0;
const INBOUND_WRITES = 0;
const PROPERTY_WRITES = 0;
const MONOLITH_DEPENDENCIES = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const SIBLING_CONSUMER = 'js/ui/journal-trade-forms.js';
const SIBLING_REFERENCES = 9;
const SIBLING_POSITION = 57;
const EXTERNAL_REFERENCES = 12;
const VM_GLOBALS = 1;

// ── The screen, and the third of it that starts on a closing rule ────────────
const TOP_LEVEL_BANNERS = 185;
const RULE_MARKS = 94;
const OPENING_RULES = 50;
const CLOSING_RULES = 44;
const REGIONS_WITH_OWNERS = 99;
const REGIONS_ON_CLOSING_RULE = 33;
const ORPHAN_UNITS_MIN = 73;
const ORPHAN_UNITS_MAX = 1435;

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
  MODULE_REL,
];
const CHAIN_LENGTH = 25;
const LAYERS_WITH_NO_FUNCTION = 1;
const SINGLE_OWNER_LAYERS = 4;
const MODULES_OPENING_ON_NAKED_RULE = 0;
const HEADER_OPENED_LAYERS = 7;
const LAYERS_ENDING_BRACE = 22;
const LAYERS_NOT_ENDING_BRACE = [
  'js/config/strategy-templates.js',
  'js/portfolio/backend-portfolios.js',
  'js/services/journal-backend-write-through.js',
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
function statementLines(src, decls) {
  const ch = Array.from(src);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  return ch.join('').split('\n').filter((l) => !isBlankOrComment(l));
}
function propertyWriteBases(masked) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(masked))) out.push(m[1]);
  return out;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('STRATEGY TEMPLATES — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited #440 · base=' + BASE_SHA.slice(0, 7));

// This is the NEWEST layer, so the live document is the one it shipped: there
// is nothing on top to peel. When a later layer lands it goes here, first.
const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// The BASE document, reached through the undo rather than re-read from git, so
// every coordinate below is proved by the reconstruction that shipped.
const BASE = UNDO.undoStrategyTemplates(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const VIEWS = lexicalViews(BASE_CODE);
const ALL_DECLS = scanTopLevelDeclarations(BASE_CODE);
const MONOLITH_OWNED = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const OWNERS = scanTopLevelDeclarations(MODULE);
const OWNED_HERE = new Set(OWNERS.map((d) => d.name));
const MASKED_MODULE = maskLiterals(MODULE);
const MARKS = topLevelBanners(BASE_CODE, FN_BODIES);
const lineAt = (at) => BASE_CODE.slice(at, BASE_CODE.indexOf('\n', at));
const nextLine = (at) => BASE_CODE.indexOf('\n', at) + 1;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is 1,569,879 units');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…1,599,759 bytes');
eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…27,322 line feeds');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and hashes to the shipped digest');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-nine local scripts');
eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last, at position 68');
eq(INDEX.indexOf(ANCHOR_TAG + TAG + INLINE_OPEN) >= 0, true,
  '…immediately after the greeks anchor and immediately before the inline monolith');
{
  const fromGit = git(['show', BASE_SHA + ':index.html']);
  eq(fromGit.length, UNDO.BASE_CHARS, 'the pinned base carries the pre-extraction index.html');
  eq(sha256(fromGit), UNDO.BASE_SHA256, '…byte for byte');
  // PIN THE BASE BY SOMETHING ONLY IT HAS. #440 was an audit and changed nothing
  // outside tests/, so index.html is byte-identical at this commit and at its
  // parent — a mutant swapping one for the other survives every hash assertion
  // above. That gap has now appeared THREE cycles running (#432, #439, here),
  // because a Phase 1 PR never touches production by construction. The
  // discriminator is the audit this contract retires: present at the base,
  // absent one commit earlier.
  const parent = git(['rev-parse', BASE_SHA + '^']).trim();
  eq(git(['show', parent + ':index.html']), fromGit,
    'the parent commit carries the SAME index.html — which is why the hashes cannot pin the base');
  ok(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]) === '',
    '…so the base is pinned by the audit #440 added');
  assert.throws(() => git(['cat-file', '-e', parent + ':' + AUDIT_REL]),
    'control — its parent does NOT carry that file, so the two commits are told apart');
  pass++;
}
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 153 files — unchanged, the audit left as this contract arrived');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BASE.indexOf(BASE_CODE), CODE_AT, 'the inline monolith begins at 113906 in the base');
  const raw = BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(raw.length, UNDO.RAW_CHARS, 'the raw block is 7,629 units');
  eq(sha256(raw), UNDO.RAW_SHA256, '…hashing to the pinned digest');
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 7,628');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…7,880 bytes');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…67 line feeds');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and hashes to the pinned module digest');
  eq(MODULE, raw.slice(0, -1), 'the module is the block minus its final LF — byte for byte');
  eq(raw, MODULE + UNDO.SEPARATOR, '…and the block is the module plus the structural separator');
  eq(CODE_AT + RAW_AT_IN_CODE, UNDO.RAW_AT, 'the document offset is the monolith offset plus 113906');
  eq(CODE_AT + RAW_END_IN_CODE, UNDO.RAW_END, '…and so is its end');
  eq(UNDO.SEPARATOR_AT, UNDO.RAW_END - 1, 'the separator is the last unit of the block');

  // THE ENDING IS NOT `}\n`, so the guard the recent layers share would reject
  // this module. That is why the helper pins `\n};\n` instead.
  eq(MODULE.slice(-UNDO.MODULE_LAST_LINE.length), UNDO.MODULE_LAST_LINE,
    'the module ends on the object literal terminator, on its own line');
  ok(!MODULE.endsWith('}\n'), '…and NOT on `}\\n`');
  ok(!MODULE.endsWith('\n\n'), '…and not on a blank line either');

  // The tag lands BEFORE the cut, which is what lets REINSERT_AT be the base
  // offset unchanged.
  ok(INDEX.indexOf(TAG) < UNDO.RAW_AT, 'the tag sits before the fragment it replaced');
  eq(UNDO.RAW_AT - INDEX.indexOf(TAG), 932, '…932 units before it');
  eq(UNDO.REINSERT_AT, UNDO.RAW_AT, '…so the re-insert offset is the base offset directly');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The boundary — and the third of the screen that starts mid-header');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(MARKS.length, TOP_LEVEL_BANNERS, '185 banner marks sit at top level');
  ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0, 'the region opens on one of them');
  ok(MARKS.indexOf(RAW_END_IN_CODE) >= 0, '…and its seam is another');
  ok(BASE_CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + 120).indexOf('STATE') > 0,
    'what follows the seam is the STATE section — a different concern');
  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE), BODY_END_IN_CODE,
    'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the boundary on all four invariants');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE + 1, BODY_END_IN_CODE),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(BASE_CODE, RAW_AT_IN_CODE, RAW_END_IN_CODE),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');

  // WHAT THE AUDIT PUBLISHED, and why it is refuted. 1102 passes every
  // mechanical test 924 passes — which is the whole point: the seam rules
  // cannot tell an opening rule from a closing one.
  ok(MARKS.indexOf(AUDITED_START) >= 0, 'the audited start IS a top-level banner mark');
  eq(assertSeam(BASE_CODE, AUDITED_START, BODY_END_IN_CODE), RAW_END_IN_CODE,
    '…and assertSeam accepts it too — the mechanical rules cannot separate them');
  eq(AUDITED_START - RAW_AT_IN_CODE, AUDITED_SHORTFALL, 'it starts 178 units late');
  {
    const stranded = BASE_CODE.slice(RAW_AT_IN_CODE, AUDITED_START);
    eq(stranded.length, AUDITED_SHORTFALL, 'those 178 units are the header it would leave behind');
    ok(stranded.split('\n').slice(0, -1).every(isBlankOrComment),
      '…and every line of them is comment, not code');
    ok(stranded.indexOf('MULTI-LEG STRATEGY TEMPLATES') > 0, '…including the section title');
    // The document the audited cut would have produced: the orphaned header
    // runs straight into the next section's own header.
    const wouldBe = BASE_CODE.slice(0, AUDITED_START) + BASE_CODE.slice(RAW_END_IN_CODE);
    ok(wouldBe.indexOf('// Each template defines the leg skeleton. Null fields are filled by the user.\n'
      + '// ═══════════════════════════════════════════════════════════════\n// STATE\n') > 0,
      'cutting at 1102 strands a titled header directly above the STATE banner');
    eq(BASE_CODE.slice(0, RAW_AT_IN_CODE) + BASE_CODE.slice(RAW_END_IN_CODE),
      wouldBe.slice(0, AUDITED_START - AUDITED_SHORTFALL) + wouldBe.slice(AUDITED_START),
      'control — cutting at 924 removes exactly those 178 units as well');
  }

  // A rule mark OPENS a header when the next line is another comment, and
  // CLOSES one when it is not. Both are banner marks, so a banner-to-banner
  // screen produces regions of both kinds.
  const rules = MARKS.filter((m) => /^\/\/ ═══/.test(lineAt(m)));
  eq(rules.length, RULE_MARKS, '94 of the 185 marks are `// ═══` rules');
  const opens = rules.filter((m) => /^\s*\/\//.test(lineAt(nextLine(m))));
  const closes = rules.filter((m) => !/^\s*\/\//.test(lineAt(nextLine(m))));
  eq(opens.length, OPENING_RULES, '50 of them open a header');
  eq(closes.length, CLOSING_RULES, '…and 44 close one');
  ok(opens.indexOf(RAW_AT_IN_CODE) >= 0, '924 opens this feature’s header');
  ok(closes.indexOf(AUDITED_START) >= 0, '…and 1102 closes it');

  const ownersIn = (s, e) => ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
  const withOwners = [];
  for (let i = 0; i < MARKS.length; i++) {
    const s = MARKS[i], e = i + 1 < MARKS.length ? MARKS[i + 1] : BASE_CODE.length;
    if (ownersIn(s, e).length) withOwners.push(s);
  }
  eq(withOwners.length, REGIONS_WITH_OWNERS, 'the screen produces 99 owner-carrying regions');
  const midHeader = withOwners.filter((s) => closes.indexOf(s) >= 0);
  eq(midHeader.length, REGIONS_ON_CLOSING_RULE,
    '…and THIRTY-THREE of them start on a closing rule, not a feature');
  const orphans = midHeader.map((s) => s - MARKS[MARKS.indexOf(s) - 1]);
  eq(Math.min.apply(null, orphans), ORPHAN_UNITS_MIN, 'the smallest header they would strand is 73 units');
  eq(Math.max.apply(null, orphans), ORPHAN_UNITS_MAX, '…the largest 1,435');
  ok(midHeader.indexOf(AUDITED_START) >= 0, 'this cycle’s audited start is one of the thirty-three');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. One owner, no function — and no shipped module opens on a naked rule');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the module declares exactly one name at top level');
  eq(OWNERS.map((d) => ({ name: d.name, form: d.form, start: d.start, chars: d.chars })),
    OWNERS_EXPECTED, '…STRATEGY_TEMPLATES, a `var` of 7,382 units starting 245 units in');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS,
    'there is NO function in it');
  eq(bindingNames(OWNERS), ['STRATEGY_TEMPLATES'],
    'it owns exactly one binding — so §5’s inbound zero is not vacuous');
  eq(OWNERS[0].start + OWNERS[0].chars + 1, MODULE.length,
    'header + declaration + the closing newline is the whole module');
  eq(statementLines(MODULE, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declaration');

  // Measured over the WHOLE chain, not inferred from the layers nearest to hand.
  eq(CHAIN.length, CHAIN_LENGTH, 'twenty-five layers ship today');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const decls = sources.map((s) => scanTopLevelDeclarations(s));
  eq(decls.filter((d) => d.filter((x) => x.form === 'function').length === 0).length,
    LAYERS_WITH_NO_FUNCTION, 'exactly ONE of them declares no function — this one');
  eq(CHAIN[decls.findIndex((d) => d.filter((x) => x.form === 'function').length === 0)],
    MODULE_REL, '…and it is this module');
  eq(decls.filter((d) => d.length === 1).length, SINGLE_OWNER_LAYERS,
    'four layers have a single owner');
  eq(CHAIN.filter((rel, i) => decls[i].length === 1).sort(), [
    'js/config/strategy-templates.js',
    'js/portfolio/portfolio-backend-candles.js',
    'js/services/apex-post-auth-init.js',
    'js/services/journal-rich-snapshot.js',
  ], '…this one and three whose single owner is a function');

  // NO shipped module opens on a naked rule, which is the convention the
  // corrected cut restores rather than invents.
  const opensOnRule = (s) => /^\/\/ ═══/.test(s.slice(0, s.indexOf('\n')));
  const secondIsComment = (s) => {
    const rest = s.slice(s.indexOf('\n') + 1);
    return /^\s*\/\//.test(rest.slice(0, rest.indexOf('\n')));
  };
  const headed = CHAIN.filter((rel, i) => opensOnRule(sources[i]));
  eq(headed.length, HEADER_OPENED_LAYERS + 1, 'eight modules open on a `// ═══` rule');
  eq(headed.filter((rel, i) => !secondIsComment(sources[CHAIN.indexOf(rel)])).length,
    MODULES_OPENING_ON_NAKED_RULE,
    '…and every one of them carries its title on the next line — NONE opens on a naked rule');
  eq(headed.filter((rel) => rel !== MODULE_REL).length, HEADER_OPENED_LAYERS,
    'seven of them shipped before this one, which is the convention it follows');
  {
    const naked = '// ═══════════\nvar X = 1;\n';
    ok(opensOnRule(naked) && !secondIsComment(naked),
      'control — the detector DOES report a naked rule when it sees one');
  }

  // The endings, also measured over the whole chain.
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'twenty-two of the twenty-five end `}\\n`');
  eq(CHAIN.filter((rel, i) => !sources[i].endsWith('}\n')).sort(), LAYERS_NOT_ENDING_BRACE,
    '…and the three that do not are this one, backend portfolios and write-through');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Coupling in all three directions — an inbound zero that MEASURES');
// ─────────────────────────────────────────────────────────────────────────────
{
  const sites = refSites(VIEWS.code, 'STRATEGY_TEMPLATES');
  const outside = sites.filter((p) => p < RAW_AT_IN_CODE || p >= RAW_END_IN_CODE);
  eq(outside.length, EXTERNAL_EDGES, 'three references reach in from the rest of the monolith');
  eq(outside, EDGE_SITES, '…at the pinned offsets');
  ok(outside.every(insideFunction), '…every one of them inside a function body, so none runs at load');
  eq(outside.filter((p) => isWriteAt(VIEWS.code, p, 'STRATEGY_TEMPLATES')).length, INBOUND_WRITES,
    'NONE of them writes — and the region owns a mutable `var`, so a write was possible');
  eq(refSites(VIEWS.strings, 'STRATEGY_TEMPLATES').length, MARKUP_REFERENCES,
    'no string or comment in the monolith names it either');
  {
    // A control on an input where the answer differs, because a metric whose
    // true value is 0 is indistinguishable from `return 0` without one.
    const probe = 'STRATEGY_TEMPLATES = {};\nSTRATEGY_TEMPLATES.X = 1;\n';
    eq(refSites(probe, 'STRATEGY_TEMPLATES')
      .filter((p) => isWriteAt(probe, p, 'STRATEGY_TEMPLATES')).length, 2,
      'control — the write detector finds writes when they exist');
  }
  eq(countLiteral(BASE.slice(0, CODE_AT), 'STRATEGY_TEMPLATES')
    + countLiteral(BASE.slice(CODE_AT + BASE_CODE.length), 'STRATEGY_TEMPLATES'),
    MARKUP_REFERENCES, 'the generated markup never names it');

  // OUTBOUND, both kinds. A region that declares nothing scores a vacuous zero
  // inbound while writing globals it does not own — the shape CLAUDE.md
  // records — so the outbound directions are measured on their own.
  const bases = propertyWriteBases(MASKED_MODULE);
  eq(bases.length, PROPERTY_WRITES, 'the module performs NO property write of any kind');
  eq(bases.filter((b) => !OWNED_HERE.has(b) && MONOLITH_OWNED.has(b)).length, 0,
    '…so none can land on a binding the monolith owns');
  {
    const probe = maskLiterals('S.swing = {}; window.x = 1;\n');
    eq(propertyWriteBases(probe).sort(), ['S', 'window'],
      'control — the base detector finds them when they exist');
  }
  const deps = ALL_DECLS.filter((d) => !OWNED_HERE.has(d.name) && refSites(MASKED_MODULE, d.name).length)
    .map((d) => d.name).sort();
  eq(deps, MONOLITH_DEPENDENCIES,
    'and it names NOTHING the monolith declares — the direction the screen never counted');
  ok(ALL_DECLS.length > 900, 'that is checked against every top-level name the monolith declares');

  // The siblings, which is where the real consumer is.
  const sib = {};
  for (const rel of LOCALS) {
    if (rel === MODULE_REL) continue;
    const masked = maskLiterals(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const hits = refSites(masked, 'STRATEGY_TEMPLATES');
    if (hits.length) {
      sib[rel] = hits.length;
      eq(hits.filter((p) => isWriteAt(masked, p, 'STRATEGY_TEMPLATES')).length, 0,
        rel + ' reads it and never writes it');
    }
  }
  eq(Object.keys(sib), [SIBLING_CONSUMER], 'exactly one sibling module names it');
  eq(sib[SIBLING_CONSUMER], SIBLING_REFERENCES, '…nine times');
  eq(EXTERNAL_EDGES + SIBLING_REFERENCES, EXTERNAL_REFERENCES,
    'twelve external references in the whole application, and every one a read');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. A consumer that loads BEFORE the module');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(LOCALS.indexOf(SIBLING_CONSUMER), SIBLING_POSITION, 'journal-trade-forms.js is script #57');
  eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…and this module #68, eleven tags later');
  ok(SIBLING_POSITION < MODULE_POSITION, 'so the consumer is evaluated FIRST');
  // Safe only because nothing reads the name at evaluation time — the #417
  // shape. Proved on the consumer, not assumed.
  const consumer = fs.readFileSync(path.join(ROOT, SIBLING_CONSUMER), 'utf8');
  const masked = maskLiterals(consumer);
  const bodies = functionBodyRanges(consumer);
  const hits = refSites(masked, 'STRATEGY_TEMPLATES');
  eq(hits.length, SIBLING_REFERENCES, 'its nine references are all found');
  ok(hits.every((p) => bodies.some((r) => p >= r.start && p <= r.end)),
    '…and every one sits inside a function body, so none runs when the tag loads');
  {
    const probe = 'var A = STRATEGY_TEMPLATES;\n';
    const pb = functionBodyRanges(probe);
    ok(!refSites(probe, 'STRATEGY_TEMPLATES')
      .every((p) => pb.some((r) => p >= r.start && p <= r.end)),
      'control — a top-level read is NOT inside a function body');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. `evaluationTimeReads` is the wrong instrument for a data region');
// ─────────────────────────────────────────────────────────────────────────────
{
  // It returns the empty list here — and that answer is VACUOUS. The scan walks
  // what lies OUTSIDE the top-level declarations, and this region is nothing
  // but a top-level declaration. Every audit before this one quoted the zero.
  eq(evaluationTimeReads(MODULE, OWNERS, maskLiterals), [],
    'the scan reports nothing read at evaluation time');
  eq(statementLines(MODULE, OWNERS).length, 0,
    '…but there is no top-level statement for it to look at, so it CANNOT report anything');

  const probe = 'var T = { a: elsewhere };\n';
  eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals), [],
    'a `var` initialiser reading a foreign name RUNS at load — and the scan stays empty');
  // The VM throws a ReferenceError from its OWN realm, so it is matched by
  // message rather than by `instanceof`, which is false across realms.
  assert.throws(() => vm.runInContext(probe, vm.createContext({})),
    (e) => /elsewhere is not defined/.test(String(e)));
  pass++;

  const stmt = 'function f(){ return 1; }\nwindow.h = elsewhere;\n';
  eq(evaluationTimeReads(stmt, scanTopLevelDeclarations(stmt), maskLiterals),
    ['elsewhere', 'window'],
    'control — give it a top-level STATEMENT and it reports correctly');
  const both = 'var T = { a: elsewhere };\nwindow.h = other;\n';
  eq(evaluationTimeReads(both, scanTopLevelDeclarations(both), maskLiterals),
    ['other', 'window'],
    '…and with both shapes present it reports the statement and misses the initialiser');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. It loads bare, carries its data, and the byte-exact round trip');
// ─────────────────────────────────────────────────────────────────────────────
{
  // THIS is the proof, because the VM executes the initialiser the scan cannot
  // see. A foreign name in it would throw here.
  const bare = {};
  vm.createContext(bare);
  vm.runInContext(MODULE, bare, { filename: MODULE_REL });
  eq(Object.keys(bare).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(bare), ['STRATEGY_TEMPLATES'], '…defining exactly its one owner');
  eq(Object.keys(bare.STRATEGY_TEMPLATES).length, TEMPLATE_COUNT, 'twenty-two templates');
  eq(bare.STRATEGY_TEMPLATES.SHORT_STRANGLE.label, 'SHORT STRANGLE',
    '…each carrying a label the UI renders');
  ok(Object.values(bare.STRATEGY_TEMPLATES).every((t) => Array.isArray(t.legs) && t.legs.length > 0),
    '…and a non-empty leg skeleton');

  eq(UNDO.undoStrategyTemplates(INDEX, MODULE), BASE,
    'the undo reconstructs the base document byte for byte');
  eq(sha256(BASE), UNDO.BASE_SHA256, '…hashing to the pinned base digest');
  eq(BASE.length, UNDO.BASE_CHARS, '…at the pinned length');
  eq(Buffer.byteLength(BASE, 'utf8'), UNDO.BASE_UTF8, '…and byte count');
  eq(APP_LOADER.parseScriptTags(BASE).filter((t) => t.src && /^\.\//.test(t.src)).length,
    UNDO.BASE_LOCAL_SCRIPTS, '…carrying the sixty-eight local scripts of the base');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
const P = 'STRATEGY_TEMPLATES_UNDO_';
throwsWith(() => UNDO.undoStrategyTemplates(null, MODULE), P + 'BAD_INPUT',
  '9.1 a non-string document is rejected');
throwsWith(() => UNDO.undoStrategyTemplates(INDEX, null), P + 'BAD_INPUT',
  '9.2 a non-string module is rejected');
throwsWith(() => UNDO.undoStrategyTemplates(INDEX, MODULE.slice(0, -1)), P + 'MODULE_IDENTITY',
  '9.3 a truncated module is rejected');
throwsWith(() => UNDO.undoStrategyTemplates(INDEX, MODULE + '\n'), P + 'MODULE_IDENTITY',
  '9.4 a module that re-absorbed the separator is one unit too long');
{
  // A SAME-LENGTH, same-byte-count, same-line-count probe, so the hash check is
  // reached in isolation and cannot hide behind the size check. Built by index
  // rather than by a text substitution, because a substitution silently
  // produces an IDENTICAL probe when its needle is absent.
  let at = 3000;
  while (at < MODULE.length && !/[a-z]/.test(MODULE[at])) at++;
  const probe = MODULE.slice(0, at) + (MODULE[at] === 'z' ? 'y' : 'z') + MODULE.slice(at + 1);
  eq(probe.length, MODULE.length, 'the probe is the same length as the module');
  eq(Buffer.byteLength(probe, 'utf8'), UNDO.MODULE_UTF8, '…the same byte count');
  eq((probe.match(/\n/g) || []).length, UNDO.MODULE_LF, '…with the same line count');
  ok(probe !== MODULE, '…and different bytes');
  ok(probe.endsWith(UNDO.MODULE_LAST_LINE), '…and the same ending, so the separator guard passes it');
  throwsWith(() => UNDO.undoStrategyTemplates(INDEX, probe), P + 'MODULE_IDENTITY',
    '9.5 a same-length mutated module is rejected by the HASH, not the size');
}
{
  // MODULE_SEPARATOR in isolation: swap the terminator’s two units, which keeps
  // length, bytes and line count and changes only the ending.
  const swapped = MODULE.slice(0, -3) + ';}\n';
  eq(swapped.length, MODULE.length, 'the swapped-terminator probe is the same length');
  eq((swapped.match(/\n/g) || []).length, UNDO.MODULE_LF, '…with the same line count');
  ok(!swapped.endsWith(UNDO.MODULE_LAST_LINE), '…and no longer ends on the pinned line');
  throwsWith(() => UNDO.undoStrategyTemplates(INDEX, swapped), P + 'MODULE_SEPARATOR',
    '9.6 a module of the right size that no longer ends on the pinned line');
}
{
  // The `\n\n` clause beside it is SUBSUMED, and this is what that means: the
  // module that re-absorbed the separator already fails the pinned-line clause,
  // because endsWith tests the final units.
  const absorbed = MODULE + UNDO.SEPARATOR;
  ok(absorbed.endsWith('\n\n'), 'the re-absorbed module does end on a blank line');
  ok(!absorbed.endsWith(UNDO.MODULE_LAST_LINE),
    '…and ALSO fails the pinned-line clause, so the blank-line clause adds no rejection');
}
throwsWith(() => UNDO.undoStrategyTemplates(BASE, MODULE), P + 'TAG_IDENTITY',
  '9.7 an already-unextracted document has no tag and is rejected');
throwsWith(() => UNDO.undoStrategyTemplates(INDEX.replace(TAG, TAG + TAG), MODULE),
  P + 'TAG_IDENTITY', '9.8 a duplicate tag is rejected');
{
  const reordered = INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG);
  eq(countLiteral(reordered, TAG), 1, 'the reordered mutant still has exactly one tag');
  throwsWith(() => UNDO.undoStrategyTemplates(reordered, MODULE), P + 'TAG_ADJACENCY',
    '9.9 a tag moved before its anchor fails adjacency, not identity');
}
throwsWith(() => UNDO.undoStrategyTemplates(INDEX + ' ', MODULE), P + 'EXTRACTED_IDENTITY',
  '9.10 one foreign byte anywhere in the document is rejected');
{
  const stranded = INDEX.slice(0, UNDO.RAW_AT) + '\n' + INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoStrategyTemplates(stranded, MODULE), P + 'EXTRACTED_IDENTITY',
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
    ['index.html', MODULE_REL],
    'production footprint is exactly index.html plus the one new module');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // The audit's mutation spec retires WITH the audit, and this contract's spec
  // replaces it. A spec whose target no longer exists would fail the coverage
  // contract, so this is not bookkeeping — it is what keeps §2 of
  // tests/mutation-coverage-contract.test.js honest.
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
console.log('STRATEGY_TEMPLATES_BOUNDARY_OK');
