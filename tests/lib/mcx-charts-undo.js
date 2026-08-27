'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX charts / lifecycle — byte-exact undo of the owner-cohesive extraction.
//
// WHAT THIS LAYER MOVED. Unlike every earlier owner in this series, the MCX
// charts cut is NOT one contiguous slice. The "MARKET CONTEXT AGENT (MCX)"
// section carries, 825 characters in, a top-level
//
//     window.addEventListener('resize', function(){ ... });
//
// — a load-time side effect. A module carrying it would not evaluate before its
// dependencies exist. So the section was cut into six fragments: three MOVED
// into js/ui/mcx-charts.js, two RETAINED inline (the listener and the one
// variable private to it), and one structural separator LF removed.
//
//   1 [1882013,1882239)  MOVED     banner + state owners up to the timer
//   2 [1882239,1882272)  RETAINED  var _mcxResizeTimer = null;
//   3 [1882272,1882838)  MOVED     the remaining state owners
//   4 [1882838,1883014)  RETAINED  the resize listener, byte-for-byte
//   5 [1883014,1926728)  MOVED     the declarations-only tail
//   6 [1926728,1926729)  SEPARATOR one LF
//
// The module is fragments 1 + 3 + 5 concatenated, so reconstruction is a WEAVE,
// not an insertion: the two retained fragments are spliced back into the module
// at its two internal weave points, 226 (= |1|) and 792 (= |1| + |3|).
//
// THE SEPARATOR LF. Fragment 6 is the blank-line separator between the MCX
// section and the EIC banner — document structure, not module content. Keeping
// it out of the module is what lets the module end on a real line of code, so
// `git diff --check` sees no blank line at EOF. Reconstruction re-inserts it.
//
// Contract: undoMcxCharts(indexHtml, moduleSource) reconstructs
// dev-clean @ 08adbc22cb90c19ae7942428785edde3db7461b5 exactly, or throws.
//
// FAIL CLOSED. Every guard below rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a mutated or truncated module, mutated
// retained glue, a partially applied state, or foreign content anywhere in the
// retained document all raise instead of returning an approximate
// reconstruction. There is no "best effort" path.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/mcx-charts.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/mcx-macro-check.js"></script>\n';

// Pinned base: the merged #407 audit commit this layer was measured against.
const BASE_CHARS = 1928890;
const BASE_SHA256 = '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96';
// Pinned extracted document.
const EXTRACTED_CHARS = 1884429;
const EXTRACTED_SHA256 = 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e';

// The whole range index.html gave up, in base coordinates.
const SECTION_AT = 1882013;
const SECTION_END = 1926729;

// The module: fragments 1 + 3 + 5.
const MODULE_CHARS = 44506;
const MODULE_SHA256 = '7337dba0ea08e5850899b539471003d4d7aa5dcb67006e0a3b49f187a1a98daa';
// Internal weave points: where the retained fragments splice back in.
const WEAVE_1 = 226;
const WEAVE_2 = 792;
const MOVED_PREFIX_1_SHA256 = '56b2567b3f52c8b8f1017a5e8d1ffa68ec2a5b92997e43a19b61c6619f9f60fb';
const MOVED_PREFIX_2_SHA256 = 'c1ec4d1f30c17d6dbf52f0daba7b539fa8e64d7ee90d9221ccb712a34b7d24cd';
const MOVED_TAIL_SHA256 = 'daa0a165ef06abc401238ed2eb84a70d3e41a0439d070ad26e540220d0a0897d';

// The retained glue: fragments 2 + 4, left inline at the pinned offset. In the
// tag-free extracted document the glue sits at exactly the base section offset,
// because every byte before it is unchanged.
const GLUE_AT = SECTION_AT;
const GLUE_CHARS = 209;
const GLUE_SHA256 = 'bca3dcbe07f48d7dfa0b640eb81bd6fa30bf8a035b324c354ab47e6c580eed62';
const TIMER_DECL_CHARS = 33;
const TIMER_DECL_SHA256 = 'b425ae3f21ef5671d0206b13498a14c354905fb199530a6764c4eaf2570e8504';
const LISTENER_CHARS = 176;
const LISTENER_SHA256 = '5194c5dd7a320f3ffe42efa9ca7e4eed28b37cb0977c3ac1be0fb71a2ec2a3ff';

const SEPARATOR = '\n';

function digest(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) {
    total++;
    at += needle.length;
  }
  return total;
}
function isApplied(html) {
  return typeof html === 'string' && count(html, TAG) === 1;
}

