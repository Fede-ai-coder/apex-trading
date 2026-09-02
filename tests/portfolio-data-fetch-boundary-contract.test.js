'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO DATA FETCH — permanent boundary contract.
//
// Replaces tests/temporary-portfolio-data-fetch-boundary-audit.test.js, which
// measured two candidates and recommended this one. That audit is deleted by
// this change; §12 proves it.
//
// WHAT THE AUDIT FOUND. The screen that chose this region measures state
// coupling in BOTH directions. The screen used before it measured only what is
// written INTO a region from outside — blind to a region that declares no `var`
// and writes globals it does not own, which is what the first candidate of that
// cycle was doing. Of the 22 sections over 15,000 units, only THREE are clean
// both ways, and this is the least entangled of the three.
//
// TWO CANDIDATES, cut by owner rather than by banner, since the region has no
// internal section banner:
//
//     P (this one)  all four owners      19,550 raw   4 external edges
//     Q             without the openers  16,924 raw   7 external edges
//
// Q is smaller and carries fewer dependencies but leaves MORE external edges,
// because `renderPortfolioPanel` calls both panel openers — cutting them out
// converts internal calls into boundary crossings. Q would also strand
// `onclick="showAccountPanel()"`, the one static markup handler.
//
// THREE OF FOUR OWNERS ARE ASYNC, a first for this family. §5 proves it is not
// a load-time hazard: zero top-level calls, zero evaluation-time dependency
// reads, no top-level `await`, and the module evaluates in a completely empty
// VM defining nothing but its own four owners. Async is a property of the
// functions, not of loading them.
//
// RELOCATION ONLY. Every moved byte is byte-identical to the base, and §9
// proves the reverse transform reconstructs 8e6b01b8:index.html exactly.
//
// THE PREDICTION HELD. The audit modelled this extraction before it happened
// and published the resulting document: 1,746,489 units / 30,539 LF /
// 124d838e…, 60 local scripts. §8 asserts the shipped document is exactly that.
//
// Run: node tests/portfolio-data-fetch-boundary-contract.test.js
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
const U = require('./lib/portfolio-data-fetch-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/portfolio/portfolio-data-fetch.js';
const MODULE_SRC = './' + MODULE_REL;
const CONTRACT_REL = 'tests/portfolio-data-fetch-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/portfolio-data-fetch-undo.js';
const AUDIT_REL = 'tests/temporary-portfolio-data-fetch-boundary-audit.test.js';

// ── Pinned base: the merged #420 audit ───────────────────────────────────────
const BASE_SHA = '8e6b01b8460116fb2ec59bf1e84e6c8ff38229d1';
const BASE_SUBJECT = 'test(audit): measure the portfolio data-fetch boundary (#420)';
const BASE_INDEX_BLOB = 'a2f54820f1ca5f9f61f78e43c58e2273b657605b';
const BASE_CHARS = 1765976;
const BASE_UTF8 = 1799021;
const BASE_LF = 30869;
const BASE_INDEX_SHA256 = '4c37a2ac130c753a1100d6633df688bc6f97ae429535f0b3d86a64fa7bf96be9';
const BASE_LOCAL_SCRIPTS = 59;
// Ratchet. The temporary audit is replaced ONE FOR ONE by this contract, so the
// count does not move: the undo helper is not a .test.js file.
const TEST_FILE_COUNT = 142;

// ── The moved fragment, in base coordinates ──────────────────────────────────
const RAW_AT = 196604;
const RAW_END = 216154;
const RAW = { chars: 19550, utf8: 19860, lf: 331, sha: 'f657460dacd04a99fde7c76ad0efd70cb16b7aa0e645ba3fab047e262d9cd016' };
const BODY = { chars: 19549, utf8: 19859, lf: 330, sha: 'c7d95a14ef17d7d1a92d7aba934702ef645fe3cf8302c1db3a01a7938b7a660e' };
const BANNER = '// ── Main portfolio data fetch (positions + balances + DXLink greeks) ─';
// The rejected alternative, kept so the choice stays checkable.
const Q_END = 213528;
const Q_RAW_SHA = 'cafe90d9d8931d72f8defa717694fc0850d4c28588c7a2c5623c0ddcfc5e83e1';

const OWNERS = [
  { name: 'fetchPortfolioData', form: 'function', isAsync: true, chars: 4212 },
  { name: 'renderPortfolioPanel', form: 'function', isAsync: false, chars: 12635 },
  { name: 'showAccountPanel', form: 'function', isAsync: true, chars: 860 },
  { name: 'showIVPanel', form: 'function', isAsync: true, chars: 1763 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);

const DEPENDENCIES = ['AbortSignal', 'BACKEND', 'Date', 'Math', 'Promise', 'S', '_activeView',
  '_ensureVixFamily', '_regimeRefresh', 'console', 'document', 'fetch', 'fetchPortfolioGreeks',
  'formatPnl', 'ir', 'logEv', 'parseFloat', 'portfolioGetUnderlying', 'postCandleContext',
  'regimeHTML', 'setInterval', 'setPanel', 'showToast', 'stopPortfolioRefresh', 'ttCall'];
const CALLTIME_REFS = 105;

// ── The shipped document ─────────────────────────────────────────────────────
const INDEX_CHARS = 1746489;
const INDEX_UTF8 = 1779224;
const INDEX_LF = 30539;
const INDEX_SHA256 = '124d838e3974cf40b5d97c18fec767233c8655114dcb0dd1282c8da5537bedee';
const LOCAL_SCRIPT_COUNT = 60;
const TAG_AT = 113316;
const CODE_AT = 113387;
const CODE_END = 1746463;

const MODULE_TAG = '<script src="' + MODULE_SRC + '"></script>';
const ANCHOR_TAG = '<script src="./js/ui/journal-trade-detail.js"></script>';
const INLINE_OPEN = '<script>';

// ── The consumer topology ────────────────────────────────────────────────────
const EXTERNAL_CODE = {
  fetchPortfolioData: ['togglePortfolioAutoRefresh'],
  renderPortfolioPanel: ['togglePortfolioAutoRefresh', 'computeMarketRegime', 'runScan'],
};
const GENERATED_BY = ['showDetail'];
const STATIC_HANDLER = 'onclick="showAccountPanel()"';
const MODULE_POSITION = 59;
const PARTS_TOTAL = 61;

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
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 30);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
// This is the NEWEST layer, so the live document is the one it shipped.
const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const BASE_INDEX = git(['show', BASE_SHA + ':index.html']);

console.log('PORTFOLIO DATA FETCH — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited Candidate P (#420) · base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base, rederived from git');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #420 audit');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(BASE_INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the base document has its pinned identity');
eq(localScripts(BASE_INDEX).length, BASE_LOCAL_SCRIPTS, 'the base loaded 59 local application scripts');
eq(BASE_INDEX.indexOf(MODULE_TAG), -1, 'the base had no portfolio tag');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'the undo helper pins the same base');

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
eq(BASE_INDEX.slice(RAW_AT, RAW_AT + BANNER.length), BANNER, 'it opened on its own banner');
eq({ at: U.RAW_AT, end: U.RAW_END, chars: U.RAW_CHARS, sha: U.RAW_SHA256 },
  { at: RAW_AT, end: RAW_END, chars: RAW.chars, sha: RAW.sha }, 'the undo helper pins the same raw range');
