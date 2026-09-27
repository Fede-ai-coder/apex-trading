'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// APEX STORAGE RECOVERY — BYTE-EXACT UNDO.
//
// Reconstructs the pre-extraction index.html from the shipped document and the
// shipped module. Given the aced93f document and js/services/apex-storage-
// recovery.js, it returns the merged #470 index.html byte for byte, or throws.
//
// WHAT THIS LAYER MOVED. One CONTIGUOUS raw fragment of the inline monolith,
// [845263,849520) in document coordinates in dev-clean @ aced93f, holding FIVE
// top-level owners, all of them functions: `apexStorageKeyVariants` (511),
// `_apexReadArray` (319), `apexNonDestructiveLoadArray` (946), `apexBackupKey`
// (327) and `apexCreateBackup` (581). Together they are the non-destructive
// localStorage recovery path: they read from sibling and legacy key namespaces,
// back up before any copy, and never delete or overwrite the source. 92 lines,
// 66 of them code, 26 of them not — 21 comment-only and 5 blank — and ZERO top-
// level statements. Like the layer before it, this one ships no mutable binding:
// five function declarations and five column-0 closers are the whole of its
// top-level shape.
//
// THE CUT OPENS ON A `// ── ` BANNER, AND THAT BANNER GOVERNS MORE THAN THE CUT.
// This is the finding audit #470 published. The banner reads `// ── Non-
// destructive storage recovery helpers ──…`, and the region it opens runs 7,471
// units and holds a SIXTH declaration, `portfolioManager`, whose own comment
// block opens "Portfolios are BACKEND-ONLY" — the opposite subject from a
// localStorage recovery path. So the cut stops after the fifth owner and inside
// the banner region, which is what the dead rule *"never cut inside a `// ── `
// banner region"* forbids. That rule is pinned as dead in §5(c) of
// tests/journal-map-audit-boundary-contract.test.js, and #470 measured the cost
// of obeying it here: byConsumer 2 against 35, one consumer against six, 4,257
// units against 7,471. The permanent contract re-measures both sides rather than
// restating the ratio.
//
// ONE MONOLITH DEPENDENCY, `apexStorageKey`, declared 1,731 units earlier and
// referenced ONCE inside the cut against seven times outside it — which is why
// it stays behind. AND IT IS NOT GUARDED. The layer before this one had every
// outward reference behind a `typeof` test and a `deps` override; this one has
// zero `typeof` guards, so it resolves `apexStorageKey` at CALL time and would
// throw in an empty VM if called without it. That is the ordinary case for this
// chain, not a regression, and the contract measures the guard rather than
// inheriting the previous layer's property by assumption — which is exactly the
// mistake #470 declined to make in prose.
//
// FIVE EDGES REACH IN, all five hosted by `journalManager`. That is ONE consumer
// at five sites, which is what made this region win the screen: it ranked 4th of
// 1,867 clean candidates by byConsumerSplit then size, and no clean candidate at
// score 2 is larger.
//
// NOTHING REACHES OUT. Both halves of the ninth direction are zero: this region
// references no chain module and no foundation module. Its only host globals are
// `localStorage` (5 code references) and `console` (1) — comment occurrences are
// not counted, and a scan that counts them reports 7 and 1 instead, which is the
// substring trap this repository's notes warn about.
//
// THE SEPARATOR. The raw fragment is moduleBody + structuralSeparator:
//
//   body       [845263,849519)   4,256 units, ending `}\n`
//   separator  [849519,849520)   exactly one LF
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

const TAG = '<script src="./js/services/apex-storage-recovery.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-spy-price.js"></script>\n';
const INLINE_OPEN = '<script>';

// Pinned base: the merged #470 commit this layer was measured against. #471
// changed only tests/, so index.html is byte-identical at aced93f.
const BASE_CHARS = 1468002;
const BASE_UTF8 = 1496711;
const BASE_LF = 25420;
const BASE_SHA256 = 'cd9caf4339b47b890dd096468a42b92515fa879859df606629b7c8964a613dfa';
const BASE_LOCAL_SCRIPTS = 83;

// Pinned extracted document — the figures audit #470 predicted before the move.
const EXTRACTED_CHARS = 1463808;
const EXTRACTED_UTF8 = 1492447;
const EXTRACTED_LF = 25328;
const EXTRACTED_SHA256 = 'f838cb8fce06df6395aa8ea73075d8e0b37818c5852824763fa6e01c580c0250';
const EXTRACTED_LOCAL_SCRIPTS = 84;

// The raw range index.html gave up, in base coordinates: body + separator.
const RAW_AT = 845263;
const RAW_END = 849520;
const RAW_CHARS = 4257;
const RAW_SHA256 = 'f8199cb30b80dbf37152374f70f85257d99fa4b2f40d3d90958794bcd69fe9aa';

// The module: the raw fragment minus its final LF.
const MODULE_CHARS = 4256;
const MODULE_UTF8 = 4326;
const MODULE_LF = 92;
const MODULE_SHA256 = '62e5cf5233de9b235ac99b2d1adb4bb4104fe0775914c9ffb56740fa8697f3ff';

// The structural separator, re-inserted by the undo and never left inline.
const SEPARATOR = '\n';
const SEPARATOR_AT = 849519;
// Where the module goes back, in tag-free coordinates. The one added tag line
// begins 730,407 units earlier in the document, so once it is removed every
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

function undoApexStorageRecovery(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_BAD_INPUT');
  }

  // 1. The module has exactly the measured size. A truncated, padded or foreign
  //    module stops here — and so does one that ABSORBED the structural
  //    separator, because that module is 4,257 units, not 4,256. The UTF-8
  //    length EXCEEDS the UTF-16 length by 70: this module is not pure ASCII,
  //    which the box-drawing rule in its opening banner alone settles.
  if (moduleSource.length !== MODULE_CHARS ||
      Buffer.byteLength(moduleSource, 'utf8') !== MODULE_UTF8 ||
      lineFeeds(moduleSource) !== MODULE_LF) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_MODULE_IDENTITY');
  }
  // 2. It ends on a real line of code. A module carrying a trailing blank line
  //    is rejected with its OWN error, so a caller learns it re-absorbed the
  //    separator rather than only that some hash did not match.
  if (!moduleSource.endsWith('}\n') || moduleSource.endsWith('\n\n')) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_MODULE_SEPARATOR');
  }
  if (digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_MODULE_IDENTITY');
  }

  // 3. Exactly one tag, loaded immediately after the SPY price owner and
  //    immediately before the inline monolith.
  if (count(html, TAG) !== 1) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_TAG_IDENTITY');
  }
  if (count(html, ANCHOR_TAG + TAG) !== 1) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_TAG_ADJACENCY');
  }
  if (count(html, ANCHOR_TAG + TAG + INLINE_OPEN) !== 1) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_TAG_ADJACENCY');
  }

  // 4. The document as a whole is exactly the extracted document. This catches
  //    foreign content ANYWHERE — including a structural separator left
  //    stranded inline, which makes the document one byte too long.
  if (html.length !== EXTRACTED_CHARS ||
      Buffer.byteLength(html, 'utf8') !== EXTRACTED_UTF8 ||
      lineFeeds(html) !== EXTRACTED_LF ||
      digest(html) !== EXTRACTED_SHA256) {
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_EXTRACTED_IDENTITY');
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
    throw new Error('APEX_STORAGE_RECOVERY_UNDO_BASE_IDENTITY');
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
  isApplied, undoApexStorageRecovery,
};
