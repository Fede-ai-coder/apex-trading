'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL TRADE DETAIL — permanent boundary contract.
//
// Replaces tests/temporary-journal-trade-detail-boundary-audit.test.js, which
// measured two candidates and recommended this one. That audit is deleted by
// this change; §12 proves it.
//
// WHAT THE AUDIT FOUND. Under one stated rule — a section is a column-0
// `// ── ` banner running to the next one — the inline monolith held 95
// sections. This region was the NINTH largest, and size is not why it was
// chosen. It was chosen on coupling: the eight larger sections are reached from
// outside themselves by between 10 and 172 executable references, and this one
// by TWO. It declares no mutable state at all, so there was none to split.
//
//     units  owners  extEdges  stateW  deps
//     49103       6         2       0    15   << this region
//     50444      44       172       0    55   the cheapest larger rival: 5× worse
//
// TWO CANDIDATES were measured: G (this one) and H, the metrics block without
// `closeTradeDetail`. Their dependency surface and executable edges were
// identical, so H's only difference was stranding one 101-unit function — and
// with it the modal's own static markup handler — inline. G took the whole
// feature.
//
// RELOCATION ONLY. Every moved byte is byte-identical to the base, and §9
// proves the reverse transform reconstructs 9f554aa7:index.html exactly.
//
// THE PREDICTION HELD. The audit modelled this extraction before it happened
// and published the resulting document: 1,765,976 units / 30,869 LF /
// 4c37a2ac…, 59 local scripts. §8 asserts the shipped document is exactly that.
//
// THE LOAD-ORDER QUESTION. This is the first layer in this family whose module
// is defined AFTER modules that already depend on it: journal-ui.js (#46),
// journal-close-legs.js (#56) and journal-trade-forms.js (#57) all load before
// the new tag at #58. §10 proves that safe the only way it can be proved — by
// scanning every application part and showing that all 18 references are
// call-time and NOT ONE is at evaluation time.
//
// Run: node tests/journal-trade-detail-boundary-contract.test.js
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
const U = require('./lib/journal-trade-detail-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/ui/journal-trade-detail.js';
const MODULE_SRC = './' + MODULE_REL;
const CONTRACT_REL = 'tests/journal-trade-detail-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-trade-detail-undo.js';
const AUDIT_REL = 'tests/temporary-journal-trade-detail-boundary-audit.test.js';

// ── Pinned base: the merged #416 audit ───────────────────────────────────────
const BASE_SHA = '9f554aa70b5ee726c25e98afca8b2f8d7d4ff699';
const BASE_TREE = '6cbfe61d261867c73b7a1782414edabf7b89a4ca';
const BASE_SUBJECT = 'test(audit): measure the Journal trade-detail boundary (#416)';
const BASE_PARENT = '93fe1cbc8d31e5d6428335a0854371ab404893cb';
const BASE_INDEX_BLOB = '508485a5dc29265f36cb35a1efb3f8b506cb7cea';
const BASE_CHARS = 1815024;
const BASE_UTF8 = 1848827;
const BASE_LF = 31737;
const BASE_INDEX_SHA256 = '7e0851ae220daa6454cf2f3f093821b29c8aff8ba137cb0bbef24283bb976156';
const BASE_LOCAL_SCRIPTS = 58;
// Ratchet. Advanced to 142 by the portfolio data-fetch extraction audit. That
// audit is replaced one-for-one by its permanent contract, so it stays at 142.
const TEST_FILE_COUNT = 146;

// ── The moved fragment, in base coordinates ──────────────────────────────────
const RAW_AT = 1717386;
const RAW_END = 1766490;
const RAW = { chars: 49104, utf8: 49862, lf: 869, sha: '2462dc790cc07e1c6db84a3c4c940cc105dd09b33a0e3f5383d945a0ee35d0ef' };
const BODY = { chars: 49103, utf8: 49861, lf: 868, sha: '70e2952a2664c812184fe8b4d3825be685d6a2945d00eedc4c0eb12a453e70fe' };
const BANNER = '// ── TRADE DETAIL MODAL ──────────────────────────────────────────';
const START_LINE = 29974;

const OWNERS = [
  { name: 'closeTradeDetail', form: 'function', isAsync: false, chars: 101 },
  { name: '_tradeMetrics', form: 'function', isAsync: false, chars: 2861 },
  { name: 'showTradeDetails', form: 'function', isAsync: false, chars: 38321 },
  { name: '_renderAdjustmentTimeline', form: 'function', isAsync: false, chars: 5756 },
  { name: '_priceCellHtml', form: 'function', isAsync: false, chars: 1365 },
  { name: '_detailCell', form: 'function', isAsync: false, chars: 330 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);

const DEPENDENCIES = ['Date', 'JSON', 'Math', 'String', 'computeDTE', 'computeMoneyness',
  'console', 'document', 'escHtml', 'isNaN', 'journalManager', 'normalizeIvrPercent',
  'parseFloat', 'portfolioManager', 'showToast'];
const CALLTIME_REFS = 113;

// ── The shipped document ─────────────────────────────────────────────────────
const INDEX_CHARS = 1765976;
const INDEX_UTF8 = 1799021;
const INDEX_LF = 30869;
const INDEX_SHA256 = '4c37a2ac130c753a1100d6633df688bc6f97ae429535f0b3d86a64fa7bf96be9';
const LOCAL_SCRIPT_COUNT = 59;
const TAG_AT = 113260;
const CODE_AT = 113324;
const CODE_END = 1765950;

const MODULE_TAG = '<script src="' + MODULE_SRC + '"></script>';
const ANCHOR_TAG = '<script src="./js/ui/journal-trade-forms.js"></script>';
const INLINE_OPEN = '<script>';

// ── The consumer topology ────────────────────────────────────────────────────
const EXTERNAL_CODE = { _tradeMetrics: 'renderPortfolioJournalView', showTradeDetails: 'submitClosePosition' };
const GENERATED_BY = ['renderPositionsPanel', 'renderPortfolioJournalView'];
const STATIC_HANDLER = 'onclick="if(event.target===this)closeTradeDetail()"';
// A markup comment uses ══ where the code banner used ──. After extraction the
// code banner is GONE and this one STAYS; §7 asserts both halves.
const MARKUP_COMMENT = '<!-- ══ TRADE DETAIL MODAL';

// ── Modules that already depended on this one before it was extracted ────────
const DEPENDANTS = {
  './js/ui/journal-ui.js': { owner: '_tradeMetrics', position: 46, callTime: 2 },
  './js/ui/journal-close-legs.js': { owner: 'showTradeDetails', position: 56, callTime: 1 },
  './js/ui/journal-trade-forms.js': { owner: 'showTradeDetails', position: 57, callTime: 1 },
};
const MODULE_POSITION = 58;
const PARTS_TOTAL = 63;
const TOTAL_CALLTIME = 18;

// ─────────────────────────────────────────────────────────────────────────────
// Harness
// ─────────────────────────────────────────────────────────────────────────────
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throws(fn, re, m) { assert.throws(fn, re, m); pass++; }
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
    vm.runInContext(src, sandbox, { filename: filename || 'module.js' });
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
  return {
    code: masked,
    strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]),
  };
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

