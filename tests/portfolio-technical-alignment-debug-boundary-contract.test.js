'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// PORTFOLIO TECHNICAL ALIGNMENT DEBUG — PERMANENT BOUNDARY CONTRACT.
//
// Phase 2 of the cycle audit #460 opened. RELOCATION ONLY: the module is the
// audited block's bytes verbatim, tests/lib/portfolio-technical-alignment-debug-
// undo.js reconstructs the pre-extraction document byte for byte, and §8 asserts
// the production footprint is index.html plus the one new file.
//
// WHAT MOVED. [990716,994856) in monolith coordinates — 4,140 raw units: TWO
// top-level owners, `buildPortfolioTechnicalAlignmentDebug` (3,405) and
// `mapLimit` (731), and one closing newline. Two functions, zero top-level
// statements, 64 lines of code out of 69, and not one comment line.
//
// IT DEPENDS ON NOTHING, BECAUSE EVERYTHING ARRIVES AS A PARAMETER. Neither
// owner names a declaration of the monolith: MONOLITH_DEPENDENCIES is EMPTY, not
// short. Ten shipped contracts pin a non-empty list, so a runtime dependency is
// the ordinary case in this chain and having none is the thing worth recording.
// §3 also measures the OTHER direction: nothing it writes goes through a name it
// does not own.
//
// FIVE SITES, ONE CONSUMER. All five inbound references are hosted by
// `refreshPositionsLive`, so the nine-direction score reads 5 while the coupling
// is ONE consumer — the distinction audit #458 introduced and this layer is the
// second to rest on. §4 re-executes both readings over the whole candidate set
// rather than citing the audit, which this same PR deletes.
//
// `mapLimit` SOUNDS SHARED AND IS NOT. §4 measures exactly one call site in the
// whole application, none in any sibling module and none in markup, while the
// monolith runs 22 `Promise.all` sites that do not route through it. Its
// generality is unexercised, not shared — which is what makes a generic-sounding
// helper a one-consumer region.
//
// THE FINDING THIS LAYER CARRIES: A COHESION CRITERION, MEASURED AND RETIRED.
// The two owners do not reference each other. They sit two blank lines apart
// with no banner between them, adjacent by accident. That prompted an objection
// worth taking seriously — a module named for one feature should not carry an
// unrelated utility, and bundling two strangers would be a first for this chain
// — which would have cost 733 units had it been applied.
//
// It was measured instead, and it did not survive. Of the 34 layers cut BEFORE
// this one, 27 ship more than one owner and only TEN have owners that form one
// connected graph under "names the other". SEVENTEEN already ship disconnected
// sets, and three of them have this layer's exact two-owners/one-connected
// shape. Bundling strangers is the MAJORITY case, 17 to 10, so the criterion was
// retired rather than applied. §5 re-executes that count on this contract's own
// numbers.
//
// FOURTH OF THIRTY-FIVE BY SIZE, measured in §8 and not described here. At 4,139
// units this layer changes no superlative: the vega monitor (1,761) keeps
// smallest and the traffic light (71,811) keeps largest, so this change re-pins
// nothing in any earlier contract.
//
// TWO COUNTS WHERE "FIRST" WOULD HAVE BEEN WRONG. This module is pure ASCII and
// carries no comment line at all, and each of those is a superlative waiting to
// be written wrong. §8 states both as counts over the chain: PURE_ASCII_LAYERS
// is 2 and UNDOCUMENTED_LAYERS is 2, this module being the second of each. A
// comment-share RANK is deliberately not pinned — at a share of zero the rank is
// a tie, and a tie is not a rank.
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 79th and final local script
// (index 78 of 79), which is what MODULE_POSITION pins, and §6 loads it in a
// COMPLETELY empty VM: two globals defined, and no fetch, timer, storage read or
// listener. §6 also CALLS both owners — separately, because nothing in the file
// connects them — since a pair that loads bare but throws on its own shape would
// satisfy every other clause in this file.
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
const UNDO = require('./lib/portfolio-technical-alignment-debug-undo.js');
const APEX_STORAGE_RECOVERY_U = require('./lib/apex-storage-recovery-undo.js');
const PORTFOLIO_SPY_PRICE_U = require('./lib/portfolio-spy-price-undo.js');
const PORTFOLIO_TECHNICAL_PARITY_U = require('./lib/portfolio-technical-parity-undo.js');
const DXLINK_GREEKS_FETCH_U = require('./lib/dxlink-greeks-fetch-undo.js');
const JOURNAL_MAP_AUDIT_U = require('./lib/journal-map-audit-undo.js');

const MODULE_REL = 'js/portfolio/portfolio-technical-alignment-debug.js';
const TAG = '<script src="./js/portfolio/portfolio-technical-alignment-debug.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/portfolio/portfolio-technical-merge.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '5210693';
const CONTRACT_REL = 'tests/portfolio-technical-alignment-debug-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/portfolio-technical-alignment-debug-undo.js';
const AUDIT_REL = 'tests/temporary-portfolio-technical-alignment-debug-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/portfolio-technical-alignment-debug-contract.spec.js';
// The commit that retired it, so the negation above is pinned against a path that
// really existed rather than one that never did.
const SPEC_RETIRED_FROM = '6c2f01f';

