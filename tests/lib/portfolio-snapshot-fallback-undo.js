'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SNAPSHOT FALLBACK — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the e6e65ec document and js/portfolio/portfolio-
// snapshot-fallback.js, it returns the merged #477 index.html byte for byte, or
// throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [834691,837759) in document coordinates in dev-clean @ e6e65ec, holding TWO
// top-level owners, both functions: `_snapshotSqueezeState` (705) projects an
// entry snapshot's squeeze flag into the 'ACTIVE'/'OFF' string the positions row
// renders, and `_positionFieldsFromSnapshot` (984) derives the fallback position
// fields used ONLY when live streaming data is absent — right after a save, or
// when the underlying enrichment failed. Live values always win in
// `_tradeAsPosition`; this never overrides them.
//
// 51 lines, 28 of them code, 22 comment-only and ONE blank, with ZERO top-level
// statements. Two function declarations and two column-0 closers are the whole
// of its top-level shape, so this layer ships no mutable binding. The two
// owners sum to 1,689 units: the remaining 1,378 are the documentation and the
// single blank line, which is what a 22-comment-line module looks like.
//
// THE CUT OPENS INSIDE A SECTION HEADER, AND THAT IS THE BOUNDARY JUDGEMENT
// audit #477 published and defended. THREE boundaries here end at the same body
// and `assertSeam` accepts all three:
//
//   834239  3,519 units  the full `// ═══` header
//   834691  3,067 units  WHAT THIS LAYER TOOK
//   834913  2,845 units  the first declaration
//
// The first leaves `positionManager` — the owner the section is named for —
// with no title, which is the objection audit #475 recorded when it refused
// this region. The third strands the paragraph that documents
// `_snapshotSqueezeState`. The cut taken opens 452 units into the header, takes
// the 222-unit three-line paragraph about the squeeze helper, and leaves the
// section title and positionManager's own description behind — so every piece
// of prose travels with the code it describes, which neither other boundary
// achieves. The permanent contract asserts the screen does NOT enumerate this
// boundary, so the 452 units stay a judgement this chain defends rather than
// something a rule produced.
//
// THE OBJECTION WAS TO A BOUNDARY, NOT TO THE REGION — that is the finding
// #477 published, and it is why a region two audits had already measured and
// passed over is the one this layer ships. A FOURTH option, taking the keeper
// too, resolves the title objection by orphaning nothing, and is strictly worse
// on every axis this programme ranks by: the permanent contract re-measures
// both sides rather than repeating the figures here.
//
// EVERY COUPLING DIRECTION IS ZERO BUT ONE. References reach in from a SINGLE
// consumer, `positionManager`, the immediate neighbour below the cut. No
// monolith dependency, no inbound write, no property write, no outbound write,
// no sibling module, no static markup, no generated markup, no outbound
// generated reference. The nine-direction total is 4 and byConsumerSplit is 1 —
// and of the 1,857 clean candidates the screen enumerated, EXACTLY TWO score 1.
// The contract asserts that count and both identities together, which is why
// this says "one of two" and not "the cleanest".
//
// IT LOADS BARE BUT DOES NOT FULLY RUN BARE, stated at the level it is true.
// The module loads in a completely bare VM and declares exactly its two owners,
// and `_snapshotSqueezeState` RUNS there. `_positionFieldsFromSnapshot` does
// NOT: on a snapshot that reaches the greeks path it throws
// `normalizeGreekPoints is not defined`. It names TWO foundation functions,
// `normalizeGreekPoints` and `normalizeIvrPercent`, over THREE real call sites,
// both belonging to already-shipped modules that load before it. The layer
// before this one had only intrinsics among its free identifiers; inheriting
// that property by assumption would have been false here, so the contract
// measures it.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [834691,837758)   3,067 units, ending `}\n`
//   separator  [837758,837759)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; WHICH older layers
// have no separator concept at all is recorded by the reconstruction bridge and
// deliberately not restated here.
//
// NOT PURE ASCII, and the arithmetic is not the obvious one. The UTF-8 length
// exceeds the UTF-16 length by 48 over 25 non-ASCII characters, which is 48 and
// not 50 because the five code points are not all three-byte: `→` (11), `—`
// (6), `•` (5) and `≤` (1) each cost two extra bytes, while `×` (2) — U+00D7,
// in the Latin-1 supplement — costs only one. Every one of them sits inside a
// comment line.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a module
// ending on a blank line, a truncated or mutated module, an already unextracted
// document, a partially applied state, or foreign content anywhere all raise.
// There is no "best effort" path.
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
// shipped immediately before this one carries without stating:
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

const TAG = '<script src="./js/portfolio/portfolio-snapshot-fallback.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/backend-full-refresh-validation.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #477 commit this layer was measured against.
const BASE_CHARS = 1457675;
const BASE_UTF8 = 1486290;
const BASE_LF = 25203;
const BASE_SHA256 = '4560fd43a857ea60feef29fda90ade7826c39d7e76ce3a8f7794c13b941be19d';
const BASE_LOCAL_SCRIPTS = 86;

// Pinned extracted document — INDEX_AFTER is the figure audit #477 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1454677;
const EXTRACTED_UTF8 = 1483244;
const EXTRACTED_LF = 25152;
const EXTRACTED_SHA256 = '0757e6576b328511c3014d6746ac2c6ff9513b0d16999f8b5ef321f2bf637aca';
const EXTRACTED_LOCAL_SCRIPTS = 87;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 834691;
const RAW_END = 837759;
const RAW_CHARS = 3068;
const RAW_SHA256 = 'a8008e3aaa50d1cb79db51d1cfc4394ff3cdfb0af7af03d259f498a943a1425e';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 3067;
const MODULE_UTF8 = 3115;
const MODULE_LF = 51;
const MODULE_SHA256 = 'a8d72073de0526c75423c48cfcad2640f05c80afab3ebff927c7dcc07831178d';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 837758;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 719,633 units earlier in the document, so once it is removed every byte
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

function undoPortfolioSnapshotFallback(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 3,068 units, not 3,067. The UTF-8
  //    length EXCEEDS the UTF-16 length by 48: this module is not pure ASCII,
  //    which its arrows, dashes and bullets alone settle.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match. This module has
  //    ONE blank line, interior, which is why the check is on the ending and
  //    not on the presence of a blank line anywhere. The second disjunct is
  //    subsumed by the first, as the header records; it is kept to name the
  //    failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the backend full-refresh
  //    validator and immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_SNAPSHOT_FALLBACK_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioSnapshotFallback,
};
