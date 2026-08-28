'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Apex shared post-authentication lifecycle — byte-exact undo of the
// audited Candidate C extraction.
//
// WHAT THIS LAYER MOVED. One contiguous raw fragment of the inline monolith,
// [1874908,1879379) in dev-clean @ 852797ed, holding exactly one owner:
//
//     function _apexPostAuthInit(reason) { ... }
//
// — the post-authentication pipeline shared by the NORMAL login path and by
// doReconnectTT. The audit (#409) measured four candidate cuts and recommended
// this one because it is the only owner in that 9,224-unit block with two
// independent consumers, and because removing its complete raw fragment leaves
// the reconnect UI pair contiguous.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1874908,1879378)  4,470 units, ends `}\n`
//   separator  [1879378,1879379)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. The separator is document structure, not module content, and it
// is re-inserted HERE, by the undo — never left inline. Leaving it inline would
// strand one byte, change the extracted index hash, and break the audited
// contiguity of the retained reconnect pair.
//
// WHAT STAYED. showReconnectPanel and doReconnectTT remain inline and, with the
// fragment between them gone, are now contiguous: 4,753 units hashing to
// 53fba09f…, byte-identical to the audit's Candidate D raw fragment. This
// helper verifies that remainder at its pinned tag-free offset before it
// rebuilds anything, so a mutated or reordered reconnect UI is rejected rather
// than silently carried into the reconstruction.
//
// Contract: undoApexPostAuthInit(indexHtml, moduleSource) reconstructs
// dev-clean @ 852797ed03853e8d03d77b1da7a56e29fe60d467 exactly, or throws.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a
// module ending on a blank line, a truncated or mutated module, a document too
// short to hold the retained pair, a mutated or reordered retained reconnect
// pair, a partially applied state, or foreign content anywhere in the retained
// document all raise. There is no "best effort" path and no reconstruction is
// ever guessed.
//
// REACHABILITY. Every error below except the closing BASE_IDENTITY is reachable
// by an ordinary mutant, and the permanent contract exercises each one:
// BAD_INPUT, MODULE_IDENTITY (size and hash), MODULE_SEPARATOR, TAG_IDENTITY,
// TAG_ADJACENCY, RETAINED_OFFSET, RETAINED_IDENTITY and EXTRACTED_IDENTITY.
// BASE_IDENTITY is the deliberate redundant final gate described at step 7. A
// guard that cannot fire is not defence, so none is kept for appearance.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/apex-post-auth-init.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/mcx-charts.js"></script>\n';

// Pinned base: the merged #409 audit commit this layer was measured against.
const BASE_CHARS = 1884429;
const BASE_UTF8 = 1918599;
const BASE_LF = 33097;
const BASE_SHA256 = 'b5f6dd5b2fad6e1d3e0ce3fee4abf5cfb561c19de714e20f86874e49e10a857e';

// Pinned extracted document.
const EXTRACTED_CHARS = 1880019;
const EXTRACTED_UTF8 = 1914141;
const EXTRACTED_LF = 33036;
const EXTRACTED_SHA256 = '4d514626ec99e6306400f3ce8eb383629cb3ec9fd75798043cd8dc14a376ebe1';

// The raw range index.html gave up, in base coordinates: body + separator.
// Exported as pins for the permanent contract to check against the base blob;
// deliberately NOT re-checked at runtime (see the note in step 2).
const RAW_AT = 1874908;
const RAW_END = 1879379;
const RAW_CHARS = 4471;
const RAW_SHA256 = 'ed3bb60ec58df251b6b46b38c5f9d0501e11b51a1cfea25032c5ac05a31f5e25';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4470;
const MODULE_UTF8 = 4518;
const MODULE_LF = 61;
const MODULE_SHA256 = '690e47ce4d9ad8b656d5d95f0297a0e473847250a1186674d91caa1cd5297cd9';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1879378;

