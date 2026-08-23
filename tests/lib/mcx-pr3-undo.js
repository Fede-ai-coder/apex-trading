'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX PR 3 — byte-exact undo of the backend-candle cache/fetch extraction.
//
// PR 3 is newer than the MCX VIX extraction (PR #389), so historical contracts
// must undo this link FIRST before older offsets are allowed to address the
// document. The extraction is a two-slice relocation: a contiguous helper/fetch
// cluster plus a later contiguous private cache-state block. The owner file is
// exactly those two slices joined by the two newlines removed with the function
// cluster. No trimming or normalisation is permitted.
//
// Contract: undoMcxPr3(indexHtml, moduleSource) -> the exact index.html of
// dev-clean @ 2b61bbd1ed11f227032529e9147c82434b5720b2, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/mcx-backend-candles.js"></script>\n';
// Node String#length counts UTF-16 code units; index.html contains one non-BMP
// code point, so this is one larger than Python len() from the extraction audit.
// SHA-256 remains the byte-identity authority and is identical in both runtimes.
const BASE_CHARS = 2056624;
const BASE_SHA256 = '0f8baf79f8e52a76d650ca2fb7c4165f05cf34ded3cc182fc2f0cd24157f0a6c';
const MODULE_CHARS = 12006;
const MODULE_SHA256 = '4b3838bcd9b85fc7e75452ae968feb1d91ea0edc531108f2cc71a65b4176109a';

const FUNC_AT = 1848452;
const FUNC_CHARS = 11806;
const FUNC_SHA256 = 'd956523ab99e9ec61b38837a1f7c5bb85a9d7ed58761acb21cc7cc4fdafeab0a';
const SEPARATOR = '\n\n';
const STATE_AT = 1893852;
const STATE_CHARS = 198;
const STATE_SHA256 = 'cf8268a6afba589ee48062dd1fd744732642edeb4816c9d17e11cea6e3ac4590';

function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, p = 0; while ((p = h.indexOf(n, p)) >= 0) { c++; p += n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }

function undoMcxPr3(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('MCX_PR3_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) throw new Error('MCX_PR3_UNDO_MODULE_IDENTITY');

  const funcSlice = moduleSource.slice(0, FUNC_CHARS);
  const separator = moduleSource.slice(FUNC_CHARS, FUNC_CHARS + SEPARATOR.length);
  const stateSlice = moduleSource.slice(FUNC_CHARS + SEPARATOR.length);
  if (digest(funcSlice) !== FUNC_SHA256) throw new Error('MCX_PR3_UNDO_FUNC_IDENTITY');
  if (separator !== SEPARATOR) throw new Error('MCX_PR3_UNDO_SEPARATOR');
  if (stateSlice.length !== STATE_CHARS || digest(stateSlice) !== STATE_SHA256) throw new Error('MCX_PR3_UNDO_STATE_IDENTITY');
  if (count(html, TAG) !== 1) throw new Error('MCX_PR3_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (FUNC_AT > rebuilt.length) throw new Error('MCX_PR3_UNDO_FUNC_OFFSET');
  rebuilt = rebuilt.slice(0, FUNC_AT) + funcSlice + SEPARATOR + rebuilt.slice(FUNC_AT);
  if (STATE_AT > rebuilt.length) throw new Error('MCX_PR3_UNDO_STATE_OFFSET');
  rebuilt = rebuilt.slice(0, STATE_AT) + stateSlice + rebuilt.slice(STATE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) throw new Error('MCX_PR3_UNDO_BASE_IDENTITY');
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256, MODULE_CHARS, MODULE_SHA256,
  FUNC_AT, FUNC_CHARS, FUNC_SHA256, SEPARATOR,
  STATE_AT, STATE_CHARS, STATE_SHA256,
  isApplied, undoMcxPr3,
};
