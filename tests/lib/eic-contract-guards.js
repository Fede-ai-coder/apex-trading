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
    if (NOT_METHOD.has(m[3])) continue;
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

function guardModuleShape(moduleSrc) {
  const violations = [];
  let threw = null;
  try {
    const decls = scanTopLevelDeclarations(moduleSrc);
    if (decls.length !== EXPECTED_MODULE.sites) {
      violations.push('SITE_COUNT: expected ' + EXPECTED_MODULE.sites + ' declaration sites, found ' + decls.length);
    }
    const names = decls.map((d) => d.name);
    if (new Set(names).size !== EXPECTED_MODULE.names) {
      violations.push('NAME_COUNT: expected ' + EXPECTED_MODULE.names + ' unique names, found ' + new Set(names).size);
    }
    if (names.join(',') !== EXPECTED_MODULE.order.join(',')) {
      violations.push('ORDER: expected [' + EXPECTED_MODULE.order.join(', ') + '], found [' + names.join(', ') + ']');
    }
    const chars = decls.reduce((a, d) => a + d.chars, 0);
    if (chars !== EXPECTED_MODULE.chars) {
      violations.push('CHARS: expected ' + EXPECTED_MODULE.chars + ' declaration chars, found ' + chars);
    }
    for (const d of decls) {
      if (d.form !== 'function') violations.push('FORM: ' + d.name + ' is a ' + d.form + ', expected function');
      if (d.isAsync) violations.push('ASYNC: ' + d.name + ' is async; every relocated site must stay synchronous');
      const want = EXPECTED_MODULE.spanSha[d.name];
      if (!want) { violations.push('UNKNOWN_DECLARATION: ' + d.name + ' is not part of this relocation'); continue; }
      const got = sha256(moduleSrc.slice(d.start, d.end + 1));
      if (got !== want) {
        violations.push('SPAN_SHA: ' + d.name + ' body changed — expected ' + want.slice(0, 16) + ', got ' + got.slice(0, 16));
      }
    }
    const liq = decls.filter((d) => d.name === 'eicLiqFromLegs');
    if (liq.length !== 2) violations.push('DUPLICATE: expected exactly 2 eicLiqFromLegs sites, found ' + liq.length);
    else {
      const a = moduleSrc.slice(liq[0].start, liq[0].end + 1);
      const b = moduleSrc.slice(liq[1].start, liq[1].end + 1);
      if (a !== b) violations.push('DUPLICATE_DIVERGED: the two eicLiqFromLegs sites are no longer byte-identical');
      if (!(liq[0].start < liq[1].start)) violations.push('DUPLICATE_ORDER: original relative order not preserved');
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
function guardModulePurity(moduleSrc) {
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
  const OWN = new Set(['eicScreenTicker', 'eicLiqFromLegs', 'eicBuildLiveContext']);
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
    for (const n of ['eicScreenTicker', 'eicLiqFromLegs', 'eicBuildLiveContext']) {
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

/**
 * Load contract over a SCRIPT MODEL — an ordered list of
 * { src, attrs, type, isInlineMonolith }.
 */
function guardLoad(scripts) {
  const violations = [];
  let threw = null;
  try {
    const idx = scripts.map((s, i) => ({ s, i })).filter((x) => x.s.src === MODULE_SRC_ATTR);
    if (idx.length === 0) { violations.push('TAG_MISSING: no <script src="' + MODULE_SRC_ATTR + '"> tag'); return { violations, threw }; }
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

const SHIPPED_NAMES = ['eicScreenTicker', 'eicLiqFromLegs', 'eicBuildLiveContext'];
const PENDING_ORDER = ['eicFetchLegs', 'runEICPanel', 'eicFetchLegs', 'eicAnalyzeTicker',
  'eicAnalyzeAll', 'eicDXLinkDeepDive', 'eicRunDXLink'];
const PENDING_SITES = 7;
const PENDING_CHARS = 52984;

/** Residue contract over the inline monolith source. */
function guardInlineResidue(inlineSrc) {
  const violations = [];
  let threw = null;
  try {
    const decls = scanTopLevelDeclarations(inlineSrc)
      .filter((d) => /^eic/i.test(d.name) || d.name === 'runEICPanel');
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
    const fetchLegs = names.filter((n) => n === 'eicFetchLegs').length;
    if (fetchLegs !== 2) {
      violations.push('FETCHLEGS_DUPLICATE: expected eicFetchLegs to remain declared TWICE inline, found ' + fetchLegs);
    }
  } catch (e) { threw = String(e && e.message); violations.push('RESIDUE_GUARD_FAILED: ' + threw); }
  return { violations, threw };
}

const FAMILY_SITES = 11, FAMILY_NAMES = 9, FAMILY_CHARS = 67352;
const SHIPPED_OWNER = 'SCREENING_RULES';

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
    const shipped = manifest.filter((m) => m[1] === SHIPPED_OWNER);
    if (shipped.length !== 4) violations.push('MANIFEST_SHIPPED_SITES: expected 4 shipped sites, found ' + shipped.length);
    if (shipped.reduce((a, m) => a + m[2], 0) !== 14368) {
      violations.push('MANIFEST_SHIPPED_CHARS: expected 14368, found ' + shipped.reduce((a, m) => a + m[2], 0));
    }
    const pending = manifest.filter((m) => m[1] !== SHIPPED_OWNER);
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

/** Ratchet contract: shrink-only, and the floor must equal the real residue. */
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
  scanTopLevelDeclarations,
  functionBodyRanges,
  classifyReferences,
  guardModuleShape,
  guardModulePurity,
  guardLoad,
  guardInlineResidue,
  guardManifest,
  guardRatchet,
  guardNoLoadTimeObservers,
  EXPECTED_MODULE,
  SHIPPED_NAMES,
  PENDING_ORDER,
  PENDING_SITES,
  PENDING_CHARS,
  FAMILY_SITES,
  FAMILY_NAMES,
  FAMILY_CHARS,
  SHIPPED_OWNER,
  MODULE_SRC_ATTR,
};
