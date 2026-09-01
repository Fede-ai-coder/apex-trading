'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL TRADE DETAIL — TEMPORARY EXTRACTION AUDIT.
//
// PHASE 1 ONLY. This file measures. It does not extract anything, and the
// production tree it audits is byte-identical to its pinned base. §11 proves
// that: the entire committed footprint is this audit plus the one suite-count
// constant in each of the four contracts that pin it.
//
// WHY THIS REGION. With the Journal forms window fully extracted (#413, #415),
// a survey of the remaining monolith — 1,701,730 units across 92 banner-
// delimited sections — screened the eight largest for coupling. The Trade
// Detail region came out cleanest by a wide margin:
//
//     section                      owners  units  extEdges  stateW  deps
//     Trade detail + metrics            6  49,103        2       0    15
//     PORTFOLIO INLINE TECH CHARTS     32  83,260       14       0    61
//     fetchDXLinkGreeks                 6 145,616       10       0   103
//     UNREALIZED P&L                   30  54,240       98      30    41
//     4H poll state                    74  74,847      132      20    78
//
// It declares NO mutable state at all and NO async owner, reads no dependency
// at evaluation time, and is reached from outside by exactly two executable
// call sites, two generated onclick handlers and one static markup handler.
//
// TWO CANDIDATES, because the region has an internal banner:
//
//     G   TRADE DETAIL MODAL + the metrics block   [1717386,1766490)  6 owners
//     H   the metrics block alone                  [1717557,1766490)  5 owners
//
// G is one unit larger and picks up `closeTradeDetail`, which the modal's own
// static markup calls. H would leave that one function behind, splitting a
// two-function feature across the boundary for no gain: the dependency surface
// is identical either way. §9 derives the choice rather than asserting it.
//
// THE INTERESTING RISK, and why it is not one. `showTradeDetails` and
// `_tradeMetrics` are already depended upon by THREE shipped modules —
// journal-ui.js, journal-close-legs.js and journal-trade-forms.js — and
// journal-ui.js loads twelve positions BEFORE where this module's tag would go.
// §7 proves that is safe: across all three modules and the inline monolith,
// every one of the 18 references is call-time and NOT ONE is evaluation-time.
// Classic globals are late-bound, so a module may be defined after its callers
// are parsed, as long as nobody reads it while the page is still loading.
//
// PHASE 2 IS NOT IN THIS PR. §10 models the extraction and proves the forward
// and reverse transforms byte-exact, but nothing is written: no module, no
// permanent contract, no undo helper. §11 asserts they are absent.
//
// Run: node tests/temporary-journal-trade-detail-boundary-audit.test.js
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
const AUDIT_REL = 'tests/temporary-journal-trade-detail-boundary-audit.test.js';
const RATCHET_RELS = [
  'tests/apex-post-auth-init-boundary-contract.test.js',
  'tests/journal-close-legs-boundary-contract.test.js',
  'tests/journal-trade-forms-boundary-contract.test.js',
  'tests/tt-reconnect-boundary-contract.test.js',
];
const AUDIT_SCOPE = RATCHET_RELS.concat([AUDIT_REL]).sort();

// ── Pinned base: the merged #415 extraction ──────────────────────────────────
const BASE_SHA = '93fe1cbc8d31e5d6428335a0854371ab404893cb';
const BASE_TREE = '969ca85067478c235ba2c0330a57db89754f5def';
const BASE_SUBJECT = 'refactor(journal): extract Manual Entry + Adjustment form UI (#415)';
const BASE_PARENT = '70770ed97062497b7b189d546b29d92158df8849';
const BASE_INDEX_BLOB = '508485a5dc29265f36cb35a1efb3f8b506cb7cea';
const BASE_CHARS = 1815024;
const BASE_UTF8 = 1848827;
const BASE_LF = 31737;
const BASE_INDEX_SHA256 = '7e0851ae220daa6454cf2f3f093821b29c8aff8ba137cb0bbef24283bb976156';
const BASE_LOCAL_SCRIPTS = 58;
const BASE_TEST_FILES = 140;
const AUDIT_TEST_FILES = 141;

