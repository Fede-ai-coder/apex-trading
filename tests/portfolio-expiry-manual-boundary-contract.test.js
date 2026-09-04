'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// MANUAL EXPIRY RESOLUTION — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #424 opened. RELOCATION ONLY: the module is the
// block's bytes verbatim, and tests/lib/portfolio-expiry-manual-undo.js
// reconstructs the pre-extraction document byte for byte. §9 runs that round
// trip and §10 exercises every documented failure.
//
// WHAT IT WAS CHOSEN OVER. Audit #424's headline result was a REJECTION. The
// swing trading screen scored FOUR external edges over 242,294 units — the best
// coupling this programme has ever measured — and still cannot be extracted,
// because it performs `S.swing = { … }` at EVALUATION time and `S` is a `const`
// declared inside the inline monolith, which loads after every module. The same
// audit found the two screen defects that had hidden that: a column-0 banner
// rule blind to 83 indented banners, and an outbound check that scanned `var`
// only and so never tested `S`. Both now live in tests/lib/extraction-boundary.js
// as executable rules with their own contract.
//
// THIS REGION IS WHAT SURVIVED THE CORRECTED SCREEN:
//
//     ZERO external executable edges — nothing left inline calls an owner
//     ZERO top-level statements
//     ZERO coupling in both directions, checked against every binding the
//          monolith declares — var, const and let alike
//     TWO handlers, both of which stay behind and keep working: one static in
//     index.html, one built into generated markup by the monolith
//
// The zero external edges is what is unusual: of the regions this programme has
// audited, trade-detail had two, portfolio four, backend-portfolios ten. No
// claim is made about the layers whose audits did not measure this metric.
//
// LOADING IN AN EMPTY VM IS NOT WHAT MAKES IT SPECIAL, and an earlier draft of
// this header implied it was. SIXTEEN of the eighteen shipped modules load in a
// completely empty VM; only backend-portfolios (which re-exports onto `window`)
// and journal-backend-write-through do not. §4 asserts the property because it
// is the one the swing block failed — that block needed `S`, a const declared
// inside the monolith, and died without it — not because it is rare.
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
} = require('./lib/eic-contract-guards.js');
const { isBlankOrComment, snapBodyEnd, assertSeam, bindingNames } =
  require('./lib/extraction-boundary.js');
const UNDO = require('./lib/portfolio-expiry-manual-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-expiry-manual.js';
const TAG = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/backend-portfolios.js"></script>\n';
const INLINE_OPEN = '<script>';

const BASE_SHA = '177622e993009847b6ed530dc30126f70f11b2c5';
// Ratchet. The temporary audit is replaced ONE FOR ONE by this contract, so the
// count does not move: the undo helper is not a .test.js file.
const TEST_FILE_COUNT = 145;
const LOCAL_SCRIPT_COUNT = 62;
const AUDIT_REL = 'tests/temporary-portfolio-expiry-manual-boundary-audit.test.js';

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
const MARKUP_HANDLER = 'onclick="if(event.target===this)_pfExpiryManualClose()"';
// The monolith builds this one into generated HTML. It is a string, not an
// executable reference, so it is invisible to an edge count — and it is how the
// modal is actually opened, so the contract pins it.
const GENERATED_HANDLER = 'onclick="_pfExpiryResolveManual(';
const BANNER = '// ── Manual expiry resolution (ITM/UNKNOWN expired legs) ──────────';

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
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');

console.log('MANUAL EXPIRY RESOLUTION — PERMANENT BOUNDARY CONTRACT');

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document and the module');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'index.html is the extracted document');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…confirmed by hash');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is 8,769 units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…confirmed by hash');
eq(APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src)).length,
  LOCAL_SCRIPT_COUNT, 'sixty-two local application scripts');
