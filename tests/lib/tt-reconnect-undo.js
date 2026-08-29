'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// TT reconnect UI — byte-exact undo of the audited Candidate D extraction.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1872896,1877649) in dev-clean @ dffad56a, holding exactly two owners:
//
//     function showReconnectPanel()        — renders the TT reconnect panel
//     async function doReconnectTT()       — submits the reconnect
//
// Audit #409 measured this block as Candidate D and found it NON-contiguous at
// the time: the shared post-auth lifecycle owner sat between the two halves, so
// extracting it then would have needed a weave at offset 2073. #410 removed
// that middle fragment, and its permanent contract proves what was left behind
// is byte-identical to Candidate D's raw fragment — 4,753 units hashing to
// 53fba09f…. So this extraction is a plain contiguous slice with NO weave.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1872896,1877648)  4,752 units, ends `}\n`
//   separator  [1877648,1877649)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. The separator is document structure, not module content, and it
// is re-inserted HERE, by the undo — never left inline. Leaving it inline would
// strand one byte and change the extracted index hash.
//
// Contract: undoTtReconnect(indexHtml, moduleSource) reconstructs
// dev-clean @ dffad56a68b8bb5744b6236d506825aefce9798d exactly, or throws.
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
// rather than inferred from its inputs, exactly as tests/lib/mcx-charts-undo.js
// documents for its own closing check. There is deliberately NO runtime
// `body + separator === raw` guard: the module hash already determines it, so
// such a check could never fire. That fact is pinned and PROVED in the
// permanent contract against the base blob instead.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/tt-reconnect.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/apex-post-auth-init.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #410 commit this layer was measured against.
const BASE_CHARS = 1880019;
const BASE_UTF8 = 1914141;
const BASE_LF = 33036;
const BASE_SHA256 = '4d514626ec99e6306400f3ce8eb383629cb3ec9fd75798043cd8dc14a376ebe1';
const BASE_LOCAL_SCRIPTS = 55;

// Pinned extracted document.
const EXTRACTED_CHARS = 1875314;
const EXTRACTED_UTF8 = 1909396;
const EXTRACTED_LF = 32951;
const EXTRACTED_SHA256 = '7dd13923b25053960fb8b26bcf0d2383ebe27abe0f7b66607fa5893478503dcd';
const EXTRACTED_LOCAL_SCRIPTS = 56;

// The raw range index.html gave up, in base coordinates: body + separator.
// Exported as pins for the permanent contract to check against the base blob;
// deliberately NOT re-checked at runtime (see the note in the header).
const RAW_AT = 1872896;
const RAW_END = 1877649;
const RAW_CHARS = 4753;
const RAW_SHA256 = '53fba09f64e9663d3bcdbecd94fcbd75ef5bb389a6cbe6a69af56cd88b71093e';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4752;
const MODULE_UTF8 = 4792;
const MODULE_LF = 85;
const MODULE_SHA256 = 'c380be901aeb8f60ab188707526754597f9f3f9dd73c20b624ac68b5b920ca05';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1877648;
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

function undoTtReconnect(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('TT_RECONNECT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,753 units, not 4,752.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('TT_RECONNECT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('TT_RECONNECT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('TT_RECONNECT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one reconnect tag, loaded immediately after apex-post-auth-init.js
  //    and immediately before the inline monolith. A missing tag, a duplicate,
  //    or a reordered tag is rejected here — each with its own error. An
  //    already-unextracted document has no tag and fails as TAG_IDENTITY.
  if (count(html, TAG) !== 1) throw new Error('TT_RECONNECT_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('TT_RECONNECT_UNDO_TAG_ADJACENCY');
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('TT_RECONNECT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('TT_RECONNECT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('TT_RECONNECT_UNDO_BASE_IDENTITY');
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
  isApplied, undoTtReconnect,
};
