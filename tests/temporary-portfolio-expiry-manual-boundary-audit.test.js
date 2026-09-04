'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// MANUAL EXPIRY RESOLUTION — TEMPORARY EXTRACTION AUDIT.
//
// PHASE 1 ONLY. This file measures. It does not extract anything, and the
// production tree it audits is byte-identical to its pinned base. §11 proves
// that: the whole committed footprint is this audit plus the suite-count
// constant in each of the SEVEN permanent contracts that pin it — seven, not
// six: the backend-portfolios contract merged in #423 joined that family, and
// the suite caught the omission when only six were ratcheted.
//
// ─────────────────────────────────────────────────────────────────────────────
// THIS AUDIT'S MAIN RESULT IS A REJECTION.
//
// The screen's first choice was the SWING TRADING SCREEN — 242,294 units, 163
// owners, and only FOUR external executable edges, landing on just TWO names:
// `_swingInit` and `_swingTeardown`, the feature's own lifecycle entry points.
// On coupling, the stated criterion, it beat everything this programme has ever
// cut. §8 measures why it cannot be taken anyway:
//
//   • it performs ONE top-level statement, `S.swing = { … };`, 4,085 units of
//     object literal, at EVALUATION time;
//   • `S` is declared `const` INSIDE the inline monolith;
//   • a module tag loads BEFORE the inline monolith.
//
// So the extracted module would run `S.swing = …` while `S` does not yet
// exist: a ReferenceError at load, taking the whole module with it. §8 shows
// the failure directly rather than arguing it.
//
// It is also not divisible. §8 measures the cost of every decile split: 26 to
// 116 cross-edges, against the 4 the whole block has. The cheapest cut is six
// times worse than taking nothing.
// ─────────────────────────────────────────────────────────────────────────────
//
// TWO DEFECTS IN THE SCREEN ITSELF, both found here, both already named in the
// repository's own list of ways ad-hoc checkers fail. §9 pins them:
//
//   1. BANNERS. The recorded screening rule reads column-0 `// ── ` banners.
//      83 banners sit at four spaces and it misses every one. Widening to any
//      indentation is worse in the other direction: 77 of the resulting marks
//      sit INSIDE function bodies and delimit nothing extractable — one
//      "16,714-unit region" held 548 units of top-level declarations and the
//      rest was a function body. The rule that holds: any indentation, OUTSIDE
//      every function body. 200 marks of 277.
//
//   2. OUTBOUND STATE. The outbound check scanned the monolith's `var`
//      declarations only. `S` is a `const`, so the check never tested it, and
//      the swing block scored a perfect ZERO outbound while writing `S.swing`
//      at load. Scanning `var`, `const` and `let` — 264 bindings, not 259 —
//      takes swing from 0 to 74 and drops the clean-both-ways set from 29 to
//      19 in THIS screen run. The monolith declares five `const` bindings —
//      APEX_BUILD_TAG, S, DEFAULT_RULES, WL, AGENTS — and a write through any
//      of them was invisible to the old rule. No claim is made about earlier
//      cycles' verdicts, which were not re-measured.
//
// THE REGION THIS AUDIT DOES RECOMMEND. Manual expiry resolution: four owners,
// 8,769 units, ZERO external executable edges, zero coupling in both directions
// under the corrected rule, zero top-level statements, and a clean load in an
// empty VM. Modest, and it passes the test that disqualified the large one.
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
const { isBlankOrComment, snapBodyEnd, assertSeam } = require('./lib/extraction-boundary.js');

// ── Pinned base: the merged #423 extraction ──────────────────────────────────
const BASE_SHA = 'e0e6675cdbea3da25a2ab28d28b4418780df12a9';
const BASE_TREE = '5708015c67830886fa6f1d6f55f00a448fcdf954';
const BASE_PARENT = '336a3391369d67d2a63721a720eb798814b72664';
const BASE_INDEX_BLOB = '19afcdbd3d453c9e9e1fe583e9a495999bb02dfc';
const BASE_SUBJECT =
  'refactor(portfolio): extract backend-backed portfolios, and make the boundary rule executable (#423)';
const BASE_CHARS = 1723800;
const BASE_UTF8 = 1756149;
const BASE_LF = 30123;
const BASE_INDEX_SHA256 = '5e820b246f62b7e874d3ebe637a1b42b370fbe34698c8980d3781e47862c5ff5';
const BASE_LOCAL_SCRIPTS = 61;
const BASE_TEST_FILES = 144;
const AUDIT_TEST_FILES = 145;

