'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO BACKEND SQUEEZE EXTRACT — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/portfolio/portfolio-backend-squeeze-extract.js,
// it returns the index.html that merged with #515 and that #516 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1021660,1024582) in document coordinates, holding ONE top-level owner, synchronous:
// `_extractBackendSqueezeByTicker`, which takes a list of tickers, a technical-refresh
// response and a source tag, and returns `{ byTicker, reasonByTicker }`: for each ticker
// the squeeze the backend itself emitted inside `technical['1D'|'4H']`, or the backend's
// own reason when none was sourced. It computes nothing, reads two functions of the
// monolith and writes nothing.
//
// 54 lines: 42 of code and 12 of comment, ZERO blank and ZERO top-level statements. One
// function declaration is the whole of its top-level shape, so it ships no mutable
// binding of its own. It is NOT pure ASCII: two em dashes, both in comments, make its
// UTF-8 length 2,925 against 2,921 UTF-16 units, so the byte-count pin and the
// character-count pin are two pins that differ.
//
// THE CUT OPENS ON ITS DOCUMENTATION. The first line is the first of ten comment lines
// that describe the function, `// SQZ is candle-derived (BB-inside-KC compression)…`, and
// the declaration follows the tenth of them directly. The blank line above them stays in the
// monolith. After the move the closing brace of `_portfolioTechnicalRowMapFromResponse`,
// one blank line and the comment block of `_applyTechnicalRefreshEarnings` are adjacent:
// the join the monolith held once at the end of the block, now at the place the cut was
// made.
//
// ONE CONSUMER, TWO DEPENDENCIES. `refreshPositionsLive` calls the function once, from a
// callback, and nothing else names it: no sibling module, no object key, no markup. The
// monolith dependencies are `_portfolioTechnicalRowMapFromResponse` and
// `_technicalTfSqueezeState`, both functions read inside the body at CALL time: the block
// reads nothing while it is evaluated. It writes nothing and deletes nothing, and reaches
// the host through none of `window`, `document`, storage, `console`, timers or fetch.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as
// the layer before it did when it shipped. The single reference is inside a function body
// and the block itself runs nothing at load, so the position is not shown to be
// load-bearing for this layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1021660,1024581)   2,921 units, ending `}\n`
//   separator  [1024581,1024582)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-backend-squeeze-extract.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-regime-badge-html.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #515 commit this layer was measured against.
const BASE_CHARS = 1421811;
const BASE_UTF8 = 1450200;
const BASE_LF = 24556;
const BASE_SHA256 = '7bbcab4dbc71b14d408b529cb3364b9bae3228a52063f13868e317f7a9b6f5e2';
const BASE_LOCAL_SCRIPTS = 104;

// Pinned extracted document — INDEX_AFTER is the figure audit #516 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1418965;
const EXTRACTED_UTF8 = 1447350;
const EXTRACTED_LF = 24502;
const EXTRACTED_SHA256 = '886a1f7841943d84a486a469478329a912b5b1d9eff5efe760d8ca72249f5e25';
const EXTRACTED_LOCAL_SCRIPTS = 105;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1021660;
const RAW_END = 1024582;
const RAW_CHARS = 2922;
const RAW_SHA256 = '8a426d82969f8bccb7c42c677829643434732f0a7f4afeb425f27a7f7a503c57';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 2921;
const MODULE_UTF8 = 2925;
const MODULE_LF = 54;
const MODULE_SHA256 = 'd3b178447969a3034c674827ceec7e4825e539ba9b5828711a5a7b689800f49c';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1024581;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 905,374 units earlier in the document, so once it is removed every byte
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

function undoPortfolioBackendSqueezeExtract(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 2,922 units, not 2,921. Its UTF-8
  //    length (2,925) differs from its UTF-16 length by two em dashes; both are
  //    pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the regime badge HTML tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_BACKEND_SQUEEZE_EXTRACT_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioBackendSqueezeExtract,
};
