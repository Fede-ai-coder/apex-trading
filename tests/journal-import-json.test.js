'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// MANUAL JOURNAL TRADE IMPORT — apexImportJournalTradesJson(jsonOrArray, opts).
//
// Console-only cross-host migration: paste main-production's apex_trades and
// upload them to the (empty) dev backend so Portfolio reconciliation has data.
// This suite reproduces the verified bug — a backend that persists the portfolio
// link under snake_case `portfolio_id` and drops camelCase `portfolioId` — and
// proves the end-to-end fix: portfolioId is sent under every alias, normalized on
// read, and existing trades missing a portfolioId are REPAIRED (PUT), not skipped.
//
//   1. Import sends portfolioId in the POST body (under aliases).
//   2. GET after import + normalization yields a populated trade.portfolioId.
//   3. Re-import of an existing trade missing portfolioId UPDATES it (PUT).
//   4. A duplicate that already has the correct portfolioId stays `duplicate`.
//   5. Reconciliation links via String(trade.portfolioId) === String(portfolio.id).
//   6. No mutation of portfolio/trade ids; input objects untouched.
//   7. No localStorage writes; no migration/formula/scanner/candle refs; no auto-calls.
//
// Run: node tests/journal-import-json.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

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
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }
const J = (a) => JSON.stringify(a);

// Stateful SNAKE-CASE backend reproducing the bug: it persists the portfolio link
// only under `portfolio_id` and never echoes camelCase `portfolioId`. POST creates,
// PUT /journal/trades/:id merges (used by the portfolioId repair), GET returns all.
function makeSnakeBackend(initial) {
  const store = new Map();
  const calls = [];
  function persist(b) {
    const rec = Object.assign({}, b);
    if (rec.portfolio_id == null && rec.portfolioId != null) rec.portfolio_id = rec.portfolioId;
    delete rec.portfolioId;            // backend schema has no camelCase column
    delete rec.portfolio;              // and no scalar alias column
    rec.id = String(rec.id);
    return rec;
  }
  const router = function(p, o) {
    o = o || {};
    const method = o.method || 'GET';
    const body = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
    calls.push({ path: p, method, body });
    if (p === '/journal/trades' && method === 'GET') return { trades: Array.from(store.values()).map(x => Object.assign({}, x)) };
    if (p === '/journal/trades' && method === 'POST') { const r = persist(body); store.set(r.id, r); return { id: r.id }; }
    const m = p.match(/^\/journal\/trades\/(.+)$/);
    if (m && method === 'PUT') {
      const id = decodeURIComponent(m[1]);
      // Backend PUT is a FULL replace and enforces NOT NULL trades.ticker — a
      // partial { portfolioId } body must be rejected (reproduces the bug).
      if (!body || body.ticker == null) throw new Error('NOT NULL constraint failed: trades.ticker');
      const r = persist(Object.assign({}, body, { id }));
      store.set(id, r);
      return { id, ok: true };
    }
    return {};
  };
  // seed (already persisted shape)
  (initial || []).forEach(t => { const r = persist(t); store.set(r.id, r); });
  router._store = store;
  router._calls = calls;
  return router;
}

function makeJournalManager(initial) {
  let arr = (initial || []).slice();
  return {
    getAll() { return arr.slice(); },
    loadFromBackend(bt) {
      const map = {}; arr.forEach(t => map[String(t.id)] = t);
      let ch = 0; (bt || []).forEach(b => { map[String(b.id)] = b; ch++; });
      arr = Object.values(map); return ch;
    },
  };
}

function makeCtx(opts) {
  opts = opts || {};
  const backend = opts.backend || makeSnakeBackend([]);
  const jm = opts.journalManager || makeJournalManager([]);
  const calls = [];
  const ttCall = async function(p, o) { o = o || {}; calls.push({ path: p, method: o.method || 'GET', body: o.body }); return backend(p, o); };
  let renderCount = 0;
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    console: { log() {}, warn() {}, error() {} },
    JSON, Array, Date, String, Object, Promise, Set, RegExp, Math, encodeURIComponent, decodeURIComponent,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    _activeView: opts.activeView || 'portfolio',
    ttCall,
    journalManager: jm,
    portfolioManager: { getAll: () => (opts.portfolios || []).slice() },
    ffBackendOffloadV1: () => false,
    renderPortfolioView() { renderCount++; },
    showToast() {},
  };
  ctx.setTimeout = setTimeout;
  vm.createContext(ctx);
  vm.runInContext([
    // Module-level state used by the transient-sync resilience path.
    'var _jLastKnownGoodTrades = null; var _jLastKnownGoodCount = 0; var _journalSyncFailed = false;',
    'var _journalLastBackendSaveStatus = null;',
    extractFn(HTML, '_recordJournalBackendSave'),
    extractFn(HTML, '_httpStatusFromError'),
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, '_resolveTradePortfolioId'),
    extractFn(HTML, '_normalizeBackendTradePortfolioId'),
    // Option-symbol alias helpers used by _tradeForBackend when trades carry legs.
    extractFn(HTML, 'buildStreamerSymbol'),
    extractFn(HTML, 'buildCompactOptionDxlinkSymbol'),
    extractFn(HTML, 'buildOptionDxlinkSymbolCandidate'),
    extractFn(HTML, 'isOptionStreamerSymbolConsistent'),
    extractFn(HTML, 'getPreferredOptionDxlinkSymbol'),
    extractFn(HTML, 'parseCompactOptionDxlinkSymbol'),
    extractFn(HTML, 'normalizeOptionLegSymbolAliases'),
    extractFn(HTML, 'normalizeTradeOptionLegAliases'),
    extractFn(HTML, '_tradeForBackend'),
    extractFn(HTML, 'jSaveRemote'),
    // Transient-network resilience helpers used by _jSyncJournalFromBackend.
    extractFn(HTML, '_isTransientFetchError'),
    extractFn(HTML, '_ttCallWithRetry'),
    extractFn(HTML, '_jRecordBackendSnapshot'),
    extractFn(HTML, '_jSyncJournalFromBackend'),
    extractFn(HTML, '_journalImportPayload'),
    extractFn(HTML, '_journalRepairPortfolioIdRemote'),
    extractFn(HTML, 'apexImportJournalTradesJson'),
  ].join('\n'), ctx);
  ctx._backend = backend;
  ctx._ttCalls = calls;
  ctx._jm = jm;
  ctx._renderCount = () => renderCount;
  return ctx;
}

// ── 1/2/5/6. fresh import end-to-end: sent under alias, normalized, reconciled ─
(async function() {
  const trades = [
    { id: 'm1', portfolioId: '101', status: 'OPEN',   ticker: 'AAA', createdAt: '2025-01-01', legs: [{ k: 1 }] },
    { id: 'm2', portfolioId: 202,   status: 'CLOSED', symbol: 'BBB', createdAt: '2025-02-02' },
    { id: 'm3', portfolioId: 303,   status: 'OPEN',   ticker: 'CCC', live: { transient: true } },
  ];
  const input = JSON.parse(JSON.stringify(trades));
  const inputSnapshot = J(input);
  const ctx = makeCtx({ portfolios: [{ id: 101 }, { id: 202 }, { id: 303 }] });
  const rep = await ctx.apexImportJournalTradesJson(JSON.stringify(input));

  // 1: POST body carried the portfolio link under aliases (backend kept portfolio_id)
  const posts = ctx._backend._calls.filter(c => c.path === '/journal/trades' && c.method === 'POST');
  assert(posts.length === 3, '1: 3 trades POSTed');
  assert(posts[0].body.portfolioId === '101' && posts[0].body.portfolio_id === '101', '1: POST body includes portfolioId + portfolio_id aliases');
  assert(ctx._backend._store.get('m1').portfolio_id === '101', '1: backend persisted portfolio_id from the import');
  assert(!('portfolioId' in ctx._backend._store.get('m1')), '1: backend (snake-only) dropped camelCase, reproducing the bug');
  assert(!('live' in ctx._backend._store.get('m3')), '1: transient .live dropped');

  // 2: GET + normalization repopulated trade.portfolioId in journalManager
  assert(ctx._jm.getAll().length === 3, '2: journalManager populated');
  ctx._jm.getAll().forEach(t => assert(t.portfolioId != null, '2: ' + t.id + ' has normalized portfolioId after sync'));
  assert(rep.backendTradeCount === 3, '2: backendTradeCount = 3');
  assert(rep.tradesMissingPortfolioIdAfterImport === 0, '2: no backend trade missing portfolioId after import');

  // 5: reconciliation links the normalized trades
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 3 && rec.unassignedTradeCount === 0, '5: all 3 assigned via tolerant matching');
  assert(rec.perPortfolio['101'].linkedTradeCount === 1 && rec.perPortfolio['101'].openLinked === 1, '5: Live linked/open > 0');

  // 6: input objects not mutated
  assert(J(input) === inputSnapshot, '6: input trade objects untouched');
  assert(rep.imported === 3 && rep.updated === 0 && rep.duplicate === 0, '6: report counts (imported=3)');
  console.log('✓ 1/2/5/6 fresh import: alias send, normalize, reconcile, no mutation');
})();

// ── 3. RE-IMPORT REPAIR: existing trades without portfolioId get updated (PUT) ─
(async function() {
  // Backend already holds 3 trades imported WITHOUT any portfolio link (the
  // verified 96-trade situation, scaled down). Re-import with portfolioId.
  const backend = makeSnakeBackend([
    { id: 'r1', status: 'OPEN',   ticker: 'AAA' },   // no portfolio_id
    { id: 'r2', status: 'CLOSED', ticker: 'BBB' },
    { id: 'r3', status: 'OPEN',   ticker: 'CCC' },
  ]);
  // sanity: seeded trades have no portfolio link
  assert(Array.from(backend._store.values()).every(t => t.portfolio_id == null), 'pre: seeded trades lack portfolio_id');

  const ctx = makeCtx({ backend, portfolios: [{ id: 101, name: 'Live' }, { id: 202, name: 'Testing' }] });
  const rep = await ctx.apexImportJournalTradesJson([
    { id: 'r1', portfolioId: 101, status: 'OPEN',   ticker: 'AAA' },
    { id: 'r2', portfolioId: 101, status: 'CLOSED', ticker: 'BBB' },
    { id: 'r3', portfolioId: 202, status: 'OPEN',   ticker: 'CCC' },
  ]);

  const puts = backend._calls.filter(c => c.method === 'PUT');
  assert(puts.length === 3, '3: 3 PUT repairs issued for existing trades missing portfolioId');
  // CRITICAL: repair must send a COMPLETE trade, not a partial { portfolioId } body
  // (the NOT NULL trades.ticker backend would otherwise reject it).
  assert(puts.every(c => c.body && c.body.ticker != null), '3: repair PUT body includes ticker (full payload, not partial)');
  assert(puts[0].body.status != null && (puts[0].body.portfolioId != null || puts[0].body.portfolio_id != null),
    '3: repair PUT body carries status + portfolioId aliases');
  assert(rep.updated === 3 && rep.imported === 0 && rep.duplicate === 0 && rep.failed === 0, '3: report updated=3, failed=0, not duplicate');
  assert(backend._store.get('r1').portfolio_id === 101 && backend._store.get('r1').ticker === 'AAA', '3: backend trade repaired with portfolio_id, ticker preserved');
  assert(rep.tradesMissingPortfolioIdAfterImport === 0, '3: nothing missing portfolioId after repair');

  // reconciliation now links the repaired trades
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 3 && rec.unassignedTradeCount === 0, '3: reconciliation links repaired trades');
  assert(rec.perPortfolio['101'].linkedTradeCount === 2, '3: Live linkedTradeCount = 2 after repair');
  console.log('✓ 3 re-import repairs existing trades missing portfolioId (PUT, counted updated)');
})();