const INLINE_OPEN = '<script>';
const CODE_AT = 113448;
const CODE_END = 1723774;
const CODE_CHARS = 1610326;

// ── The recommended region, in base coordinates ──────────────────────────────
const RAW_AT = 1658581;
const RAW_END = 1667351;
const RAW = { chars: 8770, utf8: 8802, lf: 163,
  sha: 'c1ef56973114cc5c2f2eeb12ae11bd7a0338cf6a886b3d56158a5cbf57b8a297' };
const BODY = { chars: 8769, utf8: 8801, lf: 162,
  sha: 'f53fd7dca65f0dd4c2909d96c91e9e38c483ed97e7d7c9fde5ba5d2e72cc473f' };
const BANNER = '// ── Manual expiry resolution (ITM/UNKNOWN expired legs) ──────────';

const OWNERS = [
  { name: '_manualExpiryPortfolioId', form: 'var', isAsync: false, chars: 36 },
  { name: '_pfExpiryManualClose', form: 'function', isAsync: false, chars: 161 },
  { name: '_pfExpiryResolveManual', form: 'function', isAsync: false, chars: 5971 },
  { name: '_pfExpiryManualSubmit', form: 'function', isAsync: false, chars: 2388 },
];
const OWNER_SPAN_SUM = 8556;
const DEPENDENCIES = ['_activePanelPortfolioId', 'escHtml', 'portfolioExpiry',
  'renderPortfolioJournalView', 'renderPositionsPanel', 'showToast'];
const DEPENDENCY_REFS_CALL_TIME = 18;
const EXTERNAL_EDGES = 0;
const MARKUP_HANDLER = 'onclick="if(event.target===this)_pfExpiryManualClose()"';

// ── The rejected region ──────────────────────────────────────────────────────
const SWING_AT = 548703;
const SWING_END = 790997;
const SWING_BODY_CHARS = 242294;
const SWING_OWNERS = 163;
const SWING_EXTERNAL_EDGES = 4;
const SWING_OUTBOUND_VAR_ONLY = 0;
const SWING_OUTBOUND_CORRECTED = 74;
const SWING_STATEMENT = 'S.swing = {';
const SWING_STATEMENT_CHARS = 4085;
const S_DECL_AT = 8696;

// ── The screen ───────────────────────────────────────────────────────────────
const BANNER_MARKS_ALL = 277;
const BANNER_MARKS_TOP_LEVEL = 200;
const BANNER_MARKS_COLUMN_ZERO = 194;
const BINDINGS_VAR = 259;
const BINDINGS_SCANNED = 264;

// ── The hypothetical Phase 2 (modelled, never written) ───────────────────────
const HYP_MODULE_REL = 'js/portfolio/portfolio-expiry-manual.js';
const HYP_TAG = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/backend-portfolios.js"></script>\n';
const HYP_TAG_CHARS = 66;
const HYP = { chars: 1715096, utf8: 1747413, lf: 29961,
  sha: '6592efa65f0d71ab12fce84e31ea6acf0f9f1868066107d87b16e2711f9376de', scripts: 62 };

// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function metrics(s) {
  return { chars: s.length, utf8: Buffer.byteLength(s, 'utf8'),
    lf: (s.match(/\n/g) || []).length, sha: sha256(s) };
}
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src).map((e) => ({
    name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
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
  const build = (keep) => { const o = new Array(src.length);
    for (let i = 0; i < src.length; i++) o[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return o.join(''); };
  return { code: masked, strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]) };
}
function outsideEveryDeclaration(src) {
  const spans = scanTopLevelDeclarations(src).map((d) => [d.start, d.end]);
  return (i) => !spans.some(([a, b]) => i >= a && i <= b);
}
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 30);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}
function topLevelStatementLines(src) {
  const outside = outsideEveryDeclaration(src);
  let n = 0, off = 0;
  for (const line of src.split('\n')) {
    if (line.trim() && outside(off) && !isBlankOrComment(line)) n++;
    off += line.length + 1;
  }
  return n;
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const INDEX = APP_LOADER.loadIndexHtml();
const CODE = INDEX.slice(CODE_AT, CODE_END);
const MONOLITH = scanTopLevelDeclarations(CODE);
const MONOLITH_NAMES = new Set(MONOLITH.map((d) => d.name));

console.log('MANUAL EXPIRY RESOLUTION — TEMPORARY EXTRACTION AUDIT (Phase 1)');
console.log('measurement only · production untouched · base=' + BASE_SHA.slice(0, 8));

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is merged #423');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'its parent is the merged #422 audit');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the working index.html is byte-identical to the pinned base');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'exactly 61 local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only');
eq(INDEX.indexOf(HYP_TAG), -1, 'no expiry-manual tag exists yet');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no expiry-manual module exists yet');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at the pinned offset');
eq(CODE.length, CODE_CHARS, 'the monolith is 1,610,326 units after #423');
{
  const base = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
  eq(base.length, BASE_TEST_FILES, 'the base suite is exactly 144 test files');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
    AUDIT_TEST_FILES, 'with this temporary audit the suite is 145');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The region, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
