'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO REGIME BADGE HTML — PERMANENT BOUNDARY CONTRACT.
//
// THE CUT IS MADE. [68905,70935) in monolith coordinates — 2,031 units raw and
// 2,030 of body, ONE owner, synchronous — now lives in
// js/portfolio/portfolio-regime-badge-html.js. `regimeHTML` returns the MARKET REGIME
// card the Portfolio panel opens with: the regime's label, coloured by its volatility,
// a source and time line, an optional row of the four VIX-family readings, and a
// closing disclaimer. It reads two fields of `S`, `marketRegime` and `vixFamily`, and
// writes nothing. The block opens on the `// ─── REGIME BADGE HTML` banner and the blank
// line above it stayed behind.
//
// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE. The undo helper runs
// first and rebuilds the pre-extraction index.html byte for byte, so every
// coordinate this file inherited from audit #514 is now proved by the
// reconstruction that shipped rather than by a document that no longer exists.
// A relocation is byte-exact or it is not done.
//
// THIS HEADER WAS RE-TENSED, NOT INHERITED. The audit's header described a
// recommendation, a change that moved nothing, and a conversion still to come.
// This file IS the conversion, so those sentences are rewritten rather than
// carried over; the sections below were re-tensed the same way, and §8 and §9
// INVERT the audit's "not yet" claims instead of dropping them.
//
// ── THE FINDING, PART ONE: NO ROW SCORED BELOW 3, AND THREE OPENINGS TIED AT IT ─
//
// The contract before this layer published its four best other openings, and this
// was the FIRST of them, at the head of a three-way tie at (byConsumerSplit, raw
// nine) = (3, 3). The cut that contract shipped sat entirely AFTER this block, so
// the tie was intact. Over the screen and the pass over its sub-floor runs together,
// §4 counts no row with a byConsumerSplit below 3, and the three openings at (3, 3)
// were not equal on the other counts: this block has one consumer and one dependency,
// the second has one consumer and TWO dependencies, the third has TWO consumers and
// one. The published ranking key (byConsumerSplit, raw nine, units ascending) put
// them in order by LENGTH ALONE, and this was the shortest. That is what ordered them.
//
// ── PART TWO: THE SCREEN HELD IT, BECAUSE IT IS THE FIRST OWNER OF ITS REGION ──
//
// Measured from its declaration the block is 1,949 units, over the 1,500 floor, so
// the pass over sub-floor runs had nothing to find for it. The screen did not
// enumerate it at its declaration at all: the first owner of a region is measured from
// the region's start, which is the banner this block opens on, so it was held once, at
// the banner. §2 counts both.
//
// ── PART THREE: ONE CALL FROM ONE CONSUMER, ONE SIBLING CALL, ONE DEPENDENCY ───
//
// The raw nine is 3. `renderPositionsPanel`, a function of 33,520 units, calls
// `regimeHTML()` once, as the last operand of a string concatenation; the sibling
// module js/portfolio/portfolio-data-fetch.js calls it once more, inside
// `renderPortfolioPanel`. The monolith dependency is `S`, a `const` of 2,531 units
// declared near the top of the monolith, read inside the body at CALL time: the block
// reads nothing at evaluation time and runs no top-level statement. It writes no
// monolith name, deletes nothing, and reaches the host through neither `window`,
// `document` nor `console`. Four of its 38 non-ASCII characters are in string
// literals it RETURNS, not in comments, which the move keeps byte for byte.
//
// ── PART FOUR: WHAT THE LOAD ORDER DEPENDS ON, AND WHAT IS NOT MEASURED ───────
//
// The block itself makes no evaluation-time read and runs no statement, and both
// references to it sit inside function bodies. §3 measures where the two sites are.
// It does NOT measure what calls `renderPositionsPanel` or `renderPortfolioPanel`,
// so it does not show that neither is called while the monolith is being evaluated.
// The tag sits last of the local scripts, directly in front of the inline monolith,
// as the journal layer's did when it shipped, which makes the question moot rather than answered;
// §9 pins that position.
//
// ── PART FIVE: FOUR OPENINGS WERE LEGAL, THREE PARSE, ONE IS A BLANK LINE ─────
//
// The seam rule admits four line starts between the owner above and the
// declaration: that owner's closing brace, the blank line after it, the banner and
// the declaration. The brace does not parse as a script. The cut takes the banner,
// which is the one comment line above the declaration, and leaves the blank line,
// so the monolith keeps `}` + blank line + `function macdLabel(`, a join it held
// once at the END of the block and holds once at the place the cut was made.
//
// ── PART SIX: THE CUT TOOK ITS REGION'S BANNER, AND THE OWNER BELOW IS REFUSED ─
//
// The banner the block opens on headed a region of two owners; the cut is the first.
// Leaving the banner would have headed `macdLabel` with a title that describes code
// that has moved, so the cut took it, and `macdLabel` fell into the region above, which
// opens on a `// ═══` header, so the document's owner regions went from 115 to 114. §5
// prices the one owner below: it is REFUSED by the seam rule, because its body ends
// against a `// ═══` header with no structural separator, so extending the cut
// downward was never a boundary at all.
//
// ── PART SEVEN: THE BEHAVIOUR IS MEASURED, NOT ASSUMED ────────────────────────
//
// §7 loads the SHIPPED module in a bare VM, then with `S` and a stub `Date` defined, and
// drives it through a table: the colour of each volatility, the source line, the time,
// every shape of the VIX row, the exact HTML for the empty state, and the reads it
// makes on `S`. It also pins one latent quirk and does not fix it: the colour map is an
// object literal, so a volatility named `toString` or `constructor` puts the inherited
// function's source text into the style attribute.
//
// ── WHERE IT SITS ──────────────────────────────────────────────────────────
//
// §8 ranks it by size against the sixty layers the chain now holds: it is the
// thirteenth smallest, which §8 measures against every layer rather than asserting.
// Its body holds non-ASCII characters, so the pure-ASCII count did not move; it opens
// on a `// ─── ` banner, which the `// ── ` shape the chain count uses does NOT match,
// so that count did not move either; and it pins a NON-EMPTY monolith dependency, so
// the count of layers that pin one moved, by one. §8 measures all three.
//
// ═════════════════════════════════════════════════════════════════════════════

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APP_LOADER = require('./lib/load-app-source.js');
const {
  maskLiterals, stripComments, scanTopLevelDeclarations, functionBodyRanges,
} = require('./lib/eic-contract-guards.js');
const {
  isBlankOrComment, snapBodyEnd, assertSeam,
  topLevelBanners, evaluationTimeReads, literalView, isPropertyWriteAt,
} = require('./lib/extraction-boundary.js');
const UNDO = require('./lib/portfolio-regime-badge-html-undo.js');

// The module this layer shipped. The audit called it MODULE_REL_IF_CUT while the
// cut was still a recommendation; it is no longer hypothetical.
const MODULE_REL = 'js/portfolio/portfolio-regime-badge-html.js';

// ── The base ─────────────────────────────────────────────────────────────────
// The commit that carried the AUDIT — the pre-extraction state this contract
// reconstructs. index.html is byte-identical here and at the audit's own base,
// but only this commit carries the audit that §10 asserts was replaced
// one-for-one.
const BASE_SHA = '2fe915a';
// The commit the AUDIT measured, one merge earlier. Phase 1 changed no production
// byte, so §1 asserts its index.html is this one's.
const AUDIT_BASE_SHA = 'f3f4ac0';
const BASE_CHARS = 1423772;
const BASE_UTF8 = 1452235;
const BASE_LF = 24588;
const BASE_SHA256 = 'd295ec3b92834eb094f34affc205ab32fb0ae8f3b94093fa5e4fe472f7e50da5';
const LOCAL_SCRIPTS = 103;
const TEST_FILE_COUNT = 188;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-regime-html-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/regime-html-audit.spec.js';
const CONTRACT_REL = 'tests/portfolio-regime-badge-html-boundary-contract.test.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-regime-badge-html-contract.spec.js';
const UNDO_REL = 'tests/lib/portfolio-regime-badge-html-undo.js';
// LIVE, and ratcheted with TEST_FILE_COUNT: the number of contracts pinning the
// suite file count TODAY. It moves up by one whenever a cycle's audit lands,
// because the audit pins it; Phase 2 RENAMES the file that carries the pin and
// so adds none, which is why the rename left it where the audit had put it.
const RATCHETED_CONTRACTS = 50;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
// The contract that was newest before this one shipped.
const PREVIOUS_CONTRACT = 'tests/journal-expiry-audit-boundary-contract.test.js';
const BASE_DECLARED_MUTANTS = 180;
// THE SPEC THIS PHASE RETIRES is the AUDIT's, and only the audit's: the outgoing
// contract's spec went in Phase 1, which is the rhythm. §10 asserts the
// arithmetic, not the total it happens to reach.
const RETIRED_SPEC_REL = 'tests/mutation-specs/regime-html-audit.spec.js';
const RETIRED_MUTANTS = 174;
const BASE_SPECS = 2;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME: this contract's spec
// now, the next layer's audit spec after the next Phase 1. The predicate is every
// `.spec.js` but the coverage spec, NOT `-contract.spec.js`, which could not
// see an audit spec at all.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 116224;
const CODE_CHARS = 1307522;
const TOP_LEVEL_DECLS = 890;
const OWNER_REGIONS = 115;

// ── The region ───────────────────────────────────────────────────────────────
// It opened on the `// ─── REGIME BADGE HTML` banner, the one comment line directly
// above the declaration, and the blank line above the banner stayed behind as the
// separator.
const RAW_AT_IN_CODE = 68905;
const DECL_AT_IN_CODE = 68986;
const RAW_END_IN_CODE = 70936;
const BODY_END_IN_CODE = 70935;
const RAW_CHARS = 2031;
const BODY_CHARS = 2030;
const BODY_UTF8 = 2104;
const BODY_LF = 32;
const BODY_SHA256 = 'b396ef8dd3c7449e49532914829a575479d17dca93dc58c86dbe7fbf7f1560a5';
const BODY_ENDING = '}\n';
const DOC_FIRST_LINE = '// ─── REGIME BADGE HTML — used in Portfolio panel ─────────────────────────────';
const DECL_FIRST_LINE = 'function regimeHTML(){';
const EM_DASHES = 4;
const MIDDLE_DOTS = 2;
const BOX_DRAWING_CHARS = 32;
const NON_ASCII_CHARS = 38;
const NON_ASCII_IN_STRINGS = 4;
const NON_ASCII_LINES = 6;
const NEXT_DECL = 'macdLabel';

// ── Its owner ────────────────────────────────────────────────────────────────
const OWNER_COUNT = 1;
const OWNERS_EXPECTED = ['regimeHTML'];
const OWNER_SIZES = [1948];
const OWNER = 'regimeHTML';

// ── Its shape ────────────────────────────────────────────────────────────────
const SPLIT_LINES = 32;
const CODE_LINES = 28;
const COMMENT_LINES = 2;
const BLANK_LINES = 2;
const TOP_LEVEL_STATEMENT_LINES = 0;

// ── The boundary judgement: the openings the seam rule admits ────────────────
const OWNER_BEFORE = 'computeMarketRegime';
const BRACE_OPENING = 68902;
const BLANK_OPENING = 68904;
const DOC_TAKEN = 81;
const DOC_TAKEN_LINES = 1;
const SEAM_LEGAL_OPENINGS = 4;
const PARSING_OPENINGS = 3;
const BRACE_OPENING_ERROR = 'SyntaxError';
const MID_LINE_OPENING = 68903;
const MID_LINE_ERROR = 'EXTRACTION_SEAM_NOT_LINE_START';
const DECL_UNITS_FROM_DECLARATION = 1949;
const CANDIDATES_AT_DECLARATION = 0;
const CANDIDATES_AT_CUT = 1;
const HIDDEN_ROWS_AT_CUT = 0;
// What the cut left behind: the closing brace of the owner above, one blank line, and
// the declaration of the next function — the join the monolith already held, once, at the end of the block.
const NEXT_DECL_PREFIX = 'function macdLabel(';
const FUSED_IF_BLANK_TAKEN = '}\nfunction macdLabel(';
const JOIN_AFTER_CUT = '}\n\nfunction macdLabel(';
const JOIN_AS_BEFORE = '}\n\n// ─── REGIME BADGE HTML';

// ── The banner region it sits inside ─────────────────────────────────────────
const REGION_AT = 68905;
const REGION_END = 71214;
const REGION_CHARS = 2309;
const REGION_OWNERS = 2;
const OWNER_POSITION = 1;
const BANNER_LINE_PREFIX = '// ─── REGIME BADGE HTML';
const WHOLE_REGION_NINE = 4;
const WHOLE_REGION_BCS = 4;
const WHOLE_REGION_CONSUMERS = 2;
const WHOLE_REGION_DEPS = 1;
const WHOLE_REGION_SIB = 1;
// WHAT TAKING THE BANNER DID TO THE REGIONS. The owner left under it fell into
// the region above.
const REGION_ABOVE_AT = 66094;
const REGION_ABOVE_BANNER_PREFIX = '// ═══';
const REGION_ABOVE_OWNERS = 1;
const LEFT_OWNERS = ['macdLabel'];
const BANNER_MARKS = 216;
const BANNER_MARKS_AFTER_CUT = 215;
const REGIONS_AFTER_CUT = 114;

// ── Taking more, priced: the owners above; the owners below ──────────────────
// The block is the FIRST owner of its region, so no owner stands above it.
const EXTENSIONS_UP = [];
const OWNERS_ABOVE = 0;
// Below: ONE owner stays in the region and the seam rule REFUSES the cut extended over it.
const EXTENSIONS_DOWN = [
  ['macdLabel', 'EXTRACTION_SEAM_NO_STRUCTURAL_SEPARATOR'],
];
const OWNERS_BELOW = 1;
const DOWN_LEGAL = 0;
const DOWN_REFUSED = 1;
// THE ONE RUN the single owner makes, which is the cut:
// [first owner, last owner, opening, closing, units of body, raw nine,
// byConsumerSplit, monolith dependencies, inbound reference sites].
const OWN_RUNS = [
  ['regimeHTML', 'regimeHTML', 68905, 70935, 2030, 3, 3, ['S'], 1],
];
const OWN_RUNS_LEGAL = 1;
const OWN_RUNS_REFUSED = 0;
const OWN_RUNS_UNDER_FLOOR = 0;

// ── Coupling ─────────────────────────────────────────────────────────────────
const FULL_NINE = 3;
const BY_CONSUMER = 3;
const BY_CONSUMER_SPLIT = 3;
const CONSUMERS = ['renderPositionsPanel'];
const CONSUMER_SITES = 1;
const CONSUMER_SITES_AT = [813970];
const CONSUMER_RPP_AT = 809453;
const CONSUMER_RPP_END = 842972;
const CONSUMER_RPP_CHARS = 33520;
const SIBLING_MODULE = 'js/portfolio/portfolio-data-fetch.js';
const SIBLING_SITE_HOST = 'renderPortfolioPanel';
const SIBLING_REFERENCES = 1;
const STATE_BINDING = 'S';
const STATE_BINDING_AT = 1067;
const STATE_BINDING_END = 3597;
const STATE_BINDING_CHARS = 2531;
const STATE_READS = ['marketRegime', 'vixFamily'];
const MONOLITH_DEPENDENCIES = ['S'];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
const INBOUND_REFERENCES = 1;
const OUTBOUND_MODULE_REFERENCES = 0;
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const NON_LOCAL_ASSIGNMENTS = 0;
const HOST_GLOBAL_MENTIONS = 0;
const EVALUATION_TIME_READS = [];
// THE SCAN THIS FILE INHERITED needs no correction here: on this block the inherited and the
// corrected scan agree and both find nothing, and both are shown to find a planted write.
const UNCORRECTED_SCAN_NAMES = [];