console.log('JOURNAL TRADE DETAIL — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited Candidate G (#416) · base=' + BASE_SHA);

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
// This is the NEWEST layer, so the live document is the one it shipped: there
// is nothing on top to peel. When a later layer lands it goes here, first.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// The Portfolio data-fetch owner is a LATER layer sitting on top of this one, so
// the live document is no longer the one this layer shipped. Peel it first.
const EXPIRY_MANUAL_U = require('./lib/portfolio-expiry-manual-undo.js');
const BACKEND_PORTFOLIOS_U = require('./lib/backend-portfolios-undo.js');
const EXPIRY_MANUAL_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-expiry-manual.js'), 'utf8');
const BACKEND_PORTFOLIOS_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/backend-portfolios.js'), 'utf8');
const PORTFOLIO_U = require('./lib/portfolio-data-fetch-undo.js');
const PORTFOLIO_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-data-fetch.js'), 'utf8');
// Backend portfolios is now the newest layer of all; peel it before the
// portfolio data fetch, or that undo sees a document it was not cut against.
const PRE_EXPIRY_MANUAL = EXPIRY_MANUAL_U.isApplied(LIVE_INDEX)
  ? EXPIRY_MANUAL_U.undoPortfolioExpiryManual(LIVE_INDEX, EXPIRY_MANUAL_MODULE)
  : LIVE_INDEX;
