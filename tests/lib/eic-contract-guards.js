'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// EIC CONTRACT GUARDS — the verifiers, separated from the thing being verified.
//
// WHY THIS FILE EXISTS
//   The first version of the EIC contract "proved" its rules with entries like
//
//       mutant('the script tag gains defer', () => !/\bdefer\b/i.test(tag.attrs));
//
//   That does not mutate anything. It asks whether the HEALTHY repository
//   currently satisfies the rule, and reports "mutant killed" when it does. A
//   suite full of those can be 100% green while detecting nothing, because the
//   rule and the evidence are the same expression.
//
//   A real mutation proof needs three separable pieces:
//     1. a MODEL — source text, a script list, a manifest — that can be copied
//        and perturbed in memory;
//     2. a GUARD — a pure function from model to a list of violations, with no
//        knowledge of whether it is looking at the real repository or a mutant;
//     3. a RUNNER that feeds the guard a mutated model and requires the guard
//        to object.
//
//   This file is (2). Every guard here is called TWICE by the contract: once on
//   the real repository — where it must return zero violations — and once per
//   mutant on a perturbed copy, where it must return at least one. The guard
//   cannot tell the difference, which is the whole point.
//
// GUARDS NEVER THROW AS A MEANS OF DETECTION
//   A mutation that makes the module unparseable must be caught by a NAMED
//   violation, not by a stack trace. A crash is indistinguishable from a broken
//   harness, so every guard catches internally and converts failure into a
//   violation with a stable code. The runner counts a mutant as killed only when
//   `violations` is non-empty — never when the guard merely threw.
// ─────────────────────────────────────────────────────────────────────────────

const vm = require('vm');
const crypto = require('crypto');
const EIC_PR4_UNDO = require('./eic-pr4-undo.js');

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// ─────────────────────────────────────────────────────────────────────────────
// Shared lexical helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace every string, template literal, regex literal and comment with
 * same-LENGTH filler, so offsets stay valid while textual probes can no longer
 * be fooled by a comment or a string that mentions an identifier.
 */
function maskLiterals(t) {
  const out = t.split('');
  let i = 0, prev = '';
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  const blank = (from, to, ch) => { for (let k = from; k < to && k < out.length; k++) out[k] = (t[k] === '\n' ? '\n' : (ch || ' ')); };
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < t.length && t[j] !== '\n') j++; blank(i, j); i = j; continue; }
    if (c === '/' && d === '*') { let j = i + 2; while (j < t.length && !(t[j] === '*' && t[j + 1] === '/')) j++; j += 2; blank(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < t.length) { if (t[j] === '\\') { j += 2; continue; } if (t[j] === q) { j++; break; } j++; }
      blank(i + 1, j - 1); i = j; prev = '"'; continue;
    }
    if (c === '/' && (prev === '' || !(isIdent(prev) || prev === ')' || prev === ']'))) {
      let j = i + 1, inClass = false, closed = false;
      for (; j < t.length; j++) {
        if (t[j] === '\\') { j++; continue; }
        if (t[j] === '\n') break;
        if (t[j] === '[') inClass = true; else if (t[j] === ']') inClass = false;
        else if (t[j] === '/' && !inClass) { closed = true; break; }
      }
      if (closed) { let k = j + 1; while (k < t.length && /[a-z]/i.test(t[k])) k++; blank(i + 1, k); i = k; prev = '/'; continue; }
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

/**
 * Blank COMMENTS with same-length filler, leaving string literals intact.
 *
 * `maskLiterals` blanks comments AND strings, which is right for "does this code
 * mention an identifier" but useless for "does this code contain this exact
 * string literal" — the literal is exactly what it destroys. A guard that
 * checked the raw source instead would accept a DOM id that appears only in a
 * hand-written comment, which is how EIC PR 3 first wrote its selector guard and
 * why a mutant survived it.
 */
function stripComments(t) {
  const out = t.split('');
  let i = 0, prev = '';
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  const blank = (from, to) => { for (let k = from; k < to && k < out.length; k++) out[k] = (t[k] === '\n' ? '\n' : ' '); };
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < t.length && t[j] !== '\n') j++; blank(i, j); i = j; continue; }
    if (c === '/' && d === '*') { let j = i + 2; while (j < t.length && !(t[j] === '*' && t[j + 1] === '/')) j++; j += 2; blank(i, j); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < t.length) { if (t[j] === '\\') { j += 2; continue; } if (t[j] === q) { j++; break; } j++; }
      i = j; prev = '"'; continue;
    }
    if (c === '/' && (prev === '' || !(isIdent(prev) || prev === ')' || prev === ']'))) {
      let j = i + 1, inClass = false, closed = false;
      for (; j < t.length; j++) {
        if (t[j] === '\\') { j++; continue; }
        if (t[j] === '\n') break;
        if (t[j] === '[') inClass = true; else if (t[j] === ']') inClass = false;
        else if (t[j] === '/' && !inClass) { closed = true; break; }
      }
      if (closed) { let k = j + 1; while (k < t.length && /[a-z]/i.test(t[k])) k++; i = k; prev = '/'; continue; }
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}

const DECL_KEYWORDS = ['function', 'var', 'const', 'let', 'class', 'async'];