// Ratchet. The suite file count as it stands TODAY. A Phase 1 audit advances it
// in every contract that carries it; Phase 2 deletes that audit as the next
// contract arrives, so this cycle leaves the count exactly where #460 put it.
const TEST_FILE_COUNT = 168;
const LOCAL_SCRIPT_COUNT = 79;
const MODULE_POSITION = 78;

// ── The boundary, in MONOLITH coordinates ────────────────────────────────────
const CODE_AT = 114535;
const CODE_CHARS = 1389956;
const RAW_AT_IN_CODE = 990716;
const RAW_END_IN_CODE = 994856;
const BODY_END_IN_CODE = 994855;
const TOP_LEVEL_BANNERS = 223;
const RESIDUAL_MONOLITH = 1385816;
const TAG_GAP = 990724;
const NET_REDUCTION = 4062;

// ── The two owners ───────────────────────────────────────────────────────────
const OWNERS_EXPECTED = ['buildPortfolioTechnicalAlignmentDebug', 'mapLimit'];
const OWNER_COUNT = 2;
const FUNCTION_OWNERS = 2;
const OWNER_SIZES = [3405, 731];
const BODY_ENDING = '}\n';
const OPENING_LINE = 'function buildPortfolioTechnicalAlignmentDebug(ticker, pos, technical) {';
const PARAMETERS = ['ticker', 'pos', 'technical'];
const HELPER_PARAMETERS = ['items', 'limit', 'worker'];
const CODE_LINES = 64;
const TOTAL_LINES = 69;
const COMMENT_LINES = 5;
const OPENING_COMMENT_LINES = 0;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 5;
const EDGE_SITES = [1136310, 1162463, 1162564, 1167182, 1167277];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0, outboundModule: 0,
};
const FULL_NINE = 5;
const BY_CONSUMER = 1;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 2;
const LAYERS_WITH_A_DEPENDENCY = 14;
const HELPER_CALL_SITES = 1;
const PROMISE_ALL_SITES = 22;

// ── The screen, re-executed on this contract's own numbers ───────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7690;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3322;
const CLEAN_CANDIDATES = 2059;
const ONE_CONSUMER_CANDIDATES = 5;
const ONE_CONSUMER_MULTI_SITE = 163;
const BEST_BY_CONSUMER_UNITS = 4139;
const RUNNER_UP_UNITS = 3690;
const RUNNER_UP_OWNERS = ['_journalMapAuditEnabled', '_journalMapAuditSummarize'];

// ── THE COHESION CRITERION, PROPOSED AND REFUTED ─────────────────────────────
// Counted over the 34 layers cut BEFORE this one, which is the set the objection
// quantified over: "this chain does not ship modules whose owners are
// strangers". Counting this layer in would make the claim partly about itself.
const OWNERS_REFERENCE_EACH_OTHER = false;
const OWNER_GAP = '\n\n';
const PRIOR_LAYERS = 34;
const MULTI_OWNER_LAYERS = 27;
const CONNECTED_LAYERS = 10;
const DISCONNECTED_LAYERS = 17;
const SAME_SHAPE_OWNERS = 2;
const SAME_SHAPE_CONNECTED = 1;
const SAME_SHAPE_LAYERS = [
  'js/ui/tt-reconnect.js',
  'js/services/journal-snapshot-prefetch.js',
  'js/portfolio/portfolio-dxlink-greeks.js',
];
const SOLO_CUT_FORGONE = 733;

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
];
const CHAIN_LENGTH = 35;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 4;
const LAYERS_ENDING_BRACE = 32;
const LAYERS_WITH_SEPARATOR = 27;
const LAYERS_WITH_RAW_PAIR = 24;
const LAYERS_WITHOUT_SEPARATOR = 8;
const PURE_ASCII_LAYERS = 2;
const UNDOCUMENTED_LAYERS = 2;

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

console.log('PORTFOLIO TECHNICAL ALIGNMENT DEBUG — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited by #460 · base=' + BASE_SHA);

// The journal map-audit layer was cut AFTER this one, so it is newer: peel it
// FIRST, and LIVE_* below means this layer's own shipped document — the one it
// was written against — not whatever the head of the chain looks like today.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const PRE_APEX_STORAGE_RECOVERY = APEX_STORAGE_RECOVERY_U.isApplied(HEAD_INDEX)
  ? APEX_STORAGE_RECOVERY_U.undoApexStorageRecovery(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/services/apex-storage-recovery.js'), 'utf8'))
  : HEAD_INDEX;
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
const LIVE_INDEX = JOURNAL_MAP_AUDIT_U.isApplied(PRE_DXLINK_GREEKS_FETCH)
  ? JOURNAL_MAP_AUDIT_U.undoJournalMapAudit(
      PRE_DXLINK_GREEKS_FETCH, fs.readFileSync(path.join(ROOT, 'js/services/journal-map-audit.js'), 'utf8'))
  : PRE_DXLINK_GREEKS_FETCH;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));
