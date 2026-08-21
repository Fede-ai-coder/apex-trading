'use strict';
// ═════════════════════════════════════════════════════════════════════════════
// SFS EXTRACTION — BOUNDARY CONTRACT
//
// WHAT THIS IS
//   The single contract for the three-PR SFS (Squeeze Fire Scanner) extraction
//   approved by audit #363 (split D: config/state · scan service · UI panel).
//   It starts from the COMPLETE 62-declaration SFS manifest — not from the
//   subset PR 1 happens to ship — assigns every one of those 62 declarations to
//   exactly one planned owner, and then proves what has actually shipped so far.
//
//   PR 1 relocated the 33 CONFIG_STATE declarations, BYTE-FOR-BYTE, from the inline
//   monolith into js/services/sfs-config-state.js.
//   PR 2 relocated the 9 SCAN_SERVICE declarations, BYTE-FOR-BYTE, into
//   js/services/sfs-scan-service.js.
//   PR 3 (shipped here) relocates the 20 UI_PANEL declarations, BYTE-FOR-BYTE, into
//   js/ui/sfs-panel.js — and COMPLETES the plan. There is no pending owner left,
//   and ZERO of the 62 remain inline.
//
// THREE SHIPPED OWNERS, NONE PENDING
//   Every ownership assertion below is TWO-SIDED: a shipped declaration must be in
//   its own module AND absent from the monolith AND absent from every OTHER shipped
//   module. That is what stops PR 3 from quietly duplicating, dropping, or
//   cross-filing a declaration, and what stops it from touching PR 1's or PR 2's
//   files.
//
// THE MANIFEST IS THE UNIT, NOT THE FILE
//   Every count below is derived from the application source at run time and
//   cross-checked against the whole: the 62 declarations must still exist exactly
//   once each across the reconstructed application, and their 39,822 declaration
//   characters must still add up. A declaration that is duplicated, dropped,
//   silently rewritten or moved to the wrong owner fails here with its own name,
//   not as an incidental count drift.
//
// AND THE FILE IS RECONSTRUCTIBLE FROM THE MANIFEST
//   Section 11 closes the loop the other way: reinsert the relocated spans at their
//   original offsets, drop the tags, and the result is the original index.html byte
//   for byte — for this PR alone, and for all three PRs cumulatively back to the
//   pre-SFS commit. Location changed; source did not.
//
// NO LINE NUMBERS
//   Nothing in this file is anchored to a line number or a physical offset in
//   index.html. Ownership is proved by parsing, identity by SHA-256 of the
//   relocated span, and load order by the script manifest index.html itself
//   declares.
//
// THE PARSER IS PROVED BEFORE ANY COUNT IS TRUSTED
//   Section 0 asserts four masker invariants against the real monolith and then
//   re-measures the three recorded DSB fixtures (19/6789, 26/26385, 9/14945).
//   That order is deliberate: during audit #363 the masker was wrong twice while
//   all three fixtures still passed. Fixtures do not prove a parser; the
//   invariants do. Both defects are mutation subjects in section 11.
//
// AUDIT + PROOF. This contract must never require an application file to change.
//
// Run: node tests/sfs-extraction-boundary-contract.test.js
// ═════════════════════════════════════════════════════════════════════════════
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const {
  loadIndexHtml,
  loadOrderedScriptSources,
  parseScriptTags,
  readAttr,
} = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; return; }
  failures.push(msg);
}
function eq(actual, expected, msg) {
  ok(Object.is(actual, expected), msg + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
}
function deepEq(actual, expected, msg) {
  let same = true;
  try { assert.deepStrictEqual(actual, expected); } catch (_) { same = false; }
  ok(same, same ? msg : msg + '\n        expected: ' + JSON.stringify(expected) + '\n        actual:   ' + JSON.stringify(actual));
}
function section(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 74 - t.length))); }
function note(t) { console.log('        · ' + t); }

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
}
let GIT_OK = true;
try { git(['rev-parse', '--git-dir']); } catch (_) { GIT_OK = false; }

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ═════════════════════════════════════════════════════════════════════════════
// 0. LENGTH-PRESERVING MASKER + TOP-LEVEL DECLARATION SCANNER
//    (the parser validated by audit #363, reproduced here so this contract is
//    self-contained and can be mutated in place)
// ═════════════════════════════════════════════════════════════════════════════

// Keywords after which `/` opens a regular expression instead of dividing.
// Without this list `return /ab{c/.test(s)` reads as division and the regex's
// braces leak into the depth counter, which silently truncates the scan.
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

// Replace the CONTENT of strings, template literals, comments and regex literals
// with same-width filler, so that every index in the result still addresses the
// same character of the original. Newlines are preserved so line-based reasoning
// stays valid.
function maskSource(src, opts) {
  const useRegexKeywords = !(opts && opts.regexKeywords === false);
  // split(''), NOT Array.from(): Array.from splits by CODE POINT, so an astral
  // character (the emoji in the journal export markup) collapses a surrogate
  // pair into one element and shifts every later index by one.
  const out = src.split('');
  const n = src.length;
  let i = 0;
  let lastSig = '';
  let lastSigIdx = -1;

  function regexAllowed() {
    if (lastSig === '') return true;
    if (/[A-Za-z0-9_$]/.test(lastSig)) {
      if (!useRegexKeywords) return false;
      let s = lastSigIdx;
      while (s >= 0 && /[A-Za-z0-9_$]/.test(src[s])) s--;
      return REGEX_PRECEDING_KEYWORDS.has(src.slice(s + 1, lastSigIdx + 1));
    }
    return !/[)\]'"`]/.test(lastSig);
  }

  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') {
      let j = i;
      while (j < n && src[j] !== '\n') { out[j] = ' '; j++; }
      i = j; continue;
    }
    if (c === '/' && d === '*') {
      let j = i;
      out[j] = ' '; out[j + 1] = ' '; j += 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) { if (src[j] !== '\n') out[j] = ' '; j++; }
      if (j < n) { out[j] = ' '; out[j + 1] = ' '; j += 2; }
      i = j; continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      let j = i + 1;
      out[i] = q;
      while (j < n) {
        if (src[j] === '\\') { out[j] = ' '; if (j + 1 < n && src[j + 1] !== '\n') out[j + 1] = ' '; j += 2; continue; }
        if (src[j] === q) { out[j] = q; j++; break; }
        out[j] = src[j] === '\n' ? '\n' : ' ';
        j++;
      }
      i = j; lastSig = q; lastSigIdx = i - 1; continue;
    }
    if (c === '`') {
      let j = i + 1;
      out[i] = '`';
      while (j < n) {
        if (src[j] === '\\') { out[j] = ' '; if (j + 1 < n && src[j + 1] !== '\n') out[j + 1] = ' '; j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') {
          out[j] = ' '; out[j + 1] = ' ';
          let depth = 1, k = j + 2;
          while (k < n && depth > 0) {
            const cc = src[k], dd = src[k + 1];
            if (cc === '/' && dd === '/') { while (k < n && src[k] !== '\n') { out[k] = ' '; k++; } continue; }
            if (cc === '/' && dd === '*') {
              out[k] = ' '; out[k + 1] = ' '; k += 2;
              while (k < n && !(src[k] === '*' && src[k + 1] === '/')) { if (src[k] !== '\n') out[k] = ' '; k++; }
              if (k < n) { out[k] = ' '; out[k + 1] = ' '; k += 2; }
              continue;
            }
            if (cc === '"' || cc === "'" || cc === '`') {
              const qq = cc; let m = k + 1; out[k] = ' ';
              while (m < n) {
                if (src[m] === '\\') { out[m] = ' '; if (m + 1 < n && src[m + 1] !== '\n') out[m + 1] = ' '; m += 2; continue; }
                if (src[m] === qq) { out[m] = ' '; m++; break; }
                out[m] = src[m] === '\n' ? '\n' : ' ';
                m++;
              }
              k = m; continue;
            }
            if (cc === '{') depth++;
            else if (cc === '}') depth--;
            out[k] = src[k] === '\n' ? '\n' : ' ';
            k++;
          }
          j = k; continue;
        }
        if (src[j] === '`') { out[j] = '`'; j++; break; }
        out[j] = src[j] === '\n' ? '\n' : ' ';
        j++;
      }
      i = j; lastSig = '`'; lastSigIdx = i - 1; continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1, inClass = false, ok = false;
      while (j < n) {
        const cc = src[j];
        if (cc === '\n') break;
        if (cc === '\\') { j += 2; continue; }
        if (cc === '[') inClass = true;
        else if (cc === ']') inClass = false;
        else if (cc === '/' && !inClass) { ok = true; j++; break; }
        j++;
      }
      if (ok) {
        while (j < n && /[a-z]/i.test(src[j])) j++;
        for (let k = i; k < j; k++) out[k] = ' ';
        i = j; lastSig = 'x'; lastSigIdx = i - 1; continue;
      }
    }
    if (!/\s/.test(c)) { lastSig = c; lastSigIdx = i; }
    i++;
  }
  return out.join('');
}

// A masker that fails ANY of these three cannot be trusted to count anything.
// They are asserted against the real monolith below, and mutated in section 11.
function verifyMaskerInvariants(maskFn, src) {
  const masked = maskFn(src);
  assert.strictEqual(masked.length, src.length, 'masker is not length-preserving');
  for (let i = 0; i < src.length; i++) {
    assert.ok(!(src[i] === '\n' && masked[i] !== '\n'), 'masker destroyed a newline at offset ' + i);
  }
  let d = 0, p = 0, b = 0;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '{') d++; else if (c === '}') d--;
    else if (c === '(') p++; else if (c === ')') p--;
    else if (c === '[') b++; else if (c === ']') b--;
    assert.ok(d >= 0 && p >= 0 && b >= 0, 'masker depth went negative at offset ' + i);
  }
  assert.deepStrictEqual({ d, p, b }, { d: 0, p: 0, b: 0 }, 'masked source does not balance to zero');
}
// The same masker with the regex keyword lookback disabled — the second of the
// two real defects this audit hit. Used only as a mutation subject.
function maskSourceWithoutRegexKeywords(src) { return maskSource(src, { regexKeywords: false }); }

const DECL_KEYWORDS = ['function', 'var', 'let', 'const', 'class'];
const IDENT_CHAR = /[A-Za-z0-9_$]/;

function readIdent(masked, from) {
  let j = from;
  while (j < masked.length && /\s/.test(masked[j])) j++;
  const s = j;
  while (j < masked.length && IDENT_CHAR.test(masked[j])) j++;
  return { name: masked.slice(s, j), next: j };
}

function matchBrace(masked, openIdx) {
  let depth = 0;
  for (let j = openIdx; j < masked.length; j++) {
    if (masked[j] === '{') depth++;
    else if (masked[j] === '}') { depth--; if (depth === 0) return j; }
  }
  return -1;
}

function readDeclaration(src, masked, start, kwIdx, kw, isAsync) {
  if (kw === 'function' || kw === 'class') {
    let j = kwIdx + kw.length;
    while (j < masked.length && /[\s*]/.test(masked[j])) j++;
    const { name, next } = readIdent(masked, j);
    if (!name) return null;
    const openIdx = masked.indexOf('{', next);
    if (openIdx < 0) return null;
    const close = matchBrace(masked, openIdx);
    if (close < 0) return null;
    let end = close + 1, k = end;
    while (k < masked.length && /[ \t]/.test(masked[k])) k++;
    if (masked[k] === ';') end = k + 1;
    return {
      kind: kw === 'class' ? 'class' : 'function',
      bindingForm: kw, name, isAsync, start, end, chars: end - start,
      signature: src.slice(start, openIdx).replace(/\s+/g, ' ').trim(),
    };
  }
  const { name, next } = readIdent(masked, kwIdx + kw.length);
  if (!name) return null;
  let j = next, d = 0, p = 0, b = 0, end = -1;
  while (j < masked.length) {
    const c = masked[j];
    if (c === '{') d++;
    else if (c === '}') { if (d === 0) { end = j; break; } d--; }
    else if (c === '(') p++;
    else if (c === ')') p--;
    else if (c === '[') b++;
    else if (c === ']') b--;
    else if (c === ';' && d === 0 && p === 0 && b === 0) { end = j + 1; break; }
    j++;
  }
  if (end < 0) end = masked.length;
  return {
    kind: kw, bindingForm: kw, name, isAsync: false, start, end, chars: end - start,
    signature: kw + ' ' + name,
  };
}

// Every declaration at depth zero — outside every brace, paren and bracket.
function scanTopLevelDeclarations(src, maskedIn) {
  const masked = maskedIn || maskSource(src);
  const n = masked.length;
  const decls = [];
  let depth = 0, paren = 0, bracket = 0, i = 0;
  while (i < n) {
    const c = masked[i];
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth--; i++; continue; }
    if (c === '(') { paren++; i++; continue; }
    if (c === ')') { paren--; i++; continue; }
    if (c === '[') { bracket++; i++; continue; }
    if (c === ']') { bracket--; i++; continue; }
    if (depth !== 0 || paren !== 0 || bracket !== 0) { i++; continue; }
    if (!/[a-z]/.test(c)) { i++; continue; }
    let matched = null;
    for (const kw of DECL_KEYWORDS) {
      if (masked.startsWith(kw, i)) {
        const before = i > 0 ? masked[i - 1] : '';
        const after = masked[i + kw.length] || '';
        if (!(before && IDENT_CHAR.test(before)) && before !== '.' && !IDENT_CHAR.test(after)) { matched = kw; break; }
      }
    }
    if (!matched) { i++; continue; }
    let start = i, isAsync = false;
    if (matched === 'function') {
      const m = /\basync(\s+)$/.exec(masked.slice(Math.max(0, i - 40), i));
      if (m) { isAsync = true; start = i - m[0].length; }
    }
    const d = readDeclaration(src, masked, start, i, matched, isAsync);
    if (d) { decls.push(d); i = d.end; continue; }
    i += matched.length;
  }
  return decls;
}

// A masker that fails ANY of these cannot be trusted to count anything.
function verifyMaskerInvariants(maskFn, src) {
  const masked = maskFn(src);
  assert.strictEqual(masked.length, src.length, 'masker is not length-preserving');
  for (let i = 0; i < src.length; i++) {
    assert.ok(!(src[i] === '\n' && masked[i] !== '\n'), 'masker destroyed a newline at offset ' + i);
  }
  let d = 0, p = 0, b = 0;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '{') d++; else if (c === '}') d--;
    else if (c === '(') p++; else if (c === ')') p--;
    else if (c === '[') b++; else if (c === ']') b--;
    assert.ok(d >= 0 && p >= 0 && b >= 0, 'masker depth went negative at offset ' + i);
  }
  assert.deepStrictEqual({ d, p, b }, { d: 0, p: 0, b: 0 }, 'masked source does not balance to zero');
}
// The same masker with the regex keyword lookback disabled — one of the two real
// defects audit #363 hit. Mutation subject only.
function maskSourceWithoutRegexKeywords(src) { return maskSource(src, { regexKeywords: false }); }
// The other real defect: splitting by CODE POINT rather than by UTF-16 unit, so a
// single astral character collapses a surrogate pair into one element and shifts
// every later index by one. Mutation subject only.
function maskSourceByCodePoint(src) {
  const out = Array.from(src);            // ← the defect, verbatim
  const n = out.length;
  let i = 0;
  while (i < n) {
    if (out[i] === '/' && out[i + 1] === '/') { while (i < n && out[i] !== '\n') { out[i] = ' '; i++; } continue; }
    if (out[i] === '"' || out[i] === "'") {
      const q = out[i]; out[i] = ' '; i++;
      while (i < n && out[i] !== q && out[i] !== '\n') { out[i] = ' '; i++; }
      if (i < n && out[i] === q) out[i] = ' ';
    }
    i++;
  }
  return out.join('');
}

// Two fixtures that make the two real masker defects OBSERVABLE. Neither defect
// happens to change the count on today's monolith, so asserting against the
// monolith alone would be a weak mutant: it would pass while the guard it claims
// to exercise guards nothing. These sources are the shapes audit #363 actually
// hit, and each has a known, independently-obvious declaration count.
const REGEX_KEYWORD_FIXTURE = [
  "function keepsBrace() { return /ab{c/.test('x'); }",
  'var afterRegex = 1;',
  'function alsoTopLevel() { return 2; }',
].join('\n');
const ASTRAL_FIXTURE = [
  "var flag = '\u{1F680}\u{1F680}\u{1F680}';",
  'function afterAstral() { return 1; }',
  'var tailBinding = 2;',
].join('\n');

// ═════════════════════════════════════════════════════════════════════════════
// THE APPLICATION UNDER CONTRACT
// ═════════════════════════════════════════════════════════════════════════════
const HTML = loadIndexHtml();
const SCRIPTS = loadOrderedScriptSources();
const APP_PARTS = SCRIPTS
  .filter((s) => s.isAppJs && s.code != null)
  .map((s) => ({ name: s.kind === 'inline' ? '(inline)' : s.src, kind: s.kind, code: s.code, src: s.src }));
const INLINE_PARTS = APP_PARTS.filter((p) => p.kind === 'inline');
const CONFIG_STATE_REL = 'js/services/sfs-config-state.js';
const CONFIG_STATE_TAG = './js/services/sfs-config-state.js';
const SCAN_SERVICE_REL = 'js/services/sfs-scan-service.js';
const SCAN_SERVICE_TAG = './js/services/sfs-scan-service.js';
const UI_PANEL_REL = 'js/ui/sfs-panel.js';
const UI_PANEL_TAG = './js/ui/sfs-panel.js';

// The six already-extracted SFS candle modules. Four of them CONSUME the
// relocated bindings; all six must keep working untouched.
const SFS_CANDLE_MODULES = [
  './js/services/sfs-candle-predicates.js',
  './js/services/sfs-candle-warmup.js',
  './js/services/sfs-candle-generic-ensure.js',
  './js/services/sfs-candle-chart-hydration.js',
  './js/services/sfs-candle-spy-read.js',
  './js/services/sfs-candle-detail-4h.js',
];
// Files no PR in this plan may create: a second SFS state owner in any guise.
const FORBIDDEN_MODULES = [
  'js/services/sfs-state.js',
  'js/services/sfs-cache.js',
  'js/services/sfs-config.js',
  'js/services/sfs-constants.js',
  'js/state/sfs-state.js',
];

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 0 — parser self-proof: invariants first, recorded fixtures second
// ═════════════════════════════════════════════════════════════════════════════
section('0. PARSER SELF-PROOF');

eq(INLINE_PARTS.length, 1, 'exactly one inline application script');
const MONOLITH = INLINE_PARTS[0].code;
const MONOLITH_MASKED = maskSource(MONOLITH);

{
  let threw = null;
  try { verifyMaskerInvariants(maskSource, MONOLITH); } catch (e) { threw = e && e.message; }
  ok(threw === null, '0.1 masker invariants hold over the whole monolith' + (threw ? ': ' + threw : ''));
}
{
  // Independent oracle: a declaration keyword at column 0 in this document is
  // always top level. If the depth counter disagrees anywhere, the scan is
  // truncated somewhere earlier and every count below is wrong.
  const anchors = [];
  const re = /\n(?:async function |function |var |const |let )/g;
  let m;
  while ((m = re.exec(MONOLITH)) !== null) anchors.push(m.index + 1);
  let d = 0, p = 0, b = 0, ai = 0, bad = -1;
  for (let i = 0; i < MONOLITH_MASKED.length && bad < 0; i++) {
    while (ai < anchors.length && anchors[ai] === i) { if (d !== 0 || p !== 0 || b !== 0) bad = i; ai++; }
    const c = MONOLITH_MASKED[i];
    if (c === '{') d++; else if (c === '}') d--;
    else if (c === '(') p++; else if (c === ')') p--;
    else if (c === '[') b++; else if (c === ']') b--;
  }
  eq(bad, -1, '0.2 every column-0 declaration keyword is seen at depth zero');
  ok(anchors.length > 1300, '0.3 expected >1300 column-0 anchors, saw ' + anchors.length);
}

// Recorded fixtures: three already-extracted DSB modules with known shapes.
const DSB_FIXTURES = [
  ['js/adapters/backend-directional-snapshot-adapter.js', 19, 6789],
  ['js/services/backend-directional-snapshot-service.js', 26, 26385],
  ['js/ui/backend-directional-snapshot-panel.js', 9, 14945],
];
for (const [rel, n, chars] of DSB_FIXTURES) {
  const decls = scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(decls.length, n, '0.4 DSB fixture declarations — ' + path.basename(rel));
  eq(decls.reduce((a, d) => a + d.chars, 0), chars, '0.4 DSB fixture declaration chars — ' + path.basename(rel));
}
note('monolith is ' + MONOLITH.length + ' chars');

