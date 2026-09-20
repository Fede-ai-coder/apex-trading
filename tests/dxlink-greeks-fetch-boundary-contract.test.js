'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// DXLINK GREEKS FETCH — PERMANENT BOUNDARY CONTRACT.
//
// A RELOCATION, NOT A REWRITE. One contiguous fragment of the inline monolith,
// [1025308,1030258) in monolith coordinates at the base, is now
// js/services/dxlink-greeks-fetch.js. The module is the block's bytes verbatim,
// and tests/lib/dxlink-greeks-fetch-undo.js reconstructs the pre-extraction
// index.html byte for byte. EVERY coordinate below is measured on THAT
// reconstruction, so nothing here is a remembered copy of the base.
//
// ONE OWNER: `fetchDXLinkGreeks` (4,703 units). It opens a DXLink WebSocket,
// subscribes Greeks and Quote for a list of streamer symbols, fills a result
// map as events arrive, and resolves on completion or a 5s hard timeout.
//
// IT OPENS ON A BANNER THAT NAMES ITS OWNER, not on the declaration, and that
// banner line occurs exactly once in the base monolith — which is what makes
// the seam unambiguous rather than one of several places a match could land.
// 245 units of banner block precede the owner; one newline follows it, and §2
// accounts for every unit of the body with those three numbers.
//
// ── THE FINDING THIS LAYER SHIPPED: THE NINTH DIRECTION COUNTED TWO THINGS ──
//
// `outboundModule` was added to the screen to catch a region that reaches into
// code the programme has ALREADY extracted — a real hazard, because such a
// region depends on a module rather than on the monolith it is cut from.
//
// It did not distinguish WHICH module. This region's single outbound edge is
// one call to `ttCall`, owned by `js/api/backend-client.js` — a FOUNDATION
// module that predates the programme and that ELEVEN of the layers shipped
// before this one already call. Counting that edge is not measuring a hazard;
// it is charging a module for using the HTTP client.
//
// SPLIT THE DIRECTION AND THE RANKING CHANGES. Counting only the CHAIN half,
// the one-consumer set grows from ONE candidate to FOUR, and this region is the
// LARGEST of them. §5 executes both readings against the reconstructed base, so
// the finding is re-derived on every push rather than quoted from the audit.
//
// NEITHER HALF IS RARE AND THE SPLIT IS NOT UNIVERSAL: 2,085 of the 3,245
// candidates touch a foundation module and 876 touch a chain module, but the
// direction DECIDES a candidate's verdict in only three cases, one of them this
// region. §5 counts that too, because "a refinement that matters" is a claim
// over the whole candidate set and not over the three examples nearest to hand.
//
// ── THE INCIDENTAL DEFECT, CARRIED ACROSS VERBATIM AND PINNED ───────────────
//
// Two lines above the canary subscription the source says the canary is "not in
// streamerSymbols so it never blocks checkComplete or appears in the returned
// map". The first half is true and §7 proves it. The SECOND HALF IS FALSE:
// `result[CANARY]` is assigned before the Promise is built and never deleted,
// so `CSCO` is a key of the object the caller receives.
//
// A relocation moves bytes; it does not repair them. The wrong comment ships in
// the module unchanged, and §7 drives the whole DXLink handshake — SETUP, AUTH,
// CHANNEL_REQUEST, FEED_SETUP, FEED_SUBSCRIPTION, FEED_DATA — against a fake
// socket and reads the key out of the resolved value, so the defect is executed
// rather than read off the source. Repairing it is a production change and
// belongs to a PR that is not a relocation.
//
// ── WHAT THIS CONTRACT IS FOR ───────────────────────────────────────────────
//
// THE MODULE LOADS LAST AND NEEDS NOTHING. It is the 81st and final local
// script (index 80 of 81), which is what MODULE_POSITION pins, and §6 loads it
// in a COMPLETELY empty VM: one global defined, and no fetch, timer, socket,
// storage read or listener touched while it loads.
//
// §8 plants every failure the undo helper documents AS REACHABLE and asserts
// its EXACT message, because a fail-closed guard nobody fires is a guard that
// might not close. The seventh, BASE_IDENTITY, is a deliberate redundant final
// gate and has no mutant that reaches it once the module digest and the
// whole-document digest have both passed; the helper says so in its own header. §9 carries the chain-wide counts — this is the newest layer, so this
// is the contract that holds CHAIN_LENGTH and the counts derived from it — and
// the exact production scope of the change.
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
const UNDO = require('./lib/dxlink-greeks-fetch-undo.js');
const PORTFOLIO_TECHNICAL_PARITY_U = require('./lib/portfolio-technical-parity-undo.js');

const MODULE_REL = 'js/services/dxlink-greeks-fetch.js';
const TAG = '<script src="./js/services/dxlink-greeks-fetch.js"></script>\n';
const ANCHOR_TAG = '<script src="./js/services/journal-map-audit.js"></script>\n';
const INLINE_OPEN = '<script>';

// ── The base this layer was cut from, and the files of this change ───────────
const BASE_SHA = '9dae61e';
const BASE_CHARS = 1496195;
const BASE_UTF8 = 1524963;
const BASE_LF = 25891;
const BASE_SHA256 = 'cad874aeadb31e613487488a54ab9bcd92043bf8478084f55c148638dc1df900';
const BASE_LOCAL_SCRIPTS = 80;
const CONTRACT_REL = 'tests/dxlink-greeks-fetch-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/dxlink-greeks-fetch-undo.js';
const AUDIT_REL = 'tests/temporary-dxlink-greeks-fetch-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/dxlink-greeks-fetch-audit.spec.js';
const CONTRACT_SPEC_REL = 'tests/mutation-specs/dxlink-greeks-fetch-contract.spec.js';
// The commit that retired it, so the negations below are pinned against a path
// that really existed rather than one that never did. It is also the revision
// the spec's own numbers are read out of, now that the file is gone.
const SPEC_RETIRED_FROM = 'b22b355';
// Chain-order retirement: the layer that was newest at the base is no longer
// newest, so its spec goes. §9 pins that path the same way it pins the audit's
// — by what the BASE commit carried, because absence alone is satisfied by any
// wrong path, including one that never existed.
const RETIRED_SPEC_REL = 'tests/mutation-specs/journal-map-audit-contract.spec.js';
const RETIRED_CONTRACT_REL = 'tests/journal-map-audit-boundary-contract.test.js';

