'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Close Legs — byte-exact undo of the audited Candidate B extraction.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1740414,1752652) in dev-clean @ 754e3dd0, holding exactly six owners:
//
//     var _closeLegsTradeId                — the form's only mutable state
//     function showCloseLegsModal(tradeId) — opens the modal for a trade
//     function closeLegsModal()            — closes it
//     function _renderCloseLegsForm()      — renders the leg rows
//     function _clPnlPreview()             — live P&L preview
//     async function submitCloseLegs()     — submits the close
//
// Audit #412 measured this block as Candidate B and recommended it as the FIRST
// extraction of the Journal forms window, over Manual Entry (A), Adjustment (C)
// and the whole window (D). B was the only candidate with ZERO cross-boundary
// mutable state and ZERO executable-code consumers outside itself: computed
// over the window's eleven mutable owners, the split figures were A 95, B 0,
// C 66, D 29. So this is a plain contiguous slice with NO weave and no
// exposure glue — the two external edges are classic late-bound handlers that
// resolve the name at click time.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1740414,1752651)  12,237 units, ends `}\n`
//   separator  [1752651,1752652)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. The separator is document structure, not module content, and it
// is re-inserted HERE, by the undo — never left inline. Leaving it inline would
// strand one byte and change the extracted index hash.
//
// THE STEP-2 PAYOFF. B sat BETWEEN Manual Entry and Adjustment. Removing it
// makes those two physically contiguous — the audit predicted the remainder
// would be exactly A's raw bytes followed by C's raw bytes, 46,661 units
// hashing to ec16ed3c…, and the permanent contract proves that prediction held
// against the shipped document.
//
// Contract: undoJournalCloseLegs(indexHtml, moduleSource) reconstructs
// dev-clean @ 754e3dd04f011ca94694c350cbc3d0ae1c92a26b exactly, or throws.
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
// function of two fixed byte strings, so no ordinary mutant can reach it. It is
// kept so the pinned base identity is enforced on the value actually returned
// rather than inferred from its inputs, exactly as tests/lib/tt-reconnect-undo.js
// documents for its own closing check. There is deliberately NO runtime
// `body + separator === raw` guard: the module hash already determines it, so
// such a check could never fire. That fact is pinned and PROVED in the
// permanent contract against the base blob instead.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/journal-close-legs.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/tt-reconnect.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #412 audit commit this layer was measured against.
const BASE_CHARS = 1875314;
const BASE_UTF8 = 1909396;
const BASE_LF = 32951;
const BASE_SHA256 = '7dd13923b25053960fb8b26bcf0d2383ebe27abe0f7b66607fa5893478503dcd';
const BASE_LOCAL_SCRIPTS = 56;

// Pinned extracted document.
const EXTRACTED_CHARS = 1863130;
const EXTRACTED_UTF8 = 1897113;
const EXTRACTED_LF = 32721;
const EXTRACTED_SHA256 = '8e52b9a882b29c3097c4bc6031c90349be4fffba481710a909b6f6f8695b4721';
const EXTRACTED_LOCAL_SCRIPTS = 57;

// The raw range index.html gave up, in base coordinates: body + separator.
// Exported as pins for the permanent contract to check against the base blob;
// deliberately NOT re-checked at runtime (see the note in the header).
const RAW_AT = 1740414;
const RAW_END = 1752652;
const RAW_CHARS = 12238;
const RAW_SHA256 = 'dcc3de2aadd3944a875918bc553759a2faad3d5c168ac8bb9180e6cf9359118b';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 12237;
const MODULE_UTF8 = 12336;
const MODULE_LF = 230;
const MODULE_SHA256 = 'f43928cc65f576de51f535b69e3313c79a6c46c998c54f280342f9228a6a64db';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1752651;
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

function undoJournalCloseLegs(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 12,238 units, not 12,237.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one Close Legs tag, loaded immediately after tt-reconnect.js and
  //    immediately before the inline monolith. A missing tag, a duplicate, or a
  //    reordered tag is rejected here — each with its own error. An
  //    already-unextracted document has no tag and fails as TAG_IDENTITY.
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_CLOSE_LEGS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('JOURNAL_CLOSE_LEGS_UNDO_TAG_ADJACENCY');
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_EXTRACTED_IDENTITY');
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

  // 7. The final gate — deliberately redundant, as the header explains, and
  //    kept so the pinned base identity is enforced on the value actually
  //    returned rather than inferred from its inputs.
  if (rebuilt.length !== BASE_CHARS ||
      Buffer.byteLength(rebuilt, 'utf8') !== BASE_UTF8 ||
      lineFeeds(rebuilt) !== BASE_LF ||
      digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_CLOSE_LEGS_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalCloseLegs,
};
