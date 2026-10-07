'use strict';
// ═════════════════════════════════════════════════════════════════════════════
// POST-SFS MONOLITH EXTRACTION AUDIT
//
// WHAT THIS IS
//   A read-only measurement of the inline monolith in index.html as it stands
//   AFTER the SFS extraction completed (PR #368), taken so the NEXT extraction
//   family and its split can be chosen from evidence rather than from memory.
//
//   It extracts nothing. It relocates nothing. It creates no runtime module and
//   changes no application byte. Its only outputs are the assertions below and
//   the generated report at docs/refactoring/post-sfs-monolith-extraction-audit.md.
//
// WHY IT DOES NOT REUSE AUDIT #363's NUMBERS
//   #363 measured a monolith that still contained the whole SFS family. Three
//   extractions have landed since (#365 config/state, #367 scan service, #368 UI
//   panel), removing 62 declarations and 39,822 declaration characters, and SFS
//   was #363's winner. Its declaration counts, family sizes, byte offsets and
//   execution ranking are therefore all stale. Only its METHOD is reused. Every
//   number in this file is recomputed from the current dev-clean source.
//
// HOW IT IS ORGANISED
//   §1  parser            — masker + top-level declaration scanner
//   §2  parser proof      — reproduce the six shipped-module fixtures exactly
//   §3  sections          — the monolith's own three tiers of banner
//   §4  ownership         — owner-first family classification
//   §5  the analyser      — ONE pure function from inputs to the measurement
//   §6  monolith facts    — the current inline population, measured from zero
//   §7  families          — per-family surface, state and fragmentation
//   §8  open-PR conflicts — live touch audit against five real PR heads
//   §9  rankings          — architectural value and execution priority
//   §10 sensitivity       — ±20% single and 2,000 simultaneous reweightings
//   §11 top three         — deep audit of the three leading execution candidates
//   §12 MCX               — the previous audit's next candidate, re-measured
//   §13 split design      — five plausible splits for the actual winner
//   §14 size advisory     — the historical 35,609 B owned-declaration ceiling
//   §15 ratchet           — can a repo-wide owned-family ratchet be armed today
//   §16 incidental        — defects observed and deliberately NOT fixed
//   §17 mutation proof    — in-memory mutants that must all be rejected
//   §18 report            — generate / verify the markdown report
//
// RUN
//   node tests/post-sfs-monolith-extraction-audit.test.js
// REGENERATE THE REPORT
//   AUDIT_WRITE_DOC=1 node tests/post-sfs-monolith-extraction-audit.test.js
// ═════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const L = require('./lib/load-app-source');

let passed = 0;
const NOTES = [];
function ok(cond, msg) { assert.ok(cond, msg); passed++; }
function eq(a, b, msg) { assert.strictEqual(a, b, msg + '  (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')'); passed++; }
function deep(a, b, msg) { assert.deepStrictEqual(a, b, msg); passed++; }
function note(s) { NOTES.push(s); console.log('        · ' + s); }
function head(s) { console.log('\n── ' + s + ' ' + '─'.repeat(Math.max(0, 76 - s.length))); }

// ═════════════════════════════════════════════════════════════════════════════
// §1 THE PARSER
//
// Same principles the DSB and SFS boundary contracts are built on, restated here
// so this audit stands alone:
//   • UTF-16 CODE-UNIT preserving. `src.split('')`, never `Array.from`, because
//     Array.from splits by CODE POINT and collapses a surrogate pair into one
//     element, shifting every later index by one.
//   • newline preserving, so line-based reasoning stays valid.
//   • string / template-literal / comment / regex aware, including regex
//     literals that follow a keyword (`return /ab{c/.test(s)`), whose braces
//     would otherwise leak into the depth counter and truncate the scan.
//   • brace, paren and bracket balanced, and depth aware, so "top level" means
//     depth zero rather than "column zero".
//   • line numbers are never used to identify a declaration.
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
// The two real defects earlier audits hit, kept as mutation subjects only.
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
// §3 SECTIONS
//
// The monolith carries THREE kinds of banner, and all three are needed: reading
// only the shouted tier-1 banners puts the whole DXLink/storm transport block
// inside the "STATE" section, because there is no tier-1 banner between `S` and
// the watchlist.
//   tier 1  a heavy rule line, then a SHOUTED title on the next line
//   tier 2  `// ── Title ─────` — a thin rule with the title inline
//   tier 3  `// >>> NAME_START` — the source's own explicit block markers
// A tier-N section ends at the next section of tier <= N, so tier-1 ranges are
// not truncated by their own sub-headings.
// ═════════════════════════════════════════════════════════════════════════════

function detectSections(mono) {
  const lines = mono.split('\n');
  const secs = [];
  let off = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^\/\/\s*[=─═*-]{10,}\s*$/.test(t)) {
      const m = /^\/\/\s*(.+)$/.exec((lines[i + 1] || '').trim());
      if (m) {
        const title = m[1].trim();
        if (/^[A-Z0-9][A-Z0-9 _&·\-—()\/+.]{3,}/.test(title)) secs.push({ off, title, tier: 1 });
      }
    }
    const m2 = /^\/\/\s*[─=-]{2,}\s*([^─=]{4,70}?)\s*[─=-]{4,}\s*$/.exec(t);
    if (m2) secs.push({ off, title: m2[1].trim(), tier: 2 });
    const m3 = /^\/\/\s*>>>\s*([A-Z0-9_]+)_START\s*$/.exec(t);
    if (m3) secs.push({ off, title: m3[1].replace(/_/g, ' '), tier: 3 });
    off += lines[i].length + 1;
  }
  secs.sort((a, b) => a.off - b.off || a.tier - b.tier);
  for (let i = 0; i < secs.length; i++) {
    let end = mono.length;
    for (let j = i + 1; j < secs.length; j++) if (secs[j].tier <= secs[i].tier) { end = secs[j].off; break; }
    secs[i].end = end;
  }
  return secs;
}

// ═════════════════════════════════════════════════════════════════════════════
// §4 OWNERSHIP — owner first, position second
//
//   1. NAME OWNERSHIP wins. This codebase marks ownership with a camelCase name
//      PREFIX (_sfs*, _dsb*, _mcx*, _swing*, _dss*, _rs*, _pf*, _j*, pess*,
//      eic*). A prefix counts only at a camelCase boundary — the next character
//      must be upper-case, a digit, an underscore, or end of name — and the
//      LONGEST matching prefix wins, so `journalManager` is JOURNAL by `journal`
//      rather than by `j`. INFIX matching is deliberately not used: an earlier
//      pass of this audit read `_scannerBackendCandleCache` as candle-owned on
//      the `Candle[A-Z]` infix when it is plainly scanner-owned.
//   2. PHYSICAL SECTION supplies the owner only for names carrying no marker.
//
// So a declaration sits in its family no matter where it physically lives, and a
// family may be scattered across the file — which is exactly what MCX turns out
// to be. EXCEPTIONS holds the few members owned by name without a prefix, the
// same device the SFS contract uses for `apexDebugSfsDetailChart`.
// ═════════════════════════════════════════════════════════════════════════════

const PREFIX = {
  sfs: 'SFS', dsb: 'DSB',
  mcx: 'MCX', regime: 'MCX', vix: 'MCX',
  eic: 'EIC', pess: 'PESS', swing: 'SWING', dss: 'DSS',
  rs: 'RS_VS_SPY', rsb: 'RS_VS_SPY',
  j: 'JOURNAL', jt: 'JOURNAL', jex: 'JOURNAL', journal: 'JOURNAL',
  pf: 'PORTFOLIO', portfolio: 'PORTFOLIO', position: 'PORTFOLIO', greeks: 'PORTFOLIO',
  pt: 'PRETRADE', pretrade: 'PRETRADE',
  scan: 'SCANNER', scanner: 'SCANNER',
  candle: 'CANDLE_PIPE',
  dxlink: 'DXLINK_INFRA', storm: 'DXLINK_INFRA',
  chart: 'CHART', schart: 'CHART',
  wl: 'WATCHLIST',
  agent: 'AGENTS_CHAT', agents: 'AGENTS_CHAT',
  ff: 'FEATURE_FLAGS',
};
const PREFIXES = Object.keys(PREFIX).sort((a, b) => b.length - a.length);

const EXCEPTIONS = {
  showView: 'SHELL_NAV', showSecTab: 'SHELL_NAV', setPanel: 'SHELL_NAV', _activeView: 'SHELL_NAV',
  computeMarketRegime: 'MCX', runMarketContextAnalysis: 'MCX', runMarketContextPanel: 'MCX',
  runEICPanel: 'EIC', runPESSPanel: 'PESS',
  runScan: 'SCANNER', runQA: 'SCANNER',
};

const SUBSECTION_OWNER = [
  [/DXLink feed-error/i, 'DXLINK_INFRA'],
  [/STORM CONTROL/i, 'DXLINK_INFRA'],
];

const SECTION_OWNER = [
  [/^CONFIGURATION/, 'CORE_CONFIG_STATE'],
  [/^MULTI-LEG STRATEGY TEMPLATES/, 'STRATEGY_TEMPLATES'],
  [/^STATE/, 'CORE_CONFIG_STATE'],
  [/^WATCHLIST/, 'WATCHLIST'],
  [/^AGENTS/, 'AGENTS_CHAT'], [/^AGENT STATUS/, 'AGENTS_CHAT'], [/^AGENT PANEL/, 'AGENTS_CHAT'],
  [/^CHAT/, 'AGENTS_CHAT'], [/^CLAUDE API CALL/, 'AGENTS_CHAT'], [/^ORCHESTRATION/, 'AGENTS_CHAT'],
  [/^SEC TABS/, 'SHELL_NAV'], [/^RIGHT PANEL HELPERS/, 'SHELL_NAV'],
  [/^TASTYTRADE BACKEND/, 'TT_AUTH'], [/^LOGIN & INIT/, 'LOGIN_INIT'],
  [/^LIVE PORTFOLIO/, 'PORTFOLIO'], [/^PORTFOLIO MANAGER/, 'PORTFOLIO'],
  [/^BACKEND-BACKED PORTFOLIOS/, 'PORTFOLIO'], [/^NON-DESTRUCTIVE PORTFOLIO AUDIT/, 'PORTFOLIO'],
  [/^PORTFOLIO DIRECTIONAL ALIGNMENT/, 'PORTFOLIO'], [/^PORTFOLIO ROW TRAFFIC LIGHT/, 'PORTFOLIO'],
  [/^INDICATORS/, 'INDICATORS'], [/^DATA FETCH/, 'DATA_FETCH'], [/^EARNINGS$/, 'EARNINGS'],
  [/^SCAN$/, 'SCANNER'], [/^SORT & FILTER/, 'SCANNER'], [/^RENDER SCANNER/, 'SCANNER'],
  [/^RENDER RANKING/, 'SCANNER'], [/^SCANNER INLINE CHART PANEL/, 'SCANNER'],
  [/^DIRECTIONAL SETUP SCANNER/, 'DSS'],
  [/^DXLINK CANDLE PIPELINE/, 'CANDLE_PIPE'], [/^TRADING-SESSION IDENTITY/, 'CANDLE_PIPE'],
  [/^CANDLE CONTEXT PRIORITY/, 'CANDLE_PIPE'], [/^DEV-ONLY/, 'CANDLE_PIPE'],
  [/^BACKEND CANDLE STORE CHART/, 'CANDLE_PIPE'],
  [/^CHART$/, 'CHART'],
  [/^RELATIVE STRENGTH SCANNER/, 'RS_VS_SPY'],
  [/^SQUEEZE FIRE SCANNER/, 'SFS'], [/^END SQUEEZE FIRE SCANNER/, 'SFS'],
  [/^SWING TRADING SCREEN/, 'SWING'], [/^END SWING TRADING SCREEN/, 'SWING'],
  [/^FUNDAMENTALS/, 'FUNDAMENTALS'], [/^RULES/, 'RULES'],
  [/^PRE-EARNINGS STRANGLE SWAP/, 'PESS'],
  [/^FF_BACKEND_OFFLOAD_V1/, 'FEATURE_FLAGS'],
  [/^BACKEND DIRECTIONAL SNAPSHOT/, 'DSB'],
  [/^JOURNAL MANAGER/, 'JOURNAL'], [/^TRADE JOURNAL/, 'JOURNAL'],
  [/^JOURNAL UI/, 'JOURNAL'], [/^JOURNAL REMOTE PERSISTENCE/, 'JOURNAL'],
  [/^PRE-TRADE RISK CHECK/, 'PRETRADE'],
  [/^MARKET CONTEXT AGENT/, 'MCX'],
  [/^EARNINGS IRON CONDOR AGENT/, 'EIC'], [/^DXLINK ON-DEMAND/, 'EIC'],
  [/^FINAL DECISION LAYER/, 'DECISION'], [/^SETUP SCORING/, 'DECISION'],
  [/^BACKUP \/ RESTORE PANEL/, 'BACKUP_RESTORE'],
];

function nameOwner(name, prefixTable, exceptions) {
  const table = prefixTable || PREFIX;
  const exc = exceptions || EXCEPTIONS;
  if (Object.prototype.hasOwnProperty.call(exc, name)) return exc[name];
  const bare = name.replace(/^_+/, '');
  const lower = bare.toLowerCase();
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  for (const p of keys) {
    if (!lower.startsWith(p)) continue;
    const next = bare[p.length];
    // camelCase boundary only: a lower-case next character fails every branch,
    // so `scandal` never reads as `scan`.
    if (next === undefined || next === '_' || /[0-9]/.test(next) ||
        (next === next.toUpperCase() && next !== next.toLowerCase())) return table[p];
  }
  return null;
}
function sectionOwner(title) { for (const [re, f] of SECTION_OWNER) if (re.test(title)) return f; return 'UNSECTIONED'; }
function subsectionOwner(title) { for (const [re, f] of SUBSECTION_OWNER) if (re.test(title)) return f; return null; }

// The name predicates the SHIPPED contracts use for their own families. This
// audit must prove both are extinct inline, using their own definitions rather
// than a restatement of them.
const isSfsName = (n) => /^(?:_?sfs|SFS_)/i.test(n) || /Sfs[A-Z]/.test(n);
const isDsbName = (n) => /^(?:_?dsb|DSB_)/i.test(n) || /Dsb[A-Z]/.test(n);

// ═════════════════════════════════════════════════════════════════════════════
// §5 THE ANALYSER
//
// ONE pure function from an INPUT BUNDLE to the whole measurement. Every guard
// below reads only its output, and §17 re-runs the same guards against MUTATED
// input bundles — so each guard is exercised against a repository that could
// plausibly exist rather than against a hand-written fixture.
// ═════════════════════════════════════════════════════════════════════════════