function undoMcxCharts(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('MCX_CHARTS_UNDO_BAD_INPUT');
  }
  // 1. The module has exactly the measured length. A truncated, padded or
  //    foreign module stops here.
  if (moduleSource.length !== MODULE_CHARS) {
    throw new Error('MCX_CHARTS_UNDO_MODULE_IDENTITY');
  }
  // 2. Its two internal weave points really do separate the three moved
  //    fragments, each with its own pinned hash. A module whose fragments were
  //    reordered, or mutated anywhere, fails HERE — with the error that names
  //    the weave — rather than only at the whole-file hash below.
  if (digest(moduleSource.slice(0, WEAVE_1)) !== MOVED_PREFIX_1_SHA256 ||
      digest(moduleSource.slice(WEAVE_1, WEAVE_2)) !== MOVED_PREFIX_2_SHA256 ||
      digest(moduleSource.slice(WEAVE_2)) !== MOVED_TAIL_SHA256) {
    throw new Error('MCX_CHARTS_UNDO_WEAVE_IDENTITY');
  }
  // 2b. The whole-file hash. The three fragment ranges above partition the
  //     module exactly, so a source that passes them and has the pinned length
  //     is already byte-identical: this is a redundant final gate on the
  //     module, kept deliberately so the pinned MODULE_SHA256 is enforced
  //     directly and not only through its parts.
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('MCX_CHARTS_UNDO_MODULE_IDENTITY');
  }
  // 3. Exactly one charts tag, loaded immediately after the macro-check tag. A
  //    missing tag, a duplicate, or a reordered tag is rejected here — each
  //    with its OWN error, so a caller learns which degenerate state it hit
  //    rather than only that the document is not the expected one.
  if (count(html, TAG) !== 1) throw new Error('MCX_CHARTS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('MCX_CHARTS_UNDO_TAG_ADJACENCY');

  const tagAt = html.indexOf(TAG);
  const untagged = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);

  // 4. The retained glue really is at the pinned offset, byte for byte.
  if (GLUE_AT + GLUE_CHARS > untagged.length) throw new Error('MCX_CHARTS_UNDO_GLUE_OFFSET');
  const glue = untagged.slice(GLUE_AT, GLUE_AT + GLUE_CHARS);
  if (glue.length !== GLUE_CHARS || digest(glue) !== GLUE_SHA256) {
    throw new Error('MCX_CHARTS_UNDO_GLUE_IDENTITY');
  }
  const timerDecl = glue.slice(0, TIMER_DECL_CHARS);
  const listener = glue.slice(TIMER_DECL_CHARS);
  if (timerDecl.length !== TIMER_DECL_CHARS || digest(timerDecl) !== TIMER_DECL_SHA256 ||
      listener.length !== LISTENER_CHARS || digest(listener) !== LISTENER_SHA256) {
    throw new Error('MCX_CHARTS_UNDO_GLUE_FRAGMENTS');
  }

  // 5. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE outside the regions checked above.
  if (html.length !== EXTRACTED_CHARS || digest(html) !== EXTRACTED_SHA256) {
    throw new Error('MCX_CHARTS_UNDO_EXTRACTED_IDENTITY');
  }

  // 6. The weave: module fragment, timer declaration, module fragment,
  //    listener, module fragment, separator, then the untouched EIC-and-later
  //    tail.
  const rebuilt =
    untagged.slice(0, GLUE_AT) +
    moduleSource.slice(0, WEAVE_1) +
    timerDecl +
    moduleSource.slice(WEAVE_1, WEAVE_2) +
    listener +
    moduleSource.slice(WEAVE_2) +
    SEPARATOR +
    untagged.slice(GLUE_AT + GLUE_CHARS);

  // 7. The final gate: the reconstruction is accepted only when it IS the
  //    pinned base, byte for byte. A partially applied extraction, a mutated
  //    retained document, or foreign content anywhere fails here rather than
  //    being returned.
  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('MCX_CHARTS_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG, SEPARATOR,
  BASE_CHARS, BASE_SHA256,
  EXTRACTED_CHARS, EXTRACTED_SHA256,
  SECTION_AT, SECTION_END,
  MODULE_CHARS, MODULE_SHA256,
  WEAVE_1, WEAVE_2,
  MOVED_PREFIX_1_SHA256, MOVED_PREFIX_2_SHA256, MOVED_TAIL_SHA256,
  GLUE_AT, GLUE_CHARS, GLUE_SHA256,
  TIMER_DECL_CHARS, TIMER_DECL_SHA256,
  LISTENER_CHARS, LISTENER_SHA256,
  isApplied, undoMcxCharts,
};