// Ratchet. The suite file count as it stands TODAY. Phase 1 advanced it to 165;
// this phase deletes that audit as this contract arrives, one for one, so the
// count is unchanged.
const TEST_FILE_COUNT = 167;
const LOCAL_SCRIPT_COUNT = 81;
const MODULE_POSITION = 80;

// ── The boundary, in MONOLITH coordinates (of the reconstructed base) ────────
const CODE_AT = 114672;
const CODE_CHARS = 1381497;
const RAW_AT_IN_CODE = 1025308;
const RAW_END_IN_CODE = 1030258;
const BODY_END_IN_CODE = 1030257;
const RAW_CHARS = 4950;
const TOP_LEVEL_DECLS = 940;
const TOP_LEVEL_BANNERS = 222;
const OWNER_REGIONS = 121;
const RESIDUAL_MONOLITH = 1376547;
const INDEX_AFTER = 1491306;
const TAG_GAP = 1025316;
const NET_REDUCTION = 4889;

// ── The one owner, and the body it sits in ───────────────────────────────────
const BODY_CHARS = 4949;
const BODY_UTF8 = 4967;
const BODY_LF = 89;
const BODY_SHA256 = '36dd908bed13d42361d6fcae84d0ea8a6f447295765609fe7409e43a669c1913';
const BODY_ENDING = '}\n';
const FEATURE_BANNER = '// ── fetchDXLinkGreeks — one-shot WebSocket fetch for a list of streamer symbols ──';
const OWNERS_EXPECTED = ['fetchDXLinkGreeks'];
const OWNER_COUNT = 1;
const FUNCTION_OWNERS = 1;
const OWNER_SIZES = [4703];
const TOTAL_LINES = 90;
const CODE_LINES = 83;
const COMMENT_LINES = 7;
const OPENING_COMMENT_LINES = 6;
const BANNER_BLOCK_CHARS = 245;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 1;
const EDGE_SITES = [1131945];
const EDGE_HOSTS = ['refreshPositionsLive'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 138483;
const MONOLITH_DEPENDENCIES = [];
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0,
  outboundGenerated: 0,
};
const OUTBOUND_MODULE = 1;
const FULL_NINE = 2;
const BY_CONSUMER = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 1;

// ── THE FINDING: the ninth direction, split ──────────────────────────────────
const FOUNDATION_DEPENDENCIES = ['ttCall'];
const FOUNDATION_OWNER = 'js/api/backend-client.js';
const FOUNDATION_SITES = 1;
const CHAIN_OUTBOUND = 0;
const BY_CONSUMER_SPLIT = 1;
const LAYERS_CALLING_TTCALL = 11;
const LAYERS_CALLING_FOUNDATION = 19;
const CANDIDATES_TOUCHING_FOUNDATION = 2085;
const CANDIDATES_TOUCHING_CHAIN = 876;
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 4;
// The whole split one-consumer set, largest first — an equality, not a sample.
const SPLIT_SET = [
  [1025308, 1030257],
  [719173, 722692],
  [929378, 932088],
  [975281, 977133],
];
// How many clean candidates the foundation half of the direction DECIDES — the
// ones whose rank changes because of it and for no other reason.
const DECIDED_BY_FOUNDATION = 3;
// How many of the split set the one hub consumer hosts. Counted, not called "most".
const SPLIT_SET_HOSTED_BY_CONSUMER = 2;

// ── The raw screen's own pick, for the contrast ──────────────────────────────
const RAW_PICK_AT = 929378;
const RAW_PICK_END = 932088;
const RAW_PICK_UNITS = 2710;
const RAW_PICK_OWNERS = ['_validateBackendFullRefreshPayload'];
const RAW_PICK_BY_CONSUMER = 1;
const RAW_PICK_REGION_AT = 917467;
const RAW_PICK_REGION_END = 999327;
const RAW_PICK_REGION_UNITS = 81860;
const RAW_PICK_REGION_OWNERS = 31;
const RAW_PICK_REGION_BANNER = '// ── [PortfolioRefreshPayload] — gated verbose payload diagnostics ─────────────';

// ── The incidental defect ────────────────────────────────────────────────────
const CANARY_SYMBOL = 'CSCO';
const CANARY_CLAIM = 'appears in the returned map';
const CANARY_IN_RESULT = true;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7610;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3245;
const CLEAN_CANDIDATES = 1994;
const ONE_CONSUMER_MULTI_SITE = 131;

// ── The chain, as it stands with this layer on it ────────────────────────────
// CHRONOLOGICAL, oldest first, ending at THIS layer: a contract's chain records
// the tree as its own cut left it, which is why the previous contract's copy
// ends one entry earlier and is not extended by later cycles.
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
];
const CHAIN_LENGTH = 37;
const SMALLEST_MODULE = 'js/portfolio/portfolio-vega-monitor.js';
const SMALLEST_CHARS = 1761;
const LARGEST_CHARS = 71811;
const MODULE_SIZE_RANK = 11;
const LAYERS_ENDING_BRACE = 34;
const LAYERS_WITH_SEPARATOR = 29;
const LAYERS_WITH_RAW_PAIR = 26;
const LAYERS_WITHOUT_SEPARATOR = 8;
const PURE_ASCII_LAYERS = 2;
const UNDOCUMENTED_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 21;