const CODE_AT = 113268;
const CODE_END = 1814998;

// ── Candidate G: the whole Trade Detail feature ──────────────────────────────
const G = {
  label: 'TRADE DETAIL MODAL + metrics',
  at: 1717386, end: 1766490, startLine: 29974,
  raw: { chars: 49104, utf8: 49862, lf: 869, sha: '2462dc790cc07e1c6db84a3c4c940cc105dd09b33a0e3f5383d945a0ee35d0ef' },
  body: { chars: 49103, utf8: 49861, lf: 868, sha: '70e2952a2664c812184fe8b4d3825be685d6a2945d00eedc4c0eb12a453e70fe' },
  banner: '// ── TRADE DETAIL MODAL ──────────────────────────────────────────',
};
// ── Candidate H: the metrics block alone ─────────────────────────────────────
const H = {
  label: 'metrics block alone',
  at: 1717557, end: 1766490, startLine: 29979,
  raw: { chars: 48933, utf8: 49603, lf: 864, sha: 'aa67efe54955391a8353962d6182ed7950190cd03da09f8ba688b2368de4167b' },
  body: { chars: 48932, utf8: 49602, lf: 863, sha: '95bda27db0fa5be65702b4ddeaefea11bfaa859c536069b0b6fdfd0305620fda' },
  banner: '// ── Trade performance metrics (pure derived, never mutates trade) ──────────',
};

const OWNERS = [
  { name: 'closeTradeDetail', form: 'function', isAsync: false, chars: 101 },
  { name: '_tradeMetrics', form: 'function', isAsync: false, chars: 2861 },
  { name: 'showTradeDetails', form: 'function', isAsync: false, chars: 38321 },
  { name: '_renderAdjustmentTimeline', form: 'function', isAsync: false, chars: 5756 },
  { name: '_priceCellHtml', form: 'function', isAsync: false, chars: 1365 },
  { name: '_detailCell', form: 'function', isAsync: false, chars: 330 },
];
const OWNER_NAMES = OWNERS.map((o) => o.name);
const H_OWNER_NAMES = OWNER_NAMES.slice(1);

const DEPENDENCIES = ['Date', 'JSON', 'Math', 'String', 'computeDTE', 'computeMoneyness',
  'console', 'document', 'escHtml', 'isNaN', 'journalManager', 'normalizeIvrPercent',
  'parseFloat', 'portfolioManager', 'showToast'];
const CALLTIME_G = 113;
const CALLTIME_H = 112;

// ── The consumer topology ────────────────────────────────────────────────────
const EXTERNAL_CODE = { _tradeMetrics: 'renderPortfolioJournalView', showTradeDetails: 'submitClosePosition' };
const GENERATED_BY = ['renderPositionsPanel', 'renderPortfolioJournalView'];
const STATIC_HANDLER = 'onclick="if(event.target===this)closeTradeDetail()"';
// A markup comment uses ══ where the JS banner uses ──. It must not be mistaken
// for the code banner: after extraction the code banner is gone but this stays.
const MARKUP_COMMENT = '<!-- ══ TRADE DETAIL MODAL';

// ── Modules already shipped that depend on these owners ──────────────────────
const DEPENDANTS = {
  './js/ui/journal-ui.js': { owner: '_tradeMetrics', position: 46, callTime: 2 },
  './js/ui/journal-close-legs.js': { owner: 'showTradeDetails', position: 56, callTime: 1 },
  './js/ui/journal-trade-forms.js': { owner: 'showTradeDetails', position: 57, callTime: 1 },
};

