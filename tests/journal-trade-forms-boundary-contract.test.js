'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL TRADE FORMS — permanent boundary contract.
//
// Replaces tests/temporary-journal-manual-adjustment-boundary-audit.test.js,
// which measured two candidates and recommended this one. That audit is deleted
// by this change; §13 proves it.
//
// WHAT THE AUDIT FOUND. #413 left Manual Entry and Adjustment contiguous, so
// the obvious next cut was that pair alone. It was not safe: two handlers living
// elsewhere in the monolith — `_onJtLegExpChange` and `_onJtLegStrikeChange` —
// write into `_jtFormLegs` twelve times, deeply (`_jtFormLegs[idx].expiry = …`).
// Extracting the pair alone would have shipped a module whose own mutable state
// is written from outside it.
//
//                              pair only    with handlers
//     external code sites          38            16
//     cross-boundary state         29            10
//       …of which WRITES           12             0
//     free dependencies            30            30
//
// The handlers have NO executable consumer anywhere — each is reached only by an
// onchange attribute that `_renderJtLegsTable` generates — and the three names
// they need are all owned by the forms block, so absorbing them adds no
// dependency. §6 proves both facts against the shipped module.
//
// RELOCATION ONLY. Every moved byte is byte-identical to the base, and §10
// proves the reverse transform reconstructs 70770ed9:index.html exactly.
//
// TWO FRAGMENTS. This is the first layer in the JOURNAL family to cut more
// than one block — not the first in the extraction family at large, which an
// earlier version of this header claimed. #408 cut three: its own contract
// records "a six-fragment tiling of the MCX section — three fragments moved,
// two retained inline, one structural separator LF removed". Measured against
// the shipped modules, and scoped to the fifteen layers the reconstruction
// bridge peels, the only multi-fragment ones are #408 (three) and this one
// (two). Wider than that the claim does not hold, so it is not made here.
//
//     handlers   raw [1351203,1352703)   1,500 units   cbd7463d…
//     forms      raw [1718831,1765492)  46,661 units   ec16ed3c…
//
// Each is body + one structural LF and ends `}\n\n`. Both separators leave
// index.html; the module is the two BODIES joined by a single LF, so it ends on
// a real line of code and `git diff --check` sees no blank line at EOF. The
// internal join sits at offset 1,499 and is pinned in its own right (§9), so a
// module with the fragments swapped — identical in length and LF count — is
// rejected rather than silently reassembled into the wrong document.
//
// THE OWNERS. 43 classic globals: the two handlers, then the forms block's 41,
// of which ten are the mutable `_jtForm*` / `_adjForm*` state.
//
// Run: node tests/journal-trade-forms-boundary-contract.test.js
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
const U = require('./lib/journal-trade-forms-undo.js');

const ROOT = path.resolve(__dirname, '..');
const MODULE_REL = 'js/ui/journal-trade-forms.js';
const MODULE_SRC = './' + MODULE_REL;
const CONTRACT_REL = 'tests/journal-trade-forms-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-trade-forms-undo.js';
const AUDIT_REL = 'tests/temporary-journal-manual-adjustment-boundary-audit.test.js';

// ── Pinned base: the merged #414 audit ───────────────────────────────────────
const BASE_SHA = '70770ed97062497b7b189d546b29d92158df8849';
const BASE_TREE = '95bb1aacdd70ff3f06f3137f45f879ed2ae1665b';
const BASE_SUBJECT = 'test(audit): measure the Manual Entry + Adjustment boundary (#414)';
const BASE_PARENT = '45cf2846a6f3aafe9bd6c4948d5bd84787e901c6';
const BASE_INDEX_BLOB = '2a1900d06e664c812f5eddb0bedfe99a4d297aad';
const BASE_CHARS = 1863130;
const BASE_UTF8 = 1897113;
const BASE_LF = 32721;
const BASE_INDEX_SHA256 = '8e52b9a882b29c3097c4bc6031c90349be4fffba481710a909b6f6f8695b4721';
const BASE_LOCAL_SCRIPTS = 57;
// Ratchet. Advanced to 142 by the portfolio data-fetch extraction audit, which
// adds tests/temporary-portfolio-data-fetch-boundary-audit.test.js. That audit
// is replaced one-for-one by its permanent contract, so the count stays at 142.
const TEST_FILE_COUNT = 143;

