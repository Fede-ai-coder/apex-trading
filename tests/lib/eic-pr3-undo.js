'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// UNDO EIC PR 3 — the third link in the reconstruction chain.
//
// WHY THIS EXISTS
//   tests/lib/eic-pr1-undo.js explains the general problem: a contract that
//   proves its own relocation reversible reconstructs its base from the CURRENT
//   index.html, which silently assumes HEAD is `base + that PR`. Every EIC
//   extraction breaks that assumption for the families that came before it, so
//   each one adds a link that undoes itself and PROVES the intermediate by hash.
//
//   The chain after PR 3 is:
//
//       HEAD (post-PR3)
//         └─ undo PR 3 ──> the post-PR2 application   [this file, by hash]
//              └─ undo PR 2 ──> the post-PR1 application  [eic-pr2-undo.js]
//                   └─ undo PR 1 ──> the post-PESS application  [eic-pr1-undo.js]
//                        └─ each family's own reconstruction runs from there
//
//   ORDER IS NOT OPTIONAL, and it is load-bearing in one specific way: each
//   PR's recorded offset is a position in the monolith AS IT WAS WHEN THAT PR
//   WAS CUT. PR 3's offset addresses the post-PR2 monolith. Undoing PR 2 first
//   would reinsert 15,343 characters ABOVE PR 3's offset, so PR 3's region would
//   then land ~15 k characters early — inside another function's body — and the
//   result would be a plausible-looking document that is silently wrong rather
//   than a loud failure. The contract asserts that wrong order does NOT verify.
//
// WHAT IT DOES NOT DO
//   It hardcodes no source text. The region is DERIVED from the shipped module
//   on disk, so editing that module stops this helper reproducing the recorded
//   hash and every caller fails. The only pinned data are the offset the region
//   occupied in the post-PR2 monolith and the hash of the document it rebuilds.
//
// ONE REGION, AND NO ATTACHED COMMENT — WHICH IS ITSELF A MEASURED FACT
//   PR 2's region rule is `attached comment block (if any) + declaration +
//   "\n\n"`, where the comment block is walked back line by line and a BLANK
//   line is the boundary. That rule is reused here UNCHANGED, and applying it to
//   eicAnalyzeTicker yields NO comment: the line above the declaration is blank.
//
//   That distinction is not cosmetic. The monolith contained the comment
//   `// S.eicShowAll: toggle to show all candidates including hard-rejected`
//   TWICE — once attached directly to runEICPanel (no blank line, so PR 2
//   correctly took it into js/ui/eic-panel.js) and once separated from
//   eicAnalyzeTicker by a blank line. The second copy is NOT part of this
//   relocation and STAYS in index.html, exactly where it always was. Taking it
//   would have deleted a comment the panel still needs and broken the
//   round-trip; the same mechanical rule that made it travel for PR 2 is what
//   makes it stay for PR 3.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./load-app-source.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_REL = 'js/ui/eic-ticker-analysis-panel.js';
const TAG = '<script src="./js/ui/eic-ticker-analysis-panel.js"></script>';

// The application immediately after EIC PR 2 merged (merge of PR #376) — the
// document EIC PR 3 was cut from, and therefore the document undoing it must
// reproduce.
const POST_PR2_REF = 'a41ddb60166129a5dfed585c4b077c7a37c46bff';
const POST_PR2_INDEX_SHA256 = '7d39d249d560d07d2e1fd2fe352617521e09a95dd2c8a481d449e4cc1fb8b89c';
const POST_PR2_INDEX_CHARS = 2171669;

// Offset, in the POST-PR2 monolith, of the removed region: the declaration plus
// the blank-line separator that followed it. Exactly the bytes the cut removed.
const REGION_OFFSETS = [
  { name: 'eicAnalyzeTicker', monoOffset: 1905124, chars: 13992 },
];
const REGION_TOTAL_CHARS = 13992;