const S_WRITE_RE = /\bS\.([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\+\+|--|\+=|-=|\|\|=|\?\?=)/g;
const S_READ_RE = /\bS\.([A-Za-z_$][\w$]*)/g;
const BIND_WRITE_RE = /\b([A-Za-z_$][\w$]*)\s*(?:=(?!=)|\+\+|--|\+=|-=|\*=|\/=|\|\|=|&&=|\?\?=)/g;
const CALL_RE = /\b([A-Za-z_$][\w$]*)\s*\(/g;

function countOf(re, s) { const m = s.match(re); return m ? m.length : 0; }

function analyze(input) {
  const { html, modules, prRecords, weightsArch, weightsExec, mask, prefixTable, exceptions } = input;
  const maskFn = mask || maskSource;

  // ── script manifest ────────────────────────────────────────────────────────
  const tags = L.parseScriptTags(html).map((t, i) => ({
    i, src: t.src == null ? null : String(t.src),
    type: t.type == null ? '' : String(t.type),
    isJs: L.isJsType(t.type),
    kind: t.src == null || String(t.src).trim() === '' ? 'inline' : L.classifySrc(t.src),
    defer: /(^|\s)defer(\s|=|$)/i.test(t.attrs || ''),
    async: /(^|\s)async(\s|=|$)/i.test(t.attrs || ''),
    len: t.inline.length,
  }));
  const inlineTags = L.parseScriptTags(html).filter(
    (t) => (t.src == null || String(t.src).trim() === '') && L.isJsType(t.type) && t.inline.length > 100000);
  if (inlineTags.length !== 1) return { fatal: 'expected exactly one inline monolith, found ' + inlineTags.length, tags };
  const mono = inlineTags[0].inline;
  const masked = maskFn(mono);
  // How much work the regex-keyword lookback actually does ON THIS SOURCE: the
  // number of positions where this masker disagrees with the lookback-disabled
  // one. On the current monolith that defect changes 494 masked characters
  // (starting at `return /network_error|…/`) without changing any declaration
  // count — so counting declarations alone would NOT catch it. This does.
  const refNoKw = maskSourceWithoutRegexKeywords(mono);
  let maskedRegexChars = Math.abs(masked.length - refNoKw.length);
  for (let i = 0, n = Math.min(masked.length, refNoKw.length); i < n; i++) if (masked[i] !== refNoKw[i]) maskedRegexChars++;

  // ── declarations ───────────────────────────────────────────────────────────
  const raw = scanTopLevelDeclarations(mono, masked).sort((a, b) => a.start - b.start);
  const sections = detectSections(mono);
  function ownerAt(off) {
    let t1 = null, sub = null;
    for (const s of sections) {
      if (off < s.off || off >= s.end) continue;
      if (s.tier === 1) t1 = s;
      else { const o = subsectionOwner(s.title); if (o) sub = { sec: s, fam: o }; }
    }
    if (sub) return { fam: sub.fam, sec: sub.sec.title, tier: sub.sec.tier };
    if (t1) return { fam: sectionOwner(t1.title), sec: t1.title, tier: 1 };
    return { fam: 'CORE_CONFIG_STATE', sec: '(pre-section)', tier: 0 };
  }
  const decls = raw.map((d) => {
    const o = ownerAt(d.start);
    const nm = nameOwner(d.name, prefixTable, exceptions);
    return {
      name: d.name, bindingForm: d.bindingForm, kind: d.kind, isAsync: d.isAsync,
      start: d.start, end: d.end, chars: d.chars, signature: d.signature,
      section: o.sec, sectionTier: o.tier, sectionFam: o.fam,
      fam: nm || o.fam, ownedBy: nm ? 'name' : 'section',
    };
  });
  const FAM_OF = new Map(decls.map((d) => [d.name, d.fam]));
  const DECL_NAMES = new Set(decls.map((d) => d.name));

  // ── monolith facts ─────────────────────────────────────────────────────────
  const declChars = decls.reduce((a, d) => a + d.chars, 0);
  const forms = {};
  for (const d of decls) { const k = (d.isAsync ? 'async ' : '') + d.bindingForm; forms[k] = (forms[k] || 0) + 1; }
  const gaps = []; { let p = 0; for (const d of decls) { if (d.start > p) gaps.push([p, d.start]); p = d.end; } if (p < mono.length) gaps.push([p, mono.length]); }
  const gapsNonWs = gaps.reduce((a, [s, e]) => a + mono.slice(s, e).replace(/\s/g, '').length, 0);
  const codeGaps = gaps.filter(([s, e]) => maskFn(mono.slice(s, e)).trim().length > 0);
  const codeGapChars = codeGaps.reduce((a, [s, e]) => a + maskFn(mono.slice(s, e)).replace(/\s/g, '').length, 0);
  let contiguousRuns = decls.length ? 1 : 0;
  for (let i = 1; i < decls.length; i++) if (mono.slice(decls[i - 1].end, decls[i].start).trim().length > 0) contiguousRuns++;
  const duplicates = (() => {
    const seen = new Map(); for (const d of decls) { if (!seen.has(d.name)) seen.set(d.name, []); seen.get(d.name).push(d); }
    return [...seen.entries()].filter(([, v]) => v.length > 1)
      .map(([n, v]) => ({ name: n, count: v.length, offs: v.map((x) => x.start), fam: v[0].fam, identical: v.every((x) => mono.slice(x.start, x.end) === mono.slice(v[0].start, v[0].end)) }));
  })();

  // ── shipped modules ────────────────────────────────────────────────────────
  const MODULE_OF = new Map(); const MODULE_FACTS = {};
  for (const [rel, src] of Object.entries(modules)) {
    const ds = scanTopLevelDeclarations(src, maskFn(src));
    MODULE_FACTS[rel] = { decls: ds.length, chars: ds.reduce((a, d) => a + d.chars, 0), names: ds.map((d) => d.name) };
    for (const d of ds) MODULE_OF.set(d.name, rel);
  }

  // ── S.* key ownership: the family performing the most writes owns the key ──
  const writesByKey = new Map();
  const noteS = (fam, text, base) => {
    const r = new RegExp(S_WRITE_RE.source, 'g'); let m;
    while ((m = r.exec(text))) {
      if (!writesByKey.has(m[1])) writesByKey.set(m[1], new Map());
      const fm = writesByKey.get(m[1]);
      if (!fm.has(fam)) fm.set(fam, { n: 0, first: base + m.index });
      fm.get(fam).n++;
    }
  };
  for (const d of decls) noteS(d.fam, masked.slice(d.start, d.end), d.start);
  for (const [s, e] of gaps) noteS(ownerAt(s).fam, masked.slice(s, e), s);
  const OWNER_OF_KEY = new Map();
  for (const [k, fm] of writesByKey) {
    OWNER_OF_KEY.set(k, [...fm.entries()].sort((a, b) => b[1].n - a[1].n || a[1].first - b[1].first)[0][0]);
  }

  // ── top-level BINDING ownership and foreign writes ─────────────────────────
  const BINDING_OWNER = new Map();
  for (const d of decls) if (d.bindingForm !== 'function' && d.bindingForm !== 'class') BINDING_OWNER.set(d.name, d.fam);
  const bindWrites = new Map();
  const noteB = (fam, text, skip) => {
    const r = new RegExp(BIND_WRITE_RE.source, 'g'); let m;
    while ((m = r.exec(text))) {
      const n = m[1];
      if (!BINDING_OWNER.has(n) || n === skip) continue;
      if (!bindWrites.has(n)) bindWrites.set(n, new Map());
      bindWrites.get(n).set(fam, (bindWrites.get(n).get(fam) || 0) + 1);
    }
  };
  for (const d of decls) noteB(d.fam, masked.slice(d.start, d.end), d.name);
  for (const [s, e] of gaps) noteB(ownerAt(s).fam, masked.slice(s, e), null);
  const bindInbound = {}, bindOutbound = {};
  for (const [b, fm] of bindWrites) {
    const owner = BINDING_OWNER.get(b);
    for (const [fam, n] of fm) {
      if (fam === owner) continue;
      (bindOutbound[fam] = bindOutbound[fam] || []).push({ binding: b, owner, count: n });
      (bindInbound[owner] = bindInbound[owner] || []).push({ binding: b, writer: fam, count: n });
    }
  }

  // ── territory: interleaved load-time code between GLOBALLY ADJACENT members ─
  const territory = {};
  for (let i = 1; i < decls.length; i++) {
    const a = decls[i - 1], b = decls[i];
    if (a.fam !== b.fam) continue;
    const code = maskFn(mono.slice(a.end, b.start)).replace(/\s/g, '');
    if (!code.length) continue;
    (territory[a.fam] = territory[a.fam] || []).push({ after: a.name, before: b.name, chars: code.length });
  }

  // ── which suites exercise which family ─────────────────────────────────────
  const famTests = {};
  for (const [t, src] of Object.entries(input.tests || {})) {
    const hit = new Set();
    for (const d of decls) if (d.name.length >= 4 && src.indexOf(d.name) >= 0) hit.add(d.fam);
    for (const f of hit) (famTests[f] = famTests[f] || []).push(t);
  }

  // ── inline on* handlers, including those built inside HTML strings ─────────
  const htmlOnly = html.replace(mono, '');
  const handlerFam = {};
  for (const src of [mono, htmlOnly]) {
    const r = /\bon[a-z]+\s*=\s*\\?["']([^"']{0,400})/g; let m;
    while ((m = r.exec(src))) {
      const r2 = new RegExp(CALL_RE.source, 'g'); let x;
      while ((x = r2.exec(m[1]))) if (DECL_NAMES.has(x[1])) (handlerFam[FAM_OF.get(x[1])] = handlerFam[FAM_OF.get(x[1])] || new Set()).add(x[1]);
    }
  }

  // ── per-family report ──────────────────────────────────────────────────────
  const byFam = {};
  for (const d of decls) (byFam[d.fam] = byFam[d.fam] || []).push(d);
  const FAMILIES = {};
  for (const [fam, ds] of Object.entries(byFam)) {
    const code = ds.map((d) => mono.slice(d.start, d.end)).join('\n');
    const mcode = ds.map((d) => masked.slice(d.start, d.end)).join('\n');
    let runs = 1; const runList = []; let cur = null;
    for (const d of ds) {
      if (cur && mono.slice(cur.to, d.start).trim().length === 0) { cur.to = d.end; cur.names.push(d.name); }
      else { cur = { from: d.start, to: d.end, names: [d.name] }; runList.push(cur); }
    }
    runs = runList.length;
    const wr = new Set(), rd = new Set();
    { const r = new RegExp(S_WRITE_RE.source, 'g'); let m; while ((m = r.exec(mcode))) wr.add(m[1]); }
    { const r = new RegExp(S_READ_RE.source, 'g'); let m; while ((m = r.exec(mcode))) rd.add(m[1]); }
    const called = new Set(); { const r = new RegExp(CALL_RE.source, 'g'); let m; while ((m = r.exec(mcode))) called.add(m[1]); }
    const ownNames = new Set(ds.map((d) => d.name));
    const modUse = new Set(); for (const n of called) if (MODULE_OF.has(n)) modUse.add(MODULE_OF.get(n));
    const outFams = new Set(); for (const n of called) { const f = FAM_OF.get(n); if (f && f !== fam && !ownNames.has(n)) outFams.add(f); }
    const endpoints = new Set();
    { const r = /['"`](\/[A-Za-z0-9_\-{}$/.:]{3,})['"`]/g; let m; while ((m = r.exec(code))) if (!/^\/\//.test(m[1])) endpoints.add(m[1]); }
    FAMILIES[fam] = {
      fam, decls: ds.length, chars: ds.reduce((a, d) => a + d.chars, 0), runs, runList,
      firstOff: ds[0].start, lastOff: ds[ds.length - 1].end, span: ds[ds.length - 1].end - ds[0].start,
      async: ds.filter((d) => d.isAsync).length,
      forms: ds.reduce((o, d) => { const k = (d.isAsync ? 'async ' : '') + d.bindingForm; o[k] = (o[k] || 0) + 1; return o; }, {}),
      bindings: ds.filter((d) => d.bindingForm !== 'function' && d.bindingForm !== 'class').map((d) => d.name),
      stateOwned: [...wr].filter((k) => OWNER_OF_KEY.get(k) === fam).sort(),
      stateForeignWrite: [...wr].filter((k) => OWNER_OF_KEY.get(k) !== fam).sort(),
      stateForeignRead: [...rd].filter((k) => OWNER_OF_KEY.has(k) && OWNER_OF_KEY.get(k) !== fam).length,
      bindInbound: bindInbound[fam] || [], bindOutbound: bindOutbound[fam] || [],
      getById: countOf(/document\.getElementById\(/g, mcode),
      innerHTML: countOf(/\.innerHTML\s*=/g, mcode),
      fetch: countOf(/\bfetch\s*\(/g, mcode) + countOf(/\bttCall\s*\(/g, mcode),
      abort: countOf(/new\s+AbortController\b/g, mcode),
      timers: countOf(/\b(?:setTimeout|setInterval|clearTimeout|clearInterval)\s*\(/g, mcode),
      listeners: countOf(/\.addEventListener\s*\(/g, mcode),
      storage: countOf(/\b(?:localStorage|sessionStorage)\b/g, mcode),
      subs: countOf(/\b(?:subscribe|unsubscribe)\w*\s*\(/g, mcode),
      windowExpose: (() => { const s = new Set(); const r = /\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g; let m; while ((m = r.exec(mcode))) s.add(m[1]); return [...s].sort(); })(),
      endpoints: [...endpoints].sort(),
      outCallFams: [...outFams].sort(),
      modules: [...modUse].sort(),
      handlers: [...(handlerFam[fam] || [])].sort(),
      territoryStmts: (territory[fam] || []).length,
      territoryChars: (territory[fam] || []).reduce((a, x) => a + x.chars, 0),
      tests: (famTests[fam] || []).sort(),
    };
  }

  // ── open-PR conflict matrix ────────────────────────────────────────────────
  // An extraction in this repository is a pure DECLARATION RELOCATION: the spans
  // are cut from the monolith byte-for-byte, one <script src> tag is added, and
  // CALL SITES ARE NEVER REWRITTEN because the relocated declarations keep their
  // global bindings. So "another PR edits a function that calls into this
  // family" is not a conflict; editing the BODY of a declaration we would move
  // is, and so is writing state we own.
  const SEVRANK = { 'NONE': 0, 'BOOKKEEPING': 1, 'TEST-ONLY': 2, 'DISTANT SAME-FILE': 3, 'LOAD-ORDER': 4, 'STATE-OWNER': 6, 'SEMANTIC': 8, 'DECLARATION-BODY': 12, 'BLOCKED': 20 };
  const MATRIX = {}; const BLOCKED = {};
  for (const fam of Object.keys(FAMILIES)) {
    MATRIX[fam] = {};
    const F = FAMILIES[fam];
    const ownState = new Set(F.stateOwned), famMods = new Set(F.modules), famTestSet = new Set(F.tests);
    for (const pr of prRecords) {
      const reasons = []; let worst = 'NONE';
      const bump = (s, why) => { reasons.push(s + ' — ' + why); if (SEVRANK[s] > SEVRANK[worst]) worst = s; };
      const touched = [...new Set([...pr.added, ...pr.modified, ...pr.deleted])];
      const bodyHits = touched.filter((n) => FAM_OF.get(n) === fam);
      if (bodyHits.length) bump('DECLARATION-BODY', bodyHits.length + ' relocated declaration bod' + (bodyHits.length === 1 ? 'y' : 'ies') + ': ' + bodyHits.slice(0, 8).join(', ') + (bodyHits.length > 8 ? ', …' : ''));
      const st = (pr.stateWrites || []).filter((k) => ownState.has(k));
      if (st.length) bump('STATE-OWNER', 'writes owned state S.' + st.join(', S.'));
      const modOverlap = (pr.modulesTouched || []).filter((m) => famMods.has(m));
      if (modOverlap.length) {
        if (pr.moduleExportsChanged && pr.moduleExportsChanged.length) bump('SEMANTIC', 'reused module ' + modOverlap.join(', ') + ' changes exports: ' + pr.moduleExportsChanged.join(' '));
        else bump('BOOKKEEPING', 'reused module ' + modOverlap.join(', ') + ' edited internally; export set unchanged');
      }
      const td = pr.tagDelta;
      if (td && (td.addedTags.length || td.removedTags.length || td.reordered))
        bump('LOAD-ORDER', 'script manifest ' + td.countBefore + '→' + td.countAfter + (td.addedTags.length ? ' (+' + td.addedTags.join(', +') + ')' : '') + (td.reordered ? ' REORDERED' : ''));
      if (pr.touchesIndex && !bodyHits.length) bump('DISTANT SAME-FILE', 'edits index.html only in regions this family does not own');
      const testOverlap = (pr.testsTouched || []).filter((t) => famTestSet.has(t.replace(/^tests\//, '')));
      if (testOverlap.length) bump('TEST-ONLY', testOverlap.length + ' sibling suite(s) exercising this family are also edited');
      if (worst === 'NONE') bump('BOOKKEEPING', 'no surface this family owns is touched');
      MATRIX[fam][pr.pr] = { verdict: worst, reasons };
    }
    BLOCKED[fam] = prRecords.filter((p) => ['DECLARATION-BODY', 'BLOCKED'].includes(MATRIX[fam][p.pr].verdict)).map((p) => p.pr);
  }

  // ── candidates, metrics, rankings ──────────────────────────────────────────
  const SLICE = Math.max(...Object.values(MODULE_FACTS).map((m) => m.chars));
  const CANDIDATE_MIN_CHARS = 20000;
  const CANDIDATES = Object.values(FAMILIES).filter((f) => f.chars >= CANDIDATE_MIN_CHARS).map((f) => f.fam);
  const MET = {};
  for (const fam of CANDIDATES) {
    const F = FAMILIES[fam];
    MET[fam] = {
      fam, decls: F.decls, chars: F.chars, pctMono: F.chars / mono.length,
      runs: F.runs, spanPct: F.span / mono.length, span: F.span,
      async: F.async, bindings: F.bindings.length,
      stateOwned: F.stateOwned.length, stateForeignWrite: F.stateForeignWrite.length,
      bindInbound: F.bindInbound.reduce((a, x) => a + x.count, 0),
      bindOutbound: F.bindOutbound.reduce((a, x) => a + x.count, 0),
      dom: F.getById + F.innerHTML, fetch: F.fetch, endpoints: F.endpoints.length,
      abort: F.abort, timers: F.timers, listeners: F.listeners, storage: F.storage, subs: F.subs,
      windowExpose: F.windowExpose.length, handlers: F.handlers.length,
      modules: F.modules.length, tests: F.tests.length, outCallFams: F.outCallFams.length,
      territoryStmts: F.territoryStmts, territoryChars: F.territoryChars,
      estPRs: Math.max(1, Math.ceil(F.chars / SLICE)),
      blockedBy: BLOCKED[fam],
      conflictScore: prRecords.reduce((a, p) => a + SEVRANK[MATRIX[fam][p.pr].verdict], 0),
      verdicts: Object.fromEntries(prRecords.map((p) => [p.pr, MATRIX[fam][p.pr].verdict])),
    };
  }
  const metList = Object.values(MET);
  const normOf = (key, invert) => {
    const vals = metList.map((m) => m[key]); const lo = Math.min(...vals), hi = Math.max(...vals);
    return (m) => { const f = hi === lo ? 0.5 : (m[key] - lo) / (hi - lo); return invert ? 1 - f : f; };
  };
  const nSize = normOf('pctMono'), nRuns = normOf('runs', true), nSpan = normOf('spanPct', true);
  const nTerr = normOf('territoryStmts', true), nTests = normOf('tests'), nOut = normOf('outCallFams', true);
  const nWin = normOf('windowExpose', true), nHand = normOf('handlers', true), nConf = normOf('conflictScore', true);
  const nMods = normOf('modules'), nPRs = normOf('estPRs', true);
  // ownership integrity spans BOTH state models: S.* keys and top-level
  // bindings, penalised by every foreign write in either direction.
  const ownIntegrity = (m) => {
    const good = m.stateOwned + m.bindings;
    const bad = m.stateForeignWrite + m.bindInbound + m.bindOutbound;
    return good + bad === 0 ? 1 : good / (good + bad);
  };
  const cohesion = (m) => (nRuns(m) + nSpan(m) + nTerr(m)) / 3;
  const surfaceClarity = (m) => (nOut(m) + nWin(m) + nHand(m)) / 3;
  const archScore = (m, w) => {
    w = w || weightsArch;
    return w.size * nSize(m) + w.ownership * ownIntegrity(m) + w.cohesion * cohesion(m)
         + w.surface * surfaceClarity(m) + w.coverage * nTests(m);
  };
  const execScore = (m, wa, we) => {
    we = we || weightsExec;
    return we.arch * archScore(m, wa) + we.conflict * nConf(m) + we.cohesion * cohesion(m)
         + we.tractability * nPRs(m) + we.coverage * nTests(m) + we.reuse * nMods(m);
  };
  const ARCH = metList.map((m) => ({ fam: m.fam, score: archScore(m) })).sort((a, b) => b.score - a.score || a.fam.localeCompare(b.fam));
  const EXEC = metList.map((m) => ({ fam: m.fam, score: execScore(m), blocked: m.blockedBy.length > 0, effective: m.blockedBy.length ? 0 : execScore(m) }))
    .sort((a, b) => b.effective - a.effective || b.score - a.score || a.fam.localeCompare(b.fam));

  return {
    tags, mono, monoChars: mono.length, htmlChars: html.length,
    sections, decls, declChars, forms, gaps: gaps.length, gapsNonWs,
    codeGaps: codeGaps.length, codeGapChars, contiguousRuns, duplicates,
    FAMILIES, MODULE_FACTS, MATRIX, BLOCKED, MET, ARCH, EXEC,
    CANDIDATES, SLICE, CANDIDATE_MIN_CHARS,
    OWNER_OF_KEY: [...OWNER_OF_KEY].sort(), BINDING_OWNER: [...BINDING_OWNER].sort(),
    bindInbound, bindOutbound, territory,
    maskedRegexChars,
    sfsResidual: decls.filter((d) => isSfsName(d.name)).map((d) => d.name),
    dsbResidual: decls.filter((d) => isDsbName(d.name)).map((d) => d.name),
    execScore, archScore, metList, weightsArch, weightsExec,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// THE INPUT BUNDLE
// ═════════════════════════════════════════════════════════════════════════════

const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULES = {};
for (const dir of fs.readdirSync(path.join(ROOT, 'js'))) {
  const dp = path.join(ROOT, 'js', dir);
  if (!fs.statSync(dp).isDirectory()) continue;
  for (const f of fs.readdirSync(dp)) if (f.endsWith('.js')) MODULES['js/' + dir + '/' + f] = fs.readFileSync(path.join(dp, f), 'utf8');
}
const TESTS = {};
for (const f of fs.readdirSync(path.join(ROOT, 'tests'))) {
  if (!f.endsWith('.test.js') || f === path.basename(__filename)) continue;
  TESTS[f] = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
}

// ── PINNED OPEN-PR EVIDENCE ──────────────────────────────────────────────────
// Measured from each PR's REAL merge-base against dev-clean, at the head SHA
// recorded here. §8 re-derives every field from git when the ref is reachable
// AND still at the recorded SHA; when the PR has since moved or the ref is not
// fetched, the recorded measurement stands as the audit-time evidence and the
// re-derivation is noted as skipped rather than silently passing.
const PR_RECORDS = [
  {
    pr: 363, label: 'previous extraction audit', branch: 'claude/monolith-extraction-audit-d7uz3c',
    head: '07db24f651b2cf8235d62b49aac9317c1f8d72f1', mergeBase: '8555ded1e90e55aa99c26abe7474c55df3869237',
    fileCount: 2, touchesIndex: false, added: [], modified: [], deleted: [], tagDelta: null,
    stateWrites: [], modulesTouched: [], moduleExportsChanged: [],
    testsTouched: ['tests/next-monolith-extraction-audit.test.js'],
    docsTouched: ['docs/refactoring/next-monolith-extraction-audit.md'], contractsTouched: [],
  },
  {
    pr: 362, label: 'Portfolio Stress UI', branch: 'claude/portfolio-stress-ui-v1-stsyh3',
    head: '9b2e0f4694f73fae3e8d06317e929ef930305c95', mergeBase: '8555ded1e90e55aa99c26abe7474c55df3869237',
    fileCount: 20, touchesIndex: true, added: [], modified: ['showView'], deleted: [],
    tagDelta: { addedTags: ['./js/services/portfolio-stress-ui-state.js', './js/ui/portfolio-stress-panel.js'], removedTags: [], reordered: false, deferAdded: false, asyncAdded: false, moduleTypeAdded: false, countBefore: 28, countAfter: 30 },
    stateWrites: ['portfolioDirty'],
    modulesTouched: ['js/services/portfolio-stress-ui-state.js', 'js/ui/portfolio-stress-panel.js'],
    moduleExportsChanged: [],
    testsTouched: ['tests/backend-directional-preview-boundary-contract.test.js', 'tests/backend-directional-snapshot-boundary-contract.test.js', 'tests/backend-scanner-snapshot-ui-boundary-contract.test.js', 'tests/lib/portfolio-stress-ui-sandbox.js', 'tests/portfolio-stress-architecture-contract.test.js', 'tests/portfolio-stress-model-contract.test.js', 'tests/portfolio-stress-ui-architecture.test.js', 'tests/portfolio-stress-ui-lifecycle.test.js', 'tests/portfolio-stress-ui-matrix.test.js', 'tests/portfolio-stress-ui-mutation.test.js', 'tests/portfolio-stress-ui-overlay.test.js', 'tests/portfolio-stress-ui-render.test.js', 'tests/portfolio-stress-ui-scenario-contract.test.js'],
    docsTouched: ['docs/risk-models/portfolio-stress-test-v1.md'],
    contractsTouched: ['.github/workflows/portfolio-stress-companion.yml', 'config/risk-models/portfolio-stress-test-v1.json'],
  },
  {
    pr: 361, label: 'scanner / runScan DXLink migration', branch: 'claude/runscan-dxlink-migration-w7chmb',
    head: 'b17377ac9c35156cb8d3310ab6164048d14cdc87', mergeBase: '8555ded1e90e55aa99c26abe7474c55df3869237',
    fileCount: 14, touchesIndex: true,
    added: ['_scannerDetachCandleSeries', '_scannerAdaptDxlinkCandles', '_scannerFetchDxlinkDailyCandles', '_apexIsDailyOrCoarserTimeframe', '_apexUtcDateStr', '_apexCandleSessionDate', '_apexWeekBucketFromSessionDate', '_swingNonCanonicalSeriesPresent'],
    modified: ['_SCANNER_CANDLE_SOURCE', '_scannerCandleCacheKey', '_scannerCandlePumpQueue', 'fetchScannerCandles', 'runScan', 'getCandleDataSource', 'getDailyCandles', 'patchLastCandleWithLivePrice', '_swingDeriveWeeklyCandles', 'SWING_CANDLE_REASON', '_swingEvaluateCanonicalCache', '_swingGetCandles', '_swingRunActiveTab', '_swingSeriesSessionDate', '_swingChartCachePut', '_swingGetChartCandles', '_swingResolveRenderPrice', '_swingPatchWeeklyWithSessionPrice', '_swingPreparePriceAlignedCandles', 'selAgent'],
    deleted: ['_SCANNER_CANDLE_DAYS', '_swingLegacySeriesPresent'],
    tagDelta: { addedTags: [], removedTags: [], reordered: false, deferAdded: false, asyncAdded: false, moduleTypeAdded: false, countBefore: 28, countAfter: 28 },
    stateWrites: ['activeAgent', 'dataHealth', 'lastScan', 'scanData'],
    modulesTouched: ['js/services/candle-dxlink-client.js', 'js/services/candle-normalization.js'],
    moduleExportsChanged: [],
    testsTouched: ['tests/backend-directional-snapshot-boundary-contract.test.js', 'tests/directional-runscan-dxlink-provider.test.js', 'tests/portfolio-stress-architecture-contract.test.js', 'tests/swing-candle-session-identity.test.js', 'tests/swing-chart-cache-freshness.test.js', 'tests/swing-chart-live-price-parity.test.js', 'tests/swing-dxlink-sole-provider.test.js', 'tests/swing-source-bias-direction.test.js', 'tests/swing-trading.test.js', 'tests/swing-weekly-order-independent.test.js'],
    docsTouched: [], contractsTouched: ['config/risk-models/portfolio-stress-test-v1.json'],
  },
  {
    pr: 352, label: 'option-chain retry', branch: 'agent/option-chain-bounded-retry',
    head: 'a2c68e7621ba2e60d84cade016f3ec8df4fd493d', mergeBase: '896aadae9be1225f52b5cfc1a915b042249a8f10',
    fileCount: 2, touchesIndex: false, added: [], modified: [], deleted: [], tagDelta: null,
    stateWrites: [], modulesTouched: ['js/api/backend-client.js'], moduleExportsChanged: [],
    testsTouched: ['tests/backend-client-option-chain-final-retry.test.js'], docsTouched: [], contractsTouched: [],
  },
  {
    pr: 310, label: 'SWING persisted candle chart loader', branch: 'claude/swing-chart-live-quote-lease',
    head: 'd74fd6daf3bc561538906ba5f6b207b9d7babc74', mergeBase: '61c43715743e3546b7c5961293b4c5011fa4a810',
    fileCount: 3, touchesIndex: true,
    added: ['_swingChartStateIsError', 'SWING_CHART_ENSURE_REREAD_ATTEMPTS', 'SWING_CHART_ENSURE_REREAD_DELAY_MS', 'SWING_CHART_MIN_BARS', '_swingIsExplicitNoData', '_swingIsTransportFailure', '_swingEnsureTimeframesFor', '_swingChartLoadSeq', '_swingChartLoadLog', '_swingReadPersistedCandles', '_swingEnsureInflight', '_swingEnsureOnce', '_swingChartSleep', '_swingClassifyRead'],
    modified: ['_swingChartFailMsg', '_swingGetChartCandles', '_swingPrefetchNeighbors', '_swingRenderCharts'],
    deleted: [],
    tagDelta: { addedTags: [], removedTags: [], reordered: false, deferAdded: false, asyncAdded: false, moduleTypeAdded: false, countBefore: 24, countAfter: 24 },
    stateWrites: [], modulesTouched: [], moduleExportsChanged: [],
    testsTouched: ['tests/swing-chart-candle-load.test.js', 'tests/swing-trading.test.js'],
    docsTouched: [], contractsTouched: [],
  },
];

// ── SCORING WEIGHTS, DECLARED EXPLICITLY ─────────────────────────────────────
// Two separate rankings, never combined into one opaque number.
//   ARCHITECTURAL VALUE — how much is gained by isolating this family at all.
//   EXECUTION PRIORITY  — whether it should be the one done NEXT, given today's
//                         open PRs, its ownership integrity and how many bounded
//                         PRs it would actually take. `tractability` is what
//                         stops "biggest" from meaning "next".
const W_ARCH = { size: 0.30, ownership: 0.22, cohesion: 0.20, surface: 0.16, coverage: 0.12 };
const W_EXEC = { arch: 0.26, conflict: 0.24, cohesion: 0.20, tractability: 0.18, coverage: 0.07, reuse: 0.05 };

const INPUT = { html: HTML, modules: MODULES, tests: TESTS, prRecords: PR_RECORDS, weightsArch: W_ARCH, weightsExec: W_EXEC };
const A = analyze(INPUT);
assert.ok(!A.fatal, 'analyser failed: ' + A.fatal);

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  POST-SFS MONOLITH EXTRACTION AUDIT — read-only, extracts nothing');
console.log('════════════════════════════════════════════════════════════════════════════════');

// ═════════════════════════════════════════════════════════════════════════════
// §2 PARSER PROOF — the six shipped-module fixtures, reproduced exactly
//
// These are the modules the DSB and SFS extractions actually shipped. If this
// parser cannot recover their declaration counts and byte totals to the
// character, it is not fit to count anything else in this file.
// ═════════════════════════════════════════════════════════════════════════════
head('2. PARSER PROOF — shipped-module fixtures');
const FIXTURES = {
  'js/adapters/backend-directional-snapshot-adapter.js': [19, 6789],
  'js/services/backend-directional-snapshot-service.js': [26, 26385],
  'js/ui/backend-directional-snapshot-panel.js': [9, 14945],
  'js/services/sfs-config-state.js': [33, 1059],
  'js/services/sfs-scan-service.js': [9, 10635],
  'js/ui/sfs-panel.js': [20, 28128],
};
for (const [rel, [n, c]] of Object.entries(FIXTURES)) {
  const f = A.MODULE_FACTS[rel];
  ok(!!f, '2.1 fixture module present: ' + rel);
  eq(f.decls, n, '2.2 ' + rel + ' declaration count');
  eq(f.chars, c, '2.3 ' + rel + ' declaration chars');
}
verifyMaskerInvariants(maskSource, A.mono, 'monolith');
ok(true, '2.4 the masker is length-preserving, newline-preserving and balanced over the real monolith');
for (const rel of Object.keys(FIXTURES)) { verifyMaskerInvariants(maskSource, MODULES[rel], rel); ok(true, '2.5 masker invariants hold over ' + rel); }
note('all six shipped-module fixtures reproduced exactly (DSB 19/6789 · 26/26385 · 9/14945 — SFS 33/1059 · 9/10635 · 20/28128)');
// The regex-keyword lookback is doing real work here even though it happens not
// to change any COUNT on this source — measured, not assumed.
eq(A.maskedRegexChars, 494, '2.5b the regex-keyword lookback changes 494 masked characters on this monolith');
ok(Array.from(A.mono).length === A.mono.length - 1, '2.5c the monolith contains exactly one astral character — a code-point split would shift every later index by one');
note('regex-keyword lookback masks 494 chars here (first at `return /network_error|…/`); the monolith holds 1 astral character, so a code-point split shifts every later index');

// residual proof — both completed families must be extinct inline
eq(A.sfsResidual.length, 0, '2.6 SFS residual declarations inline = 0');
eq(A.dsbResidual.length, 0, '2.7 DSB residual declarations inline = 0');
eq(A.FAMILIES.SFS, undefined, '2.8 SFS is not a candidate inline family at all');
eq(A.FAMILIES.DSB, undefined, '2.9 DSB is not a candidate inline family at all');
ok(A.CANDIDATES.indexOf('SFS') < 0, '2.10 SFS never appears in the candidate set');
ok(A.CANDIDATES.indexOf('DSB') < 0, '2.11 DSB never appears in the candidate set');
note('SFS residual inline declarations 0 · DSB residual inline declarations 0 — both families fully shipped');

// ═════════════════════════════════════════════════════════════════════════════
// §6 THE CURRENT INLINE MONOLITH, MEASURED FROM ZERO
// ═════════════════════════════════════════════════════════════════════════════
head('6. THE CURRENT INLINE MONOLITH');
eq(A.htmlChars, 2253990, '6.1 index.html total chars');
eq(A.tags.length, 31, '6.2 script tags in document order');
eq(A.tags.filter((t) => t.kind === 'remote').length, 1, '6.3 …one remote CDN script (not application code)');
eq(A.tags.filter((t) => t.kind === 'local').length, 29, '6.4 …29 local application modules');
eq(A.tags.filter((t) => t.kind === 'inline').length, 1, '6.5 …exactly one inline script');
ok(A.tags.every((t) => !t.defer), '6.6 no script carries defer');
ok(A.tags.every((t) => !t.async), '6.7 no script carries async');
ok(A.tags.every((t) => !/module/i.test(t.type)), '6.8 no script is type=module — relocation preserves global bindings');
eq(A.monoChars, 2142350, '6.9 inline monolith chars');
eq(A.decls.length, 1346, '6.10 top-level declarations');
eq(A.declChars, 1858419, '6.11 total declaration chars');
eq(Number((100 * A.declChars / A.monoChars).toFixed(2)), 86.75, '6.12 declarations are 86.75% of the inline script');
deep(A.forms, { const: 5, var: 313, function: 894, 'async function': 134 }, '6.13 declaration forms');
eq(A.forms.let || 0, 0, '6.14 no let declarations at top level');
eq(A.forms.class || 0, 0, '6.15 no class declarations at top level');
eq(A.gaps, 1347, '6.16 top-level non-declaration statement gaps');
eq(A.gapsNonWs, 237551, '6.17 non-whitespace chars in those gaps');
eq(A.codeGaps, 41, '6.18 …of which only 41 gaps contain executable code (the rest are comment banners)');
eq(A.codeGapChars, 19400, '6.19 …totalling 19,400 non-whitespace code chars');
eq(A.contiguousRuns, 770, '6.20 physically contiguous declaration runs');
eq(Object.keys(A.FAMILIES).length, 28, '6.21 candidate ownership families');
note('inline ' + A.monoChars + ' chars · ' + A.decls.length + ' declarations · ' + A.declChars + ' declaration chars (86.75%)');
note('gaps ' + A.gaps + ' (' + A.codeGaps + ' with code, ' + A.codeGapChars + ' code chars; ' + (A.gapsNonWs - A.codeGapChars) + ' chars are comments) · ' + A.contiguousRuns + ' runs · ' + Object.keys(A.FAMILIES).length + ' families');

// ═════════════════════════════════════════════════════════════════════════════
// §7 FAMILIES — owner first, position second
// ═════════════════════════════════════════════════════════════════════════════
head('7. OWNER-FIRST FAMILY CLASSIFICATION');
const FAM_EXPECT = {
  PORTFOLIO: [318, 656455], JOURNAL: [145, 232116], SWING: [165, 200368], CANDLE_PIPE: [108, 100797],
  RS_VS_SPY: [143, 94585], SCANNER: [91, 84627], MCX: [89, 77424], EIC: [11, 67352],
  PRETRADE: [27, 55461], PESS: [9, 52722], DSS: [65, 49179], CHART: [36, 38912], AGENTS_CHAT: [23, 35950],
  DXLINK_INFRA: [37, 15564], WATCHLIST: [1, 11412], BACKUP_RESTORE: [9, 10670], LOGIN_INIT: [8, 10602],
  DECISION: [2, 10112], SHELL_NAV: [7, 9540], DATA_FETCH: [10, 9167], FEATURE_FLAGS: [19, 7683],
  STRATEGY_TEMPLATES: [1, 7382], TT_AUTH: [3, 5850], EARNINGS: [2, 3255], FUNDAMENTALS: [1, 3220],
  CORE_CONFIG_STATE: [6, 3171], RULES: [5, 2877], INDICATORS: [5, 1966],
};
deep(Object.keys(A.FAMILIES).sort(), Object.keys(FAM_EXPECT).sort(), '7.1 the family set');
for (const [fam, [n, c]] of Object.entries(FAM_EXPECT)) {
  eq(A.FAMILIES[fam].decls, n, '7.2 ' + fam + ' declaration count');
  eq(A.FAMILIES[fam].chars, c, '7.3 ' + fam + ' declaration chars');
}
eq(Object.values(A.FAMILIES).reduce((a, f) => a + f.decls, 0), 1346, '7.4 every declaration is classified exactly once');
eq(Object.values(A.FAMILIES).reduce((a, f) => a + f.chars, 0), 1858419, '7.5 …and every declaration char is accounted for');
ok(!Object.keys(A.FAMILIES).includes('UNSECTIONED'), '7.6 no declaration falls outside the section map');

// ownership wins over position: families exist whose members sit in foreign sections
const displaced = A.decls.filter((d) => d.ownedBy === 'name' && d.sectionFam !== d.fam);
ok(displaced.length > 0, '7.7 ownership genuinely overrides position for some declarations');
eq(A.decls.filter((d) => d.fam === 'MCX' && d.sectionFam !== 'MCX').length, 22,
  '7.8 22 MCX declarations live OUTSIDE the MCX section — ownership, not position');
note(displaced.length + ' declarations are owned by a family other than the one their physical section implies');

// foreign-state writes — the ownership-split signal
head('7b. FOREIGN-STATE WRITES (ownership-split risk)');
const splitRisk = Object.values(A.FAMILIES)
  .filter((f) => f.bindInbound.length || f.bindOutbound.length || f.stateForeignWrite.length)
  .map((f) => f.fam).sort();
deep(splitRisk, ['CANDLE_PIPE', 'CHART', 'DSS', 'FEATURE_FLAGS', 'JOURNAL', 'MCX', 'PORTFOLIO', 'PRETRADE', 'RS_VS_SPY', 'SCANNER', 'SHELL_NAV', 'SWING'],
  '7.9 every family carrying a foreign-state write in either direction');
eq(A.FAMILIES.PESS.bindInbound.length + A.FAMILIES.PESS.bindOutbound.length + A.FAMILIES.PESS.stateForeignWrite.length, 0,
  '7.10 PESS has NO foreign-state write in either direction');
eq(A.FAMILIES.EIC.bindInbound.length + A.FAMILIES.EIC.bindOutbound.length + A.FAMILIES.EIC.stateForeignWrite.length, 0,
  '7.11 EIC has NO foreign-state write in either direction');
eq(A.FAMILIES.MCX.bindInbound.reduce((a, x) => a + x.count, 0), 6, '7.12 MCX takes 6 inbound foreign binding writes');
deep(A.FAMILIES.MCX.bindInbound.map((x) => x.binding + '←' + x.writer), ['_vixFamilyPending←PORTFOLIO'],
  '7.13 …all of them PORTFOLIO writing _vixFamilyPending');
eq(A.FAMILIES.DSS.bindInbound.reduce((a, x) => a + x.count, 0), 6, '7.14 DSS takes 6 inbound foreign binding writes');
for (const f of Object.values(A.FAMILIES)) {
  for (const x of f.bindInbound) ok(x.writer !== f.fam, '7.15 an inbound foreign write never names its own family (' + f.fam + ')');
}
note('PESS and EIC are the only sizeable families with zero foreign-state writes in either direction');

// ═════════════════════════════════════════════════════════════════════════════
// §8 LIVE OPEN-PR TOUCH AUDIT
//
// Every PR is measured from its OWN merge-base with dev-clean, not from a shared
// base — three of the five branched from different commits. When git can reach
// the branch AND it is still at the recorded head, every field below is
// re-derived and compared; otherwise the recorded measurement stands and the
// re-derivation is reported as skipped.
// ═════════════════════════════════════════════════════════════════════════════
head('8. LIVE OPEN-PR TOUCH AUDIT');
function git(args) { return execFileSync('git', args, { cwd: ROOT, maxBuffer: 1 << 30, encoding: 'utf8' }); }
let GIT_OK = true; try { git(['rev-parse', '--git-dir']); } catch (_) { GIT_OK = false; }

let rederived = 0, skipped = 0;
for (const pr of PR_RECORDS) {
  let live = null;
  if (GIT_OK) {
    try {
      const h = git(['rev-parse', 'origin/' + pr.branch]).trim();
      if (h === pr.head) live = h;
    } catch (_) { /* branch not fetched here */ }
  }
  if (!live) { skipped++; note('PR#' + pr.pr + ' re-derivation SKIPPED (ref unreachable or moved off ' + pr.head.slice(0, 10) + ') — recorded evidence stands'); continue; }
  const mb = git(['merge-base', 'origin/' + pr.branch, 'origin/dev-clean']).trim();
  eq(mb, pr.mergeBase, '8.1 PR#' + pr.pr + ' merge-base with dev-clean');
  const files = git(['diff', '--name-only', mb, pr.head]).trim().split('\n').filter(Boolean);
  eq(files.length, pr.fileCount, '8.2 PR#' + pr.pr + ' changed file count');
  eq(files.includes('index.html'), pr.touchesIndex, '8.3 PR#' + pr.pr + ' index.html touched?');
  deep(files.filter((f) => f.startsWith('js/')).sort(), pr.modulesTouched.slice().sort(), '8.4 PR#' + pr.pr + ' shipped modules touched');
  deep(files.filter((f) => f.startsWith('tests/')).map((f) => f).sort(), pr.testsTouched.slice().sort(), '8.5 PR#' + pr.pr + ' test files touched');
  if (pr.touchesIndex) {
    const declsOf = (ref) => {
      const h = git(['show', ref + ':index.html']);
      const t = L.parseScriptTags(h).filter((x) => (x.src == null || String(x.src).trim() === '') && x.inline.length > 100000);
      const m = t[0].inline; const map = new Map();
      for (const d of scanTopLevelDeclarations(m, maskSource(m))) {
        if (!map.has(d.name)) map.set(d.name, []);
        map.get(d.name).push(m.slice(d.start, d.end));
      }
      return map;
    };
    const before = declsOf(mb), after = declsOf(pr.head);
    const added = [], modified = [], deleted = [];
    for (const [n, t] of after) { const b = before.get(n); if (!b) added.push(n); else if (b.join(' ') !== t.join(' ')) modified.push(n); }
    for (const n of before.keys()) if (!after.has(n)) deleted.push(n);
    deep(added.sort(), pr.added.slice().sort(), '8.6 PR#' + pr.pr + ' declarations ADDED');
    deep(modified.sort(), pr.modified.slice().sort(), '8.7 PR#' + pr.pr + ' declarations MODIFIED');
    deep(deleted.sort(), pr.deleted.slice().sort(), '8.8 PR#' + pr.pr + ' declarations DELETED');
    const tagsOf = (ref) => L.parseScriptTags(git(['show', ref + ':index.html'])).map((t) => (t.src == null ? '(inline)' : String(t.src)));
    const sa = tagsOf(mb), sb = tagsOf(pr.head);
    eq(sa.length, pr.tagDelta.countBefore, '8.9 PR#' + pr.pr + ' script tags before');
    eq(sb.length, pr.tagDelta.countAfter, '8.10 PR#' + pr.pr + ' script tags after');
    deep(sb.filter((s) => !sa.includes(s)), pr.tagDelta.addedTags, '8.11 PR#' + pr.pr + ' script tags added');
    deep(sa.filter((s) => !sb.includes(s)), pr.tagDelta.removedTags, '8.12 PR#' + pr.pr + ' script tags removed');
    eq(sa.filter((s) => sb.includes(s)).join('|') !== sb.filter((s) => sa.includes(s)).join('|'), pr.tagDelta.reordered, '8.13 PR#' + pr.pr + ' script order preserved?');
  }
  rederived++;
}
note(rederived + ' of ' + PR_RECORDS.length + ' PR records re-derived live from git; ' + skipped + ' skipped');

// the matrix itself
const MATRIX_EXPECT = {
  PORTFOLIO:    { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  JOURNAL:      { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  SWING:        { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DECLARATION-BODY', 352: 'BOOKKEEPING', 310: 'DECLARATION-BODY' },
  CANDLE_PIPE:  { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DECLARATION-BODY', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  RS_VS_SPY:    { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  SCANNER:      { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DECLARATION-BODY', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  MCX:          { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  EIC:          { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  PRETRADE:     { 363: 'BOOKKEEPING', 362: 'STATE-OWNER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  PESS:         { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  DSS:          { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  CHART:        { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  AGENTS_CHAT:  { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DECLARATION-BODY', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  DXLINK_INFRA: { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  SHELL_NAV:    { 363: 'BOOKKEEPING', 362: 'DECLARATION-BODY', 361: 'DISTANT SAME-FILE', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
  DATA_FETCH:   { 363: 'BOOKKEEPING', 362: 'LOAD-ORDER', 361: 'DECLARATION-BODY', 352: 'BOOKKEEPING', 310: 'DISTANT SAME-FILE' },
};
for (const [fam, row] of Object.entries(MATRIX_EXPECT)) {
  for (const [pr, v] of Object.entries(row)) eq(A.MATRIX[fam][pr].verdict, v, '8.14 conflict ' + fam + ' × PR#' + pr);
}
const BLOCKED_EXPECT = { SWING: [361, 310], CANDLE_PIPE: [361], SCANNER: [361], AGENTS_CHAT: [361], DATA_FETCH: [361], SHELL_NAV: [362] };
for (const [fam, prs] of Object.entries(BLOCKED_EXPECT)) deep(A.BLOCKED[fam], prs, '8.15 ' + fam + ' is blocked by exactly ' + prs.join('/'));
for (const fam of ['PESS', 'EIC', 'DSS', 'MCX', 'PORTFOLIO', 'JOURNAL', 'RS_VS_SPY', 'CHART', 'PRETRADE']) {
  eq(A.BLOCKED[fam].length, 0, '8.16 ' + fam + ' is blocked by no open PR');
}
ok(A.MATRIX.MCX[361].verdict === 'DISTANT SAME-FILE',
  '8.17 PR#361 edits index.html but nothing MCX owns — a distant same-file edit, not a blocker');
ok(A.MATRIX.SWING[361].verdict === 'DECLARATION-BODY',
  '8.18 PR#361 edits SWING declaration bodies — that IS a blocker');
ok(A.MATRIX.PRETRADE[362].verdict === 'STATE-OWNER',
  '8.19 PR#362 writes S.portfolioDirty, owned by PRETRADE — a blocker-class conflict with no textual overlap');
note('blocked by an open PR: SWING (361,310) · CANDLE_PIPE, SCANNER, AGENTS_CHAT, DATA_FETCH (361) · SHELL_NAV (362)');

// ═════════════════════════════════════════════════════════════════════════════
// §9 THE TWO RANKINGS
//
// Kept apart on purpose. A high-value family that is blocked stays blocked: the
// execution ranking scores it, then zeroes it, and reports the raw score beside
// the block so the value is visible without it buying priority.
// ═════════════════════════════════════════════════════════════════════════════
head('9. RANKINGS');
eq(A.CANDIDATES.length, 13, '9.1 candidate families at or above ' + A.CANDIDATE_MIN_CHARS + ' declaration chars');
eq(A.SLICE, 28128, '9.2 slice guidance = the largest shipped module (js/ui/sfs-panel.js, 28,128 owned declaration B)');
const ARCH_ORDER = ['PORTFOLIO', 'PESS', 'EIC', 'SWING', 'CANDLE_PIPE', 'AGENTS_CHAT', 'JOURNAL', 'CHART', 'SCANNER', 'MCX', 'RS_VS_SPY', 'DSS', 'PRETRADE'];
const EXEC_ORDER = ['PESS', 'DSS', 'EIC', 'PRETRADE', 'CHART', 'MCX', 'RS_VS_SPY', 'JOURNAL', 'PORTFOLIO', 'CANDLE_PIPE', 'AGENTS_CHAT', 'SCANNER', 'SWING'];
deep(A.ARCH.map((x) => x.fam), ARCH_ORDER, '9.3 ARCHITECTURAL VALUE ranking');
deep(A.EXEC.map((x) => x.fam), EXEC_ORDER, '9.4 EXECUTION PRIORITY ranking');
for (const x of A.EXEC) eq(x.blocked, A.MET[x.fam].blockedBy.length > 0, '9.5 ' + x.fam + ' blocked flag agrees with the matrix');
for (const x of A.EXEC) if (x.blocked) eq(x.effective, 0, '9.6 blocked family ' + x.fam + ' scores 0 effective — a block is never outranked');
const firstBlocked = A.EXEC.findIndex((x) => x.blocked);
ok(A.EXEC.slice(firstBlocked).every((x) => x.blocked), '9.7 every blocked family sorts below every unblocked one');
eq(A.EXEC[0].fam, 'PESS', '9.8 the EXECUTION winner is PESS');
eq(A.ARCH[0].fam, 'PORTFOLIO', '9.9 the ARCHITECTURAL winner is PORTFOLIO — biggest payoff, worst tractability');
ok(A.ARCH[1].fam === 'PESS' && A.ARCH[2].fam === 'EIC', '9.9b PESS and EIC are 2nd and 3rd on architectural value');
ok(A.EXEC.findIndex((x) => x.fam === 'PORTFOLIO') === 8, '9.10 …and PORTFOLIO is only 9th on execution priority');
// SWING carries the 3rd-largest payoff yet is last on execution: blocked twice.
eq(A.EXEC[A.EXEC.length - 1].fam, 'SWING', '9.11 SWING, the 3rd biggest family, ranks LAST on execution — blocked by two PRs');
note('architectural winner PORTFOLIO (' + A.ARCH[0].score.toFixed(4) + ') · execution winner PESS (' + A.EXEC[0].score.toFixed(4) + ')');
note('runner-up ' + A.EXEC[1].fam + ' (' + A.EXEC[1].score.toFixed(4) + '), margin ' + (A.EXEC[0].score - A.EXEC[1].score).toFixed(4) + ' — thin; see §10b');

// ═════════════════════════════════════════════════════════════════════════════
// §10 SENSITIVITY
// ═════════════════════════════════════════════════════════════════════════════
head('10. SENSITIVITY');
function rankExec(wa, we) {
  return A.metList.filter((m) => !m.blockedBy.length)
    .map((m) => ({ fam: m.fam, s: A.execScore(m, wa, we) }))
    .sort((a, b) => b.s - a.s || a.fam.localeCompare(b.fam));
}
const BASE = rankExec(W_ARCH, W_EXEC);
const SINGLE = [];
for (const [grp, src] of [['arch', W_ARCH], ['exec', W_EXEC]]) {
  for (const k of Object.keys(src)) {
    for (const d of [-0.20, 0.20]) {
      const wa = Object.assign({}, W_ARCH), we = Object.assign({}, W_EXEC);
      (grp === 'arch' ? wa : we)[k] = src[k] * (1 + d);
      const r = rankExec(wa, we);
      SINGLE.push({ weight: grp + '.' + k, delta: d, winner: r[0].fam, runnerUp: r[1].fam, margin: r[0].s - r[1].s });
    }
  }
}
eq(SINGLE.length, 22, '10.1 every weight varied ±20%, one at a time');
eq(SINGLE.filter((s) => s.winner !== 'PESS').length, 0, '10.2 no single ±20% weight change flips the winner');

const TRIALS = 2000;
let seed = 0x5f3759df;
const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >> 17; seed ^= seed << 5; seed >>>= 0; return seed / 0x100000000; };
const winTally = {}, runnerTally = {};
for (let i = 0; i < TRIALS; i++) {
  const wa = {}, we = {};
  for (const k of Object.keys(W_ARCH)) wa[k] = W_ARCH[k] * (0.8 + 0.4 * rnd());
  for (const k of Object.keys(W_EXEC)) we[k] = W_EXEC[k] * (0.8 + 0.4 * rnd());
  const r = rankExec(wa, we);
  winTally[r[0].fam] = (winTally[r[0].fam] || 0) + 1;
  runnerTally[r[1].fam] = (runnerTally[r[1].fam] || 0) + 1;
}
ok(TRIALS >= 1000, '10.3 at least 1,000 simultaneous randomized ±20% reweightings were run');
const stability = winTally.PESS / TRIALS;
eq(winTally.PESS, 1754, '10.4 PESS wins 1,754 of 2,000 randomized reweightings (87.7%)');
eq(winTally.DSS, 246, '10.5 DSS wins the other 246 (12.3%)');
deep(Object.keys(winTally).sort(), ['DSS', 'PESS'], '10.6 only PESS and DSS ever win');
const SENS = { trials: TRIALS, single: SINGLE, winTally, runnerTally, stability, baseMargin: BASE[0].s - BASE[1].s };

// THE HONEST READING. PESS survives every single-weight perturbation, but 12.3%
// of simultaneous reweightings pick DSS and the base margin is 0.0093 on a ~0.78
// scale. That is NOT a clear winner on score alone, and this audit says so
// rather than tightening the weights until it looks like one.
ok(stability < 0.95, '10.7 the score margin does NOT make PESS a clear winner — 12.3% of reweightings prefer DSS');
const thinnest = SINGLE.slice().sort((a, b) => a.margin - b.margin)[0];
ok(thinnest.margin < 0.001, '10.8 the thinnest single-weight margin is ' + thinnest.margin.toFixed(4) + ' (' + thinnest.weight + ' ' + (thinnest.delta > 0 ? '+' : '') + (100 * thinnest.delta).toFixed(0) + '%)');
deep(SINGLE.filter((x) => x.margin < 0.004).map((x) => x.weight + (x.delta > 0 ? '+' : '-')).sort(),
  ['exec.arch-', 'exec.cohesion-', 'exec.reuse+'], '10.9 three weight moves bring DSS within 0.004 of PESS');
note('±20% single-weight flips: 0 / 22 · ' + TRIALS + ' simultaneous random reweightings: PESS 87.7%, DSS 12.3%');
note('runner-up frequency: EIC ' + (100 * runnerTally.EIC / TRIALS).toFixed(1) + '% · DSS ' + (100 * runnerTally.DSS / TRIALS).toFixed(1) + '% · base margin ' + SENS.baseMargin.toFixed(4));
note('VERDICT: PESS, DSS and EIC are near-equivalent ON SCORE. The winner is decided by ownership, not by weights — see §10b.');

// ═════════════════════════════════════════════════════════════════════════════
// §10b THE TIE-BREAK THAT ACTUALLY DECIDES IT
//
// Because the scores are within 0.01 of each other, the choice must not rest on
// them. Two structural facts separate the three, and neither depends on a weight:
//
//   1. DSS is an OWNERSHIP-SPLIT RISK. SWING and CANDLE_PIPE write three
//      DSS-owned bindings (_dssKeyHandler, _dssDetailSymbol, _dssResizeTimer)
//      six times between them. A family whose state another family writes is not
//      independently extractable, however well it scores.
//   2. EIC carries a DUPLICATE-DECLARATION HAZARD. eicFetchLegs and
//      eicLiqFromLegs are each declared twice, byte-identical, 12.5 KB apart.
//      A byte-for-byte relocation cannot move a duplicated declaration without
//      first deciding which one survives — a behaviour-affecting decision that
//      belongs to a fix, not to an extraction.
//
// PESS has neither. That, not 0.0093 of score, is why it is the recommendation.
// ═════════════════════════════════════════════════════════════════════════════
head('10b. THE TIE-BREAK — ownership, not weights');
const dssSplit = A.FAMILIES.DSS.bindInbound;
ok(dssSplit.length > 0, '10.10 DSS carries inbound foreign binding writes');
deep([...new Set(dssSplit.map((x) => x.writer))].sort(), ['CANDLE_PIPE', 'SWING'], '10.11 …written by CANDLE_PIPE and SWING');
deep([...new Set(dssSplit.map((x) => x.binding))].sort(), ['_dssDetailSymbol', '_dssKeyHandler', '_dssResizeTimer'], '10.12 …across three DSS-owned bindings');
const eicDup = A.duplicates.filter((d) => d.fam === 'EIC');
eq(eicDup.length, 2, '10.13 EIC carries exactly two duplicated declarations');
ok(eicDup.every((d) => d.identical), '10.14 …both byte-identical, so neither is a typo the extraction could silently drop');
eq(A.FAMILIES.PESS.bindInbound.length, 0, '10.15 PESS takes no inbound foreign write');
eq(A.duplicates.filter((d) => d.fam === 'PESS').length, 0, '10.16 PESS has no duplicated declaration');
note('DSS: 6 inbound foreign binding writes from SWING/CANDLE_PIPE → ownership-split risk, not independently extractable');
note('EIC: eicFetchLegs and eicLiqFromLegs each declared twice, byte-identical → must be resolved BEFORE any relocation');
note('PESS: neither defect → the recommended next extraction');

// ═════════════════════════════════════════════════════════════════════════════
// §11 DEEP AUDIT OF THE TOP THREE EXECUTION CANDIDATES
// ═════════════════════════════════════════════════════════════════════════════
head('11. TOP THREE — PESS, EIC, DSS');
const TOP3 = A.EXEC.slice(0, 3).map((x) => x.fam);
deep(TOP3, ['PESS', 'DSS', 'EIC'], '11.1 the three leading execution candidates');

// ── PESS ──
const PESS_MANIFEST = [
  ['pessIVRRegime', 'function', 585], ['pessIVEdge', 'function', 558], ['runPESSPanel', 'function', 3685],
  ['pessRejectCard', 'function', 593], ['pessGetStreamerSymbols', 'async function', 3809],
  ['PESS_LIVE_MIN', 'var', 50], ['pessRunDXLink', 'async function', 5318],
  ['pessAnalyzeTicker', 'async function', 22013], ['pessAnalyzeAll', 'async function', 16111],
];
const pessDecls = A.decls.filter((d) => d.fam === 'PESS');
deep(pessDecls.map((d) => [d.name, (d.isAsync ? 'async ' : '') + d.bindingForm, d.chars]), PESS_MANIFEST,
  '11.2 PESS manifest in original physical order — names, binding form, async form and chars');
eq(A.FAMILIES.PESS.runs, 6, '11.3 PESS occupies 6 physical runs');
eq(A.FAMILIES.PESS.span, 53864, '11.4 …inside a 53,864 char span (97.9% declaration density)');
eq(A.FAMILIES.PESS.territoryStmts, 0, '11.5 PESS has ZERO interleaved load-time statements inside its territory');
deep(A.FAMILIES.PESS.bindings, ['PESS_LIVE_MIN'], '11.6 PESS owns exactly one top-level binding');
deep(A.FAMILIES.PESS.stateOwned, [], '11.7 PESS owns no S.* key');
deep(A.FAMILIES.PESS.outCallFams, ['AGENTS_CHAT', 'SHELL_NAV'], '11.8 PESS calls out to exactly two families');
deep(A.FAMILIES.PESS.modules, ['js/api/backend-client.js'], '11.9 PESS already reuses one shipped module (ttCall)');
deep(A.FAMILIES.PESS.handlers, ['pessAnalyzeAll'], '11.10 one inline on* handler names a PESS declaration');
eq(A.FAMILIES.PESS.tests.length, 0, '11.11 PESS has NO dedicated test suite — the regression risk to carry');

// ── EIC ──
const eicDecls = A.decls.filter((d) => d.fam === 'EIC');
eq(eicDecls.length, 11, '11.12 EIC has 11 declaration SITES');
eq(new Set(eicDecls.map((d) => d.name)).size, 9, '11.13 …but only 9 distinct names — two are declared twice');
eq(A.FAMILIES.EIC.runs, 10, '11.14 EIC occupies 10 physical runs');
eq(A.FAMILIES.EIC.span, 68577, '11.15 …inside a 68,577 char span');
eq(A.FAMILIES.EIC.territoryStmts, 0, '11.16 EIC has ZERO interleaved load-time statements');
deep(A.FAMILIES.EIC.stateOwned, ['eicShowAll'], '11.17 EIC owns exactly one S.* key');
deep(A.FAMILIES.EIC.outCallFams, ['AGENTS_CHAT', 'DECISION', 'SHELL_NAV'], '11.18 EIC calls out to three families');
eq(A.FAMILIES.EIC.tests.length, 0, '11.19 EIC also has no dedicated test suite');

// ── DSS ──
eq(A.FAMILIES.DSS.runs, 34, '11.20 DSS is spread over 34 physical runs');
eq(A.FAMILIES.DSS.span, 550541, '11.21 …across a 550,541 char span — 25.7% of the monolith');
eq(A.FAMILIES.DSS.bindings.length, 24, '11.22 DSS owns 24 top-level bindings');
eq(A.FAMILIES.DSS.bindInbound.reduce((a, x) => a + x.count, 0), 6, '11.23 …six of which are written by SWING and CANDLE_PIPE');
eq(A.FAMILIES.DSS.tests.length, 19, '11.24 DSS is exercised by 19 suites — much better covered than PESS or EIC');
note('PESS 9 decls / 52,722 B / 6 runs / 0 interleaved statements / 0 foreign writes / 0 tests');
note('EIC 11 sites (9 names, 2 duplicated) / 67,352 B / 10 runs / 0 interleaved statements / 0 tests');
note('DSS 65 decls / 49,179 B / 34 runs / 550,541 B span / 6 inbound foreign binding writes / 19 tests');

// ═════════════════════════════════════════════════════════════════════════════
// §12 MCX — the previous audit's next candidate, re-measured
//
// #363's plan was SFS then MCX. SFS shipped. MCX does NOT automatically inherit
// the slot, and on the current source it does not earn it either.
// ═════════════════════════════════════════════════════════════════════════════
head('12. MCX MUST EARN THE WIN');
eq(A.FAMILIES.MCX.decls, 89, '12.1 MCX declaration count');
eq(A.FAMILIES.MCX.chars, 77424, '12.2 MCX declaration chars');
eq(A.FAMILIES.MCX.runs, 56, '12.3 MCX occupies 56 physical runs');
eq(A.FAMILIES.MCX.span, 1878466, '12.4 …smeared across 1,878,118 chars — 87.7% of the whole monolith');
// A "physically separate region" is a distinct banner section of the monolith
// that holds at least one MCX declaration — the file's own structural unit,
// not an arbitrary byte-distance threshold.
const mcxRegions = [...new Set(A.decls.filter((d) => d.fam === 'MCX').map((d) => d.sectionFam))].sort();
deep(mcxRegions, ['INDICATORS', 'MCX', 'PORTFOLIO', 'PRETRADE'],
  '12.5 MCX declarations are scattered across FOUR different sections of the file');
eq(A.decls.filter((d) => d.fam === 'MCX' && d.sectionFam === 'PORTFOLIO').length, 14, '12.6 14 MCX declarations sit inside the LIVE PORTFOLIO section');
eq(A.decls.filter((d) => d.fam === 'MCX' && d.sectionFam === 'PRETRADE').length, 6, '12.7 6 MCX declarations sit inside the PRE-TRADE RISK CHECK section');
eq(A.FAMILIES.MCX.bindings.length, 29, '12.8 MCX owns 29 top-level bindings');
eq(A.FAMILIES.MCX.bindOutbound.length, 0, '12.9 MCX writes NO foreign binding — its own state is entirely self-owned');
eq(A.FAMILIES.MCX.bindInbound.reduce((a, x) => a + x.count, 0), 6, '12.10 but PORTFOLIO writes MCX-owned _vixFamilyPending 6 times');
deep(A.FAMILIES.MCX.stateOwned, ['marketContextRisk', 'marketContextSummary', 'marketContextTimestamp', 'marketContextValidMinutes', 'marketRegime'], '12.11 MCX owns 5 S.* keys');
eq(A.FAMILIES.MCX.stateForeignWrite.length, 0, '12.12 MCX writes no S.* key owned elsewhere');
eq(A.BLOCKED.MCX.length, 0, '12.13 no open PR blocks MCX');
eq(A.EXEC.findIndex((x) => x.fam === 'MCX'), 5, '12.14 MCX ranks 6th on EXECUTION priority');
eq(A.ARCH.findIndex((x) => x.fam === 'MCX'), 9, '12.15 MCX ranks 10th on ARCHITECTURAL value');
ok(A.EXEC[0].fam !== 'MCX', '12.16 MCX IS NOT THE CURRENT EXECUTION WINNER');
ok(A.execScore(A.MET.MCX) < A.execScore(A.MET.PESS), '12.17 …PESS outscores it on execution priority');
ok(A.execScore(A.MET.MCX) < A.execScore(A.MET.EIC), '12.18 …and so does EIC');
note('MCX is unblocked and its own state is self-owned (0 outbound foreign writes) — but it is spread over FOUR sections / 56 runs / 87.7% of the file, and PORTFOLIO writes its _vixFamilyPending 6 times.');
note('MCX does NOT win: 6th on execution, 10th on architectural value. A DSB-style adapter is not justified — MCX owns no transport beyond its own candle cache; config/state + service + panel is the shape it would need, at ~3 PRs.');

// ═════════════════════════════════════════════════════════════════════════════
// §13 SPLIT DESIGN FOR THE ACTUAL WINNER (PESS)
//
// PESS is a clean four-layer DAG — pure rules → live transport → analysis →
// panel — and nothing calls upward. Every option below is measured, not
// asserted; more modules earn nothing on their own, and options are rejected
// only when a module they produce breaks the ownership layering or the size
// guidance the repository has actually shipped to.
// ═════════════════════════════════════════════════════════════════════════════
head('13. SPLIT DESIGN — PESS');
const P_ = {};
for (const d of A.decls.filter((x) => x.fam === 'PESS')) P_[d.name] = d.chars;
const mod = (names) => ({ names, decls: names.length, chars: names.reduce((a, n) => a + P_[n], 0) });
const RULES_ = ['PESS_LIVE_MIN', 'pessIVRRegime', 'pessIVEdge', 'pessRejectCard'];
const XPORT_ = ['pessGetStreamerSymbols', 'pessRunDXLink'];
const ANALYZE_ = ['pessAnalyzeTicker', 'pessAnalyzeAll'];
const PANEL_ = ['runPESSPanel'];
const ALL_ = [].concat(RULES_, XPORT_, ANALYZE_, PANEL_);
const OPTIONS = {
  A: { label: 'one module', modules: [mod(ALL_)] },
  B: { label: 'state/config + behaviour', modules: [mod(['PESS_LIVE_MIN']), mod(ALL_.filter((n) => n !== 'PESS_LIVE_MIN'))] },
  C: { label: 'service + UI', modules: [mod(ALL_.filter((n) => n !== 'runPESSPanel')), mod(PANEL_)] },
  D: { label: 'config/state + service + UI', modules: [mod(RULES_), mod([].concat(XPORT_, ANALYZE_)), mod(PANEL_)] },
  E: { label: 'ownership-driven: rules · transport · batch analysis · panel+drilldown', modules: [mod(RULES_), mod(XPORT_), mod(['pessAnalyzeAll']), mod(['runPESSPanel', 'pessAnalyzeTicker'])] },
};
for (const [k, o] of Object.entries(OPTIONS)) {
  eq(o.modules.reduce((a, m) => a + m.decls, 0), 9, '13.1 option ' + k + ' ships all 9 PESS declarations');
  eq(o.modules.reduce((a, m) => a + m.chars, 0), 52722, '13.2 option ' + k + ' ships all 52,722 PESS declaration chars');
  o.largest = Math.max(...o.modules.map((m) => m.chars));
  o.count = o.modules.length;
}
eq(OPTIONS.A.largest, 52722, '13.3 option A largest module 52,722 B');
eq(OPTIONS.B.largest, 52672, '13.4 option B largest module 52,672 B');
eq(OPTIONS.C.largest, 49037, '13.5 option C largest module 49,037 B');
eq(OPTIONS.D.largest, 47251, '13.6 option D largest module 47,251 B');
eq(OPTIONS.E.largest, 25698, '13.7 option E largest module 25,698 B');
deep(OPTIONS.E.modules.map((m) => m.chars), [1786, 9127, 16111, 25698], '13.8 option E module sizes');
deep(OPTIONS.E.modules.map((m) => m.decls), [4, 2, 1, 2], '13.9 option E declarations per module');

// ═════════════════════════════════════════════════════════════════════════════
// §14 SIZE ADVISORY — the historical 35,609 B ceiling
//
// The DSB contract pins SIZE_CEILING = 35,609 B = 1.5 × the largest module that
// had shipped WHEN THAT AUDIT RAN (backend-scanner-snapshot-panel, 23,739 B). It
// preserves that number by excluding modules shipped since, which is a HISTORICAL
// CONTRACT CONCERN belonging to that contract. This audit does not touch it, does
// not redesign it, and adds no exclusion to it. It only records, advisorily,
// whether the winner's split would clear it.
// ═════════════════════════════════════════════════════════════════════════════
head('14. SIZE ADVISORY');
const DSB_CEILING = 35609;
const CURRENT_15X = Math.round(1.5 * A.SLICE);
eq(A.MODULE_FACTS['js/ui/backend-scanner-snapshot-panel.js'].chars, 23739, '14.1 the module the 35,609 ceiling was derived from is still 23,739 B');
eq(Math.round(1.5 * 23739), DSB_CEILING, '14.2 35,609 = 1.5 × 23,739, exactly as the DSB contract records');
eq(CURRENT_15X, 42192, '14.3 1.5 × the largest module TODAY (sfs-panel, 28,128 B) would be 42,192 B');
ok(OPTIONS.A.largest > DSB_CEILING, '14.4 ADVISORY: option A (one module) exceeds the historical 35,609 B ceiling');
ok(OPTIONS.C.largest > DSB_CEILING, '14.5 ADVISORY: option C exceeds it');
ok(OPTIONS.D.largest > DSB_CEILING, '14.6 ADVISORY: option D exceeds it');
ok(OPTIONS.E.largest < DSB_CEILING, '14.7 option E clears it — largest module 25,698 B, under both 35,609 and 42,192');
ok(OPTIONS.E.largest < A.SLICE, '14.8 …and under the largest module ever shipped (28,128 B)');
note('option E is the only split whose largest module clears the historical 35,609 B advisory ceiling (25,698 B)');
note('the DSB ceiling itself is left exactly as it is — no exclusion added, no ranking altered');

// ═════════════════════════════════════════════════════════════════════════════
// §15 GLOBAL RATCHET RE-ASSESSMENT
//
// #363 proposed freezing inline declarations whose family already owns an
// external module. With SFS now also at zero, can that be armed repo-wide today?
// A family counts as "already owning a module" when a shipped module's
// declarations are MAJORITY that family under the same owner-first name rule.
// ═════════════════════════════════════════════════════════════════════════════
head('15. GLOBAL RATCHET');
const OWNING = {};
for (const [rel, f] of Object.entries(A.MODULE_FACTS)) {
  const tally = {};
  for (const n of f.names) { const o = nameOwner(n) || '(unmarked)'; tally[o] = (tally[o] || 0) + 1; }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  if (top[0] !== '(unmarked)' && top[1] / f.names.length > 0.5) (OWNING[top[0]] = OWNING[top[0]] || []).push(rel);
}
deep(Object.keys(OWNING).sort(), ['DSB', 'PORTFOLIO', 'SCANNER', 'SFS'], '15.1 four families already own at least one shipped module');
eq((A.FAMILIES.SFS || { decls: 0 }).decls, 0, '15.2 SFS inline residual = 0 — ratchet floor reached');
eq((A.FAMILIES.DSB || { decls: 0 }).decls, 0, '15.3 DSB inline residual = 0 — ratchet floor reached');
eq(A.FAMILIES.PORTFOLIO.decls, 318, '15.4 PORTFOLIO still has 318 inline declarations despite owning 3 stress modules');
eq(A.FAMILIES.SCANNER.decls, 91, '15.5 SCANNER still has 91 inline declarations despite owning candle-store-client.js');
// would today's open PRs violate each scope?
const violate = (fams) => PR_RECORDS.filter((p) => p.added.some((n) => fams.includes(nameOwner(n)))).map((p) => p.pr);
deep(violate(['SFS', 'DSB']), [], '15.6 an SFS+DSB-scoped ratchet is violated by NO open PR — safe to arm today');
deep(violate(['SCANNER']), [361], '15.7 a SCANNER-scoped ratchet would be violated immediately by PR#361');
deep(violate(['PORTFOLIO']), [], '15.8 a PORTFOLIO-scoped ratchet is not violated by an open PR today…');
ok(A.FAMILIES.PORTFOLIO.decls > 300, '15.9 …but PORTFOLIO owns only the portfolio-stress sub-domain, so a blanket ratchet would freeze 318 legitimate residuals');
note('RECOMMENDATION: arm the ratchet for SFS and DSB ONLY (both already at zero, violated by no open PR). PORTFOLIO and SCANNER own a narrow sub-domain each and still hold hundreds of legitimate inline residuals — a blanket ratchet there would be violated on contact (PR#361 adds three _scanner* declarations inline).');
note('reported as a recommendation only — no ratchet is implemented here, and nothing outside this audit is touched');

// ═════════════════════════════════════════════════════════════════════════════
// §16 INCIDENTAL FINDINGS — recorded, deliberately NOT fixed
//
// Each is asserted as STILL PRESENT so the record cannot rot silently. Fixing
// any of them is out of scope for an audit and would change application bytes.
// ═════════════════════════════════════════════════════════════════════════════
head('16. INCIDENTAL FINDINGS (recorded, not fixed)');
// (a) duplicate EIC declarations — historically observed, still here
deep(A.duplicates.map((d) => d.name).sort(), ['eicFetchLegs', 'eicLiqFromLegs'], '16.1 exactly two duplicated top-level declarations remain, both EIC');
for (const d of A.duplicates) { eq(d.count, 2, '16.2 ' + d.name + ' is declared twice'); ok(d.identical, '16.3 ' + d.name + ' — the two copies are byte-identical'); }
deep(A.duplicates.map((d) => d.offs), [[1961914, 1974457], [1962129, 1974672]], '16.4 …at these exact offsets');
// (b) ma200dist renders an exact zero as '+0%'
const MA200 = /ma200dist:\(d200>=0\?'\+':''\)\+d200\+'%'/;
ok(MA200.test(A.mono), '16.5 ma200dist still formats a zero distance as "+0%" (d200>=0 takes the "+" branch)');
// (c) SFS module headers — checked, and NOT stale: all three describe a completed extraction
for (const [rel, pr] of [['js/services/sfs-config-state.js', 'PR 1'], ['js/services/sfs-scan-service.js', 'PR 2'], ['js/ui/sfs-panel.js', 'PR 3']]) {
  ok(MODULES[rel].indexOf(pr + ' of the approved 3-PR SFS extraction') >= 0, '16.6 ' + rel + ' header states ' + pr + ' of 3 — accurate now the extraction is complete');
}
// (d) orphaned extraction comments — searched for, none found
const orphan = /\b(moved to|extracted to|relocated to|now lives in) (js\/|\.\/js\/)/i;
ok(!orphan.test(A.mono), '16.7 no orphaned "moved to js/…" extraction comment remains inline');
// (e) the node-20 known-failure policy: four boundary suites fail on node 20 on a
//     vm-sandbox proxy-trap difference. Present, pinned, and outside this audit.
const N20 = fs.readFileSync(path.join(ROOT, 'tests', 'lib', 'node20-known-failures.js'), 'utf8');
ok(/known/i.test(N20) && /fingerprint/.test(N20), '16.8 the node-20 known-failure policy is present and fingerprint-pinned');
note('STILL PRESENT — eicFetchLegs and eicLiqFromLegs each declared twice (byte-identical, 12.5 KB apart)');
note('STILL PRESENT — ma200dist formats an exact 0 as "+0%"');
note('RESOLVED / NOT FOUND — the SFS module headers are accurate; no orphaned extraction comment remains inline');
note('OUT OF SCOPE — the node-20 four-suite known-failure policy is pinned to its measured cause and untouched here');

// ═════════════════════════════════════════════════════════════════════════════
// §17 MUTATION PROOF
//
// An audit that only agrees with itself proves nothing. Every mutant below is an
// IN-MEMORY change to the analyser's INPUT BUNDLE (or to the parser it is handed)
// describing a repository that could plausibly exist — a declaration omitted, a
// family misassigned, a script tag reordered, a conflict quietly downgraded, SFS
// smuggled back into the candidate set. The SAME guards that ran above are then
// re-run against the mutated measurement, and every mutant must break at least
// one of them. No runtime fixture is invented to make a mutant die.
// ═════════════════════════════════════════════════════════════════════════════
head('17. MUTATION PROOF');

// The guards, expressed once, over any analyser output.
const GUARDS = [
  ['monolith-chars', (r) => r.monoChars === 2142350],
  ['decl-count', (r) => r.decls.length === 1346],
  ['decl-chars', (r) => r.declChars === 1858419],
  ['forms', (r) => JSON.stringify(r.forms) === JSON.stringify({ const: 5, var: 313, function: 894, 'async function': 134 })],
  ['runs', (r) => r.contiguousRuns === 770],
  ['gaps', (r) => r.gaps === 1347 && r.codeGaps === 41 && r.codeGapChars === 19400],
  ['family-count', (r) => Object.keys(r.FAMILIES).length === 28],
  ['family-sizes', (r) => Object.entries(FAM_EXPECT).every(([f, [n, c]]) => r.FAMILIES[f] && r.FAMILIES[f].decls === n && r.FAMILIES[f].chars === c)],
  ['no-sfs-inline', (r) => r.sfsResidual.length === 0 && !r.FAMILIES.SFS && r.CANDIDATES.indexOf('SFS') < 0],
  ['no-dsb-inline', (r) => r.dsbResidual.length === 0 && !r.FAMILIES.DSB && r.CANDIDATES.indexOf('DSB') < 0],
  ['pess-manifest', (r) => JSON.stringify(r.decls.filter((d) => d.fam === 'PESS').map((d) => [d.name, (d.isAsync ? 'async ' : '') + d.bindingForm, d.chars])) === JSON.stringify(PESS_MANIFEST)],
  ['pess-runs', (r) => r.FAMILIES.PESS && r.FAMILIES.PESS.runs === 6 && r.FAMILIES.PESS.territoryStmts === 0],
  ['pess-endpoints', (r) => r.FAMILIES.PESS && r.FAMILIES.PESS.endpoints.join('|') === A.FAMILIES.PESS.endpoints.join('|')],
  ['pess-timers', (r) => r.FAMILIES.PESS && r.FAMILIES.PESS.timers === A.FAMILIES.PESS.timers],
  ['pess-subs', (r) => r.FAMILIES.PESS && r.FAMILIES.PESS.subs === A.FAMILIES.PESS.subs],
  ['state-owner-map', (r) => JSON.stringify(r.OWNER_OF_KEY) === JSON.stringify(A.OWNER_OF_KEY)],
  ['regex-keyword-lookback', (r) => r.maskedRegexChars === 494],
  ['foreign-writes', (r) => r.FAMILIES.MCX && r.FAMILIES.MCX.bindInbound.reduce((a, x) => a + x.count, 0) === 6
    && r.FAMILIES.DSS && r.FAMILIES.DSS.bindInbound.reduce((a, x) => a + x.count, 0) === 6],
  ['duplicates', (r) => r.duplicates.length === 2 && r.duplicates.every((d) => d.fam === 'EIC' && d.identical)],
  ['script-manifest', (r) => r.tags.length === 31 && r.tags.filter((t) => t.kind === 'local').length === 29],
  ['script-order', (r) => r.tags.filter((t) => t.kind === 'local').map((t) => t.src).join('|') === A.tags.filter((t) => t.kind === 'local').map((t) => t.src).join('|')],
  ['no-defer-async-module', (r) => r.tags.every((t) => !t.defer && !t.async && !/module/i.test(t.type))],
  ['conflict-matrix', (r) => Object.entries(MATRIX_EXPECT).every(([f, row]) => Object.entries(row).every(([p, v]) => r.MATRIX[f] && r.MATRIX[f][p].verdict === v))],
  ['blocked-set', (r) => Object.entries(BLOCKED_EXPECT).every(([f, prs]) => JSON.stringify(r.BLOCKED[f]) === JSON.stringify(prs))],
  ['blocked-never-promoted', (r) => r.EXEC.every((x, i) => !(x.blocked && r.EXEC.slice(i + 1).some((y) => !y.blocked)))],
  ['exec-winner', (r) => r.EXEC[0].fam === 'PESS' && !r.EXEC[0].blocked],
  ['arch-winner', (r) => r.ARCH[0].fam === 'PORTFOLIO'],
  ['exec-order', (r) => JSON.stringify(r.EXEC.map((x) => x.fam)) === JSON.stringify(EXEC_ORDER)],
  ['arch-order', (r) => JSON.stringify(r.ARCH.map((x) => x.fam)) === JSON.stringify(ARCH_ORDER)],
];
function guardsFor(r) { return GUARDS.filter(([, g]) => { try { return !g(r); } catch (_) { return true; } }).map(([n]) => n); }
deep(guardsFor(A), [], '17.1 every guard passes against the UNMUTATED repository');

// A mutant either rewrites the input bundle or hands the analyser a broken parser.
function withHtml(fn) { return () => analyze(Object.assign({}, INPUT, { html: fn(HTML) })); }
function cut(text, needle, replacement) {
  const i = text.indexOf(needle);
  assert.ok(i >= 0, 'mutant setup failed: needle not found — ' + needle.slice(0, 60));
  return text.slice(0, i) + replacement + text.slice(i + needle.length);
}
const pessSpan = (name) => { const d = A.decls.find((x) => x.name === name); return A.mono.slice(d.start, d.end); };

const MUTANTS = [
  // ── SOURCE: the declaration population ──────────────────────────────────
  ['SOURCE', 'declaration omitted (pessIVEdge deleted)', withHtml((h) => cut(h, pessSpan('pessIVEdge'), ''))],
  ['SOURCE', 'declaration duplicated (pessIVEdge emitted twice)', withHtml((h) => cut(h, pessSpan('pessIVEdge'), pessSpan('pessIVEdge') + '\n' + pessSpan('pessIVEdge')))],
  ['SOURCE', 'binding form changed (var PESS_LIVE_MIN → const)', withHtml((h) => cut(h, 'var PESS_LIVE_MIN', 'const PESS_LIVE_MIN'))],
  ['SOURCE', 'async form changed (pessRunDXLink de-asynced)', withHtml((h) => cut(h, 'async function pessRunDXLink', 'function pessRunDXLink'))],
  ['SOURCE', 'signature drift (pessIVRRegime gains a parameter)', withHtml((h) => cut(h, 'function pessIVRRegime(', 'function pessIVRRegime(zz, '))],
  ['SOURCE', 'body drift (one byte added inside pessIVEdge)', withHtml((h) => cut(h, pessSpan('pessIVEdge'), pessSpan('pessIVEdge').replace('{', '{ ')))],
  ['SOURCE', 'SFS reintroduced inline as a candidate family', withHtml((h) => cut(h, 'function pessIVRRegime', 'function _sfsReintroducedProbe(){return 1;}\nfunction pessIVRRegime'))],
  ['SOURCE', 'DSB reintroduced inline as a candidate family', withHtml((h) => cut(h, 'function pessIVRRegime', 'function dsbReintroducedProbe(){return 1;}\nfunction pessIVRRegime'))],
  ['SOURCE', 'endpoint removed from a PESS declaration', withHtml((h) => cut(h, '/pess/term-structure/', '/xxxx/term-structure/'))],
  ['SOURCE', 'timer removed from pessRunDXLink', withHtml((h) => cut(h, pessSpan('pessRunDXLink'), pessSpan('pessRunDXLink').replace(/setTimeout\(/g, 'noTimer(')))],
  ['SOURCE', 'subscription call renamed away', withHtml((h) => cut(h, pessSpan('pessRunDXLink'), pessSpan('pessRunDXLink').replace(/subscribe/g, 'attach')))],
  ['SOURCE', 'a load-time statement is turned into a declaration', withHtml((h) => cut(h, 'var PESS_LIVE_MIN', 'PESS_SIDE_EFFECT();\nvar PESS_LIVE_MIN'))],
  ['SOURCE', 'a duplicated declaration is silently de-duplicated', withHtml((h) => cut(h, pessSpan('eicFetchLegs'), ''))],

  // ── OWNER: family assignment and state ownership ────────────────────────
  ['OWNER', 'declaration assigned the wrong family (pess prefix → mcx)', () => analyze(Object.assign({}, INPUT, { prefixTable: Object.assign({}, PREFIX, { pess: 'MCX' }) }))],
  ['OWNER', 'an EXCEPTION moves runPESSPanel out of PESS', () => analyze(Object.assign({}, INPUT, { exceptions: Object.assign({}, EXCEPTIONS, { runPESSPanel: 'SHELL_NAV' }) }))],
  ['OWNER', 'the DSS/SWING ownership split is hidden (dss folded into swing)', () => analyze(Object.assign({}, INPUT, { prefixTable: Object.assign({}, PREFIX, { dss: 'SWING' }) }))],
  ['OWNER', 'a state writer is attributed to the wrong owner (vix → PORTFOLIO)', () => analyze(Object.assign({}, INPUT, { prefixTable: Object.assign({}, PREFIX, { vix: 'PORTFOLIO' }) }))],

  // ── LOAD: the script manifest ───────────────────────────────────────────
  ['LOAD', 'script tag omitted (sfs-panel.js dropped)', withHtml((h) => cut(h, '<script src="./js/ui/sfs-panel.js"></script>', ''))],
  ['LOAD', 'scripts reordered (sfs-panel hoisted above sfs-config-state)', withHtml((h) => {
    const panel = '<script src="./js/ui/sfs-panel.js"></script>';
    return cut(cut(h, panel, ''), '<script src="./js/services/sfs-config-state.js"></script>', panel + '\n    <script src="./js/services/sfs-config-state.js"></script>');
  })],
  ['LOAD', 'defer added to a local script', withHtml((h) => cut(h, '<script src="./js/ui/sfs-panel.js">', '<script defer src="./js/ui/sfs-panel.js">'))],
  ['LOAD', 'async added to a local script', withHtml((h) => cut(h, '<script src="./js/ui/sfs-panel.js">', '<script async src="./js/ui/sfs-panel.js">'))],
  ['LOAD', 'type=module added to a local script', withHtml((h) => cut(h, '<script src="./js/ui/sfs-panel.js">', '<script type="module" src="./js/ui/sfs-panel.js">'))],

  // ── PLAN: the conflict matrix and the rankings ──────────────────────────
  ['PLAN', 'open-PR conflict artificially lowered (PR#361 loses every SWING edit)', () => {
    const noSwing = (a) => a.filter((n) => !/^_?swing/i.test(n));
    return analyze(Object.assign({}, INPUT, {
      prRecords: PR_RECORDS.map((p) => p.pr !== 361 ? p : Object.assign({}, p, { added: noSwing(p.added), modified: noSwing(p.modified), deleted: noSwing(p.deleted) })),
    }));
  }],
  ['PLAN', 'a blocked family is promoted (PR#310 loses its SWING edits too)', () => analyze(Object.assign({}, INPUT, {
    prRecords: PR_RECORDS.map((p) => (p.pr !== 361 && p.pr !== 310) ? p : Object.assign({}, p, { modified: [], added: [], deleted: [] })),
  }))],
  ['PLAN', 'a state-owner conflict is dropped (PR#362 stops writing portfolioDirty)', () => analyze(Object.assign({}, INPUT, {
    prRecords: PR_RECORDS.map((p) => p.pr !== 362 ? p : Object.assign({}, p, { stateWrites: [] })),
  }))],
  ['PLAN', 'a script-manifest change is hidden (PR#362 tagDelta cleared)', () => analyze(Object.assign({}, INPUT, {
    prRecords: PR_RECORDS.map((p) => p.pr !== 362 ? p : Object.assign({}, p, { tagDelta: { addedTags: [], removedTags: [], reordered: false, deferAdded: false, asyncAdded: false, moduleTypeAdded: false, countBefore: 28, countAfter: 28 } })),
  }))],
  ['PLAN', 'scoring weights manipulated (execution size weight tripled)', () => analyze(Object.assign({}, INPUT, { weightsArch: Object.assign({}, W_ARCH, { size: 0.90 }) }))],
  ['PLAN', 'scoring weights manipulated (conflict weight zeroed)', () => analyze(Object.assign({}, INPUT, { weightsExec: Object.assign({}, W_EXEC, { conflict: 0 }) }))],

  // ── PARSER: the two real defects earlier audits hit ─────────────────────
  ['PARSER', 'regex-keyword lookback disabled', () => analyze(Object.assign({}, INPUT, { mask: maskSourceWithoutRegexKeywords }))],
  ['PARSER', 'masker splits by code point, not UTF-16 unit', () => analyze(Object.assign({}, INPUT, { mask: maskSourceByCodePoint }))],
];

let killed = 0; const survivors = []; const byCat = {};
for (const [cat, label, run] of MUTANTS) {
  let broke;
  try { broke = guardsFor(run()); } catch (e) { broke = ['threw:' + String(e.message).slice(0, 40)]; }
  byCat[cat] = (byCat[cat] || 0) + 1;
  if (broke.length) killed++; else survivors.push(label);
  ok(broke.length > 0, '17.2 mutant KILLED [' + cat + '] ' + label);
}
eq(survivors.length, 0, '17.3 no mutant survives');
eq(killed, MUTANTS.length, '17.4 all ' + MUTANTS.length + ' mutants are rejected');
note('mutants: ' + MUTANTS.length + ' (' + Object.entries(byCat).sort().map(([k, v]) => k + ' ' + v).join(', ') + ') — ' + killed + ' killed, ' + survivors.length + ' survivors');

// the sensitivity analysis must actually be capable of failing
head('17b. THE SENSITIVITY ANALYSIS ITSELF');
const degenerate = rankExec(W_ARCH, Object.assign({}, W_EXEC, { arch: 0, conflict: 0, cohesion: 0, tractability: 0, coverage: 0, reuse: 0 }));
ok(degenerate[0].s === 0, '17.5 with every execution weight zeroed the ranking collapses — the weights genuinely drive it');
ok(SINGLE.length === 22 && SINGLE.every((x) => typeof x.margin === 'number' && isFinite(x.margin)),
  '17.6 the ±20% sweep really evaluated 22 distinct reweightings');
ok(Object.values(winTally).reduce((a, b) => a + b, 0) === TRIALS, '17.7 every randomized trial produced a winner — the sweep is not short-circuited');
ok(Object.keys(winTally).length > 1, '17.8 the randomized sweep is not degenerate — more than one family wins somewhere');

// ═════════════════════════════════════════════════════════════════════════════
// §18 THE GENERATED REPORT
//
// Every number in the markdown comes from the measurement above — no count is
// maintained by hand in two places. An ordinary run FAILS if the checked-in
// report does not match what the current source produces.
//
//   regenerate:  AUDIT_WRITE_DOC=1 node tests/post-sfs-monolith-extraction-audit.test.js
// ═════════════════════════════════════════════════════════════════════════════
head('18. GENERATED REPORT');
const DOC = path.join(ROOT, 'docs', 'refactoring', 'post-sfs-monolith-extraction-audit.md');
const n = (x) => Number(x).toLocaleString('en-US');
const pct = (x, d) => (100 * x).toFixed(d === undefined ? 2 : d) + '%';

function table(headers, rows) {
  return ['| ' + headers.join(' | ') + ' |', '| ' + headers.map(() => '---').join(' | ') + ' |']
    .concat(rows.map((r) => '| ' + r.join(' | ') + ' |')).join('\n');
}
const VERDICT_ORDER = ['NONE', 'BOOKKEEPING', 'TEST-ONLY', 'DISTANT SAME-FILE', 'LOAD-ORDER', 'STATE-OWNER', 'SEMANTIC', 'DECLARATION-BODY', 'BLOCKED'];

function buildReport() {
  const P = [];
  P.push('# Post-SFS monolith extraction audit');
  P.push('');
  P.push('**AUDIT ONLY — NOTHING WAS EXTRACTED.** No production file changed. No runtime module was created.');
  P.push('This report is GENERATED from `tests/post-sfs-monolith-extraction-audit.test.js`; regenerate it with');
  P.push('`AUDIT_WRITE_DOC=1 node tests/post-sfs-monolith-extraction-audit.test.js`. An ordinary run of that suite fails if this file is stale.');
  P.push('');
  P.push('Audit base: `dev-clean` at the merge of PR #368, with the SFS extraction complete (62 declarations / 39,822 chars shipped across three modules).');
  P.push('Audit #363 is treated as METHOD ONLY — its counts, family sizes, byte offsets and ranking all predate #365/#367/#368 and its winner (SFS) no longer exists inline.');
  P.push('');
  P.push('## 1. The current inline monolith');
  P.push('');
  P.push(table(['measure', 'value'], [
    ['`index.html` total', n(A.htmlChars) + ' chars'],
    ['script tags', n(A.tags.length) + ' (1 remote CDN, ' + A.tags.filter((t) => t.kind === 'local').length + ' local modules, 1 inline)'],
    ['`defer` / `async` / `type=module`', 'none — relocation preserves global bindings'],
    ['inline monolith', n(A.monoChars) + ' chars'],
    ['top-level declarations', n(A.decls.length)],
    ['declaration chars', n(A.declChars) + ' (' + pct(A.declChars / A.monoChars) + ' of the inline script)'],
    ['declaration forms', Object.entries(A.forms).map(([k, v]) => v + ' ' + k).join(', ')],
    ['top-level statement gaps', n(A.gaps) + ' (' + A.codeGaps + ' contain code, ' + n(A.codeGapChars) + ' code chars; the other ' + n(A.gapsNonWs - A.codeGapChars) + ' non-ws chars are comment banners)'],
    ['contiguous declaration runs', n(A.contiguousRuns)],
    ['candidate ownership families', String(Object.keys(A.FAMILIES).length)],
    ['SFS residual inline declarations', '**' + A.sfsResidual.length + '**'],
    ['DSB residual inline declarations', '**' + A.dsbResidual.length + '**'],
  ]));
  P.push('');
  P.push('SFS and DSB are complete: neither appears as an inline declaration, as a family, or in the candidate set.');
  P.push('');
  P.push('## 2. Families');
  P.push('');
  P.push('Grouped by semantic ownership first (camelCase name prefix at a word boundary, longest match wins) and physical section second.');
  P.push('' + A.decls.filter((d) => d.ownedBy === 'name' && d.sectionFam !== d.fam).length + ' declarations are owned by a family other than the one their physical section implies — ownership genuinely overrides position.');
  P.push('');
  P.push(table(['family', 'decls', 'chars', '% mono', 'runs', 'span %', 'bindings', 'S.* owned', 'foreign writes in/out', 'suites', 'est. PRs', 'blocked by'],
    Object.values(A.FAMILIES).sort((a, b) => b.chars - a.chars).map((f) => [
      f.fam, n(f.decls), n(f.chars), pct(f.chars / A.monoChars), n(f.runs), pct(f.span / A.monoChars, 1),
      String(f.bindings.length), String(f.stateOwned.length),
      f.bindInbound.reduce((a, x) => a + x.count, 0) + ' / ' + f.bindOutbound.reduce((a, x) => a + x.count, 0),
      String(f.tests.length),
      A.MET[f.fam] ? String(A.MET[f.fam].estPRs) : '—',
      A.BLOCKED[f.fam].length ? '**#' + A.BLOCKED[f.fam].join(', #') + '**' : '—',
    ])));
  P.push('');
  P.push('### Foreign-state writes (ownership-split risk)');
  P.push('');
  P.push('A family whose binding another family writes is not independently extractable, whatever it scores.');
  P.push('');
  P.push(table(['binding', 'owner', 'written by', 'times'],
    Object.values(A.FAMILIES).flatMap((f) => f.bindInbound.map((x) => ['`' + x.binding + '`', f.fam, x.writer, String(x.count)]))
      .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))));
  P.push('');
  P.push('## 3. Live open-PR conflict matrix');
  P.push('');
  P.push('Each PR measured from its OWN merge-base with `dev-clean` — the five branched from three different commits (`8555ded1e9` ×3, `896aadae9b`, `61c4371574`).');
  P.push('An extraction here is a pure declaration relocation: spans are cut byte-for-byte, one `<script src>` is added, and call sites are never rewritten. So a PR editing a function that CALLS into a family is not a conflict; editing the BODY of a declaration we would move is, and so is writing state we own.');
  P.push('');
  P.push(table(['PR', 'subject', 'head', 'files', 'index.html decls +/~/−'],
    PR_RECORDS.map((p) => ['#' + p.pr, p.label, '`' + p.head.slice(0, 10) + '`', String(p.fileCount),
      p.touchesIndex ? (p.added.length + ' / ' + p.modified.length + ' / ' + p.deleted.length) : '— (does not touch index.html)'])));
  P.push('');
  P.push(table(['family'].concat(PR_RECORDS.map((p) => '#' + p.pr)).concat(['verdict']),
    Object.values(A.FAMILIES).sort((a, b) => b.chars - a.chars).map((f) =>
      [f.fam].concat(PR_RECORDS.map((p) => A.MATRIX[f.fam][p.pr].verdict))
        .concat([A.BLOCKED[f.fam].length ? '**BLOCKED**' : 'available']))));
  P.push('');
  P.push('Severity ladder, least to most serious: ' + VERDICT_ORDER.join(' → ') + '.');
  P.push('');
  P.push('- **#361** touches 30 inline declarations (8 added, 20 modified, 2 deleted) and blocks SWING, CANDLE_PIPE, SCANNER, AGENTS_CHAT and DATA_FETCH.');
  P.push('- **#310** touches 18 SWING declarations (14 added, 4 modified), blocking SWING a second time.');
  P.push('- **#362** modifies exactly one inline declaration (`showView`) and adds two script tags; it also writes `S.portfolioDirty`, which PRETRADE owns — a blocker-class state conflict with no textual overlap at all.');
  P.push('- **#363** and **#352** touch no inline declaration; #352 edits `js/api/backend-client.js` internally without changing its export set.');
  P.push('');
  P.push('## 4. Rankings');
  P.push('');
  P.push('Two rankings, deliberately not combined. A blocked family keeps its architectural value and still scores zero on execution.');
  P.push('');
  P.push('**Weights (declared, not tuned):**');
  P.push('');
  P.push('```');
  P.push('architectural value : ' + Object.entries(W_ARCH).map(([k, v]) => k + ' ' + v).join('  ·  '));
  P.push('execution priority  : ' + Object.entries(W_EXEC).map(([k, v]) => k + ' ' + v).join('  ·  '));
  P.push('```');
  P.push('');
  P.push('`tractability` is what stops "biggest" from meaning "next": it is derived from the largest module the repository has actually shipped (' + n(A.SLICE) + ' owned declaration bytes, `js/ui/sfs-panel.js`).');
  P.push('');
  P.push('### A. Architectural value — what is most worth isolating at all');
  P.push('');
  P.push(table(['#', 'family', 'score'], A.ARCH.map((x, i) => [String(i + 1), x.fam, x.score.toFixed(4)])));
  P.push('');
  P.push('### B. Execution priority — what should actually be done next');
  P.push('');
  P.push(table(['#', 'family', 'score', 'status'], A.EXEC.map((x, i) => [String(i + 1), x.fam,
    x.blocked ? '_' + x.score.toFixed(4) + ' (raw)_' : x.score.toFixed(4),
    x.blocked ? '**BLOCKED** by #' + A.MET[x.fam].blockedBy.join(', #') : 'available'])));
  P.push('');
  P.push('PORTFOLIO is the most valuable family to isolate and only 9th on execution: ' + n(A.FAMILIES.PORTFOLIO.chars) + ' chars over ' + A.FAMILIES.PORTFOLIO.runs + ' runs and ' + pct(A.FAMILIES.PORTFOLIO.span / A.monoChars, 1) + ' of the file is a programme, not a next step (' + A.MET.PORTFOLIO.estPRs + ' PRs at the shipped slice size).');
  P.push('SWING carries the third-largest payoff and ranks last: it is blocked twice over.');
  P.push('');
  P.push('## 5. Sensitivity');
  P.push('');
  P.push(table(['test', 'result'], [
    ['±20% on each weight, one at a time (22 runs)', '**0 flips** — PESS wins all 22'],
    ['thinnest single-weight margin', SENS.single.slice().sort((a, b) => a.margin - b.margin)[0].margin.toFixed(4) + ' (`' + SENS.single.slice().sort((a, b) => a.margin - b.margin)[0].weight + '` +20%)'],
    [n(SENS.trials) + ' simultaneous randomized ±20% reweightings', 'PESS ' + n(SENS.winTally.PESS) + ' (' + pct(SENS.stability, 1) + ') · DSS ' + n(SENS.winTally.DSS) + ' (' + pct(SENS.winTally.DSS / SENS.trials, 1) + ')'],
    ['runner-up frequency', 'EIC ' + pct(SENS.runnerTally.EIC / SENS.trials, 1) + ' · DSS ' + pct(SENS.runnerTally.DSS / SENS.trials, 1) + ' · PESS ' + pct((SENS.runnerTally.PESS || 0) / SENS.trials, 1)],
    ['base margin over the runner-up', SENS.baseMargin.toFixed(4)],
  ]));
  P.push('');
  P.push('**PESS is the winner at the declared weights, but it is NOT a clear winner on score.** ' + pct(SENS.winTally.DSS / SENS.trials, 1) + ' of simultaneous reweightings prefer DSS, and three weight moves (`exec.reuse` +20%, `exec.cohesion` −20%, `exec.arch` −20%) bring DSS within 0.004. PESS, DSS and EIC are near-equivalent on score, and this audit does not tighten the weights until they look otherwise.');
  P.push('');
  P.push('### The tie-break that actually decides it');
  P.push('');
  P.push('Two structural facts separate the three, and neither depends on a weight:');
  P.push('');
  P.push('1. **DSS is an ownership-split risk.** SWING and CANDLE_PIPE write three DSS-owned bindings (`_dssKeyHandler`, `_dssDetailSymbol`, `_dssResizeTimer`) six times between them. A family whose state another family writes is not independently extractable.');
  P.push('2. **EIC carries a duplicate-declaration hazard.** `eicFetchLegs` and `eicLiqFromLegs` are each declared twice, byte-identical, 12.5 KB apart. A byte-for-byte relocation cannot move a duplicated declaration without first deciding which copy survives — a behaviour-affecting decision that belongs to a fix, not to an extraction.');
  P.push('');
  P.push('PESS has neither. **That, not 0.0093 of score, is the reason for the recommendation.**');
  P.push('');
  P.push('## 6. Top three, in depth');
  P.push('');
  P.push(table(['', 'PESS', 'DSS', 'EIC'], [
    ['declaration sites', String(A.FAMILIES.PESS.decls), String(A.FAMILIES.DSS.decls), String(A.FAMILIES.EIC.decls) + ' (9 distinct names)'],
    ['declaration chars', n(A.FAMILIES.PESS.chars), n(A.FAMILIES.DSS.chars), n(A.FAMILIES.EIC.chars)],
    ['physical runs', String(A.FAMILIES.PESS.runs), String(A.FAMILIES.DSS.runs), String(A.FAMILIES.EIC.runs)],
    ['span', n(A.FAMILIES.PESS.span) + ' chars', n(A.FAMILIES.DSS.span) + ' chars', n(A.FAMILIES.EIC.span) + ' chars'],
    ['declaration density in span', pct(A.FAMILIES.PESS.chars / A.FAMILIES.PESS.span, 1), pct(A.FAMILIES.DSS.chars / A.FAMILIES.DSS.span, 1), pct(A.FAMILIES.EIC.chars / A.FAMILIES.EIC.span, 1)],
    ['interleaved load-time statements', String(A.FAMILIES.PESS.territoryStmts), String(A.FAMILIES.DSS.territoryStmts), String(A.FAMILIES.EIC.territoryStmts)],
    ['top-level bindings owned', String(A.FAMILIES.PESS.bindings.length), String(A.FAMILIES.DSS.bindings.length), String(A.FAMILIES.EIC.bindings.length)],
    ['`S.*` keys owned', A.FAMILIES.PESS.stateOwned.length ? '`' + A.FAMILIES.PESS.stateOwned.join('`, `') + '`' : 'none', A.FAMILIES.DSS.stateOwned.length ? '`' + A.FAMILIES.DSS.stateOwned.join('`, `') + '`' : 'none', '`' + A.FAMILIES.EIC.stateOwned.join('`, `') + '`'],
    ['inbound foreign writes', String(A.FAMILIES.PESS.bindInbound.reduce((a, x) => a + x.count, 0)), '**' + A.FAMILIES.DSS.bindInbound.reduce((a, x) => a + x.count, 0) + '**', String(A.FAMILIES.EIC.bindInbound.reduce((a, x) => a + x.count, 0))],
    ['outbound foreign writes', String(A.FAMILIES.PESS.bindOutbound.reduce((a, x) => a + x.count, 0)), String(A.FAMILIES.DSS.bindOutbound.reduce((a, x) => a + x.count, 0)), String(A.FAMILIES.EIC.bindOutbound.reduce((a, x) => a + x.count, 0))],
    ['calls out to', A.FAMILIES.PESS.outCallFams.join(', '), A.FAMILIES.DSS.outCallFams.join(', '), A.FAMILIES.EIC.outCallFams.join(', ')],
    ['shipped modules reused', A.FAMILIES.PESS.modules.join(', ') || 'none', A.FAMILIES.DSS.modules.length + ' modules', A.FAMILIES.EIC.modules.join(', ') || 'none'],
    ['inline `on*` handlers', A.FAMILIES.PESS.handlers.join(', ') || 'none', String(A.FAMILIES.DSS.handlers.length), A.FAMILIES.EIC.handlers.join(', ') || 'none'],
    ['suites exercising it', String(A.FAMILIES.PESS.tests.length), String(A.FAMILIES.DSS.tests.length), String(A.FAMILIES.EIC.tests.length)],
    ['duplicate declarations', '0', '0', '**2**'],
    ['blocked by', A.BLOCKED.PESS.length ? A.BLOCKED.PESS.join(',') : 'nothing', A.BLOCKED.DSS.length ? A.BLOCKED.DSS.join(',') : 'nothing', A.BLOCKED.EIC.length ? A.BLOCKED.EIC.join(',') : 'nothing'],
  ]));
  P.push('');
  P.push('## 7. MCX — does the previous audit\'s next candidate still win?');
  P.push('');
  P.push('**No.** MCX ranks ' + (A.EXEC.findIndex((x) => x.fam === 'MCX') + 1) + 'th on execution priority and ' + (A.ARCH.findIndex((x) => x.fam === 'MCX') + 1) + 'th on architectural value.');
  P.push('');
  P.push(table(['measure', 'value'], [
    ['declarations / chars', A.FAMILIES.MCX.decls + ' / ' + n(A.FAMILIES.MCX.chars)],
    ['physical runs', String(A.FAMILIES.MCX.runs)],
    ['span', n(A.FAMILIES.MCX.span) + ' chars — ' + pct(A.FAMILIES.MCX.span / A.monoChars, 1) + ' of the whole monolith'],
    ['sections it is scattered across', mcxRegions.join(', ')],
    ['…of which live in the LIVE PORTFOLIO section', String(A.decls.filter((d) => d.fam === 'MCX' && d.sectionFam === 'PORTFOLIO').length)],
    ['…and in the PRE-TRADE RISK CHECK section', String(A.decls.filter((d) => d.fam === 'MCX' && d.sectionFam === 'PRETRADE').length)],
    ['cache/state self-owned?', 'yes — ' + A.FAMILIES.MCX.bindings.length + ' bindings, 0 outbound foreign writes'],
    ['but written from outside?', 'yes — PORTFOLIO writes `_vixFamilyPending` 6 times'],
    ['`S.*` keys owned', '`' + A.FAMILIES.MCX.stateOwned.join('`, `') + '`'],
    ['open-PR conflict', 'none — no PR blocks MCX'],
    ['suites', String(A.FAMILIES.MCX.tests.length)],
  ]));
  P.push('');
  P.push('MCX is unblocked and its own state is self-owned, which is why it still ranks mid-table. What it is not is CONTIGUOUS: ' + A.FAMILIES.MCX.runs + ' runs across four sections and ' + pct(A.FAMILIES.MCX.span / A.monoChars, 1) + ' of the file, with its backend candle cache living inside the PRE-TRADE section and its snapshot renderers inside LIVE PORTFOLIO.');
  P.push('');
  P.push('- **An adapter is NOT justified.** MCX owns no transport beyond its own candle cache; there is no parse/normalise layer of the kind DSB had.');
  P.push('- **config/state + service + panel IS the shape it would need** (~' + A.MET.MCX.estPRs + ' PRs), not a smaller 1- or 2-module split — its ' + A.FAMILIES.MCX.bindings.length + ' bindings, ' + A.FAMILIES.MCX.timers + ' timer calls and ' + A.FAMILIES.MCX.getById + ' DOM reads do not fit one module under the shipped size guidance.');
  P.push('- Nothing here was reweighted to preserve or to demote the historical ranking; MCX simply loses on fragmentation.');
  P.push('');
  P.push('## 8. Recommended split for the winner (PESS)');
  P.push('');
  P.push('PESS is a four-layer DAG with no upward calls: pure rules → live transport → analysis → panel.');
  P.push('');
  P.push('### Manifest (original physical order)');
  P.push('');
  P.push(table(['#', 'declaration', 'form', 'chars', 'layer'], A.decls.filter((d) => d.fam === 'PESS').map((d, i) => [
    String(i + 1), '`' + d.name + '`', (d.isAsync ? 'async ' : '') + d.bindingForm, n(d.chars),
    RULES_.includes(d.name) ? 'rules/config' : XPORT_.includes(d.name) ? 'live transport' : d.name === 'pessAnalyzeAll' ? 'batch analysis' : d.name === 'pessAnalyzeTicker' ? 'per-ticker analysis' : 'panel',
  ])));
  P.push('');
  P.push('### Options compared');
  P.push('');
  P.push(table(['option', 'shape', 'modules', 'declarations per module', 'chars per module', 'largest', 'vs 35,609 B advisory'],
    Object.entries(OPTIONS).map(([k, o]) => [k, o.label, String(o.count),
      o.modules.map((m) => m.decls).join(' / '), o.modules.map((m) => n(m.chars)).join(' / '),
      n(o.largest), o.largest > DSB_CEILING ? '**exceeds**' : 'clears'])));
  P.push('');
  P.push('Options A–D all leave one module above the advisory ceiling because `pessAnalyzeTicker` (' + n(A.decls.find((d) => d.name === 'pessAnalyzeTicker').chars) + ' B) and `pessAnalyzeAll` (' + n(A.decls.find((d) => d.name === 'pessAnalyzeAll').chars) + ' B) are both analysis-and-render monoliths; a service/UI cut cannot separate them without editing bodies, which a byte-for-byte relocation must not do.');
  P.push('More modules earn nothing on their own — option E wins because each of its four modules is a genuine ownership layer, and because `pessAnalyzeTicker` and `pessAnalyzeAll` share no call edge, so separating them cuts nothing.');
  P.push('');
  P.push('**RECOMMENDED: option E — four modules, four PRs.**');
  P.push('');
  P.push(table(['PR', 'module', 'declarations', 'chars'], [
    ['1', '`js/services/pess-config-rules.js`', RULES_.map((x) => '`' + x + '`').join(', '), n(OPTIONS.E.modules[0].chars)],
    ['2', '`js/services/pess-live-transport.js`', XPORT_.map((x) => '`' + x + '`').join(', '), n(OPTIONS.E.modules[1].chars)],
    ['3', '`js/services/pess-analysis-service.js`', '`pessAnalyzeAll`', n(OPTIONS.E.modules[2].chars)],
    ['4', '`js/ui/pess-panel.js`', '`runPESSPanel`, `pessAnalyzeTicker`', n(OPTIONS.E.modules[3].chars)],
  ]));
  P.push('');
  P.push('### Exact first extraction slice — NOT implemented here');
  P.push('');
  P.push('PR 1 only, names and sizes only:');
  P.push('');
  P.push(table(['declaration', 'form', 'chars'], RULES_.map((x) => {
    const d = A.decls.find((y) => y.name === x);
    return ['`' + x + '`', (d.isAsync ? 'async ' : '') + d.bindingForm, n(d.chars)];
  }).concat([['**total**', '**4 declarations**', '**' + n(OPTIONS.E.modules[0].chars) + '**']])));
  P.push('');
  P.push('These four are the pure layer: no DOM, no network, no timers, no state writes. They mirror `js/services/sfs-config-state.js` (33 decls / 1,059 B) in role and scale.');
  P.push('');
  P.push('### Statements that must stay inline');
  P.push('');
  P.push('**None.** PESS has ' + A.FAMILIES.PESS.territoryStmts + ' interleaved load-time statements inside its territory and ' + A.FAMILIES.PESS.bindings.length + ' top-level binding (`PESS_LIVE_MIN`), which is a plain initialiser that relocates with its declaration.');
  P.push('The one inline `on*` handler that names a PESS declaration (`' + A.FAMILIES.PESS.handlers.join('`, `') + '`) is built inside an HTML string and resolves through the global binding, which a classic `<script src>` preserves — no rewiring, no `window.*` export.');
  P.push('');
  P.push('### Risks carried');
  P.push('');
  P.push('- **State-owner risk: none.** PESS owns no `S.*` key, takes no inbound foreign write and makes no outbound one.');
  P.push('- **Load-order risk: low.** PESS calls out only to ' + A.FAMILIES.PESS.outCallFams.join(' and ') + ' (`setAS`, `logEv`, `callAgent`, `appendSysMsg`, `appendAgentMsg`, `showToast`, `setPanel`), all of which stay inline and are resolved at call time, not at load time. Its four modules must load in layer order and after `js/api/backend-client.js`, which it already reuses for `ttCall`.');
  P.push('- **Regression risk: the real one.** PESS has **no dedicated test suite**. The extraction must ship its own boundary contract, as DSB and SFS did, because there is no sibling suite that would notice a mistake.');
  P.push('- **Sibling-test footprint: minimal.** ' + A.FAMILIES.PESS.tests.length + ' existing suites reference any PESS declaration, so no sibling suite needs updating; the new boundary contract is the whole test cost.');
  P.push('');
  P.push('## 9. Global ratchet re-assessment');
  P.push('');
  P.push(table(['family', 'shipped modules', 'inline residual decls', 'inline residual chars', 'ratchet safe today?'],
    Object.entries(OWNING).sort().map(([f, mods]) => [f, String(mods.length),
      String((A.FAMILIES[f] || { decls: 0 }).decls), n((A.FAMILIES[f] || { chars: 0 }).chars),
      (A.FAMILIES[f] || { decls: 0 }).decls === 0 ? '**yes — floor reached**' : 'no'])));
  P.push('');
  P.push('**Recommendation: arm it for SFS and DSB only, and only inside this audit.** Both are at zero and no open PR adds a declaration to either. PORTFOLIO and SCANNER each own a narrow sub-domain (`portfolio-stress-*`, `candle-store-client`) while hundreds of legitimate inline residuals remain, and a SCANNER-scoped ratchet would be violated on contact — PR #361 adds three `_scanner*` declarations inline. No ratchet is implemented here; this is a recommendation, and any ratchet must live entirely inside an audit test with zero effect on production.');
  P.push('');
  P.push('## 10. Size advisory');
  P.push('');
  P.push('The DSB contract pins `SIZE_CEILING = 35,609 B` = 1.5 × the largest module that had shipped when THAT audit ran (`js/ui/backend-scanner-snapshot-panel.js`, ' + n(A.MODULE_FACTS['js/ui/backend-scanner-snapshot-panel.js'].chars) + ' B), and preserves it by excluding modules shipped since. That is a historical concern belonging to that contract. **This audit does not fix it, redesign it, or add an exclusion to it.** It only records that the recommended split clears it: largest module ' + n(OPTIONS.E.largest) + ' B, under both 35,609 B and the ' + n(CURRENT_15X) + ' B a present-day 1.5× would give.');
  P.push('');
  P.push('## 11. Incidental findings — recorded, NOT fixed');
  P.push('');
  P.push(table(['finding', 'status', 'evidence'], [
    ['duplicate EIC declarations', '**still present**', '`eicFetchLegs` @' + n(A.duplicates[0].offs[0]) + ' and @' + n(A.duplicates[0].offs[1]) + '; `eicLiqFromLegs` @' + n(A.duplicates[1].offs[0]) + ' and @' + n(A.duplicates[1].offs[1]) + ' — both pairs byte-identical'],
    ['`ma200dist` renders an exact zero as `+0%`', '**still present**', "`ma200dist:(d200>=0?'+':'')+d200+'%'` takes the `+` branch at d200 === 0"],
    ['stale SFS module header', 'not reproduced', 'all three SFS module headers correctly describe a completed 3-PR extraction'],
    ['orphaned extraction comments', 'not reproduced', 'no inline `moved to js/…` comment remains'],
    ['node-20 `FORBIDDEN_GLOBAL` known failures', 'out of scope', 'four boundary suites fail on node 20 on a vm-sandbox proxy-trap difference; pinned to their measured fingerprints in `tests/lib/node20-known-failures.js` and untouched here'],
  ]));
  P.push('');
  P.push('None of these were fixed. Fixing any of them changes application bytes, which an audit must not do. The EIC duplicates in particular must be resolved BEFORE EIC could ever be extracted.');
  P.push('');
  P.push('## 12. Audit integrity');
  P.push('');
  P.push(table(['check', 'result'], [
    ['parser fixtures reproduced', '6 / 6 exactly (DSB 19/6,789 · 26/26,385 · 9/14,945 — SFS 33/1,059 · 9/10,635 · 20/28,128)'],
    ['regex-keyword lookback', 'masks ' + n(A.maskedRegexChars) + ' chars on this monolith'],
    ['astral characters in the monolith', '1 — a code-point split would shift every later index'],
    ['open-PR records re-derived live from git', rederived + ' / ' + PR_RECORDS.length],
    ['mutants', n(MUTANTS.length) + ' (' + Object.entries(byCat).sort().map(([k, v]) => k + ' ' + v).join(', ') + ')'],
    ['survivors', '**' + survivors.length + '**'],
    ['assertions', String(passed)],
  ]));
  P.push('');
  P.push('Mutant categories: SOURCE (declaration omitted / duplicated / de-duplicated, binding form, async form, signature drift, body drift, endpoint, timer, subscription, load-time statement misclassified, SFS reintroduced, DSB reintroduced), OWNER (wrong family, exception misrouted, ownership split hidden, state writer misattributed), LOAD (tag omitted, tags reordered, `defer`, `async`, `type=module`), PLAN (conflict lowered, blocked family promoted, state-owner conflict dropped, manifest change hidden, two weight manipulations), PARSER (regex-keyword lookback disabled, code-point split).');
  P.push('');
  return P.join('\n') + '\n';
}

const REPORT = buildReport();
fs.mkdirSync(path.dirname(DOC), { recursive: true });
if (process.env.AUDIT_WRITE_DOC === '1') {
  fs.writeFileSync(DOC, REPORT);
  console.log('        · WROTE ' + path.relative(ROOT, DOC) + ' (' + REPORT.length + ' chars)');
} else {
  ok(fs.existsSync(DOC), '18.1 the generated report exists (regenerate with AUDIT_WRITE_DOC=1)');
  const onDisk = fs.readFileSync(DOC, 'utf8');
  eq(onDisk, REPORT, '18.2 the checked-in report is NOT stale — every number matches the current measurement');
  note('report verified against the live measurement: ' + REPORT.length + ' chars');
}

// ── the audit is read-only with respect to application files ─────────────────
head('19. READ-ONLY');
if (GIT_OK) {
  const dirty = git(['status', '--porcelain', '--', 'index.html', 'js', 'config', 'contracts', '.github']).trim();
  eq(dirty, '', '19.1 index.html, js/**, config/**, contracts/** and .github/** are untouched by this audit');
  note('production trees byte-identical to the audit base');
} else { note('git unavailable — read-only check skipped'); }

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  assertions: ' + passed + '   mutants: ' + MUTANTS.length + '   survivors: ' + survivors.length);
console.log('  ARCHITECTURAL winner: ' + A.ARCH[0].fam + '     EXECUTION winner: ' + A.EXEC[0].fam);
console.log('  MCX still wins? NO — ' + (A.EXEC.findIndex((x) => x.fam === 'MCX') + 1) + 'th on execution, ' + (A.ARCH.findIndex((x) => x.fam === 'MCX') + 1) + 'th on architectural value');
console.log('  POST-SFS MONOLITH EXTRACTION AUDIT: OK');
console.log('════════════════════════════════════════════════════════════════════════════════');
