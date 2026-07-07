'use strict';
// Run: node tests/portfolio-aggregated-timeout.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(src, name) {
  const sig = 'async function ' + name + '(';
  const start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++; else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated function: ' + name);
}
let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) passed++; else { failed++; console.error('  ✗ ' + msg); } }
function makeCtx(fetchImpl) {
  const logs = [], warns = [];
  const ctx = {
    console: { log: (...a) => logs.push(a), warn: (...a) => warns.push(a), debug: () => {} },
    S: { portfolioLiveRefreshSeq: 0 }, BACKEND: 'https://backend.test', fetch: fetchImpl,
    AbortSignal: { timeout: (ms) => ({ timeoutMs: ms }) }, Date, JSON, Object, Array, String, parseFloat, isFinite,
    _portfolioRiskDebugEnabled: () => false, _backendAuthHeaders: (h) => h,
    _isBackendUnreachable: () => false, _noteBackendReachable: () => {},
    buildPortfolioLiveRefreshPayload: (positions) => ({ positions }),
    isActivePortfolioLeg: () => true, normalizeOptionLegSymbolAliases: (t, l) => l,
    getPreferredOptionDxlinkSymbol: (t, l) => l.streamerSymbol || l.optionSymbol || l.symbol
  };
  ctx.logs = logs; ctx.warns = warns; vm.createContext(ctx); vm.runInContext(extractFn(HTML, 'fetchPortfolioLiveRefresh'), ctx); return ctx;
}
const positions = [{ ticker: 'AAPL', legs: [{ type: 'CALL', streamerSymbol: '.AAPL260117C200' }] }, { ticker: 'MSFT', legs: [] }];
(async function(){
  let calls = [];
  let ctx = makeCtx(async (url, opts) => { calls.push({ url, opts, payload: JSON.parse(opts.body) }); return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true, underlyings: { AAPL: { price: 1, ivr: 20 } }, options: {} }) }; });
  let data = await ctx.fetchPortfolioLiveRefresh(positions);
  assert(data && data.ok === true, 'success response returned');
  assert(calls[0].url === 'https://backend.test/portfolio/live-refresh', 'calls live-refresh endpoint');
  assert(calls[0].payload.includeTechnicals === false, 'aggregate payload excludes technicals to keep request bounded');
  assert(calls[0].opts.signal.timeoutMs === 8000, 'aggregate timeout is fast/bounded at 8000ms');
  assert(ctx.logs.some(l => String(l[0]).includes('aggregated start tickers=2 optionSymbols=1 timeoutMs=8000')), 'start diagnostic includes counts and timeout');
  assert(ctx.logs.some(l => String(l[0]).includes('aggregated partial')), 'partial backend data is logged and returned instead of discarded');

  ctx = makeCtx(async () => { const e = new Error('The operation timed out.'); e.name = 'TimeoutError'; throw e; });
  data = await ctx.fetchPortfolioLiveRefresh(positions);
  assert(data === null, 'timeout returns null for existing bounded fallback path');
  assert(ctx.S.lastPortfolioLiveRefreshFailure.reason === 'timeout', 'TimeoutError classified as timeout');
  assert(ctx.logs.some(l => String(l[0]).includes('aggregated timeout') && String(l[0]).includes('fallback=bounded')), 'timeout diagnostic declares bounded fallback');
  assert(ctx.warns.length === 1, 'no unbounded retry loop on timeout');

  let resolvers = [];
  ctx = makeCtx((url, opts) => new Promise(resolve => resolvers.push(resolve)));
  const oldReq = ctx.fetchPortfolioLiveRefresh(positions);
  const newReq = ctx.fetchPortfolioLiveRefresh(positions);
  resolvers[1]({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, underlyings: { AAPL: { price: 2, ivr: 30 }, MSFT: { price: 3, ivr: 40 } }, options: { '.AAPL260117C200': { greeks: { delta: 0.5 }, quote: { mark: 1 } } }, greeksResolved: 1 }) });
  const newer = await newReq;
  resolvers[0]({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true, underlyings: { AAPL: { price: 1 } } }) });
  const older = await oldReq;
  assert(newer && newer.underlyings.AAPL.price === 2, 'newer aggregate response applies');
  assert(older === null, 'stale older aggregate response cannot overwrite newer success');

  assert(HTML.indexOf('missing_underlyings') !== -1 && HTML.indexOf('candle fan-out suppressed') !== -1, 'missing_underlyings candle fan-out suppression remains wired');
  if (failed) { console.error(`Failed ${failed} assertion(s), passed ${passed}`); process.exit(1); }
  console.log(`✓ portfolio aggregated timeout tests passed (${passed} assertions)`);
})();
