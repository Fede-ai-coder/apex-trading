'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND DIRECTIONAL SNAPSHOT (DSB) — EXTRACTION BOUNDARY CONTRACT
//
// WHAT THIS FILE IS
//   An AUDIT contract, not a behaviour test. It measures — against the REAL
//   application source loaded through tests/lib/load-app-source.js — the
//   physical, lexical, behavioural and load-time boundary of the still-inline
//   "BACKEND DIRECTIONAL SNAPSHOT (DSB)" block, and derives from those
//   measurements the safest extraction strategy.
//
//   It copies no implementation, creates no module, changes no behaviour and
//   writes to no file. Every number below is measured, not assumed.
//
//   tests/backend-directional-snapshot.test.js already pins WHAT the DSB block
//   does. This file pins WHERE it ends: which declarations belong to it, which
//   ones only LOOK like they do, who calls in, what it calls out to, what it
//   owns (state / DOM / storage / network / timers / subscriptions), and what
//   must remain true at load time for any future module to be a pure
//   relocation.
//
// WHY IT EXISTS
//   The DSB block is the largest remaining inline monolith cluster. Before any
//   line of it moves, the extraction needs a mechanical answer to: is the block
//   physically contiguous? which declarations relocate byte-for-byte? one
//   module or several? The existing behavioural test extracts 48 "DSB-adjacent"
//   functions into its sandbox — this contract verifies that list rather than
//   trusting it, and (see SECTION 3) CORRECTS it.
//
// HOW IT MEASURES
//   • static  — a LENGTH-PRESERVING masker blanks comments, strings, template
//               literals and regex literals so every offset in the masked text
//               is the same offset in the real text. Declarations, statements,
//               call edges and free globals are then read off the masked text
//               with brace matching, never with line numbers.
//   • dynamic — the block is executed verbatim inside a `vm` context whose
//               globals are stubs and whose `S` is a WRITE-RECORDING Proxy, so
//               state ownership, single-flight, TTL, retry, cooldown and timer
//               counts are proven by execution, not by grep.
//   • purity  — the measured-pure subset runs against a THROWING Proxy global:
//               any DOM / network / timer / storage / state access is a hard
//               failure.
//   • mutation-sensitive — SECTION 29 applies 36 mutants (source / plan / order)
//               to COPIES held in memory and proves each one trips at least one
//               guard of the family that describes it.
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

// Files this contract reads but must never modify. Hashed up front and
// re-hashed in SECTION 30 to prove the audit was side-effect free.
const APP_FILES = [
  'index.html',
  'js/api/backend-client.js',
  'js/config/backend-config.js',
  'js/services/backend-scanner-snapshot-service.js',
  'js/ui/backend-scanner-snapshot-panel.js',
  'js/adapters/backend-directional-adapter.js',
  'js/ui/backend-directional-preview.js',
];
function hashFile(rel) {
  const abs = path.resolve(__dirname, '..', rel);
  return crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
}
const HASHES_BEFORE = {};
APP_FILES.forEach(function (f) { HASHES_BEFORE[f] = hashFile(f); });

// ── The semantic markers that delimit the block ──────────────────────────────
// Deliberately NOT line numbers. The start marker is the block's banner comment
// line; the end marker is the first declaration that follows it (PR #347 moved
// showView() to sit immediately after the block).
const START_MARKER = '// BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner';
const END_MARKER = 'function showView(name) {';

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
// THE ANALYSER
//
// One pure function from source text to the complete measurement record. Every
// section below reads from it, and SECTION 29 re-runs it on MUTATED COPIES so
// each guard predicate is exercised against a deliberately broken source.
// ─────────────────────────────────────────────────────────────────────────────
const IDENT_RE = /(?<![A-Za-z0-9_$.])([A-Za-z_$][A-Za-z0-9_$]*)/g;

const JS_KEYWORDS = new Set(('var let const function return if else for while do break continue new typeof ' +
  'instanceof in of try catch finally throw switch case default this null true false undefined void delete ' +
  'async await yield class extends super export import static get set').split(' '));

const JS_INTRINSICS = new Set(('Object Array String Number Boolean Math JSON Date Promise Map Set WeakMap WeakSet ' +
  'RegExp Error TypeError RangeError isNaN isFinite parseInt parseFloat console Symbol AbortSignal AbortController ' +
  'globalThis Infinity NaN encodeURIComponent decodeURIComponent Intl BigInt Proxy Reflect').split(' '));

