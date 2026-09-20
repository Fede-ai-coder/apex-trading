'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// JOURNAL MAP AUDIT — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #462 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/journal-map-audit-undo.js
// reconstructs the pre-extraction document byte for byte, and §8 asserts the
// production footprint is index.html plus the one new file.
//
// WHAT MOVED. [719625,723944) in monolith coordinates — 4,319 raw units: THREE
// top-level owners and one closing newline. `_journalMapAuditEnabled` (306)
// reads two opt-in flags and returns false unless one is set;
// `_journalMapAuditSummarize` (2,024) folds per-leg diagnostics into a summary
// and an anomaly list; `_journalMapAudit` (924) is the wrapper that calls both
// and either logs verbosely or emits one compact warning. Together they are the
// WHOLE of the `[JOURNAL-PORTFOLIO-MAP-AUDIT]` feature.
//
// IT OPENS ON THE FEATURE'S OWN BANNER, not on a declaration. §2 pins that line
// exactly, and §8 counts how many of the chain's layers do the same — twenty,
// so opening on a banner is neither a rule nor a first, and saying which it is
// needs the count rather than the impression.
//
// ONE DEPENDENCY, AND IT IS DISTANT. `optionLegScalarDiagnostics` lives 195,735
// units away under a different banner, so the module calls it at call time.
// MONOLITH_DEPENDENCIES is exactly that one name, and §3 counts the shipped set
// rather than judging: ELEVEN contracts pin a non-empty list, this one among
// them, so a runtime dependency is the ordinary case in this chain.
//
// ONE EDGE REACHES IN, AND THE TWO READINGS AGREE. `positionManager` calls the
// wrapper from inside a function body, and that is the entirety of the inbound
// coupling. The nine-direction score and the `byConsumer` reading BOTH read 2,
// so §3 pins their EQUALITY rather than their difference: this region is not
// one of the set the #458 refinement separates, and that is worth executing
// because the layer before this one rested on the opposite case.
//
// ── THE FINDING THIS LAYER CARRIES: THE SCREEN'S TOP PICK CUT IT IN HALF ────
//
// Ranked by the consumer reading, the best candidate the screen produced at
// this base was [719173,722863) — 3,690 units, `byConsumer` 1, no dependencies
// — and it was wrong twice.
//
// IT STARTED AT THE WRONG BANNER. 719173 is the `// ═══ PORTFOLIO MANAGER ═══`
// SECTION header, 452 units before the feature's own `// ── ` banner. Every
// line between the two is comment or blank, and that prose names five top-level
// declarations, NONE of which the region declares and one of which is the
// region's own consumer. §5 pins that set by equality, not by a loop: #462's
// mutation pass found the sampled version survived a mutant that simply dropped
// an element, because a per-member loop never checks the list's completeness.
//
// IT STOPPED ONE OWNER SHORT, AND THAT IS WHY IT SCORED WELL. `_journalMapAudit`
// is this feature's own wrapper. The screen read it as "the consumer" and scored
// the region 1. Include it, as the feature does, and the reading is 2.
//
// SO THE CONSUMER SCORE IS NOT COMPARABLE ACROSS CUTS OF DIFFERENT WIDTHS. §5
// re-scores this same feature at FOUR widths and shows the reading moving with
// the width alone. The mechanism is executed rather than described: the narrow
// cut's two inbound edges sit at 723081 and 723252, both INSIDE the recommended
// region, so widening the cut deletes the very edges it was scored on. A low
// consumer score is partly a fact about WHERE THE CUT WAS MADE. The score ranks
// candidates; it does not choose boundaries.
//
// AND THE OBVIOUS FIX IS FALSE. "Never cut inside a `// ── ` banner region"
// looks like the rule that would have caught this, and the cycle immediately
// before this one refutes it: #459 cut `_mergeBatchInto` and left its consumer
// `fetchPortfolioTechnicalRefresh` behind, and BOTH sit under the same
// `// ── [PortfolioRefreshPayload]` banner. That cut was right and is in
// production. §5 reconstructs the pre-#459 document through two shipped undo
// helpers and executes the counterexample, so this is the THIRD dead boundary
// rule the programme has written down and measured away — the other two are
// pinned in §6 of tests/extraction-boundary-rule-contract.test.js.
//
// THE REGION WAS NOT REACHABLE BY THE SCREEN AT ALL, which §5(d) also executes:
// a run begins only at a banner-region start or at a top-level declaration, and
// 719625 is a banner INSIDE a larger section, so no run begins there. The screen
// could not have proposed this region however it were ranked — which is why the
// boundary is a judgement an audit publishes and defends rather than a rule that
// computes it.
//
// §5 IS HERE BECAUSE THE AUDIT THAT FIRST MEASURED IT IS DELETED BY THIS SAME
// PR. Every clause of it re-executes on this contract's own numbers.
//
// FIFTH OF THIRTY-SIX BY SIZE, measured in §8 and not described here. At 4,318
// units this layer changes no superlative: the vega monitor (1,761) keeps
// smallest and the traffic light (71,811) keeps largest.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 80th and final local script
// (index 79 of 80), which is what MODULE_POSITION pins, and §6 loads it in a
// COMPLETELY empty VM: three globals defined, and no fetch, timer, storage read
// or listener. §6 also CALLS all three owners, and gives the gate a control on
// inputs where the answer DIFFERS — a metric whose true value is `false` needs
// one, or `return false` is indistinguishable from reading the flags.
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
const UNDO = require('./lib/journal-map-audit-undo.js');
const PORTFOLIO_TECHNICAL_PARITY_U = require('./lib/portfolio-technical-parity-undo.js');
const DXLINK_GREEKS_FETCH_U = require('./lib/dxlink-greeks-fetch-undo.js');
// The #459 counterexample in §5 is measured on the document that cut actually
// faced, reconstructed by the shipped undo helpers rather than remembered.
const ALIGNMENT_DEBUG_U = require('./lib/portfolio-technical-alignment-debug-undo.js');
const TECHNICAL_MERGE_U = require('./lib/portfolio-technical-merge-undo.js');

