'use strict';
const crypto = require('crypto');
const TAG = "<script src=\"./js/ui/pretrade-risk-modal.js\"></script>\n";
const BASE_CHARS = 2101326;
const BASE_SHA256 = "aa6a3189486e0511c4e4fea52132586eaf41b43784999a14f97a67e4edb4c5f5";
const MODULE_CHARS = 5975;
const MODULE_SHA256 = "20215b85a7b0f927067ba5d4a83b1b329023692a60ba7c4e7a8d9098bb6a4693";
const SLICE_START = 1865311;
function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c=0,p=0; while ((p=h.indexOf(n,p))>=0) { c++; p+=n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }
function undoPretradePr3(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('PRETRADE_PR3_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) throw new Error('PRETRADE_PR3_UNDO_MODULE_IDENTITY');
  if (count(html, TAG) !== 1) throw new Error('PRETRADE_PR3_UNDO_TAG_IDENTITY');
  const tagAt = html.indexOf(TAG);
  const withoutTag = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_START > withoutTag.length) throw new Error('PRETRADE_PR3_UNDO_OFFSET');
  const rebuilt = withoutTag.slice(0, SLICE_START) + moduleSource + withoutTag.slice(SLICE_START);
  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) throw new Error('PRETRADE_PR3_UNDO_BASE_IDENTITY');
  return rebuilt;
}
module.exports = { TAG, BASE_CHARS, BASE_SHA256, MODULE_CHARS, MODULE_SHA256, SLICE_START, isApplied, undoPretradePr3 };
