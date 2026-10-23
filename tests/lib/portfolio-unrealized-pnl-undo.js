'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO UNREALIZED P&L — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the document this layer produced and js/portfolio/portfolio-unrealized-pnl.js,
// it returns the index.html that merged with #531 and that #532 left byte-identical,
// byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [843838,845788) in document coordinates, holding TWO top-level owners, both synchronous,
// and the ten comment lines that document them: `computePositionUnrealizedPnL(position)` sums the
// leg-level P&L across the active legs of one position, each leg against its live mark, and answers
// null when any active leg lacks a mark; `computePortfolioUnrealizedPnL(positions)` sums the per-row
// values, skipping rows with no computable P&L, and calls the first for any row that does not carry
// one. Seven comment lines sit above the first owner and three above the second. Neither writes
// anything outside itself.
//
// 40 lines: 29 of code, TEN of comment and ONE blank (the one between the owners), and ZERO
// top-level statements. Function declarations are the whole of its top-level shape, so it ships no
// mutable binding of its own. It is NOT pure ASCII: five characters sit in its comments, a sigma
// twice, an em dash and an arrow twice, so its UTF-8 length, 1,957, is eight bytes longer than its
// UTF-16 length, 1,949.
//
// THE CUT TAKES NO BANNER, AND TAKES ITS DOCUMENTATION. Owners 2 and 3 of the nineteen of a
// region. The block opens on the first line of the documentation of the first owner, with a blank
// line above it, which stays in the monolith, and the blank line that followed the block is the
// structural separator, which leaves with it. After the move the closing brace of `_legUnrealizedPnL`
// is directly against the comment block of `computeEarningsDte`, across one blank line, a join the
// monolith already holds. The document's top-level banner marks and owner regions do not move.
//
// TWO CONSUMERS, TWO DEPENDENCIES, NOTHING FROM A SHIPPED MODULE. `positionManager` (a `var`
// holding an IIFE) and `renderPositionsPanel` call the owners from inside their own bodies. No
// shipped module names them. The two monolith dependencies stay: `_legUnrealizedPnL` and
// `isActivePortfolioLeg`, both declared functions above the block, both called only by the first
// owner, and neither assigned by it. So the block loads in a bare VM declaring exactly its two
// functions. It deletes nothing and reaches the host through nothing but the language's own
// `isFinite`.
//
// THE TAG. It sits last of the local scripts, immediately before the inline monolith, as the
// layer before it did when it shipped. Both references are inside function bodies and the block
// itself runs nothing at load, so the position is not shown to be load-bearing for this layer; the
// permanent contract pins it all the same.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [843838,845787)   1,949 units, ending `}\n`
//   separator  [845787,845788)   exactly one LF
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
const { execFileSync } = require('child_process');
const path = require('path');

const TAG = '<script src="./js/portfolio/portfolio-unrealized-pnl.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/swing-chart-cache-evaluate.js"></script>\n';
const INLINE_OPEN = '<script>';