// ── The two moved fragments, in base coordinates ─────────────────────────────
const HANDLERS = {
  label: 'chain-aware JT leg handlers',
  at: 1351203, end: 1352703, startLine: 23058,
  raw: { chars: 1500, utf8: 1512, lf: 36, sha: 'cbd7463dafc92da0a460a96b2a51228ab668b0d11855f8b3f8a428da5e520c85' },
  body: { chars: 1499, utf8: 1511, lf: 35, sha: 'bc568b87ca4b3ea6f05896ebf904dfd0dffc240025ba44dd1a398dd3b3c94993' },
  banner: '// ── Journal form: chain-aware expiry / strike change handlers ────',
  owners: ['_onJtLegExpChange', '_onJtLegStrikeChange'],
};
const FORMS = {
  label: 'Manual Entry + Adjustment',
  at: 1718831, end: 1765492, startLine: 30009,
  raw: { chars: 46661, utf8: 46829, lf: 949, sha: 'ec16ed3caf80d7da50e6a239eb8dce48ddf9a447be8353b46e05af46cd8ac914' },
  body: { chars: 46660, utf8: 46828, lf: 948, sha: '4ace9380e0cd021836dfc4fc68b0eb4c3dbb8c7b97f98a657fd44ec94b434f7d' },
  banner: '// ── JOURNAL MANUAL ENTRY FORM (multi-leg) ────────────────────────',
};
const FORMS_OWNERS = [
  '_jtFormLegs', '_jtFormStrategy', '_jtFormStatus', '_jtEditId', '_jtPreselectPfId',
  '_adjFormTradeId', '_adjFormNewLegs', '_adjFormNewStrategy', '_adjFormLegsToRoll',
  '_adjFormRollClosePrices', 'showAddTradeForm', 'showEditTradeForm', '_renderJtForm',
  'onJtStrategyChange', 'onJtStatusChange', '_renderJtLegsTable', 'updateJtLegField',
  '_syncJtFormLegsFromDom', 'addJtCustomLeg', 'removeJtLeg', '_deriveJtLegStreamer',
  'updateJtLegStreamer', '_validateJtSymbol', 'refreshAllJtLegStreamers', 'cancelJtForm',
  'showAddAdjustmentForm', 'closeAdjustmentModal', '_adjTypeNeedsLegs', '_renderAdjustmentForm',
  '_onAdjTypeChange', '_onAdjStrategyChange', '_renderAdjNewLegsTable', '_adjUpdateLegField',
  '_adjAddLeg', '_adjRemoveLeg', '_adjUpdateRollClosePrice', '_rollLegPnlPreview',
  '_onAdjRollLegToggle', '_autoPopulateRollLegs', '_validateRollTypeMatch', 'submitAdjustment',
];
const OWNER_NAMES = HANDLERS.owners.concat(FORMS_OWNERS);
const STATE = FORMS_OWNERS.slice(0, 10);

const MODULE_CHARS = 48160;
const MODULE_UTF8 = 48340;
const MODULE_LF = 984;
const MODULE_SHA256 = 'e10f84094a435d07ff49461c2ace24c89aadb25193afa8c5cb33dece16d64a54';
const MODULE_JOIN_AT = 1499;
const SEPARATOR = '\n';

// ── The shipped document ─────────────────────────────────────────────────────
const INDEX_CHARS = 1815024;
const INDEX_UTF8 = 1848827;
const INDEX_LF = 31737;
const INDEX_SHA256 = '7e0851ae220daa6454cf2f3f093821b29c8aff8ba137cb0bbef24283bb976156';
const LOCAL_SCRIPT_COUNT = 58;
const TAG_AT = 113205;
const CODE_AT = 113268;
const CODE_END = 1814998;

const MODULE_TAG = '<script src="' + MODULE_SRC + '"></script>';
const ANCHOR_TAG = '<script src="./js/ui/journal-close-legs.js"></script>';
const INLINE_OPEN = '<script>';

