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
//   PR 2 (shipped here) relocates the 9 SCAN_SERVICE declarations, BYTE-FOR-BYTE,
//   into js/services/sfs-scan-service.js. The 20 UI_PANEL declarations are still
//   inline and MUST stay inline until PR 3.
//
// TWO SHIPPED OWNERS, ONE PENDING
//   Every ownership assertion below is TWO-SIDED: a shipped declaration must be in
//   its own module AND absent from the monolith AND absent from the other shipped
//   module. That is what stops PR 2 from quietly duplicating, dropping, or
//   cross-filing a declaration, and what stops it from touching PR 1's file.
//
// THE MANIFEST IS THE UNIT, NOT THE FILE
//   Every count below is derived from the application source at run time and
//   cross-checked against the whole: the 62 declarations must still exist exactly
//   once each across the reconstructed application, and their 39,822 declaration
//   characters must still add up. A declaration that is duplicated, dropped,
//   silently rewritten or moved to the wrong owner fails here with its own name,
//   not as an incidental count drift.
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
const OWNERS = { CONFIG_STATE: 'shipped in PR 1', SCAN_SERVICE: 'shipped in PR 2', UI_PANEL: 'pending PR 3' };
// Which module each SHIPPED owner must live in. A shipped owner's declarations must
// be in its own module and nowhere else — including not in the other shipped module.
const OWNER_MODULE = { CONFIG_STATE: CONFIG_STATE_TAG, SCAN_SERVICE: SCAN_SERVICE_TAG };
const SHIPPED_OWNERS = ['CONFIG_STATE', 'SCAN_SERVICE'];
const PENDING_OWNERS = ['UI_PANEL'];
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
const RATCHET_SCOPE = ['(inline)', CONFIG_STATE_TAG, SCAN_SERVICE_TAG];

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
  const inlinePart = perPart.filter((p) => p.kind === 'inline')[0] || null;

  return {
    parts: perPart,
    all,
    manifestSites,
    unknownFamily,
    configPart,
    servicePart,
    inlinePart,
    configDecls: configPart ? configPart.decls : [],
    serviceDecls: servicePart ? servicePart.decls : [],
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
  // (9) byte-for-byte identity of every relocated span, in BOTH shipped modules.
  for (const [part, decls] of [[A.configPart, A.configDecls], [A.servicePart, A.serviceDecls]]) {
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

  // Both shipped modules are classic, src-only, loaded exactly once, before the monolith.
  const slot = {};
  for (const [label, tagSrc] of [['config/state', CONFIG_STATE_TAG], ['scan-service', SCAN_SERVICE_TAG]]) {
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
  // No second copy of either module under another path.
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
eq(namesOf('UI_PANEL').length, 20, '1.5 UI_PANEL — pending PR 3');
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
eq(PENDING_NAMES.filter((n) => A.manifestSites.get(n)[0].where === '(inline)').length, 20,
   '2.5 all 20 UI_PANEL declarations are still inline');
eq(CONFIG_STATE_NAMES.filter((n) => A.inlineNames.has(n)).length, 0, '2.6 zero CONFIG_STATE declarations left inline');
eq(A.serviceDecls.length, 9, '2.2b the scan-service module declares 9 functions');
eq(A.serviceDecls.reduce((n, d) => n + d.chars, 0), 10635, '2.3b …measuring 10635 declaration chars');
eq(SCAN_SERVICE_NAMES.filter((n) => A.inlineNames.has(n)).length, 0, '2.6b zero SCAN_SERVICE declarations left inline');
eq(UI_PANEL_NAMES.reduce((n, name) => n + A.manifestSites.get(name)[0].chars, 0), 28128,
   '2.4b UI_PANEL still measures 28128 declaration chars, all inline');
deepEq(A.serviceDecls.map((d) => d.name), SCAN_SERVICE_SPANS.map((s) => s.name),
   '2.12 the scan-service module preserves the monolith physical order of the 9');
eq(A.serviceDecls.every((d) => d.kind === 'function'), true, '2.13 every relocated SCAN_SERVICE declaration kept its `function` binding form');
deepEq(A.serviceDecls.filter((d) => d.isAsync).map((d) => d.name), ['_sfsRunScan'],
   '2.14 _sfsRunScan is the ONLY async declaration in the service module');
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
  // The residual index.html is the base with exactly those spans deleted: the
  // monolith must contain none of them, and its remaining SFS surface must be
  // exactly the 20 pending UI declarations.
  const inlineSfs = A.inlinePart.decls.filter((d) => isSfsName(d.name)).map((d) => d.name).sort();
  deepEq(inlineSfs, PENDING_NAMES.slice().sort(), '2.11 the monolith holds exactly the 20 pending SFS declarations');
}

section('3. THE INLINE STATEMENTS — three things that must NOT move');
const CONFIG_MASKED = maskSource(A.configPart.code);
const SERVICE_MASKED = A.servicePart ? maskSource(A.servicePart.code) : '';
for (const st of INLINE_STATEMENTS) {
  ok(MONOLITH_MASKED.indexOf(st.probe) >= 0, '3.1a ' + st.id + ' is still EXECUTED by the monolith (' + st.why + ')');
  ok(A.inlinePart.code.indexOf(st.raw) >= 0, '3.1b ' + st.id + ' keeps its exact original text');
  ok(CONFIG_MASKED.indexOf(st.probe) < 0, '3.2 ' + st.id + ' did NOT move into the config/state module');
  ok(SERVICE_MASKED.indexOf(st.probe) < 0, '3.2b ' + st.id + ' did NOT move into the scan-service module');
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
  // The resize TIMER HANDLE moved; the listener that assigns it did not.
  ok(A.configPart.code.indexOf('var _sfsResizeTimer') >= 0, '3.6 the resize timer HANDLE is owned by the config/state module');
  ok(A.inlinePart.code.indexOf("window.addEventListener('resize'") >= 0, '3.7 the resize LISTENER stays inline');
  ok(!/addEventListener/.test(CONFIG_MASKED), '3.8 the config/state module registers no listener at all');
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
  eq(local.length, 28, '4.9 index.html loads 28 local application scripts (27 + the scan service)');
  note('local application scripts: ' + local.length + ' (config/state at slot ' + (idx(CONFIG_STATE_TAG) + 1) +
       ', scan-service at slot ' + (idx(SCAN_SERVICE_TAG) + 1) + ')');
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
    await runAllMutants();
    finish();
  })();
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9 — THE RATCHET
//
// Manifest/owner-based, never prefix-based. The allowance is DERIVED from the
// manifest: it is the number of SFS declarations still permitted to sit inline.
// Before PR 1 that was 62; PR 1 relocated 33, so it is now 29, and it may only
// ever shrink. A new SFS-owned declaration added inline has no manifest owner and
// fails immediately — while the 18 declarations in the six already-extracted
// sfs-candle-* modules are correctly NOT counted, which is exactly the false
// positive a prefix-only ratchet would produce.
// ═════════════════════════════════════════════════════════════════════════════
section('9. RATCHET — the inline allowance may only shrink');
const INLINE_ALLOWANCE_BEFORE_PR1 = 62;
const INLINE_ALLOWANCE_AFTER_PR1 = 29;
const INLINE_ALLOWANCE_NOW = 20;
{
  const inlineFamily = A.inlinePart.decls.filter((d) => isSfsName(d.name)).map((d) => d.name);
  eq(inlineFamily.length, INLINE_ALLOWANCE_NOW, '9.1 exactly ' + INLINE_ALLOWANCE_NOW + ' SFS declarations remain inline');
  eq(INLINE_ALLOWANCE_BEFORE_PR1 - namesOf('CONFIG_STATE').length, INLINE_ALLOWANCE_AFTER_PR1,
     '9.2a the allowance shrank by exactly the number PR 1 extracted (62 → 29)');
  eq(INLINE_ALLOWANCE_AFTER_PR1 - namesOf('SCAN_SERVICE').length, INLINE_ALLOWANCE_NOW,
     '9.2b the allowance shrank by exactly the number PR 2 extracted (29 → 20)');
  eq(INLINE_ALLOWANCE_NOW, namesOf('UI_PANEL').length,
     '9.2c what remains inline is exactly the pending UI_PANEL set');
  ok(INLINE_ALLOWANCE_NOW < INLINE_ALLOWANCE_AFTER_PR1, '9.3a the allowance strictly decreased in PR 2');
  ok(INLINE_ALLOWANCE_AFTER_PR1 < INLINE_ALLOWANCE_BEFORE_PR1, '9.3b …as it did in PR 1 — the ratchet only ever shrinks');
  ok(inlineFamily.every((n) => BY_NAME.has(n)), '9.4 every inline SFS declaration has a manifest owner');
  deepEq(A.unknownFamily, [], '9.5 no SFS-owned declaration exists without a manifest owner');
  // The already-extracted modules are outside the ratchet — proof it is not
  // prefix-based, which would flag all 18 of them.
  let already = 0;
  for (const rel of SFS_CANDLE_MODULES) {
    const p = A.parts.filter((x) => x.name === rel)[0];
    if (p) already += p.decls.filter((d) => isSfsName(d.name)).length;
  }
  eq(already, 18, '9.6 the six already-extracted modules hold 18 family declarations…');
  ok(already > 0 && A.unknownFamily.length === 0, '9.7 …and the ratchet does not flag a single one of them');
  // A SCAN_SERVICE declaration re-introduced inline must fail — it would be a
  // duplicate with a shipped owner, which is the ratchet going backwards.
  eq(SCAN_SERVICE_NAMES.filter((n) => A.inlineNames.has(n)).length, 0,
     '9.8 not one SCAN_SERVICE declaration was re-introduced inline');
  note('allowance 62 → 29 after PR 1 → ' + INLINE_ALLOWANCE_NOW + ' after PR 2; 0 once PR 3 lands');
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
  deepEq(weak, [], '10.1 every mutant is caught — weak mutants: ' + weak.join(' | '));
  eq(weak.length, 0, '10.2 zero weak mutants');
  const byKind = {};
  for (const m of mutants) byKind[m.kind] = (byKind[m.kind] || 0) + 1;
  byKind.BEHAVIOUR = behaviourRun;
  const total = mutants.length + behaviourRun;
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
});
