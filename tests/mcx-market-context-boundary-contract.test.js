'use strict';

// ══════════════════════════════════════════════════════════════════════════
// MCX PR 1 — market-context extraction boundary contract.
//
// The MCX (market-context) family in the inline monolith is several distinct
// clusters: the backend-snapshot/technical-summary service, the chart+table
// renderer, the backend candle cache, the regime rules and the feature flags.
// This PR extracts exactly ONE of them — the snapshot service — into
// js/services/mcx-market-context.js, and nothing else. The chart family, the
// candle cache, the regime rules and the flags stay inline ON PURPOSE and are
// pinned here as still-inline so that a later PR cannot quietly widen this one.
//
// The move is MECHANICAL and is proved against the pinned base document rather
// than described: the owner must be the exact base bytes, the index must be the
// exact transform of the base, and undoing the transform must reproduce the base
// byte for byte. Unlike every earlier link in this repository's chain, the family
// is NOT contiguous — _mcxFiniteNum sits ~7 KB above the rest — so the transform
// is two cuts, and both are pinned individually rather than approximated by one
// loose span. A behavioural transcript is compared BASE-slices vs HEAD-module so
// that "no behaviour changed" is measured, not asserted.
// ══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// The merge commit of PR #385. A commit, never a branch tip: a branch tip is a
// moving target and every offset, hash and slice below addresses this document.
const BASE_SHA = '34bc48ae33bf3b0044572457615f7e6efda547c0';
const MODULE_REL = 'js/services/mcx-market-context.js';
const MODAL_REL = 'js/ui/pretrade-risk-modal.js';
const MODAL_TAG = '<script src="./js/ui/pretrade-risk-modal.js"></script>\n';
const TAG = '<script src="./js/services/mcx-market-context.js"></script>\n';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';

// The owner manifest, in the order the module declares them. Span A is the lone
// helper; span B is the other nine.
const SPAN_A = ['_mcxFiniteNum'];
const SPAN_B = [
  '_mcxApplyBackendSnapshot',
  '_mcxUpdateSnapshotStatus',
  '_mcxBackendTech',
  '_mcxFormatTechValue',
  '_mcxTechBiasLabel',
  '_mcxPriceVsSmaLabel',
  '_mcxSqueezeLabel',
  '_mcxRenderBackendTechnicalSummary',
  '_mcxRefreshVixData',
];
const MANIFEST = SPAN_A.concat(SPAN_B);

// The two cuts, pinned as base offsets. A_* is the helper's own line; B_* is the
// family's comment header plus its nine declarations.
const A_AT = 208421, A_CHARS = 73;          // slice; the cut also took the blank line after it
const B_AT = 215538, B_CHARS = 14138;       // slice; the cut also took one newline before and the blank line after
const JOINER = '\n\n';
const EXPECTED_MODULE_CHARS = A_CHARS + JOINER.length + B_CHARS;   // 14213

// Call-time dependencies that STAY inline. Copying or moving any of these is the
// mistake this PR is most likely to make by accident, so each is pinned by owner:
// still declared exactly once inline, never declared in the owner, still read by
// the owner. Each is genuinely owned by another family — every one of them has
// callers outside MCX, which is why the boundary runs where it does.
// These four are owned by another family AND still have inline callers that are
// not this owner, which is the reason the boundary runs where it does.
const SHARED_INLINE_DEPS = [
  'fetchMarketContextSnapshotFromBackend', // backend market-context fetch family
  '_applyFreshVixFamily',                  // VIX-family freshness guard
  '_ensureVixFamily',                      // VIX-family dedupe
  '_mcxDrawVixCurve',                      // MCX CHART family — deliberately not extracted
];
// The feature flag is different and is pinned differently on purpose: after this
// extraction the owner is its ONLY consumer, so "it has other callers" would be
// false. What makes it another family's is that it is one of the fourteen ff*
// flags declared together inline — so the assertion below is that the whole flag
// cluster stayed inline and intact, not that someone else calls it.
const FLAG_DEP = 'ffMcxBackendSnapshot';
const INLINE_FF_DECLS = 14;
const INLINE_DEPS = [FLAG_DEP].concat(SHARED_INLINE_DEPS);

// MCX declarations that are deliberately LEFT inline. These name the adjacent
// clusters this extraction must not swallow.
const NOT_EXTRACTED = [
  '_mcxRenderCharts', '_mcxDrawOne', '_mcxDrawRsi', '_mcxDrawVixCurve', '_mcxUpdateTable',
  '_mcxRegimeOf', '_mcxRenderSpySqzBadge', '_mcxSpy1dSma20Rising', '_mcxRenderSma20DefenseRule',
  '_mcxInit', '_mcxRefresh', '_mcxRedraw', '_mcxStartAutoRefresh', '_mcxStopAutoRefresh',
  '_mcxGetBackendCandleEntry', '_mcxGetCachedBackendCandles', '_mcxStoreBackendCandleEntry',
  '_mcxCandlesLookStale', '_mcxFetchBackendCandlesForChart', '_mcxNewestBarTime',
  '_mcxOnCandleTick', '_mcxLiveDrawOne', '_mcxStopLiveUpdates', '_mcxAttachResizeObserver',
  '_mcxVi3mSym', '_mcxTechCtx', '_mcxSqzToast', '_mcxCheckSqz', '_mcxSpySqzBadgeHtml',
  '_mcxStopPolls', '_mcxRunMacroCheck', 'ffMcxBackendSnapshot', 'ffBackendCandlesMcxCharts',
];
// The inline MCX top-level declaration count, before and after. A ratchet, so a
// later PR that pastes any of them back inline fails here.
const MCX_INLINE_DECLS_BASE = 57;
const MCX_INLINE_DECLS_HEAD = 47;

// The three application callsites, pinned verbatim from the base document.
const CALLSITES = [
  '  _mcxRenderSpySqzBadge(); // update MCX VIX block badge after ctxMap is fully built\n  _mcxRenderBackendTechnicalSummary();\n}',
  "  var tsEl = document.getElementById('mcx-ts');\n  if (tsEl) tsEl.textContent = 'Refreshing…';\n  var p = _mcxRefreshVixData();",
  '  // post-login VIX-family prefetch fills S.vixFamily with DXLink data and the\n  // backend snapshot then never runs.\n  _mcxRefreshVixData();',
];

// The DOM ids this family owns. The extraction must not have widened its DOM
// surface, so the set is pinned exactly.
const OWNED_DOM_IDS = ['mcx-ts', 'mcx-snapshot-src', 'mcx-backend-tech-summary'];
// The S.marketContextSnapshot fields the family writes. Same reasoning.
const OWNED_STATE_WRITES = [
  'data', 'error', 'pending', 'regimeSummary', 'source', 'technicals',
  'termShape', 'updatedAt', 'vixSource', 'volatilityBucket',
];

