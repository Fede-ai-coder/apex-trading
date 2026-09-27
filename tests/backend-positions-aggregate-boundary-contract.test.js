'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// BACKEND POSITIONS AGGREGATE — PERMANENT BOUNDARY CONTRACT.
//
// The 33rd layer. `_backendEnrichedPositionsToAggregatedOptions` left the inline
// monolith for js/portfolio/backend-positions-aggregate.js, byte for byte, and
// this file replaces the temporary audit that chose it — one for one, in the
// same PR, which §8 asserts against git rather than against a claim.
//
// WHAT IS PINNED HERE, and why each is worth an assertion rather than a note:
//
//   §1  the shipped document and the base it came from, reconstructed by the
//       undo helper rather than remembered.
//   §2  the module is the block's bytes VERBATIM — same digest the audit
//       predicted, same length, same line feeds, and the raw span is exactly
//       the module plus one separator newline.
//   §3  coupling in all nine directions, the single inbound edge located, and
//       the indexed profile re-derived the slow way so the index cannot be
//       wrong and fast at once.
//   §4  THE SCREEN THAT FOUND IT, re-executed. Not cited — executed.
//   §5  what caps the cut at one owner: a load-time `window.` exposure.
//   §6  it loads bare in an empty VM and does nothing at all while loading.
//   §7  every documented failure of the undo helper, by its exact message.
//   §8  exact production scope, and the audit is gone.
//
// ── WHY THIS LAYER IS DIFFERENT, MEASURED RATHER THAN ASSERTED ──────────────
//
// IT DEPENDS ON NOTHING. Not "on little": MONOLITH_DEPENDENCIES is EMPTY. The
// function reads its one parameter and its own locals and names no monolith
// declaration, no sibling module, no markup. TEN shipped contracts pin a
// non-empty list, so a runtime dependency is the ordinary case in this chain
// and §3 counts that set rather than inferring from the layers nearest to hand.
//
// ITS WHOLE SCORE IS ONE EDGE. `refreshPositionsLive` calls it, from inside a
// function body, and that is the entirety of the nine-direction score: 1.
// Eight of the nine directions measure zero.
//
// IT IS THE CHAIN'S FIRST PURE-ASCII LAYER. Every other layer carries a
// box-drawing banner; this region carries no comment at all — 71 of its 72
// lines are code and the 72nd is the empty element `split` leaves on a
// newline-terminated string. §2 pins BOTH halves of that: the byte length
// equals the UTF-16 length, and the comment-line count is zero. "The
// explanation travels with the code" is a stated value of these cuts and it
// bought nothing here, which is a fact about the region rather than a reason
// to reshape it.
//
// ── THE TWO CLAIMS THIS FILE DOES NOT MAKE ──────────────────────────────────
//
// It does NOT claim 1 is the best score the programme has recorded. Only a
// handful of shipped contracts pin a nine-direction score at all — this one
// included — so the comparison exists for those layers and no others, and §3
// states it for them only. The metric is younger than the chain. HOW MANY pin
// one is CONTRACTS_PINNING_NINE, counted off the suite in §3: this sentence said
// "THREE" while the executed count had already reached four, which is exactly
// the drift that makes a numeral here worse than a pointer.
//
// It does NOT claim that opening on `function` rather than a banner is a first.
// TWENTY-ONE of the thirty-three layers open on a `──` banner and TWELVE do
// not. §4 counts the set, because "the first layer that…" has been written from
// a partial look four times in this programme and was wrong every time.
//
// ── WHAT CAPPED THE CUT ─────────────────────────────────────────────────────
//
// Three owners sit together at this site, all called from
// `refreshPositionsLive`, which makes a 10,430-unit cut look available. It is
// not: between the first owner and the second sits
//
//     try { window._resolveLegGreeksDisplay = _resolveLegGreeksDisplay; } catch (e) {}
//
// at module scope. Taking two owners or three relocates a load-time side
// effect, which this programme has declined to do since the DSB adapter cut.
// §5 measures all three ends and locates the exposure, so the reason the cut is
// 3,695 units and not 10,430 is executed rather than remembered.
//
// ── THE SCREEN, WHICH IS THE HALF OF THE CYCLE THAT OUTLIVES THE LAYER ──────
//
// The banner screen could not rank this region at all. Its banner region runs
// 95,529 units over THIRTY-FIVE owners, and the screening rule can only report
// such a region whole. §4 re-executes the owner-run screen the audit
// introduced — every contiguous run of top-level owners in every banner region,
// snapped to the body that would move, seam-checked, scored — and re-derives
// all of its numbers. The audit file is deleted by this PR, so a number only
// cited there would be a number nothing checks.
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
const APEX_STORAGE_RECOVERY_U = require('./lib/apex-storage-recovery-undo.js');
const PORTFOLIO_SPY_PRICE_U = require('./lib/portfolio-spy-price-undo.js');
const PORTFOLIO_TECHNICAL_PARITY_U = require('./lib/portfolio-technical-parity-undo.js');
const DXLINK_GREEKS_FETCH_U = require('./lib/dxlink-greeks-fetch-undo.js');
const JOURNAL_MAP_AUDIT_U = require('./lib/journal-map-audit-undo.js');
const PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U = require('./lib/portfolio-technical-alignment-debug-undo.js');
const PORTFOLIO_TECHNICAL_MERGE_U = require('./lib/portfolio-technical-merge-undo.js');
const UNDO = require('./lib/backend-positions-aggregate-undo.js');