const DEPENDENCIES = ['Boolean', 'Date', 'JSON', 'Math', 'Object', 'S', 'STRATEGY_TEMPLATES',
  'String', '_buildRichSnapshot', '_chainError', '_fetchAndRenderChain', '_greeksMergeFromCache',
  '_journalSnapshotPrefetch', '_optChainCache', '_optionChainErrorText', '_setLegStreamerFromChain',
  'buildCompactOptionDxlinkSymbol', 'console', 'document', 'escHtml', 'isNaN', 'journalManager',
  'normalizeOptionLegSymbolAliases', 'parseFloat', 'portfolioManager', 'setTimeout',
  'showNewPortfolioForm', 'showToast', 'showTradeDetails', 'showView'];
const CALLTIME_TOTAL = 153;

// The three functions that still reach into the module, and what they touch.
const EXTERNAL_HOSTS = {
  submitTrade: { _jtFormLegs: 6, _jtEditId: 3, _jtPreselectPfId: 1, _syncJtFormLegsFromDom: 1, _deriveJtLegStreamer: 1, cancelJtForm: 2 },
  showAddPositionForm: { showAddTradeForm: 1 },
  _fetchAndRenderChain: { _renderJtLegsTable: 1 },
};
const EXTERNAL_CODE_SITES = 16;
// The Portfolio sibling pair, which is NOT part of this layer.
const SIBLING_BANNER = '// ── Portfolio form: chain-aware expiry / strike change handlers ──';
const SIBLINGS = ['_onLegExpChange', '_onLegStrikeChange', '_formLegs'];

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
function loadInEmptyVm(src) {
  const sandbox = {};
  try {
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: 'journal-trade-forms.js' });
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
// Deep writes: `x[i].prop = v` counts, which a shallower `x[i] =` rule misses.
const ACCESS_CHAIN = '(?:\\s*\\.\\s*[A-Za-z_$][A-Za-z0-9_$]*|\\s*\\[[^\\]]*\\])*';
const ASSIGN_OP = '\\s*(?:=(?!=)|\\+=|-=|\\*=|/=|%=|\\|\\|=|&&=|\\?\\?=|\\+\\+|--)';
const WRITE_RE = new RegExp('^' + ACCESS_CHAIN + ASSIGN_OP);

console.log('JOURNAL TRADE FORMS — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · two fragments · audited Candidate F (#414) · base=' + BASE_SHA);

const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// The Journal trade-detail owner is a LATER layer sitting on top of this one,
// so the live document is no longer the one this layer shipped. Peel it first
// and every assertion below still measures the exact document this contract
// pins. The helper re-verifies its output by length and SHA-256, so the hop is
// proved rather than assumed.
const TRADE_DETAIL_U = require('./lib/journal-trade-detail-undo.js');
const TRADE_DETAIL_MODULE = fs.readFileSync(path.join(ROOT, 'js/ui/journal-trade-detail.js'), 'utf8');
// The Portfolio data-fetch owner is the newest layer of all: peel it FIRST so
// every undo below still sees the exact document it was cut against. Its helper
// re-verifies its own output by length and SHA-256, so the hop is proved.
const PORTFOLIO_U = require('./lib/portfolio-data-fetch-undo.js');
const PORTFOLIO_MODULE = fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-data-fetch.js'), 'utf8');
const PRE_PORTFOLIO = PORTFOLIO_U.isApplied(LIVE_INDEX)
  ? PORTFOLIO_U.undoPortfolioDataFetch(LIVE_INDEX, PORTFOLIO_MODULE)
  : LIVE_INDEX;
const INDEX = TRADE_DETAIL_U.isApplied(PRE_PORTFOLIO)
  ? TRADE_DETAIL_U.undoJournalTradeDetail(PRE_PORTFOLIO, TRADE_DETAIL_MODULE)
  : PRE_PORTFOLIO;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const BASE_INDEX = git(['show', BASE_SHA + ':index.html']);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The pinned base');
// ─────────────────────────────────────────────────────────────────────────────
eq(git(['rev-parse', BASE_SHA + '^{commit}']).trim(), BASE_SHA, 'the base commit resolves');
eq(git(['rev-parse', BASE_SHA + '^{tree}']).trim(), BASE_TREE, 'the base TREE is derived with git');
eq(git(['log', '-1', '--format=%s', BASE_SHA]).trim(), BASE_SUBJECT, 'the base subject is the merged #414 audit');
eq(git(['rev-parse', BASE_SHA + '^']).trim(), BASE_PARENT, 'the base parent is #413');
eq(git(['rev-parse', BASE_SHA + ':index.html']).trim(), BASE_INDEX_BLOB, 'the base index.html blob');
eq(metrics(BASE_INDEX), { chars: BASE_CHARS, utf8: BASE_UTF8, lf: BASE_LF, sha: BASE_INDEX_SHA256 },
  'the base index.html identity');