// ═════════════════════════════════════════════════════════════════════════════
// THE MANIFEST — all 62 SFS declarations, each with EXACTLY ONE planned owner
//
// This is the plan the three PRs execute, and it is stated in full BEFORE any
// measurement so a PR cannot quietly redefine its own scope. Owners:
//
//   CONFIG_STATE — shipped in PR 1 → js/services/sfs-config-state.js
//   SCAN_SERVICE — pending PR 2    → js/services/sfs-scan-service.js
//   UI_PANEL     — pending PR 3    → js/ui/sfs-panel.js
//
// The owner of each declaration is decided by what it OWNS and TOUCHES, never by
// its name prefix — section 2 re-derives the SERVICE/UI split from measured DOM
// access and proves the pinned owners agree.
//
//   CONFIG_STATE  every SFS binding: the tuning constants, the in-flight /
//                 cooldown / last-failure maps, the warmup queue and its dedupe
//                 keys, the detail-4H phase/result maps, the SPY resolver maps,
//                 the sort/keyboard view state and BOTH timer handles. Nothing
//                 that renders, orchestrates or reaches the DOM.
//   SCAN_SERVICE  scan orchestration and lifecycle, scoring, the non-DOM helpers
//                 the already-extracted sfs-candle-* modules call, and the
//                 non-DOM state inspector behind the debug exposure.
//   UI_PANEL      everything that reads or writes the DOM, every interaction
//                 handler that mutates view state and re-renders, and the
//                 helpers whose only product is display output.
//
// No declaration is unassigned, and none carries two owners — asserted, not
// assumed, in section 2.
// ═════════════════════════════════════════════════════════════════════════════
const MANIFEST = [
  { name: 'SFS_BATCH_SIZE', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_MAX_CONCURRENT_READS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_FIRE_LOOKBACK', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_RECENT_EXIT_BARS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_MIN_BARS_1D', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_MIN_BARS_4H', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsTfFetchInflight', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsWarmupCooldown', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsLastFailReason', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_WARMUP_COOLDOWN_MS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsDetail4hInflight', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsDetail4hPhase', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsDetail4hResult', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_DETAIL_4H_POST_WARM_ATTEMPTS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_DETAIL_4H_POST_WARM_DELAY_MS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsSpyReadInflight', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsSpyReadCooldown', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_SPY_READ_COOLDOWN_MS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_SPY_WARM_COOLDOWN_MS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_SPY_POST_WARM_READ_ATTEMPTS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_SPY_POST_WARM_RETRY_DELAY_MS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_WARMUP_BATCH_CAP', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: 'SFS_WARMUP_DEBOUNCE_MS', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsWarmupLastSentAt', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsWarmupQueue', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsWarmupQueuedKeys', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsWarmupDrainTimer', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsSortCol', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsSortDir', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsCandidateList', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsFocused', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsKbInstalled', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsResizeTimer', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' },
  { name: '_sfsInit', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfs4hDetailMessage', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsRender4hDetailState', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: 'apexDebugSfsDetailChart', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsCandlesFromSyncSource', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsRsPanelMsg', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsSleep', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsDrawRsPanel', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsAnalyzeSymbolTimeframe', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsRunScan', kind: 'function', isAsync: true, owner: 'SCAN_SERVICE' },
  { name: '_sfsCancelScan', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsRenderProgress', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsActivePanelTab', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsTfToggle', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsSetFilter', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsGetFilteredResults', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsSortBy', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsSortResults', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsRender', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsToggleOverlay', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsToggleChart', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsOpenChart', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsCloseChart', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsUpdateSelectionVisual', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsOpenSelectedChart', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsInstallKeyboardNav', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsResolveRenderPrice', kind: 'function', isAsync: false, owner: 'SCAN_SERVICE' },
  { name: '_sfsDrawCharts', kind: 'function', isAsync: false, owner: 'UI_PANEL' },
  { name: '_sfsDrawOneTf', kind: 'function', isAsync: false, owner: 'UI_PANEL' },];
const TOTAL_SFS_MANIFEST = 62;
const TOTAL_SFS_DECLARATION_CHARS = 39822;
const OWNERS = { CONFIG_STATE: 'shipped in PR 1', SCAN_SERVICE: 'shipped in PR 2', UI_PANEL: 'shipped in PR 3' };
// Which module each SHIPPED owner must live in. A shipped owner's declarations must
// be in its own module and nowhere else — including not in any other shipped module.
const OWNER_MODULE = { CONFIG_STATE: CONFIG_STATE_TAG, SCAN_SERVICE: SCAN_SERVICE_TAG, UI_PANEL: UI_PANEL_TAG };
const SHIPPED_OWNERS = ['CONFIG_STATE', 'SCAN_SERVICE', 'UI_PANEL'];
// The plan is COMPLETE: every one of the three owners has shipped, so nothing is
// pending. The array stays — emptied, not deleted — because the predicates below
// still iterate it, and an owner accidentally re-added here would fail §2 rather
// than silently disable a check.
const PENDING_OWNERS = [];
const BY_NAME = new Map(MANIFEST.map((d) => [d.name, d]));
const namesOf = (owner) => MANIFEST.filter((d) => d.owner === owner).map((d) => d.name);
const CONFIG_STATE_NAMES = namesOf('CONFIG_STATE');
const SCAN_SERVICE_NAMES = namesOf('SCAN_SERVICE');
const UI_PANEL_NAMES = namesOf('UI_PANEL');
const SHIPPED_NAMES = MANIFEST.filter((d) => SHIPPED_OWNERS.indexOf(d.owner) >= 0).map((d) => d.name);
const PENDING_NAMES = MANIFEST.filter((d) => PENDING_OWNERS.indexOf(d.owner) >= 0).map((d) => d.name);
// Per-owner declaration-char totals, stated up front so a PR cannot redefine its
// own size. 1,059 + 10,635 + 28,128 = 39,822.
const OWNER_CHARS = { CONFIG_STATE: 1059, SCAN_SERVICE: 10635, UI_PANEL: 28128 };
// Exactly one member of the family is async, and it is the scan orchestrator.
const ASYNC_NAMES = ['_sfsRunScan'];

// The SHA-256 of every relocated declaration span, recorded from the BASE
// index.html before the move. These are the byte-for-byte identity of PR 1: a
// rename, a reformat, a changed value or a changed binding form breaks the hash
// of that one declaration and names it.
const RELOCATED_SPAN_SHA256 = new Map([
  ['SFS_BATCH_SIZE', 'edde1016c0790f00d1f9f975d7974cfe16d6bd6717b7b33be1fc81e16ee1cb72'],
  ['SFS_MAX_CONCURRENT_READS', '50f02cf104ea5e75a6888bfbadb80356b2b3a42ffeff4c6472668027d70fcbe6'],
  ['SFS_FIRE_LOOKBACK', 'bd88a658f4cf6bc5a2c9cf2cc851d87e03c956ac95e2a3c251226f570e8232a5'],
  ['SFS_RECENT_EXIT_BARS', '0ecc480339288d45526b0f18c08411b33c4ae152b89ecc12c13e97a6d2597efc'],
  ['SFS_MIN_BARS_1D', 'c939a6fb08859e5a47b2a03daa856a0238f419bb1b379e7a9c81b28c87fb4384'],
  ['SFS_MIN_BARS_4H', '32bbd63633b83d7a8c34338a2928de68ab03c68603d0301ff3181a0f9e24e6f9'],
  ['_sfsTfFetchInflight', 'a71d2172eccf77c21c26b8d22d7bec026a776e9bfbf05355f069239712bfe413'],
  ['_sfsWarmupCooldown', '189d28386d3c276798122396a96320d698363523f299176270f2b73ff8483c93'],
  ['_sfsLastFailReason', '48323ed6501a77af1fe35112e41574b0748c56b1e2d60a5b9b0816a46be374f1'],
  ['SFS_WARMUP_COOLDOWN_MS', '6870a1bb07c2eca3a9b2a29ca8e05a41d2a4a15499661442fcb5fc364c505691'],
  ['_sfsDetail4hInflight', '1d3a9cf4754ace8b3be6d1b87f8058d4738d0a716529a23336753c2e0bedf78f'],
  ['_sfsDetail4hPhase', '58693ca86e720af03da837f332275732efb970d39cade070e2b7720b155147e8'],
  ['_sfsDetail4hResult', '5ef23e1d7ed7641fa7ca6c1483e3638986f6b70067af17b1361041820354a510'],
  ['SFS_DETAIL_4H_POST_WARM_ATTEMPTS', '1fc1d15c52fd5a670cf396b3bc4101da7f686f1446e2aff0dadd1821b7f5a281'],
  ['SFS_DETAIL_4H_POST_WARM_DELAY_MS', '577c9998c5d1926dfb2a4a1477399ef2146dc5617a3bbbda1125585e744547e2'],
  ['_sfsSpyReadInflight', '31897f44ba7e3524ef29f798d2e602a75d3526bd79b597036394b104bdcb93e0'],
  ['_sfsSpyReadCooldown', '925215b4d9032d6e839fc622a4ef9520dc621d7198d08f22bade72334341c509'],
  ['SFS_SPY_READ_COOLDOWN_MS', '9c8ff71c3e6cfc253b1e4cedfdb9eec0010606b36c955468086b1809c5dcae45'],
  ['SFS_SPY_WARM_COOLDOWN_MS', '3387c4babacad8097c35775017855152fc807887baf9ae75d26b23db25877ec1'],
  ['SFS_SPY_POST_WARM_READ_ATTEMPTS', '37955c0554a46fd3e7b6f57920b151a998856d243241e19be8e5fe579975dcac'],
  ['SFS_SPY_POST_WARM_RETRY_DELAY_MS', '57818220abbac62be2d338f848d5c54f482d3627ba79c0e70f13a4678b02ff7b'],
  ['SFS_WARMUP_BATCH_CAP', 'f8dacb8a774b2652dae38e52d4d78bbbeba4e2386818f739bbaeb0a471a2bc45'],
  ['SFS_WARMUP_DEBOUNCE_MS', 'e60d9651ed8e085e1a8cb835e6733f4fdcb4ddecfabf9204ad1de6c21def27c5'],
  ['_sfsWarmupLastSentAt', 'a7814b961534f3786fb4e24be2b728c23d4a3eda99440f85281c9817904e5468'],
  ['_sfsWarmupQueue', '07ad98ccfc13f2dabefb113f1822f8155c13f5c1a29d93cb8419a1517d8c2b2f'],
  ['_sfsWarmupQueuedKeys', '60916f9b317f843cb846ac44cc981267ea0f1769f0408156f98486cf0c32bd20'],
  ['_sfsWarmupDrainTimer', '851a084fe43a0fa3601962e28c6f3196c0ffbcdc888844084830aa5b7aeeddda'],
  ['_sfsSortCol', '95942d6435dd0e81e2c6b43e3b058bf32be79bf42b439018d94fe382be554e49'],
  ['_sfsSortDir', '4e7f045c01f3a069a99a1a68e6a235550b23fe504b9842d048dd9398efa8a8dd'],
  ['_sfsCandidateList', '7b912d2de92efda81ecb1999cf2f3b2734b91295ef107a8aae2ce2cd82736cf0'],
  ['_sfsFocused', '8c8559c706ec3dcdb65c353ea094ba1de2034e41774eb91c55971dcc09175eb8'],
  ['_sfsKbInstalled', 'ff586ebffcde401b5355ff92b7f6d7baf05821886985bb374babbc6af297d31a'],
  ['_sfsResizeTimer', '3d1cd605a821aeae576aece82a1c031296eac1cf64d280ef3f25614acc5dd713'],
  // ── PR 2: the 9 SCAN_SERVICE spans, recorded from the post-#365 base index.html
  //    (0ad4705e7fe6a940a46aa7c12a6cddda281232a5) before the move. A rename, a
  //    reformat, a changed body, a changed signature or a dropped `async` breaks
  //    the hash of that one declaration and names it.
  ['apexDebugSfsDetailChart', 'b52247c584678b2df95f88d26a5c3ffa02622c7a4eb516e0567a4b53c3c965e0'],
  ['_sfsCandlesFromSyncSource', '14b5f171bf44f76cd3fff6688c83df4e92d2a7e0a7e5a61e0b91869bee431377'],
  ['_sfsSleep', '9e94d58b6fb7b2a084f40ea71053c0946f4917572168a1d5e91227b5092942a8'],
  ['_sfsAnalyzeSymbolTimeframe', '2d0a18b21c4a3fc673ddefcc47b536d81c06b0968c2a08cff20d3e407c59c3ca'],
  ['_sfsRunScan', 'f9b77360f1d6f2fd655bf929ba1592b177ca5d8c427c24472bbd3221edfbd74b'],
  ['_sfsCancelScan', '33d7fb0be4bde32c641254b4bae81bc68b23322d1dcb42195716529417778b18'],
  ['_sfsGetFilteredResults', 'ae237bbefedcdac17ead189d10a27c382572946b05dc1bd9bfc4d9e9a83be8c2'],
  ['_sfsSortResults', 'afe07ca094d5f0f0f8a92c04cc125159f17b59388752021de1034d3bc84de16b'],
  ['_sfsResolveRenderPrice', '8faa5b6a0f605c71132ceec8886e18d2c833f54702694115ad2290b011e63953'],
  // ── PR 3: the 20 UI_PANEL spans, recorded from the post-#367 base index.html
  //    (7551b13efc6ba445722fdcc58e8c4eacf27fb253) before the move. A rename, a
  //    reformat, a changed body, a changed signature or an added `async` breaks
  //    the hash of that one declaration and names it.
  ['_sfsInit', '9270a7104cc950594b928bbdb3641610d0f97babcbe4e5969801d20b79cd897f'],
  ['_sfs4hDetailMessage', 'd8d52060d3cdbaff5ce60941bedbfd2940c312b289ad60bf964fbcbab99fffaa'],
  ['_sfsRender4hDetailState', '1d5ccfc73be6dd4db4dd0a86de37ef95410f1e9e4be3a61a2ad73b84bb89ac7d'],
  ['_sfsRsPanelMsg', 'f55617360010f6a70abcbf180135336214fb13248dfb9c1d2f4f356f3c1e78bb'],
  ['_sfsDrawRsPanel', '4a7c0b74dbbfaee89dee864889b1f46f5bb66cbb0c76648a93323ec69755159b'],
  ['_sfsRenderProgress', '4a7c9234acddcb069323b2ff85600588dd853f67c8e67e8ed80a0d7bf8809648'],
  ['_sfsActivePanelTab', '574079156ccae3ddeaffa6b86d588198acbf60721a092d566f2a920c00123a55'],
  ['_sfsTfToggle', '322fae555fc89e53b9a0c2d52b4b36e159504422bc249cbfaeafb5033ead69f8'],
  ['_sfsSetFilter', '37336aa1b4061f8bc62497663105bf0dc9d9bcd2aa1ddae4f5517abbd62637b4'],
  ['_sfsSortBy', 'e883648d4c57e8a31e13ff5e6aff02050b7bc1580336897a7946b59aa9fad90b'],
  ['_sfsRender', '82c85a6fe3d01dad06fc35988fd6b31f8ab119b63d5ce765673fb3f9e557d2de'],
  ['_sfsToggleOverlay', '31864c3afe7d92dc265fbf7779ea3d814bb0150db35a7f26659c6130b1e62c70'],
  ['_sfsToggleChart', '4c004a6c9b80dbd4c92a6441c8e548c0e98509443f3057d3ebae822baa9d82e8'],
  ['_sfsOpenChart', '26cb92497e87aedcd775fbea0f02b9e0600a9ad0090c01e4147c46c29ad68287'],
  ['_sfsCloseChart', 'bb5fd12de95b28c34da6fc664a8ebb2e9a68c4ead89838b9041a76259ec90f2a'],
  ['_sfsUpdateSelectionVisual', '1dff63b8d3cb3aa7dee54220df815bcceb16bc1247f5c93c79c782acf01107c7'],
  ['_sfsOpenSelectedChart', '59fdbe91a95c0e7a187ee10f9cfa504dd2df4a1b97fd1344f613d35b807dc275'],
  ['_sfsInstallKeyboardNav', '0bda32ff700dc902b130a0c05a31dcc81240423ab5490b98fac64e4851f6d3e3'],
  ['_sfsDrawCharts', 'aabe36bd80dcf10d1131353268f4be9c4226fe7db9d00d0573b924f73fcc6fe0'],
  ['_sfsDrawOneTf', '496939ec8fa77e53a2ae5fb8aad413711844ff51f72d3ffc0582a1fea78a3e0b'],
]);

// PR 2 relocation identity, per declaration: the exact char count and the physical
// order the declarations had in the monolith. The module must preserve BOTH — the
// order is pinned as RELOCATION identity, not as a runtime dependency: these are
// function declarations, so they hoist and their relative order is not observable
// at run time. Pinning it is what makes an accidental regroup visible as a diff.
const SCAN_SERVICE_SPANS = [
  { order: 1, name: 'apexDebugSfsDetailChart', chars: 1037, isAsync: false },
  { order: 2, name: '_sfsCandlesFromSyncSource', chars: 594, isAsync: false },
  { order: 3, name: '_sfsSleep', chars: 114, isAsync: false },
  { order: 4, name: '_sfsAnalyzeSymbolTimeframe', chars: 3879, isAsync: false },
  { order: 5, name: '_sfsRunScan', chars: 2912, isAsync: true },
  { order: 6, name: '_sfsCancelScan', chars: 70, isAsync: false },
  { order: 7, name: '_sfsGetFilteredResults', chars: 524, isAsync: false },
  { order: 8, name: '_sfsSortResults', chars: 894, isAsync: false },
  { order: 9, name: '_sfsResolveRenderPrice', chars: 611, isAsync: false },
];

// PR 3 relocation identity, per declaration — same contract as SCAN_SERVICE_SPANS
// above. All twenty are SYNCHRONOUS `function` declarations: the family's only async
// member is _sfsRunScan, which belongs to the scan service. An `async` accidentally
// added to any of these fails both here and in §2.
const UI_PANEL_SPANS = [
  { order: 1, name: '_sfsInit', chars: 3361, isAsync: false },
  { order: 2, name: '_sfs4hDetailMessage', chars: 1498, isAsync: false },
  { order: 3, name: '_sfsRender4hDetailState', chars: 549, isAsync: false },
  { order: 4, name: '_sfsRsPanelMsg', chars: 250, isAsync: false },
  { order: 5, name: '_sfsDrawRsPanel', chars: 2660, isAsync: false },
  { order: 6, name: '_sfsRenderProgress', chars: 215, isAsync: false },
  { order: 7, name: '_sfsActivePanelTab', chars: 215, isAsync: false },
  { order: 8, name: '_sfsTfToggle', chars: 158, isAsync: false },
  { order: 9, name: '_sfsSetFilter', chars: 114, isAsync: false },
  { order: 10, name: '_sfsSortBy', chars: 201, isAsync: false },
  { order: 11, name: '_sfsRender', chars: 7332, isAsync: false },
  { order: 12, name: '_sfsToggleOverlay', chars: 235, isAsync: false },
  { order: 13, name: '_sfsToggleChart', chars: 335, isAsync: false },
  { order: 14, name: '_sfsOpenChart', chars: 2242, isAsync: false },
  { order: 15, name: '_sfsCloseChart', chars: 168, isAsync: false },
  { order: 16, name: '_sfsUpdateSelectionVisual', chars: 482, isAsync: false },
  { order: 17, name: '_sfsOpenSelectedChart', chars: 944, isAsync: false },
  { order: 18, name: '_sfsInstallKeyboardNav', chars: 2030, isAsync: false },
  { order: 19, name: '_sfsDrawCharts', chars: 1247, isAsync: false },
  { order: 20, name: '_sfsDrawOneTf', chars: 3892, isAsync: false },
];

// The three SFS load-time STATEMENTS. These are NOT declarations, they are not
// part of the 62, and none of them may move into an extracted module:
//   • `S.squeezeFireScanner = {…}` — `S` is a script-scoped `const` declared
//     INSIDE the monolith, so it does not exist while any earlier script runs.
//   • `window.apexDebugSfsDetailChart = …` — a load-time window assignment.
//   • `window.addEventListener('resize', …)` — a load-time listener.
// Section 3 proves each is still inline, still executed by the monolith, and
// that the resize TIMER HANDLE moved while the listener that assigns it did not.
// Each probe is matched against MASKED source, so a comment that merely MENTIONS
// a statement (this module's own header documents all three) can never be
// mistaken for the statement itself.
const INLINE_STATEMENTS = [
  { id: 'STATE_ROOT', probe: 'S.squeezeFireScanner =', raw: 'S.squeezeFireScanner = {', why: 'S is a monolith-scoped const; an earlier script cannot see it' },
  { id: 'DEBUG_EXPOSURE', probe: 'window.apexDebugSfsDetailChart = apexDebugSfsDetailChart', raw: 'window.apexDebugSfsDetailChart = apexDebugSfsDetailChart', why: 'load-time window assignment' },
  { id: 'RESIZE_LISTENER', probe: 'window.addEventListener(', raw: "window.addEventListener('resize'", why: 'load-time listener registration' },
];

// A declaration belongs to the SFS FAMILY when its name carries the codebase's
// own ownership marker. The second pattern is what files audit #363's one
// non-prefixed member (apexDebugSfsDetailChart) into the family by NAME rather
// than by physical section, so this contract needs no section detector.
const SFS_NAME_RE = /^(?:_?sfs|SFS_)/i;
const SFS_NAME_RE2 = /Sfs[A-Z]/;
const isSfsName = (n) => SFS_NAME_RE.test(n) || SFS_NAME_RE2.test(n);
// The family's ratchet SCOPE: the monolith plus the module this plan ships into.
// The six sfs-candle-* modules were extracted by EARLIER PRs; their 18
// declarations are already owned and are deliberately outside the 62.
const RATCHET_SCOPE = ['(inline)', CONFIG_STATE_TAG, SCAN_SERVICE_TAG, UI_PANEL_TAG];

// ═════════════════════════════════════════════════════════════════════════════
// THE ANALYSER
//
// One pure function from the ORDERED PART LIST to the complete measurement. The
// contract asserts on its output, and section 11 re-runs the SAME predicates
// against MUTATED copies of the part list — so every guard is exercised against
// a repository that could plausibly exist, not against a hand-written fixture.
// ═════════════════════════════════════════════════════════════════════════════
function analyze(parts) {
  const perPart = parts.map((p) => {
    const masked = maskSource(p.code);
    return { name: p.name, kind: p.kind, code: p.code, masked, decls: scanTopLevelDeclarations(p.code, masked) };
  });
  const all = [];
  for (const p of perPart) {
    for (const d of p.decls) all.push({ name: d.name, kind: d.kind, isAsync: d.isAsync, chars: d.chars, start: d.start, end: d.end, where: p.name, text: p.code.slice(d.start, d.end) });
  }
  // Where each manifest name is declared, and how often, across the whole app.
  const sites = new Map();
  for (const d of all) {
    if (!sites.has(d.name)) sites.set(d.name, []);
    sites.get(d.name).push(d);
  }
  const manifestSites = new Map();
  for (const m of MANIFEST) manifestSites.set(m.name, sites.get(m.name) || []);

  // Family-shaped declarations inside the ratchet scope that the manifest does
  // not know about — the ratchet's failure mode.
  const unknownFamily = all
    .filter((d) => RATCHET_SCOPE.indexOf(d.where) >= 0 && isSfsName(d.name) && !BY_NAME.has(d.name))
    .map((d) => d.name + ' @' + d.where);

  const configPart = perPart.filter((p) => p.name === CONFIG_STATE_TAG)[0] || null;
  const servicePart = perPart.filter((p) => p.name === SCAN_SERVICE_TAG)[0] || null;
  const panelPart = perPart.filter((p) => p.name === UI_PANEL_TAG)[0] || null;
  const inlinePart = perPart.filter((p) => p.kind === 'inline')[0] || null;

  return {
    parts: perPart,
    all,
    manifestSites,
    unknownFamily,
    configPart,
    servicePart,
    panelPart,
    inlinePart,
    configDecls: configPart ? configPart.decls : [],
    serviceDecls: servicePart ? servicePart.decls : [],
    panelDecls: panelPart ? panelPart.decls : [],
    inlineNames: new Set(inlinePart ? inlinePart.decls.map((d) => d.name) : []),
    partNames: parts.map((p) => p.name),
  };
}

// ─── PLAN predicates: the manifest itself is well-formed ─────────────────────
function verifyPlan(manifest) {
  assert.strictEqual(manifest.length, TOTAL_SFS_MANIFEST,
    'the SFS manifest must hold exactly ' + TOTAL_SFS_MANIFEST + ' declarations, saw ' + manifest.length);
  const seen = new Set();
  for (const d of manifest) {
    assert.ok(!seen.has(d.name), 'declaration appears twice in the manifest: ' + d.name);
    seen.add(d.name);
    assert.ok(Object.prototype.hasOwnProperty.call(OWNERS, d.owner),
      'declaration has no valid owner: ' + d.name + ' → ' + d.owner);
  }
  const owners = new Map();
  for (const d of manifest) {
    assert.ok(!owners.has(d.name), 'declaration has two owners: ' + d.name);
    owners.set(d.name, d.owner);
  }
  for (const key of Object.keys(OWNERS)) {
    assert.ok(manifest.some((d) => d.owner === key), 'planned owner has no declarations: ' + key);
  }
}

// ─── SOURCE predicates: what has actually shipped ────────────────────────────
function verifySource(A) {
  // (1) every one of the 62 exists EXACTLY ONCE across the whole application.
  for (const m of MANIFEST) {
    const at = A.manifestSites.get(m.name) || [];
    assert.ok(at.length !== 0, 'declaration OMITTED from the application: ' + m.name);
    assert.ok(at.length === 1,
      'declaration DUPLICATED (' + at.length + ' sites: ' + at.map((d) => d.where).join(', ') + '): ' + m.name);
  }
  // (2) each shipped owner's declarations live ONLY in that owner's module —
  //     two-sided: present there, absent from the monolith, absent from the OTHER
  //     shipped module. Cross-filing a declaration fails here by name.
  for (const owner of SHIPPED_OWNERS) {
    const mod = OWNER_MODULE[owner];
    const otherMods = SHIPPED_OWNERS.filter((o) => o !== owner).map((o) => OWNER_MODULE[o]);
    for (const name of namesOf(owner)) {
      const at = A.manifestSites.get(name)[0];
      assert.strictEqual(at.where, mod,
        owner + ' declaration is not in its shipped module (found in ' + at.where + '): ' + name);
      assert.ok(!A.inlineNames.has(name), owner + ' declaration is STILL inline: ' + name);
      assert.ok(otherMods.indexOf(at.where) < 0,
        owner + ' declaration was filed into the wrong shipped module (' + at.where + '): ' + name);
    }
  }
  // (3) every pending declaration is STILL inline — PR 2 must not ship PR 3 work.
  for (const name of PENDING_NAMES) {
    const at = A.manifestSites.get(name)[0];
    assert.strictEqual(at.where, '(inline)',
      'a ' + BY_NAME.get(name).owner + ' declaration was extracted early (found in ' + at.where + '): ' + name);
  }
  // (4) each shipped module holds exactly its own set and NOTHING else — an extra
  //     unrelated function added to a service file fails here.
  assert.deepStrictEqual(A.configDecls.map((d) => d.name).slice().sort(), CONFIG_STATE_NAMES.slice().sort(),
    'the config/state module does not hold exactly the CONFIG_STATE set');
  assert.deepStrictEqual(A.serviceDecls.map((d) => d.name).slice().sort(), SCAN_SERVICE_NAMES.slice().sort(),
    'the scan-service module does not hold exactly the SCAN_SERVICE set');
  assert.deepStrictEqual(A.panelDecls.map((d) => d.name).slice().sort(), UI_PANEL_NAMES.slice().sort(),
    'the UI panel module does not hold exactly the UI_PANEL set');
  // (5) binding form and async-ness are unchanged, per declaration.
  for (const m of MANIFEST) {
    const at = A.manifestSites.get(m.name)[0];
    assert.strictEqual(at.kind, m.kind, 'binding form changed for ' + m.name + ': ' + m.kind + ' → ' + at.kind);
    assert.strictEqual(!!at.isAsync, !!m.isAsync, 'async-ness changed for ' + m.name);
  }
  // (6) the totals still add up, across the union of every owner.
  const total = MANIFEST.reduce((n, m) => n + A.manifestSites.get(m.name)[0].chars, 0);
  assert.strictEqual(A.manifestSites.size, TOTAL_SFS_MANIFEST, 'combined manifest is no longer ' + TOTAL_SFS_MANIFEST);
  assert.strictEqual(total, TOTAL_SFS_DECLARATION_CHARS,
    'combined declaration chars moved: ' + total + ' != ' + TOTAL_SFS_DECLARATION_CHARS);
  // (6b) per-owner declaration chars, so a drift cannot hide inside the total.
  for (const owner of Object.keys(OWNERS)) {
    const n = namesOf(owner).reduce((acc, name) => acc + A.manifestSites.get(name)[0].chars, 0);
    assert.strictEqual(n, OWNER_CHARS[owner],
      owner + ' declaration chars moved: ' + n + ' != ' + OWNER_CHARS[owner]);
  }
  // (7) application-wide async count across the family is unchanged, and the ONE
  //     async member is still _sfsRunScan — and it is inside the service module.
  const asyncNow = MANIFEST.filter((m) => A.manifestSites.get(m.name)[0].isAsync).length;
  assert.strictEqual(asyncNow, MANIFEST.filter((m) => m.isAsync).length, 'family async count changed');
  const asyncNames = MANIFEST.filter((m) => A.manifestSites.get(m.name)[0].isAsync).map((m) => m.name).sort();
  assert.deepStrictEqual(asyncNames, ASYNC_NAMES.slice().sort(),
    'the set of async SFS declarations changed: ' + asyncNames.join(', '));
  const serviceAsync = A.serviceDecls.filter((d) => d.isAsync).map((d) => d.name).sort();
  assert.deepStrictEqual(serviceAsync, ASYNC_NAMES.slice().sort(),
    'the scan-service module must declare exactly one async function (_sfsRunScan), saw: ' + serviceAsync.join(', '));
  // (8) RATCHET: no family-shaped declaration exists in scope that the manifest
  //     does not own. The allowance may only shrink, never grow.
  assert.deepStrictEqual(A.unknownFamily, [],
    'a new SFS-owned declaration was added without a manifest owner: ' + A.unknownFamily.join(', '));
  // (9) byte-for-byte identity of every relocated span, in ALL THREE shipped modules.
  for (const [part, decls] of [[A.configPart, A.configDecls], [A.servicePart, A.serviceDecls], [A.panelPart, A.panelDecls]]) {
    for (const d of decls) {
      const want = RELOCATED_SPAN_SHA256.get(d.name);
      assert.ok(want, 'relocated declaration has no recorded identity hash: ' + d.name);
      const got = sha256(part.code.slice(d.start, d.end));
      assert.strictEqual(got, want, 'relocated declaration is NOT byte-identical to the base span: ' + d.name);
    }
  }
  // (10) PR 2 relocation identity: the scan-service module preserves the ORDER and
  //      the per-declaration char count the monolith had. Order is pinned as
  //      relocation identity, not as a runtime dependency — see SCAN_SERVICE_SPANS.
  assert.deepStrictEqual(A.serviceDecls.map((d) => d.name), SCAN_SERVICE_SPANS.map((s) => s.name),
    'the scan-service module changed the physical order of the relocated declarations');
  for (const s of SCAN_SERVICE_SPANS) {
    const d = A.serviceDecls.filter((x) => x.name === s.name)[0];
    assert.ok(d, 'scan-service declaration missing: ' + s.name);
    assert.strictEqual(d.chars, s.chars, 'scan-service declaration char count changed: ' + s.name);
    assert.strictEqual(!!d.isAsync, !!s.isAsync, 'scan-service declaration async form changed: ' + s.name);
  }
  // (11) the scan-service module is DECLARATIONS ONLY: mask it, remove the 9 spans,
  //      and nothing but whitespace may remain. This is the predicate that rules out
  //      a top-level call, IIFE wrapper, timer, listener, window write or stray
  //      statement in a module made of FUNCTIONS — a naive "no `(` at line start"
  //      regex cannot, because every function body is full of them.
  if (A.servicePart) {
    let residual = maskSource(A.servicePart.code);
    for (const d of A.serviceDecls.slice().sort((a, b) => b.start - a.start)) {
      residual = residual.slice(0, d.start) + residual.slice(d.end);
    }
    assert.strictEqual(residual.replace(/\s/g, ''), '',
      'the scan-service module contains top-level code outside the 9 declarations: ' +
      JSON.stringify(residual.replace(/\s+/g, ' ').trim().slice(0, 120)));
  }
  // (12) PR 3 relocation identity: order and per-declaration char count, exactly as
  //      (10) does for the scan service.
  assert.deepStrictEqual(A.panelDecls.map((d) => d.name), UI_PANEL_SPANS.map((s) => s.name),
    'the UI panel module changed the physical order of the relocated declarations');
  for (const s of UI_PANEL_SPANS) {
    const d = A.panelDecls.filter((x) => x.name === s.name)[0];
    assert.ok(d, 'UI panel declaration missing: ' + s.name);
    assert.strictEqual(d.chars, s.chars, 'UI panel declaration char count changed: ' + s.name);
    assert.strictEqual(!!d.isAsync, !!s.isAsync, 'UI panel declaration async form changed: ' + s.name);
    assert.strictEqual(d.kind, 'function', 'UI panel declaration binding form changed: ' + s.name);
  }
  // (13) the UI panel module is DECLARATIONS ONLY — the same structural residual the
  //      scan service gets, and the predicate that matters most for THIS module: it is
  //      full of document.getElementById, addEventListener and setTimeout, every one of
  //      them inside a function BODY. A regex looking for those forms would flag the
  //      file; deleting the declaration spans and finding only whitespace proves that
  //      none of them is TOP LEVEL, which is what "loading it does nothing" means.
  if (A.panelPart) {
    let residual = maskSource(A.panelPart.code);
    for (const d of A.panelDecls.slice().sort((a, b) => b.start - a.start)) {
      residual = residual.slice(0, d.start) + residual.slice(d.end);
    }
    assert.strictEqual(residual.replace(/\s/g, ''), '',
      'the UI panel module contains top-level code outside the 20 declarations: ' +
      JSON.stringify(residual.replace(/\s+/g, ' ').trim().slice(0, 120)));
  }
  // (14) NETWORK OWNERSHIP: the panel may CALL owners that eventually fetch, but it
  //      introduces no transport, no endpoint literal and no second client of its own.
  if (A.panelPart) {
    const pmasked = maskSource(A.panelPart.code);
    for (const [label, re] of [
      ['fetch', /\bfetch\s*\(/], ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/],
      ['EventSource', /EventSource/], ['AbortController', /AbortController/],
      ['storage', /(?:local|session)Storage/],
      ['window/globalThis write', /\b(?:window|globalThis)\s*\.\s*[A-Za-z0-9_$]+\s*=(?!=)/],
    ]) {
      assert.ok(!re.test(pmasked), 'the UI panel module introduces ' + label);
    }
    // An endpoint literal is checked against the RAW code, not the masked copy: masking
    // blanks string CONTENT, so a URL would be invisible in the masked source.
    assert.ok(!/https?:\/\/|\/market\/candles|\/scanner\/(?:run|status|snapshot)|candles-dxlink/.test(A.panelPart.code),
      'the UI panel module contains an endpoint literal');
  }
}

// ─── STATE predicates: one owner per binding, no foreign writes ──────────────
// The SFS family's only foreign READ is the watchlist `WL`. It writes NOTHING it
// does not declare, and the single state ROOT it mutates (S.squeezeFireScanner)
// is written by no other family. Those are the properties that made SFS
// extractable at all (audit #363's owner-integrity gate), so they are pinned.
const SFS_FOREIGN_READS = ['WL'];
const SFS_STATE_ROOT = 'squeezeFireScanner';
const TIMER_HANDLES = ['_sfsWarmupDrainTimer', '_sfsResizeTimer'];
const CACHE_BINDINGS = ['_sfsWarmupCooldown', '_sfsLastFailReason', '_sfsDetail4hResult', '_sfsSpyReadCooldown'];
const INFLIGHT_BINDINGS = ['_sfsTfFetchInflight', '_sfsDetail4hInflight', '_sfsSpyReadInflight'];

function verifyState(A) {
  // (1) every SFS binding has exactly ONE declaration site, and it is the
  //     shipped config/state module. A second owner anywhere fails by name.
  const bindings = MANIFEST.filter((m) => m.kind === 'var').map((m) => m.name);
  for (const b of bindings) {
    const at = A.manifestSites.get(b) || [];
    assert.strictEqual(at.length, 1, 'binding has ' + at.length + ' owners: ' + b);
    assert.strictEqual(at[0].where, CONFIG_STATE_TAG, 'binding owner is not the config/state module: ' + b);
  }
  // (2) the timer handles, the caches and the in-flight maps each have exactly
  //     one owner — a split here is how a cache or a timer silently forks.
  for (const group of [['timer handle', TIMER_HANDLES], ['cache', CACHE_BINDINGS], ['in-flight map', INFLIGHT_BINDINGS]]) {
    for (const name of group[1]) {
      const at = A.manifestSites.get(name) || [];
      assert.strictEqual(at.length, 1, group[0] + ' has more than one owner: ' + name);
      assert.strictEqual(at[0].where, CONFIG_STATE_TAG, group[0] + ' owner is not the config/state module: ' + name);
    }
  }
  // (3) NO foreign write: no declaration outside the SFS family assigns to an SFS
  //     binding or to the SFS state root, and no SFS declaration assigns to a
  //     binding another family declares.
  const familyNames = new Set(MANIFEST.map((m) => m.name));
  const foreignWriters = [];
  for (const d of A.all) {
    if (familyNames.has(d.name)) continue;
    if (RATCHET_SCOPE.indexOf(d.where) < 0 && SFS_CANDLE_MODULES.indexOf(d.where) < 0) continue;
    const body = maskSource(d.text);
    for (const b of bindings) {
      const esc = b.replace(/\$/g, '\\$');
      const re = new RegExp('(?<![A-Za-z0-9_$.])' + esc + '(?:\\s*\\.[A-Za-z0-9_$]+|\\s*\\[[^\\]]{0,40}\\])*\\s*(?:\\+\\+|--|(?:[-+*/%|&^]|\\|\\||&&|\\?\\?)?=(?!=))');
      if (re.test(body)) foreignWriters.push(d.name + ' writes ' + b);
    }
  }
  // The four sfs-candle-* consumers legitimately MUTATE the shared maps they were
  // extracted with; they are SFS-family code that already left the monolith. Any
  // OTHER writer is a genuine foreign write.
  const genuinelyForeign = foreignWriters.filter((w) => {
    const who = w.split(' ')[0];
    const site = (A.manifestSites.get(who) || [])[0];
    const decl = A.all.filter((d) => d.name === who)[0];
    return !(decl && SFS_CANDLE_MODULES.indexOf(decl.where) >= 0) && !site;
  });
  assert.deepStrictEqual(genuinelyForeign, [], 'foreign write into SFS-owned state: ' + genuinelyForeign.join(', '));
  // (4) the config/state module reads NO foreign binding at all — every one of
  //     its initialisers is a literal, so it has no free variables whatsoever.
  const free = freeIdentifiers(A.configPart.code);
  assert.deepStrictEqual(free, [], 'the config/state module reads free globals: ' + free.join(', '));
  // (5) WL stays the family's ONLY foreign read (recorded, so a new one is loud).
  assert.deepStrictEqual(SFS_FOREIGN_READS, ['WL'], 'the recorded foreign-read set changed');
  assert.strictEqual(SFS_STATE_ROOT, 'squeezeFireScanner', 'the recorded SFS state root changed');
  // (6) the scan-service module creates NO second state owner: it declares only
  //     functions, and not one of the 33 config/state bindings. A binding duplicated
  //     into the service — the classic way a cache or timer silently forks — fails here.
  if (A.servicePart) {
    const svcBindingDecls = A.serviceDecls.filter((d) => d.kind !== 'function');
    assert.deepStrictEqual(svcBindingDecls.map((d) => d.name), [],
      'the scan-service module declares top-level state: ' + svcBindingDecls.map((d) => d.name).join(', '));
    const svcDeclared = new Set(A.serviceDecls.map((d) => d.name));
    for (const b of bindings) {
      assert.ok(!svcDeclared.has(b), 'a CONFIG_STATE binding was duplicated into the scan service: ' + b);
    }
    const svcMasked = maskSource(A.servicePart.code);
    for (const b of bindings) {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + b.replace(/\$/g, '\\$') + '\\b');
      assert.ok(!reDecl.test(svcMasked), 'a CONFIG_STATE binding is (re)declared in the scan service: ' + b);
    }
  }
  // (7) the UI panel module creates NO second owner of anything: it declares only
  //     functions, not one of the 33 config/state bindings, not one of the 9
  //     scan-service functions, and not one of the 18 declarations the six
  //     already-extracted sfs-candle-* modules own. Its bodies WRITE four of the
  //     bindings (_sfsSortCol/_sfsSortDir via _sfsSortBy, _sfsCandidateList via
  //     _sfsRender, _sfsDetail4hPhase via _sfsOpenChart, _sfsFocused/_sfsKbInstalled
  //     via _sfsInstallKeyboardNav) — writing a binding someone else declares is the
  //     whole point of the split, and is exactly what (3) above already permits.
  if (A.panelPart) {
    const panelBindingDecls = A.panelDecls.filter((d) => d.kind !== 'function');
    assert.deepStrictEqual(panelBindingDecls.map((d) => d.name), [],
      'the UI panel module declares top-level state: ' + panelBindingDecls.map((d) => d.name).join(', '));
    const panelDeclared = new Set(A.panelDecls.map((d) => d.name));
    for (const b of bindings) {
      assert.ok(!panelDeclared.has(b), 'a CONFIG_STATE binding was duplicated into the UI panel: ' + b);
    }
    for (const n of SCAN_SERVICE_NAMES) {
      assert.ok(!panelDeclared.has(n), 'a SCAN_SERVICE function was duplicated into the UI panel: ' + n);
    }
    const panelMasked = maskSource(A.panelPart.code);
    for (const b of bindings) {
      const reDecl = new RegExp('\\b(?:var|let|const)\\s+' + b.replace(/\$/g, '\\$') + '\\b');
      assert.ok(!reDecl.test(panelMasked), 'a CONFIG_STATE binding is (re)declared in the UI panel: ' + b);
    }
    // …and it re-declares nothing the six candle modules own.
    for (const rel of SFS_CANDLE_MODULES) {
      const part = A.parts.filter((p) => p.name === rel)[0];
      if (!part) continue;
      for (const d of part.decls) {
        assert.ok(!panelDeclared.has(d.name),
          'a candle-module declaration was duplicated into the UI panel: ' + d.name + ' (owned by ' + rel + ')');
      }
    }
  }
}

// Every identifier the module references but does not itself declare. For a file
// of literal-initialised declarations this must be empty — that emptiness is what
// makes the module placeable anywhere before its consumers.
function freeIdentifiers(code) {
  const masked = maskSource(code);
  const declared = new Set(scanTopLevelDeclarations(code, masked).map((d) => d.name));
  const seen = new Set();
  for (const m of masked.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (masked[m.index - 1] === '.') continue;
    const id = m[0];
    if (declared.has(id)) continue;
    if (['var', 'let', 'const', 'function', 'class', 'null', 'true', 'false', 'new', 'return', 'typeof'].indexOf(id) >= 0) continue;
    seen.add(id);
  }
  return [...seen].sort();
}

// ─── LOAD predicates: the script tag and its slot ────────────────────────────
function buildScriptModel(html) {
  return parseScriptTags(html).map((tag, order) => ({
    order,
    src: tag.src == null ? null : String(tag.src).trim(),
    type: readAttr(tag.attrs, 'type'),
    attrs: tag.attrs,
    defer: /(?:^|[ \t\n\f\r])defer(?![A-Za-z0-9-])/i.test(tag.attrs),
    async: /(?:^|[ \t\n\f\r])async(?![A-Za-z0-9-])/i.test(tag.attrs),
    nomodule: /(?:^|[ \t\n\f\r])nomodule(?![A-Za-z0-9-])/i.test(tag.attrs),
    inlineLength: tag.src ? 0 : tag.inline.length,
  }));
}