// ── The module and its tags ──────────────────────────────────────────────────
const MODULE_REL = 'js/portfolio/backend-positions-aggregate.js';
const TAG = '<script src="./js/portfolio/backend-positions-aggregate.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/swing-direction.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base and the files of this change ────────────────────────────────────
const BASE_SHA = 'f89244a';
const CONTRACT_REL = 'tests/backend-positions-aggregate-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/backend-positions-aggregate-undo.js';
const AUDIT_REL = 'tests/temporary-backend-positions-aggregate-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/backend-positions-aggregate-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/backend-positions-aggregate-contract.spec.js';
const TEST_FILE_COUNT = 168;
const LOCAL_SCRIPT_COUNT = 77;
const MODULE_POSITION = 76;

// ── Coordinates, in the RECONSTRUCTED base ───────────────────────────────────
const CODE_AT = 114397;
const CODE_CHARS = 1399485;
const RAW_AT_IN_CODE = 929673;
const RAW_END_IN_CODE = 933369;
const BODY_END_IN_CODE = 933368;
const TOP_LEVEL_BANNERS = 223;
const RESIDUAL_MONOLITH = 1395789;
const TAG_GAP = 929681;
const NET_REDUCTION = 3626;

// ── The module ───────────────────────────────────────────────────────────────
const OWNERS_EXPECTED = ['_backendEnrichedPositionsToAggregatedOptions'];
const OWNER_COUNT = 1;
const FUNCTION_OWNERS = 1;
const OWNER_SIZES = [3694];
const BODY_ENDING = '}\n';
const OPENING_LINE = 'function _backendEnrichedPositionsToAggregatedOptions(enrichedResp) {';
const CODE_LINES = 71;
const TOTAL_LINES = 72;
const COMMENT_LINES = 1;
const OPENING_COMMENT_LINES = 0;

// ── Coupling ─────────────────────────────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [1063469];
const CALLERS = ['refreshPositionsLive'];
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 1;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;
const LAYERS_WITH_A_DEPENDENCY = 14;
const CONTRACTS_PINNING_NINE = 10;
const PINNED_NINE_SCORES = [1, 2, 2, 2, 5, 5, 6, 7, 8, 10];

// ── The banner region that hid it, and the screen that did not ───────────────
const HOST_REGION = [921786, 1017315];
const HOST_REGION_UNITS = 95529;
const HOST_REGION_OWNERS = 35;
const BANNER_SCREEN_BEST = 10;
const RUN_FLOOR = 1500;
const RAW_RUNS = 7759;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3391;
const CANDIDATES_SCORING_ONE = 5;
const CLEAN_CANDIDATES = 2093;
const CLEAN_SCORING_ONE = 3;

// ── The three ends at this site, and the exposure between them ───────────────
const SITE_ENDS = [
  { end: 933368, owners: 1, units: 3695, nine: 1, loadTime: 0 },
  { end: 937166, owners: 2, units: 7493, nine: 2, loadTime: 1 },
  { end: 940103, owners: 3, units: 10430, nine: 3, loadTime: 1 },
];
const SHIPPED_ROW = 0;
const EXPOSURE_LINE = 'try { window._resolveLegGreeksDisplay = _resolveLegGreeksDisplay; } catch (e) {}';
const EXPOSURE_AT = 937085;

// ── Reachability in the base monolith ────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