const PRE_BACKEND_PORTFOLIOS = BACKEND_PORTFOLIOS_U.isApplied(PRE_EXPIRY_MANUAL)
  ? BACKEND_PORTFOLIOS_U.undoBackendPortfolios(PRE_EXPIRY_MANUAL, BACKEND_PORTFOLIOS_MODULE)
  : PRE_EXPIRY_MANUAL;
const INDEX = PORTFOLIO_U.isApplied(PRE_BACKEND_PORTFOLIOS)
  ? PORTFOLIO_U.undoPortfolioDataFetch(PRE_BACKEND_PORTFOLIOS, PORTFOLIO_MODULE)
  : PRE_BACKEND_PORTFOLIOS;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const BASE_INDEX = git(['show', BASE_SHA + ':index.html']);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base, rederived from git');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #416 audit');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is the merged #415 extraction');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(BASE_INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the base document has its pinned identity');
eq(localScripts(BASE_INDEX).length, BASE_LOCAL_SCRIPTS, 'the base loaded 58 local application scripts');
ok(BASE_INDEX.indexOf('\r') < 0, 'the base is LF-only, so UTF-16 offsets are stable');
eq(BASE_INDEX.indexOf(MODULE_TAG), -1, 'the base had no trade-detail tag');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'the undo helper pins the same base');
eq(U.BASE_CHARS, BASE_CHARS, '…and the same length');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The moved fragment, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
const RAW_TEXT = BASE_INDEX.slice(RAW_AT, RAW_END);
const BODY_TEXT = BASE_INDEX.slice(RAW_AT, RAW_END - 1);
eq(metrics(RAW_TEXT), RAW, 'the raw fragment has its pinned identity');
eq(metrics(BODY_TEXT), BODY, 'the body has its pinned identity');
eq(BODY_TEXT + '\n', RAW_TEXT, 'raw === body + exactly one structural LF');
eq(RAW_TEXT.slice(-3), '}\n\n', 'the raw fragment ends `}\\n\\n`');
eq(BASE_INDEX.slice(RAW_AT - 3, RAW_AT), '}\n\n', 'it opened right after a complete `}\\n\\n` seam');
eq(lineAt(BASE_INDEX, RAW_AT), START_LINE, 'it opened on its pinned line');
eq(BASE_INDEX.slice(RAW_AT, RAW_AT + BANNER.length), BANNER, 'it opened on its own banner');
eq({ at: U.RAW_AT, end: U.RAW_END, chars: U.RAW_CHARS, sha: U.RAW_SHA256 },
  { at: RAW_AT, end: RAW_END, chars: RAW.chars, sha: RAW.sha }, 'the undo helper pins the same raw range');
