'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Journal Remote Persistence — byte-exact undo of the inert service extraction.
//
// The extraction moves one contiguous two-state/six-function slice into a
// classic synchronous service. Wrapper aliases/reassignments and the later
// journalManager sync layer remain inline.
//
// Contract: undoJournalRemotePersistence(indexHtml, moduleSource) reconstructs
// dev-clean @ b82d2c8c616e91eff7197faf017ebc1451ced723 exactly, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/journal-remote-persistence.js"></script>\n';
const BASE_CHARS = 1976502;
const BASE_SHA256 = '5c9742fd4f77c88542f0fd8681c4120243f0d6b7dfdb8f5ea9145acc44aee500';
const MODULE_CHARS = 12295;
const MODULE_SHA256 = '220d90346d6d026acc96c404f10e2f0561e355972189301f8f56e77b10a817d3';
const SLICE_AT = 1932484;
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

function undoJournalRemotePersistence(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') {
    throw new Error('JOURNAL_REMOTE_UNDO_BAD_INPUT');
  }
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('JOURNAL_REMOTE_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('JOURNAL_REMOTE_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('JOURNAL_REMOTE_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('JOURNAL_REMOTE_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoJournalRemotePersistence,
};
