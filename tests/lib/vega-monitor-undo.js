'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Vega monitor ratios — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [891660,893422) in monolith coordinates in dev-clean @ 6fb7aca, holding ONE
// owner:
//
//     // ── VEGA MONITOR RATIOS ──                     1,220 units of header
//     function computeVegaMonitorRatios(bwd, ag) { … }   540 units, pure
//
// 1,220 + 540 + 1 closing newline = 1,761. There is no second construct and no
// top-level statement. It is the SMALLEST module in the chain by a wide
// margin — the next smallest is journal-migration at 4,461 — and the FIFTH
// with a single owner.
//
// ONE REFERENCE IN THE ENTIRE APPLICATION, which is what put it first on a
// screen that now counts five directions. A single call, inside
// renderPositionsPanel, at monolith offset 914871. Nothing else in the
// monolith names it, none of the sixty-nine sibling modules does, and neither
// does the generated markup.
//
// THE INBOUND ZERO IS A MEASUREMENT, and stating that correctly is the point.
// `bindingNames` returns the EMPTY LIST here, because BINDING_FORMS is
// ['var','const','let'] and this region's owner is a function declaration.
// Audit #442 measured what that omission costs: `function f(){}; f = 42;`
// leaves f === 42, so a function declaration is an assignable binding and an
// outside write to it is perfectly legal. Four shipped contracts read the empty
// list as "owns no binding for a write to reach" and call their inbound zero
// VACUOUS on that basis; this contract does not repeat that. It asserts the
// assignability directly and reports the zero as the measurement it is.
//
// WHY IT COULD BE TAKEN. Zero on every other direction the screen counts:
// no outbound property write, no monolith dependency — both inputs arrive as
// PARAMETERS — no sibling reference, no markup reference, no top-level
// statement. It loads in a COMPLETELY empty VM, and it COMPUTES there: the
// ratios come out of its two arguments alone, and a zero denominator returns
// null rather than Infinity.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER'S FILE, and that is not a hazard
// here because its only consumer is the inline monolith itself, which loads
// last. This tag is the 70th and final local script (index 69 of 70), which is
// what the permanent contract pins as MODULE_POSITION.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1005624,1007385)  1,761 units, ends `}\n`
//   separator  [1007385,1007386)  exactly one LF
//
// (document coordinates; the monolith itself begins at 113964.)
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records. Its ending is `}\n`, which twenty-three of the twenty-six
// share.
//
// Contract: undoVegaMonitor(indexHtml, moduleSource) reconstructs dev-clean @
// 6fb7aca exactly, or throws.
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
// Individual CLAUSES are a weaker claim than individual errors, and the
// contract measures which are load-bearing by mutation rather than by reading.
// Two are not, and are kept because they name their failure where it happens:
//
//   - `count(html, ANCHOR_TAG + TAG) !== 1` — the tag-identity check above it
//     already fixes `count(html, TAG)` at exactly 1, so the pair cannot occur
//     twice, and the longer `ANCHOR_TAG + TAG + INLINE_OPEN` check below
//     rejects what is left. TAG_ADJACENCY stays reachable through that second
//     check, which is what the contract's control exercises.
//   - `moduleSource.endsWith('\n\n')` in the separator guard — `endsWith` tests
//     the final units, so a module that re-absorbed the separator ends `}\n\n`
//     and already fails the `}\n` clause beside it.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/portfolio-vega-monitor.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/config/strategy-templates.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #442 commit this layer was measured against.
const BASE_CHARS = 1569879;
const BASE_UTF8 = 1599759;
const BASE_LF = 27322;
const BASE_SHA256 = 'e12a8cb5a771a484b2bdfba2cc63fba5647299af433a770b83cd9aad8a6aa817';
const BASE_LOCAL_SCRIPTS = 69;

// Pinned extracted document — the figures audit #442 predicted before the move.
const EXTRACTED_CHARS = 1568182;
const EXTRACTED_UTF8 = 1597962;
const EXTRACTED_LF = 27291;
const EXTRACTED_SHA256 = '2ef534b3039ff7ec98cc46cbe54e01ccf48fd765ac07c3f583a4bd471e79a52a';
const EXTRACTED_LOCAL_SCRIPTS = 70;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1005624;
const RAW_END = 1007386;
const RAW_CHARS = 1762;
const RAW_SHA256 = '450ea1cb678e54335ce6802bb49c3de7298e0cfc5a044a485af00adbcb62dfd6';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1761;
const MODULE_UTF8 = 1861;
const MODULE_LF = 31;
const MODULE_SHA256 = '18fa3c94419cb14a388fd96594093be82324c12f333f77f0deaa331c279871cc';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1007385;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 891,668 units earlier in the document, so once it is removed every
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

function undoVegaMonitor(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('VEGA_MONITOR_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,762 units, not 1,761.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('VEGA_MONITOR_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('VEGA_MONITOR_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('VEGA_MONITOR_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after strategy-templates.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('VEGA_MONITOR_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('VEGA_MONITOR_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('VEGA_MONITOR_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('VEGA_MONITOR_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('VEGA_MONITOR_UNDO_BASE_IDENTITY');
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
  isApplied, undoVegaMonitor,
};
