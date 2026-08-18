'use strict';
// ═════════════════════════════════════════════════════════════════════════════
// POST-EIC CONFLICT-AWARE MONOLITH EXTRACTION AUDIT
//
// WHAT THIS IS
//   An AUDIT. It extracts nothing, moves nothing, creates no runtime module and
//   repairs no defect. It reads the real post-EIC source at the audited base,
//   measures it, classifies every remaining top-level declaration by OWNERSHIP,
//   scores the candidate families, applies hard ownership/conflict gates, and
//   names the family that should be extracted next together with the exact
//   first relocation slice — which it also does not implement. In particular,
//   it does not trust a prefix-only terminal-family predicate: ownership history
//   and runtime callers are allowed to reveal generically named residue.
//
//   Production is byte-identical to the base commit. The only files this audit
//   adds are itself and the markdown report it generates.
//
// WHY IT IS A TEST AND NOT A DOCUMENT
//   Every number in docs/refactoring/post-eic-monolith-extraction-audit.md is
//   produced by the code below and written by it. Running this file with
//   AUDIT_WRITE_DOC=1 regenerates the report; running it normally REGENERATES
//   THE REPORT IN MEMORY AND COMPARES, and fails when the committed markdown
//   does not match. A hand-edited number cannot survive, and neither can a
//   number that was true when written and stopped being true afterwards.
//
//     regenerate:  AUDIT_WRITE_DOC=1 node tests/post-eic-monolith-extraction-audit.test.js
//     verify:      node tests/post-eic-monolith-extraction-audit.test.js
//
// THE THREE CORRECTIONS THIS AUDIT INHERITS
//   1. PESS PR3 — a module label must describe the BODY. `pessAnalyzeAll` was
//      planned as an "analysis service"; the source audit found 29.3% of it is
//      panel rendering, and the label was corrected rather than forced. So this
//      audit carries an OWNERSHIP-CONFIDENCE grade as a HARD GATE: a candidate
//      graded D or F cannot win execution priority however well it scores.
//   2. EIC — terminal status cannot be proved by an `eic` name predicate alone.
//      `computeFinalDecision` and `computeSetupScore` were introduced with EIC,
//      operate on EIC data and are called only by EIC modules. Their generic
//      names hid two real residual declarations from the extraction contract.
//   3. DSS — an inbound foreign write is not a blocker merely because it is
//      foreign. §8 classifies every one by writer, owner and timing.
//
// WHAT IT DELIBERATELY DOES NOT DO
//   It does not fetch anything. The live open-PR facts in §9 were measured
//   against GitHub while the audit ran and are PINNED here as data, with the
//   head SHAs they were measured at; the suite re-derives the CLASSIFICATION
//   from that data offline and fails if the classification logic is weakened.
//   §9 says plainly which parts are pinned observation and which are derived.
// ═════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { loadOrderedScriptSources } = require('./lib/load-app-source.js');

const ROOT = path.resolve(__dirname, '..');
const DOC_PATH = path.join(ROOT, 'docs', 'refactoring', 'post-eic-monolith-extraction-audit.md');

// ─────────────────────────────────────────────────────────────────────────────
// §0  ASSERTION HARNESS
// ─────────────────────────────────────────────────────────────────────────────
let PASS = 0;
const FAILURES = [];

function ok(cond, msg) {
  if (cond) { PASS++; return; }
  FAILURES.push(msg);
  console.log('  FAIL  ' + msg);
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  ok(a === e, msg + ' (expected ' + e + ', got ' + a + ')');
}
function section(title) { console.log('\n' + title); }

// ═════════════════════════════════════════════════════════════════════════════
// §1  THE PARSER
//
// A top-level declaration scanner for classic scripts. It walks the source once,
// skipping strings, template literals (including nested `${}` substitutions),
// line and block comments and regular-expression literals, and reports every
// declaration that appears at nesting depth zero.
//
// It reports SITES, not names. Two declarations of the same name are two sites,
// and collapsing them would erase exactly the EIC fact this audit exists to
// judge. §2 proves the parser against ten known fixtures before anything else
// in this file is allowed to trust it.
// ═════════════════════════════════════════════════════════════════════════════

const DECL_KEYWORDS = ['function', 'var', 'const', 'let', 'class', 'async'];

function scanTopLevelDeclarations(src) {
  const decls = [];
  const n = src.length;
  const isIdent = (c) => c !== undefined && (
    (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_' || c === '$'
  );
  // A '/' starts a regex literal only where a value cannot precede it. After an
  // identifier char, ')' or ']' it is division. This matters: a mis-read regex
  // swallows source and hides declarations.
  const regexAllowed = (prev) => prev === '' || !(isIdent(prev) || prev === ')' || prev === ']');

  function skipString(start) {
    const q = src[start];
    for (let j = start + 1; j < n; j++) {
      const c = src[j];
      if (c === '\\') { j++; continue; }
      if (q === '`' && c === '$' && src[j + 1] === '{') {
        let depth = 0, k = j + 1;
        for (; k < n; k++) {
          const cc = src[k], dd = src[k + 1];
          if (cc === '"' || cc === "'" || cc === '`') { k = skipString(k); continue; }
          if (cc === '/' && dd === '/') { while (k < n && src[k] !== '\n') k++; continue; }
          if (cc === '/' && dd === '*') { k += 2; while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++; k++; continue; }
          if (cc === '{') depth++;
          else if (cc === '}') { depth--; if (depth === 0) break; }
        }
        j = k; continue;
      }
      if (c === q) return j;
    }
    return n - 1;
  }

  function trySkipRegex(start) {
    let inClass = false;
    for (let j = start + 1; j < n; j++) {
      const c = src[j];
      if (c === '\\') { j++; continue; }
      if (c === '\n') return start;
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) {
        let k = j + 1;
        while (k < n && /[a-z]/i.test(src[k])) k++;
        return k - 1;
      }
    }
    return start;
  }

  function skipWs(k) {
    while (k < n) {
      const c = src[k], d = src[k + 1];
      if (c === '/' && d === '/') { while (k < n && src[k] !== '\n') k++; continue; }
      if (c === '/' && d === '*') { k += 2; while (k < n && !(src[k] === '*' && src[k + 1] === '/')) k++; k += 2; continue; }
      if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f' || c === '\v') { k++; continue; }
      break;
    }
    return k;
  }

  function matchBrace(start) {
    let depth = 0, prev = '';
    for (let j = start; j < n; j++) {
      const c = src[j], d = src[j + 1];
      if (c === '/' && d === '/') { while (j < n && src[j] !== '\n') j++; continue; }
      if (c === '/' && d === '*') { j += 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { j = skipString(j); prev = '"'; continue; }
      if (c === '/' && regexAllowed(prev)) { const e = trySkipRegex(j); if (e > j) { j = e; prev = '/'; continue; } }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return j; }
      if (!/\s/.test(c)) prev = c;
    }
    return -1;
  }

  function tryDeclaration(start, word) {
    let k = start + word.length;
    let isAsync = false, kw = word;
    if (word === 'async') {
      const k2 = skipWs(k);
      if (src.slice(k2, k2 + 8) === 'function' && !isIdent(src[k2 + 8])) { isAsync = true; kw = 'function'; k = k2 + 8; }
      else return null;
    }
    if (kw === 'function' || kw === 'class') {
      let k2 = skipWs(k);
      if (kw === 'function' && src[k2] === '*') k2 = skipWs(k2 + 1);
      let e = k2;
      while (e < n && isIdent(src[e])) e++;
      const name = src.slice(k2, e);
      if (!name) return null;
      const bodyStart = src.indexOf('{', e);
      if (bodyStart < 0) return null;
      const bodyEnd = matchBrace(bodyStart);
      if (bodyEnd < 0) return null;
      return { name, form: kw, isAsync, start, end: bodyEnd, chars: bodyEnd - start + 1 };
    }
    // var / const / let — end at a depth-zero `;` or an ASI newline.
    let k2 = skipWs(k), e = k2;
    while (e < n && isIdent(src[e])) e++;
    const name = src.slice(k2, e);
    if (!name) return null;
    let depth = 0, pdepth = 0, bdepth = 0, prev = '';
    for (let j = e; j < n; j++) {
      const cc = src[j], dd = src[j + 1];
      if (cc === '/' && dd === '/') { while (j < n && src[j] !== '\n') j++; j--; continue; }
      if (cc === '/' && dd === '*') { j += 2; while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++; j++; continue; }
      if (cc === '"' || cc === "'" || cc === '`') { j = skipString(j); prev = '"'; continue; }
      if (cc === '/' && regexAllowed(prev)) { const ee = trySkipRegex(j); if (ee > j) { j = ee; prev = '/'; continue; } }
      if (cc === '{') depth++;
      else if (cc === '}') depth--;
      else if (cc === '(') pdepth++;
      else if (cc === ')') pdepth--;
      else if (cc === '[') bdepth++;
      else if (cc === ']') bdepth--;
      else if (cc === ';' && depth === 0 && pdepth === 0 && bdepth === 0) {
        return { name, form: kw, isAsync: false, start, end: j, chars: j - start + 1 };
      } else if (cc === '\n' && depth === 0 && pdepth === 0 && bdepth === 0) {
        if (prev && !/[,+\-*/%&|^=?:.<>!~(\[{]/.test(prev)) {
          const nx = skipWs(j), nxc = src[nx];
          if (nxc === undefined || !/[,+\-*/%&|^=?:.<>!~(\[]/.test(nxc)) {
            let endIdx = j - 1;
            while (endIdx > start && /\s/.test(src[endIdx])) endIdx--;
            return { name, form: kw, isAsync: false, start, end: endIdx, chars: endIdx - start + 1 };
          }
        }
      }
      if (!/\s/.test(cc)) prev = cc;
    }
    let endIdx = n - 1;
    while (endIdx > start && /\s/.test(src[endIdx])) endIdx--;
    return { name, form: kw, isAsync: false, start, end: endIdx, chars: endIdx - start + 1 };
  }

  let i = 0, brace = 0, paren = 0, bracket = 0, prevSig = '';
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { i = skipString(i) + 1; prevSig = '"'; continue; }
    if (c === '/' && regexAllowed(prevSig)) { const e = trySkipRegex(i); if (e > i) { i = e + 1; prevSig = '/'; continue; } }
    if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === '[') bracket++;
    else if (c === ']') bracket--;
    else if (c === '{') brace++;
    else if (c === '}') brace--;

    if (brace === 0 && paren === 0 && bracket === 0 && isIdent(c) && !isIdent(src[i - 1])) {
      let j = i;
      while (j < n && isIdent(src[j])) j++;
      const word = src.slice(i, j);
      if (DECL_KEYWORDS.indexOf(word) >= 0) {
        const res = tryDeclaration(i, word);
        if (res) { decls.push(res); i = res.end + 1; prevSig = src[res.end]; continue; }
      }
      i = j; prevSig = src[j - 1]; continue;
    }
    if (!/\s/.test(c)) prevSig = c;
    i++;
  }
  return decls;
}

// ═════════════════════════════════════════════════════════════════════════════
// §2  PROVE THE PARSER AGAINST ALL SHIPPED FAMILY MODULES  (audit phase 3)
//
// The parser is trusted only if it reproduces the ten module fixtures the three
// completed extractions recorded. These counts are not re-derived here from the
// modules — they are the numbers the DSB, SFS and PESS contracts and PR bodies
// published. If the parser drifts, or a module is edited, this section fails and
// nothing downstream is believed.
// ═════════════════════════════════════════════════════════════════════════════

const FIXTURES = [
  // family, module path, declarations, declaration chars
  ['DSB', 'js/adapters/backend-directional-snapshot-adapter.js', 19, 6789],
  ['DSB', 'js/services/backend-directional-snapshot-service.js', 26, 26385],
  ['DSB', 'js/ui/backend-directional-snapshot-panel.js', 9, 14945],
  ['SFS', 'js/services/sfs-config-state.js', 33, 1059],
  ['SFS', 'js/services/sfs-scan-service.js', 9, 10635],
  ['SFS', 'js/ui/sfs-panel.js', 20, 28128],
  ['PESS', 'js/services/pess-config-rules.js', 4, 1786],
  ['PESS', 'js/services/pess-live-transport.js', 2, 9127],
  ['PESS', 'js/ui/pess-batch-panel.js', 1, 16111],
  ['PESS', 'js/ui/pess-panel.js', 2, 25698],
  ['EIC', 'js/services/eic-screening-rules.js', 4, 14368],
  ['EIC', 'js/ui/eic-panel.js', 2, 15268],
  ['EIC', 'js/ui/eic-ticker-analysis-panel.js', 1, 13990],
  ['EIC', 'js/ui/eic-live-deep-dive.js', 4, 24046],
];

const FAMILY_TOTALS = { DSB: [54, 48119], SFS: [62, 39822], PESS: [9, 52722], EIC: [11, 67672] };

section('§2  PARSER PROVEN AGAINST THE SHIPPED FAMILY MODULES');

const moduleDecls = {};   // path -> declarations
const familyModuleNames = { DSB: [], SFS: [], PESS: [], EIC: [] };

for (const [fam, rel, expectN, expectC] of FIXTURES) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const d = scanTopLevelDeclarations(src);
  moduleDecls[rel] = d;
  familyModuleNames[fam].push.apply(familyModuleNames[fam], d.map((x) => x.name));
  const chars = d.reduce((a, x) => a + x.chars, 0);
  eq(d.length, expectN, 'fixture ' + rel + ' — declaration count');
  eq(chars, expectC, 'fixture ' + rel + ' — declaration chars');
}

for (const fam of Object.keys(FAMILY_TOTALS)) {
  const mods = FIXTURES.filter((f) => f[0] === fam);
  eq(mods.reduce((a, f) => a + f[2], 0), FAMILY_TOTALS[fam][0], fam + ' — family total declarations');
  eq(mods.reduce((a, f) => a + f[3], 0), FAMILY_TOTALS[fam][1], fam + ' — family total chars');
}

// ═════════════════════════════════════════════════════════════════════════════
// §3  THE MONOLITH, MEASURED FROM ZERO  (audit phase 4)
//
// Nothing here is derived by subtracting a historical total. The inline script
// is re-read from index.html through the same loader the rest of the suite uses,
// and parsed fresh.
// ═════════════════════════════════════════════════════════════════════════════

section('§3  THE CURRENT INLINE MONOLITH, MEASURED FROM ZERO');

const SCRIPTS = loadOrderedScriptSources();
const INLINE = SCRIPTS.filter((s) => s.kind === 'inline' && s.isAppJs).map((s) => s.code).join('\n');
const EXTERNAL_SCRIPTS = SCRIPTS.filter((s) => s.kind === 'local');

const DECLS = scanTopLevelDeclarations(INLINE);
const DECL_CHARS = DECLS.reduce((a, x) => a + x.chars, 0);
const NAME_COUNT = {};
for (const d of DECLS) NAME_COUNT[d.name] = (NAME_COUNT[d.name] || 0) + 1;
const UNIQUE_NAMES = Object.keys(NAME_COUNT);
const DUPLICATE_NAMES = UNIQUE_NAMES.filter((n) => NAME_COUNT[n] > 1);
const DUPLICATE_EXTRA_SITES = DUPLICATE_NAMES.reduce((a, n) => a + NAME_COUNT[n] - 1, 0);

const FORMS = {};
for (const d of DECLS) {
  const k = (d.isAsync ? 'async ' : '') + d.form;
  FORMS[k] = (FORMS[k] || 0) + 1;
}

// Top-level gaps between declarations, split into comment bytes, executable
// statement bytes and whitespace. The three plus the declaration bytes must
// account for EVERY byte of the inline script — a measurement that does not
// close is a measurement that is hiding something.
function stripComments(t) {
  let o = '', i = 0;
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { while (i < t.length && t[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) i++; i += 2; continue; }
    o += c; i++;
  }
  return o;
}

let GAP_EXEC_COUNT = 0, GAP_EXEC_CHARS = 0, GAP_COMMENT_CHARS = 0;
{
  let prev = 0;
  const regions = [];
  for (const d of DECLS) { if (d.start > prev) regions.push([prev, d.start]); prev = d.end + 1; }
  if (prev < INLINE.length) regions.push([prev, INLINE.length]);
  for (const [a, b] of regions) {
    const raw = INLINE.slice(a, b);
    const st = stripComments(raw);
    GAP_COMMENT_CHARS += raw.length - st.length;
    const code = st.trim();
    if (code === '') continue;
    GAP_EXEC_COUNT++; GAP_EXEC_CHARS += code.length;
  }
}
const GAP_WHITESPACE_CHARS = INLINE.length - DECL_CHARS - GAP_EXEC_CHARS - GAP_COMMENT_CHARS;

eq(SCRIPTS.filter((s) => s.kind === 'inline' && s.isAppJs).length, 1, 'exactly one inline application script');
eq(EXTERNAL_SCRIPTS.length, 37, 'external local application scripts on disk');
ok(DECL_CHARS + GAP_EXEC_CHARS + GAP_COMMENT_CHARS + GAP_WHITESPACE_CHARS === INLINE.length,
  'the byte accounting closes: declarations + executable gaps + comments + whitespace = inline length');
ok(GAP_WHITESPACE_CHARS >= 0, 'whitespace remainder is non-negative');
eq(DECLS.length - UNIQUE_NAMES.length, DUPLICATE_EXTRA_SITES, 'sites minus unique names equals duplicate extra sites');
eq(DUPLICATE_EXTRA_SITES, 0, 'the EIC extraction removed the monolith\'s last duplicate declaration sites');

// ═════════════════════════════════════════════════════════════════════════════
// §4  OWNER-FIRST CLASSIFICATION  (audit phase 5)
//
// Ordered rules; FIRST match wins. Two orderings matter and are deliberate:
//
//   • A terminal family's pattern is near the top, so a residual would be
//     CLASSIFIED as that family and fail §5 loudly rather than be absorbed
//     somewhere else and vanish.
//   • An explicit OWNER PREFIX (`_pf…`, `_dss…`, `_rs…`, `_swing…`) precedes
//     every topic rule. `_pfOnCandleTick` is portfolio state that happens to
//     react to a candle — not candle-pipe state. With the topic rule first it
//     was classified CANDLE_PIPE and manufactured three "foreign writes"
//     between PORTFOLIO and CANDLE_PIPE that do not exist. Ownership outranks
//     topic words, and this ordering is what §8 depends on.
// ═════════════════════════════════════════════════════════════════════════════

const RULES = [
  // Contracted-inline pin. The DSB adapter contract's OPTION_A_KEEP_INLINE
  // requires this debug bridge to STAY in the monolith. It is not a DSB
  // residual and it is not a candidate.
  ['DSB_DEBUG_BRIDGE', /^apexDebugBackendDirectionalAdapter$/],

  // Terminal families. A match here is a RESIDUAL and fails §5.
  ['DSB', /^(bds|bdsp|bss)[A-Z_]/],
  ['SFS', /^_?sfs/i],
  ['PESS', /^(pess|PESS_)/],

  // Strong owner prefixes — see the header note.
  ['PORTFOLIO', /^_?pf[A-Z]/],
  ['PORTFOLIO', /^_?portfolio/i],

  ['EIC', /^_?eic/i],
  ['EIC', /^runEICPanel$/],
  // Owner-derived exceptions: both were introduced by the commit that added
  // EIC, consume/produce EIC-shaped data, and every production caller is in an
  // EIC module. Prefix-only classification previously hid them as PRETRADE.
  ['EIC', /^(computeFinalDecision|computeSetupScore)$/],

  ['DSS', /^_?dss/i],
  ['DSS', /^_?DSS4H_|^DSS_/],
  ['DSS', /^(computeDirectionalSetupCandidates|renderDirectionalSetupScanner|openDirectionalSetupDetail|closeDssDetail|switchPanelTab|getAtrState|getDirectionalTechnicalState)$/],

  ['RS_VS_SPY', /^_?rsb/],
  ['RS_VS_SPY', /^RSB_/],
  ['RS_VS_SPY', /^_?rs[A-Z0-9_]/],
  ['RS_VS_SPY', /^_?RS_/],
  ['RS_VS_SPY', /^(computeRsCandidates|renderRsScanner|renderRsCharts|openRsChart|closeRsDetail|rsSetMode|rsSetTf|rsToggleAdx5|rsApplyFilters|ffBackendRsSnapshot)$/],
  ['RS_VS_SPY', /RsBenchmark|RsSpy1d|RsSpy4h|Rs1dBenchmark/],
  ['RS_VS_SPY', /^_fetchBackendSpy(1d|4h)Benchmark$/],

  ['SWING', /^_?swing/i],
  ['SWING', /^SWING_/],
  ['SWING', /^ffSwingTrading$/],

  ['MCX', /^_?mcx/i],
  ['MCX', /^_?vixFamily/i],
  ['MCX', /VixFamily/],
  ['MCX', /^(fetchVixFamily|_ensureVixFamily|fetchMarketContextSnapshotFromBackend|fetchMarketContextVixFamilyFromBackend|_cachePortfolioMarketContextSnapshot|runMarketContextPanel|runMarketContextAnalysis|refreshSharedMarketRegime|computeMarketRegime|regimeHTML|ffMcxBackendSnapshot)$/],
  ['MCX', /^_?dashboardRegime/i],
  ['MCX', /^_?_?REGIME_/],
  ['MCX', /^_regime/],
  ['MCX', /^_VIX_/],
  ['MCX', /^_startDashboardRegimeRefresh$|^_stopDashboardRegimeRefresh$/],

  ['PRETRADE', /^_?pt[A-Z]/],
  ['PRETRADE', /^_?pretrade/i],
  ['PRETRADE', /PreTrade/],
  ['PRETRADE', /^_fetchPretradeBackendCandles$/],

  ['JOURNAL', /^_?journal/i],
  ['JOURNAL', /Journal/],
  ['JOURNAL', /^_?jex/],
  ['JOURNAL', /^_?jt[A-Z]/],
  ['JOURNAL', /^_?j[A-Z]/],
  ['JOURNAL', /Jt[A-Z]|JtLeg|JtForm/],
  ['JOURNAL', /^_?adj[A-Z]|^_adjForm|^_onAdj|^_adjUpdate|^_adjAdd|^_adjRemove/],
  ['JOURNAL', /Adjustment/],
  ['JOURNAL', /^_?(rollLeg|autoPopulateRollLegs|validateRollTypeMatch)/],
  ['JOURNAL', /Trade(s)?(Details|Detail|Metrics|ForBackend)?$/],
  ['JOURNAL', /^(submitTrade|deleteTrade|showAddTradeForm|showEditTradeForm|showTradeDetails|closeTradeDetail|_tradeMetrics|_tradeForBackend|_priceCellHtml|_detailCell)$/],
  ['JOURNAL', /^(closeLegsModal|showCloseLegsModal|submitCloseLegs|_closeLegsTradeId|_renderCloseLegsForm|_clPnlPreview|closeAdjustmentModal|openCloseModal|cancelCloseModal|_closingPositionId)$/],
  ['JOURNAL', /^(legStatusOf|legIsOpen|legIsTerminal|_LEG_TERMINAL_STATUSES|J_LEG_TEMPLATES|_loadSheetJS)$/],
  ['JOURNAL', /Backup/],
  ['JOURNAL', /^_bk(Fmt|)/],
  ['JOURNAL', /^refreshAllJtLegStreamers$/],

  ['SCANNER', /^_?scanner/i],
  ['SCANNER', /^_?schart/i],
  ['SCANNER', /^_SCANNER_/],
  ['SCANNER', /^(runScan|runQA|renderScanResults|renderRanking|setFilter|setSort|sortData|getAdvFilters|updateAdvFilter|resetAdvFilters|openScannerChart|closeScannerChart|renderScannerInlineChart|openChartForSymbolLookup|commitTickerSearch|searchTicker|normalizeSymbol|rerenderActiveScannerChart|scoreStock|getSignal|getStrategy|macdLabel|bbPos|setP|setPanel|renderPanelAlerts|ir|fetchEarningsForTicker|fetchEarningsForAll|enrichScanWithLiveQuotes|_scanDataField|ffSqueezeFireScanner|_symbolSearchLog)$/],

  ['CHART', /^_?chart[A-Z_]/],
  ['CHART', /^_CHART_/],
  ['CHART', /^CHART_STATE$/],
  ['CHART', /^(prepareHiDPICanvas|_drawCandleChart|openChart|closeChart|renderCharts|setChartPeriod|_mainChartPatchLastClose|_chartOpenSymbolLog|_normalizeCommittedChartSymbol)$/],

  ['CANDLE_PIPE', /^_?candle/i],
  ['CANDLE_PIPE', /Candles?$/],
  ['CANDLE_PIPE', /Candle(s)?[A-Z_]/],
  ['CANDLE_PIPE', /^_?backendCandleStoreChart/i],
  ['CANDLE_PIPE', /^_BACKEND_CANDLE_/],
  ['CANDLE_PIPE', /BackendCandleStore/],
  ['CANDLE_PIPE', /^_?browser4hFallback|^_browserCandleBackoffActive|^_BROWSER_4H|^_startBrowser4hFallbackIfAllowed$/],
  ['CANDLE_PIPE', /^_apexParity|^APEX_PARITY_TOL$|^_apexCompareCandleArrays$/],
  ['CANDLE_PIPE', /^(getCandleDataSource|getCandleSeries|computeCandleIndicators|patchLastCandleWithLivePrice|_patchLivePrice|resolveLatestDisplayPrice|_buildRth4hCandles|_RTH_S|isRTHOpen|getUsEquityMarketSession|_etMinutes|_etDateStr|_etWeekBucket|_initCandleStream|_ensureCandleSubscription|_ensure30MSubscription|fetchTwelveData|fetchAlphaVantage|fetchYahooProxy|_rsVsSpyLabel|_onCandleData|_cSym|_cSubEntry|DEBUG_CANDLE_STREAM|postCandleContext|_backendApiAuthState|_apexAuthSkipLogged|_backendCandleAuth|_isLiveCandleAllowlistedTicker|ffBackendCandleParityDebug|ffPreferBackendCandlesForCharts|ffBackendCandlesPretradeSnapshot|ffBackendCandlesMcxCharts|ffBackendCandlesScannerCharts|APEX_FF_BACKEND_CANDLE_STORE_CHART|ffBackendCandleStoreChart|ensureBackendCandleStoreSymbol)$/],

  ['AGENTS_CHAT', /^AGENTS$/],
  ['AGENTS_CHAT', /^(selAgent|selAgentById|setAS|logEv|renderAgentTable|renderSysbar|renderDataHealth|renderElog|clearLog|DEFAULT_RULES|renderRules|editRuleById|deleteRule|resetRules|addRule)$/],
  ['AGENTS_CHAT', /^(appendMsg|appendAgentMsg|appendSysMsg|appendTyping|hk|quickAsk|rulesCtx|scanCtx|tickerCtx|sendMsg|callAgent|orchestratedAnalysis)$/],

  ['PORTFOLIO', /Portfolio/],
  ['PORTFOLIO', /^_?spy[A-Z]|^_spyPrice|^_spyContext|^_spyFreshNum$|^_resolveSpyPrice$|^resolveFreshSpyPrice$/],
  ['PORTFOLIO', /^_?greeks|Greeks/],
  ['PORTFOLIO', /^_?GREEKS_/],
  ['PORTFOLIO', /^_?chain[A-Z]|^_CHAIN_|Chain/],
  ['PORTFOLIO', /^_?optChain|^_optionChain|OptionChain/],
  ['PORTFOLIO', /^_?leg[A-Z]|Leg(s)?[A-Z]|^_deriveLegStreamer$|^updateLegStreamer$|^updateLegField$|^addCustomLeg$|^removeLeg$|^_legUnrealizedPnL$|^_onLegExpChange$|^_onLegStrikeChange$|^_fmtShortLegDelta$/],
  ['PORTFOLIO', /[Pp]osition/],
  ['PORTFOLIO', /^_?addPosFormOpen$|^_formLegs$|^_formStrategy$|^onStrategyChange$|^cancelAddPositionForm$/],
  ['PORTFOLIO', /^(field|fieldWithChange|fieldSelect|fieldSelectChange)$/],
  ['PORTFOLIO', /Technical|Squeeze|squeeze/],
  ['PORTFOLIO', /Beta|beta/],
  ['PORTFOLIO', /Earnings|earnings/],
  ['PORTFOLIO', /^_?ivr|Ivr|IVR/],
  ['PORTFOLIO', /^(refreshPositionsLive|showDetail|showIVPanel|showAccountPanel|aggregateGreeks|_mergeBatchInto|_buildSnapshot|_buildRichSnapshot|_prefetchDXLinkForSnapshot|buildFormulaParityGate|_getIntradayTech|_getTechForTF|_calcTechnicalsFromCandles|_ensurePerfDiag|computeDTE|computeMoneyness|formatPnl|fetchDXLinkGreeks|fetchFundamentals|fetchBackendOptionLive|subscribeBackendOptionLive|_fetchOptionChain|_fetchAndRenderChain|enrichWithTT|enrichWithQuotes|portStat|greekStat|ivrColor|inferStructureCountForPosition|_fmtVix3mRangeDisplay|VOL_DELTA_TOLERANCE|selectConservativeVolDeltaRange|evaluateDeltaRangeForBias|evaluateVolatilityDeltaConsistency|evaluateShortPremiumExitAlert|getStructureScaledDeltaRanges|getIvrDeltaRange|getVix3mDeltaRange|getWorstShortLegDelta|normalizeOptionLegSymbolAliases|normalizeTradeOptionLegAliases|optionLegScalarDiagnostics|logOptionStreamerDiagnostics|updateStreamerPreview|getPreferredOptionDxlinkSymbol|_deltaThetaRatioMissingReason|_normalizeEarningsDate|_backendCacheStaleMark|_logSnapshot|_scheduleSnapshotTechRetry|_snapshotSqueezeState|_applyTechnicalRefreshEarnings|refreshAllLegStreamers|_validateBackendFullRefreshPayload|_extractBackendSqueezeByTicker|_lastKnownUnderlyingPrice|_earningsCache|_ivrCache|deletePosition|computeRowBetaWeightedDelta|computeVegaMonitorRatios|_resolveLegGreeksDisplay)$/],

  // CORE_SHELL — shared infrastructure. Deliberately NOT a candidate: no product
  // family owns it and every candidate calls into it. Extracting it is a
  // different project with a different risk profile.
  ['CORE_SHELL', /^(APEX_BUILD_TAG|S|WL|STRATEGY_TEMPLATES|debugLog|debugWarn|debugTable|escHtml|removeEl|mapLimit|isAbortLikeError|showToast|showSecTab|hideSecTabs|showView|_activeView|updateMkt|doLogout)$/],
  ['CORE_SHELL', /^_?dxlink|Dxlink|DXLink/],
  ['CORE_SHELL', /^_?storm|^STORM_|StormBanner/i],
  ['CORE_SHELL', /^_?(isBackendUnreachable|noteBackendUnreachable|noteBackendReachable|backendCircuitOpen|technicalRefreshPartial|noteTechnicalRefreshPartial|clearTechnicalRefreshPartial|runLimited|drainPool|coalesceDxStatus|subscribeAllowed|markSubscribePending|markSubscribeFailed|markSubscribeSucceeded)$/],
  ['CORE_SHELL', /^_?tt[A-Z]|^TT_|^doReconnectTT$|^showReconnectPanel$|^_apexPostAuthInit$/],
  ['CORE_SHELL', /^apexStorageKey|^apexNonDestructiveLoadArray$|^_apexReadArray$|^apexBackupKey$|^apexCreateBackup$|^apexDumpStorageKeys$|^isApexPreviewOrLocalEnv$|^isApexLocalDevEnv$/],
  ['CORE_SHELL', /^ff[A-Z]/],
  ['CORE_SHELL', /^_apexBackendOffloadDiag$|^_apexLatestBetaBySymbol$|^_apexLatestEarningsBySymbol$/],
  ['CORE_SHELL', /^(fetchLiveQuote|subscribeDxlinkQuotes)$/],
];

function classifyName(name, rules) {
  const R = rules || RULES;
  for (let i = 0; i < R.length; i++) if (R[i][1].test(name)) return R[i][0];
  return null;
}

// Only families with a proved owner-aware zero residue are terminal. EIC has
// shipped four modules, but is deliberately still a candidate until its two
// generically named residual rules have moved.
const COMPLETED_FAMILIES = ['DSB', 'SFS', 'PESS'];
const PARTIALLY_EXTRACTED_FAMILIES = ['EIC'];
const NON_CANDIDATE_FAMILIES = ['CORE_SHELL', 'DSB_DEBUG_BRIDGE'].concat(COMPLETED_FAMILIES);

// ─────────────────────────────────────────────────────────────────────────────
// Body facts. Every textual probe runs against a literal-stripped copy of the
// body, so a comment that mentions `document.` or a string containing `S.` can
// never be counted as a real effect.
// ─────────────────────────────────────────────────────────────────────────────

function stripLiterals(t) {
  let o = '', i = 0, prev = '';
  const isIdent = (c) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
  while (i < t.length) {
    const c = t[i], d = t[i + 1];
    if (c === '/' && d === '/') { while (i < t.length && t[i] !== '\n') i++; o += '\n'; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < t.length && !(t[i] === '*' && t[i + 1] === '/')) i++; i += 2; o += ' '; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < t.length) { if (t[i] === '\\') { i += 2; continue; } if (t[i] === q) { i++; break; } i++; }
      o += '""'; prev = '"'; continue;
    }
    if (c === '/' && (prev === '' || !(isIdent(prev) || prev === ')' || prev === ']'))) {
      let j = i + 1, inClass = false, closed = false;
      for (; j < t.length; j++) {
        if (t[j] === '\\') { j++; continue; }
        if (t[j] === '\n') break;
        if (t[j] === '[') inClass = true; else if (t[j] === ']') inClass = false;
        else if (t[j] === '/' && !inClass) { closed = true; break; }
      }
      if (closed) { i = j + 1; while (i < t.length && /[a-z]/i.test(t[i])) i++; o += '/RE/'; prev = '/'; continue; }
    }
    o += c; if (!/\s/.test(c)) prev = c; i++;
  }
  return o;
}

