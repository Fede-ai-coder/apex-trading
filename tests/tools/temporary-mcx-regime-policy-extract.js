#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const BASE = '72a2c5759e17a3fd0477f62724d6fd4490be1c8f';
const INDEX = 'index.html';
const MODULE = 'js/services/mcx-regime-policy.js';
const REPORT = 'tests/tools/temporary-mcx-regime-policy-pins.json';
const JOURNAL_TAG = '<script src="./js/services/journal-core.js"></script>\n';
const TAG = '<script src="./js/services/mcx-regime-policy.js"></script>\n';
const DECL_START = 'var _REGIME_ADJ_RULES';
const LAST_FN = '_regimeCompactVixNotes';
const EXPECTED_BASE_CHARS = 2038210;
const EXPECTED_AT = 1895031;
const EXPECTED_DECL_END = 1902329;
const EXPECTED_DECL_CHARS = 7298;
const EXPECTED_OWNERS = [
  '_REGIME_ADJ_RULES',
  '_REGIME_CONTENT',
  '_mcxRegimeOf',
  '_REGIME_LABEL',
  '_VIX_NAKED_CALL_MAX',
  '_REGIME_OVEREXT_FORBIDDEN',
  '_regimeDynForbidden',
  '_VIX_AVOID_NAKED_PUT_MAX',
  '_VIX_LOW_IV_STRATEGY_MAX',
  '_regimeCompactVixNotes',
];

function digest(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}
function count(s, needle) {
  return s.split(needle).length - 1;
}
function functionEnd(src, name) {
  const sig = 'function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('LAST_FUNCTION_NOT_FOUND');
  const open = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
    if (inS) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; i++; continue; }
    if (c === '/' && n === '*') { inBlock = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('LAST_FUNCTION_UNTERMINATED');
}
function ownerManifest(slice) {
  const found = [];
  const re = /^(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=|^(?:async\s+function|function)\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(slice))) found.push(m[1] || m[2]);
  return found;
}

const current = fs.readFileSync(INDEX, 'utf8');
if (current.includes(TAG)) {
  if (!fs.existsSync(MODULE)) throw new Error('TAG_EXISTS_MODULE_MISSING');
  console.log('regime-policy already extracted; no-op');
  process.exit(0);
}
if (fs.existsSync(MODULE)) throw new Error('MODULE_EXISTS_BEFORE_TAG');

const base = execFileSync('git', ['show', `${BASE}:${INDEX}`], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
});
if (current !== base) throw new Error('CURRENT_INDEX_NOT_EXACT_BASE');
if (base.length !== EXPECTED_BASE_CHARS) throw new Error(`BASE_CHARS_${base.length}`);
if (count(base, JOURNAL_TAG) !== 1) throw new Error('JOURNAL_TAG_COUNT');
if (count(base, DECL_START) !== 1) throw new Error('DECL_START_COUNT');

const start = base.indexOf(DECL_START);
const declEnd = functionEnd(base, LAST_FN);
if (start !== EXPECTED_AT) throw new Error(`START_${start}`);
if (declEnd !== EXPECTED_DECL_END) throw new Error(`DECL_END_${declEnd}`);
if (declEnd - start !== EXPECTED_DECL_CHARS) throw new Error('DECL_CHARS');
if (base.slice(declEnd, declEnd + 2) !== '\n\n') throw new Error('SEPARATOR_SHAPE');

// Move one of the two separator newlines with the module so the service has a
// normal terminal newline while the monolith retains one separator newline.
const end = declEnd + 1;
const slice = base.slice(start, end);
const manifest = ownerManifest(slice);
if (JSON.stringify(manifest) !== JSON.stringify(EXPECTED_OWNERS)) {
  throw new Error(`OWNER_MANIFEST_${JSON.stringify(manifest)}`);
}
const forbidden = [
  /\bdocument\s*\./, /\bfetch\s*\(/, /\bttCall\s*\(/,
  /\bsetInterval\s*\(/, /\bsetTimeout\s*\(/, /\bWebSocket\b/,
  /\baddEventListener\s*\(/, /\blocalStorage\s*\./,
  /\bResizeObserver\b/, /\brequestAnimationFrame\s*\(/,
];
for (const re of forbidden) if (re.test(slice)) throw new Error(`FORBIDDEN_SIDE_EFFECT_${re}`);

let residual = base.slice(0, start) + base.slice(end);
const journalAt = residual.indexOf(JOURNAL_TAG);
if (journalAt < 0) throw new Error('JOURNAL_TAG_MISSING_AFTER_CUT');
const insertAt = journalAt + JOURNAL_TAG.length;
residual = residual.slice(0, insertAt) + TAG + residual.slice(insertAt);

fs.writeFileSync(MODULE, slice, 'utf8');
fs.writeFileSync(INDEX, residual, 'utf8');
const report = {
  baseCommit: BASE,
  baseChars: base.length,
  baseSha256: digest(base),
  declarationStart: start,
  declarationEnd: declEnd,
  declarationChars: declEnd - start,
  moduleStart: start,
  moduleEnd: end,
  moduleChars: slice.length,
  moduleSha256: digest(slice),
  retainedSeparatorCharsInIndex: 1,
  ownerManifest: manifest,
  scriptTag: TAG.trim(),
};
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');

// Exact inverse proof on the just-written production tree.
const now = fs.readFileSync(INDEX, 'utf8');
if (count(now, TAG) !== 1) throw new Error('POST_TAG_COUNT');
const tagAt = now.indexOf(TAG);
const withoutTag = now.slice(0, tagAt) + now.slice(tagAt + TAG.length);
const rebuilt = withoutTag.slice(0, start) + slice + withoutTag.slice(start);
if (rebuilt !== base || digest(rebuilt) !== digest(base)) throw new Error('ROUND_TRIP_IDENTITY');

console.log(JSON.stringify(report, null, 2));
