'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend candle store chart + main CHART — byte-exact undo of the audited pair.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [827324,852587) in dev-clean @ 8311c0a, holding TWENTY-TWO owners across what
// the monolith presents as two features:
//
//     // ══ BACKEND CANDLE STORE CHART EXPERIMENT   14 owners,   8,656 units
//     // ══ CHART                                    8 owners,  16,607 units
//
// WHY TOGETHER. Audit #429 measured the split at the `// ══ CHART` header
// between them:
//
//     taken separately   32 external executable edges over 11 names
//     taken together      8 external executable edges over  2 names
//
// AND WHY THAT IS NOT A RULE. The same audit measured a second neighbouring
// family and found the opposite: joining the Journal snapshot helper with its
// three neighbours costs 69 edges against the helper's 6 alone. Both families
// are asserted side by side in §6 of the contract, because "take adjacent
// regions together" read as a rule would have been wrong there. The rule is to
// measure the split, per family.
//
// WHAT IT COSTS, AND THE INVARIANT IT MOVES. The block performs ONE top-level
// statement:
//
//     window.apexSetBackendCandleStoreChartTimeframe = setBackendCandleStoreChartTimeframe;
//
// so this is the SECOND shipped module to assign to `window` at evaluation
// time. js/portfolio/backend-portfolios.js was the first, and the
// backend-directional-snapshot contract now pins TWO modules rather than one —
// both by RELOCATION of assignments that already ran inside the monolith, which
// is a different thing from a decision to expose something new. The statement
// reads `window` and a function this block itself declares, and NOT one name the
// monolith owns, so running it earlier changes no value.
//
// A consequence of the same statement: SEVENTEEN of the nineteen layers before
// it load in a completely empty VM and this one does not. It needs `window`,
// and nothing else — the contract shows both directions, and §9 of the seam
// contract counts the three that need a host by name.
//
// STATE COUPLING IS ZERO IN BOTH DIRECTIONS. Nothing left inline writes any of
// the four bindings it owns, and it writes no binding it does not own. Its eight
// external edges all resolve at call time, and one owner (openChart) is reached
// from generated markup, pinned by content.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [827324,852586)  25,262 units, ends `}\n`
//   separator  [852586,852587)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoBackendCandleStoreChart(indexHtml, moduleSource) reconstructs
// dev-clean @ 8311c0a exactly, or throws.
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
// hash — the hash reached by a SAME-LENGTH probe, so the size guard cannot
// answer for it), MODULE_SEPARATOR, TAG_IDENTITY, TAG_ADJACENCY,
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

const TAG = '<script src="./js/ui/backend-candle-store-chart.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-traffic-light.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #429 audit commit this layer was measured against.
const BASE_CHARS = 1643350;
const BASE_UTF8 = 1674553;
const BASE_LF = 28561;
const BASE_SHA256 = '63dbe633ddb5edaa2a2343c161120b78275eac20a0bfc41b1f1fa1bd6127206f';
const BASE_LOCAL_SCRIPTS = 63;

// Pinned extracted document — the figure audit #429 predicted before the move.
const EXTRACTED_CHARS = 1618149;
const EXTRACTED_UTF8 = 1648835;
const EXTRACTED_LF = 28248;
const EXTRACTED_SHA256 = '67a94fd413e30fd970a6aee717d5a563a3fc662668ea4fb01efce21b9f05bb9e';
const EXTRACTED_LOCAL_SCRIPTS = 64;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 827324;
const RAW_END = 852587;
const RAW_CHARS = 25263;
const RAW_SHA256 = '4fb8a464d8b1c7c0e1e949d185f9852d82bdaf681203babedc5ae94368225ca7';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 25262;
const MODULE_UTF8 = 25779;
const MODULE_LF = 313;
const MODULE_SHA256 = '83a0d62098cd092f120e8438af0ba886fd47e1f9c84009f6f4615843f34e483e';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 852586;
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

function undoBackendCandleStoreChart(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 25,263 units, not 25,262.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one chart tag, loaded immediately after
  //    portfolio-traffic-light.js and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('BACKEND_CANDLE_STORE_CHART_UNDO_BASE_IDENTITY');
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
  isApplied, undoBackendCandleStoreChart,
};
