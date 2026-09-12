'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MUTATION SPECS — the half of the third check that the ordinary suite can run.
//
// THE PROBLEM THIS SOLVES. Running a mutation pass costs minutes; asserting
// that one was WRITTEN costs milliseconds. The expensive half proves the pins
// are checked; the cheap half proves nobody quietly stopped writing mutants for
// new pins. Only the cheap half can live in a suite that runs on every push,
// and it happens to catch the realistic lapse — a cycle that adds six constants
// and mutates four of them — rather than the paranoid one.
//
// WHAT COUNTS AS A PIN. A top-level `const SCREAMING_NAME = …;` whose
// right-hand side contains no `(` and no `=>`. That admits numbers, strings,
// arrays, objects and aliases of other pins, and excludes `require(…)`,
// `path.resolve(…)`, arrow helpers and every other derived value — the things
// a mutation pass has no business perturbing. The rule is deliberately
// syntactic and dumb: a cleverer one would need its own contract, and this one
// is checked by fixtures in tests/mutation-coverage-contract.test.js, including
// a fixture where a derived value must NOT be reported as a pin.
//
// EXEMPTIONS ARE ALLOWED AND MUST BE ARGUED. Some pins genuinely cannot be
// mutated into a failure — a value the target only prints, or one whose two
// plausible mutations are both caught by a different pin's assertion. A spec
// may list such a name in `exempt`, but the value is a REASON string, and the
// coverage contract rejects an empty or missing one. An exemption is a claim
// on the record, not a way to make the count go green.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// Scan a source for top-level pinned constants. Returns [{ name, rhs, line }].
function scanPins(src) {
  const out = [];
  // The separator after `=` may be a NEWLINE, not only a space. A declaration
  // whose value starts on the following line —
  //
  //     const MONOLITH_DEPENDENCIES =
  //       ['S', 'debugLog', …];
  //
  // — is the same kind of pin, and requiring a space here silently dropped it,
  // exactly as the comment-apostrophe bug below did: an un-pinned constant is
  // absent from the coverage report, so no spec is ever asked to mutate it.
  // Eighteen declarations across eight files were invisible this way when #450
  // found it, two of them in the audit that found it.
  const re = /^const ([A-Z][A-Z0-9_]*) =[ \t\r\n]/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const valueAt = m.index + m[0].length;
    // Walk to the `;` that closes the declaration at bracket depth zero. A
    // multi-line array or object literal is one declaration, not several.
    let depth = 0, end = -1, inStr = null;
    for (let i = valueAt; i < src.length; i++) {
      const c = src[i];
      if (inStr) {
        if (c === '\\') { i++; continue; }
        if (c === inStr) inStr = null;
        continue;
      }
      // Skip line comments BEFORE tracking string state. An apostrophe in a
      // comment — "§9's", "#447's" — otherwise opens a string that runs to the
      // next quote in the data, and the declaration stops being recognised as a
      // pin at all. That is silent: an un-pinned constant is simply absent from
      // the coverage report, so no spec is asked to mutate it. It had already
      // happened to CHAIN in extraction-boundary-rule-contract, which has no
      // spec, so nothing surfaced it until #449 hit the same thing.
      if (c === '/' && src[i + 1] === '/') {
        const nl = src.indexOf('\n', i);
        if (nl < 0) break;
        i = nl; continue;
      }
      if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
      if (c === '[' || c === '{' || c === '(') depth++;
      else if (c === ']' || c === '}' || c === ')') depth--;
      else if (c === ';' && depth === 0) { end = i; break; }
    }
    if (end < 0) continue;
    const rhs = src.slice(valueAt, end);
    out.push({
      name: m[1],
      rhs,
      line: src.slice(0, m.index).split('\n').length,
      pinned: rhs.indexOf('(') < 0 && rhs.indexOf('=>') < 0,
    });
  }
  return out;
}

function pinNames(src) {
  return scanPins(src).filter((p) => p.pinned).map((p) => p.name);
}

// Which pins of `target` no mutant in `spec` touches, and which exemptions are
// unusable. A mutant covers a pin when its `find` text names it.
function coverage(spec, srcOverride) {
  const src = srcOverride != null
    ? srcOverride
    : fs.readFileSync(path.join(ROOT, spec.target), 'utf8');
  const pins = pinNames(src);
  const exempt = spec.exempt || {};
  const covered = new Set();
  for (const m of spec.mutants || []) {
    // A mutant that edits a line INSIDE a multi-line literal cannot name its
    // pin in the find text — `{ name: 'x', chars: 441 }` says nothing about
    // OWNERS_EXPECTED. Such a mutant declares what it covers instead, and the
    // coverage contract checks that every declared name is a real pin, so the
    // field cannot be used to wave a pin through.
    for (const declared of m.covers || []) covered.add(declared);
    for (const p of pins) {
      // Word-boundary match, so RAW_AT does not also cover RAW_AT_IN_CODE.
      if (new RegExp('\\b' + p + '\\b').test(m.find)) covered.add(p);
    }
  }
  const uncovered = pins.filter((p) => !covered.has(p) && !Object.hasOwn(exempt, p));
  const unargued = Object.keys(exempt)
    .filter((k) => typeof exempt[k] !== 'string' || exempt[k].trim().length < 12);
  const stale = Object.keys(exempt).filter((k) => pins.indexOf(k) < 0);
  // A `covers` entry naming something that is not a pin is a typo pretending to
  // be coverage, so it is reported rather than silently believed.
  const phantom = [];
  for (const m of spec.mutants || []) {
    for (const declared of m.covers || []) if (pins.indexOf(declared) < 0) phantom.push(m.id + ':' + declared);
  }
  return { pins, covered: Array.from(covered).sort(), uncovered, unargued, stale, phantom };
}

function loadSpecs(dir) {
  const abs = path.join(ROOT, dir || 'tests/mutation-specs');
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter((f) => /\.spec\.js$/.test(f))
    .sort()
    .map((f) => ({ file: path.join(dir || 'tests/mutation-specs', f), spec: require(path.join(abs, f)) }));
}

module.exports = { ROOT, scanPins, pinNames, coverage, loadSpecs };
