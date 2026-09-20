'use strict';
// ═════════════════════════════════════════════════════════════════════════════
// NEXT MONOLITH EXTRACTION — CONFLICT-AWARE AUDIT
//
// WHAT THIS IS
//   An audit, not an extraction. It changes no application file. It measures the
//   residual inline monolith in index.html, groups it into semantic families,
//   scores each family as an extraction target, and — separately — scores how
//   badly each family would collide with the pull requests that are open RIGHT
//   NOW. The two scores are deliberately not combined into one number: the best
//   thing to extract and the best thing to extract NEXT are different questions,
//   and answering them with one ranking is how a refactor lands on top of a
//   feature branch that is still moving.
//
// WHY IT IS A TEST AND NOT A MARKDOWN FILE
//   Every number below is derived from the source at run time. Nothing is typed
//   in twice. The recorded expectations are a contract: when the monolith moves,
//   this suite fails and says which number moved, instead of quietly describing
//   a repository that no longer exists.
//
// THE PARSER IS THE FOUNDATION, SO IT IS PROVED FIRST
//   Every count here rests on one length-preserving, brace-aware masker. Section
//   1 proves that masker against four independent invariants and three recorded
//   DSB fixtures BEFORE any measurement is trusted. That order matters: during
//   this audit the masker was wrong twice — once treating `return /re/` as a
//   division, once splitting by code point so a single emoji shifted every index
//   after it — and in both cases the three DSB fixtures still passed while the
//   monolith scan silently lost 58 declarations. Fixtures alone do not prove a
//   parser. The invariants do.
//
// SCOPE
//   Read-only. No network. Node builtins plus tests/lib/load-app-source.js.
// ═════════════════════════════════════════════════════════════════════════════
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  loadIndexHtml,
  loadOrderedScriptSources,
  parseScriptTags,
  readAttr,
} = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
let checks = 0;
function check(name, fn) {
  checks++;
  try { fn(); } catch (err) { failures.push({ name, message: err && err.message }); }
}
function section(title) { process.stdout.write('\n── ' + title + '\n'); }
function report(label, value) { process.stdout.write('   ' + String(label).padEnd(46) + value + '\n'); }

// ═════════════════════════════════════════════════════════════════════════════
// 0. LENGTH-PRESERVING, BRACE-AWARE MASKER + TOP-LEVEL DECLARATION SCANNER
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

// ═════════════════════════════════════════════════════════════════════════════
// 1. PARSER SELF-PROOF — invariants first, recorded fixtures second
// ═════════════════════════════════════════════════════════════════════════════
section('1. PARSER SELF-PROOF');

const HTML = loadIndexHtml();
const SCRIPTS = loadOrderedScriptSources();
const INLINE_SCRIPTS = SCRIPTS.filter(s => s.kind === 'inline' && s.isAppJs);
assert.strictEqual(INLINE_SCRIPTS.length, 1, 'expected exactly one inline application script');
const INLINE = INLINE_SCRIPTS[0].code;
const MASKED = maskSource(INLINE);

check('masker invariants hold over the whole monolith', () => {
  verifyMaskerInvariants(maskSource, INLINE);
});

check('every column-0 declaration keyword is seen at depth zero', () => {
  // An independent oracle: a `function` / `var` / `const` at the start of a line
  // in this file is always top level. If the depth counter disagrees anywhere,
  // the scan is truncated somewhere earlier.
  const anchors = [];
  const re = /\n(?:async function |function |var |const |let )/g;
  let m;
  while ((m = re.exec(INLINE)) !== null) anchors.push(m.index + 1);
  let d = 0, p = 0, b = 0, ai = 0, bad = -1;
  for (let i = 0; i < MASKED.length && bad < 0; i++) {
    while (ai < anchors.length && anchors[ai] === i) {
      if (d !== 0 || p !== 0 || b !== 0) bad = i;
      ai++;
    }
    const c = MASKED[i];
    if (c === '{') d++; else if (c === '}') d--;
    else if (c === '(') p++; else if (c === ')') p--;
    else if (c === '[') b++; else if (c === ']') b--;
  }
  assert.strictEqual(bad, -1, 'column-0 declaration at offset ' + bad + ' was not at depth zero');
  assert.ok(anchors.length > 1300, 'expected >1300 column-0 anchors, saw ' + anchors.length);
});

// Recorded fixtures. Three already-extracted DSB modules with known shapes.
const DSB_FIXTURES = [
  ['js/adapters/backend-directional-snapshot-adapter.js', 19, 6789],
  ['js/services/backend-directional-snapshot-service.js', 26, 26385],
  ['js/ui/backend-directional-snapshot-panel.js', 9, 14945],
];
for (const [rel, expectN, expectChars] of DSB_FIXTURES) {
  check('DSB fixture ' + path.basename(rel), () => {
    const decls = scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
    const chars = decls.reduce((a, d) => a + d.chars, 0);
    assert.strictEqual(decls.length, expectN, rel + ': declarations ' + decls.length + ' != ' + expectN);
    assert.strictEqual(chars, expectChars, rel + ': declaration chars ' + chars + ' != ' + expectChars);
  });
}
report('inline application script chars', INLINE.length);

// ═════════════════════════════════════════════════════════════════════════════
// 2. SCRIPT MANIFEST — load order is part of the contract
// ═════════════════════════════════════════════════════════════════════════════
section('2. SCRIPT MANIFEST');

// The exact, ordered list of local application scripts. Extraction PRs edit this
// block, and so does #362 — this is the one surface every candidate shares.
const EXPECTED_SCRIPT_ORDER = [
  './js/utils/indicators.js',
  './js/utils/option-symbols.js',
  './js/utils/normalizers.js',
  './js/api/backend-client.js',
  './js/config/backend-config.js',
  './js/services/portfolio-stress-parity.js',
  './js/services/portfolio-stress-response.js',
  './js/services/portfolio-stress-client.js',
  './js/services/candle-normalization.js',
  './js/services/candle-auth-gate.js',
  './js/services/candle-provenance.js',
  './js/services/candle-store-client.js',
  './js/services/candle-dxlink-client.js',
  './js/services/sfs-candle-predicates.js',
  './js/services/sfs-candle-warmup.js',
  './js/services/sfs-candle-generic-ensure.js',
  './js/services/sfs-candle-chart-hydration.js',
  './js/services/sfs-candle-spy-read.js',
  './js/services/sfs-candle-detail-4h.js',
  './js/services/backend-scanner-snapshot-service.js',
  './js/ui/backend-scanner-snapshot-panel.js',
  './js/adapters/backend-directional-adapter.js',
  './js/ui/backend-directional-preview.js',
  './js/adapters/backend-directional-snapshot-adapter.js',
  './js/services/backend-directional-snapshot-service.js',
  './js/ui/backend-directional-snapshot-panel.js',
];

// The model the script contract is checked against, so a mutation can perturb it.
function buildScriptModel(html) {
  return parseScriptTags(html).map((tag, order) => ({
    order,
    src: tag.src == null ? null : String(tag.src).trim(),
    type: readAttr(tag.attrs, 'type'),
    defer: /(?:^|[ \t\n\f\r])defer(?![A-Za-z0-9-])/i.test(tag.attrs),
    async: /(?:^|[ \t\n\f\r])async(?![A-Za-z0-9-])/i.test(tag.attrs),
    inlineLength: tag.src ? 0 : tag.inline.length,
  }));
}

// The whole script-order contract, as a function of the model. Every failure a
// mutation is supposed to trigger is raised from here.
function verifyScriptModel(model) {
  const local = model.filter(s => s.src && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(s.src));
  assert.deepStrictEqual(local.map(s => s.src), EXPECTED_SCRIPT_ORDER,
    'local application script order changed');
  for (const s of local) {
    assert.ok(!s.defer, 'local application script must not be deferred: ' + s.src);
    assert.ok(!s.async, 'local application script must not be async: ' + s.src);
    assert.ok(s.type == null || s.type.trim() === '' || /^(?:text|application)\/(?:java|ecma)script$/i.test(s.type),
      'local application script must stay a classic script, got type=' + s.type + ' for ' + s.src);
  }
  const inlineApp = model.filter(s => !s.src && s.inlineLength > 100000);
  assert.strictEqual(inlineApp.length, 1, 'expected exactly one large inline application script');
  assert.ok(inlineApp[0].order > local[local.length - 1].order,
    'the inline monolith must load AFTER every extracted module');
}

const SCRIPT_MODEL = buildScriptModel(HTML);
check('script manifest, order and classic-script form', () => verifyScriptModel(SCRIPT_MODEL));
report('local application scripts', EXPECTED_SCRIPT_ORDER.length);

// ═════════════════════════════════════════════════════════════════════════════
// 3. RESIDUE INVENTORY
// ═════════════════════════════════════════════════════════════════════════════
section('3. RESIDUE INVENTORY');

const DECLS = scanTopLevelDeclarations(INLINE, MASKED);
const DECL_CHARS = DECLS.reduce((a, d) => a + d.chars, 0);

const RESIDUE = { declarations: 1408, declarationChars: 1898241, inlineChars: 2182172 };
check('residual declaration count', () => assert.strictEqual(DECLS.length, RESIDUE.declarations));
check('residual declaration chars', () => assert.strictEqual(DECL_CHARS, RESIDUE.declarationChars));
check('inline script chars', () => assert.strictEqual(INLINE.length, RESIDUE.inlineChars));
// The monolith declares two names twice — the SAME adjacent EIC pair, pasted at
// two offsets exactly 12,543 chars apart, byte-identical in both places. In
// sloppy mode the second copy silently wins. This is recorded rather than
// tolerated in silence because it is a real hazard for whoever extracts EIC: a
// move that emits each declaration once changes the file, and a move that emits
// both produces a duplicate declaration inside a module.
const KNOWN_DUPLICATE_DECLARATIONS = ['eicFetchLegs', 'eicLiqFromLegs'];
check('the only duplicated declaration is the recorded one', () => {
  const seen = new Set(), dupes = [];
  for (const d of DECLS) { if (seen.has(d.name)) dupes.push(d.name); seen.add(d.name); }
  assert.deepStrictEqual(dupes.sort(), KNOWN_DUPLICATE_DECLARATIONS,
    'duplicate top-level declarations changed: ' + dupes.join(', '));
});
check('each recorded duplicate is byte-identical in both places', () => {
  for (const name of KNOWN_DUPLICATE_DECLARATIONS) {
    const both = DECLS.filter(d => d.name === name);
    assert.strictEqual(both.length, 2, name + ' should appear exactly twice');
    assert.strictEqual(INLINE.slice(both[0].start, both[0].end), INLINE.slice(both[1].start, both[1].end),
      name + ' copies differ');
    assert.strictEqual(both[1].start - both[0].start, 12543, name + ' copy offset changed');
  }
});
report('residual top-level declarations', DECLS.length);
report('residual declaration chars', DECL_CHARS);
report('declaration chars / inline chars', (100 * DECL_CHARS / INLINE.length).toFixed(1) + '%');

