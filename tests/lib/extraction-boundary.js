'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTION SEAMS — the mechanical half of choosing a region, as code.
//
// WHY THIS FILE EXISTS. The boundary rule lived in a comment, and a comment is
// not executed, so nothing contradicted it when it drifted. It drifted twice,
// and the second time it was wrong about the very case it had just discovered:
//
//   1. "A region ends after its LAST TOP-LEVEL DECLARATION." Measured over the
//      sixteen shipped layers, that is false for one:
//      `js/services/journal-backend-write-through.js` ends on 4,878 units of
//      trailing top-level code — an IIFE, which is not a declaration. Fifteen of
//      sixteen matched, which is exactly how a wrong rule survives.
//
//   2. Audit #422's replacement — walk forward from the last declaration
//      absorbing statement lines — stops at the first blank line, and that IIFE
//      contains blank lines. It cut the same 4,878 units short.
//
// THE CORRECTION THAT MATTERS IS NOT A THIRD RULE. Measured against the five
// boundaries the undo helpers still record, NO mechanical rule over banners or
// headers reproduces them:
//
//     tt-reconnect   is followed immediately by `var _mcxResizeTimer` and a
//                    resize listener — another feature's code, no header between
//     apex-post-auth is followed immediately by `async function doReconnectTT`
//                    — likewise, no header between
//     trade-detail   SPANS a `// ── ` section banner, so the screening banner
//                    cannot be the boundary either
//
// So WHERE a region ends is a judgement about which code belongs to the feature.
// That judgement is the part a person makes and an audit publishes. What IS
// mechanical is the SNAP once the last construct is chosen, and the four seam
// invariants that every recorded boundary satisfies. Those are here, executable,
// and verified in tests/extraction-boundary-rule-contract.test.js against the
// five reconstructed historical boundaries and the sixteen shipped modules.
//
// Use `snapBodyEnd` to land on the seam, and `assertSeam` to refuse a boundary
// that violates any invariant. Neither picks the region for you.
// ─────────────────────────────────────────────────────────────────────────────

// True when a line contributes no code: blank (whitespace only), a `//` line
// comment, or a line opening or continuing a block comment. Deliberately
// conservative — a line that merely ENDS with a trailing comment is code.
function isBlankOrComment(line) {
  const t = line.trim();
  return t === '' || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
}

// Given a region that starts at `at` and cannot extend past `limit`, return the
// offset just past the newline of the LAST LINE CONTAINING CODE. This is the
// snap, not the choice: `limit` must already be a point the caller knows the
// region does not reach past. Returns null when the window holds no code.
function snapBodyEnd(source, at, limit) {
  if (typeof source !== 'string') throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  if (!(at >= 0 && limit <= source.length && at < limit)) {
    throw new Error('EXTRACTION_SEAM_BAD_RANGE');
  }
  let end = limit;
  while (end > at) {
    // `lastIndexOf` clamps a negative fromIndex to 0, so once the window shrinks
    // to a single unit it would keep returning the same line and the walk would
    // never terminate. Guard the negative case explicitly.
    const nl = end >= 2 ? source.lastIndexOf('\n', end - 2) : -1;
    const start = Math.max(nl + 1, at);
    if (start >= end) break;
    if (!isBlankOrComment(source.slice(start, end))) return end;
    if (start === at) break;
    end = start;
  }
  return null;
}

