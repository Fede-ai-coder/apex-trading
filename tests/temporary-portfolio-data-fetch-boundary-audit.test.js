'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DATA FETCH — TEMPORARY EXTRACTION AUDIT.
//
// PHASE 1 ONLY. This file measures. It does not extract anything, and the
// production tree it audits is byte-identical to its pinned base. §10 proves
// that: the entire committed footprint is this audit plus the one suite-count
// constant in each of the five contracts that pin it.
//
// WHY THIS REGION. The previous audit's screen ranked sections by external
// executable edges and by state written INTO a section from outside. That
// second metric has a blind spot, and it nearly cost a bad target: a region
// declaring no `var` scores a perfect zero while freely writing globals it does
// not own. The first candidate considered for this cycle — "Data-source label
// helpers" — scored 9 external edges and zero inbound state, and was
// disqualified only once the OUTBOUND direction was measured: it writes six
// globals it does not own. §11 measures both directions, and records that of
// the 22 sections over 15,000 units, only THREE are clean in both:
//
//     ext  stateIN  stateOUT  section
//      14        0         0  Main portfolio data fetch   << this one
//      30        0         0  Non-destructive storage recovery helpers
//      77        0         0  FF_BACKEND_CANDLES_SCANNER_CHARTS helper
//
// TWO RULES, NOT ONE. Those `ext` figures are measured over SCREENING spans —
// banner to next banner. The extractable boundary is a different question and
// gives a different answer: this region's screening span runs to 223148 and
// carries 11 owners, but its extractable block ends at 216154, where the `══`
// header of the next feature begins. Scoped to the real boundary the region is
// 19,550 raw units with FOUR owners, and its external edges are 4, not 14.
// Taking the screening span as the boundary would have swallowed 6,994 units
// and seven owners of the next feature.
//
// THREE BANNER STYLES, AND ONLY ONE DELIMITS. `// ── ` marks the 93 sections;
// `// ─── ` marks 49 SUB-banners that delimit nothing; `// ═══` marks 103 block
// headers. A scan for `// ──` without the trailing space matches the sub-banner
// too, and doing exactly that put the screening end 6,845 units too early while
// this audit was being written. §2 pins all three counts so the distinction
// cannot quietly rot.
//
// TWO CANDIDATES. The region has no internal banner, so the alternative cut is
// by owner rather than by banner: P takes all four owners, Q stops after
// `renderPortfolioPanel` and leaves the two panel openers inline.
//
//     P  all four owners      [196604,216154)  19,550 raw   4 ext edges
//     Q  without the openers  [196604,213528)  16,924 raw   7 ext edges
//
// Finding: extract Candidate P. Q is smaller and carries fewer dependencies but
// MORE external edges, because `renderPortfolioPanel` calls both openers — so
// cutting them out converts internal calls into boundary crossings. Q would
// also strand `onclick="showAccountPanel()"`, the one static markup handler,
// pointing at a function left inline while its caller moved out.
//
// THE ASYNC QUESTION. Three of the four owners are async, which no previous
// layer in this family had. §4 shows it is not a load-time hazard: zero
// top-level calls, zero evaluation-time dependency reads, and the block
// evaluates in a completely empty VM defining nothing but its own four owners.
//
// PHASE 2 IS NOT IN THIS PR. §9 models the extraction and proves the forward
// and reverse transforms byte-exact, but nothing is written: no module, no
// permanent contract, no undo helper. §10 asserts they are absent.
//
// Run: node tests/temporary-portfolio-data-fetch-boundary-audit.test.js
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const APP_LOADER = require('./lib/load-app-source.js');
const {
  maskLiterals,
  stripComments,
  scanTopLevelDeclarations,
  functionBodyRanges,
  classifyReferences,
} = require('./lib/eic-contract-guards.js');

const ROOT = path.resolve(__dirname, '..');
const AUDIT_REL = 'tests/temporary-portfolio-data-fetch-boundary-audit.test.js';
const RATCHET_RELS = [
  'tests/apex-post-auth-init-boundary-contract.test.js',
  'tests/journal-close-legs-boundary-contract.test.js',
  'tests/journal-trade-detail-boundary-contract.test.js',
  'tests/journal-trade-forms-boundary-contract.test.js',
  'tests/tt-reconnect-boundary-contract.test.js',
];
const AUDIT_SCOPE = RATCHET_RELS.concat([AUDIT_REL]).sort();

