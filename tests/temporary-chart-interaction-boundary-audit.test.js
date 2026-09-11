'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// CHART INTERACTION FAMILY — TEMPORARY BOUNDARY AUDIT.
//
// Phase 1. MEASUREMENT ONLY: index.html and every shipped module are
// byte-identical to the base commit, and §10 asserts that against git rather
// than trusting the diff. Phase 2 deletes this file.
//
// RECOMMENDATION: [164995,184045) in monolith coordinates — 19,050 units, the
// chart's interaction family. SEVENTEEN owners (twelve functions, five vars):
// three formatters, three view constants, the view-window resolver, the redraw
// and hover engine, and the drag/pan dispatcher. 296 lines of code.
//
// ITS ENTIRE EXTERNAL COUPLING IS SIX CALL SITES INSIDE ONE FUNCTION. Every
// inbound reference — all six — sits inside `_drawCandleChart`, which begins at
// 184045, exactly where this region ends. Nothing else in 1,445,194 units of
// monolith names any of the seventeen. In the other direction the family names
// `_drawCandleChart` once, from inside `_chartRedraw`. So the coupling is one
// bidirectional pair with a single adjacent neighbour, and §4 measures it.
//
// THIS AUDIT'S REAL FINDING IS THE BOUNDARY, NOT THE SCORE. Three ends were
// measured from the SAME start, and they do not rank the way size would suggest:
//
//     end      units    seven   seam
//     166016    1,021       4   accepted
//     176824   11,829      16   REFUSED
//     184045   19,050       7   accepted
//
// The middle one is the lesson. At 11,829 units it is under two-thirds the size
// of the full family and scores more than TWICE as much — 16 against 7 — because
// nine of its fifteen inbound edges are INTERNAL edges that the cut exposes and
// the full cut never creates: `_chartXSpan`, `_chartRedraw`,
// `_chartClearHover` and `_chartDrawHover` are all called from the drag code the
// cut leaves behind. Taking the whole family removes those nine edges by not
// creating them. `assertSeam` refuses that boundary outright, independently.
//
// AND THE BANNER OVER-PROMISES, which is new evidence for the rule CLAUDE.md
// already states. The region opens on `// ── Interactive crosshair / tooltip
// engine for _drawCandleChart ──`, but the engine is not under it: the three
// functions there are formatters, and `_chartDrawHover` — 5,592 units, the
// actual engine — sits under the NEXT banner, the one headed "Horizontal zoom /
// pan view window". A screen that trusts the banner as the boundary takes the
// helpers and leaves the engine. §5 pins that, including the count: this line
// first said "two banners further down", which was written from impression.
//
// THE SCREEN'S BEST-SCORING EXTRACTABLE REGION IS NOT THE RECOMMENDATION.
// [164995,166016) scores 4 against this one's 7, and is deferred on VALUE: it is
// 1,021 units wrapping FIFTEEN lines of code. That is the judgement #446 already
// recorded for `CONFIGURATION` [1,924), which scores 2 — the best on the whole
// screen — and is 923 units wrapping THREE lines. §7 measures both rather than
// citing them, and the recommendation carries 296 lines for its 7.
//
// THE MUTANT BUDGET STAYS AT 250. #446 established that the floor rises by one
// contract spec every cycle, so raising the ceiling buys exactly one cycle and
// retiring one older spec per new layer is the only flat policy. #446 retired
// layer #24's spec; this one retires layer #25's — strategy-templates, 52
// mutants, shipped in #441. Its CONTRACT still runs on every push with every
// assertion intact; what stops is the mutation pass re-proving them.
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

