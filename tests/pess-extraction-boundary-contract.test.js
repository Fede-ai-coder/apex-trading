'use strict';
// ═════════════════════════════════════════════════════════════════════════════
// PESS EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS IS
//   The boundary contract for the PESS (Pre-Earnings Strangle Swap agent)
//   family, opened with PR 1 of 4 and carrying the WHOLE nine-declaration plan
//   from day one — not just the declarations the current PR happens to ship.
//
//   PESS was chosen by the post-SFS monolith audit and had, uniquely among the
//   candidates, ZERO existing test coverage. Nothing in the suite referenced any
//   PESS declaration before this file. So this contract is not an accessory to
//   the extraction — it is the only thing that would notice a mistake.
//
// THE PLAN (option E of that audit — four ownership layers, four PRs)
//   CONFIG_RULES      js/services/pess-config-rules.js       4 / 1,786    SHIPPED
//   LIVE_TRANSPORT    js/services/pess-live-transport.js     2 / 9,127    SHIPPED
//   ANALYSIS_SERVICE  js/services/pess-analysis-service.js   1 / 16,111   PENDING
//   UI_PANEL          js/ui/pess-panel.js                    2 / 25,698   PENDING
//                                                            ─────────────
//                                                            9 / 52,722
//
//   After PR 1: 4 in the module, 5 inline (50,936 B). After PR 2: 6 shipped
//   (10,913 B), 3 inline (41,809 B). The inline allowance ratchets 9 → 5 → 3
//   and may only ever shrink.
//
// WHAT PR 2 IS
//   A BYTE-FOR-BYTE RELOCATION, exactly as PR 1 was. Two async declarations were
//   cut from the inline monolith and pasted into a classic script, unchanged:
//   same names, same signatures, same bodies, same `async function` binding
//   form, same relative physical order. One `<script src>` tag was added.
//   Nothing else changed, and NO transport behaviour changed.
//
//   In particular, no transport defect was repaired here. §19 records the ones
//   this audit found and PINS them, so that a later "tidy-up" cannot silently
//   alter lifecycle semantics under cover of a relocation.
//
// WHY THE MODULE ORDER LOOKS "WRONG"
//   `PESS_LIVE_MIN` is listed LAST in the config module even though a config
//   file would conventionally open with its constant. That is deliberate: among
//   the nine PESS declarations it is physically sixth. Relocation identity means
//   moved declarations keep their relative order, so no aesthetic regrouping is
//   permitted. It also sat physically BETWEEN the two transport declarations —
//   and that interleaving is explicitly NOT a licence to reorder or duplicate
//   anything in PR 2. §7 pins both facts.
//
// HOW IT IS ORGANISED
//   §1  parser         — masker + top-level declaration scanner
//   §2  parser proof   — reproduce the shipped-module fixtures exactly
//   §3  the analyser   — ONE pure function from inputs to the measurement
//   §4  the manifest   — all 9 declarations, 4 owners, shipped vs pending
//   §5  relocation     — 6/6 byte identity against the real base blobs
//   §6  the residue    — exactly 3 declarations remain, unchanged
//   §7  physical order — original relative order, in the monolith and modules
//   §8  ownership      — what each module owns, measured, not assumed
//   §9  the load       — two classic src-only tags, adjacent, before consumers
//   §10 purity         — structural AND evaluated under a trapping sandbox
//   §11 parity         — BASE vs HEAD transcripts, sync rules AND async transport
//   §12 ratchet        — the inline allowance 9 → 5 → 3, shrink-only
//   §13 reconstruction — PR 2 alone, and PR 1+2 cumulatively, byte for byte
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
// [name, form, chars, owner, signature]. Owners are the four planned modules;
// two are shipped today. Listing the pending three here is what makes "no
// pending declaration was extracted early" and "no shipped declaration is still
// inline" checkable rather than aspirational.
// ═════════════════════════════════════════════════════════════════════════════

const CONFIG_RULES = 'CONFIG_RULES';
const LIVE_TRANSPORT = 'LIVE_TRANSPORT';
const ANALYSIS_SERVICE = 'ANALYSIS_SERVICE';
const UI_PANEL = 'UI_PANEL';

// EXACT physical order in the pre-PESS monolith. Position matters: PESS_LIVE_MIN
// is SIXTH of nine, and it sits physically BETWEEN the two LIVE_TRANSPORT
// declarations — two owners interleaved. That is why the invariant is relative
// ORDER, never adjacency.
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
  LIVE_TRANSPORT: { status: 'SHIPPED', module: 'js/services/pess-live-transport.js' },
  ANALYSIS_SERVICE: { status: 'PENDING', module: 'js/services/pess-analysis-service.js' },
  UI_PANEL: { status: 'PENDING', module: 'js/ui/pess-panel.js' },
};
// The owners whose module exists on disk today. EVERY count below is derived
// from this list, so PR 3 flips one string and the arithmetic follows.
const SHIPPED_OWNERS = [CONFIG_RULES, LIVE_TRANSPORT];
const PENDING_OWNERS = [ANALYSIS_SERVICE, UI_PANEL];
const isShipped = (owner) => SHIPPED_OWNERS.indexOf(owner) >= 0;

const CONFIG_REL = 'js/services/pess-config-rules.js';
const TRANSPORT_REL = 'js/services/pess-live-transport.js';
const MODULE_REL = { [CONFIG_RULES]: CONFIG_REL, [LIVE_TRANSPORT]: TRANSPORT_REL };
const TAG_OF = (rel) => '<script src="./' + rel + '"></script>';
const CONFIG_TAG = TAG_OF(CONFIG_REL);
const TRANSPORT_TAG = TAG_OF(TRANSPORT_REL);

const TOTAL_DECLS = 9, TOTAL_CHARS = 52722;
const SHIPPED_DECLS = 6, SHIPPED_CHARS = 10913;
const PENDING_DECLS = 3, PENDING_CHARS = 41809;
const CONFIG_DECLS = 4, CONFIG_CHARS = 1786;
const TRANSPORT_DECLS = 2, TRANSPORT_CHARS = 9127;
// The ratchet history. It is a list, not a pair, so it can only be appended to
// and every step is checked to shrink.
const RATCHET = [9, 5, 3];
const RATCHET_AFTER = RATCHET[RATCHET.length - 1];
const LOCAL_SCRIPT_COUNT = 31;

// The blob PR 1 was cut from — the pre-PESS application. §13 reconstructs it
// from HEAD by undoing BOTH shipped PESS modules.
const PRE_PESS_REF = '1c7c0d945d858e4f968bc69d6887053fab227800';
const PRE_PESS_INDEX_SHA256 = '9c198ef0d5be2292052ef539c05fc75a65e5cc3083f922e94a21f16d619f5164';
// The blob PR 2 was cut from — the application immediately after PR 1 merged
// (merge commit of PR #370). §13 reconstructs this one too, from PR 2 alone.
const BASE_REF = '27a38dd243b15d89d7c42b378e0dc42b6e6a322e';
const BASE_INDEX_SHA256 = 'd63c1db88d907fe732f50175e3d939a4901b7405055260803138335bec3ce84c';

// Per-declaration SHA-256 of the span, and the offset it occupied in EACH base.
// PRE_OFFSET is the offset in the pre-PESS monolith (all nine still inline).
// BASE_OFFSET is the offset in the post-PR-1 monolith, and exists only for the
// declarations PR 2 moved. Both were read mechanically, never hand-copied.
const SPAN_SHA256 = {
  pessIVRRegime: 'f3505e22b6d8cf80a03bc2e62b7d0bbacd8d87fc44b67f55b7370421553d2092',
  pessIVEdge: '91bf04f5605cec238a8e76c815b90514ab003a12bdb0b34f35e456a96ac9c3a3',
  pessRejectCard: '42737995f5991ff2535025493445cef62383b4aed405867efc1cf91841764527',
  PESS_LIVE_MIN: 'b969b0f1ffa32d65e93d3393e2e767396b5958c6ec2f36fa486bd36597641fcf',
  pessGetStreamerSymbols: 'b847a43a556d47bf6b32bd124b7630bd466ef507a4f53b352f5a7a153d69b408',
  pessRunDXLink: 'ab5ceda1d4637155f182c128834fca18c0487acae4d3ba53b7968ca1b1ae8448',
};
const PRE_OFFSET = {
  pessIVRRegime: 821993, pessIVEdge: 823020, runPESSPanel: 823580, pessRejectCard: 827336,
  pessGetStreamerSymbols: 828122, PESS_LIVE_MIN: 832167, pessRunDXLink: 832411,
  pessAnalyzeTicker: 837731, pessAnalyzeAll: 859746,
};
const BASE_OFFSET = { pessGetStreamerSymbols: 826386, pessRunDXLink: 830625 };

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
// §14 re-runs the SAME guards over MUTATED bundles. It is keyed by OWNER rather
// than by a single module path, so PR 3 adds a map entry and nothing else.
// ═════════════════════════════════════════════════════════════════════════════

function analyze(input) {
  const { html, modules, manifest, mask } = input;
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
  // The masker must be length-preserving over EVERY real input. The monolith
  // holds one astral character (a surrogate pair), and it sits AFTER the PESS
  // span — so a code-point split shifts only later offsets and would leave every
  // PESS measurement below looking correct. This invariant is what catches it.
  const maskedMono = maskFn(mono);
  let maskLenOk = maskedMono.length === mono.length;
  for (const owner of Object.keys(modules)) {
    if (maskFn(modules[owner]).length !== modules[owner].length) maskLenOk = false;
  }
  const inlineDecls = scanTopLevelDeclarations(mono, maskedMono).sort((a, b) => a.start - b.start);

  // Per-owner module measurement.
  const mod = {};
  for (const owner of Object.keys(modules)) {
    const src = modules[owner];
    const decls = scanTopLevelDeclarations(src, maskFn(src)).sort((a, b) => a.start - b.start);
    let residue = src;
    for (const d of decls.slice().sort((a, b) => b.start - a.start)) residue = residue.slice(0, d.start) + residue.slice(d.end);
    mod[owner] = {
      src, decls,
      names: decls.map((d) => d.name),
      pess: decls.filter((d) => isPessName(d.name)),
      pessNames: decls.filter((d) => isPessName(d.name)).map((d) => d.name),
      chars: decls.filter((d) => isPessName(d.name)).reduce((a, d) => a + d.chars, 0),
      count: decls.length,
      residueLen: maskFn(residue).replace(/\s/g, '').length,
    };
  }

  const inlinePess = inlineDecls.filter((d) => isPessName(d.name));
  const shippedNames = manifest.filter((m) => isShipped(m[3])).map((m) => m[0]);
  const pendingNames = manifest.filter((m) => !isShipped(m[3])).map((m) => m[0]);
  const allModuleNames = [].concat(...Object.keys(mod).map((o) => mod[o].pessNames));
  const allModuleDecls = [].concat(...Object.keys(mod).map((o) => mod[o].pess.map((d) => ({ owner: o, d }))));

  const localSrcs = tags.filter((t) => t.kind === 'local').map((t) => t.src);
  const monoTagIndex = tags.findIndex((t) => t.kind === 'inline' && t.len > 100000);
  const tagIndex = {}, tagCount = {}, tagObj = {};
  for (const owner of Object.keys(modules)) {
    const src = './' + MODULE_REL[owner];
    tagIndex[owner] = tags.findIndex((t) => t.src === src);
    tagCount[owner] = tags.filter((t) => t.src === src).length;
    tagObj[owner] = tags.find((t) => t.src === src) || null;
  }

  return {
    mono, tags, localSrcs, inlineDecls, maskLenOk, mod,
    inlinePess, shippedNames, pendingNames, allModuleNames, allModuleDecls,
    inlinePessNames: inlinePess.map((d) => d.name),
    inlinePessChars: inlinePess.reduce((a, d) => a + d.chars, 0),
    moduleChars: Object.keys(mod).reduce((a, o) => a + mod[o].chars, 0),
    moduleDeclTotal: Object.keys(mod).reduce((a, o) => a + mod[o].count, 0),
    residueTotal: Object.keys(mod).reduce((a, o) => a + mod[o].residueLen, 0),
    tagIndex, tagCount, tagObj, monoTagIndex,
    inlinePessOrder: inlinePess.map((d) => d.name),
    monoChars: mono.length,
  };
}

const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CONFIG_SRC = fs.readFileSync(path.join(ROOT, CONFIG_REL), 'utf8');
const TRANSPORT_SRC = fs.readFileSync(path.join(ROOT, TRANSPORT_REL), 'utf8');
const MODULES = { [CONFIG_RULES]: CONFIG_SRC, [LIVE_TRANSPORT]: TRANSPORT_SRC };
const A = analyze({ html: HTML, modules: MODULES, manifest: MANIFEST });
assert.ok(!A.fatal, 'analyser failed: ' + A.fatal);

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  PESS EXTRACTION BOUNDARY CONTRACT — PR 2 of 4 (LIVE TRANSPORT)');
console.log('════════════════════════════════════════════════════════════════════════════════');

// ═════════════════════════════════════════════════════════════════════════════
// §2 PARSER PROOF — the shipped-module fixtures, reproduced exactly
//
// Re-proving the parser on modules this PR does not touch is what makes the two
// new measurements trustworthy: the same code that reports "9,127" also reports
// six independently-known numbers, and is wrong about none of them.
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
for (const owner of SHIPPED_OWNERS) {
  verifyMaskerInvariants(maskSource, MODULES[owner], MODULE_REL[owner]);
  ok(true, '2.5 masker invariants hold over ' + MODULE_REL[owner]);
}
// Every completed family stays extinct inline — this PR must not resurrect one.
eq(A.inlineDecls.filter((d) => /^(?:_?sfs|SFS_)/i.test(d.name) || /Sfs[A-Z]/.test(d.name)).length, 0, '2.6 SFS inline residual is still 0');
eq(A.inlineDecls.filter((d) => /^(?:_?dsb|DSB_)/i.test(d.name) || /Dsb[A-Z]/.test(d.name)).length, 0, '2.7 DSB inline residual is still 0');
eq(A.inlinePessNames.filter((n) => A.mod[CONFIG_RULES].pessNames.indexOf(n) >= 0).length, 0,
  '2.7b PESS CONFIG_RULES inline residual is still 0 — PR 1 stays undone');
ok(A.maskLenOk, '2.8 the masker is length-preserving over the monolith and BOTH shipped modules');
{
  const a = maskSource(A.mono), b = maskSourceWithoutRegexKeywords(A.mono);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) if (a[i] !== b[i]) diff++;
  eq(diff, 494, '2.8b disabling the regex-keyword lookback changes 494 masked chars — the lookback does real work here');
}
ok(Array.from(A.mono).length === A.mono.length - 1, '2.9 the monolith holds exactly one astral character — it sits after the PESS span, so only the length invariant catches a code-point split');
note('six shipped-module fixtures reproduced exactly; SFS, DSB and PESS-config inline residuals all 0');

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
  ['CONFIG_RULES=SHIPPED', 'LIVE_TRANSPORT=SHIPPED', 'ANALYSIS_SERVICE=PENDING', 'UI_PANEL=PENDING'],
  '4.6 CONFIG_RULES and LIVE_TRANSPORT are SHIPPED; the other two are PENDING');
deepEq(SHIPPED_OWNERS.slice().sort(), Object.keys(OWNER_STATE).filter((k) => OWNER_STATE[k].status === 'SHIPPED').sort(),
  '4.6b the shipped-owner list and the owner-state table agree');
const perOwner = {};
for (const m of MANIFEST) { perOwner[m[3]] = perOwner[m[3]] || { n: 0, c: 0 }; perOwner[m[3]].n++; perOwner[m[3]].c += m[2]; }
deepEq(perOwner[CONFIG_RULES], { n: 4, c: 1786 }, '4.7 CONFIG_RULES owns 4 declarations / 1,786 chars (shipped, PR 1)');
deepEq(perOwner[LIVE_TRANSPORT], { n: 2, c: 9127 }, '4.8 LIVE_TRANSPORT owns 2 / 9,127 (shipped, PR 2)');
deepEq(perOwner[ANALYSIS_SERVICE], { n: 1, c: 16111 }, '4.9 ANALYSIS_SERVICE owns 1 / 16,111 (pending)');
deepEq(perOwner[UI_PANEL], { n: 2, c: 25698 }, '4.10 UI_PANEL owns 2 / 25,698 (pending)');
eq(perOwner[CONFIG_RULES].c + perOwner[LIVE_TRANSPORT].c, SHIPPED_CHARS, '4.11 the two shipped owners sum to 10,913 chars');
eq(perOwner[ANALYSIS_SERVICE].c + perOwner[UI_PANEL].c, PENDING_CHARS, '4.11b the two pending owners sum to 41,809 chars');
eq(SHIPPED_CHARS + PENDING_CHARS, TOTAL_CHARS, '4.12 shipped + pending === total, exactly');
eq(SHIPPED_DECLS + PENDING_DECLS, TOTAL_DECLS, '4.13 …and so do the counts');
eq(MANIFEST.filter((m) => isShipped(m[3])).length, SHIPPED_DECLS, '4.14 6 declarations are shipped');
eq(MANIFEST.filter((m) => !isShipped(m[3])).length, PENDING_DECLS, '4.15 3 declarations are pending');
// LIVE_TRANSPORT is exactly the two named declarations — not "whatever is async".
deepEq(MANIFEST.filter((m) => m[3] === LIVE_TRANSPORT).map((m) => m[0]),
  ['pessGetStreamerSymbols', 'pessRunDXLink'], '4.16 LIVE_TRANSPORT is exactly pessGetStreamerSymbols + pessRunDXLink');