let pass = 0, fail = 0;
function ok(v, msg) { if (v) pass++; else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + (a === b ? '' : ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')')); }
function same(a, b, msg) { eq(JSON.stringify(a), JSON.stringify(b), msg); }
function section(s) { console.log('\n' + s); }
function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(src, needle) { let n = 0, p = 0; while ((p = src.indexOf(needle, p)) >= 0) { n++; p += needle.length; } return n; }
function isIdent(c) { return !!c && /[A-Za-z0-9_$]/.test(c); }
function skipQuoted(src, i) {
  const q = src[i];
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === q) return j;
  }
  return src.length - 1;
}
function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { i += 2; while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { i = skipQuoted(src, i); continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
// Declaration finder, not a regex: a regex over a 2 MB document matches text in
// strings, comments and unrelated identifiers. This walks to the real body.
function findFunctionFrom(src, name, from) {
  for (const sig of ['async function ' + name + '(', 'function ' + name + '(']) {
    let p = src.indexOf(sig, from || 0);
    while (p >= 0) {
      if (!isIdent(p ? src[p - 1] : '')) {
        const open = src.indexOf('{', p), end = matchBrace(src, open);
        if (open < 0 || end < 0) return null;
        return { name, start: p, end: end + 1, text: src.slice(p, end + 1) };
      }
      p = src.indexOf(sig, p + 1);
    }
  }
  return null;
}
function findFunction(src, name) { return findFunctionFrom(src, name, 0); }
// Advances past the matched BODY, not past its first character: `async function X(`
// contains `function X(` six characters in, so a start+1 walk counts one async
// declaration twice. Stepping to d.end still finds a genuine second top-level
// declaration, so this is exact rather than lenient.
function countDeclarations(src, name) {
  let n = 0, from = 0, d;
  while ((d = findFunctionFrom(src, name, from))) { n++; from = d.end; }
  return n;
}
function topLevelNames(src) {
  const out = [], re = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:var|const|let)\s+([A-Za-z_$][\w$]*)/gm;
  let m; while ((m = re.exec(src))) out.push(m[1] || m[2]);
  return out;
}
function mcxTopLevelDeclCount(src) {
  return topLevelNames(src).filter((n) => /mcx/i.test(n)).length;
}
function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inLine) { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inS) { out += c; if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

// The whole transform, DERIVED from the base rather than described. Two cuts,
// then one classic tag added directly after the risk-modal owner.
function transformFromBase(base) {
  const a = findFunction(base, SPAN_A[0]);
  const first = findFunction(base, SPAN_B[0]);
  const last = findFunction(base, SPAN_B[SPAN_B.length - 1]);
  if (!a || !first || !last) throw new Error('missing base targets');
  if (!(a.end < first.start && first.start < last.start)) throw new Error('unexpected base ordering');
  const sliceA = base.slice(a.start, a.end);
  // Span B opens at the family's comment header, which is the run of comment
  // lines directly above the first declaration — located from the base, not
  // hardcoded, so a shifted comment is a failure rather than a silent re-pin.
  let bStart = first.start;
  while (bStart > 0) {
    const lineStart = base.lastIndexOf('\n', bStart - 2) + 1;
    if (!/^\s*\/\//.test(base.slice(lineStart, bStart))) break;
    bStart = lineStart;
  }
  const sliceB = base.slice(bStart, last.end);
  const module = sliceA + JOINER + sliceB;
  // Cut A takes the declaration plus the blank line after it; cut B takes the
  // newline before the comment header plus the blank line after the family.
  const cutA = { start: a.start, end: a.end + 2 };
  const cutB = { start: bStart - 1, end: last.end + 2 };
  if (base.slice(cutA.start, cutA.end) !== sliceA + '\n\n') throw new Error('cut A shape');
  if (base.slice(cutB.start, cutB.end) !== '\n' + sliceB + '\n\n') throw new Error('cut B shape');
  let index = base.slice(0, cutA.start) + base.slice(cutA.end, cutB.start) + base.slice(cutB.end);
  if (count(index, MODAL_TAG) !== 1) throw new Error('risk-modal tag identity at base');
  index = index.replace(MODAL_TAG, MODAL_TAG + TAG);
  return { a, first, last, sliceA, sliceB, module, index, cutA, cutB, bStart };
}

const base = execFileSync('git', ['show', BASE_SHA + ':index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
// THE DOCUMENT THIS CONTRACT PINS is index.html as THIS extraction left it.
// The MCX VIX extraction (PR #389) has since been cut against that document,
// so it is undone first — newest-first — restoring the exact post-#386 index
// that every offset, hash, slice and mutant below addresses. The helper
// re-verifies what it hands back by length and SHA-256, so this hop is proved
// rather than assumed, and the assertions below keep meaning exactly what they
// meant before PR #389 existed: this stays a proof of PR #386.
const MCX_UNDO3 = require('./lib/mcx-pr3-undo.js');
const POST_JOURNAL_MCX3_UNDO = require('./lib/post-journal-mcx-pr3-undo.js');
const MCX_UNDO2 = require('./lib/mcx-pr2-undo.js');
const liveIndex = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const at392 = MCX_UNDO3.isApplied(liveIndex)
  ? POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(liveIndex, fs.readFileSync(path.join(ROOT,'js/services/mcx-backend-candles.js'),'utf8'))
  : liveIndex;
const index = MCX_UNDO2.isApplied(at392)
  ? MCX_UNDO2.undoMcxPr2(at392, fs.readFileSync(path.join(ROOT, 'js/services/mcx-vix-market-context.js'), 'utf8'))
  : at392;
const moduleSrc = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const modalSrc = fs.readFileSync(path.join(ROOT, MODAL_REL), 'utf8');
const baseModal = execFileSync('git', ['show', BASE_SHA + ':' + MODAL_REL], { cwd: ROOT, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
const expected = transformFromBase(base);

section('1. pinned base identity and the two source slices taken from it');
eq(execFileSync('git', ['rev-parse', BASE_SHA + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim(), BASE_SHA, 'BASE_SHA resolves to a real commit, not an abbreviation or a tag');
eq(base.length, 2095406, 'pinned base index.html is exactly 2,095,406 chars');
eq(digest(base), '49eb76955bcb0abf2c223276a53805ef9c761a88b39255acbb297c2baf325357', 'pinned base index.html SHA-256 is the recorded one');
for (const name of MANIFEST) eq(countDeclarations(base, name), 1, name + ' is declared exactly once in the base monolith');
eq(expected.a.start, A_AT, 'span A start offset in the base document is pinned');
eq(expected.a.end - expected.a.start, A_CHARS, 'span A is exactly 73 chars');
eq(expected.bStart, B_AT, 'span B start offset in the base document is pinned');
eq(expected.sliceB.length, B_CHARS, 'span B is exactly 14,138 chars');
eq(digest(expected.sliceA), '8acf64fbbcf084c9dbdfa5051b07f12a0c5cf7f2c3f58d5d46e32c106daafc2f', 'span A SHA-256 is the recorded one');
eq(digest(expected.sliceB), 'bf93da90ca861f678884fdcb5aa037142252b3c5f5efb7a99aea28b8d816def9', 'span B SHA-256 is the recorded one');
// The two spans are genuinely NON-CONTIGUOUS: if they ever became adjacent the
// transform would be a single cut and this contract would be over-complicated
// for the job — that is a change worth failing on.
ok(expected.a.end + 2 < expected.bStart, 'the two spans are non-contiguous in the base — the two-cut transform is the right shape');
eq(base.slice(expected.a.end, expected.a.end + 2), '\n\n', 'span A is followed by exactly one blank line at the base');
eq(base.slice(expected.last.end, expected.last.end + 2), '\n\n', 'span B is followed by exactly one blank line at the base');

section('2. exact owner manifest and byte identity');
same(topLevelNames(moduleSrc), MANIFEST, 'the owner declares exactly the ten intended top-level bindings, in order');
let declChars = 0;
for (const name of MANIFEST) {
  const b = findFunction(base, name), m = findFunction(moduleSrc, name), i = findFunction(index, name);
  ok(!!b, name + ' exists at pinned base');
  ok(!!m, name + ' exists in the market-context owner');
  ok(!i, name + ' is absent inline');
  eq(countDeclarations(moduleSrc, name), 1, name + ' is declared exactly once in the owner');
  eq(countDeclarations(index, name), 0, name + ' is declared zero times in index.html');
  if (b && m) { eq(m.text, b.text, name + ' declaration is byte-identical to the base'); declChars += m.text.length; }
}
eq(moduleSrc.length, EXPECTED_MODULE_CHARS, 'owner file is exactly 14,213 chars');
eq(moduleSrc, expected.module, 'the whole owner is span A + the pinned joiner + span B, byte for byte');
eq(moduleSrc.slice(0, A_CHARS), expected.sliceA, 'the owner opens with the exact base span A');
eq(moduleSrc.slice(A_CHARS, A_CHARS + JOINER.length), JOINER, 'the two spans are joined by exactly one blank line');
eq(moduleSrc.slice(A_CHARS + JOINER.length), expected.sliceB, 'the owner continues with the exact base span B');
eq(digest(moduleSrc), '0b11f9ae056f85c9ab4987f945609db7f33960516a6e18794e86f61819f306a0', 'owner SHA-256 is the recorded one');
// Nothing executable hides between the declarations: cut all ten out and only
// comments and whitespace are left.
let residue = moduleSrc, cutOut = 0;
for (const name of MANIFEST.slice().reverse()) {
  const d = findFunction(residue, name);
  residue = residue.slice(0, d.start) + residue.slice(d.end);
  cutOut++;
}
eq(cutOut, MANIFEST.length, 'all ten declarations were located for the residue check');
eq(stripComments(residue).trim(), '', 'outside the ten declarations the owner file is comments and whitespace only');

section('3. MCX residual ratchet, and the clusters this PR must NOT swallow');
eq(mcxTopLevelDeclCount(base), MCX_INLINE_DECLS_BASE, 'the base monolith carried 57 MCX top-level declarations');
eq(mcxTopLevelDeclCount(index), MCX_INLINE_DECLS_HEAD, 'the monolith now carries 47 — exactly ten fewer');
eq(MCX_INLINE_DECLS_BASE - MCX_INLINE_DECLS_HEAD, MANIFEST.length, 'the drop is exactly the size of this owner: no more, no less');
for (const n of NOT_EXTRACTED) {
  ok(!!findFunction(index, n), 'deliberately NOT extracted, still inline: ' + n);
  eq(countDeclarations(moduleSrc, n), 0, 'the adjacent MCX cluster was not swallowed: ' + n + ' is absent from the owner');
}

section('4. mechanical transform, load order and classic-script semantics');
eq(index, expected.index, 'index equals the exact mechanical two-cut transform of the pinned base');
eq(index.length, 2081250, 'index.html is exactly 2,081,250 chars');
eq(base.length - index.length, (expected.cutA.end - expected.cutA.start) + (expected.cutB.end - expected.cutB.start) - TAG.length, 'the index shrank by exactly the two cuts less the one added tag');
eq(count(index, TAG), 1, 'the owner tag occurs exactly once');
eq(count(index, './js/services/mcx-market-context.js'), 1, 'the owner path appears exactly once in the whole document');
eq(count(index, MODAL_TAG), 1, 'the risk-modal owner tag still occurs exactly once');
const modalAt = index.indexOf(MODAL_TAG), tagAt = index.indexOf(TAG);
const inlineOpen = index.indexOf(INLINE_OPEN, tagAt);
ok(modalAt >= 0 && tagAt === modalAt + MODAL_TAG.length, 'the owner loads immediately after the PRETRADE risk-modal owner');
ok(inlineOpen === tagAt + TAG.length, 'the owner loads immediately before the inline monolith');
ok(modalAt < tagAt && tagAt < inlineOpen, 'load order is risk modal -> market context -> monolith');
eq(index.slice(tagAt, tagAt + TAG.length), TAG, 'the load tag is the exact classic src-only form');
ok(!/<script[^>]*mcx-market-context[^>]*(defer|async|type=)/.test(index), 'the owner tag carries no defer, async or type attribute');
// Load-order safety measured, not assumed: nothing the owner needs is resolved
// at evaluation time, and every consumer of the owner runs later in the document.
for (const n of MANIFEST) {
  const at = index.indexOf(n + '(');
  ok(at < 0 || at > inlineOpen, 'every remaining reference to ' + n + ' is inside the inline monolith, which loads after the owner');
}

section('5. no wrapper, no load-time side effect, no new dependency');
const bare = stripComments(moduleSrc);
for (const token of ['import', 'export', 'require', 'module.exports', 'define(', '__esModule']) {
  ok(bare.indexOf(token) < 0, 'the owner introduces no ' + token);
}
ok(!/^\s*['"]use strict['"]/.test(bare), 'the owner adds no strict-mode pragma the inline monolith did not have');
ok(!/^\s*\(function/.test(bare), 'the owner adds no IIFE wrapper');
// Empirical: evaluate the owner with NO document, NO window, NO helpers. A file
// that touched anything at load time would throw here; a file that defined
// anything extra would show up in the sandbox key diff.
const probe = {};
vm.createContext(probe);
const before = Object.keys(probe).sort();
let loadError = null;
try { vm.runInContext(moduleSrc, probe); } catch (e) { loadError = e; }
ok(!loadError, 'the owner evaluates with no globals present at all' + (loadError ? ': ' + loadError.message : ''));
same(Object.keys(probe).filter((k) => before.indexOf(k) < 0).sort(), MANIFEST.slice().sort(), 'evaluating the owner defines exactly the ten functions and nothing else');
for (const name of MANIFEST) eq(typeof probe[name], 'function', name + ' is a plain function binding after load');

section('6. call-time dependencies stay with their current owners');
for (const dep of INLINE_DEPS) {
  eq(countDeclarations(index, dep), 1, dep + ' is still declared exactly once inline');
  eq(countDeclarations(moduleSrc, dep), 0, dep + ' was not copied into the owner');
  ok(bare.indexOf(dep + '(') >= 0, dep + ' is still CALLED by the owner — the dependency is real, not removed');
  const b = findFunction(base, dep), h = findFunction(index, dep);
  if (b && h) eq(h.text, b.text, dep + ' declaration is byte-identical to the base — the dependency was not edited');
}
for (const dep of SHARED_INLINE_DEPS) {
  ok(count(index, dep) > 1, dep + ' still has inline callers of its own — it belongs to its family, not to this owner');
}
// The flag cluster stayed inline and whole; the owner declares none of it.
const inlineFf = topLevelNames(index).filter((n) => /^ff[A-Z]/.test(n));
eq(inlineFf.length, INLINE_FF_DECLS, 'all fourteen ff* feature-flag declarations are still inline');
ok(inlineFf.indexOf(FLAG_DEP) >= 0, FLAG_DEP + ' is still one of them — the flag family was not split');
eq(topLevelNames(moduleSrc).filter((n) => /^ff[A-Z]/.test(n)).length, 0, 'the owner declares no feature flag of its own');
eq(count(index, FLAG_DEP), 1, FLAG_DEP + ' now appears inline exactly once — its declaration; every call went with the owner');
ok(count(bare, FLAG_DEP + '()') === 4, 'the owner makes all four of the flag checks that used to be inline');
ok(bare.indexOf('S.') >= 0, 'the owner still reads the shared S state object, which stays inline');
eq(countDeclarations(moduleSrc, 'S'), 0, 'the owner does not re-declare S');
eq(modalSrc, baseModal, 'js/ui/pretrade-risk-modal.js is byte-identical to the pinned base');

section('7. the application callsites are untouched');
for (const site of CALLSITES) {
  eq(count(base, site), 1, 'the pinned callsite occurs exactly once at the base: ' + JSON.stringify(site.slice(-40)));
  eq(count(index, site), 1, 'the pinned callsite still occurs exactly once inline: ' + JSON.stringify(site.slice(-40)));
  ok(index.indexOf(site) > inlineOpen, 'the callsite is still inside the inline monolith, after the owner loads');
}
// Counted on the comment-stripped document: the monolith also MENTIONS
// _mcxRefreshVixData() in a comment, and a comment is not a callsite.
const indexCode = stripComments(index);
eq(count(indexCode, '_mcxRefreshVixData()'), 2, '_mcxRefreshVixData is invoked from exactly two places inline');
eq(count(indexCode, '_mcxRenderBackendTechnicalSummary()'), 1, '_mcxRenderBackendTechnicalSummary is invoked from exactly one place inline');
eq(count(index, '_mcxRefreshVixData()') - count(indexCode, '_mcxRefreshVixData()'), 1, 'the one remaining mention is the comment the base already carried');

section('8. side-effect boundary');
// Enumerated, then pinned. The point is not that the owner has side effects —
// it always did — but that the extraction introduced no NEW foreign ones.
for (const forbidden of ['window.', 'globalThis.', 'localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'setTimeout', 'setInterval', 'requestAnimationFrame']) {
  eq(count(bare, forbidden), 0, 'the owner performs no ' + forbidden + ' — it did not at the base either');
}
const domCalls = [...new Set(bare.match(/document\.[A-Za-z]+/g) || [])].sort();
same(domCalls, ['document.createElement', 'document.getElementById'], 'the owner touches the DOM through exactly two APIs');
const domIds = [...new Set((moduleSrc.match(/'(mcx-[a-z0-9-]+)'/g) || []).map((s) => s.slice(1, -1)))].sort();
same(domIds, OWNED_DOM_IDS.slice().sort(), 'the owner names exactly the three MCX DOM ids it owned at the base');
const stateWrites = [...new Set((bare.match(/\bst\.([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^st\./, '').replace(/\s*=$/, '')))].sort();
same(stateWrites, OWNED_STATE_WRITES.slice().sort(), 'the owner writes exactly the ten S.marketContextSnapshot fields it wrote at the base');
// Whatever the owner writes, it must be the same set the BASE slices wrote.
const baseBare = stripComments(expected.module);
same([...new Set((baseBare.match(/\bst\.([A-Za-z0-9_$]+)\s*=/g) || []))].sort(), [...new Set((bare.match(/\bst\.([A-Za-z0-9_$]+)\s*=/g) || []))].sort(), 'the state-write set is identical between the base slices and the owner');
eq(count(bare, 'S.vixFamily'), count(baseBare, 'S.vixFamily'), 'the owner reads S.vixFamily exactly as often as the base slices did');

section('9. round trip and the historical reconstruction chain');
let rebuilt = index.slice(0, tagAt) + index.slice(tagAt + TAG.length);
rebuilt = rebuilt.slice(0, expected.cutA.start) + expected.sliceA + '\n\n' + rebuilt.slice(expected.cutA.start);
const cutALen = expected.cutA.end - expected.cutA.start;
rebuilt = rebuilt.slice(0, expected.cutB.start) + '\n' + expected.sliceB + '\n\n' + rebuilt.slice(expected.cutB.start);
eq(rebuilt, base, 'byte-exact MCX undo reconstructs the pinned base index');
eq(digest(rebuilt), digest(base), 'round-trip SHA-256 matches the pinned base');
eq(cutALen, A_CHARS + 2, 'cut A took the declaration plus its trailing blank line');
// The shared helper is what the OLDER contracts chain through, so it is
// exercised here against the same documents they will hand it.
const MCX = require('./lib/mcx-pr1-undo.js');
ok(MCX.isApplied(index), 'the shared MCX undo helper recognises this tree as extracted');
eq(MCX.undoMcxPr1(index, moduleSrc), base, 'the shared MCX undo helper reproduces the pinned base');
// And the link below it still closes: base -> the PRETRADE chain.
const PR3 = require('./lib/pretrade-pr3-undo.js');
ok(PR3.isApplied(base), 'the pinned base is still a PRETRADE-PR3-extracted document — the chain has somewhere to go');
const at383 = PR3.undoPretradePr3(base, modalSrc);
const at383Git = execFileSync('git', ['show', '0552fd129b9448a52ba379cae705e4077f8ad1e7:index.html'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
eq(at383, at383Git, 'chaining MCX -> PRETRADE PR3 reaches the post-#383 document — the whole chain closes');
// The helper must REFUSE a source it was not given, not silently rebuild garbage.
for (const [name, bad] of [
  ['a truncated owner', moduleSrc.slice(0, -1)],
  ['an equal-length byte mutation', moduleSrc.replace("return { label:'Near', color:'var(--tx3)' };", "return { label:'near', color:'var(--tx3)' };")],
]) {
  let threw = null; try { MCX.undoMcxPr1(index, bad); } catch (e) { threw = e.message; }
  eq(threw, 'MCX_PR1_UNDO_MODULE_IDENTITY', 'the MCX undo helper rejects ' + name);
}
{
  let threw = null; try { MCX.undoMcxPr1(index.replace(TAG, TAG + TAG), moduleSrc); } catch (e) { threw = e.message; }
  eq(threw, 'MCX_PR1_UNDO_TAG_IDENTITY', 'the MCX undo helper rejects a duplicated load tag');
}
{
  let threw = null; try { MCX.undoMcxPr1(index.replace('<!-- deploy: 2026-04-23 -->', '<!-- deploy: 2026-04-24 -->'), moduleSrc); } catch (e) { threw = e.message; }
  eq(threw, 'MCX_PR1_UNDO_BASE_IDENTITY', 'the MCX undo helper rejects an index that drifted outside the slices');
}

section('10. BASE-vs-HEAD behavioural transcript parity');
// The family is RUN for real — base slices and extracted owner alike — against a
// deterministic DOM/state double. Every observable the PR promised not to change
// is recorded: the DOM writes and their order, the state mutations, the console
// transcript, the dependency call order, and the resolved value of the async
// refresh path. Anything that differs between the two sources shows up as a
// transcript diff rather than as a missing assertion.
function mkEl(id, log) {
  const st = { text: null, html: null };
  const e = { id: id, style: {}, parentNode: null, nextSibling: null };
  Object.defineProperty(e, 'textContent', {
    enumerable: true, get: () => st.text,
    set: (v) => { st.text = String(v); log.push('textContent#' + e.id + '=' + String(v)); },
  });
  Object.defineProperty(e, 'innerHTML', {
    enumerable: true, get: () => st.html,
    set: (v) => { st.html = String(v); log.push('innerHTML#' + e.id + '=' + String(v)); },
  });
  return e;
}
const FIXED_NOW = Date.parse('2026-04-23T14:06:07.089Z');
function makeWorld(f) {
  const log = [];
  const byId = Object.create(null);
  const parent = {
    insertBefore(node, ref) { node.parentNode = parent; byId[node.id] = node; log.push('insertBefore#' + node.id + '@' + (ref && ref.id)); },
    removeChild(node) { delete byId[node.id]; node.parentNode = null; log.push('removeChild#' + node.id); },
  };
  if (!f.noTs) {
    const ts = mkEl('mcx-ts', log);
    ts.parentNode = f.tsOrphan ? null : parent;
    ts.nextSibling = null;
    byId['mcx-ts'] = ts;
  }
  if (!f.noHost) byId['mcx-backend-tech-summary'] = mkEl('mcx-backend-tech-summary', log);
  if (f.preSnapshotSrc) {
    const pre = mkEl('mcx-snapshot-src', log);
    pre.parentNode = parent;
    byId['mcx-snapshot-src'] = pre;
  }
  const S = JSON.parse(JSON.stringify(f.S));
  // The family stamps st.updatedAt with `new Date().toISOString()`, so a live
  // clock would make every transcript differ from every other one. Date is
  // frozen at a fixed instant; explicit `new Date(x)` still parses normally, so
  // the freshness formatting under test is exercised for real.
  function FrozenDate(a) { return arguments.length ? new Date(a) : new Date(FIXED_NOW); }
  FrozenDate.now = () => FIXED_NOW;
  FrozenDate.parse = Date.parse;
  FrozenDate.UTC = Date.UTC;
  FrozenDate.prototype = Date.prototype;
  const sandbox = {
    Math, Number, Boolean, Array, Object, JSON, String, Date: FrozenDate, Promise, parseFloat, parseInt, isFinite, isNaN,
    S: S,
    console: { log: (...a) => log.push('console:' + a.map((x) => (typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x))).join(' ')) },
    document: {
      getElementById(id) { log.push('getElementById:' + id); return byId[id] || null; },
      createElement(tag) { log.push('createElement:' + tag); return mkEl('', log); },
    },
    ffMcxBackendSnapshot() { log.push('dep:ffMcxBackendSnapshot->' + !!f.flag); return !!f.flag; },
    fetchMarketContextSnapshotFromBackend() {
      log.push('dep:fetchMarketContextSnapshotFromBackend');
      return f.fetchRejects ? Promise.reject(new Error('boom')) : Promise.resolve(f.snap);
    },
    _applyFreshVixFamily(vf) { log.push('dep:_applyFreshVixFamily:' + JSON.stringify(vf)); S.vixFamily = vf; },
    _ensureVixFamily() { log.push('dep:_ensureVixFamily'); return f.ensureRejects ? Promise.reject(new Error('nope')) : Promise.resolve(S.vixFamily); },
    _mcxDrawVixCurve() { log.push('dep:_mcxDrawVixCurve'); if (f.drawThrows) throw new Error('draw exploded'); },
  };
  sandbox.globalThis = sandbox;
  return { log, byId, S, sandbox };
}
// Date/toLocaleTimeString make the rendered summary clock-dependent; the fixture
// freshness values are fixed strings so both runs format the same instant, and
// the comparison is base-vs-head in the SAME process, so any residual locale
// dependence cancels.
async function runFamily(src, f) {
  const w = makeWorld(f);
  vm.createContext(w.sandbox);
  const out = { log: w.log, errors: [] };
  try {
    vm.runInContext(src, w.sandbox);
  } catch (e) { return { loadError: String(e && e.message), log: w.log }; }
  // Pure helpers first — cheap, total, and the ones most likely to be "cleaned up".
  out.pure = [];
  for (const [fn, args] of f.pureCalls || []) {
    w.sandbox.__a = args;
    try { out.pure.push([fn, JSON.stringify(vm.runInContext(fn + '(...__a)', w.sandbox))]); }
    catch (e) { out.pure.push([fn, 'THREW:' + (e && e.message)]); }
  }
  // Then the stateful entry points, in the order the application calls them.
  for (const step of f.steps) {
    w.sandbox.__arg = step.arg;
    try {
      const r = vm.runInContext(step.call, w.sandbox);
      if (r && typeof r.then === 'function') {
        const v = await r;
        out.errors.push(step.call + ' -> resolved ' + JSON.stringify(v === undefined ? null : v));
      } else {
        out.errors.push(step.call + ' -> ' + JSON.stringify(r === undefined ? null : r));
      }
    } catch (e) { out.errors.push(step.call + ' THREW ' + (e && e.message)); }
  }
  out.state = JSON.parse(JSON.stringify(w.S));
  out.dom = Object.keys(w.byId).sort().map((id) => [id, w.byId[id].textContent, w.byId[id].innerHTML, JSON.stringify(w.byId[id].style)]);
  return out;
}

const TECHS_FULL = {
  SPY: {
    '1D': { close: 512.3456, sma8: 510, sma20: 508.1, sma30: 505.9, sma200: 480, rsi14: 61.234, squeeze: true, distFromSma20: 0.8271 },
    '4H': { close: 512.3456, sma20: 512.9, sma30: 513.5, rsi14: 44.9, squeeze: false, distFromSma30: -0.2 },
  },
  VI3M: {
    '1D': { close: 18.55, sma20: 18.55, sma30: 19.1, rsi14: 39.2, squeeze: null, sma20VsSma30: 'BELOW' },
    '4H': { ok: false },
  },
};
const SNAP_OK = {
  ok: true,
  data: {
    source: 'BACKEND', termStructure: { shape: 'CONTANGO' },
    regime: { volatilityBucket: 'LOW', summary: 'calm' },
    technicals: TECHS_FULL,
    freshness: { generatedAt: '2026-04-23T14:05:00.000Z' },
    vixFamily: { vix: 15.1, vix9d: 14.2, vi3m: 17.3, vix6m: 18.9, source: 'DXLINK', updatedAt: '2026-04-23T14:04:00.000Z' },
  },
};
const SNAP_BAD_VIX = JSON.parse(JSON.stringify(SNAP_OK));
SNAP_BAD_VIX.data.vixFamily = { vix: 15.1, vix9d: null, vi3m: 17.3, vix6m: 18.9, source: 'DXLINK' };
const SNAP_UNAVAILABLE_VIX = JSON.parse(JSON.stringify(SNAP_OK));
SNAP_UNAVAILABLE_VIX.data.vixFamily.source = 'UNAVAILABLE';
const SNAP_NO_TECH = { ok: true, data: { source: 'BACKEND', vixFamily: SNAP_OK.data.vixFamily } };
// Rows that sit exactly on the two acceptance rules _mcxBackendTech enforces:
// ok:false is rejected however rich the row is, and a row needs at least TWO
// finite fields. Without these the corpus cannot tell either rule from its
// absence.
const SNAP_EDGE_TECH = {
  ok: true,
  data: {
    source: 'BACKEND',
    technicals: {
      SPY: {
        '1D': { ok: false, close: 100, sma20: 99, sma30: 98, sma200: 90, rsi14: 55 },
        '4H': { close: 100 },
      },
      VI3M: {
        '1D': { close: 10, sma20: 9 },
        '4H': { close: 10, rsi14: 50, squeeze: false },
      },
    },
    vixFamily: SNAP_OK.data.vixFamily,
  },
};
const SNAP_ALL_TECH_BAD = { ok: true, data: { source: 'BACKEND', technicals: { SPY: { '1D': { ok: false }, '4H': null }, VI3M: {} }, vixFamily: SNAP_OK.data.vixFamily } };

function baseState(over) {
  return Object.assign({
    marketContextSnapshot: { data: null, error: null, pending: false, updatedAt: null, source: null, termShape: null, volatilityBucket: null, regimeSummary: null, technicals: null, vixSource: null },
    vixFamily: null,
    ttConnected: true,
  }, over || {});
}
const PURE_CALLS = [
  ['_mcxFiniteNum', [1.5]], ['_mcxFiniteNum', [NaN]], ['_mcxFiniteNum', ['3']], ['_mcxFiniteNum', [Infinity]], ['_mcxFiniteNum', [null]],
  ['_mcxFormatTechValue', [12.3456, 2]], ['_mcxFormatTechValue', [12.3456, 0]], ['_mcxFormatTechValue', [12.3456, -1]], ['_mcxFormatTechValue', [null, 2]], ['_mcxFormatTechValue', [7, undefined]],
  ['_mcxTechBiasLabel', [null]], ['_mcxTechBiasLabel', [{ sma20: 5, sma30: 4 }]], ['_mcxTechBiasLabel', [{ sma20: 4, sma30: 5 }]], ['_mcxTechBiasLabel', [{ sma20: 5, sma30: 5 }]],
  ['_mcxTechBiasLabel', [{ sma20VsSma30: 'ABOVE' }]], ['_mcxTechBiasLabel', [{ sma20VsSma30: 'below' }]], ['_mcxTechBiasLabel', [{ sma20VsSma30: '>' }]], ['_mcxTechBiasLabel', [{ sma20VsSma30: '<' }]],
  ['_mcxTechBiasLabel', [{ sma20VsSma30: 'sideways' }]], ['_mcxTechBiasLabel', [{ sma20VsSma30: 42 }]],
  ['_mcxPriceVsSmaLabel', [null, 'sma20']], ['_mcxPriceVsSmaLabel', [{ close: 100, sma20: 90 }, 'sma20']], ['_mcxPriceVsSmaLabel', [{ close: 90, sma20: 100 }, 'sma20']],
  ['_mcxPriceVsSmaLabel', [{ close: 100.1, sma20: 100 }, 'sma20']], ['_mcxPriceVsSmaLabel', [{ close: 100, sma20: 0 }, 'sma20']], ['_mcxPriceVsSmaLabel', [{ close: 100 }, 'sma30']],
  ['_mcxPriceVsSmaLabel', [{ close: -100, sma20: -90 }, 'sma20']],
  ['_mcxSqueezeLabel', [null]], ['_mcxSqueezeLabel', [{}]], ['_mcxSqueezeLabel', [{ squeeze: true }]], ['_mcxSqueezeLabel', [{ squeeze: false }]], ['_mcxSqueezeLabel', [{ squeeze: null }]], ['_mcxSqueezeLabel', [{ squeeze: 'ON' }]],
];
const fixtures = [
  { name: 'flag ON, full snapshot, everything renders', flag: true, snap: SNAP_OK, S: baseState(), pureCalls: PURE_CALLS,
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxUpdateSnapshotStatus()' }, { call: '_mcxRenderBackendTechnicalSummary()' }] },
  { name: 'flag OFF, the pre-snapshot path is preserved exactly', flag: false, snap: SNAP_OK, S: baseState(), pureCalls: PURE_CALLS,
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxUpdateSnapshotStatus()' }, { call: '_mcxRenderBackendTechnicalSummary()' }] },
  { name: 'flag OFF and disconnected — synchronous draw only', flag: false, snap: SNAP_OK, S: baseState({ ttConnected: false }),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: 'backend VIX incomplete — no bridge, frontend fallback kept', flag: true, snap: SNAP_BAD_VIX, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxUpdateSnapshotStatus()' }] },
  { name: 'backend VIX source UNAVAILABLE — no bridge', flag: true, snap: SNAP_UNAVAILABLE_VIX, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: 'snapshot ok:false', flag: true, snap: { ok: false, error: 'backend_500' }, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxUpdateSnapshotStatus()' }, { call: '_mcxRenderBackendTechnicalSummary()' }] },
  { name: 'snapshot fetch rejects', flag: true, fetchRejects: true, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxUpdateSnapshotStatus()' }] },
  { name: 'snapshot fetch rejects while disconnected', flag: true, fetchRejects: true, S: baseState({ ttConnected: false }),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: 'a refresh already pending short-circuits', flag: true, snap: SNAP_OK, S: baseState({ marketContextSnapshot: Object.assign(baseState().marketContextSnapshot, { pending: true }) }),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: '_ensureVixFamily rejects — the draw still happens', flag: true, snap: SNAP_BAD_VIX, ensureRejects: true, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: 'the VIX curve draw throws — never escapes into the render loop', flag: true, snap: SNAP_OK, drawThrows: true, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: 'snapshot without technicals', flag: true, snap: SNAP_NO_TECH, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxRenderBackendTechnicalSummary()' }, { call: '_mcxUpdateSnapshotStatus()' }] },
  { name: 'every technical row unusable — the waiting notice, not four N/A cards', flag: true, snap: SNAP_ALL_TECH_BAD, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxRenderBackendTechnicalSummary()' }] },
  { name: 'no #mcx-ts element at all', flag: true, snap: SNAP_OK, noTs: true, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxUpdateSnapshotStatus()' }] },
  { name: '#mcx-ts present but orphaned from the document', flag: true, snap: SNAP_OK, tsOrphan: true, S: baseState(),
    steps: [{ call: '_mcxUpdateSnapshotStatus()' }] },
  { name: 'no summary host element', flag: true, snap: SNAP_OK, noHost: true, S: baseState(),
    steps: [{ call: '_mcxRefreshVixData()' }, { call: '_mcxRenderBackendTechnicalSummary()' }] },
  { name: 'flag OFF removes an already-present status indicator', flag: false, snap: SNAP_OK, preSnapshotSrc: true, S: baseState(),
    steps: [{ call: '_mcxUpdateSnapshotStatus()' }, { call: '_mcxRenderBackendTechnicalSummary()' }] },
  { name: 'flag ON reuses an already-present status indicator instead of inserting a second', flag: true, snap: SNAP_OK, preSnapshotSrc: true, S: baseState(),
    steps: [{ call: '_mcxApplyBackendSnapshot(__arg)', arg: SNAP_OK }, { call: '_mcxUpdateSnapshotStatus()' }] },
  { name: 'rows on the acceptance edges: ok:false with rich data, and a single finite field', flag: true, snap: SNAP_EDGE_TECH, S: baseState(),
    steps: [
      { call: '_mcxApplyBackendSnapshot(__arg)', arg: SNAP_EDGE_TECH },
      { call: "_mcxBackendTech('SPY','1D')" }, { call: "_mcxBackendTech('SPY','4H')" },
      { call: "_mcxBackendTech('VI3M','1D')" }, { call: "_mcxBackendTech('VI3M','4H')" },
      { call: '_mcxRenderBackendTechnicalSummary()' }, { call: '_mcxUpdateSnapshotStatus()' },
    ] },
  { name: 'a previously bridged snapshot is re-applied over live VIX', flag: true, snap: SNAP_OK,
    S: baseState({ vixFamily: { vix: 99, vix9d: 98, vix3m: 97, vix6m: 96, symbolsUsed: { VIX: 'VIX' }, timestamp: '2099-01-01T00:00:00.000Z' } }),
    steps: [{ call: '_mcxRefreshVixData()' }] },
  { name: 'direct snapshot application, no fetch involved', flag: true, snap: SNAP_OK, S: baseState(),
    steps: [{ call: '_mcxApplyBackendSnapshot(__arg)', arg: SNAP_OK }, { call: '_mcxApplyBackendSnapshot(__arg)', arg: null }, { call: '_mcxUpdateSnapshotStatus()' }] },
  { name: 'backend tech lookups across present, absent and thin rows', flag: true, snap: SNAP_OK, S: baseState(),
    steps: [
      { call: '_mcxApplyBackendSnapshot(__arg)', arg: SNAP_OK },
      { call: "_mcxBackendTech('SPY','1D')" }, { call: "_mcxBackendTech('SPY','4H')" },
      { call: "_mcxBackendTech('VI3M','1D')" }, { call: "_mcxBackendTech('VI3M','4H')" },
      { call: "_mcxBackendTech('IWM','1D')" }, { call: "_mcxBackendTech('SPY','1H')" },
    ] },
];

// ── mutation guards ────────────────────────────────────────────────────────
function ownerViolations(layout) {
  const v = [];
  if (JSON.stringify(topLevelNames(layout.module)) !== JSON.stringify(MANIFEST)) v.push('OWNER_MANIFEST');
  for (const n of MANIFEST) {
    const b = findFunction(base, n), m = findFunction(layout.module, n);
    if (!m) v.push('OWNER_MISSING:' + n); else if (!b || m.text !== b.text) v.push('OWNER_BODY:' + n);
    if (countDeclarations(layout.module, n) !== 1) v.push('OWNER_NOT_UNIQUE:' + n);
    if (findFunction(layout.index, n)) v.push('INLINE_DUPLICATE:' + n);
  }
  return v;
}
function loadViolations(layout) {
  const v = [];
  if (count(layout.index, TAG) !== 1) v.push('LOAD_TAG_COUNT');
  const m = layout.index.indexOf(MODAL_TAG), t = layout.index.indexOf(TAG);
  const open = layout.index.indexOf(INLINE_OPEN);
  if (m < 0 || t !== m + MODAL_TAG.length || open !== t + TAG.length) v.push('LOAD_SLOT');
  return v;
}
function depViolations(layout) {
  const v = [];
  for (const dep of INLINE_DEPS) {
    if (countDeclarations(layout.module, dep)) v.push('DEP_COPIED:' + dep);
    if (countDeclarations(layout.index, dep) !== 1) v.push('DEP_OWNER:' + dep);
    if (stripComments(layout.module).indexOf(dep + '(') < 0) v.push('DEP_LOST:' + dep);
  }
  return v;
}
function scopeViolations(layout) {
  const v = [];
  if (mcxTopLevelDeclCount(layout.index) !== MCX_INLINE_DECLS_HEAD) v.push('SCOPE_RATCHET');
  for (const n of NOT_EXTRACTED) {
    if (!findFunction(layout.index, n)) v.push('SCOPE_LOST_INLINE:' + n);
    if (countDeclarations(layout.module, n)) v.push('SCOPE_SWALLOWED:' + n);
  }
  return v;
}
function callsiteViolations(layout) {
  return CALLSITES.every((s) => count(layout.index, s) === 1) ? [] : ['CALLSITE'];
}
function sideEffectViolations(layout) {
  const v = [];
  const b = stripComments(layout.module);
  for (const forbidden of ['window.', 'globalThis.', 'localStorage', 'fetch(', 'WebSocket', 'setTimeout', 'setInterval']) {
    if (count(b, forbidden)) v.push('SIDE_EFFECT:' + forbidden);
  }
  const ids = [...new Set((layout.module.match(/'(mcx-[a-z0-9-]+)'/g) || []).map((s) => s.slice(1, -1)))].sort();
  if (JSON.stringify(ids) !== JSON.stringify(OWNED_DOM_IDS.slice().sort())) v.push('SIDE_EFFECT:DOM_IDS');
  const writes = [...new Set((b.match(/\bst\.([A-Za-z0-9_$]+)\s*=/g) || []).map((s) => s.replace(/^st\./, '').replace(/\s*=$/, '')))].sort();
  if (JSON.stringify(writes) !== JSON.stringify(OWNED_STATE_WRITES.slice().sort())) v.push('SIDE_EFFECT:STATE_WRITES');
  return v;
}
function roundTripViolations(layout) {
  const t = layout.index.indexOf(TAG);
  if (t < 0 || count(layout.index, TAG) !== 1) return ['ROUNDTRIP_TAG'];
  let r = layout.index.slice(0, t) + layout.index.slice(t + TAG.length);
  if (layout.module.length !== EXPECTED_MODULE_CHARS) return ['ROUNDTRIP_MODULE_SIZE'];
  const sa = layout.module.slice(0, A_CHARS), sb = layout.module.slice(A_CHARS + JOINER.length);
  r = r.slice(0, expected.cutA.start) + sa + '\n\n' + r.slice(expected.cutA.start);
  r = r.slice(0, expected.cutB.start) + '\n' + sb + '\n\n' + r.slice(expected.cutB.start);
  return r === base ? [] : ['ROUNDTRIP_IDENTITY'];
}
function undoViolations(layout) {
  try { return MCX.undoMcxPr1(layout.index, layout.module) === base ? [] : ['UNDO_IDENTITY']; }
  catch (e) { return ['UNDO_REJECTED:' + e.message]; }
}

async function main() {
  const transcripts = [];
  for (const f of fixtures) {
    const b = await runFamily(expected.module, f);
    const h = await runFamily(moduleSrc, f);
    same(h, b, 'BASE-vs-HEAD transcript parity: ' + f.name);
    transcripts.push(h);
  }

  // The corpus has to actually reach the behaviour it claims to protect.
  const all = JSON.stringify(transcripts);
  ok(transcripts.every((t) => !t.loadError), 'every fixture loaded the owner without a load-time error');
  ok(transcripts.every((t) => !t.errors.some((e) => e.indexOf('THREW') >= 0)), 'no entry point ever threw — the family never throws into the render loop');
  ok(all.indexOf('MCX source: Backend Snapshot') >= 0, 'the corpus reaches the backend-snapshot status wording');
  ok(all.indexOf('MCX source: Frontend fallback') >= 0, 'the corpus reaches the frontend-fallback status wording');
  ok(all.indexOf('BACKEND TECHNICAL SUMMARY') >= 0, 'the corpus renders the technical summary card row');
  ok(all.indexOf('Backend technicals unavailable') >= 0, 'the corpus reaches the missing-technicals notice');
  ok(all.indexOf('waiting for backend technicals') >= 0, 'the corpus reaches the all-rows-unusable notice');
  ok(all.indexOf('VIX family bridged from backend') >= 0, 'the corpus reaches the successful VIX bridge');
  ok(all.indexOf('keeping frontend VIX fallback') >= 0, 'the corpus reaches the incomplete-VIX fallback');
  ok(all.indexOf('dep:_applyFreshVixFamily') >= 0, 'the corpus exercises the freshness-guarded VIX write');
  ok(all.indexOf('dep:_ensureVixFamily') >= 0, 'the corpus exercises the DXLink VIX fallback path');
  ok(all.indexOf('removeChild#mcx-snapshot-src') >= 0, 'the corpus exercises the flag-OFF self-removal of the status indicator');
  ok(all.indexOf('insertBefore#mcx-snapshot-src') >= 0, 'the corpus exercises the flag-ON insertion of the status indicator');
  // Label coverage is read off the PARSED pure-helper results rather than the
  // escaped transcript blob, so 'Above' inside rendered HTML cannot stand in for
  // the label the helper actually returned.
  const pureByFn = {};
  for (const t of transcripts) for (const [fn, json] of (t.pure || [])) (pureByFn[fn] = pureByFn[fn] || []).push(json);
  function labels(fn) { return [...new Set((pureByFn[fn] || []).map((j) => { try { return JSON.parse(j).label; } catch (e) { return null; } }))].filter(Boolean).sort(); }
  ok(transcripts.some((t) => (t.pure || []).length === PURE_CALLS.length), 'the pure-helper corpus ran in full at least once');
  same(labels('_mcxTechBiasLabel'), ['Bearish', 'Bullish', 'N/A', 'Neutral'], 'the corpus reaches every structural-bias label the helper can return');
  same(labels('_mcxPriceVsSmaLabel'), ['Above', 'Below', 'N/A', 'Near'], 'the corpus reaches every price-vs-SMA label the helper can return');
  same(labels('_mcxSqueezeLabel'), ['OFF', 'ON', 'Unknown'], 'the corpus reaches every squeeze label the helper can return');
  same([...new Set((pureByFn['_mcxFiniteNum'] || []))].sort(), ['false', 'true'], 'the finite helper is exercised on both outcomes');
  ok((pureByFn['_mcxFormatTechValue'] || []).indexOf('"N/A"') >= 0, 'the value formatter is exercised on its N/A path');
  // The acceptance edges really are reached: the backend-tech lookup returns a
  // row for some fixtures and null for the ok:false / single-field ones.
  const techResults = [].concat(...transcripts.map((t) => (t.errors || []).filter((e) => e.indexOf('_mcxBackendTech(') === 0)));
  ok(techResults.some((e) => e.indexOf('-> null') > 0), 'the corpus reaches a rejected technical row');
  ok(techResults.some((e) => e.indexOf('"close"') > 0), 'the corpus reaches an accepted technical row');

  section('11. independent guards and genuine mutants');
  const guards = { owner: ownerViolations, load: loadViolations, dep: depViolations, scope: scopeViolations, callsite: callsiteViolations, sideEffect: sideEffectViolations, roundtrip: roundTripViolations, undo: undoViolations };
  const healthy = { module: moduleSrc, index: index };
  for (const [n, g] of Object.entries(guards)) same(g(healthy), [], n + ' guard is clean on the healthy repository');
  // The behaviour guard is async, so it is applied separately below.
  async function behaviourViolations(layout) {
    for (const f of fixtures) {
      const b = await runFamily(expected.module, f), h = await runFamily(layout.module, f);
      if (JSON.stringify(b) !== JSON.stringify(h)) return ['BEHAVIOUR:' + f.name];
    }
    return [];
  }
  same(await behaviourViolations(healthy), [], 'behaviour guard is clean on the healthy repository');

  // A line-start position INSIDE the inline monolith, in index.html coordinates.
  // (expected.cutA.start is a BASE offset and does not address the same byte in
  // the transformed document, nor necessarily a line boundary.)
  const INLINE_SLOT = index.indexOf(INLINE_OPEN) + INLINE_OPEN.length + 1;
  eq(index[INLINE_SLOT - 1], '\n', 'the mutant splice point is at a line boundary inside the inline monolith');
  const fA = findFunction(moduleSrc, SPAN_A[0]);
  const fApply = findFunction(moduleSrc, '_mcxApplyBackendSnapshot');
  const fRender = findFunction(moduleSrc, '_mcxRenderBackendTechnicalSummary');
  const mutants = [
    ['the helper declaration stayed inline', 'owner', { module: moduleSrc, index: index.slice(0, INLINE_SLOT) + fA.text + '\n\n' + index.slice(INLINE_SLOT) }],
    ['a span-B declaration stayed inline', 'owner', { module: moduleSrc, index: index.slice(0, INLINE_SLOT) + fApply.text + '\n\n' + index.slice(INLINE_SLOT) }],
    ['the extraction was never performed at all', 'owner', { module: '', index: base }],
    ['a declaration exists in both files', 'owner', { module: moduleSrc, index: index + '\n' + fRender.text }],
    ['the helper disappeared entirely', 'owner', { module: moduleSrc.replace(fA.text, ''), index }],
    ['a span-B declaration disappeared entirely', 'owner', { module: moduleSrc.replace(fApply.text, ''), index }],
    ['a declaration is duplicated inside the owner', 'owner', { module: moduleSrc + '\n' + fApply.text, index }],
    ['the two spans were swapped', 'owner', { module: moduleSrc.slice(A_CHARS + JOINER.length) + JOINER + moduleSrc.slice(0, A_CHARS), index }],
    ['a foreign declaration was bundled in', 'owner', { module: moduleSrc + '\nfunction foreignMcxMutation(){}', index }],
    ['a declaration was renamed', 'owner', { module: moduleSrc.replace('function _mcxSqueezeLabel(', 'function _mcxSqueezeLabelV2('), index }],
    ['script order reversed against the risk-modal owner', 'load', { module: moduleSrc, index: index.replace(MODAL_TAG + TAG, TAG + MODAL_TAG) }],
    ['owner script loaded AFTER the monolith', 'load', { module: moduleSrc, index: index.replace(TAG, '').replace('</body>', TAG + '</body>') }],
    ['owner script loaded twice', 'load', { module: moduleSrc, index: index.replace(TAG, TAG + TAG) }],
    ['owner script tag removed', 'load', { module: moduleSrc, index: index.replace(TAG, '') }],
    ['owner script path misspelled', 'load', { module: moduleSrc, index: index.replace('./js/services/mcx-market-context.js', './js/services/mcx-market-contex.js') }],
    ['the feature flag was copied into the owner', 'dep', { module: moduleSrc + '\n' + findFunction(index, 'ffMcxBackendSnapshot').text, index }],
    ['the VIX-curve draw was copied into the owner', 'dep', { module: moduleSrc + '\n' + findFunction(index, '_mcxDrawVixCurve').text, index }],
    ['the flag dependency was dropped from the owner', 'dep', { module: moduleSrc.split('ffMcxBackendSnapshot(').join('__gone('), index }],
    ['_ensureVixFamily was removed from the fallback path', 'dep', { module: moduleSrc.split('_ensureVixFamily(').join('Promise.resolve(') , index }],
    ['the MCX chart family was swallowed too', 'scope', { module: moduleSrc + '\n' + findFunction(index, '_mcxRenderCharts').text, index }],
    ['an MCX declaration was pasted back inline', 'scope', { module: moduleSrc, index: index.slice(0, INLINE_SLOT) + 'function _mcxWidenedInline(){}\n\n' + index.slice(INLINE_SLOT) }],
    ['the chart renderer was deleted from the monolith', 'scope', { module: moduleSrc, index: index.replace(findFunction(index, '_mcxRenderCharts').text, '') }],
    ['the summary callsite was removed', 'callsite', { module: moduleSrc, index: index.replace(CALLSITES[0], '}') }],
    ['the refresh callsite was redirected', 'callsite', { module: moduleSrc, index: index.replace(CALLSITES[1], CALLSITES[1].replace('_mcxRefreshVixData()', '_mcxRefreshVixDataV2()')) }],
    ['the init callsite was removed', 'callsite', { module: moduleSrc, index: index.replace(CALLSITES[2], '') }],
    ['the owner started writing to window', 'sideEffect', { module: moduleSrc + '\nwindow._mcxLeak = 1;', index }],
    ['the owner started its own timer', 'sideEffect', { module: moduleSrc.replace('function _mcxRefreshVixData(){', 'function _mcxRefreshVixData(){ setInterval(function(){}, 1000);'), index }],
    ['the owner reached for a new DOM id', 'sideEffect', { module: moduleSrc.replace("getElementById('mcx-ts')", "getElementById('mcx-other-panel')"), index }],
    ['the owner started writing a new state field', 'sideEffect', { module: moduleSrc.replace('st.error = null;', 'st.error = null; st.newField = 1;'), index }],
    ['equal-length byte mutation inside the owner', 'roundtrip', { module: moduleSrc.replace("label:'Near'", "label:'near'"), index }],
    ['index byte drift outside the extracted spans', 'roundtrip', { module: moduleSrc, index: index.replace('<!-- deploy: 2026-04-23 -->', '<!-- deploy: 2026-04-24 -->') }],
    ['the joiner between the spans changed', 'roundtrip', { module: moduleSrc.slice(0, A_CHARS) + '\n\n\n' + moduleSrc.slice(A_CHARS + JOINER.length), index }],
    ['undo helper handed a truncated source', 'undo', { module: moduleSrc.slice(0, -1), index }],
  ];
  // Behaviour mutants are run through the async guard.
  const behaviourMutants = [
    ['the finite check accepts non-numbers', { module: moduleSrc.replace("return typeof x === 'number' && isFinite(x);", 'return isFinite(x);') }],
    ['the VIX bridge no longer requires all four legs', { module: moduleSrc.replace('_mcxFiniteNum(vf.vix9d) && _mcxFiniteNum(vf.vix) && _mcxFiniteNum(vf.vi3m) && _mcxFiniteNum(vf.vix6m)', '_mcxFiniteNum(vf.vix)') }],
    ['vi3m stopped being mapped onto the frontend vix3m name', { module: moduleSrc.replace('vix3m: vf.vi3m,   // frontend convention is vix3m; backend sends vi3m', 'vix3m: vf.vix3m,') }],
    ['the pending guard stopped short-circuiting', { module: moduleSrc.replace('if (S.marketContextSnapshot.pending) { return Promise.resolve(drawAndStatus()); }', '') }],
    ['pending is no longer cleared on the failure path', { module: moduleSrc.replace('}, function(){\n      S.marketContextSnapshot.pending = false;', '}, function(){') }],
    ['the technical-row finite threshold was loosened', { module: moduleSrc.replace('if (finiteCount < 2) return null;', 'if (finiteCount < 1) return null;') }],
    ['a row with ok:false is now accepted', { module: moduleSrc.replace('if (!row || row.ok === false) return null;', 'if (!row) return null;') }],
    ['the near-SMA tolerance changed', { module: moduleSrc.replace('Math.abs(rel) < 0.002', 'Math.abs(rel) < 0.02') }],
    ['squeeze true/false mapping inverted', { module: moduleSrc.replace("if (row.squeeze === true)  return { label:'ON', color:'#e8445a' };", "if (row.squeeze === true)  return { label:'OFF', color:'#e8445a' };") }],
    ['the bias comparison was flipped', { module: moduleSrc.replace("if (a > b) return { label:'Bullish', color:'var(--gr)' };", "if (a < b) return { label:'Bullish', color:'var(--gr)' };") }],
    ['the flag gate was removed from the summary', { module: moduleSrc.replace("if (!ffMcxBackendSnapshot()) { host.innerHTML = ''; return; }", '') }],
    ['the drawVixCurve try/catch was removed', { module: moduleSrc.replace("try { _mcxDrawVixCurve(); } catch (e) { console.log('[MCX] drawVixCurve error', e); }", '_mcxDrawVixCurve();') }],
    ['the summary no longer renders after a refresh', { module: moduleSrc.replace('    _mcxRenderBackendTechnicalSummary();\n', '') }],
    ['the all-rows-unusable early return was dropped', { module: moduleSrc.replace('    if (usedBackend === 0) {', '    if (false) {') }],
    ['default decimals for tech values changed', { module: moduleSrc.replace('(typeof decimals === \'number\' && decimals >= 0) ? decimals : 2', '(typeof decimals === \'number\' && decimals >= 0) ? decimals : 3') }],
  ];

  let killed = 0, inert = 0, harness = 0;
  for (const [name, guardName, layout] of mutants) {
    if (layout.module === healthy.module && layout.index === healthy.index) { inert++; console.log('  INERT ' + name); continue; }
    try { if (guards[guardName](layout).length) killed++; else console.log('  SURVIVOR ' + name + ' [guard ' + guardName + ']'); }
    catch (e) { harness++; console.log('  HARNESS ' + name + ': ' + e.message); }
  }
  for (const [name, layout] of behaviourMutants) {
    if (layout.module === healthy.module) { inert++; console.log('  INERT ' + name); continue; }
    try { if ((await behaviourViolations(layout)).length) killed++; else console.log('  SURVIVOR ' + name + ' [guard behaviour]'); }
    catch (e) { harness++; console.log('  HARNESS ' + name + ': ' + e.message); }
  }
  const total = mutants.length + behaviourMutants.length;
  eq(inert, 0, 'no inert mutants');
  eq(harness, 0, 'no mutation harness errors');
  eq(killed, total, 'all ' + total + ' genuine mutants killed by their intended guard');

  section('12. production scope');
  const changed = execFileSync('git', ['diff', '--name-only', BASE_SHA, 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  const changedProduction = changed.filter((p) => p === 'index.html' || p.startsWith('js/')).sort();
  // The diff is measured from THIS extraction's base, so it now also spans the
  // MCX VIX owner extracted on top by PR #389. The list stays EXACT and named —
  // an unplanned production file still fails here.
  const VIX_MODULE_REL = 'js/services/mcx-vix-market-context.js';
  const BACKEND_CANDLES_REL = 'js/services/mcx-backend-candles.js';
  const JOURNAL_CORE_REL = 'js/services/journal-core.js';
  same(changedProduction, ['index.html', MODULE_REL, VIX_MODULE_REL, BACKEND_CANDLES_REL, JOURNAL_CORE_REL].sort(), 'production footprint is exactly index.html + all three MCX owners + Journal Core');
  const maintenanceScopeChanged = execFileSync('git', ['diff', '--name-only', '9a0bf91e3ca79e1b042caaa2e98ff6e2bdd073aa', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
  ok(!maintenanceScopeChanged.some((p) => p.startsWith('.github/') || p.startsWith('scripts/') || p.startsWith('config/') || p.startsWith('contracts/')), 'no workflow, bootstrap, config or manifest file changed after the CI maintenance baseline');

  console.log('\nMCX market-context boundary contract: ' + pass + ' passed, ' + fail + ' failed; mutants ' + killed + '/' + total);
  if (fail) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
