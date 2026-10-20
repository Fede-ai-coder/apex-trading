'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// AI SCAN CONTEXT — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/services/ai-scan-context.js,
// it returns the index.html that merged with #521 and that #522 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [745073,746614) in document coordinates, holding TWO top-level owners, synchronous:
// `scanCtx`, which turns the first rows of the scan results (six when no limit is given)
// into the lines of the prompt the chat sends to the model, and `tickerCtx`, which does the
// same at full width for one ticker. Each notes an upcoming earnings date and flags it when
// it is within 45 days. They write nothing.
//
// 2 lines, both of code, no comment and no blank, ZERO top-level statements: each owner is
// ONE line of source. Two function declarations are the whole of its top-level shape, so it
// ships no mutable binding of its own. It is NOT pure ASCII: one em dash, inside the string
// literal `tickerCtx` returns for a flagged earnings date, makes its UTF-8 length 1,542
// against 1,540 UTF-16 units, so the byte-count pin and the character-count pin are two
// pins that differ, and the encoding of the file is part of what the move preserves.
//
// THE CUT OPENS ON A DECLARATION. Neither owner has documentation, so the first line is the
// declaration of `scanCtx`. The line above it is the one-line declaration of `rulesCtx`, which
// stays in the monolith, with NO blank line between, so nothing of the cut's own is left on that
// side. After the move that declaration's closing brace is directly against `async function
// sendMsg`, because the blank line that followed the block is the structural separator and
// leaves with it.
//
// TWO CONSUMERS, ONE DEPENDENCY. `sendMsg` and `orchestratedAnalysis` each call both
// functions, four call sites in all, `scanCtx()` with no argument and `tickerCtx` with a
// ticker. No shipped module names either. The one monolith dependency is `S`, a `const` the
// monolith declares at its top, read as `S.scanData` inside the function bodies at CALL time:
// the block reads nothing while it is evaluated, so it loads in a bare VM and neither function
// can be called there. It deletes nothing and reaches the host through none of `window`,
// `document`, storage, `console`, timers or fetch.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as
// the layer before it did when it shipped. All references are inside function bodies and the
// block itself runs nothing at load, so the position is not shown to be load-bearing for this
// layer; the permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [745073,746613)   1,540 units, ending `}\n`
//   separator  [746613,746614)   exactly one LF
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

const TAG = '<script src="./js/services/ai-scan-context.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/option-chain-error-helpers.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #522 commit this layer was measured against.
const BASE_CHARS = 1415705;
const BASE_UTF8 = 1444072;
const BASE_LF = 24433;
const BASE_SHA256 = '8b550d8a4d6b7cd583276eacb5f156aa169321a1f6e02eb96573034aa1ed7215';
const BASE_LOCAL_SCRIPTS = 107;

// Pinned extracted document — INDEX_AFTER is the figure audit #522 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1414221;
const EXTRACTED_UTF8 = 1442586;
const EXTRACTED_LF = 24431;
const EXTRACTED_SHA256 = '464dba5a0d8aecdb0d7ace6aa396874c3ce6e72b4ad59402d60669ad6ac6fdf8';
const EXTRACTED_LOCAL_SCRIPTS = 108;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 745073;
const RAW_END = 746614;
const RAW_CHARS = 1541;
const RAW_SHA256 = 'a53f04456dc6859245114b76af866eb10c1e74c813e80c6b8e0d1cbdd8a35e52';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1540;
const MODULE_UTF8 = 1542;
const MODULE_LF = 2;
const MODULE_SHA256 = 'c942a06b30dc2306ceb53fa7cf27574366ca5e241d6acdb04d097f8905a05e17';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 746613;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 628,571 units earlier in the document, so once it is removed every byte
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

function undoAiScanContext(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('AI_SCAN_CONTEXT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,541 units, not 1,540. Its UTF-8
  //    length (1,542) differs from its UTF-16 length by the two extra bytes of its
  //    one em dash; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the option-chain error helpers tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller.
  if (count(html, TAG) !== 1) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('AI_SCAN_CONTEXT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('AI_SCAN_CONTEXT_UNDO_BASE_IDENTITY');
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
  isApplied, undoAiScanContext,
};