ok(INDEX.indexOf('\r') < 0, 'the document is LF-only');
eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => /\.test\.js$/.test(f)).length,
  TEST_FILE_COUNT, 'the suite is 145 test files — the audit was replaced one for one');
ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)), 'the temporary audit is gone, replaced by this contract');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The seam, through the shared rule');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE.slice(-2), '}\n', 'the module ends `}\\n`');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line, so git diff --check stays clean');
{
  const lineStart = MODULE.lastIndexOf('\n', MODULE.length - 2) + 1;
  eq(isBlankOrComment(MODULE.slice(lineStart)), false, 'its last line is code');
  eq(snapBodyEnd(MODULE, 0, MODULE.length), MODULE.length,
    'the shared snap takes the whole module — it is a complete region');
}
{
  const base = git(['show', BASE_SHA + ':index.html']);
  eq(base.length, UNDO.BASE_CHARS, 'the base document is the pinned one');
  eq(sha256(base), UNDO.BASE_SHA256, '…confirmed by hash');
  eq(assertSeam(base, UNDO.RAW_AT, UNDO.RAW_END - 1), UNDO.RAW_END,
    'assertSeam accepts the boundary and returns the pinned raw end');
  eq(base.slice(UNDO.RAW_AT, UNDO.RAW_END), MODULE + UNDO.SEPARATOR,
    'raw === module body + exactly one LF');
  eq(base.slice(UNDO.RAW_AT - 3, UNDO.RAW_AT), '}\n\n', 'it opened after a `}\\n\\n` seam');
  eq(base.slice(UNDO.RAW_END - 3, UNDO.RAW_END), '}\n\n', 'and closed on one');
  eq(MODULE.slice(0, BANNER.length), BANNER, 'the module opens on the banner the block carried');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. The tag, and where it loads');
// ─────────────────────────────────────────────────────────────────────────────
eq(countLiteral(INDEX, TAG), 1, 'exactly one tag for this module');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG), 1, 'it follows the #423 backend-portfolios tag immediately');
eq(countLiteral(INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1,
  '…and the inline monolith opens immediately after it');
{
  const locals = APP_LOADER.parseScriptTags(INDEX).filter((t) => t.src && /^\.\//.test(t.src));
  eq(locals[locals.length - 1].src, './js/portfolio/portfolio-expiry-manual.js',
    'it is the LAST local script — pinned by identity, not by index');
  eq(locals[locals.length - 2].src, './js/portfolio/backend-portfolios.js',
    'and the one before it is the #423 module');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Owners, and a load that needs NOTHING');
// ─────────────────────────────────────────────────────────────────────────────
eq(scanTopLevelDeclarations(MODULE).map((d) => ({
  name: d.name, form: d.form, isAsync: !!d.isAsync, chars: d.chars })), OWNERS,
  'the module owns exactly these four declarations');
eq(OWNERS.filter((o) => o.isAsync).length, 0, 'none is async');
eq(OWNERS.reduce((a, o) => a + o.chars, 0), OWNER_SPAN_SUM,
  'the owner spans sum to 8,556 of 8,769');
{
  const outside = outsideEveryDeclaration(MODULE);
  let statements = 0, off = 0;
  for (const line of MODULE.split('\n')) {
    if (line.trim() && outside(off) && !isBlankOrComment(line)) statements++;
    off += line.length + 1;
  }
  eq(statements, 0, 'it carries NO top-level statement at all');
}
{
  // No window stub, no globals — nothing. This is the property the swing block
  // lacked, and the reason this region could be taken and that one could not.
  const box = {};
  vm.createContext(box);
  let err = null;
  try { vm.runInContext(MODULE, box, { filename: 'expiry.js' }); } catch (e) { err = e.message; }
  eq(err, null, 'it loads cleanly in a COMPLETELY empty VM');
  eq(Object.keys(box).sort(), OWNERS.map((o) => o.name).sort(),
    '…defining its four owners and nothing else');

  // And the header's scope, measured rather than asserted: this is common, not
  // rare. Stating it as a distinction is what an earlier draft got wrong.
  const CHAIN = [
    'js/services/journal-core.js', 'js/services/mcx-regime-policy.js', 'js/ui/journal-ui.js',
    'js/services/journal-remote-persistence.js', 'js/services/journal-backend-write-through.js',
    'js/services/journal-migration.js', 'js/services/journal-manual-import.js',
    'js/ui/journal-backup-restore.js', 'js/ui/mcx-macro-check.js', 'js/ui/mcx-charts.js',
    'js/services/apex-post-auth-init.js', 'js/ui/tt-reconnect.js', 'js/ui/journal-close-legs.js',
    'js/ui/journal-trade-forms.js', 'js/ui/journal-trade-detail.js',
    'js/portfolio/portfolio-data-fetch.js', 'js/portfolio/backend-portfolios.js', MODULE_REL,
  ];
  eq(CHAIN.length, 18, 'the chain is eighteen shipped modules');
  const needSomething = [];
  for (const rel of CHAIN) {
    const b = {};
    vm.createContext(b);
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), b, { filename: 'x.js' }); }
    catch (e) { needSomething.push(rel); }
  }
  eq(needSomething, ['js/services/journal-backend-write-through.js',
    'js/portfolio/backend-portfolios.js'],
    'only TWO of the eighteen need anything at load — so a bare load is the norm here');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. Dependencies — all read at call time');
// ─────────────────────────────────────────────────────────────────────────────
const INLINE = APP_LOADER.parseScriptTags(INDEX).filter((t) => !t.src && t.inline.length > 1000);
eq(INLINE.length, 1, 'there is exactly one inline application script');
const CODE = INLINE[0].inline;
const MONOLITH = scanTopLevelDeclarations(CODE);
{
  const owned = new Set(OWNERS.map((o) => o.name));
  const names = new Set(MONOLITH.map((d) => d.name));
  const masked = maskLiterals(MODULE);
  const found = [];
  const seen = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) {
    const n = m[2];
    if (owned.has(n) || !names.has(n) || seen.has(n)) continue;
    seen.add(n); found.push(n);
  }
  eq(found.sort(), DEPENDENCIES, 'it depends on exactly these six monolith names');
  const outside = outsideEveryDeclaration(MODULE);
  let callTime = 0, evalTime = 0;
  for (const n of DEPENDENCIES) for (const i of refSites(masked, n)) (outside(i) ? evalTime++ : callTime++);
  eq(evalTime, 0, 'not one is read at evaluation time');
  eq(callTime, DEPENDENCY_REFS_CALL_TIME, 'and all 18 references sit inside a declaration');
}
{
  // It takes nothing from any sibling module either — unlike #423, which needed
  // ttCall and BACKEND. Measured, so a future edit that introduces one fails.
  const locals = APP_LOADER.parseScriptTags(INDEX)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  const owned = new Set(OWNERS.map((o) => o.name));
  const masked = maskLiterals(MODULE);
  const referenced = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) if (!owned.has(m[2])) referenced.add(m[2]);
  const fromModules = {};
  for (const rel of locals) {
    if (rel === MODULE_REL) continue;
    for (const d of scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'))) {
      if (referenced.has(d.name)) (fromModules[rel] = fromModules[rel] || []).push(d.name);
    }
  }
  eq(fromModules, {}, 'it takes NO name from any sibling module');
  // `{}` is what a broken scanner returns too, so pin what the scan actually
  // saw: a known dependency must be in the reference set.
  ok(referenced.has('portfolioExpiry'),
    '…and the scan really did see the module’s names — portfolioExpiry is among them');
  ok(referenced.size > 5, '…on a reference set of real size, not a stray undefined');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. Consumers — none in code, one in markup');
