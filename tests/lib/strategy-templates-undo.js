'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Strategy templates — byte-exact undo of the audited region.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [924,8553) in monolith coordinates in dev-clean @ d3a93f8, holding ONE owner
// and NO function:
//
//     // ═══ MULTI-LEG STRATEGY TEMPLATES ═══             245 units of header
//     var STRATEGY_TEMPLATES = { … };                   7,382 units, pure data
//
// 245 + 7,382 + 1 closing newline = 7,628. There is no second construct and no
// top-level statement. Measured across the twenty-five layers this chain now
// peels, it is the ONLY one whose module declares no function at all, and the
// FOURTH with a single owner — after apex-post-auth-init, the rich async
// snapshot and the portfolio backend candles, whose single owners are all
// functions.
//
// THE BOUNDARY THE AUDIT PUBLISHED WAS 178 UNITS SHORT, and it fails on the
// side no earlier cycle has. Every boundary dispute CLAUDE.md records — the two
// dead end-rules, the trade-detail region that spans a banner, the tt-reconnect
// and post-auth regions followed immediately by another feature, the 551 and
// 17,734 units the screening rule would have swallowed — is about where a
// region ENDS. This one is about where it BEGINS. (Scoped to that document's
// record, which is the set actually checked.)
//
// Audit #440 recommended [1102,8553). 1102 IS a top-level banner mark, and
// `assertSeam` accepts it — but it is the CLOSING rule of the section header,
// not the opening one:
//
//     // ═══════════════════════════════════…    924   <- opens the header
//     // MULTI-LEG STRATEGY TEMPLATES
//     // Each template defines the leg skeleton. Null fields are filled …
//     // ═══════════════════════════════════…   1102   <- ALSO a banner mark
//     var STRATEGY_TEMPLATES = {
//
// `topLevelBanners` matches every `// ═══` rule line, so a four-line `// ═══`
// header yields TWO marks and a banner-to-banner screen splits it in half.
// Cutting at 1102 moves the closing rule plus the declaration and leaves the
// opening rule, the title and the description stranded in the monolith,
// running straight into the next section's header:
//
//     // ═══════════════════════════════════…
//     // MULTI-LEG STRATEGY TEMPLATES
//     // Each template defines the leg skeleton. Null fields are filled …
//     // ═══════════════════════════════════…      <- STATE's header opens here
//     // STATE
//
// Byte-exact and reversible, and still wrong. The cut is 924, which is what
// every one of the seven `// ═══`-headed layers already shipped did: the
// contract measures all twenty-five modules and NONE opens on a naked rule.
// Both offsets are pinned there — 924 as the boundary, 1102 as refuted.
//
// WHY IT COULD BE TAKEN. The region scores 3 on inbound references, 0 on
// outbound property writes and 0 on outbound dependency names — the three
// directions audit #440's §6 established after finding the screen had only ever
// counted two of them. It depends on NOTHING the monolith declares. It loads in
// a COMPLETELY empty VM, defining exactly its one owner.
//
// THE INBOUND ZERO HERE IS A MEASUREMENT, unlike the vacuous one the greeks
// layer below records. That region owned no binding, so no outside write could
// reach it. This one owns a mutable `var`, so a write is possible; the audit
// looked across the monolith, the generated markup and all sixty-eight sibling
// modules and found that every one of the twelve references is a read.
//
// AND `evaluationTimeReads` IS THE WRONG INSTRUMENT FOR IT. That scan walks
// top-level STATEMENTS; this region has none, so its empty answer is vacuous in
// exactly the way the greeks layer's inbound zero was. A `var` initialiser
// reading a foreign name runs at load and the scan does not report it. The bare
// VM load does, and that is what the contract rests the claim on.
//
// THE MODULE LOADS AFTER ITS ONLY SIBLING CONSUMER. `js/ui/journal-trade-forms.js`
// is script #57 and reads STRATEGY_TEMPLATES nine times; this tag is #68, the
// last of the sixty-nine local scripts before the inline monolith. (Both
// positions are zero-based, as MODULE_POSITION and SIBLING_POSITION are in the
// contract; this line said #69 against a #57 until the prose check compared
// them.) That is safe because every read
// sits inside a function body and nothing reads the name at evaluation time —
// the #417 shape, asserted in the contract's §6 rather than assumed.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [114830,122458)  7,628 units, ends `};\n`
//   separator  [122458,122459)  exactly one LF
//
// (document coordinates; the monolith itself begins at 113906.)
//
// BOTH leave index.html. Only the body is written to the module file, which is
// what lets it end on a real line of code so `git diff --check` sees no blank
// line at EOF. This layer follows the post-#406 convention; the eight oldest
// layers in the chain have no separator concept at all, as the reconstruction
// bridge records.
//
// THE ENDING IS NOT `}\n`. A `var` bound to an object literal closes on `};`,
// so MODULE_LAST_LINE is `\n};\n` and the `endsWith('}\n')` clause the recent
// layers share would REJECT this module. Measured over all twenty-five layers,
// TWENTY-TWO end `}\n` and THREE do not: backend portfolios (`…Journal;\n`),
// journal-backend-write-through (`})();\n`) and this one.
//
// Contract: undoStrategyTemplates(indexHtml, moduleSource) reconstructs
// dev-clean @ d3a93f8 exactly, or throws.
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
// Individual CLAUSES are a weaker claim than individual errors, and the
// contract measures which ones are load-bearing by mutation rather than by
// reading. Two are not, and are kept because they name their failure at the
// point where it happens:
//
//   - `count(html, ANCHOR_TAG + TAG) !== 1` — the tag-identity check above it
//     already fixes `count(html, TAG)` at exactly 1, so the pair cannot occur
//     twice, and the longer `ANCHOR_TAG + TAG + INLINE_OPEN` check below
//     rejects what is left. TAG_ADJACENCY stays reachable through that second
//     check, which is what the contract's control exercises.
//   - `moduleSource.endsWith('\n\n')` in the separator guard — `endsWith`
//     tests the final units, so a module that re-absorbed the separator ends
//     `};\n\n` and already fails the MODULE_LAST_LINE clause beside it. The
//     same subsumption holds for every ending shape in this chain, because
//     each pinned ending closes on a single newline.
//
// ON isApplied. It reports only whether this layer's tag is present, and is a
// ROUTING decision for the reconstruction bridge — it lets a document that
// predates this layer pass through untouched. It is NOT the safety mechanism:
// it answers `true` for a document whose layers are being peeled out of order.
// Everything that makes this helper safe lives in the guards below it.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/config/strategy-templates.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-dxlink-greeks.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #440 commit this layer was measured against.
const BASE_CHARS = 1577450;
const BASE_UTF8 = 1607582;
const BASE_LF = 27389;
const BASE_SHA256 = '572a03e9f80c0f93c0dafb626b45cc1c3388703d531d14a72e5956853de34928';
const BASE_LOCAL_SCRIPTS = 68;

