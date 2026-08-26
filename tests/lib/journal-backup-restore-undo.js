'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Backup/Restore — byte-exact undo of the classic UI extraction.
//
// The extraction moves only the nine terminal Backup/Restore declaration
// owners. The modal markup, its inline onclick handlers, and every adjacent
// inline block remain in index.html.
//
// Contract: undoJournalBackupRestore(indexHtml, moduleSource) reconstructs
// dev-clean @ 08e64712da3ee6af8c92d2f55a1db6220ecd0203 exactly, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/ui/journal-backup-restore.js"></script>\n';
const BASE_CHARS = 1944246;
const BASE_SHA256 = '0bc8f2904a47b84a345ca9c35a18c17208082c7f447fe358d3dd19cd2dba4790';
const MODULE_CHARS = 10846;
const MODULE_SHA256 = '62f04ee1e720eb098b9d17e4a1fdeff90d1b5ccbbbc12d564ce558ce175fc1c2';
const SLICE_AT = 1933374;
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

function undoJournalBackupRestore(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_BACKUP_RESTORE_UNDO_BAD_INPUT');
  }
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_BACKUP_RESTORE_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_BACKUP_RESTORE_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_BACKUP_RESTORE_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_BACKUP_RESTORE_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalBackupRestore,
};
