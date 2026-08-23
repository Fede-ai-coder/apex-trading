'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX PR 2 — byte-exact undo of the VIX market-context extraction (PR #389).
//
// This is the NEWEST link in the repository's reconstruction chain. MCX PR 1
// (#386) took the snapshot / technical-summary service out of the inline
// monolith in two non-contiguous spans; this one takes the VIX-family and
// market-context FETCH cluster out in a single contiguous span, cut against the
// document PR 1 left behind.
//
// Every older helper — mcx-pr1-undo, the PRETRADE links, the EIC links — pins
// offsets against the document that existed when ITS extraction was cut. So a
// contract that wants to address the post-#386 repository must undo THIS
// extraction first, newest-first, exactly as the existing links already do
// among themselves. This helper re-verifies the document it hands back by
// length and SHA-256, which is what makes that ordering safe to depend on: a
// helper handed the wrong document throws rather than passing on a plausible
// but wrong reconstruction.
//
// Contract: undoMcxPr2(indexHtml, moduleSource) -> the exact index.html of
// commit a3111a13ad1586e54ebef0d3c079fd8966ba3d03 (dev-clean at PR #389's
// base, i.e. post-#386), or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = "<script src=\"./js/services/mcx-vix-market-context.js\"></script>\n";
// The audited base: dev-clean with MCX PR 1 already merged.
const BASE_CHARS = 2081250;
const BASE_SHA256 = "f8d569d1fca04e6ca6e70ab485d20abdffdf8e1c8d13192ceb7e64c34f65b008";
const MODULE_CHARS = 24691;
const MODULE_SHA256 = "5283528d4be0e8f861b46c5893460f16d99c5fc69e271b042aec80c36333c763";

// The relocation is ONE contiguous span, unlike PR 1's two. It starts at the
// `function _vixFamilyTimestampMs(vf) {` declaration and ends at the closing
// brace of `_vixFamilyDirectWsFallbackAllowed`. The explanatory comment above
// the first declaration deliberately stays inline, so the span starts at the
// declaration itself, not at the comment.
const CUT_AT = 190830;
const CUT_CHARS = 24690;
// The owner FILE is the relocated span plus a single trailing newline — the one
// byte it carries that did not come from the monolith. Pinned rather than
// trimmed, so an owner that gained or lost trailing whitespace is rejected
// instead of being silently normalised back into the reconstruction.
const MODULE_TRAILER = '\n';

function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, p = 0; while ((p = h.indexOf(n, p)) >= 0) { c++; p += n.length; } return c; }

function isApplied(html) { return count(html, TAG) === 1; }

function undoMcxPr2(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('MCX_PR2_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) throw new Error('MCX_PR2_UNDO_MODULE_IDENTITY');
  // The owner must be exactly the relocated span plus the pinned trailer; this
  // is what lets the span be recovered positionally instead of by pattern.
  if (moduleSource.slice(CUT_CHARS) !== MODULE_TRAILER) throw new Error('MCX_PR2_UNDO_MODULE_LAYOUT');
  if (count(html, TAG) !== 1) throw new Error('MCX_PR2_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  const withoutTag = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (CUT_AT > withoutTag.length) throw new Error('MCX_PR2_UNDO_OFFSET');

  const rebuilt = withoutTag.slice(0, CUT_AT) + moduleSource.slice(0, CUT_CHARS) + withoutTag.slice(CUT_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) throw new Error('MCX_PR2_UNDO_BASE_IDENTITY');
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256, MODULE_CHARS, MODULE_SHA256,
  CUT_AT, CUT_CHARS, MODULE_TRAILER,
  isApplied, undoMcxPr2,
};