eq(localScripts(BASE_INDEX).length, BASE_LOCAL_SCRIPTS, 'the base loaded 57 local application scripts');
eq(BASE_INDEX.indexOf(MODULE_TAG), -1, 'the base carried no trade-forms tag');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The two moved fragments, measured against the base blob');
// ─────────────────────────────────────────────────────────────────────────────
for (const F of [HANDLERS, FORMS]) {
  const raw = BASE_INDEX.slice(F.at, F.end);
  const body = BASE_INDEX.slice(F.at, F.end - 1);
  eq(metrics(raw), { chars: F.raw.chars, utf8: F.raw.utf8, lf: F.raw.lf, sha: F.raw.sha }, F.label + ': raw identity');
  eq(metrics(body), { chars: F.body.chars, utf8: F.body.utf8, lf: F.body.lf, sha: F.body.sha }, F.label + ': body identity');
  eq(body + SEPARATOR, raw, F.label + ': raw === body + exactly one LF');
  eq(raw.slice(-3), '}\n\n', F.label + ': raw ends `}\\n\\n`');
  eq(BASE_INDEX.slice(F.at - 3, F.at), '}\n\n', F.label + ': it sat behind a complete `}\\n\\n` seam');
  eq(lineAt(BASE_INDEX, F.at), F.startLine, F.label + ': it began on its pinned line');
  ok(BASE_INDEX.slice(F.at, F.at + F.banner.length) === F.banner, F.label + ': it opened on its own banner');
}
ok(HANDLERS.end < FORMS.at, 'the fragments are disjoint, handlers first');
eq(U.HANDLERS_AT, HANDLERS.at, 'the undo helper pins the handler offset');
eq(U.FORMS_AT, FORMS.at, 'the undo helper pins the forms offset');
eq(U.HANDLERS_RAW_SHA256, HANDLERS.raw.sha, 'the undo helper pins the handler raw hash');
eq(U.FORMS_RAW_SHA256, FORMS.raw.sha, 'the undo helper pins the forms raw hash');

// ─────────────────────────────────────────────────────────────────────────────
section('3. The module file, and its internal join');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(MODULE), { chars: MODULE_CHARS, utf8: MODULE_UTF8, lf: MODULE_LF, sha: MODULE_SHA256 },
  'the module: 48,160 units / 48,340 bytes / 984 LF / e10f8409…');
eq(MODULE.slice(-2), '}\n', 'it ends on a real line of code');
ok(!/\n\s*\n$/.test(MODULE), 'no blank line at EOF');
eq(MODULE_JOIN_AT, HANDLERS.body.chars, 'the join sits exactly at the handler body length');
eq(MODULE[MODULE_JOIN_AT], SEPARATOR, 'the join is exactly one LF');
eq(MODULE.slice(0, MODULE_JOIN_AT), BASE_INDEX.slice(HANDLERS.at, HANDLERS.end - 1),
  'the first fragment is byte-identical to the base handler body');
eq(MODULE.slice(MODULE_JOIN_AT + 1), BASE_INDEX.slice(FORMS.at, FORMS.end - 1),
  'the second fragment is byte-identical to the base forms body');
eq(MODULE, BASE_INDEX.slice(HANDLERS.at, HANDLERS.end - 1) + SEPARATOR + BASE_INDEX.slice(FORMS.at, FORMS.end - 1),
  'the module IS the two bodies in document order, joined by one LF');
eq(MODULE_CHARS, HANDLERS.body.chars + 1 + FORMS.body.chars, 'the sizes add up: 1,499 + 1 + 46,660 = 48,160');
eq(U.MODULE_JOIN_AT, MODULE_JOIN_AT, 'the undo helper pins the same join offset');