// ── The bare VM, measured ────────────────────────────────────────────────────
const VM_GLOBALS = ['regimeHTML'];

// ── The screen at this base ──────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7187;
const SEAM_REJECTED = 2091;
const CANDIDATES = 2834;
const CLEAN_CANDIDATES = 1705;
const SCORE_TWO_OR_BELOW = 0;
// THE PASS THE FLOOR HIDES. The screen floors a run at RUN_FLOOR units measured
// from the DECLARATION, except that the first owner of a region is measured from
// the region's start. This pass keeps every run the screen skipped for being
// short, re-measures it from the start of its documentation, and keeps those that
// then clear the floor. THIS CUT IS NOT ONE OF THEM.
const HIDDEN_ROWS = 35;
const HIDDEN_CLEAN_ROWS = 34;
const HIDDEN_SCORE_TWO_OR_BELOW = 0;
// THE ROWS AT THE BEST SCORE, 3, over the screen and the pass together.
const ROWS_AT_THREE = 14;
const ROWS_AT_THREE_SCREEN = 11;
const ROWS_AT_THREE_HIDDEN = 3;
const LOWEST_NINE_AT_THREE = 3;
// THE OPENINGS AT (byConsumerSplit, raw nine) = (3, 3), each pinned in full:
// [opening, closing, units, consumers, monolith dependencies].
const TIED_AT_BEST = [
  [68905, 70935, 2030, 1, 1],
  [908232, 910318, 2086, 1, 2],
  [906528, 910318, 3790, 2, 1],
];
// The best four OTHER openings over the screen and the hidden pass together,
// ranked by byConsumerSplit, then raw nine, then units, ascending, and skipping
// anything that overlaps the cut: [opening, byConsumerSplit, nine, units].
const RUNNERS_UP = [
  [908232, 3, 3, 2086],
  [906528, 3, 3, 3790],
  [760226, 3, 4, 1690],
  [936905, 3, 4, 1708],
];
// The shipped cut changed the screen: the figures measured here less the previous contract's.
// They are POSITIVE, because that cut took its region's banner, and the three owners it left behind
// fell into the region above, which makes one bigger region of runs where there were two.
const DELTA_RAW_RUNS = 18;
const DELTA_SEAM_REJECTED = 0;
const DELTA_CANDIDATES = 20;
const DELTA_CLEAN = 20;
const PREVIOUS_RAW_CHARS = 2092;
const PREVIOUS_RAW_AT = 866308;
// The previous contract's published list, with where each entry sat relative to
// the cut it shipped.
const PREVIOUS_RUNNERS_UP = [
  [68905, 3, 3, 2030],
  [910324, 3, 3, 2086],
  [908620, 3, 3, 3790],
  [760226, 3, 4, 1690],
];

// ── Where it sits ────────────────────────────────────────────────────────────
// The chain INCLUDING this layer. §8 measures the smallest layer at SMALLEST_LAYER_CHARS.
const CHAIN_LENGTH = 60;
const SMALLEST_LAYER_CHARS = 1559;
const SIZE_RANK = 13;
const LAYERS_SMALLER_THAN_THIS_CUT = 12;
const LAYERS_LARGER_THAN_THIS_CUT = 47;
const PRIOR_PURE_ASCII_LAYERS = 8;
const PURE_ASCII_LAYERS = 8;
const PRIOR_LAYERS_OPENING_ON_BANNER = 26;
const LAYERS_OPENING_ON_BANNER = 26;
const PRIOR_LAYERS_OPENING_ON_WIDE_BANNER = 28;
const LAYERS_OPENING_ON_WIDE_BANNER = 29;
const PRIOR_LAYERS_WITH_A_DEPENDENCY = 23;
const LAYERS_WITH_A_DEPENDENCY = 24;

// ── What the relocation cost the document ────────────────────────────────────
const NET_REDUCTION = 1961;
const INDEX_AFTER = 1421811;
const RESIDUAL_MONOLITH = 1305491;
const LOCAL_SCRIPTS_AFTER = 104;
// The tag's position among the local scripts, zero-based: the last of 104.
const TAG_LOCAL_INDEX = 103;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name.replace(/\$/g, '\\$') + ')\\b', 'g');
  const out = []; let m;
  while ((m = re.exec(text))) out.push(m.index + m[1].length);
  return out;
}
function propertyWriteBases(masked) {
  const re = /\b([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.\s*[A-Za-z_$][A-Za-z0-9_$]*|\[[^\]\n]{1,60}\])\s*=(?!=)/g;
  const out = []; let m;
  while ((m = re.exec(masked))) out.push(m[1]);
  return out;
}
function locallyBound(src) {
  const out = new Set(); let m;
  const decl = /\b(?:var|let|const|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = decl.exec(src))) out.add(m[1]);
  const params = /\bfunction\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m = params.exec(src))) for (const p of m[1].split(',')) {
    const n = p.trim().replace(/=.*$/, '').trim();
    if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) out.add(n);
  }
  return out;
}
function codeLines(src) { return src.split('\n').filter((l) => !isBlankOrComment(l)).length; }
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });


console.log('REGIME BADGE HTML — PERMANENT BOUNDARY CONTRACT');
console.log('reconstructed from the shipped module · base=' + BASE_SHA);

// THIS IS THE NEWEST LAYER, so LIVE_INDEX is the head of the tree and nothing is
// peeled before it. The next cycle's Phase 2 adds a peel here, as this one's
// predecessor received.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_MONOLITH = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file
// inherited from the audit is now proved by the reconstruction that shipped
// rather than by a document that no longer exists.
const INDEX = UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, MODULE);

const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(CODE);
const STRINGS = literalView(CODE, maskLiterals, stripComments);
const DECLS = scanTopLevelDeclarations(CODE);
const BY_NAME = new Map(DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const MARKS = topLevelBanners(CODE, FN_BODIES);

const SIBLINGS = LOCALS.map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, src, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = TAGS.filter((t) => !t.src && t.inline !== CODE).map((t) => t.inline).join('\n');
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

function occurrenceIndex(text) {
  const idx = new Map();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(text))) {
    const at = m.index + m[1].length;
    const bucket = idx.get(m[2]);
    if (bucket) bucket.push(at); else idx.set(m[2], [at]);
  }
  return idx;
}
const OCC_CODE = occurrenceIndex(MASKED);
const OCC_STRINGS = occurrenceIndex(STRINGS);
const OCC_MARKUP = occurrenceIndex(STATIC_MARKUP);
const SIB_REFS = new Map();
{
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked), rel: s.rel }));
  for (const d of DECLS) {
    let n = 0; const who = [];
    for (const m of per) {
      if (m.bound.has(d.name)) continue;
      const k = (m.idx.get(d.name) || []).length;
      n += k; if (k) who.push(m.rel);
    }
    SIB_REFS.set(d.name, { n, who });
  }
}
const at0 = (idx, n) => idx.get(n) || [];
function lowerBound(sorted, x) {
  let a = 0, b = sorted.length;
  while (a < b) { const m = (a + b) >> 1; if (sorted[m] < x) a = m + 1; else b = m; }
  return a;
}
const countIn = (sites, lo, hi) => lowerBound(sites, hi) - lowerBound(sites, lo);

function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0, sib = 0, mkp = 0;
  const sites = []; const sibWho = new Set();
  for (const n of names) {
    for (const at of at0(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += at0(OCC_STRINGS, n).filter(outside).length;
    const sr = SIB_REFS.get(n); sib += sr.n; for (const w of sr.who) sibWho.add(w);
    mkp += at0(OCC_MARKUP, n).length;
  }
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  const local = locallyBound(CODE.slice(range[0], range[1]));
  const bodyIdx = occurrenceIndex(bodyMasked);
  const deps = new Set();
  for (const [n] of bodyIdx) if (!nameSet.has(n) && !local.has(n) && BY_NAME.has(n)) deps.add(n);
  let outModule = 0;
  for (const [n, pos] of bodyIdx) {
    if (nameSet.has(n) || local.has(n)) continue;
    if (MODULE_OWNERS.has(n)) outModule += pos.length;
  }
  let outGen = 0;
  for (const d of DECLS) {
    if (nameSet.has(d.name)) continue;
    outGen += countIn(at0(OCC_STRINGS, d.name), range[0], range[1]);
  }
  const seven = inbound + inWrites + inPropWrites + outWrites.length + deps.size + sib + mkp + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    sibWho: Array.from(sibWho).sort(),
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule, seven, nine: seven + outGen + outModule,
  };
}
function mergedRegions(marks) {
  const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : CODE.length }));
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    let r = raw[i];
    while (i + 1 < raw.length &&
      !CODE.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
      r = { start: r.start, end: raw[i + 1].end }; i++;
    }
    out.push(r);
  }
  return out.filter((x) => DECLS.some((d) => d.start >= x.start && d.end < x.end));
}
const PROFILE_CACHE = new Map();
const profileOf = (range) => {
  const key = range[0] + ':' + range[1];
  let hit = PROFILE_CACHE.get(key);
  if (!hit) { hit = profile(range); PROFILE_CACHE.set(key, hit); }
  return hit;
};
function loadTimeProfile(lo, hi) {
  const body = CODE.slice(lo, hi);
  const decls = scanTopLevelDeclarations(body);
  const blanked = Array.from(body);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) blanked[i] = ' ';
  return {
    stmtLines: codeLines(blanked.join('')),
    reads: evaluationTimeReads(body, decls, maskLiterals),
  };
}
const runsNothingAtLoad = (p) => p.stmtLines === 0 && p.reads.length === 0;
const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
function consumersOf(p) {
  return Array.from(new Set(p.sites.map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
}
const byConsumer = (p) => consumersOf(p).length + p.inWrites + p.inPropWrites +
  p.outWrites.length + p.deps.length + p.sib + p.mkp + p.gen + p.outGen + p.outModule;
const SORTED_MARKS = MARKS.slice().sort((a, b) => a - b);
const lineAt = (at) => CODE.slice(at, CODE.indexOf('\n', at));
const firstLineOf = (text) => text.slice(0, text.indexOf('\n'));
const nextMarkAfter = (m) => {
  const n = SORTED_MARKS.filter((x) => x > m)[0];
  return n === undefined ? CODE.length : n;
};
const namesIt = (text, name) =>
  new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(text);
function blockAbove(d) {
  let at = CODE.lastIndexOf('\n', d.start - 1) + 1;
  let first = null;
  while (at > 0) {
    const ls = CODE.lastIndexOf('\n', at - 2) + 1;
    if (/^\s*\/\//.test(CODE.slice(ls, at - 1))) { first = ls; at = ls; } else break;
  }
  return first === null ? null : { start: first, text: CODE.slice(first, d.start) };
}

const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REGIONS = mergedRegions(MARKS);

// ── The screen, run ONCE and reused by §2, §4, §5 and §6 ─────────────────────────────
const candidateRuns = [];
let rawRunCount = 0, seamRejectedCount = 0;
{
  const seen = new Set();
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        rawRunCount++;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo || be - lo < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo, be); } catch (e) { seamRejectedCount++; continue; }
        const key = lo + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        candidateRuns.push({ lo, hi: be, units: be - lo });
      }
    }
  }
  for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
}






async function main() {


// CHAIN, chronological, oldest first — this cycle's own literal, as the audit
// said Phase 2 would give it. Reading it off the previous newest contract was
// right while this layer had not shipped; now this file IS the newest, so the
// list ends at its own layer and the next cycle reads it from here.
const CHAIN = [
  'js/services/journal-core.js',
  'js/services/mcx-regime-policy.js',
  'js/ui/journal-ui.js',
  'js/services/journal-remote-persistence.js',
  'js/services/journal-backend-write-through.js',
  'js/services/journal-migration.js',
  'js/services/journal-manual-import.js',
  'js/ui/journal-backup-restore.js',
  'js/ui/mcx-macro-check.js',
  'js/ui/mcx-charts.js',
  'js/services/apex-post-auth-init.js',
  'js/ui/tt-reconnect.js',
  'js/ui/journal-close-legs.js',
  'js/ui/journal-trade-forms.js',
  'js/ui/journal-trade-detail.js',
  'js/portfolio/portfolio-data-fetch.js',
  'js/portfolio/backend-portfolios.js',
  'js/portfolio/portfolio-expiry-manual.js',
  'js/portfolio/portfolio-traffic-light.js',
  'js/ui/backend-candle-store-chart.js',
  'js/services/journal-rich-snapshot.js',
  'js/portfolio/portfolio-backend-candles.js',
  'js/services/journal-snapshot-prefetch.js',
  'js/portfolio/portfolio-dxlink-greeks.js',
  'js/config/strategy-templates.js',
  'js/portfolio/portfolio-vega-monitor.js',
  'js/services/scanner-ivr-throttle.js',
  'js/services/scanner-earnings-throttle.js',
  'js/ui/chart-interactions.js',
  'js/services/journal-snapshot-helpers.js',
  'js/services/swing-weekly-candles.js',
  'js/services/swing-direction.js',
  'js/portfolio/backend-positions-aggregate.js',
  'js/portfolio/portfolio-technical-merge.js',
  'js/portfolio/portfolio-technical-alignment-debug.js',
  'js/services/journal-map-audit.js',
  'js/services/dxlink-greeks-fetch.js',
  'js/portfolio/portfolio-technical-parity.js',
  'js/portfolio/portfolio-spy-price.js',
  'js/services/apex-storage-recovery.js',
  'js/portfolio/portfolio-leg-quantity.js',
  'js/portfolio/backend-full-refresh-validation.js',
  'js/portfolio/portfolio-snapshot-fallback.js',
  'js/portfolio/portfolio-technical-batch-fetch.js',
  'js/ui/rs-skip-breakdown-html.js',
  'js/portfolio/portfolio-greeks-freshness.js',
  'js/portfolio/portfolio-underlying-fallback-plan.js',
  'js/portfolio/portfolio-price-freshness.js',
  'js/portfolio/portfolio-missing-underlyings-gate.js',
  'js/services/scanner-dxlink-prices.js',
  'js/services/rs-quality-check.js',
  'js/portfolio/backend-positions-enriched.js',
  'js/portfolio/portfolio-option-streamer-diagnostics.js',
  'js/services/scanner-dss-chart-load-guard.js',
  'js/services/swing-chart-cache-helpers.js',
  'js/services/scanner-stock-scoring.js',
  'js/ui/scanner-dss-1d-chart.js',
  'js/portfolio/portfolio-stale-mark-squeeze-state.js',
  'js/services/journal-expiry-audit.js',
  'js/portfolio/portfolio-regime-badge-html.js',
];

// THE SELF-INCLUSION GUARD. CHAIN now ends at THIS layer and this file is its
// contract, so any census over CHAIN that reads contracts would count this cut as
// evidence for a claim about the layers that preceded it. Every such census runs
// over PRIOR_LAYERS and asserts this layer's own half separately.
const PRIOR_LAYERS = CHAIN.slice(0, CHAIN.length - 1);
const CHAIN_SET = new Set(CHAIN);
const OWNER_KIND = new Map();
for (const s of SIBLINGS) {
  for (const n of s.owners) if (!OWNER_KIND.has(n)) OWNER_KIND.set(n, CHAIN_SET.has(s.rel) ? 'chain' : 'foundation');
}
for (const s of SIBLINGS) {
  for (const n of s.owners) if (!OWNER_KIND.has(n)) OWNER_KIND.set(n, CHAIN_SET.has(s.rel) ? 'chain' : 'foundation');
}
function outboundSplit(lo, hi) {
  const body = MASKED.slice(lo, hi);
  const local = locallyBound(CODE.slice(lo, hi));
  const names = new Set(DECLS.filter((d) => d.start >= lo && d.end < hi).map((d) => d.name));
  let chain = 0, foundation = 0;
  const chainNames = new Set(), foundationNames = new Set();
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m;
  while ((m = re.exec(body))) {
    const n = m[2];
    if (names.has(n) || local.has(n)) continue;
    const kind = OWNER_KIND.get(n);
    if (kind === 'chain') { chain++; chainNames.add(n); }
    else if (kind === 'foundation') { foundation++; foundationNames.add(n); }
  }
  return { chain, foundation, chainNames: [...chainNames].sort(), foundationNames: [...foundationNames].sort() };
}
const byConsumerSplit = (p, split) => byConsumer(p) - p.outModule + split.chain;
for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }

const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));

// ── THE PASS THE FLOOR HIDES ────────────────────────────────────────────────
// The screen above floors a run at RUN_FLOOR units measured from the
// DECLARATION. This pass takes every run the screen skipped for being short,
// re-measures it from the start of its documentation, and keeps those that then
// clear the floor and are at a real seam.
const hiddenRows = [];
{
  const seen = new Set();
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo) continue;
        const ba = i === 0 ? null : blockAbove(own[i]);
        const lo2 = (i === 0 || !ba) ? lo : ba.start;
        if (be - lo >= RUN_FLOOR || be - lo2 < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo2, be); } catch (e) { continue; }
        const key = lo2 + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        const p = profileOf([lo2, be]);
        const split = outboundSplit(lo2, be);
        hiddenRows.push({
          lo: lo2, hi: be, unitsDecl: be - lo, unitsDoc: be - lo2, p, split,
          load: loadTimeProfile(lo2, be), nine: p.nine, bcs: byConsumerSplit(p, split),
        });
      }
    }
  }
}

// A direct scan for assignment to anything the text does not own, kept apart
// from profile() so the outbound direction is measured twice by two different
// means. A metric whose true value is zero needs a control on an input where
// the answer differs, so this function is also run on a planted violation.
function nonLocalAssignmentsUncorrected(text) {
  const masked = maskLiterals(text);
  const local = locallyBound(text);
  const owned = new Set(scanTopLevelDeclarations(text).map((d) => d.name));
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,60}\])*\s*(?:=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) if (!local.has(m[2]) && !owned.has(m[2])) out.push(m[2]);
  return out;
}
// The corrected scan: every declarator of a `var`/`let`/`const` list is local,
// not only the first. The shipped scan above is kept so the audit can measure
// what it got wrong.
function declaredNamesIn(text) {
  const masked = maskLiterals(text);
  const out = new Set();
  const re = /\b(?:var|let|const)\s+/g;
  let m;
  while ((m = re.exec(masked))) {
    let depth = 0, seg = '';
    const segs = [];
    for (let i = re.lastIndex; i < masked.length; i++) {
      const ch = masked[i];
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) { if (depth === 0) break; depth--; }
      if (depth === 0 && ch === ';') break;
      if (depth === 0 && ch === ',') { segs.push(seg); seg = ''; continue; }
      seg += ch;
    }
    segs.push(seg);
    for (const sg of segs) { const n = sg.trim().match(/^([A-Za-z_$][\w$]*)/); if (n) out.add(n[1]); }
  }
  return out;
}
function nonLocalAssignmentsIn(text) {
  const masked = maskLiterals(text);
  const local = new Set([...locallyBound(text), ...declaredNamesIn(text)]);
  const owned = new Set(scanTopLevelDeclarations(text).map((d) => d.name));
  const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:\.[A-Za-z_$][\w$]*|\[[^\]\n]{1,60}\])*\s*(?:=(?!=)|\+=|-=|\*=|\/=|\+\+|--)/g;
  const out = [];
  let m;
  while ((m = re.exec(masked))) if (!local.has(m[2]) && !owned.has(m[2])) out.push(m[2]);
  return out;
}
const hostGlobalMentions = (text) => (maskLiterals(text).match(/\b(window|globalThis|self|document)\b/g) || []).length;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The base these numbers were measured against');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, BASE_CHARS, 'index.html is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this digest');
eq(sha256(git(['show', BASE_SHA + ':index.html'])), BASE_SHA256,
  '…which is the digest of the BASE_SHA commit\'s index.html, read out of git, so the base '
  + 'is a commit and not a remembered number');
eq(sha256(git(['show', AUDIT_BASE_SHA + ':index.html'])), BASE_SHA256,
  '…and the same digest as the document at AUDIT_BASE_SHA, where the audit measured it: Phase 1 moved no byte');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and is CODE_CHARS units of residual code');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it holds TOP_LEVEL_DECLS top-level declarations');
eq(REGIONS.length, OWNER_REGIONS, '…across OWNER_REGIONS owner regions');
// THE PREVIOUS LAYER'S OWN FORECASTS, checked. The contract that shipped the journal
// expiry audit predicted the document, the residual monolith and the script
// count this contract measures, so the two cycles are joined by numbers.
{
  const prev = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
  eq(CODE.length, Number(prev.match(/^const RESIDUAL_MONOLITH = (\d+);$/m)[1]),
    '…which is exactly the RESIDUAL_MONOLITH the previous contract forecast');
  eq(INDEX.length, Number(prev.match(/^const INDEX_AFTER = (\d+);$/m)[1]),
    '…and the document is exactly the INDEX_AFTER it forecast');
  eq(LOCALS.length, Number(prev.match(/^const LOCAL_SCRIPTS_AFTER = (\d+);$/m)[1]),
    '…with exactly the LOCAL_SCRIPTS_AFTER it forecast');
}

// ─────────────────────────────────────────────────────────────────────────────
section('2. The region, its seam, and the four openings the seam admits');
// ─────────────────────────────────────────────────────────────────────────────
eq(RAW_END_IN_CODE - RAW_AT_IN_CODE, RAW_CHARS, 'the raw fragment is RAW_CHARS units');
eq(BODY_END_IN_CODE - RAW_AT_IN_CODE, BODY_CHARS, '…BODY_CHARS of which are body');
eq(RAW_CHARS - BODY_CHARS, 1, '…the difference being the one structural separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single LF');
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest');
ok(BODY.endsWith(BODY_ENDING), '…ending on a real line of code');
eq(firstLineOf(BODY), DOC_FIRST_LINE, '…and opening on DOC_FIRST_LINE, the banner');
eq((BODY.match(/—/g) || []).length, EM_DASHES, '…holding EM_DASHES em dashes…');
eq((BODY.match(/·/g) || []).length, MIDDLE_DOTS, '…MIDDLE_DOTS middle dots…');
eq((BODY.match(/─/g) || []).length, BOX_DRAWING_CHARS, '…and BOX_DRAWING_CHARS box-drawing characters, the banner\'s rule…');
eq((BODY.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS,
  '…NON_ASCII_CHARS non-ASCII characters in all…');
eq(EM_DASHES + MIDDLE_DOTS + BOX_DRAWING_CHARS, NON_ASCII_CHARS, '…those three kinds being the whole of them');
{
  // UNLIKE THE PREVIOUS LAYER, not all of them are in comments: some are in string literals the function RETURNS.
  const inComments = BODY.split('\n').filter((l) => l.trim().startsWith('//')).join('\n');
  eq((inComments.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS - NON_ASCII_IN_STRINGS,
    '…NON_ASCII_CHARS less NON_ASCII_IN_STRINGS of them inside comment lines…');
  eq((maskLiterals(BODY).match(/[^\x00-\x7F]/g) || []).length, 0,
    '…none in code proper, so the remaining NON_ASCII_IN_STRINGS are all inside string literals: markup the function returns, which a relocation must keep byte for byte');
  eq(BODY.split('\n').filter((l) => !l.trim().startsWith('//') && /[^\x00-\x7F]/.test(l)).map((l) => (l.match(/[^\x00-\x7F]/g) || []).length)
    .reduce((a, b) => a + b, 0), NON_ASCII_IN_STRINGS, '…counted a second way, over the lines that are not comments');
}
eq(Buffer.byteLength(BODY, 'utf8') - BODY.length, 2 * (EM_DASHES + BOX_DRAWING_CHARS) + MIDDLE_DOTS,
  '…the em dashes and box-drawing characters three bytes in UTF-8 for one UTF-16 unit and the middle dots two, which is the whole of the gap between its UTF-8 and UTF-16 lengths');
eq(INDEX.indexOf(BODY), CODE_AT + RAW_AT_IN_CODE,
  '…and it occurs in the document at the offset the monolith coordinate implies');
eq(count(INDEX, BODY), 1, '…exactly once, so the fragment is not ambiguous');
ok(/<meta charset="UTF-8">/i.test(INDEX.slice(0, INDEX.indexOf('<script'))),
  '…and the document declares UTF-8 before its first script, which is what lets a module with non-ASCII string literals be read the way the inline code is');

// THE SEAM IS MECHANICAL, and it is checked before anything else is claimed.
eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
  'assertSeam accepts the chosen boundary and returns RAW_END_IN_CODE');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(next.name, NEXT_DECL, '…and the declaration immediately after the cut is NEXT_DECL');
  eq(next.start, RAW_END_IN_CODE, '…beginning exactly where the cut ends…');
  eq(CODE.slice(RAW_END_IN_CODE, RAW_END_IN_CODE + NEXT_DECL_PREFIX.length), NEXT_DECL_PREFIX,
    '…its first characters being NEXT_DECL_PREFIX…');
  eq(blockAbove(next), null,
    '…and it has no comment block above it, so the cut ends at a declaration and nothing of any documentation is cut off');
}

// THE SEAM IS NECESSARY BUT NOT SUFFICIENT. It admits four openings.
const OPENINGS = [];
{
  const prevOwner = DECLS.filter((d) => d.end < RAW_AT_IN_CODE).pop();
  eq(prevOwner.name, OWNER_BEFORE, 'the owner before the cut is OWNER_BEFORE…');
  for (let at = prevOwner.end; at <= DECL_AT_IN_CODE; at++) {
    if (at !== 0 && CODE[at - 1] !== '\n') continue;
    try { assertSeam(CODE, at, BODY_END_IN_CODE); OPENINGS.push(at); } catch (e) { /* not a seam */ }
  }
  eq(OPENINGS.length, SEAM_LEGAL_OPENINGS,
    '…and SEAM_LEGAL_OPENINGS line starts between it and the declaration are accepted');
  eq(OPENINGS[0], BRACE_OPENING, '…the first being the closing brace of the owner above');
  eq(OPENINGS[1], BLANK_OPENING, '…the next the blank line that separates that brace from the banner…');
  eq(OPENINGS[2], RAW_AT_IN_CODE, '…the next the banner, the one comment line, the cut…');
  eq(OPENINGS.slice(2, -1).length, DOC_TAKEN_LINES,
    '…and the DOC_TAKEN_LINES comment line is an opening of its own…');
  eq(OPENINGS[OPENINGS.length - 1], DECL_AT_IN_CODE, '…the last being the declaration');
  eq(firstLineOf(CODE.slice(BLANK_OPENING, BODY_END_IN_CODE)), '', 'the opening on the blank line is an EMPTY line, the only one of the four…');
  ok(OPENINGS.filter((at) => at !== BLANK_OPENING).every((at) => firstLineOf(CODE.slice(at, BODY_END_IN_CODE)).trim() !== ''),
    '…every other opening being a line with something on it');
  eq(CODE[BRACE_OPENING], '}', 'the opening before it is the brace itself…');
  throwsWith(() => assertSeam(CODE, MID_LINE_OPENING, BODY_END_IN_CODE), MID_LINE_ERROR,
    '…and the position between the brace and the blank line starts mid-line and is refused with its own error');
  // WHICH OF THEM IS A MODULE? Parse each as a standalone script, which is what loading it would do.
  const parses = (at) => {
    try { new vm.Script(CODE.slice(at, BODY_END_IN_CODE)); return null; } catch (e) { return e.name; }
  };
  eq(parses(BRACE_OPENING), BRACE_OPENING_ERROR,
    'the opening on the brace does NOT parse: BRACE_OPENING_ERROR');
  eq(OPENINGS.filter((at) => parses(at) === null).length, PARSING_OPENINGS,
    '…so PARSING_OPENINGS of the four are even candidates, counted rather than listed');
}

