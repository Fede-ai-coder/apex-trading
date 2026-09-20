'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO TECHNICAL PARITY — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the b22b355 document and js/portfolio/portfolio-
// technical-parity.js, it returns the merged #466 index.html byte for byte, or
// throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [954446,967048) in monolith coordinates in dev-clean @ b22b355, holding FOUR
// top-level owners: `PORTFOLIO_TECHNICAL_1D_PARITY_ALIASES` (211, a `var`),
// `_resolvePortfolioTechnicalParityKey` (261), `buildFormulaParityGate` (2,943)
// and `buildBackendTechnicalByTickerFromResponse` (7,529). Together they turn a
// backend technical-refresh response into a by-ticker map behind a formula-
// parity gate. 198 lines, 156 of them code, 42 of them not, and zero top-level
// statements.
//
// IT DOES NOT OPEN ON A BANNER, and that is the finding audit #466 published
// rather than an oversight. No `// ── ` banner in this document names a
// declaration it governs any more: there was exactly one, `fetchDXLinkGreeks`,
// and the layer before this one took it. So this boundary is argued from the
// CALL GRAPH, and the permanent contract re-executes that argument: two of the
// four owners are referenced nowhere outside the cut at all, the other two only
// from inside one function, and none of the eighteen owners that follow under
// the same banner names any of them.
//
// The cut opens instead on an 828-unit explanatory comment block whose first
// line is `// Portfolio technical 1D formula-parity keys and their accepted,
// semantically`. That block is prose about the aliases the region owns, so it
// travels with them; §2 of the contract proves every line of it is a comment
// and that a blank line separates it from the declaration above.
//
// ONE MONOLITH DEPENDENCY. `_technicalTfSqueezeState`, declared 189,471 units
// earlier, so load order already resolves it. Nothing else: the region names no
// module at all, chain or foundation, which is BOTH halves of the ninth
// direction reading zero rather than the same zero written twice.
//
// FOUR EDGES REACH IN, all four hosted by `refreshPositionsLive` — 138,483
// units, still the largest top-level declaration in the monolith and the same
// hub the layer before this one answered to. That is ONE consumer at four
// sites, the #458 distinction this layer is the latest to rest on.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1069179,1081780)   12,601 units, ending `}\n`
//   separator  [1081780,1081781)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// WHAT FOLLOWS THE FRAGMENT IS ANOTHER FEATURE'S CODE, immediately: the next
// top-level owner begins at exactly RAW_END, with no blank line, no banner and
// no header between. That is the `tt-reconnect` shape, the one where "extend to
// the next header" would swallow the next feature whole.
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

const TAG = '<script src="./js/portfolio/portfolio-technical-parity.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/dxlink-greeks-fetch.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #466 commit this layer was measured against.
const BASE_CHARS = 1491306;
const BASE_UTF8 = 1520056;
const BASE_LF = 25802;
const BASE_SHA256 = '088c2808f2668e6c47489729119a7baa880938835e1c6b112e1236222765abb8';
const BASE_LOCAL_SCRIPTS = 81;

// Pinned extracted document — the figures audit #466 predicted before the move.
const EXTRACTED_CHARS = 1478773;
const EXTRACTED_UTF8 = 1507516;
const EXTRACTED_LF = 25605;
const EXTRACTED_SHA256 = '9e0265d2f7c53266d34f71a2b492f990f12fc6c35707300a6cbca3abc5817e66';
const EXTRACTED_LOCAL_SCRIPTS = 82;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1069179;
const RAW_END = 1081781;
const RAW_CHARS = 12602;
const RAW_SHA256 = '4057c0b2010aa5d36e4ae0b0bc1a5770e5819a3f095b5947a73bfba573fc7bf7';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 12601;
const MODULE_UTF8 = 12608;
const MODULE_LF = 197;
const MODULE_SHA256 = 'b67908efa8b87770cfe9ab42af697ce2217b731d473b5ccc19fb18f84eb5dbc8';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1081780;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 954,454 units earlier in the document, so once it is removed every
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

function undoPortfolioTechnicalParity(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 12,602 units, not 12,601. The UTF-8
  //    length EXCEEDS the UTF-16 length by 7: this module is not pure ASCII,
  //    which the prose in its opening block alone settles.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the DXLink greeks-fetch owner
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_TECHNICAL_PARITY_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioTechnicalParity,
};
