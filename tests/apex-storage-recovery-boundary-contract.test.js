'use strict';

// ═════════════════════════════════════════════════════════════════════════════
// APEX STORAGE RECOVERY — PERMANENT BOUNDARY CONTRACT.
//
// RELOCATION ONLY. This file is the audit of #470 with its recommendation
// CARRIED OUT: the same measurements, now taken on the document the undo helper
// reconstructs rather than on one that still exists. Nothing about the code
// changed — §9 proves the relocation is the whole production diff, and §2 proves
// the module is the block's bytes verbatim.
//
// THE CUT, as audited and as shipped: [730399,734656) in monolith coordinates,
// 4,257 units raw and 4,256 of body, five owners, to
// js/services/apex-storage-recovery.js. They are the non-destructive storage
// recovery helpers: `apexStorageKeyVariants` (511), `_apexReadArray` (319),
// `apexNonDestructiveLoadArray` (946), `apexBackupKey` (327) and
// `apexCreateBackup` (581). All five are functions, so this layer ships no
// mutable binding at all.
//
// WHY EVERY NUMBER BELOW STILL MEASURES SOMETHING. An audit reads index.html; a
// contract cannot, because the region it describes is no longer in index.html.
// So `INDEX` here is the output of tests/lib/apex-storage-recovery-undo.js, and
// a coordinate that has drifted by one byte fails in the undo helper's identity
// guards before this file asserts anything at all. The audit's numbers are
// therefore not copied forward on trust: they are re-derived from a
// reconstruction that is itself proved byte-exact.
//
// ── THE FINDING: THE BANNER NAMES A FAMILY, NOT A REGION ───────────────────
//
// The region opens ON a `// ── ` banner — `// ── Non-destructive storage
// recovery helpers` — which the two cycles before this one could not do, and
// that banner names exactly the five owners this cut takes. It names them in
// PROSE. It does not name any of them by IDENTIFIER, which is why audit #466's
// measurement of banners that name an owner they govern is still ZERO and §4
// re-runs it to confirm that rather than quietly contradicting it.
//
// AND THE REGION THE BANNER OPENS IS NOT THE FEATURE. It runs 7,471 units and
// holds SIX top-level declarations: the five recovery helpers, and then
// `portfolioManager` (2,816 units), a different feature entirely — its own
// comment block opens "Portfolios are BACKEND-ONLY", which is the opposite
// subject from a localStorage recovery path.
//
// SO THIS IS THE SHARPEST COUNTEREXAMPLE YET TO A RULE THIS PROGRAMME ALREADY
// KILLED. "Never cut inside a `// ── ` banner region" is pinned as dead in §5(c)
// of tests/journal-map-audit-boundary-contract.test.js, and until now the case
// against it was qualitative. Here it is a number: obeying it would add 3,214
// units and take byConsumer from 2 to 35 — one consumer becomes six. §4
// measures both sides rather than asserting the ratio.
//
// ── COUPLING ───────────────────────────────────────────────────────────────
//
// FIVE edges reach in, all five hosted by `journalManager` — 27,165 units. That
// is ONE consumer at five sites, and it is a hub this chain has not cut for
// before: of the SIX shipped layers whose contract pins EDGE_HOSTS at all, NONE
// names `journalManager`, and §3 counts that over those six rather than over the
// chain, because EDGE_HOSTS is a recent convention and most layers do not carry
// it. It also ends the run of three consecutive layers on `refreshPositionsLive`
// that the last cycle recorded.
//
// ONE monolith dependency, `apexStorageKey`, declared 1,731 units earlier under
// the previous banner. It is referenced ONCE from inside the cut and SEVEN
// times from outside it, which is why it stays where it is: §5(d) measures what
// absorbing it would cost.
//
// EVERY OTHER DIRECTION IS ZERO, including BOTH halves of the ninth: this
// region reaches into no module at all, chain or foundation. That is a cleaner
// ninth than the layer that shipped before it, which reached six times into
// foundation modules, and §3 keeps the two halves apart because they are
// different claims.
//
// ITS ONE DEPENDENCY IS NOT `typeof`-GUARDED, and this audit says so rather
// than reaching for the property the last cycle happened to have. The reference
// sits inside a function body — the call-time resolution that separated audit
// #424's rejection from every layer accepted since — but the module would need
// `apexStorageKey` defined by the time a caller runs. §3 measures the guard and
// reports zero of one.
//
// ── WHY THE OTHER BOUNDARIES ARE REFUSED ───────────────────────────────────
//
// §5 measures four alternatives and publishes why each loses:
//
//   (a) starting at the FIRST FUNCTION instead of the banner — identical
//       coupling, 985 units smaller, and it abandons the banner that names the
//       family. The banner IS the boundary evidence; leaving it behind throws
//       away the only structural signal this cut has.
//   (b) stopping before the backup pair — the nine-direction total falls from
//       6 to 4, but byConsumerSplit is unchanged at 2 and the same one consumer
//       calls `apexCreateBackup` twice. It buys a smaller number by leaving
//       half the feature behind.
//   (c) obeying the dead rule and taking the whole banner region — 3,214 more
//       units, byConsumer 2 → 35, six consumers. This is §4's finding, executed.
//   (d) absorbing `apexStorageKey` — 1,731 more units, four consumers instead
//       of one and a nine-direction total of 14, because that helper is named
//       from seven sites outside the cut.
//
// ── WHAT THE SCREEN SAYS, AND THE THREE AHEAD OF IT ────────────────────────
//
// THE SCREEN CAN SEE THIS CUT — unlike the last one, which began on a comment
// block. It enumerates it exactly, and ranks it FOURTH of 1,867 clean
// candidates by byConsumerSplit then size. No clean candidate scoring 2 is
// larger. §6 asserts both.
//
// The three ahead all score 1, and all three are refused on boundary grounds
// this audit RE-MEASURES rather than recalls — they are identified by their
// OWNER NAMES, because offsets move with every cut:
//
//   `_snapshotSqueezeState` + `_positionFieldsFromSnapshot` — opens ON a
//       `// ═══` SECTION region of 9,206 units that CONTINUES past the cut, so
//       taking the header would leave the section that keeps its third owner
//       with no title. That is the defect audit #462 published.
//   `_validateBackendFullRefreshPayload` — a lone owner 11,911 units inside the
//       69,258-unit `[PortfolioRefreshPayload]` banner region, which holds 27
//       owners and is the mis-labelled catch-all audit #466 named.
//   `_fetchPortfolioTechnicalBatch` — another lone owner inside the SAME region.
//
// ── THE RUNNER-UP, PUBLISHED RATHER THAN HIDDEN ────────────────────────────
//
// [751577,754911), the portfolio quantity-field helpers: 3,334 units of body,
// the same byConsumerSplit of 2 and the same nine-direction total of 6, but TWO
// consumers rather than one. It loses on that, and §5 records its numbers so a
// later cycle can take it without re-deriving them.
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


const MODULE_REL = 'js/services/apex-storage-recovery.js';
const CONTRACT_REL = 'tests/apex-storage-recovery-boundary-contract.test.js';
const UNDO_REL = 'tests/lib/apex-storage-recovery-undo.js';
const UNDO = require('./lib/apex-storage-recovery-undo.js');

// ── The base ─────────────────────────────────────────────────────────────────
// The commit this relocation was cut from. #470 merged the audit as 834b5ec and
// #471 followed with a tests-only change, so index.html is byte-identical across
// both and the base named here is the one this branch actually started from.
const BASE_SHA = 'aced93f';
const BASE_CHARS = 1468002;
const BASE_UTF8 = 1496711;
const BASE_LF = 25420;
const BASE_SHA256 = 'cd9caf4339b47b890dd096468a42b92515fa879859df606629b7c8964a613dfa';
const LOCAL_SCRIPTS = 83;
const BASE_TEST_FILE_COUNT = 168;
const TEST_FILE_COUNT = 168;

// ── The files of this change ─────────────────────────────────────────────────
const AUDIT_REL = 'tests/temporary-apex-storage-recovery-boundary-audit.test.js';
const AUDIT_SPEC_REL = 'tests/mutation-specs/apex-storage-recovery-audit.spec.js';
const RATCHETED_CONTRACTS = 30;
const COVERAGE_CONTRACT = 'tests/mutation-coverage-contract.test.js';
const NEWEST_CONTRACT = 'tests/portfolio-spy-price-boundary-contract.test.js';
const NEWEST_CONTRACT_SPEC = 'tests/mutation-specs/portfolio-spy-price-contract.spec.js';
const BASE_DECLARED_MUTANTS = 141;
// The spec this phase retires — the AUDIT's, which is the only one Phase 2
// retires now that the outgoing contract's went in Phase 1 — and what it
// carried. §10 asserts the arithmetic rather than the total.
const RETIRED_SPEC_REL = 'tests/mutation-specs/apex-storage-recovery-audit.spec.js';
const RETIRED_MUTANTS = 135;
const CONTRACT_SPEC_REL = 'tests/mutation-specs/apex-storage-recovery-contract.spec.js';
const BASE_SPECS = 2;
const CEILING_HEADROOM = 106;
const MUTANT_BUDGET = 250;
// EXACTLY ONE NON-COVERAGE SPEC IS COMMITTED AT ANY TIME, and from this cycle
// that is uniform across both phases: this audit's spec now, the next layer's
// contract spec after Phase 2. The predicate is every `.spec.js` but the
// coverage spec, NOT `-contract.spec.js` — the narrower one could not see an
// audit spec at all, so it read 1 during Phase 1 while TWO were committed.
const LAYER_SPECS = 1;