// ── The mutant budget, at this base ──────────────────────────────────────────
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const BASE_DECLARED_MUTANTS = 200;
const RETIRED_MUTANTS = 101 + 93;
// This layer's own contribution to the mutant budget. The LIVE total is not
// pinned here: it is a fact about the suite TODAY, which every later audit moves
// by design, and pinning it made a later cycle's Phase 1 fail on a contract it
// had not touched.
const CONTRACT_SPEC_MUTANTS = 115;
const MUTANT_BUDGET = 250;
const LAYER_CONTRACT_SPECS = 1;

// ── Reachability at this base ────────────────────────────────────────────────
const DEAD_DECLS = 18;
const DEAD_UNITS = 5318;

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

console.log('DXLINK GREEKS FETCH — PERMANENT BOUNDARY CONTRACT');
console.log('relocation only · audited by #464 · base=' + BASE_SHA);

// The technical-parity layer was cut AFTER this one, so it is newer: peel it
// FIRST, and LIVE_* below means this layer's own shipped document — the one it
// was written against — not whatever the head of the chain looks like today.
const HEAD_INDEX = APP_LOADER.loadIndexHtml();
const LIVE_INDEX = PORTFOLIO_TECHNICAL_PARITY_U.isApplied(HEAD_INDEX)
  ? PORTFOLIO_TECHNICAL_PARITY_U.undoPortfolioTechnicalParity(
      HEAD_INDEX, fs.readFileSync(path.join(ROOT, 'js/portfolio/portfolio-technical-parity.js'), 'utf8'))
  : HEAD_INDEX;
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate here is proved by
// the reconstruction that shipped.
const INDEX = UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, MODULE);
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


// ── The screen, run ONCE and reused by §5 and §6 ─────────────────────────────
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

// Which KIND of module owns a name: one this programme extracted, or one that
// predates it. THE WHOLE FINDING rests on this split, and CHAIN is the literal
// above — this is the newest layer, so this contract is where that list lives.
const CHAIN_SET = new Set(CHAIN);
const OWNER_KIND = new Map();
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
// byConsumer with the FOUNDATION half of the ninth direction removed.
const byConsumerSplit = (p, split) => byConsumer(p) - p.outModule + split.chain;

// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base it came from');
// ─────────────────────────────────────────────────────────────────────────────
eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is the extracted length');
eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…its byte length');
eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…its line-feed count');
eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and its digest');
eq(LIVE_INDEX.length, INDEX_AFTER,
  '…which is the figure the audit PREDICTED before the move, not one read back afterwards');
eq(LIVE_LOCALS.length, LOCAL_SCRIPT_COUNT, 'it loads LOCAL_SCRIPT_COUNT local application scripts');
eq(LIVE_LOCALS.indexOf(MODULE_REL), MODULE_POSITION,
  '…this module being the LAST of them, at MODULE_POSITION');
eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
  '…read off the tail directly, so the endpoint is pinned by position and not only by index');
eq(count(LIVE_INDEX, TAG), 1, 'exactly one tag for it');
eq(count(LIVE_INDEX, ANCHOR_TAG + TAG + INLINE_OPEN), 1,
  '…immediately after the previous layer\'s tag and immediately before the inline monolith');
// THE RECONSTRUCTION IS THE BASE, and that is asserted against git rather than
// against a number this file carries: a digest written here could be wrong in
// exactly the same way twice and still agree with itself.
eq(INDEX.length, BASE_CHARS, 'the reconstruction is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this digest');
eq(INDEX, git(['show', BASE_SHA + ':index.html']),
  '…and it is the base commit\'s index.html BYTE FOR BYTE, which is the claim the whole file '
  + 'rests on — every coordinate below is an offset into this string');
eq(LOCALS.length, BASE_LOCAL_SCRIPTS, 'the base loaded BASE_LOCAL_SCRIPTS local scripts');
eq(LOCAL_SCRIPT_COUNT - BASE_LOCAL_SCRIPTS, 1, '…exactly one fewer: this layer');
eq(INDEX.indexOf(CODE), CODE_AT, 'the base inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and ran CODE_CHARS units');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it declared TOP_LEVEL_DECLS names at top level');
eq(MARKS.length, TOP_LEVEL_BANNERS, '…under TOP_LEVEL_BANNERS top-level banners');
eq(REGIONS.length, OWNER_REGIONS, '…which merge into OWNER_REGIONS regions that own a declaration');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The module is the block, verbatim');
// ─────────────────────────────────────────────────────────────────────────────
eq(MODULE, BODY, 'THE MODULE IS THE BLOCK\'S BYTES, with nothing added and nothing removed');
eq(MODULE.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(MODULE, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((MODULE.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(MODULE), BODY_SHA256, '…and this digest, which the audit pinned before the move');
eq(MODULE.length, UNDO.MODULE_CHARS, '…the undo helper agreeing on the length');
eq(sha256(MODULE), UNDO.MODULE_SHA256, '…and on the digest');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE).length, RAW_CHARS,
  'the raw fragment index.html gave up is RAW_CHARS units: the body plus one separator');
eq(RAW_CHARS - BODY_CHARS, 1, '…exactly one, which is the separator');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE), MODULE + UNDO.SEPARATOR,
  '…and the fragment IS the module followed by that separator, which is why the module file '
  + 'ends line-terminated and index.html needs no reflow');
eq(MODULE.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!MODULE.endsWith('\n\n'), '…and not on a blank line');
eq(MODULE.slice(0, MODULE.indexOf('\n')), FEATURE_BANNER,
  'IT OPENS ON A BANNER THAT NAMES ITS ONLY OWNER, not on the declaration itself');
ok(FEATURE_BANNER.indexOf(OWNERS_EXPECTED[0]) >= 0,
  '…which is what "names it" means here, checked against the banner text rather than asserted');
eq(count(CODE, FEATURE_BANNER), 1,
  '…and that banner line occurred EXACTLY once in the base monolith, so the seam was not one '
  + 'of several places it could have matched');