// ─────────────────────────────────────────────────────────────────────────────
{
  const VIEWS = lexicalViews(CODE);
  let ext = 0;
  for (const o of OWNERS) ext += refSites(VIEWS.code, o.name).length;
  eq(ext, 0, 'NOTHING left in the monolith references an owner');
  // But the monolith BUILDS one handler into generated markup. That is not an
  // executable edge — which is why the audit's zero was right — and it is a real
  // consumer all the same, so it is pinned by name and by content.
  const inStrings = {};
  for (const o of OWNERS) {
    const n = refSites(VIEWS.strings, o.name).length;
    if (n) inStrings[o.name] = n;
  }
  eq(inStrings, { _pfExpiryResolveManual: 1 },
    'exactly one owner is named inside a string the monolith builds');
  ok(CODE.indexOf(GENERATED_HANDLER) >= 0,
    '…in the generated onclick that opens the modal from a position row');
  eq(countLiteral(CODE, GENERATED_HANDLER), 1, 'and it is built in exactly one place');

  const locals = APP_LOADER.parseScriptTags(INDEX)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  let siblings = 0;
  for (const rel of locals) {
    if (rel === MODULE_REL) continue;
    const src = maskLiterals(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    for (const o of OWNERS) siblings += refSites(src, o.name).length;
  }
  eq(siblings, 0, 'and no sibling module calls one');

  // The whole feature is reached from ONE static markup handler. Not masked:
  // in HTML the handler lives inside a quoted attribute, so masking literals
  // would erase exactly the thing being counted.
  const codeAt = INDEX.indexOf(CODE);
  const outsideInline = INDEX.slice(0, codeAt) + INDEX.slice(codeAt + CODE.length);
  let markup = 0;
  for (const o of OWNERS) markup += refSites(outsideInline, o.name).length;
  eq(markup, 1, 'exactly one reference lives in the markup');
  ok(INDEX.indexOf(MARKUP_HANDLER) >= 0, '…the modal overlay’s own close handler');
  ok(INDEX.indexOf(MARKUP_HANDLER) < codeAt, 'which sits above the inline script');
  // It resolves because a classic script defines a global function.
  ok(/^function _pfExpiryManualClose\(/m.test(MODULE) ||
     MODULE.indexOf('function _pfExpiryManualClose(') >= 0,
    'and the module declares that function at top level, so the handler still resolves');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. State coupling, in both directions, against ALL bindings');
// ─────────────────────────────────────────────────────────────────────────────
{
  const BINDINGS = bindingNames(MONOLITH);
  ok(BINDINGS.length > MONOLITH.filter((d) => d.form === 'var').length,
    'the shared rule scans const and let as well as var — the #424 correction');
  const owned = new Set(OWNERS.map((o) => o.name));
  const VIEWS = lexicalViews(CODE);
  const ownVars = OWNERS.filter((o) => o.form === 'var').map((o) => o.name);
  eq(ownVars, ['_manualExpiryPortfolioId'], 'the module owns one mutable global');
  let inbound = 0;
  for (const n of ownVars) for (const i of refSites(VIEWS.code, n)) if (isWriteAt(VIEWS.code, i, n)) inbound++;
  eq(inbound, 0, 'INBOUND: nothing left in the monolith writes it');
  const mb = maskLiterals(MODULE);
  let outbound = 0;
  const outNames = new Set();
  for (const n of BINDINGS) {
    if (owned.has(n)) continue;
    for (const i of refSites(mb, n)) if (isWriteAt(mb, i, n)) { outbound++; outNames.add(n); }
  }
  eq(outbound, 0, 'OUTBOUND: it writes no binding it does not own');
  eq(Array.from(outNames), [], '…and so there is no foreign name to list');
  ok(BINDINGS.indexOf('S') >= 0, 'and S — the const the old rule never tested — is in the scanned set');
}
{
  const probe = maskLiterals('const _c = {};\nfunction f(){ _c.x = 1; }\n');
  let n = 0;
  for (const i of refSites(probe, '_c')) if (isWriteAt(probe, i, '_c')) n++;
  eq(n, 2, 'CONTROL: a write through a const binding is detected');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. The block is gone from index.html');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.indexOf(BANNER), -1, 'the banner left with the block');
for (const o of OWNERS) {
  const decl = (o.form === 'var' ? 'var ' : 'function ') + o.name;
  eq(CODE.indexOf('\n' + decl), -1, 'no declaration of ' + o.name + ' remains inline');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The reverse transform');
// ─────────────────────────────────────────────────────────────────────────────
{
  const base = git(['show', BASE_SHA + ':index.html']);
  eq(UNDO.undoPortfolioExpiryManual(INDEX, MODULE), base,
    'the undo reconstructs the pre-extraction document byte for byte');
  eq(UNDO.isApplied(INDEX), true, 'isApplied is true for the shipped document');
  eq(UNDO.isApplied(base), false, '…and false for the document that predates this layer');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. Fail-closed — every documented error, by its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const P = 'PORTFOLIO_EXPIRY_MANUAL_UNDO_';
  throwsWith(() => UNDO.undoPortfolioExpiryManual(null, MODULE), P + 'BAD_INPUT', 'a non-string document');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX, null), P + 'BAD_INPUT', 'a non-string module');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX, MODULE.slice(0, -1)),
    P + 'MODULE_IDENTITY', 'a module one unit short');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX, MODULE + '\n'),
    P + 'MODULE_IDENTITY', 'a module that absorbed the separator');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX, MODULE.slice(0, -2) + ';\n'),
    P + 'MODULE_SEPARATOR', 'a module of the right size that no longer ends `}\\n`');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX.replace(TAG, ''), MODULE),
    P + 'TAG_IDENTITY', 'a document with the tag removed');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
    P + 'TAG_ADJACENCY', 'a document with the tag reordered');
  throwsWith(() => UNDO.undoPortfolioExpiryManual(INDEX + ' ', MODULE),
    P + 'EXTRACTED_IDENTITY', 'a document with foreign content appended');
}

// ─────────────────────────────────────────────────────────────────────────────
section('11. Production footprint');
// ─────────────────────────────────────────────────────────────────────────────
{
  const tracked = git(['ls-files', 'js/portfolio/']).trim().split('\n').filter(Boolean);
  eq(tracked.sort(), ['js/portfolio/backend-portfolios.js', 'js/portfolio/portfolio-data-fetch.js',
    'js/portfolio/portfolio-expiry-manual.js'],
    'js/portfolio holds exactly the three portfolio modules');
}

console.log('\n' + pass + ' assertions passed.');
