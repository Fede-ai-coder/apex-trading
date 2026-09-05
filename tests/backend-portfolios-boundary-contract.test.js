'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND-BACKED PORTFOLIOS — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #422 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/backend-portfolios-undo.js reconstructs
// the pre-extraction document byte for byte. §11 runs that round trip and §12
// exercises every documented failure.
//
// THE SEAM IS NOT A CLOSING BRACE. This region ends on a top-level STATEMENT:
//
//     window.viewLinkedTradesInJournal = viewLinkedTradesInJournal;
//
// so its body ends `;\n` where FIFTEEN of the sixteen earlier layers end `}\n`.
// Audit #422 measured what the old rule would have cost: it said a region ends
// after its last DECLARATION, which stops 62 units short here and strands the
// re-export inline, pointing at a function that has moved to a module. It would
// still have run. §2 pins the seam through the shared, executable rule in
// tests/lib/extraction-boundary.js rather than restating it in a comment.
//
// TWELVE TOP-LEVEL STATEMENTS: ten `window.X = X` re-exports and the two `try`
// wrappers around them. A module tag runs them EARLIER in document order than the
// inline monolith did, so §5 proves they can afford it: zero calls, zero `await`,
// and no read of any name the region does not own.
//
// NEITHER OF THOSE IS A FIRST, AND THE EXCEPTION IS ALWAYS THE SAME LAYER.
// `js/services/journal-backend-write-through.js` is the one earlier layer that
// ends on something other than `}\n` (it ends `})();`), the one that carries
// trailing top-level code past its last declaration, and the one — with 85 lines
// — that already had top-level statements. Two of the seventeen layers have each
// of these properties, not one, and it is the same layer each time. Three drafts
// of this header called each property a first; §2 now measures them instead.
//
// DEFINED AFTER THREE MODULES THAT ALREADY CALL IT. journal-manual-import,
// journal-close-legs and journal-trade-forms each reference an owner, and all
// three load first. §7 shows every one of those references sits inside a
// declaration — call time, not evaluation time — which is what makes the order
// safe. It is proved, not assumed.
//
// WHY THIS REGION. Ten external edges, the smallest of the seven candidates
// audit #422 measured against 18, 20, 23, 30, 35 and 77; zero inbound and zero
// outbound state coupling; fourteen dependencies read 67 times, none at
// evaluation time.
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
const UNDO = require('./lib/backend-portfolios-undo.js');

const MODULE_REL = 'js/portfolio/backend-portfolios.js';
const TAG = '<script src="./js/portfolio/backend-portfolios.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-data-fetch.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = '336a3391369d67d2a63721a720eb798814b72664';
const TEST_FILE_COUNT = 147;
const LOCAL_SCRIPT_COUNT = 61;

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

const WINDOW_EXPORTS = [
  '_portfolioOpenBackendLoad', '_syncPortfoliosFromBackend', 'apexUpdatePortfolio',
  'backendCreatePortfolio', 'backendDeletePortfolio', 'backendGetPortfolio',
  'backendListPortfolios', 'backendUpdatePortfolio', 'getPortfolioJournalReconciliation',
  'viewLinkedTradesInJournal',
];
const TOP_LEVEL_STATEMENTS = 12;

const DEPENDENCIES = [
  'S', '_activeView', '_jSyncJournalFromBackend', '_portfolioRiskDebugEnabled',
  '_updateStormBanner', 'escHtml', 'isApexLocalDevEnv', 'jStatBox', 'journalManager',
  'portStat', 'portfolioManager', 'renderPortfolioJournalView', 'showToast', 'showView',
];

