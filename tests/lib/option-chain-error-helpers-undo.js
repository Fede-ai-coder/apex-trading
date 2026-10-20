'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// OPTION-CHAIN ERROR HELPERS — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/services/option-chain-error-helpers.js,
// it returns the index.html that merged with #519 and that #520 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1046703,1048412) in document coordinates, holding TWO top-level owners, synchronous:
// `_optionChainStructuredTimeout`, which reads a backend option-chain response and returns
// the canonical code `option_chain_timeout` when the response says the provider timed out,
// or null for a normal response, and `_optionChainErrorText`, which turns a failed chain
// load's code into the sentence the banner shows, escaping the ticker (and, in its default
// case, the code) with the monolith's `escHtml`. It writes nothing.
//
// 35 lines: 28 of code, 6 of comment and 1 blank, ZERO top-level statements. Two function
// declarations are the whole of its top-level shape, so it ships no mutable binding of its
// own. It is NOT pure ASCII: two em dashes, both inside string literals the second function
// returns, make its UTF-8 length 1,712 against 1,708 UTF-16 units, so the byte-count pin and
// the character-count pin are two pins that differ, and the encoding of the file is part of
// what the move preserves.
//
// THE CUT OPENS ON ITS DOCUMENTATION. The first line is the first of three comment lines that
// describe the first function, `// Detects a structured backend option-chain timeout (backend
// #204) so the UI can show`, and the declaration follows the third of them directly. The line
// above them is the closing brace of the owner that preceded the block, with NO blank line
// between, so nothing of the cut's own is left on that side. After the move that brace is
// directly against `async function _fetchOptionChain`, because the blank line that followed
// the block is the structural separator and leaves with it.
//
// ONE CONSUMER, ONE DEPENDENCY, ONE MODULE REFERENCE. `_fetchOptionChain` references the first
// function twice in one guarded statement, `var _structTimeout = (typeof
// _optionChainStructuredTimeout === 'function') ? _optionChainStructuredTimeout(resp) : null;`.
// The second function is not named anywhere in the monolith; its one inbound reference is a
// call inside a function of js/ui/journal-trade-forms.js. The one monolith dependency is
// `escHtml`, read at two places inside the second function, at CALL time: the block reads
// nothing while it is evaluated, so it loads in a bare VM and the second function cannot be
// called there. It deletes nothing and reaches the host through none of `window`,
// `document`, storage, `console`, timers or fetch.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as
// the layer before it did when it shipped. All references are inside function bodies and the
// block itself runs nothing at load, so the position is not shown to be load-bearing for this
// layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1046703,1048411)   1,708 units, ending `}\n`
//   separator  [1048411,1048412)   exactly one LF
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

const TAG = '<script src="./js/services/option-chain-error-helpers.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-beta-missing-reason.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #519 commit this layer was measured against.
const BASE_CHARS = 1417346;
const BASE_UTF8 = 1445717;
const BASE_LF = 24468;
const BASE_SHA256 = '4b05416012f0250f389feb0d08fa3bf023a0092d9d0dd58e2a7153eff1594414';
const BASE_LOCAL_SCRIPTS = 106;

// Pinned extracted document — INDEX_AFTER is the figure audit #520 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1415705;
const EXTRACTED_UTF8 = 1444072;
const EXTRACTED_LF = 24433;
const EXTRACTED_SHA256 = '8b550d8a4d6b7cd583276eacb5f156aa169321a1f6e02eb96573034aa1ed7215';
const EXTRACTED_LOCAL_SCRIPTS = 107;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1046703;
const RAW_END = 1048412;
const RAW_CHARS = 1709;
const RAW_SHA256 = '29ae85018b243ae702eb59023883e22e8cb311068ce75a5500f980104837bb48';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1708;
const MODULE_UTF8 = 1712;
const MODULE_LF = 35;
const MODULE_SHA256 = '67c3cce7b89779265309f8696488be7cc731c13cbb6fade030f6b55a677c55de';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1048411;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 930,269 units earlier in the document, so once it is removed every byte
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

function undoOptionChainErrorHelpers(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,709 units, not 1,708. Its UTF-8
  //    length (1,712) differs from its UTF-16 length by the four extra bytes of its
  //    two em dashes; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the beta missing-reason tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('OPTION_CHAIN_ERROR_HELPERS_UNDO_BASE_IDENTITY');
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
  isApplied, undoOptionChainErrorHelpers,
};
