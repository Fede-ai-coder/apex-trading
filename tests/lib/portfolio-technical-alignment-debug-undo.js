'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO TECHNICAL ALIGNMENT DEBUG — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 5210693 document and
// js/portfolio/portfolio-technical-alignment-debug.js, it returns the merged
// #460 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [990716,994856) in monolith coordinates in dev-clean @ 5210693, holding TWO
// top-level owners: `buildPortfolioTechnicalAlignmentDebug` (3,405 units), which
// assembles the diagnostic record the live refresh attaches to a position when
// technical debugging is on, and `mapLimit` (731), which runs an async worker
// over an array at bounded concurrency. 69 lines, 64 of them code, zero
// top-level statements, and no `var`, `let` or `const` at module scope at all.
//
// IT DEPENDS ON NOTHING, because both owners take everything they touch as
// parameters. MONOLITH_DEPENDENCIES is EMPTY, not short. Ten of the shipped
// contracts pin a non-empty list, so a runtime dependency is the ordinary case
// in this chain and having none is the thing worth recording.
//
// FIVE EDGES REACH IN AND THEY ARE ONE RELATIONSHIP. All five sites are hosted
// by `refreshPositionsLive`, so the nine-direction score reads 5 while the
// coupling is ONE consumer — the distinction audit #458 introduced and this
// layer is the second to rest on.
//
// THE TWO OWNERS ARE STRANGERS, AND THAT WAS MEASURED BEFORE IT WAS ACCEPTED.
// Neither references the other; they sit two blank lines apart with no banner
// between them, adjacent by accident. That prompted an objection — a module
// named for one feature should not carry an unrelated utility, and bundling two
// strangers would be a first for this chain — which would have cost 733 units
// had it been applied. It was measured instead: of the chain's 34 layers before
// this one, 27 ship more than one owner, and only TEN have owners that form one
// connected graph under "names the other". SEVENTEEN already ship disconnected
// sets, and `portfolio-dxlink-greeks` has this layer's exact two-owners/one-
// connected shape. Bundling strangers is the MAJORITY case, 17 to 10, so the
// criterion was retired rather than applied. §5 of the permanent contract
// re-executes that count on its own numbers, because the audit that first made
// it is deleted by the same PR that adds the contract.
//
// `mapLimit` SOUNDS SHARED AND IS NOT. §4 measures exactly one call site in the
// whole application, none in any sibling module and none in markup, while the
// monolith runs more than twenty `Promise.all` sites that do not route through
// it. Its generality is unexercised, not shared — which is what makes a
// generic-sounding helper a one-consumer region.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 79th and final local
// script (index 78 of 79), which is what the permanent contract pins as
// MODULE_POSITION, and §6 loads it in a COMPLETELY empty VM: two globals
// defined, and no fetch, timer, storage read or listener. §6 also CALLS both
// owners — separately, because nothing in the file connects them — since a pair
// that loads bare but throws on its own shape would satisfy every other clause.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1105251,1109390)   4,139 units, ending `}\n`
//   separator  [1109390,1109391)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-technical-alignment-debug.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-technical-merge.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #460 commit this layer was measured against.
const BASE_CHARS = 1504517;
const BASE_UTF8 = 1533331;
const BASE_LF = 26050;
const BASE_SHA256 = '6944b4231b09b963e6c044de4f0ea6c2a4623a042b81fb1331303b06b5258e5f';
const BASE_LOCAL_SCRIPTS = 78;

// Pinned extracted document — the figures audit #460 predicted before the move.
const EXTRACTED_CHARS = 1500455;
const EXTRACTED_UTF8 = 1529269;
const EXTRACTED_LF = 25982;
const EXTRACTED_SHA256 = '361533f1892dd215b00620c0537cd1337a05177eac5a9929c6378cec09dd29eb';
const EXTRACTED_LOCAL_SCRIPTS = 79;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1105251;
const RAW_END = 1109391;
const RAW_CHARS = 4140;
const RAW_SHA256 = '04fedadc2c643bb38f288b61014b4cddfcd9ef211b323d80631e5f610e350f85';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4139;
const MODULE_UTF8 = 4139;
const MODULE_LF = 68;
const MODULE_SHA256 = '47e8f0104a10cd1f16190da6d52b46ce78df20dce2b510694d05206c2f4ce057';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1109390;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 990,724 units earlier in the document, so once it is removed every
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

function undoPortfolioTechnicalAlignmentDebug(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,140 units, not 4,139. The UTF-8
  //    length equals the UTF-16 length here: this module carries no character
  //    above U+007F, which is true of only one other layer in the chain.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after portfolio-technical-merge.js
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioTechnicalAlignmentDebug,
};
