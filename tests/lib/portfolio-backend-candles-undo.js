'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio backend candles — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1441121,1448940) in monolith coordinates in dev-clean @ dd682ec, holding a
// SINGLE owner:
//
//     // ── FF_BACKEND_CANDLES_PORTFOLIO_CHARTS helper   1 owner, 7,818 units
//
// The owner is `_portfolioFetchBackendCandlesForChart`, an async function of
// 6,905 units spanning [912,7817). The other 913 units are the 912 of banner
// and comment that open the region and the single trailing newline.
//
// THE BOUNDARY IS THE JUDGEMENT, AND HERE IT DISAGREES WITH THE SCREEN. The
// banner-to-banner region this cut sits inside runs to 1450000 and scored the
// LOWEST crossings of all 41 regions audit #433 screened — one. It is also
// UNEXTRACTABLE. Its last 1,060 units are a dev-only console helper introduced
// by a TOP-LEVEL `if` that CALLS two monolith-declared functions,
// `ffBackendCandlesPortfolioCharts()` and `ffBackendCandleParityDebug()`.
// Module tags load BEFORE the inline monolith, so that `if` would throw at
// load. The permanent contract asserts the whole region failing in an empty VM
// with that exact message, and this module loading in one.
//
// So the cut stops after the declaration and leaves the debug block inline.
// That is NOT the dead rule "regions end at their last declaration" — that rule
// is pinned as dead in §6 of the seam contract, against
// js/services/journal-backend-write-through.js, which ends on 4,878 units of
// trailing top-level code and DID move. The reason here is specific: what
// follows runs at load and depends on the monolith.
//
// WHAT NARROWING COST AND BOUGHT, both measured. It cost exactly one edge: the
// debug block's call became external, 1 → 2. It bought a body that loads bare,
// and it dropped the monolith dependencies from THREE to ONE, because the two
// feature-flag functions were referenced only by the block left behind.
//
// A SEAM THAT IS NOT A BANNER IS NOT NEW. Of the ten layers before this one
// that record a single raw range, EIGHT have a banner seam and TWO do not —
// tt-reconnect and apex-post-auth-init. What differs here is the reason: those
// two are followed immediately by another feature's code, this one by its OWN
// feature's debug block.
//
// STATE COUPLING IS ZERO IN BOTH DIRECTIONS. Two external edges over one name,
// both inside function bodies — call time; zero references from generated
// markup; zero inbound writes, which is vacuous because the region owns no
// binding, and that vacuity is exactly why outbound is measured too. Outbound
// is zero as well: it writes no binding it does not own.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1554826,1562644)  7,818 units, ends `}\n`
//   separator  [1562644,1562645)  exactly one LF
//
// (document coordinates; the monolith itself begins at 113705.)
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoPortfolioBackendCandles(indexHtml, moduleSource) reconstructs
// dev-clean @ dd682ec exactly, or throws.
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
// Individual CLAUSES are a weaker claim than individual errors, and mutation
// testing says so: deleting the `moduleSource.length` clause, or the
// `digest(html)` clause, changes nothing observable, because each sits in a
// conjunction whose other members already reject the same inputs. That is
// defence in depth, not coverage, and it is not asserted to be more. The one
// direction that IS isolated is the direction that matters — the module hash is
// reached by a SAME-LENGTH, same-byte, same-line-count probe, so a disabled
// hash check cannot hide behind the size check.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-rich-snapshot.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #433 audit commit this layer was measured against.
const BASE_CHARS = 1602259;
const BASE_UTF8 = 1632605;
const BASE_LF = 27944;
const BASE_SHA256 = '6db6f8fd99da797003ca89e022ead159524bfbd4febbe0b54b0523f4fd001fa1';
const BASE_LOCAL_SCRIPTS = 65;

// Pinned extracted document — the figure audit #433 predicted before the move.
const EXTRACTED_CHARS = 1594508;
const EXTRACTED_UTF8 = 1624784;
const EXTRACTED_LF = 27797;
const EXTRACTED_SHA256 = '37703d19026490a5d830caa20f6afa9e08f859b5db749acc378c51bfa4865d00';
const EXTRACTED_LOCAL_SCRIPTS = 66;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1554826;
const RAW_END = 1562645;
const RAW_CHARS = 7819;
const RAW_SHA256 = '94b543d53e652837e7e4f47bfbf7c7c7aa9e4a01d3784533317f48cc70e373d3';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 7818;
const MODULE_UTF8 = 7888;
const MODULE_LF = 147;
const MODULE_SHA256 = '8d16bf8512f35a144bb5867cc135fba011636a199edeadf0cb5451ec8db3c8d8';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1562644;
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

function undoPortfolioBackendCandles(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 7,819 units, not 7,818.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after journal-rich-snapshot.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_BACKEND_CANDLES_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioBackendCandles,
};
