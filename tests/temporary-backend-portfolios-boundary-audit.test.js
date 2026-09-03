'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND-BACKED PORTFOLIOS — TEMPORARY EXTRACTION AUDIT.
//
// PHASE 1 ONLY. This file measures. It does not extract anything, and the
// production tree it audits is byte-identical to its pinned base. §12 proves
// that: the entire committed footprint is this audit plus the one suite-count
// constant in each of the six PERMANENT contracts that pin it. Six, not five —
// the portfolio data-fetch contract merged in #421 added itself to that family.
// (At the #420 base five permanent contracts pinned it, and the temporary audit
// made a sixth file; that audit is gone and the contract took its place.)
//
// ─────────────────────────────────────────────────────────────────────────────
// THE FINDING THAT SHAPED THIS AUDIT: THE BOUNDARY RULE IS INCOMPLETE, AND HAS
// BEEN SINCE BEFORE IT WAS WRITTEN DOWN.
//
// The rule the programme records says a region ends after its LAST TOP-LEVEL
// DECLARATION, at the `}\n\n` seam. Measured over all sixteen layers of this
// chain, fifteen do end that way — and one never did:
// `js/services/journal-backend-write-through.js` ends on 4,878 units of trailing
// top-level code, an IIFE that `scanTopLevelDeclarations` does not report. So
// the rule was already a description of the common case rather than a law, and
// the counterexample shipped long before this cycle noticed it.
//
// This region is the second case, and the plainer one — it ends on a STATEMENT:
//
//     function viewLinkedTradesInJournal(portfolioId) { … }
//     window.viewLinkedTradesInJournal = viewLinkedTradesInJournal;   ← the end
//
// Stopping after the last declaration would have cut 62 units short, stranding
// a `window.X = X` re-export inline while the `X` it names moved to a module.
// That would still have RUN — the module loads before the inline script, so the
// global resolves — which is exactly what makes the mistake dangerous: it
// produces no failure, just a re-export orphaned from the code it belongs to,
// and a module that is no longer the feature's whole text. §4 pins the corrected
// boundary and §5 pins the twelve top-level statements that make it necessary.
//
// The corrected rule, stated for the next cycle: a region ends after its last
// top-level CONSTRUCT — declaration, statement or IIFE — at the `\n\n` seam.
// The old rule is the special case, common but not universal, where nothing
// follows the last declaration.
// ─────────────────────────────────────────────────────────────────────────────
//
// WHY THIS REGION. The screen ranks on coupling, not size, and measures state
// in BOTH directions (§9). Of the 92 sections, exactly two are clean both ways
// at 15,000 units or more — and they are precisely the three that audit #420
// published, minus the one #421 extracted. That agreement is not assumed here;
// §9 re-derives the set from the blob.
//
// Both of those two screening sections then had to be DECOMPOSED, because a
// screening section is not a feature: the larger one contains three `// ═══`
// block headers and spans four independent features. Taking it whole is the
// 551-unit trade-detail trap at 32x scale: 17,734 extra units, and triple the
// external surface. §10 measures seven candidates under one uniform rule; the
// chosen region has 10 external edges against 18, 20, 23, 30, 35 and 77 for the
// rest — the smallest of the seven measured here. No claim is made about
// earlier cycles' regions, which were never measured on this metric.
//
// WHAT IT IS. The backend portfolio API client and its sync layer: five REST
// calls, the sync/apply path, the create/delete flows, the portfolio view
// renderer, and the journal reconciliation report.
//
// NINE OF SIXTEEN OWNERS ARE ASYNC. As recorded in #421, that is unremarkable
// in this chain and says nothing about load safety. What matters is §5 and §6:
// zero top-level calls, zero top-level `await`, and all 67 references to the
// region's 14 dependencies occur inside declarations — call time, not
// evaluation time.
//
// PHASE 2, IF IT HAPPENS, IS A PURE RELOCATION. §11 models it end to end and
// shows the reverse transform reconstructing this exact base byte for byte.
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

// ── Pinned base: the merged #421 extraction ──────────────────────────────────
const BASE_SHA = '9286626159df5241430a00637bcc604111d3f47f';
const BASE_TREE = '72a213fa8321b1af86ad900082f68c153268b86a';
const BASE_PARENT = '8e6b01b8460116fb2ec59bf1e84e6c8ff38229d1';
const BASE_INDEX_BLOB = '7d586a5afd55b048cb5b95d871568c1607dd3ab4';
const BASE_SUBJECT =
  'refactor(portfolio): extract the portfolio data-fetch panel into js/portfolio/portfolio-data-fetch.js (#421)';
