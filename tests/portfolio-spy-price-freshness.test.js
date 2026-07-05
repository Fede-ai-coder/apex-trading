'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO — SPY price freshness before candle-close fallback.
//
// SPY is the benchmark for beta-weighted delta (βΔ SPY-EQ). The Portfolio was
// falling to CANDLE_CLOSE_FALLBACK for SPY even when a fresher source was available
// (observed on preview #296: "[PORTFOLIO SPY PRICE] fallback used
// source=CANDLE_CLOSE_FALLBACK"). resolveFreshSpyPrice extracts the REAL function
// from index.html and proves it tries the fresher sources IN ORDER —
//   market_live (/market/live/SPY + /market/quotes) → scanner → market_context —
// with explicit [PortfolioSpyPrice] per-source diagnostics, and NEVER requests
// candles here (candle close stays the caller's explicit last resort).
//
//   1. /market/live/SPY valid quote wins over candle close (and over scanner/context).
//   2. scanner SPY valid price is used when the live quote is unavailable.
//   3. market_context SPY price is used when live + scanner are unavailable and fresh.
//   4. candle close is only reachable AFTER every fresher source fails (resolver never
//      touches candles; the SPY call site gates candle on _spyFresh.price == null).
//   5. a stale/invalid live quote is rejected with an explicit diagnostic.
//   6. the βΔ SPY-EQ calculation receives the selected SPY price (formula UNCHANGED).
//   7. #295 option-chain priority markers remain untouched.
//   8. #296 PortfolioTechnical parity-alias behavior remains untouched.
//
// Run: node tests/portfolio-spy-price-freshness.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
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
function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.error('  ✗ ' + msg); }
}
function near(a, b, eps, msg) { assert(a != null && Math.abs(a - b) <= (eps || 1e-6), msg + ' (got ' + a + ', want ' + b + ')'); }

// A minimal Response-like object for the injected fetchImpl.
function resp(ok, body) { return { ok: ok, json: async () => body }; }

// Build a sandbox with the SPY freshness resolver + the βΔ row calculator + the
// market-context snapshot cache. Captures console.log so the [PortfolioSpyPrice]
// diagnostics can be asserted. `S` carries a real marketContextSnapshot slot so the
// resolver's default (global) snapshot read and the cache helper can be exercised.
function makeCtx() {
  const logs = [];
  const ctx = {
    console: { log: (...a) => logs.push(a.join(' ')), debug: () => {}, warn: () => {}, error: () => {} },
    AbortSignal: (typeof AbortSignal !== 'undefined') ? AbortSignal : { timeout: () => undefined },
    // computeRowBetaWeightedDelta consults _scanDataField only when the position lacks a
    // valid beta/price; the fixtures below always supply both, so a null stub is enough.
    _scanDataField: () => null,
    _apexLatestBetaBySymbol: {},
    _portfolioNetGreekFromActiveLegs: () => null,
    isActivePortfolioLeg: () => true,
    S: { marketContextSnapshot: { data: null, updatedAt: null, source: null, vixSource: null, error: null }, vixFamily: null },
  };
  ctx._logs = logs;
  vm.createContext(ctx);
  const src = [
    extractFn(HTML, '_cachePortfolioMarketContextSnapshot'),
    extractFn(HTML, '_spyContextAvailableKeys'),
    extractFn(HTML, '_spyFreshNum'),
    extractFn(HTML, '_spyContextPrice'),
    extractFn(HTML, 'resolveFreshSpyPrice'),
    extractFn(HTML, 'computeRowBetaWeightedDelta'),
  ].join('\n');
  vm.runInContext(src, ctx);
  return ctx;
}

