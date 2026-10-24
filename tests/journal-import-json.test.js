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
  vm.runInContext(sym + '\n' + helpers, ctx);
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
  xassert(syncP.gone.length === 1 && syncP.gone[0].reason === 'closed' && syncP.matched === 0, 'sync: a leg the file lists as not open is proposed for closing, even when nothing else matches');
  syncP = plan([jt([jl(), jl({ brokerPositionId: '9999', strike: 60 })])]);
  xassert(syncP.gone.length === 1 && syncP.gone[0].reason === 'absent' && syncP.gone[0].brokerPositionId === '9999' && syncP.gone[0].idx === 1 && syncP.gone[0].strike === 60, 'sync: a leg absent from the file is proposed for closing when the file matches the Journal');
  syncP = plan([jt([jl({ brokerPositionId: '9999' })])]);
  xassert(syncP.gone.length === 0, 'sync: a file that shares no leg with the Journal never proposes closing "absent" legs (wrong account / wrong file)');
  syncP = plan([jt([jl({ brokerPositionId: '9999' }), jl({ brokerPositionId: '1004' })])]);
  xassert(syncP.gone.length === 1 && syncP.gone[0].reason === 'closed', 'sync: ... but a leg the file itself lists as closed is still reported');
  syncP = plan([jt([jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 }), jl({ brokerPositionId: '1005' })])]);
  xassert(syncP.gone.length === 0 && syncP.changed.length === 0 && syncP.conflict.length === 0, 'sync: a leg whose file row is unreadable is left alone (neither updated nor closed)');
  syncP = plan([jt([jl({ qty: 1 })], { status: 'CLOSED' }), jt([jl({ brokerPositionId: '9999' })], { status: 'CLOSED', id: 78 })]);
  xassert(syncP.changed.length === 0 && syncP.gone.length === 0 && syncP.matched === 0, 'sync: closed trades are never touched');
  syncP = plan([jt([jl({ qty: 1, legStatus: 'CLOSED' }), jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4, legStatus: 'EXPIRED_OTM' })])]);
  xassert(syncP.changed.length === 0 && syncP.gone.length === 0 && syncP.matched === 0, 'sync: legs that are no longer open in the Journal are never touched');
  syncP = plan([jt([jl({ qty: 1 }), jl({ brokerPositionId: undefined, strike: 77 }), null], { status: 'PARTIAL' })]);
  xassert(syncP.changed.length === 1 && syncP.changed[0].idx === 0 && syncP.gone.length === 0, 'sync: PARTIAL trades count; legs without a broker id and empty slots are skipped');
  syncP = plan([jt([jl({ qty: 1 })], { id: 5 }), jt([jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.9 })], { id: 6 })]);
  xassert(syncP.changed.map(c => c.key).join() === '5|0,6|0', 'sync: updates from several trades each carry their own trade id');
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
  const cpCtx = vm.createContext({ Number, String, isFinite });
  vm.runInContext(extractFn(HTML, '_jxiClosePriceOf'), cpCtx);
  [['""', null], ['null', null], ['undefined', null], ['" "', null], ['"0"', 0], ['0', 0], ['"0,35"', 0.35], ['" 1.5 "', 1.5], ['"-1"', null], ['"abc"', null], ['"Infinity"', null]].forEach(c =>
    xassert(vm.runInContext('_jxiClosePriceOf(' + c[0] + ')', cpCtx) === c[1], 'close price: ' + c[0] + ' → ' + c[1]));

  xassert(R('_jxiUnchangedCount([1,2,3,4], { changed: [1], conflict: [1] })') === 2 && R('_jxiUnchangedCount([], { changed: [1], conflict: [] })') === 0, 'count: unchanged = repeated legs minus changed minus conflicting, never negative');
  xassert(R('_jxiNothingToShow([], { changed: [], gone: [] })') === true && R('_jxiNothingToShow([1], { changed: [], gone: [] })') === false
    && R('_jxiNothingToShow([], { changed: [1], gone: [] })') === false && R('_jxiNothingToShow([], { changed: [], gone: [1] })') === false, 'empty: only a file with no new leg, no change and no leg to close is "nothing to import"');

  // ── opening the preview wires the plan in ──
  const octx = vm.createContext({ console, Date, Math, JSON, Object, Array, String, Number, parseFloat, isFinite,
    journalManager: { getAll: () => octx.__trades }, showToast() {}, _jxiRender() {} });
  octx.__trades = [jt([jl({ qty: 1 }), jl({ brokerPositionId: '9999', strike: 60 })])];
  vm.runInContext(sym + '\n' + helpers + '\n' + extractFn(HTML, '_jxiOpen'), octx);
  octx.__parsed = P;
  vm.runInContext('_jxiOpen("f.xlsx", __parsed)', octx);
  const os = JSON.parse(vm.runInContext('JSON.stringify(_jxiState)', octx));
  xassert(os.sync.changed.length === 1 && os.sync.gone.length === 1 && os.sync.matched === 1 && os.applyChange && J(os.closePrice) === '{}', 'open: the preview state carries the plan, empty choices');
  xassert(/^\d{4}-\d\d-\d\d$/.test(os.closeDate) && os.closeDate === new Date().toISOString().substring(0, 10), 'open: the close date defaults to today');
  xassert(os.legs.map(l => l.brokerPositionId).join() === '1002,1009' && os.dup.length === 1 && os.dup[0].brokerPositionId === '1001', 'open: new and already-present legs are still split as before');

  // ── the label of the apply button ────────────────────────────────────────
  const lctx = vm.createContext({ Math });
  vm.runInContext(extractFn(HTML, '_jxiGoLabel'), lctx);
  const lab = (a, u, c) => vm.runInContext('_jxiGoLabel({ adds: new Array(' + a + '), upd: new Array(' + u + '), closes: new Array(' + c + ') })', lctx);
  xassert(lab(0, 0, 0) === 'Nothing to apply' && lab(2, 0, 0) === 'Apply: 2 new trade(s)' && lab(0, 3, 0) === 'Apply: 3 update(s)' && lab(0, 0, 1) === 'Apply: 1 close(s)'
    && lab(2, 3, 1) === 'Apply: 2 new trade(s), 3 update(s), 1 close(s)', 'label: only the non-empty parts, in the order new / update / close');

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
      addAdjustment: (id, a) => { sctx.__log.push(['adj', id, a]); }, update: (id, d) => { sctx.__log.push(['update', id, d]); sctx.__trades.find(t => String(t.id) === String(id)).legs = d.legs; },
      closeLegs: (id, lc) => { sctx.__log.push(['closeLegs', id, lc]); }, add: (p) => { const tr = Object.assign({ id: Date.now() }, p); adds.push(tr); return tr; }, _lastBackendWrite: null },
    normalizeOptionLegSymbolAliases: (tk, l) => Object.assign(l, { optionSymbol: l.streamerSymbol }),
    _awaitJournalBackendWrite: async () => ({ ok: true }), showToast: (m, k) => toasts.push([m, k]),
    renderPortfolioJournalView() {}, isPortfolioViewActive: () => false, renderPortfolioView() {}, S: {},
    STRATEGY_TEMPLATES: {}, escHtml: (x) => String(x) });
  vm.runInContext(sym + '\n' + helpers + '\n' + extractFn(HTML, '_jxiGroups') + '\n' + extractFn(HTML, '_jxiClose') + '\n' + extractFn(HTML, '_jxiActions') + '\n' + extractFn(HTML, '_jxiClosePriceOf') + '\n' + save, sctx);
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
  vm.runInContext('_jxiState = { file: "f.xlsx", sync: { changed: [], gone: [], conflict: [] }, applyChange: {}, closePrice: {}, closeDate: "2026-10-20",  legs: __many, gid: [1,2,3,4,5,6], dup: [], ignored: [], errors: [], include: { 3: false }, strategy: { 2: "CUSTOM" }, mode: "leg", busy: false };', sctx);
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
    vm.runInContext('_jxiState = { file: "g.xlsx", sync: { changed: [], gone: [], conflict: [] }, applyChange: {}, closePrice: {}, closeDate: "2026-10-20",  legs: __many.slice(0, 2), gid: [1, 2], dup: [], ignored: [], errors: [], include: {}, strategy: {}, mode: "leg", busy: false };', sctx);
    return vm.runInContext('journalImportExcelSave()', sctx).then(() => {
      xassert(adds.length === 2 && adds.every(x => x.portfolioId === 'pf-9'), 'save: with a single portfolio it is used by default');
    });
  }).then(() => {
    // ── save: updates and closes of legs the Journal already holds ──
    const fresh = () => [jt([jl({ qty: 1, entryPrice: 1 }), jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.4 })]),
      jt([jl({ brokerPositionId: '1004', strike: 40 }), jl({ brokerPositionId: '9999', strike: 60 })], { id: 78 })];
    const startSync = (over) => {
      sctx.__trades = fresh(); sctx.__log = []; adds.length = 0; toasts.length = 0; dom.jxiProgress.textContent = '';
      const sy = JSON.parse(vm.runInContext('JSON.stringify(_jxiPlanSync(' + J(P) + ', ' + J(sctx.__trades) + '))', sctx));
      sctx.__st = Object.assign({ file: 'new.xlsx', legs: [], gid: [], dup: [], ignored: [], errors: [], include: {}, strategy: {}, mode: 'time', busy: false,
        sync: sy, applyChange: {}, closePrice: {}, closeDate: '2026-10-20' }, over || {});
      vm.runInContext('_jxiState = __st;', sctx);
      return sy;
    };
    sctx.__pfs = [{ id: 'pf-1', name: 'Alpha' }, { id: 'pf-2', name: 'Beta' }];
    dom.jxiPortfolio.value = '';   // two portfolios, none chosen: updates and closes must not need one
    const sy0 = startSync();
    xassert(sy0.changed.length === 1 && sy0.gone.length === 2, 'save-sync: fixture — one changed leg, two legs proposed for closing');
    return vm.runInContext('journalImportExcelSave()', sctx).then(() => {
      xassert(sctx.__log.length === 2 && sctx.__log[0][0] === 'adj' && sctx.__log[1][0] === 'update', 'save-sync: a change is noted on the trade first, then the legs are updated (and nothing else happens: no price typed, no close)');
      xassert(sctx.__log[0][1] === 77 && sctx.__log[0][2].type === 'NOTE' && /^Excel sync \(new\.xlsx\): SHORT PUT 50 2026-11-20 — qty 1 → 2, open price 1 → 1\.2$/.test(sctx.__log[0][2].notes), 'save-sync: the note carries the real before / after values');
      const ul = sctx.__log[1][2].legs;
      xassert(sctx.__log[1][1] === 77 && ul[0].qty === 2 && ul[0].entryPrice === 1.2 && ul[1].qty === 2 && ul[1].entryPrice === 0.4, 'save-sync: the updated legs are saved through journalManager.update');
      xassert(adds.length === 0 && toasts.length === 1 && toasts[0][0] === 'Updated 1 leg(s) — 1 confirmed by the backend' && toasts[0][1] === 'ok', 'save-sync: one summary toast, counted from what really happened (got ' + toasts.map(t => t[0]) + ')');
      startSync({ applyChange: { 0: false } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.length === 0 && /Nothing selected/.test(dom.jxiProgress.textContent), 'save-sync: an unticked change is not applied');
      startSync({ closePrice: { 0: '0,35', 1: '' } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      const kinds = sctx.__log.map(x => x[0]).join();
      xassert(kinds === 'adj,update,closeLegs', 'save-sync: updates come before closes (leg indexes stay valid) (got ' + kinds + ')');
      const cl = sctx.__log[2];
      xassert(cl[1] === 78 && J(cl[2]) === J([{ idx: 0, closeDate: '2026-10-20', closePrice: 0.35 }]), 'save-sync: only the leg with a typed price is closed, at that price, on the chosen date (the empty one stays open)');
      xassert(/Updated 1 leg\(s\), closed 1 leg\(s\)/.test(toasts[0][0]), 'save-sync: the toast counts both');
      startSync({ closePrice: { 1: '0' } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      const cl = sctx.__log.filter(x => x[0] === 'closeLegs');
      xassert(cl.length === 1 && J(cl[0][2]) === J([{ idx: 1, closeDate: '2026-10-20', closePrice: 0 }]), 'save-sync: a closing price of 0 (expired worthless) is a price, not "empty"');
      startSync({ closePrice: { 0: '0.35', 1: '0.5' }, applyChange: { 0: false } });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      const cl = sctx.__log.filter(x => x[0] === 'closeLegs');
      xassert(cl.length === 1 && cl[0][2].length === 2 && /Closed 2 leg\(s\)/.test(toasts[0][0]), 'save-sync: two legs of the same trade are closed in one call and counted as two');
      startSync({ closePrice: { 0: '1' }, closeDate: '' });
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.filter(x => x[0] === 'closeLegs')[0][2][0].closeDate === new Date().toISOString().substring(0, 10), 'save-sync: an emptied close date falls back to today');
      startSync();
      sctx.__trades[0].legs.push(jl({ brokerPositionId: '1002', side: 'LONG', strike: 45, entryPrice: 0.9 }));
      sctx.__st.sync = JSON.parse(vm.runInContext('JSON.stringify(_jxiPlanSync(' + J(P) + ', ' + J(sctx.__trades) + '))', sctx));
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__st.sync.changed.length === 2 && /Updated 2 leg\(s\)/.test(toasts[0][0]) && sctx.__log.filter(x => x[0] === 'update').length === 1, 'save-sync: two changed legs of one trade are one update and are counted as two');
      startSync();
      sctx.__trades[0].legs[0].brokerPositionId = 'changed-meanwhile';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.length === 0 && toasts.length === 1 && toasts[0][1] === 'warn' && /FAILED: ACME: leg changed in the Journal meanwhile/.test(toasts[0][0]), 'save-sync: a leg that is no longer the one planned is not touched and is reported');
      startSync({ closePrice: { 0: '1' } });
      sctx.__trades[1].legs[0].legStatus = 'CLOSED';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.filter(x => x[0] === 'closeLegs').length === 0 && /FAILED/.test(toasts[0][0]), 'save-sync: a leg closed in the meantime is not closed again');
      startSync({ legs: [many[0]], gid: [1], closePrice: { 0: '0.2' } });
      dom.jxiPortfolio.value = 'pf-2';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(sctx.__log.map(x => x[0]).join() === 'adj,update,closeLegs' && adds.length === 1 && adds[0].portfolioId === 'pf-2', 'save-sync: updates, closes and new trades can be applied in a single run');
      xassert(/^Imported 1 trade\(s\) into Beta, updated 1 leg\(s\), closed 1 leg\(s\)/.test(toasts[0][0]), 'save-sync: one toast for all three (got ' + toasts[0][0] + ')');
      startSync({ legs: [many[0]], gid: [1] });
      dom.jxiPortfolio.value = '';
      return vm.runInContext('journalImportExcelSave()', sctx);
    }).then(() => {
      xassert(adds.length === 0 && /Choose a portfolio/.test(dom.jxiProgress.textContent) && sctx.__log.length === 0, 'save-sync: new trades still need a portfolio — and nothing is applied before that is settled');
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