// WHAT THE CUT TAKES is the one comment line above the function, which is the region's banner, and nothing else.
// The blank line above it is left behind. The function's second comment line sits INSIDE its body.
{
  const doc = CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE);
  eq(doc.length, DOC_TAKEN, 'the comment block taken is DOC_TAKEN units');
  eq(doc.split('\n').filter(Boolean).length, DOC_TAKEN_LINES, '…DOC_TAKEN_LINES line of it');
  ok(doc.split('\n').every((l) => l === '' || l.trim().startsWith('//')),
    '…a comment, so the cut takes prose and no code');
  ok(!/^\/\/ ── /.test(doc), '…and it is NOT a `// ── ` banner in the two-dash shape: it has three dashes, `// ─── `…');
  ok(/^\/\/ ─{2,}[ \t]+\S/.test(doc), '…which topLevelBanners, whose pattern is two or more dashes, DOES count as a banner, so the region it heads is a banner region all the same');
  eq(firstLineOf(CODE.slice(DECL_AT_IN_CODE)), DECL_FIRST_LINE,
    '…immediately followed by the declaration, DECL_FIRST_LINE');
  eq(blockAbove(BY_NAME.get(OWNER)).start, RAW_AT_IN_CODE,
    '…and the programme\'s own blockAbove rule finds this comment block, starting where the cut does');
  const own = BY_NAME.get(OWNER);
  eq(CODE.slice(own.start, own.end + 1).split('\n').filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES - DOC_TAKEN_LINES,
    'the function holds COMMENT_LINES less DOC_TAKEN_LINES comment line inside its body: the one above the VIX family row…');
  eq(COMMENT_LINES, DOC_TAKEN_LINES + 1, '…so the body\'s two comment lines are the banner and that one');
  ok(doc.indexOf('REGIME BADGE HTML') >= 0 && doc.indexOf('Portfolio panel') >= 0,
    '…and the banner says the badge is used in the Portfolio panel; §3 names the two functions that call it, which is as far as that sentence is measured');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE), '}\n\n',
    'the banner is preceded by the brace of the owner above and ONE blank line, which stays');
}
// WHAT LEAVING THE COMMENT LINE WOULD HAVE STRANDED, and what taking the blank line would have fused.
{
  const stranded = CODE.slice(0, DECL_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  ok(stranded.indexOf(CODE.slice(RAW_AT_IN_CODE, DECL_AT_IN_CODE) + NEXT_DECL_PREFIX) >= 0,
    'cutting at the declaration would have left the banner directly above ' + NEXT_DECL + ', which it does not describe');
  const blankCut = CODE.slice(0, BLANK_OPENING) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, FUSED_IF_BLANK_TAKEN), 0, 'cutting at the blank line instead would fuse the brace of the owner above straight onto ' + NEXT_DECL + '…');
  eq(count(blankCut, FUSED_IF_BLANK_TAKEN), 1, '…a join the monolith held nowhere before the cut, once there');
}
// WHAT THE CUT LEFT. The brace of the owner above, one blank line, then the next function's declaration: the very
// join the monolith held at the END of the block, so the cut moves it and the document gains no new shape.
{
  const atCut = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  eq(count(CODE, JOIN_AFTER_CUT), 1, 'the monolith holds the join `}` blank line `' + NEXT_DECL_PREFIX + '` once before the cut, at the END of the block…');
  eq(CODE.indexOf(JOIN_AFTER_CUT), BODY_END_IN_CODE - 2, '…at the closing brace of the function…');
  eq(count(atCut, JOIN_AFTER_CUT), 1, '…and exactly once after the cut…');
  eq(atCut.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…now at the brace of the owner above, where the cut was made');
  eq(count(CODE, JOIN_AS_BEFORE), 1, '…while the join in front of the banner is held once before the cut, and is gone after it…');
  eq(count(atCut, JOIN_AS_BEFORE), 0, '…the banner leaving with the block');
  ok(atCut.indexOf(DECL_FIRST_LINE) < 0 && atCut.indexOf(DOC_FIRST_LINE) < 0,
    '…and no line of this comment or declaration is left behind');
}
// THE SCREEN HOLDS THIS RUN, AND NOT BY ITS DECLARATION. The screen floors a run at RUN_FLOOR units measured from the
// DECLARATION, except that the first owner of a region is measured from the region's start. Measured from the
// declaration this block is DECL_UNITS_FROM_DECLARATION, which is over the floor; it is the first owner of its region, so the
// screen measures it from the banner instead and enumerates NO run that opens at the declaration.
eq(BODY_END_IN_CODE - DECL_AT_IN_CODE, DECL_UNITS_FROM_DECLARATION,
  'measured from the declaration the run is DECL_UNITS_FROM_DECLARATION units…');
ok(DECL_UNITS_FROM_DECLARATION >= RUN_FLOOR, '…at or over RUN_FLOOR, so the floor is not what holds it and the pass over sub-floor runs has nothing to find for it…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_DECLARATION, '…and the screen enumerates CANDIDATES_AT_DECLARATION run that opens at the declaration and ends where this cut does…');
eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  CANDIDATES_AT_CUT, '…and CANDIDATES_AT_CUT that opens where the cut does, at the region\'s start…');
ok(BODY_END_IN_CODE - RAW_AT_IN_CODE >= RUN_FLOOR, '…which measured from there is at or above RUN_FLOOR…');
eq(hiddenRows.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length,
  HIDDEN_ROWS_AT_CUT, '…so the pass over runs the screen skipped for being short holds HIDDEN_ROWS_AT_CUT rows for it: it has nothing to find here');

// ───────────────────────────────────────────────────────────────────────────
section('3. Coupling: one consumer, one call, one sibling call, one dependency read at call time');
// ───────────────────────────────────────────────────────────────────────────
eq(REC.names, OWNERS_EXPECTED, 'the block declares exactly this name');
eq(REC.names.length, OWNER_COUNT, '…OWNER_COUNT of them');
{
  const own = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(own.map((d) => d.name), OWNERS_EXPECTED, '…and the declarations in range are that name');
  eq(own.map((d) => d.chars), OWNER_SIZES, '…at OWNER_SIZES units');
  eq(own.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…a declared function, so this layer ships no mutable binding');
  ok(own.every((d) => !/^async function /.test(firstLineOf(CODE.slice(d.start)))), '…SYNCHRONOUS');
  eq(count(MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE), 'function '), 2,
    '…with one more function declaration INSIDE it, `vfCell`, which sits in an `if` block and is not a top-level owner…');
  eq(DECLS.filter((d) => d.name === 'vfCell').length, 0, '…and the top-level scan does not see it');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS, 'six of the nine directions are ZERO, measured one by one');
eq(REC.inbound, INBOUND_REFERENCES, '…the seventh being INBOUND_REFERENCES reference from outside, in the monolith');
eq(REC.sib, SIBLING_REFERENCES, '…the eighth SIBLING_REFERENCES reference from a shipped module…');
eq(REC.deps, MONOLITH_DEPENDENCIES, '…and the ninth, the dependency direction, is exactly MONOLITH_DEPENDENCIES: `S`');
eq(REC.outModule, OUTBOUND_MODULE_REFERENCES, '…while OUTBOUND_MODULE_REFERENCES references to a shipped module are counted in the total');
eq(REC.nine, FULL_NINE, '…so the raw nine-direction total is FULL_NINE: one inbound, one sibling, one dependency');
eq(byConsumer(REC), BY_CONSUMER, '…and byConsumer is BY_CONSUMER');
eq(consumersOf(REC), CONSUMERS.slice().sort(), 'ONE consumer reaches in: CONSUMERS');
eq(REC.sites.length, CONSUMER_SITES, '…at CONSUMER_SITES place');
eq(REC.sites, CONSUMER_SITES_AT, '…at CONSUMER_SITES_AT');
{
  eq(SIB_REFS.get(OWNER), { n: SIBLING_REFERENCES, who: [SIBLING_MODULE] }, 'the one sibling reference is in SIBLING_MODULE…');
  ok(REC.sites.every((at) => /^\s*\(/.test(CODE.slice(at + OWNER.length))),
    '…and the monolith reference is followed by an opening parenthesis: it is a CALL, not an object key or a bare reference…');
  const site = REC.sites[0];
  ok(/\+\s*$/.test(CODE.slice(site - 20, site)) && /^regimeHTML\(\);/.test(CODE.slice(site, site + 14)),
    '…the last operand of a string concatenation, `...+ regimeHTML();`, the value of which is the argument-free call');
  const rpp = BY_NAME.get('renderPositionsPanel');
  ok(rpp.start >= RAW_END_IN_CODE, 'renderPositionsPanel sits outside the cut, below it…');
  eq([rpp.start, rpp.end, rpp.chars, rpp.form], [CONSUMER_RPP_AT, CONSUMER_RPP_END, CONSUMER_RPP_CHARS, 'function'],
    '…opening at CONSUMER_RPP_AT, ending at CONSUMER_RPP_END, CONSUMER_RPP_CHARS units long, a declared function');
  eq(hostOf(site).name, CONSUMERS[0], '…and it is the declaration that holds the one monolith reference');
  // THE SIBLING'S SITE, read out of the module's own text.
  const sib = SIBLINGS.filter((s) => s.rel === SIBLING_MODULE)[0];
  const sibSites = refSites(sib.masked, OWNER);
  eq(sibSites.length, SIBLING_REFERENCES, 'the sibling module names the function at SIBLING_REFERENCES site…');
  ok(/^\s*\(/.test(sib.src.slice(sibSites[0] + OWNER.length)), '…a call…');
  const sibHost = scanTopLevelDeclarations(sib.src).filter((d) => sibSites[0] >= d.start && sibSites[0] <= d.end).pop();
  eq(sibHost.name, SIBLING_SITE_HOST, '…inside SIBLING_SITE_HOST…');
  ok(functionBodyRanges(sib.src).some((r) => sibSites[0] >= r.start && sibSites[0] <= r.end), '…whose body it is inside, so that call too runs when the function is called…');
  ok(CHAIN_SET.has(SIBLING_MODULE), '…and the module is one of the chain\'s layers, so it is a shipped sibling and not a foundation file');
  eq(sib.bound.has(OWNER), false, '…which does not bind the name itself, so the reference is to the global the monolith defines');
  ok(insideFunction(site) && site > rpp.start && site < rpp.end, 'the monolith reference is likewise inside a function body, that of the declared function above…');
  // THAT is as far as this contract goes: it measures where the two sites are, and does NOT measure what calls
  // renderPositionsPanel or renderPortfolioPanel.
  eq(refSites(MASKED, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, INBOUND_REFERENCES,
    '…and the name is mentioned outside the block exactly INBOUND_REFERENCES time in the monolith, in code');
  eq(refSites(STRINGS, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, 0,
    '…and in no string or generated markup there');
  eq(count(STATIC_MARKUP, OWNER), 0, '…nor in the static markup, so no inline handler names it');
}
// THE ONE DEPENDENCY, `S`: a `const` the monolith declares at its top, read inside the body at CALL time.
{
  const s = BY_NAME.get(STATE_BINDING);
  eq([s.start, s.end, s.chars, s.form], [STATE_BINDING_AT, STATE_BINDING_END, STATE_BINDING_CHARS, 'const'],
    '`S` is a `const` opening at STATE_BINDING_AT, ending at STATE_BINDING_END, STATE_BINDING_CHARS units long: a global LEXICAL binding, which a later classic script reads by name');
  ok(s.start < RAW_AT_IN_CODE, '…declared before the block, at the top of the monolith');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bS\b/g) || []).length, 2, 'the body names `S` twice…');
  eq((bodyMasked.match(/\bS\s*\.\s*\w+/g) || []).map((x) => x.replace(/\s+/g, '').slice(2)), STATE_READS,
    '…both as a property read, `S.marketRegime` and `S.vixFamily`, in that order: STATE_READS…');
  ok(!/\bS\s*(\.\s*\w+\s*)?(=(?!=)|\+\+|--|\+=|-=)/.test(bodyMasked), '…and neither is the target of an assignment');
  eq(bodyMasked.indexOf('S.marketRegime') > bodyMasked.indexOf('function regimeHTML'), true,
    '…each inside the function body and not in the signature, so `S` is read when the function is called');
  eq(refSites(MASKED, STATE_BINDING).filter((at) => at < RAW_AT_IN_CODE).length > 0, true, 'control — `S` is named elsewhere in the monolith, so the count of 2 above is the block\'s own and not every mention in the file');
}
// WHAT RUNS AT LOAD. Nothing: the block holds one function declaration and no statement.
{
  const load = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(load.reads, EVALUATION_TIME_READS, 'it reads nothing at evaluation time');
  eq(load.stmtLines, TOP_LEVEL_STATEMENT_LINES, '…and runs no top-level statement line: one function declaration only');
  ok(runsNothingAtLoad(load), '…so it runs NOTHING at load, which the screen filters on');
  const bodyMasked = MASKED.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq((bodyMasked.match(/\bdelete\b/g) || []).length, 0, '…it contains no `delete`, the write the assignment scans cannot see…');
  eq((bodyMasked.match(/\b(await|yield|this)\b/g) || []).length, 0, '…no await, no yield and no `this`…');
  eq((bodyMasked.match(/\bnew\s+\w+/g) || []).map((x) => x.replace(/\s+/g, ' ')), ['new Date'], '…one `new`, the Date it builds from the VIX timestamp…');
  eq((bodyMasked.match(/\b(globalThis|self|window|document|localStorage|console|setTimeout|setInterval|fetch)\b/g) || []).length, 0,
    '…and no window, document, storage, console, timer or fetch');
  eq(hostGlobalMentions(BODY), HOST_GLOBAL_MENTIONS, '…HOST_GLOBAL_MENTIONS mentions of window, globalThis, self or document in all');
  eq((bodyMasked.match(/\btoLocaleTimeString\b/g) || []).length, 2, 'the only host-dependent calls are the two `toLocaleTimeString`, whose output depends on the locale of the machine it runs on');
}
{
  const split = outboundSplit(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND, 'it references NO chain module: CHAIN_OUTBOUND');
  eq(split.foundation, FOUNDATION_OUTBOUND, '…and FOUNDATION_OUTBOUND foundation module references, so byConsumerSplit leaves nothing out…');
  eq(byConsumerSplit(REC, split), BY_CONSUMER_SPLIT, '…and is BY_CONSUMER_SPLIT, the same as byConsumer');
}
// THE OUTBOUND DIRECTION, measured a second time by a different means. A region that declares no top-level
// `var` scores a perfect zero inbound while writing globals it does not own, so the profile's answer is not
// left standing alone.
{
  eq(nonLocalAssignmentsUncorrected(BODY), UNCORRECTED_SCAN_NAMES,
    'the inherited scan reports UNCORRECTED_SCAN_NAMES, assignments to names it takes for globals: none…');
  eq(nonLocalAssignmentsIn(BODY).length, NON_LOCAL_ASSIGNMENTS,
    '…and the corrected scan finds NON_LOCAL_ASSIGNMENTS assignments to anything the block does not own');
  // CONTROLS: both scans DO find a planted violation, so a zero is a measurement and not a function returning zero.
  eq(nonLocalAssignmentsIn('function f() { var a = 1, b = 2; leaked = 2; g.x = 3; a = 4; b = 5; }'), ['leaked', 'g'],
    'control — the corrected scan finds a plain write and a property write, and ignores BOTH locals of a var list');
  eq(nonLocalAssignmentsUncorrected('function f() { var a = 1, b = 2; b = 5; }'), ['b', 'b'],
    'control — the inherited scan reads the second declarator of that list as a global, twice: its own initialiser and the later write');
  eq(nonLocalAssignmentsIn('function f(p) { var found = []; found.n = 1; shared.y = 2; }'), ['shared'],
    'control — a property write on a local is ignored and a property write on a name the block does not own is found');
  eq(nonLocalAssignmentsIn('function f() { S.marketRegime = 1; }'), ['S'],
    'control — a write THROUGH `S`, the state object this block reads, is found: the zero above is not blind to the one name that matters here');
  eq(hostGlobalMentions('function f() { window.x = 1; document.y = 2; }'), 2,
    'control — the host-global scan finds two planted mentions');
}

// ─────────────────────────────────────────────────────────────────────
section('4. THE FINDING: no row scores below 3, three openings tie at (3, 3), and the length alone orders them');
// ─────────────────────────────────────────────────────────────────────
// WHAT THE PREVIOUS CONTRACT PUBLISHED, read out of it.
const prevText = fs.readFileSync(path.join(ROOT, PREVIOUS_CONTRACT), 'utf8');
const listOf = (name) => prevText.match(new RegExp('^const ' + name + ' = \\[([\\s\\S]*?)^\\];', 'm'))[1]
  .split('\n').map((l) => l.trim()).filter((l) => l.startsWith('['))
  .map((l) => JSON.parse(l.replace(/,$/, '').replace(/'/g, '"')));
const prevNum = (name) => Number(prevText.match(new RegExp('^const ' + name + ' = (\\d+);$', 'm'))[1]);
{
  eq(prevNum('RAW_CHARS'), PREVIOUS_RAW_CHARS, 'the cut that left was PREVIOUS_RAW_CHARS units raw…');
  eq(prevNum('RAW_AT_IN_CODE'), PREVIOUS_RAW_AT, '…opening at PREVIOUS_RAW_AT…');
  ok(PREVIOUS_RAW_AT > RAW_AT_IN_CODE,
    '…and it sat entirely AFTER this block, so everything this contract measures before it did not move, and everything after it moved UP by exactly that many units, as read from the rows below');
  const listed = listOf('RUNNERS_UP');
  eq(listed, PREVIOUS_RUNNERS_UP, 'the previous contract published exactly PREVIOUS_RUNNERS_UP…');
  eq(listed[0], [RAW_AT_IN_CODE, BY_CONSUMER_SPLIT, FULL_NINE, BODY_CHARS],
    '…the FIRST of them being THIS block\'s row, at the same opening, with the same byConsumerSplit and raw nine and a length of BODY_CHARS: nothing about it changed, and it was the head of a three-way tie then as it is now…');
  eq(listed.slice(1).filter((r) => r[0] > PREVIOUS_RAW_AT).map((r) => r[0] - PREVIOUS_RAW_CHARS),
    [RUNNERS_UP[0][0], RUNNERS_UP[1][0]],
    '…two of the other three sitting AFTER that cut and moved up by PREVIOUS_RAW_CHARS into this contract\'s first and second runners-up…');
  eq(listed.slice(1).filter((r) => r[0] < PREVIOUS_RAW_AT).map((r) => r[0]), [RUNNERS_UP[2][0]],
    '…and one before it, which did not move: the third of this contract\'s');
  ok(listed.every((r) => r[0] !== RUNNERS_UP[3][0]),
    '…the fourth of this contract\'s runners-up being a row the previous contract did not list');
  // THE BEST TIER the previous contract recorded had ONE row: the cut that shipped.
  eq(listOf('BEST_TIER_ROWS').map((r) => r[3]), [prevNum('BY_CONSUMER_SPLIT')],
    'the best tier the previous contract recorded was ONE row, at its byConsumerSplit, and that row is the cut that shipped…');
  ok(prevNum('BY_CONSUMER_SPLIT') < BY_CONSUMER_SPLIT,
    '…whose score, ' + 2 + ', is BELOW the best this base can offer: the tier left with the cut, which is why this base starts a tier lower');
}
// THE TIER, MEASURED ON THIS BASE, in the two enumerations it can be counted in.
{
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) <= BY_CONSUMER_SPLIT - 1).length, SCORE_TWO_OR_BELOW,
    'the shipped screen counts SCORE_TWO_OR_BELOW clean candidates at 2 or below…');
  eq(hiddenRows.length, HIDDEN_ROWS, 'the pass over runs the screen skipped for being short has HIDDEN_ROWS rows…');
  const hiddenClean = hiddenRows.filter((c) => runsNothingAtLoad(c.load));
  eq(hiddenClean.length, HIDDEN_CLEAN_ROWS, '…HIDDEN_CLEAN_ROWS of which run nothing at load');
  ok(hiddenRows.every((c) => c.unitsDecl < RUN_FLOOR && c.unitsDoc >= RUN_FLOOR),
    '…every one below RUN_FLOOR from its declaration and at or above it from its documentation');
  ok(hiddenRows.every((c) => !candidateRuns.some((s) => s.lo === c.lo && s.hi === c.hi)),
    '…and not one of them is a row the shipped screen already has');
  eq(hiddenClean.filter((c) => c.bcs <= BY_CONSUMER_SPLIT - 1).length, HIDDEN_SCORE_TWO_OR_BELOW,
    'HIDDEN_SCORE_TWO_OR_BELOW of them score 2 or below on byConsumerSplit: neither enumeration holds a row below 3…');
  const rows = cleanRuns.map((c) => ({ lo: c.lo, hi: c.hi, bcs: byConsumerSplit(c.p, c.split), nine: c.p.nine, units: c.units, c }))
    .concat(hiddenClean.map((c) => ({ lo: c.lo, hi: c.hi, bcs: c.bcs, nine: c.nine, units: c.unitsDoc, c })));
  eq(rows.filter((r) => r.bcs < BY_CONSUMER_SPLIT).length, 0,
    '…so in the screen and the pass together NOT ONE row scores below BY_CONSUMER_SPLIT on byConsumerSplit, which is the best score there is…');
  const atBest = rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT);
  eq(atBest.length, ROWS_AT_THREE, 'and BY_CONSUMER_SPLIT is held by ROWS_AT_THREE rows over the two enumerations…');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_SCREEN,
    '…ROWS_AT_THREE_SCREEN of them in the shipped screen…');
  eq(hiddenClean.filter((c) => c.bcs === BY_CONSUMER_SPLIT).length, ROWS_AT_THREE_HIDDEN, '…and ROWS_AT_THREE_HIDDEN in the pass over sub-floor runs…');
  eq(Math.min.apply(null, atBest.map((r) => r.nine)), LOWEST_NINE_AT_THREE,
    '…the lowest raw nine among them being LOWEST_NINE_AT_THREE, which is this block\'s FULL_NINE: nothing at the best score has a lower one…');
  // THE TIE, pinned in full: every row at the best score AND the lowest raw nine.
  const tied = atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .map((r) => [r.lo, r.hi, r.units, consumersOf(r.c.p).length, r.c.p.deps.length])
    .sort((a, b) => a[2] - b[2] || a[0] - b[0] || a[1] - b[1]);
  eq(tied, TIED_AT_BEST, '…and the rows at (BY_CONSUMER_SPLIT, LOWEST_NINE_AT_THREE) are exactly TIED_AT_BEST, three of them, this block the SHORTEST…');
  eq(new Set(tied.map((r) => r[0])).size, tied.length, '…at three distinct openings, so no opening holds two of them…');
  ok(tied[1][0] < tied[1][1] && tied[2][1] === tied[1][1] && tied[2][0] < tied[1][0],
    '…the second and third sharing a closing, the second wholly inside the third: they are the SAME function with and without the one above it, not two unrelated places…');
  // THE TIE IS NOT AN EQUALITY OF THE PARTS. The three rows total the same raw nine from different directions, which is the honest limit of the ranking key.
  eq(tied.map((r) => r[3] + r[4]), [2, 3, 3],
    '…and the three are NOT equal on the parts: consumers plus dependencies is 2 for this block and 3 for each of the others…');
  eq(atBest.filter((r) => r.nine === LOWEST_NINE_AT_THREE)
    .sort((x, y) => x.units - y.units || x.lo - y.lo || x.hi - y.hi).map((r) => r.c.p.sib), [1, 0, 0],
  '…this block spending the third of its nine on a sibling-module reference and the other two on none');
  ok(tied.map((r) => r[3] + r[4]).some((x) => x !== tied[0][3] + tied[0][4]),
    '…so the order within the tie is decided by LENGTH, which the published key (byConsumerSplit, raw nine, units ascending) puts last, and by nothing else');
  // THE NEXT SCORE, counted the same way, so "no row below" means something: the rows one step behind.
  eq(rows.filter((r) => r.bcs === BY_CONSUMER_SPLIT + 1).length > 0, true,
    'control — rows DO exist one step behind at ' + (BY_CONSUMER_SPLIT + 1) + ', so the zero below ' + BY_CONSUMER_SPLIT + ' is a measurement and not a screen that returns nothing');
  // WHAT IS PUBLISHED FOR THE NEXT CYCLE, over the screen and the hidden pass
  // together, skipping anything that overlaps the cut.
  const overlaps = (lo, hi) => lo < RAW_END_IN_CODE && hi > RAW_AT_IN_CODE;
  const pool = rows.filter((r) => !overlaps(r.lo, r.hi));
  const bestPer = new Map();
  for (const r of pool) {
    const b = bestPer.get(r.lo);
    if (!b || r.bcs < b.bcs || (r.bcs === b.bcs && (r.nine < b.nine || (r.nine === b.nine && r.units > b.units)))) bestPer.set(r.lo, r);
  }
  const ranked = [...bestPer.values()].sort((a, b) => a.bcs - b.bcs || a.nine - b.nine || a.units - b.units)
    .slice(0, RUNNERS_UP.length).map((r) => [r.lo, r.bcs, r.nine, r.units]);
  eq(ranked, RUNNERS_UP,
    'the four best other openings, by (byConsumerSplit, nine, units), are exactly RUNNERS_UP');
  ok(ranked.every((r) => r[1] === BY_CONSUMER_SPLIT), '…every one of them at ' + BY_CONSUMER_SPLIT + ', the same score as this block: none is better');
}

