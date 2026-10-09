'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO TECHNICAL BATCH FETCH — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 09932fa document and js/portfolio/portfolio-
// technical-batch-fetch.js, it returns the merged #482 index.html byte for byte,
// or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1053385,1055238) in document coordinates in dev-clean @ 09932fa, holding ONE
// top-level owner, an async function: `_fetchPortfolioTechnicalBatch` (1,851).
// It POSTs one batch of symbols to the backend's technical-refresh route and
// returns a result object — `{ ok: true, data, … }` on success, `{ ok: false,
// reason, … }` on each of its six failure paths.
//
// 31 lines, ALL of them code: no comment line and no blank line, and ZERO
// top-level statements. One function declaration and one column-0 closer are the
// whole of its top-level shape, so this layer ships no mutable binding. It is
// pure ASCII, so its UTF-8 length equals its UTF-16 length.
//
// THE CUT TAKES NO DOCUMENTATION, because there is none above the declaration:
// what precedes it is the previous function's closing brace and a blank line.
// The boundary is nonetheless a judgement and not something the seam decides.
// `assertSeam` accepts THREE openings between three units above the declaration
// and the declaration itself:
//
//   1053382  the closing brace of the previous function  → not valid JavaScript
//   1053384  a blank line                                → parses, opens on nothing
//   1053385  THE DECLARATION                             → what this layer took
//
// The first fails to parse, the second would make a module that begins on an
// empty line, and the permanent contract measures all three rather than citing
// them. The shared helper was left alone when this was found: see the audit that
// preceded this layer, which recorded it.
//
// ONE CANDIDATE WAS LEFT AT 1. Audit #482 counted exactly one of 1,854 clean
// candidates at byConsumerSplit 1, and it was this one: the section cut that had
// stood beside it at #477 had shipped, and so had the cut it first lost to. The
// permanent contract re-reads both earlier refusals out of the contracts that
// recorded them rather than repeating them here.
//
// EVERY COUPLING DIRECTION IS ZERO BUT ONE, AND THAT ONE IS A CALLER. The
// references that reach in come from a single consumer, named
// `fetchPortfolioTechnicalRefresh`, at two awaited call sites. No monolith dependency, no inbound write,
// no property write, no outbound write, no sibling module, no static markup, no
// generated markup. The two foundation names it reads, `BACKEND` and
// `_backendAuthHeaders`, are not counted against it.
//
// IT NEVER THROWS, AND THAT IS WHAT THIS LAYER ASKS OF ITS LOAD ORDER. Every
// lookup of `fetch`, `BACKEND`, `_backendAuthHeaders` and `AbortSignal` sits
// inside one `try`, so a missing foundation is RETURNED as `{ ok: false, reason:
// 'request_error', errorName: 'ReferenceError' }` rather than raised. A tag in
// the wrong place would not fail loudly; it would turn every technical refresh
// into a quiet request_error. The guards below therefore pin the tag's position,
// and the permanent contract pins the foundation modules ahead of it, because
// the runtime will not complain on its own.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1053385,1055237)   1,852 units, ending `}\n`
//   separator  [1055237,1055238)   exactly one LF
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
// tests/lib/strategy-templates-undo.js already record, and which the helper
// shipped immediately before this one records as well:
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

const TAG = '<script src="./js/portfolio/portfolio-technical-batch-fetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-snapshot-fallback.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #482 commit this layer was measured against.
const BASE_CHARS = 1454677;
const BASE_UTF8 = 1483244;
const BASE_LF = 25152;
const BASE_SHA256 = '0757e6576b328511c3014d6746ac2c6ff9513b0d16999f8b5ef321f2bf637aca';
const BASE_LOCAL_SCRIPTS = 87;

// Pinned extracted document — INDEX_AFTER is the figure audit #482 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1452898;
const EXTRACTED_UTF8 = 1481465;
const EXTRACTED_LF = 25121;
const EXTRACTED_SHA256 = '4ae28fcadc38ec40b2d494ef2818d3231113975fed734610393801046f5b9e99';
const EXTRACTED_LOCAL_SCRIPTS = 88;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1053385;
const RAW_END = 1055238;
const RAW_CHARS = 1853;
const RAW_SHA256 = '28a0bb546f45e2d86dbe6307118335967dc9607006503693dee176b9247e21ae';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1852;
const MODULE_UTF8 = 1852;
const MODULE_LF = 31;
const MODULE_SHA256 = 'ee1bb52df20c3b1c080619675c6480dcfa8faa9c4a3efc9f1c65b99eed3267f1';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1055237;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 938,257 units earlier in the document, so once it is removed every byte
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

function undoPortfolioTechnicalBatchFetch(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,853 units, not 1,852. This module is
  //    pure ASCII, so its UTF-8 length EQUALS its UTF-16 length and a multi-byte
  //    character smuggled in would move the one without the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the snapshot-fallback owner and
  //    immediately before the inline monolith. THIS IS WHAT PROTECTS THE LOAD
  //    ORDER, because the module will not complain if it is wrong.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_TECHNICAL_BATCH_FETCH_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioTechnicalBatchFetch,
};
