'use strict';
const crypto = require('crypto');
const TAG = "<script src=\"./js/services/pretrade-technicals.js\"></script>\n";
const BASE_CHARS = 2110077;
const BASE_SHA256 = "dcac3c89621d5e7b31b637721cf27b32ed9844e3b3d9c8ac8f724a50fc29a60b";
const MODULE_CHARS = 8812;
const MODULE_SHA256 = "d79430304d26e78e73f4664864587e166d8efe20f53c7b275fa6bcad06468c7e";
const SLICE_START = 1871775;
function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c=0,p=0; while ((p=h.indexOf(n,p))>=0) { c++; p+=n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }
function undoPretradePr2(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('PRETRADE_PR2_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) throw new Error('PRETRADE_PR2_UNDO_MODULE_IDENTITY');
  if (count(html, TAG) !== 1) throw new Error('PRETRADE_PR2_UNDO_TAG_IDENTITY');
  const tagAt = html.indexOf(TAG);
  const withoutTag = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_START > withoutTag.length) throw new Error('PRETRADE_PR2_UNDO_OFFSET');
  const rebuilt = withoutTag.slice(0, SLICE_START) + moduleSource + withoutTag.slice(SLICE_START);
  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) throw new Error('PRETRADE_PR2_UNDO_BASE_IDENTITY');
  return rebuilt;
}
module.exports = { TAG, BASE_CHARS, BASE_SHA256, MODULE_CHARS, MODULE_SHA256, SLICE_START, isApplied, undoPretradePr2 };
