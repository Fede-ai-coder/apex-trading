'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio alignment + row traffic light — byte-exact undo of the audited pair.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1104894,1176706) in dev-clean @ ea34e52f, holding TWENTY-SIX owners across
// what the monolith presents as two features:
//
//     // ══ PORTFOLIO DIRECTIONAL ALIGNMENT ENGINE      5 owners,  19,912 units
//     // ══ PORTFOLIO ROW TRAFFIC LIGHT — helpers      21 owners,  51,900 units
//
// THE REGION SPANS A `// ══` FEATURE HEADER. That by itself is ordinary — six
// of the eighteen prior modules already contain one and sixteen contain a
// `// ── ` banner, both counted in §3 of the contract. What matters is WHY the
// mark was crossed. The two halves are mutually recursive: the alignment engine calls
// SEVEN of the traffic light's owners and the traffic light calls THREE of the
// alignment engine's, so cutting between them converts ten internal calls into
// external edges:
//
//     taken separately   16 external executable edges over 13 names
//     taken together      6 external executable edges over  3 names
//
// A rule that stopped at the next banner would therefore have made this cut
// almost three times worse. journal-trade-detail already spanned a `// ── `
// section banner; this is the same lesson one level up. No ordinal is claimed
// here or in the contract.
//
// WHY IT CAN BE A MODULE AT ALL. `evaluationTimeReads` over the block returns
// the EMPTY LIST. It is twenty-six top-level declarations and ZERO top-level
// statement lines, so nothing runs at load and nothing can be read at load. It
// depends on seventeen names the monolith declares — `S` among them, the same
// `const` that disqualified audit #424's swing candidate — but every reference
// sits inside a declaration and resolves at CALL time. That distinction, not
// the dependency list, is what separates this region from the rejected one.
//
// It also takes three names from sibling modules — smA and calcRSIWilder from
// js/utils/indicators.js, buildStreamerSymbol from js/utils/option-symbols.js —
// which load at positions 1 and 2 against this module's 63. The contract pins
// those positions, because #423 shipped a module whose sibling dependencies
// nothing pinned and a tag reorder would have broken it silently.
//
// WHAT STAYS BEHIND. `_pfAlignmentCache`, declared `var` in the monolith at
// 935029, is written twice by this region — both times BY KEY, never rebound.
// The cache stays inline and the module mutates it at call time.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1104894,1176705)  71,811 units, ends `}\n`
//   separator  [1176705,1176706)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoPortfolioTrafficLight(indexHtml, moduleSource) reconstructs
// dev-clean @ ea34e52f exactly, or throws.
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

const TAG = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-expiry-manual.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #427 audit commit this layer was measured against.
const BASE_CHARS = 1715096;
const BASE_UTF8 = 1747413;
const BASE_LF = 29961;
const BASE_SHA256 = '6592efa65f0d71ab12fce84e31ea6acf0f9f1868066107d87b16e2711f9376de';
const BASE_LOCAL_SCRIPTS = 62;

// Pinned extracted document — the figure audit #427 predicted before the move.
const EXTRACTED_CHARS = 1643350;
const EXTRACTED_UTF8 = 1674553;
const EXTRACTED_LF = 28561;
const EXTRACTED_SHA256 = '63dbe633ddb5edaa2a2343c161120b78275eac20a0bfc41b1f1fa1bd6127206f';
const EXTRACTED_LOCAL_SCRIPTS = 63;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1104894;
const RAW_END = 1176706;
const RAW_CHARS = 71812;
const RAW_SHA256 = '9de80d1c203524521e26a8fcb0a537fe9a545b212b279f66c7f74f5225d0c063';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 71811;
const MODULE_UTF8 = 72925;
const MODULE_LF = 1400;
const MODULE_SHA256 = 'c95f8156e0dacd67360e0f0410cc9bd6db00b401664305b59b2bea82a64da1fb';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1176705;
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

function undoPortfolioTrafficLight(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 71,812 units, not 71,811.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one traffic-light tag, loaded immediately after
  //    portfolio-expiry-manual.js and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_TRAFFIC_LIGHT_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioTrafficLight,
};
