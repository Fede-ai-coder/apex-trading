'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SCANNER DSS 1D CHART — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #508-era document and
// js/ui/scanner-dss-1d-chart.js, it returns the merged index.html at that
// commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [730705,734265) in document coordinates, holding TWO top-level owners, both
// synchronous: `_dssRender1DChart`, which draws the directional setup card's daily
// price-line chart through Chart.js from the last 90 candles, with two moving
// averages, optional Bollinger and Keltner overlays and a live DXLink mark in place
// of the last close during the regular session, and `_dssRedrawCharts`, which calls
// it when the symbol's scan row and the chart element both exist.
//
// 61 lines: 55 of code, 5 of comment and 1 blank, and ZERO top-level statements.
// Function declarations are the whole of its top-level shape, so it ships no mutable
// binding of its own. It is NOT pure ASCII: one em dash, in a comment, makes its UTF-8
// length 3,561 against 3,559 UTF-16 units, so the byte-count pin and the
// character-count pin are two pins that differ.
//
// THE CUT OPENS ON DOCUMENTATION, NOT A BANNER. The first line is the first of three
// comment lines documenting the renderer; the declaration follows them. The blank
// line above those three lines stays in the monolith. The seam admits six openings
// and the cut takes the one on the first documentation line, so after the move the
// closing brace of `openDirectionalSetupDetail`, one blank line and
// `function showDetail` are adjacent: the join the monolith held once at the end of
// the block, now at the place the cut was made.
//
// NO CONSUMER, TWO CALL-TIME DEPENDENCIES. Nothing in the document or in any local
// script names either owner but the block itself: the renderer's one call sits inside
// the redraw, which nothing calls. The body reads `S` and `getUsEquityMarketSession`
// from the monolith and `smA`, `calcBB` and `calcKC` from js/utils/indicators.js, and
// needs `document` and the Chart.js global, but reads each only inside a function
// body, so the module loads in a bare VM and its tag position is not load-bearing for
// it. No inbound write, no outbound write, no sibling module, no static markup, no
// generated markup.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [730705,734264)   3,559 units, ending `}\n`
//   separator  [734264,734265)   exactly one LF
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

const TAG = '<script src="./js/ui/scanner-dss-1d-chart.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/scanner-stock-scoring.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #507 commit this layer was measured against.
const BASE_CHARS = 1430929;
const BASE_UTF8 = 1459414;
const BASE_LF = 24722;
const BASE_SHA256 = '68d8ba6231f83b162d1d05201ccb8d7c5e458766320c0acbb3ec3fa286288afe';
const BASE_LOCAL_SCRIPTS = 100;

// Pinned extracted document — INDEX_AFTER is the figure audit #508 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1427425;
const EXTRACTED_UTF8 = 1455908;
const EXTRACTED_LF = 24661;
const EXTRACTED_SHA256 = '6cc34d058d7688d64606e0f8f6f71a3d6f49bed623650c2ece38864a6fdb8548';
const EXTRACTED_LOCAL_SCRIPTS = 101;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 730705;
const RAW_END = 734265;
const RAW_CHARS = 3560;
const RAW_SHA256 = '6237075ee1a0e8b6e587338c94a14cf2a414922ba2d185e69102f6558a626456';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 3559;
const MODULE_UTF8 = 3561;
const MODULE_LF = 61;
const MODULE_SHA256 = 'dcc0d033e8e99dea2bb65ed3265aa87ee97d3c189dc874c001cd4c04b9c17eb1';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 734264;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 614,684 units earlier in the document, so once it is removed every byte
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

function undoScannerDss1dChart(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 3,560 units, not 3,559. Its UTF-8
  //    length (3,561) differs from its UTF-16 length by the one em dash in a
  //    comment; both are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the scanner stock scoring tag
  //    and immediately before the inline monolith, so it loads ahead of every
  //    caller. The module needs nothing from the monolith at load.
  if (count(html, TAG) !== 1) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SCANNER_DSS_1D_CHART_UNDO_BASE_IDENTITY');
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
  isApplied, undoScannerDss1dChart,
};