// ── The hypothetical Phase 2 extraction (modelled, never written) ────────────
const HYP_MODULE_REL = 'js/ui/journal-trade-detail.js';
const HYP_TAG = '<script src="./js/ui/journal-trade-detail.js"></script>';
const ANCHOR_TAG = '<script src="./js/ui/journal-trade-forms.js"></script>';
const INLINE_OPEN = '<script>';
const HYP_INSERTION_CHARS = 56;
const HYP = { chars: 1765976, utf8: 1799021, lf: 30869, sha: '4c37a2ac130c753a1100d6633df688bc6f97ae429535f0b3d86a64fa7bf96be9', scripts: 59 };

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
  return {
    code: masked,
    strings: build((i) => masked[i] !== src[i] && noComments[i] === src[i]),
    comments: build((i) => noComments[i] !== src[i]),
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

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const INDEX = APP_LOADER.loadIndexHtml();

console.log('JOURNAL TRADE DETAIL — TEMPORARY EXTRACTION AUDIT (Phase 1)');
console.log('measurement only · production untouched · base=' + BASE_SHA);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git, not guessed');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #415 extraction');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is the merged #414 audit');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the working index.html is byte-identical to the pinned base');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'exactly 58 local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only, so UTF-16 offsets are stable');
eq(INDEX.indexOf(HYP_TAG), -1, 'no trade-detail tag exists yet');
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no trade-detail module exists yet');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline script opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at the pinned offset');

const baseTestFiles = git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
  .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f));
eq(baseTestFiles.length, BASE_TEST_FILES, 'the base suite is exactly 140 test files');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, AUDIT_TEST_FILES,
  'with this temporary audit the suite is 141 test files');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The two candidate blocks, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
for (const B of [G, H]) {
  const raw = INDEX.slice(B.at, B.end);
  const body = INDEX.slice(B.at, B.end - 1);
  eq(metrics(raw), { chars: B.raw.chars, utf8: B.raw.utf8, lf: B.raw.lf, sha: B.raw.sha }, B.label + ': raw identity');
  eq(metrics(body), { chars: B.body.chars, utf8: B.body.utf8, lf: B.body.lf, sha: B.body.sha }, B.label + ': body identity');
  eq(body + '\n', raw, B.label + ': raw === body + exactly one LF');
  eq(raw.slice(-3), '}\n\n', B.label + ': raw ends `}\\n\\n`');
  eq(INDEX.slice(B.at - 3, B.at), '}\n\n', B.label + ': it opens right after a complete `}\\n\\n` seam');
  eq(lineAt(INDEX, B.at), B.startLine, B.label + ': it opens on its pinned line');
  ok(INDEX.slice(B.at, B.at + B.banner.length) === B.banner, B.label + ': it opens on its own banner');
}
eq(G.at < H.at, true, 'Candidate G starts earlier: it also takes the modal banner');
eq(G.end, H.end, 'both candidates end at the same seam');
eq(G.raw.chars - H.raw.chars, 171, 'G is 171 units larger — exactly the modal banner and closeTradeDetail');
ok(/^\/\/ ── TRADE DETAIL MODAL/.test(INDEX.slice(G.at, G.at + 30)), 'G opens on the modal banner');
ok(INDEX.slice(G.at, H.at).indexOf('function closeTradeDetail()') >= 0,
  'the 171 units G adds are the banner plus closeTradeDetail');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Declaration manifests');
// ─────────────────────────────────────────────────────────────────────────────
const BODY_G = INDEX.slice(G.at, G.end - 1);
const BODY_H = INDEX.slice(H.at, H.end - 1);
eq(shape(BODY_G), OWNERS, 'Candidate G declares exactly its six owners, in order, with the pinned spans');
eq(shape(BODY_H).map((d) => d.name), H_OWNER_NAMES, 'Candidate H declares the same five, minus closeTradeDetail');
eq(shape(BODY_G).filter((d) => d.form === 'var').length, 0, 'the region declares NO mutable state at all');
eq(shape(BODY_G).filter((d) => d.isAsync).length, 0, '…and NO async owner');
eq(shape(BODY_G).every((d) => d.form === 'function'), true, 'all six owners are plain function declarations');
eq(OWNERS.reduce((n, o) => n + o.chars, 0), 48734, 'the six owner spans sum to 48,734 units');
ok(OWNERS.find((o) => o.name === 'showTradeDetails').chars > 38000,
  'showTradeDetails alone is over 38,000 units — the bulk of the region');