const MODULE_REL = 'js/services/journal-map-audit.js';
const TAG = '<script src="./js/services/journal-map-audit.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-technical-alignment-debug.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '6c2f01f';
const CONTRACT_REL = 'tests/journal-map-audit-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/journal-map-audit-undo.js';
const AUDIT_REL = 'tests/temporary-journal-map-audit-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/journal-map-audit-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/journal-map-audit-contract.spec.js';
// The commit that retired it, so the negations below are pinned against a path
// that really existed rather than one that never did. It is also the revision
// the spec's own numbers are read out of, now that the file is gone.
const SPEC_RETIRED_FROM = '9dae61e';
// Chain-order retirement resumes this cycle: the layer that was newest at the
// base is no longer newest, so its spec goes. §8 pins that path the same way it
// pins the audit's — by what the BASE commit carried, because absence alone is
// satisfied by any wrong path.
const RETIRED_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-contract.spec.js';

// Ratchet. The suite file count as it stands TODAY. Phase 1 advanced it to 164;
// this phase deletes that audit as this contract arrives, one for one, so the
// count is unchanged.
const TEST_FILE_COUNT = 167;
const LOCAL_SCRIPT_COUNT = 80;
const MODULE_POSITION = 79;

// ── The boundary, in MONOLITH coordinates (of the reconstructed base) ────────
const CODE_AT = 114613;
const CODE_CHARS = 1385816;
const RAW_AT_IN_CODE = 719625;
const RAW_END_IN_CODE = 723944;
const BODY_END_IN_CODE = 723943;
const TOP_LEVEL_DECLS = 943;
const TOP_LEVEL_BANNERS = 223;
const OWNER_REGIONS = 121;
const RESIDUAL_MONOLITH = 1381497;
const TAG_GAP = 719633;
const NET_REDUCTION = 4260;

// ── The three owners ─────────────────────────────────────────────────────────
const OWNERS_EXPECTED = ['_journalMapAuditEnabled', '_journalMapAuditSummarize', '_journalMapAudit'];
const OWNER_COUNT = 3;
const FUNCTION_OWNERS = 3;
const OWNER_SIZES = [306, 2024, 924];
const BODY_ENDING = '}\n';
const FEATURE_BANNER = '// ── [JOURNAL-PORTFOLIO-MAP-AUDIT] — gated mapping diagnostics ─────────────────';
const WRAPPER_NAME = '_journalMapAudit';
const CODE_LINES = 67;
const TOTAL_LINES = 92;
const COMMENT_LINES = 25;
const OPENING_COMMENT_LINES = 22;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [727567];
const EDGE_HOSTS = ['positionManager'];
const DISTINCT_CONSUMERS = 1;
const MONOLITH_DEPENDENCIES = ['optionLegScalarDiagnostics'];
const DEPENDENCY_AT = 915360;
const DEPENDENCY_DISTANCE = 195735;
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 2;
const BY_CONSUMER = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 3;
// This contract pins a non-empty list, so it is counted IN. The census is over
// every shipped `-boundary-contract.test.js`, this file included.
const LAYERS_WITH_A_DEPENDENCY = 12;

// ── The screen, re-executed on this contract's own numbers ───────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7625;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3258;
const CLEAN_CANDIDATES = 2007;
const ONE_CONSUMER_CANDIDATES = 3;
const ONE_CONSUMER_MULTI_SITE = 135;

// ── THE FINDING: the screen's top pick, and the four widths ──────────────────
const SECTION_HEADER_AT = 719173;
const BANNER_OFFSET = 452;
const SECTION_HEADER_TEXT = '// ═══════════════════════════════════════════════════════════════';
// EVERY top-level declaration the section prose names — the WHOLE set, not a
// sample, and asserted by equality. #462's pass found the sampled version
// survived a mutant that simply dropped an element.
const FOREIGN_PROSE_NAMES = ['aggregateGreeks', 'journalManager', 'positionManager',
  'refreshPositionsLive', 'renderPositionsPanel'];
// The same feature scored at four widths. Only the width changes.
const WIDTH_SCREEN_PICK = { at: 719173, end: 722863, units: 3690, owners: 2, consumers: 1, deps: 0, byConsumer: 1 };
const WIDTH_OWN_BANNER_2 = { at: 719625, end: 722863, units: 3238, owners: 2, consumers: 1, deps: 0, byConsumer: 1 };
const WIDTH_RECOMMENDED = { at: 719625, end: 723943, units: 4318, owners: 3, consumers: 1, deps: 1, byConsumer: 2 };
const WIDTH_SECTION_PLUS_3 = { at: 719173, end: 723943, units: 4770, owners: 3, consumers: 1, deps: 1, byConsumer: 2 };
const INTERNAL_SITES = [723081, 723252];
// The dead rule, and the cycle that refutes it.
const DEAD_RULE_LAYER = 'js/portfolio/portfolio-technical-merge.js';
const DEAD_RULE_REGION_OWNER = '_mergeBatchInto';
const DEAD_RULE_CONSUMER = 'fetchPortfolioTechnicalRefresh';
const DEAD_RULE_SHARED_BANNER = true;
// How many dead boundary rules the OTHER contract pins, and which ordinal that
// makes this one. Both executed, because "the third" quantifies over a set.
const DEAD_RULES_ELSEWHERE = 2;
const DEAD_RULE_ORDINAL = 3;

// ── Reachability at this base ────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;
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
];
const CHAIN_LENGTH = 36;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 5;
const LAYERS_ENDING_BRACE = 33;
const LAYERS_WITH_SEPARATOR = 28;
const LAYERS_WITH_RAW_PAIR = 25;
const LAYERS_WITHOUT_SEPARATOR = 8;
const PURE_ASCII_LAYERS = 2;
const UNDOCUMENTED_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 20;

// ── The mutant budget, at this base ──────────────────────────────────────────
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 177;
const RETIRED_MUTANTS = 89 + 82;
// This layer's own contribution to the mutant budget. The LIVE total is not
// pinned here: it is a fact about the suite TODAY, which every later audit moves
// by design, and pinning it made the next cycle's Phase 1 fail on a contract it
// had not touched.
const CONTRACT_SPEC_MUTANTS = 93;
const MUTANT_BUDGET = 250;
const LAYER_CONTRACT_SPECS = 1;

