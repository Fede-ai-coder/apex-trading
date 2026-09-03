'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend-backed portfolios — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [938837,961587) in dev-clean @ 336a3391, holding sixteen owners — the backend
// portfolio API client and its sync layer:
//
//     async backendListPortfolios/Get/Create/Update/Delete   1,390 units total
//     _portfolioBackendUsable, _portfolioBackendSyncInFlight    373 units
//     async _syncPortfoliosFromBackend                        1,371 units
//     _portfolioOpenBackendLoad, async portfolioApplyUpdate    1,215 units
//     showNewPortfolioForm, async createPortfolio              2,199 units
//     async deletePortfolio                                    1,665 units
//     renderPortfolioView                                      8,663 units
//     getPortfolioJournalReconciliation                        1,378 units
//     viewLinkedTradesInJournal                                  641 units
//
// THE SEAM IS NOT A CLOSING BRACE. The region ends on a top-level STATEMENT:
//
//     window.viewLinkedTradesInJournal = viewLinkedTradesInJournal;
//
// so the body ends `;\n` and the raw fragment `;\n\n`. That is not a first, and
// checking rather than assuming is what showed it: FIFTEEN of the sixteen earlier
// layers end `}\n`, and journal-backend-write-through does not — it ends `})();`,
// the same layer whose trailing IIFE broke the old boundary rule. This is the
// second such seam, not the first. Audit #422 measured why it matters: stopping at the
// last DECLARATION, as the old written rule said, would have cut 62 units short
// and stranded that re-export inline, pointing at a function that had moved to a
// module. It would still have run, which is what made it dangerous.
//
// The rule is no longer prose. `tests/lib/extraction-boundary.js` carries the
// mechanical half — `snapBodyEnd` and a fail-closed `assertSeam` — and its
// contract verifies both against five real historical boundaries. This
// extraction was performed through `assertSeam`, so the seam below was accepted
// by the same code that guards the next one.
//
// WHY THIS REGION. The screen ranks on coupling and measures state in BOTH
// directions. Ten external edges — the smallest of the seven candidates audit
// #422 measured, against 18, 20, 23, 30, 35 and 77 — with zero inbound and zero
// outbound state coupling, and fourteen dependencies read 67 times, every one
// inside a declaration.
//
// EVALUATION-TIME BEHAVIOUR. The block carries twelve top-level statements: ten
// `window.X = X` re-exports and the two `try` wrappers around them. That is not
// new for the chain either — journal-backend-write-through already carried 85
// such lines, the same layer that is the exception on every other axis here. They call nothing, await nothing, and read no name the
// region does not own, so running them EARLIER in document order — which a
// module tag does — cannot change what they see. That is proved in the
// contract, not assumed here.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [938837,961586)  22,749 units, ends `;\n`
//   separator  [961586,961587)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoBackendPortfolios(indexHtml, moduleSource) reconstructs
// dev-clean @ 336a3391369d67d2a63721a720eb798814b72664 exactly, or throws.
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

const TAG = '<script src="./js/portfolio/backend-portfolios.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-data-fetch.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #422 audit commit this layer was measured against.
const BASE_CHARS = 1746489;
const BASE_UTF8 = 1779224;
const BASE_LF = 30539;
const BASE_SHA256 = '124d838e3974cf40b5d97c18fec767233c8655114dcb0dd1282c8da5537bedee';
const BASE_LOCAL_SCRIPTS = 60;

// Pinned extracted document — the figure audit #422 predicted before the move.
const EXTRACTED_CHARS = 1723800;
const EXTRACTED_UTF8 = 1756149;
const EXTRACTED_LF = 30123;
const EXTRACTED_SHA256 = '5e820b246f62b7e874d3ebe637a1b42b370fbe34698c8980d3781e47862c5ff5';
const EXTRACTED_LOCAL_SCRIPTS = 61;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 938837;
const RAW_END = 961587;
const RAW_CHARS = 22750;
const RAW_SHA256 = 'f2063b042fe5332c0e626c580b3373f3b5eb77bba0e7fdec843cb98594c36386';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 22749;
const MODULE_UTF8 = 23135;
const MODULE_LF = 416;
const MODULE_SHA256 = 'aca615f3e898a79a6c8e0cd7658bb75b3261e82fb88fb0220e3f0768bd4f4a7a';

// The last line of the module — pinned because it is the whole reason this
// layer's seam differs from every earlier one.
const MODULE_LAST_LINE = 'window.viewLinkedTradesInJournal = viewLinkedTradesInJournal;\n';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 961586;
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

function undoBackendPortfolios(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('BACKEND_PORTFOLIOS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 22,750 units, not 22,749.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('BACKEND_PORTFOLIOS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. NOTE the shape: this region ends on a
  //    statement, so the test is the pinned re-export line rather than `}\n`.
  //    A module carrying a trailing blank line is rejected with its OWN error,
  //    so a caller learns it re-absorbed the separator rather than only that
  //    some hash did not match.
  if (!moduleSource.endsWith(MODULE_LAST_LINE) || moduleSource.endsWith('\n\n')) {
    throw new Error('BACKEND_PORTFOLIOS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('BACKEND_PORTFOLIOS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one backend-portfolios tag, loaded immediately after
  //    portfolio-data-fetch.js and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('BACKEND_PORTFOLIOS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('BACKEND_PORTFOLIOS_UNDO_TAG_ADJACENCY');
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('BACKEND_PORTFOLIOS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('BACKEND_PORTFOLIOS_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('BACKEND_PORTFOLIOS_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG, INLINE_OPEN, SEPARATOR, SEPARATOR_AT, MODULE_LAST_LINE,
  BASE_CHARS, BASE_UTF8, BASE_LF, BASE_SHA256, BASE_LOCAL_SCRIPTS,
  EXTRACTED_CHARS, EXTRACTED_UTF8, EXTRACTED_LF, EXTRACTED_SHA256, EXTRACTED_LOCAL_SCRIPTS,
  RAW_AT, RAW_END, RAW_CHARS, RAW_SHA256,
  MODULE_CHARS, MODULE_UTF8, MODULE_LF, MODULE_SHA256,
  REINSERT_AT,
  isApplied, undoBackendPortfolios,
};