// ── Pinned base: the merged #419 working notes ───────────────────────────────
const BASE_SHA = 'e50e9329fca20b818c2900710742a5ba6d42601d';
const BASE_TREE = '76429764fcd958de35936f85e7c447342d5dabd4';
const BASE_SUBJECT = 'docs: record the three verification checks that actually find defects (#419)';
const BASE_PARENT = '3a952ecda811b6e536b5e02c622ab7b3224cb7b3';
const BASE_INDEX_BLOB = 'a2f54820f1ca5f9f61f78e43c58e2273b657605b';
const BASE_CHARS = 1765976;
const BASE_UTF8 = 1799021;
const BASE_LF = 30869;
const BASE_INDEX_SHA256 = '4c37a2ac130c753a1100d6633df688bc6f97ae429535f0b3d86a64fa7bf96be9';
const BASE_LOCAL_SCRIPTS = 59;
const BASE_TEST_FILES = 141;
const AUDIT_TEST_FILES = 142;

const CODE_AT = 113324;
const CODE_END = 1765950;

// ── Candidate P: all four owners ─────────────────────────────────────────────
const P = {
  label: 'all four owners',
  at: 196604, end: 216154, startLine: 2845,
  raw: { chars: 19550, utf8: 19860, lf: 331, sha: 'f657460dacd04a99fde7c76ad0efd70cb16b7aa0e645ba3fab047e262d9cd016' },
  body: { chars: 19549, utf8: 19859, lf: 330, sha: 'c7d95a14ef17d7d1a92d7aba934702ef645fe3cf8302c1db3a01a7938b7a660e' },
};
// ── Candidate Q: stopping after renderPortfolioPanel ─────────────────────────
const Q = {
  label: 'without the two panel openers',
  at: 196604, end: 213528,
  raw: { chars: 16924, utf8: 17226, lf: 287, sha: 'cafe90d9d8931d72f8defa717694fc0850d4c28588c7a2c5623c0ddcfc5e83e1' },
  body: { chars: 16923, utf8: 17225, lf: 286, sha: '7a31c384e2878b461bcdcc112af7da3b337b414255bc3f391a679c8e9779eb12' },
};
const BANNER = '// ── Main portfolio data fetch (positions + balances + DXLink greeks) ─';

