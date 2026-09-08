'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// VEGA MONITOR RATIOS — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §9 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// WHAT IS RECOMMENDED. `computeVegaMonitorRatios`, [891660,893422) in monolith
// coordinates: 1,762 units, ONE function, and ONE reference in the entire
// application.
//
//     1 inbound reference — a call, inside renderPositionsPanel
//     0 inbound writes, 0 outbound property writes
//     0 monolith dependencies — it names nothing the monolith declares
//     0 references from any of the sixty-nine shipped modules
//     0 references from generated markup
//     0 top-level statement lines
//     it loads in a COMPLETELY empty VM and COMPUTES with no host at all
//
// THE SCREEN IS REBUILT HERE, because #441 measured that it was splitting a
// third of its own regions. `topLevelBanners` marks every `// ═══` rule line,
// so a four-line header yields TWO marks and a banner-to-banner walk starts the
// region at the header's CLOSING rule. §3 merges each such pair — 42 of them —
// and the region count falls from 141 starts to 98 owner-carrying regions whose
// starts are feature starts.
//
// A FOURTH DIRECTION THE SCREEN NEVER COUNTED. #440 established three, and all
// three are measured INSIDE the monolith: inbound references, outbound property
// writes, outbound dependency names. A region can also be named by the modules
// ALREADY EXTRACTED, and 59 of the 98 are — 1,110 references in total. §4
// measures it and shows what it changes: the region ranked SECOND on the three
// monolith-internal directions carries six sibling references and falls to
// THIRTEENTH. The recommendation is first under both, which is the property
// that makes it robust rather than lucky.
//
// AND THAT MEASUREMENT WAS WRONG THE FIRST TIME, which is why §4 pins both
// numbers. A plain identifier scan reported 1,180 references, counting `field`
// in portfolio-stress-parity.js as a call to the monolith's `field()` — it is a
// callback PARAMETER of the same name. Removing names the sibling binds itself
// drops 70 of them, and takes "regions a sibling reads at EVALUATION time" from
// one to ZERO. The scratch tool was wrong and the artifact was not, exactly as
// CLAUDE.md says to assume.
//
// `bindingNames` DOES NOT REPORT A FUNCTION DECLARATION, and that is a defect
// with a shipped consequence. `BINDING_FORMS` is ['var','const','let'], so a
// region owning only functions returns the empty list — and #439's contract
// reads that as "the module owns no binding for a write to reach", calling its
// inbound zero VACUOUS. It is not: `function f(){}; f = 42;` leaves f === 42,
// so a function declaration is an assignable binding like any other. §5 proves
// the semantics in a VM, and measures the blast radius: ELEVEN of the
// twenty-five shipped layers return empty from `bindingNames` while owning
// THIRTY-FOUR assignable function bindings between them.
//
// This is the same shape as the bug that file already records — the outbound
// check scanned `var` only, so `S` (a `const`) was never tested. The fix then
// added `const` and `let` and stopped, leaving `function` out. This audit does
// not change the helper: Phase 1 measures, and a later PR fixes the list and
// the FOUR contracts that rest a vacuity claim on it — rich snapshot, snapshot
// prefetch, portfolio backend candles and the greeks pair. §5 counts them; the
// header said "two" until the prose check went and looked.
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

// ── The base this audit measures ─────────────────────────────────────────────
const BASE_SHA = 'f38cc90a4dbac0c201a4540c01c1023913c810be';
const BASE_CHARS = 1569879;
const BASE_SHA256 = 'e12a8cb5a771a484b2bdfba2cc63fba5647299af433a770b83cd9aad8a6aa817';
const CODE_AT = 113964;
const CODE_CHARS = 1455889;
const LOCAL_SCRIPT_COUNT = 69;
const BASE_TEST_FILE_COUNT = 153;
const TEST_FILE_COUNT = 154;

// ── The region, in MONOLITH coordinates ──────────────────────────────────────
const RAW_AT = 891660;
const RAW_END = 893422;
const RAW_CHARS = 1762;
const BODY_END = 893421;
const MODULE_CHARS = 1761;
const MODULE_SHA256 = '18fa3c94419cb14a388fd96594093be82324c12f333f77f0deaa331c279871cc';
const RAW_SHA256 = '450ea1cb678e54335ce6802bb49c3de7298e0cfc5a044a485af00adbcb62dfd6';
const OWNER_NAME = 'computeVegaMonitorRatios';
const OWNER_FORM = 'function';
const OWNER_START = 1220;
const OWNER_CHARS = 540;
const OWNER_COUNT = 1;
const BODY_ENDING = '}\n';