let pass = 0;
function ok(v, m) { assert.ok(v, m); pass++; }
function eq(a, b, m) { assert.deepStrictEqual(a, b, m); pass++; }
function throwsWith(fn, msg, m) {
  assert.throws(fn, (e) => e instanceof Error && e.message === msg, m);
  pass++;
}
function section(t) { console.log('\n' + t); }
function count(haystack, needle) {
  let total = 0, at = 0;
  while ((at = haystack.indexOf(needle, at)) >= 0) { total++; at += needle.length; }
  return total;
}
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
function codeLines(src) { return src.split('\n').filter((l) => !isBlankOrComment(l)).length; }
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

console.log('JOURNAL MAP AUDIT — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited by #462 · base=' + BASE_SHA);

// The DXLink greeks-fetch layer was cut AFTER this one, so it is newer: peel it
// FIRST, and LIVE_* below means this layer's own shipped document — the one it
// was written against — not whatever the head of the chain looks like today.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_PORTFOLIO_TECHNICAL_PARITY = PORTFOLIO_TECHNICAL_PARITY_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_TECHNICAL_PARITY_U.undoPortfolioTechnicalParity(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-parity.js'), 'utf8'))
  : HEAD_INDEX;
const LIVE_INDEX = DXLINK_GREEKS_FETCH_U.isApplied(PRE_PORTFOLIO_TECHNICAL_PARITY)
  ? DXLINK_GREEKS_FETCH_U.undoDxlinkGreeksFetch(
      PRE_PORTFOLIO_TECHNICAL_PARITY, fs.readFileSync(path.join(ROOT, 'js/services/dxlink-greeks-fetch.js'), 'utf8'))
  : PRE_PORTFOLIO_TECHNICAL_PARITY;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const INDEX = UNDO.undoJournalMapAudit(LIVE_INDEX, MODULE);
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

// The siblings are the modules that had ALREADY left at this base, which is the
// set this region could have depended on. The module this layer ships is not
// among them — it did not exist yet.
const SIBLINGS = LOCALS.map((rel) => {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  return {
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
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
  const per = SIBLINGS.map((s) => ({ bound: s.bound, idx: occurrenceIndex(s.masked) }));
  for (const d of DECLS) {
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
const countIn = (sites, lo, hi) => lowerBound(sites, hi) - lowerBound(sites, lo);

function profile(range) {
  const names = DECLS.filter((d) => d.start >= range[0] && d.end < range[1]).map((d) => d.name);
  const nameSet = new Set(names);
  const outside = (i) => i < range[0] || i >= range[1];
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
// Which banner governs an offset — the last `// ── ` or `// ═══` mark at or
// before it. §5 needs this for the dead rule and for nothing else.
const SORTED_MARKS = MARKS.slice().sort((a, b) => a - b);
function bannerOf(i, marks) {
  const ms = marks || SORTED_MARKS;
  let b = -1;
  for (const m of ms) { if (m <= i) b = m; else break; }
  return b;
}

const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REGIONS = mergedRegions(MARKS);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is EXTRACTED_CHARS units');
eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…EXTRACTED_UTF8 bytes');
eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…EXTRACTED_LF line feeds');
eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and this digest');
eq(LIVE_LOCALS.length, LOCAL_SCRIPT_COUNT, 'it loads LOCAL_SCRIPT_COUNT local application scripts');
eq(LIVE_LOCALS.indexOf(MODULE_REL), MODULE_POSITION,
  '…this module being the LAST of them, at MODULE_POSITION');
eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
  '…which is read off the tail directly, so the endpoint is pinned by position too');
eq(count(LIVE_INDEX, TAG), 1, 'exactly one tag for it, no duplicate');
eq(count(LIVE_INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1,
  '…loaded immediately after the alignment debug pair and immediately before the monolith');

eq(INDEX.length, UNDO.BASE_CHARS, 'the reconstructed base is BASE_CHARS units');
eq(sha256(INDEX), UNDO.BASE_SHA256, '…and carries the base digest');
eq(sha256(git(['show', BASE_SHA + ':index.html'])), UNDO.BASE_SHA256,
  'and that digest is the one the base COMMIT carries, not merely one the helper remembers');
eq(LOCALS.length, UNDO.BASE_LOCAL_SCRIPTS, 'the base loaded one fewer local script');
eq(LOCAL_SCRIPT_COUNT - UNDO.BASE_LOCAL_SCRIPTS, 1, '…exactly one fewer: this layer');
eq(INDEX.indexOf(CODE), CODE_AT, 'the base monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and ran CODE_CHARS units');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it declared TOP_LEVEL_DECLS names at top level');
eq(MARKS.length, TOP_LEVEL_BANNERS, '…under TOP_LEVEL_BANNERS top-level banners');
eq(REGIONS.length, OWNER_REGIONS, '…which merge into OWNER_REGIONS regions that own a declaration');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE, BODY,
  'THE RELOCATION CLAIM: the shipped module is the audited block\'s bytes, character for '
  + 'character — not a formatted, re-indented or re-ordered copy of them');
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is MODULE_CHARS units');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…MODULE_UTF8 bytes');
eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…MODULE_LF line feeds');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and the digest audit #462 predicted before the move');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE).length, UNDO.RAW_CHARS,
  'the raw fragment was RAW_CHARS units: the body plus one structural separator');
eq(UNDO.RAW_CHARS - UNDO.MODULE_CHARS, 1, '…exactly one, which is the separator');
eq(MODULE.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line');
eq(MODULE.slice(0, MODULE.indexOf('\n')), FEATURE_BANNER,
  'IT OPENS ON THE FEATURE\'S OWN BANNER, not on a declaration and not on the section header');
ok(/[^\x00-\x7F]/.test(MODULE),
  'it is NOT pure ASCII — the banner\'s box-drawing rule alone settles that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0].start;
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  ok(next > RAW_END_IN_CODE,
    'the next top-level owner began AFTER the raw span, with no banner between — the '
    + '`tt-reconnect` shape, where "extend to the next header" would swallow the next feature');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declared exactly these three names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…all three functions');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes, in declaration order');
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the module is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment: this module is heavily documented, '
    + 'which §8 states as a count over the chain rather than as a superlative');
}
eq(count(CODE, FEATURE_BANNER), 1,
  'the banner this module opens on appeared EXACTLY once in the base monolith, so the seam '
  + 'above is not one of several places that line could have matched');
