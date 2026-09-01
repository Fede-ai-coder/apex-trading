'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal trade forms — byte-exact undo of the audited Candidate F extraction.
//
// WHAT THIS LAYER MOVED. TWO contiguous raw fragments of the inline monolith,
// each behind its own `}\n\n` seam and opening on its own banner, in
// dev-clean @ 70770ed9:
//
//   [1351203,1352703)   1,500 units   the chain-aware JT leg handlers
//   [1718831,1765492)  46,661 units   Manual Entry + Adjustment
//
// This is the first TWO-FRAGMENT layer in this family. Every layer below it cut
// one contiguous block; this one cuts two, so the module carries an internal
// join and the undo has to put each fragment back at its own offset.
//
// WHY TWO. Audit #414 measured the obvious cut — the contiguous Manual Entry +
// Adjustment pair left behind by #413 — and found it would ship a module whose
// own mutable state is written from outside it: `_onJtLegExpChange` and
// `_onJtLegStrikeChange` write into `_jtFormLegs` twelve times, deeply
// (`_jtFormLegs[idx].expiry = …`). Those two handlers have NO executable
// consumer anywhere; each is reached only by an onchange attribute that
// `_renderJtLegsTable` generates. Absorbing them costs 1,500 units and adds no
// dependency — the module's free-dependency inventory is identical either way —
// and it removes 22 executable edges and every external write:
//
//                              pair only    with handlers
//     external code sites          38            16
//     cross-boundary state         29            10
//       …of which WRITES           12             0
//
// THE SEPARATOR MODEL, unchanged: each raw fragment is body + one structural LF
// and ends `}\n\n`. Both parts leave index.html; only the bodies are written to
// the module, joined by a single LF, so the file ends on a real line of code and
// `git diff --check` sees no blank line at EOF. The two structural separators
// are document structure, not module content, and the undo re-inserts them.
//
// THE INTERNAL JOIN. The module is handlerBody + "\n" + formsBody. The join sits
// at offset 1,499 — exactly the handler body's length — and is pinned, so a
// module rebuilt with the fragments swapped, or joined by the wrong byte, is
// rejected rather than silently reassembled into the wrong document.
//
// Contract: undoJournalTradeForms(indexHtml, moduleSource) reconstructs
// dev-clean @ 70770ed97062497b7b189d546b29d92158df8849 exactly, or throws.
//
// FAIL CLOSED. A missing, duplicated or reordered tag; a module of the wrong
// size, hash, join or ending; a document that is too long, already unextracted,
// partially applied, or carries foreign content anywhere — all raise. There is
// no "best effort" path.
//
// REACHABILITY. Every error except the closing BASE_IDENTITY is reachable by an
// ordinary mutant, and the permanent contract exercises each with a control
// asserting its EXACT message: BAD_INPUT, MODULE_IDENTITY, MODULE_SEPARATOR,
// MODULE_JOIN, TAG_IDENTITY, TAG_ADJACENCY, EXTRACTED_IDENTITY. BASE_IDENTITY is
// a deliberate redundant final gate, kept so the pinned base identity is
// enforced on the value actually returned rather than inferred from its inputs,
// exactly as tests/lib/journal-close-legs-undo.js documents for its own.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/journal-trade-forms.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/journal-close-legs.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #414 audit commit this layer was measured against.
const BASE_CHARS = 1863130;
const BASE_UTF8 = 1897113;
const BASE_LF = 32721;
const BASE_SHA256 = '8e52b9a882b29c3097c4bc6031c90349be4fffba481710a909b6f6f8695b4721';
const BASE_LOCAL_SCRIPTS = 57;

// Pinned extracted document.
const EXTRACTED_CHARS = 1815024;
const EXTRACTED_UTF8 = 1848827;
const EXTRACTED_LF = 31737;
const EXTRACTED_SHA256 = '7e0851ae220daa6454cf2f3f093821b29c8aff8ba137cb0bbef24283bb976156';
const EXTRACTED_LOCAL_SCRIPTS = 58;

// The two raw ranges index.html gave up, in base coordinates. Exported as pins
// for the permanent contract to check against the base blob; deliberately NOT
// re-checked at runtime, because the module hash already determines them.
const HANDLERS_AT = 1351203;
const HANDLERS_END = 1352703;
const HANDLERS_RAW_CHARS = 1500;
const HANDLERS_RAW_SHA256 = 'cbd7463dafc92da0a460a96b2a51228ab668b0d11855f8b3f8a428da5e520c85';
const HANDLERS_BODY_CHARS = 1499;
const HANDLERS_BODY_SHA256 = 'bc568b87ca4b3ea6f05896ebf904dfd0dffc240025ba44dd1a398dd3b3c94993';