const RAW_TEXT = INDEX.slice(RAW_AT, RAW_END);
const BODY_TEXT = INDEX.slice(RAW_AT, RAW_END - 1);
eq(metrics(RAW_TEXT), RAW, 'raw identity');
eq(metrics(BODY_TEXT), BODY, 'body identity');
eq(BODY_TEXT + '\n', RAW_TEXT, 'raw === body + exactly one LF');
eq(RAW_TEXT.slice(-3), '}\n\n', 'raw ends `}\\n\\n`');
eq(INDEX.slice(RAW_AT - 3, RAW_AT), '}\n\n', 'and it opens right after a complete `}\\n\\n` seam');
eq(BODY_TEXT.slice(0, BANNER.length), BANNER, 'the block opens on its own section banner');
eq(countLiteral(CODE, BANNER), 1, '…which occurs exactly once in the monolith');
eq(assertSeam(INDEX, RAW_AT, RAW_END - 1), RAW_END,
  'the shared seam validator accepts the boundary and returns the pinned raw end');
eq(snapBodyEnd(INDEX, RAW_AT, RAW_END + 40), RAW_END - 1,
  'and the shared snap lands on the same body end from a wider window');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(shape(BODY_TEXT), OWNERS, 'the region owns exactly these four declarations');
eq(OWNERS.filter((o) => o.isAsync).length, 0, 'none is async');
eq(OWNERS.filter((o) => o.form === 'var').length, 1, 'and it declares one mutable global');
eq(OWNERS.reduce((a, o) => a + o.chars, 0), OWNER_SPAN_SUM,
  'the owner spans sum to 8,556 of the 8,769-unit body');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Evaluation time — the test the rejected region failed');
