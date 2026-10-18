'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL EXPIRY AUDIT — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #512-era document and js/services/journal-expiry-audit.js,
// it returns the merged index.html at that commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [982470,984562) in document coordinates, holding TWO top-level owners, both
// synchronous: `_journalExpiryAuditEnabled`, which reads the two switches that turn
// the diagnostic on — `window.APEX_DEBUG_JOURNAL_EXPIRY === true` and a localStorage
// entry of the same name equal to '1' — and answers false when neither holds or when
// reading either throws, and `journalTradeLegExpiryAudit`, which, when the switch is
// on, dumps a trade's id, ticker, expiry and every leg's expiry fields and option
// symbols through console.debug, and swallows its own failures.
//
// 40 lines: 27 of code, 12 of comment and 1 blank, and ZERO top-level statements.
// Function declarations are the whole of its top-level shape, so it ships no mutable
// binding of its own. It is NOT pure ASCII: two em dashes and three box-drawing
// characters, all in comments, make its UTF-8 length 2,101 against 2,091 UTF-16 units,
// so the byte-count pin and the character-count pin are two pins that differ.
//
// THE CUT OPENS ON A BANNER. The first line is the `// ── [JOURNAL-EXPIRY-AUDIT]` banner
// and the nine comment lines under it document the first function; the declaration
// follows them. The blank line above the banner stays in the monolith. The seam admits
// thirteen openings and the cut takes the one on the banner, so after the move the
// closing brace of `normalizeTradeOptionLegAliases`, one blank line and the declaration of
// `optionLegScalarDiagnostics` are adjacent: the join the monolith held once at the end of
// the block, now at the place the cut was made. The three option owners left in the region
// fall under the ADD POSITION FORM banner above.
//
// TWO CONSUMERS, ONE OWNER CALLED, NO DEPENDENCY. Seven calls reach in, all to
// `journalTradeLegExpiryAudit`: `journalManager` makes six and `submitTrade` one. The
// body reads no monolith name, writes nothing and deletes nothing, and reaches the host
// only through `window` and `localStorage` behind `typeof` guards, and `console`. No
// inbound write, no outbound write, no sibling module, no static markup, no generated
// markup.
//
// THE LOAD ORDER IS LOAD-BEARING. The first of the seven calls runs while the monolith
// is being evaluated, inside `journalManager`'s initialiser, whose
// `catch(e) { _trades = []; }` empties the in-memory journal on any error. With the
// module absent at that point the journal starts empty. The tag therefore sits last of
// the local scripts, immediately before the inline monolith, and the permanent contract
// pins it and re-runs the evaluation against stubs.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [982470,984561)   2,091 units, ending `}\n`
//   separator  [984561,984562)   exactly one LF
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

const TAG = '<script src="./js/services/journal-expiry-audit.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-stale-mark-squeeze-state.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #511 commit this layer was measured against.
const BASE_CHARS = 1425802;
const BASE_UTF8 = 1454275;
const BASE_LF = 24628;
const BASE_SHA256 = 'a273e56af564eebce397b378ef5c4f559e1f3f05ef36672192cdb96593298f06';
const BASE_LOCAL_SCRIPTS = 102;

// Pinned extracted document — INDEX_AFTER is the figure audit #512 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1423772;
const EXTRACTED_UTF8 = 1452235;
const EXTRACTED_LF = 24588;
const EXTRACTED_SHA256 = 'd295ec3b92834eb094f34affc205ab32fb0ae8f3b94093fa5e4fe472f7e50da5';
const EXTRACTED_LOCAL_SCRIPTS = 103;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 982470;
const RAW_END = 984562;
const RAW_CHARS = 2092;
const RAW_SHA256 = 'c4af0e8c5f3e650f73dd23ee93b0e2676e7926d93046f56a75c30ea15a88ae03';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 2091;
const MODULE_UTF8 = 2101;
const MODULE_LF = 40;
const MODULE_SHA256 = 'b6baccb9afc12ad7163c46720b70b8a0bb5aea0ff8443b86e5ff6f5094032ec9';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 984561;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 866,316 units earlier in the document, so once it is removed every byte
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

function undoJournalExpiryAudit(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 2,092 units, not 2,091. Its UTF-8
  //    length (2,101) differs from its UTF-16 length by two em dashes and three
  //    box-drawing characters in comments; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the portfolio stale mark and
  //    squeeze state tag and immediately before the inline monolith, so it loads
  //    ahead of every caller. That order is LOAD-BEARING here: the first caller
  //    runs while the monolith is being evaluated.
  if (count(html, TAG) !== 1) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('JOURNAL_EXPIRY_AUDIT_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalExpiryAudit,
};
