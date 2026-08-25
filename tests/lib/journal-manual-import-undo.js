'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Manual Import — byte-exact undo of the classic service extraction.
//
// The extraction moves only the three declaration owners. The window exposure,
// availability log, and adjacent Backup/Restore UI remain inline.
//
// Contract: undoJournalManualImport(indexHtml, moduleSource) reconstructs
// dev-clean @ 47391e8522c2d7a0c27b853d12d87350754a38b9 exactly, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-manual-import.js"></script>\n';
const BASE_CHARS = 1951961;
const BASE_SHA256 = 'fe514b8183fc8fbde428062ad050bf7f78577dd32a887025ed9caf1fddb566c4';
const MODULE_CHARS = 7778;
const MODULE_SHA256 = 'fc4ba6dcbe9869c99018754a870172f4ac9a24463964bf51a3061fe5c0918536';
const SLICE_AT = 1932685;
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

function undoJournalManualImport(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_MANUAL_IMPORT_UNDO_BAD_INPUT');
  }
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_MANUAL_IMPORT_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_MANUAL_IMPORT_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_MANUAL_IMPORT_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_MANUAL_IMPORT_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalManualImport,
};