const BASE_CHARS = 1746489;
const BASE_UTF8 = 1779224;
const BASE_LF = 30539;
const BASE_INDEX_SHA256 = '124d838e3974cf40b5d97c18fec767233c8655114dcb0dd1282c8da5537bedee';
const BASE_LOCAL_SCRIPTS = 60;
const BASE_TEST_FILES = 142;
const AUDIT_TEST_FILES = 143;

// The inline monolith, in base coordinates.
const INLINE_OPEN = '<script>';
const CODE_AT = 113387;
const CODE_END = 1746463;
const CODE_CHARS = 1633076;

// ── The chosen region, in base coordinates ───────────────────────────────────
const RAW_AT = 938837;
const RAW_END = 961587;
const RAW = { chars: 22750, utf8: 23136, lf: 417,
  sha: 'f2063b042fe5332c0e626c580b3373f3b5eb77bba0e7fdec843cb98594c36386' };
const BODY = { chars: 22749, utf8: 23135, lf: 416,
  sha: 'aca615f3e898a79a6c8e0cd7658bb75b3261e82fb88fb0220e3f0768bd4f4a7a' };
const BLOCK_HEADER = '// BACKEND-BACKED PORTFOLIOS — API client + sync';
const LAST_STATEMENT = 'window.viewLinkedTradesInJournal = viewLinkedTradesInJournal;';

const OWNERS = [
  { name: 'backendListPortfolios', form: 'function', isAsync: true, chars: 237 },
  { name: 'backendGetPortfolio', form: 'function', isAsync: true, chars: 267 },
  { name: 'backendCreatePortfolio', form: 'function', isAsync: true, chars: 284 },
  { name: 'backendUpdatePortfolio', form: 'function', isAsync: true, chars: 308 },
  { name: 'backendDeletePortfolio', form: 'function', isAsync: true, chars: 294 },
  { name: '_portfolioBackendUsable', form: 'function', isAsync: false, chars: 331 },
  { name: '_portfolioBackendSyncInFlight', form: 'var', isAsync: false, chars: 42 },
  { name: '_syncPortfoliosFromBackend', form: 'function', isAsync: true, chars: 1371 },
  { name: '_portfolioOpenBackendLoad', form: 'function', isAsync: false, chars: 376 },
  { name: 'portfolioApplyUpdate', form: 'function', isAsync: true, chars: 839 },
  { name: 'showNewPortfolioForm', form: 'function', isAsync: false, chars: 155 },
  { name: 'createPortfolio', form: 'function', isAsync: true, chars: 2044 },
  { name: 'deletePortfolio', form: 'function', isAsync: true, chars: 1665 },
  { name: 'renderPortfolioView', form: 'function', isAsync: false, chars: 8663 },
  { name: 'getPortfolioJournalReconciliation', form: 'function', isAsync: false, chars: 1378 },
  { name: 'viewLinkedTradesInJournal', form: 'function', isAsync: false, chars: 641 },
];
const OWNER_SPAN_SUM = 18895;

const DEPENDENCIES = [
  'S', '_activeView', '_jSyncJournalFromBackend', '_portfolioRiskDebugEnabled',
  '_updateStormBanner', 'escHtml', 'isApexLocalDevEnv', 'jStatBox', 'journalManager',
  'portStat', 'portfolioManager', 'renderPortfolioJournalView', 'showToast', 'showView',
];
const DEPENDENCY_REFS_CALL_TIME = 67;
const DEPENDENCY_REFS_EVAL_TIME = 0;

const EXTERNAL_EDGES = { _portfolioOpenBackendLoad: 1, renderPortfolioView: 8,
  getPortfolioJournalReconciliation: 1 };
const EXTERNAL_EDGE_TOTAL = 10;

const TOP_LEVEL_STATEMENTS = 12;
const TOP_LEVEL_CALLS = 0;
const TOP_LEVEL_AWAIT = 0;
const TOP_LEVEL_FOREIGN_READS = 0;

// ── The screen ───────────────────────────────────────────────────────────────
const SECTION_COUNT = 92;
const SUB_BANNER_COUNT = 49;
const BLOCK_HEADER_COUNT = 103;
const GLOBAL_VAR_COUNT = 260;
const CLEAN_BOTH_WAYS_LARGE = [
  'Non-destructive storage recovery helpers',
  'FF_BACKEND_CANDLES_SCANNER_CHARTS helper',
];