function verifyLoad(model) {
  const local = model.filter((s) => s.src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(s.src));
  const inlineApp = model.filter((s) => !s.src && s.inlineLength > 100000);
  assert.strictEqual(inlineApp.length, 1, 'expected exactly one large inline application script');

  // All three shipped modules are classic, src-only, loaded exactly once, before the monolith.
  const slot = {};
  for (const [label, tagSrc] of [['config/state', CONFIG_STATE_TAG], ['scan-service', SCAN_SERVICE_TAG], ['UI panel', UI_PANEL_TAG]]) {
    const tags = local.filter((s) => s.src === tagSrc);
    assert.strictEqual(tags.length, 1, 'index.html must load the ' + label + ' module exactly once, saw ' + tags.length);
    const me = tags[0];
    assert.ok(!me.defer, 'the ' + label + ' module must NOT be deferred');
    assert.ok(!me.async, 'the ' + label + ' module must NOT be async');
    assert.ok(!me.nomodule, 'the ' + label + ' module must NOT be nomodule');
    assert.ok(me.type == null || me.type.trim() === '',
      'the ' + label + ' module must stay a classic script, got type=' + me.type);
    const attrNames = (me.attrs.match(/([A-Za-z-]+)\s*=/g) || []).map((a) => a.replace(/\s*=$/, '').toLowerCase());
    assert.deepStrictEqual(attrNames, ['src'], 'the ' + label + ' script tag must carry ONLY src, saw: ' + attrNames.join(','));
    assert.ok(me.order < inlineApp[0].order, 'the ' + label + ' module must load BEFORE the inline monolith');
    slot[label] = me;
  }
  // The config/state module has no dependency of its own and must precede every
  // consumer that resolves its bindings at call time.
  for (const rel of SFS_CANDLE_MODULES) {
    const c = local.filter((s) => s.src === rel)[0];
    assert.ok(c, 'consumer module is not loaded: ' + rel);
    assert.ok(slot['config/state'].order < c.order,
      'the config/state module must load BEFORE its consumer ' + rel);
  }
  // The scan service is loaded AFTER the config/state module whose bindings its
  // bodies read, and BEFORE the sfs-candle-* modules that call its helpers.
  assert.ok(slot['config/state'].order < slot['scan-service'].order,
    'the scan-service module must load AFTER the config/state module');
  for (const rel of SFS_CANDLE_MODULES) {
    const c = local.filter((s) => s.src === rel)[0];
    assert.ok(slot['scan-service'].order < c.order,
      'the scan-service module must load BEFORE the sfs-candle-* module that calls it: ' + rel);
  }
  // The UI panel is the LAST member of the SFS family to load. Its bodies call the
  // config/state bindings, the scan-service functions and the candle-module functions,
  // so it is placed after all of them — a CALL-time relationship, so the ordering is
  // coherence rather than necessity, and §7 proves that distinction by execution
  // instead of asserting a load dependency this module does not have.
  assert.ok(slot['config/state'].order < slot['UI panel'].order,
    'the UI panel module must load AFTER the config/state module whose bindings it writes');
  assert.ok(slot['scan-service'].order < slot['UI panel'].order,
    'the UI panel module must load AFTER the scan-service module whose functions it calls');
  for (const rel of SFS_CANDLE_MODULES) {
    const c = local.filter((s) => s.src === rel)[0];
    assert.ok(c.order < slot['UI panel'].order,
      'the UI panel module must load AFTER the sfs-candle-* module it calls: ' + rel);
  }
  // No second copy of any module under another path.
  for (const f of FORBIDDEN_MODULES) {
    assert.ok(!fs.existsSync(path.join(ROOT, f)), 'a second SFS state owner was created: ' + f);
    assert.ok(local.every((s) => s.src.indexOf(path.basename(f)) < 0), 'a second SFS state owner is loaded: ' + f);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTIONS 1–4 — the plan, the source, the state, the load
// ═════════════════════════════════════════════════════════════════════════════
const A = analyze(APP_PARTS);
const SCRIPT_MODEL = buildScriptModel(HTML);

function expectOk(fn, msg) {
  let err = null;
  try { fn(); } catch (e) { err = e && e.message; }
  ok(err === null, msg + (err ? ' — ' + err : ''));
}

section('1. THE PLAN — 62 declarations, one owner each');
expectOk(() => verifyPlan(MANIFEST), '1.1 the manifest is a well-formed partition of ' + TOTAL_SFS_MANIFEST + ' declarations');
eq(MANIFEST.length, TOTAL_SFS_MANIFEST, '1.2 TOTAL_SFS_MANIFEST');
eq(namesOf('CONFIG_STATE').length, 33, '1.3 CONFIG_STATE — shipped in PR 1');
eq(namesOf('SCAN_SERVICE').length, 9, '1.4 SCAN_SERVICE — shipped in PR 2');
eq(namesOf('UI_PANEL').length, 20, '1.5 UI_PANEL — shipped in PR 3');
deepEq(PENDING_OWNERS, [], '1.5b the plan is complete — no owner is still pending');
eq(namesOf('CONFIG_STATE').length + namesOf('SCAN_SERVICE').length + namesOf('UI_PANEL').length,
   TOTAL_SFS_MANIFEST, '1.6 the three owners partition the manifest with nothing left over');
{
  // Every manifest name is family-shaped, and exactly one is family-shaped by the
  // second pattern rather than by prefix — the recorded audit exception.
  const byPrefix = MANIFEST.filter((m) => SFS_NAME_RE.test(m.name)).length;
  eq(byPrefix, 61, '1.7 61 of the 62 carry the _sfs / SFS_ prefix');
  deepEq(MANIFEST.filter((m) => !SFS_NAME_RE.test(m.name)).map((m) => m.name),
    ['apexDebugSfsDetailChart'], '1.8 the single non-prefixed member is the recorded one');
  ok(MANIFEST.every((m) => isSfsName(m.name)), '1.9 every manifest name is recognised as SFS-family');
}
{
  // Owners are NOT taken on faith: re-derive the SERVICE/UI split from measured
  // DOM access and check it against the pinned owners.
  const domTouching = [];
  for (const m of MANIFEST) {
    if (m.owner === 'CONFIG_STATE') continue;
    const site = A.manifestSites.get(m.name)[0];
    if (/document\s*\.|getElementById|querySelector|innerHTML|textContent|\.style\.|classList|createElement|addEventListener/.test(site.text)) domTouching.push(m.name);
  }
  ok(domTouching.every((n) => BY_NAME.get(n).owner === 'UI_PANEL'),
    '1.10 every DOM-touching declaration is planned as UI_PANEL: ' + domTouching.filter((n) => BY_NAME.get(n).owner !== 'UI_PANEL').join(', '));
  ok(namesOf('SCAN_SERVICE').every((n) => domTouching.indexOf(n) < 0),
    '1.11 no SCAN_SERVICE declaration touches the DOM');
  ok(namesOf('CONFIG_STATE').every((n) => !/document|getElementById|addEventListener|setTimeout|fetch\s*\(/.test(A.manifestSites.get(n)[0].text)),
    '1.12 no CONFIG_STATE declaration touches DOM, timers or the network');
  note('DOM-touching declarations measured: ' + domTouching.length);
}

section('2. THE SOURCE — what actually shipped');
expectOk(() => verifySource(A), '2.1 the shipped source satisfies every manifest predicate');
eq(A.configDecls.length, 33, '2.2 the config/state module declares 33 bindings');
eq(A.configDecls.reduce((n, d) => n + d.chars, 0), 1059, '2.3 …measuring 1059 declaration chars');
eq(MANIFEST.reduce((n, m) => n + A.manifestSites.get(m.name)[0].chars, 0), TOTAL_SFS_DECLARATION_CHARS,
   '2.4 combined manifest declaration chars unchanged');
eq(PENDING_NAMES.length, 0, '2.5 nothing is pending — all three owners have shipped');
eq(CONFIG_STATE_NAMES.filter((n) => A.inlineNames.has(n)).length, 0, '2.6 zero CONFIG_STATE declarations left inline');
eq(A.serviceDecls.length, 9, '2.2b the scan-service module declares 9 functions');
eq(A.serviceDecls.reduce((n, d) => n + d.chars, 0), 10635, '2.3b …measuring 10635 declaration chars');
eq(SCAN_SERVICE_NAMES.filter((n) => A.inlineNames.has(n)).length, 0, '2.6b zero SCAN_SERVICE declarations left inline');
eq(A.panelDecls.length, 20, '2.2c the UI panel module declares 20 functions');
eq(A.panelDecls.reduce((n, d) => n + d.chars, 0), 28128, '2.3c …measuring 28128 declaration chars');
eq(UI_PANEL_NAMES.filter((n) => A.inlineNames.has(n)).length, 0, '2.6c zero UI_PANEL declarations left inline');
eq(UI_PANEL_NAMES.reduce((n, name) => n + A.manifestSites.get(name)[0].chars, 0), 28128,
   '2.4c UI_PANEL still measures 28128 declaration chars, now all in the panel module');
eq(UI_PANEL_NAMES.filter((n) => A.manifestSites.get(n)[0].where === UI_PANEL_TAG).length, 20,
   '2.4d …and all 20 are in js/ui/sfs-panel.js specifically');
deepEq(A.serviceDecls.map((d) => d.name), SCAN_SERVICE_SPANS.map((s) => s.name),
   '2.12 the scan-service module preserves the monolith physical order of the 9');
eq(A.serviceDecls.every((d) => d.kind === 'function'), true, '2.13 every relocated SCAN_SERVICE declaration kept its `function` binding form');
deepEq(A.serviceDecls.filter((d) => d.isAsync).map((d) => d.name), ['_sfsRunScan'],
   '2.14 _sfsRunScan is the ONLY async declaration in the service module');
deepEq(A.panelDecls.map((d) => d.name), UI_PANEL_SPANS.map((s) => s.name),
   '2.15 the UI panel module preserves the monolith physical order of the 20');
eq(A.panelDecls.every((d) => d.kind === 'function'), true, '2.16 every relocated UI_PANEL declaration kept its `function` binding form');
eq(A.panelDecls.filter((d) => d.isAsync).length, 0, '2.17 not one UI_PANEL declaration is async');
{
  let bad = [];
  for (const d of A.panelDecls) {
    if (sha256(A.panelPart.code.slice(d.start, d.end)) !== RELOCATED_SPAN_SHA256.get(d.name)) bad.push(d.name);
  }
  deepEq(bad, [], '2.10c all 20 relocated UI_PANEL spans are SHA-256 identical to the base');
}
{
  const dupes = MANIFEST.filter((m) => A.manifestSites.get(m.name).length !== 1).map((m) => m.name);
  deepEq(dupes, [], '2.7 zero duplications and zero omissions across the whole application');
}
eq(A.configDecls.every((d) => d.kind === 'var'), true, '2.8 every relocated declaration kept its `var` binding form');
eq(A.configDecls.filter((d) => d.isAsync).length, 0, '2.9 nothing relocated is async');
{
  let bad = [];
  for (const d of A.configDecls) {
    if (sha256(A.configPart.code.slice(d.start, d.end)) !== RELOCATED_SPAN_SHA256.get(d.name)) bad.push(d.name);
  }
  deepEq(bad, [], '2.10 all 33 relocated spans are SHA-256 identical to the base');
}
{
  let bad = [];
  for (const d of A.serviceDecls) {
    if (sha256(A.servicePart.code.slice(d.start, d.end)) !== RELOCATED_SPAN_SHA256.get(d.name)) bad.push(d.name);
  }
  deepEq(bad, [], '2.10b all 9 relocated SCAN_SERVICE spans are SHA-256 identical to the base');
}
{
  // The residual index.html is the base with exactly those spans deleted: after PR 3
  // the monolith holds NO SFS declaration at all. This is the end state of the plan,
  // and the assertion that makes it visible as one line rather than a count.
  const inlineSfs = A.inlinePart.decls.filter((d) => isSfsName(d.name)).map((d) => d.name).sort();
  deepEq(inlineSfs, [], '2.11 the monolith holds ZERO SFS declarations — the extraction is complete');
}

section('3. THE INLINE STATEMENTS — three things that must NOT move');
const CONFIG_MASKED = maskSource(A.configPart.code);
const SERVICE_MASKED = A.servicePart ? maskSource(A.servicePart.code) : '';
const PANEL_MASKED = A.panelPart ? maskSource(A.panelPart.code) : '';
for (const st of INLINE_STATEMENTS) {
  ok(MONOLITH_MASKED.indexOf(st.probe) >= 0, '3.1a ' + st.id + ' is still EXECUTED by the monolith (' + st.why + ')');
  ok(A.inlinePart.code.indexOf(st.raw) >= 0, '3.1b ' + st.id + ' keeps its exact original text');
  ok(CONFIG_MASKED.indexOf(st.probe) < 0, '3.2 ' + st.id + ' did NOT move into the config/state module');
  ok(SERVICE_MASKED.indexOf(st.probe) < 0, '3.2b ' + st.id + ' did NOT move into the scan-service module');
  ok(PANEL_MASKED.indexOf(st.probe) < 0, '3.2c ' + st.id + ' did NOT move into the UI panel module');
}
{
  // The reason the state root cannot move, verified rather than asserted: `S` is
  // a script-scoped `const` declared inside the monolith, so no earlier script
  // can see it at load time.
  const sDecl = A.inlinePart.decls.filter((d) => d.name === 'S')[0];
  ok(!!sDecl && sDecl.kind === 'const', '3.3 `S` is a const declared INSIDE the monolith');
  const rootAt = A.inlinePart.code.indexOf('S.squeezeFireScanner = {');
  ok(rootAt > sDecl.start, '3.4 the SFS state root is assigned AFTER `S` exists, inside the same script');
  ok(A.parts.every((p) => p.kind === 'inline' || p.decls.every((d) => d.name !== 'S')),
    '3.5 no extracted module declares `S`');
}
{
  // The resize TIMER HANDLE moved; the listener that assigns it did not. PR 3 moved
  // the function that listener CALLS (_sfsDrawCharts) without moving the listener —
  // so all three parties now have different owners on purpose, and the callback still
  // resolves _sfsDrawCharts globally at call time.
  ok(A.configPart.code.indexOf('var _sfsResizeTimer') >= 0, '3.6 the resize timer HANDLE is owned by the config/state module');
  ok(A.inlinePart.code.indexOf("window.addEventListener('resize'") >= 0, '3.7 the resize LISTENER stays inline');
  ok(!/addEventListener/.test(CONFIG_MASKED), '3.8 the config/state module registers no listener at all');
  // The panel DOES register listeners — but only inside _sfsInstallKeyboardNav, at CALL
  // time. So the claim is not "no addEventListener in the file", which would be false
  // and would have to be weakened later; it is the two precise facts: the window/resize
  // listener did not come along, and every listener the panel does register sits inside
  // one declaration. Matched against MASKED source, because this module's own header
  // DOCUMENTS all three inline statements and a comment that mentions a statement must
  // never be mistaken for the statement itself.
  ok(PANEL_MASKED.indexOf('window.addEventListener(') < 0,
     '3.8b the resize listener did NOT follow _sfsDrawCharts into the UI panel module');
  {
    const listenerAt = [];
    for (let i = PANEL_MASKED.indexOf('addEventListener('); i >= 0; i = PANEL_MASKED.indexOf('addEventListener(', i + 1)) listenerAt.push(i);
    const kb = A.panelDecls.filter((d) => d.name === '_sfsInstallKeyboardNav')[0];
    ok(listenerAt.length > 0, '3.8e the panel registers listeners at all (it owns keyboard nav)');
    ok(!!kb && listenerAt.every((i) => i >= kb.start && i < kb.end),
       '3.8f every addEventListener in the panel is INSIDE _sfsInstallKeyboardNav — none at top level');
  }
  ok(/_sfsDrawCharts\s*\(/.test(MONOLITH_MASKED),
     '3.8c the inline resize callback still CALLS _sfsDrawCharts — resolved globally at call time');
  ok((A.manifestSites.get('_sfsDrawCharts') || [{}])[0].where === UI_PANEL_TAG,
     '3.8d …while the function it calls is declared in the UI panel module');
}
{
  // DECLARATION vs EXPOSURE — the two have different owners on purpose after PR 2.
  // The FUNCTION apexDebugSfsDetailChart is SCAN_SERVICE and moved to the module.
  // The STATEMENT `window.apexDebugSfsDetailChart = …` is a load-time window write,
  // which an extracted classic script must not perform, so it stays inline.
  const declInline = A.inlinePart.code.indexOf('function apexDebugSfsDetailChart');
  const declInService = A.servicePart ? A.servicePart.code.indexOf('function apexDebugSfsDetailChart') : -1;
  const expAt = A.inlinePart.code.indexOf('window.apexDebugSfsDetailChart = apexDebugSfsDetailChart');
  ok(declInService >= 0, '3.9a the debug DECLARATION lives in the scan-service module');
  eq(declInline, -1, '3.9b the debug declaration is NO LONGER inline');
  ok(expAt >= 0, '3.9c the window EXPOSURE statement stays inline, in the monolith');
  ok(!/window\s*\.\s*[A-Za-z0-9_$]+\s*=/.test(SERVICE_MASKED),
     '3.9d the scan-service module performs NO window assignment at all');
  ok(!/window\s*\.\s*[A-Za-z0-9_$]+\s*=/.test(PANEL_MASKED),
     '3.9f the UI panel module performs NO window assignment at all');
  ok(!/window\s*\.|globalThis\s*\./.test(CONFIG_MASKED), '3.10 the config/state module assigns nothing to window/globalThis');
  // The exposure is a one-time load-time statement of the monolith, and it is the
  // ONE place the monolith reads a service declaration at EVALUATION time. That is
  // what makes the script order below a real dependency rather than a convention.
  eq((A.inlinePart.code.match(/window\.apexDebugSfsDetailChart\s*=\s*apexDebugSfsDetailChart/g) || []).length, 1,
     '3.9e the exposure happens exactly once');
}
{
  // S.squeezeFireScanner stays inline and is TRANSPARENT to the relocation: it is a
  // pure data literal that references none of the 9 relocated functions, so moving
  // them cannot change its shape, its property order or its assignment timing.
  const rootAt = A.inlinePart.code.indexOf('S.squeezeFireScanner = {');
  const rootEnd = A.inlinePart.code.indexOf('\n};', rootAt);
  const rootText = A.inlinePart.code.slice(rootAt, rootEnd + 3);
  ok(rootAt >= 0 && rootEnd > rootAt, '3.11 the SFS state root literal is locatable inline');
  const referenced = SCAN_SERVICE_NAMES.filter((n) => new RegExp('(?<![A-Za-z0-9_$.])' + n + '(?![A-Za-z0-9_$])').test(maskSource(rootText)));
  deepEq(referenced, [], '3.12 the state root references NONE of the 9 relocated functions — relocation is transparent to it');
  ok(A.servicePart && A.servicePart.code.indexOf('S.squeezeFireScanner =') < 0,
     '3.13 the scan-service module never assigns the SFS state root');
  ok(PANEL_MASKED.indexOf('S.squeezeFireScanner =') < 0,
     '3.14 the UI panel module never assigns the SFS state root either (masked — its header documents the statement)');
  const referencedByUi = UI_PANEL_NAMES.filter((n) => new RegExp('(?<![A-Za-z0-9_$.])' + n + '(?![A-Za-z0-9_$])').test(maskSource(rootText)));
  deepEq(referencedByUi, [], '3.15 the state root references NONE of the 20 relocated UI functions either');
}

section('4. THE LOAD — one src-only classic tag, before every consumer');
expectOk(() => verifyLoad(SCRIPT_MODEL), '4.1 the script tag and its slot satisfy every load predicate');
{
  const local = SCRIPT_MODEL.filter((s) => s.src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(s.src));
  const idx = (rel) => local.map((s) => s.src).indexOf(rel);
  ok(idx(CONFIG_STATE_TAG) >= 0, '4.2 the config/state module is loaded by index.html');
  ok(idx(CONFIG_STATE_TAG) < idx('./js/services/sfs-candle-predicates.js'),
     '4.3 …immediately ahead of the SFS candle modules that consume it');
  eq(local.filter((s) => s.src === CONFIG_STATE_TAG).length, 1, '4.4 exactly one tag, no duplicate');
  ok(idx(SCAN_SERVICE_TAG) >= 0, '4.5 the scan-service module is loaded by index.html');
  eq(local.filter((s) => s.src === SCAN_SERVICE_TAG).length, 1, '4.6 exactly one scan-service tag, no duplicate');
  eq(idx(SCAN_SERVICE_TAG), idx(CONFIG_STATE_TAG) + 1,
     '4.7 the scan service loads IMMEDIATELY after the config/state module it reads');
  ok(idx(SCAN_SERVICE_TAG) < idx('./js/services/sfs-candle-predicates.js'),
     '4.8 …and ahead of the SFS candle modules that call its helpers');
  eq(local.length, 40, '4.9 index.html loads 40 local application scripts, including both later PRETRADE owners');
  ok(idx(UI_PANEL_TAG) >= 0, '4.10 the UI panel module is loaded by index.html');
  eq(local.filter((s) => s.src === UI_PANEL_TAG).length, 1, '4.11 exactly one UI panel tag, no duplicate');
  eq(idx(UI_PANEL_TAG), idx('./js/services/sfs-candle-detail-4h.js') + 1,
     '4.12 the UI panel loads IMMEDIATELY after the last sfs-candle-* module — the family boundary');
  ok(idx(UI_PANEL_TAG) < idx('./js/services/backend-scanner-snapshot-service.js'),
     '4.13 …and BEFORE the first non-SFS application module that follows it');
  ok(idx(SCAN_SERVICE_TAG) < idx(UI_PANEL_TAG), '4.14 the UI panel loads after the scan service it calls');
  {
    // The whole SFS family occupies ONE contiguous run of tags. That is what makes
    // "immediately after the last candle module" a boundary rather than a coincidence.
    const family = [CONFIG_STATE_TAG, SCAN_SERVICE_TAG].concat(SFS_CANDLE_MODULES).concat([UI_PANEL_TAG]);
    const slots = family.map(idx).sort((a, b) => a - b);
    ok(slots.every((v, i) => i === 0 || v === slots[i - 1] + 1),
       '4.15 the nine SFS family scripts are one contiguous run, ending at the UI panel');
    eq(slots[slots.length - 1], idx(UI_PANEL_TAG), '4.16 …and the UI panel is the LAST of them');
  }
  note('local application scripts: ' + local.length + ' (config/state at slot ' + (idx(CONFIG_STATE_TAG) + 1) +
       ', scan-service at slot ' + (idx(SCAN_SERVICE_TAG) + 1) +
       ', UI panel at slot ' + (idx(UI_PANEL_TAG) + 1) + ')');
}

section('5. STATE OWNERSHIP — one owner per binding, zero foreign writes');
expectOk(() => verifyState(A), '5.1 the state-ownership contract holds');
eq(MANIFEST.filter((m) => m.kind === 'var').length, 33, '5.2 the family has 33 bindings, all owned by the module');
for (const t of TIMER_HANDLES) {
  eq(A.manifestSites.get(t).length, 1, '5.3 timer handle has exactly one owner: ' + t);
  eq(A.manifestSites.get(t)[0].where, CONFIG_STATE_TAG, '5.4 timer handle owner is the config/state module: ' + t);
}
for (const c of CACHE_BINDINGS) eq(A.manifestSites.get(c)[0].where, CONFIG_STATE_TAG, '5.5 cache owner: ' + c);
for (const i of INFLIGHT_BINDINGS) eq(A.manifestSites.get(i)[0].where, CONFIG_STATE_TAG, '5.6 in-flight owner: ' + i);
deepEq(freeIdentifiers(A.configPart.code), [], '5.7 the config/state module has NO free identifiers');
deepEq(SFS_FOREIGN_READS, ['WL'], '5.8 WL remains the family’s only foreign read');
{
  // The four consumer modules still reference the relocated bindings by name and
  // still declare none of them — ownership moved, consumption did not.
  const consumers = [];
  for (const rel of SFS_CANDLE_MODULES) {
    const part = A.parts.filter((p) => p.name === rel)[0];
    if (!part) continue;
    const declared = new Set(part.decls.map((d) => d.name));
    const uses = CONFIG_STATE_NAMES.filter((n) => new RegExp('(?<![A-Za-z0-9_$.])' + n.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])').test(part.masked));
    ok(CONFIG_STATE_NAMES.every((n) => !declared.has(n)), '5.9 consumer re-declares no relocated binding: ' + rel);
    if (uses.length) consumers.push(rel + ' (' + uses.length + ')');
  }
  eq(consumers.length, 4, '5.10 exactly four sfs-candle-* modules consume the relocated bindings');
  note('external consumers: ' + consumers.join(', '));
}
{
  // SERVICE OWNERSHIP — one owner per function, and the service owns no state.
  for (const n of SCAN_SERVICE_NAMES) {
    eq(A.manifestSites.get(n).length, 1, '5.11 service function has exactly one owner: ' + n);
    eq(A.manifestSites.get(n)[0].where, SCAN_SERVICE_TAG, '5.12 service function owner is the scan-service module: ' + n);
  }
  eq(A.serviceDecls.filter((d) => d.kind !== 'function').length, 0, '5.13 the scan-service module declares no state — functions only');
  // The 33 bindings still have the config/state module as their SINGLE owner: the
  // service reads and writes them, but declares not one.
  const svcDeclared = new Set(A.serviceDecls.map((d) => d.name));
  eq(CONFIG_STATE_NAMES.filter((n) => svcDeclared.has(n)).length, 0,
     '5.14 not one CONFIG_STATE binding is (re)declared by the scan service');
  // …and the UI declarations did not leak into the service.
  eq(UI_PANEL_NAMES.filter((n) => svcDeclared.has(n)).length, 0,
     '5.15 not one UI_PANEL declaration leaked into the scan service');
  // The six already-extracted candle modules do not re-declare a service function.
  let redeclared = [];
  for (const rel of SFS_CANDLE_MODULES) {
    const part = A.parts.filter((p) => p.name === rel)[0];
    if (!part) continue;
    const dset = new Set(part.decls.map((d) => d.name));
    redeclared = redeclared.concat(SCAN_SERVICE_NAMES.filter((n) => dset.has(n)).map((n) => n + ' @' + rel));
  }
  deepEq(redeclared, [], '5.16 no sfs-candle-* module re-declares a scan-service function');
  // UI PANEL OWNERSHIP — one owner per function, and the panel owns no state.
  for (const n of UI_PANEL_NAMES) {
    eq(A.manifestSites.get(n).length, 1, '5.17 UI function has exactly one owner: ' + n);
    eq(A.manifestSites.get(n)[0].where, UI_PANEL_TAG, '5.18 UI function owner is the UI panel module: ' + n);
  }
  eq(A.panelDecls.filter((d) => d.kind !== 'function').length, 0, '5.19 the UI panel module declares no state — functions only');
  const panelDeclared = new Set(A.panelDecls.map((d) => d.name));
  eq(CONFIG_STATE_NAMES.filter((n) => panelDeclared.has(n)).length, 0,
     '5.20 not one CONFIG_STATE binding is (re)declared by the UI panel');
  eq(SCAN_SERVICE_NAMES.filter((n) => panelDeclared.has(n)).length, 0,
     '5.21 not one SCAN_SERVICE function is (re)declared by the UI panel');
  {
    // The panel WRITES four groups of bindings it does not declare. That is the split
    // working as designed, so the writes are recorded rather than forbidden — and
    // recorded EXACTLY, so a new one is loud.
    const writes = [];
    for (const d of A.panelDecls) {
      const body = maskSource(A.panelPart.code.slice(d.start, d.end));
      for (const b of CONFIG_STATE_NAMES) {
        const re = new RegExp('(?<![A-Za-z0-9_$.])' + b.replace(/\$/g, '\\$') + '(?:\\s*\\.[A-Za-z0-9_$]+|\\s*\\[[^\\]]{0,40}\\])*\\s*(?:\\+\\+|--|(?:[-+*/%|&^]|\\|\\||&&|\\?\\?)?=(?!=))');
        if (re.test(body)) writes.push(d.name + '→' + b);
      }
    }
    deepEq(writes.slice().sort(), [
      '_sfsInstallKeyboardNav→_sfsFocused', '_sfsInstallKeyboardNav→_sfsKbInstalled',
      '_sfsOpenChart→_sfsDetail4hPhase', '_sfsRender→_sfsCandidateList',
      '_sfsSortBy→_sfsSortCol', '_sfsSortBy→_sfsSortDir',
    ], '5.22 the panel writes exactly the six recorded CONFIG_STATE bindings, and declares none of them');
  }
  {
    // The six candle modules do not re-declare a UI function either.
    let uiRedeclared = [];
    for (const rel of SFS_CANDLE_MODULES) {
      const part = A.parts.filter((x) => x.name === rel)[0];
      if (!part) continue;
      const dset = new Set(part.decls.map((d) => d.name));
      uiRedeclared = uiRedeclared.concat(UI_PANEL_NAMES.filter((n) => dset.has(n)).map((n) => n + ' @' + rel));
    }
    deepEq(uiRedeclared, [], '5.23 no sfs-candle-* module re-declares a UI panel function');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6 — LOAD-TIME SIDE EFFECTS, MEASURED BY EXECUTION
//
// The module is evaluated STANDALONE in a fresh vm context whose global is a
// throwing Proxy: any read of a name the module does not declare, and any use of
// document / window / setTimeout / fetch / storage, throws and is reported. This
// is the executable form of "declarations only, nothing runs at load".
// ═════════════════════════════════════════════════════════════════════════════
section('6. LOAD-TIME SIDE EFFECTS — evaluated standalone, in a trapping sandbox');
{
  const touched = [];
  const ALLOWED = new Set(['globalThis']);
  const sandbox = new Proxy(Object.create(null), {
    has() { return true; },                       // force every lookup through get
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'globalThis') return undefined;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      touched.push('read ' + String(prop));
      throw new Error('load-time read of a foreign global: ' + String(prop));
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const ctx = vm.createContext(sandbox);
  let threw = null;
  try { vm.runInContext(A.configPart.code, ctx, { filename: CONFIG_STATE_REL }); } catch (e) { threw = e && e.message; }
  ok(threw === null, '6.1 the module evaluates standalone with NO global available' + (threw ? ' — ' + threw : ''));
  deepEq(touched, [], '6.2 zero foreign global reads at load');

  // Every binding is present after load, with exactly its declared value.
  const EXPECTED_INITIAL = {
    SFS_BATCH_SIZE: 20, SFS_MAX_CONCURRENT_READS: 5, SFS_FIRE_LOOKBACK: 5, SFS_RECENT_EXIT_BARS: 3,
    SFS_MIN_BARS_1D: 80, SFS_MIN_BARS_4H: 60, SFS_WARMUP_COOLDOWN_MS: 30000,
    SFS_DETAIL_4H_POST_WARM_ATTEMPTS: 3, SFS_DETAIL_4H_POST_WARM_DELAY_MS: 1200,
    SFS_SPY_READ_COOLDOWN_MS: 30000, SFS_SPY_WARM_COOLDOWN_MS: 120000,
    SFS_SPY_POST_WARM_READ_ATTEMPTS: 4, SFS_SPY_POST_WARM_RETRY_DELAY_MS: 900,
    SFS_WARMUP_BATCH_CAP: 3, SFS_WARMUP_DEBOUNCE_MS: 10000,
    _sfsWarmupLastSentAt: 0, _sfsWarmupDrainTimer: null, _sfsResizeTimer: null,
    _sfsSortCol: 'score', _sfsSortDir: 'desc', _sfsFocused: false, _sfsKbInstalled: false,
  };
  const wrong = [];
  for (const k of Object.keys(EXPECTED_INITIAL)) {
    if (!Object.is(sandbox[k], EXPECTED_INITIAL[k])) wrong.push(k + '=' + JSON.stringify(sandbox[k]));
  }
  deepEq(wrong, [], '6.3 every scalar binding loads with its exact declared value');
  const OBJECT_INIT = ['_sfsTfFetchInflight', '_sfsWarmupCooldown', '_sfsLastFailReason', '_sfsDetail4hInflight',
    '_sfsDetail4hPhase', '_sfsDetail4hResult', '_sfsSpyReadInflight', '_sfsSpyReadCooldown', '_sfsWarmupQueuedKeys'];
  ok(OBJECT_INIT.every((k) => sandbox[k] && typeof sandbox[k] === 'object' && !Array.isArray(sandbox[k]) && Object.keys(sandbox[k]).length === 0),
     '6.4 every map binding loads as a fresh empty object');
  ok(Array.isArray(sandbox._sfsWarmupQueue) && sandbox._sfsWarmupQueue.length === 0
     && Array.isArray(sandbox._sfsCandidateList) && sandbox._sfsCandidateList.length === 0,
     '6.5 both list bindings load as fresh empty arrays');
  eq(Object.keys(sandbox).length, 33, '6.6 loading the module defines exactly the 33 bindings and nothing else');

  // Static surface: the forms §9 forbids are absent from the file itself.
  const code = A.configPart.code;
  const masked = maskSource(code);
  const FORBIDDEN = [
    ['import', /\bimport\b/], ['export', /\bexport\b/], ['require(', /\brequire\s*\(/],
    ['IIFE', /\(\s*function\s*\(/], ['class wrapper', /\bclass\b/], ['"use strict"', /['"]use strict['"]/],
    ['DOM access', /\bdocument\b|getElementById|querySelector|innerHTML|textContent|classList/],
    ['timer creation', /\bset(?:Timeout|Interval)\s*\(|requestAnimationFrame\s*\(/],
    ['listener registration', /addEventListener\s*\(/],
    ['network', /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|AbortController/],
    ['storage', /(?:local|session)Storage/],
    ['window/globalThis write', /\b(?:window|globalThis)\s*\.\s*[A-Za-z0-9_$]+\s*=/],
    ['top-level invocation', /(?:^|\n)[ \t]*[A-Za-z_$][A-Za-z0-9_$]*\s*\(/],
    ['S read or write', /(?:^|[^A-Za-z0-9_$.])S\s*\./],
  ];
  for (const [label, re] of FORBIDDEN) ok(!re.test(masked), '6.7 the module contains no ' + label);
  ok(!/\bfunction\b/.test(masked), '6.8 the module declares no function — bindings only');
  note('config/state module is ' + code.length + ' bytes, ' + code.split('\n').length + ' lines');
}

// ── the SCAN SERVICE, evaluated the same way ────────────────────────────────
//
// The service is a module of FUNCTIONS, so the load-time question is different
// from PR 1's: its bodies legitimately mention document-free globals (S, WL, the
// SFS_* constants, the panel renderers) which are resolved at CALL time. What must
// be true is that EVALUATING the file only defines the 9 functions and does
// nothing else. A regex over the file cannot decide that — `.map(function(c){…})`
// looks like an IIFE and every `if (` looks like a call at line start — so the
// proof is executable plus a structural residual check.
{
  const touched = [];
  // SELF-DECLARED NAMES ARE NOT FOREIGN READS.
  //   Global function-declaration instantiation performs a [[Get]] on the global
  //   object for the name being declared — observable on Node 20's V8, absent on
  //   Node 22's. It fires for BOTH sync and async declarations, and never for
  //   `var`, which is exactly why PR 1's all-`var` module never met it and this
  //   all-`function` module does. That lookup is the engine declaring the module's
  //   OWN binding; it says nothing about the module's dependencies, so treating it
  //   as a foreign read would make this proof engine-dependent rather than wrong.
  //   Everything the module does not itself declare still throws.
  const SELF_DECLARED = new Set(SCAN_SERVICE_NAMES);
  const sandbox = new Proxy(Object.create(null), {
    has() { return true; },
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'globalThis') return undefined;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      if (SELF_DECLARED.has(prop)) return undefined;
      touched.push('read ' + String(prop));
      throw new Error('load-time read of a foreign global: ' + String(prop));
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  const ctx = vm.createContext(sandbox);
  let threw = null;
  try { vm.runInContext(A.servicePart.code, ctx, { filename: SCAN_SERVICE_REL }); } catch (e) { threw = e && e.message; }
  ok(threw === null, '6.9 the scan service evaluates standalone with NO global available' + (threw ? ' — ' + threw : ''));
  deepEq(touched, [], '6.10 zero FOREIGN global reads at load');
  // The exemption is narrow, and proved narrow: a body reference to a name the
  // module does NOT declare still throws when it is read at load time. Without
  // this probe the exemption above could quietly hide a real load-time dependency.
  {
    let caught = null;
    const probeTouched = [];
    const probe = new Proxy(Object.create(null), {
      has() { return true; },
      get(target, prop) {
        if (typeof prop === 'symbol') return undefined;
        if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
        if (SELF_DECLARED.has(prop)) return undefined;
        probeTouched.push(String(prop));
        throw new Error('load-time read of a foreign global: ' + String(prop));
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    try {
      vm.runInContext(A.servicePart.code + '\nvar probe = S.squeezeFireScanner;\n', vm.createContext(probe));
    } catch (e) { caught = e && e.message; }
    // Engine-agnostic on purpose. Once the trap throws, the two V8 versions differ
    // in what they do next: Node 22 goes on to build a ReferenceError inside the
    // context (which itself looks up `Error`), so neither the final message nor the
    // full touched list is stable across engines. What IS stable, and what this
    // proof is actually about, is that the read was refused and the OFFENDING name
    // was the first one reported.
    ok(caught !== null,
       '6.10b the self-declared exemption is narrow — a genuine foreign load-time read still throws (' + caught + ')');
    eq(probeTouched[0], 'S', '6.10c …and the offending foreign name is the first one reported');
  }
  eq(Object.keys(sandbox).length, 9, '6.11 loading the service defines exactly the 9 functions and nothing else');
  deepEq(Object.keys(sandbox).sort(), SCAN_SERVICE_NAMES.slice().sort(), '6.12 …and they are exactly the SCAN_SERVICE set');
  ok(Object.keys(sandbox).every((k) => typeof sandbox[k] === 'function'), '6.13 every name it defines is a function');
  ok(sandbox._sfsRunScan && sandbox._sfsRunScan.constructor && sandbox._sfsRunScan.constructor.name === 'AsyncFunction',
     '6.14 _sfsRunScan is still an AsyncFunction after relocation');
  eq(Object.keys(sandbox).filter((k) => sandbox[k].constructor && sandbox[k].constructor.name === 'AsyncFunction').length, 1,
     '6.15 exactly one AsyncFunction is defined by the module');

  // Structural residual: mask the file, delete the 9 declaration spans, and nothing
  // but whitespace may remain — no top-level statement of any kind survives.
  {
    let residual = maskSource(A.servicePart.code);
    for (const d of A.serviceDecls.slice().sort((a, b) => b.start - a.start)) {
      residual = residual.slice(0, d.start) + residual.slice(d.end);
    }
    eq(residual.replace(/\s/g, ''), '', '6.16 the file is EXACTLY comments + the 9 declarations — no top-level code');
  }
  // Static surface: the forms §8 of the plan forbids outright.
  const smasked = maskSource(A.servicePart.code);
  const SERVICE_FORBIDDEN = [
    ['import', /\bimport\b/], ['export', /\bexport\b/], ['require(', /\brequire\s*\(/],
    ['class wrapper', /\bclass\b/], ['"use strict"', /['"]use strict['"]/],
    ['DOM access', /\bdocument\b|getElementById|querySelector|innerHTML|textContent|classList|createElement/],
    ['listener registration', /addEventListener\s*\(/],
    ['network', /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|AbortController/],
    ['storage', /(?:local|session)Storage/],
    ['window/globalThis write', /\b(?:window|globalThis)\s*\.\s*[A-Za-z0-9_$]+\s*=/],
  ];
  for (const [label, re] of SERVICE_FORBIDDEN) ok(!re.test(smasked), '6.17 the scan service contains no ' + label);
  note('scan-service module is ' + A.servicePart.code.length + ' bytes, ' +
       A.servicePart.code.split('\n').length + ' lines, ' + A.serviceDecls.length + ' declarations');
}

// ── the UI PANEL, evaluated the same way ────────────────────────────────────
//
// This is the module where the load-time question is sharpest. The file is FULL of
// document.getElementById, innerHTML writes, addEventListener and setTimeout — every
// one of them inside a function body. A static scan for those forms would condemn it;
// the only honest proof is to EVALUATE it in a context where touching any of them
// throws, and separately to show that deleting the 20 declaration spans leaves nothing
// behind. Both are done here.
{
  const touched = [];
  // Same narrow exemption as the scan service: global function-declaration
  // instantiation performs a [[Get]] for the name being declared on Node 20's V8 and
  // not on Node 22's. That lookup is the engine declaring the module's OWN binding, so
  // treating it as a foreign read would make this proof engine-dependent rather than
  // wrong. Everything the module does not itself declare still throws — proved below.
  const SELF_DECLARED = new Set(UI_PANEL_NAMES);
  const sandbox = new Proxy(Object.create(null), {
    has() { return true; },
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'globalThis') return undefined;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      if (SELF_DECLARED.has(prop)) return undefined;
      touched.push('read ' + String(prop));
      throw new Error('load-time read of a foreign global: ' + String(prop));
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  let threw = null;
  try { vm.runInContext(A.panelPart.code, vm.createContext(sandbox), { filename: UI_PANEL_REL }); } catch (e) { threw = e && e.message; }
  ok(threw === null, '6.18 the UI panel evaluates standalone with NO global available' + (threw ? ' — ' + threw : ''));
  deepEq(touched, [], '6.19 zero FOREIGN global reads at load');
  // There is no `document` and no `window` in that context at all. If ANY of the many
  // DOM operations in this file ran at load, the evaluation above would have thrown
  // naming `document` — so 6.18 passing IS the proof that none of them is top level.
  {
    let caught = null;
    const probeTouched = [];
    const probe = new Proxy(Object.create(null), {
      has() { return true; },
      get(target, prop) {
        if (typeof prop === 'symbol') return undefined;
        if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
        if (SELF_DECLARED.has(prop)) return undefined;
        probeTouched.push(String(prop));
        throw new Error('load-time read of a foreign global: ' + String(prop));
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    try {
      vm.runInContext(A.panelPart.code + '\ndocument.getElementById("x");\n', vm.createContext(probe));
    } catch (e) { caught = e && e.message; }
    ok(caught !== null,
       '6.19b the exemption is narrow — a genuine top-level DOM read still throws (' + caught + ')');
    eq(probeTouched[0], 'document', '6.19c …and `document` is the offending name reported');
  }
  eq(Object.keys(sandbox).length, 20, '6.20 loading the panel defines exactly the 20 functions and nothing else');
  deepEq(Object.keys(sandbox).sort(), UI_PANEL_NAMES.slice().sort(), '6.21 …and they are exactly the UI_PANEL set');
  ok(Object.keys(sandbox).every((k) => typeof sandbox[k] === 'function'), '6.22 every name it defines is a function');
  eq(Object.keys(sandbox).filter((k) => sandbox[k].constructor && sandbox[k].constructor.name === 'AsyncFunction').length, 0,
     '6.23 the panel defines NO AsyncFunction — the family’s only async member is the scan orchestrator');
  // Arity is part of the relocation identity: a changed parameter list would survive a
  // name-only check but breaks the span hash AND shows up here.
  deepEq(UI_PANEL_SPANS.map((s) => s.name + '/' + sandbox[s.name].length),
    ['_sfsInit/0', '_sfs4hDetailMessage/1', '_sfsRender4hDetailState/1', '_sfsRsPanelMsg/2',
     '_sfsDrawRsPanel/5', '_sfsRenderProgress/0', '_sfsActivePanelTab/0', '_sfsTfToggle/1',
     '_sfsSetFilter/2', '_sfsSortBy/1', '_sfsRender/1', '_sfsToggleOverlay/0', '_sfsToggleChart/2',
     '_sfsOpenChart/1', '_sfsCloseChart/0', '_sfsUpdateSelectionVisual/1', '_sfsOpenSelectedChart/1',
     '_sfsInstallKeyboardNav/0', '_sfsDrawCharts/1', '_sfsDrawOneTf/8'],
    '6.24 every relocated function kept its exact arity');

  // Structural residual: mask the file, delete the 20 declaration spans, and nothing but
  // whitespace may remain.
  {
    let residual = maskSource(A.panelPart.code);
    for (const d of A.panelDecls.slice().sort((a, b) => b.start - a.start)) {
      residual = residual.slice(0, d.start) + residual.slice(d.end);
    }
    eq(residual.replace(/\s/g, ''), '', '6.25 the file is EXACTLY comments + the 20 declarations — no top-level code');
  }
  // Static surface. NOTE what is deliberately absent from this list compared with the
  // service's: DOM access, listener registration and timer creation. Those are this
  // module's JOB; forbidding them outright would be false, and the residual check above
  // is what proves none of them runs at load. What IS forbidden is transport, storage,
  // module syntax and any window/globalThis write.
  const pmasked = maskSource(A.panelPart.code);
  const PANEL_FORBIDDEN = [
    ['import', /\bimport\b/], ['export', /\bexport\b/], ['require(', /\brequire\s*\(/],
    ['class wrapper', /\bclass\b/], ['"use strict"', /['"]use strict['"]/],
    ['network', /\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|AbortController/],
    ['storage', /(?:local|session)Storage/],
    ['window/globalThis write', /\b(?:window|globalThis)\s*\.\s*[A-Za-z0-9_$]+\s*=(?!=)/],
  ];
  for (const [label, re] of PANEL_FORBIDDEN) ok(!re.test(pmasked), '6.26 the UI panel contains no ' + label);
  // …and the positive half: the DOM work really is there, so 6.25 is proving something.
  ok(/getElementById|querySelector/.test(pmasked), '6.27 the panel really does contain DOM access (inside bodies)');
  ok(/set(?:Timeout|Interval)\s*\(/.test(pmasked), '6.28 …and timer creation (inside bodies)');
  ok(/addEventListener\s*\(/.test(pmasked), '6.29 …and listener registration (inside bodies)');
  note('UI panel module is ' + A.panelPart.code.length + ' bytes, ' +
       A.panelPart.code.split('\n').length + ' lines, ' + A.panelDecls.length + ' declarations');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7 — THE LOAD-ORDER PREDICATE, DEMONSTRATED BY EXECUTION
//
// The predicate is derived, not guessed:
//   • upstream — the module has NO free identifiers (section 5.7), so nothing
//     needs to precede it: it has no dependency to be ordered after.
//   • downstream — its consumers (the four sfs-candle-* modules and the 29 SFS
//     declarations still inline) resolve these names GLOBALLY at CALL time, and
//     the earliest call is reachable the moment the monolith finishes executing,
//     because the monolith is what registers the app's entry points.
//   ⇒ the module must be evaluated BEFORE the inline monolith.
//
// Below, that boundary is simulated with the REAL consumer: the shipped
// _sfsQueueWarmupSymbols from js/services/sfs-candle-warmup.js is invoked at the
// monolith's slot. In the recommended order it queues; in a realistic wrong order
// (tag after the monolith — which is also what `defer` produces) the very same
// real function throws on the very same real binding.
// ═════════════════════════════════════════════════════════════════════════════
section('7. LOAD ORDER — recommended PASS, realistic wrong order FAIL');
{
  const WARMUP_SRC = fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-warmup.js'), 'utf8');
  const PRED_SRC = fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-predicates.js'), 'utf8');

  // Evaluate a load sequence. `slots` lists what runs, in order; 'CALL' is the
  // monolith boundary — the first instant a consumer can run.
  function runSequence(slots) {
    const sent = [];
    const sb = {
      console: { log() {}, warn() {} }, JSON, Object, Math, Array, String, Number, isFinite, Promise, RegExp,
      Date: { now: () => 1700000000000 },
      setTimeout: () => 1, clearTimeout() {},
      debugLog() {}, debugWarn() {},
      BACKEND: 'https://backend.test',
      S: { backendKey: 'K', dxlinkStatus: {} },
      _backendAuthHeaders: (h) => h || {},
      _recordCandleSubscriptionRequest: (m) => sent.push(m),
      fetch: () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }),
    };
    vm.createContext(sb);
    let outcome = null;
    for (const slot of slots) {
      if (slot === 'CONFIG') { vm.runInContext(A.configPart.code, sb); continue; }
      if (slot === 'PREDICATES') { vm.runInContext(PRED_SRC, sb); continue; }
      if (slot === 'WARMUP') { vm.runInContext(WARMUP_SRC, sb); continue; }
      if (slot === 'CALL') {
        try { sb._sfsQueueWarmupSymbols(['AAPL'], ['1D'], 'probe'); outcome = { ok: true, queued: sb._sfsWarmupQueue.length }; }
        catch (e) { outcome = { ok: false, error: String(e && e.message) }; }
      }
    }
    return outcome;
  }

  const good = runSequence(['CONFIG', 'PREDICATES', 'WARMUP', 'CALL']);
  ok(good && good.ok === true, '7.1 RECOMMENDED order (config/state → consumers → monolith): the real consumer runs');
  eq(good && good.queued, 1, '7.2 …and the real warmup queue actually accepts the symbol');

  const late = runSequence(['PREDICATES', 'WARMUP', 'CALL', 'CONFIG']);
  ok(late && late.ok === false, '7.3 WRONG order (tag after the monolith — what `defer` also produces): the SAME real consumer FAILS');
  ok(late && CONFIG_STATE_NAMES.some((n) => String(late.error).indexOf(n) >= 0),
     '7.4 …and it fails ON A RELOCATED BINDING BY NAME: ' + (late && late.error));
  note('recommended → ' + JSON.stringify(good) + ' | wrong → ' + JSON.stringify(late));

  // The tag itself carries none of the attributes that would produce that order.
  const me = SCRIPT_MODEL.filter((s) => s.src === CONFIG_STATE_TAG)[0];
  ok(me && !me.defer && !me.async && !me.nomodule && (me.type == null || me.type.trim() === ''),
     '7.5 the shipped tag is src-only: no type, defer, async or nomodule');
}

// ── the SCAN SERVICE boundary, proved the same way ──────────────────────────
//
// The service must precede the monolith, and unlike PR 1 the reason is an
// EVALUATION-time read, not a call-time one. While the monolith is still
// evaluating it runs, verbatim:
//
//   try { if (typeof window !== 'undefined') window.apexDebugSfsDetailChart = apexDebugSfsDetailChart; } catch (e) {}
//
// which reads a binding this module declares. The try/catch is why this must be
// tested by EXECUTION rather than reasoned about: in the wrong order it does NOT
// throw — the ReferenceError is swallowed and the debug handle is silently never
// exposed. A test that only asserted "no exception" would pass on the broken order.
//
// Everything else the service offers is reached at CALL time, so it imposes no
// further ordering. That distinction is asserted below, not assumed: with the
// service loaded LAST, the call-time consumer still works.
{
  const EXPOSURE = "try { if (typeof window !== 'undefined') window.apexDebugSfsDetailChart = apexDebugSfsDetailChart; } catch (e) { /* non-browser context */ }";
  ok(A.inlinePart.code.indexOf(EXPOSURE) >= 0, '7.6 the real exposure statement is present inline, verbatim');

  function runService(slots) {
    const win = {};
    const sb = {
      console: { log() {}, warn() {} }, JSON, Object, Math, Array, String, Number, isFinite, parseFloat,
      Promise, RegExp, Date: { now: () => 1700000000000 }, setTimeout: () => 1, clearTimeout() {},
      window: win, S: { squeezeFireScanner: { chartCacheCandles: {}, chartSymbol: null } },
      _sfsCandlesUsable: (c) => !!(c && c.length),
    };
    vm.createContext(sb);
    for (const slot of slots) {
      if (slot === 'CONFIG') { vm.runInContext(A.configPart.code, sb); continue; }
      if (slot === 'SERVICE') { vm.runInContext(A.servicePart.code, sb); continue; }
      if (slot === 'EXPOSE') { vm.runInContext(EXPOSURE, sb); continue; }
    }
    return { exposed: typeof win.apexDebugSfsDetailChart };
  }

  const good = runService(['CONFIG', 'SERVICE', 'EXPOSE']);
  eq(good.exposed, 'function', '7.7 RECOMMENDED order (config → service → monolith): the debug handle IS exposed');
  const late = runService(['CONFIG', 'EXPOSE', 'SERVICE']);
  eq(late.exposed, 'undefined',
     '7.8 WRONG order (service after the monolith — what `defer` also produces): the exposure SILENTLY fails');
  note('service load order → recommended exposes ' + good.exposed + ' | wrong exposes ' + late.exposed);

  // …and the call-time half of the distinction: a consumer that only CALLS a service
  // function works regardless of which of the two scripts is evaluated first, which is
  // why this contract does NOT claim a load dependency for those.
  function runCallTime(serviceFirst) {
    const sb = {
      console: { log() {}, warn() {} }, JSON, Object, Math, Array, String, Number, isFinite, parseFloat,
      Promise, RegExp, setTimeout: (fn) => { fn(); return 1; }, clearTimeout() {},
      S: { squeezeFireScanner: { chartCacheCandles: { AAPL: { '1D': [{ close: 5 }] } } } },
      _sfsCandlesUsable: (c) => !!(c && c.length),
    };
    vm.createContext(sb);
    const consumer = 'function probe() { return _sfsCandlesFromSyncSource("AAPL", "1D"); }';
    if (serviceFirst) { vm.runInContext(A.servicePart.code, sb); vm.runInContext(consumer, sb); }
    else { vm.runInContext(consumer, sb); vm.runInContext(A.servicePart.code, sb); }
    try { return { ok: true, path: sb.probe().path }; } catch (e) { return { ok: false, error: String(e && e.message) }; }
  }
  deepEq(runCallTime(true), { ok: true, path: 'sfsCache' }, '7.9 a CALL-time consumer works with the service loaded first');
  deepEq(runCallTime(false), { ok: true, path: 'sfsCache' },
     '7.10 …and equally with the service loaded second — call-time use imposes no load order');

  const svcTag = SCRIPT_MODEL.filter((s) => s.src === SCAN_SERVICE_TAG)[0];
  ok(svcTag && !svcTag.defer && !svcTag.async && !svcTag.nomodule && (svcTag.type == null || svcTag.type.trim() === ''),
     '7.11 the scan-service tag is src-only: no type, defer, async or nomodule');
}

// ── the UI PANEL boundary — and an HONEST account of what kind of boundary it is
//
// PR 2's boundary was an EVALUATION-time dependency: the monolith reads
// apexDebugSfsDetailChart while it is still evaluating. PR 3's is NOT, and this
// section says so rather than borrowing PR 2's argument.
//
// Measured on the base: the monolith names exactly two of the 20 outside a function
// declaration, and BOTH are inside callbacks it merely REGISTERS at load —
//     document.getElementById('launchBtn').addEventListener('click', async function(){ … _sfsInit(); … })
//     window.addEventListener('resize', function(){ … _sfsDrawCharts(…) … })
// Neither runs while the monolith evaluates. So there is no load-time read to break,
// and claiming one would be a fabricated dependency.
//
// What IS real, and what is proved by execution below:
//   • the panel's OWN dependencies are all call-time, so the family ordering above is
//     coherence, not necessity — demonstrated by loading the panel FIRST and LAST and
//     getting the same result;
//   • the tag must EXIST. With the panel absent, the real launch-handler path throws a
//     ReferenceError naming _sfsInit — that is the genuine failure mode this placement
//     prevents, and it is what the "panel tag absent" mutant in §10 kills.
{
  // The two real call sites, verbatim from the monolith, so this cannot drift.
  const INIT_CALL_SITE = "  _sfsInit();\n";
  const RESIZE_CALLBACK = "_sfsDrawCharts(S.squeezeFireScanner.chartSymbol);";
  ok(A.inlinePart.code.indexOf(INIT_CALL_SITE) >= 0, '7.12 the real _sfsInit() call site is present inline, verbatim');
  ok(A.inlinePart.code.indexOf(RESIZE_CALLBACK) >= 0, '7.13 the real resize-callback _sfsDrawCharts call is present inline, verbatim');
  {
    // THE MEASUREMENT THAT DECIDES WHAT KIND OF BOUNDARY THIS IS.
    //
    // For every reference to one of the 20 anywhere in the monolith, classify it by
    // FUNCTION-BODY DEPTH: a reference at depth 0 that is not itself inside a top-level
    // declaration would execute while the monolith evaluates, and would make this a
    // load-time dependency. A reference at depth > 0 — inside a callback or inside
    // another function's body — is reached only when that function is called.
    //
    // The depth is computed properly rather than guessed: scan the MASKED monolith and
    // push a frame for every `{`, marking it a FUNCTION frame when the brace is opened
    // by `function (…)` or by `=>`. Anything else (an object literal, a block, an `if`)
    // is not a function frame and does not defer execution.
    const isIdent = (c) => /[A-Za-z0-9_$]/.test(c);
    function functionDepthAt(masked) {
      const depth = new Int32Array(masked.length);
      const stack = [];
      let fnFrames = 0;
      for (let i = 0; i < masked.length; i++) {
        depth[i] = fnFrames;
        const c = masked[i];
        if (c === '{') {
          // Walk back over whitespace to the char that opened this brace.
          let j = i - 1;
          while (j >= 0 && /\s/.test(masked[j])) j--;
          let isFn = false;
          if (j >= 1 && masked[j] === '>' && masked[j - 1] === '=') {
            isFn = true;                                    // arrow function body
          } else if (j >= 0 && masked[j] === ')') {
            // Match the parameter list back to its `(`, then read the identifier run
            // immediately before it. For `function (…) {` that run IS the keyword; for
            // `function name(…) {` it is the name and the keyword is the run before it.
            // Both shapes must be recognised — the monolith's callbacks are anonymous.
            let p = 1, k = j - 1;
            while (k >= 0 && p > 0) { if (masked[k] === ')') p++; else if (masked[k] === '(') p--; k--; }
            const readIdentBack = (from) => {
              let q = from;
              while (q >= 0 && (/\s/.test(masked[q]) || masked[q] === '*')) q--;   // also skips `function*`
              const end = q + 1;
              while (q >= 0 && isIdent(masked[q])) q--;
              return { word: masked.slice(q + 1, end), next: q };
            };
            const first = readIdentBack(k);
            if (first.word === 'function') isFn = true;
            else if (first.word !== '' && readIdentBack(first.next).word === 'function') isFn = true;
          }
          stack.push(isFn);
          if (isFn) fnFrames++;
        } else if (c === '}') {
          const was = stack.pop();
          if (was) fnFrames--;
        }
      }
      return depth;
    }
    const DEPTH = functionDepthAt(MONOLITH_MASKED);
    // Sanity: the scanner must actually see function frames, or "depth 0 everywhere"
    // would make the check below vacuously pass.
    ok(DEPTH.some((d) => d > 0), '7.14a the function-depth scanner really does find function bodies');
    const inlineSpans = A.inlinePart.decls.map((d) => [d.start, d.end]);
    const insideADeclaration = (i) => inlineSpans.some(([s, e]) => i >= s && i < e);
    const evalTime = [], callTime = [];
    for (const n of UI_PANEL_NAMES) {
      const re = new RegExp('(?<![A-Za-z0-9_$.])' + n + '(?![A-Za-z0-9_$])', 'g');
      let m;
      while ((m = re.exec(MONOLITH_MASKED)) !== null) {
        const rec = n + '@' + m.index;
        if (DEPTH[m.index] > 0 || insideADeclaration(m.index)) callTime.push(rec); else evalTime.push(rec);
      }
    }
    deepEq(evalTime, [],
      '7.14 ZERO references to the 20 execute at monolith EVALUATION time — this is a call-time boundary, not a load-time one');
    ok(callTime.length >= 2, '7.15a the monolith really does reference the panel (' + callTime.length + ' call-time references)');
    // The two documented top-level-statement callbacks are among them.
    const topLevelCallbacks = callTime.filter((r) => !insideADeclaration(Number(r.split('@')[1])));
    deepEq(Array.from(new Set(topLevelCallbacks.map((r) => r.split('@')[0]))).sort(), ['_sfsDrawCharts', '_sfsInit'],
      '7.15 the two references in top-level STATEMENTS are exactly the recorded launch and resize callbacks');
    note('monolith → panel references: ' + callTime.length + ' call-time, ' + evalTime.length + ' evaluation-time');
  }

  // Executable half. `slots` is a load sequence; 'CALL' is the instant a registered
  // callback fires, which is the earliest any of the 20 can be reached.
  function runPanel(slots) {
    const els = {};
    const fakeEl = () => ({ innerHTML: '', textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {} },
      querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, appendChild() {}, insertAdjacentHTML() {} });
    const sb = {
      console: { log() {}, warn() {}, error() {} }, JSON, Object, Math, Array, String, Number,
      isFinite, isNaN, parseFloat, parseInt, Promise, RegExp, Error, Date,
      setTimeout: () => 1, clearTimeout() {},
      document: {
        getElementById: (id) => (els[id] || (els[id] = fakeEl())),
        querySelector: () => null, querySelectorAll: () => [],
        createElement: () => fakeEl(), addEventListener() {}, body: fakeEl(),
      },
      window: { addEventListener() {} },
      S: { squeezeFireScanner: { chartSymbol: null, chartCacheCandles: {}, results: [], filters: { timeframes: { '1D': true, '4H': false }, strength: 'both', direction: 'both', search: '' }, chartOverlay: { sma8: true }, selectedIndex: -1 } },
      ffSqueezeFireScanner: () => true,
    };
    vm.createContext(sb);
    let outcome = null;
    for (const slot of slots) {
      if (slot === 'CONFIG') { vm.runInContext(A.configPart.code, sb); continue; }
      if (slot === 'PANEL') { vm.runInContext(A.panelPart.code, sb); continue; }
      if (slot === 'CALL') {
        try { sb._sfsInit(); outcome = { ok: true }; }
        catch (e) { outcome = { ok: false, error: String(e && e.message) }; }
      }
    }
    return outcome;
  }

  const withPanel = runPanel(['CONFIG', 'PANEL', 'CALL']);
  ok(withPanel && withPanel.ok === true,
     '7.16 SHIPPED order (config/state → … → panel → monolith): the real _sfsInit runs at the callback instant' +
     (withPanel && withPanel.error ? ' — ' + withPanel.error : ''));
  const panelLast = runPanel(['CONFIG', 'CALL', 'PANEL']);
  ok(panelLast && panelLast.ok === false, '7.17 with the panel not yet evaluated, the SAME real call FAILS');
  ok(panelLast && String(panelLast.error).indexOf('_sfsInit') >= 0,
     '7.18 …and it fails ON A RELOCATED DECLARATION BY NAME: ' + (panelLast && panelLast.error));
  // The honest distinction, stated as a test rather than a comment: the panel's own
  // dependencies are call-time, so its position RELATIVE TO ITS OWN DEPENDENCIES is not
  // load-critical — only its position relative to the monolith that registers the
  // callbacks is. Loading it BEFORE the config/state module it writes still works.
  const panelFirst = runPanel(['PANEL', 'CONFIG', 'CALL']);
  ok(panelFirst && panelFirst.ok === true,
     '7.19 the panel loaded BEFORE its own config/state dependency still works — its dependencies are CALL-time');
  note('panel load order → shipped ' + JSON.stringify(withPanel) + ' | panel-last ' + JSON.stringify(panelLast));

  const panelTag = SCRIPT_MODEL.filter((s) => s.src === UI_PANEL_TAG)[0];
  ok(panelTag && !panelTag.defer && !panelTag.async && !panelTag.nomodule && (panelTag.type == null || panelTag.type.trim() === ''),
     '7.20 the UI panel tag is src-only: no type, defer, async or nomodule');
  {
    const attrNames = (panelTag.attrs.match(/([A-Za-z-]+)\s*=/g) || []).map((a) => a.replace(/\s*=$/, '').toLowerCase());
    deepEq(attrNames, ['src'], '7.21 the UI panel tag carries ONLY src');
  }
  ok(panelTag && panelTag.order < SCRIPT_MODEL.filter((s) => !s.src && s.inlineLength > 100000)[0].order,
     '7.22 the UI panel tag precedes the inline monolith that registers its callers');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8 — BEHAVIOURAL PARITY, BASE vs HEAD
//
// The relocation changed exactly one thing: WHICH script evaluates the 33
// declarations. So parity is measured on that axis, with the real code on both
// sides — the base declarations come from the base index.html itself (via git),
// and the head declarations from the shipped module. Both are then driven
// through the REAL warmup coordinator and the REAL SPY/detail state surface.
// ═════════════════════════════════════════════════════════════════════════════
section('8. BEHAVIOURAL PARITY — base declarations vs relocated declarations');
{
  // Recover the base spans. Preferred source: the base index.html in git.
  let baseSpans = null, baseFrom = null;
  if (GIT_OK) {
    try {
      const baseRef = git(['rev-list', '--max-parents=2', '-n', '1', 'HEAD']).trim();
      const candidates = [];
      try { candidates.push(git(['merge-base', 'HEAD', 'origin/dev-clean']).trim()); } catch (_) {}
      candidates.push(baseRef);
      for (const ref of candidates) {
        if (!ref) continue;
        let blob;
        try { blob = git(['show', ref + ':index.html']); } catch (_) { continue; }
        const scripts = blob.split('<script');
        if (blob.indexOf('var SFS_BATCH_SIZE') < 0) continue;   // already extracted at that ref
        const found = {};
        let all = true;
        for (const name of CONFIG_STATE_NAMES) {
          const re = new RegExp('(?:^|\\n)(var\\s+' + name.replace(/\$/g, '\\$') + '\\s*=[^\\n;]*;)');
          const m = re.exec(blob);
          if (!m) { all = false; break; }
          found[name] = m[1];
        }
        if (all && scripts.length) { baseSpans = found; baseFrom = ref; break; }
      }
    } catch (_) { /* fall through */ }
  }
  if (!baseSpans) {
    // git unavailable, or the base already carries the extraction: fall back to
    // the recorded SHA-256 identity, which is the same guarantee by other means.
    baseSpans = {};
    for (const d of A.configDecls) baseSpans[d.name] = A.configPart.code.slice(d.start, d.end);
    baseFrom = '(recorded span hashes)';
  }
  note('base declarations recovered from ' + baseFrom);

  // Identity first: the base text of every span equals the shipped text.
  {
    const differing = A.configDecls
      .filter((d) => baseSpans[d.name] !== A.configPart.code.slice(d.start, d.end))
      .map((d) => d.name);
    deepEq(differing, [], '8.1 every relocated declaration is textually identical to its base span');
  }

  const BASE_BLOCK = CONFIG_STATE_NAMES.map((n) => baseSpans[n]).join('\n');
  const WARMUP_SRC = fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-warmup.js'), 'utf8');
  const PRED_SRC = fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-predicates.js'), 'utf8');
  const SPY_SRC = fs.readFileSync(path.join(ROOT, 'js/services/sfs-candle-spy-read.js'), 'utf8');

  // Drive the real coordinator and record every observable the plan names.
  function observe(declarationSource) {
    const timers = [], cleared = [], requests = [], diag = [], domWrites = [], windowWrites = [];
    let timerSeq = 0;
    const sb = {
      console: { log() {}, warn() {} }, JSON, Object, Math, Array, String, Number, isFinite, Promise, RegExp,
      Date: { now: () => 1700000000000 },
      setTimeout: (fn, ms) => { timers.push(ms); return ++timerSeq; },
      clearTimeout: (h) => { cleared.push(h); },
      debugLog() {}, debugWarn() {},
      BACKEND: 'https://backend.test',
      S: { backendKey: 'K', dxlinkStatus: {}, squeezeFireScanner: { chartCacheCandles: {} } },
      _backendAuthHeaders: (h) => h || {},
      _recordCandleSubscriptionRequest: (m) => diag.push(m),
      document: new Proxy({}, { get() { domWrites.push('document access'); return () => null; } }),
      window: new Proxy({}, { set(t, k) { windowWrites.push(String(k)); return true; }, get() { return undefined; } }),
      fetch: (url, init) => {
        requests.push({ url: String(url), method: (init && init.method) || 'GET', body: (init && init.body) || null });
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }) });
      },
    };
    vm.createContext(sb);
    vm.runInContext(declarationSource, sb);
    const initial = {};
    for (const n of CONFIG_STATE_NAMES) initial[n] = sb[n];
    const initialSnapshot = JSON.parse(JSON.stringify(initial, (k, v) => (v === undefined ? '<undefined>' : v)));
    vm.runInContext(PRED_SRC, sb);
    vm.runInContext(WARMUP_SRC, sb);
    vm.runInContext(SPY_SRC, sb);

    // queue + dedupe + drain-timer semantics, exercised through the real functions
    const q1 = sb._sfsQueueWarmupSymbols(['AAPL', 'MSFT'], ['1D'], 'probe');
    const q2 = sb._sfsQueueWarmupSymbols(['AAPL', 'MSFT'], ['1D'], 'probe');   // same key → deduped
    const q3 = sb._sfsQueueWarmupSymbols(['TSLA'], ['4H'], 'probe');
    const afterQueue = {
      returns: [q1, q2, q3],
      queueLength: sb._sfsWarmupQueue.length,
      queueKeys: Object.keys(sb._sfsWarmupQueuedKeys).sort(),
      drainTimerSet: sb._sfsWarmupDrainTimer !== null,
      lastSentAt: sb._sfsWarmupLastSentAt,
    };
    // cooldown / in-flight / cache maps, written through the real SPY resolver path
    sb._sfsSpyReadCooldown['1D'] = 1700000000000;
    sb._sfsPromoteSpyCandles('1D', [{ close: 1 }], 'probe');
    const afterSpy = {
      cooldownKeys: Object.keys(sb._sfsSpyReadCooldown).sort(),
      inflightKeys: Object.keys(sb._sfsSpyReadInflight).sort(),
      cachePromoted: JSON.stringify(sb.S.squeezeFireScanner.chartCacheCandles),
      diagCount: diag.length,
    };
    return {
      initial: initialSnapshot,
      config: CONFIG_STATE_NAMES.filter((n) => /^SFS_/.test(n)).map((n) => n + '=' + JSON.stringify(sb[n])),
      afterQueue, afterSpy,
      timers, cleared,
      requests: requests.map((r) => r.method + ' ' + r.url + ' ' + (r.body ? sha256(String(r.body)).slice(0, 16) : '-')),
      domWrites, windowWrites,
      bindingsDefined: CONFIG_STATE_NAMES.filter((n) => sb[n] !== undefined).length,
    };
  }

  const base = observe(BASE_BLOCK);
  const head = observe(A.configPart.code);
  deepEq(head.initial, base.initial, '8.2 initial state of all 33 bindings is identical');
  deepEq(head.config, base.config, '8.3 every config value is identical');
  deepEq(head.afterQueue, base.afterQueue, '8.4 queue / dedupe / drain-timer semantics are identical');
  deepEq(head.afterSpy, base.afterSpy, '8.5 cooldown / in-flight / cache semantics are identical');
  deepEq(head.timers, base.timers, '8.6 timer registry is identical');
  deepEq(head.cleared, base.cleared, '8.7 timer clears are identical');
  deepEq(head.requests, base.requests, '8.8 request-generation identity is identical');
  deepEq(head.domWrites, base.domWrites, '8.9 DOM writes are identical (and empty)');
  deepEq(head.windowWrites, base.windowWrites, '8.10 window exposure at load is identical (and empty)');
  eq(head.bindingsDefined, 33, '8.11 all 33 bindings are defined after load');
  eq(base.bindingsDefined, 33, '8.12 …exactly as they were before the relocation');
  note('parity observables compared: ' + Object.keys(head).length + ' groups');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8B — BEHAVIOURAL PARITY OF THE 9 SCAN-SERVICE FUNCTIONS
//
// PR 2 moved FUNCTIONS, not literals, so parity has to be measured by RUNNING
// them. The rule is: never mock the function under test. Both sides run the REAL
// declarations — the BASE side recovered from the base index.html via git, the
// HEAD side taken from the shipped module — inside identical sandboxes whose only
// stubs are EXTERNAL owners the service legitimately calls (S, WL, the indicator
// helpers, the candle transport, the panel renderers, timers).
//
// _sfsRunScan gets the deepest treatment (§24 of the plan): thirteen fixtures
// covering empty universe, success, mixed failure, cancellation before and during
// the scan, multiple batches, both timeframes, unusable candles, scoring, the
// sort/filter handoff and the renderer callback. Every observable is recorded as
// an ORDERED transcript, so a change in call order, batch sequence, await
// boundary or state-mutation order fails even when the final state matches.
// ═════════════════════════════════════════════════════════════════════════════
section('8B. BEHAVIOURAL PARITY — the 9 relocated functions, base vs head');
const SERVICE_PARITY = (function () {
  // ── recover the BASE declarations ─────────────────────────────────────────
  let baseBlock = null, baseFrom = null;
  if (GIT_OK) {
    const candidates = [];
    try { candidates.push(git(['merge-base', 'HEAD', 'origin/dev-clean']).trim()); } catch (_) {}
    try { candidates.push(git(['rev-list', '--max-parents=2', '-n', '1', 'HEAD']).trim()); } catch (_) {}
    for (const ref of candidates) {
      if (!ref) continue;
      let blob;
      try { blob = git(['show', ref + ':index.html']); } catch (_) { continue; }
      if (blob.indexOf('function _sfsAnalyzeSymbolTimeframe(') < 0) continue;   // already extracted there
      const tags = parseScriptTags(blob).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
      if (tags.length !== 1) continue;
      const mono = tags[0].inline;
      const decls = scanTopLevelDeclarations(mono, maskSource(mono))
        .filter((d) => SCAN_SERVICE_NAMES.indexOf(d.name) >= 0)
        .sort((a, b) => a.start - b.start);
      if (decls.length !== 9) continue;
      baseBlock = decls.map((d) => mono.slice(d.start, d.end)).join('\n\n');
      baseFrom = ref;
      break;
    }
  }
  if (!baseBlock) {
    // git unavailable or the base already carries the extraction: fall back to the
    // shipped module, whose byte-identity to the base is proved by §2.10b.
    baseBlock = A.serviceDecls.map((d) => A.servicePart.code.slice(d.start, d.end)).join('\n\n');
    baseFrom = '(recorded span hashes)';
  }
  note('base declarations recovered from ' + baseFrom);
  return { baseBlock, baseFrom, headBlock: A.servicePart.code };
})();

{
  const { baseBlock, headBlock } = SERVICE_PARITY;

  // A candle series long enough to clear SFS_MIN_BARS_1D, shaped so the indicator
  // helpers below produce a deterministic post-squeeze bullish fire.
  function candles(n, opts) {
    const o = opts || {};
    const out = [];
    let c = 100;
    for (let i = 0; i < n; i++) {
      c += (i > n - 6 && o.breakout !== false) ? 2.5 : 0.05;
      out.push({ time: 1700000000000 + i * 86400000, open: c - 0.1, high: c + 0.4, low: c - 0.4, close: c, volume: 1000 + i });
    }
    return out;
  }

  // Build one sandbox. `log` is the ordered transcript of everything the service
  // does to the outside world. ONLY external owners are stubbed.
  function makeSandbox(scenario) {
    const log = [];
    const sfs = {
      active: false, running: false, cancelled: false, results: [], lastRunAt: null,
      progress: null, chartSymbol: scenario.chartSymbol || null, chartCacheCandles: {},
      filters: {
        timeframes: scenario.timeframes || { '1D': true, '4H': false },
        strength: 'both', direction: 'both', search: '',
      },
      chartOverlay: { sma8: true }, selectedIndex: -1,
    };
    const sb = {
      console: { log() {}, warn() {} }, JSON, Object, Math, Array, String, Number,
      isFinite, isNaN, parseFloat, parseInt, Promise, RegExp, Error,
      Date: function () { return { __date: true }; },
      setTimeout: (fn, ms) => { log.push('setTimeout:' + ms); if (scenario.runTimers !== false) fn(); return 1; },
      clearTimeout: () => {},
      S: { squeezeFireScanner: sfs },
      WL: (scenario.universe || []).map((t) => ({ t })),
      // ── external owners, stubbed ────────────────────────────────────────────
      ffSqueezeFireScanner: () => scenario.ff !== false,
      showToast: (m, k) => { log.push('showToast:' + k + ':' + m); },
      _sfsRender: (opts) => { log.push('_sfsRender:' + JSON.stringify(opts || null)); },
      _sfsRenderProgress: () => { log.push('_sfsRenderProgress:' + sfs.progress.done + '/' + sfs.progress.total); },
      _recordCandleSubscriptionRequest: (m) => { log.push('subReq:' + m.requester + ':' + m.action); },
      _sfsCandlesUsable: (c) => !!(c && c.length),
      _rsGetDailyCandles: (s) => (scenario.dailyBuffer || {})[s] || null,
      getFourHourCandles: (s) => (scenario.fourHourBuffer || {})[s] || null,
      resolveLatestDisplayPrice: (s) => (scenario.displayPrice ? scenario.displayPrice(s) : null),
      // indicator helpers — deterministic stand-ins with the real shapes
      smA: (a, p) => a.map((_, i) => (i >= p - 1 ? a.slice(i - p + 1, i + 1).reduce((x, y) => x + y, 0) / p : null)),
      // rsi is scenario-tunable so a fixture can land on a BORDERLINE score: with
      // rsi 62 the analyser earns 3 points, with 57 only 2. That is what separates
      // the `pts >= 3 ? STRONG : WEAK` threshold from a `pts >= 2` mutant.
      calcRSIWilder: (a) => a.map((_, i) => (i < 14 ? null : (scenario.rsi == null ? 62 : scenario.rsi))),
      calcBB: (a) => ({ upper: a.map((v) => v - 1), lower: a.map((v) => v - 5), mid: a.map((v) => v - 3) }),
      calcKC: () => ({ upper: [], lower: [] }),
      calcSqueeze: (bb) => bb.upper.map((_, i) => (i < bb.upper.length - 4)),
      _sfsFetchBackendCandles: (sym, tf) => {
        log.push('fetchCandles:' + sym + ':' + tf);
        if (scenario.cancelDuring && log.filter((l) => l.indexOf('fetchCandles:') === 0).length >= scenario.cancelDuring) {
          sfs.cancelled = true;
        }
        const fail = (scenario.failFor || []).indexOf(sym) >= 0;
        if (fail) return Promise.resolve({ ok: false, reason: 'unusable' });
        const arr = (scenario.unusableFor || []).indexOf(sym) >= 0 ? [] : candles(scenario.bars || 90);
        return Promise.resolve({ ok: true, candles: arr });
      },
    };
    sb.window = undefined;
    vm.createContext(sb);
    return { sb, log, sfs };
  }

  // Run one scenario against a declaration source and return its transcript.
  async function observe(declSource, scenario) {
    const { sb, log, sfs } = makeSandbox(scenario);
    vm.runInContext(declSource, sb);
    const out = { log, calls: [] };
    try {
      const r = await scenario.drive(sb, sfs);
      out.result = r === undefined ? '<undefined>' : JSON.parse(JSON.stringify(r, (k, v) => (typeof v === 'function' ? '<fn>' : v)));
    } catch (e) {
      out.threw = String(e && e.message);
    }
    out.state = {
      running: sfs.running, cancelled: sfs.cancelled, active: sfs.active,
      resultCount: sfs.results.length,
      resultKeys: sfs.results.map((r) => r.symbol + '|' + r.timeframe + '|' + r.direction + '|' + r.strength + '|' + r.score),
      progress: sfs.progress, lastRunAtSet: sfs.lastRunAt !== null,
      cacheSymbols: Object.keys(sfs.chartCacheCandles).sort(),
    };
    // Objects the service creates live in the vm's realm, so their prototype is that
    // realm's Object.prototype and deepStrictEqual would reject them as cross-realm
    // even when every value matches. Normalise both sides through JSON so the
    // comparison is about VALUES, which is what parity means here.
    return JSON.parse(JSON.stringify(out));
  }

  const SCENARIOS = [
    // ── _sfsRunScan — the deep set ─────────────────────────────────────────
    { id: 'runScan/empty universe', universe: [], drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/feature flag off', universe: ['AAPL'], ff: false, drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/no timeframe selected', universe: ['AAPL'], timeframes: { '1D': false, '4H': false }, drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/one symbol success', universe: ['AAPL'], drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/mixed success and failure', universe: ['AAPL', 'MSFT', 'TSLA'], failFor: ['MSFT'], drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/unusable candles', universe: ['AAPL', 'MSFT'], unusableFor: ['MSFT'], drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/insufficient bars', universe: ['AAPL'], bars: 20, drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/cancelled before start', universe: ['AAPL', 'MSFT'], drive: (sb, sfs) => { sfs.cancelled = true; return sb._sfsRunScan(); } },
    { id: 'runScan/cancelled during scan', universe: ['A', 'B', 'C', 'D', 'E', 'F'], cancelDuring: 2, drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/already running is a no-op', universe: ['AAPL'], drive: (sb, sfs) => { sfs.running = true; return sb._sfsRunScan(); } },
    { id: 'runScan/multiple batches', universe: Array.from({ length: 45 }, (_, i) => 'S' + i), drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/1D + 4H both selected', universe: ['AAPL', 'MSFT'], timeframes: { '1D': true, '4H': true }, drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/4H only', universe: ['AAPL'], timeframes: { '1D': false, '4H': true }, drive: (sb) => sb._sfsRunScan() },
    { id: 'runScan/keepChart when a chart is open', universe: ['AAPL'], chartSymbol: 'AAPL', drive: (sb) => sb._sfsRunScan() },
    // ── _sfsCancelScan ─────────────────────────────────────────────────────
    { id: 'cancelScan/sets the flag', universe: [], drive: (sb, sfs) => { sb._sfsCancelScan(); return sfs.cancelled; } },
    { id: 'cancelScan/is idempotent', universe: [], drive: (sb, sfs) => { sb._sfsCancelScan(); sb._sfsCancelScan(); return sfs.cancelled; } },
    // ── _sfsAnalyzeSymbolTimeframe ─────────────────────────────────────────
    { id: 'analyze/too few candles', universe: [], drive: (sb) => sb._sfsAnalyzeSymbolTimeframe('AAPL', '1D', candles(10)) },
    { id: 'analyze/null candles', universe: [], drive: (sb) => sb._sfsAnalyzeSymbolTimeframe('AAPL', '1D', null) },
    { id: 'analyze/1D scoring', universe: [], drive: (sb) => sb._sfsAnalyzeSymbolTimeframe('AAPL', '1D', candles(90)) },
    { id: 'analyze/4H scoring', universe: [], drive: (sb) => sb._sfsAnalyzeSymbolTimeframe('AAPL', '4H', candles(70)) },
    { id: 'analyze/flat series', universe: [], drive: (sb) => sb._sfsAnalyzeSymbolTimeframe('AAPL', '1D', candles(90, { breakout: false })) },
    // Borderline: exactly 2 points, so STRONG/WEAK sits right on the >= 3 threshold.
    { id: 'analyze/borderline scoring lands on the STRONG threshold', universe: [], rsi: 57,
      drive: (sb) => sb._sfsAnalyzeSymbolTimeframe('AAPL', '1D', candles(90)) },
    { id: 'runScan/borderline scoring propagates to results', universe: ['AAPL'], rsi: 57, drive: (sb) => sb._sfsRunScan() },
    // ── _sfsGetFilteredResults ─────────────────────────────────────────────
    { id: 'filter/timeframe + strength + direction + search', universe: [], timeframes: { '1D': true, '4H': false }, drive: (sb, sfs) => {
      sfs.results = [
        { symbol: 'AAPL', timeframe: '1D', strength: 'STRONG', direction: 'BULLISH', score: 75 },
        { symbol: 'MSFT', timeframe: '4H', strength: 'WEAK', direction: 'BEARISH', score: 25 },
        { symbol: 'TSLA', timeframe: '1D', strength: 'WEAK', direction: 'BEARISH', score: 50 },
      ];
      const all = sb._sfsGetFilteredResults().map((r) => r.symbol);
      sfs.filters.timeframes = { '1D': true, '4H': true };
      const both = sb._sfsGetFilteredResults().map((r) => r.symbol);
      sfs.filters.strength = 'strong';
      const strong = sb._sfsGetFilteredResults().map((r) => r.symbol);
      sfs.filters.strength = 'both'; sfs.filters.direction = 'bearish';
      const bearish = sb._sfsGetFilteredResults().map((r) => r.symbol);
      sfs.filters.direction = 'both'; sfs.filters.search = ' tsl ';
      const searched = sb._sfsGetFilteredResults().map((r) => r.symbol);
      return { all, both, strong, bearish, searched };
    } },
    // ── _sfsSortResults ────────────────────────────────────────────────────
    { id: 'sort/every column, both directions', universe: [], drive: (sb) => {
      const rows = [
        { symbol: 'MSFT', timeframe: '4H', direction: 'BEARISH', strength: 'WEAK', fireBarsAgo: 3, rsi14: 40, score: 25 },
        { symbol: 'AAPL', timeframe: '1D', direction: 'BULLISH', strength: 'STRONG', fireBarsAgo: 1, rsi14: 62, score: 75 },
        { symbol: 'TSLA', timeframe: '1D', direction: 'BULLISH', strength: 'WEAK', fireBarsAgo: 2, rsi14: 55, score: 50 },
      ];
      const out = {};
      for (const col of ['symbol', 'timeframe', 'direction', 'strength', 'fireBarsAgo', 'rsi14', 'score', 'nonsense']) {
        for (const dir of ['desc', 'asc']) {
          sb._sfsSortCol = col; sb._sfsSortDir = dir;
          out[col + '/' + dir] = sb._sfsSortResults(rows).map((r) => r.symbol);
        }
      }
      // the sort must be non-destructive
      out.inputUnchanged = rows.map((r) => r.symbol);
      return out;
    } },
    // ── _sfsResolveRenderPrice ─────────────────────────────────────────────
    { id: 'price/resolver wins when it returns a price', universe: [], displayPrice: () => ({ price: 123.5, source: 'live' }),
      drive: (sb) => sb._sfsResolveRenderPrice('AAPL') },
    { id: 'price/falls back to 1D then 4H', universe: [], drive: (sb, sfs) => {
      const none = sb._sfsResolveRenderPrice('AAPL');
      sfs.chartCacheCandles.AAPL = { '4H': [{ close: '9.5' }] };
      const only4h = sb._sfsResolveRenderPrice('AAPL');
      sfs.chartCacheCandles.AAPL['1D'] = [{ close: '11.25' }];
      const prefers1d = sb._sfsResolveRenderPrice('AAPL');
      sfs.chartCacheCandles.AAPL['1D'] = [{ close: '0' }];
      const zeroSkipped = sb._sfsResolveRenderPrice('AAPL');
      return { none, only4h, prefers1d, zeroSkipped };
    } },
    // ── _sfsCandlesFromSyncSource ──────────────────────────────────────────
    { id: 'syncSource/cache hit, buffer promotion, miss', universe: [],
      dailyBuffer: { MSFT: [{ close: 5 }] }, fourHourBuffer: { TSLA: [{ close: 7 }] },
      drive: (sb, sfs) => {
        sfs.chartCacheCandles.AAPL = { '1D': [{ close: 1 }] };
        const cacheHit = sb._sfsCandlesFromSyncSource('AAPL', '1D');
        const promoted1d = sb._sfsCandlesFromSyncSource('MSFT', '1D');
        const promoted4h = sb._sfsCandlesFromSyncSource('TSLA', '4H');
        const miss = sb._sfsCandlesFromSyncSource('NVDA', '1D');
        return { cacheHit, promoted1d, promoted4h, miss, cacheAfter: Object.keys(sfs.chartCacheCandles).sort() };
      } },
    // ── _sfsSleep ──────────────────────────────────────────────────────────
    { id: 'sleep/registers a timer at CALL time and resolves', universe: [], drive: async (sb) => {
      await sb._sfsSleep(250);
      await sb._sfsSleep(-5);
      await sb._sfsSleep();
      return 'resolved';
    } },
    // ── apexDebugSfsDetailChart ────────────────────────────────────────────
    { id: 'debug/snapshot shape', universe: [], chartSymbol: 'CAT', drive: (sb, sfs) => {
      sb._sfsDetail4hResult = { CAT: { ok: true, status: 200, count: 3, reason: null, source: 'backend', warmupAttempted: true, warmupResponse: 'w', error: null } };
      sb._sfsDetail4hPhase = { CAT: 'ready' };
      sb._sfsDetail4hInflight = { 'CAT|4H': 1 };
      sb._sfsTfFetchInflight = { 'CAT|1D': 1 };
      sfs.chartCacheCandles.CAT = { '1D': [{ close: 1 }, { close: 2 }], '4H': [{ close: 3 }] };
      const selected = sb.apexDebugSfsDetailChart();
      const explicit = sb.apexDebugSfsDetailChart('CAT');
      const unknown = sb.apexDebugSfsDetailChart('ZZZ');
      return { selected, explicit, unknown };
    } },
  ];

  // The service reads the CONFIG_STATE bindings at call time, so both sides get the
  // real shipped config/state module — identical on both, since PR 2 does not touch it.
  const CONFIG_SRC = A.configPart.code;

  // Published so section 10's BEHAVIOUR mutants can re-run these very fixtures
  // against a MUTATED service and prove the comparison actually catches a change.
  SERVICE_PARITY.observe = observe;
  SERVICE_PARITY.SCENARIOS = SCENARIOS;
  SERVICE_PARITY.CONFIG_SRC = CONFIG_SRC;

  (async () => {
    const diffs = [];
    for (const sc of SCENARIOS) {
      const b = await observe(CONFIG_SRC + '\n' + baseBlock, sc);
      const h = await observe(CONFIG_SRC + '\n' + headBlock, sc);
      let same = true;
      try { assert.deepStrictEqual(h, b); } catch (_) { same = false; }
      ok(same, '8B.' + sc.id + ' — base and head behave identically' +
        (same ? '' : '\n        base: ' + JSON.stringify(b) + '\n        head: ' + JSON.stringify(h)));
      if (!same) diffs.push(sc.id);
    }
    eq(diffs.length, 0, '8B.parity zero behavioural differences across ' + SCENARIOS.length + ' fixtures');
    note('behavioural fixtures compared: ' + SCENARIOS.length + ' (' +
      SCENARIOS.filter((s) => s.id.indexOf('runScan/') === 0).length + ' of them _sfsRunScan deep-parity)');
    SERVICE_PARITY.ready = true;
    await PANEL_PARITY.run();
    PANEL_PARITY.ready = true;
    await runAllMutants();
    finish();
  })();
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8C — BEHAVIOURAL PARITY OF THE 20 UI-PANEL FUNCTIONS
//
// PR 3 moved executable DOM functions, so byte identity is necessary but not
// sufficient: this section RUNS them. The rule is the same as 8B's and is not
// relaxed for the UI — never mock the function under test. Both sides run the REAL
// declarations (BASE recovered from the base index.html via git, HEAD taken from
// the shipped module) inside IDENTICAL sandboxes whose only stubs are EXTERNAL
// collaborators the panel legitimately calls: S, the CONFIG_STATE bindings (the
// real shipped module, byte-identical on both sides), the SCAN_SERVICE functions,
// the sfs-candle-* functions, the chart renderers, document/window and timers.
//
// The observable is an ORDERED TRANSCRIPT, not just final HTML: every element
// lookup, innerHTML / textContent write, class and style change, checkbox state,
// scroll call, service call, renderer call, listener installation and timer
// registration is appended to one list in the order it happens. A change in call
// ORDER, in which element is touched first, or in when a render fires, therefore
// fails even when the resulting DOM matches.
// ═════════════════════════════════════════════════════════════════════════════
section('8C. BEHAVIOURAL PARITY — the 20 relocated UI functions, base vs head');
const PANEL_PARITY = (function () {
  let baseBlock = null, baseFrom = null;
  if (GIT_OK) {
    const candidates = [];
    try { candidates.push(git(['merge-base', 'HEAD', 'origin/dev-clean']).trim()); } catch (_) {}
    try { candidates.push(git(['rev-list', '--max-parents=2', '-n', '1', 'HEAD']).trim()); } catch (_) {}
    for (const ref of candidates) {
      if (!ref) continue;
      let blob;
      try { blob = git(['show', ref + ':index.html']); } catch (_) { continue; }
      if (blob.indexOf('function _sfsInstallKeyboardNav(') < 0) continue;   // already extracted there
      const tags = parseScriptTags(blob).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
      if (tags.length !== 1) continue;
      const mono = tags[0].inline;
      const decls = scanTopLevelDeclarations(mono, maskSource(mono))
        .filter((d) => UI_PANEL_NAMES.indexOf(d.name) >= 0)
        .sort((a, b) => a.start - b.start);
      if (decls.length !== 20) continue;
      baseBlock = decls.map((d) => mono.slice(d.start, d.end)).join('\n\n');
      baseFrom = ref;
      break;
    }
  }
  if (!baseBlock) {
    // git unavailable or the base already carries the extraction: fall back to the
    // shipped module, whose byte-identity to the base is proved by §2.10c.
    baseBlock = A.panelDecls.map((d) => A.panelPart.code.slice(d.start, d.end)).join('\n\n');
    baseFrom = '(recorded span hashes)';
  }
  note('base UI declarations recovered from ' + baseFrom);
  return { baseBlock, baseFrom, headBlock: A.panelPart.code };
})();

{
  const { baseBlock, headBlock } = PANEL_PARITY;

  function candles(n, base) {
    const out = [];
    let c = base == null ? 100 : base;
    for (let i = 0; i < n; i++) { c += 0.5; out.push({ time: 1700000000000 + i * 86400000, open: c - 0.1, high: c + 0.4, low: c - 0.4, close: c, volume: 1000 + i }); }
    return out;
  }

  // A recording fake DOM. Every element is a plain object whose mutations are
  // appended to the shared transcript, so "what happened, in what order" is the
  // observable rather than a final snapshot.
  function makeSandbox(scenario) {
    const log = [];
    const els = {};
    let elSeq = 0;
    function mkEl(id) {
      const name = id || ('el#' + (++elSeq));
      const style = new Proxy({}, {
        set(t, k, v) { log.push('style ' + name + '.' + String(k) + '=' + String(v)); t[k] = v; return true; },
        get(t, k) { return t[k]; },
      });
      const el = {
        id: name, tagName: (scenario.tagFor && scenario.tagFor[name]) || 'DIV',
        _className: '', _classes: [], style,
        _scrollTop: (scenario.scrollTop && scenario.scrollTop[name]) || 0,
        _innerHTML: '', _textContent: '', checked: !!(scenario.checked && scenario.checked[name]),
        classList: {
          add: (c) => { log.push('class ' + name + '.add(' + c + ')'); el._classes.push(c); },
          remove: (c) => { log.push('class ' + name + '.remove(' + c + ')'); el._classes = el._classes.filter((x) => x !== c); },
          toggle: (c) => { log.push('class ' + name + '.toggle(' + c + ')'); },
        },
        appendChild: (c) => { log.push('appendChild ' + name + ' <= ' + (c && c.id)); return c; },
        contains: (t) => !!(scenario.contains && scenario.contains[name] === (t && t.__mark)),
        scrollIntoView: (o) => { log.push('scrollIntoView ' + name + ' ' + JSON.stringify(o || null)); },
        querySelector: (sel) => {
          log.push('querySelector ' + name + ' ' + sel);
          const hit = (scenario.querySelector && scenario.querySelector[name + '|' + sel]);
          return hit ? getEl(hit) : null;
        },
        querySelectorAll: (sel) => { log.push('querySelectorAll ' + name + ' ' + sel); return []; },
      };
      // className and scrollTop are RECORDED, not plain fields: the panel drives the
      // active-tab marker through className and restores the list scroll position
      // through scrollTop, so a silent field would hide both changes from the
      // transcript — and did, until §10's UI-BEHAVIOUR mutants for exactly those two
      // survived and said so.
      Object.defineProperty(el, 'className', {
        get() { return el._className; },
        set(v) { log.push('className ' + name + '=' + String(v)); el._className = String(v); },
      });
      Object.defineProperty(el, 'scrollTop', {
        get() { return el._scrollTop; },
        set(v) { log.push('scrollTop ' + name + '=' + String(v)); el._scrollTop = v; },
      });
      Object.defineProperty(el, 'innerHTML', {
        get() { return el._innerHTML; },
        set(v) { log.push('innerHTML ' + name + ' len=' + String(v).length + ' sha=' + sha256(String(v)).slice(0, 12)); el._innerHTML = String(v); },
      });
      Object.defineProperty(el, 'textContent', {
        get() { return el._textContent; },
        set(v) { log.push('textContent ' + name + '=' + String(v)); el._textContent = String(v); },
      });
      Object.defineProperty(el, 'onclick', {
        get() { return el._onclick; },
        set(v) { log.push('onclick ' + name + ' set'); el._onclick = v; },
      });
      return el;
    }
    function getEl(id) { return (els[id] || (els[id] = mkEl(id))); }
    // `present` decides which ids EXIST. Everything else resolves to null, which is
    // how the real guards (`if (!wrap) return;`) get exercised.
    const present = new Set(scenario.present || [
      'panelTabRow', 'rsDetailWrap', 'sfsDetailWrap', 'panelContent', 'panelHeader',
      'sfs-detail-sym', 'sfs-detail-name', 'sfs-label-1d', 'sfs-label-4h', 'sfs-sma8',
      'sfs-big-wrap-1d', 'sfs-big-wrap-4h', 'sfs-sqzlbl-1d', 'sfs-sqzlbl-4h',
      'sfs-sqzbar-1d', 'sfs-sqzbar-4h', 'sfs-rsi-1d', 'sfs-rsi-4h', 'sfs-rs-1d', 'sfs-rs-4h',
      'sfs-progress', 'ptab-live', 'ptab-scanner', 'ptab-rs', 'ptab-sfs', 'sfs-scan-root',
    ]);
    const listeners = [];
    const sfs = {
      active: !!scenario.active, running: !!scenario.running, cancelled: false,
      results: scenario.results || [], lastRunAt: scenario.lastRunAt || null,
      progress: scenario.progress || null,
      chartSymbol: scenario.chartSymbol || null,
      chartCacheCandles: scenario.chartCacheCandles || {},
      filters: scenario.filters || { timeframes: { '1D': true, '4H': false }, strength: 'both', direction: 'both', search: '' },
      chartOverlay: { sma8: scenario.sma8 !== false },
      selectedIndex: scenario.selectedIndex == null ? -1 : scenario.selectedIndex,
    };
    const sb = {
      console: { log() {}, warn() {}, error() {} }, JSON, Object, Math, Array, String, Number,
      isFinite, isNaN, parseFloat, parseInt, Promise, RegExp, Error,
      setTimeout: (fn, ms) => { log.push('setTimeout:' + ms); if (scenario.runTimers !== false) fn(); return 1; },
      clearTimeout: () => {},
      document: {
        getElementById: (id) => { log.push('getElementById ' + id); return present.has(id) ? getEl(id) : null; },
        querySelector: (sel) => {
          log.push('document.querySelector ' + sel);
          const hit = scenario.docQuery && scenario.docQuery[sel];
          return hit ? getEl(hit) : null;
        },
        createElement: (t) => { log.push('createElement ' + t); return mkEl('new:' + t + ':' + (++elSeq)); },
        addEventListener: (ev, fn, cap) => { log.push('document.addEventListener ' + ev + ' capture=' + !!cap); listeners.push({ ev, fn }); },
      },
      window: { addEventListener: (ev) => { log.push('window.addEventListener ' + ev); } },
      S: { squeezeFireScanner: sfs, scanData: [] },
      WL: (scenario.watchlist || [{ t: 'AAPL', n: 'Apple Inc' }]),
      // ── external owners, stubbed ────────────────────────────────────────────
      ffSqueezeFireScanner: () => scenario.ff !== false,
      switchPanelTab: (t) => { log.push('switchPanelTab:' + t); },
      debugLog: (k, m) => { log.push('debugLog:' + k + ':' + String(m).replace(/[\d.]+/g, '#')); },
      debugWarn: (k, m) => { log.push('debugWarn:' + k + ':' + String(m).replace(/[\d.]+/g, '#')); },
      // SCAN_SERVICE
      _sfsGetFilteredResults: () => { log.push('_sfsGetFilteredResults'); return (scenario.filtered || sfs.results).slice(); },
      _sfsSortResults: (rows) => { log.push('_sfsSortResults:' + rows.length); return rows.slice(); },
      _sfsResolveRenderPrice: (s) => { log.push('_sfsResolveRenderPrice:' + s); return scenario.renderPrice || { price: null, source: null }; },
      _sfsCandlesFromSyncSource: (s, tf) => { log.push('_sfsCandlesFromSyncSource:' + s + ':' + tf); return scenario.syncSpy ? { candles: scenario.syncSpy, path: 'sfsCache' } : null; },
      _sfsRunScan: () => { log.push('_sfsRunScan'); },
      _sfsCancelScan: () => { log.push('_sfsCancelScan'); },
      // sfs-candle-* owners
      _sfsCandlesUsable: (c) => !!(c && c.length >= 22),
      _sfsSpyDiag: (tf, st, r) => { log.push('_sfsSpyDiag:' + tf + ':' + st + ':' + r); },
      _sfsSpyReadOnly: (tf) => { log.push('_sfsSpyReadOnly:' + tf); return Promise.resolve(scenario.asyncSpy || null); },
      _sfsEnsureChartData: (s) => { log.push('_sfsEnsureChartData:' + s); return Promise.resolve(true); },
      _sfsEnsureDetail4hCandles: (s) => { log.push('_sfsEnsureDetail4hCandles:' + s); return Promise.resolve(scenario.detail4h || { ok: false, reason: 'NO_CACHE' }); },
      // chart / indicator renderers
      patchLastCandleWithLivePrice: (c, p) => { log.push('patchLastCandleWithLivePrice:' + (c ? c.length : 'null') + ':' + p); return c; },
      _patchLivePrice: (c) => { log.push('_patchLivePrice:' + (c ? c.length : 'null')); return c || []; },
      computeCandleIndicators: (c) => {
        log.push('computeCandleIndicators:' + c.length);
        if (scenario.noIndicators) return null;
        return { rsi: c.map(() => 55), lastRsi: 55, lastSma8: 100, squeeze: c.map((_, i) => i < c.length - 3), lastSqueeze: !!scenario.lastSqueeze };
      },
      _drawCandleChart: (id, c, ind, o) => { log.push('_drawCandleChart:' + id + ':' + c.length + ':sma8=' + (o && o.showSMA8)); },
      _mcxDrawRsi: (id, rsi, n) => { log.push('_mcxDrawRsi:' + id + ':' + n); },
      _pfDrawRsPanel: (id, c, spy, n) => { log.push('_pfDrawRsPanel:' + id + ':' + c.length + ':' + spy.length + ':' + n); },
    };
    sb.window.document = sb.document;
    vm.createContext(sb);
    return { sb, log, sfs, listeners, els, getEl };
  }

  // Run one scenario against a declaration source and return its transcript.
  async function observe(declSource, scenario) {
    const ctx = makeSandbox(scenario);
    vm.runInContext(declSource, ctx.sb);
    const out = { log: ctx.log };
    try {
      const r = await scenario.drive(ctx.sb, ctx.sfs, ctx);
      out.result = r === undefined ? '<undefined>' : JSON.parse(JSON.stringify(r, (k, v) => (typeof v === 'function' ? '<fn>' : v)));
    } catch (e) {
      out.threw = String(e && e.message);
    }
    // Let any promise callbacks the drive kicked off settle, so the ASYNC half of
    // _sfsOpenChart is part of the transcript rather than lost after the return.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    out.state = {
      chartSymbol: ctx.sfs.chartSymbol, selectedIndex: ctx.sfs.selectedIndex,
      active: ctx.sfs.active, sma8: ctx.sfs.chartOverlay.sma8,
      filters: ctx.sfs.filters,
      sortCol: ctx.sb._sfsSortCol, sortDir: ctx.sb._sfsSortDir,
      candidateCount: Array.isArray(ctx.sb._sfsCandidateList) ? ctx.sb._sfsCandidateList.length : null,
      focused: ctx.sb._sfsFocused, kbInstalled: ctx.sb._sfsKbInstalled,
      detailPhase: JSON.stringify(ctx.sb._sfsDetail4hPhase || {}),
      listeners: ctx.listeners.map((l) => l.ev),
    };
    // Final DOM of every element the run touched, so the transcript is backed by a
    // state snapshot as well as an order.
    out.dom = Object.keys(ctx.els).sort().map((k) => k + '|' + sha256(ctx.els[k]._innerHTML).slice(0, 12) + '|' + ctx.els[k]._textContent +
      '|' + ctx.els[k]._classes.join(',') + '|' + ctx.els[k]._className + '|top=' + ctx.els[k]._scrollTop);
    return JSON.parse(JSON.stringify(out));
  }

  const ROWS = [
    { symbol: 'AAPL', timeframe: '1D', direction: 'BULLISH', strength: 'STRONG', fireType: 'fire', fireBarsAgo: 1, rsi14: 62.4, score: 75 },
    { symbol: 'MSFT', timeframe: '4H', direction: 'BEARISH', strength: 'WEAK', fireType: 'cont', fireBarsAgo: 3, rsi14: 41.2, score: 25 },
    { symbol: 'TSLA', timeframe: '1D', direction: 'BULLISH', strength: 'WEAK', fireType: 'fire', fireBarsAgo: 2, rsi14: null, score: 50 },
  ];
  const key = (k) => ({ key: k, target: { tagName: 'BODY' }, preventDefault() {} });

  const SCENARIOS = [
    // ── _sfsInit ───────────────────────────────────────────────────────────
    { id: 'init/feature disabled is a no-op', ff: false, drive: (sb) => sb._sfsInit() },
    { id: 'init/normal injection', present: ['panelTabRow', 'rsDetailWrap'], drive: (sb) => sb._sfsInit() },
    { id: 'init/idempotent when the tab already exists', present: ['panelTabRow', 'rsDetailWrap', 'ptab-sfs', 'sfsDetailWrap'],
      drive: (sb) => { sb._sfsInit(); sb._sfsInit(); } },
    { id: 'init/no anchors present', present: [], drive: (sb) => sb._sfsInit() },
    // ── 4H detail state ────────────────────────────────────────────────────
    { id: 'detail/message for every phase and reason', drive: (sb) => {
      const out = {};
      sb._sfsDetail4hPhase = { A: 'loading', B: 'warming' };
      out.loading = sb._sfs4hDetailMessage('A');
      out.warming = sb._sfs4hDetailMessage('B');
      for (const r of ['SUBSCRIPTION_LIMIT_BACKOFF', 'INSUFFICIENT_30M_CANDLES', 'NO_CACHE',
                       'ENDPOINT_UNAVAILABLE', 'FETCH_ERROR', 'CANDLES_NOT_READY', 'SOMETHING_ELSE']) {
        sb._sfsDetail4hResult = { C: { reason: r } };
        out[r] = sb._sfs4hDetailMessage('C');
      }
      sb._sfsDetail4hResult = {};
      out.noResult = sb._sfs4hDetailMessage('D');
      return out;
    } },
    { id: 'detail/render guards on the selected symbol', chartSymbol: 'AAPL', drive: (sb) => {
      sb._sfsDetail4hPhase = { AAPL: 'loading' };
      sb._sfsRender4hDetailState('MSFT');      // wrong symbol → no-op
      sb._sfsRender4hDetailState('AAPL');      // selected → renders
    } },
    { id: 'detail/render leaves an already-drawn canvas alone', chartSymbol: 'AAPL',
      querySelector: { 'sfs-big-wrap-4h|canvas': 'existing-canvas' },
      drive: (sb) => { sb._sfsDetail4hPhase = { AAPL: 'warming' }; sb._sfsRender4hDetailState('AAPL'); } },
    { id: 'detail/render with no wrap element', chartSymbol: 'AAPL', present: ['panelContent'],
      drive: (sb) => sb._sfsRender4hDetailState('AAPL') },
    // ── RS panel ───────────────────────────────────────────────────────────
    { id: 'rs/panel message writes into the given id', drive: (sb) => sb._sfsRsPanelMsg('sfs-rs-1d', 'RS: SPY 1D not loaded') },
    { id: 'rs/panel message with a missing element', present: [], drive: (sb) => sb._sfsRsPanelMsg('nope', 'x') },
    { id: 'rs/symbol series too short', drive: (sb) => sb._sfsDrawRsPanel('AAPL', '1D', 'sfs-rs-1d', candles(5), 75) },
    { id: 'rs/sync SPY hit draws the panel', syncSpy: candles(60, 400),
      drive: (sb) => sb._sfsDrawRsPanel('AAPL', '1D', 'sfs-rs-1d', candles(60), 75) },
    { id: 'rs/sync SPY overlap too short', syncSpy: candles(15, 400),
      drive: (sb) => sb._sfsDrawRsPanel('AAPL', '1D', 'sfs-rs-1d', candles(60), 75) },
    { id: 'rs/no sync SPY falls through to the async read', asyncSpy: candles(60, 400),
      drive: (sb) => sb._sfsDrawRsPanel('AAPL', '4H', 'sfs-rs-4h', candles(60), 75) },
    { id: 'rs/async read returns nothing', asyncSpy: null,
      drive: (sb) => sb._sfsDrawRsPanel('AAPL', '4H', 'sfs-rs-4h', candles(60), 75) },
    // ── progress / tab / render ────────────────────────────────────────────
    { id: 'progress/renders the counter', progress: { done: 7, total: 20 }, drive: (sb) => sb._sfsRenderProgress() },
    { id: 'progress/no progress object', progress: null, drive: (sb) => sb._sfsRenderProgress() },
    { id: 'progress/no element', present: [], progress: { done: 1, total: 2 }, drive: (sb) => sb._sfsRenderProgress() },
    { id: 'tab/marks sfs active and clears the others', drive: (sb) => sb._sfsActivePanelTab() },
    { id: 'render/feature disabled is a no-op', ff: false, drive: (sb) => sb._sfsRender() },
    { id: 'render/empty, never scanned', drive: (sb) => sb._sfsRender() },
    { id: 'render/running shows progress and drops selection', running: true, progress: { done: 4, total: 9 }, selectedIndex: 2,
      drive: (sb) => sb._sfsRender() },
    { id: 'render/scanned but no results', lastRunAt: null, filtered: [], drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; return sb._sfsRender(); } },
    { id: 'render/populated results', results: ROWS, filtered: ROWS,
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; return sb._sfsRender(); } },
    { id: 'render/filtered subset', results: ROWS, filtered: [ROWS[0]],
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; return sb._sfsRender(); } },
    { id: 'render/selection clamped to the visible list', results: ROWS, filtered: [ROWS[0]], selectedIndex: 5,
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; return sb._sfsRender(); } },
    { id: 'render/keepChart reopens the open symbol', results: ROWS, filtered: ROWS, chartSymbol: 'AAPL',
      chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; return sb._sfsRender({ keepChart: true }); } },
    { id: 'render/keepChart with no open symbol', results: ROWS, filtered: ROWS,
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; return sb._sfsRender({ keepChart: true }); } },
    // ── controls ───────────────────────────────────────────────────────────
    { id: 'controls/timeframe toggle flips and re-renders', drive: (sb, sfs) => {
      sb._sfsTfToggle('4H'); const a = JSON.stringify(sfs.filters.timeframes);
      sb._sfsTfToggle('4H'); return { a, b: JSON.stringify(sfs.filters.timeframes) };
    } },
    { id: 'controls/setFilter assigns and re-renders', drive: (sb, sfs) => {
      sb._sfsSetFilter('strength', 'strong'); sb._sfsSetFilter('direction', 'bearish'); sb._sfsSetFilter('search', 'aap');
      return JSON.stringify(sfs.filters);
    } },
    { id: 'controls/sortBy toggles direction on the same column', drive: (sb) => {
      const out = [];
      sb._sfsSortBy('score'); out.push(sb._sfsSortCol + '/' + sb._sfsSortDir);
      sb._sfsSortBy('score'); out.push(sb._sfsSortCol + '/' + sb._sfsSortDir);
      sb._sfsSortBy('symbol'); out.push(sb._sfsSortCol + '/' + sb._sfsSortDir);
      sb._sfsSortBy('symbol'); out.push(sb._sfsSortCol + '/' + sb._sfsSortDir);
      return out;
    } },
    // Switching columns while the direction is 'asc' is the ONLY state in which the
    // `else` branch's `_sfsSortDir = 'desc'` reset is observable — the fixture above
    // always happens to arrive at a new column already in 'desc'.
    { id: 'controls/sortBy resets a new column to desc from asc', drive: (sb) => {
      sb._sfsSortBy('score');                       // score/desc → score/asc
      const before = sb._sfsSortCol + '/' + sb._sfsSortDir;
      sb._sfsSortBy('symbol');                      // new column → must reset to desc
      return { before, after: sb._sfsSortCol + '/' + sb._sfsSortDir };
    } },
    // keepChart only diverges from a bare render when a chart is actually open, so the
    // control fixtures need one open to see the difference.
    { id: 'controls/setFilter keeps an open chart', chartSymbol: 'AAPL', results: ROWS, filtered: ROWS,
      chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; sb._sfsSetFilter('strength', 'strong'); return sfs.chartSymbol; } },
    { id: 'controls/timeframe toggle keeps an open chart', chartSymbol: 'AAPL', results: ROWS, filtered: ROWS,
      chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; sb._sfsTfToggle('4H'); return sfs.chartSymbol; } },
    { id: 'controls/sortBy keeps an open chart', chartSymbol: 'AAPL', results: ROWS, filtered: ROWS,
      chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; sb._sfsSortBy('symbol'); return sfs.chartSymbol; } },
    { id: 'controls/overlay toggle reads the checkbox, no chart open', checked: { 'sfs-sma8': false },
      drive: (sb, sfs) => { sb._sfsToggleOverlay(); return sfs.chartOverlay.sma8; } },
    { id: 'controls/overlay toggle redraws when a chart is open', chartSymbol: 'AAPL', checked: { 'sfs-sma8': true },
      chartCacheCandles: { AAPL: { '1D': candles(60), '4H': candles(60) } },
      drive: (sb, sfs) => { sb._sfsToggleOverlay(); return sfs.chartOverlay.sma8; } },
    { id: 'controls/overlay toggle with no checkbox element', present: ['panelContent', 'panelHeader'],
      drive: (sb, sfs) => { sb._sfsToggleOverlay(); return sfs.chartOverlay.sma8; } },
    // ── chart lifecycle ────────────────────────────────────────────────────
    { id: 'chart/toggle opens a different symbol', results: ROWS, filtered: ROWS,
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; sb._sfsToggleChart('AAPL', 0); return { sym: sfs.chartSymbol, idx: sfs.selectedIndex }; } },
    { id: 'chart/toggle closes the open symbol', chartSymbol: 'AAPL', results: ROWS, filtered: ROWS,
      drive: (sb, sfs) => { sb._sfsToggleChart('AAPL', 0); return { sym: sfs.chartSymbol, idx: sfs.selectedIndex }; } },
    { id: 'chart/toggle without an index keeps the selection', chartSymbol: null, selectedIndex: 2, results: ROWS, filtered: ROWS,
      drive: (sb, sfs) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; sb._sfsToggleChart('MSFT'); return { sym: sfs.chartSymbol, idx: sfs.selectedIndex }; } },
    { id: 'chart/close hides the wrap', chartSymbol: 'AAPL', drive: (sb, sfs) => { sb._sfsCloseChart(); return sfs.chartSymbol; } },
    { id: 'chart/open, 4H unavailable', chartSymbol: 'AAPL', chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsOpenChart('AAPL') },
    { id: 'chart/open, 4H resolves ok', chartSymbol: 'AAPL', detail4h: { ok: true },
      chartCacheCandles: { AAPL: { '1D': candles(60), '4H': candles(60) } },
      drive: (sb) => sb._sfsOpenChart('AAPL') },
    { id: 'chart/open after navigating away draws nothing stale', chartSymbol: 'MSFT', detail4h: { ok: true },
      drive: (sb) => sb._sfsOpenChart('AAPL') },
    { id: 'chart/open with no wrap element', present: ['panelContent'], drive: (sb) => sb._sfsOpenChart('AAPL') },
    { id: 'chart/open resolves the watchlist name', chartSymbol: 'TSLA', watchlist: [{ t: 'TSLA', n: 'Tesla Inc' }],
      drive: (sb) => sb._sfsOpenChart('TSLA') },
    { id: 'chart/open for a symbol absent from the watchlist', chartSymbol: 'ZZZ', watchlist: [{ t: 'AAPL', n: 'Apple Inc' }],
      drive: (sb) => sb._sfsOpenChart('ZZZ') },
    // ── selection visuals ──────────────────────────────────────────────────
    { id: 'selection/no panelContent', present: [], drive: (sb) => sb._sfsUpdateSelectionVisual(true) },
    { id: 'selection/nothing selected clears the previous row', selectedIndex: -1,
      querySelector: { 'panelContent|tr.sfs-selected': 'old-row' }, drive: (sb) => sb._sfsUpdateSelectionVisual(false) },
    { id: 'selection/selected row highlighted and scrolled', selectedIndex: 1,
      querySelector: { 'panelContent|tr.sfs-selected': 'old-row', 'panelContent|tr[data-sfs-idx="1"]': 'row-1' },
      drive: (sb) => sb._sfsUpdateSelectionVisual(true) },
    { id: 'selection/selected row highlighted without scroll', selectedIndex: 1,
      querySelector: { 'panelContent|tr[data-sfs-idx="1"]': 'row-1' },
      drive: (sb) => sb._sfsUpdateSelectionVisual(false) },
    { id: 'selection/selected row not in the DOM', selectedIndex: 4,
      drive: (sb) => sb._sfsUpdateSelectionVisual(true) },
    // ── open-selected ──────────────────────────────────────────────────────
    { id: 'openSelected/out of range', drive: (sb) => { sb._sfsCandidateList = ROWS; return [sb._sfsOpenSelectedChart(-1), sb._sfsOpenSelectedChart(99)]; } },
    { id: 'openSelected/empty candidate list', drive: (sb) => { sb._sfsCandidateList = []; return sb._sfsOpenSelectedChart(0); } },
    { id: 'openSelected/already open only moves the highlight', chartSymbol: 'AAPL', results: ROWS, filtered: ROWS,
      drive: (sb, sfs) => { sb._sfsCandidateList = ROWS; sb._sfsOpenSelectedChart(0); return { sym: sfs.chartSymbol, idx: sfs.selectedIndex }; } },
    // A NON-ZERO starting scrollTop is what makes the save/restore observable: with the
    // default 0 the restore writes the value it already had and the mutant that deletes
    // it survives.
    { id: 'openSelected/opens a new symbol and preserves scroll', results: ROWS, filtered: ROWS,
      docQuery: { '#sfs-scan-root .dss-tbl-scroll': 'scroller' }, scrollTop: { scroller: 240 },
      drive: (sb, sfs, ctx) => { sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' }; sb._sfsCandidateList = ROWS; sb._sfsOpenSelectedChart(1); return { sym: sfs.chartSymbol, idx: sfs.selectedIndex, top: ctx.getEl('scroller').scrollTop }; } },
    // ── keyboard navigation ────────────────────────────────────────────────
    { id: 'keyboard/installs exactly two listeners at CALL time', drive: (sb, sfs, ctx) => {
      const before = ctx.listeners.length;
      sb._sfsInstallKeyboardNav();
      return { before, after: ctx.listeners.length, installed: sb._sfsKbInstalled };
    } },
    { id: 'keyboard/second install is guarded', drive: (sb, sfs, ctx) => {
      sb._sfsInstallKeyboardNav(); sb._sfsInstallKeyboardNav(); sb._sfsInstallKeyboardNav();
      return ctx.listeners.length;
    } },
    { id: 'keyboard/inactive panel ignores every key', active: false, drive: (sb, sfs, ctx) => {
      sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = ROWS;
      const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
      ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].forEach((k) => kd(key(k)));
      return { idx: sfs.selectedIndex, sym: sfs.chartSymbol };
    } },
    { id: 'keyboard/unfocused ignores every key', active: true, drive: (sb, sfs, ctx) => {
      sb._sfsInstallKeyboardNav(); sb._sfsFocused = false; sb._sfsCandidateList = ROWS;
      const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
      ['ArrowDown', 'Enter'].forEach((k) => kd(key(k)));
      return { idx: sfs.selectedIndex };
    } },
    { id: 'keyboard/arrow down then up walks the list', active: true, results: ROWS, filtered: ROWS,
      drive: (sb, sfs, ctx) => {
        sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' };
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = ROWS;
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        const seen = [];
        kd(key('ArrowDown')); seen.push(sfs.selectedIndex + '/' + sfs.chartSymbol);
        kd(key('ArrowDown')); seen.push(sfs.selectedIndex + '/' + sfs.chartSymbol);
        kd(key('ArrowUp'));   seen.push(sfs.selectedIndex + '/' + sfs.chartSymbol);
        return seen;
      } },
    { id: 'keyboard/arrow clamps at both ends', active: true, results: ROWS, filtered: ROWS, selectedIndex: 2,
      drive: (sb, sfs, ctx) => {
        sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' };
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = ROWS;
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        kd(key('ArrowDown')); const low = sfs.selectedIndex;
        sfs.selectedIndex = 0; kd(key('ArrowUp'));
        return { low, high: sfs.selectedIndex };
      } },
    { id: 'keyboard/Enter toggles the selected chart', active: true, selectedIndex: 1, results: ROWS, filtered: ROWS,
      drive: (sb, sfs, ctx) => {
        sfs.lastRunAt = { toLocaleTimeString: () => '10:00:00' };
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = ROWS;
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        kd(key('Enter'));
        return { sym: sfs.chartSymbol, idx: sfs.selectedIndex };
      } },
    { id: 'keyboard/Escape closes an open chart', active: true, chartSymbol: 'AAPL',
      drive: (sb, sfs, ctx) => {
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = ROWS;
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        kd(key('Escape'));
        return sfs.chartSymbol;
      } },
    { id: 'keyboard/Escape with no chart open is inert', active: true,
      drive: (sb, sfs, ctx) => {
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true;
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        kd(key('Escape'));
        return sfs.chartSymbol;
      } },
    { id: 'keyboard/typing in an input is never hijacked', active: true, results: ROWS, filtered: ROWS,
      drive: (sb, sfs, ctx) => {
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = ROWS;
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        for (const tag of ['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A']) {
          kd({ key: 'ArrowDown', target: { tagName: tag }, preventDefault() {} });
        }
        return sfs.selectedIndex;
      } },
    { id: 'keyboard/arrow with an empty list is inert', active: true,
      drive: (sb, sfs, ctx) => {
        sb._sfsInstallKeyboardNav(); sb._sfsFocused = true; sb._sfsCandidateList = [];
        const kd = ctx.listeners.filter((l) => l.ev === 'keydown')[0].fn;
        kd(key('ArrowDown'));
        return sfs.selectedIndex;
      } },
    { id: 'keyboard/mousedown sets the focus flag', drive: (sb, sfs, ctx) => {
      sb._sfsInstallKeyboardNav();
      const md = ctx.listeners.filter((l) => l.ev === 'mousedown')[0].fn;
      md({ target: { __mark: 'x' } });
      return sb._sfsFocused;
    } },
    // ── chart drawing ──────────────────────────────────────────────────────
    { id: 'draw/both timeframes, no candles at all', drive: (sb) => sb._sfsDrawCharts('AAPL') },
    { id: 'draw/1D available, 4H missing', chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawCharts('AAPL') },
    { id: 'draw/both timeframes available', chartCacheCandles: { AAPL: { '1D': candles(60), '4H': candles(60) } },
      drive: (sb) => sb._sfsDrawCharts('AAPL') },
    { id: 'draw/with a resolved render price', renderPrice: { price: 123.45, source: 'live' },
      chartCacheCandles: { AAPL: { '1D': candles(60), '4H': candles(60) } },
      drive: (sb) => sb._sfsDrawCharts('AAPL') },
    { id: 'draw/missing selected symbol', chartCacheCandles: { MSFT: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawCharts('AAPL') },
    { id: 'drawOneTf/too few candles, 1D copy', chartCacheCandles: { AAPL: { '1D': candles(3) } },
      drive: (sb) => sb._sfsDrawOneTf('AAPL', '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', null) },
    { id: 'drawOneTf/too few candles, 4H routes through the detail message',
      chartCacheCandles: { AAPL: { '4H': candles(3) } },
      drive: (sb) => { sb._sfsDetail4hPhase = { AAPL: 'warming' }; return sb._sfsDrawOneTf('AAPL', '4H', 'sfs-big-wrap-4h', 'sfs-rsi-4h', 'sfs-rs-4h', 'sfs-sqzbar-4h', 'sfs-sqzlbl-4h', null); } },
    { id: 'drawOneTf/indicators unavailable', noIndicators: true, chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawOneTf('AAPL', '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', null) },
    { id: 'drawOneTf/squeeze ON', lastSqueeze: true, chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawOneTf('AAPL', '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', null) },
    { id: 'drawOneTf/squeeze FIRED', lastSqueeze: false, chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawOneTf('AAPL', '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', null) },
    { id: 'drawOneTf/no wrap element', present: ['panelContent'], chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawOneTf('AAPL', '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', null) },
    { id: 'drawOneTf/sma8 overlay off is passed through', sma8: false, chartCacheCandles: { AAPL: { '1D': candles(60) } },
      drive: (sb) => sb._sfsDrawOneTf('AAPL', '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', null) },
  ];

  // Both sides get the real shipped config/state module — identical on each, since
  // PR 3 does not touch it.
  const CONFIG_SRC = A.configPart.code;
  PANEL_PARITY.observe = observe;
  PANEL_PARITY.SCENARIOS = SCENARIOS;
  PANEL_PARITY.CONFIG_SRC = CONFIG_SRC;

  PANEL_PARITY.run = async function () {
    const diffs = [];
    for (const sc of SCENARIOS) {
      const b = await observe(CONFIG_SRC + '\n' + baseBlock, sc);
      const h = await observe(CONFIG_SRC + '\n' + headBlock, sc);
      let same = true;
      try { assert.deepStrictEqual(h, b); } catch (_) { same = false; }
      ok(same, '8C.' + sc.id + ' — base and head behave identically' +
        (same ? '' : '\n        base: ' + JSON.stringify(b) + '\n        head: ' + JSON.stringify(h)));
      if (!same) diffs.push(sc.id);
    }
    eq(diffs.length, 0, '8C.parity zero behavioural differences across ' + SCENARIOS.length + ' fixtures');
    // The transcripts must actually be rich, or "identical" would be cheap.
    const sample = await observe(CONFIG_SRC + '\n' + headBlock, SCENARIOS.filter((s) => s.id === 'render/populated results')[0]);
    ok(sample.log.length > 8, '8C.depth the transcript records an ordered sequence, not a single event (' + sample.log.length + ' entries)');
    note('UI behavioural fixtures compared: ' + SCENARIOS.length);
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9 — THE RATCHET
//
// Manifest/owner-based, never prefix-based. The allowance is DERIVED from the
// manifest: it is the number of SFS declarations still permitted to sit inline.
// Before PR 1 that was 62; PR 1 relocated 33 (→29), PR 2 relocated 9 (→20) and
// PR 3 relocates the last 20 (→0). It may only ever shrink, and it has now reached
// its floor: the allowance is ZERO, so ANY SFS declaration appearing inline fails,
// whether or not the manifest owns it. The 18 declarations in the six
// already-extracted sfs-candle-* modules are still correctly NOT counted, which is
// exactly the false positive a prefix-only ratchet would produce.
// ═════════════════════════════════════════════════════════════════════════════
section('9. RATCHET — the inline allowance may only shrink');
const INLINE_ALLOWANCE_BEFORE_PR1 = 62;
const INLINE_ALLOWANCE_AFTER_PR1 = 29;
const INLINE_ALLOWANCE_AFTER_PR2 = 20;
const INLINE_ALLOWANCE_NOW = 0;
{
  const inlineFamily = A.inlinePart.decls.filter((d) => isSfsName(d.name)).map((d) => d.name);
  eq(inlineFamily.length, INLINE_ALLOWANCE_NOW, '9.1 exactly ' + INLINE_ALLOWANCE_NOW + ' SFS declarations remain inline');
  deepEq(inlineFamily, [], '9.1b …named, so a survivor is reported by name and not as a count');
  eq(INLINE_ALLOWANCE_BEFORE_PR1 - namesOf('CONFIG_STATE').length, INLINE_ALLOWANCE_AFTER_PR1,
     '9.2a the allowance shrank by exactly the number PR 1 extracted (62 → 29)');
  eq(INLINE_ALLOWANCE_AFTER_PR1 - namesOf('SCAN_SERVICE').length, INLINE_ALLOWANCE_AFTER_PR2,
     '9.2b the allowance shrank by exactly the number PR 2 extracted (29 → 20)');
  eq(INLINE_ALLOWANCE_AFTER_PR2 - namesOf('UI_PANEL').length, INLINE_ALLOWANCE_NOW,
     '9.2c the allowance shrank by exactly the number PR 3 extracted (20 → 0)');
  eq(INLINE_ALLOWANCE_NOW, 0, '9.2d the ratchet has reached its floor — the extraction is complete');
  ok(INLINE_ALLOWANCE_NOW < INLINE_ALLOWANCE_AFTER_PR2, '9.3a the allowance strictly decreased in PR 3');
  ok(INLINE_ALLOWANCE_AFTER_PR2 < INLINE_ALLOWANCE_AFTER_PR1, '9.3b …as it did in PR 2');
  ok(INLINE_ALLOWANCE_AFTER_PR1 < INLINE_ALLOWANCE_BEFORE_PR1, '9.3c …and in PR 1 — the ratchet only ever shrinks');
  ok(inlineFamily.every((n) => BY_NAME.has(n)), '9.4 every inline SFS declaration has a manifest owner (vacuous at zero)');
  deepEq(A.unknownFamily, [], '9.5 no SFS-owned declaration exists without a manifest owner');
  // Every one of the 62 has exactly one DECLARED EXTERNAL owner — none inline.
  {
    const homeless = MANIFEST.filter((m) => A.manifestSites.get(m.name)[0].where === '(inline)').map((m) => m.name);
    deepEq(homeless, [], '9.9 all 62 declarations have a declared external owner — none is inline');
    const owners = new Set(MANIFEST.map((m) => A.manifestSites.get(m.name)[0].where));
    deepEq([...owners].sort(), [CONFIG_STATE_TAG, SCAN_SERVICE_TAG, UI_PANEL_TAG].slice().sort(),
      '9.10 …and those owners are exactly the three planned modules, nothing else');
  }
  // The already-extracted modules are outside the ratchet — proof it is not
  // prefix-based, which would flag all 18 of them.
  let already = 0;
  for (const rel of SFS_CANDLE_MODULES) {
    const p = A.parts.filter((x) => x.name === rel)[0];
    if (p) already += p.decls.filter((d) => isSfsName(d.name)).length;
  }
  eq(already, 18, '9.6 the six already-extracted modules hold 18 family declarations…');
  ok(already > 0 && A.unknownFamily.length === 0, '9.7 …and the ratchet does not flag a single one of them');
  ok(SFS_CANDLE_MODULES.every((rel) => RATCHET_SCOPE.indexOf(rel) < 0),
     '9.6b …because they are outside the ratchet SCOPE, exactly as before this PR');
  // A declaration of ANY shipped owner re-introduced inline must fail — that is the
  // ratchet going backwards, and at an allowance of zero there is no room left at all.
  for (const owner of SHIPPED_OWNERS) {
    eq(namesOf(owner).filter((n) => A.inlineNames.has(n)).length, 0,
       '9.8 not one ' + owner + ' declaration was re-introduced inline');
  }
  note('allowance 62 → 29 after PR 1 → 20 after PR 2 → ' + INLINE_ALLOWANCE_NOW + ' after PR 3 (floor reached)');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 11 — BYTE-FOR-BYTE RECONSTRUCTION
//
// The strongest statement a relocation-only refactor can make: put the moved
// declarations back where they came from, remove the tags, and the file you get is
// the file you started from — to the byte.
//
// PROOF A covers THIS PR: PR-3 HEAD, minus the panel tag, plus the 20 UI spans
// reinserted at their exact base offsets, must equal the PR-3 base index.html.
// Crucially the spans are taken from the SHIPPED MODULE, not from the base blob, so
// this reconstructs FROM the artefact under review rather than assuming it.
//
// PROOF B covers the WHOLE THREE-PR PLAN: PR-3 HEAD, minus all three extraction
// tags, plus all 62 spans reinserted at their pre-SFS offsets, must equal the
// index.html at the #366 merge — the last commit before any SFS extraction. That is
// the end-to-end evidence that three PRs changed location only.
//
// Both proofs need the historical blobs, so they run only when git can produce
// them. When it cannot they are SKIPPED LOUDLY rather than silently passing —
// §2.10a/b/c still pin every span's SHA-256 independently.
// ═════════════════════════════════════════════════════════════════════════════
section('11. RECONSTRUCTION — the relocation is reversible, to the byte');
{
  const PRE_SFS_REF = '6b4fb422e6abb54cf0eb8af734cf65a3a48a8031';   // merge of #366, the last pre-SFS commit
  // RECONSTRUCTION STARTS FROM THE POST-PESS DOCUMENT, NOT RAW HEAD.
  //
  // These proofs assume index.html is `base + the SFS/PESS relocations`. EIC
  // PR 1 is the first change from ANOTHER family to land on top, so raw HEAD is
  // now missing four EIC spans and carrying one extra tag. Undoing EIC first —
  // and PROVING the intermediate is the post-PESS application by hash — keeps
  // everything below byte-exact instead of relaxing it to "close enough".
  // A CHAIN, undone NEWEST FIRST: owner correction, PR 4, PR 3, PR 2, PR 1. The
  // NEWEST helper owns the order and verifies each link by hash — every PR's
  // offsets address the monolith as it was when that PR was cut, so the order is
  // load-bearing, and this entry point must always be the newest EIC helper.
  const EIC_UNDO = require('./lib/eic-pr5-undo.js');
const PRETRADE_UNDO2 = require('./lib/pretrade-pr2-undo.js');
const PRETRADE_UNDO = require('./lib/pretrade-pr1-undo.js');
  const EIC_PR3 = require('./lib/eic-pr3-undo.js');
  const EIC_PR2 = require('./lib/eic-pr2-undo.js');
  const EIC_PR1 = require('./lib/eic-pr1-undo.js');
  let HEAD_HTML = HTML;
  const pretradeRiskSrc = fs.readFileSync(path.join(ROOT, 'js/services/pretrade-risk-rules.js'), 'utf8');
  // PRETRADE PR 2 (technicals) is NEWER than PR 1 (risk rules): it was cut
  // against the document PR 1 left behind, so it is undone FIRST. The helper
  // verifies the intermediate it restores by length and SHA-256, so a swapped
  // order fails loudly rather than reconstructing a plausible wrong document.
  const pretradeTechSrc = fs.readFileSync(path.join(ROOT, 'js/services/pretrade-technicals.js'), 'utf8');
  if (PRETRADE_UNDO2.isApplied(HEAD_HTML)) {
    HEAD_HTML = PRETRADE_UNDO2.undoPretradePr2(HEAD_HTML, pretradeTechSrc);
    ok(true, '11.-2 PRETRADE technicals is undone byte-exactly before the older PRETRADE link');
  }
  if (PRETRADE_UNDO.isApplied(HEAD_HTML)) {
    HEAD_HTML = PRETRADE_UNDO.undoPretradePr1(HEAD_HTML, pretradeRiskSrc);
    ok(true, '11.-1 PRETRADE is undone byte-exactly before the older reconstruction chain');
  }
  if (EIC_UNDO.isApplied(HEAD_HTML) || EIC_PR3.isApplied(HEAD_HTML) || EIC_PR2.isApplied(HEAD_HTML) || EIC_PR1.isApplied(HEAD_HTML)) {
    const undone = EIC_UNDO.postPessHtml(HEAD_HTML);
    ok(undone.verified,
       '11.0 the EIC extraction is undone byte-exactly before reconstruction (' + undone.reason + ')');
    if (undone.verified) HEAD_HTML = undone.html;
  }
  const TAGS = {
    CONFIG_STATE: '<script src="' + CONFIG_STATE_TAG + '"></script>\n',
    SCAN_SERVICE: '<script src="' + SCAN_SERVICE_TAG + '"></script>\n',
    UI_PANEL: '<script src="' + UI_PANEL_TAG + '"></script>\n',
  };
  const OWNER_PART = { CONFIG_STATE: A.configPart, SCAN_SERVICE: A.servicePart, UI_PANEL: A.panelPart };
  const OWNER_DECLS = { CONFIG_STATE: A.configDecls, SCAN_SERVICE: A.serviceDecls, UI_PANEL: A.panelDecls };

  // The text of every relocated declaration, read out of the module that owns it.
  const spanText = new Map();
  for (const owner of SHIPPED_OWNERS) {
    for (const d of OWNER_DECLS[owner]) spanText.set(d.name, OWNER_PART[owner].code.slice(d.start, d.end));
  }
  eq(spanText.size, TOTAL_SFS_MANIFEST, '11.1 every one of the 62 declarations is available from its shipping module');

  function inlineOf(html) {
    const t = parseScriptTags(html).filter((x) => (x.src == null || String(x.src).trim() === '') && x.inline.length > 100000);
    return t.length === 1 ? t[0].inline : null;
  }
  // Every extraction that landed AFTER the pre-SFS baseline has to be undone for
  // the cumulative proof to reach that baseline. SFS is one of them; the PESS
  // config/rules relocation (PR 1 of 4) is another, and later PESS PRs will add
  // more. So the restorer is driven by a LIST of families rather than by a single
  // hard-coded predicate — each entry supplying its own name test and its own
  // span text, read from the module that ships it.
  // The PESS family ships across four PRs, so this is a LIST of modules and the
  // arithmetic below is DERIVED from whichever of them exist on disk. PR 2 added
  // the second entry and PR 3 the third, neither needing any other change here;
  // PR 4 will append its own the same way. Deliberately enumerated rather than
  // globbed `pess-*`: an unplanned PESS module must not be able to join this
  // proof unannounced. PR 3's module sits under js/ui/ rather than js/services/
  // because the PESS contract's §8 audit measured pessAnalyzeAll owning panel
  // DOM and rejected the planned "analysis service" label.
  const PESS_EXTRACTION_MODULES = [
    './js/services/pess-config-rules.js',
    './js/services/pess-live-transport.js',
    './js/ui/pess-batch-panel.js',
    './js/ui/pess-panel.js',
  ];
  const isPessName = (n) => {
    if (n === 'runPESSPanel') return true;
    const b = n.replace(/^_+/, '');
    if (!/^pess/i.test(b)) return false;
    const nx = b[4];
    return nx === undefined || nx === '_' || /[0-9]/.test(nx) ||
      (nx === nx.toUpperCase() && nx !== nx.toLowerCase());
  };
  const pessSpanText = new Map();
  const pessModulesPresent = [];
  for (const rel of PESS_EXTRACTION_MODULES) {
    const abs = path.resolve(__dirname, '..', rel.replace(/^\.\//, ''));
    if (!fs.existsSync(abs)) continue;
    pessModulesPresent.push(rel);
    const code = fs.readFileSync(abs, 'utf8');
    for (const d of scanTopLevelDeclarations(code, maskSource(code))) pessSpanText.set(d.name, code.slice(d.start, d.end));
  }
  const SFS_SOURCE = { label: 'SFS', match: isSfsName, text: spanText };
  const PESS_SOURCE = { label: 'PESS', match: isPessName, text: pessSpanText };

  // Reinsert every span the given SOURCES own, at the offsets they occupy in
  // `refMono`, then compare. Spans are restored in ascending refMono order, so
  // by the time span k is inserted the prefix before it already matches refMono
  // exactly — which is what makes a single offset arithmetic correct across
  // several families at once.
  function reconstruct(html, dropTags, refMono, sources) {
    const srcs = sources || [SFS_SOURCE];
    let out = html;
    for (const tag of dropTags) {
      if ((out.split(tag).length - 1) !== 1) return { error: 'tag not present exactly once: ' + tag.trim() };
      out = out.replace(tag, '');
    }
    const mono = inlineOf(out);
    if (mono == null) return { error: 'the reconstruction has no single inline monolith' };
    const monoAt = out.indexOf(mono);
    const spans = scanTopLevelDeclarations(refMono, maskSource(refMono))
      // Only spans a shipped module actually OWNS are restored: a family part-way
      // through its extraction (PESS, 4 of 9 shipped) still has members inline,
      // and those must be left exactly where they are.
      .filter((d) => srcs.some((x) => x.match(d.name) && x.text.has(d.name)))
      .sort((a, b) => a.start - b.start);
    for (const s of spans) {
      const owner = srcs.find((x) => x.match(s.name) && x.text.has(s.name));
      if (!owner) return { error: 'no shipped module owns ' + s.name };
      out = out.slice(0, monoAt + s.start) + owner.text.get(s.name) + out.slice(monoAt + s.start);
    }
    return { html: out, spans: spans.length, chars: spans.reduce((a, d) => a + d.chars, 0) };
  }

  let baseHtml = null, preHtml = null;
  if (GIT_OK) {
    for (const ref of [(() => { try { return git(['merge-base', 'HEAD', 'origin/dev-clean']).trim(); } catch (_) { return ''; } })(),
                       (() => { try { return git(['rev-list', '--max-parents=2', '-n', '1', 'HEAD']).trim(); } catch (_) { return ''; } })()]) {
      if (!ref) continue;
      let blob;
      try { blob = git(['show', ref + ':index.html']); } catch (_) { continue; }
      if (blob.indexOf('function _sfsInstallKeyboardNav(') < 0) continue;   // already extracted there
      baseHtml = blob; break;
    }
    try { preHtml = git(['show', PRE_SFS_REF + ':index.html']); } catch (_) { preHtml = null; }
  }

  // ── PROOF A — PR 3 only ───────────────────────────────────────────────────
  if (baseHtml) {
    const baseMono = inlineOf(baseHtml);
    const r = reconstruct(HEAD_HTML, [TAGS.UI_PANEL], baseMono);
    ok(!r.error, '11.2 PR-3 reconstruction runs' + (r.error ? ' — ' + r.error : ''));
    if (!r.error) {
      eq(r.spans, 20, '11.3 exactly 20 spans were reinserted');
      eq(r.chars, 28128, '11.4 …totalling 28128 declaration chars');
      eq(sha256(r.html), sha256(baseHtml), '11.5 PR-3 HEAD + the 20 spans − the tag === the PR-3 base, BYTE FOR BYTE');
      eq(r.html.length, baseHtml.length, '11.6 …and the lengths agree');
      eq(HEAD_HTML.length, baseHtml.length - 28128 + TAGS.UI_PANEL.length,
         '11.7 the size delta is exactly −28128 declaration chars +' + TAGS.UI_PANEL.length + ' tag chars');
      note('PROOF A — base ' + baseHtml.length + ' chars sha ' + sha256(baseHtml).slice(0, 16) +
           ' | head ' + HEAD_HTML.length + ' | reconstructed sha ' + sha256(r.html).slice(0, 16));
    }
  } else {
    note('PROOF A SKIPPED — the base index.html is not reachable through git here');
    ok(true, '11.2 PR-3 reconstruction skipped (base blob unavailable); span identity still pinned by §2.10c');
  }

  // ── PROOF B — the cumulative three-PR extraction ──────────────────────────
  if (preHtml) {
    const preMono = inlineOf(preHtml);
    // HEAD also carries every PESS relocation shipped so far, so reaching the
    // pre-SFS baseline means undoing those too: each module's tag comes off and
    // its spans go back. Both figures are DERIVED from the modules actually
    // present, never hard-coded — after PESS PR 3 that is 62 SFS + 7 PESS = 69
    // spans and 39,822 + 27,024 = 66,846 declaration chars, across 3 SFS + 3
    // PESS tags.
    const pessTags = pessModulesPresent
      .map((rel) => '<script src="' + rel + '"></script>\n')
      .filter((tag) => HEAD_HTML.indexOf(tag) >= 0);
    const pessShipped = pessSpanText.size > 0 && pessTags.length > 0;
    eq(pessTags.length, pessShipped ? pessModulesPresent.length : 0,
       '11.7b every PESS module present on disk is also LOADED by index.html — none is orphaned');
    const dropTags = [TAGS.CONFIG_STATE, TAGS.SCAN_SERVICE, TAGS.UI_PANEL].concat(pessTags);
    const sources = pessShipped ? [SFS_SOURCE, PESS_SOURCE] : [SFS_SOURCE];
    const PESS_SPANS = pessShipped ? pessSpanText.size : 0;
    const PESS_CHARS = pessShipped ? [...pessSpanText.values()].reduce((a, t) => a + t.length, 0) : 0;
    const r = reconstruct(HEAD_HTML, dropTags, preMono, sources);
    ok(!r.error, '11.8 cumulative reconstruction runs' + (r.error ? ' — ' + r.error : ''));
    if (!r.error) {
      eq(r.spans, TOTAL_SFS_MANIFEST + PESS_SPANS, '11.9 exactly ' + (TOTAL_SFS_MANIFEST + PESS_SPANS) + ' spans were reinserted (62 SFS + ' + PESS_SPANS + ' PESS)');
      eq(r.chars, TOTAL_SFS_DECLARATION_CHARS + PESS_CHARS, '11.10 …totalling ' + (TOTAL_SFS_DECLARATION_CHARS + PESS_CHARS) + ' declaration chars');
      eq(sha256(r.html), sha256(preHtml),
         '11.11 HEAD + all ' + (TOTAL_SFS_MANIFEST + PESS_SPANS) + ' spans − all ' + dropTags.length + ' tags === the pre-SFS index.html at ' + PRE_SFS_REF.slice(0, 7) + ', BYTE FOR BYTE');
      // The recorded historical value, so a changed pre-SFS baseline is loud rather
      // than silently re-derived from whatever that ref happens to point at.
      eq(sha256(preHtml), 'ab8eb3fe0e480c51c80b47152ea3c77b10d27031ad2a5ed1f0b5554074317070',
         '11.12 …and that pre-SFS blob is the recorded one');
      note('PROOF B — pre-SFS ' + preHtml.length + ' chars sha ' + sha256(preHtml).slice(0, 16) +
           ' | reconstructed sha ' + sha256(r.html).slice(0, 16));
    }
  } else {
    note('PROOF B SKIPPED — the pre-SFS commit ' + PRE_SFS_REF.slice(0, 7) + ' is not reachable through git here');
    ok(true, '11.8 cumulative reconstruction skipped (pre-SFS blob unavailable); span identity still pinned by §2.10a/b/c');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 10 — MUTATION PROOF
//
// Every guard above is re-run against a repository that could plausibly exist.
// A mutant that does not make some predicate throw is a WEAK mutant and fails the
// contract: it means the guard it targets does not actually guard anything.
// ═════════════════════════════════════════════════════════════════════════════
section('10. MUTATION PROOF');
const mutants = [];
function mutant(kind, name, fn) { mutants.push({ kind, name, fn }); }

const clonePartsWith = (mutate) => {
  const copy = APP_PARTS.map((p) => ({ name: p.name, kind: p.kind, code: p.code, src: p.src }));
  mutate(copy);
  return copy;
};
const partIdx = (list, name) => list.map((p) => p.name).indexOf(name);
const runSource = (parts) => { const M = analyze(parts); verifySource(M); verifyState(M); };

// ── SOURCE mutants ──────────────────────────────────────────────────────────
mutant('SOURCE', 'declaration omitted', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code = ps[i].code.replace('var _sfsWarmupQueue = [];\n', '');
})));
mutant('SOURCE', 'declaration duplicated inside the module', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code += '\nvar _sfsWarmupQueue = [];\n';
})));
mutant('SOURCE', 'declaration duplicated across module and monolith', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, '(inline)');
  ps[i].code += '\nvar _sfsSortCol = \'score\';\n';
})));
mutant('SOURCE', 'body changed (value)', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code = ps[i].code.replace('var SFS_BATCH_SIZE           = 20;', 'var SFS_BATCH_SIZE           = 21;');
})));
mutant('SOURCE', 'signature/whitespace reformatted', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code = ps[i].code.replace('var SFS_BATCH_SIZE           = 20;', 'var SFS_BATCH_SIZE = 20;');
})));
mutant('SOURCE', 'binding kind changed (var → const)', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code = ps[i].code.replace('var _sfsSortDir = \'desc\';', 'const _sfsSortDir = \'desc\';');
})));
mutant('SOURCE', 'extra declaration added to the module', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code += '\nvar _sfsSomethingNew = null;\n';
})));
mutant('SOURCE', 'async removed from _sfsRunScan', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, SCAN_SERVICE_TAG);
  ps[i].code = ps[i].code.replace('async function _sfsRunScan(', 'function _sfsRunScan(');
})));
mutant('SOURCE', 'declaration renamed', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code = ps[i].code.replace('var _sfsKbInstalled   = false;', 'var _sfsKeyboardInstalled = false;');
})));
mutant('SOURCE', 'CONFIG_STATE declaration left inline as well', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, '(inline)');
  ps[i].code += '\nvar _sfsResizeTimer = null;\n';
})));
mutant('SOURCE', 'the whole module is empty', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, CONFIG_STATE_TAG)].code = '// nothing\n';
})));