// ── Coupling, in every direction there is ────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [914871];
const EDGE_ENCLOSING = 'renderPositionsPanel';
const INBOUND_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = [];
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;
const APPLICATION_REFERENCES = 1;

// ── The screen, rebuilt ──────────────────────────────────────────────────────
const BANNER_MARKS = 183;
const REGION_STARTS = 141;
const MERGED_CLOSING_RULES = 42;
const REGIONS_WITH_OWNERS = 98;

// ── The fourth direction ─────────────────────────────────────────────────────
const REGIONS_WITH_SIBLING_REFS = 59;
const SIBLING_TOTAL = 1110;
const SIBLING_NAIVE = 1180;
const SIBLING_CONFOUND = 70;
const SIBLING_LOAD_TIME_READERS = 0;
const RANK_BY_THREE = 1;
const RANK_BY_FIVE = 1;
const RUNNER_UP_START = 1407285;
const RUNNER_UP_BY_THREE = 2;
const RUNNER_UP_BY_FIVE = 13;
const REGIONS_AT_ONE = 1;
// [start, inbound, outWrites, outDeps, sibling, units] for the candidate and
// the regions it was chosen over.
const RANKING = [
  { start: 891660, inbound: 1, outWrites: 0, outDeps: 0, sibling: 0, units: 1762 },
  { start: 1407285, inbound: 1, outWrites: 0, outDeps: 0, sibling: 6, units: 1282 },
  { start: 153, inbound: 2, outWrites: 0, outDeps: 0, sibling: 0, units: 771 },
  { start: 80720, inbound: 4, outWrites: 0, outDeps: 0, sibling: 0, units: 4051 },
];

// ── The bindingNames gap ─────────────────────────────────────────────────────
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
];
const CHAIN_LENGTH = 25;
const BINDING_FORMS_EXPECTED = ['var', 'const', 'let'];
const LAYERS_WITH_NO_REPORTED_BINDING = 11;
const UNREPORTED_FUNCTION_BINDINGS = 34;
const VACUITY_CLAIM_FILE = 'tests/portfolio-dxlink-greeks-boundary-contract.test.js';
// Every contract that asserts an empty bindingNames AND calls the inbound zero
// vacuous on that basis. Counted, because "two" was written from the two files
// nearest to hand and there are four.
const VACUITY_CLAIM_CONTRACTS = [
  'tests/journal-rich-snapshot-boundary-contract.test.js',
  'tests/journal-snapshot-prefetch-boundary-contract.test.js',
  'tests/portfolio-backend-candles-boundary-contract.test.js',
  'tests/portfolio-dxlink-greeks-boundary-contract.test.js',
];

// ── The modelled extraction ──────────────────────────────────────────────────
const MODULE_REL = 'js/portfolio/portfolio-vega-monitor.js';
const TAG = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>\n';
const TAG_CHARS = 65;
const ANCHOR_TAG = '<script src="./js/config/strategy-templates.js"></script>\n';
const INLINE_OPEN = '<script>';
const EXTRACTED_CHARS = 1568182;
const EXTRACTED_UTF8 = 1597962;
const EXTRACTED_LF = 27291;
const EXTRACTED_SHA256 = '2ef534b3039ff7ec98cc46cbe54e01ccf48fd765ac07c3f583a4bd471e79a52a';
const EXTRACTED_LOCAL_SCRIPTS = 70;
const MODULE_POSITION = 69;
const RESIDUAL_MONOLITH = 1454127;

