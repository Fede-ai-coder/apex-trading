'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Rich async snapshot — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1377622,1393575) in monolith coordinates in dev-clean @ 5ffe7f3, holding a
// SINGLE owner:
//
//     // ── RICH ASYNC SNAPSHOT   1 owner, 15,952 units
//
// The owner is `_buildRichSnapshot`, an async function of 15,778 units spanning
// [173,15951). The other 174 units are the 173 of banner and comment that open
// the region and the single trailing newline that closes it; there is no second
// construct and no top-level statement.
//
// A ONE-OWNER MODULE IS NOT NEW, and the scope of that claim is the thing to
// state carefully — two drafts of the audit's header got it wrong before §4
// there was written to measure it, and §5 here keeps both sets executable:
//
//     over the TWENTY-ONE monolith-extraction layers   2 have one owner
//     over ALL SIXTY-FIVE local scripts                7 have one owner
//
// This module is the larger of the two in the first set. In the second it is
// the THIRD largest of the seven: js/ui/pess-batch-panel.js (24,542 units) and
// js/ui/eic-ticker-analysis-panel.js (17,589) are both bigger. Neither figure
// was a reason to cut here; the coupling was.
//
// WHY IT COULD BE TAKEN. `evaluationTimeReads` returns the EMPTY LIST: one
// declaration, zero top-level statement lines, nothing runs at load. It depends
// on eight monolith names — `S` among them, the const that disqualified #424's
// swing candidate — and every reference resolves at CALL time. It loads in a
// COMPLETELY empty VM, defining exactly its one owner.
//
// STATE COUPLING. Three external edges over one name, all at call time; zero
// references from generated markup; zero inbound writes, which is vacuous here
// because the region owns no binding at all — and that vacuity is the reason
// the outbound direction is measured too. Outbound is TWO writes, both BY KEY
// on `_ivrCache`, which stays declared inline as a `var` at 1290588, before the
// region, so the cut does not move it.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1491264,1507216)  15,952 units, ends `}\n`
//   separator  [1507216,1507217)  exactly one LF
//
// (document coordinates; the monolith itself begins at 113642.)
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoJournalRichSnapshot(indexHtml, moduleSource) reconstructs
// dev-clean @ 5ffe7f3 exactly, or throws.
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

const TAG = '<script src="./js/services/journal-rich-snapshot.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/backend-candle-store-chart.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #431 audit commit this layer was measured against.
const BASE_CHARS = 1618149;
const BASE_UTF8 = 1648835;
const BASE_LF = 28248;
const BASE_SHA256 = '67a94fd413e30fd970a6aee717d5a563a3fc662668ea4fb01efce21b9f05bb9e';
const BASE_LOCAL_SCRIPTS = 64;

// Pinned extracted document — the figure audit #431 predicted before the move.
const EXTRACTED_CHARS = 1602259;
const EXTRACTED_UTF8 = 1632605;
const EXTRACTED_LF = 27944;
const EXTRACTED_SHA256 = '6db6f8fd99da797003ca89e022ead159524bfbd4febbe0b54b0523f4fd001fa1';
const EXTRACTED_LOCAL_SCRIPTS = 65;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1491264;
const RAW_END = 1507217;
const RAW_CHARS = 15953;
const RAW_SHA256 = '6f780eb3402b9011510db7a6a0778b1d6e3e5274f1ebfb6ab83c45c1c5e47f2c';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 15952;
const MODULE_UTF8 = 16292;
const MODULE_LF = 304;
const MODULE_SHA256 = 'a34e9fd794f5d0f40aa70bb30b94e04a84652aeac1e9aed11408e56fbb29dda2';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1507216;
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

function undoJournalRichSnapshot(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 15,953 units, not 15,952.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one snapshot tag, loaded immediately after
  //    backend-candle-store-chart.js and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('JOURNAL_RICH_SNAPSHOT_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalRichSnapshot,
};
