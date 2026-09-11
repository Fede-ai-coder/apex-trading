'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SCANNER EARNINGS THROTTLE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the a899cb4 document and
// js/services/scanner-earnings-throttle.js, it returns the merged #446
// index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [80720,85602) in monolith coordinates in dev-clean @ a899cb4, holding the
// scanner Earnings throttle/dedup/cache: ELEVEN top-level owners — three config
// vars, five pieces of queue/cache state, and three functions — and zero
// top-level statements.
//
// It is 4,881 units, which is the SEVENTH-SMALLEST of the chain's twenty-eight
// against the vega monitor's 1,761 and the traffic light's 71,811. That rank is
// measured in §4 of the permanent contract, not described here: the first thing
// written in this slot last cycle was "third-largest", from the impression that
// four thousand units is a lot next to the layer before it, and it was wrong by
// twenty-three places.
//
// FOUR REFERENCES IN THE ENTIRE APPLICATION, which is what made it the leading
// RECOMMENDATION on a screen counting SEVEN directions. Not the lowest-scoring
// region outright — `CONFIGURATION` [1,924) scores 2 against this one's 5 and is
// deferred on value, which §7 of audit #446 recorded and the permanent contract
// does not re-derive. The distinction matters: "top of the screen" would be a
// superlative over all ninety-six, and it is not true.
//
// The four are one call to `fetchScannerEarnings` inside a batch function, and
// three reads of `_scannerEarningsDiag` in a perf-diag dump, each guarded by
// `typeof … === 'object'`. Nothing in the monolith writes to it, none of the
// seventy-one sibling modules names it, static markup does not name it, and
// neither does markup the monolith GENERATES at runtime.
//
// WHY IT COULD BE TAKEN DESPITE A DEPENDENCY. It scores zero on every direction
// but one: no inbound write, no inbound PROPERTY write, no outbound property
// write, no sibling or markup reference, no evaluation-time read, no top-level
// statement line. It carries ONE monolith dependency — `fetchEarningsForTicker`
// — and that is why audit #444 took the IVR sibling first, which had none.
//
// A RUNTIME DEPENDENCY IS NOT A LOAD-TIME ONE, and that distinction is what
// makes this safe rather than merely acceptable. `fetchEarningsForTicker` is
// called from inside `fetchScannerEarnings`, never while the module evaluates,
// so the module still loads in an empty VM defining exactly its own eleven
// globals — and performs no fetch, starts no timer and touches no DOM doing it.
// Six of the shipped contracts already pinned a non-empty MONOLITH_DEPENDENCIES
// before this layer, so it is the common case in the chain and not an exception
// carved for it. §5 of the permanent contract counts SEVEN — those six plus this
// one — rather than asserting any of it; an earlier draft of this paragraph said
// "two", inferred from the layers nearest to hand rather than from the set.
//
// ITS MIRROR SIBLING DID NOT COME WITH IT. The candle throttle is contiguous
// with this one and written as a copy of it, and audit #446 measured it at 13
// under seven directions against this one's 5. The whole gap is four inbound
// PROPERTY writes — the candle sibling carries no generated-markup callers at
// all, which was measured rather than assumed after this line first credited
// the gap to both new directions. Shared shape is not shared state.
//
// THE BOUNDARY ARRIVED PRE-VALIDATED. Audit #444 published this same region at
// [84771,89653) before the IVR throttle was cut from above it, and #446
// published it at [80720,85602). The difference is exactly the 4,051 that the
// IVR relocation removed, so two independently measured audits agree to the
// byte on where this feature starts and stops.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER'S FILE, and that is not a hazard
// here because its only consumer is the inline monolith itself, which loads
// last. This tag is the 72nd and final local script (index 71 of 72), which is
// what the permanent contract pins as MODULE_POSITION.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [194811,199692)   4,881 units, ending `}\n`
//   separator  [199692,199693)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records. Its ending is `}\n`, which twenty-five of the twenty-eight
// layers now share — the other three end `;\n`.
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

const TAG = '<script src="./js/services/scanner-earnings-throttle.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/scanner-ivr-throttle.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #446 commit this layer was measured against.
const BASE_CHARS = 1564193;
const BASE_UTF8 = 1593963;
const BASE_LF = 27201;
const BASE_SHA256 = '4bed91411ec54f1b2e3314d890a552fc36b06c2c575a7ebe9fb40c32881967f0';
const BASE_LOCAL_SCRIPTS = 71;

// Pinned extracted document — the figures audit #446 predicted before the move.
const EXTRACTED_CHARS = 1559378;
const EXTRACTED_UTF8 = 1589134;
const EXTRACTED_LF = 27106;
const EXTRACTED_SHA256 = '41d643cf7e4700d468df93f9cca638e6711d42963447b10c252e7b291fd26ed9';
const EXTRACTED_LOCAL_SCRIPTS = 72;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 194811;
const RAW_END = 199693;
const RAW_CHARS = 4882;
const RAW_SHA256 = 'd5834771e72e655af6233690d9a968ea8d629e39ebaa9afb64f3e921328c5182';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4881;
const MODULE_UTF8 = 4895;
const MODULE_LF = 95;
const MODULE_SHA256 = 'e3022a6e3b99ee0b47e9a8af01160301248713d5e08088c009e6df9b3a5c9da1';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 199692;
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

function undoScannerEarningsThrottle(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SCANNER_EARNINGS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,882 units, not 4,881.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SCANNER_EARNINGS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SCANNER_EARNINGS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SCANNER_EARNINGS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after scanner-ivr-throttle.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('SCANNER_EARNINGS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SCANNER_EARNINGS_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SCANNER_EARNINGS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SCANNER_EARNINGS_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SCANNER_EARNINGS_UNDO_BASE_IDENTITY');
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
  isApplied, undoScannerEarningsThrottle,
};