// ── The chain ────────────────────────────────────────────────────────────────
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
  // Newest last: CHAIN is CHRONOLOGICAL, not sorted.
  MODULE_REL,
];
const CHAIN_LENGTH = 33;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 2;
const LAYERS_ENDING_BRACE = 30;
const LAYERS_WITH_SEPARATOR = 25;
const LAYERS_WITH_RAW_PAIR = 22;
const LAYERS_WITHOUT_SEPARATOR = 8;
const LAYERS_OPENING_ON_A_BANNER = 21;
const PURE_ASCII_LAYERS = 1;
let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function sha256(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function refSites(text, name) {
  const re = new RegExp('(^|[^.\\w$])(' + name + ')\\b', 'g');
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
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
function codeLines(src) { return src.split('\n').filter((l) => !isBlankOrComment(l)).length; }
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('BACKEND POSITIONS AGGREGATE — PERMANENT BOUNDARY CONTRACT');

const LIVE_INDEX = APP_LOADER.loadIndexHtml();
// Two layers were cut AFTER this one, so both are newer: peel them NEWEST-FIRST
// and everything below measures this layer's own document.
const PRE_APEX_STORAGE_RECOVERY = APEX_STORAGE_RECOVERY_U.isApplied(LIVE_INDEX)
  ? APEX_STORAGE_RECOVERY_U.undoApexStorageRecovery(
      LIVE_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/apex-storage-recovery.js'), 'utf8'))
  : LIVE_INDEX;
const PRE_PORTFOLIO_SPY_PRICE = PORTFOLIO_SPY_PRICE_U.isApplied(PRE_APEX_STORAGE_RECOVERY)
  ? PORTFOLIO_SPY_PRICE_U.undoPortfolioSpyPrice(
      PRE_APEX_STORAGE_RECOVERY, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-spy-price.js'), 'utf8'))
  : PRE_APEX_STORAGE_RECOVERY;
const PRE_PORTFOLIO_TECHNICAL_PARITY = PORTFOLIO_TECHNICAL_PARITY_U.isApplied(PRE_PORTFOLIO_SPY_PRICE)
  ? PORTFOLIO_TECHNICAL_PARITY_U.undoPortfolioTechnicalParity(
      PRE_PORTFOLIO_SPY_PRICE, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-parity.js'), 'utf8'))
  : PRE_PORTFOLIO_SPY_PRICE;
const PRE_DXLINK_GREEKS_FETCH = DXLINK_GREEKS_FETCH_U.isApplied(PRE_PORTFOLIO_TECHNICAL_PARITY)
  ? DXLINK_GREEKS_FETCH_U.undoDxlinkGreeksFetch(
      PRE_PORTFOLIO_TECHNICAL_PARITY, fs.readFileSync(path.join(ROOT, 'js/services/dxlink-greeks-fetch.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_PARITY;
const PRE_JOURNAL_MAP_AUDIT = JOURNAL_MAP_AUDIT_U.isApplied(PRE_DXLINK_GREEKS_FETCH)
  ? JOURNAL_MAP_AUDIT_U.undoJournalMapAudit(
      PRE_DXLINK_GREEKS_FETCH, fs.readFileSync(path.join(ROOT, 'js/services/journal-map-audit.js'), 'utf8'))
  : PRE_DXLINK_GREEKS_FETCH;
const PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG = PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U.isApplied(PRE_JOURNAL_MAP_AUDIT)
  ? PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_U.undoPortfolioTechnicalAlignmentDebug(
      PRE_JOURNAL_MAP_AUDIT, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-alignment-debug.js'), 'utf8'))
  : PRE_JOURNAL_MAP_AUDIT;
const INDEX = PORTFOLIO_TECHNICAL_MERGE_U.isApplied(PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG)
  ? PORTFOLIO_TECHNICAL_MERGE_U.undoPortfolioTechnicalMerge(
      PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG,
      fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-merge.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const TAGS = APP_LOADER.parseScriptTags(INDEX);
const LOCALS = TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const BASE = UNDO.undoBackendPositionsAggregate(INDEX, MODULE);
const BASE_CODE = APP_LOADER.parseScriptTags(BASE).filter((t) => !t.src && t.inline.length > 1000)[0].inline;
const MASKED = maskLiterals(BASE_CODE);
const STRINGS = literalView(BASE_CODE, maskLiterals, stripComments);
const ALL_DECLS = scanTopLevelDeclarations(BASE_CODE);
const BY_NAME = new Map(ALL_DECLS.map((d) => [d.name, d]));
const FN_BODIES = functionBodyRanges(BASE_CODE);
const insideFunction = (i) => FN_BODIES.some((r) => i >= r.start && i <= r.end);
const MARKS = topLevelBanners(BASE_CODE, FN_BODIES);
const OWNERS = scanTopLevelDeclarations(MODULE);
const MASKED_MODULE = maskLiterals(MODULE);
const MODULE_FNS = functionBodyRanges(MODULE);
const insideModuleFunction = (i) => MODULE_FNS.some((r) => i >= r.start && i <= r.end);

const SIBLINGS = LOCALS.filter((rel) => rel !== MODULE_REL).map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = BASE.slice(0, BASE.indexOf('<script')) +
  BASE.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = APP_LOADER.parseScriptTags(BASE)
  .filter((t) => !t.src && t.inline !== BASE_CODE).map((t) => t.inline).join('\n');

// Every name the OTHER shipped modules own — the ninth direction ranges over it.
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

// The nine-direction profile of a range of the BASE monolith.
// AN OCCURRENCE INDEX, BUILT ONCE. Written the obvious way, `profile` rescans
// the whole 1.4-million-unit monolith for each of ~950 declaration names, for
// every range it is asked about — and §4 asks about every region in the
// monolith, twice. That made this contract take NINETY-SIX SECONDS a run, which
// the mutation pass then pays 73 times: the single largest cost in CI. Every
// identifier position is collected once here instead, and a range query becomes
// two binary searches. The tokenisation is the one `refSites` already uses, so
// every number is unchanged — the assertions below are what proves it, and §3
// re-derives this layer's own profile with `refSites` directly.
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
  const per = SIBLINGS.map((x) => ({ bound: x.bound, idx: occurrenceIndex(x.masked) }));
  for (const d of ALL_DECLS) {
    let n = 0;
    for (const m of per) if (!m.bound.has(d.name)) n += (m.idx.get(d.name) || []).length;
    SIB_REFS.set(d.name, n);
  }
}
const at0 = (idx, n) => idx.get(n) || [];
function lowerBound(sorted, x) {
  let a = 0, b = sorted.length;
  while (a < b) { const m = (a + b) >> 1; if (sorted[m] < x) a = m + 1; else b = m; }
  return a;
}
const sliceIn = (sites, lo, hi) => sites.slice(lowerBound(sites, lo), lowerBound(sites, hi));

function profile(range) {
  const names = ALL_DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
  const inside = (i) => i >= range[0] && i < range[1];
  const bodyMasked = MASKED.slice(range[0], range[1]);
  let inbound = 0, inWrites = 0, inPropWrites = 0, gen = 0, sib = 0, mkp = 0;
  const sites = [];
  for (const n of names) {
    for (const at of at0(OCC_CODE, n).filter(outside)) {
      inbound++; sites.push(at);
      if (/^\s*(?:=[^=]|\+\+|--|\+=|-=|\*=|\/=)/.test(MASKED.slice(at + n.length, at + n.length + 30))) inWrites++;
      if (isPropertyWriteAt(MASKED, at, n)) inPropWrites++;
    }
    gen += at0(OCC_STRINGS, n).filter(outside).length;
    sib += SIB_REFS.get(n);
    mkp += at0(OCC_MARKUP, n).length;
  }
  const outWrites = Array.from(new Set(propertyWriteBases(bodyMasked)
    .filter((b) => !nameSet.has(b) && BY_NAME.has(b)))).sort();
  const local = locallyBound(BASE_CODE.slice(range[0], range[1]));
  const deps = new Set();
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name) || local.has(d.name)) continue;
    if (sliceIn(at0(OCC_CODE, d.name), range[0], range[1]).length) deps.add(d.name);
  }
  // EIGHTH — markup this range generates, naming something that stays behind.
  const outGen = [];
  for (const d of ALL_DECLS) {
    if (nameSet.has(d.name)) continue;
    for (const at of sliceIn(at0(OCC_STRINGS, d.name), range[0], range[1])) outGen.push([d.name, at]);
  }
  // NINTH — code in this range naming something that already left.
  const outModule = [];
  for (const [n] of MODULE_OWNERS) {
    if (nameSet.has(n) || local.has(n)) continue;
    for (const at of sliceIn(at0(OCC_CODE, n), range[0], range[1])) outModule.push([n, at]);
  }
  const seven = inbound + inWrites + inPropWrites + outWrites.length + deps.size + sib + mkp + gen;
  return {
    names, inbound, inWrites, inPropWrites, gen, sib, mkp, outWrites,
    deps: Array.from(deps).sort(), sites: sites.sort((a, b) => a - b),
    outGen, outModule,
    seven, nine: seven + outGen.length + outModule.length,
  };
}

// The banner regions the SCREENING rule produces: one column-0 `// ── ` banner
// running to the next, with banner-only stretches merged into the region that
// follows them. §4 needs these to show what that rule could and could not rank.
function mergedRegions(marks) {
  const raw = marks.map((s, i) => ({ start: s, end: i + 1 < marks.length ? marks[i + 1] : BASE_CODE.length }));
  const out = [];
  for (let i = 0; i < raw.length; i++) {
    let r = raw[i];
    while (i + 1 < raw.length &&
      !BASE_CODE.slice(r.start, raw[i + 1].start).split('\n').some((l) => !isBlankOrComment(l))) {
      r = { start: r.start, end: raw[i + 1].end }; i++;
    }
    out.push(r);
  }
  return out.filter((x) => ALL_DECLS.some((d) => d.start >= x.start && d.end < x.end));
}
// Does a range RUN anything while it loads? Both halves matter: a bare statement
// at module scope, and a read of a name at evaluation time. A low coupling score
// is necessary and not sufficient, and this is the other half.
function loadTimeProfile(lo, hi) {
  const body = BASE_CODE.slice(lo, hi);
  const decls = scanTopLevelDeclarations(body);
  const blanked = Array.from(body);
  for (const d of decls) for (let i = d.start; i <= d.end; i++) blanked[i] = ' ';
  return {
    stmtLines: codeLines(blanked.join('')),
    reads: evaluationTimeReads(body, decls, maskLiterals),
  };
}
const runsNothingAtLoad = (p) => p.stmtLines === 0 && p.reads.length === 0;

const REC = profile([RAW_AT_IN_CODE, RAW_END_IN_CODE]);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is the extracted length');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…and byte length');
eq((INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…and line-feed count');
eq(sha256(INDEX), UNDO.EXTRACTED_SHA256, '…and digest');
eq(LOCALS.length, LOCAL_SCRIPT_COUNT, 'it loads LOCAL_SCRIPT_COUNT local application scripts');
eq(LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last of them, at MODULE_POSITION');
eq(LOCALS[LOCALS.length - 1], MODULE_REL, '…read off the tail directly, not only by arithmetic');
eq(count(INDEX, TAG), 1, 'exactly one tag for it');
eq(count(INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1,
  '…immediately after the swing-direction owner and immediately before the monolith');
// WHY REMOVING THE TAG RESTORES THE BASE OFFSET DIRECTLY. The one added tag line
// begins TAG_GAP units BEFORE where the fragment came from, so once it is taken
// out every byte ahead of the fragment is unchanged and REINSERT_AT is just
// RAW_AT. That is an arithmetic fact the undo helper depends on, so it is
// asserted rather than trusted.
eq(UNDO.RAW_AT - INDEX.indexOf(TAG), TAG_GAP, 'the tag sits TAG_GAP units before the fragment site');
ok(INDEX.indexOf(TAG) < UNDO.RAW_AT, '…that is, BEFORE it, which is what makes the offset hold');
eq(UNDO.REINSERT_AT, UNDO.RAW_AT, '…so the helper re-inserts at the base offset unchanged');

// THE BASE IS RECONSTRUCTED, not remembered.
eq(BASE.length, UNDO.BASE_CHARS, 'the undo helper rebuilds the base length');
eq(sha256(BASE), UNDO.BASE_SHA256, '…and its digest');
eq(BASE, git(['show', BASE_SHA + ':index.html']),
  '…and the result is byte-identical to what the base commit actually carried, '
  + 'which is the claim "byte-exact relocation" actually means');
eq(BASE_CODE.length, CODE_CHARS, 'the base monolith is CODE_CHARS units');
eq(BASE.indexOf(BASE_CODE), CODE_AT, '…starting at CODE_AT');
eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the shipped monolith is RESIDUAL_MONOLITH units');
eq(CODE_CHARS - LIVE_CODE.length, UNDO.RAW_CHARS,
  '…exactly the raw span shorter: nothing else moved');
eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, NET_REDUCTION,
  'index.html fell by NET_REDUCTION units net — the span left, a tag arrived');
eq(UNDO.RAW_CHARS - TAG.length, NET_REDUCTION, '…which is the span less the tag, to the byte');
eq(MARKS.length, TOP_LEVEL_BANNERS, 'the base monolith carries TOP_LEVEL_BANNERS top-level banners');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE, BASE_CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
  'the module file IS the base monolith slice — not a rewrite, not a re-indent');
eq(BASE_CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + '\n',
  '…and the raw span is that slice plus exactly one separator newline');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is MODULE_CHARS units');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…with the digest audit #456 predicted before the move');
eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…and MODULE_LF line feeds');
eq(MODULE.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
eq(MODULE.slice(0, MODULE.indexOf('\n')), OPENING_LINE, 'it opens on the function declaration itself');

// THE SEAM, re-derived rather than cited.
{
  const nextOwner = ALL_DECLS.filter((d) => d.start > RAW_AT_IN_CODE)[0].start;
  eq(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, nextOwner), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(BASE_CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    '…and assertSeam accepts the boundary on all four invariants');
  ok(snapBodyEnd(BASE_CODE, RAW_AT_IN_CODE, HOST_REGION[1]) > BODY_END_IN_CODE,
    'control — given the whole banner region as a limit it lands far past the end, which is '
    + 'why the boundary is a judgement and only the snap is mechanical');
}

// OWNERS comes from the preamble, which already scans the module.
eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the module declares exactly one name at top level');
eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of it');
eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and it is a function');
eq(OWNERS.map((d) => d.end - d.start + 1), OWNER_SIZES, '…of 3,694 units');
eq(OWNERS[0].end + 2, UNDO.MODULE_CHARS,
  '…ending one unit before the module does: the only thing after it is the terminating newline, '
  + 'which is why BODY_ENDING is what it is');

// IT CARRIES NO DOCUMENTATION, pinned both ways.
{
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the module is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES,
    '…and exactly one that is not, which is the empty last element `split` leaves on a '
    + 'newline-terminated string');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…so not ONE line of this module is a comment. The audit stated that as a cost and it is '
    + 'pinned here rather than glossed');
}
// FIRST PURE-ASCII LAYER, asserted over the whole chain rather than claimed.
eq(Buffer.byteLength(MODULE, 'utf8'), MODULE.length,
  'its byte length equals its UTF-16 length: no character above U+007F');
{
  const ascii = CHAIN.filter((rel) => {
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    return Buffer.byteLength(s, 'utf8') === s.length;
  });
  eq(ascii.length, PURE_ASCII_LAYERS, 'exactly PURE_ASCII_LAYERS of the chain is pure ASCII…');
  eq(ascii, [MODULE_REL], '…and it is this one, because every other layer carries a banner');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'exactly ONE reference reaches in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at this exact site');
ok(REC.sites.every(insideFunction), '…inside a function body, so it does not run at load');
{
  const hostOf = (i) => ALL_DECLS.filter((d) => i >= d.start && i <= d.end).pop();
  eq(Array.from(new Set(REC.sites.map((i) => hostOf(i).name))).sort(), CALLERS,
    '…hosted by refreshPositionsLive, which stays behind');
  for (const n of CALLERS) {
    ok(BY_NAME.has(n), n + ' is a monolith declaration…');
    ok(BY_NAME.get(n).start > RAW_END_IN_CODE || BY_NAME.get(n).end < RAW_AT_IN_CODE,
      '…declared outside the region');
  }
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it depends on NOTHING the monolith declares — the list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen.length, outboundModule: REC.outModule.length,
}, ZERO_DIRECTIONS,
'EIGHT of the nine directions measure zero: no write in, none through, none out, '
  + 'no markup either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 1 — one inbound edge and nothing else');

// THE INDEXED PROFILE, RE-DERIVED THE SLOW WAY. An index with a bug gives a
// wrong answer fast, so the numbers above are recomputed with the direct regex
// scan and must agree.
{
  const name = OWNERS_EXPECTED[0];
  const direct = refSites(MASKED, name).filter((i) => i < RAW_AT_IN_CODE || i >= RAW_END_IN_CODE);
  eq(direct, EDGE_SITES, 'control — a direct regex rescan finds the same inbound sites as the index');
  eq(refSites(STRINGS, name).filter((i) => i < RAW_AT_IN_CODE || i >= RAW_END_IN_CODE).length, 0,
    'control — …and the same zero references from generated markup');
  eq(refSites(STATIC_MARKUP, name).length, 0, 'control — …and the same zero from static markup');
  eq(refSites(OTHER_INLINE, name).length, 0, 'control — …and none from the other inline blocks');
  let sib = 0;
  for (const s of SIBLINGS) if (!s.bound.has(name)) sib += refSites(s.masked, name).length;
  eq(sib, 0, 'control — …and no shipped module names it');
  // A CONTROL ON AN INPUT WHERE THE ANSWER DIFFERS: five of those six metrics
  // are zero, and `return 0` would satisfy every one of them.
  ok(refSites(MASKED, '_resolveLegGreeksDisplay').length > 0,
    'control — the same scan on a name that IS referenced returns a non-zero count, so the '
    + 'zeros above are measurements and not a constant');
}
// A RUNTIME DEPENDENCY IS THE ORDINARY CASE, counted over the set.
{
  const withDep = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))
    .filter((src) => {
      const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      if (!m) return false;
      try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
    });
  eq(withDep.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, so '
    + 'having NONE is the exception and is recorded rather than assumed — the count lives in '
    + 'that constant, not in this sentence, which every cycle would otherwise rewrite wrong');
}
// THE SCORE COMPARISON IS SCOPED TO WHAT IS PINNED, not to the whole chain.
{
  const pinned = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f))
    .map((f) => fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8').match(/^const FULL_NINE = (\d+);/m))
    .filter(Boolean).map((x) => Number(x[1])).sort((a, b) => a - b);
  eq(pinned.length, CONTRACTS_PINNING_NINE,
    'CONTRACTS_PINNING_NINE shipped contracts pin a nine-direction score — the count lives in\n'
    + '     that constant, not in this sentence, which every cycle would otherwise rewrite wrong');
  eq(pinned, PINNED_NINE_SCORES,
    '…and PINNED_NINE_SCORES is the whole sorted multiset of them, so a new layer joining the\n'
    + '     set fails here rather than passing unnoticed');
  ok(FULL_NINE < pinned[1],
    '…so all that can be said is that 1 is the lowest of the layers that pin one at all. '
    + 'The metric is younger than the chain, and HOW MUCH younger is CHAIN_LENGTH in the newest '
    + 'contract rather than a numeral here, which is how the last one went stale');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. The screen that found it, re-executed');
// ─────────────────────────────────────────────────────────────────────────────
const REGIONS = mergedRegions(MARKS);
{
  const host = REGIONS.filter((r) => r.start <= RAW_AT_IN_CODE && r.end > RAW_AT_IN_CODE);
  eq(host.length, 1, 'exactly one banner region contained this layer in the base');
  eq([host[0].start, host[0].end], HOST_REGION, '…and it is this one');
  eq(host[0].end - host[0].start, HOST_REGION_UNITS, '…95,529 units of it');
  eq(ALL_DECLS.filter((d) => d.start >= host[0].start && d.end < host[0].end).length,
    HOST_REGION_OWNERS, '…carrying THIRTY-FIVE top-level owners under a single banner');
  eq(MARKS.filter((m) => m > RAW_AT_IN_CODE && m < HOST_REGION[1]).length, 0,
    '…with no banner between this layer and the end of the region: the screening rule had '
    + 'nothing finer to offer here');
  ok(profile([host[0].start, host[0].end]).nine > BANNER_SCREEN_BEST * 10,
    '…and scored whole it is an order of magnitude worse than the banner screen\'s best, '
    + 'which is why no candidate inside it could be ranked by that screen');
}
// THE OWNER-RUN SCREEN. Executed here, not cited: the audit that introduced it
// is deleted by this PR, so a number only stated there is a number nothing runs.
const candidateRuns = [];
{
  const seen = new Set();
  let rawRuns = 0, seamRejected = 0;
  for (const r of REGIONS) {
    const own = ALL_DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        rawRuns++;
        const be = snapBodyEnd(BASE_CODE, lo, hi);
        if (be <= lo || be - lo < RUN_FLOOR) continue;
        try { assertSeam(BASE_CODE, lo, be); } catch (e) { seamRejected++; continue; }
        const key = lo + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        candidateRuns.push({ lo, hi: be, units: be - lo });
      }
    }
  }
  eq(rawRuns, RAW_RUNS, 'the regions yield RAW_RUNS contiguous owner runs');
  eq(seamRejected, SEAM_REJECTED,
    '…of which SEAM_REJECTED are refused by assertSeam and never ranked: the seam is '
    + 'mechanical even though the boundary is a judgement');
  eq(candidateRuns.length, CANDIDATES,
    '…leaving CANDIDATES distinct extractable candidates at the floor');
}
for (const c of candidateRuns) { c.p = profile([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
{
  const ones = candidateRuns.filter((c) => c.p.nine === 1);
  eq(ones.length, CANDIDATES_SCORING_ONE, 'FIVE candidates score 1');
  eq(Math.min.apply(null, candidateRuns.map((c) => c.p.nine)), FULL_NINE,
    '…so the best score in the monolith at this floor is 1, and this layer scores it');
  ok(BANNER_SCREEN_BEST > FULL_NINE,
    '…where the banner screen\'s best was 10: the same space, searched at the granularity '
    + 'the boundary rule uses');
  // NOT ONE of the five is a whole banner region, so the banner screen never
  // scored any of them — it scored the region each was buried in.
  for (const c of ones) {
    const r = REGIONS.filter((x) => x.start <= c.lo && x.end > c.lo)[0];
    const ownersInRegion = ALL_DECLS.filter((d) => d.start >= r.start && d.end < r.end).length;
    ok(ownersInRegion > c.p.names.length,
      'candidate at ' + c.lo + ' spans ' + c.p.names.length + ' of its region\'s '
      + ownersInRegion + ' owners, so the banner screen ranked the region and not the candidate');
  }
  // THE SHIPPED LAYER IS THE BEST CLEAN CANDIDATE, on both axes at once.
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load))
    .sort((a, b) => a.p.nine - b.p.nine || b.units - a.units);
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of the candidates run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the load-time rule discriminates rather than passing everything');
  eq(candidateRuns.filter((c) => c.p.nine === 1 && runsNothingAtLoad(c.load)).length,
    CLEAN_SCORING_ONE, 'of the five scoring 1, three are clean and two are disqualified by it');
  eq([clean[0].lo, clean[0].hi], [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    'the best clean candidate IS the layer that shipped…');
  eq(clean[0].units, UNDO.MODULE_CHARS,
    '…and the largest of those scoring 1: lowest coupling and most bytes were the same candidate');
}
// OPENING ON `function` IS NOT A FIRST. Counted, because "the first layer
// that…" has been written from a partial look four times in this programme.
{
  const BANNER = /^[ \t]*\/\/ ─{2,}[ \t]+\S/;
  const opensOnBanner = CHAIN.filter(
    (rel) => BANNER.test(fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n')[0]));
  eq(opensOnBanner.length, LAYERS_OPENING_ON_A_BANNER,
    'LAYERS_OPENING_ON_A_BANNER of the chain open on a ── banner');
  eq(CHAIN.length - opensOnBanner.length, CHAIN_LENGTH - LAYERS_OPENING_ON_A_BANNER,
    '…and TWELVE do not, so opening on `function` is the minority habit, not a new one');
  ok(!BANNER.test(OPENING_LINE), '…and this layer is one of the minority');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. What capped the cut at one owner');
// ─────────────────────────────────────────────────────────────────────────────
{
  const measured = SITE_ENDS.map((row) => {
    const p = profile([RAW_AT_IN_CODE, row.end]);
    const l = loadTimeProfile(RAW_AT_IN_CODE, row.end);
    return { end: row.end, owners: p.names.length, units: row.end - RAW_AT_IN_CODE,
      nine: p.nine, loadTime: l.stmtLines };
  });
  eq(measured, SITE_ENDS,
    'three ends from the same start: one owner, two, three — their sizes, scores and load-time '
    + 'statement counts, as a whole table so a dropped row cannot pass');
  eq(SITE_ENDS[SHIPPED_ROW].end, BODY_END_IN_CODE, 'the layer that shipped is the first row');
  eq(SITE_ENDS[SHIPPED_ROW].loadTime, 0, '…the only one that runs nothing at load');
  ok(SITE_ENDS[1].units > SITE_ENDS[0].units && SITE_ENDS[2].units > SITE_ENDS[1].units,
    '…and the SMALLEST of the three, so the case against it is stated rather than hidden');
  for (const row of [SITE_ENDS[1], SITE_ENDS[2]]) {
    ok(loadTimeProfile(RAW_AT_IN_CODE, row.end).reads.indexOf('window') >= 0,
      'the ' + row.owners + '-owner cut reads `window` at evaluation time…');
  }
}
{
  eq(BASE_CODE.indexOf(EXPOSURE_LINE), EXPOSURE_AT, 'the module-scope exposure sits at EXPOSURE_AT');
  ok(EXPOSURE_AT > BODY_END_IN_CODE, '…after the shipped body, so this cut left it behind…');
  ok(EXPOSURE_AT < SITE_ENDS[1].end && EXPOSURE_AT < SITE_ENDS[2].end,
    '…and inside both larger cuts, which is what disqualified them');
  ok(!insideFunction(EXPOSURE_AT), '…and it is at top level, not inside any function body');
  eq(LIVE_CODE.indexOf(EXPOSURE_LINE) >= 0, true,
    '…and it is still in the shipped monolith: this layer relocated no side effect');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, and does nothing at load');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the module has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED, 'it loads in a COMPLETELY empty VM, defining one global');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
  eq(typeof ctx._backendEnrichedPositionsToAggregatedOptions, 'function',
    '…and the function its single caller reaches for is there');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    setInterval: () => { watched.push('setInterval'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; },
      setItem: () => { watched.push('localStorage.setItem'); } },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; },
      addEventListener: () => { watched.push('doc.addEventListener'); } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(watched, [], 'loading it performs no fetch, starts no timer, reads no storage and binds no listener');
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
{
  const E = 'BACKEND_POSITIONS_AGGREGATE_UNDO_';
  throwsWith(() => UNDO.undoBackendPositionsAggregate(1, MODULE), E + 'BAD_INPUT',
    'a non-string document is refused');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX, 1), E + 'BAD_INPUT',
    '…as is a non-string module');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX, MODULE + ' '), E + 'MODULE_IDENTITY',
    'a module one unit too long is refused');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX, MODULE + '\n'), E + 'MODULE_IDENTITY',
    '…and so is one that re-absorbed the separator, on length');
  // THE SEPARATOR GUARD needs a module of the RIGHT size, or the size guard
  // shadows it. Only the final code character differs here.
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX, MODULE.slice(0, -2) + 'x\n'),
    E + 'MODULE_SEPARATOR',
    '…and a same-size module not ending on a closing brace gets the separator error, so a '
    + 'caller learns WHICH invariant broke');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX.replace(TAG, ''), MODULE),
    E + 'TAG_IDENTITY', 'a missing tag is refused');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX.replace(TAG, TAG + TAG), MODULE),
    E + 'TAG_IDENTITY', '…as is a duplicate');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(
    INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
  E + 'TAG_ADJACENCY', 'a reordered tag is refused');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(
    INDEX.replace(TAG + INLINE_OPEN, TAG + '<!-- x -->' + INLINE_OPEN), MODULE),
  E + 'TAG_ADJACENCY', '…and so is content wedged between the tag and the monolith');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(INDEX.replace('<body', '<body data-x'), MODULE),
    E + 'EXTRACTED_IDENTITY', 'foreign content anywhere in the document is refused');
  throwsWith(() => UNDO.undoBackendPositionsAggregate(BASE, MODULE),
    E + 'TAG_IDENTITY', 'an already-unextracted document is refused rather than double-undone');
  // AND THE HAPPY PATH STILL WORKS, so the guards above are not simply "throws always".
  eq(UNDO.undoBackendPositionsAggregate(INDEX, MODULE), BASE,
    'control — the unmutated inputs still reconstruct the base exactly');
  eq(UNDO.isApplied(INDEX), true, 'isApplied reports the layer present on the shipped document');
  eq(UNDO.isApplied(BASE), false, '…and absent on the base it reconstructs');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Reachability, the chain, and exact production scope');
