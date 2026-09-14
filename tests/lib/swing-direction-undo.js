'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING DIRECTION RESOLVER — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 4622657 document and js/services/swing-direction.js,
// it returns the merged #454 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [406512,413015) in monolith coordinates in dev-clean @ 4622657, holding the
// final multi-timeframe swing direction resolver: THREE top-level owners, all
// functions — `_swingResolveDirection` (3,661 units), `_swingRsContext` (651)
// and `_swingVixSuitability` (501) — 49 lines of code, and zero top-level
// statements.
//
// IT DEPENDS ON `S`, AND THAT IS THE POINT. `S` is the const that disqualified
// audit #424: that audit measured the swing block at four external edges over
// 242,294 units, the best coupling this programme has ever recorded, and could
// not take it, because the block assigns `S.swing = { … }` while it EVALUATES
// and `S` is declared inside the inline monolith, which loads last of all.
//
// That finding was right, and it had been applied too broadly ever since. The
// rule is not "a region that names `S` cannot be extracted" — it is "a region
// that TOUCHES `S` AT EVALUATION TIME cannot be extracted". This region names
// `S` three times, every one inside a function body, and writes no property
// through it at all. §4 of the permanent contract measures those three parts
// separately, because the distinction only means anything if each is checked on
// its own, and then supplies the negative case: the block #424 rejected still
// fails, at this base, for its own reason — a write through `S` at top level,
// outside every function body. Nine shipped layers already rest on the same
// distinction between a runtime dependency and a load-time one.
//
// FIVE EDGES REACH IN, spread over five functions that all stay behind:
// `_swingBuildCandidate`, `_swingEnrichOneOperationalRow`, `_swingLazyEnrich4h`,
// `_swingRenderRegime` and `_swingRunActiveTab`. Every site is inside a function
// body, so none runs while anything loads. In the other direction the family
// names three monolith globals — `S`, `SWING_VIX_MAX_SUITABLE`, `_swingNormDir`
// — and nothing else: no sibling module, no markup static or generated, no
// property written through a name it does not own.
//
// THE END WAS CHOSEN AGAINST A SEAM THAT ACTUALLY REFUSED ONE. Audit #454
// measured four ends from this start; the fourth, at 425438, is not a legal
// boundary at all — `assertSeam` rejects it for having no structural separator
// before what follows. The mechanical check is usually silent, so the cycle
// recorded the one time it spoke. The second end was the close call: one owner
// and one point more for 948 units, and it was declined because that owner,
// `_swingScore`, opens its own banner and is a clean 948-unit region in its own
// right — better taken later on its own terms than absorbed here.
//
// IT IS MOSTLY PROSE. 44 of its 93 lines are comment, and the region opens with
// a 1,604-unit header: 6,502 units for 49 lines of code. The audit stated that
// as a ratio rather than burying it. The monolith loses the units either way.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 76th and final local
// script (index 75 of 76), which is what the permanent contract pins as
// MODULE_POSITION, and §6 loads it in a COMPLETELY empty VM: three globals
// defined, `S` named but never defined and never touched, and no fetch, timer,
// storage read or listener. Loading last is where the tag sits, not a
// requirement it has.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [520852,527354)   6,502 units, ending `}\n`
//   separator  [527354,527355)   exactly one LF
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
//
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/swing-direction.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/swing-weekly-candles.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #454 commit this layer was measured against.
const BASE_CHARS = 1520354;
const BASE_UTF8 = 1549271;
const BASE_LF = 26328;
const BASE_SHA256 = '6f6e34aed9b095ba9a36ef3203d748d9d6b7abb84b2e811c1f41cc164537cc43';
const BASE_LOCAL_SCRIPTS = 75;

// Pinned extracted document — the figures audit #454 predicted before the move.
const EXTRACTED_CHARS = 1513908;
const EXTRACTED_UTF8 = 1542724;
const EXTRACTED_LF = 26236;
const EXTRACTED_SHA256 = 'd48afcc004e2b165564b116260ab990c3e882be14ee05c8b68286ddf477ee366';
const EXTRACTED_LOCAL_SCRIPTS = 76;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 520852;
const RAW_END = 527355;
const RAW_CHARS = 6503;
const RAW_SHA256 = '0ffb3e3b8e8850a5fc2957a90c84c4d105f4cb842d79962e72d37a7f4c7d2493';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 6502;
const MODULE_UTF8 = 6603;
const MODULE_LF = 92;
const MODULE_SHA256 = '104fd8d828f83266089add312d2a85853ac60d27bbac501ae1d46ac567086638';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 527354;
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

function undoSwingDirection(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SWING_DIRECTION_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 6,503 units, not 6,502.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SWING_DIRECTION_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SWING_DIRECTION_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SWING_DIRECTION_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after swing-weekly-candles.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('SWING_DIRECTION_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SWING_DIRECTION_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SWING_DIRECTION_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SWING_DIRECTION_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SWING_DIRECTION_UNDO_BASE_IDENTITY');
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
  isApplied, undoSwingDirection,
};