// ── The seven candidates, measured under one rule (§10) ──────────────────────
// NOTE THE COORDINATE SPACE. Every offset in this table is an offset into the
// INLINE MONOLITH, not into index.html — the two differ by CODE_AT. The region
// offsets above (RAW_AT/RAW_END) are index.html coordinates; §8 converts once,
// into REL_AT/REL_END, and everything below uses monolith offsets directly.
const S0 = 817979;
const CANDIDATES = [
  { key: 'A', at: S0, screenEnd: S0 + 7471, body: 7470, owners: 6, ext: 35, deps: 1 },
  { key: 'B', at: S0 + 7471, screenEnd: S0 + 30221, body: 22749, owners: 16, ext: 10, deps: 14 },
  { key: 'D', at: S0 + 31379, screenEnd: S0 + 40538, body: 9104, owners: 5, ext: 18, deps: 13 },
  { key: 'AB', at: S0, screenEnd: S0 + 30221, body: 30220, owners: 22, ext: 23, deps: 14 },
  { key: 'BD', at: S0 + 7471, screenEnd: S0 + 40538, body: 33012, owners: 21, ext: 20, deps: 19 },
  { key: 'ABD', at: S0, screenEnd: S0 + 40538, body: 40483, owners: 27, ext: 30, deps: 19 },
  { key: 'FF', at: 1594548, screenEnd: 1633076, body: 36392, owners: 11, ext: 77, deps: 27 },
];

// ── The hypothetical Phase 2 extraction (modelled, never written) ────────────
const HYP_MODULE_REL = 'js/portfolio/backend-portfolios.js';
const HYP_TAG = '<script src="./js/portfolio/backend-portfolios.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-data-fetch.js"></script>\n';
const HYP_TAG_CHARS = 61;
const HYP = { chars: 1723800, utf8: 1756149, lf: 30123,
  sha: '5e820b246f62b7e874d3ebe637a1b42b370fbe34698c8980d3781e47862c5ff5', scripts: 61 };

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
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
function localScripts(html) {
  return APP_LOADER.parseScriptTags(html).filter((t) => t.src && /^\.\//.test(t.src));
}
function shape(src) {
  return scanTopLevelDeclarations(src).map((e) => ({
    name: e.name, form: e.form, isAsync: !!e.isAsync, chars: e.chars }));
}
function loadInEmptyVm(src, sandbox) {
  const box = sandbox || {};
  try {
    vm.createContext(box);
    vm.runInContext(src, box, { filename: 'candidate.js' });
    return { ok: true, error: null, globals: Object.keys(box).sort() };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e), globals: Object.keys(box).sort() };
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
// Offsets NOT covered by any top-level declaration's full span — the region's
// true top-level code. This is stricter than `functionBodyRanges`, which starts
// a body at its `{` and so leaves PARAMETER NAMES looking like top-level reads.
function outsideEveryDeclaration(src) {
  const spans = scanTopLevelDeclarations(src).map((d) => [d.start, d.end]);
  return (i) => !spans.some(([s, e]) => i >= s && i <= e);
}
// A region ends after its last top-level CONSTRUCT: the last declaration, plus
// any top-level statement lines that follow it before the next blank line or
// comment. See the header.
function extractableEnd(src, at, screenEnd) {
  const seg = src.slice(at, screenEnd);
  const decls = scanTopLevelDeclarations(seg);
  if (!decls.length) return null;
  const last = decls[decls.length - 1];
  let e = last.start + last.chars + 1;
  for (;;) {
    const nl = seg.indexOf('\n', e);
    if (nl < 0) break;
    const line = seg.slice(e, nl).trim();
    if (line === '' || /^(?:\/\/|\/\*|\*)/.test(line)) break;
    e = nl + 1;
  }
  return at + e;
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const INDEX = APP_LOADER.loadIndexHtml();

console.log('BACKEND-BACKED PORTFOLIOS — TEMPORARY EXTRACTION AUDIT (Phase 1)');
console.log('measurement only · production untouched · base=' + BASE_SHA.slice(0, 8));

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #421 extraction');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'its parent is the merged #420 audit');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the working index.html is byte-identical to the pinned base');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'exactly 60 local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only, so UTF-16 offsets are stable');
eq(INDEX.indexOf(HYP_TAG), -1, 'no backend-portfolios tag exists yet');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no backend-portfolios module exists yet');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at the pinned offset');
eq(CODE_END - CODE_AT, CODE_CHARS, 'the monolith is 1,633,076 units after #421');

const baseTestFiles = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
  .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
eq(baseTestFiles.length, BASE_TEST_FILES, 'the base suite is exactly 142 test files');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, AUDIT_TEST_FILES,
  'with this temporary audit the suite is 143 test files');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The monolith, and the three banner styles');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