/** Top-level declaration scanner. Reports SITES, not names. */
function scanTopLevelDeclarations(src) {
  const decls = [];
  const n = src.length;
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  const regexAllowed = (p) => p === '' || !(isIdent(p) || p === ')' || p === ']');

  function skipString(start) {
    const q = src[start];
    for (let j = start + 1; j < n; j++) {
      const c = src[j];
      if (c === '\\') { j++; continue; }
      if (q === '`' && c === '$' && src[j + 1] === '{') {
        let depth = 0, k = j + 1;
        for (; k < n; k++) {
          const cc = src[k], dd = src[k + 1];
          if (cc === '"' || cc === "'" || cc === '`') { k = skipString(k); continue; }
          if (cc === '/' && dd === '/') { while (k < n && src[k] !== '\n') k++; continue; }
          if (cc === '/' && dd === '*') { k += 2; while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++; k++; continue; }
          if (cc === '{') depth++;
          else if (cc === '}') { depth--; if (depth === 0) break; }
        }
        j = k; continue;
      }
      if (c === q) return j;
    }
    return n - 1;
  }
  function trySkipRegex(start) {
    let inClass = false;
    for (let j = start + 1; j < n; j++) {
      const c = src[j];
      if (c === '\\') { j++; continue; }
      if (c === '\n') return start;
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) { let k = j + 1; while (k < n && /[a-z]/i.test(src[k])) k++; return k - 1; }
    }
    return start;
  }
  function skipWs(k) {
    while (k < n) {
      const c = src[k], d = src[k + 1];
      if (c === '/' && d === '/') { while (k < n && src[k] !== '\n') k++; continue; }
      if (c === '/' && d === '*') { k += 2; while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++; k += 2; continue; }
      if (/\s/.test(c)) { k++; continue; }
      break;
    }
    return k;
  }
  function matchBrace(start) {
    let depth = 0, prev = '';
    for (let j = start; j < n; j++) {
      const c = src[j], d = src[j + 1];
      if (c === '/' && d === '/') { while (j < n && src[j] !== '\n') j++; continue; }
      if (c === '/' && d === '*') { j += 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { j = skipString(j); prev = '"'; continue; }
      if (c === '/' && regexAllowed(prev)) { const e = trySkipRegex(j); if (e > j) { j = e; prev = '/'; continue; } }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return j; }
      if (!/\s/.test(c)) prev = c;
    }
    return -1;
  }
  function tryDecl(start, word) {
    let k = start + word.length, isAsync = false, kw = word;
    if (word === 'async') {
      const k2 = skipWs(k);
      if (src.slice(k2, k2 + 8) === 'function' && !isIdent(src[k2 + 8])) { isAsync = true; kw = 'function'; k = k2 + 8; }
      else return null;
    }
    if (kw === 'function' || kw === 'class') {
      let k2 = skipWs(k);
      if (kw === 'function' && src[k2] === '*') k2 = skipWs(k2 + 1);
      let e = k2; while (e < n && isIdent(src[e])) e++;
      const name = src.slice(k2, e);
      if (!name) return null;
      const bs = src.indexOf('{', e); if (bs < 0) return null;
      const be = matchBrace(bs); if (be < 0) return null;
      return { name, form: kw, isAsync, start, end: be, chars: be - start + 1 };
    }
    let k2 = skipWs(k), e = k2;
    while (e < n && isIdent(src[e])) e++;
    const name = src.slice(k2, e);
    if (!name) return null;
    let depth = 0, pd = 0, bd = 0, prev = '';
    for (let j = e; j < n; j++) {
      const cc = src[j], dd = src[j + 1];
      if (cc === '/' && dd === '/') { while (j < n && src[j] !== '\n') j++; j--; continue; }
      if (cc === '/' && dd === '*') { j += 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j++; continue; }
      if (cc === '"' || cc === "'" || cc === '`') { j = skipString(j); prev = '"'; continue; }
      if (cc === '/' && regexAllowed(prev)) { const ee = trySkipRegex(j); if (ee > j) { j = ee; prev = '/'; continue; } }
      if (cc === '{') depth++;
      else if (cc === '}') depth--;
      else if (cc === '(') pd++;
      else if (cc === ')') pd--;
      else if (cc === '[') bd++;
      else if (cc === ']') bd--;
      else if (cc === ';' && !depth && !pd && !bd) return { name, form: kw, isAsync: false, start, end: j, chars: j - start + 1 };
      else if (cc === '\n' && !depth && !pd && !bd) {
        if (prev && !/[,+\-*/%&|^=?:.<>!~(\[{]/.test(prev)) {
          const nx = skipWs(j), nc = src[nx];
          if (nc === undefined || !/[,+\-*/%&|^=?:.<>!~(\[]/.test(nc)) {
            let ei = j - 1; while (ei > start && /\s/.test(src[ei])) ei--;
            return { name, form: kw, isAsync: false, start, end: ei, chars: ei - start + 1 };
          }
        }
      }
      if (!/\s/.test(cc)) prev = cc;
    }
    let ei = n - 1; while (ei > start && /\s/.test(src[ei])) ei--;
    return { name, form: kw, isAsync: false, start, end: ei, chars: ei - start + 1 };
  }

  let i = 0, brace = 0, paren = 0, bracket = 0, prevSig = '';
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { i = skipString(i) + 1; prevSig = '"'; continue; }
    if (c === '/' && regexAllowed(prevSig)) { const e = trySkipRegex(i); if (e > i) { i = e + 1; prevSig = '/'; continue; } }
    if (c === '(') paren++; else if (c === ')') paren--;
    else if (c === '[') bracket++; else if (c === ']') bracket--;
    else if (c === '{') brace++; else if (c === '}') brace--;
    if (!brace && !paren && !bracket && isIdent(c) && !isIdent(src[i - 1])) {
      let j = i; while (j < n && isIdent(src[j])) j++;
      const w = src.slice(i, j);
      if (DECL_KEYWORDS.indexOf(w) >= 0) {
        const r = tryDecl(i, w);
        if (r) { decls.push(r); i = r.end + 1; prevSig = src[r.end]; continue; }
      }
      i = j; prevSig = src[j - 1]; continue;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return decls;
}

// ═════════════════════════════════════════════════════════════════════════════
// LOAD-TIME OBSERVER SCANNER
//
// The question this answers is NOT "does this script mention the name?" but
// "does this script READ the binding while it is being evaluated?" — because
// only the second constrains where the <script> tag may go.
//
// A reference is DEFERRED when it sits inside a function body that is not
// immediately invoked. Everything else — top-level statements, top-level
// declarator initialisers, arguments of a top-level call, and the bodies of
// IIFEs — is EVALUATION-TIME.
//
//   var x = eicScreenTicker;            → evaluation-time (reads the binding)
//   eicScreenTicker();                  → evaluation-time
//   register(eicScreenTicker);          → evaluation-time (the ARGUMENT is read)
//   register(function(){eicScreenTicker()}) → deferred (body runs later)
//   function later(){ eicScreenTicker() }   → deferred
//   (function(){ eicScreenTicker(); })();   → evaluation-time (IIFE)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Map every function body in `src` to [start,end] of its braces, flagging the
 * ones that are immediately invoked. Returns ranges sorted by start.
 */
function functionBodyRanges(src) {
  const masked = maskLiterals(src);
  const n = masked.length;
  const ranges = [];
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);

  function matchBraceMasked(start) {
    let depth = 0;
    for (let j = start; j < n; j++) {
      if (masked[j] === '{') depth++;
      else if (masked[j] === '}') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }
  function matchParenMasked(start) {
    let depth = 0;
    for (let j = start; j < n; j++) {
      if (masked[j] === '(') depth++;
      else if (masked[j] === ')') { depth--; if (depth === 0) return j; }
    }
    return -1;
  }
  function nextNonWs(k) { while (k < n && /\s/.test(masked[k])) k++; return k; }

  // `function` keyword form (declaration, expression, method-ish)
  const fnRe = /\bfunction\b/g;
  let m;
  while ((m = fnRe.exec(masked)) !== null) {
    let k = m.index + 8;
    k = nextNonWs(k);
    if (masked[k] === '*') k = nextNonWs(k + 1);
    while (k < n && isIdent(masked[k])) k++;      // optional name
    k = nextNonWs(k);
    if (masked[k] !== '(') continue;
    const pEnd = matchParenMasked(k);
    if (pEnd < 0) continue;
    const bStart = nextNonWs(pEnd + 1);
    if (masked[bStart] !== '{') continue;
    const bEnd = matchBraceMasked(bStart);
    if (bEnd < 0) continue;
    // Immediately invoked?  `}` … `)` `(`  or  `}` `(`
    let after = nextNonWs(bEnd + 1);
    let iife = false;
    if (masked[after] === ')') { const a2 = nextNonWs(after + 1); if (masked[a2] === '(') iife = true; }
    else if (masked[after] === '(') iife = true;
    ranges.push({ start: bStart, end: bEnd, iife });
    fnRe.lastIndex = bStart + 1;
  }

  // method shorthand:  { run(){ … } }  and class bodies.  No `function`
  // keyword and no `=>`, so it needs its own pass or its body would be read as
  // evaluation-time code.
  const methodRe = /(^|[{,;}])\s*(?:static\s+|get\s+|set\s+|async\s+)*([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  const NOT_METHOD = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'new', 'do', 'else', 'function']);
  while ((m = methodRe.exec(masked)) !== null) {
    // The captured name is group 2 — the modifier alternation is NON-capturing.
    // This read said `m[3]` until EIC PR 3, which is always `undefined`, so
    // NOT_METHOD never matched and every top-level `if (…) { … }`, `for`, `while`
    // and `switch` BLOCK was registered as a deferred function body. That is the
    // one direction this scanner must never get wrong: a reference inside a
    // top-level `if` is read while the script evaluates, and misreading it as
    // call-time would hide exactly the load-time observer the proof exists to
    // find. PR 3's §7D controls pin all four forms so it cannot regress.
    if (NOT_METHOD.has(m[2])) continue;
    const pOpen = masked.indexOf('(', m.index + m[1].length);
    const pEnd = matchParenMasked(pOpen);
    if (pEnd < 0) continue;
    const bStart = nextNonWs(pEnd + 1);
    if (masked[bStart] !== '{') continue;
    const bEnd = matchBraceMasked(bStart);
    if (bEnd < 0) continue;
    ranges.push({ start: bStart, end: bEnd, iife: false });
  }

  // arrow form with a block body:  (a,b) => { … }   or   a => { … }
  const arrowRe = /=>/g;
  while ((m = arrowRe.exec(masked)) !== null) {
    const bStart = nextNonWs(m.index + 2);
    if (masked[bStart] !== '{') {
      // concise body: everything up to the end of the expression is deferred.
      // Bound it conservatively at the next `,` `)` `;` or newline at depth 0.
      let depth = 0, j = bStart;
      for (; j < n; j++) {
        const c = masked[j];
        if (c === '(' || c === '[' || c === '{') depth++;
        else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
        else if ((c === ',' || c === ';' || c === '\n') && depth === 0) break;
      }
      ranges.push({ start: bStart, end: j - 1, iife: false });
      continue;
    }
    const bEnd = matchBraceMasked(bStart);
    if (bEnd < 0) continue;
    let after = nextNonWs(bEnd + 1);
    let iife = false;
    if (masked[after] === ')') { const a2 = nextNonWs(after + 1); if (masked[a2] === '(') iife = true; }
    else if (masked[after] === '(') iife = true;
    ranges.push({ start: bStart, end: bEnd, iife });
  }

  return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Classify every occurrence of `names` in `src`.
 * Returns { loadTime: [{name, index, excerpt}], callTime: [...] }.
 * Occurrences inside comments and string literals are ignored entirely.
 */
function classifyReferences(src, names) {
  const masked = maskLiterals(src);
  const bodies = functionBodyRanges(src).filter((r) => !r.iife);
  const loadTime = [], callTime = [];
  for (const name of names) {
    const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
    let m;
    while ((m = re.exec(masked)) !== null) {
      const at = m.index + m[1].length;
      // Skip the declaration head itself: `function NAME(`
      const before = masked.slice(Math.max(0, at - 40), at);
      if (/\bfunction\s+$/.test(before)) continue;
      // INCLUSIVE bounds. A concise arrow body (`x => eicScreenTicker(x)`)
      // starts exactly at the identifier, so a strict `>` would classify it as
      // evaluation-time — the one direction this scanner must never get wrong,
      // because it would invent a load-order constraint that does not exist.
      const deferred = bodies.some((r) => at >= r.start && at <= r.end);
      const rec = { name, index: at, excerpt: src.slice(Math.max(0, at - 45), at + 45).replace(/\n/g, ' ') };
      (deferred ? callTime : loadTime).push(rec);
    }
  }
  return { loadTime, callTime };
}

// ═════════════════════════════════════════════════════════════════════════════
// THE GUARDS
//
// Each returns { violations: [string], threw: string|null }.
// `violations` empty === the input is ACCEPTED.
// ═════════════════════════════════════════════════════════════════════════════

const EXPECTED_MODULE = {
  order: ['eicScreenTicker', 'eicLiqFromLegs', 'eicLiqFromLegs', 'eicBuildLiveContext'],
  sites: 4,
  names: 3,
  chars: 14368,
  spanSha: {
    eicScreenTicker: 'ae3e69a36e2ef7474de15f7637cf17a6bb3baa8da68ca9fe414ce21e694ead98',
    eicLiqFromLegs: '5bdd857bf5036a3b852747c9ae663f9b5ee651abd040a725d02853461f00c2fc',
    eicBuildLiveContext: '854ed80bb80fe68eb130750dae77ada115350e9543292d9498997d385030ab22',
  },
};

// EIC PR 2 — the panel. A SECOND shipped module, so the shape guard below is
// parameterised by a spec rather than duplicated. PR 1's spec stays the default,
// which is why every PR-1 caller and mutant in the contract is untouched.
//
// The async rule differs by design. PR 1 relocated four synchronous functions
// and asserted a blanket "nothing is async". `eicAnalyzeAll` IS async, so a
// blanket rule cannot be reused — but relaxing it to "async is allowed" would
// throw away a real check. Instead each name records the form it actually has,
// which is STRICTER than PR 1's rule: making eicAnalyzeAll sync now fails too.
const EXPECTED_PANEL = {
  duplicate: null,                    // the panel carries no duplicated name
  order: ['runEICPanel', 'eicAnalyzeAll'],
  sites: 2,
  names: 2,
  chars: 15268,
  asyncByName: { runEICPanel: false, eicAnalyzeAll: true },
  spanSha: {
    runEICPanel: '1be8f81b548d721b0b3ed4120f9d5e8d173fe73b5beffa42b1d00a9ee0c3b1b7',
    eicAnalyzeAll: 'c64a5fa431715374d69144900a6db4e0645f0318f4a1a05e851c91585bed5c5c',
  },
};

// EIC PR 3 — the ticker analysis panel. A THIRD shipped module, one site.
//
// `duplicate: null` because this module carries no duplicated name; the
// `sites === names` check already forbids one appearing. The async form is
// pinned per name exactly as PR 2 does: eicAnalyzeTicker IS async, and making it
// synchronous must fail.
const EXPECTED_TICKER_ANALYSIS = {
  duplicate: null,
  order: ['eicAnalyzeTicker'],
  sites: 1,
  names: 1,
  chars: 13990,
  asyncByName: { eicAnalyzeTicker: true },
  spanSha: {
    eicAnalyzeTicker: '10b35c8c6117bd2098784474c17e8c5e3577be5ee7d68ae6fec73e1848a64899',
  },
};

// EIC PR 4 — the live deep dive, and the LAST module of the family. FOUR sites,
// THREE names: eicFetchLegs is declared twice, byte-for-byte identically, and
// both copies moved together.
//
// `duplicate: 'eicFetchLegs'` re-arms the pair rule that PR 1 used for
// eicLiqFromLegs and that PRs 2-3 switched off with `null`. It is the only
// check that would notice one copy being dropped, the pair being collapsed into
// one, or the two being allowed to diverge — none of which would change
// behaviour, and all of which would stop this being a relocation.
//
// Every site is async, and each is pinned by name: making any of them
// synchronous must fail. `sites: 4` with `names: 3` is deliberate and is the
// reason this contract counts SITES rather than names throughout.
const EXPECTED_LIVE_DEEP_DIVE = {
  duplicate: 'eicFetchLegs',
  order: ['eicFetchLegs', 'eicFetchLegs', 'eicDXLinkDeepDive', 'eicRunDXLink'],
  sites: 4,
  names: 3,
  chars: 23726,
  asyncByName: { eicFetchLegs: true, eicDXLinkDeepDive: true, eicRunDXLink: true },
  spanSha: {
    eicFetchLegs: 'f131e1a6f59ffcebb6f96520845f01ccb8d09d5b468eb3083c810a5e18e59eba',
    eicDXLinkDeepDive: 'dc7418d41241dee28e698ec634345144c0f19fdcc5f78a23f8df92f287e660df',
    eicRunDXLink: '8a0cde00821be3a9ec42c9c0234c1d8d608ae1665c9e9a4a13a0ed178fae19f0',
  },
};

// EIC owner-corrective closure — deterministic decision rules. The post-EIC
// audit proved that these two generically named declarations are EIC-owned even
// though neither contains an `eic` identifier segment. Both are synchronous,
// pure function declarations and moved together in their original order.
const EXPECTED_DECISION_RULES = {
  duplicate: null,
  order: ['computeFinalDecision', 'computeSetupScore'],
  sites: 2,
  names: 2,
  chars: 10112,
  asyncByName: { computeFinalDecision: false, computeSetupScore: false },
  spanSha: {
    computeFinalDecision: '765b1399b7a494608d634209c33b0b8b61242fd0876c73acc33cf958d35e5981',
    computeSetupScore: 'df3135332db37817d22af4b4ecaf353b092cd51d94adc381c9d52da76396dc83',
  },
};

/**
 * The PR 4 shape is historical: it proves the exact bytes extracted from the
 * monolith. Current production may contain only the explicitly approved
 * post-extraction repair, which is removed before the historical shape check.
 */
function guardLiveDeepDiveShape(moduleSrc) {
  const projected = EIC_PR4_UNDO.extractionSource(moduleSrc);
  if (projected == null) {
    return {
      violations: ['LDD_FDCOLOR_FIX_SHAPE: the exact approved fdColor repair block is missing, duplicated or changed'],
      threw: null,
    };
  }
  return guardModuleShape(projected, EXPECTED_LIVE_DEEP_DIVE);
}

function guardModuleShape(moduleSrc, spec) {
  const S = spec || EXPECTED_MODULE;
  const violations = [];
  let threw = null;
  try {
    const decls = scanTopLevelDeclarations(moduleSrc);
    if (decls.length !== S.sites) {
      violations.push('SITE_COUNT: expected ' + S.sites + ' declaration sites, found ' + decls.length);
    }
    const names = decls.map((d) => d.name);
    if (new Set(names).size !== S.names) {
      violations.push('NAME_COUNT: expected ' + S.names + ' unique names, found ' + new Set(names).size);
    }
    if (names.join(',') !== S.order.join(',')) {
      violations.push('ORDER: expected [' + S.order.join(', ') + '], found [' + names.join(', ') + ']');
    }
    const chars = decls.reduce((a, d) => a + d.chars, 0);
    if (chars !== S.chars) {
      violations.push('CHARS: expected ' + S.chars + ' declaration chars, found ' + chars);
    }
    for (const d of decls) {
      if (d.form !== 'function') violations.push('FORM: ' + d.name + ' is a ' + d.form + ', expected function');
      const wantAsync = S.asyncByName ? S.asyncByName[d.name] === true : false;
      if (d.isAsync !== wantAsync) {
        violations.push('ASYNC: ' + d.name + ' is ' + (d.isAsync ? 'async' : 'synchronous')
          + '; the relocated site is ' + (wantAsync ? 'async' : 'synchronous') + ' and the form must not change');
      }
      const want = S.spanSha[d.name];
      if (!want) { violations.push('UNKNOWN_DECLARATION: ' + d.name + ' is not part of this relocation'); continue; }
      const got = sha256(moduleSrc.slice(d.start, d.end + 1));
      if (got !== want) {
        violations.push('SPAN_SHA: ' + d.name + ' body changed — expected ' + want.slice(0, 16) + ', got ' + got.slice(0, 16));
      }
    }
    // The duplicate rule belongs to whichever module actually carries a
    // duplicate. PR 1 carries eicLiqFromLegs twice; the panel carries none, and
    // its `sites === names` check above already forbids one appearing.
    const dupName = S.duplicate === undefined ? 'eicLiqFromLegs' : S.duplicate;
    if (dupName) {
      const liq = decls.filter((d) => d.name === dupName);
      if (liq.length !== 2) violations.push('DUPLICATE: expected exactly 2 ' + dupName + ' sites, found ' + liq.length);
      else {
        const a = moduleSrc.slice(liq[0].start, liq[0].end + 1);
        const b = moduleSrc.slice(liq[1].start, liq[1].end + 1);
        if (a !== b) violations.push('DUPLICATE_DIVERGED: the two ' + dupName + ' sites are no longer byte-identical');
        if (!(liq[0].start < liq[1].start)) violations.push('DUPLICATE_ORDER: original relative order not preserved');
      }
    }

    // Outside the four spans there may be comments and whitespace, nothing more.
    // The span hashes above prove each declaration is intact; they say nothing
    // about what sits between or after them, and a stray brace left by a parser
    // that closed a body at the wrong place lands exactly there.
    let cursor = 0;
    const outside = [];
    for (const d of decls) { if (d.start > cursor) outside.push([cursor, d.start]); cursor = d.end + 1; }
    if (cursor < moduleSrc.length) outside.push([cursor, moduleSrc.length]);
    for (const [a, b] of outside) {
      const residue = maskLiterals(moduleSrc.slice(a, b)).trim();
      if (residue !== '') {
        violations.push('RESIDUE: non-declaration source at offset ' + a + ' — ' + JSON.stringify(residue.slice(0, 48)));
      }
    }
  } catch (e) {
    threw = String(e && e.message);
    violations.push('UNPARSEABLE: the module could not be analysed (' + threw + ')');
  }
  return { violations, threw };
}

const FORBIDDEN_STRUCTURAL = [
  ['document access', /\bdocument\s*\./],
  ['window write/read', /\bwindow\s*\./],
  ['globalThis', /\bglobalThis\s*\./],
  ['fetch()', /\bfetch\s*\(/],
  ['ttCall()', /\bttCall\s*\(/],
  ['WebSocket', /\bWebSocket\b/],
  ['setTimeout', /\bsetTimeout\s*\(/],
  ['setInterval', /\bsetInterval\s*\(/],
  ['addEventListener', /\baddEventListener\s*\(/],
  ['localStorage', /\blocalStorage\b/],
  ['sessionStorage', /\bsessionStorage\b/],
  ['S.* access', /\bS\s*\./],
];

/**
 * Purity, three ways: a structural scan of the masked source, a check that the
 * module has no top-level executable statement, and an evaluation inside a
 * context where every forbidden global is a trap.
 */
function guardModulePurity(moduleSrc, expectedNames) {
  const violations = [];
  let threw = null;
  const masked = maskLiterals(moduleSrc);

  for (const [label, re] of FORBIDDEN_STRUCTURAL) {
    if (re.test(masked)) violations.push('FORBIDDEN_STRUCTURAL: module body performs ' + label);
  }

  // No top-level executable statement: the module must be declarations only.
  try {
    const decls = scanTopLevelDeclarations(moduleSrc);
    // The gap scan below cannot see a top-level `var x = f();`: the parser
    // reports that as a declaration, so it occupies a span rather than a gap.
    // Function declarations are the only top-level form that binds without
    // running anything — everything else has an initialiser that executes the
    // moment the script is parsed.
    for (const d of decls) {
      if (d.form !== 'function') {
        violations.push('TOP_LEVEL_NON_FUNCTION: top-level ' + d.form + ' ' + d.name
          + ' — its initialiser runs at load time; this module is function declarations only');
      }
    }
    let prev = 0;
    const gaps = [];
    for (const d of decls) { if (d.start > prev) gaps.push([prev, d.start]); prev = d.end + 1; }
    if (prev < moduleSrc.length) gaps.push([prev, moduleSrc.length]);
    for (const [a, b] of gaps) {
      if (maskLiterals(moduleSrc.slice(a, b)).trim() !== '') {
        violations.push('TOP_LEVEL_STATEMENT: the module executes something at load time near offset ' + a);
      }
    }
  } catch (e) { threw = String(e && e.message); violations.push('UNPARSEABLE_FOR_PURITY: ' + threw); }

  // Calls to other application declarations. These three rule functions are
  // contracted to call nothing outside themselves and the language builtins.
  const bindings = expectedNames || ['eicScreenTicker', 'eicLiqFromLegs', 'eicBuildLiveContext'];
  const OWN = new Set(bindings);
  const BUILTINS = new Set(['Math', 'JSON', 'Date', 'Number', 'String', 'Array', 'Object', 'Boolean',
    'isNaN', 'parseFloat', 'parseInt', 'RegExp', 'Error', 'if', 'for', 'while', 'switch', 'catch',
    'function', 'return', 'typeof', 'new', 'else', 'do', 'try']);
  const callRe = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let cm;
  const localNames = new Set();
  let lm;
  const localRe = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)|\b(?:var|let|const)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((lm = localRe.exec(masked)) !== null) localNames.add(lm[1] || lm[2]);
  while ((cm = callRe.exec(masked)) !== null) {
    const nm = cm[2];
    if (BUILTINS.has(nm) || OWN.has(nm) || localNames.has(nm)) continue;
    violations.push('FOREIGN_CALL: module calls application declaration ' + nm + '()');
  }

  // Dynamic proof: evaluate with every forbidden global trapped.
  const trapped = [];
  const trap = (name) => new Proxy(function () {}, {
    get() { trapped.push(name); throw new Error('FORBIDDEN_GLOBAL:' + name); },
    apply() { trapped.push(name); throw new Error('FORBIDDEN_GLOBAL:' + name); },
    set() { trapped.push(name); throw new Error('FORBIDDEN_GLOBAL:' + name); },
  });
  const sandbox = {
    document: trap('document'), window: trap('window'), globalThis_: trap('globalThis'),
    fetch: trap('fetch'), ttCall: trap('ttCall'), WebSocket: trap('WebSocket'),
    localStorage: trap('localStorage'), sessionStorage: trap('sessionStorage'), S: trap('S'),
    setTimeout: trap('setTimeout'), setInterval: trap('setInterval'),
    console: { log() {}, warn() {}, error() {} },
    Math, JSON, Date, Number, String, Array, Object, Boolean, isNaN, parseFloat, parseInt, RegExp, Error,
  };
  try {
    vm.createContext(sandbox);
    vm.runInContext(moduleSrc, sandbox, { filename: 'eic-purity-probe.js', timeout: 5000 });
    if (trapped.length) violations.push('EVAL_TOUCHED_GLOBAL: ' + Array.from(new Set(trapped)).join(', '));
    for (const n of bindings) {
      if (typeof sandbox[n] !== 'function') violations.push('MISSING_BINDING: ' + n + ' is not bound by the module');
    }
  } catch (e) {
    const msg = String(e && e.message);
    threw = msg;
    if (/FORBIDDEN_GLOBAL:/.test(msg)) violations.push('EVAL_TOUCHED_GLOBAL: ' + msg);
    else violations.push('EVAL_FAILED: ' + msg);
  }
  return { violations, threw };
}

const MODULE_SRC_ATTR = './js/services/eic-screening-rules.js';
const DECISION_RULES_SRC_ATTR = './js/services/eic-decision-rules.js';

/**
 * Load contract over a SCRIPT MODEL — an ordered list of
 * { src, attrs, type, isInlineMonolith }.
 */
function guardLoad(scripts, srcAttr) {
  const SRC = srcAttr || MODULE_SRC_ATTR;
  const violations = [];
  let threw = null;
  try {
    const idx = scripts.map((s, i) => ({ s, i })).filter((x) => x.s.src === SRC);
    if (idx.length === 0) { violations.push('TAG_MISSING: no <script src="' + SRC + '"> tag'); return { violations, threw }; }
    if (idx.length > 1) violations.push('TAG_DUPLICATED: the module is loaded ' + idx.length + ' times');
    const monolith = scripts.findIndex((s) => s.isInlineMonolith);
    if (monolith < 0) { violations.push('MONOLITH_MISSING: no inline application monolith found'); return { violations, threw }; }
    for (const { s, i } of idx) {
      if (i >= monolith) violations.push('TAG_AFTER_MONOLITH: the module loads at slot ' + i + ', the monolith at ' + monolith);
      const attrs = String(s.attrs || '');
      if (/(^|\s)defer(\s|=|$)/i.test(attrs)) violations.push('TAG_DEFER: the tag is deferred; the binding would not exist when the monolith evaluates');
      if (/(^|\s)async(\s|=|$)/i.test(attrs)) violations.push('TAG_ASYNC: the tag is async; load order is no longer guaranteed');
      if (s.type != null && String(s.type).trim() !== '') violations.push('TAG_TYPE: the tag declares type="' + s.type + '"; it must be a classic script');
      if (String(s.inline || '').trim() !== '') violations.push('TAG_INLINE_BODY: the tag carries an inline body as well as a src');
      // src-only exactness: no attribute other than src is permitted.
      const extra = attrs.replace(/(^|\s)src\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i, '').trim();
      if (extra !== '') violations.push('TAG_EXTRA_ATTR: unexpected attribute(s) on the tag: ' + extra);
    }
  } catch (e) { threw = String(e && e.message); violations.push('LOAD_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

// Everything shipped — all eleven names, across five modules. The last two are
// owner-classified rather than prefix-classified; omitting them is the exact
// false terminal-zero regression the post-EIC audit found.
const SHIPPED_NAMES = ['eicScreenTicker', 'eicLiqFromLegs', 'eicBuildLiveContext',
  'runEICPanel', 'eicAnalyzeAll', 'eicAnalyzeTicker',
  'eicFetchLegs', 'eicDXLinkDeepDive', 'eicRunDXLink',
  'computeFinalDecision', 'computeSetupScore'];
const PR1_NAMES = ['eicScreenTicker', 'eicLiqFromLegs', 'eicBuildLiveContext'];
const PANEL_NAMES = ['runEICPanel', 'eicAnalyzeAll'];
const TICKER_ANALYSIS_NAMES = ['eicAnalyzeTicker'];
const LIVE_DEEP_DIVE_NAMES = ['eicFetchLegs', 'eicDXLinkDeepDive', 'eicRunDXLink'];
const DECISION_RULES_NAMES = ['computeFinalDecision', 'computeSetupScore'];
// What is still inline after the owner-corrective closure: NOTHING. The family
// is now genuinely terminal under both the name-shape and explicit-owner layers.
const PENDING_ORDER = [];
const PENDING_SITES = 0;
const PENDING_CHARS = 0;

/**
 * Does this declaration name belong to the EIC family?
 *
 * WHY THIS EXISTS AS A NAMED PREDICATE
 *   Residue discovery used to be written inline, five times, as
 *   `/^eic/i.test(name) || name === 'runEICPanel'`. That expression does not
 *   support the claim it was carrying — "no new EIC-looking declaration can be
 *   added under a new name". It anchors at the START of the identifier and then
 *   patches in ONE special case by hand, so anything that wears the family name
 *   anywhere else slips through:
 *
 *       _eicBootstrap      leading underscore — fails ^eic
 *       runEICSomething    EIC in the middle  — fails ^eic, and is not the one
 *                          hardcoded exception
 *
 *   Both are ordinary shapes. `runEICPanel` — a REAL member of this family —
 *   is itself an instance of the second shape, which is why it needed the
 *   hand-written special case in the first place. One more member in that style
 *   and the special case would have needed extending by hand again, silently.
 *
 * HOW IT DECIDES
 *   The identifier-shape layer splits camelCase / ALL-CAPS segments and matches
 *   an exact `eic` token. The independent owner layer explicitly includes the
 *   two generic decision-rule names proved by callers and data flow in PR #380.
 *   Segment matching keeps `deiceThing` and `receiptTotal` out.
 *
 * WHAT IT IS NOT
 *   It is not a replacement for the exact shipped-name checks. Those stay, as an
 *   INDEPENDENT layer: this predicate answers "does this look like it belongs to
 *   the family", and SHIPPED_NAMES answers "is this one of the nine we moved".
 *   A regression that defeats one still has to defeat the other.
 */
function splitIdentifierSegments(name) {
  const bare = String(name == null ? '' : name).replace(/^[_$]+/, '');
  return bare.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[a-z0-9]+/g) || [];
}
function isEicFamilyName(name) {
  const n = String(name == null ? '' : name);
  return DECISION_RULES_NAMES.indexOf(n) >= 0
    || splitIdentifierSegments(n).some((seg) => seg.toLowerCase() === 'eic');
}
/** The same question over a scanTopLevelDeclarations() result. */
function isEicFamilyDecl(d) {
  return d != null && isEicFamilyName(d.name);
}

/** Residue contract over the inline monolith source. */
function guardInlineResidue(inlineSrc) {
  const violations = [];
  let threw = null;
  try {
    // ONE shared predicate, not an inline regex — see isEicFamilyName for why
    // `/^eic/i || name === 'runEICPanel'` did not support the claim it carried.
    const decls = scanTopLevelDeclarations(inlineSrc).filter(isEicFamilyDecl);
    if (decls.length !== PENDING_SITES) {
      violations.push('RESIDUE_COUNT: expected ' + PENDING_SITES + ' inline EIC sites, found ' + decls.length);
    }
    const chars = decls.reduce((a, d) => a + d.chars, 0);
    if (chars !== PENDING_CHARS) {
      violations.push('RESIDUE_CHARS: expected ' + PENDING_CHARS + ' inline EIC chars, found ' + chars);
    }
    const names = decls.map((d) => d.name);
    if (names.join(',') !== PENDING_ORDER.join(',')) {
      violations.push('RESIDUE_ORDER: expected [' + PENDING_ORDER.join(', ') + '], found [' + names.join(', ') + ']');
    }
    for (const n of SHIPPED_NAMES) {
      if (names.indexOf(n) >= 0) violations.push('REINTRODUCED: ' + n + ' is declared inline again after being shipped');
    }
    // The eicFetchLegs pair rule USED to live here, requiring both copies to
    // remain inline. PR 4 moved both, so the rule moved with them: it is now
    // EXPECTED_LIVE_DEEP_DIVE.duplicate, enforced by guardModuleShape against
    // the shipped module. It was relocated rather than deleted — a dropped
    // duplicate is still the defect nobody would otherwise notice.
    const fetchLegs = names.filter((n) => n === 'eicFetchLegs').length;
    if (fetchLegs !== 0) {
      violations.push('FETCHLEGS_INLINE: eicFetchLegs is declared inline ' + fetchLegs
        + ' time(s); both copies belong to js/ui/eic-live-deep-dive.js after PR 4');
    }
  } catch (e) { threw = String(e && e.message); violations.push('RESIDUE_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

const FAMILY_SITES = 13, FAMILY_NAMES = 11, FAMILY_CHARS = 77464;
// Owners whose modules have SHIPPED. PR 1 closed SCREENING_RULES, PR 2 closes
// PANEL. A list, not a prefix test, so PRs 3-4 must each be added deliberately.
const PANEL_SRC_ATTR = './js/ui/eic-panel.js';

/**
 * The panel's surface contract. PR 1's module was PURE and `guardModulePurity`
 * pins that. The panel is NOT pure — it renders — so applying that guard here
 * would assert something false. What is pinned instead is the narrower set of
 * properties the relocation actually preserves:
 *
 *   • BOTH declarations must be plain top-level `function` declarations, so the
 *     names land on the global object. Generated markup calls them through
 *     `onclick="runEICPanel()"` / `onclick="eicAnalyzeAll()"`, which resolves off
 *     the global scope at CLICK time. Wrapping this file in a module, an IIFE or
 *     a bundler closure would bind them locally and every one of those buttons
 *     would fail silently, long after load — the one regression a load-order
 *     check could never catch.
 *   • The panel issues no network call of its own and never assigns to `window`.
 *     It moved out of the monolith unchanged, and it did not acquire a new
 *     dependency on the way.
 *   • The `eicEnrichLegs` call site is still present and still unrepaired. This
 *     is a RELOCATION: a future extraction PR must not quietly fix a defect it
 *     inherited, so the defect is pinned in place until it is fixed on purpose.
 */
function guardPanelSurface(moduleSrc) {
  const violations = [];
  let threw = null;
  try {
    const decls = scanTopLevelDeclarations(moduleSrc);
    for (const n of PANEL_NAMES) {
      const d = decls.filter((x) => x.name === n);
      if (d.length !== 1) { violations.push('PANEL_BINDING: ' + n + ' must be declared exactly once, found ' + d.length); continue; }
      if (d[0].form !== 'function') {
        violations.push('PANEL_NOT_GLOBAL: ' + n + ' is a ' + d[0].form
          + '; only a top-level function declaration is reachable from generated onclick= markup');
      }
    }
    const masked = maskLiterals(moduleSrc);
    for (const [label, re] of [['fetch()', /\bfetch\s*\(/], ['ttCall()', /\bttCall\s*\(/],
      ['WebSocket', /\bWebSocket\b/]]) {
      if (re.test(masked)) violations.push('PANEL_NETWORK: the panel performs ' + label + '; it had none inline');
    }
    if (/\bwindow\s*\.\s*[A-Za-z_$][\w$]*\s*=/.test(masked)) {
      violations.push('PANEL_WINDOW_WRITE: the panel assigns to window');
    }
    if (!/\beicEnrichLegs\s*\(/.test(masked)) {
      violations.push('PANEL_DEFECT_REPAIRED: the eicEnrichLegs call site is gone — this PR relocates, it does not repair');
    }
  } catch (e) { threw = String(e && e.message); violations.push('PANEL_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

/**
 * The ticker-analysis panel's surface contract — §14.
 *
 * PR 1's module is PURE and `guardModulePurity` pins that. This one is NOT, and
 * applying that guard here would assert something false: eicAnalyzeTicker does
 * single-ticker analysis AND renders the result, and the two halves interleave.
 * What is pinned instead is the set of properties a SOURCE AUDIT of the real
 * body actually established, so the guard measures this function rather than a
 * generic idea of a module:
 *
 *   MUST BE ABSENT — measured absent at BASE, so acquiring one is a real change:
 *     fetch · ttCall · WebSocket · timers · direct `S.x =` write · window write
 *
 *   MUST BE PRESENT — the DOM and listener ownership that defines it as a PANEL.
 *     Deleting any of these would turn it into a service while the byte-identity
 *     proof still passed, because that proof only compares it to what was cut.
 *     They are asserted because the audit found them, not on principle.
 *
 * The honest nuance the audit surfaced and this guard records rather than hides:
 * the body performs no `S.x = …` assignment, but it DOES mutate the scan row it
 * looked up out of S.scanData. That is a write to shared state reached through
 * S, and pretending otherwise would be the kind of convenient half-truth these
 * contracts exist to prevent — so the mutation is pinned as REQUIRED too.
 */
function guardTickerAnalysisSurface(moduleSrc) {
  const violations = [];
  let threw = null;
  try {
    const decls = scanTopLevelDeclarations(moduleSrc);
    const d = decls.filter((x) => x.name === 'eicAnalyzeTicker');
    if (d.length !== 1) {
      violations.push('TA_BINDING: eicAnalyzeTicker must be declared exactly once, found ' + d.length);
    } else {
      if (d[0].form !== 'function') {
        violations.push('TA_NOT_GLOBAL: eicAnalyzeTicker is a ' + d[0].form
          + '; only a top-level function declaration lands on the global object, where'
          + " js/ui/eic-panel.js's click handler resolves it");
      }
      if (!d[0].isAsync) {
        violations.push('TA_NOT_ASYNC: eicAnalyzeTicker is synchronous; it awaits callAgent and its'
          + ' caller relies on the returned promise');
      }
    }
    if (decls.length !== 1) {
      violations.push('TA_EXTRA_DECLARATION: this module owns ONE declaration, found ' + decls.length
        + ' (' + decls.map((x) => x.name).join(', ') + ') — a PR 4 declaration must not arrive early');
    }

    const masked = maskLiterals(moduleSrc);
    // The DECLARATION SPAN with comments stripped. Presence and exact-literal
    // checks run against this, never against the whole file: the module's own
    // architecture header describes the DOM ids it owns, so checking raw source
    // would let a comment satisfy a rule about code. (It did — a mutant that
    // renamed the real selector survived, because `String.replace` had rewritten
    // the header's copy and the guard found the untouched call.)
    const spanCode = (d.length === 1) ? stripComments(moduleSrc.slice(d[0].start, d[0].end + 1)) : '';
    const spanMasked = maskLiterals(spanCode);

    // ── effects the audit measured ABSENT ────────────────────────────────────
    for (const [label, re] of [['fetch()', /\bfetch\s*\(/], ['ttCall()', /\bttCall\s*\(/],
      ['WebSocket', /\bWebSocket\b/], ['setTimeout', /\bsetTimeout\s*\(/],
      ['setInterval', /\bsetInterval\s*\(/]]) {
      if (re.test(masked)) violations.push('TA_ACQUIRED_EFFECT: the panel performs ' + label + '; it had none inline');
    }
    if (/\bS\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/.test(masked)) {
      violations.push('TA_STATE_WRITE: the panel assigns to S.*; the relocated body performs no direct S write');
    }
    if (/\b(window|globalThis)\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/.test(masked)) {
      violations.push('TA_WINDOW_WRITE: the panel assigns to window/globalThis; it had no such write');
    }

    // ── ownership the audit measured PRESENT ─────────────────────────────────
    const required = [
      ['DOM_RESULT_HOST', /\bdocument\s*\.\s*getElementById\s*\(/, "document.getElementById('eicResults')"],
      ['DOM_BUTTON_LOOKUP', /\bquerySelector\s*\(/, "querySelector('.eic-dxlink-btn')"],
      ['DOM_RENDER', /\.\s*innerHTML\s*=(?!=)/, 'innerHTML rendering'],
      ['LISTENER', /\baddEventListener\s*\(/, "addEventListener('click', …) on the DXLink button"],
      ['STATE_READ', /\bS\s*\.\s*scanData\b/, 'S.scanData read'],
      ['ROW_MUTATION', /\bd\s*\.\s*eicFinalDecision\s*=(?!=)/, 'the scan-row mutation d.eicFinalDecision='],
      ['SIBLING_SCREEN', /\beicScreenTicker\s*\(/, 'the eicScreenTicker call across PR 1s module boundary'],
      ['SIBLING_DXLINK', /\beicRunDXLink\s*\(/, 'the eicRunDXLink call into still-inline PR 4 code'],
      ['AGENT', /\bcallAgent\s*\(/, 'the awaited callAgent call'],
    ];
    for (const [code, re, what] of required) {
      if (!re.test(spanMasked)) {
        violations.push('TA_LOST_' + code + ': ' + what + ' is gone — this PR relocates, it does not redesign');
      }
    }
    // The exact DOM identifiers, read from the UNMASKED source: a rename would
    // keep every structural probe above satisfied while pointing the panel at an
    // element that does not exist.
    if (spanCode.indexOf("getElementById('eicResults')") < 0) {
      violations.push('TA_DOM_ID: the panel no longer targets #eicResults');
    }
    if (spanCode.indexOf("querySelector('.eic-dxlink-btn')") < 0) {
      violations.push('TA_DOM_SELECTOR: the panel no longer looks up .eic-dxlink-btn');
    }
    if (spanCode.indexOf('class="eic-dxlink-btn"') < 0) {
      violations.push('TA_DOM_MARKUP: the panel no longer EMITS the .eic-dxlink-btn button it then looks up');
    }
  } catch (e) { threw = String(e && e.message); violations.push('TA_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

const TICKER_ANALYSIS_SRC_ATTR = './js/ui/eic-ticker-analysis-panel.js';

const LIVE_DEEP_DIVE_SRC_ATTR = './js/ui/eic-live-deep-dive.js';

/**
 * The live deep dive's surface contract — EIC PR 4.
 *
 * PR 1's module is PURE and `guardModulePurity` pins that. This one is NOT, and
 * no purity claim is made anywhere: it performs TRANSPORT (ttCall, a DXLink
 * WebSocket) AND RENDERING (getElementById, innerHTML, textContent), and the two
 * are interleaved rather than separable. Splitting them would be a redesign, and
 * this is a relocation.
 *
 * What is pinned instead is the narrower set of properties the relocation
 * actually preserves, in BOTH directions, re-measured from the source rather
 * than carried over from a plan:
 *
 *   • the effects measured ABSENT stay absent — no fetch(), no direct `S.x =`
 *     write, no window/globalThis write, no addEventListener, no localStorage,
 *     no inline `on*=` handler string;
 *   • the transport and DOM ownership measured PRESENT stays present, at its
 *     measured MULTIPLICITY — deleting the WebSocket, one of the endpoints, or
 *     the rendering fails here even though byte-identity would still pass.
 *
 * Counts, not just presence: `ttCall` appears 4 times (once per eicFetchLegs
 * copy, twice in eicDXLinkDeepDive) and collapsing the duplicate pair would take
 * it to 3 while every presence-only probe stayed satisfied.
 *
 * Everything is measured over the DECLARATION SPANS with comments stripped,
 * never over the whole file: this module's architecture header quotes its own
 * endpoints and selectors while explaining them, so checking raw source would
 * let a COMMENT satisfy a rule about code. (That exact hole let a mutant survive
 * in PR 3 and is why `stripComments` exists.)
 */
function guardLiveDeepDiveSurface(moduleSrc) {
  const violations = [];
  let threw = null;
  try {
    const decls = scanTopLevelDeclarations(moduleSrc);
    for (const n of LIVE_DEEP_DIVE_NAMES) {
      const d = decls.filter((x) => x.name === n);
      const want = n === 'eicFetchLegs' ? 2 : 1;
      if (d.length !== want) {
        violations.push('LDD_BINDING: ' + n + ' must be declared exactly ' + want + ' time(s), found ' + d.length);
        continue;
      }
      for (const one of d) {
        if (one.form !== 'function') {
          violations.push('LDD_NOT_GLOBAL: ' + n + ' is a ' + one.form
            + '; only a top-level function declaration lands on the global object, where'
            + " js/ui/eic-ticker-analysis-panel.js's click handler resolves eicRunDXLink");
        }
        if (!one.isAsync) {
          violations.push('LDD_NOT_ASYNC: ' + n + ' is synchronous; every relocated site is async and'
            + ' its callers rely on the returned promise');
        }
      }
    }
    if (decls.length !== 4) {
      violations.push('LDD_EXTRA_DECLARATION: this module owns FOUR declarations, found ' + decls.length
        + ' (' + decls.map((x) => x.name).join(', ') + ') — the family is closed and nothing may join it');
    }

    const whole = maskLiterals(moduleSrc);
    const spanCode = decls.map((d) => stripComments(moduleSrc.slice(d.start, d.end + 1))).join('\n');
    const spanMasked = maskLiterals(spanCode);
    // A GLOBAL clone of the probe: String.match without /g returns only the FIRST
    // match, so every multiplicity below would have read 1 and the counts would
    // have silently degraded into presence checks — the exact weakening this
    // guard exists to prevent.
    const count = (re) => (spanMasked.match(new RegExp(re.source, re.flags.indexOf("g") >= 0 ? re.flags : re.flags + "g")) || []).length;

    // ── effects the audit measured ABSENT ────────────────────────────────────
    for (const [label, re] of [['fetch()', /\bfetch\s*\(/], ['addEventListener', /\baddEventListener\s*\(/],
      ['setInterval', /\bsetInterval\s*\(/], ['localStorage', /\blocalStorage\b/],
      ['document.cookie', /\bdocument\s*\.\s*cookie\b/]]) {
      if (re.test(spanMasked)) violations.push('LDD_ACQUIRED_EFFECT: the module performs ' + label + '; it had none inline');
    }
    if (/\bS\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/.test(whole)) {
      violations.push('LDD_STATE_WRITE: the module assigns to S.*; the relocated bodies perform no direct S write');
    }
    if (/\b(window|globalThis)\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/.test(whole)) {
      violations.push('LDD_WINDOW_WRITE: the module assigns to window/globalThis; it had no such write');
    }
    if (/\bon[a-z]+\s*=\s*["']/.test(stripComments(moduleSrc))) {
      violations.push('LDD_INLINE_HANDLER: the module emits an inline on*= handler string; it emitted none');
    }

    // ── transport and rendering the audit measured PRESENT, WITH counts ──────
    const required = [
      ['TTCALL', /\bttCall\s*\(/, 4, 'the ttCall transport calls'],
      ['WEBSOCKET', /new\s+WebSocket\s*\(/, 1, 'the DXLink WebSocket'],
      ['TIMEOUT', /\bsetTimeout\s*\(/, 1, 'the DXLink timeout budget'],
      ['CLEARTIMEOUT', /\bclearTimeout\s*\(/, 4, 'the timeout cancellations'],
      ['PROMISE', /new\s+Promise\s*\(/, 1, 'the WebSocket completion promise'],
      ['DOM_HOST', /\bdocument\s*\.\s*getElementById\s*\(/, 2, "the document.getElementById('eicResults') lookups"],
      ['DOM_STATUS', /\bquerySelector\s*\(/, 5, 'the .dxlink-status lookups'],
      ['DOM_CREATE', /\bdocument\s*\.\s*createElement\s*\(/, 1, 'the status-element creation'],
      ['DOM_RENDER', /\.\s*innerHTML\s*=(?!=)/, 3, 'the innerHTML assignments'],
      ['DOM_APPEND', /\.\s*innerHTML\s*\+=/, 2, 'the innerHTML appends'],
      ['DOM_TEXT', /\.\s*textContent\s*=(?!=)/, 2, 'the textContent writes'],
      ['AGENT', /\bcallAgent\s*\(/, 1, 'the awaited callAgent call'],
      ['STATE_READ', /\bS\s*\.\s*scanData\b/, 2, 'the S.scanData reads'],
      ['MACRO_READ', /\bS\s*\.\s*marketContextRisk\b/, 2, 'the S.marketContextRisk reads'],
      ['ROW_LIVE', /\bd\s*\.\s*eicLegsLive\s*=(?!=)/, 2, 'the scan-row mutation d.eicLegsLive='],
      ['ROW_DECISION', /\bd\s*\.\s*eicFinalDecision\s*=(?!=)/, 1, 'the scan-row mutation d.eicFinalDecision='],
      ['SIBLING_SCREEN', /\beicScreenTicker\s*\(/, 2, "the eicScreenTicker calls into PR 1's module"],
      ['SIBLING_CONTEXT', /\beicBuildLiveContext\s*\(/, 1, "the eicBuildLiveContext call into PR 1's module"],
      // The CALL, not the declaration: a bare /\beicDXLinkDeepDive\s*\(/ also matches
      // the declaration header, so it would read 2 and a deleted call would still
      // leave it at 1 rather than failing. Anchoring on the await pins the edge.
      ['SELF_DEEPDIVE', /\bawait\s+eicDXLinkDeepDive\s*\(/, 1, 'the awaited in-module call from eicRunDXLink into eicDXLinkDeepDive'],
    ];
    for (const [code, re, n, what] of required) {
      const got = count(re);
      if (got !== n) {
        violations.push('LDD_SURFACE_' + code + ': expected ' + n + ' × ' + what + ', found ' + got
          + ' — this PR relocates, it does not redesign');
      }
    }
    // The exact endpoints and DOM identifiers, read from the UNMASKED span: a
    // rename would keep every structural probe above satisfied while pointing
    // the module at an endpoint or an element that does not exist.
    for (const [code, lit] of [
      ['ENDPOINT_LEGS', "ttCall('/eic/legs/'+ticker)"],
      ['ENDPOINT_TOKEN', "ttCall('/quote-token')"],
      ['ENDPOINT_CHAIN', "'/eic/chain-symbols/'+ticker"],
      ['DOM_ID', "getElementById('eicResults')"],
      ['DOM_STATUS_SELECTOR', "querySelector('.dxlink-status')"],
      ['DXLINK_FALLBACK_URL', 'wss://tasty-openapi-ws.dxfeed.com/realtime'],
      ['AGENT_CHANNEL', "callAgent('earnings-ic', ctx)"],
    ]) {
      if (spanCode.indexOf(lit) < 0) {
        violations.push('LDD_LITERAL_' + code + ': the module no longer contains ' + JSON.stringify(lit));
      }
    }

    // ── the approved post-extraction repair ─────────────────────────────────
    // PR 4 preserved this defect deliberately. The later functional PR repairs
    // it through one exact block, independently projected away by the historical
    // relocation guard. The surface guard pins the CURRENT behaviour instead.
    const run = decls.filter((d) => d.name === 'eicRunDXLink');
    if (run.length === 1) {
      const code = stripComments(moduleSrc.slice(run[0].start, run[0].end + 1));
      if (moduleSrc.split(EIC_PR4_UNDO.POST_EXTRACTION_FDCOLOR_FIX).length - 1 !== 1) {
        violations.push('LDD_FDCOLOR_FIX_SHAPE: expected exactly one approved fdColor repair block');
      }
      if (!/\bvar\s+fdColors\s*=/.test(maskLiterals(code)) || !/\bvar\s+fdColor\s*=/.test(maskLiterals(code))) {
        violations.push('LDD_FDCOLOR_LOCAL_BINDINGS: eicRunDXLink must declare both fdColors and fdColor locally');
      }
      for (const literal of [
        "'APPROVED':'var(--gr)'",
        "'APPROVED_WITH_CAUTION':'var(--am)'",
        "'WATCHLIST_ONLY':'#f97316'",
        "'AVOID':'var(--rd)'",
        "'BLOCKED_BY_CONTEXT':'var(--rd)'",
        "fdColors[fd.finalTradingDecision]||'var(--tx2)'",
        "' | <span style=\"color:'+fdColor+';font-weight:700\">'",
      ]) {
        if (code.indexOf(literal) < 0) {
          violations.push('LDD_FDCOLOR_MAPPING: missing exact decision-colour expression ' + JSON.stringify(literal));
        }
      }
    }
    // ── the remaining incidental defects, PINNED UNREPAIRED ────────────────
    const dive = decls.filter((d) => d.name === 'eicDXLinkDeepDive');
    if (dive.length === 1) {
      const code = stripComments(moduleSrc.slice(dive[0].start, dive[0].end + 1));
      if (code.indexOf('if(d) var tsNone=new Date().toISOString();') < 0) {
        violations.push('LDD_DEFECT_REPAIRED_TSNONE: the dead `if(d) var tsNone = …` guard — followed by an'
          + ' UNCONDITIONAL d.eicLegsLive={…} on the next statement — was repaired or removed');
      }
      if (code.indexOf('return d.eicLegsLive;') < 0) {
        violations.push('LDD_DEFECT_REPAIRED_RETURN: the unconditional `return d.eicLegsLive;` after a guarded'
          + ' `if(d) d.eicLegsLive = {…}` was repaired');
      }
    }
  } catch (e) { threw = String(e && e.message); violations.push('LDD_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

// The EIC family's modules, BY EXACT FILENAME and in load order. A LIST, never
// an `eic-*` glob and never a prefix exemption: a sixth eic-* module must FAIL
// here rather than be waved through by a pattern. The family is closed at five.
//
// These are the CANONICAL forms (see canonicalLocalSrc): root-relative, no
// leading `./`, no query, no hash. Every src encountered — in a script tag or on
// disk — is normalized to this shape before it is compared.
const EIC_MODULE_FILES = [
  'js/services/eic-screening-rules.js',
  'js/services/eic-decision-rules.js',
  'js/ui/eic-panel.js',
  'js/ui/eic-ticker-analysis-panel.js',
  'js/ui/eic-live-deep-dive.js',
];
// The same five, in the exact spelling index.html uses. Kept separate and
// derived-checked below so the tag guard keeps comparing literal attribute text
// while the inventory compares canonical paths.
const EIC_MODULE_SRC_ATTRS = EIC_MODULE_FILES.map((f) => './' + f);

/**
 * Normalize a script `src` to a canonical local path, or return null when it is
 * not a local script at all.
 *
 * WHY THIS EXISTS
 *   The first version of the inventory guard filtered candidates with
 *   `/^\.\//.test(src)` and then compared them to `'./js/ui/…'` strings. That
 *   made the "no extra eic-* module by ANY path" claim FALSE: four ordinary
 *   spellings of the same file walked straight past the stray-module check —
 *
 *       js/ui/eic-extra.js          bare-relative — filtered out before the check
 *       /js/ui/eic-extra.js         root-relative — filtered out before the check
 *       ./js/ui/eic-extra.js?v=1    cache-buster  — reached the check, matched nothing
 *       ./js/ui/eic-extra.js#x      fragment      — reached the check, matched nothing
 *
 *   A guard that only recognises one spelling of a path is a guard that can be
 *   sidestepped by typing the path differently, which is exactly the amnesty the
 *   exact-filename rule exists to deny. Normalizing FIRST, then comparing, is
 *   what makes "by any path" true rather than merely stated.
 *
 * WHAT IT DOES
 *   • trims surrounding whitespace;
 *   • rejects genuine REMOTE srcs — absolute URLs (`https://…`), protocol-
 *     relative (`//cdn…`) and anything with a scheme — returning null, because a
 *     CDN script is not part of the local inventory and must not be forced into
 *     it. Note the ordering: `//cdn/x.js` is protocol-relative and remote, so it
 *     is tested BEFORE the root-relative rule that would otherwise claim it;
 *   • strips the query string and the hash fragment, which address the same file;
 *   • collapses `./` prefixes and a single leading `/` so root-relative,
 *     bare-relative and `./` forms land on ONE spelling;
 *   • resolves `a/../b` and `a/./b` segments, so a path cannot be disguised by
 *     walking through a directory.
 */
function canonicalLocalSrc(src) {
  if (src == null) return null;
  let s = String(src).trim();
  if (s === '') return null;
  // Remote: any scheme, or protocol-relative. Checked before the leading-slash
  // rule so `//cdn.example.com/x.js` is remote rather than root-relative.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return null;
  if (s.slice(0, 2) === '//') return null;
  // Query and hash address the same file.
  const cut = s.search(/[?#]/);
  if (cut >= 0) s = s.slice(0, cut);
  s = s.trim();
  if (s === '') return null;
  // One spelling: no leading '/', no leading './'.
  while (s.slice(0, 1) === '/') s = s.slice(1);
  while (s.slice(0, 2) === './') s = s.slice(2);
  // Resolve '.' and '..' segments.
  const out = [];
  for (const part of s.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') { out.pop(); continue; }
    out.push(part);
  }
  s = out.join('/');
  return s === '' ? null : s;
}

/** True when a canonical path names an eic-*.js module, in any directory. */
function isEicModulePath(canonical) {
  return canonical != null && /(^|\/)eic-[^/]*\.js$/.test(canonical);
}

/**
 * Inventory contract: EXACTLY the five declared EIC modules exist and are
 * loaded, by exact filename, contiguously, in order, and all before the inline
 * monolith — and no sixth eic-*.js module exists in EITHER place.
 *
 * The wildcard check is the point. It is not enough that the five are present —
 * a SIXTH eic-* script must be rejected, and rejected BECAUSE it is undeclared
 * rather than because it happened to trip some other rule. Every candidate is
 * canonicalized first, so the rejection cannot be dodged by spelling the path
 * differently.
 *
 * TWO INVENTORIES, NOT ONE
 *   Script tags say what the application LOADS. `diskFiles` says what EXISTS.
 *   A sixth eic-*.js module sitting unreferenced in js/ui/ is still a sixth
 *   module of this family — it would be picked up by any later glob, bundler or
 *   audit, and the family is supposed to be closed at five. Checking only the
 *   tags would let it sit there indefinitely.
 *
 *   `diskFiles` is passed IN rather than read here so the mutation proof can
 *   inject a fifth file without writing one to the filesystem. A guard that
 *   could only be tested by creating real files could not be tested safely at
 *   all, and would end up untested.
 */
function guardEicModuleInventory(scripts, diskFiles) {
  const violations = [];
  let threw = null;
  try {
    const monolith = scripts.findIndex((s) => s.isInlineMonolith);
    if (monolith < 0) { violations.push('INVENTORY_NO_MONOLITH: no inline application monolith found'); return { violations, threw }; }

    // ── canonical view of every LOCAL script tag ─────────────────────────────
    const canon = scripts.map((s) => canonicalLocalSrc(s.src));
    const localCanon = canon.filter((c) => c != null);

    for (const f of EIC_MODULE_FILES) {
      const n = localCanon.filter((x) => x === f).length;
      if (n !== 1) violations.push('INVENTORY_COUNT: ' + f + ' is loaded ' + n + ' time(s), expected exactly 1');
    }
    // No sixth eic-* module, by ANY path spelling. This is the anti-wildcard check.
    const seenStray = {};
    scripts.forEach((s, i) => {
      const c = canon[i];
      if (!isEicModulePath(c) || EIC_MODULE_FILES.indexOf(c) >= 0) return;
      if (seenStray[c]) return;
      seenStray[c] = true;
      violations.push('INVENTORY_UNDECLARED_EIC_MODULE: ' + JSON.stringify(String(s.src)) + ' (canonically '
        + c + ') is an eic-* script that is not one of the five declared modules — the family is closed at'
        + ' five and no prefix exemption, and no alternate path spelling, admits a sixth');
    });

    // ── the same rule over what EXISTS ON DISK ───────────────────────────────
    if (diskFiles != null) {
      const diskCanon = [];
      for (const f of diskFiles) {
        const c = canonicalLocalSrc(f);
        if (isEicModulePath(c)) diskCanon.push(c);
      }
      for (const c of Array.from(new Set(diskCanon))) {
        if (EIC_MODULE_FILES.indexOf(c) < 0) {
          violations.push('INVENTORY_UNDECLARED_EIC_MODULE: ' + c + ' exists on disk but is not one of the five'
            + ' declared modules — an unreferenced sixth module still reopens a family that is closed at five');
        }
      }
      for (const f of EIC_MODULE_FILES) {
        if (diskCanon.indexOf(f) < 0) {
          violations.push('INVENTORY_MISSING_FILE: ' + f + ' is declared but does not exist on disk');
        }
      }
      const dupes = diskCanon.filter((c, i) => diskCanon.indexOf(c) !== i);
      for (const c of Array.from(new Set(dupes))) {
        violations.push('INVENTORY_DISK_DUPLICATE: ' + c + ' appears more than once in the disk inventory');
      }
    }

    // ── order, contiguity, and position relative to the monolith ─────────────
    const idx = EIC_MODULE_FILES.map((f) => canon.indexOf(f));
    if (idx.every((i) => i >= 0)) {
      for (let i = 1; i < idx.length; i++) {
        if (idx[i] <= idx[i - 1]) {
          violations.push('INVENTORY_ORDER: ' + EIC_MODULE_FILES[i] + ' loads at slot ' + idx[i]
            + ', before ' + EIC_MODULE_FILES[i - 1] + ' at slot ' + idx[i - 1]);
        } else if (idx[i] !== idx[i - 1] + 1) {
          violations.push('INVENTORY_NOT_CONTIGUOUS: ' + EIC_MODULE_FILES[i] + ' is not immediately after '
            + EIC_MODULE_FILES[i - 1] + ' (slots ' + idx[i - 1] + ' → ' + idx[i] + ')');
        }
      }
      for (let i = 0; i < idx.length; i++) {
        if (idx[i] >= monolith) {
          violations.push('INVENTORY_AFTER_MONOLITH: ' + EIC_MODULE_FILES[i] + ' loads at slot ' + idx[i]
            + ', the monolith at ' + monolith);
        }
      }
    }
  } catch (e) { threw = String(e && e.message); violations.push('INVENTORY_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}
// All FIVE owners have shipped. A LIST, never a prefix test, so another owner
// cannot join by naming convention alone.
const SHIPPED_OWNERS = ['SCREENING_RULES', 'DECISION_RULES', 'PANEL', 'TICKER_ANALYSIS', 'LIVE_DEEP_DIVE'];
const SHIPPED_OWNER = 'SCREENING_RULES';
const SHIPPED_SITES = 13, SHIPPED_CHARS = 77464;

// Which module OWNS each planner owner. A map, not a convention: the ownership
// guard below cross-checks the manifest against what the modules on disk
// actually declare, so a manifest row can no longer claim an owner that does not
// declare the name.
const OWNER_MODULE = {
  SCREENING_RULES: './js/services/eic-screening-rules.js',
  DECISION_RULES: './js/services/eic-decision-rules.js',
  PANEL: './js/ui/eic-panel.js',
  TICKER_ANALYSIS: './js/ui/eic-ticker-analysis-panel.js',
  LIVE_DEEP_DIVE: './js/ui/eic-live-deep-dive.js',
};

/**
 * Ownership contract: every one of the thirteen family sites has EXACTLY ONE
 * declared owner, and that owner is the module that really declares it.
 *
 * While the family was still being extracted, `guardManifest`'s shipped/pending
 * arithmetic did most of this work: crediting a site to the wrong owner moved it
 * between the shipped and pending buckets and the totals stopped adding up. Once
 * PR 4 closed the family, ALL FOUR owners are shipped, so that arithmetic no
 * longer distinguishes them — crediting eicRunDXLink to PANEL would keep every
 * total correct. This guard closes that gap by checking ownership against the
 * source instead of against the totals.
 *
 * `declsByModule` maps a module path to the list of names it declares, in
 * physical order, WITH duplicates. Multiplicity matters: a name declared twice
 * in the manifest must be declared twice by its owner.
 */
function guardOwnership(manifest, declsByModule) {
  const violations = [];
  let threw = null;
  try {
    const owners = Object.keys(OWNER_MODULE);
    // 1. every manifest owner is a known owner
    for (const row of manifest) {
      if (owners.indexOf(row[1]) < 0) {
        violations.push('OWNERSHIP_UNKNOWN_OWNER: ' + row[0] + ' is credited to "' + row[1] + '", which is not one of ' + owners.join('/'));
      }
    }
    // 2. each name is declared by EXACTLY ONE module
    const declaringModules = {};
    for (const mod of Object.keys(declsByModule)) {
      for (const n of declsByModule[mod]) {
        (declaringModules[n] = declaringModules[n] || new Set()).add(mod);
      }
    }
    for (const n of Object.keys(declaringModules)) {
      if (declaringModules[n].size !== 1) {
        violations.push('OWNERSHIP_SPLIT_MODULE: ' + n + ' is declared by ' + declaringModules[n].size
          + ' different modules (' + Array.from(declaringModules[n]).join(', ') + ')');
      }
    }
    // 3. the manifest's owner is the module that actually declares the name,
    //    at the same multiplicity
    for (const n of Array.from(new Set(manifest.map((m) => m[0])))) {
      const rows = manifest.filter((m) => m[0] === n);
      const claimed = Array.from(new Set(rows.map((m) => m[1])));
      if (claimed.length !== 1) {
        violations.push('OWNERSHIP_MULTIPLE_OWNERS: ' + n + ' is credited to ' + claimed.length
          + ' owners (' + claimed.join(', ') + '); every site of a name shares one owner');
        continue;
      }
      const mod = OWNER_MODULE[claimed[0]];
      if (!mod) continue;                       // already reported at step 1
      const declared = (declsByModule[mod] || []).filter((x) => x === n).length;
      if (declared === 0) {
        violations.push('OWNERSHIP_WRONG_OWNER: ' + n + ' is credited to ' + claimed[0]
          + ' (' + mod + '), but that module does not declare it');
      } else if (declared !== rows.length) {
        violations.push('OWNERSHIP_MULTIPLICITY: ' + n + ' has ' + rows.length + ' manifest site(s) but '
          + mod + ' declares it ' + declared + ' time(s)');
      }
    }
    // 4. every declaration shipped in a module appears in the manifest
    for (const mod of Object.keys(declsByModule)) {
      for (const n of declsByModule[mod]) {
        if (!manifest.some((m) => m[0] === n)) {
          violations.push('OWNERSHIP_UNPLANNED: ' + mod + ' declares ' + n + ', which is not in the thirteen-site manifest');
        }
      }
    }
    // 5. the five owners together account for every manifest site
    const total = Object.keys(declsByModule).reduce((a, mod) => a + declsByModule[mod].length, 0);
    if (total !== manifest.length) {
      violations.push('OWNERSHIP_CONSERVATION: the modules declare ' + total + ' sites, the manifest lists ' + manifest.length);
    }
  } catch (e) { threw = String(e && e.message); violations.push('OWNERSHIP_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

/** Plan contract over the manifest model: [name, owner, chars, form, baseOffset]. */
function guardManifest(manifest) {
  const violations = [];
  let threw = null;
  try {
    if (manifest.length !== FAMILY_SITES) violations.push('MANIFEST_SITES: expected ' + FAMILY_SITES + ' sites, found ' + manifest.length);
    const names = manifest.map((m) => m[0]);
    if (new Set(names).size !== FAMILY_NAMES) violations.push('MANIFEST_NAMES: expected ' + FAMILY_NAMES + ' unique names, found ' + new Set(names).size);
    const chars = manifest.reduce((a, m) => a + m[2], 0);
    if (chars !== FAMILY_CHARS) violations.push('MANIFEST_CHARS: expected ' + FAMILY_CHARS + ', found ' + chars);
    const shipped = manifest.filter((m) => SHIPPED_OWNERS.indexOf(m[1]) >= 0);
    if (shipped.length !== SHIPPED_SITES) violations.push('MANIFEST_SHIPPED_SITES: expected ' + SHIPPED_SITES + ' shipped sites, found ' + shipped.length);
    if (shipped.reduce((a, m) => a + m[2], 0) !== SHIPPED_CHARS) {
      violations.push('MANIFEST_SHIPPED_CHARS: expected ' + SHIPPED_CHARS + ', found ' + shipped.reduce((a, m) => a + m[2], 0));
    }
    const pending = manifest.filter((m) => SHIPPED_OWNERS.indexOf(m[1]) < 0);
    if (pending.length !== PENDING_SITES) violations.push('MANIFEST_PENDING_SITES: expected ' + PENDING_SITES + ', found ' + pending.length);
    if (pending.reduce((a, m) => a + m[2], 0) !== PENDING_CHARS) {
      violations.push('MANIFEST_PENDING_CHARS: expected ' + PENDING_CHARS + ', found ' + pending.reduce((a, m) => a + m[2], 0));
    }
    // The shipped set must be exactly the three shipped names.
    const shippedNames = Array.from(new Set(shipped.map((m) => m[0]))).sort();
    if (shippedNames.join(',') !== SHIPPED_NAMES.slice().sort().join(',')) {
      violations.push('MANIFEST_SHIPPED_IDENTITY: shipped owner holds [' + shippedNames.join(', ') + ']');
    }
    // A duplicated name must never be split across owners: one copy in a module
    // and one inline is the single arrangement where the two stop being
    // interchangeable.
    for (const n of Array.from(new Set(names))) {
      const rows = manifest.filter((m) => m[0] === n);
      if (rows.length < 2) continue;
      const owners = Array.from(new Set(rows.map((m) => m[1])));
      if (owners.length !== 1) violations.push('MANIFEST_SPLIT_DUPLICATE: ' + n + ' sites are split across owners ' + owners.join(' / '));
    }
  } catch (e) { threw = String(e && e.message); violations.push('MANIFEST_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

/**
 * Ratchet contract: shrink-only, floor equals the real residue, and — once the
 * family reaches ZERO — that zero is TERMINAL.
 *
 * The corrected owner-aware ratchet is `[13,9,7,6,2,0]`. The earlier
 * `[11,7,5,4,0]` series was not a terminal family proof: it omitted two
 * generically named owner declarations before it even opened. A later positive
 * allowance would mean the family had been closed and then quietly re-opened —
 * precisely the failure a terminal zero exists to prevent. So zero is checked
 * three ways:
 *
 *   • it must be the LAST value;
 *   • it must be the MINIMUM (nothing negative may sneak under it);
 *   • no value after the first zero may exist at all.
 *
 * And the floor check still binds: the allowance must equal the number of EIC
 * declarations actually inline, so a zero that is merely asserted rather than
 * achieved fails against the real monolith.
 */
function guardRatchet(ratchet, inlineSiteCount) {
  const violations = [];
  let threw = null;
  try {
    if (!Array.isArray(ratchet) || ratchet.length < 2) { violations.push('RATCHET_SHAPE: expected at least two steps'); return { violations, threw }; }
    if (ratchet[0] !== FAMILY_SITES) violations.push('RATCHET_OPENING: first step must be the family size ' + FAMILY_SITES + ', found ' + ratchet[0]);
    for (let i = 1; i < ratchet.length; i++) {
      if (!(ratchet[i] < ratchet[i - 1])) violations.push('RATCHET_GREW: step ' + i + ' went ' + ratchet[i - 1] + ' → ' + ratchet[i]);
    }
    const floor = ratchet[ratchet.length - 1];
    if (floor !== inlineSiteCount) violations.push('RATCHET_FLOOR: allowance is ' + floor + ' but ' + inlineSiteCount + ' EIC sites are inline');
    // ── the terminal zero ────────────────────────────────────────────────────
    const firstZero = ratchet.indexOf(0);
    if (firstZero >= 0) {
      if (firstZero !== ratchet.length - 1) {
        violations.push('RATCHET_REOPENED: the family reached 0 at step ' + firstZero + ' but the ratchet continues to ['
          + ratchet.slice(firstZero + 1).join(', ') + ']; zero is TERMINAL and no later allowance may be appended');
      }
      if (Math.min.apply(null, ratchet) !== 0) {
        violations.push('RATCHET_BELOW_ZERO: the minimum step is ' + Math.min.apply(null, ratchet) + ', not 0');
      }
    }
    if (floor === 0 && inlineSiteCount !== 0) {
      violations.push('RATCHET_ZERO_UNEARNED: the allowance is 0 but ' + inlineSiteCount + ' EIC declarations are still inline');
    }
  } catch (e) { threw = String(e && e.message); violations.push('RATCHET_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

/** Load-time observer contract over a set of downstream sources. */
function guardNoLoadTimeObservers(sources, names) {
  const violations = [];
  let threw = null;
  try {
    for (const { label, code } of sources) {
      const { loadTime } = classifyReferences(code, names);
      for (const o of loadTime) {
        violations.push('LOAD_TIME_OBSERVER: ' + o.name + ' is read at evaluation time in ' + label + ' — ' + JSON.stringify(o.excerpt.trim()));
      }
    }
  } catch (e) { threw = String(e && e.message); violations.push('OBSERVER_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

module.exports = {
  sha256,
  maskLiterals,
  stripComments,
  scanTopLevelDeclarations,
  functionBodyRanges,
  classifyReferences,
  guardModuleShape,
  guardLiveDeepDiveShape,
  guardModulePurity,
  guardLoad,
  guardInlineResidue,
  isEicFamilyName,
  isEicFamilyDecl,
  splitIdentifierSegments,
  guardManifest,
  guardOwnership,
  guardRatchet,
  guardLiveDeepDiveSurface,
  guardEicModuleInventory,
  guardNoLoadTimeObservers,
  guardPanelSurface,
  guardTickerAnalysisSurface,
  EXPECTED_MODULE,
  EXPECTED_PANEL,
  EXPECTED_TICKER_ANALYSIS,
  EXPECTED_LIVE_DEEP_DIVE,
  EXPECTED_DECISION_RULES,
  SHIPPED_NAMES,
  PR1_NAMES,
  PANEL_NAMES,
  TICKER_ANALYSIS_NAMES,
  LIVE_DEEP_DIVE_NAMES,
  DECISION_RULES_NAMES,
  PENDING_ORDER,
  PENDING_SITES,
  PENDING_CHARS,
  FAMILY_SITES,
  FAMILY_NAMES,
  FAMILY_CHARS,
  SHIPPED_OWNER,
  SHIPPED_OWNERS,
  SHIPPED_SITES,
  SHIPPED_CHARS,
  MODULE_SRC_ATTR,
  DECISION_RULES_SRC_ATTR,
  PANEL_SRC_ATTR,
  TICKER_ANALYSIS_SRC_ATTR,
  LIVE_DEEP_DIVE_SRC_ATTR,
  EIC_MODULE_FILES,
  EIC_MODULE_SRC_ATTRS,
  canonicalLocalSrc,
  isEicModulePath,
  OWNER_MODULE,
};