// The structural separator is exactly one LF, and the undo owns it.
eq(BASE_INDEX.slice(U.SEPARATOR_AT, U.SEPARATOR_AT + 1), '\n', 'the pinned separator offset holds one LF');
eq(U.SEPARATOR, '\n', 'the undo re-inserts exactly that');
eq(U.SEPARATOR_AT, RAW_END - 1, 'the separator is the raw fragment’s last unit');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The module file');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(MODULE), BODY, 'the shipped module is byte-identical to the base body');
eq(MODULE, BODY_TEXT, '…the same bytes, compared directly and not only by hash');
eq(MODULE.slice(-2), '}\n', 'it ends on a real line of code');
ok(!/\n\s*\n$/.test(MODULE), '…with no blank line at EOF, so `git diff --check` stays clean');
eq(MODULE.indexOf('\r'), -1, 'the module is LF-only');
eq(MODULE.length, U.MODULE_CHARS, 'the undo helper pins the module length');
eq(sha256(MODULE), U.MODULE_SHA256, '…and its hash');
eq(MODULE.slice(0, BANNER.length), BANNER, 'the module opens on the banner the block carried');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The six owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(shape(MODULE), OWNERS, 'the module declares exactly its six owners, in order, with the pinned spans');
eq(shape(MODULE).filter((d) => d.form === 'var').length, 0, 'it declares NO mutable state at all');
eq(shape(MODULE).filter((d) => d.isAsync).length, 0, '…and NO async owner');
eq(shape(MODULE).every((d) => d.form === 'function'), true, 'all six are plain function declarations');
eq(OWNERS.reduce((n, o) => n + o.chars, 0), 48734, 'the six owner spans sum to 48,734 units');
ok(OWNERS.find((o) => o.name === 'showTradeDetails').chars > 38000,
  'showTradeDetails alone is over 38,000 units — the bulk of the module');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Load-time purity');