eq(BASE_INDEX.slice(U.SEPARATOR_AT, U.SEPARATOR_AT + 1), '\n', 'the pinned separator offset holds one LF');
eq(U.SEPARATOR_AT, RAW_END - 1, 'the separator is the raw fragment’s last unit');
// The rejected alternative is pinned too: the choice stays checkable.
eq(sha256(BASE_INDEX.slice(RAW_AT, Q_END)), Q_RAW_SHA, 'Candidate Q’s range still hashes to its audited value');
ok(Q_END < RAW_END, 'Q stopped earlier, leaving the two panel openers inline');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The module file');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(MODULE), BODY, 'the shipped module is byte-identical to the base body');
eq(MODULE, BODY_TEXT, '…the same bytes, compared directly and not only by hash');
eq(MODULE.slice(-2), '}\n', 'it ends on a real line of code');
ok(!/\n\s*\n$/.test(MODULE), '…with no blank line at EOF, so `git diff --check` stays clean');
eq(MODULE.indexOf('\r'), -1, 'the module is LF-only');
eq(sha256(MODULE), U.MODULE_SHA256, 'the undo helper pins its hash');
eq(MODULE.slice(0, BANNER.length), BANNER, 'the module opens on the banner the block carried');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The four owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(shape(MODULE), OWNERS, 'the module declares exactly its four owners, in order, with the pinned spans');
eq(shape(MODULE).filter((d) => d.form === 'var').length, 0, 'it declares NO mutable state at all');
eq(shape(MODULE).filter((d) => d.isAsync).length, 3, 'three of the four are async');
eq(shape(MODULE).every((d) => d.form === 'function'), true, 'all four are function declarations');
eq(OWNERS.reduce((n, o) => n + o.chars, 0), 19470, 'the four owner spans sum to 19,470 units');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Load-time purity — async is not a load-time hazard');
// ─────────────────────────────────────────────────────────────────────────────
{
  const decls = scanTopLevelDeclarations(MODULE);
  const ch = Array.from(MODULE);
  decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) ch[i] = ' '; });
  eq(maskLiterals(ch.join('')).replace(/\s+/g, ''), '', 'declarations, comments and whitespace only at top level');
}
const loaded = loadInEmptyVm(MODULE, 'portfolio-data-fetch.js');
ok(loaded.ok, 'the module evaluates in a completely empty VM with no error');
eq(loaded.globals, OWNER_NAMES.slice().sort(), '…and defines exactly its own owners, nothing else');
eq(topLevelCallSites(MODULE).length, 0, 'zero top-level calls');
eq(topLevelHits(MODULE, /\bawait\b/).length, 0, 'no top-level await — the async owners run only when called');
eq(topLevelHits(MODULE, /\b(?:document|window)\s*\./).length, 0, 'zero top-level DOM access');
eq(topLevelHits(MODULE, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, 'zero top-level timers');
eq(topLevelHits(MODULE, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/).length, 0, 'zero top-level network work');
// The timer this module owns is armed by showAccountPanel, never at load.
ok(MODULE.indexOf('setInterval(fetchPortfolioData,60000)') > 0, 'the 60s refresh timer exists in the module…');
eq(topLevelHits(MODULE, /setInterval\(fetchPortfolioData/).length, 0, '…and is armed only from inside a function');

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependencies');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(MODULE).filter((n) => OWNER_NAMES.indexOf(n) < 0), DEPENDENCIES,
  'the module free-depends on exactly these 25 names');
eq(classifyReferences(MODULE, DEPENDENCIES).loadTime, [], 'it reads NO dependency at evaluation time');
eq(classifyReferences(MODULE, DEPENDENCIES).callTime.length, CALLTIME_REFS, '105 call-time references');
eq(DEPENDENCIES.filter((n) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)), [],
  'every dependency is a whole plain identifier, not a state object path');