// ── The monolith, at this base ───────────────────────────────────────────────
const CODE_AT = 114864;
const CODE_CHARS = 1353112;
const TOP_LEVEL_DECLS = 930;
const TOP_LEVEL_BANNERS = 221;
const OWNER_REGIONS = 120;

// ── The recommended region ───────────────────────────────────────────────────
const RAW_AT_IN_CODE = 730399;
const RAW_END_IN_CODE = 734656;
const BODY_END_IN_CODE = 734655;
const RAW_CHARS = 4257;
const BODY_CHARS = 4256;
const BODY_UTF8 = 4326;
const BODY_LF = 92;
const BODY_SHA256 = '62e5cf5233de9b235ac99b2d1adb4bb4104fe0775914c9ffb56740fa8697f3ff';
const BODY_ENDING = '}\n';
const OWNERS_EXPECTED = [
  'apexStorageKeyVariants',
  '_apexReadArray',
  'apexNonDestructiveLoadArray',
  'apexBackupKey',
  'apexCreateBackup',
];
const OWNER_COUNT = 5;
const OWNER_SIZES = [511, 319, 946, 327, 581];
const TOTAL_LINES = 93;
const CODE_LINES = 66;
const OPENING_COMMENT_LINES = 21;
// The block the cut OPENS on: a `// ── ` banner line and the prose under it,
// running to the first declaration. §4 is the measurement of what that banner
// does and does not name.
const OPENING_BLOCK_CHARS = 985;
const BANNER_LINE =
  '// ── Non-destructive storage recovery helpers ──────────────────────────────';
const NET_REDUCTION = 4194;
const RESIDUAL_MONOLITH = 1348855;
const INDEX_AFTER = 1463808;
const TAG_GAP = 730407;

// ── Coupling, in all NINE directions ─────────────────────────────────────────
const EXTERNAL_EDGES = 5;
const EDGE_SITES = [1255536, 1256738, 1256891, 1257604, 1259869];
const EDGE_HOSTS = ['journalManager'];
const DISTINCT_CONSUMERS = 1;
const CONSUMER_CHARS = 27165;
const MONOLITH_DEPENDENCIES = ['apexStorageKey'];
const DEPENDENCY_AT = 728668;
const DEPENDENCY_CHARS = 277;
const DEPENDENCY_DISTANCE = 1731;
const DEPENDENCY_REFS_INSIDE = 1;
const DEPENDENCY_REFS_OUTSIDE = 7;
// NOT guarded, and the count is pinned rather than the adjective. The last
// layer's outward surface was entirely `typeof`-guarded; this one's is not, and
// an audit that reached for that property again would be describing the
// previous region rather than this one.
const DEPENDENCY_GUARDED_REFS = 0;
// The host globals the region needs, which are NOT monolith declarations and so
// appear in none of the nine directions. §7 injects them and drives the owners.
const HOST_GLOBAL_REFS = { localStorage: 5, console: 1 };
const ZERO_DIRECTIONS = {
  inboundWrites: 0, inboundPropertyWrites: 0, outboundWrites: 0,
  siblingModules: 0, staticMarkup: 0, generatedMarkup: 0, outboundGenerated: 0,
};
// BOTH halves of the ninth are zero here — the first cut since #465 split that
// direction for which that is true, which §3 asserts over the split rather than
// claiming as an adjective.
const CHAIN_OUTBOUND = 0;
const FOUNDATION_OUTBOUND = 0;
const FULL_NINE = 6;
const BY_CONSUMER = 2;
const BY_CONSUMER_SPLIT = 2;
const EVALUATION_TIME_READS = [];
const TOP_LEVEL_STATEMENT_LINES = 0;
const VM_GLOBALS = 5;

// ── The hub, counted over the contracts that pin one ─────────────────────────
const LAYERS_PINNING_EDGE_HOSTS = 7;
const LAYERS_ON_THIS_HUB = 1;
const LAYERS_ON_THE_PREVIOUS_HUB = 4;
const CONSECUTIVE_NEWEST_ON_THE_PREVIOUS_HUB = 0;
const PREVIOUS_HUB = 'refreshPositionsLive';

// ── THE FINDING: the banner names a FAMILY, and the region holds a second one ─
const BANNER_REGION_AT = 730399;
const BANNER_REGION_END = 737870;
const BANNER_REGION_CHARS = 7471;
const BANNER_REGION_OWNERS = 6;
const SECOND_FEATURE = 'portfolioManager';
const SECOND_FEATURE_AT = 735052;
const SECOND_FEATURE_CHARS = 2816;
const SECOND_FEATURE_FIRST_LINE =
  '// Portfolios are BACKEND-ONLY. `_portfolios` is an in-memory copy of the most';
// The identifier-level measurement audit #466 published, re-run here. It is
// still ZERO, which is the reason this banner is evidence and not a rule.
const BANNERS_NAMING_AN_OWNER_THEY_GOVERN = 0;
const DASH_BANNERS = 77;
// What the dead rule would cost, both sides measured.
const DEAD_RULE_EXTRA_UNITS = 3214;
const DEAD_RULE_BY_CONSUMER = 35;
const DEAD_RULE_NINE = 42;
const DEAD_RULE_CONSUMERS = 6;
const DEAD_RULE_CONTRACT = 'tests/journal-map-audit-boundary-contract.test.js';
// The sentence that file alone carries. Existence does not name a file when
// every sibling exists too, which is how the mutation pass caught this one.
const DEAD_RULE_VERDICT = 'is pinned here as dead rather than adopted';

// ── The four refused boundaries, and the runner-up ───────────────────────────
const ALT_FN_START_AT = 731384;
const ALT_STOP_BEFORE_BACKUP_AT = 733527;
const ALT_STOP_BEFORE_BACKUP_NINE = 4;
const ALT_WITH_DEPENDENCY_AT = 728668;
const ALT_WITH_DEPENDENCY_NINE = 14;
const ALT_WITH_DEPENDENCY_BY_CONSUMER = 8;
const ALT_WITH_DEPENDENCY_CONSUMERS = 4;
const BACKUP_PAIR = ['apexBackupKey', 'apexCreateBackup'];
const BACKUP_CALL_SITES = 2;
const RUNNER_UP_AT = 751577;
const RUNNER_UP_BANNER =
  '// ── CANONICAL LEG QUANTITY — reconciled with the backend owner (semantics 2.1.0)';
const RUNNER_UP_END = 754911;
const RUNNER_UP_BY_CONSUMER_SPLIT = 2;
const RUNNER_UP_FULL_NINE = 6;
const RUNNER_UP_CONSUMERS = 2;
const RUNNER_UP_OWNERS = 5;

// ── The screen ───────────────────────────────────────────────────────────────
const RUN_FLOOR = 1500;
const RAW_RUNS = 7391;
const SEAM_REJECTED = 2048;
const CANDIDATES = 3034;
const CLEAN_CANDIDATES = 1867;
const ONE_CONSUMER_RAW = 1;
const ONE_CONSUMER_SPLIT = 3;
const ONE_CONSUMER_MULTI_SITE = 105;
const SCREEN_RANK = 4;
const BETTER_SCORING = 3;
const LARGER_AT_THE_SAME_SCORE = 0;
// The three ahead, named by their OWNERS rather than by offsets, which move
// with every cut this programme makes.
const AHEAD_OWNERS = [
  '_snapshotSqueezeState',
  '_validateBackendFullRefreshPayload',
  '_fetchPortfolioTechnicalBatch',
];
const SECTION_REGION_CHARS = 9206;
const SECTION_REGION_OWNERS = 3;
const CATCH_ALL_AT = 906634;
const CATCH_ALL_END = 975892;
const CATCH_ALL_CHARS = 69258;
const CATCH_ALL_OWNERS = 27;

// ── Where this layer would sit ───────────────────────────────────────────────
const CHAIN_LENGTH = 40;
const SIZE_RANK = 5;
const SMALLEST_LAYER_CHARS = 1761;
const LARGEST_LAYER_CHARS = 71811;
const LAYERS_LARGER_THAN_THIS_CUT = 35;
const PURE_ASCII_LAYERS = 2;
const LAYERS_OPENING_ON_BANNER = 22;

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

console.log('PORTFOLIO TECHNICAL PARITY — TEMPORARY BOUNDARY AUDIT');
console.log('measurement only · base=' + BASE_SHA);

