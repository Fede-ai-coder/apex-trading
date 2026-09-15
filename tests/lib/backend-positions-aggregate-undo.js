'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND POSITIONS AGGREGATE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the f89244a document and
// js/portfolio/backend-positions-aggregate.js, it returns the merged #456
// index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [929673,933369) in monolith coordinates in dev-clean @ f89244a, holding ONE
// top-level owner: `_backendEnrichedPositionsToAggregatedOptions`, 3,694 units,
// which turns a backend enriched-positions response into the aggregated option
// rows the live refresh pipeline consumes. 71 lines of code, zero top-level
// statements, and no `var`, `let` or `const` at module scope at all.
//
// IT DEPENDS ON NOTHING. Not "on little" — the dependency list audit #456
// measured is EMPTY. The function reads its one parameter and its own locals,
// and names no declaration of the monolith, no sibling module, no markup. Ten
// of the shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, so a runtime
// dependency is the ordinary case in this chain and having none is the thing
// worth recording.
//
// ONE EDGE REACHES IN, from `refreshPositionsLive`, inside a function body, so
// it does not run while anything loads. That single edge is the whole
// nine-direction score: 1.
//
// THE CUT IS ONE OWNER BECAUSE THE NEXT TWO CANNOT COME. Three owners sit
// together at this site and all three are called from `refreshPositionsLive`,
// which makes a 10,430-unit cut look available. It is not. Between the first
// owner and the second sits
//
//     try { window._resolveLegGreeksDisplay = _resolveLegGreeksDisplay; } catch (e) {}
//
// at module scope — a load-time side effect. Taking two owners or three would
// relocate it, and this programme has declined to relocate one since the DSB
// adapter cut, where the debug exposure stayed with the part that stayed. So
// 3,695 units is not a timid cut; it is the whole of what is takeable here.
//
// THE SCREEN THAT FOUND IT. The banner screen could not rank this region at
// all. Its banner region runs 95,529 units over THIRTY-FIVE owners, and the
// screening rule can only report such a region whole. Audit #456 therefore
// enumerated every contiguous run of top-level owners inside every banner
// region — 7,759 raw runs, 2,048 refused by `assertSeam`, 3,391 distinct
// extractable candidates — and found five scoring 1 where the banner screen's
// best was 10. The permanent contract re-executes that screen rather than
// citing it, on the audit's own numbers, because the audit file is deleted by
// the same PR that adds the contract.
//
// IT CARRIES NO DOCUMENTATION AT ALL. 71 of its 72 lines are code and the 72nd
// is the empty element `split` leaves on a newline-terminated string: not one
// comment line. "The explanation travels with the code" is a stated value of
// these cuts, and here there is no explanation to travel. The contract pins
// that rather than glossing it, and it is also why this is the chain's first
// PURE-ASCII layer — every other one carries a box-drawing banner.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 77th and final local
// script (index 76 of 77), which is what the permanent contract pins as
// MODULE_POSITION, and §6 loads it in a COMPLETELY empty VM: one global
// defined, and no fetch, timer, storage read or listener. Loading last is where
// the tag sits, not a requirement it has — with no dependencies at all, this
// module could load anywhere.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1044070,1047765)   3,695 units, ending `}\n`
//   separator  [1047765,1047766)   exactly one LF
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

const TAG = '<script src="./js/portfolio/backend-positions-aggregate.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/swing-direction.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #456 commit this layer was measured against.
const BASE_CHARS = 1513908;
const BASE_UTF8 = 1542724;
const BASE_LF = 26236;
const BASE_SHA256 = 'd48afcc004e2b165564b116260ab990c3e882be14ee05c8b68286ddf477ee366';
const BASE_LOCAL_SCRIPTS = 76;

// Pinned extracted document — the figures audit #456 predicted before the move.
const EXTRACTED_CHARS = 1510282;
const EXTRACTED_UTF8 = 1539098;
const EXTRACTED_LF = 26165;
const EXTRACTED_SHA256 = '43fdeeff33a11e3b3028bb94dca447f3f711beb8438dd74f3d96928075da90db';
const EXTRACTED_LOCAL_SCRIPTS = 77;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1044070;
const RAW_END = 1047766;
const RAW_CHARS = 3696;
const RAW_SHA256 = 'dda9beef4c3313000b5f0c9dd494730a8a7cd645dfb0ad45b8c539c3f41df52e';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 3695;
const MODULE_UTF8 = 3695;
const MODULE_LF = 71;
const MODULE_SHA256 = '571ab25f8057fbf318255f1a816c3c7b510ed2d2448cc242fef4d2b70aac352b';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1047765;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 929,681 units earlier in the document, so once it is removed every
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

function undoBackendPositionsAggregate(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 3,696 units, not 3,695. The UTF-8
  //    length equals the UTF-16 length here, which is true of no other layer in
  //    the chain: this module carries no character above U+007F.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after swing-direction.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('BACKEND_POSITIONS_AGGREGATE_UNDO_BASE_IDENTITY');
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
  isApplied, undoBackendPositionsAggregate,
};
