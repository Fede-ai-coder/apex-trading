'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING TREND CONTEXT — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/services/swing-trend-context.js,
// it returns the index.html that merged with #525 and that #526 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [505500,507115) in document coordinates, holding ONE top-level owner, synchronous:
// `_swingTrendContextFromCandles`, which reads a series of candles, weekly or daily, and
// returns the trend context the swing screen shows: whether a read is available, the trend
// (`UP`, `DOWN`, `FLAT` or `unavailable`), the 20- and 30-bar averages, the last price and the
// structure of the two averages. It writes nothing outside itself.
//
// 34 lines: 31 of code, 3 of comment and none blank, ZERO top-level statements. A function
// declaration is the whole of its top-level shape, so it ships no mutable binding of its own.
// It is NOT pure ASCII: the first line is the section's banner, `// ─── Trend context …`, and
// holds 24 box-drawing dashes, each one UTF-16 unit and three UTF-8 bytes, so its UTF-8 length
// is 1,662 against 1,614 UTF-16 units and the byte-count pin and the character-count pin are
// two pins that differ. The encoding of the file is part of what the move preserves.
//
// THE CUT IS ONE WHOLE SECTION AND TAKES ITS BANNER. The first line is the banner of the
// section, the next two are comment lines, and the declaration follows; the blank line above the
// banner, which separates it from the closing brace of `ffSwingTrading`, stays in the monolith.
// After the move that brace is directly against the banner of the NEXT section, `// ─── 4H
// tactical timing`, across one blank line, because the blank line that followed the block is
// the structural separator and leaves with it. The document's top-level banner marks fall by
// one and its owner regions by one.
//
// FIVE CALLS, ONE DEPENDENCY, ONE MODULE CALLED. `_swingBuildCandidate` (synchronous) and
// `_swingRenderSpyContext` (async) call the function from their own bodies, two calls and three,
// all inside function bodies. No shipped module names it. The one monolith dependency is
// `SWING_MIN_DAILY_BARS`, a `var` the monolith declares above the block, read only as the default
// of the minimum and only when the function runs; it also calls `smA` of js/utils/indicators.js
// twice, at call time. So the block loads in a bare VM; there, a series that is too short returns
// the unavailable answer without touching either, and any real work throws ReferenceError. It
// deletes nothing and reaches the host through none of `window`, `document`, storage, `console`,
// timers or fetch.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as the
// layer before it did when it shipped. All five references are inside function bodies and the
// block itself runs nothing at load, so the position is not shown to be load-bearing for this
// layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [505500,507114)   1,614 units, ending `}\n`
//   separator  [507114,507115)   exactly one LF
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

const TAG = '<script src="./js/services/swing-trend-context.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/apex-parity-compare.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #526 commit this layer was measured against.
const BASE_CHARS = 1411890;
const BASE_UTF8 = 1440255;
const BASE_LF = 24363;
const BASE_SHA256 = 'f1dd30ef4903c56fea9d87ebbe9ba8711e810644d3715bb78fdaddd6f110cfce';
const BASE_LOCAL_SCRIPTS = 109;

// Pinned extracted document — INDEX_AFTER is the figure audit #526 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1410336;
const EXTRACTED_UTF8 = 1438653;
const EXTRACTED_LF = 24329;
const EXTRACTED_SHA256 = 'cadfe025fdb363cb702a0f285ca9c53b1b464f321f08c1ab38ece5c62908d3f3';
const EXTRACTED_LOCAL_SCRIPTS = 110;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 505500;
const RAW_END = 507115;
const RAW_CHARS = 1615;
const RAW_SHA256 = 'ae686f3d100ce8cc8004c97ea10303e4d385294ca404eca781771eecd14752b1';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1614;
const MODULE_UTF8 = 1662;
const MODULE_LF = 34;
const MODULE_SHA256 = '7bd3d768fd58927fdac7eb0e4940c0596c6f74ef0d58af1a9c399e8d30ef562f';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 507114;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 388,880 units earlier in the document, so once it is removed every byte
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

function undoSwingTrendContext(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SWING_TREND_CONTEXT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,615 units, not 1,614. Its UTF-8
  //    length (1,662) differs from its UTF-16 length by the two extra bytes of each
  //    of the 24 box-drawing dashes in its banner line; both are pinned, since a pin
  //    on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the option-chain error helpers tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SWING_TREND_CONTEXT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SWING_TREND_CONTEXT_UNDO_BASE_IDENTITY');
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
  isApplied, undoSwingTrendContext,
};