// ── 4. duplicate that ALREADY has portfolioId stays duplicate (no PUT/POST) ───
(async function() {
  const backend = makeSnakeBackend([{ id: 'd1', portfolioId: 101, status: 'OPEN' }]);   // seeded WITH link
  assert(backend._store.get('d1').portfolio_id === 101, 'pre: seeded duplicate has portfolio_id');
  const ctx = makeCtx({ backend, portfolios: [{ id: 101 }] });
  const rep = await ctx.apexImportJournalTradesJson([{ id: 'd1', portfolioId: 101, status: 'OPEN' }]);
  assert(rep.duplicate === 1 && rep.updated === 0 && rep.imported === 0, '4: counted duplicate, not updated/imported');
  assert(backend._calls.filter(c => c.method === 'POST' || c.method === 'PUT').length === 0, '4: no POST/PUT for an already-linked duplicate');
  console.log('✓ 4 duplicate with correct portfolioId stays duplicate (no write)');
})();

// ── mixed re-import: some already-linked (duplicate), some repaired (updated) ─
(async function() {
  // Mirrors the real preview: backend has all trades; some already carry the
  // portfolio link, the rest are missing it and must be repaired.
  const seed = [];
  for (let i = 1; i <= 5; i++) seed.push({ id: 'L' + i, status: 'OPEN', ticker: 'T' + i, portfolioId: 101 }); // already linked
  for (let i = 1; i <= 3; i++) seed.push({ id: 'M' + i, status: 'OPEN', ticker: 'U' + i });                    // missing link
  const backend = makeSnakeBackend(seed);
  const ctx = makeCtx({ backend, portfolios: [{ id: 101, name: 'Live' }, { id: 202, name: 'Testing' }] });

  const input = []
    .concat(seed.filter(t => t.id[0] === 'L').map(t => ({ id: t.id, status: 'OPEN', ticker: t.ticker, portfolioId: 101 })))
    .concat([
      { id: 'M1', status: 'OPEN', ticker: 'U1', portfolioId: 101 },
      { id: 'M2', status: 'OPEN', ticker: 'U2', portfolioId: 202 },
      { id: 'M3', status: 'OPEN', ticker: 'U3', portfolioId: 202 },
    ]);
  const rep = await ctx.apexImportJournalTradesJson(input);
  assert(rep.imported === 0, 'mixed: nothing newly imported (all ids already exist)');
  assert(rep.updated === 3, 'mixed: 3 repaired (the previously unlinked trades)');
  assert(rep.duplicate === 5, 'mixed: 5 already-linked stay duplicate');
  assert(rep.failed === 0, 'mixed: 0 failed (full payload satisfies NOT NULL ticker)');
  assert(rep.tradesMissingPortfolioIdAfterImport === 0, 'mixed: 0 missing portfolioId after repair');
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.perPortfolio['101'].linkedTradeCount === 6, 'mixed: Live linked = 5 + 1 repaired');
  assert(rec.perPortfolio['202'].linkedTradeCount === 2, 'mixed: Testing linked = 2 repaired');
  assert(rec.unassignedTradeCount === 0, 'mixed: nothing unassigned after repair');
  console.log('✓ mixed re-import: duplicates kept, missing repaired, report + reconciliation correct');
})();

// ── input validation + array acceptance + backend-unavailable abort ──────────
(async function() {
  const ctx = makeCtx({});
  assert((await ctx.apexImportJournalTradesJson([{ id: 'a1', portfolioId: 1, status: 'OPEN' }])).imported === 1, 'accepts a plain array');
  assert((await ctx.apexImportJournalTradesJson('{"not":"array"}')).ok === false, 'rejects non-array JSON');
  assert((await ctx.apexImportJournalTradesJson('nope{')).ok === false, 'rejects invalid JSON string');
  const off = makeCtx({ backendKey: '' });
  const r = await off.apexImportJournalTradesJson([{ id: 'a', portfolioId: 1 }]);
  assert(r.ok === false && r.errors[0] === 'backend_unavailable', 'aborts when backend unusable');
  console.log('✓ validation: array/JSON/bad-input + backend-unavailable abort');
})();

// ── normalization helper: fills from aliases, never overwrites ───────────────
(function() {
  const ctx = makeCtx({});
  assert(ctx._resolveTradePortfolioId({ portfolio_id: 7 }) === 7, 'resolve: snake_case');
  assert(ctx._resolveTradePortfolioId({ portfolio: '9' }) === '9', 'resolve: scalar portfolio');
  assert(ctx._resolveTradePortfolioId({ portfolioId: 1, portfolio_id: 2 }) === 1, 'resolve: camelCase wins when present');
  const a = { id: 'x', portfolio_id: 5 };
  const out = ctx._normalizeBackendTradePortfolioId(a);
  assert(out.portfolioId === 5 && a.portfolioId === undefined, 'normalize: fills clone, does not mutate source');
  const b = { id: 'y', portfolioId: 3, portfolio_id: 99 };
  assert(ctx._normalizeBackendTradePortfolioId(b).portfolioId === 3, 'normalize: never overwrites an existing portfolioId');
  console.log('✓ normalization fills from aliases and never overwrites');
})();

