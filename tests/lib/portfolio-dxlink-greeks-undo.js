'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Portfolio DXLink greeks — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [68843,75365) in monolith coordinates in dev-clean @ bdbfd4a, spanning TWO
// banner sections and holding TWO owners:
//
//     // ── Extract underlying symbol from a position        441 units
//     // ── DXLink one-shot greeks + bid/ask for open …    5,607 units, async
//
// 123 units of banner and comment open the region, 349 more separate the two
// declarations — the second feature's own banner and comment — and one newline
// closes it: 123 + 441 + 349 + 5,607 + 1 = 6,521. There is no third construct
// and no top-level statement.
//
// THE BOUNDARY SPANS A BANNER ON PURPOSE. The two sections are one feature and
// have one consumer between them. The split rule could not choose here — the
// union costs zero crossings and so does each half alone — so the audit chose
// on cohesion and on the cost of a 566-unit layer carrying its own helper and
// contract, and published the numbers. What the rule DID decide is the far
// side: joining the region past the seam costs five, all five the neighbour's.
//
// WHY IT COULD BE TAKEN, and this is the cleanest answer the programme has had.
// `evaluationTimeReads` returns the EMPTY LIST, and the region scores ZERO on
// BOTH coupling axes: nothing in the monolith names either owner, and nothing
// it writes lands on a binding the monolith owns. It depends on ONE monolith
// name, `logEv`, used three times, all inside function bodies. It loads in a
// COMPLETELY empty VM, defining exactly its two owners.
//
// THE TWO ZEROES ARE NOT THE SAME KIND OF FACT, and the contract keeps them
// apart. The INBOUND zero is VACUOUS: `bindingNames` is empty, so the region
// owns no mutable state for an outside write to reach. The OUTBOUND zero is a
// MEASUREMENT: the body performs FIFTEEN property writes, and every one lands
// on a base it introduces itself — `symMap`, `ws` and `liveData` are `var`s
// inside `fetchPortfolioGreeks`, and `p` is a function parameter. A region that
// declared nothing would score the same vacuous inbound zero while writing
// globals it does not own, which is the shape CLAUDE.md records; that is why
// the outbound direction is measured on its own and controlled against `S`.
//
// THE MODULE LOADS AFTER ITS ONLY CONSUMER. Both owners are called from
// js/portfolio/portfolio-data-fetch.js, script #59; this tag is #67. That is
// safe only because both call sites sit inside function bodies and the consumer
// reads neither name at evaluation time — the #417 shape, asserted rather than
// assumed in the contract's §7.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [182683,189204)  6,521 units, ends `}\n`
//   separator  [189204,189205)  exactly one LF
//
// (document coordinates; the monolith itself begins at 113840.)
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// Contract: undoPortfolioDxlinkGreeks(indexHtml, moduleSource) reconstructs
// dev-clean @ bdbfd4a exactly, or throws.
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
// Individual CLAUSES are a weaker claim than individual errors, and so is one
// whole statement here — the same subsumption the snapshot-prefetch helper
// records. Deleting the first adjacency check, `count(html, ANCHOR_TAG + TAG)
// !== 1`, survives mutation: the tag-identity check above it already fixes
// `count(html, TAG)` at exactly 1, so the pair cannot occur twice, and the
// longer `ANCHOR_TAG + TAG + INLINE_OPEN` check below rejects what is left. The
// TAG_ADJACENCY error stays reachable through that second check, which is what
// the contract's control exercises. The statement is kept because it names the
// narrower failure at the point where it happens.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-snapshot-prefetch.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #438 commit this layer was measured against.
const BASE_CHARS = 1583906;
const BASE_UTF8 = 1614120;
const BASE_LF = 27534;
const BASE_SHA256 = '77e3e862c6f4d496b9d90f0256ccf22ad9ed510868d704f2bfae5041d29158e6';
const BASE_LOCAL_SCRIPTS = 67;

// Pinned extracted document — the figure audit #437 predicted before the move.
const EXTRACTED_CHARS = 1577450;
const EXTRACTED_UTF8 = 1607582;
const EXTRACTED_LF = 27389;
const EXTRACTED_SHA256 = '572a03e9f80c0f93c0dafb626b45cc1c3388703d531d14a72e5956853de34928';
const EXTRACTED_LOCAL_SCRIPTS = 68;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 182683;
const RAW_END = 189205;
const RAW_CHARS = 6522;
const RAW_SHA256 = '666279ee9abd1cfce3c71207bca57a1c34d350816086217a72f17573a6f847b4';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 6521;
const MODULE_UTF8 = 6603;
const MODULE_LF = 145;
const MODULE_SHA256 = '9b9af31fa5e41432dbf506b098aa71b1ac438c75cb3e530dc12ff9317b9da873';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 189204;
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

function undoPortfolioDxlinkGreeks(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 6,522 units, not 6,521.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after journal-snapshot-prefetch.js
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_DXLINK_GREEKS_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioDxlinkGreeks,
};