// ── PLAN mutants ────────────────────────────────────────────────────────────
mutant('PLAN', 'total manifest != 62', () => verifyPlan(MANIFEST.slice(0, 61)));
mutant('PLAN', 'declaration has zero owner', () => verifyPlan(MANIFEST.map((d, i) => (i === 0 ? { ...d, owner: 'NOBODY' } : d))));
mutant('PLAN', 'declaration has two owners', () => verifyPlan(MANIFEST.concat([{ ...MANIFEST[0], owner: 'UI_PANEL' }])));
mutant('PLAN', 'a planned owner is emptied', () => verifyPlan(MANIFEST.map((d) => (d.owner === 'SCAN_SERVICE' ? { ...d, owner: 'UI_PANEL' } : d))));
mutant('PLAN', 'SERVICE declaration extracted early in PR 1', () => runSource(clonePartsWith((ps) => {
  const inline = partIdx(ps, '(inline)'), cfg = partIdx(ps, CONFIG_STATE_TAG);
  const span = /(?:^|\n)(function _sfsCancelScan\(\)[\s\S]*?\n\})/.exec(ps[inline].code);
  ps[inline].code = ps[inline].code.replace(span[1], '');
  ps[cfg].code += '\n' + span[1] + '\n';
})));
mutant('PLAN', 'UI declaration extracted early in PR 1', () => runSource(clonePartsWith((ps) => {
  const inline = partIdx(ps, '(inline)'), cfg = partIdx(ps, CONFIG_STATE_TAG);
  const span = /(?:^|\n)(function _sfsCloseChart\(\)[\s\S]*?\n\})/.exec(ps[inline].code);
  ps[inline].code = ps[inline].code.replace(span[1], '');
  ps[cfg].code += '\n' + span[1] + '\n';
})));
mutant('PLAN', 'inline bootstrap reclassified as a declaration', () => {
  verifyPlan(MANIFEST.concat([{ name: 'squeezeFireScanner', kind: 'var', isAsync: false, owner: 'CONFIG_STATE' }]));
});
mutant('PLAN', 'a new SFS declaration is added inline with no owner (ratchet)', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nvar _sfsBrandNewCache = {};\n';
})));