eq(count(APP_LOADER.parseScriptTags(LIVE_INDEX)
  .filter((t) => !t.src && t.inline.length > 1000)[0].inline, FEATURE_BANNER), 0,
'…and it appears nowhere in the shipped monolith: the region left rather than being copied');
// What the move cost, measured against what the audit predicted.
eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, NET_REDUCTION,
  'index.html fell by NET_REDUCTION units net: the span left and a tag arrived');
eq(UNDO.RAW_CHARS - NET_REDUCTION, TAG.length,
  '…and the difference is exactly the tag line this layer added');
eq(APP_LOADER.parseScriptTags(LIVE_INDEX)
  .filter((t) => !t.src && t.inline.length > 1000)[0].inline.length, RESIDUAL_MONOLITH,
'the monolith is left at RESIDUAL_MONOLITH units');
eq(CODE_CHARS - UNDO.RAW_CHARS, RESIDUAL_MONOLITH, '…which is the base monolith minus this span');
{
  const tagAt = LIVE_INDEX.indexOf(TAG);
  eq(LIVE_INDEX.slice(tagAt + TAG.length, tagAt + TAG.length + INLINE_OPEN.length), INLINE_OPEN,
    'the tag sits immediately before the inline monolith opens');
  eq((CODE_AT + RAW_AT_IN_CODE) - (CODE_AT - INLINE_OPEN.length), TAG_GAP,
    'so the tag line begins TAG_GAP units before the fragment it replaced');
  eq(TAG_GAP - RAW_AT_IN_CODE, INLINE_OPEN.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'ONE reference reaches in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at this exact site');
ok(REC.sites.every(insideFunction), '…inside a function body, so it does not run at load');
eq(consumersOf(REC), EDGE_HOSTS, '…hosted by ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it depends on exactly ONE monolith declaration, named rather than counted');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen, outboundModule: REC.outModule,
}, ZERO_DIRECTIONS,
'the other EIGHT directions measure zero: no write in, none through, none out, no markup '
  + 'either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 2 — one inbound site and one dependency');
eq(byConsumer(REC), BY_CONSUMER, '…and the consumer reading agrees at BY_CONSUMER');
eq(FULL_NINE, BY_CONSUMER,
  'THE TWO READINGS AGREE HERE, because the one inbound edge is one site AND one consumer — '
  + 'this region is not one of the set the #458 refinement separates');
