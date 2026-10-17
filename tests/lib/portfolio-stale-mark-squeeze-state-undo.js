'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO STALE MARK + SQUEEZE STATE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #510-era document and
// js/portfolio/portfolio-stale-mark-squeeze-state.js, it returns the merged
// index.html at that commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [852740,854440) in document coordinates, holding TWO top-level owners, both
// synchronous and pure: `_backendCacheStaleMark`, which reads the stale quote of a
// backend option cache entry — a stale mark first, then the mid of a stale bid and
// ask, then a single stale side, and null when none is a positive number — and
// `_squeezeToState`, which normalises the many shapes a squeeze flag arrives in into
// the three answers the portfolio row renders: ACTIVE, OFF and null.
//
// 33 lines: 21 of code, 11 of comment and 1 blank, and ZERO top-level statements.
// Function declarations are the whole of its top-level shape, so it ships no mutable
// binding of its own. It is NOT pure ASCII: an em dash and four arrows, all in
// comments, make its UTF-8 length 1,709 against 1,699 UTF-16 units, so the byte-count
// pin and the character-count pin are two pins that differ.
//
// THE CUT OPENS ON DOCUMENTATION, NOT A BANNER. The first line is the first of five
// comment lines documenting the stale-mark function; the declaration follows them,
// and the second function brings its own six-line block, which sits inside the body.
// The blank line above the first block stays in the monolith. The seam admits eight
// openings and the cut takes the one on the first documentation line, so after the move
// the closing brace of `computeEarningsDte`, one blank line and the documentation of
// `_technicalTfSqueezeState` are adjacent: the join the monolith held once at the end of
// the block, now at the place the cut was made.
//
// TWO CONSUMERS, NO DEPENDENCY. Seven calls reach in: `_technicalTfSqueezeState`, the
// next declaration after the cut, calls the squeeze adapter once, and the async
// `refreshPositionsLive` calls it five times and the stale-mark function once. The body
// reads no monolith name, no host global and no shared state, writes nothing and
// deletes nothing, so the module loads in a bare VM, calling either function needs
// nothing from the monolith, and its tag position is not load-bearing for it. No
// inbound write, no outbound write, no sibling module, no static markup, no generated
// markup.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [852740,854439)   1,699 units, ending `}\n`
//   separator  [854439,854440)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-stale-mark-squeeze-state.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/scanner-dss-1d-chart.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #509 commit this layer was measured against.
const BASE_CHARS = 1427425;
const BASE_UTF8 = 1455908;
const BASE_LF = 24661;
const BASE_SHA256 = '6cc34d058d7688d64606e0f8f6f71a3d6f49bed623650c2ece38864a6fdb8548';
const BASE_LOCAL_SCRIPTS = 101;

// Pinned extracted document — INDEX_AFTER is the figure audit #510 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1425802;
const EXTRACTED_UTF8 = 1454275;
const EXTRACTED_LF = 24628;
const EXTRACTED_SHA256 = 'a273e56af564eebce397b378ef5c4f559e1f3f05ef36672192cdb96593298f06';
const EXTRACTED_LOCAL_SCRIPTS = 102;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 852740;
const RAW_END = 854440;
const RAW_CHARS = 1700;
const RAW_SHA256 = '08b6fa77c336a4d8ac783b6ccc7c50af0f1499ae8f756a1676095bc1c5d12065';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1699;
const MODULE_UTF8 = 1709;
const MODULE_LF = 33;
const MODULE_SHA256 = '1f2ca084c40252c94ac7080beb044695399b582d5bb10b8698e90024c9de2fe2';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 854439;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 736,663 units earlier in the document, so once it is removed every byte
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

function undoPortfolioStaleMarkSqueezeState(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,700 units, not 1,699. Its UTF-8
  //    length (1,709) differs from its UTF-16 length by the em dash and four
  //    arrows in comments; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the scanner DSS 1D chart tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller. The module needs nothing from the monolith at load.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_STALE_MARK_SQUEEZE_STATE_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioStaleMarkSqueezeState,
};
