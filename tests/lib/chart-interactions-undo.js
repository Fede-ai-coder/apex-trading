'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// CHART INTERACTIONS — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 3508590 document and js/ui/chart-interactions.js, it
// returns the merged #448 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [164995,184045) in monolith coordinates in dev-clean @ 3508590, holding the
// candle chart's whole interaction family: SEVENTEEN top-level owners — three
// formatters, three view constants, the view-window resolver, the redraw and
// hover engine, and the drag/pan dispatcher — twelve functions and five vars,
// 296 lines of code, and zero top-level statements.
//
// ITS ENTIRE EXTERNAL COUPLING IS SIX CALL SITES INSIDE ONE FUNCTION. Every
// inbound reference — all six — sits inside `_drawCandleChart`, which began at
// 184045, exactly where this region ended. Nothing else in 1,445,194 units of
// monolith named any of the seventeen: no sibling module, no static markup, and
// none of the markup the monolith generates at runtime. In the other direction
// the family names `_drawCandleChart` exactly once, from inside `_chartRedraw`,
// at runtime. One bidirectional pair with a single adjacent neighbour.
//
// WHY THE BOUNDARY IS HERE AND NOT AT THE NEXT BANNER. Audit #448 measured three
// ends from this same start:
//
//     end      units    seven   seam
//     166016    1,021       4   accepted
//     176824   11,829      16   REFUSED
//     184045   19,050       7   accepted   ← this one
//
// The middle end is the one worth recording. At under two-thirds the size it
// scores more than twice as much, because nine of its fifteen inbound edges are
// INTERNAL edges the cut exposes and this cut never creates: FIVE of its owners
// — `_CHART_MIN_VISIBLE`, `_chartXSpan`, `_chartRedraw`, `_chartClearHover` and
// `_chartDrawHover` — are read by the drag code a cut at 176824 would leave
// behind. The permanent contract DERIVES that set rather than listing it; this
// line first named four, having been written from the ones that stood out.
// `assertSeam` refuses that boundary outright as well, on the structural
// separator, independently of any score. The permanent contract re-measures all
// three ends rather than citing them.
//
// THE HEAD BANNER NAMES SOMETHING IT DOES NOT CONTAIN. The region opens on
// `// ── Interactive crosshair / tooltip engine for _drawCandleChart ──`, and
// the engine is not under it: the three functions there are formatters, and
// `_chartDrawHover` — 5,592 units, the engine itself — sits under the NEXT
// banner. Taking the banner as the boundary takes the helpers and leaves the
// engine. CLAUDE.md already records the opposite failure, journal-trade-detail
// spanning a banner; this is the same rule from the other side.
//
// TWENTY-FIRST OF TWENTY-NINE BY SIZE, measured in §4 of the permanent contract
// and not described here. At 19,049 units it displaces no superlative: the vega
// monitor (1,761) keeps smallest and the traffic light (71,811) keeps largest,
// so this change re-pins nothing in any earlier contract.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER'S FILE, and that is not a hazard
// here because its only consumer is the inline monolith itself, which loads
// last. This tag is the 73rd and final local script (index 72 of 73), which is
// what the permanent contract pins as MODULE_POSITION.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [279153,298202)   19,049 units, ending `}\n`
//   separator  [298202,298203)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records. Its ending is `}\n`, which twenty-six of the twenty-nine
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

const TAG = '<script src="./js/ui/chart-interactions.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/scanner-earnings-throttle.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #448 commit this layer was measured against.
const BASE_CHARS = 1559378;
const BASE_UTF8 = 1589134;
const BASE_LF = 27106;
const BASE_SHA256 = '41d643cf7e4700d468df93f9cca638e6711d42963447b10c252e7b291fd26ed9';
const BASE_LOCAL_SCRIPTS = 72;

// Pinned extracted document — the figures audit #448 predicted before the move.
const EXTRACTED_CHARS = 1540382;
const EXTRACTED_UTF8 = 1569392;
const EXTRACTED_LF = 26714;
const EXTRACTED_SHA256 = '31f968a564c28b3d006e494cc1829112dd8dacefc6539bc465c953ddfa8a7d42';
const EXTRACTED_LOCAL_SCRIPTS = 73;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 279153;
const RAW_END = 298203;
const RAW_CHARS = 19050;
const RAW_SHA256 = '850eb1bfab65926f2afe3b1e9ceea09135f998799d11edfdb4b4f9268bc1cfc4';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 19049;
const MODULE_UTF8 = 19795;
const MODULE_LF = 392;
const MODULE_SHA256 = '0309aae1c0bcc487b60a170f26db1ea0694bfc0b064efcb44377745f2bad3b07';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 298202;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 165,003 units earlier in the document, so once it is removed every byte
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

function undoChartInteractions(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('CHART_INTERACTIONS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 19,050 units, not 19,049.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('CHART_INTERACTIONS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('CHART_INTERACTIONS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('CHART_INTERACTIONS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after scanner-earnings-throttle.js
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('CHART_INTERACTIONS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('CHART_INTERACTIONS_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('CHART_INTERACTIONS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('CHART_INTERACTIONS_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('CHART_INTERACTIONS_UNDO_BASE_IDENTITY');
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
  isApplied, undoChartInteractions,
};