const INLINE_CONSUMERS = {
  _portfolioOpenBackendLoad: 1,
  renderPortfolioView: 8,
  getPortfolioJournalReconciliation: 1,
};
const INLINE_CONSUMER_TOTAL = 10;
const MODULE_CONSUMERS = {
  'js/services/journal-manual-import.js': 1,
  'js/ui/journal-close-legs.js': 1,
  'js/ui/journal-trade-forms.js': 1,
};

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function countLiteral(h, n) { let c = 0, i = 0; while ((i = h.indexOf(n, i)) >= 0) { c++; i += n.length; } return c; }
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
function outsideEveryDeclaration(src) {
  const spans = scanTopLevelDeclarations(src).map((d) => [d.start, d.end]);
  return (i) => !spans.some(([s, e]) => i >= s && i <= e);
}
function isWriteAt(text, at, name) {
  const after = text.slice(at + name.length, at + name.length + 30);
  return /^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(after) ||
    /^\s*(?:\[[^\]]*\]|\.[A-Za-z0-9_$]+)+\s*=[^=]/.test(after);
}
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const TRAFFIC_LIGHT_U = require('./lib/portfolio-traffic-light-undo.js');
const EXPIRY_MANUAL_U = require('./lib/portfolio-expiry-manual-undo.js');
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// Manual expiry was cut AFTER this layer, so the live document is no longer the
// one this contract shipped. Peel it first; its helper re-verifies its own
// output by length and SHA-256, so the hop is proved rather than assumed.
// The alignment + traffic light pair was cut AFTER manual expiry, so peel it
// FIRST; each helper re-verifies its own output by length and SHA-256, so both
// hops are proved rather than assumed.
const PRE_TRAFFIC_LIGHT = TRAFFIC_LIGHT_U.isApplied(LIVE_INDEX)
  ? TRAFFIC_LIGHT_U.undoPortfolioTrafficLight(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-traffic-light.js'), 'utf8'))
  : LIVE_INDEX;
const INDEX = EXPIRY_MANUAL_U.isApplied(PRE_TRAFFIC_LIGHT)
  ? EXPIRY_MANUAL_U.undoPortfolioExpiryManual(
      PRE_TRAFFIC_LIGHT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-expiry-manual.js'), 'utf8'))
  : PRE_TRAFFIC_LIGHT;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');

console.log('BACKEND-BACKED PORTFOLIOS — PERMANENT BOUNDARY CONTRACT');

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 22,749 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src)).length,
  LOCAL_SCRIPT_COUNT, 'sixty-one local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is ' + TEST_FILE_COUNT + ' test files');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The seam — through the shared rule, not a comment');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE.slice(-UNDO.MODULE_LAST_LINE.length), UNDO.MODULE_LAST_LINE,
  'the module ends on the re-export statement, not a closing brace');
eq(MODULE.slice(-2), ';\n', '…so its final two units are `;\\n`');
{
  // The header claims fifteen of the sixteen earlier layers end `}\n`. That is a
  // claim about all sixteen, so it is measured over all sixteen.
  const EARLIER = [
    'js/services/journal-core.js', 'js/services/mcx-regime-policy.js', 'js/ui/journal-ui.js',
    'js/services/journal-remote-persistence.js', 'js/services/journal-backend-write-through.js',
    'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
    'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
    'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js', 'js/ui/journal-close-legs.js',
    'js/ui/journal-trade-forms.js', 'js/ui/journal-trade-detail.js',
    'js/portfolio/portfolio-data-fetch.js',
  ];
  eq(EARLIER.length, 16, 'sixteen layers predate this one');
  const notBrace = EARLIER.filter((rel) => !fs.readFileSync(path.join(ROOT, rel), 'utf8').endsWith('}\n'));
  eq(notBrace, ['js/services/journal-backend-write-through.js'],
    'exactly ONE earlier layer already ended on something other than `}\\n`');
  eq(fs.readFileSync(path.join(ROOT, notBrace[0]), 'utf8').slice(-6), '})();\n',
    '…and it ends on an IIFE terminator, so this seam is the second of its kind, not the first');

  // The same layer is also the only earlier one with top-level statements, which
  // is why three drafts of this header wrongly called each property a first.
  const withStatements = EARLIER.filter((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const spans = scanTopLevelDeclarations(src).map((d) => [d.start, d.end]);
    const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
    let off = 0;
    for (const line of src.split('\n')) {
      if (line.trim() && outside(off) && !isBlankOrComment(line)) return true;
      off += line.length + 1;
    }
    return false;
  });
  eq(withStatements, notBrace,
    'the layer with top-level statements is the SAME one — the exception is never a different file');
}
ok(!MODULE.endsWith('\n\n'), 'and it does not end on a blank line, so git diff --check stays clean');
{
  const lineStart = MODULE.lastIndexOf('\n', MODULE.length - 2) + 1;
  eq(isBlankOrComment(MODULE.slice(lineStart)), false, 'the module’s last line is code');
  eq(snapBodyEnd(MODULE, 0, MODULE.length), MODULE.length,
    'the shared snap takes the whole module — it is a complete region');
}
{
  // The seam as it stood in the pre-extraction document, validated by the same
  // fail-closed helper that guarded the cut.
  const base = git(['show', BASE_SHA + ':index.html']);
  eq(base.length, UNDO.BASE_CHARS, 'the base document is the pinned one');
  eq(sha256(base), UNDO.BASE_SHA256, '…confirmed by hash');
  eq(assertSeam(base, UNDO.RAW_AT, UNDO.RAW_END - 1), UNDO.RAW_END,
    'assertSeam accepts the boundary and returns the pinned raw end');
  eq(base.slice(UNDO.RAW_AT, UNDO.RAW_END), MODULE + UNDO.SEPARATOR,
    'raw === module body + exactly one LF');
  eq(base.slice(UNDO.RAW_AT - 3, UNDO.RAW_AT), ';\n\n', 'it opened after a `;\\n\\n` seam');
  eq(base.slice(UNDO.RAW_END - 3, UNDO.RAW_END), ';\n\n', 'and closed on one');
  // The dead rule, pinned against this very region.
  const decls = scanTopLevelDeclarations(MODULE);
  const last = decls[decls.length - 1];
  eq(MODULE.length - (last.start + last.chars + 1), 62,
    'the last-declaration rule would have stopped 62 units short here');
  throwsWith(() => assertSeam(base, UNDO.RAW_AT, UNDO.RAW_AT + last.start + last.chars + 1),
    'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR',
    '…and assertSeam refuses that boundary rather than letting it ship');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The tag, and where it loads');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, TAG), 1, 'exactly one tag for this module');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG), 1, 'it follows the #421 portfolio tag immediately');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1,
  '…and the inline monolith opens immediately after it');
{
  const locals = APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src));
  eq(locals[locals.length - 1].src, './js/portfolio/backend-portfolios.js',
    'it is the LAST local script — pinned by identity, not by index');
  eq(locals[locals.length - 2].src, './js/portfolio/portfolio-data-fetch.js',
    'and the one before it is the #421 module');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Owners');