// ─────────────────────────────────────────────────────────────────────────────
{
  const decls = scanTopLevelDeclarations(MODULE);
  const ch = Array.from(MODULE);
  decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) ch[i] = ' '; });
  eq(maskLiterals(ch.join('')).replace(/\s+/g, ''), '', 'declarations, comments and whitespace only at top level');
}
const loaded = loadInEmptyVm(MODULE, 'journal-trade-detail.js');
ok(loaded.ok, 'the module evaluates in a completely empty VM with no error');
eq(loaded.globals, OWNER_NAMES.slice().sort(), '…and defines exactly its own owners, nothing else');
eq(topLevelCallSites(MODULE).length, 0, 'zero top-level calls');
eq(topLevelHits(MODULE, /\b(?:document|window)\s*\./).length, 0, 'zero top-level DOM access');
eq(topLevelHits(MODULE, /\baddEventListener\b/).length, 0, 'zero top-level listeners');
eq(topLevelHits(MODULE, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, 'zero top-level timers');
eq(topLevelHits(MODULE, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length, 0, 'zero top-level storage access');
eq(topLevelHits(MODULE, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/).length, 0, 'zero top-level network work');
eq(topLevelHits(MODULE, /\b(?:journalManager|positionManager|portfolioManager)\b/).length, 0, 'zero top-level journal work');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependencies');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(MODULE), DEPENDENCIES, 'the module free-depends on exactly these 15 names');
eq(DEPENDENCIES.length, 15, 'fifteen — the smallest surface of any section the audit screened');
eq(classifyReferences(MODULE, DEPENDENCIES).loadTime, [], 'it reads NO dependency at evaluation time');
eq(classifyReferences(MODULE, DEPENDENCIES).callTime.length, CALLTIME_REFS, '113 call-time references');
eq(DEPENDENCIES.filter((n) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)), [],
  'every dependency is a whole plain identifier, not a state object path');

// ─────────────────────────────────────────────────────────────────────────────
section('7. The consumer topology, in the shipped document');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
const decls = scanTopLevelDeclarations(CODE);
{
  let code = 0, generated = 0;
  const hosts = {}, genHosts = {};
  for (const n of OWNER_NAMES) {
    for (const i of refSites(VIEWS.code, n)) {
      code++;
      hosts[n] = (decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name;
    }
    for (const i of refSites(VIEWS.strings, n)) {
      generated++;
      genHosts[(decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name] = true;
    }
  }
  eq({ code, generated }, { code: 2, generated: 2 },
    'the monolith keeps two executable call sites and two generated handlers');
  eq(hosts, EXTERNAL_CODE, '…and the call sites are in renderPortfolioJournalView and submitClosePosition');
  eq(Object.keys(genHosts).sort(), GENERATED_BY.slice().sort(),
    '…the generated handlers come from the positions panel and the journal view');
}
eq(countLiteral(INDEX.slice(0, CODE_AT), STATIC_HANDLER), 1, 'the one static markup handler survives');
// The banner left with the code; the markup comment stayed. Neither can be
// matched for the other — they use different rule characters.
eq(INDEX.indexOf(BANNER), -1, 'the code banner is GONE from index.html');
eq(countLiteral(INDEX, MARKUP_COMMENT), 1, '…while the markup comment naming the same feature STAYS');
ok(INDEX.indexOf(MARKUP_COMMENT) < CODE_AT, '…in markup, not in the script');
ok(BANNER.indexOf('══') < 0 && MARKUP_COMMENT.indexOf('──') < 0,
  'the two use different rules, so neither can be matched for the other');
// Not one owner body survives inline.
for (const name of OWNER_NAMES) {
  eq(countLiteral(VIEWS.code, 'function ' + name + '('), 0,
    'no inline declaration of ' + name + ' survives: it lives only in the module');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The shipped index.html — exactly what the audit predicted');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(INDEX), { chars: INDEX_CHARS, utf8: INDEX_UTF8, lf: INDEX_LF, sha: INDEX_SHA256 },
  'the shipped document is 1,765,976 units / 30,869 LF / 4c37a2ac… — the audit’s published prediction');
eq(BASE_CHARS - RAW.chars + (MODULE_TAG.length + 1), INDEX_CHARS,
  'the arithmetic holds: 1,815,024 − 49,104 + 56 = 1,765,976');
eq(BASE_LF - RAW.lf + 1, INDEX_LF, 'the LF arithmetic holds: 31,737 − 869 + 1 = 30,869');
eq(localScripts(INDEX).length, LOCAL_SCRIPT_COUNT, 'the document loads 59 local scripts');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'exactly one trade-detail tag');
eq(INDEX.indexOf(MODULE_TAG), TAG_AT, '…at its pinned offset');
eq(countLiteral(INDEX, ANCHOR_TAG + '\n' + MODULE_TAG + '\n' + INLINE_OPEN), 1,
  'the tag sits between journal-trade-forms.js and the inline monolith, on its own line');
eq(localScripts(INDEX).map((t) => t.src).slice(-2), ['./js/ui/journal-trade-forms.js', MODULE_SRC],
  'the new tag is the LAST local script');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at its pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at its pinned offset');
eq(INDEX.indexOf(MODULE), -1, 'not one byte of the module body remains in the document');
ok(INDEX.indexOf('\r') < 0, 'the shipped document is LF-only');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact undo');
// ─────────────────────────────────────────────────────────────────────────────
ok(U.isApplied(INDEX), 'the undo helper recognises the layer as applied');
const restored = U.undoJournalTradeDetail(INDEX, MODULE);
eq(restored, BASE_INDEX, 'the reverse transform reconstructs the base byte for byte');
eq(sha256(restored), BASE_INDEX_SHA256, '…with the base SHA-256');
eq(metrics(restored), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  '…and every measured dimension of the base');
eq(U.EXTRACTED_SHA256, INDEX_SHA256, 'the helper pins the shipped document it undoes');
eq(U.EXTRACTED_LOCAL_SCRIPTS, LOCAL_SCRIPT_COUNT, '…and its script count');
eq(U.REINSERT_AT, RAW_AT, 'the module goes back exactly where it came from');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Load order: a module defined AFTER three of its callers');
// ─────────────────────────────────────────────────────────────────────────────
const PARTS = APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null);
eq(PARTS.length, PARTS_TOTAL, 'the application is 62 module tags plus the inline monolith');
eq(PARTS.findIndex((p) => p.src === MODULE_SRC), MODULE_POSITION, 'this module loads at position 58');
eq(PARTS.findIndex((p) => !p.src), MODULE_POSITION + 4,
  '…four positions before the inline monolith: portfolio data-fetch,\n' +
  '   backend-portfolios and manual expiry were all cut after this one');
let totalCallTime = 0;
for (const [src, spec] of Object.entries(DEPENDANTS)) {
  const idx = PARTS.findIndex((p) => p.src === src);
  eq(idx, spec.position, src + ' loads at its pinned position');
  ok(idx < MODULE_POSITION, src + ' loads BEFORE the module that now defines what it calls');
  const cls = classifyReferences(PARTS[idx].code, [spec.owner]);
  eq(cls.loadTime, [], src + ': NOT ONE reference is evaluation-time');
  eq(cls.callTime.length, spec.callTime, src + ': ' + spec.callTime + ' call-time reference(s)');
  totalCallTime += cls.callTime.length;
}
// The dependant set is DERIVED, not assumed: reasoning about three named
// modules is only sound if three is all of them.
{
  const referencing = PARTS
    .filter((p) => OWNER_NAMES.some((n) => refSites(maskLiterals(p.code), n).length > 0))
    .map((p) => p.src || '(inline monolith)');
  eq(referencing, Object.keys(DEPENDANTS).concat([MODULE_SRC, '(inline monolith)']),
    'exactly five parts reference these owners: the three dependants, the module itself, and the monolith');
  const loadTimeAnywhere = [];
  for (const p of PARTS) {
    for (const r of classifyReferences(p.code, OWNER_NAMES).loadTime) {
      loadTimeAnywhere.push((p.src || 'inline') + ':' + r.name);
    }
  }
  eq(loadTimeAnywhere, [],
    'and NOWHERE in the application is an owner read at evaluation time — which is what makes the order safe');
}
// The audit counted 18 call-time references application-wide before the move.
// The move relocates twelve of them — the region's own internal calls — into
// the module, and changes nothing else. Both halves are measured.
const inlineCallTime = classifyReferences(PARTS[PARTS.length - 1].code, OWNER_NAMES).callTime.length;
eq(inlineCallTime, 2, 'the monolith retains exactly its two external call sites');
const moduleInternal = classifyReferences(MODULE, OWNER_NAMES).callTime.length;
eq(moduleInternal, 12, 'the module carries its own twelve internal calls');
eq(totalCallTime + inlineCallTime, 6, 'six references now cross the module boundary, and all are call-time');
eq(totalCallTime + inlineCallTime + moduleInternal, TOTAL_CALLTIME,
  '…which with the internal twelve is the audit’s eighteen, unchanged by the move');

// ─────────────────────────────────────────────────────────────────────────────
section('11. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
throws(() => U.undoJournalTradeDetail(null, MODULE), /JOURNAL_TRADE_DETAIL_UNDO_BAD_INPUT/,
  '11.1 a non-string document is rejected');
throws(() => U.undoJournalTradeDetail(INDEX, null), /JOURNAL_TRADE_DETAIL_UNDO_BAD_INPUT/,
  '11.2 a non-string module is rejected');
throws(() => U.undoJournalTradeDetail(INDEX, MODULE + ' '), /JOURNAL_TRADE_DETAIL_UNDO_MODULE_IDENTITY/,
  '11.3 a padded module is rejected');
throws(() => U.undoJournalTradeDetail(INDEX, MODULE.slice(0, -1)), /JOURNAL_TRADE_DETAIL_UNDO_MODULE_IDENTITY/,
  '11.4 a truncated module is rejected');
throws(() => U.undoJournalTradeDetail(INDEX, MODULE + '\n'), /JOURNAL_TRADE_DETAIL_UNDO_MODULE_IDENTITY/,
  '11.5 a module that ABSORBED the structural separator is rejected');
{
  const sameLen = MODULE.replace('trade not found', 'trade not fouud');
  eq(sameLen.length, MODULE.length, 'the same-length mutant really is the same length');
  ok(sameLen !== MODULE, '…and really is different');
  throws(() => U.undoJournalTradeDetail(INDEX, sameLen), /JOURNAL_TRADE_DETAIL_UNDO_MODULE_IDENTITY/,
    '11.6 a SAME-LENGTH edit inside the module is caught by its hash');
}
{
  // Same length AND same LF count, but no longer ending `}\n`: this reaches
  // MODULE_SEPARATOR, so a caller learns which mistake was made rather than
  // only that some hash did not match.
  const swapped = MODULE.slice(0, -2) + '\n}';
  eq(swapped.length, MODULE.length, 'the separator mutant is the same length');
  eq(countLf(swapped), countLf(MODULE), '…and carries the same number of LFs');
  throws(() => U.undoJournalTradeDetail(INDEX, swapped), /JOURNAL_TRADE_DETAIL_UNDO_MODULE_SEPARATOR/,
    '11.7 a module not ending on a real line of code gets its OWN error');
}
throws(() => U.undoJournalTradeDetail(BASE_INDEX, MODULE), /JOURNAL_TRADE_DETAIL_UNDO_TAG_IDENTITY/,
  '11.8 an already-unextracted document has no tag and is rejected');
throws(() => U.undoJournalTradeDetail(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /JOURNAL_TRADE_DETAIL_UNDO_TAG_IDENTITY/, '11.9 a duplicate tag is rejected');
{
  const reordered = INDEX.replace(ANCHOR_TAG + '\n' + MODULE_TAG, MODULE_TAG + '\n' + ANCHOR_TAG);
  eq(countLiteral(reordered, MODULE_TAG), 1, 'the reordered mutant still has exactly one tag');
  throws(() => U.undoJournalTradeDetail(reordered, MODULE), /JOURNAL_TRADE_DETAIL_UNDO_TAG_ADJACENCY/,
    '11.10 a tag moved before its anchor fails adjacency, not identity');
}
throws(() => U.undoJournalTradeDetail(INDEX + ' ', MODULE), /JOURNAL_TRADE_DETAIL_UNDO_EXTRACTED_IDENTITY/,
  '11.11 one foreign byte anywhere in the document is rejected');
{
  // A separator left stranded inline: the document is one unit too long.
  const stranded = INDEX.slice(0, CODE_END) + '\n' + INDEX.slice(CODE_END);
  eq(stranded.length, INDEX_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throws(() => U.undoJournalTradeDetail(stranded, MODULE), /JOURNAL_TRADE_DETAIL_UNDO_EXTRACTED_IDENTITY/,
    '11.12 a structural separator left inline is rejected');
}
// isApplied is ROUTING, not safety: it answers only "is the tag here".
eq(U.isApplied(BASE_INDEX), false, '11.13 isApplied is false for a document predating this layer');
eq(U.isApplied(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG)), false,
  '11.14 …and false for a duplicated tag, so the guards below it do the real work');

// ─────────────────────────────────────────────────────────────────────────────
section('12. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
  ['index.html', 'js/portfolio/backend-portfolios.js', 'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/portfolio-expiry-manual.js', MODULE_REL],
  'production footprint is exactly index.html plus the one new module');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
  'no temporary trade-detail audit is shipped: this contract replaces it one for one');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
  'no documentation changed, except the repository working notes');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
  'no backend/model configuration changed');
ok(!changed.some((rel) => rel === '.gitattributes'), '.gitattributes is untouched');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL || rel === 'js/portfolio/portfolio-expiry-manual.js' || rel === 'js/portfolio/backend-portfolios.js' || rel === 'js/portfolio/portfolio-data-fetch.js' ||
  rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  'the suite is ' + TEST_FILE_COUNT + ' test files: the shipped contracts, plus the extraction-seam contract');
// The rejected candidate was never built: H would have been the metrics block
// without closeTradeDetail, so the test is what this module CONTAINS.
eq(countLiteral(MODULE, 'function closeTradeDetail()'), 1,
  'the shipped module carries closeTradeDetail: Candidate G, not the rejected H');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-trade-metrics.js')),
  'no metrics-only module exists (rejected Candidate H)');

console.log('\n' + pass + ' assertions passed');
console.log('JOURNAL_TRADE_DETAIL_BOUNDARY_OK');