// MEASUREMENT ONLY: nothing is peeled and nothing has moved, so the shipped
// document IS the one this audit measures. §4 reconstructs the PREVIOUS one
// for its control, and that is the only place a peeled document appears.
// THIS IS THE NEWEST LAYER, so nothing is peeled above it: the live document IS
// this layer's shipped document. When a later cycle cuts again, a peel goes here
// and LIVE_INDEX stops being the head of the tree — the idiom every older
// contract in this chain already carries.
const LIVE_INDEX = APP_LOADER.loadIndexHtml();
const MODULE = fs.readFileSync(path.join(ROOT, MODULE_REL), 'utf8');
const LIVE_TAGS = APP_LOADER.parseScriptTags(LIVE_INDEX);
const LIVE_LOCALS = LIVE_TAGS.filter((t) => t.src && /^\.\//.test(t.src)).map((t) => t.src.replace(/^\.\//, ''));

// EVERYTHING BELOW IS MEASURED ON THE RECONSTRUCTED BASE, not on a remembered
// copy of it: the undo helper runs first, so every coordinate this file inherited
// from the audit is now proved by the reconstruction that shipped rather than by
// a document that no longer exists.
const INDEX = UNDO.undoApexStorageRecovery(LIVE_INDEX, MODULE);
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

// ── The chain, as it stands with this layer on it ───────────────────────────
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
  'js/portfolio/portfolio-technical-parity.js',
  'js/portfolio/portfolio-spy-price.js',
  'js/services/apex-storage-recovery.js',
];

