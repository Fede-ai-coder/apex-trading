'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// UNDO EIC PR 4 — the fourth and FINAL link in the reconstruction chain.
//
// WHY THIS EXISTS
//   tests/lib/eic-pr1-undo.js explains the general problem: a contract that
//   proves its own relocation reversible reconstructs its base from the CURRENT
//   index.html, which silently assumes HEAD is `base + that PR`. Every EIC
//   extraction breaks that assumption for the families that came before it, so
//   each one adds a link that undoes itself and PROVES the intermediate by hash.
//
//   The complete chain, newest first, is now:
//
//       HEAD (post-PR4)
//         └─ undo PR 4 ──> the post-PR3 application   [this file, by hash]
//              └─ undo PR 3 ──> the post-PR2 application  [eic-pr3-undo.js]
//                   └─ undo PR 2 ──> the post-PR1 application  [eic-pr2-undo.js]
//                        └─ undo PR 1 ──> the post-PESS application [eic-pr1-undo.js]
//                             └─ each family's own reconstruction runs from there
//
//   ORDER IS NOT OPTIONAL, and it is load-bearing in one specific way: each
//   PR's recorded offsets are positions in the monolith AS IT WAS WHEN THAT PR
//   WAS CUT. PR 4's offsets address the post-PR3 monolith. Undoing PR 3 first
//   would reinsert 13,992 characters ABOVE every one of PR 4's offsets, so all
//   four regions would land ~14 k characters early — inside other functions'
//   bodies — and the result would be a plausible-looking document that is
//   silently wrong rather than a loud failure. The contract asserts that every
//   wrong order does NOT verify.
//
// POST-EXTRACTION REPAIRS
//   The regions still come from the shipped module, but an approved later repair
//   may make the current declaration differ from the bytes PR 4 originally
//   moved. This helper therefore removes the ONE exact fdColor repair block
//   before deriving the historical regions. If that block is missing, duplicated
//   or changed, reconstruction refuses. The original 23,726 declaration bytes
//   remain hash-pinned below; the repair is pinned independently by the EIC
//   surface and behavioural contracts.
//
// FOUR REGIONS, TWO OF THEM AN IDENTICAL PAIR
//   PR 2's region rule is `attached comment block (if any) + declaration +
//   "\n\n"`, where the comment block is walked back line by line and a BLANK
//   line is the boundary. That rule is reused here UNCHANGED, and it resolves
//   each of the four sites differently, which is exactly why it is worth
//   restating rather than assuming:
//
//     site 1  eicFetchLegs        3 attached `//` lines  →  region 328
//     site 2  eicFetchLegs        3 attached `//` lines  →  region 328
//     site 3  eicDXLinkDeepDive   NONE — the DXLINK banner above it is
//                                 separated by a blank line, so it STAYS in
//                                 index.html                →  region 12,817
//     site 4  eicRunDXLink        1 attached `//` line   →  region 10,703
//
//   Sites 1 and 2 are separated in the monolith by a single extra "\n" that
//   belongs to NEITHER region and stays inline, and site 2's region is followed
//   immediately by `// S.eicShowAll: …` — the copy PR 3 correctly left behind.
//   Neither travels. Sites 3 and 4 are contiguous: region 3 ends exactly where
//   region 4 begins.
//
//   The two eicFetchLegs regions are byte-identical to one another. Both move,
//   in their original relative order, and `undoEicPr4` reinserts both. Dropping
//   one would still produce a syntactically valid document, so the length and
//   hash checks below are the only thing that would notice.
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./load-app-source.js');

const ROOT = path.resolve(__dirname, '..', '..');
const MODULE_REL = 'js/ui/eic-live-deep-dive.js';
const TAG = '<script src="./js/ui/eic-live-deep-dive.js"></script>';

// The application immediately after EIC PR 3 merged (merge of PR #377) — the
// document EIC PR 4 was cut from, and therefore the document undoing it must
// reproduce.
const POST_PR3_REF = 'e7b60b5fbb068524664f80c24a0d0134abd4c9ff';
const POST_PR3_INDEX_SHA256 = '2884f4ba6fb67f13da40136dc0434686ccbd1d0c8ee13f0c95e9d25da7835c7d';
const POST_PR3_INDEX_CHARS = 2157738;

// Offsets, in the POST-PR3 monolith, of the removed regions: each attached
// comment block plus its declaration plus the blank-line separator that
// followed it. Exactly the bytes the cut removed, in physical order.
const REGION_OFFSETS = [
  { name: 'eicFetchLegs', monoOffset: 1904395, chars: 328 },
  { name: 'eicFetchLegs', monoOffset: 1904724, chars: 328 },
  { name: 'eicDXLinkDeepDive', monoOffset: 1905539, chars: 12817 },
  { name: 'eicRunDXLink', monoOffset: 1918356, chars: 10703 },
];
const REGION_TOTAL_CHARS = 24176;

// The bare declarations inside those regions, in the same physical order.
const DECLARATION_CHARS = 23726;
const DECLARATION_SHA256 = [
  'f131e1a6f59ffcebb6f96520845f01ccb8d09d5b468eb3083c810a5e18e59eba',
  'f131e1a6f59ffcebb6f96520845f01ccb8d09d5b468eb3083c810a5e18e59eba',
  'dc7418d41241dee28e698ec634345144c0f19fdcc5f78a23f8df92f287e660df',
  '8a0cde00821be3a9ec42c9c0234c1d8d608ae1665c9e9a4a13a0ed178fae19f0',
];
const DECLARATION_CHARS_EACH = [144, 144, 12815, 10623];

