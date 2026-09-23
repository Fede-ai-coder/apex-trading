'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO SPY PRICE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the c65d065 document and js/portfolio/portfolio-spy-
// price.js, it returns the merged #468 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [794432,805265) in monolith coordinates in dev-clean @ c65d065, holding FIVE
// top-level owners, all of them functions: `_spyFreshNum` (93),
// `_spyContextPrice` (1,088), `_spyContextAvailableKeys` (524),
// `resolveFreshSpyPrice` (5,798) and `_portfolioRowUnderlyingPrice` (355).
// Together they are the Portfolio's SPY benchmark price resolver and the
// validity helpers it shares. 186 lines, 127 of them code, 59 of them not, and
// zero top-level statements. This layer ships no mutable binding at all.
//
// BOTH ENDS OF THIS CUT ARE MARKED BY THE DOCUMENT, which is the finding audit
// #468 published. The cycle before it measured that no `// ── ` banner names a
// declaration it governs — still true — and cut on a call-graph argument
// because of it. But the same question asked of ordinary comment blocks is not
// a zero: of the 935 top-level declarations, 444 are headed by a comment block
// and SIXTEEN of those name their owner on the first line. Thirteen of the
// sixteen sit under one banner, FOUR are inside this cut, and the next one
// after them — the block heading `resolvePortfolioLivePrice` — begins at
// EXACTLY RAW_END.
//
// So the cut opens on a 230-unit comment block whose first line is
// `// _spyFreshNum — accept a strictly positive finite number, else null.
// Shared by the`, and ends where the following feature's own block begins. The
// permanent contract proves every line of the opening block is a comment and
// that a blank line separates it from the declaration above, so the block
// belongs to what follows it.
//
// ONE MONOLITH DEPENDENCY, `S`, declared 793,365 units earlier. AND EVERY
// OUTWARD REFERENCE IS GUARDED: all ten — the four to `S` and the six to
// `BACKEND`, `_backendAuthHeaders` and `ttCall` — sit behind a `typeof` test
// AND behind an override on the `deps` argument `resolveFreshSpyPrice` takes.
// This region does not merely resolve its outward names at CALL time, the
// distinction that separated audit #424's rejection from every layer accepted
// since; it is written to work when they are absent. One shipped module already
// does that for its own pinned dependencies — js/services/swing-weekly-candles.js
// — so this is the second, not the first, and the contract counts the set
// rather than claiming an ordinal.
//
// THREE EDGES REACH IN, all three hosted by `refreshPositionsLive` — 138,483
// units, the largest top-level declaration in the monolith. That is ONE
// consumer at three sites, and of the five chain layers whose contract pins
// EDGE_HOSTS at all, three now name that same function.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [909234,920066)   10,832 units, ending `}\n`
//   separator  [920066,920067)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-spy-price.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-technical-parity.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #468 commit this layer was measured against.
const BASE_CHARS = 1478773;
const BASE_UTF8 = 1507516;
const BASE_LF = 25605;
const BASE_SHA256 = '9e0265d2f7c53266d34f71a2b492f990f12fc6c35707300a6cbca3abc5817e66';
const BASE_LOCAL_SCRIPTS = 82;

// Pinned extracted document — the figures audit #468 predicted before the move.
const EXTRACTED_CHARS = 1468002;
const EXTRACTED_UTF8 = 1496711;
const EXTRACTED_LF = 25420;
const EXTRACTED_SHA256 = 'cd9caf4339b47b890dd096468a42b92515fa879859df606629b7c8964a613dfa';
const EXTRACTED_LOCAL_SCRIPTS = 83;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 909234;
const RAW_END = 920067;
const RAW_CHARS = 10833;
const RAW_SHA256 = 'f1716be4f8b6d96e042843bd6ced1d7d27891af1b049d40a073b0a58a1716514';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 10832;
const MODULE_UTF8 = 10866;
const MODULE_LF = 185;
const MODULE_SHA256 = '6a8d2aae2d6b9ea4db9bb70f6f5329dcd21bdab5420866986bebb910864ef9b3';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 920066;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 794,440 units earlier in the document, so once it is removed every
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

function undoPortfolioSpyPrice(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 10,833 units, not 10,832. The UTF-8
  //    length EXCEEDS the UTF-16 length by 34: this module is not pure ASCII,
  //    which its comment blocks alone settle.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the technical-parity owner and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_SPY_PRICE_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioSpyPrice,
};