// ── STATE mutants ───────────────────────────────────────────────────────────
mutant('STATE', 'second state owner module', () => runSource(clonePartsWith((ps) => {
  ps.splice(partIdx(ps, '(inline)'), 0, { name: './js/services/sfs-state.js', kind: 'local', src: './js/services/sfs-state.js', code: 'var _sfsWarmupQueue = [];\n' });
})));
mutant('STATE', 'cache split across two owners', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nvar _sfsWarmupCooldown  = {};\n';
})));
mutant('STATE', 'in-flight map split across two owners', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nvar _sfsSpyReadInflight = {};\n';
})));
mutant('STATE', 'timer handle split across two owners', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nvar _sfsWarmupDrainTimer = null;\n';
})));
mutant('STATE', 'the module reads a foreign global', () => runSource(clonePartsWith((ps) => {
  const i = partIdx(ps, CONFIG_STATE_TAG);
  ps[i].code = ps[i].code.replace('var _sfsWarmupQueue = [];', 'var _sfsWarmupQueue = WL ? [] : [];');
})));
mutant('STATE', 'the module writes shared state at load', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, CONFIG_STATE_TAG)].code += '\nS.squeezeFireScanner = {};\n';
})));

// ── LOAD mutants ────────────────────────────────────────────────────────────
const htmlWithout = HTML.replace('<script src="' + CONFIG_STATE_TAG + '"></script>\n', '');
mutant('LOAD', 'module tag missing', () => verifyLoad(buildScriptModel(htmlWithout)));
mutant('LOAD', 'tag duplicated', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + CONFIG_STATE_TAG + '"></script>',
    '<script src="' + CONFIG_STATE_TAG + '"></script>\n<script src="' + CONFIG_STATE_TAG + '"></script>'))));