// ─────────────────────────────────────────────────────────────────────────────
section('4. The 43 owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(shape(MODULE).map((d) => d.name), OWNER_NAMES, 'the module declares exactly its 43 owners, in order');
eq(shape(MODULE).length, 43, '43 declarations');
eq(shape(MODULE).filter((d) => d.form === 'var').map((d) => d.name), STATE, 'ten mutable owners');
eq(shape(MODULE).filter((d) => d.isAsync).map((d) => d.name), ['submitAdjustment'], 'one async owner');
eq(shape(MODULE).slice(0, 2).map((d) => d.name), HANDLERS.owners, 'the two handlers come first');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Load-time purity');
// ─────────────────────────────────────────────────────────────────────────────
const decls = scanTopLevelDeclarations(MODULE);
const ch = Array.from(MODULE);
decls.forEach((d) => { for (let i = d.start; i <= d.end; i++) ch[i] = ' '; });
eq(maskLiterals(ch.join('')).replace(/\s+/g, ''), '', 'declarations, comments and whitespace only at top level');
const loaded = loadInEmptyVm(MODULE);
ok(loaded.ok, 'the module evaluates in an empty VM with no error');
eq(loaded.globals, OWNER_NAMES.slice().sort(), 'it defines exactly the 43 globals');
eq(topLevelCallSites(MODULE).length, 0, 'zero top-level calls');
eq(topLevelHits(MODULE, /\b(?:document|window)\s*\./).length, 0, 'zero top-level DOM access');
eq(topLevelHits(MODULE, /\baddEventListener\b/).length, 0, 'zero top-level listeners');
eq(topLevelHits(MODULE, /\b(?:setTimeout|setInterval|requestAnimationFrame)\b/).length, 0, 'zero top-level timers');
eq(topLevelHits(MODULE, /\b(?:localStorage|sessionStorage|indexedDB)\b/).length, 0, 'zero top-level storage access');
eq(topLevelHits(MODULE, /\b(?:fetch|XMLHttpRequest|WebSocket)\b/).length, 0, 'zero top-level network work');
eq(topLevelHits(MODULE, /\b(?:journalManager|positionManager|portfolioManager)\b/).length, 0, 'zero top-level journal work');
for (const d of decls.filter((x) => x.form === 'var')) {
  ok(/=\s*(?:null|undefined|\[\]|\{\}|-?\d+(?:\.\d+)?|true|false|'[^'\\]*'|"[^"\\]*")\s*;?$/
    .test(MODULE.slice(d.start, d.end + 1)), d.name + ' is initialised with an inert literal');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Why the handlers travel with the forms');
// ─────────────────────────────────────────────────────────────────────────────
eq(freeIdentifiers(MODULE), DEPENDENCIES, 'the free-dependency inventory is exactly the audited 30 names');
eq(DEPENDENCIES.length, 30, 'thirty dependencies');
const cls = classifyReferences(MODULE, DEPENDENCIES);
eq(cls.loadTime, [], 'NO dependency is read while the module is being evaluated');
eq(cls.callTime.length, CALLTIME_TOTAL, 'all 153 dependency references are call-time');
// The handlers needed three names the forms block owns; inside one module those
// are internal, which is why absorbing them added no dependency.
const handlerDeps = freeIdentifiers(MODULE.slice(0, MODULE_JOIN_AT));
eq(handlerDeps.filter((n) => FORMS_OWNERS.indexOf(n) >= 0).sort(),
  ['_deriveJtLegStreamer', '_jtFormLegs', '_renderJtLegsTable'],
  'alone, the handlers depend on three names the forms block owns');
for (const n of ['_deriveJtLegStreamer', '_jtFormLegs', '_renderJtLegsTable']) {
  eq(DEPENDENCIES.indexOf(n), -1, n + ' is internal to the module, not a dependency');
}
// Each handler is reached only by markup the legs table generates.
const MVIEWS = lexicalViews(MODULE);
for (const n of HANDLERS.owners) {
  eq(refSites(MVIEWS.code, n).length, 1, n + ' appears once in executable code — its declaration');
  eq(refSites(MVIEWS.strings, n).length, 1, n + ' is referenced from generated markup exactly once');
}
eq(countLiteral(MODULE, 'onchange="_onJtLegExpChange('), 1, 'one generated onchange for the expiry handler');
eq(countLiteral(MODULE, 'onchange="_onJtLegStrikeChange('), 1, 'one generated onchange for the strike handler');

// ─────────────────────────────────────────────────────────────────────────────
section('7. The shipped index.html');
// ─────────────────────────────────────────────────────────────────────────────
eq(metrics(INDEX), { chars: INDEX_CHARS, utf8: INDEX_UTF8, lf: INDEX_LF, sha: INDEX_SHA256 },
  'the shipped document: 1,815,024 units / 1,848,827 bytes / 31,737 LF / 7e0851ae…');
eq(BASE_CHARS - HANDLERS.raw.chars - FORMS.raw.chars + (1 + MODULE_TAG.length), INDEX_CHARS,
  'the arithmetic holds: 1,863,130 − 1,500 − 46,661 + 55 = 1,815,024');
eq(BASE_LF - HANDLERS.raw.lf - FORMS.raw.lf + 1, INDEX_LF,
  'the LF arithmetic holds: 32,721 − 36 − 949 + 1 = 31,737');
eq(localScripts(INDEX).length, LOCAL_SCRIPT_COUNT, 'it loads 58 local application scripts');
eq(countLiteral(INDEX, MODULE_TAG), 1, 'exactly one trade-forms tag');
eq(INDEX.indexOf(MODULE_TAG), TAG_AT, 'the tag sits at the pinned offset');
eq(INDEX.slice(INDEX.indexOf(ANCHOR_TAG) + ANCHOR_TAG.length, TAG_AT), '\n', 'immediately after journal-close-legs.js');
eq(INDEX.slice(TAG_AT + MODULE_TAG.length, TAG_AT + MODULE_TAG.length + 1 + INLINE_OPEN.length),
  '\n' + INLINE_OPEN, 'and immediately before the inline monolith');
eq(localScripts(INDEX).map((t) => t.src).slice(-2), ['./js/ui/journal-close-legs.js', MODULE_SRC],
  'it is the last local script');
const rawTag = /<script\b[^>]*journal-trade-forms\.js[^>]*>/.exec(INDEX);
ok(rawTag && !/\basync\b/.test(rawTag[0]), 'the tag is not async');
ok(rawTag && !/\bdefer\b/.test(rawTag[0]), 'the tag is not deferred');
ok(rawTag && !/type\s*=\s*["']module["']/.test(rawTag[0]), 'the tag is not type=module');
eq(INDEX.indexOf(MODULE.slice(0, MODULE_JOIN_AT)), -1, 'no byte of the handler body remains inline');
eq(INDEX.indexOf(MODULE.slice(MODULE_JOIN_AT + 1)), -1, 'no byte of the forms body remains inline');
eq(INDEX.indexOf(HANDLERS.banner), -1, 'the handler banner is gone');
eq(INDEX.indexOf(FORMS.banner), -1, 'the forms banner is gone');
eq(INDEX.slice(CODE_AT - INLINE_OPEN.length, CODE_AT), INLINE_OPEN, 'the inline monolith opens at the pinned offset');
eq(INDEX.slice(CODE_END, CODE_END + 9), '</script>', 'and closes at the pinned offset');

// ─────────────────────────────────────────────────────────────────────────────
section('8. What still reaches into the module, and the sibling that does not');
// ─────────────────────────────────────────────────────────────────────────────
const CODE = INDEX.slice(CODE_AT, CODE_END);
const VIEWS = lexicalViews(CODE);
const remaining = scanTopLevelDeclarations(CODE);
let codeSites = 0;
const hosts = {};
for (const n of OWNER_NAMES) {
  for (const i of refSites(VIEWS.code, n)) {
    codeSites++;
    const h = (remaining.find((d) => i >= d.start && i <= d.end) || { name: '(top level)' }).name;
    hosts[h] = hosts[h] || {};
    hosts[h][n] = (hosts[h][n] || 0) + 1;
  }
}
eq(codeSites, EXTERNAL_CODE_SITES, 'exactly 16 executable references remain in the monolith');
eq(hosts, EXTERNAL_HOSTS, '…concentrated in exactly three functions');
eq(Object.keys(hosts).length, 3, 'three host functions, not a diffuse spread');
// None of them writes the module's state: the module owns every write.
let externalWrites = 0;
for (const n of STATE) {
  for (const i of refSites(VIEWS.code, n)) {
    if (WRITE_RE.test(VIEWS.code.slice(i + n.length, i + n.length + 120))) externalWrites++;
  }
}
eq(externalWrites, 0, 'ZERO external writes into the module\'s mutable state');
// Static markup consumers.
const HEAD = INDEX.slice(0, CODE_AT);
eq(refSites(HEAD, 'showAddTradeForm').length, 2, 'two static markup references to showAddTradeForm');
eq(refSites(HEAD, 'closeAdjustmentModal').length, 1, 'one static markup reference to closeAdjustmentModal');
// The Portfolio sibling pair stays inline and is not claimed by this layer.
eq(countLiteral(INDEX, SIBLING_BANNER), 1, 'the Portfolio sibling banner is still inline');
for (const n of SIBLINGS) {
  ok(refSites(VIEWS.code, n).length > 0, 'the Portfolio sibling ' + n + ' stays inline');
  eq(OWNER_NAMES.indexOf(n), -1, n + ' is not an owner of this module');
  eq(countLiteral(MODULE, n === '_formLegs' ? 'var _formLegs' : 'function ' + n), 0,
    n + ' is not declared by this module');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The byte-exact undo');
// ─────────────────────────────────────────────────────────────────────────────
eq(U.MODULE_SHA256, MODULE_SHA256, 'the undo helper pins the module hash');
eq(U.EXTRACTED_SHA256, INDEX_SHA256, 'the undo helper pins the shipped document hash');
eq(U.BASE_SHA256, BASE_INDEX_SHA256, 'the undo helper pins the base hash');
ok(U.isApplied(INDEX), 'the extraction reads as applied');
ok(!U.isApplied(BASE_INDEX), 'the base reads as not applied');
const restored = U.undoJournalTradeForms(INDEX, MODULE);
eq(restored, BASE_INDEX, 'the undo reconstructs the base index.html byte for byte');
eq(sha256(restored), BASE_INDEX_SHA256, '…with the base SHA-256');

// ─────────────────────────────────────────────────────────────────────────────
section('10. Mutation-sensitive negative controls');
// ─────────────────────────────────────────────────────────────────────────────
throws(() => U.undoJournalTradeForms(null, MODULE), /JOURNAL_TRADE_FORMS_UNDO_BAD_INPUT/, '10.1 a non-string document');
throws(() => U.undoJournalTradeForms(INDEX, null), /JOURNAL_TRADE_FORMS_UNDO_BAD_INPUT/, '10.2 a non-string module');
throws(() => U.undoJournalTradeForms(INDEX, MODULE + SEPARATOR), /JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY/,
  '10.3 a module that absorbed a separator');
throws(() => U.undoJournalTradeForms(INDEX, MODULE.slice(0, -1)), /JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY/,
  '10.4 a module missing its final LF');
throws(() => U.undoJournalTradeForms(INDEX, MODULE.slice(0, 20000)), /JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY/,
  '10.5 a truncated module');
throws(() => U.undoJournalTradeForms(INDEX, MODULE.replace('Trade not found', 'Trade not fouud')),
  /JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY/, '10.6 a same-length edit, caught by the hash');
{
  // THE two-fragment control: the same bytes, the same length, the same LF
  // count — only the join check can tell these apart.
  const swapped = MODULE.slice(MODULE_JOIN_AT + 1) + SEPARATOR + MODULE.slice(0, MODULE_JOIN_AT);
  eq(swapped.length, MODULE_CHARS, 'the swapped mutant is exactly the same length');
  eq(countLf(swapped), MODULE_LF, '…and carries exactly the same number of LF');
  throws(() => U.undoJournalTradeForms(INDEX, swapped), /JOURNAL_TRADE_FORMS_UNDO_MODULE_JOIN/,
    '10.7 the two fragments in the WRONG ORDER are rejected by the join guard');
}
{
  // The join replaced by a different byte of the same width.
  const badJoin = MODULE.slice(0, MODULE_JOIN_AT) + ' ' + MODULE.slice(MODULE_JOIN_AT + 1);
  eq(badJoin.length, MODULE_CHARS, 'the bad-join mutant is the same length');
  throws(() => U.undoJournalTradeForms(INDEX, badJoin), /JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY/,
    '10.8 a join that is not an LF is rejected');
}
throws(() => U.undoJournalTradeForms(BASE_INDEX, MODULE), /JOURNAL_TRADE_FORMS_UNDO_TAG_IDENTITY/,
  '10.9 an already-unextracted document');
throws(() => U.undoJournalTradeForms(INDEX.replace(MODULE_TAG, MODULE_TAG + '\n' + MODULE_TAG), MODULE),
  /JOURNAL_TRADE_FORMS_UNDO_TAG_IDENTITY/, '10.10 a duplicate tag');
{
  const untagged = INDEX.slice(0, TAG_AT) + INDEX.slice(TAG_AT + MODULE_TAG.length + 1);
  const a = untagged.indexOf(ANCHOR_TAG);
  const reordered = untagged.slice(0, a) + MODULE_TAG + '\n' + untagged.slice(a);
  eq(countLiteral(reordered, MODULE_TAG), 1, 'the reordered mutant still has exactly one tag');
  throws(() => U.undoJournalTradeForms(reordered, MODULE), /JOURNAL_TRADE_FORMS_UNDO_TAG_ADJACENCY/,
    '10.11 a tag before its anchor');
}
throws(() => U.undoJournalTradeForms(INDEX + ' ', MODULE), /JOURNAL_TRADE_FORMS_UNDO_EXTRACTED_IDENTITY/,
  '10.12 foreign content anywhere in the document');
{
  const stranded = INDEX.slice(0, HANDLERS.at) + '\n' + INDEX.slice(HANDLERS.at);
  throws(() => U.undoJournalTradeForms(stranded, MODULE), /JOURNAL_TRADE_FORMS_UNDO_EXTRACTED_IDENTITY/,
    '10.13 a separator left stranded at the first cut');
}
eq(U.undoJournalTradeForms(INDEX, MODULE), BASE_INDEX, '10.14 the genuine pair still reconstructs the base');
// Owner-shape and consumer controls.
eq(shape(MODULE.replace('async function submitAdjustment', 'function submitAdjustment'))
  .filter((d) => d.isAsync).length, 0, '10.15 submitAdjustment losing async is detectable');
ok(freeIdentifiers(MODULE.replace(/\bescHtml\b/g, 'escHtml2')).indexOf('escHtml') < 0,
  '10.16 a renamed dependency disappears from the inventory');
eq(countLiteral(MODULE.replace('onchange="_onJtLegExpChange(', 'onchange="_gone('),
  'onchange="_onJtLegExpChange('), 0, '10.17 a removed generated onchange is detectable');
ok(topLevelCallSites(MODULE + 'showToast("x");\n').length === 1, '10.18 an extra top-level call is detectable');
ok(WRITE_RE.test('_jtFormLegs[idx].expiry = 1;'.slice('_jtFormLegs'.length)),
  '10.19 the write classifier still sees deep writes');

// ─────────────────────────────────────────────────────────────────────────────
section('11. Exact production scope, and the temporary audit is gone');
// ─────────────────────────────────────────────────────────────────────────────
const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA + '...HEAD'])
  .trim().split(/\r?\n/).filter(Boolean);
const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
  .split(/\r?\n/).filter(Boolean).map((l) => l.slice(3));
const changed = Array.from(new Set(committed.concat(status))).sort();
const changedProduction = changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/'));
eq(changedProduction, ['index.html', 'js/portfolio/portfolio-data-fetch.js', 'js/ui/journal-trade-detail.js', MODULE_REL],
  'production footprint is exactly index.html plus this owner and the later trade-detail owner');
ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)), 'no temporary audit is shipped: this contract replaces it');
ok(!changed.some((rel) => rel.startsWith('.github/')), 'no workflow changed');
ok(!changed.some((rel) => rel.endsWith('.md') && rel !== 'CLAUDE.md'),
  'no documentation changed, except the repository working notes');
ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')), 'no configuration changed');
ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL || rel === 'CLAUDE.md' ||
  rel === 'js/portfolio/portfolio-data-fetch.js' || rel === 'js/ui/journal-trade-detail.js' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  'the suite is 142 test files: the shipped contracts plus the portfolio-data-fetch audit');
// The audit's rejected candidate was never built.
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-manual-entry.js')), 'no manual-entry-only module exists');
ok(!fs.existsSync(path.join(ROOT, 'js/ui/journal-adjustment.js')), 'no adjustment-only module exists');

console.log('\n' + pass + ' assertions passed');
console.log('JOURNAL_TRADE_FORMS_BOUNDARY_OK');
