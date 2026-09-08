'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal snapshot prefetch — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1267671,1278340) in monolith coordinates in dev-clean @ 1fa523e, holding TWO
// async owners:
//
//     // ── Targeted DXLink fetch for Journal snapshots   2 owners, 10,668 units
//
//         _prefetchDXLinkForSnapshot                 5,153 units, async
//         prefetchJournalSnapshotFromBackendDxlink    5,023 units, async
//
// 489 units of banner and comment open the region, one blank line separates the
// two declarations, and one newline closes it: 489 + 5,153 + 2 + 5,023 + 1 =
// 10,668. There is no third construct and no top-level statement.
//
// WHY IT COULD BE TAKEN. `evaluationTimeReads` returns the EMPTY LIST: two
// declarations, zero top-level statement lines, nothing runs at load. It
// depends on seven monolith names — `S` among them, the const that disqualified
// #424's swing candidate — and every reference resolves at CALL time. It loads
// in a COMPLETELY empty VM, defining exactly its two owners.
//
// THE OUTBOUND SHAPE IS NOT THE ONE THE PREVIOUS TWO LAYERS HAD, and "all by
// key" — true of js/services/journal-rich-snapshot.js — would be FALSE here.
// The region performs THREE property writes on `S`:
//
//     TWO keyed        S.greeksCache[sym] = …  and  S.greeksCache[ticker] = …
//     ONE dotted       if (!S.greeksCache) S.greeksCache = {};
//
// The dotted one is a GUARDED LAZY INIT, not a reset, and the permanent
// contract measures the whole LINE rather than substring-matching the
// assignment — a substring match passed the unguarded form too, which is the
// mutation survivor audit #435 found and closed. §7b drives the difference:
// with no cache the guard creates one; with entries already present they are
// PRESERVED. `S` itself is never rebound; it is a const, and every write is a
// property write.
//
// STATE COUPLING. Two external edges, one per owner, both inside function
// bodies — call time. Zero references from generated markup. Zero inbound
// writes, which is vacuous because the region owns no binding, and that vacuity
// is exactly why the outbound direction is measured separately.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1381444,1392112)  10,668 units, ends `}\n`
//   separator  [1392112,1392113)  exactly one LF
//
// (document coordinates; the monolith itself begins at 113773.)
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoJournalSnapshotPrefetch(indexHtml, moduleSource) reconstructs
// dev-clean @ 1fa523e exactly, or throws.
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
// One WHOLE STATEMENT is redundant in the same way, and is recorded here rather
// than left for the next reader to rediscover: deleting the first adjacency
// check, `count(html, ANCHOR_TAG + TAG) !== 1`, survives mutation. It is
// subsumed, and provably so — the tag-identity check above it already fixes
// `count(html, TAG)` at exactly 1, so `ANCHOR_TAG + TAG` cannot occur twice, and
// the longer `ANCHOR_TAG + TAG + INLINE_OPEN` check below rejects everything
// left. The TAG_ADJACENCY error itself stays reachable through that second
// check, which is the claim the paragraph above makes and the contract's control
// exercises. The statement is kept for the same reason the redundant clauses
// are: it names the narrower failure at the point where it happens.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-snapshot-prefetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-backend-candles.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #435 audit commit this layer was measured against.
const BASE_CHARS = 1594508;
const BASE_UTF8 = 1624784;
const BASE_LF = 27797;
const BASE_SHA256 = '37703d19026490a5d830caa20f6afa9e08f859b5db749acc378c51bfa4865d00';
const BASE_LOCAL_SCRIPTS = 66;

// Pinned extracted document — the figure audit #435 predicted before the move.
const EXTRACTED_CHARS = 1583906;
const EXTRACTED_UTF8 = 1614120;
const EXTRACTED_LF = 27534;
const EXTRACTED_SHA256 = '77e3e862c6f4d496b9d90f0256ccf22ad9ed510868d704f2bfae5041d29158e6';
const EXTRACTED_LOCAL_SCRIPTS = 67;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1381444;
const RAW_END = 1392113;
const RAW_CHARS = 10669;
const RAW_SHA256 = 'acf46d11dd6ba156df243d8b79b44d573e3777d68eed584a6f5e77bde7d8f6cc';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 10668;
const MODULE_UTF8 = 10730;
const MODULE_LF = 263;
const MODULE_SHA256 = '29105fdc435029a35aba08de1d7c7caca4891d0f2791da550139cc86d9856f82';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1392112;
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

function undoJournalSnapshotPrefetch(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 10,669 units, not 10,668.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after portfolio-backend-candles.js
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('JOURNAL_SNAPSHOT_PREFETCH_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalSnapshotPrefetch,
};
