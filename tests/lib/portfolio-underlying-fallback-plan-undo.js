'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO UNDERLYING FALLBACK PLAN — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #488-era document and
// js/portfolio/portfolio-underlying-fallback-plan.js, it returns the merged
// index.html at that commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1260869,1262559) in document coordinates, holding ONE top-level owner, a
// synchronous function: `_planPortfolioUnderlyingFallback` (706). It plans the
// underlying-price fallback for one portfolio refresh cycle: which tickers reuse
// a last-known price, which fall back to a candle fetch and which are deferred.
//
// 29 lines: 16 of code, 13 of comment, none blank, and ZERO top-level statements.
// One function declaration and one column-0 closer are the whole of its
// top-level shape, so this layer ships no mutable binding. It IS pure ASCII, so
// its UTF-8 length equals its UTF-16 length (1,689) and no byte-count swap can
// distinguish a tampered module from the real one; the digest does that work.
//
// THE CUT TAKES ITS DOCUMENTATION. The first 982 units are the thirteen comment
// lines directly above the declaration, which describe only this function. The
// boundary is a judgement and not something the seam decides: `assertSeam`
// accepts SIXTEEN line starts between the previous function's closing brace and
// the declaration — that brace, a blank line, each of the thirteen documentation
// lines, and the declaration — and the permanent contract measures them rather
// than citing them. Cutting at the declaration, the one opening the screen
// visits, would leave the documentation behind, fused to the next function's own
// with no blank line between them.
//
// ONE CONSUMER, NO DEPENDENCY. The references that reach in come from a single
// consumer, `refreshPositionsLive`, at one call site. The body names only
// language built-ins; it needs nothing from the monolith, so it loads in a bare
// VM and its tag position is not load-bearing for it. No inbound write, no
// property write, no outbound write, no sibling module, no static markup, no
// generated markup.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1260869,1262558)   1,689 units, ending `}\n`
//   separator  [1262558,1262559)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; WHICH older layers
// have no separator concept at all is recorded by the reconstruction bridge and
// deliberately not restated here.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a module
// that does not end on a line of code, a truncated or mutated module, an already
// unextracted document, a partially applied state, or foreign content anywhere
// all raise. There is no "best effort" path.
//
// REACHABILITY, stated at the level it is actually true. Every ERROR below
// except the closing BASE_IDENTITY is reachable by an ordinary mutant, and the
// permanent contract exercises each with a control asserting its EXACT message:
// BAD_INPUT, MODULE_IDENTITY, MODULE_SEPARATOR, TAG_IDENTITY, TAG_ADJACENCY,
// EXTRACTED_IDENTITY. BASE_IDENTITY is a DELIBERATE redundant final gate — once
// the module hash and the whole-document hash have both passed, the
// reconstruction is a pure function of two fixed byte strings.
//
// Individual CLAUSES are a weaker claim than individual errors, and the
// contract measures which are load-bearing by mutation rather than by reading.
// Two are not, and are kept because they name their failure where it happens —
// the treatment tests/lib/vega-monitor-undo.js and
// tests/lib/strategy-templates-undo.js already record:
//
//   - `count(html, ANCHOR_TAG + TAG) !== 1` — the tag-identity check above it
//     already fixes `count(html, TAG)` at exactly 1, so the pair cannot occur
//     twice; and when the tag is moved away from the anchor the pair occurs
//     ZERO times, which the longer `ANCHOR_TAG + TAG + INLINE_OPEN` check below
//     rejects with the SAME error. TAG_ADJACENCY stays reachable through that
//     second check, which is what the contract's control exercises.
//   - `moduleSource.endsWith('\n\n')` in the separator guard — `endsWith` tests
//     the final units, so a module that re-absorbed the separator ends `}\n\n`
//     and already fails the `}\n` clause beside it. Here it cannot fire at all:
//     the clauses are disjoint, since a string ending `}\n` does not end
//     `\n\n`.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
//
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/portfolio-underlying-fallback-plan.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-greeks-freshness.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #488 commit this layer was measured against.
const BASE_CHARS = 1449190;
const BASE_UTF8 = 1477737;
const BASE_LF = 25065;
const BASE_SHA256 = 'b1fe97880b7d9adbe88ef69c2fdce72fb492c4e619dcc80d0e40924b3f7cf846';
const BASE_LOCAL_SCRIPTS = 90;

// Pinned extracted document — INDEX_AFTER is the figure audit #488 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1447577;
const EXTRACTED_UTF8 = 1476124;
const EXTRACTED_LF = 25036;
const EXTRACTED_SHA256 = '8777670c86b5c860a3820af78e48278d58a40bf1ca276e86271c9abb8edbb40f';
const EXTRACTED_LOCAL_SCRIPTS = 91;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1260869;
const RAW_END = 1262559;
const RAW_CHARS = 1690;
const RAW_SHA256 = '4b17142d520637783b645d1c017864e8c68298b922c35b9f33380f278a69d1be';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1689;
const MODULE_UTF8 = 1689;
const MODULE_LF = 29;
const MODULE_SHA256 = '8ea1b93c32ee922538f2f45142ed41b66cd4b78b3aebfb7ac94a8fa7db35ca61';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1262558;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 1,145,540 units earlier in the document, so once it is removed every byte
// before the fragment is unchanged and the base offset applies directly.
const REINSERT_AT = RAW_AT;

function digest(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
function lineFeeds(source) { return count(source, '\n'); }
function isApplied(html) {
  return typeof html === 'string' && count(html, TAG) === 1;
}

function undoPortfolioUnderlyingFallbackPlan(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,690 units, not 1,689. This module IS
  //    pure ASCII, so its UTF-8 length equals its UTF-16 length; both are
  //    pinned all the same.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the greeks freshness owner
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller. The module needs nothing from the monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_EXTRACTED_IDENTITY');
  }

  // 5. Remove the tag and its LF.
  const tagAt = html.indexOf(TAG);
  const untagged = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);

  // 6. Re-insert body + separator at the tag-free offset the fragment came
  //    from. The separator lives here, in the reconstruction, and nowhere else.
  const rebuilt =
    untagged.slice(0, REINSERT_AT) +
    moduleSource + SEPARATOR +
    untagged.slice(REINSERT_AT);

  // 7. The final gate — deliberately redundant, as the header explains.
  if (rebuilt.length !== BASE_CHARS ||
      Buffer.byteLength(rebuilt, 'utf8') !== BASE_UTF8 ||
      lineFeeds(rebuilt) !== BASE_LF ||
      digest(rebuilt) !== BASE_SHA256) {
    throw new Error('PORTFOLIO_UNDERLYING_FALLBACK_PLAN_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG, INLINE_OPEN, SEPARATOR, SEPARATOR_AT,
  BASE_CHARS, BASE_UTF8, BASE_LF, BASE_SHA256, BASE_LOCAL_SCRIPTS,
  EXTRACTED_CHARS, EXTRACTED_UTF8, EXTRACTED_LF, EXTRACTED_SHA256, EXTRACTED_LOCAL_SCRIPTS,
  RAW_AT, RAW_END, RAW_CHARS, RAW_SHA256,
  MODULE_CHARS, MODULE_UTF8, MODULE_LF, MODULE_SHA256,
  REINSERT_AT,
  isApplied, undoPortfolioUnderlyingFallbackPlan,
};
