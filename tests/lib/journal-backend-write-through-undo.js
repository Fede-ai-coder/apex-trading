'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Backend Write-through — byte-exact undo of the classic patch bridge.
//
// The extraction moves one contiguous slice containing three legacy CRUD
// aliases/reassignments, the backend payload normalizer, and the terminal
// journalManager patch IIFE. Migration, manual import, and backup UI stay inline.
//
// Contract: undoJournalBackendWriteThrough(indexHtml, moduleSource) reconstructs
// dev-clean @ 9dc2148f91e0ae12aa405f2488b16ab9e03922ef exactly, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-backend-write-through.js"></script>\n';
const BASE_CHARS = 1964275;
const BASE_SHA256 = 'bf7ad9d7c3a7cc2e0975e6e06b1af0ef5383232433cab5e56b75cdac7fbac973';
const MODULE_CHARS = 7983;
const MODULE_SHA256 = '6d2bc369ed33d45e9f4eb99ab85a597e59fba4f84c4642431f5a413206857d1d';
const SLICE_AT = 1932553;
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
  return count(html, TAG) === 1;
}

function undoJournalBackendWriteThrough(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_WRITE_THROUGH_UNDO_BAD_INPUT');
  }
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_WRITE_THROUGH_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_WRITE_THROUGH_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_WRITE_THROUGH_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_WRITE_THROUGH_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalBackendWriteThrough,
};