const LIVE_CODE = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const INDEX = UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, MODULE);
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
    rel, masked: maskLiterals(src), strings: literalView(src, maskLiterals, stripComments),
    bound: locallyBound(src), owners: scanTopLevelDeclarations(src).map((d) => d.name),
  };
});
const STATIC_MARKUP = INDEX.slice(0, INDEX.indexOf('<script')) +
  INDEX.split(/<script[^>]*>/).map((c) => c.split('</script>')[1] || '').join('\n');
const OTHER_INLINE = TAGS.filter((t) => !t.src && t.inline !== CODE).map((t) => t.inline).join('\n');
const MODULE_OWNERS = new Map();
for (const s of SIBLINGS) for (const n of s.owners) if (!MODULE_OWNERS.has(n)) MODULE_OWNERS.set(n, s.rel);

// AN OCCURRENCE INDEX, BUILT ONCE. §4 scores three thousand candidate runs, and
// the obvious `profile` rescans the 1.4-million-unit monolith once per
// declaration name per run — a shape that does not finish at this scale. Every
// position of every identifier is collected once instead, and a range query
// becomes two binary searches. The tokenisation is the one `refSites` uses, an
// identifier not preceded by `.` or a word character, so the numbers are
// unchanged; §3 re-derives this region's own profile with `refSites` directly,
// which is what says so.
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
  // INVERTED: the body's own identifiers are walked once, rather than asking all
  // 945 declarations whether they appear in it. Same answer, and it is what
  // makes three thousand candidates affordable.
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
// Does a range RUN anything while it loads? Both halves matter: a bare
// statement at module scope, and a read of a name at evaluation time.
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

// THE #458 DISTINCTION, WHICH THIS LAYER IS THE SECOND TO REST ON. `profile`
// counts inbound reference SITES. Five calls from the same function is ONE
// consumer relationship, not five, and the nine-direction score cannot tell them
// apart. This derives the hosts of a range's inbound sites, so "how many
// consumers" can be measured rather than inferred from the score.
const hostOf = (i) => DECLS.filter((d) => i >= d.start && i <= d.end).pop();
function consumersOf(p) {
  return Array.from(new Set(p.sites.map((i) => (hostOf(i) || { name: '(TOP LEVEL)' }).name))).sort();
}
// The same nine directions with inbound collapsed to DISTINCT CONSUMERS. Every
// other direction is unchanged; only the inbound term is re-read.
const byConsumer = (p) => consumersOf(p).length + p.inWrites + p.inPropWrites +
  p.outWrites.length + p.deps.length + p.sib + p.mkp + p.gen + p.outGen + p.outModule;

// The coordinates are spelled _IN_CODE throughout, because this file also pins
// index.html offsets and the two are not the same number. Short aliases would
// read as pins the mutation spec has to cover, so the full names are used.
const REC = profileOf([RAW_AT_IN_CODE, RAW_END_IN_CODE]);
const BODY = CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE);
const REGIONS = mergedRegions(MARKS);

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index is the extracted length');
eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…the extracted byte count');
eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…the extracted line-feed count');
eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and the extracted digest');
eq(LIVE_LOCALS.length, LOCAL_SCRIPT_COUNT, 'it loads LOCAL_SCRIPT_COUNT local application scripts');
eq(LIVE_LOCALS.indexOf(MODULE_REL), MODULE_POSITION, '…this module last of them, at MODULE_POSITION');
eq(LIVE_LOCALS.length - 1, MODULE_POSITION,
  '…which is the tail slot, read as an index rather than asserted as a word');
eq(LIVE_LOCALS.filter((r) => r === MODULE_REL).length, 1, '…and exactly once, never twice');

eq(INDEX.length, UNDO.BASE_CHARS, 'the reconstruction reaches the pinned base length');
eq(Buffer.byteLength(INDEX, 'utf8'), UNDO.BASE_UTF8, '…the pinned base byte count');
eq((INDEX.match(/\n/g) || []).length, UNDO.BASE_LF, '…the pinned base line-feed count');
eq(sha256(INDEX), UNDO.BASE_SHA256, '…and the pinned base digest, byte for byte');
eq(LOCALS.length, UNDO.BASE_LOCAL_SCRIPTS, '…carrying one fewer local script than the shipped one');
eq(LOCAL_SCRIPT_COUNT - UNDO.BASE_LOCAL_SCRIPTS, 1, '…exactly one, which is this layer');
eq(sha256(git(['show', BASE_SHA + ':index.html'])), UNDO.BASE_SHA256,
  'and that base digest is the one the base COMMIT carries, not merely one this file remembers');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT in the base');
eq(CODE.length, CODE_CHARS, '…and runs CODE_CHARS units');
eq(LIVE_CODE.length, RESIDUAL_MONOLITH, 'the SHIPPED monolith is RESIDUAL_MONOLITH units');
eq(CODE_CHARS - LIVE_CODE.length, UNDO.RAW_CHARS,
  '…exactly the raw fragment shorter, so nothing but this layer left the monolith');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE.length, UNDO.MODULE_CHARS, 'the module is MODULE_CHARS units');
