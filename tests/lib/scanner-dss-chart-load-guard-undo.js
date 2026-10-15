'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SCANNER DSS CHART LOAD GUARD — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the #502-era document and
// js/services/scanner-dss-chart-load-guard.js, it returns the merged index.html
// at that commit byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [298485,300638) in document coordinates, holding THREE top-level owners: the
// TTL constant `_DSS_CHART_LOAD_TTL_MS`, the guard object `_dssChartLoadGuard`
// that remembers the last complete backend candle load and the load in flight,
// and the function `_dssLoadBackendCandlesDeduped`, which starts the backend
// candle fetch for a symbol or hands back the promise of an identical fetch that
// is already running. They keep `_dssRenderLargeCharts` from reloading the
// candles on every re-entry.
//
// 39 lines: 25 of code, 14 of comment, none blank, and ZERO top-level
// statements. Two `var` initialisers and a function declaration are the whole of
// its top-level shape, so unlike the layers before it this one ships MUTABLE
// BINDINGS. It is NOT pure ASCII: 19 of its characters are outside it, 17 of them
// the box-drawing rule of the banner and 2 em dashes, so its UTF-8 length (2,190)
// differs from its UTF-16 length (2,152), and the byte-count pin and the
// character-count pin each say something the other does not.
//
// THE CUT OPENS ON THE BANNER. The first line is the banner of its region, with
// nine further comment lines below it before the first declaration: 820 units of
// documentation that describe all three owners. The boundary is a judgement and
// not something the seam decides: `assertSeam` accepts EIGHTEEN line starts
// between the previous owner's declaration and the first declaration, and the
// permanent contract measures them rather than citing them. Opening on the
// banner keeps the blank line that already separated the resize listener above
// it from the block, so the listener's closing brace and the next owner's
// documentation stay one blank line apart.
//
// ONE CONSUMER, ONE DEPENDENCY, STATE SHARED THROUGH AN ALIAS. The references
// that reach in come from a single consumer, `_dssRenderLargeCharts`, at four
// sites: the guard once, the TTL constant twice, the function once. The consumer
// binds the guard to a local alias and writes four of its seven fields through
// it; the function writes the other three through its own alias. The body calls
// `_scannerFetchBackendCandlesForChart`, which stays in the monolith, inside a
// `try`, so a missing dependency comes back as a REJECTED promise rather than an
// exception. The only mention of `window` is in the duplicate-skip log. Nothing
// runs at load, so the module loads in a bare VM and its tag position is not
// load-bearing for it. No inbound write, no outbound write, no sibling module,
// no static markup, no generated markup.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [298485,300637)   2,152 units, ending `}\n`
//   separator  [300637,300638)   exactly one LF
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

const TAG = '<script src="./js/services/scanner-dss-chart-load-guard.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-option-streamer-diagnostics.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #501 commit this layer was measured against.
const BASE_CHARS = 1436136;
const BASE_UTF8 = 1464659;
const BASE_LF = 24796;
const BASE_SHA256 = '94fd84a3d84bd7045c9ff58980fa56029f6f50deecadbc26c7623c4b1ad27a05';
const BASE_LOCAL_SCRIPTS = 97;

// Pinned extracted document — INDEX_AFTER is the figure audit #502 predicted
// before the move, and the move produced it exactly.
const EXTRACTED_CHARS = 1434053;
const EXTRACTED_UTF8 = 1462538;
const EXTRACTED_LF = 24757;
const EXTRACTED_SHA256 = '2152be03332cf4f65cec3e209f4ba03ba90bdbf84160b27d98c7647d31116261';
const EXTRACTED_LOCAL_SCRIPTS = 98;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 298485;
const RAW_END = 300638;
const RAW_CHARS = 2153;
const RAW_SHA256 = '6f70813bec09b4db1505501bf55797349374dbf311621d803a1e5f8434ad4ed8';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 2152;
const MODULE_UTF8 = 2190;
const MODULE_LF = 39;
const MODULE_SHA256 = '36470a958ef001f61244f4e9d6715739fc05cfe83dd9bf57edceb174f1824d72';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 300637;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 182,664 units earlier in the document, so once it is removed every byte
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

function undoScannerDssChartLoadGuard(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 2,153 units, not 2,152. This module is
  //    NOT pure ASCII, so its UTF-8 length differs from its UTF-16 length; both
  //    are pinned, since a pin on one does not stand in for the other.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module whose last line is not a closing
  //    brace is rejected with its OWN error, so a caller learns it re-absorbed
  //    the separator or lost its ending rather than only that some hash did not
  //    match. The second disjunct is subsumed by the first, as the header
  //    records; it is kept to name the failure rather than to add a check.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the option streamer diagnostics
  //    owner and immediately before the inline monolith, so it loads ahead of every
  //    caller. The module needs nothing from the monolith at load.
  if (count(html, TAG) !== 1) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('SCANNER_DSS_CHART_LOAD_GUARD_UNDO_BASE_IDENTITY');
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
  isApplied, undoScannerDssChartLoadGuard,
};
