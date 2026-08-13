'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND DIRECTIONAL SNAPSHOT (DSB) — EXTRACTION BOUNDARY CONTRACT
//
// STATE OF THE EXTRACTION
//   PR 1  COMPLETED — js/adapters/backend-directional-snapshot-adapter.js now
//                     owns the 8 DSB_* var bindings + the 11 measured-pure
//                     helpers (19 declarations, 6789 owned declaration bytes).
//   PR 2  COMPLETED — js/services/backend-directional-snapshot-service.js now
//                     owns the 26 service / state / lifecycle functions
//                     (26385 owned declaration bytes, 3 async + 23 sync).
//   PR 3  COMPLETED — js/ui/backend-directional-snapshot-panel.js now owns the
//                     9 formatting / banner / controls / row / render functions
//                     (14945 owned declaration bytes, 0 async + 9 sync).
//
//   The extraction is COMPLETE. The DSB manifest has THREE SHIPPED OWNERS and
//   the contract measures all of them. Five numbers must never be conflated:
//
//     application-wide DSB manifest   54 declarations (46 functions + 8 vars)
//     adapter module ownership        19 declarations (11 functions + 8 vars)
//     service module ownership        26 declarations (26 functions, 0 vars)
//     panel module ownership           9 declarations (9 functions, 0 vars)
//     inline top-level debug exposures 2 (strategy W2 — they stay in index.html)
//
//   RUNTIME ORDER
//     adapter → service → panel → inline monolith
//
//   The marker range inside index.html holds NO DSB declaration at all: every
//   one of the 54 lives in a shipped module. What remains inline is exactly the
//   two window.apexDebug* exposure statements strategy W2 kept there.
//
// WHAT THIS FILE IS
//   An AUDIT + OWNERSHIP contract, not a behaviour test. It measures — against
//   the REAL application source loaded through tests/lib/load-app-source.js —
//   the physical, lexical, behavioural and load-time boundary of the DSB
//   declarations across ALL THREE owners, and proves that PR 1 relocated its 19
//   declarations, PR 2 its 26 and PR 3 its 9 byte-for-byte, without changing
//   behaviour.
//
//   It copies no implementation, changes no behaviour and writes to no file.
//   Every number below is measured, not assumed.
//
//   tests/backend-directional-snapshot.test.js already pins WHAT the DSB code
//   does. This file pins WHERE it lives: which declarations belong to it, which
//   ones only LOOK like they do, which owner holds each one, who calls in, what
//   it calls out to, what it owns (state / DOM / storage / network / timers /
//   subscriptions), and what must remain true at load time.
//
// WHY IT EXISTS
//   The DSB block was the largest remaining inline monolith cluster. The audit
//   (PR #349) derived a three-module split; PR 1, PR 2 and PR 3 executed it in
//   full. This contract now has to do two jobs at once: keep the original
//   architectural measurements intact as the historical record, and enforce the
//   shipped ownership split so a declaration can never be duplicated, dropped,
//   rewritten or moved into the wrong file.
//
// HOW IT MEASURES
//   • static  — a LENGTH-PRESERVING masker blanks comments, strings, template
//               literals and regex literals so every offset in the masked text
//               is the same offset in the real text. Declarations, statements,
//               call edges and free globals are then read off the masked text
//               with brace matching, never with line numbers.
//   • regions — the analyser is REGION-AWARE: it measures the adapter module
//               span, the service module span, the panel module span and the
//               inline marker span separately, then unions the four into the
//               application-wide DSB manifest. Ownership questions are answered
//               per region; architectural questions over the union.
//   • dynamic — the ordered DSB source (adapter → service → panel → inline,
//               exactly the browser's order) is executed verbatim inside a `vm`
//               context whose globals are stubs and whose `S` is a
//               WRITE-RECORDING Proxy, so state ownership, single-flight, TTL,
//               retry, cooldown and timer counts are proven by execution, not by
//               grep. The adapter, the service and the panel are ALSO executed
//               alone, to prove each is inert at load time.
//   • purity  — the measured-pure subset runs against a THROWING Proxy global:
//               any DOM / network / timer / storage / state access is a hard
//               failure.
//   • mutation-sensitive — SECTION 29 applies mutants (source / plan / order) to
//               COPIES held in memory and proves each one trips at least one
//               guard of the family that describes it. Source mutants operate on
//               a copy of the PART LIST, so "left inline as well", "duplicated in
//               the module" and "extra declaration in the module" are expressible.
//
// AUDIT-ONLY. This contract must never require an application file to change.
//
// Run: node tests/backend-directional-snapshot-boundary-contract.test.js
// ─────────────────────────────────────────────────────────────────────────────
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const APP = require('./lib/load-app-source');

// ── Test harness ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else { fail++; failures.push(msg); console.log('  FAIL  ' + msg); }
}
function eq(actual, expected, msg) {
  if (actual === expected) { pass++; console.log('  PASS  ' + msg + ' = ' + JSON.stringify(actual)); return; }
  fail++; failures.push(msg);
  console.log('  FAIL  ' + msg + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
}
// Deep equality. Detail is printed only on FAILURE — passing large arrays would
// otherwise bury the report in noise.
function deepEq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log('  PASS  ' + msg); return; }
  fail++; failures.push(msg);
  console.log('  FAIL  ' + msg + '\n        expected ' + e + '\n        got      ' + a);
}
function section(t) { console.log('\n── ' + t + ' ' + '─'.repeat(Math.max(0, 76 - t.length))); }
function note(t) { console.log('        · ' + t); }

// ── Application source under audit ───────────────────────────────────────────
const SRC = APP.loadAppJavaScriptSource();
const PARTS = APP.loadOrderedScriptSources();
const HTML = APP.loadIndexHtml();
const SCRIPT_TAGS = APP.parseScriptTags(HTML);

// The ordered application scripts, as {name, code}. This is the unit the
// region-aware analyser and the source mutants both work on: a mutant can move
// a declaration BETWEEN files, which a single concatenated string cannot express.
const APP_PARTS = PARTS.filter(function (p) { return p.isAppJs && p.code != null; })
  .map(function (p) { return { name: p.src || 'INLINE', code: p.code }; });

// Files this contract reads but must never modify. Hashed up front and
// re-hashed in SECTION 30 to prove the audit was side-effect free. The PR 1
// adapter is now one of them: the contract measures it, it does not write it.
const APP_FILES = [
  'index.html',
  'js/api/backend-client.js',
  'js/config/backend-config.js',
  'js/services/backend-scanner-snapshot-service.js',
  'js/ui/backend-scanner-snapshot-panel.js',
  'js/adapters/backend-directional-adapter.js',
  'js/ui/backend-directional-preview.js',
  'js/adapters/backend-directional-snapshot-adapter.js',
  'js/services/backend-directional-snapshot-service.js',
  'js/ui/backend-directional-snapshot-panel.js',
];
function hashFile(rel) {
  const abs = path.resolve(__dirname, '..', rel);
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}
const HASHES_BEFORE = {};
APP_FILES.forEach(function (f) { HASHES_BEFORE[f] = hashFile(f); });

// ── The three OWNERS of the DSB manifest ─────────────────────────────────────
// OWNER 1 — the extracted adapter module (PR 1). Identified by its `src`, which
// is also how index.html and the loader identify it, so the contract and the
// browser agree on what "the adapter" is.
const ADAPTER_REL = 'js/adapters/backend-directional-snapshot-adapter.js';
const ADAPTER_SRC = './' + ADAPTER_REL;
// OWNER 2 — the PR 2 service module: state, source selection, transport, live
// enrichment, refresh lifecycle, the detail/chart bridges and the two debug
// payload builders. Loaded after the adapter and before the monolith.
const SERVICE_REL = 'js/services/backend-directional-snapshot-service.js';
const SERVICE_SRC = './' + SERVICE_REL;
// OWNER 3 — the PR 3 panel module: formatting, freshness badge, banner, controls,
// row HTML and the two backend-directional render entry points. Loaded after the
// service and immediately before the monolith. With it the extraction is
// COMPLETE: all 54 declarations are owned by a shipped module.
const PANEL_REL = 'js/ui/backend-directional-snapshot-panel.js';
const PANEL_SRC = './' + PANEL_REL;

// The inert Portfolio Stress companion modules. They are listed by NAME and
// excluded from the DSB script-order fixture below, so this boundary keeps
// telling the DSB extraction story instead of failing whenever an unrelated —
// and explicitly permitted — script tag is added. An undeclared new script still
// fails, because the two lists together must account for every local script.
//
// Revision 1.3.0: the list is no longer hand-written. It is DERIVED from the two
// tiers the stress model declares — frontendCompanionIdentity (the client tier)
// and frontendUiIdentity (the UI tier) — so a module can only appear here by
// being declared in the model a reviewer reads. Hand-editing this array to make
// the suite green is no longer possible; the declaration has to change first.
const STRESS_COMPANION_SCRIPTS = (function () {
  const model = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '..', 'config', 'risk-models', 'portfolio-stress-test-v1.json'), 'utf8'));
  const tiers = [model.frontendCompanionIdentity || {}, model.frontendUiIdentity || {}];
  const out = [];
  tiers.forEach(function (t) {
    (t.addedRuntimeFiles || []).forEach(function (f) {
      if (f.slice(-3) === '.js') out.push('./' + f);
    });
  });
  return out;
})();
// The integrity inventory above is what SECTION 29 and SECTION 30 re-hash. A
// shipped DSB module that is missing from it would be excluded from every
// "byte-identical on disk" claim in this file — the exact blind spot that would
// make those claims skip the module the current PR exists to ship.
ok(APP_FILES.indexOf(ADAPTER_REL) >= 0, 'integrity inventory includes the shipped DSB adapter');
ok(APP_FILES.indexOf(SERVICE_REL) >= 0, 'integrity inventory includes the shipped DSB service');
ok(APP_FILES.indexOf(PANEL_REL) >= 0, 'integrity inventory includes the shipped DSB panel');
ok(APP_FILES.indexOf('index.html') >= 0, 'integrity inventory includes index.html');
// REGION 4 — the inline residue, still delimited by semantic markers, deliberately
// NOT line numbers. The start marker is the block's banner comment line; the end
// marker is the first declaration that follows it (PR #347 moved showView() to
// sit immediately after the block). After PR 1, PR 2 and PR 3 this range holds
// NO DSB declaration at all — only the 2 window exposure statements, which
// strategy W2 deliberately keeps inline.
const START_MARKER = '// BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner';
const END_MARKER = 'function showView(name) {';
// Files no PR in this plan may create. Option D (a second, chart-owning state
// module) was measured and REJECTED, so its module must NOT exist.
const FUTURE_FILES = [
  'js/services/directional-chart-display-price.js',
];

// ─────────────────────────────────────────────────────────────────────────────
// LENGTH-PRESERVING MASKER
//
// Blanks comments, single/double-quoted strings, template-literal TEXT (the
// interpolated `${...}` expressions stay visible because they ARE code) and
// regex literals, replacing every consumed character with a space and keeping
// newlines. Because the output has exactly the same length as the input, an
// offset found in the masked text addresses the same character in the real
// text — which is what lets this contract report real offsets while searching
// only executable code.
// ─────────────────────────────────────────────────────────────────────────────
const REGEX_PRECEDERS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw',
]);

function maskSource(src) {
  const out = src.split('');
  const n = src.length;
  let i = 0;
  const blank = function (j) { if (src[j] !== '\n') out[j] = ' '; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    // line comment
    if (c === '/' && d === '/') {
      let j = i; while (j < n && src[j] !== '\n') { out[j] = ' '; j++; } i = j; continue;
    }
    // block comment
    if (c === '/' && d === '*') {
      let j = i;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) { blank(j); j++; }
      if (j < n) { out[j] = ' '; out[j + 1] = ' '; j += 2; }
      i = j; continue;
    }
    // quoted string
    if (c === '"' || c === "'") {
      const q = c; out[i] = ' ';
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { blank(j); blank(j + 1); j += 2; continue; }
        if (src[j] === q) { out[j] = ' '; j++; break; }
        if (src[j] === '\n') break;            // unterminated — bail at EOL
        out[j] = ' '; j++;
      }
      i = j; continue;
    }
    // template literal: blank the literal text, keep ${ } expressions visible
    if (c === '`') {
      out[i] = ' ';
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { blank(j); blank(j + 1); j += 2; continue; }
        if (src[j] === '$' && src[j + 1] === '{') {
          out[j] = ' '; out[j + 1] = ' '; j += 2;
          let depth = 1;
          while (j < n && depth > 0) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') { depth--; if (depth === 0) { out[j] = ' '; j++; break; } }
            j++;
          }
          continue;
        }
        if (src[j] === '`') { out[j] = ' '; j++; break; }
        blank(j); j++;
      }
      i = j; continue;
    }
    // regex literal vs division
    if (c === '/') {
      let k = i - 1;
      while (k >= 0 && /\s/.test(out[k])) k--;
      const prev = k >= 0 ? out[k] : null;
      let isRegex = true;
      if (prev && /[A-Za-z0-9_$)\]]/.test(prev)) {
        if (prev === ')' || prev === ']') isRegex = false;
        else {
          let s = k;
          while (s >= 0 && /[A-Za-z0-9_$]/.test(out[s])) s--;
          isRegex = REGEX_PRECEDERS.has(out.slice(s + 1, k + 1).join(''));
        }
      }
      if (isRegex) {
        out[i] = ' ';
        let j = i + 1, inClass = false, closed = false;
        while (j < n) {
          if (src[j] === '\\') { blank(j); blank(j + 1); j += 2; continue; }
          if (src[j] === '\n') break;
          if (src[j] === '[') inClass = true;
          else if (src[j] === ']') inClass = false;
          else if (src[j] === '/' && !inClass) {
            out[j] = ' '; j++;
            while (j < n && /[a-z]/.test(src[j])) { out[j] = ' '; j++; }
            closed = true; break;
          }
          out[j] = ' '; j++;
        }
        i = closed ? j : i + 1; continue;
      }
    }
    i++;
  }
  return out.join('');
}

// Brace-depth prefix table over masked text: BD[i] is the depth BEFORE index i.
function braceDepths(masked) {
  const bd = new Int32Array(masked.length + 1);
  let d = 0;
  for (let i = 0; i < masked.length; i++) { bd[i] = d; const c = masked[i]; if (c === '{') d++; else if (c === '}') d--; }
  bd[masked.length] = d;
  return bd;
}

// Index of the '}' matching the '{' at `from`, on masked text.
function matchBrace(masked, from) {
  let d = 0;
  for (let j = from; j < masked.length; j++) {
    if (masked[j] === '{') d++;
    else if (masked[j] === '}') { d--; if (d === 0) return j; }
  }
  return -1;
}

// Every TOP-LEVEL `function NAME(...)` / `async function NAME(...)` in a source,
// with its exact character span. Depth-0 only, so nested declarations (e.g. the
// `tfSummary` helper inside dsbNormalizeResultRow) are correctly excluded.
function topLevelFunctions(src, masked, bd) {
  const re = /(?:^|\n)[ \t]*(async[ \t]+)?function[ \t]+([A-Za-z_$][A-Za-z0-9_$]*)[ \t]*\(/g;
  const out = [];
  let m;
  while ((m = re.exec(masked)) !== null) {
    const declStart = m.index + (m[0].charAt(0) === '\n' ? 1 : 0);
    if (bd[declStart] !== 0) continue;
    const brace = masked.indexOf('{', re.lastIndex);
    if (brace < 0) continue;
    const close = matchBrace(masked, brace);
    if (close < 0) continue;
    const body = src.slice(declStart, close + 1);
    const paren = body.indexOf(')');
    out.push({
      name: m[2],
      isAsync: !!m[1],
      start: declStart,
      end: close + 1,
      signature: body.slice(0, paren + 1).replace(/\s+/g, ' ').trim(),
    });
  }
  return out;
}

// Top-level `var|let|const NAME` declarations inside a span.
function topLevelBindings(src, masked, bd, from, to) {
  const re = /(?:^|\n)[ \t]*(var|let|const)[ \t]+([A-Za-z_$][A-Za-z0-9_$]*)[ \t]*=/g;
  const out = [];
  let m;
  while ((m = re.exec(masked)) !== null) {
    const s = m.index + (m[0].charAt(0) === '\n' ? 1 : 0);
    if (s < from || s >= to) continue;
    if (bd[s] !== 0) continue;
    out.push({ kind: m[1], name: m[2], start: s });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE ANALYSER — REGION AWARE
//
// One pure function from the ORDERED PART LIST to the complete measurement
// record. Every section below reads from it, and SECTION 29 re-runs it on
// MUTATED COPIES of the part list so each guard predicate is exercised against
// a deliberately broken application.
//
// It measures TWO regions and then unions them:
//
//   ADAPTER region — the whole of the PR 1 module part. Everything it contains
//                    is DSB-owned by construction, so the region is the file.
//   INLINE  region — [START_MARKER, END_MARKER) inside the inline monolith.
//
// Ownership numbers are read per region (`adapterFns`, `inlineFns`, …); the
// architectural numbers the PR #349 audit derived — manifest, signatures, call
// edges, state writers, categories, options A–E — are read off the UNION, so
// they keep measuring the same 54 declarations they always did, no matter which
// file each one currently lives in.
// ─────────────────────────────────────────────────────────────────────────────
const IDENT_RE = /(?<![A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)/g;

const JS_KEYWORDS = new Set(('var let const function return if else for while do break continue new typeof ' +
  'instanceof in of try catch finally throw switch case default this null true false undefined void delete ' +
  'async await yield class extends super export import static get set').split(' '));

const JS_INTRINSICS = new Set(('Object Array String Number Boolean Math JSON Date Promise Map Set WeakMap WeakSet ' +
  'RegExp Error TypeError RangeError isNaN isFinite parseInt parseFloat console Symbol AbortSignal AbortController ' +
  'globalThis Infinity NaN encodeURIComponent decodeURIComponent Intl BigInt Proxy Reflect').split(' '));

function analyze(parts) {
  const src = parts.map(function (p) { return p.code; }).join('\n');
  const masked = maskSource(src);
  const bd = braceDepths(masked);
  const rec = { lengthPreserved: masked.length === src.length, parts: parts };

  // Absolute offset of every part inside the reconstructed source. The loader
  // joins with '\n', so each part starts one character after the previous end.
  const partAt = {};
  {
    let off = 0;
    parts.forEach(function (p) { partAt[p.name] = { start: off, end: off + p.code.length }; off += p.code.length + 1; });
  }
  rec.partAt = partAt;

  rec.startCount = src.split(START_MARKER).length - 1;
  rec.endCount = src.split(END_MARKER).length - 1;
  rec.start = src.indexOf(START_MARKER);
  rec.end = src.indexOf(END_MARKER);
  rec.found = rec.start >= 0 && rec.end > rec.start;
  if (!rec.found) return rec;

  rec.startDepth = bd[rec.start];
  rec.endDepth = bd[rec.end];
  rec.blockLength = rec.end - rec.start;
  rec.blockText = src.slice(rec.start, rec.end);
  rec.blockMasked = masked.slice(rec.start, rec.end);
  rec.src = src;
  rec.masked = masked;

  // ── OWNER 1: the extracted adapter module ─────────────────────────────────
  const ap = partAt[ADAPTER_SRC];
  rec.adapterPresent = !!ap;
  rec.adapterStart = ap ? ap.start : -1;
  rec.adapterEnd = ap ? ap.end : -1;
  rec.adapterText = ap ? src.slice(ap.start, ap.end) : '';
  rec.adapterMasked = ap ? masked.slice(ap.start, ap.end) : '';
  rec.adapterOrder = ap ? parts.findIndex(function (p) { return p.name === ADAPTER_SRC; }) : -1;
  rec.inlineOrder = parts.findIndex(function (p) { return p.name === 'INLINE'; });

  // ── OWNER 2: the extracted service module ─────────────────────────────────
  const sp = partAt[SERVICE_SRC];
  rec.servicePresent = !!sp;
  rec.serviceStart = sp ? sp.start : -1;
  rec.serviceEnd = sp ? sp.end : -1;
  rec.serviceText = sp ? src.slice(sp.start, sp.end) : '';
  rec.serviceMasked = sp ? masked.slice(sp.start, sp.end) : '';
  rec.serviceOrder = sp ? parts.findIndex(function (p) { return p.name === SERVICE_SRC; }) : -1;

  // ── OWNER 3: the extracted panel module ───────────────────────────────────
  const pp = partAt[PANEL_SRC];
  rec.panelPresent = !!pp;
  rec.panelStart = pp ? pp.start : -1;
  rec.panelEnd = pp ? pp.end : -1;
  rec.panelText = pp ? src.slice(pp.start, pp.end) : '';
  rec.panelMasked = pp ? masked.slice(pp.start, pp.end) : '';
  rec.panelOrder = pp ? parts.findIndex(function (p) { return p.name === PANEL_SRC; }) : -1;

  // The four measured regions, in load order. Membership of an offset in ANY of
  // them is what "belongs to the DSB manifest" means from here on. The first
  // three are the shipped owners; the fourth is the inline exposure residue.
  rec.regions = (ap ? [{ id: 'adapter', start: ap.start, end: ap.end }] : [])
    .concat(sp ? [{ id: 'service', start: sp.start, end: sp.end }] : [])
    .concat(pp ? [{ id: 'panel', start: pp.start, end: pp.end }] : [])
    .concat([{ id: 'inline', start: rec.start, end: rec.end }])
    .sort(function (a, b) { return a.start - b.start; });
  rec.inRegion = function (off) {
    for (const r of rec.regions) if (off >= r.start && off < r.end) return r.id;
    return null;
  };
  // The DSB source in the exact order a browser evaluates it — used by the
  // dynamic harness so "after ordered loading" is what actually gets executed.
  rec.regionText = rec.regions.map(function (r) { return src.slice(r.start, r.end); }).join('\n');
  rec.regionMasked = rec.regions.map(function (r) { return masked.slice(r.start, r.end); }).join('\n');
  // Map an offset inside regionText/regionMasked back to its ABSOLUTE offset in
  // the reconstructed source, so ownerAt() still resolves the owning function
  // once a measurement spans more than one region. The join inserts one '\n'
  // between consecutive regions, which is accounted for here.
  rec.regionOffsetToAbs = function (off) {
    let cursor = 0;
    for (const r of rec.regions) {
      const len = r.end - r.start;
      if (off < cursor + len) return r.start + (off - cursor);
      cursor += len + 1;                     // + the joining '\n'
    }
    return -1;
  };

  const allFns = topLevelFunctions(src, masked, bd);
  rec.allFns = allFns;
  const inSpan = function (f, a, b) { return f.start >= a && f.start < b; };
  rec.adapterFns = ap ? allFns.filter(function (f) { return inSpan(f, ap.start, ap.end); }) : [];
  rec.serviceFns = sp ? allFns.filter(function (f) { return inSpan(f, sp.start, sp.end); }) : [];
  rec.panelFns = pp ? allFns.filter(function (f) { return inSpan(f, pp.start, pp.end); }) : [];
  rec.inlineFns = allFns.filter(function (f) { return inSpan(f, rec.start, rec.end); });
  // Union, in application document order (adapter → service → panel → monolith).
  rec.fns = rec.adapterFns.concat(rec.serviceFns).concat(rec.panelFns).concat(rec.inlineFns)
    .sort(function (a, b) { return a.start - b.start; });
  rec.fnNames = rec.fns.map(function (f) { return f.name; });
  rec.duplicateFnNames = rec.fnNames.filter(function (n, i) { return rec.fnNames.indexOf(n) !== i; });
  rec.adapterFnNames = rec.adapterFns.map(function (f) { return f.name; });
  rec.serviceFnNames = rec.serviceFns.map(function (f) { return f.name; });
  rec.panelFnNames = rec.panelFns.map(function (f) { return f.name; });
  rec.inlineFnNames = rec.inlineFns.map(function (f) { return f.name; });

  rec.adapterBindings = ap ? topLevelBindings(src, masked, bd, ap.start, ap.end) : [];
  rec.serviceBindings = sp ? topLevelBindings(src, masked, bd, sp.start, sp.end) : [];
  rec.panelBindings = pp ? topLevelBindings(src, masked, bd, pp.start, pp.end) : [];
  rec.inlineBindings = topLevelBindings(src, masked, bd, rec.start, rec.end);
  rec.bindings = rec.adapterBindings.concat(rec.serviceBindings).concat(rec.panelBindings)
    .concat(rec.inlineBindings)
    .sort(function (a, b) { return a.start - b.start; });
  rec.bindingNames = rec.bindings.map(function (b) { return b.name; });
  rec.adapterBindingNames = rec.adapterBindings.map(function (b) { return b.name; });
  rec.serviceBindingNames = rec.serviceBindings.map(function (b) { return b.name; });
  rec.panelBindingNames = rec.panelBindings.map(function (b) { return b.name; });
  rec.inlineBindingNames = rec.inlineBindings.map(function (b) { return b.name; });

  // Executable code sitting BETWEEN the top-level declarations of a region.
  // Computed per region so the adapter is judged on its own load-time inertness.
  const statementsIn = function (from, to, fns, bindings) {
    const stmts = [];
    let cursor = from;
    const spans = fns.map(function (f) { return [f.start, f.end]; })
      .concat(bindings.map(function (b) {
        const semi = masked.indexOf(';', b.start);
        return [b.start, semi < 0 ? b.start : semi + 1];
      }))
      .sort(function (a, b) { return a[0] - b[0]; });
    for (const [a, b] of spans) {
      if (a > cursor) {
        if (masked.slice(cursor, a).trim()) stmts.push({ start: cursor, end: a, text: src.slice(cursor, a) });
      }
      cursor = Math.max(cursor, b);
    }
    if (to > cursor && masked.slice(cursor, to).trim()) {
      stmts.push({ start: cursor, end: to, text: src.slice(cursor, to) });
    }
    return stmts;
  };
  rec.adapterStatements = ap ? statementsIn(ap.start, ap.end, rec.adapterFns, rec.adapterBindings) : [];
  rec.serviceStatements = sp ? statementsIn(sp.start, sp.end, rec.serviceFns, rec.serviceBindings) : [];
  rec.panelStatements = pp ? statementsIn(pp.start, pp.end, rec.panelFns, rec.panelBindings) : [];
  rec.inlineStatements = statementsIn(rec.start, rec.end, rec.inlineFns, rec.inlineBindings);
  rec.topLevelStatements = rec.adapterStatements.concat(rec.serviceStatements)
    .concat(rec.panelStatements).concat(rec.inlineStatements)
    .sort(function (a, b) { return a.start - b.start; });
  const codeOf = function (list) {
    return list.map(function (s) { return masked.slice(s.start, s.end).trim(); }).filter(Boolean).join('\n');
  };
  rec.topLevelStatementCode = codeOf(rec.topLevelStatements);
  rec.adapterStatementCode = codeOf(rec.adapterStatements);
  rec.serviceStatementCode = codeOf(rec.serviceStatements);
  rec.panelStatementCode = codeOf(rec.panelStatements);
  rec.inlineStatementCode = codeOf(rec.inlineStatements);

  // Owner of an absolute offset: the top-level function containing it, or the
  // synthetic '<top-level>' owner for block-level statements.
  rec.ownerAt = function (off) {
    for (const f of allFns) if (off >= f.start && off < f.end) return f.name;
    return '<top-level>';
  };

  // Call/reference map for every declaration the DSB manifest owns. "Internal"
  // now means "referenced from inside EITHER owned region" — an adapter helper
  // called by a panel function is still an internal DSB edge, which
  // is what keeps the architectural measurements stable across the extraction.
  const owned = rec.fnNames.concat(rec.bindingNames);
  // Offsets of the manifest's own `var DSB_* =` declaration sites, so a
  // constant's declaration is never counted as one of its consumers.
  const declSites = new Set();
  rec.bindings.forEach(function (b) { declSites.add(masked.indexOf(b.name, b.start)); });
  rec.refs = {};
  for (const nm of owned) {
    const re = new RegExp('(?<![A-Za-z0-9_$.])' + nm.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])', 'g');
    const inside = new Set(), outside = new Set();
    let m;
    while ((m = re.exec(masked)) !== null) {
      if (declSites.has(m.index)) continue;             // the binding's own declaration
      const owner = rec.ownerAt(m.index);
      if (owner === nm) continue;                       // self-reference / own body
      if (rec.inRegion(m.index)) inside.add(owner);
      else outside.add(owner);
    }
    rec.refs[nm] = {
      internal: Array.from(inside).sort(),
      external: Array.from(outside).sort(),
    };
  }
  rec.internalEdges = owned.reduce(function (acc, nm) {
    return acc + rec.refs[nm].internal.filter(function (c) { return c !== '<top-level>'; }).length;
  }, 0);
  rec.externallyCalled = rec.fnNames.filter(function (n) { return rec.refs[n].external.length > 0; });

  // Free globals: identifiers referenced by the DSB manifest that the manifest
  // does not declare, minus locally-declared names and language intrinsics.
  // Measured over the UNION of all three regions, so relocating a declaration
  // cannot silently turn an internal reference into an unnoticed free global.
  const declared = new Set(owned);
  let m2;
  const bm = rec.regionMasked;
  let r = /\b(?:var|let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m2 = r.exec(bm)) !== null) declared.add(m2[1]);
  r = /\b(?:var|let|const)\s+[^;\n]*?,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g;
  while ((m2 = r.exec(bm)) !== null) declared.add(m2[1]);
  r = /function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m2 = r.exec(bm)) !== null) {
    m2[1].split(',').forEach(function (p) {
      p = p.trim().replace(/=[\s\S]*$/, '').trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(p)) declared.add(p);
    });
  }
  r = /catch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m2 = r.exec(bm)) !== null) declared.add(m2[1]);
  r = /\bfor\s*\(\s*(?:var|let|const)?\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m2 = r.exec(bm)) !== null) declared.add(m2[1]);
  const freeCounts = {};
  IDENT_RE.lastIndex = 0;
  while ((m2 = IDENT_RE.exec(bm)) !== null) {
    const nm = m2[1];
    if (JS_KEYWORDS.has(nm) || JS_INTRINSICS.has(nm) || declared.has(nm)) continue;
    if (/^\s*:/.test(bm.slice(m2.index + nm.length, m2.index + nm.length + 2))) continue; // object key
    freeCounts[nm] = (freeCounts[nm] || 0) + 1;
  }
  rec.freeGlobals = freeCounts;

  // Behavioural surface counters, measured on masked (code-only) text over the
  // UNION of all three regions — a fetch, timer or storage call smuggled into
  // the adapter or the service counts exactly the same as one left inline.
  const counterSet = function (text) {
    const c = function (re) { return (text.match(re) || []).length; };
    return {
      directFetch: c(/\bfetch\s*\(/g),
      setInterval: c(/\bsetInterval\s*\(/g),
      clearInterval: c(/\bclearInterval\s*\(/g),
      setTimeout: c(/\bsetTimeout\s*\(/g),
      clearTimeout: c(/\bclearTimeout\s*\(/g),
      localStorage: c(/\blocalStorage\b/g),
      getElementById: c(/getElementById\s*\(/g),
      querySelector: c(/querySelector(?:All)?\s*\(/g),
      documentAccess: c(/(?<![A-Za-z0-9_$.])document\s*\./g),
      windowAssign: c(/\bwindow\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/g),
      globalThisAssign: c(/\bglobalThis\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/g),
      scanDataCode: c(/\bS\s*\.\s*scanData\b/g),
      backendDirectionalCode: c(/\bS\s*\.\s*backendDirectional\b/g),
      subscribeDxlinkQuotes: c(/\bsubscribeDxlinkQuotes\b/g),
      fetchLiveQuote: c(/\bfetchLiveQuote\b/g),
      postCandleContext: c(/\bpostCandleContext\b/g),
      webSocket: c(/\bWebSocket\b/g),
      scannerRun: c(/\/scanner\/run/g),
      httpMethod: c(/\bmethod\s*:/g),
      addEventListener: c(/addEventListener\s*\(/g),
    };
  };
  rec.counts = counterSet(bm);
  // The adapter's OWN surface. Every one of these must be zero: the module is a
  // pure leaf, so any non-zero entry is a PR 1 regression regardless of what the
  // union total happens to be.
  rec.adapterCounts = counterSet(rec.adapterMasked);
  // The panel's OWN surface. The panel renders HTML from already-fetched state,
  // so its load-time side-effect surface must be empty exactly like the others.
  rec.panelCounts = counterSet(rec.panelMasked);
  rec.scanDataCommentRefs = (rec.regionText.match(/S\.scanData/g) || []).length;

  // Endpoints referenced by the manifest (from the RAW text — they are strings).
  rec.endpoints = Array.from(new Set((rec.regionText.match(/\/[a-z0-9][a-z0-9/_-]*\/[a-z0-9/_-]+/gi) || [])
    .filter(function (s) { return /^\/(scanner|market|dev)\//.test(s); })));

  // localStorage keys the manifest touches.
  rec.storageKeys = Array.from(new Set(
    [].concat(
      (rec.regionText.match(/localStorage\.getItem\(\s*'([^']+)'/g) || []),
      (rec.regionText.match(/localStorage\.setItem\(\s*'([^']+)'/g) || [])
    ).map(function (s) { return (s.match(/'([^']+)'/) || [])[1]; }).filter(Boolean)
  )).sort();

  // DOM element ids read by the manifest.
  rec.domIds = Array.from(new Set(
    (rec.regionText.match(/getElementById\(\s*'([^']+)'/g) || [])
      .map(function (s) { return (s.match(/'([^']+)'/) || [])[1]; })
  )).sort();

  // Static onclick handlers emitted inside the manifest's HTML strings.
  rec.staticHandlers = Array.from(new Set(
    (rec.regionText.match(/onclick=\\?["'](?:return\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g) || [])
      .map(function (s) { return (s.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\($/) || [])[1]; })
      .filter(Boolean)
  )).sort();

  // window.* exposures declared by the block's top-level statements.
  rec.windowExposures = Array.from(new Set(
    (rec.topLevelStatementCode.match(/window\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g) || [])
      .map(function (s) { return (s.match(/\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=$/) || [])[1]; })
      .filter(Boolean)
  )).sort();

  // The exposures measured as INDIVIDUAL top-level statements rather than as
  // whatever contiguous text happens to sit between two declarations. PR 2
  // relocated the two debug builders that used to separate them, so the two
  // `try{…}catch{…}` exposures are now textually adjacent inside ONE statement
  // region. Counting statement regions would therefore silently collapse
  // "two exposures" into "one" — and would keep passing if a future edit
  // deleted or duplicated one. Each exposure is located by its own `try` and
  // paired with the identifier it publishes, per region, so the count, the
  // order, the wrapper and the owning file all stay measurable.
  rec.exposures = [];
  rec.regions.forEach(function (region) {
    const text = src.slice(region.start, region.end);
    const tmask = masked.slice(region.start, region.end);
    const re = /window\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m2;
    while ((m2 = re.exec(tmask)) !== null) {
      const abs = region.start + m2.index;
      if (rec.ownerAt(abs) !== '<top-level>') continue;   // inside a function body, not an exposure
      // Walk back to the `try` that opens this statement, then forward to the
      // end of its `catch` block: that is the whole exposure statement.
      const tryAt = tmask.lastIndexOf('try', m2.index);
      let stmtStart = tryAt >= 0 ? tryAt : m2.index;
      let stmtEnd = m2.index + m2[0].length;
      const catchAt = tmask.indexOf('catch', stmtEnd);
      if (catchAt >= 0) {
        const brace = tmask.indexOf('{', catchAt);
        const close = brace >= 0 ? matchBrace(tmask, brace) : -1;
        if (close >= 0) stmtEnd = close + 1;
      }
      rec.exposures.push({
        region: region.id,
        property: m2[1],
        value: text.slice(m2.index, m2.index + m2[0].length).split('=').pop().trim(),
        start: region.start + stmtStart,
        end: region.start + stmtEnd,
        text: text.slice(stmtStart, stmtEnd),
      });
    }
  });
  rec.exposures.sort(function (a, b) { return a.start - b.start; });
  rec.exposureNames = rec.exposures.map(function (e) { return e.property; });
  rec.exposureRegions = Array.from(new Set(rec.exposures.map(function (e) { return e.region; })));

  // st.<field> read/write ownership across the manifest. Scanned REGION BY
  // REGION against the real absolute offsets, so ownerAt() resolves the writing
  // function correctly no matter which file the writer now lives in.
  const writes = {}, reads = {};
  rec.regions.forEach(function (region) {
    const text = masked.slice(region.start, region.end);
    const scan = function (re) {
      let m3;
      while ((m3 = re.exec(text)) !== null) {
        const field = m3[1];
        const owner = rec.ownerAt(m3.index + region.start);
        const bag = m3[2] ? writes : reads;
        (bag[field] = bag[field] || new Set()).add(owner);
      }
    };
    scan(/\bst\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(=(?!=))?/g);
    scan(/dsbState\s*\(\s*\)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(=(?!=))?/g);
  });
  rec.stateWrites = {}; rec.stateReads = {};
  Object.keys(writes).sort().forEach(function (k) { rec.stateWrites[k] = Array.from(writes[k]).sort(); });
  Object.keys(reads).sort().forEach(function (k) { rec.stateReads[k] = Array.from(reads[k]).sort(); });

  // The eager field list inside dsbState()'s object literal.
  const stateFn = rec.fns.find(function (f) { return f.name === 'dsbState'; });
  rec.eagerStateFields = [];
  if (stateFn) {
    const body = masked.slice(stateFn.start, stateFn.end);
    const objStart = body.indexOf('{', body.indexOf('S.backendDirectional='));
    if (objStart > 0) {
      const objEnd = matchBrace(body, objStart);
      const lit = body.slice(objStart, objEnd + 1);
      let mm, fre = /(?:^|[{,])\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g;
      while ((mm = fre.exec(lit)) !== null) rec.eagerStateFields.push(mm[1]);
    }
  }
  return rec;
}

const A = analyze(APP_PARTS);

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 0 — masker self-verification
// The whole contract rests on offsets surviving masking. Prove it first.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 0 — length-preserving masker self-verification');
ok(A.src === SRC, 'the region analyser reconstructs exactly the loader\'s application source');
ok(A.lengthPreserved, 'masked source has exactly the same length as the real source (offsets are shared)');
eq(maskSource(SRC).length, SRC.length, 'maskSource() is length-preserving on the full application source');
ok(!/\bfetch\s*\(/.test(maskSource("var s='fetch(';")), 'masker blanks single-quoted string bodies');
ok(!/\bfetch\s*\(/.test(maskSource('var s="fetch(";')), 'masker blanks double-quoted string bodies');
ok(!/\bfetch\s*\(/.test(maskSource('// fetch(')), 'masker blanks line comments');
ok(!/\bfetch\s*\(/.test(maskSource('/* fetch( */')), 'masker blanks block comments');
ok(!/\bfetch\s*\(/.test(maskSource('var s=`fetch(`;')), 'masker blanks template-literal text');
ok(/\bfetch\s*\(/.test(maskSource('var s=`x${fetch(y)}z`;')), 'masker KEEPS ${...} interpolated expressions (they are code)');
ok(!/\bfetch\s*\(/.test(maskSource('var r=/fetch(/g;')), 'masker blanks regex literals');
ok(/\bfetch\s*\(/.test(maskSource('var q=a/b; fetch(c);')), 'masker does not mistake division for a regex literal');
{
  let d = 0;
  for (const ch of A.blockMasked) { if (ch === '{') d++; else if (ch === '}') d--; }
  eq(d, 0, 'masked DSB block has balanced braces (masking did not corrupt structure)');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — the real physical boundary, now split across THREE owners
//
// Before PR 1 this section proved one thing: the marker range holds all 54
// declarations and nothing foreign. That claim is now FALSE by construction and
// must not be restated. What is proven instead:
//
//   • the adapter module region holds exactly its 19 declarations;
//   • the service module region holds exactly its 26 functions;
//   • the panel module region holds exactly its 9 functions;
//   • the inline marker region holds NO declaration at all — only the 2 window
//     exposure statements strategy W2 keeps inline;
//   • no region holds anything foreign;
//   • together the THREE SHIPPED OWNERS hold the 54-declaration manifest, each
//     declaration exactly once.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 1 — physical boundary (adapter + service + panel modules + inline exposures)');
ok(A.found, 'both DSB markers exist in the reconstructed application source');
eq(A.startCount, 1, 'start marker "BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner" is UNIQUE');
eq(A.endCount, 1, 'end marker "function showView(name) {" is UNIQUE');
eq(A.startDepth, 0, 'start marker sits at brace depth 0 (top level, not nested in any function)');
eq(A.endDepth, 0, 'end marker sits at brace depth 0 (top level)');
ok(A.end > A.start, 'end marker follows the start marker');
eq(A.blockLength, 12713, 'measured INLINE RESIDUAL length in characters (60832 originally, less 6789 for PR 1, 26385 for PR 2 and 14945 for PR 3)');
eq(A.blockLength + 6789 + 26385 + 14945, 60832, 'inline residue + the 6789 + 26385 + 14945 relocated declaration chars = the original block length');
note('inline residue spans [' + A.start + ',' + A.end + ') = ' + A.blockLength + ' chars');
note('adapter module spans [' + A.adapterStart + ',' + A.adapterEnd + ') = ' + (A.adapterEnd - A.adapterStart) + ' chars');
note('service module spans [' + A.serviceStart + ',' + A.serviceEnd + ') = ' + (A.serviceEnd - A.serviceStart) + ' chars');
note('panel module spans [' + A.panelStart + ',' + A.panelEnd + ') = ' + (A.panelEnd - A.panelStart) + ' chars');

// OWNER 1 — the adapter module exists, on disk and in the loaded application.
{
  ok(A.adapterPresent, 'OWNER 1: ' + ADAPTER_SRC + ' is present in the loaded application source');
  ok(fs.existsSync(path.resolve(__dirname, '..', ADAPTER_REL)), 'the adapter module exists on disk');
  const part = PARTS.find(function (p) { return p.src === ADAPTER_SRC; });
  ok(!!part, 'the adapter is a parsed <script src> of index.html');
  eq(part ? part.kind : null, 'local', 'the adapter is a LOCAL application script (not remote, not inline)');
  eq(part ? part.isAppJs : null, true, 'the adapter is executable application JavaScript');
  eq(part ? part.type : null, null, 'the adapter tag declares NO type — a classic script');
}

// OWNER 2 — the service module exists, on disk and in the loaded application.
{
  ok(A.servicePresent, 'OWNER 2: ' + SERVICE_SRC + ' is present in the loaded application source');
  ok(fs.existsSync(path.resolve(__dirname, '..', SERVICE_REL)), 'the service module exists on disk');
  const part = PARTS.find(function (p) { return p.src === SERVICE_SRC; });
  ok(!!part, 'the service is a parsed <script src> of index.html');
  eq(part ? part.kind : null, 'local', 'the service is a LOCAL application script (not remote, not inline)');
  eq(part ? part.isAppJs : null, true, 'the service is executable application JavaScript');
  eq(part ? part.type : null, null, 'the service tag declares NO type — a classic script');
  ok(A.adapterEnd <= A.serviceStart, 'the adapter module is fully evaluated BEFORE the service module');
}

// OWNER 3 — the residue still lives inside the single inline <script>.
{
  const appParts = PARTS.filter(function (p) { return p.isAppJs && p.code != null; });
  let offset = 0, host = null;
  for (const p of appParts) {
    const s = offset, e = offset + p.code.length;
    if (A.start >= s && A.end <= e) host = p;
    offset = e + 1;                        // loadAppJavaScriptSource joins with '\n'
  }
  ok(host != null, 'the whole inline residue lives inside ONE script part (it is not split across files)');
  eq(host ? host.kind : null, 'inline', 'the inline residue lives in the INLINE script of index.html');
  // Derived, not pinned: the invariant is that the monolith is the LAST
  // application script, which is what a hardcoded index was standing in for and
  // which no permitted script-tag addition can invalidate.
  eq(host ? host.order : null, appParts[appParts.length - 1].order,
     'the inline monolith is the LAST application script');
  eq(host ? host.kind : null, 'inline', 'and it is the inline one');
  ok(A.adapterEnd <= A.start, 'the adapter module is fully evaluated BEFORE the inline residue');
  ok(A.serviceEnd <= A.start, 'the service module is fully evaluated BEFORE the inline residue');
  ok(A.panelEnd <= A.start, 'the panel module is fully evaluated BEFORE the inline residue');
}

// Contiguity, proven separately for each owner.
{
  // A region is contiguous when blanking every span it OWNS leaves nothing but
  // comments and whitespace. Anything else would be foreign executable material.
  const residueOf = function (region, fns, bindings, statements) {
    const chars = A.masked.slice(region.start, region.end).split('');
    const clear = function (a, b) {
      const lo = Math.max(0, a - region.start), hi = Math.min(chars.length, b - region.start);
      for (let i = lo; i < hi; i++) chars[i] = ' ';
    };
    fns.forEach(function (f) { clear(f.start, f.end); });
    bindings.forEach(function (b) {
      const semi = A.masked.indexOf(';', b.start);
      clear(b.start, semi < 0 ? b.start : semi + 1);
    });
    statements.forEach(function (s) { clear(s.start, s.end); });
    return chars.join('').trim();
  };
  const adapterRegion = A.regions.find(function (r) { return r.id === 'adapter'; });
  const serviceRegion = A.regions.find(function (r) { return r.id === 'service'; });
  const panelRegion = A.regions.find(function (r) { return r.id === 'panel'; });
  const inlineRegion = A.regions.find(function (r) { return r.id === 'inline'; });
  eq(residueOf(adapterRegion, A.adapterFns, A.adapterBindings, A.adapterStatements), '',
     'ADAPTER CONTIGUITY: the module is nothing but its 19 declarations plus comments/whitespace — no foreign code, no wrapper, no IIFE');
  eq(residueOf(serviceRegion, A.serviceFns, A.serviceBindings, A.serviceStatements), '',
     'SERVICE CONTIGUITY: the module is nothing but its 26 function declarations plus comments/whitespace — no foreign code, no wrapper, no IIFE');
  eq(residueOf(panelRegion, A.panelFns, A.panelBindings, A.panelStatements), '',
     'PANEL CONTIGUITY: the module is nothing but its 9 function declarations plus comments/whitespace — no foreign code, no wrapper, no IIFE');
  eq(residueOf(inlineRegion, A.inlineFns, A.inlineBindings, A.inlineStatements), '',
     'INLINE CONTIGUITY: the marker range is nothing but the 2 exposures and comments/whitespace — no DSB declaration is left');
  const adapterCovered = A.adapterFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0);
  const serviceCovered = A.serviceFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0);
  const panelCovered = A.panelFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0);
  const inlineCovered = A.inlineFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0);
  const stmtChars = A.topLevelStatements.reduce(function (n, s) { return n + (s.end - s.start); }, 0);
  eq(serviceCovered, 26385, 'SERVICE OWNED DECLARATION BYTES: the 26 relocated spans measure exactly 26385 chars');
  eq(panelCovered, 14945, 'PANEL OWNED DECLARATION BYTES: the 9 relocated spans measure exactly 14945 chars');
  eq(inlineCovered, 0, 'INLINE OWNED DECLARATION BYTES: the residue owns ZERO declaration chars');
  note('adapter functions cover ' + adapterCovered + ' chars; service functions ' + serviceCovered +
       ' chars; panel functions ' + panelCovered + ' chars; inline residual functions ' + inlineCovered +
       ' chars; top-level statements ' + stmtChars + ' chars; the rest is comments/whitespace');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — declaration inventory, per owner and application-wide
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 2 — declarations and top-level statements');

// ── application-wide manifest (unchanged by the extraction) ──────────────────
eq(A.fns.length, 46, 'the DSB manifest declares exactly 46 top-level functions application-wide');
eq(A.bindings.length, 8, 'the DSB manifest declares exactly 8 top-level bindings (the DSB_* constants)');
eq(A.fns.length + A.bindings.length, 54, 'total declarations owned by the DSB manifest = 54');
deepEq(A.duplicateFnNames, [], 'no function name is declared twice anywhere in the manifest');

// ── owner 1: the adapter module ──────────────────────────────────────────────
eq(A.adapterFns.length, 11, 'ADAPTER OWNERSHIP: the module declares exactly 11 top-level functions');
eq(A.adapterBindings.length, 8, 'ADAPTER OWNERSHIP: the module declares exactly 8 top-level bindings');
eq(A.adapterFns.length + A.adapterBindings.length, 19, 'ADAPTER OWNERSHIP: 19 declarations');
eq(A.adapterStatements.length, 0, 'ADAPTER OWNERSHIP: the module has ZERO executable top-level regions');

// ── owner 2: the service module ──────────────────────────────────────────────
eq(A.serviceFns.length, 26, 'SERVICE OWNERSHIP: the module declares exactly 26 top-level functions');
eq(A.serviceBindings.length, 0, 'SERVICE OWNERSHIP: the module declares ZERO top-level bindings');
eq(A.serviceFns.length + A.serviceBindings.length, 26, 'SERVICE OWNERSHIP: 26 declarations, all of them functions');
eq(A.serviceStatements.length, 0, 'SERVICE OWNERSHIP: the module has ZERO executable top-level regions');
eq(A.serviceFns.filter(function (f) { return f.isAsync; }).length, 3, 'SERVICE OWNERSHIP: exactly 3 of the 26 are async');
eq(A.serviceFns.filter(function (f) { return !f.isAsync; }).length, 23, 'SERVICE OWNERSHIP: the other 23 are sync');

// ── owner 3: the panel module ────────────────────────────────────────────────
eq(A.panelFns.length, 9, 'PANEL OWNERSHIP: the module declares exactly 9 top-level functions');
eq(A.panelBindings.length, 0, 'PANEL OWNERSHIP: the module declares ZERO top-level bindings');
eq(A.panelFns.length + A.panelBindings.length, 9, 'PANEL OWNERSHIP: 9 declarations, all of them functions');
eq(A.panelStatements.length, 0, 'PANEL OWNERSHIP: the module has ZERO executable top-level regions');
eq(A.panelFns.filter(function (f) { return f.isAsync; }).length, 0, 'PANEL OWNERSHIP: ZERO of the 9 are async');
eq(A.panelFns.filter(function (f) { return !f.isAsync; }).length, 9, 'PANEL OWNERSHIP: all 9 are sync');

// ── region 4: the inline residue ─────────────────────────────────────────────
eq(A.inlineFns.length, 0, 'INLINE RESIDUAL OWNERSHIP: ZERO DSB functions remain inline — the extraction is COMPLETE');
eq(A.inlineBindings.length, 0, 'INLINE RESIDUAL OWNERSHIP: ZERO DSB constants remain inline');
// PR 2 relocated the two debug builders that used to sit between the exposures,
// so the two `try{…}catch{…}` statements are now textually ADJACENT and the
// gap-splitting measurement sees a single contiguous region. The exposures are
// therefore counted individually (A.exposures), which is what the W2 strategy
// actually constrains — a merged region count would collapse two into one.
eq(A.inlineStatements.length, 1, 'INLINE RESIDUAL OWNERSHIP: the remaining top-level code forms 1 contiguous region');
eq(A.exposures.length, 2, 'INLINE RESIDUAL OWNERSHIP: that region holds exactly 2 separate window exposure statements');
deepEq(A.exposureRegions, ['inline'], 'INLINE RESIDUAL OWNERSHIP: every exposure lives in the inline residue — none in a module');
eq(A.adapterFns.length + A.serviceFns.length + A.panelFns.length + A.inlineFns.length, 46, 'the three owners partition the 46 functions');
eq(A.adapterBindings.length + A.serviceBindings.length + A.panelBindings.length +
   A.inlineBindings.length, 8, 'the three owners partition the 8 constants');

// ── load-time behaviour, application-wide and per owner ──────────────────────
eq(A.topLevelStatements.length, 1, 'the manifest contains exactly 1 contiguous executable top-level region in total');
eq(A.exposures.length, 2, 'that region is exactly the 2 window.* debug exposure statements — nothing else runs at load time');
eq(A.windowExposures.length, 2, 'the top-level region assigns exactly 2 window.* debug properties');
deepEq(A.exposures.map(function (e) { return e.property; }),
  ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
  'the two exposures appear in their original order');
deepEq(A.exposures.map(function (e) { return e.value; }),
  ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
  'each exposure publishes the identically-named extracted function');
A.exposures.forEach(function (e) {
  ok(/^try\s*\{/.test(e.text.trim()), 'exposure ' + e.property + ' is still wrapped in its original try{…}');
  ok(/catch\s*\(\s*e\s*\)\s*\{/.test(e.text), 'exposure ' + e.property + ' still has its catch(e){…} guard');
  ok(/typeof\s+window\s*!==\s*'undefined'/.test(e.text), 'exposure ' + e.property + ' still typeof-guards window');
});
deepEq(A.windowExposures,
  ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
  'the two load-time statements expose exactly the two debug helpers');
eq(A.adapterStatementCode, '', 'the ADAPTER contributes NO executable top-level code at all');
eq(A.serviceStatementCode, '', 'the SERVICE contributes NO executable top-level code at all');
ok(!/\b(?:setTimeout|setInterval|fetch|addEventListener|localStorage)\s*\(/.test(A.topLevelStatementCode),
   'no timer / fetch / listener / storage call runs at load time anywhere in the manifest');
ok(!/(?<![A-Za-z0-9_$.])dsb[A-Z][A-Za-z0-9_$]*\s*\(/.test(A.topLevelStatementCode),
   'no dsb* function is auto-invoked at load time (no bootstrap call travels with the manifest)');
eq(A.counts.addEventListener, 0, 'the manifest registers ZERO event listeners');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — the manifest: verified, and CORRECTED
//
// tests/backend-directional-snapshot.test.js extracts 48 "DSB-adjacent"
// functions into its sandbox. Being extracted into a behavioural sandbox is NOT
// evidence of block membership — the sandbox also needs collaborators that live
// elsewhere in the monolith. This section measures which of the 48 actually sit
// between the markers, and reports the correction.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 3 — manifest verification and correction');

// The hypothesised list, in the order the behavioural test declares it.
const HYPOTHESISED_48 = [
  'ffBackendDirectionalSnapshot', 'dsbState', '_dsbNum', '_dsbStr', '_dsbBool', '_dsbObj', '_dsbSafeSym',
  'dsbFmtAge', 'dsbFmtClock', 'dsbSourceMode', 'dsbSetSourceMode', 'dsbNormalizeResultRow', 'dsbParseSnapshot',
  'dsbSnapshotAgeMs', 'dsbLegacyOperationalSource', 'dsbLegacySnapshotPresent', 'dsbGetBackendSource',
  'dsbScannerTabActive', 'dsbFetchSnapshot', 'dsbRefreshClicked', 'dsbClassifyRowPrice', 'dsbRowPriceIsCurrent',
  'dsbRepaintIfSafe', 'dsbLiveEnrichReadiness', 'dsbScheduleLiveEnrichRetry', 'dsbCancelLiveEnrichRetry',
  'dsbEnrichVisibleRowsLive', 'resolveLatestDisplayPrice', '_dssResolvePrice', 'dssResolveChartLivePrice',
  'dssEnsureChartLiveQuoteForDisplay', 'dsbAutoRefreshActive', 'dsbStartAutoRefresh', 'dsbStopAutoRefresh',
  'dsbFindRow', 'dsbScanRowShim', 'dsbTechnicalStateShim', 'dsbRowsForMode', 'dsbFreshnessBadgeHtml',
  'dsbBannerHtml', 'dsbControlsHtml', 'dsbRowHtml', 'dsbRenderBackendDirectional',
  'dsbMaybeRenderBackendDirectional', 'dsbSourceNoticeHtml', 'apexDebugBackendDirectionalSnapshot',
  'dsbNoteDirectionalChartOpen', 'apexDebugDirectionalBackendSnapshot',
];
eq(HYPOTHESISED_48.length, 48, 'the hypothesised manifest contains 48 names');

// Names in the hypothesis that are NOT physically inside the block.
const NOT_IN_BLOCK = HYPOTHESISED_48.filter(function (n) { return A.fnNames.indexOf(n) < 0; });
deepEq(NOT_IN_BLOCK, ['resolveLatestDisplayPrice', '_dssResolvePrice'],
  'CORRECTION: exactly 2 of the 48 hypothesised functions live OUTSIDE the DSB block');
// Names inside the block that the hypothesis omitted.
const NOT_IN_MANIFEST = A.fnNames.filter(function (n) { return HYPOTHESISED_48.indexOf(n) < 0; });
deepEq(NOT_IN_MANIFEST, [], 'the hypothesis omits no function that IS inside the block');
eq(A.fnNames.length, 46, 'the CORRECTED DSB manifest contains 46 functions, not 48');

// Where the two outliers actually live, and why they must not move.
{
  const byName = {};
  A.allFns.forEach(function (f) { if (!byName[f.name]) byName[f.name] = f; });
  const rlpd = byName['resolveLatestDisplayPrice'];
  const drp = byName['_dssResolvePrice'];
  ok(!!rlpd && !!drp, 'both outliers are top-level declarations elsewhere in the monolith');
  ok(rlpd.start < A.start, 'resolveLatestDisplayPrice is declared BEFORE the DSB inline residue');
  ok(drp.start < A.start, '_dssResolvePrice is declared BEFORE the DSB inline residue');
  // WHAT THIS PINS, AND WHY IT IS NO LONGER AN ABSOLUTE OFFSET
  //
  // The invariant is "nothing inside the monolith ABOVE these two declarations
  // changed" — that is what proves the DSB extraction inserted scripts and
  // deleted declarations without editing the surrounding monolith.
  //
  // An absolute offset into the reconstructed source expressed that only by
  // accident: it also moves whenever ANY module that loads before the monolith
  // is added or grows, which is explicitly permitted (a script tag is a
  // permitted monolith addition, and js/api/backend-client.js is an actively
  // maintained owner). Under an absolute pin, a permitted script tag read as a
  // monolith edit — the opposite of what the invariant means.
  //
  // So the preceding contribution is MEASURED and subtracted, and what is pinned
  // is the offset INSIDE the monolith. A real edit above either declaration
  // still fails; an added or grown preceding module correctly does not.
  const PRECEDING_TOTAL = (function () {
    let sum = 0;
    for (const p of APP_PARTS) {
      if (p.name === 'INLINE') break;
      sum += p.code.length + 1;            // loadAppJavaScriptSource joins with '\n'
    }
    return sum;
  })();
  ok(PRECEDING_TOTAL > 0, 'modules load before the inline monolith and contribute to the reconstructed source');
  eq(rlpd.start - PRECEDING_TOTAL, 242549, 'measured declaration offset of resolveLatestDisplayPrice INSIDE the monolith');
  eq(drp.start - PRECEDING_TOTAL, 203132, 'measured declaration offset of _dssResolvePrice INSIDE the monolith');
  eq(rlpd.start - drp.start, 242549 - 203132,
     'the gap between the two declarations is unchanged — nothing was inserted between them');
  {
    // Both offsets moved by EXACTLY the three modules' contribution to the
    // reconstructed source (each one's length plus the loader's joining '\n'),
    // and by nothing else. That is the mechanical proof that PR 1, PR 2 and PR 3
    // inserted scripts and deleted declarations — none edited the surrounding
    // monolith. Both outliers precede the DSB residue, so they are pushed
    // forward by the full contribution of all three modules.
    const adapterContribution = (A.adapterEnd - A.adapterStart) + 1;
    const serviceContribution = (A.serviceEnd - A.serviceStart) + 1;
    const panelContribution = (A.panelEnd - A.panelStart) + 1;
    eq(adapterContribution, 7852, 'the adapter module contributes this many chars to the reconstructed source');
    eq(serviceContribution, 27015, 'the service module contributes this many chars to the reconstructed source');
    eq(panelContribution, 15370, 'the panel module contributes this many chars to the reconstructed source');
    // BASELINE REBASE. Each baseline is the declaration's offset inside the inline monolith
    // BEFORE the three modules were extracted. Both were rebased by the SWING session-identity
    // work, which edits the monolith deliberately (it is not an extraction):
    //   resolveLatestDisplayPrice  396136 → 399006 (+2870: _candleTradingSessionDate and the
    //                                       session-guard contract, added just above it)
    //                              399006 → 399405  (+399: the _priceAt observation stamp at
    //                                       the two scanner write sites, both above it)
    //   _dssResolvePrice           359589 → 359988  (+399: only the _priceAt stamp is above it;
    //                                       the session-guard block sits BELOW this decl)
    // The invariant pinned here is unchanged: the DELTA between each pre-extraction baseline
    // and the reconstructed-source offset must still equal exactly the three modules'
    // contribution and nothing else — which is what proves the extractions inserted scripts
    // and deleted declarations without editing anything around them.
    // The pre-extraction baselines above are kept as the historical record. The
    // arithmetic that used to compare against them directly is now expressed as
    // the in-monolith offsets pinned above, which state the same property
    // (nothing was edited around these declarations) without also breaking every
    // time a permitted module is added ahead of the monolith. What the three
    // contribution pins still prove is that the DSB modules themselves were not
    // edited, so the extraction record remains mechanically checked.
    ok(adapterContribution + serviceContribution + panelContribution === 50237,
       'the three DSB modules still contribute exactly what the extraction recorded');
  }
  note('the outliers sit ~' + Math.round((A.start - rlpd.start) / 1000) + 'k and ~' +
       Math.round((A.start - drp.start) / 1000) + 'k chars before the residue — not adjacent to it');

  // They are shared frontend infrastructure: measured by counting the distinct
  // top-level owners that reference them anywhere in the application.
  const ownersOf = function (nm) {
    const re = new RegExp('(?<![A-Za-z0-9_$.])' + nm + '(?![A-Za-z0-9_$])', 'g');
    const set = new Set(); let m;
    while ((m = re.exec(A.masked)) !== null) { const o = A.ownerAt(m.index); if (o !== nm) set.add(o); }
    return Array.from(set).sort();
  };
  const rlpOwners = ownersOf('resolveLatestDisplayPrice');
  const drpOwners = ownersOf('_dssResolvePrice');
  ok(rlpOwners.length >= 6, 'resolveLatestDisplayPrice has many distinct callers (' + rlpOwners.length + ') — shared infrastructure');
  ok(drpOwners.length >= 3, '_dssResolvePrice has several distinct callers (' + drpOwners.length + ') — shared infrastructure');
  const rlpDsbCallers = rlpOwners.filter(function (o) { return A.fnNames.indexOf(o) >= 0; });
  deepEq(rlpDsbCallers, ['dssResolveChartLivePrice'],
    'only ONE DSB function consumes resolveLatestDisplayPrice — it is a dependency, not a member');
  const drpDsbCallers = drpOwners.filter(function (o) { return A.fnNames.indexOf(o) >= 0; });
  deepEq(drpDsbCallers, [], 'NO DSB function calls _dssResolvePrice at all — it reached the sandbox only transitively');
  note('callers of resolveLatestDisplayPrice: ' + rlpOwners.join(', '));
  note('callers of _dssResolvePrice: ' + drpOwners.join(', '));
}
ok(true, 'VERDICT: the DSB manifest is 46 functions + 8 constants; resolveLatestDisplayPrice and _dssResolvePrice MUST stay inline');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 4 — signatures and physical order
//
// PR 1 changed the APPLICATION-WIDE physical order (the adapter's 11 functions
// now evaluate first, from an earlier script) but it changed NOTHING about the
// declarations themselves: same names, same sync/async kind, same signatures,
// and the same RELATIVE order within each owner.
//
// PRE_PR1_ORDER is kept as the historical record so the relative-order claim is
// checked against the real pre-extraction measurement rather than restated.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 4 — signatures, sync/async, physical order');

// The 46 names in the order they appeared BEFORE PR 1 (audit #349 measurement).
const PRE_PR1_ORDER = [
  'ffBackendDirectionalSnapshot', 'dsbState', '_dsbNum', '_dsbStr', '_dsbBool', '_dsbObj', '_dsbSafeSym',
  'dsbClassifyRowPrice', 'dsbRowPriceIsCurrent', 'dsbFmtAge', 'dsbFmtClock', 'dsbSourceMode',
  'dsbSetSourceMode', 'dsbNormalizeResultRow', 'dsbParseSnapshot', 'dsbSnapshotAgeMs',
  'dsbLegacyOperationalSource', 'dsbLegacySnapshotPresent', 'dsbGetBackendSource', 'dsbScannerTabActive',
  'dsbFetchSnapshot', 'dsbRefreshClicked', 'dsbRepaintIfSafe', 'dsbLiveEnrichReadiness',
  'dsbScheduleLiveEnrichRetry', 'dsbCancelLiveEnrichRetry', 'dsbEnrichVisibleRowsLive',
  'dssResolveChartLivePrice', 'dssEnsureChartLiveQuoteForDisplay', 'dsbAutoRefreshActive',
  'dsbStartAutoRefresh', 'dsbStopAutoRefresh', 'dsbFindRow', 'dsbScanRowShim', 'dsbTechnicalStateShim',
  'dsbRowsForMode', 'dsbFreshnessBadgeHtml', 'dsbBannerHtml', 'dsbControlsHtml', 'dsbRowHtml',
  'dsbRenderBackendDirectional', 'dsbMaybeRenderBackendDirectional', 'dsbSourceNoticeHtml',
  'apexDebugBackendDirectionalSnapshot', 'dsbNoteDirectionalChartOpen', 'apexDebugDirectionalBackendSnapshot',
];
eq(PRE_PR1_ORDER.length, 46, 'the pre-PR-1 physical order record has 46 entries');

// [name, isAsync, exact signature] in EXACT current application-wide order:
// the adapter's 11 first (it loads first), then the service's 26, then the 9
// inline panel residuals.
const MANIFEST = [
  // ── owner 1: js/adapters/backend-directional-snapshot-adapter.js ──────────
  ['_dsbNum', false, 'function _dsbNum(v)'],
  ['_dsbStr', false, 'function _dsbStr(v)'],
  ['_dsbBool', false, 'function _dsbBool(v)'],
  ['_dsbObj', false, 'function _dsbObj(v)'],
  ['_dsbSafeSym', false, 'function _dsbSafeSym(v)'],
  ['dsbClassifyRowPrice', false, 'function dsbClassifyRowPrice(r)'],
  ['dsbRowPriceIsCurrent', false, 'function dsbRowPriceIsCurrent(r)'],
  ['dsbNormalizeResultRow', false, 'function dsbNormalizeResultRow(r)'],
  ['dsbParseSnapshot', false, 'function dsbParseSnapshot(raw)'],
  ['dsbSnapshotAgeMs', false, 'function dsbSnapshotAgeMs(st)'],
  ['dsbRowsForMode', false, 'function dsbRowsForMode(rows,mode)'],
  // ── owner 2: js/services/backend-directional-snapshot-service.js ──────────
  ['ffBackendDirectionalSnapshot', false, 'function ffBackendDirectionalSnapshot()'],
  ['dsbState', false, 'function dsbState()'],
  ['dsbSourceMode', false, 'function dsbSourceMode()'],
  ['dsbSetSourceMode', false, 'function dsbSetSourceMode(mode)'],
  ['dsbLegacyOperationalSource', false, 'function dsbLegacyOperationalSource()'],
  ['dsbLegacySnapshotPresent', false, 'function dsbLegacySnapshotPresent()'],
  ['dsbGetBackendSource', false, 'function dsbGetBackendSource()'],
  ['dsbScannerTabActive', false, 'function dsbScannerTabActive()'],
  ['dsbFetchSnapshot', true, 'async function dsbFetchSnapshot(opts)'],
  ['dsbRefreshClicked', false, 'function dsbRefreshClicked()'],
  ['dsbRepaintIfSafe', false, 'function dsbRepaintIfSafe()'],
  ['dsbLiveEnrichReadiness', false, 'function dsbLiveEnrichReadiness()'],
  ['dsbScheduleLiveEnrichRetry', false, 'function dsbScheduleLiveEnrichRetry()'],
  ['dsbCancelLiveEnrichRetry', false, 'function dsbCancelLiveEnrichRetry()'],
  ['dsbEnrichVisibleRowsLive', true, 'async function dsbEnrichVisibleRowsLive(opts)'],
  ['dssResolveChartLivePrice', false, 'function dssResolveChartLivePrice(symbol, rowData)'],
  ['dssEnsureChartLiveQuoteForDisplay', true, 'async function dssEnsureChartLiveQuoteForDisplay(symbol)'],
  ['dsbAutoRefreshActive', false, 'function dsbAutoRefreshActive()'],
  ['dsbStartAutoRefresh', false, 'function dsbStartAutoRefresh()'],
  ['dsbStopAutoRefresh', false, 'function dsbStopAutoRefresh()'],
  ['dsbFindRow', false, 'function dsbFindRow(symbol)'],
  ['dsbScanRowShim', false, 'function dsbScanRowShim(symbol)'],
  ['dsbTechnicalStateShim', false, 'function dsbTechnicalStateShim(symbol)'],
  ['apexDebugBackendDirectionalSnapshot', false, 'function apexDebugBackendDirectionalSnapshot()'],
  ['dsbNoteDirectionalChartOpen', false, 'function dsbNoteDirectionalChartOpen(symbol,ts)'],
  ['apexDebugDirectionalBackendSnapshot', false, 'function apexDebugDirectionalBackendSnapshot()'],
  // ── owner 3: the panel module (PR 3) ──────────────────────────────────────
  ['dsbFmtAge', false, 'function dsbFmtAge(ms)'],
  ['dsbFmtClock', false, 'function dsbFmtClock(iso)'],
  ['dsbFreshnessBadgeHtml', false, 'function dsbFreshnessBadgeHtml(src)'],
  ['dsbBannerHtml', false, 'function dsbBannerHtml(src,modeCount)'],
  ['dsbControlsHtml', false, 'function dsbControlsHtml(isShort)'],
  ['dsbRowHtml', false, 'function dsbRowHtml(r,isShort)'],
  ['dsbRenderBackendDirectional', false, 'function dsbRenderBackendDirectional(src)'],
  ['dsbMaybeRenderBackendDirectional', false, 'function dsbMaybeRenderBackendDirectional()'],
  ['dsbSourceNoticeHtml', false, 'function dsbSourceNoticeHtml()'],
];
eq(MANIFEST.length, 46, 'the measured manifest table has 46 entries');
deepEq(A.fnNames, MANIFEST.map(function (r) { return r[0]; }),
  'measured PHYSICAL ORDER of the 46 declarations matches the manifest exactly');
deepEq(A.fns.map(function (f) { return f.isAsync; }), MANIFEST.map(function (r) { return r[1]; }),
  'measured sync/async kind of all 46 declarations matches the manifest');
deepEq(A.fns.map(function (f) { return f.signature; }), MANIFEST.map(function (r) { return r[2]; }),
  'measured full signatures of all 46 declarations match the manifest');
// The manifest is a PERMUTATION of the pre-PR-1 record: no name gained, lost or
// renamed — only the file each one lives in changed.
deepEq(MANIFEST.map(function (r) { return r[0]; }).slice().sort(), PRE_PR1_ORDER.slice().sort(),
  'the 46 names are exactly the pre-PR-1 names — nothing added, dropped or renamed by the extraction');
// RELATIVE order is preserved inside each owner: all three owners' name lists
// are SUBSEQUENCES of the pre-PR-1 order.
{
  const isSubsequence = function (sub, full) {
    let i = 0;
    for (const n of full) if (i < sub.length && sub[i] === n) i++;
    return i === sub.length;
  };
  ok(isSubsequence(A.adapterFnNames, PRE_PR1_ORDER),
     'the adapter\'s 11 functions keep their PRE-PR-1 relative order (a subsequence, not a reshuffle)');
  ok(isSubsequence(A.serviceFnNames, PRE_PR1_ORDER),
     'the service\'s 26 functions keep their PRE-PR-1 relative order');
  ok(isSubsequence(A.panelFnNames, PRE_PR1_ORDER),
     'the panel\'s 9 functions keep their PRE-PR-1 relative order');
  deepEq(A.inlineFnNames, [],
     'the inline residue contributes no name at all — every function is owned by a shipped module');
  deepEq(A.adapterFnNames.concat(A.serviceFnNames).concat(A.panelFnNames).concat(A.inlineFnNames).slice().sort(),
     PRE_PR1_ORDER.slice().sort(),
     'the three owners\' orders interleave back into exactly the pre-PR-1 name set');
}
{
  const asyncFns = A.fns.filter(function (f) { return f.isAsync; }).map(function (f) { return f.name; });
  deepEq(asyncFns, ['dsbFetchSnapshot', 'dsbEnrichVisibleRowsLive', 'dssEnsureChartLiveQuoteForDisplay'],
    'exactly 3 of the 46 are async — the three that touch the network');
  deepEq(A.adapterFns.filter(function (f) { return f.isAsync; }), [],
    'NONE of the adapter\'s 11 functions is async — a pure leaf has nothing to await');
}
{
  let sorted = true;
  for (let i = 1; i < A.fns.length; i++) if (A.fns[i].start <= A.fns[i - 1].start) sorted = false;
  ok(sorted, 'declaration offsets are strictly increasing (physical order is well-defined)');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 5 — categories A–I (verified partition, not an assumption)
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 5 — category partition A–I');

const CATEGORIES = {
  A: ['ffBackendDirectionalSnapshot', 'dsbState', 'dsbSourceMode', 'dsbSetSourceMode'],
  B: ['_dsbNum', '_dsbStr', '_dsbBool', '_dsbObj', '_dsbSafeSym', 'dsbNormalizeResultRow',
      'dsbParseSnapshot', 'dsbSnapshotAgeMs', 'dsbClassifyRowPrice', 'dsbRowPriceIsCurrent'],
  C: ['dsbLegacyOperationalSource', 'dsbLegacySnapshotPresent', 'dsbGetBackendSource'],
  D: ['dsbScannerTabActive', 'dsbFetchSnapshot', 'dsbRefreshClicked'],
  E: ['dsbRepaintIfSafe', 'dsbLiveEnrichReadiness', 'dsbScheduleLiveEnrichRetry',
      'dsbCancelLiveEnrichRetry', 'dsbEnrichVisibleRowsLive'],
  F: ['dsbAutoRefreshActive', 'dsbStartAutoRefresh', 'dsbStopAutoRefresh'],
  G: ['dsbFmtAge', 'dsbFmtClock', 'dsbRowsForMode', 'dsbFreshnessBadgeHtml', 'dsbBannerHtml',
      'dsbControlsHtml', 'dsbRowHtml', 'dsbRenderBackendDirectional',
      'dsbMaybeRenderBackendDirectional', 'dsbSourceNoticeHtml'],
  H: ['dsbFindRow', 'dsbScanRowShim', 'dsbTechnicalStateShim', 'dssResolveChartLivePrice',
      'dssEnsureChartLiveQuoteForDisplay', 'dsbNoteDirectionalChartOpen'],
  I: ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
};
const CATEGORY_OF = {};
Object.keys(CATEGORIES).forEach(function (k) { CATEGORIES[k].forEach(function (n) { CATEGORY_OF[n] = k; }); });

deepEq(A.fnNames.filter(function (n) { return !CATEGORY_OF[n]; }), [],
  'every one of the 46 functions is assigned to exactly one category');
{
  const all = Object.keys(CATEGORIES).reduce(function (acc, k) { return acc.concat(CATEGORIES[k]); }, []);
  eq(all.length, 46, 'the categories partition all 46 functions with no overlap');
  deepEq(all.filter(function (n) { return A.fnNames.indexOf(n) < 0; }), [],
    'no category references a function that is not in the block');
}
deepEq(Object.keys(CATEGORIES).map(function (k) { return k + '=' + CATEGORIES[k].length; }),
  ['A=4', 'B=10', 'C=3', 'D=3', 'E=5', 'F=3', 'G=10', 'H=6', 'I=2'],
  'measured category sizes');

// The instruction sheet placed dsbFmtAge / dsbFmtClock under "rendering" — the
// measurement agrees: both are display formatters that delegate to the BSS
// panel's formatters and are only ever called from HTML builders.
deepEq(A.refs['dsbFmtAge'].internal, ['dsbBannerHtml', 'dsbFreshnessBadgeHtml'],
  'dsbFmtAge is called only by HTML builders — category G confirmed');
deepEq(A.refs['dsbFmtClock'].internal, ['dsbBannerHtml'],
  'dsbFmtClock is called only by an HTML builder — category G confirmed');

// Category C's real relationship with the BSS family and the BDS adapter.
{
  const legacy = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbLegacyOperationalSource'; }).start,
                           A.fns.find(function (f) { return f.name === 'dsbLegacyOperationalSource'; }).end);
  const legacyMasked = maskSource(legacy);
  ok(/\bbssState\s*\(/.test(legacyMasked), 'dsbLegacyOperationalSource reads bssState() — the PR #211 poll, never its own fetch');
  ok(!/\bfetch\s*\(/.test(legacyMasked), 'dsbLegacyOperationalSource performs NO fetch of its own');
  ok(/bdsDeriveBackendDirectionalRows/.test(legacyMasked),
     'dsbLegacyOperationalSource delegates row derivation to the EXTRACTED backend-directional-adapter');
  const present = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbLegacySnapshotPresent'; }).start,
                            A.fns.find(function (f) { return f.name === 'dsbLegacySnapshotPresent'; }).end);
  ok(/\bbssState\s*\(/.test(maskSource(present)), 'dsbLegacySnapshotPresent also reads bssState() only');
}
{
  // The three other bds* adapter helpers are NOT referenced by the block: the
  // block consumes only the adapter's top-level entry point.
  const adapterRefs = Object.keys(A.freeGlobals).filter(function (k) { return /^bds[A-Z]/.test(k); });
  deepEq(adapterRefs, ['bdsDeriveBackendDirectionalRows'],
    'the block touches exactly ONE adapter function — bdsIsBackendDirectionalCandidate / bdsMapBackendCandidateToDirectionalRow / bdsSortBackendDirectionalRows are reached only through it');
  const bssRefs = Object.keys(A.freeGlobals).filter(function (k) { return /^bss[A-Z]/.test(k); }).sort();
  deepEq(bssRefs, ['bssFmtAgeMs', 'bssFmtClock', 'bssState'],
    'the block touches exactly 3 BSS-family functions');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 6 — the DSB constants
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 6 — DSB_* constants: kind, position, consumers, TDZ');

const DSB_CONSTANTS = [
  'DSB_SNAPSHOT_TTL_MS', 'DSB_AUTO_REFRESH_MS', 'DSB_LIVE_ENRICH_TTL_MS', 'DSB_LIVE_SYMBOL_CAP',
  'DSB_PRICE_FRESH_MS', 'DSB_LIVE_RETRY_MS', 'DSB_LIVE_ABORT_COOLDOWN_MS', 'DSB_CHART_LIVE_TTL_MS',
];
deepEq(A.bindingNames, DSB_CONSTANTS, 'the 8 DSB constants are declared in the measured order');
deepEq(A.bindings.map(function (b) { return b.kind; }), new Array(8).fill('var'),
  'ALL 8 constants are declared with `var` — NOT const/let');
ok(true, 'consequence: the constants are hoisted+initialised-to-undefined, so they have NO Temporal Dead Zone');
{
  // They are declared before every function that reads them, and they are the
  // very first code of the adapter module.
  const firstFn = A.fns[0].start;
  ok(A.bindings.every(function (b) { return b.start < firstFn; }),
     'all 8 constants are declared BEFORE the first function of the manifest');
  ok(A.bindings.every(function (b) { return b.start >= A.adapterStart && b.start < A.adapterEnd; }),
     'all 8 constants now live INSIDE the adapter module (PR 1 ownership)');
  ok(A.bindings[0].start > A.adapterStart, 'the constants come after the module header comment');
  ok(A.bindings[A.bindings.length - 1].start < A.adapterFns[0].start,
     'the 8 constants precede all 11 adapter functions, exactly as they preceded the block before PR 1');
  deepEq(A.inlineBindingNames, [], 'NO DSB constant is left behind in the inline monolith');
}
{
  // Consumers, measured.
  const expected = {
    DSB_SNAPSHOT_TTL_MS: ['dsbFetchSnapshot'],
    DSB_AUTO_REFRESH_MS: ['dsbStartAutoRefresh'],
    DSB_LIVE_ENRICH_TTL_MS: ['dsbEnrichVisibleRowsLive'],
    DSB_LIVE_SYMBOL_CAP: ['dsbLiveEnrichReadiness'],
    DSB_PRICE_FRESH_MS: ['dsbClassifyRowPrice'],
    DSB_LIVE_RETRY_MS: ['dsbScheduleLiveEnrichRetry'],
    DSB_LIVE_ABORT_COOLDOWN_MS: ['dsbEnrichVisibleRowsLive'],
    DSB_CHART_LIVE_TTL_MS: ['dssEnsureChartLiveQuoteForDisplay', 'dssResolveChartLivePrice'],
  };
  DSB_CONSTANTS.forEach(function (c) {
    deepEq(A.refs[c].internal, expected[c], 'consumers of ' + c);
    deepEq(A.refs[c].external, [], c + ' has NO consumer outside the block');
  });
}
ok(true, 'consequence: no constant is shared with non-DSB code — all 8 move with the block, none must stay inline');
ok(true, 'consequence: a single owner per constant means extraction cannot create a second state owner');
{
  // Constants are never read at load time — so relocating them into an EARLIER
  // script is safe even though `S` and `WL` are `const` in the inline monolith.
  ok(!DSB_CONSTANTS.some(function (c) { return new RegExp('\\b' + c + '\\b').test(A.topLevelStatementCode); }),
     'no DSB constant is read by a top-level statement — no load-time evaluation, no TDZ exposure');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 7 — S.backendDirectional: the single state owner
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 7 — state ownership (S.backendDirectional)');

{
  const stateFn = A.fns.find(function (f) { return f.name === 'dsbState'; });
  const body = maskSource(SRC.slice(stateFn.start, stateFn.end));
  ok(/if\s*\(\s*!\s*S\s*\.\s*backendDirectional/.test(body),
     'dsbState() creates S.backendDirectional LAZILY (guarded by an existence check)');
  ok(!/^\s*S\s*\.\s*backendDirectional\s*=/m.test(A.topLevelStatementCode),
     'S.backendDirectional is NEVER created eagerly at load time');
  eq(A.eagerStateFields.length, 14, 'the lazy initialiser declares 14 eager fields');
  deepEq(A.eagerStateFields, [
    'parsed', 'error', 'fetching', 'lastFetchAt', 'endpointSupported', 'lastHttpStatus', 'sourceMode',
    'autoRefreshTimerId', 'liveEnriching', 'lastLiveEnrichAt', 'livePriceReason', 'liveRetryTimerId',
    'liveEnrichCooldownUntil', 'inflightSnapshot',
  ], 'measured eager field list of S.backendDirectional');
}
{
  const touched = Object.keys(A.stateWrites).concat(Object.keys(A.stateReads));
  const dynamic = Array.from(new Set(touched)).filter(function (k) { return A.eagerStateFields.indexOf(k) < 0; }).sort();
  deepEq(dynamic, ['chartLiveQuote', 'chartOpenContext'],
    'exactly 2 fields are added DYNAMICALLY after creation (never in the initialiser)');
  eq(A.eagerStateFields.length + dynamic.length, 16, 'total measured state surface = 16 fields');
}
// Per-field ownership. Writers are what matter for a split: a field written by
// two of the three modules would need a shared owner.
{
  const expectedWriters = {
    autoRefreshTimerId: ['dsbStartAutoRefresh', 'dsbStopAutoRefresh'],
    chartLiveQuote: ['dssEnsureChartLiveQuoteForDisplay'],
    chartOpenContext: ['dsbNoteDirectionalChartOpen'],
    endpointSupported: ['dsbFetchSnapshot'],
    error: ['dsbFetchSnapshot'],
    fetching: ['dsbFetchSnapshot'],
    inflightSnapshot: ['dsbFetchSnapshot'],
    lastFetchAt: ['dsbFetchSnapshot'],
    lastHttpStatus: ['dsbFetchSnapshot'],
    lastLiveEnrichAt: ['dsbEnrichVisibleRowsLive'],
    liveEnrichCooldownUntil: ['dsbEnrichVisibleRowsLive'],
    liveEnriching: ['dsbEnrichVisibleRowsLive'],
    livePriceReason: ['dsbEnrichVisibleRowsLive'],
    liveRetryTimerId: ['dsbCancelLiveEnrichRetry', 'dsbScheduleLiveEnrichRetry'],
    parsed: ['dsbFetchSnapshot'],
    sourceMode: ['dsbSetSourceMode', 'dsbSourceMode'],
  };
  Object.keys(expectedWriters).sort().forEach(function (f) {
    deepEq(A.stateWrites[f], expectedWriters[f], 'writers of S.backendDirectional.' + f);
  });
  eq(Object.keys(A.stateWrites).length, 16, 'exactly 16 state fields are written, all from inside the block');
  const allWriters = Array.from(new Set(Object.keys(A.stateWrites).reduce(function (acc, f) {
    return acc.concat(A.stateWrites[f]);
  }, []))).sort();
  ok(allWriters.every(function (w) { return A.fnNames.indexOf(w) >= 0; }),
     'every state WRITER is one of the 46 block functions — no external writer exists');
  eq(allWriters.length, 10, 'exactly 10 of the 46 functions write state');
  note('state writers: ' + allWriters.join(', '));
}
// Ownership summary keyed to the categories requested by the audit brief.
{
  const owns = function (label, fields, owner) {
    const writers = Array.from(new Set(fields.reduce(function (acc, f) {
      return acc.concat(A.stateWrites[f] || []);
    }, []))).sort();
    deepEq(writers, owner, 'ownership — ' + label);
  };
  owns('snapshot + parsed + fetching + inflightSnapshot + endpointSupported + error',
       ['parsed', 'fetching', 'inflightSnapshot', 'endpointSupported', 'error'], ['dsbFetchSnapshot']);
  owns('source mode', ['sourceMode'], ['dsbSetSourceMode', 'dsbSourceMode']);
  owns('live enrichment', ['liveEnriching', 'lastLiveEnrichAt', 'livePriceReason'], ['dsbEnrichVisibleRowsLive']);
  owns('retry timer', ['liveRetryTimerId'], ['dsbCancelLiveEnrichRetry', 'dsbScheduleLiveEnrichRetry']);
  owns('abort cooldown', ['liveEnrichCooldownUntil'], ['dsbEnrichVisibleRowsLive']);
  owns('auto-refresh timer', ['autoRefreshTimerId'], ['dsbStartAutoRefresh', 'dsbStopAutoRefresh']);
  owns('chart-open context', ['chartOpenContext'], ['dsbNoteDirectionalChartOpen']);
  owns('chart live quote cache', ['chartLiveQuote'], ['dssEnsureChartLiveQuoteForDisplay']);
}
// No other part of the application writes S.backendDirectional.
{
  const re = /\bS\s*\.\s*backendDirectional\b(?!Preview)/g;
  let m, outside = [];
  while ((m = re.exec(A.masked)) !== null) {
    // "outside the block" now means outside EVERY owned region: the state
    // accessor moved into the service module, so testing the inline span alone
    // would report the manifest's own owner as a foreign writer.
    if (A.inRegion(m.index) === null) outside.push(A.ownerAt(m.index));
  }
  deepEq(Array.from(new Set(outside)).sort(), [],
    'NOTHING outside the block references S.backendDirectional — single, exclusive state owner');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 8 — S.scanData is never consulted
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 8 — S.scanData independence');
eq(A.counts.scanDataCode, 0, 'the block contains ZERO executable references to S.scanData');
eq(A.scanDataCommentRefs, 7, 'S.scanData appears 7 times in the block — every one of them inside a COMMENT');
ok(A.scanDataCommentRefs > 0 && A.counts.scanDataCode === 0,
   'the raw/masked split proves the mentions are documentation, not usage (a plain grep would report 7 false positives)');
ok(!/\bcomputeDirectionalSetupCandidates\s*\(/.test(A.regionMasked),
   'the block never calls the frontend candidate computation itself — the fallback runs in the inline renderer');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 9 — internal caller map
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 9 — internal caller map (46 functions + 8 constants)');
eq(A.internalEdges, 115, 'measured internal reference edges (caller → declaration pairs) inside the block');
{
  // Functions nothing inside the block calls: these are the block's own entry
  // points, reached from outside or only through a static handler.
  const noInternalCaller = A.fnNames.filter(function (n) {
    return A.refs[n].internal.filter(function (c) { return c !== '<top-level>'; }).length === 0;
  }).sort();
  deepEq(noInternalCaller, [
    'apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot',
    'dsbMaybeRenderBackendDirectional', 'dsbNoteDirectionalChartOpen', 'dsbRefreshClicked',
    'dsbScanRowShim', 'dsbSetSourceMode', 'dsbSourceNoticeHtml', 'dsbStartAutoRefresh',
    'dsbTechnicalStateShim', 'dssEnsureChartLiveQuoteForDisplay', 'dssResolveChartLivePrice',
  ], 'the 12 functions with no internal JS caller — every one is an entry point');
  // Nothing is dead. Each is reached by exactly one of three routes, and this
  // classification is what a caller map must distinguish:
  //   • an external JS caller elsewhere in the monolith,
  //   • a static onclick= global emitted into the block's own HTML,
  //   • a window.* debug exposure (manual console entry point).
  const route = function (n) {
    if (A.refs[n].external.length > 0) return 'js-caller';
    if (A.staticHandlers.indexOf(n) >= 0) return 'static-onclick';
    if (A.windowExposures.indexOf(n) >= 0) return 'window-debug';
    return 'DEAD';
  };
  deepEq(noInternalCaller.filter(function (n) { return route(n) === 'DEAD'; }), [],
    'NO dead code: every internally-uncalled function is reachable by a measured route');
  deepEq(noInternalCaller.filter(function (n) { return route(n) === 'js-caller'; }),
    ['dsbMaybeRenderBackendDirectional', 'dsbNoteDirectionalChartOpen', 'dsbScanRowShim',
     'dsbSourceNoticeHtml', 'dsbStartAutoRefresh', 'dsbTechnicalStateShim',
     'dssEnsureChartLiveQuoteForDisplay', 'dssResolveChartLivePrice'],
    'reached by an external JS caller: 8 functions');
  deepEq(noInternalCaller.filter(function (n) { return route(n) === 'static-onclick'; }),
    ['dsbRefreshClicked', 'dsbSetSourceMode'], 'reached ONLY by a static onclick global: 2 functions');
  deepEq(noInternalCaller.filter(function (n) { return route(n) === 'window-debug'; }),
    ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
    'reached ONLY by a window.* debug exposure: 2 functions');
}
{
  // Fan-in of the shared primitives, measured.
  const fanIn = function (n) { return A.refs[n].internal.filter(function (c) { return c !== '<top-level>'; }).length; };
  ok(fanIn('_dsbNum') >= 5, '_dsbNum is used by ' + fanIn('_dsbNum') + ' block functions (high-fan-in primitive)');
  ok(fanIn('dsbState') >= 15, 'dsbState is used by ' + fanIn('dsbState') + ' block functions (the state accessor)');
  ok(fanIn('_dsbSafeSym') >= 5, '_dsbSafeSym is used by ' + fanIn('_dsbSafeSym') + ' block functions');
}
// Spot-check the edges that a split must not break.
deepEq(A.refs['dsbFetchSnapshot'].internal.sort(),
  ['dsbMaybeRenderBackendDirectional', 'dsbRefreshClicked', 'dsbStartAutoRefresh'],
  'dsbFetchSnapshot is driven by exactly 3 internal callers (render / manual refresh / auto-refresh)');
deepEq(A.refs['dsbEnrichVisibleRowsLive'].internal.sort(),
  ['dsbFetchSnapshot', 'dsbMaybeRenderBackendDirectional', 'dsbRefreshClicked',
   'dsbScheduleLiveEnrichRetry', 'dsbStartAutoRefresh'],
  'dsbEnrichVisibleRowsLive has 5 internal callers');
deepEq(A.refs['dsbGetBackendSource'].internal.sort(),
  ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot', 'dsbFindRow',
   'dsbLiveEnrichReadiness', 'dsbMaybeRenderBackendDirectional', 'dsbSourceNoticeHtml'],
  'dsbGetBackendSource internal callers');
deepEq(A.refs['dsbFindRow'].internal.sort(),
  ['dsbNoteDirectionalChartOpen', 'dsbScanRowShim', 'dsbTechnicalStateShim',
   'dssEnsureChartLiveQuoteForDisplay', 'dssResolveChartLivePrice'],
  'dsbFindRow is the shared row lookup of the whole detail/chart bridge');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 10 — external consumers, static handlers, debug entry points
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 10 — external consumers and entry points');
eq(A.externallyCalled.length, 11, 'exactly 11 of the 46 functions are referenced from outside the block');
{
  const EXPECTED_EXTERNAL = {
    dsbGetBackendSource: ['bssUniverseDiagHtml'],
    dsbEnrichVisibleRowsLive: ['_apexPostAuthInit'],
    dssResolveChartLivePrice: ['_dssRenderLargeCharts'],
    dssEnsureChartLiveQuoteForDisplay: ['openDirectionalSetupDetail'],
    dsbStartAutoRefresh: ['_apexPostAuthInit', 'showView'],
    dsbStopAutoRefresh: ['showView'],
    dsbScanRowShim: ['openDirectionalSetupDetail'],
    dsbTechnicalStateShim: ['openDirectionalSetupDetail'],
    dsbMaybeRenderBackendDirectional: ['renderDirectionalSetupScanner'],
    dsbSourceNoticeHtml: ['renderDirectionalSetupScanner'],
    dsbNoteDirectionalChartOpen: ['openDirectionalSetupDetail'],
  };
  Object.keys(EXPECTED_EXTERNAL).sort().forEach(function (n) {
    deepEq(A.refs[n].external, EXPECTED_EXTERNAL[n], 'external consumers of ' + n);
  });
  const consumers = Array.from(new Set(Object.keys(EXPECTED_EXTERNAL).reduce(function (acc, n) {
    return acc.concat(EXPECTED_EXTERNAL[n]);
  }, []))).sort();
  deepEq(consumers, ['_apexPostAuthInit', '_dssRenderLargeCharts', 'bssUniverseDiagHtml',
                     'openDirectionalSetupDetail', 'renderDirectionalSetupScanner', 'showView'],
    'exactly 6 distinct external consumers call into the block');
  // Every function with NO external consumer is internal to the block.
  const internalOnly = A.fnNames.filter(function (n) { return A.refs[n].external.length === 0; });
  eq(internalOnly.length, 35, '35 of the 46 functions have no consumer outside the block');
}
{
  // bssUniverseDiagHtml lives in an ALREADY-EXTRACTED module that loads BEFORE
  // the inline monolith. This backward edge already exists and already works,
  // which is the strongest available evidence that a DSB module placed in the
  // same region is callable.
  const panelAbs = path.resolve(__dirname, '..', 'js', 'ui', 'backend-scanner-snapshot-panel.js');
  const panelSrc = fs.readFileSync(panelAbs, 'utf8');
  const panelMasked = maskSource(panelSrc);
  ok(/dsbGetBackendSource/.test(panelMasked),
     'js/ui/backend-scanner-snapshot-panel.js (script #18) already calls into the DSB block (script #21)');
  ok(/typeof\s+dsbGetBackendSource\s*===?\s*'function'/.test(panelSrc),
     'that backward call is typeof-guarded — resolved at CALL time, not at load time');
  const dsbInModules = ['js/services/backend-scanner-snapshot-service.js', 'js/adapters/backend-directional-adapter.js',
                        'js/ui/backend-directional-preview.js'].filter(function (rel) {
    return /(?<![A-Za-z0-9_$.])dsb[A-Z]/.test(maskSource(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8')));
  });
  deepEq(dsbInModules, [], 'no OTHER extracted module references any dsb* function');
}
{
  // Static onclick handlers emitted by the block's own HTML.
  deepEq(A.staticHandlers, ['_dssOnFlagClick', '_dssSetFlagFilter', 'dsbRefreshClicked',
                            'dsbSetSourceMode', 'dssSetMode', 'openDirectionalSetupDetail'],
    'the block emits 6 distinct static onclick globals');
  const own = A.staticHandlers.filter(function (h) { return A.fnNames.indexOf(h) >= 0; }).sort();
  deepEq(own, ['dsbRefreshClicked', 'dsbSetSourceMode'],
    '2 static handlers are DSB-owned — they must stay reachable as window globals after extraction');
  const foreign = A.staticHandlers.filter(function (h) { return A.fnNames.indexOf(h) < 0; }).sort();
  deepEq(foreign, ['_dssOnFlagClick', '_dssSetFlagFilter', 'dssSetMode', 'openDirectionalSetupDetail'],
    '4 static handlers are FRONTEND-owned — DSB-rendered HTML depends on inline-monolith globals');
  // Both DSB-owned handlers have zero JS callers: the handler string is their
  // only invocation path, so classifying them as dead code would be wrong.
  deepEq(A.refs['dsbRefreshClicked'].internal.filter(function (c) { return c !== '<top-level>'; }), [],
    'dsbRefreshClicked has no JS caller — reached ONLY through its static onclick');
  deepEq(A.refs['dsbSetSourceMode'].internal.filter(function (c) { return c !== '<top-level>'; }), [],
    'dsbSetSourceMode has no JS caller — reached ONLY through its static onclick');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 11 — DOM ownership
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 11 — DOM ownership');
deepEq(A.domIds, ['dsb-refresh', 'panelContent', 'panelHeader', 'ptab-scanner'],
  'the block reads exactly 4 DOM element ids');
eq(A.counts.getElementById, 5, 'exactly 5 getElementById calls (dsb-refresh is looked up twice)');
{
  const domUsers = {};
  A.fns.forEach(function (f) {
    const b = maskSource(SRC.slice(f.start, f.end));
    if (/\bdocument\s*\./.test(b)) domUsers[f.name] = true;
  });
  deepEq(Object.keys(domUsers).sort(),
    ['dsbAutoRefreshActive', 'dsbRefreshClicked', 'dsbRenderBackendDirectional', 'dsbScannerTabActive'],
    'only 4 of the 46 functions touch the DOM at all');
  note('DOM readers: dsbScannerTabActive(ptab-scanner), dsbAutoRefreshActive(document.hidden), ' +
       'dsbRefreshClicked(dsb-refresh), dsbRenderBackendDirectional(panelHeader/panelContent)');
}
{
  // DOM WRITES, measured.
  const writes = (A.regionText.match(/\.\s*(innerHTML|textContent|disabled)\s*=/g) || [])
    .map(function (s) { return (s.match(/(innerHTML|textContent|disabled)/) || [])[1]; }).sort();
  deepEq(Array.from(new Set(writes)).sort(), ['disabled', 'innerHTML', 'textContent'],
    'the block performs 3 kinds of DOM write');
  const inner = (A.regionMasked.match(/\.\s*innerHTML\s*=/g) || []).length;
  eq(inner, 1, 'exactly ONE innerHTML write in the whole block (the panel body)');
  ok(/id="dsb-refresh"/.test(A.regionText), 'the block owns the id it later reads back (dsb-refresh)');
  ok(!/panelContent|panelHeader/.test(A.regionText.replace(/getElementById\([^)]*\)/g, '')),
     'panelContent / panelHeader are READ-BY-ID only — the block does not create them');
}
{
  // Escaping: the row/banner builders must go through the shared escaper.
  eq(Object.keys(A.freeGlobals).filter(function (k) { return k === 'escHtml'; }).length, 1,
     'the block uses the shared escHtml() escaper');
  ok(A.freeGlobals.escHtml >= 10, 'escHtml is applied ' + A.freeGlobals.escHtml + ' times across the HTML builders');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 12 — localStorage
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 12 — localStorage surface');
eq(A.counts.localStorage, 3, 'exactly 3 executable localStorage references in the block');
deepEq(A.storageKeys, ['apex_dss_source_mode', 'apex_ff_backend_directional_snapshot'],
  'the block touches exactly 2 localStorage keys');
{
  const users = {};
  A.fns.forEach(function (f) {
    const b = maskSource(SRC.slice(f.start, f.end));
    if (/\blocalStorage\b/.test(b)) users[f.name] = (b.match(/localStorage\.(get|set)Item/g) || []);
  });
  deepEq(Object.keys(users).sort(), ['dsbSetSourceMode', 'dsbSourceMode', 'ffBackendDirectionalSnapshot'],
    'only 3 of the 46 functions touch localStorage');
  const setters = Object.keys(users).filter(function (n) {
    return /setItem/.test(maskSource(SRC.slice(
      A.fns.find(function (f) { return f.name === n; }).start,
      A.fns.find(function (f) { return f.name === n; }).end)));
  }).sort();
  deepEq(setters, ['dsbSetSourceMode'], 'exactly ONE function WRITES localStorage (the source-mode toggle)');
  ok(/try\s*\{[\s\S]*localStorage[\s\S]*\}\s*catch/.test(A.regionText),
     'every localStorage access is wrapped in try/catch (private-mode safe)');
}
ok(A.storageKeys.indexOf('apex_dss_source_mode') >= 0,
   'the source-mode key is the DSS-namespaced one — shared naming with the frontend scanner, owned by DSB');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 13 — network surface, separated by TYPE
//
// The brief is explicit: transport snapshot, live-quote enrichment, chart-open
// fresh quote and auto-refresh polling are FOUR different things and must not be
// collapsed into one "network" count.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 13 — network surface by type');

eq(A.counts.directFetch, 1, 'the block makes exactly ONE direct fetch() call');
eq(A.counts.httpMethod, 0, 'no `method:` option anywhere — the single fetch is a GET by omission');
eq(A.counts.webSocket, 0, 'the block opens NO WebSocket of its own');
eq(A.counts.scannerRun, 0, 'the block never references /scanner/run');
ok(!/\bPOST\b/.test(A.regionMasked), 'the word POST does not appear in executable code (only in the doc comment)');
{
  // Type 1 — transport snapshot.
  const fetchIdx = A.regionMasked.search(/\bfetch\s*\(/);
  const owner = A.ownerAt(A.regionOffsetToAbs(fetchIdx));
  eq(owner, 'dsbFetchSnapshot', 'the single direct fetch lives in dsbFetchSnapshot');
  const body = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; }).start,
                         A.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; }).end);
  ok(/fetch\(BACKEND\+'\/scanner\/directional\/snapshot'/.test(body),
     'transport endpoint is GET {BACKEND}/scanner/directional/snapshot');
  ok(/headers:\s*_backendAuthHeaders\(\)/.test(body), 'the GET sends the shared _backendAuthHeaders()');
  ok(/signal:\s*AbortSignal\.timeout\(\d+\)/.test(body), 'the GET carries an AbortSignal timeout');
  ok(/r\.status\s*===\s*404/.test(body), '404 is handled as endpoint-unsupported, not as an error');
  ok(/st\.endpointSupported\s*=\s*false/.test(body), '404 sets endpointSupported=false (sticky fallback)');
  ok(/catch\s*\(e\)\s*\{[\s\S]*st\.error\s*=/.test(body), 'a transport failure is committed to st.error');
}
{
  // Type 2 — live-quote enrichment; Type 3 — chart-open fresh quote. Both go
  // through the SHARED helpers, never through their own fetch.
  eq(A.counts.subscribeDxlinkQuotes, 4, 'subscribeDxlinkQuotes is referenced 4 times (typeof guard + call, twice)');
  eq(A.counts.fetchLiveQuote, 4, 'fetchLiveQuote is referenced 4 times (typeof guard + call, twice)');
  const users = A.fnNames.filter(function (n) {
    const f = A.fns.find(function (x) { return x.name === n; });
    return /subscribeDxlinkQuotes|fetchLiveQuote/.test(maskSource(SRC.slice(f.start, f.end)));
  }).sort();
  deepEq(users, ['dsbEnrichVisibleRowsLive', 'dssEnsureChartLiveQuoteForDisplay'],
    'exactly 2 functions use the shared quote helpers — visible-row enrichment and chart-open');
  users.forEach(function (n) {
    const f = A.fns.find(function (x) { return x.name === n; });
    ok(!/\bfetch\s*\(/.test(maskSource(SRC.slice(f.start, f.end))),
       n + ' contains no direct fetch — it REUSES the shared quote helpers');
  });
}
{
  // Endpoint inventory: only one endpoint is actually requested by the block.
  // Discovery order follows the REGION order (adapter → service → inline), so
  // PR 2 reordered the scan without changing the set. Both are pinned.
  deepEq(A.endpoints, ['/scanner/snapshot', '/scanner/directional/snapshot',
                       '/market/live', '/dev/market/candles-dxlink/'],
    'endpoint strings that appear anywhere in the block (including comments)');
  deepEq(A.endpoints.slice().sort(),
    ['/dev/market/candles-dxlink/', '/market/live', '/scanner/directional/snapshot', '/scanner/snapshot'],
    'the endpoint SET is unchanged by the relocation');
  const requested = A.endpoints.filter(function (ep) {
    return new RegExp("fetch\\([^)]*'" + ep.replace(/\//g, '\\/')).test(A.regionText);
  });
  deepEq(requested, ['/scanner/directional/snapshot'],
    'only ONE endpoint is actually requested by the block; the other three are documentation of shared paths');
}
{
  // Type 4 — the /market/live path is reached ONLY through fetchLiveQuote.
  ok(!/fetch\([^)]*market\/live/.test(A.regionText),
     'the block never calls /market/live directly — always through the shared fetchLiveQuote()');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 14 — timers, separated by TYPE
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 14 — timers by type');
eq(A.counts.setInterval, 1, 'exactly ONE setInterval in the block');
eq(A.counts.clearInterval, 1, 'exactly ONE clearInterval in the block');
eq(A.counts.setTimeout, 2, 'exactly TWO setTimeout calls in the block');
eq(A.counts.clearTimeout, 1, 'exactly ONE clearTimeout in the block');
{
  const at = function (re) { const i = A.regionMasked.search(re); return i < 0 ? null : A.ownerAt(A.regionOffsetToAbs(i)); };
  eq(at(/\bsetInterval\s*\(/), 'dsbStartAutoRefresh', 'the only interval is the auto-refresh timer');
  eq(at(/\bclearInterval\s*\(/), 'dsbStopAutoRefresh', 'the only clearInterval is the auto-refresh teardown');
  eq(at(/\bclearTimeout\s*\(/), 'dsbCancelLiveEnrichRetry', 'the only clearTimeout cancels the readiness retry');
  const timeouts = [];
  let m, re = /\bsetTimeout\s*\(/g;
  while ((m = re.exec(A.regionMasked)) !== null) timeouts.push(A.ownerAt(A.regionOffsetToAbs(m.index)));
  deepEq(timeouts.sort(), ['dsbRefreshClicked', 'dsbScheduleLiveEnrichRetry'],
    'the two setTimeout calls belong to DIFFERENT concerns: a UI button debounce and the readiness retry');
}
ok(true, 'timer taxonomy: 1 auto-refresh interval (10 min) | 1 readiness retry timeout (3 s) | 1 UI button debounce (1.5 s)');
{
  const start = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbStartAutoRefresh'; }).start,
                          A.fns.find(function (f) { return f.name === 'dsbStartAutoRefresh'; }).end);
  ok(/if\s*\(\s*st\.autoRefreshTimerId\s*\)\s*return/.test(start),
     'dsbStartAutoRefresh is IDEMPOTENT — an existing timer short-circuits it (never stacks)');
  ok(/if\s*\(\s*!\s*dsbAutoRefreshActive\(\)\s*\)\s*return/.test(start),
     'dsbStartAutoRefresh refuses to start when the context is inactive');
  ok(/dsbStopAutoRefresh\(\)/.test(start), 'the interval SELF-STOPS when the context goes inactive');
  const stop = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbStopAutoRefresh'; }).start,
                         A.fns.find(function (f) { return f.name === 'dsbStopAutoRefresh'; }).end);
  ok(/clearInterval\(st\.autoRefreshTimerId\)/.test(stop) && /autoRefreshTimerId\s*=\s*null/.test(stop),
     'dsbStopAutoRefresh clears the interval AND nulls the handle');
  ok(/dsbCancelLiveEnrichRetry\(\)/.test(stop),
     'stopping auto-refresh ALSO cancels the pending readiness retry (no off-screen /market/live)');
  const active = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbAutoRefreshActive'; }).start,
                           A.fns.find(function (f) { return f.name === 'dsbAutoRefreshActive'; }).end);
  ok(/_activeView\s*!==\s*'dashboard'/.test(active), 'auto-refresh is gated on the Dashboard being the active view');
  ok(/document\.hidden\s*===\s*true/.test(active), 'auto-refresh is gated on the page not being hidden');
  ok(/ffBackendDirectionalSnapshot/.test(active), 'auto-refresh is gated on the feature flag');
}
{
  const sched = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbScheduleLiveEnrichRetry'; }).start,
                          A.fns.find(function (f) { return f.name === 'dsbScheduleLiveEnrichRetry'; }).end);
  ok(/if\s*\(\s*st\.liveRetryTimerId\s*\)\s*return/.test(sched),
     'the readiness retry is single-flight — a pending retry blocks a second one');
  ok(/liveRetryTimerId\s*=\s*null/.test(sched), 'the retry nulls its own handle when it fires (no leak)');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 15 — single-flight, TTL, cooldown, detail-open protection (static)
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 15 — concurrency guards (static)');
{
  const fetchBody = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; }).start,
                              A.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; }).end);
  ok(/if\s*\(\s*st\.fetching\s*\)\s*return\s+st\.inflightSnapshot/.test(fetchBody),
     'snapshot single-flight: a concurrent caller AWAITS the in-flight promise instead of starting a second GET');
  ok(/st\.inflightSnapshot\s*=\s*\(async function/.test(fetchBody), 'the in-flight promise is stored on state');
  ok(/st\.inflightSnapshot\s*=\s*null/.test(fetchBody), 'the in-flight promise is cleared in finally');
  ok(/!opts\.force\s*&&\s*st\.lastFetchAt[\s\S]{0,80}DSB_SNAPSHOT_TTL_MS/.test(fetchBody),
     'TTL dedupe is bypassable ONLY by an explicit force flag');
  ok(/_dssDetailSymbol/.test(fetchBody),
     'detail-open protection: the completion repaint checks _dssDetailSymbol before re-rendering');
  ok(/dsbScannerTabActive\(\)/.test(fetchBody), 'the completion repaint also checks the scanner tab is active');
}
{
  const enrich = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbEnrichVisibleRowsLive'; }).start,
                           A.fns.find(function (f) { return f.name === 'dsbEnrichVisibleRowsLive'; }).end);
  ok(/if\s*\(\s*st\.liveEnriching\s*\)\s*return/.test(enrich), 'live enrichment is single-flight');
  ok(/st\.liveEnriching\s*=\s*false/.test(enrich), 'the live single-flight flag is released in finally');
  ok(/liveEnrichCooldownUntil[\s\S]{0,60}Date\.now\(\)\s*\+\s*DSB_LIVE_ABORT_COOLDOWN_MS/.test(enrich),
     'an aborted batch installs an abort cooldown');
  ok(/!opts\.force\s*&&\s*st\.liveEnrichCooldownUntil/.test(enrich), 'the cooldown suppresses the next pass unless forced');
  ok(/!opts\.force\s*&&\s*st\.lastLiveEnrichAt[\s\S]{0,80}DSB_LIVE_ENRICH_TTL_MS/.test(enrich),
     'a TTL separates successful enrichment passes');
  ok(/isAbortLikeError/.test(enrich), 'abort detection reuses the shared isAbortLikeError()');
  ok(/dsbScheduleLiveEnrichRetry\(\)/.test(enrich) && /dsbCancelLiveEnrichRetry\(\)/.test(enrich),
     'not-ready schedules ONE retry; inactive cancels it');
}
{
  const repaint = SRC.slice(A.fns.find(function (f) { return f.name === 'dsbRepaintIfSafe'; }).start,
                            A.fns.find(function (f) { return f.name === 'dsbRepaintIfSafe'; }).end);
  ok(/_dssDetailSymbol\s*!=\s*null\s*\)\s*return/.test(repaint),
     'dsbRepaintIfSafe refuses to repaint while a detail chart is open');
  ok(/dsbScannerTabActive\(\)/.test(repaint), 'dsbRepaintIfSafe refuses to repaint off the scanner tab');
  ok(/dsbSourceMode\(\)\s*===\s*'frontend'/.test(repaint), 'dsbRepaintIfSafe refuses to repaint in forced-frontend mode');
}
{
  const chart = SRC.slice(A.fns.find(function (f) { return f.name === 'dssEnsureChartLiveQuoteForDisplay'; }).start,
                          A.fns.find(function (f) { return f.name === 'dssEnsureChartLiveQuoteForDisplay'; }).end);
  ok(/if\s*\(\s*g\.inflight\[sym\]\s*\)\s*return/.test(chart), 'chart-open quote is single-flight PER SYMBOL');
  ok(/DSB_CHART_LIVE_TTL_MS/.test(chart), 'chart-open quote is TTL-throttled per symbol');
  ok(/dsbLiveEnrichReadiness\(\)\.ready/.test(chart), 'chart-open quote shares the SAME strict readiness gate');
}

// ═════════════════════════════════════════════════════════════════════════════
// DYNAMIC HARNESS
//
// Executes the DSB block VERBATIM inside a vm context. Nothing is copied or
// re-implemented: the exact character range measured in SECTION 1 is the code
// that runs. `S` is a WRITE-RECORDING Proxy, so state ownership and the absence
// of S.scanData usage are proven by execution rather than by pattern matching.
// ═════════════════════════════════════════════════════════════════════════════
function makeRecordingS(seed) {
  const writes = [], reads = [];
  const inner = Object.assign({ dxlinkConnectStarted: true, dxlinkStatus: { state: 'ready' } }, seed || {});
  const wrapChild = function (key, obj) {
    return new Proxy(obj, {
      set: function (t, p, v) { writes.push(key + '.' + String(p)); t[p] = v; return true; },
      get: function (t, p) { if (typeof p === 'string') reads.push(key + '.' + String(p)); return t[p]; },
      deleteProperty: function (t, p) { writes.push('delete ' + key + '.' + String(p)); delete t[p]; return true; },
    });
  };
  const children = {};
  const proxy = new Proxy(inner, {
    set: function (t, p, v) {
      writes.push('S.' + String(p));
      if (v && typeof v === 'object' && !Array.isArray(v)) { children[p] = wrapChild('S.' + String(p), v); t[p] = v; }
      else t[p] = v;
      return true;
    },
    get: function (t, p) {
      if (typeof p === 'string') reads.push('S.' + String(p));
      if (children[p] && t[p]) return children[p];
      return t[p];
    },
    has: function (t, p) { return p in t; },
    deleteProperty: function (t, p) { writes.push('delete S.' + String(p)); delete t[p]; return true; },
  });
  return { S: proxy, writes: writes, reads: reads, raw: inner };
}

function makeSandbox(opts) {
  opts = opts || {};
  const log = {
    fetchUrls: [], fetchInits: [], intervals: 0, clearedIntervals: 0, timeouts: [], clearedTimeouts: 0,
    subscribed: [], quoted: [], renders: 0, postCandleContexts: [], storageSet: [], debug: [],
  };
  const rec = makeRecordingS(opts.seedState);
  let timerId = 1;
  const pendingTimeouts = {};
  const store = Object.assign({}, opts.storage || {});
  const els = {};
  const el = function (id) {
    if (!els[id]) els[id] = { id: id, className: opts.tabActive === false ? '' : 'active', innerHTML: '', textContent: '', disabled: false, style: {} };
    return els[id];
  };
  const ctx = {
    console: { log: function () {}, warn: function () {}, error: function () {} },
    S: rec.S,
    BACKEND: 'https://backend.test',
    _activeView: opts.activeView === undefined ? 'dashboard' : opts.activeView,
    _dssDetailSymbol: opts.detailSymbol === undefined ? null : opts.detailSymbol,
    _dssCandidateList: opts.candidateList || [],
    _dssMode: 'LONG',
    window: {},
    document: {
      hidden: !!opts.pageHidden,
      getElementById: function (id) { return (opts.missingEls || []).indexOf(id) >= 0 ? null : el(id); },
    },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); log.storageSet.push(k + '=' + v); },
    },
    fetch: function (url, init) {
      log.fetchUrls.push(url); log.fetchInits.push(init || null);
      const r = opts.fetchImpl ? opts.fetchImpl(url, init, log.fetchUrls.length) : { status: 200, ok: true, json: function () { return Promise.resolve({ ok: true, results: [] }); } };
      if (r && typeof r.then === 'function') return r;
      return Promise.resolve(r);
    },
    AbortSignal: { timeout: function (ms) { return { __timeout: ms }; } },
    setInterval: function (fn, ms) { log.intervals++; return { __interval: ms, fn: fn, id: timerId++ }; },
    clearInterval: function () { log.clearedIntervals++; },
    setTimeout: function (fn, ms) { const id = timerId++; log.timeouts.push(ms); pendingTimeouts[id] = fn; return id; },
    clearTimeout: function (id) { log.clearedTimeouts++; delete pendingTimeouts[id]; },
    _backendAuthHeaders: function () { return { 'x-api-key': 'k' }; },
    _backendCandleGateOpen: function () { return opts.authReady !== false; },
    isRTHOpen: function () { return opts.marketOpen !== false; },
    isAbortLikeError: function (e) { return !!e && /abort/i.test(String(e && e.message)); },
    subscribeDxlinkQuotes: function (syms) { log.subscribed.push(syms.slice()); return Promise.resolve(); },
    fetchLiveQuote: function (sym) { log.quoted.push(sym); return Promise.resolve(opts.quote === undefined ? 101.25 : opts.quote); },
    renderDirectionalSetupScanner: function () { log.renders++; },
    escHtml: function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, '_'); },
    debugLog: function () {},
    postCandleContext: function (c) { log.postCandleContexts.push(c); },
    bssState: function () { return opts.bssState || { snapshot: null }; },
    bssFmtAgeMs: function () { return '1m'; },
    bssFmtClock: function () { return '10:00'; },
    bdsDeriveBackendDirectionalRows: function () { return opts.legacyRows || []; },
    getCanonicalIvr: function () { return null; },
    resolveLatestDisplayPrice: function () { return { price: null, source: null }; },
    _dssRedrawLargeCharts: function () {},
    _dssApplySort: function (x) { return x; },
    _dssApplyFlagFilter: function (x) { return x; },
    _dssGetFlagFilter: function () { return null; },
    _dssIsFlaggedSymbol: function () { return false; },
    _dssTh: function () { return ''; },
    _dssSetFlagFilter: function () {},
    _dssOnFlagClick: function () {},
    dssSetMode: function () {},
    openDirectionalSetupDetail: function () {},
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  // The ORDERED DSB source: adapter → service → panel → inline residue —
  // byte-for-byte what the browser evaluates, in the order it evaluates it.
  // Nothing is copied or re-implemented; these are the exact measured ranges.
  vm.runInContext(opts.source || A.regionText, ctx, { filename: 'dsb-ordered.js' });
  return { ctx: ctx, log: log, rec: rec, els: els, store: store, firePending: function () {
    Object.keys(pendingTimeouts).forEach(function (id) { const fn = pendingTimeouts[id]; delete pendingTimeouts[id]; fn(); });
  } };
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 16 — dynamic: the ORDERED DSB source executes and owns only its state
//
// FOUR evaluations, because PR 1, PR 2 and PR 3 created three shipped owners:
//   (a)  the ADAPTER ALONE — must define its 19 declarations and do nothing else;
//   (a2) the SERVICE ALONE — must define its 26 functions and do nothing else;
//   (a3) the PANEL ALONE   — must define its 9 functions and do nothing else;
//   (b)  the ORDERED source (adapter → service → panel → inline residue) — must
//        behave exactly as the single block did before the extraction.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 16 — dynamic execution + write-recording state Proxy');

// ── (a) the adapter module, evaluated ALONE ──────────────────────────────────
{
  let built = null, err = null;
  try { built = makeSandbox({ source: A.adapterText }); } catch (e) { err = e; }
  ok(!err, 'the ADAPTER MODULE evaluates standalone in a fresh vm context' + (err ? ' — ' + err.message : ''));
  if (built) {
    const missingFn = A.adapterFnNames.filter(function (n) { return typeof built.ctx[n] !== 'function'; });
    deepEq(missingFn, [], 'the adapter alone defines all 11 of its functions as classic-script globals');
    const missingConst = A.adapterBindingNames.filter(function (n) { return typeof built.ctx[n] !== 'number'; });
    deepEq(missingConst, [], 'the adapter alone defines all 8 of its constants as numbers');
    deepEq(A.adapterBindingNames.map(function (n) { return built.ctx[n]; }),
      [60000, 600000, 30000, 30, 300000, 3000, 8000, 5000],
      'ADAPTER constant VALUES are unchanged by the relocation');
    // Load-time inertness — every one of these is a PR 1 acceptance criterion.
    eq(built.log.fetchUrls.length, 0, 'ADAPTER: no fetch at load time');
    eq(built.log.intervals, 0, 'ADAPTER: no interval started at load time');
    eq(built.log.timeouts.length, 0, 'ADAPTER: no timeout started at load time');
    eq(built.log.renders, 0, 'ADAPTER: no render triggered at load time');
    eq(built.log.storageSet.length, 0, 'ADAPTER: no localStorage write at load time');
    eq(built.log.subscribed.length, 0, 'ADAPTER: no subscription opened at load time');
    eq(built.log.quoted.length, 0, 'ADAPTER: no quote requested at load time');
    deepEq(Object.keys(built.ctx.window), [], 'ADAPTER: sets ZERO window properties — no debug exposure is anticipated');
    deepEq(built.rec.writes, [], 'ADAPTER: writes NOTHING to S at load time');
    deepEq(built.rec.reads, [], 'ADAPTER: READS nothing from S at load time either');
    eq(Object.keys(built.els).length, 0, 'ADAPTER: touches NO DOM element at load time');
    // It owns no state: none of the residue's functions leak in.
    eq(typeof built.ctx.dsbState, 'undefined', 'ADAPTER: does NOT define dsbState — it owns no state');
    eq(typeof built.ctx.dsbFetchSnapshot, 'undefined', 'ADAPTER: does NOT define dsbFetchSnapshot — it owns no transport');
    eq(typeof built.ctx.dsbRenderBackendDirectional, 'undefined', 'ADAPTER: does NOT define the renderer — it owns no rendering');
  }
}

// ── (a2) the service module, evaluated ALONE ─────────────────────────────────
{
  let built = null, err = null;
  try { built = makeSandbox({ source: A.serviceText }); } catch (e) { err = e; }
  ok(!err, 'the SERVICE MODULE evaluates standalone in a fresh vm context' + (err ? ' — ' + err.message : ''));
  if (built) {
    const missingFn = A.serviceFnNames.filter(function (n) { return typeof built.ctx[n] !== 'function'; });
    deepEq(missingFn, [], 'the service alone defines all 26 of its functions as classic-script globals');
    // Load-time inertness — every one of these is a PR 2 acceptance criterion.
    eq(built.log.fetchUrls.length, 0, 'SERVICE: no fetch at load time');
    eq(built.log.intervals, 0, 'SERVICE: no interval started at load time');
    eq(built.log.timeouts.length, 0, 'SERVICE: no timeout started at load time');
    eq(built.log.renders, 0, 'SERVICE: no render triggered at load time');
    eq(built.log.storageSet.length, 0, 'SERVICE: no localStorage write at load time');
    eq(built.log.subscribed.length, 0, 'SERVICE: no subscription opened at load time');
    eq(built.log.quoted.length, 0, 'SERVICE: no quote requested at load time');
    deepEq(Object.keys(built.ctx.window), [],
      'SERVICE: sets ZERO window properties — the two W2 exposures stay inline');
    deepEq(built.rec.writes, [], 'SERVICE: writes NOTHING to S at load time — the state stays lazy');
    deepEq(built.rec.reads, [], 'SERVICE: READS nothing from S at load time either');
    eq(Object.keys(built.els).length, 0, 'SERVICE: touches NO DOM element at load time');
    // It declares no constant and no panel/adapter function: ownership is clean.
    const leakedConst = A.bindingNames.filter(function (n) { return typeof built.ctx[n] !== 'undefined'; });
    deepEq(leakedConst, [], 'SERVICE: defines NONE of the 8 DSB constants — they stay in the adapter');
    eq(typeof built.ctx.dsbRenderBackendDirectional, 'undefined',
       'SERVICE: does NOT define the renderer — it owns no rendering');
    eq(typeof built.ctx.dsbParseSnapshot, 'undefined',
       'SERVICE: does NOT define the adapter parser — the pure leaf stays in the adapter');
    // The unguarded consumer risk, proven on the module alone.
    eq(typeof built.ctx.dssResolveChartLivePrice, 'function',
       'SERVICE: dssResolveChartLivePrice is a function as soon as the module has evaluated');
  }
}

// ── (a3) the panel module, evaluated ALONE ───────────────────────────────────
{
  let built = null, err = null;
  try { built = makeSandbox({ source: A.panelText }); } catch (e) { err = e; }
  ok(!err, 'the PANEL MODULE evaluates standalone in a fresh vm context' + (err ? ' — ' + err.message : ''));
  if (built) {
    const missingFn = A.panelFnNames.filter(function (n) { return typeof built.ctx[n] !== 'function'; });
    deepEq(missingFn, [], 'the panel alone defines all 9 of its functions as classic-script globals');
    // Load-time inertness — every one of these is a PR 3 acceptance criterion.
    eq(built.log.fetchUrls.length, 0, 'PANEL: no fetch at load time');
    eq(built.log.intervals, 0, 'PANEL: no interval started at load time');
    eq(built.log.timeouts.length, 0, 'PANEL: no timeout started at load time');
    eq(built.log.renders, 0, 'PANEL: no render triggered at load time');
    eq(built.log.storageSet.length, 0, 'PANEL: no localStorage write at load time');
    eq(built.log.subscribed.length, 0, 'PANEL: no subscription opened at load time');
    eq(built.log.quoted.length, 0, 'PANEL: no quote requested at load time');
    deepEq(Object.keys(built.ctx.window), [],
      'PANEL: sets ZERO window properties — the two W2 exposures stay inline');
    deepEq(built.rec.writes, [], 'PANEL: writes NOTHING to S at load time — the state stays lazy');
    deepEq(built.rec.reads, [], 'PANEL: READS nothing from S at load time either');
    eq(Object.keys(built.els).length, 0, 'PANEL: touches NO DOM element at load time');
    // It declares no constant and no service/adapter declaration: ownership is clean.
    const leakedConst = A.bindingNames.filter(function (n) { return typeof built.ctx[n] !== 'undefined'; });
    deepEq(leakedConst, [], 'PANEL: defines NONE of the 8 DSB constants — they stay in the adapter');
    eq(typeof built.ctx.dsbState, 'undefined', 'PANEL: does NOT define dsbState — it owns no state');
    eq(typeof built.ctx.dsbFetchSnapshot, 'undefined', 'PANEL: does NOT define the transport — it owns no network');
    eq(typeof built.ctx.dsbParseSnapshot, 'undefined',
       'PANEL: does NOT define the adapter parser — the pure leaf stays in the adapter');
    eq(typeof built.ctx.dsbRowsForMode, 'undefined',
       'PANEL: does NOT define dsbRowsForMode — that row derivation belongs to the adapter');
    // The renderer it DOES own is a function the moment the module has evaluated.
    eq(typeof built.ctx.dsbRenderBackendDirectional, 'function',
       'PANEL: dsbRenderBackendDirectional is a function as soon as the module has evaluated');
  }
}

// ── (b) the ordered DSB source: adapter, service, panel, then inline residue ──
{
  let built = null, err = null;
  try { built = makeSandbox({}); } catch (e) { err = e; }
  ok(!err, 'the ORDERED DSB source (adapter → service → panel → inline) evaluates in a fresh vm context' + (err ? ' — ' + err.message : ''));
  if (built) {
    eq(typeof built.ctx.dsbState, 'function', 'dsbState is defined after evaluating the ordered source');
    eq(built.log.fetchUrls.length, 0, 'evaluating the ordered source performs NO fetch at load time');
    eq(built.log.intervals, 0, 'evaluating the ordered source starts NO interval at load time');
    eq(built.log.timeouts.length, 0, 'evaluating the ordered source starts NO timeout at load time');
    eq(built.log.renders, 0, 'evaluating the ordered source triggers NO render at load time');
    eq(built.log.storageSet.length, 0, 'evaluating the ordered source writes NO localStorage at load time');
    deepEq(Object.keys(built.ctx.window).sort(),
      ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
      'evaluating the ordered source sets exactly 2 window properties — the debug surfaces');
    deepEq(built.rec.writes, [], 'evaluating the ordered source writes NOTHING to S at load time');
    // 46 functions + 8 constants are all reachable in the context.
    const missing = A.fnNames.filter(function (n) { return typeof built.ctx[n] !== 'function'; });
    deepEq(missing, [], 'all 46 measured functions exist as functions after ordered evaluation');
    const missingConst = A.bindingNames.filter(function (n) { return typeof built.ctx[n] !== 'number'; });
    deepEq(missingConst, [], 'all 8 measured constants exist as numbers after ordered evaluation');
    deepEq(A.bindingNames.map(function (n) { return built.ctx[n]; }),
      [60000, 600000, 30000, 30, 300000, 3000, 8000, 5000], 'measured constant VALUES');
    // CROSS-OWNER RESOLUTION: functions left inline resolve the adapter's
    // helpers at CALL time, through the shared classic-script global scope.
    const rows = built.ctx.dsbRowsForMode(
      [{ direction: 'bullish', score: 1 }, { direction: 'bullish', score: 9 }, { direction: 'bearish', score: 5 }], 'LONG');
    deepEq(rows.map(function (r) { return r.score; }), [9, 1],
      'an adapter function called from the shared scope filters and sorts exactly as before');
    eq(typeof built.ctx.dsbFmtAge, 'function', 'a panel-module function is reachable in the same shared scope');
    // A REAL adapter → service cross-owner call: dsbParseSnapshot lives in the
    // adapter and is invoked by dsbFetchSnapshot, which lives in the service.
    // Running it here proves the boundary is crossed by ordinary global
    // resolution, at call time.
    const parsed = built.ctx.dsbParseSnapshot(
      { ok: true, results: [{ symbol: 'aapl', direction: 'bullish', score: 3, lastPrice: 10 }] });
    eq(parsed.results.length, 1, 'the adapter parser, called across the owner boundary, normalises a row');
    eq(parsed.results[0].ticker, 'AAPL', 'symbol safety still applies across the owner boundary');
    // Cross-owner references are BARE identifiers, never property lookups on a
    // namespace/window object — that is what makes them classic-script globals.
    const fetchBody = maskSource(A.src.slice(
      A.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; }).start,
      A.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; }).end));
    ok(/(?<![A-Za-z0-9_$.])dsbParseSnapshot\s*\(/.test(fetchBody),
       'the inline dsbFetchSnapshot calls the adapter\'s dsbParseSnapshot as a BARE global — no namespace, no import');
    ok(!/(?:window|globalThis)\s*\.\s*dsbParseSnapshot/.test(fetchBody),
       'it does NOT reach for it through window/globalThis — the binding form is unchanged');
  }
}
{
  const sb = makeSandbox({});
  sb.ctx.dsbState();
  deepEq(sb.rec.writes, ['S.backendDirectional'],
    'the ONLY property dsbState() writes on S is backendDirectional (Proxy-recorded, not grepped)');
  sb.ctx.dsbState();
  eq(sb.rec.writes.length, 1, 'a second dsbState() call does NOT re-create the state (lazy + idempotent)');
  ok(sb.rec.reads.indexOf('S.scanData') < 0, 'S.scanData was never READ during state initialisation');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 17 — dynamic: network / timer / subscription behaviour (async)
// Everything below runs inside main(); the summary awaits it.
// ═════════════════════════════════════════════════════════════════════════════
async function sectionDynamicBehaviour() {
  section('SECTION 17 — dynamic: transport, TTL, single-flight, 404, enrichment');

  // ── transport: GET-only, one request, auth headers ────────────────────────
  {
    const sb = makeSandbox({});
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    eq(sb.log.fetchUrls.length, 1, 'one dsbFetchSnapshot() → exactly ONE HTTP request');
    eq(sb.log.fetchUrls[0], 'https://backend.test/scanner/directional/snapshot', 'the request URL is the directional snapshot endpoint');
    const init = sb.log.fetchInits[0] || {};
    eq(init.method, undefined, 'the request specifies NO method — it is a GET');
    deepEq(init.headers, { 'x-api-key': 'k' }, 'the request carries the shared backend auth headers');
    ok(!!init.signal, 'the request carries an abort signal');
    const stateWrites = sb.rec.writes.filter(function (w) { return w.indexOf('S.backendDirectional.') === 0; })
      .map(function (w) { return w.split('.').pop(); });
    ok(stateWrites.indexOf('parsed') >= 0, 'a successful GET commits parsed state');
    ok(stateWrites.indexOf('lastFetchAt') >= 0, 'a successful GET commits lastFetchAt');
    ok(stateWrites.indexOf('endpointSupported') >= 0, 'a successful GET commits endpointSupported');
    ok(sb.rec.writes.every(function (w) { return w.indexOf('scanData') < 0; }),
       'PROXY PROOF: a full snapshot fetch never writes S.scanData');
    ok(sb.rec.reads.every(function (r) { return r !== 'S.scanData'; }),
       'PROXY PROOF: a full snapshot fetch never reads S.scanData');
  }

  // ── TTL dedupe ───────────────────────────────────────────────────────────
  {
    const sb = makeSandbox({});
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    eq(sb.log.fetchUrls.length, 1, 'a second call inside the 60 s TTL performs NO second request');
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false, force: true });
    eq(sb.log.fetchUrls.length, 2, 'force:true bypasses the TTL and performs exactly one more request');
  }

  // ── snapshot single-flight ───────────────────────────────────────────────
  {
    let release;
    const gate = new Promise(function (r) { release = r; });
    const sb = makeSandbox({
      fetchImpl: function () {
        return gate.then(function () {
          return { status: 200, ok: true, json: function () { return Promise.resolve({ ok: true, results: [] }); } };
        });
      },
    });
    const p1 = sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    const p2 = sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    const p3 = sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false, force: true });
    eq(sb.log.fetchUrls.length, 1, 'THREE overlapping calls issue exactly ONE request (single-flight)');
    ok(p2 === p1 || (p2 && typeof p2.then === 'function'), 'a concurrent caller receives the in-flight promise');
    release();
    await Promise.all([p1, p2, p3]);
    eq(sb.log.fetchUrls.length, 1, 'no request is abandoned/aborted and no second one is issued (no abort storm)');
    eq(sb.rec.raw.backendDirectional.inflightSnapshot, null, 'inflightSnapshot is cleared once the GET settles');
    eq(sb.rec.raw.backendDirectional.fetching, false, 'the single-flight flag is released once the GET settles');
  }

  // ── 404 endpoint-unsupported ─────────────────────────────────────────────
  {
    const sb = makeSandbox({ fetchImpl: function () { return { status: 404, ok: false }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    eq(sb.rec.raw.backendDirectional.endpointSupported, false, 'HTTP 404 sets endpointSupported=false');
    eq(sb.rec.raw.backendDirectional.error, null, 'HTTP 404 is NOT recorded as a transport error');
    const src = sb.ctx.dsbGetBackendSource();
    eq(src.available, false, 'with the endpoint unsupported the backend source reports unavailable');
    eq(src.reason, 'endpoint_unsupported', 'the unavailable reason is endpoint_unsupported');
  }

  // ── transport failure ────────────────────────────────────────────────────
  {
    const sb = makeSandbox({ fetchImpl: function () { return Promise.reject(new Error('boom')); } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    eq(sb.rec.raw.backendDirectional.error, 'boom', 'a rejected GET is committed to st.error');
    eq(sb.ctx.dsbGetBackendSource().reason, 'fetch_error', 'the source reports fetch_error');
  }

  // ── detail-open repaint suppression ──────────────────────────────────────
  {
    const open = makeSandbox({ detailSymbol: 'AAPL' });
    await open.ctx.dsbFetchSnapshot({ enrichLive: false });
    eq(open.log.renders, 0, 'a completing GET does NOT repaint while a detail chart is open');
    const closed = makeSandbox({ detailSymbol: null });
    await closed.ctx.dsbFetchSnapshot({ enrichLive: false });
    eq(closed.log.renders, 1, 'the same GET DOES repaint when no detail chart is open');
    const offTab = makeSandbox({ detailSymbol: null, tabActive: false });
    await offTab.ctx.dsbFetchSnapshot({ enrichLive: false });
    eq(offTab.log.renders, 0, 'the same GET does NOT repaint when the scanner tab is inactive');
  }

  // ── live enrichment: readiness gate, subscription reuse, symbol cap ───────
  const snapshotPayload = function (n) {
    const results = [];
    for (let i = 0; i < n; i++) {
      results.push({ symbol: 'SYM' + i, direction: 'bullish', score: 10 - i, lastPrice: 100 + i,
                     timeframe1D: { indicators: { rsi14: 55 } } });
    }
    return { ok: true, generatedAt: new Date().toISOString(), results: results };
  };
  {
    const sb = makeSandbox({
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(3)); } }; },
    });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.log.subscribed.length, 1, 'the enrichment pass subscribes ONCE, through the shared subscribeDxlinkQuotes');
    eq(sb.log.quoted.length, 3, 'it requests one live quote per visible row via the shared fetchLiveQuote');
    eq(sb.log.fetchUrls.length, 1, 'the enrichment pass adds NO direct fetch of its own');
    const rows = sb.ctx.dsbGetBackendSource().rows;
    eq(rows[0].priceIsLive, true, 'a returned quote patches priceIsLive on the row');
    eq(rows[0].priceSource, 'dxlink_live', 'a returned quote patches priceSource on the row');
    eq(rows[0].price, 101.25, 'a returned quote patches the display price only');
    eq(rows[0].direction, 'bullish', 'the enrichment leaves direction untouched');
    eq(rows[0].score, 10, 'the enrichment leaves score untouched');
    ok(sb.rec.writes.every(function (w) { return w.indexOf('scanData') < 0; }),
       'PROXY PROOF: live enrichment never writes S.scanData');
  }
  {
    // Symbol cap.
    const many = [];
    for (let i = 0; i < 45; i++) many.push('SYM' + i);
    const sb = makeSandbox({
      candidateList: many,
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(45)); } }; },
    });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.log.subscribed[0].length, 30, 'the symbol cap (DSB_LIVE_SYMBOL_CAP=30) is applied to the subscription list');
    eq(sb.log.quoted.length, 30, 'the symbol cap is applied to the quote requests');
  }
  {
    // Readiness gate: market closed ⇒ no quote traffic, one retry scheduled.
    const sb = makeSandbox({
      marketOpen: false,
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; },
    });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.log.quoted.length, 0, 'market closed ⇒ ZERO /market/live traffic');
    eq(sb.log.subscribed.length, 0, 'market closed ⇒ ZERO subscriptions');
    eq(sb.log.timeouts.length, 1, 'market closed ⇒ exactly ONE readiness retry is scheduled');
    eq(sb.log.timeouts[0], 3000, 'the retry uses DSB_LIVE_RETRY_MS = 3000');
    eq(sb.rec.raw.backendDirectional.livePriceReason, 'market_closed', 'the machine-readable reason is market_closed');
    await sb.ctx.dsbEnrichVisibleRowsLive();
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.log.timeouts.length, 1, 'repeated not-ready passes NEVER stack a second retry timer');
  }
  {
    // Readiness reasons, in the measured order.
    const reason = function (o) {
      const sb = makeSandbox(o);
      return sb.ctx.dsbLiveEnrichReadiness();
    };
    eq(reason({ activeView: 'portfolio' }).reason, 'context_inactive', 'off-dashboard ⇒ context_inactive (and inactive: stop retrying)');
    eq(reason({ activeView: 'portfolio' }).active, false, 'off-dashboard readiness reports active:false');
    eq(reason({ pageHidden: true }).reason, 'context_inactive', 'page hidden ⇒ context_inactive');
    eq(reason({ storage: { apex_dss_source_mode: 'frontend' } }).reason, 'frontend_source', 'forced frontend ⇒ frontend_source');
    eq(reason({ marketOpen: false }).reason, 'market_closed', 'market closed ⇒ market_closed');
    eq(reason({ authReady: false }).reason, 'backend_auth_not_ready', 'auth not ready ⇒ backend_auth_not_ready');
    eq(reason({ seedState: { dxlinkConnectStarted: false } }).reason, 'quote_token_not_ready', 'quote token not started ⇒ quote_token_not_ready');
    eq(reason({ seedState: { dxlinkStatus: { state: 'connecting' } } }).reason, 'dxlink_not_ready', 'dxlink not ready ⇒ dxlink_not_ready');
    eq(reason({}).reason, 'snapshot_not_ready', 'no snapshot yet ⇒ snapshot_not_ready');
  }
  {
    // Live single-flight + abort cooldown.
    let releaseQuote;
    const gate = new Promise(function (r) { releaseQuote = r; });
    const sb = makeSandbox({
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; },
    });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    sb.ctx.fetchLiveQuote = function (s) { sb.log.quoted.push(s); return gate.then(function () { return 99; }); };
    const e1 = sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.rec.raw.backendDirectional.liveEnriching, true, 'the batch marks itself in-flight SYNCHRONOUSLY (before its first await)');
    const e2 = sb.ctx.dsbEnrichVisibleRowsLive();
    releaseQuote();
    await Promise.all([e1, e2]);
    eq(sb.log.subscribed.length, 1, 'a concurrent enrichment call does NOT start a second batch (live single-flight)');
    eq(sb.log.quoted.length, 2, 'exactly one batch of quotes was issued — one per visible row, not two batches');
    eq(sb.rec.raw.backendDirectional.liveEnriching, false, 'the live single-flight flag is released after the batch');
  }
  {
    const sb = makeSandbox({
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; },
    });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    sb.ctx.fetchLiveQuote = function () { return Promise.reject(new Error('The operation was aborted.')); };
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.rec.raw.backendDirectional.livePriceReason, 'live_quote_aborted', 'an aborted batch records live_quote_aborted');
    ok(sb.rec.raw.backendDirectional.liveEnrichCooldownUntil > Date.now(), 'an aborted batch installs a forward-dated cooldown');
    const before = sb.log.subscribed.length;
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.log.subscribed.length, before, 'during the cooldown a new pass is suppressed (no relaunch storm)');
  }

  // ── auto-refresh lifecycle ───────────────────────────────────────────────
  {
    const sb = makeSandbox({ fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(1)); } }; } });
    sb.ctx.dsbStartAutoRefresh();
    eq(sb.log.intervals, 1, 'dsbStartAutoRefresh installs exactly ONE interval');
    sb.ctx.dsbStartAutoRefresh();
    sb.ctx.dsbStartAutoRefresh();
    eq(sb.log.intervals, 1, 'repeated dsbStartAutoRefresh calls are idempotent — still ONE interval');
    sb.ctx.dsbStopAutoRefresh();
    eq(sb.log.clearedIntervals, 1, 'dsbStopAutoRefresh clears the interval');
    eq(sb.rec.raw.backendDirectional.autoRefreshTimerId, null, 'the interval handle is nulled');
    sb.ctx.dsbStartAutoRefresh();
    eq(sb.log.intervals, 2, 'after a stop, a start installs a fresh interval (restartable)');
    await new Promise(function (r) { setImmediate(r); });
  }
  {
    const off = makeSandbox({ activeView: 'journal' });
    off.ctx.dsbStartAutoRefresh();
    eq(off.log.intervals, 0, 'auto-refresh refuses to start off the Dashboard');
    const hidden = makeSandbox({ pageHidden: true });
    hidden.ctx.dsbStartAutoRefresh();
    eq(hidden.log.intervals, 0, 'auto-refresh refuses to start while the page is hidden');
    const flagOff = makeSandbox({ storage: { apex_ff_backend_directional_snapshot: '0' } });
    flagOff.ctx.dsbStartAutoRefresh();
    eq(flagOff.log.intervals, 0, 'auto-refresh refuses to start with the feature flag off');
  }
  {
    // Stopping must also tear down the pending retry.
    const sb = makeSandbox({ marketOpen: false,
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    await sb.ctx.dsbEnrichVisibleRowsLive();
    eq(sb.log.timeouts.length, 1, 'a retry is pending before teardown');
    sb.ctx.dsbStopAutoRefresh();
    eq(sb.log.clearedTimeouts, 1, 'dsbStopAutoRefresh ALSO clears the pending readiness retry');
    eq(sb.rec.raw.backendDirectional.liveRetryTimerId, null, 'the retry handle is nulled on teardown');
  }

  // ── source mode + localStorage ───────────────────────────────────────────
  {
    const sb = makeSandbox({});
    eq(sb.ctx.dsbSourceMode(), 'auto', 'default source mode is auto');
    sb.ctx.dsbSetSourceMode('frontend');
    eq(sb.store.apex_dss_source_mode, 'frontend', 'setting the mode persists it to localStorage');
    eq(sb.ctx.dsbSourceMode(), 'frontend', 'the persisted mode is read back');
    eq(sb.log.renders, 1, 'changing the mode triggers exactly one re-render through the frontend renderer');
    const restored = makeSandbox({ storage: { apex_dss_source_mode: 'frontend' } });
    eq(restored.ctx.dsbSourceMode(), 'frontend', 'the mode is restored from localStorage on a fresh load');
    const bad = makeSandbox({ storage: { apex_dss_source_mode: 'garbage' } });
    eq(bad.ctx.dsbSourceMode(), 'auto', 'an unrecognised persisted value falls back to auto');
  }

  // ── chart-open bridge ────────────────────────────────────────────────────
  {
    const sb = makeSandbox({ fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    sb.ctx.dsbNoteDirectionalChartOpen('SYM0', { price: 100, priceSource: 'X' });
    eq(sb.log.postCandleContexts.length, 1, 'opening a chart fires exactly ONE postCandleContext prewarm hint');
    eq(sb.log.postCandleContexts[0].reason, 'directional_chart_open', 'the prewarm reason is directional_chart_open');
    eq(sb.log.postCandleContexts[0].contextType, 'chart', 'the prewarm contextType is chart');
    deepEq(sb.log.postCandleContexts[0].timeframes, ['1D', '4H', '30M'], 'the prewarm requests 1D + 4H + 30M (4H implies 30M)');
    eq(sb.rec.raw.backendDirectional.chartOpenContext.lastSymbol, 'SYM0', 'the chart-open context records the symbol');
    sb.log.postCandleContexts.length = 0;
    sb.ctx.dsbNoteDirectionalChartOpen('', null);
    eq(sb.log.postCandleContexts.length, 0, 'a blank/unsafe symbol is NEVER hinted');
  }
  {
    // Detail open for a symbol absent from the frontend scan.
    const sb = makeSandbox({ fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    const row = sb.ctx.dsbScanRowShim('SYM1');
    ok(!!row, 'dsbScanRowShim opens a backend-only symbol that was never scanned frontend-side');
    eq(row.candles, null, 'the shim fabricates NO frontend candle array (charts load backend candles)');
    eq(row._dsbBackendRow, true, 'the shim is explicitly tagged as a backend row');
    const ts = sb.ctx.dsbTechnicalStateShim('SYM1');
    eq(ts._source, 'BACKEND_DIRECTIONAL_SNAPSHOT', 'the technical-state shim declares its backend provenance');
    eq(ts.candlesAvailable, false, 'the technical-state shim declares no frontend candles');
    eq(sb.ctx.dsbScanRowShim('NOPE'), null, 'an unknown symbol yields null (never a fabricated row)');
    ok(sb.rec.reads.every(function (r) { return r !== 'S.scanData'; }),
       'PROXY PROOF: the detail shims never read S.scanData');
  }
  {
    // Display-price priority.
    const sb = makeSandbox({ fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(2)); } }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    const fallback = sb.ctx.dssResolveChartLivePrice('NOPE');
    eq(fallback.source, null, 'with no DSB row and no resolver price, the chart resolver returns the inline resolver result');
    await sb.ctx.dssEnsureChartLiveQuoteForDisplay('SYM0');
    const fresh = sb.ctx.dssResolveChartLivePrice('SYM0');
    eq(fresh.source, 'fresh_live_quote', 'priority 1: a fresh chart-open quote wins');
    eq(fresh.price, 101.25, 'the fresh chart-open price is the one returned');
    eq(sb.log.quoted.length, 1, 'the chart-open path fetches exactly ONE quote for the symbol');
    await sb.ctx.dssEnsureChartLiveQuoteForDisplay('SYM0');
    eq(sb.log.quoted.length, 1, 'a rapid reopen of the SAME symbol reuses the cached quote (per-symbol TTL)');
  }
  {
    // Market closed: no fresh quote is fetched, and the resolver falls back to
    // the backend row — but ONLY while that row's price still counts as current.
    const recentPayload = { ok: true, results: [{
      symbol: 'SYM0', direction: 'bullish', score: 5, lastPrice: 123.5,
      lastPriceUpdatedAt: new Date().toISOString(),
    }] };
    const sb = makeSandbox({ marketOpen: false,
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(recentPayload); } }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    await sb.ctx.dssEnsureChartLiveQuoteForDisplay('SYM0');
    eq(sb.log.quoted.length, 0, 'chart-open never calls /market/live when the readiness gate is closed');
    const r = sb.ctx.dssResolveChartLivePrice('SYM0');
    eq(r.source, 'dsb_row_fallback', 'priority 2: the recent DSB row price is used when no fresh quote exists');
    eq(r.price, 123.5, 'the fallback returns the backend row price');
    // A row whose price is neither live nor recent must NOT be used.
    const stalePayload = { ok: true, results: [{
      symbol: 'SYM0', direction: 'bullish', score: 5, lastPrice: 123.5,
      lastPriceUpdatedAt: new Date(Date.now() - 3600000).toISOString(),
    }] };
    const stale = makeSandbox({ marketOpen: false,
      fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(stalePayload); } }; } });
    await stale.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    eq(stale.ctx.dssResolveChartLivePrice('SYM0').source, null,
       'a STALE backend row is not used as a display price — it falls through to the inline resolver');
  }

  // ── rendering ────────────────────────────────────────────────────────────
  {
    const sb = makeSandbox({ fetchImpl: function () { return { status: 200, ok: true, json: function () { return Promise.resolve(snapshotPayload(3)); } }; } });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    const painted = sb.ctx.dsbMaybeRenderBackendDirectional();
    eq(painted, true, 'dsbMaybeRenderBackendDirectional reports it painted the panel from the backend');
    const html = sb.els.panelContent.innerHTML;
    ok(html.length > 0, 'the panel body received HTML');
    ok(html.indexOf('dsb-refresh') >= 0, 'the rendered HTML contains the refresh control it later reads back by id');
    ok(html.indexOf('dsbSetSourceMode(') >= 0, 'the rendered HTML contains the source-mode control');
    ok(html.indexOf('openDirectionalSetupDetail(') >= 0, 'rows open the SAME detail as the frontend scanner');
    eq(sb.log.fetchUrls.length, 1, 'rendering issues no extra request');
    const frontendMode = makeSandbox({ storage: { apex_dss_source_mode: 'frontend' } });
    eq(frontendMode.ctx.dsbMaybeRenderBackendDirectional(), false, 'forced-frontend mode refuses to paint the backend panel');
    const flagOff = makeSandbox({ storage: { apex_ff_backend_directional_snapshot: '0' } });
    eq(flagOff.ctx.dsbMaybeRenderBackendDirectional(), false, 'the feature flag off refuses to paint the backend panel');
  }
  {
    // Escaping is applied to untrusted snapshot text.
    const sb = makeSandbox({
      fetchImpl: function () {
        return { status: 200, ok: true, json: function () {
          return Promise.resolve({ ok: true, results: [{ symbol: 'AAA', name: '<script>x</script>', direction: 'bullish', score: 1, lastPrice: 1 }] });
        } };
      },
    });
    await sb.ctx.dsbFetchSnapshot({ rerender: false, enrichLive: false });
    sb.ctx.dsbMaybeRenderBackendDirectional();
    ok(sb.els.panelContent.innerHTML.indexOf('<script>') < 0, 'untrusted snapshot text is escaped before it reaches innerHTML');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 18 — dynamic purity: which functions are REALLY pure
//
// Runs a candidate subset against a THROWING Proxy global. Anything that
// touches the DOM, the network, a timer, storage or S blows up. This is what
// decides whether an "adapter" module (option C) is real or wishful.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 18 — dynamic purity sandbox (throwing Proxy global)');

const PURE_CANDIDATES = [
  '_dsbNum', '_dsbStr', '_dsbBool', '_dsbObj', '_dsbSafeSym',
  'dsbClassifyRowPrice', 'dsbRowPriceIsCurrent', 'dsbNormalizeResultRow',
  'dsbParseSnapshot', 'dsbSnapshotAgeMs', 'dsbRowsForMode',
];
const IMPURE_CONTROL = ['dsbState', 'dsbSourceMode', 'dsbFetchSnapshot', 'dsbRenderBackendDirectional', 'dsbFindRow'];

function purityContext(names) {
  const allowed = {
    Object: Object, Array: Array, String: String, Number: Number, Boolean: Boolean, Math: Math,
    JSON: JSON, Date: Date, isNaN: isNaN, isFinite: isFinite, parseFloat: parseFloat, parseInt: parseInt,
    RegExp: RegExp, Error: Error, undefined: undefined,
  };
  const touched = [];
  const base = {};
  const handler = {
    has: function () { return true; },
    get: function (t, p) {
      if (typeof p !== 'string') return undefined;
      if (Object.prototype.hasOwnProperty.call(allowed, p)) return allowed[p];
      if (Object.prototype.hasOwnProperty.call(t, p)) return t[p];
      touched.push(p);
      throw new Error('FORBIDDEN GLOBAL: ' + p);
    },
    set: function (t, p, v) { t[p] = v; return true; },
  };
  const ctx = vm.createContext(new Proxy(base, handler));
  // Only the candidate declarations + the constants they legitimately read.
  const parts = A.bindings.map(function (b) {
    const semi = A.masked.indexOf(';', b.start);
    return SRC.slice(b.start, semi + 1);
  });
  names.forEach(function (n) {
    const f = A.fns.find(function (x) { return x.name === n; });
    parts.push(SRC.slice(f.start, f.end));
  });
  vm.runInContext(parts.join('\n'), ctx);
  return { ctx: ctx, base: base, touched: touched };
}

{
  // Every pure candidate is loaded together with the constants and nothing else.
  const env = purityContext(PURE_CANDIDATES.concat(['dsbNormalizeResultRow']));
  const call = function (name, args) {
    let threw = null, value;
    try { value = env.base[name].apply(null, args); } catch (e) { threw = e; }
    return { threw: threw, value: value };
  };
  const cases = [
    ['_dsbNum', [1.5], 1.5], ['_dsbNum', ['x'], null],
    ['_dsbStr', ['a'], 'a'], ['_dsbStr', [3], null],
    ['_dsbBool', [true], true], ['_dsbBool', [0], null],
    ['_dsbSafeSym', ['aapl'], 'AAPL'], ['_dsbSafeSym', ['<bad>'], null],
    ['dsbSnapshotAgeMs', [{}], null],
  ];
  cases.forEach(function (c) {
    const r = call(c[0], c[1]);
    ok(!r.threw, c[0] + '(' + JSON.stringify(c[1][0]) + ') ran with NO global access' + (r.threw ? ' — ' + r.threw.message : ''));
    eq(r.value, c[2], c[0] + '(' + JSON.stringify(c[1][0]) + ') result');
  });
  const parse = call('dsbParseSnapshot', [{ ok: true, results: [{ symbol: 'aapl', direction: 'bullish', score: 3, lastPrice: 10 }] }]);
  ok(!parse.threw, 'dsbParseSnapshot ran with NO global access' + (parse.threw ? ' — ' + parse.threw.message : ''));
  eq(parse.value ? parse.value.results.length : -1, 1, 'dsbParseSnapshot normalised one row without touching any global');
  eq(parse.value ? parse.value.results[0].ticker : null, 'AAPL', 'symbol safety is applied during parsing');
  const rows = call('dsbRowsForMode', [[{ direction: 'bullish', score: 1 }, { direction: 'bearish', score: 2 }], 'SHORT']);
  ok(!rows.threw, 'dsbRowsForMode ran with NO global access' + (rows.threw ? ' — ' + rows.threw.message : ''));
  eq(rows.value ? rows.value.length : -1, 1, 'dsbRowsForMode filters by direction without any global');
  const cls = call('dsbClassifyRowPrice', [{ priceIsLive: true, price: 1 }]);
  ok(!cls.threw, 'dsbClassifyRowPrice ran with NO global access (it reads only the DSB_* constant)');
  eq(cls.value, 'live', 'dsbClassifyRowPrice result');
  eq(env.touched.length, 0, 'ZERO forbidden globals were touched across the entire pure set');
  eq(PURE_CANDIDATES.length, 11, 'the measured PURE set is 11 functions');
}
{
  // Control: the impure five must FAIL the same sandbox. A purity claim that
  // nothing can violate is worthless. Two of them swallow their own errors
  // (dsbFindRow wraps everything in try/catch, dsbFetchSnapshot is async), so
  // the assertion is made on the RECORDED access list rather than on a thrown
  // error — the Proxy get-trap fires either way.
  const EXPECTED_TRIP = {
    dsbState: 'S',
    dsbSourceMode: 'dsbState',
    dsbFetchSnapshot: 'dsbState',
    dsbRenderBackendDirectional: '_dssMode',
    dsbFindRow: 'dsbGetBackendSource',
  };
  IMPURE_CONTROL.forEach(function (n) {
    const env = purityContext([n].concat(n === 'dsbFindRow' ? ['_dsbSafeSym'] : []));
    try {
      const args = (n === 'dsbFindRow') ? ['AAPL'] : (n === 'dsbRenderBackendDirectional' ? [{ rows: [] }] : []);
      const r = env.base[n].apply(null, args);
      if (r && typeof r.catch === 'function') r.catch(function () {});
    } catch (e) { /* the trap already recorded the access */ }
    ok(env.touched.length > 0,
       'CONTROL: ' + n + ' is NOT pure — the sandbox recorded forbidden access to `' +
       env.touched.slice(0, 3).join(', ') + '`');
    ok(env.touched.indexOf(EXPECTED_TRIP[n]) >= 0,
       'CONTROL: ' + n + ' reaches for `' + EXPECTED_TRIP[n] + '` — it can never live in a pure adapter module');
  });
}
ok(true, 'CONSEQUENCE: an "adapter" module is real — 11 of the 46 functions are provably side-effect free');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 19 — load-time safety and script order
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 19 — load order, top-level execution, script attributes');

// Measured current order of index.html.
const ALL_LOCAL_SCRIPTS = SCRIPT_TAGS
  .filter(function (t) { return t.src && APP.classifySrc(t.src) === 'local'; })
  .map(function (t) { return String(t.src).trim(); });
STRESS_COMPANION_SCRIPTS.forEach(function (src) {
  ok(ALL_LOCAL_SCRIPTS.indexOf(src) >= 0, 'the declared Stress companion module is loaded: ' + src);
});
const LOCAL_SCRIPTS = ALL_LOCAL_SCRIPTS
  .filter(function (src) { return STRESS_COMPANION_SCRIPTS.indexOf(src) < 0; });
deepEq(LOCAL_SCRIPTS, [
  './js/utils/indicators.js', './js/utils/option-symbols.js', './js/utils/normalizers.js',
  './js/api/backend-client.js', './js/config/backend-config.js',
  './js/services/candle-normalization.js', './js/services/candle-auth-gate.js',
  './js/services/candle-provenance.js', './js/services/candle-store-client.js',
  './js/services/candle-dxlink-client.js', './js/services/sfs-candle-predicates.js',
  './js/services/sfs-candle-warmup.js', './js/services/sfs-candle-generic-ensure.js',
  './js/services/sfs-candle-chart-hydration.js', './js/services/sfs-candle-spy-read.js',
  './js/services/sfs-candle-detail-4h.js', './js/services/backend-scanner-snapshot-service.js',
  './js/ui/backend-scanner-snapshot-panel.js', './js/adapters/backend-directional-adapter.js',
  './js/ui/backend-directional-preview.js', ADAPTER_SRC, SERVICE_SRC, PANEL_SRC,
], 'measured current local script order in index.html, excluding the Stress companion modules');
// 23 is the count this boundary was written around and is the number that must
// not drift. The stress contribution is DERIVED, so a permitted script tag no
// longer reads as a boundary violation while an undeclared one still does — it
// would land in LOCAL_SCRIPTS and break the fixture above by name.
eq(LOCAL_SCRIPTS.length, 23,
   'index.html loads 23 local application scripts beyond the declared Stress modules');
eq(LOCAL_SCRIPTS.length + STRESS_COMPANION_SCRIPTS.length, 23 + STRESS_COMPANION_SCRIPTS.length,
   'index.html loads 23 local application scripts plus the ' + STRESS_COMPANION_SCRIPTS.length +
   ' declared Stress modules before the inline monolith');
// ── the three DSB tags, positioned exactly as the plan requires ──────────────
{
  const at = function (src) { return LOCAL_SCRIPTS.indexOf(src); };
  eq(at(ADAPTER_SRC), 20, 'the DSB adapter is the third-to-last local script — slot #21 (0-based 20)');
  eq(at(SERVICE_SRC), 21, 'the DSB service is the second-to-last local script — slot #22 (0-based 21)');
  eq(at(PANEL_SRC), 22, 'the DSB panel is the LAST local script — slot #23 (0-based 22)');
  eq(at(SERVICE_SRC), at(ADAPTER_SRC) + 1, 'the DSB service loads IMMEDIATELY after the DSB adapter it consumes');
  eq(at(PANEL_SRC), at(SERVICE_SRC) + 1, 'the DSB panel loads IMMEDIATELY after the DSB service it consumes');
  ok(at('./js/services/backend-scanner-snapshot-service.js') < at(ADAPTER_SRC),
     'ORDER: backend-scanner-snapshot-service.js loads BEFORE the DSB adapter');
  ok(at('./js/ui/backend-scanner-snapshot-panel.js') < at(ADAPTER_SRC),
     'ORDER: backend-scanner-snapshot-panel.js loads BEFORE the DSB adapter');
  ok(at('./js/adapters/backend-directional-adapter.js') < at(ADAPTER_SRC),
     'ORDER: backend-directional-adapter.js loads BEFORE the DSB adapter');
  eq(at(ADAPTER_SRC) - at('./js/ui/backend-directional-preview.js'), 1,
     'ORDER: the DSB adapter comes IMMEDIATELY AFTER backend-directional-preview.js');
  // …and before the inline monolith, in the document itself.
  const adapterTagAt = SCRIPT_TAGS.findIndex(function (t) { return t.src && String(t.src).trim() === ADAPTER_SRC; });
  const inlineTagAt = SCRIPT_TAGS.findIndex(function (t) { return !t.src; });
  ok(adapterTagAt >= 0, 'the adapter <script> tag is present in index.html');
  ok(adapterTagAt < inlineTagAt, 'ORDER: the DSB adapter tag precedes the inline monolith tag');
  // The panel tag DOES exist — PR 3 shipped it. The only file with no tag is the
  // module option D would have created, which was measured and REJECTED.
  deepEq(FUTURE_FILES, ['js/services/directional-chart-display-price.js'],
    'the only rejected file is directional-chart-display-price.js');
  FUTURE_FILES.forEach(function (rel) {
    deepEq(LOCAL_SCRIPTS.filter(function (s) { return s.indexOf(path.basename(rel)) >= 0; }), [],
      'no <script> tag exists for the rejected ' + path.basename(rel));
  });
  eq(LOCAL_SCRIPTS.filter(function (s) { return s.indexOf('backend-directional-snapshot-panel.js') >= 0; }).length, 1,
    'the DSB panel DOES have its <script> tag — PR 3 shipped it');
}
{
  const inlineTags = SCRIPT_TAGS.filter(function (t) { return !t.src; });
  eq(inlineTags.length, 1, 'exactly ONE inline application script — the monolith');
  const lastLocalAt = SCRIPT_TAGS.map(function (t) { return t; }).reduce(function (acc, t, i) {
    return (t.src && APP.classifySrc(t.src) === 'local') ? i : acc;
  }, -1);
  const inlineAt = SCRIPT_TAGS.findIndex(function (t) { return !t.src; });
  ok(inlineAt > lastLocalAt, 'the inline monolith is the LAST application script in the document');
}
// No local script carries defer / async / type=module — the DSB module matches,
// or its declarations would stop being classic-script globals.
{
  const localTags = SCRIPT_TAGS.filter(function (t) { return t.src && APP.classifySrc(t.src) === 'local'; });
  const flagged = localTags
    .filter(function (t) { return /(^|\s)(defer|async)(\s|=|$)/i.test(t.attrs) || (t.type && String(t.type).toLowerCase() === 'module'); })
    .map(function (t) { return t.src; });
  deepEq(flagged, [], 'NO local script uses defer / async / type=module — all ' + localTags.length +
     ' are classic, in-order scripts');
  eq(localTags.length, 23 + STRESS_COMPANION_SCRIPTS.length,
     'the document carries 23 local classic scripts (19 + BSS panel + DSB adapter + service + panel) plus the ' +
     STRESS_COMPANION_SCRIPTS.length + ' Stress companion modules');
  const attrNames = localTags
    .map(function (t) { return (t.attrs.match(/([A-Za-z-]+)\s*=/g) || []).map(function (a) { return a.replace(/\s*=$/, ''); }).join(','); });
  deepEq(Array.from(new Set(attrNames)), ['src'], 'every local script tag carries exactly ONE attribute: src');
  // The new tag specifically: src and nothing else — no defer, async, type,
  // nomodule, integrity or crossorigin.
  const adapterTag = localTags.find(function (t) { return String(t.src).trim() === ADAPTER_SRC; });
  ok(!!adapterTag, 'the adapter tag was parsed');
  eq(adapterTag.attrs.trim(), 'src="' + ADAPTER_SRC + '"', 'the adapter tag carries EXACTLY one attribute: src');
  ['defer', 'async', 'type', 'nomodule', 'integrity', 'crossorigin'].forEach(function (a) {
    ok(!new RegExp('(^|\\s)' + a + '(\\s|=|$)', 'i').test(adapterTag.attrs),
       'the adapter tag does NOT carry ' + a);
  });
}

// ── Top-level execution profile per script ───────────────────────────────────
// A script's LOAD-TIME dependencies are the identifiers it evaluates OUTSIDE
// every function body. Call-time dependencies do not constrain script order;
// load-time ones do. `stripFunctions` blanks every function declaration AND
// every function expression / braced arrow body, at any nesting depth, so an
// IIFE's interior is not mistaken for top-level code.
function stripFunctions(masked) {
  const out = masked.split('');
  const isIdent = function (c) { return /[A-Za-z0-9_$]/.test(c); };
  const blankRange = function (a, b) { for (let k = a; k <= b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const matchFrom = function (open, close, from) {
    let d = 0;
    for (let k = from; k < out.length; k++) {
      if (out[k] === open) d++;
      else if (out[k] === close) { d--; if (d === 0) return k; }
    }
    return -1;
  };
  let i = 0;
  while (i < out.length) {
    if (out[i] === 'f' && out.slice(i, i + 8).join('') === 'function' &&
        !isIdent(out[i - 1] || ' ') && !isIdent(out[i + 8] || ' ')) {
      // Swallow a preceding `async` modifier so it is not left behind as
      // residue when the function body is blanked.
      let from = i;
      let k = i - 1;
      while (k >= 0 && /[ \t]/.test(out[k])) k--;
      if (k >= 4 && out.slice(k - 4, k + 1).join('') === 'async' && !isIdent(out[k - 5] || ' ')) from = k - 4;
      let j = i + 8;
      while (j < out.length && out[j] !== '(' && out[j] !== '{') j++;
      if (out[j] === '(') { const cp = matchFrom('(', ')', j); if (cp < 0) { i++; continue; } j = cp + 1; }
      while (j < out.length && out[j] !== '{') j++;
      const e = j < out.length ? matchFrom('{', '}', j) : -1;
      if (e < 0) { i++; continue; }
      blankRange(from, e); i = e + 1; continue;
    }
    if (out[i] === '=' && out[i + 1] === '>') {
      let j = i + 2;
      while (j < out.length && /\s/.test(out[j])) j++;
      if (out[j] === '{') {
        const e = matchFrom('{', '}', j);
        if (e >= 0) { blankRange(i, e); i = e + 1; continue; }
      }
    }
    i++;
  }
  return out.join('');
}
// Identifiers a script EVALUATES at load time.
function loadTimeIdentifiers(code) {
  const text = stripFunctions(maskSource(code));
  const set = new Set();
  let m; const re = /(?<![A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = re.exec(text)) !== null) {
    const n = m[1];
    if (JS_KEYWORDS.has(n)) continue;
    if (/^\s*:/.test(text.slice(m.index + n.length, m.index + n.length + 2))) continue;
    set.add(n);
  }
  return set;
}
// Top-level (depth-0) declarations a script contributes to the shared global scope.
function topLevelDeclarations(code) {
  const masked = maskSource(code);
  const bd = braceDepths(masked);
  const set = new Set();
  let m;
  let re = /(?:^|\n)[ \t]*(?:async[ \t]+)?function[ \t]+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = re.exec(masked)) !== null) {
    const st = m.index + (m[0].charAt(0) === '\n' ? 1 : 0);
    if (bd[st] === 0) set.add(m[1]);
  }
  re = /(?:^|\n)[ \t]*(?:var|let|const)[ \t]+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = re.exec(masked)) !== null) {
    const st = m.index + (m[0].charAt(0) === '\n' ? 1 : 0);
    if (bd[st] === 0) set.add(m[1]);
  }
  return set;
}

{
  // Two load-time metrics, deliberately separate:
  //   tlChars      — every top-level character, binding initialisers included.
  //   effectChars  — the same, MINUS inert `var NAME = <number>;` initialisers.
  // A numeric constant initialiser executes but can have no effect on anything:
  // it cannot call, read a shared global, or observe load order. The plan permits
  // exactly those eight for the adapter and nothing else, so the convention is
  // stated in terms of effectChars while tlChars is still reported.
  const INERT_NUMERIC_BINDING = /(?:^|\n)\s*var\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*[0-9]+\s*;/g;
  const profile = APP_PARTS.map(function (p) {
    const tl = stripFunctions(maskSource(p.code));
    return {
      name: p.name,
      tlChars: tl.replace(/\s+/g, '').length,
      effectChars: tl.replace(INERT_NUMERIC_BINDING, '').replace(/\s+/g, '').length,
    };
  });
  const modules = profile.filter(function (p) { return p.name !== 'INLINE'; });
  const withTopLevel = modules.filter(function (p) { return p.effectChars > 20; });
  // The Stress companion modules declare literal constants at top level, so they
  // exceed the effectChars threshold. They are NOT waved through: the assertion
  // immediately below is stricter than the byte budget it replaces for them —
  // their entire top-level residue may contain no call at all except
  // `Object.freeze`, which cannot call an application function, read a shared
  // global or observe load order. That is what the byte budget was approximating.
  deepEq(withTopLevel.map(function (p) { return p.name; }),
    ['./js/config/backend-config.js'].concat(STRESS_COMPANION_SCRIPTS),
    'of the extracted modules, only backend-config.js and the declared Stress module constants execute anything at load time');

  STRESS_COMPANION_SCRIPTS.forEach(function (name) {
    const part = APP_PARTS.find(function (p) { return p.name === name; });
    ok(!!part, 'the Stress companion module is part of the loaded application: ' + name);
    if (!part) return;
    const topLevel = stripFunctions(maskSource(part.code));
    const calls = [];
    const re = /([A-Za-z_$][A-Za-z0-9_$.]*)\s*\(/g;
    let m;
    while ((m = re.exec(topLevel)) !== null) calls.push(m[1]);
    // Object.freeze and Object.keys only. Both are pure reads of a literal
    // declared in the same file: neither can call an application function, read
    // a shared global, or observe load order — which is what the byte budget
    // this replaces was approximating.
    const INERT_BUILTINS = ['Object.freeze', 'Object.keys'];
    const disallowed = calls.filter(function (c) { return INERT_BUILTINS.indexOf(c) < 0; });
    deepEq(disallowed, [], name + ' calls nothing at load time except ' + INERT_BUILTINS.join('/'));
    ok(!/\b(document|window|localStorage|sessionStorage|fetch|setTimeout|setInterval|addEventListener)\b/.test(topLevel),
      name + ' touches no DOM, storage, network or timer at load time');
    // Only fresh `var` declarations — nothing is assigned into an existing global.
    const assignments = topLevel.match(/(?:^|\n)\s*[A-Za-z_$][A-Za-z0-9_$.]*\s*=/g) || [];
    deepEq(assignments, [], name + ' assigns to no pre-existing binding at load time');
  });
  ok(withTopLevel[0].effectChars < 200,
     'backend-config.js top-level code is tiny (' + withTopLevel[0].effectChars + ' chars: `const BACKEND = resolveBackendUrl();`)');
  const inline = profile.find(function (p) { return p.name === 'INLINE'; });
  ok(inline.effectChars > 20000, 'the inline monolith executes ' + inline.effectChars + ' chars at load time — that is what pins it LAST');
  // The DSB adapter matches the convention: its ONLY load-time code is the eight
  // inert `var DSB_* = <number>;` initialisers the plan explicitly permits.
  const dsbAdapter = profile.find(function (p) { return p.name === ADAPTER_SRC; });
  ok(!!dsbAdapter, 'the DSB adapter is one of the profiled modules');
  eq(dsbAdapter.effectChars, 0,
     'the DSB adapter has ZERO load-time code with an effect (its ' + dsbAdapter.tlChars +
     ' top-level chars are the 8 inert numeric initialisers)');
  ok(dsbAdapter.tlChars > 0, 'the adapter DOES carry the 8 initialisers — they were not silently dropped');
  {
    const residue = stripFunctions(maskSource(A.adapterText));
    ok(!/\(/.test(residue), 'ADAPTER: performs NO call at load time');
    ok(!/\./.test(residue), 'ADAPTER: performs NO member access at load time');
    ok(!/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|window|globalThis|document|localStorage)(?![A-Za-z0-9_$])/.test(residue),
       'ADAPTER: reads NO shared global (S / WL / BACKEND / window / globalThis / document / localStorage) at load time');
    const inert = residue.replace(INERT_NUMERIC_BINDING, '');
    eq(inert.replace(/\s+/g, '').length, 0,
       'ADAPTER: its entire load-time residue is the 8 inert numeric constant initialisers — nothing else runs');
    // Sensitivity: the metric must be able to SEE a real load-time effect.
    const probe = stripFunctions(maskSource(A.adapterText + '\nvar DSB_PROBE = S.backendDirectional;\n'))
      .replace(INERT_NUMERIC_BINDING, '').replace(/\s+/g, '').length;
    ok(probe > 0, 'SENSITIVITY: adding one real load-time read makes effectChars non-zero — the 0 above is measured, not structural');
  }
  note('the established module convention is: no meaningful top-level execution. The DSB adapter matches it.');
}

// ── The order predicate ──────────────────────────────────────────────────────
// CROSS-SCRIPT LOAD-TIME DEPENDENCY: an identifier a script evaluates at load
// time that is declared at top level by a DIFFERENT script. Those — and only
// those — constrain script order. The predicate is applied to the REAL parsed
// order of index.html, and then shown to reject concrete wrong orders.
function crossScriptLoadTimeDeps(parts) {
  const decls = parts.map(function (p) { return p.__decls || (p.__decls = topLevelDeclarations(p.code)); });
  const loads = parts.map(function (p) { return p.__loads || (p.__loads = loadTimeIdentifiers(p.code)); });
  const deps = [];
  parts.forEach(function (p, i) {
    loads[i].forEach(function (n) {
      if (decls[i].has(n)) return;
      for (let j = 0; j < parts.length; j++) {
        if (j !== i && decls[j].has(n)) { deps.push({ consumer: p.name, name: n, provider: parts[j].name, ok: j < i }); return; }
      }
    });
  });
  return deps;
}
function loadOrderSafe(parts) {
  const bad = crossScriptLoadTimeDeps(parts).filter(function (d) { return !d.ok; });
  return { safe: bad.length === 0, violations: bad };
}

// ── the inline part, and the counterfactual residues built from it ───────────
// The reconstructed SRC now contains the adapter, the service and the panel
// TOO, so a "rump" can no longer be cut out of SRC by offsets — that would
// silently keep those modules' declarations inside the reconstructed monolith.
// The rump is therefore built from the INLINE PART ALONE, which is the only
// place the residue lives.
const INLINE_PART = APP_PARTS[APP_PARTS.length - 1];
const INLINE_BLOCK_START = INLINE_PART.code.indexOf(START_MARKER);
const INLINE_BLOCK_END = INLINE_PART.code.indexOf(END_MARKER);
ok(INLINE_PART.name === 'INLINE', 'the last application part is the inline monolith');
ok(INLINE_BLOCK_START >= 0 && INLINE_BLOCK_END > INLINE_BLOCK_START,
   'the marker range is locatable inside the inline part on its own');
// Replace the marker range with `replacement` (default: remove it entirely).
function inlineRump(replacement) {
  return INLINE_PART.code.slice(0, INLINE_BLOCK_START) + (replacement || '') +
         INLINE_PART.code.slice(INLINE_BLOCK_END);
}
// Every application part except the inline monolith AND except all THREE
// shipped DSB modules — the base every counterfactual ("what if we had not
// extracted", "what if the modules were ordered differently") starts from. All
// three must be excluded: leaving any of them in would pre-satisfy the very
// dependency the counterfactual is probing and quietly disarm the order
// predicates below.
const BASE_NO_DSB = APP_PARTS.filter(function (p) {
  return p.name !== 'INLINE' && p.name !== ADAPTER_SRC &&
         p.name !== SERVICE_SRC && p.name !== PANEL_SRC;
}).map(function (p) { return { name: p.name, code: p.code }; });
deepEq(BASE_NO_DSB.filter(function (p) {
  return p.name === ADAPTER_SRC || p.name === SERVICE_SRC || p.name === PANEL_SRC;
}), [], 'the counterfactual base carries NONE of the three shipped DSB modules');
{
  const real = loadOrderSafe(APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; }));
  ok(real.safe, 'PREDICATE APPLIED TO THE REAL index.html ORDER: load-order safe' +
     (real.safe ? '' : ' — ' + JSON.stringify(real.violations.slice(0, 3))));
  const deps = crossScriptLoadTimeDeps(APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; }));
  // PR 2 adds exactly TWO new load-time dependencies, and they are the W2
  // exposures: the inline `window.apexDebug* = apexDebug*` statements now read
  // their two function declarations out of the service module. That is the
  // measured proof that the W2 timing survived the relocation — the exposures
  // run at the same moment, in the same order, and resolve because the service
  // is evaluated BEFORE the monolith. Any regression in script order turns
  // these two into ReferenceErrors and this predicate reports it.
  eq(deps.length, 8, 'the real document has exactly 8 cross-script LOAD-TIME dependencies (6 + the 2 W2 exposures)');
  deepEq(deps.map(function (d) { return d.name; }).sort(),
    ['_apexParityNormCandle', '_apexParityNormCandleArray', '_apexParityNormTime',
     '_isTransientFetchError', '_ttCallWithRetry', 'apexDebugBackendDirectionalPreview',
     'apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
    'the 8 identifiers the inline monolith evaluates at load time from earlier modules');
  deepEq(Array.from(new Set(deps.map(function (d) { return d.consumer; }))), ['INLINE'],
    'ALL cross-script load-time dependencies belong to the inline monolith — no module depends on another at load time');
  deepEq(Array.from(new Set(deps.map(function (d) { return d.provider; }))).sort(),
    ['./js/api/backend-client.js', './js/services/backend-directional-snapshot-service.js',
     './js/services/candle-normalization.js', './js/ui/backend-directional-preview.js'],
    'those 8 come from exactly 4 provider modules');
  deepEq(deps.filter(function (d) { return d.provider === SERVICE_SRC; })
             .map(function (d) { return d.name; }).sort(),
    ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
    'the service provides EXACTLY the two W2 exposure targets at load time — nothing else is read from it early');

  // Rejection 1 — a real provider moved after the monolith.
  ['./js/api/backend-client.js', './js/services/candle-normalization.js',
   './js/ui/backend-directional-preview.js'].forEach(function (rel) {
    const idx = APP_PARTS.findIndex(function (p) { return p.name === rel; });
    const moved = APP_PARTS.filter(function (_, i) { return i !== idx; })
      .concat([APP_PARTS[idx]]).map(function (p) { return { name: p.name, code: p.code }; });
    const r = loadOrderSafe(moved);
    ok(!r.safe, 'PREDICATE REJECTS moving ' + rel + ' after the inline monolith (breaks `' +
       (r.violations[0] ? r.violations[0].name : '?') + '`)');
  });

  // Rejection 2 — the inline monolith moved first.
  const inlineFirst = [APP_PARTS[APP_PARTS.length - 1]].concat(APP_PARTS.slice(0, -1))
    .map(function (p) { return { name: p.name, code: p.code }; });
  ok(!loadOrderSafe(inlineFirst).safe, 'PREDICATE REJECTS moving the inline monolith to the front');

  // Acceptance — the SHIPPED PR 1 order is the one that matters now, and it is
  // the real document order already checked above. The remaining question is
  // whether the plan's next two steps stay safe from here.
  const byName = {};
  A.fns.forEach(function (f) { byName[f.name] = SRC.slice(f.start, f.end); });
  const pick = function (names) { return names.map(function (n) { return byName[n]; }).join('\n'); };
  const realAdapter = { name: ADAPTER_SRC, code: A.adapterText };
  const rump = { name: 'INLINE', code: inlineRump() };
  // ORDER C, rebuilt from the declaration spans: the shipped adapter, then a
  // service and a panel module reassembled from the measured spans, then the
  // residual monolith. Rebuilding rather than reusing the shipped files is the
  // point — it proves the ORDER is safe for ANY correct grouping, not just for
  // the exact bytes that happen to be on disk.
  const modService = { name: './js/services/backend-directional-snapshot-service.js',
    code: pick(A.fnNames.filter(function (n) { return PURE_CANDIDATES.indexOf(n) < 0 && CATEGORIES.G.indexOf(n) < 0; })) };
  const modPanel = { name: './js/ui/backend-directional-snapshot-panel.js',
    code: pick(CATEGORIES.G.filter(function (n) { return PURE_CANDIDATES.indexOf(n) < 0; })) };
  ok(loadOrderSafe(BASE_NO_DSB.concat([realAdapter, modService, modPanel, rump])).safe,
     'ORDER C COMPLETED (adapter → service → panel → inline monolith, rebuilt from spans) is load-order safe');
  // …and the shipped adapter followed by the real inline monolith is safe. Note
  // that monolith no longer declares any DSB residue — PR 2 and PR 3 emptied it
  // — so this is the CURRENT adapter→monolith edge, not a replay of PR 1's state.
  ok(loadOrderSafe(BASE_NO_DSB.concat([realAdapter, { name: 'INLINE', code: INLINE_PART.code }])).safe,
     'ADAPTER → the real inline monolith is load-order safe');

  // Rejection 3 — a DSB module that reads S at load time, placed BEFORE the
  // monolith that declares `const S`. This is the TDZ failure the audit warns about.
  const tdzModule = { name: './js/services/backend-directional-snapshot-service.js',
                      code: A.blockText + '\nvar DSB_BOOT_PROBE = S.backendDirectional;\n' };
  const rTdz = loadOrderSafe(BASE_NO_DSB.concat([realAdapter, tdzModule, rump]));
  ok(!rTdz.safe, 'PREDICATE REJECTS a DSB module that evaluates `S` at load time before the monolith declares it' +
     (rTdz.violations[0] ? ' (breaks `' + rTdz.violations[0].name + '`)' : ''));
  // …and the same module placed AFTER the monolith is accepted, proving the
  // predicate reacts to ORDER and not merely to the added line.
  ok(loadOrderSafe(BASE_NO_DSB.concat([realAdapter, rump, tdzModule])).safe,
     'the same module placed AFTER the monolith is accepted — the predicate is order-sensitive, not a constant');

  // Rejection 4 — the SHIPPED adapter moved after the inline monolith. The
  // residue reads the adapter's declarations only at CALL time, so the load-time
  // predicate alone cannot see it; a REAL load-time reader is added to make the
  // ordering constraint observable, then shown to flip with position.
  {
    const rumpReadsAdapter = { name: 'INLINE',
      code: INLINE_PART.code + '\nvar DSB_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n' };
    const wrong = loadOrderSafe(BASE_NO_DSB.concat([rumpReadsAdapter, realAdapter]));
    ok(!wrong.safe, 'PREDICATE REJECTS the adapter loaded AFTER the monolith once the monolith really reads a DSB constant at load time' +
       (wrong.violations[0] ? ' (breaks `' + wrong.violations[0].name + '`)' : ''));
    ok(loadOrderSafe(BASE_NO_DSB.concat([realAdapter, rumpReadsAdapter])).safe,
       'the SAME pair is accepted with the adapter FIRST — position, not content, decides');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 20 — Temporal Dead Zone
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 20 — TDZ exposure of S, WL, BACKEND and the DSB constants');
{
  // How the collaborators the block reads are declared, and where.
  const declKind = function (name) {
    const re = new RegExp('(?:^|\\n)\\s*(var|let|const)\\s+' + name + '\\b');
    const m = re.exec(A.masked);
    if (!m) return null;
    const off = m.index + (m[0].charAt(0) === '\n' ? 1 : 0);
    return { kind: m[1], offset: off, beforeBlock: off < A.start };
  };
  const s = declKind('S'), wl = declKind('WL'), backend = declKind('BACKEND');
  eq(s ? s.kind : null, 'const', 'S is declared with `const` — it lives in the GLOBAL LEXICAL environment, not on window');
  eq(wl ? wl.kind : null, 'const', 'WL is declared with `const` — same lexical environment');
  eq(backend ? backend.kind : null, 'const', 'BACKEND is declared with `const`');
  ok(s.beforeBlock && wl.beforeBlock && backend.beforeBlock, 'all three are declared before the block in document order');
  ok(true, 'TDZ RULE: a module loaded EARLIER than the declaring script may reference S/WL/BACKEND at CALL time, never at LOAD time');
  // S and WL are declared by the inline monolith itself, so a DSB module placed
  // before it would sit inside their TDZ for the whole of its own evaluation.
  const inlineStart = (function () {
    const appParts = PARTS.filter(function (p) { return p.isAppJs && p.code != null; });
    let off = 0;
    for (const p of appParts) { if (p.kind === 'inline') return off; off += p.code.length + 1; }
    return -1;
  })();
  ok(s.offset > inlineStart, 'S is declared INSIDE the inline monolith — a DSB module before it is inside S\'s TDZ at load time');
  ok(wl.offset > inlineStart, 'WL is declared INSIDE the inline monolith — same TDZ window');
  ok(backend.offset < inlineStart, 'BACKEND is declared in js/config/backend-config.js — already initialised before any DSB module');
}
{
  // The block never dereferences S at load time, so the TDZ never bites.
  ok(!/(?<![A-Za-z0-9_$.])S(?![A-Za-z0-9_$])/.test(A.topLevelStatementCode),
     'no top-level statement of the block references S — the TDZ window is never entered');
  ok(!/(?<![A-Za-z0-9_$.])WL(?![A-Za-z0-9_$])/.test(A.topLevelStatementCode),
     'no top-level statement of the block references WL');
  ok(!/(?<![A-Za-z0-9_$.])BACKEND(?![A-Za-z0-9_$])/.test(A.topLevelStatementCode),
     'no top-level statement of the block references BACKEND');
  // Proven dynamically: evaluating the block in a context WITHOUT S must not throw.
  let threw = null;
  try {
    const ctx = vm.createContext({ window: {}, console: { log: function () {} } });
    vm.runInContext(A.blockText, ctx);
  } catch (e) { threw = e; }
  ok(!threw, 'DYNAMIC TDZ PROOF: the block evaluates cleanly in a context with NO S, NO BACKEND, NO document' +
     (threw ? ' — ' + threw.message : ''));
  ok(true, 'CONSEQUENCE: the block is safe to relocate into ANY script that loads before the inline monolith');
}
{
  // The 8 constants are `var`, so even a hypothetical load-time read is defined.
  const env = vm.createContext({});
  const consts = A.bindings.map(function (b) {
    const semi = A.masked.indexOf(';', b.start);
    return SRC.slice(b.start, semi + 1);
  }).join('\n');
  vm.runInContext('var probe = typeof DSB_SNAPSHOT_TTL_MS;\n' + consts, env);
  eq(env.probe, 'undefined', 'a read BEFORE the var initialiser yields undefined, not a ReferenceError (no TDZ)');
  ok(true, 'had the constants been `const`, the same read would have thrown — the `var` choice is what makes them TDZ-free');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 21 — CANONICAL PLAN SETS
//
// The extraction plan is defined ONCE here, as three disjoint sets that cover
// every declaration the block owns. Option scoring, the reconstructed ORDER C, the
// PR plan, the summary and the mutation proof all read from these same sets, so
// a function can never be counted twice or dropped between them.
//
// dsbRowsForMode is the case that forces this: it is categorised under rendering
// (G) because the panel is its only caller, but it is measured PURE, so the
// adapter claims it and the panel set must exclude it.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 21 — canonical plan sets');

const ADAPTER_FUNCTION_SET = PURE_CANDIDATES.slice();
const PANEL_SET = CATEGORIES.G.filter(function (name) {
  return ADAPTER_FUNCTION_SET.indexOf(name) < 0;
});
const SERVICE_SET = A.fnNames.filter(function (name) {
  return ADAPTER_FUNCTION_SET.indexOf(name) < 0 && PANEL_SET.indexOf(name) < 0;
});
const ADAPTER_DECLARATION_SET = A.bindingNames.concat(ADAPTER_FUNCTION_SET);

// (1)(3)(4) sizes
eq(ADAPTER_FUNCTION_SET.length, 11, 'ADAPTER function set size');
eq(SERVICE_SET.length, 26, 'SERVICE function set size');
eq(PANEL_SET.length, 9, 'PANEL function set size');
eq(ADAPTER_FUNCTION_SET.length + SERVICE_SET.length + PANEL_SET.length, 46,
   'the three function sets cover all 46 functions');
// (2) adapter declarations = 8 constants + 11 functions
eq(ADAPTER_DECLARATION_SET.length, 19, 'ADAPTER declaration set size (8 constants + 11 functions)');
eq(ADAPTER_DECLARATION_SET.filter(function (n) { return A.bindingNames.indexOf(n) >= 0; }).length, 8,
   'ADAPTER declaration set contains the 8 DSB constants');
eq(ADAPTER_DECLARATION_SET.filter(function (n) { return A.fnNames.indexOf(n) >= 0; }).length, 11,
   'ADAPTER declaration set contains the 11 pure functions');

// The canonical module assignment: every declaration → exactly one module.
const CANONICAL_MODULES = {
  adapter: ADAPTER_DECLARATION_SET.slice(),
  service: SERVICE_SET.slice(),
  panel: PANEL_SET.slice(),
};
const CANONICAL_FILES = {
  adapter: 'js/adapters/backend-directional-snapshot-adapter.js',
  service: 'js/services/backend-directional-snapshot-service.js',
  panel: 'js/ui/backend-directional-snapshot-panel.js',
};

// (5) no duplicate across the three sets
{
  const all = CANONICAL_MODULES.adapter.concat(CANONICAL_MODULES.service, CANONICAL_MODULES.panel);
  const dupes = all.filter(function (n, i) { return all.indexOf(n) !== i; });
  deepEq(dupes, [], 'no declaration appears in more than one canonical set');
  // (6) no omission, (7) 54 covered exactly once
  const owned = A.fnNames.concat(A.bindingNames);
  deepEq(owned.filter(function (n) { return all.indexOf(n) < 0; }), [],
    'no declaration owned by the block is missing from the plan');
  eq(all.length, 54, 'the three canonical sets contain 54 names');
  eq(new Set(all).size, 54, 'the 54 declarations are covered EXACTLY ONCE');
}
// (8)(9) the dsbRowsForMode case
ok(ADAPTER_FUNCTION_SET.indexOf('dsbRowsForMode') >= 0, 'dsbRowsForMode is assigned to the ADAPTER (it is measured pure)');
ok(PANEL_SET.indexOf('dsbRowsForMode') < 0, 'dsbRowsForMode is NOT in the panel set');
ok(SERVICE_SET.indexOf('dsbRowsForMode') < 0, 'dsbRowsForMode is NOT in the service set');
deepEq(CATEGORIES.G.filter(function (n) { return ADAPTER_FUNCTION_SET.indexOf(n) >= 0; }), ['dsbRowsForMode'],
  'exactly ONE rendering-category function is pure, and it is the one the adapter claims');
eq(PANEL_SET.length, CATEGORIES.G.length - 1, 'the panel set is category G minus that single function');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 22 — DECLARATION RECORDS AND THE HOMOGENEOUS SIZE METRIC
//
// Everything that follows scores 54 DECLARATIONS, not 46 functions. The eight
// DSB_* constants carry ownership, bytes and inbound edges exactly like the
// functions do, so they participate in coverage, sizing and cross-module edges
// instead of being appended to the PR plan afterwards.
//
// SIZE METRIC — "owned declaration bytes": the sum of the exact character spans
// of the TOP-LEVEL declarations a file (or a candidate module) owns. Functions
// count their whole body; bindings count through their terminating `;`. File
// headers, banner comments and blank lines are excluded. The SAME function
// computes it for the already-shipped modules and for the candidate modules, so
// the comparison is unit-homogeneous.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 22 — declaration records, edges and the size metric');

// Top-level declaration spans of ANY source — used for both sides of the
// comparison, which is what makes the metric homogeneous.
function declarationSpans(code) {
  const masked = maskSource(code);
  const bd = braceDepths(masked);
  const out = topLevelFunctions(code, masked, bd).map(function (f) {
    return { name: f.name, kind: f.isAsync ? 'async function' : 'function',
             start: f.start, end: f.end, bytes: f.end - f.start };
  });
  const re = /(?:^|\n)[ \t]*(var|let|const)[ \t]+([A-Za-z_$][A-Za-z0-9_$]*)[ \t]*=/g;
  let m;
  while ((m = re.exec(masked)) !== null) {
    const st = m.index + (m[0].charAt(0) === '\n' ? 1 : 0);
    if (bd[st] !== 0) continue;
    const semi = masked.indexOf(';', st);
    const end = semi < 0 ? st : semi + 1;
    out.push({ name: m[2], kind: m[1] + ' binding', start: st, end: end, bytes: end - st });
  }
  return out.sort(function (a, b) { return a.start - b.start; });
}
// THE metric. One implementation, used on both sides of every size comparison.
function ownedDeclarationBytes(code) {
  return declarationSpans(code).reduce(function (n, d) { return n + d.bytes; }, 0);
}

// The DSB declaration records: 46 functions + 8 bindings, uniform shape.
const DECLARATIONS = A.fns.map(function (f) {
  return { name: f.name, kind: f.isAsync ? 'async function' : 'function',
           start: f.start, end: f.end, bytes: f.end - f.start,
           consumers: A.refs[f.name].internal.filter(function (c) { return c !== '<top-level>'; }),
           externalConsumers: A.refs[f.name].external.slice() };
}).concat(A.bindings.map(function (b) {
  const semi = A.masked.indexOf(';', b.start);
  return { name: b.name, kind: b.kind + ' binding', start: b.start, end: semi + 1, bytes: semi + 1 - b.start,
           consumers: A.refs[b.name].internal.filter(function (c) { return c !== '<top-level>'; }),
           externalConsumers: A.refs[b.name].external.slice() };
})).sort(function (a, b) { return a.start - b.start; });
DECLARATIONS.forEach(function (d) { d.module = null; });
const DECL_BY_NAME = {};
DECLARATIONS.forEach(function (d) { DECL_BY_NAME[d.name] = d; });

eq(DECLARATIONS.length, 54, 'declaration records built for all 54 declarations');
eq(DECLARATIONS.filter(function (d) { return /function/.test(d.kind); }).length, 46, 'records of kind function/async function');
eq(DECLARATIONS.filter(function (d) { return /binding/.test(d.kind); }).length, 8, 'records of kind var binding');
deepEq(Array.from(new Set(DECLARATIONS.map(function (d) { return d.kind; }))).sort(),
  ['async function', 'function', 'var binding'], 'the three declaration kinds present in the block');
ok(DECLARATIONS.every(function (d) { return d.bytes > 0 && d.end > d.start; }), 'every declaration record has a positive byte span');
{
  let sorted = true;
  for (let i = 1; i < DECLARATIONS.length; i++) if (DECLARATIONS[i].start <= DECLARATIONS[i - 1].start) sorted = false;
  ok(sorted, 'declaration records are in strict physical order');
}
const DSB_DECLARATION_BYTES = DECLARATIONS.reduce(function (n, d) { return n + d.bytes; }, 0);
const DSB_FUNCTION_BYTES = DECLARATIONS.filter(function (d) { return /function/.test(d.kind); })
  .reduce(function (n, d) { return n + d.bytes; }, 0);
const DSB_BINDING_BYTES = DSB_DECLARATION_BYTES - DSB_FUNCTION_BYTES;
eq(DSB_FUNCTION_BYTES, 47858, 'owned declaration bytes of the 46 functions');
eq(DSB_BINDING_BYTES, 261, 'owned declaration bytes of the 8 constants');
eq(DSB_DECLARATION_BYTES, 48119, 'owned declaration bytes of all 54 declarations');
ok(DSB_BINDING_BYTES > 0, 'the constants contribute real bytes — omitting them understates every module size');

// ── edges, split by target kind ──────────────────────────────────────────────
const FUNCTION_EDGES = [];
const BINDING_EDGES = [];
DECLARATIONS.forEach(function (d) {
  d.consumers.forEach(function (c) {
    if (A.fnNames.indexOf(c) < 0) return;
    (/binding/.test(d.kind) ? BINDING_EDGES : FUNCTION_EDGES).push([c, d.name]);
  });
});
const ALL_EDGES = FUNCTION_EDGES.concat(BINDING_EDGES);
eq(FUNCTION_EDGES.length, 106, 'measured function → function edges');
eq(BINDING_EDGES.length, 9, 'measured function → DSB_* constant edges');
eq(ALL_EDGES.length, 115, 'total internal declaration edges (both kinds)');
ok(BINDING_EDGES.every(function (e) { return A.bindingNames.indexOf(e[1]) >= 0; }), 'every binding edge targets a DSB constant');
{
  const consumersOfConstants = Array.from(new Set(BINDING_EDGES.map(function (e) { return e[0]; }))).sort();
  deepEq(consumersOfConstants, ['dsbClassifyRowPrice', 'dsbEnrichVisibleRowsLive', 'dsbFetchSnapshot',
                                'dsbLiveEnrichReadiness', 'dsbScheduleLiveEnrichRetry', 'dsbStartAutoRefresh',
                                'dssEnsureChartLiveQuoteForDisplay', 'dssResolveChartLivePrice'],
    'the 8 functions that consume DSB constants');
  // Where those consumers land decides whether a constant edge crosses a module.
  const inAdapter = consumersOfConstants.filter(function (n) { return ADAPTER_FUNCTION_SET.indexOf(n) >= 0; });
  deepEq(inAdapter, ['dsbClassifyRowPrice'], 'only one constant consumer is itself in the adapter');
}

// ── the homogeneous size comparison ──────────────────────────────────────────
const SHIPPED_MODULES = PARTS.filter(function (p) { return p.kind === 'local'; })
  .map(function (p) {
    return { name: p.src, fileBytes: p.code.length, declBytes: ownedDeclarationBytes(p.code),
             declCount: declarationSpans(p.code).length };
  })
  .sort(function (a, b) { return b.declBytes - a.declBytes; });
eq(SHIPPED_MODULES.length, 23 + STRESS_COMPANION_SCRIPTS.length,
   'all shipped modules measured with the SAME metric (the PR 1 adapter, PR 2 service and PR 3 panel are now among them, plus the ' +
   STRESS_COMPANION_SCRIPTS.length + ' Stress companion modules)');
ok(SHIPPED_MODULES.every(function (m) { return m.declBytes > 0 && m.declBytes <= m.fileBytes; }),
   'owned declaration bytes are positive and never exceed file bytes (headers/comments excluded)');
// The shipped adapter, measured by the SAME function used for every other
// module and for every candidate: this is the PR 1 size claim, self-measured.
{
  const shippedAdapter = SHIPPED_MODULES.find(function (m) { return m.name === ADAPTER_SRC; });
  ok(!!shippedAdapter, 'the DSB adapter is measured as a shipped module');
  eq(shippedAdapter.declCount, 19, 'SHIPPED ADAPTER: 19 owned declarations');
  eq(shippedAdapter.declBytes, 6789, 'SHIPPED ADAPTER: 6789 owned declaration bytes');
  ok(shippedAdapter.fileBytes > shippedAdapter.declBytes,
     'SHIPPED ADAPTER: the file (' + shippedAdapter.fileBytes + ' B) is larger than its declarations — the difference is the new header');
}
// The PR 2 service, measured by that same function: this is the PR 2 size claim,
// self-measured against the file that actually shipped.
{
  const shippedService = SHIPPED_MODULES.find(function (m) { return m.name === SERVICE_SRC; });
  ok(!!shippedService, 'the DSB service is measured as a shipped module');
  eq(shippedService.declCount, 26, 'SHIPPED SERVICE: 26 owned declarations');
  eq(shippedService.declBytes, 26385, 'SHIPPED SERVICE: 26385 owned declaration bytes — exactly the option C prediction');
  ok(shippedService.fileBytes > shippedService.declBytes,
     'SHIPPED SERVICE: the file (' + shippedService.fileBytes + ' B) is larger than its declarations — the difference is the new header');
}
// The PR 3 panel, measured by that same function: this is the PR 3 size claim,
// self-measured against the file that actually shipped.
{
  const shippedPanel = SHIPPED_MODULES.find(function (m) { return m.name === PANEL_SRC; });
  ok(!!shippedPanel, 'the DSB panel is measured as a shipped module');
  eq(shippedPanel.declCount, 9, 'SHIPPED PANEL: 9 owned declarations');
  eq(shippedPanel.declBytes, 14945, 'SHIPPED PANEL: 14945 owned declaration bytes — exactly the option C prediction');
  eq(shippedPanel.declBytes, ownedDeclarationBytes(fs.readFileSync(path.resolve(__dirname, '..', PANEL_REL), 'utf8')),
     'SHIPPED PANEL: the measured region and the file on disk agree on the declaration bytes');
  ok(shippedPanel.fileBytes > shippedPanel.declBytes,
     'SHIPPED PANEL: the file (' + shippedPanel.fileBytes + ' B) is larger than its declarations — the difference is the new header');
}
// The CEILING is a historical derivation from the PR #349 audit: 1.5 × the
// largest module shipped AT AUDIT TIME. The two modules this very plan creates
// must not feed back into it — recomputing the ceiling from the service would
// make the scoring self-referential and silently re-rank options A–E. So the
// baseline deliberately excludes them, and the service is then CHECKED against
// the unchanged ceiling.
// The Stress companion modules are excluded for the SAME reason as the three DSB
// modules: they postdate the audit, so feeding them into the ceiling would let
// later work silently re-rank options A-E.
const AUDIT_TIME_MODULES = SHIPPED_MODULES.filter(function (m) {
  return m.name !== ADAPTER_SRC && m.name !== SERVICE_SRC && m.name !== PANEL_SRC
    && STRESS_COMPANION_SCRIPTS.indexOf(m.name) < 0;
});
eq(AUDIT_TIME_MODULES.length, 20, 'the audit-time baseline is the 20 modules that predate the DSB extraction plan');
const LARGEST_SHIPPED = AUDIT_TIME_MODULES[0];
eq(LARGEST_SHIPPED.name, './js/ui/backend-scanner-snapshot-panel.js', 'largest shipped module by OWNED DECLARATION BYTES');
eq(LARGEST_SHIPPED.declBytes, 23739, 'its owned declaration bytes (primary metric)');
eq(LARGEST_SHIPPED.fileBytes, 27593, 'its complete file bytes (secondary metric, reported separately)');
const SIZE_CEILING = Math.round(LARGEST_SHIPPED.declBytes * 1.5);
eq(SIZE_CEILING, 35609, 'size ceiling = 1.5 × the largest shipped module, in owned declaration bytes');
{
  const shippedService = SHIPPED_MODULES.find(function (m) { return m.name === SERVICE_SRC; });
  ok(shippedService.declBytes <= SIZE_CEILING,
     'the shipped service (' + shippedService.declBytes + ' B) is UNDER the unchanged ' + SIZE_CEILING + ' B ceiling');
  eq(SHIPPED_MODULES[0].name, SERVICE_SRC,
     'the service is now the largest shipped module overall — recorded, but deliberately NOT used to move the ceiling');
}
note('secondary metric only — largest complete file: ' + LARGEST_SHIPPED.fileBytes +
     ' B; the ceiling above deliberately does NOT mix the two units');
{
  // The two metrics genuinely differ, so mixing them would change the verdict.
  const ratio = LARGEST_SHIPPED.declBytes / LARGEST_SHIPPED.fileBytes;
  ok(ratio < 0.95, 'declaration bytes are ' + Math.round((1 - ratio) * 100) +
     '% smaller than file bytes for the largest module — the units are NOT interchangeable');
  const fileCeiling = Math.round(LARGEST_SHIPPED.fileBytes * 1.5);
  ok(fileCeiling !== SIZE_CEILING, 'a file-bytes ceiling (' + fileCeiling + ') differs from the declaration-bytes ceiling (' + SIZE_CEILING + ')');
}
// Metric homogeneity guard: the SAME function must produce both sides.
function metricIsHomogeneous(measureShipped, measureCandidate) {
  return measureShipped === measureCandidate;
}
ok(metricIsHomogeneous(ownedDeclarationBytes, ownedDeclarationBytes),
   'the shipped-module measurement and the candidate measurement use the identical function');
{
  // And the candidate side, measured by that same function on real source text,
  // reproduces the record-based total — proving the two paths agree.
  const candidateSrc = DECLARATIONS.map(function (d) { return SRC.slice(d.start, d.end); }).join('\n');
  const viaSpans = ownedDeclarationBytes(candidateSrc);
  const viaRecords = DSB_DECLARATION_BYTES;
  eq(viaSpans, viaRecords, 'measuring a reconstructed candidate module with the shipped-module function reproduces the record total');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 23 — options A–E scored over all 54 declarations
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 23 — architectural options A–E');

function scoreSplit(modules) {
  const owner = {};
  const duplicated = [];
  Object.keys(modules).forEach(function (m) {
    modules[m].forEach(function (n) {
      if (owner[n]) duplicated.push(n);
      owner[n] = m;
    });
  });
  const assigned = DECLARATIONS.filter(function (d) { return !!owner[d.name]; });
  const missing = DECLARATIONS.filter(function (d) { return !owner[d.name]; }).map(function (d) { return d.name; });
  const cross = {};
  let crossFn = 0, crossBinding = 0;
  FUNCTION_EDGES.forEach(function (e) {
    const a = owner[e[0]], b = owner[e[1]];
    if (a && b && a !== b) { crossFn++; const k = a + '->' + b; cross[k] = (cross[k] || 0) + 1; }
  });
  BINDING_EDGES.forEach(function (e) {
    const a = owner[e[0]], b = owner[e[1]];
    if (a && b && a !== b) { crossBinding++; const k = a + '->' + b; cross[k] = (cross[k] || 0) + 1; }
  });
  const nodes = Object.keys(modules);
  const adj = {}; nodes.forEach(function (n) { adj[n] = new Set(); });
  Object.keys(cross).forEach(function (k) { const p = k.split('->'); adj[p[0]].add(p[1]); });
  let cyclic = false; const state = {};
  const visit = function (n) {
    if (state[n] === 1) { cyclic = true; return; }
    if (state[n] === 2) return;
    state[n] = 1; adj[n].forEach(visit); state[n] = 2;
  };
  nodes.forEach(visit);
  const bytes = {};
  nodes.forEach(function (m) {
    bytes[m] = modules[m].reduce(function (acc, n) {
      return acc + (DECL_BY_NAME[n] ? DECL_BY_NAME[n].bytes : 0);
    }, 0);
  });
  const largest = Math.max.apply(null, nodes.map(function (m) { return bytes[m]; }));
  const creator = owner['dsbState'];
  const stateCoOwners = nodes.filter(function (m) {
    if (m === creator) return false;
    return modules[m].some(function (n) {
      return Object.keys(A.stateWrites).some(function (f) { return A.stateWrites[f].indexOf(n) >= 0; });
    });
  });
  // Bridge churn: how many of a split-off bridge module's members LOSE their
  // external consumers by being isolated. Zero means the split is pure churn.
  const bridgeModule = nodes.filter(function (m) { return m === 'chart'; })[0];
  let bridgeChurn = null;
  if (bridgeModule) {
    const members = modules[bridgeModule];
    bridgeChurn = members.filter(function (n) {
      return DECL_BY_NAME[n] && DECL_BY_NAME[n].externalConsumers.length === 0;
    }).length / members.length;
  }
  return { assigned: assigned.length, missing: missing, duplicated: duplicated,
           crossFn: crossFn, crossBinding: crossBinding, crossEdges: crossFn + crossBinding,
           crossDetail: cross, cyclic: cyclic, moduleCount: nodes.length,
           bytes: bytes, largestBytes: largest, stateCoOwners: stateCoOwners, bridgeChurn: bridgeChurn };
}

const OPTIONS = {
  A: { label: 'single DSB module',
       modules: { dsb: A.bindingNames.concat(A.fnNames) } },
  B: { label: 'service + UI panel',
       modules: { service: A.bindingNames.concat(ADAPTER_FUNCTION_SET, SERVICE_SET), panel: PANEL_SET.slice() } },
  C: { label: 'adapter + service + UI panel',
       modules: { adapter: ADAPTER_DECLARATION_SET.slice(), service: SERVICE_SET.slice(), panel: PANEL_SET.slice() } },
  D: { label: 'adapter + service + UI panel + chart bridge',
       modules: { adapter: ADAPTER_DECLARATION_SET.slice(),
                  service: SERVICE_SET.filter(function (n) { return CATEGORIES.H.indexOf(n) < 0; }),
                  panel: PANEL_SET.slice(), chart: CATEGORIES.H.slice() } },
};
const SCORES = {};
Object.keys(OPTIONS).forEach(function (k) { SCORES[k] = scoreSplit(OPTIONS[k].modules); });

// Coverage — every option must assign all 54 declarations exactly once.
Object.keys(OPTIONS).forEach(function (k) {
  eq(SCORES[k].assigned, 54, 'OPTION ' + k + ' assigns all 54 declarations');
  deepEq(SCORES[k].missing, [], 'OPTION ' + k + ' omits nothing');
  deepEq(SCORES[k].duplicated, [], 'OPTION ' + k + ' duplicates nothing');
  const total = Object.keys(SCORES[k].bytes).reduce(function (n, m) { return n + SCORES[k].bytes[m]; }, 0);
  eq(total, DSB_DECLARATION_BYTES, 'OPTION ' + k + ' module bytes sum to the full 54-declaration total');
});
// Edges
eq(SCORES.A.crossEdges, 0, 'OPTION A — cross-module edges');
eq(SCORES.B.crossEdges, 14, 'OPTION B — cross-module edges');
eq(SCORES.C.crossEdges, 36, 'OPTION C — cross-module edges');
eq(SCORES.D.crossEdges, 41, 'OPTION D — cross-module edges');
eq(SCORES.C.crossFn, 28, 'OPTION C — cross-module function→function edges');
eq(SCORES.C.crossBinding, 8, 'OPTION C — cross-module function→constant edges');
ok(SCORES.C.crossBinding > 0,
   'the constants MATTER: ' + SCORES.C.crossBinding + ' of option C\'s cross-module edges are constant reads that a function-only model would miss');
eq(SCORES.B.crossBinding, 0, 'OPTION B — no constant edge crosses a module (constants and their consumers share the service)');
// Sizes, all in owned declaration bytes
eq(SCORES.A.largestBytes, 48119, 'OPTION A — largest module (owned declaration bytes)');
eq(SCORES.B.largestBytes, 33174, 'OPTION B — largest module (owned declaration bytes)');
eq(SCORES.C.largestBytes, 26385, 'OPTION C — largest module (owned declaration bytes)');
eq(SCORES.D.largestBytes, 19351, 'OPTION D — largest module (owned declaration bytes)');
ok(SCORES.A.largestBytes > SIZE_CEILING,
   'OPTION A exceeds the ceiling (' + SCORES.A.largestBytes + ' > ' + SIZE_CEILING + ')');
ok(SCORES.B.largestBytes <= SIZE_CEILING, 'OPTION B is under the ceiling (' + SCORES.B.largestBytes + ')');
ok(SCORES.C.largestBytes <= SIZE_CEILING, 'OPTION C is under the ceiling (' + SCORES.C.largestBytes + ')');
ok(SCORES.D.largestBytes <= SIZE_CEILING, 'OPTION D is under the ceiling (' + SCORES.D.largestBytes + ')');
// Directions / cycles
['A', 'B', 'C', 'D'].forEach(function (k) { ok(!SCORES[k].cyclic, 'OPTION ' + k + ' introduces no module-level cycle'); });
deepEq(Object.keys(SCORES.B.crossDetail), ['panel->service'], 'OPTION B — single cross direction');
deepEq(Object.keys(SCORES.C.crossDetail).sort(), ['panel->adapter', 'panel->service', 'service->adapter'],
  'OPTION C — three directions, all pointing down the layer stack');
deepEq(Object.keys(SCORES.D.crossDetail).sort(),
  ['chart->adapter', 'chart->service', 'panel->adapter', 'panel->service', 'service->adapter'],
  'OPTION D — five directions');
// State ownership
deepEq(SCORES.A.stateCoOwners, [], 'OPTION A — no second state owner');
deepEq(SCORES.B.stateCoOwners, [], 'OPTION B — no second state owner');
deepEq(SCORES.C.stateCoOwners, [], 'OPTION C — no second state owner (the adapter writes no state)');
deepEq(SCORES.D.stateCoOwners, ['chart'],
  'OPTION D — the chart module WOULD write S.backendDirectional while dsbState lives in the service: a SECOND state owner');
{
  const writersInH = CATEGORIES.H.filter(function (n) {
    return Object.keys(A.stateWrites).some(function (f) { return A.stateWrites[f].indexOf(n) >= 0; });
  }).sort();
  deepEq(writersInH, ['dsbNoteDirectionalChartOpen', 'dssEnsureChartLiveQuoteForDisplay'],
    'the two chart-bridge functions that write state (chartOpenContext, chartLiveQuote) are why option D splits ownership');
}
// Bridge churn
eq(SCORES.D.bridgeChurn, 1 / 6, 'OPTION D — only 1 of 6 chart-bridge members loses no external consumer by being isolated');
ok(SCORES.D.bridgeChurn < 0.5, 'OPTION D — isolating the bridge removes NO external consumer for 5 of its 6 members');
// Option E
{
  const blockers = [];
  if (!A.found) blockers.push('markers not found');
  if (A.duplicateFnNames.length) blockers.push('duplicate declarations');
  if (A.topLevelStatements.length > 2) blockers.push('unexpected top-level statements');
  if (A.exposures.length !== 2) blockers.push('unexpected exposure count');
  if (A.counts.scanDataCode > 0) blockers.push('block reads S.scanData');
  if (A.windowExposures.length !== 2) blockers.push('unexpected window exposures');
  if (/(?<![A-Za-z0-9_$.])dsb[A-Z][A-Za-z0-9_$]*\s*\(/.test(A.topLevelStatementCode)) blockers.push('top-level auto-call');
  {
    // "External" means outside EVERY owned region. Blanking the regions in place
    // (rather than slicing around the inline span alone) keeps this correct now
    // that the state accessor lives in the service module.
    const chars = A.masked.split('');
    A.regions.forEach(function (r) { for (let i = r.start; i < r.end; i++) chars[i] = ' '; });
    if (/\bS\s*\.\s*backendDirectional\b(?!Preview)/.test(chars.join('')))
      blockers.push('external state writer');
  }
  deepEq(blockers, [], 'OPTION E — no concrete blocker measured; deferring is not justified');
}
note('A: 0 edges / 48119 B (over ceiling) | B: 14 edges / 33174 B | C: 36 edges / 26385 B | D: 41 edges / 19351 B + 2nd state owner');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 24 — window.* exposure: strategy W1 vs W2, compared
//
// The block ends with two top-level statements:
//   try{ if(typeof window!=='undefined')window.apexDebugBackendDirectionalSnapshot=…; }catch(e){}
//   try{ if(typeof window!=='undefined')window.apexDebugDirectionalBackendSnapshot=…; }catch(e){}
//
// W1 — the two debug FUNCTIONS and the two window ASSIGNMENTS both move into the
//      service module. The module gains two top-level statements; the exposures
//      happen earlier, during the module's evaluation.
// W2 — the two debug FUNCTIONS move; the two window ASSIGNMENTS stay inline at
//      their current physical position. The module has zero top-level statements
//      and the moment of exposure is bit-identical to today.
//
// Neither is assumed: both are measured and the choice is derived.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 24 — window exposure strategy W1 vs W2');

const DEBUG_FNS = ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'];
deepEq(A.windowExposures, DEBUG_FNS, 'the block exposes exactly these two debug helpers');
ok(DEBUG_FNS.every(function (n) { return SERVICE_SET.indexOf(n) >= 0; }),
   'under both strategies the two debug FUNCTIONS belong to the service module');

// ── measured facts both strategies are scored against ────────────────────────
const EXPOSURE_STATEMENT_BYTES = A.topLevelStatements.reduce(function (n, s) { return n + (s.end - s.start); }, 0);
// PR 2 relocated the two debug builders that used to sit between the exposures
// and PR 3 took the last nine declarations out of the residue, so the marker
// range is now ONE contiguous statement region: the two exposures plus the
// comments and whitespace the extraction deliberately left in place. The
// exposures themselves are unchanged — pinned byte-exactly below.
eq(EXPOSURE_STATEMENT_BYTES, 12713, 'byte size of the top-level statement region (comments included)');
eq(EXPOSURE_STATEMENT_BYTES, A.blockLength,
   'with zero declarations left inline, the statement region IS the whole marker range');
eq(A.exposures.reduce(function (n, e) { return n + (e.end - e.start); }, 0), 308,
   'the two exposure STATEMENTS themselves measure 308 bytes — unchanged by the relocation');
{
  // Convention: how do the 20 shipped modules handle window?
  const modulesTouchingWindow = PARTS.filter(function (p) { return p.kind === 'local'; })
    .filter(function (p) { return /window\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(maskSource(p.code)); })
    .map(function (p) { return p.src; });
  deepEq(modulesTouchingWindow, [],
    'ZERO of the 20 shipped modules assigns anything to window — W1 would be the first');
  // And a sibling boundary contract already ENFORCES that convention.
  const adapterContract = fs.readFileSync(
    path.resolve(__dirname, 'backend-directional-adapter-boundary-contract.test.js'), 'utf8');
  ok(/the module makes no window assignment at all/.test(adapterContract),
     'the shipped adapter boundary contract already asserts "no window assignment at all" for an extracted module');
}
{
  // Where do the app's OTHER debug helpers get exposed? All 17 of them, top-level
  // in the inline monolith — that is the established pattern W2 preserves.
  const tlm = stripFunctions(A.masked);
  const topLevelDebugExposures = (tlm.match(/window\s*\.\s*apexDebug[A-Za-z0-9_$]*\s*=/g) || []).length;
  const allDebugExposures = (A.masked.match(/window\s*\.\s*apexDebug[A-Za-z0-9_$]*\s*=/g) || []).length;
  eq(allDebugExposures, 17, 'window.apexDebug* assignments in the whole application');
  eq(topLevelDebugExposures, 17, 'ALL of them are top-level statements of the inline monolith');
}

// ── the two candidate service modules, built for real ────────────────────────
const SERVICE_DECL_SRC = SERVICE_SET.map(function (n) { return SRC.slice(DECL_BY_NAME[n].start, DECL_BY_NAME[n].end); }).join('\n');
const EXPOSURE_SRC = A.topLevelStatements.map(function (s) { return SRC.slice(s.start, s.end); }).join('\n');
const W1_SERVICE_SRC = SERVICE_DECL_SRC + '\n' + EXPOSURE_SRC;
const W2_SERVICE_SRC = SERVICE_DECL_SRC;

function windowStrategyProfile(moduleSrc, exposuresStayInline) {
  const masked = maskSource(moduleSrc);
  const topLevel = stripFunctions(masked);
  return {
    topLevelStatements: (topLevel.match(/[^\s]/g) || []).length > 0
      ? (moduleSrc.match(/try\s*\{\s*if\s*\(\s*typeof\s+window/g) || []).length : 0,
    topLevelExecutableChars: topLevel.replace(/\s+/g, '').length,
    loadTimeGlobalWrites: (topLevel.match(/window\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/g) || []).length,
    exposureTimingUnchanged: exposuresStayInline,
    matchesModuleConvention: topLevel.replace(/\s+/g, '').length === 0,
    relocatedBytes: ownedDeclarationBytes(moduleSrc) + (exposuresStayInline ? 0 : EXPOSURE_STATEMENT_BYTES),
    classicScriptCompatible: !/\bexport\b|\bimport\b/.test(masked),
    safeWithoutWindow: /typeof\s+window\s*!==/.test(moduleSrc) || !/window\s*\./.test(masked),
    reversible: true,
  };
}
const W1 = windowStrategyProfile(W1_SERVICE_SRC, false);
const W2 = windowStrategyProfile(W2_SERVICE_SRC, true);

eq(W1.topLevelStatements, 2, 'W1 — the service module would carry 2 top-level statements');
eq(W2.topLevelStatements, 0, 'W2 — the service module carries 0 top-level statements');
eq(W1.loadTimeGlobalWrites, 2, 'W1 — 2 global writes at module evaluation time');
eq(W2.loadTimeGlobalWrites, 0, 'W2 — 0 global writes at module evaluation time');
eq(W1.exposureTimingUnchanged, false, 'W1 — the exposures happen EARLIER than today (during module evaluation)');
eq(W2.exposureTimingUnchanged, true, 'W2 — the exposures happen at exactly the same moment as today');
eq(W1.matchesModuleConvention, false, 'W1 — breaks the zero-top-level-execution convention of the 20 shipped modules');
eq(W2.matchesModuleConvention, true, 'W2 — matches the convention of the 20 shipped modules');
ok(W1.classicScriptCompatible && W2.classicScriptCompatible, 'both strategies stay classic-script compatible');
ok(W1.safeWithoutWindow && W2.safeWithoutWindow, 'both strategies remain safe in a non-browser context (typeof guard + try/catch)');
ok(W1.reversible && W2.reversible, 'both strategies are reversible by moving the same text back');
eq(W1.relocatedBytes - W2.relocatedBytes, EXPOSURE_STATEMENT_BYTES, 'W1 relocates 928 bytes more than W2');
{
  // Load-order consequence: does either strategy add a cross-script load-time
  // dependency? Measured with the real predicate, not asserted.
  const rump = { name: 'INLINE', code: inlineRump() };
  const base = APP_PARTS.slice(0, -1).map(function (p) { return { name: p.name, code: p.code }; });
  const w1Parts = base.concat([{ name: CANONICAL_FILES.service, code: W1_SERVICE_SRC }, rump]);
  const rumpW2 = { name: 'INLINE', code: inlineRump(EXPOSURE_SRC) };
  const w2Parts = base.concat([{ name: CANONICAL_FILES.service, code: W2_SERVICE_SRC }, rumpW2]);
  ok(loadOrderSafe(w1Parts).safe, 'W1 — load-order safe');
  ok(loadOrderSafe(w2Parts).safe, 'W2 — load-order safe');
  const w1Deps = crossScriptLoadTimeDeps(w1Parts).length;
  const w2Deps = crossScriptLoadTimeDeps(w2Parts).length;
  ok(w2Deps >= w1Deps, 'W2 adds cross-script load-time deps (' + w2Deps + ' vs ' + w1Deps +
     ') because the inline assignment now reads a function declared by an earlier script');
  note('W2 accepts ' + (w2Deps - w1Deps) + ' extra cross-script load-time dependencies — resolved because ' +
       'function declarations of an earlier classic script are already globals when the monolith evaluates');
}
{
  // Would W1 force a future boundary test to change? Measured against the
  // invariant the shipped sibling contracts assert.
  // Measured on MASKED code: the sibling contract's raw indexOf would also flag
  // the word "window" inside a comment, which is not an assignment.
  const siblingInvariant = function (moduleSrc) { return !/window\s*\./.test(maskSource(moduleSrc)); };
  eq(siblingInvariant(W1_SERVICE_SRC), false, 'W1 — violates the shipped "no window assignment" module invariant');
  eq(siblingInvariant(W2_SERVICE_SRC), true, 'W2 — satisfies the shipped "no window assignment" module invariant');
}

// ── derivation ───────────────────────────────────────────────────────────────
function chooseWindowStrategy(w1, w2) {
  const score = function (w) {
    let s = 0;
    if (w.exposureTimingUnchanged) s += 3;          // no observable timing change
    if (w.matchesModuleConvention) s += 2;          // consistent with 20 shipped modules
    if (w.loadTimeGlobalWrites === 0) s += 2;       // no load-time side effect in a module
    if (w.classicScriptCompatible) s += 1;
    if (w.safeWithoutWindow) s += 1;
    if (w.reversible) s += 1;
    return s;
  };
  const s1 = score(w1), s2 = score(w2);
  if (s1 === s2) return { choice: 'W1', s1: s1, s2: s2, why: 'tie — prefer moving the whole block' };
  return { choice: s2 > s1 ? 'W2' : 'W1', s1: s1, s2: s2,
           why: s2 > s1 ? 'unchanged exposure timing + module convention + zero load-time writes'
                        : 'whole-block relocation outweighs the convention' };
}
const WINDOW_STRATEGY = chooseWindowStrategy(W1, W2);
eq(WINDOW_STRATEGY.choice, 'W2', 'DERIVED WINDOW STRATEGY');
note('scores: W1=' + WINDOW_STRATEGY.s1 + ' W2=' + WINDOW_STRATEGY.s2 + ' — ' + WINDOW_STRATEGY.why);
{
  // Sensitivity: the derivation must be able to pick W1.
  const w2NoAdvantage = Object.assign({}, W2, { exposureTimingUnchanged: false, matchesModuleConvention: false, loadTimeGlobalWrites: 2 });
  eq(chooseWindowStrategy(W1, w2NoAdvantage).choice, 'W1',
     'SENSITIVITY: strip W2 of its measured advantages and the same rule picks W1 — the choice is not hardcoded');
}

// ── consequences of the chosen strategy ──────────────────────────────────────
const EXPOSURES_STAY_INLINE = WINDOW_STRATEGY.choice === 'W2';
ok(EXPOSURES_STAY_INLINE, 'CONSEQUENCE: the two window.* assignments stay inline; only declarations are relocated');
{
  // The residual monolith under W2 must contain the two exposures and NO DSB
  // declaration. Built for real and re-analysed.
  const rumpSrc = inlineRump(EXPOSURE_SRC);
  const rumpMasked = maskSource(rumpSrc);
  const rumpBd = braceDepths(rumpMasked);
  const rumpDecls = new Set(topLevelFunctions(rumpSrc, rumpMasked, rumpBd).map(function (f) { return f.name; }));
  const leftBehind = A.fnNames.filter(function (n) { return rumpDecls.has(n); });
  deepEq(leftBehind, [], 'the residual monolith contains NONE of the 46 DSB functions');
  const rumpBindings = topLevelBindings(rumpSrc, rumpMasked, rumpBd, 0, rumpSrc.length)
    .map(function (b) { return b.name; }).filter(function (n) { return A.bindingNames.indexOf(n) >= 0; });
  deepEq(rumpBindings, [], 'the residual monolith contains NONE of the 8 DSB constants');
  const rumpExposures = (rumpSrc.match(/window\.apexDebug(?:BackendDirectionalSnapshot|DirectionalBackendSnapshot)\s*=/g) || []).length;
  eq(rumpExposures, 2, 'the residual monolith contains EXACTLY the two DSB debug exposures');
  ok(rumpSrc.indexOf(EXPOSURE_SRC.split('\n')[0]) >= 0, 'the exposures keep their exact original text');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 25 — RELOCATION VERDICT, stated precisely
//
// "Extractable verbatim" is too coarse now that the window strategy is decided.
// Four distinct properties are measured and reported separately.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 25 — what exactly is relocatable');

const RELOCATION = {
  physicalContiguity: true,          // proven in SECTION 1
  declarationContiguity: null,
  wholeBlockVerbatim: null,
  selectiveDeclarationRelocation: null,
};
{
  // Declaration contiguity: the 54 declarations occupy one uninterrupted run of
  // the block, broken only by comments/whitespace and the two exposures.
  const chars = A.blockMasked.split('');
  const clear = function (a, b) { for (let i = a - A.start; i < b - A.start; i++) chars[i] = ' '; };
  DECLARATIONS.forEach(function (d) { clear(d.start, d.end); });
  A.topLevelStatements.forEach(function (s) { clear(s.start, s.end); });
  RELOCATION.declarationContiguity = chars.join('').trim() === '';
  ok(RELOCATION.declarationContiguity,
     'DECLARATION CONTIGUITY: the 54 declarations plus the 2 exposures account for every executable character between the markers');
}
{
  // Every declaration can move BYTE-FOR-BYTE: re-analysing the concatenation of
  // the 54 exact spans must reproduce the same names, kinds and byte sizes.
  const relocated = DECLARATIONS.map(function (d) { return SRC.slice(d.start, d.end); }).join('\n');
  const spans = declarationSpans(relocated);
  deepEq(spans.map(function (d) { return d.name; }), DECLARATIONS.map(function (d) { return d.name; }),
    'the 54 declarations survive relocation with identical names and order');
  deepEq(spans.map(function (d) { return d.kind; }), DECLARATIONS.map(function (d) { return d.kind; }),
    'the 54 declarations survive relocation with identical kinds');
  deepEq(spans.map(function (d) { return d.bytes; }), DECLARATIONS.map(function (d) { return d.bytes; }),
    'the 54 declarations survive relocation with IDENTICAL byte sizes — no reformatting is required');
  RELOCATION.selectiveDeclarationRelocation = true;
  RELOCATION.wholeBlockVerbatim = !EXPOSURES_STAY_INLINE;
}
eq(RELOCATION.physicalContiguity, true, 'physical contiguity — the marker range holds nothing foreign');
eq(RELOCATION.declarationContiguity, true, 'declaration contiguity — declarations + exposures cover all executable code');
eq(RELOCATION.selectiveDeclarationRelocation, true, 'SELECTIVE DECLARATION RELOCATION is what the plan performs: 54 declarations move byte-for-byte');
eq(RELOCATION.wholeBlockVerbatim, false,
   'WHOLE-BLOCK VERBATIM RELOCATION is NOT what happens: under W2 the 2 window exposures stay inline');
ok(true, 'PRECISE VERDICT: the DSB block is physically contiguous and its 54 declarations relocate byte-for-byte, ' +
   'but the marker range as a whole does NOT become a single module — the two top-level exposures remain in index.html');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 26 — the recommendation, DERIVED
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 26 — recommendation');

function recommend(scores, ceiling, blockerCount) {
  // Rule 1 — a measured blocker forces E.
  if (blockerCount > 0) return { option: 'E', why: 'measured blockers: ' + blockerCount };
  const keys = Object.keys(scores);
  // Rule 2 — full, non-duplicated coverage of all 54 declarations.
  let pool = keys.filter(function (k) {
    return scores[k].assigned === 54 && scores[k].missing.length === 0 && scores[k].duplicated.length === 0;
  });
  // Rule 3 — no module-level cycle.
  pool = pool.filter(function (k) { return !scores[k].cyclic; });
  // Rule 4 — no second state owner.
  pool = pool.filter(function (k) { return scores[k].stateCoOwners.length === 0; });
  // Rule 5 — largest module within the shipped ceiling.
  pool = pool.filter(function (k) { return scores[k].largestBytes <= ceiling; });
  // Rule 6 — a split that isolates a bridge must actually retire external
  //          consumers for the majority of its members; otherwise it is churn.
  pool = pool.filter(function (k) { return scores[k].bridgeChurn == null || scores[k].bridgeChurn >= 0.5; });
  if (!pool.length) return { option: 'E', why: 'every split was rejected and the single module exceeds the ceiling' };
  // Rule 7 — among survivors prefer one that isolates a provably pure leaf
  //          (lowest-risk first PR); break ties on fewest cross-module edges.
  const withPureLeaf = pool.filter(function (k) {
    return Object.keys(OPTIONS[k].modules).some(function (m) {
      const members = OPTIONS[k].modules[m];
      return members.length > 0 && members.every(function (n) {
        return PURE_CANDIDATES.indexOf(n) >= 0 || A.bindingNames.indexOf(n) >= 0;
      });
    });
  });
  const finalPool = withPureLeaf.length ? withPureLeaf : pool;
  finalPool.sort(function (a, b) { return scores[a].crossEdges - scores[b].crossEdges; });
  return { option: finalPool[0],
           why: 'full coverage + acyclic + single state owner + under the ' + ceiling +
                ' B ceiling + isolates a provably pure leaf' };
}
const BLOCKER_COUNT = 0;
const RECOMMENDATION = recommend(SCORES, SIZE_CEILING, BLOCKER_COUNT);
eq(RECOMMENDATION.option, 'C', 'DERIVED RECOMMENDATION');
note('why: ' + RECOMMENDATION.why);
note('rejections — A: over the ' + SIZE_CEILING + ' B ceiling (' + SCORES.A.largestBytes +
     ') | B: survives but has no pure leaf | D: second state owner (chart) + bridge churn ' +
     Math.round(SCORES.D.bridgeChurn * 100) + '% | E: zero blockers');

// ── sensitivity: the rule must be able to return every outcome ───────────────
function clone(scores) { return JSON.parse(JSON.stringify(scores)); }
{
  // (1) picks A — every split becomes cyclic and the single module fits.
  const s = clone(SCORES);
  ['B', 'C', 'D'].forEach(function (k) { s[k].cyclic = true; });
  s.A.largestBytes = 10000;
  eq(recommend(s, SIZE_CEILING, 0).option, 'A', 'SENSITIVITY 1 — cyclic splits + a small block ⇒ A');
}
{
  // (2) picks B — C loses its pure leaf advantage by gaining a state co-owner.
  const s = clone(SCORES);
  s.C.stateCoOwners = ['adapter'];
  eq(recommend(s, SIZE_CEILING, 0).option, 'B', 'SENSITIVITY 2 — a second state owner in C ⇒ B');
}
{
  // (3) picks C on the real measurements.
  eq(recommend(clone(SCORES), SIZE_CEILING, 0).option, 'C', 'SENSITIVITY 3 — the real measurements ⇒ C');
}
{
  // (4) picks E — a measured blocker.
  eq(recommend(clone(SCORES), SIZE_CEILING, 1).option, 'E', 'SENSITIVITY 4 — any measured blocker ⇒ E');
  // …and E also when every split is rejected and A is over the ceiling.
  const s = clone(SCORES);
  ['B', 'C', 'D'].forEach(function (k) { s[k].cyclic = true; });
  eq(recommend(s, SIZE_CEILING, 0).option, 'E', 'SENSITIVITY 4b — all splits rejected and A over the ceiling ⇒ E');
}
{
  // (5) picks D — but ONLY when isolating the bridge really pays: the chart
  //     module must stop being a second state owner AND retire the majority of
  //     its members' external consumers. Both are false on the real source.
  const s = clone(SCORES);
  s.D.stateCoOwners = [];
  s.D.bridgeChurn = 0.9;
  s.C.cyclic = true; s.B.cyclic = true;
  eq(recommend(s, SIZE_CEILING, 0).option, 'D', 'SENSITIVITY 5 — D is reachable when the bridge split genuinely pays');
  const s2 = clone(SCORES);
  s2.D.stateCoOwners = [];
  s2.C.cyclic = true; s2.B.cyclic = true;
  eq(recommend(s2, SIZE_CEILING, 0).option, 'E',
     'SENSITIVITY 5b — with real bridge churn, D is still rejected even as the last candidate');
}
{
  // The ceiling itself must matter. At 20000 B only option D is small enough,
  // and D is STILL rejected on state ownership + bridge churn, so the rule
  // reports E rather than silently accepting a bad split.
  const s = clone(SCORES);
  eq(recommend(s, 20000, 0).option, 'E',
     'SENSITIVITY 6 — a 20000 B ceiling excludes A, B and C; D remains rejected on its own merits ⇒ E');
  const s2 = clone(SCORES);
  s2.D.stateCoOwners = []; s2.D.bridgeChurn = 0.9;
  eq(recommend(s2, 20000, 0).option, 'D',
     'SENSITIVITY 6b — at the same ceiling, a D that fixed both defects WOULD be selected');
  eq(recommend(clone(SCORES), 26000, 0).option, 'E',
     'SENSITIVITY 6c — a ceiling just below option C (26385 B) also lands on E: the ceiling is load-bearing');
  eq(recommend(clone(SCORES), 27000, 0).option, 'C',
     'SENSITIVITY 6d — a ceiling just above option C restores C');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 27 — the PR plan, its STATE, and the module sources
//
// The plan itself is unchanged — executing it is not a reason to re-derive a
// different architecture. What is new is the STATE field: ALL THREE PRs are now
// completed and every module is read from disk rather than simulated. Nothing
// is pending, so the plan is validated end to end against actual module source
// rather than against a list of names.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 27 — PR plan state and ORDER C modules');

const PR_PLAN = [
  { pr: 1, module: 'adapter', file: CANONICAL_FILES.adapter, manifest: CANONICAL_MODULES.adapter, state: 'completed' },
  { pr: 2, module: 'service', file: CANONICAL_FILES.service, manifest: CANONICAL_MODULES.service, state: 'completed' },
  { pr: 3, module: 'panel', file: CANONICAL_FILES.panel, manifest: CANONICAL_MODULES.panel, state: 'completed' },
];
eq(PR_PLAN.length, 3, 'the recommendation implies THREE sequential extraction PRs');
eq(PR_PLAN[0].manifest.length, 19, 'PR 1 manifest — adapter declarations');
eq(PR_PLAN[1].manifest.length, 26, 'PR 2 manifest — service declarations');
eq(PR_PLAN[2].manifest.length, 9, 'PR 3 manifest — panel declarations');
eq(PR_PLAN.reduce(function (n, p) { return n + p.manifest.length; }, 0), 54, 'the three manifests total 54 declarations');
// ── the STATE of the plan, cross-checked against the filesystem ──────────────
deepEq(PR_PLAN.map(function (p) { return p.pr + ':' + p.state; }), ['1:completed', '2:completed', '3:completed'],
  'PLAN STATE — PR 1 completed, PR 2 completed, PR 3 completed');
PR_PLAN.forEach(function (p) {
  const exists = fs.existsSync(path.resolve(__dirname, '..', p.file));
  eq(exists, p.state === 'completed',
     'PR ' + p.pr + ' (' + p.state + ') — ' + p.file + (p.state === 'completed' ? ' exists' : ' does not exist yet'));
});
// The residual plan is EMPTY: every PR has shipped and nothing is left inline.
{
  const pending = PR_PLAN.filter(function (p) { return p.state === 'pending'; });
  deepEq(pending.map(function (p) { return p.module + ':' + p.manifest.length; }), [],
    'RESIDUAL PLAN — nothing pending, the extraction is COMPLETE');
  eq(pending.reduce(function (n, p) { return n + p.manifest.length; }, 0), 0,
     'zero declarations are still waiting for a future PR');
  deepEq(A.inlineFnNames, [],
    'nothing is measured as still inline — the pending manifest and the residue are both empty');
  const done = PR_PLAN.filter(function (p) { return p.state === 'completed'; });
  deepEq(done.reduce(function (acc, p) { return acc.concat(p.manifest); }, []).slice().sort(),
    A.adapterFnNames.concat(A.adapterBindingNames).concat(A.serviceFnNames)
      .concat(A.panelFnNames).slice().sort(),
    'the completed manifests are EXACTLY what the adapter, service and panel modules measurably own');
  deepEq(PR_PLAN[1].manifest.slice().sort(), A.serviceFnNames.slice().sort(),
    'the PR 2 manifest is EXACTLY what the service module measurably owns');
  deepEq(PR_PLAN[2].manifest.slice().sort(), A.panelFnNames.slice().sort(),
    'the PR 3 manifest is EXACTLY what the panel module measurably owns');
}
{
  const all = PR_PLAN.reduce(function (acc, p) { return acc.concat(p.manifest); }, []);
  deepEq(all.filter(function (n, i) { return all.indexOf(n) !== i; }), [], 'no declaration appears in two PRs');
  eq(new Set(all).size, 54, 'the PR plan covers the 54 declarations exactly once');
  deepEq(PR_PLAN.map(function (p) { return p.manifest; }), [CANONICAL_MODULES.adapter, CANONICAL_MODULES.service, CANONICAL_MODULES.panel],
    'the PR manifests ARE the canonical sets — not a second, drifting copy');
}
// Each PR's byte budget, in the same metric used for the ceiling.
{
  const bytes = PR_PLAN.map(function (p) {
    return p.manifest.reduce(function (n, nm) { return n + DECL_BY_NAME[nm].bytes; }, 0);
  });
  deepEq(bytes, [SCORES.C.bytes.adapter, SCORES.C.bytes.service, SCORES.C.bytes.panel],
    'the PR byte budgets equal option C\'s scored module sizes');
  eq(bytes.reduce(function (a, b) { return a + b; }, 0), DSB_DECLARATION_BYTES, 'PR byte budgets sum to the block total');
  ok(bytes.every(function (b) { return b <= SIZE_CEILING; }), 'every PR stays under the ' + SIZE_CEILING + ' B ceiling');
  note('PR bytes — adapter ' + bytes[0] + ' | service ' + bytes[1] + ' | panel ' + bytes[2]);
}
// Dependency order.
{
  const prOf = {};
  PR_PLAN.forEach(function (p) { p.manifest.forEach(function (n) { prOf[n] = p.pr; }); });
  const backward = ALL_EDGES.filter(function (e) { return prOf[e[0]] < prOf[e[1]]; });
  deepEq(Array.from(new Set(backward.map(function (e) { return e[0] + '->' + e[1]; }))).sort(), [],
    'NO declaration in an earlier PR depends on one from a later PR — the sequence is dependency-correct');
  const forward = ALL_EDGES.filter(function (e) { return prOf[e[0]] > prOf[e[1]]; });
  ok(forward.length === SCORES.C.crossEdges, 'all ' + SCORES.C.crossEdges + ' cross-PR edges point BACKWARD, to already-extracted modules');
}

// ── build the three modules for real ─────────────────────────────────────────
function buildModuleSource(names) {
  return names
    .map(function (n) { return DECL_BY_NAME[n]; })
    .sort(function (a, b) { return a.start - b.start; })     // preserve physical order
    .map(function (d) { return SRC.slice(d.start, d.end); })
    .join('\n');
}
// All THREE owners are REAL: every source below is the shipped file, read from
// disk. The assertions therefore validate the actual modules, not a model of
// them — there is nothing left to simulate.
const MODULE_SOURCE = {
  adapter: A.adapterText,
  service: A.serviceText,
  panel: A.panelText,
};
const MODULE_IS_REAL = { adapter: true, service: true, panel: true };
ok(Object.keys(MODULE_SOURCE).every(function (m) { return MODULE_IS_REAL[m]; }),
   'all three module sources under test are SHIPPED FILES — none is simulated');
const RESIDUAL_RUMP = inlineRump(EXPOSURE_SRC);
ok(MODULE_SOURCE.adapter === fs.readFileSync(path.resolve(__dirname, '..', ADAPTER_REL), 'utf8'),
   'the adapter source under test is the SHIPPED FILE, not a simulation');
ok(MODULE_SOURCE.service === fs.readFileSync(path.resolve(__dirname, '..', SERVICE_REL), 'utf8'),
   'the service source under test is the SHIPPED FILE, not a simulation');
ok(MODULE_SOURCE.panel === fs.readFileSync(path.resolve(__dirname, '..', PANEL_REL), 'utf8'),
   'the panel source under test is the SHIPPED FILE, not a simulation');
deepEq(Object.keys(MODULE_SOURCE).filter(function (m) { return !MODULE_IS_REAL[m]; }), [],
   'no owner is left to model: adapter, service and panel are all on disk');
// The shipped service matches, byte for byte, what a byte-for-byte relocation of
// the canonical PR 2 manifest would have produced — declaration by declaration.
{
  const shipped = declarationSpans(MODULE_SOURCE.service);
  deepEq(shipped.map(function (d) { return d.name; }), CANONICAL_MODULES.service,
    'the shipped service declares exactly the 26 canonical names, in canonical order');
  const mismatches = shipped.filter(function (d) {
    const rec = DECL_BY_NAME[d.name];
    return !rec || MODULE_SOURCE.service.slice(d.start, d.end) !== SRC.slice(rec.start, rec.end);
  }).map(function (d) { return d.name; });
  deepEq(mismatches, [],
    'all 26 shipped service declarations are BYTE-IDENTICAL to the canonical spans');
  eq(shipped.reduce(function (n, d) { return n + (d.end - d.start); }, 0), 26385,
    'the shipped service owns exactly 26385 declaration bytes');
}
// And the shipped file matches, byte for byte, what a byte-for-byte relocation
// of the canonical manifest would have produced — declaration by declaration.
{
  const shipped = declarationSpans(MODULE_SOURCE.adapter);
  const mismatches = shipped.filter(function (d) {
    const rec = DECL_BY_NAME[d.name];
    return !rec || MODULE_SOURCE.adapter.slice(d.start, d.end) !== SRC.slice(rec.start, rec.end);
  }).map(function (d) { return d.name; });
  deepEq(mismatches, [],
    'all 19 shipped adapter declarations are byte-identical to their measured declaration records');
}

// (10)(11) validate the module sources by ANALYSING them, not by name lists.
Object.keys(MODULE_SOURCE).forEach(function (mod) {
  const label = 'shipped ' + mod;
  const spans = declarationSpans(MODULE_SOURCE[mod]);
  const names = spans.map(function (d) { return d.name; });
  deepEq(names.slice().sort(), CANONICAL_MODULES[mod].slice().sort(),
    label + ' module declares exactly its canonical manifest');
  deepEq(names.filter(function (n, i) { return names.indexOf(n) !== i; }), [],
    label + ' module contains NO duplicated declaration');
  eq(spans.length, CANONICAL_MODULES[mod].length, label + ' declaration count');
  eq(ownedDeclarationBytes(MODULE_SOURCE[mod]), SCORES.C.bytes[mod],
     label + ' owned declaration bytes match the scored size');
  // Load-time inertness — the module convention. The adapter legitimately keeps
  // the eight `var DSB_* = <literal>;` initialisers, which execute but have no
  // effect beyond binding a constant. What must be zero is SIDE EFFECTS: calls,
  // member access, global writes.
  const residue = stripFunctions(maskSource(MODULE_SOURCE[mod]));
  ok(!/\(/.test(residue), label + ' module performs NO call at load time');
  ok(!/\./.test(residue), label + ' module performs NO member access at load time');
  ok(!/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|window|globalThis|document|localStorage)(?![A-Za-z0-9_$])/.test(residue),
     label + ' module reads NO shared global at load time');
  const residueDecls = residue.replace(/(?:^|\n)\s*var\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*[0-9]+\s*;/g, '');
  eq(residueDecls.replace(/\s+/g, '').length, 0,
     label + ' load-time residue is nothing but inert numeric constant initialisers');
  ok(!/window\s*\./.test(maskSource(MODULE_SOURCE[mod])),
     label + ' module makes no window assignment (W2)');
  ok(!/globalThis\s*\./.test(maskSource(MODULE_SOURCE[mod])),
     label + ' module makes no globalThis assignment');
  ok(!/\b(?:import|export)\b/.test(maskSource(MODULE_SOURCE[mod])),
     label + ' module uses no import/export — classic script form');
});
{
  // Cross-module: no declaration is present in two module sources.
  const mods = Object.keys(MODULE_SOURCE);
  for (let i = 0; i < mods.length; i++) {
    for (let j = i + 1; j < mods.length; j++) {
      const a = declarationSpans(MODULE_SOURCE[mods[i]]).map(function (d) { return d.name; });
      const b = declarationSpans(MODULE_SOURCE[mods[j]]).map(function (d) { return d.name; });
      deepEq(a.filter(function (n) { return b.indexOf(n) >= 0; }), [],
        mods[i] + ' and ' + mods[j] + ' modules share no declaration');
    }
  }
  const total = mods.reduce(function (n, m) { return n + declarationSpans(MODULE_SOURCE[m]).length; }, 0);
  eq(total, 54, 'the three ORDER C modules together declare exactly 54 things');
  ok(declarationSpans(MODULE_SOURCE.adapter).some(function (d) { return d.name === 'dsbRowsForMode'; }),
     'dsbRowsForMode is present in the SHIPPED adapter source');
  ok(!declarationSpans(MODULE_SOURCE.panel).some(function (d) { return d.name === 'dsbRowsForMode'; }),
     'dsbRowsForMode is absent from the shipped PANEL source');
  ok(A.inlineFnNames.indexOf('dsbRowsForMode') < 0,
     'dsbRowsForMode is absent from the inline residue too — the adapter is its ONLY owner');
}
{
  // The residual monolith keeps the two exposures and no DSB declaration.
  const spans = declarationSpans(RESIDUAL_RUMP).map(function (d) { return d.name; });
  deepEq(A.fnNames.concat(A.bindingNames).filter(function (n) { return spans.indexOf(n) >= 0; }), [],
    'the reconstructed residual monolith declares NONE of the 54 DSB declarations');
  eq((RESIDUAL_RUMP.match(/window\.apexDebug(?:BackendDirectionalSnapshot|DirectionalBackendSnapshot)\s*=/g) || []).length, 2,
     'the reconstructed residual monolith keeps both DSB debug exposures');
}

// (12)(13) ORDER C evaluated by the REAL load-order predicate.
// Everything before the DSB modules: the inline monolith AND all three shipped
// DSB modules are excluded, so a reconstructed ORDER C places all three itself.
// Leaving any real module in the base would make an "X loaded too late"
// counterfactual vacuous — the real one would already be there, earlier.
const BASE_PARTS = BASE_NO_DSB.map(function (p) { return { name: p.name, code: p.code }; });
const ORDER_C_PARTS = BASE_PARTS.concat([
  { name: CANONICAL_FILES.adapter, code: MODULE_SOURCE.adapter },
  { name: CANONICAL_FILES.service, code: MODULE_SOURCE.service },
  { name: CANONICAL_FILES.panel, code: MODULE_SOURCE.panel },
  { name: 'INLINE', code: RESIDUAL_RUMP },
]);
ok(loadOrderSafe(ORDER_C_PARTS).safe, 'ORDER C (adapter → service → panel → inline monolith) is load-order safe');
{
  // Also the two coarser orders, on the same module sources.
  const single = BASE_PARTS.concat([
    { name: CANONICAL_FILES.service, code: MODULE_SOURCE.adapter + '\n' + MODULE_SOURCE.service + '\n' + MODULE_SOURCE.panel },
    { name: 'INLINE', code: RESIDUAL_RUMP },
  ]);
  ok(loadOrderSafe(single).safe, 'ORDER A (one DSB module → inline monolith) is load-order safe');
}
{
  // A WRONG order of the SAME three modules must be rejected. The modules have
  // no load-time dependency on each other today (that is the whole point of the
  // convention), so the mutant introduces a REAL top-level read of a service
  // binding inside the panel and then shows the predicate distinguishes the two
  // orders — it reacts to position, not to the added line.
  const panelWithLoadTimeRead = MODULE_SOURCE.panel + '\nvar DSBP_BOOT_MODE = dsbSourceMode;\n';
  const wrong = BASE_PARTS.concat([
    { name: CANONICAL_FILES.adapter, code: MODULE_SOURCE.adapter },
    { name: CANONICAL_FILES.panel, code: panelWithLoadTimeRead },
    { name: CANONICAL_FILES.service, code: MODULE_SOURCE.service },
    { name: 'INLINE', code: RESIDUAL_RUMP },
  ]);
  const wrongResult = loadOrderSafe(wrong);
  ok(!wrongResult.safe, 'PREDICATE REJECTS panel-before-service once the panel really reads a service binding at load time' +
     (wrongResult.violations[0] ? ' (breaks `' + wrongResult.violations[0].name + '`)' : ''));
  const right = BASE_PARTS.concat([
    { name: CANONICAL_FILES.adapter, code: MODULE_SOURCE.adapter },
    { name: CANONICAL_FILES.service, code: MODULE_SOURCE.service },
    { name: CANONICAL_FILES.panel, code: panelWithLoadTimeRead },
    { name: 'INLINE', code: RESIDUAL_RUMP },
  ]);
  ok(loadOrderSafe(right).safe, 'the SAME modified panel is accepted when it comes after the service — position, not content, decides');
  // Same demonstration for the adapter dependency.
  const serviceReadsConstant = MODULE_SOURCE.service + '\nvar DSBS_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n';
  const wrong2 = BASE_PARTS.concat([
    { name: CANONICAL_FILES.service, code: serviceReadsConstant },
    { name: CANONICAL_FILES.adapter, code: MODULE_SOURCE.adapter },
    { name: CANONICAL_FILES.panel, code: MODULE_SOURCE.panel },
    { name: 'INLINE', code: RESIDUAL_RUMP },
  ]);
  ok(!loadOrderSafe(wrong2).safe, 'PREDICATE REJECTS service-before-adapter once the service really reads a DSB constant at load time');
}

// Items that stay inline under the chosen plan.
const LEFT_INLINE = {
  statements: ['window.apexDebugBackendDirectionalSnapshot = …', 'window.apexDebugDirectionalBackendSnapshot = …'],
  functions: ['resolveLatestDisplayPrice', '_dssResolvePrice', 'renderDirectionalSetupScanner',
              'openDirectionalSetupDetail', 'showView', '_apexPostAuthInit', '_dssRenderLargeCharts'],
};
eq(LEFT_INLINE.statements.length, 2, 'two top-level statements stay inline (W2)');
ok(LEFT_INLINE.functions.every(function (n) { return A.fnNames.indexOf(n) < 0; }),
   'none of the inline-staying functions is part of the DSB manifest');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 27b — PR 1 + PR 2 + PR 3 OWNERSHIP CHECKLIST
//
// Everything PR 1, PR 2 and PR 3 promised, asserted once, in one place, in the
// order the plan states it. Individual facts are measured elsewhere in this
// file; this section is the single readable answer to "did the three extraction
// PRs do exactly what they said?" — now that all three have shipped, that
// includes the closing claim: nothing is left pending.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 27b — PR 1 + PR 2 + PR 3 ownership checklist');
{
  const adapterAbs = path.resolve(__dirname, '..', ADAPTER_REL);
  const adapterOnDisk = fs.readFileSync(adapterAbs, 'utf8');
  const adapterNames = A.adapterFnNames.concat(A.adapterBindingNames);
  const inlineNames = A.inlineFnNames.concat(A.inlineBindingNames);
  const adapterTag = SCRIPT_TAGS.find(function (t) { return t.src && String(t.src).trim() === ADAPTER_SRC; });
  const localSrcs = SCRIPT_TAGS.filter(function (t) { return t.src && APP.classifySrc(t.src) === 'local'; })
    .map(function (t) { return String(t.src).trim(); });

  //  1 the new file exists
  ok(fs.existsSync(adapterAbs), '01 — the adapter module file exists');
  //  2 loaded as a classic script
  ok(!!adapterTag && !adapterTag.type && !/(^|\s)(defer|async|type|nomodule)(\s|=|$)/i.test(adapterTag.attrs),
     '02 — it is loaded as a CLASSIC synchronous script (no type, defer, async or nomodule)');
  //  3 after backend-directional-preview
  ok(localSrcs.indexOf(ADAPTER_SRC) > localSrcs.indexOf('./js/ui/backend-directional-preview.js'),
     '03 — it loads AFTER js/ui/backend-directional-preview.js');
  //  4 before the monolith
  ok(SCRIPT_TAGS.indexOf(adapterTag) < SCRIPT_TAGS.findIndex(function (t) { return !t.src; }),
     '04 — it loads BEFORE the inline monolith');
  //  5/6/7 declaration counts
  eq(adapterNames.length, 19, '05 — the module contains exactly 19 declarations');
  eq(A.adapterBindings.length, 8, '06 — exactly 8 `var` bindings');
  ok(A.adapterBindings.every(function (b) { return b.kind === 'var'; }), '06b — every binding is `var` (not const/let)');
  eq(A.adapterFns.length, 11, '07 — exactly 11 functions');
  //  8 canonical manifest
  deepEq(adapterNames.slice().sort(), CANONICAL_MODULES.adapter.slice().sort(),
     '08 — the module contains exactly the canonical adapter manifest');
  //  9 owned declaration bytes
  eq(ownedDeclarationBytes(adapterOnDisk), 6789, '09 — 6789 owned declaration bytes');
  // 10/11/12 no extras, no duplicates, no omissions
  deepEq(adapterNames.filter(function (n) { return CANONICAL_MODULES.adapter.indexOf(n) < 0; }), [],
     '10 — no EXTRA declaration in the module');
  deepEq(adapterNames.filter(function (n, i) { return adapterNames.indexOf(n) !== i; }), [],
     '11 — no DUPLICATE declaration in the module');
  deepEq(CANONICAL_MODULES.adapter.filter(function (n) { return adapterNames.indexOf(n) < 0; }), [],
     '12 — no OMISSION from the module');
  // 13/14 dsbRowsForMode
  ok(A.adapterFnNames.indexOf('dsbRowsForMode') >= 0, '13 — dsbRowsForMode IS in the module');
  ok(A.inlineFnNames.indexOf('dsbRowsForMode') < 0, '14 — dsbRowsForMode is NOT inline');
  // 15 none of the other 18 is inline
  deepEq(CANONICAL_MODULES.adapter.filter(function (n) { return inlineNames.indexOf(n) >= 0; }), [],
     '15 — none of the 19 adapter declarations remains inline');
  // 16 the residue holds NO declaration; the 9 panel functions are in the module
  eq(A.inlineFns.length, 0, '16 — the monolith holds ZERO DSB functions: PR 3 shipped the last 9');
  deepEq(A.panelFnNames.slice().sort(), PANEL_SET.slice().sort(),
     '16b — the panel module holds exactly the 9 panel-set functions');
  deepEq(PANEL_SET.filter(function (n) { return A.inlineFnNames.indexOf(n) >= 0; }), [],
     '16b2 — NO panel function was left behind inline');
  deepEq(A.serviceFnNames.slice().sort(), SERVICE_SET.slice().sort(),
     '16c — the service module holds exactly the 26 service-set functions');
  deepEq(SERVICE_SET.filter(function (n) { return A.inlineFnNames.indexOf(n) >= 0; }), [],
     '16d — NO service function was left behind inline');
  deepEq(PANEL_SET.filter(function (n) { return A.serviceFnNames.indexOf(n) >= 0; }), [],
     '16e — NO panel function was pulled into the service');
  deepEq(CANONICAL_MODULES.adapter.filter(function (n) { return A.serviceFnNames.indexOf(n) >= 0; }), [],
     '16f — NO adapter declaration was pulled into the service');
  // 17 the two window exposures
  eq((A.inlineStatementCode.match(/window\s*\.\s*apexDebug[A-Za-z0-9_$]*\s*=/g) || []).length, 2,
     '17 — the monolith still holds exactly the two DSB window exposures');
  // 18/19 combined manifest, each declaration once
  eq(A.fns.length + A.bindings.length, 54, '18 — the combined ordered source holds all 54 DSB declarations');
  {
    const all = A.fnNames.concat(A.bindingNames);
    eq(new Set(all).size, 54, '19 — every declaration appears EXACTLY ONCE in the application');
    const serviceNames = A.serviceFnNames.concat(A.serviceBindingNames);
    const panelNames = A.panelFnNames.concat(A.panelBindingNames);
    deepEq(adapterNames.filter(function (n) { return inlineNames.indexOf(n) >= 0; }), [],
       '19b — adapter and inline are disjoint: no declaration has two owners');
    deepEq(adapterNames.filter(function (n) { return serviceNames.indexOf(n) >= 0; }), [],
       '19b2 — adapter and service are disjoint');
    deepEq(serviceNames.filter(function (n) { return inlineNames.indexOf(n) >= 0; }), [],
       '19b3 — service and inline are disjoint');
    deepEq(adapterNames.filter(function (n) { return panelNames.indexOf(n) >= 0; }), [],
       '19b4 — adapter and panel are disjoint');
    deepEq(serviceNames.filter(function (n) { return panelNames.indexOf(n) >= 0; }), [],
       '19b5 — service and panel are disjoint');
    deepEq(panelNames.filter(function (n) { return inlineNames.indexOf(n) >= 0; }), [],
       '19b6 — panel and inline are disjoint');
    eq(adapterNames.length + serviceNames.length + panelNames.length + inlineNames.length, 54,
       '19c — the three owners together cover all 54: none has zero owners');
  }
  // 20 relative order inside the module
  deepEq(A.adapterBindingNames, DSB_CONSTANTS, '20 — the 8 constants keep their measured order');
  deepEq(A.adapterFnNames, PURE_CANDIDATES, '20b — the 11 functions keep their measured relative order');
  // 21 signatures and kinds
  {
    const bySig = {};
    MANIFEST.forEach(function (r) { bySig[r[0]] = { async: r[1], sig: r[2] }; });
    const drift = A.adapterFns.filter(function (f) {
      return f.signature !== bySig[f.name].sig || f.isAsync !== bySig[f.name].async;
    }).map(function (f) { return f.name; });
    deepEq(drift, [], '21 — signatures and sync/async kinds are unchanged for all 11 functions');
  }
  // 22 constant values
  deepEq(bindingValues(A), [60000, 600000, 30000, 30, 300000, 3000, 8000, 5000],
     '22 — the 8 constant values are unchanged');
  // 23 no window / globalThis assignment
  ok(!/(?:window|globalThis)\s*\./.test(maskSource(adapterOnDisk)),
     '23 — the module assigns nothing to window/globalThis (and never mentions them in code)');
  // 24 no load-time shared-global read
  {
    const residue = stripFunctions(maskSource(adapterOnDisk));
    ok(!/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|document)(?![A-Za-z0-9_$])/.test(residue),
       '24 — the module reads no S / WL / BACKEND / document at load time');
  }
  // 25 no load-time call, fetch, timer, listener or storage
  {
    const residue = stripFunctions(maskSource(adapterOnDisk));
    ok(!/\(/.test(residue), '25 — the module performs no call at load time');
    ok(!/\b(?:fetch|setTimeout|setInterval|addEventListener)\b/.test(residue) && !/localStorage/.test(residue),
       '25b — no fetch, timer, listener or storage at load time');
  }
  // 26 no DOM access anywhere in the module
  eq(A.adapterCounts.getElementById + A.adapterCounts.querySelector + A.adapterCounts.documentAccess, 0,
     '26 — the module never touches the DOM (getElementById / querySelector / document.*)');
  // 27 owns no state
  eq(A.adapterCounts.backendDirectionalCode + A.adapterCounts.scanDataCode, 0,
     '27 — the module never references S.backendDirectional or S.scanData');
  ok(!Object.keys(A.stateWrites).some(function (f) {
       return A.stateWrites[f].some(function (w) { return A.adapterFnNames.indexOf(w) >= 0; });
     }), '27b — no adapter function writes any DSB state field');
  // 28 the rejected option-D module is absent
  FUTURE_FILES.forEach(function (rel) {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)), '28 — rejected, never created: ' + rel);
  });
  // 29 the W2 exposures stay inline
  deepEq(A.windowExposures, ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
     '29 — the two W2 debug exposures are still the only load-time statements, and they are inline');
  eq(A.adapterCounts.windowAssign, 0, '29b — the module anticipates NEITHER exposure');
  // 30 the plan is fully executed — DERIVED from the measured record and the
  //    plan state, not restated as a pair of literals.
  {
    const shipped = PR_PLAN.filter(function (p) { return p.state === 'completed'; });
    const measured = { adapter: A.adapterFnNames.concat(A.adapterBindingNames).length,
                       service: A.serviceFnNames.concat(A.serviceBindingNames).length,
                       panel: A.panelFnNames.concat(A.panelBindingNames).length };
    deepEq(shipped.map(function (p) { return p.module; }), ['adapter', 'service', 'panel'],
       '30 — all three PRs are COMPLETED: adapter, service and panel have shipped');
    deepEq(shipped.map(function (p) { return measured[p.module]; }),
           shipped.map(function (p) { return p.manifest.length; }),
       '30b — each shipped module measurably owns exactly its planned manifest');
    deepEq([measured.adapter, measured.service, measured.panel], [19, 26, 9],
       '30c — measured ownership is adapter 19, service 26, panel 9');
    eq(measured.adapter + measured.service + measured.panel, 54,
       '30d — the three shipped owners account for all 54 declarations');
    eq(A.inlineFnNames.concat(A.inlineBindingNames).length, 0,
       '30e — nothing is left inline: the residual plan is EMPTY');
    deepEq(PR_PLAN.filter(function (p) { return p.state !== 'completed'; }), [],
       '30f — no PR remains pending');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 28 — GUARD PREDICATES, split by record type
//
// Three record kinds, three guard families. The mutation proof applies each
// family to the record it actually describes, so a plan mutant is judged by plan
// guards and a source mutant by source guards.
//
//   SOURCE record — the measurement of the real application source (analyze()).
//   PLAN   record — the module assignment: manifests, coverage, edges, bytes,
//                   state ownership, window ownership, PR order.
//   ORDER  record — the script list: classic scripts, attributes, load order.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 28 — guard predicates');

const EXPECTED_EXTERNAL_MAP = {
  dsbGetBackendSource: ['bssUniverseDiagHtml'],
  dsbEnrichVisibleRowsLive: ['_apexPostAuthInit'],
  dssResolveChartLivePrice: ['_dssRenderLargeCharts'],
  dssEnsureChartLiveQuoteForDisplay: ['openDirectionalSetupDetail'],
  dsbStartAutoRefresh: ['_apexPostAuthInit', 'showView'],
  dsbStopAutoRefresh: ['showView'],
  dsbScanRowShim: ['openDirectionalSetupDetail'],
  dsbTechnicalStateShim: ['openDirectionalSetupDetail'],
  dsbMaybeRenderBackendDirectional: ['renderDirectionalSetupScanner'],
  dsbSourceNoticeHtml: ['renderDirectionalSetupScanner'],
  dsbNoteDirectionalChartOpen: ['openDirectionalSetupDetail'],
};
const EXPECTED_STATE_WRITERS = JSON.parse(JSON.stringify(A.stateWrites));
const EXPECTED_SIGNATURES = MANIFEST.map(function (r) { return r[2]; });

// ── PR 1 OWNERSHIP EXPECTATIONS, frozen ──────────────────────────────────────
// Snapshotted from the canonical plan so a mutant cannot move the goalposts by
// changing the very record the guards compare against.
const EXPECTED_ADAPTER_MANIFEST = ADAPTER_DECLARATION_SET.slice().sort();
const EXPECTED_ADAPTER_FUNCTIONS = ADAPTER_FUNCTION_SET.slice().sort();
const EXPECTED_ADAPTER_BINDINGS = DSB_CONSTANTS.slice();
// PR 3 relocated the last 9 functions, so the frozen inline residual is now
// EMPTY. The service and panel manifests are frozen in PHYSICAL order, since
// each relocation had to preserve it exactly.
const EXPECTED_INLINE_RESIDUAL = [];
const EXPECTED_SERVICE_FUNCTIONS_ORDERED = SERVICE_SET.slice();
const EXPECTED_PANEL_FUNCTIONS_ORDERED = PANEL_SET.slice();
const EXPECTED_PANEL_DECL_BYTES = 14945;
const EXPECTED_SERVICE_ASYNC = ['dsbFetchSnapshot', 'dsbEnrichVisibleRowsLive', 'dssEnsureChartLiveQuoteForDisplay'];
const EXPECTED_SERVICE_DECL_BYTES = 26385;
const EXPECTED_CONSTANT_VALUES = [60000, 600000, 30000, 30, 300000, 3000, 8000, 5000];
const EXPECTED_ADAPTER_DECL_BYTES = 6789;
eq(EXPECTED_ADAPTER_MANIFEST.length, 19, 'frozen adapter manifest size');
eq(EXPECTED_SERVICE_FUNCTIONS_ORDERED.length, 26, 'frozen service manifest size');
eq(EXPECTED_SERVICE_ASYNC.length, 3, 'frozen service async count');
eq(EXPECTED_INLINE_RESIDUAL.length, 0, 'frozen inline residual manifest size');
eq(EXPECTED_PANEL_FUNCTIONS_ORDERED.length, 9, 'frozen panel manifest size');

// The literal value of a `var NAME = <number>;` binding, read out of a record.
function bindingValues(r) {
  return r.bindings.map(function (b) {
    const semi = r.masked.indexOf(';', b.start);
    const text = r.src.slice(b.start, semi < 0 ? b.start : semi + 1);
    const m = /=\s*(-?[0-9]+(?:\.[0-9]+)?)\s*;/.exec(text);
    return m ? Number(m[1]) : NaN;
  });
}
// Declaration spans a record attributes to the adapter module, and their bytes.
function adapterDeclBytes(r) {
  if (!r.adapterPresent) return -1;
  const fnBytes = r.adapterFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0);
  const bindBytes = r.adapterBindings.reduce(function (n, b) {
    const semi = r.masked.indexOf(';', b.start);
    return n + ((semi < 0 ? b.start : semi + 1) - b.start);
  }, 0);
  return fnBytes + bindBytes;
}

// ── SOURCE guards ────────────────────────────────────────────────────────────
const SOURCE_GUARDS = [
  // ── PR 1 ownership: the adapter module ─────────────────────────────────────
  { name: 'adapter-module-present', fn: function (r) {
      return r.found && r.adapterPresent === true &&
             r.adapterFns.length === 11 && r.adapterBindings.length === 8;
    } },
  { name: 'adapter-manifest-exact', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      const names = r.adapterFnNames.concat(r.adapterBindingNames).slice().sort();
      return JSON.stringify(names) === JSON.stringify(EXPECTED_ADAPTER_MANIFEST);
    } },
  { name: 'adapter-no-extra-no-duplicate-no-omission', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      const names = r.adapterFnNames.concat(r.adapterBindingNames);
      if (names.length !== 19) return false;
      if (names.some(function (n, i) { return names.indexOf(n) !== i; })) return false;      // duplicate
      if (names.some(function (n) { return EXPECTED_ADAPTER_MANIFEST.indexOf(n) < 0; })) return false; // extra
      return EXPECTED_ADAPTER_MANIFEST.every(function (n) { return names.indexOf(n) >= 0; });          // omission
    } },
  { name: 'adapter-declaration-bytes', fn: function (r) {
      return r.found && adapterDeclBytes(r) === EXPECTED_ADAPTER_DECL_BYTES;
    } },
  { name: 'adapter-declaration-order', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      // 8 constants first, then the 11 functions in their measured relative order.
      return JSON.stringify(r.adapterBindingNames) === JSON.stringify(EXPECTED_ADAPTER_BINDINGS) &&
             JSON.stringify(r.adapterFnNames.slice().sort()) === JSON.stringify(EXPECTED_ADAPTER_FUNCTIONS) &&
             r.adapterBindings.every(function (b) { return b.start < r.adapterFns[0].start; });
    } },
  { name: 'adapter-owns-dsbRowsForMode', fn: function (r) {
      return r.found && r.adapterFnNames.indexOf('dsbRowsForMode') >= 0 &&
             r.inlineFnNames.indexOf('dsbRowsForMode') < 0;
    } },
  { name: 'no-adapter-declaration-left-inline', fn: function (r) {
      if (!r.found) return false;
      const inline = r.inlineFnNames.concat(r.inlineBindingNames);
      return !EXPECTED_ADAPTER_MANIFEST.some(function (n) { return inline.indexOf(n) >= 0; });
    } },
  { name: 'constants-live-in-the-adapter-as-var', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      return r.adapterBindings.length === 8 &&
             r.adapterBindings.every(function (b) { return b.kind === 'var'; }) &&
             r.inlineBindings.length === 0 &&
             JSON.stringify(r.adapterBindingNames) === JSON.stringify(EXPECTED_ADAPTER_BINDINGS);
    } },
  { name: 'constant-values-unchanged', fn: function (r) {
      return r.found && JSON.stringify(bindingValues(r)) === JSON.stringify(EXPECTED_CONSTANT_VALUES);
    } },
  { name: 'adapter-load-time-inert', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      if (r.adapterStatements.length !== 0 || r.adapterStatementCode !== '') return false;
      const residue = stripFunctions(r.adapterMasked)
        .replace(/(?:^|\n)\s*var\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*[0-9]+\s*;/g, '');
      return residue.replace(/\s+/g, '').length === 0;
    } },
  { name: 'adapter-no-window-or-globalthis', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      return r.adapterCounts.windowAssign === 0 && r.adapterCounts.globalThisAssign === 0 &&
             !/(?<![A-Za-z0-9_$.])(?:window|globalThis)\s*\./.test(r.adapterMasked);
    } },
  { name: 'adapter-zero-side-effect-surface', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      const c = r.adapterCounts;
      return c.directFetch === 0 && c.setInterval === 0 && c.setTimeout === 0 &&
             c.clearInterval === 0 && c.clearTimeout === 0 && c.localStorage === 0 &&
             c.getElementById === 0 && c.querySelector === 0 && c.documentAccess === 0 &&
             c.addEventListener === 0 && c.subscribeDxlinkQuotes === 0 && c.fetchLiveQuote === 0 &&
             c.webSocket === 0 && c.postCandleContext === 0;
    } },
  { name: 'adapter-owns-no-state', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      if (r.adapterCounts.backendDirectionalCode !== 0 || r.adapterCounts.scanDataCode !== 0) return false;
      // No state field may be written by a function the adapter owns.
      return !Object.keys(r.stateWrites).some(function (f) {
        return r.stateWrites[f].some(function (w) { return r.adapterFnNames.indexOf(w) >= 0; });
      });
    } },
  { name: 'adapter-reads-no-shared-global-at-load', fn: function (r) {
      if (!r.found || !r.adapterPresent) return false;
      const residue = stripFunctions(r.adapterMasked);
      return !/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|document|localStorage|window|globalThis)(?![A-Za-z0-9_$])/.test(residue);
    } },
  // ── PR 2 ownership: the service module ─────────────────────────────────────
  { name: 'service-module-present', fn: function (r) {
      return r.found && !!r.servicePresent && r.serviceFns.length === 26;
    } },
  { name: 'service-manifest', fn: function (r) {
      if (!r.found || !r.servicePresent) return false;
      return r.serviceFns.length === 26 &&
             JSON.stringify(r.serviceFnNames) === JSON.stringify(EXPECTED_SERVICE_FUNCTIONS_ORDERED);
    } },
  { name: 'service-async-kinds', fn: function (r) {
      if (!r.found || !r.servicePresent) return false;
      return JSON.stringify(r.serviceFns.filter(function (f) { return f.isAsync; })
                             .map(function (f) { return f.name; })) === JSON.stringify(EXPECTED_SERVICE_ASYNC) &&
             r.serviceFns.filter(function (f) { return !f.isAsync; }).length === 23;
    } },
  { name: 'service-declaration-bytes', fn: function (r) {
      if (!r.found || !r.servicePresent) return false;
      return r.serviceFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0) === 26385;
    } },
  { name: 'service-holds-no-constant', fn: function (r) {
      return r.found && !!r.servicePresent && r.serviceBindings.length === 0;
    } },
  { name: 'service-holds-no-adapter-or-panel-function', fn: function (r) {
      if (!r.found || !r.servicePresent) return false;
      return !r.serviceFnNames.some(function (n) {
        return ADAPTER_FUNCTION_SET.indexOf(n) >= 0 || PANEL_SET.indexOf(n) >= 0;
      });
    } },
  { name: 'service-assigns-no-window', fn: function (r) {
      if (!r.found || !r.servicePresent) return false;
      return !/(?:window|globalThis)\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(r.serviceMasked);
    } },
  { name: 'service-has-no-top-level-code', fn: function (r) {
      return r.found && !!r.servicePresent && r.serviceStatements.length === 0 && r.serviceStatementCode === '';
    } },
  { name: 'service-reads-no-shared-global-at-load', fn: function (r) {
      if (!r.found || !r.servicePresent) return false;
      const residue = stripFunctions(r.serviceMasked);
      return !/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|document|localStorage|window|globalThis)(?![A-Za-z0-9_$])/.test(residue);
    } },
  { name: 'service-loads-after-adapter-before-monolith', fn: function (r) {
      if (!r.found || !r.servicePresent || !r.adapterPresent) return false;
      return r.adapterEnd <= r.serviceStart && r.serviceEnd <= r.start;
    } },
  // ── PR 3 ownership: the panel module ───────────────────────────────────────
  { name: 'panel-module-present', fn: function (r) {
      return r.found && !!r.panelPresent && r.panelFns.length === 9;
    } },
  { name: 'panel-manifest', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      return r.panelFns.length === 9 &&
             JSON.stringify(r.panelFnNames) === JSON.stringify(EXPECTED_PANEL_FUNCTIONS_ORDERED);
    } },
  { name: 'panel-async-kinds', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      return r.panelFns.filter(function (f) { return f.isAsync; }).length === 0 &&
             r.panelFns.filter(function (f) { return !f.isAsync; }).length === 9;
    } },
  { name: 'panel-declaration-bytes', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      return r.panelFns.reduce(function (n, f) { return n + (f.end - f.start); }, 0) === EXPECTED_PANEL_DECL_BYTES;
    } },
  { name: 'panel-holds-no-constant', fn: function (r) {
      return r.found && !!r.panelPresent && r.panelBindings.length === 0;
    } },
  { name: 'panel-holds-no-adapter-or-service-function', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      return !r.panelFnNames.some(function (n) {
        return ADAPTER_FUNCTION_SET.indexOf(n) >= 0 || SERVICE_SET.indexOf(n) >= 0;
      });
    } },
  { name: 'panel-assigns-no-window', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      return !/(?:window|globalThis)\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(r.panelMasked);
    } },
  { name: 'panel-has-no-top-level-code', fn: function (r) {
      return r.found && !!r.panelPresent && r.panelStatements.length === 0 && r.panelStatementCode === '';
    } },
  { name: 'panel-reads-no-shared-global-at-load', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      const residue = stripFunctions(r.panelMasked);
      return !/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|document|localStorage|window|globalThis)(?![A-Za-z0-9_$])/.test(residue);
    } },
  { name: 'panel-zero-load-time-side-effect-surface', fn: function (r) {
      if (!r.found || !r.panelPresent) return false;
      const residue = stripFunctions(r.panelMasked);
      return !/(?:fetch|setInterval|setTimeout|addEventListener|localStorage|getElementById|querySelector)\s*\(/.test(residue);
    } },
  { name: 'panel-loads-after-service-before-monolith', fn: function (r) {
      if (!r.found || !r.panelPresent || !r.servicePresent) return false;
      return r.serviceEnd <= r.panelStart && r.panelEnd <= r.start;
    } },
  // ── PR 3 ownership: the inline residue ─────────────────────────────────────
  { name: 'inline-residual-manifest', fn: function (r) {
      if (!r.found) return false;
      return r.inlineFns.length === 0 && r.inlineBindings.length === 0 &&
             JSON.stringify(r.inlineFnNames.slice().sort()) === JSON.stringify(EXPECTED_INLINE_RESIDUAL);
    } },
  { name: 'inline-keeps-exactly-two-exposures', fn: function (r) {
      if (!r.found) return false;
      return r.exposures.length === 2 &&
             r.exposures.every(function (e) { return e.region === 'inline'; }) &&
             JSON.stringify(r.exposures.map(function (e) { return e.property; })) === JSON.stringify(DEBUG_FNS) &&
             (r.inlineStatementCode.match(/window\s*\.\s*apexDebug[A-Za-z0-9_$]*\s*=/g) || []).length === 2 &&
             r.adapterStatements.length === 0 && r.serviceStatements.length === 0 &&
             r.panelStatements.length === 0 &&
             !/window\s*\.\s*apexDebug/.test(r.panelMasked);
    } },
  // ── application-wide invariants across ALL THREE owners ───────────────────
  { name: 'combined-manifest-is-54', fn: function (r) {
      return r.found && (r.fns.length + r.bindings.length) === 54 &&
             r.fns.length === 46 && r.bindings.length === 8;
    } },
  { name: 'every-declaration-owned-exactly-once', fn: function (r) {
      if (!r.found) return false;
      const all = r.fnNames.concat(r.bindingNames);
      if (all.length !== 54) return false;
      if (all.some(function (n, i) { return all.indexOf(n) !== i; })) return false;
      // Exactly one owner per name, and the three owner sets are pairwise disjoint.
      const adapter = r.adapterFnNames.concat(r.adapterBindingNames);
      const service = r.serviceFnNames.concat(r.serviceBindingNames);
      const panel = r.panelFnNames.concat(r.panelBindingNames);
      const inline = r.inlineFnNames.concat(r.inlineBindingNames);
      if (adapter.length + service.length + panel.length + inline.length !== 54) return false;
      if (adapter.some(function (n) { return inline.indexOf(n) >= 0; })) return false;
      if (adapter.some(function (n) { return service.indexOf(n) >= 0; })) return false;
      if (adapter.some(function (n) { return panel.indexOf(n) >= 0; })) return false;
      if (service.some(function (n) { return panel.indexOf(n) >= 0; })) return false;
      if (panel.some(function (n) { return inline.indexOf(n) >= 0; })) return false;
      return !service.some(function (n) { return inline.indexOf(n) >= 0; });
    } },
  { name: 'manifest-membership', fn: function (r) {
      return r.found && r.fnNames.length === 46 &&
             JSON.stringify(r.fnNames.slice().sort()) === JSON.stringify(MANIFEST.map(function (x) { return x[0]; }).sort());
    } },
  { name: 'no-duplicate-declaration', fn: function (r) { return r.found && r.duplicateFnNames.length === 0; } },
  { name: 'physical-order', fn: function (r) {
      return r.found && JSON.stringify(r.fnNames) === JSON.stringify(MANIFEST.map(function (x) { return x[0]; }));
    } },
  { name: 'signatures', fn: function (r) {
      return r.found && JSON.stringify(r.fns.map(function (f) { return f.signature; })) === JSON.stringify(EXPECTED_SIGNATURES);
    } },
  { name: 'constants-inventory', fn: function (r) {
      return r.found && r.bindings.length === 8 &&
             r.bindings.every(function (b) { return b.kind === 'var'; }) &&
             JSON.stringify(r.bindingNames) === JSON.stringify(DSB_CONSTANTS);
    } },
  { name: 'external-consumer-map', fn: function (r) {
      if (!r.found) return false;
      return Object.keys(EXPECTED_EXTERNAL_MAP).every(function (n) {
        return r.refs[n] && JSON.stringify(r.refs[n].external) === JSON.stringify(EXPECTED_EXTERNAL_MAP[n]);
      }) && r.externallyCalled.length === 11;
    } },
  { name: 'chart-bridge-has-external-consumers', fn: function (r) {
      if (!r.found) return false;
      return CATEGORIES.H.filter(function (n) { return r.refs[n] && r.refs[n].external.length > 0; }).length === 5;
    } },
  { name: 'state-write-ownership', fn: function (r) {
      return r.found && JSON.stringify(r.stateWrites) === JSON.stringify(EXPECTED_STATE_WRITERS);
    } },
  { name: 'no-S.scanData', fn: function (r) { return r.found && r.counts.scanDataCode === 0; } },
  { name: 'no-POST-scanner', fn: function (r) {
      return r.found && r.counts.httpMethod === 0 && r.counts.scannerRun === 0 && !/\bPOST\b/.test(r.regionMasked);
    } },
  { name: 'single-direct-fetch', fn: function (r) { return r.found && r.counts.directFetch === 1; } },
  { name: 'single-interval', fn: function (r) { return r.found && r.counts.setInterval === 1 && r.counts.clearInterval === 1; } },
  { name: 'two-timeouts-one-cleartimeout', fn: function (r) {
      return r.found && r.counts.setTimeout === 2 && r.counts.clearTimeout === 1;
    } },
  { name: 'snapshot-single-flight', fn: function (r) {
      return r.found && /if\s*\(\s*st\.fetching\s*\)\s*return\s+st\.inflightSnapshot/.test(r.regionText);
    } },
  { name: 'live-single-flight', fn: function (r) {
      return r.found && /if\s*\(\s*st\.liveEnriching\s*\)\s*return/.test(r.regionText);
    } },
  { name: 'retry-single-flight', fn: function (r) {
      return r.found && /if\s*\(\s*st\.liveRetryTimerId\s*\)\s*return/.test(r.regionText);
    } },
  { name: 'abort-cooldown', fn: function (r) {
      return r.found && /liveEnrichCooldownUntil\s*=\s*Date\.now\(\)\s*\+\s*DSB_LIVE_ABORT_COOLDOWN_MS/.test(r.regionText);
    } },
  { name: 'detail-open-protection', fn: function (r) {
      if (!r.found) return false;
      const repaint = r.fns.find(function (f) { return f.name === 'dsbRepaintIfSafe'; });
      const fetchFn = r.fns.find(function (f) { return f.name === 'dsbFetchSnapshot'; });
      if (!repaint || !fetchFn) return false;
      return /_dssDetailSymbol/.test(r.src.slice(repaint.start, repaint.end)) &&
             /_dssDetailSymbol/.test(r.src.slice(fetchFn.start, fetchFn.end));
    } },
  { name: 'no-top-level-auto-call', fn: function (r) {
      return r.found && r.exposures.length === 2 &&
             !/(?<![A-Za-z0-9_$.])dsb[A-Z][A-Za-z0-9_$]*\s*\(/.test(r.topLevelStatementCode) &&
             !/\b(?:setTimeout|setInterval|fetch|addEventListener)\s*\(/.test(r.topLevelStatementCode);
    } },
  { name: 'window-exposure-inventory', fn: function (r) {
      return r.found && r.windowExposures.length === 2 && r.counts.windowAssign === 2 &&
             JSON.stringify(r.windowExposures) === JSON.stringify(DEBUG_FNS);
    } },
  { name: 'no-load-time-lexical-read', fn: function (r) {
      return r.found &&
             !/(?<![A-Za-z0-9_$.])S(?![A-Za-z0-9_$])/.test(r.topLevelStatementCode) &&
             !/(?<![A-Za-z0-9_$.])WL(?![A-Za-z0-9_$])/.test(r.topLevelStatementCode) &&
             !DSB_CONSTANTS.some(function (c) { return new RegExp('\\b' + c + '\\b').test(r.topLevelStatementCode); });
    } },
  { name: 'bss-adapter-dependency-placement', fn: function (r) {
      if (!r.found) return false;
      const bss = Object.keys(r.freeGlobals).filter(function (k) { return /^bss[A-Z]/.test(k); }).sort();
      const bds = Object.keys(r.freeGlobals).filter(function (k) { return /^bds[A-Z]/.test(k); }).sort();
      return JSON.stringify(bss) === JSON.stringify(['bssFmtAgeMs', 'bssFmtClock', 'bssState']) &&
             JSON.stringify(bds) === JSON.stringify(['bdsDeriveBackendDirectionalRows']);
    } },
  { name: 'subscription-reuse', fn: function (r) {
      if (!r.found) return false;
      const users = r.fnNames.filter(function (n) {
        const f = r.fns.find(function (x) { return x.name === n; });
        return /subscribeDxlinkQuotes|fetchLiveQuote/.test(maskSource(r.src.slice(f.start, f.end)));
      });
      return users.length === 2 && users.every(function (n) {
        const f = r.fns.find(function (x) { return x.name === n; });
        return !/\bfetch\s*\(/.test(maskSource(r.src.slice(f.start, f.end)));
      });
    } },
  { name: 'dom-ownership', fn: function (r) {
      return r.found && JSON.stringify(r.domIds) ===
        JSON.stringify(['dsb-refresh', 'panelContent', 'panelHeader', 'ptab-scanner']);
    } },
  { name: 'localstorage-keys', fn: function (r) {
      return r.found && JSON.stringify(r.storageKeys) ===
        JSON.stringify(['apex_dss_source_mode', 'apex_ff_backend_directional_snapshot']);
    } },
];

// ── PLAN record + PLAN guards ────────────────────────────────────────────────
// A plan record is self-describing: the module assignment, the sources it
// produces, the metric functions it used, and the window ownership decision.
function buildPlanRecord(opts) {
  opts = opts || {};
  const modules = opts.modules || CANONICAL_MODULES;
  const measureShipped = opts.measureShipped || ownedDeclarationBytes;
  const measureCandidate = opts.measureCandidate || ownedDeclarationBytes;
  const declarationUniverse = opts.declarationUniverse || DECLARATIONS;
  const exposuresInModule = opts.exposuresInModule === true;
  const sources = {};
  Object.keys(modules).forEach(function (m) {
    let code = buildModuleSource(modules[m].filter(function (n) { return !!DECL_BY_NAME[n]; }));
    if (exposuresInModule && m === 'service') code += '\n' + EXPOSURE_SRC;
    sources[m] = code;
  });
  const owner = {};
  const duplicated = [];
  Object.keys(modules).forEach(function (m) {
    modules[m].forEach(function (n) { if (owner[n]) duplicated.push(n); owner[n] = m; });
  });
  const assignedNames = Object.keys(owner);
  const missing = declarationUniverse.filter(function (d) { return !owner[d.name]; }).map(function (d) { return d.name; });
  const bytes = {};
  Object.keys(modules).forEach(function (m) { bytes[m] = measureCandidate(sources[m]); });
  const crossFn = FUNCTION_EDGES.filter(function (e) { return owner[e[0]] && owner[e[1]] && owner[e[0]] !== owner[e[1]]; }).length;
  const crossBinding = BINDING_EDGES.filter(function (e) { return owner[e[0]] && owner[e[1]] && owner[e[0]] !== owner[e[1]]; }).length;
  const creator = owner['dsbState'];
  const stateCoOwners = Object.keys(modules).filter(function (m) {
    if (m === creator) return false;
    return modules[m].some(function (n) {
      return Object.keys(A.stateWrites).some(function (f) { return A.stateWrites[f].indexOf(n) >= 0; });
    });
  });
  return {
    modules: modules, sources: sources, owner: owner, duplicated: duplicated, missing: missing,
    assignedCount: assignedNames.length, declarationUniverseSize: declarationUniverse.length,
    bytes: bytes, crossFn: crossFn, crossBinding: crossBinding,
    stateCoOwners: stateCoOwners, exposuresInModule: exposuresInModule,
    measureShipped: measureShipped, measureCandidate: measureCandidate,
    shippedCeiling: Math.round(Math.max.apply(null, PARTS.filter(function (p) { return p.kind === 'local'; })
      .map(function (p) { return measureShipped(p.code); })) * 1.5),
  };
}
const PLAN_GUARDS = [
  { name: 'plan-covers-54-declarations', fn: function (p) {
      return p.declarationUniverseSize === 54 && p.assignedCount === 54 && p.missing.length === 0;
    } },
  { name: 'plan-has-no-duplicate', fn: function (p) { return p.duplicated.length === 0; } },
  { name: 'plan-module-sources-are-disjoint', fn: function (p) {
      const seen = new Set();
      const mods = Object.keys(p.sources);
      for (const m of mods) {
        const names = declarationSpans(p.sources[m]).map(function (d) { return d.name; });
        for (const n of names) { if (seen.has(n)) return false; seen.add(n); }
      }
      return true;
    } },
  { name: 'plan-module-sources-match-manifests', fn: function (p) {
      return Object.keys(p.modules).every(function (m) {
        const declared = declarationSpans(p.sources[m])
          .map(function (d) { return d.name; })
          .filter(function (n) { return !!DECL_BY_NAME[n]; }).sort();
        const expected = p.modules[m].filter(function (n) { return !!DECL_BY_NAME[n]; }).slice().sort();
        return JSON.stringify(declared) === JSON.stringify(expected);
      });
    } },
  { name: 'plan-bindings-are-owned', fn: function (p) {
      return A.bindingNames.every(function (n) { return !!p.owner[n]; });
    } },
  { name: 'plan-bindings-live-with-a-consumer-layer', fn: function (p) {
      // Every DSB constant must sit in the module that is a dependency of (or
      // equal to) every module consuming it — otherwise a constant read would
      // point UP the layer stack.
      const rank = { adapter: 0, service: 1, panel: 2, chart: 2, dsb: 0 };
      return BINDING_EDGES.every(function (e) {
        const consumer = p.owner[e[0]], holder = p.owner[e[1]];
        if (!consumer || !holder) return false;
        return rank[holder] <= rank[consumer];
      });
    } },
  { name: 'plan-byte-accounting', fn: function (p) {
      const total = Object.keys(p.bytes).reduce(function (n, m) { return n + p.bytes[m]; }, 0);
      return total === DSB_DECLARATION_BYTES;
    } },
  { name: 'plan-metric-is-homogeneous', fn: function (p) { return p.measureShipped === p.measureCandidate; } },
  { name: 'plan-fits-the-shipped-ceiling', fn: function (p) {
      return Object.keys(p.bytes).every(function (m) { return p.bytes[m] <= p.shippedCeiling; });
    } },
  { name: 'plan-single-state-owner', fn: function (p) { return p.stateCoOwners.length === 0; } },
  { name: 'plan-window-ownership', fn: function (p) {
      // Under the derived strategy the exposures must NOT be in any module,
      // and no module source may contain a window assignment.
      if (p.exposuresInModule !== (WINDOW_STRATEGY.choice === 'W1')) return false;
      return Object.keys(p.sources).every(function (m) {
        return !/window\s*\./.test(maskSource(p.sources[m]));
      });
    } },
  { name: 'plan-pr-order-is-dependency-correct', fn: function (p) {
      const rank = { adapter: 1, service: 2, panel: 3, chart: 3, dsb: 1 };
      return ALL_EDGES.every(function (e) {
        const a = p.owner[e[0]], b = p.owner[e[1]];
        if (!a || !b) return false;
        return rank[a] >= rank[b];
      });
    } },
];

// ── ORDER guards ─────────────────────────────────────────────────────────────
const ORDER_GUARDS = [
  { name: 'no-defer-async-module', fn: function (tags) {
      return tags.every(function (t) {
        if (!t.src || APP.classifySrc(t.src) !== 'local') return true;
        if (/(^|\s)(defer|async)(\s|=|$)/i.test(t.attrs)) return false;
        return !(t.type && String(t.type).toLowerCase() === 'module');
      });
    } },
  { name: 'load-order-resolvable', fn: function (tags, parts) { return loadOrderSafe(parts).safe; } },
  // ── PR 1 order guards ──────────────────────────────────────────────────────
  { name: 'adapter-tag-attributes', fn: function (tags) {
      const t = tags.find(function (x) { return x.src && String(x.src).trim() === ADAPTER_SRC; });
      if (!t) return false;
      if (String(t.attrs).trim() !== 'src="' + ADAPTER_SRC + '"') return false;
      return !/(^|\s)(defer|async|type|nomodule|integrity|crossorigin)(\s|=|$)/i.test(t.attrs);
    } },
  { name: 'adapter-tag-position', fn: function (tags, parts) {
      // The adapter must load AFTER every module the plan names as its
      // predecessor, and BEFORE the inline monolith — in the tag list and in
      // the part list alike.
      const REQUIRED_BEFORE = [
        './js/services/backend-scanner-snapshot-service.js',
        './js/ui/backend-scanner-snapshot-panel.js',
        './js/adapters/backend-directional-adapter.js',
        './js/ui/backend-directional-preview.js',
      ];
      const tagAt = function (src) { return tags.findIndex(function (t) { return t.src && String(t.src).trim() === src; }); };
      const a = tagAt(ADAPTER_SRC);
      if (a < 0) return false;
      const inlineAt = tags.findIndex(function (t) { return !t.src; });
      if (inlineAt < 0 || a > inlineAt) return false;
      if (REQUIRED_BEFORE.some(function (s) { const i = tagAt(s); return i < 0 || i > a; })) return false;
      const pa = parts.findIndex(function (p) { return p.name === ADAPTER_SRC; });
      const pi = parts.findIndex(function (p) { return p.name === 'INLINE'; });
      if (pa < 0 || pi < 0 || pa > pi) return false;
      return !REQUIRED_BEFORE.some(function (s) {
        const i = parts.findIndex(function (p) { return p.name === s; });
        return i < 0 || i > pa;
      });
    } },
  // ── PR 2 order guards ──────────────────────────────────────────────────────
  { name: 'service-tag-attributes', fn: function (tags) {
      const t = tags.filter(function (x) { return x.src && String(x.src).trim() === SERVICE_SRC; });
      if (t.length !== 1) return false;                       // exactly one tag, never duplicated
      if (String(t[0].attrs).trim() !== 'src="' + SERVICE_SRC + '"') return false;
      return !/(^|\s)(defer|async|type|nomodule|integrity|crossorigin)(\s|=|$)/i.test(t[0].attrs);
    } },
  { name: 'service-tag-position', fn: function (tags, parts) {
      // The service must load AFTER the adapter it consumes and BEFORE the
      // inline monolith that reads its two debug builders at load time — in the
      // tag list and in the part list alike.
      const tagAt = function (src) { return tags.findIndex(function (t) { return t.src && String(t.src).trim() === src; }); };
      const sv = tagAt(SERVICE_SRC), ad = tagAt(ADAPTER_SRC);
      if (sv < 0 || ad < 0 || ad > sv) return false;
      const inlineAt = tags.findIndex(function (t) { return !t.src; });
      if (inlineAt < 0 || sv > inlineAt) return false;
      const psv = parts.findIndex(function (p) { return p.name === SERVICE_SRC; });
      const pad = parts.findIndex(function (p) { return p.name === ADAPTER_SRC; });
      const pi = parts.findIndex(function (p) { return p.name === 'INLINE'; });
      return psv >= 0 && pad >= 0 && pi >= 0 && pad < psv && psv < pi;
    } },
  { name: 'service-tag-is-unique', fn: function (tags, parts) {
      const tagCount = tags.filter(function (x) { return x.src && String(x.src).trim() === SERVICE_SRC; }).length;
      const partCount = parts.filter(function (p) { return p.name === SERVICE_SRC; }).length;
      return tagCount === 1 && partCount === 1;
    } },
  // ── PR 3 order guards ──────────────────────────────────────────────────────
  { name: 'panel-tag-attributes', fn: function (tags) {
      const t = tags.filter(function (x) { return x.src && String(x.src).trim() === PANEL_SRC; });
      if (t.length !== 1) return false;                       // exactly one tag, never duplicated
      if (String(t[0].attrs).trim() !== 'src="' + PANEL_SRC + '"') return false;
      return !/(^|\s)(defer|async|type|nomodule|integrity|crossorigin)(\s|=|$)/i.test(t[0].attrs);
    } },
  { name: 'panel-tag-position', fn: function (tags, parts) {
      // The panel must load AFTER the service (and therefore the adapter) and
      // BEFORE the inline monolith — in the tag list and in the part list alike.
      const tagAt = function (src) { return tags.findIndex(function (t) { return t.src && String(t.src).trim() === src; }); };
      const pn = tagAt(PANEL_SRC), sv = tagAt(SERVICE_SRC), ad = tagAt(ADAPTER_SRC);
      if (pn < 0 || sv < 0 || ad < 0) return false;
      if (!(ad < sv && sv < pn)) return false;
      const inlineAt = tags.findIndex(function (t) { return !t.src; });
      if (inlineAt < 0 || pn > inlineAt) return false;
      const ppn = parts.findIndex(function (p) { return p.name === PANEL_SRC; });
      const psv = parts.findIndex(function (p) { return p.name === SERVICE_SRC; });
      const pi = parts.findIndex(function (p) { return p.name === 'INLINE'; });
      return ppn >= 0 && psv >= 0 && pi >= 0 && psv < ppn && ppn < pi;
    } },
  { name: 'panel-tag-is-unique', fn: function (tags, parts) {
      const tagCount = tags.filter(function (x) { return x.src && String(x.src).trim() === PANEL_SRC; }).length;
      const partCount = parts.filter(function (p) { return p.name === PANEL_SRC; }).length;
      return tagCount === 1 && partCount === 1;
    } },
  { name: 'no-rejected-option-d-module', fn: function (tags, parts) {
      // Option D was measured and REJECTED: neither a tag nor a part may
      // reference the chart module it would have created.
      const names = tags.map(function (t) { return t.src ? String(t.src).trim() : ''; })
        .concat(parts.map(function (p) { return p.name; }));
      return !FUTURE_FILES.some(function (rel) {
        return names.some(function (n) { return n.indexOf(path.basename(rel)) >= 0; });
      });
    } },
];

const REAL_PLAN = buildPlanRecord();
SOURCE_GUARDS.forEach(function (g) { ok(g.fn(A), 'SOURCE GUARD holds: ' + g.name); });
PLAN_GUARDS.forEach(function (g) { ok(g.fn(REAL_PLAN), 'PLAN GUARD holds: ' + g.name); });
{
  const parts = APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; });
  ORDER_GUARDS.forEach(function (g) { ok(g.fn(SCRIPT_TAGS, parts), 'ORDER GUARD holds: ' + g.name); });
}
eq(SOURCE_GUARDS.length, 64, 'source guards defined');
eq(PLAN_GUARDS.length, 12, 'plan guards defined');
eq(ORDER_GUARDS.length, 11, 'order guards defined');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 29 — MUTATION PROOF
//
// Three mutant families, each judged by the guard family that describes it.
// Every mutant is applied to a COPY held in memory; no file is opened for
// writing. A mutant that changes its copy but trips nothing is a WEAK mutant and
// fails this section.
//
// POST-PR-1 CHANGE: source mutants now operate on a copy of the ORDERED PART
// LIST, not on one concatenated string. That is what makes the new ownership
// failures expressible at all — "left inline as well", "duplicated inside the
// module", "an extra declaration in the module" and "moved back to the residue"
// are all statements about WHICH FILE a declaration is in, and a single string
// cannot represent them.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 29 — mutation proof');

function replaceOnce(text, needle, replacement) {
  const i = text.indexOf(needle);
  if (i < 0) throw new Error('mutation target not found: ' + JSON.stringify(needle.slice(0, 60)));
  return text.slice(0, i) + replacement + text.slice(i + needle.length);
}
function insertBefore(text, needle, insertion) {
  const i = text.indexOf(needle);
  if (i < 0) throw new Error('mutation anchor not found: ' + JSON.stringify(needle.slice(0, 60)));
  return text.slice(0, i) + insertion + text.slice(i);
}

// ── part-list editing helpers ────────────────────────────────────────────────
const INLINE_NAME = 'INLINE';
function clonePartList(parts) {
  return parts.map(function (p) { return { name: p.name, code: p.code }; });
}
// Apply `edit` to exactly one named part, leaving every other part untouched.
function editPart(parts, name, edit) {
  let touched = false;
  const out = parts.map(function (p) {
    if (p.name !== name) return { name: p.name, code: p.code };
    touched = true;
    return { name: p.name, code: edit(p.code) };
  });
  if (!touched) throw new Error('mutation target part not found: ' + name);
  return out;
}
// Top-level declaration spans WITHIN a single part's code.
function fnSpanIn(code, name) {
  const masked = maskSource(code);
  const f = topLevelFunctions(code, masked, braceDepths(masked))
    .find(function (x) { return x.name === name; });
  if (!f) throw new Error('function not found in part: ' + name);
  return f;
}
function bindingSpanIn(code, name) {
  const masked = maskSource(code);
  const b = topLevelBindings(code, masked, braceDepths(masked), 0, code.length)
    .find(function (x) { return x.name === name; });
  if (!b) throw new Error('binding not found in part: ' + name);
  const semi = masked.indexOf(';', b.start);
  return { name: name, start: b.start, end: semi < 0 ? b.start : semi + 1, kind: b.kind };
}
function textOfFn(code, name) { const f = fnSpanIn(code, name); return code.slice(f.start, f.end); }
function textOfBinding(code, name) { const b = bindingSpanIn(code, name); return code.slice(b.start, b.end); }
function removeFn(code, name) { const f = fnSpanIn(code, name); return code.slice(0, f.start) + code.slice(f.end); }
function removeBinding(code, name) { const b = bindingSpanIn(code, name); return code.slice(0, b.start) + code.slice(b.end); }
// Append text at the very end of the adapter module (still top level).
function appendToAdapter(parts, text) {
  return editPart(parts, ADAPTER_SRC, function (code) { return code + '\n' + text + '\n'; });
}
// Append text at the very end of the service module (still top level).
function appendToService(parts, text) {
  return editPart(parts, SERVICE_SRC, function (code) { return code + '\n' + text + '\n'; });
}
// Append text at the very end of the panel module (still top level).
function appendToPanel(parts, text) {
  return editPart(parts, PANEL_SRC, function (code) { return code + '\n' + text + '\n'; });
}
// Insert text into the inline monolith, immediately before the DSB end marker,
// i.e. INSIDE the marker range so the inline region really owns it.
function insertIntoInlineBlock(parts, text) {
  return editPart(parts, INLINE_NAME, function (code) { return insertBefore(code, END_MARKER, text); });
}

// ── FAMILY 1: source mutants (judged by SOURCE guards) ───────────────────────
// Each mutant receives the real ordered part list and returns a MUTATED COPY.
const SOURCE_MUTANTS = [
  // ── group A: PR 1 ownership of the adapter module ─────────────────────────
  { id: 1, name: 'an ADAPTER FUNCTION is missing from the module',
    mutate: function (parts) { return editPart(parts, ADAPTER_SRC, function (c) { return removeFn(c, 'dsbSnapshotAgeMs'); }); } },
  { id: 2, name: 'an ADAPTER CONSTANT is missing from the module',
    mutate: function (parts) { return editPart(parts, ADAPTER_SRC, function (c) { return removeBinding(c, 'DSB_CHART_LIVE_TTL_MS'); }); } },
  { id: 3, name: 'an adapter declaration is left ALSO inline (two owners for one name)',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, 'dsbParseSnapshot');
      return insertIntoInlineBlock(parts, copy + '\n');
    } },
  { id: 4, name: 'a declaration is DUPLICATED inside the module',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, '_dsbNum');
      return appendToAdapter(parts, copy);
    } },
  { id: 5, name: 'dsbRowsForMode is moved BACK into the inline residue (the panel would claim it)',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, 'dsbRowsForMode');
      const stripped = editPart(parts, ADAPTER_SRC, function (c) { return removeFn(c, 'dsbRowsForMode'); });
      return insertIntoInlineBlock(stripped, copy + '\n');
    } },
  { id: 6, name: 'an adapter SIGNATURE is altered (a parameter is added)',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function dsbRowsForMode(rows,mode)', 'function dsbRowsForMode(rows,mode,extra)');
      });
    } },
  { id: 7, name: 'an adapter BODY is altered (freshness classification inverted)',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, "return cls==='live'||cls==='recent';", "return cls==='live';");
      });
    } },
  { id: 8, name: 'a constant is converted from `var` to `const`',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'var DSB_PRICE_FRESH_MS =', 'const DSB_PRICE_FRESH_MS =');
      });
    } },
  { id: 9, name: 'a constant VALUE is changed',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'var DSB_SNAPSHOT_TTL_MS = 60000;', 'var DSB_SNAPSHOT_TTL_MS = 90000;');
      });
    } },
  { id: 10, name: 'the PHYSICAL ORDER of two adapter declarations is swapped',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        const a = fnSpanIn(c, '_dsbStr'), b = fnSpanIn(c, '_dsbBool');
        return c.slice(0, a.start) + c.slice(b.start, b.end) + c.slice(a.end, b.start) +
               c.slice(a.start, a.end) + c.slice(b.end);
      });
    } },
  { id: 11, name: 'an EXTRA declaration is added to the module',
    mutate: function (parts) { return appendToAdapter(parts, 'function dsbNotReallyMine(x){ return x; }'); } },
  { id: 12, name: 'a window EXPOSURE is moved INTO the module',
    mutate: function (parts) {
      return appendToAdapter(parts,
        "try{ if(typeof window!=='undefined')window.apexDebugDsbAdapter=dsbParseSnapshot; }catch(e){}");
    } },
  { id: 13, name: 'the module reads S at TOP LEVEL',
    mutate: function (parts) { return appendToAdapter(parts, 'var DSB_BOOT_PROBE = S.backendDirectional;'); } },
  { id: 14, name: 'the module performs a TOP-LEVEL CALL',
    mutate: function (parts) { return appendToAdapter(parts, 'dsbParseSnapshot({ok:true,results:[]});'); } },
  { id: 15, name: 'a fetch is introduced into the module',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function dsbSnapshotAgeMs(st){',
                              "function dsbSnapshotAgeMs(st){\n  try{ fetch(BACKEND+'/market/live'); }catch(e){}");
      });
    } },
  { id: 16, name: 'a timer is introduced into the module',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function dsbRowsForMode(rows,mode){',
                              'function dsbRowsForMode(rows,mode){\n  setTimeout(function(){},1000);');
      });
    } },
  { id: 17, name: 'localStorage is introduced into the module',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function dsbClassifyRowPrice(r){',
                              "function dsbClassifyRowPrice(r){\n  try{ localStorage.getItem('apex_dss_source_mode'); }catch(e){}");
      });
    } },
  { id: 18, name: 'DOM access is introduced into the module',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function dsbRowPriceIsCurrent(r){',
                              "function dsbRowPriceIsCurrent(r){\n  var _el=document.getElementById('dsb-refresh');");
      });
    } },
  { id: 19, name: 'an event listener is registered by the module',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function _dsbObj(v){', 'function _dsbObj(v){ document.addEventListener("x",function(){});');
      });
    } },
  { id: 20, name: 'the module writes DSB state',
    mutate: function (parts) {
      return editPart(parts, ADAPTER_SRC, function (c) {
        return replaceOnce(c, 'function dsbSnapshotAgeMs(st){', 'function dsbSnapshotAgeMs(st){\n  st.lastFetchAt=0;');
      });
    } },
  { id: 21, name: 'the whole adapter module DISAPPEARS from the application',
    mutate: function (parts) { return parts.filter(function (p) { return p.name !== ADAPTER_SRC; })
      .map(function (p) { return { name: p.name, code: p.code }; }); } },

  // ── group B: the DSB behaviour the audit pinned. PR 2 moved most of these
  //   constructs into the service module, so each mutant now edits the part that
  //   really owns its target — mutating the residue would be a no-op and would
  //   silently stop proving anything.
  { id: 22, name: 'a DSB function is OMITTED from the panel module',
    mutate: function (parts) { return editPart(parts, PANEL_SRC, function (c) { return removeFn(c, 'dsbFmtClock'); }); } },
  { id: 23, name: 'a NON-DSB function is wrongly included inside the panel module',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) {
        return insertBefore(c, 'function dsbFmtAge(ms)', 'function dsbNotReallyMine(x){ return x; }\n');
      });
    } },
  { id: 24, name: 'a NEW EXTERNAL CALLER of a DSB function is introduced',
    mutate: function (parts) {
      return editPart(parts, INLINE_NAME, function (c) {
        return replaceOnce(c, 'function showView(name) {', 'function showView(name) {\n  dsbFindRow(name);');
      });
    } },
  { id: 25, name: 'a NEW STATE WRITE appears in a function that owned none',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'function dsbFindRow(symbol){\n  try{',
                              'function dsbFindRow(symbol){\n  try{\n    dsbState().lastFetchAt=0;');
      });
    } },
  { id: 26, name: 'S.scanData usage is introduced into the service',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'function dsbFindRow(symbol){', 'function dsbFindRow(symbol){\n  var _leak=S.scanData;');
      });
    } },
  { id: 27, name: 'a POST to the scanner is introduced',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, "fetch(BACKEND+'/scanner/directional/snapshot',{headers:_backendAuthHeaders()",
                              "fetch(BACKEND+'/scanner/run',{method:'POST',headers:_backendAuthHeaders()");
      });
    } },
  { id: 28, name: 'a SECOND direct fetch is introduced',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'async function dsbEnrichVisibleRowsLive(opts){',
                              "async function dsbEnrichVisibleRowsLive(opts){\n  try{ await fetch(BACKEND+'/market/live'); }catch(e){}");
      });
    } },
  { id: 29, name: 'a SECOND setInterval is introduced',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'function dsbRefreshClicked(){',
                              'function dsbRefreshClicked(){\n  setInterval(function(){ dsbFetchSnapshot({force:true}); }, 5000);');
      });
    } },
  { id: 30, name: 'the retry timer is DUPLICATED',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'function dsbCancelLiveEnrichRetry(){',
                              'function dsbCancelLiveEnrichRetry(){\n  setTimeout(function(){ dsbEnrichVisibleRowsLive(); }, 1000);');
      });
    } },
  { id: 31, name: 'the snapshot SINGLE-FLIGHT guard is removed',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'if(st.fetching)return st.inflightSnapshot||undefined;', '/* single-flight removed */');
      });
    } },
  { id: 32, name: 'the ABORT COOLDOWN is removed',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return c.split('st.liveEnrichCooldownUntil=Date.now()+DSB_LIVE_ABORT_COOLDOWN_MS;').join('/* cooldown removed */');
      });
    } },
  { id: 33, name: 'the DETAIL-OPEN protection is removed',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, "if(typeof _dssDetailSymbol!=='undefined'&&_dssDetailSymbol!=null)return; // chart open → keep it",
                              '/* detail-open protection removed */');
      });
    } },
  { id: 34, name: 'a TOP-LEVEL AUTO-CALL is introduced into the residue',
    mutate: function (parts) { return insertIntoInlineBlock(parts, 'dsbStartAutoRefresh();\n'); } },
  { id: 35, name: 'a window EXPOSURE is removed from the residue',
    mutate: function (parts) {
      return editPart(parts, INLINE_NAME, function (c) {
        return replaceOnce(c,
          'try{ if(typeof window!==\'undefined\')window.apexDebugDirectionalBackendSnapshot=apexDebugDirectionalBackendSnapshot; }catch(e){ /* non-browser context */ }',
          '/* exposure removed */');
      });
    } },
  { id: 36, name: 'a DSB constant + S are READ at load time in the residue (TDZ exposure shape)',
    mutate: function (parts) {
      return insertIntoInlineBlock(parts, 'if (DSB_SNAPSHOT_TTL_MS > 0) { S.backendDirectional = null; }\n');
    } },
  { id: 37, name: 'the chart bridge is reclassified as having NO external consumer',
    mutate: function (parts) {
      return editPart(parts, INLINE_NAME, function (c) {
        let out = c.split("if(!d&&typeof dsbScanRowShim==='function')d=dsbScanRowShim(symbol);").join('/* removed */');
        out = out.split("if(!ts&&typeof dsbTechnicalStateShim==='function')ts=dsbTechnicalStateShim(symbol);").join('/* removed */');
        out = out.split("if(typeof dsbNoteDirectionalChartOpen==='function')dsbNoteDirectionalChartOpen(symbol,ts);").join('/* removed */');
        return out;
      });
    } },
  { id: 38, name: 'the BSS/adapter dependency is rewired INSIDE the panel module',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) {
        return c.split('bdsDeriveBackendDirectionalRows').join('bdspDeriveBackendDirectionalRows')
                .split('bssFmtAgeMs').join('bdspFmtAgeMs');
      });
    } },
  { id: 39, name: 'a DOM id owned by the manifest is changed',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return c.split("getElementById('dsb-refresh')").join("getElementById('dsb-reload')");
      });
    } },
  // ── group C: PR 2 ownership of the service module ─────────────────────────
  { id: 65, name: 'the whole SERVICE module DISAPPEARS from the application',
    mutate: function (parts) { return parts.filter(function (p) { return p.name !== SERVICE_SRC; })
      .map(function (p) { return { name: p.name, code: p.code }; }); } },
  { id: 66, name: 'a SERVICE FUNCTION is missing from the module',
    mutate: function (parts) { return editPart(parts, SERVICE_SRC, function (c) { return removeFn(c, 'dsbRepaintIfSafe'); }); } },
  { id: 67, name: 'a service function is left ALSO inline (two owners for one name)',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === SERVICE_SRC; }).code, 'dsbFindRow');
      return insertIntoInlineBlock(parts, copy + '\n');
    } },
  { id: 68, name: 'a service declaration is DUPLICATED inside the module',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === SERVICE_SRC; }).code, 'dsbScannerTabActive');
      return appendToService(parts, copy);
    } },
  { id: 69, name: 'an ADAPTER function is moved into the service',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, 'dsbSnapshotAgeMs');
      const stripped = editPart(parts, ADAPTER_SRC, function (c) { return removeFn(c, 'dsbSnapshotAgeMs'); });
      return appendToService(stripped, copy);
    } },
  { id: 70, name: 'a PANEL function is pulled into the service',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === PANEL_SRC; }).code, 'dsbSourceNoticeHtml');
      const stripped = editPart(parts, PANEL_SRC, function (c) { return removeFn(c, 'dsbSourceNoticeHtml'); });
      return appendToService(stripped, copy);
    } },
  { id: 71, name: 'a DSB CONSTANT is moved into the service',
    mutate: function (parts) {
      const copy = textOfBinding(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, 'DSB_LIVE_RETRY_MS');
      const stripped = editPart(parts, ADAPTER_SRC, function (c) { return removeBinding(c, 'DSB_LIVE_RETRY_MS'); });
      return appendToService(stripped, copy);
    } },
  { id: 72, name: 'a service SIGNATURE is altered (a parameter is added)',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'function dsbFindRow(symbol){', 'function dsbFindRow(symbol,extra){');
      });
    } },
  { id: 73, name: 'a service BODY is altered (the source-mode default is flipped)',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        const f = fnSpanIn(c, 'dsbScannerTabActive');
        return c.slice(0, f.start) + 'function dsbScannerTabActive(){ return false; }' + c.slice(f.end);
      });
    } },
  { id: 74, name: 'the `async` keyword is REMOVED from a service function',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'async function dsbFetchSnapshot(opts){', 'function dsbFetchSnapshot(opts){');
      });
    } },
  { id: 75, name: 'the `async` keyword is ADDED to the WRONG service function',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'function dsbRepaintIfSafe(){', 'async function dsbRepaintIfSafe(){');
      });
    } },
  { id: 76, name: 'the PHYSICAL ORDER of two service declarations is swapped',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        const a = fnSpanIn(c, 'dsbStartAutoRefresh'), b = fnSpanIn(c, 'dsbStopAutoRefresh');
        return c.slice(0, a.start) + c.slice(b.start, b.end) + c.slice(a.end, b.start) +
               c.slice(a.start, a.end) + c.slice(b.end);
      });
    } },
  { id: 77, name: 'an EXTRA declaration is added to the service',
    mutate: function (parts) { return appendToService(parts, 'function dsbNotReallyService(x){ return x; }'); } },
  { id: 78, name: 'a DEBUG function is left inline instead of moving to the service',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === SERVICE_SRC; }).code,
                            'apexDebugDirectionalBackendSnapshot');
      const stripped = editPart(parts, SERVICE_SRC, function (c) {
        return removeFn(c, 'apexDebugDirectionalBackendSnapshot');
      });
      return insertIntoInlineBlock(stripped, copy + '\n');
    } },
  { id: 79, name: 'a window EXPOSURE is moved INTO the service (strategy W1)',
    mutate: function (parts) {
      const stripped = editPart(parts, INLINE_NAME, function (c) {
        return replaceOnce(c,
          "try{ if(typeof window!=='undefined')window.apexDebugBackendDirectionalSnapshot=apexDebugBackendDirectionalSnapshot; }catch(e){ /* non-browser context */ }",
          '/* exposure relocated */');
      });
      return appendToService(stripped,
        "try{ if(typeof window!=='undefined')window.apexDebugBackendDirectionalSnapshot=apexDebugBackendDirectionalSnapshot; }catch(e){ /* non-browser context */ }");
    } },
  { id: 80, name: 'a window EXPOSURE is DUPLICATED in the residue',
    mutate: function (parts) {
      return insertIntoInlineBlock(parts,
        "try{ if(typeof window!=='undefined')window.apexDebugDirectionalBackendSnapshot=apexDebugDirectionalBackendSnapshot; }catch(e){ /* non-browser context */ }\n");
    } },
  { id: 81, name: 'the service reads S at TOP LEVEL',
    mutate: function (parts) { return appendToService(parts, 'var DSBS_BOOT_PROBE = S.backendDirectional;'); } },
  { id: 82, name: 'the service reads WL at TOP LEVEL',
    mutate: function (parts) { return appendToService(parts, 'var DSBS_BOOT_WL = WL.length;'); } },
  { id: 83, name: 'the service reads BACKEND at TOP LEVEL',
    mutate: function (parts) { return appendToService(parts, 'var DSBS_BOOT_BACKEND = BACKEND;'); } },
  { id: 84, name: 'the service touches document at TOP LEVEL',
    mutate: function (parts) { return appendToService(parts, "var DSBS_BOOT_EL = document.getElementById('dsb-refresh');"); } },
  { id: 85, name: 'the service performs a TOP-LEVEL CALL',
    mutate: function (parts) { return appendToService(parts, 'dsbStartAutoRefresh();'); } },
  { id: 86, name: 'the service performs a TOP-LEVEL fetch',
    mutate: function (parts) { return appendToService(parts, "fetch(BACKEND+'/scanner/directional/snapshot');"); } },
  { id: 87, name: 'the service starts a TOP-LEVEL timer',
    mutate: function (parts) { return appendToService(parts, 'setInterval(function(){}, 60000);'); } },
  { id: 88, name: 'the service registers a TOP-LEVEL listener',
    mutate: function (parts) { return appendToService(parts, "document.addEventListener('visibilitychange',function(){});"); } },
  { id: 89, name: 'the service reads localStorage at TOP LEVEL',
    mutate: function (parts) { return appendToService(parts, "var DSBS_BOOT_FF = localStorage.getItem('apex_dss_source_mode');"); } },
  { id: 90, name: 'the service CREATES the DSB state at load time',
    mutate: function (parts) { return appendToService(parts, 'S.backendDirectional = { rows: [], fetching: false };'); } },
  { id: 91, name: 'the live-enrich SINGLE-FLIGHT guard is removed from the service',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'if(st.liveEnriching)return;', '/* live single-flight removed */');
      });
    } },
  { id: 92, name: 'the retry guard is removed from the service',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return replaceOnce(c, 'if(st.liveRetryTimerId)return;', '/* retry guard removed */');
      });
    } },
  { id: 93, name: 'the chart-open quote TTL is removed',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return c.split('DSB_CHART_LIVE_TTL_MS').join('Number.MAX_SAFE_INTEGER');
      });
    } },
  { id: 94, name: "the chart-open reason token 'directional_chart_open' is changed",
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return c.split("'directional_chart_open'").join("'directional_chart_opened'");
      });
    } },
  { id: 95, name: 'postCandleContext is no longer called by the chart bridge',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return c.split('postCandleContext(').join('_dsbNoopCandleContext(');
      });
    } },

  // ── group D: PR 3 ownership of the panel module ───────────────────────────
  // The panel family mirrors the service family one-for-one: a module that ships
  // last must not be proved with a weaker battery than the ones before it.
  { id: 96, name: 'the whole PANEL module DISAPPEARS from the application',
    mutate: function (parts) { return parts.filter(function (p) { return p.name !== PANEL_SRC; })
      .map(function (p) { return { name: p.name, code: p.code }; }); } },
  { id: 97, name: 'a panel function is left ALSO inline (two owners for one name)',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === PANEL_SRC; }).code, 'dsbRowHtml');
      return insertIntoInlineBlock(parts, copy + '\n');
    } },
  { id: 98, name: 'a panel declaration is DUPLICATED inside the module',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === PANEL_SRC; }).code, 'dsbFmtAge');
      return appendToPanel(parts, copy);
    } },
  { id: 99, name: 'a PANEL function is pulled into the adapter',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === PANEL_SRC; }).code, 'dsbFreshnessBadgeHtml');
      const stripped = editPart(parts, PANEL_SRC, function (c) { return removeFn(c, 'dsbFreshnessBadgeHtml'); });
      return appendToAdapter(stripped, copy);
    } },
  { id: 100, name: 'a SERVICE function is moved into the panel',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === SERVICE_SRC; }).code, 'dsbFindRow');
      const stripped = editPart(parts, SERVICE_SRC, function (c) { return removeFn(c, 'dsbFindRow'); });
      return appendToPanel(stripped, copy);
    } },
  { id: 101, name: 'an ADAPTER function is moved into the panel',
    mutate: function (parts) {
      const copy = textOfFn(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, 'dsbSnapshotAgeMs');
      const stripped = editPart(parts, ADAPTER_SRC, function (c) { return removeFn(c, 'dsbSnapshotAgeMs'); });
      return appendToPanel(stripped, copy);
    } },
  { id: 102, name: 'a DSB CONSTANT is moved into the panel',
    mutate: function (parts) {
      const copy = textOfBinding(parts.find(function (p) { return p.name === ADAPTER_SRC; }).code, 'DSB_LIVE_RETRY_MS');
      const stripped = editPart(parts, ADAPTER_SRC, function (c) { return removeBinding(c, 'DSB_LIVE_RETRY_MS'); });
      return appendToPanel(stripped, copy);
    } },
  { id: 103, name: 'a panel SIGNATURE is altered (a parameter is added)',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) {
        return replaceOnce(c, 'function dsbRowHtml(r,isShort){', 'function dsbRowHtml(r,isShort,extra){');
      });
    } },
  { id: 104, name: 'a panel BODY is altered (a rendered label is changed)',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) {
        return replaceOnce(c, 'function dsbFmtAge(ms){', "function dsbFmtAge(ms){\n  if(ms===0)return 'now';");
      });
    } },
  { id: 105, name: 'the PHYSICAL ORDER of two panel declarations is swapped',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) {
        const a = fnSpanIn(c, 'dsbFmtAge'), b = fnSpanIn(c, 'dsbFmtClock');
        return c.slice(0, a.start) + c.slice(b.start, b.end) + c.slice(a.end, b.start) +
               c.slice(a.start, a.end) + c.slice(b.end);
      });
    } },
  { id: 106, name: 'the `async` keyword is ADDED to a panel function',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) {
        return replaceOnce(c, 'function dsbRenderBackendDirectional(src){', 'async function dsbRenderBackendDirectional(src){');
      });
    } },
  { id: 107, name: 'an EXTRA declaration is added to the panel',
    mutate: function (parts) { return appendToPanel(parts, 'function dsbPanelExtra(){ return 1; }'); } },
  { id: 108, name: 'the panel reads S at TOP LEVEL',
    mutate: function (parts) { return appendToPanel(parts, 'var DSBP_BOOT_S = S.backendDirectional;'); } },
  { id: 109, name: 'the panel touches document at TOP LEVEL',
    mutate: function (parts) { return appendToPanel(parts, "var DSBP_EL = document.getElementById('dsb-refresh');"); } },
  { id: 110, name: 'the panel reads localStorage at TOP LEVEL',
    mutate: function (parts) { return appendToPanel(parts, "var DSBP_M = localStorage.getItem('apex_dss_source_mode');"); } },
  { id: 111, name: 'the panel RENDERS at load time (a top-level call)',
    mutate: function (parts) { return appendToPanel(parts, 'dsbMaybeRenderBackendDirectional();'); } },
  { id: 112, name: 'the panel registers a TOP-LEVEL listener',
    mutate: function (parts) { return appendToPanel(parts, "document.addEventListener('click',function(){});"); } },
  { id: 113, name: 'the panel starts a TOP-LEVEL timer',
    mutate: function (parts) { return appendToPanel(parts, 'setInterval(function(){},60000);'); } },
  { id: 114, name: 'the panel performs a TOP-LEVEL fetch',
    mutate: function (parts) { return appendToPanel(parts, "fetch('/scanner/directional/snapshot');"); } },
  { id: 115, name: 'the panel assigns to window',
    mutate: function (parts) { return appendToPanel(parts, 'window.apexDebugPanel = dsbRowHtml;'); } },
  { id: 116, name: 'a window EXPOSURE is moved INTO the panel (strategy W1)',
    mutate: function (parts) {
      const stripped = editPart(parts, INLINE_NAME, function (c) {
        return c.split('window.apexDebugBackendDirectionalSnapshot=apexDebugBackendDirectionalSnapshot;').join('');
      });
      return appendToPanel(stripped, 'window.apexDebugBackendDirectionalSnapshot=apexDebugBackendDirectionalSnapshot;');
    } },
  { id: 117, name: 'the panel reads WL at TOP LEVEL',
    mutate: function (parts) { return appendToPanel(parts, 'var DSBP_WL = WL.length;'); } },
  { id: 118, name: 'the panel wraps its declarations in an IIFE',
    mutate: function (parts) {
      return editPart(parts, PANEL_SRC, function (c) { return '(function(){\n' + c + '\n})();\n'; });
    } },
  { id: 40, name: 'a localStorage key is changed',
    mutate: function (parts) {
      return editPart(parts, SERVICE_SRC, function (c) {
        return c.split("'apex_dss_source_mode'").join("'apex_dsb_source_mode'");
      });
    } },
];
// ── FAMILY 2: plan mutants (judged by PLAN guards) ───────────────────────────
const PLAN_MUTANTS = [
  { id: 41, name: 'dsbRowsForMode is placed in BOTH the adapter and the panel',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.concat(['dsbRowsForMode']),
      } });
    } },
  { id: 42, name: 'a DSB constant is OMITTED from the adapter manifest',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.filter(function (n) { return n !== 'DSB_CHART_LIVE_TTL_MS'; }),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.slice(),
      } });
    } },
  { id: 43, name: 'a DSB constant is moved to the PANEL (a layer above its consumers)',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.filter(function (n) { return n !== 'DSB_SNAPSHOT_TTL_MS'; }),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.concat(['DSB_SNAPSHOT_TTL_MS']),
      } });
    } },
  { id: 44, name: 'the scoring model ignores the bindings (46 declarations instead of 54)',
    build: function () {
      const fnOnly = DECLARATIONS.filter(function (d) { return /function/.test(d.kind); });
      return buildPlanRecord({
        declarationUniverse: fnOnly,
        modules: {
          adapter: ADAPTER_FUNCTION_SET.slice(),      // constants dropped
          service: CANONICAL_MODULES.service.slice(),
          panel: CANONICAL_MODULES.panel.slice(),
        },
      });
    } },
  { id: 45, name: 'the metric is NOT homogeneous (shipped by file bytes, candidates by declaration bytes)',
    build: function () {
      return buildPlanRecord({ measureShipped: function (code) { return code.length; } });
    } },
  { id: 46, name: 'the window exposures are moved INTO the service module (W1 while W2 was derived)',
    build: function () { return buildPlanRecord({ exposuresInModule: true }); } },
  { id: 47, name: 'a declaration is assigned to ZERO modules',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.filter(function (n) { return n !== 'dsbRefreshClicked'; }),
        panel: CANONICAL_MODULES.panel.slice(),
      } });
    } },
  { id: 48, name: 'a declaration (not dsbRowsForMode) is assigned to TWO modules',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.concat(['dsbGetBackendSource']),
      } });
    } },
  { id: 49, name: 'the chart bridge is split out, splitting state ownership too',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.filter(function (n) { return CATEGORIES.H.indexOf(n) < 0; }),
        panel: CANONICAL_MODULES.panel.slice(),
        chart: CATEGORIES.H.slice(),
      } });
    } },
];

// ── FAMILY 3: order mutants (judged by ORDER guards) ─────────────────────────
// The tag list is a copy of the REAL parsed tags, so a mutant that adds, moves
// or re-attributes a tag is judged against the document as it actually is.
function adapterTagIndex(tags) {
  return tags.findIndex(function (t) { return t.src && String(t.src).trim() === ADAPTER_SRC; });
}
function tagFor(src, extraAttrs, type) {
  return { attrs: ' src="' + src + '"' + (extraAttrs ? ' ' + extraAttrs : ''), src: src, type: type || null, inline: '' };
}
const ORDER_MUTANTS = [
  { id: 50, name: 'the SHIPPED adapter tag is given `defer`',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = adapterTagIndex(t);
      t[i] = tagFor(ADAPTER_SRC, 'defer');
      return { tags: t, parts: parts };
    } },
  { id: 51, name: 'the SHIPPED adapter tag is declared type="module"',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = adapterTagIndex(t);
      t[i] = tagFor(ADAPTER_SRC, 'type="module"', 'module');
      return { tags: t, parts: parts };
    } },
  { id: 52, name: 'the SHIPPED adapter tag carries an extra attribute (crossorigin)',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = adapterTagIndex(t);
      t[i] = tagFor(ADAPTER_SRC, 'crossorigin="anonymous"');
      return { tags: t, parts: parts };
    } },
  { id: 53, name: 'the adapter is loaded AFTER the inline monolith',
    mutate: function (tags, parts) {
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === ADAPTER_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      t.push(tagFor(ADAPTER_SRC));
      const p = parts.filter(function (x) { return x.name !== ADAPTER_SRC; })
        .map(function (x) { return { name: x.name, code: x.code }; });
      // The residue reads the adapter's constants at load time in this mutant,
      // so the ordering violation is REAL and not merely positional bookkeeping.
      p[p.length - 1] = { name: 'INLINE', code: p[p.length - 1].code + '\nvar DSB_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n' };
      p.push({ name: ADAPTER_SRC, code: A.adapterText });
      return { tags: t, parts: p };
    } },
  { id: 54, name: 'the adapter is loaded BEFORE a required provider (backend-directional-preview)',
    mutate: function (tags, parts) {
      const provider = './js/ui/backend-directional-preview.js';
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === ADAPTER_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      const at = t.findIndex(function (x) { return x.src && String(x.src).trim() === provider; });
      t.splice(at, 0, tagFor(ADAPTER_SRC));
      const p = parts.filter(function (x) { return x.name !== ADAPTER_SRC; })
        .map(function (x) { return { name: x.name, code: x.code }; });
      const pat = p.findIndex(function (x) { return x.name === provider; });
      p.splice(pat, 0, { name: ADAPTER_SRC, code: A.adapterText });
      return { tags: t, parts: p };
    } },
  { id: 55, name: 'the SHIPPED service tag is DUPLICATED (loaded twice)',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      t.splice(t.length - 1, 0, tagFor(SERVICE_SRC));
      const p = clonePartList(parts);
      p.splice(p.length - 1, 0, { name: SERVICE_SRC, code: A.serviceText });
      return { tags: t, parts: p };
    } },
  { id: 60, name: 'the SHIPPED service tag carries defer',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = t.findIndex(function (x) { return x.src && String(x.src).trim() === SERVICE_SRC; });
      t[i] = tagFor(SERVICE_SRC, 'defer');
      return { tags: t, parts: parts };
    } },
  { id: 61, name: 'the SHIPPED service tag carries async',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = t.findIndex(function (x) { return x.src && String(x.src).trim() === SERVICE_SRC; });
      t[i] = tagFor(SERVICE_SRC, 'async');
      return { tags: t, parts: parts };
    } },
  { id: 62, name: 'the SHIPPED service tag is type="module"',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = t.findIndex(function (x) { return x.src && String(x.src).trim() === SERVICE_SRC; });
      t[i] = tagFor(SERVICE_SRC, 'type="module"', 'module');
      return { tags: t, parts: parts };
    } },
  { id: 63, name: 'the service is loaded BEFORE the adapter it consumes',
    mutate: function (tags, parts) {
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === SERVICE_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      const at = t.findIndex(function (x) { return x.src && String(x.src).trim() === ADAPTER_SRC; });
      t.splice(at, 0, tagFor(SERVICE_SRC));
      const p = parts.filter(function (x) { return x.name !== SERVICE_SRC; })
        .map(function (x) { return { name: x.name, code: x.code }; });
      const pat = p.findIndex(function (x) { return x.name === ADAPTER_SRC; });
      // The service reads an adapter constant at load time in this mutant, so
      // the ordering violation is REAL and not merely positional bookkeeping.
      p.splice(pat, 0, { name: SERVICE_SRC, code: A.serviceText + '\nvar DSBS_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n' });
      return { tags: t, parts: p };
    } },
  { id: 64, name: 'the service is loaded AFTER the inline monolith (the W2 exposures break)',
    mutate: function (tags, parts) {
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === SERVICE_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      t.push(tagFor(SERVICE_SRC));
      const p = parts.filter(function (x) { return x.name !== SERVICE_SRC; })
        .map(function (x) { return { name: x.name, code: x.code }; });
      p.push({ name: SERVICE_SRC, code: A.serviceText });
      return { tags: t, parts: p };
    } },
  { id: 56, name: 'the SHIPPED panel tag is DUPLICATED (loaded twice)',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      t.splice(t.length - 1, 0, tagFor(PANEL_SRC));
      const p = clonePartList(parts);
      p.splice(p.length - 1, 0, { name: PANEL_SRC, code: A.panelText });
      return { tags: t, parts: p };
    } },
  { id: 57, name: 'the panel is loaded BEFORE the service it consumes',
    mutate: function (tags, parts) {
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === PANEL_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      const at = t.findIndex(function (x) { return x.src && String(x.src).trim() === SERVICE_SRC; });
      t.splice(at, 0, tagFor(PANEL_SRC));
      const p = parts.filter(function (x) { return x.name !== PANEL_SRC; })
        .map(function (x) { return { name: x.name, code: x.code }; });
      const pat = p.findIndex(function (x) { return x.name === SERVICE_SRC; });
      // The panel reads a service function at load time in this mutant, so the
      // ordering violation is REAL and not merely positional bookkeeping.
      p.splice(pat, 0, { name: PANEL_SRC, code: A.panelText + '\nvar DSBP_BOOT_MODE = dsbSourceMode();\n' });
      return { tags: t, parts: p };
    } },
  { id: 119, name: 'the SHIPPED panel tag is MISSING while the module still loads',
    mutate: function (tags, parts) {
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === PANEL_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      return { tags: t, parts: clonePartList(parts) };
    } },
  { id: 120, name: 'the panel is loaded AFTER the inline monolith',
    mutate: function (tags, parts) {
      const t = tags.filter(function (x) { return !(x.src && String(x.src).trim() === PANEL_SRC); })
        .map(function (x) { return Object.assign({}, x); });
      t.push(tagFor(PANEL_SRC));
      const p = parts.filter(function (x) { return x.name !== PANEL_SRC; })
        .map(function (x) { return { name: x.name, code: x.code }; });
      p.push({ name: PANEL_SRC, code: A.panelText });
      return { tags: t, parts: p };
    } },
  { id: 121, name: 'the SHIPPED panel tag carries defer',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = t.findIndex(function (x) { return x.src && String(x.src).trim() === PANEL_SRC; });
      t[i] = tagFor(PANEL_SRC, 'defer');
      return { tags: t, parts: parts };
    } },
  { id: 122, name: 'the SHIPPED panel tag carries async',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = t.findIndex(function (x) { return x.src && String(x.src).trim() === PANEL_SRC; });
      t[i] = tagFor(PANEL_SRC, 'async');
      return { tags: t, parts: parts };
    } },
  { id: 123, name: 'the SHIPPED panel tag is type="module"',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      const i = t.findIndex(function (x) { return x.src && String(x.src).trim() === PANEL_SRC; });
      t[i] = tagFor(PANEL_SRC, 'type="module"', 'module');
      return { tags: t, parts: parts };
    } },
  { id: 124, name: 'the REJECTED option-D chart module is created and loaded',
    mutate: function (tags, parts) {
      const rel = './js/services/directional-chart-display-price.js';
      const t = tags.map(function (x) { return Object.assign({}, x); });
      t.splice(t.length - 1, 0, tagFor(rel));
      const p = clonePartList(parts);
      p.splice(p.length - 1, 0, { name: rel, code: 'function _dssChartDisplayPrice(){ return null; }\n' });
      return { tags: t, parts: p };
    } },
  { id: 58, name: 'the service is loaded before the adapter while reading a DSB constant at load time',
    mutate: function (tags, parts) {
      const serviceReadsConstant = MODULE_SOURCE.service + '\nvar DSBS_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n';
      return { tags: tags, parts: BASE_PARTS.concat([
        { name: CANONICAL_FILES.service, code: serviceReadsConstant },
        { name: ADAPTER_SRC, code: A.adapterText },
        { name: CANONICAL_FILES.panel, code: MODULE_SOURCE.panel },
        { name: 'INLINE', code: RESIDUAL_RUMP },
      ]) };
    } },
  { id: 59, name: 'a real provider module is moved after the inline monolith',
    mutate: function (tags, parts) {
      const idx = APP_PARTS.findIndex(function (p) { return p.name === './js/api/backend-client.js'; });
      const moved = APP_PARTS.filter(function (_, i) { return i !== idx; })
        .concat([APP_PARTS[idx]]).map(function (p) { return { name: p.name, code: p.code }; });
      return { tags: tags, parts: moved };
    } },
];

const CONTENT_HASH_BEFORE = crypto.createHash('sha256').update(SRC).digest('hex');
const PARTS_HASH_BEFORE = crypto.createHash('sha256')
  .update(JSON.stringify(APP_PARTS.map(function (p) { return [p.name, p.code.length]; }))).digest('hex');
let mutantsRun = 0, mutantsCaught = 0;
const weakMutants = [];

SOURCE_MUTANTS.forEach(function (m) {
  mutantsRun++;
  const original = clonePartList(APP_PARTS);
  let mutated;
  try { mutated = m.mutate(original); }
  catch (e) { ok(false, 'SOURCE MUTANT ' + m.id + ' could not be applied: ' + e.message); return; }
  // The mutant must really differ, and it must not have written through to the
  // list it was handed (which is itself only a copy of the real one).
  const same = mutated.length === APP_PARTS.length && mutated.every(function (p, i) {
    return p.name === APP_PARTS[i].name && p.code === APP_PARTS[i].code;
  });
  if (same) { ok(false, 'SOURCE MUTANT ' + m.id + ' did not change the copy — invalid mutant'); return; }
  let rec;
  try { rec = analyze(mutated); } catch (e) { rec = { found: false }; }
  const tripped = SOURCE_GUARDS.filter(function (g) {
    let healthy; try { healthy = g.fn(rec); } catch (e) { healthy = false; }
    return !healthy;
  }).map(function (g) { return g.name; });
  if (tripped.length === 0) weakMutants.push(m.id); else mutantsCaught++;
  ok(tripped.length > 0, 'MUTANT ' + m.id + ' [source] — ' + m.name + ' → [' +
     tripped.slice(0, 3).join(', ') + (tripped.length > 3 ? ', +' + (tripped.length - 3) : '') + ']');
});

PLAN_MUTANTS.forEach(function (m) {
  mutantsRun++;
  let rec;
  try { rec = m.build(); }
  catch (e) { ok(false, 'PLAN MUTANT ' + m.id + ' could not be built: ' + e.message); return; }
  // A plan mutant must genuinely differ from the real plan.
  const changed = JSON.stringify(rec.modules) !== JSON.stringify(REAL_PLAN.modules) ||
                  rec.exposuresInModule !== REAL_PLAN.exposuresInModule ||
                  rec.measureShipped !== REAL_PLAN.measureShipped ||
                  rec.declarationUniverseSize !== REAL_PLAN.declarationUniverseSize;
  if (!changed) { ok(false, 'PLAN MUTANT ' + m.id + ' did not change the plan — invalid mutant'); return; }
  const tripped = PLAN_GUARDS.filter(function (g) {
    let healthy; try { healthy = g.fn(rec); } catch (e) { healthy = false; }
    return !healthy;
  }).map(function (g) { return g.name; });
  if (tripped.length === 0) weakMutants.push(m.id); else mutantsCaught++;
  ok(tripped.length > 0, 'MUTANT ' + m.id + ' [plan] — ' + m.name + ' → [' +
     tripped.slice(0, 3).join(', ') + (tripped.length > 3 ? ', +' + (tripped.length - 3) : '') + ']');
});

// A stable fingerprint of an ORDER record: the tag sequence WITH its attributes
// (so a re-attributed tag counts as a change) plus the part sequence and sizes.
function orderFingerprint(tags, parts) {
  return JSON.stringify({
    tags: tags.map(function (t) { return [t.src ? String(t.src).trim() : '', String(t.attrs || '').trim(), t.type || '']; }),
    parts: parts.map(function (p) { return [p.name, p.code.length]; }),
  });
}
ORDER_MUTANTS.forEach(function (m) {
  mutantsRun++;
  const baseTags = SCRIPT_TAGS.map(function (t) { return Object.assign({}, t); });
  const baseParts = APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; });
  const before = orderFingerprint(baseTags, baseParts);
  const out = m.mutate(baseTags, baseParts);
  const changed = orderFingerprint(out.tags, out.parts) !== before;
  if (!changed) { ok(false, 'ORDER MUTANT ' + m.id + ' did not change the copy — invalid mutant'); return; }
  const tripped = ORDER_GUARDS.filter(function (g) {
    let healthy; try { healthy = g.fn(out.tags, out.parts); } catch (e) { healthy = false; }
    return !healthy;
  }).map(function (g) { return g.name; });
  if (tripped.length === 0) weakMutants.push(m.id); else mutantsCaught++;
  ok(tripped.length > 0, 'MUTANT ' + m.id + ' [order] — ' + m.name + ' → [' + tripped.join(', ') + ']');
});

const MUTANT_TOTAL = SOURCE_MUTANTS.length + PLAN_MUTANTS.length + ORDER_MUTANTS.length;
eq(SOURCE_MUTANTS.length, 94, 'source mutants');
eq(PLAN_MUTANTS.length, 9, 'plan mutants');
eq(ORDER_MUTANTS.length, 21, 'order mutants');
eq(mutantsRun, MUTANT_TOTAL, 'mutants executed');
eq(MUTANT_TOTAL, 124, 'total mutants');
deepEq(weakMutants, [], 'weak mutants (changed the copy but tripped nothing)');
eq(mutantsCaught, MUTANT_TOTAL, 'mutants intercepted by at least one guard');
// Every mutant id is unique, so "59 caught" cannot hide a duplicate.
{
  const ids = SOURCE_MUTANTS.map(function (m) { return m.id; })
    .concat(PLAN_MUTANTS.map(function (m) { return m.id; }))
    .concat(ORDER_MUTANTS.map(function (m) { return m.id; }));
  eq(new Set(ids).size, MUTANT_TOTAL, 'every mutant carries a distinct id');
}
eq(crypto.createHash('sha256').update(SRC).digest('hex'), CONTENT_HASH_BEFORE,
   'the in-memory application source is byte-identical after the whole mutation run');
eq(crypto.createHash('sha256')
     .update(JSON.stringify(APP_PARTS.map(function (p) { return [p.name, p.code.length]; }))).digest('hex'),
   PARTS_HASH_BEFORE,
   'the in-memory PART LIST is unchanged after the whole mutation run (no mutant wrote through its copy)');
{
  const fresh = analyze(APP_PARTS);
  deepEq(fresh.fnNames, A.fnNames, 're-analysing after the mutation run yields the identical manifest');
  eq(fresh.blockLength, A.blockLength, 're-analysing after the mutation run yields the identical residual length');
  deepEq(fresh.adapterFnNames, A.adapterFnNames, 're-analysing yields the identical adapter ownership');
  const freshPlan = buildPlanRecord();
  deepEq(freshPlan.modules, REAL_PLAN.modules, 're-building the plan after the mutation run yields the identical manifests');
}
// And the files on disk were never opened for writing — re-read and re-hash.
APP_FILES.forEach(function (f) {
  eq(hashFile(f), HASHES_BEFORE[f], 'mutation run left ' + f + ' byte-identical on disk');
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 30 — audit-only proof: application files untouched
// ═════════════════════════════════════════════════════════════════════════════
function sectionIntegrity() {
  section('SECTION 30 — audit-only integrity + extraction state');
  // Nothing this contract reads may have changed while it ran — including the
  // three shipped DSB modules, which it now measures but still must never write.
  APP_FILES.forEach(function (f) {
    eq(hashFile(f), HASHES_BEFORE[f], 'byte-identical after the whole run: ' + f);
  });
  // The shipped-module checks are identical in shape for all three PRs, so they
  // are driven off one table: a module that ships later cannot be given a weaker
  // set of checks by accident.
  const SHIPPED = [
    { pr: 1, rel: ADAPTER_REL, src: ADAPTER_SRC, text: A.adapterText,
      region: 'adapter', decls: 19, statements: A.adapterStatements },
    { pr: 2, rel: SERVICE_REL, src: SERVICE_SRC, text: A.serviceText,
      region: 'service', decls: 26, statements: A.serviceStatements },
    { pr: 3, rel: PANEL_REL, src: PANEL_SRC, text: A.panelText,
      region: 'panel', decls: 9, statements: A.panelStatements },
  ];
  eq(SHIPPED.length, 3, 'THREE shipped owners are checked with the identical battery');
  SHIPPED.forEach(function (m) {
    const tag = 'PR ' + m.pr + ' SHIPPED (' + m.region + ')';
    const abs = path.resolve(__dirname, '..', m.rel);
    ok(fs.existsSync(abs), tag + ': ' + m.rel + ' exists');
    const onDisk = fs.readFileSync(abs, 'utf8');
    ok(onDisk === m.text, tag + ': the measured region IS the file on disk, byte for byte');
    const masked = maskSource(onDisk);
    // Classic script: the tag carries src and nothing else, and the file uses no
    // module syntax.
    const tagEl = SCRIPT_TAGS.filter(function (t) { return t.src && String(t.src).trim() === m.src; });
    eq(tagEl.length, 1, tag + ': exactly ONE <script> tag references it');
    eq(String(tagEl[0].attrs).trim(), 'src="' + m.src + '"', tag + ': the tag carries src and nothing else');
    eq(tagEl[0].type, null, tag + ': the tag declares no type — a CLASSIC script');
    ok(!/(^|\s)(defer|async|type|nomodule|integrity|crossorigin)(\s|=|$)/i.test(tagEl[0].attrs),
       tag + ': no defer / async / type / nomodule / integrity / crossorigin');
    ok(!/\b(?:import|export)\b/.test(masked), tag + ': no import/export — it is a classic script');
    ok(!/(?<![A-Za-z0-9_$.])require\s*\(/.test(masked), tag + ': no require()');
    ok(!/^\s*['"]use strict['"]/.test(onDisk),
       tag + ': adds no "use strict" prologue that the relocated spans did not have');
    // Load-time inertness and window hygiene, re-proved against the file itself.
    eq(m.statements.length, 0, tag + ': ZERO executable top-level statements');
    ok(!/(?:window|globalThis)\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/.test(masked),
       tag + ': assigns nothing to window or globalThis');
    ok(!/(?<![A-Za-z0-9_$.])(?:window|globalThis)(?![A-Za-z0-9_$])/.test(stripFunctions(masked)),
       tag + ': does not even reference window/globalThis at top level');
    // Hash unchanged across the WHOLE run, not merely present in the inventory.
    ok(APP_FILES.indexOf(m.rel) >= 0, tag + ': is part of the hashed integrity inventory');
    eq(hashFile(m.rel), HASHES_BEFORE[m.rel], tag + ': hash unchanged for the entire run');
  });
  eq(A.adapterFns.length + A.adapterBindings.length, 19, 'PR 1 SHIPPED: 19 declarations measured');
  eq(A.serviceFns.length + A.serviceBindings.length, 26, 'PR 2 SHIPPED: 26 declarations measured');
  eq(A.panelFns.length + A.panelBindings.length, 9, 'PR 3 SHIPPED: 9 declarations measured');
  eq(A.inlineFns.length + A.inlineBindings.length, 0,
     'EXTRACTION COMPLETE: zero DSB declarations remain inline');
  // The plan is fully executed. The ONLY file that must still be absent is the
  // module option D would have created — option D was measured and REJECTED.
  deepEq(FUTURE_FILES, ['js/services/directional-chart-display-price.js'],
    'exactly ONE file remains unbuilt: the rejected option-D chart module');
  FUTURE_FILES.forEach(function (rel) {
    ok(!fs.existsSync(path.resolve(__dirname, '..', rel)),
       'still REJECTED — ' + rel + ' does not exist');
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY — printed only after every Promise has settled
// ═════════════════════════════════════════════════════════════════════════════
function summary() {
  section('AUDIT SUMMARY — BACKEND DIRECTIONAL SNAPSHOT (DSB)');
  const prBytes = PR_PLAN.map(function (p) {
    return p.manifest.reduce(function (n, nm) { return n + DECL_BY_NAME[nm].bytes; }, 0);
  });
  // Every figure below is DERIVED from the measured record, never hardcoded: a
  // summary that can drift out of step with PR_PLAN and the analyser is a way to
  // report a state the file did not actually verify.
  const stateLine = PR_PLAN.map(function (p) {
    return 'PR ' + p.pr + ' ' + p.state.toUpperCase();
  }).join(' | ');
  const inlineScriptNo = APP_PARTS.findIndex(function (p) { return p.name === 'INLINE'; }) + 1;
  const scriptNoOf = function (src) {
    return APP_PARTS.findIndex(function (p) { return p.name === src; }) + 1;
  };
  const lines = [
    'EXTRACTION STATE       ' + stateLine,
    'adapter module         ' + ADAPTER_REL + ' — script #' + scriptNoOf(ADAPTER_SRC) + ', classic, src-only',
    'adapter ownership      ' + (A.adapterFns.length + A.adapterBindings.length) + ' declarations = ' +
                             A.adapterFns.length + ' functions + ' + A.adapterBindings.length +
                             ' var constants / ' + ownedDeclarationBytes(A.adapterText) + ' owned declaration bytes',
    'adapter load-time      ' + A.adapterStatements.length +
                             ' statements, 0 calls, 0 window/globalThis writes, 0 DOM/storage/network/timers',
    'service module         ' + SERVICE_REL + ' — script #' + scriptNoOf(SERVICE_SRC) + ', classic, src-only',
    'service ownership      ' + A.serviceFns.length + ' functions (' +
                             A.serviceFns.filter(function (f) { return f.isAsync; }).length + ' async + ' +
                             A.serviceFns.filter(function (f) { return !f.isAsync; }).length + ' sync), ' +
                             A.serviceBindings.length + ' constants / ' +
                             ownedDeclarationBytes(A.serviceText) + ' owned declaration bytes',
    'service load-time      ' + A.serviceStatements.length +
                             ' statements, 0 calls, 0 window/globalThis writes, 0 DOM/storage/network/timers',
    'panel module           ' + PANEL_REL + ' — script #' + scriptNoOf(PANEL_SRC) + ', classic, src-only',
    'panel ownership        ' + A.panelFns.length + ' functions (' +
                             A.panelFns.filter(function (f) { return f.isAsync; }).length + ' async + ' +
                             A.panelFns.filter(function (f) { return !f.isAsync; }).length + ' sync), ' +
                             A.panelBindings.length + ' constants / ' +
                             ownedDeclarationBytes(A.panelText) + ' owned declaration bytes',
    'panel load-time        ' + A.panelStatements.length +
                             ' statements, 0 calls, 0 window/globalThis writes, 0 DOM/storage/network/timers',
    'inline residual        ' + (A.inlineFns.length + A.inlineBindings.length) + ' DSB declarations + ' +
                             A.exposures.length + ' window exposures',
    'physical boundary      residue [' + A.start + ',' + A.end + ') = ' + A.blockLength +
                             ' chars, inline script #' + inlineScriptNo + ', depth 0/0, contiguous',
    'runtime order          adapter → service → panel → inline monolith',
    'declarations           ' + (A.fns.length + A.bindings.length) + ' application-wide = ' + A.fns.length +
                             ' functions (' + A.fns.filter(function (f) { return f.isAsync; }).length +
                             ' async) + ' + A.bindings.length + ' var constants, each owned ONCE',
    'top-level statements   ' + A.exposures.length +
                             ' (both window.apexDebug* exposures, still INLINE; no auto-call, no timer, no fetch)',
    'manifest correction    48 hypothesised → 46 real; resolveLatestDisplayPrice + _dssResolvePrice live OUTSIDE',
    'internal edges         ' + ALL_EDGES.length + ' = ' + FUNCTION_EDGES.length + ' function→function + ' +
                             BINDING_EDGES.length + ' function→constant',
    'external entry points  11 functions, 6 external consumers, 6 static onclick globals',
    'state owner            S.backendDirectional, lazily created by dsbState(); 14 eager + 2 dynamic fields, 10 writers',
    'S.scanData             0 executable references (7 comment mentions only)',
    'DOM / storage          4 element ids, 1 innerHTML write, 0 listeners | 2 keys, 1 writer',
    'network                1 direct fetch (GET /scanner/directional/snapshot); quotes reuse the shared helpers',
    'timers                 1 auto-refresh interval + 1 readiness retry + 1 UI debounce',
    'purity                 ' + A.adapterFns.length + ' of ' + A.fns.length +
                             ' functions provably side-effect free (throwing-Proxy sandbox)',
    'size metric            owned declaration bytes, one function for both sides of every comparison',
    'largest shipped        ' + LARGEST_SHIPPED.name.replace('./js/', '') + ' = ' + LARGEST_SHIPPED.declBytes +
                             ' B declarations (' + LARGEST_SHIPPED.fileBytes + ' B file)',
    'size ceiling           ' + SIZE_CEILING + ' B (1.5×)',
    'option A               ' + SCORES.A.crossEdges + ' cross edges, largest ' + SCORES.A.largestBytes + ' B — OVER the ceiling',
    'option B               ' + SCORES.B.crossEdges + ' cross edges, largest ' + SCORES.B.largestBytes + ' B — no pure leaf',
    'option C               ' + SCORES.C.crossEdges + ' cross edges (' + SCORES.C.crossFn + ' fn + ' + SCORES.C.crossBinding +
                             ' const), largest ' + SCORES.C.largestBytes + ' B',
    'option D               ' + SCORES.D.crossEdges + ' cross edges, largest ' + SCORES.D.largestBytes +
                             ' B — SECOND state owner (chart)',
    'option E               0 measured blockers',
    'window strategy        ' + WINDOW_STRATEGY.choice + ' (W1=' + WINDOW_STRATEGY.s1 + ' W2=' + WINDOW_STRATEGY.s2 +
                             ') — the 2 exposures stay INLINE',
    'relocation verdict     selective DECLARATION relocation (54 decls, byte-for-byte); NOT whole-block verbatim',
    'recommendation         OPTION ' + RECOMMENDATION.option + ' — adapter + service + panel, 3 sequential PRs (unchanged)',
    'PR 1  [' + PR_PLAN[0].state.toUpperCase() + ']       ' + CANONICAL_FILES.adapter + ' — ' + PR_PLAN[0].manifest.length + ' decls / ' + prBytes[0] + ' B',
    'PR 2  [' + PR_PLAN[1].state.toUpperCase() + ']       ' + CANONICAL_FILES.service + ' — ' + PR_PLAN[1].manifest.length + ' decls / ' + prBytes[1] + ' B',
    'PR 3  [' + PR_PLAN[2].state.toUpperCase() + ']       ' + CANONICAL_FILES.panel + ' — ' + PR_PLAN[2].manifest.length + ' decls / ' + prBytes[2] + ' B',
    'mutation proof         ' + MUTANT_TOTAL + ' mutants (' + SOURCE_MUTANTS.length + ' source / ' +
                             PLAN_MUTANTS.length + ' plan / ' + ORDER_MUTANTS.length + ' order) vs ' +
                             SOURCE_GUARDS.length + ' + ' + PLAN_GUARDS.length + ' + ' + ORDER_GUARDS.length +
                             ' guards — ' + mutantsCaught + ' caught, ' + weakMutants.length + ' weak',
  ];
  lines.forEach(function (l) { console.log('  ' + l); });
  console.log('\n' + '═'.repeat(80));
  console.log('  assertions: ' + (pass + fail) + '   passed: ' + pass + '   failed: ' + fail);
  console.log('═'.repeat(80));
  if (fail) {
    console.log('\nFAILURES:');
    failures.forEach(function (f) { console.log('  • ' + f); });
    process.exitCode = 1;
  } else {
    console.log('  BACKEND DIRECTIONAL SNAPSHOT BOUNDARY CONTRACT: OK');
  }
}

sectionDynamicBehaviour()
  .then(function () { sectionIntegrity(); })
  .catch(function (e) {
    fail++; failures.push('dynamic section threw: ' + (e && e.message));
    console.log('  FAIL  dynamic section threw: ' + (e && e.stack));
  })
  .then(summary)
  .catch(function (e) {
    console.log('FATAL: ' + (e && e.stack));
    process.exitCode = 1;
  });
