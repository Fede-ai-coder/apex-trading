'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX PR 1 — byte-exact undo of the market-context extraction.
//
// The MCX market-context family was taken out of the inline monolith in TWO
// non-contiguous spans, so this helper is not the single-slice undo the earlier
// links are. It re-inserts BOTH spans at their pinned base offsets and then
// re-verifies the whole reconstructed document by length and SHA-256, which is
// what makes it safe for the older contracts to chain through: a helper that
// rebuilt the wrong document would throw here rather than hand one on.
//
// Contract: undoMcxPr1(indexHtml, moduleSource) -> the exact base index.html of
// commit 34bc48ae33bf3b0044572457615f7e6efda547c0, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = "<script src=\"./js/services/mcx-market-context.js\"></script>\n";
const BASE_CHARS = 2095406;
const BASE_SHA256 = "49eb76955bcb0abf2c223276a53805ef9c761a88b39255acbb297c2baf325357";
const MODULE_CHARS = 14213;
const MODULE_SHA256 = "0b11f9ae056f85c9ab4987f945609db7f33960516a6e18794e86f61819f306a0";

// Span A — the _mcxFiniteNum one-liner, at its own offset in the base document.
// Excising it took the declaration plus the blank line that followed it, so the
// undo puts both back: SLICE_A + '\n\n'.
const A_AT = 208421;
const A_CHARS = 73;
// Span B — the family's comment header and its nine declarations. Excising it
// took the newline BEFORE the comment and the blank line after the last
// declaration, so the undo puts back '\n' + SLICE_B + '\n\n'.
const B_AT = 215537;
const B_CHARS = 14138;
// The two spans are joined in the owner file by exactly this separator; it is
// the only byte sequence in the module that came from neither base span.
const JOINER = '\n\n';
// Offset of span B measured in the document with the TAG and span A already
// removed — i.e. B_AT shifted left by the number of characters span A's excision
// took out (A_CHARS + the two-character blank line).
const B_AT_WITHOUT_A = B_AT - (A_CHARS + 2);

function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, p = 0; while ((p = h.indexOf(n, p)) >= 0) { c++; p += n.length; } return c; }

function isApplied(html) { return count(html, TAG) === 1; }

function undoMcxPr1(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('MCX_PR1_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) throw new Error('MCX_PR1_UNDO_MODULE_IDENTITY');
  if (count(html, TAG) !== 1) throw new Error('MCX_PR1_UNDO_TAG_IDENTITY');
  // Split the owner back into the two base spans it was assembled from. The
  // split is positional and then re-checked against the pinned joiner, so a
  // module whose spans were re-ordered or re-joined cannot pass silently.
  const sliceA = moduleSource.slice(0, A_CHARS);
  const joiner = moduleSource.slice(A_CHARS, A_CHARS + JOINER.length);
  const sliceB = moduleSource.slice(A_CHARS + JOINER.length);
  if (joiner !== JOINER || sliceB.length !== B_CHARS) throw new Error('MCX_PR1_UNDO_MODULE_LAYOUT');

  const tagAt = html.indexOf(TAG);
  const withoutTag = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (B_AT_WITHOUT_A > withoutTag.length) throw new Error('MCX_PR1_UNDO_OFFSET');

  const rebuilt =
    withoutTag.slice(0, A_AT) + sliceA + '\n\n' +
    withoutTag.slice(A_AT, B_AT_WITHOUT_A) + '\n' + sliceB + '\n\n' +
    withoutTag.slice(B_AT_WITHOUT_A);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) throw new Error('MCX_PR1_UNDO_BASE_IDENTITY');
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256, MODULE_CHARS, MODULE_SHA256,
  A_AT, A_CHARS, B_AT, B_CHARS, JOINER, B_AT_WITHOUT_A,
  isApplied, undoMcxPr1,
};
