'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio data fetch — byte-exact undo of the audited Candidate P extraction.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [196604,216154) in dev-clean @ 8e6b01b8, holding exactly four owners — and
// NOT ONE `var`:
//
//     async function fetchPortfolioData()    4,212 units — balances + positions
//     function renderPortfolioPanel()       12,635 units — the panel itself
//     async function showAccountPanel()        860 units — opens it, arms the timer
//     async function showIVPanel(ticker)     1,763 units — the IVR side panel
//
// THREE OF FOUR ARE ASYNC, a first for this family. Audit #420 established that
// this is not a load-time hazard: the block has zero top-level calls, reads no
// dependency at evaluation time, has no top-level `await`, and evaluates in a
// completely empty VM defining nothing but its own four owners. Async is a
// property of the functions, not of loading them.
//
// WHY THIS REGION. The screen that chose it measures state coupling in BOTH
// directions. The earlier screen measured only what is written INTO a region
// from outside, which is blind to a region that declares no `var` and writes
// globals it does not own — and that blindness nearly picked a region doing
// exactly that. Of the 22 sections over 15,000 units, only THREE are clean both
// ways, and this is the least entangled of the three.
//
// TWO CANDIDATES were measured. P (this one) takes all four owners; Q stopped
// after `renderPortfolioPanel`. Q is smaller and carries fewer dependencies but
// leaves MORE external edges — 7 against 4 — because `renderPortfolioPanel`
// calls both panel openers, so cutting them out converts internal calls into
// boundary crossings. Q would also strand `onclick="showAccountPanel()"`, the
// one static markup handler.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [196604,216153)  19,549 units, ends `}\n`
//   separator  [216153,216154)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoPortfolioDataFetch(indexHtml, moduleSource) reconstructs
// dev-clean @ 8e6b01b8460116fb2ec59bf1e84e6c8ff38229d1 exactly, or throws.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a
// module ending on a blank line, a truncated or mutated module, a document too
// short, an already-unextracted document, a partially applied state, or foreign
// content anywhere all raise. There is no "best effort" path.
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

const TAG = '<script src="./js/portfolio/portfolio-data-fetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/journal-trade-detail.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #420 audit commit this layer was measured against.
const BASE_CHARS = 1765976;
const BASE_UTF8 = 1799021;
const BASE_LF = 30869;
const BASE_SHA256 = '4c37a2ac130c753a1100d6633df688bc6f97ae429535f0b3d86a64fa7bf96be9';
const BASE_LOCAL_SCRIPTS = 59;

// Pinned extracted document — the figure audit #420 predicted before the move.
const EXTRACTED_CHARS = 1746489;
const EXTRACTED_UTF8 = 1779224;
const EXTRACTED_LF = 30539;
const EXTRACTED_SHA256 = '124d838e3974cf40b5d97c18fec767233c8655114dcb0dd1282c8da5537bedee';
const EXTRACTED_LOCAL_SCRIPTS = 60;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 196604;
const RAW_END = 216154;
const RAW_CHARS = 19550;
const RAW_SHA256 = 'f657460dacd04a99fde7c76ad0efd70cb16b7aa0e645ba3fab047e262d9cd016';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 19549;
const MODULE_UTF8 = 19859;
const MODULE_LF = 330;
const MODULE_SHA256 = 'c7d95a14ef17d7d1a92d7aba934702ef645fe3cf8302c1db3a01a7938b7a660e';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 216153;
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

function undoPortfolioDataFetch(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 19,550 units, not 19,549.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one portfolio tag, loaded immediately after
  //    journal-trade-detail.js and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('PORTFOLIO_DATA_FETCH_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('PORTFOLIO_DATA_FETCH_UNDO_TAG_ADJACENCY');
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_DATA_FETCH_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioDataFetch,
};