// "…unlike the layer immediately before this one" is a claim about a specific
// other file, so it is read out of that file rather than remembered.
{
  const prev = fs.readFileSync(path.join(ROOT,
    'tests/portfolio-technical-alignment-debug-boundary-contract.test.js'), 'utf8');
  const nine = Number(prev.match(/^const FULL_NINE = (\d+);$/m)[1]);
  const cons = Number(prev.match(/^const BY_CONSUMER = (\d+);$/m)[1]);
  ok(nine !== cons,
    '…and the layer immediately before this one is the opposite case, read out of ITS contract: '
    + 'its two readings differ, so agreement is worth pinning rather than assuming');
}
// The dependency is real and too far away to absorb.
{
  const d = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  ok(d, MONOLITH_DEPENDENCIES[0] + ' is a monolith declaration…');
  eq(d.start, DEPENDENCY_AT, '…at DEPENDENCY_AT');
  eq(d.start - RAW_AT_IN_CODE, DEPENDENCY_DISTANCE,
    '…DEPENDENCY_DISTANCE units away, under a different banner, so absorbing it was not on '
    + 'the table and the module calls it at call time');
  ok(bannerOf(d.start) !== bannerOf(RAW_AT_IN_CODE),
    '…which the banner governing each of them confirms: they are different');
  eq(SIBLINGS.filter((s) => s.owners.indexOf(MONOLITH_DEPENDENCIES[0]) >= 0).map((s) => s.rel), [],
    '…and no already-extracted module owns that name either');
  ok(refSites(maskLiterals(MODULE), MONOLITH_DEPENDENCIES[0]).length > 0,
    '…and the shipped module really does name it, so the dependency is the module\'s and not '
    + 'a property of the coordinates alone');
}
// A runtime dependency is the ORDINARY case, counted over the shipped set rather
// than asserted from the layers nearest to hand. This contract is counted IN:
// its own list is non-empty, so excluding it would understate the ordinary case.
{
  const files = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f));
  const withDep = files.filter((f) => {
    const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
    const m = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
    if (!m) return false;
    try { return JSON.parse(m[1].replace(/'/g, '"')).length > 0; } catch (e) { return false; }
  });
  eq(withDep.length, LAYERS_WITH_A_DEPENDENCY,
    'LAYERS_WITH_A_DEPENDENCY shipped contracts pin a non-empty MONOLITH_DEPENDENCIES, so '
    + 'having one is the ordinary case and this region is not the exception it would be '
    + 'without that count');
  ok(withDep.indexOf(path.basename(CONTRACT_REL)) >= 0,
    '…this contract among them, which is why it is counted in rather than excluded');
  ok(withDep.length < files.length,
    '…and contracts with an EMPTY list exist, so the count measures something');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. What the feature is, and that the consumer is outside it');
// ─────────────────────────────────────────────────────────────────────────────
{
  const wrapper = BY_NAME.get(WRAPPER_NAME);
  ok(wrapper.start >= RAW_AT_IN_CODE && wrapper.end < RAW_END_IN_CODE,
    'the wrapper ' + WRAPPER_NAME + ' is INSIDE the region this layer took…');
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and the one consumer is declared outside it');
  // The three owners form one connected graph — unlike the layer before this
  // one, whose two owners were strangers. Stated as a measurement, not a virtue.
  const bodies = OWNERS_EXPECTED.map((n) => {
    const d = BY_NAME.get(n);
    return maskLiterals(CODE.slice(d.start, d.end + 1));
  });
  eq(refSites(bodies[2], OWNERS_EXPECTED[0]).length > 0, true,
    'the wrapper names ' + OWNERS_EXPECTED[0] + '…');
  eq(refSites(bodies[2], OWNERS_EXPECTED[1]).length > 0, true, '…and ' + OWNERS_EXPECTED[1]);
  eq(refSites(bodies[0], OWNERS_EXPECTED[2]).length, 0,
    '…while neither of them names the wrapper back, so the graph is a star and not a cycle');
  ok(refSites(bodies[0], OWNERS_EXPECTED[1]).length === 0,
    'control — the two leaves do not name each other either, so "connected" here rests '
    + 'entirely on the wrapper this cut kept');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE FINDING: the screen\'s own top pick cut this feature in half');
// ─────────────────────────────────────────────────────────────────────────────
// (a) It started at the SECTION header, not at the feature's banner.
{
  eq(RAW_AT_IN_CODE - SECTION_HEADER_AT, BANNER_OFFSET,
    'the screen\'s run began BANNER_OFFSET units before the feature\'s own banner');
  eq(CODE.slice(SECTION_HEADER_AT, SECTION_HEADER_AT + SECTION_HEADER_TEXT.length),
    SECTION_HEADER_TEXT, '…on a `═══` SECTION rule, which is a different kind of mark');
  const between = CODE.slice(SECTION_HEADER_AT, RAW_AT_IN_CODE);
  eq(between.split('\n').filter((l) => !isBlankOrComment(l)).length, 0,
    '…and every line between the two is comment or blank: it is prose, not code');
  eq(DECLS.filter((d) => refSites(between, d.name).length > 0).map((d) => d.name).sort(),
    FOREIGN_PROSE_NAMES.slice().sort(),
    '…prose naming EXACTLY these top-level declarations — the whole set asserted by equality, '
    + 'so dropping one from the pin fails rather than merely looping less');
  eq(FOREIGN_PROSE_NAMES.filter((n) => OWNERS_EXPECTED.indexOf(n) >= 0), [],
    '…so the 452 units the screen would have dragged in describe other code entirely');
  ok(FOREIGN_PROSE_NAMES.indexOf(EDGE_HOSTS[0]) >= 0,
    'one of those names IS this region\'s own consumer, so the pick would have shipped a '
    + 'paragraph describing the caller it leaves behind');
  eq(MODULE.indexOf(SECTION_HEADER_TEXT), -1,
    'and the shipped module carries none of that section rule: the cut taken is the narrower '
    + 'start, which is the half of the finding that changed what shipped');
}
// (b) It stopped one owner short, and that is WHY it scored well.
{
  const widths = [WIDTH_SCREEN_PICK, WIDTH_OWN_BANNER_2, WIDTH_RECOMMENDED, WIDTH_SECTION_PLUS_3];
  for (const w of widths) {
    const p = profileOf([w.at, w.end]);
    eq(w.end - w.at, w.units, 'width [' + w.at + ',' + w.end + ') is ' + w.units + ' units');
    eq(DECLS.filter((d) => d.start >= w.at && d.end < w.end).length, w.owners, '…with ' + w.owners + ' owners');
    eq(consumersOf(p).length, w.consumers, '…' + w.consumers + ' consumer');
    eq(p.deps.length, w.deps, '…' + w.deps + ' dependency');
    eq(byConsumer(p), w.byConsumer, '…and byConsumer ' + w.byConsumer);
    ok(runsNothingAtLoad(loadTimeProfile(w.at, w.end)), '…and all four run nothing at load');
  }
  // THE POINT: the reading moves with the WIDTH, on the same feature.
  ok(WIDTH_SCREEN_PICK.byConsumer < WIDTH_RECOMMENDED.byConsumer,
    'the narrower cut scores BETTER than the feature it is a part of');
  eq(WIDTH_SCREEN_PICK.owners + 1, WIDTH_RECOMMENDED.owners,
    '…and the only difference is one owner');
  eq(WIDTH_OWN_BANNER_2.byConsumer, WIDTH_SCREEN_PICK.byConsumer,
    'the two 2-owner widths score the same despite different starts…');
  eq(WIDTH_SECTION_PLUS_3.byConsumer, WIDTH_RECOMMENDED.byConsumer,
    '…and so do the two 3-owner widths, which is the control that isolates WIDTH from BANNER');
  const narrow = profileOf([WIDTH_SCREEN_PICK.at, WIDTH_SCREEN_PICK.end]);
  eq(narrow.sites, INTERNAL_SITES,
    'the narrow cut\'s inbound edges are INTERNAL_SITES — both inside the wrapper it excluded');
  eq(consumersOf(narrow), [WRAPPER_NAME],
    '…so the "consumer" it scored against IS this feature\'s own wrapper');
  for (const s of INTERNAL_SITES) {
    ok(s >= RAW_AT_IN_CODE && s < RAW_END_IN_CODE,
      '…and site ' + s + ' lies INSIDE the region this layer took, so the edge is internal to '
      + 'the feature and vanished once the cut was made whole');
  }
  eq(REC.sites.filter((s) => INTERNAL_SITES.indexOf(s) >= 0), [],
    'and the whole-feature profile counts NEITHER of them, which is the mechanism: widening '
    + 'a cut deletes the edges it used to cross');
}
// (c) The obvious rule that would catch it is FALSE, and the counterexample is
//     the cycle immediately before this one — executed, not remembered.
{
  ok(bannerOf(BY_NAME.get(OWNERS_EXPECTED[0]).start) === bannerOf(BY_NAME.get(WRAPPER_NAME).start),
    'HERE the region and its apparent consumer share one banner, which invites the rule '
    + '"never cut inside a banner region"');
  // Reconstruct the document #459 actually faced, newest-first, through the
  // shipped undo helpers rather than a remembered copy.
  let old = ALIGNMENT_DEBUG_U.undoPortfolioTechnicalAlignmentDebug(
    INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-alignment-debug.js'), 'utf8'));
  old = TECHNICAL_MERGE_U.undoPortfolioTechnicalMerge(
    old, fs.readFileSync(path.join(ROOT, DEAD_RULE_LAYER), 'utf8'));
  eq(sha256(old), TECHNICAL_MERGE_U.BASE_SHA256,
    '…the pre-#459 document, reached byte for byte by two undo helpers that ship green');
  const oldTags = APP_LOADER.parseScriptTags(old);
  const oldCode = oldTags.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  const oldDecls = scanTopLevelDeclarations(oldCode);
  const oldMarks = topLevelBanners(oldCode, functionBodyRanges(oldCode)).slice().sort((a, b) => a - b);
  const oldBy = new Map(oldDecls.map((d) => [d.name, d]));
  const region = oldBy.get(DEAD_RULE_REGION_OWNER);
  const consumer = oldBy.get(DEAD_RULE_CONSUMER);
  ok(region && consumer, 'both the #459 region and its consumer are in that document');
  eq(bannerOf(region.start, oldMarks) === bannerOf(consumer.start, oldMarks), DEAD_RULE_SHARED_BANNER,
    'THEY SHARE A BANNER TOO — and #459 cut between them, correctly. So "never cut inside a '
    + 'banner region" is FALSE, and is pinned here as dead rather than adopted');
  ok(fs.existsSync(path.join(ROOT, DEAD_RULE_LAYER)),
    '…which the shipped module proves: that cut is in production');
  // "THE THIRD dead boundary rule" is an ordinal over a set, which is exactly
  // the shape CLAUDE.md records being written wrong four times from a partial
  // look. It is derived from the file that holds the other two rather than
  // counted from memory, so it fails if that file gains or loses one.
  const RULE_CONTRACT = 'tests/extraction-boundary-rule-contract.test.js';
  const ruleSrc = fs.readFileSync(path.join(ROOT, RULE_CONTRACT), 'utf8');
  eq((ruleSrc.match(/^\s*\/\/ DEAD RULE \d+: /gm) || []).length, DEAD_RULES_ELSEWHERE,
    'the boundary-rule contract pins DEAD_RULES_ELSEWHERE dead rules of its own…');
  eq(DEAD_RULES_ELSEWHERE + 1, DEAD_RULE_ORDINAL,
    '…so the one this section kills is the DEAD_RULE_ORDINAL the header calls it, derived '
    + 'rather than remembered');
}
// (d) The screen could not have proposed this region however it ranked.
{
  const startsRunsAt = new Set();
  for (const r of REGIONS) {
    startsRunsAt.add(r.start);
    for (const d of DECLS.filter((x) => x.start >= r.start && x.end < r.end)) startsRunsAt.add(d.start);
  }
  ok(startsRunsAt.has(SECTION_HEADER_AT), 'the screen can begin a run at the section header…');
  ok(!startsRunsAt.has(RAW_AT_IN_CODE),
    '…and CANNOT begin one at the feature\'s own banner: a run starts at a region start or at '
    + 'a declaration, and this banner is neither');
  ok(DECLS.every((d) => d.start !== RAW_AT_IN_CODE), '…because no declaration begins there');
  ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0,
    '…though it IS a banner the screen knows about, which is what makes the gap structural '
    + 'rather than an oversight');
}
// (e) The screen itself, re-executed here because the audit that ran it is
//     deleted by this same PR.
{
  const seen = new Set();
  const candidateRuns = [];
  let rawRuns = 0, seamRejected = 0;
  for (const r of REGIONS) {
    const own = DECLS.filter((d) => d.start >= r.start && d.end < r.end);
    for (let i = 0; i < own.length; i++) {
      for (let j = i; j < own.length; j++) {
        const lo = i === 0 ? r.start : own[i].start;
        const hi = j + 1 < own.length ? own[j + 1].start : r.end;
        rawRuns++;
        const be = snapBodyEnd(CODE, lo, hi);
        if (be <= lo || be - lo < RUN_FLOOR) continue;
        try { assertSeam(CODE, lo, be); } catch (e) { seamRejected++; continue; }
        const key = lo + ':' + be;
        if (seen.has(key)) continue;
        seen.add(key);
        candidateRuns.push({ lo, hi: be, units: be - lo });
      }
    }
  }
  eq(rawRuns, RAW_RUNS, 'the regions yielded RAW_RUNS contiguous owner runs');
  eq(seamRejected, SEAM_REJECTED, '…of which SEAM_REJECTED were refused by assertSeam');
  eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct extractable candidates');
  for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of them run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the evaluation-time rule still discriminates');
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_CANDIDATES,
    'ONE_CONSUMER_CANDIDATES had a coupling that is exactly one consumer and nothing else');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE had one consumer and more than one site, so the #458 refinement '
    + 'still separates part of the set');
  const best = clean.filter((c) => byConsumer(c.p) === 1).sort((a, b) => b.units - a.units)[0];
  eq([best.lo, best.hi], [WIDTH_SCREEN_PICK.at, WIDTH_SCREEN_PICK.end],
    'and the screen\'s top-ranked candidate is the one this section takes apart');
  eq(best.units, WIDTH_SCREEN_PICK.units, '…at WIDTH_SCREEN_PICK units');
  ok(!clean.some((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE),
    '…and the region this layer took is NOT in the candidate set, as (d) explains');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, does nothing at load, and all three owners run');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the module has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'the SHIPPED FILE loads in a COMPLETELY empty VM, defining all three globals');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
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
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(watched, [],
    'loading it performs no fetch, starts no timer, reads no storage and binds no listener — '
    + 'note it reads localStorage when CALLED, which is exactly the distinction');
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}
// ALL THREE ARE CALLED. A feature that loads bare but throws on its own shape
// would satisfy every clause above.
const mkCtx = (over) => {
  const c = Object.assign({
    console: { log() {}, warn() {}, error() {}, debug() {} },
    localStorage: { getItem: () => null }, window: {},
    Math, JSON, Array, String, Object,
    optionLegScalarDiagnostics: (tk, id, idx) => ({ ticker: tk, tradeId: id, legIndex: idx, anomalies: [] }),
  }, over);
  vm.createContext(c);
  vm.runInContext(MODULE, c);
  return c;
};
{
  // The gate's true value is `false`, so it needs inputs where the answer DIFFERS.
  eq(mkCtx({})._journalMapAuditEnabled(), false, 'with no flag set the audit is OFF, as shipped');
  eq(mkCtx({ window: { APEX_DEBUG_JOURNAL_MAP: true } })._journalMapAuditEnabled(), true,
    'control — the window flag turns it ON, so the gate reads the flag rather than returning false');
  eq(mkCtx({ localStorage: { getItem: (k) => (k === 'APEX_DEBUG_JOURNAL_MAP' ? '1' : null) } })
    ._journalMapAuditEnabled(), true,
  'control — and so does the localStorage flag, which is the second documented path');
}
{
  const c = mkCtx({});
  const trade = { ticker: 'SPY', id: 't1' };
  const sum = c._journalMapAuditSummarize(trade, [{ ticker: 'SPY', tradeId: 't1', legIndex: 0, anomalies: [] }]);
  eq(Object.keys(sum).sort(), ['anomalies', 'summary'],
    'the summariser returns a summary and an anomaly list, which is the shape its wrapper reads');
  ok(Array.isArray(sum.anomalies), '…the anomalies being an array');
  ok(sum.anomalies.length > 0,
    '…and a trade with no portfolioId IS flagged, so the summariser is measuring rather than '
    + 'returning an empty list');
  eq(sum.anomalies.map((a) => a.kind).indexOf('missing-portfolioId') >= 0, true,
    '…naming the missing field it found');
  const quiet = [];
  const c2 = mkCtx({ console: { log() {}, warn: () => quiet.push('warn'), error() {}, debug: () => quiet.push('debug') } });
  c2._journalMapAudit(trade, [{}]);
  eq(quiet, ['warn'],
    'and the wrapper runs: with the gate OFF and an anomaly present it emits exactly one '
    + 'compact warning, and no verbose debug output');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
eq(UNDO.undoJournalMapAudit(LIVE_INDEX, MODULE), INDEX,
  'the undo reconstructs the base exactly — the whole point of the helper');
eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied answers true for the shipped document');
eq(UNDO.isApplied(INDEX), false, '…and false for the document that predates this layer');
eq(UNDO.isApplied(42), false, '…and false, rather than throwing, for a non-string');
throwsWith(() => UNDO.undoJournalMapAudit(42, MODULE),
  'JOURNAL_MAP_AUDIT_UNDO_BAD_INPUT', 'a non-string document is refused by name');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX, 42),
  'JOURNAL_MAP_AUDIT_UNDO_BAD_INPUT', '…as is a non-string module');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX, MODULE + 'x'),
  'JOURNAL_MAP_AUDIT_UNDO_MODULE_IDENTITY', 'a padded module is refused');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX, MODULE.slice(0, -1)),
  'JOURNAL_MAP_AUDIT_UNDO_MODULE_IDENTITY', '…as is a truncated one');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX, MODULE + '\n'),
  'JOURNAL_MAP_AUDIT_UNDO_MODULE_IDENTITY',
  '…and so is one that RE-ABSORBED the structural separator: it is one unit too long');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX, MODULE.slice(0, -2) + 'x\n'),
  'JOURNAL_MAP_AUDIT_UNDO_MODULE_SEPARATOR',
  'a module of the right LENGTH that no longer ends on a closing brace gets its own error');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX, ' ' + MODULE.slice(1)),
  'JOURNAL_MAP_AUDIT_UNDO_MODULE_IDENTITY',
  'a module of the right length and ending whose BYTES differ is caught by the digest');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX.replace(TAG, ''), MODULE),
  'JOURNAL_MAP_AUDIT_UNDO_TAG_IDENTITY', 'a document with no tag is refused');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX.replace(TAG, TAG + TAG), MODULE),
  'JOURNAL_MAP_AUDIT_UNDO_TAG_IDENTITY', '…as is one with the tag twice');