ok(/[^\x00-\x7F]/.test(MODULE),
  'it is NOT pure ASCII — the banner rule and an arrow inside a log line settle that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  ok(next.start > RAW_END_IN_CODE,
    'the next top-level owner began AFTER the raw span, with no banner between — the '
    + '`tt-reconnect` shape, where "extend to the next header" would swallow the next feature');
  ok(bannerOf(next.start) === bannerOf(RAW_AT_IN_CODE),
    '…and it sat under THIS region\'s banner, which is why the banner alone cannot end the '
    + 'region and the boundary is a judgement the audit published');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly this one name');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, FUNCTION_OWNERS, '…and it is a function');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at this size');
  eq(OWNERS[0].start - RAW_AT_IN_CODE, BANNER_BLOCK_CHARS,
    '…preceded by BANNER_BLOCK_CHARS units of banner block, which is the only thing the body '
    + 'holds besides the owner');
  eq(CODE.slice(OWNERS[0].end + 1, BODY_END_IN_CODE), '\n',
    '…and exactly one newline trails it — the line terminator scanTopLevelDeclarations '
    + 'excludes from d.chars, which is why the sum below carries a +1 rather than balancing');
  eq(BANNER_BLOCK_CHARS + OWNER_SIZES[0] + 1, BODY_CHARS,
    'control — banner block, owner and that one newline account for every unit of the body');
  const lines = MODULE.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, COMMENT_LINES, '…COMMENT_LINES of them not');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment');
}
// What the move cost, predicted by the audit and now realised.
eq(BASE_CHARS - LIVE_INDEX.length, NET_REDUCTION,
  'index.html fell by NET_REDUCTION units net: the span left and a tag arrived');
eq(RAW_CHARS - NET_REDUCTION, TAG.length,
  '…and the difference is exactly the tag line this layer added');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, 'the monolith is left at RESIDUAL_MONOLITH units');
{
  const liveCode = LIVE_TAGS.filter((t) => !t.src && t.inline.length > 1000)[0].inline;
  eq(liveCode.length, RESIDUAL_MONOLITH, '…which the shipped document confirms, not only the arithmetic');
  eq(liveCode.indexOf(FEATURE_BANNER), -1, '…and the feature banner is gone from it entirely');
  eq(count(liveCode, OWNERS_EXPECTED[0]), EXTERNAL_EDGES,
    '…while the owner NAME still appears there exactly EXTERNAL_EDGES time: the call site, '
    + 'which is what makes this a relocation rather than a deletion');
}
{
  const tagAt = LIVE_INDEX.indexOf(TAG);
  const inlineOpenAt = LIVE_INDEX.indexOf(INLINE_OPEN, tagAt);
  eq(inlineOpenAt, tagAt + TAG.length, 'the tag line sits immediately before the inline monolith');
  eq(LIVE_INDEX.slice(tagAt - 1, tagAt), '\n', '…on its own line, so nothing was reflowed');
  eq((CODE_AT + RAW_AT_IN_CODE) - (CODE_AT - INLINE_OPEN.length), TAG_GAP,
    'the tag line begins TAG_GAP units before the fragment it replaced, in base coordinates');
  eq(TAG_GAP - RAW_AT_IN_CODE, INLINE_OPEN.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
  eq(UNDO.RAW_AT - tagAt, TAG_GAP,
    '…and the helper\'s RAW_AT sits the SAME distance past the tag, which is what makes it a\n'
    + '   TAG-FREE offset: it is where the fragment goes back AFTER the tag line is removed, so\n'
    + '   the two coordinates coincide rather than differing by the width of the tag');
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
  'it depends on NO monolith declaration at all: the list is empty, not short');
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen,
  outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS,
'SEVEN of the nine directions measure zero: no write in, none through, none out, no markup '
  + 'either way, no sibling-module reference reaching in, and nothing that already left');
eq(REC.outModule, OUTBOUND_MODULE,
  'the NINTH direction is the only non-zero one besides the single inbound edge');
eq(REC.nine, FULL_NINE, 'nine directions, total score 2');
eq(byConsumer(REC), BY_CONSUMER, '…and the consumer reading agrees at BY_CONSUMER');
// THE CONSUMER IS A HUB, and "one consumer" reads differently when it is.
{
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  ok(host, EDGE_HOSTS[0] + ' is a top-level declaration…');
  eq(host.chars, CONSUMER_CHARS, '…of CONSUMER_CHARS units');
  eq(DECLS.slice().sort((a, b) => b.chars - a.chars)[0].name, EDGE_HOSTS[0],
    '…which makes it the LARGEST top-level declaration in the monolith, measured over all of '
    + 'them rather than asserted from the ones nearby');
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…and it is declared outside the region, so the edge really does cross the boundary');
}

