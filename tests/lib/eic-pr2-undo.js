'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// UNDO EIC PR 2 — the second link in the reconstruction chain.
//
// WHY THIS EXISTS
//   tests/lib/eic-pr1-undo.js explains the general problem: a contract that
//   proves its own relocation reversible reconstructs its base from the CURRENT
//   index.html, which silently assumes HEAD is `base + that PR`. EIC PR 1 broke
//   that assumption for PESS and SFS, and eic-pr1-undo.js repaired it by undoing
//   EIC PR 1 first and PROVING the intermediate by hash.
//
//   EIC PR 2 adds a second layer. The chain is now:
//
//       HEAD (post-PR2)
//         └─ undo PR 2 ──> the post-PR1 application   [this file, by hash]
//              └─ undo PR 1 ──> the post-PESS application  [eic-pr1-undo.js]
//                   └─ each family's own reconstruction runs from there
//
//   ORDER IS NOT OPTIONAL. PR 1's recorded offsets are positions in the
//   post-PESS monolith and PR 2's are positions in the post-PR1 monolith, so
//   PR 2 must be undone FIRST — otherwise PR 1's offsets address a document that
//   never existed and the reconstruction lands on garbage rather than failing
//   loudly.
//
// WHAT IT DOES NOT DO
//   It hardcodes no source text. Both regions are DERIVED from the shipped
//   module on disk, so editing that module stops this helper reproducing the
//   recorded hash and every caller fails. The only pinned data are the offsets
//   the regions occupied in the post-PR1 monolith and the hash of the document
//   they reconstruct.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./load-app-source.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_REL = 'js/ui/eic-panel.js';
const TAG = '<script src="./js/ui/eic-panel.js"></script>';

// The application immediately after EIC PR 1 merged (merge of PR #375) — the
// document EIC PR 2 was cut from, and therefore the document undoing it must
// reproduce.
const POST_PR1_REF = 'b7c003654359c118c4e3c7672ed9254458064515';
const POST_PR1_INDEX_SHA256 = '9739c5243f2fe115ebff73f2ca267d6bae1ec13a3719ab529414a42b620b4ca5';
const POST_PR1_INDEX_CHARS = 2186967;

// Offset, in the POST-PR1 monolith, of each removed region. A region is the
// declaration plus its attached leading comment plus the blank-line separator
// that followed — exactly the bytes the extraction cut out. Ascending.
const REGION_OFFSETS = [
  { name: 'runEICPanel', monoOffset: 1904723, chars: 11515 },
  { name: 'eicAnalyzeAll', monoOffset: 1930631, chars: 3828 },
];
const REGION_TOTAL_CHARS = 15343;

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

// Brace-match a top-level `function NAME(...) { … }` (optionally `async`)
// starting at `start`, skipping strings, template literals, comments and regex
// literals. Returns the index of the closing brace.
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

/**
 * Split the shipped module into the two region texts, in physical order.
 * A region is `attached comment block (if any) + declaration + "\n\n"`.
 *
 * The split is STRUCTURAL, not heuristic: declarations are located by
 * brace-matching from each column-0 `function` / `async function` keyword, then
 * the attached comment block is walked back line by line. `runEICPanel` carries
 * one such comment (`// S.eicShowAll: …`) and `eicAnalyzeAll` carries none, so
 * this walk-back is load-bearing rather than decorative.
 */
function regionTexts() {
  const src = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
  const decls = [];
  const re = /(^|\n)(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + (m[1] ? m[1].length : 0);
    const end = matchFunctionEnd(src, start);
    if (end < 0) return [];
    decls.push({ name: m[3], start, end });
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
      // A BLANK line is the boundary — that is what separates this file's own
      // header from the first declaration, and the two declarations from each
      // other. A declaration's own comment is attached directly, with no blank
      // line between, so this picks up exactly that and stops at the header.
      if (!/^\s*\/\//.test(line)) break;
      blockStart = prevLineStart;
    }
    return src.slice(blockStart, d.end + 1) + '\n\n';
  });
}

/**
 * Reverse EIC PR 2 on a document: drop the script tag, put the two regions back
 * at the offsets they held. Returns null if the document does not look like it
 * has EIC PR 2 applied.
 */
function undoEicPr2(html) {
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

  // ASCENDING offsets, NO running shift — the offsets are positions in the
  // ORIGINAL (post-PR1) monolith, so restoring the lowest region first leaves
  // every byte below the next region already correct.
  const spans = REGION_OFFSETS.map((r, i) => ({ off: r.monoOffset, text: texts[i], chars: r.chars }));
  for (const s of spans) if (s.text.length !== s.chars) return null;
  for (const s of spans.slice().sort((a, b) => a.off - b.off)) {
    const at = monoAt + s.off;
    out = out.slice(0, at) + s.text + out.slice(at);
  }
  return out;
}

/**
 * Undo EIC PR 2 and PROVE the result is the post-PR1 application.
 * Returns { html, verified, reason }.
 */
function postPr1Html(html) {
  const out = undoEicPr2(html);
  if (out == null) return { html: null, verified: false, reason: 'EIC PR 2 does not appear to be applied to this document' };
  const h = sha256(out);
  if (h !== POST_PR1_INDEX_SHA256) {
    return { html: out, verified: false, reason: 'undo produced ' + h.slice(0, 16) + ', expected ' + POST_PR1_INDEX_SHA256.slice(0, 16) };
  }
  return { html: out, verified: true, reason: 'byte-exact' };
}

/** True when this checkout actually has EIC PR 2 applied. */
function isApplied(html) {
  return html.indexOf(TAG) >= 0;
}

/**
 * The whole chain: undo PR 2, then PR 1, and hand back the post-PESS document.
 * Each link is verified by hash; the first failure is reported rather than
 * papered over. Callers that only need "the document my family was cut from"
 * should use this rather than reimplementing the order.
 */
function postPessHtml(html) {
  const PR1 = require('./eic-pr1-undo.js');
  let cur = html;
  if (isApplied(cur)) {
    const r = postPr1Html(cur);
    if (!r.verified) return { html: r.html, verified: false, reason: 'PR2 undo: ' + r.reason };
    cur = r.html;
  }
  if (PR1.isApplied(cur)) {
    const r = PR1.postPessHtml(cur);
    if (!r.verified) return { html: r.html, verified: false, reason: 'PR1 undo: ' + r.reason };
    cur = r.html;
  }
  return { html: cur, verified: true, reason: 'byte-exact through the full EIC undo chain' };
}

module.exports = {
  TAG,
  MODULE_REL,
  POST_PR1_REF,
  POST_PR1_INDEX_SHA256,
  POST_PR1_INDEX_CHARS,
  REGION_OFFSETS,
  REGION_TOTAL_CHARS,
  regionTexts,
  undoEicPr2,
  postPr1Html,
  postPessHtml,
  isApplied,
  sha256,
};
