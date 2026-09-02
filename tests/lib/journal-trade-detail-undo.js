'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Trade Detail — byte-exact undo of the audited Candidate G extraction.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [1717386,1766490) in dev-clean @ 9f554aa7, holding exactly six owners — all
// plain function declarations, none async, and NOT ONE `var`:
//
//     function closeTradeDetail()               101 units — closes the modal
//     function _tradeMetrics(trade)           2,861 units — pure derived metrics
//     function showTradeDetails(id)          38,321 units — the whole detail view
//     function _renderAdjustmentTimeline()    5,756 units — the adjustment history
//     function _priceCellHtml(mark, ll)       1,365 units — one price cell
//     function _detailCell(label, value, raw)   330 units — one detail cell
//
// Audit #416 measured this region against the whole remaining monolith. Under
// one stated rule — a section is a column-0 `// ── ` banner running to the next
// one — the script holds 95 sections, and this is the NINTH largest. Size is
// not why it was chosen: the eight larger sections are reached from outside
// themselves by between 10 and 172 executable references, and this one by TWO.
// It declares no mutable state at all, so there is none to split.
//
// TWO CANDIDATES were measured. G (this one) takes the modal banner and
// `closeTradeDetail`; H would have taken the metrics block alone. Their
// dependency surface and executable edges are identical, so H's only difference
// was stranding `closeTradeDetail` — and with it the modal's own static markup
// handler — inline, splitting a two-function feature for no measurable gain.
//
// THE LOAD-ORDER QUESTION, and why it is not a hazard. `showTradeDetails` and
// `_tradeMetrics` were ALREADY depended upon by three shipped modules before
// this extraction: journal-ui.js (#46), journal-close-legs.js (#56) and
// journal-trade-forms.js (#57). This module's tag takes the inline monolith's
// old slot, so it loads AFTER all three — a definition following its callers.
// That is safe here because classic `function` declarations are late-bound and
// nothing reads these names while the page is still parsing: the audit scanned
// all 59 application parts and found every one of the 18 references call-time,
// with NOT ONE at evaluation time, anywhere in the application.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [1717386,1766489)  49,103 units, ends `}\n`
//   separator  [1766489,1766490)  exactly one LF
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. The separator is document structure, not module content, and it
// is re-inserted HERE, by the undo — never left inline.
//
// A FALSE POSITIVE, PINNED. The markup carries its own comment naming this
// feature, `<!-- ══ TRADE DETAIL MODAL`, using ══ where the code banner used
// ──. They cannot be matched for one another: the code banner left index.html
// with this fragment, and the markup comment correctly stayed. The permanent
// contract asserts both halves of that.
//
// Contract: undoJournalTradeDetail(indexHtml, moduleSource) reconstructs
// dev-clean @ 9f554aa70b5ee726c25e98afca8b2f8d7d4ff699 exactly, or throws.
//
// FAIL CLOSED. Every guard rejects rather than guesses: a missing tag, a
// duplicate tag, a reordered tag, a module that absorbed the separator, a
// module ending on a blank line, a truncated or mutated module, a document too
// short, an already-unextracted document, a partially applied state, or foreign
// content anywhere all raise. There is no "best effort" path.
//
// REACHABILITY. Every error below except the closing BASE_IDENTITY is reachable
// by an ordinary mutant, and the permanent contract exercises each one with a
// control asserting its EXACT message: BAD_INPUT, MODULE_IDENTITY (size and
// hash), MODULE_SEPARATOR, TAG_IDENTITY, TAG_ADJACENCY, EXTRACTED_IDENTITY.
// BASE_IDENTITY is a DELIBERATE redundant final gate — once the module hash and
// the whole-document hash have both passed, the reconstruction is a pure
// function of two fixed byte strings, so no ordinary mutant can reach it. It is
// kept so the pinned base identity is enforced on the value actually returned
// rather than inferred from its inputs, exactly as
// tests/lib/journal-close-legs-undo.js documents for its own closing check.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism
// and must never be treated as one: it answers `true` for a document whose
// layers are being peeled out of order. Everything that makes this helper safe
// lives in the guards below, which run after the routing decision.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/journal-trade-detail.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/journal-trade-forms.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #416 audit commit this layer was measured against.
const BASE_CHARS = 1815024;
const BASE_UTF8 = 1848827;
const BASE_LF = 31737;
const BASE_SHA256 = '7e0851ae220daa6454cf2f3f093821b29c8aff8ba137cb0bbef24283bb976156';
const BASE_LOCAL_SCRIPTS = 58;

// Pinned extracted document — the figure audit #416 predicted before the move.
const EXTRACTED_CHARS = 1765976;
const EXTRACTED_UTF8 = 1799021;
const EXTRACTED_LF = 30869;
const EXTRACTED_SHA256 = '4c37a2ac130c753a1100d6633df688bc6f97ae429535f0b3d86a64fa7bf96be9';
const EXTRACTED_LOCAL_SCRIPTS = 59;

// The raw range index.html gave up, in base coordinates: body + separator.
// Exported as pins for the permanent contract to check against the base blob;
// deliberately NOT re-checked at runtime (see the note in the header).
const RAW_AT = 1717386;
const RAW_END = 1766490;
const RAW_CHARS = 49104;
const RAW_SHA256 = '2462dc790cc07e1c6db84a3c4c940cc105dd09b33a0e3f5383d945a0ee35d0ef';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 49103;
const MODULE_UTF8 = 49861;
const MODULE_LF = 868;
const MODULE_SHA256 = '70e2952a2664c812184fe8b4d3825be685d6a2945d00eedc4c0eb12a453e70fe';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 1766489;
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

function undoJournalTradeDetail(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 49,104 units, not 49,103.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one Trade Detail tag, loaded immediately after
  //    journal-trade-forms.js and immediately before the inline monolith. A
  //    missing tag, a duplicate, or a reordered tag is rejected here — each
  //    with its own error. An already-unextracted document has no tag and
  //    fails as TAG_IDENTITY.
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_TRADE_DETAIL_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('JOURNAL_TRADE_DETAIL_UNDO_TAG_ADJACENCY');
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_EXTRACTED_IDENTITY');
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

  // 7. The final gate — deliberately redundant, as the header explains, and
  //    kept so the pinned base identity is enforced on the value actually
  //    returned rather than inferred from its inputs.
  if (rebuilt.length !== BASE_CHARS ||
      Buffer.byteLength(rebuilt, 'utf8') !== BASE_UTF8 ||
      lineFeeds(rebuilt) !== BASE_LF ||
      digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_TRADE_DETAIL_UNDO_BASE_IDENTITY');
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
  isApplied, undoJournalTradeDetail,
};