// The retained reconnect UI, now contiguous. In the tag-free extracted document
// it sits at exactly its base offset, because every byte before it is unchanged
// once the one added tag line is removed.
const RETAINED_AT = 1872835;
const RETAINED_CHARS = 4753;
const RETAINED_SHA256 = '53fba09f64e9663d3bcdbecd94fcbd75ef5bb389a6cbe6a69af56cd88b71093e';
// Where the module goes back, in tag-free coordinates: after the panel half of
// the retained pair, before the action half.
const REINSERT_AT = 1874908;

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
function lineFeeds(source) {
  return count(source, '\n');
}
function isApplied(html) {
  return typeof html === 'string' && count(html, TAG) === 1;
}

function undoApexPostAuthInit(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('APEX_POST_AUTH_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,471 units, not 4,470.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('APEX_POST_AUTH_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('APEX_POST_AUTH_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('APEX_POST_AUTH_UNDO_MODULE_IDENTITY');
  }
  // NOTE: there is deliberately no separate `body + separator === raw` runtime
  // guard here. Once the hash above passes, moduleSource IS the pinned module
  // byte for byte, so moduleSource + SEPARATOR is fully determined and such a
  // check could never fire — an unreachable guard that only looked like
  // defence. The raw fragment identity still matters, so it is pinned and
  // PROVED in tests/apex-post-auth-init-boundary-contract.test.js, where it is
  // measured against the base blob rather than re-derived from a value this
  // function already verified.

  // 3. Exactly one Apex post-auth tag, loaded immediately after mcx-charts.js.
  //    A missing tag, a duplicate, or a reordered tag is rejected here — each
  //    with its own error.
  if (count(html, TAG) !== 1) throw new Error('APEX_POST_AUTH_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('APEX_POST_AUTH_UNDO_TAG_ADJACENCY');

  const tagAt = html.indexOf(TAG);
  const untagged = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);

  // 4. The retained reconnect pair really is at the pinned tag-free offset,
  //    byte for byte. A mutated, reordered or partially extracted reconnect UI
  //    fails HERE, before anything is rebuilt.
  if (RETAINED_AT + RETAINED_CHARS > untagged.length) {
    throw new Error('APEX_POST_AUTH_UNDO_RETAINED_OFFSET');
  }
  const retained = untagged.slice(RETAINED_AT, RETAINED_AT + RETAINED_CHARS);
  if (retained.length !== RETAINED_CHARS || digest(retained) !== RETAINED_SHA256) {
    throw new Error('APEX_POST_AUTH_UNDO_RETAINED_IDENTITY');
  }

  // 5. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE outside the regions checked above — including a
  //    structural separator left stranded inline, which makes the document one
  //    byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('APEX_POST_AUTH_UNDO_EXTRACTED_IDENTITY');
  }

  // 6. Re-insert body + separator at the tag-free offset the fragment came
  //    from. The separator lives here, in the reconstruction, and nowhere else.
  const rebuilt =
    untagged.slice(0, REINSERT_AT) +
    moduleSource + SEPARATOR +
    untagged.slice(REINSERT_AT);

  // 7. The final gate. Like the MCX charts helper's closing check this is a
  //    DELIBERATE redundancy, not an independently reachable guard: once the
  //    module hash and the whole-document hash have both passed, the
  //    reconstruction is a pure function of two fixed byte strings. It is kept
  //    so the pinned base identity is enforced directly on the value actually
  //    returned, and never merely inferred from its inputs.
  if (rebuilt.length !== BASE_CHARS ||
      Buffer.byteLength(rebuilt, 'utf8') !== BASE_UTF8 ||
      lineFeeds(rebuilt) !== BASE_LF ||
      digest(rebuilt) !== BASE_SHA256) {
    throw new Error('APEX_POST_AUTH_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG, SEPARATOR, SEPARATOR_AT,
  BASE_CHARS, BASE_UTF8, BASE_LF, BASE_SHA256,
  EXTRACTED_CHARS, EXTRACTED_UTF8, EXTRACTED_LF, EXTRACTED_SHA256,
  RAW_AT, RAW_END, RAW_CHARS, RAW_SHA256,
  MODULE_CHARS, MODULE_UTF8, MODULE_LF, MODULE_SHA256,
  RETAINED_AT, RETAINED_CHARS, RETAINED_SHA256, REINSERT_AT,
  isApplied, undoApexPostAuthInit,
};