// ─────────────────────────────────────────────────────────────────────────────
{
  const dead = ALL_DECLS.filter((d) => {
    const self = (i) => i >= d.start && i <= d.end;
    return refSites(MASKED, d.name).filter((i) => !self(i)).length === 0 &&
      refSites(STRINGS, d.name).length === 0 && refSites(STATIC_MARKUP, d.name).length === 0 &&
      refSites(OTHER_INLINE, d.name).length === 0 &&
      SIBLINGS.every((s) => refSites(s.masked, d.name).length === 0 &&
        refSites(s.strings, d.name).length === 0);
  });
  eq(dead.length, DEAD_DECLS, 'DEAD_DECLS of the base monolith\'s declarations are named nowhere');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…DEAD_UNITS of code');
  eq(dead.filter((d) => OWNERS_EXPECTED.indexOf(d.name) >= 0).map((d) => d.name), [],
    '…and this layer is not among them: it is live code with a live caller');
}
{
  eq(CHAIN.length, CHAIN_LENGTH, 'CHAIN_LENGTH layers ship today');
  eq(Array.from(new Set(CHAIN)).length, CHAIN_LENGTH,
    '…each exactly once: a chain with a duplicated entry is a chain missing a layer');
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, '…and this one is the newest, read off the tail');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');

  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at SMALLEST_CHARS units');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS, 'the chain\'s largest is still LARGEST_CHARS');
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer sits at MODULE_SIZE_RANK by size — smaller than every layer but one');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS,
    '…and the module at that rank is this one, by its undo helper\'s own pin');
  ok(bySize[0].units < UNDO.MODULE_CHARS,
    '…and larger than the smallest, so it displaces no superlative and re-pins no contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\\n`, this one among them');

  const HELPERS = fs.readdirSync(path.join(ROOT, 'tests/lib'))
    .filter((f) => /-undo\.js$/.test(f) && f !== 'post-journal-mcx-pr3-undo.js')
    .map((f) => require(path.join(ROOT, 'tests/lib', f)));
  const forLayer = CHAIN.map((rel) => {
    const hit = HELPERS.filter((M) => typeof M.TAG === 'string' && M.TAG.indexOf('/' + rel + '"') >= 0);
    return hit.length === 1 ? hit[0] : null;
  });
  eq(forLayer.filter(Boolean).length, CHAIN_LENGTH,
    'every layer in CHAIN resolves to exactly one undo helper by its own TAG');
  const withSeparator = forLayer.filter((M) => Object.prototype.hasOwnProperty.call(M, 'SEPARATOR'));
  eq(withSeparator.length, LAYERS_WITH_SEPARATOR,
    'LAYERS_WITH_SEPARATOR carry a SEPARATOR export, this one among them');
  eq(CHAIN_LENGTH - withSeparator.length, LAYERS_WITHOUT_SEPARATOR,
    '…and the eight oldest have no separator concept at all');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…but not all of them pin a single RAW_CHARS one unit longer than MODULE_CHARS, so the '
    + 'pair is not the tell the separator is');
}
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-technical-merge.js', 'js/portfolio/portfolio-technical-alignment-debug.js', 'js/services/journal-map-audit.js', 'js/services/dxlink-greeks-fetch.js', 'js/portfolio/portfolio-technical-parity.js', 'js/portfolio/portfolio-spy-price.js', 'js/services/apex-storage-recovery.js'].sort(),
    'production footprint is index.html, this module, and the module of every layer cut after it');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  ok(changed.indexOf(UNDO_REL) >= 0, 'the byte-exact undo helper is part of the change');
  ok(changed.indexOf(AUDIT_REL) >= 0, 'the temporary audit removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    'no temporary audit is shipped: this contract replaces it one for one');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so the name has
  // to be the one the base actually carried.
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)),
    'the audit\'s mutation spec is gone with the audit it targeted');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_SPEC_REL]), '',
    '…and that path is the one the base commit carried, not merely a path that does not exist');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + AUDIT_REL]), '', '…as is the audit\'s own path');
  // RETIRED in #460, thirty-three layers down the chain: the mutation budget is
  // finite, so specs retire in chain order once their layer is long settled. The
  // CONTRACT is untouched and still runs every assertion on every push — what
  // left is the per-pin mutation pass over it. The assertion that used to prove
  // the spec EXISTS now proves it is GONE, so the retirement is executed rather
  // than remembered.
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    'this contract\'s mutation spec is retired: the budget moved on, the contract did not');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite matches the pin above: the audit left as this contract arrived');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'js/portfolio/portfolio-technical-merge.js' || rel === 'js/portfolio/portfolio-technical-alignment-debug.js' ||
    rel === 'js/services/journal-map-audit.js' || rel === 'js/services/dxlink-greeks-fetch.js' || rel === 'js/portfolio/portfolio-spy-price.js' || rel === 'js/services/apex-storage-recovery.js' ||
    rel === 'js/portfolio/portfolio-technical-parity.js' ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
}

console.log('\n' + pass + ' assertions passed.');
console.log('BACKEND_POSITIONS_AGGREGATE_BOUNDARY_OK');
