'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// UNDO EIC PR 1 — one owner, used by every contract that reconstructs a base.
//
// WHY THIS EXISTS
//   Several boundary contracts prove their relocation is reversible TO THE BYTE:
//   they take the CURRENT index.html, remove the tag their PR added, put their
//   declaration spans back at the offsets they held, and assert the result is
//   the base blob character for character.
//
//   That proof silently assumes index.html has not changed since — that HEAD is
//   exactly `base + this PR`. It held while every index.html change was another
//   step of the same family. EIC PR 1 is the first change from a DIFFERENT
//   family to land on top of the completed PESS/SFS/DSB/BSS work, so those
//   reconstructions now start from a document that is missing four EIC spans and
//   carrying one extra script tag.
//
//   The wrong fix is to relax those assertions to "close enough". The right fix
//   is to undo EIC PR 1 FIRST, prove the intermediate really is the post-PESS
//   application by hash, and then let each contract's existing reconstruction run
//   against that — unchanged, and still byte-exact.
//
// WHAT IT DOES NOT DO
//   It hardcodes no source text. The four regions are DERIVED from the shipped
//   module on disk, so if that module is edited this helper stops reproducing the
//   recorded hash and every caller fails. The only pinned data are the offsets
//   the regions occupied in the post-PESS monolith and the hash of the document
//   they reconstruct.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./load-app-source.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_REL = 'js/services/eic-screening-rules.js';
const TAG = '<script src="./js/services/eic-screening-rules.js"></script>';

// The application immediately after the PESS family closed (merge of PR #373) —
// the document EIC PR 1 was cut from, and therefore the document undoing it must
// reproduce.
const POST_PESS_REF = '73ecb1683d916a9eb2521654d88c530907e6462b';
const POST_PESS_INDEX_SHA256 = '945685db0a90052ad6236bc9aaf7a43a1b9ba5a2a77eb11222f646a1c1fa3d5d';
const POST_PESS_INDEX_CHARS = 2201486;

// Offset, in the POST-PESS monolith, of each removed region. A region is the
// declaration plus its dedicated leading comment plus the blank-line separator
// that followed — i.e. exactly the bytes the extraction cut out. Ascending.
const REGION_OFFSETS = [
  { name: 'eicScreenTicker', monoOffset: 1904395, chars: 4615 },
  { name: 'eicLiqFromLegs', monoOffset: 1909338, chars: 699 },
  { name: 'eicLiqFromLegs', monoOffset: 1921881, chars: 699 },
  { name: 'eicBuildLiveContext', monoOffset: 1953704, chars: 8567 },
];
const REGION_TOTAL_CHARS = 14580;

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// Brace-match a top-level `function NAME(...) { … }` starting at `start`,
// skipping strings, template literals, comments and regex literals. Returns the
// index of the closing brace.
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
      for (j++; j < src.length; j++) { if (src[j] === '\\') { j++; continue; } if (src[j] === q) break; }
      prev = '"'; continue;
    }
    if (c === '/' && (prev === '' || !(isIdent(prev) || prev === ')' || prev === ']'))) {
      let k = j + 1, inClass = false, closed = false;
      for (; k < src.length; k++) {
        if (src[k] === '\\') { k++; continue; }
        if (src[k] === '\n') break;
        if (src[k] === '[') inClass = true; else if (src[k] === ']') inClass = false;
        else if (src[k] === '/' && !inClass) { closed = true; break; }
      }
      if (closed) { j = k; while (j + 1 < src.length && /[a-z]/i.test(src[j + 1])) j++; prev = '/'; continue; }
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return j; }
    if (!/\s/.test(c)) prev = c;
  }
  return -1;
}