const FORMS_AT = 1718831;
const FORMS_END = 1765492;
const FORMS_RAW_CHARS = 46661;
const FORMS_RAW_SHA256 = 'ec16ed3caf80d7da50e6a239eb8dce48ddf9a447be8353b46e05af46cd8ac914';
const FORMS_BODY_CHARS = 46660;
const FORMS_BODY_SHA256 = '4ace9380e0cd021836dfc4fc68b0eb4c3dbb8c7b97f98a657fd44ec94b434f7d';

// The module: the two bodies in document order, joined by one LF.
const MODULE_CHARS = 48160;
const MODULE_UTF8 = 48340;
const MODULE_LF = 984;
const MODULE_SHA256 = 'e10f84094a435d07ff49461c2ace24c89aadb25193afa8c5cb33dece16d64a54';
const MODULE_JOIN_AT = HANDLERS_BODY_CHARS;

const SEPARATOR = '\n';
const HANDLERS_SEPARATOR_AT = 1352702;
const FORMS_SEPARATOR_AT = 1765491;

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

function undoJournalTradeForms(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that absorbed a structural
  //    separator, because that module is not 48,160 units.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code, with no blank line at EOF.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_MODULE_SEPARATOR');
  }
  // 3. The internal join is exactly one LF at the pinned offset. This is the
  //    check that catches a module assembled with the fragments SWAPPED: that
  //    mutant has the same length and the same LF count, so no size or count
  //    guard can see it, but offset 1,499 then falls in the middle of a line.
  if (moduleSource[MODULE_JOIN_AT] !== SEPARATOR) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_MODULE_JOIN');
  }
  // 4. Each half is the fragment it must be. A wrong half is an IDENTITY
  //    problem, not a join problem — the difference matters to a caller, who
  //    otherwise cannot tell a corrupted assembly from edited content. Checking
  //    the halves before the whole also names WHICH fragment is wrong, which a
  //    single whole-module hash never could.
  const handlersBody = moduleSource.slice(0, MODULE_JOIN_AT);
  const formsBody = moduleSource.slice(MODULE_JOIN_AT + 1);
  if (handlersBody.length !== HANDLERS_BODY_CHARS || digest(handlersBody) !== HANDLERS_BODY_SHA256 ||
      formsBody.length !== FORMS_BODY_CHARS || digest(formsBody) !== FORMS_BODY_SHA256 ||
      digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_MODULE_IDENTITY');
  }

  // 4. Exactly one trade-forms tag, loaded immediately after journal-close-legs.js
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_TRADE_FORMS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('JOURNAL_TRADE_FORMS_UNDO_TAG_ADJACENCY');
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_TAG_ADJACENCY');
  }

  // 5. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline at either cut.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_EXTRACTED_IDENTITY');
  }

  // 6. Remove the tag and its LF. The tag sits far earlier than both cuts, so
  //    once it is gone every byte before the first fragment is unchanged and the
  //    base offsets apply directly.
  const tagAt = html.indexOf(TAG);
  const untagged = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);

  // 7. Re-insert body + separator at each fragment's own offset, ASCENDING.
  //    Order matters: putting the earlier fragment back first leaves every byte
  //    before the later one exactly where the base has it, so the second offset
  //    needs no adjustment.
  const withHandlers =
    untagged.slice(0, HANDLERS_AT) +
    handlersBody + SEPARATOR +
    untagged.slice(HANDLERS_AT);
  const rebuilt =
    withHandlers.slice(0, FORMS_AT) +
    formsBody + SEPARATOR +
    withHandlers.slice(FORMS_AT);

  // 8. The final gate — deliberately redundant, kept so the pinned base identity
  //    is enforced on the value actually returned rather than inferred.
  if (rebuilt.length !== BASE_CHARS ||
      Buffer.byteLength(rebuilt, 'utf8') !== BASE_UTF8 ||
      lineFeeds(rebuilt) !== BASE_LF ||
      digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_TRADE_FORMS_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG, INLINE_OPEN, SEPARATOR,
  BASE_CHARS, BASE_UTF8, BASE_LF, BASE_SHA256, BASE_LOCAL_SCRIPTS,
  EXTRACTED_CHARS, EXTRACTED_UTF8, EXTRACTED_LF, EXTRACTED_SHA256, EXTRACTED_LOCAL_SCRIPTS,
  HANDLERS_AT, HANDLERS_END, HANDLERS_RAW_CHARS, HANDLERS_RAW_SHA256,
  HANDLERS_BODY_CHARS, HANDLERS_BODY_SHA256, HANDLERS_SEPARATOR_AT,
  FORMS_AT, FORMS_END, FORMS_RAW_CHARS, FORMS_RAW_SHA256,
  FORMS_BODY_CHARS, FORMS_BODY_SHA256, FORMS_SEPARATOR_AT,
  MODULE_CHARS, MODULE_UTF8, MODULE_LF, MODULE_SHA256, MODULE_JOIN_AT,
  isApplied, undoJournalTradeForms,
};
