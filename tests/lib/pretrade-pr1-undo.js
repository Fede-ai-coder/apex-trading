'use strict';
const crypto = require('crypto');
const TAG = "<script src=\"./js/services/pretrade-risk-rules.js\"></script>\n";
const BASE_CHARS = 2122900;
const BASE_SHA256 = "5a71e84e094ffa6bed32c7a92a5fdea271aa77b8c31c6271980707801d909b72";
const MODULE_CHARS = 12884;
const MODULE_SHA256 = "4326fdebe27bc70631a5ac73789ea27447a81a6f7e5fd66dfc4add74b3dedb1b";
const SLICE_START = 1865187;
function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c=0,p=0; while ((p=h.indexOf(n,p))>=0) { c++; p+=n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }
function undoPretradePr1(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('PRETRADE_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) throw new Error('PRETRADE_UNDO_MODULE_IDENTITY');
  if (count(html, TAG) !== 1) throw new Error('PRETRADE_UNDO_TAG_IDENTITY');
  const tagAt = html.indexOf(TAG);
  const withoutTag = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_START > withoutTag.length) throw new Error('PRETRADE_UNDO_OFFSET');
  const rebuilt = withoutTag.slice(0, SLICE_START) + moduleSource + withoutTag.slice(SLICE_START);
  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) throw new Error('PRETRADE_UNDO_BASE_IDENTITY');
  return rebuilt;
}
module.exports = { TAG, BASE_CHARS, BASE_SHA256, MODULE_CHARS, MODULE_SHA256, SLICE_START, isApplied, undoPretradePr1 };
