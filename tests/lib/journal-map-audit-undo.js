'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL MAP AUDIT — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 6c2f01f document and js/services/journal-map-audit.js,
// it returns the merged #462 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [719625,723944) in monolith coordinates in dev-clean @ 6c2f01f, holding THREE
// top-level owners — the whole of the `[JOURNAL-PORTFOLIO-MAP-AUDIT]` feature:
// `_journalMapAuditEnabled` (306), which reads two opt-in flags and returns
// false unless one is set; `_journalMapAuditSummarize` (2,024), which folds
// per-leg diagnostics into a summary and an anomaly list; and `_journalMapAudit`
// (924), the wrapper that calls both and either logs verbosely or emits one
// compact warning. 92 lines, 67 of them code, 22 of them comment, and zero top-
// level statements.
//
// IT OPENS ON THE FEATURE'S OWN BANNER, not on a declaration. That is the whole
// point of the cycle that chose it, and it is why the first line of this module
// is `// ── [JOURNAL-PORTFOLIO-MAP-AUDIT] — gated mapping diagnostics ──`.
//
// ONE DEPENDENCY, AND IT IS DISTANT. `optionLegScalarDiagnostics` lives 195,735
// units away under a different banner, so the module calls it at call time, from
// the monolith that loads after this script. MONOLITH_DEPENDENCIES is exactly
// that one name — ten of the shipped contracts pin a non-empty list, so having
// one is the ordinary case rather than a concession.
//
// ONE EDGE REACHES IN. `positionManager` calls the wrapper, from inside a
// function body, and that is the entirety of the inbound coupling: the nine-
// direction score and the consumer reading BOTH read 2, which is unusual in this
// chain and is why the permanent contract pins their equality rather than their
// difference.
//
// THE FINDING THIS LAYER RESTS ON: THE SCREEN'S OWN TOP PICK CUT THIS FEATURE IN
// HALF. Ranked by the consumer reading the best candidate was [719173,722863) —
// 3,690 units, scoring 1 — and it was wrong twice: it began 452 units early on
// the `PORTFOLIO MANAGER` SECTION header, and it stopped one owner short, so it
// scored 1 precisely BECAUSE it excluded this feature's own wrapper. The
// consumer score is not comparable across cuts of different widths; §5 of the
// permanent contract re-executes that at four widths, because the audit that
// first measured it is deleted by the same PR that adds the contract.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [834238,838556)   4,318 units, ending `}\n`
//   separator  [838556,838557)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
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
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
//
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-map-audit.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-technical-alignment-debug.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #462 commit this layer was measured against.
const BASE_CHARS = 1500455;
const BASE_UTF8 = 1529269;
const BASE_LF = 25982;
const BASE_SHA256 = '361533f1892dd215b00620c0537cd1337a05177eac5a9929c6378cec09dd29eb';
const BASE_LOCAL_SCRIPTS = 79;

// Pinned extracted document — the figures audit #462 predicted before the move.
const EXTRACTED_CHARS = 1496195;
const EXTRACTED_UTF8 = 1524963;
const EXTRACTED_LF = 25891;
const EXTRACTED_SHA256 = 'cad874aeadb31e613487488a54ab9bcd92043bf8478084f55c148638dc1df900';
const EXTRACTED_LOCAL_SCRIPTS = 80;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 834238;
const RAW_END = 838557;
const RAW_CHARS = 4319;
const RAW_SHA256 = '1fd31ba48b4101b5501da581a73e710d0d4d915c8a59f2ab3d5fc7acbd4ff95a';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4318;
const MODULE_UTF8 = 4364;
const MODULE_LF = 91;
const MODULE_SHA256 = 'd75228b8db66a0363f7fe5cc9028848a8e79cbc96941b76b5194f2c98b9b307b';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 838556;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 719,633 units earlier in the document, so once it is removed every
// byte before the fragment is unchanged and the base offset applies directly.
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

function undoJournalMapAudit(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,319 units, not 4,318. The UTF-8
  //    length EXCEEDS the UTF-16 length by 46: this module is not pure ASCII,
  //    which its own opening banner rule alone settles.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the alignment debug pair and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('JOURNAL_MAP_AUDIT_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalMapAudit,
};