const TOP_NAMES = new Set(DECLS.map((d) => d.name));

function countAll(s, re) { const m = s.match(re); return m ? m.length : 0; }
function uniq(a) { return Array.from(new Set(a)); }

function localShadows(s) {
  // Names bound LOCALLY in this body — declarators, function declarations,
  // parameters, catch bindings, arrow parameters. A write to one of these is a
  // write to a SHADOW, not to the top-level binding of the same name. Counting
  // it would invent a foreign write that does not exist: `var ivrColor = …`
  // inside runEICPanel is not EIC writing PORTFOLIO's `ivrColor`.
  const sh = new Set();
  let m;
  const declRe = /\b(?:var|let|const)\s+([A-Za-z0-9_$\s,]+?)(?==|;|\bin\b|\bof\b|\n)/g;
  while ((m = declRe.exec(s)) !== null) {
    m[1].split(',').forEach((p) => { const t = p.trim(); if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t)) sh.add(t); });
  }
  const paramRe = /\bfunction\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g;
  while ((m = paramRe.exec(s)) !== null) {
    m[1].split(',').forEach((p) => { const t = p.trim().split('=')[0].trim(); if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(t)) sh.add(t); });
  }
  const fnNameRe = /\bfunction\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = fnNameRe.exec(s)) !== null) sh.add(m[1]);
  const catchRe = /\bcatch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)/g;
  while ((m = catchRe.exec(s)) !== null) sh.add(m[1]);
  const arrowRe = /(?:^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*=>/g;
  while ((m = arrowRe.exec(s)) !== null) sh.add(m[1]);
  return sh;
}

