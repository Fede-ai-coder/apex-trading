'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Cross-browser portfolio Greeks apply — regression tests.
//
// Pins the fix for the Chrome-vs-Firefox divergence where a clean Chrome profile
// showed the position but left Greeks/totals as "--" while Firefox (which still had
// previously-applied Greeks in its in-memory cache) rendered them. The backend
// /portfolio/live-refresh round returned a quote but no fresh Greeks; Chrome started
// clean and had nothing to preserve.
//
// These exercise the REAL helpers extracted from index.html (no re-implementation):
//   _apexDetectBrowserLabel · _optionGreekFinite · _normalizeOptionGreeksPayload
//   _normalizeOptionQuotePayload · _legGreeksSnapshot · _applyOptionGreeksToCacheEntry
//
// Required acceptance cases:
//   1. quote-only response after valid Greeks preserves previous Greeks.
//   2. response with Greeks in an alternate payload shape is normalized and applied.
//   3. out-of-order refresh with null Greeks cannot overwrite newer valid Greeks.
//
// Run: node tests/portfolio-greeks-apply-preserve.test.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine) { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }
function eq(actual, expected, msg) {
  if (actual === expected) passed++;
  else { failed++; console.error('  ✗ ' + msg + ' — expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual)); }
}

const ctx = { console: { log() {}, warn() {}, error() {} }, isFinite, parseFloat, Number, Math, String, Date, Object };
vm.createContext(ctx);
[
  '_apexDetectBrowserLabel',
  '_optionGreekFinite',
  '_normalizeOptionGreeksPayload',
  '_normalizeOptionQuotePayload',
  '_legGreeksSnapshot',
  '_applyOptionGreeksToCacheEntry'
].forEach(name => vm.runInContext(extractFn(HTML, name), ctx));

// ── 1. quote-only response after valid Greeks preserves previous Greeks ───────
console.log('\n[1] quote-only refresh preserves previously-valid Greeks');
(function () {
  // Prior successful apply (seq 1): full Greeks + quote in cache.
  const prev = { delta: 0.55, theta: -0.12, gamma: 0.02, vega: 0.31, volatility: 0.21,
    bid: 1.20, ask: 1.40, mark: 1.30, greeksStale: false, greeksSeq: 1, source: 'BACKEND_PORTFOLIO_REFRESH' };
  // Next refresh: fresh quote, but Greeks stale/missing (the ABBV case).
  const opt = { greeks: null, quote: { bidPrice: 1.25, askPrice: 1.45, mark: 1.35 }, greeksStale: true, quoteStale: false };
  const r = ctx._applyOptionGreeksToCacheEntry(prev, opt, { sequenceNumber: 2 });
  eq(r.hasFreshGreeks, false, 'no fresh Greeks this round');
  eq(r.greeksPreservedFromPrevious, true, 'flag: Greeks preserved from previous');
  eq(r.merged.delta, 0.55, 'prior delta preserved (not nulled)');
  eq(r.merged.theta, -0.12, 'prior theta preserved');
  eq(r.merged.gamma, 0.02, 'prior gamma preserved');
  eq(r.merged.vega, 0.31, 'prior vega preserved');
  eq(r.merged.greeksStale, true, 'entry flagged greeksStale');
  eq(r.merged.greeksSeq, 1, 'greeksSeq stays at the last successful apply');
  // Quote still updates independently of Greeks.
  eq(r.merged.bid, 1.25, 'fresh quote bid applied');
  eq(r.merged.ask, 1.45, 'fresh quote ask applied');
  eq(r.merged.mark, 1.35, 'fresh quote mark applied');
})();

// A clean profile (no prior cache) genuinely has nothing to preserve → caller must
// fall back to direct recovery / explicit warning (covered by integration checks).
(function cleanProfileHasNoGreeksToPreserve() {
  const opt = { greeks: null, quote: { bidPrice: 1.25, askPrice: 1.45, mark: 1.35 }, greeksStale: true, quoteStale: false };
  const r = ctx._applyOptionGreeksToCacheEntry(null, opt, { sequenceNumber: 1 });
  eq(r.hasFreshGreeks, false, 'clean profile: no fresh Greeks');
  eq(r.greeksPreservedFromPrevious, false, 'clean profile: nothing to preserve');
  assert(r.merged.delta == null, 'clean profile: delta stays null (no fabricated Greeks)');
  eq(r.merged.greeksUnavailableReason, 'STALE', 'reason surfaced for the warning path');
  eq(r.merged.mark, 1.35, 'clean profile still gets the quote');
})();

// ── 2. alternate payload shapes are normalized and applied ────────────────────
console.log('\n[2] alternate Greeks payload shapes are normalized and applied');
(function () {
  const G = { delta: 0.40, theta: -0.05, gamma: 0.01, vega: 0.20, volatility: 0.18 };
  // 2a. greeks nested under .option.greeks
  const rA = ctx._applyOptionGreeksToCacheEntry(null, { option: { greeks: G }, greeksStale: false }, { sequenceNumber: 1 });
  eq(rA.hasFreshGreeks, true, '2a option.greeks resolves');
  eq(rA.merged.delta, 0.40, '2a delta normalized from option.greeks');
  // 2b. greeks nested under .quote.greeks (with a quote alongside)
  const rB = ctx._applyOptionGreeksToCacheEntry(null, { quote: { greeks: G, bidPrice: 1, askPrice: 1.2 }, greeksStale: false, quoteStale: false }, { sequenceNumber: 1 });
  eq(rB.hasFreshGreeks, true, '2b quote.greeks resolves');
  eq(rB.merged.theta, -0.05, '2b theta normalized from quote.greeks');
  eq(rB.merged.bid, 1, '2b quote still applied alongside nested greeks');
  // 2c. greeks inlined directly on the option payload
  const rC = ctx._applyOptionGreeksToCacheEntry(null, { delta: 0.40, theta: -0.05, gamma: 0.01, vega: 0.20, greeksStale: false }, { sequenceNumber: 1 });
  eq(rC.hasFreshGreeks, true, '2c inlined greeks resolve');
  eq(rC.merged.vega, 0.20, '2c vega normalized from inlined payload');
  // 2d. volatility aliases (impliedVolatility / iv)
  eq(ctx._normalizeOptionGreeksPayload({ greeks: { delta: 0.4, impliedVolatility: 0.22 } }).volatility, 0.22, '2d impliedVolatility → volatility');
  eq(ctx._normalizeOptionGreeksPayload({ greeks: { delta: 0.4, iv: 0.19 } }).volatility, 0.19, '2d iv → volatility');
  // 2e. empty greeks object ({}) is NOT treated as fresh greeks
  eq(ctx._normalizeOptionGreeksPayload({ greeks: {} }), null, '2e empty greeks object → null');
  const rE = ctx._applyOptionGreeksToCacheEntry(null, { greeks: {}, quote: { mark: 1.1 }, greeksStale: false }, { sequenceNumber: 1 });
  eq(rE.hasFreshGreeks, false, '2e empty greeks object does not resolve');
  // 2f. canonical .greeks shape still works (no regression)
  const rF = ctx._applyOptionGreeksToCacheEntry(null, { greeks: G, quote: { bidPrice: 1, askPrice: 1.2, mark: 1.1 }, greeksStale: false, quoteStale: false }, { sequenceNumber: 1 });
  eq(rF.hasFreshGreeks, true, '2f canonical .greeks still resolves');
  eq(rF.merged.delta, 0.40, '2f canonical delta applied');
})();

// ── 3. out-of-order refresh with null Greeks cannot overwrite newer valid Greeks ─
console.log('\n[3] out-of-order / null Greeks cannot clobber newer valid Greeks');
(function () {
  // Newer valid Greeks already applied at seq 5.
  const prev = { delta: 0.50, theta: -0.10, gamma: 0.02, vega: 0.30, greeksStale: false, greeksSeq: 5 };

  // 3a. An OLDER-sequence response (seq 3) carrying *fresh* Greeks must be rejected.
  const rOld = ctx._applyOptionGreeksToCacheEntry(prev, { greeks: { delta: 0.99, theta: -0.99, gamma: 0.09, vega: 0.99 }, greeksStale: false }, { sequenceNumber: 3 });
  eq(rOld.staleRejected, true, '3a older-seq response rejected for Greeks');
  eq(rOld.hasFreshGreeks, false, '3a older-seq Greeks not treated as fresh');
  eq(rOld.merged.delta, 0.50, '3a newer Greeks NOT overwritten by older seq');
  eq(rOld.merged.greeksSeq, 5, '3a greeksSeq stays at the newer apply');

  // 3b. A null/stale Greeks response (even at a NEWER seq 6) must not clear valid Greeks.
  const rNull = ctx._applyOptionGreeksToCacheEntry(prev, { greeks: null, greeksStale: true, quote: { mark: 1.10 }, quoteStale: false }, { sequenceNumber: 6 });
  eq(rNull.hasFreshGreeks, false, '3b null Greeks are not fresh');
  eq(rNull.merged.delta, 0.50, '3b null Greeks did NOT clear the valid Greeks');
  eq(rNull.greeksPreservedFromPrevious, true, '3b preservation flagged');
  eq(rNull.merged.mark, 1.10, '3b quote still updates');

  // 3c. A NEWER-sequence response with fresh Greeks DOES overwrite (forward progress).
  const rNew = ctx._applyOptionGreeksToCacheEntry(prev, { greeks: { delta: 0.70, theta: -0.20, gamma: 0.03, vega: 0.40 }, greeksStale: false }, { sequenceNumber: 6 });
  eq(rNew.hasFreshGreeks, true, '3c newer fresh Greeks apply');
  eq(rNew.merged.delta, 0.70, '3c newer Greeks overwrite older value');
  eq(rNew.merged.greeksSeq, 6, '3c greeksSeq advances to 6');
})();

// ── 4. helper units: _legGreeksSnapshot, _optionGreekFinite, browser label ────
console.log('\n[4] helper units');
(function () {
  // _legGreeksSnapshot
  assert(ctx._legGreeksSnapshot({ delta: 0.5, theta: -0.1 }) != null, '4 finite leg → snapshot');
  eq(ctx._legGreeksSnapshot({ delta: 0.5, theta: -0.1, gamma: null, vega: null }).delta, 0.5, '4 snapshot keeps finite delta');
  eq(ctx._legGreeksSnapshot({ delta: null, theta: null, gamma: null, vega: null }), null, '4 all-null leg → null');
  eq(ctx._legGreeksSnapshot({ delta: 0.5, priceSource: 'terminal_leg_placeholder' }), null, '4 terminal placeholder → null');
  eq(ctx._legGreeksSnapshot(null), null, '4 null leg → null');
  // _optionGreekFinite
  eq(ctx._optionGreekFinite('0.55'), 0.55, '4 parses numeric strings');
  eq(ctx._optionGreekFinite(null), null, '4 null → null');
  eq(ctx._optionGreekFinite(NaN), null, '4 NaN → null');
  // browser label (the audit "browser" field)
  eq(ctx._apexDetectBrowserLabel('Mozilla/5.0 (Windows) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'), 'chrome', '4 Chrome UA → chrome');
  eq(ctx._apexDetectBrowserLabel('Mozilla/5.0 (Windows; rv:125.0) Gecko/20100101 Firefox/125.0'), 'firefox', '4 Firefox UA → firefox');
  eq(ctx._apexDetectBrowserLabel('Mozilla/5.0 AppleWebKit/537.36 Chrome/124 Safari/537.36 Edg/124.0'), 'edge', '4 Edge UA → edge');
  eq(ctx._apexDetectBrowserLabel('Mozilla/5.0 (Macintosh) AppleWebKit/605.1 Version/17.0 Safari/605.1'), 'safari', '4 Safari (no Chrome) → safari');
  eq(ctx._apexDetectBrowserLabel(''), 'unknown', '4 empty UA → unknown');
  // _normalizeOptionQuotePayload alternate shapes
  eq(ctx._normalizeOptionQuotePayload({ option: { quote: { bid: 1, ask: 1.2 } } }).bidPrice, 1, '4 option.quote.bid → bidPrice');
  eq(ctx._normalizeOptionQuotePayload({ currentPrice: 2.5 }).mark, 2.5, '4 inlined currentPrice → mark');
})();

// ── 5. integration: the live refresh wires the helpers + audit + recovery + warn ─
console.log('\n[5] refreshPositionsLive integration wiring');
(function () {
  assert(HTML.includes("[PORTFOLIO-GREEKS-APPLY-AUDIT]"), '5 audit log line present');
  assert(HTML.includes('_applyOptionGreeksToCacheEntry(S.greeksCache[sym] || null, o, {'), '5 cache-merge uses the normalizing helper');
  assert(HTML.includes("sequenceNumber: _greeksApplySeq"), '5 cache-merge passes the apply sequence id');
  assert(HTML.includes('S.portfolioGreeksApplySeq = (S.portfolioGreeksApplySeq || 0) + 1;'), '5 greeks apply seq incremented per refresh');
  assert(HTML.includes("legLive.greeksSource = _prevLegSnap ? 'preserved_previous_leg_state' : 'preserved_journal_trade';"), '5 per-leg preservation from previous state');
  assert(HTML.includes('CLEAN-BROWSER GREEKS RECOVERY'), '5 clean-browser direct recovery block present');
  assert(HTML.includes("fetchBackendOptionLive(s, { skipQuote: true, refreshSeq: _recSeq })"), '5 recovery performs a direct greeks read');
  assert(HTML.includes("ll.greeksSource = 'direct_greeks_recovery';"), '5 recovery re-applies greeks onto legsLive');
  assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.directGreeksRefresh = _greeksRecovery;'), '5 direct refresh diagnostics surfaced');
  assert(HTML.includes('_apexPortfolioGreeksRefreshDiag.greeksWarning = _greeksWarning;'), '5 greeks warning surfaced on the diag');
  assert(HTML.includes("showToast(_warnMsg, 'warn');"), '5 explicit warning toast when greeks unavailable');
  // The audit object carries every required scalar field.
  const auditIdx = HTML.indexOf("console.log('[PORTFOLIO-GREEKS-APPLY-AUDIT]'");
  const auditBlock = HTML.slice(auditIdx, auditIdx + 1600);
  ['browser', 'portfolioId', 'tradeId', 'ticker', 'symbol', 'requestOptionCount', 'responseOptionCount',
   'hasOptionPayload', 'hasQuote', 'hasGreeks', 'greeksKeys', 'greeksStale', 'greeksUnavailableReason',
   'greeksWarning', 'greeksPreservedFromPrevious', 'directGreeksRefreshAttempted', 'directGreeksRefreshSymbolsCount',
   'directGreeksRefreshResolvedCount', 'legHadGreeksBefore', 'legHasGreeksAfter', 'rowDeltaAfter', 'rowThetaAfter',
   'totalDeltaAfter', 'totalThetaAfter', 'totalVegaAfter'].forEach(function (k) {
    assert(auditBlock.indexOf(k + ':') !== -1, '5 audit field present: ' + k);
  });
})();

console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
process.exit(failed ? 1 : 0);
