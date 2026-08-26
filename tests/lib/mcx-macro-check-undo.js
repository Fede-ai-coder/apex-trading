'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX macro check — byte-exact undo of the terminal macro-check UI extraction.
//
// The extraction moves only the three terminal MCX macro-check declaration
// owners (runMarketContextPanel, _mcxRunMacroCheck, runMarketContextAnalysis).
// The MCX markup, its inline onclick handler, the resize listener and every
// other MCX chart / live-update / regime / lifecycle / refresh / rendering /
// state owner remain in index.html, as does the Journal manual-import window
// exposure glue.
//
// Contract: undoMcxMacroCheck(indexHtml, moduleSource) reconstructs
// dev-clean @ 90118f5c36f0675e8d6aface275ece4f09cccd31 exactly, or throws.
//
// FAIL CLOSED. Every guard below rejects rather than guesses: a missing tag, a
// duplicate tag, a mutated or truncated module, a partially applied state, or
// foreign content anywhere in the retained document all raise instead of
// returning an approximate reconstruction.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/mcx-macro-check.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/ui/journal-backup-restore.js"></script>\n';
const BASE_CHARS = 1933458;
const BASE_SHA256 = '71064f2cb772a0555d5abcf14496e9c87830e1974be1544dcc08ec841047e529';
const EXTRACTED_CHARS = 1928890;
const EXTRACTED_SHA256 = '00ffa331d568b3b81b1f5993a3a347adc4e6c8088de8be113048f85f9ba64d96';
const MODULE_CHARS = 4619;
const MODULE_SHA256 = '22ccdf6e93dd73a3503973520955d345b8081a34cbdcba77ae57d247ed881ec7';
const SLICE_AT = 1926678;
const SLICE_END = 1931297;
const SLICE_CHARS = MODULE_CHARS;
const SLICE_SHA256 = MODULE_SHA256;

function digest(source) {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) {
    total++;
    at += needle.length;
  }
  return total;
}
function isApplied(html) {
  return typeof html === 'string' && count(html, TAG) === 1;
}

function undoMcxMacroCheck(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('MCX_MACRO_CHECK_UNDO_BAD_INPUT');
  }
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('MCX_MACRO_CHECK_UNDO_MODULE_IDENTITY');
  }
  // Exactly one tag, loaded immediately after Backup/Restore. A missing tag, a
  // duplicate, or a reordered tag is rejected — never silently tolerated.
  if (count(html, TAG) !== 1) throw new Error('MCX_MACRO_CHECK_UNDO_TAG_IDENTITY');
  if (count(html, ANCHOR_TAG + TAG) !== 1) throw new Error('MCX_MACRO_CHECK_UNDO_TAG_ADJACENCY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('MCX_MACRO_CHECK_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  // The final gate: the reconstruction is only accepted when it IS the pinned
  // base, byte for byte. A partially applied extraction, a mutated retained
  // document, or foreign content anywhere fails here rather than being returned.
  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('MCX_MACRO_CHECK_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, ANCHOR_TAG,
  BASE_CHARS, BASE_SHA256,
  EXTRACTED_CHARS, EXTRACTED_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_END, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoMcxMacroCheck,
};