// The declaration itself, inside that region.
const DECLARATION_CHARS = 13990;
const DECLARATION_SHA256 = '10b35c8c6117bd2098784474c17e8c5e3577be5ee7d68ae6fec73e1848a64899';

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
 * Derive the region text from the shipped module — PR 2's rule, unchanged.
 *
 * The walk-back stops at the first line that is not a `//` comment, so this
 * module's own architecture header (separated from the declaration by a blank
 * line) is correctly NOT treated as attached and does not travel back into
 * index.html. If a future edit deleted that blank line, the header WOULD be
 * pulled in, the region length would stop matching `REGION_OFFSETS[].chars`,
 * and `undoEicPr3` would refuse rather than silently corrupt the document.
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
      if (!/^\s*\/\//.test(line)) break;
      blockStart = prevLineStart;
    }
    return src.slice(blockStart, d.end + 1) + '\n\n';
  });
}

/** The bare declaration text as shipped, for identity checks. */
function declarationText() {
  const src = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
  const m = /(^|\n)(async\s+)?function\s+eicAnalyzeTicker\s*\(/.exec(src);
  if (!m) return null;
  const start = m.index + (m[1] ? m[1].length : 0);
  const end = matchFunctionEnd(src, start);
  if (end < 0) return null;
  return src.slice(start, end + 1);
}

/**
 * Reverse EIC PR 3 on a document: drop the script tag, put the region back at
 * the offset it held. Returns null if the document does not look like it has
 * EIC PR 3 applied.
 */
function undoEicPr3(html) {
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

  const spans = REGION_OFFSETS.map((r, i) => ({ off: r.monoOffset, text: texts[i], chars: r.chars }));
  for (const s of spans) if (s.text.length !== s.chars) return null;
  // ASCENDING offsets, NO running shift — the offsets are positions in the
  // ORIGINAL (post-PR2) monolith. With a single region this is trivially true,
  // but the shape is kept identical to PR 1 and PR 2 so the three helpers read
  // the same way and a second region could be added without re-deriving it.
  for (const s of spans.slice().sort((a, b) => a.off - b.off)) {
    const at = monoAt + s.off;
    out = out.slice(0, at) + s.text + out.slice(at);
  }
  return out;
}

/**
 * Undo EIC PR 3 and PROVE the result is the post-PR2 application.
 * Returns { html, verified, reason }.
 */
function postPr2Html(html) {
  const out = undoEicPr3(html);
  if (out == null) return { html: null, verified: false, reason: 'EIC PR 3 does not appear to be applied to this document' };
  const h = sha256(out);
  if (h !== POST_PR2_INDEX_SHA256) {
    return { html: out, verified: false, reason: 'undo produced ' + h.slice(0, 16) + ', expected ' + POST_PR2_INDEX_SHA256.slice(0, 16) };
  }
  return { html: out, verified: true, reason: 'byte-exact' };
}

/** True when this checkout actually has EIC PR 3 applied. */
function isApplied(html) {
  return html.indexOf(TAG) >= 0;
}

/**
 * The whole chain: undo PR 3, then PR 2, then PR 1, and hand back the post-PESS
 * document. Each link is verified by hash; the first failure is reported rather
 * than papered over. Callers that only need "the document my family was cut
 * from" should use this rather than reimplementing the order.
 */
function postPessHtml(html) {
  const PR2 = require('./eic-pr2-undo.js');
  let cur = html;
  if (isApplied(cur)) {
    const r = postPr2Html(cur);
    if (!r.verified) return { html: r.html, verified: false, reason: 'PR3 undo: ' + r.reason };
    cur = r.html;
  }
  return PR2.postPessHtml(cur);
}

module.exports = {
  TAG,
  MODULE_REL,
  POST_PR2_REF,
  POST_PR2_INDEX_SHA256,
  POST_PR2_INDEX_CHARS,
  REGION_OFFSETS,
  REGION_TOTAL_CHARS,
  DECLARATION_CHARS,
  DECLARATION_SHA256,
  regionTexts,
  declarationText,
  undoEicPr3,
  postPr2Html,
  postPessHtml,
  isApplied,
  sha256,
};