mutant('LOAD', 'tag deferred', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + CONFIG_STATE_TAG + '">', '<script defer src="' + CONFIG_STATE_TAG + '">'))));
mutant('LOAD', 'tag async', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + CONFIG_STATE_TAG + '">', '<script async src="' + CONFIG_STATE_TAG + '">'))));
mutant('LOAD', 'tag type=module', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + CONFIG_STATE_TAG + '">', '<script type="module" src="' + CONFIG_STATE_TAG + '">'))));
mutant('LOAD', 'tag carries a second attribute', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + CONFIG_STATE_TAG + '">', '<script src="' + CONFIG_STATE_TAG + '" crossorigin="anonymous">'))));
mutant('LOAD', 'tag moved AFTER the inline monolith', () => {
  const tag = '<script src="' + CONFIG_STATE_TAG + '"></script>\n';
  const stripped = HTML.replace(tag, '');
  const at = stripped.lastIndexOf('</script>');
  verifyLoad(buildScriptModel(stripped.slice(0, at + '</script>'.length) + '\n' + tag + stripped.slice(at + '</script>'.length)));
});
mutant('LOAD', 'tag moved AFTER a consumer module', () => {
  const tag = '<script src="' + CONFIG_STATE_TAG + '"></script>\n';
  const stripped = HTML.replace(tag, '');
  const anchor = '<script src="./js/services/sfs-candle-detail-4h.js"></script>\n';
  verifyLoad(buildScriptModel(stripped.replace(anchor, anchor + tag)));
});
mutant('LOAD', 'a second state-owner module is created on disk', () => {
  const model = buildScriptModel(HTML.replace('<script src="' + CONFIG_STATE_TAG + '"></script>',
    '<script src="' + CONFIG_STATE_TAG + '"></script>\n<script src="./js/services/sfs-state.js"></script>'));
  verifyLoad(model);
});