deepEq(MANIFEST.filter((m) => m[3] === LIVE_TRANSPORT).map((m) => m[2]), [3809, 5318],
  '4.17 …at exactly 3,809 and 5,318 chars');
note('CONFIG_RULES 4/1,786 + LIVE_TRANSPORT 2/9,127 SHIPPED = 6/10,913 · ANALYSIS_SERVICE 1/16,111 · UI_PANEL 2/25,698 PENDING');

// ═════════════════════════════════════════════════════════════════════════════
// §5 RELOCATION — 6/6 byte identity against the real base blobs
//
// Two independent proofs per declaration: the recorded per-span SHA-256, and —
// when git can reach the blob — a direct character-for-character comparison
// against the span at the offset it actually occupied in the base.
// ═════════════════════════════════════════════════════════════════════════════
section('5. BYTE-FOR-BYTE RELOCATION');
function git(args) { return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, encoding: 'utf8' }); }
function readBlob(ref, expectSha) {
  let s = null;
  try { s = git(['show', ref + ':index.html']); } catch (_) { return null; }
  return sha256(s) === expectSha ? s : null;
}
function monolithOf(html) {
  const inl = L.parseScriptTags(html).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
  return inl.length === 1 ? inl[0].inline : null;
}
const BASE_HTML = readBlob(BASE_REF, BASE_INDEX_SHA256);
const PRE_HTML = readBlob(PRE_PESS_REF, PRE_PESS_INDEX_SHA256);
const BASE_MONO = BASE_HTML ? monolithOf(BASE_HTML) : null;
const PRE_MONO = PRE_HTML ? monolithOf(PRE_HTML) : null;

eq(A.mod[CONFIG_RULES].count, CONFIG_DECLS, '5.1 the config module declares exactly 4 top-level declarations');
eq(A.mod[LIVE_TRANSPORT].count, TRANSPORT_DECLS, '5.1b the transport module declares exactly 2 top-level declarations');
deepEq(A.mod[CONFIG_RULES].names, ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'],
  '5.2 …and they are exactly the four CONFIG_RULES members');
deepEq(A.mod[LIVE_TRANSPORT].names, ['pessGetStreamerSymbols', 'pessRunDXLink'],
  '5.2b …and exactly the two LIVE_TRANSPORT members');
eq(A.mod[CONFIG_RULES].chars, CONFIG_CHARS, '5.3 config module totals 1,786 declaration chars');
eq(A.mod[LIVE_TRANSPORT].chars, TRANSPORT_CHARS, '5.3b transport module totals 9,127 declaration chars');
eq(A.moduleChars, SHIPPED_CHARS, '5.3c both modules together total 10,913 declaration chars');
let identicalSha = 0;
for (const owner of SHIPPED_OWNERS) {
  for (const d of A.mod[owner].decls) {
    const text = A.mod[owner].src.slice(d.start, d.end);
    eq(sha256(text), SPAN_SHA256[d.name], '5.4 ' + d.name + ' is byte-identical to its recorded base span (sha256)');
    identicalSha++;
  }
}
eq(identicalSha, SHIPPED_DECLS, '5.4b all 6 shipped declarations carry a recorded span hash');
// PR 2's two, compared directly against the post-PR-1 base blob at their offsets
let identicalBase = 0;
if (BASE_MONO) {
  for (const d of A.mod[LIVE_TRANSPORT].decls) {
    const m = MANIFEST.find((x) => x[0] === d.name);
    const baseText = BASE_MONO.slice(BASE_OFFSET[d.name], BASE_OFFSET[d.name] + m[2]);
    const modText = A.mod[LIVE_TRANSPORT].src.slice(d.start, d.end);
    eq(modText, baseText, '5.5 ' + d.name + ' — the module span EQUALS the PR-2 base span, character for character');
    if (modText === baseText) identicalBase++;
  }
  eq(identicalBase, TRANSPORT_DECLS, '5.6 2/2 transport declarations are byte-identical to the post-PR-1 monolith');
  note('2/2 byte-identical, verified against the real PR-2 base blob at ' + BASE_REF.slice(0, 10));
} else {
  ok(true, '5.5 PR-2 base blob unreachable here — the recorded per-span SHA-256 in §5.4 stands as the evidence');
  note('PR-2 base blob not reachable; per-span SHA-256 identity still proven in 5.4');
}
// all six, compared against the ORIGINAL pre-PESS monolith
if (PRE_MONO) {
  let n = 0;
  for (const { owner, d } of A.allModuleDecls) {
    const m = MANIFEST.find((x) => x[0] === d.name);
    const preText = PRE_MONO.slice(PRE_OFFSET[d.name], PRE_OFFSET[d.name] + m[2]);
    eq(A.mod[owner].src.slice(d.start, d.end), preText,
      '5.6b ' + d.name + ' still equals its PRE-PESS span — unchanged across both PRs');
    n++;
  }
  eq(n, SHIPPED_DECLS, '5.6c 6/6 shipped declarations are byte-identical to the ORIGINAL pre-PESS monolith');
} else {
  ok(true, '5.6b pre-PESS blob unreachable here — recorded span hashes stand');
}
// binding forms and signatures survive
for (const { owner, d } of A.allModuleDecls) {
  const m = MANIFEST.find((x) => x[0] === d.name);
  eq((d.isAsync ? 'async ' : '') + d.bindingForm, m[1], '5.7 ' + d.name + ' keeps its binding/async form: ' + m[1]);
  eq(d.signature, m[4], '5.8 ' + d.name + ' keeps its exact signature');
  eq(d.chars, m[2], '5.9 ' + d.name + ' keeps its exact size');
}
eq(A.mod[CONFIG_RULES].decls.filter((d) => d.bindingForm === 'var').length, 1, '5.10 exactly one `var` survives as a `var` — no const conversion');
eq(A.mod[CONFIG_RULES].decls.filter((d) => d.bindingForm === 'function').length, 3, '5.11 three `function` declarations — no arrow conversion');
eq(A.mod[CONFIG_RULES].decls.filter((d) => d.isAsync).length, 0, '5.12 none of the config four is async — the sync form is preserved');