async function main() {

// CHAIN is declared at module scope, above main() — see the literal there.
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
// Which KIND of module owns a name: one this programme extracted, or one that
// predates it. CHAIN is read off the newest contract above; the split is the
// reading #465 established and §3 keeps its two halves apart.
for (const c of candidateRuns) { c.split = outboundSplit(c.lo, c.hi); }

// The comment block that heads a declaration: the contiguous run of `//` lines
// ending where the declaration starts. THE FINDING in §4 rests on this, so it
// is one function used for every measurement rather than three spellings.
function blockAbove(d) {
  let at = CODE.lastIndexOf('\n', d.start - 1) + 1;
  let first = null;
  while (at > 0) {
    const ls = CODE.lastIndexOf('\n', at - 2) + 1;
    if (/^\s*\/\//.test(CODE.slice(ls, at - 1))) { first = ls; at = ls; } else break;
  }
  return first === null ? null : { start: first, text: CODE.slice(first, d.start) };
}
const namesIt = (text, name) =>
  new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(text);
const firstLineOf = (text) => text.slice(0, text.indexOf('\n'));
const lineAt = (at) => CODE.slice(at, CODE.indexOf('\n', at));
const nextMarkAfter = (m) => {
  const n = SORTED_MARKS.filter((x) => x > m)[0];
  return n === undefined ? CODE.length : n;
};
// Is every reference to `name` inside `text` behind a `typeof` test on it?
function guardedRefs(text, name) {
  const sites = refSites(maskLiterals(text), name);
  let guarded = 0;
  for (const at of sites) {
    const ls = text.lastIndexOf('\n', at) + 1;
    const le = text.indexOf('\n', at);
    const line = text.slice(ls, le < 0 ? text.length : le);
    if (new RegExp("typeof\\s+" + name.replace(/\$/g, '\\$') + "\\s*(!==|===)\\s*'(undefined|function)'")
      .test(line)) guarded++;
  }
  return { total: sites.length, guarded };
}


// ─────────────────────────────────────────────────────────────────────────────
section('1. The shipped document, and the base the undo helper reconstructs');
// ─────────────────────────────────────────────────────────────────────────────
// THE LIVE DOCUMENT FIRST. Everything after this is measured on the
// reconstruction, so the shipped side is pinned here or it is pinned nowhere.
eq(LIVE_INDEX.length, UNDO.EXTRACTED_CHARS, 'the shipped index.html is the extracted length');
eq(Buffer.byteLength(LIVE_INDEX, 'utf8'), UNDO.EXTRACTED_UTF8, '…its byte length');
eq((LIVE_INDEX.match(/\n/g) || []).length, UNDO.EXTRACTED_LF, '…its line-feed count');
eq(sha256(LIVE_INDEX), UNDO.EXTRACTED_SHA256, '…and its digest');
eq(LIVE_INDEX.length, INDEX_AFTER,
  '…which is the size audit #470 PREDICTED for it, before the cut was made');
eq(LIVE_LOCALS.length, UNDO.EXTRACTED_LOCAL_SCRIPTS,
  'it loads one more local script than the base did');
eq(LIVE_LOCALS.length, LOCAL_SCRIPTS + 1, '…exactly one more, not more than one');
eq(count(LIVE_INDEX, UNDO.TAG), 1, 'exactly one tag for this module');
eq(count(LIVE_INDEX, UNDO.ANCHOR_TAG + UNDO.TAG + UNDO.INLINE_OPEN), 1,
  '…loaded immediately after the previous layer and immediately before the monolith');
eq(LIVE_LOCALS[LIVE_LOCALS.length - 1], MODULE_REL,
  '…and it is the LAST local script, read off the tail by position');

// AND NOW THE RECONSTRUCTION, which every later section measures.
eq(INDEX.length, BASE_CHARS, 'index.html is BASE_CHARS units');
eq(Buffer.byteLength(INDEX, 'utf8'), BASE_UTF8, '…BASE_UTF8 bytes');
eq((INDEX.match(/\n/g) || []).length, BASE_LF, '…BASE_LF line feeds');
eq(sha256(INDEX), BASE_SHA256, '…and this digest');
eq(sha256(git(['show', BASE_SHA + ':index.html'])), BASE_SHA256,
  'and that digest is the one the base COMMIT carries, not merely one this file remembers');
eq(LOCALS.length, LOCAL_SCRIPTS, 'it loads LOCAL_SCRIPTS local application scripts');
eq(INDEX.indexOf(CODE), CODE_AT, 'the inline monolith starts at CODE_AT');
eq(CODE.length, CODE_CHARS, '…and runs CODE_CHARS units');
eq(DECLS.length, TOP_LEVEL_DECLS, 'it declares TOP_LEVEL_DECLS names at top level');
eq(MARKS.length, TOP_LEVEL_BANNERS, '…under TOP_LEVEL_BANNERS top-level banners');
eq(REGIONS.length, OWNER_REGIONS, '…which merge into OWNER_REGIONS regions that own a declaration');

// ─────────────────────────────────────────────────────────────────────────────
section('2. The recommended region, its boundary and its seam');
// ─────────────────────────────────────────────────────────────────────────────
eq(BODY.length, BODY_CHARS, 'the body is BODY_CHARS units');
eq(Buffer.byteLength(BODY, 'utf8'), BODY_UTF8, '…BODY_UTF8 bytes');
eq((BODY.match(/\n/g) || []).length, BODY_LF, '…BODY_LF line feeds');
eq(sha256(BODY), BODY_SHA256, '…and this digest, which Phase 2 must reproduce exactly');
eq(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE).length, RAW_CHARS,
  'the raw fragment is RAW_CHARS units: the body plus one separator');
eq(RAW_CHARS - BODY_CHARS, 1, '…exactly one, which is the separator');
eq(CODE.slice(BODY_END_IN_CODE, RAW_END_IN_CODE), '\n', '…and that separator is a single newline');
eq(BODY.slice(-2), BODY_ENDING, 'it ends on a closing brace and a newline');
ok(!BODY.endsWith('\n\n'), '…and not on a blank line');
ok(/[^\x00-\x7F]/.test(BODY),
  'it is NOT pure ASCII — the rule characters in its banner settle that');
{
  const next = DECLS.filter((d) => d.start >= RAW_END_IN_CODE)[0];
  eq(snapBodyEnd(CODE, RAW_AT_IN_CODE, next.start), BODY_END_IN_CODE,
    'snapping the chosen end back to the last line of code lands on BODY_END_IN_CODE');
  eq(assertSeam(CODE, RAW_AT_IN_CODE, BODY_END_IN_CODE), RAW_END_IN_CODE,
    'assertSeam accepts this boundary on all four invariants');
  eq(next.name, SECOND_FEATURE,
    'the next top-level owner is SECOND_FEATURE, which §4 is about');
  const block = blockAbove(next);
  ok(block, '…and it is headed by a comment block of its own');
  eq(block.start, RAW_END_IN_CODE,
    '…beginning at EXACTLY the raw end, so the seam falls between the two features rather '
    + 'than inside either, and the structural separator is the blank line dividing them');
  eq(firstLineOf(block.text), SECOND_FEATURE_FIRST_LINE,
    '…and that block opens on SECOND_FEATURE_FIRST_LINE, a different subject entirely');
}
// THE NEAR SIDE: the cut opens ON a banner mark, which the two cycles before
// this one could not do. §4 measures what that banner does and does not name.
ok(MARKS.indexOf(RAW_AT_IN_CODE) >= 0, 'the cut DOES begin on a banner mark');
eq(firstLineOf(BODY), BANNER_LINE, '…that mark being BANNER_LINE');
eq(BY_NAME.get(OWNERS_EXPECTED[0]).start - RAW_AT_IN_CODE, OPENING_BLOCK_CHARS,
  '…which runs OPENING_BLOCK_CHARS units, banner and prose, before the first declaration');
{
  const block = CODE.slice(RAW_AT_IN_CODE, RAW_AT_IN_CODE + OPENING_BLOCK_CHARS);
  ok(block.split('\n').filter(Boolean).every((l) => /^\s*\/\//.test(l)),
    '…every line of it a comment, so nothing executable is swept in');
  eq(CODE.slice(RAW_AT_IN_CODE - 2, RAW_AT_IN_CODE), '\n\n',
    '…with a BLANK LINE before it, so the banner belongs to what FOLLOWS it');
  eq(CODE.slice(RAW_AT_IN_CODE - 3, RAW_AT_IN_CODE - 2), ';',
    '…and what precedes it closed on a semicolon, so nothing is left dangling');
}
{
  const OWNERS = DECLS.filter((d) => d.start >= RAW_AT_IN_CODE && d.end < RAW_END_IN_CODE);
  eq(OWNERS.map((d) => d.name), OWNERS_EXPECTED, 'the block declares exactly these five names');
  eq(OWNERS.length, OWNER_COUNT, '…OWNER_COUNT of them');
  eq(OWNERS.filter((d) => d.form === 'function').length, OWNER_COUNT,
    '…and ALL of them are functions, so this layer would ship no mutable binding at all');
  eq(OWNERS.map((d) => d.chars), OWNER_SIZES, '…at these sizes');
  const lines = BODY.split('\n');
  eq(lines.length, TOTAL_LINES, 'the body is TOTAL_LINES lines');
  eq(lines.filter((l) => !isBlankOrComment(l)).length, CODE_LINES, '…CODE_LINES of them code');
  eq(lines.filter((l) => isBlankOrComment(l)).length, TOTAL_LINES - CODE_LINES,
    '…and the rest are not, which is the two counts above and no third constant');
  eq(lines.filter((l) => /^\s*\/\//.test(l)).length, OPENING_COMMENT_LINES,
    '…OPENING_COMMENT_LINES of which begin a comment');
}
// What the move would cost.
eq(RAW_CHARS - NET_REDUCTION, ('<script src="./' + MODULE_REL + '"></script>\n').length,
  'index.html would fall by NET_REDUCTION units net: the span leaves and a tag arrives');
eq(BASE_CHARS - NET_REDUCTION, INDEX_AFTER, '…leaving index.html at INDEX_AFTER');
eq(CODE_CHARS - RAW_CHARS, RESIDUAL_MONOLITH, '…and the monolith at RESIDUAL_MONOLITH');
{
  const tagWouldSitAt = CODE_AT - '<script>'.length;
  eq((CODE_AT + RAW_AT_IN_CODE) - tagWouldSitAt, TAG_GAP,
    'the tag line would sit TAG_GAP units before the fragment it replaces');
  eq(TAG_GAP - RAW_AT_IN_CODE, '<script>'.length,
    '…which is the region offset plus the width of the inline open, and nothing else');
}

// ─────────────────────────────────────────────────────────────────────────────
section('3. Coupling in all nine directions, and the unguarded dependency');
// ─────────────────────────────────────────────────────────────────────────────
eq(REC.inbound, EXTERNAL_EDGES, 'EXTERNAL_EDGES references reach in from the rest of the monolith');
eq(REC.sites, EDGE_SITES, '…at these exact sites');
ok(REC.sites.every(insideFunction), '…every one inside a function body, so none runs at load');
eq(consumersOf(REC), EDGE_HOSTS, '…all of them hosted by ONE function');
eq(consumersOf(REC).length, DISTINCT_CONSUMERS, '…so there is DISTINCT_CONSUMERS consumer');
{
  const host = BY_NAME.get(EDGE_HOSTS[0]);
  eq(host.chars, CONSUMER_CHARS, '…of CONSUMER_CHARS units');
  ok(host.start >= RAW_END_IN_CODE || host.end < RAW_AT_IN_CODE,
    '…declared outside the region, so the edges really do cross the boundary');
}
// THE HUB, COUNTED OVER THE CONTRACTS THAT PIN ONE rather than over the chain:
// EDGE_HOSTS is a recent convention and most layers do not carry it, so the
// denominator is the six that do.
{
  const pinned = [];
  for (const rel of CHAIN) {
    const base = path.basename(rel).replace(/\.js$/, '');
    const f = fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((x) => x.endsWith('-boundary-contract.test.js'))
      .find((x) => x.replace('-boundary-contract.test.js', '') === base);
    if (!f) continue;
    const m = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')
      .match(/^const EDGE_HOSTS = (\[[^\]]*\]);$/m);
    if (m) pinned.push({ rel, hosts: m[1] });
  }
  eq(pinned.length, LAYERS_PINNING_EDGE_HOSTS,
    'LAYERS_PINNING_EDGE_HOSTS shipped layers pin EDGE_HOSTS at all');
  eq(pinned.filter((x) => x.hosts.indexOf(EDGE_HOSTS[0]) >= 0).length, LAYERS_ON_THIS_HUB,
    '…and LAYERS_ON_THIS_HUB of them names THIS consumer, counted over the seven rather '
    + 'than asserted as a first about the whole chain');
  eq(pinned.filter((x) => x.hosts.indexOf(EDGE_HOSTS[0]) >= 0).map((x) => x.rel), [MODULE_REL],
    '…and that one is THIS layer: no layer before it cut for this hub');
  eq(pinned.filter((x) => x.hosts === "['" + PREVIOUS_HUB + "']").length, LAYERS_ON_THE_PREVIOUS_HUB,
    '…while LAYERS_ON_THE_PREVIOUS_HUB name PREVIOUS_HUB');
  const tail = pinned.slice().reverse();
  let run = 0;
  while (run < tail.length && tail[run].hosts === "['" + PREVIOUS_HUB + "']") run++;
  eq(run, CONSECUTIVE_NEWEST_ON_THE_PREVIOUS_HUB,
    '…and CONSECUTIVE_NEWEST_ON_THE_PREVIOUS_HUB sit consecutively at the newest end now: '
    + 'this layer ended the run of three that the last cycle recorded');
}
eq(REC.deps, MONOLITH_DEPENDENCIES,
  'it names exactly ONE monolith declaration, and the list is the name rather than a count');
{
  const dep = BY_NAME.get(MONOLITH_DEPENDENCIES[0]);
  eq(dep.start, DEPENDENCY_AT, '…declared at DEPENDENCY_AT');
  eq(dep.chars, DEPENDENCY_CHARS, '…of DEPENDENCY_CHARS units');
  eq(Math.abs(dep.start - RAW_AT_IN_CODE), DEPENDENCY_DISTANCE,
    '…DEPENDENCY_DISTANCE units away, under the PREVIOUS banner');
  const all = refSites(MASKED, MONOLITH_DEPENDENCIES[0]);
  const inside = all.filter((i) => i >= RAW_AT_IN_CODE && i < RAW_END_IN_CODE);
  eq(inside.length, DEPENDENCY_REFS_INSIDE, 'DEPENDENCY_REFS_INSIDE reference reaches it from inside the cut');
  eq(all.length - inside.length, DEPENDENCY_REFS_OUTSIDE,
    '…and DEPENDENCY_REFS_OUTSIDE from outside it, which is why it stays where it is');
  // THE GUARD, MEASURED RATHER THAN ASSUMED. The layer before this one guarded
  // every outward reference behind a `typeof` test; this one guards none, and
  // an audit that reached for that property again would be describing the
  // previous region instead of this one.
  const raw = CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  const g = guardedRefs(raw, MONOLITH_DEPENDENCIES[0]);
  eq(g.total, DEPENDENCY_REFS_INSIDE, 'the guard scan sees that one reference');
  eq(g.guarded, DEPENDENCY_GUARDED_REFS, '…and DEPENDENCY_GUARDED_REFS of them are `typeof`-guarded');
  // THE CONTROL, over the shipped modules that pin their own outward surface:
  // the same predicate answers YES for some of them, so the zero above is a
  // measurement rather than a scan that finds nothing anywhere.
  {
    const fullyGuarded = [];
    for (const f of fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((x) => /-boundary-contract\.test\.js$/.test(x))) {
      const src = fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8');
      const dm = src.match(/^const MONOLITH_DEPENDENCIES = (\[[^\]]*\]);$/m);
      const rm = src.match(/^const MODULE_REL = '([^']+)';$/m);
      if (!dm || !rm) continue;
      let names;
      try { names = JSON.parse(dm[1].replace(/'/g, '"')); } catch (e) { continue; }
      if (!names.length || !fs.existsSync(path.join(ROOT, rm[1]))) continue;
      const msrc = fs.readFileSync(path.join(ROOT, rm[1]), 'utf8');
      let t = 0, gg = 0;
      for (const n of names) { const r = guardedRefs(msrc, n); t += r.total; gg += r.guarded; }
      if (t > 0 && t === gg) fullyGuarded.push(rm[1]);
    }
    ok(fullyGuarded.length > 0,
      'control — the same predicate reports a fully guarded surface on the shipped modules '
      + 'that have one, so reporting zero here is a measurement');
    ok(fullyGuarded.indexOf(MODULE_REL) < 0,
      '…and this cut is not among them, which is the claim being made');
  }
  ok(refSites(maskLiterals(raw), MONOLITH_DEPENDENCIES[0])
    .every((i) => functionBodyRanges(raw).some((r) => i >= r.start && i <= r.end)),
  '…and the reference sits INSIDE a function body, so it resolves at call time even '
  + 'though it is not guarded');
}
// THE HOST GLOBALS, which are not monolith declarations and so are in none of
// the nine directions. Naming them here is what makes §7's drives honest.
{
  const raw = maskLiterals(CODE.slice(RAW_AT_IN_CODE, RAW_END_IN_CODE));
  const got = {};
  for (const n of Object.keys(HOST_GLOBAL_REFS)) got[n] = refSites(raw, n).length;
  eq(got, HOST_GLOBAL_REFS, 'it reaches these host globals, at these counts');
  ok(Object.keys(HOST_GLOBAL_REFS).every((n) => !BY_NAME.has(n)),
    '…none of which is a monolith declaration, which is why they score in no direction');
}
eq({
  inboundWrites: REC.inWrites, inboundPropertyWrites: REC.inPropWrites,
  outboundWrites: REC.outWrites.length, siblingModules: REC.sib,
  staticMarkup: REC.mkp, generatedMarkup: REC.gen, outboundGenerated: REC.outGen,
}, ZERO_DIRECTIONS,
'seven of the nine directions are ZERO, and OUTBOUND WRITES is among them — the direction '
+ 'that disqualified a candidate which scored a perfect zero inbound');
// THE NINTH, SPLIT. Both halves are zero here, which is not the same claim twice.
{
  const split = outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE);
  eq(split.chain, CHAIN_OUTBOUND,
    'it reaches into NO module this programme extracted: CHAIN_OUTBOUND references');
  eq(split.foundation, FOUNDATION_OUTBOUND,
    '…and CHAIN_OUTBOUND into modules that predate it either, which is the other half');
  eq(split.chain + split.foundation, REC.outModule,
    '…and the two halves account for every outbound module reference, none left over');
  // THE CONTROL. A split that returned zero for everything would say so here
  // too, and the region the last cycle cut says otherwise.
  const prev = outboundSplit(
    CODE.indexOf('function refreshPositionsLive'), CODE.length);
  ok(prev.foundation > 0,
    'control — the same split reports a NON-zero foundation half elsewhere in this document');
}
eq(REC.nine, FULL_NINE, 'the nine-direction total is FULL_NINE');
eq(byConsumer(REC), BY_CONSUMER, '…BY_CONSUMER when the edges are counted per consumer');
eq(byConsumerSplit(REC, outboundSplit(RAW_AT_IN_CODE, RAW_END_IN_CODE)), BY_CONSUMER_SPLIT,
  '…and BY_CONSUMER_SPLIT once the foundation half is set aside — the same number, because '
  + 'this region has no foundation half to set aside');

// ─────────────────────────────────────────────────────────────────────────────
section('4. THE FINDING: the banner names a FAMILY, and its region holds a second');
// ─────────────────────────────────────────────────────────────────────────────
{
  const band = REGIONS.filter((r) => r.start <= RAW_AT_IN_CODE && r.end > RAW_AT_IN_CODE)[0];
  eq(band.start, BANNER_REGION_AT, 'the banner region begins where the cut begins');
  eq(band.end, BANNER_REGION_END, '…and ends at BANNER_REGION_END');
  eq(band.end - band.start, BANNER_REGION_CHARS, '…BANNER_REGION_CHARS units in all');
  const own = DECLS.filter((d) => d.start >= band.start && d.end < band.end);
  eq(own.length, BANNER_REGION_OWNERS, '…holding BANNER_REGION_OWNERS top-level declarations');
  eq(own.slice(0, OWNER_COUNT).map((d) => d.name), OWNERS_EXPECTED,
    '…the first OWNER_COUNT of which are exactly the recovery helpers');
  const extra = own.slice(OWNER_COUNT);
  eq(extra.map((d) => d.name), [SECOND_FEATURE], '…and the rest is SECOND_FEATURE, alone');
  eq(extra[0].start, SECOND_FEATURE_AT, '…declared at SECOND_FEATURE_AT');
  eq(extra[0].chars, SECOND_FEATURE_CHARS, '…of SECOND_FEATURE_CHARS units');
  eq(band.end - RAW_END_IN_CODE, DEAD_RULE_EXTRA_UNITS,
    'obeying the dead rule would add DEAD_RULE_EXTRA_UNITS units');

  // THE BANNER NAMES THE FAMILY IN PROSE AND NO OWNER BY IDENTIFIER, which is
  // why audit #466's zero still holds and this banner is evidence, not a rule.
  const bannerText = lineAt(band.start);
  eq(bannerText, BANNER_LINE, 'the banner line is BANNER_LINE');
  eq(own.filter((d) => namesIt(bannerText, d.name)).map((d) => d.name), [],
    '…and it names NONE of the six by identifier');
  ok(/recovery/i.test(bannerText) && /helpers/i.test(bannerText),
    '…while naming the family in prose, which is the whole distinction');
  // The same predicate over every dash banner in the document: still zero.
  {
    const dash = MARKS.filter((m) => /^\/\/ ── /.test(lineAt(m)));
    eq(dash.length, DASH_BANNERS, 'DASH_BANNERS of the top-level banners are `// ── ` banners');
    let naming = 0;
    for (const m of dash) {
      const line = lineAt(m);
      const governed = DECLS.filter((d) => d.start >= m && d.start < nextMarkAfter(m));
      if (governed.some((d) => namesIt(line, d.name))) naming++;
    }
    eq(naming, BANNERS_NAMING_AN_OWNER_THEY_GOVERN,
      'and BANNERS_NAMING_AN_OWNER_THEY_GOVERN of them name an owner they govern — the '
      + 'measurement audit #466 published, re-run here and still zero');
    // THE CONTROL, because a zero and a predicate that measures nothing look
    // identical: the same scan over COMMENT BLOCKS is not zero.
    let blocks = 0;
    for (const d of DECLS) {
      const b = blockAbove(d);
      if (b && namesIt(firstLineOf(b.text), d.name)) blocks++;
    }
    ok(blocks > 0,
      'control — the same naming predicate over comment blocks is NOT zero, so the zero '
      + 'above is a measurement rather than a metric that measures nothing');
  }

  // WHAT THE DEAD RULE WOULD COST, both sides measured rather than the ratio
  // asserted. The rule is pinned as dead in DEAD_RULE_CONTRACT; this is the
  // sharpest counterexample the programme has, and it is a number.
  {
    const whole = profileOf([band.start, band.end]);
    const wsp = outboundSplit(band.start, band.end);
    eq(whole.nine, DEAD_RULE_NINE, 'the whole banner region scores DEAD_RULE_NINE on the nine');
    eq(byConsumer(whole), DEAD_RULE_BY_CONSUMER, '…DEAD_RULE_BY_CONSUMER per consumer');
    eq(byConsumerSplit(whole, wsp), DEAD_RULE_BY_CONSUMER,
      '…and the split reading agrees, so the jump is not an artefact of the ninth');
    eq(consumersOf(whole).length, DEAD_RULE_CONSUMERS,
      '…reaching DEAD_RULE_CONSUMERS consumers where the cut reaches one');
    ok(DEAD_RULE_BY_CONSUMER > BY_CONSUMER * 10,
      '…an order of magnitude worse, which is what makes this a counterexample and not a '
      + 'preference');
    // EXISTENCE AND A COMMON SUBSTRING NAME NOTHING. Both clauses here were
    // satisfied by a NEIGHBOURING contract — every one of them ships, and every
    // one of them contains `── ` — so the mutation pass reported this constant
    // as a survivor. It is pinned to the sentence that file alone carries.
    ok(fs.existsSync(path.join(ROOT, DEAD_RULE_CONTRACT)),
      'and DEAD_RULE_CONTRACT ships, which is where that rule is pinned as dead');
    // THE VERDICT IS MATCHED TO ITS CLOSING QUOTE, because `indexOf` matches a
    // SUBSTRING: the first draft of this pin survived having its last character
    // removed, which is the same survivor one line up wearing a different hat.
    const carriesVerdict = (src) => src.indexOf(DEAD_RULE_VERDICT + "'") >= 0;
    ok(carriesVerdict(fs.readFileSync(path.join(ROOT, DEAD_RULE_CONTRACT), 'utf8')),
      '…and it is the file that PINS the rule as dead, which DEAD_RULE_VERDICT identifies, '
      + 'not merely a contract that exists and mentions banners');
    // TWO files carry the verdict now, and the set is pinned rather than the
    // ordinal: the contract that PINS the rule as dead, and this one, which
    // quotes it in order to check it. While this file was the temporary audit it
    // was not a `-boundary-contract`, so the census saw one — the kind of
    // "ONLY" that stops being true because the file asserting it moved.
    eq(fs.readdirSync(path.join(ROOT, 'tests'))
      .filter((f) => /-boundary-contract\.test\.js$/.test(f))
      .filter((f) => carriesVerdict(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')))
      .sort(),
    [path.basename(CONTRACT_REL), path.basename(DEAD_RULE_CONTRACT)].sort(),
    '…and exactly TWO contracts carry that verdict — the one that pins it and this one, '
    + 'counted over all of them');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('5. The four refused boundaries, and the runner-up');
// ─────────────────────────────────────────────────────────────────────────────
const alt = (lo, hi) => {
  const be = snapBodyEnd(CODE, lo, hi);
  assertSeam(CODE, lo, be);
  const p = profileOf([lo, be + 1]);
  return { p, split: outboundSplit(lo, be + 1), units: be + 1 - lo, bcs: byConsumerSplit(p, outboundSplit(lo, be + 1)) };
};
// (a) START AT THE FIRST FUNCTION, abandoning the banner.
{
  const a = alt(ALT_FN_START_AT, BODY_END_IN_CODE);
  eq(BY_NAME.get(OWNERS_EXPECTED[0]).start, ALT_FN_START_AT, 'the first function begins at ALT_FN_START_AT');
  eq(RAW_CHARS - a.units, OPENING_BLOCK_CHARS, '…so this alternative is OPENING_BLOCK_CHARS smaller');
  eq(a.bcs, BY_CONSUMER_SPLIT, '…at IDENTICAL coupling, so size is all it buys');
  eq(MARKS.indexOf(ALT_FN_START_AT), -1,
    '…and it begins on no banner at all, which throws away the only structural evidence '
    + 'this boundary has');
}
// (b) STOP BEFORE THE BACKUP PAIR.
{
  // ANCHORED TO A DOCUMENT FEATURE, not left as a bare offset: `alt` snaps the
  // end back to the last line of code, which absorbed a one-unit mutation and
  // let this constant survive the pass. It is where the third owner's body ends.
  eq(ALT_STOP_BEFORE_BACKUP_AT,
    snapBodyEnd(CODE, RAW_AT_IN_CODE, BY_NAME.get(BACKUP_PAIR[0]).start) + 1,
    'ALT_STOP_BEFORE_BACKUP_AT is exactly where the body ends before the backup pair begins');
  const b = alt(RAW_AT_IN_CODE, ALT_STOP_BEFORE_BACKUP_AT);
  eq(b.p.names, OWNERS_EXPECTED.slice(0, OWNER_COUNT - 2),
    'stopping early leaves the backup pair behind');
  eq(OWNERS_EXPECTED.slice(OWNER_COUNT - 2), BACKUP_PAIR, '…which is BACKUP_PAIR');
  eq(b.p.nine, ALT_STOP_BEFORE_BACKUP_NINE, '…for a nine-direction total of ALT_STOP_BEFORE_BACKUP_NINE');
  eq(b.bcs, BY_CONSUMER_SPLIT,
    '…and byConsumerSplit UNCHANGED, so the smaller number buys nothing: the same one '
    + 'consumer calls what it leaves behind');
  const calls = REC.sites.filter((i) => {
    const line = CODE.slice(CODE.lastIndexOf('\n', i) + 1, CODE.indexOf('\n', i));
    return line.indexOf(BACKUP_PAIR[1]) >= 0;
  });
  eq(calls.length, BACKUP_CALL_SITES, '…at BACKUP_CALL_SITES of the five sites');
}
// (c) OBEY THE DEAD RULE — measured in §4, named here so §5 enumerates four.
ok(DEAD_RULE_BY_CONSUMER > BY_CONSUMER,
  'extending to the end of the banner region is strictly worse, which §4 measures');
// (d) ABSORB THE DEPENDENCY.
{
  const d = alt(ALT_WITH_DEPENDENCY_AT, BODY_END_IN_CODE);
  eq(ALT_WITH_DEPENDENCY_AT, DEPENDENCY_AT, 'absorbing the dependency starts at its declaration');
  eq(d.p.deps, [], '…which does remove the monolith dependency');
  eq(d.p.nine, ALT_WITH_DEPENDENCY_NINE, '…but the nine-direction total rises to ALT_WITH_DEPENDENCY_NINE');
  eq(byConsumer(d.p), ALT_WITH_DEPENDENCY_BY_CONSUMER, '…and byConsumer to ALT_WITH_DEPENDENCY_BY_CONSUMER');
  eq(consumersOf(d.p).length, ALT_WITH_DEPENDENCY_CONSUMERS,
    '…because ALT_WITH_DEPENDENCY_CONSUMERS consumers reach the dependency, not one');
  ok(d.units > RAW_CHARS, '…for a larger cut that is worse on every axis that decides');
}
// THE RUNNER-UP, published with its numbers so the next cycle need not re-derive.
{
  // ANCHORED THE SAME WAY, and for the same reason: a bare offset that only
  // ever reaches `alt` survives a one-unit mutation. The runner-up opens ON a
  // banner mark, and its end is where that region's last line of code falls.
  ok(MARKS.indexOf(RUNNER_UP_AT) >= 0, 'the runner-up begins ON a banner mark');
  eq(lineAt(RUNNER_UP_AT), RUNNER_UP_BANNER, '…that mark being RUNNER_UP_BANNER');
  eq(snapBodyEnd(CODE, RUNNER_UP_AT, DECLS.filter((d) => d.start > RUNNER_UP_END)[0].start),
    RUNNER_UP_END, '…and RUNNER_UP_END is where its last line of code falls');
  const r = alt(RUNNER_UP_AT, RUNNER_UP_END);
  eq(r.bcs, RUNNER_UP_BY_CONSUMER_SPLIT, 'the runner-up scores RUNNER_UP_BY_CONSUMER_SPLIT');
  eq(r.p.nine, RUNNER_UP_FULL_NINE, '…RUNNER_UP_FULL_NINE on the raw nine, the same as this cut');
  eq(consumersOf(r.p).length, RUNNER_UP_CONSUMERS,
    '…but RUNNER_UP_CONSUMERS consumers rather than one, which is what it loses on');
  eq(r.p.names.length, RUNNER_UP_OWNERS, '…across RUNNER_UP_OWNERS owners');
  ok(r.units < RAW_CHARS, '…and it is smaller, so nothing about it outranks the recommendation');
}

// ─────────────────────────────────────────────────────────────────────────────
section('6. The screen, and the three candidates ahead of this one');
// ─────────────────────────────────────────────────────────────────────────────
eq(RUN_FLOOR, 1500, 'the screen floors runs at RUN_FLOOR units');
eq(rawRunCount, RAW_RUNS, 'it enumerates RAW_RUNS raw runs');
eq(seamRejectedCount, SEAM_REJECTED, '…of which assertSeam refuses SEAM_REJECTED');
eq(candidateRuns.length, CANDIDATES, '…leaving CANDIDATES distinct candidates');
const cleanRuns = candidateRuns.filter((c) => runsNothingAtLoad(c.load));
eq(cleanRuns.length, CLEAN_CANDIDATES, '…CLEAN_CANDIDATES of which run nothing at load');
eq(cleanRuns.filter((c) => byConsumer(c.p) === 1).length, ONE_CONSUMER_RAW,
  'ONE_CONSUMER_RAW scores 1 under the raw reading of the ninth');
eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === 1).length, ONE_CONSUMER_SPLIT,
  '…ONE_CONSUMER_SPLIT under the split reading');
eq(cleanRuns.filter((c) => consumersOf(c.p).length === 1 && c.p.sites.length > 1).length,
  ONE_CONSUMER_MULTI_SITE, '…and ONE_CONSUMER_MULTI_SITE have one consumer at more than one site');
{
  // THE SCREEN CAN SEE THIS CUT, which the last one could not: that one opened
  // on a comment block, and a run begins only at a region start or a
  // declaration start. This one opens on a region start.
  const rec = cleanRuns.filter((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE)[0];
  ok(rec, 'the screen enumerates this exact cut');
  const ranked = cleanRuns.slice()
    .sort((a, b) => byConsumerSplit(a.p, a.split) - byConsumerSplit(b.p, b.split) || b.units - a.units);
  eq(ranked.findIndex((c) => c.lo === RAW_AT_IN_CODE && c.hi === BODY_END_IN_CODE) + 1, SCREEN_RANK,
    '…and ranks it SCREEN_RANK by byConsumerSplit then size');
  const better = cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) < BY_CONSUMER_SPLIT);
  eq(better.length, BETTER_SCORING, 'BETTER_SCORING clean candidates score better than it');
  eq(cleanRuns.filter((c) => byConsumerSplit(c.p, c.split) === BY_CONSUMER_SPLIT
    && c.units > BODY_CHARS).length, LARGER_AT_THE_SAME_SCORE,
  '…and LARGER_AT_THE_SAME_SCORE are larger at the same score, so this is the largest of '
  + 'its class');
  // THE THREE AHEAD, by OWNER NAME rather than by offset, and each refusal
  // re-measured on this document rather than recalled from the audit that
  // first published it.
  eq(better.map((c) => c.p.names[0]).sort(), AHEAD_OWNERS.slice().sort(),
    'the three ahead are the regions owned by AHEAD_OWNERS');
  const bandOf = (at) => REGIONS.filter((r) => r.start <= at && r.end > at)[0];
  {
    const c = better.filter((x) => x.p.names[0] === AHEAD_OWNERS[0])[0];
    const b = bandOf(c.lo);
    eq(c.lo, b.start, 'the first opens exactly ON its region start');
    ok(/^\/\/ ═+/.test(lineAt(b.start)), '…and that region opens on a `// ═══` SECTION header');
    eq(b.end - b.start, SECTION_REGION_CHARS, '…of SECTION_REGION_CHARS units');
    eq(DECLS.filter((d) => d.start >= b.start && d.end < b.end).length, SECTION_REGION_OWNERS,
      '…holding SECTION_REGION_OWNERS owners');
    ok(b.end > c.hi,
      '…and the section CONTINUES past the cut, so taking the header would leave what keeps '
      + 'it with no title. That is the defect audit #462 published, re-measured here');
  }
  for (const name of AHEAD_OWNERS.slice(1)) {
    const c = better.filter((x) => x.p.names[0] === name)[0];
    const b = bandOf(c.lo);
    eq(b.start, CATCH_ALL_AT, name + ' sits inside the region at CATCH_ALL_AT');
    eq(b.end, CATCH_ALL_END, '…which ends at CATCH_ALL_END');
    eq(b.end - b.start, CATCH_ALL_CHARS, '…CATCH_ALL_CHARS units');
    eq(DECLS.filter((d) => d.start >= b.start && d.end < b.end).length, CATCH_ALL_OWNERS,
      '…holding CATCH_ALL_OWNERS owners: the mis-labelled catch-all audit #466 named');
    ok(c.lo > b.start, '…and it is a LONE owner well inside it, not a region start');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('7. It loads bare, and the recovery path runs on injected storage');
// ─────────────────────────────────────────────────────────────────────────────
{
  const l = loadTimeProfile(RAW_AT_IN_CODE, BODY_END_IN_CODE);
  eq(l.stmtLines, TOP_LEVEL_STATEMENT_LINES, 'the body has no top-level statement lines at all');
  eq(l.reads, EVALUATION_TIME_READS, '…and reads nothing at evaluation time');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(Object.keys(ctx).sort(), OWNERS_EXPECTED.slice().sort(),
    'it loads in a COMPLETELY empty VM, defining exactly its own owners');
  eq(Object.keys(ctx).length, VM_GLOBALS, '…VM_GLOBALS of them');
}
{
  const watched = [];
  const ctx = {
    fetch: () => { watched.push('fetch'); },
    setTimeout: () => { watched.push('setTimeout'); },
    setInterval: () => { watched.push('setInterval'); },
    WebSocket: function () { watched.push('WebSocket'); },
    localStorage: {
      length: 0,
      key: () => { watched.push('localStorage.key'); return null; },
      getItem: () => { watched.push('localStorage.getItem'); return null; },
      setItem: () => { watched.push('localStorage.setItem'); },
      removeItem: () => { watched.push('localStorage.removeItem'); },
    },
    document: { getElementById: () => { watched.push('doc.getElementById'); return null; } },
    window: { addEventListener: () => { watched.push('win.addEventListener'); } },
    console: { log() {}, warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);
  eq(watched, [], 'and touches no fetch, timer, socket, storage read or listener while loading');
}
// THE OWNERS RUN, on a fake store, with the one monolith dependency injected.
// A helper that always returned the same shape would pass a test that only ever
// fed it one, so every drive below is a pair whose answers differ.
{
  const store = new Map();
  const fakeStorage = {
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i],
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
  };
  const logged = [];
  const ctx = {
    localStorage: fakeStorage,
    apexStorageKey: (base) => base + '__preview_7',
    console: { log: (m) => logged.push(String(m)), warn() {}, error() {}, debug() {} },
  };
  vm.createContext(ctx);
  vm.runInContext(BODY, ctx);

  store.set('apex_trades__preview_3', JSON.stringify([{ id: 1 }]));
  eq(Array.from(ctx.apexStorageKeyVariants('apex_trades')),
    ['apex_trades__preview_7', 'apex_trades', 'apex_trades__local', 'apex_trades__preview_3'],
    'the variants come back in recovery priority order: current host, plain, local, then '
    + 'every preview namespace actually present');
  ok(ctx.apexStorageKeyVariants('apex_positions').indexOf('apex_trades__preview_3') === -1,
    '…and a preview key belonging to ANOTHER base is not swept in');

  // JSON round-trip, because these values cross OUT of the VM: an object built
  // inside it is a foreign-realm Object and deepStrictEqual compares prototypes.
  // That cost cycle #468 a debugging pass; it is a normaliser here, not a guess.
  const plain = (v) => JSON.parse(JSON.stringify(v));
  eq(plain(ctx._apexReadArray('apex_absent')), { exists: false, arr: [], bytes: 0 },
    'an absent key reads as absent');
  store.set('apex_ok', '[1,2,3]');
  eq(plain(ctx._apexReadArray('apex_ok')), { exists: true, arr: [1, 2, 3], bytes: 7 },
    '…a JSON array reads as present, with its element count and byte length');
  store.set('apex_obj', '{"a":1}');
  eq(plain(ctx._apexReadArray('apex_obj').arr), [], '…a JSON non-array reads as an empty array');
  store.set('apex_bad', '{not json');
  eq(plain(ctx._apexReadArray('apex_bad')), { exists: false, arr: [], bytes: 0 },
    '…and malformed JSON returns rather than throwing, which its own comment claims');

  // THE RECOVERY PATH ITSELF, on the two inputs where the answer differs.
  store.clear();
  store.set('apex_trades__preview_7', JSON.stringify([{ id: 'primary' }]));
  store.set('apex_trades', JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }]));
  const primary = ctx.apexNonDestructiveLoadArray('apex_trades');
  eq(primary.usedFallback, false, 'with the primary key populated it does NOT fall back');
  eq(primary.count, 1, '…returning the primary row count');
  eq(primary.sourceKey, 'apex_trades__preview_7', '…from the primary key');
  store.delete('apex_trades__preview_7');
  store.set('apex_trades__local', JSON.stringify([{ id: 'x' }, { id: 'y' }]));
  const recovered = ctx.apexNonDestructiveLoadArray('apex_trades');
  eq(recovered.usedFallback, true, 'with the primary EMPTY it falls back');
  eq(recovered.primaryEmpty, true, '…and says so');
  eq(recovered.count, 3, '…choosing the RICHEST sibling rather than the first one found');
  eq(recovered.sourceKey, 'apex_trades', '…and names the key it recovered from');
  ok(recovered.count !== primary.count,
    '…so the two drives disagree, and the resolver is being measured rather than echoed');

  // NON-DESTRUCTIVE, EXECUTED. The claim its comment block makes is that these
  // helpers never delete or overwrite the source. This drives it.
  eq(ctx.apexBackupKey('apex_trades').replace(/\d{8}_\d{6}$/, 'STAMP'),
    'apex_backup_trades_STAMP', 'the backup key is namespaced and timestamped');
  const before = new Map(store);
  const bkey = ctx.apexCreateBackup('apex_trades', 'apex_trades');
  ok(typeof bkey === 'string' && bkey.indexOf('apex_backup_trades_') === 0,
    'a backup returns its new key');
  eq(store.get('apex_trades'), before.get('apex_trades'),
    '…and the SOURCE is byte-identical afterwards: nothing was deleted or overwritten');
  eq(store.get(bkey), before.get('apex_trades'), '…the backup holding a copy of it');
  eq(store.size, before.size + 1, '…and exactly one key was added, no more');
  eq(ctx.apexCreateBackup('apex_trades', 'apex_absent'), null,
    'backing up an absent key is a no-op that returns null');
  eq(store.size, before.size + 1, '…and writes nothing at all');
  ok(logged.some((m) => m.indexOf('[TRADES STORAGE BACKUP]') === 0),
    'and the one console line it emits names the store it backed up');
}

// ─────────────────────────────────────────────────────────────────────────────
section('8. Reachability, and where this layer would sit');
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
  eq(dead.length, DEAD_DECLS, 'DEAD_DECLS of the monolith\'s declarations are named nowhere');
  eq(dead.reduce((n, d) => n + d.chars, 0), DEAD_UNITS, '…DEAD_UNITS of code');
  eq(dead.filter((d) => OWNERS_EXPECTED.indexOf(d.name) >= 0).map((d) => d.name), [],
    '…and NO owner of this cut is among them: all five are live code');
}
{
  eq(CHAIN[CHAIN.length - 1], MODULE_REL, 'this module is the LAST entry in the chain');
  eq(CHAIN.filter((rel) => rel === MODULE_REL).length, 1, '…exactly once, not appended twice');
  ok(fs.existsSync(path.join(ROOT, MODULE_REL)), '…and its path exists now');
  eq(CHAIN.length, CHAIN_LENGTH, 'the chain is CHAIN_LENGTH layers long');
  const sources = CHAIN.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sizes = sources.map((s) => s.length).sort((a, b) => a - b);
  eq(sizes[0], SMALLEST_LAYER_CHARS, 'the smallest shipped layer is SMALLEST_LAYER_CHARS units');
  eq(sizes[sizes.length - 1], LARGEST_LAYER_CHARS, '…the largest LARGEST_LAYER_CHARS');
  eq(sizes.filter((u) => u < BODY_CHARS).length + 1, SIZE_RANK,
    'this layer ranks SIZE_RANK by size — a SMALL layer, and this contract says so '
    + 'rather than selling it as a large one');
  eq(sizes.filter((u) => u > BODY_CHARS).length, LAYERS_LARGER_THAN_THIS_CUT,
    '…with LAYERS_LARGER_THAN_THIS_CUT layers larger than it');
  eq(SIZE_RANK + LAYERS_LARGER_THAN_THIS_CUT, CHAIN_LENGTH,
    '…the rank and that count partitioning the chain exactly, so neither drifts alone');
  ok(BODY_CHARS > SMALLEST_LAYER_CHARS && BODY_CHARS < LARGEST_LAYER_CHARS,
    '…so it displaces no superlative and re-pins no earlier contract');
  eq(sources.filter((s) => !/[^\x00-\x7F]/.test(s)).length, PURE_ASCII_LAYERS,
    'PURE_ASCII_LAYERS shipped layers are pure ASCII');
  ok(/[^\x00-\x7F]/.test(BODY), '…and this layer did NOT join them, so that count is unchanged');
  eq(sources.filter((s) => /^\s*\/\/ ── /.test(s.split('\n')[0])).length, LAYERS_OPENING_ON_BANNER,
    'LAYERS_OPENING_ON_BANNER of the chain open on a `── ` banner line');
  ok(/^\/\/ ── /.test(BODY.split('\n')[0]),
    '…and this one DOES, which the two cycles before it could not: §4 is why');
}

// ─────────────────────────────────────────────────────────────────────────────
section('9. The relocation is the whole of the production change');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
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
  ok(fs.existsSync(path.join(ROOT, MODULE_REL)), '…while the module exists now');
  // THE RELOCATION IS PURE: every unit that left index.html is in the module and
  // nowhere else, and the module adds nothing of its own.
  eq(MODULE, BODY, 'the module is the audited block VERBATIM — no banner, no wrapper, no strict line');
  eq(BASE_CHARS - LIVE_INDEX.length + UNDO.TAG.length, RAW_CHARS,
    'the document shrank by exactly the raw fragment, once the one added tag line is counted back');
}