// ── The base ─────────────────────────────────────────────────────────────────
const BASE_SHA = 'eeb34a3';
const BASE_CHARS = 1559378;
const BASE_UTF8 = 1589134;
const BASE_LF = 27106;
const BASE_SHA256 = '41d643cf7e4700d468df93f9cca638e6711d42963447b10c252e7b291fd26ed9';
const LOCAL_SCRIPTS = 72;
const BASE_TEST_FILE_COUNT = 156;
const TEST_FILE_COUNT = 157;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-chart-interaction-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/chart-interaction-audit.spec.js';
const RATCHETED_CONTRACTS = 18;
const SPEC_RETIREMENT_CONTRACT = 'tests/strategy-templates-boundary-contract.test.js';
const RETIRED_SPEC = 'tests/mutation-specs/strategy-templates-contract.spec.js';
const RETIRED_SPEC_MUTANTS = 52;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114158;
const CODE_CHARS = 1445194;
const TOP_LEVEL_DECLS = 973;
const BANNER_MARKS = 180;
const MERGED_REGIONS = 106;
const OWNER_REGIONS = 95;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT = 164995;
const RAW_END = 184045;
const BODY_END = 184044;
const RAW_CHARS = 19050;
const BODY_CHARS = 19049;
const BODY_UTF8 = 19795;
const BODY_LF = 392;
const BODY_SHA256 = '0309aae1c0bcc487b60a170f26db1ea0694bfc0b064efcb44377745f2bad3b07';
const BODY_ENDING = '}\n';
const OWNER_COUNT = 17;
const FUNCTION_OWNERS = 12;
const VAR_OWNERS = 5;
const CODE_LINES = 296;
const OWNERS_EXPECTED = [
  '_chartPad2', '_chartFmtDateTime', '_chartFmtVol',
  '_CHART_DEFAULT_VISIBLE', '_CHART_MIN_VISIBLE', '_CHART_RIGHT_PAD_SLOTS',
  '_chartXSpan', '_chartViewKey', '_chartResolveView', '_chartRedraw',
  '_chartClearHover', '_chartDrawHover',
  '_chartDragState', '_chartDragBound', '_chartEndDrag',
  '_chartEnsureDragDispatcher', '_chartBindInteractions',
];

// ── Coupling, in all seven directions ────────────────────────────────────────
const EXTERNAL_EDGES = 6;
const EDGE_SITES = [185490, 190278, 198935, 198965, 202147, 204246];
const INBOUND_WRITES = 0;
const INBOUND_PROPERTY_WRITES = 0;
const OUTBOUND_WRITES = 0;
const MONOLITH_DEPENDENCIES = ['_drawCandleChart'];
const DEPENDENCY_CALL_SITES = 1;
const SIBLING_REFERENCES = 0;
const MARKUP_REFERENCES = 0;
const GENERATED_MARKUP_REFERENCES = 0;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 17;

// The one neighbour every edge runs to, and its extent.
const NEIGHBOUR = '_drawCandleChart';
const NEIGHBOUR_AT = 184045;
const NEIGHBOUR_CHARS = 20282;

// ── The three ends ───────────────────────────────────────────────────────────
const NARROW_END = 166016;
const NARROW_UNITS = 1021;
const NARROW_SEVEN = 4;
const NARROW_OWNERS = 3;
const NARROW_CODE_LINES = 15;
const MID_END = 176824;
const MID_UNITS = 11829;
const MID_SEVEN = 16;
const MID_SEAM_ERROR = 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR';
const FULL_SEVEN = 7;
// The engine the head banner names, and where it actually is.
const HEAD_BANNER = '// ── Interactive crosshair / tooltip engine for _drawCandleChart ──────────────';
const ENGINE = '_chartDrawHover';
const ENGINE_CHARS = 5592;
const BANNERS_BETWEEN_HEAD_AND_ENGINE = 1;
const ENGINE_BANNER = '// ── Horizontal zoom / pan view window for _drawCandleChart ───────────────────';

// ── The value judgement this shares with CONFIGURATION ───────────────────────
const CONFIG_REGION = [1, 924];
const CONFIG_SEVEN = 2;
const CONFIG_CODE_LINES = 3;

// ── The chain it would join ──────────────────────────────────────────────────
const NEWEST_CONTRACT = 'tests/scanner-earnings-throttle-boundary-contract.test.js';
const CHAIN_LAYERS = 28;
const SIZE_RANK_IF_CUT = 21;
const LARGEST_LAYER_CHARS = 71811;

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

