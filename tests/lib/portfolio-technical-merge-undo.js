'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO TECHNICAL MERGE — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the 471d48c document and
// js/portfolio/portfolio-technical-merge.js, it returns the merged #458
// index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [981453,987286) in monolith coordinates in dev-clean @ 471d48c, holding ONE
// top-level owner: `_mergeBatchInto`, 5,831 units, which folds one batch of a
// portfolio technical refresh into an accumulator. 116 lines, 111 of them code
// and 4 of them comment, and no `var`, `let` or `const` at module scope at all.
//
// IT DEPENDS ON NOTHING, because everything it touches ARRIVES AS A PARAMETER.
// `_mergeBatchInto(merged, data, timeframes)` reads the accumulator, the batch
// and the timeframe list it was handed, and its own locals. It names no
// declaration of the monolith, no sibling module, no markup, and it writes every
// property through `merged` — a parameter, not a global it does not own. Ten of
// the shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, so a runtime
// dependency is the ordinary case in this chain and having none is the thing
// worth recording.
//
// TWO EDGES REACH IN AND THEY ARE ONE RELATIONSHIP. Audit #458 is the cycle that
// separated those two ideas. `fetchPortfolioTechnicalRefresh` calls this
// function twice:
//
//     _mergeBatchInto(merged, result.data, ['1D']);
//     _mergeBatchInto(merged, result.data, ['4H']);
//
// Identical once the timeframe literal is masked. The nine-direction score
// counts SITES, so it reads 2; the coupling is ONE consumer. Read the old way
// this region ranked below a 2,710-unit one whose single caller calls it once,
// though the two differ in no criterion but size — and the audit measured that
// the disagreement covers 168 of the 2,087 load-clean candidates, one in twelve,
// rather than just these two. The permanent contract re-executes both readings
// on its own numbers, because the audit file is deleted by the same PR that adds
// the contract.
//
// THE CUT STOPS AT ONE OWNER BECAUSE THE CONSUMER COSTS MORE THAN IT SAVES. The
// single consumer is the NEXT top-level owner, adjacent to the cut, so absorbing
// it was genuinely available: a legal seam at 15,095 units that also runs
// nothing at load. It was declined on measurement, not instinct. The pair names
// three monolith declarations — `S`, `_fetchPortfolioTechnicalBatch` and
// `_portfolioTechnicalDebugEnabled` — where this region names none, and reads 5
// on the consumer scale against this region's 1. §5 of the contract measures the
// pair rather than asserting it was worse.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 78th and final local script
// (index 77 of 78), which is what the permanent contract pins as MODULE_POSITION,
// and §6 loads it in a COMPLETELY empty VM: one global defined, and no fetch,
// timer, storage read or listener. §6 also CALLS it, on a minimal batch and then
// on no batch at all, because a function that loads bare but throws on its own
// shape would satisfy every other clause. Loading last is where the tag sits, not
// a requirement it has — with no dependencies at all, this module could load
// anywhere.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1095920,1101752)   5,832 units, ending `}\n`
//   separator  [1101752,1101753)   exactly one LF
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

const TAG = '<script src="./js/portfolio/portfolio-technical-merge.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/backend-positions-aggregate.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #458 commit this layer was measured against.
const BASE_CHARS = 1510282;
const BASE_UTF8 = 1539098;
const BASE_LF = 26165;
const BASE_SHA256 = '43fdeeff33a11e3b3028bb94dca447f3f711beb8438dd74f3d96928075da90db';
const BASE_LOCAL_SCRIPTS = 77;

// Pinned extracted document — the figures audit #458 predicted before the move.
const EXTRACTED_CHARS = 1504517;
const EXTRACTED_UTF8 = 1533331;
const EXTRACTED_LF = 26050;
const EXTRACTED_SHA256 = '6944b4231b09b963e6c044de4f0ea6c2a4623a042b81fb1331303b06b5258e5f';
const EXTRACTED_LOCAL_SCRIPTS = 78;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 1095920;
const RAW_END = 1101753;
const RAW_CHARS = 5833;
const RAW_SHA256 = 'eb1c52a8e605d8ff84eecb8c8e41ef440996abaa06fd2595b136361e03951fc9';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 5832;
const MODULE_UTF8 = 5834;
const MODULE_LF = 115;
const MODULE_SHA256 = 'ef00b7311b032154426e10f2787a699d9b3b6082350171be51a7df6cc76c134b';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1101752;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 981,461 units earlier in the document, so once it is removed every
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

function undoPortfolioTechnicalMerge(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 5,833 units, not 5,832. The UTF-8
  //    length exceeds the UTF-16 length by two, so this module is NOT pure
  //    ASCII, unlike the layer immediately before it in the chain.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after backend-positions-aggregate.js
  //    and immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('PORTFOLIO_TECHNICAL_MERGE_UNDO_BASE_IDENTITY');
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
  isApplied, undoPortfolioTechnicalMerge,
};
