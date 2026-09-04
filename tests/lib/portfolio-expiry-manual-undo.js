'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Manual expiry resolution — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1658581,1667351) in dev-clean @ 177622e9, holding four owners — the
// ITM/UNKNOWN expired-leg resolution modal and its submit path:
//
//     var _manualExpiryPortfolioId        36 units — which portfolio is open
//     _pfExpiryManualClose               161 units — closes the modal
//     _pfExpiryResolveManual           5,971 units — builds and opens it
//     _pfExpiryManualSubmit            2,388 units — applies the resolution
//
// WHY THIS REGION, AND WHAT IT WAS CHOSEN OVER. Audit #424's headline result
// was a REJECTION: the swing trading screen scored four external edges over
// 242,294 units — the best coupling this programme has ever measured — and
// still cannot be extracted, because it performs `S.swing = { … }` at
// EVALUATION time and `S` is a `const` declared inside the inline monolith,
// which loads after every module. That audit also found the two screen defects
// that had hidden it: a column-0 banner rule blind to 83 indented banners, and
// an outbound check that scanned `var` only and so never tested `S`.
//
// This region is what survived the corrected screen. It is modest — 8,769
// units — and it passes the exact test the large one failed.
//
// ZERO EXTERNAL EXECUTABLE EDGES. Nothing left in the monolith calls an owner.
// The feature is reached entirely from one static markup handler,
// `onclick="if(event.target===this)_pfExpiryManualClose()"`, which stays in
// index.html and keeps working because the module defines a global function.
//
// ZERO TOP-LEVEL STATEMENTS. Unlike the two layers before it, this block runs
// nothing at load: it loads in a COMPLETELY empty VM — no `window`, no globals
// — and defines its four owners and nothing else. That is the property the
// swing block lacked, and the contract proves it rather than asserting it.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1658581,1667350)  8,769 units, ends `}\n`
//   separator  [1667350,1667351)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoPortfolioExpiryManual(indexHtml, moduleSource) reconstructs
// dev-clean @ 177622e993009847b6ed530dc30126f70f11b2c5 exactly, or throws.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a
// module ending on a blank line, a truncated or mutated module, an already
// unextracted document, a partially applied state, or foreign content anywhere
// all raise. There is no "best effort" path.
//
// REACHABILITY. Every error below except the closing BASE_IDENTITY is reachable
// by an ordinary mutant, and the permanent contract exercises each one with a
// control asserting its EXACT message: BAD_INPUT, MODULE_IDENTITY (size and
// hash), MODULE_SEPARATOR, TAG_IDENTITY, TAG_ADJACENCY, EXTRACTED_IDENTITY.
// BASE_IDENTITY is a DELIBERATE redundant final gate — once the module hash and
// the whole-document hash have both passed, the reconstruction is a pure
// function of two fixed byte strings, so no ordinary mutant can reach it.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/backend-portfolios.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #424 audit commit this layer was measured against.
const BASE_CHARS = 1723800;
const BASE_UTF8 = 1756149;
const BASE_LF = 30123;
const BASE_SHA256 = '5e820b246f62b7e874d3ebe637a1b42b370fbe34698c8980d3781e47862c5ff5';
const BASE_LOCAL_SCRIPTS = 61;

// Pinned extracted document — the figure audit #424 predicted before the move.
const EXTRACTED_CHARS = 1715096;
const EXTRACTED_UTF8 = 1747413;
const EXTRACTED_LF = 29961;
const EXTRACTED_SHA256 = '6592efa65f0d71ab12fce84e31ea6acf0f9f1868066107d87b16e2711f9376de';
const EXTRACTED_LOCAL_SCRIPTS = 62;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1658581;
const RAW_END = 1667351;
const RAW_CHARS = 8770;
const RAW_SHA256 = 'c1ef56973114cc5c2f2eeb12ae11bd7a0338cf6a886b3d56158a5cbf57b8a297';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 8769;
const MODULE_UTF8 = 8801;
const MODULE_LF = 162;
const MODULE_SHA256 = 'f53fd7dca65f0dd4c2909d96c91e9e38c483ed97e7d7c9fde5ba5d2e72cc473f';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1667350;
// Where the module goes back, in tag-free coordinates. The one added tag line
// sits far earlier in the document, so once it is removed every byte before the
// fragment is unchanged and the base offset applies directly.
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

function undoPortfolioExpiryManual(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 8,770 units, not 8,769.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one expiry-manual tag, loaded immediately after
  //    backend-portfolios.js and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_EXPIRY_MANUAL_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioExpiryManual,
};