// ───────────────────────────────────────────────────────────────────────────
section('5. What taking more or less would cost: nothing above, one owner below and refused, the one run, the region and its banner');
// ───────────────────────────────────────────────────────────────────────────
const REGION = REGIONS.filter((r) => RAW_AT_IN_CODE >= r.start && RAW_AT_IN_CODE < r.end)[0];
const REGION_OWNER_LIST = DECLS.filter((d) => d.start >= REGION.start && d.end < REGION.end);
const OWNERS_UP = REGION_OWNER_LIST.slice(0, OWNER_POSITION - 1).reverse();
const OWNERS_DOWN = REGION_OWNER_LIST.slice(OWNER_POSITION - 1 + OWNER_COUNT);
const downEnd = (d) => snapBodyEnd(CODE, RAW_AT_IN_CODE, CODE.indexOf('\n', d.end) + 1);
eq(REGION_OWNER_LIST.findIndex((d) => d.name === OWNER) + 1, OWNER_POSITION, 'the cut opens on owner number OWNER_POSITION of its region…');
eq(REGION_OWNER_LIST.slice(OWNER_POSITION - 1, OWNER_POSITION - 1 + OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
  '…and takes the next OWNER_COUNT, which is its one: the FIRST owner of its region, with nothing above it and an owner below');
// NOTHING ABOVE IT IN THE REGION: it is the first owner, so extending upward would cross the banner into another region.
eq(OWNERS_UP.length, OWNERS_ABOVE, 'the region holds OWNERS_ABOVE owners above the cut, so there is nothing above to take…');
eq(EXTENSIONS_UP, [], '…and no row to price: the pinned list is empty, and the control below shows the pricing is not a function returning nothing');
eq(REGION.start, RAW_AT_IN_CODE, '…the region opening exactly where the cut does, at the banner');
{
  // CONTROL: the same slicing, for a cut that opened on owner number 2 of this region, finds the one owner above it,
  // so an empty list above is the position of THIS cut and not a slice that returns nothing.
  eq(REGION_OWNER_LIST.slice(0, 2 - 1).reverse().map((d) => d.name), [OWNER],
    'control — had the cut opened on owner number 2, the same slicing would find exactly one owner above it: ' + OWNER);
}
// THE ONE OWNER BELOW IT IN THE REGION, priced as the cut extended down to the end of that owner, and REFUSED.
eq(OWNERS_DOWN.length, OWNERS_BELOW, 'the region holds OWNERS_BELOW owner below the block…');
{
  const d = OWNERS_DOWN[0];
  const hb = downEnd(d);
  eq(d.name, EXTENSIONS_DOWN[0][0], '…' + EXTENSIONS_DOWN[0][0] + '…');
  let refusal = null;
  try { assertSeam(CODE, RAW_AT_IN_CODE, hb); } catch (e) { refusal = e.message; }
  eq(refusal, EXTENSIONS_DOWN[0][1],
    '…and the cut extended to the end of it is REFUSED by the seam rule with EXTENSIONS_DOWN\'s error: its body is followed directly by a `// ═══` header with no blank line between, so there is no structural separator…');
  eq(CODE.slice(hb - 2, hb + 6), '}\n// ═══', '…the closing brace and the header on the very next line, read from the source');
  eq(refusal === null ? 1 : 0, DOWN_LEGAL, '…DOWN_LEGAL legal seams below, therefore: the pricing of the cut\'s extension is a refusal and not a score');
  eq(OWNERS_DOWN.length - DOWN_LEGAL, DOWN_REFUSED, '…and DOWN_REFUSED owner refused');
  // The same thing seen from the screen: it enumerates no run that opens at the banner except the cut itself.
  eq(candidateRuns.filter((c) => c.lo === RAW_AT_IN_CODE).map((c) => c.units), [BODY_CHARS],
    '…and the shipped screen enumerates exactly ONE run that opens at the banner, the cut, the extension having been rejected as a seam');
  // CONTROL: the refusal is the seam rule\'s, not a property of every extension: a run that ends at a blank line is accepted.
  ok(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE) === RAW_END_IN_CODE,
    'control — the cut itself, which ends at a blank line, is accepted by the same call');
  // THE LAST OWNER BELOW ENDS THE REGION, so taking it is taking the whole region.
  const whole = profileOf([REGION.start, REGION.end]);
  eq(REGION.end - 1 <= CODE.indexOf('\n', d.end) + 1, true, 'the owner below is the last in the region, so taking it would be taking the whole region…');
  eq([whole.nine, byConsumerSplit(whole, outboundSplit(REGION.start, REGION.end))], [WHOLE_REGION_NINE, WHOLE_REGION_BCS],
    '…which would score WHOLE_REGION_NINE on the raw nine and WHOLE_REGION_BCS on byConsumerSplit: worse than the cut on both, for what it is worth, were it a legal seam');
}
// THE ONE RUN the single owner makes. A function alone is one run, and it is the cut.
const CLUSTER = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
const AFTER_CLUSTER = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
const ownRun = (i, j) => {
  const lo = i === 0 ? RAW_AT_IN_CODE : (blockAbove(CLUSTER[i]) || { start: CLUSTER[i].start }).start;
  const limit = j + 1 < CLUSTER.length ? CLUSTER[j + 1].start : AFTER_CLUSTER.start;
  const be = snapBodyEnd(CODE, lo, limit);
  let seam = null, refusal = null;
  try { seam = assertSeam(CODE, lo, be); } catch (e) { refusal = e.message; }
  return { lo, be, units: be - lo, seam, refusal };
};
{
  const measured = [];
  for (let i = 0; i < CLUSTER.length; i++) {
    for (let j = i; j < CLUSTER.length; j++) {
      const r = ownRun(i, j);
      if (r.refusal) { measured.push([CLUSTER[i].name, CLUSTER[j].name, r.lo, r.be, r.units, 'REFUSED', r.refusal]); continue; }
      const p = profileOf([r.lo, r.be]);
      measured.push([CLUSTER[i].name, CLUSTER[j].name, r.lo, r.be, r.units, p.nine, byConsumerSplit(p, outboundSplit(r.lo, r.be)), p.deps, p.inbound]);
    }
  }
  eq(measured, OWN_RUNS, 'the one owner makes exactly the one run OWN_RUNS');
  eq(measured.filter((r) => r[5] === 'REFUSED').length, OWN_RUNS_REFUSED, '…OWN_RUNS_REFUSED of them refused by the seam rule…');
  eq(measured.filter((r) => r[5] !== 'REFUSED').length, OWN_RUNS_LEGAL, '…and OWN_RUNS_LEGAL of them a real seam…');
  eq(measured.filter((r) => r[4] < RUN_FLOOR).length, OWN_RUNS_UNDER_FLOOR, '…OWN_RUNS_UNDER_FLOOR of them under RUN_FLOOR, the cut clearing it…');
  eq(candidateRuns.filter((c) => c.lo >= RAW_AT_IN_CODE && c.hi <= BODY_END_IN_CODE).map((c) => [c.lo, c.hi]), [[RAW_AT_IN_CODE, BODY_END_IN_CODE]],
    '…and the shipped screen enumerating exactly ONE run inside the block, the cut itself');
}
// THE BANNER REGION it sits inside. The dead rule "never cut inside a banner region" would forbid cutting any of
// it. This cut is the FIRST of two owners of a region: it takes the banner with it, and what it leaves is
// one owner that no longer has a banner of its own.
{
  const reg = REGION;
  eq(reg.start, REGION_AT, 'the region opens at REGION_AT, where the cut does');
  eq(reg.end, REGION_END, '…and ends at REGION_END, below it');
  eq(reg.end - reg.start, REGION_CHARS, '…REGION_CHARS units');
  ok(lineAt(reg.start).startsWith(BANNER_LINE_PREFIX), '…opening on the BANNER_LINE_PREFIX banner…');
  eq(REGION_OWNER_LIST.length, REGION_OWNERS, '…and holding REGION_OWNERS owners');
  const whole = profileOf([reg.start, reg.end]);
  const wsplit = outboundSplit(reg.start, reg.end);
  eq(whole.nine, WHOLE_REGION_NINE, 'taking the whole region scores WHOLE_REGION_NINE on the raw nine');
  eq(byConsumerSplit(whole, wsplit), WHOLE_REGION_BCS, '…WHOLE_REGION_BCS on byConsumerSplit');
  eq(consumersOf(whole).length, WHOLE_REGION_CONSUMERS, '…WHOLE_REGION_CONSUMERS consumers');
  eq(whole.deps.length, WHOLE_REGION_DEPS, '…WHOLE_REGION_DEPS monolith dependency');
  eq(whole.sib, WHOLE_REGION_SIB, '…and WHOLE_REGION_SIB sibling module');
  // WHAT THE CUT LEAVES BEHIND. The banner goes with the block, so the owner left in the region loses its heading.
  const clean = CODE.slice(0, RAW_AT_IN_CODE) + CODE.slice(RAW_END_IN_CODE);
  const regionsOf = (text) => {
    const marks = topLevelBanners(text, functionBodyRanges(text)).slice().sort((a, b) => a - b);
    const decls = scanTopLevelDeclarations(text);
    const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : text.length }));
    const out = [];
    for (let i = 0; i < raw.length; i++) {
      let r = raw[i];
      while (i + 1 < raw.length &&
        !text.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
        r = { start: r.start, end: raw[i + 1].end }; i++;
      }
      out.push(r);
    }
    return { marks, decls, regions: out.filter((x) => decls.some((d) => d.start >= x.start && d.end < x.end)) };
  };
  const before = regionsOf(CODE), after = regionsOf(clean);
  eq([before.marks.length, after.marks.length], [BANNER_MARKS, BANNER_MARKS_AFTER_CUT],
    'the cut takes ONE banner with it: the document\'s top-level banners go from BANNER_MARKS to BANNER_MARKS_AFTER_CUT…');
  eq([before.regions.length, after.regions.length], [OWNER_REGIONS, REGIONS_AFTER_CUT],
    '…and its owner regions from OWNER_REGIONS to REGIONS_AFTER_CUT…');
  const above = before.regions.filter((r) => r.end === reg.start)[0];
  eq(above.start, REGION_ABOVE_AT, '…the region directly above it opening at REGION_ABOVE_AT…');
  ok(lineAt(above.start).startsWith(REGION_ABOVE_BANNER_PREFIX), '…on the REGION_ABOVE_BANNER_PREFIX banner…');
  eq(before.decls.filter((d) => d.start >= above.start && d.end < above.end).length, REGION_ABOVE_OWNERS, '…and holding REGION_ABOVE_OWNERS owners before the cut…');
  const aboveAfter = after.regions.filter((r) => r.start === REGION_ABOVE_AT)[0];
  eq(after.decls.filter((d) => d.start >= aboveAfter.start && d.end < aboveAfter.end).length, REGION_ABOVE_OWNERS + LEFT_OWNERS.length,
    '…and that many plus the owner left behind after the cut');
  eq(after.decls.filter((d) => d.start >= aboveAfter.start && d.end < aboveAfter.end).slice(-LEFT_OWNERS.length).map((d) => d.name), LEFT_OWNERS,
    '…the last of them being exactly LEFT_OWNERS: macdLabel, now under that banner');
  ok(!clean.includes(DOC_FIRST_LINE), '…the banner of the cut block appearing nowhere in what remains');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and what it counts');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
{
  // THE CUT THAT SHIPPED CHANGED THE SCREEN, and the screen GREW: the figures measured here less the
  // figures the previous contract pinned.
  eq([RAW_RUNS - prevNum('RAW_RUNS'), SEAM_REJECTED - prevNum('SEAM_REJECTED'), CANDIDATES - prevNum('CANDIDATES'),
    CLEAN_CANDIDATES - prevNum('CLEAN_CANDIDATES')], [DELTA_RAW_RUNS, DELTA_SEAM_REJECTED, DELTA_CANDIDATES, DELTA_CLEAN],
  '…against the previous contract\'s figures the shipped cut CHANGED the screen by DELTA_RAW_RUNS raw runs, DELTA_SEAM_REJECTED seam rejections, DELTA_CANDIDATES candidates and DELTA_CLEAN clean candidates — positive, so the screen GREW');
  // WHY, for the raw runs, which can be derived: a region of n owners makes n(n+1)/2 runs. That cut took its region's
  // banner, so the owners it left behind joined the region above, and two regions of runs became one.
  const tri = (n) => n * (n + 1) / 2;
  const above = prevNum('REGION_ABOVE_OWNERS'), own = prevNum('REGION_OWNERS'), left = own - prevNum('OWNER_COUNT');
  eq(tri(above + left) - tri(above) - tri(own), DELTA_RAW_RUNS,
    '…and the raw-run growth is exactly what that merge predicts: one region of ' + (above + left) + ' owners makes ' + tri(above + left) + ' runs where regions of ' + above + ' and ' + own + ' made ' + (tri(above) + tri(own)) + ', a difference of DELTA_RAW_RUNS');
  ok(DELTA_RAW_RUNS > 0 && DELTA_CANDIDATES > 0,
    '…the candidate counts growing with it, which this contract measures and does not derive');
}
ok(DECLS.some((d) => d.start === DECL_AT_IN_CODE), 'the declaration opening is a declaration start…');
eq(candidateRuns.filter((c) => c.lo === DECL_AT_IN_CODE).length, 0,
  '…and the screen enumerates NO run that opens there: the first owner of a region is measured from the region\'s start, so every run that includes this block opens at the banner instead');