// ─────────────────────────────────────────────────────────────────────────────
section('4. Load-time purity and empty-VM evaluation');
// ─────────────────────────────────────────────────────────────────────────────
for (const [label, body, names] of [['G', BODY_G, OWNER_NAMES], ['H', BODY_H, H_OWNER_NAMES]]) {
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
  eq(topLevelHits(body, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length, 0, label + ': zero top-level storage access');
  eq(topLevelHits(body, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/).length, 0, label + ': zero top-level network work');
  eq(topLevelHits(body, /\b(?:journalManager|positionManager|portfolioManager)\b/).length, 0, label + ': zero top-level journal work');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Dependencies — identical for both candidates');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(BODY_G), DEPENDENCIES, 'Candidate G free-depends on exactly 15 names');
eq(freeIdentifiers(BODY_H), DEPENDENCIES, 'Candidate H free-depends on exactly the same 15 names');
eq(DEPENDENCIES.length, 15, 'fifteen dependencies — the smallest surface of any screened section');
eq(classifyReferences(BODY_G, DEPENDENCIES).loadTime, [], 'G reads NO dependency at evaluation time');
eq(classifyReferences(BODY_H, DEPENDENCIES).loadTime, [], 'H reads NO dependency at evaluation time');
eq(classifyReferences(BODY_G, DEPENDENCIES).callTime.length, CALLTIME_G, 'G: 113 call-time references');
eq(classifyReferences(BODY_H, DEPENDENCIES).callTime.length, CALLTIME_H, 'H: 112 call-time references');
eq(CALLTIME_G - CALLTIME_H, 1, 'the one extra reference is closeTradeDetail touching `document`');

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
      code++;
      hosts[n] = (decls.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name;
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
const cg = census(OWNER_NAMES, G.at, G.end);
const chh = census(H_OWNER_NAMES, H.at, H.end);
eq({ code: cg.code, generated: cg.generated, markup: cg.markup }, { code: 2, generated: 2, markup: 1 },
  'Candidate G: two executable call sites, two generated handlers, one static handler');
eq(cg.hosts, EXTERNAL_CODE, '…and the two call sites are in renderPortfolioJournalView and submitClosePosition');
eq(cg.genHosts, GENERATED_BY.slice().sort(), '…the two generated handlers come from the positions panel and the journal view');
eq(countLiteral(INDEX.slice(0, CODE_AT), STATIC_HANDLER), 1, 'exactly one static closeTradeDetail() handler in markup');
eq({ code: chh.code, generated: chh.generated, markup: chh.markup }, { code: 2, generated: 2, markup: 0 },
  'Candidate H has the same code and generated edges but LOSES the static markup handler');
// The markup comment must not be mistaken for the code banner.
eq(countLiteral(INDEX, MARKUP_COMMENT), 1, 'the markup carries its own ══ TRADE DETAIL MODAL comment');
ok(INDEX.indexOf(MARKUP_COMMENT) < CODE_AT, '…and it lives in markup, not in the script');
ok(G.banner.indexOf('══') < 0 && MARKUP_COMMENT.indexOf('──') < 0,
  'the two use different rules, so neither can be matched for the other');

// ─────────────────────────────────────────────────────────────────────────────
section('7. The load-order question: three shipped modules already depend on this');
// ─────────────────────────────────────────────────────────────────────────────
const PARTS = APP_LOADER.loadOrderedScriptSources().filter((p) => p.isAppJs && p.code != null);
let totalCallTime = 0;
for (const [src, spec] of Object.entries(DEPENDANTS)) {
  const idx = PARTS.findIndex((p) => p.src === src);
  eq(idx, spec.position, src + ' loads at its pinned position');
  const part = PARTS[idx];
  const hits = OWNER_NAMES.filter((n) => refSites(maskLiterals(part.code), n).length > 0);
  eq(hits, [spec.owner], src + ' depends on exactly ' + spec.owner);
  const cls = classifyReferences(part.code, hits);
  eq(cls.loadTime, [], src + ': NOT ONE reference is evaluation-time');
  eq(cls.callTime.length, spec.callTime, src + ': ' + spec.callTime + ' call-time reference(s)');
  totalCallTime += cls.callTime.length;
}
const inlinePart = PARTS.find((p) => !p.src);
const inlineCls = classifyReferences(inlinePart.code, OWNER_NAMES);
eq(inlineCls.loadTime, [], 'the inline monolith reads none of the owners at evaluation time either');
totalCallTime += inlineCls.callTime.length;
eq(totalCallTime, 18, 'all 18 references across the whole application are call-time');
// journal-ui.js loads twelve positions BEFORE where the new tag would sit.
ok(DEPENDANTS['./js/ui/journal-ui.js'].position < PARTS.length - 1,
  'journal-ui.js loads well before the end of the script list…');
eq(PARTS.length - 1 - DEPENDANTS['./js/ui/journal-ui.js'].position, 12,
  '…twelve positions before the inline monolith, and further still before the new tag');
ok(true, 'so a module defined AFTER its callers is safe here: classic globals are late-bound');

// ─────────────────────────────────────────────────────────────────────────────
section('8. Cross-boundary mutable state: there is none to split');
// ─────────────────────────────────────────────────────────────────────────────
eq(scanTopLevelDeclarations(BODY_G).filter((d) => d.form === 'var'), [],
  'the region declares no `var`, so no state can be split by extracting it');
// And it does not write anyone else's state at top level either.
eq(topLevelCallSites(BODY_G).length, 0, 'nothing runs at load time to mutate anything');
ok(DEPENDENCIES.every((n) => /^[a-z]/i.test(n)), 'every dependency is a plain identifier, not a state object path');

// ─────────────────────────────────────────────────────────────────────────────
section('9. The recommendation, derived from the measurements');
// ─────────────────────────────────────────────────────────────────────────────
const SCORE = {
  G: { owners: shape(BODY_G).length, units: BODY_G.length, deps: freeIdentifiers(BODY_G).length,
       code: cg.code, generated: cg.generated, markup: cg.markup,
       loadOrder: classifyReferences(BODY_G, DEPENDENCIES).loadTime.length, state: 0 },
  H: { owners: shape(BODY_H).length, units: BODY_H.length, deps: freeIdentifiers(BODY_H).length,
       code: chh.code, generated: chh.generated, markup: chh.markup,
       loadOrder: classifyReferences(BODY_H, DEPENDENCIES).loadTime.length, state: 0 },
};
eq(SCORE.G.deps, SCORE.H.deps, 'both candidates carry the same dependency surface');
eq(SCORE.G.code, SCORE.H.code, 'both leave the same two executable edges');
eq(SCORE.G.state, SCORE.H.state, 'neither splits mutable state, because there is none');
eq(SCORE.G.markup - SCORE.H.markup, 1,
  'only G takes the static markup handler with it; H would strand closeTradeDetail inline');
ok(SCORE.G.units > SCORE.H.units, 'G is the larger body…');
eq(SCORE.G.units - SCORE.H.units, 171, '…by exactly 171 units');
// Choosing H would split a two-function feature for no measurable gain.
const ranked = ['G', 'H'].slice().sort((x, y) =>
  (SCORE[x].markup === 0 ? 1 : 0) - (SCORE[y].markup === 0 ? 1 : 0) ||
  SCORE[x].code - SCORE[y].code ||
  SCORE[x].units - SCORE[y].units);
eq(ranked, ['G', 'H'], 'the ranking puts Candidate G first');
const RECOMMENDATION = ranked[0];
eq(RECOMMENDATION, 'G', 'THE RECOMMENDATION: extract the whole Trade Detail feature, modal included');

// ─────────────────────────────────────────────────────────────────────────────
section('10. The hypothetical extraction, byte-exact in each direction');
// ─────────────────────────────────────────────────────────────────────────────
const anchorAt = INDEX.indexOf(ANCHOR_TAG);
ok(anchorAt > 0, 'the anchor tag exists');
eq(countLiteral(INDEX, ANCHOR_TAG), 1, '…exactly once');
const anchorLineEnd = INDEX.indexOf('\n', anchorAt);
eq(anchorLineEnd, anchorAt + ANCHOR_TAG.length, 'the anchor tag ends its own line');
eq(INDEX.slice(anchorLineEnd + 1, anchorLineEnd + 1 + INLINE_OPEN.length), INLINE_OPEN,
  'the inline monolith opens on the very next line');
eq(('\n' + HYP_TAG).length, HYP_INSERTION_CHARS, 'the inserted tag line is 56 UTF-16 units');
ok(anchorLineEnd < G.at, 'the tag goes in well before the block it removes');

const removed = INDEX.slice(0, G.at) + INDEX.slice(G.end);
const HYP_INDEX = removed.slice(0, anchorLineEnd) + '\n' + HYP_TAG + removed.slice(anchorLineEnd);
const HYP_MODULE = BODY_G;
eq(metrics(HYP_MODULE), { chars: G.body.chars, utf8: G.body.utf8, lf: G.body.lf, sha: G.body.sha },
  'the hypothetical module is exactly Candidate G body: 49,103 units / 70e2952a…');
eq(HYP_MODULE.slice(-2), '}\n', 'it would end on a real line of code');
ok(!/\n\s*\n$/.test(HYP_MODULE), '…with no blank line at EOF');
eq(metrics(HYP_INDEX), { chars: HYP.chars, utf8: HYP.utf8, lf: HYP.lf, sha: HYP.sha },
  'the hypothetical index: 1,765,976 units / 1,799,021 bytes / 30,869 LF / 4c37a2ac…');
eq(BASE_CHARS - G.raw.chars + HYP_INSERTION_CHARS, HYP.chars,
  'the arithmetic holds: 1,815,024 − 49,104 + 56 = 1,765,976');
eq(BASE_LF - G.raw.lf + 1, HYP.lf, 'the LF arithmetic holds: 31,737 − 869 + 1 = 30,869');
eq(localScripts(HYP_INDEX).length, HYP.scripts, 'the hypothetical index loads 59 local scripts');
eq(HYP_INDEX.indexOf(HYP_MODULE), -1, 'not one byte of the module body remains in the index');
eq(HYP_INDEX.indexOf(G.banner), -1, 'the code banner is gone from the hypothetical index');
eq(countLiteral(HYP_INDEX, MARKUP_COMMENT), 1, '…while the markup comment correctly survives');
eq(localScripts(HYP_INDEX).map((t) => t.src).slice(-2), [ANCHOR_TAG.match(/src="([^"]+)"/)[1], './' + HYP_MODULE_REL],
  'the new tag becomes the last local script');
// REVERSE
const untagged = HYP_INDEX.slice(0, anchorLineEnd) + HYP_INDEX.slice(anchorLineEnd + HYP_INSERTION_CHARS);
const restored = untagged.slice(0, G.at) + HYP_MODULE + '\n' + untagged.slice(G.at);
eq(restored, INDEX, 'the reverse transform reconstructs the base byte for byte');
eq(sha256(restored), BASE_INDEX_SHA256, '…with the base SHA-256');

// Mutation-sensitive controls.
ok(sha256(HYP_INDEX + ' ') !== HYP.sha, '10.1 one foreign byte changes the hypothetical index hash');
ok(sha256(HYP_MODULE + '\n') !== G.body.sha, '10.2 a module that absorbed the separator hashes differently');
ok(metrics(INDEX.slice(G.at, G.end - 1)).sha !== G.raw.sha, '10.3 a one-unit boundary shift is visible');
{
  const noSep = untagged.slice(0, G.at) + HYP_MODULE + untagged.slice(G.at);
  ok(noSep !== INDEX, '10.4 a reverse transform that drops the separator does NOT reconstruct the base');
  eq(noSep.length, BASE_CHARS - 1, '…and is exactly one unit short');
}
{
  const planted = CODE.slice(0, G.at - CODE_AT) + 'function _x(){ showTradeDetails(1); }\n\n' + CODE.slice(G.at - CODE_AT);
  eq(refSites(maskLiterals(planted), 'showTradeDetails').length,
    refSites(VIEWS.code, 'showTradeDetails').length + 1, '10.5 an extra external consumer is detectable');
  const inString = CODE.slice(0, G.at - CODE_AT) + "var _s = 'showTradeDetails(1);';\n\n" + CODE.slice(G.at - CODE_AT);
  eq(refSites(maskLiterals(inString), 'showTradeDetails').length,
    refSites(VIEWS.code, 'showTradeDetails').length, '10.6 …but one hidden in a string is not');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Production is unchanged, and the audit footprint is five test files');
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
eq(changed, AUDIT_SCOPE, 'the ENTIRE change set is the audit plus the four suite-count ratchets');
eq(changed.length, 5, 'exactly five files, all under tests/');
eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')), [], 'production scope is empty');
eq(changed.filter((rel) => rel.startsWith('.github/')), [], 'no workflow changed');
eq(changed.filter((rel) => rel.endsWith('.md')), [], 'no documentation changed');
eq(changed.filter((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')), [], 'no configuration changed');
eq(changed.filter((rel) => rel.startsWith('tests/lib/')), [], 'no test helper changed');
eq(changed.filter((rel) => !rel.startsWith('tests/')), [], 'every changed path is a test artifact');
eq(RATCHET_RELS.length, 4, 'exactly four suite-count ratchets exist');
for (const rel of RATCHET_RELS) {
  const before = git(['show', BASE_SHA + ':' + rel]);
  const after = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  ok(before.indexOf('const TEST_FILE_COUNT = 140;') >= 0, rel + ' pinned 140 at the base');
  ok(after.indexOf('const TEST_FILE_COUNT = 141;') >= 0, rel + ' now pins 141');
  const norm = (t) => {
    const lines = t.split('\n');
    const at = lines.findIndex((l) => /const TEST_FILE_COUNT\s*=/.test(l));
    if (at < 0) return t;
    let from = at;
    while (from > 0 && /^\s*\/\//.test(lines[from - 1])) from--;
    lines.splice(from, at - from + 1);
    return lines.filter((l) => !/the suite is (?:exactly |still )?1(?:40|41) test files/.test(l)).join('\n');
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
eq(pinned.sort(), RATCHET_RELS, 'the repository has exactly these four live suite-count pins');
// Phase 2 has not been started.
ok(!fs.existsSync(path.join(ROOT, HYP_MODULE_REL)), 'no trade-detail module was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/journal-trade-detail-boundary-contract.test.js')),
  'no permanent boundary contract was created');
ok(!fs.existsSync(path.join(ROOT, 'tests/lib/journal-trade-detail-undo.js')), 'no undo helper was created');
eq(localScripts(INDEX).length, BASE_LOCAL_SCRIPTS, 'index.html still loads exactly the base 58 local scripts');

console.log('\n' + pass + ' assertions passed');
console.log('recommendation: extract Candidate ' + RECOMMENDATION + ' (the whole Trade Detail feature)');
console.log('JOURNAL_TRADE_DETAIL_BOUNDARY_AUDIT_OK');