// The only approved post-extraction edit inside a PR 4 declaration. Removing
// this exact block projects the current module back to the source PR 4 shipped.
// It is intentionally specific: a second repair cannot acquire historical
// amnesty by merely appearing near the same anchor.
const POST_EXTRACTION_FDCOLOR_FIX = [
  '    // Final Decision badge colors — same mapping as the base-analysis path.',
  "    var fdColors={'APPROVED':'var(--gr)','APPROVED_WITH_CAUTION':'var(--am)',",
  "                  'WATCHLIST_ONLY':'#f97316','AVOID':'var(--rd)','BLOCKED_BY_CONTEXT':'var(--rd)'};",
  "    var fdColor=fdColors[fd.finalTradingDecision]||'var(--tx2)';",
  '',
].join('\n');

function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }

/** Project the current module back to the exact source EIC PR 4 shipped. */
function extractionSource(src) {
  if (typeof src !== 'string') return null;
  if (src.split(POST_EXTRACTION_FDCOLOR_FIX).length - 1 !== 1) return null;
  return src.replace(POST_EXTRACTION_FDCOLOR_FIX, '');
}

// Brace-match a top-level `function NAME(...) { … }` (optionally `async`)
// starting at `start`, skipping strings, template literals, comments and regex
// literals. Returns the index of the closing brace. Identical to the matcher in
// eic-pr1/2/3-undo.js — kept per-file rather than shared so a change to one
// family's helper cannot silently alter another's reconstruction.
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

/** Every top-level function declaration in a source, in physical order. */
function declarations(src) {
  const re = /(^|\n)(async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + (m[1] ? m[1].length : 0);
    const end = matchFunctionEnd(src, start);
    if (end < 0) return [];
    out.push({ name: m[3], start, end, isAsync: !!m[2] });
    re.lastIndex = end;
  }
  return out;
}

/**
 * Derive the region texts from the shipped module — PR 2's rule, unchanged.
 *
 * The walk-back stops at the first line that is not a `//` comment, so this
 * module's own architecture header (separated from the first region by a blank
 * line) is correctly NOT treated as attached and does not travel back into
 * index.html. If a future edit deleted that blank line, the header WOULD be
 * pulled in, the region length would stop matching `REGION_OFFSETS[].chars`,
 * and `undoEicPr4` would refuse rather than silently corrupt the document.
 */
function regionTexts() {
  const current = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
  const src = extractionSource(current);
  if (src == null) return [];
  return declarations(src).map((d) => {
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

/** The bare declaration texts as shipped, in physical order, for identity checks. */
function declarationTexts() {
  const current = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
  const src = extractionSource(current);
  if (src == null) return [];
  return declarations(src).map((d) => src.slice(d.start, d.end + 1));
}

/**
 * Reverse EIC PR 4 on a document: drop the script tag, put the four regions
 * back at the offsets they held. Returns null if the document does not look
 * like it has EIC PR 4 applied.
 */
function undoEicPr4(html) {
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
  // ORIGINAL (post-PR3) monolith, and each insertion happens at the offset the
  // region held in THAT document. Inserting in ascending order means every
  // earlier insertion has already pushed the later text right by exactly the
  // amount those earlier regions occupied, which is what makes the recorded
  // offsets directly usable. Descending order with the same offsets would be
  // wrong, and so would ascending order with a running shift applied.
  for (const s of spans.slice().sort((a, b) => a.off - b.off)) {
    const at = monoAt + s.off;
    out = out.slice(0, at) + s.text + out.slice(at);
  }
  return out;
}

/**
 * Undo EIC PR 4 and PROVE the result is the post-PR3 application.
 * Returns { html, verified, reason }.
 */
function postPr3Html(html) {
  const out = undoEicPr4(html);
  if (out == null) return { html: null, verified: false, reason: 'EIC PR 4 does not appear to be applied to this document' };
  const h = sha256(out);
  if (h !== POST_PR3_INDEX_SHA256) {
    return { html: out, verified: false, reason: 'undo produced ' + h.slice(0, 16) + ', expected ' + POST_PR3_INDEX_SHA256.slice(0, 16) };
  }
  return { html: out, verified: true, reason: 'byte-exact' };
}

/** True when this checkout actually has EIC PR 4 applied. */
function isApplied(html) {
  return html.indexOf(TAG) >= 0;
}

/**
 * The whole chain: undo PR 4, then PR 3, then PR 2, then PR 1, and hand back the
 * post-PESS document. Each link is verified by hash; the first failure is
 * reported rather than papered over. Callers that only need "the document my
 * family was cut from" should use this rather than reimplementing the order.
 */
function postPessHtml(html) {
  const PR3 = require('./eic-pr3-undo.js');
  let cur = html;
  if (isApplied(cur)) {
    const r = postPr3Html(cur);
    if (!r.verified) return { html: r.html, verified: false, reason: 'PR4 undo: ' + r.reason };
    cur = r.html;
  }
  return PR3.postPessHtml(cur);
}

module.exports = {
  TAG,
  MODULE_REL,
  POST_PR3_REF,
  POST_PR3_INDEX_SHA256,
  POST_PR3_INDEX_CHARS,
  REGION_OFFSETS,
  REGION_TOTAL_CHARS,
  DECLARATION_CHARS,
  DECLARATION_CHARS_EACH,
  DECLARATION_SHA256,
  POST_EXTRACTION_FDCOLOR_FIX,
  declarations,
  extractionSource,
  regionTexts,
  declarationTexts,
  undoEicPr4,
  postPr3Html,
  postPessHtml,
  isApplied,
  sha256,
};
