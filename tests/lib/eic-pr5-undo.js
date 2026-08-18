'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// UNDO EIC OWNER-CORRECTIVE CLOSURE — newest reconstruction link.
//
// PRs 1-4 moved the eleven prefix-visible EIC sites. The post-EIC audit then
// proved that computeFinalDecision and computeSetupScore are also EIC-owned.
// This helper reverses only that final, two-site relocation and verifies the
// exact post-audit document from which it was cut. Older undo helpers can run
// only after this link has restored their expected input.
// ─────────────────────────────────────────────────────────────────────────────
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const L = require('./load-app-source.js');
const EIC_PR4_UNDO = require('./eic-pr4-undo.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_REL = 'js/services/eic-decision-rules.js';
const TAG = '<script src="./js/services/eic-decision-rules.js"></script>';

const POST_PR4_REF = '247ef29b6cef109bf3bbad8d55a6f8ebb54263c4';
const POST_PR4_INDEX_SHA256 = '422082a6df1cd1ecf7da1be8aa9f459342bf3139a0dbe7b71b27eb68994f4a67';
const POST_PR4_INDEX_CHARS = 2133616;
const POST_PR4_MONOLITH_SHA256 = '911bff8818c21b21e8dde9f6f34bf999dcf7d6b71d5112326b0abc0de72e1b16';
const POST_PR4_MONOLITH_CHARS = 2021537;

const REGION_OFFSETS = [
  { name: 'computeFinalDecision', monoOffset: 1904883, chars: 6411 },
  { name: 'computeSetupScore', monoOffset: 1911294, chars: 4365 },
];
const REGION_TOTAL_CHARS = 10776;
const DECLARATION_CHARS = 10112;
const DECLARATION_CHARS_EACH = [6152, 3960];
const DECLARATION_SHA256 = [
  '765b1399b7a494608d634209c33b0b8b61242fd0876c73acc33cf958d35e5981',
  'df3135332db37817d22af4b4ecaf353b092cd51d94adc381c9d52da76396dc83',
];
const REGION_SHA256 = [
  'b8d68866c2a278742d4e09789fd2242a2ce54aedefa7af006759ba7671e2e1a4',
  'f061fd0915b821b06e17457eb8e8918ab49f0942a272bd8470ae03f01ed9dcda',
];

function sha256(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function matchFunctionEnd(src, start) {
  let i = src.indexOf('{', start);
  if (i < 0) return -1;
  let depth = 0, prev = '';
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  for (let j = i; j < src.length; j++) {
    const c = src[j], d = src[j + 1];
    if (c === '/' && d === '/') { while (j < src.length && src[j] !== '\n') j++; continue; }
    if (c === '/' && d === '*') { j += 2; while (j < src.length && !(src[j] === '*' && src[j + 1] === '/')) j++; j++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      for (j++; j < src.length; j++) {
        if (src[j] === '\\') { j++; continue; }
        if (src[j] === q) break;
      }
      prev = '"';
      continue;
    }
    if (c === '/' && (prev === '' || !(isIdent(prev) || prev === ')' || prev === ']'))) {
      let k = j + 1, inClass = false, closed = false;
      for (; k < src.length; k++) {
        if (src[k] === '\\') { k++; continue; }
        if (src[k] === '\n') break;
        if (src[k] === '[') inClass = true;
        else if (src[k] === ']') inClass = false;
        else if (src[k] === '/' && !inClass) { closed = true; break; }
      }
      if (closed) {
        j = k;
        while (j + 1 < src.length && /[a-z]/i.test(src[j + 1])) j++;
        prev = '/';
        continue;
      }
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return j;
    }
    if (!/\s/.test(c)) prev = c;
  }
  return -1;
}

function declarationOf(src, name) {
  const re = new RegExp('(?:^|\\n)(?:async\\s+)?function\\s+' + name + '\\s*\\(', 'g');
  const hits = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + (src[m.index] === '\n' ? 1 : 0);
    const end = matchFunctionEnd(src, start);
    if (end < 0) return null;
    hits.push({ start, end: end + 1, text: src.slice(start, end + 1) });
  }
  return hits.length === 1 ? hits[0] : null;
}

function regionOf(src, decl) {
  let start = decl.start;
  let lineStart = src.lastIndexOf('\n', start - 2) + 1;
  while (lineStart > 0) {
    const prevStart = src.lastIndexOf('\n', lineStart - 2) + 1;
    const line = src.slice(prevStart, lineStart - 1);
    if (!/^\s*\/\//.test(line)) break;
    start = prevStart;
    lineStart = prevStart;
  }
  let end = decl.end;
  if (src.slice(end, end + 2) === '\n\n') end += 2;
  return src.slice(start, end);
}

function moduleRegions(moduleSrc) {
  if (typeof moduleSrc !== 'string') return null;
  const out = [];
  for (let i = 0; i < REGION_OFFSETS.length; i++) {
    const spec = REGION_OFFSETS[i];
    const decl = declarationOf(moduleSrc, spec.name);
    if (!decl) return null;
    if (decl.text.length !== DECLARATION_CHARS_EACH[i] || sha256(decl.text) !== DECLARATION_SHA256[i]) return null;
    const region = regionOf(moduleSrc, decl);
    if (region.length !== spec.chars || sha256(region) !== REGION_SHA256[i]) return null;
    out.push(region);
  }
  return out;
}

function monolithDescriptor(html) {
  const tags = L.parseScriptTags(html);
  const tag = tags.filter((t) => !t.src && t.inline.length > 100000);
  if (tag.length !== 1) return null;
  const t = tag[0];
  const openEnd = html.indexOf('>', t.index) + 1;
  return { start: openEnd, end: openEnd + t.inline.length, source: t.inline };
}

function verifyPostPr4(html) {
  if (typeof html !== 'string') return false;
  const mono = monolithDescriptor(html);
  return html.length === POST_PR4_INDEX_CHARS
    && sha256(html) === POST_PR4_INDEX_SHA256
    && mono != null
    && mono.source.length === POST_PR4_MONOLITH_CHARS
    && sha256(mono.source) === POST_PR4_MONOLITH_SHA256;
}

function undoEicPr5(html, moduleSrc) {
  try {
    if (typeof html !== 'string') return { verified: false, reason: 'HTML_MISSING', html: null };
    if (html.split(TAG + '\n').length - 1 !== 1) return { verified: false, reason: 'TAG_COUNT', html: null };
    const source = typeof moduleSrc === 'string'
      ? moduleSrc
      : fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
    const regions = moduleRegions(source);
    if (!regions) return { verified: false, reason: 'MODULE_REGION_IDENTITY', html: null };
    if (REGION_OFFSETS[0].monoOffset + regions[0].length !== REGION_OFFSETS[1].monoOffset) {
      return { verified: false, reason: 'REGIONS_NOT_CONTIGUOUS', html: null };
    }
    const withoutTag = html.replace(TAG + '\n', '');
    const mono = monolithDescriptor(withoutTag);
    if (!mono) return { verified: false, reason: 'MONOLITH_MISSING', html: null };
    const at = REGION_OFFSETS[0].monoOffset;
    const restoredMono = mono.source.slice(0, at) + regions.join('') + mono.source.slice(at);
    const restored = withoutTag.slice(0, mono.start) + restoredMono + withoutTag.slice(mono.end);
    return {
      verified: verifyPostPr4(restored),
      reason: verifyPostPr4(restored) ? 'OK' : 'POST_PR4_IDENTITY',
      html: restored,
    };
  } catch (e) {
    return { verified: false, reason: 'UNDO_FAILED:' + String(e && e.message), html: null };
  }
}

function isApplied(html) {
  return typeof html === 'string' && html.indexOf(TAG) >= 0;
}

function postPessHtml(html, moduleSrc) {
  let cur = html;
  if (isApplied(cur)) {
    const first = undoEicPr5(cur, moduleSrc);
    if (!first.verified) return { verified: false, reason: 'PR5 undo: ' + first.reason, html: first.html };
    cur = first.html;
  }
  const rest = EIC_PR4_UNDO.postPessHtml(cur);
  if (!rest.verified) return { verified: false, reason: 'older chain: ' + rest.reason, html: rest.html };
  return rest;
}

module.exports = {
  MODULE_REL,
  TAG,
  POST_PR4_REF,
  POST_PR4_INDEX_SHA256,
  POST_PR4_INDEX_CHARS,
  POST_PR4_MONOLITH_SHA256,
  POST_PR4_MONOLITH_CHARS,
  REGION_OFFSETS,
  REGION_TOTAL_CHARS,
  DECLARATION_CHARS,
  DECLARATION_CHARS_EACH,
  DECLARATION_SHA256,
  REGION_SHA256,
  sha256,
  moduleRegions,
  verifyPostPr4,
  undoEicPr5,
  postPessHtml,
  isApplied,
};