// Split the shipped module into the four region texts, in physical order.
// A region is `leading comment block (if any) + declaration + "\n\n"` — exactly
// the bytes the extraction cut out of the monolith.
//
// The split is STRUCTURAL, not heuristic: declarations are located by
// brace-matching from each column-0 `function` keyword, then the leading comment
// block is walked back line by line. A line-based heuristic would split inside a
// body, because these bodies contain blank lines followed by comments.
function regionTexts() {
  const src = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
  const decls = [];
  const re = /(^|\n)function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + (m[1] ? m[1].length : 0);
    const end = matchFunctionEnd(src, start);
    if (end < 0) return [];
    decls.push({ name: m[2], start, end });
    re.lastIndex = end;
  }
  return decls.map((d) => {
    const lineStart = src.lastIndexOf('\n', d.start - 1) + 1;
    let blockStart = lineStart;
    for (;;) {
      const prevLineEnd = blockStart - 1;
      if (prevLineEnd < 0) break;
      const prevLineStart = src.lastIndexOf('\n', prevLineEnd - 1) + 1;
      const line = src.slice(prevLineStart, prevLineEnd);
      // A BLANK line is the boundary, and that is what separates this file's own
      // header from the first declaration. A declaration's own leading comment
      // is attached directly, with no blank line between — so walking back over
      // contiguous comment lines picks up exactly that and stops at the header.
      // (Do not also stop on a rule of box-drawing characters: the per-function
      // comments are themselves drawn with them.)
      if (!/^\s*\/\//.test(line)) break;
      blockStart = prevLineStart;
    }
    return src.slice(blockStart, d.end + 1) + '\n\n';
  });
}

/**
 * Reverse EIC PR 1 on a document: drop the script tag, put the four regions
 * back at the offsets they held. Returns null if the document does not look
 * like it has EIC PR 1 applied.
 */
function undoEicPr1(html) {
  const line = TAG + '\n';
  if (html.split(line).length - 1 !== 1) return null;
  let out = html.replace(line, '');

  const inl = L.parseScriptTags(out).filter(
    (t) => (t.src == null || String(t.src).trim() === '') && t.inline.length > 100000
  );
  if (inl.length !== 1) return null;
  const monoAt = out.indexOf(inl[0].inline);

  const texts = regionTexts();
  if (texts.length !== REGION_OFFSETS.length) return null;

  // ASCENDING offsets, NO running shift — same rule the family contracts use.
  // The offsets are positions in the ORIGINAL monolith, so restoring the lowest
  // region first leaves every byte below the next region already correct.
  const spans = REGION_OFFSETS.map((r, i) => ({ off: r.monoOffset, text: texts[i], chars: r.chars }));
  for (const s of spans) if (s.text.length !== s.chars) return null;
  for (const s of spans.slice().sort((a, b) => a.off - b.off)) {
    const at = monoAt + s.off;
    out = out.slice(0, at) + s.text + out.slice(at);
  }
  return out;
}

/**
 * Undo EIC PR 1 and PROVE the result is the post-PESS application.
 * Returns { html, verified, reason }. `verified` is true only when the
 * reconstructed document hashes to the recorded post-PESS hash.
 */
function postPessHtml(html) {
  const out = undoEicPr1(html);
  if (out == null) return { html: null, verified: false, reason: 'EIC PR 1 does not appear to be applied to this document' };
  const h = sha256(out);
  if (h !== POST_PESS_INDEX_SHA256) {
    return { html: out, verified: false, reason: 'undo produced ' + h.slice(0, 16) + ', expected ' + POST_PESS_INDEX_SHA256.slice(0, 16) };
  }
  return { html: out, verified: true, reason: 'byte-exact' };
}

/** True when this checkout actually has EIC PR 1 applied. */
function isApplied(html) {
  return html.indexOf(TAG) >= 0;
}

module.exports = {
  TAG,
  MODULE_REL,
  POST_PESS_REF,
  POST_PESS_INDEX_SHA256,
  POST_PESS_INDEX_CHARS,
  REGION_OFFSETS,
  REGION_TOTAL_CHARS,
  regionTexts,
  undoEicPr1,
  postPessHtml,
  isApplied,
  sha256,
};