// ── The change set ───────────────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-vega-monitor-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/vega-monitor-audit.spec.js';
const ADDED_FILES = [AUDIT_SPEC_REL, AUDIT_REL].sort();
const RATCHETED_CONTRACTS = 15;
// Five of them carry a comment beside that constant naming 142 — the count
// twelve cycles ago. Measured, not fixed: Phase 1 does not edit prose it is not
// otherwise touching, and keeping the ratchet to ONE line per file is what lets
// §9 audit it line-by-line.
const STALE_RATCHET_COMMENTS = 5;
const STALE_RATCHET_NUMBER = '142';
// Not ratchet edits: these re-pin mutation constants the ratchet itself moved.
// A THIRD category, and not bookkeeping either: the mutation harness gained a
// baseline check. §4's dead pin was found by the prose check, NOT by the pass
// that was supposed to catch it — the pass had run against an already-red
// target, where every mutant reports as caught. The guard makes that condition
// throw instead.
const HARNESS_FIX = 'tests/lib/mutation-harness.js';
const MUTATION_BOOKKEEPING = [
  'tests/mutation-coverage-contract.test.js',
  'tests/mutation-specs/mutation-coverage-contract.spec.js',
  'tests/mutation-specs/portfolio-dxlink-greeks-contract.spec.js',
  'tests/mutation-specs/strategy-templates-contract.spec.js',
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
// Every name a source binds itself, at ANY nesting. Over-collecting is the safe
// direction: it can only DROP a sibling reference, never invent one.
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
  const arrow = /(?:^|[^\w$])\(([^)]*)\)\s*=>/g;
  while ((m = arrow.exec(src))) {
    for (const p of m[1].split(',')) {
      const n = p.trim().replace(/=.*$/, '').trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) out.add(n);
    }
  }
  const arrow1 = /(?:^|[^\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*=>/g;
  while ((m = arrow1.exec(src))) out.add(m[1]);
  const catchp = /\bcatch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = catchp.exec(src))) out.add(m[1]);
  return out;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('VEGA MONITOR RATIOS — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA.slice(0, 7));

const INDEX = APP_LOADER.loadIndexHtml();
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const VIEWS = lexicalViews(CODE);
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const ALL_DECLS = scanTopLevelDeclarations(CODE);
const MONOLITH_OWNED = new Map(ALL_DECLS.map((d) => [d.name, d]));
const MARKS = topLevelBanners(CODE, FN_BODIES);
const BODY = CODE.slice(RAW_AT, BODY_END);
const OWNERS = scanTopLevelDeclarations(BODY);
const MASKED_BODY = maskLiterals(BODY);
const lineAt = (at) => CODE.slice(at, CODE.indexOf('\n', at));
const nextLine = (at) => CODE.indexOf('\n', at) + 1;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,569,879 units');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the pinned base digest');
  // NOT `HEAD === BASE_SHA`. That held while this file was uncommitted and
  // stopped the moment it was committed, which the mandatory post-commit run
  // caught. The claim an audit actually makes is that PRODUCTION has not moved
  // since the base — so that is what is asserted, by content.
  eq(git(['show', BASE_SHA + ':index.html']), INDEX,
    'index.html is byte-identical to the base these numbers describe');
  ok(git(['merge-base', '--is-ancestor', BASE_SHA, 'HEAD']) === '',
    '…and that base is an ancestor of HEAD, so the numbers describe this branch');
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith begins at 113964');
  eq(CODE.length, CODE_CHARS, '…and runs 1,455,889 units');
  eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'sixty-nine local scripts load before it');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
    TEST_FILE_COUNT, 'the suite is 154 files with this audit in it');
  eq(TEST_FILE_COUNT - BASE_TEST_FILE_COUNT, 1, '…one more than the base carried');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The boundary and the seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(MARKS.indexOf(RAW_AT) >= 0, 'the region opens on a top-level banner');
  ok(MARKS.indexOf(RAW_END) >= 0, '…and its seam is another');
  ok(/^\/\/ ── VEGA MONITOR RATIOS/.test(lineAt(RAW_AT)),
    '…a single-line `// ── ` banner, so the header-splitting shape #441 found cannot apply here');
  ok(/^\/\/ ── POSITIONS PANEL/.test(lineAt(RAW_END)),
    'what follows the seam is the POSITIONS PANEL section — a different concern');

  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next banner');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts the boundary on all four invariants');
  eq(Array.from(CODE.slice(RAW_AT, RAW_END)).length, RAW_CHARS, 'the raw block is 1,762 units');
  eq(sha256(CODE.slice(RAW_AT, RAW_END)), RAW_SHA256, '…hashing to the pinned digest');
  eq(Array.from(BODY).length, MODULE_CHARS, '…and the module body 1,761');
  eq(sha256(BODY), MODULE_SHA256, '…hashing to the digest Phase 2 must reproduce');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', 'the raw block is the body plus one LF');
  eq(BODY.slice(-2), BODY_ENDING, 'the body ends on a closing brace and a newline');
  ok(!BODY.endsWith('\n\n'), '…and not on a blank line');

  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');
  throwsWith(() => assertSeam(CODE, RAW_AT, RAW_END),
    'EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE', 'control — extending onto the banner is refused');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The screen, rebuilt — 42 headers the old walk cut in half');
