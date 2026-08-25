'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal UI — byte-exact undo of the complete UI/export/forms extraction.
//
// This extraction is newer than MCX Regime Policy. Historical reconstruction
// must undo Journal UI first, then Regime Policy, Journal Core and the earlier
// families. The remote-persistence block is deliberately not part of this owner.
//
// Contract: undoJournalUi(indexHtml, moduleSource) -> exact index.html of
// dev-clean @ 395f19575cdc543b3a370e2168e2e6cfb823a4a7, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/journal-ui.js"></script>\n';
const BASE_CHARS = 2030970;
const BASE_SHA256 = 'c24816f10c627574273b5646a08ecac6ec0e4639edf95d5492b8975c441e0a65';
const MODULE_CHARS = 54514;
const MODULE_SHA256 = '33988f99f330d1c4ed14874369012fb039dd8682eed310f792da2db3e97c87db';
const SLICE_AT = 1932437;
const SLICE_CHARS = MODULE_CHARS;
const SLICE_SHA256 = MODULE_SHA256;

function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, p = 0; while ((p = h.indexOf(n, p)) >= 0) { c++; p += n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }

function undoJournalUi(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('JOURNAL_UI_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_UI_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_UI_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_UI_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_UI_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalUi,
};