// ── the two real masker defects, as mutants ─────────────────────────────────
mutant('PARSER', 'masker treats `return /re/` as division', () => {
  // The good masker sees all three declarations; the broken one lets the regex's
  // `{` leak into the depth counter and loses the two that follow.
  assert.strictEqual(scanTopLevelDeclarations(REGEX_KEYWORD_FIXTURE, maskSource(REGEX_KEYWORD_FIXTURE)).length, 3,
    'the GOOD masker must see all three declarations');
  const n = scanTopLevelDeclarations(REGEX_KEYWORD_FIXTURE, maskSourceWithoutRegexKeywords(REGEX_KEYWORD_FIXTURE)).length;
  assert.strictEqual(n, 3, 'declaration count changed under the broken masker: ' + n);
});
mutant('PARSER', 'masker splits by code point (astral shift)', () => {
  // Length preservation is the invariant that catches this one: code-point
  // splitting returns a shorter string, so every later offset addresses the
  // wrong character.
  assert.strictEqual(maskSource(ASTRAL_FIXTURE).length, ASTRAL_FIXTURE.length,
    'the GOOD masker must be length-preserving');
  const broken = maskSourceByCodePoint(ASTRAL_FIXTURE);
  assert.strictEqual(broken.length, ASTRAL_FIXTURE.length, 'masker is not length-preserving');
  const n = scanTopLevelDeclarations(ASTRAL_FIXTURE, broken).length;
  assert.strictEqual(n, 3, 'declaration count changed under the broken masker: ' + n);
});

// ── top-level side-effect mutants, run through the standalone evaluator ─────
function evalStandalone(code) {
  const sandbox = new Proxy(Object.create(null), {
    has() { return true; },
    get(target, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (Object.prototype.hasOwnProperty.call(target, prop)) return target[prop];
      throw new Error('load-time read of a foreign global: ' + String(prop));
    },
    set(target, prop, value) { target[prop] = value; return true; },
  });
  vm.runInContext(code, vm.createContext(sandbox));
  const declared = scanTopLevelDeclarations(code).length;
  assert.strictEqual(Object.keys(sandbox).length, declared,
    'loading the module defined ' + Object.keys(sandbox).length + ' names for ' + declared + ' declarations');
}
mutant('LOAD', 'top-level invocation added', () => evalStandalone(A.configPart.code + '\nObject.keys(_sfsWarmupQueue);\n'));
mutant('LOAD', 'top-level DOM access added', () => evalStandalone(A.configPart.code + '\ndocument.getElementById("x");\n'));
mutant('LOAD', 'top-level timer added', () => evalStandalone(A.configPart.code + '\nsetTimeout(function(){}, 0);\n'));
mutant('LOAD', 'top-level listener added', () => evalStandalone(A.configPart.code + '\nwindow.addEventListener("resize", function(){});\n'));
mutant('LOAD', 'top-level window assignment added', () => evalStandalone(A.configPart.code + '\nwindow.apexSfsConfig = 1;\n'));
mutant('LOAD', 'top-level storage access added', () => evalStandalone(A.configPart.code + '\nlocalStorage.getItem("x");\n'));
mutant('LOAD', 'top-level fetch added', () => evalStandalone(A.configPart.code + '\nfetch("/x");\n'));

// ── PR 2 SOURCE mutants — the scan-service module ───────────────────────────
const svcCode = () => APP_PARTS.filter((p) => p.name === SCAN_SERVICE_TAG)[0].code;
const withService = (mutate) => clonePartsWith((ps) => {
  const i = partIdx(ps, SCAN_SERVICE_TAG);
  ps[i].code = mutate(ps[i].code);
});
mutant('SOURCE', 'service function omitted', () => runSource(withService(
  (c) => c.replace(/function _sfsCancelScan\(\) \{[\s\S]*?\n\}/, ''))));
mutant('SOURCE', 'service function duplicated inside the module', () => runSource(withService(
  (c) => c + '\nfunction _sfsCancelScan() {\n  S.squeezeFireScanner.cancelled = true;\n}\n')));
mutant('SOURCE', 'service function duplicated across module and monolith', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nfunction _sfsCancelScan() {\n  S.squeezeFireScanner.cancelled = true;\n}\n';
})));
mutant('SOURCE', 'service function body changed', () => runSource(withService(
  (c) => c.replace('S.squeezeFireScanner.cancelled = true;', 'S.squeezeFireScanner.cancelled = false;'))));
mutant('SOURCE', 'service function signature changed', () => runSource(withService(
  (c) => c.replace('function _sfsAnalyzeSymbolTimeframe(symbol, tf, candles)', 'function _sfsAnalyzeSymbolTimeframe(symbol, tf, candles, extra)'))));
mutant('SOURCE', 'service function reformatted (whitespace)', () => runSource(withService(
  (c) => c.replace('function _sfsSleep(ms) {', 'function _sfsSleep( ms ) {'))));
mutant('SOURCE', 'service function renamed', () => runSource(withService(
  (c) => c.replace('function _sfsCancelScan()', 'function _sfsAbortScan()'))));
mutant('SOURCE', 'extra unrelated function added to the service', () => runSource(withService(
  (c) => c + '\nfunction _sfsSomethingNew() { return 1; }\n')));
mutant('SOURCE', 'service declaration remains inline as well', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nfunction _sfsSleep(ms) {\n  return new Promise(function(resolve) { setTimeout(resolve, Math.max(0, ms || 0)); });\n}\n';
})));
mutant('SOURCE', 'the whole service module is empty', () => runSource(withService(() => '// nothing\n')));
mutant('SOURCE', 'service declarations reordered', () => runSource(withService((c) => {
  // swap the two neighbouring declarations _sfsRunScan and _sfsCancelScan
  const decls = scanTopLevelDeclarations(c, maskSource(c)).sort((a, b) => a.start - b.start);
  const a = decls.filter((d) => d.name === '_sfsRunScan')[0];
  const b = decls.filter((d) => d.name === '_sfsCancelScan')[0];
  const ta = c.slice(a.start, a.end), tb = c.slice(b.start, b.end);
  return c.slice(0, a.start) + tb + c.slice(a.end, b.start) + ta + c.slice(b.end);
})));

// ── PR 2 OWNER mutants — who is allowed to hold what ────────────────────────
mutant('OWNER', 'UI declaration extracted early into the service', () => runSource(clonePartsWith((ps) => {
  const inline = partIdx(ps, '(inline)'), svc = partIdx(ps, SCAN_SERVICE_TAG);
  const span = /(?:^|\n)(function _sfsCloseChart\(\)[\s\S]*?\n\})/.exec(ps[inline].code);
  ps[inline].code = ps[inline].code.replace(span[1], '');
  ps[svc].code += '\n' + span[1] + '\n';
})));
mutant('OWNER', 'CONFIG_STATE binding duplicated into the service', () => runSource(withService(
  (c) => c + '\nvar _sfsSortCol = \'score\';\n')));
mutant('OWNER', 'service function filed into the config/state module', () => runSource(clonePartsWith((ps) => {
  const svc = partIdx(ps, SCAN_SERVICE_TAG), cfg = partIdx(ps, CONFIG_STATE_TAG);
  const span = /(function _sfsCancelScan\(\)[\s\S]*?\n\})/.exec(ps[svc].code);
  ps[svc].code = ps[svc].code.replace(span[1], '');
  ps[cfg].code += '\n' + span[1] + '\n';
})));
mutant('OWNER', 'config binding filed into the service module', () => runSource(clonePartsWith((ps) => {
  const svc = partIdx(ps, SCAN_SERVICE_TAG), cfg = partIdx(ps, CONFIG_STATE_TAG);
  ps[cfg].code = ps[cfg].code.replace('var _sfsSortDir = \'desc\';', '');
  ps[svc].code += '\nvar _sfsSortDir = \'desc\';\n';
})));
mutant('OWNER', 'window exposure moved into the service', () => {
  const code = svcCode() + "\ntry { if (typeof window !== 'undefined') window.apexDebugSfsDetailChart = apexDebugSfsDetailChart; } catch (e) {}\n";
  const masked = maskSource(code);
  assert.ok(!/\b(?:window|globalThis)\s*\.\s*[A-Za-z0-9_$]+\s*=/.test(masked),
    'the service must perform no window assignment');
});
mutant('OWNER', 'a second SFS state owner module appears', () => runSource(clonePartsWith((ps) => {
  ps.splice(partIdx(ps, '(inline)'), 0, { name: './js/services/sfs-state.js', kind: 'local', src: './js/services/sfs-state.js', code: 'var _sfsSortCol = \'score\';\n' });
})));

// ── PR 2 LOAD mutants — the service tag and its slot ────────────────────────
const svcTagLine = '<script src="' + SCAN_SERVICE_TAG + '"></script>';
mutant('LOAD', 'service tag missing', () => verifyLoad(buildScriptModel(HTML.replace(svcTagLine + '\n', ''))));
mutant('LOAD', 'service tag duplicated', () => verifyLoad(buildScriptModel(
  HTML.replace(svcTagLine, svcTagLine + '\n' + svcTagLine))));
mutant('LOAD', 'service tag deferred', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + SCAN_SERVICE_TAG + '">', '<script defer src="' + SCAN_SERVICE_TAG + '">'))));
mutant('LOAD', 'service tag async', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + SCAN_SERVICE_TAG + '">', '<script async src="' + SCAN_SERVICE_TAG + '">'))));
mutant('LOAD', 'service tag type=module', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + SCAN_SERVICE_TAG + '">', '<script type="module" src="' + SCAN_SERVICE_TAG + '">'))));
mutant('LOAD', 'service tag carries a second attribute', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + SCAN_SERVICE_TAG + '">', '<script src="' + SCAN_SERVICE_TAG + '" crossorigin="anonymous">'))));
mutant('LOAD', 'service tag moved AFTER the inline monolith', () => {
  const stripped = HTML.replace(svcTagLine + '\n', '');
  const at = stripped.lastIndexOf('</script>');
  verifyLoad(buildScriptModel(stripped.slice(0, at + '</script>'.length) + '\n' + svcTagLine + '\n' + stripped.slice(at + '</script>'.length)));
});
mutant('LOAD', 'service tag moved AFTER a candle consumer', () => {
  const stripped = HTML.replace(svcTagLine + '\n', '');
  const anchor = '<script src="./js/services/sfs-candle-detail-4h.js"></script>\n';
  verifyLoad(buildScriptModel(stripped.replace(anchor, anchor + svcTagLine + '\n')));
});
mutant('LOAD', 'service tag moved BEFORE the config/state module', () => {
  const stripped = HTML.replace(svcTagLine + '\n', '');
  const anchor = '<script src="' + CONFIG_STATE_TAG + '"></script>\n';
  verifyLoad(buildScriptModel(stripped.replace(anchor, svcTagLine + '\n' + anchor)));
});
// top-level side effects added to the service, caught by the standalone evaluator
// and by the structural residual predicate that verifySource applies.
const svcResidual = (extra) => {
  const parts = APP_PARTS.map((p) => ({ name: p.name, kind: p.kind, code: p.code, src: p.src }));
  parts[partIdx(parts, SCAN_SERVICE_TAG)].code = svcCode() + extra;
  runSource(parts);
};
mutant('LOAD', 'service top-level invocation added', () => svcResidual('\n_sfsCancelScan();\n'));
mutant('LOAD', 'service top-level DOM access added', () => svcResidual('\ndocument.getElementById("x");\n'));
mutant('LOAD', 'service top-level timer added', () => svcResidual('\nsetTimeout(function(){}, 0);\n'));
mutant('LOAD', 'service top-level listener added', () => svcResidual('\nwindow.addEventListener("resize", function(){});\n'));
mutant('LOAD', 'service top-level window assignment added', () => svcResidual('\nwindow.apexSfsScan = 1;\n'));
mutant('LOAD', 'service top-level fetch added', () => svcResidual('\nfetch("/x");\n'));
mutant('LOAD', 'service top-level storage access added', () => svcResidual('\nlocalStorage.getItem("x");\n'));
mutant('LOAD', 'service wrapped in an IIFE', () => svcResidual('\n(function(){ var x = 1; })();\n'));

