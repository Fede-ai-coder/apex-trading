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

module.exports = { isBlankOrComment, snapBodyEnd, assertSeam };