// ─────────────────────────────────────────────────────────────────────
section('7. The SHIPPED module loads with nothing defined, `S` is read at call time, and the markup, the colours and the failures are measured');
// ─────────────────────────────────────────────────────────────────────
{
  const lines = BODY.split('\n');
  lines.pop();
  eq(lines.length, SPLIT_LINES, 'the body is SPLIT_LINES lines');
  eq(lines.filter((l) => l.trim() && !l.trim().startsWith('//')).length, CODE_LINES, '…CODE_LINES of code');
  eq(lines.filter((l) => l.trim().startsWith('//')).length, COMMENT_LINES, '…COMMENT_LINES comment');
  eq(lines.filter((l) => !l.trim()).length, BLANK_LINES, '…and BLANK_LINES blank');
  eq(CODE_LINES + COMMENT_LINES + BLANK_LINES, SPLIT_LINES,
    '…the three summing to SPLIT_LINES, so none is unaccounted for');
}
{
  // THE MARKUP, restated in pieces and each piece tied to the source: every literal below occurs in the body exactly once,
  // so the table that follows is checked against the bytes and not against a memory of them.
  const OPEN = '<div style="background:var(--bg3);border:1px solid var(--b1);border-radius:8px;padding:10px 12px;margin-bottom:10px">';
  const TITLE = '<div class="ptitle" style="margin-bottom:4px">MARKET REGIME</div>';
  const LABEL_A = '<div style="font-size:13px;font-family:var(--M);font-weight:700;color:';
  const LABEL_B = ';letter-spacing:.03em;margin-bottom:4px">';
  const SRC_A = '<div style="font-size:8px;font-family:var(--M);color:var(--tx3)">Source: ';
  const VF_A = '<div style="font-size:9px;font-family:var(--M);margin-top:6px;padding-top:6px;border-top:1px solid var(--b1)">';
  const CELL_A = '<span style="margin-right:10px"><span style="color:var(--tx3)">';
  const CELL_DASH = '<span style="color:var(--tx3)">—</span>';
  const VF_T_A = '<span style="color:var(--tx3);font-size:8px">· ';
  const DISC = '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-top:4px;font-style:italic">Context only — validate each underlying setup separately.</div>';
  const FRAGMENTS = [OPEN, TITLE, LABEL_A, LABEL_B, SRC_A, VF_A, CELL_A, CELL_DASH, VF_T_A, DISC];
  ok(FRAGMENTS.every((f) => count(BODY, f) === 1),
    'every one of the ' + FRAGMENTS.length + ' markup fragments the table below is built from occurs in the body exactly once');
  eq(FRAGMENTS.join('').match(/[^\x00-\x7F]/g).length, 3,
    '…three of the NON_ASCII_IN_STRINGS non-ASCII characters inside the returned strings among them (the dash in the cell, the dot in the time and the dash in the disclaimer)');
  eq(count(BODY, "' · '"), 1, '…the fourth being the dot in `\' · \'`, the separator between the source and the time');

  const mkCtx = (globals) => {
    const c = vm.createContext(Object.assign(Object.create(null), globals || {}));
    vm.runInContext(MODULE, c);
    return c;
  };
  const bare = vm.createContext(Object.create(null));
  vm.runInContext(MODULE, bare);
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(),
    'it LOADS in a completely bare VM with nothing defined, and declares exactly its one owner');
  eq(vm.runInContext(OWNER + '.constructor.name', bare), 'Function', '…an ordinary synchronous function');
  eq(vm.runInContext(OWNER + '.length', bare), 0, '…taking no arguments');
  {
    let err = null;
    try { vm.runInContext(OWNER + '()', bare); } catch (e) { err = e.name; }
    eq(err, 'ReferenceError', '…and CALLING it there throws ReferenceError, because `S` is not defined: loading needs nothing, calling needs `S`');
  }

  // A stub Date and a stub clock that record every call: the time the markup shows depends on the machine's locale.
  const CLOCK_ARGS = JSON.stringify([[], { hour: '2-digit', minute: '2-digit' }]);
  const harness = (state, vfTime) => {
    const rec = { reads: [], writes: [], dates: [], times: [] };
    const S = new Proxy(state, {
      get(t, k) { if (typeof k === 'string') rec.reads.push(k); return t[k]; },
      set(t, k, v) { rec.writes.push(['set', String(k)]); t[k] = v; return true; },
      defineProperty(t, k, d) { rec.writes.push(['define', String(k)]); return Reflect.defineProperty(t, k, d); },
      deleteProperty(t, k) { rec.writes.push(['delete', String(k)]); return delete t[k]; },
    });
    class FakeDate {
      constructor(v) { rec.dates.push(v); this.v = v; }
      toLocaleTimeString(loc, o) { rec.times.push(['vf', JSON.stringify([loc, o])]); return vfTime === undefined ? 'V' + this.v : vfTime; }
    }
    const c = mkCtx({ S, Date: FakeDate });
    return { rec, c, state, run: () => vm.runInContext('regimeHTML()', c) };
  };
  const clock = (rec, text) => ({ toLocaleTimeString(loc, o) { rec.times.push(['regime', JSON.stringify([loc, o])]); return text; } });
  const labelDiv = (color, label) => LABEL_A + color + LABEL_B + label + '</div>';
  const srcDiv = (src, time) => SRC_A + src + (time ? ' · ' + time : '') + '</div>';
  const cell = (label, val) => CELL_A + label + '</span> ' + (val != null ? '<strong>' + val.toFixed(2) + '</strong>' : CELL_DASH) + '</span>';
  const vfDiv = (a, b, c2, d, t) => VF_A + cell('VIX', a) + cell('9D', b) + cell('3M', c2) + cell('6M', d) + (t ? VF_T_A + t + '</span>' : '') + '</div>';
  const card = (label, src, vf) => OPEN + TITLE + label + (src || '') + (vf || '') + DISC + '</div>';
  const EMPTY_LABEL = labelDiv('var(--tx2)', 'Run scan to detect');

  // THE EMPTY STATE: no regime and no VIX family.
  {
    const h = harness({ marketRegime: null, vixFamily: null });
    const out = h.run();
    eq(out, card(EMPTY_LABEL),
      'with no regime and no VIX family the function returns EXACTLY the card with the label `Run scan to detect` in `var(--tx2)`, no source line, no VIX row and the disclaimer, byte for byte');
    eq(h.rec.reads, STATE_READS, '…reading from `S` exactly STATE_READS, once each and in that order, and nothing else…');
    eq(h.rec.writes, [], '…writing nothing to it…');
    eq([h.rec.dates, h.rec.times], [[], []], '…and building no Date and asking for no time: neither source of one is present');
    eq(h.run(), out, '…and a second call returns the same string, the function being a pure function of `S`');
    eq(Object.getOwnPropertyNames(h.c).sort(), ['Date', 'S', OWNER].sort(), '…and it defines no global in the VM it runs in');
    eq(vm.runInContext('typeof vfCell', h.c), 'undefined', '…the inner function `vfCell` not leaking out of it');
    ok(out.startsWith('<div') && out.endsWith('</div>'), '…one element');
  }
  // READ AT CALL TIME: replacing the state after load changes the answer, both the object and its fields.
  {
    const h = harness({ marketRegime: null, vixFamily: null });
    const before = h.run();
    h.state.marketRegime = { volatility: 'LOW', label: 'Calm', ivrSource: 'TASTYTRADE' };
    const after = h.run();
    ok(before !== after && after.indexOf(labelDiv('var(--bl)', 'Calm')) > 0,
      '`S` is read at CALL time: setting a regime on the state object after load changes the next answer');
    const other = { marketRegime: { label: 'Other' }, vixFamily: null };
    h.c.S = other;
    ok(vm.runInContext('regimeHTML()', h.c).indexOf(labelDiv('var(--tx2)', 'Other')) > 0,
      '…and so does rebinding the global `S` to a different object entirely');
  }

  // THE COLOUR OF EACH VOLATILITY, and the source.
  {
    const colour = (vol) => harness({ marketRegime: { volatility: vol, label: 'L', ivrSource: 'TASTYTRADE' }, vixFamily: null }).run().match(/font-weight:700;color:([^;]+);/)[1];
    const TABLE = [['LOW', 'var(--bl)'], ['NORMAL', 'var(--tx2)'], ['HIGH', 'var(--am)'], ['ELEVATED', 'var(--rd)'],
      ['', 'var(--tx2)'], [undefined, 'var(--tx2)'], [null, 'var(--tx2)'], ['low', 'var(--tx2)'], ['EXTREME', 'var(--tx2)']];
    eq(TABLE.map(([v]) => colour(v)), TABLE.map(([, w]) => w),
      'the colour is `var(--bl)`, `var(--tx2)`, `var(--am)`, `var(--rd)` for LOW, NORMAL, HIGH, ELEVATED and `var(--tx2)` for anything else — lower case, empty, missing and null included');
    eq([colour('toString'), colour('constructor')], ['function toString() { [native code] }', 'function Object() { [native code] }'],
      'a volatility named after an INHERITED property of Object is not caught by the `||` fallback: the colour map is an object literal, so `toString` and `constructor` resolve to the inherited functions and their SOURCE TEXT lands in the style attribute — a latent quirk of the bytes, which a byte-exact move preserves and does not fix');
    eq(new Set(TABLE.map(([, w]) => w)).size, 4, '…four distinct colours in the table, so it is not a table of one answer');
    const src = (v) => harness({ marketRegime: { label: 'L', ivrSource: v }, vixFamily: null }).run().match(/Source: ([A-Z_]+)/)[1];
    eq(['TASTYTRADE', 'tastytrade', '', undefined, null, 'YAHOO'].map(src),
      ['TASTYTRADE', 'TASTYTRADE_UNAVAILABLE', 'TASTYTRADE_UNAVAILABLE', 'TASTYTRADE_UNAVAILABLE', 'TASTYTRADE_UNAVAILABLE', 'TASTYTRADE_UNAVAILABLE'],
      'the source line reads TASTYTRADE for exactly the string `TASTYTRADE` and TASTYTRADE_UNAVAILABLE for everything else, case included');
  }

  // A FULL REGIME, then each part alone.
  {
    const h = harness({ marketRegime: { volatility: 'HIGH', label: 'Risk-off', ivrSource: 'TASTYTRADE' }, vixFamily: null });
    h.state.marketRegime.computedAt = clock(h.rec, '10:30');
    eq(h.run(), card(labelDiv('var(--am)', 'Risk-off'), srcDiv('TASTYTRADE', '10:30')),
      'a regime with volatility HIGH, a label, the TASTYTRADE source and a clock gives EXACTLY the card with `var(--am)`, `Risk-off` and `Source: TASTYTRADE · 10:30`, byte for byte');
    eq(h.rec.times, [['regime', CLOCK_ARGS]],
      '…asking the clock for its time ONCE, with an empty locale list and `{hour:\'2-digit\',minute:\'2-digit\'}`, and nothing else');
    eq(h.rec.dates, [], '…and building no Date: the regime\'s own time comes from the object it carries, not from `new Date`');
    const withClock = (computedAt) => harness({ marketRegime: { label: 'L', ivrSource: 'TASTYTRADE', computedAt }, vixFamily: null }).run();
    const plain = card(labelDiv('var(--tx2)', 'L'), srcDiv('TASTYTRADE', ''));
    eq([null, undefined, 0, '', false].map((v) => withClock(v) === plain), [true, true, true, true, true],
      'a falsy computedAt (null, undefined, 0, "" or false) leaves the time and its separator out entirely');
    eq(withClock({ toLocaleTimeString() { return ''; } }) === plain, true,
      'and a clock that answers an empty string leaves the separator out as well: the test is on the TEXT, not on the object');
    eq([{}, 'x', 5, []].map((bad) => { try { withClock(bad); return null; } catch (e) { return e.name; } }), ['TypeError', 'TypeError', 'TypeError', 'TypeError'],
      'a truthy computedAt with no toLocaleTimeString ({}, a string, a number, an array) THROWS TypeError out of the function: nothing in it catches');
    ok(harness({ marketRegime: { label: '<b>x</b> & "y"', ivrSource: 'TASTYTRADE' }, vixFamily: null }).run().indexOf(labelDiv('var(--tx2)', '<b>x</b> & "y"')) > 0,
      'the label is inserted RAW: markup and quotes in it reach the string unescaped');
    ok(harness({ marketRegime: {}, vixFamily: null }).run().indexOf(labelDiv('var(--tx2)', 'undefined')) > 0,
      'a regime object with no label shows the text `undefined`…');
    ok(harness({ marketRegime: {}, vixFamily: null }).run().indexOf(SRC_A + 'TASTYTRADE_UNAVAILABLE</div>') > 0,
      '…and the source line appears for ANY truthy regime, even an empty object, since it is `r?…:\'\'`');
    eq([0, '', false, null, undefined].map((v) => harness({ marketRegime: v, vixFamily: null }).run().indexOf(SRC_A)), [-1, -1, -1, -1, -1],
      'while a falsy regime of any kind gives no source line and the empty-state label');
  }

  // THE VIX ROW: when it shows, in what order, with what numbers.
  {
    const shown = (vf) => harness({ marketRegime: null, vixFamily: vf }).run().indexOf(VF_A) >= 0;
    const CASES = [
      [null, false], [undefined, false], [0, false], ['', false], [{}, false], [{ vix: null, vix9d: null, vix3m: null, vix6m: null }, false],
      [{ vix: undefined }, false], [{ timestamp: 1 }, false], [{ foo: 1 }, false],
      [{ vix: 18.5 }, true], [{ vix9d: 17 }, true], [{ vix3m: 19 }, true], [{ vix6m: 20 }, true],
      [{ vix: 0 }, true], [{ vix: NaN }, true],
    ];
    eq(CASES.map(([v]) => shown(v)), CASES.map(([, w]) => w),
      'the VIX row shows when `S.vixFamily` is truthy and AT LEAST ONE of vix, vix9d, vix3m, vix6m is neither null nor undefined — a zero and a NaN each count — and a timestamp alone does not show it');
    ok(CASES.some(([, w]) => w) && CASES.some(([, w]) => !w), '…the table holding both answers, so it is not a table of one answer');
    const one = harness({ marketRegime: null, vixFamily: { vix: 18.5, vix9d: null, vix3m: 21.07, vix6m: undefined } });
    eq(one.run(), card(EMPTY_LABEL, '', vfDiv(18.5, null, 21.07, undefined, '')),
      'a family with two of its four readings gives EXACTLY the row `18.50`, a dash, `21.07` and a dash, in the order VIX, 9D, 3M, 6M, byte for byte');
    eq(one.rec.dates, [], '…and with no timestamp builds no Date');
    ok(harness({ marketRegime: null, vixFamily: { vix: 0 } }).run().indexOf('<strong>0.00</strong>') > 0,
      'a reading of zero is shown as `0.00`, not as a dash: the test is `!= null`…');
    ok(harness({ marketRegime: null, vixFamily: { vix: NaN } }).run().indexOf('<strong>NaN</strong>') > 0, '…and NaN as `NaN`');
    eq((() => { try { harness({ marketRegime: null, vixFamily: { vix: '18' } }).run(); return null; } catch (e) { return e.name; } })(), 'TypeError',
      'a reading that is not a number (the string \'18\') THROWS TypeError out of the function, since it calls .toFixed on it');
    // THE TIMESTAMP: a Date is built from it only when it is truthy.
    const ts = harness({ marketRegime: null, vixFamily: { vix: 18.5, timestamp: 1234 } });
    eq(ts.run(), card(EMPTY_LABEL, '', vfDiv(18.5, null, null, null, 'V1234')),
      'a family with a timestamp ends the row with `· V1234`, the time the (stubbed) Date answers, in a smaller grey span');
    eq([ts.rec.dates, ts.rec.times], [[1234], [['vf', CLOCK_ARGS]]],
      '…the Date built ONCE from the timestamp as it is, and asked once for its time with an empty locale list and 2-digit hour and minute');
    eq([0, '', null, undefined].map((t) => harness({ marketRegime: null, vixFamily: { vix: 1, timestamp: t } }).run() && 0), [0, 0, 0, 0],
      'a falsy timestamp (0, "", null, undefined) runs without error…');
    eq([0, '', null, undefined].map((t) => { const x = harness({ marketRegime: null, vixFamily: { vix: 1, timestamp: t } }); x.run(); return x.rec.dates.length; }), [0, 0, 0, 0],
      '…and builds no Date');
    ok(harness({ marketRegime: null, vixFamily: { vix: 1, timestamp: 5 } }, '').run().indexOf(VF_T_A) === -1,
      'a Date that answers an empty string leaves the time span out, as for the regime\'s clock');
    // ORDER OF THE PARTS: title, label, source line, VIX row, disclaimer.
    {
      const h = harness({ marketRegime: { volatility: 'LOW', label: 'Calm', ivrSource: 'TASTYTRADE' }, vixFamily: { vix: 12, timestamp: 9 } });
      h.state.marketRegime.computedAt = clock(h.rec, '09:35');
      const out = h.run();
      const at = [OPEN, TITLE, LABEL_A, SRC_A, VF_A, DISC].map((s) => out.indexOf(s));
      ok(at.every((x) => x >= 0) && at.every((x, i) => i === 0 || x > at[i - 1]),
        'with everything present the parts come in the order card, title, label, source line, VIX row, disclaimer');
      eq(out, card(labelDiv('var(--bl)', 'Calm'), srcDiv('TASTYTRADE', '09:35'), vfDiv(12, null, null, null, 'V9')),
        '…and the whole string is exactly that assembly, byte for byte');
      eq(h.rec.reads, STATE_READS, '…the state read twice in all and still only STATE_READS, in that order');
      eq(h.rec.writes, [], '…and written never');
    }
    // A FROZEN STATE is read without a write.
    {
      const frozen = Object.freeze({ marketRegime: Object.freeze({ label: 'F', ivrSource: 'TASTYTRADE' }), vixFamily: Object.freeze({ vix: 1 }) });
      const c = mkCtx({ S: frozen, Date });
      ok(vm.runInContext('regimeHTML()', c).indexOf(labelDiv('var(--tx2)', 'F')) > 0, 'a deeply frozen state is read without complaint: the function writes to nothing it is handed');
    }
  }
  eq(Object.getOwnPropertyNames(bare).sort(), VM_GLOBALS.slice().sort(), 'the bare VM, which was never called with a state, still holds only its one owner');
}