// ═════════════════════════════════════════════════════════════════════════════
// §5B ASYNC FORM CONTRACT
//
// Four of the nine PESS declarations are async. After PR 2 exactly two of them
// live in the transport module and exactly two remain inline. `async` is part of
// the relocation identity: dropping it changes the return type from a Promise to
// a raw value and would break every caller. §14 mutates it and requires failure.
// ═════════════════════════════════════════════════════════════════════════════
section('5B. ASYNC FORM');
const ASYNC_ALL = MANIFEST.filter((m) => m[1] === 'async function').map((m) => m[0]);
deepEq(ASYNC_ALL, ['pessGetStreamerSymbols', 'pessRunDXLink', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
  '5B.1 the family has exactly four async declarations, in physical order');
eq(A.mod[LIVE_TRANSPORT].decls.filter((d) => d.isAsync).length, 2, '5B.2 the transport module owns exactly 2 async functions');
eq(A.mod[LIVE_TRANSPORT].decls.every((d) => d.isAsync && d.bindingForm === 'function'), true,
  '5B.3 …and BOTH of its declarations are `async function` — no sync, no arrow, no var');
eq(A.inlinePess.filter((d) => d.isAsync).length, 2, '5B.4 exactly 2 async declarations remain inline');
deepEq(A.inlinePess.filter((d) => d.isAsync).map((d) => d.name), ['pessAnalyzeTicker', 'pessAnalyzeAll'],
  '5B.5 …and they are pessAnalyzeTicker and pessAnalyzeAll');
eq(A.inlinePess.filter((d) => !d.isAsync).map((d) => d.name).join(','), 'runPESSPanel',
  '5B.6 runPESSPanel remains the one SYNCHRONOUS inline PESS declaration');
for (const d of A.mod[LIVE_TRANSPORT].decls) {
  ok(/^async\s+function\s/.test(A.mod[LIVE_TRANSPORT].src.slice(d.start, d.start + 40)),
    '5B.7 ' + d.name + ' literally begins `async function` in the module text');
}
note('transport owns 2 async functions; 2 async + 1 sync remain inline');

// ═════════════════════════════════════════════════════════════════════════════
// §6 THE RESIDUE — exactly three remain, unchanged
// ═════════════════════════════════════════════════════════════════════════════
section('6. WHAT REMAINS INLINE');
eq(A.inlinePess.length, PENDING_DECLS, '6.1 exactly 3 PESS declarations remain inline');
eq(A.inlinePessChars, PENDING_CHARS, '6.2 …totalling 41,809 declaration chars');
deepEq(A.inlinePessNames, ['runPESSPanel', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
  '6.3 …and they are exactly the three pending members, in their original relative order');
for (const n of A.shippedNames) ok(A.inlinePessNames.indexOf(n) < 0, '6.4 shipped declaration ' + n + ' is NO LONGER inline');
for (const n of A.pendingNames) ok(A.allModuleNames.indexOf(n) < 0, '6.5 pending declaration ' + n + ' was NOT extracted early');
for (const d of A.inlinePess) {
  const m = MANIFEST.find((x) => x[0] === d.name);
  eq(d.chars, m[2], '6.6 ' + d.name + ' is unchanged in size (' + m[2] + ' chars)');
  eq((d.isAsync ? 'async ' : '') + d.bindingForm, m[1], '6.7 ' + d.name + ' keeps its binding/async form');
  eq(d.signature, m[4], '6.8 ' + d.name + ' keeps its exact signature');
}
// no declaration is filed in two places, and none went missing
const everywhere = A.allModuleNames.concat(A.inlinePessNames).sort();
deepEq(everywhere, MANIFEST.map((m) => m[0]).sort(), '6.10 every one of the nine exists exactly once, modules + inline');
eq(new Set(everywhere).size, TOTAL_DECLS, '6.11 no PESS declaration is duplicated across modules and monolith');
eq(A.moduleChars + A.inlinePessChars, TOTAL_CHARS, '6.12 module + inline chars still sum to 52,722');
// the two modules do not overlap each other either
deepEq(A.mod[CONFIG_RULES].pessNames.filter((n) => A.mod[LIVE_TRANSPORT].pessNames.indexOf(n) >= 0), [],
  '6.13 the config and transport modules share NO declaration');
note('config 4/1,786 · transport 2/9,127 · inline 3/41,809 · total 9/52,722 — no duplicate, no omission, no cross-filing');

// ═════════════════════════════════════════════════════════════════════════════
// §7 PHYSICAL ORDER — the rule that stops aesthetic regrouping
//
// PESS_LIVE_MIN sat physically BETWEEN pessGetStreamerSymbols and pessRunDXLink
// and now lives in a different module. That interleaving is emphatically NOT a
// reason to reorder, duplicate or re-home anything: each module keeps the
// relative order its own members had in the original monolith, and the two
// transport declarations stay adjacent to each other in the transport file.
// ═════════════════════════════════════════════════════════════════════════════
section('7. PHYSICAL ORDER');
const MANIFEST_ORDER = MANIFEST.map((m) => m[0]);
deepEq(MANIFEST_ORDER, ['pessIVRRegime', 'pessIVEdge', 'runPESSPanel', 'pessRejectCard',
  'pessGetStreamerSymbols', 'PESS_LIVE_MIN', 'pessRunDXLink', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
  '7.1 the base physical order of all nine PESS declarations');
if (PRE_MONO) {
  const preDecls = scanTopLevelDeclarations(PRE_MONO, maskSource(PRE_MONO))
    .sort((a, b) => a.start - b.start).filter((d) => isPessName(d.name));
  deepEq(preDecls.map((d) => d.name), MANIFEST_ORDER, '7.1b …re-derived MECHANICALLY from the pre-PESS blob, not copied');
  deepEq(preDecls.map((d) => d.chars), MANIFEST.map((m) => m[2]), '7.1c …with exactly the manifest sizes');
  deepEq(preDecls.map((d) => d.start), MANIFEST_ORDER.map((n) => PRE_OFFSET[n]), '7.1d …at exactly the recorded offsets');
}
for (const owner of SHIPPED_OWNERS) {
  const expected = MANIFEST.filter((m) => m[3] === owner).map((m) => m[0]);
  deepEq(A.mod[owner].names, expected,
    '7.2 ' + MODULE_REL[owner] + ' lists its members in their ORIGINAL relative order — no aesthetic regrouping');
}
eq(A.mod[CONFIG_RULES].names[3], 'PESS_LIVE_MIN', '7.3 PESS_LIVE_MIN is LAST in the config module, because it is last of the four in the monolith');
eq(A.mod[LIVE_TRANSPORT].names[0], 'pessGetStreamerSymbols', '7.4 pessGetStreamerSymbols is FIRST in the transport module');
eq(A.mod[LIVE_TRANSPORT].names[1], 'pessRunDXLink', '7.5 pessRunDXLink is SECOND — the original relative order');
ok(MANIFEST_ORDER.indexOf('pessGetStreamerSymbols') < MANIFEST_ORDER.indexOf('pessRunDXLink'),
  '7.6 …which is the order they had in the monolith');
// THE INTERLEAVING, stated as a fact and not acted upon
eq(MANIFEST_ORDER.indexOf('PESS_LIVE_MIN'), 5, '7.7 PESS_LIVE_MIN is sixth of the nine');
ok(MANIFEST_ORDER.indexOf('pessGetStreamerSymbols') < MANIFEST_ORDER.indexOf('PESS_LIVE_MIN') &&
   MANIFEST_ORDER.indexOf('PESS_LIVE_MIN') < MANIFEST_ORDER.indexOf('pessRunDXLink'),
  '7.8 PESS_LIVE_MIN sat physically BETWEEN the two transport declarations — owners interleave');
eq(A.mod[LIVE_TRANSPORT].names.indexOf('PESS_LIVE_MIN'), -1,
  '7.9 …and the transport module did NOT absorb it on that basis');
{
  const d0 = A.mod[LIVE_TRANSPORT].decls[0], d1 = A.mod[LIVE_TRANSPORT].decls[1];
  const between = A.mod[LIVE_TRANSPORT].src.slice(d0.end, d1.start);
  eq(maskSource(between).replace(/\s/g, '').length, 0,
    '7.10 …nothing was inserted between them in the module either — only whitespace separates the two spans');
}
const bridged = MANIFEST_ORDER.slice(MANIFEST_ORDER.indexOf('pessIVRRegime'), MANIFEST_ORDER.indexOf('pessRunDXLink') + 1)
  .filter((n) => !isShipped(MANIFEST.find((m) => m[0] === n)[3]));
deepEq(bridged, ['runPESSPanel'], '7.11 one PENDING declaration still sits physically inside the shipped span — expected, and why order is the invariant');
deepEq(A.inlinePessOrder, MANIFEST.filter((m) => !isShipped(m[3])).map((m) => m[0]),
  '7.12 the three that remain keep their original relative order too');
note('config: IVRRegime → IVEdge → RejectCard → LIVE_MIN · transport: GetStreamerSymbols → RunDXLink (original relative order)');

// ═════════════════════════════════════════════════════════════════════════════
// §8 OWNERSHIP — what each module owns, MEASURED, not assumed
//
// PR 1's rule was "these four are inert". That claim is true of the config
// module and is re-checked below, but it is NOT the rule for a transport module
// and must not be copy-pasted onto one. A transport layer exists precisely to
// have effects: it opens a socket, subscribes, arms a timer and issues requests.
//
// So the boundary for LIVE_TRANSPORT is drawn differently, and every clause is
// measured against the real source rather than inferred from the module's name:
//
//   PERMITTED, because they ARE the transport:  network via ttCall, WebSocket
//     construction, DXLink protocol sends, feed subscription, one timeout, and
//     the socket lifecycle around them.
//
//   FORBIDDEN, because they belong to other owners:  persistent state (S.*),
//     DOM LOOKUP, storage, window/globalThis writes, and any mutation of another
//     family's mutable state.
//
// THE ONE FINDING THIS AUDIT HAD TO ADJUDICATE
//   pessRunDXLink performs three DOM WRITES: two `statusEl.textContent` and one
//   `statusEl.innerHTML`. That is a real effect and it is pinned here rather
//   than waved through. It does NOT make the function a UI owner, and the
//   distinction is mechanical, not rhetorical:
//     • `statusEl` is a PARAMETER. The function never looks an element up —
//       there is no `document.`, no getElementById, no querySelector, no
//       createElement anywhere in either declaration (8.3 measures this).
//     • Every write is guarded by `if(statusEl)`, so passing null is a
//       supported, exercised path (§11 runs it).
//     • Nothing is retained. No element is stored, and no state survives the
//       call.
//   Writing progress into a caller-injected sink is a transport status report.
//   The panel that OWNS the element is runPESSPanel/pessAnalyzeTicker, both
//   still inline and both shipping in PR 4. Had the function queried the DOM
//   itself, that would have contradicted the planned owner and this PR would
//   have stopped instead of shipping.
// ═════════════════════════════════════════════════════════════════════════════
section('8. OWNERSHIP');

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
const maskedOf = {};
for (const owner of SHIPPED_OWNERS) maskedOf[owner] = maskSource(A.mod[owner].src);
const spanMasked = (owner, d) => maskedOf[owner].slice(d.start, d.end);

// ── 8A the config module is still totally inert ──────────────────────────────
for (const d of A.mod[CONFIG_RULES].decls) {
  const mc = spanMasked(CONFIG_RULES, d);
  for (const [label, re] of EFFECTS) eq((mc.match(re) || []).length, 0, '8.1 ' + d.name + ' performs no ' + label);
}
const ALL_NAMES = new Set(A.inlineDecls.map((d) => d.name).concat(A.allModuleNames));
for (const d of A.mod[CONFIG_RULES].decls) {
  const mc = spanMasked(CONFIG_RULES, d);
  const calls = new Set();
  const r = /\b([A-Za-z_$][\w$]*)\s*\(/g; let m;
  while ((m = r.exec(mc))) if (ALL_NAMES.has(m[1]) && m[1] !== d.name) calls.add(m[1]);
  deepEq([...calls], [], '8.2 ' + d.name + ' calls no other application declaration');
}
const cfgDecl = (n) => A.mod[CONFIG_RULES].decls.find((d) => d.name === n);
const cardText = A.mod[CONFIG_RULES].src.slice(cfgDecl('pessRejectCard').start, cfgDecl('pessRejectCard').end);
ok(/return\s+'<div/.test(cardText), '8.2b pessRejectCard RETURNS markup as a string…');
ok(!/document|innerHTML\s*=|appendChild|insertAdjacent/.test(cardText), '8.2c …and mutates no DOM — returning HTML is not owning the DOM');
const liveMinText = A.mod[CONFIG_RULES].src.slice(cfgDecl('PESS_LIVE_MIN').start, cfgDecl('PESS_LIVE_MIN').end);
eq(liveMinText, "var PESS_LIVE_MIN=['bidPrice','askPrice','delta'];", '8.2d PESS_LIVE_MIN is its exact original inert initialiser');

// ── 8B what the transport module is FORBIDDEN to own ─────────────────────────
const TRANSPORT_FORBIDDEN = [
  ['persistent state read', /\bS\.[A-Za-z_$][\w$]*/g],
  ['persistent state write', /\bS\.[A-Za-z_$][\w$]*\s*=(?!=)/g],
  ['DOM lookup', /document\.|getElementById|querySelector|createElement|\.appendChild|insertAdjacent/g],
  ['storage', /localStorage|sessionStorage|indexedDB/g],
  ['window/global write', /\b(?:window|globalThis|self)\s*\.[A-Za-z_$][\w$]*\s*=(?!=)/g],
  ['window/global read', /\bwindow\b|\bglobalThis\b/g],
  ['listener registration', /addEventListener|removeEventListener/g],
  ['Portfolio/SFS/DSB/scanner state', /\b(?:sfs|dsb|bss|_?portfolio|scannerState)[A-Za-z_$]*\s*=(?!=)/gi],
];
for (const d of A.mod[LIVE_TRANSPORT].decls) {
  const mc = spanMasked(LIVE_TRANSPORT, d);
  for (const [label, re] of TRANSPORT_FORBIDDEN) eq((mc.match(re) || []).length, 0, '8.3 ' + d.name + ' performs no ' + label);
}
const transportMasked = maskedOf[LIVE_TRANSPORT];
eq((transportMasked.match(/document\./g) || []).length, 0, '8.3b the transport module contains NO `document.` anywhere');
eq((transportMasked.match(/getElementById|querySelector/g) || []).length, 0, '8.3c …and no element lookup of any kind');

// ── 8C the DOM writes, pinned exactly ────────────────────────────────────────
{
  const dx = A.mod[LIVE_TRANSPORT].decls.find((d) => d.name === 'pessRunDXLink');
  const gs = A.mod[LIVE_TRANSPORT].decls.find((d) => d.name === 'pessGetStreamerSymbols');
  const gsMc = spanMasked(LIVE_TRANSPORT, gs);
  eq((gsMc.match(/\.(?:innerHTML|textContent|innerText)\s*=/g) || []).length, 0,
    '8.4 pessGetStreamerSymbols writes NO DOM at all');
  const dxMc = spanMasked(LIVE_TRANSPORT, dx);
  const writes = [];
  const wr = /([A-Za-z_$][\w$.]*)\.(innerHTML|textContent|innerText)\s*=/g; let m;
  while ((m = wr.exec(dxMc))) writes.push(m[1] + '.' + m[2]);
  deepEq(writes, ['statusEl.textContent', 'statusEl.textContent', 'statusEl.innerHTML'],
    '8.5 pessRunDXLink writes DOM exactly 3 times, ALWAYS through the injected `statusEl` parameter');
  eq(new Set(writes.map((w) => w.split('.')[0])).size, 1, '8.6 …to exactly ONE receiver, and it is the parameter');
  eq(gs.signature.indexOf('statusEl'), -1, '8.7 statusEl is not even a parameter of pessGetStreamerSymbols');
  ok(/async function pessRunDXLink\(ticker,syms,statusEl\)/.test(dx.signature),
    '8.8 statusEl is the THIRD PARAMETER of pessRunDXLink — supplied by the caller, never looked up');
  eq((dxMc.match(/if\(statusEl\)/g) || []).length, 3, '8.9 …and all three writes are guarded by `if(statusEl)` — null is a supported path');
}

// ── 8D what the transport module legitimately DOES own ───────────────────────
{
  const dxMc = spanMasked(LIVE_TRANSPORT, A.mod[LIVE_TRANSPORT].decls.find((d) => d.name === 'pessRunDXLink'));
  const gsMc = spanMasked(LIVE_TRANSPORT, A.mod[LIVE_TRANSPORT].decls.find((d) => d.name === 'pessGetStreamerSymbols'));
  eq((gsMc.match(/\bttCall\s*\(/g) || []).length, 2, '8.10 pessGetStreamerSymbols issues exactly 2 backend calls');
  eq((dxMc.match(/\bttCall\s*\(/g) || []).length, 1, '8.11 pessRunDXLink issues exactly 1 backend call');
  eq((dxMc.match(/new\s+WebSocket\s*\(/g) || []).length, 1, '8.12 pessRunDXLink constructs exactly ONE WebSocket');
  eq((dxMc.match(/\bsetTimeout\s*\(/g) || []).length, 1, '8.13 …arms exactly ONE timer');
  eq((dxMc.match(/\bclearTimeout\s*\(/g) || []).length, 4, '8.14 …and clears it on exactly 4 code paths');
  eq((dxMc.match(/ws\.close\(\)/g) || []).length, 3, '8.15 …closes the socket on exactly 3 code paths');
  eq((dxMc.match(/ws\.send\s*\(/g) || []).length, 6, '8.16 …and sends exactly 6 protocol frames');
  eq((dxMc.match(/\bws\.on[a-z]+\s*=/g) || []).length, 4, '8.17 …registering exactly 4 socket callbacks (open/message/error/close)');
  eq((gsMc.match(/new\s+WebSocket|setTimeout|clearTimeout/g) || []).length, 0,
    '8.18 pessGetStreamerSymbols owns NO socket and NO timer — symbol resolution only');
}

// ── 8E endpoints, pinned to their real owners ────────────────────────────────
//   The audit assumed /pess/term-structure/ might belong here. It does NOT: the
//   source shows it inside pessAnalyzeTicker and pessAnalyzeAll, both still
//   inline. Source truth wins, so it is pinned to those owners and explicitly
//   NOT attributed to LIVE_TRANSPORT.
// Endpoint ownership is a fact about CODE, so every count below is scoped to
// declaration spans. Prose in the module header names these endpoints too, and
// documentation is not ownership. §10.1 already proved the module has NO
// top-level code at all, so a hit outside a declaration can only be a comment —
// which is exactly why scoping here is tightening the claim, not loosening it.
{
  const ownersIn = (needle, hay, decls) => {
    const found = {}; let i = -1;
    while ((i = hay.indexOf(needle, i + 1)) >= 0) {
      const d = decls.find((x) => i >= x.start && i < x.end);
      if (!d) continue;
      found[d.name] = (found[d.name] || 0) + 1;
    }
    return found;
  };
  const T = A.mod[LIVE_TRANSPORT];
  const inDecls = (needle) => {
    let i = -1, n = 0;
    while ((i = T.src.indexOf(needle, i + 1)) >= 0) if (T.decls.some((d) => i >= d.start && i < d.end)) n++;
    return n;
  };
  deepEq(ownersIn('/eic/chain-symbols/', T.src, T.decls), { pessGetStreamerSymbols: 2 },
    '8.19 /eic/chain-symbols/ is owned by pessGetStreamerSymbols — twice, front and back');
  deepEq(ownersIn('/quote-token', T.src, T.decls), { pessRunDXLink: 2 },
    '8.20 /quote-token is owned by pessRunDXLink (the call and its error message)');
  eq(inDecls('/pess/term-structure'), 0,
    '8.21 NO transport declaration references /pess/term-structure/ — the audit assumption was wrong and the source wins');
  deepEq(ownersIn('/pess/term-structure/', A.mono, A.inlineDecls), { pessAnalyzeTicker: 1, pessAnalyzeAll: 1 },
    '8.22 …it belongs to pessAnalyzeTicker and pessAnalyzeAll, which are still inline (PR 3 and PR 4)');
  eq(inDecls("'wss://tasty-openapi-ws.dxfeed.com/realtime'"), 1,
    '8.23 the DXLink fallback URL is owned here, verbatim, inside pessRunDXLink');
  // the complete endpoint inventory of the module's executable code
  const urls = new Set();
  for (const d of T.decls) {
    const body = T.src.slice(d.start, d.end);
    const r = /'(\/[A-Za-z0-9_\-/]*|wss?:\/\/[^']*)'/g; let m;
    while ((m = r.exec(body))) urls.add(m[1]);
  }
  deepEq([...urls].sort(), ['/eic/chain-symbols/', '/quote-token', 'wss://tasty-openapi-ws.dxfeed.com/realtime'],
    '8.23b the module\'s COMPLETE endpoint inventory is exactly these three — nothing else is reachable from here');
}

// ── 8F PESS_LIVE_MIN — exactly one owner, read at call time ──────────────────
{
  const all = [A.mono].concat(SHIPPED_OWNERS.map((o) => A.mod[o].src));
  const declSites = [];
  for (const owner of SHIPPED_OWNERS) for (const d of A.mod[owner].decls) if (d.name === 'PESS_LIVE_MIN') declSites.push(MODULE_REL[owner]);
  for (const d of A.inlineDecls) if (d.name === 'PESS_LIVE_MIN') declSites.push('index.html');
  deepEq(declSites, [CONFIG_REL], '8.24 PESS_LIVE_MIN is DECLARED in exactly one place — pess-config-rules.js');
  eq(A.mod[LIVE_TRANSPORT].decls.filter((d) => d.name === 'PESS_LIVE_MIN').length, 0,
    '8.25 the transport module does NOT redeclare it');
  const litRe = /\[\s*'bidPrice'\s*,\s*'askPrice'\s*,\s*'delta'\s*\]/g;
  eq((A.mod[LIVE_TRANSPORT].src.match(litRe) || []).length, 0,
    '8.26 …and does not inline a second copy of its array literal');
  let totalLiterals = 0;
  for (const s of all) totalLiterals += (s.match(litRe) || []).length;
  eq(totalLiterals, 1, '8.27 the minimum-field list exists exactly ONCE in the whole application');
  const dxMc = spanMasked(LIVE_TRANSPORT, A.mod[LIVE_TRANSPORT].decls.find((d) => d.name === 'pessRunDXLink'));
  eq((dxMc.match(/\bPESS_LIVE_MIN\b/g) || []).length, 2, '8.28 pessRunDXLink READS PESS_LIVE_MIN twice…');
  const transportDecls = A.mod[LIVE_TRANSPORT].decls;
  let topLevelRefs = 0, i = -1;
  while ((i = transportMasked.indexOf('PESS_LIVE_MIN', i + 1)) >= 0) {
    if (!transportDecls.some((d) => i >= d.start && i < d.end)) topLevelRefs++;
  }
  eq(topLevelRefs, 0, '8.29 …and NEVER at module top level — the dependency is CALL-time, not evaluation-time');
}

// ── 8G consumers and the evaluation-time/call-time split ─────────────────────
{
  const monoMasked = maskSource(A.mono);
  const CONSUMERS = {
    pessIVRRegime: ['runPESSPanel', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
    pessIVEdge: ['pessAnalyzeTicker', 'pessAnalyzeAll'],
    pessRejectCard: ['pessAnalyzeTicker'],
    PESS_LIVE_MIN: [],
    pessGetStreamerSymbols: ['pessAnalyzeTicker', 'pessAnalyzeAll'],
    pessRunDXLink: ['pessAnalyzeTicker', 'pessAnalyzeAll'],
  };
  for (const [name, expected] of Object.entries(CONSUMERS)) {
    const found = new Set();
    const r = new RegExp('\\b' + name + '\\b', 'g'); let m;
    while ((m = r.exec(monoMasked))) {
      const d = A.inlineDecls.find((x) => m.index >= x.start && m.index < x.end);
      found.add(d ? d.name : '(TOP-LEVEL STATEMENT)');
    }
    deepEq([...found].sort(), expected.slice().sort(), '8.30 ' + name + ' is referenced in the monolith only by ' + (expected.join(', ') || '(nothing)'));
    ok(!found.has('(TOP-LEVEL STATEMENT)'), '8.31 ' + name + ' is referenced by NO top-level statement — the dependency is call-time');
    ok([...found].every((c) => isPessName(c)), '8.32 ' + name + ' has no consumer outside the PESS family');
  }
  // The transport module's own external dependencies are all call-time too.
  const EXTERNAL = ['ttCall', 'logEv', 'WebSocket', 'setTimeout', 'clearTimeout', 'PESS_LIVE_MIN'];
  for (const name of EXTERNAL) {
    let i = -1, top = 0;
    while ((i = transportMasked.indexOf(name, i + 1)) >= 0) {
      if (!A.mod[LIVE_TRANSPORT].decls.some((d) => i >= d.start && i < d.end)) top++;
    }
    eq(top, 0, '8.33 ' + name + ' is referenced only INSIDE a function body — never at module evaluation time');
  }
}
note('config module inert · transport owns socket/timer/subscription/network; zero DOM lookup, zero state, zero storage, zero window');
note('DOM writes: 3, all through the injected statusEl parameter, all guarded — a status report, not panel ownership');
note('endpoints owned: /eic/chain-symbols/ ×2 and /quote-token ×1 · /pess/term-structure/ belongs to the PENDING analysis functions');

// ═════════════════════════════════════════════════════════════════════════════
// §9 THE LOAD — two classic src-only tags, adjacent, before every consumer
// ═════════════════════════════════════════════════════════════════════════════
section('9. THE LOAD');
for (const owner of SHIPPED_OWNERS) {
  const rel = MODULE_REL[owner], tag = TAG_OF(rel);
  eq(A.tagCount[owner], 1, '9.1 index.html loads ' + rel + ' EXACTLY once');
  eq((HTML.match(new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1,
    '9.2 …through exactly one literal, src-only tag');
  const t = A.tagObj[owner];
  ok(t !== null, '9.3 the ' + rel + ' tag is present');
  ok(!/\bdefer\b/i.test(t.attrs), '9.4 ' + rel + ' has no defer');
  ok(!/\basync\b/i.test(t.attrs), '9.5 ' + rel + ' has no async');
  ok(!/\btype\s*=/i.test(t.attrs), '9.6 ' + rel + ' declares no type — a classic script');
  ok(!/\bnomodule\b/i.test(t.attrs), '9.7 ' + rel + ' has no nomodule');
  ok(!/\bintegrity\b|\bcrossorigin\b/i.test(t.attrs), '9.8 ' + rel + ' carries no integrity/crossorigin');
  eq(t.attrs.trim(), 'src="./' + rel + '"', '9.8b ' + rel + ' carries EXACTLY one attribute: src');
  ok(A.tagIndex[owner] >= 0 && A.tagIndex[owner] < A.monoTagIndex,
    '9.9 ' + rel + ' loads BEFORE the inline monolith — the only hard requirement');
  ok(fs.existsSync(path.join(ROOT, rel)), '9.9b ' + rel + ' exists on disk at the path the tag names');
}
// ADJACENCY. The transport module has NO evaluation-time dependency (§8G, §10),
// so nothing forces this slot. It is chosen so the PESS family region stays
// contiguous as PR 3 and PR 4 append to it, and so the DSB tail is untouched.
eq(A.localSrcs.indexOf('./' + TRANSPORT_REL), A.localSrcs.indexOf('./' + CONFIG_REL) + 1,
  '9.10 the transport module sits IMMEDIATELY after the config module — the PESS region is contiguous');
eq(A.localSrcs.indexOf('./' + CONFIG_REL), 5, '9.10b the config module is still at slot 6, where PR 1 put it');
eq(A.localSrcs.indexOf('./' + TRANSPORT_REL), 6, '9.10c the transport module takes slot 7');
eq(A.localSrcs[4], './js/config/backend-config.js', '9.10d …the region still opens right after the last foundation module');
eq(A.localSrcs[A.localSrcs.length - 1], './js/ui/backend-directional-snapshot-panel.js',
  '9.11 the DSB panel is STILL the last local script before the monolith — this PR did not displace it');
eq(A.localSrcs.length, LOCAL_SCRIPT_COUNT, '9.12 index.html now loads 31 local application scripts (30 + this module)');
for (const owner of SHIPPED_OWNERS) {
  eq(A.localSrcs.filter((s) => s === './' + MODULE_REL[owner]).length, 1, '9.13 …with no duplicate entry for ' + MODULE_REL[owner]);
}
const PESS_REGION = ['./' + CONFIG_REL, './' + TRANSPORT_REL];
const pessSlots = PESS_REGION.map((s) => A.localSrcs.indexOf(s));
ok(pessSlots.every((v, i) => i === 0 || v === pessSlots[i - 1] + 1), '9.14 the PESS scripts form ONE contiguous run');
// no shipped family run was split by the insertion
const SFS_RUN = ['./js/services/sfs-config-state.js', './js/services/sfs-scan-service.js',
  './js/services/sfs-candle-predicates.js', './js/services/sfs-candle-warmup.js',
  './js/services/sfs-candle-generic-ensure.js', './js/services/sfs-candle-chart-hydration.js',
  './js/services/sfs-candle-spy-read.js', './js/services/sfs-candle-detail-4h.js', './js/ui/sfs-panel.js'];
const DSB_RUN = ['./js/adapters/backend-directional-snapshot-adapter.js',
  './js/services/backend-directional-snapshot-service.js', './js/ui/backend-directional-snapshot-panel.js'];
const FAMILY_RUNS = [SFS_RUN, DSB_RUN,
  ['./js/services/portfolio-stress-parity.js', './js/services/portfolio-stress-response.js', './js/services/portfolio-stress-client.js'],
  ['./js/services/candle-normalization.js', './js/services/candle-auth-gate.js', './js/services/candle-provenance.js', './js/services/candle-store-client.js', './js/services/candle-dxlink-client.js']];
for (const run of FAMILY_RUNS) {
  const slots = run.map((x) => A.localSrcs.indexOf(x));
  ok(slots.every((v) => v >= 0), '9.15 family run is intact: ' + run[0]);
  ok(slots.every((v, i) => i === 0 || v === slots[i - 1] + 1), '9.15b …and still contiguous — the new tag was not inserted into it');
  ok(!(A.tagIndex[LIVE_TRANSPORT] > Math.min(...slots) && A.tagIndex[LIVE_TRANSPORT] < Math.max(...slots)),
    '9.15c …and the new PESS tag does not sit inside it');
}
note('slot ' + (A.localSrcs.indexOf('./' + TRANSPORT_REL) + 1) + ' of ' + A.localSrcs.length +
  ' local scripts — immediately after pess-config-rules.js; the DSB tail is untouched');

// ── NEGATIVE CONTROLS — the real failure modes, executed ─────────────────────
// The dependency is call-time, so "wrong order" does not mean a load-time crash;
// it means a consumer running BEFORE the binding exists. Both controls below
// reproduce that. A genuine EXTERNAL load-time read is also proven to fail, so
// that §10's purity result cannot be mistaken for an untestable claim.
{
  const sandbox = {}; vm.createContext(sandbox);
  let threwMissing = null;
  try { vm.runInContext('function consumer(){ return pessRunDXLink("AAPL",{},null); } out = consumer();', sandbox, { filename: 'missing-tag.js' }); }
  catch (e) { threwMissing = e; }
  ok(threwMissing !== null && threwMissing.name === 'ReferenceError' && /pessRunDXLink/.test(String(threwMissing.message)),
    '9.16 NEGATIVE CONTROL — with the transport tag absent, a consumer call throws ReferenceError: pessRunDXLink is not defined');
  const sandbox2 = {}; vm.createContext(sandbox2);
  let threwOrder = null;
  try { vm.runInContext('var early = pessGetStreamerSymbols("AAPL",{},{});', sandbox2, { filename: 'consumer-first.js' }); }
  catch (e) { threwOrder = e; }
  ok(threwOrder !== null && threwOrder.name === 'ReferenceError' && /pessGetStreamerSymbols/.test(String(threwOrder.message)),
    '9.17 NEGATIVE CONTROL — a consumer evaluated BEFORE the module throws; ordering the tag after the monolith would reproduce this');
  // CORRECT ORDER — module first, then the consumer, resolves the binding.
  const sandbox3 = {}; vm.createContext(sandbox3);
  vm.runInContext(TRANSPORT_SRC, sandbox3, { filename: TRANSPORT_REL });
  vm.runInContext('var t = typeof pessRunDXLink;', sandbox3, { filename: 'consumer-after.js' });
  eq(sandbox3.t, 'function', '9.18 CONTROL — module first, consumer second: the binding resolves');
  // A GENUINE external load-time read still fails. This is the control that
  // stops §10 from being vacuous: the sandbox really would surface one.
  const sandbox4 = {}; vm.createContext(sandbox4);
  let threwExternal = null;
  try { vm.runInContext(TRANSPORT_SRC + '\nvar probe = PESS_LIVE_MIN.length;', sandbox4, { filename: 'external-load-read.js' }); }
  catch (e) { threwExternal = e; }
  ok(threwExternal !== null && threwExternal.name === 'ReferenceError' && /PESS_LIVE_MIN/.test(String(threwExternal.message)),
    '9.19 NEGATIVE CONTROL — a REAL evaluation-time read of an external binding throws, so §10 detects one if it ever appears');
}

// ═════════════════════════════════════════════════════════════════════════════
// §10 MODULE PURITY — structural, then EVALUATED under a trapping sandbox
//
// This matters more for a transport module than it did for config/rules. The
// declarations inside DO open sockets, DO subscribe and DO arm timers — so the
// question "does loading the file do any of that?" cannot be answered by
// grepping for `WebSocket`. It has to be answered by EVALUATING the file and
// watching whether anything is touched.
//
// A reference INSIDE a function body is not an evaluation-time effect. §9.19
// already proved this sandbox surfaces a genuine external load-time read, so a
// clean result here is evidence rather than an absence of evidence.
//
// NODE 20 / NODE 22 CAVEAT
//   Global function-declaration instantiation can observe the declared
//   function's OWN name differently across V8 versions (this was hit during the
//   SFS extraction). That is the function declaring itself, not an external
//   dependency. The trap list below therefore contains NO name declared by this
//   module, so a self-instantiation touch cannot be mistaken for a real
//   load-time dependency — and §9.19's control proves a real one still fails.
// ═════════════════════════════════════════════════════════════════════════════
section('10. MODULE PURITY');
for (const owner of SHIPPED_OWNERS) {
  eq(A.mod[owner].residueLen, 0, '10.1 removing the declaration spans from ' + MODULE_REL[owner] + ' leaves ONLY comments and whitespace');
  const src = A.mod[owner].src;
  ok(!/\brequire\s*\(|\bimport\b|\bexport\b|module\.exports/.test(maskSource(src)),
    '10.2 ' + MODULE_REL[owner] + ' uses no import / export / require — it is a classic global script');
  ok(!/^\s*['"]use strict['"]/m.test(src), '10.3 ' + MODULE_REL[owner] + ' adds no "use strict" — the monolith had none');
  // A wrapper lives OUTSIDE the declarations, so that is where it is looked for.
  // Searching the whole file would match every `find(function(x){…})` callback
  // inside a body and say nothing about wrapping. §10.1 has already reduced the
  // residue to comments and whitespace; these two make the intent explicit, and
  // a real wrapper would in any case leave ZERO top-level declarations (5.1/5.1b).
  let residue = src;
  for (const d of A.mod[owner].decls.slice().sort((a, b) => b.start - a.start)) residue = residue.slice(0, d.start) + residue.slice(d.end);
  const residueCode = maskSource(residue);
  ok(!/\(function\s*\(|\(\s*\)\s*=>|!function/.test(residueCode), '10.4 ' + MODULE_REL[owner] + ' has no IIFE wrapper around its declarations');
  ok(!/\bclass\s+[A-Za-z_$]/.test(residueCode), '10.5 ' + MODULE_REL[owner] + ' has no wrapper class');
  ok(A.mod[owner].decls.length > 0, '10.5b ' + MODULE_REL[owner] + ' still exposes TOP-LEVEL declarations — a wrapper would have left none');
}
const AMBIENT = ['document', 'window', 'globalThis', 'fetch', 'XMLHttpRequest', 'WebSocket',
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'localStorage', 'sessionStorage',
  'indexedDB', 'navigator', 'location', 'history', 'alert', 'console', 'Chart', 'S', 'ttCall',
  'logEv', 'requestAnimationFrame', 'queueMicrotask', 'postMessage', 'EventSource', 'Worker'];
for (const owner of SHIPPED_OWNERS) {
  const declared = A.mod[owner].names;
  // No trapped name may collide with a name this module declares — otherwise a
  // self-instantiation touch would be indistinguishable from a real dependency.
  deepEq(AMBIENT.filter((g) => declared.indexOf(g) >= 0), [],
    '10.6 ' + MODULE_REL[owner] + ': no trapped ambient name collides with a declared name (node-20/22 self-instantiation guard)');
  const touched = [];
  const trap = (label) => new Proxy(function () {}, {
    get(t, p) { if (typeof p === 'string') touched.push(label + '.' + p); return trap(label + '.' + String(p)); },
    set(t, p) { touched.push('SET ' + label + '.' + String(p)); return true; },
    apply() { touched.push('CALL ' + label); return trap(label + '()'); },
    construct() { touched.push('NEW ' + label); return trap('new ' + label); },
  });
  const ctx = {};
  for (const g of AMBIENT) ctx[g] = trap(g);
  vm.createContext(ctx);
  vm.runInContext(A.mod[owner].src, ctx, { filename: MODULE_REL[owner] });
  deepEq(touched, [], '10.7 EVALUATING ' + MODULE_REL[owner] +
    ' touches NO ambient global — zero request, socket, subscription, timer, listener, DOM, storage or window access');
  for (const n of declared) ok(Object.prototype.hasOwnProperty.call(ctx, n), '10.8 evaluation declares the global ' + n);
  const unexpected = Object.getOwnPropertyNames(ctx).filter((k) => declared.indexOf(k) < 0 && AMBIENT.indexOf(k) < 0);
  deepEq(unexpected, [], '10.9 ' + MODULE_REL[owner] + ' declares EXACTLY its expected globals and nothing else');
}
// the transport module's two globals are async functions, and nothing else
{
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(TRANSPORT_SRC, ctx, { filename: TRANSPORT_REL });
  eq(typeof ctx.pessGetStreamerSymbols, 'function', '10.10 pessGetStreamerSymbols is a function after evaluation');
  eq(typeof ctx.pessRunDXLink, 'function', '10.11 pessRunDXLink is a function after evaluation');
  eq(ctx.pessGetStreamerSymbols.constructor.name, 'AsyncFunction', '10.12 …and pessGetStreamerSymbols is an AsyncFunction');
  eq(ctx.pessRunDXLink.constructor.name, 'AsyncFunction', '10.13 …and pessRunDXLink is an AsyncFunction');
  eq(ctx.pessGetStreamerSymbols.length, 3, '10.14 pessGetStreamerSymbols declares 3 parameters');
  eq(ctx.pessRunDXLink.length, 3, '10.15 pessRunDXLink declares 3 parameters');
  deepEq(Object.getOwnPropertyNames(ctx).sort(), ['pessGetStreamerSymbols', 'pessRunDXLink'],
    '10.16 evaluating the transport module creates EXACTLY two globals');
}
note('structural residue 0 chars · evaluation touches 0 ambient globals · transport declares exactly 2 async functions');

// ═════════════════════════════════════════════════════════════════════════════
// §11 BEHAVIOURAL PARITY — BASE vs HEAD, over real fixtures
//
// Byte identity already proves the text did not change. This proves the two
// texts BEHAVE identically when EXECUTED, which is the claim that actually
// matters — and for PR 2 it is the heart of the contract.
//
// THE RULE FOR PR 2:  the function under test is NEVER mocked. The real BASE
// declaration and the real HEAD declaration are both evaluated and both driven
// through the same scripted scenario; only their external COLLABORATORS are
// stubbed (ttCall, WebSocket, the clock, logEv, the status sink). Each run
// produces an ORDERED TRANSCRIPT of every observable action — calls and their
// arguments, socket construction, every protocol frame sent, callbacks
// registered and fired, timers scheduled/cleared/fired, close calls, status
// writes, log lines, and the terminal resolve value or thrown error. BASE and
// HEAD transcripts must be equal, element for element.
//
// The fixtures are derived from the SOURCE's real branches (§17/§18 of the brief
// were followed by reading the implementation first), never invented from the
// function names. Where the source has no such path, no fixture pretends it has.
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

// ── the BASE sources, cut from the real blobs at the real offsets ────────────
const BASE_CONFIG_SRC = PRE_MONO
  ? ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN']
      .map((n) => PRE_MONO.slice(PRE_OFFSET[n], PRE_OFFSET[n] + MANIFEST.find((x) => x[0] === n)[2])).join('\n')
  : null;
const BASE_TRANSPORT_SRC = BASE_MONO
  ? ['pessGetStreamerSymbols', 'pessRunDXLink']
      .map((n) => BASE_MONO.slice(BASE_OFFSET[n], BASE_OFFSET[n] + MANIFEST.find((x) => x[0] === n)[2])).join('\n\n')
  : null;
const HEAD_CTX = loadDecls(CONFIG_SRC, 'head-' + CONFIG_REL);
const BASE_CTX = BASE_CONFIG_SRC ? loadDecls(BASE_CONFIG_SRC, 'base-pess-config.js') : null;
const unNaN = (v) => (v === 'NaN' ? NaN : v);

// ── 11A the four PR-1 declarations, unchanged coverage ───────────────────────
let fixtures = 0, diffs = 0;
for (const f of FIX_IVR) {
  const arg = unNaN(f.in);
  const head = plain(HEAD_CTX.pessIVRRegime(arg));
  deepEq(head, f.out, '11.1 pessIVRRegime(' + JSON.stringify(f.in) + ') matches the BASE-recorded result');
  if (BASE_CTX) { const base = plain(BASE_CTX.pessIVRRegime(arg)); deepEq(head, base, '11.2 pessIVRRegime(' + JSON.stringify(f.in) + ') — HEAD === BASE'); if (JSON.stringify(head) !== JSON.stringify(base)) diffs++; }
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
  if (BASE_CTX) { const base = BASE_CTX.pessRejectCard(f.in[0], f.in[1], f.in[2]); eq(head, base, '11.6 pessRejectCard — HEAD markup === BASE markup'); if (head !== base) diffs++; }
  fixtures++;
}
deepEq(plain(HEAD_CTX.PESS_LIVE_MIN), FIX_LIVE_MIN, '11.7 PESS_LIVE_MIN evaluates to its exact BASE value');
if (BASE_CTX) deepEq(plain(HEAD_CTX.PESS_LIVE_MIN), plain(BASE_CTX.PESS_LIVE_MIN), '11.8 PESS_LIVE_MIN — HEAD value === BASE value');
fixtures++;
deepEq([...new Set(FIX_IVR.map((f) => f.out.label))].sort(),
  ['HIGH — HARD REJECT', 'N/A', 'elevated — penalty', 'favorable', 'neutral / selective'],
  '11.9 the IVR fixtures cover all five regime buckets');
deepEq([...new Set(FIX_EDGE.map((f) => f.out.label))].sort(),
  ['N/A', 'moderate — neutral', 'negative edge (front IV > back IV)', 'small positive — boost', 'very large — earnings priced in'],
  '11.10 the edge fixtures cover all five term-structure buckets');
eq(HEAD_CTX.pessIVRRegime(NaN).label, 'favorable', '11.11 NaN falls through every comparison to the favourable branch — real behaviour, pinned');
eq(HEAD_CTX.pessIVRRegime(70).label, 'elevated — penalty', '11.12 exactly 70 is NOT a hard reject — the threshold is strictly greater-than');
eq(HEAD_CTX.pessIVRRegime(30).label, 'neutral / selective', '11.13 exactly 30 is neutral — that boundary is inclusive');

// ═════════════════════════════════════════════════════════════════════════════
// §11B THE TRANSPORT HARNESS — real functions, stubbed collaborators
//
// Every stub RECORDS into one ordered transcript. Nothing here reimplements the
// function under test; the sandbox supplies only what the monolith would have
// supplied at runtime. The clock is explicit: `setTimeout` never fires by
// itself, so a timeout is something a fixture CAUSES, and a timeout that fires
// when it should not is visible as a transcript difference rather than a hang.
// ═════════════════════════════════════════════════════════════════════════════
function makeTransportHarness(src, filename) {
  const log = [];
  let seq = 0;
  const timers = new Map();
  function FakeWS(url) {
    log.push({ op: 'ws.new', url: url });
    this.sent = []; this.closed = 0;
    FakeWS.last = this;
    if (FakeWS.throwOnConstruct) { log.push({ op: 'ws.new.threw' }); throw new Error('ws ctor failed'); }
  }
  FakeWS.prototype.send = function (p) { log.push({ op: 'ws.send', payload: p }); this.sent.push(p); };
  FakeWS.prototype.close = function () { log.push({ op: 'ws.close' }); this.closed++; };
  const ctx = {
    ttCall: function (p) { log.push({ op: 'ttCall', path: p }); return ctx.__ttCall(p); },
    WebSocket: FakeWS,
    setTimeout: function (fn, ms) { const id = ++seq; log.push({ op: 'setTimeout', ms: ms, id: id }); timers.set(id, fn); return id; },
    clearTimeout: function (id) { log.push({ op: 'clearTimeout', id: id }); timers.delete(id); },
    PESS_LIVE_MIN: ['bidPrice', 'askPrice', 'delta'],
    logEv: function (a, b, c) { log.push({ op: 'logEv', args: [a, b, c] }); },
    JSON: JSON, Object: Object, Promise: Promise, Math: Math, Error: Error,
    encodeURIComponent: encodeURIComponent, Array: Array, Number: Number, String: String, Boolean: Boolean,
    __ttCall: null,
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: filename });
  return {
    ctx: ctx, log: log, FakeWS: FakeWS,
    liveTimers: () => [...timers.keys()],
    fireTimer: (id) => { const f = timers.get(id); if (f) { timers.delete(id); log.push({ op: 'timer.fire', id: id }); f(); } },
    statusSink: () => ({
      set textContent(v) { log.push({ op: 'status.textContent', v: v }); },
      set innerHTML(v) { log.push({ op: 'status.innerHTML', v: v }); },
    }),
  };
}
const tick = () => new Promise((r) => setImmediate(r));
const settle = async (n) => { for (let i = 0; i < (n || 8); i++) await tick(); };

async function runGetStreamerSymbols(src, filename, scn) {
  const H = makeTransportHarness(src, filename);
  H.ctx.__ttCall = scn.ttCall;
  try {
    const v = await H.ctx.pessGetStreamerSymbols(scn.ticker, scn.chain, scn.ts);
    H.log.push({ op: 'RESOLVE', value: plain(v) });
  } catch (e) {
    H.log.push({ op: 'THROW', name: e && e.name, message: String(e && e.message) });
  }
  return H.log;
}
// The returned promise is NEVER awaited directly. pessRunDXLink settles only on
// a socket event or the timer, so a fixture that drives neither would hang the
// whole suite — and an unsettled promise with an empty event loop makes node
// exit 0 in silence, which is the worst possible failure mode for a contract.
// Instead the outcome is latched and inspected after the scripted scenario has
// run; a fixture that fails to terminate records DID_NOT_SETTLE and is caught by
// the termination assertion in §11D rather than disappearing.
async function runDXLink(src, filename, scn) {
  const H = makeTransportHarness(src, filename);
  H.ctx.__ttCall = scn.ttCall;
  if (scn.wsThrows) H.FakeWS.throwOnConstruct = true;
  const st = scn.statusEl === false ? null : H.statusSink();
  let outcome = null;
  H.ctx.pessRunDXLink(scn.ticker, scn.syms, st).then(
    (v) => { outcome = { op: 'RESOLVE', value: plain(v) }; },
    (e) => { outcome = { op: 'THROW', name: e && e.name, message: String(e && e.message) }; });
  await settle();
  if (scn.drive) await scn.drive(H, tick);
  await settle(16);
  H.log.push(outcome || { op: 'DID_NOT_SETTLE' });
  H.log.push({ op: 'TIMERS_LEFT_ARMED', ids: H.liveTimers() });
  H.log.push({ op: 'SOCKET_CLOSED_TIMES', n: H.FakeWS.last ? H.FakeWS.last.closed : 0 });
  return H.log;
}

// ── the scenarios, every one traced to a real branch of the real source ──────
const CHAIN_EMBEDDED = {
  frontExp: { shortCall: { strike: 100, streamerSymbol: '.FSC' }, shortPut: { strike: 95, streamerSymbol: '.FSP' } },
  backExp: { longCall: { strike: 100, streamerSymbol: '.BLC' }, longPut: { strike: 95, streamerSymbol: '.BLP' } },
};
const CHAIN_BARE = { frontExp: { shortCall: { strike: 100 }, shortPut: { strike: 95 } }, backExp: { longCall: { strike: 100 }, longPut: { strike: 95 } } };
const CHAIN_PARTIAL = {
  frontExp: { shortCall: { strike: 100, streamerSymbol: '.FSC' }, shortPut: { strike: 95 } },
  backExp: { longCall: { strike: 100 }, longPut: { strike: 95 } },
};
const TS = { frontExpiration: '2026-09-18', backExpiration: '2026-10-16' };
const mkChain = (arr) => ({ strikes: arr.map((s) => ({ strike: s, callStreamer: '.C' + s, putStreamer: '.P' + s })) });
const isFront = (p) => p.indexOf('2026-09-18') >= 0;

const GS_FIXTURES = [
  ['all four symbols already embedded → early return, ZERO network',
    { ticker: 'AAPL', chain: CHAIN_EMBEDDED, ts: TS, ttCall: async () => { throw new Error('MUST NOT BE CALLED'); } }],
  ['nothing embedded → both chains fetched, exact strike match',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async () => mkChain([90, 95, 100, 105]) }],
  ['partial embedding → only the missing legs are resolved',
    { ticker: 'AAPL', chain: CHAIN_PARTIAL, ts: TS, ttCall: async () => mkChain([95, 100]) }],
  ['front chain request rejects → STREAMER_SYMBOL_MISSING front, reason appended',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => { if (isFront(p)) throw new Error('boom-front'); return mkChain([95, 100]); } }],
  ['back chain request rejects → STREAMER_SYMBOL_MISSING back',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => { if (!isFront(p)) throw new Error('boom-back'); return mkChain([95, 100]); } }],
  ['both requests reject → front error wins, BOTH reasons appended',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async () => { throw new Error('down'); } }],
  ['front response has no strikes property → STREAMER_SYMBOL_MISSING front',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => (isFront(p) ? {} : mkChain([95, 100])) }],
  ['back response has no strikes property → STREAMER_SYMBOL_MISSING back',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => (isFront(p) ? mkChain([95, 100]) : {}) }],
  ['front response null → STREAMER_SYMBOL_MISSING front',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => (isFront(p) ? null : mkChain([95, 100])) }],
  ['ttCall throws SYNCHRONOUSLY → the try/catch fetchErr path',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: () => { throw new Error('sync-blowup'); } }],
  ['front nearest within $0.50 is accepted (tick rounding)',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => (isFront(p) ? mkChain([94.6, 100.4]) : mkChain([95, 100])) }],
  ['front nearest BEYOND $0.50 → CHAIN_MAPPING_FAILED naming the front legs',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => (isFront(p) ? mkChain([80, 120]) : mkChain([95, 100])) }],
  ['back strike beyond max($2.50, 2.5%) → CHAIN_MAPPING_FAILED naming the back legs',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async (p) => (isFront(p) ? mkChain([95, 100]) : mkChain([50])) }],
  ['back strike within the 2.5% band on a HIGH strike → accepted',
    { ticker: 'AAPL', chain: { frontExp: { shortCall: { strike: 1000 }, shortPut: { strike: 950 } }, backExp: { longCall: {}, longPut: {} } },
      ts: TS, ttCall: async (p) => (isFront(p) ? mkChain([950, 1000]) : mkChain([930, 1020])) }],
  ['all four legs unmappable → CHAIN_MAPPING_FAILED lists all four',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async () => mkChain([1]) }],
  ['call and put streamers are selected from the right field',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async () => mkChain([95, 100]) }],
];

const SYMS = { frontShortCall: 'S1', frontShortPut: 'S2', backLongCall: 'S3', backLongPut: 'S4' };
const quoteFor = (s, bid, ask) => ({ eventSymbol: s, type: 'Quote', bidPrice: bid, askPrice: ask });
const greeksFor = (s, d) => ({ eventSymbol: s, type: 'Greeks', delta: d, gamma: 0.01, theta: -0.05, vega: 0.2, volatility: 0.45 });
const fullFor = (s) => [quoteFor(s, 1.234567, 1.5), greeksFor(s, 0.3)];
const TOKEN_OK = async () => ({ token: 'TOK', dxlinkUrl: 'wss://custom.example/realtime' });
const TOKEN_NO_URL = async () => ({ token: 'TOK' });
const handshake = async (H, t) => {
  const ws = H.FakeWS.last;
  ws.onopen(); await t();
  ws.onmessage({ data: JSON.stringify({ type: 'SETUP' }) }); await t();
  ws.onmessage({ data: JSON.stringify({ type: 'AUTH_STATE', state: 'AUTHORIZED' }) }); await t();
  ws.onmessage({ data: JSON.stringify({ type: 'CHANNEL_OPENED', channel: 1 }) }); await t();
  return ws;
};
const feed = (ws, data) => ws.onmessage({ data: JSON.stringify({ type: 'FEED_DATA', channel: 1, data: data }) });

const DX_FIXTURES = [
  ['/quote-token resolves without a token → LIVE_DATA_UNAVAILABLE, no socket',
    { ticker: 'AAPL', syms: SYMS, ttCall: async () => ({}) }],
  ['/quote-token resolves null → LIVE_DATA_UNAVAILABLE, no socket',
    { ticker: 'AAPL', syms: SYMS, ttCall: async () => null }],
  ['/quote-token rejects → the rejection propagates unchanged',
    { ticker: 'AAPL', syms: SYMS, ttCall: async () => { throw new Error('token endpoint down'); } }],
  ['every streamer symbol null → STREAMER_SYMBOL_MISSING, no socket, no timer',
    { ticker: 'AAPL', syms: { frontShortCall: null, frontShortPut: null, backLongCall: null, backLongPut: null }, ttCall: TOKEN_OK }],
  ['full 4/4 collection → resolve, timer cleared, socket closed, logEv emitted',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S2', 'S3', 'S4'].map(fullFor))); await t(); } }],
  ['no dxlinkUrl in the token response → the hard-coded dxfeed URL is used',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_NO_URL, drive: async (H, t) => { await handshake(H, t); H.fireTimer(1); await t(); } }],
  ['statusEl omitted (null) → identical transport, zero status writes',
    { ticker: 'AAPL', syms: SYMS, statusEl: false, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S2', 'S3', 'S4'].map(fullFor))); await t(); } }],
  ['timeout with ZERO data → LIVE_DATA_UNAVAILABLE 0/4, socket closed',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { await handshake(H, t); H.fireTimer(1); await t(); } }],
  ['timeout with PARTIAL data → NO_VALID_LIVE_LEGS naming the missing fields',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, fullFor('S1')); await t(); H.fireTimer(1); await t(); } }],
  ['WebSocket constructor throws → timer cleared, resolve(null), no close',
    { ticker: 'AAPL', syms: SYMS, wsThrows: true, ttCall: TOKEN_OK }],
  ['onerror with no data → timer cleared, socket closed, LIVE_DATA_UNAVAILABLE',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); ws.onerror(); await t(); } }],
  ['onerror with partial data → the partial map is returned, then rejected downstream',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, fullFor('S1')); await t(); ws.onerror(); await t(); } }],
  ['onclose before completion → timer cleared, NO extra close call',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); ws.onclose(); await t(); } }],
  ['malformed JSON frame is ignored, then the run still succeeds',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { H.FakeWS.last.onmessage({ data: '{{{not json' }); await t(); const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S2', 'S3', 'S4'].map(fullFor))); await t(); } }],
  ['a null JSON frame is ignored',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); ws.onmessage({ data: 'null' }); await t(); H.fireTimer(1); await t(); } }],
  ['KEEPALIVE is echoed on channel 0',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); ws.onmessage({ data: JSON.stringify({ type: 'KEEPALIVE' }) }); await t(); H.fireTimer(1); await t(); } }],
  ['FEED_DATA on the WRONG channel is ignored',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); ws.onmessage({ data: JSON.stringify({ type: 'FEED_DATA', channel: 7, data: [].concat(...['S1', 'S2', 'S3', 'S4'].map(fullFor)) }) }); await t(); H.fireTimer(1); await t(); } }],
  ['an event with no eventSymbol is skipped',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [{ type: 'Quote', bidPrice: 1 }]); await t(); H.fireTimer(1); await t(); } }],
  ['an IRRELEVANT symbol is recorded but never completes the run',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, fullFor('NOPE')); await t(); H.fireTimer(1); await t(); } }],
  ['DUPLICATE events for the same symbol → last value wins',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [quoteFor('S1', 1, 2)]); await t(); feed(ws, [quoteFor('S1', 9, 8)]); await t(); H.fireTimer(1); await t(); } }],
  ['Quote-only legs never complete: no delta, and no `source` stamp',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, ['S1', 'S2', 'S3', 'S4'].map((s) => quoteFor(s, 1.1, 1.2))); await t(); H.fireTimer(1); await t(); } }],
  ['bid + delta but NO ask → the run COMPLETES, then fails the min-field gate',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S2', 'S3', 'S4'].map((s) => [quoteFor(s, 1.1, undefined), greeksFor(s, 0.3)]))); await t(); } }],
  ['arrival order A: legs delivered one frame at a time, completing on the last',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); for (const s of ['S1', 'S2', 'S3', 'S4']) { feed(ws, fullFor(s)); await t(); } } }],
  ['arrival order B: the SAME legs in reverse order produce the same outcome',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); for (const s of ['S4', 'S3', 'S2', 'S1']) { feed(ws, fullFor(s)); await t(); } } }],
  ['three of four legs complete → still waiting, then times out',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S2', 'S3'].map(fullFor))); await t(); H.fireTimer(1); await t(); } }],
  ['a partially-null symbol set subscribes only the non-null legs',
    { ticker: 'AAPL', syms: { frontShortCall: 'S1', frontShortPut: null, backLongCall: 'S3', backLongPut: null }, ttCall: TOKEN_OK,
      drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S3'].map(fullFor))); await t(); } }],
  ['events arriving AFTER resolution are inert — no second resolve, no second close',
    { ticker: 'AAPL', syms: SYMS, ttCall: TOKEN_OK, drive: async (H, t) => { const ws = await handshake(H, t); feed(ws, [].concat(...['S1', 'S2', 'S3', 'S4'].map(fullFor))); await t(); feed(ws, fullFor('S1')); await t(); ws.onerror(); await t(); ws.onclose(); await t(); } }],
];

// Everything below needs `await`: the transport parity, and the mutation proof
// that re-runs it. Node's top-level `await` is not available in a CommonJS test,
// so the remainder of the contract runs inside main() and the process exit code
// is driven by it.
async function main() {

// ── 11C pessGetStreamerSymbols — BASE vs HEAD over every real branch ─────────
let asyncFixtures = 0, asyncDiffs = 0;
const gsHeadLogs = [];
for (const [label, scn] of GS_FIXTURES) {
  const head = await runGetStreamerSymbols(TRANSPORT_SRC, 'head-transport.js', scn);
  gsHeadLogs.push(head);
  ok(head.some((e) => e.op === 'RESOLVE' || e.op === 'THROW'), '11.14 pessGetStreamerSymbols terminates: ' + label);
  if (BASE_TRANSPORT_SRC) {
    const base = await runGetStreamerSymbols(BASE_TRANSPORT_SRC, 'base-transport.js', scn);
    deepEq(head, base, '11.15 TRANSCRIPT PARITY — pessGetStreamerSymbols: ' + label);
    if (JSON.stringify(head) !== JSON.stringify(base)) asyncDiffs++;
  }
  asyncFixtures++;
}
// the branch outcomes are what the source says, not what the name suggests
{
  const outcome = (i) => gsHeadLogs[i].find((e) => e.op === 'RESOLVE' || e.op === 'THROW');
  const calls = (i) => gsHeadLogs[i].filter((e) => e.op === 'ttCall').map((e) => e.path);
  deepEq(calls(0), [], '11.16 the embedded-symbol path issues NO network call at all');
  deepEq(outcome(0).value, { frontShortCall: '.FSC', frontShortPut: '.FSP', backLongCall: '.BLC', backLongPut: '.BLP' },
    '11.17 …and returns the embedded symbols verbatim');
  deepEq(calls(1), ['/eic/chain-symbols/AAPL?expiration=2026-09-18', '/eic/chain-symbols/AAPL?expiration=2026-10-16'],
    '11.18 the fallback path calls /eic/chain-symbols for FRONT then BACK, expiration URL-encoded');
  deepEq(outcome(1).value, { frontShortCall: '.C100', frontShortPut: '.P95', backLongCall: '.C100', backLongPut: '.P95' },
    '11.19 …and picks callStreamer for calls and putStreamer for puts');
  ok(/^STREAMER_SYMBOL_MISSING: front expiration \(2026-09-18\)/.test(outcome(3).message),
    '11.20 a rejected FRONT request throws STREAMER_SYMBOL_MISSING for the front expiration');
  ok(/front:boom-front/.test(outcome(3).message), '11.21 …with the underlying reason appended verbatim');
  ok(/^STREAMER_SYMBOL_MISSING: back expiration \(2026-10-16\)/.test(outcome(4).message),
    '11.22 a rejected BACK request throws STREAMER_SYMBOL_MISSING for the back expiration');
  ok(/front:down back:down/.test(outcome(5).message), '11.23 when both reject, BOTH reasons are appended and the FRONT error wins');
  ok(/sync-blowup/.test(outcome(9).message), '11.24 a SYNCHRONOUS ttCall throw is caught and folded into fetchErr');
  deepEq(outcome(10).value, { frontShortCall: '.C100.4', frontShortPut: '.P94.6', backLongCall: '.C100', backLongPut: '.P95' },
    '11.25 a front strike within $0.50 is accepted as the nearest match');
  ok(/^CHAIN_MAPPING_FAILED/.test(outcome(11).message) && /front-SC\(\$100\)/.test(outcome(11).message),
    '11.26 a front strike beyond $0.50 fails CHAIN_MAPPING_FAILED, naming the front leg');
  ok(/back-LC\(target \$100 maxDist \$2\.50\)/.test(outcome(12).message),
    '11.27 a back strike beyond max($2.50, 2.5%) fails, quoting the FRONT strike as the target');
  deepEq(outcome(13).value, { frontShortCall: '.C1000', frontShortPut: '.P950', backLongCall: '.C1020', backLongPut: '.P930' },
    '11.28 on a $1000 strike the 2.5% band (=$25) admits a $20 gap — the percentage term is live');
  ok(/front-SC/.test(outcome(14).message) && /front-SP/.test(outcome(14).message) &&
     /back-LC/.test(outcome(14).message) && /back-LP/.test(outcome(14).message),
    '11.29 when all four legs are unmappable, all four are named in the error');
}

// ── 11D pessRunDXLink — BASE vs HEAD, full resource lifecycle ────────────────
const dxHeadLogs = [];
for (const [label, scn] of DX_FIXTURES) {
  const head = await runDXLink(TRANSPORT_SRC, 'head-transport.js', scn);
  dxHeadLogs.push(head);
  ok(head.some((e) => e.op === 'RESOLVE' || e.op === 'THROW'), '11.30 pessRunDXLink terminates: ' + label);
  if (BASE_TRANSPORT_SRC) {
    const base = await runDXLink(BASE_TRANSPORT_SRC, 'base-transport.js', scn);
    deepEq(head, base, '11.31 TRANSCRIPT PARITY — pessRunDXLink: ' + label);
    if (JSON.stringify(head) !== JSON.stringify(base)) asyncDiffs++;
  }
  asyncFixtures++;
}
eq(asyncDiffs, 0, '11.32 ZERO BASE-vs-HEAD transcript differences across every async fixture');

// ── 11E the lifecycle facts those transcripts contain ───────────────────────
{
  const L_ = (i) => dxHeadLogs[i];
  const ops = (i) => L_(i).map((e) => e.op);
  const find = (i, op) => L_(i).filter((e) => e.op === op);
  const outcome = (i) => L_(i).find((e) => e.op === 'RESOLVE' || e.op === 'THROW');
  const armed = (i) => L_(i).find((e) => e.op === 'TIMERS_LEFT_ARMED').ids;
  const closes = (i) => L_(i).find((e) => e.op === 'SOCKET_CLOSED_TIMES').n;

  // no-token paths never reach the socket
  eq(ops(0).indexOf('ws.new'), -1, '11.33 a missing token never constructs a socket');
  eq(ops(0).indexOf('setTimeout'), -1, '11.34 …and never arms a timer');
  eq(outcome(0).message, 'LIVE_DATA_UNAVAILABLE: /quote-token failed for AAPL', '11.35 …it throws the exact fail-closed message');
  eq(outcome(1).message, 'LIVE_DATA_UNAVAILABLE: /quote-token failed for AAPL', '11.36 a null token response throws identically');
  eq(outcome(2).message, 'token endpoint down', '11.37 a REJECTED /quote-token propagates unchanged — it is not wrapped');
  eq(outcome(3).message, 'STREAMER_SYMBOL_MISSING: all streamer symbols are null for AAPL', '11.38 an all-null symbol set throws before any socket work');
  eq(ops(3).indexOf('ws.new'), -1, '11.39 …and constructs no socket');

  // the happy path
  eq(find(4, 'setTimeout').length, 1, '11.40 the success path arms exactly ONE timer…');
  eq(find(4, 'setTimeout')[0].ms, 9000, '11.41 …with a 9,000 ms delay');
  eq(find(4, 'clearTimeout').length, 1, '11.42 …clears it exactly once');
  deepEq(armed(4), [], '11.43 …leaves NO timer armed');
  eq(closes(4), 1, '11.44 …and closes the socket exactly once');
  eq(find(4, 'ws.new')[0].url, 'wss://custom.example/realtime', '11.45 the token response dxlinkUrl is used when present');
  eq(find(5, 'ws.new')[0].url, 'wss://tasty-openapi-ws.dxfeed.com/realtime', '11.46 …and the hard-coded dxfeed URL when it is absent');
  eq(find(4, 'logEv').length, 1, '11.47 the success path emits exactly one logEv line');
  deepEq(find(4, 'logEv')[0].args, ['pess', 'PESS DXLink AAPL: 4/4 legs live bid/ask/delta/greeks', 'ok'], '11.48 …with its exact arguments');
  deepEq(outcome(4).value.frontShortCall,
    { streamerSymbol: 'S1', bidPrice: 1.2346, askPrice: 1.5, delta: 0.3, gamma: 0.01, theta: -0.05, vega: 0.2, volatility: 45, source: 'dxlink_realtime' },
    '11.49 the resolved leg carries the exact rounding: bid 4dp, gamma 6dp, volatility ×100 at 2dp');

  // the protocol, in order
  const sends = find(4, 'ws.send').map((e) => JSON.parse(e.payload));
  deepEq(sends.map((s) => s.type), ['SETUP', 'AUTH', 'CHANNEL_REQUEST', 'FEED_SETUP', 'FEED_SUBSCRIPTION'],
    '11.50 the protocol frames are sent in exactly this order');
  deepEq(sends[0], { type: 'SETUP', channel: 0, version: '0.1', keepaliveTimeout: 60, acceptKeepaliveTimeout: 60 }, '11.51 SETUP is byte-for-byte the base frame');
  deepEq(sends[1], { type: 'AUTH', channel: 0, token: 'TOK' }, '11.52 AUTH carries the token from /quote-token, on channel 0');
  deepEq(sends[2], { type: 'CHANNEL_REQUEST', channel: 1, service: 'FEED', parameters: { contract: 'AUTO' } }, '11.53 CHANNEL_REQUEST opens channel 1 with contract AUTO');
  deepEq(sends[3].acceptEventFields, { Quote: ['eventSymbol', 'bidPrice', 'askPrice'], Greeks: ['eventSymbol', 'delta', 'gamma', 'theta', 'vega', 'volatility'] },
    '11.54 FEED_SETUP requests exactly these Quote and Greeks fields, in this order');
  eq(sends[3].acceptDataFormat, 'FULL', '11.55 …in FULL data format');
  eq(sends[3].acceptAggregationPeriod, 10, '11.56 …with aggregation period 10');
  deepEq(sends[4].add, ['S1', 'S2', 'S3', 'S4'].reduce((a, s) => a.concat([{ type: 'Quote', symbol: s }, { type: 'Greeks', symbol: s }]), []),
    '11.57 FEED_SUBSCRIPTION adds Quote+Greeks per symbol, in leg order — 8 subscriptions for 4 legs');
  eq(sends[4].channel, 1, '11.58 …on channel 1');

  // status writes
  const st4 = L_(4).filter((e) => e.op === 'status.textContent' || e.op === 'status.innerHTML');
  eq(st4.length, 3, '11.59 the success path writes the status sink exactly three times');
  eq(st4[0].v, '◆ DXLink PESS: connecting (4 legs)...', '11.60 …first "connecting"');
  eq(st4[1].v, '◆ DXLink PESS: subscribed — waiting for 4 legs...', '11.61 …then "subscribed", after FEED_SUBSCRIPTION');
  ok(/4\/4 legs live/.test(st4[2].v), '11.62 …then the final innerHTML summary');
  eq(L_(6).filter((e) => String(e.op).indexOf('status.') === 0).length, 0, '11.63 with statusEl null there are ZERO status writes…');
  deepEq(L_(6).filter((e) => e.op !== 'status.textContent' && e.op !== 'status.innerHTML').map((e) => e.op),
    L_(4).filter((e) => e.op !== 'status.textContent' && e.op !== 'status.innerHTML').map((e) => e.op),
    '11.64 …and the transport sequence is otherwise identical — the DOM writes are cosmetic to the protocol');

  // timeout lifecycle
  eq(find(7, 'timer.fire').length, 1, '11.65 the timeout path fires the timer…');
  eq(find(7, 'clearTimeout').length, 0, '11.66 …does NOT clearTimeout afterwards (it has already fired)');
  eq(closes(7), 1, '11.67 …closes the socket');
  eq(outcome(7).message, 'LIVE_DATA_UNAVAILABLE: DXLink timeout — 0/4 legs responded for AAPL', '11.68 …and throws the 0/4 message');
  ok(/^NO_VALID_LIVE_LEGS: 1\/4 legs live/.test(outcome(8).message), '11.69 a partial timeout throws NO_VALID_LIVE_LEGS with the live count');
  ok(/frontShortPut\[sym=S2\|missing:bidPrice,askPrice,delta\]/.test(outcome(8).message), '11.70 …naming each bad leg and its missing PESS_LIVE_MIN fields');

  // constructor-failure lifecycle
  eq(find(9, 'clearTimeout').length, 1, '11.71 a WebSocket constructor failure CLEARS the timer…');
  deepEq(armed(9), [], '11.72 …leaving none armed');
  eq(closes(9), 0, '11.73 …and calls no close (there is no socket to close)');

  // error/close lifecycle
  eq(find(10, 'clearTimeout').length, 1, '11.74 onerror clears the timer…');
  eq(closes(10), 1, '11.75 …and closes the socket');
  eq(find(12, 'clearTimeout').length, 1, '11.76 onclose clears the timer…');
  eq(closes(12), 0, '11.77 …and does NOT call close again — the asymmetry is real and preserved');

  // frame filtering
  eq(outcome(16).message, 'LIVE_DATA_UNAVAILABLE: DXLink timeout — 0/4 legs responded for AAPL', '11.78 FEED_DATA on the wrong channel is ignored entirely');
  eq(outcome(17).message, 'LIVE_DATA_UNAVAILABLE: DXLink timeout — 0/4 legs responded for AAPL',
    '11.79 an event without eventSymbol is skipped entirely — `raw` stays empty, so the timeout resolves NULL');
  // An IRRELEVANT symbol is still WRITTEN into `raw`. That makes `raw` non-empty,
  // so the timeout resolves the map instead of null — and the failure is reported
  // by the MIN-FIELD gate rather than the "0/4 responded" branch. Same outcome,
  // different message, entirely because of a symbol nobody asked for. Pinned as
  // measured; this contract does not tidy it.
  eq(outcome(18).message, 'LIVE_DATA_UNAVAILABLE: 0/4 legs returned required fields (bidPrice+askPrice+delta) for AAPL',
    '11.80 an irrelevant symbol never counts as a live leg, but it DOES make `raw` non-empty…');
  ok(outcome(18).message !== outcome(17).message,
    '11.80b …so it changes which fail-closed message is produced — the two 0/4 paths are distinguishable');
  eq(outcome(20).message, 'LIVE_DATA_UNAVAILABLE: 0/4 legs returned required fields (bidPrice+askPrice+delta) for AAPL',
    '11.81 Quote-only legs never satisfy the completion gate — no delta, so the run times out and fails the min-field gate');
  eq(find(20, 'timer.fire').length, 1, '11.82 …the run waits for the timeout instead of resolving early');

  // THE ASYMMETRY: completion needs bid+delta, the min-field gate needs bid+ask+delta
  eq(find(21, 'timer.fire').length, 0, '11.83 bid+delta without ask COMPLETES the socket wait — no timeout fires…');
  eq(find(21, 'clearTimeout').length, 1, '11.84 …the timer is cleared and the socket closed…');
  eq(outcome(21).message, 'LIVE_DATA_UNAVAILABLE: 0/4 legs returned required fields (bidPrice+askPrice+delta) for AAPL',
    '11.85 …and only THEN does the min-field gate reject it. The completion gate and the min-field gate differ, deliberately, and both are pinned.');

  // ordering independence and idempotence
  deepEq(outcome(22).value, outcome(23).value, '11.86 leg arrival ORDER does not change the resolved value');
  eq(find(22, 'clearTimeout').length, 1, '11.87 …and either order clears exactly one timer');
  eq(outcome(24).message.indexOf('NO_VALID_LIVE_LEGS: 3/4 legs live'), 0, '11.88 three of four legs times out at 3/4');
  // A PARTIALLY-null symbol set can never succeed. The subscription list filters
  // nulls out (so the socket only ever asks for real symbols and the completion
  // gate is satisfied), but the MIN-FIELD gate afterwards walks all four leg
  // NAMES unconditionally — so the null legs are always reported as failures.
  // The two filters disagree by design, and the disagreement is what makes this
  // fail closed rather than silently return a two-legged strangle swap.
  {
    const subs = JSON.parse(find(25, 'ws.send')[4].payload).add;
    deepEq(subs.map((s) => s.symbol), ['S1', 'S1', 'S3', 'S3'], '11.89 null legs are filtered OUT of the subscription list…');
    eq(find(25, 'clearTimeout').length, 1, '11.90 …the socket wait COMPLETES on the two real legs, so no timeout fires…');
    eq(closes(25), 1, '11.91 …the socket is closed exactly once…');
    eq(outcome(25).op, 'THROW', '11.92 …and the call nonetheless FAILS CLOSED…');
    eq(outcome(25).message,
      'NO_VALID_LIVE_LEGS: 2/4 legs live — min-field failures: frontShortPut[sym=null|missing:bidPrice,askPrice,delta] | backLongPut[sym=null|missing:bidPrice,askPrice,delta]',
      '11.93 …reporting 2/4 and naming each null leg — a partial symbol set can never resolve');
  }
  eq(closes(26), 1, '11.94 events after resolution cause NO second close…');
  eq(find(26, 'clearTimeout').length, 1, '11.95 …and no second clearTimeout — the `resolved` latch holds');
  eq(find(26, 'logEv').length, 1, '11.96 …and exactly one log line was emitted overall');
}
// every terminating path left no timer armed
for (let i = 0; i < dxHeadLogs.length; i++) {
  deepEq(dxHeadLogs[i].find((e) => e.op === 'TIMERS_LEFT_ARMED').ids, [],
    '11.97 no timer is left armed after: ' + DX_FIXTURES[i][0]);
}
note(fixtures + ' synchronous rule fixtures + ' + asyncFixtures + ' async transport fixtures compared' +
  (BASE_TRANSPORT_SRC ? ' BASE-vs-HEAD directly' : ' against HEAD only (base blob unreachable)') +
  ' — ' + (diffs + asyncDiffs) + ' differences');

// ═════════════════════════════════════════════════════════════════════════════
// §11F INCIDENTAL DEFECTS — found, PINNED, and deliberately NOT fixed
//
// This is a relocation PR. Where the base has a rough edge, HEAD must preserve
// it exactly; the parity contract above is what makes that provable rather than
// promised. Each item below is recorded so a later PR can address it on purpose
// instead of a "tidy-up" changing lifecycle semantics by accident.
// ═════════════════════════════════════════════════════════════════════════════
section('11F. INCIDENTAL DEFECTS (PINNED, NOT FIXED)');
{
  // (a) reduce() with no initial value on a possibly-empty strikes array.
  //     `!frontChain.strikes` passes for `[]`, and the empty-array reduce then
  //     throws a raw TypeError instead of the intended CHAIN_MAPPING_FAILED.
  const log = await runGetStreamerSymbols(TRANSPORT_SRC, 'head-transport.js',
    { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async () => ({ strikes: [] }) });
  const o = log.find((e) => e.op === 'THROW');
  eq(o && o.name, 'TypeError', '11F.1 an EMPTY strikes array throws a raw TypeError, not CHAIN_MAPPING_FAILED — base behaviour, preserved');
  if (BASE_TRANSPORT_SRC) {
    const b = await runGetStreamerSymbols(BASE_TRANSPORT_SRC, 'base-transport.js',
      { ticker: 'AAPL', chain: CHAIN_BARE, ts: TS, ttCall: async () => ({ strikes: [] }) });
    deepEq(log, b, '11F.2 …and HEAD reproduces BASE exactly on that path');
  }
  // (b) no FEED_SUBSCRIPTION remove is ever sent; cleanup is close()-only.
  const dx = spanMasked(LIVE_TRANSPORT, A.mod[LIVE_TRANSPORT].decls.find((d) => d.name === 'pessRunDXLink'));
  eq((dx.match(/remove\s*:/g) || []).length, 0, '11F.3 the base sends NO unsubscribe frame — cleanup is close()-only, and stays that way here');
  // (c) the onerror handler contains a stray empty statement after its catch.
  ok(A.mod[LIVE_TRANSPORT].src.indexOf('try{ws.close();}catch(e){};resolve(') >= 0,
    '11F.4 the stray `;` after the onerror catch block survives verbatim — no cosmetic cleanup');
  note('3 incidental findings recorded and pinned; none repaired in this PR');
}

// ═════════════════════════════════════════════════════════════════════════════
// §12 THE INLINE RATCHET — 9 → 5 → 3, shrink only
// ═════════════════════════════════════════════════════════════════════════════
section('12. INLINE RATCHET');
deepEq(RATCHET, [9, 5, 3], '12.1 the ratchet history is 9 → 5 → 3');
eq(RATCHET[0], TOTAL_DECLS, '12.2 it opened at 9 — the whole family, all inline');
for (let i = 1; i < RATCHET.length; i++) {
  ok(RATCHET[i] < RATCHET[i - 1], '12.3 step ' + i + ': the allowance SHRANK (' + RATCHET[i - 1] + ' → ' + RATCHET[i] + ')');
}
eq(RATCHET_AFTER, PENDING_DECLS, '12.4 …and stands at 3 after PR 2');
eq(A.inlinePess.length, RATCHET_AFTER, '12.5 the real inline PESS population equals the allowance exactly');
ok(A.inlinePess.length <= RATCHET_AFTER, '12.6 it may never exceed the allowance');
for (const n of A.shippedNames) ok(A.inlinePessNames.indexOf(n) < 0, '12.7 ' + n + ' has not been reintroduced inline');
ok(A.inlinePessNames.every((n) => MANIFEST.some((m) => m[0] === n)),
  '12.8 every inline PESS declaration is a KNOWN manifest member — no unowned PESS declaration was added');
for (const n of ['runPESSPanel', 'pessAnalyzeTicker', 'pessAnalyzeAll']) {
  ok(A.inlinePessNames.indexOf(n) >= 0, '12.9 pending declaration ' + n + ' is still present inline — none disappeared prematurely');
}
note('inline PESS allowance 9 → 5 → 3 (floor for this PR); it may only shrink in PR 3–4');

// ═════════════════════════════════════════════════════════════════════════════
// §13 RECONSTRUCTION — the relocation is reversible, to the byte
//
// TWO independent reconstructions:
//   A. PR 2 ALONE — HEAD minus the new tag, plus the two transport spans at the
//      offsets they held in the post-PR-1 base, must equal that base exactly.
//   B. CUMULATIVE — HEAD minus BOTH PESS tags, plus all six shipped spans at
//      their PRE-PESS offsets, must equal the pre-PESS application exactly.
// Both target hashes are read from git independently; neither is derived from
// the reconstruction it checks. Full index.html is compared, not declarations.
// ═════════════════════════════════════════════════════════════════════════════
section('13. RECONSTRUCTION');
function detag(html, tag) {
  const line = tag + '\n';
  if (html.split(line).length - 1 !== 1) return null;
  return html.replace(line, '');
}
function reinsert(html, spans) {
  const inl = L.parseScriptTags(html).filter((t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000);
  if (inl.length !== 1) return null;
  const monoAt = html.indexOf(inl[0].inline);
  let out = html;
  // ASCENDING offset order, and NO running shift. The offsets are positions in
  // the ORIGINAL monolith. Restoring the lowest span first puts every byte below
  // the next span back where it belongs, so by the time span N is inserted the
  // document already matches the original up to that point and span N's original
  // offset is once again the correct insertion point. Adding a shift would
  // double-count the spans already restored.
  for (const s of spans.slice().sort((a, b) => a.off - b.off)) {
    const at = monoAt + s.off;
    out = out.slice(0, at) + s.text + out.slice(at);
  }
  return out;
}
const spanTextOf = (name) => {
  for (const owner of SHIPPED_OWNERS) {
    const d = A.mod[owner].decls.find((x) => x.name === name);
    if (d) return A.mod[owner].src.slice(d.start, d.end);
  }
  return null;
};
// ── A. PR 2 alone ────────────────────────────────────────────────────────────
eq(HTML.split(TRANSPORT_TAG + '\n').length - 1, 1, '13.1 the new transport tag appears exactly once in HEAD');
if (BASE_HTML) {
  eq(sha256(BASE_HTML), BASE_INDEX_SHA256, '13.2 the PR-2 base blob read from git has the recorded SHA-256');
  const detagged = detag(HTML, TRANSPORT_TAG);
  ok(detagged !== null, '13.3 the transport tag line was removed cleanly');
  const outA = reinsert(detagged, MANIFEST.filter((m) => m[3] === LIVE_TRANSPORT)
    .map((m) => ({ off: BASE_OFFSET[m[0]], text: spanTextOf(m[0]) })));
  eq(outA.length, BASE_HTML.length, '13.4 the PR-2 reconstruction has exactly the base length');
  eq(sha256(outA), BASE_INDEX_SHA256, '13.5 HEAD − the tag + the two transport spans === the PR-2 base index.html, BYTE FOR BYTE');
  eq(HTML.length, BASE_HTML.length - TRANSPORT_CHARS + TRANSPORT_TAG.length + 1,
    '13.6 the size delta is exactly −9,127 declaration chars +' + (TRANSPORT_TAG.length + 1) + ' tag chars');
  note('PR2: BASE ' + BASE_HTML.length + ' chars sha ' + BASE_INDEX_SHA256.slice(0, 16) +
    ' | HEAD ' + HTML.length + ' | reconstructed sha ' + sha256(outA).slice(0, 16) + ' — EQUAL');
} else {
  ok(true, '13.5 PR-2 base blob unreachable here — reconstruction skipped; per-span SHA-256 identity still pinned in §5.4');
  note('PR2 RECONSTRUCTION SKIPPED — the base blob is not reachable through git in this checkout');
}
// ── B. cumulative, PR 1 + PR 2 ───────────────────────────────────────────────
if (PRE_HTML) {
  eq(sha256(PRE_HTML), PRE_PESS_INDEX_SHA256, '13.7 the pre-PESS blob read from git has the recorded SHA-256');
  let cum = HTML;
  let tagsRemoved = 0;
  for (const owner of SHIPPED_OWNERS) {
    const next = detag(cum, TAG_OF(MODULE_REL[owner]));
    ok(next !== null, '13.8 the ' + MODULE_REL[owner] + ' tag line was removed cleanly');
    cum = next; tagsRemoved++;
  }
  eq(tagsRemoved, SHIPPED_OWNERS.length, '13.9 both shipped PESS tags were removed — 2 tags');
  const allSpans = MANIFEST.filter((m) => isShipped(m[3])).map((m) => ({ off: PRE_OFFSET[m[0]], text: spanTextOf(m[0]) }));
  eq(allSpans.length, SHIPPED_DECLS, '13.10 six shipped spans are restored');
  eq(allSpans.reduce((a, s) => a + s.text.length, 0), SHIPPED_CHARS, '13.11 …totalling 10,913 declaration chars');
  const outB = reinsert(cum, allSpans);
  eq(outB.length, PRE_HTML.length, '13.12 the cumulative reconstruction has exactly the pre-PESS length');
  eq(sha256(outB), PRE_PESS_INDEX_SHA256,
    '13.13 HEAD − both tags + all six spans === the PRE-PESS index.html, BYTE FOR BYTE');
  note('CUMULATIVE: 6 spans / 10,913 chars / 2 tags restored → pre-PESS ' + PRE_HTML.length +
    ' chars sha ' + PRE_PESS_INDEX_SHA256.slice(0, 16) + ' — EQUAL');
} else {
  ok(true, '13.13 pre-PESS blob unreachable here — cumulative reconstruction skipped');
  note('CUMULATIVE RECONSTRUCTION SKIPPED — the pre-PESS blob is not reachable through git in this checkout');
}

// ═════════════════════════════════════════════════════════════════════════════
// §14 MUTATION PROOF
//
// A contract that only agrees with itself proves nothing. Every mutant below is
// an IN-MEMORY change to the inputs, and the SAME guards that ran above are
// re-run against it. Each must break at least one. The TRANSPORT category is new
// in PR 2 and mutates real, mechanically-discovered protocol operations — an
// omitted subscription, a moved timeout, a swallowed error, a completion
// condition loosened by one event.
// ═════════════════════════════════════════════════════════════════════════════
section('14. MUTATION PROOF');

const MODULE_TEXT = {};
for (const owner of SHIPPED_OWNERS) {
  MODULE_TEXT[owner] = { header: A.mod[owner].src.slice(0, A.mod[owner].decls[0].start), decls: {} };
  for (const d of A.mod[owner].decls) MODULE_TEXT[owner].decls[d.name] = A.mod[owner].src.slice(d.start, d.end);
}
const textOf = (owner, n) => MODULE_TEXT[owner].decls[n];
const mkModule = (owner, parts) => MODULE_TEXT[owner].header +
  parts.map((n) => (MODULE_TEXT[owner].decls[n] !== undefined ? MODULE_TEXT[owner].decls[n] : n)).join('\n\n') + '\n';
const CFG_T = ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'];
const TRN_T = ['pessGetStreamerSymbols', 'pessRunDXLink'];
const inlineText = (n) => { const d = A.inlineDecls.find((x) => x.name === n); return A.mono.slice(d.start, d.end); };
const swap = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'mutant setup: needle absent — ' + a.slice(0, 60)); return s.slice(0, i) + b + s.slice(i + a.length); };

const GUARDS = [
  ['mask-length-preserving', (r) => r.maskLenOk === true],
  ['config-decl-count', (r) => r.mod[CONFIG_RULES].count === CONFIG_DECLS],
  ['transport-decl-count', (r) => r.mod[LIVE_TRANSPORT].count === TRANSPORT_DECLS],
  ['config-order', (r) => JSON.stringify(r.mod[CONFIG_RULES].names) === JSON.stringify(CFG_T)],
  ['transport-order', (r) => JSON.stringify(r.mod[LIVE_TRANSPORT].names) === JSON.stringify(TRN_T)],
  ['config-chars', (r) => r.mod[CONFIG_RULES].chars === CONFIG_CHARS],
  ['transport-chars', (r) => r.mod[LIVE_TRANSPORT].chars === TRANSPORT_CHARS],
  ['shipped-chars', (r) => r.moduleChars === SHIPPED_CHARS],
  ['span-sha', (r) => SHIPPED_OWNERS.every((o) => r.mod[o].decls.every((d) => sha256(r.mod[o].src.slice(d.start, d.end)) === SPAN_SHA256[d.name]))],
  ['async-form', (r) => r.mod[LIVE_TRANSPORT].decls.every((d) => d.isAsync && d.bindingForm === 'function')],
  ['binding-forms', (r) => r.mod[CONFIG_RULES].decls.filter((d) => d.bindingForm === 'var').length === 1 && r.mod[CONFIG_RULES].decls.filter((d) => d.bindingForm === 'function').length === 3],
  ['signatures', (r) => SHIPPED_OWNERS.every((o) => r.mod[o].decls.every((d) => { const m = MANIFEST.find((x) => x[0] === d.name); return m && d.signature === m[4]; }))],
  ['inline-count', (r) => r.inlinePess.length === PENDING_DECLS],
  ['inline-chars', (r) => r.inlinePessChars === PENDING_CHARS],
  ['inline-names', (r) => JSON.stringify(r.inlinePessNames) === JSON.stringify(['runPESSPanel', 'pessAnalyzeTicker', 'pessAnalyzeAll'])],
  ['no-shipped-inline', (r) => r.shippedNames.every((n) => r.inlinePessNames.indexOf(n) < 0)],
  ['no-pending-early', (r) => r.pendingNames.every((n) => r.allModuleNames.indexOf(n) < 0)],
  ['no-duplicate', (r) => new Set(r.allModuleNames.concat(r.inlinePessNames)).size === TOTAL_DECLS],
  ['totals', (r) => r.moduleChars + r.inlinePessChars === TOTAL_CHARS],
  ['purity-residue', (r) => r.residueTotal === 0],
  ['one-live-min', (r) => {
    const lit = /\[\s*'bidPrice'\s*,\s*'askPrice'\s*,\s*'delta'\s*\]/g;
    return SHIPPED_OWNERS.reduce((a, o) => a + (r.mod[o].src.match(lit) || []).length, 0) +
           (r.mono.match(lit) || []).length === 1;
  }],
  ['live-min-not-in-transport', (r) => r.mod[LIVE_TRANSPORT].names.indexOf('PESS_LIVE_MIN') < 0],
  ['no-foreign-state-in-transport', (r) => !/\bS\.[A-Za-z_$][\w$]*\s*=(?!=)/.test(maskSource(r.mod[LIVE_TRANSPORT].src))],
  ['no-dom-lookup-in-transport', (r) => !/document\.|getElementById|querySelector/.test(maskSource(r.mod[LIVE_TRANSPORT].src))],
  ['tag-once', (r) => SHIPPED_OWNERS.every((o) => r.tagCount[o] === 1)],
  ['tag-before-monolith', (r) => SHIPPED_OWNERS.every((o) => r.tagIndex[o] >= 0 && r.tagIndex[o] < r.monoTagIndex)],
  ['tag-classic', (r) => SHIPPED_OWNERS.every((o) => r.tagObj[o] !== null && !/\bdefer\b/i.test(r.tagObj[o].attrs) && !/\basync\b/i.test(r.tagObj[o].attrs) && !/\btype\s*=/i.test(r.tagObj[o].attrs))],
  ['pess-region-contiguous', (r) => r.localSrcs.indexOf('./' + TRANSPORT_REL) === r.localSrcs.indexOf('./' + CONFIG_REL) + 1],
  ['local-script-count', (r) => r.localSrcs.length === LOCAL_SCRIPT_COUNT],
  ['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 1] === './js/ui/backend-directional-snapshot-panel.js'],
  ['config-slot', (r) => r.localSrcs.indexOf('./' + CONFIG_REL) === 5],
  ['ratchet', (r) => r.inlinePess.length === RATCHET_AFTER],
];
const BEHAVIOUR_GUARDS = [
  ['ivr-transcript', (c) => FIX_IVR.every((f) => JSON.stringify(plain(c.pessIVRRegime(unNaN(f.in)))) === JSON.stringify(f.out))],
  ['edge-transcript', (c) => FIX_EDGE.every((f) => JSON.stringify(plain(c.pessIVEdge(f.in[0], f.in[1]))) === JSON.stringify(f.out))],
  ['card-transcript', (c) => FIX_CARD.every((f) => c.pessRejectCard(f.in[0], f.in[1], f.in[2]) === f.out)],
  ['live-min-value', (c) => JSON.stringify(plain(c.PESS_LIVE_MIN)) === JSON.stringify(FIX_LIVE_MIN)],
];
function planFacts(manifest) {
  const per = {};
  for (const m of manifest) { per[m[3]] = per[m[3]] || { n: 0, c: 0 }; per[m[3]].n++; per[m[3]].c += m[2]; }
  const shipped = manifest.filter((m) => isShipped(m[3]));
  const pending = manifest.filter((m) => !isShipped(m[3]));
  return {
    total: manifest.length, totalChars: manifest.reduce((a, m) => a + m[2], 0),
    shipped: shipped.length, shippedChars: shipped.reduce((a, m) => a + m[2], 0),
    pending: pending.length, pendingChars: pending.reduce((a, m) => a + m[2], 0),
    transport: (per[LIVE_TRANSPORT] || { n: 0 }).n, transportChars: (per[LIVE_TRANSPORT] || { c: 0 }).c,
    config: (per[CONFIG_RULES] || { n: 0 }).n, configChars: (per[CONFIG_RULES] || { c: 0 }).c,
    ratchetAfter: pending.length,
  };
}
const PLAN_GUARDS = [
  ['plan-total', (p) => p.total === TOTAL_DECLS && p.totalChars === TOTAL_CHARS],
  ['plan-shipped', (p) => p.shipped === SHIPPED_DECLS && p.shippedChars === SHIPPED_CHARS],
  ['plan-pending', (p) => p.pending === PENDING_DECLS && p.pendingChars === PENDING_CHARS],
  ['plan-config', (p) => p.config === CONFIG_DECLS && p.configChars === CONFIG_CHARS],
  ['plan-transport', (p) => p.transport === TRANSPORT_DECLS && p.transportChars === TRANSPORT_CHARS],
  ['plan-ratchet', (p) => p.ratchetAfter === RATCHET_AFTER && p.ratchetAfter < RATCHET[RATCHET.length - 2]],
];

function runGuards(html, mods) {
  let r;
  try { r = analyze({ html: html, modules: mods, manifest: MANIFEST }); } catch (e) { return ['threw:' + String(e.message).slice(0, 40)]; }
  if (r.fatal) return ['fatal:' + r.fatal];
  const broken = [];
  for (const [n, g] of GUARDS) { let v; try { v = g(r); } catch (_) { v = false; } if (!v) broken.push(n); }
  let ctx = null;
  try { ctx = {}; vm.createContext(ctx); vm.runInContext(mods[CONFIG_RULES], ctx, { filename: 'mutant-config.js' }); }
  catch (e) { broken.push('config-does-not-evaluate'); ctx = null; }
  if (ctx) for (const [n, g] of BEHAVIOUR_GUARDS) { let v; try { v = g(ctx); } catch (_) { v = false; } if (!v) broken.push(n); }
  try { const c2 = {}; vm.createContext(c2); vm.runInContext(mods[LIVE_TRANSPORT], c2, { filename: 'mutant-transport.js' }); }
  catch (e) { broken.push('transport-does-not-evaluate'); }
  return broken;
}
const mods = (overrides) => Object.assign({ [CONFIG_RULES]: CONFIG_SRC, [LIVE_TRANSPORT]: TRANSPORT_SRC }, overrides || {});
function runPlanGuards(manifest) {
  const p = planFacts(manifest);
  return PLAN_GUARDS.filter(([, g]) => { try { return !g(p); } catch (_) { return true; } }).map(([n]) => n);
}
// TRANSPORT behaviour mutants run the REAL fixtures against a mutated body and
// require at least one transcript to change. A mutant that no fixture can
// distinguish is a weak mutant and is reported as a survivor, not hidden.
async function runTransportBehaviour(mutatedSrc) {
  const broken = [];
  try {
    for (let i = 0; i < GS_FIXTURES.length; i++) {
      const m = await runGetStreamerSymbols(mutatedSrc, 'mutant.js', GS_FIXTURES[i][1]);
      if (JSON.stringify(m) !== JSON.stringify(gsHeadLogs[i])) { broken.push('gs-transcript[' + i + ']'); break; }
    }
    for (let i = 0; i < DX_FIXTURES.length; i++) {
      const m = await runDXLink(mutatedSrc, 'mutant.js', DX_FIXTURES[i][1]);
      if (JSON.stringify(m) !== JSON.stringify(dxHeadLogs[i])) { broken.push('dx-transcript[' + i + ']'); break; }
    }
  } catch (e) { broken.push('transport-threw:' + String(e.message).slice(0, 40)); }
  return broken;
}
const mutTransport = (a, b) => swap(TRANSPORT_SRC, a, b);

// Mutants are deliberately broken code. Some of them invoke an ASYNC function at
// module top level, which produces a rejected promise nobody owns — and node 22
// aborts the process on an unhandled rejection. That would kill the CONTRACT
// instead of killing the MUTANT, turning a caught defect into a crash. So
// rejections are recorded for the duration of §14 rather than being fatal, and
// 14.3b proves the UNMUTATED repository contributes none — the recorder cannot
// quietly absorb a real problem in the code being shipped.
const mutantRejections = [];
const onUnhandledRejection = (r) => { mutantRejections.push(String(r && r.message ? r.message : r)); };
process.on('unhandledRejection', onUnhandledRejection);

deepEq(runGuards(HTML, mods()), [], '14.1 every guard passes against the UNMUTATED repository');
deepEq(runPlanGuards(MANIFEST), [], '14.2 every plan guard passes against the real manifest');
deepEq(await runTransportBehaviour(TRANSPORT_SRC), [], '14.3 the unmutated transport module reproduces every recorded transcript');
await settle();
deepEq(mutantRejections, [], '14.3b the UNMUTATED repository produces ZERO unhandled rejections — the recorder below is not hiding one');

const MUTANTS = [
  // ── SOURCE ───────────────────────────────────────────────────────────────
  ['SOURCE', 'pessGetStreamerSymbols omitted from the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, ['pessRunDXLink']) }))],
  ['SOURCE', 'pessRunDXLink omitted from the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, ['pessGetStreamerSymbols']) }))],
  ['SOURCE', 'pessRunDXLink duplicated in the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, ['pessGetStreamerSymbols', 'pessRunDXLink', 'pessRunDXLink']) }))],
  ['SOURCE', 'the two transport declarations REORDERED',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, ['pessRunDXLink', 'pessGetStreamerSymbols']) }))],
  ['SOURCE', 'transport body byte changed (one status string)',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('DXLink PESS: connecting', 'DXLink PESS: connecting now') }))],
  ['SOURCE', 'pessGetStreamerSymbols signature changed (parameter added)',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('async function pessGetStreamerSymbols(ticker,chain,ts)', 'async function pessGetStreamerSymbols(ticker,chain,ts,extra)') }))],
  ['SOURCE', 'pessRunDXLink signature changed (parameter dropped)',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('async function pessRunDXLink(ticker,syms,statusEl)', 'async function pessRunDXLink(ticker,syms)') }))],
  ['SOURCE', '`async` removed from pessRunDXLink',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('async function pessRunDXLink', 'function pessRunDXLink') }))],
  ['SOURCE', '`async` removed from pessGetStreamerSymbols',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('async function pessGetStreamerSymbols', 'function pessGetStreamerSymbols') }))],
  ['SOURCE', 'a transport declaration is ALSO left inline',
    () => runGuards(swap(HTML, inlineText('runPESSPanel'), textOf(LIVE_TRANSPORT, 'pessGetStreamerSymbols') + '\n\n' + inlineText('runPESSPanel')), mods())],
  ['SOURCE', 'a PENDING declaration is extracted early into the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat([inlineText('pessAnalyzeAll')])) }))],
  ['SOURCE', 'pessAnalyzeTicker extracted early into the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat([inlineText('pessAnalyzeTicker')])) }))],
  ['SOURCE', 'an unrelated PESS declaration added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat(['async function pessExtraTransport(x){return x;}'])) }))],
  ['SOURCE', 'a non-PESS declaration added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat(['function unrelatedHelper(x){return x;}'])) }))],
  ['SOURCE', 'a CONFIG_RULES declaration reintroduced inline',
    () => runGuards(swap(HTML, inlineText('runPESSPanel'), textOf(CONFIG_RULES, 'pessIVEdge') + '\n\n' + inlineText('runPESSPanel')), mods())],
  ['SOURCE', 'the config module loses a declaration',
    () => runGuards(HTML, mods({ [CONFIG_RULES]: mkModule(CONFIG_RULES, ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard']) }))],

  // ── OWNER ────────────────────────────────────────────────────────────────
  ['OWNER', 'PESS_LIVE_MIN duplicated into the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat([textOf(CONFIG_RULES, 'PESS_LIVE_MIN')])) }))],
  ['OWNER', 'the min-field array inlined as a second literal in the transport',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('PESS_LIVE_MIN.filter', "['bidPrice','askPrice','delta'].filter") }))],
  ['OWNER', 'a config rule moved into the transport module',
    () => runGuards(HTML, mods({
      [CONFIG_RULES]: mkModule(CONFIG_RULES, ['pessIVRRegime', 'pessIVEdge', 'PESS_LIVE_MIN']),
      [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat([textOf(CONFIG_RULES, 'pessRejectCard')])) }))],
  ['OWNER', 'foreign mutable state written from the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('var raw={};', 'var raw={};S.pessLastRaw=raw;') }))],
  ['OWNER', 'a DOM LOOKUP introduced into the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mutTransport('if(statusEl)statusEl.textContent=', "if(!statusEl)statusEl=document.getElementById('pess');if(statusEl)statusEl.textContent=") }))],
  ['OWNER', 'a transport declaration filed under CONFIG_RULES in the manifest',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRunDXLink' ? [m[0], m[1], m[2], CONFIG_RULES, m[4]] : m)))],
  ['OWNER', 'PESS_LIVE_MIN filed under LIVE_TRANSPORT in the manifest',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'PESS_LIVE_MIN' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['OWNER', 'pessAnalyzeAll filed under LIVE_TRANSPORT (moved early)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeAll' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['OWNER', 'a manifest entry duplicated', () => runPlanGuards(MANIFEST.concat([MANIFEST[0]]))],

  // ── LOAD ─────────────────────────────────────────────────────────────────
  ['LOAD', 'transport tag missing', () => runGuards(HTML.replace(TRANSPORT_TAG + '\n', ''), mods())],
  ['LOAD', 'transport tag duplicated', () => runGuards(HTML.replace(TRANSPORT_TAG + '\n', TRANSPORT_TAG + '\n' + TRANSPORT_TAG + '\n'), mods())],
  ['LOAD', 'transport tag moved AFTER the inline monolith', () => {
    const without = HTML.replace(TRANSPORT_TAG + '\n', '');
    return runGuards(without.replace('</body>', TRANSPORT_TAG + '\n</body>'), mods());
  }],
  ['LOAD', 'PESS module order reversed (transport BEFORE config)', () => {
    let h = HTML.replace(TRANSPORT_TAG + '\n', '');
    return runGuards(h.replace(CONFIG_TAG + '\n', TRANSPORT_TAG + '\n' + CONFIG_TAG + '\n'), mods());
  }],
  ['LOAD', 'transport tag separated from config (appended at the DSB tail)', () => {
    const without = HTML.replace(TRANSPORT_TAG + '\n', '');
    const anchor = '<script src="./js/ui/backend-directional-snapshot-panel.js"></script>\n';
    return runGuards(without.replace(anchor, anchor + TRANSPORT_TAG + '\n'), mods());
  }],
  ['LOAD', 'defer added to the transport tag',
    () => runGuards(HTML.replace(TRANSPORT_TAG, '<script defer src="./' + TRANSPORT_REL + '"></script>'), mods())],
  ['LOAD', 'async added to the transport tag',
    () => runGuards(HTML.replace(TRANSPORT_TAG, '<script async src="./' + TRANSPORT_REL + '"></script>'), mods())],
  ['LOAD', 'type=module added to the transport tag',
    () => runGuards(HTML.replace(TRANSPORT_TAG, '<script type="module" src="./' + TRANSPORT_REL + '"></script>'), mods())],
  ['LOAD', 'a top-level invocation added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + "\npessRunDXLink('AAPL',{},null);\n" }))],
  ['LOAD', 'a top-level fetch added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + "\nfetch('/quote-token');\n" }))],
  ['LOAD', 'a top-level SOCKET created in the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + "\nnew WebSocket('wss://x');\n" }))],
  ['LOAD', 'a top-level SUBSCRIPTION issued in the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + "\nwindow.__feed.subscribe({type:'Quote'});\n" }))],
  ['LOAD', 'a top-level timer added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + '\nsetTimeout(function(){}, 0);\n' }))],
  ['LOAD', 'a top-level listener added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + "\nwindow.addEventListener('resize', function(){});\n" }))],
  ['LOAD', 'a top-level DOM access added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + "\ndocument.getElementById('x');\n" }))],
  ['LOAD', 'a top-level window assignment added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T) + '\nwindow.pessRunDXLink = pessRunDXLink;\n' }))],
  ['LOAD', 'the config tag is removed', () => runGuards(HTML.replace(CONFIG_TAG + '\n', ''), mods())],

  // ── PLAN ─────────────────────────────────────────────────────────────────
  ['PLAN', 'total != 9', () => runPlanGuards(MANIFEST.filter((m) => m[0] !== 'pessAnalyzeAll'))],
  ['PLAN', 'shipped != 6 (a seventh filed as LIVE_TRANSPORT)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeTicker' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['PLAN', 'pending != 3', () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'runPESSPanel' ? [m[0], m[1], m[2], CONFIG_RULES, m[4]] : m)))],
  ['PLAN', 'LIVE_TRANSPORT != 2 declarations',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRejectCard' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['PLAN', 'transport chars != 9,127',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRunDXLink' ? [m[0], m[1], 5319, m[3], m[4]] : m)))],
  ['PLAN', 'shipped chars != 10,913',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessIVEdge' ? [m[0], m[1], 559, m[3], m[4]] : m)))],
  ['PLAN', 'pending chars != 41,809',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeAll' ? [m[0], m[1], 16110, m[3], m[4]] : m)))],
  ['PLAN', 'the ratchet stays at 5 (transport still filed as pending)',
    () => runPlanGuards(MANIFEST.map((m) => (m[3] === LIVE_TRANSPORT ? [m[0], m[1], m[2], ANALYSIS_SERVICE, m[4]] : m)))],

  // ── PARSER ───────────────────────────────────────────────────────────────
  ['PARSER', 'masker splits by code point, not UTF-16 unit', () => {
    let r; try { r = analyze({ html: HTML, modules: mods(), manifest: MANIFEST, mask: maskSourceByCodePoint }); } catch (e) { return ['threw']; }
    if (r.fatal) return ['fatal'];
    return GUARDS.filter(([, g]) => { try { return !g(r); } catch (_) { return true; } }).map(([n]) => n);
  }],
  ['PARSER', 'regex-keyword lookback disabled', () => {
    const a = maskSource(A.mono), b = maskSourceWithoutRegexKeywords(A.mono);
    let diff = Math.abs(a.length - b.length);
    for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) if (a[i] !== b[i]) diff++;
    return diff > 0 ? ['masking-differs-by-' + diff + '-chars'] : [];
  }],
];

// TRANSPORT behaviour mutants — real protocol operations, mutated one at a time.
const TRANSPORT_MUTANTS = [
  ['endpoint changed', () => mutTransport("'/eic/chain-symbols/'", "'/eic/chain-symbol/'")],
  ['quote-token endpoint changed', () => mutTransport("ttCall('/quote-token')", "ttCall('/quote-tokens')")],
  ['expiration no longer URL-encoded', () => mutTransport('encodeURIComponent(ts.frontExpiration)', 'ts.frontExpiration')],
  ['the two chain requests are serialised instead of parallel', () => mutTransport('Promise.allSettled', 'Promise.all')],
  ['front nearest tolerance $0.50 → $5.00', () => mutTransport("findStreamer(frontChain,fe.shortCall.strike,'call',0.50)", "findStreamer(frontChain,fe.shortCall.strike,'call',5.00)")],
  ['back alignment floor $2.50 → $25', () => mutTransport('Math.max(2.50,fe.shortCall.strike*0.025)', 'Math.max(25,fe.shortCall.strike*0.025)')],
  ['back alignment percentage 2.5% → 25%', () => mutTransport('fe.shortPut.strike *0.025', 'fe.shortPut.strike *0.25')],
  ['back legs re-selected by delta instead of aligned to the front strike', () => mutTransport("findStreamer(backChain,fe.shortCall.strike,'call',_cdCall)", "findStreamer(backChain,be.longCall.strike,'call',_cdCall)")],
  ['exact-match tolerance 0.01 → 1.0', () => mutTransport('Math.abs(x.strike-strike)<0.01', 'Math.abs(x.strike-strike)<1.0')],
  ['call/put streamer fields swapped', () => mutTransport("return type==='call'?s.callStreamer:s.putStreamer;", "return type==='call'?s.putStreamer:s.callStreamer;")],
  ['a fetch error is swallowed instead of appended', () => mutTransport("else fetchErr+=' front:'+rs[0].reason.message;", 'else fetchErr+=\'\';')],
  ['timeout removed entirely', () => mutTransport('},9000);', '},0);').replace('var timeoutId=setTimeout(function(){', 'var timeoutId=setTimeout(function(){if(1)return;')],
  ['timeout duration 9000 → 3000', () => mutTransport('},9000);', '},3000);')],
  ['clearTimeout removed from the completion path', () => mutTransport('resolved=true;clearTimeout(timeoutId);\n          try{ws.close();}catch(e){}resolve(raw);', 'resolved=true;\n          try{ws.close();}catch(e){}resolve(raw);')],
  ['ws.close removed from the completion path', () => mutTransport('try{ws.close();}catch(e){}resolve(raw);', 'resolve(raw);')],
  ['ws.close removed from the timeout path', () => mutTransport('if(!resolved){resolved=true;try{ws.close();}catch(e){}\n        resolve(', 'if(!resolved){resolved=true;\n        resolve(')],
  ['the FEED_SUBSCRIPTION frame is never sent', () => mutTransport("ws.send(JSON.stringify({type:'FEED_SUBSCRIPTION',channel:channelId,add:subs}));", '')],
  ['the subscription verb is renamed', () => mutTransport("type:'FEED_SUBSCRIPTION'", "type:'FEED_SUBSCRIBE'")],
  ['Greeks are no longer subscribed', () => mutTransport("{type:'Quote',symbol:sym},{type:'Greeks',symbol:sym},", "{type:'Quote',symbol:sym},")],
  ['the subscribed symbol set is truncated', () => mutTransport('var subs=allSymbols.flatMap', 'var subs=allSymbols.slice(0,2).flatMap')],
  ['the subscribed symbol ORDER is reversed', () => mutTransport('var subs=allSymbols.flatMap', 'var subs=allSymbols.slice().reverse().flatMap')],
  ['the requested Quote fields change', () => mutTransport("Quote: ['eventSymbol','bidPrice','askPrice'],", "Quote: ['eventSymbol','bidPrice'],")],
  ['the data format changes', () => mutTransport("acceptDataFormat:'FULL'", "acceptDataFormat:'COMPACT'")],
  ['the feed channel number changes', () => mutTransport('var ws,channelId=1;', 'var ws,channelId=2;')],
  ['the completion gate drops the delta requirement', () => mutTransport('return d2&&d2.bidPrice!=null&&d2.delta!=null;', 'return d2&&d2.bidPrice!=null;')],
  ['the completion gate resolves one event too early (`some` for `every`)', () => mutTransport('var complete=allSymbols.every', 'var complete=allSymbols.some')],
  ['the min-field gate is loosened (askPrice no longer required)', () => mutTransport('if(!ld||ld.bidPrice==null||ld.askPrice==null||ld.delta==null){', 'if(!ld||ld.bidPrice==null||ld.delta==null){')],
  ['a rejection is converted into a resolution', () => mutTransport("throw new Error('LIVE_DATA_UNAVAILABLE: DXLink timeout", "return liveLegs||{};throw new Error('LIVE_DATA_UNAVAILABLE: DXLink timeout")],
  ['the fail-closed 0/4 branch is removed', () => mutTransport('if(gotCount===0)', 'if(false)')],
  ['bid rounding 4dp → 2dp', () => mutTransport('raw[s2].bidPrice=+ev2.bidPrice.toFixed(4);', 'raw[s2].bidPrice=+ev2.bidPrice.toFixed(2);')],
  ['volatility is no longer scaled ×100', () => mutTransport('+(ev2.volatility*100).toFixed(2)', '+(ev2.volatility).toFixed(2)')],
  ['the dxlink fallback URL changes', () => mutTransport("'wss://tasty-openapi-ws.dxfeed.com/realtime'", "'wss://example.invalid/realtime'")],
  ['the KEEPALIVE echo is removed', () => mutTransport("}else if(msg.type==='KEEPALIVE'){\n        ws.send(JSON.stringify({type:'KEEPALIVE',channel:0}));", '}else if(msg.type==='+"'KEEPALIVE'"+'){')],
  ['the malformed-JSON guard is removed', () => mutTransport('var msg;try{msg=JSON.parse(ev.data);}catch(e){return;}', 'var msg=JSON.parse(ev.data);')],
  ['the onerror handler swallows the failure (never resolves)', () => mutTransport('ws.onerror=function(){if(!resolved){', 'ws.onerror=function(){if(false){')],
  ['the status sink is written unguarded', () => mutTransport("if(statusEl)statusEl.textContent='\\u25c6 DXLink PESS: connecting (4 legs)...';", "statusEl.textContent='\\u25c6 DXLink PESS: connecting (4 legs)...';")],
];
for (const [label, build] of TRANSPORT_MUTANTS) {
  MUTANTS.push(['TRANSPORT', label, async () => {
    let src;
    try { src = build(); } catch (e) { return ['mutant-setup-failed:' + String(e.message).slice(0, 60)]; }
    if (src === TRANSPORT_SRC) return [];
    const structural = runGuards(HTML, mods({ [LIVE_TRANSPORT]: src }));
    const behavioural = await runTransportBehaviour(src);
    return structural.concat(behavioural);
  }]);
}

let killed = 0; const survivors = []; const byCat = {};
for (const [cat, label, run] of MUTANTS) {
  let broke;
  try { broke = await run(); } catch (e) { broke = ['threw:' + String(e.message).slice(0, 40)]; }
  byCat[cat] = (byCat[cat] || 0) + 1;
  if (broke.length) killed++; else survivors.push(cat + ' / ' + label);
  ok(broke.length > 0, '14.4 mutant KILLED [' + cat + '] ' + label);
}
await settle();
process.off('unhandledRejection', onUnhandledRejection);
eq(survivors.length, 0, '14.5 no mutant survives');
eq(killed, MUTANTS.length, '14.6 all ' + MUTANTS.length + ' mutants are rejected');
note('mutants: ' + MUTANTS.length + ' (' + Object.entries(byCat).sort().map(([k, v]) => k + ' ' + v).join(', ') + ') — ' + killed + ' killed, ' + survivors.length + ' survivors');

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  assertions: ' + passed + '   mutants: ' + MUTANTS.length + '   survivors: ' + survivors.length);
console.log('  SHIPPED 6/10,913 (CONFIG_RULES 4/1,786 + LIVE_TRANSPORT 2/9,127) · PENDING 3/41,809');
console.log('  TOTAL 9/52,722 · ratchet 9→5→3 · async fixtures ' + asyncFixtures + ' · parity differences ' + (diffs + asyncDiffs));
console.log('  PESS EXTRACTION BOUNDARY CONTRACT: OK');
console.log('════════════════════════════════════════════════════════════════════════════════');

}

main().catch((e) => { console.error('\n' + (e && e.stack ? e.stack : String(e))); process.exit(1); });
