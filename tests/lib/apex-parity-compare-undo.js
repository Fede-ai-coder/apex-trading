'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// APEX PARITY COMPARE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/services/apex-parity-compare.js,
// it returns the index.html that merged with #523 and that #524 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1291354,1293746) in document coordinates, holding ONE top-level owner, synchronous:
// `_apexCompareCandleArrays`, the pure comparison at the heart of the backend-candle parity
// debug tool. It normalizes two candle arrays, takes the last `tail` (twenty by default) of
// each, pairs them by time and counts the pairs that agree within a tolerance, the ones that
// do not and the times present on one side only, and returns the counts, the four largest
// absolute differences and one record per mismatch. It writes nothing outside itself.
//
// 68 lines: 60 of code, 2 of comment and 6 blank, ZERO top-level statements. A function
// declaration is the whole of its top-level shape, so it ships no mutable binding of its own.
// It IS pure ASCII, so the byte-count pin and the character-count pin are two pins that happen
// to agree: 2,391 of each.
//
// THE CUT OPENS ON ITS DOCUMENTATION. The first line is the first of TWO comment lines, 139
// units, directly above the declaration; the blank line above those, which separates them from
// the closing brace of `_apexParityNormTimeframe`, stays in the monolith. After the move that
// brace is directly against the documentation of `_apexParityFrontendCandles` across one blank
// line, because the blank line that followed the block is the structural separator and leaves
// with it.
//
// TWO REFERENCES, ONE DEPENDENCY, ONE MODULE CALLED. The async `apexDebugCompareCandles` calls
// the function from its own body, and a top-level `if (typeof window !== 'undefined')` statement
// names it as a property of the object it assigns to `window.apexParityHelpers`. That second
// reference is evaluated AS THE MONOLITH LOADS, so the function must already be defined: the
// tag's position is load-bearing here. The one monolith dependency is `APEX_PARITY_TOL`, a `var`
// declared above the block, read only as the default of `tol` when the function runs. It also
// calls `_apexParityNormCandleArray` of js/services/candle-normalization.js twice, at call time.
// So the block loads in a bare VM and cannot be called there. It deletes nothing and reaches
// the host through none of `window`, `document`, storage, `console`, timers or fetch.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as
// the layer before it did when it shipped. The load-time reference above is why the position
// matters; the permanent contract pins it.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1291354,1293745)   2,391 units, ending `}\n`
//   separator  [1293745,1293746)   exactly one LF
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

const TAG = '<script src="./js/services/apex-parity-compare.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/ai-scan-context.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #524 commit this layer was measured against.
const BASE_CHARS = 1414221;
const BASE_UTF8 = 1442586;
const BASE_LF = 24431;
const BASE_SHA256 = '464dba5a0d8aecdb0d7ace6aa396874c3ce6e72b4ad59402d60669ad6ac6fdf8';
const BASE_LOCAL_SCRIPTS = 108;

// Pinned extracted document — INDEX_AFTER is the figure audit #524 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1411890;
const EXTRACTED_UTF8 = 1440255;
const EXTRACTED_LF = 24363;
const EXTRACTED_SHA256 = 'f1dd30ef4903c56fea9d87ebbe9ba8711e810644d3715bb78fdaddd6f110cfce';
const EXTRACTED_LOCAL_SCRIPTS = 109;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1291354;
const RAW_END = 1293746;
const RAW_CHARS = 2392;
const RAW_SHA256 = 'b94a181adf98b279c947927e8d43f86e0d2279eb09e263828357df36c56886f8';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 2391;
const MODULE_UTF8 = 2391;
const MODULE_LF = 68;
const MODULE_SHA256 = '07dd6a2ecd646975116af8ccd28feb8821f5b2f0aef02ba24d439d58f6d4ea86';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1293745;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 1,174,795 units earlier in the document, so once it is removed every byte
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

function undoApexParityCompare(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('APEX_PARITY_COMPARE_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 2,392 units, not 2,391. The module is
  //    pure ASCII, so its UTF-8 length equals its UTF-16 length; both are still
  //    pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the option-chain error helpers tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('APEX_PARITY_COMPARE_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('APEX_PARITY_COMPARE_UNDO_BASE_IDENTITY');
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
  isApplied, undoApexParityCompare,
};
