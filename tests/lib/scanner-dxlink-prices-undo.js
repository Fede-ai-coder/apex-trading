'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SCANNER DXLINK PRICES — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #494-era document and
// js/services/scanner-dxlink-prices.js, it returns the merged index.html at that
// commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [176773,179808) in document coordinates, holding ONE top-level owner, an async
// function: `fetchScannerDXLinkPrices`, which opens a DXLink feed on demand for
// the scanner's stock quotes. It asks the backend for a quote token, walks the
// SETUP, AUTH, CHANNEL_REQUEST, FEED_SETUP and FEED_SUBSCRIPTION handshake,
// subscribes the tickers in batches of 150, and resolves with a bid, ask and mark
// per symbol on full coverage or after 25 seconds, then disconnects.
//
// 63 lines: 59 of code, FOUR of comment, no blank, and ZERO top-level statements.
// One function declaration and its column-0 closer are the whole of its
// top-level shape, so this layer ships no mutable binding. It is NOT pure ASCII:
// it carries seven non-ASCII characters of three bytes each (three box-drawing
// characters and four arrows, and NO em dash), so its UTF-8 length (3,048) is
// fourteen units longer than its UTF-16 length (3,034) and the byte-count pin and
// the character-count pin disagree on purpose.
//
// THE CUT TAKES ITS DOCUMENTATION. The first 308 units are the four comment
// lines directly above the declaration, the first of which is the `// ── ` banner
// that opens the region the function sat in. The boundary is a judgement and not
// something the seam decides: `assertSeam` accepts SEVEN line starts between the
// previous owner and the declaration, and the permanent contract measures them
// rather than citing them. Taking the banner leaves the next function in that
// region, `_ensureVixFamily`, without one.
//
// ONE CONSUMER, TWO REFERENCES OUT. The references that reach in come from a
// single consumer, `runScan`, at one call site. The body reads `S`, the
// monolith's state object, on its first line, and calls `ttCall`, the backend
// client's request function, on its second. Both are reached when the function is
// CALLED, never when it loads, so the module loads in a bare VM and its tag
// position is not load-bearing for it. No inbound write, no property write, no
// outbound write, no sibling module, no static markup, no generated markup.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [176773,179807)   3,034 units, ending `}\n`
//   separator  [179807,179808)   exactly one LF
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

const TAG = '<script src="./js/services/scanner-dxlink-prices.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-missing-underlyings-gate.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #494 commit this layer was measured against.
const BASE_CHARS = 1444511;
const BASE_UTF8 = 1473050;
const BASE_LF = 24972;
const BASE_SHA256 = 'c323235b7bc317569261456be1234b330a6a0f08fb345c286d106f8778454a69';
const BASE_LOCAL_SCRIPTS = 93;

// Pinned extracted document — INDEX_AFTER is the figure audit #494 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1441539;
const EXTRACTED_UTF8 = 1470064;
const EXTRACTED_LF = 24909;
const EXTRACTED_SHA256 = '6340bcbd6507c40c113fe19dd2b078196d8770099c853273e65020a95f1ebc89';
const EXTRACTED_LOCAL_SCRIPTS = 94;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 176773;
const RAW_END = 179808;
const RAW_CHARS = 3035;
const RAW_SHA256 = 'b6a68121432ea656ee606264ac14f3eea057de8db5af5693cb292b6f5573510a';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 3034;
const MODULE_UTF8 = 3048;
const MODULE_LF = 63;
const MODULE_SHA256 = '14a53502a61988d26ca98f2d19e370e04c712db80cdce3b076cfb58f9c75d885';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 179807;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 61,222 units earlier in the document, so once it is removed every byte
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

function undoScannerDxlinkPrices(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 3,035 units, not 3,034. This module is
  //    NOT pure ASCII (seven three-byte characters), so its UTF-8 length differs
  //    from its UTF-16 length and both are pinned.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the missing underlyings gate
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller. The module needs nothing from the monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SCANNER_DXLINK_PRICES_UNDO_BASE_IDENTITY');
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
  isApplied, undoScannerDxlinkPrices,
};