eq(Buffer.byteLength(MODULE, 'utf8'), UNDO.MODULE_UTF8, '…MODULE_UTF8 bytes');
eq((MODULE.match(/\n/g) || []).length, UNDO.MODULE_LF, '…MODULE_LF line feeds');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and this digest');
eq(MODULE, CODE.slice(RAW_AT_IN_CODE, BODY_END_IN_CODE),
  'THE RELOCATION IDENTITY: the module IS the block, not a copy edited on the way out');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + '\n',
  '…and the raw fragment is that block plus exactly one structural separator');
eq(MODULE.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line, so it did not absorb the separator');
eq(MODULE.slice(0, MODULE.indexOf('\n')), OPENING_LINE, 'it opens on the first function declaration');
ok(!/[^\x00-\x7F]/.test(MODULE),
  'it IS pure ASCII — unlike the layer immediately before it in the chain, which §8 counts');
eq(UNDO.MODULE_UTF8, UNDO.MODULE_CHARS,
  '…which is why its UTF-8 and UTF-16 lengths are the same number, and not a coincidence');
{
  const nextOwner = DECLS.filter((d) => d.start > RAW_AT_IN_CODE && d.start >= RAW_END_IN_CODE)[0].start;
  eq(nextOwner, RAW_END_IN_CODE, 'the next top-level owner begins exactly where the raw span ends');
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, nextOwner), BODY_END_IN_CODE,
    '…and snapping that chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts the shipped boundary on all four invariants');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these two names at top level');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and both are functions');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes, the larger one first');
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the module is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment: the whole module carries none');
}
// The tag, and what it cost.
eq(count(LIVE_INDEX, TAG), 1, 'the shipped document carries exactly one tag for this module');
eq(count(LIVE_INDEX, ANCHOR_TAG + TAG), 1, '…immediately after the previous newest layer');
eq(count(LIVE_INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1, '…and immediately before the inline monolith');
eq(UNDO.RAW_CHARS - TAG.length, NET_REDUCTION,
  'the span left and a tag arrived: index.html fell by NET_REDUCTION units net');
eq(UNDO.BASE_CHARS - UNDO.EXTRACTED_CHARS, NET_REDUCTION, '…which is what the two pinned lengths differ by');
ok(NET_REDUCTION < UNDO.RAW_CHARS,
  'control — the reduction is NET: smaller than the span, because the tag costs bytes too');
eq(UNDO.RAW_AT - LIVE_INDEX.indexOf(TAG), TAG_GAP,
  'the one added tag line begins TAG_GAP units before the fragment it replaced');
eq(UNDO.REINSERT_AT, UNDO.RAW_AT,
  '…so once it is removed the base offset applies directly, which is why REINSERT_AT is RAW_AT');

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'FIVE references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'the pair depends on NOTHING the monolith declares — the list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen, outboundModule: REC.outModule,
}, ZERO_DIRECTIONS,
'EIGHT of the nine directions measure zero: no write in, none through, none out, '
  + 'no markup either way, no sibling module, and nothing that already left');
eq(REC.nine, FULL_NINE, 'nine directions, total score 5 — five inbound sites and nothing else');
// EVERYTHING EITHER OWNER TOUCHES ARRIVES AS A PARAMETER. That is why the
// dependency list is empty, so it is measured rather than inferred from it.
{
  eq(/function\s+buildPortfolioTechnicalAlignmentDebug\s*\(([^)]*)\)/.exec(MODULE)[1]
    .split(',').map((p) => p.trim()), PARAMETERS,
  'the builder takes the ticker, the position and the technical payload');
  eq(/function\s+mapLimit\s*\(([^)]*)\)/.exec(MODULE)[1].split(',').map((p) => p.trim()),
    HELPER_PARAMETERS, '…and mapLimit takes the items, the limit and the worker');
  const bound = locallyBound(MODULE);
  for (const p of PARAMETERS.concat(HELPER_PARAMETERS)) {
    ok(bound.has(p), p + ' is locally bound, so it is no inbound dependency');
  }
  const masked = maskLiterals(MODULE);
  eq(refSites(masked, 'S').length, 0, 'neither owner names `S`, so the #424/#455 rule does not arise');
  eq(propertyWriteBases(masked).filter((b) => BY_NAME.has(b)), [],
    'it writes no property through any monolith declaration — every write goes through a name '
    + 'the module owns or was handed');
  ok(propertyWriteBases(masked).length > 0,
    'control — it DOES write properties, so the clause above is a measurement and not an '
    + 'absence of writes');
}
// A runtime dependency is the ORDINARY case, counted over the shipped set.
{
  const withDep = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => /-boundary-contract\.test\.js$/.test(f) && f !== path.basename(CONTRACT_REL))
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

