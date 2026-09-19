'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// DXLINK GREEKS FETCH — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 9dae61e document and js/services/dxlink-greeks-
// fetch.js, it returns the merged #464 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1025308,1030258) in monolith coordinates in dev-clean @ 9dae61e, holding ONE
// top-level owner: `fetchDXLinkGreeks` (4,703), which opens a DXLink WebSocket,
// subscribes Greeks and Quote for a list of streamer symbols, fills a result
// map as events arrive, and resolves on completion or a 5s hard timeout. 90
// lines, 83 of them code, 7 of them not, and zero top-level statements.
//
// IT OPENS ON A BANNER THAT NAMES ITS OWNER, not on the declaration. The first
// line of this module is
// `// ── fetchDXLinkGreeks — one-shot WebSocket fetch for a list of streamer
// symbols ──`, and that line occurs exactly once in the base monolith, which is
// what makes the seam unambiguous. 245 units of banner block precede the owner;
// one newline follows it.
//
// NO MONOLITH DEPENDENCY AT ALL. MONOLITH_DEPENDENCIES is EMPTY, not short: the
// owner names no top-level declaration of the monolith. Its one outbound edge
// is `ttCall`, owned by js/api/backend-client.js — a FOUNDATION module that
// predates the extraction programme and that eleven of the layers shipped
// BEFORE this one already call — a count the permanent contract executes over
// that set, this module being a twelfth caller itself. Audit #464's finding is that the screen's ninth
// direction had been counting that edge as if it were a reach into extracted
// code; the permanent contract re-executes the split.
//
// ONE EDGE REACHES IN. `refreshPositionsLive` calls it, from inside a function
// body, and that is the entirety of the inbound coupling. That consumer is
// 138,483 units — the largest top-level declaration in the monolith — which is
// why the contract pins its size rather than only its name.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1139980,1144929)   4,949 units, ending `}\n`
//   separator  [1144929,1144930)   exactly one LF
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

const TAG = '<script src="./js/services/dxlink-greeks-fetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-map-audit.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #464 commit this layer was measured against.
const BASE_CHARS = 1496195;
const BASE_UTF8 = 1524963;
const BASE_LF = 25891;
const BASE_SHA256 = 'cad874aeadb31e613487488a54ab9bcd92043bf8478084f55c148638dc1df900';
const BASE_LOCAL_SCRIPTS = 80;

// Pinned extracted document — the figures audit #464 predicted before the move.
const EXTRACTED_CHARS = 1491306;
const EXTRACTED_UTF8 = 1520056;
const EXTRACTED_LF = 25802;
const EXTRACTED_SHA256 = '088c2808f2668e6c47489729119a7baa880938835e1c6b112e1236222765abb8';
const EXTRACTED_LOCAL_SCRIPTS = 81;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1139980;
const RAW_END = 1144930;
const RAW_CHARS = 4950;
const RAW_SHA256 = 'e727b564eb69ba976f357fa440fea0b3ff53a14e532f8190846e7b7b7b2071f1';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4949;
const MODULE_UTF8 = 4967;
const MODULE_LF = 89;
const MODULE_SHA256 = '36dd908bed13d42361d6fcae84d0ea8a6f447295765609fe7409e43a669c1913';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1144929;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 1,025,316 units earlier in the document, so once it is removed every
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

function undoDxlinkGreeksFetch(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,950 units, not 4,949. The UTF-8
  //    length EXCEEDS the UTF-16 length by 18: this module is not pure ASCII,
  //    which its own opening banner rule alone settles.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the journal map audit owner
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('DXLINK_GREEKS_FETCH_UNDO_BASE_IDENTITY');
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
  isApplied, undoDxlinkGreeksFetch,
};