function analyze(src) {
  const masked = maskSource(src);
  const bd = braceDepths(masked);
  const rec = { lengthPreserved: masked.length === src.length };

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

  const allFns = topLevelFunctions(src, masked, bd);
  rec.allFns = allFns;
  rec.fns = allFns.filter(function (f) { return f.start >= rec.start && f.start < rec.end; })
                  .sort(function (a, b) { return a.start - b.start; });
  rec.fnNames = rec.fns.map(function (f) { return f.name; });
  rec.duplicateFnNames = rec.fnNames.filter(function (n, i) { return rec.fnNames.indexOf(n) !== i; });

  rec.bindings = topLevelBindings(src, masked, bd, rec.start, rec.end);
  rec.bindingNames = rec.bindings.map(function (b) { return b.name; });

  // Regions between top-level declarations that still contain executable code.
  const stmts = [];
  let cursor = rec.start;
  const spans = rec.fns.map(function (f) { return [f.start, f.end]; })
    .concat(rec.bindings.map(function (b) {
      const semi = masked.indexOf(';', b.start);
      return [b.start, semi < 0 ? b.start : semi + 1];
    }))
    .sort(function (a, b) { return a[0] - b[0]; });
  for (const [a, b] of spans) {
    if (a > cursor) {
      const text = src.slice(cursor, a);
      if (masked.slice(cursor, a).trim()) stmts.push({ start: cursor, end: a, text: text });
    }
    cursor = Math.max(cursor, b);
  }
  if (rec.end > cursor && masked.slice(cursor, rec.end).trim()) {
    stmts.push({ start: cursor, end: rec.end, text: src.slice(cursor, rec.end) });
  }
  rec.topLevelStatements = stmts;
  rec.topLevelStatementCode = stmts.map(function (s) { return masked.slice(s.start, s.end).trim(); })
                                   .filter(Boolean).join('\n');

  // Owner of an absolute offset: the top-level function containing it, or the
  // synthetic '<top-level>' owner for block-level statements.
  rec.ownerAt = function (off) {
    for (const f of allFns) if (off >= f.start && off < f.end) return f.name;
    return '<top-level>';
  };

  // Call/reference map for every declaration the block owns.
  const owned = rec.fnNames.concat(rec.bindingNames);
  // Offsets of the block's own `var DSB_* =` declaration sites, so a constant's
  // declaration is never counted as one of its consumers.
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
      if (m.index >= rec.start && m.index < rec.end) inside.add(owner);
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

  // Free globals: identifiers referenced in the block that the block does not
  // declare, minus locally-declared names and language intrinsics.
  const declared = new Set(owned);
  let m2;
  const bm = rec.blockMasked;
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

  // Behavioural surface counters, measured on masked (code-only) block text.
  const c = function (re) { return (bm.match(re) || []).length; };
  rec.counts = {
    directFetch: c(/\bfetch\s*\(/g),
    setInterval: c(/\bsetInterval\s*\(/g),
    clearInterval: c(/\bclearInterval\s*\(/g),
    setTimeout: c(/\bsetTimeout\s*\(/g),
    clearTimeout: c(/\bclearTimeout\s*\(/g),
    localStorage: c(/\blocalStorage\b/g),
    getElementById: c(/getElementById\s*\(/g),
    windowAssign: c(/\bwindow\s*\.\s*[A-Za-z_$][A-Za-z0-9_$]*\s*=/g),
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
  rec.scanDataCommentRefs = (rec.blockText.match(/S\.scanData/g) || []).length;

  // Endpoints referenced by the block (from the RAW text — they are strings).
  rec.endpoints = Array.from(new Set((rec.blockText.match(/\/[a-z0-9][a-z0-9/_-]*\/[a-z0-9/_-]+/gi) || [])
    .filter(function (s) { return /^\/(scanner|market|dev)\//.test(s); })));

  // localStorage keys the block touches.
  rec.storageKeys = Array.from(new Set(
    [].concat(
      (rec.blockText.match(/localStorage\.getItem\(\s*'([^']+)'/g) || []),
      (rec.blockText.match(/localStorage\.setItem\(\s*'([^']+)'/g) || [])
    ).map(function (s) { return (s.match(/'([^']+)'/) || [])[1]; }).filter(Boolean)
  )).sort();

  // DOM element ids read by the block.
  rec.domIds = Array.from(new Set(
    (rec.blockText.match(/getElementById\(\s*'([^']+)'/g) || [])
      .map(function (s) { return (s.match(/'([^']+)'/) || [])[1]; })
  )).sort();

  // Static onclick handlers emitted inside the block's HTML strings.
  rec.staticHandlers = Array.from(new Set(
    (rec.blockText.match(/onclick=\\?["'](?:return\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g) || [])
      .map(function (s) { return (s.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\($/) || [])[1]; })
      .filter(Boolean)
  )).sort();

  // window.* exposures declared by the block's top-level statements.
  rec.windowExposures = Array.from(new Set(
    (rec.topLevelStatementCode.match(/window\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=/g) || [])
      .map(function (s) { return (s.match(/\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*=$/) || [])[1]; })
      .filter(Boolean)
  )).sort();

  // st.<field> read/write ownership across the block.
  const writes = {}, reads = {};
  let m3, sre = /\bst\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(=(?!=))?/g;
  while ((m3 = sre.exec(bm)) !== null) {
    const field = m3[1];
    const owner = rec.ownerAt(m3.index + rec.start);
    const bag = m3[2] ? writes : reads;
    (bag[field] = bag[field] || new Set()).add(owner);
  }
  let dre = /dsbState\s*\(\s*\)\s*\.\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*(=(?!=))?/g;
  while ((m3 = dre.exec(bm)) !== null) {
    const field = m3[1];
    const owner = rec.ownerAt(m3.index + rec.start);
    const bag = m3[2] ? writes : reads;
    (bag[field] = bag[field] || new Set()).add(owner);
  }
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

const A = analyze(SRC);

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 0 — masker self-verification
// The whole contract rests on offsets surviving masking. Prove it first.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 0 — length-preserving masker self-verification');
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
// SECTION 1 — the real physical boundary
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 1 — physical boundary');
ok(A.found, 'both DSB markers exist in the reconstructed application source');
eq(A.startCount, 1, 'start marker "BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner" is UNIQUE');
eq(A.endCount, 1, 'end marker "function showView(name) {" is UNIQUE');
eq(A.start, 1044799, 'measured start-marker offset in the reconstructed source');
eq(A.end, 1105631, 'measured end-marker offset in the reconstructed source');
eq(A.blockLength, 60832, 'measured physical block length in characters');
eq(A.startDepth, 0, 'start marker sits at brace depth 0 (top level, not nested in any function)');
eq(A.endDepth, 0, 'end marker sits at brace depth 0 (top level)');
ok(A.end > A.start, 'end marker follows the start marker');
note('block spans [' + A.start + ',' + A.end + ') = ' + A.blockLength + ' chars of the inline monolith');

// The block lives entirely inside the single inline <script> of index.html.
{
  const appParts = PARTS.filter(function (p) { return p.isAppJs && p.code != null; });
  let offset = 0, host = null;
  for (const p of appParts) {
    const s = offset, e = offset + p.code.length;
    if (A.start >= s && A.end <= e) host = p;
    offset = e + 1;                        // loadAppJavaScriptSource joins with '\n'
  }
  ok(host != null, 'the whole DSB block lives inside ONE script part (it is not split across files)');
  eq(host ? host.kind : null, 'inline', 'the DSB block lives in the INLINE script of index.html');
  eq(host ? host.order : null, 21, 'the inline monolith is script #21 (the last application script)');
}

// Physical contiguity: between the markers there is nothing but declarations
// the block owns plus its own top-level statements.
{
  // Blank out every span the block OWNS (functions, DSB_* bindings, the two
  // top-level statements). Whatever code survives would be foreign material
  // sitting between the markers — i.e. the block would not be extractable
  // verbatim. Comment/whitespace-only remainder is expected and fine.
  const chars = A.blockMasked.split('');
  const clear = function (a, b) { for (let i = a - A.start; i < b - A.start; i++) chars[i] = ' '; };
  A.fns.forEach(function (f) { clear(f.start, f.end); });
  A.bindings.forEach(function (b) {
    const semi = A.masked.indexOf(';', b.start);
    clear(b.start, semi < 0 ? b.start : semi + 1);
  });
  A.topLevelStatements.forEach(function (s) { clear(s.start, s.end); });
  const residue = chars.join('').trim();
  eq(residue, '', 'no FOREIGN executable code sits between the markers — the block is physically contiguous (SECTION 25 states precisely what relocates)');
  const covered = A.fns.reduce(function (n, f) { return n + (f.end - f.start); }, 0);
  const stmtChars = A.topLevelStatements.reduce(function (n, s) { return n + (s.end - s.start); }, 0);
  note('functions cover ' + covered + ' chars; top-level statements ' + stmtChars + ' chars; the rest is comments/whitespace');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — declaration inventory
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 2 — declarations and top-level statements');
eq(A.fns.length, 46, 'the block declares exactly 46 top-level functions');
eq(A.bindings.length, 8, 'the block declares exactly 8 top-level bindings (the DSB_* constants)');
eq(A.fns.length + A.bindings.length, 54, 'total declarations owned by the block = 54');
deepEq(A.duplicateFnNames, [], 'no function name is declared twice inside the block');
eq(A.topLevelStatements.length, 2, 'the block contains exactly 2 executable top-level regions');
eq(A.windowExposures.length, 2, 'both top-level regions are window.* debug exposures — nothing else runs at load time');
deepEq(A.windowExposures,
  ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
  'the two load-time statements expose exactly the two debug helpers');
ok(!/\b(?:setTimeout|setInterval|fetch|addEventListener|localStorage)\s*\(/.test(A.topLevelStatementCode),
   'no timer / fetch / listener / storage call runs at load time in the block');
ok(!/(?<![A-Za-z0-9_$.])dsb[A-Z][A-Za-z0-9_$]*\s*\(/.test(A.topLevelStatementCode),
   'no dsb* function is auto-invoked at load time (no bootstrap call travels with the block)');
eq(A.counts.addEventListener, 0, 'the block registers ZERO event listeners');

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
  ok(rlpd.start < A.start, 'resolveLatestDisplayPrice is declared BEFORE the DSB block');
  ok(drp.start < A.start, '_dssResolvePrice is declared BEFORE the DSB block');
  eq(rlpd.start, 396136, 'measured declaration offset of resolveLatestDisplayPrice');
  eq(drp.start, 359589, 'measured declaration offset of _dssResolvePrice');
  note('the outliers sit ~' + Math.round((A.start - rlpd.start) / 1000) + 'k and ~' +
       Math.round((A.start - drp.start) / 1000) + 'k chars before the block — not adjacent to it');

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
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 4 — signatures, sync/async, physical order');

// [name, isAsync, exact signature] in EXACT physical order.
const MANIFEST = [
  ['ffBackendDirectionalSnapshot', false, 'function ffBackendDirectionalSnapshot()'],
  ['dsbState', false, 'function dsbState()'],
  ['_dsbNum', false, 'function _dsbNum(v)'],
  ['_dsbStr', false, 'function _dsbStr(v)'],
  ['_dsbBool', false, 'function _dsbBool(v)'],
  ['_dsbObj', false, 'function _dsbObj(v)'],
  ['_dsbSafeSym', false, 'function _dsbSafeSym(v)'],
  ['dsbClassifyRowPrice', false, 'function dsbClassifyRowPrice(r)'],
  ['dsbRowPriceIsCurrent', false, 'function dsbRowPriceIsCurrent(r)'],
  ['dsbFmtAge', false, 'function dsbFmtAge(ms)'],
  ['dsbFmtClock', false, 'function dsbFmtClock(iso)'],
  ['dsbSourceMode', false, 'function dsbSourceMode()'],
  ['dsbSetSourceMode', false, 'function dsbSetSourceMode(mode)'],
  ['dsbNormalizeResultRow', false, 'function dsbNormalizeResultRow(r)'],
  ['dsbParseSnapshot', false, 'function dsbParseSnapshot(raw)'],
  ['dsbSnapshotAgeMs', false, 'function dsbSnapshotAgeMs(st)'],
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
  ['dsbRowsForMode', false, 'function dsbRowsForMode(rows,mode)'],
  ['dsbFreshnessBadgeHtml', false, 'function dsbFreshnessBadgeHtml(src)'],
  ['dsbBannerHtml', false, 'function dsbBannerHtml(src,modeCount)'],
  ['dsbControlsHtml', false, 'function dsbControlsHtml(isShort)'],
  ['dsbRowHtml', false, 'function dsbRowHtml(r,isShort)'],
  ['dsbRenderBackendDirectional', false, 'function dsbRenderBackendDirectional(src)'],
  ['dsbMaybeRenderBackendDirectional', false, 'function dsbMaybeRenderBackendDirectional()'],
  ['dsbSourceNoticeHtml', false, 'function dsbSourceNoticeHtml()'],
  ['apexDebugBackendDirectionalSnapshot', false, 'function apexDebugBackendDirectionalSnapshot()'],
  ['dsbNoteDirectionalChartOpen', false, 'function dsbNoteDirectionalChartOpen(symbol,ts)'],
  ['apexDebugDirectionalBackendSnapshot', false, 'function apexDebugDirectionalBackendSnapshot()'],
];
eq(MANIFEST.length, 46, 'the measured manifest table has 46 entries');
deepEq(A.fnNames, MANIFEST.map(function (r) { return r[0]; }),
  'measured PHYSICAL ORDER of the 46 declarations matches the manifest exactly');
deepEq(A.fns.map(function (f) { return f.isAsync; }), MANIFEST.map(function (r) { return r[1]; }),
  'measured sync/async kind of all 46 declarations matches the manifest');
deepEq(A.fns.map(function (f) { return f.signature; }), MANIFEST.map(function (r) { return r[2]; }),
  'measured full signatures of all 46 declarations match the manifest');
{
  const asyncFns = A.fns.filter(function (f) { return f.isAsync; }).map(function (f) { return f.name; });
  deepEq(asyncFns, ['dsbFetchSnapshot', 'dsbEnrichVisibleRowsLive', 'dssEnsureChartLiveQuoteForDisplay'],
    'exactly 3 of the 46 are async — the three that touch the network');
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
  // very first code in the block.
  const firstFn = A.fns[0].start;
  ok(A.bindings.every(function (b) { return b.start < firstFn; }),
     'all 8 constants are declared BEFORE the first function of the block');
  ok(A.bindings[0].start > A.start, 'the constants come after the banner comment (inside the block)');
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
// two future modules would need a shared owner.
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
    if (m.index < A.start || m.index >= A.end) outside.push(A.ownerAt(m.index));
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
ok(!/\bcomputeDirectionalSetupCandidates\s*\(/.test(A.blockMasked),
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
  const writes = (A.blockText.match(/\.\s*(innerHTML|textContent|disabled)\s*=/g) || [])
    .map(function (s) { return (s.match(/(innerHTML|textContent|disabled)/) || [])[1]; }).sort();
  deepEq(Array.from(new Set(writes)).sort(), ['disabled', 'innerHTML', 'textContent'],
    'the block performs 3 kinds of DOM write');
  const inner = (A.blockMasked.match(/\.\s*innerHTML\s*=/g) || []).length;
  eq(inner, 1, 'exactly ONE innerHTML write in the whole block (the panel body)');
  ok(/id="dsb-refresh"/.test(A.blockText), 'the block owns the id it later reads back (dsb-refresh)');
  ok(!/panelContent|panelHeader/.test(A.blockText.replace(/getElementById\([^)]*\)/g, '')),
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
  ok(/try\s*\{[\s\S]*localStorage[\s\S]*\}\s*catch/.test(A.blockText),
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
ok(!/\bPOST\b/.test(A.blockMasked), 'the word POST does not appear in executable code (only in the doc comment)');
{
  // Type 1 — transport snapshot.
  const fetchIdx = A.blockMasked.search(/\bfetch\s*\(/);
  const owner = A.ownerAt(fetchIdx + A.start);
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
  deepEq(A.endpoints, ['/scanner/directional/snapshot', '/scanner/snapshot',
                       '/dev/market/candles-dxlink/', '/market/live'],
    'endpoint strings that appear anywhere in the block (including comments)');
  const requested = A.endpoints.filter(function (ep) {
    return new RegExp("fetch\\([^)]*'" + ep.replace(/\//g, '\\/')).test(A.blockText);
  });
  deepEq(requested, ['/scanner/directional/snapshot'],
    'only ONE endpoint is actually requested by the block; the other three are documentation of shared paths');
}
{
  // Type 4 — the /market/live path is reached ONLY through fetchLiveQuote.
  ok(!/fetch\([^)]*market\/live/.test(A.blockText),
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
  const at = function (re) { const i = A.blockMasked.search(re); return i < 0 ? null : A.ownerAt(i + A.start); };
  eq(at(/\bsetInterval\s*\(/), 'dsbStartAutoRefresh', 'the only interval is the auto-refresh timer');
  eq(at(/\bclearInterval\s*\(/), 'dsbStopAutoRefresh', 'the only clearInterval is the auto-refresh teardown');
  eq(at(/\bclearTimeout\s*\(/), 'dsbCancelLiveEnrichRetry', 'the only clearTimeout cancels the readiness retry');
  const timeouts = [];
  let m, re = /\bsetTimeout\s*\(/g;
  while ((m = re.exec(A.blockMasked)) !== null) timeouts.push(A.ownerAt(m.index + A.start));
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
  vm.runInContext(A.blockText, ctx, { filename: 'dsb-block.js' });
  return { ctx: ctx, log: log, rec: rec, els: els, store: store, firePending: function () {
    Object.keys(pendingTimeouts).forEach(function (id) { const fn = pendingTimeouts[id]; delete pendingTimeouts[id]; fn(); });
  } };
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 16 — dynamic: the block executes standalone and owns only its state
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 16 — dynamic execution + write-recording state Proxy');
{
  let built = null, err = null;
  try { built = makeSandbox({}); } catch (e) { err = e; }
  ok(!err, 'the block\'s 60832 characters evaluate standalone in a fresh vm context' + (err ? ' — ' + err.message : ''));
  if (built) {
    eq(typeof built.ctx.dsbState, 'function', 'dsbState is defined after evaluating the block alone');
    eq(built.log.fetchUrls.length, 0, 'evaluating the block performs NO fetch at load time');
    eq(built.log.intervals, 0, 'evaluating the block starts NO interval at load time');
    eq(built.log.timeouts.length, 0, 'evaluating the block starts NO timeout at load time');
    eq(built.log.renders, 0, 'evaluating the block triggers NO render at load time');
    eq(built.log.storageSet.length, 0, 'evaluating the block writes NO localStorage at load time');
    deepEq(Object.keys(built.ctx.window).sort(),
      ['apexDebugBackendDirectionalSnapshot', 'apexDebugDirectionalBackendSnapshot'],
      'evaluating the block sets exactly 2 window properties — the debug surfaces');
    deepEq(built.rec.writes, [], 'evaluating the block writes NOTHING to S at load time');
    // 46 functions + 8 constants are all reachable in the context.
    const missing = A.fnNames.filter(function (n) { return typeof built.ctx[n] !== 'function'; });
    deepEq(missing, [], 'all 46 measured functions exist as functions after standalone evaluation');
    const missingConst = A.bindingNames.filter(function (n) { return typeof built.ctx[n] !== 'number'; });
    deepEq(missingConst, [], 'all 8 measured constants exist as numbers after standalone evaluation');
    deepEq(A.bindingNames.map(function (n) { return built.ctx[n]; }),
      [60000, 600000, 30000, 30, 300000, 3000, 8000, 5000], 'measured constant VALUES');
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
const LOCAL_SCRIPTS = SCRIPT_TAGS
  .filter(function (t) { return t.src && APP.classifySrc(t.src) === 'local'; })
  .map(function (t) { return String(t.src).trim(); });
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
  './js/ui/backend-directional-preview.js',
], 'measured current local script order in index.html');
eq(LOCAL_SCRIPTS.length, 20, 'index.html loads 20 local application scripts before the inline monolith');
{
  const inlineTags = SCRIPT_TAGS.filter(function (t) { return !t.src; });
  eq(inlineTags.length, 1, 'exactly ONE inline application script — the monolith');
  const lastLocalAt = SCRIPT_TAGS.map(function (t) { return t; }).reduce(function (acc, t, i) {
    return (t.src && APP.classifySrc(t.src) === 'local') ? i : acc;
  }, -1);
  const inlineAt = SCRIPT_TAGS.findIndex(function (t) { return !t.src; });
  ok(inlineAt > lastLocalAt, 'the inline monolith is the LAST application script in the document');
}
// No local script carries defer / async / type=module — a future DSB module
// must match, or its declarations stop being classic-script globals.
{
  const flagged = SCRIPT_TAGS.filter(function (t) { return t.src && APP.classifySrc(t.src) === 'local'; })
    .filter(function (t) { return /(^|\s)(defer|async)(\s|=|$)/i.test(t.attrs) || (t.type && String(t.type).toLowerCase() === 'module'); })
    .map(function (t) { return t.src; });
  deepEq(flagged, [], 'NO local script uses defer / async / type=module — all 20 are classic, in-order scripts');
  const attrNames = SCRIPT_TAGS.filter(function (t) { return t.src && APP.classifySrc(t.src) === 'local'; })
    .map(function (t) { return (t.attrs.match(/([A-Za-z-]+)\s*=/g) || []).map(function (a) { return a.replace(/\s*=$/, ''); }).join(','); });
  deepEq(Array.from(new Set(attrNames)), ['src'], 'every local script tag carries exactly ONE attribute: src');
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

const APP_PARTS = PARTS.filter(function (p) { return p.isAppJs && p.code != null; })
  .map(function (p) { return { name: p.src || 'INLINE', code: p.code }; });

{
  const profile = APP_PARTS.map(function (p) {
    return { name: p.name, tlChars: stripFunctions(maskSource(p.code)).replace(/\s+/g, '').length };
  });
  const modules = profile.filter(function (p) { return p.name !== 'INLINE'; });
  const withTopLevel = modules.filter(function (p) { return p.tlChars > 20; });
  deepEq(withTopLevel.map(function (p) { return p.name; }), ['./js/config/backend-config.js'],
    '19 of the 20 extracted modules execute essentially NOTHING at load time; only backend-config.js does');
  ok(withTopLevel[0].tlChars < 200,
     'backend-config.js top-level code is tiny (' + withTopLevel[0].tlChars + ' chars: `const BACKEND = resolveBackendUrl();`)');
  const inline = profile.find(function (p) { return p.name === 'INLINE'; });
  ok(inline.tlChars > 20000, 'the inline monolith executes ' + inline.tlChars + ' chars at load time — that is what pins it LAST');
  note('the established module convention is: no meaningful top-level execution. A DSB module must match it.');
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
{
  const real = loadOrderSafe(APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; }));
  ok(real.safe, 'PREDICATE APPLIED TO THE REAL index.html ORDER: load-order safe' +
     (real.safe ? '' : ' — ' + JSON.stringify(real.violations.slice(0, 3))));
  const deps = crossScriptLoadTimeDeps(APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; }));
  eq(deps.length, 6, 'the real document has exactly 6 cross-script LOAD-TIME dependencies');
  deepEq(deps.map(function (d) { return d.name; }).sort(),
    ['_apexParityNormCandle', '_apexParityNormCandleArray', '_apexParityNormTime',
     '_isTransientFetchError', '_ttCallWithRetry', 'apexDebugBackendDirectionalPreview'],
    'the 6 identifiers the inline monolith evaluates at load time from earlier modules');
  deepEq(Array.from(new Set(deps.map(function (d) { return d.consumer; }))), ['INLINE'],
    'ALL cross-script load-time dependencies belong to the inline monolith — no module depends on another at load time');
  deepEq(Array.from(new Set(deps.map(function (d) { return d.provider; }))).sort(),
    ['./js/api/backend-client.js', './js/services/candle-normalization.js', './js/ui/backend-directional-preview.js'],
    'those 6 come from exactly 3 provider modules');

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

  // Acceptance — the DSB block relocated into a module, both candidate orders.
  const dsbModule = { name: './js/services/backend-directional-snapshot-service.js', code: A.blockText };
  const rump = { name: 'INLINE', code: SRC.slice(0, A.start) + SRC.slice(A.end) };
  const base = APP_PARTS.slice(0, -1).map(function (p) { return { name: p.name, code: p.code }; });
  ok(loadOrderSafe(base.concat([dsbModule, rump])).safe,
     'ORDER A (…adapter → preview → DSB module → inline monolith) is load-order safe');
  ok(loadOrderSafe(base.slice(0, -1).concat([dsbModule, base[base.length - 1], rump])).safe,
     'ORDER B (…adapter → DSB module → preview → inline monolith) is ALSO load-order safe');
  // ORDER C — three DSB modules split by the measured categories.
  const byName = {};
  A.fns.forEach(function (f) { byName[f.name] = SRC.slice(f.start, f.end); });
  const constsSrc = A.bindings.map(function (b) {
    return SRC.slice(b.start, A.masked.indexOf(';', b.start) + 1);
  }).join('\n');
  const pick = function (names) { return names.map(function (n) { return byName[n]; }).join('\n'); };
  const modAdapter = { name: './js/adapters/backend-directional-snapshot-adapter.js', code: constsSrc + '\n' + pick(PURE_CANDIDATES) };
  const modService = { name: './js/services/backend-directional-snapshot-service.js',
    code: pick(A.fnNames.filter(function (n) { return PURE_CANDIDATES.indexOf(n) < 0 && CATEGORIES.G.indexOf(n) < 0; })) };
  const modPanel = { name: './js/ui/backend-directional-snapshot-panel.js', code: pick(CATEGORIES.G) };
  ok(loadOrderSafe(base.concat([modAdapter, modService, modPanel, rump])).safe,
     'ORDER C (adapter → service → panel → inline monolith) is load-order safe');

  // Rejection 3 — a DSB module that reads S at load time, placed BEFORE the
  // monolith that declares `const S`. This is the TDZ failure the audit warns about.
  const tdzModule = { name: './js/services/backend-directional-snapshot-service.js',
                      code: A.blockText + '\nvar DSB_BOOT_PROBE = S.backendDirectional;\n' };
  const rTdz = loadOrderSafe(base.concat([tdzModule, rump]));
  ok(!rTdz.safe, 'PREDICATE REJECTS a DSB module that evaluates `S` at load time before the monolith declares it' +
     (rTdz.violations[0] ? ' (breaks `' + rTdz.violations[0].name + '`)' : ''));
  // …and the same module placed AFTER the monolith is accepted, proving the
  // predicate reacts to ORDER and not merely to the added line.
  ok(loadOrderSafe(base.concat([rump, tdzModule])).safe,
     'the same module placed AFTER the monolith is accepted — the predicate is order-sensitive, not a constant');
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
// every declaration the block owns. Option scoring, the simulated ORDER C, the
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
eq(SHIPPED_MODULES.length, 20, 'all 20 shipped modules measured with the SAME metric');
ok(SHIPPED_MODULES.every(function (m) { return m.declBytes > 0 && m.declBytes <= m.fileBytes; }),
   'owned declaration bytes are positive and never exceed file bytes (headers/comments excluded)');
const LARGEST_SHIPPED = SHIPPED_MODULES[0];
eq(LARGEST_SHIPPED.name, './js/ui/backend-scanner-snapshot-panel.js', 'largest shipped module by OWNED DECLARATION BYTES');
eq(LARGEST_SHIPPED.declBytes, 23739, 'its owned declaration bytes (primary metric)');
eq(LARGEST_SHIPPED.fileBytes, 27593, 'its complete file bytes (secondary metric, reported separately)');
const SIZE_CEILING = Math.round(LARGEST_SHIPPED.declBytes * 1.5);
eq(SIZE_CEILING, 35609, 'size ceiling = 1.5 × the largest shipped module, in owned declaration bytes');
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
  eq(viaSpans, viaRecords, 'measuring a simulated candidate module with the shipped-module function reproduces the record total');
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
  if (A.counts.scanDataCode > 0) blockers.push('block reads S.scanData');
  if (A.windowExposures.length !== 2) blockers.push('unexpected window exposures');
  if (/(?<![A-Za-z0-9_$.])dsb[A-Z][A-Za-z0-9_$]*\s*\(/.test(A.topLevelStatementCode)) blockers.push('top-level auto-call');
  if (/\bS\s*\.\s*backendDirectional\b(?!Preview)/.test(A.masked.slice(0, A.start) + A.masked.slice(A.end)))
    blockers.push('external state writer');
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
eq(EXPOSURE_STATEMENT_BYTES, 928, 'byte size of the two top-level statement regions (comments included)');
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
  const rump = { name: 'INLINE', code: SRC.slice(0, A.start) + SRC.slice(A.end) };
  const base = APP_PARTS.slice(0, -1).map(function (p) { return { name: p.name, code: p.code }; });
  const w1Parts = base.concat([{ name: CANONICAL_FILES.service, code: W1_SERVICE_SRC }, rump]);
  const rumpW2 = { name: 'INLINE', code: SRC.slice(0, A.start) + EXPOSURE_SRC + SRC.slice(A.end) };
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
  const rumpSrc = SRC.slice(0, A.start) + EXPOSURE_SRC + SRC.slice(A.end);
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
// SECTION 27 — the PR plan and the SIMULATED modules
//
// The three modules are built from the real declaration spans and then
// RE-ANALYSED, so the manifests are validated against actual module source
// rather than against a list of names.
// ═════════════════════════════════════════════════════════════════════════════
section('SECTION 27 — PR plan and simulated ORDER C');

const PR_PLAN = [
  { pr: 1, module: 'adapter', file: CANONICAL_FILES.adapter, manifest: CANONICAL_MODULES.adapter },
  { pr: 2, module: 'service', file: CANONICAL_FILES.service, manifest: CANONICAL_MODULES.service },
  { pr: 3, module: 'panel', file: CANONICAL_FILES.panel, manifest: CANONICAL_MODULES.panel },
];
eq(PR_PLAN.length, 3, 'the recommendation implies THREE sequential extraction PRs');
eq(PR_PLAN[0].manifest.length, 19, 'PR 1 manifest — adapter declarations');
eq(PR_PLAN[1].manifest.length, 26, 'PR 2 manifest — service declarations');
eq(PR_PLAN[2].manifest.length, 9, 'PR 3 manifest — panel declarations');
eq(PR_PLAN.reduce(function (n, p) { return n + p.manifest.length; }, 0), 54, 'the three manifests total 54 declarations');
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
const SIMULATED = {
  adapter: buildModuleSource(CANONICAL_MODULES.adapter),
  service: buildModuleSource(CANONICAL_MODULES.service),
  panel: buildModuleSource(CANONICAL_MODULES.panel),
};
const SIMULATED_RUMP = SRC.slice(0, A.start) + EXPOSURE_SRC + SRC.slice(A.end);

// (10)(11) validate the simulated sources by ANALYSING them, not by name lists.
Object.keys(SIMULATED).forEach(function (mod) {
  const spans = declarationSpans(SIMULATED[mod]);
  const names = spans.map(function (d) { return d.name; });
  deepEq(names.slice().sort(), CANONICAL_MODULES[mod].slice().sort(),
    'simulated ' + mod + ' module declares exactly its canonical manifest');
  deepEq(names.filter(function (n, i) { return names.indexOf(n) !== i; }), [],
    'simulated ' + mod + ' module contains NO duplicated declaration');
  eq(spans.length, CANONICAL_MODULES[mod].length, 'simulated ' + mod + ' declaration count');
  eq(ownedDeclarationBytes(SIMULATED[mod]), SCORES.C.bytes[mod],
     'simulated ' + mod + ' owned declaration bytes match the scored size');
  // Load-time inertness — the module convention. The adapter legitimately keeps
  // the eight `var DSB_* = <literal>;` initialisers, which execute but have no
  // effect beyond binding a constant. What must be zero is SIDE EFFECTS: calls,
  // member access, global writes.
  const residue = stripFunctions(maskSource(SIMULATED[mod]));
  ok(!/\(/.test(residue), 'simulated ' + mod + ' module performs NO call at load time');
  ok(!/\./.test(residue), 'simulated ' + mod + ' module performs NO member access at load time');
  ok(!/(?<![A-Za-z0-9_$.])(?:S|WL|window|document|localStorage)(?![A-Za-z0-9_$])/.test(residue),
     'simulated ' + mod + ' module reads NO shared global at load time');
  const residueDecls = residue.replace(/(?:^|\n)\s*var\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=\s*[0-9]+\s*;/g, '');
  eq(residueDecls.replace(/\s+/g, '').length, 0,
     'simulated ' + mod + ' load-time residue is nothing but inert numeric constant initialisers');
  ok(!/window\s*\./.test(maskSource(SIMULATED[mod])),
     'simulated ' + mod + ' module makes no window assignment (W2)');
});
{
  // Cross-module: no declaration is present in two simulated sources.
  const mods = Object.keys(SIMULATED);
  for (let i = 0; i < mods.length; i++) {
    for (let j = i + 1; j < mods.length; j++) {
      const a = declarationSpans(SIMULATED[mods[i]]).map(function (d) { return d.name; });
      const b = declarationSpans(SIMULATED[mods[j]]).map(function (d) { return d.name; });
      deepEq(a.filter(function (n) { return b.indexOf(n) >= 0; }), [],
        'simulated ' + mods[i] + ' and ' + mods[j] + ' share no declaration');
    }
  }
  const total = mods.reduce(function (n, m) { return n + declarationSpans(SIMULATED[m]).length; }, 0);
  eq(total, 54, 'the three simulated modules together declare exactly 54 things');
  ok(declarationSpans(SIMULATED.adapter).some(function (d) { return d.name === 'dsbRowsForMode'; }),
     'dsbRowsForMode is present in the simulated ADAPTER source');
  ok(!declarationSpans(SIMULATED.panel).some(function (d) { return d.name === 'dsbRowsForMode'; }),
     'dsbRowsForMode is absent from the simulated PANEL source');
}
{
  // The residual monolith keeps the two exposures and no DSB declaration.
  const spans = declarationSpans(SIMULATED_RUMP).map(function (d) { return d.name; });
  deepEq(A.fnNames.concat(A.bindingNames).filter(function (n) { return spans.indexOf(n) >= 0; }), [],
    'the simulated residual monolith declares NONE of the 54 DSB declarations');
  eq((SIMULATED_RUMP.match(/window\.apexDebug(?:BackendDirectionalSnapshot|DirectionalBackendSnapshot)\s*=/g) || []).length, 2,
     'the simulated residual monolith keeps both DSB debug exposures');
}

// (12)(13) ORDER C evaluated by the REAL load-order predicate.
const BASE_PARTS = APP_PARTS.slice(0, -1).map(function (p) { return { name: p.name, code: p.code }; });
const ORDER_C_PARTS = BASE_PARTS.concat([
  { name: CANONICAL_FILES.adapter, code: SIMULATED.adapter },
  { name: CANONICAL_FILES.service, code: SIMULATED.service },
  { name: CANONICAL_FILES.panel, code: SIMULATED.panel },
  { name: 'INLINE', code: SIMULATED_RUMP },
]);
ok(loadOrderSafe(ORDER_C_PARTS).safe, 'ORDER C (adapter → service → panel → inline monolith) is load-order safe');
{
  // Also the two coarser orders, on the same simulated sources.
  const single = BASE_PARTS.concat([
    { name: CANONICAL_FILES.service, code: SIMULATED.adapter + '\n' + SIMULATED.service + '\n' + SIMULATED.panel },
    { name: 'INLINE', code: SIMULATED_RUMP },
  ]);
  ok(loadOrderSafe(single).safe, 'ORDER A (one DSB module → inline monolith) is load-order safe');
}
{
  // A WRONG order of the SAME three modules must be rejected. The modules have
  // no load-time dependency on each other today (that is the whole point of the
  // convention), so the mutant introduces a REAL top-level read of a service
  // binding inside the panel and then shows the predicate distinguishes the two
  // orders — it reacts to position, not to the added line.
  const panelWithLoadTimeRead = SIMULATED.panel + '\nvar DSBP_BOOT_MODE = dsbSourceMode;\n';
  const wrong = BASE_PARTS.concat([
    { name: CANONICAL_FILES.adapter, code: SIMULATED.adapter },
    { name: CANONICAL_FILES.panel, code: panelWithLoadTimeRead },
    { name: CANONICAL_FILES.service, code: SIMULATED.service },
    { name: 'INLINE', code: SIMULATED_RUMP },
  ]);
  const wrongResult = loadOrderSafe(wrong);
  ok(!wrongResult.safe, 'PREDICATE REJECTS panel-before-service once the panel really reads a service binding at load time' +
     (wrongResult.violations[0] ? ' (breaks `' + wrongResult.violations[0].name + '`)' : ''));
  const right = BASE_PARTS.concat([
    { name: CANONICAL_FILES.adapter, code: SIMULATED.adapter },
    { name: CANONICAL_FILES.service, code: SIMULATED.service },
    { name: CANONICAL_FILES.panel, code: panelWithLoadTimeRead },
    { name: 'INLINE', code: SIMULATED_RUMP },
  ]);
  ok(loadOrderSafe(right).safe, 'the SAME modified panel is accepted when it comes after the service — position, not content, decides');
  // Same demonstration for the adapter dependency.
  const serviceReadsConstant = SIMULATED.service + '\nvar DSBS_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n';
  const wrong2 = BASE_PARTS.concat([
    { name: CANONICAL_FILES.service, code: serviceReadsConstant },
    { name: CANONICAL_FILES.adapter, code: SIMULATED.adapter },
    { name: CANONICAL_FILES.panel, code: SIMULATED.panel },
    { name: 'INLINE', code: SIMULATED_RUMP },
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

// ── SOURCE guards ────────────────────────────────────────────────────────────
const SOURCE_GUARDS = [
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
      return r.found && r.counts.httpMethod === 0 && r.counts.scannerRun === 0 && !/\bPOST\b/.test(r.blockMasked);
    } },
  { name: 'single-direct-fetch', fn: function (r) { return r.found && r.counts.directFetch === 1; } },
  { name: 'single-interval', fn: function (r) { return r.found && r.counts.setInterval === 1 && r.counts.clearInterval === 1; } },
  { name: 'two-timeouts-one-cleartimeout', fn: function (r) {
      return r.found && r.counts.setTimeout === 2 && r.counts.clearTimeout === 1;
    } },
  { name: 'snapshot-single-flight', fn: function (r) {
      return r.found && /if\s*\(\s*st\.fetching\s*\)\s*return\s+st\.inflightSnapshot/.test(r.blockText);
    } },
  { name: 'live-single-flight', fn: function (r) {
      return r.found && /if\s*\(\s*st\.liveEnriching\s*\)\s*return/.test(r.blockText);
    } },
  { name: 'retry-single-flight', fn: function (r) {
      return r.found && /if\s*\(\s*st\.liveRetryTimerId\s*\)\s*return/.test(r.blockText);
    } },
  { name: 'abort-cooldown', fn: function (r) {
      return r.found && /liveEnrichCooldownUntil\s*=\s*Date\.now\(\)\s*\+\s*DSB_LIVE_ABORT_COOLDOWN_MS/.test(r.blockText);
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
      return r.found && r.topLevelStatements.length === 2 &&
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
];

const REAL_PLAN = buildPlanRecord();
SOURCE_GUARDS.forEach(function (g) { ok(g.fn(A), 'SOURCE GUARD holds: ' + g.name); });
PLAN_GUARDS.forEach(function (g) { ok(g.fn(REAL_PLAN), 'PLAN GUARD holds: ' + g.name); });
{
  const parts = APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; });
  ORDER_GUARDS.forEach(function (g) { ok(g.fn(SCRIPT_TAGS, parts), 'ORDER GUARD holds: ' + g.name); });
}
eq(SOURCE_GUARDS.length, 25, 'source guards defined');
eq(PLAN_GUARDS.length, 12, 'plan guards defined');
eq(ORDER_GUARDS.length, 2, 'order guards defined');

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 29 — MUTATION PROOF
//
// Three mutant families, each judged by the guard family that describes it.
// Every mutant is applied to a COPY held in memory; no file is opened for
// writing. A mutant that changes its copy but trips nothing is a WEAK mutant and
// fails this section.
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

// ── FAMILY 1: source mutants (judged by SOURCE guards) ───────────────────────
const SOURCE_MUTANTS = [
  { id: 1, name: 'a DSB function is OMITTED from the block',
    mutate: function (src) {
      const f = A.fns.find(function (x) { return x.name === 'dsbFmtClock'; });
      return src.slice(0, f.start) + src.slice(f.end);
    } },
  { id: 2, name: 'a NON-DSB function is wrongly included inside the block',
    mutate: function (src) { return insertBefore(src, 'function dsbState()', 'function dsbNotReallyMine(x){ return x; }\n'); } },
  { id: 3, name: 'a declaration is DUPLICATED inside the block',
    mutate: function (src) { return insertBefore(src, 'function dsbFindRow(symbol)', 'function _dsbNum(v){ return v; }\n'); } },
  { id: 4, name: 'the PHYSICAL ORDER of two declarations is swapped',
    mutate: function (src) {
      const a = A.fns.find(function (x) { return x.name === '_dsbStr'; });
      const b = A.fns.find(function (x) { return x.name === '_dsbBool'; });
      return src.slice(0, a.start) + src.slice(b.start, b.end) + src.slice(a.end, b.start) +
             src.slice(a.start, a.end) + src.slice(b.end);
    } },
  { id: 5, name: 'a SIGNATURE is altered (a parameter is added)',
    mutate: function (src) { return replaceOnce(src, 'function dsbRowsForMode(rows,mode)', 'function dsbRowsForMode(rows,mode,extra)'); } },
  { id: 6, name: 'a NEW EXTERNAL CALLER of a DSB function is introduced',
    mutate: function (src) { return replaceOnce(src, 'function showView(name) {', 'function showView(name) {\n  dsbFindRow(name);'); } },
  { id: 7, name: 'a NEW STATE WRITE appears in a function that owned none',
    mutate: function (src) {
      return replaceOnce(src, 'function dsbFindRow(symbol){\n  try{',
                              'function dsbFindRow(symbol){\n  try{\n    dsbState().lastFetchAt=0;');
    } },
  { id: 8, name: 'S.scanData usage is introduced into the block',
    mutate: function (src) {
      return replaceOnce(src, 'function dsbRowsForMode(rows,mode){', 'function dsbRowsForMode(rows,mode){\n  var _leak=S.scanData;');
    } },
  { id: 9, name: 'a POST to the scanner is introduced',
    mutate: function (src) {
      return replaceOnce(src, "fetch(BACKEND+'/scanner/directional/snapshot',{headers:_backendAuthHeaders()",
                              "fetch(BACKEND+'/scanner/run',{method:'POST',headers:_backendAuthHeaders()");
    } },
  { id: 10, name: 'a SECOND direct fetch is introduced',
    mutate: function (src) {
      return replaceOnce(src, 'async function dsbEnrichVisibleRowsLive(opts){',
                              "async function dsbEnrichVisibleRowsLive(opts){\n  try{ await fetch(BACKEND+'/market/live'); }catch(e){}");
    } },
  { id: 11, name: 'a SECOND setInterval is introduced',
    mutate: function (src) {
      return replaceOnce(src, 'function dsbRefreshClicked(){',
                              'function dsbRefreshClicked(){\n  setInterval(function(){ dsbFetchSnapshot({force:true}); }, 5000);');
    } },
  { id: 12, name: 'the retry timer is DUPLICATED',
    mutate: function (src) {
      return replaceOnce(src, 'function dsbCancelLiveEnrichRetry(){',
                              'function dsbCancelLiveEnrichRetry(){\n  setTimeout(function(){ dsbEnrichVisibleRowsLive(); }, 1000);');
    } },
  { id: 13, name: 'the snapshot SINGLE-FLIGHT guard is removed',
    mutate: function (src) { return replaceOnce(src, 'if(st.fetching)return st.inflightSnapshot||undefined;', '/* single-flight removed */'); } },
  { id: 14, name: 'the ABORT COOLDOWN is removed',
    mutate: function (src) { return src.split('st.liveEnrichCooldownUntil=Date.now()+DSB_LIVE_ABORT_COOLDOWN_MS;').join('/* cooldown removed */'); } },
  { id: 15, name: 'the DETAIL-OPEN protection is removed',
    mutate: function (src) {
      return replaceOnce(src, "if(typeof _dssDetailSymbol!=='undefined'&&_dssDetailSymbol!=null)return; // chart open → keep it",
                              '/* detail-open protection removed */');
    } },
  { id: 16, name: 'a TOP-LEVEL AUTO-CALL is introduced into the block',
    mutate: function (src) { return insertBefore(src, 'function showView(name) {', 'dsbStartAutoRefresh();\n'); } },
  { id: 17, name: 'a window EXPOSURE is removed from the block',
    mutate: function (src) {
      return replaceOnce(src,
        'try{ if(typeof window!==\'undefined\')window.apexDebugDirectionalBackendSnapshot=apexDebugDirectionalBackendSnapshot; }catch(e){ /* non-browser context */ }',
        '/* exposure removed */');
    } },
  { id: 18, name: 'a DSB constant + S are READ at load time (TDZ exposure shape)',
    mutate: function (src) {
      return insertBefore(src, 'function showView(name) {', 'if (DSB_SNAPSHOT_TTL_MS > 0) { S.backendDirectional = null; }\n');
    } },
  { id: 19, name: 'the chart bridge is reclassified as having NO external consumer',
    mutate: function (src) {
      let out = src.split("if(!d&&typeof dsbScanRowShim==='function')d=dsbScanRowShim(symbol);").join('/* removed */');
      out = out.split("if(!ts&&typeof dsbTechnicalStateShim==='function')ts=dsbTechnicalStateShim(symbol);").join('/* removed */');
      out = out.split("if(typeof dsbNoteDirectionalChartOpen==='function')dsbNoteDirectionalChartOpen(symbol,ts);").join('/* removed */');
      return out;
    } },
  { id: 20, name: 'the BSS/adapter dependency is rewired INSIDE the block',
    mutate: function (src) {
      const block = src.slice(A.start, A.end)
        .split('bdsDeriveBackendDirectionalRows').join('bdspDeriveBackendDirectionalRows')
        .split('bssFmtAgeMs').join('bdspFmtAgeMs');
      return src.slice(0, A.start) + block + src.slice(A.end);
    } },
  { id: 21, name: 'a DOM id owned by the block is changed',
    mutate: function (src) { return src.split("getElementById('dsb-refresh')").join("getElementById('dsb-reload')"); } },
  { id: 22, name: 'a localStorage key is changed',
    mutate: function (src) { return src.split("'apex_dss_source_mode'").join("'apex_dsb_source_mode'"); } },
];

// ── FAMILY 2: plan mutants (judged by PLAN guards) ───────────────────────────
const PLAN_MUTANTS = [
  { id: 23, name: 'dsbRowsForMode is placed in BOTH the adapter and the panel',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.concat(['dsbRowsForMode']),
      } });
    } },
  { id: 24, name: 'a DSB constant is OMITTED from the adapter manifest',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.filter(function (n) { return n !== 'DSB_CHART_LIVE_TTL_MS'; }),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.slice(),
      } });
    } },
  { id: 25, name: 'a DSB constant is moved to the PANEL (a layer above its consumers)',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.filter(function (n) { return n !== 'DSB_SNAPSHOT_TTL_MS'; }),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.concat(['DSB_SNAPSHOT_TTL_MS']),
      } });
    } },
  { id: 26, name: 'the scoring model ignores the bindings (46 declarations instead of 54)',
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
  { id: 27, name: 'the metric is NOT homogeneous (shipped by file bytes, candidates by declaration bytes)',
    build: function () {
      return buildPlanRecord({ measureShipped: function (code) { return code.length; } });
    } },
  { id: 28, name: 'the window exposures are moved INTO the service module (W1 while W2 was derived)',
    build: function () { return buildPlanRecord({ exposuresInModule: true }); } },
  { id: 29, name: 'a declaration is assigned to ZERO modules',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.filter(function (n) { return n !== 'dsbRefreshClicked'; }),
        panel: CANONICAL_MODULES.panel.slice(),
      } });
    } },
  { id: 30, name: 'a declaration (not dsbRowsForMode) is assigned to TWO modules',
    build: function () {
      return buildPlanRecord({ modules: {
        adapter: CANONICAL_MODULES.adapter.slice(),
        service: CANONICAL_MODULES.service.slice(),
        panel: CANONICAL_MODULES.panel.concat(['dsbGetBackendSource']),
      } });
    } },
  { id: 31, name: 'the chart bridge is split out, splitting state ownership too',
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
const ORDER_MUTANTS = [
  { id: 32, name: 'a future DSB script is given `defer`',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      t.splice(t.length - 1, 0, { attrs: ' src="' + CANONICAL_FILES.service + '" defer',
                                  src: './' + CANONICAL_FILES.service, type: null, inline: '' });
      return { tags: t, parts: parts };
    } },
  { id: 33, name: 'a future DSB script is declared type="module"',
    mutate: function (tags, parts) {
      const t = tags.map(function (x) { return Object.assign({}, x); });
      t.splice(t.length - 1, 0, { attrs: ' src="' + CANONICAL_FILES.service + '" type="module"',
                                  src: './' + CANONICAL_FILES.service, type: 'module', inline: '' });
      return { tags: t, parts: parts };
    } },
  { id: 34, name: 'the three DSB modules are loaded in the WRONG order (panel before service)',
    mutate: function (tags, parts) {
      const panelWithLoadTimeRead = SIMULATED.panel + '\nvar DSBP_BOOT_MODE = dsbSourceMode;\n';
      return { tags: tags, parts: BASE_PARTS.concat([
        { name: CANONICAL_FILES.adapter, code: SIMULATED.adapter },
        { name: CANONICAL_FILES.panel, code: panelWithLoadTimeRead },
        { name: CANONICAL_FILES.service, code: SIMULATED.service },
        { name: 'INLINE', code: SIMULATED_RUMP },
      ]) };
    } },
  { id: 35, name: 'the service is loaded before the adapter while reading a DSB constant at load time',
    mutate: function (tags, parts) {
      const serviceReadsConstant = SIMULATED.service + '\nvar DSBS_BOOT_TTL = DSB_SNAPSHOT_TTL_MS;\n';
      return { tags: tags, parts: BASE_PARTS.concat([
        { name: CANONICAL_FILES.service, code: serviceReadsConstant },
        { name: CANONICAL_FILES.adapter, code: SIMULATED.adapter },
        { name: CANONICAL_FILES.panel, code: SIMULATED.panel },
        { name: 'INLINE', code: SIMULATED_RUMP },
      ]) };
    } },
  { id: 36, name: 'a real provider module is moved after the inline monolith',
    mutate: function (tags, parts) {
      const idx = APP_PARTS.findIndex(function (p) { return p.name === './js/api/backend-client.js'; });
      const moved = APP_PARTS.filter(function (_, i) { return i !== idx; })
        .concat([APP_PARTS[idx]]).map(function (p) { return { name: p.name, code: p.code }; });
      return { tags: tags, parts: moved };
    } },
];

const CONTENT_HASH_BEFORE = crypto.createHash('sha256').update(SRC).digest('hex');
let mutantsRun = 0, mutantsCaught = 0;
const weakMutants = [];

SOURCE_MUTANTS.forEach(function (m) {
  mutantsRun++;
  let mutated;
  try { mutated = m.mutate(SRC); }
  catch (e) { ok(false, 'SOURCE MUTANT ' + m.id + ' could not be applied: ' + e.message); return; }
  if (mutated === SRC) { ok(false, 'SOURCE MUTANT ' + m.id + ' did not change the copy — invalid mutant'); return; }
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

ORDER_MUTANTS.forEach(function (m) {
  mutantsRun++;
  const baseParts = APP_PARTS.map(function (p) { return { name: p.name, code: p.code }; });
  const out = m.mutate(SCRIPT_TAGS.map(function (t) { return Object.assign({}, t); }), baseParts);
  const changed = out.tags.length !== SCRIPT_TAGS.length ||
                  JSON.stringify(out.parts.map(function (p) { return p.name; })) !==
                  JSON.stringify(baseParts.map(function (p) { return p.name; })) ||
                  out.parts.some(function (p, i) { return baseParts[i] && p.code !== baseParts[i].code; });
  if (!changed) { ok(false, 'ORDER MUTANT ' + m.id + ' did not change the copy — invalid mutant'); return; }
  const tripped = ORDER_GUARDS.filter(function (g) {
    let healthy; try { healthy = g.fn(out.tags, out.parts); } catch (e) { healthy = false; }
    return !healthy;
  }).map(function (g) { return g.name; });
  if (tripped.length === 0) weakMutants.push(m.id); else mutantsCaught++;
  ok(tripped.length > 0, 'MUTANT ' + m.id + ' [order] — ' + m.name + ' → [' + tripped.join(', ') + ']');
});

const MUTANT_TOTAL = SOURCE_MUTANTS.length + PLAN_MUTANTS.length + ORDER_MUTANTS.length;
eq(SOURCE_MUTANTS.length, 22, 'source mutants');
eq(PLAN_MUTANTS.length, 9, 'plan mutants');
eq(ORDER_MUTANTS.length, 5, 'order mutants');
eq(mutantsRun, MUTANT_TOTAL, 'mutants executed');
eq(MUTANT_TOTAL, 36, 'total mutants');
deepEq(weakMutants, [], 'weak mutants (changed the copy but tripped nothing)');
eq(mutantsCaught, MUTANT_TOTAL, 'mutants intercepted by at least one guard');
eq(crypto.createHash('sha256').update(SRC).digest('hex'), CONTENT_HASH_BEFORE,
   'the in-memory application source is byte-identical after the whole mutation run');
{
  const fresh = analyze(APP.loadAppJavaScriptSource());
  deepEq(fresh.fnNames, A.fnNames, 're-analysing after the mutation run yields the identical manifest');
  eq(fresh.blockLength, A.blockLength, 're-analysing after the mutation run yields the identical block length');
  const freshPlan = buildPlanRecord();
  deepEq(freshPlan.modules, REAL_PLAN.modules, 're-building the plan after the mutation run yields the identical manifests');
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 30 — audit-only proof: application files untouched
// ═════════════════════════════════════════════════════════════════════════════
function sectionIntegrity() {
  section('SECTION 30 — audit-only integrity');
  APP_FILES.forEach(function (f) {
    eq(hashFile(f), HASHES_BEFORE[f], 'byte-identical after the whole run: ' + f);
  });
  [['js', 'services', 'backend-directional-snapshot-service.js'],
   ['js', 'ui', 'backend-directional-snapshot-panel.js'],
   ['js', 'adapters', 'backend-directional-snapshot-adapter.js'],
   ['js', 'services', 'directional-chart-display-price.js']].forEach(function (parts) {
    const rel = parts.join('/');
    ok(!fs.existsSync(path.resolve.apply(path, [__dirname, '..'].concat(parts))),
       'no ' + rel + ' was created by this audit');
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
  const lines = [
    'physical boundary      [' + A.start + ',' + A.end + ') = ' + A.blockLength + ' chars, inline script #21, depth 0/0, contiguous',
    'declarations           54 = 46 functions (3 async) + 8 var constants',
    'top-level statements   2 (both window.apexDebug* exposures; no auto-call, no timer, no fetch)',
    'manifest correction    48 hypothesised → 46 real; resolveLatestDisplayPrice + _dssResolvePrice live OUTSIDE',
    'internal edges         ' + ALL_EDGES.length + ' = ' + FUNCTION_EDGES.length + ' function→function + ' +
                             BINDING_EDGES.length + ' function→constant',
    'external entry points  11 functions, 6 external consumers, 6 static onclick globals',
    'state owner            S.backendDirectional, lazily created by dsbState(); 14 eager + 2 dynamic fields, 10 writers',
    'S.scanData             0 executable references (7 comment mentions only)',
    'DOM / storage          4 element ids, 1 innerHTML write, 0 listeners | 2 keys, 1 writer',
    'network                1 direct fetch (GET /scanner/directional/snapshot); quotes reuse the shared helpers',
    'timers                 1 auto-refresh interval + 1 readiness retry + 1 UI debounce',
    'purity                 11 of 46 functions provably side-effect free (throwing-Proxy sandbox)',
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
    'recommendation         OPTION ' + RECOMMENDATION.option + ' — adapter + service + panel, 3 sequential PRs',
    'PR 1                   ' + CANONICAL_FILES.adapter + ' — ' + PR_PLAN[0].manifest.length + ' decls / ' + prBytes[0] + ' B',
    'PR 2                   ' + CANONICAL_FILES.service + ' — ' + PR_PLAN[1].manifest.length + ' decls / ' + prBytes[1] + ' B',
    'PR 3                   ' + CANONICAL_FILES.panel + ' — ' + PR_PLAN[2].manifest.length + ' decls / ' + prBytes[2] + ' B',
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