// ─────────────────────────────────────────────────────────────────────────────
section('4. Five sites, ONE consumer — and a generic name that is not shared');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(consumersOf(REC), EDGE_HOSTS, 'all five sites are hosted by ONE function');
  eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
  eq(byConsumer(REC), BY_CONSUMER, '…and read that way the whole coupling is BY_CONSUMER');
  ok(FULL_NINE > BY_CONSUMER,
    '…where the raw score reads 5, so the #458 refinement is what makes this region visible');
  ok(BY_NAME.has(EDGE_HOSTS[0]), EDGE_HOSTS[0] + ' is a monolith declaration…');
  {
    const h = BY_NAME.get(EDGE_HOSTS[0]);
    ok(h.start >= RAW_END_IN_CODE || h.end < RAW_AT_IN_CODE, '…declared outside the region');
  }
}
// `mapLimit` SOUNDS shared. It is not, and that is measured rather than trusted.
{
  const m = BY_NAME.get('mapLimit');
  const self = (i) => i >= m.start && i <= m.end;
  const outside = refSites(MASKED, 'mapLimit').filter((i) => !self(i));
  eq(outside.length, HELPER_CALL_SITES, '`mapLimit` has exactly ONE call site in the whole monolith');
  eq(outside, [EDGE_SITES[0]], '…and it is the first of this region\'s five inbound sites');
  eq(SIBLINGS.filter((s) => refSites(s.masked, 'mapLimit').length).map((s) => s.rel), [],
    '…no sibling module names it either');
  eq(refSites(STATIC_MARKUP, 'mapLimit').length, 0, '…nor does the static markup');
  // Its GENERALITY is unexercised, not shared: the monolith runs plenty of
  // unbounded parallelism that could have used it and does not.
  eq(MASKED.split('Promise.all').length - 1, PROMISE_ALL_SITES,
    'the monolith has PROMISE_ALL_SITES `Promise.all` sites that do NOT route through it, so the '
    + 'helper is general in shape and single-use in fact');
  ok(PROMISE_ALL_SITES > HELPER_CALL_SITES,
    '…far more than its own call count, which is the whole of the claim');
}
// BOTH READINGS, RUN OVER THE WHOLE CANDIDATE SET — on this contract's numbers,
// because the audit that first measured them is deleted by this same change.
const candidateRuns = [];
{
  const seen = new Set();
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
  eq(rawRuns, RAW_RUNS, 'the regions yield RAW_RUNS contiguous owner runs');
  eq(seamRejected, SEAM_REJECTED, '…of which SEAM_REJECTED are refused by assertSeam');
  eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct extractable candidates');
  eq(MARKS.length, TOP_LEVEL_BANNERS, '…found under TOP_LEVEL_BANNERS top-level banners');
}
for (const c of candidateRuns) { c.p = profileOf([c.lo, c.hi]); c.load = loadTimeProfile(c.lo, c.hi); }
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of them run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the evaluation-time rule still discriminates');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE clean candidates have ONE consumer and more than one site, so the '
    + '#458 refinement still separates about a twelfth of the set — and this region is one');
  const oneConsumerOnly = clean.filter((c) => byConsumer(c.p) === 1);
  eq(oneConsumerOnly.length, ONE_CONSUMER_CANDIDATES,
    'ONE_CONSUMER_CANDIDATES have a coupling that is exactly one consumer and nothing else');
  const best = oneConsumerOnly.slice().sort((a, b) => b.units - a.units)[0];
  eq([best.lo, best.hi], [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    '…and the LARGEST of them is the region this layer shipped');
  eq(best.units, BEST_BY_CONSUMER_UNITS, '…at BEST_BY_CONSUMER_UNITS units');
  eq(best.units, UNDO.MODULE_CHARS, '…which is the module\'s own pinned length');
  const second = oneConsumerOnly.slice().sort((a, b) => b.units - a.units)[1];
  eq(second.units, RUNNER_UP_UNITS, 'the runner-up at equal coupling is RUNNER_UP_UNITS units');
  eq(second.p.names, RUNNER_UP_OWNERS,
    '…a different region entirely, pinned by its WHOLE owner list: membership alone would be '
    + 'satisfied by either of its two names');
  ok(best.units > second.units,
    'so among candidates of EQUAL coupling the choice is size, which is the only tie-break left');
  eq(clean.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE).length, 1,
    '…and this region is in the clean set exactly once');
}
// THE REFINEMENT CANNOT BE GAMED, driven on this layer's own profile.
{
  const oneSiteFewer = { ...REC, sites: REC.sites.slice(0, 4), inbound: 4, nine: REC.nine - 1 };
  ok(oneSiteFewer.nine < REC.nine,
    'dropping one call site DOES lower the raw score, which is the behaviour objected to');
  eq(byConsumer(oneSiteFewer), byConsumer(REC),
    '…and leaves the consumer reading exactly where it was: the rank cannot be bought by '
    + 'calling less often');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE FINDING: a cohesion criterion, proposed and then measured away');
// ─────────────────────────────────────────────────────────────────────────────
{
  const a = BY_NAME.get(OWNERS_EXPECTED[0]);
  const b = BY_NAME.get(OWNERS_EXPECTED[1]);
  const aBody = maskLiterals(CODE.slice(a.start, a.end + 1));
  const bBody = maskLiterals(CODE.slice(b.start, b.end + 1));
  const crossRefs = refSites(aBody, b.name).length + refSites(bBody, a.name).length;
  eq(crossRefs > 0, OWNERS_REFERENCE_EACH_OTHER,
    'the two owners do NOT reference each other: they are strangers sharing a file');
  eq(CODE.slice(a.end + 1, b.start), OWNER_GAP,
    '…separated by two blank lines and nothing else — no banner, no header, adjacent by accident');
  ok(b.start > a.end, 'control — they ARE adjacent, so the run is contiguous and takeable');
}
// THE OBJECTION, EXECUTED OVER THE WHOLE CHAIN RATHER THAN BELIEVED. It is
// counted over the layers cut BEFORE this one, which is the set it quantified
// over: counting this layer in would make the claim partly about itself.
{
  const prior = CHAIN.slice(0, -1);
  eq(prior.length, PRIOR_LAYERS, 'PRIOR_LAYERS layers were cut before this one');
  eq(CHAIN_LENGTH - PRIOR_LAYERS, 1, '…and this layer is the one that makes up the difference');
  ok(prior.indexOf(MODULE_REL) < 0, '…so the count below does not include this layer itself');

  let multi = 0, connected = 0;
  const disconnected = [];
  const shapes = new Map();
  for (const rel of prior) {
    const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const decls = scanTopLevelDeclarations(s);
    if (decls.length < 2) continue;
    multi++;
    const names = decls.map((d) => d.name);
    const adj = new Map(names.map((n) => [n, new Set()]));
    for (const d of decls) {
      const body = maskLiterals(s.slice(d.start, d.end + 1));
      for (const other of names) {
        if (other === d.name) continue;
        if (refSites(body, other).length) { adj.get(d.name).add(other); adj.get(other).add(d.name); }
      }
    }
    const seen = new Set([names[0]]);
    const q = [names[0]];
    while (q.length) for (const n of adj.get(q.pop())) if (!seen.has(n)) { seen.add(n); q.push(n); }
    if (seen.size === names.length) connected++; else disconnected.push(rel);
    shapes.set(rel, { owners: names.length, connected: seen.size });
  }
  eq(multi, MULTI_OWNER_LAYERS, 'MULTI_OWNER_LAYERS of those layers ship more than one owner');
  eq(connected, CONNECTED_LAYERS, '…and only CONNECTED_LAYERS of those have owners that all connect');
  eq(disconnected.length, DISCONNECTED_LAYERS,
    'DISCONNECTED_LAYERS already ship owners that do NOT all reference one another');
  ok(DISCONNECTED_LAYERS > CONNECTED_LAYERS,
    'SO BUNDLING STRANGERS IS THE MAJORITY CASE, 17 to 10 — the objection that it would be a '
    + 'first is false, and the criterion was retired rather than applied');
  eq(multi, CONNECTED_LAYERS + DISCONNECTED_LAYERS,
    'control — every multi-owner layer is counted once, as connected or as disconnected');
  eq(multi + prior.filter((rel) =>
    scanTopLevelDeclarations(fs.readFileSync(path.join(ROOT, rel), 'utf8')).length < 2).length,
  PRIOR_LAYERS, '…and every layer once, as multi-owner or as single-owner');
  // NOT merely "some disconnected layer exists": layers with this module's EXACT
  // shape. Membership in the disconnected set is satisfied by layers of any
  // shape, so the shape itself is what is asserted — and ALL of them are named,
  // because a single name would be satisfied by any one precedent.
  eq(disconnected.filter((rel) => {
    const sh = shapes.get(rel);
    return sh.owners === SAME_SHAPE_OWNERS && sh.connected === SAME_SHAPE_CONNECTED;
  }).sort(), SAME_SHAPE_LAYERS.slice().sort(),
  'and these are ALL the layers of this module\'s EXACT shape — two owners, one connected — '
    + 'named rather than counted');
  eq({ owners: OWNER_COUNT, connected: 1 },
    { owners: SAME_SHAPE_OWNERS, connected: SAME_SHAPE_CONNECTED },
    '…which is the shape this module ships, so the precedent is the same shape and not merely '
    + 'the same category');
  ok(SAME_SHAPE_LAYERS.every((rel) => CHAIN.indexOf(rel) >= 0),
    '…and every one of them is still in the chain, so none of the precedents has been retired');
}
// WHAT THE RETIRED CRITERION WOULD HAVE COST.
{
  const soloEnd = snapBodyEnd(CODE, RAW_AT_IN_CODE, BY_NAME.get('mapLimit').start);
  eq(assertSeam(CODE, RAW_AT_IN_CODE, soloEnd), BY_NAME.get('mapLimit').start,
    'the single-owner cut is a LEGAL boundary too, so the choice was real and not forced');
  const solo = profileOf([RAW_AT_IN_CODE, BY_NAME.get('mapLimit').start]);
  eq(byConsumer(solo), BY_CONSUMER, '…with the same consumer coupling of 1');
  eq(solo.deps, [], '…and the same empty dependency list');
  ok(soloEnd - RAW_AT_IN_CODE < UNDO.MODULE_CHARS,
    'but it is SMALLER: applying the unmeasured criterion would have left units behind');
  eq(UNDO.MODULE_CHARS - (soloEnd - RAW_AT_IN_CODE), SOLO_CUT_FORGONE,
    '…SOLO_CUT_FORGONE of them, which is `mapLimit` and the two newlines before it');
  eq(SOLO_CUT_FORGONE, OWNER_SIZES[1] + 2, '…exactly that owner plus its separating blank line');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. It loads bare, does nothing at load, and both owners run');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the module has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(MODULE, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining both globals');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
  eq(typeof ctx.buildPortfolioTechnicalAlignmentDebug, 'function',
    '…and the function its single consumer calls is there');
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
// BOTH OWNERS ARE CALLED. A pair that loads bare but throws on its own shape
// would satisfy every clause above, and the strangers are exercised SEPARATELY
// because nothing in the file connects them — which is the same fact §5 measures.
// `mapLimit` is async, so its calls run in the deferred block at the end.
const VM_CTX = { console: { log() {}, warn() {}, error() {} }, Promise, Array, Math, String, JSON };
vm.createContext(VM_CTX);
vm.runInContext(MODULE, VM_CTX);
{
  const debug = VM_CTX.buildPortfolioTechnicalAlignmentDebug('SPY', {}, null);
  eq(debug.ticker, 'SPY', 'the alignment debug builder returns a record for the ticker it was given');
  // Arrays built inside the VM carry its realm's prototype, so deepStrictEqual
  // would reject two structurally identical lists; they are joined instead.
  eq(debug.missingFields.join(','), 'rsi14,sma20,sma30,rsi14_4h,sma20_4h,sma30_4h',
    '…and handed no technical payload it names all SIX indicator fields as missing, which is '
    + 'the work the function exists to do');
  eq(debug.source, 'BACKEND_TECHNICAL_REFRESH', '…tagging the record with its source');
  ok(Array.isArray(debug.reasons), '…with a reasons array, which is the shape its consumer reads');
  const withData = VM_CTX.buildPortfolioTechnicalAlignmentDebug('SPY', {}, {
    rsi14: 50, sma20: 1, sma30: 2, rsi14_4h: 51, sma20_4h: 3, sma30_4h: 4,
  });
  eq(withData.missingFields.join(','), '',
    'control — handed a COMPLETE payload it reports nothing missing, so the list above is a '
    + 'measurement and not a constant');
  eq(typeof VM_CTX.mapLimit, 'function', 'and mapLimit is defined — it is called below, after the rest');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
eq(UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, MODULE), INDEX,
  'the undo reconstructs the base exactly — the whole point of the helper');
eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied answers true for the shipped document');
eq(UNDO.isApplied(INDEX), false, '…and false for the document that predates this layer');
eq(UNDO.isApplied(42), false, '…and false, rather than throwing, for a non-string');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(42, MODULE),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_BAD_INPUT', 'a non-string document is refused by name');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, 42),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_BAD_INPUT', '…as is a non-string module');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, MODULE + 'x'),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_IDENTITY', 'a padded module is refused');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, MODULE.slice(0, -1)),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_IDENTITY', '…as is a truncated one');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, MODULE + '\n'),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_IDENTITY',
  '…and so is one that RE-ABSORBED the structural separator: it is one unit too long');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, MODULE.slice(0, -2) + 'x\n'),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_SEPARATOR',
  'a module of the right LENGTH that no longer ends on a closing brace gets its own error');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX, ' ' + MODULE.slice(1)),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_MODULE_IDENTITY',
  'a module of the right length and ending whose BYTES differ is caught by the digest');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX.replace(TAG, ''), MODULE),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_IDENTITY', 'a document with no tag is refused');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX.replace(TAG, TAG + TAG), MODULE),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_IDENTITY', '…as is one with the tag twice');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(
  LIVE_INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_ADJACENCY', 'a REORDERED tag is refused by adjacency');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(LIVE_INDEX + 'x', MODULE),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere is refused');