// ─────────────────────────────────────────────────────────────────────────────
eq(scanTopLevelDeclarations(MODULE).map((d) => ({
  name: d.name, form: d.form, isAsync: !!d.isAsync, chars: d.chars })), OWNERS,
  'the module owns exactly these sixteen top-level declarations');
eq(OWNERS.filter((o) => o.isAsync).length, 9, 'nine are async');
eq(OWNERS.filter((o) => o.form === 'var').length, 1, 'exactly one mutable global is declared');
eq(OWNERS.reduce((a, o) => a + o.chars, 0), OWNER_SPAN_SUM,
  'the owner spans sum to 18,895 of 22,749 — the rest is comment and seam');

// ─────────────────────────────────────────────────────────────────────────────
section('5. Evaluation time — twelve statements that can afford to run earlier');
// ─────────────────────────────────────────────────────────────────────────────
{
  const outside = outsideEveryDeclaration(MODULE);
  let statements = 0, off = 0;
  for (const line of MODULE.split('\n')) {
    const t = line.trim();
    if (t && outside(off) && !isBlankOrComment(t)) statements++;
    off += line.length + 1;
  }
  eq(statements, TOP_LEVEL_STATEMENTS, 'twelve top-level statement lines');

  const masked = maskLiterals(MODULE);
  const bodies = functionBodyRanges(MODULE).filter((r) => !r.iife);
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  // `name(` also matches control-flow keywords. Skipping only on the PRECEDING
  // text is not enough: `catch (e)` puts the keyword in the name position, and
  // this module has four of them. Filter the name as well.
  const NOT_A_CALL = new Set(['function', 'catch', 'if', 'for', 'while', 'switch', 'return', 'typeof']);
  let calls = 0;
  let controlFlow = 0;
  const callRe = /([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = callRe.exec(masked))) {
    if (inFn(m.index)) continue;
    if (NOT_A_CALL.has(m[1])) { controlFlow++; continue; }
    const before = masked.slice(Math.max(0, m.index - 30), m.index);
    if (/\b(?:function|catch|if|for|while|switch)\s*$/.test(before)) continue;
    calls++;
  }
  eq(calls, 0, 'none of them calls anything');
  eq(controlFlow, 4, '…and the four keyword matches are the `catch (e)` of the try wrappers');
  let awaits = 0;
  const awaitRe = /\bawait\b/g;
  while ((m = awaitRe.exec(masked))) if (!inFn(m.index)) awaits++;
  eq(awaits, 0, 'and none awaits');

  // The load-order argument: they read nothing the module does not own.
  const owned = new Set(OWNERS.map((o) => o.name));
  const KW = new Set(['try', 'catch', 'window', 'e', 'var', 'let', 'const', 'function',
    'if', 'else', 'return', 'typeof', 'new', 'throw', 'async', 'await', 'null', 'true', 'false']);
  const foreign = new Set();
  const idRe = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = idRe.exec(masked))) {
    const i = m.index + m[1].length;
    if (!outside(i)) continue;
    const n = m[2];
    if (KW.has(n) || owned.has(n)) continue;
    foreign.add(n);
  }
  eq(Array.from(foreign), [], 'they read no name the module does not own');

  // A control, because an empty result proves nothing on its own.
  {
    const probe = 'function f(){ return 1; }\nwindow.g = elsewhere;\n';
    const pOutside = outsideEveryDeclaration(probe);
    const pMasked = maskLiterals(probe);
    const pOwned = new Set(scanTopLevelDeclarations(probe).map((d) => d.name));
    const seen = new Set();
    const re2 = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let p;
    while ((p = re2.exec(pMasked))) {
      const i = p.index + p[1].length;
      if (!pOutside(i)) continue;
      const n = p[2];
      if (KW.has(n) || pOwned.has(n)) continue;
      seen.add(n);
    }
    eq(Array.from(seen), ['elsewhere'], 'CONTROL: a foreign top-level read IS detected');
  }
}
{
  // The module is a classic script; in a browser `window` always exists. Give it
  // a bare object and nothing else.
  const win = {};
  const box = { window: win };
  vm.createContext(box);
  vm.runInContext(MODULE, box, { filename: 'backend-portfolios.js' });
  eq(Object.keys(box).filter((k) => k !== 'window').sort(), OWNERS.map((o) => o.name).sort(),
    'it defines its sixteen owners and nothing else');
  eq(Object.keys(win).sort(), WINDOW_EXPORTS.slice().sort(),
    'and touches window only with its own ten re-exports');
  // Without a window it throws, and only for that reason.
  const bare = {};
  vm.createContext(bare);
  let err = null;
  try { vm.runInContext(MODULE, bare, { filename: 'bare.js' }); } catch (e) { err = e.message; }
  ok(err !== null && /window is not defined/.test(err),
    'in a totally empty VM it throws, and the reason is exactly the missing window');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Dependencies — all read at call time');
// ─────────────────────────────────────────────────────────────────────────────
{
  const inline = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000);
  eq(inline.length, 1, 'there is exactly one inline application script');
  const CODE = inline[0].inline;
  const monolithNames = new Set(scanTopLevelDeclarations(CODE).map((d) => d.name));
  for (const n of DEPENDENCIES) {
    ok(monolithNames.has(n), 'the monolith still declares ' + n);
  }
  eq(DEPENDENCIES.length, 14, 'fourteen dependencies');
  const outside = outsideEveryDeclaration(MODULE);
  const masked = maskLiterals(MODULE);
  let callTime = 0, evalTime = 0;
  for (const n of DEPENDENCIES) {
    for (const i of refSites(masked, n)) (outside(i) ? evalTime++ : callTime++);
  }
  eq(evalTime, 0, 'not one is read at evaluation time');
  eq(callTime, 67, 'and all 67 references sit inside a declaration');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6b. Cross-module dependencies — the ones the monolith does NOT declare');
// ─────────────────────────────────────────────────────────────────────────────
// §6 measures only names the MONOLITH declares, which is the right question for
// what the extraction left behind — but it is not the whole dependency picture.
// This module also calls `ttCall` and reads `BACKEND`, both declared in earlier
// MODULES. A behavioural smoke test found that gap; it is closed here.
{
  const locals = APP_LOADER.parseScriptTags(INDEX)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  const owned = new Set(OWNERS.map((o) => o.name));
  const masked = maskLiterals(MODULE);
  const referenced = new Set();
  const idRe = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = idRe.exec(masked))) if (!owned.has(m[2])) referenced.add(m[2]);

  const fromModules = {};
  for (const rel of locals) {
    if (rel === MODULE_REL) continue;
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, {
    'js/api/backend-client.js': ['ttCall'],
    'js/config/backend-config.js': ['BACKEND'],
  }, 'it takes exactly two names from other modules: ttCall and BACKEND');

  // Both must already be defined when this module's own top-level code runs.
  // They are not read at evaluation time (§5 proves that), but the ORDER is what
  // makes every later call resolve, so it is pinned rather than assumed.
  const mine = locals.indexOf(MODULE_REL);
  for (const rel of Object.keys(fromModules)) {
    ok(locals.indexOf(rel) < mine,
      rel + ' loads before this module (position ' + locals.indexOf(rel) + ' of ' + mine + ')');
  }
  eq(locals.indexOf('js/api/backend-client.js'), 3, 'the backend client loads fourth');
  eq(locals.indexOf('js/config/backend-config.js'), 4, 'the backend config fifth');
  // And the module must NOT reach the network any other way.
  eq(refSites(masked, 'fetch').length, 0, 'it never calls fetch directly — every request goes through ttCall');
  eq(refSites(masked, 'XMLHttpRequest').length, 0, '…and never XMLHttpRequest');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Consumers — including three modules that load FIRST');