// ─────────────────────────────────────────────────────────────────────────────
section('4. Its banner names it; the raw pick\'s banner does not name the raw pick');
// ─────────────────────────────────────────────────────────────────────────────
{
  // THIS region: the banner names the one owner it contains.
  eq(bannerOf(RAW_AT_IN_CODE), RAW_AT_IN_CODE,
    'the region STARTS on a banner mark — the screen knows this offset as a banner');
  const owner = BY_NAME.get(OWNERS_EXPECTED[0]);
  ok(FEATURE_BANNER.indexOf(owner.name) >= 0, '…and that banner names its owner');
  // THE RAW PICK: its banner names a feature, and the pick is one owner of many.
  const REGA = REGIONS.find((r) => RAW_PICK_AT >= r.start && RAW_PICK_AT < r.end);
  eq(REGA.start, RAW_PICK_REGION_AT, 'the raw pick sits in the banner region at RAW_PICK_REGION_AT');
  eq(REGA.end, RAW_PICK_REGION_END, '…ending at RAW_PICK_REGION_END');
  eq(REGA.end - REGA.start, RAW_PICK_REGION_UNITS, '…RAW_PICK_REGION_UNITS units wide');
  eq(CODE.slice(REGA.start, CODE.indexOf('\n', REGA.start)), RAW_PICK_REGION_BANNER,
    '…under this banner');
  eq(DECLS.filter((d) => d.start >= REGA.start && d.end < REGA.end).length, RAW_PICK_REGION_OWNERS,
    '…which governs RAW_PICK_REGION_OWNERS owners in total');
  eq(RAW_PICK_REGION_BANNER.indexOf(RAW_PICK_OWNERS[0]), -1,
    '…and does NOT name the raw pick, so where that feature ends is a judgement nobody has '
    + 'published — which is the whole of this audit\'s objection to it');
  ok(RAW_PICK_REGION_UNITS > BODY_CHARS * 10,
    'control — the difference is not marginal: the raw pick\'s region is an order of '
    + 'magnitude wider than the region recommended here');
  // AND THE RAW PICK IS NOT ACCUSED OF BEING COUPLED. It is clean; that is the point.
  const pa = profileOf([RAW_PICK_AT, RAW_PICK_END]);
  eq(byConsumer(pa), RAW_PICK_BY_CONSUMER,
    'the raw pick scores RAW_PICK_BY_CONSUMER, which is as clean as this screen can read — '
    + 'the objection is to its boundary, not to its coupling');
  eq(DECLS.filter((d) => d.start >= RAW_PICK_AT && d.end < RAW_PICK_END).map((d) => d.name),
    RAW_PICK_OWNERS, '…and it owns exactly the name this audit names');
  eq(RAW_PICK_END - RAW_PICK_AT, RAW_PICK_UNITS, '…across RAW_PICK_UNITS units');
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. THE FINDING: the ninth direction counts two different things as one');
// ─────────────────────────────────────────────────────────────────────────────
// (a) What this region's single outbound edge actually is.
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.foundationNames, FOUNDATION_DEPENDENCIES,
    'the region\'s outbound-module edge is exactly this one name');
  eq(split.foundation, FOUNDATION_SITES, '…at FOUNDATION_SITES site');
  eq(split.chain, CHAIN_OUTBOUND,
    '…and it reaches into NO module this programme extracted: CHAIN_OUTBOUND is zero');
  eq(split.foundation + split.chain, REC.outModule,
    'control — the two halves account for the whole of the ninth direction, so nothing is '
    + 'being quietly dropped by the split');
  eq(MODULE_OWNERS.get(FOUNDATION_DEPENDENCIES[0]), FOUNDATION_OWNER,
    '…and the name is owned by FOUNDATION_OWNER');
  ok(!CHAIN_SET.has(FOUNDATION_OWNER),
    '…which is NOT one of the chain\'s layers: it predates the extraction programme');
  ok(LOCALS.indexOf(FOUNDATION_OWNER) >= 0, '…while still being a local script the page loads');
}
// (b) Calling it is the ordinary case, counted over the shipped chain.
{
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  ok(CHAIN.every((rel) => fs.existsSync(path.join(ROOT, rel))), '…every one of which ships');
  // COUNTED OVER THE LAYERS THAT SHIPPED BEFORE THIS ONE, because the claim is
  // 'the chain ALREADY did this' — a set this layer is not a member of. Counting
  // the whole chain would fold this module's own ttCall into the evidence for
  // charging it, which is the argument running in a circle.
  const EARLIER = CHAIN.slice(0, -1);
  eq(EARLIER.length, CHAIN_LENGTH - 1, 'the earlier set is the chain minus this layer');
  eq(EARLIER.indexOf(MODULE_REL), -1, '…and it does not contain this module');
  const callsTt = EARLIER.filter((rel) => refSites(
    maskLiterals(fs.readFileSync(path.join(ROOT, rel), 'utf8')), FOUNDATION_DEPENDENCIES[0]).length > 0);
  eq(callsTt.length, LAYERS_CALLING_TTCALL,
    'LAYERS_CALLING_TTCALL of the shipped layers already call that exact name, so charging '
    + 'this region for it would charge it for what the chain routinely does');
  ok(refSites(maskLiterals(MODULE), FOUNDATION_DEPENDENCIES[0]).length > 0,
    '…control — THIS module calls it too, so the set above is the earlier layers and the\n'
    + '   count would be one higher if it folded this layer in');
  const callsAny = EARLIER.filter((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const masked = maskLiterals(src);
    const own = new Set(scanTopLevelDeclarations(src).map((d) => d.name));
    const bound = locallyBound(src);
    const re = /(^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)/g;
    let m;
    while ((m = re.exec(masked))) {
      const n = m[2];
      if (own.has(n) || bound.has(n)) continue;
      if (OWNER_KIND.get(n) === 'foundation') return true;
    }
    return false;
  });
  eq(callsAny.length, LAYERS_CALLING_FOUNDATION,
    '…and LAYERS_CALLING_FOUNDATION call SOME foundation name, which is the majority of the '
    + 'chain and settles that this direction is not measuring a hazard here');
  ok(LAYERS_CALLING_FOUNDATION > EARLIER.length / 2,
    '…a majority of that earlier set, stated as a comparison rather than a word');
}
// (c) Neither half of the split is rare, so the refinement is not a special case.
{
  for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }
  eq(candidateRuns.filter((c) => c.split.foundation > 0).length, CANDIDATES_TOUCHING_FOUNDATION,
    'CANDIDATES_TOUCHING_FOUNDATION of the candidates touch a foundation module');
  eq(candidateRuns.filter((c) => c.split.chain > 0).length, CANDIDATES_TOUCHING_CHAIN,
    '…and CANDIDATES_TOUCHING_CHAIN touch a chain module, so BOTH halves are common and the '
    + 'split is not a rule invented for one region');
}
// (d) The ranking, both ways — and the four the split reading admits.
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
    'under the RAW reading exactly ONE_CONSUMER_RAW candidate reads one consumer and nothing else');
  const split = clean.filter((c) => byConsumerSplit(c.p, c.split) === 1)
    .sort((a, b) => b.units - a.units);
  eq(split.length, ONE_CONSUMER_SPLIT, '…and under the SPLIT reading, ONE_CONSUMER_SPLIT do');
  eq(split.map((c) => [c.lo, c.hi]), SPLIT_SET,
    '…which are exactly these four, largest first — the WHOLE set asserted by equality, so '
    + 'dropping one fails rather than merely looping less');
  eq([split[0].lo, split[0].hi], [RAW_AT_IN_CODE, BODY_END_IN_CODE],
    'and the LARGEST of the four is the region this audit recommends');
  eq(byConsumerSplit(REC, outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
    '…reading BY_CONSUMER_SPLIT under the split and BY_CONSUMER under the raw');
  ok(BY_CONSUMER > BY_CONSUMER_SPLIT,
    '…so the raw reading costs it exactly the one point the ninth direction contributes');
  ok(split.some((c) => c.lo === RAW_PICK_AT && c.hi === RAW_PICK_END),
    'the raw pick is in the split set too: the split ADDS candidates, it does not displace one');
  // THE HUB, counted rather than described. The header calls this consumer the
  // host of MOST of the split set; how many is measured here, because "most"
  // quantifies over a set and this programme has written four such claims from
  // a partial look and been wrong every time.
  eq(split.filter((c) => consumersOf(c.p).indexOf(EDGE_HOSTS[0]) >= 0).length,
    SPLIT_SET_HOSTED_BY_CONSUMER,
    'SPLIT_SET_HOSTED_BY_CONSUMER of the four are consumed by the same hub this region '
    + 'feeds, which is why a one-consumer reading is cheap to come by in this part of the '
    + 'document and worth stating with the hub named');
  eq(SPLIT_SET_HOSTED_BY_CONSUMER * 2, ONE_CONSUMER_SPLIT,
    '…exactly HALF of them — the first draft of this audit said "three of the four" from\n'
    + '     reading the three candidates nearest to hand, and the count says two');
  ok(SPLIT_SET_HOSTED_BY_CONSUMER < ONE_CONSUMER_SPLIT,
    '…so the other two answer to different consumers, and the count measures something '
    + 'rather than restating the set size');
}
// (e) But the direction DECIDES only a handful, so this is a narrow refinement.
{
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  const decided = clean.filter((c) => byConsumer(c.p) > 1 && byConsumerSplit(c.p, c.split) === 1);
  eq(decided.length, DECIDED_BY_FOUNDATION,
    'the foundation half changes the verdict for DECIDED_BY_FOUNDATION clean candidates and '
    + 'no others — a narrow refinement that happens to decide this cycle, which is the same '
    + 'shape as the #458 split of consumers out of sites');
  ok(decided.some((c) => c.lo === RAW_AT_IN_CODE),
    '…this region among them, which is why the audit is written about it');
  ok(DECIDED_BY_FOUNDATION < CLEAN_CANDIDATES / 100,
    '…and under a hundredth of the clean set, stated as a comparison rather than as "few"');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen that found it');
// ─────────────────────────────────────────────────────────────────────────────
{
  eq(rawRunCount, RAW_RUNS, 'the regions yield RAW_RUNS contiguous owner runs');
  eq(seamRejectedCount, SEAM_REJECTED, '…of which SEAM_REJECTED are refused by assertSeam');
  eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct extractable candidates');
  const clean = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
  eq(clean.length, CLEAN_CANDIDATES, 'CLEAN_CANDIDATES of them run nothing at load');
  ok(candidateRuns.length - clean.length > 0,
    '…and the rest DO, so the evaluation-time rule still discriminates');
  eq(clean.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
    ONE_CONSUMER_MULTI_SITE,
    'ONE_CONSUMER_MULTI_SITE have one consumer and more than one site, so the #458 refinement '
    + 'still separates part of the set');
  ok(clean.some((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE),
    'and THIS recommendation IS in the candidate set — unlike the last cycle\'s, which the '
    + 'screen could not reach at all');
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, the owner runs, and the canary comment is wrong');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx), OWNERS_EXPECTED, 'it loads in a COMPLETELY empty VM, defining one global');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    setInterval: () => { watched.push('setInterval'); },
    WebSocket: function () { watched.push('WebSocket'); },
    localStorage: { getItem: () => { watched.push('localStorage.getItem'); return null; } },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [],
    'loading it opens no socket, performs no fetch, starts no timer and binds no listener — '
    + 'note it does ALL of those when CALLED, which is exactly the distinction');
  const ctl = [];
  const ctx2 = { setTimeout: () => { ctl.push('setTimeout'); } };
  vm.createContext(ctx2);
  vm.runInContext('setTimeout(function(){}, 0);', ctx2);
  eq(ctl, ['setTimeout'], 'control — the same watcher records a call when there is one to record');
}
// THE OWNER IS CALLED, three ways. A function that loads bare but throws on its
// own shape would satisfy every clause above.
function driveDxlink(symbols, over) {
  const sent = [];
  let socket = null;
  function FakeWebSocket(url) {
    this.url = url; this.readyState = 1; socket = this;
    this.send = (s) => { sent.push(JSON.parse(s)); };
    this.close = () => { this.readyState = 3; };
  }
  const ctx = Object.assign({
    ttCall: async () => ({ dxlinkUrl: 'wss://fake.invalid', token: 'TOKEN' }),
    WebSocket: FakeWebSocket,
    setTimeout, clearTimeout, Promise, JSON, Error,
    console: { log() {}, warn() {}, error() {}, debug() {} },
  }, over);
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  const promise = ctx.fetchDXLinkGreeks(symbols);
  return {
    promise, sent,
    socket: () => socket,
    reply: (msg) => socket.onmessage({ data: JSON.stringify(msg) }),
  };
}
{
  // (i) The empty list short-circuits before any socket or token call.
  let tokenCalls = 0;
  const d = driveDxlink([], { ttCall: async () => { tokenCalls++; return {}; } });
  const empty = await d.promise;
  // Object.assign copies the VM realm's object into this one. deepStrictEqual
  // compares PROTOTYPES, and a literal built inside a vm context carries that
  // context's Object.prototype — so a bare eq() here fails on two empty maps.
  eq(Object.assign({}, empty), {}, 'called with no symbols it returns an empty map…');
  eq(tokenCalls, 0, '…without asking for a quote token');
  eq(d.socket(), null, '…and without opening a socket');
}
{
  // (ii) A control on an input where the answer DIFFERS — the whole protocol,
  //      driven against a fake socket, resolving BEFORE the 5s deadline.
  const d = driveDxlink(['.SPY240614C500']);
  await new Promise((r) => setImmediate(r));
  ok(d.socket() !== null, 'called with a symbol it opens a socket…');
  eq(d.socket().url, 'wss://fake.invalid', '…at the url the quote token gave it');
  d.socket().onopen();
  eq(d.sent.map((m) => m.type), ['SETUP'], '…and sends SETUP first');
  d.reply({ type: 'SETUP', channel: 0 });
  d.reply({ type: 'AUTH_STATE', channel: 0, state: 'AUTHORIZED' });
  d.reply({ type: 'CHANNEL_OPENED', channel: 1 });
  eq(d.sent.map((m) => m.type), ['SETUP', 'AUTH', 'CHANNEL_REQUEST', 'FEED_SETUP', 'FEED_SUBSCRIPTION'],
    '…then walks the whole DXLink handshake in order');
  d.reply({ type: 'FEED_DATA', channel: 1, data: [{ eventSymbol: '.SPY240614C500',
    delta: 0.5, theta: -0.1, gamma: 0.02, vega: 0.3, volatility: 0.2, bidPrice: 1.2, askPrice: 1.3 }] });
  const got = await d.promise;
  eq(Object.assign({}, got['.SPY240614C500']),
    { delta: 0.5, theta: -0.1, gamma: 0.02, vega: 0.3, volatility: 0.2, bid: 1.2, ask: 1.3 },
    '…and resolves with the requested symbol filled from the feed, which is the answer '
    + 'DIFFERING from the empty-list case rather than an empty map twice');
  eq(d.socket().readyState, 3, '…having closed the socket on the way out');

  // THE INCIDENTAL DEFECT, read out of the resolved value.
  eq(Object.prototype.hasOwnProperty.call(got, CANARY_SYMBOL), CANARY_IN_RESULT,
    'THE CANARY IS IN THE RETURNED MAP, which the comment two lines above it denies');
  eq(Object.assign({}, got[CANARY_SYMBOL]), { _canary: true, bid: null, ask: null },
    '…carrying the shape the source gives it, untouched by the feed');
  eq(Object.keys(got).sort(), ['.SPY240614C500', CANARY_SYMBOL].sort(),
    '…so the caller receives one key MORE than it asked for');
  ok(BODY.indexOf(CANARY_CLAIM) >= 0,
    'and the source really does carry the claim this section refutes, quoted rather than '
    + 'paraphrased: a relocation moves bytes, so Phase 2 carries the wrong comment across');
  ok(BODY.indexOf('never blocks checkComplete') >= 0,
    '…whose FIRST half is true, which is why the defect is worth pinning precisely');
}
{
  // (iii) A bad token shape throws, by its exact message.
  const d = driveDxlink(['.X'], { ttCall: async () => ({}) });
  let message = null;
  try { await d.promise; } catch (e) { message = e.message; }
  eq(message, 'fetchDXLinkGreeks: /quote-token bad shape',
    'a /quote-token response with neither url nor token is refused by its exact message');
}
{
  // (iv) A socket error resolves rather than hanging.
  const d = driveDxlink(['.Y']);
  await new Promise((r) => setImmediate(r));
  d.socket().onerror();
  const got = await d.promise;
  eq(Object.assign({}, got['.Y']),
    { delta: null, theta: null, gamma: null, vega: null, volatility: null, bid: null, ask: null },
    'a socket error resolves with the unfilled map rather than rejecting or hanging');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Every documented failure, with its exact message');
// ─────────────────────────────────────────────────────────────────────────────
eq(UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, MODULE), INDEX,
  'the undo reconstructs the base exactly — the whole point of the helper');
eq(UNDO.isApplied(LIVE_INDEX), true, 'isApplied answers true for the shipped document');
eq(UNDO.isApplied(INDEX), false, '…and false for the document that predates this layer');
eq(UNDO.isApplied(42), false, '…and false, rather than throwing, for a non-string');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(42, MODULE),
  'DXLINK_GREEKS_FETCH_UNDO_BAD_INPUT', 'a non-string document is refused by name');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, 42),
  'DXLINK_GREEKS_FETCH_UNDO_BAD_INPUT', '…as is a non-string module');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, MODULE + 'x'),
  'DXLINK_GREEKS_FETCH_UNDO_MODULE_IDENTITY', 'a padded module is refused');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, MODULE.slice(0, -1)),
  'DXLINK_GREEKS_FETCH_UNDO_MODULE_IDENTITY', '…as is a truncated one');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, MODULE + '\n'),
  'DXLINK_GREEKS_FETCH_UNDO_MODULE_IDENTITY',
  '…and so is one that RE-ABSORBED the structural separator: it is one unit too long');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, MODULE.slice(0, -2) + 'x\n'),
  'DXLINK_GREEKS_FETCH_UNDO_MODULE_SEPARATOR',
  'a module of the right LENGTH that no longer ends on a closing brace gets its own error');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX, ' ' + MODULE.slice(1)),
  'DXLINK_GREEKS_FETCH_UNDO_MODULE_IDENTITY',
  'a module of the right length and ending whose BYTES differ is caught by the digest');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX.replace(TAG, ''), MODULE),
  'DXLINK_GREEKS_FETCH_UNDO_TAG_IDENTITY', 'a document with no tag is refused');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX.replace(TAG, TAG + TAG), MODULE),
  'DXLINK_GREEKS_FETCH_UNDO_TAG_IDENTITY', '…as is one with the tag twice');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(
  LIVE_INDEX.replace(ANCHOR_TAG + TAG, TAG + ANCHOR_TAG), MODULE),