// ─────────────────────────────────────────────────────────────────────────────
section('10. The change set, the ratchet and the budget');
// ─────────────────────────────────────────────────────────────────────────────
{
  const changed = git(['diff', '--name-only', '--no-renames', BASE_SHA]).split('\n').filter(Boolean);
  const status = git(['status', '--porcelain=v1', '--untracked-files=all'])
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const all = Array.from(new Set(changed.concat(status))).sort();
  ok(all.indexOf(CONTRACT_REL) >= 0, 'this permanent contract is part of the change');
  ok(all.indexOf(UNDO_REL) >= 0, '…and the byte-exact undo helper');
  ok(all.indexOf(AUDIT_REL) >= 0, '…and the temporary audit\'s removal is visible in the change set');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)),
    '…because the audit is GONE: replaced one-for-one, not left beside its replacement');
  ok(all.indexOf(AUDIT_SPEC_REL) >= 0, '…and its mutation spec is retired in the same change');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_SPEC_REL)), '…and that spec is gone too');
  ok(all.every((rel) => rel.startsWith('tests/') || rel === 'index.html' || rel === MODULE_REL),
    '…and every other changed path is a test artifact');
  // THE RATCHET. One file arrives, and every contract that pins the suite size
  // has to be told — including the newest spec's own mutant anchor.
  eq(fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).length,
    TEST_FILE_COUNT, 'the suite is TEST_FILE_COUNT files with this contract in it');
  // THE AUDIT WAS RENAMED, NOT ADDED BESIDE ITS REPLACEMENT, so the count does
  // not move this phase. That is asserted as the two commit facts rather than as
  // a difference of zero: a difference is silent about which file is which, and
  // "zero" would keep holding after the next audit landed.
  eq(TEST_FILE_COUNT - BASE_TEST_FILE_COUNT, 0, '…the same count the base carried');
  ok(git(['show', BASE_SHA + ':' + AUDIT_REL]).length > 0,
    '…because the base carried the AUDIT at that count');
  ok(!fs.existsSync(path.join(ROOT, AUDIT_REL)) && fs.existsSync(path.join(ROOT, CONTRACT_REL)),
    '…and today it is the CONTRACT at the same count: one file replaced, not one added');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/'])
    .split('\n').filter((f) => /^tests\/[^/]+\.test\.js$/.test(f)).length, BASE_TEST_FILE_COUNT,
  '…and BASE_TEST_FILE_COUNT is what the base commit carried, read out of git');
  const RATCHETED = /^const TEST_FILE_COUNT = \d+;$/m;
  const contracts = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter((f) => f.endsWith('.test.js') &&
      RATCHETED.test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8')));
  eq(contracts.length, RATCHETED_CONTRACTS, 'RATCHETED_CONTRACTS files pin the suite file count');
  ok(contracts.every((f) => new RegExp('^const TEST_FILE_COUNT = ' + TEST_FILE_COUNT + ';$', 'm')
    .test(fs.readFileSync(path.join(ROOT, 'tests', f), 'utf8'))),
  '…and every one of them now pins the ratcheted value, this audit included');
  // THE BUDGET, executed rather than narrated.
  const contractSpec = require(path.join(ROOT, CONTRACT_SPEC_REL));
  eq(contractSpec.target, CONTRACT_REL, 'the arriving spec targets THIS contract');
  const coverage = fs.readFileSync(path.join(ROOT, COVERAGE_CONTRACT), 'utf8');
  const declaredNow = Number(coverage.match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]);
  const budgetNow = Number(coverage.match(/^const MUTANT_BUDGET = (\d+);$/m)[1]);
  eq(Number(git(['show', BASE_SHA + ':' + COVERAGE_CONTRACT])
    .match(/^const DECLARED_MUTANTS = (\d+);$/m)[1]), BASE_DECLARED_MUTANTS,
  'the base declared BASE_DECLARED_MUTANTS mutants');
  // PHASE 2 NOW RETIRES EXACTLY ONE SPEC — the audit's. The outgoing contract's
  // went in Phase 1, which is the rhythm #470 shipped, so the total moves by the
  // difference between two comparable specs instead of peaking.
  eq(declaredNow, BASE_DECLARED_MUTANTS - RETIRED_MUTANTS + contractSpec.mutants.length,
    'the live total is the base, LESS the audit spec this phase retires, PLUS this '
    + 'contract\'s own — the arithmetic of the change rather than the total it reaches');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, 'tests/mutation-specs/'])
    .split('\n').filter(Boolean).length, BASE_SPECS,
  '…the base having carried BASE_SPECS specs, read out of git');
  eq(fs.readdirSync(path.join(ROOT, 'tests/mutation-specs')).length, BASE_SPECS,
    '…and today carrying the same number: one retires as one arrives');
  eq(budgetNow, MUTANT_BUDGET, 'the ceiling is unchanged at 250');
  ok(declaredNow < budgetNow, '…and the declared total is under it');
  eq(budgetNow - declaredNow, CEILING_HEADROOM, 'CEILING_HEADROOM mutants of room remain');
  // ABSENCE ALONE IS NOT A PIN: any wrong path is also absent, so the retired
  // spec is named by what the BASE commit carried.
  ok(!fs.existsSync(path.join(ROOT, RETIRED_SPEC_REL)),
    'the audit\'s spec is retired with the audit itself');
  eq(RETIRED_SPEC_REL, AUDIT_SPEC_REL,
    '…and the retired path IS the audit\'s spec, not some other spec that also went');
  eq(git(['cat-file', '-e', BASE_SHA + ':' + RETIRED_SPEC_REL]), '',
    '…a path the base commit really carried, not merely one that never existed');
  ok(git(['show', BASE_SHA + ':' + RETIRED_SPEC_REL]).indexOf("target: '" + AUDIT_REL + "'") >= 0,
    '…and it TARGETED the audit this contract replaces, not merely a file that existed');
  // THE OUTGOING CONTRACT'S SPEC WENT A PHASE AGO, and this phase does not retire
  // it again: it is already absent AT THE BASE, which is the half of the rhythm
  // change only a Phase 2 can check.
  ok(!fs.existsSync(path.join(ROOT, NEWEST_CONTRACT_SPEC)),
    'the outgoing layer\'s spec is absent now');
  eq(git(['ls-tree', '-r', '--name-only', BASE_SHA, NEWEST_CONTRACT_SPEC]), '',
    '…and was already absent at the base: Phase 1 retired it, not this phase');
  ok(git(['ls-tree', '-r', '--name-only', BASE_SHA, AUDIT_SPEC_REL]).trim() === AUDIT_SPEC_REL,
    '…while the audit\'s spec WAS there, so that emptiness is a fact about this path and '
    + 'not about how the command is being called');
  ok(fs.existsSync(path.join(ROOT, NEWEST_CONTRACT)),
    '…while the CONTRACT it targeted still ships and still runs: the spec retired, not the file');
  const layerSpecs = fs.readdirSync(path.join(ROOT, 'tests/mutation-specs'))
    .filter((f) => /\.spec\.js$/.test(f) && f !== 'mutation-coverage-contract.spec.js');
  eq(layerSpecs.length, LAYER_SPECS, 'exactly LAYER_SPECS non-coverage spec is committed');
  eq(layerSpecs, [path.basename(CONTRACT_SPEC_REL)],
    '…and after Phase 2 it is THIS contract\'s, which is the other half of the invariant '
    + 'the old `-contract.spec.js` predicate could not see');
}

console.log('\n' + pass + ' assertions passed.');
console.log('APEX_STORAGE_RECOVERY_CONTRACT_OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