// Pinned extracted document. NOT the figure audit #440 predicted: that model cut
// at the header's closing rule, 178 units late, as the header above records.
const EXTRACTED_CHARS = 1569879;
const EXTRACTED_UTF8 = 1599759;
const EXTRACTED_LF = 27322;
const EXTRACTED_SHA256 = 'e12a8cb5a771a484b2bdfba2cc63fba5647299af433a770b83cd9aad8a6aa817';
const EXTRACTED_LOCAL_SCRIPTS = 69;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 114830;
const RAW_END = 122459;
const RAW_CHARS = 7629;
const RAW_SHA256 = 'ed9b6736a6e8bf957ea649e17ee9a46ee3fe25211063a4c30aa586916a7507cb';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 7628;
const MODULE_UTF8 = 7880;
const MODULE_LF = 67;
const MODULE_SHA256 = 'f306af2836b074a6e2efa92f8f3911b8ef62223b1d6849ddadb66a8e50a4df36';
// The object literal's terminator, on its own line. Pinned instead of `}\n`,
// which this module does not end on.
const MODULE_LAST_LINE = '\n};\n';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 122458;
// Where the module goes back, in tag-free coordinates. The one added tag line
// sits 932 units earlier in the document, so once it is removed every byte
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

function undoStrategyTemplates(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('STRATEGY_TEMPLATES_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 7,629 units, not 7,628.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('STRATEGY_TEMPLATES_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. NOTE the shape: this region ends on the
  //    terminator of an object literal, so the test is `\n};\n` rather than the
  //    `}\n` the recent layers share — that clause would reject this module.
  //    A module carrying a trailing blank line is rejected with its OWN error,
  //    so a caller learns it re-absorbed the separator rather than only that
  //    some hash did not match.
  if (!moduleSource.endsWith(MODULE_LAST_LINE) || moduleSource.endsWith('\n\n')) {
    throw new Error('STRATEGY_TEMPLATES_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('STRATEGY_TEMPLATES_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after portfolio-dxlink-greeks.js and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) throw new Error('STRATEGY_TEMPLATES_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('STRATEGY_TEMPLATES_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('STRATEGY_TEMPLATES_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('STRATEGY_TEMPLATES_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('STRATEGY_TEMPLATES_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG, INLINE_OPEN, SEPARATOR, SEPARATOR_AT,
  BASE_CHARS, BASE_UTF8, BASE_LF, BASE_SHA256, BASE_LOCAL_SCRIPTS,
  EXTRACTED_CHARS, EXTRACTED_UTF8, EXTRACTED_LF, EXTRACTED_SHA256, EXTRACTED_LOCAL_SCRIPTS,
  RAW_AT, RAW_END, RAW_CHARS, RAW_SHA256,
  MODULE_CHARS, MODULE_UTF8, MODULE_LF, MODULE_SHA256, MODULE_LAST_LINE,
  REINSERT_AT,
  isApplied, undoStrategyTemplates,
};
