'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND FULL-REFRESH VALIDATION — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the c7efffc document and js/portfolio/backend-full-
// refresh-validation.js, it returns the merged #475 index.html byte for byte,
// or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1025719,1028656) in document coordinates in dev-clean @ c7efffc, holding a
// SINGLE top-level owner, a function: `_validateBackendFullRefreshPayload`
// (2,709). It checks a backend full-refresh payload before any legacy step is
// skipped and returns `{ valid, warnings[] }`; a non-empty warnings array means
// trust must be withheld for the affected fields.
//
// 57 lines, 46 of them code and 11 comment-only, with ZERO blank lines and ZERO
// top-level statements. One function declaration and one column-0 closer are the
// whole of its top-level shape, so this layer ships no mutable binding.
//
// THE CUT TAKES ITS OWN DOCUMENTATION, and that is the boundary judgement audit
// #475 published and defended. The screen enumerates runs beginning at a region
// start or a declaration start, so what it can see is the function alone. This
// cut opens 226 units and three lines earlier, on the comment block that says
// what the function validates and what it returns. `assertSeam` accepts both
// boundaries and the coupling is identical on all nine directions across them,
// because comments carry no references — what changes is only whether the module
// ships the sentences that explain it. The permanent contract asserts that the
// screen does NOT enumerate this boundary, so the 226 units stay a judgement
// this chain defends rather than something a rule produced.
//
// IT CUTS INSIDE A `// ── ` BANNER REGION, on purpose. The banner reads
// `// ── [PortfolioRefreshPayload] — gated verbose payload diagnostics`, and the
// region it opens runs 69,258 units over TWENTY-SEVEN owners — the mis-labelled
// catch-all audit #466 named. The dead rule *"never cut inside a `// ── ` banner
// region"* is pinned as dead in §5(c) of
// tests/journal-map-audit-boundary-contract.test.js, and #475 measured what
// obeying it would have cost here: 66,321 more units, 26 more owners,
// byConsumer from ONE to 64 across NINE consumers, and 23 monolith dependencies
// where this cut has none. The permanent contract re-measures both sides rather
// than repeating those figures.
//
// EVERY COUPLING DIRECTION IS ZERO BUT ONE. A single reference reaches in, from
// a single consumer, `refreshPositionsLive`, at a single site. No monolith
// dependency, no inbound write, no property write, no outbound write, no sibling
// module, no static markup, no generated markup, no outbound generated
// reference, and both halves of the ninth direction are zero. The nine-direction
// total is 1 — and of the 1,878 clean candidates the screen enumerated, exactly
// one scores byConsumer == 1. The contract asserts that count and that identity
// together, which is why this says "one of 1,878" and not "the cleanest".
//
// NO MONOLITH DEPENDENCY AT ALL. Its free identifiers are `Object` (1), `Array`
// (5), `String` (1), `isFinite` (2) and `parseFloat` (2) — all ECMAScript
// intrinsics present in any realm. That is why the module loads AND RUNS in a
// completely bare VM with nothing injected. It is not a first, and the contract
// counts the layers that pin MONOLITH_DEPENDENCIES empty rather than reaching
// for a superlative.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1025719,1028655)   2,936 units, ending `}\n`
//   separator  [1028655,1028656)   exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what keeps `git diff --check` clean on a file that would otherwise end mid-
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// NOT PURE ASCII. The UTF-8 length exceeds the UTF-16 length by 4: the module
// carries exactly two em dashes, both inside its comment lines.
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
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
//
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/portfolio/backend-full-refresh-validation.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-leg-quantity.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #475 commit this layer was measured against.
const BASE_CHARS = 1460538;
const BASE_UTF8 = 1489157;
const BASE_LF = 25260;
const BASE_SHA256 = '3bfa332025683970702a7a889f5f8d0ce35ec49f0ba4eca836d3c6adca3f965c';
const BASE_LOCAL_SCRIPTS = 85;

// Pinned extracted document — INDEX_AFTER is the figure audit #475 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1457675;
const EXTRACTED_UTF8 = 1486290;
const EXTRACTED_LF = 25203;
const EXTRACTED_SHA256 = '4560fd43a857ea60feef29fda90ade7826c39d7e76ce3a8f7794c13b941be19d';
const EXTRACTED_LOCAL_SCRIPTS = 86;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1025719;
const RAW_END = 1028656;
const RAW_CHARS = 2937;
const RAW_SHA256 = '698fa8641696d230d379cf84b5af5d5fa2b38f317ef47692b18662bcd4a1f246';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 2936;
const MODULE_UTF8 = 2940;
const MODULE_LF = 57;
const MODULE_SHA256 = '1a9044a67603bea70723a6645008411f3f5fca719e1eede414b1a9a43b45cf34';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1028655;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 910,735 units earlier in the document, so once it is removed every byte
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

function undoBackendFullRefreshValidation(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 2,937 units, not 2,936. The UTF-8
  //    length EXCEEDS the UTF-16 length by 4: this module is not pure ASCII,
  //    which its two em dashes alone settle.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the leg-quantity owner and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('BACKEND_FULL_REFRESH_VALIDATION_UNDO_BASE_IDENTITY');
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
  isApplied, undoBackendFullRefreshValidation,
};