throwsWith(() => UNDO.undoPortfolioTechnicalAlignmentDebug(INDEX, MODULE),
  'PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_UNDO_TAG_IDENTITY',
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
    '…and NEITHER owner is among them: both are live code with a live consumer');
}
{
  eq(CHAIN.length, CHAIN_LENGTH, 'CHAIN_LENGTH layers ship today');
  eq(Array.from(new Set(CHAIN)).length, CHAIN_LENGTH,
    '…each exactly once: a chain with a duplicated entry is a chain missing a layer');
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, '…and this one is the newest, read off the tail');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');
  // CHAIN IS AN ORDER, NOT A SET, and until #459 nothing said so: a mutant that
  // swapped two entries survived the whole pass, because membership, length and
  // the tail were all checked and the sequence between them was not. Each layer
  // appends its tag after the previous one, so the cut order IS the tag order in
  // the shipped document, and that is what proves it.
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
    'this layer sits at MODULE_SIZE_RANK of thirty-five by size — near the small end, not AT it');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS,
    '…and the module at that rank is this one, by its undo helper\'s own pin');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\\n`, this one among them');

  // "PURE ASCII" AND "UNDOCUMENTED" ARE BOTH SUPERLATIVES WAITING TO BE WRITTEN
  // WRONG, so each is a count over the whole chain instead of an adjective. A
  // comment-share RANK is deliberately NOT pinned here: at a share of zero this
  // module ties, and a tie is not a rank — the count below is what is true.
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'exactly PURE_ASCII_LAYERS layers in the chain are pure ASCII, this one among them');
  ok(!/[^\x00-\x7F]/.test(MODULE), '…which the module\'s own bytes confirm');
  ok(sources.some((s) => /[^\x00-\x7F]/.test(s)),
    '…and layers that are NOT pure ASCII exist, so the count measures something');
  eq(sources.filter((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length === 0).length,
    UNDOCUMENTED_LAYERS, 'exactly UNDOCUMENTED_LAYERS layers carry no comment line at all');
  eq(MODULE.split('\n').filter((l) => /^\s*\/\//.test(l)).length, 0,
    '…this module being one of the two, which is a position and not a boast');
  ok(sources.some((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length > 0),
    '…and documented layers exist, so that count measures something too');

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
    ['index.html', MODULE_REL, 'js/services/journal-map-audit.js', 'js/services/dxlink-greeks-fetch.js', 'js/portfolio/portfolio-technical-parity.js', 'js/portfolio/portfolio-spy-price.js', 'js/services/apex-storage-recovery.js'].sort(),
    'production footprint is exactly index.html, this layer\'s module, and the module of every layer cut after it');
  ok(changed.indexOf(CONTRACT_REL) >= 0, 'the permanent contract is part of the change');
  // CONTRACT_REL NAMES THIS FILE, and until #461's mutation pass nothing said so.
  // Its two uses — "it is in the change set" and "exclude it from the dependency
  // census in §3" — were BOTH satisfied by the previous layer's contract, which
  // ships in this same change and also pins an empty MONOLITH_DEPENDENCIES. The
  // mutant that pointed CONTRACT_REL at that file survived the whole pass.
  eq(fs.readFileSync(path.join(ROOT, CONTRACT_REL), 'utf8'), fs.readFileSync(__filename, 'utf8'),
    '…and CONTRACT_REL is the path of THIS file, byte for byte, so §3 excludes this contract '
    + 'from its own census and no other');
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
  // RETIRED IN #463, in chain order. This contract's own mutation spec is gone;
  // every assertion in this file still runs on every push, and what stops is the
  // mutation pass proving those pins load-bearing. The assertion is kept as its
  // NEGATION rather than deleted, so the retirement is executed rather than
  // merely described — a deleted line would pass for the wrong reason.
  ok(!fs.existsSync(path.join(ROOT, CONTRACT_SPEC_REL)),
    'this contract\'s mutation spec was RETIRED, so the newest layer carries the pass');
  eq(git(['cat-file', '-e', SPEC_RETIRED_FROM + ':' + CONTRACT_SPEC_REL]), '',
    '…and that path is the one this cycle removed, not merely a path that never existed');
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite matches the pin above: the audit left as this contract arrived');
  ok(!changed.some((rel) => rel.startsWith('config/') || rel.startsWith('contracts/')),
    'no backend/model configuration changed');
  ok(changed.every((rel) => rel === 'index.html' || rel === MODULE_REL ||
    rel === 'js/services/journal-map-audit.js' || rel === 'js/services/dxlink-greeks-fetch.js' || rel === 'js/portfolio/portfolio-spy-price.js' || rel === 'js/services/apex-storage-recovery.js' ||
    rel === 'js/portfolio/portfolio-technical-parity.js' ||
    rel === 'CLAUDE.md' || rel.startsWith('tests/')),
  'every other changed path is a test artifact');
}

// ─────────────────────────────────────────────────────────────────────────────
// `mapLimit` is async, so the last two assertions run here, after everything
// above has already passed. The summary prints from inside, so a rejected
// promise cannot leave the file looking green.
// ─────────────────────────────────────────────────────────────────────────────
Promise.resolve(VM_CTX.mapLimit([1, 2, 3], 2, async (n) => n * 2)).then((out) => {
  eq(out.join(','), '2,4,6', 'mapLimit maps every item through the worker, in order');
  return VM_CTX.mapLimit([], 4, async () => 1);
}).then((empty) => {
  eq(empty.length, 0, '…and returns an empty array for empty input rather than throwing');
  console.log('\n' + pass + ' assertions passed.');
  console.log('PORTFOLIO_TECHNICAL_ALIGNMENT_DEBUG_BOUNDARY_OK');
}).catch((e) => { console.error(e); process.exit(1); });