(async function run() {
  // ── 1. /market/live/SPY valid quote wins (over candle, scanner, and context) ──
  {
    const ctx = makeCtx();
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: true,
      fetchImpl: async (url) => url.indexOf('/market/live/SPY') !== -1
        ? resp(true, { source: 'DXLINK', isStale: false, quote: { mark: 521.34 } })
        : resp(true, { quotes: [] }),
      ttCallImpl: async () => ({ quotes: [{ symbol: 'SPY', mark: 999 }] }),          // would win if reached
      snapshot: { data: { technicals: { SPY: { '1D': { close: 400 } } } } },         // would win if reached
    });
    assert(r.price === 521.34 && r.source === 'market_live' && r.isLive === true,
      '1: market_live valid quote selected (got ' + r.source + ' ' + r.price + ')');
    assert(!r.attempts.some(a => a.source === 'scanner' || a.source === 'market_context'),
      '1: fresher live source short-circuits scanner/market_context');
    assert(!r.attempts.some(a => /candle/i.test(a.source)),
      '1: resolveFreshSpyPrice never reaches candle close');
    assert(ctx._logs.some(l => l === '[PortfolioSpyPrice] source_success source=market_live price=521.34'),
      '1: source_success diagnostic emitted for market_live');
  }

  // ── 2. scanner used when the live quote is unavailable ───────────────────────
  {
    const ctx = makeCtx();
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: true,
      fetchImpl: async (url) => url.indexOf('/market/live/SPY') !== -1
        ? resp(true, { source: 'DXLINK', isStale: false, quote: {} })                // no usable price
        : resp(true, { quotes: [] }),                                                // /market/quotes empty
      ttCallImpl: async () => ({ quotes: [{ symbol: 'SPY', mark: 520.10 }] }),
      snapshot: null,
    });
    assert(r.price === 520.10 && r.source === 'scanner' && r.isLive === true,
      '2: scanner price used when market_live unavailable (got ' + r.source + ' ' + r.price + ')');
    assert(r.attempts.some(a => a.source === 'market_live' && a.ok === false),
      '2: market_live recorded as a rejected attempt before scanner');
  }

  // ── 3. market_context used when live + scanner are unavailable and fresh ─────
  {
    const ctx = makeCtx();
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: false,                                              // scanner not attempted (auth not ready)
      fetchImpl: async (url) => url.indexOf('/market/live/SPY') !== -1
        ? resp(true, { source: 'DXLINK', isStale: false, quote: {} })
        : resp(true, { quotes: [] }),
      snapshot: { data: { technicals: { SPY: { '1D': { close: 519.87 } } } } },
    });
    assert(r.price === 519.87 && r.source === 'market_context' && r.isLive === false,
      '3: market_context SPY close used (got ' + r.source + ' ' + r.price + ')');
    assert(r.attempts.some(a => a.source === 'scanner' && a.ok === false && a.reason === 'backend_auth_not_ready'),
      '3: scanner rejected as backend_auth_not_ready when TT not connected');
  }

  // ── 4. candle close is only reachable AFTER every fresher source fails ───────
  {
    const ctx = makeCtx();
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: false,
      fetchImpl: async () => resp(true, { quotes: [] }),                            // live + quotes empty
      snapshot: null,                                                               // no context
    });
    assert(r.price === null && r.reason === 'no_fresh_spy_source',
      '4: no fresh source → null result with no_fresh_spy_source reason');
    assert(r.attempts.every(a => ['market_live', 'scanner', 'market_context'].indexOf(a.source) !== -1),
      '4: only fresh sources attempted — resolver never fetches candles itself');
    // The SPY call site gates the generic resolver's candle on the fresh result being empty.
    assert(HTML.includes('allowCandle: (_spyPmPrice == null && _spyFresh.price == null)'),
      '4: SPY call site only allows candle close when no fresher source resolved');
    assert(HTML.includes("await resolveFreshSpyPrice({ ttConnected: S.ttConnected })"),
      '4: refreshPositionsLive resolves fresh SPY sources before the generic resolver');
    // Healthy-case short-circuit: a live priceMap SPY skips the extra fresh fetch.
    assert(HTML.includes('var _spyFresh = (_spyPmPrice != null)'),
      '4: fresh resolver is skipped when SPY is already live in priceMap (no extra fetch)');
  }

  // ── 5. a stale/invalid live quote is rejected with an explicit diagnostic ────
  {
    const ctx = makeCtx();
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: false,
      fetchImpl: async (url) => url.indexOf('/market/live/SPY') !== -1
        ? resp(true, { source: 'DXLINK', isStale: true, quote: { mark: 999 } })     // STALE — must be rejected
        : resp(true, { quotes: [] }),                                               // quote-batch fallback empty too
      snapshot: null,
    });
    assert(r.price === null,
      '5: stale live quote is not accepted as the SPY price');
    assert(r.attempts.some(a => a.source === 'market_live' && a.ok === false && a.reason === 'stale_live_quote'),
      '5: stale live quote rejected with reason=stale_live_quote');
    assert(ctx._logs.some(l => l === '[PortfolioSpyPrice] source_rejected source=market_live reason=stale_live_quote'),
      '5: source_rejected diagnostic emitted for the stale live quote');
  }

  // ── 6. the βΔ SPY-EQ calculation receives the SELECTED SPY price (formula same) ─
  {
    const ctx = makeCtx();
    const sel = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: false,
      fetchImpl: async (url) => url.indexOf('/market/live/SPY') !== -1
        ? resp(true, { source: 'DXLINK', isStale: false, quote: { mark: 521.34 } })
        : resp(true, { quotes: [] }),
      snapshot: null,
    });
    assert(sel.price === 521.34, '6: fresh resolver selected the live SPY price');
    const pos = { ticker: 'AAPL', delta: 0.5, beta: 1.2, underlyingPrice: 230 };
    const row = ctx.computeRowBetaWeightedDelta(pos, sel.price);
    assert(row.spyPrice === 521.34, '6: βΔ row receives the selected SPY price');
    near(row.betaWeightedDeltaSpyEq, 0.5 * 1.2 * (230 / 521.34), 1e-9,
      '6: βΔ SPY-EQ = delta × beta × (underlying / selectedSpy) — formula unchanged');
  }

  // ── 7. #295 option-chain priority markers remain untouched ───────────────────
  {
    assert(HTML.includes('function _optionChainPriorityActive('),
      '7: _optionChainPriorityActive still present (#295)');
    assert(HTML.includes("'[OptionChainPriority] paused portfolio ' + kind + ' fallback ticker=' + ticker + ' reason=option_chain_pending'"),
      '7: option-chain fallback pause diagnostic preserved (#295)');
    assert(HTML.includes('optionChainPriorityPending'),
      '7: option-chain priority pending flag preserved (#295)');
  }

  // ── 8. #296 PortfolioTechnical parity-alias behavior remains untouched ───────
  {
    assert(HTML.includes('function buildFormulaParityGate('),
      '8: buildFormulaParityGate still present (#296)');
    assert(HTML.includes('appliedParityAliases'),
      '8: parity alias mapping preserved (#296)');
    assert(HTML.includes('required1DParityConfirmed'),
      '8: 1D parity-confirmed gate preserved (#296)');
    assert(HTML.includes('[PortfolioTechnical] mapping applied count='),
      '8: PortfolioTechnical "mapping applied count" diagnostic preserved (#296)');
  }

  // ── 9. the full /market-context/snapshot payload is cached without breaking VIX ─
  {
    const ctx = makeCtx();
    ctx.S.vixFamily = { vix: 14.2, vix9d: 13.1 };                                    // pre-existing VIX family
    const payload = { source: 'BACKEND', vixFamily: { vix: 14.2 }, technicals: { SPY: { '1D': { close: 601.22 } } } };
    ctx._cachePortfolioMarketContextSnapshot(payload);
    assert(ctx.S.marketContextSnapshot.data === payload,
      '9: full snapshot payload stored on S.marketContextSnapshot.data');
    assert(ctx.S.marketContextSnapshot.source === 'BACKEND' && ctx.S.marketContextSnapshot.updatedAt != null,
      '9: snapshot source + updatedAt recorded');
    assert(ctx.S.vixFamily && ctx.S.vixFamily.vix === 14.2 && ctx.S.vixFamily.vix9d === 13.1,
      '9: caching the snapshot does NOT mutate S.vixFamily (VIX behavior preserved)');
    // The single fetch choke point caches the payload for every caller.
    assert(HTML.includes('_cachePortfolioMarketContextSnapshot(data);'),
      '9: fetchMarketContextSnapshotFromBackend caches the snapshot on success');
  }

  // ── 10. resolveFreshSpyPrice reads SPY from the STORED (global S) snapshot ────
  {
    const ctx = makeCtx();
    ctx._cachePortfolioMarketContextSnapshot({ source: 'BACKEND', technicals: { SPY: { '1D': { close: 601.22 } } } });
    // No `snapshot` in deps → the resolver falls back to S.marketContextSnapshot.
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: false,
      fetchImpl: async () => resp(true, { quotes: [] }),                            // live + quotes empty
    });
    assert(r.price === 601.22 && r.source === 'market_context' && r.isLive === false,
      '10: SPY resolved from the already-stored market-context snapshot (got ' + r.source + ' ' + r.price + ')');
    assert(!r.attempts.some(a => /candle/i.test(a.source)),
      '10: candle fallback not used when market_context supplies SPY');
    assert(ctx._logs.some(l => l === '[PortfolioSpyPrice] source_success source=market_context price=601.22'),
      '10: source_success diagnostic emitted for market_context');
  }

  // ── 11. snapshot present but no SPY price → availableKeys diagnostic ──────────
  {
    const ctx = makeCtx();
    const r = await ctx.resolveFreshSpyPrice({
      backend: '', ttConnected: false,
      fetchImpl: async () => resp(true, { quotes: [] }),
      snapshot: { data: { source: 'BACKEND', vixFamily: { vix: 14 }, regime: {}, technicals: { VI3M: { '1D': { close: 20 } } } } },
    });
    assert(r.price === null, '11: no SPY in context → not resolved from market_context');
    const rej = r.attempts.find(a => a.source === 'market_context' && a.ok === false);
    assert(rej && rej.reason === 'no_spy_price_in_context',
      '11: market_context rejected with reason=no_spy_price_in_context');
    assert(rej && typeof rej.availableKeys === 'string' && rej.availableKeys.indexOf('technicals=') !== -1,
      '11: rejection carries availableKeys listing what the snapshot contained');
    assert(ctx._logs.some(l => l.indexOf('[PortfolioSpyPrice] source_rejected source=market_context reason=no_spy_price_in_context availableKeys=') === 0),
      '11: availableKeys diagnostic logged for the missing-SPY snapshot');
  }

  console.log('\n' + (failed ? ('FAIL: ' + failed + ' assertion(s), ' + passed + ' passed') : ('PASS: all ' + passed + ' assertions')));
  process.exit(failed ? 1 : 0);
})();
