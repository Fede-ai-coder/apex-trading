'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SCANNER IVR THROTTLE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 2343566 document and js/services/scanner-ivr-throttle.js,
// it returns the merged #444 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [80720,84771) in monolith coordinates in dev-clean @ 2343566, holding the
// scanner IVR throttle/dedup/cache: TWELVE top-level owners — four config vars,
// five pieces of queue/cache state, and three functions — and zero top-level
// statements.
//
// It is the SECOND-SMALLEST module in the chain of twenty-seven, at 4,050 units
// against the vega monitor's 1,761 — and it displaces journal-migration (4,461)
// from that position, which is why the previous layer's contract had to be
// re-pinned in this change. The first draft of this comment called it the
// "third-largest", written from the impression that 4,051 units is a lot next
// to the layer before it; the chain's largest is 71,811. §4 of the permanent
// contract measures the rank rather than describing it.
//
// FOUR REFERENCES IN THE ENTIRE APPLICATION, which is what put it first on a
// screen that counts SEVEN directions. One awaited call to `fetchScannerIvr`
// inside a batch function, and three reads of `_scannerIvrDiag` in a perf-diag
// dump, each already guarded by `typeof … === 'object'`. Nothing in the
// monolith writes to it, none of the seventy sibling modules names it, static
// markup does not name it, and — the direction audit #444 added — neither does
// markup the monolith GENERATES at runtime.
//
// WHY IT COULD BE TAKEN. Zero on every remaining direction the screen counts:
// no inbound write, no inbound PROPERTY write, no outbound property write, no
// monolith dependency. It reads no name at evaluation time and carries no
// top-level statement line, so it loads in an empty VM defining exactly its own
// twelve globals, and performs no fetch, starts no timer and touches no DOM
// while doing it.
//
// ITS TWO MIRROR SIBLINGS DID NOT COME WITH IT, and that was measured rather
// than assumed. The candle and earnings throttles are contiguous with this one
// and written as copies of it; audit #444 measured that taking all three would
// score 18 where the three score 9, 4 and 5 apart — the sum exactly, because
// none of them references another. Shared shape is not shared state.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER'S FILE, and that is not a hazard
// here because its only consumer is the inline monolith itself, which loads
// last. This tag is the 71st and final local script (index 70 of 71), which is
// what the permanent contract pins as MODULE_POSITION.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [194749,198799)   4,050 units, ending `}\n`
//   separator  [198799,198800)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records. Its ending is `}\n`, which twenty-four of the twenty-seven
// layers share.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a
// module ending on a blank line, a truncated or mutated module, an already
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
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/scanner-ivr-throttle.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #444 commit this layer was measured against.
const BASE_CHARS = 1568182;
const BASE_UTF8 = 1597962;
const BASE_LF = 27291;
const BASE_SHA256 = '2ef534b3039ff7ec98cc46cbe54e01ccf48fd765ac07c3f583a4bd471e79a52a';
const BASE_LOCAL_SCRIPTS = 70;

// Pinned extracted document — the figures audit #444 predicted before the move.
const EXTRACTED_CHARS = 1564193;
const EXTRACTED_UTF8 = 1593963;
const EXTRACTED_LF = 27201;
const EXTRACTED_SHA256 = '4bed91411ec54f1b2e3314d890a552fc36b06c2c575a7ebe9fb40c32881967f0';
const EXTRACTED_LOCAL_SCRIPTS = 71;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 194749;
const RAW_END = 198800;
const RAW_CHARS = 4051;
const RAW_SHA256 = 'bfbb81ea993f8b70297cef6ce985652821a9194f79e5ff29c6b108c681842b29';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4050;
const MODULE_UTF8 = 4060;
const MODULE_LF = 90;
const MODULE_SHA256 = '4f13ddbb95b7c5508fcd409ebfbd74a7974e6f7065d573fc39f771f9961a4775';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 198799;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 80,728 units earlier in the document, so once it is removed every byte
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

function undoScannerIvrThrottle(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SCANNER_IVR_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,051 units, not 4,050.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SCANNER_IVR_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SCANNER_IVR_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SCANNER_IVR_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after portfolio-vega-monitor.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('SCANNER_IVR_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SCANNER_IVR_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SCANNER_IVR_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SCANNER_IVR_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SCANNER_IVR_UNDO_BASE_IDENTITY');
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
  isApplied, undoScannerIvrThrottle,
};
