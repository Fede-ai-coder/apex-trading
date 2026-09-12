'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL SNAPSHOT HELPERS — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 78e60b2 document and js/services/journal-snapshot-
// helpers.js, it returns the merged #450 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1210818,1221613) in monolith coordinates in dev-clean @ 78e60b2, holding the
// journal's snapshot helper family: THREE top-level owners, all functions —
// `_buildSnapshot`, `_logSnapshot` and `_greeksMergeFromCache` — 199 lines of
// code, and zero top-level statements.
//
// SIX EDGES REACH IN, AND THEY ARE THREE COPIES OF ONE IDIOM. Every inbound
// reference sits inside `positionManager`, `submitClosePosition` or
// `submitTrade`, and each of those three makes the same three calls in the same
// order: merge the cached greeks, build the rich snapshot, log it. The middle
// call is `_buildRichSnapshot`, which is not in the monolith at all — it shipped
// as js/services/journal-rich-snapshot.js in an earlier cycle. This layer is the
// two ends of an idiom whose centre had already left. In the other direction the
// family names five monolith globals and one name that also already left,
// `buildStreamerSymbol` from js/utils/option-symbols.js; every one of them is
// called from inside a function body, never read at load.
//
// WHY THIS END AND NOT A NARROWER ONE. Audit #450 measured four ends from this
// same start, and the interesting thing is that ALL FOUR are valid seams —
// `assertSeam` accepts every one — so the mechanical check broke no tie here,
// unlike the cycle before it:
//
//     end        units   seven  eight  nine   seam
//     1217580    6,762       4      4     5   accepted
//     1218266    7,448       8      8     9   accepted
//     1221613   10,795      12     12    14   accepted   ← this one
//     1223775   12,957      17     17    19   accepted
//
// The score rises monotonically with size, so a screen left to itself picks the
// NARROW cut — and that cut is `_buildSnapshot` alone, which is named nowhere in
// production: not in the monolith's code, not in its literals, not in any
// sibling module, not in the static markup. It scores best because nothing calls
// it. Zero inbound is what a well-encapsulated leaf looks like and also what
// dead code looks like, and no direction of the screen tells them apart. The
// audit measured the whole monolith for it: nineteen of 956 declarations were
// named nowhere in production, 11,926 units, and `_buildSnapshot` was 6,608 of
// them — 61% of this layer's own bytes.
//
// SO THIS MODULE SHIPS 6,608 UNITS THAT NOTHING CALLS, deliberately and on the
// record. Phase 2 relocates bytes; it cannot delete them, because "byte-exact or
// it is not done" is what makes this helper possible at all. Deleting
// `_buildSnapshot` is a production change and belongs in its own PR. What the
// move buys meanwhile is that the dead weight stops being buried in a
// 1,415,349-unit inline script and becomes a named file anyone can grep and
// delete in one line. The permanent contract re-measures the reachability rather
// than citing it.
//
// SEVENTEENTH OF THIRTY BY SIZE, measured in §4 of the permanent contract and
// not described here. At 10,794 units it displaces no superlative: the vega
// monitor (1,761) keeps smallest and the traffic light (71,811) keeps largest,
// so this change re-pins nothing in any earlier contract.
//
// THE MODULE LOADS AFTER THE ONE SIBLING MODULE THAT CONSUMES IT, and that is
// not a hazard: js/ui/journal-trade-forms.js calls `_greeksMergeFromCache` at
// runtime, from inside a function, long after every script has loaded. Its other
// consumer is the inline monolith, which loads last of all. This tag is the
// 74th and final local script (index 73 of 74), which is what the permanent
// contract pins as MODULE_POSITION.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1325030,1335824)   10,794 units, ending `}\n`
//   separator  [1335824,1335825)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records. Its ending is `}\n`, which twenty-seven of the thirty layers
// now share — the other three end `;\n`.
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

const TAG = '<script src="./js/services/journal-snapshot-helpers.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/chart-interactions.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #450 commit this layer was measured against.
const BASE_CHARS = 1540382;
const BASE_UTF8 = 1569392;
const BASE_LF = 26714;
const BASE_SHA256 = '31f968a564c28b3d006e494cc1829112dd8dacefc6539bc465c953ddfa8a7d42';
const BASE_LOCAL_SCRIPTS = 73;

// Pinned extracted document — the figures audit #450 predicted before the move.
const EXTRACTED_CHARS = 1529653;
const EXTRACTED_UTF8 = 1558636;
const EXTRACTED_LF = 26485;
const EXTRACTED_SHA256 = 'bad872575738d9fd4735c592438b6956af0d449dc8b79a34eae89429882f0b48';
const EXTRACTED_LOCAL_SCRIPTS = 74;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1325030;
const RAW_END = 1335825;
const RAW_CHARS = 10795;
const RAW_SHA256 = '623cab1f68734f2bfe2f62262a728559f866f4bc52334a68b766dd0f6e375101';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 10794;
const MODULE_UTF8 = 10821;
const MODULE_LF = 229;
const MODULE_SHA256 = '3a49bac474239518dc0aea0f2033c4d7f6a25cb5fa1eab6d01a9fb075bdbd9c4';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1335824;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 1,210,826 units earlier in the document, so once it is removed every
// byte before the fragment is unchanged and the base offset applies directly.
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

function undoJournalSnapshotHelpers(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 10,795 units, not 10,794.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after chart-interactions.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('JOURNAL_SNAPSHOT_HELPERS_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalSnapshotHelpers,
};
