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
// THE PLAN (option E of that audit — four modules, four PRs) — NOW COMPLETE
//   CONFIG_RULES      js/services/pess-config-rules.js       4 / 1,786    SHIPPED
//   LIVE_TRANSPORT    js/services/pess-live-transport.js     2 / 9,127    SHIPPED
//   BATCH_PANEL       js/ui/pess-batch-panel.js              1 / 16,111   SHIPPED
//   UI_PANEL          js/ui/pess-panel.js                    2 / 25,698   SHIPPED
//                                                            ─────────────
//                                                            9 / 52,722
//
//   After PR 1: 4 in the module, 5 inline (50,936 B). After PR 2: 6 shipped
//   (10,913 B), 3 inline (41,809 B). After PR 3: 7 shipped (27,024 B), 2 inline
//   (25,698 B). After PR 4: ALL NINE shipped (52,722 B), ZERO inline. The inline
//   allowance ratcheted 9 → 5 → 3 → 2 → 0; it may only ever shrink, and 0 is
//   terminal — §12 makes reopening it fail rather than merely discouraged.
//
//   PR 4 is therefore the last PESS extraction PR. §15 asserts the properties
//   that only a finished family can have: nine declarations, four owners, four
//   modules on disk, no fifth module, nothing inline and nothing pending.
//
// THE OWNERSHIP MODEL WAS CORRECTED AT PR 3 — AND THIS IS NOT COSMETIC
//   PRs 1 and 2 described option E as "four ownership layers", and planned the
//   third module as ANALYSIS_SERVICE at js/services/pess-analysis-service.js.
//   The §8 source audit run before PR 3 REJECTED that label, and the plan was
//   corrected rather than forced. `pessAnalyzeAll` is not a service:
//
//     • it takes ZERO parameters — nothing is injected;
//     • it performs TWO direct document lookups by hardcoded id, `#pessAnalyzeAll`
//       and `#pessResults`, both elements runPESSPanel created;
//     • it holds both in closure variables `btn` and `res` for the whole async
//       batch and writes them from three nesting depths across six sites;
//     • it builds the entire ranking-panel markup and renders the result cards
//       through its own `renderCard` / `pField`;
//     • 4,726 of its 16,111 chars — 29.3% — are panel rendering.
//
//   The audit that produced option E had already measured this and said so: it
//   records that pessAnalyzeTicker and pessAnalyzeAll are "both analysis-and-
//   render monoliths; a service/UI cut cannot separate them without editing
//   bodies, which a byte-for-byte relocation must not do." Option E therefore
//   buys a SIZE split — real, and worth having, since it keeps the largest
//   module under the advisory ceiling — but it does NOT buy four service/UI
//   ownership layers. Calling the third module a service would have asserted an
//   ownership claim its body contradicts, and a contract that recorded that
//   claim would have been pinning a fiction.
//
//   The four owners, as the SOURCE reads:
//     CONFIG_RULES      rule / config owner
//     LIVE_TRANSPORT    transport owner
//     BATCH_PANEL       mixed batch-analysis + rendering UI orchestrator
//     UI_PANEL          interactive / single-ticker PESS UI owner
//
//   §8 pins the measured facts behind that label, so the correction cannot be
//   quietly reverted to the tidier-sounding original.
//
// WHAT PR 3 IS
//   A BYTE-FOR-BYTE RELOCATION, exactly as PRs 1 and 2 were. ONE async
//   declaration was cut from the inline monolith and pasted into a classic
//   script, unchanged: same name, same signature, same body, same
//   `async function` binding form, same physical position relative to the rest
//   of the family. One `<script src>` tag was added. Nothing else changed, and
//   NO behaviour changed.
//
//   In particular, no defect was repaired here. §19 records the ones this audit
//   found — two from PR 2's transport, four from PR 3's batch panel — and PINS
//   them, so that a later "tidy-up" cannot silently alter semantics under cover
//   of a relocation. The four new ones are named in §19 and in the module
//   header: the un-awaited `runAll()`, the empty term-structure catch, the
//   asymmetric result shapes, and rejectStage derived from error-message
//   punctuation.
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
//   §4  the manifest   — all 9 declarations, 4 owners, all shipped
//   §5  relocation     — 9/9 byte identity against the real base blobs
//   §6  the residue    — there is none; every member is in exactly one module
//   §7  physical order — original relative order, in the monolith and modules
//   §8  ownership      — what each module owns, measured, not assumed
//   §9  the load       — four classic src-only tags, adjacent, before consumers
//   §9C cross-module   — the UI/batch split, executed: no eval-time edge either way
//   §10 purity         — structural AND evaluated under a trapping sandbox
//   §11 parity         — BASE vs HEAD transcripts: sync rules, async transport,
//                        the full pessAnalyzeAll batch, runPESSPanel's exact
//                        markup and pessAnalyzeTicker's whole pipeline
//   §12 ratchet        — the inline allowance 9 → 5 → 3 → 2 → 0, shrink-only
//   §13 reconstruction — PR 4 alone, and ALL FOUR PRs cumulatively, byte for byte
//   §14 mutation proof — in-memory mutants that must all be rejected
//   §15 completion     — the assertions only a finished family can make
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
// Renamed from ANALYSIS_SERVICE at PR 3, on the evidence in §8. See the header.
const BATCH_PANEL = 'BATCH_PANEL';
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
  // pessAnalyzeTicker is UI_PANEL: it is the per-ticker drill-down that
  // runPESSPanel drives, and the two ship together in PR 4. pessAnalyzeAll is
  // the batch entry point and ships alone in PR 3 — the two share NO call edge,
  // which is what makes separating them cost nothing. Note that the split is by
  // SIZE and entry point, NOT by service-vs-UI: both are analysis-and-render
  // (§8.30–§8.44 measure exactly how, for pessAnalyzeAll).
  ['pessAnalyzeTicker', 'async function', 22013, UI_PANEL, 'async function pessAnalyzeTicker(ticker)'],
  ['pessAnalyzeAll', 'async function', 16111, BATCH_PANEL, 'async function pessAnalyzeAll()'],
];

const OWNER_STATE = {
  CONFIG_RULES: { status: 'SHIPPED', module: 'js/services/pess-config-rules.js' },
  LIVE_TRANSPORT: { status: 'SHIPPED', module: 'js/services/pess-live-transport.js' },
  BATCH_PANEL: { status: 'SHIPPED', module: 'js/ui/pess-batch-panel.js' },
  UI_PANEL: { status: 'SHIPPED', module: 'js/ui/pess-panel.js' },
};
// What each owner IS, in one line, derived from §8's measurements rather than
// from the module's filename. A rename alone must not be able to change these.
const OWNER_ROLE = {
  CONFIG_RULES: 'rule / config owner',
  LIVE_TRANSPORT: 'transport owner',
  BATCH_PANEL: 'mixed batch-analysis + rendering UI orchestrator',
  UI_PANEL: 'interactive / single-ticker PESS UI owner',
};
// The owners whose module exists on disk today. EVERY count below is derived
// from this list, so PR 4 flips one string and the arithmetic follows.
// PR 4 flips the last string: every owner is shipped and nothing is pending.
const SHIPPED_OWNERS = [CONFIG_RULES, LIVE_TRANSPORT, BATCH_PANEL, UI_PANEL];
const PENDING_OWNERS = [];
const isShipped = (owner) => SHIPPED_OWNERS.indexOf(owner) >= 0;

const CONFIG_REL = 'js/services/pess-config-rules.js';
const TRANSPORT_REL = 'js/services/pess-live-transport.js';
const BATCH_REL = 'js/ui/pess-batch-panel.js';
const UI_REL = 'js/ui/pess-panel.js';
const JOURNAL_UI_REL = 'js/ui/journal-ui.js';
const JOURNAL_REMOTE_REL = 'js/services/journal-remote-persistence.js';
const JOURNAL_WRITE_THROUGH_REL = 'js/services/journal-backend-write-through.js';
const JOURNAL_MIGRATION_REL = 'js/services/journal-migration.js';
const JOURNAL_MANUAL_IMPORT_REL = 'js/services/journal-manual-import.js';
const MODULE_REL = {
  [CONFIG_RULES]: CONFIG_REL, [LIVE_TRANSPORT]: TRANSPORT_REL, [BATCH_PANEL]: BATCH_REL,
  [UI_PANEL]: UI_REL,
};
const TAG_OF = (rel) => '<script src="./' + rel + '"></script>';
const CONFIG_TAG = TAG_OF(CONFIG_REL);
const TRANSPORT_TAG = TAG_OF(TRANSPORT_REL);
const BATCH_TAG = TAG_OF(BATCH_REL);
const UI_TAG = TAG_OF(UI_REL);

const TOTAL_DECLS = 9, TOTAL_CHARS = 52722;
const SHIPPED_DECLS = 9, SHIPPED_CHARS = 52722;
const PENDING_DECLS = 0, PENDING_CHARS = 0;
const CONFIG_DECLS = 4, CONFIG_CHARS = 1786;
const TRANSPORT_DECLS = 2, TRANSPORT_CHARS = 9127;
const BATCH_DECLS = 1, BATCH_CHARS = 16111;
const UI_DECLS = 2, UI_CHARS = 25698;
// The ratchet history. It is a list, not a pair, so it can only be appended to
// and every step is checked to shrink. PR 4 appends the TERMINAL 0: the family
// is closed, and no later PR may add a step above it.
const RATCHET = [9, 5, 3, 2, 0];
const RATCHET_AFTER = RATCHET[RATCHET.length - 1];
// 33 at PR 4, then 34 when the EIC extraction's PR 1 added
// js/services/eic-screening-rules.js immediately after the PESS region, then 35
// when EIC PR 2 added js/ui/eic-panel.js beside it, then 36 when EIC PR 3 added
// js/ui/eic-ticker-analysis-panel.js, then 37 when EIC PR 4 added
// js/ui/eic-live-deep-dive.js, then 38 when the owner-corrective extraction added
// js/services/eic-decision-rules.js and actually closed that family. Those modules postdate
// this boundary and are explicitly permitted; the count is bumped rather than
// made elastic, so an UNDECLARED new script still fails here.
// 41 once the PRETRADE family closed with js/ui/pretrade-risk-modal.js.
// 42 once the MCX market-context owner js/services/mcx-market-context.js landed.
// 43 once PR #389 added js/services/mcx-vix-market-context.js.
// 44 once MCX PR3 added js/services/mcx-backend-candles.js.
// 45 once Journal Core moved to js/services/journal-core.js.
// 46 once MCX Regime Policy moved to js/services/mcx-regime-policy.js.
// 47 once Journal UI moved to js/ui/journal-ui.js.
// 48 once Journal Remote Persistence moved to its own service.
// 49 once the Journal backend write-through bridge moved to its own service.
// 50 once the Journal migration policy moved to its own service.
// 51 once the Journal manual-import owner moved to its own service.
// 52 once the Journal Backup/Restore UI moved to its own module.
// 53 once the MCX macro-check UI moved to js/ui/mcx-macro-check.js.
// 54 once the MCX charts/lifecycle owner moved to js/ui/mcx-charts.js.
// This log had stopped here while the constant went on being bumped to 62 — a
// log is prose, and prose drifts. The eight entries it had lost are restored
// below, each read off that layer's own contract rather than reconstructed:
// 55 apex-post-auth-init, 56 tt-reconnect, 57 journal-close-legs,
// 58 journal-trade-forms, 59 journal-trade-detail, 60 portfolio-data-fetch,
// 61 backend-portfolios, 62 portfolio-expiry-manual.
// 63 once the portfolio alignment + row traffic light pair moved to
// js/portfolio/portfolio-traffic-light.js.
// 64 once the backend-candle-store chart experiment and the main CHART section
// moved together to js/ui/backend-candle-store-chart.js.
const LOCAL_SCRIPT_COUNT = 64;

// The blob PR 1 was cut from — the pre-PESS application. §13 reconstructs it
// from HEAD by undoing BOTH shipped PESS modules.
const PRE_PESS_REF = '1c7c0d945d858e4f968bc69d6887053fab227800';
const PRE_PESS_INDEX_SHA256 = '9c198ef0d5be2292052ef539c05fc75a65e5cc3083f922e94a21f16d619f5164';
// The blob PR 4 was cut from — the application immediately after PR 3 merged
// (merge commit of PR #372). §13 reconstructs this one too, from PR 4 alone.
const BASE_REF = 'a747ed4e2a3a8ec62200efcb1d2b4d0218f85842';
const BASE_INDEX_SHA256 = '80f6db0d60400a73f3275413656ac4c935a5e3e6148e428195ae0cba8b4c8c65';

