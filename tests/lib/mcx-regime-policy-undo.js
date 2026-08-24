'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MCX Regime Policy — byte-exact undo of the pure policy-core extraction.
//
// This extraction is newer than Journal Core. Historical reconstruction must
// undo Regime Policy first, then Journal Core, then MCX3/MCX2/MCX1 and older
// families. The owner is one contiguous slice installed as a classic script
// immediately after Journal Core.
//
// Contract: undoMcxRegimePolicy(indexHtml, moduleSource) -> exact index.html of
// dev-clean @ 72a2c5759e17a3fd0477f62724d6fd4490be1c8f, or throws.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');

const TAG = '<script src="./js/services/mcx-regime-policy.js"></script>\n';
const BASE_CHARS = 2038210;
const BASE_SHA256 = '7a3664653953669f9033c978ce393ee41d33de2c44f958b58dd7ab9850671a3c';
const MODULE_CHARS = 7299;
const MODULE_SHA256 = 'd6d67793bbde4099d7e89981ba0325509c94f76026cce5bd4e482f3c6ca9645a';
const SLICE_AT = 1895031;
const SLICE_CHARS = 7299;
const SLICE_SHA256 = MODULE_SHA256;

function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(h, n) { let c = 0, p = 0; while ((p = h.indexOf(n, p)) >= 0) { c++; p += n.length; } return c; }
function isApplied(html) { return count(html, TAG) === 1; }

function undoMcxRegimePolicy(html, moduleSource) {
  if (typeof html !== 'string' || typeof moduleSource !== 'string') throw new Error('MCX_REGIME_POLICY_UNDO_BAD_INPUT');
  if (moduleSource.length !== MODULE_CHARS || digest(moduleSource) !== MODULE_SHA256) {
    throw new Error('MCX_REGIME_POLICY_UNDO_MODULE_IDENTITY');
  }
  if (count(html, TAG) !== 1) throw new Error('MCX_REGIME_POLICY_UNDO_TAG_IDENTITY');

  const tagAt = html.indexOf(TAG);
  let rebuilt = html.slice(0, tagAt) + html.slice(tagAt + TAG.length);
  if (SLICE_AT > rebuilt.length) throw new Error('MCX_REGIME_POLICY_UNDO_SLICE_OFFSET');
  rebuilt = rebuilt.slice(0, SLICE_AT) + moduleSource + rebuilt.slice(SLICE_AT);

  if (rebuilt.length !== BASE_CHARS || digest(rebuilt) !== BASE_SHA256) {
    throw new Error('MCX_REGIME_POLICY_UNDO_BASE_IDENTITY');
  }
  return rebuilt;
}

module.exports = {
  TAG, BASE_CHARS, BASE_SHA256,
  MODULE_CHARS, MODULE_SHA256,
  SLICE_AT, SLICE_CHARS, SLICE_SHA256,
  isApplied, undoMcxRegimePolicy,
};