const OWNERS = [
  { name: 'fetchPortfolioData', form: 'function', isAsync: true, chars: 4212 },
  { name: 'renderPortfolioPanel', form: 'function', isAsync: false, chars: 12635 },
  { name: 'showAccountPanel', form: 'function', isAsync: true, chars: 860 },
  { name: 'showIVPanel', form: 'function', isAsync: true, chars: 1763 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);
const Q_OWNER_NAMES = OWNER_NAMES.slice(0, 2);

const DEPENDENCIES = ['AbortSignal', 'BACKEND', 'Date', 'Math', 'Promise', 'S', '_activeView',
  '_ensureVixFamily', '_regimeRefresh', 'console', 'document', 'fetch', 'fetchPortfolioGreeks',
  'formatPnl', 'ir', 'logEv', 'parseFloat', 'portfolioGetUnderlying', 'postCandleContext',
  'regimeHTML', 'setInterval', 'setPanel', 'showToast', 'stopPortfolioRefresh', 'ttCall'];
const CALLTIME_P = 105;

// ── The consumer topology ────────────────────────────────────────────────────
const EXTERNAL_CODE = {
  fetchPortfolioData: ['togglePortfolioAutoRefresh'],
  renderPortfolioPanel: ['togglePortfolioAutoRefresh', 'computeMarketRegime', 'runScan'],
};
const GENERATED_BY = ['showDetail'];
const STATIC_HANDLER = 'onclick="showAccountPanel()"';

// ── The screening survey, both directions ────────────────────────────────────
const SECTION_COUNT = 93;
const LARGE_SECTIONS = 22;
const CLEAN_BOTH_WAYS = [
  { ext: 14, title: 'Main portfolio data fetch' },
  { ext: 30, title: 'Non-destructive storage recovery helpers' },
  { ext: 77, title: 'FF_BACKEND_CANDLES_SCANNER_CHARTS helper' },
];

// ── The hypothetical Phase 2 extraction (modelled, never written) ────────────
const HYP_MODULE_REL = 'js/portfolio/portfolio-data-fetch.js';
const HYP_TAG = '<script src="./js/portfolio/portfolio-data-fetch.js"></script>';
const ANCHOR_TAG = '<script src="./js/ui/journal-trade-detail.js"></script>';
const INLINE_OPEN = '<script>';
const HYP_INSERTION_CHARS = 63;
const HYP = { chars: 1746489, utf8: 1779224, lf: 30539,
  sha: '124d838e3974cf40b5d97c18fec767233c8655114dcb0dd1282c8da5537bedee', scripts: 60 };

// ─────────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function utf8(s) { return Buffer.byteLength(s, 'utf8'); }
function countLf(s) { let n = 0; for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++; return n; }
function metrics(s) { return { chars: s.length, utf8: utf8(s), lf: countLf(s), sha: sha256(s) }; }
function lineAt(s, o) { return s.slice(0, o).split('\n').length; }
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src).map((e) => ({ name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
}
function loadInEmptyVm(src, filename) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: filename || 'candidate.js' });
    return { ok: true, error: null, globals: Object.keys(sandbox).sort() };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), globals: Object.keys(sandbox).sort() };
  }
}
const JS_KEYWORDS = new Set([
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'new', 'typeof', 'instanceof', 'in', 'of', 'this', 'null',
  'true', 'false', 'void', 'delete', 'throw', 'try', 'catch', 'finally', 'default', 'yield',
  'await', 'async', 'class', 'extends', 'super', 'undefined',
]);
function freeIdentifiers(source) {
  const m = maskLiterals(source);
  const declared = new Set();
  let x;
  const fr = /\bfunction\s*([A-Za-z0-9_$]*)\s*\(([^)]*)\)/g;
  while ((x = fr.exec(m))) {
    if (x[1]) declared.add(x[1]);
    x[2].split(',').map((p) => p.trim()).filter(Boolean)
      .forEach((p) => declared.add(p.replace(/[^A-Za-z0-9_$].*$/, '')));
  }
  const dr = /\b(?:var|let|const)\s+([A-Za-z0-9_$]+)/g;
  while ((x = dr.exec(m))) declared.add(x[1]);
  const cr = /,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((x = cr.exec(m))) declared.add(x[1]);
  const kr = /\bcatch\s*\(\s*([A-Za-z0-9_$]+)/g;
  while ((x = kr.exec(m))) declared.add(x[1]);
  const free = new Set();
  const ir = /([.]?)\b([A-Za-z_$][A-Za-z0-9_$]*)\b\s*(:?)/g;
  while ((x = ir.exec(m))) {
    if (x[1] === '.') continue;
    const n = x[2];
    if (JS_KEYWORDS.has(n) || declared.has(n)) continue;
    if (x[3] === ':' && /[{,]\s*$/.test(m.slice(Math.max(0, x.index - 40), x.index))) continue;
    free.add(n);
  }
  return Array.from(free).sort();
}
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
  const out = [];
  let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function lexicalViews(src) {
  const masked = maskLiterals(src);
  const noComments = stripComments(src);
  const build = (keep) => {
    const out = new Array(src.length);
    for (let i = 0; i < src.length; i++) out[i] = keep(i) ? src[i] : (src[i] === '\n' ? '\n' : ' ');
    return out.join('');
  };
  return { code: masked, strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]) };
}
function topLevelHits(body, re) {
  const masked = maskLiterals(body);
  const bodies = functionBodyRanges(body).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const r = new RegExp(re.source, 'g');
  const out = [];
  let m;
  while ((m = r.exec(masked))) if (!inFn(m.index)) out.push(m.index);
  return out;
}
function topLevelCallSites(body) {
  const masked = maskLiterals(body);
  const bodies = functionBodyRanges(body).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const re = /([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) {
    const at = m.index;
    if (inFn(at)) continue;
    const before = masked.slice(Math.max(0, at - 30), at);
    if (/\b(?:function|catch|if|for|while|switch)\s*$/.test(before)) continue;
    out.push({ at, name: m[1] });
  }
  return out;
}
// A write to `name` at offset `at`. Deep writes count: `x[i].prop = v` mutates
// x, and a rule matching only `x[i] =` would read it as a mere access.
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 30);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const INDEX = APP_LOADER.loadIndexHtml();

console.log('PORTFOLIO DATA FETCH — TEMPORARY EXTRACTION AUDIT (Phase 1)');
console.log('measurement only · production untouched · base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #419 notes');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is the merged #418 documentation fix');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the working index.html is byte-identical to the pinned base');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'exactly 59 local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only, so UTF-16 offsets are stable');
eq(INDEX.indexOf(HYP_TAG), -1, 'no portfolio-data-fetch tag exists yet');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no portfolio-data-fetch module exists yet');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at the pinned offset');

const baseTestFiles = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
  .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
eq(baseTestFiles.length, BASE_TEST_FILES, 'the base suite is exactly 141 test files');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, AUDIT_TEST_FILES,
  'with this temporary audit the suite is 142 test files');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The two candidate blocks, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
