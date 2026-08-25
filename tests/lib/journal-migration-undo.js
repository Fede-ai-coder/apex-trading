'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Migration — byte-exact undo of the classic service extraction.
//
// The extraction moves one contiguous session-latch/async-function slice into a
// classic synchronous service. Manual import and Backup/Restore UI stay inline.
//
// Contract: undoJournalMigration(indexHtml, moduleSource) reconstructs
// dev-clean @ 450f792be44caa6a537e68f3d16b211f9fc2cacc exactly, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-migration.js"></script>\n';
const BASE_CHARS = 1956363;
const BASE_SHA256 = 'f6f7cc5518e8744bca359c47ec24e40f1c206b988e10ab1a4ae2c824f8b607bc';
const MODULE_CHARS = 4461;
const MODULE_SHA256 = '65f3b31825f3cf8aa9e68755d4d517f8ccd4b58cc3e9d90d838a5b6b33b95ecb';
const SLICE_AT = 1932625;
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

function undoJournalMigration(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_MIGRATION_UNDO_BAD_INPUT');
  }
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_MIGRATION_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_MIGRATION_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_MIGRATION_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_MIGRATION_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalMigration,
};
