'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL LEG QUANTITY — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 4168e32 document and js/portfolio/portfolio-leg-
// quantity.js, it returns the merged #473 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [862247,865582) in document coordinates in dev-clean @ 4168e32, holding FIVE
// top-level owners, all of them functions: `_portfolioResidualQuantityFields`
// (273), `_portfolioGrossQuantityFields` (87), `_portfolioQuantityFieldPresent`
// (237), `_portfolioStrictQuantity` (255) and `_portfolioReadQuantityField`
// (321). Together they are the canonical leg-quantity vocabulary and the two
// readers over it: which field names carry a residual and which a gross size,
// what counts as PRESENT (an own property that is neither null nor undefined —
// an empty string IS present, and therefore invalid rather than absent), what
// counts as a readable quantity (a finite number or a well-formed numeric
// string; deliberately not parseFloat, which turns '3abc' into a plausible
// 3-lot position), and the first-present-field-wins resolution over them.
//
// 68 lines, 33 of them code, 32 comment-only and 3 blank, and ZERO top-level
// statements. This layer ships no mutable binding: five function declarations
// and five column-0 closers are the whole of its top-level shape — which is
// the property its own banner gives the reason for, since the suites that build
// sandboxes out of individually extracted functions would find a bare `var`
// silently absent.
//
// THE CUT OPENS ON A `// ── ` BANNER, AND THAT BANNER GOVERNS FAR MORE THAN THE
// CUT — the second consecutive cycle for which that is true. The banner reads
// `// ── CANONICAL LEG QUANTITY — reconciled with the backend owner (semantics
// 2.1.0)`, and the region it opens runs 7,697 units over SEVENTEEN declarations:
// the five here, then the resolver, the explicit-open-qty readers, the close-
// marker and terminal-leg predicates, the active-leg selectors and a net-greek
// aggregate. So the cut stops after the fifth owner and inside the banner
// region, which is what the dead rule *"never cut inside a `// ── ` banner
// region"* forbids. That rule is pinned as dead in §5(c) of
// tests/journal-map-audit-boundary-contract.test.js, and #473 measured the cost
// of obeying it here: byConsumer 2 against 24, two consumers against eight,
// 3,335 units against 7,697. The permanent contract re-measures both sides.
//
// NO MONOLITH DEPENDENCY AT ALL. Unlike the layer before it, this region names
// zero monolith declarations — its only free identifiers are `Object` (1),
// `isFinite` (2) and `Number` (1), all ECMAScript intrinsics present in any
// context. That is why the module loads and RUNS in a completely bare VM with
// nothing injected. It is not a first: six of the twenty layers that pin
// MONOLITH_DEPENDENCIES already pin it empty, and the contract counts them
// rather than reaching for a superlative.
//
// SIX EDGES REACH IN, from TWO consumers — `_portfolioResolveLegQuantity` (4
// sites) and `_portfolioLegExplicitOpenQty` (2) — and BOTH of them sit
// immediately downstream of the cut. Two edge hosts is new for this chain,
// counted over the seven shipped layers that pin EDGE_HOSTS at all, every one
// of which names exactly one.
//
// AND THAT IS THE BOUNDARY FINDING. Growing the cut to absorb those consumers
// makes the RAW nine-direction total FALL (6 at five owners, 4 at six, 3 at
// seven) while byConsumerSplit — the metric this programme ranks on — RISES
// (2, 3, 3). The two metrics disagree in direction, and the reason is
// measurable: the sixth owner is named by js/services/portfolio-stress-parity.js,
// an already-shipped FOUNDATION module, so the sibling direction goes 0 → 1 and
// stays there. Five owners is the last boundary at which no module reaches in.
//
// NOTHING REACHES OUT. Both halves of the ninth direction are zero: this region
// references no chain module and no foundation module.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [862247,865581)   3,334 units, ending `}\n`
//   separator  [865581,865582)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-leg-quantity.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/apex-storage-recovery.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #473 commit this layer was measured against.
const BASE_CHARS = 1463808;
const BASE_UTF8 = 1492447;
const BASE_LF = 25328;
const BASE_SHA256 = 'f838cb8fce06df6395aa8ea73075d8e0b37818c5852824763fa6e01c580c0250';
const BASE_LOCAL_SCRIPTS = 84;

// Pinned extracted document — INDEX_AFTER is the figure audit #473 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1460538;
const EXTRACTED_UTF8 = 1489157;
const EXTRACTED_LF = 25260;
const EXTRACTED_SHA256 = '3bfa332025683970702a7a889f5f8d0ce35ec49f0ba4eca836d3c6adca3f965c';
const EXTRACTED_LOCAL_SCRIPTS = 85;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 862247;
const RAW_END = 865582;
const RAW_CHARS = 3335;
const RAW_SHA256 = '7806d15b171b6b56f15e8021c02c6d4ee5905677920a0411127708fb2fdc2894';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 3334;
const MODULE_UTF8 = 3354;
const MODULE_LF = 68;
const MODULE_SHA256 = '864defd055e60aac363773766b742db8ebb941ea40d8b15e9211e419ffc301c1';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 865581;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 747,328 units earlier in the document, so once it is removed every
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

function undoPortfolioLegQuantity(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 3,335 units, not 3,334. The UTF-8
  //    length EXCEEDS the UTF-16 length by 20: this module is not pure ASCII,
  //    which the box-drawing rule and the em dash in its banner alone settle.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the storage-recovery owner and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_LEG_QUANTITY_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioLegQuantity,
};