throwsWith(() => UNDO.undoJournalMapAudit(
  LIVE_INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
'JOURNAL_MAP_AUDIT_UNDO_TAG_ADJACENCY', 'a REORDERED tag is refused by adjacency');
throwsWith(() => UNDO.undoJournalMapAudit(LIVE_INDEX + 'x', MODULE),
  'JOURNAL_MAP_AUDIT_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere is refused');
{
  const stranded = LIVE_INDEX.slice(0, UNDO.RAW_AT) + '\n' + LIVE_INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoJournalMapAudit(stranded, MODULE),
    'JOURNAL_MAP_AUDIT_UNDO_EXTRACTED_IDENTITY',
    '…and a structural separator left inline is rejected by the whole-document gate');
}
throwsWith(() => UNDO.undoJournalMapAudit(INDEX, MODULE),
  'JOURNAL_MAP_AUDIT_UNDO_TAG_IDENTITY',
  'an ALREADY-unextracted document is refused rather than silently doubled');

// ─────────────────────────────────────────────────────────────────────────────
section('8. Reachability, the chain, and exact production scope');
// ─────────────────────────────────────────────────────────────────────────────
{
  const dead = DECLS.filter((d) => {
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
    '…and NONE of the three owners is among them: the feature is live code');
}
{
  eq(CHAIN.length, CHAIN_LENGTH, 'CHAIN_LENGTH layers ship today');
  eq(Array.from(new Set(CHAIN)).length, CHAIN_LENGTH,
    '…each exactly once: a chain with a duplicated entry is a chain missing a layer');
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, '…and this one is the newest, read off the tail');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');
  // CHAIN IS AN ORDER, NOT A SET, and until #459 nothing said so: a mutant that
  // swapped two entries survived the whole pass, because membership, length and
  // the tail were all checked and the sequence between them was not.
  {
    const tagAt = CHAIN.map((rel) => LIVE_INDEX.indexOf('<script src="./' + rel + '"></script>'));
    ok(tagAt.every((at) => at >= 0), 'every layer in CHAIN has its tag in the shipped document');
    for (let i = 1; i < tagAt.length; i++) {
      ok(tagAt[i] > tagAt[i - 1],
        'CHAIN is in cut order: ' + CHAIN[i] + ' loads after ' + CHAIN[i - 1]);
    }
    ok(tagAt[tagAt.length - 1] < LIVE_INDEX.indexOf(INLINE_OPEN + '\n'),
      '…and the whole chain precedes the inline monolith');
  }

  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const bySize = CHAIN.map((rel, i) => ({ rel, units: sources[i].length }))
    .sort((a, b) => a.units - b.units);
  eq(bySize[0].rel, SMALLEST_MODULE, 'the vega monitor is still the smallest');
  eq(bySize[0].units, SMALLEST_CHARS, '…at SMALLEST_CHARS units');
  eq(bySize[bySize.length - 1].units, LARGEST_CHARS, 'the chain\'s largest is still LARGEST_CHARS');
  eq(bySize.findIndex((x) => x.rel === MODULE_REL) + 1, MODULE_SIZE_RANK,
    'this layer sits at MODULE_SIZE_RANK of thirty-six by size — near the small end, not AT it');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS,
    '…and the module at that rank is this one, by its undo helper\'s own pin');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\\n`, this one among them');

  // EVERY CLAIM BELOW IS A COUNT OVER THE WHOLE CHAIN, NOT AN ADJECTIVE. Each of
  // these was a superlative waiting to be written wrong: "the first module that
  // opens on a banner", "the only one that is not ASCII", "the best documented".
  // CLAUDE.md records four such claims that were each inferred from the layers
  // nearest to hand and each wrong, so they are executed here instead.
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'exactly PURE_ASCII_LAYERS layers in the chain are pure ASCII');
  ok(/[^\x00-\x7F]/.test(MODULE), '…and this one is NOT among them, so that count is unchanged');
  ok(sources.some((s) => !/[^\x00-\x7F]/.test(s)),
    '…and pure-ASCII layers do exist, so the count measures something');
  eq(sources.filter((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length === 0).length,
    UNDOCUMENTED_LAYERS, 'exactly UNDOCUMENTED_LAYERS layers carry no comment line at all');
  ok(MODULE.split('\n').filter((l) => /^\s*\/\//.test(l)).length > 0,
    '…and this one is the opposite case, so that count is unchanged too');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line, this one among them');
  ok(/^\/\/ ── /.test(MODULE.split('\n')[0]), '…which the module\'s own first line confirms');
  ok(CHAIN_LENGTH - LAYERS_OPENING_ON_BANNER > 0,
    '…and the rest do not, so opening on one is neither a rule nor a first');

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
    ['index.html', MODULE_REL, 'js/services/dxlink-greeks-fetch.js', 'js/portfolio/portfolio-technical-parity.js'].sort(),
    'production footprint is exactly index.html, this layer\'s module, and the module of every layer cut after it');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  // CONTRACT_REL NAMES THIS FILE, and until #461's mutation pass nothing said so
  // in the contract that carried it: a mutant pointing it at a NEIGHBOURING
  // contract survived, because every use was satisfied by that file too.
  eq(fs.readFileSync(path.join(ROOT, CONTRACT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and CONTRACT_REL is the path of THIS file, byte for byte, so §3 counts this contract '
    + 'and no other');
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
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'and the previous newest layer\'s spec is retired, chain-order retirement having resumed');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…that path too being one the base commit carried');
  ok(fs.existsSync(path.join(ROOT, 'tests/portfolio-technical-alignment-debug-boundary-contract.test.js')),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  // RETIRED IN #465, in chain order. Every assertion in this file still runs on
  // every push; what stops is the mutation pass proving those pins load-bearing.
  // The assertion is kept as its NEGATION rather than deleted, because a deleted
  // line would pass for the wrong reason.
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    'this contract\'s mutation spec was RETIRED, so the newest layer carries the pass');
  eq(git(['cat-file', '-e', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]), '',
    '…and that path is the one this cycle removed, not merely a path that never existed');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite matches the pin above: the audit left as this contract arrived');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'js/services/dxlink-greeks-fetch.js' || rel === 'js/portfolio/portfolio-technical-parity.js' ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
  // The budget, executed rather than narrated.
  {
    const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
    const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
    const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
    eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
      .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
    'the base declared BASE_DECLARED_MUTANTS mutants');
    // WHAT THE LIVE TOTAL IS, this contract does NOT pin, and the distinction
    // cost a cycle to learn. The arithmetic above is a fact about the commit
    // that shipped this layer and stays true forever; `declaredNow` is a fact
    // about the suite TODAY, which every later audit moves by design. Pinning
    // the live number here made the next cycle's Phase 1 fail on a contract it
    // had not touched. What survives is the INVARIANT, and this layer's own
    // contribution to it.
    // READ OUT OF THE REVISION THAT LAST CARRIED IT. The spec is retired, so
    // requiring it would throw; what it HELD is a fact about that commit and
    // stays true forever, which is why the pin survives the retirement.
    const specAt = git(['show', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]);
    eq((specAt.match(/\n  \{ id: "/g) || []).length, CONTRACT_SPEC_MUTANTS,
      'this contract\'s spec carried CONTRACT_SPEC_MUTANTS mutants, one per pin');
    ok(specAt.indexOf("target: '" + CONTRACT_REL + "'") >= 0,
      '…and it targeted THIS contract, not a neighbouring one');
    // HOW BIG THE RETIREMENT WAS, read out of the base commit rather than
    // remembered. RETIRED_MUTANTS lost its only consumer when the live-total
    // pin above was replaced, and a constant nothing reads is a constant whose
    // mutant survives — which is how this assertion came to be written.
    const entriesAt = (rel) => (git(['show', BASE_SHA + ':' + rel]).match(/\n  \{ id: "/g) || []).length;
    eq(entriesAt(AUDIT_SPEC_REL) + entriesAt(RETIRED_SPEC_REL), RETIRED_MUTANTS,
      '…and the two specs this cycle retired carried RETIRED_MUTANTS between them, counted '
      + 'in the base commit that still holds both');
    ok(entriesAt(AUDIT_SPEC_REL) > 0 && entriesAt(RETIRED_SPEC_REL) > 0,
      '…each of them non-empty, so the sum is two real specs and not one plus a typo');
    // WHAT THE LIVE TOTAL NO LONGER COUNTS is this contract's 93: they left with
    // the spec. The live number is read only for the ceiling invariant below,
    // which is the part that stays true however many layers ship after this one.
    eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
    ok(declaredNow < budgetNow, '…and the live declared total is under it');
    const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
      .filter((f) => /-contract\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
    eq(layerSpecs.length, LAYER_CONTRACT_SPECS,
      'exactly LAYER_CONTRACT_SPECS layer contract spec is committed');
    eq(layerSpecs.indexOf(path.basename(CONTRACT_SPEC_REL)), -1,
      '…and it is NOT this one: the newest layer keeps a spec, and only the newest');
  }
}

console.log('\n' + pass + ' assertions passed.');
console.log('JOURNAL_MAP_AUDIT_CONTRACT_OK');