for (const B of [P, Q]) {
  const raw = INDEX.slice(B.at, B.end);
  const body = INDEX.slice(B.at, B.end - 1);
  eq(metrics(raw), B.raw, B.label + ': raw identity');
  eq(metrics(body), B.body, B.label + ': body identity');
  eq(body + '\n', raw, B.label + ': raw === body + exactly one LF');
  eq(raw.slice(-3), '}\n\n', B.label + ': raw ends `}\\n\\n`');
  eq(INDEX.slice(B.at - 3, B.at), '}\n\n', B.label + ': it opens right after a complete `}\\n\\n` seam');
}
eq(P.at, Q.at, 'both candidates start at the same banner');
ok(Q.end < P.end, 'Q stops earlier');
eq(P.raw.chars - Q.raw.chars, 2626, 'P is 2,626 units larger — exactly the two panel openers');
eq(lineAt(INDEX, P.at), P.startLine, 'the region opens on its pinned line');
eq(INDEX.slice(P.at, P.at + BANNER.length), BANNER, 'it opens on its own banner');
// The screening rule and the boundary rule give DIFFERENT ends. Both are pinned
// so neither can be silently swapped for the other.
{
  // THREE rule styles exist, and only one of them delimits a section. Getting
  // this wrong is not hypothetical: a scan for `// ──` without the trailing
  // space also matches `// ─── `, which put the screening end 6,845 units too
  // early while writing this audit.
  const styles = (re) => {
    let n = 0, p = CODE_AT;
    while (p < CODE_END) {
      const nl = INDEX.indexOf('\n', p);
      const end = nl < 0 ? CODE_END : nl;
      if (re.test(INDEX.slice(p, end))) n++;
      if (nl < 0) break;
      p = nl + 1;
    }
    return n;
  };
  eq(styles(/^\/\/ ── /), SECTION_COUNT, 'the section rule — two rules then a space — matches 93 lines');
  eq(styles(/^\/\/ ─── /), 49, 'a THIRD style, `// ─── `, marks 49 sub-banners and delimits nothing');
  eq(styles(/^\/\/ ═══/), 103, 'and `// ═══` marks 103 block headers');
  const nextBanner = INDEX.indexOf('\n// ── ', P.at) + 1;
  eq(nextBanner, 223148, 'the next SECTION banner is at 223148');
  ok(nextBanner > P.end, '…far beyond the extractable end');
  eq(nextBanner - P.at, 26544, 'the screening span is 26,544 units');
  eq(scanTopLevelDeclarations(INDEX.slice(P.at, nextBanner)).length, 11, '…carrying eleven owners');
  eq(nextBanner - P.end, 6994, 'taking it as the boundary would over-include 6,994 units');
  eq(INDEX.slice(P.end, P.end + 5), '// ══', 'the extractable end is where a `══` block header begins');
  eq(INDEX.slice(216303, 216310), '// ─── ', '…and a `─── ` sub-banner sits between the two, delimiting nothing');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Declaration manifests');
// ─────────────────────────────────────────────────────────────────────────────
const BODY_P = INDEX.slice(P.at, P.end - 1);
const BODY_Q = INDEX.slice(Q.at, Q.end - 1);
eq(shape(BODY_P), OWNERS, 'Candidate P declares exactly its four owners, in order, with the pinned spans');
eq(shape(BODY_Q).map((d) => d.name), Q_OWNER_NAMES, 'Candidate Q declares only the first two');
eq(shape(BODY_P).filter((d) => d.form === 'var').length, 0, 'the region declares NO mutable state at all');
eq(shape(BODY_P).filter((d) => d.isAsync).length, 3, 'three of the four owners are async — a first for this family');
eq(shape(BODY_P).every((d) => d.form === 'function'), true, 'all four owners are function declarations');
eq(OWNERS.reduce((n, o) => n + o.chars, 0), 19470, 'the four owner spans sum to 19,470 units');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Load-time purity — the async owners are not a load-time hazard');
// ─────────────────────────────────────────────────────────────────────────────
for (const [label, body, names] of [['P', BODY_P, OWNER_NAMES], ['Q', BODY_Q, Q_OWNER_NAMES]]) {
  const decls = scanTopLevelDeclarations(body);
  const ch = Array.from(body);
  decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) ch[i] = ' '; });
  eq(maskLiterals(ch.join('')).replace(/\s+/g, ''), '', label + ': declarations, comments and whitespace only at top level');
  const loaded = loadInEmptyVm(body, label);
  ok(loaded.ok, label + ': evaluates in an empty VM with no error');
  eq(loaded.globals, names.slice().sort(), label + ': defines exactly its own owners');
  eq(topLevelCallSites(body).length, 0, label + ': zero top-level calls');
  eq(topLevelHits(body, /\b(?:document|window)\s*\./).length, 0, label + ': zero top-level DOM access');
  eq(topLevelHits(body, /\baddEventListener\b/).length, 0, label + ': zero top-level listeners');
  eq(topLevelHits(body, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, label + ': zero top-level timers');
  eq(topLevelHits(body, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/).length, 0, label + ': zero top-level network work');
  eq(topLevelHits(body, /\bawait\b/).length, 0, label + ': no top-level await');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Dependencies');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(BODY_P).filter((n) => OWNER_NAMES.indexOf(n) < 0), DEPENDENCIES,
  'Candidate P free-depends on exactly 25 names');