// ─────────────────────────────────────────────────────────────────────
section('8. Where this layer sits, and what it changed');
// ─────────────────────────────────────────────────────────────────────
{
  // THE AUDIT ASSERTED THE OPPOSITE of the first two: while the cut was still a
  // recommendation this module was absent from the chain and from disk. It
  // ships now, so the claims are INVERTED rather than deleted — an assertion
  // that stops being made is the way this programme loses coverage.
  ok(CHAIN.indexOf(MODULE_REL) >= 0, 'this module is IN the chain now');
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, '…as its newest layer, at the end of the list');
  ok(fs.existsSync(path.join(ROOT, MODULE_REL)), '…and its path exists');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is still SMALLEST_LAYER_CHARS units, and it is not this one…');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS, '…this module being larger than that…');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    '…measured against every layer rather than inferred from the first: it ranks SIZE_RANK by size…');
  eq(sizes.filter((u) => u < BODY_CHARS).length, LAYERS_SMALLER_THAN_THIS_CUT,
    '…with LAYERS_SMALLER_THAN_THIS_CUT layers smaller than it…');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…and LAYERS_LARGER_THAN_THIS_CUT layers larger…');
  eq(sizes.filter((u) => u === BODY_CHARS).length, 1, '…none of the others exactly its size, the one at that length being itself…');
  eq(sizes[SIZE_RANK - 1], MODULE.length, '…the layer at that rank in size order being this module…');
  // The chain now CONTAINS this layer, so the partition is over CHAIN_LENGTH
  // itself. While the cut was a recommendation the chain excluded it and the
  // sum was CHAIN_LENGTH + 1 — the `+ 1` moved out when the layer moved in.
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain, so neither drifts alone');
  // THE THREE CHAIN-WIDE COUNTS, and the audit forecast that the dependency count would
  // move and that the pure-ASCII and narrow-banner counts would not. The two shape counts are asserted as comparisons between two
  // measurements, over the chain before this layer and over the whole chain,
  // rather than carried forward as numbers.
  const prior = PRIOR_LAYERS.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  eq(prior.length, CHAIN_LENGTH - 1, 'PRIOR_LAYERS is the chain without this layer');
  const ascii = (s) => !/[^\x00-\x7F]/.test(s);
  const banner = (s) => /^\s*\/\/ ── /.test(s.split('\n')[0]);
  eq(prior.filter(ascii).length, PRIOR_PURE_ASCII_LAYERS, 'PRIOR_PURE_ASCII_LAYERS of the chain before this layer are pure ASCII…');
  ok(!ascii(MODULE), '…and this module is NOT, asserted of the module directly: it holds NON_ASCII_CHARS non-ASCII characters, em dashes, middle dots and box-drawing characters…');
  eq(sources.filter(ascii).length, PURE_ASCII_LAYERS, '…so the count over the whole chain is PURE_ASCII_LAYERS…');
  eq(PURE_ASCII_LAYERS, PRIOR_PURE_ASCII_LAYERS, '…the SAME number: it did not move, as the audit forecast');
  eq(prior.filter(banner).length, PRIOR_LAYERS_OPENING_ON_BANNER,
    'PRIOR_LAYERS_OPENING_ON_BANNER of the chain before this layer open on a `── ` banner line…');
  ok(!banner(MODULE), '…and this module does NOT, asserted of the module directly: its first line is `// ─── `, three dashes, which the `── ` shape does not match…');
  eq(sources.filter(banner).length, LAYERS_OPENING_ON_BANNER,
    '…so the count over the whole chain is LAYERS_OPENING_ON_BANNER…');
  eq(LAYERS_OPENING_ON_BANNER, PRIOR_LAYERS_OPENING_ON_BANNER, '…the SAME number: it did not move, as the audit forecast…');
  const wide = (x) => /^\s*\/\/ ─{2,}[ \t]+\S/.test(x.split('\n')[0]);
  eq(prior.filter(wide).length, PRIOR_LAYERS_OPENING_ON_WIDE_BANNER,
    '…while PRIOR_LAYERS_OPENING_ON_WIDE_BANNER of the chain before it open on a banner of two or more dashes, the reading topLevelBanners uses…');
  ok(wide(MODULE), '…this module DOES, so that wider count moved…');
  eq(sources.filter(wide).length, LAYERS_OPENING_ON_WIDE_BANNER, '…to LAYERS_OPENING_ON_WIDE_BANNER…');
  eq(LAYERS_OPENING_ON_WIDE_BANNER, PRIOR_LAYERS_OPENING_ON_WIDE_BANNER + 1, '…by exactly one, which is the forecast the audit made of it. The narrower count is the one the contracts pin');
  // THE THIRD CHAIN-WIDE COUNT, and the one that moved: layers whose
  // contract pins a non-empty MONOLITH_DEPENDENCIES. Counted over the suite with
  // this contract in it, then compared with the figure the contract that carries
  // it pins. This contract pins `S`, so it is among them.
  const contractsPinning = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => ({ f, src: fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8') }))
    .filter(({ src }) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    }).map((x) => x.f);
  eq(contractsPinning.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, counted over the suite…');
  ok(contractsPinning.indexOf(path.basename(CONTRACT_REL)) >= 0, '…this contract being one of them…');
  eq(MONOLITH_DEPENDENCIES.length, 1, '…it pinning the non-empty list `S`, which is why the count moved, as the audit forecast…');
  eq(contractsPinning.filter((f) => f !== path.basename(CONTRACT_REL)).length, PRIOR_LAYERS_WITH_A_DEPENDENCY,
    '…PRIOR_LAYERS_WITH_A_DEPENDENCY of the others pinning one, so it is the next of them and the count is one higher…');
  eq(LAYERS_WITH_A_DEPENDENCY, PRIOR_LAYERS_WITH_A_DEPENDENCY + 1, '…by exactly one…');
  eq(Number(fs.readFileSync(path.join(ROOT, 'tests/backend-positions-aggregate-boundary-contract.test.js'), 'utf8')
    .match(/^const LAYERS_WITH_A_DEPENDENCY = (\d+);$/m)[1]), LAYERS_WITH_A_DEPENDENCY,
  '…and the figure the contract that carries it pins is that same LAYERS_WITH_A_DEPENDENCY');
}
// WHAT THE RELOCATION COST THE DOCUMENT — the audit forecast these before
// anything moved, and §9 holds the shipped document to them.
eq(UNDO.TAG.length, RAW_CHARS - NET_REDUCTION,
  'the tag it added is RAW_CHARS less NET_REDUCTION units');
eq(UNDO.TAG, '<script src="./' + MODULE_REL + '"></script>\n',
  '…and names the module this layer shipped');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, 'index.html lands at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…leaving RESIDUAL_MONOLITH of inline code');
eq(LOCAL_SCRIPTS + 1, LOCAL_SCRIPTS_AFTER, '…and LOCAL_SCRIPTS_AFTER local scripts');
eq(count(INDEX, UNDO.TAG), 0,
  '…and the RECONSTRUCTED base carries no such tag, which is what makes it the base');