// ─────────────────────────────────────────────────────────────────────────────
section('7. The consumer topology, and state in BOTH directions');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
const decls = scanTopLevelDeclarations(CODE);
{
  let code = 0, generated = 0;
  const hosts = {}, genHosts = {};
  for (const n of OWNER_NAMES) {
    for (const i of refSites(VIEWS.code, n)) {
      if (/\bfunction\s+$/.test(VIEWS.code.slice(Math.max(0, i - 40), i))) continue;
      code++;
      hosts[n] = (hosts[n] || []).concat((decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name);
    }
    for (const i of refSites(VIEWS.strings, n)) {
      generated++;
      genHosts[(decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name] = true;
    }
  }
  eq({ code, generated }, { code: 4, generated: 1 },
    'the monolith keeps four executable call sites and one generated reference');
  eq(hosts, EXTERNAL_CODE, '…in togglePortfolioAutoRefresh, computeMarketRegime and runScan');
  eq(Object.keys(genHosts).sort(), GENERATED_BY, '…and the generated one comes from showDetail');
}
eq(countLiteral(INDEX.slice(0, CODE_AT), STATIC_HANDLER), 1, 'the one static markup handler survives');
eq(INDEX.indexOf(BANNER), -1, 'the banner is GONE from index.html');
for (const name of OWNER_NAMES) {
  eq(countLiteral(VIEWS.code, 'function ' + name + '('), 0,
    'no inline declaration of ' + name + ' survives: it lives only in the module');
}
// State, both directions — the axis that chose this region.
{
  const GLOBAL_VARS = decls.filter((d) => d.form === 'var').map((d) => d.name);
  const own = new Set(OWNER_NAMES);
  const masked = maskLiterals(MODULE);
  let outbound = 0;
  const outNames = new Set();
  for (const n of GLOBAL_VARS) {
    if (own.has(n)) continue;
    for (const i of refSites(masked, n)) if (isWriteAt(masked, i, n)) { outbound++; outNames.add(n); }
  }
  eq(outbound, 0, 'OUTBOUND: the module writes NO monolith global it does not own');
  eq(Array.from(outNames), [], '…and so there is no foreign name to list');
  eq(scanTopLevelDeclarations(MODULE).filter((d) => d.form === 'var'), [],
    'INBOUND: it owns no state, so nothing outside can write state it owns');
  // A control, so `0` is not indistinguishable from not measuring.
  const probe = maskLiterals('var _foreign = 1;\nfunction f(){ _foreign = 2; _foreign.x = 3; }\n');
  let n = 0;
  for (const i of refSites(probe, '_foreign')) if (isWriteAt(probe, i, '_foreign')) n++;
  eq(n, 3, 'the outbound rule detects all three writes when there are writes to detect');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The shipped index.html — exactly what the audit predicted');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(INDEX), { chars: INDEX_CHARS, utf8: INDEX_UTF8, lf: INDEX_LF, sha: INDEX_SHA256 },
  'the shipped document is 1,746,489 units / 30,539 LF / 124d838e… — the audit’s published prediction');
eq(BASE_CHARS - RAW.chars + (MODULE_TAG.length + 1), INDEX_CHARS,
  'the arithmetic holds: 1,765,976 − 19,550 + 63 = 1,746,489');
eq(BASE_LF - RAW.lf + 1, INDEX_LF, 'the LF arithmetic holds: 30,869 − 331 + 1 = 30,539');
eq(localScripts(INDEX).length, LOCAL_SCRIPT_COUNT, 'the document loads 60 local scripts');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'exactly one portfolio tag');
eq(INDEX.indexOf(MODULE_TAG), TAG_AT, '…at its pinned offset');
eq(countLiteral(INDEX, ANCHOR_TAG + '\n' + MODULE_TAG + '\n' + INLINE_OPEN), 1,
  'the tag sits between journal-trade-detail.js and the inline monolith, on its own line');
eq(localScripts(INDEX).map((t) => t.src).slice(-2), ['./js/ui/journal-trade-detail.js', MODULE_SRC],
  'the new tag is the LAST local script');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at its pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at its pinned offset');
eq(INDEX.indexOf(MODULE), -1, 'not one byte of the module body remains in the document');
ok(INDEX.indexOf('\r') < 0, 'the shipped document is LF-only');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact undo');
// ─────────────────────────────────────────────────────────────────────────────
ok(U.isApplied(INDEX), 'the undo helper recognises the layer as applied');
const restored = U.undoPortfolioDataFetch(INDEX, MODULE);
eq(restored, BASE_INDEX, 'the reverse transform reconstructs the base byte for byte');
eq(sha256(restored), BASE_INDEX_SHA256, '…with the base SHA-256');
eq(U.EXTRACTED_SHA256, INDEX_SHA256, 'the helper pins the shipped document it undoes');
eq(U.EXTRACTED_LOCAL_SCRIPTS, LOCAL_SCRIPT_COUNT, '…and its script count');
eq(U.REINSERT_AT, RAW_AT, 'the module goes back exactly where it came from');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Load order');
// ─────────────────────────────────────────────────────────────────────────────
const PARTS = APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null);
eq(PARTS.length, PARTS_TOTAL, 'the application is 60 module tags plus the inline monolith');
eq(PARTS.findIndex((p) => p.src === MODULE_SRC), MODULE_POSITION, 'this module loads at position 59');
eq(PARTS.findIndex((p) => !p.src), MODULE_POSITION + 1, '…immediately before the inline monolith');
{
  // The referencing set is DERIVED, not assumed.
  const referencing = PARTS
    .filter((p) => OWNER_NAMES.some((n) => refSites(maskLiterals(p.code), n).length > 0))
    .map((p) => p.src || '(inline monolith)');
  eq(referencing, [MODULE_SRC, '(inline monolith)'],
    'exactly two parts reference these owners: the module itself and the monolith');
  const loadTimeAnywhere = [];
  for (const p of PARTS) {
    for (const r of classifyReferences(p.code, OWNER_NAMES).loadTime) {
      loadTimeAnywhere.push((p.src || 'inline') + ':' + r.name);
    }
  }
  eq(loadTimeAnywhere, [], 'and NOWHERE in the application is an owner read at evaluation time');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
throws(() => U.undoPortfolioDataFetch(null, MODULE), /PORTFOLIO_DATA_FETCH_UNDO_BAD_INPUT/,
  '11.1 a non-string document is rejected');
throws(() => U.undoPortfolioDataFetch(INDEX, null), /PORTFOLIO_DATA_FETCH_UNDO_BAD_INPUT/,
  '11.2 a non-string module is rejected');
throws(() => U.undoPortfolioDataFetch(INDEX, MODULE + ' '), /PORTFOLIO_DATA_FETCH_UNDO_MODULE_IDENTITY/,
  '11.3 a padded module is rejected');
throws(() => U.undoPortfolioDataFetch(INDEX, MODULE.slice(0, -1)), /PORTFOLIO_DATA_FETCH_UNDO_MODULE_IDENTITY/,
  '11.4 a truncated module is rejected');
throws(() => U.undoPortfolioDataFetch(INDEX, MODULE + '\n'), /PORTFOLIO_DATA_FETCH_UNDO_MODULE_IDENTITY/,
  '11.5 a module that ABSORBED the structural separator is rejected');
{
  const sameLen = MODULE.replace('portfolio', 'portfolia');
  eq(sameLen.length, MODULE.length, 'the same-length mutant really is the same length');
  ok(sameLen !== MODULE, '…and really is different');
  throws(() => U.undoPortfolioDataFetch(INDEX, sameLen), /PORTFOLIO_DATA_FETCH_UNDO_MODULE_IDENTITY/,
    '11.6 a SAME-LENGTH edit inside the module is caught by its hash');
}
{
  const swapped = MODULE.slice(0, -2) + '\n}';
  eq(swapped.length, MODULE.length, 'the separator mutant is the same length');
  eq(countLf(swapped), countLf(MODULE), '…and carries the same number of LFs');
  throws(() => U.undoPortfolioDataFetch(INDEX, swapped), /PORTFOLIO_DATA_FETCH_UNDO_MODULE_SEPARATOR/,
    '11.7 a module not ending on a real line of code gets its OWN error');
}
throws(() => U.undoPortfolioDataFetch(BASE_INDEX, MODULE), /PORTFOLIO_DATA_FETCH_UNDO_TAG_IDENTITY/,
  '11.8 an already-unextracted document has no tag and is rejected');
throws(() => U.undoPortfolioDataFetch(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /PORTFOLIO_DATA_FETCH_UNDO_TAG_IDENTITY/, '11.9 a duplicate tag is rejected');
{
  const reordered = INDEX.replace(ANCHOR_TAG + '\n' + MODULE_TAG, MODULE_TAG + '\n' + ANCHOR_TAG);
  eq(countLiteral(reordered, MODULE_TAG), 1, 'the reordered mutant still has exactly one tag');
  throws(() => U.undoPortfolioDataFetch(reordered, MODULE), /PORTFOLIO_DATA_FETCH_UNDO_TAG_ADJACENCY/,
    '11.10 a tag moved before its anchor fails adjacency, not identity');
}
throws(() => U.undoPortfolioDataFetch(INDEX + ' ', MODULE), /PORTFOLIO_DATA_FETCH_UNDO_EXTRACTED_IDENTITY/,
  '11.11 one foreign byte anywhere in the document is rejected');
{
  const stranded = INDEX.slice(0, CODE_END) + '\n' + INDEX.slice(CODE_END);
  eq(stranded.length, INDEX_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throws(() => U.undoPortfolioDataFetch(stranded, MODULE), /PORTFOLIO_DATA_FETCH_UNDO_EXTRACTED_IDENTITY/,
    '11.12 a structural separator left inline is rejected');
}
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
eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), ['index.html', MODULE_REL],
  'production footprint is exactly index.html plus the one new module');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
  'no temporary portfolio audit is shipped: this contract replaces it one for one');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow or bootstrap script changed');
ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
  'no documentation changed, except the repository working notes');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
  'no backend/model configuration changed');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
  rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  'the suite is 142 test files: the audit was replaced one for one');
// The rejected alternative was never built.
ok(!fs.existsSync(path.join(ROOT, 'js/portfolio/portfolio-panel.js')),
  'no openers-only module exists (rejected Candidate Q)');
eq(countLiteral(MODULE, 'async function showAccountPanel()'), 1,
  'the shipped module carries showAccountPanel: Candidate P, not the rejected Q');

console.log('\n' + pass + ' assertions passed');
console.log('PORTFOLIO_DATA_FETCH_BOUNDARY_OK');