// ─────────────────────────────────────────────────────────────────────────────
const REGION_START_LIST = (() => {
  const isRule = (at) => /^\/\/ ═══/.test(lineAt(at));
  const opens = (at) => isRule(at) && /^\s*\/\//.test(lineAt(nextLine(at)));
  const closes = (at) => isRule(at) && !/^\s*\/\//.test(lineAt(nextLine(at)));
  const out = []; let merged = 0;
  for (let i = 0; i < MARKS.length; i++) {
    const at = MARKS[i];
    if (closes(at) && i > 0 && opens(MARKS[i - 1])) {
      const between = CODE.slice(MARKS[i - 1], at);
      if (between.split('\n').slice(0, -1).every(isBlankOrComment)) { merged++; continue; }
    }
    out.push(at);
  }
  return { starts: out, merged };
})();
{
  eq(MARKS.length, BANNER_MARKS, '183 banner marks sit at top level');
  eq(REGION_START_LIST.merged, MERGED_CLOSING_RULES,
    'FORTY-TWO of them are a header’s closing rule, merged into the header they close');
  eq(REGION_START_LIST.starts.length, REGION_STARTS, '…leaving 141 region starts');
  eq(MARKS.length - REGION_START_LIST.merged, REGION_STARTS, 'the arithmetic closes');
  ok(REGION_START_LIST.starts.indexOf(RAW_AT) >= 0, 'the recommendation is one of them');
  {
    // A control on the merge rule itself: it must merge a real header and leave
    // a `// ── ` banner alone, or "42" is indistinguishable from a fixed number.
    const rule = '// ═══════════\n';
    const header = rule + '// TITLE\n' + rule + 'var x = 1;\n';
    const dash = '// ── THING ──\nvar y = 1;\n';
    const hMarks = topLevelBanners(header, []);
    eq(hMarks.length, 2, 'control — a four-line header produces TWO marks');
    const dMarks = topLevelBanners(dash, []);
    eq(dMarks.length, 1, '…and a `// ── ` banner produces one');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. A fourth direction — and the count that was wrong the first time');
// ─────────────────────────────────────────────────────────────────────────────
const REGIONS = (() => {
  const starts = REGION_START_LIST.starts;
  const out = [];
  const SRC = LOCALS.map((rel) => {
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return { rel, masked: maskLiterals(raw), bound: locallyBound(raw), bodies: functionBodyRanges(raw) };
  });
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = i + 1 < starts.length ? starts[i + 1] : CODE.length;
    const own = ALL_DECLS.filter((d) => d.start >= s && d.start + d.chars <= e);
    if (!own.length) continue;
    const names = new Set(own.map((d) => d.name));
    let inbound = 0;
    for (const n of names) for (const p of refSites(VIEWS.code, n)) if (p < s || p >= e) inbound++;
    const body = VIEWS.code.slice(s, e);
    let outWrites = 0;
    for (const b of propertyWriteBases(body)) if (!names.has(b) && MONOLITH_OWNED.has(b)) outWrites++;
    const deps = new Set();
    for (const d of ALL_DECLS) {
      if (names.has(d.name) || (d.start >= s && d.start < e)) continue;
      if (refSites(body, d.name).length) deps.add(d.name);
    }
    let sibling = 0, siblingNaive = 0, siblingAtLoad = 0;
    for (const f of SRC) for (const n of names) {
      const hits = refSites(f.masked, n);
      siblingNaive += hits.length;
      if (f.bound.has(n)) continue;
      sibling += hits.length;
      for (const p of hits) if (!f.bodies.some((r) => p >= r.start && p <= r.end)) siblingAtLoad++;
    }
    out.push({ start: s, units: e - s, inbound, outWrites, outDeps: deps.size, sibling, siblingNaive,
      siblingAtLoad,
      total: inbound + outWrites + deps.size, appTotal: inbound + outWrites + deps.size + sibling });
  }
  return out;
})();
{
  eq(REGIONS.length, REGIONS_WITH_OWNERS, 'ninety-eight of the regions carry an owner');
  eq(REGIONS.reduce((a, r) => a + r.siblingNaive, 0), SIBLING_NAIVE,
    'a plain identifier scan reports 1,180 sibling references');
  eq(REGIONS.reduce((a, r) => a + r.sibling, 0), SIBLING_TOTAL,
    '…and 1,110 survive removing names the sibling binds ITSELF');
  eq(SIBLING_NAIVE - SIBLING_TOTAL, SIBLING_CONFOUND, 'seventy were the confound');
  {
    // The confound, named. `field` is a callback parameter in that sibling, not
    // a call to the monolith's `field()`.
    const parity = fs.readFileSync(path.join(ROOT, 'js/services/portfolio-stress-parity.js'), 'utf8');
    ok(refSites(maskLiterals(parity), 'field').length > 0, 'the sibling does contain the name `field`');
    ok(locallyBound(parity).has('field'), '…and binds it itself, so it is not a monolith reference');
    ok(MONOLITH_OWNED.has('field'), '…while the monolith really does declare a `field`, which is why it matched');
  }
  eq(REGIONS.filter((r) => r.sibling > 0).length, REGIONS_WITH_SIBLING_REFS,
    'fifty-nine of the ninety-eight carry a sibling reference the screen does not count');

  // AND NOT ONE OF THOSE 1,110 RUNS AT LOAD. That is the fact that makes the
  // direction safe to act on: a sibling loads BEFORE any module cut from the
  // monolith, so a name it read at evaluation time would be undefined. Every one
  // of them is inside a function body. The confounded first cut of this scan
  // reported one region that did — it was `field` again.
  eq(REGIONS.reduce((a, r) => a + r.siblingAtLoad, 0), SIBLING_LOAD_TIME_READERS,
    'not one sibling reference is read at EVALUATION time');
  {
    const probe = 'var A = someMonolithName;\nfunction f(){ return someMonolithName; }\n';
    const bodies = functionBodyRanges(probe);
    const hits = refSites(maskLiterals(probe), 'someMonolithName');
    eq(hits.length, 2, 'control — the probe names it twice');
    eq(hits.filter((p) => !bodies.some((r) => p >= r.start && p <= r.end)).length, 1,
      '…and the detector reports exactly the ONE that runs at load');
  }

  const byThree = REGIONS.slice().sort((a, b) => a.total - b.total || b.units - a.units);
  const byFive = REGIONS.slice().sort((a, b) => a.appTotal - b.appTotal || b.units - a.units);
  eq(byThree.findIndex((r) => r.start === RAW_AT) + 1, RANK_BY_THREE,
    'the recommendation ranks FIRST on the three monolith-internal directions');
  eq(byFive.findIndex((r) => r.start === RAW_AT) + 1, RANK_BY_FIVE, '…and first with the sibling direction too');
  eq(byThree.findIndex((r) => r.start === RUNNER_UP_START) + 1, RUNNER_UP_BY_THREE,
    'the region that ties it on those three ranks second');
  eq(byFive.findIndex((r) => r.start === RUNNER_UP_START) + 1, RUNNER_UP_BY_FIVE,
    '…and falls to THIRTEENTH once its six sibling references are counted');
  eq(REGIONS.filter((r) => r.appTotal === 1).length, REGIONS_AT_ONE,
    'exactly ONE region in the monolith has a single reference in the whole application');
  for (const row of RANKING) {
    const r = REGIONS.find((x) => x.start === row.start);
    eq({ start: r.start, inbound: r.inbound, outWrites: r.outWrites, outDeps: r.outDeps,
      sibling: r.sibling, units: r.units }, row, 'ranking row @' + row.start + ' is as published');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. `bindingNames` does not report a function declaration');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(BINDING_FORMS, BINDING_FORMS_EXPECTED, 'BINDING_FORMS is var, const and let — `function` is absent');
  eq(bindingNames(scanTopLevelDeclarations('function f(){ return 1; }\n')), [],
    'so a function-only region reports NO binding at all');
  eq(bindingNames(scanTopLevelDeclarations('var v = 1;\n')), ['v'], 'control — a `var` is reported');
  eq(bindingNames(scanTopLevelDeclarations('const c = 1;\n')), ['c'], '…and a `const`');

  // THE SEMANTICS, in a VM rather than from memory: a function declaration is
  // an assignable binding, so "owns no binding" does not follow from an empty list.
  {
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext('function f(){ return 1; }\nf = 42;\n', ctx);
    eq(ctx.f, 42, 'a function declaration CAN be assigned through — f === 42 after `f = 42`');
    eq(typeof ctx.f, 'number', '…so it is a mutable binding like any other');
  }
  {
    const ctx = {};
    vm.createContext(ctx);
    assert.throws(() => vm.runInContext('const c = 1;\nc = 2;\n', ctx), /Assignment to constant/);
    pass++;
  }

  // THE BLAST RADIUS, measured over the whole chain rather than the layer at hand.
  const noBinding = [];
  let unreported = 0;
  for (const rel of CHAIN) {
    const decls = scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    if (bindingNames(decls).length === 0) {
      noBinding.push(rel);
      unreported += decls.filter((d) => d.form === 'function').length;
    }
  }
  eq(CHAIN.length, CHAIN_LENGTH, 'twenty-five layers ship today');
  eq(noBinding.length, LAYERS_WITH_NO_REPORTED_BINDING,
    'ELEVEN of them return the empty list from bindingNames');
  eq(unreported, UNREPORTED_FUNCTION_BINDINGS,
    '…while owning THIRTY-FOUR assignable function bindings between them');
  ok(noBinding.indexOf('js/portfolio/portfolio-dxlink-greeks.js') >= 0,
    'the greeks layer is one of the eleven');

  // AND THE SHIPPED CONSEQUENCE. #439's contract reads that empty list as
  // "owns no binding", which is what makes its inbound zero "vacuous".
  const greeks = fs.readFileSync(path.join(ROOT, VACUITY_CLAIM_FILE), 'utf8');
  ok(greeks.indexOf('the module owns no binding at all') >= 0,
    'the greeks contract asserts the module owns no binding at all');
  ok(greeks.indexOf('VACUOUS') >= 0, '…and calls the inbound zero VACUOUS on that basis');

  // And it is not alone. Measured over the whole suite rather than the file at
  // hand, because that is how the "two" in this audit's own header got written.
  const claimants = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /\.test\.js$/.test(f))
    .map((f) => 'tests/' + f)
    .filter((rel) => {
      if (rel === AUDIT_REL) return false;
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      return /bindingNames\(OWNERS\)(?:\.length)?,\s*(?:\[\]|0)/.test(src)
        && /vacuous/i.test(src);
    })
    .sort();
  eq(claimants, VACUITY_CLAIM_CONTRACTS,
    'FOUR contracts rest a vacuity claim on an empty bindingNames, not two');
  ok(claimants.indexOf(VACUITY_CLAIM_FILE) >= 0, '…the greeks contract among them');
  {
    const owners = scanTopLevelDeclarations(
      fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-dxlink-greeks.js'), 'utf8'));
    eq(owners.filter((d) => d.form === 'function').length, 2,
      'that module owns TWO function declarations…');
    eq(bindingNames(owners), [], '…which bindingNames does not report…');
    const ctx = {};
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-dxlink-greeks.js'), 'utf8'), ctx);
    vm.runInContext('fetchPortfolioGreeks = 7;\n', ctx);
    eq(ctx.fetchPortfolioGreeks, 7,
      '…and which an outside write reaches perfectly well, so that zero is a MEASUREMENT, not a vacuity');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The recommendation — one reference in the whole application');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(OWNERS.length, OWNER_COUNT, 'the region declares exactly one name at top level');
  eq(OWNERS[0].name, OWNER_NAME, '…computeVegaMonitorRatios');
  eq(OWNERS[0].form, OWNER_FORM, '…a function declaration');
  eq(OWNERS[0].start, OWNER_START, '…starting 1,220 units in, after its header');
  eq(OWNERS[0].chars, OWNER_CHARS, '…and running 540 units');
  eq(statementLines(BODY, OWNERS).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declaration');

  const sites = refSites(VIEWS.code, OWNER_NAME).filter((p) => p < RAW_AT || p >= RAW_END);
  eq(sites, EDGE_SITES, 'ONE reference reaches in from the rest of the monolith');
  eq(sites.length, EXTERNAL_EDGES, '…exactly one');
  ok(sites.every(insideFunction), '…inside a function body, so it does not run at load');
  {
    const head = CODE.lastIndexOf('function ', FN_BODIES.filter((r) => sites[0] >= r.start && sites[0] <= r.end)
      .sort((a, b) => b.start - a.start)[0].start);
    ok(CODE.slice(head, head + 60).indexOf(EDGE_ENCLOSING) > 0,
      '…and that function is renderPositionsPanel');
  }
  eq(sites.filter((p) => isWriteAt(VIEWS.code, p, OWNER_NAME)).length, INBOUND_WRITES,
    'it is a READ — and §5 just proved a write was possible, so this zero measures something');
  {
    const probe = OWNER_NAME + ' = 1;\n';
    eq(refSites(probe, OWNER_NAME).filter((p) => isWriteAt(probe, p, OWNER_NAME)).length, 1,
      'control — the write detector finds a write when there is one');
  }
  eq(refSites(VIEWS.strings, OWNER_NAME).length, 0, 'no string or comment in the monolith names it');

  eq(propertyWriteBases(MASKED_BODY).filter((b) => b !== OWNER_NAME && MONOLITH_OWNED.has(b)).length,
    OUTBOUND_WRITES, 'it writes no property on any binding the monolith owns');
  const deps = ALL_DECLS.filter((d) => d.name !== OWNER_NAME && refSites(MASKED_BODY, d.name).length)
    .map((d) => d.name).sort();
  eq(deps, MONOLITH_DEPENDENCIES, 'and it names NOTHING the monolith declares — both inputs are parameters');
  ok(ALL_DECLS.length > 900, '…checked against every top-level name the monolith declares');

  let sib = 0;
  for (const rel of LOCALS) {
    const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    if (locallyBound(raw).has(OWNER_NAME)) continue;
    sib += refSites(maskLiterals(raw), OWNER_NAME).length;
  }
  eq(sib, SIBLING_REFERENCES, 'not one of the sixty-nine shipped modules names it');
  const markup = INDEX.slice(0, CODE_AT) + INDEX.slice(CODE_AT + CODE.length);
  eq(refSites(maskLiterals(markup), OWNER_NAME).length, MARKUP_REFERENCES, 'nor does the generated markup');
  eq(EXTERNAL_EDGES + SIBLING_REFERENCES + MARKUP_REFERENCES, APPLICATION_REFERENCES,
    'ONE reference in the entire application');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare — and COMPUTES with no host at all');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(evaluationTimeReads(BODY, OWNERS, maskLiterals), [], 'the scan reports nothing read at evaluation time');
  {
    // #440 established this scan is blind to declaration initialisers. Here the
    // region is a function declaration, so there is no initialiser to miss —
    // but the VM load is still what proves it, and the probe records why.
    const probe = 'var T = { a: elsewhere };\n';
    eq(evaluationTimeReads(probe, scanTopLevelDeclarations(probe), maskLiterals), [],
      'control — the scan stays empty for an initialiser that DOES read at load');
    const stmt = 'window.h = elsewhere;\n';
    eq(evaluationTimeReads(stmt, scanTopLevelDeclarations(stmt), maskLiterals), ['elsewhere', 'window'],
      '…and reports a top-level STATEMENT correctly');
  }
  const bare = {};
  vm.createContext(bare);
  vm.runInContext(BODY, bare, { filename: MODULE_REL });
  eq(Object.keys(bare).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM');
  eq(Object.keys(bare), [OWNER_NAME], '…defining exactly its one owner');
  eq(bare[OWNER_NAME].constructor.name, 'Function', '…a plain function, not async');

  // It WORKS with no host — loading is not the same as running.
  eq(bare[OWNER_NAME](100, { callLongVega: 20, callShortVegaAbs: 10 }).vegaLongCallOverShortCall, 2,
    'the ratio computes from its two arguments alone');
  eq(bare[OWNER_NAME](0, { callLongVega: 1, callShortVegaAbs: 0 }).vegaLongCallOverShortCall, null,
    '…and a zero denominator returns null rather than Infinity');
  eq(bare[OWNER_NAME](100, {}).bwdOverVegaLongPut, null, '…as does a missing input');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The modelled extraction — the figures Phase 2 must reproduce');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(TAG.length, TAG_CHARS, 'the tag line is 65 units');
  eq(INDEX.split(ANCHOR_TAG).length - 1, 1, 'the anchor tag appears exactly once');
  ok(INDEX.indexOf(ANCHOR_TAG + INLINE_OPEN) >= 0,
    '…immediately before the inline monolith, which is where the new tag goes');
  eq(INDEX.indexOf(TAG), -1, 'the new tag is NOT in the document yet — this is Phase 1');
  ok(!fs.existsSync(path.join(ROOT, MODULE_REL)), '…and the module file does not exist yet');
  ok(fs.existsSync(path.join(ROOT, 'js/portfolio')), 'js/portfolio already exists, so the path is not new');

  const docAt = CODE_AT + RAW_AT;
  const docEnd = CODE_AT + RAW_END;
  eq(INDEX.slice(docAt, docEnd), CODE.slice(RAW_AT, RAW_END),
    'the monolith range maps to the document range Phase 2 will cut');
  const withoutRaw = INDEX.slice(0, docAt) + INDEX.slice(docEnd);
  const insertAt = withoutRaw.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length;
  const extracted = withoutRaw.slice(0, insertAt) + TAG + withoutRaw.slice(insertAt);

  eq(extracted.length, EXTRACTED_CHARS, 'the extracted document is 1,568,182 units');
  eq(Buffer.byteLength(extracted, 'utf8'), EXTRACTED_UTF8, '…1,597,962 bytes');
  eq((extracted.match(/\n/g) || []).length, EXTRACTED_LF, '…27,291 line feeds');
  eq(sha256(extracted), EXTRACTED_SHA256, '…and hashes to the digest Phase 2 must produce');
  eq(BASE_CHARS - RAW_CHARS + TAG_CHARS, EXTRACTED_CHARS, 'the arithmetic closes: base − raw + tag');
  const exLocals = APP_LOADER.parseScriptTags(extracted).filter((t) => t.src && /^\.\//.test(t.src))
    .map((t) => t.src.replace(/^\.\//, ''));
  eq(exLocals.length, EXTRACTED_LOCAL_SCRIPTS, '…carrying seventy local scripts');
  eq(exLocals.indexOf(MODULE_REL), MODULE_POSITION, '…the new one last, at position 69');
  ok(insertAt - TAG.length < docAt,
    'the tag lands before the cut, so the base offset applies once it is removed');
  eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, 'the residual monolith would be 1,454,127 units');

  // The round trip Phase 2's helper will have to reproduce, proved here.
  const untagged = extracted.slice(0, extracted.indexOf(TAG))
    + extracted.slice(extracted.indexOf(TAG) + TAG.length);
  eq(untagged.slice(0, docAt) + BODY + '\n' + untagged.slice(docAt), INDEX,
    'and the move is reversible byte for byte');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is untouched');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NO production file changed — this is a measurement, not a move');
  eq(git(['diff', '--name-only', BASE_SHA, '--', 'index.html', 'js/']).trim(), '',
    '…asserted against git, not inferred from the diff');
  ok(changed.every((rel) => rel.startsWith('tests/') || rel === 'CLAUDE.md'),
    'every changed path is a test artifact');

  const added = changed.filter((rel) => !fileExistsAt(BASE_SHA, rel)).sort();
  eq(added, ADDED_FILES, 'exactly two files are added: this audit and its mutation spec');

  // The ratchet, audited line by line rather than trusted.
  ok(changed.indexOf(HARNESS_FIX) >= 0, 'the mutation harness carries the baseline check this cycle added');
  {
    const before = git(['show', BASE_SHA + ':' + HARNESS_FIX]);
    const after = fs.readFileSync(path.join(ROOT, HARNESS_FIX), 'utf8');
    ok(before.indexOf('MUTATION_BASELINE_RED') < 0, '…which the base did not have');
    ok(after.indexOf('MUTATION_BASELINE_RED') >= 0, '…and the working tree does');
  }
  const ratcheted = changed.filter((rel) => rel !== AUDIT_REL && rel !== AUDIT_SPEC_REL
    && rel !== HARNESS_FIX && MUTATION_BOOKKEEPING.indexOf(rel) < 0);
  eq(ratcheted.length, RATCHETED_CONTRACTS, 'fifteen contracts carry the suite-count ratchet');
  for (const rel of ratcheted) {
    const before = git(['show', BASE_SHA + ':' + rel]);
    const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const diffLines = [];
    const b = before.split('\n'), a = after.split('\n');
    eq(b.length, a.length, rel + ': the ratchet changes no line count');
    for (let i = 0; i < b.length; i++) if (b[i] !== a[i]) diffLines.push([b[i], a[i]]);
    eq(diffLines.length, 1, rel + ': exactly one line differs');
    eq(diffLines[0][0], 'const TEST_FILE_COUNT = ' + BASE_TEST_FILE_COUNT + ';', rel + ': …and it was the count');
    eq(diffLines[0][1], 'const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';', rel + ': …ratcheted by one');
  }
  // Kept apart because it is NOT the same edit: these re-pin mutation constants
  // the ratchet itself moved, which is the rot §2 of the coverage contract
  // exists to catch.
  for (const rel of MUTATION_BOOKKEEPING) {
    ok(changed.indexOf(rel) >= 0, rel + ': re-pinned because the ratchet moved a constant it names');
  }

  // AND WHAT THE RATCHET DOES NOT CARRY. The comment beside that constant is
  // prose, so nothing has ever failed when it drifted. Five of the fifteen still
  // explain a count of 142 — twelve cycles and twelve ratchets ago. Asserted
  // here rather than corrected, because correcting it would put a second changed
  // line in files whose whole edit is audited above.
  const stale = [];
  for (const rel of ratcheted) {
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
    const i = lines.indexOf('const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';');
    let j = i - 1; const comment = [];
    while (j >= 0 && /^\/\//.test(lines[j])) { comment.unshift(lines[j]); j--; }
    const nums = (comment.join(' ').match(/\b1[0-9]{2}\b/g) || []);
    if (nums.length && nums.indexOf(String(TEST_FILE_COUNT)) < 0) stale.push(rel);
  }
  eq(stale.length, STALE_RATCHET_COMMENTS,
    'FIVE of the fifteen explain the ratchet with a count that is no longer the count');
  ok(stale.every((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').indexOf(STALE_RATCHET_NUMBER) >= 0),
    '…and the number each of them names is 142');
  ok(stale.indexOf('tests/apex-post-auth-init-boundary-contract.test.js') >= 0,
    '…apex-post-auth-init among them');
}

function fileExistsAt(sha, rel) {
  try { git(['cat-file', '-e', sha + ':' + rel]); return true; } catch (e) { return false; }
}

console.log('\n' + pass + ' assertions passed.');
console.log('VEGA_MONITOR_AUDIT_OK');