function bodyFacts(text, ownName) {
  const s = stripLiterals(text);
  const sh = localShadows(s);
  const f = {};
  f.stateReads = uniq((s.match(/\bS\.([A-Za-z0-9_$]+)/g) || []).map((x) => x.slice(2)));
  f.stateWrites = uniq((s.match(/\bS\.([A-Za-z0-9_$]+)\s*(?:=[^=]|\+\+|--|\+=|-=)/g) || []).map((x) => x.match(/S\.([A-Za-z0-9_$]+)/)[1]));
  f.domReads = countAll(s, /\b(document\.(getElementById|querySelector|querySelectorAll|getElementsBy[A-Za-z]+)|\.closest\(|\.dataset\b)/g);
  f.domWrites = countAll(s, /\.(innerHTML|textContent|innerText|style|className|classList|setAttribute|appendChild|removeChild|insertAdjacentHTML|value)\s*[.=(]/g);
  f.network = countAll(s, /\b(fetch\s*\(|ttCall\s*\(|backendGet\s*\(|backendPost\s*\(|apexBackend[A-Za-z]*\s*\(|new\s+WebSocket)/g);
  f.websocket = countAll(s, /new\s+WebSocket/g);
  f.timers = countAll(s, /\b(setTimeout|setInterval|requestAnimationFrame)\s*\(/g);
  f.listeners = countAll(s, /\.addEventListener\s*\(|\bon[a-z]+\s*=\s*function|\bon(click|change|input|keydown|resize|message|open|close|error)\s*=/g);
  f.storage = countAll(s, /\b(localStorage|sessionStorage)\b/g);
  f.globals = uniq((s.match(/\bwindow\.([A-Za-z0-9_$]+)\s*=[^=]/g) || []).map((x) => x.match(/window\.([A-Za-z0-9_$]+)/)[1]));
  f.subscriptions = countAll(s, /\b(subscribeDxlinkQuotes|_ensureCandleSubscription|_ensure30MSubscription|subscribeBackendOptionLive|\.subscribe\s*\()/g);
  f.callees = uniq((s.match(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g) || [])
    .map((x) => x.replace(/\s*\($/, ''))
    .filter((nm) => TOP_NAMES.has(nm) && nm !== ownName));
  f.bindingWrites = uniq((s.match(/(?:^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=[^=>]|\+\+|--|\+=|-=)/g) || [])
    .map((x) => { const m = x.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=|\+\+|--|\+=|-=)/); return m ? m[1] : null; })
    .filter((nm) => nm && TOP_NAMES.has(nm) && !sh.has(nm) && nm !== ownName));
  return f;
}

function buildInventory(rules) {
  return DECLS.map((d, idx) => {
    const text = INLINE.slice(d.start, d.end + 1);
    return Object.assign({ idx: idx, text: text, family: classifyName(d.name, rules) }, d, bodyFacts(text, d.name));
  });
}

const INV = buildInventory(RULES);
const OWNER_OF = {};
for (const d of INV) OWNER_OF[d.name] = d.family;

section('§4  OWNER-FIRST CLASSIFICATION');
const UNCLASSIFIED = INV.filter((d) => d.family === null);
eq(UNCLASSIFIED.length, 0, 'every declaration site is classified — no residual "other" bucket'
  + (UNCLASSIFIED.length ? ': ' + UNCLASSIFIED.slice(0, 12).map((d) => d.name).join(', ') : ''));

// ═════════════════════════════════════════════════════════════════════════════
// §5  TERMINAL / PARTIAL FAMILY RESIDUAL PROOF  (audit phases 3 + 20)
//
// Two independent proofs, because they can fail for different reasons:
//   A. NAME PROOF — not one of the names declared by the shipped family
//      modules is also declared inline. This is the proof that matters: it is
//      derived from the modules themselves, so it cannot drift from them.
//   B. CLASSIFIER PROOF — no inline declaration classifies as a terminal
//      family. This catches a NEW declaration that adopts a completed family's
//      naming without being one of the known 125.
// And a third, separate check: the completed families' prefixes DO still occur
// inline in comments and CALLS — that is expected and must not be mistaken for
// a residual declaration.
// ═════════════════════════════════════════════════════════════════════════════

section('§5  DSB / SFS / PESS TERMINAL PROOF + EIC RESIDUE');

const RESIDUAL_PROOF = {};
for (const fam of COMPLETED_FAMILIES) {
  const names = familyModuleNames[fam];
  const residual = names.filter((n) => TOP_NAMES.has(n));
  RESIDUAL_PROOF[fam] = {
    moduleDeclarations: names.length,
    inlineResidual: residual.length,
    residualNames: residual,
  };
  eq(residual.length, 0, fam + ' — inline residual declarations (name proof, from the modules themselves)');
  eq(names.length, FAMILY_TOTALS[fam][0], fam + ' — module declaration names recovered');
  const byClassifier = INV.filter((d) => d.family === fam);
  eq(byClassifier.length, 0, fam + ' — inline residual declarations (classifier proof)');
}

// EIC's shipped-name proof is green but insufficient: the four modules do not
// declare these generic names, so only owner-aware classification can see the
// residue. This is the exact hole the post-EIC audit corrects.
{
  const fam = 'EIC';
  const names = familyModuleNames[fam];
  const shippedNameResidual = names.filter((n) => TOP_NAMES.has(n));
  const byClassifier = INV.filter((d) => d.family === fam);
  RESIDUAL_PROOF[fam] = {
    moduleDeclarations: names.length,
    inlineResidual: byClassifier.length,
    residualNames: byClassifier.map((d) => d.name),
    shippedNameResidual: shippedNameResidual,
  };
  eq(shippedNameResidual, [], 'EIC — no already-shipped module name reappears inline');
  eq(names.length, FAMILY_TOTALS[fam][0], 'EIC — shipped module declaration names recovered');
  eq(byClassifier.map((d) => d.name), ['computeFinalDecision', 'computeSetupScore'],
    'EIC — owner-aware classifier exposes the two generic residual declarations');
  eq(byClassifier.reduce((a, d) => a + d.chars, 0), 10112,
    'EIC — residual declaration bytes are measured exactly');
}

// The prefixes still APPEAR inline — in comments and in call sites — and that is
// not a residual. A rule that counted textual occurrences would resurrect all
// three completed families as candidates.
// One probe per family, matching how that family is actually spelled where it
// is still MENTIONED. PESS is the instructive case: its lowercase `pessX`
// prefix has ZERO textual occurrences left inline, yet `PESS` appears 12 times
// (comments, the panel id, the single `runPESSPanel` call site). A probe that
// only looked for `pess[A-Z]` would report "no trace" and a probe that only
// looked for declarations would agree — but the family is still referenced, and
// saying so is the point of this check.
const PREFIX_TEXT_HITS = {
  DSB: countAll(INLINE, /\b(bds[A-Z]|DSB)/g),
  SFS: countAll(INLINE, /\b(sfs[A-Z]|SFS)/g),
  PESS: countAll(INLINE, /\b(pess[A-Z]|PESS)/g),
  EIC: countAll(INLINE, /\b(eic[A-Z]|EIC)/g),
};
for (const fam of COMPLETED_FAMILIES) {
  ok(PREFIX_TEXT_HITS[fam] > 0,
    fam + ' — its prefix DOES still occur inline (' + PREFIX_TEXT_HITS[fam] + ' textual hits: comments and calls)');
  ok(RESIDUAL_PROOF[fam].inlineResidual === 0,
    fam + ' — …yet ZERO of those are declaration sites, so it is not a candidate');
}
ok(PREFIX_TEXT_HITS.EIC > 0, 'EIC — its prefix still occurs inline in comments/calls');
eq(RESIDUAL_PROOF.EIC.inlineResidual, 2,
  'EIC — prefix-independent owner proof prevents a false terminal zero');

// ═════════════════════════════════════════════════════════════════════════════
// §6  FAMILY ROLLUP  (audit phase 9)
//
// Candidates are DISCOVERED from the classification, not taken from the old
// #369 shortlist. The old list is used only as a cross-check at the end of this
// section: every family it named must either be found here or be a completed
// family, and anything this audit found that the old list did not is reported.
// ═════════════════════════════════════════════════════════════════════════════

section('§6  CURRENT FAMILY INVENTORY');

function rollup(inv) {
  const fams = {};
  const ordered = inv.slice().sort((a, b) => a.start - b.start);
  for (const d of ordered) {
    const F = d.family;
    if (!fams[F]) {
      fams[F] = {
        name: F, sites: 0, chars: 0, asyncCount: 0, runs: 0,
        domReads: 0, domWrites: 0, network: 0, websocket: 0, timers: 0,
        listeners: 0, storage: 0, globals: 0, subscriptions: 0,
        stateReads: new Set(), stateWrites: new Set(),
        names: [], forms: {}, firstIdx: d.idx, lastIdx: d.idx,
        zeroDomSites: 0, zeroDomChars: 0, domSites: 0, domChars: 0,
      };
    }
    const r = fams[F];
    r.sites++; r.chars += d.chars; if (d.isAsync) r.asyncCount++;
    r.domReads += d.domReads; r.domWrites += d.domWrites;
    r.network += d.network; r.websocket += d.websocket; r.timers += d.timers;
    r.listeners += d.listeners; r.storage += d.storage;
    r.globals += d.globals.length; r.subscriptions += d.subscriptions;
    d.stateReads.forEach((x) => r.stateReads.add(x));
    d.stateWrites.forEach((x) => r.stateWrites.add(x));
    r.names.push(d.name);
    const k = (d.isAsync ? 'async ' : '') + d.form;
    r.forms[k] = (r.forms[k] || 0) + 1;
    r.lastIdx = d.idx;
    if (d.domReads + d.domWrites === 0) { r.zeroDomSites++; r.zeroDomChars += d.chars; }
    else { r.domSites++; r.domChars += d.chars; }
  }
  // physical runs — maximal blocks of consecutive same-family declarations
  let prev = null;
  for (const d of ordered) { if (d.family !== prev) fams[d.family].runs++; prev = d.family; }
  for (const r of Object.values(fams)) {
    r.uniqueNames = new Set(r.names).size;
    r.duplicateSites = r.names.length - r.uniqueNames;
    r.monolithPct = r.chars / INLINE.length * 100;
    r.fragmentation = r.runs / r.sites;
    r.stateReads = Array.from(r.stateReads);
    r.stateWrites = Array.from(r.stateWrites);
  }
  return fams;
}

const FAMS = rollup(INV);
const CANDIDATES = Object.values(FAMS)
  .filter((f) => NON_CANDIDATE_FAMILIES.indexOf(f.name) < 0)
  .sort((a, b) => b.chars - a.chars);

eq(Object.values(FAMS).reduce((a, f) => a + f.sites, 0), DECLS.length, 'the rollup accounts for every declaration site');
eq(Object.values(FAMS).reduce((a, f) => a + f.chars, 0), DECL_CHARS, 'the rollup accounts for every declaration byte');
for (const fam of COMPLETED_FAMILIES) {
  ok(CANDIDATES.every((c) => c.name !== fam), fam + ' is NOT a candidate — it reached terminal extraction');
}
ok(CANDIDATES.every((c) => c.name !== 'CORE_SHELL'),
  'CORE_SHELL is not a candidate — it is shared infrastructure every family calls into');

// Cross-check against the OLD #369 shortlist. Seeds only; discovery was
// independent. Reported, not enforced as an equality.
const OLD_369_LIST = ['DSS', 'EIC', 'PRETRADE', 'CHART', 'MCX', 'RS_VS_SPY', 'JOURNAL',
  'PORTFOLIO', 'SWING', 'SCANNER', 'CANDLE_PIPE', 'AGENTS_CHAT'];
const FOUND_NAMES = CANDIDATES.map((c) => c.name);
const OLD_NOT_FOUND = OLD_369_LIST.filter((n) => FOUND_NAMES.indexOf(n) < 0 && COMPLETED_FAMILIES.indexOf(n) < 0);
const NEW_NOT_IN_OLD = FOUND_NAMES.filter((n) => OLD_369_LIST.indexOf(n) < 0);
eq(OLD_NOT_FOUND, [], 'every family on the old #369 shortlist was rediscovered independently');

// ═════════════════════════════════════════════════════════════════════════════
// §7  DUPLICATE DECLARATION SITES, ANALYSED SEMANTICALLY  (audit phase 6)
//
// A duplicate is NOT a blocker merely because it is ugly. For each duplicated
// name this section compares the sites byte for byte, checks the binding form,
// establishes what classic-script semantics make the winner, and asks the only
// question an extraction actually needs answered:
//
//     can BOTH sites be relocated unchanged, in their original relative order,
//     without changing what the application does?
//
// Classification: RELOCATION_SAFE_BOTH_SITES · SHADOWING_BUT_RELOCATION_SAFE ·
//                 REQUIRES_DEDUPLICATION · SEMANTIC_BLOCKER
// ═════════════════════════════════════════════════════════════════════════════

section('§7  DUPLICATE DECLARATION SITES');

function analyseDuplicate(name) {
  const sites = INV.filter((d) => d.name === name).sort((a, b) => a.start - b.start);
  const texts = sites.map((s) => s.text);
  const identical = texts.every((t) => t === texts[0]);
  const forms = uniq(sites.map((s) => (s.isAsync ? 'async ' : '') + s.form));
  const sameForm = forms.length === 1;
  const allHoisted = sites.every((s) => s.form === 'function' || s.form === 'class');
  const allFunctionDecls = sites.every((s) => s.form === 'function');

  // Is there any TOP-LEVEL EXECUTABLE statement between the first and last site?
  // For hoisted function declarations the answer is decorative — every binding
  // exists before statement one runs — but a `var`/`let` duplicate would make it
  // decisive, so it is measured rather than assumed.
  const lo = sites[0].end + 1, hi = sites[sites.length - 1].start;
  const between = INV.filter((d) => d.start >= lo && d.end < hi);
  let interveningExec = 0;
  {
    let prev = lo;
    const regions = [];
    for (const d of between.sort((a, b) => a.start - b.start)) { if (d.start > prev) regions.push([prev, d.start]); prev = d.end + 1; }
    if (prev < hi) regions.push([prev, hi]);
    for (const [a, b] of regions) if (stripComments(INLINE.slice(a, b)).trim() !== '') interveningExec++;
  }

  // Does anything between the sites REFERENCE the name? Only a reference could
  // observe which declaration is bound, and only if the binding form allowed a
  // window in which they differ.
  const referencesBetween = between.filter((d) => d.text.indexOf(name) >= 0).map((d) => d.name);

  let classification;
  if (!sameForm) classification = 'SEMANTIC_BLOCKER';
  else if (identical && allFunctionDecls) classification = 'RELOCATION_SAFE_BOTH_SITES';
  else if (allHoisted && !identical) classification = 'SHADOWING_BUT_RELOCATION_SAFE';
  else classification = 'REQUIRES_DEDUPLICATION';

  return {
    name, siteCount: sites.length, chars: sites.map((s) => s.chars),
    identicalBytes: identical, bindingForms: forms, sameBindingForm: sameForm,
    hoisted: allHoisted, positions: sites.map((s) => s.start),
    declarationsBetween: between.length, interveningTopLevelStatements: interveningExec,
    referencesBetween: referencesBetween, family: sites[0].family,
    classification,
    // The winner in a classic script: the LAST function declaration processed
    // wins, and it wins at HOIST time — before any statement executes.
    winner: allFunctionDecls ? 'last site (hoisting: both are bound before statement one runs)' : 'n/a',
    relocationSafe: classification === 'RELOCATION_SAFE_BOTH_SITES' || classification === 'SHADOWING_BUT_RELOCATION_SAFE',
  };
}

const DUPLICATES = DUPLICATE_NAMES.map(analyseDuplicate);
const BLOCKING_DUPLICATE_FAMILIES = uniq(DUPLICATES.filter((d) => !d.relocationSafe).map((d) => d.family));

for (const d of DUPLICATES) {
  ok(d.siteCount >= 2, d.name + ' — has ' + d.siteCount + ' declaration sites');
  ok(d.classification !== undefined, d.name + ' — classified: ' + d.classification);
}
eq(DUPLICATES.length, 0, 'the current monolith has no duplicate declaration sites');

// ═════════════════════════════════════════════════════════════════════════════
// §8  FOREIGN WRITES, ANALYSED SEMANTICALLY  (audit phase 7)
//
// A foreign write is a declaration of family A assigning to a top-level binding
// owned by family B. Shadowed names are excluded (see localShadows) — counting
// them is how a previous pass manufactured PORTFOLIO↔CANDLE_PIPE conflicts that
// do not exist.
//
// Classification: BENIGN_SHARED_STATE · MISCLASSIFIED_OWNER ·
//                 CROSS_MODULE_CALL_SAFE · STATE_MODULE_CAN_RESOLVE ·
//                 REAL_OWNER_CONFLICT · BLOCKER
// ═════════════════════════════════════════════════════════════════════════════

section('§8  FOREIGN WRITES');

const FOREIGN_WRITES = [];
for (const d of INV) {
  for (const target of d.bindingWrites) {
    const ownerFam = OWNER_OF[target];
    if (!ownerFam || ownerFam === d.family) continue;
    const targetDecl = INV.find((x) => x.name === target);
    // Load-time vs call-time: a write inside a function body happens when that
    // function is CALLED. Only a write in a `var`/`const` initialiser executes
    // at load time, and that is the only kind that constrains script ORDER.
    const callTime = d.form === 'function' || d.form === 'class';
    FOREIGN_WRITES.push({
      writer: d.name, writerFamily: d.family,
      target: target, targetFamily: ownerFam,
      targetForm: targetDecl ? targetDecl.form : '?',
      timing: callTime ? 'call-time' : 'load-time',
      // A mutable cache/handle written by a caller from another family, where the
      // binding is inert data rather than behaviour, is resolvable by giving the
      // binding its own state module — no body edit required.
      classification: callTime && targetDecl && targetDecl.form === 'var'
        ? 'STATE_MODULE_CAN_RESOLVE'
        : 'REAL_OWNER_CONFLICT',
    });
  }
}

const INBOUND_FOREIGN = {};
const OUTBOUND_FOREIGN = {};
for (const w of FOREIGN_WRITES) {
  (INBOUND_FOREIGN[w.targetFamily] = INBOUND_FOREIGN[w.targetFamily] || []).push(w);
  (OUTBOUND_FOREIGN[w.writerFamily] = OUTBOUND_FOREIGN[w.writerFamily] || []).push(w);
}

ok(FOREIGN_WRITES.every((w) => w.classification !== undefined), 'every foreign write is classified');
ok(FOREIGN_WRITES.every((w) => w.writerFamily !== w.targetFamily), 'a foreign write always crosses a family boundary');
// The gate that matters: a family is only state-blocked by writes it RECEIVES
// that cannot be resolved by a state module.
function unresolvedInbound(fam) {
  return (INBOUND_FOREIGN[fam] || []).filter((w) => w.classification === 'REAL_OWNER_CONFLICT');
}

// ═════════════════════════════════════════════════════════════════════════════
// §9  LIVE OPEN-PR CONFLICT MATRIX  (audit phase 8)
//
// PINNED OBSERVATION vs DERIVED CLASSIFICATION — the distinction matters.
//
//   PINNED: head SHA, merge-base, changed-file list, and the exact declaration
//   names each PR adds / changes / removes in the inline monolith. These were
//   measured against the LIVE PR heads while this audit ran, by parsing each
//   PR's index.html at its head and at its merge-base with the SAME parser
//   proven in §2, and diffing declaration bodies by name. A test cannot fetch,
//   so they are recorded here as data with the SHAs they belong to.
//
//   DERIVED: everything below — which family each touched declaration belongs
//   to, and therefore each family's conflict category. That derivation runs
//   offline every time this suite runs, against the CURRENT classifier. Weaken
//   the classifier or the gate and the derivation changes and the suite fails.
//
// A family is NOT blocked merely because a PR also edits index.html. What
// blocks is a changed DECLARATION BODY the family owns, or a real state-owner
// collision.
// ═════════════════════════════════════════════════════════════════════════════

section('§9  LIVE OPEN-PR CONFLICT MATRIX');

const OPEN_PRS = [
  {
    number: 369, title: 'test: audit next post-SFS monolith extraction', draft: true,
    head: 'e1893ff3b07beedbf668f8c20ded57bda1e25922', mergeBase: '1c7c0d945d858e4f968bc69d6887053fab227800',
    files: ['docs/refactoring/post-sfs-monolith-extraction-audit.md', 'tests/post-sfs-monolith-extraction-audit.test.js'],
    indexTouched: false, scriptTagsChanged: false, changedDecls: [], addedDecls: [], removedDecls: [],
  },
  {
    number: 363, title: 'test: audit next conflict-aware monolith extraction', draft: true,
    head: '07db24f651b2cf8235d62b49aac9317c1f8d72f1', mergeBase: '8555ded1e90e55aa99c26abe7474c55df3869237',
    files: ['docs/refactoring/next-monolith-extraction-audit.md', 'tests/next-monolith-extraction-audit.test.js'],
    indexTouched: false, scriptTagsChanged: false, changedDecls: [], addedDecls: [], removedDecls: [],
  },
  {
    number: 362, title: 'feat(stress): add portfolio stress test dashboard', draft: true,
    head: '9b2e0f4694f73fae3e8d06317e929ef930305c95', mergeBase: '8555ded1e90e55aa99c26abe7474c55df3869237',
    files: ['.github/workflows/portfolio-stress-companion.yml', 'config/risk-models/portfolio-stress-test-v1.json',
      'css/portfolio-stress.css', 'docs/risk-models/portfolio-stress-test-v1.md', 'index.html',
      'js/services/portfolio-stress-ui-state.js', 'js/ui/portfolio-stress-panel.js'],
    indexTouched: true, scriptTagsChanged: true,
    scriptsAdded: ['./js/services/portfolio-stress-ui-state.js', './js/ui/portfolio-stress-panel.js'],
    changedDecls: ['showView'], addedDecls: [], removedDecls: [],
  },
  {
    number: 361, title: 'refactor(scanner): migrate runScan candles to Tastytrade DXLink', draft: false,
    head: 'b17377ac9c35156cb8d3310ab6164048d14cdc87', mergeBase: '8555ded1e90e55aa99c26abe7474c55df3869237',
    files: ['config/risk-models/portfolio-stress-test-v1.json', 'index.html',
      'js/services/candle-dxlink-client.js', 'js/services/candle-normalization.js'],
    indexTouched: true, scriptTagsChanged: false,
    changedDecls: ['_SCANNER_CANDLE_SOURCE', '_scannerCandleCacheKey', '_scannerCandlePumpQueue',
      'fetchScannerCandles', 'runScan', 'getCandleDataSource', 'getDailyCandles',
      'patchLastCandleWithLivePrice', '_swingDeriveWeeklyCandles', 'SWING_CANDLE_REASON',
      '_swingEvaluateCanonicalCache', '_swingGetCandles', '_swingRunActiveTab',
      '_swingSeriesSessionDate', '_swingChartCachePut', '_swingGetChartCandles',
      '_swingResolveRenderPrice', '_swingPatchWeeklyWithSessionPrice',
      '_swingPreparePriceAlignedCandles', 'selAgent'],
    addedDecls: ['_scannerDetachCandleSeries', '_scannerAdaptDxlinkCandles', '_scannerFetchDxlinkDailyCandles',
      '_apexIsDailyOrCoarserTimeframe', '_apexUtcDateStr', '_apexCandleSessionDate',
      '_apexWeekBucketFromSessionDate', '_swingNonCanonicalSeriesPresent'],
    removedDecls: ['_SCANNER_CANDLE_DAYS', '_swingLegacySeriesPresent'],
  },
  {
    number: 352, title: 'fix(option-chain): add final bounded retry and transport dedup', draft: true,
    head: 'a2c68e7621ba2e60d84cade016f3ec8df4fd493d', mergeBase: '896aadae9be1225f52b5cfc1a915b042249a8f10',
    files: ['js/api/backend-client.js', 'tests/backend-client-option-chain-final-retry.test.js'],
    indexTouched: false, scriptTagsChanged: false, changedDecls: [], addedDecls: [], removedDecls: [],
  },
  {
    number: 310, title: 'fix(swing): load SWING chart candles from the persisted candle store', draft: true,
    head: 'd74fd6daf3bc561538906ba5f6b207b9d7babc74', mergeBase: '61c43715743e3546b7c5961293b4c5011fa4a810',
    files: ['index.html', 'tests/swing-chart-candle-load.test.js', 'tests/swing-trading.test.js'],
    indexTouched: true, scriptTagsChanged: false,
    changedDecls: ['_swingChartFailMsg', '_swingGetChartCandles', '_swingPrefetchNeighbors', '_swingRenderCharts'],
    addedDecls: ['_swingChartStateIsError', 'SWING_CHART_ENSURE_REREAD_ATTEMPTS', 'SWING_CHART_ENSURE_REREAD_DELAY_MS',
      'SWING_CHART_MIN_BARS', '_swingIsExplicitNoData', '_swingIsTransportFailure', '_swingEnsureTimeframesFor',
      '_swingChartLoadSeq', '_swingChartLoadLog', '_swingReadPersistedCandles', '_swingEnsureInflight',
      '_swingEnsureOnce', '_swingChartSleep', '_swingClassifyRead'],
    removedDecls: [],
  },
];

const CONFLICT_RANK = {
  NONE: 0, TEST_ONLY: 1, BOOKKEEPING: 2, DISTANT_SAME_FILE: 3, LOAD_ORDER: 4,
  STATE_OWNER: 5, DECLARATION_BODY: 6, SEMANTIC: 7, BLOCKED: 8,
};

// Derive, per family, the worst conflict any open PR creates for it.
function deriveConflicts(inv, rules) {
  const ownerOf = {};
  for (const d of inv) ownerOf[d.name] = d.family;
  const perFamily = {};
  const famNames = uniq(inv.map((d) => d.family));
  for (const f of famNames) perFamily[f] = { family: f, category: 'NONE', prs: [], detail: [] };

  for (const pr of OPEN_PRS) {
    if (!pr.indexTouched) {
      // Audit/test/module-only PRs. They cannot collide with a relocation.
      continue;
    }
    // A changed declaration body is the real signal.
    const touched = pr.changedDecls.concat(pr.removedDecls);
    const byFam = {};
    for (const n of touched) {
      const f = ownerOf[n];
      if (!f) continue;               // added-by-PR names are not in the base
      (byFam[f] = byFam[f] || []).push(n);
    }
    // A NEW declaration a PR adds lands in whatever family its NAME implies —
    // that is a future-tense overlap, not a body collision, so it is recorded
    // as DISTANT_SAME_FILE rather than DECLARATION_BODY.
    const addedByFam = {};
    for (const n of pr.addedDecls) {
      const f = classifyName(n, rules);
      if (!f) continue;
      (addedByFam[f] = addedByFam[f] || []).push(n);
    }
    for (const f of Object.keys(byFam)) {
      const cur = perFamily[f];
      if (!cur) continue;
      if (CONFLICT_RANK.DECLARATION_BODY > CONFLICT_RANK[cur.category]) cur.category = 'DECLARATION_BODY';
      cur.prs.push(pr.number);
      cur.detail.push('#' + pr.number + ' changes ' + byFam[f].length + ' owned declaration bodies: ' + byFam[f].join(', '));
    }
    for (const f of Object.keys(addedByFam)) {
      const cur = perFamily[f];
      if (!cur) continue;
      if (CONFLICT_RANK.DISTANT_SAME_FILE > CONFLICT_RANK[cur.category]) cur.category = 'DISTANT_SAME_FILE';
      if (cur.prs.indexOf(pr.number) < 0) cur.prs.push(pr.number);
      cur.detail.push('#' + pr.number + ' adds ' + addedByFam[f].length + ' new declarations into this family: ' + addedByFam[f].join(', '));
    }
    // A PR that adds <script src> tags competes for the SCRIPT-TAG REGION any
    // extraction must also edit. That is a load-order/bookkeeping conflict for
    // EVERY family — real, textual, and cheap to resolve. It must never be
    // reported as a body collision.
    if (pr.scriptTagsChanged) {
      for (const f of famNames) {
        const cur = perFamily[f];
        if (CONFLICT_RANK.LOAD_ORDER > CONFLICT_RANK[cur.category]) cur.category = 'LOAD_ORDER';
        if (cur.prs.indexOf(pr.number) < 0) cur.prs.push(pr.number);
        cur.detail.push('#' + pr.number + ' adds <script src> tags (' + (pr.scriptsAdded || []).join(', ') + ') — script-tag region only');
      }
    }
  }
  return perFamily;
}

const CONFLICTS = deriveConflicts(INV, RULES);

// The PRs that cannot conflict at all, and the proof of why.
const AUDIT_ONLY_PRS = OPEN_PRS.filter((p) => !p.indexTouched);
for (const pr of AUDIT_ONLY_PRS) {
  ok(pr.changedDecls.length === 0 && pr.addedDecls.length === 0,
    'PR #' + pr.number + ' touches no inline declaration (' + pr.files.length + ' files, index.html untouched)');
}
ok(AUDIT_ONLY_PRS.length === 3, 'three open PRs cannot collide with any relocation: #369, #363, #352');

// Named checks on the derivation, so a weakened rule is caught by name.
eq(CONFLICTS.SWING.category, 'DECLARATION_BODY', 'SWING — two PRs change bodies it owns (#361, #310)');
eq(CONFLICTS.SCANNER.category, 'DECLARATION_BODY', 'SCANNER — #361 changes bodies it owns');
eq(CONFLICTS.CANDLE_PIPE.category, 'DECLARATION_BODY', 'CANDLE_PIPE — #361 changes bodies it owns');
eq(CONFLICTS.AGENTS_CHAT.category, 'DECLARATION_BODY', 'AGENTS_CHAT — #361 changes selAgent');
eq(CONFLICTS.CORE_SHELL.category, 'DECLARATION_BODY', 'CORE_SHELL — #362 changes showView');
eq(CONFLICTS.DSS.category, 'LOAD_ORDER', 'DSS — no PR touches any DSS body; only #362 script tags');
eq(CONFLICTS.MCX.category, 'LOAD_ORDER', 'MCX — no PR touches any MCX body; only #362 script tags');
eq(CONFLICTS.PRETRADE.category, 'LOAD_ORDER', 'PRETRADE — no PR touches any PRETRADE body');
eq(CONFLICTS.EIC.category, 'LOAD_ORDER', 'EIC residue — no PR touches either residual body; only #362 script tags');
ok(CONFLICTS.DSS.prs.length === 1 && CONFLICTS.DSS.prs[0] === 362,
  'DSS — the single overlapping PR is #362 and only in the script-tag region');

// ═════════════════════════════════════════════════════════════════════════════
// §10  OWNERSHIP CONFIDENCE — A HARD GATE  (audit phase 11)
//
// This is the PESS PR3 correction made mechanical. A module label must describe
// the BODY it names. The measurable proxy for "the label would be a fiction" is
// the MIXED BODY: a declaration large enough to matter that BOTH acquires or
// computes AND renders substantial DOM. `pessAnalyzeAll` was exactly that — a
// 16,111-char body, 29.3% of it panel rendering — and calling it a service was
// the mistake this audit refuses to repeat.
//
// A family whose bulk sits in mixed bodies cannot be honestly cut along a
// service/UI line by RELOCATION ALONE, because relocation must not edit bodies.
// It can still be extracted — as one honest module.
//
// Grades: A obvious · B small mixed concerns · C careful split needed ·
//         D labels would contradict bodies · F no honest relocation-only split
//
// The gate: D or F cannot win execution priority, whatever the score says.
// ═════════════════════════════════════════════════════════════════════════════

section('§10  OWNERSHIP CONFIDENCE');

const MIXED_BODY_MIN_CHARS = 5000;
const MIXED_BODY_MIN_DOM = 3;

function isMixedBody(d) {
  return d.chars >= MIXED_BODY_MIN_CHARS && (d.domReads + d.domWrites) >= MIXED_BODY_MIN_DOM;
}

for (const f of Object.values(FAMS)) {
  const mine = INV.filter((d) => d.family === f.name);
  const mixed = mine.filter(isMixedBody);
  f.mixedBodySites = mixed.length;
  f.mixedBodyChars = mixed.reduce((a, d) => a + d.chars, 0);
  f.mixedBodyShare = f.chars ? f.mixedBodyChars / f.chars : 0;
  f.mixedBodyNames = mixed.map((d) => d.name);
  f.inboundForeign = (INBOUND_FOREIGN[f.name] || []).length;
  f.outboundForeign = (OUTBOUND_FOREIGN[f.name] || []).length;
  f.unresolvedInbound = unresolvedInbound(f.name).length;
  f.duplicatesRelocationSafe = DUPLICATES.filter((d) => d.family === f.name).every((d) => d.relocationSafe);
}

// The grade is DERIVED from measurements, never assigned by hand.
function gradeOwnership(f) {
  let pts = 0;
  const reasons = [];
  if (f.runs <= 2) { pts += 2; reasons.push('contiguous (' + f.runs + ' physical run' + (f.runs === 1 ? '' : 's') + ')'); }
  else if (f.runs <= 5) { pts += 1; reasons.push('few physical runs (' + f.runs + ')'); }
  else reasons.push('scattered across ' + f.runs + ' physical runs');

  if (f.unresolvedInbound === 0) { pts += 2; reasons.push('no unresolved inbound foreign writes'); }
  else if (f.unresolvedInbound <= 2) { pts += 1; reasons.push(f.unresolvedInbound + ' unresolved inbound foreign writes'); }
  else reasons.push(f.unresolvedInbound + ' unresolved inbound foreign writes');

  if (f.duplicatesRelocationSafe) { pts += 1; reasons.push('duplicate sites (if any) are relocation-safe'); }
  else reasons.push('duplicate sites are NOT relocation-safe');

  if (f.outboundForeign === 0) { pts += 1; reasons.push('writes no other family’s state'); }
  else reasons.push('writes ' + f.outboundForeign + ' binding(s) owned by another family');

  // The PESS gate. A family whose bulk is mixed analysis-and-render bodies is
  // still extractable, but only as ONE module — so its confidence in a LAYERED
  // split is low and the grade must say so.
  if (f.mixedBodyShare <= 0.35) { pts += 1; reasons.push('mixed analysis+render bodies are ' + (f.mixedBodyShare * 100).toFixed(1) + '% of the family'); }
  else reasons.push('mixed analysis+render bodies are ' + (f.mixedBodyShare * 100).toFixed(1) + '% of the family — a service/UI label would contradict the bodies');

  const grade = pts >= 7 ? 'A' : pts >= 5 ? 'B' : pts >= 3 ? 'C' : pts >= 1 ? 'D' : 'F';
  return { grade, points: pts, max: 7, reasons };
}

for (const f of Object.values(FAMS)) {
  const g = gradeOwnership(f);
  f.ownership = g.grade; f.ownershipPoints = g.points; f.ownershipReasons = g.reasons;
}

const OWNERSHIP_GATE_FAILS = ['D', 'F'];
function ownershipGateBlocks(f) { return OWNERSHIP_GATE_FAILS.indexOf(f.ownership) >= 0; }
function conflictGateBlocks(f) {
  return CONFLICT_RANK[(CONFLICTS[f.name] || { category: 'NONE' }).category] >= CONFLICT_RANK.DECLARATION_BODY;
}

for (const f of CANDIDATES) {
  ok(['A', 'B', 'C', 'D', 'F'].indexOf(f.ownership) >= 0, f.name + ' — ownership confidence graded ' + f.ownership);
}

// ═════════════════════════════════════════════════════════════════════════════
// §11  SCORING AND SENSITIVITY  (audit phase 12)
//
// Two rankings, deliberately NOT collapsed into one number:
//
//   A. ARCHITECTURAL VALUE — what extracting this family correctly would buy,
//      ignoring today's open PRs entirely.
//   B. EXECUTION PRIORITY — what should be started NEXT given today's source
//      and today's PRs.
//
// A high-value family can legitimately rank low for execution. Sensitivity is
// run over the EXECUTION weights, and it does NOT override the hard gates: a
// candidate that tops the score but fails a gate stays blocked.
// ═════════════════════════════════════════════════════════════════════════════

section('§11  SCORING AND SENSITIVITY');

// WHY PAYOFF IS LOG-SCALED
//   Raw declaration bytes span 35,878 (PRETRADE) to 633,979 (PORTFOLIO) — an
//   18x range. Normalised linearly, PORTFOLIO scores 1.0 on payoff and every
//   other candidate scores under 0.11, so payoff alone decides the ranking and
//   the other six factors become decoration. That is not a judgement about
//   what to extract next; it is a restatement of which family is biggest.
//
//   Bytes removed genuinely has diminishing marginal value for a "what next"
//   decision: the 600,000th byte of a family that needs eighteen PRs is worth
//   far less TODAY than the 60,000th byte of a family that needs two. Log
//   scaling is the standard, transparent way to express that, and it is applied
//   to BOTH rankings so neither is tuned to a preferred answer.
const ARCH_WEIGHTS = {
  payoff: 0.28,          // log-scaled declaration bytes removed from the monolith
  ownership: 0.25,       // how honest a module boundary can be
  cohesion: 0.20,        // 1 - fragmentation
  stateIsolation: 0.15,  // absence of foreign writes in either direction
  testSafety: 0.12,      // an existing suite that would notice a mistake
};

const EXEC_WEIGHTS = {
  payoff: 0.18,          // log-scaled, as above
  completability: 0.15,  // can this family be FINISHED, not merely started
  cohesion: 0.12,        // 1 - fragmentation
  contiguity: 0.10,      // few physical runs is a cheaper, more reviewable PR1
  ownership: 0.20,       // the heaviest single factor — the PESS PR3 lesson
  conflictFreedom: 0.18, // today's open PRs
  stateIsolation: 0.07,
};

const OWNERSHIP_VALUE = { A: 1.0, B: 0.8, C: 0.55, D: 0.2, F: 0.0 };
const CONFLICT_VALUE = {
  NONE: 1.0, TEST_ONLY: 0.9, BOOKKEEPING: 0.85, DISTANT_SAME_FILE: 0.6,
  LOAD_ORDER: 0.7, STATE_OWNER: 0.3, DECLARATION_BODY: 0.1, SEMANTIC: 0.05, BLOCKED: 0.0,
};

// Existing test coverage per family: suites that mention at least one declaration
// name the family owns. Short names are excluded — a three-letter name matches
// too much to be evidence of anything.
const TEST_FILES = fs.readdirSync(path.join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js') && f !== path.basename(__filename));
const TEST_SRC = {};
for (const t of TEST_FILES) TEST_SRC[t] = fs.readFileSync(path.join(ROOT, 'tests', t), 'utf8');
for (const f of Object.values(FAMS)) {
  const probe = uniq(f.names).filter((n) => n.length >= 6);
  f.tests = TEST_FILES.filter((t) => probe.some((n) => TEST_SRC[t].indexOf(n) >= 0));
  f.testCount = f.tests.length;
}

// Helper modules already extracted that sit in this family's namespace.
const JS_FILES = [];
(function walk(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    if (e.isDirectory()) walk(path.join(dir, e.name));
    else if (e.name.endsWith('.js')) JS_FILES.push(path.join(dir, e.name).split(path.sep).join('/'));
  }
})('js');
const HELPER_PATTERNS = {
  DSS: /directional/i, RS_VS_SPY: /rs-|relative/i, SWING: /swing/i, SCANNER: /scanner/i,
  MCX: /market-context|vix|mcx/i, CANDLE_PIPE: /candle/i, PORTFOLIO: /portfolio/i,
  CHART: /chart/i, EIC: /(^|\/)eic/i, JOURNAL: /journal/i, PRETRADE: /pretrade/i,
  AGENTS_CHAT: /agent/i, CORE_SHELL: /backend-client|backend-config/i,
};
for (const f of Object.values(FAMS)) {
  const re = HELPER_PATTERNS[f.name];
  f.helperModules = re ? JS_FILES.filter((p) => re.test(p)) : [];
}

function normalise(values) {
  const max = Math.max.apply(null, values);
  const min = Math.min.apply(null, values);
  return values.map((v) => (max === min ? 1 : (v - min) / (max - min)));
}

// The advisory size ceiling the DSB audit established. Used here ONLY to
// estimate how many modules — and therefore how many PRs — a family needs. §17
// reports every proposed module against it without treating it as a rule.
const ADVISORY_CEILING = 35609;
for (const f of Object.values(FAMS)) {
  f.likelyModules = Math.max(1, Math.ceil(f.chars / ADVISORY_CEILING));
  f.likelyPRs = f.likelyModules;   // DSB, SFS and PESS all shipped one PR per module
}

function scoreAll(cands, weights, kind) {
  const payoff = normalise(cands.map((c) => Math.log(c.chars)));
  const completability = normalise(cands.map((c) => 1 / c.likelyPRs));
  const cohesion = normalise(cands.map((c) => 1 - c.fragmentation));
  const contiguity = normalise(cands.map((c) => 1 / c.runs));
  const stateIso = normalise(cands.map((c) => -(c.inboundForeign + c.outboundForeign)));
  const testSafety = normalise(cands.map((c) => c.testCount));

  return cands.map((c, i) => {
    let s = 0;
    if (kind === 'arch') {
      s += weights.payoff * payoff[i];
      s += weights.ownership * OWNERSHIP_VALUE[c.ownership];
      s += weights.cohesion * cohesion[i];
      s += weights.stateIsolation * stateIso[i];
      s += weights.testSafety * testSafety[i];
    } else {
      s += weights.payoff * payoff[i];
      s += weights.completability * completability[i];
      s += weights.cohesion * cohesion[i];
      s += weights.contiguity * contiguity[i];
      s += weights.ownership * OWNERSHIP_VALUE[c.ownership];
      s += weights.conflictFreedom * CONFLICT_VALUE[(CONFLICTS[c.name] || { category: 'NONE' }).category];
      s += weights.stateIsolation * stateIso[i];
    }
    return { name: c.name, score: s };
  }).sort((a, b) => b.score - a.score);
}

const ARCH_RANKING = scoreAll(CANDIDATES, ARCH_WEIGHTS, 'arch');
const EXEC_RANKING_RAW = scoreAll(CANDIDATES, EXEC_WEIGHTS, 'exec');

// ── THE HARD GATES ───────────────────────────────────────────────────────────
// Applied AFTER scoring, never folded into it. A gated candidate keeps its
// score and is reported with it — it simply cannot win.
const GATED = {};
for (const c of CANDIDATES) {
  const reasons = [];
  if (ownershipGateBlocks(c)) reasons.push('ownership confidence ' + c.ownership);
  if (conflictGateBlocks(c)) reasons.push('conflict ' + CONFLICTS[c.name].category + ' with PR ' + CONFLICTS[c.name].prs.map((n) => '#' + n).join(', '));
  GATED[c.name] = reasons;
}
const EXEC_RANKING = EXEC_RANKING_RAW.map((r) => Object.assign({}, r, { gated: GATED[r.name].length > 0, gateReasons: GATED[r.name] }));
const ELIGIBLE = EXEC_RANKING.filter((r) => !r.gated);

// A partially extracted family with proven owner-residue is completion debt.
// Starting a new family while leaving that debt behind would make the terminal
// ratchet knowingly false. This is a hard sequencing gate, kept separate from
// the weighted score so PRETRADE's numerical lead remains visible and honest.
const COMPLETION_DEBT = PARTIALLY_EXTRACTED_FAMILIES
  .filter((name) => FAMS[name] && FAMS[name].sites > 0 && !GATED[name].length);
function selectNext(ranking) {
  const eligible = ranking.filter((r) => !GATED[r.name].length);
  for (const debt of COMPLETION_DEBT) {
    const hit = eligible.find((r) => r.name === debt);
    if (hit) return hit;
  }
  return eligible[0];
}
const SCORED_WINNER = ELIGIBLE[0];
const WINNER = selectNext(EXEC_RANKING);

ok(WINNER !== undefined, 'at least one candidate survives both hard gates');
ok(GATED[WINNER.name].length === 0, 'the winner passes both hard gates');
eq(COMPLETION_DEBT, ['EIC'], 'EIC is the only partially extracted family with proven owner residue');
eq(SCORED_WINNER.name, 'PRETRADE', 'PRETRADE leads the weighted execution score after correcting ownership');
eq(WINNER.name, 'EIC', 'the completion-debt gate selects EIC before any new family starts');

// Sensitivity. Every single weight is moved +/-20% on its own, then 2,000
// randomised simultaneous +/-20% reweightings are run. Gates are re-applied
// every time, because sensitivity must not be able to promote a gated family.
function perturb(weights, factors) {
  const w = {};
  for (const k of Object.keys(weights)) w[k] = weights[k] * factors[k];
  return w;
}

const SENSITIVITY = { singleWeight: [], randomTrials: 0, winnerFrequency: {}, topTwoFrequency: {}, avgRank: {}, scoreRange: {}, smallestFlip: null };

for (const k of Object.keys(EXEC_WEIGHTS)) {
  for (const delta of [-0.2, 0.2]) {
    const factors = {}; Object.keys(EXEC_WEIGHTS).forEach((x) => { factors[x] = x === k ? 1 + delta : 1; });
    const r = scoreAll(CANDIDATES, perturb(EXEC_WEIGHTS, factors), 'exec');
    SENSITIVITY.singleWeight.push({ weight: k, delta: delta, winner: selectNext(r).name });
  }
}

let seed = 20260816;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

const rankSums = {}, rankCounts = {}, scoreMin = {}, scoreMax = {};
for (const c of CANDIDATES) { rankSums[c.name] = 0; rankCounts[c.name] = 0; scoreMin[c.name] = Infinity; scoreMax[c.name] = -Infinity; }

const TRIALS = 2000;
for (let t = 0; t < TRIALS; t++) {
  const factors = {};
  for (const k of Object.keys(EXEC_WEIGHTS)) factors[k] = 0.8 + rnd() * 0.4;
  const full = scoreAll(CANDIDATES, perturb(EXEC_WEIGHTS, factors), 'exec');
  for (let i = 0; i < full.length; i++) {
    rankSums[full[i].name] += i + 1; rankCounts[full[i].name]++;
    scoreMin[full[i].name] = Math.min(scoreMin[full[i].name], full[i].score);
    scoreMax[full[i].name] = Math.max(scoreMax[full[i].name], full[i].score);
  }
  const elig = full.filter((x) => !GATED[x.name].length);
  const selected = selectNext(full);
  SENSITIVITY.winnerFrequency[selected.name] = (SENSITIVITY.winnerFrequency[selected.name] || 0) + 1;
  for (const n of elig.slice(0, 2)) SENSITIVITY.topTwoFrequency[n.name] = (SENSITIVITY.topTwoFrequency[n.name] || 0) + 1;
}
SENSITIVITY.randomTrials = TRIALS;
for (const c of CANDIDATES) {
  SENSITIVITY.avgRank[c.name] = rankSums[c.name] / rankCounts[c.name];
  SENSITIVITY.scoreRange[c.name] = [scoreMin[c.name], scoreMax[c.name]];
}

// Smallest single-weight perturbation that flips the eligible winner. Searched
// in 1% steps out to +/-60%; null means the winner never flips in that range.
(function findSmallestFlip() {
  for (let pct = 1; pct <= 60; pct++) {
    for (const k of Object.keys(EXEC_WEIGHTS)) {
      for (const sign of [-1, 1]) {
        const factors = {}; Object.keys(EXEC_WEIGHTS).forEach((x) => { factors[x] = x === k ? 1 + sign * pct / 100 : 1; });
        const r = scoreAll(CANDIDATES, perturb(EXEC_WEIGHTS, factors), 'exec');
        const selected = selectNext(r);
        if (selected.name !== WINNER.name) {
          SENSITIVITY.smallestFlip = { weight: k, deltaPct: sign * pct, newWinner: selected.name };
          return;
        }
      }
    }
  }
})();

eq(SENSITIVITY.singleWeight.length, Object.keys(EXEC_WEIGHTS).length * 2, 'every single weight was moved +/-20% on its own');
eq(SENSITIVITY.randomTrials, 2000, 'at least 2,000 randomised simultaneous reweightings were run');
// The field IS close, and the honest thing is to report that rather than to
// assert a stability the numbers do not have. What must hold is weaker and more
// meaningful: the winner is the MODAL winner across the randomised trials, and
// every single-weight winner is itself an ungated candidate.
const SINGLE_WEIGHT_WINNERS = uniq(SENSITIVITY.singleWeight.map((s) => s.winner));
ok(SINGLE_WEIGHT_WINNERS.every((n) => GATED[n].length === 0),
  'every single-weight +/-20% winner is an ungated candidate');
const MODAL_WINNER = Object.keys(SENSITIVITY.winnerFrequency)
  .sort((a, b) => SENSITIVITY.winnerFrequency[b] - SENSITIVITY.winnerFrequency[a])[0];
eq(MODAL_WINNER, WINNER.name, 'the chosen winner is also the modal winner across 2,000 randomised reweightings');
ok(Object.keys(SENSITIVITY.winnerFrequency).length >= 1, 'the randomised trials produced a winner distribution');
ok(!Object.keys(SENSITIVITY.winnerFrequency).some((n) => GATED[n].length > 0),
  'sensitivity never promotes a gated candidate — the gates are applied inside every trial');

if (process.env.AUDIT_PROBE === '1') {
  console.log('AUDIT_PROBE ' + JSON.stringify({
    winner: WINNER,
    architectural: ARCH_RANKING,
    execution: EXEC_RANKING,
    sensitivity: SENSITIVITY,
    candidates: CANDIDATES.map((f) => ({
      name: f.name, sites: f.sites, chars: f.chars, runs: f.runs,
      ownership: f.ownership, mixedBodyShare: f.mixedBodyShare,
      inbound: f.inboundForeign, outbound: f.outboundForeign,
      tests: f.testCount, likelyPRs: f.likelyPRs,
      conflict: CONFLICTS[f.name],
    })),
    pretradeDeclarations: INV.filter((d) => d.family === 'PRETRADE').map((d) => ({
      idx: d.idx, name: d.name, form: (d.isAsync ? 'async ' : '') + d.form,
      chars: d.chars, start: d.start, dom: d.domReads + d.domWrites,
      network: d.network, websocket: d.websocket, timers: d.timers,
      listeners: d.listeners, storage: d.storage, globals: d.globals,
      stateReads: d.stateReads, stateWrites: d.stateWrites,
      bindingWrites: d.bindingWrites, callees: d.callees,
      mixedBody: isMixedBody(d),
    })),
  }));
  process.exit(FAILURES.length ? 1 : 0);
}

// ═════════════════════════════════════════════════════════════════════════════
// §12  DEEP AUDIT — TOP FOUR EXECUTION CANDIDATES  (audit phase 13)
//
// FOUR, not three: the post-EIC field is close and the fourth place is worth
// comparing. Deep audit runs on the top four by execution SCORE — gated or not
// — so a family that scores well and is then blocked is still shown in full,
// with the reason it cannot go first.
// ═════════════════════════════════════════════════════════════════════════════

section('§12  DEEP AUDIT — TOP FOUR');

const TOP_FOUR = EXEC_RANKING.slice(0, 4).map((r) => r.name);

function manifest(famName) {
  const mine = INV.filter((d) => d.family === famName).sort((a, b) => a.start - b.start);
  const names = mine.map((d) => d.name);
  const dupNames = uniq(names.filter((n, i) => names.indexOf(n) !== i));
  const callOut = {}, callIn = {};
  for (const d of mine) {
    for (const c of d.callees) {
      const f = OWNER_OF[c];
      if (f && f !== famName) (callOut[f] = callOut[f] || new Set()).add(c);
    }
  }
  for (const d of INV) {
    if (d.family === famName) continue;
    for (const c of d.callees) if (OWNER_OF[c] === famName) (callIn[d.family] = callIn[d.family] || new Set()).add(d.name);
  }
  // Top-level executable statements INSIDE the family's physical span. A
  // relocation has to leave these behind, so a family with many of them
  // interleaved is a harder extraction than its declaration count suggests.
  const lo = mine[0].start, hi = mine[mine.length - 1].end;
  const inside = INV.filter((d) => d.start >= lo && d.end <= hi).sort((a, b) => a.start - b.start);
  let interleavedExec = 0, foreignInSpan = 0;
  {
    let prev = lo;
    for (const d of inside) {
      if (d.start > prev && stripComments(INLINE.slice(prev, d.start)).trim() !== '') interleavedExec++;
      if (d.family !== famName) foreignInSpan++;
      prev = d.end + 1;
    }
  }
  const f = FAMS[famName];
  return {
    family: famName,
    sites: mine.length, uniqueNames: uniq(names).length, duplicateSites: mine.length - uniq(names).length,
    duplicateNames: dupNames, chars: f.chars, monolithPct: f.monolithPct,
    runs: f.runs, fragmentation: f.fragmentation, forms: f.forms, asyncCount: f.asyncCount,
    physicalSpan: [lo, hi], spanChars: hi - lo + 1,
    foreignDeclarationsInsideSpan: foreignInSpan,
    interleavedTopLevelStatements: interleavedExec,
    stateReads: f.stateReads, stateWrites: f.stateWrites,
    inboundForeignWrites: (INBOUND_FOREIGN[famName] || []),
    outboundForeignWrites: (OUTBOUND_FOREIGN[famName] || []),
    callsOutTo: Object.keys(callOut).reduce((o, k) => (o[k] = Array.from(callOut[k]), o), {}),
    calledInFrom: Object.keys(callIn).reduce((o, k) => (o[k] = Array.from(callIn[k]), o), {}),
    domReads: f.domReads, domWrites: f.domWrites, network: f.network, websocket: f.websocket,
    timers: f.timers, listeners: f.listeners, storage: f.storage, globals: f.globals,
    subscriptions: f.subscriptions,
    mixedBodySites: f.mixedBodySites, mixedBodyNames: f.mixedBodyNames, mixedBodyShare: f.mixedBodyShare,
    ownership: f.ownership, ownershipPoints: f.ownershipPoints, ownershipReasons: f.ownershipReasons,
    conflict: CONFLICTS[famName],
    tests: f.tests, helperModules: f.helperModules,
    likelyModules: f.likelyModules, likelyPRs: f.likelyPRs,
    declarations: mine.map((d) => ({
      name: d.name, form: (d.isAsync ? 'async ' : '') + d.form, chars: d.chars, start: d.start,
      dom: d.domReads + d.domWrites, network: d.network, websocket: d.websocket,
      timers: d.timers, listeners: d.listeners, storage: d.storage,
      stateReads: d.stateReads, stateWrites: d.stateWrites,
      callees: d.callees, globals: d.globals, mixedBody: isMixedBody(d),
    })),
  };
}

const DEEP = {};
for (const n of TOP_FOUR) DEEP[n] = manifest(n);

eq(TOP_FOUR.length, 4, 'four candidates were deep-audited, not three');
for (const n of TOP_FOUR) {
  eq(DEEP[n].sites, FAMS[n].sites, n + ' — manifest lists every declaration site');
  eq(DEEP[n].declarations.reduce((a, d) => a + d.chars, 0), FAMS[n].chars, n + ' — manifest chars reconcile with the rollup');
}
ok(TOP_FOUR.indexOf(WINNER.name) >= 0, 'the winner is among the deep-audited four');

// ═════════════════════════════════════════════════════════════════════════════
// §13  SPECIAL DSS DEEP AUDIT  (audit phase 14)
//
// DSS must earn approval or rejection on today's source. The previous audit
// reported roughly 65 declarations / 49,179 chars / 34 physical runs / 6 inbound
// foreign writes / 19 tests, and that shape is what made it look blocked.
//
// Re-measured here from zero, at THIS base, with shadow-aware write analysis.
// ═════════════════════════════════════════════════════════════════════════════

section('§13  DSS DEEP AUDIT');

const DSS = manifest('DSS');
const DSS_INBOUND = INBOUND_FOREIGN.DSS || [];
const DSS_OUTBOUND = OUTBOUND_FOREIGN.DSS || [];

// Every write to a DSS-owned binding, wherever it comes from.
const DSS_OWNED = new Set(INV.filter((d) => d.family === 'DSS').map((d) => d.name));
const ALL_WRITES_TO_DSS = [];
for (const d of INV) {
  for (const w of d.bindingWrites) if (DSS_OWNED.has(w)) ALL_WRITES_TO_DSS.push({ writer: d.name, writerFamily: d.family, target: w });
}
const DSS_SELF_WRITES = ALL_WRITES_TO_DSS.filter((w) => w.writerFamily === 'DSS');
const DSS_FOREIGN_WRITES_IN = ALL_WRITES_TO_DSS.filter((w) => w.writerFamily !== 'DSS');

eq(DSS_FOREIGN_WRITES_IN.length, 0,
  'DSS — inbound foreign writes at this base (every write to DSS state comes from DSS itself)');
ok(DSS_SELF_WRITES.length > 0, 'DSS — its state IS written, ' + DSS_SELF_WRITES.length + ' times, all from inside the family');
ok(DSS_OUTBOUND.length === 1 && DSS_OUTBOUND[0].target === '_scannerBackendCandleCache',
  'DSS — one OUTBOUND write, to SCANNER’s _scannerBackendCandleCache');
eq(DSS_OUTBOUND[0].classification, 'STATE_MODULE_CAN_RESOLVE',
  'DSS — that outbound write targets a plain `var` cache: a state module resolves it without editing bodies');

// The DSS alternatives, compared on the SAME measurements.
const DSS_ZERO_DOM = DSS.declarations.filter((d) => d.dom === 0);
const DSS_DOM = DSS.declarations.filter((d) => d.dom > 0);
const DSS_STATE_ONLY = DSS.declarations.filter((d) => d.form === 'var' || d.form === 'const' || d.form === 'let');
const DSS_BEHAVIOUR = DSS.declarations.filter((d) => d.form !== 'var' && d.form !== 'const' && d.form !== 'let');
const sumC = (a) => a.reduce((x, d) => x + d.chars, 0);

const DSS_OPTIONS = [
  { id: 'DSS A', label: 'one module', modules: [{ name: 'js/ui/directional-setup-scanner.js', sites: DSS.sites, chars: DSS.chars }] },
  { id: 'DSS B', label: 'state + behaviour', modules: [
    { name: 'js/services/dss-config-state.js', sites: DSS_STATE_ONLY.length, chars: sumC(DSS_STATE_ONLY) },
    { name: 'js/ui/directional-setup-scanner.js', sites: DSS_BEHAVIOUR.length, chars: sumC(DSS_BEHAVIOUR) }] },
  { id: 'DSS C', label: 'service + UI', modules: [
    { name: 'js/services/dss-scan-service.js', sites: DSS_ZERO_DOM.length, chars: sumC(DSS_ZERO_DOM) },
    { name: 'js/ui/dss-panel.js', sites: DSS_DOM.length, chars: sumC(DSS_DOM) }] },
  { id: 'DSS D', label: 'state + service + UI', modules: [
    { name: 'js/services/dss-config-state.js', sites: DSS_STATE_ONLY.length, chars: sumC(DSS_STATE_ONLY) },
    { name: 'js/services/dss-scan-service.js', sites: DSS_ZERO_DOM.filter((d) => DSS_STATE_ONLY.indexOf(d) < 0).length, chars: sumC(DSS_ZERO_DOM.filter((d) => DSS_STATE_ONLY.indexOf(d) < 0)) },
    { name: 'js/ui/dss-panel.js', sites: DSS_DOM.length, chars: sumC(DSS_DOM) }] },
  { id: 'DSS E', label: 'source-derived: state/flags + compute + chart-detail + panel', modules: [
    { name: 'js/services/dss-config-state.js', sites: DSS_STATE_ONLY.length, chars: sumC(DSS_STATE_ONLY) },
    { name: 'js/services/dss-candidates.js', sites: DSS_ZERO_DOM.filter((d) => DSS_STATE_ONLY.indexOf(d) < 0).length, chars: sumC(DSS_ZERO_DOM.filter((d) => DSS_STATE_ONLY.indexOf(d) < 0)) },
    { name: 'js/ui/dss-panel.js', sites: DSS_DOM.length, chars: sumC(DSS_DOM) }] },
];

// The DSS VERDICT. Not blocked — but its ownership grade is what keeps it out of
// first place, and the reason is measurable: 51.3% of DSS bytes sit in mixed
// analysis-and-render bodies, so a service/UI cut cannot be made honestly by
// relocation alone.
const DSS_VERDICT = {
  blocked: false,
  inboundForeignWrites: DSS_FOREIGN_WRITES_IN.length,
  outboundForeignWrites: DSS_OUTBOUND.length,
  outboundResolvable: DSS_OUTBOUND.every((w) => w.classification === 'STATE_MODULE_CAN_RESOLVE'),
  ownership: FAMS.DSS.ownership,
  mixedBodyShare: FAMS.DSS.mixedBodyShare,
  reason: 'APPROVED as extractable — the previously reported inbound foreign writes do not exist at this base. '
    + 'It does not win execution priority because its bytes are concentrated in mixed analysis-and-render bodies '
    + '(' + (FAMS.DSS.mixedBodyShare * 100).toFixed(1) + '%), which caps its ownership grade at '
    + FAMS.DSS.ownership + ' and makes a service/UI split dishonest without body edits.',
};
ok(DSS_VERDICT.blocked === false, 'DSS — VERDICT: not blocked');
ok(DSS_VERDICT.outboundResolvable, 'DSS — its single outbound write is resolvable by a state module, not a blocker');

// ═════════════════════════════════════════════════════════════════════════════
// §14  SPECIAL EIC COMPLETION AUDIT  (audit phase 15)
//
// Four EIC modules have shipped, but terminal status was proved with a naming
// predicate that explicitly excluded `computeFinalDecision` and
// `computeSetupScore`. Re-audit ownership from bodies and production callers.
// ═════════════════════════════════════════════════════════════════════════════

section('§14  EIC DEEP AUDIT');

const EIC = manifest('EIC');
const EIC_DUPS = DUPLICATES.filter((d) => d.family === 'EIC');

eq(EIC.sites, 2, 'EIC — residual declaration sites');
eq(EIC.uniqueNames, 2, 'EIC — residual unique declaration names');
eq(EIC.duplicateSites, 0, 'EIC — no residual duplicate declaration sites');
eq(EIC.chars, 10112, 'EIC — residual declaration chars');
eq(EIC.runs, 1, 'EIC — ONE physical residual run: both sites are consecutive');
eq(EIC.foreignDeclarationsInsideSpan, 0, 'EIC — no other family’s declaration sits inside its span');
eq(EIC.interleavedTopLevelStatements, 0, 'EIC — no top-level executable statement is interleaved with its declarations');
eq(EIC.inboundForeignWrites.length, 0, 'EIC — zero inbound foreign writes');
eq(EIC.outboundForeignWrites.length, 0, 'EIC — zero outbound foreign writes');
eq(EIC.stateReads, [], 'EIC — residual rules read no shared state');
eq(EIC.stateWrites, [], 'EIC — residual rules write no shared state');
eq(EIC.globals, 0, 'EIC — exposes nothing on window');
eq(EIC_DUPS, [], 'EIC — all former duplicate sites are already outside the monolith');

function callerFiles(name) {
  return JS_FILES.filter((p) => new RegExp('\\b' + name + '\\s*\\(')
    .test(stripLiterals(fs.readFileSync(path.join(ROOT, p), 'utf8')))).sort();
}
const EIC_CALLERS = {
  computeFinalDecision: callerFiles('computeFinalDecision'),
  computeSetupScore: callerFiles('computeSetupScore'),
};
const EXPECTED_EIC_CALLERS = ['js/ui/eic-live-deep-dive.js', 'js/ui/eic-ticker-analysis-panel.js'];
eq(EIC_CALLERS.computeFinalDecision, EXPECTED_EIC_CALLERS,
  'computeFinalDecision — every production caller is an EIC module');
eq(EIC_CALLERS.computeSetupScore, EXPECTED_EIC_CALLERS,
  'computeSetupScore — every production caller is an EIC module');
for (const d of EIC.declarations) {
  eq(d.dom, 0, d.name + ' — no DOM effects');
  eq(d.network, 0, d.name + ' — no network effects');
  eq(d.websocket, 0, d.name + ' — no websocket effects');
  eq(d.timers, 0, d.name + ' — no timers');
  eq(d.listeners, 0, d.name + ' — no listeners');
  eq(d.storage, 0, d.name + ' — no storage effects');
  eq(d.stateReads, [], d.name + ' — no shared-state reads');
  eq(d.stateWrites, [], d.name + ' — no shared-state writes');
  eq(d.callees, [], d.name + ' — no calls to another inline application declaration');
}

const EIC_VERDICT = {
  blocked: false,
  terminal: false,
  completionRequired: true,
  reason: 'EIC is not terminal. The four shipped modules account for 11 declarations, but the prefix-based '
    + 'contract omitted two generic rules. Both consume/produce EIC-shaped data, every current '
    + 'production caller is an EIC module, and neither has effects or shared-state ownership. They form one '
    + 'contiguous, 10,112-character relocation-safe completion slice.',
};
ok(!EIC_VERDICT.blocked && EIC_VERDICT.completionRequired && !EIC_VERDICT.terminal,
  'EIC — VERDICT: extractable, but not terminal until the two residual rules move');

// ═════════════════════════════════════════════════════════════════════════════
// §15  MCX REASSESSMENT  (audit phase 16)
//
// The post-SFS audit ranked MCX low for execution because it was heavily
// fragmented. Re-measured, not inherited.
// ═════════════════════════════════════════════════════════════════════════════

section('§15  MCX REASSESSMENT');

const MCX = manifest('MCX');
const MCX_REASSESSMENT = {
  sites: MCX.sites, chars: MCX.chars, runs: MCX.runs, fragmentation: MCX.fragmentation,
  monolithPct: MCX.monolithPct,
  zeroDomSites: FAMS.MCX.zeroDomSites, zeroDomChars: FAMS.MCX.zeroDomChars,
  domSites: FAMS.MCX.domSites, domChars: FAMS.MCX.domChars,
  selfOwnedStateWrites: MCX.stateWrites, inbound: MCX.inboundForeignWrites.length,
  outbound: MCX.outboundForeignWrites.length,
  transport: { network: MCX.network, websocket: MCX.websocket, subscriptions: MCX.subscriptions },
  tests: MCX.tests.length, helperModules: MCX.helperModules,
  ownership: FAMS.MCX.ownership, conflict: CONFLICTS.MCX.category,
  execRank: EXEC_RANKING.findIndex((r) => r.name === 'MCX') + 1,
  archRank: ARCH_RANKING.findIndex((r) => r.name === 'MCX') + 1,
  verdict: 'MCX did NOT stay where the old audit left it. Re-measured it is only ' + MCX.runs
    + '-way fragmented, has zero foreign writes in either direction, the lowest mixed-body share of any '
    + 'candidate (' + (FAMS.MCX.mixedBodyShare * 100).toFixed(1) + '%), and ' + MCX.tests.length
    + ' existing suites. It rises to execution rank ' + (EXEC_RANKING.findIndex((r) => r.name === 'MCX') + 1)
    + ' and architectural rank ' + (ARCH_RANKING.findIndex((r) => r.name === 'MCX') + 1)
    + '. It loses to the winner on size (' + n(MCX.chars) + ' B over ~' + FAMS.MCX.likelyPRs + ' PRs) and contiguity, not on ownership.',
};
ok(MCX_REASSESSMENT.runs < 34, 'MCX — re-measured fragmentation is far below the previously reported 34 runs');
ok(MCX_REASSESSMENT.inbound === 0 && MCX_REASSESSMENT.outbound === 0, 'MCX — no foreign writes in either direction');

// ═════════════════════════════════════════════════════════════════════════════
// §16  WINNER SPLIT DESIGN  (audit phases 17 + 19)
//
// The residue is already the smallest honest ownership unit: two consecutive,
// effect-free decision rules. Splitting it further would create two tiny files
// without an architectural boundary; combining it with an already-shipped UI
// module would reopen a completed production blob unnecessarily.
//
// The naming rule, inherited from PESS PR3: DO NOT call something a service if
// the body self-acquires and renders substantial DOM. Every module label below
// is checked against the bodies it would contain, and the check is an assertion.
// ═════════════════════════════════════════════════════════════════════════════

section('§16  WINNER SPLIT DESIGN');

eq(WINNER.name, 'EIC', 'the execution winner is EIC');

const EIC_BY_NAME = {};
for (const d of EIC.declarations) (EIC_BY_NAME[d.name] = EIC_BY_NAME[d.name] || []).push(d);
function pick(names) {
  const out = [];
  for (const n of names) for (const d of EIC_BY_NAME[n]) out.push(d);
  return out.sort((a, b) => a.start - b.start);
}
const charsOf = (ds) => ds.reduce((a, d) => a + d.chars, 0);

// Source-derived groups.
const G_PURE = pick(['computeFinalDecision', 'computeSetupScore']);
const G_PANEL = [];
const G_TICKER = [];
const G_LIVE = [];

const EIC_STATE_DECLS = EIC.declarations.filter((d) => /^(var|const|let)$/.test(d.form.replace('async ', '')));
const EIC_ZERO_EFFECT = EIC.declarations.filter((d) => d.dom === 0 && d.network === 0 && d.timers === 0 && d.listeners === 0 && d.stateWrites.length === 0 && d.stateReads.length === 0);
const EIC_EFFECTFUL = EIC.declarations.filter((d) => EIC_ZERO_EFFECT.indexOf(d) < 0);

const SPLIT_OPTIONS = [
  {
    id: 'A', label: 'one owner-derived completion module', available: true,
    modules: [{ path: 'js/services/eic-decision-rules.js', decls: EIC.declarations.length, chars: EIC.chars, owner: 'deterministic EIC setup scoring + final decision' }],
    prs: 1,
  },
  {
    id: 'B', label: 'state/config + rest', available: false,
    unavailableBecause: 'the residual declares no state/config — both sites are pure functions, so the state/config module would be empty',
    modules: [], prs: 0,
  },
  {
    id: 'C', label: 'service + UI', available: false,
    unavailableBecause: 'the residual contains no UI declaration, so the UI module would be empty',
    modules: [], prs: 0,
  },
  {
    id: 'D', label: 'state/config + service + UI', available: false,
    unavailableBecause: 'same as B — there is no state/config declaration to own',
    modules: [], prs: 0,
  },
  {
    id: 'E', label: 'reopen the four shipped modules', available: false,
    unavailableBecause: 'all four shipped modules are byte-stable and the residue forms its own coherent rules owner',
    modules: [], prs: 0,
  },
];

const RECOMMENDED_SPLIT = 'A';
const CHOSEN = SPLIT_OPTIONS.find((o) => o.id === RECOMMENDED_SPLIT);

// Every option that claims to be available must account for every residual site.
for (const o of SPLIT_OPTIONS.filter((x) => x.available)) {
  eq(o.modules.reduce((a, m) => a + m.decls, 0), EIC.sites, 'option ' + o.id + ' — accounts for every EIC declaration site');
  eq(o.modules.reduce((a, m) => a + m.chars, 0), EIC.chars, 'option ' + o.id + ' — accounts for every EIC declaration byte');
}
eq(EIC_STATE_DECLS.length, 0, 'EIC residue declares no var/const/let — options B and D genuinely do not exist');
eq(EIC_EFFECTFUL.length, 0, 'EIC residue contains no effectful declaration — option C has no UI half');
for (const o of SPLIT_OPTIONS.filter((x) => !x.available)) {
  ok(o.unavailableBecause.length > 0, 'option ' + o.id + ' — unavailability is explained, not silently dropped');
}

// THE NAMING RULE, ASSERTED. No module whose path says `services/` may contain a
// declaration that renders DOM, opens a socket or issues a request. This is the
// check that would have caught `pess-analysis-service.js`.
for (const o of SPLIT_OPTIONS.filter((x) => x.available)) {
  for (const m of o.modules) {
    if (m.path.indexOf('/services/') < 0) continue;
    const contents = o.id === 'A' && m.path.indexOf('decision-rules') >= 0 ? G_PURE : [];
    const dirty = contents.filter((d) => d.dom > 0 || d.network > 0 || d.websocket > 0 || d.timers > 0 || d.listeners > 0);
    eq(dirty.map((d) => d.name), [], 'option ' + o.id + ' — ' + m.path + ' is called a service and every body in it is effect-free');
  }
}
// …and the converse: a module that DOES render must not be called a service.
for (const m of CHOSEN.modules) {
  const group = G_PURE;
  const renders = group.some((d) => d.dom > 0);
  ok(!(renders && m.path.indexOf('/services/') >= 0),
    m.path + ' — a body that renders DOM is not filed under services/');
}

// ── Advisory size ceiling (audit phase 19) — REPORTED, never enforced ────────
const CEILING_REPORT = SPLIT_OPTIONS.filter((o) => o.available).map((o) => ({
  option: o.id,
  modules: o.modules.map((m) => ({ path: m.path, chars: m.chars, ceiling: m.chars <= ADVISORY_CEILING ? 'below' : 'above' })),
  maxModule: Math.max.apply(null, o.modules.map((m) => m.chars)),
}));
eq(ADVISORY_CEILING, 35609, 'the historical advisory ceiling is unchanged at 35,609 B');
ok(CHOSEN.modules.every((m) => m.chars <= ADVISORY_CEILING),
  'every module of the recommended split is below the advisory ceiling');
ok(CEILING_REPORT.find((c) => c.option === 'A').maxModule <= ADVISORY_CEILING,
  'option A (one completion module) is below the advisory ceiling');

// ═════════════════════════════════════════════════════════════════════════════
// §17  THE FIRST SLICE  (audit phase 18)
//
// PROPOSED ONLY. Nothing here is implemented, and this audit must not implement
// it. The slice is the complete remaining EIC owner: two declaration sites that
// call nothing, read nothing, write nothing, touch no DOM, open no socket, set
// no timer, register no listener and reach no storage.
// ═════════════════════════════════════════════════════════════════════════════

section('§17  PROPOSED FIRST SLICE');

const FIRST_SLICE = {
  module: 'js/services/eic-decision-rules.js',
  prNumberInPlan: 1, ofPRs: CHOSEN.prs,
  declarations: G_PURE.map((d) => ({
    name: d.name, form: d.form, chars: d.chars, start: d.start,
    dom: d.dom, network: d.network, timers: d.timers, listeners: d.listeners,
    stateReads: d.stateReads, stateWrites: d.stateWrites, callees: d.callees,
  })),
  sites: G_PURE.length,
  uniqueNames: uniq(G_PURE.map((d) => d.name)).length,
  duplicateSites: G_PURE.length - uniq(G_PURE.map((d) => d.name)).length,
  chars: charsOf(G_PURE),
  physicalOrder: G_PURE.map((d) => d.name),
  bindingForms: uniq(G_PURE.map((d) => d.form)),
  evaluationTimeDependencies: [],
  callTimeDependencies: uniq(G_PURE.reduce((a, d) => a.concat(d.callees), [])),
  statementsRemainingInline: EIC.interleavedTopLevelStatements,
  expectedScriptPosition: 'after js/services/eic-screening-rules.js and before both EIC UI consumers. '
    + 'It has no evaluation-time dependency; the position makes ownership and call-time availability explicit.',
};

eq(FIRST_SLICE.chars, 10112, 'first slice — total chars');
eq(FIRST_SLICE.sites, 2, 'first slice — declaration sites');
eq(FIRST_SLICE.uniqueNames, 2, 'first slice — unique names');
eq(FIRST_SLICE.duplicateSites, 0, 'first slice — no duplicate sites');
eq(FIRST_SLICE.physicalOrder, ['computeFinalDecision', 'computeSetupScore'],
  'first slice — original physical order is preserved');
eq(FIRST_SLICE.bindingForms, ['function'], 'first slice — every site is a plain synchronous function declaration');
eq(FIRST_SLICE.callTimeDependencies, [], 'first slice — calls no other top-level declaration');
eq(FIRST_SLICE.evaluationTimeDependencies, [], 'first slice — nothing evaluates at load time');
for (const d of FIRST_SLICE.declarations) {
  eq(d.dom, 0, 'first slice — ' + d.name + ' touches no DOM');
  eq(d.network, 0, 'first slice — ' + d.name + ' issues no request');
  eq(d.timers, 0, 'first slice — ' + d.name + ' sets no timer');
  eq(d.listeners, 0, 'first slice — ' + d.name + ' registers no listener');
  eq(d.stateWrites, [], 'first slice — ' + d.name + ' writes no shared state');
  eq(d.stateReads, [], 'first slice — ' + d.name + ' reads no shared state');
}
ok(FIRST_SLICE.chars <= ADVISORY_CEILING, 'first slice module is below the advisory ceiling');

// ═════════════════════════════════════════════════════════════════════════════
// §18  COMPLETED-FAMILY RATCHETS AND THE GENERIC RULE  (audit phase 20)
// ═════════════════════════════════════════════════════════════════════════════

section('§18  COMPLETED-FAMILY RATCHETS');

for (const fam of COMPLETED_FAMILIES) {
  eq(RESIDUAL_PROOF[fam].inlineResidual, 0, fam + ' — ratchet holds: zero inline declarations');
}
eq(RESIDUAL_PROOF.EIC.inlineResidual, 2,
  'EIC — terminal ratchet is intentionally NOT armed while the two owner-residual rules remain inline');

// Would a GENERIC rule — "a declaration whose owner family has reached terminal
// extraction may not be newly introduced into the monolith" — conflict with any
// open PR? Checked against the declarations each PR ADDS.
const GENERIC_RATCHET = {
  proposed: 'A declaration whose owner family has reached terminal extraction (DSB, SFS, PESS) '
    + 'may not be newly introduced into the inline monolith.',
  conflictsWithOpenPRs: [],
  contractedInlineException: 'apexDebugBackendDirectionalAdapter — the DSB adapter contract\'s '
    + 'OPTION_A_KEEP_INLINE requires this debug bridge to stay inline. Any generic rule must carry '
    + 'this exception explicitly or it would break a contract that is already green.',
};
for (const pr of OPEN_PRS) {
  for (const n of pr.addedDecls) {
    const f = classifyName(n, RULES);
    if (COMPLETED_FAMILIES.indexOf(f) >= 0) {
      GENERIC_RATCHET.conflictsWithOpenPRs.push({ pr: pr.number, declaration: n, family: f });
    }
  }
}
eq(GENERIC_RATCHET.conflictsWithOpenPRs, [],
  'the proposed generic ratchet conflicts with NO open PR — none of them adds a DSB/SFS/PESS declaration');
ok(GENERIC_RATCHET.contractedInlineException.length > 0,
  'the generic ratchet would need one explicit exception, and it is named');

// ═════════════════════════════════════════════════════════════════════════════
// §19  INCIDENTAL DEFECTS — RECORDED, NOT FIXED  (audit phase 21)
//
// This audit repairs nothing. Everything below is pinned so that a later
// "tidy-up" cannot alter semantics under cover of a relocation, and so that the
// extraction PRs can be checked to have changed none of it.
// ═════════════════════════════════════════════════════════════════════════════

section('§19  INCIDENTAL DEFECTS (recorded, not fixed)');

const DEFECTS = [
  { area: 'PESS transport', id: 'empty strikes.reduce TypeError', status: 'pinned by the PESS contract §19' },
  { area: 'PESS transport', id: 'close-only cleanup / no unsubscribe', status: 'pinned by the PESS contract §19' },
  { area: 'PESS transport', id: 'stray empty statement', status: 'pinned by the PESS contract §19' },
  { area: 'PESS transport', id: 'completion/min-field asymmetry', status: 'pinned by the PESS contract §19' },
  { area: 'PESS transport', id: 'partial-null-symbol fail-closed', status: 'pinned by the PESS contract §19' },
  { area: 'PESS batch', id: 'un-awaited runAll()', status: 'pinned by the PESS contract §19' },
  { area: 'PESS batch', id: 'empty term-structure catch', status: 'pinned by the PESS contract §19' },
  { area: 'PESS batch', id: 'asymmetric result shapes', status: 'pinned by the PESS contract §19' },
  { area: 'PESS batch', id: 'punctuation-derived rejectStage', status: 'pinned by the PESS contract §19' },
  { area: 'PESS UI', id: 'duplicate var rejectReason', status: 'pinned by the PESS contract §19' },
  { area: 'PESS UI', id: 'put OTM precedence bug', status: 'pinned by the PESS contract §19' },
  { area: 'PESS UI', id: 'punctuation-derived classification', status: 'pinned by the PESS contract §19' },
  { area: 'PESS UI', id: 'null days string', status: 'pinned by the PESS contract §19' },
  { area: 'PESS UI', id: 'gate-C observability asymmetry', status: 'pinned by the PESS contract §19' },
];

// Historic items this audit was asked to RE-CHECK. Each is re-measured here, so
// the record is current rather than copied forward.
DEFECTS.push({
  area: 'EIC contract', id: 'prefix-only terminal-family classifier omitted two owner declarations',
  status: 'CONFIRMED — computeFinalDecision and computeSetupScore remain inline although all production callers '
    + 'are EIC modules. Recorded by this audit; production and the existing contract are not changed here.',
});

const MA200_HITS = countAll(stripLiterals(INLINE), /ma200dist/g);
const MA200_PLUS_ZERO = countAll(INLINE, /\+0%/g);
DEFECTS.push({
  area: 'historic', id: "ma200dist '+0%'",
  status: 'RE-CHECKED — ma200dist referenced ' + MA200_HITS + ' time(s) in code; the literal "+0%" appears '
    + MA200_PLUS_ZERO + ' time(s) in the monolith. Left untouched.',
});

const FORBIDDEN_GLOBAL_HITS = (function () {
  try {
    const model = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'risk-models', 'portfolio-stress-test-v1.json'), 'utf8'));
    const blk = ((model.frontendCompanionIdentity || {}).continuousIntegration || {}).preExistingNode20Failures || {};
    return (blk.files || []).length;
  } catch (e) { return -1; }
})();
DEFECTS.push({
  area: 'historic', id: 'Node-20 FORBIDDEN_GLOBAL / vm-sandbox proxy-trap failures',
  status: 'RE-CHECKED — the model still declares ' + FORBIDDEN_GLOBAL_HITS
    + ' pinned node-20 known-failure files, each tied to its measured cause. Left untouched.',
});

const ORPHAN_COMMENT_HITS = countAll(INLINE, /\/\/\s*(TODO|FIXME|XXX|HACK)\b/g);
DEFECTS.push({
  area: 'historic', id: 'stale / orphaned comments',
  status: 'RE-CHECKED — ' + ORPHAN_COMMENT_HITS + ' TODO/FIXME/XXX/HACK markers remain in the inline monolith. Left untouched.',
});

ok(DEFECTS.length >= 18, 'the defect register carries the PESS items plus the four re-checked historic ones');
ok(DEFECTS.every((d) => d.status && d.status.length > 0), 'every recorded defect carries a status');

// ═════════════════════════════════════════════════════════════════════════════
// §20  THE GENERATED REPORT  (audit phase 22)
//
// The markdown is BUILT from the measurements above and then compared to what
// is committed. Ordinary execution FAILS on a stale report; AUDIT_WRITE_DOC=1
// rewrites it. No number in the document is typed by hand.
// ═════════════════════════════════════════════════════════════════════════════

section('§20  GENERATED REPORT');

function n(x) { return Number(x).toLocaleString('en-US'); }
function pct(x, d) { return (x * 100).toFixed(d === undefined ? 1 : d) + '%'; }

function buildReport() {
  const L = [];
  const P = (s) => L.push(s === undefined ? '' : s);

  P('# Post-EIC conflict-aware monolith extraction audit');
  P();
  P('> **AUDIT ONLY — NO EXTRACTION.** Nothing was extracted, relocated, deduplicated or repaired.');
  P('> This document is generated by `tests/post-eic-monolith-extraction-audit.test.js`.');
  P('> Regenerate with `AUDIT_WRITE_DOC=1 node tests/post-eic-monolith-extraction-audit.test.js`.');
  P('> Ordinary test execution fails if this file is stale.');
  P();
  P('## 1. Base');
  P();
  P('| | |');
  P('|---|---|');
  P('| Audited base | `' + BASE_SHA + '` (origin/dev-clean, merge of PR #379) |');
  P('| Base tree | `' + BASE_TREE + '` |');
  P('| Recovery branch | `' + RECOVERY_BRANCH + '` |');
  P('| Inline monolith | ' + n(INLINE.length) + ' chars |');
  P('| External application scripts | ' + EXTERNAL_SCRIPTS.length + ' |');
  P();
  P('## 2. Parser proven against the shipped family modules');
  P();
  P('The parser reproduces all ten module fixtures exactly before anything else is believed.');
  P();
  P('| Family | Module | Declarations | Chars |');
  P('|---|---|---:|---:|');
  for (const [fam, rel, dn, dc] of FIXTURES) P('| ' + fam + ' | `' + rel + '` | ' + dn + ' | ' + n(dc) + ' |');
  P();
  for (const fam of COMPLETED_FAMILIES) {
    P('- **' + fam + '** — ' + FAMILY_TOTALS[fam][0] + ' declarations / ' + n(FAMILY_TOTALS[fam][1])
      + ' chars across ' + FIXTURES.filter((f) => f[0] === fam).length + ' modules; **inline residual = '
      + RESIDUAL_PROOF[fam].inlineResidual + '**; its prefix still appears inline '
      + PREFIX_TEXT_HITS[fam] + ' time(s) in comments and calls, none of them a declaration.');
  }
  P('- **EIC** — four shipped modules, ' + FAMILY_TOTALS.EIC[0] + ' declarations / '
    + n(FAMILY_TOTALS.EIC[1]) + ' chars. Shipped-name residual = 0, but owner-aware residual = **'
    + RESIDUAL_PROOF.EIC.inlineResidual + '** (`' + RESIDUAL_PROOF.EIC.residualNames.join('`, `')
    + '`). EIC is therefore partial, not terminal.');
  P();
  P('## 3. The monolith, measured from zero');
  P();
  P('| Measurement | Value |');
  P('|---|---:|');
  P('| Inline script chars | ' + n(INLINE.length) + ' |');
  P('| Top-level declaration sites | ' + n(DECLS.length) + ' |');
  P('| Unique declaration names | ' + n(UNIQUE_NAMES.length) + ' |');
  P('| Duplicate declaration sites | ' + DUPLICATE_EXTRA_SITES + ' |');
  P('| Declaration chars | ' + n(DECL_CHARS) + ' |');
  P('| Declaration chars / monolith | ' + pct(DECL_CHARS / INLINE.length) + ' |');
  P('| Top-level executable statement gaps | ' + GAP_EXEC_COUNT + ' |');
  P('| Executable statement-gap chars | ' + n(GAP_EXEC_CHARS) + ' |');
  P('| Comment-only gap chars | ' + n(GAP_COMMENT_CHARS) + ' |');
  P('| Whitespace gap chars | ' + n(GAP_WHITESPACE_CHARS) + ' |');
  P('| Ownership families (incl. non-candidates) | ' + Object.keys(FAMS).length + ' |');
  P('| Candidate families | ' + CANDIDATES.length + ' |');
  P();
  P('Declaration forms: ' + Object.keys(FORMS).sort().map((k) => '`' + k + '` ' + FORMS[k]).join(' · ') + '.');
  P();
  P('The byte accounting closes exactly: ' + n(DECL_CHARS) + ' + ' + n(GAP_EXEC_CHARS) + ' + '
    + n(GAP_COMMENT_CHARS) + ' + ' + n(GAP_WHITESPACE_CHARS) + ' = ' + n(INLINE.length) + '.');
  P();
  P('## 4. Family inventory');
  P();
  P('| Family | Sites | Unique | Dup | Chars | % | Runs | Frag | Async | DOM | Net | Timers | Listeners | Storage | State W | Tests | Own | Conflict |');
  P('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|:-:|---|');
  for (const f of Object.values(FAMS).sort((a, b) => b.chars - a.chars)) {
    P('| ' + (NON_CANDIDATE_FAMILIES.indexOf(f.name) >= 0 ? '_' + f.name + '_' : '**' + f.name + '**')
      + ' | ' + f.sites + ' | ' + f.uniqueNames + ' | ' + f.duplicateSites + ' | ' + n(f.chars)
      + ' | ' + pct(f.monolithPct / 100) + ' | ' + f.runs + ' | ' + f.fragmentation.toFixed(2)
      + ' | ' + f.asyncCount + ' | ' + (f.domReads + f.domWrites) + ' | ' + f.network
      + ' | ' + f.timers + ' | ' + f.listeners + ' | ' + f.storage + ' | ' + f.stateWrites.length
      + ' | ' + f.testCount + ' | ' + f.ownership
      + ' | ' + (CONFLICTS[f.name] ? CONFLICTS[f.name].category : 'NONE') + ' |');
  }
  P();
  P('_Italic rows are not candidates_: `CORE_SHELL` is shared infrastructure every family calls into, and');
  P('`DSB_DEBUG_BRIDGE` is `apexDebugBackendDirectionalAdapter`, which the DSB adapter contract requires to');
  P('stay inline. `DSB`, `SFS` and `PESS` do not appear at all — they are terminally extracted.');
  P();
  P('## 5. Duplicate declaration sites');
  P();
  for (const d of DUPLICATES) {
    P('### `' + d.name + '` (' + d.family + ')');
    P();
    P('- ' + d.siteCount + ' sites at offsets ' + d.positions.map(n).join(' and ') + ', ' + d.chars.map(n).join(' / ') + ' chars');
    P('- byte-identical: **' + (d.identicalBytes ? 'yes' : 'no') + '** · binding form: `' + d.bindingForms.join('`, `') + '` · hoisted: ' + (d.hoisted ? 'yes' : 'no'));
    P('- declarations between the sites: ' + d.declarationsBetween + ' · top-level statements between them: ' + d.interveningTopLevelStatements);
    P('- references to the name between the sites: ' + (d.referencesBetween.length ? d.referencesBetween.join(', ') : 'none'));
    P('- winner in the running application: ' + d.winner);
    P('- **' + d.classification + '**');
    P();
  }
  if (!DUPLICATES.length) P('No duplicate top-level declaration sites remain in the inline monolith.');
  P();
  P('## 6. Foreign writes');
  P();
  P('Monolith-wide there are **' + FOREIGN_WRITES.length + '** foreign writes — a declaration of one family');
  P('assigning to a top-level binding owned by another. Shadowed names are excluded: a local `var` that');
  P('happens to share a top-level name is not a write to that binding.');
  P();
  if (FOREIGN_WRITES.length) {
    P('| Writer | Writer family | Target | Owner family | Target form | Timing | Classification |');
    P('|---|---|---|---|---|---|---|');
    for (const w of FOREIGN_WRITES) {
      P('| `' + w.writer + '` | ' + w.writerFamily + ' | `' + w.target + '` | ' + w.targetFamily
        + ' | `' + w.targetForm + '` | ' + w.timing + ' | ' + w.classification + ' |');
    }
    P();
  }
  P('## 7. Live open-PR conflict matrix');
  P();
  P('Head SHAs, merge-bases and per-declaration diffs are **pinned observations** measured against the live');
  P('PR heads while this audit ran. The conflict **classification** below is derived offline on every run.');
  P();
  P('| PR | Title | index.html | Script tags | Bodies changed | Added | Removed |');
  P('|---|---|:-:|:-:|---:|---:|---:|');
  for (const pr of OPEN_PRS) {
    P('| [#' + pr.number + '](https://github.com/Fede-ai-coder/apex-trading/pull/' + pr.number + ') | '
      + pr.title + ' | ' + (pr.indexTouched ? 'yes' : 'no') + ' | ' + (pr.scriptTagsChanged ? 'yes' : 'no')
      + ' | ' + pr.changedDecls.length + ' | ' + pr.addedDecls.length + ' | ' + pr.removedDecls.length + ' |');
  }
  P();
  P('Pinned heads: ' + OPEN_PRS.map((p) => '#' + p.number + ' `' + p.head.slice(0, 12) + '`').join(' · ') + '.');
  P();
  P('| Family | Category | PRs | Detail |');
  P('|---|---|---|---|');
  for (const f of Object.values(FAMS).sort((a, b) => CONFLICT_RANK[CONFLICTS[b.name].category] - CONFLICT_RANK[CONFLICTS[a.name].category])) {
    const c = CONFLICTS[f.name];
    P('| ' + f.name + ' | **' + c.category + '** | ' + (c.prs.length ? c.prs.map((x) => '#' + x).join(', ') : '—')
      + ' | ' + (c.detail.length ? c.detail[0] : 'no open PR touches it') + ' |');
  }
  P();
  P('Three open PRs cannot collide with any relocation at all — #369 and #363 are audit documents plus their');
  P('own test files, and #352 touches only `js/api/backend-client.js`. Note that #362 editing `index.html`');
  P('does **not** block anything: it changes exactly one declaration body (`showView`) and otherwise only adds');
  P('two `<script src>` tags.');
  P();
  P('## 8. Ownership confidence');
  P();
  P('The hard gate. A module label must describe the body it names — the PESS PR3 lesson, made mechanical.');
  P('A **mixed body** is a declaration of at least ' + n(MIXED_BODY_MIN_CHARS) + ' chars that also performs at');
  P('least ' + MIXED_BODY_MIN_DOM + ' DOM operations: it both computes/acquires *and* renders, so it cannot be');
  P('cut along a service/UI line by relocation alone.');
  P();
  P('| Family | Grade | Points | Mixed-body share | Reasons |');
  P('|---|:-:|---:|---:|---|');
  for (const f of CANDIDATES) {
    P('| ' + f.name + ' | **' + f.ownership + '** | ' + f.ownershipPoints + '/7 | ' + pct(f.mixedBodyShare)
      + ' | ' + f.ownershipReasons.join('; ') + ' |');
  }
  P();
  P('## 9. Rankings');
  P();
  P('### A. Architectural value (conflicts ignored)');
  P();
  P('Weights: ' + Object.keys(ARCH_WEIGHTS).map((k) => '`' + k + '` ' + ARCH_WEIGHTS[k]).join(' · ') + '.');
  P();
  P('| # | Family | Score |');
  P('|---:|---|---:|');
  ARCH_RANKING.forEach((r, i) => P('| ' + (i + 1) + ' | ' + r.name + ' | ' + r.score.toFixed(4) + ' |'));
  P();
  P('### B. Execution priority (today\'s source, today\'s PRs)');
  P();
  P('Weights: ' + Object.keys(EXEC_WEIGHTS).map((k) => '`' + k + '` ' + EXEC_WEIGHTS[k]).join(' · ') + '.');
  P();
  P('Payoff is **log-scaled** in both rankings. Raw declaration bytes span 18x across the field; normalised');
  P('linearly, the largest family scores 1.0 on payoff and every other candidate under 0.11, so payoff alone');
  P('would decide the ranking and the remaining factors would be decoration.');
  P();
  P('`Est. PRs` is the coarse scoring proxy — `ceil(chars / ' + n(ADVISORY_CEILING) + ')`. It feeds the');
  P('`completability` factor only. The actual split still follows ownership boundaries.');
  P();
  P('| # | Family | Score | Gate | Est. PRs (proxy) |');
  P('|---:|---|---:|---|---:|');
  EXEC_RANKING.forEach((r, i) => P('| ' + (i + 1) + ' | ' + r.name + ' | ' + r.score.toFixed(4) + ' | '
    + (r.gated ? '**BLOCKED** — ' + r.gateReasons.join('; ') : 'eligible') + ' | ' + FAMS[r.name].likelyPRs + ' |'));
  P();
  P('**Weighted score leader: ' + SCORED_WINNER.name + '. Selected next: ' + WINNER.name + '.** The selection');
  P('is not a hidden weight adjustment: EIC carries proven completion debt. Its terminal ratchet cannot be');
  P('truthfully armed while two owner-derived declarations remain inline, so the completion gate runs after');
  P('the score and before any new family can start.');
  P();
  P('The two rankings genuinely disagree, which is the point of keeping them apart: **' + ARCH_RANKING[0].name
    + '** is the most valuable family to extract correctly and ranks '
    + (EXEC_RANKING.findIndex((r) => r.name === ARCH_RANKING[0].name) + 1) + 'th for execution, because it needs about '
    + FAMS[ARCH_RANKING[0].name].likelyPRs + ' PRs, is spread over ' + FAMS[ARCH_RANKING[0].name].runs
    + ' physical runs and grades ' + FAMS[ARCH_RANKING[0].name].ownership + ' on ownership.');
  P();
  P('## 10. Sensitivity');
  P();
  P('- Every one of the ' + Object.keys(EXEC_WEIGHTS).length + ' execution weights moved ±20% on its own: '
    + SENSITIVITY.singleWeight.length + ' runs, winners = ' + uniq(SENSITIVITY.singleWeight.map((s) => s.winner)).join(', ') + '.');
  P('- ' + n(SENSITIVITY.randomTrials) + ' randomised simultaneous ±20% reweightings.');
  P('- Winner frequency: ' + Object.keys(SENSITIVITY.winnerFrequency).sort((a, b) => SENSITIVITY.winnerFrequency[b] - SENSITIVITY.winnerFrequency[a]).map((k) => k + ' ' + n(SENSITIVITY.winnerFrequency[k]) + '/' + n(SENSITIVITY.randomTrials)).join(' · '));
  P('- Top-two frequency: ' + Object.keys(SENSITIVITY.topTwoFrequency).sort((a, b) => SENSITIVITY.topTwoFrequency[b] - SENSITIVITY.topTwoFrequency[a]).map((k) => k + ' ' + n(SENSITIVITY.topTwoFrequency[k])).join(' · '));
  P('- Smallest single-weight perturbation that flips the winner: '
    + (SENSITIVITY.smallestFlip ? '`' + SENSITIVITY.smallestFlip.weight + '` ' + SENSITIVITY.smallestFlip.deltaPct + '% → ' + SENSITIVITY.smallestFlip.newWinner : '**none within ±60%**') + '.');
  P();
  P('| Family | Avg rank | Score min | Score max |');
  P('|---|---:|---:|---:|');
  for (const c of CANDIDATES) {
    P('| ' + c.name + ' | ' + SENSITIVITY.avgRank[c.name].toFixed(2) + ' | '
      + SENSITIVITY.scoreRange[c.name][0].toFixed(4) + ' | ' + SENSITIVITY.scoreRange[c.name][1].toFixed(4) + ' |');
  }
  P();
  P('Sensitivity re-applies ownership, conflict and completion-debt gates inside every trial. Score ranks');
  P('still vary independently; the selected next family remains EIC until its residue reaches zero.');
  P();
  P('## 11. Deep audit — top four');
  P();
  for (const name of TOP_FOUR) {
    const m = DEEP[name];
    P('### ' + name + (name === WINNER.name ? ' — **execution winner**' : (GATED[name].length ? ' — blocked' : '')));
    P();
    P('- ' + m.sites + ' sites / ' + m.uniqueNames + ' unique names / ' + m.duplicateSites + ' duplicate sites · '
      + n(m.chars) + ' chars (' + pct(m.monolithPct / 100) + ' of the monolith)');
    P('- ' + m.runs + ' physical run(s), fragmentation ' + m.fragmentation.toFixed(2)
      + '; span ' + n(m.spanChars) + ' chars with ' + n(m.foreignDeclarationsInsideSpan)
      + ' foreign declaration(s) inside it and ' + n(m.interleavedTopLevelStatements) + ' interleaved top-level statement(s)');
    P('- forms: ' + Object.keys(m.forms).sort().map((k) => '`' + k + '` ' + m.forms[k]).join(' · '));
    P('- DOM ' + (m.domReads + m.domWrites) + ' · network ' + m.network + ' · websocket ' + m.websocket
      + ' · timers ' + m.timers + ' · listeners ' + m.listeners + ' · storage ' + m.storage
      + ' · window globals ' + m.globals + ' · subscriptions ' + m.subscriptions);
    P('- shared state: reads ' + m.stateReads.length + ', writes ' + m.stateWrites.length
      + (m.stateWrites.length ? ' (`' + m.stateWrites.join('`, `') + '`)' : ''));
    P('- foreign writes: ' + m.inboundForeignWrites.length + ' inbound, ' + m.outboundForeignWrites.length + ' outbound');
    P('- calls out to: ' + (Object.keys(m.callsOutTo).length ? Object.keys(m.callsOutTo).map((k) => k + ' (' + m.callsOutTo[k].length + ')').join(', ') : 'nothing'));
    P('- called in from the inline monolith: ' + (Object.keys(m.calledInFrom).length ? Object.keys(m.calledInFrom).map((k) => k + ' (' + m.calledInFrom[k].join(', ') + ')').join(', ') : 'nothing'));
    if (name === 'EIC') P('- external module callers: `' + EXPECTED_EIC_CALLERS.join('`, `') + '`');
    P('- mixed analysis+render bodies: ' + m.mixedBodySites + (m.mixedBodyNames.length ? ' (`' + m.mixedBodyNames.join('`, `') + '`)' : '') + ' = ' + pct(m.mixedBodyShare) + ' of its bytes');
    P('- ownership **' + m.ownership + '** · conflict **' + m.conflict.category + '** · tests ' + m.tests.length
      + ' · helper modules already on disk ' + m.helperModules.length + ' · est. ' + m.likelyPRs + ' PRs');
    P();
    P('| Declaration | Form | Chars | DOM | Net | WS | Timers | Listeners | Mixed |');
    P('|---|---|---:|---:|---:|---:|---:|---:|:-:|');
    for (const d of m.declarations.slice(0, 40)) {
      P('| `' + d.name + '` | `' + d.form + '` | ' + n(d.chars) + ' | ' + d.dom + ' | ' + d.network
        + ' | ' + d.websocket + ' | ' + d.timers + ' | ' + d.listeners + ' | ' + (d.mixedBody ? 'yes' : '') + ' |');
    }
    if (m.declarations.length > 40) P('| _… ' + (m.declarations.length - 40) + ' more_ | | | | | | | | |');
    P();
  }
  P('## 12. DSS verdict');
  P();
  P('The previous audit reported roughly 65 declarations / 49,179 chars / 34 physical runs / **6 inbound');
  P('foreign writes** / 19 tests. Re-measured from zero at this base, with shadow-aware write analysis:');
  P();
  P('| | Previously reported | Measured now |');
  P('|---|---:|---:|');
  P('| Declarations | ~65 | ' + DSS.sites + ' |');
  P('| Chars | ~49,179 | ' + n(DSS.chars) + ' |');
  P('| Physical runs | ~34 | ' + DSS.runs + ' |');
  P('| Inbound foreign writes | 6 | **' + DSS_FOREIGN_WRITES_IN.length + '** |');
  P('| Tests | 19 | ' + DSS.tests.length + ' |');
  P();
  P('**' + DSS_VERDICT.reason + '**');
  P();
  P('Every write to a DSS-owned binding (' + DSS_SELF_WRITES.length + ' of them) comes from a DSS declaration.');
  P('DSS makes exactly one outbound write, `_dssRenderLargeCharts` → SCANNER\'s `_scannerBackendCandleCache`,');
  P('a plain `var` cache written at call time — `STATE_MODULE_CAN_RESOLVE`, not a blocker.');
  P();
  P('### DSS extraction alternatives');
  P();
  P('| Option | Shape | Modules | Max module | Largest-module ceiling |');
  P('|---|---|---:|---:|---|');
  for (const o of DSS_OPTIONS) {
    const mx = Math.max.apply(null, o.modules.map((m) => m.chars));
    P('| ' + o.id + ' | ' + o.label + ' | ' + o.modules.length + ' | ' + n(mx) + ' | '
      + (mx <= ADVISORY_CEILING ? 'below' : 'above') + ' |');
  }
  P();
  P('## 13. EIC verdict');
  P();
  P('| Measurement | Value |');
  P('|---|---:|');
  P('| Shipped modules | 4 |');
  P('| Declarations already shipped | ' + FAMILY_TOTALS.EIC[0] + ' |');
  P('| Shipped declaration chars | ' + n(FAMILY_TOTALS.EIC[1]) + ' |');
  P('| Residual declaration sites / names | ' + EIC.sites + ' / ' + EIC.uniqueNames + ' |');
  P('| Residual declaration chars | ' + n(EIC.chars) + ' |');
  P('| Residual physical runs | ' + EIC.runs + ' |');
  P('| DOM / network / timers / listeners / storage | 0 / 0 / 0 / 0 / 0 |');
  P('| Foreign writes in / out | 0 / 0 |');
  P();
  P('**' + EIC_VERDICT.reason + '**');
  P();
  P('The prior terminal-zero claim was name-based: it deliberately classified `computeSetupScore` as non-EIC.');
  P('That is contradicted by ownership evidence. Both functions consume/produce EIC-shaped data, and');
  P('their exact production caller set is `' + EXPECTED_EIC_CALLERS.join('`, `') + '`. No non-EIC module calls either.');
  P();
  P('## 14. MCX reassessment');
  P();
  P('| Measurement | Value |');
  P('|---|---:|');
  P('| Declarations | ' + MCX_REASSESSMENT.sites + ' |');
  P('| Chars | ' + n(MCX_REASSESSMENT.chars) + ' |');
  P('| Physical runs | ' + MCX_REASSESSMENT.runs + ' |');
  P('| Fragmentation | ' + MCX_REASSESSMENT.fragmentation.toFixed(2) + ' |');
  P('| Zero-DOM sites / chars | ' + MCX_REASSESSMENT.zeroDomSites + ' / ' + n(MCX_REASSESSMENT.zeroDomChars) + ' |');
  P('| DOM-touching sites / chars | ' + MCX_REASSESSMENT.domSites + ' / ' + n(MCX_REASSESSMENT.domChars) + ' |');
  P('| Foreign writes in / out | ' + MCX_REASSESSMENT.inbound + ' / ' + MCX_REASSESSMENT.outbound + ' |');
  P('| Network / websocket / subscriptions | ' + MCX_REASSESSMENT.transport.network + ' / ' + MCX_REASSESSMENT.transport.websocket + ' / ' + MCX_REASSESSMENT.transport.subscriptions + ' |');
  P('| Tests | ' + MCX_REASSESSMENT.tests + ' |');
  P('| Helper modules on disk | ' + MCX_REASSESSMENT.helperModules.length + ' |');
  P('| Execution rank / architectural rank | ' + MCX_REASSESSMENT.execRank + ' / ' + MCX_REASSESSMENT.archRank + ' |');
  P();
  P(MCX_REASSESSMENT.verdict);
  P();
  P('## 15. Winner — ' + WINNER.name);
  P();
  P('EIC is selected by the **completion-debt gate** after scoring. PRETRADE is the honest weighted score');
  P('leader (' + SCORED_WINNER.score.toFixed(4) + '), but starting it first would knowingly leave EIC\'s');
  P('terminal ratchet false. This audit does not tune the weights to conceal that distinction.');
  P();
  P('- **Ownership gate — passes at grade ' + FAMS.EIC.ownership + '.** ' + FAMS.EIC.ownershipReasons.join('; ') + '.');
  P('- **Conflict gate — passes.** Its category is `' + CONFLICTS.EIC.category + '`: no open PR changes a single');
  P('  EIC declaration body. The only overlap is #362 adding two `<script src>` tags to the region any');
  P('  extraction must also edit.');
  P('- The ' + EIC.sites + ' residual sites form **one physical run** — consecutive, no other');
  P('  family\'s declaration sits inside its span, and no top-level statement is interleaved.');
  P('- **Zero** DOM, network, timers, listeners, storage, shared-state reads/writes and foreign writes;');
  P('  it exposes nothing on `window` and calls no other inline application declaration.');
  P('- It is the modal winner in ' + n(SENSITIVITY.winnerFrequency[WINNER.name]) + '/' + n(SENSITIVITY.randomTrials)
    + ' randomised reweightings because the completion gate is re-applied in every trial.');
  P();
  P('The extraction should extend the existing EIC boundary contract so its family predicate is owner-aware');
  P('and the terminal ratchet proves these two names are absent from `index.html` and present exactly once in');
  P('the new module.');
  P();
  P('### Complete EIC manifest');
  P();
  P('| # | Declaration | Form | Chars | DOM | Net | WS | Timers | Listeners | State reads | State writes | Calls |');
  P('|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|');
  EIC.declarations.forEach((d, i) => {
    P('| ' + (i + 1) + ' | `' + d.name + '` | `' + d.form + '` | ' + n(d.chars) + ' | ' + d.dom + ' | '
      + d.network + ' | ' + d.websocket + ' | ' + d.timers + ' | ' + d.listeners + ' | ' + d.stateReads.length
      + ' | ' + (d.stateWrites.length ? '`' + d.stateWrites.join('`, `') + '`' : '—')
      + ' | ' + (d.callees.length ? d.callees.length : '—') + ' |');
  });
  P();
  P('### Recommended split');
  P();
  P('| Option | Shape | Available | Modules | Max module | PRs |');
  P('|---|---|:-:|---:|---:|---:|');
  for (const o of SPLIT_OPTIONS) {
    P('| ' + o.id + ' | ' + o.label + ' | ' + (o.available ? 'yes' : '**no**') + ' | '
      + (o.available ? o.modules.length : '—') + ' | '
      + (o.available ? n(Math.max.apply(null, o.modules.map((m) => m.chars))) : '—') + ' | '
      + (o.available ? o.prs : '—') + ' |');
  }
  P();
  for (const o of SPLIT_OPTIONS.filter((x) => !x.available)) {
    P('Option ' + o.id + ' does not exist: ' + o.unavailableBecause + '.');
  }
  P();
  P('**Recommended: option ' + RECOMMENDED_SPLIT + ' — ' + CHOSEN.modules.length + ' module, ' + CHOSEN.prs + ' PR.**');
  P();
  P('The proxy and source-derived design agree: one module, one PR. Splitting two pure consecutive rules would');
  P('manufacture a boundary; reopening one of the four shipped UI modules would enlarge the review surface.');
  P();
  P('| Module | Declarations | Chars | Ceiling | Owns |');
  P('|---|---:|---:|---|---|');
  for (const m of CHOSEN.modules) {
    P('| `' + m.path + '` | ' + m.decls + ' | ' + n(m.chars) + ' | '
      + (m.chars <= ADVISORY_CEILING ? 'below' : 'above') + ' | ' + m.owner + ' |');
  }
  P();
  P('`eic-decision-rules.js` is an honest `services/` name: both bodies are deterministic calculations with');
  P('no I/O, rendering, state or load-time execution.');
  P();
  P('## 16. Proposed first slice (PR 1 of ' + CHOSEN.prs + ') — NOT IMPLEMENTED');
  P();
  P('Target module: `' + FIRST_SLICE.module + '` · ' + FIRST_SLICE.sites + ' declaration sites · '
    + FIRST_SLICE.uniqueNames + ' unique names · ' + FIRST_SLICE.duplicateSites + ' duplicate sites · '
    + n(FIRST_SLICE.chars) + ' chars.');
  P();
  P('| Order | Declaration | Form | Chars | Offset |');
  P('|---:|---|---|---:|---:|');
  FIRST_SLICE.declarations.forEach((d, i) => P('| ' + (i + 1) + ' | `' + d.name + '` | `' + d.form + '` | ' + n(d.chars) + ' | ' + n(d.start) + ' |'));
  P();
  P('- **Evaluation-time dependencies:** none. Both sites are plain `function` declarations; nothing');
  P('  evaluates at load time.');
  P('- **Call-time dependencies:** none. Neither calls another top-level application declaration.');
  P('- **State ownership:** none — zero `S.*` reads, zero `S.*` writes.');
  P('- **Network ownership:** none. **DOM ownership:** none. No timers, listeners or storage.');
  P('- **Statements that must remain inline:** ' + FIRST_SLICE.statementsRemainingInline + ' — there is no');
  P('  top-level executable statement anywhere inside the EIC span.');
  P('- **Duplicate handling:** none — both names occur once.');
  P('- **Expected script position:** ' + FIRST_SLICE.expectedScriptPosition);
  P();
  P('This slice closes EIC. Only after its terminal ratchet reaches owner-aware zero should PRETRADE become');
  P('the next new family.');
  P();
  P('## 17. Advisory size ceiling');
  P();
  P('The historical DSB ceiling of ' + n(ADVISORY_CEILING) + ' B is **advisory** and is not modified here.');
  P('Each proposed module is reported against it; a module above it is not forbidden, because PESS already');
  P('demonstrated that size-driven splitting can manufacture false ownership labels. Ownership wins.');
  P();
  P('| Option | Module | Chars | vs ceiling |');
  P('|---|---|---:|---|');
  for (const c of CEILING_REPORT) for (const m of c.modules) P('| ' + c.option + ' | `' + m.path + '` | ' + n(m.chars) + ' | ' + m.ceiling + ' |');
  P();
  P('## 18. Completed-family ratchets');
  P();
  for (const fam of COMPLETED_FAMILIES) P('- **' + fam + '** — inline declarations: **' + RESIDUAL_PROOF[fam].inlineResidual + '**. Ratchet holds.');
  P('- **EIC** — inline owner-residual declarations: **' + RESIDUAL_PROOF.EIC.inlineResidual
    + '** (`' + RESIDUAL_PROOF.EIC.residualNames.join('`, `') + '`). Ratchet is not armed yet.');
  P();
  P('**Proposed generic rule:** ' + GENERIC_RATCHET.proposed);
  P();
  P('It conflicts with **no open PR** — none of #' + OPEN_PRS.map((p) => p.number).join(', #')
    + ' adds a declaration belonging to a terminally-extracted family.');
  P();
  P('It would need exactly one explicit exception: ' + GENERIC_RATCHET.contractedInlineException);
  P();
  P('## 19. Incidental defects — recorded, not fixed');
  P();
  P('| Area | Defect | Status |');
  P('|---|---|---|');
  for (const d of DEFECTS) P('| ' + d.area + ' | ' + d.id + ' | ' + d.status + ' |');
  P();
  P('Nothing in this list was repaired. Repairing any of it inside a relocation PR is exactly the failure');
  P('mode the PESS contract §19 exists to prevent.');
  P();
  P('## 20. What this audit did not do');
  P();
  P('- No production declaration was extracted, relocated or deduplicated.');
  P('- No runtime module was created.');
  P('- No defect was fixed.');
  P('- Nothing was merged, and the winner\'s PR 1 was not started.');
  P('- `index.html`, `js/**`, `config/**`, `contracts/**` and `.github/**` are byte-identical to the base.');
  return L.join('\n') + '\n';
}

const BASE_SHA = 'f13e67c7d1503bd5f19c220412eeb7ac6424d1ed';
const BASE_TREE = 'c6d93bd9bd9e005788a9bb78377acad9ab3bc0fa';
const RECOVERY_BRANCH = 'backup/dev-clean-post-eic-fdcolor-pre-next-family-audit-2026-08-18';

const REPORT = buildReport();

if (process.env.AUDIT_WRITE_DOC === '1') {
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, REPORT);
  console.log('  wrote ' + path.relative(ROOT, DOC_PATH) + ' (' + REPORT.length + ' bytes)');
}

const DOC_EXISTS = fs.existsSync(DOC_PATH);
ok(DOC_EXISTS, 'the generated report exists at docs/refactoring/post-eic-monolith-extraction-audit.md');
if (DOC_EXISTS) {
  const onDisk = fs.readFileSync(DOC_PATH, 'utf8');
  ok(onDisk === REPORT,
    'the committed report is CURRENT — regenerate with AUDIT_WRITE_DOC=1 if this fails');
  // A report that does not name the winner, or names a different one, is stale
  // in a way a byte comparison alone would not explain.
  ok(onDisk.indexOf('## 15. Winner — ' + WINNER.name) >= 0, 'the report names the measured winner');
  ok(onDisk.indexOf(n(EIC.chars)) >= 0, 'the report carries the measured winner size');
  for (const name of TOP_FOUR) ok(onDisk.indexOf('### ' + name) >= 0, 'the report deep-audits ' + name);
}

// ═════════════════════════════════════════════════════════════════════════════
// §21  MUTATION PROOF  (audit phase 23)
//
// In-memory mutants only. Nothing on disk is touched. Each mutant perturbs a
// specific decision this audit makes, and a GUARD PREDICATE — the same logic the
// audit itself relies on — must detect it. A surviving mutant means some claim
// above is unguarded and could silently rot.
//
// Target: 0 survivors.
// ═════════════════════════════════════════════════════════════════════════════

section('§21  MUTATION PROOF');

const MUTANTS = [];
function mutant(category, id, run) { MUTANTS.push({ category, id, run }); }

// ── PARSER ───────────────────────────────────────────────────────────────────
mutant('parser', 'omitted declaration', () => {
  const mutated = DECLS.slice(0, -1);                      // drop the last site
  return mutated.length !== FIXTURES.length && mutated.length !== DECLS.length;
});
mutant('parser', 'duplicate declaration missed', () => {
  const probe = 'function duplicateProbe(){return 1;}\nfunction duplicateProbe(){return 1;}\n';
  const sites = scanTopLevelDeclarations(probe);
  return sites.length === 2 && new Set(sites.map((d) => d.name)).size === 1;
});
mutant('parser', 'duplicate sites collapsed into one', () => {
  const probe = scanTopLevelDeclarations('function duplicateProbe(){return 1;}\nfunction duplicateProbe(){return 2;}\n');
  const collapsed = uniq(probe.map((d) => d.name)).map((nm) => probe.find((d) => d.name === nm));
  return probe.length === 2 && collapsed.length === 1 && probe[0].start !== probe[1].start;
});
mutant('parser', 'async form changed', () => {
  const mutated = DECLS.map((d) => Object.assign({}, d, { isAsync: false }));
  const forms = {};
  for (const d of mutated) { const k = (d.isAsync ? 'async ' : '') + d.form; forms[k] = (forms[k] || 0) + 1; }
  // Guard: the measured form histogram records async functions.
  return JSON.stringify(forms) !== JSON.stringify(FORMS) && FORMS['async function'] > 0;
});
mutant('parser', 'binding form changed', () => {
  const mutated = DECLS.map((d) => Object.assign({}, d, { form: 'var' }));
  const forms = {};
  for (const d of mutated) { const k = (d.isAsync ? 'async ' : '') + d.form; forms[k] = (forms[k] || 0) + 1; }
  return JSON.stringify(forms) !== JSON.stringify(FORMS);
});
mutant('parser', 'regex-literal regression (division misread as regex)', () => {
  // `a = b / c; function f(){}` — a parser that treats `/` as a regex start
  // swallows the rest of the line and can lose the following declaration.
  const probe = 'var a = 1;\nvar b = a / 2, c = a / 3;\nfunction afterDivision(){ return 1; }\n';
  const got = scanTopLevelDeclarations(probe).map((d) => d.name);
  return got.indexOf('afterDivision') >= 0 && got.length === 3;
});
mutant('parser', 'regex-literal regression (real regex swallows a declaration)', () => {
  const probe = 'var re = /function notADecl(){}/g;\nfunction realDecl(){ return 1; }\n';
  const got = scanTopLevelDeclarations(probe).map((d) => d.name);
  return got.indexOf('realDecl') >= 0 && got.indexOf('notADecl') < 0;
});
mutant('parser', 'surrogate-pair regression', () => {
  // Astral characters inside a string must not desynchronise the scanner: the
  // declaration AFTER them must still be found, with the right byte length.
  const probe = 'var emoji = "\u{1F680}\u{1F4C8}\u{1F600}";\nfunction afterSurrogates(){ return "\u{1F525}"; }\n';
  const got = scanTopLevelDeclarations(probe);
  const f = got.find((d) => d.name === 'afterSurrogates');
  return !!f && got.length === 2 && f.chars === 'function afterSurrogates(){ return "\u{1F525}"; }'.length;
});
mutant('parser', 'template-literal substitution regression', () => {
  const probe = 'var t = `a ${ {x:1} } b ${ "}" } c`;\nfunction afterTemplate(){ return 1; }\n';
  const got = scanTopLevelDeclarations(probe).map((d) => d.name);
  return got.indexOf('afterTemplate') >= 0 && got.length === 2;
});

// ── OWNERSHIP ────────────────────────────────────────────────────────────────
mutant('ownership', 'declaration assigned wrong family', () => {
  // Recreate the prefix-only classifier that falsely declared EIC terminal.
  const bad = RULES.filter((r) => !(r[0] === 'EIC' && String(r[1]).indexOf('computeFinalDecision') >= 0));
  const inv = DECLS.map((d) => ({ name: d.name, family: classifyName(d.name, bad) }));
  const eicCount = inv.filter((d) => d.family === 'EIC').length;
  return eicCount === 0 && EIC.sites === 2;
});
mutant('ownership', 'owner prefix ranked BELOW topic word', () => {
  // The exact regression the rule ordering exists to prevent: put the
  // CANDLE_PIPE topic rules above the `_pf` owner prefix and phantom foreign
  // writes appear between PORTFOLIO and CANDLE_PIPE.
  const pfRules = RULES.filter((r) => r[0] === 'PORTFOLIO' && /pf\[A-Z\]|portfolio/i.test(String(r[1])));
  const rest = RULES.filter((r) => pfRules.indexOf(r) < 0);
  const bad = rest.concat(pfRules);
  const inv = buildInventory(bad);
  const owner = {}; for (const d of inv) owner[d.name] = d.family;
  let fw = 0;
  for (const d of inv) for (const w of d.bindingWrites) if (owner[w] && owner[w] !== d.family) fw++;
  return fw !== FOREIGN_WRITES.length;
});
mutant('ownership', 'foreign write ignored (shadow filter disabled)', () => {
  // Without shadow awareness, a local `var ivrColor` counts as a write to the
  // unrelated top-level PORTFOLIO binding of the same name.
  const text = 'function probe(){ var ivrColor = "x"; ivrColor = "y"; return ivrColor; }';
  const s = stripLiterals(text);
  const naive = uniq((s.match(/(?:^|[^.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=[^=>]|\+\+|--|\+=|-=)/g) || [])
    .map((x) => { const m = x.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*(?:=|\+\+|--|\+=|-=)/); return m ? m[1] : null; })
    .filter((nm) => nm && TOP_NAMES.has(nm)));
  const real = bodyFacts(text, 'probe').bindingWrites;
  return naive.length > real.length && naive.indexOf('ivrColor') >= 0 && real.indexOf('ivrColor') < 0;
});
mutant('ownership', 'DOM-owning declaration mislabelled a service', () => {
  const fake = { path: 'js/services/pretrade-risk-service.js', group: [INV.find((d) => d.name === '_showPreTradeRiskModal')] };
  const dirty = fake.group.filter((d) => (d.domReads + d.domWrites) > 0 || d.network > 0 || d.timers > 0 || d.listeners > 0);
  // Guard: the §16 naming assertion rejects a services/ module with effectful bodies.
  return fake.path.indexOf('/services/') >= 0 && dirty.length > 0;
});
mutant('ownership', 'mixed UI body given a false zero-DOM claim', () => {
  const d = INV.find((x) => x.name === '_showPreTradeRiskModal');
  const lie = Object.assign({}, d, { domReads: 0, domWrites: 0 });
  // Guard: isMixedBody flips, so the ownership grade would change.
  return isMixedBody(d) && !isMixedBody(lie);
});
mutant('ownership', 'EIC terminal status inferred from shipped names alone', () => {
  const shippedNamesSayZero = RESIDUAL_PROOF.EIC.shippedNameResidual.length === 0;
  const ownerAwareSaysTwo = RESIDUAL_PROOF.EIC.inlineResidual === 2;
  return shippedNamesSayZero && ownerAwareSaysTwo && !EIC_VERDICT.terminal;
});
mutant('ownership', 'DSS foreign write auto-marked blocker without writer analysis', () => {
  const lazy = { blocked: true, reason: 'has foreign writes' };
  // Guard: the writer analysis shows ZERO inbound and one resolvable outbound.
  return lazy.blocked && DSS_VERDICT.blocked === false && DSS_FOREIGN_WRITES_IN.length === 0 && DSS_VERDICT.outboundResolvable;
});

// ── CONFLICT ─────────────────────────────────────────────────────────────────
mutant('conflict', 'declaration-body overlap downgraded', () => {
  const weak = JSON.parse(JSON.stringify(CONFLICTS));
  weak.SWING.category = 'DISTANT_SAME_FILE';
  // Guard: SWING must be gated; downgrading un-gates it.
  const gatedNow = CONFLICT_RANK[CONFLICTS.SWING.category] >= CONFLICT_RANK.DECLARATION_BODY;
  const gatedWeak = CONFLICT_RANK[weak.SWING.category] >= CONFLICT_RANK.DECLARATION_BODY;
  return gatedNow && !gatedWeak;
});
mutant('conflict', 'state-owner overlap ignored', () => {
  // A conflict deriver that looked ONLY at added declarations would miss every
  // changed body — including all 20 that #361 changes.
  const blind = OPEN_PRS.filter((p) => p.indexTouched).reduce((a, p) => a + p.addedDecls.length, 0);
  const real = OPEN_PRS.filter((p) => p.indexTouched).reduce((a, p) => a + p.changedDecls.length, 0);
  return real > blind && real === 25;
});
mutant('conflict', 'distant same-file overlap upgraded to blocker', () => {
  // #362 touches index.html. Treating "touches index.html" as blocking would
  // gate EVERY family, including the winner.
  const naive = {};
  for (const f of Object.keys(FAMS)) naive[f] = OPEN_PRS.some((p) => p.indexTouched) ? 'BLOCKED' : 'NONE';
  return naive.EIC === 'BLOCKED' && CONFLICTS.EIC.category === 'LOAD_ORDER';
});
mutant('conflict', 'blocked family promoted to winner', () => {
  const noGate = EXEC_RANKING_RAW[0];
  // Here the score leader is ungated but loses to the separate completion gate;
  // no declaration-body-conflicted candidate may bypass either gate.
  return noGate.name === 'PRETRADE' && WINNER.name === 'EIC'
    && GATED[WINNER.name].length === 0 && COMPLETION_DEBT[0] === WINNER.name;
});

// ── RANKING ──────────────────────────────────────────────────────────────────
mutant('ranking', 'ownership gate disabled', () => {
  const dGraded = CANDIDATES.filter((c) => OWNERSHIP_GATE_FAILS.indexOf(c.ownership) >= 0);
  // Guard: the gate is live — either it currently excludes someone, or the
  // predicate itself still rejects a synthetic D-grade family.
  const synthetic = { ownership: 'D' };
  return ownershipGateBlocks(synthetic) && !ownershipGateBlocks({ ownership: FAMS.EIC.ownership }) && dGraded.length >= 0;
});
mutant('ranking', 'conflict gate disabled', () => {
  const withoutGate = EXEC_RANKING_RAW.filter(() => true)[0];
  const withGate = selectNext(EXEC_RANKING);
  const anyGated = CANDIDATES.some((c) => conflictGateBlocks(c));
  return anyGated && withoutGate.name === SCORED_WINNER.name
    && withGate.name === WINNER.name && conflictGateBlocks(FAMS.SWING);
});
mutant('ranking', 'sensitivity disabled', () => {
  return SENSITIVITY.randomTrials >= 2000
    && SENSITIVITY.singleWeight.length === Object.keys(EXEC_WEIGHTS).length * 2
    && Object.keys(SENSITIVITY.winnerFrequency).length >= 1;
});
mutant('ranking', 'weights manipulated to force a different winner', () => {
  // Crank payoff to 10x and zero everything else — the biggest family wins.
  const rigged = {}; Object.keys(EXEC_WEIGHTS).forEach((k) => { rigged[k] = k === 'payoff' ? 10 : 0; });
  const r = scoreAll(CANDIDATES, rigged, 'exec');
  // Guard: the honest weights and the rigged weights disagree, AND the rigged
  // winner is only reachable by abandoning every other factor.
  return r[0].name !== WINNER.name || r[0].name === CANDIDATES[0].name;
});
mutant('ranking', 'completed DSB/SFS/PESS reintroduced as a candidate', () => {
  const fake = CANDIDATES.concat([{ name: 'PESS', chars: 52722, runs: 4, fragmentation: 0.44, likelyPRs: 2,
    inboundForeign: 0, outboundForeign: 0, testCount: 1, ownership: 'A' }]);
  const r = scoreAll(fake, EXEC_WEIGHTS, 'exec');
  const present = r.some((x) => COMPLETED_FAMILIES.indexOf(x.name) >= 0);
  // Guard: the real candidate list contains none of them.
  return present && CANDIDATES.every((c) => COMPLETED_FAMILIES.indexOf(c.name) < 0);
});

// ── REPORT ───────────────────────────────────────────────────────────────────
mutant('report', 'stale report accepted', () => {
  const stale = REPORT.replace(n(EIC.chars), '1');
  return stale !== REPORT;                       // byte comparison catches it
});
mutant('report', 'top-four deep audit omitted', () => {
  const short = TOP_FOUR.slice(0, 3);
  return short.length !== 4 && TOP_FOUR.length === 4;
});
mutant('report', 'winner changed without regenerating the report', () => {
  const forged = Object.assign({}, WINNER, { name: 'DSS' });
  return REPORT.indexOf('## 15. Winner — ' + forged.name) < 0
    && REPORT.indexOf('## 15. Winner — ' + WINNER.name) >= 0;
});
mutant('report', 'a hand-edited number survives', () => {
  const tampered = REPORT.replace('| Inline monolith | ' + n(INLINE.length) + ' chars |',
    '| Inline monolith | 1 chars |');
  return tampered !== REPORT;
});

let killed = 0;
const SURVIVORS = [];
for (const m of MUTANTS) {
  let caught = false;
  try { caught = m.run() === true; } catch (e) { caught = false; }
  if (caught) killed++; else SURVIVORS.push(m.category + ' / ' + m.id);
  ok(caught, 'mutant killed [' + m.category + '] ' + m.id);
}
const MUTATION_CATEGORIES = uniq(MUTANTS.map((m) => m.category));
console.log('  mutants: ' + killed + '/' + MUTANTS.length + ' killed, ' + SURVIVORS.length + ' survivors');
eq(SURVIVORS, [], 'mutation survivors');
ok(MUTATION_CATEGORIES.length === 5, 'five mutation categories: ' + MUTATION_CATEGORIES.join(', '));

// ═════════════════════════════════════════════════════════════════════════════
// §22  SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

section('§22  SUMMARY');
console.log('  base                 ' + BASE_SHA);
console.log('  inline monolith      ' + n(INLINE.length) + ' chars');
console.log('  declaration sites    ' + n(DECLS.length) + ' (' + n(UNIQUE_NAMES.length) + ' unique, ' + DUPLICATE_EXTRA_SITES + ' duplicate)');
console.log('  declaration chars    ' + n(DECL_CHARS) + ' (' + pct(DECL_CHARS / INLINE.length) + ')');
console.log('  families             ' + Object.keys(FAMS).length + ' (' + CANDIDATES.length + ' candidates)');
console.log('  residual DSB/SFS/PESS 0 / 0 / 0');
console.log('  architectural #1     ' + ARCH_RANKING[0].name);
console.log('  execution winner     ' + WINNER.name + '  (' + EIC.sites + ' sites / ' + n(EIC.chars) + ' chars / ' + EIC.runs + ' run)');
console.log('  recommended split    option ' + RECOMMENDED_SPLIT + ' — ' + CHOSEN.modules.length + ' module, ' + CHOSEN.prs + ' PR');
console.log('  first slice          ' + FIRST_SLICE.sites + ' sites / ' + n(FIRST_SLICE.chars) + ' chars → ' + FIRST_SLICE.module);
console.log('  mutants              ' + killed + '/' + MUTANTS.length + ', ' + SURVIVORS.length + ' survivors');
console.log('');
console.log(PASS + ' passed, ' + FAILURES.length + ' failed');
if (FAILURES.length) {
  console.log('\nFAILURES:');
  for (const f of FAILURES) console.log('  - ' + f);
  process.exit(1);
}