console.log('CHART INTERACTION FAMILY — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

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
  return { rel, masked: maskLiterals(src), bound: locallyBound(src) };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');

// The region model the screen uses: one column-0 banner to the next, with the
// header-merge rule #441 established.
const rawRegions = MARKS.map((s, i) => ({ start: s, end: i + 1 < MARKS.length ? MARKS[i + 1] : CODE.length }));
const REGIONS = [];
for (let i = 0; i < rawRegions.length; i++) {
  let r = rawRegions[i];
  while (i + 1 < rawRegions.length) {
    const between = CODE.slice(r.start, rawRegions[i + 1].start);
    if (between.split('\n').some((l) => !isBlankOrComment(l))) break;
    r = { start: r.start, end: rawRegions[i + 1].end }; i++;
  }
  REGIONS.push(r);
}
const OWNED_REGIONS = REGIONS.filter((r) => DECLS.some((d) => d.start >= r.start && d.end < r.end));

// The seven-direction profile of a range.
function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0;
  const sites = [];
  for (const n of names) {
    for (const at of refSites(MASKED, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += refSites(STRINGS, n).filter(outside).length;
  }
  const outWrites = new Set(propertyWriteBases(bodyMasked).filter((b) => !nameSet.has(b) && BY_NAME.has(b)));
  const local = locallyBound(CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (refSites(bodyMasked, d.name).length) deps.add(d.name);
  }
  let sib = 0;
  for (const n of names) for (const s of SIBLINGS) if (!s.bound.has(n)) sib += refSites(s.masked, n).length;
  let mkp = 0;
  for (const n of names) mkp += refSites(STATIC_MARKUP, n).length;
  const five = inbound + inWrites + outWrites.size + deps.size + sib + mkp;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp,
    outWrites: Array.from(outWrites).sort(), deps: Array.from(deps).sort(),
    sites: sites.sort((a, b) => a - b),
    five, seven: five + inPropWrites + gen,
  };
}

const REC = profile([RAW_AT, RAW_END]);
const BODY = CODE.slice(RAW_AT, BODY_END);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.length, BASE_CHARS, 'index.html is 1,559,378 units');
  eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…1,589,134 bytes');
  eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…27,106 line feeds');
  eq(sha256(INDEX), BASE_SHA256, '…and hashes to the base digest');
  eq(LOCALS.length, LOCAL_SCRIPTS, 'seventy-two local scripts ship today');
  eq(INDEX, git(['show', BASE_SHA + ':index.html']),
    'and the working tree is byte-identical to the base commit');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The monolith, and the region model the screen uses');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at 114,158');
  eq(CODE.length, CODE_CHARS, '…and is 1,445,194 units');
  eq(DECLS.length, TOP_LEVEL_DECLS, 'it declares 973 names at top level');
  eq(MARKS.length, BANNER_MARKS, '180 column-0 banner marks');
  eq(REGIONS.length, MERGED_REGIONS, '…merging to 106 regions under the header rule');
  eq(OWNED_REGIONS.length, OWNER_REGIONS, '…of which 95 carry a top-level declaration');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The recommended region, its boundary and its seam');