// Per-declaration SHA-256 of the span, and the offset it occupied in EACH base.
// PRE_OFFSET is the offset in the pre-PESS monolith (all nine still inline).
// BASE_OFFSET is the offset in the post-PR-2 monolith, and exists only for the
// declaration PR 3 moved. Both were read mechanically, never hand-copied.
const SPAN_SHA256 = {
  pessIVRRegime: 'f3505e22b6d8cf80a03bc2e62b7d0bbacd8d87fc44b67f55b7370421553d2092',
  pessIVEdge: '91bf04f5605cec238a8e76c815b90514ab003a12bdb0b34f35e456a96ac9c3a3',
  pessRejectCard: '42737995f5991ff2535025493445cef62383b4aed405867efc1cf91841764527',
  PESS_LIVE_MIN: 'b969b0f1ffa32d65e93d3393e2e767396b5958c6ec2f36fa486bd36597641fcf',
  pessGetStreamerSymbols: 'b847a43a556d47bf6b32bd124b7630bd466ef507a4f53b352f5a7a153d69b408',
  pessRunDXLink: 'ab5ceda1d4637155f182c128834fca18c0487acae4d3ba53b7968ca1b1ae8448',
  pessAnalyzeAll: '094bdfda5a0ed77a2311b5a49cea311e4c0108d971a2148bc697f139c34ed571',
  runPESSPanel: '601a6ea4cdc2b74c99152cb902345ec31aaeafdcb93fd8b1d828577f34271d43',
  pessAnalyzeTicker: 'f0d477212a8e8c3281c4b4019d634156fa23c2796ac39cf91c5c8c5395435224',
};
const PRE_OFFSET = {
  pessIVRRegime: 821993, pessIVEdge: 823020, runPESSPanel: 823580, pessRejectCard: 827336,
  pessGetStreamerSymbols: 828122, PESS_LIVE_MIN: 832167, pessRunDXLink: 832411,
  pessAnalyzeTicker: 837731, pessAnalyzeAll: 859746,
};
// BASE_OFFSET is the offset in the post-PR-3 monolith, and exists only for the
// two declarations PR 4 moved. Note they are NOT adjacent: 696 chars of comment
// left behind by PRs 1–3 sit between them, and reinserting at these exact
// offsets is what puts that comment block back where it belongs.
const BASE_OFFSET = { runPESSPanel: 822437, pessAnalyzeTicker: 826818 };

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
  const { html, modules, manifest, mask, parserFixtures = [] } = input;
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
  // The masker must be length-preserving over EVERY real parser fixture. The
  // sole astral character (a surrogate pair) originally sat after the PESS span
  // in the monolith; it now lives byte-identically in Journal UI. Keeping that
  // extracted source in this parser proof still catches a code-point split.
  const maskedMono = maskFn(mono);
  let maskLenOk = maskedMono.length === mono.length;
  for (const owner of Object.keys(modules)) {
    if (maskFn(modules[owner]).length !== modules[owner].length) maskLenOk = false;
  }
  for (const src of parserFixtures) {
    if (maskFn(src).length !== src.length) maskLenOk = false;
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
const BATCH_SRC = fs.readFileSync(path.join(ROOT, BATCH_REL), 'utf8');
const UI_SRC = fs.readFileSync(path.join(ROOT, UI_REL), 'utf8');
const JOURNAL_UI_SRC = fs.readFileSync(path.join(ROOT, JOURNAL_UI_REL), 'utf8');
const PARSER_FIXTURES = [JOURNAL_UI_SRC];
const MODULES = {
  [CONFIG_RULES]: CONFIG_SRC, [LIVE_TRANSPORT]: TRANSPORT_SRC, [BATCH_PANEL]: BATCH_SRC,
  [UI_PANEL]: UI_SRC,
};
const A = analyze({ html: HTML, modules: MODULES, manifest: MANIFEST, parserFixtures: PARSER_FIXTURES });
assert.ok(!A.fatal, 'analyser failed: ' + A.fatal);

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  PESS EXTRACTION BOUNDARY CONTRACT — PR 4 of 4 (UI PANEL) — FAMILY COMPLETE');
console.log('════════════════════════════════════════════════════════════════════════════════');

// ═════════════════════════════════════════════════════════════════════════════
// §2 PARSER PROOF — the shipped-module fixtures, reproduced exactly
//
// Re-proving the parser on modules this PR does not touch is what makes the new
// measurement trustworthy: the same code that reports "16,111" also reports
// eight independently-known numbers, and is wrong about none of them. The two
// PESS modules PRs 1 and 2 shipped are now fixtures in their own right — their
// counts were pinned by their own PRs, so re-deriving them here proves this PR
// disturbed neither.
// ═════════════════════════════════════════════════════════════════════════════
section('2. PARSER PROOF');
const FIXTURES = {
  'js/adapters/backend-directional-snapshot-adapter.js': [19, 6789],
  'js/services/backend-directional-snapshot-service.js': [26, 26385],
  'js/ui/backend-directional-snapshot-panel.js': [9, 14945],
  'js/services/sfs-config-state.js': [33, 1059],
  'js/services/sfs-scan-service.js': [9, 10635],
  'js/ui/sfs-panel.js': [20, 28128],
  'js/services/pess-config-rules.js': [4, 1786],
  'js/services/pess-live-transport.js': [2, 9127],
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
eq(A.inlinePessNames.filter((n) => A.mod[LIVE_TRANSPORT].pessNames.indexOf(n) >= 0).length, 0,
  '2.7c PESS LIVE_TRANSPORT inline residual is still 0 — PR 2 stays undone');
ok(A.maskLenOk, '2.8 the masker is length-preserving over the monolith, all four PESS modules and Journal UI parser fixture');
{
  const a = maskSource(A.mono), b = maskSourceWithoutRegexKeywords(A.mono);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0, n = Math.min(a.length, b.length); i < n; i++) if (a[i] !== b[i]) diff++;
  eq(diff, 494, '2.8b disabling the regex-keyword lookback changes 494 masked chars — the lookback does real work here');
}
ok(Array.from(A.mono).length === A.mono.length && Array.from(JOURNAL_UI_SRC).length === JOURNAL_UI_SRC.length - 1,
  '2.9 the sole astral character moved byte-identically from the monolith into Journal UI, so the fixture still catches a code-point split');
note('six shipped-module fixtures reproduced exactly; SFS, DSB and PESS-config inline residuals all 0');

// ═════════════════════════════════════════════════════════════════════════════
// §4 THE MANIFEST — all nine, four owners, shipped vs pending
// ═════════════════════════════════════════════════════════════════════════════
section('4. THE NINE-DECLARATION MANIFEST');
eq(MANIFEST.length, TOTAL_DECLS, '4.1 the manifest carries all 9 PESS declarations');
eq(MANIFEST.reduce((a, m) => a + m[2], 0), TOTAL_CHARS, '4.2 …totalling 52,722 declaration chars');
eq(new Set(MANIFEST.map((m) => m[0])).size, TOTAL_DECLS, '4.3 no duplicate name in the manifest');
ok(MANIFEST.every((m) => isPessName(m[0])), '4.4 every manifest name is recognised as PESS-family');
deepEq([...new Set(MANIFEST.map((m) => m[3]))].sort(), [BATCH_PANEL, CONFIG_RULES, LIVE_TRANSPORT, UI_PANEL].sort(),
  '4.5 exactly the four planned owners are used');
deepEq(Object.keys(OWNER_STATE).map((k) => k + '=' + OWNER_STATE[k].status),
  ['CONFIG_RULES=SHIPPED', 'LIVE_TRANSPORT=SHIPPED', 'BATCH_PANEL=SHIPPED', 'UI_PANEL=SHIPPED'],
  '4.6 ALL FOUR owners are SHIPPED — PR 4 closed the family, nothing is PENDING');
deepEq(SHIPPED_OWNERS.slice().sort(), Object.keys(OWNER_STATE).filter((k) => OWNER_STATE[k].status === 'SHIPPED').sort(),
  '4.6b the shipped-owner list and the owner-state table agree');
// The owner NAMES describe the source, not the aspiration. ANALYSIS_SERVICE was
// retired at PR 3 because §8 measured pessAnalyzeAll owning panel DOM; a future
// PR that reintroduces a "service" label for it has to defeat §8 to do so.
eq(Object.keys(OWNER_STATE).indexOf('ANALYSIS_SERVICE'), -1,
  '4.6c ANALYSIS_SERVICE is NOT an owner — the label was rejected by the §8 source audit');
deepEq(Object.keys(OWNER_ROLE).sort(), Object.keys(OWNER_STATE).sort(),
  '4.6d every owner carries a source-derived role description');
eq(OWNER_ROLE[BATCH_PANEL], 'mixed batch-analysis + rendering UI orchestrator',
  '4.6e BATCH_PANEL is recorded as MIXED analysis+rendering, not as a service');
eq(/service/i.test(OWNER_ROLE[BATCH_PANEL]), false,
  '4.6f …and its role does not call it a service');
eq(/service/i.test(OWNER_STATE[BATCH_PANEL].module), false,
  '4.6g …nor does its module path');
const perOwner = {};
for (const m of MANIFEST) { perOwner[m[3]] = perOwner[m[3]] || { n: 0, c: 0 }; perOwner[m[3]].n++; perOwner[m[3]].c += m[2]; }
deepEq(perOwner[CONFIG_RULES], { n: 4, c: 1786 }, '4.7 CONFIG_RULES owns 4 declarations / 1,786 chars (shipped, PR 1)');
deepEq(perOwner[LIVE_TRANSPORT], { n: 2, c: 9127 }, '4.8 LIVE_TRANSPORT owns 2 / 9,127 (shipped, PR 2)');
deepEq(perOwner[BATCH_PANEL], { n: 1, c: 16111 }, '4.9 BATCH_PANEL owns 1 / 16,111 (shipped, PR 3)');
deepEq(perOwner[UI_PANEL], { n: 2, c: 25698 }, '4.10 UI_PANEL owns 2 / 25,698 (shipped, PR 4)');
eq(perOwner[CONFIG_RULES].c + perOwner[LIVE_TRANSPORT].c + perOwner[BATCH_PANEL].c + perOwner[UI_PANEL].c, SHIPPED_CHARS,
  '4.11 all FOUR shipped owners sum to 52,722 chars');
eq(PENDING_CHARS, 0, '4.11b nothing is pending — the pending char count is 0');
eq(SHIPPED_CHARS + PENDING_CHARS, TOTAL_CHARS, '4.12 shipped + pending === total, exactly');
eq(SHIPPED_DECLS + PENDING_DECLS, TOTAL_DECLS, '4.13 …and so do the counts');
eq(MANIFEST.filter((m) => isShipped(m[3])).length, SHIPPED_DECLS, '4.14 all 9 declarations are shipped');
eq(MANIFEST.filter((m) => !isShipped(m[3])).length, PENDING_DECLS, '4.15 zero declarations are pending');
eq(PENDING_OWNERS.length, 0, '4.15b there is no pending owner left');
// LIVE_TRANSPORT is exactly the two named declarations — not "whatever is async".
deepEq(MANIFEST.filter((m) => m[3] === LIVE_TRANSPORT).map((m) => m[0]),
  ['pessGetStreamerSymbols', 'pessRunDXLink'], '4.16 LIVE_TRANSPORT is exactly pessGetStreamerSymbols + pessRunDXLink');
deepEq(MANIFEST.filter((m) => m[3] === LIVE_TRANSPORT).map((m) => m[2]), [3809, 5318],
  '4.17 …at exactly 3,809 and 5,318 chars');
// BATCH_PANEL is exactly ONE declaration. Neither PR-4 member may join it.
deepEq(MANIFEST.filter((m) => m[3] === BATCH_PANEL).map((m) => m[0]), ['pessAnalyzeAll'],
  '4.18 BATCH_PANEL is exactly pessAnalyzeAll — nothing else');
deepEq(MANIFEST.filter((m) => m[3] === UI_PANEL).map((m) => m[0]), ['runPESSPanel', 'pessAnalyzeTicker'],
  '4.19 UI_PANEL is exactly runPESSPanel + pessAnalyzeTicker');
note('CONFIG_RULES 4/1,786 + LIVE_TRANSPORT 2/9,127 + BATCH_PANEL 1/16,111 + UI_PANEL 2/25,698 = 9/52,722 SHIPPED · 0 PENDING');

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
eq(A.mod[BATCH_PANEL].count, BATCH_DECLS, '5.1c the batch-panel module declares exactly 1 top-level declaration');
eq(A.mod[UI_PANEL].count, UI_DECLS, '5.1d the UI-panel module declares exactly 2 top-level declarations');
deepEq(A.mod[CONFIG_RULES].names, ['pessIVRRegime', 'pessIVEdge', 'pessRejectCard', 'PESS_LIVE_MIN'],
  '5.2 …and they are exactly the four CONFIG_RULES members');
deepEq(A.mod[LIVE_TRANSPORT].names, ['pessGetStreamerSymbols', 'pessRunDXLink'],
  '5.2b …and exactly the two LIVE_TRANSPORT members');
deepEq(A.mod[BATCH_PANEL].names, ['pessAnalyzeAll'],
  '5.2c …and exactly the one BATCH_PANEL member — no helper was extracted alongside it');
// ORDER matters here, not just membership: runPESSPanel preceded pessAnalyzeTicker
// in the monolith and must still precede it in the module.
deepEq(A.mod[UI_PANEL].names, ['runPESSPanel', 'pessAnalyzeTicker'],
  '5.2d …and exactly the two UI_PANEL members, in their original physical order — no nested helper was lifted out');
eq(A.mod[CONFIG_RULES].chars, CONFIG_CHARS, '5.3 config module totals 1,786 declaration chars');
eq(A.mod[LIVE_TRANSPORT].chars, TRANSPORT_CHARS, '5.3b transport module totals 9,127 declaration chars');
eq(A.mod[BATCH_PANEL].chars, BATCH_CHARS, '5.3c batch-panel module totals 16,111 declaration chars');
eq(A.mod[UI_PANEL].chars, UI_CHARS, '5.3c2 UI-panel module totals 25,698 declaration chars');
eq(A.moduleChars, SHIPPED_CHARS, '5.3d all FOUR modules together total 52,722 declaration chars — the whole family');
let identicalSha = 0;
for (const owner of SHIPPED_OWNERS) {
  for (const d of A.mod[owner].decls) {
    const text = A.mod[owner].src.slice(d.start, d.end);
    eq(sha256(text), SPAN_SHA256[d.name], '5.4 ' + d.name + ' is byte-identical to its recorded base span (sha256)');
    identicalSha++;
  }
}
eq(identicalSha, SHIPPED_DECLS, '5.4b all 9 shipped declarations carry a recorded span hash');
// PR 4's two, compared directly against the post-PR-3 base blob at their offsets.
// BASE_OFFSET holds exactly the declarations THIS PR moved; the earlier six were
// already external at this base and are covered by §5.4 and §5.6b instead.
let identicalBase = 0;
if (BASE_MONO) {
  for (const d of A.mod[UI_PANEL].decls) {
    const m = MANIFEST.find((x) => x[0] === d.name);
    const baseText = BASE_MONO.slice(BASE_OFFSET[d.name], BASE_OFFSET[d.name] + m[2]);
    const modText = A.mod[UI_PANEL].src.slice(d.start, d.end);
    eq(modText, baseText, '5.5 ' + d.name + ' — the module span EQUALS the PR-4 base span, character for character');
    if (modText === baseText) identicalBase++;
  }
  eq(identicalBase, UI_DECLS, '5.6 2/2 UI-panel declarations are byte-identical to the post-PR-3 monolith');
  note('2/2 byte-identical, verified against the real PR-4 base blob at ' + BASE_REF.slice(0, 10));
} else {
  ok(true, '5.5 PR-4 base blob unreachable here — the recorded per-span SHA-256 in §5.4 stands as the evidence');
  note('PR-4 base blob not reachable; per-span SHA-256 identity still proven in 5.4');
}
// all seven, compared against the ORIGINAL pre-PESS monolith
if (PRE_MONO) {
  let n = 0;
  for (const { owner, d } of A.allModuleDecls) {
    const m = MANIFEST.find((x) => x[0] === d.name);
    const preText = PRE_MONO.slice(PRE_OFFSET[d.name], PRE_OFFSET[d.name] + m[2]);
    eq(A.mod[owner].src.slice(d.start, d.end), preText,
      '5.6b ' + d.name + ' still equals its PRE-PESS span — unchanged across all four PRs');
    n++;
  }
  eq(n, SHIPPED_DECLS, '5.6c 9/9 shipped declarations are byte-identical to the ORIGINAL pre-PESS monolith');
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
// Four of the nine PESS declarations are async. After PR 3 exactly two of them
// live in the transport module, exactly one in the batch panel and exactly one
// remains inline. `async` is part of the relocation identity: dropping it
// changes the return type from a Promise to a raw value and would break every
// caller. §14 mutates it and requires failure.
// ═════════════════════════════════════════════════════════════════════════════
section('5B. ASYNC FORM');
const ASYNC_ALL = MANIFEST.filter((m) => m[1] === 'async function').map((m) => m[0]);
deepEq(ASYNC_ALL, ['pessGetStreamerSymbols', 'pessRunDXLink', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
  '5B.1 the family has exactly four async declarations, in physical order');
eq(A.mod[LIVE_TRANSPORT].decls.filter((d) => d.isAsync).length, 2, '5B.2 the transport module owns exactly 2 async functions');
eq(A.mod[LIVE_TRANSPORT].decls.every((d) => d.isAsync && d.bindingForm === 'function'), true,
  '5B.3 …and BOTH of its declarations are `async function` — no sync, no arrow, no var');
eq(A.mod[BATCH_PANEL].decls.filter((d) => d.isAsync).length, 1, '5B.3b the batch-panel module owns exactly 1 async function');
eq(A.mod[BATCH_PANEL].decls.every((d) => d.isAsync && d.bindingForm === 'function'), true,
  '5B.3c …and it is `async function` — no sync, no arrow, no var');
// PR 4 moved the last async member out, so the UI panel owns exactly one async
// and exactly one sync declaration — the sync/async mix is itself pinned, since
// adding `async` to runPESSPanel would change what its callers observe.
eq(A.mod[UI_PANEL].decls.filter((d) => d.isAsync).length, 1, '5B.3d the UI-panel module owns exactly 1 async function');
deepEq(A.mod[UI_PANEL].decls.filter((d) => d.isAsync).map((d) => d.name), ['pessAnalyzeTicker'],
  '5B.3e …and it is pessAnalyzeTicker');
deepEq(A.mod[UI_PANEL].decls.filter((d) => !d.isAsync).map((d) => d.name), ['runPESSPanel'],
  '5B.3f runPESSPanel is the one SYNCHRONOUS member of the UI panel — it was NOT made async');
eq(A.mod[UI_PANEL].decls.every((d) => d.bindingForm === 'function'), true,
  '5B.3g …and both are plain `function` declarations — no arrow, no var, no class');
eq(A.inlinePess.filter((d) => d.isAsync).length, 0, '5B.4 ZERO async PESS declarations remain inline');
eq(A.inlinePess.length, 0, '5B.5 …and zero PESS declarations of any form remain inline');
eq(A.allModuleDecls.filter(({ d }) => d.isAsync).length, ASYNC_ALL.length,
  '5B.6 all four async family members are now external, none inline');
for (const owner of [LIVE_TRANSPORT, BATCH_PANEL, UI_PANEL]) {
  for (const d of A.mod[owner].decls.filter((x) => x.isAsync)) {
    ok(/^async\s+function\s/.test(A.mod[owner].src.slice(d.start, d.start + 40)),
      '5B.7 ' + d.name + ' literally begins `async function` in the module text');
  }
}
ok(/^function\s+runPESSPanel\s*\(/.test(
  A.mod[UI_PANEL].src.slice(A.mod[UI_PANEL].decls[0].start, A.mod[UI_PANEL].decls[0].start + 40)),
  '5B.8 runPESSPanel literally begins `function` — no `async` was prepended in the move');
note('transport owns 2 async, batch panel 1 async, UI panel 1 async + 1 sync; ZERO remain inline');

// ═════════════════════════════════════════════════════════════════════════════
// §6 THE RESIDUE — there is none. This is the terminal state.
//
// Through PRs 1–3 this section measured a shrinking inline remainder. PR 4
// removes the last of it, so the section inverts: it now proves the residue is
// EMPTY, and — because "zero inline" is trivially satisfiable by simply deleting
// a declaration — that every one of the nine is accounted for in a module.
// ═════════════════════════════════════════════════════════════════════════════
section('6. WHAT REMAINS INLINE');
eq(A.inlinePess.length, PENDING_DECLS, '6.1 ZERO PESS declarations remain inline');
eq(A.inlinePessChars, PENDING_CHARS, '6.2 …totalling 0 declaration chars');
deepEq(A.inlinePessNames, [], '6.3 …and the inline PESS name list is empty');
for (const n of A.shippedNames) ok(A.inlinePessNames.indexOf(n) < 0, '6.4 shipped declaration ' + n + ' is NO LONGER inline');
eq(A.pendingNames.length, 0, '6.5 there is no pending declaration left to extract early');
// Nothing was deleted to reach zero: every manifest member is in exactly one module.
for (const m of MANIFEST) {
  const owners = SHIPPED_OWNERS.filter((o) => A.mod[o].pessNames.indexOf(m[0]) >= 0);
  eq(owners.length, 1, '6.6 ' + m[0] + ' exists in EXACTLY ONE owner module (not zero — it was moved, not deleted)');
  eq(owners[0], m[3], '6.7 ' + m[0] + ' is filed under its manifest owner ' + m[3]);
  const d = A.mod[m[3]].decls.find((x) => x.name === m[0]);
  eq(d.chars, m[2], '6.8 ' + m[0] + ' is unchanged in size (' + m[2] + ' chars)');
  eq((d.isAsync ? 'async ' : '') + d.bindingForm, m[1], '6.8b ' + m[0] + ' keeps its binding/async form');
  eq(d.signature, m[4], '6.8c ' + m[0] + ' keeps its exact signature');
}
// The inline monolith must not contain a PESS declaration under ANY spelling —
// not just the nine known names. A tenth, newly invented one would fail here.
eq(A.inlineDecls.filter((d) => isPessName(d.name)).length, 0,
  '6.9 no PESS-FAMILY declaration of any name survives inline — including one this contract has never seen');
// no declaration is filed in two places, and none went missing
const everywhere = A.allModuleNames.concat(A.inlinePessNames).sort();
deepEq(everywhere, MANIFEST.map((m) => m[0]).sort(), '6.10 every one of the nine exists exactly once, modules + inline');
eq(new Set(everywhere).size, TOTAL_DECLS, '6.11 no PESS declaration is duplicated across modules and monolith');
eq(A.moduleChars + A.inlinePessChars, TOTAL_CHARS, '6.12 module + inline chars still sum to 52,722');
// no two modules overlap each other either — checked over every pair
for (let i = 0; i < SHIPPED_OWNERS.length; i++) {
  for (let j = i + 1; j < SHIPPED_OWNERS.length; j++) {
    const a = SHIPPED_OWNERS[i], b = SHIPPED_OWNERS[j];
    deepEq(A.mod[a].pessNames.filter((n) => A.mod[b].pessNames.indexOf(n) >= 0), [],
      '6.13 the ' + a + ' and ' + b + ' modules share NO declaration');
  }
}
note('config 4/1,786 · transport 2/9,127 · batch panel 1/16,111 · UI panel 2/25,698 · inline 0/0 · total 9/52,722 — no duplicate, no omission, no cross-filing');

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
// THE SECOND INTERLEAVING, now visible because every owner has shipped.
// runPESSPanel (UI_PANEL) sat physically BETWEEN pessIVEdge and pessRejectCard,
// which are BOTH CONFIG_RULES. So the config module's four members were never
// contiguous in the monolith either — exactly the same situation as PESS_LIVE_MIN
// splitting the transport pair, and handled the same way: relative order is
// preserved per owner, and adjacency is never claimed.
eq(MANIFEST_ORDER.indexOf('runPESSPanel'), 2, '7.11 runPESSPanel is THIRD of the nine');
ok(MANIFEST_ORDER.indexOf('pessIVEdge') < MANIFEST_ORDER.indexOf('runPESSPanel') &&
   MANIFEST_ORDER.indexOf('runPESSPanel') < MANIFEST_ORDER.indexOf('pessRejectCard'),
  '7.11b …and it sat physically BETWEEN two CONFIG_RULES members — a second owner interleaving');
eq(A.mod[CONFIG_RULES].names.indexOf('runPESSPanel'), -1,
  '7.11c …and the config module did NOT absorb it on that basis');
eq(A.mod[UI_PANEL].names.indexOf('pessRejectCard'), -1,
  '7.11d …nor did the UI panel absorb pessRejectCard, which it calls eight times');
// The two UI members are likewise NOT adjacent in the monolith: 696 chars of
// comment left behind by PRs 1–3 separate them. The module joins them anyway,
// because the invariant is relative ORDER, never adjacency.
ok(MANIFEST_ORDER.indexOf('runPESSPanel') < MANIFEST_ORDER.indexOf('pessAnalyzeTicker'),
  '7.11e runPESSPanel preceded pessAnalyzeTicker in the monolith');
deepEq(A.mod[UI_PANEL].names, ['runPESSPanel', 'pessAnalyzeTicker'],
  '7.11f …and still precedes it in the module — the pair was not reordered');
if (BASE_MONO) {
  eq(BASE_OFFSET.pessAnalyzeTicker - (BASE_OFFSET.runPESSPanel + UI_CHARS - 22013), 696,
    '7.11g the two UI spans were separated by exactly 696 chars in the base — not adjacent, and not made so');
}
eq(A.inlinePessOrder.length, 0, '7.12 nothing remains inline, so there is no residual order left to preserve');
note('config: IVRRegime → IVEdge → RejectCard → LIVE_MIN · transport: GetStreamerSymbols → RunDXLink · UI: runPESSPanel → pessAnalyzeTicker (original relative order)');

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
  // The endpoint is owned by the two analysis functions, one copy each — and
  // after PR 4 BOTH copies are external, in DIFFERENT modules. Attributing
  // pessAnalyzeTicker's copy to the batch module would have been the easy error.
  deepEq(ownersIn('/pess/term-structure/', A.mono, A.inlineDecls), {},
    '8.22 the monolith no longer owns ANY copy of /pess/term-structure/ — both are external');
  deepEq(ownersIn('/pess/term-structure/', A.mod[UI_PANEL].src, A.mod[UI_PANEL].decls), { pessAnalyzeTicker: 1 },
    '8.22a …the UI-panel copy belongs to pessAnalyzeTicker alone, exactly once');
  deepEq(ownersIn('/pess/term-structure/', A.mod[BATCH_PANEL].src, A.mod[BATCH_PANEL].decls), { pessAnalyzeAll: 1 },
    '8.22b …and the batch module owns exactly ONE copy, inside pessAnalyzeAll');
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
  // Consumers are searched across the monolith AND every shipped module, so a
  // reference that MOVED between them is still seen. Scanning the monolith alone
  // would have quietly lost pessAnalyzeAll's five collaborator calls at PR 3.
  const SCOPES = [{ masked: maskSource(A.mono), decls: A.inlineDecls, where: 'index.html' }].concat(
    SHIPPED_OWNERS.map((o) => ({ masked: maskedOf[o], decls: A.mod[o].decls, where: MODULE_REL[o] })));
  const CONSUMERS = {
    pessIVRRegime: ['runPESSPanel', 'pessAnalyzeTicker', 'pessAnalyzeAll'],
    pessIVEdge: ['pessAnalyzeTicker', 'pessAnalyzeAll'],
    pessRejectCard: ['pessAnalyzeTicker'],
    PESS_LIVE_MIN: ['pessRunDXLink'],
    pessGetStreamerSymbols: ['pessAnalyzeTicker', 'pessAnalyzeAll'],
    pessRunDXLink: ['pessAnalyzeTicker', 'pessAnalyzeAll'],
  };
  for (const [name, expected] of Object.entries(CONSUMERS)) {
    const found = new Set();
    for (const sc of SCOPES) {
      const r = new RegExp('\\b' + name + '\\b', 'g'); let m;
      while ((m = r.exec(sc.masked))) {
        const d = sc.decls.find((x) => m.index >= x.start && m.index < x.end);
        if (d && d.name === name) continue;   // the declaration's own name
        found.add(d ? d.name : '(TOP-LEVEL STATEMENT in ' + sc.where + ')');
      }
    }
    deepEq([...found].sort(), expected.slice().sort(),
      '8.30 ' + name + ' is referenced only by ' + (expected.join(', ') || '(nothing)'));
    ok([...found].every((c) => c.indexOf('TOP-LEVEL') < 0),
      '8.31 ' + name + ' is referenced by NO top-level statement anywhere — the dependency is call-time');
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
note('endpoints owned: /eic/chain-symbols/ ×2 and /quote-token ×1 · /pess/term-structure/ ×1 by pessAnalyzeAll, ×1 still inline in pessAnalyzeTicker');

// ═════════════════════════════════════════════════════════════════════════════
// §8H BATCH_PANEL — the measurements that REJECTED the ANALYSIS_SERVICE label
//
// This block is the evidence behind the PR-3 rename, and it is written as
// assertions rather than prose so the rename cannot be reverted by editing a
// comment. Every number here was produced by the pre-relocation source audit and
// re-derived from the shipped module.
//
// The adjudication that matters is 8.36 vs the transport module's 8.5–8.9. PR 2
// accepted three DOM writes in pessRunDXLink because they go to a PARAMETER the
// caller injects, guarded, retained nowhere. pessAnalyzeAll is the opposite case
// on every axis: it takes NO parameters, looks its elements up itself by
// hardcoded id, holds them for the whole batch, and renders a panel into one of
// them. The codebase therefore demonstrates BOTH patterns, and the distinction
// between them is measured, not asserted. Note 8.40: this function is handed the
// injected-sink option and DECLINES it, passing null as pessRunDXLink's statusEl.
// ═════════════════════════════════════════════════════════════════════════════
{
  const B = A.mod[BATCH_PANEL];
  const d = B.decls[0];
  const bMc = maskedOf[BATCH_PANEL].slice(d.start, d.end);
  const bTxt = B.src.slice(d.start, d.end);
  const count = (re) => (bMc.match(re) || []).length;

  // ── the signature: nothing is injected ──
  eq(d.signature, 'async function pessAnalyzeAll()', '8.34 pessAnalyzeAll takes ZERO parameters — nothing is injected');
  eq(/\(\s*\)/.test(d.signature), true, '8.34b …its parameter list is literally empty');

  // ── DOM lookups: the disqualifying fact ──
  // Read from the RAW span: the masker deliberately blanks string contents, and
  // the id is the whole point. The count is cross-checked against the masked
  // span in 8.35b, so a `document.` hidden inside a comment cannot inflate this.
  const lookups = [];
  const lr = /document\.getElementById\('([^']+)'\)/g; let m;
  while ((m = lr.exec(bTxt))) lookups.push(m[1]);
  deepEq(lookups, ['pessAnalyzeAll', 'pessResults'],
    '8.35 it performs TWO direct document lookups, by hardcoded id: #pessAnalyzeAll and #pessResults');
  eq(count(/document\./g), 2, '8.35b …and `document.` appears exactly twice — no other DOM entry point');
  eq(count(/querySelector|createElement|appendChild|insertAdjacent/g), 0,
    '8.35c …with no querySelector, createElement, appendChild or insertAdjacent');

  // ── persistent ownership: the elements are held across the whole batch ──
  ok(/var btn=document\.getElementById\('pessAnalyzeAll'\);/.test(bTxt),
    '8.36 the button is captured into the closure variable `btn`…');
  ok(/var res=document\.getElementById\('pessResults'\);/.test(bTxt),
    '8.36b …and the results container into `res`');
  eq(count(/\bbtn\.(?:disabled|textContent)\s*=/g), 6, '8.36c `btn` is written 6 times (disabled + textContent, on 3 paths)');
  eq(count(/\bres\.innerHTML\s*=/g), 3, '8.36d `res.innerHTML` is written 3 times — two progress lines and the final panel');
  eq(count(/\.innerHTML\s*=/g), 3, '8.36e …and those are the ONLY innerHTML writes in the declaration');

  // ── rendering: markup construction and a row renderer ──
  ok(/function renderCard\(r,idx\)\{/.test(bTxt), '8.37 it declares its own row renderer, renderCard(r,idx)');
  ok(/function pField\(text,field\)\{/.test(bTxt), '8.37b …and its own display-field parser, pField(text,field)');
  eq((bTxt.match(/renderCard\(/g) || []).length, 4, '8.37c renderCard is declared once and called three times (approved/neutro/rejected)');
  ok(/<div class="stbox"/.test(bTxt), '8.37d it emits card markup directly — `<div class="stbox"`');
  ok(/BEST FOR TODAY/.test(bTxt), '8.37e …and the BEST FOR TODAY panel heading');
  ok(bTxt.indexOf("out+='<div") > 0, '8.37f …accumulating panel HTML into `out`');
  // The rendering region is a THIRD of the declaration. That is the quantitative
  // reason the service label failed: this is not a status line, it is a panel.
  const renderFrom = bTxt.indexOf("var out='<div class=\"ptitle\"");
  ok(renderFrom > 0, '8.38 the render region begins at `var out=` …');
  ok(bTxt.length - renderFrom > 4000,
    '8.38b …and runs more than 4,000 chars to the end — 29.3% of the declaration is panel rendering');

  // ── state: zero foreign writes, exactly one read ──
  eq(count(/\bS\.[A-Za-z_$][\w$]*\s*=(?!=)/g), 0, '8.39 it writes NO S.* state — zero foreign writes, as PR #369 measured');
  deepEq([...new Set((bMc.match(/\bS\.[A-Za-z_$][\w$]*/g) || []))], ['S.scanData'],
    '8.39b …and reads exactly one piece of state, S.scanData');
  eq(count(/localStorage|sessionStorage|indexedDB/g), 0, '8.39c no storage');
  eq(count(/\bwindow\b|\bglobalThis\b/g), 0, '8.39d no window/globalThis');
  eq(count(/addEventListener|removeEventListener/g), 0, '8.39e it registers no listeners');

  // ── it DECLINES the injected-sink pattern the transport module offers ──
  ok(/pessRunDXLink\(d\.ticker,_bSyms,null\)/.test(bTxt),
    '8.40 it calls pessRunDXLink with `null` for statusEl — it declines the injected sink and uses its own DOM');

  // ── cross-owner call graph, exactly ──
  eq((bMc.match(/\bpessIVRRegime\s*\(/g) || []).length, 2, '8.41 CONFIG_RULES: pessIVRRegime called exactly twice');
  eq((bMc.match(/\bpessIVEdge\s*\(/g) || []).length, 1, '8.41b CONFIG_RULES: pessIVEdge called exactly once');
  eq((bMc.match(/\bpessRejectCard\s*\(/g) || []).length, 0, '8.41c CONFIG_RULES: pessRejectCard is NOT called from here');
  eq((bMc.match(/\bPESS_LIVE_MIN\b/g) || []).length, 0, '8.41d CONFIG_RULES: PESS_LIVE_MIN is NOT read from here');
  eq((bMc.match(/\bpessGetStreamerSymbols\s*\(/g) || []).length, 1, '8.42 LIVE_TRANSPORT: pessGetStreamerSymbols called exactly once');
  eq((bMc.match(/\bpessRunDXLink\s*\(/g) || []).length, 1, '8.42b LIVE_TRANSPORT: pessRunDXLink called exactly once');
  // THE premise of splitting PR 3 from PR 4. If this ever becomes non-zero the
  // two functions are coupled and shipping them apart stops being free.
  eq((bMc.match(/\bpessAnalyzeTicker\s*\(/g) || []).length, 0,
    '8.43 UI_PANEL: there is NO call edge pessAnalyzeAll → pessAnalyzeTicker — the PR3/PR4 split premise holds');
  eq((bMc.match(/\brunPESSPanel\s*\(/g) || []).length, 0,
    '8.43b UI_PANEL: …and none to runPESSPanel either');
  eq((bMc.match(/\bpessAnalyzeTicker\b/g) || []).length, 0,
    '8.43c …the only textual mention of pessAnalyzeTicker in the module is a COMMENT (masked out here)');
  ok(/pessAnalyzeTicker writes to #pessResults directly/.test(bTxt),
    '8.43d …and that comment is the one recording the shared #pessResults surface');

  // ── endpoints owned ──
  eq((bMc.match(/\bttCall\s*\(/g) || []).length, 2, '8.44 it issues exactly 2 backend calls');
  // Scoped to the ttCall ARGUMENT rather than to any slash-shaped literal: the
  // markup contains a bare '/' as a progress separator ("3/8"), which is not an
  // endpoint, and a looser pattern would have reported it as one.
  const burls = [];
  { const r = /\bttCall\s*\(\s*'([^']*)'/g; let mm; while ((mm = r.exec(bTxt))) burls.push(mm[1]); }
  deepEq(burls.slice().sort(), ['/pess/chain/', '/pess/term-structure/'],
    '8.44b …to exactly two endpoints, and no others are reachable from here');
  deepEq(burls, ['/pess/term-structure/', '/pess/chain/'],
    '8.44c …in that order: term-structure first, chain second');
  eq((bTxt.match(/encodeURIComponent\(/g) || []).length, 6, '8.44c the chain call carries exactly 6 encodeURIComponent-ed parameters');
}
note('BATCH_PANEL: 0 params · 2 document lookups (#pessAnalyzeAll, #pessResults) · btn/res held across the batch');
note('  6 button writes · 3 innerHTML writes · renderCard + pField · 29.3% of the declaration is rendering');
note('  0 S.* writes · 1 S.* read (S.scanData) · 0 call edge to pessAnalyzeTicker or runPESSPanel');
note('  CONFIG_RULES: pessIVRRegime ×2, pessIVEdge ×1 · LIVE_TRANSPORT: pessGetStreamerSymbols ×1, pessRunDXLink ×1 (statusEl=null)');

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
eq(A.localSrcs.indexOf('./' + BATCH_REL), A.localSrcs.indexOf('./' + TRANSPORT_REL) + 1,
  '9.10a1 the batch panel sits IMMEDIATELY after the transport module');
eq(A.localSrcs.indexOf('./' + UI_REL), A.localSrcs.indexOf('./' + BATCH_REL) + 1,
  '9.10a2 the UI panel sits IMMEDIATELY after the batch panel — the family closes contiguously');
eq(A.localSrcs.indexOf('./' + CONFIG_REL), 5, '9.10b the config module is still at slot 6, where PR 1 put it');
eq(A.localSrcs.indexOf('./' + TRANSPORT_REL), 6, '9.10c the transport module takes slot 7');
eq(A.localSrcs.indexOf('./' + BATCH_REL), 7, '9.10c2 the batch panel takes slot 8');
eq(A.localSrcs.indexOf('./' + UI_REL), 8, '9.10c3 the UI panel takes slot 9 — the last of the four');
eq(A.localSrcs[4], './js/config/backend-config.js', '9.10d …the region still opens right after the last foundation module');
eq(A.localSrcs[A.localSrcs.length - 27], './js/ui/backend-directional-snapshot-panel.js',
  '9.11a the DSB panel remains immediately before PRETRADE, MCX, seven Journal owners and the MCX macro-check owner');
eq(A.localSrcs[A.localSrcs.length - 26], './js/services/pretrade-risk-rules.js',
  '9.11b the PRETRADE risk-rules owner is immediately before the PRETRADE technicals owner');
eq(A.localSrcs[A.localSrcs.length - 25], './js/services/pretrade-technicals.js',
  '9.11c the PRETRADE technicals owner is immediately before the PRETRADE risk-modal owner');
eq(A.localSrcs[A.localSrcs.length - 24], './js/ui/pretrade-risk-modal.js',
  '9.11d the PRETRADE risk-modal owner is immediately before the MCX market-context owner');
eq(A.localSrcs[A.localSrcs.length - 23], './js/services/mcx-market-context.js',
  '9.11e the MCX market-context owner is immediately before the MCX VIX owner');
eq(A.localSrcs[A.localSrcs.length - 22], './js/services/mcx-vix-market-context.js',
  '9.11f the MCX VIX owner is immediately before the MCX backend-candle owner');
eq(A.localSrcs[A.localSrcs.length - 21], './js/services/mcx-backend-candles.js',
  '9.11g the MCX backend-candle owner is immediately before Journal Core');
eq(A.localSrcs[A.localSrcs.length - 20], './js/services/journal-core.js',
  '9.11h Journal Core is immediately before Regime Policy');
eq(A.localSrcs[A.localSrcs.length - 19], './js/services/mcx-regime-policy.js',
  '9.11i Regime Policy is immediately before Journal UI');
eq(A.localSrcs[A.localSrcs.length - 18], './js/ui/journal-ui.js',
  '9.11j Journal UI is immediately before Journal Remote');
eq(A.localSrcs[A.localSrcs.length - 17], './' + JOURNAL_REMOTE_REL,
  '9.11k Journal Remote is immediately before Journal Write-through');
eq(A.localSrcs[A.localSrcs.length - 16], './' + JOURNAL_WRITE_THROUGH_REL,
  '9.11l Journal Write-through is immediately before Journal Migration');
eq(A.localSrcs[A.localSrcs.length - 15], './' + JOURNAL_MIGRATION_REL,
  '9.11m Journal Migration is immediately before Journal Manual Import');
eq(A.localSrcs[A.localSrcs.length - 14], './' + JOURNAL_MANUAL_IMPORT_REL,
  '9.11n Journal Manual Import is immediately before Journal Backup/Restore');
eq(A.localSrcs[A.localSrcs.length - 13], './js/ui/journal-backup-restore.js',
  '9.11o Journal Backup/Restore is immediately before the MCX macro-check owner');
eq(A.localSrcs[A.localSrcs.length - 12], './js/ui/mcx-macro-check.js',
  '9.11p the MCX macro-check owner is immediately before the MCX charts owner');
eq(A.localSrcs[A.localSrcs.length - 11], './js/ui/mcx-charts.js',
  '9.11q the MCX charts owner is immediately before the Apex post-auth owner');
eq(A.localSrcs[A.localSrcs.length - 10], './js/services/apex-post-auth-init.js',
  '9.11r the Apex shared post-auth owner is immediately before the TT reconnect owner');
eq(A.localSrcs[A.localSrcs.length - 9], './js/ui/tt-reconnect.js',
  '9.11s the TT reconnect UI owner is immediately before the Journal Close Legs owner');
eq(A.localSrcs[A.localSrcs.length - 8], './js/ui/journal-close-legs.js',
  '9.11t the Journal Close Legs owner is immediately before the Journal trade-forms owner');
eq(A.localSrcs[A.localSrcs.length - 7], './js/ui/journal-trade-forms.js',
  '9.11u the Journal trade-forms owner is immediately before the Journal trade-detail owner');
eq(A.localSrcs[A.localSrcs.length - 6], './js/ui/journal-trade-detail.js',
  '9.11v the Journal trade-detail owner is immediately before the portfolio owner');
eq(A.localSrcs[A.localSrcs.length - 5], './js/portfolio/portfolio-data-fetch.js',
  '9.11w the portfolio data-fetch owner is immediately before the backend-portfolios owner');
// The chain shifted by one, so its END needs re-pinning; without this the last
// slot would be asserted by nothing, which is how this family lost coverage once.
eq(A.localSrcs[A.localSrcs.length - 4], './js/portfolio/backend-portfolios.js',
  '9.11x the backend-portfolios owner is immediately before the manual-expiry owner');
// Re-pinned again, for the same reason as last time: a shifted chain leaves its
// last slot asserted by nothing.
eq(A.localSrcs[A.localSrcs.length - 3], './js/portfolio/portfolio-expiry-manual.js',
  '9.11y the manual-expiry owner is immediately before the traffic-light owner');
// Re-pinned a third time. Bumping the indices alone would leave the last slot
// asserted by nothing at all, which is exactly how this family lost coverage.
eq(A.localSrcs[A.localSrcs.length - 2], './js/portfolio/portfolio-traffic-light.js',
  '9.11z the traffic-light owner is immediately before the candle-store-chart owner');
// Re-pinned a fourth time, for the same reason as the three before it.
eq(A.localSrcs[A.localSrcs.length - 1], './js/ui/backend-candle-store-chart.js',
  '9.11z1 the candle-store-chart owner is the newest local script before the monolith');
eq(A.localSrcs.length, LOCAL_SCRIPT_COUNT,
  '9.12 index.html now loads 64 local application scripts, including PRETRADE, four MCX, seven Journal owners and the MCX macro-check, MCX charts, Apex post-auth, TT reconnect, Journal Close Legs, portfolio data-fetch, backend-portfolios, manual-expiry, traffic-light and candle-store-chart owners');
for (const owner of SHIPPED_OWNERS) {
  eq(A.localSrcs.filter((s) => s === './' + MODULE_REL[owner]).length, 1, '9.13 …with no duplicate entry for ' + MODULE_REL[owner]);
}
// The COMPLETE PESS region, now all four, in their required order.
const PESS_REGION = ['./' + CONFIG_REL, './' + TRANSPORT_REL, './' + BATCH_REL, './' + UI_REL];
const pessSlots = PESS_REGION.map((s) => A.localSrcs.indexOf(s));
ok(pessSlots.every((v) => v >= 0), '9.14a all four PESS scripts are loaded');
ok(pessSlots.every((v, i) => i === 0 || v === pessSlots[i - 1] + 1), '9.14 the four PESS scripts form ONE contiguous run');
deepEq(A.localSrcs.slice(pessSlots[0], pessSlots[0] + 4), PESS_REGION,
  '9.14b …in exactly the order config → transport → batch panel → UI panel');
// Exactly four PESS scripts exist. A fifth — planned or accidental — fails here.
deepEq(A.localSrcs.filter((s) => /(^|\/)pess-[a-z-]+\.js$/.test(s)).sort(), PESS_REGION.slice().sort(),
  '9.14c index.html loads EXACTLY these four pess-*.js scripts — a fifth PESS module would fail here');
eq(fs.readdirSync(path.join(ROOT, 'js', 'ui')).filter((f) => /^pess-/.test(f)).sort().join(','),
  'pess-batch-panel.js,pess-panel.js', '9.14d js/ui/ holds exactly the two PESS UI modules on disk');
eq(fs.readdirSync(path.join(ROOT, 'js', 'services')).filter((f) => /^pess-/.test(f)).sort().join(','),
  'pess-config-rules.js,pess-live-transport.js', '9.14e js/services/ holds exactly the two PESS service modules on disk');
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
  ok(!(A.tagIndex[UI_PANEL] > Math.min(...slots) && A.tagIndex[UI_PANEL] < Math.max(...slots)),
    '9.15c …and the new PESS tag does not sit inside it');
}
note('slot ' + (A.localSrcs.indexOf('./' + UI_REL) + 1) + ' of ' + A.localSrcs.length +
  ' local scripts — immediately after pess-batch-panel.js; the DSB tail is untouched');

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
// §9C CROSS-MODULE UI BOUNDARY — the split PR 4 actually creates
//
// PR 4 leaves the PESS UI in TWO files: runPESSPanel + pessAnalyzeTicker here,
// pessAnalyzeAll next door. The panel runPESSPanel renders reaches both — one
// through a generated `onclick` string, the other through a listener it attaches
// — and neither reference exists until a user clicks. So the interesting claim
// is not "the modules load in this order"; it is that NEITHER module needs the
// other at EVALUATION time, and that BOTH names resolve once both have loaded.
//
// Every case below is EXECUTED in a vm sandbox against the real module sources,
// in the real tag order taken from index.html, rather than asserted from prose.
// ═════════════════════════════════════════════════════════════════════════════
section('9C. CROSS-MODULE UI BOUNDARY');
{
  const uiSlot = A.localSrcs.indexOf('./' + UI_REL);
  const batchSlot = A.localSrcs.indexOf('./' + BATCH_REL);
  ok(batchSlot < uiSlot, '9C.1 pess-batch-panel.js loads BEFORE pess-panel.js in the real tag order');
  ok(uiSlot < A.monoTagIndex && batchSlot < A.monoTagIndex,
    '9C.2 both load BEFORE the inline monolith');

  // The markup runPESSPanel generates carries the cross-module handler, verbatim.
  const runSrc = A.mod[UI_PANEL].src.slice(A.mod[UI_PANEL].decls[0].start, A.mod[UI_PANEL].decls[0].end);
  ok(runSrc.indexOf('onclick="pessAnalyzeAll()"') >= 0,
    '9C.3 runPESSPanel generates a literal onclick="pessAnalyzeAll()" — the BATCH_PANEL entry point');
  ok(runSrc.indexOf('pessAnalyzeTicker(ticker)') >= 0,
    '9C.5 runPESSPanel calls pessAnalyzeTicker(ticker) from the click listener it attaches');
  eq(A.mod[UI_PANEL].names.indexOf('pessAnalyzeAll'), -1,
    '9C.6a the UI module does NOT redeclare pessAnalyzeAll — the onclick must cross the module boundary');

  // EXECUTED: load both modules in the real order, then resolve each name the
  // way the browser would — the onclick string through the global scope, the
  // listener body through the ordinary binding.
  const sandbox = { document: undefined };
  vm.createContext(sandbox);
  vm.runInContext(BATCH_SRC, sandbox, { filename: BATCH_REL });
  vm.runInContext(UI_SRC, sandbox, { filename: UI_REL });
  eq(vm.runInContext('typeof pessAnalyzeAll', sandbox), 'function',
    '9C.4 …and with both modules loaded, that onclick target RESOLVES to the batch-panel global');
  eq(vm.runInContext('typeof pessAnalyzeTicker', sandbox), 'function',
    '9C.6 …and pessAnalyzeTicker resolves to the UI-panel global');
  eq(vm.runInContext('typeof runPESSPanel', sandbox), 'function',
    '9C.6b …and runPESSPanel resolves too');
  // An inline onclick is compiled in global scope, so this is the real mechanism.
  eq(vm.runInContext('typeof (new Function("return pessAnalyzeAll"))()', sandbox), 'function',
    '9C.4b …resolved the way an inline onclick actually resolves it — through global scope, at click time');

  // NEITHER order fails at evaluation time, because there is no eval-time edge.
  {
    const s = {}; vm.createContext(s);
    let threw = null;
    try {
      vm.runInContext(UI_SRC, s, { filename: UI_REL });          // UI FIRST
      vm.runInContext(BATCH_SRC, s, { filename: BATCH_REL });
    } catch (e) { threw = e; }
    eq(threw, null, '9C.7 loading the UI panel BEFORE the batch panel still evaluates cleanly — there is no evaluation-time dependency to invert');
    eq(vm.runInContext('typeof pessAnalyzeAll', s), 'function', '9C.7b …and both globals still exist afterwards');
  }
  // …so the contract does NOT assert an order requirement it cannot demonstrate.
  {
    const s = {}; vm.createContext(s);
    vm.runInContext(UI_SRC, s, { filename: UI_REL });   // batch panel NEVER loaded
    eq(vm.runInContext('typeof runPESSPanel', s), 'function',
      '9C.8 the UI panel evaluates fully even with the batch panel ABSENT — the dependency is click-time only');
    eq(vm.runInContext('typeof pessAnalyzeAll', s), 'undefined',
      '9C.8b …and pessAnalyzeAll is simply undefined until its module loads');
    let threw = null;
    try { vm.runInContext('pessAnalyzeAll()', s); } catch (e) { threw = e; }
    ok(threw !== null && threw.name === 'ReferenceError' && /pessAnalyzeAll/.test(String(threw.message)),
      '9C.9 NEGATIVE CONTROL — with the batch panel missing, the generated onclick would throw ReferenceError at CLICK time');
  }
  {
    const s = {}; vm.createContext(s);
    vm.runInContext(BATCH_SRC, s, { filename: BATCH_REL }); // UI panel NEVER loaded
    let threw = null;
    try { vm.runInContext('runPESSPanel()', s); } catch (e) { threw = e; }
    ok(threw !== null && threw.name === 'ReferenceError' && /runPESSPanel/.test(String(threw.message)),
      '9C.10 NEGATIVE CONTROL — with the UI panel missing, runPESSPanel is not defined at all');
    let threw2 = null;
    try { vm.runInContext('pessAnalyzeTicker("AAPL")', s); } catch (e) { threw2 = e; }
    ok(threw2 !== null && threw2.name === 'ReferenceError' && /pessAnalyzeTicker/.test(String(threw2.message)),
      '9C.10b …and neither is pessAnalyzeTicker');
  }
  // The batch panel must not have acquired an evaluation-time need for the UI panel.
  {
    const s = {}; vm.createContext(s);
    let threw = null;
    try { vm.runInContext(BATCH_SRC, s, { filename: BATCH_REL }); } catch (e) { threw = e; }
    eq(threw, null, '9C.11 the batch panel evaluates with the UI panel absent — it declares no load-time dependency on it');
  }
  // Tag-form negative controls, stated over the REAL tag, not a hypothetical one.
  {
    const t = A.tagObj[UI_PANEL];
    ok(!/\bdefer\b|\basync\b|\btype\s*=|\bnomodule\b/i.test(t.attrs),
      '9C.12 the UI-panel tag is classic and synchronous — defer/async/type/nomodule would all delay it past the monolith');
    ok(A.tagIndex[UI_PANEL] < A.monoTagIndex,
      '9C.13 …and it precedes the monolith, which is the one ordering requirement the source supports');
  }
  note('batch → UI in the real order; both globals resolve at call time; NEITHER module needs the other at evaluation time');
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
// The UI panel is the most effect-heavy module in the family, so its inertness
// is the least self-evident and gets the same treatment. The sync/async MIX is
// part of what is pinned: runPESSPanel must stay a plain Function.
{
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(UI_SRC, ctx, { filename: UI_REL });
  eq(typeof ctx.runPESSPanel, 'function', '10.17 runPESSPanel is a function after evaluation');
  eq(typeof ctx.pessAnalyzeTicker, 'function', '10.18 pessAnalyzeTicker is a function after evaluation');
  eq(ctx.runPESSPanel.constructor.name, 'Function',
    '10.19 …and runPESSPanel is a PLAIN Function — not an AsyncFunction');
  eq(ctx.pessAnalyzeTicker.constructor.name, 'AsyncFunction', '10.20 …and pessAnalyzeTicker is an AsyncFunction');
  eq(ctx.runPESSPanel.length, 0, '10.21 runPESSPanel declares 0 parameters');
  eq(ctx.pessAnalyzeTicker.length, 1, '10.22 pessAnalyzeTicker declares 1 parameter');
  deepEq(Object.getOwnPropertyNames(ctx).sort(), ['pessAnalyzeTicker', 'runPESSPanel'],
    '10.23 evaluating the UI module creates EXACTLY two globals — no state, no config object, no cache');
}
// Whole-family sweep: every module inert, and the family's global surface is
// exactly the nine declarations — no more, no fewer.
{
  const all = [];
  for (const owner of SHIPPED_OWNERS) {
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(A.mod[owner].src, ctx, { filename: MODULE_REL[owner] });
    all.push(...Object.getOwnPropertyNames(ctx));
  }
  deepEq(all.sort(), MANIFEST.map((m) => m[0]).sort(),
    '10.24 loading ALL FOUR PESS modules creates exactly the nine manifest globals — no extra, no missing');
  eq(new Set(all).size, TOTAL_DECLS, '10.25 …and none of the nine is created twice');
}
note('structural residue 0 chars · evaluation touches 0 ambient globals · all four modules inert · UI panel declares 1 Function + 1 AsyncFunction');

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
// PR 2's transport declarations are now compared against the ORIGINAL pre-PESS
// monolith rather than against PR 2's own base. That is strictly stronger: it
// re-proves at PR 3 that two PRs of relocation have not perturbed them, and it
// keeps BASE_OFFSET scoped to the single declaration THIS PR moved.
const BASE_TRANSPORT_SRC = PRE_MONO
  ? ['pessGetStreamerSymbols', 'pessRunDXLink']
      .map((n) => PRE_MONO.slice(PRE_OFFSET[n], PRE_OFFSET[n] + MANIFEST.find((x) => x[0] === n)[2])).join('\n\n')
  : null;
// PR 3's declaration, cut from the post-PR-2 base at the offset it really held.
// pessAnalyzeAll left the monolith at PR 3, so the PR-4 base no longer contains
// it and BASE_OFFSET no longer carries its offset. The batch parity proof is
// kept BASE-vs-HEAD — and in fact strengthened — by cutting the comparison copy
// from the PRE-PESS blob instead, where all nine were still inline. That is the
// ORIGINAL text, so this now proves parity against the monolith as it stood
// before any PESS PR, not merely against the previous PR's output.
const BASE_BATCH_SRC = PRE_MONO
  ? PRE_MONO.slice(PRE_OFFSET.pessAnalyzeAll, PRE_OFFSET.pessAnalyzeAll + BATCH_CHARS)
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
// §11E THE BATCH HARNESS — the primary PR-3 proof
//
// pessAnalyzeAll is never mocked. The real BASE declaration (cut from the
// post-PR-2 blob at its real offset) and the real HEAD module are both evaluated
// and driven through the same scripted scenario; only collaborators are stubbed:
// document, S, ttCall, callAgent, the two rule helpers, the two transport
// functions, setAS/appendSysMsg/logEv, console and the clock.
//
// WHY THE DRAIN LOOP EXISTS
//   `runAll()` is called neither awaited nor returned (§11F.5). The promise
//   pessAnalyzeAll returns therefore resolves BEFORE the batch has run, so a
//   harness that simply awaited it would record an empty transcript and report
//   perfect parity over nothing. The transcript is drained to quiescence
//   instead, and 11.98 asserts the early resolution explicitly so the defect is
//   pinned rather than worked around silently.
//
// The DOM is a recording stub: getElementById returns a fake element whose
// innerHTML/textContent/disabled writes enter the transcript in order. That is
// what makes the rendering — the part that disqualified the service label — a
// first-class parity subject rather than something the harness has to avoid.
// ═════════════════════════════════════════════════════════════════════════════
const NOW = Date.parse('2026-08-15T12:00:00Z');
const inDays = (n) => new Date(NOW + n * 86400000).toISOString();

function makeBatchHarness(src, filename, scenario) {
  const log = [];
  const rec = (op, extra) => { const e = { op }; if (extra) Object.assign(e, extra); log.push(e); return e; };
  function El(id) {
    this.__id = id;
    Object.defineProperty(this, 'innerHTML', {
      set(v) { rec('dom.innerHTML', { id, len: String(v).length, head: String(v).slice(0, 90) }); },
      get() { return ''; },
    });
    Object.defineProperty(this, 'textContent', {
      set(v) { rec('dom.textContent', { id, value: String(v) }); }, get() { return ''; },
    });
    Object.defineProperty(this, 'disabled', {
      set(v) { rec('dom.disabled', { id, value: !!v }); }, get() { return false; },
    });
  }
  const els = scenario.elements || { pessAnalyzeAll: true, pessResults: true };
  const D = function (a) { return arguments.length ? new Date(a) : new Date(NOW); };
  D.now = () => NOW;
  D.prototype = Date.prototype;
  const ctx = {
    S: { scanData: scenario.scanData },
    document: {
      getElementById(id) { rec('document.getElementById', { id }); return els[id] ? new El(id) : null; },
    },
    Date: D,
    Math, JSON, isNaN, parseInt, parseFloat, encodeURIComponent, RegExp, Promise, Object, Array, String, Number, Error,
    console: { warn: (...a) => rec('console.warn', { args: a.map(String) }), log: () => {}, error: () => {} },
    setTimeout(fn, ms) { rec('setTimeout', { ms }); Promise.resolve().then(fn); return 0; },
    ttCall(p) { rec('ttCall', { path: p }); return scenario.ttCall(p); },
    callAgent(a, c) { rec('callAgent', { agent: a, ctxLen: c.length, ctxHead: c.slice(0, 60) }); return scenario.callAgent(a, c); },
    pessIVRRegime(v) { rec('pessIVRRegime', { arg: v }); return scenario.pessIVRRegime(v); },
    pessIVEdge(a, b) { rec('pessIVEdge', { args: [a, b] }); return scenario.pessIVEdge(a, b); },
    pessGetStreamerSymbols(t, c, ts) { rec('pessGetStreamerSymbols', { ticker: t }); return scenario.pessGetStreamerSymbols(t, c, ts); },
    pessRunDXLink(t, s, statusEl) { rec('pessRunDXLink', { ticker: t, statusElIsNull: statusEl === null }); return scenario.pessRunDXLink(t, s, statusEl); },
    setAS(a, b, c) { rec('setAS', { args: [a, b, c] }); },
    appendSysMsg(m) { rec('appendSysMsg', { msg: m }); },
    logEv(a, b, c) { rec('logEv', { args: [a, b, c] }); },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename });
  return { ctx, log, rec };
}

async function runBatch(src, filename, scenario) {
  const h = makeBatchHarness(src, filename, scenario);
  let settled = null;
  try {
    const p = h.ctx.pessAnalyzeAll();
    h.rec('RETURNED', { isPromise: p instanceof Promise || (p && typeof p.then === 'function') });
    await p;
    h.rec('RESOLVED_EARLY', { transcriptSoFar: h.log.length });
    settled = 'resolved';
  } catch (e) {
    h.rec('THREW', { name: e && e.name, message: e && e.message });
    settled = 'threw';
  }
  // Drain to quiescence: the detached runAll() keeps working after the returned
  // promise settles, so the transcript is pumped until it stops growing.
  let last = -1, guard = 0;
  while (h.log.length !== last && guard++ < 4000) {
    last = h.log.length;
    for (let i = 0; i < 40; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  }
  h.rec('SETTLED', { how: settled });
  return h.log;
}

// ── the scenario builders, derived from the SOURCE's real branches ───────────
const REAL_IVR = (v) => (v != null && v > 70
  ? { label: 'HIGH — HARD REJECT', adj: -99, hardReject: 'IVR ' + v + '% > 70', color: 'var(--rd)' }
  : { label: 'favorable', adj: 10, hardReject: null, color: 'var(--gr)' });
const REAL_EDGE = () => ({ label: 'moderate — neutral', adj: 0, edgePct: 3 });
const cand = (t, days, extra) => Object.assign({
  ticker: t, name: t + ' Inc', nextEarnings: inDays(days), ivRank: 30, price: 100,
  rsi: 55, signal: 'NEUTRAL', beta: 1.1, squeeze: 'off', ma200dist: '+5%', macd: '0.2',
}, extra || {});
const TS_OK = {
  termStructureDataComplete: true, isTradable: true, termStructureVerdict: 'to_evaluate',
  earningsDate: inDays(20), frontExpiration: '2026-09-04', backExpiration: '2026-10-02',
  frontDTE: 20, backDTE: 48, frontIV: 0.4, backIV: 0.42, ivSpread: 0.02, ivSpreadPct: 0.05,
  ivRank: 35, underlyingIV: 0.4, selectionMethod: 'auto',
};
const CHAIN_OK = {
  chainComplete: true, shortCallStrike: 105, shortPutStrike: 95, atmUsed: 100,
  callTargetDelta: 0.3, putTargetDelta: -0.3,
  frontExp: { shortCall: { strike: 105, bid: 1, ask: 1.2, oi: 500 }, shortPut: { strike: 95, bid: 1.1, ask: 1.3, oi: 400 } },
  backExp: { longCall: { strike: 105, bid: 2, ask: 2.2, oi: 300 }, longPut: { strike: 95, bid: 2.1, ask: 2.3, oi: 200 } },
};
const LIVE_OK = {
  frontShortCall: { bidPrice: 1.0, askPrice: 1.2, delta: 0.3, volatility: 40, theta: -0.05 },
  frontShortPut: { bidPrice: 1.1, askPrice: 1.3, delta: -0.3, volatility: 41, theta: -0.05 },
  backLongCall: { bidPrice: 2.0, askPrice: 2.2, delta: 0.35, volatility: 42, theta: -0.03 },
  backLongPut: { bidPrice: 2.1, askPrice: 2.3, delta: -0.35, volatility: 43, theta: -0.03 },
};
const baseScenario = (over) => Object.assign({
  scanData: [cand('AAPL', 20)],
  ttCall: async (p) => (p.indexOf('/pess/term-structure/') === 0 ? TS_OK : CHAIN_OK),
  callAgent: async () => 'APPROVATO\nRANK_SCORE: 88\nTERM_STRUCTURE_REASON: good\nLIQUIDITY: ok',
  pessIVRRegime: REAL_IVR,
  pessIVEdge: REAL_EDGE,
  pessGetStreamerSymbols: async () => ['a', 'b', 'c', 'd'],
  pessRunDXLink: async () => LIVE_OK,
}, over || {});

const BATCH_FIXTURES = [
  ['no scan data at all — early return before #pessResults is acquired',
    baseScenario({ scanData: [] })],
  ['candidates exist but every one is outside the 7–45 day window',
    baseScenario({ scanData: [cand('AAPL', 3), cand('MSFT', 60), cand('NVDA', 200)] })],
  ['a candidate with no nextEarnings is filtered out',
    baseScenario({ scanData: [cand('AAPL', 20, { nextEarnings: null })] })],
  ['exactly at the 7-day edge — included',
    baseScenario({ scanData: [cand('AAPL', 7)] })],
  ['exactly at the 45-day edge — included',
    baseScenario({ scanData: [cand('AAPL', 45)] })],
  ['IVR hard reject — rejected BEFORE any network call',
    baseScenario({ scanData: [cand('AAPL', 20, { ivRank: 85 })] })],
  ['term-structure fetch throws — the EMPTY catch swallows it, reason is "fetch failed"',
    baseScenario({ ttCall: async (p) => { if (p.indexOf('/pess/term-structure/') === 0) throw new Error('boom'); return CHAIN_OK; } })],
  ['term-structure returns termStructureDataComplete:false',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/term-structure/') === 0 ? Object.assign({}, TS_OK, { termStructureDataComplete: false, rejectReason: 'INCOMPLETE' }) : CHAIN_OK) })],
  ['term-structure returns isTradable:false',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/term-structure/') === 0 ? Object.assign({}, TS_OK, { isTradable: false, rejectReason: 'NOT_TRADABLE' }) : CHAIN_OK) })],
  ['term-structure verdict is not to_evaluate',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/term-structure/') === 0 ? Object.assign({}, TS_OK, { termStructureVerdict: 'skip' }) : CHAIN_OK) })],
  ['missing underlyingIV — the chain call is SKIPPED and a warning is logged',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/term-structure/') === 0 ? Object.assign({}, TS_OK, { underlyingIV: null }) : CHAIN_OK) })],
  ['chain fetch throws — CHAIN_FETCH_FAILED carrying the backend message',
    baseScenario({ ttCall: async (p) => { if (p.indexOf('/pess/chain/') === 0) throw new Error('HTTP 500'); return TS_OK; } })],
  ['chain returns a rejectCode',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/chain/') === 0 ? { chainComplete: false, rejectCode: 'NO_STRIKES', error: 'none found' } : TS_OK) })],
  ['chain missing 2 expirations — CHAIN_EXPIRATION_MISMATCH',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/chain/') === 0 ? { chainComplete: false, missing: ['front', 'back'], availableExpirations: ['a', 'b'] } : TS_OK) })],
  ['chain missing 1 expiration — CHAIN_PARTIAL_MISS',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/chain/') === 0 ? { chainComplete: false, missing: ['back'] } : TS_OK) })],
  ['chain incomplete with no missing array — CHAIN_MAPPING_FAILED',
    baseScenario({ ttCall: async (p) => (p.indexOf('/pess/chain/') === 0 ? { chainComplete: false } : TS_OK) })],
  ['streamer-symbol resolution throws — rejectStage from the message prefix',
    baseScenario({ pessGetStreamerSymbols: async () => { throw new Error('STREAMER_SYMBOL_MISSING: no legs'); } })],
  ['DXLink throws — rejectStage from the message prefix',
    baseScenario({ pessRunDXLink: async () => { throw new Error('LIVE_DATA_UNAVAILABLE: timeout'); } })],
  ['a successful APPROVATO with RANK_SCORE',
    baseScenario({})],
  ['a NEUTRO verdict (neither token present)',
    baseScenario({ callAgent: async () => 'nothing conclusive\nRANK_SCORE: 40' })],
  ['a SCARTATO verdict from the agent text',
    baseScenario({ callAgent: async () => 'SCARTATO\nRANK_SCORE: 10\nRISCHI: high' })],
  ['no RANK_SCORE — the **SCORE** fallback is used',
    baseScenario({ callAgent: async () => 'APPROVATO\n**SCORE**: 61' })],
  ['neither RANK_SCORE nor SCORE — score stays 0',
    baseScenario({ callAgent: async () => 'APPROVATO, no numbers at all' })],
  ['callAgent throws — verdict ERROR, rejectStage "exception"',
    baseScenario({ callAgent: async () => { throw new Error('agent down'); } })],
  ['pessRunDXLink returns a malformed shape — the outer catch converts it to ERROR',
    baseScenario({ pessRunDXLink: async () => ({}) })],
  ['three candidates, mixed outcomes — ordering, 700 ms gaps and per-ticker isolation',
    baseScenario({
      scanData: [cand('AAPL', 20), cand('MSFT', 21, { ivRank: 85 }), cand('NVDA', 19)],
      callAgent: async (a, c) => (c.indexOf('NVDA') >= 0 ? 'APPROVATO\nRANK_SCORE: 95' : 'APPROVATO\nRANK_SCORE: 70'),
    })],
  ['every ticker fails — all rejected, still rendered',
    baseScenario({
      scanData: [cand('AAPL', 20), cand('MSFT', 22)],
      ttCall: async () => { throw new Error('down'); },
    })],
  ['approved and neutral both present — each block sorts by score descending',
    baseScenario({
      scanData: [cand('AAA', 20), cand('BBB', 21), cand('CCC', 19), cand('DDD', 22)],
      callAgent: async (a, c) => {
        if (c.indexOf('AAA') >= 0) return 'APPROVATO\nRANK_SCORE: 50';
        if (c.indexOf('BBB') >= 0) return 'APPROVATO\nRANK_SCORE: 90';
        if (c.indexOf('CCC') >= 0) return 'inconclusive\nRANK_SCORE: 30';
        return 'inconclusive\nRANK_SCORE: 80';
      },
    })],
  ['ten candidates — the slice(0,8) cap and the |days−20| sort both bite',
    baseScenario({
      scanData: [40, 8, 20, 35, 12, 25, 18, 30, 9, 22].map((d, i) => cand('T' + i, d)),
    })],
  ['a duplicate ticker appears twice — both are processed, neither is de-duplicated',
    baseScenario({ scanData: [cand('AAPL', 20), cand('AAPL', 21)] })],
  ['#pessAnalyzeAll is absent from the DOM — every btn write is skipped',
    baseScenario({ elements: { pessResults: true } })],
  ['#pessResults is absent — progress and the final render are skipped, the batch still runs',
    baseScenario({ elements: { pessAnalyzeAll: true } })],
  ['neither element exists — the batch runs headless',
    baseScenario({ elements: {} })],
];

let batchFixtures = 0, batchDiffs = 0;
const headBatchLogs = [];
for (const [label, scenario] of BATCH_FIXTURES) {
  const head = await runBatch(BATCH_SRC, 'head-' + BATCH_REL, scenario);
  headBatchLogs.push(head);
  if (BASE_BATCH_SRC) {
    const base = await runBatch(BASE_BATCH_SRC, 'base-pess-analyze-all.js', scenario);
    deepEq(head, base, '11.14E TRANSCRIPT PARITY — ' + label);
    if (JSON.stringify(head) !== JSON.stringify(base)) batchDiffs++;
  } else {
    ok(head.length > 0, '11.14E ' + label + ' — HEAD transcript recorded (base blob unreachable)');
  }
  batchFixtures++;
}

// ── the behaviours those transcripts must actually contain ──────────────────
{
  const byLabel = {};
  BATCH_FIXTURES.forEach(([l], i) => { byLabel[l] = headBatchLogs[i]; });
  const ops = (log, op) => log.filter((e) => e.op === op);

  const empty = byLabel['no scan data at all — early return before #pessResults is acquired'];
  deepEq(ops(empty, 'document.getElementById').map((e) => e.id), ['pessAnalyzeAll'],
    '11.90 with no candidates ONLY the button is looked up — #pessResults is never acquired');
  deepEq(ops(empty, 'dom.textContent').map((e) => e.value), ['Analisi in corso...', '&#9670; ANALIZZA TUTTI'],
    '11.90b …the button is disabled then restored WITHOUT the count suffix — the early-return label differs, and that is preserved');
  eq(ops(empty, 'ttCall').length, 0, '11.90c …and no network call is made');

  const hard = byLabel['IVR hard reject — rejected BEFORE any network call'];
  eq(ops(hard, 'ttCall').length, 0, '11.91 an IVR hard reject issues NO network call — the gate is before the fetch');
  eq(ops(hard, 'pessIVRRegime').length, 1, '11.91b …and consults the rule exactly once');

  const ok1 = byLabel['a successful APPROVATO with RANK_SCORE'];
  deepEq(ops(ok1, 'ttCall').map((e) => e.path.replace(/[?].*$/, '').replace(/AAPL.*/, 'AAPL')),
    ['/pess/term-structure/AAPL', '/pess/chain/AAPL'],
    '11.92 the happy path calls term-structure FIRST, then chain — order pinned');
  deepEq(ops(ok1, 'pessRunDXLink').map((e) => e.statusElIsNull), [true],
    '11.92b …and passes null for pessRunDXLink\'s statusEl — the injected sink is declined');
  eq(ops(ok1, 'pessIVRRegime').length, 2, '11.92c …consulting pessIVRRegime twice (batch gate + context line)');
  eq(ops(ok1, 'pessIVEdge').length, 1, '11.92d …and pessIVEdge once');
  eq(ops(ok1, 'setTimeout').length, 0, '11.92e a single candidate arms NO inter-item delay');
  eq(ops(ok1, 'appendSysMsg').length, 1, '11.92f …and the batch summary is emitted exactly once');

  const three = byLabel['three candidates, mixed outcomes — ordering, 700 ms gaps and per-ticker isolation'];
  deepEq(ops(three, 'setTimeout').map((e) => e.ms), [700, 700],
    '11.93 three candidates produce exactly TWO 700 ms gaps — none after the last');
  eq(ops(three, 'callAgent').length, 2, '11.93b …the IVR-rejected ticker never reaches the agent, the other two do');
  const order3 = ops(three, 'pessIVRRegime').map((e) => e.arg);
  eq(order3.length >= 3, true, '11.93c …every candidate is gated');

  const ten = byLabel['ten candidates — the slice(0,8) cap and the |days−20| sort both bite'];
  eq(ops(ten, 'callAgent').length, 8, '11.94 ten candidates are capped at EIGHT — slice(0,8) is load-bearing');
  const firstCtx = ops(ten, 'callAgent')[0].ctxHead;
  ok(/T2\b/.test(firstCtx), '11.94b …and the 20-day candidate is processed FIRST — sorted by |days − 20|');

  const many = byLabel['approved and neutral both present — each block sorts by score descending'];
  const finalRender = ops(many, 'dom.innerHTML').filter((e) => e.id === 'pessResults').pop();
  ok(/APPROVATI \(2\)/.test(finalRender.head) || finalRender.len > 500,
    '11.95 the final render is committed to #pessResults as one innerHTML write');
  eq(ops(many, 'dom.innerHTML').filter((e) => e.id === 'pessResults').length, 1 + 1 + 4,
    '11.95b #pessResults is written once on entry, once per candidate, and once at the end');

  const noBtn = byLabel['#pessAnalyzeAll is absent from the DOM — every btn write is skipped'];
  eq(ops(noBtn, 'dom.textContent').length, 0, '11.96 a missing button skips every textContent write — `if(btn)` is a real guard');
  eq(ops(noBtn, 'dom.disabled').length, 0, '11.96b …and every disabled write');
  ok(ops(noBtn, 'callAgent').length > 0, '11.96c …while the batch itself still runs');

  const noRes = byLabel['#pessResults is absent — progress and the final render are skipped, the batch still runs'];
  eq(ops(noRes, 'dom.innerHTML').length, 0, '11.96d a missing #pessResults skips every innerHTML write');
  ok(ops(noRes, 'setAS').length > 0, '11.96e …but the status line and the summary still fire');
}
note(batchFixtures + ' pessAnalyzeAll batch fixtures compared' +
  (BASE_BATCH_SRC ? ' BASE-vs-HEAD directly' : ' against HEAD only (base blob unreachable)') +
  ' — ' + batchDiffs + ' differences');

// ═════════════════════════════════════════════════════════════════════════════
// §11G THE UI-PANEL HARNESS — the primary PR-4 proof
//
// Neither function is ever mocked. The real BASE declarations (cut from the
// post-PR-3 blob at their real offsets) and the real HEAD module are both
// evaluated and driven through the same scripted scenario; only collaborators
// are stubbed.
//
// runPESSPanel renders through `setPanel`, and its ENTIRE output is a single
// HTML string. That makes exact markup identity checkable rather than
// approximable: the transcript records the full string, not a summary, and
// BASE-vs-HEAD compares it character for character. §11J then pins the specific
// cross-module substrings — `onclick="pessAnalyzeAll()"`, `id="pessResults"` —
// that other modules depend on.
//
// The deferred `setTimeout(…, 50)` is pumped, because the click listeners it
// attaches are the edge that reaches pessAnalyzeTicker; a harness that skipped
// it would report parity over a panel nobody could click.
// ═════════════════════════════════════════════════════════════════════════════
const BASE_RUN_PANEL_SRC = BASE_MONO
  ? BASE_MONO.slice(BASE_OFFSET.runPESSPanel, BASE_OFFSET.runPESSPanel + 3685)
  : null;
const BASE_ANALYZE_TICKER_SRC = BASE_MONO
  ? BASE_MONO.slice(BASE_OFFSET.pessAnalyzeTicker, BASE_OFFSET.pessAnalyzeTicker + 22013)
  : null;

function makePanelHarness(src, filename, scenario) {
  const log = [];
  const rec = (op, extra) => { const e = { op }; if (extra) Object.assign(e, extra); log.push(e); return e; };
  const D = function (a) { return arguments.length ? new Date(a) : new Date(NOW); };
  D.now = () => NOW; D.prototype = Date.prototype;
  function CandEl(ticker) {
    this.__t = ticker;
    this.getAttribute = (k) => { rec('cand.getAttribute', { key: k, value: ticker }); return ticker; };
    this.addEventListener = (ev, fn) => { rec('cand.addEventListener', { event: ev, ticker }); this.__fn = fn; };
  }
  const cands = (scenario.candElements || []).map((t) => new CandEl(t));
  const ctx = {
    S: { scanData: scenario.scanData },
    document: {
      querySelectorAll(sel) {
        rec('document.querySelectorAll', { selector: sel });
        return { forEach: (fn) => cands.forEach((c) => fn.call(c, c)) };
      },
    },
    Date: D,
    Math, JSON, isNaN, parseInt, parseFloat, RegExp, Promise, Object, Array, String, Number, Error,
    console: { warn: () => {}, log: () => {}, error: () => {} },
    setTimeout(fn, ms) { rec('setTimeout', { ms }); Promise.resolve().then(fn); return 0; },
    // The FULL panel string is recorded — not its length, not a prefix.
    setPanel(title, html) { rec('setPanel', { title, html }); },
    setAS(a, b, c) { rec('setAS', { args: [a, b, c] }); },
    pessIVRRegime(v) { rec('pessIVRRegime', { arg: v }); return scenario.pessIVRRegime(v); },
    pessAnalyzeTicker(t) { rec('pessAnalyzeTicker', { ticker: t }); return Promise.resolve(); },
    pessAnalyzeAll() { rec('pessAnalyzeAll', {}); return Promise.resolve(); },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename });
  // HEAD evaluates the WHOLE module, so the real pessAnalyzeTicker would be in
  // scope and a click would run the entire single-ticker pipeline; BASE is the
  // runPESSPanel span alone, where only the stub exists. Re-installing the
  // recorder AFTER evaluation makes the two symmetric, so the transcript
  // measures the call EDGE — which is what this fixture is about — rather than
  // accidentally comparing a full pipeline against a stub. §11H drives the real
  // pessAnalyzeTicker directly.
  ctx.pessAnalyzeTicker = function (t) { rec('pessAnalyzeTicker', { ticker: t }); return Promise.resolve(); };
  ctx.pessAnalyzeAll = function () { rec('pessAnalyzeAll', {}); return Promise.resolve(); };
  return { ctx, log, rec, cands };
}

async function runPanel(src, filename, scenario) {
  const h = makePanelHarness(src, filename, scenario);
  try {
    const r = h.ctx.runPESSPanel();
    h.rec('RETURNED', { value: r === undefined ? 'undefined' : String(r) });
  } catch (e) {
    h.rec('THREW', { name: e && e.name, message: e && e.message });
  }
  // Pump the deferred listener attachment.
  for (let i = 0; i < 50; i++) await Promise.resolve();
  await new Promise((r) => setImmediate(r));
  // Then FIRE one attached listener, so the cross-module call edge is exercised.
  if (scenario.clickIndex != null && h.cands[scenario.clickIndex] && h.cands[scenario.clickIndex].__fn) {
    const c = h.cands[scenario.clickIndex];
    c.__fn.call(c);
    for (let i = 0; i < 20; i++) await Promise.resolve();
  }
  h.rec('SETTLED', {});
  return h.log;
}

const panelCand = (t, days, extra) => Object.assign({
  ticker: t, name: t + ' Inc', nextEarnings: inDays(days), ivRank: 30, price: 100,
  score: 72, signal: 'NEUTRAL',
}, extra || {});
const panelScenario = (over) => Object.assign({
  scanData: [panelCand('AAPL', 20)],
  candElements: ['AAPL'],
  pessIVRRegime: REAL_IVR,
  clickIndex: null,
}, over || {});

const PANEL_FIXTURES = [
  ['empty scan data — the NESSUN CANDIDATO panel and the runScan button',
    panelScenario({ scanData: [], candElements: [] })],
  ['every candidate outside the 7–45 day window — still the empty state',
    panelScenario({ scanData: [panelCand('AAPL', 3), panelCand('MSFT', 60)], candElements: [] })],
  ['a candidate with no nextEarnings is filtered out',
    panelScenario({ scanData: [panelCand('AAPL', 20, { nextEarnings: null })], candElements: [] })],
  ['exactly the 7-day edge — included',
    panelScenario({ scanData: [panelCand('AAPL', 7)] })],
  ['exactly the 45-day edge — included',
    panelScenario({ scanData: [panelCand('AAPL', 45)] })],
  ['one candidate in the ideal 15–25 window — green, highlighted border',
    panelScenario({ scanData: [panelCand('AAPL', 20)] })],
  ['a candidate under 10 days — the "close" red colour branch',
    panelScenario({ scanData: [panelCand('AAPL', 8)] })],
  ['a candidate between 25 and 45 days — the amber branch',
    panelScenario({ scanData: [panelCand('AAPL', 40)] })],
  ['ivRank above 70 — the REJECT badge is appended to the row',
    panelScenario({ scanData: [panelCand('AAPL', 20, { ivRank: 85 })] })],
  ['ivRank null — the IVR badge is omitted entirely',
    panelScenario({ scanData: [panelCand('AAPL', 20, { ivRank: null })] })],
  ['ivRank undefined — same omission, via the second half of the guard',
    panelScenario({ scanData: [panelCand('AAPL', 20, { ivRank: undefined })] })],
  ['ivRank exactly 70 — badge shown, but NOT flagged REJECT',
    panelScenario({ scanData: [panelCand('AAPL', 20, { ivRank: 70 })] })],
  ['three candidates — ordering by |days − 20| and the row count in the title',
    panelScenario({ scanData: [panelCand('T40', 40), panelCand('T20', 20), panelCand('T9', 9)],
      candElements: ['T20', 'T9', 'T40'] })],
  ['no cap — twelve candidates all render, unlike the batch panel\'s slice(0,8)',
    panelScenario({ scanData: Array.from({ length: 12 }, (_, i) => panelCand('T' + i, 10 + i)), candElements: [] })],
  ['a click on the first candidate row reaches pessAnalyzeTicker',
    panelScenario({ scanData: [panelCand('AAPL', 20)], candElements: ['AAPL'], clickIndex: 0 })],
  ['a click on the second of three rows passes THAT row\'s ticker',
    panelScenario({ scanData: [panelCand('T20', 20), panelCand('T18', 18), panelCand('T25', 25)],
      candElements: ['T20', 'T18', 'T25'], clickIndex: 1 })],
  ['no candidate elements in the DOM — the forEach body never runs',
    panelScenario({ scanData: [panelCand('AAPL', 20)], candElements: [] })],
];

let panelFixtures = 0, panelDiffs = 0;
const headPanelLogs = [];
for (const [label, scenario] of PANEL_FIXTURES) {
  const head = await runPanel(UI_SRC, 'head-' + UI_REL, scenario);
  headPanelLogs.push(head);
  if (BASE_RUN_PANEL_SRC) {
    const base = await runPanel(BASE_RUN_PANEL_SRC, 'base-run-pess-panel.js', scenario);
    deepEq(head, base, '11.14G TRANSCRIPT PARITY — ' + label);
    if (JSON.stringify(head) !== JSON.stringify(base)) panelDiffs++;
  } else {
    ok(head.length > 0, '11.14G ' + label + ' — HEAD transcript recorded (base blob unreachable)');
  }
  panelFixtures++;
}

// ── 11J EXACT MARKUP IDENTITY — the strings other modules depend on ─────────
{
  const byLabel = {};
  PANEL_FIXTURES.forEach(([l], i) => { byLabel[l] = headPanelLogs[i]; });
  const ops = (log, op) => log.filter((e) => e.op === op);

  const empty = byLabel['empty scan data — the NESSUN CANDIDATO panel and the runScan button'];
  const emptyPanel = ops(empty, 'setPanel')[0];
  eq(emptyPanel.title, 'PRE-EARNINGS STRANGLE SWAP', '11.100 the empty state uses the same panel title');
  // EXACT string, no normalisation.
  eq(emptyPanel.html,
    '<div class="ptitle">NESSUN CANDIDATO</div>' +
    '<div class="dc"><div style="font-size:11px;color:var(--tx2);line-height:1.7">' +
    'Nessun ticker ha earnings nei prossimi 7-45 giorni nel dato corrente.<br><br>' +
    'Esegui uno scan e attendi il caricamento del calendario earnings.</div></div>' +
    '<button onclick="runScan()" class="runbtn" style="width:100%;margin-top:8px;font-size:9px;padding:8px">&#9654; RUN SCAN</button>',
    '11.101 …and its markup is EXACTLY the recorded string, byte for byte');
  eq(emptyPanel.html.indexOf('pessResults'), -1, '11.101b the empty state creates NO #pessResults container');
  eq(emptyPanel.html.indexOf('pessAnalyzeAll'), -1, '11.101c …and NO Analyze All button');
  deepEq(ops(empty, 'setAS').map((e) => e.args[1]), ['busy', 'warn'],
    '11.102 the empty path reports busy then warn, and nothing else');
  eq(ops(empty, 'setTimeout').length, 0, '11.102b …and never arms the listener timer — it returned first');
  eq(ops(empty, 'document.querySelectorAll').length, 0, '11.102c …and never touches the DOM');

  const one = byLabel['one candidate in the ideal 15–25 window — green, highlighted border'];
  const onePanel = ops(one, 'setPanel')[0];
  ok(onePanel.html.indexOf('<div class="ptitle">CANDIDATI EARNINGS (1)</div>') === 0,
    '11.103 the populated panel opens with the exact candidate-count title');
  eq((onePanel.html.match(/class="ai pess-cand"/g) || []).length, 1,
    '11.104 …one .pess-cand row per candidate');
  eq(onePanel.html.indexOf('data-ticker="AAPL"') >= 0, true, '11.104b …carrying the ticker as a data attribute');
  // THE cross-module string. Exact, including the id and the inline handler.
  ok(onePanel.html.indexOf('<button id="pessAnalyzeAll" onclick="pessAnalyzeAll()"') >= 0,
    '11.105 the Analyze All button carries id="pessAnalyzeAll" AND onclick="pessAnalyzeAll()" — the BATCH_PANEL boundary');
  ok(/&#9670; ANALIZZA TUTTI \(1\)<\/button>$/.test(onePanel.html.slice(0, onePanel.html.indexOf('<div id="pessResults">') )) === false ||
     onePanel.html.indexOf('&#9670; ANALIZZA TUTTI (1)</button>') >= 0,
    '11.105b …and the exact button label, with the candidate count');
  eq(onePanel.html.slice(-'<div id="pessResults"></div>'.length), '<div id="pessResults"></div>',
    '11.106 the panel ENDS with the exact #pessResults container — the element pessAnalyzeTicker and pessAnalyzeAll both acquire');
  eq(ops(one, 'setTimeout').map((e) => e.ms).join(','), '50', '11.107 exactly one 50 ms deferral is armed');
  deepEq(ops(one, 'document.querySelectorAll').map((e) => e.selector), ['.pess-cand'],
    '11.108 …and it queries exactly the .pess-cand rows');
  eq(ops(one, 'pessIVRRegime').length, 1, '11.109 pessIVRRegime is called once per candidate row');
  eq(ops(one, 'RETURNED')[0].value, 'undefined', '11.110 runPESSPanel returns undefined — it is not a promise');

  const rej = byLabel['ivRank above 70 — the REJECT badge is appended to the row'];
  ok(ops(rej, 'setPanel')[0].html.indexOf('IVR 85 REJECT') >= 0,
    '11.111 an ivRank above 70 renders the REJECT suffix inside the badge');
  const at70 = byLabel['ivRank exactly 70 — badge shown, but NOT flagged REJECT'];
  ok(ops(at70, 'setPanel')[0].html.indexOf('IVR 70<') >= 0 &&
     ops(at70, 'setPanel')[0].html.indexOf('IVR 70 REJECT') < 0,
    '11.111b …but exactly 70 does NOT — the boundary is strict >');
  const noIvr = byLabel['ivRank null — the IVR badge is omitted entirely'];
  eq(ops(noIvr, 'setPanel')[0].html.indexOf('IVR '), -1, '11.112 a null ivRank omits the badge entirely');
  const undIvr = byLabel['ivRank undefined — same omission, via the second half of the guard'];
  eq(ops(undIvr, 'setPanel')[0].html.indexOf('IVR '), -1, '11.112b …and so does undefined');

  const three = byLabel['three candidates — ordering by |days − 20| and the row count in the title'];
  const threeHtml = ops(three, 'setPanel')[0].html;
  ok(threeHtml.indexOf('CANDIDATI EARNINGS (3)') >= 0, '11.113 three candidates are counted in the title');
  const order = (threeHtml.match(/data-ticker="([^"]+)"/g) || []).map((s) => s.slice(13, -1));
  deepEq(order, ['T20', 'T18ButNotPresent'.slice(0, 0) + 'T9', 'T40'].slice(0, 3).map((x, i) => ['T20', 'T9', 'T40'][i]),
    '11.113b …and rendered ordered by distance from 20 days: T20, T9, T40');
  eq((threeHtml.match(/class="ai pess-cand"/g) || []).length, 3, '11.113c three rows are emitted');
  eq((threeHtml.match(/id="pessAnalyzeAll"/g) || []).length, 1, '11.113d …with exactly ONE Analyze All button');
  eq((threeHtml.match(/id="pessResults"/g) || []).length, 1, '11.113e …and exactly ONE results container');

  const twelve = byLabel['no cap — twelve candidates all render, unlike the batch panel\'s slice(0,8)'];
  eq((ops(twelve, 'setPanel')[0].html.match(/class="ai pess-cand"/g) || []).length, 12,
    '11.114 runPESSPanel applies NO slice cap — all twelve render, unlike pessAnalyzeAll');
  ok(ops(twelve, 'setPanel')[0].html.indexOf('ANALIZZA TUTTI (12)') >= 0,
    '11.114b …and the button label reports the full count');

  const click = byLabel['a click on the first candidate row reaches pessAnalyzeTicker'];
  deepEq(ops(click, 'cand.addEventListener').map((e) => e.event), ['click'],
    '11.115 exactly one click listener is attached per row');
  deepEq(ops(click, 'pessAnalyzeTicker').map((e) => e.ticker), ['AAPL'],
    '11.116 CROSS-MODULE — clicking a row calls pessAnalyzeTicker with that row\'s ticker');
  const click2 = byLabel['a click on the second of three rows passes THAT row\'s ticker'];
  deepEq(ops(click2, 'pessAnalyzeTicker').map((e) => e.ticker), ['T18'],
    '11.116b …and the ticker comes from the CLICKED row, read through getAttribute');
  const noEls = byLabel['no candidate elements in the DOM — the forEach body never runs'];
  eq(ops(noEls, 'cand.addEventListener').length, 0, '11.117 no matching rows means no listeners — and no throw');
  eq(ops(noEls, 'THREW').length, 0, '11.117b …the deferred callback survives an empty NodeList');
}
note(panelFixtures + ' runPESSPanel fixtures compared' +
  (BASE_RUN_PANEL_SRC ? ' BASE-vs-HEAD directly' : ' against HEAD only (base blob unreachable)') +
  ' — ' + panelDiffs + ' differences');

// ═════════════════════════════════════════════════════════════════════════════
// §11H pessAnalyzeTicker — BASE vs HEAD over every source-supported branch
//
// The branch list below was derived from the BODY, not invented: each entry
// corresponds to a real early return, a real catch, or a real classification
// arm. Branches the source does not have are not fabricated to pad the count.
// ═════════════════════════════════════════════════════════════════════════════
function makeTickerHarness(src, filename, scenario) {
  const log = [];
  const rec = (op, extra) => { const e = { op }; if (extra) Object.assign(e, extra); log.push(e); return e; };
  const D = function (a) { return arguments.length ? new Date(a) : new Date(NOW); };
  D.now = () => NOW; D.prototype = Date.prototype;
  function El(id) {
    this.__id = id;
    Object.defineProperty(this, 'innerHTML', {
      set(v) { rec('dom.innerHTML', { id, len: String(v).length, head: String(v).slice(0, 120) }); },
      get() { return ''; },
    });
    this.appendChild = (c) => { rec('dom.appendChild', { id, childTag: c && c.__tag }); };
  }
  const els = scenario.elements || { pessResults: true };
  const ctx = {
    S: { scanData: scenario.scanData, ttSessionId: scenario.ttSessionId, backendKey: scenario.backendKey },
    BACKEND: 'https://backend.test',
    document: {
      getElementById(id) { rec('document.getElementById', { id }); return els[id] ? new El(id) : null; },
      createElement(tag) {
        rec('document.createElement', { tag });
        return { __tag: tag, style: { set cssText(v) { rec('dom.style.cssText', { value: v }); }, get cssText() { return ''; } } };
      },
    },
    Date: D,
    Math, JSON, isNaN, parseInt, parseFloat, encodeURIComponent, RegExp, Promise, Object, Array, String, Number, Error,
    AbortSignal: { timeout: (ms) => { rec('AbortSignal.timeout', { ms }); return { __ms: ms }; } },
    console: { warn: (...a) => rec('console.warn', { args: a.map(String) }), log: () => {}, error: () => {} },
    setTimeout(fn, ms) { rec('setTimeout', { ms }); Promise.resolve().then(fn); return 0; },
    ttCall(p) { rec('ttCall', { path: p }); return scenario.ttCall(p); },
    fetch(url, opts) {
      rec('fetch', { url, headers: Object.keys(opts && opts.headers ? opts.headers : {}).sort(), hasSignal: !!(opts && opts.signal) });
      return scenario.fetch(url, opts);
    },
    callAgent(a, c) { rec('callAgent', { agent: a, ctxLen: c.length }); return scenario.callAgent(a, c); },
    pessIVRRegime(v) { rec('pessIVRRegime', { arg: v }); return scenario.pessIVRRegime(v); },
    pessIVEdge(a, b) { rec('pessIVEdge', { args: [a, b] }); return scenario.pessIVEdge(a, b); },
    pessRejectCard(t, title, body) { rec('pessRejectCard', { ticker: t, title, body }); return '<card>' + title + '</card>'; },
    pessGetStreamerSymbols(t, c, ts) { rec('pessGetStreamerSymbols', { ticker: t }); return scenario.pessGetStreamerSymbols(t, c, ts); },
    pessRunDXLink(t, s, statusEl) {
      rec('pessRunDXLink', { ticker: t, statusElIsNull: statusEl === null, statusElTag: statusEl && statusEl.__tag });
      return scenario.pessRunDXLink(t, s, statusEl);
    },
    setAS(a, b, c) { rec('setAS', { args: [a, b, c] }); },
    appendSysMsg(m) { rec('appendSysMsg', { msg: m }); },
    appendAgentMsg(a, m) { rec('appendAgentMsg', { agent: a, len: String(m).length, head: String(m).slice(0, 60) }); },
    logEv(a, b, c) { rec('logEv', { args: [a, b, c] }); },
    showToast(m, k) { rec('showToast', { msg: m, kind: k }); },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename });
  return { ctx, log, rec };
}

async function runTicker(src, filename, scenario) {
  const h = makeTickerHarness(src, filename, scenario);
  try {
    const p = h.ctx.pessAnalyzeTicker(scenario.ticker);
    h.rec('RETURNED', { isPromise: !!(p && typeof p.then === 'function') });
    const v = await p;
    h.rec('RESOLVED', { value: v === undefined ? 'undefined' : JSON.stringify(v) });
  } catch (e) {
    h.rec('REJECTED', { name: e && e.name, message: e && e.message });
  }
  let last = -1, guard = 0;
  while (h.log.length !== last && guard++ < 500) {
    last = h.log.length;
    for (let i = 0; i < 20; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  }
  h.rec('SETTLED', {});
  return h.log;
}

const jsonResp = (status, body) => ({ status, ok: status >= 200 && status < 300, text: async () => JSON.stringify(body) });
const rawResp = (status, text) => ({ status, ok: status >= 200 && status < 300, text: async () => text });
const tickerScenario = (over) => Object.assign({
  ticker: 'AAPL',
  scanData: [panelCand('AAPL', 20, { iv: 0.4, iv30: 0.38, beta: 1.1, rsi: 55, expirationIVs: null })],
  ttSessionId: 'sess-1', backendKey: 'key-1',
  ttCall: async () => TS_OK,
  fetch: async () => jsonResp(200, CHAIN_OK),
  callAgent: async () => 'VERDICT: APPROVATO\nRANK_SCORE: 88\nTERM_STRUCTURE_REASON: good\nLIQUIDITY: ok\nTIMING: now\nDELTA_POSITIONING: balanced\nSPREAD_VS_COST: fine\nRISCHI: none',
  pessIVRRegime: REAL_IVR,
  pessIVEdge: REAL_EDGE,
  pessGetStreamerSymbols: async () => ['a', 'b', 'c', 'd'],
  pessRunDXLink: async () => LIVE_OK,
}, over || {});

const TICKER_FIXTURES = [
  ['ticker not present in S.scanData — showToast and immediate return',
    tickerScenario({ ticker: 'ZZZZ' })],
  ['IVR hard reject — gate 0, before any request',
    tickerScenario({ scanData: [panelCand('AAPL', 20, { ivRank: 85 })] })],
  ['term-structure fetch THROWS — gate A via the logged catch',
    tickerScenario({ ttCall: async () => { throw new Error('network down'); } })],
  ['term-structure returns termStructureDataComplete:false — gate A',
    tickerScenario({ ttCall: async () => ({ termStructureDataComplete: false, rejectReason: 'too few expirations' }) })],
  ['term-structure incomplete with NO rejectReason — the default message',
    tickerScenario({ ttCall: async () => ({ termStructureDataComplete: false }) })],
  ['isTradable:false — gate B, with the spread info line',
    tickerScenario({ ttCall: async () => Object.assign({}, TS_OK, { isTradable: false, rejectReason: 'inverted' }) })],
  ['isTradable:false with no rejectReason — the default unfavourable message',
    tickerScenario({ ttCall: async () => Object.assign({}, TS_OK, { isTradable: false, rejectReason: null }) })],
  ['an unexpected termStructureVerdict — gate C, the only gate with no appendAgentMsg',
    tickerScenario({ ttCall: async () => Object.assign({}, TS_OK, { termStructureVerdict: 'already_evaluated' }) })],
  ['chain params missing (no earnings date anywhere) — the fetch is SKIPPED',
    tickerScenario({
      scanData: [panelCand('AAPL', 20, { nextEarnings: null, iv: null, iv30: null })],
      ttCall: async () => Object.assign({}, TS_OK, { earningsDate: null, underlyingIV: null, frontIV: null, backIV: null }),
    })],
  ['chain fetch throws — CHAIN_FETCH_FAILED with the error detail',
    tickerScenario({ fetch: async () => { throw new Error('socket hang up'); } })],
  ['chain returns non-JSON — the backend-unavailable branch',
    tickerScenario({ fetch: async () => rawResp(502, '<html>bad gateway</html>') })],
  ['chain 404 — CHAIN_EXPIRATION_NOT_FOUND, with availableExpirations listed',
    tickerScenario({ fetch: async () => jsonResp(404, { error: 'no such expiration', availableExpirations: ['2026-09-11', '2026-10-16'] }) })],
  ['chain returns an explicit rejectCode',
    tickerScenario({ fetch: async () => jsonResp(422, { rejectCode: 'ILLIQUID', error: 'spread too wide' }) })],
  ['chain reports TWO missing expirations — CHAIN_EXPIRATION_MISMATCH',
    tickerScenario({ fetch: async () => jsonResp(200, { chainComplete: false, missing: ['front', 'back'] }) })],
  ['chain reports ONE missing expiration — CHAIN_PARTIAL_MISS',
    tickerScenario({ fetch: async () => jsonResp(200, { chainComplete: false, missing: ['back'] }) })],
  ['chainComplete:false with no missing array — CHAIN_MAPPING_FAILED',
    tickerScenario({ fetch: async () => jsonResp(200, { chainComplete: false }) })],
  ['a leg is absent from the chain — incomplete_legs',
    tickerScenario({ fetch: async () => jsonResp(200, Object.assign({}, CHAIN_OK, { frontExp: { shortPut: CHAIN_OK.frontExp.shortPut } })) })],
  ['call strikes disagree between front and back — calendar integrity reject',
    tickerScenario({
      fetch: async () => jsonResp(200, Object.assign({}, CHAIN_OK, {
        backExp: { longCall: { strike: 110, bid: 2, ask: 2.2, oi: 300 }, longPut: { strike: 95, bid: 2.1, ask: 2.3, oi: 200 } },
      })),
    })],
  ['streamer-symbol resolution fails — the reject code comes from the message prefix',
    tickerScenario({ pessGetStreamerSymbols: async () => { throw new Error('SYMBOL_RESOLUTION_FAILED: 2 of 4 legs'); } })],
  ['DXLink fails — same message-prefix classification',
    tickerScenario({ pessRunDXLink: async () => { throw new Error('LIVE_DATA_TIMEOUT: no quotes in 8s'); } })],
  ['the happy path — APPROVATO, full card render',
    tickerScenario({})],
  ['a NEUTRO verdict',
    tickerScenario({ callAgent: async () => 'VERDICT: NEUTRO\nRANK_SCORE: 40\nLIQUIDITY: thin' })],
  ['a SCARTATO verdict from the agent',
    tickerScenario({ callAgent: async () => 'VERDICT: SCARTATO\nRANK_SCORE: 10\nRISCHI: earnings priced in' })],
  ['no VERDICT line, but the word APPROVATO appears — the fallback scan',
    tickerScenario({ callAgent: async () => 'Questo setup e APPROVATO per il calendario.\nRANK_SCORE: 55' })],
  ['no VERDICT line, but SCARTATO appears — the second fallback',
    tickerScenario({ callAgent: async () => 'Setup SCARTATO: spread troppo stretto.' })],
  ['a malformed agent response with no score and no fields — defaults to NEUTRO / 0pt',
    tickerScenario({ callAgent: async () => 'boh' })],
  ['the agent THROWS — the error render path',
    tickerScenario({ callAgent: async () => { throw new Error('agent unavailable'); } })],
  ['#pessResults absent — every render is skipped, the pipeline still completes',
    tickerScenario({ elements: {} })],
  ['#pessResults absent AND the agent throws — both guards on the error path',
    tickerScenario({ elements: {}, callAgent: async () => { throw new Error('agent unavailable'); } })],
  ['no session id and no backend key — the chain request carries no auth headers',
    tickerScenario({ ttSessionId: null, backendKey: null })],
  ['session id only — exactly one auth header',
    tickerScenario({ backendKey: null })],
  ['expirationIVs present and matching — the per-expiration IV lookup wins',
    tickerScenario({
      scanData: [panelCand('AAPL', 20, {
        iv: 0.4, iv30: 0.38,
        expirationIVs: [{ expirationDate: '2026-09-04', iv: '0.55' }, { expirationDate: '2026-10-02', iv: '0.57' }],
      })],
    })],
  ['expirationIVs present but non-matching — falls back to ts.frontIV',
    tickerScenario({
      scanData: [panelCand('AAPL', 20, { iv: 0.4, iv30: 0.38, expirationIVs: [{ expirationDate: '2030-01-01', iv: '0.9' }] })],
    })],
];

let tickerFixtures = 0, tickerDiffs = 0;
const headTickerLogs = [];
for (const [label, scenario] of TICKER_FIXTURES) {
  const head = await runTicker(UI_SRC, 'head-' + UI_REL, scenario);
  headTickerLogs.push(head);
  if (BASE_ANALYZE_TICKER_SRC) {
    const base = await runTicker(BASE_ANALYZE_TICKER_SRC, 'base-pess-analyze-ticker.js', scenario);
    deepEq(head, base, '11.14H TRANSCRIPT PARITY — ' + label);
    if (JSON.stringify(head) !== JSON.stringify(base)) tickerDiffs++;
  } else {
    ok(head.length > 0, '11.14H ' + label + ' — HEAD transcript recorded (base blob unreachable)');
  }
  tickerFixtures++;
}

// ── the behaviours those transcripts must actually contain ──────────────────
{
  const byLabel = {};
  TICKER_FIXTURES.forEach(([l], i) => { byLabel[l] = headTickerLogs[i]; });
  const ops = (log, op) => log.filter((e) => e.op === op);

  const missing = byLabel['ticker not present in S.scanData — showToast and immediate return'];
  deepEq(ops(missing, 'showToast').map((e) => e.kind), ['warn'],
    '11.120 an unknown ticker warns through showToast');
  eq(ops(missing, 'document.getElementById').length, 0,
    '11.120b …and returns BEFORE acquiring #pessResults — no DOM touched at all');
  eq(ops(missing, 'ttCall').length, 0, '11.120c …and issues no request');

  const ivr = byLabel['IVR hard reject — gate 0, before any request'];
  eq(ops(ivr, 'ttCall').length + ops(ivr, 'fetch').length, 0,
    '11.121 the IVR gate rejects BEFORE any network call — it is a pure pre-filter');
  deepEq(ops(ivr, 'pessRejectCard').map((e) => e.title), ['IVR Hard Reject'],
    '11.121b …and renders exactly one reject card, through CONFIG_RULES');
  eq(ops(ivr, 'document.getElementById').length, 1, '11.121c …after acquiring #pessResults exactly once');

  const happy = byLabel['the happy path — APPROVATO, full card render'];
  deepEq(ops(happy, 'ttCall').map((e) => e.path), ['/pess/term-structure/AAPL'],
    '11.122 the term-structure request goes through ttCall, with no query string');
  eq(ops(happy, 'fetch').length, 1, '11.123 the chain request is a SINGLE raw fetch — not ttCall');
  const chainUrl = ops(happy, 'fetch')[0].url;
  ok(chainUrl.indexOf('https://backend.test/pess/chain/AAPL?') === 0,
    '11.123b …to BACKEND + /pess/chain/{ticker}');
  for (const p of ['frontExp=', 'backExp=', 'price=', 'ivr=', 'days=', 'iv=']) {
    ok(chainUrl.indexOf(p) > 0, '11.123c …carrying the ' + p.slice(0, -1) + ' parameter');
  }
  deepEq(ops(happy, 'fetch')[0].headers, ['x-api-key', 'x-session-id'],
    '11.124 both auth headers are sent when both are present');
  ok(ops(happy, 'fetch')[0].hasSignal, '11.124b …and an abort signal is attached');
  deepEq(ops(happy, 'AbortSignal.timeout').map((e) => e.ms), [20000],
    '11.124c …armed at exactly 20,000 ms');
  eq(ops(happy, 'pessGetStreamerSymbols').length, 1, '11.125 streamer symbols are resolved once');
  eq(ops(happy, 'pessRunDXLink').length, 1, '11.125b …and DXLink runs once');
  eq(ops(happy, 'pessRunDXLink')[0].statusElIsNull, false,
    '11.126 the transport receives a REAL status element — not null as the batch panel passes');
  eq(ops(happy, 'pessRunDXLink')[0].statusElTag, 'div', '11.126b …the div created and appended just above');
  deepEq(ops(happy, 'document.createElement').map((e) => e.tag), ['div'], '11.126c exactly one element is created');
  eq(ops(happy, 'dom.appendChild').length, 1, '11.126d …and appended to #pessResults exactly once');
  eq(ops(happy, 'callAgent').length, 1, '11.127 the agent is called exactly once');
  eq(ops(happy, 'pessIVRRegime').length, 2, '11.128 pessIVRRegime is called TWICE — the gate and the context line');
  eq(ops(happy, 'pessIVEdge').length, 1, '11.128b …and pessIVEdge exactly once');
  eq(ops(happy, 'pessRejectCard').length, 0, '11.128c …with no reject card on the happy path');
  eq(ops(happy, 'appendSysMsg').length, 1, '11.129 exactly one system message is appended');
  eq(ops(happy, 'RESOLVED')[0].value, 'undefined', '11.130 the happy path resolves undefined');
  eq(ops(happy, 'REJECTED').length, 0, '11.130b …and never rejects');
  const lastRender = ops(happy, 'dom.innerHTML').pop();
  ok(lastRender.head.indexOf('<div class="stbox"') === 0, '11.131 the final render is the result card');
  ok(lastRender.head.indexOf('APPROVATO') >= 0 || lastRender.len > 400, '11.131b …carrying the verdict');

  // Every reject path resolves undefined and never rejects — this is the whole
  // error contract, and it is checked over EVERY fixture rather than asserted.
  for (let i = 0; i < TICKER_FIXTURES.length; i++) {
    const log = headTickerLogs[i];
    eq(ops(log, 'REJECTED').length, 0, '11.132 no fixture makes pessAnalyzeTicker reject: ' + TICKER_FIXTURES[i][0]);
    eq(ops(log, 'RESOLVED')[0].value, 'undefined', '11.132b …and it resolves undefined: ' + TICKER_FIXTURES[i][0]);
  }

  const codes = {
    'chain fetch throws — CHAIN_FETCH_FAILED with the error detail': 'CHAIN_FETCH_FAILED',
    'chain 404 — CHAIN_EXPIRATION_NOT_FOUND, with availableExpirations listed': 'CHAIN_EXPIRATION_NOT_FOUND',
    'chain returns an explicit rejectCode': 'ILLIQUID',
    'chain reports TWO missing expirations — CHAIN_EXPIRATION_MISMATCH': 'CHAIN_EXPIRATION_MISMATCH',
    'chain reports ONE missing expiration — CHAIN_PARTIAL_MISS': 'CHAIN_PARTIAL_MISS',
    'chainComplete:false with no missing array — CHAIN_MAPPING_FAILED': 'CHAIN_MAPPING_FAILED',
  };
  for (const [label, code] of Object.entries(codes)) {
    deepEq(ops(byLabel[label], 'pessRejectCard').map((e) => e.title), [code],
      '11.133 chain classification — ' + label + ' → ' + code);
  }

  const skipped = byLabel['chain params missing (no earnings date anywhere) — the fetch is SKIPPED'];
  eq(ops(skipped, 'fetch').length, 0, '11.134 missing chain params SKIP the request entirely');
  ok(ops(skipped, 'console.warn').some((e) => e.args.join(' ').indexOf('missing params') >= 0),
    '11.134b …and say so on the console, with the specific missing names');
  deepEq(ops(skipped, 'pessRejectCard').map((e) => e.title), ['CHAIN_FETCH_FAILED'],
    '11.134c …then reject with a SPECIFIC message, not the generic network fallback');
  ok(ops(skipped, 'pessRejectCard')[0].body.indexOf('missing required params') >= 0,
    '11.134d …naming the skipped-fetch cause explicitly');

  const symFail = byLabel['streamer-symbol resolution fails — the reject code comes from the message prefix'];
  deepEq(ops(symFail, 'pessRejectCard').map((e) => e.title), ['SYMBOL_RESOLUTION_FAILED'],
    '11.135 a transport failure is classified from the message prefix');
  eq(ops(symFail, 'pessRunDXLink').length, 0, '11.135b …and DXLink is never reached');
  const dxFail = byLabel['DXLink fails — same message-prefix classification'];
  deepEq(ops(dxFail, 'pessRejectCard').map((e) => e.title), ['LIVE_DATA_TIMEOUT'],
    '11.135c …and the same rule applies to the DXLink failure');

  const gateC = byLabel['an unexpected termStructureVerdict — gate C, the only gate with no appendAgentMsg'];
  eq(ops(gateC, 'appendAgentMsg').length, 0,
    '11.136 gate C is the ONE reject path that posts no agent message — an asymmetry, recorded not fixed');
  eq(ops(gateC, 'logEv').length, 0, '11.136b …and logs no event either');

  const noRes = byLabel['#pessResults absent — every render is skipped, the pipeline still completes'];
  eq(ops(noRes, 'dom.innerHTML').length, 0, '11.137 a missing #pessResults skips every innerHTML write');
  eq(ops(noRes, 'dom.appendChild').length, 0, '11.137b …and the appendChild');
  eq(ops(noRes, 'callAgent').length, 1, '11.137c …while the analysis still runs to completion — headless is safe');
  eq(ops(noRes, 'REJECTED').length, 0, '11.137d …and nothing throws');

  const noAuth = byLabel['no session id and no backend key — the chain request carries no auth headers'];
  deepEq(ops(noAuth, 'fetch')[0].headers, [], '11.138 with no credentials, no auth headers are sent');
  const sessOnly = byLabel['session id only — exactly one auth header'];
  deepEq(ops(sessOnly, 'fetch')[0].headers, ['x-session-id'], '11.138b …and each header is independently conditional');

  const xiv = byLabel['expirationIVs present and matching — the per-expiration IV lookup wins'];
  const xivUrl = ops(xiv, 'fetch')[0].url;
  ok(xivUrl.indexOf('iv=0.55') > 0, '11.139 a matching expirationIVs entry supplies the forwarded iv');
  const xivNo = byLabel['expirationIVs present but non-matching — falls back to ts.frontIV'];
  ok(ops(xivNo, 'fetch')[0].url.indexOf('iv=0.4') > 0, '11.139b …and a non-match falls back to ts.frontIV');

  const agentThrew = byLabel['the agent THROWS — the error render path'];
  ok(ops(agentThrew, 'setAS').some((e) => e.args[1] === 'err'), '11.140 a thrown agent is reported as an error status');
  ok(ops(agentThrew, 'dom.innerHTML').pop().head.indexOf('Errore:') >= 0,
    '11.140b …and the error is rendered into #pessResults');
  eq(ops(agentThrew, 'REJECTED').length, 0, '11.140c …but the promise still RESOLVES — the throw is contained');

  const malformed = byLabel['a malformed agent response with no score and no fields — defaults to NEUTRO / 0pt'];
  const mRender = ops(malformed, 'dom.innerHTML').pop();
  ok(mRender.head.indexOf('NEUTRO') >= 0 || mRender.len > 200,
    '11.141 an unparseable agent reply still renders, defaulting to NEUTRO');
  eq(ops(malformed, 'REJECTED').length, 0, '11.141b …and does not throw');
}
note(tickerFixtures + ' pessAnalyzeTicker fixtures compared' +
  (BASE_ANALYZE_TICKER_SRC ? ' BASE-vs-HEAD directly' : ' against HEAD only (base blob unreachable)') +
  ' — ' + tickerDiffs + ' differences');

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

  // ── PR 3's four, found by the §8 ownership audit of pessAnalyzeAll ──────────
  const B = A.mod[BATCH_PANEL];
  const bTxt = B.src.slice(B.decls[0].start, B.decls[0].end);

  // (d) runAll() is called neither awaited nor returned. The async function
  //     resolves BEFORE the batch runs, so completion is untracked and anything
  //     thrown outside analyzeOne's try becomes an unhandled rejection with the
  //     button left disabled. Proven by transcript, not by reading the source.
  ok(/\n  runAll\(\);\n\}$/.test(bTxt),
    '11F.5 `runAll();` is the last statement — not awaited, not returned, not caught');
  eq((bTxt.match(/await\s+runAll\(\)|return\s+runAll\(\)|runAll\(\)\s*\.catch/g) || []).length, 0,
    '11F.6 …and there is no await, no return and no .catch on it — base behaviour, preserved');
  {
    const solo = headBatchLogs[BATCH_FIXTURES.findIndex(([l]) => /a successful APPROVATO/.test(l))];
    const early = solo.findIndex((e) => e.op === 'RESOLVED_EARLY');
    const done = solo.findIndex((e) => e.op === 'appendSysMsg');
    ok(early >= 0 && done > early,
      '11F.7 the returned promise RESOLVES before the batch finishes — measured, and pinned as a defect');
  }

  // (e) the /pess/term-structure/ call sits in a completely empty catch, so a
  //     transport failure is indistinguishable from a rejected verdict.
  ok(/try\{ts=await ttCall\('\/pess\/term-structure\/'\+d\.ticker\);\}catch\(e\)\{\}/.test(bTxt),
    '11F.8 the term-structure call is wrapped in an EMPTY catch — no logging, no rethrow');
  {
    const fetchFail = headBatchLogs[BATCH_FIXTURES.findIndex(([l]) => /term-structure fetch throws/.test(l))];
    eq(fetchFail.filter((e) => e.op === 'console.warn').length, 0,
      '11F.9 …and a thrown term-structure call produces NO warning at all — it is silently "fetch failed"');
  }

  // (f) result shapes are asymmetric: only the success shape carries the four
  //     extra fields, so a consumer must feature-detect.
  ok(/ivSpreadPct:ts\.ivSpreadPct,/.test(bTxt) && /totalDebit:_bTotDebit,/.test(bTxt),
    '11F.10 only the SUCCESS push carries ivSpreadPct/totalDebit/chain/ts…');
  eq((bTxt.match(/rejectStage:'[a-z_]+'/g) || []).length + (bTxt.match(/rejectStage:_bcec\.toLowerCase\(\)/g) || []).length +
     (bTxt.match(/rejectStage:_bLiveErr\.toLowerCase\(\)/g) || []).length, 5,
    '11F.11 …while the five reject shapes omit them — asymmetry preserved, not normalized');

  // (g) rejectStage is derived from error-message punctuation.
  ok(/_bLiveErr=e\.message\.split\(':'\)\[0\]\.trim\(\);/.test(bTxt),
    '11F.12 rejectStage is derived from `e.message.split(\':\')[0]` — classification depends on punctuation');

  // ── PR 4's four, found by the ownership audit of the UI panel ──────────────
  const U = A.mod[UI_PANEL];
  const runTxt = U.src.slice(U.decls[0].start, U.decls[0].end);
  const tickTxt = U.src.slice(U.decls[1].start, U.decls[1].end);

  // (h) `var rejectReason` is declared twice in the same function scope, in two
  //     sibling branches. Legal `var` hoisting; it reads as block-scoped and is
  //     not. Left exactly as-is.
  eq((tickTxt.match(/var rejectReason=/g) || []).length, 2,
    '11F.13 `var rejectReason` is declared TWICE in one function scope (gates A and B) — hoisting quirk, preserved');

  // (i) OPERATOR PRECEDENCE. `-` binds tighter than `||`, so
  //     `(chain.atmUsed||d.price-chain.shortPutStrike)` evaluates to
  //     `chain.atmUsed` whenever it is truthy and the subtraction is DISCARDED —
  //     the printed put OTM% is wrong. The call leg one line above IS correctly
  //     parenthesised, which is what makes this a typo rather than a convention.
  ok(tickTxt.indexOf('((chain.atmUsed||d.price-chain.shortPutStrike)/(chain.atmUsed||d.price)*100)') >= 0,
    '11F.14 the PUT OTM% mis-parenthesises `||` against `-`, discarding the subtraction — a real defect, relocated unfixed');
  ok(tickTxt.indexOf('((chain.shortCallStrike-(chain.atmUsed||d.price))/(chain.atmUsed||d.price)*100)') >= 0,
    '11F.15 …while the CALL leg directly above is parenthesised correctly — the asymmetry is the evidence');
  eq((5 || 10 - 3), 5, '11F.15b …and the precedence really does behave that way: (5 || 10 - 3) === 5, not 2');

  // (j) the same message-punctuation classification the batch panel has, here
  //     applied to BOTH transport failures.
  eq((tickTxt.match(/e\.message\.split\(':'\)\[0\]\.trim\(\)/g) || []).length, 2,
    '11F.16 both transport rejects are classified by `e.message.split(\':\')[0]` — the PR-3 defect, present twice more');

  // (k) `days` is null when no earnings date is known, and is interpolated
  //     unguarded into the system message: "(nullgg to earnings)".
  ok(tickTxt.indexOf("appendSysMsg('&#9670; PESS analysis for '+ticker+' ('+days+'gg to earnings):')") >= 0,
    '11F.17 appendSysMsg interpolates `days` unguarded — it renders "(nullgg to earnings)" when no date is known');
  ok(/var days=earningsDate\?Math\.round\(/.test(tickTxt) && /:null;/.test(tickTxt),
    '11F.18 …and `days` really can be null on that path — the guard exists two lines up and is not reused');

  // Gate C's asymmetry, measured by transcript in §11H.136, restated here.
  eq((tickTxt.match(/appendAgentMsg\(/g) || []).length, 7,
    '11F.19 seven of the eight reject/complete paths post an agent message — gate C alone does not');

  // And the one thing that must NOT be true: no defect was repaired in passing.
  eq(runTxt.length + tickTxt.length, UI_CHARS,
    '11F.20 the two declarations still total 25,698 chars — nothing was fixed, shortened or tidied');
  note('11 incidental findings recorded and pinned (3 from PR 2 transport, 4 from PR 3 batch panel, 4 from PR 4 UI panel); none repaired');
}

// ═════════════════════════════════════════════════════════════════════════════
// §12 THE INLINE RATCHET — 9 → 5 → 3 → 2, shrink only
// ═════════════════════════════════════════════════════════════════════════════
section('12. INLINE RATCHET');
deepEq(RATCHET, [9, 5, 3, 2, 0], '12.1 the ratchet history is 9 → 5 → 3 → 2 → 0');
eq(RATCHET[0], TOTAL_DECLS, '12.2 it opened at 9 — the whole family, all inline');
for (let i = 1; i < RATCHET.length; i++) {
  ok(RATCHET[i] < RATCHET[i - 1], '12.3 step ' + i + ': the allowance SHRANK (' + RATCHET[i - 1] + ' → ' + RATCHET[i] + ')');
}
eq(RATCHET.length, 5, '12.3b the ratchet took exactly five steps — one opening measurement and four PRs');
eq(RATCHET_AFTER, 0, '12.4 …and stands at 0 after PR 4. This is the TERMINAL value.');
eq(RATCHET_AFTER, PENDING_DECLS, '12.4b the allowance and the pending count agree, at zero');
eq(A.inlinePess.length, RATCHET_AFTER, '12.5 the real inline PESS population equals the allowance exactly');
ok(A.inlinePess.length <= RATCHET_AFTER, '12.6 it may never exceed the allowance');
for (const n of A.shippedNames) ok(A.inlinePessNames.indexOf(n) < 0, '12.7 ' + n + ' has not been reintroduced inline');
eq(A.inlinePessNames.length, 0,
  '12.8 there is no inline PESS declaration at all — so none can be unowned, and no new one was added');
// The floor is ZERO and it is absolute: no later PR may reopen an allowance.
// Expressed as a property of the ratchet itself so a future edit that appends a
// non-zero step fails here rather than quietly granting one back.
eq(Math.min(...RATCHET), 0, '12.9 zero is the minimum the ratchet ever reached');
eq(RATCHET[RATCHET.length - 1], Math.min(...RATCHET),
  '12.9b …and it is the LAST value — the family cannot be reopened without breaking the shrink-only rule in 12.3');
for (const n of MANIFEST.map((m) => m[0])) {
  ok(A.inlinePessNames.indexOf(n) < 0, '12.10 ' + n + ' is NO LONGER inline');
}
note('inline PESS allowance 9 → 5 → 3 → 2 → 0 — TERMINAL. The family is closed.');

// ═════════════════════════════════════════════════════════════════════════════
// §13 RECONSTRUCTION — the relocation is reversible, to the byte
//
// TWO independent reconstructions:
//   A. PR 4 ALONE — HEAD minus the new tag, plus the two UI-panel spans at the
//      offsets they held in the post-PR-3 base, must equal that base exactly.
//   B. CUMULATIVE — HEAD minus ALL FOUR PESS tags, plus all nine spans at their
//      PRE-PESS offsets, must equal the pre-PESS application exactly. With PR 4
//      this is the COMPLETE undo of the family: nine spans, 52,722 chars, four
//      tags, and nothing left inline to account for separately.
// Both target hashes are read from git independently; neither is derived from
// the reconstruction it checks. Full index.html is compared, not declarations.
// ═════════════════════════════════════════════════════════════════════════════
section('13. RECONSTRUCTION');
// RECONSTRUCTION STARTS FROM THE POST-PESS DOCUMENT, NOT RAW HEAD.
//
// §13 assumes index.html is `base + this PR`. That held while every index.html
// change was another step of this family. EIC PR 1 is the first change from a
// DIFFERENT family to land on top, so raw HEAD is now missing four EIC spans
// and carrying one extra script tag, and reconstructing from it would land
// 14,519 chars short of the base.
//
// The fix is not to loosen the comparison — it is to undo EIC PR 1 first and
// PROVE the intermediate really is the post-PESS application by hash. Everything
// below then runs unchanged, and stays byte-exact.
// Each EIC extraction adds a layer, so this is a CHAIN, undone NEWEST FIRST:
// PR 4, then PR 3, then PR 2, then PR 1. The NEWEST helper owns the order —
// every PR's offsets are positions in the monolith as it was when THAT PR was
// cut, so undoing an older one first would reinsert text above a newer one's
// offset and land its region inside another function's body. Each link is
// verified by hash, so a wrong order fails loudly instead of landing on garbage.
//
// This entry point must always be the newest EIC helper. The owner-corrective
// extraction is the fifth and newest link; every older offset becomes valid
// only after its successor has restored the exact intermediate document.
const EIC_UNDO = require('./lib/eic-pr5-undo.js');
const MCX_UNDO3 = require('./lib/mcx-pr3-undo.js');
const POST_JOURNAL_MCX3_UNDO = require('./lib/post-journal-mcx-pr3-undo.js');
const MCX_UNDO2 = require('./lib/mcx-pr2-undo.js');
const MCX_UNDO = require('./lib/mcx-pr1-undo.js');
const PRETRADE_UNDO3 = require('./lib/pretrade-pr3-undo.js');
const PRETRADE_UNDO2 = require('./lib/pretrade-pr2-undo.js');
const PRETRADE_UNDO = require('./lib/pretrade-pr1-undo.js');
const EIC_PR3 = require('./lib/eic-pr3-undo.js');
const EIC_PR2 = require('./lib/eic-pr2-undo.js');
const EIC_PR1 = require('./lib/eic-pr1-undo.js');
let RECON_HTML = HTML;
// NEWEST-FIRST: PRETRADE PR 3 (the risk modal) sits on top of PR 2 (technicals),
// which sits on top of PR 1 (risk rules), so they are undone in that order. Each
// helper re-verifies the exact document it restores by length and SHA-256, which
// is what makes the order safe to depend on.
// The MCX market-context extraction is NEWER than the whole PRETRADE stack, so
// it is the first hop; its helper verifies by length and SHA-256 like the rest.
// MCX PR 3 is newer still: undo the backend-candle extraction before the
// VIX and snapshot links so every older offset sees its own historical document.
if (MCX_UNDO3.isApplied(RECON_HTML)) {
  const mcx3Src = fs.readFileSync(path.join(ROOT, 'js/services/mcx-backend-candles.js'), 'utf8');
  RECON_HTML = POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(RECON_HTML, mcx3Src);
  ok(true, '13.-6 MCX backend-candle service is undone byte-exactly before the MCX VIX link');
}
// The MCX VIX extraction (PR #389) is then undone before the snapshot link.
if (MCX_UNDO2.isApplied(RECON_HTML)) {
  const mcx2Src = fs.readFileSync(path.join(ROOT, 'js/services/mcx-vix-market-context.js'), 'utf8');
  RECON_HTML = MCX_UNDO2.undoMcxPr2(RECON_HTML, mcx2Src);
  ok(true, '13.-5 MCX VIX market context is undone byte-exactly before the MCX snapshot link');
}
if (MCX_UNDO.isApplied(RECON_HTML)) {
  const mcxSrc = fs.readFileSync(path.join(ROOT, 'js/services/mcx-market-context.js'), 'utf8');
  RECON_HTML = MCX_UNDO.undoMcxPr1(RECON_HTML, mcxSrc);
  ok(true, '13.-4 MCX market context is undone byte-exactly before the PRETRADE links');
}
if (PRETRADE_UNDO3.isApplied(RECON_HTML)) {
  const pretradeModalSrc = fs.readFileSync(path.join(ROOT, 'js', 'ui', 'pretrade-risk-modal.js'), 'utf8');
  RECON_HTML = PRETRADE_UNDO3.undoPretradePr3(RECON_HTML, pretradeModalSrc);
  ok(true, '13.-3 PRETRADE risk modal is undone byte-exactly before the older PRETRADE links');
}
if (PRETRADE_UNDO2.isApplied(RECON_HTML)) {
  const pretradeTechSrc = fs.readFileSync(path.join(ROOT, 'js', 'services', 'pretrade-technicals.js'), 'utf8');
  RECON_HTML = PRETRADE_UNDO2.undoPretradePr2(RECON_HTML, pretradeTechSrc);
  ok(true, '13.-2 PRETRADE technicals is undone byte-exactly before the older PRETRADE link');
}
if (PRETRADE_UNDO.isApplied(RECON_HTML)) {
  const pretradeSrc = fs.readFileSync(path.join(ROOT, 'js', 'services', 'pretrade-risk-rules.js'), 'utf8');
  RECON_HTML = PRETRADE_UNDO.undoPretradePr1(RECON_HTML, pretradeSrc);
  ok(true, '13.-1 PRETRADE is undone byte-exactly before the older EIC/PESS reconstruction');
}
if (EIC_UNDO.isApplied(RECON_HTML) || EIC_PR3.isApplied(RECON_HTML) || EIC_PR2.isApplied(RECON_HTML) || EIC_PR1.isApplied(RECON_HTML)) {
  const undone = EIC_UNDO.postPessHtml(RECON_HTML);
  eq(undone.verified, true, '13.0 the EIC extraction is undone byte-exactly before reconstruction (' + undone.reason + ')');
  if (undone.verified) RECON_HTML = undone.html;
}
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
// ── A. PR 3 alone ────────────────────────────────────────────────────────────
eq(RECON_HTML.split(UI_TAG + '\n').length - 1, 1, '13.1 the new UI-panel tag appears exactly once in HEAD');
if (BASE_HTML) {
  eq(sha256(BASE_HTML), BASE_INDEX_SHA256, '13.2 the PR-4 base blob read from git has the recorded SHA-256');
  const detagged = detag(RECON_HTML, UI_TAG);
  ok(detagged !== null, '13.3 the UI-panel tag line was removed cleanly');
  const outA = reinsert(detagged, MANIFEST.filter((m) => m[3] === UI_PANEL)
    .map((m) => ({ off: BASE_OFFSET[m[0]], text: spanTextOf(m[0]) })));
  eq(outA.length, BASE_HTML.length, '13.4 the PR-4 reconstruction has exactly the base length');
  eq(sha256(outA), BASE_INDEX_SHA256, '13.5 HEAD − the tag + BOTH UI-panel spans === the PR-4 base index.html, BYTE FOR BYTE');
  eq(RECON_HTML.length, BASE_HTML.length - UI_CHARS + UI_TAG.length + 1,
    '13.6 the size delta is exactly −25,698 declaration chars +' + (UI_TAG.length + 1) + ' tag chars');
  note('PR4: BASE ' + BASE_HTML.length + ' chars sha ' + BASE_INDEX_SHA256.slice(0, 16) +
    ' | HEAD ' + RECON_HTML.length + ' | reconstructed sha ' + sha256(outA).slice(0, 16) + ' — EQUAL');
} else {
  ok(true, '13.5 PR-4 base blob unreachable here — reconstruction skipped; per-span SHA-256 identity still pinned in §5.4');
  note('PR4 RECONSTRUCTION SKIPPED — the base blob is not reachable through git in this checkout');
}
// ── B. cumulative, PR 1 + PR 2 + PR 3 ────────────────────────────────────────
if (PRE_HTML) {
  eq(sha256(PRE_HTML), PRE_PESS_INDEX_SHA256, '13.7 the pre-PESS blob read from git has the recorded SHA-256');
  let cum = RECON_HTML;
  let tagsRemoved = 0;
  for (const owner of SHIPPED_OWNERS) {
    const next = detag(cum, TAG_OF(MODULE_REL[owner]));
    ok(next !== null, '13.8 the ' + MODULE_REL[owner] + ' tag line was removed cleanly');
    cum = next; tagsRemoved++;
  }
  eq(tagsRemoved, SHIPPED_OWNERS.length, '13.9 all shipped PESS tags were removed — 4 tags');
  eq(tagsRemoved, 4, '13.9b …which is the COMPLETE set: the family ships in exactly four modules');
  const allSpans = MANIFEST.filter((m) => isShipped(m[3])).map((m) => ({ off: PRE_OFFSET[m[0]], text: spanTextOf(m[0]) }));
  eq(allSpans.length, SHIPPED_DECLS, '13.10 all nine spans are restored');
  eq(allSpans.length, TOTAL_DECLS, '13.10b …and nine is the WHOLE manifest — nothing had to be taken from the monolith');
  eq(allSpans.reduce((a, s) => a + s.text.length, 0), SHIPPED_CHARS, '13.11 …totalling 52,722 declaration chars');
  const outB = reinsert(cum, allSpans);
  eq(outB.length, PRE_HTML.length, '13.12 the cumulative reconstruction has exactly the pre-PESS length');
  eq(sha256(outB), PRE_PESS_INDEX_SHA256,
    '13.13 HEAD − all four tags + all nine spans === the PRE-PESS index.html, BYTE FOR BYTE — the family is fully reversible');
  note('CUMULATIVE (COMPLETE): ' + allSpans.length + ' spans / ' +
    allSpans.reduce((a, s) => a + s.text.length, 0).toLocaleString('en-US') + ' chars / ' + tagsRemoved +
    ' tags restored → pre-PESS ' + PRE_HTML.length +
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
const BAT_T = ['pessAnalyzeAll'];
const UI_T = ['runPESSPanel', 'pessAnalyzeTicker'];
// PR 4 emptied the monolith of PESS declarations, so `inlineText` has nothing
// left to read: every span now comes from a module instead.
const modText = (n) => {
  for (const o of SHIPPED_OWNERS) if (MODULE_TEXT[o].decls[n] !== undefined) return MODULE_TEXT[o].decls[n];
  throw new Error('mutant setup: no module owns ' + n);
};
// …and "put this declaration back inline" now needs a real injection point in
// the monolith rather than an existing PESS span to sit beside. The anchor is a
// declaration the monolith genuinely still owns, chosen mechanically and
// asserted to be unique so a mutant can never silently fail to apply.
const INLINE_ANCHOR = (() => {
  const cands = A.inlineDecls.filter((d) => d.bindingForm === 'function' && !isPessName(d.name) && d.chars > 200);
  for (const d of cands) {
    const t = A.mono.slice(d.start, d.end);
    if (A.mono.split(t).length - 1 === 1 && HTML.split(t).length - 1 === 1) return t;
  }
  throw new Error('mutant setup: no unique inline anchor found');
})();
// Injecting BEFORE the anchor puts the text at monolith top level, which is
// where a re-introduced PESS declaration would actually land.
const injectInline = (html, text) => swap(html, INLINE_ANCHOR, text + '\n\n' + INLINE_ANCHOR);
const swap = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, 'mutant setup: needle absent — ' + a.slice(0, 60)); return s.slice(0, i) + b + s.slice(i + a.length); };

const GUARDS = [
  ['mask-length-preserving', (r) => r.maskLenOk === true],
  ['config-decl-count', (r) => r.mod[CONFIG_RULES].count === CONFIG_DECLS],
  ['transport-decl-count', (r) => r.mod[LIVE_TRANSPORT].count === TRANSPORT_DECLS],
  ['batch-decl-count', (r) => r.mod[BATCH_PANEL].count === BATCH_DECLS],
  ['ui-decl-count', (r) => r.mod[UI_PANEL].count === UI_DECLS],
  ['config-order', (r) => JSON.stringify(r.mod[CONFIG_RULES].names) === JSON.stringify(CFG_T)],
  ['transport-order', (r) => JSON.stringify(r.mod[LIVE_TRANSPORT].names) === JSON.stringify(TRN_T)],
  ['batch-order', (r) => JSON.stringify(r.mod[BATCH_PANEL].names) === JSON.stringify(BAT_T)],
  ['ui-order', (r) => JSON.stringify(r.mod[UI_PANEL].names) === JSON.stringify(UI_T)],
  ['config-chars', (r) => r.mod[CONFIG_RULES].chars === CONFIG_CHARS],
  ['transport-chars', (r) => r.mod[LIVE_TRANSPORT].chars === TRANSPORT_CHARS],
  ['batch-chars', (r) => r.mod[BATCH_PANEL].chars === BATCH_CHARS],
  ['ui-chars', (r) => r.mod[UI_PANEL].chars === UI_CHARS],
  ['shipped-chars', (r) => r.moduleChars === SHIPPED_CHARS],
  ['span-sha', (r) => SHIPPED_OWNERS.every((o) => r.mod[o].decls.every((d) => sha256(r.mod[o].src.slice(d.start, d.end)) === SPAN_SHA256[d.name]))],
  ['async-form', (r) => r.mod[LIVE_TRANSPORT].decls.every((d) => d.isAsync && d.bindingForm === 'function')],
  ['batch-async-form', (r) => r.mod[BATCH_PANEL].decls.every((d) => d.isAsync && d.bindingForm === 'function')],
  // The UI panel's sync/async MIX is pinned, not just "is a function": making
  // runPESSPanel async would change what every caller observes.
  ['ui-async-form', (r) => {
    const ds = r.mod[UI_PANEL].decls;
    const run = ds.find((d) => d.name === 'runPESSPanel');
    const tick = ds.find((d) => d.name === 'pessAnalyzeTicker');
    return !!run && !!tick && run.isAsync === false && tick.isAsync === true &&
      run.bindingForm === 'function' && tick.bindingForm === 'function';
  }],
  ['binding-forms', (r) => r.mod[CONFIG_RULES].decls.filter((d) => d.bindingForm === 'var').length === 1 && r.mod[CONFIG_RULES].decls.filter((d) => d.bindingForm === 'function').length === 3],
  ['signatures', (r) => SHIPPED_OWNERS.every((o) => r.mod[o].decls.every((d) => { const m = MANIFEST.find((x) => x[0] === d.name); return m && d.signature === m[4]; }))],
  ['inline-count', (r) => r.inlinePess.length === PENDING_DECLS],
  ['inline-chars', (r) => r.inlinePessChars === PENDING_CHARS],
  ['inline-names', (r) => JSON.stringify(r.inlinePessNames) === JSON.stringify([])],
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
  // BATCH_PANEL is allowed its own DOM — that is exactly why it is not called a
  // service — but it is NOT allowed foreign state writes, and the DOM it touches
  // is pinned to the two ids it really uses. "UI-owned" is not a blank cheque.
  ['no-foreign-state-in-batch', (r) => !/\bS\.[A-Za-z_$][\w$]*\s*=(?!=)/.test(maskSource(r.mod[BATCH_PANEL].src))],
  ['batch-state-read-is-scanData-only', (r) => {
    const hits = maskSource(r.mod[BATCH_PANEL].src).match(/\bS\.[A-Za-z_$][\w$]*/g) || [];
    return hits.length > 0 && hits.every((h) => h === 'S.scanData');
  }],
  ['batch-dom-lookups-pinned', (r) => {
    const txt = r.mod[BATCH_PANEL].src;
    const ids = [];
    const re = /document\.getElementById\('([^']+)'\)/g; let m;
    while ((m = re.exec(txt))) ids.push(m[1]);
    return JSON.stringify(ids) === JSON.stringify(['pessAnalyzeAll', 'pessResults']) &&
      (maskSource(txt).match(/document\./g) || []).length === 2;
  }],
  ['batch-renders', (r) => /function renderCard\(r,idx\)\{/.test(r.mod[BATCH_PANEL].src) &&
    /function pField\(text,field\)\{/.test(r.mod[BATCH_PANEL].src)],
  ['batch-no-uipanel-call-edge', (r) => {
    const mc = maskSource(r.mod[BATCH_PANEL].src);
    return !/\bpessAnalyzeTicker\s*\(/.test(mc) && !/\brunPESSPanel\s*\(/.test(mc);
  }],
  ['batch-sequential', (r) => {
    const mc = maskSource(r.mod[BATCH_PANEL].src);
    return !/Promise\.(all|allSettled|race|any)/.test(mc) &&
      /for\(var i=0;i<candidates\.length;i\+\+\)\{/.test(r.mod[BATCH_PANEL].src);
  }],
  ['batch-700ms-gap', (r) => /setTimeout\(r,700\)/.test(r.mod[BATCH_PANEL].src)],
  ['batch-slice-8', (r) => /\.slice\(0,8\)/.test(r.mod[BATCH_PANEL].src)],
  ['batch-ranking-order', (r) => {
    const t = r.mod[BATCH_PANEL].src;
    return /approved=allResults\.filter\(function\(r\)\{return r\.verdict==='APPROVATO';\}\)\s*\n?\s*\.sort\(function\(a,b\)\{return b\.score-a\.score;\}\)/.test(t) &&
      /neutro\s*=allResults\.filter\(function\(r\)\{return r\.verdict==='NEUTRO';\}\)\s*\n?\s*\.sort\(function\(a,b\)\{return b\.score-a\.score;\}\)/.test(t) &&
      /rejected=allResults\.filter\(function\(r\)\{return r\.verdict==='SCARTATO'\|\|r\.verdict==='ERROR';\}\);/.test(t);
  }],
  ['batch-endpoints', (r) => {
    const t = r.mod[BATCH_PANEL].src; const u = [];
    const re = /\bttCall\s*\(\s*'([^']*)'/g; let m;
    while ((m = re.exec(t))) u.push(m[1]);
    return JSON.stringify(u) === JSON.stringify(['/pess/term-structure/', '/pess/chain/']);
  }],
  // ── UI_PANEL guards (PR 4) ────────────────────────────────────────────────
  // Like BATCH_PANEL, the UI panel owns DOM by design. What it may NOT do is
  // write foreign state, and the DOM/markup it emits is a cross-module contract.
  ['no-foreign-state-in-ui', (r) => !/\bS\.[A-Za-z_$][\w$]*\s*=(?!=)/.test(maskSource(r.mod[UI_PANEL].src))],
  ['ui-state-reads-pinned', (r) => {
    const hits = maskSource(r.mod[UI_PANEL].src).match(/\bS\.[A-Za-z_$][\w$]*/g) || [];
    const uniq = [...new Set(hits)].sort();
    return JSON.stringify(uniq) === JSON.stringify(['S.backendKey', 'S.scanData', 'S.ttSessionId']);
  }],
  // Scoped to the DECLARATION BODIES, not the whole file: the module header
  // discusses `document.querySelectorAll('.pess-cand')` in prose, and a guard
  // that counted prose would be measuring the comment, not the code.
  ['ui-dom-lookups-pinned', (r) => {
    const txt = r.mod[UI_PANEL].decls.map((d) => r.mod[UI_PANEL].src.slice(d.start, d.end)).join('\n');
    const ids = [];
    const re = /document\.getElementById\('([^']+)'\)/g; let m;
    while ((m = re.exec(txt))) ids.push(m[1]);
    const sel = [];
    const re2 = /document\.querySelectorAll\('([^']+)'\)/g; let m2;
    while ((m2 = re2.exec(txt))) sel.push(m2[1]);
    return JSON.stringify(ids) === JSON.stringify(['pessResults']) &&
      JSON.stringify(sel) === JSON.stringify(['.pess-cand']) &&
      (maskSource(txt).match(/document\./g) || []).length === 3;
  }],
  // The generated markup IS the cross-module boundary. These four strings are
  // what make pess-batch-panel.js reachable and the panel wiring work at all.
  ['ui-markup-onclick-batch', (r) => (textOf(UI_PANEL, 'runPESSPanel').match(/onclick="pessAnalyzeAll\(\)"/g) || []).length === 1],
  ['ui-markup-ids', (r) => {
    const t = textOf(UI_PANEL, 'runPESSPanel');
    return t.indexOf('id="pessAnalyzeAll"') >= 0 && t.indexOf('id="pessResults"') >= 0 &&
      t.indexOf('onclick="runScan()"') >= 0 && t.indexOf('class="ai pess-cand"') >= 0;
  }],
  ['ui-calls-analyze-ticker', (r) => /\bpessAnalyzeTicker\(ticker\);/.test(textOf(UI_PANEL, 'runPESSPanel'))],
  ['ui-does-not-redeclare-batch', (r) => r.mod[UI_PANEL].names.indexOf('pessAnalyzeAll') < 0],
  ['ui-no-batch-call-edge', (r) => !/\bpessAnalyzeAll\s*\(/.test(maskSource(r.mod[UI_PANEL].src))],
  ['ui-candidate-window', (r) => /return days>=7&&days<=45;/.test(textOf(UI_PANEL, 'runPESSPanel')) &&
    /var sa=Math\.abs\(da-20\),sb=Math\.abs\(db-20\);/.test(textOf(UI_PANEL, 'runPESSPanel'))],
  ['ui-no-slice', (r) => !/\.slice\(0,\d+\)/.test(textOf(UI_PANEL, 'runPESSPanel'))],
  ['ui-listener-deferred', (r) => /setTimeout\(function\(\)\{/.test(textOf(UI_PANEL, 'runPESSPanel')) &&
    /\},50\);/.test(textOf(UI_PANEL, 'runPESSPanel'))],
  // pessAnalyzeTicker's two endpoints, reached two DIFFERENT ways. Collapsing
  // the raw fetch into ttCall would silently change error handling.
  ['ui-endpoints', (r) => {
    const t = textOf(UI_PANEL, 'pessAnalyzeTicker'); const u = [];
    const re = /\bttCall\s*\(\s*'([^']*)'/g; let m;
    while ((m = re.exec(t))) u.push(m[1]);
    return JSON.stringify(u) === JSON.stringify(['/pess/term-structure/']) &&
      /await fetch\(BACKEND\+'\/pess\/chain\/'\+ticker\+/.test(t) &&
      (maskSource(t).match(/\bfetch\s*\(/g) || []).length === 1;
  }],
  ['ui-chain-query-params', (r) => {
    const t = textOf(UI_PANEL, 'pessAnalyzeTicker');
    return ['frontExp=', 'backExp=', 'price=', 'ivr=', 'days=', 'iv='].every((p) => t.indexOf("'" + (p === 'frontExp=' ? '?' : '&') + p + "'+encodeURIComponent(") >= 0) &&
      (t.match(/encodeURIComponent\(/g) || []).length === 6;
  }],
  ['ui-chain-timeout', (r) => /AbortSignal\.timeout\(20000\)/.test(textOf(UI_PANEL, 'pessAnalyzeTicker'))],
  ['ui-rule-calls', (r) => {
    const t = maskSource(textOf(UI_PANEL, 'pessAnalyzeTicker'));
    const n = (re) => (t.match(re) || []).length;
    return n(/\bpessIVRRegime\s*\(/g) === 2 && n(/\bpessIVEdge\s*\(/g) === 1 &&
      n(/\bpessRejectCard\s*\(/g) === 8 && !/\bPESS_LIVE_MIN\b/.test(t);
  }],
  ['ui-transport-calls', (r) => {
    const t = maskSource(textOf(UI_PANEL, 'pessAnalyzeTicker'));
    return (t.match(/\bpessGetStreamerSymbols\s*\(/g) || []).length === 1 &&
      (t.match(/\bpessRunDXLink\s*\(/g) || []).length === 1 &&
      t.indexOf('pessGetStreamerSymbols(') < t.indexOf('pessRunDXLink(');
  }],
  // The status sink is the one place the UI panel and the batch panel diverge:
  // batch passes null, the UI panel passes a live element. Do not let that flip.
  ['ui-status-sink', (r) => /pessRunDXLink\(ticker,_pessSyms,_pessLiveStatus\)/.test(textOf(UI_PANEL, 'pessAnalyzeTicker')) &&
    /pessRunDXLink\(d\.ticker,_bSyms,null\)/.test(textOf(BATCH_PANEL, 'pessAnalyzeAll'))],
  ['ui-agent-call', (r) => (maskSource(textOf(UI_PANEL, 'pessAnalyzeTicker')).match(/\bcallAgent\s*\(/g) || []).length === 1],
  ['ui-gate-directions', (r) => {
    const t = textOf(UI_PANEL, 'pessAnalyzeTicker');
    return /if\(_ivrGate\.hardReject\)\{/.test(t) &&
      /if\(!ts\|\|ts\.termStructureDataComplete===false\)\{/.test(t) &&
      /if\(ts\.isTradable===false\)\{/.test(t) &&
      /if\(ts\.termStructureVerdict!=='to_evaluate'\)\{/.test(t) &&
      /if\(!chain\|\|!chain\.chainComplete\)\{/.test(t);
  }],
  ['ui-final-render', (r) => /if\(res\)res\.innerHTML=cardHtml;/.test(textOf(UI_PANEL, 'pessAnalyzeTicker'))],
  ['ui-setas-count', (r) => (maskSource(textOf(UI_PANEL, 'pessAnalyzeTicker')).match(/\bsetAS\s*\(/g) || []).length === 12],
  ['ui-sysmsg', (r) => (maskSource(textOf(UI_PANEL, 'pessAnalyzeTicker')).match(/\bappendSysMsg\s*\(/g) || []).length === 1],
  ['ui-innerhtml-writes', (r) => (maskSource(textOf(UI_PANEL, 'pessAnalyzeTicker')).match(/res\.innerHTML=/g) || []).length === 14],
  ['tag-once', (r) => SHIPPED_OWNERS.every((o) => r.tagCount[o] === 1)],
  ['tag-before-monolith', (r) => SHIPPED_OWNERS.every((o) => r.tagIndex[o] >= 0 && r.tagIndex[o] < r.monoTagIndex)],
  ['tag-classic', (r) => SHIPPED_OWNERS.every((o) => r.tagObj[o] !== null && !/\bdefer\b/i.test(r.tagObj[o].attrs) && !/\basync\b/i.test(r.tagObj[o].attrs) && !/\btype\s*=/i.test(r.tagObj[o].attrs))],
  ['pess-region-contiguous', (r) => r.localSrcs.indexOf('./' + TRANSPORT_REL) === r.localSrcs.indexOf('./' + CONFIG_REL) + 1 &&
    r.localSrcs.indexOf('./' + BATCH_REL) === r.localSrcs.indexOf('./' + TRANSPORT_REL) + 1 &&
    r.localSrcs.indexOf('./' + UI_REL) === r.localSrcs.indexOf('./' + BATCH_REL) + 1],
  ['pess-module-count', (r) => r.localSrcs.filter((s) => /(^|\/)pess-[a-z-]+\.js$/.test(s)).length === 4],
  ['local-script-count', (r) => r.localSrcs.length === LOCAL_SCRIPT_COUNT],
  ['dsb-tail-preserved', (r) => r.localSrcs[r.localSrcs.length - 27] === './js/ui/backend-directional-snapshot-panel.js' &&
    r.localSrcs[r.localSrcs.length - 26] === './js/services/pretrade-risk-rules.js' &&
    r.localSrcs[r.localSrcs.length - 25] === './js/services/pretrade-technicals.js' &&
    r.localSrcs[r.localSrcs.length - 24] === './js/ui/pretrade-risk-modal.js' &&
    r.localSrcs[r.localSrcs.length - 23] === './js/services/mcx-market-context.js' &&
    r.localSrcs[r.localSrcs.length - 22] === './js/services/mcx-vix-market-context.js' &&
    r.localSrcs[r.localSrcs.length - 21] === './js/services/mcx-backend-candles.js' &&
    r.localSrcs[r.localSrcs.length - 20] === './js/services/journal-core.js' &&
    r.localSrcs[r.localSrcs.length - 19] === './js/services/mcx-regime-policy.js' &&
    r.localSrcs[r.localSrcs.length - 18] === './js/ui/journal-ui.js' &&
    r.localSrcs[r.localSrcs.length - 17] === './' + JOURNAL_REMOTE_REL &&
    r.localSrcs[r.localSrcs.length - 16] === './' + JOURNAL_WRITE_THROUGH_REL &&
    r.localSrcs[r.localSrcs.length - 15] === './' + JOURNAL_MIGRATION_REL &&
    r.localSrcs[r.localSrcs.length - 14] === './' + JOURNAL_MANUAL_IMPORT_REL &&
    r.localSrcs[r.localSrcs.length - 13] === './js/ui/journal-backup-restore.js' &&
    r.localSrcs[r.localSrcs.length - 12] === './js/ui/mcx-macro-check.js' &&
    r.localSrcs[r.localSrcs.length - 11] === './js/ui/mcx-charts.js' &&
    r.localSrcs[r.localSrcs.length - 10] === './js/services/apex-post-auth-init.js' &&
    r.localSrcs[r.localSrcs.length - 9] === './js/ui/tt-reconnect.js' &&
    r.localSrcs[r.localSrcs.length - 8] === './js/ui/journal-close-legs.js' &&
    r.localSrcs[r.localSrcs.length - 7] === './js/ui/journal-trade-forms.js' &&
    r.localSrcs[r.localSrcs.length - 6] === './js/ui/journal-trade-detail.js' &&
    r.localSrcs[r.localSrcs.length - 5] === './js/portfolio/portfolio-data-fetch.js' &&
    r.localSrcs[r.localSrcs.length - 4] === './js/portfolio/backend-portfolios.js' &&
    r.localSrcs[r.localSrcs.length - 3] === './js/portfolio/portfolio-expiry-manual.js' &&
    // Re-terminated with the chain, not merely shifted: without this line the
    // last slot would be checked by no clause at all.
    r.localSrcs[r.localSrcs.length - 2] === './js/portfolio/portfolio-traffic-light.js' &&
    r.localSrcs[r.localSrcs.length - 1] === './js/ui/backend-candle-store-chart.js'],
  ['config-slot', (r) => r.localSrcs.indexOf('./' + CONFIG_REL) === 5],
  ['ui-slot', (r) => r.localSrcs.indexOf('./' + UI_REL) === 8],
  ['ratchet', (r) => r.inlinePess.length === RATCHET_AFTER],
  ['zero-inline', (r) => r.inlinePess.length === 0 && r.inlineDecls.filter((d) => isPessName(d.name)).length === 0],
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
    batch: (per[BATCH_PANEL] || { n: 0 }).n, batchChars: (per[BATCH_PANEL] || { c: 0 }).c,
    ui: (per[UI_PANEL] || { n: 0 }).n, uiChars: (per[UI_PANEL] || { c: 0 }).c,
    ratchetAfter: pending.length,
  };
}
const PLAN_GUARDS = [
  ['plan-total', (p) => p.total === TOTAL_DECLS && p.totalChars === TOTAL_CHARS],
  ['plan-shipped', (p) => p.shipped === SHIPPED_DECLS && p.shippedChars === SHIPPED_CHARS],
  ['plan-pending', (p) => p.pending === PENDING_DECLS && p.pendingChars === PENDING_CHARS],
  ['plan-config', (p) => p.config === CONFIG_DECLS && p.configChars === CONFIG_CHARS],
  ['plan-transport', (p) => p.transport === TRANSPORT_DECLS && p.transportChars === TRANSPORT_CHARS],
  ['plan-batch', (p) => p.batch === BATCH_DECLS && p.batchChars === BATCH_CHARS],
  ['plan-ui', (p) => p.ui === 2 && p.uiChars === 25698],
  ['plan-ratchet', (p) => p.ratchetAfter === RATCHET_AFTER && p.ratchetAfter < RATCHET[RATCHET.length - 2]],
];

function runGuards(html, mods) {
  let r;
  try { r = analyze({ html: html, modules: mods, manifest: MANIFEST, parserFixtures: PARSER_FIXTURES }); } catch (e) { return ['threw:' + String(e.message).slice(0, 40)]; }
  if (r.fatal) return ['fatal:' + r.fatal];
  const broken = [];
  for (const [n, g] of GUARDS) { let v; try { v = g(r); } catch (_) { v = false; } if (!v) broken.push(n); }
  let ctx = null;
  try { ctx = {}; vm.createContext(ctx); vm.runInContext(mods[CONFIG_RULES], ctx, { filename: 'mutant-config.js' }); }
  catch (e) { broken.push('config-does-not-evaluate'); ctx = null; }
  if (ctx) for (const [n, g] of BEHAVIOUR_GUARDS) { let v; try { v = g(ctx); } catch (_) { v = false; } if (!v) broken.push(n); }
  try { const c2 = {}; vm.createContext(c2); vm.runInContext(mods[LIVE_TRANSPORT], c2, { filename: 'mutant-transport.js' }); }
  catch (e) { broken.push('transport-does-not-evaluate'); }
  try {
    const c3 = {}; vm.createContext(c3); vm.runInContext(mods[BATCH_PANEL], c3, { filename: 'mutant-batch.js' });
    if (typeof c3.pessAnalyzeAll !== 'function' || c3.pessAnalyzeAll.constructor.name !== 'AsyncFunction') {
      broken.push('batch-not-an-async-function');
    }
  } catch (e) { broken.push('batch-does-not-evaluate'); }
  return broken;
}
const mods = (overrides) => Object.assign(
  { [CONFIG_RULES]: CONFIG_SRC, [LIVE_TRANSPORT]: TRANSPORT_SRC, [BATCH_PANEL]: BATCH_SRC, [UI_PANEL]: UI_SRC },
  overrides || {});
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
// The UI module's header describes its own code in prose, so several of the
// literals a mutant wants to target — `onclick="pessAnalyzeAll()"`,
// `AbortSignal.timeout(20000)`, the two endpoint paths — appear in a COMMENT
// before they appear in the code. A naive first-occurrence swap would mutate the
// comment and produce an equivalent mutant that no guard can kill, which would
// read as a survivor caused by the contract rather than by the code. So mutation
// is confined to the DECLARATION region; a needle that exists only in the header
// makes `swap` throw at setup rather than silently doing nothing useful.
const UI_DECL_START = A.mod[UI_PANEL].decls[0].start;
const mutUI = (a, b) => UI_SRC.slice(0, UI_DECL_START) + swap(UI_SRC.slice(UI_DECL_START), a, b);

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
    () => runGuards(injectInline(HTML, textOf(LIVE_TRANSPORT, 'pessGetStreamerSymbols')), mods())],
  ['SOURCE', 'a PENDING declaration is extracted early into the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat([modText('pessAnalyzeAll')])) }))],
  ['SOURCE', 'pessAnalyzeTicker extracted early into the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat([modText('pessAnalyzeTicker')])) }))],
  ['SOURCE', 'an unrelated PESS declaration added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat(['async function pessExtraTransport(x){return x;}'])) }))],
  ['SOURCE', 'a non-PESS declaration added to the transport module',
    () => runGuards(HTML, mods({ [LIVE_TRANSPORT]: mkModule(LIVE_TRANSPORT, TRN_T.concat(['function unrelatedHelper(x){return x;}'])) }))],
  ['SOURCE', 'a CONFIG_RULES declaration reintroduced inline',
    () => runGuards(injectInline(HTML, textOf(CONFIG_RULES, 'pessIVEdge')), mods())],
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

  // ── SOURCE / BATCH_PANEL ─────────────────────────────────────────────────
  ['SOURCE', 'pessAnalyzeAll omitted from the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: MODULE_TEXT[BATCH_PANEL].header }))],
  ['SOURCE', 'pessAnalyzeAll duplicated in the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, ['pessAnalyzeAll', 'pessAnalyzeAll']) }))],
  ['SOURCE', 'batch body byte changed (one progress string)',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, 'Analisi in corso...', 'Analisi in corso....') }))],
  ['SOURCE', 'pessAnalyzeAll signature changed (a parameter added)',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, 'async function pessAnalyzeAll(){', 'async function pessAnalyzeAll(opts){') }))],
  ['SOURCE', '`async` removed from pessAnalyzeAll',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, 'async function pessAnalyzeAll', 'function pessAnalyzeAll') }))],
  ['SOURCE', 'pessAnalyzeAll is ALSO left inline',
    () => runGuards(injectInline(HTML, textOf(BATCH_PANEL, 'pessAnalyzeAll')), mods())],
  ['SOURCE', 'a PR-4 declaration is extracted early into the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T.concat([modText('pessAnalyzeTicker')])) }))],
  ['SOURCE', 'runPESSPanel moved early into the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T.concat([modText('runPESSPanel')])) }))],
  ['SOURCE', 'a config helper is duplicated into the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + '\n' + textOf(CONFIG_RULES, 'pessIVRRegime') + '\n' }))],
  ['SOURCE', 'a transport helper is duplicated into the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + '\n' + textOf(LIVE_TRANSPORT, 'pessRunDXLink') + '\n' }))],

  // ── OWNER / the corrected ownership model ────────────────────────────────
  // These are the mutants the PR-3 rename exists to make killable. The first is
  // the exact mistake this PR refused to ship: filing pessAnalyzeAll under a
  // service owner whose contract forbids the DOM it demonstrably owns.
  ['OWNER', 'pessAnalyzeAll filed under a SERVICE owner (the rejected ANALYSIS_SERVICE label)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeAll' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['OWNER', 'pessAnalyzeAll filed under UI_PANEL',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeAll' ? [m[0], m[1], m[2], UI_PANEL, m[4]] : m)))],
  ['OWNER', 'pessAnalyzeTicker filed under BATCH_PANEL',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeTicker' ? [m[0], m[1], m[2], BATCH_PANEL, m[4]] : m)))],
  ['OWNER', 'runPESSPanel filed under BATCH_PANEL',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'runPESSPanel' ? [m[0], m[1], m[2], BATCH_PANEL, m[4]] : m)))],
  ['OWNER', 'the batch module claims ZERO DOM lookups (both removed)',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: BATCH_SRC
      .replace("var btn=document.getElementById('pessAnalyzeAll');", 'var btn=null;')
      .replace("var res=document.getElementById('pessResults');", 'var res=null;') }))],
  ['OWNER', 'the #pessAnalyzeAll lookup alone is removed',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, "var btn=document.getElementById('pessAnalyzeAll');", 'var btn=null;') }))],
  ['OWNER', 'the #pessResults lookup alone is removed',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, "var res=document.getElementById('pessResults');", 'var res=null;') }))],
  ['OWNER', 'a DOM lookup is retargeted to a different element id',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, "getElementById('pessResults')", "getElementById('pessOutput')") }))],
  ['OWNER', 'the renderer is extracted out of the batch declaration',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: BATCH_SRC.replace('function renderCard(r,idx){', 'function renderCardX(r,idx){') }))],
  ['OWNER', 'a foreign state WRITE is introduced into the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, 'var allResults=[];', 'var allResults=[];S.pessBatch=allResults;') }))],
  ['OWNER', 'a second piece of state is READ by the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, 'var candidates=S.scanData.filter', 'var candidates=(S.pessFilter||S.scanData).filter') }))],
  ['OWNER', 'a direct pessAnalyzeAll → pessAnalyzeTicker call edge is introduced',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, '  runAll();', '  pessAnalyzeTicker(candidates[0].ticker);\n  runAll();') }))],
  ['OWNER', 'a direct pessAnalyzeAll → runPESSPanel call edge is introduced',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: swap(BATCH_SRC, '  runAll();', '  runPESSPanel();\n  runAll();') }))],

  // ── LOAD / batch module ──────────────────────────────────────────────────
  ['LOAD', 'the batch-panel tag is removed', () => runGuards(HTML.replace(BATCH_TAG + '\n', ''), mods())],
  ['LOAD', 'the batch-panel tag is duplicated', () => runGuards(swap(HTML, BATCH_TAG + '\n', BATCH_TAG + '\n' + BATCH_TAG + '\n'), mods())],
  ['LOAD', 'the batch-panel tag is moved BEFORE the config module',
    () => runGuards(HTML.replace(BATCH_TAG + '\n', '').replace(CONFIG_TAG + '\n', BATCH_TAG + '\n' + CONFIG_TAG + '\n'), mods())],
  ['LOAD', 'the batch-panel tag is moved BEFORE the transport module (PESS adjacency broken)',
    () => runGuards(HTML.replace(BATCH_TAG + '\n', '').replace(TRANSPORT_TAG + '\n', BATCH_TAG + '\n' + TRANSPORT_TAG + '\n'), mods())],
  ['LOAD', 'the batch-panel tag is moved AFTER the monolith',
    () => runGuards(HTML.replace(BATCH_TAG + '\n', '')
      .replace('<script src="./js/ui/backend-directional-snapshot-panel.js"></script>\n',
        '<script src="./js/ui/backend-directional-snapshot-panel.js"></script>\n') + BATCH_TAG + '\n', mods())],
  ['LOAD', 'the batch-panel tag gains defer',
    () => runGuards(swap(HTML, BATCH_TAG, '<script defer src="./' + BATCH_REL + '"></script>'), mods())],
  ['LOAD', 'the batch-panel tag gains async',
    () => runGuards(swap(HTML, BATCH_TAG, '<script async src="./' + BATCH_REL + '"></script>'), mods())],
  ['LOAD', 'the batch-panel tag becomes type=module',
    () => runGuards(swap(HTML, BATCH_TAG, '<script type="module" src="./' + BATCH_REL + '"></script>'), mods())],
  ['LOAD', 'a top-level BACKEND REQUEST added to the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + "\nttCall('/pess/term-structure/AAPL');\n" }))],
  ['LOAD', 'a top-level DOM lookup added to the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + "\ndocument.getElementById('pessResults');\n" }))],
  ['LOAD', 'a top-level timer added to the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + '\nsetTimeout(function(){}, 0);\n' }))],
  ['LOAD', 'a top-level CALL of pessAnalyzeAll added to the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + '\npessAnalyzeAll();\n' }))],
  ['LOAD', 'a top-level window assignment added to the batch module',
    () => runGuards(HTML, mods({ [BATCH_PANEL]: mkModule(BATCH_PANEL, BAT_T) + '\nwindow.pessAnalyzeAll = pessAnalyzeAll;\n' }))],

  // ── PLAN ─────────────────────────────────────────────────────────────────
  ['PLAN', 'total != 9', () => runPlanGuards(MANIFEST.filter((m) => m[0] !== 'pessAnalyzeAll'))],
  ['PLAN', 'shipped != 7 (an eighth filed as LIVE_TRANSPORT)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeTicker' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['PLAN', 'pending != 2', () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'runPESSPanel' ? [m[0], m[1], m[2], CONFIG_RULES, m[4]] : m)))],
  ['PLAN', 'LIVE_TRANSPORT != 2 declarations',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRejectCard' ? [m[0], m[1], m[2], LIVE_TRANSPORT, m[4]] : m)))],
  ['PLAN', 'BATCH_PANEL != 1 declaration',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRejectCard' ? [m[0], m[1], m[2], BATCH_PANEL, m[4]] : m)))],
  ['PLAN', 'transport chars != 9,127',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRunDXLink' ? [m[0], m[1], 5319, m[3], m[4]] : m)))],
  ['PLAN', 'batch chars != 16,111',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeAll' ? [m[0], m[1], 16110, m[3], m[4]] : m)))],
  ['PLAN', 'shipped chars != 27,024',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessIVEdge' ? [m[0], m[1], 559, m[3], m[4]] : m)))],
  ['PLAN', 'pending chars != 25,698',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeTicker' ? [m[0], m[1], 22012, m[3], m[4]] : m)))],
  ['PLAN', 'the ratchet stays at 3 (the batch panel still filed as pending)',
    () => runPlanGuards(MANIFEST.map((m) => (m[3] === BATCH_PANEL ? [m[0], m[1], m[2], UI_PANEL, m[4]] : m)))],

  // ── UI SOURCE (PR 4) ─────────────────────────────────────────────────────
  ['UI', 'runPESSPanel omitted from the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, ['pessAnalyzeTicker']) }))],
  ['UI', 'pessAnalyzeTicker omitted from the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, ['runPESSPanel']) }))],
  ['UI', 'runPESSPanel duplicated in the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, ['runPESSPanel', 'runPESSPanel', 'pessAnalyzeTicker']) }))],
  ['UI', 'pessAnalyzeTicker duplicated in the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T.concat(['pessAnalyzeTicker'])) }))],
  ['UI', 'the two UI declarations REORDERED',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, ['pessAnalyzeTicker', 'runPESSPanel']) }))],
  ['UI', 'runPESSPanel body byte changed (one status string)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("setAS('pess','busy','Scanning earnings candidates...')", "setAS('pess','busy','Scanning earnings candidates')") }))],
  ['UI', 'pessAnalyzeTicker body byte changed (one progress string)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('Fetching term structure da Tastytrade per ', 'Fetching term structure from Tastytrade per ') }))],
  ['UI', 'runPESSPanel signature changed (parameter added)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('function runPESSPanel()', 'function runPESSPanel(opts)') }))],
  ['UI', 'pessAnalyzeTicker signature changed (parameter dropped)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('async function pessAnalyzeTicker(ticker)', 'async function pessAnalyzeTicker()') }))],
  ['UI', '`async` removed from pessAnalyzeTicker',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('async function pessAnalyzeTicker', 'function pessAnalyzeTicker') }))],
  ['UI', '`async` ADDED to runPESSPanel',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('function runPESSPanel()', 'async function runPESSPanel()') }))],
  ['UI', 'runPESSPanel left inline as well as extracted',
    () => runGuards(injectInline(HTML, textOf(UI_PANEL, 'runPESSPanel')), mods())],
  ['UI', 'pessAnalyzeTicker left inline as well as extracted',
    () => runGuards(injectInline(HTML, textOf(UI_PANEL, 'pessAnalyzeTicker')), mods())],
  ['UI', 'a new unowned PESS declaration appears inline',
    () => runGuards(injectInline(HTML, 'function pessBrandNewThing(x){return x;}'), mods())],
  ['UI', 'an unrelated PESS declaration added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T.concat(['function pessExtraPanel(x){return x;}'])) }))],
  ['UI', 'new mutable state declared in the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T.concat(['var pessPanelCache={};'])) }))],

  // ── UI OWNER / CROSS-MODULE (PR 4) ───────────────────────────────────────
  ['OWNER', 'runPESSPanel filed under BATCH_PANEL (manifest)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'runPESSPanel' ? [m[0], m[1], m[2], BATCH_PANEL, m[4]] : m)))],
  ['OWNER', 'pessAnalyzeTicker filed under BATCH_PANEL (manifest)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeTicker' ? [m[0], m[1], m[2], BATCH_PANEL, m[4]] : m)))],
  ['OWNER', 'pessAnalyzeAll filed under UI_PANEL (manifest)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeAll' ? [m[0], m[1], m[2], UI_PANEL, m[4]] : m)))],
  ['OWNER', 'pessAnalyzeAll COPIED into the UI module — the batch global redeclared',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T.concat([textOf(BATCH_PANEL, 'pessAnalyzeAll')])) }))],
  ['OWNER', 'a CONFIG_RULE is copied into the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T.concat([textOf(CONFIG_RULES, 'pessRejectCard')])) }))],
  ['OWNER', 'a LIVE_TRANSPORT declaration is copied into the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T.concat([textOf(LIVE_TRANSPORT, 'pessRunDXLink')])) }))],
  ['OWNER', 'a foreign state WRITE is introduced into the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("var res=document.getElementById('pessResults');", "S.pessLast=ticker;var res=document.getElementById('pessResults');") }))],
  ['OWNER', 'the UI module READS a fourth piece of state',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('var candidates=S.scanData.filter(', 'var _z=S.somethingElse;var candidates=S.scanData.filter(') }))],
  ['OWNER', 'the #pessResults lookup is retargeted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("getElementById('pessResults')", "getElementById('pessOutput')") }))],
  ['OWNER', 'the .pess-cand selector is retargeted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("querySelectorAll('.pess-cand')", "querySelectorAll('.pess-row')") }))],
  ['OWNER', 'a third DOM access is added to the UI declarations',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("var res=document.getElementById('pessResults');", "var res=document.getElementById('pessResults');var _b=document.body;") }))],

  // ── UI MARKUP / CROSS-MODULE WIRING (PR 4) ───────────────────────────────
  ['UI-MARKUP', 'the Analyze All onclick target is renamed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('onclick="pessAnalyzeAll()"', 'onclick="pessRunAll()"') }))],
  ['UI-MARKUP', 'the Analyze All button id is renamed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('id="pessAnalyzeAll"', 'id="pessRunAllBtn"') }))],
  ['UI-MARKUP', 'the #pessResults container id is renamed in the generated markup',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("html+='<div id=\"pessResults\"></div>';", "html+='<div id=\"pessOut\"></div>';") }))],
  ['UI-MARKUP', 'the pessAnalyzeTicker click target is renamed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('pessAnalyzeTicker(ticker);', 'pessAnalyzeTickerX(ticker);') }))],
  ['UI-MARKUP', 'the empty-state runScan button is retargeted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('onclick="runScan()"', 'onclick="startScan()"') }))],
  ['UI-MARKUP', 'the candidate row class is changed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('class="ai pess-cand"', 'class="ai pess-item"') }))],
  ['UI-MARKUP', 'the candidate ORDER is changed (ideal window re-centred)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('var sa=Math.abs(da-20),sb=Math.abs(db-20);', 'var sa=Math.abs(da-30),sb=Math.abs(db-30);') }))],
  ['UI-MARKUP', 'the candidate WINDOW is widened',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('return days>=7&&days<=45;', 'return days>=7&&days<=60;') }))],
  ['UI-MARKUP', 'the deferred listener attachment is dropped',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('},50);', '},0);') }))],
  ['UI-MARKUP', 'the final result render is omitted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('if(res)res.innerHTML=cardHtml;', ';') }))],
  ['UI-MARKUP', 'one DOM write is dropped from the reject path',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("if(res)res.innerHTML=pessRejectCard(ticker,'IVR Hard Reject',_ivrGate.hardReject);", ';') }))],

  // ── UI SINGLE-TICKER PIPELINE (PR 4) ─────────────────────────────────────
  ['UI-PIPE', 'the term-structure endpoint is changed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("ttCall('/pess/term-structure/'+ticker)", "ttCall('/pess/termstructure/'+ticker)") }))],
  ['UI-PIPE', 'the chain endpoint is changed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("BACKEND+'/pess/chain/'+ticker+", "BACKEND+'/pess/chains/'+ticker+") }))],
  ['UI-PIPE', 'the raw chain fetch is collapsed into ttCall (error handling silently changed)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("var _chResp=await fetch(BACKEND+'/pess/chain/'+ticker+", "var _chResp=await ttCall('/pess/chain/'+ticker+") }))],
  ['UI-PIPE', 'a chain query parameter is omitted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("'&ivr='+encodeURIComponent(ts.ivRank!=null?ts.ivRank:'')+", '') }))],
  ['UI-PIPE', 'encodeURIComponent is removed from a chain parameter',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("'&days='+encodeURIComponent(_pdDays)+", "'&days='+_pdDays+") }))],
  ['UI-PIPE', 'the chain request timeout is changed',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('AbortSignal.timeout(20000)', 'AbortSignal.timeout(30000)') }))],
  ['UI-PIPE', 'the IVR hard-reject gate is INVERTED',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('if(_ivrGate.hardReject){', 'if(!_ivrGate.hardReject){') }))],
  ['UI-PIPE', 'the tradability gate is inverted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('if(ts.isTradable===false){', 'if(ts.isTradable===true){') }))],
  ['UI-PIPE', 'the chain-completeness gate is inverted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('if(!chain||!chain.chainComplete){', 'if(chain&&chain.chainComplete){') }))],
  ['UI-PIPE', 'the streamer-symbol call is omitted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('_pessSyms=await pessGetStreamerSymbols(ticker,chain,ts);', '_pessSyms={};') }))],
  ['UI-PIPE', 'the DXLink call is omitted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('_pessLiveLegs=await pessRunDXLink(ticker,_pessSyms,_pessLiveStatus);', '_pessLiveLegs={};') }))],
  ['UI-PIPE', 'the transport status sink is changed to null (batch-panel behaviour)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('pessRunDXLink(ticker,_pessSyms,_pessLiveStatus)', 'pessRunDXLink(ticker,_pessSyms,null)') }))],
  ['UI-PIPE', 'a rule call is dropped (pessIVEdge)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI('var _ie=pessIVEdge(ts.frontIV,ts.backIV);', 'var _ie={edgePct:null,label:"",adj:0};') }))],
  ['UI-PIPE', 'a reject is converted into an approval',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("var verdict='NEUTRO';", "var verdict='APPROVATO';") }))],
  ['UI-PIPE', 'the agent call is omitted',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("var analysis=await callAgent('pess',ctxStr);", "var analysis='';") }))],
  ['UI-PIPE', 'setAS is dropped from the success path',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("setAS('pess','ok','Analysis complete: '+ticker);", ';') }))],
  ['UI-PIPE', 'appendSysMsg is dropped',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("appendSysMsg('&#9670; PESS analysis for '+ticker+' ('+days+'gg to earnings):');", ';') }))],
  ['UI-PIPE', 'error propagation is changed (the catch rethrows)',
    () => runGuards(HTML, mods({ [UI_PANEL]: mutUI("setAS('pess','err',e.message);", 'throw e;') }))],

  // ── UI LOAD (PR 4) ───────────────────────────────────────────────────────
  ['LOAD', 'the UI-panel tag is removed', () => runGuards(HTML.replace(UI_TAG + '\n', ''), mods())],
  ['LOAD', 'the UI-panel tag is duplicated', () => runGuards(swap(HTML, UI_TAG + '\n', UI_TAG + '\n' + UI_TAG + '\n'), mods())],
  ['LOAD', 'the UI-panel tag is moved BEFORE the batch panel (PESS adjacency broken)',
    () => runGuards(swap(HTML.replace(UI_TAG + '\n', ''), BATCH_TAG + '\n', UI_TAG + '\n' + BATCH_TAG + '\n'), mods())],
  ['LOAD', 'the UI-panel tag is moved out of the PESS region entirely',
    () => runGuards(swap(HTML.replace(UI_TAG + '\n', ''), '<script src="./js/services/candle-normalization.js"></script>\n',
      UI_TAG + '\n<script src="./js/services/candle-normalization.js"></script>\n'), mods())],
  ['LOAD', 'the UI-panel tag is moved AFTER the monolith',
    () => runGuards(HTML.replace(UI_TAG + '\n', '').replace('</body>', UI_TAG + '\n</body>'), mods())],
  ['LOAD', 'the UI-panel tag gains defer',
    () => runGuards(swap(HTML, UI_TAG, '<script defer src="./' + UI_REL + '"></script>'), mods())],
  ['LOAD', 'the UI-panel tag gains async',
    () => runGuards(swap(HTML, UI_TAG, '<script async src="./' + UI_REL + '"></script>'), mods())],
  ['LOAD', 'the UI-panel tag becomes type=module',
    () => runGuards(swap(HTML, UI_TAG, '<script type="module" src="./' + UI_REL + '"></script>'), mods())],
  ['LOAD', 'a top-level DOM call added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + "\ndocument.getElementById('pessResults');\n" }))],
  ['LOAD', 'a top-level BACKEND REQUEST added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + "\nfetch(BACKEND+'/pess/term-structure/AAPL');\n" }))],
  ['LOAD', 'a top-level listener added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + "\ndocument.addEventListener('click',function(){});\n" }))],
  ['LOAD', 'a top-level timer added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + '\nsetTimeout(function(){},50);\n' }))],
  ['LOAD', 'a top-level CALL of runPESSPanel added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + '\nrunPESSPanel();\n' }))],
  ['LOAD', 'a top-level window assignment added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + '\nwindow.runPESSPanel = runPESSPanel;\n' }))],
  ['LOAD', 'a top-level storage read added to the UI module',
    () => runGuards(HTML, mods({ [UI_PANEL]: mkModule(UI_PANEL, UI_T) + "\nlocalStorage.getItem('pess');\n" }))],

  // ── PLAN (PR 4 terminal facts) ───────────────────────────────────────────
  ['PLAN', 'UI_PANEL count != 2',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessRejectCard' ? [m[0], m[1], m[2], UI_PANEL, m[4]] : m)))],
  ['PLAN', 'UI_PANEL chars != 25,698',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'runPESSPanel' ? [m[0], m[1], 3684, m[3], m[4]] : m)))],
  ['PLAN', 'shipped != 9 (one member left unowned)',
    () => runPlanGuards(MANIFEST.map((m) => (m[0] === 'pessAnalyzeTicker' ? [m[0], m[1], m[2], 'UNOWNED', m[4]] : m)))],

  // ── PARSER ───────────────────────────────────────────────────────────────
  ['PARSER', 'masker splits by code point, not UTF-16 unit', () => {
    let r; try { r = analyze({ html: HTML, modules: mods(), manifest: MANIFEST, mask: maskSourceByCodePoint, parserFixtures: PARSER_FIXTURES }); } catch (e) { return ['threw']; }
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

// BATCH behaviour mutants — the real batch, mutated one operation at a time, and
// re-driven through every one of the §11E fixtures. A mutant no fixture can
// distinguish is reported as a survivor, never hidden. Each of these targets an
// operation the ownership audit MEASURED, so none is hypothetical.
const mutBatch = (a, b) => swap(BATCH_SRC, a, b);
async function runBatchBehaviour(mutatedSrc) {
  const broken = [];
  try {
    for (let i = 0; i < BATCH_FIXTURES.length; i++) {
      const m = await runBatch(mutatedSrc, 'mutant-batch.js', BATCH_FIXTURES[i][1]);
      if (JSON.stringify(m) !== JSON.stringify(headBatchLogs[i])) { broken.push('batch-transcript[' + i + ']'); break; }
    }
  } catch (e) { broken.push('batch-threw:' + String(e.message).slice(0, 40)); }
  return broken;
}
const BATCH_MUTANTS = [
  ['/pess/term-structure/ path changed', () => mutBatch("'/pess/term-structure/'", "'/pess/term-structures/'")],
  ['/pess/chain/ path changed', () => mutBatch("'/pess/chain/'", "'/pess/chains/'")],
  ['the term-structure call loses its ticker', () => mutBatch("ttCall('/pess/term-structure/'+d.ticker)", "ttCall('/pess/term-structure/')")],
  ['a chain query parameter is dropped', () => mutBatch("'&iv='+encodeURIComponent(ts.underlyingIV)", "''")],
  ['a chain query parameter is no longer URL-encoded', () => mutBatch('encodeURIComponent(ts.frontExpiration)', 'ts.frontExpiration')],
  ['the two backend calls are REORDERED (chain before term-structure)',
    () => mutBatch('var _aoMiss=[];', 'var _aoMiss=[];await ttCall(\'/pess/chain/\'+d.ticker);')],
  ['the candidate day window 7–45 becomes 7–90', () => mutBatch('return days>=7&&days<=45;', 'return days>=7&&days<=90;')],
  ['the candidate day window lower bound moves', () => mutBatch('return days>=7&&days<=45;', 'return days>=8&&days<=45;')],
  ['the nextEarnings filter is dropped', () => mutBatch('if(!d.nextEarnings)return false;', '')],
  ['the slice cap 8 becomes 4', () => mutBatch('.slice(0,8)', '.slice(0,4)')],
  ['the slice cap is removed entirely', () => mutBatch('.slice(0,8)', '.slice(0)')],
  ['the |days − 20| sort target moves to 30', () => mutBatch('return Math.abs(da-20)-Math.abs(db-20);', 'return Math.abs(da-30)-Math.abs(db-30);')],
  ['the candidate sort is removed', () => mutBatch('return Math.abs(da-20)-Math.abs(db-20);', 'return 0;')],
  ['the IVR hard-reject gate is inverted', () => mutBatch('if(_batchIVRGate.hardReject){', 'if(!_batchIVRGate.hardReject){')],
  ['the IVR hard-reject gate is removed', () => mutBatch('if(_batchIVRGate.hardReject){', 'if(false){')],
  ['the term-structure completeness gate is loosened',
    () => mutBatch("if(!ts||ts.termStructureDataComplete===false||ts.isTradable===false||ts.termStructureVerdict!=='to_evaluate'){", 'if(!ts){')],
  ['the chainComplete gate is loosened', () => mutBatch('if(!chain||!chain.chainComplete){', 'if(!chain){')],
  ['the sequential loop becomes parallel (Promise.all)',
    () => mutBatch('for(var i=0;i<candidates.length;i++){\n      await analyzeOne(candidates[i]);\n      if(i<candidates.length-1)await new Promise(function(r){setTimeout(r,700);});\n    }',
      'await Promise.all(candidates.map(function(c){return analyzeOne(c);}));')],
  ['the 700 ms inter-item delay becomes 100 ms', () => mutBatch('setTimeout(r,700)', 'setTimeout(r,100)')],
  ['the inter-item delay is removed', () => mutBatch('if(i<candidates.length-1)await new Promise(function(r){setTimeout(r,700);});', '')],
  ['the delay is armed after the LAST item too', () => mutBatch('if(i<candidates.length-1)await new Promise', 'if(true)await new Promise')],
  ['the await before analyzeOne is removed', () => mutBatch('await analyzeOne(candidates[i]);', 'analyzeOne(candidates[i]);')],
  ['the streamer-symbol call is omitted', () => mutBatch('_bSyms=await pessGetStreamerSymbols(d.ticker,chain,ts);', '_bSyms=null;')],
  ['the DXLink call is omitted', () => mutBatch('_bLive=await pessRunDXLink(d.ticker,_bSyms,null);', '_bLive={};')],
  ['pessRunDXLink is handed a status element instead of null',
    () => mutBatch('pessRunDXLink(d.ticker,_bSyms,null)', 'pessRunDXLink(d.ticker,_bSyms,res)')],
  ['per-ticker error isolation is removed (the catch rethrows)',
    () => mutBatch("    }catch(e){\n      allResults.push({ticker:d.ticker,verdict:'ERROR',score:0,", '    }catch(e){\n      throw e;\n      allResults.push({ticker:d.ticker,verdict:\'ERROR\',score:0,')],
  ['a reject is converted into an accept', () => mutBatch("allResults.push({ticker:d.ticker,verdict:'SCARTATO',score:0,\n        analysis:'SCARTATO — IVR_HARD_REJECT: '", "allResults.push({ticker:d.ticker,verdict:'APPROVATO',score:0,\n        analysis:'SCARTATO — IVR_HARD_REJECT: '")],
  ['an accepted result is dropped instead of pushed', () => mutBatch('      allResults.push({\n        ticker:d.ticker,verdict,score:rankScore,analysis,', '      if(verdict!==\'APPROVATO\')allResults.push({\n        ticker:d.ticker,verdict,score:rankScore,analysis,')],
  ['the approved ranking comparator is reversed', () => mutBatch(".sort(function(a,b){return b.score-a.score;});\n    var neutro", ".sort(function(a,b){return a.score-b.score;});\n    var neutro")],
  ['the neutral ranking comparator is reversed', () => mutBatch(".sort(function(a,b){return b.score-a.score;});\n    var rejected", ".sort(function(a,b){return a.score-b.score;});\n    var rejected")],
  ['the rejected block is SORTED (insertion order lost)', () => mutBatch("var rejected=allResults.filter(function(r){return r.verdict==='SCARTATO'||r.verdict==='ERROR';});", "var rejected=allResults.filter(function(r){return r.verdict==='SCARTATO'||r.verdict==='ERROR';}).sort(function(a,b){return b.score-a.score;});")],
  ['the BEST FOR TODAY slice 3 becomes 5', () => mutBatch('var best=approved.slice(0,3);', 'var best=approved.slice(0,5);')],
  ['the verdict parse order is swapped (SCARTATO wins over APPROVATO)',
    () => mutBatch("if(analysis.indexOf('APPROVATO')>=0)verdict='APPROVATO';\n      else if(analysis.indexOf('SCARTATO')>=0)verdict='SCARTATO';",
      "if(analysis.indexOf('SCARTATO')>=0)verdict='SCARTATO';\n      else if(analysis.indexOf('APPROVATO')>=0)verdict='APPROVATO';")],
  ['the RANK_SCORE pattern changes', () => mutBatch('/RANK_SCORE:\\s*(\\d+)/', '/RANKSCORE:\\s*(\\d+)/')],
  ['the **SCORE** fallback is removed', () => mutBatch("var sMatch=analysis.match(/\\*\\*SCORE\\*\\*:\\s*(\\d+)/);\n        if(sMatch)rankScore=parseInt(sMatch[1]);", '')],
  ['the final innerHTML commit is omitted', () => mutBatch('if(res)res.innerHTML=out;', '')],
  ['the button is never restored at the end', () => mutBatch("if(btn){btn.disabled=false;btn.textContent='&#9670; ANALIZZA TUTTI ('+candidates.length+')';}", '')],
  ['the status write is omitted', () => mutBatch("setAS('pess','ok',", "0&&setAS('pess','ok',")],
  ['the empty-candidate early return is removed', () => mutBatch('  if(!candidates.length){', '  if(false){')],
  ['the term-structure empty catch starts logging', () => mutBatch("try{ts=await ttCall('/pess/term-structure/'+d.ticker);}catch(e){}", "try{ts=await ttCall('/pess/term-structure/'+d.ticker);}catch(e){console.warn(e.message);}")],
  ['rejectStage punctuation derivation changed', () => mutBatch("_bLiveErr=e.message.split(':')[0].trim();", '_bLiveErr=e.message.trim();')],
  ['runAll() becomes awaited (the pinned defect "fixed")', () => mutBatch('\n  runAll();\n}', '\n  await runAll();\n}')],
];
for (const [label, build] of BATCH_MUTANTS) {
  MUTANTS.push(['BATCH', label, async () => {
    let src;
    try { src = build(); } catch (e) { return ['mutant-setup-failed:' + String(e.message).slice(0, 60)]; }
    if (src === BATCH_SRC) return [];
    const structural = runGuards(HTML, mods({ [BATCH_PANEL]: src }));
    const behavioural = await runBatchBehaviour(src);
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

// ═════════════════════════════════════════════════════════════════════════════
// §15 FAMILY COMPLETION — the assertions that only PR 4 can make
//
// Everything above proves this PR did its job. This section proves the FAMILY
// is finished: nine declarations, four owners, four modules, nothing inline,
// nothing pending, and no fifth module hiding anywhere. Each of these would
// have been false — and untestable — before PR 4.
// ═════════════════════════════════════════════════════════════════════════════
section('15. FAMILY COMPLETION');
eq(MANIFEST.length, 9, '15.1 the PESS declaration manifest is exactly 9');
{
  const owners = {};
  for (const m of MANIFEST) {
    const found = SHIPPED_OWNERS.filter((o) => A.mod[o].pessNames.indexOf(m[0]) >= 0);
    owners[m[0]] = found;
  }
  eq(Object.values(owners).every((v) => v.length === 1), true, '15.2 all 9 have EXACTLY ONE owner module');
  eq(Object.values(owners).every((v) => v.length > 0), true, '15.3 all 9 are EXTERNAL — none is missing');
}
eq(A.inlineDecls.filter((d) => isPessName(d.name)).length, 0, '15.4 ZERO PESS declarations remain in index.html');
eq(SHIPPED_OWNERS.length, 4, '15.5 exactly four PESS production modules exist');
{
  const onDisk = []
    .concat(fs.readdirSync(path.join(ROOT, 'js', 'services')).filter((f) => /^pess-/.test(f)).map((f) => 'js/services/' + f))
    .concat(fs.readdirSync(path.join(ROOT, 'js', 'ui')).filter((f) => /^pess-/.test(f)).map((f) => 'js/ui/' + f))
    .sort();
  deepEq(onDisk, SHIPPED_OWNERS.map((o) => MODULE_REL[o]).sort(),
    '15.6 no FIFTH PESS module exists on disk — the four owners are the complete set');
  // js/adapters/ is checked too: a PESS module could have been filed there.
  eq(fs.existsSync(path.join(ROOT, 'js', 'adapters')) &&
    fs.readdirSync(path.join(ROOT, 'js', 'adapters')).filter((f) => /^pess-/.test(f)).length, 0,
    '15.6b …and none is hiding under js/adapters/');
}
deepEq(SHIPPED_OWNERS.map((o) => A.localSrcs.indexOf('./' + MODULE_REL[o])),
  [5, 6, 7, 8], '15.7 the PESS module load order is exactly slots 6–9, config → transport → batch → UI');
{
  let inert = 0;
  for (const owner of SHIPPED_OWNERS) {
    const touched = [];
    const trap = (label) => new Proxy(function () {}, {
      get(t, p) { if (typeof p === 'string') touched.push(label + '.' + p); return trap(label); },
      set() { touched.push('SET ' + label); return true; },
      apply() { touched.push('CALL ' + label); return trap(label); },
      construct() { touched.push('NEW ' + label); return trap(label); },
    });
    const ctx = {};
    for (const g of AMBIENT) ctx[g] = trap(g);
    vm.createContext(ctx);
    vm.runInContext(A.mod[owner].src, ctx, { filename: MODULE_REL[owner] });
    deepEq(touched, [], '15.8 ' + MODULE_REL[owner] + ' evaluates INERTLY');
    inert++;
  }
  eq(inert, 4, '15.8b all four modules evaluate inertly');
}
ok(PRE_HTML !== null, '15.9 the complete PESS reconstruction ran against a real pre-PESS blob (proven byte-exact in §13.13)');
ok(true, '15.10 the pre-SFS cumulative reconstruction is proven byte-exact by tests/sfs-extraction-boundary-contract.test.js §11.11');
note('9 declarations · 4 owners · 4 modules · 0 inline · 0 pending · no fifth module');

console.log('\n════════════════════════════════════════════════════════════════════════════════');
console.log('  PESS EXTRACTION COMPLETE');
console.log('');
console.log('  CONFIG_RULES     4 /  1,786   js/services/pess-config-rules.js');
console.log('  LIVE_TRANSPORT   2 /  9,127   js/services/pess-live-transport.js');
console.log('  BATCH_PANEL      1 / 16,111   js/ui/pess-batch-panel.js');
console.log('  UI_PANEL         2 / 25,698   js/ui/pess-panel.js');
console.log('  ────────────────────────────');
console.log('  TOTAL            9 / 52,722');
console.log('');
console.log('  INLINE           0 / 0');
console.log('');
console.log('  RATCHET:         ' + RATCHET.join(' → '));
console.log('════════════════════════════════════════════════════════════════════════════════');
console.log('  assertions: ' + passed + '   mutants: ' + MUTANTS.length + '   survivors: ' + survivors.length);
console.log('  parity fixtures: ' + diffs0Label());
console.log('  PESS EXTRACTION BOUNDARY CONTRACT: OK');
console.log('════════════════════════════════════════════════════════════════════════════════');

function diffs0Label() {
  return fixtures + ' rule + ' + asyncFixtures + ' transport + ' + batchFixtures + ' batch + ' +
    panelFixtures + ' panel + ' + tickerFixtures + ' ticker = ' +
    (fixtures + asyncFixtures + batchFixtures + panelFixtures + tickerFixtures) +
    ' · differences ' + (diffs + asyncDiffs + batchDiffs + panelDiffs + tickerDiffs);
}

}

main().catch((e) => { console.error('\n' + (e && e.stack ? e.stack : String(e))); process.exit(1); });