// ── static guards: non-destructive, read-only, no auto-call sites ────────────
(function() {
  const body = extractFn(HTML, 'apexImportJournalTradesJson') + '\n' +
               extractFn(HTML, '_journalImportPayload') + '\n' +
               extractFn(HTML, '_journalRepairPortfolioIdRemote') + '\n' +
               extractFn(HTML, '_normalizeBackendTradePortfolioId') + '\n' +
               extractFn(HTML, '_resolveTradePortfolioId');
  assert(body.indexOf('localStorage.clear') === -1, 'no localStorage.clear');
  assert(body.indexOf('localStorage.removeItem') === -1 && body.indexOf('removeItem(') === -1, 'no removeItem');
  assert(body.indexOf('localStorage.setItem') === -1, 'never writes localStorage');
  const codeOnly = body.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(codeOnly.indexOf('jMigrateApexTradesToBackend') === -1, 'never calls jMigrateApexTradesToBackend');
  ['aggregateGreeks', 'computePortfolioRisk', 'portfolioRiskMetrics', 'calcVega', 'calcTheta',
   'betaWeightedDelta', 'computeBWD', 'runScanner', 'candleStore', 'marketContext', 'vixFamily']
    .forEach(fn => assert(codeOnly.indexOf(fn) === -1, 'does not reference ' + fn));
  // only the import repair PUT may assign portfolio_id; it never reassigns an
  // existing camelCase trade.portfolioId on the input (mutation guard).
  assert(codeOnly.indexOf('t.portfolioId =') === -1 && codeOnly.indexOf('t.portfolioId=') === -1, 'never assigns input t.portfolioId');

  const showView = extractFn(HTML, 'showView');
  const openLoad = extractFn(HTML, '_portfolioOpenBackendLoad');
  assert(showView.indexOf('apexImportJournalTradesJson') === -1, 'showView never calls apexImportJournalTradesJson');
  assert(openLoad.indexOf('apexImportJournalTradesJson') === -1, 'Portfolio open helper never calls it');
  assert((HTML.match(/function\s+apexImportJournalTradesJson\s*\(/g) || []).length === 1, 'exactly one definition');
  console.log('✓ static guards: non-destructive, read-only, no auto-call sites');
})();

// ══════════════════════════════════════════════════════════════════════════
// EXCEL POSITIONS IMPORT (journal header "IMPORT EXCEL") — pure helpers + save loop.
// Co-located with the Journal import suite so the repository's 197-file test
// inventory stays unchanged. The Excel reader itself (SheetJS) is a CDN script and is
// not run here: the helpers take the array-of-arrays it produces.
// ══════════════════════════════════════════════════════════════════════════
// Counted apart from the original suite on purpose: tests/journal-manual-import-boundary-contract.test.js
// pins this file's ORIGINAL result line, "ALL PASSED (63 assertions)", and that line must keep
// meaning exactly the original behaviour. The Excel assertions report on their own line below.
let xPassed = 0, xFailed = 0;
function xassert(cond, msg) { if (cond) { xPassed++; } else { xFailed++; console.error('  ✗ [excel import] ' + msg); } }
(function() {
  const a = HTML.indexOf('// JXI-BEGIN'), b = HTML.indexOf('// JXI-END');
  xassert(a > 0 && b > a, 'the Excel import helper block is delimited');
  const helpers = HTML.slice(a, b);
  const sym = extractFn(HTML, 'buildCompactOptionDxlinkSymbol');
  const ctx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, parseFloat, isFinite });
  const termA = HTML.indexOf('var _LEG_TERMINAL_STATUSES'), termB = HTML.indexOf('};', termA) + 2;
  const legStatusFns = extractFn(HTML, 'legStatusOf') + '\n' + HTML.slice(termA, termB) + '\n' + extractFn(HTML, 'legIsTerminal') + '\n' + extractFn(HTML, '_journalStrategyFromLegs');
  vm.runInContext(sym + '\n' + helpers + '\n' + legStatusFns, ctx);
  const R = (code) => JSON.parse(JSON.stringify(vm.runInContext(code, ctx)));

  // ── number / date / ticker parsing ───────────────────────────────────────
  xassert(R('_jxiNum(10.3)') === 10.3 && R('_jxiNum("10.3")') === 10.3, 'num: plain decimal, number or text');
  xassert(R('_jxiNum("305,00")') === 305 && R('_jxiNum("237,50")') === 237.5, 'num: Italian decimal comma');
  xassert(R('_jxiNum("1.080,00")') === 1080, 'num: Italian thousands dot + decimal comma');
  xassert(R('_jxiNum("1,080.50")') === 1080.5, 'num: English thousands comma + decimal dot');
  xassert(R('_jxiNum("-1")') === -1 && R('_jxiNum("66 USD")') === 66, 'num: sign kept, currency text stripped');
  xassert(R('_jxiNum("")') === null && R('_jxiNum("–")') === null && R('_jxiNum(null)') === null, 'num: empty / dash / null → null');
  xassert(R('_jxiDateTime("15-gen-2027").date') === '2027-01-15', 'date: Italian month abbreviation');
  xassert(R('_jxiDateTime("22-ott-2026 17:02:39").date') === '2026-10-22', 'date: date part of a date-time');
  xassert(R('_jxiDateTime("22-ott-2026 17:02:39").ts - _jxiDateTime("22-ott-2026 17:01:39").ts') === 60, 'date: time of day is kept (seconds)');
  ['20-set-2026', '20-sep-2026', '2026-09-20', '20/09/2026'].forEach(v =>
    xassert(R('_jxiDateTime(' + J(v) + ').date') === '2026-09-20', 'date: ' + v));
  xassert(R('_jxiDateTime(46325).date') === '2026-10-30', 'date: Excel serial number');
  xassert(R('_jxiDateTime("31-feb-2026")') === null && R('_jxiDateTime("hello")') === null && R('_jxiDateTime(null)') === null, 'date: impossible / non-dates → null');
  xassert(J(R('_jxiParseOptionTicker("ADBE/15F27C305:xcbf")')) === J({ root: 'ADBE', expiry: '2027-01-15', type: 'CALL', strike: 305 }), 'ticker: call, January code F');
  xassert(J(R('_jxiParseOptionTicker("ADBE/20X26P237.5:xcbf")')) === J({ root: 'ADBE', expiry: '2026-11-20', type: 'PUT', strike: 237.5 }), 'ticker: put with a decimal strike, November code X');
  xassert(R('_jxiParseOptionTicker("MU/20X26C1080:xcbf").strike') === 1080, 'ticker: four-digit strike');
  xassert(R('_jxiParseOptionTicker("SPY/18Z26C812:xcbf").expiry') === '2026-12-18' && R('_jxiParseOptionTicker("SPY/19G27P570:xcbf").expiry') === '2027-02-19', 'ticker: Z = Dec, G = Feb');
  ['VWRL:xmil', 'ITALY-1.65-01DEC30', 'ADBE/15A27C305', 'ADBE/32F27C305', 'ADBE/15F27C0', '', null].forEach(v =>
    xassert(R('_jxiParseOptionTicker(' + J(v) + ')') === null, 'ticker: not an option → null (' + v + ')'));

  // ── a synthetic export in the broker's shape (header names are what the real file uses) ──
  const HDR = ['Strumenti', 'Long/Short', 'Call/Put', 'Quantità', 'Scadenza', 'Data/ora apertura', 'Prezzo di apertura', 'Ticker', 'Stato', 'Prezzo di esercizio', 'Tipo attività', 'Id posizione'];
  const leg = (o) => [o.name || 'Acme Corp. Nov2026 50 P', o.ls, o.cp, o.q, o.exp || '20-nov-2026', o.at || '12-ott-2026 17:13:02', o.px, o.tk, o.st === undefined ? 'Apertura' : o.st, o.k === undefined ? '50,00' : o.k, o.kind === undefined ? 'Opzione su azione' : o.kind, o.id];
  const ROWS = [
    HDR,
    ['Acme Corp. (3)', null, null, null, null, null, null, null, null, null, null, null],     // group header row
    leg({ ls: 'Short', cp: 'Put', q: -2, px: 1.2, tk: 'ACME/20X26P50:xcbf', id: '1001' }),
    leg({ ls: 'Long', cp: 'Put', q: 2, px: 0.4, tk: 'ACME/20X26P45:xcbf', k: '45,00', at: '12-ott-2026 17:13:40', id: '1002' }),
    leg({ ls: 'Short', cp: 'Call', q: -1, px: 0.8, tk: 'ACME-WARRANT-2027', id: '1003' }),   // not a parseable option ticker → ignored as not an option
    ['Gov Bond 2030', 'Long', '', 6000, '01-dic-2030', '26-ago-2024 15:36:08', 91.49, 'ITALY-1.65-01DEC30', 'Apertura', '–', 'Obbligazione', '2000'],
    leg({ ls: 'Short', cp: 'Put', q: -1, px: 1.0, tk: 'ACME/20X26P40:xcbf', k: '40,00', st: 'Chiuso', id: '1004' }),                 // closed → ignored
    leg({ ls: 'Short', cp: 'Put', q: -1, px: 1.0, tk: 'ACME/20X26P55:xcbf', k: '60,00', id: '1005' }),                                // strike disagrees with the ticker
    leg({ ls: 'Short', cp: 'Put', q: 1, px: 1.0, tk: 'ACME/20X26P56:xcbf', k: '56,00', id: '1006' }),                                 // Short with a positive quantity
    leg({ ls: 'Long', cp: 'Call', q: 1, px: 'abc', tk: 'ACME/20X26C70:xcbf', k: '70,00', id: '1007' }),                               // unreadable price
    leg({ ls: 'Long', cp: 'Call', q: 1, px: 2, tk: 'ACME/20X26C71:xcbf', k: '71,00', exp: '21-nov-2026', id: '1008' }),               // expiry disagrees with the ticker
    leg({ ls: 'Long', cp: 'Call', q: 1, px: 2, tk: 'ACME/20X26C72:xcbf', k: '72,00', id: '1001' }),                                   // repeated position id
    [],
    leg({ ls: 'Long', cp: 'Call', q: 3, px: 1.5, tk: 'ZZZ/15F27C1080:xcbf', k: '1.080,00', exp: '15-gen-2027', id: '1009' }),   // Italian thousands separator in the strike column
    leg({ ls: 'Short', cp: 'Call', q: -1, px: 1, tk: 'ACME/20X26P51:xcbf', k: '51,00', id: '1010' }),                                // Call/Put column disagrees with the ticker
    leg({ ls: 'Long', cp: 'Put', q: 1, px: -0.5, tk: 'ACME/20X26P52:xcbf', k: '52,00', id: '1011' }),                                // negative opening price
    leg({ ls: 'Long', cp: 'Put', q: 0, px: 1, tk: 'ACME/20X26P53:xcbf', k: '53,00', id: '1012' }),                                   // zero quantity
    leg({ ls: 'Long', cp: 'Put', q: 1, px: 1, tk: 'ACME/20X26P54:xcbf', k: '54,00', kind: 'Exchange Traded Fund (ETF)', id: '1013' }), // option-looking ticker on a non-option asset
  ];
  const P = R('_jxiParseRows(' + J(ROWS) + ')');
  xassert(P.missing.length === 0, 'parse: every required column found by its header');
  xassert(P.legs.length === 3 && P.legs.map(l => l.brokerPositionId).join() === '1001,1002,1009', 'parse: the three valid open option legs are read');
  xassert(P.legs[2].strike === 1080 && P.legs[2].expiry === '2027-01-15' && P.legs[2].qty === 3, 'parse: "1.080,00" in the strike column reads as 1080 and agrees with the ticker');
  const l0 = P.legs[0];
  xassert(J([l0.ticker, l0.type, l0.side, l0.qty, l0.strike, l0.expiry, l0.entryPrice, l0.openDate]) === J(['ACME', 'PUT', 'SHORT', 2, 50, '2026-11-20', 1.2, '2026-10-12']),
    'parse: symbol, call/put, side, |quantity|, strike, expiry, opening price, opening date');
  xassert(P.ignored.map(r => r.row).join() === '5,6,7,18', 'parse: unparseable ticker, bond, closed leg and a non-option asset type are ignored, not imported');
  xassert(/not an option/.test(P.ignored[1].reason) && /not open/.test(P.ignored[2].reason), 'parse: ignored rows say why');
  const errRows = P.errors.map(e => e.row).join();
  xassert(errRows === '8,9,10,11,12,15,16,17', 'parse: strike / Call-Put / expiry mismatch, sign mismatch, bad / negative price, zero quantity and a repeated id are errors, nothing is guessed (got ' + errRows + ')');
  xassert(P.errors.every(e => e.problems.length >= 1), 'parse: each error row names its problem');
  xassert(P.legs.every(l => l.row !== 2) && P.ignored.every(r => r.row !== 2) && P.errors.every(r => r.row !== 2), 'parse: the underlying group header row (row 2) is skipped silently');
  const missing = R('_jxiParseRows([["Strumenti","Ticker"],["x","y"]])').missing;
  xassert(missing.indexOf('price') >= 0 && missing.indexOf('opened') >= 0, 'parse: a file without the needed columns reports which are missing');
  xassert(R('_jxiParseRows(null)').legs.length === 0 && R('_jxiParseRows([])').missing.length > 0, 'parse: empty input is harmless');
  const tie = R('_jxiParseRows(' + J([HDR.filter(h => h !== 'Prezzo di apertura'), HDR.filter(h => h !== 'Quantità')]) + ')').missing;
  xassert(J(tie) === J(['price']), 'parse: with no complete header the closest one (first of equals) decides which columns are reported missing');
  const twice = R('_jxiParseRows(' + J([HDR, ROWS[2], HDR, ROWS[3]]) + ')');
  xassert(twice.legs.length === 2 && twice.ignored.length === 1, 'parse: the FIRST complete header row is the header; a repeated header further down is just an ignored row');
  const shuffled = [HDR.slice().reverse()].concat(ROWS.slice(1).map(r => r.slice().reverse()));
  xassert(R('_jxiParseRows(' + J(shuffled) + ')').legs.length === 3, 'parse: column ORDER does not matter, only the headers');

  // ── grouping ─────────────────────────────────────────────────────────────
  const mk = (tk, ts, extra) => Object.assign({ ticker: tk, openedTs: ts, type: 'PUT', side: 'SHORT', qty: 1, strike: 50, expiry: '2026-11-20', entryPrice: 1 }, extra || {});
  const gl = [mk('A', 1000), mk('B', 1000), mk('A', 1060), mk('A', 5000), mk('B', 1500)];
  xassert(J(R('_jxiAssignGroups(' + J(gl) + ',"time")')) === J([1, 2, 1, 3, 4]), 'group time: same underlying within 90s joins, a later one does not');
  xassert(J(R('_jxiAssignGroups(' + J([mk('A', 1000), mk('A', 1090)]) + ',"time")')) === J([1, 1]) && J(R('_jxiAssignGroups(' + J([mk('A', 1000), mk('A', 1091)]) + ',"time")')) === J([1, 2]),
    'group time: the window is 90 seconds, inclusive');
  xassert(J(R('_jxiAssignGroups(' + J(gl) + ',"ticker")')) === J([1, 2, 1, 1, 2]), 'group ticker: every leg of an underlying together');
  xassert(J(R('_jxiAssignGroups(' + J(gl) + ',"leg")')) === J([1, 2, 3, 4, 5]), 'group leg: one trade per leg');
  xassert(J(R('_jxiAssignGroups(' + J([mk('A', 5000), mk('A', 1000), mk('A', 1050)]) + ',"time")')) === J([1, 2, 2]), 'group time: file order does not matter, opening time does');

  // ── strategy inference (every key must exist as a STRATEGY_TEMPLATES key) ──
  const S = (legs) => R('_jxiInferStrategy(' + J(legs) + ')');
  const L = (type, side, strike, qty, exp) => ({ type, side, strike, qty: qty || 1, expiry: exp || '2026-11-20' });
  xassert(S([L('PUT', 'SHORT', 50)]) === 'SHORT_PUT' && S([L('PUT', 'LONG', 50)]) === 'LONG_PUT', 'infer: single puts');
  xassert(S([L('CALL', 'SHORT', 50)]) === 'SHORT_CALL' && S([L('CALL', 'LONG', 50)]) === 'LONG_CALL', 'infer: single calls');
  xassert(S([L('PUT', 'LONG', 45), L('PUT', 'SHORT', 50)]) === 'BULL_PUT_SPREAD', 'infer: long lower put + short higher put = bull put spread');
  xassert(S([L('PUT', 'SHORT', 45), L('PUT', 'LONG', 50)]) === 'BEAR_PUT_SPREAD', 'infer: short lower put + long higher put = bear put spread');
  xassert(S([L('CALL', 'LONG', 50), L('CALL', 'SHORT', 55)]) === 'BULL_CALL_SPREAD', 'infer: bull call spread');
  xassert(S([L('CALL', 'SHORT', 50), L('CALL', 'LONG', 55)]) === 'BEAR_CALL_SPREAD', 'infer: bear call spread');
  xassert(S([L('PUT', 'SHORT', 45), L('CALL', 'SHORT', 55)]) === 'SHORT_STRANGLE', 'infer: short strangle');
  xassert(S([L('PUT', 'SHORT', 50), L('CALL', 'SHORT', 50)]) === 'SHORT_STRADDLE', 'infer: short straddle');
  xassert(S([L('PUT', 'LONG', 45), L('CALL', 'LONG', 55)]) === 'LONG_STRANGLE', 'infer: long strangle');
  xassert(S([L('PUT', 'LONG', 40), L('PUT', 'SHORT', 45), L('CALL', 'SHORT', 55), L('CALL', 'LONG', 60)]) === 'IRON_CONDOR', 'infer: iron condor');
  xassert(S([L('PUT', 'LONG', 40), L('PUT', 'SHORT', 58), L('CALL', 'SHORT', 55), L('CALL', 'LONG', 60)]) === 'CUSTOM', 'infer: a short put ABOVE the short call is not an iron condor');
  xassert(S([L('PUT', 'LONG', 40), L('PUT', 'SHORT', 45), L('CALL', 'SHORT', 55), L('CALL', 'SHORT', 60)]) === 'CUSTOM', 'infer: two short calls are not an iron condor');
  xassert(S([L('PUT', 'LONG', 55), L('CALL', 'LONG', 45)]) === 'CUSTOM' && S([L('PUT', 'SHORT', 55), L('CALL', 'SHORT', 45)]) === 'CUSTOM', 'infer: a put struck above the call is neither a long nor a short strangle');
  xassert(S([L('PUT', 'SHORT', 40), L('PUT', 'LONG', 45), L('CALL', 'SHORT', 55), L('CALL', 'LONG', 60)]) === 'CUSTOM', 'infer: puts the wrong way round is NOT an iron condor');
  xassert(S([L('CALL', 'LONG', 40, 1, '2027-06-18'), L('CALL', 'SHORT', 55, 1, '2026-11-20')]) === 'PMCC', 'infer: long far call + short near higher call = PMCC');
  xassert(S([L('PUT', 'LONG', 60, 1, '2027-06-18'), L('PUT', 'SHORT', 45, 1, '2026-11-20')]) === 'PMCP', 'infer: long far put + short near lower put = PMCP');
  xassert(S([L('PUT', 'SHORT', 45, 2), L('PUT', 'LONG', 50, 1)]) === 'SHORT_PUT_RATIO_SPREAD', 'infer: 2 short lower puts / 1 long higher put');
  xassert(S([L('PUT', 'SHORT', 685, 3), L('PUT', 'LONG', 640, 5)]) === 'CUSTOM', 'infer: 3 vs 5 is not a ratio spread → CUSTOM');
  xassert(S([L('CALL', 'SHORT', 50, 1, '2026-11-20'), L('PUT', 'SHORT', 45, 1, '2027-02-19')]) === 'CUSTOM', 'infer: different expiries → CUSTOM');
  xassert(S([]) === 'CUSTOM', 'infer: nothing → CUSTOM');
  const STRAT = fs.readFileSync(path.join(__dirname, '..', 'js', 'config', 'strategy-templates.js'), 'utf8');
  ['SHORT_PUT', 'LONG_PUT', 'SHORT_CALL', 'LONG_CALL', 'BULL_PUT_SPREAD', 'BEAR_PUT_SPREAD', 'BULL_CALL_SPREAD', 'BEAR_CALL_SPREAD', 'SHORT_STRANGLE',
    'SHORT_STRADDLE', 'LONG_STRANGLE', 'IRON_CONDOR', 'PMCC', 'PMCP', 'SHORT_PUT_RATIO_SPREAD', 'LONG_PUT_RATIO_SPREAD', 'SHORT_CALL_RATIO_SPREAD',
    'LONG_CALL_RATIO_SPREAD', 'CUSTOM'].forEach(k => xassert(new RegExp('\\n  ' + k + ':').test(STRAT), 'infer: ' + k + ' is a real strategy template'));

  // ── what the Journal already holds ───────────────────────────────────────
  const existing = R('_jxiExistingIndex(' + J([
    { ticker: 'ACME', status: 'OPEN', legs: [{ type: 'PUT', side: 'SHORT', qty: 2, strike: 50, expiry: '2026-11-20', entryPrice: 1.2 }, { type: 'PUT', side: 'LONG', qty: 1, strike: 45, expiry: '2026-11-20', entryPrice: 0.4, brokerPositionId: '777' }] },
    { ticker: 'OLD', status: 'CLOSED', legs: [{ type: 'PUT', side: 'SHORT', qty: 1, strike: 10, expiry: '2026-01-16', entryPrice: 1 }] },
  ]) + ')');
  const sp = R('_jxiSplitExisting(' + J([{ ticker: 'ACME', type: 'PUT', side: 'SHORT', qty: 2, strike: 50, expiry: '2026-11-20', entryPrice: 1.2, brokerPositionId: '5' },
    { ticker: 'ACME', type: 'PUT', side: 'LONG', qty: 5, strike: 99, expiry: '2026-11-20', entryPrice: 9, brokerPositionId: '777' },
    { ticker: 'OLD', type: 'PUT', side: 'SHORT', qty: 1, strike: 10, expiry: '2026-01-16', entryPrice: 1, brokerPositionId: '8' },
    { ticker: 'NEW', type: 'CALL', side: 'LONG', qty: 1, strike: 10, expiry: '2026-12-18', entryPrice: 1, brokerPositionId: '9' }]) + ',' + J(existing) + ')');
  xassert(sp.dup.length === 2 && sp.fresh.map(l => l.ticker).join() === 'OLD,NEW',
    're-import: a leg is skipped when its broker id OR its exact open leg is already in the Journal; a CLOSED trade never blocks one');

  // ── the trade handed to journalManager.add ───────────────────────────────
  const group = [Object.assign({}, P.legs[1], { openDate: '2026-10-15' }), P.legs[0]];
  const frozen = J(group);
  const t = R('_jxiBuildTradePayload(' + frozen + ',"pf-7","BULL_PUT_SPREAD","Posizioni.xlsx")');
  xassert(J(group) === frozen, 'payload: the parsed legs are not mutated');
  xassert(t.portfolioId === 'pf-7' && t.ticker === 'ACME' && t.strategy === 'BULL_PUT_SPREAD' && t.status === 'OPEN' && t.source === 'excel_import', 'payload: portfolio, ticker, strategy, OPEN, source');
  xassert(t.legs.every(l => l.expiration === l.expiry && l.expirationDate === l.expiry && l.expiryDate === l.expiry), 'payload: every leg carries the four expiry aliases too');
  xassert(t.legs.map(l => l.openDate).sort().join() === '2026-10-12,2026-10-15', 'payload: every leg keeps its own opening date');
  xassert(t.exitDate === null && t.realizedPnL === null && t.entryDate === '2026-10-12', 'payload: no exit, no P&L, entry date = earliest leg opening date');
  xassert(t.expiry === '2026-11-20' && t.expiration === t.expiry && t.expirationDate === t.expiry && t.expiryDate === t.expiry, 'payload: the four trade-level expiry aliases, as the Add Trade form sets them');
  xassert(t.legs.length === 2 && t.legs[0].strike === 45 && t.legs[1].strike === 50, 'payload: legs sorted by expiry, type, strike');
  xassert(t.legs[1].streamerSymbol === '.ACME261120P50' && t.legs[0].streamerSymbol === '.ACME261120P45', 'payload: the DXLink streamer symbol is derived, so the live greeks can load');
  xassert(t.legs[1].brokerPositionId === '1001' && t.legs[1].entryPrice === 1.2 && t.legs[1].qty === 2 && t.legs[1].side === 'SHORT', 'payload: broker id, opening price, quantity, side kept on the leg');
  xassert(/Posizioni\.xlsx/.test(t.notes) && !('entrySnapshot' in t) && !('preTradeCheck' in t), 'payload: notes name the file; no entry snapshot is fabricated');

  // ── re-import: what changed in legs the Journal already holds ─────────────
  xassert(J(P.closedIds) === J({ '1004': true }), 'parse: the id of an option row the file lists as not open is reported (closedIds), nothing else is');
  xassert(J(Object.keys(P.errorIds).sort()) === J(['1001', '1005', '1006', '1007', '1008', '1010', '1011', '1012']), 'parse: the id of every unreadable option row is reported (errorIds)');
  xassert(J(R('_jxiParseRows([])').closedIds) === '{}' && J(R('_jxiParseRows(null)').errorIds) === '{}', 'parse: empty input still returns both id maps');
  const jl = (o) => Object.assign({ type: 'PUT', side: 'SHORT', qty: 2, strike: 50, expiry: '2026-11-20', entryPrice: 1.2, brokerPositionId: '1001' }, o || {});
  const jt = (legs, o) => Object.assign({ id: 77, ticker: 'ACME', status: 'OPEN', legs: legs }, o || {});
  const plan = (trades, parsed) => R('_jxiPlanSync(' + J(parsed || P) + ',' + J(trades) + ')');
  let syncP = plan([jt([jl(), jl({ side: 'LONG', strike: 45, entryPrice: 0.4, brokerPositionId: '1002' })])]);
  xassert(syncP.changed.length === 0 && syncP.conflict.length === 0 && syncP.gone.length === 0 && syncP.matched === 2, 'sync: an identical Journal copy proposes nothing');
  syncP = plan([jt([jl({ qty: 1, entryPrice: 1 })])]);
  xassert(syncP.changed.length === 1 && syncP.changed[0].qty === 1 && syncP.changed[0].qtyNew === 2 && syncP.changed[0].entryPrice === 1 && syncP.changed[0].priceNew === 1.2
    && syncP.changed[0].tradeId === 77 && syncP.changed[0].idx === 0 && syncP.changed[0].key === '77|0' && syncP.changed[0].brokerPositionId === '1001' && syncP.changed[0].ticker === 'ACME', 'sync: a different quantity and price is proposed as an update with both values');
  xassert(plan([jt([jl({ qty: 3 })])]).changed.length === 1 && plan([jt([jl({ entryPrice: 1.5 })])]).changed.length === 1, 'sync: quantity alone, or price alone, is enough');
  xassert(plan([jt([jl({ entryPrice: 1.20001 })])]).changed.length === 0 && plan([jt([jl({ entryPrice: 1.2001 })])]).changed.length === 1, 'sync: prices are compared to four decimals');
  const aliasP = plan([jt([jl({ expiry: undefined, expiration: '2026-11-20' })])]);
  xassert(aliasP.changed.length === 0 && aliasP.conflict.length === 0 && aliasP.matched === 1, 'sync: a leg that only carries the "expiration" alias still matches (no conflict)');
  xassert(plan([jt([jl({ strike: '50' })])]).changed.length === 0 && plan([jt([jl({ qty: '2' })])]).changed.length === 0, 'sync: numbers stored as text compare as numbers');
  syncP = plan([jt([jl({ strike: 46 })])]);
  xassert(syncP.changed.length === 0 && syncP.conflict.length === 1 && syncP.conflict[0].fileLabel === 'SHORT 2× PUT 50 2026-11-20' && syncP.matched === 1, 'sync: same id but a different strike is a conflict, described, never an update');
  ['type', 'side', 'expiry'].forEach(k => {
    const alt = { type: 'CALL', side: 'LONG', expiry: '2026-12-18' }[k];
    xassert(plan([jt([jl({ [k]: alt })])]).conflict.length === 1, 'sync: a different ' + k + ' is a conflict');
  });
  syncP = plan([jt([jl({ brokerPositionId: '1004', qty: 1 })])]);
  xassert(syncP.gone.length === 1 && syncP.gone[0].reason === 'closed' && syncP.matched === 0, 'sync: a leg the file lists as not open is proposed for removal, even when nothing else matches');
  syncP = plan([jt([jl(), jl({ brokerPositionId: '9999', strike: 60 })])]);
  xassert(syncP.gone.length === 1 && syncP.gone[0].reason === 'absent' && syncP.gone[0].brokerPositionId === '9999' && syncP.gone[0].idx === 1 && syncP.gone[0].strike === 60, 'sync: a leg absent from the file is proposed for removal when the file matches the Journal');
  syncP = plan([jt([jl({ brokerPositionId: '9999' })])]);
  xassert(syncP.gone.length === 0, 'sync: a file that shares no leg with the Journal never proposes removing "absent" legs (wrong account / wrong file)');
  syncP = plan([jt([jl({ brokerPositionId: '9999' }), jl({ brokerPositionId: '1004' })])]);
  xassert(syncP.gone.length === 1 && syncP.gone[0].reason === 'closed', 'sync: ... but a leg the file itself lists as closed is still reported');
  syncP = plan([jt([jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 }), jl({ brokerPositionId: '1005' })])]);
  xassert(syncP.gone.length === 0 && syncP.changed.length === 0 && syncP.conflict.length === 0, 'sync: a leg whose file row is unreadable is left alone (neither updated nor removed)');
  syncP = plan([jt([jl({ qty: 1 })], { status: 'CLOSED' }), jt([jl({ brokerPositionId: '9999' })], { status: 'CLOSED', id: 78 })]);
  xassert(syncP.changed.length === 0 && syncP.gone.length === 0 && syncP.matched === 0, 'sync: closed trades are never touched');
  syncP = plan([jt([jl({ qty: 1, legStatus: 'CLOSED' }), jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4, legStatus: 'EXPIRED_OTM' })])]);
  xassert(syncP.changed.length === 0 && syncP.gone.length === 0 && syncP.matched === 0, 'sync: legs that are no longer open in the Journal are never touched');
  const hand = (o) => jl(Object.assign({ brokerPositionId: undefined, side: 'LONG', strike: 45, entryPrice: 0.4 }, o || {}));   // a leg entered by hand: the contract of file leg 1002
  syncP = plan([jt([jl({ qty: 1 }), hand(), null], { status: 'PARTIAL' })]);
  xassert(syncP.changed.length === 1 && syncP.changed[0].idx === 0 && syncP.gone.length === 0 && syncP.matched === 2, 'sync: PARTIAL trades count; a hand-entered leg the file has (by contract) is found, and empty slots are skipped');
  syncP = plan([jt([jl({ qty: 1 })], { id: 5 }), jt([jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.9 })], { id: 6 })]);
  xassert(syncP.changed.map(c => c.key).join() === '5|0,6|0', 'sync: updates from several trades each carry their own trade id');
  // ── legs WITHOUT a broker id: found by contract (entered by hand, or imported before the id was kept) ──
  const PC = Object.assign({}, P, { errors: [] });   // the shared file fixture has unreadable ACME rows; this block starts from a clean file
  const planC = (trades, parsed) => plan(trades, parsed || PC);
  const jh = (o, t) => jt([Object.assign({ type: 'PUT', side: 'SHORT', qty: 2, strike: 50, expiry: '2026-11-20', entryPrice: 1.2 }, o || {})], t);   // no brokerPositionId at all
  syncP = planC([jt([jl()]), jh({ strike: 99 }, { id: 90 })]);
  xassert(syncP.gone.length === 1 && syncP.gone[0].tradeId === 90 && syncP.gone[0].reason === 'absent' && syncP.gone[0].noBrokerId === true && syncP.gone[0].brokerPositionId === '' && syncP.gone[0].strike === 99 && syncP.gone[0].key === '90|0',
    'no id: a Journal leg whose contract is not in the file is proposed for removal (reason absent, flagged as having no broker id)');
  syncP = planC([jt([jl()]), jh({}, { id: 90 })]);
  xassert(syncP.gone.length === 0 && syncP.matched === 2 && syncP.changed.length === 0, 'no id: a leg whose contract the file has is found - kept, and counted as matched');
  syncP = planC([jt([jl()]), jh({ qty: 5, entryPrice: 9 }, { id: 90 })]);
  xassert(syncP.gone.length === 0 && syncP.changed.length === 0, 'no id: a different quantity or price is not a removal (the contract is what identifies it)');
  ['side', 'type', 'expiry', 'strike'].forEach(k => {
    const alt = { side: 'LONG', type: 'CALL', expiry: '2026-12-18', strike: 51 }[k];
    xassert(planC([jt([jl()]), jh({ [k]: alt }, { id: 90 })]).gone.length === 1, 'no id: a different ' + k + ' is a different contract - not in the file');
  });
  syncP = planC([jt([jl()]), jh({ strike: 99 }, { id: 90, ticker: 'acme' })], Object.assign({}, P, { errors: [{ row: 9, label: 'ACME/15F27C99:xcbf', problems: ['bad'] }] }));
  xassert(syncP.gone.length === 0, 'no id: the underlying is compared in upper case against the unreadable rows too');
  xassert(planC([jt([jl()]), jh({}, { id: 90, ticker: 'OTHER' })]).gone.length === 1, 'no id: the same contract on another underlying is not in the file');
  xassert(planC([jt([jl()]), jh({}, { id: 90, ticker: 'acme' })]).gone.length === 0, 'no id: the underlying is compared in upper case');
  syncP = planC([jt([jl()]), jh({ type: 'EQUITY', strike: null, expiry: null }, { id: 90 })]);
  xassert(syncP.gone.length === 0, 'no id: a stock leg is never proposed (the file lists options only)');
  syncP = planC([jt([jl()]), jh({ legStatus: 'CLOSED', strike: 99 }, { id: 90 }), jh({ strike: 98 }, { id: 91, status: 'CLOSED' })]);
  xassert(syncP.gone.length === 0, 'no id: closed legs and closed trades are never proposed');
  syncP = planC([jh({ strike: 99 }, { id: 90 })]);
  xassert(syncP.gone.length === 0 && syncP.matched === 0, 'no id: a file that shares no leg with the Journal never proposes removing them (wrong account / wrong file)');
  syncP = planC([jt([jl()]), jh({ strike: 99 }, { id: 90 })], Object.assign({}, P, { errors: [{ row: 9, label: 'ACME/15F27C99:xcbf', problems: ['bad'] }] }));
  xassert(syncP.gone.length === 0, 'no id: when the file has an unreadable row for that underlying nothing is proposed for it');
  syncP = planC([jt([jl()]), jh({ strike: 99 }, { id: 90, ticker: 'OTHER' })], Object.assign({}, P, { errors: [{ row: 9, label: 'ACME/15F27C99:xcbf', problems: ['bad'] }] }));
  xassert(syncP.gone.length === 1 && syncP.gone[0].ticker === 'OTHER', 'no id: ... but another underlying is still checked');
  syncP = planC([jt([jl(), jl({ brokerPositionId: '9999', strike: 60 })]), jh({ strike: 99 }, { id: 90 }), jh({}, { id: 91 })]);
  xassert(syncP.checked === 4 && syncP.matched === 2 && syncP.gone.length === 2, 'no id: "checked" counts every open option leg compared (with and without an id)');
  xassert(R('_jxiContractKey("acme", { type: "PUT", strike: "50", expiry: "2026-11-20", side: "SHORT" })') === 'ACME|PUT|50|2026-11-20|SHORT', 'contract key: underlying upper-cased, strike as a number, no quantity, no price');
  xassert(R('_jxiPlanSync({ legs: [], closedIds: {}, errorIds: {} }, null)').matched === 0 && R('_jxiPlanSync(' + J(P) + ', [null, {}])').matched === 0, 'sync: no trades, empty slots → nothing');

  // ── applying accepted changes ────────────────────────────────────────────
  const cT = jt([jl({ qty: 1, entryPrice: 1 }), jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 })]);
  const cPlan = plan([cT]);
  const frozenT = J(cT);
  const newLegs = R('_jxiLegsWithChanges(' + frozenT + ',' + J(cPlan.changed) + ')');
  ctx.__trade = cT; ctx.__chg = cPlan.changed;
  vm.runInContext('_jxiLegsWithChanges(__trade, __chg)', ctx);
  xassert(J(cT) === frozenT, 'apply: the trade passed in is not mutated');
  xassert(newLegs[0].qty === 2 && newLegs[0].entryPrice === 1.2 && newLegs[0].strike === 50 && newLegs[0].brokerPositionId === '1001', 'apply: quantity and opening price of the changed leg are replaced, the rest of the leg is kept');
  xassert(J(newLegs[1]) === J(cT.legs[1]), 'apply: other legs are copied unchanged');
  xassert(R('_jxiLegsWithChanges(' + frozenT + ',' + J([Object.assign({}, cPlan.changed[0], { brokerPositionId: 'zzz' })]) + ')')[0].qty === 1, 'apply: a change whose leg id no longer matches is ignored');
  xassert(R('_jxiLegsWithChanges(' + frozenT + ',' + J([Object.assign({}, cPlan.changed[0], { idx: 9 })]) + ')').length === 2, 'apply: a change pointing past the last leg is ignored');
  xassert(R('_jxiLegsWithChanges({}, [])').length === 0, 'apply: a trade without legs gives an empty list');
  const note = R('_jxiChangeNote(' + J(cPlan.changed) + ',"Posizioni.xlsx")');
  xassert(note === 'Excel sync (Posizioni.xlsx): SHORT PUT 50 2026-11-20 — qty 1 → 2, open price 1 → 1.2', 'apply: the note names the file, the contract and both values (got ' + note + ')');
  xassert(R('_jxiChangeNote(' + J(cPlan.changed) + ')').indexOf('Excel sync: ') === 0, 'apply: no file name, no parentheses');
  xassert(/; /.test(R('_jxiChangeNote(' + J([cPlan.changed[0], cPlan.changed[0]]) + ')')), 'apply: several changes are separated');

  // ── what a re-import REMOVES ─────────────────────────────────────────────
  const gx = (o) => Object.assign({ type: 'PUT', side: 'SHORT', qty: 2, strike: 50, expiry: '2026-11-20', entryPrice: 1.2, brokerPositionId: '9999' }, o || {});
  const rplan = (trades) => R('_jxiPlanRemovals(' + J(plan(trades).gone) + ',' + J(trades) + ')');
  let rm = rplan([jt([jl(), gx({ strike: 60 })]), jt([gx({ brokerPositionId: '1004' }), gx({ brokerPositionId: '9998', strike: 61 })], { id: 78, ticker: 'BETA', strategy: 'BULL_PUT_SPREAD', portfolioId: 5 })]);
  xassert(rm.length === 2 && rm[0].tradeId === 77 && rm[0].kind === 'LEGS' && rm[0].legs.length === 1 && rm[0].total === 2 && rm[0].kept === 1 && rm[0].keptActive === 1 && rm[0].statusAfter === 'OPEN',
    'removals: a trade that keeps a leg loses only the departed one and stays OPEN');
  xassert(rm[1].tradeId === 78 && rm[1].kind === 'TRADE' && rm[1].legs.length === 2 && rm[1].kept === 0 && rm[1].statusAfter === null && rm[1].ticker === 'BETA' && rm[1].strategy === 'BULL_PUT_SPREAD' && rm[1].portfolioId === 5,
    'removals: a trade whose every leg left the file is removed whole (no status after), with its ticker, strategy and portfolio for the preview');
  rm = rplan([jt([jl(), gx()], { portfolioId: undefined })]);
  xassert(rm[0].portfolioId === null, 'removals: a trade with no portfolio says so (null), not undefined');
  rm = rplan([jt([jl(), gx(), jl({ brokerPositionId: undefined, strike: 77, legStatus: 'CLOSED' })], { status: 'PARTIAL' })]);
  xassert(rm[0].kind === 'LEGS' && rm[0].kept === 2 && rm[0].keptActive === 1 && rm[0].statusAfter === 'PARTIAL', 'removals: closed legs that stay are history - the trade is PARTIAL while an active leg remains');
  rm = rplan([jt([gx(), jl({ brokerPositionId: undefined, strike: 77, legStatus: 'CLOSED' }), jl({ brokerPositionId: undefined, strike: 78, legStatus: 'EXPIRED_OTM' })], { status: 'PARTIAL' }), jt([jl({ brokerPositionId: '1004' }), hand()], { id: 80 }), jt([jl()], { id: 81 })]);   // (the last trade is the one the file matches)
  xassert(rm[0].kind === 'LEGS' && rm[0].keptActive === 0 && rm[0].statusAfter === 'CLOSED', 'removals: when only closed / expired legs stay the trade becomes CLOSED - its realized history is not deleted');
  xassert(rm[1].kind === 'LEGS' && rm[1].statusAfter === 'OPEN' && rm[1].kept === 1, 'removals: a hand-entered leg that the file still has stays');
  xassert(R('_jxiPlanRemovals([], [])').length === 0 && R('_jxiPlanRemovals(null, null)').length === 0 && R('_jxiPlanRemovals([{ tradeId: 1, idx: 0 }], [])').length === 0, 'removals: nothing gone (or a trade no longer there) → nothing to remove');
  const gone2 = plan([jt([jl(), gx()], { id: 5 }), jt([jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 }), gx({ strike: 61 })], { id: 6 })]).gone;
  xassert(gone2.length === 2 && R('_jxiPlanRemovals(' + J(gone2) + ',' + J([jt([jl(), gx()], { id: 5 }), jt([jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 }), gx({ strike: 61 })], { id: 6 })]) + ')').map(r => r.tradeId).join() === '5,6', 'removals: one entry per trade, in the order the plan lists them');

  const rT = jt([jl(), gx({ strike: 60 })], { strategy: 'BULL_PUT_SPREAD' });
  const rGone = plan([rT]).gone;
  const rFrozen = J(rT);
  ctx.__rt = rT; ctx.__rg = rGone;
  let after = JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__rt, __rg)', ctx)));
  xassert(J(rT) === rFrozen, 'removal patch: the trade passed in is not mutated');
  xassert(after.legs.length === 1 && after.legs[0].brokerPositionId === '1001' && after.status === 'OPEN', 'removal patch: the departed leg is taken off, the others are kept untouched');
  const sT = jt([jl({ side: 'SHORT', strike: 50, entryPrice: 1.2 }), jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 }), gx({ side: 'LONG', strike: 60 })]);
  const sNamed = (name) => Object.assign({}, sT, { strategy: name });
  ctx.__gone3 = [{ idx: 2 }];
  ctx.__t1 = sNamed('CUSTOM'); ctx.__t2 = sNamed('SOMETHING_I_CHOSE');
  const autoBefore = vm.runInContext('_journalStrategyFromLegs(__t1.legs)', ctx);
  ctx.__t3 = sNamed(autoBefore);
  const renamed = JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__t3, __gone3)', ctx)));
  xassert(autoBefore && renamed.strategy && renamed.strategy !== autoBefore, 'removal patch: a strategy that was just the name the legs gave is renamed to what is left (' + autoBefore + ' → ' + renamed.strategy + ')');
  xassert(!('strategy' in JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__t2, __gone3)', ctx)))), 'removal patch: a strategy name the user chose is left alone');
  ctx.__t4 = jt([jl({ strike: 50 }), jl({ strike: 52, brokerPositionId: '1003' }), gx({ strike: 54 })], { strategy: 'CUSTOM' });
  xassert(vm.runInContext('_journalStrategyFromLegs(__t4.legs)', ctx) === 'CUSTOM' && vm.runInContext('_journalStrategyFromLegs(__t4.legs.slice(0, 2))', ctx) === 'CUSTOM'
    && !('strategy' in JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__t4, [{ idx: 2 }])', ctx)))), 'removal patch: when the legs that stay give the same name, the strategy is not rewritten');
  ctx.__tc = jt([jl({ legStatus: 'CLOSED', closeDate: '2026-10-01' }), jl({ legStatus: 'CLOSED', closeDate: '2026-10-09', brokerPositionId: undefined }), gx()]);
  after = JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__tc, [{ idx: 2 }])', ctx)));
  xassert(after.status === 'CLOSED' && after.exitDate === '2026-10-09' && after.legs.length === 2, 'removal patch: nothing active left → CLOSED, exit date = the last leg close date');
  ctx.__tp = jt([jl({ legStatus: 'CLOSED', closeDate: '2026-10-01' }), jl({ brokerPositionId: undefined, strike: 70 }), gx()]);
  xassert(JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__tp, [{ idx: 2 }])', ctx))).status === 'PARTIAL', 'removal patch: closed + active legs left → PARTIAL');
  ctx.__tn = jt([gx()]);
  after = JSON.parse(JSON.stringify(vm.runInContext('_jxiTradeAfterRemoval(__tn, [{ idx: 0 }])', ctx)));
  xassert(after.legs.length === 0 && after.status === 'CLOSED' && after.exitDate === new Date().toISOString().substring(0, 10), 'removal patch: no leg left at all → CLOSED today (the save path deletes such a trade instead)');
  const rnote = R('_jxiRemovalNote(' + J(rGone) + ',"Posizioni.xlsx")');
  xassert(rnote === 'Excel sync (Posizioni.xlsx): removed 1 leg(s) no longer open at the broker — SHORT 2× PUT 60 2026-11-20', 'removal note: names the file and every leg (got ' + rnote + ')');
  xassert(R('_jxiRemovalNote(' + J(rGone) + ')').indexOf('Excel sync: removed') === 0, 'removal note: no file name, no parentheses');

  xassert(R('_jxiUnchangedCount([1,2,3,4], { changed: [1], conflict: [1] })') === 2 && R('_jxiUnchangedCount([], { changed: [1], conflict: [] })') === 0, 'count: unchanged = repeated legs minus changed minus conflicting, never negative');
  xassert(R('_jxiNothingToShow([], { changed: [], gone: [] })') === true && R('_jxiNothingToShow([1], { changed: [], gone: [] })') === false
    && R('_jxiNothingToShow([], { changed: [1], gone: [] })') === false && R('_jxiNothingToShow([], { changed: [], gone: [1] })') === false, 'empty: only a file with no new leg, no change and no leg to remove is "nothing to import"');

  // ── opening the preview wires the plan in ──
  const octx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, parseFloat, isFinite,
    journalManager: { getAll: () => octx.__trades }, showToast() {}, _jxiRender() {} });
  vm.runInContext(legStatusFns, octx);
  octx.__trades = [jt([jl({ qty: 1 }), jl({ brokerPositionId: '9999', strike: 60 })])];
  vm.runInContext(sym + '\n' + helpers + '\n' + extractFn(HTML, '_jxiOpen'), octx);
  octx.__parsed = P;
  vm.runInContext('_jxiOpen("f.xlsx", __parsed)', octx);
  const os = JSON.parse(vm.runInContext('JSON.stringify(_jxiState)', octx));
  xassert(os.sync.changed.length === 1 && os.sync.gone.length === 1 && os.sync.matched === 1 && os.applyChange && J(os.keepTrade) === '{}', 'open: the preview state carries the plan, empty choices');
  xassert(os.removals.length === 1 && os.removals[0].kind === 'LEGS' && os.removals[0].legs[0].brokerPositionId === '9999' && !('closePrice' in os) && !('closeDate' in os), 'open: the removals are planned up front (nothing is asked about a closing price any more)');
  xassert(os.legs.map(l => l.brokerPositionId).join() === '1002,1009' && os.dup.length === 1 && os.dup[0].brokerPositionId === '1001', 'open: new and already-present legs are still split as before');

  // ── the label of the apply button ────────────────────────────────────────
  const lctx = vm.createContext({ Math });
  vm.runInContext(extractFn(HTML, '_jxiGoLabel') + '\n' + extractFn(HTML, '_jxiRemovedLegCount'), lctx);
  const lab = (a, u, legsPerTrade) => vm.runInContext('_jxiGoLabel({ adds: new Array(' + a + '), upd: new Array(' + u + '), removes: ' + J(legsPerTrade.map(n => ({ legs: new Array(n).fill(0) }))) + ' })', lctx);
  xassert(lab(0, 0, []) === 'Nothing to apply' && lab(2, 0, []) === 'Apply: 2 new trade(s)' && lab(0, 3, []) === 'Apply: 3 update(s)' && lab(0, 0, [1]) === 'Apply: 1 removal(s)'
    && lab(2, 3, [1]) === 'Apply: 2 new trade(s), 3 update(s), 1 removal(s)', 'label: only the non-empty parts, in the order new / update / removal');
  xassert(lab(0, 0, [2, 1]) === 'Apply: 3 removal(s)', 'label: removals are counted in positions (legs), not in trades');

  // ── the choices in the preview ───────────────────────────────────────────
  const aState = { removals: [{ legs: [1, 2] }, { legs: [3] }], keepTrade: {}, sync: { changed: [1, 2] }, applyChange: {}, busy: false };
  const actx = vm.createContext({ console, Object, Array, Math, _jxiRefreshGo() { actx.__refresh = (actx.__refresh || 0) + 1; } });
  actx.__s = aState;
  vm.runInContext(extractFn(HTML, '_jxiGroups') + '\n' + extractFn(HTML, '_jxiActions') + '\n' + extractFn(HTML, '_jxiRemovedLegCount') + '\n' + extractFn(HTML, '_jxiSetRemove') + '\n_jxiState = Object.assign({ legs: [], gid: [], include: {} }, __s);', actx);
  const acts = () => JSON.parse(vm.runInContext('JSON.stringify((function() { var a = _jxiActions(); return { removes: a.removes.length, legs: _jxiRemovedLegCount(a.removes), upd: a.upd.length }; })())', actx));
  xassert(J(acts()) === J({ removes: 2, legs: 3, upd: 2 }), 'choices: every removal is selected by default');
  vm.runInContext('_jxiSetRemove(0, false)', actx);
  xassert(J(acts()) === J({ removes: 1, legs: 1, upd: 2 }) && actx.__refresh === 1, 'choices: unticking a trade keeps it (and refreshes the apply button)');
  vm.runInContext('_jxiSetRemove(0, true)', actx);
  xassert(acts().removes === 2, 'choices: ticking it again removes it');
  vm.runInContext('_jxiState.busy = true; _jxiSetRemove(1, false)', actx);
  xassert(acts().removes === 2, 'choices: nothing changes while a save is running');

  const go = { textContent: '', disabled: true };
  const gctx = vm.createContext({ console, Object, Array, Math, document: { getElementById: (id) => (id === 'jxiGo' ? go : null) } });
  vm.runInContext([ '_jxiGroups', '_jxiActions', '_jxiGoLabel', '_jxiRemovedLegCount', '_jxiRefreshGo' ].map(n => extractFn(HTML, n)).join('\n'), gctx);
  const refreshWith = (st) => { gctx.__st = st; vm.runInContext('_jxiState = __st; _jxiRefreshGo();', gctx); return { text: go.textContent, disabled: go.disabled }; };
  const base = { legs: [], gid: [], include: {}, sync: { changed: [] }, applyChange: {}, keepTrade: {}, busy: false };
  xassert(J(refreshWith(Object.assign({}, base, { removals: [{ legs: [1, 2] }] }))) === J({ text: 'Apply: 2 removal(s)', disabled: false }), 'apply button: a removal alone enables it, and says how many positions');
  xassert(J(refreshWith(Object.assign({}, base, { removals: [{ legs: [1, 2] }], keepTrade: { 0: true } }))) === J({ text: 'Nothing to apply', disabled: true }), 'apply button: with every trade kept it is disabled');

  // ── what the preview tells the user ──────────────────────────────────────
  let html = '';
  const rctx = vm.createContext({ console, Object, Array, Math, String, JSON,
    document: { getElementById: () => null, querySelector: () => null, body: { insertAdjacentHTML: (pos, h) => { html = h; } } },
    portfolioManager: { getAll: () => [{ id: 5, name: 'Income' }, { id: 6, name: 'Swing' }] }, STRATEGY_TEMPLATES: { CUSTOM: { label: 'Custom' } }, escHtml: (x) => String(x).replace(/</g, '&lt;') });
  vm.runInContext([ '_jxiGroups', '_jxiActions', '_jxiGoLabel', '_jxiRemovedLegCount', '_jxiUnchangedCount', '_jxiNothingToShow', '_jxiRender' ].map(n => extractFn(HTML, n)).join('\n'), rctx);
  const mkRem = (o) => Object.assign({ tradeId: 78, ticker: 'BETA', strategy: 'BULL_PUT_SPREAD', portfolioId: 5, kind: 'TRADE', total: 2, kept: 0, keptActive: 0, statusAfter: null,
    legs: [{ side: 'SHORT', qty: 2, type: 'PUT', strike: 40, expiry: '2026-11-20', reason: 'closed' }, { side: 'LONG', qty: 2, type: 'PUT', strike: 35, expiry: '2026-11-20', reason: 'absent' }] }, o || {});
  const preview = (removals, keep) => {
    rctx.__st = { file: 'Posizioni.xlsx', legs: [], gid: [], dup: [], ignored: [], errors: [], include: {}, strategy: {}, mode: 'time', busy: false,
      sync: { changed: [], gone: [].concat(...removals.map(r => r.legs)), conflict: [], matched: 3, checked: 5 }, removals: removals, applyChange: {}, keepTrade: keep || {} };
    vm.runInContext('_jxiState = __st; _jxiRender();', rctx);
    return html;
  };
  let h1 = preview([mkRem(), mkRem({ tradeId: 79, ticker: 'GAMMA', portfolioId: 6, kind: 'LEGS', total: 3, kept: 2, keptActive: 2, statusAfter: 'OPEN', strategy: null, legs: [{ side: 'SHORT', qty: 1, type: 'CALL', strike: 70, expiry: '2026-12-18', reason: 'absent' }] })]);
  xassert(/3 position\(s\) in 2 trade\(s\) are not in the file/.test(h1) && /REMOVED from the Journal and from the Portfolio/.test(h1), 'preview: says how many positions and trades leave, and that they leave the Journal AND the Portfolio');
  xassert(/BETA/.test(h1) && /GAMMA/.test(h1) && /Income/.test(h1) && /Swing/.test(h1), 'preview: names every trade and the portfolio it is in');
  xassert(/whole trade removed<\/strong> \(2 legs\)/.test(h1) && /1 of 3 legs removed<\/strong>, 2 stay/.test(h1) && /trade OPEN/.test(h1), 'preview: says whether a whole trade goes or only some of its legs (and what is left)');
  xassert(/SHORT 2× PUT 40 2026-11-20/.test(h1) && /LONG 2× PUT 35 2026-11-20/.test(h1) && /SHORT 1× CALL 70 2026-12-18/.test(h1), 'preview: lists every leg that goes');
  xassert(/closed in the file/.test(h1) && /not in the file/.test(h1), 'preview: says why each leg goes (the file lists it as closed / the file does not have it)');
  xassert((h1.match(/onchange="_jxiSetRemove\(\d,this\.checked\)"/g) || []).length === 2 && (h1.match(/ checked onchange="_jxiSetRemove/g) || []).length === 2, 'preview: one tick per trade, all ticked by default');
  xassert(/>Apply: 3 removal\(s\)<\/button>/.test(h1) && !/id="jxiGo"[^>]*disabled/.test(h1) && /3 to remove/.test(h1), 'preview: the apply button and the header count the removals');
  xassert(!/close price|closing price/i.test(h1), 'preview: nothing asks for a closing price any more');
  xassert(/untick a trade to keep it/.test(h1), 'preview: says that a trade can be unticked to keep it');
  let h2 = preview([mkRem()], { 0: true });
  xassert(!/ checked onchange="_jxiSetRemove/.test(h2) && /id="jxiGo"[^>]*disabled/.test(h2) && />Nothing to apply</.test(h2), 'preview: a trade the user keeps is unticked and, with nothing else, there is nothing to apply');
  xassert(/Compared 5 open option leg\(s\) of the Journal with the file: 3 found, 3 not in the file\./.test(h1), 'preview: says how many open Journal legs were compared with the file, how many were found and how many were not');
  xassert(!/no broker id on this Journal leg/.test(h1), 'preview: legs that have a broker id are not described as compared by contract');
  let hN = preview([mkRem({ legs: [{ side: 'SHORT', qty: 1, type: 'PUT', strike: 40, expiry: '2026-11-20', reason: 'absent', noBrokerId: true }], total: 1 })]);
  xassert(/not in the file \u2014 no broker id on this Journal leg, compared by contract/.test(hN) || /not in the file — no broker id on this Journal leg, compared by contract/.test(hN), 'preview: a leg without a broker id says that it was compared by contract');
  let h3 = preview([]);
  xassert(!/REMOVED from the Journal/.test(h3), 'preview: no removal section when nothing leaves');
  let h4 = preview([mkRem({ ticker: '<b>X</b>' })]);
  xassert(h4.indexOf('<b>X</b>') === -1 && h4.indexOf('&lt;b>X&lt;/b>') > 0, 'preview: the ticker is escaped');

  // ── static guards on the UI / save code ──────────────────────────────────
  const save = extractFn(HTML, 'journalImportExcelSave');
  xassert(save.indexOf('journalManager.add(') >= 0 && save.indexOf('_awaitJournalBackendWrite(') >= 0, 'save: goes through journalManager.add and awaits the backend outcome');
  xassert(save.indexOf('localStorage') === -1 && save.indexOf('_buildRichSnapshot') === -1 && save.indexOf('jSaveRemote') === -1, 'save: no direct storage, no snapshot build, no direct remote call');
  xassert(/Date\.now\(\) <= lastId/.test(save), 'save: never reuses a millisecond (journalManager.add stamps Date.now() as the id)');
  const RAW_INDEX = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  xassert(RAW_INDEX.indexOf('onclick="journalImportExcelPick()"') > 0 && RAW_INDEX.indexOf('id="jxiFile"') > 0 && /accept="\.xlsx,\.xls,\.csv"/.test(RAW_INDEX) && RAW_INDEX.indexOf('onchange="journalImportExcelFile(this)"') > 0,
    'the Journal header carries the IMPORT EXCEL button and its file input');
  xassert((HTML.match(/function\s+journalImportExcelSave\s*\(/g) || []).length === 1 && (HTML.match(/journalImportExcelSave\(\)/g) || []).length === 2, 'exactly one definition, called only from the modal button');

  // ── the save loop, with stand-ins for the managers ───────────────────────
  const adds = [];
  const dom = { jxiPortfolio: { value: 'pf-1' }, jxiProgress: { textContent: '' }, jxiGo: { disabled: false } };
  const toasts = [];
  const sctx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, parseFloat, isFinite, Promise, setTimeout,
    document: { getElementById: (id) => dom[id] || null },
    portfolioManager: { getAll: () => sctx.__pfs },
    journalManager: { getAll: () => [], getById: (id) => sctx.__trades.find(t => String(t.id) === String(id)) || null,
      addAdjustment: (id, a) => { sctx.__log.push(['adj', id, a]); }, update: (id, d) => { sctx.__log.push(['update', id, d]); Object.assign(sctx.__trades.find(t => String(t.id) === String(id)), d); },
      closeLegs: (id, lc) => { sctx.__log.push(['closeLegs', id, lc]); }, add: (p) => { const tr = Object.assign({ id: Date.now() }, p); adds.push(tr); return tr; }, _lastBackendWrite: null },
    normalizeOptionLegSymbolAliases: (tk, l) => Object.assign(l, { optionSymbol: l.streamerSymbol }),
    _awaitJournalBackendWrite: async () => ({ ok: true }), showToast: (m, k) => toasts.push([m, k]),
    deleteTrade: async (id, o) => { sctx.__log.push(['delete', id, o]); if (sctx.__deleteOk === false) return false; sctx.__trades = sctx.__trades.filter(t => String(t.id) !== String(id)); return true; },
    renderPortfolioJournalView() {}, isPortfolioViewActive: () => false, renderPortfolioView() {}, S: {},
    STRATEGY_TEMPLATES: {}, escHtml: (x) => String(x) });
  vm.runInContext(sym + '\n' + helpers + '\n' + extractFn(HTML, '_jxiGroups') + '\n' + extractFn(HTML, '_jxiClose') + '\n' + extractFn(HTML, '_jxiActions') + '\n' + extractFn(HTML, '_jxiRemovedLegCount') + '\n' + legStatusFns + '\n' + save, sctx);
  sctx.__pfs = [{ id: 'pf-1', name: 'Alpha' }, { id: 'pf-2', name: 'Beta' }];
  // ── regrouping in the preview ──
  let renders = 0;
  const mctx = vm.createContext({ console, Math, Object, Array, _jxiRender: () => { renders++; } });
  vm.runInContext(extractFn(HTML, '_jxiGroups') + '\n' + extractFn(HTML, '_jxiMoveLeg') + '\n' + extractFn(HTML, '_jxiSetStrategy') + '\n' + extractFn(HTML, '_jxiSetInclude'), mctx);
  const st = () => JSON.parse(vm.runInContext('JSON.stringify({ gid: _jxiState.gid, strategy: _jxiState.strategy, include: _jxiState.include })', mctx));
  const setState = (gid) => { mctx.__legs = [{ ticker: 'A' }, { ticker: 'A' }, { ticker: 'B' }]; vm.runInContext('_jxiState = { legs: __legs, gid: ' + J(gid) + ', strategy: { 1: "CUSTOM", 2: "LONG_PUT", 3: "X" }, include: {}, busy: false };', mctx); };
  setState([1, 2, 3]);
  vm.runInContext('_jxiMoveLeg(1, "1")', mctx);
  xassert(J(st().gid) === J([1, 1, 3]) && st().strategy[1] === undefined && st().strategy[2] === undefined && st().strategy[3] === 'X',
    'regroup: a leg moves to the chosen trade number and the strategy picked for the two affected trades is dropped (others kept)');
  setState([1, 1, 3]);
  vm.runInContext('_jxiMoveLeg(0, "3")', mctx);   // 2 trades → number 3 = a new trade
  xassert(J(st().gid) === J([4, 1, 3]), 'regroup: one past the last number starts a new trade');
  setState([1, 2, 3]);
  const r0 = renders;
  vm.runInContext('_jxiMoveLeg(0, "9"); _jxiMoveLeg(0, "x"); _jxiMoveLeg(0, "1")', mctx);
  xassert(J(st().gid) === J([1, 2, 3]) && renders === r0 + 3, 'regroup: an out-of-range, non-numeric or unchanged number changes nothing');
  vm.runInContext('_jxiState.busy = true; _jxiMoveLeg(1, "1"); _jxiSetStrategy(1, "Z"); _jxiSetInclude(1, true)', mctx);
  xassert(J(st().gid) === J([1, 2, 3]) && st().strategy[1] === 'CUSTOM' && st().include[1] === undefined, 'regroup: nothing can be edited while a save is running');
  vm.runInContext('_jxiState.busy = false; _jxiSetStrategy(2, "SHORT_PUT"); _jxiSetInclude(3, false)', mctx);
  xassert(st().strategy[2] === 'SHORT_PUT' && st().include[3] === false, 'regroup: a picked strategy and an unticked trade are remembered');
  const many = [];
  for (let i = 0; i < 6; i++) many.push({ row: i + 2, ticker: 'T' + i, type: 'PUT', side: 'SHORT', qty: 1, strike: 10 + i, expiry: '2026-11-20', entryPrice: 1, openDate: '2026-10-12', openedTs: 1000 + i * 1000, brokerPositionId: 'b' + i });
  sctx.__many = many;
  vm.runInContext('_jxiState = { file: "f.xlsx", sync: { changed: [], gone: [], conflict: [] }, removals: [], applyChange: {}, keepTrade: {}, legs: __many, gid: [1,2,3,4,5,6], dup: [], ignored: [], errors: [], include: { 3: false }, strategy: { 2: "CUSTOM" }, mode: "leg", busy: false };', sctx);
  dom.jxiPortfolio.value = '';
  vm.runInContext('journalImportExcelSave()', sctx).then(() => {
    xassert(adds.length === 0 && /Choose a portfolio/.test(dom.jxiProgress.textContent), 'save: with two portfolios and none chosen nothing is saved');
    dom.jxiPortfolio.value = 'pf-2';
    return vm.runInContext('journalImportExcelSave()', sctx);
  }).then(() => {
    xassert(adds.length === 5 && adds.every(x => x.portfolioId === 'pf-2'), 'save: unchecked trades are skipped, the rest go to the chosen portfolio');
    xassert(new Set(adds.map(x => x.id)).size === 5, 'save: ids are unique even when the stand-in add() answers within the same millisecond');
    xassert(adds.find(x => x.ticker === 'T1').strategy === 'CUSTOM' && adds.find(x => x.ticker === 'T0').strategy === 'SHORT_PUT', 'save: a strategy picked in the preview wins, otherwise it is inferred');
    xassert(adds.every(x => x.legs.every(l => l.optionSymbol && l.streamerSymbol)), 'save: leg symbol aliases are normalized before saving');
    xassert(toasts.length === 1 && /Imported 5 trade/.test(toasts[0][0]) && toasts[0][1] === 'ok', 'save: one summary toast with the real count');
    xassert(vm.runInContext('_jxiState', sctx) === null, 'save: the preview is closed afterwards');
    // one portfolio only → it is used without being chosen
    sctx.__pfs = [{ id: 'pf-9', name: 'Only' }]; dom.jxiPortfolio.value = ''; adds.length = 0;
    vm.runInContext('_jxiState = { file: "g.xlsx", sync: { changed: [], gone: [], conflict: [] }, removals: [], applyChange: {}, keepTrade: {}, legs: __many.slice(0, 2), gid: [1, 2], dup: [], ignored: [], errors: [], include: {}, strategy: {}, mode: "leg", busy: false };', sctx);
    return vm.runInContext('journalImportExcelSave()', sctx).then(() => {
      xassert(adds.length === 2 && adds.every(x => x.portfolioId === 'pf-9'), 'save: with a single portfolio it is used by default');
    });
  }).then(() => {
    // ── save: updates and removals of legs the Journal already holds ──
    const fresh = () => [jt([jl({ qty: 1, entryPrice: 1 }), jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 })]),
      jt([jl({ brokerPositionId: '1004', strike: 40 }), jl({ brokerPositionId: '9999', strike: 60 })], { id: 78 })];
    const startSync = (over, mutate) => {
      sctx.__trades = fresh(); if (mutate) mutate(sctx.__trades);
      sctx.__log = []; adds.length = 0; toasts.length = 0; dom.jxiProgress.textContent = ''; sctx.__deleteOk = true;
      const sy = JSON.parse(vm.runInContext('JSON.stringify(_jxiPlanSync(' + J(P) + ', ' + J(sctx.__trades) + '))', sctx));
      const rms = JSON.parse(vm.runInContext('JSON.stringify(_jxiPlanRemovals(' + J(sy.gone) + ', ' + J(sctx.__trades) + '))', sctx));
      sctx.__st = Object.assign({ file: 'new.xlsx', legs: [], gid: [], dup: [], ignored: [], errors: [], include: {}, strategy: {}, mode: 'time', busy: false,
        sync: sy, removals: rms, applyChange: {}, keepTrade: {} }, over || {});
      vm.runInContext('_jxiState = __st;', sctx);
      return sy;
    };
    const kinds = () => sctx.__log.map(x => x[0]).join();
    sctx.__pfs = [{ id: 'pf-1', name: 'Alpha' }, { id: 'pf-2', name: 'Beta' }];
    dom.jxiPortfolio.value = '';   // two portfolios, none chosen: updates and removals must not need one
    const sy0 = startSync();
    xassert(sy0.changed.length === 1 && sy0.gone.length === 2 && sctx.__st.removals.length === 1 && sctx.__st.removals[0].kind === 'TRADE', 'save-sync: fixture — one changed leg; two legs gone, which are every leg of one trade');
    return vm.runInContext('journalImportExcelSave()', sctx).then(() => {
      xassert(kinds() === 'adj,update,delete', 'save-sync: the change is noted and applied first, then the departed trade is deleted (got ' + kinds() + ')');
      xassert(sctx.__log[0][1] === 77 && sctx.__log[0][2].type === 'NOTE' && /^Excel sync \(new\.xlsx\): SHORT PUT 50 2026-11-20 — qty 1 → 2, open price 1 → 1\.2$/.test(sctx.__log[0][2].notes), 'save-sync: the note carries the real before / after values');
      const ul = sctx.__log[1][2].legs;
      xassert(sctx.__log[1][1] === 77 && ul[0].qty === 2 && ul[0].entryPrice === 1.2 && ul[1].qty === 2 && ul[1].entryPrice === 0.4, 'save-sync: the updated legs are saved through journalManager.update');
      xassert(sctx.__log[2][1] === 78 && J(sctx.__log[2][2]) === J({ skipConfirm: true, quiet: true }), 'save-sync: the whole trade goes through the same backend-first deleteTrade as the trash button — no confirm dialog, one summary toast');
      xassert(sctx.__trades.length === 1 && sctx.__trades[0].id === 77, 'save-sync: the departed trade is gone from the Journal');
      xassert(adds.length === 0 && toasts.length === 1 && toasts[0][1] === 'ok' && /^Updated 1 leg\(s\), removed 2 leg\(s\) from the Journal and Portfolio \(1 whole trade\(s\)\)/.test(toasts[0][0]), 'save-sync: one summary toast, counted from what really happened (got ' + toasts.map(t => t[0]) + ')');
      startSync({ keepTrade: { 0: true } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(kinds() === 'adj,update' && sctx.__trades.length === 2, 'save-sync: a trade unticked in the preview is kept');
      // updates on their own (nothing is removed): the note, the legs, one toast counted from what happened
      xassert(sctx.__log[0][0] === 'adj' && sctx.__log[1][0] === 'update' && !sctx.__log.some(x => x[0] === 'delete' || x[0] === 'closeLegs'), 'save-sync: a change alone is noted on the trade first, then the legs are updated - and nothing else happens');
      xassert(adds.length === 0 && toasts.length === 1 && toasts[0][0] === 'Updated 1 leg(s) — 1 confirmed by the backend' && toasts[0][1] === 'ok', 'save-sync: one summary toast, counted from what really happened (got ' + toasts.map(t => t[0]) + ')');
      startSync({ keepTrade: { 0: true } });
      sctx.__trades[0].legs.push(jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.9 }));
      sctx.__st.sync = JSON.parse(vm.runInContext('JSON.stringify(_jxiPlanSync(' + J(P) + ', ' + J(sctx.__trades) + '))', sctx));
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__st.sync.changed.length === 2 && /Updated 2 leg\(s\)/.test(toasts[0][0]) && sctx.__log.filter(x => x[0] === 'update').length === 1, 'save-sync: two changed legs of one trade are one update and are counted as two');
      startSync({ keepTrade: { 0: true } });
      sctx.__trades[0].legs[0].brokerPositionId = 'changed-meanwhile';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.length === 0 && toasts.length === 1 && toasts[0][1] === 'warn' && /FAILED: ACME: leg changed in the Journal meanwhile/.test(toasts[0][0]), 'save-sync: a leg that is no longer the one planned is not updated and is reported');
      startSync({ keepTrade: { 0: true }, applyChange: { 0: false } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.length === 0 && /Nothing selected/.test(dom.jxiProgress.textContent), 'save-sync: with every change unticked and every trade kept nothing is applied');
      startSync({ applyChange: { 0: false } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(kinds() === 'delete' && /^Removed 2 leg\(s\) from the Journal and Portfolio \(1 whole trade\(s\)\)/.test(toasts[0][0]), 'save-sync: a removal alone is enough to apply (got ' + kinds() + ' / ' + toasts.map(t => t[0]) + ')');
      // a trade that keeps a leg: only the departed leg is taken off
      startSync({ applyChange: { 0: false } }, (tr) => { tr[1].legs.push(jl({ brokerPositionId: undefined, side: 'LONG', strike: 45, entryPrice: 0.4 })); });
      xassert(sctx.__st.removals[0].kind === 'LEGS' && sctx.__st.removals[0].legs.length === 2 && sctx.__st.removals[0].kept === 1, 'save-sync: fixture — a hand-entered leg (no broker id) stays on the trade whose broker legs left');
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(kinds() === 'adj,update' && !sctx.__log.some(x => x[0] === 'delete'), 'save-sync: such a trade is edited, not deleted (got ' + kinds() + ')');
      const patch = sctx.__log[1][2];
      xassert(sctx.__log[1][1] === 78 && patch.legs.length === 1 && patch.legs[0].strike === 45 && patch.legs[0].brokerPositionId === undefined && patch.status === 'OPEN', 'save-sync: only the departed legs are taken off; the rest stays, and the trade stays OPEN');
      xassert(/^Excel sync \(new\.xlsx\): removed 2 leg\(s\) no longer open at the broker — /.test(sctx.__log[0][2].notes), 'save-sync: the removal is noted on the trade');
      xassert(toasts.length === 1 && /^Removed 2 leg\(s\) from the Journal and Portfolio — 1 confirmed by the backend$/.test(toasts[0][0]), 'save-sync: the toast counts the legs, and names no whole trade (got ' + toasts[0][0] + ')');
      // a Journal leg with no broker id that the file does not have goes the same way (the plan still recognises it at apply time)
      startSync({ applyChange: { 0: false }, keepTrade: { 0: true } }, (tr) => { tr.push(jt([jl({ brokerPositionId: undefined, strike: 99 })], { id: 90, ticker: 'ZED' })); });
      xassert(sctx.__st.removals.length === 2 && sctx.__st.removals[1].tradeId === 90 && sctx.__st.removals[1].legs[0].noBrokerId === true, 'save-sync: fixture - a trade made of one leg without a broker id, which the file does not have');
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.length === 1 && sctx.__log[0][0] === 'delete' && sctx.__log[0][1] === 90 && sctx.__trades.some(t => t.id === 78) && !sctx.__trades.some(t => t.id === 90) && toasts[0][1] === 'ok', 'save-sync: a leg without a broker id is removed (not reported as "changed meanwhile") (got ' + sctx.__log.map(x => x[0] + ':' + x[1]) + ' / ' + toasts.map(t => t[0]) + ')');
      // the backend refuses the delete: the trade stays, and the user is told
      startSync({ applyChange: { 0: false } });
      sctx.__deleteOk = false;
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__trades.length === 2 && toasts.length === 1 && toasts[0][1] === 'warn' && /FAILED: ACME: delete not confirmed by the backend — trade kept/.test(toasts[0][0]) && /^Nothing applied/.test(toasts[0][0]), 'save-sync: a delete the backend does not confirm leaves the trade and says so (got ' + toasts.map(t => t[0]) + ')');
      // the Journal changed since the preview
      startSync({ applyChange: { 0: false } });
      sctx.__trades[1].legs[0].brokerPositionId = 'changed-meanwhile';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(!sctx.__log.some(x => x[0] === 'delete') && toasts[0][1] === 'warn' && /FAILED: ACME: trade changed in the Journal meanwhile — not removed/.test(toasts[0][0]), 'save-sync: a trade that is no longer the one planned is not removed, and is reported');
      startSync({ applyChange: { 0: false } });
      sctx.__trades[1].legs.push(jl({ brokerPositionId: undefined, side: 'LONG', strike: 45, entryPrice: 0.4 }));      // a leg entered by hand since the preview: the whole trade no longer leaves
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(!sctx.__log.some(x => x[0] === 'delete' || x[0] === 'update') && toasts[0][1] === 'warn' && /FAILED: ACME: trade changed in the Journal meanwhile — not removed/.test(toasts[0][0]), 'save-sync: a trade that gained a leg since the preview is not deleted - the plan is no longer the one the user saw');
      startSync({ applyChange: { 0: false } });
      sctx.__trades[1].legs[1].legStatus = 'CLOSED';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(!sctx.__log.some(x => x[0] === 'delete') && /FAILED/.test(toasts[0][0]), 'save-sync: a leg closed in the meantime is not removed from under the user');
      startSync({ applyChange: { 0: false } });
      sctx.__trades.splice(1, 1);
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.length === 0 && /FAILED: ACME: trade changed in the Journal meanwhile/.test(toasts[0][0]), 'save-sync: a trade deleted in the meantime is reported, not retried');
      startSync({ legs: [many[0]], gid: [1] });
      dom.jxiPortfolio.value = 'pf-2';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(kinds() === 'adj,update,delete' && adds.length === 1 && adds[0].portfolioId === 'pf-2', 'save-sync: updates, removals and new trades can be applied in a single run');
      xassert(/^Imported 1 trade\(s\) into Beta, updated 1 leg\(s\), removed 2 leg\(s\) from the Journal and Portfolio/.test(toasts[0][0]), 'save-sync: one toast for all three (got ' + toasts[0][0] + ')');
      startSync({ legs: [many[0]], gid: [1] });
      dom.jxiPortfolio.value = '';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(adds.length === 0 && /Choose a portfolio/.test(dom.jxiProgress.textContent) && sctx.__log.length === 0, 'save-sync: new trades still need a portfolio — and nothing is applied (removals included) before that is settled');
    });
  }).then(() => {
    vm.runInContext('_jxiState = { busy: true };', sctx);
    vm.runInContext('_jxiClose()', sctx);
    xassert(vm.runInContext('_jxiState', sctx) !== null, 'close: the preview cannot be closed while a save is running');
    vm.runInContext('_jxiState = { busy: false }; _jxiClose();', sctx);
    xassert(vm.runInContext('_jxiState', sctx) === null, 'close: and it closes when idle');
    console.log('\n' + (xFailed === 0 ? 'EXCEL IMPORT ALL PASSED' : 'EXCEL IMPORT ' + xFailed + ' FAILED') + ' (' + xPassed + ' assertions)');
    if (xFailed > 0) process.exitCode = 1;
  }).catch(e => { console.error(e); process.exitCode = 1; });
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 150);