// ─────────────────────────────────────────────────────────────────────────────
{
  ok(CODE[RAW_AT - 1] === '\n', 'the region opens on a line start');
  eq(CODE.slice(RAW_AT, CODE.indexOf('\n', RAW_AT)), HEAD_BANNER,
    '…on the crosshair banner — the one §5 shows is not where the engine is');
  eq(snapBodyEnd(CODE, RAW_AT, RAW_END), BODY_END, 'snapBodyEnd lands one unit short of the next line');
  eq(assertSeam(CODE, RAW_AT, BODY_END), RAW_END, 'assertSeam accepts it on all four invariants');
  throwsWith(() => assertSeam(CODE, RAW_AT + 1, BODY_END),
    'EXTRACTION_SEAM_NOT_LINE_START', 'control — a start one unit in is refused');

  eq(RAW_END - RAW_AT, RAW_CHARS, 'the raw fragment is 19,050 units');
  eq(BODY.length, BODY_CHARS, '…of which the body is 19,049');
  eq(CODE.slice(RAW_AT, RAW_END), BODY + '\n', '…and raw IS body plus one structural line feed');
  eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, 'the body is 19,795 bytes');
  eq((BODY.match(/\n/g) || []).length, BODY_LF, '…392 line feeds');
  eq(sha256(BODY), BODY_SHA256, '…and this is the digest Phase 2 must reproduce');
  eq(BODY.slice(-2), BODY_ENDING, 'it ends `}\\n`');

  const owners = scanTopLevelDeclarations(BODY);
  eq(owners.length, OWNER_COUNT, 'seventeen top-level owners');
  eq(owners.map((d) => d.name), OWNERS_EXPECTED, '…in this order');
  eq(owners.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, 'twelve are functions');
  eq(owners.filter((d) => d.form === 'var').length, VAR_OWNERS, '…and five are vars');
  eq(codeLines(BODY), CODE_LINES, 'the body carries 296 lines of code');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Coupling, in all seven directions — and it runs to ONE neighbour');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(REC.sites, EDGE_SITES, 'SIX references reach in from the rest of the monolith');
  eq(REC.inbound, EXTERNAL_EDGES, '…exactly six');
  ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');

  // THE FACT THAT MAKES THIS REGION WORTH TAKING WHOLE.
  const neighbour = BY_NAME.get(NEIGHBOUR);
  eq(neighbour.start, NEIGHBOUR_AT, '_drawCandleChart begins at 184,045 — exactly where this region ends');
  eq(neighbour.chars, NEIGHBOUR_CHARS, '…and runs 20,282 units');
  ok(REC.sites.every((i) => i >= neighbour.start && i < neighbour.start + neighbour.chars),
    'ALL SIX inbound references sit inside that one function, and nothing else names the seventeen');

  eq(REC.inWrites, INBOUND_WRITES, 'nothing outside assigns TO a name this region owns');
  eq(REC.inPropWrites, INBOUND_PROPERTY_WRITES, '…and nothing writes THROUGH one either');
  eq(REC.outWrites.length, OUTBOUND_WRITES, 'it writes through no name it does not own');
  eq(REC.deps, MONOLITH_DEPENDENCIES, 'it names exactly ONE thing the monolith declares: _drawCandleChart');
  eq(REC.sib, SIBLING_REFERENCES, 'none of the seventy-two shipped modules names it');
  eq(SIBLINGS.length, LOCAL_SCRIPTS, '…and there are seventy-two of them to have named it');
  eq(REC.mkp, MARKUP_REFERENCES, 'static markup does not name it');
  eq(REC.gen, GENERATED_MARKUP_REFERENCES, 'and neither does markup the monolith generates at runtime');
  ok(refSites(STRINGS, 'rsApplyFilters').length > 0,
    'control — the literal view DOES find rsApplyFilters, so the zero above measures');
  eq(REC.seven, FULL_SEVEN, 'seven directions, total score 7');

  // The return direction: one call, at runtime.
  const bodyMasked = maskLiterals(BODY);
  const depSites = refSites(bodyMasked, NEIGHBOUR);
  eq(depSites.length, DEPENDENCY_CALL_SITES, 'the family names _drawCandleChart exactly once');
  const bodyFns = functionBodyRanges(BODY);
  ok(depSites.every((i) => bodyFns.some((r) => i >= r.start && i <= r.end)),
    '…from inside a function body, so it is a RUNTIME dependency, not a load-time one');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE BOUNDARY IS THE FINDING: three ends from one start');