eq(DEPENDENCIES.length, 25, 'twenty-five dependencies');
eq(classifyReferences(BODY_P, DEPENDENCIES).loadTime, [], 'P reads NO dependency at evaluation time');
eq(classifyReferences(BODY_P, DEPENDENCIES).callTime.length, CALLTIME_P, 'P: 105 call-time references');
eq(DEPENDENCIES.filter((n) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)), [],
  'every dependency is a whole plain identifier, not a state object path');
ok(freeIdentifiers(BODY_Q).filter((n) => Q_OWNER_NAMES.indexOf(n) < 0).length < DEPENDENCIES.length,
  'Q carries fewer dependencies — which is not enough to prefer it, as §8 shows');

// ─────────────────────────────────────────────────────────────────────────────
section('6. External consumers');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
const decls = scanTopLevelDeclarations(CODE);
function census(names, at, end) {
  const inside = (i) => { const a = i + CODE_AT; return a >= at && a < end; };
  const head = INDEX.slice(0, CODE_AT), tail = INDEX.slice(CODE_END);
  let code = 0, generated = 0, markup = 0;
  const hosts = {}, genHosts = {};
  for (const n of names) {
    for (const i of refSites(VIEWS.code, n)) {
      if (inside(i)) continue;
      if (/\bfunction\s+$/.test(VIEWS.code.slice(Math.max(0, i - 40), i))) continue;
      code++;
      hosts[n] = (hosts[n] || []).concat((decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name);
    }
    for (const i of refSites(VIEWS.strings, n)) {
      if (inside(i)) continue;
      generated++;
      genHosts[(decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name] = true;
    }
    markup += refSites(head, n).length + refSites(tail, n).length;
  }
  return { code, generated, markup, hosts, genHosts: Object.keys(genHosts).sort() };
}
const cp = census(OWNER_NAMES, P.at, P.end);
const cq = census(Q_OWNER_NAMES, Q.at, Q.end);
eq({ code: cp.code, generated: cp.generated, markup: cp.markup }, { code: 4, generated: 1, markup: 1 },
  'Candidate P: four executable call sites, one generated handler, one static handler');
eq(cp.hosts, EXTERNAL_CODE, '…and the call sites are in togglePortfolioAutoRefresh, computeMarketRegime and runScan');
eq(cp.genHosts, GENERATED_BY, '…the one generated reference comes from showDetail');
eq(countLiteral(INDEX.slice(0, CODE_AT), STATIC_HANDLER), 1, 'exactly one static showAccountPanel() handler in markup');
eq({ code: cq.code, generated: cq.generated, markup: cq.markup }, { code: 7, generated: 0, markup: 0 },
  'Candidate Q has MORE executable edges — 7 against 4 — and loses the static handler');
ok(cq.code > cp.code, 'cutting the openers out converts internal calls into boundary crossings');

// ─────────────────────────────────────────────────────────────────────────────
section('7. State coupling, in BOTH directions');
// ─────────────────────────────────────────────────────────────────────────────
// The direction that matters here is the one the earlier screen missed. A
// region declaring no `var` scores a perfect zero INBOUND while writing globals
// it does not own; that is what disqualified the first candidate of this cycle.
const GLOBAL_VARS = decls.filter((d) => d.form === 'var').map((d) => d.name);
eq(GLOBAL_VARS.length, 260, 'the monolith declares 260 mutable globals — the population the outbound rule is tested against');
{
  const own = new Set(OWNER_NAMES);
  let inbound = 0;
  for (const d of scanTopLevelDeclarations(BODY_P).filter((d) => d.form === 'var')) {
    for (const i of refSites(VIEWS.code, d.name)) {
      const a = i + CODE_AT;
      if (a >= P.at && a < P.end) continue;
      if (isWriteAt(VIEWS.code, i, d.name)) inbound++;
    }
  }
  eq(inbound, 0, 'INBOUND: nothing outside writes state the region owns — trivially, it owns none');
  const maskedBody = maskLiterals(BODY_P);
  const outNames = new Set();
  let outbound = 0;
  for (const n of GLOBAL_VARS) {
    if (own.has(n)) continue;
    for (const i of refSites(maskedBody, n)) if (isWriteAt(maskedBody, i, n)) { outbound++; outNames.add(n); }
  }
  eq(outbound, 0, 'OUTBOUND: the region writes NO global it does not own');
  eq(Array.from(outNames), [], '…and so there is no foreign name to list');
}
// A control: the outbound rule must be able to SEE a write. Measured against a
// region that does have them, so `return 0` is not indistinguishable from
// measuring — the mistake this audit family made once already.
{
  const probe = maskLiterals("var _foreign = 1;\nfunction f(){ _foreign = 2; _foreign.x = 3; }\n");
  let n = 0;
  for (const i of refSites(probe, '_foreign')) if (isWriteAt(probe, i, '_foreign')) n++;
  eq(n, 3, 'the outbound rule detects all three writes: the declaration, the plain assignment and the deep one');
  const readOnly = maskLiterals("function f(){ return _foreign + 1; }\n");
  let r = 0;
  for (const i of refSites(readOnly, '_foreign')) if (isWriteAt(readOnly, i, '_foreign')) r++;
  eq(r, 0, '…and does not mistake a read for a write');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The recommendation, derived from the measurements');
// ─────────────────────────────────────────────────────────────────────────────
const SCORE = {
  P: { owners: shape(BODY_P).length, units: BODY_P.length, code: cp.code, markup: cp.markup },
  Q: { owners: shape(BODY_Q).length, units: BODY_Q.length, code: cq.code, markup: cq.markup },
};
ok(SCORE.Q.owners < SCORE.P.owners, 'Q is the smaller cut by owners…');
ok(SCORE.Q.units < SCORE.P.units, '…and by units…');
ok(SCORE.Q.code > SCORE.P.code, '…but it leaves MORE executable edges behind, which is what decides');
eq(SCORE.P.markup - SCORE.Q.markup, 1, 'and only P takes the static markup handler with it');
const ranked = ['P', 'Q'].slice().sort((x, y) => SCORE[x].code - SCORE[y].code || SCORE[y].units - SCORE[x].units);
eq(ranked, ['P', 'Q'], 'the ranking puts Candidate P first');
const RECOMMENDATION = ranked[0];
eq(RECOMMENDATION, 'P', 'THE RECOMMENDATION: extract all four owners');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The hypothetical extraction, byte-exact in each direction');
// ─────────────────────────────────────────────────────────────────────────────
const anchorAt = INDEX.indexOf(ANCHOR_TAG);
ok(anchorAt > 0, 'the anchor tag exists');
eq(countLiteral(INDEX, ANCHOR_TAG), 1, '…exactly once');
const anchorLineEnd = INDEX.indexOf('\n', anchorAt);
eq(anchorLineEnd, anchorAt + ANCHOR_TAG.length, 'the anchor tag ends its own line');
eq(INDEX.slice(anchorLineEnd + 1, anchorLineEnd + 1 + INLINE_OPEN.length), INLINE_OPEN,
  'the inline monolith opens on the very next line');
eq(('\n' + HYP_TAG).length, HYP_INSERTION_CHARS, 'the inserted tag line is 63 UTF-16 units');
ok(anchorLineEnd < P.at, 'the tag goes in well before the block it removes');

const removed = INDEX.slice(0, P.at) + INDEX.slice(P.end);
const HYP_INDEX = removed.slice(0, anchorLineEnd) + '\n' + HYP_TAG + removed.slice(anchorLineEnd);
const HYP_MODULE = BODY_P;
eq(metrics(HYP_MODULE), P.body, 'the hypothetical module is exactly Candidate P body: 19,549 units / c7d95a14…');
eq(HYP_MODULE.slice(-2), '}\n', 'it would end on a real line of code');
ok(!/\n\s*\n$/.test(HYP_MODULE), '…with no blank line at EOF');
eq(metrics(HYP_INDEX), { chars: HYP.chars, utf8: HYP.utf8, lf: HYP.lf, sha: HYP.sha },
  'the hypothetical index: 1,746,489 units / 1,779,224 bytes / 30,539 LF / 124d838e…');
eq(BASE_CHARS - P.raw.chars + HYP_INSERTION_CHARS, HYP.chars,
  'the arithmetic holds: 1,765,976 − 19,550 + 63 = 1,746,489');
eq(BASE_LF - P.raw.lf + 1, HYP.lf, 'the LF arithmetic holds: 30,869 − 331 + 1 = 30,539');
eq(localScripts(HYP_INDEX).length, HYP.scripts, 'the hypothetical index loads 60 local scripts');
eq(HYP_INDEX.indexOf(HYP_MODULE), -1, 'not one byte of the module body remains in the index');
eq(HYP_INDEX.indexOf(BANNER), -1, 'the banner is gone from the hypothetical index');
eq(countLiteral(HYP_INDEX, STATIC_HANDLER), 1, '…while the static markup handler correctly survives');
eq(localScripts(HYP_INDEX).map((t) => t.src).slice(-2),
  [ANCHOR_TAG.match(/src="([^"]+)"/)[1], './' + HYP_MODULE_REL], 'the new tag becomes the last local script');
// REVERSE
const untagged = HYP_INDEX.slice(0, anchorLineEnd) + HYP_INDEX.slice(anchorLineEnd + HYP_INSERTION_CHARS);
const restored = untagged.slice(0, P.at) + HYP_MODULE + '\n' + untagged.slice(P.at);
eq(restored, INDEX, 'the reverse transform reconstructs the base byte for byte');
eq(sha256(restored), BASE_INDEX_SHA256, '…with the base SHA-256');

// Mutation-sensitive controls.
ok(sha256(HYP_INDEX + ' ') !== HYP.sha, '9.1 one foreign byte changes the hypothetical index hash');
ok(sha256(HYP_MODULE + '\n') !== P.body.sha, '9.2 a module that absorbed the separator hashes differently');
{
  const noSep = untagged.slice(0, P.at) + HYP_MODULE + untagged.slice(P.at);
  ok(noSep !== INDEX, '9.3 a reverse transform that drops the separator does NOT reconstruct the base');
  eq(noSep.length, BASE_CHARS - 1, '…and is exactly one unit short');
}
{
  const planted = CODE.slice(0, P.at - CODE_AT) + 'function _x(){ renderPortfolioPanel(); }\n\n' + CODE.slice(P.at - CODE_AT);
  eq(refSites(maskLiterals(planted), 'renderPortfolioPanel').length,
    refSites(VIEWS.code, 'renderPortfolioPanel').length + 1, '9.4 an extra external consumer is detectable');
  const inString = CODE.slice(0, P.at - CODE_AT) + "var _s = 'renderPortfolioPanel();';\n\n" + CODE.slice(P.at - CODE_AT);
  eq(refSites(maskLiterals(inString), 'renderPortfolioPanel').length,
    refSites(VIEWS.code, 'renderPortfolioPanel').length, '9.5 …but one hidden in a string is not');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Production is unchanged, and the audit footprint is six test files');
// ─────────────────────────────────────────────────────────────────────────────
eq(sha256(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), BASE_INDEX_SHA256,
  'index.html on disk is byte-identical to the base');
eq(git(['hash-object', 'index.html']).trim(), BASE_INDEX_BLOB, '…and hashes to the base blob');
eq(git(['diff', '--name-only', BASE_SHA + '...HEAD', '--', 'index.html', 'js/']).trim(), '',
  'the committed diff touches neither index.html nor js/');
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
eq(changed, AUDIT_SCOPE, 'the ENTIRE change set is the audit plus the five suite-count ratchets');
eq(changed.length, 6, 'exactly six files, all under tests/');
eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [], 'production scope is empty');
eq(changed.filter((rel) => rel.startsWith('.github/')), [], 'no workflow changed');
eq(changed.filter((rel) => rel.endsWith('.md')), [], 'no documentation changed');
eq(changed.filter((rel) => rel.startsWith('tests/lib/')), [], 'no test helper changed');
eq(RATCHET_RELS.length, 5, 'exactly five suite-count ratchets exist');
for (const rel of RATCHET_RELS) {
  const before = git(['show', BASE_SHA + ':' + rel]);
  const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(before.indexOf('const TEST_FILE_COUNT = 141;') >= 0, rel + ' pinned 141 at the base');
  ok(after.indexOf('const TEST_FILE_COUNT = 142;') >= 0, rel + ' now pins 142');
  const norm = (t) => {
    const lines = t.split('\n');
    const at = lines.findIndex((l) => /const TEST_FILE_COUNT\s*=/.test(l));
    if (at < 0) return t;
    let from = at;
    while (from > 0 && /^\s*\/\//.test(lines[from - 1])) from--;
    lines.splice(from, at - from + 1);
    return lines.filter((l) => !/the suite is (?:exactly |still )?1(?:41|42) test files/.test(l)).join('\n');
  };
  eq(norm(after), norm(before), rel + ': every other byte is identical to the base');
}
const declRe = /^\s*const TEST_FILE_COUNT\s*=/m;
const pinned = [];
for (const dir of ['tests', 'tests/lib']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = dir + '/' + f;
    if (!/\.js$/.test(f) || rel === AUDIT_REL) continue;
    const p = path.join(ROOT, dir, f);
    if (!fs.statSync(p).isFile()) continue;
    if (declRe.test(fs.readFileSync(p, 'utf8'))) pinned.push(rel);
  }
}
eq(pinned.sort(), RATCHET_RELS, 'the repository has exactly these five live suite-count pins');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no portfolio module was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/portfolio-data-fetch-boundary-contract.test.js')),
  'no permanent boundary contract was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/lib/portfolio-data-fetch-undo.js')), 'no undo helper was created');

// ─────────────────────────────────────────────────────────────────────────────
section('11. The screen that chose this region, both directions measured');
// ─────────────────────────────────────────────────────────────────────────────
const sections = [];
{
  let p = CODE_AT;
  const starts = [];
  while (p < CODE_END) {
    const nl = INDEX.indexOf('\n', p);
    const end = nl < 0 ? CODE_END : nl;
    if (/^\/\/ ── /.test(INDEX.slice(p, end))) starts.push({ at: p, title: INDEX.slice(p, end).slice(6).replace(/[\s─]+$/, '') });
    if (nl < 0) break;
    p = nl + 1;
  }
  starts.forEach((s, i) => sections.push({
    title: s.title, at: s.at, end: i + 1 < starts.length ? starts[i + 1].at : CODE_END,
  }));
}
sections.forEach((s) => { s.units = s.end - s.at; });
eq(sections.length, SECTION_COUNT, 'the inline script holds 93 banner-delimited sections');
function couple(s) {
  const body = INDEX.slice(s.at, s.end);
  const mb = maskLiterals(body);
  const d = scanTopLevelDeclarations(body);
  const own = new Set(d.map((x) => x.name));
  let ext = 0;
  for (const n of own) {
    for (const i of refSites(VIEWS.code, n)) {
      const a = i + CODE_AT;
      if (a >= s.at && a < s.end) continue;
      if (/\bfunction\s+$/.test(VIEWS.code.slice(Math.max(0, i - 40), i))) continue;
      ext++;
    }
  }
  let inb = 0;
  for (const v of d.filter((x) => x.form === 'var')) {
    for (const i of refSites(VIEWS.code, v.name)) {
      const a = i + CODE_AT;
      if (a >= s.at && a < s.end) continue;
      if (isWriteAt(VIEWS.code, i, v.name)) inb++;
    }
  }
  let outb = 0;
  for (const n of GLOBAL_VARS) {
    if (own.has(n)) continue;
    for (const i of refSites(mb, n)) if (isWriteAt(mb, i, n)) outb++;
  }
  return { ext, inb, outb };
}
const large = sections.filter((s) => s.units > 15000);
eq(large.length, LARGE_SECTIONS, '22 sections exceed 15,000 units');
const clean = large.map((s) => Object.assign({ title: s.title }, couple(s)))
  .filter((r) => r.inb === 0 && r.outb === 0)
  .sort((a, b) => a.ext - b.ext);
eq(clean.length, CLEAN_BOTH_WAYS.length, 'only THREE of the 22 are clean in BOTH state directions');
eq(clean.map((r) => ({ ext: r.ext, title: r.title.slice(0, CLEAN_BOTH_WAYS[0].title.length) })),
  CLEAN_BOTH_WAYS.map((r) => ({ ext: r.ext, title: r.title.slice(0, CLEAN_BOTH_WAYS[0].title.length) })),
  '…and this region is the least entangled of them');
ok(clean[0].ext < clean[1].ext && clean[1].ext < clean[2].ext,
  'the three are strictly ordered by external edges, this one first');

console.log('\n' + pass + ' assertions passed');
console.log('recommendation: extract Candidate ' + RECOMMENDATION + ' (all four owners)');
console.log('PORTFOLIO_DATA_FETCH_BOUNDARY_AUDIT_OK');