// A documented, strictly pinned *later* Journal persistence runtime patch.
// This is NOT part of the extraction. Tests undo that later patch BEFORE
// replaying the original extraction's immutable, byte-exact historical proof.
// The only accepted alternative is this one exact Git blob. Every mutation
// (including one byte of foreign runtime code) still fails closed.
const JOURNAL_RUNTIME_PATCH_BLOB = '876c32ae477ab195afc16884b369b7c6405a4e2c';
const PRE_JOURNAL_RUNTIME_COMMIT = 'c96ab505c43ff040ebc3e5eacb6149ee8454d20b';
let cachedPreJournalDocument = null;
function gitBlobSha(source) {
  const buf = Buffer.from(source, 'utf8');
  return crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');
}
function undoApprovedJournalRuntimePatch(html) {
  if (gitBlobSha(html) !== JOURNAL_RUNTIME_PATCH_BLOB) return html;
  if (!cachedPreJournalDocument) {
    const original = execFileSync('git', ['show', PRE_JOURNAL_RUNTIME_COMMIT + ':index.html'], {
      cwd: path.resolve(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
    });
    if (gitBlobSha(original) !== '4f4e158ec22404c3e9ae5e7dc9698ad3bbc82aba') {
      throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_EXTRACTED_IDENTITY');
    }
    cachedPreJournalDocument = original;
  }
  return cachedPreJournalDocument;
}

// Pinned base: the merged #532 commit this layer was measured against.
const BASE_CHARS = 1406907;
const BASE_UTF8 = 1435218;
const BASE_LF = 24268;
const BASE_SHA256 = '75b43a83d0b007b551c3ea852e10cea6b759d50c781b23bfd5fde40da3c0c15c';
const BASE_LOCAL_SCRIPTS = 112;

// Pinned extracted document — INDEX_AFTER is the figure audit #532 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1405024;
const EXTRACTED_UTF8 = 1433327;
const EXTRACTED_LF = 24228;
const EXTRACTED_SHA256 = '6d49180b672bd12af09fca28216ed30bc1af4771d11b5cb9fa46389b9ebbf597';
const EXTRACTED_LOCAL_SCRIPTS = 113;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 843838;
const RAW_END = 845788;
const RAW_CHARS = 1950;
const RAW_SHA256 = 'd66031c86887d5b8bdded0a6015c25a0dc728495a49f918051ad5fecf2e351bf';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 1949;
const MODULE_UTF8 = 1957;
const MODULE_LF = 40;
const MODULE_SHA256 = '9f6db5d92f235a357c83545d1e025a0335a523e915d602b7c3ed53ce3251acb2';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 845787;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 727,022 units earlier in the document, so once it is removed every byte
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

// Historical extraction contracts operate on the pre-runtime-fix snapshot.
// This does NOT waive the live runtime identity guard: only the exact approved
// current index Git blob is eligible for the peel, and its original source
// must also match the known pre-fix blob. Mutated/unapproved documents never
// receive a synthetic historical pass.
function historicalShippedIndex(html) {
  if (typeof html !== 'string') throw new Error('JOURNAL_DELETE_HISTORY_BAD_INPUT');
  // Immutable extraction snapshot or the ONE explicitly pinned delete patch:
  // arbitrary (including mutated) working trees are not accepted as history.
  if (digest(html) === EXTRACTED_SHA256) return html;
  if (gitBlobSha(html) !== JOURNAL_RUNTIME_PATCH_BLOB) {
    throw new Error('JOURNAL_DELETE_HISTORY_UNAPPROVED_SHIPPED_INDEX');
  }
  return undoApprovedJournalRuntimePatch(html);
}

function undoPortfolioUnrealizedPnl(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 1,950 units, not 1,949. Its UTF-8
  //    length is EIGHT bytes longer than its UTF-16 length, the module holding
  //    five non-ASCII characters in its comments; both are pinned, since a pin on one
  //    does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the swing chart cache evaluate
  //    tag and immediately before the inline monolith, so it loads ahead of
  //    every caller.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_TAG_ADJACENCY');
  }

  // 4. Undo the *newer*, strictly pinned runtime delta when and ONLY when
  //    the exact approved Journal patch blob is supplied. The historical
  //    extraction checksum and all negative controls remain byte-exact.
  const extracted = undoApprovedJournalRuntimePatch(html);
  if (extracted.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(extracted, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(extracted) !== EXTRACTED_LF ||
      digest(extracted) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_EXTRACTED_IDENTITY');
  }

  // 5. Remove the tag and its LF.
  const tagAt = extracted.indexOf(TAG);
  const untagged = extracted.slice(0, tagAt) + extracted.slice(tagAt + TAG.length);

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
    throw new Error('PORTFOLIO_UNREALIZED_PNL_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioUnrealizedPnl, historicalShippedIndex,
};
