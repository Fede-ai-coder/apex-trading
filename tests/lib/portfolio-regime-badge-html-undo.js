'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO REGIME BADGE HTML — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #514-era document and js/portfolio/portfolio-regime-badge-html.js,
// it returns the merged index.html at that commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [185129,187160) in document coordinates, holding ONE top-level owner, synchronous:
// `regimeHTML`, which returns the MARKET REGIME card the Portfolio panel opens with —
// the regime's label coloured by its volatility, a source and time line, an optional
// row of the four VIX-family readings, and a closing disclaimer. It reads two fields of
// `S`, `marketRegime` and `vixFamily`, and writes nothing.
//
// 32 lines: 28 of code, 2 of comment and 2 blank, and ZERO top-level statements.
// One function declaration is the whole of its top-level shape, so it ships no mutable
// binding of its own. It is NOT pure ASCII: four em dashes, two middle dots and thirty-two
// box-drawing characters make its UTF-8 length 2,104 against 2,030 UTF-16 units, and FOUR
// of those non-ASCII characters sit in string literals the function returns, not in
// comments — so the byte-count pin and the character-count pin are two pins that differ,
// and the markup is part of what the move preserves.
//
// THE CUT OPENS ON A BANNER. The first line is the `// ─── REGIME BADGE HTML` banner,
// three dashes, and the declaration follows it directly. The blank line above the banner
// stays in the monolith. The seam admits four openings and the cut takes the one on the
// banner, so after the move the closing brace of `computeMarketRegime`, one blank line and
// the declaration of `macdLabel` are adjacent: the join the monolith held once at the end of
// the block, now at the place the cut was made. `macdLabel`, the only other owner of the
// region, falls into the region above.
//
// ONE CONSUMER, ONE SIBLING, ONE DEPENDENCY. `renderPositionsPanel` calls `regimeHTML()`
// once, as the last operand of a string concatenation, and the sibling module
// js/portfolio/portfolio-data-fetch.js calls it once more inside `renderPortfolioPanel`.
// The monolith dependency is `S`, a `const` read inside the body at CALL time: the block
// reads nothing while it is evaluated. It writes nothing and deletes nothing, and reaches
// the host through neither `window`, `document` nor `console`.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as
// the layer before it did when it shipped. Both references to the function are inside function bodies and the
// block itself runs nothing at load, so the position is not shown to be load-bearing for this
// layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [185129,187159)   2,030 units, ending `}\n`
//   separator  [187159,187160)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; WHICH older layers
// have no separator concept at all is recorded by the reconstruction bridge and
// deliberately not restated here.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a module
// that does not end on a line of code, a truncated or mutated module, an already
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
// Two are not, and are kept because they name their failure where it happens —
// the treatment tests/lib/vega-monitor-undo.js and
// tests/lib/strategy-templates-undo.js already record:
//
//   - `count(html, ANCHOR_TAG + TAG) !== 1` — the tag-identity check above it
//     already fixes `count(html, TAG)` at exactly 1, so the pair cannot occur
//     twice; and when the tag is moved away from the anchor the pair occurs
//     ZERO times, which the longer `ANCHOR_TAG + TAG + INLINE_OPEN` check below
//     rejects with the SAME error. TAG_ADJACENCY stays reachable through that
//     second check, which is what the contract's control exercises.
//   - `moduleSource.endsWith('\n\n')` in the separator guard — `endsWith` tests
//     the final units, so a module that re-absorbed the separator ends `}\n\n`
//     and already fails the `}\n` clause beside it. Here it cannot fire at all:
//     the clauses are disjoint, since a string ending `}\n` does not end
//     `\n\n`.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
//
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/portfolio-regime-badge-html.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-expiry-audit.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #513 commit this layer was measured against.
const BASE_CHARS = 1423772;
const BASE_UTF8 = 1452235;
const BASE_LF = 24588;
const BASE_SHA256 = 'd295ec3b92834eb094f34affc205ab32fb0ae8f3b94093fa5e4fe472f7e50da5';
const BASE_LOCAL_SCRIPTS = 103;

// Pinned extracted document — INDEX_AFTER is the figure audit #514 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1421811;
const EXTRACTED_UTF8 = 1450200;
const EXTRACTED_LF = 24556;
const EXTRACTED_SHA256 = '7bbcab4dbc71b14d408b529cb3364b9bae3228a52063f13868e317f7a9b6f5e2';
const EXTRACTED_LOCAL_SCRIPTS = 104;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 185129;
const RAW_END = 187160;
const RAW_CHARS = 2031;
const RAW_SHA256 = '00089bcb2f54e4a2feb28d50e93ef1be2978693d62a45683f97d917ef35a4641';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 2030;
const MODULE_UTF8 = 2104;
const MODULE_LF = 32;
const MODULE_SHA256 = 'b396ef8dd3c7449e49532914829a575479d17dca93dc58c86dbe7fbf7f1560a5';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 187159;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 68,913 units earlier in the document, so once it is removed every byte
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

function undoPortfolioRegimeBadgeHtml(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 2,031 units, not 2,030. Its UTF-8
  //    length (2,104) differs from its UTF-16 length by four em dashes, two middle dots
  //    and thirty-two box-drawing characters; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the journal expiry audit tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_REGIME_BADGE_HTML_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioRegimeBadgeHtml,
};
