'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING CHART CACHE EVALUATE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/services/swing-chart-cache-evaluate.js,
// it returns the index.html that merged with #529 and that #530 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [680527,682419) in document coordinates, holding ONE top-level owner, synchronous, and the
// four comment lines that document it: `_swingChartCacheEvaluate(entry, symbol, tf, nowMs)`
// decides whether a cached candle series may be served as fresh and answers a structured verdict,
// `{ usable, decision, ageMs, cachedSession, expectedSession }`, so that the caller and the
// diagnostic agree on the reason. It has six decisions, tried in a fixed order: a miss, an invalid
// entry, an identity mismatch, a session mismatch, an expired entry and a fresh hit. Two functions
// of the swing chart loader call it. It writes nothing outside itself.
//
// 33 lines: 23 of code, TEN of comment (four above the declaration, six inside the body) and NONE
// blank, and ZERO top-level statements. A function declaration is the whole of its top-level
// shape, so it ships no mutable binding of its own. It is NOT pure ASCII: three em dashes sit in
// its comments, so its UTF-8 length, 1,897, is six bytes longer than its UTF-16 length, 1,891.
//
// THE CUT TAKES NO BANNER, AND TAKES ITS DOCUMENTATION. It is owner 8 of the fifteen of a
// `// ───` section. The block opens on the first line of its own documentation, with a blank
// line above it, which stays in the monolith, and the blank line that followed the block is the
// structural separator, which leaves with it. After the move the closing brace of
// `_swingSeriesSessionDate` is directly against the comment block of `_swingChartCachePut`,
// across one blank line, a join the monolith already holds. The document's top-level banner
// marks and owner regions do not move.
//
// TWO CALLS, TWO DEPENDENCIES, NOTHING FROM A SHIPPED MODULE. `_swingGetChartCandles` (async) and
// `_swingPrefetchNeighbors` call the owner from their own bodies, one call apiece. No shipped
// module names it. The two monolith dependencies stay: `SWING_CHART_CACHE_TTL_MS`, a `var`
// holding 180000, read once, last; and `_swingExpectedNewestSessionDate`, a declared function,
// called once, first. Both are declared above the block and neither is assigned by it. So the
// block loads in a bare VM declaring exactly its one function; there, calling it throws
// ReferenceError for `_swingExpectedNewestSessionDate` before anything is decided. It deletes
// nothing and reaches the host through nothing but the language's own `Date` and `isFinite`.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as the
// layer before it did when it shipped. Both references are inside the bodies of the consumers and the
// block itself runs nothing at load, so the position is not shown to be load-bearing for this
// layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [680527,682418)   1,891 units, ending `}\n`
//   separator  [682418,682419)   exactly one LF
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

const TAG = '<script src="./js/services/swing-chart-cache-evaluate.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/apex-parity-backend-fetch.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #530 commit this layer was measured against.
const BASE_CHARS = 1408731;
const BASE_UTF8 = 1437048;
const BASE_LF = 24301;
const BASE_SHA256 = '599c9561c24d1c197a82f036c903d8078444c5b9389c73726d8d7c160b999ac8';
const BASE_LOCAL_SCRIPTS = 111;

// Pinned extracted document — INDEX_AFTER is the figure audit #530 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1406907;
const EXTRACTED_UTF8 = 1435218;
const EXTRACTED_LF = 24268;
const EXTRACTED_SHA256 = '75b43a83d0b007b551c3ea852e10cea6b759d50c781b23bfd5fde40da3c0c15c';
const EXTRACTED_LOCAL_SCRIPTS = 112;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 680527;
const RAW_END = 682419;
const RAW_CHARS = 1892;
const RAW_SHA256 = '3447a737e489cf09c63290a7d8b27898bedbabb22f309b120fd172329b929ba4';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1891;
const MODULE_UTF8 = 1897;
const MODULE_LF = 33;
const MODULE_SHA256 = 'a13bca7ee2d2e1929e80600dc3a07f45ddab2181c6fe7abe3f7d2add2a036480';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 682418;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 563,779 units earlier in the document, so once it is removed every byte
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

function undoSwingChartCacheEvaluate(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,892 units, not 1,891. Its UTF-8
  //    length is SIX bytes longer than its UTF-16 length, the module holding
  //    three em dashes in its comments; both are pinned, since a pin on one
  //    does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the apex parity backend fetch
  //    tag and immediately before the inline monolith, so it loads ahead of
  //    every caller.
  if (count(html, TAG) !== 1) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SWING_CHART_CACHE_EVALUATE_UNDO_BASE_IDENTITY');
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
  isApplied, undoSwingChartCacheEvaluate,
};
