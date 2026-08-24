'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Core — byte-exact undo of the storage/snapshot/analytics extraction.
//
// This extraction is newer than MCX PR3. Historical reconstruction contracts
// must undo Journal Core first, then MCX3/MCX2/MCX1 and older families.
// The owner is one contiguous slice removed from index.html and installed as a
// classic synchronous script immediately after MCX3.
//
// Contract: undoJournalCore(indexHtml, moduleSource) -> exact index.html of
// dev-clean @ dfb8433e8e7b0403fca5a23874dfbc600f5069c4, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-core.js"></script>\n';
const BASE_CHARS = 2044679;
const BASE_SHA256 = '2ed09ffa631c3ed3c7c99316c2159809af01e8d0c476c888d39b84573f64b80e';
const MODULE_CHARS = 6523;
const MODULE_SHA256 = '4a819feeb4376a5d876e8310fd2687976d42fd94df316523957eb3b4113109bc';
const SLICE_AT = 1939622;
const SLICE_CHARS = 6523;
const SLICE_SHA256 = MODULE_SHA256;

function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, p = 0; while ((p = h.indexOf(n, p)) >= 0) { c++; p += n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }

function undoJournalCore(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('JOURNAL_CORE_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_CORE_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_CORE_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_CORE_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_CORE_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalCore,
};