// The four invariants every recorded boundary in this programme satisfies.
// Fail-closed: throws naming the first one violated, so a Phase 2 that has
// mis-set an offset by one stops here rather than shipping a skewed module.
function assertSeam(source, at, bodyEnd) {
  if (typeof source !== 'string') throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  if (!(at >= 0 && bodyEnd > at && bodyEnd < source.length)) {
    throw new Error('EXTRACTION_SEAM_BAD_RANGE');
  }
  if (!(at === 0 || source[at - 1] === '\n')) {
    throw new Error('EXTRACTION_SEAM_NOT_LINE_START');
  }
  if (source[bodyEnd - 1] !== '\n') {
    throw new Error('EXTRACTION_SEAM_BODY_NOT_LINE_TERMINATED');
  }
  const lineStart = source.lastIndexOf('\n', bodyEnd - 2) + 1;
  if (isBlankOrComment(source.slice(Math.max(lineStart, at), bodyEnd))) {
    throw new Error('EXTRACTION_SEAM_BODY_ENDS_ON_NON_CODE');
  }
  if (source[bodyEnd] !== '\n') {
    throw new Error('EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR');
  }
  return bodyEnd + 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// THE TWO SCREENING RULES, also as code rather than prose.
//
// Audit #424 found both of these wrong in the same cycle, and both are in this
// repository's own list of ways ad-hoc checkers fail. They are here so the next
// screen cannot get them wrong again by reading a comment.
// ─────────────────────────────────────────────────────────────────────────────

// WHERE THE FEATURE BOUNDARIES ARE. Neither indentation rule alone works:
//
//   column-0 only      misses 83 banners that sit at four spaces
//   any indentation    admits 77 that sit INSIDE function bodies, where they
//                      delimit nothing extractable — one "16,714-unit region"
//                      found that way held 548 units of top-level declarations
//                      and the rest was a function body
//
// A banner marks a feature boundary only when it is at TOP LEVEL. Pass the
// monolith and the function-body ranges the caller already computed.
function topLevelBanners(src, functionBodies) {
  if (typeof src !== 'string') throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  const bodies = functionBodies || [];
  const inFn = (i) => bodies.some((r) => i >= r.start && i <= r.end);
  const marks = [];
  for (const re of [/^[ \t]*\/\/ ═══/gm, /^[ \t]*\/\/ ── /gm]) {
    let m;
    while ((m = re.exec(src))) if (!inFn(m.index)) marks.push(m.index);
  }
  return marks.sort((a, b) => a - b);
}

// WHAT COUNTS AS A BINDING A REGION MIGHT WRITE. The outbound coupling check
// scanned `var` declarations only. `S` — the application state object the whole
// monolith hangs off — is a `const`, so the check never tested it, and a region
// performing `S.swing = { … }` at load scored a PERFECT ZERO outbound. Scanning
// var, const and let took that region from 0 to 74.
//
// "Mutable by keyword" was never the question. The question is whether the
// region assigns through a name it does not own, and `const` bindings are
// assigned through constantly.
const BINDING_FORMS = ['var', 'const', 'let'];
function bindingNames(declarations) {
  if (!Array.isArray(declarations)) throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  return declarations.filter((d) => BINDING_FORMS.indexOf(d.form) >= 0).map((d) => d.name);
}

// ─────────────────────────────────────────────────────────────────────────────
// CAN THIS REGION BE A MODULE AT ALL? The question that disqualified the best
// candidate this programme ever measured.
//
// Module tags load BEFORE the inline monolith. So any name a region reads at
// EVALUATION time must already exist when the module runs — and names declared
// inside the monolith do not. Audit #424's swing candidate scored four external
// edges over 242,294 units and still could not be taken, because it performs
// `S.swing = { … }` at top level and `S` is a `const` declared in the monolith.
// The extracted module would have thrown at load.
//
// `evaluationTimeReads` returns the names a region touches OUTSIDE every one of
// its own top-level declarations. An extractable region returns only names that
// already exist when a module loads. It is the caller's job to decide which
// those are; this returns the list to check.
function evaluationTimeReads(src, declarations, maskFn) {
  if (typeof src !== 'string') throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  if (!Array.isArray(declarations)) throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  if (typeof maskFn !== 'function') throw new Error('EXTRACTION_SEAM_BAD_SOURCE');
  const owned = new Set(declarations.map((d) => d.name));
  const spans = declarations.map((d) => [d.start, d.end]);
  const outside = (i) => !spans.some(([a, b]) => i >= a && i <= b);
  const masked = maskFn(src);
  const found = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(masked))) {
    const i = m.index + m[1].length;
    if (!outside(i) || owned.has(m[2])) continue;
    found.add(m[2]);
  }
  return Array.from(found).sort();
}

module.exports = {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, BINDING_FORMS, bindingNames,
  evaluationTimeReads,
};