eq(CODE.length, CODE_CHARS, 'the inline body is sliced at the pinned offsets');
eq(INDEX.indexOf(CODE), CODE_AT, 'and that slice occurs at exactly one place');
{
  const styles = (re) => (CODE.match(re) || []).length;
  eq(styles(/^\/\/ ── /gm), SECTION_COUNT, 'the monolith carries 92 `// ── ` SECTION banners');
  eq(styles(/^\/\/ ─── /gm), SUB_BANNER_COUNT, 'a second style, `// ─── `, marks 49 sub-banners and delimits nothing');
  eq(styles(/^\/\/ ═══/gm), BLOCK_HEADER_COUNT, 'a third, `// ═══`, marks 103 block headers');
  eq(SECTION_COUNT + 1, 93, 'exactly one section banner fewer than the 93 audit #420 measured — it left with the #421 block');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The region, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
const RAW_TEXT = INDEX.slice(RAW_AT, RAW_END);
const BODY_TEXT = INDEX.slice(RAW_AT, RAW_END - 1);
eq(metrics(RAW_TEXT), RAW, 'raw identity');
eq(metrics(BODY_TEXT), BODY, 'body identity');
eq(BODY_TEXT + '\n', RAW_TEXT, 'raw === body + exactly one LF');
eq(RAW_TEXT.slice(-3), ';\n\n', 'raw ends `;\\n\\n` — a statement seam, not the `}\\n\\n` of every prior cut');
eq(INDEX.slice(RAW_AT - 3, RAW_AT), ';\n\n', 'and it opens right after a complete `;\\n\\n` seam');
ok(RAW_TEXT.indexOf(BLOCK_HEADER) >= 0, 'the block carries its own `// ═══` feature header');
eq(countLiteral(CODE, BLOCK_HEADER), 1, '…which occurs exactly once in the whole monolith');
eq(INDEX.slice(RAW_END, RAW_END + 5), '// ══', 'the next feature’s block header begins immediately after');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The corrected boundary rule');
// ─────────────────────────────────────────────────────────────────────────────
{
  const decls = scanTopLevelDeclarations(BODY_TEXT);
  const last = decls[decls.length - 1];
  eq(last.name, 'viewLinkedTradesInJournal', 'the last DECLARATION in the region');
  const afterLastDecl = last.start + last.chars + 1;
  ok(afterLastDecl < BODY_TEXT.length, 'the body does NOT end at the last declaration');
  eq(BODY_TEXT.length - afterLastDecl, 62,
    'the old rule would have stopped 62 units short — the re-export line and its LF');
  eq(BODY_TEXT.slice(afterLastDecl, BODY_TEXT.length - 1), LAST_STATEMENT,
    '…and those 62 units are exactly the `window.X = X` re-export');
  eq(BODY_TEXT.slice(-1), '\n', 'the body ends on a line terminator');
  ok(!BODY_TEXT.endsWith('\n\n'), '…and not on a blank line, so a module written from it needs no trimming');

  // The rule, applied mechanically, reproduces the pinned end. The window it
  // searches is derived, not pinned: the region opens on its own `// ══` header
  // and runs to the NEXT one, which is what a screener actually knows.
  const nextHeaderAt = INDEX.indexOf('\n// ═', RAW_AT + 1) + 1;
  ok(nextHeaderAt > RAW_AT, 'a following `// ══` block header exists');
  eq(extractableEnd(INDEX, RAW_AT, nextHeaderAt), RAW_END - 1,
    'the corrected rule derives the pinned body end without being told it');
  ok(nextHeaderAt !== RAW_END - 1,
    '…and that end is NOT simply the header offset, so the rule did real work');

  // A CONTROL. The rule must also reproduce a boundary that ends on a
  // declaration, or it has merely been fitted to this one region. The #421
  // module is the proven case: its body ends at its last declaration.
  const priorModule = fs.readFileSync(path.join(ROOT, 'js', 'portfolio', 'portfolio-data-fetch.js'), 'utf8');
  const priorDecls = scanTopLevelDeclarations(priorModule);
  const priorLast = priorDecls[priorDecls.length - 1];
  eq(priorLast.start + priorLast.chars + 1, priorModule.length,
    'CONTROL: on the shipped #421 module the last declaration IS the end');
  eq(extractableEnd(priorModule, 0, priorModule.length), priorModule.length,
    '…and the corrected rule returns that same end, so it generalises both ways');

  // THE COUNTEREXAMPLE, AS A CHECK RATHER THAN A NOTE. The header claims the old
  // rule was already incomplete before this cycle. That is a claim about all
  // sixteen layers, so it is measured over all sixteen rather than asserted.
  const CHAIN = [
    'js/services/journal-core.js', 'js/services/mcx-regime-policy.js', 'js/ui/journal-ui.js',
    'js/services/journal-remote-persistence.js', 'js/services/journal-backend-write-through.js',
    'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
    'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
    'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js', 'js/ui/journal-close-legs.js',
    'js/ui/journal-trade-forms.js', 'js/ui/journal-trade-detail.js',
    'js/portfolio/portfolio-data-fetch.js',
  ];
  eq(CHAIN.length, 16, 'the chain this audit quantifies over is the sixteen shipped layers');
  const withTail = [];
  for (const rel of CHAIN) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const d = scanTopLevelDeclarations(src);
    ok(d.length > 0, rel + ': has top-level declarations');
    const after = d[d.length - 1].start + d[d.length - 1].chars + 1;
    const tailLines = src.slice(Math.min(after, src.length)).split('\n')
      .filter((l) => l.trim() && !/^\s*(?:\/\/|\/\*|\*)/.test(l));
    if (tailLines.length) withTail.push(rel);
  }
  eq(withTail, ['js/services/journal-backend-write-through.js'],
    'exactly ONE earlier layer already ended on trailing top-level code');
  eq(CHAIN.length - withTail.length, 15, '…so fifteen of sixteen end at their last declaration');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The twelve top-level statements, and why moving them EARLIER is safe');
// ─────────────────────────────────────────────────────────────────────────────
{
  const decls = scanTopLevelDeclarations(BODY_TEXT);
  const outside = outsideEveryDeclaration(BODY_TEXT);
  let statements = 0, off = 0;
  for (const line of BODY_TEXT.split('\n')) {
    const t = line.trim();
    if (t && outside(off) && !/^(?:\/\/|\/\*|\*)/.test(t)) statements++;
    off += line.length + 1;
  }
  eq(statements, TOP_LEVEL_STATEMENTS, 'the region carries twelve top-level statement lines');
  eq(topLevelCallSites(BODY_TEXT).filter(
    (c) => !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(c.name)).length,
    TOP_LEVEL_CALLS, 'none of them CALLS anything');
  eq(topLevelHits(BODY_TEXT, /\bawait\b/).length, TOP_LEVEL_AWAIT, 'and none awaits');

  // The safety argument. A module tag sits BEFORE the inline monolith, so this
  // code would run EARLIER than it does today. That is safe only if it reads
  // nothing but `window` and the region's own owners.
  const ownerNames = new Set(decls.map((d) => d.name));
  const masked = maskLiterals(BODY_TEXT);
  const reads = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) {
    const i = m.index + m[1].length;
    if (!outside(i)) continue;
    const n = m[2];
    if (JS_KEYWORDS.has(n) || n === 'window' || n === 'e') continue;
    reads.add(n);
  }
  const foreign = Array.from(reads).filter((n) => !ownerNames.has(n));
  eq(foreign, [], 'the top-level code reads NO name the region does not own');
  eq(foreign.length, TOP_LEVEL_FOREIGN_READS, '…so running it earlier cannot change what it sees');
  ok(reads.size > 0, 'and it does read own owners, so the measurement is not vacuous');

  // A GAP IN THE READER, CLOSED RATHER THAN LEFT UNSAID. `outsideEveryDeclaration`
  // skips a declaration's WHOLE span, so a `var x = someGlobal;` initializer —
  // which really is an evaluation-time read — would not be counted. The region
  // declares exactly one var, so the gap is closed by measuring it directly.
  {
    const theVar = decls.find((d) => d.form === 'var');
    const text = BODY_TEXT.slice(theVar.start, theVar.end + 1);
    eq(text, 'var _portfolioBackendSyncInFlight = false;',
      'the region’s one top-level var is pinned in full');
    ok(/=\s*(?:false|true|null|\d+|'[^']*'|"[^"]*")\s*;$/.test(text),
      '…and initialises from a literal, so it reads no name the span-skip would have hidden');
  }

  // A CONTROL on the reader itself. Its whole job is to ignore identifiers
  // inside declarations; on an input where a foreign read IS at top level it
  // must say so, or `foreign = []` proves nothing.
  {
    const probe = 'function f(a){ return a + hidden; }\nwindow.g = f;\nwindow.h = elsewhere;\n';
    const pOutside = outsideEveryDeclaration(probe);
    const pMasked = maskLiterals(probe);
    const pOwners = new Set(scanTopLevelDeclarations(probe).map((d) => d.name));
    const seen = new Set();
    const pre = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let pm;
    while ((pm = pre.exec(pMasked))) {
      const i = pm.index + pm[1].length;
      if (!pOutside(i)) continue;
      const n = pm[2];
      if (JS_KEYWORDS.has(n) || n === 'window' || n === 'e') continue;
      seen.add(n);
    }
    const pForeign = Array.from(seen).filter((n) => !pOwners.has(n)).sort();
    eq(pForeign, ['elsewhere'], 'CONTROL: a foreign read at top level IS reported');
    ok(!pForeign.includes('hidden'), '…while one inside a declaration is correctly ignored');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Owners, and evaluation-time behaviour');
// ─────────────────────────────────────────────────────────────────────────────
eq(shape(BODY_TEXT), OWNERS, 'the region owns exactly these sixteen top-level declarations');
eq(OWNERS.filter((o) => o.isAsync).length, 9, 'nine are async');
eq(OWNERS.filter((o) => o.form === 'var').length, 1, 'and it declares exactly one mutable global');
eq(OWNERS.reduce((a, o) => a + o.chars, 0), OWNER_SPAN_SUM,
  'the owner spans sum to 18,895 of the 22,749-unit body; the rest is comment and seam');
{
  // In a browser the module is a classic script and `window` always exists. An
  // EMPTY VM has no `window`, so the honest test supplies one and nothing else.
  const bare = loadInEmptyVm(BODY_TEXT, {});
  ok(!bare.ok, 'in a totally empty VM the module throws — it re-exports onto `window`');
  ok(/window is not defined/.test(bare.error), '…and the reason is exactly that, nothing else');
  const win = {};
  const box = { window: win };
  const withWindow = loadInEmptyVm(BODY_TEXT, box);
  ok(withWindow.ok, 'given only a bare `window` object it loads cleanly');
  eq(withWindow.globals.filter((g) => g !== 'window').sort(), OWNERS.map((o) => o.name).sort(),
    '…defining its sixteen owners and nothing else');
  eq(Object.keys(win).sort(),
    ['_portfolioOpenBackendLoad', '_syncPortfoliosFromBackend', 'apexUpdatePortfolio',
     'backendCreatePortfolio', 'backendDeletePortfolio', 'backendGetPortfolio',
     'backendListPortfolios', 'backendUpdatePortfolio', 'getPortfolioJournalReconciliation',
     'viewLinkedTradesInJournal'].sort(),
    'and touching `window` only with its own ten re-exports');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Dependencies — all of them at call time');
// ─────────────────────────────────────────────────────────────────────────────
const MONOLITH_NAMES = new Set(scanTopLevelDeclarations(CODE).map((d) => d.name));
{
  const owned = new Set(OWNERS.map((o) => o.name));
  const deps = freeIdentifiers(BODY_TEXT).filter((n) => MONOLITH_NAMES.has(n) && !owned.has(n));
  eq(deps, DEPENDENCIES, 'the region depends on exactly these fourteen monolith names');
  const outside = outsideEveryDeclaration(BODY_TEXT);
  const masked = maskLiterals(BODY_TEXT);
  let callTime = 0, evalTime = 0;
  for (const n of deps) for (const i of refSites(masked, n)) (outside(i) ? evalTime++ : callTime++);
  eq(callTime, DEPENDENCY_REFS_CALL_TIME, 'they are read 67 times, all inside a declaration');
  eq(evalTime, DEPENDENCY_REFS_EVAL_TIME, 'and not once at evaluation time');
  ok(callTime > 0, 'the split is measured on real references, not an empty set');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. External edges — the consumers left behind');
// ─────────────────────────────────────────────────────────────────────────────
const VIEWS = lexicalViews(CODE);
const REL_AT = RAW_AT - CODE_AT;
const REL_END = (RAW_END - 1) - CODE_AT;
{
  const edges = {};
  let total = 0;
  for (const o of OWNERS) {
    const out = refSites(VIEWS.code, o.name).filter((i) => i < REL_AT || i >= REL_END);
    if (out.length) { edges[o.name] = out.length; total += out.length; }
  }
  eq(edges, EXTERNAL_EDGES, 'three owners are called from outside the region');
  eq(total, EXTERNAL_EDGE_TOTAL, 'ten external edges in total');
  let strings = 0;
  for (const o of OWNERS) {
    strings += refSites(VIEWS.strings, o.name).filter((i) => i < REL_AT || i >= REL_END).length;
  }
  eq(strings, 0, 'and no markup handler or string names an owner, so nothing is stranded');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. State coupling, in BOTH directions');
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_VARS = scanTopLevelDeclarations(CODE).filter((d) => d.form === 'var').map((d) => d.name);
eq(GLOBAL_VARS.length, GLOBAL_VAR_COUNT,
  'the monolith declares 260 mutable globals — the population the outbound rule is tested against');
{
  const owned = new Set(OWNERS.map((o) => o.name));
  const ownVars = OWNERS.filter((o) => o.form === 'var').map((o) => o.name);
  let inbound = 0;
  for (const n of ownVars) {
    for (const i of refSites(VIEWS.code, n)) {
      if (i >= REL_AT && i < REL_END) continue;
      if (isWriteAt(VIEWS.code, i, n)) inbound++;
    }
  }
  eq(inbound, 0, 'INBOUND: nothing outside writes the one global the region owns');
  const maskedBody = maskLiterals(BODY_TEXT);
  let outbound = 0;
  const outNames = new Set();
  for (const n of GLOBAL_VARS) {
    if (owned.has(n)) continue;
    for (const i of refSites(maskedBody, n)) {
      if (isWriteAt(maskedBody, i, n)) { outbound++; outNames.add(n); }
    }
  }
  eq(outbound, 0, 'OUTBOUND: the region writes NO global it does not own');
  eq(Array.from(outNames), [], '…and so there is no foreign name to list');
}
// Controls: a metric whose true value is 0 must be shown to move.
{
  const probe = maskLiterals('var _foreign = 1;\nfunction f(){ _foreign = 2; _foreign.x = 3; }\n');
  let n = 0;
  for (const i of refSites(probe, '_foreign')) if (isWriteAt(probe, i, '_foreign')) n++;
  eq(n, 3, 'CONTROL: the write rule detects the declaration, the plain assignment and the deep one');
  const readOnly = maskLiterals('function f(){ return _foreign + 1; }\n');
  let r = 0;
  for (const i of refSites(readOnly, '_foreign')) if (isWriteAt(readOnly, i, '_foreign')) r++;
  eq(r, 0, '…and reports nothing where the name is only read');
}
// The clean-both-ways set, re-derived rather than quoted from #420.
{
  const bannerAt = [];
  const re = /^\/\/ ── /gm;
  let m;
  while ((m = re.exec(CODE))) bannerAt.push(m.index);
  eq(bannerAt.length, SECTION_COUNT, 'the screen walks all 92 sections');
  const clean = [];
  for (let i = 0; i < bannerAt.length; i++) {
    const at = bannerAt[i];
    const end = i + 1 < bannerAt.length ? bannerAt[i + 1] : CODE.length;
    if (end - at < 15000) continue;
    const text = CODE.slice(at, end);
    const decls = scanTopLevelDeclarations(text);
    const owned = new Set(decls.map((d) => d.name));
    let inbound = 0;
    for (const n of decls.filter((d) => d.form === 'var').map((d) => d.name)) {
      for (const j of refSites(VIEWS.code, n)) {
        if (j >= at && j < end) continue;
        if (isWriteAt(VIEWS.code, j, n)) inbound++;
      }
    }
    const mb = maskLiterals(text);
    let outbound = 0;
    for (const n of GLOBAL_VARS) {
      if (owned.has(n)) continue;
      for (const j of refSites(mb, n)) if (isWriteAt(mb, j, n)) outbound++;
    }
    if (inbound === 0 && outbound === 0) {
      clean.push(text.slice(0, text.indexOf('\n')).replace(/^\/\/ ── /, '').replace(/[─\s]+$/, ''));
    }
  }
  eq(clean, CLEAN_BOTH_WAYS_LARGE,
    'exactly two large sections are clean both ways — #420’s three, minus the one #421 took');
  // The 15,000-unit floor must be doing work. If it admitted the same set at any
  // threshold, the number would be decoration rather than a stated bound.
  {
    let below = 0;
    for (let i = 0; i < bannerAt.length; i++) {
      const at = bannerAt[i];
      const end = i + 1 < bannerAt.length ? bannerAt[i + 1] : CODE.length;
      const span = end - at;
      if (span >= 13000 && span < 15000) below++;
    }
    ok(below > 0, 'CONTROL: sections sit just under the floor, so 15,000 selects rather than describes');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Seven candidates under one rule — why B, and why not the section');
// ─────────────────────────────────────────────────────────────────────────────
{
  const measured = [];
  for (const C of CANDIDATES) {
    const end = extractableEnd(CODE, C.at, C.screenEnd);
    const body = CODE.slice(C.at, end);
    const decls = scanTopLevelDeclarations(body);
    const owned = new Set(decls.map((d) => d.name));
    let ext = 0;
    for (const n of owned) {
      ext += refSites(VIEWS.code, n).filter((i) => i < C.at || i >= end).length;
    }
    const deps = freeIdentifiers(body).filter((n) => MONOLITH_NAMES.has(n) && !owned.has(n)).length;
    // The screening window must not be what ends the region: if the derived end
    // reached the window edge, the number below would be an artefact of the
    // window rather than a measurement of the feature.
    ok(end < C.screenEnd, C.key + ': the derived end falls strictly inside its screening window');
    measured.push({ key: C.key, body: body.length, owners: decls.length, ext, deps });
  }
  eq(measured, CANDIDATES.map((c) => ({ key: c.key, body: c.body, owners: c.owners, ext: c.ext, deps: c.deps })),
    'all seven candidates measure as pinned');
  const chosen = measured.find((c) => c.key === 'B');
  const others = measured.filter((c) => c.key !== 'B');
  ok(others.every((c) => c.ext > chosen.ext),
    'the chosen region has strictly the fewest external edges of the seven');
  eq(chosen.ext, EXTERNAL_EDGE_TOTAL, '…ten, against 18, 20, 23, 30, 35 and 77');
  // Taking the whole screening section is the documented trap, quantified.
  const abd = measured.find((c) => c.key === 'ABD');
  eq(abd.body - chosen.body, 17734,
    'the whole screening section would have swallowed 17,734 extra units of three other features');
  eq(abd.ext - chosen.ext, 20, '…and tripled the external surface');
  // Combining is not always worse: it is worse HERE, and the reason is measured.
  const ab = measured.find((c) => c.key === 'AB');
  ok(ab.ext > chosen.ext,
    'adding the storage helpers internalises portfolioManager but exposes five more names, netting worse');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. The modelled Phase 2 — never written, only computed');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(HYP_TAG.length, HYP_TAG_CHARS, 'the modelled tag line is 61 units');
  eq(countLiteral(INDEX, ANCHOR_TAG), 1, 'its anchor, the #421 tag, occurs exactly once');
  const anchorAt = INDEX.indexOf(ANCHOR_TAG);
  ok(anchorAt < RAW_AT, 'the anchor sits far above the fragment, so removing the tag does not move it');
  eq(INDEX.slice(anchorAt + ANCHOR_TAG.length, anchorAt + ANCHOR_TAG.length + INLINE_OPEN.length),
    INLINE_OPEN, 'and the inline monolith opens immediately after it');

  const withTag = INDEX.slice(0, anchorAt + ANCHOR_TAG.length) + HYP_TAG +
    INDEX.slice(anchorAt + ANCHOR_TAG.length);
  const shifted = RAW_AT + HYP_TAG.length;
  const hyp = withTag.slice(0, shifted) + withTag.slice(shifted + RAW_TEXT.length);
  eq(metrics(hyp), { chars: HYP.chars, utf8: HYP.utf8, lf: HYP.lf, sha: HYP.sha },
    'the extracted index.html would be exactly this document');
  eq(localScripts(hyp).length, HYP.scripts, '…carrying 61 local scripts');
  eq(hyp.length - INDEX.length, HYP_TAG_CHARS - RAW.chars, 'the net delta is the tag minus the fragment');
  eq(hyp.indexOf(BLOCK_HEADER), -1, 'the feature header would leave index.html with the block');

  // The reverse transform is the whole contract of a relocation.
  const tagAt = hyp.indexOf(HYP_TAG);
  const untagged = hyp.slice(0, tagAt) + hyp.slice(tagAt + HYP_TAG.length);
  const back = untagged.slice(0, RAW_AT) + BODY_TEXT + '\n' + untagged.slice(RAW_AT);
  eq(back, INDEX, 'and the reverse transform reconstructs this base byte for byte');
  eq(sha256(back), BASE_INDEX_SHA256, '…confirmed by hash as well as by equality');
}

// ─────────────────────────────────────────────────────────────────────────────
section('12. Production is untouched');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', BASE_SHA, '--']).trim();
  const files = changed ? changed.split('\n') : [];
  const unexpected = files.filter((f) => f !== 'tests/temporary-backend-portfolios-boundary-audit.test.js' &&
    !/^tests\/[a-z0-9-]+\.test\.js$/.test(f));
  eq(unexpected, [], 'nothing outside tests/ differs from the base');
  ok(!files.includes('index.html'), 'index.html is untouched');
  ok(!files.some((f) => f.startsWith('js/')), 'no module is touched');

  // The only edit to existing files is the suite-count ratchet, in six places.
  const ratchet = files.filter((f) => f !== 'tests/temporary-backend-portfolios-boundary-audit.test.js');
  eq(ratchet.length, 6, 'exactly six existing contracts change');
  for (const f of ratchet) {
    const diff = git(['diff', '-U0', BASE_SHA, '--', f]).split('\n')
      .filter((l) => /^[-+][^-+]/.test(l));
    eq(diff.length, 2, f + ': exactly one line replaced');
    ok(/TEST_FILE_COUNT = 142;$/.test(diff[0]), f + ': the removed line is the old count');
    ok(/TEST_FILE_COUNT = 143;$/.test(diff[1]), f + ': the added line is the new one');
  }
}

console.log('\n' + pass + ' assertions passed.');
