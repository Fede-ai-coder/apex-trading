'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO BETA MISSING-REASON — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/portfolio/portfolio-beta-missing-reason.js,
// it returns the index.html that merged with #517 and that #518 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [874565,876256) in document coordinates, holding TWO top-level owners, synchronous:
// `_betaMissingReasonLabel`, which turns the terse reason `computeRowBetaWeightedDelta` gives
// for a position whose beta-weighted delta cannot be computed into the stable label the debug
// views show (naming Tastytrade when it is the live source), and
// `_aggregateBetaWtdMissingReason`, which returns the dominant such reason across a set of rows,
// or null when any row produced a number. Both read only their arguments and write nothing.
//
// 34 lines: 23 of code, 10 of comment and 1 blank, ZERO top-level statements. Two function
// declarations are the whole of its top-level shape, so it ships no mutable binding of its own.
// It is NOT pure ASCII: four em dashes, three beta signs and three delta signs, all in
// comments, make its UTF-8 length 1,704 against 1,690 UTF-16 units, so the byte-count pin and
// the character-count pin are two pins that differ.
//
// THE CUT OPENS ON ITS DOCUMENTATION. The first line is the first of four comment lines that
// describe the first function, `// _betaMissingReasonLabel — maps computeRowBetaWeightedDelta's
// terse missingReason`, and the declaration follows the fourth of them directly. The blank line
// above them stays in the monolith. After the move the closing brace of the owner that preceded
// the block, one blank line and the comment block of the function that followed it are adjacent:
// the join the monolith held once at the end of the block, now at the place the cut was made.
//
// THREE CONSUMERS, NO DEPENDENCY. `refreshPortfolioBetas` calls the functions at two sites,
// `refreshPositionsLive` at one, and an anonymous function assigned to
// `window.apexDebugPortfolioGreeksRefresh` inside a top-level statement at the fourth. The
// block reads no name the monolith declares, writes nothing and deletes nothing, and reaches
// the host through none of `window`, `document`, storage, `console`, timers or fetch.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as
// the layer before it did when it shipped. All four references are inside function bodies and
// the block itself runs nothing at load, so the position is not shown to be load-bearing for
// this layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [874565,876255)   1,690 units, ending `}\n`
//   separator  [876255,876256)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-beta-missing-reason.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-backend-squeeze-extract.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #517 commit this layer was measured against.
const BASE_CHARS = 1418965;
const BASE_UTF8 = 1447350;
const BASE_LF = 24502;
const BASE_SHA256 = '886a1f7841943d84a486a469478329a912b5b1d9eff5efe760d8ca72249f5e25';
const BASE_LOCAL_SCRIPTS = 105;

// Pinned extracted document — INDEX_AFTER is the figure audit #518 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1417346;
const EXTRACTED_UTF8 = 1445717;
const EXTRACTED_LF = 24468;
const EXTRACTED_SHA256 = '4b05416012f0250f389feb0d08fa3bf023a0092d9d0dd58e2a7153eff1594414';
const EXTRACTED_LOCAL_SCRIPTS = 106;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 874565;
const RAW_END = 876256;
const RAW_CHARS = 1691;
const RAW_SHA256 = '3bcc8f8c547f784157b7ed39e7474f94a396bbdbaf34c9ffb4ea296d8c44d193';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1690;
const MODULE_UTF8 = 1704;
const MODULE_LF = 34;
const MODULE_SHA256 = '4263893a968a5a28f3c3d48c2f3c4a58de1990fa372118ce0866b34ff910bfc7';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 876255;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 758,203 units earlier in the document, so once it is removed every byte
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

function undoPortfolioBetaMissingReason(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,691 units, not 1,690. Its UTF-8
  //    length (1,704) differs from its UTF-16 length by the fourteen extra bytes of its
  //    non-ASCII comment characters; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the backend squeeze extract tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_BETA_MISSING_REASON_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioBetaMissingReason,
};