// ─────────────────────────────────────────────────────────────────────────────
{
  const inline = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const VIEWS = lexicalViews(inline);
  const found = {};
  let total = 0;
  for (const o of OWNERS) {
    const n = refSites(VIEWS.code, o.name).length;
    if (n) { found[o.name] = n; total += n; }
  }
  eq(found, INLINE_CONSUMERS, 'the inline monolith calls exactly these three owners');
  eq(total, INLINE_CONSUMER_TOTAL, 'ten references in all');
  let strings = 0;
  for (const o of OWNERS) strings += refSites(VIEWS.strings, o.name).length;
  eq(strings, 0, 'and no string or markup handler names an owner');
}
{
  const locals = APP_LOADER.parseScriptTags(INDEX)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  const owned = OWNERS.map((o) => o.name);
  const byModule = {};
  for (const rel of locals) {
    if (rel === MODULE_REL) continue;
    const src = maskLiterals(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    let n = 0;
    for (const name of owned) n += refSites(src, name).length;
    if (n) byModule[rel] = n;
  }
  eq(byModule, MODULE_CONSUMERS, 'three sibling modules reference an owner');

  // All three load BEFORE this module, which is safe only because every one of
  // those references is at call time. That is the claim; here is the proof.
  const myIndex = locals.indexOf(MODULE_REL);
  for (const rel of Object.keys(MODULE_CONSUMERS)) {
    ok(locals.indexOf(rel) < myIndex, rel + ' loads before this module');
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const masked = maskLiterals(src);
    const outside = outsideEveryDeclaration(src);
    for (const name of owned) {
      for (const i of refSites(masked, name)) {
        eq(outside(i), false, rel + ': its reference to ' + name + ' is inside a declaration');
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. State coupling, in both directions');
// ─────────────────────────────────────────────────────────────────────────────
{
  const inline = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const VIEWS = lexicalViews(inline);
  const ownVars = OWNERS.filter((o) => o.form === 'var').map((o) => o.name);
  eq(ownVars, ['_portfolioBackendSyncInFlight'], 'the module owns one mutable global');
  let inbound = 0;
  for (const n of ownVars) {
    for (const i of refSites(VIEWS.code, n)) if (isWriteAt(VIEWS.code, i, n)) inbound++;
  }
  eq(inbound, 0, 'INBOUND: nothing left in the monolith writes it');
  const globals = scanTopLevelDeclarations(inline).filter((d) => d.form === 'var').map((d) => d.name);
  eq(globals.length, 259, 'the monolith declares 259 mutable globals — down one, the var this module took');
  const owned = new Set(OWNERS.map((o) => o.name));
  const masked = maskLiterals(MODULE);
  let outbound = 0;
  const outNames = new Set();
  for (const n of globals) {
    if (owned.has(n)) continue;
    for (const i of refSites(masked, n)) if (isWriteAt(masked, i, n)) { outbound++; outNames.add(n); }
  }
  eq(outbound, 0, 'OUTBOUND: the module writes no global it does not own');
  eq(Array.from(outNames), [], '…and so there is no foreign name to list');
}
{
  const probe = maskLiterals('var _foreign = 1;\nfunction f(){ _foreign = 2; _foreign.x = 3; }\n');
  let n = 0;
  for (const i of refSites(probe, '_foreign')) if (isWriteAt(probe, i, '_foreign')) n++;
  eq(n, 3, 'CONTROL: the write rule sees all three writes when there are writes to see');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The block is gone from index.html');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.indexOf('// BACKEND-BACKED PORTFOLIOS — API client + sync'), -1,
  'the feature header left with the block');
eq(INDEX.indexOf(UNDO.MODULE_LAST_LINE.trim()), -1, 'so did the re-export that ended it');
for (const o of OWNERS) {
  const decl = (o.form === 'var' ? 'var ' : (o.isAsync ? 'async function ' : 'function ')) + o.name;
  eq(INDEX.indexOf('\n' + decl), -1, 'no declaration of ' + o.name + ' remains inline');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Production footprint');
// ─────────────────────────────────────────────────────────────────────────────
{
  const tracked = git(['ls-files', 'js/']).trim().split('\n').filter(Boolean);
  ok(tracked.includes(MODULE_REL), 'the module is tracked');
  eq(tracked.filter((f) => f.startsWith('js/portfolio/')).sort(),
    ['js/portfolio/backend-portfolios.js', 'js/portfolio/portfolio-data-fetch.js',
     'js/portfolio/portfolio-expiry-manual.js', 'js/portfolio/portfolio-traffic-light.js'],
    'js/portfolio holds exactly the four portfolio modules');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. The reverse transform');
// ─────────────────────────────────────────────────────────────────────────────
{
  const base = git(['show', BASE_SHA + ':index.html']);
  eq(UNDO.undoBackendPortfolios(INDEX, MODULE), base,
    'the undo reconstructs the pre-extraction document byte for byte');
  eq(sha256(UNDO.undoBackendPortfolios(INDEX, MODULE)), UNDO.BASE_SHA256, '…confirmed by hash');
  eq(UNDO.isApplied(INDEX), true, 'isApplied is true for the shipped document');
  eq(UNDO.isApplied(base), false, '…and false for the document that predates this layer');
}

// ─────────────────────────────────────────────────────────────────────────────
section('12. Fail-closed — every documented error, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'BACKEND_PORTFOLIOS_UNDO_';
  throwsWith(() => UNDO.undoBackendPortfolios(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX, MODULE.slice(0, -1)),
    P + 'MODULE_IDENTITY', 'a module one unit short');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX,
    MODULE.slice(0, -UNDO.MODULE_LAST_LINE.length) +
    'window.viewLinkedTradesInJournal = viewLinkedTradesInJournaX;\n '),
    P + 'MODULE_IDENTITY', 'a module whose last line was tampered with');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX,
    MODULE.slice(0, -UNDO.MODULE_LAST_LINE.length) +
    'window.viewLinkedTradesInJournal = viewLinkedTradesInJournaX;\n'),
    P + 'MODULE_SEPARATOR', 'a module of the right size that no longer ends on the pinned line');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX.replace(TAG, ''), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag removed');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    P + 'TAG_ADJACENCY', 'a document with the tag reordered');
  throwsWith(() => UNDO.undoBackendPortfolios(INDEX + ' ', MODULE),
    P + 'EXTRACTED_IDENTITY', 'a document with foreign content appended');
}

// ─────────────────────────────────────────────────────────────────────────────
section('13. Behavioural — the relocated code still runs');
// ─────────────────────────────────────────────────────────────────────────────
// Byte-exactness is proved by §11; this proves the bytes still WORK when loaded
// as a classic script. The stub is built from what the module actually
// references, not from guesswork: writing it wrong six times and the module
// zero is what surfaced the cross-module gap §6b now pins.
{
  const calls = [];
  const nodes = {};
  const el = (id) => ({ id, style: {}, _html: '', value: '',
    classList: { add() {}, remove() {}, toggle() {} },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; },
    appendChild() {}, addEventListener() {}, querySelector() { return null; },
    querySelectorAll() { return []; }, remove() {}, focus() {}, closest() { return null; } });
  const doc = {
    getElementById(id) { if (!nodes[id]) nodes[id] = el(id); return nodes[id]; },
    createElement(t) { return el(t); }, querySelector() { return null; },
    querySelectorAll() { return []; }, addEventListener() {}, body: el('body'),
  };
  const portfolios = [{ id: 'p1', name: 'Core' }, { id: 'p2', name: 'Hedge' }];
  const trades = [
    { id: 't1', portfolioId: 'p1', ticker: 'SPY', status: 'closed', pnl: 120 },
    { id: 't2', portfolioId: 'p2', ticker: 'QQQ', status: 'open', pnl: 0 },
    { id: 't3', portfolioId: 'gone', ticker: 'IWM', status: 'open', pnl: 0 },
  ];
  let ttCalls = [];
  const box = {
    console: { log() {}, warn() {}, error() {}, debug() {} },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, Date, Math, JSON, String, Number, Boolean, Array, Object,
    isNaN, parseFloat, parseInt, encodeURIComponent, decodeURIComponent,
    document: doc,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    BACKEND: 'https://backend.test',
    ttCall: async (p, o) => { ttCalls.push({ path: String(p), method: (o && o.method) || 'GET' });
      return { ok: true, portfolios }; },
    fetch: async () => { throw new Error('the module must not call fetch directly'); },
    S: { ttConnected: true, backendKey: 'k', portfolioData: {}, scanData: [] },
    _activeView: 'portfolio',
    _portfolioRiskDebugEnabled: () => false,
    isApexLocalDevEnv: () => false,
    showToast: (m) => calls.push(['showToast', String(m).slice(0, 40)]),
    showView: (v) => calls.push(['showView', v]),
    escHtml: (x) => String(x == null ? '' : x).replace(/[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    jStatBox: (a, b) => '<div>' + a + ':' + b + '</div>',
    portStat: (a, b) => '<div>' + a + ':' + b + '</div>',
    renderPortfolioJournalView: () => calls.push(['renderPortfolioJournalView']),
    _jSyncJournalFromBackend: async () => { calls.push(['jSync']); return true; },
    _updateStormBanner: () => calls.push(['storm']),
    portfolioManager: {
      getAll: () => portfolios.slice(),
      getById: (id) => portfolios.find((p) => p.id === id) || null,
      getSource: () => 'local', getLoadError: () => null,
      setLoadError: () => calls.push(['setLoadError']),
      setFromBackend: (l) => calls.push(['setFromBackend', (l || []).length]),
      upsertLocal: (p) => { calls.push(['upsertLocal', p && p.id]); return p; },
      removeLocalOnly: (id) => calls.push(['removeLocalOnly', id]),
    },
    journalManager: {
      getAll: () => trades.slice(),
      getOpenTrades: (pid) => trades.filter((t) => t.status === 'open' && (pid == null || t.portfolioId === pid)),
      getStats: (pid) => ({ totalPnL: pid === 'p1' ? 120 : 0, total: 1, closed: 1, open: 1 }),
      loadFromBackend: async () => true,
    },
  };
  box.window = box;
  box.globalThis = box;
  vm.createContext(box);
  vm.runInContext(MODULE, box, { filename: 'backend-portfolios.js' });

  eq(ttCalls.length, 0, 'loading issues no request');
  eq(calls.length, 0, '…and calls nothing at all');

  const done = [];
  const run = async () => {
    ttCalls = [];
    await box.backendListPortfolios();
    done.push(['GET', ttCalls.length === 1 && /portfolio/i.test(ttCalls[0].path)]);
    ttCalls = [];
    await box.backendCreatePortfolio({ name: 'New' });
    done.push(['POST', ttCalls.length === 1 && ttCalls[0].method === 'POST']);
    ttCalls = [];
    await box.backendDeletePortfolio('p1');
    done.push(['DELETE', ttCalls.length === 1 && ttCalls[0].method === 'DELETE']);
    ttCalls = [];
    await Promise.all([box._syncPortfoliosFromBackend(), box._syncPortfoliosFromBackend()]);
    done.push(['sync guards re-entry', ttCalls.length <= 1]);
  };
  // The synchronous paths first.
  box.renderPortfolioView();
  const html = Object.keys(nodes).map((k) => nodes[k]._html || '').join('');
  ok(/Core/.test(html) && /Hedge/.test(html), 'renderPortfolioView renders both portfolios');
  const rec = box.getPortfolioJournalReconciliation();
  ok(/gone|unassigned|orphan/i.test(JSON.stringify(rec)),
    'the reconciliation report still finds the trade whose portfolio is missing');

  // Then the async ones. The summary is printed from inside, so the process
  // cannot exit reporting success while a rejection is still pending.
  run().then(() => {
    for (const [name, okp] of done) ok(okp, 'behaviour: ' + name);
    eq(done.length, 4, 'four async paths were driven');
    console.log('\n' + pass + ' assertions passed.');
  }).catch((e) => {
    console.error('\nFAIL  behavioural: ' + e.message);
    process.exit(1);
  });
}
