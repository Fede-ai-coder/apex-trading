'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING WEEKLY CANDLES — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the f2145de document and js/services/swing-weekly-
// candles.js, it returns the merged #452 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [401574,410935) in monolith coordinates in dev-clean @ f2145de, holding the
// weekly-candle derivation family: THREE top-level owners, all functions —
// `_swingWeekBucket`, `_swingLogWeeklySource` and `_swingDeriveWeeklyCandles` —
// 82 lines of code, and zero top-level statements.
//
// HOW IT WAS FOUND, which is the whole point of the cycle before it. Audit #452
// did not find this region by screening harder; it found that the screen could
// not SEE it. The banner rule matched `// ── ` — two dashes — and this region
// opens on `// ─── Weekly candle derivation …`, three. Forty-nine titled
// banners were invisible that way, twenty-nine of them inside a single stretch
// the screen therefore reported as one 243,851-unit region: the swing block
// #424 had already proved unextractable, because it assigns `S.swing` at load.
// So the screen had been offering a block it knew it could not take, and could
// not show the pieces inside it, for the twelve layers before this one — the
// permanent contract counts that off the chain, where it reads as thirteen
// because the count includes this layer. The corrected rule lives in
// tests/lib/extraction-boundary.js with its own controls; this module is the
// first thing it found.
//
// FOUR EDGES REACH IN, AND ONE OF THEM CLOSES A CYCLE. Three are ordinary:
// `_swingPreparePriceAlignedCandles` calls `_swingDeriveWeeklyCandles` twice and
// `_swingRenderSpyContext` calls it once, and all three sites sit inside
// function bodies that stay behind. The fourth is not ordinary and the permanent
// contract pins it as such: `_etWeekBucket`, which STAYS in the monolith, names
// `_swingWeekBucket`, which LEAVES — while this module calls `_etWeekBucket`
// twice in the other direction. The seam runs through a mutual reference. That
// is safe here for exactly one reason, which §5 of the contract asserts rather
// than assumes: both directions resolve at CALL time, inside function bodies, so
// neither file needs the other to exist while it evaluates. A single read at
// load in either direction would have disqualified this cut.
//
// THE THIRD OWNER IS NAMED NOWHERE OUTSIDE THIS FILE. `_swingLogWeeklySource` is
// declared here and called three times here, and zero times in the whole rest of
// the application. It was a global that only its own family used; it still is a
// global, because these are classic scripts and nothing about relocation changes
// that — but it is now a global whose every reference is in one greppable file.
// The contract measures that rather than claiming it.
//
// IN THE OTHER DIRECTION the family names three monolith globals —
// `_candleTradingSessionDate`, `_etWeekBucket` and `_swingCandleTimeMs` — and
// every one is called from inside a function body, never read at load. It names
// nothing that any sibling module owns, writes no property of anything it does
// not own, and appears in no markup, static or generated.
//
// IT IS MOSTLY PROSE, AND THAT WAS ON THE RECORD BEFORE THE CUT. 158 lines, of
// which 76 are comment or blank: 9,360 units for 82 lines of code, because the
// region opens with a 3,841-unit header explaining why weekly candles are
// derived in the frontend at all — there is no backend weekly series — and how
// the reduction was made order-independent. Audit #452 stated that as a ratio
// instead of burying it. The monolith loses the units either way, and the
// explanation travels with the code it explains.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 75th and final local
// script (index 74 of 75), which is what the permanent contract pins as
// MODULE_POSITION, and §6 loads it in a COMPLETELY empty VM: it defines exactly
// its own three globals and does nothing else — no fetch, no timer, no storage
// read, no listener. Loading last is therefore not a requirement it has, only
// where the tag happens to sit.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [515852,525212)   9,360 units, ending `}\n`
//   separator  [525212,525213)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
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

const TAG = '<script src="./js/services/swing-weekly-candles.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-snapshot-helpers.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #452 commit this layer was measured against.
const BASE_CHARS = 1529653;
const BASE_UTF8 = 1558636;
const BASE_LF = 26485;
const BASE_SHA256 = 'bad872575738d9fd4735c592438b6956af0d449dc8b79a34eae89429882f0b48';
const BASE_LOCAL_SCRIPTS = 74;

// Pinned extracted document — the figures audit #452 predicted before the move.
const EXTRACTED_CHARS = 1520354;
const EXTRACTED_UTF8 = 1549271;
const EXTRACTED_LF = 26328;
const EXTRACTED_SHA256 = '6f6e34aed9b095ba9a36ef3203d748d9d6b7abb84b2e811c1f41cc164537cc43';
const EXTRACTED_LOCAL_SCRIPTS = 75;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 515852;
const RAW_END = 525213;
const RAW_CHARS = 9361;
const RAW_SHA256 = 'ad763c765ec7ed8dacf1b67f2fb8e9aeb780b0037d0fc99d15aa5b000a1a211b';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 9360;
const MODULE_UTF8 = 9426;
const MODULE_LF = 157;
const MODULE_SHA256 = '3d1de7b9a82c597afe7c4ab327ec4be84fdfffbe08ba06eb1ce8109f665fd528';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 525212;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 401,582 units earlier in the document, so once it is removed every
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

function undoSwingWeeklyCandles(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 9,361 units, not 9,360.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after journal-snapshot-helpers.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('SWING_WEEKLY_CANDLES_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SWING_WEEKLY_CANDLES_UNDO_BASE_IDENTITY');
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
  isApplied, undoSwingWeeklyCandles,
};