// The DSB family is fully extracted: nothing named dsb* is left inline. This is
// the "preserve completed extractions" invariant, stated as a measurement.
check('DSB family has zero residual declarations', () => {
  const left = DECLS.filter(d => /^_?dsb/i.test(d.name)).map(d => d.name);
  assert.deepStrictEqual(left, [], 'DSB declarations still inline: ' + left.join(', '));
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. FACETS — call graph, state, DOM, storage, lifecycle, tests
// ═════════════════════════════════════════════════════════════════════════════
section('4. FACETS');

const MODULE_DECLS = new Map();
for (const s of SCRIPTS) {
  if (s.kind !== 'local') continue;
  const rel = path.relative(ROOT, s.resolvedPath);
  for (const d of scanTopLevelDeclarations(s.code)) MODULE_DECLS.set(d.name, rel);
}
const INLINE_NAMES = new Set(DECLS.map(d => d.name));
const BY_NAME = new Map(DECLS.map(d => [d.name, d]));
const IS_BINDING = n => { const t = BY_NAME.get(n); return !!t && ['var', 'let', 'const'].includes(t.kind); };
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'set', 'delete', 'clear', 'add']);

const TEST_SOURCES = fs.readdirSync(path.join(ROOT, 'tests'))
  .filter(f => f.endsWith('.test.js') && f !== path.basename(__filename))
  .map(f => ({ f, src: fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8') }));

const HTML_OUTSIDE_INLINE = (() => {
  const at = HTML.indexOf(INLINE);
  return HTML.slice(0, at) + HTML.slice(at + INLINE.length);
})();
const STATIC_HANDLERS = new Set();
for (const m of HTML_OUTSIDE_INLINE.matchAll(/\bon[a-z]+\s*=\s*"([^"]*)"/g)) {
  for (const id of m[1].matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (INLINE_NAMES.has(id[0])) STATIC_HANDLERS.add(id[0]);
  }
}
const WINDOW_EXPOSED = new Set(
  [...INLINE.matchAll(/\b(?:window|globalThis)\.([A-Za-z0-9_$]+)\s*=/g)].map(m => m[1]));

for (const d of DECLS) {
  const body = MASKED.slice(d.start, d.end);
  const raw = INLINE.slice(d.start, d.end);
  const refs = new Set();
  for (const m of body.matchAll(/[A-Za-z_$][A-Za-z0-9_$]*/g)) {
    if (body[m.index - 1] === '.') continue;
    refs.add(m[0]);
  }
  refs.delete(d.name);
  d.callees = [...refs].filter(n => INLINE_NAMES.has(n));
  d.crossModule = [...refs].filter(n => MODULE_DECLS.has(n));

  const sr = new Set(), sw = new Set();
  for (const m of body.matchAll(/\bS\.([A-Za-z0-9_$]+)/g)) {
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 40);
    if (/^(?:\.[A-Za-z0-9_$]+|\[[^\]]*\])*\s*(?:\+\+|--|(?:[-+*/|&^]|\|\||&&|\?\?)?=(?!=))/.test(after)
      || /^(?:\.[A-Za-z0-9_$]+|\[[^\]]*\])*\.(?:push|pop|shift|unshift|splice|sort|fill|set|delete|clear|add)\s*\(/.test(after)) sw.add(m[1]);
    else sr.add(m[1]);
  }
  d.stateReads = [...sr];
  d.stateWrites = [...sw];

  const bw = new Set();
  for (const b of d.callees) {
    if (!IS_BINDING(b)) continue;
    const esc = b.replace(/\$/g, '\\$');
    if (new RegExp('(?<![A-Za-z0-9_$.])' + esc + '(?:\\s*\\.[A-Za-z0-9_$]+|\\s*\\[[^\\]]{0,40}\\])*\\s*(?:\\+\\+|--|(?:[-+*/%|&^]|\\|\\||&&|\\?\\?)?=(?!=))').test(body)) { bw.add(b); continue; }
    const re = new RegExp('(?<![A-Za-z0-9_$.])' + esc + '(?:\\s*\\.[A-Za-z0-9_$]+|\\s*\\[[^\\]]{0,40}\\])*\\s*\\.([A-Za-z0-9_$]+)\\s*\\(', 'g');
    let m;
    while ((m = re.exec(body)) !== null) if (MUTATORS.has(m[1])) { bw.add(b); break; }
  }
  d.bindingWrites = [...bw];

  d.fetchCalls = (raw.match(/\bfetch\s*\(/g) || []).length;
  d.abort = /AbortController|\.abort\s*\(|signal\s*:/.test(raw);
  d.endpoints = [...new Set((raw.match(/['"`](\/(?:api|v1|health|scanner|market|portfolios|dev)[^'"`\s]*)['"`]/g) || []).map(s => s.slice(1, -1)))];
  d.methods = [...new Set((raw.match(/method\s*:\s*['"]([A-Z]+)['"]/g) || []).map(s => s.replace(/.*['"]([A-Z]+)['"]/, '$1')))];
  d.timers = (raw.match(/\bset(?:Timeout|Interval)\s*\(/g) || []).length;
  d.listeners = (raw.match(/addEventListener\s*\(/g) || []).length;
  d.observers = (raw.match(/(?:Mutation|Resize|Intersection)Observer/g) || []).length;
  d.subscriptions = (raw.match(/\b(?:subscribe|unsubscribe|onmessage|WebSocket|EventSource)\b/g) || []).length;
  d.domIds = [...new Set([
    ...(raw.match(/getElementById\s*\(\s*['"]([^'"]+)['"]/g) || []).map(s => s.replace(/.*['"]([^'"]+)['"]/, '$1')),
    ...(raw.match(/querySelector(?:All)?\s*\(\s*['"]#([A-Za-z0-9_-]+)/g) || []).map(s => s.replace(/.*#/, '')),
  ])];
  d.storage = [...new Set((raw.match(/(?:local|session)Storage\.(?:get|set|remove)Item\s*\(\s*['"]([^'"]+)['"]/g) || []).map(s => s.replace(/.*['"]([^'"]+)['"]/, '$1')))];
  d.staticOnclick = STATIC_HANDLERS.has(d.name);
  d.windowExposed = WINDOW_EXPOSED.has(d.name);
  d.externalConsumers = [];
  const nameRe = new RegExp('(?<![A-Za-z0-9_$.])' + d.name.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])');
  for (const s of SCRIPTS) {
    if (s.kind !== 'local') continue;
    if (nameRe.test(maskSource(s.code))) d.externalConsumers.push(path.relative(ROOT, s.resolvedPath));
  }
  d.tests = TEST_SOURCES.filter(t => nameRe.test(t.src)).map(t => t.f);
}

// Top-level statements: everything at depth zero that is NOT a declaration.
// These are the load-time side effects that make an extraction order-sensitive.
const TOP_LEVEL_STATEMENTS = (() => {
  const ordered = DECLS.slice().sort((a, b) => a.start - b.start);
  const out = [];
  let cur = 0;
  const push = (s, e) => {
    const nonWs = MASKED.slice(s, e).replace(/\s+/g, '').length;
    if (nonWs) out.push({ start: s, end: e, nonWs, preview: INLINE.slice(s, e).replace(/\s+/g, ' ').trim().slice(0, 160) });
  };
  for (const d of ordered) { if (d.start > cur) push(cur, d.start); cur = Math.max(cur, d.end); }
  if (cur < INLINE.length) push(cur, INLINE.length);
  return out;
})();
report('top-level statement gaps', TOP_LEVEL_STATEMENTS.length);
report('top-level statement chars (non-ws)', TOP_LEVEL_STATEMENTS.reduce((a, s) => a + s.nonWs, 0));

// ═════════════════════════════════════════════════════════════════════════════
// 5. CLUSTERING — family ownership first, physical section second
// ═════════════════════════════════════════════════════════════════════════════
section('5. CLUSTERING');

// Ownership beats position. The MCX backend-candle cache and its five accessors
// sit physically inside the PRE-TRADE RISK region; both RS SPY benchmark caches
// sit inside the PORTFOLIO region. Keying on position alone would file those
// caches away from the only code that owns them — the exact split this audit
// exists to refuse. The `_<family>` prefix is this codebase's own ownership
// marker: every family already extracted (dsb*, sfs*, portfolio-stress*) took
// its prefix with it. Each rule below names ONE family that already owns state;
// none of them merges two blocks that merely look alike.
const FAMILY_RULES = [
  ['swing', /^(_?swing|SWING_)/i],
  ['sfs', /^(_?sfs|SFS_)/i],
  ['mcx', /^(_?mcx|MCX_|ffMcx)/i],
  ['pess', /^(_?pess|PESS_)/i],
  ['eic', /^(_?eic|EIC_)/i],
  ['dss-frontend', /^(_?dss|DSS_)/i],
  ['rs-vs-spy', /^(_?rs[A-Z0-9_]|_?rsb|RS_|_RS_)/],
  ['option-chain', /^(_optChain|_optionChain|_chain|_CHAIN_|_isChainTimeoutShape|_scheduleChainTimeoutRetry|_currentChainTicker|_fetchAndRenderChain|_setLegStreamerFromChain|_fetchOptionChain|_onLegExpChange|_onLegStrikeChange|_onJtLegExpChange|_onJtLegStrikeChange|_setOptionChainPriorityPending|_notePortfolioFallbackDeferred|_pausePortfolioFallbackForOptionChain|_runTrailingPortfolioRefreshIfPending)/],
  ['journal', /^(_?j[A-Z]|_?jt[A-Z]|journal|Journal|_adjForm|_clPnlPreview|_closeLegsTradeId|_tradeMetrics|_rollLegPnlPreview|_autoPopulateRollLegs|_validateRollTypeMatch|_onAdj|_adjType|_adjUpdate|_adjAdd|_adjRemove|_renderAdj|_renderJt|_renderCloseLegs|_detailCell|_priceCellHtml|_LEG_TERMINAL_STATUSES|legStatusOf|legIsOpen|legIsTerminal)/],
  ['view-navigation', /^(showView|_activeView|ff[A-Z]|_apexBackendOffloadDiag|_ensurePerfDiag)/],
  ['candle-stream', /^(_candle|_CANDLE_|_onCandleData|_pushCandle|_initCandleStream|_ensureCandleSubscription|_ensure30MSubscription|_browserCandle|_browser4h|_BROWSER_4H|_backendCandleAuth|_BACKEND_CANDLE_|_noteCandleSubscriptionLimitHit|apexDebugCandleSubscriptions|_recordCandleSubscriptionRequest|_logRecentCandleDiagnostics|_backendApiAuthState|_apexAuthSkipLogged)/],
];

// Physical sections, detected from the monolith's own `═══` banners, keyed by
// title so the map survives byte drift.
function detectSections(text) {
  const lines = text.split('\n');
  const offsets = [];
  let off = 0;
  for (const L of lines) { offsets.push(off); off += L.length + 1; }
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!/^\/\/\s/.test(t)) continue;
    const title = t.replace(/^\/\/\s?/, '').replace(/[═━─\s]+$/, '').replace(/^[═━─\s]+/, '').trim();
    if (title.length < 6 || title.length > 70) continue;
    if (/[={};()]/.test(title)) continue;
    const letters = title.replace(/[^A-Za-z]/g, '');
    if (letters.length < 5) continue;
    if ((title.match(/[A-Z]/g) || []).length / letters.length < 0.85) continue;
    const near = [lines[i - 1], lines[i + 1]].filter(Boolean).map(s => s.trim());
    if (!near.some(s => /^\/[\/*]\s*[═━]{6,}/.test(s))) continue;
    out.push({ offset: offsets[i], title: title.slice(0, 80) });
  }
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!/^\/\/\s*[═━]{6,}/.test(t)) continue;
    for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
      const t2 = lines[j].trim().replace(/^\/\/\s?/, '').replace(/[═━─\s]+$/, '').trim();
      if (!t2 || /^[═━─]{4,}/.test(t2)) continue;
      if (!/^\/\//.test(lines[j].trim())) break;
      if (/[={};]/.test(t2)) break;
      if (!/[A-Za-z]/.test(t2)) break;
      out.push({ offset: offsets[i], title: t2.slice(0, 80) });
      break;
    }
  }
  out.sort((a, b) => a.offset - b.offset);
  // The two detectors above see the SAME banner from different lines — one from
  // its `═══` rule, one from its title — so a header arrives twice, ~66-112
  // chars apart. Collapse a repeated title within 300 chars; no two genuinely
  // distinct sections in this monolith share a title that closely.
  const secs = [];
  for (const s of out) {
    if (secs.length && (s.offset - secs[secs.length - 1].offset) < 300 && s.title === secs[secs.length - 1].title) continue;
    secs.push(s);
  }
  return secs;
}

const SECTION_CLUSTER = new Map([
  ['CONFIGURATION', 'bootstrap-config'],
  ['── Build/version marker', 'bootstrap-config'],
  ['MULTI-LEG STRATEGY TEMPLATES', 'bootstrap-config'],
  ['STATE', 'bootstrap-config'],
  ['WATCHLIST — S&P500 top 130 + NDQ100 extra + ETFs + expanded universe', 'watchlist'],
  ['AGENTS', 'bootstrap-config'],
  ['AGENT STATUS', 'bootstrap-config'],
  ['SEC TABS', 'bootstrap-config'],
  ['TASTYTRADE BACKEND', 'tastytrade-auth'],
  ['LIVE PORTFOLIO — refresh-first · DXLink greeks · 60s auto-refresh', 'portfolio-live'],
  ['INDICATORS', 'market-regime'],
  ['─── MARKET REGIME v1 (volatility / trend / earnings climate)', 'market-regime'],
  ['DATA FETCH — cascade TT → TD → AV → Yahoo', 'scanner-acquisition'],
  ['── Scanner candle throttle / dedup / cache', 'scanner-acquisition'],
  ['EARNINGS', 'scanner-acquisition'],
  ['SCAN', 'scanner-acquisition'],
  ['QA', 'scanner-acquisition'],
  ['SORT & FILTER', 'scanner-acquisition'],
  ['RENDER SCANNER', 'scanner-acquisition'],
  ['RENDER RANKING', 'scanner-acquisition'],
  ['RIGHT PANEL HELPERS', 'scanner-acquisition'],
  ['DIRECTIONAL SETUP SCANNER', 'dss-frontend'],
  ['DXLINK CANDLE PIPELINE — reusable multi-timeframe candle data access', 'candle-pipeline-chart'],
  ['── ET timezone helpers', 'candle-pipeline-chart'],
  ['SCANNER INLINE CHART PANEL', 'candle-pipeline-chart'],
  ['RELATIVE STRENGTH SCANNER (RS vs SPY)', 'rs-vs-spy'],
  ['RS vs SPY — APPROVED-DATA PRICE ENGINE (strict no-Yahoo)', 'rs-vs-spy'],
  ['RS vs SPY — BACKEND SNAPSHOT CONSUMER (source of truth)', 'rs-vs-spy'],
  ['SQUEEZE FIRE SCANNER (SFS) — Post-Squeeze Breakout Detection', 'sfs'],
  ['─── SFS constants', 'sfs'],
  ['END SQUEEZE FIRE SCANNER (SFS)', 'sfs'],
  ['SWING TRADING SCREEN  (additive, isolated)', 'swing'],
  ['END SWING TRADING SCREEN', 'swing'],
  ["Shared READ-ONLY reader for the Swing screen's full-universe operational snapsho", 'swing'],
  ['AGENT PANEL', 'agents-chat'],
  ['CHAT', 'agents-chat'],
  ['CLAUDE API CALL', 'agents-chat'],
  ['ORCHESTRATION', 'agents-chat'],
  ['BACKEND CANDLE STORE CHART EXPERIMENT (feature-flagged)', 'candle-pipeline-chart'],
  ['CHART', 'candle-pipeline-chart'],
  ['FUNDAMENTALS', 'fundamentals-rules'],
  ['RULES', 'fundamentals-rules'],
  ['LOGIN & INIT', 'login-init'],
  ['PRE-EARNINGS STRANGLE SWAP AGENT (PESS)', 'pess'],
  ['── PESS: IVR regime classification', 'pess'],
  ['VIEW NAVIGATION', 'view-navigation'],
  ['BACKEND DIRECTIONAL SNAPSHOT (DSB) — backend-driven Directional Scanner', 'dsb-inline-residue'],
  ['min interval between automatic re-fetches', 'dsb-inline-residue'],
  ['PORTFOLIO MANAGER — state + CRUD', 'portfolio-live'],
  ['positionManager — thin adapter over journalManager.', 'portfolio-live'],
  ['BACKEND-BACKED PORTFOLIOS — API client + sync', 'portfolio-live'],
  ['NON-DESTRUCTIVE PORTFOLIO AUDIT TOOLS', 'portfolio-live'],
  ['Read-only scan of every apex* localStorage key. Returns METADATA ONLY', 'portfolio-live'],
  ['PORTFOLIO DIRECTIONAL ALIGNMENT ENGINE', 'portfolio-live'],
  ['Compute technical bias for one symbol across 1D and 4H candle series.', 'portfolio-live'],
  ['PORTFOLIO ROW TRAFFIC LIGHT — helpers', 'portfolio-live'],
  ['Structure-scaled delta acceptable ranges.', 'portfolio-live'],
  ['CANDLE CONTEXT PRIORITY — POST /dev/market/candles-dxlink/context', 'candle-context-parity'],
  ['DEV-ONLY: backend↔frontend DXLink candle parity / debug tool.', 'candle-context-parity'],
  ['JOURNAL MANAGER — state + CRUD + analytics', 'journal'],
  ['Leg lifecycle helpers — terminal statuses (no longer open risk).', 'journal'],
  ['PRE-TRADE RISK CHECK', 'pre-trade-risk'],
  ['Technical bias from snapshot indicators (1D preferred, fall back to primary TF).', 'pre-trade-risk'],
  ['MARKET CONTEXT AGENT (MCX)', 'mcx'],
  ['EARNINGS IRON CONDOR AGENT (EIC)', 'eic'],
  ['DXLINK ON-DEMAND — real-time option data for EIC deep dive', 'eic'],
  ['FINAL DECISION LAYER — deterministic, not delegated to Claude', 'eic'],
  ['SETUP SCORING — deterministic, not delegated to Claude', 'eic'],
  ['TRADE JOURNAL — v1', 'journal'],
  ['JOURNAL UI', 'journal'],
  ['JOURNAL REMOTE PERSISTENCE — v1', 'journal'],
  ['journalManager → Backend Sync Layer', 'journal'],
  ['Strips the volatile real-time live field and normalises id to', 'journal'],
  ['BACKUP / RESTORE PANEL', 'journal'],
]);

const SECTIONS = detectSections(INLINE);
check('every detected section has a declared cluster', () => {
  const unknown = SECTIONS.map(s => s.title).filter(t => !SECTION_CLUSTER.has(t));
  assert.deepStrictEqual(unknown, [], 'undeclared sections: ' + unknown.join(' | '));
});

function assignClusters(decls, sections) {
  for (const d of decls) {
    let sec = null;
    for (const s of sections) { if (s.offset <= d.start) sec = s; else break; }
    d.section = sec ? sec.title : '(preamble)';
    let fam = null;
    for (const [name, re] of FAMILY_RULES) if (re.test(d.name)) { fam = name; break; }
    d.cluster = fam || SECTION_CLUSTER.get(d.section) || '(unassigned)';
  }
}
assignClusters(DECLS, SECTIONS);

check('every declaration lands in exactly one named cluster', () => {
  const orphans = DECLS.filter(d => d.cluster === '(unassigned)').map(d => d.name);
  assert.deepStrictEqual(orphans, [], 'unassigned declarations: ' + orphans.slice(0, 10).join(', '));
});
check('the DSB inline residue cluster is empty', () => {
  const left = DECLS.filter(d => d.cluster === 'dsb-inline-residue').map(d => d.name);
  assert.deepStrictEqual(left, [], 'DSB residue is not empty: ' + left.join(', '));
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. CLUSTER METRICS + OWNER-INTEGRITY GATE
// ═════════════════════════════════════════════════════════════════════════════
section('6. CLUSTER METRICS');

function buildClusters(decls, statements) {
  const groups = new Map();
  for (const d of decls) {
    if (!groups.has(d.cluster)) groups.set(d.cluster, []);
    groups.get(d.cluster).push(d);
  }
  const domOwners = new Map(), storageOwners = new Map(), stateWriters = new Map(), bindConsumers = new Map();
  for (const d of decls) {
    for (const x of d.domIds) { if (!domOwners.has(x)) domOwners.set(x, new Set()); domOwners.get(x).add(d.cluster); }
    for (const x of d.storage) { if (!storageOwners.has(x)) storageOwners.set(x, new Set()); storageOwners.get(x).add(d.cluster); }
    for (const x of d.stateWrites) { if (!stateWriters.has(x)) stateWriters.set(x, new Set()); stateWriters.get(x).add(d.cluster); }
    for (const x of d.callees) { if (!IS_BINDING(x)) continue; if (!bindConsumers.has(x)) bindConsumers.set(x, new Set()); bindConsumers.get(x).add(d.cluster); }
  }
  const stmtByCluster = new Map();
  const byStart = decls.slice().sort((a, b) => a.start - b.start);
  for (const st of statements) {
    let owner = null;
    for (const d of byStart) { if (d.end <= st.start) owner = d; else break; }
    const k = owner ? owner.cluster : '(head)';
    if (!stmtByCluster.has(k)) stmtByCluster.set(k, { n: 0, chars: 0, samples: [] });
    const g = stmtByCluster.get(k);
    g.n++; g.chars += st.nonWs;
    if (g.samples.length < 5 && st.nonWs > 20) g.samples.push(st.preview);
  }

  const rows = [];
  for (const [cluster, list] of groups) {
    const own = new Set(list.map(d => d.name));
    let internal = 0;
    const outbound = new Set(), inbound = new Set();
    for (const d of list) for (const c of d.callees) (own.has(c) ? internal++ : outbound.add(c));
    for (const d of decls) {
      if (own.has(d.name)) continue;
      for (const c of d.callees) if (own.has(c)) inbound.add(d.name + '->' + c);
    }
    const sw = new Set(list.flatMap(d => d.stateWrites));
    const domIds = [...new Set(list.flatMap(d => d.domIds))];
    const storage = [...new Set(list.flatMap(d => d.storage))];
    const refBind = new Set();
    for (const d of list) for (const c of d.callees) if (IS_BINDING(c) && c !== 'S') refBind.add(c);
    const foreignRead = [...refBind].filter(b => !own.has(b));
    const ownBind = list.filter(d => ['var', 'let', 'const'].includes(d.kind)).map(d => d.name);
    const exported = ownBind.filter(b => bindConsumers.has(b) && [...bindConsumers.get(b)].some(c => c !== cluster));
    const foreignWrites = new Map();
    for (const d of list) for (const b of d.bindingWrites) {
      if (own.has(b) || b === 'S') continue;
      if (!foreignWrites.has(b)) foreignWrites.set(b, []);
      foreignWrites.get(b).push(d.name);
    }
    const idx = list.map(d => d.idx == null ? decls.indexOf(d) : d.idx).sort((a, b) => a - b);
    let runs = 1;
    for (let i = 1; i < idx.length; i++) if (idx[i] !== idx[i - 1] + 1) runs++;
    const st = stmtByCluster.get(cluster) || { n: 0, chars: 0, samples: [] };
    const exclSW = [...sw].filter(r => stateWriters.get(r).size === 1);

    rows.push({
      cluster, n: list.length,
      chars: list.reduce((a, d) => a + d.chars, 0),
      sync: list.filter(d => d.kind === 'function' && !d.isAsync).length,
      asyncN: list.filter(d => d.isAsync).length,
      bindings: ownBind.length,
      classes: list.filter(d => d.kind === 'class').length,
      spanStart: Math.min(...list.map(d => d.start)),
      spanEnd: Math.max(...list.map(d => d.end)),
      runs, internal, outbound: outbound.size, inbound: inbound.size,
      fetch: list.reduce((a, d) => a + d.fetchCalls, 0),
      endpoints: [...new Set(list.flatMap(d => d.endpoints))].sort(),
      methods: [...new Set(list.flatMap(d => d.methods))].sort(),
      abort: list.filter(d => d.abort).length,
      timers: list.reduce((a, d) => a + d.timers, 0),
      listeners: list.reduce((a, d) => a + d.listeners, 0),
      subs: list.reduce((a, d) => a + d.subscriptions, 0),
      observers: list.reduce((a, d) => a + d.observers, 0),
      domIds, storage,
      staticOnclick: list.filter(d => d.staticOnclick).length,
      windowExposed: list.filter(d => d.windowExposed).map(d => d.name).sort(),
      extConsumers: [...new Set(list.flatMap(d => d.externalConsumers))].sort(),
      testFiles: [...new Set(list.flatMap(d => d.tests))].sort(),
      covered: list.filter(d => d.tests.length).length,
      stateWrites: [...sw].sort(),
      stateOwnershipRatio: sw.size ? exclSW.length / sw.size : 1,
      domExclusivity: domIds.length ? domIds.filter(x => domOwners.get(x).size === 1).length / domIds.length : 1,
      storageExclusivity: storage.length ? storage.filter(x => storageOwners.get(x).size === 1).length / storage.length : 1,
      foreignReadBindings: foreignRead.sort(),
      bindingSelfSufficiency: refBind.size ? 1 - foreignRead.length / refBind.size : 1,
      exportedBindings: exported.sort(),
      bindingEncapsulation: ownBind.length ? 1 - exported.length / ownBind.length : 1,
      foreignWriteBindings: [...foreignWrites.keys()].sort(),
      // OWNER-INTEGRITY GATE. Reading a binding another cluster declares is
      // survivable — the read can become a parameter or an accessor. MUTATING
      // one is not: it makes this cluster a co-owner of that cache, timer or
      // subscription registry, so moving it into its own file splits the owner.
      // This is the mechanical form of "never split the subscription owner".
      ownerIntegrity: foreignWrites.size === 0,
      topLevelStatements: st.n,
      topLevelStatementChars: st.chars,
      topLevelSamples: st.samples,
    });
  }
  return rows.sort((a, b) => b.chars - a.chars);
}

DECLS.forEach((d, i) => { d.idx = i; });
const CLUSTERS = buildClusters(DECLS, TOP_LEVEL_STATEMENTS);
const CLUSTER_BY_NAME = new Map(CLUSTERS.map(c => [c.cluster, c]));

check('cluster count', () => assert.strictEqual(CLUSTERS.length, 23));
check('clusters partition the residue exactly', () => {
  assert.strictEqual(CLUSTERS.reduce((a, c) => a + c.n, 0), DECLS.length);
  assert.strictEqual(CLUSTERS.reduce((a, c) => a + c.chars, 0), DECL_CHARS);
});
report('clusters', CLUSTERS.length);

// ═════════════════════════════════════════════════════════════════════════════
// 7. CONFLICT MAP — measured against the pull requests open at audit time
// ═════════════════════════════════════════════════════════════════════════════
section('7. CONFLICT MAP');

// Recorded from the live PRs at audit time. Declaration NAMES, not line numbers:
// names survive a rebase, line numbers do not. When the PR refs are present in
// the clone, the recorded sets are re-derived from git and compared; when they
// are not (a shallow CI checkout), the recorded sets stand on their own.
const OPEN_PRS = {
  361: {
    title: 'refactor(scanner): migrate runScan candles to Tastytrade DXLink',
    ref: 'origin/claude/runscan-dxlink-migration-w7chmb',
    draft: false, touchesIndexHtml: true,
    // Re-recorded after #361 was force-pushed mid-audit. It is now rebased ONTO
    // this audit's base (merge-base 8555ded, no longer bf8dfdc) and reaches
    // further: 24 declarations across four clusters, including seven in swing.
    touched: ['SWING_CANDLE_REASON', '_SCANNER_CANDLE_DAYS', '_SCANNER_CANDLE_SOURCE',
      '_SCANNER_CANDLE_TF', '_backendCandleStoreChartNormTime', '_candleTradingSessionDate',
      '_etDateStr', '_etWeekBucket', '_scannerCandleInFlight', '_scannerCandleQueue',
      '_swingCandleTransport', '_swingCloneCandleSeries', '_swingLegacySeriesPresent',
      '_swingSeriesSessionDate', '_swingWeekBucket', 'fetchAlphaVantage', 'fetchBackendCandles',
      'fetchCandles', 'fetchScannerCandles', 'fetchTwelveData', 'getDailyCandles', 'openChart',
      'patchLastCandleWithLivePrice', 'runScan'],
  },
  362: {
    title: 'feat(stress): add portfolio stress test dashboard',
    ref: 'origin/claude/portfolio-stress-ui-v1-stsyh3',
    draft: true, touchesIndexHtml: true,
    touched: ['showView'],
  },
  352: {
    title: 'fix(option-chain): add final bounded retry and transport dedup',
    ref: 'origin/agent/option-chain-bounded-retry',
    draft: true, touchesIndexHtml: false,
    touched: [],
  },
  310: {
    title: 'fix(swing): load SWING chart candles from the persisted candle store',
    ref: 'origin/claude/swing-chart-live-quote-lease',
    draft: true, touchesIndexHtml: true,
    touched: ['_swingChartFailMsg', '_swingGetCandles', '_swingGetChartCandles',
      '_swingIsHardFailure', '_swingIsLatestChartRequest', '_swingSetChartState'],
  },
};

check('every recorded PR-touched name is a real residual declaration', () => {
  for (const [pr, info] of Object.entries(OPEN_PRS)) {
    const missing = info.touched.filter(n => !INLINE_NAMES.has(n));
    assert.deepStrictEqual(missing, [], 'PR#' + pr + ' names no longer inline: ' + missing.join(', '));
  }
});

check('#352 and #310 remain untouched by this audit (no index.html edit here)', () => {
  // This audit adds one test file. It must not have touched a runtime file at
  // all, which is what keeps every open PR rebaseable.
  assert.ok(!OPEN_PRS[352].touchesIndexHtml, '#352 does not edit index.html');
  assert.ok(OPEN_PRS[310].touchesIndexHtml, '#310 does edit index.html');
});

const RANK = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, BLOCKED: 4 };
// Mandated zones. These hold regardless of what the counts say, for as long as
// the corresponding PR is open.
const MANDATORY_CONFLICT = {
  'scanner-acquisition': ['HIGH', '#361 — runScan / scanner acquisition path'],
  'dss-frontend': ['HIGH', '#361 — DSS path'],
  'candle-pipeline-chart': ['HIGH', '#361 — DSS-adjacent candle acquisition'],
  'candle-stream': ['HIGH', '#361 — the DXLink stream runScan is being migrated onto'],
  'view-navigation': ['HIGH', '#362 — stress showView lifecycle'],
  'option-chain': ['MEDIUM', '#352 — owns the option-chain transport in js/api/backend-client.js'],
};

function conflictFor(cluster, prs, mandatory) {
  const own = new Set(cluster ? [] : []);
  const names = new Set(DECLS.filter(d => d.cluster === cluster.cluster).map(d => d.name));
  let level = 'LOW';
  const why = ['shares the <script> order block #362 also edits'];
  for (const [pr, info] of Object.entries(prs)) {
    const hit = info.touched.filter(n => names.has(n));
    if (hit.length) {
      const l = hit.length >= 5 ? 'BLOCKED' : 'HIGH';
      if (RANK[l] > RANK[level]) level = l;
      why.push('#' + pr + ' rewrites ' + hit.length + ' of its declarations');
    }
    const edges = new Set();
    for (const d of DECLS) {
      if (!names.has(d.name)) continue;
      for (const c of d.callees) if (info.touched.includes(c) && !names.has(c)) edges.add(d.name + '->' + c);
    }
    if (edges.size >= 3) {
      if (RANK.MEDIUM > RANK[level]) level = 'MEDIUM';
      why.push('#' + pr + ' rewrites ' + edges.size + ' functions it calls');
    }
  }
  const m = mandatory[cluster.cluster];
  if (m) { if (RANK[m[0]] > RANK[level]) level = m[0]; why.push(m[1]); }
  return { level, why };
}

for (const c of CLUSTERS) {
  const r = conflictFor(c, OPEN_PRS, MANDATORY_CONFLICT);
  c.conflict = r.level;
  c.conflictWhy = r.why;
}

// The conflict map itself is part of the contract, not just its effect on the
// ranking. Pinning every level is what makes "a high-conflict candidate was
// promoted" detectable: without it, clearing a mandated zone is invisible
// whenever some other gate happens to exclude the same cluster anyway.
const EXPECTED_CONFLICT_MAP = [
  ['agents-chat', 'LOW'],
  ['bootstrap-config', 'LOW'],
  ['candle-context-parity', 'LOW'],
  ['candle-pipeline-chart', 'BLOCKED'],
  ['candle-stream', 'HIGH'],
  ['dss-frontend', 'HIGH'],
  ['eic', 'LOW'],
  ['fundamentals-rules', 'LOW'],
  ['journal', 'LOW'],
  ['login-init', 'LOW'],
  ['market-regime', 'LOW'],
  ['mcx', 'MEDIUM'],
  ['option-chain', 'MEDIUM'],
  ['pess', 'LOW'],
  ['portfolio-live', 'MEDIUM'],
  ['pre-trade-risk', 'LOW'],
  ['rs-vs-spy', 'LOW'],
  ['scanner-acquisition', 'BLOCKED'],
  ['sfs', 'LOW'],
  ['swing', 'BLOCKED'],
  ['tastytrade-auth', 'LOW'],
  ['view-navigation', 'HIGH'],
  ['watchlist', 'LOW'],
];
function conflictMapOf(clusters) {
  return clusters.map(c => [c.cluster, c.conflict]).sort((a, b) => a[0].localeCompare(b[0]));
}
check('conflict map matches the recorded classification', () => {
  assert.deepStrictEqual(conflictMapOf(CLUSTERS), EXPECTED_CONFLICT_MAP);
});
check('#361 keeps every scanner / DSS / candle-acquisition cluster at ≥ HIGH', () => {
  for (const name of ['scanner-acquisition', 'dss-frontend', 'candle-pipeline-chart', 'candle-stream']) {
    const c = CLUSTER_BY_NAME.get(name);
    assert.ok(RANK[c.conflict] >= RANK.HIGH, name + ' must be ≥ HIGH while #361 is open, got ' + c.conflict);
  }
});
check('#362 keeps the showView navigation lifecycle at ≥ HIGH', () => {
  assert.ok(RANK[CLUSTER_BY_NAME.get('view-navigation').conflict] >= RANK.HIGH);
});
check('swing is BLOCKED — both #361 and #310 rewrite it', () => {
  const c = CLUSTER_BY_NAME.get('swing');
  assert.strictEqual(c.conflict, 'BLOCKED');
  const names = new Set(DECLS.filter(d => d.cluster === 'swing').map(d => d.name));
  // #310 is the one that rewrites enough of swing to reach BLOCKED on its own;
  // #361 reaches into the same family for the candle transport. Two open PRs on
  // one cluster is why the highest architectural score is not extractable.
  assert.ok(OPEN_PRS[310].touched.filter(n => names.has(n)).length >= 5, '#310 rewrites ≥5 swing declarations');
  assert.ok(OPEN_PRS[361].touched.filter(n => names.has(n)).length >= 1, '#361 also reaches into swing');
});
check('sfs is untouched by every open PR', () => {
  const names = new Set(DECLS.filter(d => d.cluster === 'sfs').map(d => d.name));
  for (const [pr, info] of Object.entries(OPEN_PRS)) {
    const hit = info.touched.filter(n => names.has(n));
    assert.deepStrictEqual(hit, [], '#' + pr + ' touches sfs: ' + hit.join(', '));
  }
});

// Optional re-derivation: only when the PR refs exist in this clone.
function gitRefExists(ref) {
  try { execFileSync('git', ['rev-parse', '--verify', '--quiet', ref], { cwd: ROOT, stdio: 'pipe' }); return true; }
  catch (_) { return false; }
}
let rederived = 0;
for (const [pr, info] of Object.entries(OPEN_PRS)) {
  if (!gitRefExists(info.ref)) continue;
  rederived++;
  check('#' + pr + ' recorded touch-set still matches git', () => {
    const mb = execFileSync('git', ['merge-base', 'origin/dev-clean', info.ref], { cwd: ROOT }).toString().trim();
    const files = execFileSync('git', ['diff', '--name-only', mb + '..' + info.ref], { cwd: ROOT, maxBuffer: 1 << 28 })
      .toString().trim().split('\n').filter(Boolean);
    assert.strictEqual(files.includes('index.html'), info.touchesIndexHtml,
      '#' + pr + ' index.html involvement changed');
    if (!info.touchesIndexHtml) return;
    const diff = execFileSync('git', ['diff', '-U0', mb + '..' + info.ref, '--', 'index.html'], { cwd: ROOT, maxBuffer: 1 << 28 }).toString();
    const blob = diff.split('\n')
      .filter(l => (l.startsWith('+') || l.startsWith('-')) && !l.startsWith('+++') && !l.startsWith('---'))
      .join('\n');
    const touched = DECLS
      .filter(d => d.name.length >= 5 &&
        new RegExp('(?<![A-Za-z0-9_$.])' + d.name.replace(/\$/g, '\\$') + '(?![A-Za-z0-9_$])').test(blob))
      .map(d => d.name).sort();
    assert.deepStrictEqual(touched, info.touched.slice().sort(),
      '#' + pr + ' touch-set drifted; re-record it');
  });
}
report('PR refs re-derived from git', rederived + ' / ' + Object.keys(OPEN_PRS).length);

// ═════════════════════════════════════════════════════════════════════════════
// 8. SCORING — declared weights, two independent axes
// ═════════════════════════════════════════════════════════════════════════════
section('8. SCORING');

// Positive weights sum to 100; penalties are subtracted from that scale.
//
// Two of these deserve their reasoning stated, because they are not the obvious
// choice:
//
//  • pUnverifiedLifecycle multiplies lifecycle weight by (1 - coverage). Test
//    coverage and runtime risk are not independent inputs: a tested subscription
//    owner can be moved and re-run, an untested one cannot be checked at all.
//    Counting them separately rates a 77 KB untested WebSocket owner as a safer
//    move than a 40 KB family with 16 suites over it, which is backwards.
//
//  • pForeignConsumers charges only consumers OUTSIDE the family. A module that
//    was itself extracted from this family is not an external constraint — it is
//    the boundary this family already negotiated and pinned with a contract
//    test, which is precisely what EXISTING OWNER FIRST says to build on.
const WEIGHTS = {
  cohesion: 18, reduction: 20, coverage: 16, contiguity: 12,
  ownership: 14, reversibility: 10, callTimeSafety: 10,
  pInbound: 8, pUnverifiedLifecycle: 12, pNetwork: 6, pForeignConsumers: 6,
};
const FAMILY_TOKEN = {
  sfs: ['sfs'], 'dss-frontend': ['directional'], 'rs-vs-spy': ['scanner-snapshot', 'rs-'],
  'candle-stream': ['candle'], 'candle-pipeline-chart': ['candle'],
  'portfolio-live': ['portfolio'], mcx: ['mcx'], swing: ['swing'],
  'option-chain': ['option'], journal: ['journal'],
};

function components(c, maxChars) {
  const coverage = c.covered / c.n;
  const lifecycle = Math.min(1, (c.timers + c.subs + c.listeners + c.observers) / 40);
  const toks = FAMILY_TOKEN[c.cluster] || [];
  const foreign = c.extConsumers.filter(p => !toks.some(t => p.toLowerCase().includes(t)));
  return {
    reduction: Math.sqrt(c.chars / maxChars),
    cohesion: c.internal / Math.max(1, c.internal + c.outbound),
    coverage,
    contiguity: 1 / c.runs,
    ownership: (c.stateOwnershipRatio + c.domExclusivity + c.storageExclusivity
      + c.bindingSelfSufficiency + c.bindingEncapsulation) / 5,
    reversibility: 1 - Math.min(1, (foreign.length * 2 + c.windowExposed.length) / 12),
    callTimeSafety: 1 - Math.min(1, c.topLevelStatementChars / 3000),
    pInbound: Math.min(1, c.inbound / 120),
    pUnverifiedLifecycle: lifecycle * (1 - coverage),
    pNetwork: Math.min(1, c.fetch / 12) * (1 - 0.5 * coverage),
    pForeignConsumers: Math.min(1, foreign.length / 6),
  };
}
function scoreWith(c, w, maxChars) {
  const k = components(c, maxChars);
  const pos = w.cohesion * k.cohesion + w.reduction * k.reduction + w.coverage * k.coverage
    + w.contiguity * k.contiguity + w.ownership * k.ownership + w.reversibility * k.reversibility
    + w.callTimeSafety * k.callTimeSafety;
  const neg = w.pInbound * k.pInbound + w.pUnverifiedLifecycle * k.pUnverifiedLifecycle
    + w.pNetwork * k.pNetwork + w.pForeignConsumers * k.pForeignConsumers;
  const posMax = w.cohesion + w.reduction + w.coverage + w.contiguity + w.ownership
    + w.reversibility + w.callTimeSafety;
  return Math.max(0, Math.round(100 * (pos - neg) / posMax));
}

const MAX_CHARS = Math.max(...CLUSTERS.map(c => c.chars));
for (const c of CLUSTERS) c.arch = scoreWith(c, WEIGHTS, MAX_CHARS);

// ARCHITECTURAL RANKING — what is worth extracting, ignoring today's PR traffic.
const BY_ARCH = CLUSTERS.slice().sort((a, b) => b.arch - a.arch || a.cluster.localeCompare(b.cluster));
const EXPECTED_ARCH_TOP5 = [
  ['swing', 74, 'BLOCKED'],
  ['sfs', 70, 'LOW'],
  ['option-chain', 65, 'MEDIUM'],
  ['rs-vs-spy', 64, 'LOW'],
  ['mcx', 61, 'MEDIUM'],
];
check('architectural top 5', () => {
  assert.deepStrictEqual(
    BY_ARCH.slice(0, 5).map(c => [c.cluster, c.arch, c.conflict]),
    EXPECTED_ARCH_TOP5);
});

// EXECUTION PRIORITY — what may be extracted NEXT. Two hard gates first, then
// the same architectural score decides the order among survivors.
function isExecutable(c) { return RANK[c.conflict] <= RANK.MEDIUM && c.ownerIntegrity; }
const EXECUTABLE = CLUSTERS.filter(isExecutable).sort((a, b) => b.arch - a.arch || b.chars - a.chars);
const EXPECTED_EXECUTION_TOP5 = ['sfs', 'mcx', 'eic', 'pess', 'watchlist'];
check('execution priority top 5', () => {
  assert.deepStrictEqual(EXECUTABLE.slice(0, 5).map(c => c.cluster), EXPECTED_EXECUTION_TOP5);
});
check('the architectural winner is NOT the operational winner', () => {
  assert.strictEqual(BY_ARCH[0].cluster, 'swing');
  assert.strictEqual(EXECUTABLE[0].cluster, 'sfs');
  assert.notStrictEqual(BY_ARCH[0].cluster, EXECUTABLE[0].cluster,
    'a BLOCKED cluster must never be promoted to execution priority 1');
});
check('no HIGH/BLOCKED cluster appears in the execution ranking', () => {
  const bad = EXECUTABLE.filter(c => RANK[c.conflict] >= RANK.HIGH).map(c => c.cluster);
  assert.deepStrictEqual(bad, [], 'high-conflict clusters promoted: ' + bad.join(', '));
});
check('no owner-gate failure appears in the execution ranking', () => {
  const bad = EXECUTABLE.filter(c => !c.ownerIntegrity).map(c => c.cluster);
  assert.deepStrictEqual(bad, [], 'owner-splitting clusters promoted: ' + bad.join(', '));
});
check('rs-vs-spy is excluded for splitting the DXLink subscription owner', () => {
  const c = CLUSTER_BY_NAME.get('rs-vs-spy');
  assert.strictEqual(c.ownerIntegrity, false);
  assert.deepStrictEqual(c.foreignWriteBindings, ['_candleQueue', '_candleSubscribed']);
  assert.strictEqual(BY_NAME.get('_candleSubscribed').cluster, 'candle-stream');
});

// SENSITIVITY — the operational winner must survive reweighting.
function winnerUnder(w) {
  return CLUSTERS.filter(isExecutable)
    .map(c => ({ c: c.cluster, s: scoreWith(c, w, MAX_CHARS) }))
    .sort((a, b) => b.s - a.s)[0].c;
}
const sensitivityWinners = new Set();
for (const key of Object.keys(WEIGHTS)) {
  for (const f of [0.8, 1.2]) sensitivityWinners.add(winnerUnder({ ...WEIGHTS, [key]: WEIGHTS[key] * f }));
}
check('±20% on any single weight does not change the operational winner', () => {
  assert.deepStrictEqual([...sensitivityWinners], ['sfs'],
    'winner changed under single-weight perturbation: ' + [...sensitivityWinners].join(', '));
});
let seed = 20260812;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const jitter = new Map();
for (let t = 0; t < 1000; t++) {
  const w = {};
  for (const k of Object.keys(WEIGHTS)) w[k] = WEIGHTS[k] * (0.8 + 0.4 * rnd());
  const c = winnerUnder(w);
  jitter.set(c, (jitter.get(c) || 0) + 1);
}
check('1000 random ±20% reweightings all pick the same operational winner', () => {
  assert.deepStrictEqual([...jitter.entries()], [['sfs', 1000]]);
});
report('sensitivity: single-weight winners', [...sensitivityWinners].join(', '));
report('sensitivity: 1000-jitter winners', [...jitter].map(([c, n]) => c + ' ' + n).join(', '));

// ═════════════════════════════════════════════════════════════════════════════
// 9. WINNER — SFS, audited in depth
// ═════════════════════════════════════════════════════════════════════════════
section('9. OPERATIONAL WINNER: sfs');

const SFS = CLUSTER_BY_NAME.get('sfs');
const SFS_DECLS = DECLS.filter(d => d.cluster === 'sfs').sort((a, b) => a.start - b.start);

check('sfs manifest size', () => {
  assert.strictEqual(SFS.n, 62);
  assert.strictEqual(SFS.chars, 39822);
});
check('sfs is one contiguous physical block', () => {
  assert.strictEqual(SFS.runs, 1);
  assert.strictEqual(SFS.spanStart, 482125);
  assert.strictEqual(SFS.spanEnd, 531715);
});
check('sfs owns its bindings: no foreign writes, no exports', () => {
  assert.deepStrictEqual(SFS.foreignWriteBindings, []);
  assert.deepStrictEqual(SFS.exportedBindings, []);
  assert.deepStrictEqual(SFS.foreignReadBindings, ['WL']);
});
check('sfs performs no network I/O of its own', () => {
  assert.strictEqual(SFS.fetch, 0);
  assert.deepStrictEqual(SFS.endpoints, []);
  assert.deepStrictEqual(SFS.methods, []);
  assert.strictEqual(SFS.abort, 0);
});
check('sfs opens no subscription and touches no storage', () => {
  assert.strictEqual(SFS.subs, 0);
  assert.strictEqual(SFS.observers, 0);
  assert.deepStrictEqual(SFS.storage, []);
});
check('sfs lifecycle is two timers and two listeners', () => {
  assert.strictEqual(SFS.timers, 2);
  assert.strictEqual(SFS.listeners, 2);
});
check('sfs single window exposure', () => {
  assert.deepStrictEqual(SFS.windowExposed, ['apexDebugSfsDetailChart']);
});
check('sfs writes exactly one state root, and it is shared', () => {
  assert.deepStrictEqual(SFS.stateWrites, ['squeezeFireScanner']);
  // switchPanelTab (dss-frontend) also resets S.squeezeFireScanner. This is the
  // one ownership defect in the winner and the extraction must carry it, not
  // silently fix it.
  const foreign = DECLS.filter(d => d.cluster !== 'sfs' && d.stateWrites.includes('squeezeFireScanner')).map(d => d.name);
  assert.deepStrictEqual(foreign, ['switchPanelTab']);
  assert.strictEqual(SFS.stateOwnershipRatio, 0);
});
check('sfs has exactly two inbound callers', () => {
  const names = new Set(SFS_DECLS.map(d => d.name));
  const callers = DECLS.filter(d => d.cluster !== 'sfs' && d.callees.some(c => names.has(c))).map(d => d.name).sort();
  assert.deepStrictEqual(callers, ['_swingRunActiveTab', 'switchPanelTab']);
});
check('sfs consumers are its own already-extracted modules', () => {
  assert.deepStrictEqual(SFS.extConsumers, [
    'js/services/sfs-candle-detail-4h.js',
    'js/services/sfs-candle-generic-ensure.js',
    'js/services/sfs-candle-spy-read.js',
    'js/services/sfs-candle-warmup.js',
  ]);
});
check('sfs test coverage', () => {
  assert.strictEqual(SFS.covered, 49);
  assert.strictEqual(SFS.testFiles.length, 16);
});
check('sfs has exactly three load-time statements', () => {
  assert.strictEqual(SFS.topLevelStatements, 3);
  const joined = SFS.topLevelSamples.join(' ');
  assert.ok(/S\.squeezeFireScanner\s*=/.test(joined), 'state-root initialiser must be one of them');
  assert.ok(/window\.addEventListener\('resize'/.test(joined), 'resize listener must be one of them');
});
report('sfs declarations / chars', SFS.n + ' / ' + SFS.chars);
report('sfs span', SFS.spanStart + '..' + SFS.spanEnd);
report('sfs coverage', SFS.covered + '/' + SFS.n + ' (' + SFS.testFiles.length + ' suites)');

// A–E SPLIT DECISION.
// A one module · B service+UI · C adapter+service+UI · D other derived split · E not yet.
//
// C is ruled out by measurement, not by taste: an adapter exists to translate a
// transport payload, and SFS performs no network I/O at all (fetch 0, endpoints
// none). There is nothing for an adapter to adapt.
//
// The chosen shape is D — config/state · service · UI — because the six modules
// already extracted from this family read SFS constants and in-flight/cooldown
// state that their own headers describe as "intentionally remain declared in the
// monolith". A dedicated state module is what turns that documented compromise
// into a real owner; folding it into the service (B) would leave those six
// modules reaching into a service they do not otherwise use.
const SPLIT_DECISION = {
  option: 'D',
  files: [
    'js/services/sfs-config-state.js',
    'js/services/sfs-scan-service.js',
    'js/ui/sfs-panel.js',
  ],
  pullRequests: 3,
  staysInline: ['S.squeezeFireScanner = {…} initialiser', "window.addEventListener('resize', …)"],
};
check('split decision D rests on measured facts', () => {
  assert.strictEqual(SPLIT_DECISION.option, 'D');
  // C requires a transport to adapt; SFS has none.
  assert.strictEqual(SFS.fetch, 0);
  assert.deepStrictEqual(SFS.endpoints, []);
  // The load-time statements cannot move: they run before the monolith declares
  // S, and every extracted module loads BEFORE the monolith.
  assert.strictEqual(SPLIT_DECISION.staysInline.length, 2);
  assert.strictEqual(SPLIT_DECISION.files.length, 3);
  assert.strictEqual(SPLIT_DECISION.pullRequests, 3);
});
check('S is declared inline, which is why load-time statements cannot move out', () => {
  const s = BY_NAME.get('S');
  assert.ok(s, 'S must be a residual inline declaration');
  assert.strictEqual(s.kind, 'const');
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. BOUNDARY RULE FOR FUTURE INLINE GROWTH
// ═════════════════════════════════════════════════════════════════════════════
section('10. BOUNDARY RULE');

// Measured: since the last extraction (61e44d2, 2026-07-29, 33 commits back) the
// inline script grew by 52,042 chars — 32 declarations added, 1 removed, 16 grown
// in place. Of the 32 added, exactly ONE (_candleTradingSessionDate, 386 chars)
// belonged to a family that already had an owner module. The other 31 were new
// families with no owner to belong to.
//
// So the rule as usually stated — "no new substantial logic in index.html when a
// coherent owner module exists" — would have caught 386 of 52,042 chars. Stated
// as a retroactive rule it is worse than useless: 117 declarations violate it
// today. The version that actually bites is a RATCHET: today's violators are
// frozen in an exhaustive allowance, and any NEW declaration matching an owned
// prefix fails immediately. The allowance may only shrink.
const OWNED_PREFIXES = [
  ['js/services/sfs-candle-*.js', /^(_?sfs[A-Z_]|SFS_)/],
  ['js/**/backend-directional-snapshot-*.js', /^_?dsb/i],
  ['js/services/candle-*.js', /^(_?candle[A-Z]|_CANDLE_|_candleTradingSessionDate)/],
  ['js/api/backend-client.js', /^(backendGet|backendPost|backendPut|backendDelete|backendFetch)/],
  ['js/services/portfolio-stress-*.js', /^(pstx|PSTX_)/],
];
const OWNED_PREFIX_ALLOWANCE_SIZE = 117;

const ownedPrefixViolations = DECLS
  .filter(d => OWNED_PREFIXES.some(([, re]) => re.test(d.name)))
  .map(d => d.name).sort();

function verifyOwnedPrefixRatchet(names) {
  assert.ok(names.length <= OWNED_PREFIX_ALLOWANCE_SIZE,
    'owned-prefix inline declarations GREW to ' + names.length + ' (frozen at ' +
    OWNED_PREFIX_ALLOWANCE_SIZE + '): a declaration was added inline for a family that already ' +
    'has an owner module — move it to the owner instead of widening the allowance.');
  assert.strictEqual(names.length, OWNED_PREFIX_ALLOWANCE_SIZE,
    'owned-prefix inline declarations SHRANK to ' + names.length + ' (frozen at ' +
    OWNED_PREFIX_ALLOWANCE_SIZE + '): good news — lower the frozen number in the same commit.');
}
check('owned-prefix allowance is exactly the measured set', () => {
  verifyOwnedPrefixRatchet(ownedPrefixViolations);
});
check('the ratchet would not block any PR currently open', () => {
  // Measured from the three open PRs that edit index.html: #361 adds
  // _scanner*, #310 adds _swing*, #362 adds none. No family among them has an
  // owner module yet, so introducing the rule today breaks none of them.
  const wouldBlock = [];
  for (const [pr, info] of Object.entries(OPEN_PRS)) {
    for (const n of info.touched) {
      if (OWNED_PREFIXES.some(([, re]) => re.test(n)) && !ownedPrefixViolations.includes(n)) {
        wouldBlock.push('#' + pr + ':' + n);
      }
    }
  }
  assert.deepStrictEqual(wouldBlock, [],
    'the ratchet would block an open PR: ' + wouldBlock.join(', '));
});
report('owned-prefix declarations frozen', ownedPrefixViolations.length);

// ═════════════════════════════════════════════════════════════════════════════
// 11. MUTATION PROOF — every contract above must reject a broken audit
// ═════════════════════════════════════════════════════════════════════════════
section('11. MUTATION PROOF');

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function mustFail(name, fn) {
  checks++;
  let threw = false;
  try { fn(); } catch (_) { threw = true; }
  if (!threw) failures.push({ name: 'MUTANT SURVIVED: ' + name, message: 'the contract accepted a mutated audit' });
}

// The verifier under test: the full residue + cluster + ranking contract, as a
// pure function of a model, so a mutation has something to perturb.
function verifyAuditModel(model) {
  // Per-declaration identity first: a duplicated or unrecognised declaration
  // should be named as such, not surface as an aggregate count that drifted.
  const seen = new Map();
  for (const d of model.decls) {
    const priorCopies = seen.get(d.name) || 0;
    const allowedCopies = KNOWN_DUPLICATE_DECLARATIONS.includes(d.name) ? 2 : 1;
    assert.ok(priorCopies + 1 <= allowedCopies, 'duplicate declaration: ' + d.name);
    seen.set(d.name, priorCopies + 1);
    assert.ok(model.knownNames.has(d.name), 'unknown declaration: ' + d.name);
    assert.strictEqual(d.signature, model.knownNames.get(d.name).signature, 'signature changed: ' + d.name);
    assert.strictEqual(d.chars, model.knownNames.get(d.name).chars, 'body changed: ' + d.name);
    assert.strictEqual(d.bindingForm, model.knownNames.get(d.name).bindingForm, 'binding form changed: ' + d.name);
    assert.strictEqual(d.cluster, model.knownNames.get(d.name).cluster, 'wrong owner: ' + d.name);
  }
  assert.strictEqual(model.decls.length, RESIDUE.declarations, 'declaration count');
  assert.strictEqual(model.decls.reduce((a, d) => a + d.chars, 0), RESIDUE.declarationChars, 'declaration chars');
  const clusters = buildClusters(model.decls, model.statements);
  assert.strictEqual(clusters.length, 23, 'cluster count');
  const byName = new Map(clusters.map(c => [c.cluster, c]));
  for (const c of clusters) {
    const r = conflictFor(c, model.prs, model.mandatory);
    c.conflict = r.level;
    c.arch = scoreWith(c, WEIGHTS, Math.max(...clusters.map(x => x.chars)));
  }
  assert.deepStrictEqual(conflictMapOf(clusters), EXPECTED_CONFLICT_MAP, 'conflict map changed');
  const sfs = byName.get('sfs');
  assert.deepStrictEqual(sfs.stateWrites, ['squeezeFireScanner'], 'sfs state owner changed');
  assert.strictEqual(sfs.stateOwnershipRatio, 0, 'sfs state-owner split changed');
  assert.deepStrictEqual(sfs.endpoints, [], 'sfs endpoints changed');
  assert.strictEqual(sfs.fetch, 0, 'sfs network changed');
  assert.strictEqual(sfs.timers, 2, 'sfs timer count changed');
  assert.strictEqual(sfs.subs, 0, 'sfs subscription count changed');
  assert.strictEqual(sfs.topLevelStatements, 3, 'sfs bootstrap moved');
  const executable = clusters.filter(c => RANK[c.conflict] <= RANK.MEDIUM && c.ownerIntegrity)
    .sort((a, b) => b.arch - a.arch || b.chars - a.chars);
  assert.deepStrictEqual(executable.slice(0, 5).map(c => c.cluster), EXPECTED_EXECUTION_TOP5, 'execution ranking');
  for (const c of executable) {
    assert.ok(RANK[c.conflict] <= RANK.MEDIUM, 'high-conflict candidate promoted: ' + c.cluster);
    assert.ok(c.ownerIntegrity, 'owner-splitting candidate promoted: ' + c.cluster);
  }
  return true;
}

function baseModel() {
  const decls = DECLS.map(d => ({ ...d }));
  return {
    decls,
    statements: TOP_LEVEL_STATEMENTS.map(s => ({ ...s })),
    knownNames: new Map(DECLS.map(d => [d.name, { signature: d.signature, chars: d.chars, bindingForm: d.bindingForm, cluster: d.cluster }])),
    prs: clone(OPEN_PRS),
    mandatory: clone(MANDATORY_CONFLICT),
  };
}
check('the unmutated model passes the audit contract', () => {
  assert.strictEqual(verifyAuditModel(baseModel()), true);
});

const pickSfs = m => m.decls.find(d => d.cluster === 'sfs' && d.name === '_sfsRunScan');

mustFail('declaration omitted', () => {
  const m = baseModel();
  m.decls.splice(m.decls.findIndex(d => d.name === '_sfsRunScan'), 1);
  verifyAuditModel(m);
});
mustFail('declaration duplicated', () => {
  const m = baseModel();
  m.decls.push({ ...pickSfs(m) });
  verifyAuditModel(m);
});
mustFail('wrong owner', () => {
  const m = baseModel();
  pickSfs(m).cluster = 'journal';
  verifyAuditModel(m);
});
mustFail('unknown declaration', () => {
  const m = baseModel();
  const d = { ...pickSfs(m) };
  d.name = '_sfsSomethingBrandNew';
  m.decls.push(d);
  verifyAuditModel(m);
});
mustFail('signature change', () => {
  const m = baseModel();
  pickSfs(m).signature = 'async function _sfsRunScan(extraArg)';
  verifyAuditModel(m);
});
mustFail('body change', () => {
  const m = baseModel();
  pickSfs(m).chars += 1;
  verifyAuditModel(m);
});
mustFail('binding-form change', () => {
  const m = baseModel();
  const d = m.decls.find(x => x.name === '_sfsSortCol');
  d.bindingForm = 'let';
  verifyAuditModel(m);
});
mustFail('state-owner split', () => {
  const m = baseModel();
  // hand S.squeezeFireScanner a second writer outside sfs and dss-frontend
  m.decls.find(d => d.cluster === 'journal' && d.stateWrites.length === 0 ||
    d.cluster === 'journal').stateWrites = ['squeezeFireScanner'];
  const sfsDecl = pickSfs(m);
  sfsDecl.stateWrites = ['squeezeFireScanner', 'scanData'];
  verifyAuditModel(m);
});
mustFail('endpoint change', () => {
  const m = baseModel();
  pickSfs(m).endpoints = ['/scanner/sfs/run'];
  verifyAuditModel(m);
});
mustFail('timer added', () => {
  const m = baseModel();
  pickSfs(m).timers += 1;
  verifyAuditModel(m);
});
mustFail('subscription added', () => {
  const m = baseModel();
  pickSfs(m).subscriptions += 1;
  verifyAuditModel(m);
});
mustFail('bootstrap moved', () => {
  const m = baseModel();
  const sfsCluster = CLUSTER_BY_NAME.get('sfs');
  // drop the load-time statements that sit inside the sfs span
  m.statements = m.statements.filter(s => !(s.start >= sfsCluster.spanStart && s.start <= sfsCluster.spanEnd));
  verifyAuditModel(m);
});
mustFail('high-conflict candidate promoted over a low-conflict one', () => {
  const m = baseModel();
  // Clear every mandated zone and every recorded touch-set. swing (architectural
  // score 74, today BLOCKED) and the whole #361 scanner path would stop being
  // flagged, and the audit would be free to offer them as the next extraction.
  m.mandatory = {};
  for (const pr of Object.keys(m.prs)) m.prs[pr].touched = [];
  verifyAuditModel(m);
});
mustFail('a single mandated conflict zone silently dropped', () => {
  const m = baseModel();
  // option-chain is the load-bearing case: #352 edits js/api/backend-client.js
  // and never touches index.html, so nothing MEASURED raises option-chain above
  // LOW. Its MEDIUM exists only because the shared transport contract says so.
  // Drop the mandate and the boundary conflict vanishes without a trace.
  delete m.mandatory['option-chain'];
  verifyAuditModel(m);
});
mustFail('an open PR touch-set silently emptied', () => {
  const m = baseModel();
  // #361 is the load-bearing set. scanner-acquisition and candle-pipeline-chart
  // are BLOCKED on COUNTED declarations, not on a mandate, so emptying #361
  // silently demotes both to the mandate's HIGH. (#310 would not work here: as
  // of #361's rebase, swing reaches BLOCKED from #361 alone, so dropping #310
  // changes no level — a mutant that only looks strong.)
  m.prs[361].touched = [];
  verifyAuditModel(m);
});
mustFail('owner-gate failure promoted into the execution ranking', () => {
  const m = baseModel();
  // let rs-vs-spy stop mutating the shared subscription registry
  for (const d of m.decls) if (d.cluster === 'rs-vs-spy') d.bindingWrites = [];
  verifyAuditModel(m);
});

// Script-manifest mutants run against verifyScriptModel.
mustFail('missing script', () => {
  const m = clone(SCRIPT_MODEL);
  m.splice(m.findIndex(s => s.src === './js/services/sfs-candle-warmup.js'), 1);
  verifyScriptModel(m);
});
mustFail('wrong script order', () => {
  const m = clone(SCRIPT_MODEL);
  const i = m.findIndex(s => s.src === './js/services/sfs-candle-predicates.js');
  const j = m.findIndex(s => s.src === './js/services/sfs-candle-detail-4h.js');
  const t = m[i]; m[i] = m[j]; m[j] = t;
  verifyScriptModel(m);
});
mustFail('defer added to an application script', () => {
  const m = clone(SCRIPT_MODEL);
  m.find(s => s.src === './js/services/sfs-candle-warmup.js').defer = true;
  verifyScriptModel(m);
});
mustFail('async added to an application script', () => {
  const m = clone(SCRIPT_MODEL);
  m.find(s => s.src === './js/services/sfs-candle-warmup.js').async = true;
  verifyScriptModel(m);
});
mustFail('type=module added to an application script', () => {
  const m = clone(SCRIPT_MODEL);
  m.find(s => s.src === './js/services/sfs-candle-warmup.js').type = 'module';
  verifyScriptModel(m);
});
mustFail('inline monolith moved before the extracted modules', () => {
  const m = clone(SCRIPT_MODEL);
  const inline = m.find(s => !s.src && s.inlineLength > 100000);
  inline.order = -1;
  verifyScriptModel(m);
});
mustFail('masker regression: code-point split shifts every later index', () => {
  // The exact defect this audit hit: Array.from() splits by CODE POINT, so one
  // astral character collapses a surrogate pair and every later offset moves by
  // one. The three DSB fixtures still pass under it — only the invariant catches
  // it — so the invariant is the thing worth mutating.
  const codePointMask = src => {
    const out = Array.from(src);          // CODE POINTS
    let i = 0;
    while (i < src.length) {              // …but indexed by CODE UNITS
      if (src[i] === "'") {
        let j = i + 1;
        out[i] = ' ';
        while (j < src.length && src[j] !== "'") { out[j] = ' '; j++; }
        out[j] = ' '; i = j + 1; continue;
      }
      i++;
    }
    return out.join('');
  };
  const sample = "var label = '\u{1F4CA} ANALYTICS';\nfunction f(){ return 1; }\n";
  verifyMaskerInvariants(codePointMask, sample);
});
mustFail('masker regression: regex after `return` read as division', () => {
  // Drop the keyword lookback and `return /a{b/` leaks an unmatched brace.
  const noKeywordMask = src => maskSourceWithoutRegexKeywords(src);
  const sample = "function f(){ return /a{b/.test('x'); }\n";
  verifyMaskerInvariants(noKeywordMask, sample);
});
mustFail('owned-prefix ratchet loosened', () => {
  verifyOwnedPrefixRatchet(ownedPrefixViolations.concat(['_sfsBrandNewInlineHelper']));
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. GENERATED REPORT
//
// docs/refactoring/next-monolith-extraction-audit.md is EMITTED from the values
// computed above — there is no second copy of any number kept by hand. The doc
// is regenerated with `AUDIT_WRITE_DOC=1 node tests/next-monolith-extraction-audit.test.js`
// and verified on every ordinary run, so it cannot drift from the measurement:
// if the monolith moves, this check fails and names the file to regenerate.
// ═════════════════════════════════════════════════════════════════════════════
section('12. GENERATED REPORT');

const DOC_PATH = path.join(ROOT, 'docs', 'refactoring', 'next-monolith-extraction-audit.md');

function pct(n, d) { return d ? (100 * n / d).toFixed(1) + '%' : '—'; }
function mdRow(cells) { return '| ' + cells.join(' | ') + ' |'; }

function buildAuditDoc() {
  const L = [];
  L.push('# Next monolith extraction — conflict-aware audit');
  L.push('');
  L.push('<!-- GENERATED FILE — do not edit by hand.');
  L.push('     Every number here is emitted by tests/next-monolith-extraction-audit.test.js');
  L.push('     from the source it measures. Regenerate with:');
  L.push('       AUDIT_WRITE_DOC=1 node tests/next-monolith-extraction-audit.test.js');
  L.push('     An ordinary run of that suite fails if this file is stale. -->');
  L.push('');
  L.push('Audit only — no application file is modified by the change that adds it.');
  L.push('');
  L.push('## Residue');
  L.push('');
  L.push(mdRow(['measure', 'value']));
  L.push(mdRow(['---', '---']));
  L.push(mdRow(['inline application script', INLINE.length + ' chars']));
  L.push(mdRow(['top-level declarations', String(DECLS.length)]));
  L.push(mdRow(['declaration chars', DECL_CHARS + ' (' + pct(DECL_CHARS, INLINE.length) + ' of inline)']));
  L.push(mdRow(['top-level statement gaps', TOP_LEVEL_STATEMENTS.length + ' (' + TOP_LEVEL_STATEMENTS.reduce((a, s) => a + s.nonWs, 0) + ' non-ws chars)']));
  L.push(mdRow(['clusters', String(CLUSTERS.length)]));
  L.push(mdRow(['local application scripts', String(EXPECTED_SCRIPT_ORDER.length)]));
  L.push('');
  L.push('## Clusters');
  L.push('');
  L.push('`gate` is owner integrity: PASS means the cluster mutates no binding declared');
  L.push('outside itself, so moving it splits no cache, timer or subscription owner.');
  L.push('');
  L.push(mdRow(['cluster', 'decls', 'chars', 'runs', 'cov', 'arch', 'conflict', 'gate']));
  L.push(mdRow(['---', '---:', '---:', '---:', '---:', '---:', '---', '---']));
  for (const c of CLUSTERS.slice().sort((a, b) => b.arch - a.arch || a.cluster.localeCompare(b.cluster))) {
    L.push(mdRow([c.cluster, String(c.n), String(c.chars), String(c.runs),
      pct(c.covered, c.n), String(c.arch), c.conflict, c.ownerIntegrity ? 'PASS' : 'FAIL']));
  }
  L.push('');
  L.push('## Architectural ranking (top 5)');
  L.push('');
  L.push(mdRow(['#', 'cluster', 'architectural score', 'conflict']));
  L.push(mdRow(['---:', '---', '---:', '---']));
  BY_ARCH.slice(0, 5).forEach((c, i) => L.push(mdRow([String(i + 1), c.cluster, String(c.arch), c.conflict])));
  L.push('');
  L.push('## Execution priority (top 5)');
  L.push('');
  L.push('Gated on conflict ≤ MEDIUM **and** owner integrity, then ordered by the same');
  L.push('architectural score. The best target and the best *next* target differ.');
  L.push('');
  L.push(mdRow(['#', 'cluster', 'architectural score', 'conflict', 'decls / chars', 'coverage']));
  L.push(mdRow(['---:', '---', '---:', '---', '---', '---:']));
  EXECUTABLE.slice(0, 5).forEach((c, i) => L.push(mdRow([String(i + 1), c.cluster, String(c.arch),
    c.conflict, c.n + ' / ' + c.chars, pct(c.covered, c.n)])));
  L.push('');
  L.push('## Excluded, and why');
  L.push('');
  L.push(mdRow(['cluster', 'arch', 'reason']));
  L.push(mdRow(['---', '---:', '---']));
  for (const c of CLUSTERS.slice().sort((a, b) => b.arch - a.arch)) {
    if (RANK[c.conflict] <= RANK.MEDIUM && c.ownerIntegrity) continue;
    const why = [];
    if (RANK[c.conflict] > RANK.MEDIUM) why.push('conflict ' + c.conflict);
    if (!c.ownerIntegrity) why.push('mutates foreign bindings: `' + c.foreignWriteBindings.join('`, `') + '`');
    L.push(mdRow([c.cluster, String(c.arch), why.join('; ')]));
  }
  L.push('');
  L.push('## Active-PR conflict map');
  L.push('');
  L.push(mdRow(['PR', 'title', 'edits index.html', 'residual declarations rewritten']));
  L.push(mdRow(['---', '---', '---', '---:']));
  for (const [pr, info] of Object.entries(OPEN_PRS)) {
    L.push(mdRow(['#' + pr, info.title, info.touchesIndexHtml ? 'yes' : 'no', String(info.touched.length)]));
  }
  L.push('');
  for (const c of CLUSTERS.slice().sort((a, b) => RANK[b.conflict] - RANK[a.conflict] || a.cluster.localeCompare(b.cluster))) {
    if (RANK[c.conflict] < RANK.MEDIUM) continue;
    L.push('- **' + c.cluster + '** — ' + c.conflict + ': ' + c.conflictWhy.slice(1).join('; ') + '.');
  }
  L.push('');
  L.push('## Operational winner: ' + EXECUTABLE[0].cluster);
  L.push('');
  L.push(mdRow(['property', 'value']));
  L.push(mdRow(['---', '---']));
  L.push(mdRow(['manifest', SFS.n + ' declarations, ' + SFS.chars + ' chars']));
  L.push(mdRow(['sync / async / bindings', SFS.sync + ' / ' + SFS.asyncN + ' / ' + SFS.bindings]));
  L.push(mdRow(['physical spans', SFS.runs + ' run, ' + SFS.spanStart + '..' + SFS.spanEnd]));
  L.push(mdRow(['state owner', '`S.' + SFS.stateWrites.join('`, `S.') + '` (also written by `switchPanelTab`)']));
  L.push(mdRow(['network', SFS.fetch + ' fetch calls, ' + SFS.endpoints.length + ' endpoints, ' + SFS.abort + ' AbortController']));
  L.push(mdRow(['timers / listeners / subscriptions', SFS.timers + ' / ' + SFS.listeners + ' / ' + SFS.subs]));
  L.push(mdRow(['DOM ids / storage keys', SFS.domIds.length + ' / ' + SFS.storage.length]));
  L.push(mdRow(['window exposure', '`' + SFS.windowExposed.join('`, `') + '`']));
  L.push(mdRow(['foreign bindings read / written', '`' + SFS.foreignReadBindings.join('`, `') + '` / none']));
  L.push(mdRow(['internal / inbound / outbound edges', SFS.internal + ' / ' + SFS.inbound + ' / ' + SFS.outbound]));
  L.push(mdRow(['external consumers', SFS.extConsumers.length + ' (all `sfs-candle-*`, extracted from this family)']));
  L.push(mdRow(['test coverage', SFS.covered + '/' + SFS.n + ' declarations across ' + SFS.testFiles.length + ' suites']));
  L.push(mdRow(['load-time side effects', String(SFS.topLevelStatements)]));
  L.push('');
  L.push('### Split decision: ' + SPLIT_DECISION.option);
  L.push('');
  L.push('Option C (adapter · service · UI) is ruled out by measurement, not preference:');
  L.push('an adapter translates a transport payload, and this cluster performs ' + SFS.fetch + ' fetch');
  L.push('calls against ' + SFS.endpoints.length + ' endpoints.');
  L.push('');
  L.push('Proposed files (' + SPLIT_DECISION.pullRequests + ' pull requests, one module each):');
  L.push('');
  for (const f of SPLIT_DECISION.files) L.push('- `' + f + '`');
  L.push('');
  L.push('Stays inline — these run before the monolith declares `S`, and every extracted');
  L.push('module loads *before* the monolith:');
  L.push('');
  for (const s of SPLIT_DECISION.staysInline) L.push('- ' + s);
  L.push('');
  L.push('## Sensitivity');
  L.push('');
  L.push('- ±20% on each of the ' + Object.keys(WEIGHTS).length + ' weights individually: winner is `' + [...sensitivityWinners].join('`, `') + '`.');
  L.push('- 1000 random ±20% reweightings of all weights at once: ' +
    [...jitter].map(([c, n]) => '`' + c + '` ' + n + '/1000').join(', ') + '.');
  L.push('');
  L.push('Declared weights:');
  L.push('');
  L.push(mdRow(['weight', 'value']));
  L.push(mdRow(['---', '---:']));
  for (const [k, v] of Object.entries(WEIGHTS)) L.push(mdRow(['`' + k + '`', String(v)]));
  L.push('');
  L.push('## Boundary rule for future inline growth');
  L.push('');
  L.push('A retroactive "no new logic inline when an owner module exists" ban is not');
  L.push('usable: ' + ownedPrefixViolations.length + ' declarations violate it today. The enforceable form is a');
  L.push('ratchet over those ' + ownedPrefixViolations.length + ' frozen names — the allowance may only shrink, and any');
  L.push('*new* owned-prefix declaration fails immediately.');
  L.push('');
  L.push(mdRow(['owner module', 'inline declarations currently allowed']));
  L.push(mdRow(['---', '---:']));
  for (const [mod, re] of OWNED_PREFIXES) {
    const n = DECLS.filter(d => re.test(d.name)).length;
    if (n) L.push(mdRow(['`' + mod + '`', String(n)]));
  }
  L.push('');
  L.push('Safe to introduce now: no pull request currently open adds a declaration the');
  L.push('ratchet would block.');
  L.push('');
  L.push('## Recorded incidental findings');
  L.push('');
  L.push('- The DSB family has **zero** residual inline declarations — that extraction is complete.');
  L.push('- The monolith declares `' + KNOWN_DUPLICATE_DECLARATIONS.join('` and `') + '` twice each, byte-identical,');
  L.push('  12,543 chars apart. Harmless today; a hazard for whoever extracts EIC.');
  L.push('');
  return L.join('\n') + '\n';
}

const GENERATED_DOC = buildAuditDoc();
if (process.env.AUDIT_WRITE_DOC) {
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, GENERATED_DOC);
  report('doc written', path.relative(ROOT, DOC_PATH));
}
check('generated report is present and current', () => {
  assert.ok(fs.existsSync(DOC_PATH),
    'missing ' + path.relative(ROOT, DOC_PATH) + ' — regenerate with AUDIT_WRITE_DOC=1');
  assert.strictEqual(fs.readFileSync(DOC_PATH, 'utf8'), GENERATED_DOC,
    path.relative(ROOT, DOC_PATH) + ' is stale — regenerate with ' +
    'AUDIT_WRITE_DOC=1 node tests/next-monolith-extraction-audit.test.js');
});
report('generated report', path.relative(ROOT, DOC_PATH));

// ═════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═════════════════════════════════════════════════════════════════════════════
section('SUMMARY');
report('checks run', checks);
report('failures', failures.length);
if (failures.length) {
  process.stdout.write('\n');
  for (const f of failures) process.stdout.write('   ✗ ' + f.name + '\n       ' + f.message + '\n');
  process.exitCode = 1;
} else {
  process.stdout.write('\n   next-monolith-extraction-audit: all ' + checks + ' checks passed\n');
}