// ─────────────────────────────────────────────────────────────────────────────
eq(topLevelStatementLines(BODY_TEXT), 0, 'the region carries NO top-level statement at all');
{
  const box = {};
  vm.createContext(box);
  let err = null;
  try { vm.runInContext(BODY_TEXT, box, { filename: 'expiry.js' }); } catch (e) { err = e.message; }
  eq(err, null, 'it loads cleanly in a COMPLETELY empty VM — no window, no globals');
  eq(Object.keys(box).sort(), OWNERS.map((o) => o.name).sort(),
    '…defining its four owners and nothing else');
}
{
  const outside = outsideEveryDeclaration(BODY_TEXT);
  const masked = maskLiterals(BODY_TEXT);
  let callTime = 0, evalTime = 0;
  for (const n of DEPENDENCIES) for (const i of refSites(masked, n)) (outside(i) ? evalTime++ : callTime++);
  eq(evalTime, 0, 'no dependency is read at evaluation time');
  eq(callTime, DEPENDENCY_REFS_CALL_TIME, 'and all 18 references sit inside a declaration');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Dependencies');
// ─────────────────────────────────────────────────────────────────────────────
{
  const owned = new Set(OWNERS.map((o) => o.name));
  const masked = maskLiterals(BODY_TEXT);
  const found = [];
  const seen = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) {
    const n = m[2];
    if (owned.has(n) || !MONOLITH_NAMES.has(n) || seen.has(n)) continue;
    seen.add(n); found.push(n);
  }
  eq(found.sort(), DEPENDENCIES, 'it depends on exactly these six monolith names');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. External edges — none, and one markup handler');
// ─────────────────────────────────────────────────────────────────────────────
const VIEWS = lexicalViews(CODE);
const REL_AT = RAW_AT - CODE_AT;
const REL_END = (RAW_END - 1) - CODE_AT;
{
  let ext = 0;
  for (const o of OWNERS) ext += refSites(VIEWS.code, o.name).filter((i) => i < REL_AT || i >= REL_END).length;
  eq(ext, EXTERNAL_EDGES, 'NOTHING in the monolith calls an owner from outside the region');
  // NOT masked: in HTML the handler lives inside a quoted attribute, so masking
  // literals would erase exactly the thing being counted.
  const outsideInline = INDEX.slice(0, CODE_AT) + INDEX.slice(CODE_END);
  let markup = 0;
  for (const o of OWNERS) markup += refSites(outsideInline, o.name).length;
  eq(markup, 1, 'exactly one reference lives outside the inline script — a static markup handler');
  ok(INDEX.indexOf(MARKUP_HANDLER) >= 0, '…and it is the modal overlay’s own close handler');
  ok(INDEX.indexOf(MARKUP_HANDLER) < CODE_AT, 'which sits in the markup, above the inline script');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. State coupling, in both directions, under the CORRECTED rule');
// ─────────────────────────────────────────────────────────────────────────────
const BINDINGS = MONOLITH
  .filter((d) => d.form === 'var' || d.form === 'const' || d.form === 'let')
  .map((d) => d.name);
eq(MONOLITH.filter((d) => d.form === 'var').length, BINDINGS_VAR, 'the monolith declares 259 vars');
eq(BINDINGS.length, BINDINGS_SCANNED, '…and 264 bindings once const and let are counted');
ok(BINDINGS.length > BINDINGS_VAR, 'the corrected rule scans strictly more than the old one');
{
  const owned = new Set(OWNERS.map((o) => o.name));
  const ownVars = OWNERS.filter((o) => o.form === 'var').map((o) => o.name);
  let inbound = 0;
  for (const n of ownVars) for (const i of refSites(VIEWS.code, n)) {
    if (i >= REL_AT && i < REL_END) continue;
    if (isWriteAt(VIEWS.code, i, n)) inbound++;
  }
  eq(inbound, 0, 'INBOUND: nothing outside writes the one global the region owns');
  const mb = maskLiterals(BODY_TEXT);
  let outbound = 0;
  const outNames = new Set();
  for (const n of BINDINGS) {
    if (owned.has(n)) continue;
    for (const i of refSites(mb, n)) if (isWriteAt(mb, i, n)) { outbound++; outNames.add(n); }
  }
  eq(outbound, 0, 'OUTBOUND: it writes no binding it does not own — checked against all 264');
  eq(Array.from(outNames), [], '…and so there is no foreign name to list');
}
{
  const probe = maskLiterals('const _c = {};\nfunction f(){ _c.x = 1; }\n');
  let n = 0;
  for (const i of refSites(probe, '_c')) if (isWriteAt(probe, i, '_c')) n++;
  eq(n, 2, 'CONTROL: a write through a CONST binding is detected — the case the old rule missed');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. THE REJECTION — why the swing screen cannot be extracted');
// ─────────────────────────────────────────────────────────────────────────────
{
  const swingBody = INDEX.slice(SWING_AT, SWING_END);
  eq(swingBody.length, SWING_BODY_CHARS, 'the swing region is 242,294 units');
  const decls = scanTopLevelDeclarations(swingBody);
  eq(decls.length, SWING_OWNERS, '…with 163 top-level owners');

  // On coupling alone it wins outright.
  const sRelAt = SWING_AT - CODE_AT, sRelEnd = SWING_END - CODE_AT;
  let ext = 0;
  const extBy = {};
  for (const d of decls) {
    const out = refSites(VIEWS.code, d.name).filter((i) => i < sRelAt || i >= sRelEnd).length;
    if (out) { extBy[d.name] = out; ext += out; }
  }
  eq(ext, SWING_EXTERNAL_EDGES, 'it has FOUR external edges — fewer than any region ever cut here');
  eq(extBy, { _swingInit: 2, _swingTeardown: 2 }, '…both on its own lifecycle entry points');

  // And it is disqualified anyway, by evaluation-time behaviour.
  const outside = outsideEveryDeclaration(swingBody);
  const at = swingBody.indexOf(SWING_STATEMENT);
  ok(at >= 0, 'the block contains the top-level assignment `S.swing = {`');
  ok(outside(at), '…at TOP LEVEL, outside every declaration');
  const closeAt = swingBody.indexOf('\n};', at);
  eq(closeAt + 3 - at, SWING_STATEMENT_CHARS, 'the statement is 4,085 units of object literal');

  // `S` is const, declared inside the monolith — so a module cannot see it.
  const sDecl = MONOLITH.filter((d) => d.name === 'S');
  eq(sDecl.length, 1, 'the monolith declares S exactly once');
  eq(sDecl[0].form, 'const', '…as a `const`, which is why the var-only outbound rule never saw it');
  eq(sDecl[0].start, S_DECL_AT, 'at the pinned monolith offset');
  const locals = localScripts(INDEX).map((t) => t.src);
  for (const src of locals) {
    const rel = src.replace(/^\.\//, '');
    eq(scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))
      .filter((d) => d.name === 'S').length, 0, rel + ' does not declare S either');
  }

  // The failure, shown rather than argued: a module evaluates before the inline
  // monolith, so S does not exist when this block's top-level statement runs.
  {
    const box = {};
    vm.createContext(box);
    let err = null;
    try { vm.runInContext(swingBody, box, { filename: 'swing.js' }); } catch (e) { err = e.message; }
    ok(err !== null, 'loading the block with no S THROWS');
    eq(err, 'S is not defined', '…and the reason is exactly the missing S');
  }

  // The outbound figure the old rule reported, and the one the corrected rule does.
  const mb = maskLiterals(swingBody);
  const owned = new Set(decls.map((d) => d.name));
  const countOutbound = (names) => {
    let n = 0;
    for (const nm of names) { if (owned.has(nm)) continue;
      for (const i of refSites(mb, nm)) if (isWriteAt(mb, i, nm)) n++; }
    return n;
  };
  eq(countOutbound(MONOLITH.filter((d) => d.form === 'var').map((d) => d.name)),
    SWING_OUTBOUND_VAR_ONLY, 'the var-only rule scored this block a PERFECT ZERO outbound');
  eq(countOutbound(BINDINGS), SWING_OUTBOUND_CORRECTED,
    '…and the corrected rule scores it 74 — the measurement that changed the verdict');

  // Nor can it be split: there is no internal top-level boundary, and cutting by
  // owner costs far more than the whole block's external surface.
  const bodies = functionBodyRanges(swingBody).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const inner = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m;
    while ((m = re.exec(swingBody))) if (!inFn(m.index)) inner.push(m.index);
  }
  eq(inner.length, 1, 'it holds ONE top-level banner — its own opening line, and no internal boundary');
  const splitCost = (idx) => {
    const cut = decls[idx].start;
    let cross = 0;
    for (const d of decls) {
      const side = d.start < cut;
      for (const i of refSites(mb, d.name)) {
        if (i >= d.start && i <= d.end) continue;
        if ((i < cut) !== side) cross++;
      }
    }
    return cross;
  };
  const costs = [splitCost(16), splitCost(32), splitCost(48), splitCost(81), splitCost(130)];
  eq(costs, [26, 44, 64, 103, 72], 'the decile split costs, pinned exactly');
  eq(Math.min.apply(null, costs), 26, 'the CHEAPEST split costs 26 cross-edges');
  eq(Math.min.apply(null, costs) / SWING_EXTERNAL_EDGES, 6.5,
    '…six and a half times the whole block’s entire external surface of 4');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The two defects in the screen itself');
// ─────────────────────────────────────────────────────────────────────────────
{
  // DEFECT 1: banners. Neither indentation rule alone is right.
  const collect = (res) => {
    const out = [];
    for (const re of res) { let m; while ((m = re.exec(CODE))) out.push(m.index); }
    return out;
  };
  const columnZero = collect([/^\/\/ ═══/gm, /^\/\/ ── /gm]);
  const anyIndent = collect([/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]);
  eq(columnZero.length, BANNER_MARKS_COLUMN_ZERO, 'the recorded column-0 rule finds 194 banners');
  eq(anyIndent.length, BANNER_MARKS_ALL, 'any indentation finds 277 — 83 more');
  const bodies = functionBodyRanges(CODE).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const topLevel = anyIndent.filter((i) => !inFn(i));
  eq(topLevel.length, BANNER_MARKS_TOP_LEVEL, '…of which 200 are at top level');
  eq(anyIndent.length - topLevel.length, 77,
    'and 77 sit INSIDE a function body, where they delimit nothing extractable');
  ok(topLevel.length > columnZero.length,
    'the corrected rule finds strictly more than column-0 — so column-0 was losing regions');
  ok(topLevel.length < anyIndent.length,
    '…and strictly fewer than any-indent — so any-indent was inventing them');

  // DEFECT 2: outbound. Shown on the smallest possible input.
  const probe = maskLiterals('var _v = {};\nconst _c = {};\nlet _l = {};\n' +
    'function f(){ _v.a = 1; _c.b = 2; _l.d = 3; }\n');
  const names = scanTopLevelDeclarations(
    'var _v = {};\nconst _c = {};\nlet _l = {};\nfunction f(){}\n');
  const varOnly = names.filter((d) => d.form === 'var').map((d) => d.name);
  const allBindings = names.filter((d) => /^(?:var|const|let)$/.test(d.form)).map((d) => d.name);
  const writes = (list) => {
    let n = 0;
    for (const nm of list) for (const i of refSites(probe, nm)) if (isWriteAt(probe, i, nm)) n++;
    return n;
  };
  ok(writes(varOnly) < writes(allBindings),
    'CONTROL: the var-only rule undercounts writes on an input that has const and let ones');
  eq(writes(allBindings) - writes(varOnly), 4,
    '…by exactly the const and let writes it never looked at');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The modelled Phase 2 — computed, never written');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(HYP_TAG.length, HYP_TAG_CHARS, 'the modelled tag line is 66 units');
  eq(countLiteral(INDEX, ANCHOR_TAG), 1, 'its anchor, the #423 tag, occurs exactly once');
  const anchorAt = INDEX.indexOf(ANCHOR_TAG);
  ok(anchorAt < RAW_AT, 'the anchor sits above the fragment');
  eq(INDEX.slice(anchorAt + ANCHOR_TAG.length, anchorAt + ANCHOR_TAG.length + INLINE_OPEN.length),
    INLINE_OPEN, 'and the inline monolith opens immediately after it');
  const withTag = INDEX.slice(0, anchorAt + ANCHOR_TAG.length) + HYP_TAG +
    INDEX.slice(anchorAt + ANCHOR_TAG.length);
  const shifted = RAW_AT + HYP_TAG.length;
  const hyp = withTag.slice(0, shifted) + withTag.slice(shifted + RAW_TEXT.length);
  eq(metrics(hyp), { chars: HYP.chars, utf8: HYP.utf8, lf: HYP.lf, sha: HYP.sha },
    'the extracted index.html would be exactly this document');
  eq(localScripts(hyp).length, HYP.scripts, '…carrying 62 local scripts');
  eq(hyp.length - INDEX.length, HYP_TAG_CHARS - RAW.chars, 'the net delta is the tag minus the fragment');
  eq(hyp.indexOf(BANNER), -1, 'the banner would leave index.html with the block');
  ok(hyp.indexOf(MARKUP_HANDLER) >= 0, 'the markup handler stays, as it must');
  const tagAt = hyp.indexOf(HYP_TAG);
  const untagged = hyp.slice(0, tagAt) + hyp.slice(tagAt + HYP_TAG.length);
  eq(untagged.slice(0, RAW_AT) + BODY_TEXT + '\n' + untagged.slice(RAW_AT), INDEX,
    'and the reverse transform reconstructs this base byte for byte');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Production is untouched');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', BASE_SHA, '--']).trim();
  const files = changed ? changed.split('\n') : [];
  ok(!files.includes('index.html'), 'index.html is untouched');
  ok(!files.some((f) => f.startsWith('js/')), 'no module is touched');
  const ratchet = files.filter((f) => f !== 'tests/temporary-portfolio-expiry-manual-boundary-audit.test.js');
  eq(ratchet.length, 7, 'exactly seven existing contracts change — the family grew with #423');
  for (const f of ratchet) {
    const diff = git(['diff', '-U0', BASE_SHA, '--', f]).split('\n').filter((l) => /^[-+][^-+]/.test(l));
    eq(diff.length, 2, f + ': exactly one line replaced');
    ok(/TEST_FILE_COUNT = 144;$/.test(diff[0]), f + ': the removed line is the old count');
    ok(/TEST_FILE_COUNT = 145;$/.test(diff[1]), f + ': the added line is the new one');
  }
}

console.log('\n' + pass + ' assertions passed.');