// ── PR 2 PLAN mutants — the plan numbers themselves ─────────────────────────
mutant('PLAN', 'service owner != 9 declarations', () => {
  assert.strictEqual(namesOf('SCAN_SERVICE').length, 9, 'SCAN_SERVICE must hold exactly 9 declarations');
  const shrunk = MANIFEST.filter((d) => d.name !== '_sfsCancelScan');
  assert.strictEqual(shrunk.filter((d) => d.owner === 'SCAN_SERVICE').length, 9, 'mutated manifest must be caught');
});
mutant('PLAN', 'UI owner != 20 declarations', () => {
  const moved = MANIFEST.map((d) => (d.name === '_sfsRender' ? { ...d, owner: 'SCAN_SERVICE' } : d));
  assert.strictEqual(moved.filter((d) => d.owner === 'UI_PANEL').length, 20, 'UI_PANEL must still hold 20');
});
mutant('PLAN', 'service chars != 10635', () => {
  const n = SCAN_SERVICE_SPANS.reduce((a, s) => a + s.chars, 0);
  assert.strictEqual(n, 10635, 'recorded service chars must total 10635');
  const bad = SCAN_SERVICE_SPANS.map((s) => (s.name === '_sfsSleep' ? { ...s, chars: s.chars + 1 } : s));
  assert.strictEqual(bad.reduce((a, s) => a + s.chars, 0), 10635, 'a per-declaration char drift must be caught');
});
mutant('PLAN', 'owner chars no longer partition the total', () => {
  assert.strictEqual(OWNER_CHARS.CONFIG_STATE + OWNER_CHARS.SCAN_SERVICE + OWNER_CHARS.UI_PANEL,
    TOTAL_SFS_DECLARATION_CHARS, 'owner chars must sum to the total');
  assert.strictEqual(1059 + 10636 + 28128, TOTAL_SFS_DECLARATION_CHARS, 'a shifted split must be caught');
});
mutant('PLAN', 'inline allowance != 20', () => {
  assert.strictEqual(INLINE_ALLOWANCE_NOW, 20, 'the post-PR-2 inline allowance is 20');
  assert.strictEqual(INLINE_ALLOWANCE_AFTER_PR1 - namesOf('SCAN_SERVICE').length, 21, 'a wrong allowance must be caught');
});
mutant('PLAN', 'the ratchet grows instead of shrinking', () => {
  assert.ok(INLINE_ALLOWANCE_NOW < INLINE_ALLOWANCE_AFTER_PR1, 'the allowance must strictly shrink');
  assert.ok(INLINE_ALLOWANCE_AFTER_PR1 < INLINE_ALLOWANCE_NOW, 'a growing allowance must be caught');
});
mutant('PLAN', 'async invariant dropped from the plan', () => {
  assert.deepStrictEqual(ASYNC_NAMES, ['_sfsRunScan'], 'the recorded async set is _sfsRunScan');
  assert.deepStrictEqual(ASYNC_NAMES, [], 'an emptied async set must be caught');
});

// ── PR 3 SOURCE mutants — the UI panel module ───────────────────────────────
const panelCode = () => APP_PARTS.filter((p) => p.name === UI_PANEL_TAG)[0].code;
const withPanel = (mutate) => clonePartsWith((ps) => {
  const i = partIdx(ps, UI_PANEL_TAG);
  ps[i].code = mutate(ps[i].code);
});
mutant('SOURCE', 'UI function omitted', () => runSource(withPanel(
  (c) => c.replace(/function _sfsCloseChart\(\) \{[\s\S]*?\n\}/, ''))));
mutant('SOURCE', 'UI function duplicated inside the module', () => runSource(withPanel(
  (c) => c + '\nfunction _sfsCloseChart() {\n  S.squeezeFireScanner.chartSymbol = null;\n}\n')));
mutant('SOURCE', 'UI function duplicated across module and monolith', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nfunction _sfsCloseChart() {\n  S.squeezeFireScanner.chartSymbol = null;\n}\n';
})));
mutant('SOURCE', 'UI function body changed', () => runSource(withPanel(
  (c) => c.replace("S.squeezeFireScanner.chartSymbol = null;", "S.squeezeFireScanner.chartSymbol = '';"))));
mutant('SOURCE', 'UI function signature changed', () => runSource(withPanel(
  (c) => c.replace('function _sfsToggleChart(symbol, idx)', 'function _sfsToggleChart(symbol, idx, extra)'))));
mutant('SOURCE', 'UI function reformatted (whitespace)', () => runSource(withPanel(
  (c) => c.replace('function _sfsCloseChart() {', 'function _sfsCloseChart(  ) {'))));
mutant('SOURCE', 'UI function renamed', () => runSource(withPanel(
  (c) => c.replace('function _sfsCloseChart()', 'function _sfsDismissChart()'))));
mutant('SOURCE', 'extra unrelated function added to the panel', () => runSource(withPanel(
  (c) => c + '\nfunction _sfsSomethingNew() { return 1; }\n')));
mutant('SOURCE', 'UI declaration remains inline as well', () => runSource(clonePartsWith((ps) => {
  ps[partIdx(ps, '(inline)')].code += '\nfunction _sfsRenderProgress() {\n  return null;\n}\n';
})));
mutant('SOURCE', 'the whole panel module is empty', () => runSource(withPanel(() => '// nothing\n')));
mutant('SOURCE', 'UI declarations reordered', () => runSource(withPanel((c) => {
  const decls = scanTopLevelDeclarations(c, maskSource(c)).sort((a, b) => a.start - b.start);
  const a = decls.filter((d) => d.name === '_sfsToggleChart')[0];
  const b = decls.filter((d) => d.name === '_sfsOpenChart')[0];
  const ta = c.slice(a.start, a.end), tb = c.slice(b.start, b.end);
  return c.slice(0, a.start) + tb + c.slice(a.end, b.start) + ta + c.slice(b.end);
})));
mutant('SOURCE', 'async accidentally added to a UI declaration', () => runSource(withPanel(
  (c) => c.replace('function _sfsOpenChart(symbol)', 'async function _sfsOpenChart(symbol)'))));

// ── PR 3 OWNER mutants — who is allowed to hold what ────────────────────────
mutant('OWNER', 'UI declaration filed into the scan-service module', () => runSource(clonePartsWith((ps) => {
  const panel = partIdx(ps, UI_PANEL_TAG), svc = partIdx(ps, SCAN_SERVICE_TAG);
  const span = /(function _sfsCloseChart\(\)[\s\S]*?\n\})/.exec(ps[panel].code);
  ps[panel].code = ps[panel].code.replace(span[1], '');
  ps[svc].code += '\n' + span[1] + '\n';
})));
mutant('OWNER', 'UI declaration filed into the config/state module', () => runSource(clonePartsWith((ps) => {
  const panel = partIdx(ps, UI_PANEL_TAG), cfg = partIdx(ps, CONFIG_STATE_TAG);
  const span = /(function _sfsCloseChart\(\)[\s\S]*?\n\})/.exec(ps[panel].code);
  ps[panel].code = ps[panel].code.replace(span[1], '');
  ps[cfg].code += '\n' + span[1] + '\n';
})));
mutant('OWNER', 'CONFIG_STATE binding duplicated into the panel', () => runSource(withPanel(
  (c) => c + "\nvar _sfsSortCol = 'score';\n")));
mutant('OWNER', 'a NEW state binding is added to the panel', () => runSource(withPanel(
  (c) => c + '\nvar _sfsPanelCache = {};\n')));
mutant('OWNER', 'a SCAN_SERVICE function is duplicated into the panel', () => runSource(withPanel(
  (c) => c + '\nfunction _sfsCancelScan() { S.squeezeFireScanner.cancelled = true; }\n')));
mutant('OWNER', 'a candle-module declaration is duplicated into the panel', () => runSource(withPanel(
  (c) => c + '\nfunction _sfsCandlesUsable(a) { return !!a; }\n')));
mutant('OWNER', 'the resize listener is moved into the panel', () => {
  const code = panelCode() + "\nwindow.addEventListener('resize', function() {});\n";
  const parts = APP_PARTS.map((p) => ({ name: p.name, kind: p.kind, code: p.code, src: p.src }));
  parts[partIdx(parts, UI_PANEL_TAG)].code = code;
  runSource(parts);
});

// ── PR 3 LOAD mutants — the panel tag and its slot ──────────────────────────
const panelTagLine = '<script src="' + UI_PANEL_TAG + '"></script>';
mutant('LOAD', 'panel tag missing', () => verifyLoad(buildScriptModel(HTML.replace(panelTagLine + '\n', ''))));
mutant('LOAD', 'panel tag duplicated', () => verifyLoad(buildScriptModel(
  HTML.replace(panelTagLine, panelTagLine + '\n' + panelTagLine))));
mutant('LOAD', 'panel tag deferred', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + UI_PANEL_TAG + '">', '<script defer src="' + UI_PANEL_TAG + '">'))));
mutant('LOAD', 'panel tag async', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + UI_PANEL_TAG + '">', '<script async src="' + UI_PANEL_TAG + '">'))));
mutant('LOAD', 'panel tag type=module', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + UI_PANEL_TAG + '">', '<script type="module" src="' + UI_PANEL_TAG + '">'))));
mutant('LOAD', 'panel tag nomodule', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + UI_PANEL_TAG + '">', '<script nomodule src="' + UI_PANEL_TAG + '">'))));
mutant('LOAD', 'panel tag carries a second attribute', () => verifyLoad(buildScriptModel(
  HTML.replace('<script src="' + UI_PANEL_TAG + '">', '<script src="' + UI_PANEL_TAG + '" crossorigin="anonymous">'))));
mutant('LOAD', 'panel tag moved AFTER the inline monolith', () => {
  const stripped = HTML.replace(panelTagLine + '\n', '');
  const at = stripped.lastIndexOf('</script>');
  verifyLoad(buildScriptModel(stripped.slice(0, at + '</script>'.length) + '\n' + panelTagLine + '\n' + stripped.slice(at + '</script>'.length)));
});
mutant('LOAD', 'panel tag moved BEFORE the config/state module', () => {
  const stripped = HTML.replace(panelTagLine + '\n', '');
  const anchor = '<script src="' + CONFIG_STATE_TAG + '"></script>\n';
  verifyLoad(buildScriptModel(stripped.replace(anchor, panelTagLine + '\n' + anchor)));
});
mutant('LOAD', 'panel tag moved BEFORE the scan service it calls', () => {
  const stripped = HTML.replace(panelTagLine + '\n', '');
  const anchor = '<script src="' + SCAN_SERVICE_TAG + '"></script>\n';
  verifyLoad(buildScriptModel(stripped.replace(anchor, panelTagLine + '\n' + anchor)));
});
mutant('LOAD', 'panel tag moved BEFORE a candle module it calls', () => {
  const stripped = HTML.replace(panelTagLine + '\n', '');
  const anchor = '<script src="./js/services/sfs-candle-predicates.js"></script>\n';
  verifyLoad(buildScriptModel(stripped.replace(anchor, panelTagLine + '\n' + anchor)));
});
// top-level side effects added to the panel, caught by the structural residual
// predicate that verifySource applies. This is the group a naive regex CANNOT do:
// the file already contains every one of these forms inside function bodies.
const panelResidual = (extra) => {
  const parts = APP_PARTS.map((p) => ({ name: p.name, kind: p.kind, code: p.code, src: p.src }));
  parts[partIdx(parts, UI_PANEL_TAG)].code = panelCode() + extra;
  runSource(parts);
};
mutant('LOAD', 'panel top-level invocation added', () => panelResidual('\n_sfsInit();\n'));
mutant('LOAD', 'panel top-level DOM read added', () => panelResidual('\ndocument.getElementById("x");\n'));
mutant('LOAD', 'panel top-level DOM write added', () => panelResidual('\ndocument.getElementById("x").innerHTML = "";\n'));
mutant('LOAD', 'panel top-level timer added', () => panelResidual('\nsetTimeout(function(){}, 0);\n'));
mutant('LOAD', 'panel top-level listener added', () => panelResidual('\ndocument.addEventListener("keydown", function(){});\n'));
mutant('LOAD', 'panel top-level window assignment added', () => panelResidual('\nwindow.apexSfsPanel = 1;\n'));
mutant('LOAD', 'panel top-level fetch added', () => panelResidual('\nfetch("/x");\n'));
mutant('LOAD', 'panel top-level storage access added', () => panelResidual('\nlocalStorage.getItem("x");\n'));
mutant('LOAD', 'panel wrapped in an IIFE', () => panelResidual('\n(function(){ var x = 1; })();\n'));
mutant('LOAD', 'panel gains an endpoint literal', () => panelResidual('\nfunction _sfsPanelUrl() { return "https://backend.test/market/candles"; }\n'));

// ── PR 3 PLAN mutants — the plan numbers themselves ─────────────────────────
mutant('PLAN', 'UI owner != 20 declarations', () => {
  assert.strictEqual(namesOf('UI_PANEL').length, 20, 'UI_PANEL must hold exactly 20 declarations');
  const shrunk = MANIFEST.filter((d) => d.name !== '_sfsCloseChart');
  assert.strictEqual(shrunk.filter((d) => d.owner === 'UI_PANEL').length, 20, 'a shrunken manifest must be caught');
});
mutant('PLAN', 'UI chars != 28128', () => {
  const n = UI_PANEL_SPANS.reduce((a, s) => a + s.chars, 0);
  assert.strictEqual(n, 28128, 'recorded UI chars must total 28128');
  const bad = UI_PANEL_SPANS.map((s) => (s.name === '_sfsCloseChart' ? { ...s, chars: s.chars + 1 } : s));
  assert.strictEqual(bad.reduce((a, s) => a + s.chars, 0), 28128, 'a per-declaration char drift must be caught');
});
mutant('PLAN', 'the ratchet stays at 20 instead of reaching 0', () => {
  assert.strictEqual(INLINE_ALLOWANCE_NOW, 0, 'the post-PR-3 inline allowance is 0');
  assert.strictEqual(INLINE_ALLOWANCE_AFTER_PR2 - namesOf('UI_PANEL').length, 20,
    'an allowance that did not shrink must be caught');
});
mutant('PLAN', 'an owner is still marked pending after PR 3', () => {
  assert.deepStrictEqual(PENDING_OWNERS, [], 'no owner may remain pending');
  assert.deepStrictEqual(['UI_PANEL'], [], 'a lingering pending owner must be caught');
});
mutant('PLAN', 'the UI owner is dropped from the shipped set', () => {
  assert.ok(SHIPPED_OWNERS.indexOf('UI_PANEL') >= 0, 'UI_PANEL must be a shipped owner');
  assert.ok(['CONFIG_STATE', 'SCAN_SERVICE'].indexOf('UI_PANEL') >= 0, 'a dropped owner must be caught');
});
mutant('PLAN', 'the UI panel is left out of the ratchet scope', () => {
  assert.ok(RATCHET_SCOPE.indexOf(UI_PANEL_TAG) >= 0, 'the panel module must be inside the ratchet scope');
  assert.ok(['(inline)', CONFIG_STATE_TAG, SCAN_SERVICE_TAG].indexOf(UI_PANEL_TAG) >= 0,
    'a scope that omits the panel must be caught');
});
mutant('PLAN', 'a UI declaration is re-marked async in the plan', () => {
  assert.ok(UI_PANEL_SPANS.every((s) => !s.isAsync), 'no UI declaration is async');
  assert.ok(UI_PANEL_SPANS.map((s) => (s.name === '_sfsRender' ? { ...s, isAsync: true } : s)).every((s) => !s.isAsync),
    'an async UI declaration must be caught');
});

// ── BEHAVIOUR mutants — run the REAL parity fixtures against a mutated service
//
// These are what make section 8B meaningful: they prove the transcript comparison
// actually detects a semantic change, rather than passing because the observation
// is too coarse. Each mutant must make at least one fixture differ from the base.
const behaviourMutants = [
  ['cancel becomes a no-op', (c) => c.replace('S.squeezeFireScanner.cancelled = true;', 'S.squeezeFireScanner.cancelled = false;')],
  ['sort direction flipped', (c) => c.replace("var col = _sfsSortCol, dir = _sfsSortDir === 'desc' ? -1 : 1;", "var col = _sfsSortCol, dir = _sfsSortDir === 'desc' ? 1 : -1;")],
  ['filter predicate altered', (c) => c.replace("if (!f.timeframes[r.timeframe]) return false;", "if (!f.timeframes[r.timeframe]) return true;")],
  ['price precedence altered (4H before 1D)', (c) => c.replace("var tfs  = ['1D', '4H'];", "var tfs  = ['4H', '1D'];")],
  ['progress increment removed', (c) => c.replace('sfs.progress.done++;', '')],
  ['async orchestration altered (concurrency cap)', (c) => c.replace('t += SFS_MAX_CONCURRENT_READS', 't += 1')],
  ['batch size ignored', (c) => c.replace('batchStart += SFS_BATCH_SIZE', 'batchStart += 1')],
  // _sfsRunScan carries FOUR cancellation checks: two in the batch loop, one in the
  // chunk loop and one per task. Measured, only the PER-TASK guard is independently
  // observable — it is the innermost, so it subsumes the other three: with it in
  // place, deleting any of the outer checks changes no fetch, no callback and no
  // state transition. The outer three are therefore EQUIVALENT mutants, not
  // coverage gaps, and are deliberately not listed: an unkillable mutant would
  // report a weakness that does not exist. All four are preserved byte-for-byte by
  // the relocation regardless — §2.10b hashes the whole declaration.
  ['per-task cancellation guard dropped', (c) => c.replace('        if (sfs.cancelled) return Promise.resolve(null);\n', '')],
  ['final render loses keepChart', (c) => c.replace('_sfsRender({ keepChart: !!sfs.chartSymbol });', '_sfsRender();')],
  ['scoring threshold changed', (c) => c.replace("strength: pts >= 3 ? 'STRONG' : 'WEAK'", "strength: pts >= 2 ? 'STRONG' : 'WEAK'")],
  ['sync source stops promoting the buffer', (c) => c.replace("return { candles: buf, path: 'dxlinkBuffer' };", 'return null;')],
  ['debug snapshot drops a field', (c) => c.replace('phase: _sfsDetail4hPhase[symbol] || null,', '')],
];

// ── PR 3 BEHAVIOUR mutants — the REAL UI fixtures against a mutated panel
//
// These are what make section 8C meaningful rather than decorative: each mutant is a
// real semantic change to a relocated UI function, and each must make at least one of
// the 8C fixtures differ from the base transcript. A mutant that survives would mean
// the transcript is too coarse to notice that kind of change.
const panelBehaviourMutants = [
  // one meaningful DOM mutation removed
  ['4H detail state stops writing the label colour',
    (c) => c.replace("if (lbl) { lbl.textContent = st.label; lbl.style.color = 'var(--tx3)'; }", 'if (lbl) { lbl.textContent = st.label; }')],
  ['the 4H detail state stops writing the wrap at all',
    (c) => c.replace("wrap.innerHTML = '<div class=\"dss-no-data\">' + st.msg + '</div>';", '')],
  ['the squeeze bar colour is dropped',
    (c) => c.replace("if (sqzBarEl) { sqzBarEl.style.background = sqz ? '#e8445a' : sqzFired ? '#00d48a' : '#3a3a4a'; sqzBarEl.style.opacity = (sqzFired && !sqz) ? '0.75' : '1'; }", '')],
  ['the progress counter text changes',
    (c) => c.replace("el.textContent = 'Scanning ' + p.done + '/' + p.total + '…';", "el.textContent = 'Scanning ' + p.total + '/' + p.done + '…';")],
  ['the active-tab marker stops clearing the other tabs',
    (c) => c.replace("if (el) el.className = 'ptab' + (t === 'sfs' ? ' active' : '');", "if (el && t === 'sfs') el.className = 'ptab active';")],
  // one meaningful STATE mutation removed
  ['toggleChart stops aligning the keyboard selection with the click',
    (c) => c.replace("if (typeof idx === 'number' && idx >= 0) sfs.selectedIndex = idx;", '')],
  ['render stops publishing the candidate list',
    (c) => c.replace('    _sfsCandidateList = sorted;\n', '')],
  ['render stops clamping the selection to the visible rows',
    (c) => c.replace('    if (sfs.selectedIndex >= sorted.length) sfs.selectedIndex = sorted.length - 1;\n', '')],
  ['openChart stops setting the loading phase',
    (c) => c.replace("_sfsDetail4hPhase[symbol] = 'loading';", '')],
  // filter / toggle / sort behaviour altered
  ['the timeframe toggle sets instead of flipping',
    (c) => c.replace('S.squeezeFireScanner.filters.timeframes[tf] = !S.squeezeFireScanner.filters.timeframes[tf];',
                     'S.squeezeFireScanner.filters.timeframes[tf] = true;')],
  ['setFilter writes the wrong key',
    (c) => c.replace('S.squeezeFireScanner.filters[key] = val;', 'S.squeezeFireScanner.filters.search = val;')],
  ['the sort direction no longer alternates on the same column',
    (c) => c.replace("if (_sfsSortCol === col) { _sfsSortDir = _sfsSortDir === 'desc' ? 'asc' : 'desc'; }",
                     "if (_sfsSortCol === col) { _sfsSortDir = 'desc'; }")],
  ['a new sort column no longer resets the direction to desc',
    (c) => c.replace("else { _sfsSortCol = col; _sfsSortDir = 'desc'; }", 'else { _sfsSortCol = col; }')],
  ['the overlay toggle ignores the checkbox',
    (c) => c.replace('S.squeezeFireScanner.chartOverlay.sma8 = !!(cb && cb.checked);',
                     'S.squeezeFireScanner.chartOverlay.sma8 = true;')],
  ['the overlay toggle stops redrawing an open chart',
    (c) => c.replace('if (S.squeezeFireScanner.chartSymbol) _sfsDrawCharts(S.squeezeFireScanner.chartSymbol);', '')],
  ['the controls stop re-rendering with keepChart',
    (c) => c.replace("S.squeezeFireScanner.filters[key] = val;\n  _sfsRender({ keepChart: true });",
                     "S.squeezeFireScanner.filters[key] = val;\n  _sfsRender();")],
  // chart open / close transition altered
  ['toggleChart no longer closes an already-open symbol',
    (c) => c.replace('if (sfs.chartSymbol === symbol) { _sfsCloseChart(); }', 'if (false) { _sfsCloseChart(); }')],
  ['closeChart stops hiding the detail wrap',
    (c) => c.replace("if (wrap) wrap.style.display = 'none';", '')],
  ['openChart stops revealing the detail wrap',
    (c) => c.replace("wrap.style.display = 'block';", '')],
  ['openChart drops the stale-symbol guard on the 4H resolution',
    (c) => c.replace('    if (S.squeezeFireScanner.chartSymbol !== symbol) return;   // navigated away — no stale render\n', '')],
  ['openSelectedChart redraws instead of only moving the highlight when already open',
    (c) => c.replace('    _sfsUpdateSelectionVisual(true);\n    return;\n', '    _sfsUpdateSelectionVisual(true);\n')],
  ['openSelectedChart stops restoring the list scroll position',
    (c) => c.replace('if (newScroll) newScroll.scrollTop = savedTop;', '')],
  // keyboard guard / listener altered
  ['the keyboard install guard is dropped',
    (c) => c.replace('  if (_sfsKbInstalled) return;\n  _sfsKbInstalled = true;\n', '  _sfsKbInstalled = true;\n')],
  ['keyboard nav no longer requires the panel to be active',
    (c) => c.replace('if (!sfs || !sfs.active || !_sfsFocused) return;', 'if (!sfs || !_sfsFocused) return;')],
  ['keyboard nav no longer requires focus',
    (c) => c.replace('if (!sfs || !sfs.active || !_sfsFocused) return;', 'if (!sfs || !sfs.active) return;')],
  ['arrow navigation stops clamping at the end of the list',
    (c) => c.replace('? Math.min(cur + 1, list.length - 1)', '? cur + 1')],
  ['arrow navigation stops clamping at the start of the list',
    (c) => c.replace('        : Math.max(cur - 1, 0);', '        : cur - 1;')],
  ['Escape closes the chart even when none is open',
    (c) => c.replace("if (sfs.chartSymbol) { e.preventDefault(); _sfsCloseChart(); }", 'e.preventDefault(); _sfsCloseChart();')],
  ['the typing guard stops excluding INPUT',
    (c) => c.replace("if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'", "if (t && (t.tagName === '__NEVER__' || t.tagName === 'TEXTAREA'")],
  ['the mousedown handler stops scoping focus to the SFS containers',
    (c) => c.replace('_sfsFocused = !!((root && root.contains(e.target)) ||\n                     (detail && detail.contains(e.target)));', '_sfsFocused = true;')],
  // a renderer / service call dropped or reordered
  ['the RSI panel is no longer drawn',
    (c) => c.replace('_mcxDrawRsi(rsiId, ind.rsi, viewLen);', '')],
  ['the RS panel is no longer drawn',
    (c) => c.replace('_sfsDrawRsPanel(symbol, tf, rsId, candles, viewLen);', '')],
  ['the candle chart and the RSI panel are drawn in the opposite order',
    (c) => c.replace(
      "_drawCandleChart(wrapId, candles, ind, { showSMA8: S.squeezeFireScanner.chartOverlay.sma8, lastSma8: ind.lastSma8, showBB: true, showKC: true, source: 'BACKEND_DXLINK_CANDLES', rsi: ind.lastRsi });\n  _mcxDrawRsi(rsiId, ind.rsi, viewLen);",
      "_mcxDrawRsi(rsiId, ind.rsi, viewLen);\n  _drawCandleChart(wrapId, candles, ind, { showSMA8: S.squeezeFireScanner.chartOverlay.sma8, lastSma8: ind.lastSma8, showBB: true, showKC: true, source: 'BACKEND_DXLINK_CANDLES', rsi: ind.lastRsi });")],
  ['the two timeframes are drawn in the opposite order',
    (c) => c.replace(
      "_sfsDrawOneTf(symbol, '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', live.price);\n  _sfsDrawOneTf(symbol, '4H', 'sfs-big-wrap-4h', 'sfs-rsi-4h', 'sfs-rs-4h', 'sfs-sqzbar-4h', 'sfs-sqzlbl-4h', live.price);",
      "_sfsDrawOneTf(symbol, '4H', 'sfs-big-wrap-4h', 'sfs-rsi-4h', 'sfs-rs-4h', 'sfs-sqzbar-4h', 'sfs-sqzlbl-4h', live.price);\n  _sfsDrawOneTf(symbol, '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', live.price);")],
  ['render stops marking the SFS tab active',
    (c) => c.replace('  _sfsActivePanelTab();\n', '')],
  ['render stops calling the service filter',
    (c) => c.replace('var filtered = _sfsGetFilteredResults();', 'var filtered = S.squeezeFireScanner.results.slice();')],
  ['render stops calling the service sort',
    (c) => c.replace('var sorted   = _sfsSortResults(filtered);', 'var sorted   = filtered;')],
  ['the render price is resolved per timeframe instead of once',
    (c) => c.replace('  var live = _sfsResolveRenderPrice(symbol);', '  var live = { price: null, source: null };')],
  ['the RS panel skips the sync SPY source',
    (c) => c.replace("var sync = _sfsCandlesFromSyncSource('SPY', tf);", 'var sync = null;')],
  ['the RS overlap guard is relaxed',
    (c) => c.replace('if (Math.min(candles.length, spy.length) <= 20) {', 'if (Math.min(candles.length, spy.length) <= 0) {')],
  ['openChart stops requesting the 4H detail candles',
    (c) => c.replace('  _sfsEnsureDetail4hCandles(symbol).then(function(res) {', '  Promise.resolve(null).then(function(res) {')],
  ['the selection highlight is no longer applied',
    (c) => c.replace("row.classList.add('sfs-selected');", '')],
  ['the previous selection highlight is no longer removed',
    (c) => c.replace("if (prev) prev.classList.remove('sfs-selected');", '')],
  ['the selected row is no longer scrolled into view',
    (c) => c.replace("if (scroll) row.scrollIntoView({ block: 'nearest' });", '')],
  ['_sfsInit stops installing keyboard navigation',
    (c) => c.replace('  _sfsInstallKeyboardNav();\n', '')],
];

// ── run every mutant: each must make a predicate throw ───────────────────────
async function runAllMutants() {
  const weak = [];
  for (const m of mutants) {
    let threw = false;
    try { m.fn(); } catch (_) { threw = true; }
    if (!threw) weak.push(m.kind + ' / ' + m.name);
  }
  // BEHAVIOUR mutants are async: they drive the real functions.
  const { observe, SCENARIOS, CONFIG_SRC, baseBlock } = SERVICE_PARITY;
  let behaviourRun = 0;
  for (const [name, mutate] of behaviourMutants) {
    const mutated = mutate(svcCode());
    if (mutated === svcCode()) { weak.push('BEHAVIOUR / ' + name + ' (mutation did not apply)'); continue; }
    behaviourRun++;
    let differed = false;
    for (const sc of SCENARIOS) {
      const b = await observe(CONFIG_SRC + '\n' + baseBlock, sc);
      let h;
      try { h = await observe(CONFIG_SRC + '\n' + mutated, sc); } catch (_) { differed = true; break; }
      try { assert.deepStrictEqual(h, b); } catch (_) { differed = true; break; }
    }
    if (!differed) weak.push('BEHAVIOUR / ' + name);
  }
  // PR 3's UI behaviour mutants, run against the REAL 8C fixtures the same way.
  const P = PANEL_PARITY;
  let uiBehaviourRun = 0;
  for (const [name, mutate] of panelBehaviourMutants) {
    const mutated = mutate(panelCode());
    if (mutated === panelCode()) { weak.push('UI-BEHAVIOUR / ' + name + ' (mutation did not apply)'); continue; }
    uiBehaviourRun++;
    let differed = false;
    for (const sc of P.SCENARIOS) {
      const b = await P.observe(P.CONFIG_SRC + '\n' + P.baseBlock, sc);
      let h;
      try { h = await P.observe(P.CONFIG_SRC + '\n' + mutated, sc); } catch (_) { differed = true; break; }
      try { assert.deepStrictEqual(h, b); } catch (_) { differed = true; break; }
    }
    if (!differed) weak.push('UI-BEHAVIOUR / ' + name);
  }
  deepEq(weak, [], '10.1 every mutant is caught — weak mutants: ' + weak.join(' | '));
  eq(weak.length, 0, '10.2 zero weak mutants');
  const byKind = {};
  for (const m of mutants) byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  byKind.BEHAVIOUR = behaviourRun;
  byKind['UI-BEHAVIOUR'] = uiBehaviourRun;
  const total = mutants.length + behaviourRun + uiBehaviourRun;
  note('mutants: ' + total + ' (' + Object.keys(byKind).sort().map((k) => k + ' ' + byKind[k]).join(', ') + '), ' + weak.length + ' weak');
}

// ═════════════════════════════════════════════════════════════════════════════
// Section 8B is asynchronous (it awaits the real _sfsRunScan on both sides), so the
// report is emitted from finish(), which 8B calls once every fixture has been
// compared. Sections 9 and 10 run synchronously before that resolution, so their
// assertions are already recorded by the time this prints.
function finish() {
  console.log('\n' + '─'.repeat(78));
  console.log('assertions: ' + (pass + failures.length) + '   passed: ' + pass + '   failed: ' + failures.length);
  if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log('  ✗ ' + f);
    process.exit(1);
  }
  console.log('SFS extraction boundary contract: OK');
}
// If the async section never resolved, that is itself a failure — never exit green
// on an unfinished parity run.
process.on('exit', (code) => {
  if (code === 0 && !SERVICE_PARITY.ready) {
    console.log('\n  ✗ behavioural parity section did not complete');
    process.exitCode = 1;
  }
  if (code === 0 && !PANEL_PARITY.ready) {
    console.log('\n  ✗ UI behavioural parity section did not complete');
    process.exitCode = 1;
  }
});