// ─────────────────────────────────────────────────────────────────────────────
{
  const narrow = profile([RAW_AT, NARROW_END]);
  const mid = profile([RAW_AT, MID_END]);

  eq(NARROW_END - RAW_AT, NARROW_UNITS, 'the narrow end gives 1,021 units');
  eq(narrow.seven, NARROW_SEVEN, '…scoring 4');
  eq(narrow.names.length, NARROW_OWNERS, '…over three owners');
  eq(MID_END - RAW_AT, MID_UNITS, 'the middle end gives 11,829 units');
  eq(mid.seven, MID_SEVEN, '…scoring SIXTEEN — four times the narrow cut, at eleven times the size');
  eq(REC.seven, FULL_SEVEN, '…and the full family, at 19,050 units, scores 7');

  // WHY the middle is worse: the cut CREATES the edges it then counts.
  ok(mid.inbound > REC.inbound,
    'the middle cut exposes more inbound edges than the full one, despite being smaller');
  eq(mid.inbound - REC.inbound, 9,
    '…nine more, and they are INTERNAL edges the cut turns into external ones');
  for (const n of ['_chartXSpan', '_chartRedraw', '_chartClearHover', '_chartDrawHover']) {
    ok(mid.names.indexOf(n) >= 0, n + ' is inside the middle cut…');
    ok(refSites(MASKED, n).some((i) => i >= MID_END && i < RAW_END),
      '…and is called from the drag code that the middle cut leaves behind: ' + n);
  }

  // The seam refuses it independently of any score.
  throwsWith(() => assertSeam(CODE, RAW_AT, snapBodyEnd(CODE, RAW_AT, MID_END)),
    MID_SEAM_ERROR, 'and assertSeam refuses the middle boundary outright');

  // THE BANNER OVER-PROMISES. New evidence for a rule CLAUDE.md already states:
  // taking the head banner as the boundary takes the helpers and leaves the
  // engine the banner is named after.
  ok(HEAD_BANNER.indexOf('crosshair') >= 0 && HEAD_BANNER.indexOf('tooltip') >= 0,
    'the head banner announces the crosshair / tooltip engine');
  const engine = BY_NAME.get(ENGINE);
  eq(engine.chars, ENGINE_CHARS, '_chartDrawHover — the engine — is 5,592 units');
  ok(engine.start >= NARROW_END,
    '…and it is NOT under that banner: it lies past the narrow region entirely');
  eq(MARKS.filter((m) => m > RAW_AT && m < engine.start).length, BANNERS_BETWEEN_HEAD_AND_ENGINE,
    '…with exactly ONE further banner between the one that names it and the engine');
  eq(CODE.slice(NARROW_END, CODE.indexOf('\n', NARROW_END)), ENGINE_BANNER,
    '…and that banner is the zoom/pan one, which is where the engine actually lives');
  eq(scanTopLevelDeclarations(CODE.slice(RAW_AT, NARROW_END)).filter((d) => d.form === 'function').length,
    NARROW_OWNERS, 'what IS under that banner is three formatters');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  const owners = scanTopLevelDeclarations(BODY);
  eq(evaluationTimeReads(BODY, owners, maskLiterals), EVALUATION_TIME_READS,
    'the region reads NO name at evaluation time');
  const ch = Array.from(BODY);
  for (const d of owners) for (let i = d.start; i <= d.end; i++) ch[i] = ' ';
  eq(ch.join('').split('\n').filter((l) => !isBlankOrComment(l)).length, TOP_LEVEL_STATEMENT_LINES,
    'zero top-level statement lines: nothing outside the declarations');

  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).length, VM_GLOBALS, 'it loads in a COMPLETELY empty VM, defining seventeen globals');
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(), '…exactly its own owners');
  ok(!(NEIGHBOUR in ctx), '…and _drawCandleChart is NOT among them: the dependency is called, never defined');

  const watched = [];
  const ctx2 = {
    fetch: () => { watched.push('fetch'); return Promise.resolve({}); },
    setInterval: () => { watched.push('setInterval'); },
    setTimeout: () => { watched.push('setTimeout'); },
    document: { getElementById: () => { watched.push('document'); return null; },
      addEventListener: () => { watched.push('doc.addEventListener'); } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
  };
  vm.createContext(ctx2);
  vm.runInContext(BODY, ctx2);
  eq(watched, [], 'loading it performs no fetch, starts no timer and binds no listener');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. The best-scoring region on the screen is deferred on VALUE');
// ─────────────────────────────────────────────────────────────────────────────
{
  // Two regions score better than the recommendation. Both are deferred for the
  // same reason, and it is not safety — it is how little code they carry.
  const conf = profile(CONFIG_REGION);
  eq(conf.seven, CONFIG_SEVEN, 'CONFIGURATION [1,924) scores 2');
  eq(codeLines(CODE.slice(CONFIG_REGION[0], CONFIG_REGION[1] - 1)), CONFIG_CODE_LINES,
    '…wrapping THREE lines of code in 923 units');

  eq(codeLines(CODE.slice(RAW_AT, NARROW_END - 1)), NARROW_CODE_LINES,
    'the narrow cut scores 4, wrapping FIFTEEN lines of code in 1,021 units');
  eq(codeLines(BODY), CODE_LINES, '…against the recommendation\'s 296 lines for a score of 7');

  // Stated as a ratio, because that is the axis the judgement actually runs on.
  ok(CODE_LINES / REC.seven > NARROW_CODE_LINES / NARROW_SEVEN,
    'the recommendation carries more code per point of coupling than the narrow cut');
  ok(CODE_LINES / REC.seven > CONFIG_CODE_LINES / CONFIG_SEVEN,
    '…and than CONFIGURATION, which #446 deferred on exactly this ground');

  // And the cost the narrow cut would impose on the chain, which the full one
  // does not: it would become the smallest layer and move a pinned superlative.
  const VEGA = 'js/portfolio/portfolio-vega-monitor.js';
  const vegaChars = fs.readFileSync(path.join(ROOT, VEGA), 'utf8').length;
  ok(NARROW_UNITS - 1 < vegaChars,
    'the narrow cut would displace the vega monitor as the chain\'s smallest layer…');
  ok(BODY_CHARS > vegaChars, '…which the recommendation does not');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The chain it would join');
// ─────────────────────────────────────────────────────────────────────────────
{
  const VEGA = fs.readFileSync(path.join(ROOT, NEWEST_CONTRACT), 'utf8');
  const CHAIN = new Function('MODULE_REL',
    `return ${VEGA.match(/^const CHAIN = (\[[\s\S]*?^\]);$/m)[1]};`
  )(VEGA.match(/^const MODULE_REL = '([^']+)';$/m)[1]);
  eq(CHAIN.length, CHAIN_LAYERS, 'twenty-eight layers ship today, read from the newest contract');
  eq(Number(VEGA.match(/^const CHAIN_LENGTH = (\d+);$/m)[1]), CHAIN_LAYERS,
    '…and the CHAIN_LENGTH it pins agrees with the list it ships');

  const sizes = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').length)
    .concat([BODY_CHARS]).sort((a, b) => a - b);
  eq(sizes.indexOf(BODY_CHARS) + 1, SIZE_RANK_IF_CUT,
    'cut, it would rank twenty-first of twenty-nine by size — no superlative moves');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…against a largest of 71,811');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. Production is byte-identical to the base');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [],
    'NO production file changed: this audit measures, it does not move bytes');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'CLAUDE.md' || rel.startsWith('tests/')),
    'every changed path is a test artifact');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, and the budget held flat');
// ─────────────────────────────────────────────────────────────────────────────
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();

  ok(changed.indexOf(AUDIT_REL) >= 0, 'this audit is part of the change');
  ok(changed.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite ratchets by one: 156 files before, 157 after');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length,
    BASE_TEST_FILE_COUNT, '…and 156 is what the base actually carried');

  // THE RETIREMENT, and what it costs, counted from the spec as it stood.
  ok(changed.indexOf(RETIRED_SPEC) >= 0, 'the retired mutation spec is part of the change');
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC)), '…and is gone from the tree');
  eq((git(['show', BASE_SHA + ':' + RETIRED_SPEC]).match(/^\s*\{ id: /gm) || []).length,
    RETIRED_SPEC_MUTANTS, '…having carried FIFTY-TWO mutants when it existed');
  ok(fs.existsSync(path.join(ROOT, SPEC_RETIREMENT_CONTRACT)),
    'the contract it targeted still ships');
  {
    // "Every assertion intact" is the load-bearing claim, so it is counted
    // rather than inferred from a line count. A line count would not survive
    // this cycle anyway: the retirement contract is ALSO one of the eighteen
    // that ratchet the suite file count below.
    const CALL = /\b(?:eq|ok|throwsWith|throws|deepStrictEqual|strictEqual)\s*\(/g;
    const before = git(['show', BASE_SHA + ':' + SPEC_RETIREMENT_CONTRACT]);
    const after = fs.readFileSync(path.join(ROOT, SPEC_RETIREMENT_CONTRACT), 'utf8');
    eq((after.match(CALL) || []).length, (before.match(CALL) || []).length,
      '…with exactly as many assertions as before: the spec retired, not the contract');
    ok(/ok\(!fs\.existsSync\(path\.join\(ROOT, CONTRACT_SPEC_REL\)\)/.test(after),
      '…and its spec-existence assertion is now its NEGATION, so the retirement is executed');
  }

  // THE SUITE-COUNT RATCHET, which every Phase 1 audit pays across the chain.
  {
    const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /\.test\.js$/.test(f) && f !== path.basename(AUDIT_REL))
      .filter((f) => /^const TEST_FILE_COUNT = \d+;$/m.test(
        fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
    eq(contracts.length, RATCHETED_CONTRACTS, 'EIGHTEEN contracts pin the suite file count');
    // Built from the pin, not written beside it: a literal here would be the
    // same number stated twice, which is how the five messages this change
    // repaired came to disagree with the constants they sat next to.
    const RATCHETED = new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm');
    ok(contracts.every((f) => RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
      '…and every one of them reads the ratcheted count, none left behind');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('CHART_INTERACTION_AUDIT_OK');