'DXLINK_GREEKS_FETCH_UNDO_TAG_ADJACENCY', 'a REORDERED tag is refused by adjacency');
throwsWith(() => UNDO.undoDxlinkGreeksFetch(LIVE_INDEX + 'x', MODULE),
  'DXLINK_GREEKS_FETCH_UNDO_EXTRACTED_IDENTITY', 'foreign content anywhere is refused');
{
  const stranded = LIVE_INDEX.slice(0, UNDO.RAW_AT) + '\n' + LIVE_INDEX.slice(UNDO.RAW_AT);
  eq(stranded.length, UNDO.EXTRACTED_CHARS + 1, 'the stranded-separator mutant is one unit too long');
  throwsWith(() => UNDO.undoDxlinkGreeksFetch(stranded, MODULE),
    'DXLINK_GREEKS_FETCH_UNDO_EXTRACTED_IDENTITY',
    '…and a structural separator left inline is rejected by the whole-document gate');
}
throwsWith(() => UNDO.undoDxlinkGreeksFetch(INDEX, MODULE),
  'DXLINK_GREEKS_FETCH_UNDO_TAG_IDENTITY',
  'an ALREADY-unextracted document is refused rather than silently doubled');

// ─────────────────────────────────────────────────────────────────────────────
section('9. Reachability, the chain, and exact production scope');
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
    '…and the owner is not among them: this is live code with a live consumer');
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
    'this layer sits at MODULE_SIZE_RANK by size — mid-pack, neither end');
  eq(bySize[MODULE_SIZE_RANK - 1].units, UNDO.MODULE_CHARS,
    '…and the module at that rank is this one, by its undo helper\'s own pin');
  ok(bySize[0].units < UNDO.MODULE_CHARS && bySize[bySize.length - 1].units > UNDO.MODULE_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  eq(sources.filter((s) => s.endsWith('}\n')).length, LAYERS_ENDING_BRACE,
    'LAYERS_ENDING_BRACE of the chain end `}\\n`, this one among them');

  // "PURE ASCII", "UNDOCUMENTED" AND "OPENS ON A BANNER" ARE ALL SUPERLATIVES
  // WAITING TO BE WRITTEN WRONG, so each is a count over the whole chain rather
  // than an adjective about this layer.
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'exactly PURE_ASCII_LAYERS layers in the chain are pure ASCII');
  ok(/[^\x00-\x7F]/.test(MODULE), '…and this module is NOT one of them');
  eq(sources.filter((s) => s.split('\n').filter((l) => /^\s*\/\//.test(l)).length === 0).length,
    UNDOCUMENTED_LAYERS, 'exactly UNDOCUMENTED_LAYERS layers carry no comment line at all');
  ok(MODULE.split('\n').filter((l) => /^\s*\/\//.test(l)).length > 0,
    '…and this module is not one of those either');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(/^\/\/ ── /.test(MODULE.split('\n')[0]),
    '…this one among them, which is why §2 pins its exact text');
  ok(CHAIN_LENGTH - LAYERS_OPENING_ON_BANNER > 0,
    '…while the rest do not, so opening on one is neither a rule nor a first');

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
    '…and LAYERS_WITHOUT_SEPARATOR do not: the convention is NOT uniform across this chain');
  eq(withSeparator.filter((M) => M.RAW_CHARS === M.MODULE_CHARS + 1).length, LAYERS_WITH_RAW_PAIR,
    '…while only LAYERS_WITH_RAW_PAIR pin a single RAW/MODULE pair one unit apart, so that '
    + 'pair is not the tell the separator is');
  ok(Object.prototype.hasOwnProperty.call(UNDO, 'SEPARATOR'),
    '…and this layer follows the post-#406 convention, which its own export settles');
}
{
  const committed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const changed = Array.from(new Set(committed.concat(status))).sort();
  eq(changed.filter((rel) => rel === 'index.html' || rel.startsWith('js/')),
    ['index.html', MODULE_REL, 'js/portfolio/portfolio-technical-parity.js'].sort(),
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
    'and the previous newest layer\'s spec is retired, in chain order');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…that path too being one the base commit carried');
  ok(fs.existsSync(path.join(ROOT, RETIRED_CONTRACT_REL)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retires, not the file');
  // EXISTENCE ALONE DOES NOT NAME IT, and the mutation pass proved that here: a mutant
  // pointing RETIRED_CONTRACT_REL at a NEIGHBOURING contract survived, because that file
  // still ships too and the clause above was satisfied by it. The name is pinned to the
  // one the retired spec itself targeted, read out of the commit that still carried it.
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + RETIRED_CONTRACT_REL + "'") >= 0,
    '…and it is the contract that retired spec TARGETED, not merely a contract that exists');
  // RETIRED IN #467, in chain order. Every assertion in this file still runs on
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
    rel === 'js/portfolio/portfolio-technical-parity.js' ||
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
    // the live number made the next cycle's Phase 1 fail on a contract it had
    // not touched. What survives is the INVARIANT, and this layer's own
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
    // remembered. A constant nothing reads is a constant whose mutant survives,
    // which is how this assertion came to be written.
    const entriesAt = (rel) => (git(['show', BASE_SHA + ':' + rel]).match(/\n  \{ id: "/g) || []).length;
    eq(entriesAt(AUDIT_SPEC_REL) + entriesAt(RETIRED_SPEC_REL), RETIRED_MUTANTS,
      '…and the two spec paths this cycle removes carried RETIRED_MUTANTS between them, '
      + 'counted in the base commit that still holds both');
    ok(entriesAt(AUDIT_SPEC_REL) > 0 && entriesAt(RETIRED_SPEC_REL) > 0,
      '…each of them non-empty, so the sum is two real specs and not one plus a typo');
    // WHAT THE LIVE TOTAL NO LONGER COUNTS is this contract's mutants: they left
    // with the spec. The live number is read only for the ceiling invariant below,
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
console.log('DXLINK_GREEKS_FETCH_CONTRACT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });