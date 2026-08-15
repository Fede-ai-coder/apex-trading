'use strict';
// ═════════════════════════════════════════════════════════════════════════════
// PESS EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS IS
//   The boundary contract for the PESS (Pre-Earnings Strangle Swap agent)
//   family, opened with PR 1 of 4 and carrying the WHOLE nine-declaration plan
//   from day one — not just the four declarations PR 1 happens to ship.
//
//   PESS was chosen by the post-SFS monolith audit and had, uniquely among the
//   candidates, ZERO existing test coverage. Nothing in the suite referenced any
//   PESS declaration before this file. So this contract is not an accessory to
//   the extraction — it is the only thing that would notice a mistake.
//
// THE PLAN (option E of that audit — four ownership layers, four PRs)
//   CONFIG_RULES      js/services/pess-config-rules.js       4 / 1,786    SHIPPED
//   LIVE_TRANSPORT    js/services/pess-live-transport.js     2 / 9,127    PENDING
//   ANALYSIS_SERVICE  js/services/pess-analysis-service.js   1 / 16,111   PENDING
//   UI_PANEL          js/ui/pess-panel.js                    2 / 25,698   PENDING
//                                                            ─────────────
//                                                            9 / 52,722
//
//   After PR 1: 4 declarations live in the module, 5 remain inline (50,936 B).
//   The inline allowance ratchets 9 → 5 and may only ever shrink.
//
// WHAT PR 1 IS
//   A BYTE-FOR-BYTE RELOCATION. Four declarations were cut from the inline
//   monolith and pasted into a classic script, unchanged: same names, same
//   signatures, same bodies, same binding forms (`function` × 3, `var` × 1),
//   same relative physical order. One `<script src>` tag was added. Nothing
//   else changed, and no PESS behaviour changed.
//
// WHY THE MODULE ORDER LOOKS "WRONG"
//   `PESS_LIVE_MIN` is listed LAST in the module even though a config file would
//   conventionally open with its constant. That is deliberate: among the nine
//   PESS declarations it is physically sixth, and among the four PR-1 members it
//   is physically last. Relocation identity means the moved declarations keep
//   their relative order, so no aesthetic regrouping is permitted. §7 pins that.
//
// HOW IT IS ORGANISED
//   §1  parser         — masker + top-level declaration scanner
//   §2  parser proof   — reproduce the six shipped-module fixtures exactly
//   §3  the analyser   — ONE pure function from inputs to the measurement
//   §4  the manifest   — all 9 declarations, 4 owners, shipped vs pending
//   §5  relocation     — 4/4 byte identity against the real base blob
//   §6  the residue    — exactly 5 declarations remain, unchanged
//   §7  physical order — original relative order, in the monolith and the module
//   §8  ownership      — the four are inert: no state, DOM, network, timer, …
//   §9  the load       — one classic src-only tag, before every consumer
//   §10 purity         — structural AND evaluated under a trapping sandbox
//   §11 parity         — BASE vs HEAD transcripts over 42 real fixtures
//   §12 ratchet        — the inline allowance 9 → 5, shrink-only
//   §13 reconstruction — HEAD + the four spans − the tag === BASE, byte for byte
//   §14 mutation proof — in-memory mutants that must all be rejected
//
// RUN
//   node tests/pess-extraction-boundary-contract.test.js
// ═════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const L = require('./lib/load-app-source');

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed++; }
function eq(a, b, msg) { assert.strictEqual(a, b, msg + '  (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')'); passed++; }
function deepEq(a, b, msg) { assert.deepStrictEqual(a, b, msg); passed++; }
function note(s) { console.log('        · ' + s); }
function section(s) { console.log('\n── ' + s + ' ' + '─'.repeat(Math.max(0, 76 - s.length))); }
const sha256 = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

// ═════════════════════════════════════════════════════════════════════════════
// §1 THE PARSER
//
// The same principles the DSB and SFS boundary contracts are built on, restated
// here so this contract stands alone:
//   • UTF-16 CODE-UNIT preserving — `split('')`, never `Array.from`, which
//     splits by code point and collapses a surrogate pair into one element,
//     shifting every later index by one.
//   • newline preserving, string / template / comment / regex aware, including
//     regex literals after a keyword. `pessRejectCard` ends in
//     `body.replace(/\n/g,'<br>')` — that one is protected by the preceding
//     `(`, not by the keyword lookback, but a masker without regex handling at
//     all would read its `/` as division and mis-measure this very family. The
//     keyword lookback earns its place elsewhere in the monolith: disabling it
//     changes 494 masked characters, the first at `return /network_error|…/`.
//   • brace/paren/bracket balanced and depth aware: "top level" means depth
//     zero, never column zero. Line numbers are never used to identify a
//     declaration.
// ═════════════════════════════════════════════════════════════════════════════

const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function maskSource(src, opts) {
  const useRegexKeywords = !(opts && opts.regexKeywords === false);
  const byCodePoint = !!(opts && opts.byCodePoint === true);
  const out = byCodePoint ? Array.from(src) : src.split('');
  const n = src.length;
  let i = 0, lastSig = '', lastSigIdx = -1;

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
    if (c === '/' && d === '/') { let j = i; while (j < n && src[j] !== '\n') { out[j] = ' '; j++; } i = j; continue; }
    if (c === '/' && d === '*') {
      let j = i; out[j] = ' '; out[j + 1] = ' '; j += 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) { if (src[j] !== '\n') out[j] = ' '; j++; }
      if (j < n) { out[j] = ' '; out[j + 1] = ' '; j += 2; }
      i = j; continue;
    }
    if (c === '"' || c === "'") {
      const q = c; let j = i + 1; out[i] = q;
      while (j < n) {
        if (src[j] === '\\') { out[j] = ' '; if (j + 1 < n && src[j + 1] !== '\n') out[j + 1] = ' '; j += 2; continue; }
        if (src[j] === q) { out[j] = q; j++; break; }
        out[j] = src[j] === '\n' ? '\n' : ' '; j++;
      }
      i = j; lastSig = q; lastSigIdx = i - 1; continue;
    }
    if (c === '`') {
      let j = i + 1; out[i] = '`';
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
                out[m] = src[m] === '\n' ? '\n' : ' '; m++;
              }
              k = m; continue;
            }
            if (cc === '{') depth++; else if (cc === '}') depth--;
            out[k] = src[k] === '\n' ? '\n' : ' '; k++;
          }
          j = k; continue;
        }
        if (src[j] === '`') { out[j] = '`'; j++; break; }
        out[j] = src[j] === '\n' ? '\n' : ' '; j++;
      }
      i = j; lastSig = '`'; lastSigIdx = i - 1; continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1, inClass = false, closed = false;
      while (j < n) {
        const cc = src[j];
        if (cc === '\n') break;
        if (cc === '\\') { j += 2; continue; }
        if (cc === '[') inClass = true;
        else if (cc === ']') inClass = false;
        else if (cc === '/' && !inClass) { closed = true; j++; break; }
        j++;
      }
      if (closed) {
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
const maskSourceWithoutRegexKeywords = (s) => maskSource(s, { regexKeywords: false });
const maskSourceByCodePoint = (s) => maskSource(s, { byCodePoint: true });

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
      kind: kw === 'class' ? 'class' : 'function', bindingForm: kw, name, isAsync,
      start, end, chars: end - start,
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
  return { kind: kw, bindingForm: kw, name, isAsync: false, start, end, chars: end - start, signature: kw + ' ' + name };
}
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
function verifyMaskerInvariants(maskFn, src, label) {
  const masked = maskFn(src);
  assert.strictEqual(masked.length, src.length, label + ': masker is not length-preserving');
  for (let i = 0; i < src.length; i++) {
    assert.ok(!(src[i] === '\n' && masked[i] !== '\n'), label + ': masker destroyed a newline at ' + i);
  }
  let d = 0, p = 0, b = 0;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '{') d++; else if (c === '}') d--;
    else if (c === '(') p++; else if (c === ')') p--;
    else if (c === '[') b++; else if (c === ']') b--;
    assert.ok(d >= 0 && p >= 0 && b >= 0, label + ': masker depth went negative at ' + i);
  }
  assert.deepStrictEqual({ d, p, b }, { d: 0, p: 0, b: 0 }, label + ': masked source does not balance');
}

// ═════════════════════════════════════════════════════════════════════════════
// §3 THE MANIFEST — the WHOLE family, from day one
//
// [name, form, chars, owner]. Owners are the four planned modules; only
// CONFIG_RULES is shipped today. Listing the pending five here is what makes
// "no pending declaration was extracted early" and "no shipped declaration is
// still inline" checkable rather than aspirational.
// ═════════════════════════════════════════════════════════════════════════════

const CONFIG_RULES = 'CONFIG_RULES';
const LIVE_TRANSPORT = 'LIVE_TRANSPORT';
const ANALYSIS_SERVICE = 'ANALYSIS_SERVICE';
const UI_PANEL = 'UI_PANEL';

// EXACT physical order in the base monolith. Position matters: PESS_LIVE_MIN is
// SIXTH of nine, not first, and pessRejectCard sits between runPESSPanel and
// pessGetStreamerSymbols — declarations owned by two different future modules.
const MANIFEST = [
  ['pessIVRRegime', 'function', 585, CONFIG_RULES, 'function pessIVRRegime(ivr)'],
  ['pessIVEdge', 'function', 558, CONFIG_RULES, 'function pessIVEdge(ivFront,ivBack)'],
  ['runPESSPanel', 'function', 3685, UI_PANEL, 'function runPESSPanel()'],
  ['pessRejectCard', 'function', 593, CONFIG_RULES, 'function pessRejectCard(ticker,title,body)'],
  ['pessGetStreamerSymbols', 'async function', 3809, LIVE_TRANSPORT, 'async function pessGetStreamerSymbols(ticker,chain,ts)'],
  ['PESS_LIVE_MIN', 'var', 50, CONFIG_RULES, 'var PESS_LIVE_MIN'],
  ['pessRunDXLink', 'async function', 5318, LIVE_TRANSPORT, 'async function pessRunDXLink(ticker,syms,statusEl)'],
  // pessAnalyzeTicker is UI_PANEL, not ANALYSIS_SERVICE: it is the per-ticker
  // drill-down that runPESSPanel drives, and the two ship together in PR 4.
  // pessAnalyzeAll is the batch entry point and ships alone in PR 3 — the two
  // analysis functions share NO call edge, which is what makes separating them
  // cost nothing in ownership terms.
  ['pessAnalyzeTicker', 'async function', 22013, UI_PANEL, 'async function pessAnalyzeTicker(ticker)'],
  ['pessAnalyzeAll', 'async function', 16111, ANALYSIS_SERVICE, 'async function pessAnalyzeAll()'],
];

const OWNER_STATE = {
  CONFIG_RULES: { status: 'SHIPPED', module: 'js/services/pess-config-rules.js' },
  LIVE_TRANSPORT: { status: 'PENDING', module: 'js/services/pess-live-transport.js' },
  ANALYSIS_SERVICE: { status: 'PENDING', module: 'js/services/pess-analysis-service.js' },
  UI_PANEL: { status: 'PENDING', module: 'js/ui/pess-panel.js' },
};

const MODULE_REL = 'js/services/pess-config-rules.js';
const MODULE_TAG = '<script src="./js/services/pess-config-rules.js"></script>';
const TOTAL_DECLS = 9, TOTAL_CHARS = 52722;
const SHIPPED_DECLS = 4, SHIPPED_CHARS = 1786;
const PENDING_DECLS = 5, PENDING_CHARS = 50936;
const RATCHET_BEFORE = 9, RATCHET_AFTER = 5;

// The base blob this relocation was cut from. Read from git when reachable; the
// recorded SHA-256 stands as the audit-time evidence when it is not.
const BASE_REF = '1c7c0d945d858e4f968bc69d6887053fab227800';
const BASE_INDEX_SHA256 = '9c198ef0d5be2292052ef539c05fc75a65e5cc3083f922e94a21f16d619f5164';
const BASE_SPAN_SHA256 = {
  pessIVRRegime: 'f3505e22b6d8cf80a03bc2e62b7d0bbacd8d87fc44b67f55b7370421553d2092',
  pessIVEdge: '91bf04f5605cec238a8e76c815b90514ab003a12bdb0b34f35e456a96ac9c3a3',
  pessRejectCard: '42737995f5991ff2535025493445cef62383b4aed405867efc1cf91841764527',
  PESS_LIVE_MIN: 'b969b0f1ffa32d65e93d3393e2e767396b5958c6ec2f36fa486bd36597641fcf',
};
// The exact BASE offsets each span occupied, used by the reconstruction in §13.
const BASE_SPAN_OFFSET = {
  pessIVRRegime: 821993, pessIVEdge: 823020, pessRejectCard: 827336, PESS_LIVE_MIN: 832167,
};

// A declaration belongs to the PESS FAMILY when it carries the codebase's own
// ownership marker — a `pess` prefix at a camelCase boundary — plus the one
// member named for its entry point rather than its prefix.
const isPessName = (n) => {
  if (n === 'runPESSPanel') return true;
  const b = n.replace(/^_+/, '');
  if (!/^pess/i.test(b)) return false;
  const nx = b[4];
  return nx === undefined || nx === '_' || /[0-9]/.test(nx) ||
    (nx === nx.toUpperCase() && nx !== nx.toLowerCase());
};

// ═════════════════════════════════════════════════════════════════════════════
// THE ANALYSER — one pure function from the input bundle to the measurement.
// §14 re-runs the SAME guards over MUTATED bundles.
// ═════════════════════════════════════════════════════════════════════════════

function analyze(input) {
  const { html, moduleSrc, manifest, mask } = input;
  const maskFn = mask || maskSource;

  const tags = L.parseScriptTags(html).map((t) => ({
    src: t.src == null ? null : String(t.src),
    type: t.type == null ? '' : String(t.type),
    attrs: String(t.attrs || ''),
    kind: t.src == null || String(t.src).trim() === '' ? 'inline' : L.classifySrc(t.src),
    len: t.inline.length,
  }));
  const inl = L.parseScriptTags(html).filter(
    (t) => (t.src == null || String(t.src).trim() === '') && L.isJsType(t.type) && t.inline.length > 100000);
  if (inl.length !== 1) return { fatal: 'expected one inline monolith, got ' + inl.length };
  const mono = inl[0].inline;
  // The masker must be length-preserving over BOTH real inputs. The monolith
  // holds one astral character (a surrogate pair), and it sits AFTER the PESS
  // span — so a code-point split shifts only later offsets and would leave every
  // PESS measurement below looking correct. This invariant is what catches it.
  const maskedMono = maskFn(mono);
  const maskLenOk = maskedMono.length === mono.length && maskFn(moduleSrc).length === moduleSrc.length;
  const inlineDecls = scanTopLevelDeclarations(mono, maskedMono).sort((a, b) => a.start - b.start);
  const modDecls = scanTopLevelDeclarations(moduleSrc, maskFn(moduleSrc)).sort((a, b) => a.start - b.start);

  const OWNER_OF = new Map(manifest.map((m) => [m[0], m[3]]));
  const inlinePess = inlineDecls.filter((d) => isPessName(d.name));
  const modulePess = modDecls.filter((d) => isPessName(d.name));

  const shippedNames = manifest.filter((m) => m[3] === CONFIG_RULES).map((m) => m[0]);
  const pendingNames = manifest.filter((m) => m[3] !== CONFIG_RULES).map((m) => m[0]);

  // module purity, STRUCTURALLY: remove every declaration span and see what is left
  let residue = moduleSrc;
  for (const d of modDecls.slice().sort((a, b) => b.start - a.start)) residue = residue.slice(0, d.start) + residue.slice(d.end);
  const residueCode = maskFn(residue).replace(/\s/g, '');

  const localSrcs = tags.filter((t) => t.kind === 'local').map((t) => t.src);
  const tagCount = tags.filter((t) => t.src === './' + MODULE_REL).length;
  const monoTagIndex = tags.findIndex((t) => t.kind === 'inline' && t.len > 100000);
  const moduleTagIndex = tags.findIndex((t) => t.src === './' + MODULE_REL);
  const moduleTagObj = tags.find((t) => t.src === './' + MODULE_REL) || null;

  return {
    mono, tags, localSrcs, inlineDecls, modDecls, maskLenOk,
    inlinePess, modulePess, OWNER_OF, shippedNames, pendingNames,
    inlinePessNames: inlinePess.map((d) => d.name),
    modulePessNames: modulePess.map((d) => d.name),
    inlinePessChars: inlinePess.reduce((a, d) => a + d.chars, 0),
    modulePessChars: modulePess.reduce((a, d) => a + d.chars, 0),
    moduleDeclCount: modDecls.length,
    residueCode, residueLen: residueCode.length,
    tagCount, moduleTagIndex, monoTagIndex, moduleTagObj,
    moduleOrder: modDecls.map((d) => d.name),
    inlinePessOrder: inlinePess.map((d) => d.name),
    monoChars: mono.length,
  };
}

const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_SRC = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const INPUT = { html: HTML, moduleSrc: MODULE_SRC, manifest: MANIFEST };
const A = analyze(INPUT);
assert.ok(!A.fatal, 'analyser failed: ' + A.fatal);

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  PESS EXTRACTION BOUNDARY CONTRACT — PR 1 of 4 (CONFIG / PURE RULES)');
console.log('════════════════════════════════════════════════════════════════════════════════');

// ═════════════════════════════════════════════════════════════════════════════
// §2 PARSER PROOF — the six shipped-module fixtures, reproduced exactly
// ═════════════════════════════════════════════════════════════════════════════
section('2. PARSER PROOF');
const FIXTURES = {
  'js/adapters/backend-directional-snapshot-adapter.js': [19, 6789],
  'js/services/backend-directional-snapshot-service.js': [26, 26385],
  'js/ui/backend-directional-snapshot-panel.js': [9, 14945],
  'js/services/sfs-config-state.js': [33, 1059],
  'js/services/sfs-scan-service.js': [9, 10635],
  'js/ui/sfs-panel.js': [20, 28128],
};
for (const [rel, [n, c]] of Object.entries(FIXTURES)) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ds = scanTopLevelDeclarations(src, maskSource(src));
  eq(ds.length, n, '2.1 ' + rel + ' declaration count');
  eq(ds.reduce((a, d) => a + d.chars, 0), c, '2.2 ' + rel + ' declaration chars');
  verifyMaskerInvariants(maskSource, src, rel);
  ok(true, '2.3 masker invariants hold over ' + rel);
}
verifyMaskerInvariants(maskSource, A.mono, 'monolith');
ok(true, '2.4 masker invariants hold over the current inline monolith');
verifyMaskerInvariants(maskSource, MODULE_SRC, MODULE_REL);
ok(true, '2.5 masker invariants hold over the new module');
// Both completed families stay extinct inline — this PR must not resurrect them.
eq(A.inlineDecls.filter((d) => /^(?:_?sfs|SFS_)/i.test(d.name) || /Sfs[A-Z]/.test(d.name)).length, 0, '2.6 SFS inline residual is still 0');
eq(A.inlineDecls.filter((d) => /^(?:_?dsb|DSB_)/i.test(d.name) || /Dsb[A-Z]/.test(d.name)).length, 0, '2.7 DSB inline residual is still 0');
ok(A.maskLenOk, '2.8 the masker is length-preserving over both the monolith and the new module');
{
  const a = maskSource(A.mono), b = maskSourceWithoutRegexKeywords(A.mono);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) if (a[i] !== b[i]) diff++;
  eq(diff, 494, '2.8b disabling the regex-keyword lookback changes 494 masked chars — the lookback does real work here');
}
ok(Array.from(A.mono).length === A.mono.length - 1, '2.9 the monolith holds exactly one astral character — it sits after the PESS span, so only the length invariant catches a code-point split');
note('six shipped-module fixtures reproduced exactly; SFS and DSB inline residuals still 0');

// ═════════════════════════════════════════════════════════════════════════════
// §4 THE MANIFEST — all nine, four owners, shipped vs pending
// ═════════════════════════════════════════════════════════════════════════════
section('4. THE NINE-DECLARATION MANIFEST');
eq(MANIFEST.length, TOTAL_DECLS, '4.1 the manifest carries all 9 PESS declarations');
eq(MANIFEST.reduce((a, m) => a + m[2], 0), TOTAL_CHARS, '4.2 …totalling 52,722 declaration chars');
eq(new Set(MANIFEST.map((m) => m[0])).size, TOTAL_DECLS, '4.3 no duplicate name in the manifest');
ok(MANIFEST.every((m) => isPessName(m[0])), '4.4 every manifest name is recognised as PESS-family');
deepEq([...new Set(MANIFEST.map((m) => m[3]))].sort(), [ANALYSIS_SERVICE, CONFIG_RULES, LIVE_TRANSPORT, UI_PANEL].sort(),
  '4.5 exactly the four planned owners are used');
deepEq(Object.keys(OWNER_STATE).map((k) => k + '=' + OWNER_STATE[k].status),
  ['CONFIG_RULES=SHIPPED', 'LIVE_TRANSPORT=PENDING', 'ANALYSIS_SERVICE=PENDING', 'UI_PANEL=PENDING'],
  '4.6 CONFIG_RULES is SHIPPED; the other three are PENDING');
const perOwner = {};
for (const m of MANIFEST) { perOwner[m[3]] = perOwner[m[3]] || { n: 0, c: 0 }; perOwner[m[3]].n++; perOwner[m[3]].c += m[2]; }
deepEq(perOwner[CONFIG_RULES], { n: 4, c: 1786 }, '4.7 CONFIG_RULES owns 4 declarations / 1,786 chars');
deepEq(perOwner[LIVE_TRANSPORT], { n: 2, c: 9127 }, '4.8 LIVE_TRANSPORT owns 2 / 9,127 (pending)');
deepEq(perOwner[ANALYSIS_SERVICE], { n: 1, c: 16111 }, '4.9 ANALYSIS_SERVICE owns 1 / 16,111 (pending)');
deepEq(perOwner[UI_PANEL], { n: 2, c: 25698 }, '4.10 UI_PANEL owns 2 / 25,698 (pending)');
eq(perOwner[LIVE_TRANSPORT].c + perOwner[ANALYSIS_SERVICE].c + perOwner[UI_PANEL].c, PENDING_CHARS,
  '4.11 the three pending owners sum to 50,936 chars');
eq(SHIPPED_CHARS + PENDING_CHARS, TOTAL_CHARS, '4.12 shipped + pending === total, exactly');
eq(SHIPPED_DECLS + PENDING_DECLS, TOTAL_DECLS, '4.13 …and so do the counts');
note('CONFIG_RULES 4/1,786 SHIPPED · LIVE_TRANSPORT 2/9,127 · ANALYSIS_SERVICE 1/16,111 · UI_PANEL 2/25,698 — all PENDING');

// ═════════════════════════════════════════════════════════════════════════════
// §5 RELOCATION — 4/4 byte identity against the real base blob
// ═════════════════════════════════════════════════════════════════════════════
section('5. BYTE-FOR-BYTE RELOCATION');
function git(args) { return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, encoding: 'utf8' }); }
let BASE_HTML = null;
try { BASE_HTML = git(['show', BASE_REF + ':index.html']); } catch (_) { BASE_HTML = null; }
if (BASE_HTML && sha256(BASE_HTML) !== BASE_INDEX_SHA256) BASE_HTML = null;

eq(A.moduleDeclCount, SHIPPED_DECLS, '5.1 the module declares exactly 4 top-level declarations');
deepEq(A.moduleOrder, ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'],
  '5.2 …and they are exactly the four CONFIG_RULES members');
eq(A.modulePessChars, SHIPPED_CHARS, '5.3 …totalling 1,786 declaration chars');
for (const d of A.modDecls) {
  const text = MODULE_SRC.slice(d.start, d.end);
  eq(sha256(text), BASE_SPAN_SHA256[d.name], '5.4 ' + d.name + ' is byte-identical to its BASE span (sha256)');
}
let identical = 0;
if (BASE_HTML) {
  const baseInl = L.parseScriptTags(BASE_HTML).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
  const baseMono = baseInl[0].inline;
  for (const d of A.modDecls) {
    const off = BASE_SPAN_OFFSET[d.name];
    const m = MANIFEST.find((x) => x[0] === d.name);
    const baseText = baseMono.slice(off, off + m[2]);
    const modText = MODULE_SRC.slice(d.start, d.end);
    eq(modText, baseText, '5.5 ' + d.name + ' — the module span EQUALS the base span, character for character');
    if (modText === baseText) identical++;
  }
  eq(identical, 4, '5.6 4/4 declarations are byte-identical to the base monolith');
  note('4/4 byte-identical, verified against the real base blob at ' + BASE_REF.slice(0, 10));
} else {
  ok(true, '5.5 base blob unreachable here — the recorded per-span SHA-256 in §5.4 stands as the evidence');
  note('base blob not reachable; per-span SHA-256 identity still proven in 5.4');
}
// binding forms and signatures survive
for (const d of A.modDecls) {
  const m = MANIFEST.find((x) => x[0] === d.name);
  eq((d.isAsync ? 'async ' : '') + d.bindingForm, m[1], '5.7 ' + d.name + ' keeps its binding/async form: ' + m[1]);
  eq(d.signature, m[4], '5.8 ' + d.name + ' keeps its exact signature');
  eq(d.chars, m[2], '5.9 ' + d.name + ' keeps its exact size');
}
eq(A.modDecls.filter((d) => d.bindingForm === 'var').length, 1, '5.10 exactly one `var` survives as a `var` — no const conversion');
eq(A.modDecls.filter((d) => d.bindingForm === 'function').length, 3, '5.11 three `function` declarations — no arrow conversion');
eq(A.modDecls.filter((d) => d.isAsync).length, 0, '5.12 none of the four is async — the sync form is preserved');

// ═════════════════════════════════════════════════════════════════════════════
// §6 THE RESIDUE — exactly five remain, unchanged
// ═════════════════════════════════════════════════════════════════════════════
section('6. WHAT REMAINS INLINE');
eq(A.inlinePess.length, PENDING_DECLS, '6.1 exactly 5 PESS declarations remain inline');
eq(A.inlinePessChars, PENDING_CHARS, '6.2 …totalling 50,936 declaration chars');
deepEq(A.inlinePessNames, ['runPESSPanel', 'pessGetStreamerSymbols', 'pessRunDXLink', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
  '6.3 …and they are exactly the five pending members, in their original relative order');
for (const n of A.shippedNames) ok(A.inlinePessNames.indexOf(n) < 0, '6.4 shipped declaration ' + n + ' is NO LONGER inline');
for (const n of A.pendingNames) ok(A.modulePessNames.indexOf(n) < 0, '6.5 pending declaration ' + n + ' was NOT extracted early');
for (const d of A.inlinePess) {
  const m = MANIFEST.find((x) => x[0] === d.name);
  eq(d.chars, m[2], '6.6 ' + d.name + ' is unchanged in size (' + m[2] + ' chars)');
  eq((d.isAsync ? 'async ' : '') + d.bindingForm, m[1], '6.7 ' + d.name + ' keeps its binding/async form');
  eq(d.signature, m[4], '6.8 ' + d.name + ' keeps its exact signature');
}
eq(A.inlinePess.filter((d) => d.isAsync).length, 4, '6.9 four of the five remaining are async — unchanged');
// no declaration is filed in two places, and none went missing
const everywhere = A.modulePessNames.concat(A.inlinePessNames).sort();
deepEq(everywhere, MANIFEST.map((m) => m[0]).sort(), '6.10 every one of the nine exists exactly once, module + inline');
eq(new Set(everywhere).size, TOTAL_DECLS, '6.11 no PESS declaration is duplicated across module and monolith');
eq(A.modulePessChars + A.inlinePessChars, TOTAL_CHARS, '6.12 module + inline chars still sum to 52,722');
note('module 4/1,786 · inline 5/50,936 · total 9/52,722 — no duplicate, no omission, no cross-filing');

// ═════════════════════════════════════════════════════════════════════════════
// §7 PHYSICAL ORDER — the rule that stops aesthetic regrouping
//
// A conceptual "config module" would open with its constant. This one does not,
// and must not: relocation identity means the four moved declarations keep the
// RELATIVE ORDER they had in the monolith, where PESS_LIVE_MIN is last of the
// four (and sixth of the nine). §14 mutates this order and requires it to fail.
// ═════════════════════════════════════════════════════════════════════════════
section('7. PHYSICAL ORDER');
const MANIFEST_ORDER = MANIFEST.map((m) => m[0]);
deepEq(MANIFEST_ORDER, ['pessIVRRegime', 'pessIVEdge', 'runPESSPanel', 'pessRejectCard',
  'pessGetStreamerSymbols', 'PESS_LIVE_MIN', 'pessRunDXLink', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
  '7.1 the base physical order of all nine PESS declarations');
const CONFIG_ORDER = MANIFEST.filter((m) => m[3] === CONFIG_RULES).map((m) => m[0]);
deepEq(CONFIG_ORDER, ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'],
  '7.2 the four CONFIG_RULES members, in their ORIGINAL relative order');
deepEq(A.moduleOrder, CONFIG_ORDER, '7.3 the module lists them in exactly that order — no aesthetic regrouping');
eq(A.moduleOrder[3], 'PESS_LIVE_MIN', '7.4 PESS_LIVE_MIN is LAST in the module, because it is last of the four in the monolith');
ok(MANIFEST_ORDER.indexOf('PESS_LIVE_MIN') === 5, '7.5 …and sixth of the nine overall, not first');
// declarations owned by FUTURE modules sit physically between the moved four —
// that is expected and is precisely why order, not adjacency, is the invariant.
const between = MANIFEST_ORDER.slice(MANIFEST_ORDER.indexOf('pessIVRRegime'), MANIFEST_ORDER.indexOf('PESS_LIVE_MIN') + 1)
  .filter((n) => CONFIG_ORDER.indexOf(n) < 0);
deepEq(between, ['runPESSPanel', 'pessGetStreamerSymbols'],
  '7.6 two future-owner declarations sit physically INSIDE the config span — interleaving is expected');
deepEq(A.inlinePessOrder, MANIFEST.filter((m) => m[3] !== CONFIG_RULES).map((m) => m[0]),
  '7.7 the five that remain keep their original relative order too');
note('module order pessIVRRegime → pessIVEdge → pessRejectCard → PESS_LIVE_MIN (original relative order, constant LAST)');

// ═════════════════════════════════════════════════════════════════════════════
// §8 OWNERSHIP — why these four, and only these four
//
// The boundary being drawn is EFFECT, not data type. `pessRejectCard` RETURNS
// markup; it does not write it anywhere. A markup-producing function is not a
// UI owner, and classifying it as one would have split a pure layer for no
// reason. What disqualifies a declaration from this module is an effect:
// state, DOM, network, timer, listener, subscription, storage, window.
// ═════════════════════════════════════════════════════════════════════════════
section('8. OWNERSHIP OF THE FOUR');
const EFFECTS = [
  ['state read', /\bS\.[A-Za-z_$][\w$]*/g],
  ['state write', /\bS\.[A-Za-z_$][\w$]*\s*=(?!=)/g],
  ['DOM', /document\.|\.innerHTML\s*=|\.textContent\s*=|\.classList|\.style\.|getElementById|querySelector/g],
  ['network', /\bfetch\s*\(|\bttCall\s*\(|XMLHttpRequest|WebSocket|\.send\s*\(/g],
  ['timer', /\bsetTimeout\s*\(|\bsetInterval\s*\(|\bclearTimeout\s*\(|\bclearInterval\s*\(/g],
  ['listener', /addEventListener|removeEventListener|\bon[a-z]+\s*=/g],
  ['subscription', /\b(?:subscribe|unsubscribe)\w*\s*\(/g],
  ['storage', /localStorage|sessionStorage|indexedDB/g],
  ['window/global', /\bwindow\b|\bglobalThis\b|\bself\b|\btop\b/g],
];
for (const d of A.modDecls) {
  const mc = maskSource(MODULE_SRC).slice(d.start, d.end);
  for (const [label, re] of EFFECTS) {
    const hits = (mc.match(re) || []).length;
    eq(hits, 0, '8.1 ' + d.name + ' performs no ' + label);
  }
}
// nor does any of the four call any other declaration
const ALL_NAMES = new Set(A.inlineDecls.map((d) => d.name).concat(A.modDecls.map((d) => d.name)));
for (const d of A.modDecls) {
  const mc = maskSource(MODULE_SRC).slice(d.start, d.end);
  const calls = new Set();
  const r = /\b([A-Za-z_$][\w$]*)\s*\(/g; let m;
  while ((m = r.exec(mc))) if (ALL_NAMES.has(m[1]) && m[1] !== d.name) calls.add(m[1]);
  deepEq([...calls], [], '8.2 ' + d.name + ' calls no other application declaration');
}
// pessRejectCard is markup-producing, and that is explicitly NOT a UI effect
const cardText = MODULE_SRC.slice(A.modDecls.find((d) => d.name === 'pessRejectCard').start, A.modDecls.find((d) => d.name === 'pessRejectCard').end);
ok(/return\s+'<div/.test(cardText), '8.3 pessRejectCard RETURNS markup as a string…');
ok(!/document|innerHTML\s*=|appendChild|insertAdjacent/.test(cardText), '8.4 …and mutates no DOM — returning HTML is not owning the DOM');
// PESS_LIVE_MIN is an inert literal
const liveMinText = MODULE_SRC.slice(A.modDecls.find((d) => d.name === 'PESS_LIVE_MIN').start, A.modDecls.find((d) => d.name === 'PESS_LIVE_MIN').end);
eq(liveMinText, "var PESS_LIVE_MIN=['bidPrice','askPrice','delta'];", '8.5 PESS_LIVE_MIN is its exact original inert initialiser');
// consumers: all five are pending PESS members, all call-time
const CONSUMERS = { pessIVRRegime: ['runPESSPanel', 'pessAnalyzeTicker', 'pessAnalyzeAll'], pessIVEdge: ['pessAnalyzeTicker', 'pessAnalyzeAll'], pessRejectCard: ['pessAnalyzeTicker'], PESS_LIVE_MIN: ['pessRunDXLink'] };
const monoMasked = maskSource(A.mono);
for (const [name, expected] of Object.entries(CONSUMERS)) {
  const found = new Set();
  const r = new RegExp('\\b' + name + '\\b', 'g'); let m;
  while ((m = r.exec(monoMasked))) {
    const d = A.inlineDecls.find((x) => m.index >= x.start && m.index < x.end);
    if (d) found.add(d.name); else found.add('(TOP-LEVEL STATEMENT)');
  }
  deepEq([...found].sort(), expected.slice().sort(), '8.6 ' + name + ' is referenced only by ' + expected.join(', '));
  ok(!found.has('(TOP-LEVEL STATEMENT)'), '8.7 ' + name + ' is referenced by NO top-level statement — the dependency is call-time');
  ok([...found].every((c) => isPessName(c)), '8.8 ' + name + ' has no consumer outside the PESS family');
}
note('all four are inert: zero state / DOM / network / timer / listener / subscription / storage / window');
note('every consumer is a pending PESS declaration, and every dependency is CALL-time — none is evaluation-time');

// ═════════════════════════════════════════════════════════════════════════════
// §9 THE LOAD — one classic src-only tag, before every consumer
// ═════════════════════════════════════════════════════════════════════════════
section('9. THE LOAD');
eq(A.tagCount, 1, '9.1 index.html loads the module EXACTLY once');
eq((HTML.match(/<script src="\.\/js\/services\/pess-config-rules\.js"><\/script>/g) || []).length, 1,
  '9.2 …through exactly one literal, src-only tag');
ok(A.moduleTagObj !== null, '9.3 the tag is present');
ok(!/\bdefer\b/i.test(A.moduleTagObj.attrs), '9.4 the tag has no defer');
ok(!/\basync\b/i.test(A.moduleTagObj.attrs), '9.5 the tag has no async');
ok(!/\btype\s*=/i.test(A.moduleTagObj.attrs), '9.6 the tag declares no type — a classic script');
ok(!/\bnomodule\b/i.test(A.moduleTagObj.attrs), '9.7 the tag has no nomodule');
ok(!/\bintegrity\b|\bcrossorigin\b/i.test(A.moduleTagObj.attrs), '9.8 the tag carries no integrity/crossorigin — matching every other local script');
ok(A.moduleTagIndex >= 0 && A.moduleTagIndex < A.monoTagIndex,
  '9.9 the module loads BEFORE the inline monolith — the only hard requirement');
// PLACEMENT. The module is a dependency-free leaf: nothing it references exists
// at load time, and nothing references it at load time. The only hard constraint
// is therefore "before the inline monolith". Within that freedom the slot is
// chosen deliberately — at the HEAD of the family-module region, straight after
// the foundation modules (utils / api / config):
//   • it reserves a contiguous region PR 2–4 can append into, keeping the PESS
//     family together as it grows;
//   • it leaves the DSB tail untouched. Four sibling contracts pin the DSB panel
//     as the LAST script before the monolith and address their slots by counting
//     BACKWARDS from it, so appending here — rather than at the end — keeps
//     every one of those ordering claims true without editing any of them.
eq(A.localSrcs[A.localSrcs.length - 1], './js/ui/backend-directional-snapshot-panel.js',
  '9.10 the DSB panel is STILL the last local script before the monolith — this PR did not displace it');
eq(A.localSrcs.indexOf('./' + MODULE_REL), 5, '9.10b the module sits at the head of the family-module region, after utils/api/config');
eq(A.localSrcs[4], './js/config/backend-config.js', '9.10c …immediately after the last foundation module');
eq(A.localSrcs.length, 30, '9.11 index.html now loads 30 local application scripts (29 + this module)');
eq(A.localSrcs.filter((s) => s === './' + MODULE_REL).length, 1, '9.12 …with no duplicate entry');
ok(fs.existsSync(path.join(ROOT, MODULE_REL)), '9.13 the module file exists on disk at the path the tag names');
// the SFS family run must not have been split by the insertion
const SFS_RUN = ['./js/services/sfs-config-state.js', './js/services/sfs-scan-service.js',
  './js/services/sfs-candle-predicates.js', './js/services/sfs-candle-warmup.js',
  './js/services/sfs-candle-generic-ensure.js', './js/services/sfs-candle-chart-hydration.js',
  './js/services/sfs-candle-spy-read.js', './js/services/sfs-candle-detail-4h.js', './js/ui/sfs-panel.js'];
const sfsSlots = SFS_RUN.map((s) => A.localSrcs.indexOf(s));
ok(sfsSlots.every((v, i) => i === 0 || v === sfsSlots[i - 1] + 1), '9.14 the nine SFS scripts are still ONE contiguous run — the new tag did not split it');
const DSB_RUN = ['./js/adapters/backend-directional-snapshot-adapter.js',
  './js/services/backend-directional-snapshot-service.js', './js/ui/backend-directional-snapshot-panel.js'];
const dsbSlots = DSB_RUN.map((s) => A.localSrcs.indexOf(s));
ok(dsbSlots.every((v, i) => i === 0 || v === dsbSlots[i - 1] + 1), '9.15 the three DSB scripts are still one contiguous run');
// The module opens its own region rather than being inserted into an existing
// family's run: no shipped family straddles it.
const FAMILY_RUNS = [SFS_RUN, DSB_RUN,
  ['./js/services/portfolio-stress-parity.js', './js/services/portfolio-stress-response.js', './js/services/portfolio-stress-client.js'],
  ['./js/services/candle-normalization.js', './js/services/candle-auth-gate.js', './js/services/candle-provenance.js', './js/services/candle-store-client.js', './js/services/candle-dxlink-client.js']];
for (const run of FAMILY_RUNS) {
  const slots = run.map((x) => A.localSrcs.indexOf(x));
  ok(slots.every((v) => v >= 0), '9.16 family run is intact: ' + run[0]);
  ok(slots.every((v, i) => i === 0 || v === slots[i - 1] + 1), '9.16b …and still contiguous — the new tag was not inserted into it');
  ok(!(A.moduleTagIndex > Math.min(...slots) && A.moduleTagIndex < Math.max(...slots)),
    '9.16c …and the PESS tag does not sit inside it');
}
note('slot ' + (A.localSrcs.indexOf('./' + MODULE_REL) + 1) + ' of ' + A.localSrcs.length + ' local scripts — head of the family region; the DSB tail is untouched');

// ── NEGATIVE CONTROLS — the real failure modes, executed ─────────────────────
// The dependency is call-time, so "wrong order" here does not mean a load-time
// crash; it means a consumer running BEFORE the bindings exist. Both controls
// below reproduce that, not a synthetic one.
{
  const sandbox = { out: null };
  vm.createContext(sandbox);
  // (a) MISSING TAG — the module never loads; a consumer call throws ReferenceError.
  let threwMissing = null;
  try {
    vm.runInContext('function consumer(){ return pessIVRRegime(80); } out = consumer();', sandbox, { filename: 'missing-tag.js' });
  } catch (e) { threwMissing = e; }
  // NB: the error is constructed inside the vm realm, so `instanceof` against
  // this realm's ReferenceError is false. Match on the error's own name.
  ok(threwMissing !== null && threwMissing.name === 'ReferenceError' && /pessIVRRegime/.test(String(threwMissing.message)),
    '9.17 NEGATIVE CONTROL — with the module tag absent, a consumer call throws ReferenceError: pessIVRRegime is not defined');
  // (b) WRONG ORDER — the module loads AFTER a script that already called it.
  const sandbox2 = {}; vm.createContext(sandbox2);
  let threwOrder = null;
  try {
    vm.runInContext('var early = pessIVRRegime(80);', sandbox2, { filename: 'consumer-first.js' });
  } catch (e) { threwOrder = e; }
  ok(threwOrder !== null && threwOrder.name === 'ReferenceError' && /pessIVRRegime/.test(String(threwOrder.message)),
    '9.18 NEGATIVE CONTROL — a consumer evaluated BEFORE the module throws; ordering the tag after the monolith would reproduce this');
  // (c) CORRECT ORDER — module first, then the same consumer, succeeds.
  const sandbox3 = {}; vm.createContext(sandbox3);
  vm.runInContext(MODULE_SRC, sandbox3, { filename: MODULE_REL });
  vm.runInContext('var late = pessIVRRegime(80);', sandbox3, { filename: 'consumer-after.js' });
  eq(sandbox3.late.label, 'HIGH — HARD REJECT', '9.19 CONTROL — module first, consumer second: the call resolves and returns the real result');
}

// ═════════════════════════════════════════════════════════════════════════════
// §10 MODULE PURITY — structural, then EVALUATED under a trapping sandbox
//
// The structural half proves that once the four declaration spans are removed
// from the module, only comments and whitespace remain — no top-level statement
// of any kind. The evaluated half runs the real module inside a context whose
// every ambient global is a Proxy that RECORDS any touch, so an evaluation-time
// effect cannot hide behind a name this contract forgot to grep for.
//
// A reference INSIDE a function body is not an evaluation-time effect. That is
// exactly why this is done by evaluation and not by a regex over the file.
// ═════════════════════════════════════════════════════════════════════════════
section('10. MODULE PURITY');
eq(A.residueLen, 0, '10.1 removing the four declaration spans leaves ONLY comments and whitespace');
ok(!/\brequire\s*\(|\bimport\b|\bexport\b|module\.exports/.test(maskSource(MODULE_SRC)),
  '10.2 the module uses no import / export / require — it is a classic global script');
ok(!/^\s*['"]use strict['"]/m.test(MODULE_SRC), '10.3 no "use strict" was added — the monolith had none');
ok(!/\(function\s*\(|\(\s*\)\s*=>|^\s*!function/m.test(maskSource(MODULE_SRC)), '10.4 no IIFE wrapper');
ok(!/\bclass\s+[A-Za-z_$]/.test(maskSource(MODULE_SRC)), '10.5 no wrapper class');
{
  const touched = [];
  const trap = (label) => new Proxy(function () {}, {
    get(t, p) { if (typeof p === 'string') touched.push(label + '.' + p); return trap(label + '.' + String(p)); },
    set(t, p) { touched.push('SET ' + label + '.' + String(p)); return true; },
    apply() { touched.push('CALL ' + label); return trap(label + '()'); },
    construct() { touched.push('NEW ' + label); return trap('new ' + label); },
  });
  const ctx = {};
  for (const g of ['document', 'window', 'globalThis', 'fetch', 'XMLHttpRequest', 'WebSocket',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'localStorage', 'sessionStorage',
    'indexedDB', 'navigator', 'location', 'history', 'alert', 'console', 'Chart', 'S', 'ttCall',
    'requestAnimationFrame', 'queueMicrotask', 'postMessage', 'EventSource', 'Worker']) ctx[g] = trap(g);
  vm.createContext(ctx);
  vm.runInContext(MODULE_SRC, ctx, { filename: MODULE_REL });
  deepEq(touched, [], '10.6 EVALUATING the module touches NO ambient global — zero DOM, network, timer, listener, subscription, storage or window access');
  const declared = ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'];
  for (const n of declared) ok(Object.prototype.hasOwnProperty.call(ctx, n), '10.7 evaluation declares the global ' + n);
  eq(typeof ctx.pessIVRRegime, 'function', '10.8 pessIVRRegime is a function');
  eq(typeof ctx.pessIVEdge, 'function', '10.9 pessIVEdge is a function');
  eq(typeof ctx.pessRejectCard, 'function', '10.10 pessRejectCard is a function');
  ok(Array.isArray(ctx.PESS_LIVE_MIN), '10.11 PESS_LIVE_MIN is an array');
  const extras = Object.keys(ctx).filter((k) => declared.indexOf(k) < 0 && ctx[k] !== undefined && !(ctx[k] && ctx[k].constructor === Proxy));
  const own = Object.getOwnPropertyNames(ctx).filter((k) => declared.indexOf(k) < 0 && !(k in { document: 1 }) );
  const unexpected = own.filter((k) => ['document','window','globalThis','fetch','XMLHttpRequest','WebSocket','setTimeout','setInterval','clearTimeout','clearInterval','localStorage','sessionStorage','indexedDB','navigator','location','history','alert','console','Chart','S','ttCall','requestAnimationFrame','queueMicrotask','postMessage','EventSource','Worker'].indexOf(k) < 0);
  deepEq(unexpected, [], '10.12 the module declares EXACTLY the four expected globals and nothing else');
  void extras;
}
note('structural residue 0 chars · evaluation touches 0 ambient globals · exactly 4 globals declared');

// ═════════════════════════════════════════════════════════════════════════════
// §11 BEHAVIOURAL PARITY — BASE vs HEAD, over real fixtures
//
// Byte identity already proves the text did not change. This proves the two
// texts BEHAVE identically when executed, which is the claim that actually
// matters. The expected values are not hand-written: every one was captured by
// RUNNING the BASE declarations, and when the base blob is reachable the BASE
// and HEAD transcripts are compared directly rather than against the recording.
//
// Coverage is by BRANCH, not by count: all five pessIVRRegime buckets, all five
// pessIVEdge buckets, both null guards, the values immediately either side of
// every threshold, and NaN — which falls through every comparison to the
// favourable branch, a real behaviour worth pinning.
// ═════════════════════════════════════════════════════════════════════════════
section('11. BEHAVIOURAL PARITY');
const FIX_IVR = [{"in":null,"out":{"label":"N/A","adj":0,"hardReject":null,"color":"var(--tx3)"}},{"out":{"label":"N/A","adj":0,"hardReject":null,"color":"var(--tx3)"}},{"in":"NaN","out":{"label":"favorable","adj":10,"hardReject":null,"color":"var(--gr)"}},{"in":-5,"out":{"label":"favorable","adj":10,"hardReject":null,"color":"var(--gr)"}},{"in":0,"out":{"label":"favorable","adj":10,"hardReject":null,"color":"var(--gr)"}},{"in":10,"out":{"label":"favorable","adj":10,"hardReject":null,"color":"var(--gr)"}},{"in":29.9,"out":{"label":"favorable","adj":10,"hardReject":null,"color":"var(--gr)"}},{"in":30,"out":{"label":"neutral / selective","adj":0,"hardReject":null,"color":"var(--am)"}},{"in":30.0001,"out":{"label":"neutral / selective","adj":0,"hardReject":null,"color":"var(--am)"}},{"in":40,"out":{"label":"neutral / selective","adj":0,"hardReject":null,"color":"var(--am)"}},{"in":50,"out":{"label":"neutral / selective","adj":0,"hardReject":null,"color":"var(--am)"}},{"in":50.0001,"out":{"label":"elevated — penalty","adj":-10,"hardReject":null,"color":"#f97316"}},{"in":55,"out":{"label":"elevated — penalty","adj":-10,"hardReject":null,"color":"#f97316"}},{"in":60,"out":{"label":"elevated — penalty","adj":-10,"hardReject":null,"color":"#f97316"}},{"in":70,"out":{"label":"elevated — penalty","adj":-10,"hardReject":null,"color":"#f97316"}},{"in":70.0001,"out":{"label":"HIGH — HARD REJECT","adj":-99,"hardReject":"IVR 70% > 70 — earnings likely fully priced in, IV expansion upside minimal","color":"var(--rd)"}},{"in":71,"out":{"label":"HIGH — HARD REJECT","adj":-99,"hardReject":"IVR 71% > 70 — earnings likely fully priced in, IV expansion upside minimal","color":"var(--rd)"}},{"in":85,"out":{"label":"HIGH — HARD REJECT","adj":-99,"hardReject":"IVR 85% > 70 — earnings likely fully priced in, IV expansion upside minimal","color":"var(--rd)"}},{"in":100,"out":{"label":"HIGH — HARD REJECT","adj":-99,"hardReject":"IVR 100% > 70 — earnings likely fully priced in, IV expansion upside minimal","color":"var(--rd)"}},{"in":1000000000,"out":{"label":"HIGH — HARD REJECT","adj":-99,"hardReject":"IVR 1000000000% > 70 — earnings likely fully priced in, IV expansion upside minimal","color":"var(--rd)"}}];
const FIX_EDGE = [{"in":[null,null],"out":{"label":"N/A","adj":0,"edgePct":null}},{"in":[null,0.2],"out":{"label":"N/A","adj":0,"edgePct":null}},{"in":[0.2,null],"out":{"label":"N/A","adj":0,"edgePct":null}},{"in":[0.3,0.2],"out":{"label":"negative edge (front IV > back IV)","adj":-15,"edgePct":-9.999999999999998}},{"in":[0.25,0.25],"out":{"label":"small positive — boost","adj":8,"edgePct":0}},{"in":[0.2,0.2001],"out":{"label":"small positive — boost","adj":8,"edgePct":0.009999999999998899}},{"in":[0.2,0.2299],"out":{"label":"small positive — boost","adj":8,"edgePct":2.9899999999999984}},{"in":[0.2,0.23],"out":{"label":"moderate — neutral","adj":0,"edgePct":3}},{"in":[0.2,0.25],"out":{"label":"moderate — neutral","adj":0,"edgePct":4.999999999999999}},{"in":[0.2,0.2799],"out":{"label":"moderate — neutral","adj":0,"edgePct":7.989999999999997}},{"in":[0.2,0.28],"out":{"label":"very large — earnings priced in","adj":-10,"edgePct":8.000000000000002}},{"in":[0.2,0.4],"out":{"label":"very large — earnings priced in","adj":-10,"edgePct":20}},{"in":[0,0],"out":{"label":"small positive — boost","adj":8,"edgePct":0}},{"in":[0.5,0.1],"out":{"label":"negative edge (front IV > back IV)","adj":-15,"edgePct":-40}}];
const FIX_CARD = [{"in":["AAPL","IVR too high","line one\nline two"],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — AAPL</div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[AAPL] IVR too high</strong><br>line one<br>line two</div></div>"},{"in":["MSFT","",""],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — MSFT</div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[MSFT] </strong><br></div></div>"},{"in":["SPY","t","a\nb\nc"],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — SPY</div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[SPY] t</strong><br>a<br>b<br>c</div></div>"},{"in":["X","<b>bold</b>","<script>x</script>"],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — X</div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[X] <b>bold</b></strong><br><script>x</script></div></div>"},{"in":["","",""],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — </div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[] </strong><br></div></div>"},{"in":["TSLA","Edge","no newline"],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — TSLA</div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[TSLA] Edge</strong><br>no newline</div></div>"},{"in":["NVDA","q\"quote's","&amp; < >"],"out":"<div class=\"stbox\" style=\"border-color:var(--rd);margin-top:8px\"><div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:6px\"><div class=\"stitle\" style=\"color:#f97316\">PESS — NVDA</div><div style=\"font-size:11px;font-weight:700;color:var(--rd)\">SCARTATO</div></div><div style=\"font-size:10px;font-family:var(--M);color:var(--tx2);line-height:1.7\"><strong>[NVDA] q\"quote's</strong><br>&amp; < ></div></div>"}];
const FIX_LIVE_MIN = ["bidPrice","askPrice","delta"];

function loadDecls(src, filename) {
  const c = {}; vm.createContext(c); vm.runInContext(src, c, { filename });
  return c;
}
// Values built inside a vm context carry THAT realm's Object.prototype, so
// deepStrictEqual would reject them on prototype identity alone. Round-tripping
// through JSON compares the data, which is what parity actually means here.
const plain = (v) => JSON.parse(JSON.stringify(v));
const HEAD_CTX = loadDecls(MODULE_SRC, 'head-' + MODULE_REL);
let BASE_CTX = null;
if (BASE_HTML) {
  const baseInl = L.parseScriptTags(BASE_HTML).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
  const baseMono = baseInl[0].inline;
  const baseSrc = ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN']
    .map((n) => { const m = MANIFEST.find((x) => x[0] === n); return baseMono.slice(BASE_SPAN_OFFSET[n], BASE_SPAN_OFFSET[n] + m[2]); })
    .join('\n');
  BASE_CTX = loadDecls(baseSrc, 'base-pess.js');
}
const unNaN = (v) => (v === 'NaN' ? NaN : v);
let fixtures = 0, diffs = 0;
for (const f of FIX_IVR) {
  const arg = unNaN(f.in);
  const head = plain(HEAD_CTX.pessIVRRegime(arg));
  deepEq(head, f.out, '11.1 pessIVRRegime(' + JSON.stringify(f.in) + ') matches the BASE-recorded result');
  if (BASE_CTX) { const base = plain(BASE_CTX.pessIVRRegime(arg)); deepEq(head, base, '11.2 pessIVRRegime(' + JSON.stringify(f.in) + ') — HEAD transcript === BASE transcript'); if (JSON.stringify(head) !== JSON.stringify(base)) diffs++; }
  fixtures++;
}
for (const f of FIX_EDGE) {
  const head = plain(HEAD_CTX.pessIVEdge(f.in[0], f.in[1]));
  deepEq(head, f.out, '11.3 pessIVEdge(' + JSON.stringify(f.in) + ') matches the BASE-recorded result');
  if (BASE_CTX) { const base = plain(BASE_CTX.pessIVEdge(f.in[0], f.in[1])); deepEq(head, base, '11.4 pessIVEdge(' + JSON.stringify(f.in) + ') — HEAD === BASE'); if (JSON.stringify(head) !== JSON.stringify(base)) diffs++; }
  fixtures++;
}
for (const f of FIX_CARD) {
  const head = HEAD_CTX.pessRejectCard(f.in[0], f.in[1], f.in[2]);
  eq(head, f.out, '11.5 pessRejectCard(' + JSON.stringify(f.in) + ') matches the BASE-recorded markup EXACTLY');
  if (BASE_CTX) { const base = BASE_CTX.pessRejectCard(f.in[0], f.in[1], f.in[2]); eq(head, base, '11.6 pessRejectCard(' + JSON.stringify(f.in) + ') — HEAD markup === BASE markup'); if (head !== base) diffs++; }
  fixtures++;
}
deepEq(plain(HEAD_CTX.PESS_LIVE_MIN), FIX_LIVE_MIN, '11.7 PESS_LIVE_MIN evaluates to its exact BASE value');
if (BASE_CTX) deepEq(plain(HEAD_CTX.PESS_LIVE_MIN), plain(BASE_CTX.PESS_LIVE_MIN), '11.8 PESS_LIVE_MIN — HEAD value === BASE value');
fixtures++;
eq(diffs, 0, '11.9 zero BASE-vs-HEAD differences across every fixture');
// branch coverage is real, not incidental
deepEq([...new Set(FIX_IVR.map((f) => f.out.label))].sort(),
  ['HIGH — HARD REJECT', 'N/A', 'elevated — penalty', 'favorable', 'neutral / selective'],
  '11.10 the IVR fixtures cover all five regime buckets');
deepEq([...new Set(FIX_EDGE.map((f) => f.out.label))].sort(),
  ['N/A', 'moderate — neutral', 'negative edge (front IV > back IV)', 'small positive — boost', 'very large — earnings priced in'],
  '11.11 the edge fixtures cover all five term-structure buckets');
deepEq([...new Set(FIX_IVR.map((f) => f.out.adj))].sort((a, b) => a - b), [-99, -10, 0, 10], '11.12 …and every distinct score adjustment');
ok(FIX_CARD.some((f) => /\n/.test(f.in[2])), '11.13 a reject-card fixture exercises the newline→<br> replacement');
ok(FIX_CARD.some((f) => /</.test(f.in[1]) || /</.test(f.in[2])), '11.14 a reject-card fixture passes markup through — the absence of escaping is pinned, not fixed');
eq(HEAD_CTX.pessIVRRegime(NaN).label, 'favorable', '11.15 NaN falls through every comparison to the favourable branch — real behaviour, pinned');
eq(HEAD_CTX.pessIVRRegime(70).label, 'elevated — penalty', '11.16 exactly 70 is NOT a hard reject — the threshold is strictly greater-than');
eq(HEAD_CTX.pessIVRRegime(30).label, 'neutral / selective', '11.17 exactly 30 is neutral — that boundary is inclusive');
note(fixtures + ' behavioural fixtures compared' + (BASE_CTX ? ' BASE-vs-HEAD directly' : ' against the BASE recording (base blob unreachable)') + ' — ' + diffs + ' differences');

// ═════════════════════════════════════════════════════════════════════════════
// §12 THE INLINE RATCHET — 9 → 5, shrink only
// ═════════════════════════════════════════════════════════════════════════════
section('12. INLINE RATCHET');
eq(RATCHET_BEFORE, TOTAL_DECLS, '12.1 the allowance opened at 9 — the whole family, all inline');
eq(RATCHET_AFTER, PENDING_DECLS, '12.2 …and stands at 5 after PR 1');
ok(RATCHET_AFTER < RATCHET_BEFORE, '12.3 the ratchet SHRANK');
eq(A.inlinePess.length, RATCHET_AFTER, '12.4 the real inline PESS population equals the allowance exactly');
ok(A.inlinePess.length <= RATCHET_AFTER, '12.5 it may never exceed the allowance');
// a PR-1 declaration reintroduced inline, or a brand-new unowned PESS
// declaration added inline, must both fail — exercised for real in §14.
for (const n of A.shippedNames) ok(A.inlinePessNames.indexOf(n) < 0, '12.6 ' + n + ' has not been reintroduced inline');
ok(A.inlinePessNames.every((n) => MANIFEST.some((m) => m[0] === n)),
  '12.7 every inline PESS declaration is a KNOWN manifest member — no unowned PESS declaration was added');
note('inline PESS allowance 9 → 5 (floor for this PR); it may only shrink in PR 2–4');

// ═════════════════════════════════════════════════════════════════════════════
// §13 RECONSTRUCTION — the relocation is reversible, to the byte
//
// HEAD index.html, minus the new tag, plus the four spans re-inserted at the
// offsets they occupied in BASE, must equal BASE exactly. The BASE hash is read
// from git independently — never derived from the reconstruction itself.
// ═════════════════════════════════════════════════════════════════════════════
section('13. RECONSTRUCTION');
if (BASE_HTML) {
  eq(sha256(BASE_HTML), BASE_INDEX_SHA256, '13.1 the base blob read from git has the recorded SHA-256');
  const tagLine = MODULE_TAG + '\n';
  eq(HTML.split(tagLine).length - 1, 1, '13.2 the new tag appears exactly once in HEAD');
  let out = HTML.replace(tagLine, '');
  const inl = L.parseScriptTags(out).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
  eq(inl.length, 1, '13.3 the de-tagged document still has exactly one inline monolith');
  const monoAt = out.indexOf(inl[0].inline);
  for (const n of ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN']) {
    const d = A.modDecls.find((x) => x.name === n);
    out = out.slice(0, monoAt + BASE_SPAN_OFFSET[n]) + MODULE_SRC.slice(d.start, d.end) + out.slice(monoAt + BASE_SPAN_OFFSET[n]);
  }
  eq(out.length, BASE_HTML.length, '13.4 the reconstruction has exactly the base length');
  eq(sha256(out), BASE_INDEX_SHA256, '13.5 HEAD − the tag + the four spans === BASE index.html, BYTE FOR BYTE');
  eq(HTML.length, BASE_HTML.length - SHIPPED_CHARS + MODULE_TAG.length + 1,
    '13.6 the size delta is exactly −1,786 declaration chars +' + (MODULE_TAG.length + 1) + ' tag chars');
  note('BASE ' + BASE_HTML.length + ' chars sha ' + BASE_INDEX_SHA256.slice(0, 16) +
    ' | HEAD ' + HTML.length + ' | reconstructed sha ' + sha256(out).slice(0, 16) + ' — EQUAL');
} else {
  ok(true, '13.1 base blob unreachable here — reconstruction skipped; per-span SHA-256 identity still pinned in §5.4');
  note('RECONSTRUCTION SKIPPED — the base blob is not reachable through git in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
// §14 MUTATION PROOF
//
// A contract that only agrees with itself proves nothing. Every mutant below is
// an IN-MEMORY change to the inputs — a declaration dropped, a body edited, a
// threshold moved, a declaration filed under the wrong future owner, a pending
// declaration extracted early, the tag deferred or moved after the monolith, a
// top-level side effect smuggled into the module — and the SAME guards that ran
// above are re-run against it. Each must break at least one.
// ═════════════════════════════════════════════════════════════════════════════
section('14. MUTATION PROOF');

const HEAD_MOD_DECLS = A.modDecls.map((d) => ({ name: d.name, text: MODULE_SRC.slice(d.start, d.end) }));
const textOf = (n) => HEAD_MOD_DECLS.find((d) => d.name === n).text;
const MODULE_HEADER = MODULE_SRC.slice(0, A.modDecls[0].start);

// Guards over an analyser result plus, where relevant, the evaluated behaviour.
const GUARDS = [
  ['mask-length-preserving', (r) => r.maskLenOk === true],
  ['module-decl-count', (r) => r.moduleDeclCount === SHIPPED_DECLS],
  ['module-order', (r) => JSON.stringify(r.moduleOrder) === JSON.stringify(['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'])],
  ['module-chars', (r) => r.modulePessChars === SHIPPED_CHARS],
  ['span-sha', (r) => r.modDecls.every((d) => sha256(r.moduleSrcUsed.slice(d.start, d.end)) === BASE_SPAN_SHA256[d.name])],
  ['binding-forms', (r) => r.modDecls.filter((d) => d.bindingForm === 'var').length === 1 && r.modDecls.filter((d) => d.bindingForm === 'function').length === 3],
  ['signatures', (r) => r.modDecls.every((d) => d.signature === MANIFEST.find((m) => m[0] === d.name)[4])],
  ['inline-count', (r) => r.inlinePess.length === PENDING_DECLS],
  ['inline-chars', (r) => r.inlinePessChars === PENDING_CHARS],
  ['inline-names', (r) => JSON.stringify(r.inlinePessNames) === JSON.stringify(['runPESSPanel', 'pessGetStreamerSymbols', 'pessRunDXLink', 'pessAnalyzeTicker', 'pessAnalyzeAll'])],
  ['no-shipped-inline', (r) => r.shippedNames.every((n) => r.inlinePessNames.indexOf(n) < 0)],
  ['no-pending-early', (r) => r.pendingNames.every((n) => r.modulePessNames.indexOf(n) < 0)],
  ['no-duplicate', (r) => new Set(r.modulePessNames.concat(r.inlinePessNames)).size === TOTAL_DECLS],
  ['totals', (r) => r.modulePessChars + r.inlinePessChars === TOTAL_CHARS],
  ['purity-residue', (r) => r.residueLen === 0],
  ['tag-once', (r) => r.tagCount === 1],
  ['tag-before-monolith', (r) => r.moduleTagIndex >= 0 && r.moduleTagIndex < r.monoTagIndex],
  ['tag-classic', (r) => r.moduleTagObj !== null && !/\bdefer\b/i.test(r.moduleTagObj.attrs) && !/\basync\b/i.test(r.moduleTagObj.attrs) && !/\btype\s*=/i.test(r.moduleTagObj.attrs)],
  ['local-script-count', (r) => r.localSrcs.length === 30],
  ['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 1] === './js/ui/backend-directional-snapshot-panel.js'],
  ['module-slot', (r) => r.localSrcs.indexOf('./' + MODULE_REL) === 5],
  ['ratchet', (r) => r.inlinePess.length === RATCHET_AFTER],
];
// behaviour guards evaluate the module and compare against the BASE recording
const BEHAVIOUR_GUARDS = [
  ['ivr-transcript', (c) => FIX_IVR.every((f) => JSON.stringify(plain(c.pessIVRRegime(unNaN(f.in)))) === JSON.stringify(f.out))],
  ['edge-transcript', (c) => FIX_EDGE.every((f) => JSON.stringify(plain(c.pessIVEdge(f.in[0], f.in[1]))) === JSON.stringify(f.out))],
  ['card-transcript', (c) => FIX_CARD.every((f) => c.pessRejectCard(f.in[0], f.in[1], f.in[2]) === f.out)],
  ['live-min-value', (c) => JSON.stringify(plain(c.PESS_LIVE_MIN)) === JSON.stringify(FIX_LIVE_MIN)],
];
// plan guards read the manifest itself
function planFacts(manifest) {
  const per = {};
  for (const m of manifest) { per[m[3]] = per[m[3]] || { n: 0, c: 0 }; per[m[3]].n++; per[m[3]].c += m[2]; }
  return {
    total: manifest.length, totalChars: manifest.reduce((a, m) => a + m[2], 0),
    shipped: (per[CONFIG_RULES] || { n: 0 }).n, shippedChars: (per[CONFIG_RULES] || { c: 0 }).c,
    pending: manifest.filter((m) => m[3] !== CONFIG_RULES).length,
    pendingChars: manifest.filter((m) => m[3] !== CONFIG_RULES).reduce((a, m) => a + m[2], 0),
    ratchetAfter: manifest.filter((m) => m[3] !== CONFIG_RULES).length,
  };
}
const PLAN_GUARDS = [
  ['plan-total', (p) => p.total === TOTAL_DECLS && p.totalChars === TOTAL_CHARS],
  ['plan-shipped', (p) => p.shipped === SHIPPED_DECLS && p.shippedChars === SHIPPED_CHARS],
  ['plan-pending', (p) => p.pending === PENDING_DECLS && p.pendingChars === PENDING_CHARS],
  ['plan-ratchet', (p) => p.ratchetAfter === RATCHET_AFTER && p.ratchetAfter < RATCHET_BEFORE],
];

function runGuards(html, moduleSrc) {
  let r;
  try { r = analyze({ html, moduleSrc, manifest: MANIFEST }); } catch (e) { return ['threw:' + String(e.message).slice(0, 40)]; }
  if (r.fatal) return ['fatal:' + r.fatal];
  r.moduleSrcUsed = moduleSrc;
  const broken = [];
  for (const [n, g] of GUARDS) { let v; try { v = g(r); } catch (_) { v = false; } if (!v) broken.push(n); }
  let ctx = null;
  try { ctx = {}; vm.createContext(ctx); vm.runInContext(moduleSrc, ctx, { filename: 'mutant.js' }); }
  catch (e) { broken.push('module-does-not-evaluate'); ctx = null; }
  if (ctx) for (const [n, g] of BEHAVIOUR_GUARDS) { let v; try { v = g(ctx); } catch (_) { v = false; } if (!v) broken.push(n); }
  return broken;
}
function runPlanGuards(manifest) {
  const p = planFacts(manifest);
  return PLAN_GUARDS.filter(([, g]) => { try { return !g(p); } catch (_) { return true; } }).map(([n]) => n);
}
deepEq(runGuards(HTML, MODULE_SRC), [], '14.1 every guard passes against the UNMUTATED repository');
deepEq(runPlanGuards(MANIFEST), [], '14.2 every plan guard passes against the real manifest');

const mkModule = (names) => MODULE_HEADER + names.map((n) => (typeof n === 'string' ? textOf(n) : n)).join('\n\n') + '\n';
const FOUR_T = ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'];
const swap = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'mutant setup: needle absent — ' + a.slice(0, 50)); return s.slice(0, i) + b + s.slice(i + a.length); };
const inlineText = (n) => { const d = A.inlineDecls.find((x) => x.name === n); return A.mono.slice(d.start, d.end); };

const MUTANTS = [
  // ── SOURCE ───────────────────────────────────────────────────────────────
  ['SOURCE', 'pessIVRRegime omitted from the module', () => runGuards(HTML, mkModule(FOUR_T.filter((n) => n !== 'pessIVRRegime')))],
  ['SOURCE', 'pessIVEdge duplicated in the module', () => runGuards(HTML, mkModule(['pessIVRRegime', 'pessIVEdge', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN']))],
  ['SOURCE', 'pessRejectCard body changed (one class renamed)', () => runGuards(HTML, mkModule(FOUR_T).replace('class="stbox"', 'class="stbox2"'))],
  ['SOURCE', 'PESS_LIVE_MIN var → const', () => runGuards(HTML, mkModule(FOUR_T).replace('var PESS_LIVE_MIN', 'const PESS_LIVE_MIN'))],
  ['SOURCE', 'pessIVEdge signature changed (parameter added)', () => runGuards(HTML, mkModule(FOUR_T).replace('function pessIVEdge(ivFront,ivBack)', 'function pessIVEdge(ivFront,ivBack,extra)'))],
  ['SOURCE', 'moved declarations REORDERED (constant hoisted first)', () => runGuards(HTML, mkModule(['PESS_LIVE_MIN', 'pessIVRRegime', 'pessIVEdge', 'pessRejectCard']))],
  ['SOURCE', 'moved declarations reordered (rules swapped)', () => runGuards(HTML, mkModule(['pessIVEdge', 'pessIVRRegime', 'pessRejectCard', 'PESS_LIVE_MIN']))],
  ['SOURCE', 'a shipped declaration is ALSO left inline', () => runGuards(swap(HTML, inlineText('runPESSPanel'), textOf('pessIVEdge') + '\n\n' + inlineText('runPESSPanel')), MODULE_SRC)],
  ['SOURCE', 'a pending declaration is extracted EARLY into config/rules', () => runGuards(HTML, mkModule(FOUR_T.concat([inlineText('pessGetStreamerSymbols')])))],
  ['SOURCE', 'an unrelated PESS declaration is added to the module', () => runGuards(HTML, mkModule(FOUR_T.concat(['function pessExtraHelper(x){return x;}'])))],
  ['SOURCE', 'a non-PESS declaration is added to the module', () => runGuards(HTML, mkModule(FOUR_T.concat(['function unrelatedHelper(x){return x;}'])))],

  // ── RULE BEHAVIOUR ───────────────────────────────────────────────────────
  ['RULE', 'IVR hard-reject threshold 70 → 65', () => runGuards(HTML, mkModule(FOUR_T).replace('if(ivr>70)', 'if(ivr>65)'))],
  ['RULE', 'IVR neutral boundary >=30 → >30', () => runGuards(HTML, mkModule(FOUR_T).replace('if(ivr>=30)', 'if(ivr>30)'))],
  ['RULE', 'IVR favourable adjustment +10 → +5', () => runGuards(HTML, mkModule(FOUR_T).replace("adj:+10,hardReject:null,color:'var(--gr)'", "adj:+5,hardReject:null,color:'var(--gr)'"))],
  ['RULE', 'IV edge boundary <3 → <4', () => runGuards(HTML, mkModule(FOUR_T).replace('if(edgePct<3)', 'if(edgePct<4)'))],
  ['RULE', 'IV edge negative penalty -15 → -5', () => runGuards(HTML, mkModule(FOUR_T).replace('adj:-15', 'adj:-5'))],
  ['RULE', 'reject-card output altered (SCARTATO → REJECTED)', () => runGuards(HTML, mkModule(FOUR_T).replace('>SCARTATO<', '>REJECTED<'))],
  ['RULE', 'reject-card drops the newline→<br> replacement', () => runGuards(HTML, mkModule(FOUR_T).replace("body.replace(/\\n/g,'<br>')", 'body'))],
  ['RULE', 'PESS_LIVE_MIN value altered (delta dropped)', () => runGuards(HTML, mkModule(FOUR_T).replace("['bidPrice','askPrice','delta']", "['bidPrice','askPrice']"))],

  // ── OWNER ────────────────────────────────────────────────────────────────
  ['OWNER', 'a CONFIG_RULES declaration filed under UI_PANEL', () => runPlanGuards(MANIFEST.map((m) => m[0] === 'pessRejectCard' ? [m[0], m[1], m[2], UI_PANEL, m[4]] : m))],
  ['OWNER', 'a pending transport declaration filed under CONFIG_RULES', () => runPlanGuards(MANIFEST.map((m) => m[0] === 'pessRunDXLink' ? [m[0], m[1], m[2], CONFIG_RULES, m[4]] : m))],
  ['OWNER', 'the state constant filed under LIVE_TRANSPORT', () => runPlanGuards(MANIFEST.map((m) => m[0] === 'PESS_LIVE_MIN' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m))],
  ['OWNER', 'a manifest entry duplicated', () => runPlanGuards(MANIFEST.concat([MANIFEST[0]]))],

  // ── LOAD ─────────────────────────────────────────────────────────────────
  ['LOAD', 'module tag missing', () => runGuards(HTML.replace(MODULE_TAG + '\n', ''), MODULE_SRC)],
  ['LOAD', 'module tag duplicated', () => runGuards(HTML.replace(MODULE_TAG + '\n', MODULE_TAG + '\n' + MODULE_TAG + '\n'), MODULE_SRC)],
  ['LOAD', 'module tag moved AFTER the inline monolith', () => {
    const without = HTML.replace(MODULE_TAG + '\n', '');
    return runGuards(without.replace('</body>', MODULE_TAG + '\n</body>'), MODULE_SRC);
  }],
  ['LOAD', 'module tag appended last, displacing the DSB panel from the tail', () => {
    const without = HTML.replace(MODULE_TAG + '\n', '');
    const anchor = '<script src="./js/ui/backend-directional-snapshot-panel.js"></script>\n';
    return runGuards(without.replace(anchor, anchor + MODULE_TAG + '\n'), MODULE_SRC);
  }],
  ['LOAD', 'defer added to the module tag', () => runGuards(HTML.replace(MODULE_TAG, '<script defer src="./js/services/pess-config-rules.js"></script>'), MODULE_SRC)],
  ['LOAD', 'async added to the module tag', () => runGuards(HTML.replace(MODULE_TAG, '<script async src="./js/services/pess-config-rules.js"></script>'), MODULE_SRC)],
  ['LOAD', 'type=module added to the module tag', () => runGuards(HTML.replace(MODULE_TAG, '<script type="module" src="./js/services/pess-config-rules.js"></script>'), MODULE_SRC)],
  ['LOAD', 'a top-level invocation added to the module', () => runGuards(HTML, mkModule(FOUR_T) + '\npessIVRRegime(50);\n')],
  ['LOAD', 'top-level DOM access added to the module', () => runGuards(HTML, mkModule(FOUR_T) + "\ndocument.getElementById('x');\n")],
  ['LOAD', 'top-level fetch added to the module', () => runGuards(HTML, mkModule(FOUR_T) + "\nfetch('/pess/chain/AAPL');\n")],
  ['LOAD', 'top-level timer added to the module', () => runGuards(HTML, mkModule(FOUR_T) + '\nsetTimeout(function(){}, 0);\n')],
  ['LOAD', 'top-level listener added to the module', () => runGuards(HTML, mkModule(FOUR_T) + "\nwindow.addEventListener('resize', function(){});\n")],
  ['LOAD', 'top-level window assignment added to the module', () => runGuards(HTML, mkModule(FOUR_T) + '\nwindow.pessIVRRegime = pessIVRRegime;\n')],

  // ── PLAN ─────────────────────────────────────────────────────────────────
  ['PLAN', 'total != 9 (a declaration dropped from the manifest)', () => runPlanGuards(MANIFEST.filter((m) => m[0] !== 'pessAnalyzeAll'))],
  ['PLAN', 'shipped != 4 (a fifth filed as CONFIG_RULES)', () => runPlanGuards(MANIFEST.map((m) => m[0] === 'pessGetStreamerSymbols' ? [m[0], m[1], m[2], CONFIG_RULES, m[4]] : m))],
  ['PLAN', 'shipped chars != 1,786', () => runPlanGuards(MANIFEST.map((m) => m[0] === 'pessIVEdge' ? [m[0], m[1], 559, m[3], m[4]] : m))],
  ['PLAN', 'pending chars != 50,936', () => runPlanGuards(MANIFEST.map((m) => m[0] === 'pessAnalyzeAll' ? [m[0], m[1], 16110, m[3], m[4]] : m))],
  ['PLAN', 'the ratchet does not shrink (all nine still filed as pending)', () => runPlanGuards(MANIFEST.map((m) => [m[0], m[1], m[2], m[3] === CONFIG_RULES ? UI_PANEL : m[3], m[4]]))],

  // ── PARSER ───────────────────────────────────────────────────────────────
  ['PARSER', 'masker splits by code point, not UTF-16 unit', () => {
    let r; try { r = analyze({ html: HTML, moduleSrc: MODULE_SRC, manifest: MANIFEST, mask: maskSourceByCodePoint }); } catch (e) { return ['threw']; }
    if (r.fatal) return ['fatal'];
    r.moduleSrcUsed = MODULE_SRC;
    return GUARDS.filter(([, g]) => { try { return !g(r); } catch (_) { return true; } }).map(([n]) => n);
  }],
  // A broken masker is "killed" when it is DISTINGUISHABLE from the real one.
  // Measured over the MONOLITH, where the lookback actually does work — the
  // module's own regex is guarded by its preceding `(` and is unaffected.
  ['PARSER', 'regex-keyword lookback disabled', () => {
    const a = maskSource(A.mono), b = maskSourceWithoutRegexKeywords(A.mono);
    let diff = Math.abs(a.length - b.length);
    for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) if (a[i] !== b[i]) diff++;
    return diff > 0 ? ['masking-differs-by-' + diff + '-chars'] : [];
  }],
];

let killed = 0; const survivors = []; const byCat = {};
for (const [cat, label, run] of MUTANTS) {
  let broke;
  try { broke = run(); } catch (e) { broke = ['threw:' + String(e.message).slice(0, 40)]; }
  byCat[cat] = (byCat[cat] || 0) + 1;
  if (broke.length) killed++; else survivors.push(cat + ' / ' + label);
  ok(broke.length > 0, '14.3 mutant KILLED [' + cat + '] ' + label);
}
eq(survivors.length, 0, '14.4 no mutant survives');
eq(killed, MUTANTS.length, '14.5 all ' + MUTANTS.length + ' mutants are rejected');
note('mutants: ' + MUTANTS.length + ' (' + Object.entries(byCat).sort().map(([k, v]) => k + ' ' + v).join(', ') + ') — ' + killed + ' killed, ' + survivors.length + ' survivors');

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  assertions: ' + passed + '   mutants: ' + MUTANTS.length + '   survivors: ' + survivors.length);
console.log('  CONFIG_RULES SHIPPED 4/1,786 · PENDING 5/50,936 · TOTAL 9/52,722 · ratchet 9→5');
console.log('  PESS EXTRACTION BOUNDARY CONTRACT: OK');
console.log('════════════════════════════════════════════════════════════════════════════════');
