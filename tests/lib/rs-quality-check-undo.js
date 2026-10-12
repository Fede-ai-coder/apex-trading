'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// RS QUALITY CHECK — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #496-era document and js/services/rs-quality-check.js,
// it returns the merged index.html at that commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [399178,401166) in document coordinates, holding ONE top-level owner, a
// synchronous function: `_rsQualityCheck`, the hard quality gate the
// relative-strength scan puts a symbol's approved DXLink daily candles through.
// It fails a symbol with too few candles, a price or average volume under its
// floor, a quote spread wider than 0.6%, a jump of more than 20% in any of the
// last three sessions, a distance from the 20-session mean beyond 40% in the
// mode's direction, a 20- and 30-session mean that disagree with the mode, or an
// RSI outside the mode's band, and returns {pass:false} for each.
//
// 42 lines: 34 of code, EIGHT of comment, no blank, and ZERO top-level
// statements. One function declaration and its column-0 closer are the whole of
// its top-level shape, so this layer ships no mutable binding. It is NOT pure
// ASCII: it carries ONE non-ASCII character, an em dash of three bytes, so its
// UTF-8 length (1,989) is two units longer than its UTF-16 length (1,987) and
// the byte-count pin and the character-count pin disagree on purpose.
//
// THE CUT TAKES ITS DOCUMENTATION. The first 252 units are the three comment
// lines directly above the declaration. The boundary is a judgement and not
// something the seam decides: `assertSeam` accepts FIVE line starts between the
// previous function's closing brace and the declaration, and the permanent
// contract measures them rather than citing them. The documentation stands
// directly against that brace, so removing the cut leaves the brace directly
// against the banner of the next function with no blank line between them.
//
// ONE CONSUMER, ONE CALL BACK, ONE FOUNDATION REFERENCE. The reference that
// reaches in comes from a single consumer, `computeRsCandidates`, at one call
// site. The body calls `_rsAvgVol`, which stays in the monolith, and `smA`
// twice, which lives in js/utils/indicators.js. Both are reached when the
// function is CALLED, never when it loads, so the module loads in a bare VM and
// its tag position is not load-bearing for it. The body is wrapped in a `try`, so
// a call with either missing answers {pass:false} rather than throwing. No
// inbound write, no property write, no outbound write, no sibling module, no
// static markup, no generated markup.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [399178,401165)   1,987 units, ending `}\n`
//   separator  [401165,401166)   exactly one LF
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

const TAG = '<script src="./js/services/rs-quality-check.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/scanner-dxlink-prices.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #496 commit this layer was measured against.
const BASE_CHARS = 1441539;
const BASE_UTF8 = 1470064;
const BASE_LF = 24909;
const BASE_SHA256 = '6340bcbd6507c40c113fe19dd2b078196d8770099c853273e65020a95f1ebc89';
const BASE_LOCAL_SCRIPTS = 94;

// Pinned extracted document — INDEX_AFTER is the figure audit #496 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1439609;
const EXTRACTED_UTF8 = 1468132;
const EXTRACTED_LF = 24867;
const EXTRACTED_SHA256 = '095ba4db9d7968a33e7948735fdf07424ffe3a7d659589c09394fc2ea2869664';
const EXTRACTED_LOCAL_SCRIPTS = 95;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 399178;
const RAW_END = 401166;
const RAW_CHARS = 1988;
const RAW_SHA256 = 'dc65275c83c0cbe46e8e69c35b55e72610212c2e4f119d2bb6f6fd51366338bf';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1987;
const MODULE_UTF8 = 1989;
const MODULE_LF = 42;
const MODULE_SHA256 = '87af1cfc9d25934530a033b1cdcc69f8754411cc27209fee9578a906ee2b1466';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 401165;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 283,564 units earlier in the document, so once it is removed every byte
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

function undoRsQualityCheck(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('RS_QUALITY_CHECK_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,988 units, not 1,987. This module is
  //    NOT pure ASCII (one em dash of three bytes), so its UTF-8 length differs
  //    from its UTF-16 length and both are pinned.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('RS_QUALITY_CHECK_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('RS_QUALITY_CHECK_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('RS_QUALITY_CHECK_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the scanner DXLink prices owner
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller. The module needs nothing from the monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('RS_QUALITY_CHECK_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('RS_QUALITY_CHECK_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('RS_QUALITY_CHECK_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('RS_QUALITY_CHECK_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('RS_QUALITY_CHECK_UNDO_BASE_IDENTITY');
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
  isApplied, undoRsQualityCheck,
};
