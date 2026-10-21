'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// APEX PARITY BACKEND FETCH — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/services/apex-parity-backend-fetch.js,
// it returns the index.html that merged with #527 and that #528 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1291451,1293123) in document coordinates, holding TWO top-level owners, both async:
// `_apexParityWarmupBackend(symbol, timeframe, waitMs)`, which maps a timeframe to the ones the
// backend can warm, records the request, POSTs it to the backend's candle warm-up endpoint and
// answers the status, the body it sent and the reply; and `_apexParityFetchBackend(symbol,
// timeframe)`, which reads the candles back with a plain GET. Both belong to the dev-only
// candle-parity tool and are called from one place, its console entry point. Neither writes
// anything outside itself.
//
// 28 lines: 27 of code, none of comment and ONE blank, the blank line between the two owners,
// and ZERO top-level statements. Function declarations are the whole of its top-level shape, so it
// ships no mutable binding of its own. It IS pure ASCII: its UTF-16 length, its UTF-8 length and
// its character count are one number, 1,671.
//
// THE CUT TAKES NO BANNER AND NO DOCUMENTATION. It is owners 6 and 7 of the thirteen of a
// `// ═══` region, and neither has a comment block of its own: the first line is the declaration
// of the first owner, with a blank line above it, which stays in the monolith, and the blank
// line that followed the block is the structural separator, which leaves with it. After the move the
// closing brace of `_apexParityWarmupTimeframes` is directly against the comment block of the console
// entry point, across one blank line, a join the monolith already holds. The document's top-level
// banner marks and owner regions do not move.
//
// TWO CALLS, TWO DEPENDENCIES, FOUR FOUNDATION READS. `apexDebugCompareCandles` (async) awaits each
// owner from its own body, one call apiece. No shipped module names either. The two monolith
// dependencies, `_apexParityWarmupTimeframes` and `_recordCandleSubscriptionRequest`, are declared
// functions that STAY in the monolith, called only when an owner runs; the foundation references are
// `BACKEND` and `_backendAuthHeaders`, twice each, from js/config/backend-config.js and
// js/api/backend-client.js. So the block loads in a bare VM; there, calling either owner returns a
// promise that rejects with ReferenceError for the first thing it reads. It deletes nothing and
// reaches the host through none of `window`, `document`, storage, `console` or timers; it uses the
// host's `fetch` and `AbortSignal`.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as the
// layer before it did when it shipped. Both references are inside the body of the consumer and the
// block itself runs nothing at load, so the position is not shown to be load-bearing for this
// layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1291451,1293122)   1,671 units, ending `}\n`
//   separator  [1293122,1293123)   exactly one LF
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

const TAG = '<script src="./js/services/apex-parity-backend-fetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/swing-trend-context.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #528 commit this layer was measured against.
const BASE_CHARS = 1410336;
const BASE_UTF8 = 1438653;
const BASE_LF = 24329;
const BASE_SHA256 = 'cadfe025fdb363cb702a0f285ca9c53b1b464f321f08c1ab38ece5c62908d3f3';
const BASE_LOCAL_SCRIPTS = 110;

// Pinned extracted document — INDEX_AFTER is the figure audit #528 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1408731;
const EXTRACTED_UTF8 = 1437048;
const EXTRACTED_LF = 24301;
const EXTRACTED_SHA256 = '599c9561c24d1c197a82f036c903d8078444c5b9389c73726d8d7c160b999ac8';
const EXTRACTED_LOCAL_SCRIPTS = 111;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1291451;
const RAW_END = 1293123;
const RAW_CHARS = 1672;
const RAW_SHA256 = 'e14d2053454c1a41a5761baa42b005c4fc4dd89ac72f82ff57e83a32011722c1';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1671;
const MODULE_UTF8 = 1671;
const MODULE_LF = 28;
const MODULE_SHA256 = '6ddc6c3ed057e05b9373ae687d18338bfc65b8a51012238333e9dce8a02468cf';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1293122;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 1,174,770 units earlier in the document, so once it is removed every byte
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

function undoApexParityBackendFetch(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,672 units, not 1,671. Its UTF-8
  //    length equals its UTF-16 length, the module being pure ASCII; both are
  //    pinned all the same, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the swing trend context tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('APEX_PARITY_BACKEND_FETCH_UNDO_BASE_IDENTITY');
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
  isApplied, undoApexParityBackendFetch,
};