// ─────────────────────────────────────────────────────────────────────
section('9. The relocation is the whole of the production change');
// ─────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  // THE AUDIT ASSERTED THAT NOTHING MOVED. This phase moves exactly the audited
  // bytes and nothing else, so the claim is inverted rather than dropped: TWO
  // production paths, the document and the new module, and no third.
  const all = Array.from(new Set(changed.concat(status)));
  eq(all.filter((rel) => rel === 'index.html' || rel.startsWith('js/')).sort(),
    ['index.html', MODULE_REL].sort(),
    'exactly TWO production paths differ from the base: the document and the new module');
  eq(git(['show', BASE_SHA + ':index.html']).length, BASE_CHARS,
    '…and the base commit\'s index.html is the length the reconstruction reproduces');
  eq(sha256(git(['show', BASE_SHA + ':index.html'])), sha256(INDEX),
    '…byte for byte: the reconstruction IS that document, not a copy of its numbers');
  ok(!git(['show', BASE_SHA + ':index.html']).includes(UNDO.TAG),
    '…and the base carried no tag for this module');
  ok(fs.existsSync(path.join(ROOT, MODULE_REL)),
    '…while the module the audit recommended is now written');

  // THE SHIPPED DOCUMENT is what the audit predicted, to the byte.
  eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is the extracted length');
  eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…its byte length');
  eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…its line-feed count');
  eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and its digest');
  eq(LIVE_INDEX.length, INDEX_AFTER,
    '…which is INDEX_AFTER, the figure the audit forecast before anything moved');
  eq(LIVE_MONOLITH.length, RESIDUAL_MONOLITH,
    '…and the residual inline monolith is RESIDUAL_MONOLITH, the other forecast');
  eq(LIVE_LOCALS.length, UNDO.EXTRACTED_LOCAL_SCRIPTS,
    '…carrying one more local script than the base');
  eq(LOCALS.length + 1, LIVE_LOCALS.length,
    '…exactly one more, measured against the reconstruction rather than against a pin');
  eq(count(LIVE_INDEX, UNDO.TAG), 1, 'exactly one tag for this module');
  eq(count(LIVE_INDEX, UNDO.ANCHOR_TAG + UNDO.TAG + UNDO.INLINE_OPEN), 1,
    '…immediately after the previous layer and immediately before the inline monolith');

  // THE MODULE IS THE AUDITED BLOCK VERBATIM — asserted as bytes, not numbers.
  eq(MODULE.length, UNDO.MODULE_CHARS, 'the shipped module is MODULE_CHARS units');
  eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…its byte length');
  eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…its line-feed count');
  eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and its digest');
  eq(MODULE, CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
    'the module IS the audited block of the reconstructed monolith, byte for byte — not a '
    + 'copy of its measurements');
  eq(sha256(MODULE), BODY_SHA256,
    '…and its digest is the BODY_SHA256 the audit pinned before the move');
  eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
    '…with the raw fragment being the module plus the one structural separator');
  ok(MODULE.endsWith(BODY_ENDING) && !MODULE.endsWith('\n\n'),
    '…and the module ends on a real line of code, not on the separator it gave up');
  eq(MODULE.split('\n')[0], DOC_FIRST_LINE,
    '…and OPENS on the banner, DOC_FIRST_LINE: the boundary §2 defends');
  eq(MODULE.slice(MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1, MODULE.indexOf('\n', MODULE.indexOf('\n' + DECL_FIRST_LINE) + 1)), DECL_FIRST_LINE,
    '…with the declaration, DECL_FIRST_LINE, on the line after the banner…');
  eq(MODULE.indexOf(DECL_FIRST_LINE), DOC_TAKEN, '…at exactly DOC_TAKEN units in');
  eq(Buffer.byteLength(MODULE, 'utf8') - MODULE.length, 2 * (EM_DASHES + BOX_DRAWING_CHARS) + MIDDLE_DOTS,
    '…its UTF-8 length longer than its UTF-16 length by two bytes for each em dash and box-drawing character and one for each middle dot…');
  eq((MODULE.match(/[^\x00-\x7F]/g) || []).length, NON_ASCII_CHARS, '…of which it holds NON_ASCII_CHARS…');
  eq((MODULE.match(/—/g) || []).length, EM_DASHES, '…EM_DASHES of them em dashes…');
  eq((MODULE.match(/·/g) || []).length, MIDDLE_DOTS, '…MIDDLE_DOTS middle dots…');
  eq((MODULE.match(/─/g) || []).length, BOX_DRAWING_CHARS, '…and BOX_DRAWING_CHARS box-drawing characters, the rest…');
  eq(MODULE.split('\n').filter((l) => /[^\x00-\x7F]/.test(l)).map((l) => l.trim().startsWith('//')), [true, true, false, false, false, false],
    '…on NON_ASCII_LINES lines, the first two of them comment lines and the other four string literals the function returns, which is why the move must keep the bytes and not only the code');
  eq(NON_ASCII_LINES, 6, '…six lines in all');
}
// THE TAG'S POSITION. Nothing here shows the load order to be load-bearing (§3 says what it does not measure),
// and it is pinned all the same: last of the local scripts, immediately before the inline monolith, whose
// consumer stays behind.
{
  const tagIndex = LIVE_LOCALS.indexOf(MODULE_REL);
  eq(tagIndex, TAG_LOCAL_INDEX, 'the tag is local script number TAG_LOCAL_INDEX + 1, found by NAME…');
  eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
    '…and it is the LAST local script, so nothing loads after it that could depend on it');
  eq(LIVE_LOCALS[tagIndex - 1], 'js/services/journal-expiry-audit.js',
    '…immediately after the previous layer');
  {
    const at = LIVE_TAGS.findIndex((t) => t.src === './' + MODULE_REL);
    ok(at >= 0 && !LIVE_TAGS[at + 1].src, '…with the inline monolith, whose consumers call it, the very next script');
  }
  for (const name of OWNERS_EXPECTED) {
    eq(count(LIVE_MONOLITH, 'function ' + name + '('), 0,
      'the declaration of ' + name + ' has left the monolith…');
  }
  // THE SHIPPED DOCUMENT STILL NAMES THE FUNCTION, at the one consumer site and nowhere else: the block's own
  // text left, the call did not.
  eq(refSites(LIVE_INDEX, OWNER).length, CONSUMER_SITES,
    '…while the shipped document names ' + OWNER + ' at the CONSUMER_SITES call that stayed…');
  eq(refSites(MASKED, OWNER).filter((at) => at < RAW_AT_IN_CODE || at >= RAW_END_IN_CODE).length, CONSUMER_SITES,
    '…the same CONSUMER_SITES the reconstructed base held from outside the block…');
  eq(LIVE_LOCALS.filter((rel) => rel !== MODULE_REL).reduce((t2, rel) =>
    t2 + refSites(fs.readFileSync(path.join(ROOT, rel), 'utf8'), OWNER).length, 0), SIBLING_REFERENCES,
  '…and exactly SIBLING_REFERENCES local script other than the module itself names it, the sibling that calls it');
  eq(scanTopLevelDeclarations(MODULE).map((d) => d.name), OWNERS_EXPECTED,
    'the module declares exactly its one owner and nothing else');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === OWNER_BEFORE).length, 1,
    '…while ' + OWNER_BEFORE + ' stays declared in the monolith');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => CONSUMERS.indexOf(d.name) >= 0).map((d) => d.name).sort(),
    CONSUMERS.slice().sort(), '…and so does its consumer, which calls the module\'s function');
  eq(scanTopLevelDeclarations(LIVE_MONOLITH).filter((d) => d.name === NEXT_DECL).length, 1,
    '…and ' + NEXT_DECL + ', which follows the cut, stays too');
  eq(count(LIVE_MONOLITH, JOIN_AFTER_CUT), 1,
    '…and the shipped monolith holds the join the audit forecast, the brace of the owner above, one blank line and the declaration of ' + NEXT_DECL + ', once…');
  eq(LIVE_MONOLITH.indexOf(JOIN_AFTER_CUT), RAW_AT_IN_CODE - 3, '…at the place the cut was made');
  // CONTROL: the same predicate fails on a document with the tag moved, so the
  // pin is a measurement and not a statement that is true of any document.
  const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
  const movedLocals = APP_LOADER.parseScriptTags(moved)
    .filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
  ok(movedLocals.indexOf(MODULE_REL) !== TAG_LOCAL_INDEX && movedLocals[movedLocals.length - 1] !== MODULE_REL,
    'control — with the tag moved to the top of the document, both of those pins would fail');
}
// THE UNDO'S REACHABLE GUARDS, each driven by PLANTING the exact violation it
// claims to catch. A guard that is never made to fire is a guard nobody has
// checked, and its EXACT message is asserted so a mutant cannot pass by raising
// some other error. BASE_IDENTITY is deliberately absent: the helper's header
// states it is a redundant final gate, unreachable once the module digest and
// the whole-document digest have both passed.
{
  const E = 'PORTFOLIO_REGIME_BADGE_HTML_UNDO_';
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(null, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, null), E + 'BAD_INPUT',
    '…and a non-string module');
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, MODULE.slice(0, -1)),
    E + 'MODULE_IDENTITY', 'a truncated module is refused');
  // A MODULE THAT RE-ABSORBED THE SEPARATOR IS CAUGHT BY SIZE, not by the
  // separator gate — it is 2,031 units, not 2,030 — which is exactly what the
  // helper's own gate-1 comment claims.
  eq((MODULE + '\n').length, RAW_CHARS,
    'control — a module that re-absorbed the separator is one unit too long, the raw length');
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, MODULE + '\n'),
    E + 'MODULE_IDENTITY', '…so SIZE refuses it, before the separator gate is reached');
  {
    // THE SEPARATOR GATE, reached on its own terms: a module of the RIGHT length
    // and the RIGHT line-feed count that still does not end on a line of code.
    // The naive mutant — swap the trailing `}\n` for `\n\n` — does NOT reach it:
    // that moves the line-feed count and gate 1 refuses it first. One LF is
    // traded away elsewhere to keep the count, which is what makes the probe
    // land on this gate rather than on the one above it.
    const blankEnded = MODULE.slice(0, -2).replace('\n', ' ') + '\n\n';
    eq(blankEnded.length, MODULE.length, 'control — the blank-ended module is the right length');
    eq(Buffer.byteLength(blankEnded, 'utf8'), Buffer.byteLength(MODULE, 'utf8'), '…the right byte length');
    eq((blankEnded.match(/\n/g) || []).length, (MODULE.match(/\n/g) || []).length,
      '…and has the same line-feed count, so only the separator gate can refuse it');
    ok(blankEnded.endsWith('\n\n'), '…and it really does end on a blank line');
    throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, blankEnded),
      E + 'MODULE_SEPARATOR',
      '…and the separator gate refuses it with its OWN error, so a caller learns which '
      + 'mistake it made');
  }
  {
    // Same length, same line-feed count, different bytes: only the digest can
    // catch this one, which is why the digest is a separate gate.
    const swapped = MODULE.replace('MARKET REGIME', 'MARKET REGIMX');
    eq(swapped.length, MODULE.length, 'control — the tampered module is the same length');
    ok(swapped !== MODULE, '…and really does differ from it');
    throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, swapped),
      E + 'MODULE_IDENTITY', '…and a same-length tampered module is still refused');
  }
  {
    // The byte count is pinned on its own: swapping a 1-byte letter for a 2-byte
    // one keeps the length and the line-feed count and moves only the byte length.
    const widened = MODULE.replace('t', 'é');
    eq(widened.length, MODULE.length, 'control — the widened module has the same UTF-16 length');
    eq(Buffer.byteLength(widened, 'utf8') - Buffer.byteLength(MODULE, 'utf8'), 1,
      '…and is one UTF-8 byte longer');
    throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX, widened),
      E + 'MODULE_IDENTITY', '…and is refused all the same');
  }
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX.replace(UNDO.TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a document with no tag is refused');
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX + UNDO.TAG, MODULE),
    E + 'TAG_IDENTITY', '…and one with a duplicate tag');
  {
    // The tag moved to the top of the document: present exactly once, but no
    // longer adjacent to the anchor and the inline open.
    const moved = UNDO.TAG + LIVE_INDEX.replace(UNDO.TAG, '');
    eq(count(moved, UNDO.TAG), 1, 'control — the moved tag is still present exactly once');
    throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(moved, MODULE),
      E + 'TAG_ADJACENCY', '…so it is ADJACENCY that refuses a reordered tag, not identity');
  }
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(LIVE_INDEX.replace('<body', '<body '), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoPortfolioRegimeBadgeHtml(INDEX, MODULE),
    E + 'TAG_IDENTITY',
    'and the ALREADY-UNEXTRACTED document is refused too: undoing twice is not a no-op');
  // isApplied is ROUTING, not safety — the helper's header says so.
  eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied is true for the shipped document');
  eq(UNDO.isApplied(INDEX), false, '…and false once this layer is peeled off');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  // THE AUDIT IS GONE, AND THIS FILE IS WHAT REPLACED IT — one for one, which
  // is the rhythm. The audit asserted AUDIT_REL was its own path; that claim is
  // inverted here rather than dropped.
  ok(all.indexOf(AUDIT_REL) >= 0, 'the audit is part of the change — as a deletion');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)), '…and its path no longer exists');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '',
    '…while the base commit DID carry it, so the deletion is of something real');
  eq(CONTRACT_REL, path.relative(ROOT, __filename),
    'CONTRACT_REL is the path of THIS file, which is what the audit became');
  ok(all.indexOf(CONTRACT_REL) >= 0, '…and it is part of the change');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)), 'the audit\'s spec is gone too');
  ok(fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)), '…replaced by this contract\'s');
  ok(fs.existsSync(path.join(ROOT, UNDO_REL)), 'and the undo helper ships');
  eq(path.join(ROOT, UNDO_REL), require.resolve('./lib/portfolio-regime-badge-html-undo.js'),
    '…and UNDO_REL is the very file this contract loads its reconstruction from, not merely a helper that exists');
  eq(all.filter((rel) => !rel.startsWith('tests/') && rel !== 'index.html'
    && !rel.startsWith('js/')), [],
  '…with every remaining changed path being a test artifact, the document or a module');
  // THE RATCHET. The audit left and this contract arrived, so the suite file
  // count is UNCHANGED — which is asserted against git rather than assumed from
  // the fact that a rename happened.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, TEST_FILE_COUNT,
  '…the same count the base commit carried, read out of git: one file left as one arrived');
  const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
  const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') &&
      RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
  ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
    .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
  '…and every one of them pins the same value, this contract included');
  ok(contracts.indexOf(path.basename(CONTRACT_REL)) >= 0,
    '…this contract being one of them, so it ratchets itself rather than exempting itself');
  // THE BUDGET.
  const contractSpec = require(path.join(ROOT, CONTRACT_SPEC_REL));
  eq(contractSpec.target, CONTRACT_REL, 'this contract\'s spec targets this contract');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  eq(declaredNow, BASE_DECLARED_MUTANTS + contractSpec.mutants.length - RETIRED_MUTANTS,
    '…and the live total is the base, LESS the audit spec this phase retires, PLUS this '
    + 'contract\'s own — the arithmetic of the change rather than the total it reaches');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at MUTANT_BUDGET');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  // ABSENCE ALONE IS NOT A PIN.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the AUDIT\'s spec is retired, in Phase 2 as the rhythm runs');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely one that never existed');
  eq(RETIRED_SPEC_REL, AUDIT_SPEC_REL,
    'the retired path IS the audit\'s spec: the retirement is in phase order, and it is the '
    + 'outgoing CONTRACT\'s spec that went in Phase 1 instead');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + AUDIT_REL + "'") >= 0,
    '…and it is the audit that retired spec TARGETED, not merely a file that existed');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(CONTRACT_SPEC_REL)], '…and it is THIS contract\'s');
}




console.log('\n' + pass + ' assertions passed.');
console.log('PORTFOLIO_REGIME_BADGE_HTML_CONTRACT_OK');
}

main();
