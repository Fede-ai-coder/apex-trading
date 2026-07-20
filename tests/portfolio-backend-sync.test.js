'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND-ONLY PORTFOLIOS — sync / CRUD client validation.
//
// Extracts the REAL helpers from index.html and runs them in a vm sandbox with a
// mock ttCall + a faithful in-memory portfolioManager. Proves the backend-only
// contract (the localStorage fallback has been removed):
//
//   1.  startup load calls GET /portfolios.
//   2.  Backend has portfolios -> source 'backend' (cache := backend, string ids).
//   3.  Backend empty          -> source 'backend_empty', empty cache, NO fallback,
//                                 logs [PORTFOLIOS][BACKEND] load count=0.
//   4.  Backend error / 401    -> setLoadError, source 'backend_error', empty cache,
//                                 logs [PORTFOLIOS][BACKEND] error reason=request_failed,
//                                 and NO local data is shown as a fallback.
//   5.  Not configured (no BACKEND) -> error reason 'not_configured', no GET.
//   6.  Missing API key            -> error reason 'missing_api_key', no GET.
//   7.  localhost dev env          -> backend not usable, NO backend call, error state.
//   8.  Create -> POST /portfolios, uses the backend-returned id (string).
//   9.  Update -> PUT /portfolios/:id (never sends id/createdAt).
//   10. Delete -> DELETE /portfolios/:id.
//   11. Reconciliation matching is tolerant (String(pid) === String(id)).
//   12. apexDebugPortfolioState exposes portfolioSource (no local cache field).
//   13. Static guards: portfolioManager never reads/writes apex_portfolios or
//       localStorage, mints no Date.now() ids; the sync has no fallback states and
//       never auto-imports; ids stay strings.
//
// Run: node tests/portfolio-backend-sync.test.js
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
function assert(cond, msg) {
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

const J = (a) => JSON.stringify(a);

// A localStorage that fails LOUDLY on any apex_portfolios access: a forbidden
// local fallback would trip it. Generic keys are tolerated (other helpers may
// enumerate keys), but the portfolio key must never be read or written.
function trapStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  const guard = (k) => { if (String(k).indexOf('apex_portfolios') !== -1) throw new Error('portfolio localStorage access is forbidden: ' + k); };
  return {
    getItem(k) { guard(k); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { guard(k); map.set(k, String(v)); },
    removeItem(k) { guard(k); map.delete(k); },
    key(i) { return Array.from(map.keys())[i]; },
    get length() { return map.size; },
    _dump() { return Object.fromEntries(map); },
  };
}

// Faithful in-memory portfolioManager mirroring the NEW backend-only contract.
function makePortfolioManager(initial) {
  const norm = (p) => (p && p.id != null) ? Object.assign({}, p, { id: String(p.id) }) : p;
  let list = (initial || []).map(norm);
  let loaded = false, loadError = null;
  return {
    getAll() { return list.slice(); },
    getById(id) { if (id == null) return null; const s = String(id); return list.find(p => String(p.id) === s) || null; },
    isLoaded() { return loaded; },
    getLoadError() { return loadError ? { reason: loadError.reason, message: loadError.message } : null; },
    getSource() { if (loadError) return 'backend_error'; if (!loaded) return 'loading'; return list.length ? 'backend' : 'backend_empty'; },
    setLoadError(reason, message) { loaded = false; list = []; loadError = { reason: reason || 'request_failed', message: message || '' }; },
    setFromBackend(l) { if (!Array.isArray(l)) return false; list = l.map(norm); loaded = true; loadError = null; return true; },
    upsertLocal(p) {
      if (!p || p.id == null) return false;
      p = norm(p);
      const s = String(p.id); const i = list.findIndex(x => String(x.id) === s);
      if (i >= 0) list[i] = Object.assign({}, list[i], p); else list.push(p);
      return true;
    },
    removeLocalOnly(id) { const s = String(id); list = list.filter(p => String(p.id) !== s); },
    _list() { return list; },
  };
}

function makeTtCall(router) {
  const calls = [];
  const fn = async function(path, opts) {
    opts = opts || {};
    calls.push({ path, method: opts.method || 'GET', body: opts.body });
    return router(path, opts);
  };
  fn._calls = calls;
  return fn;
}

function makeCtx(opts) {
  opts = opts || {};
  const storage = trapStorage(opts.seed);
  const pm = opts.portfolioManager || makePortfolioManager(opts.portfolios || []);
  const ttCall = opts.ttCall || makeTtCall(() => ({ ok: true, portfolios: [], count: 0 }));
  const toasts = [];
  const logs = { log: [], warn: [], error: [] };
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    document: { lastModified: 'Fri, 12 Jun 2026 00:00:00 GMT' },
    localStorage: storage,
    console: {
      log: (...a) => logs.log.push(a.join(' ')),
      warn: (...a) => logs.warn.push(a.join(' ')),
      error: (...a) => logs.error.push(a.join(' ')),
      table() {},
    },
    JSON, Array, Date, String, Object, Promise, encodeURIComponent, RegExp,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    APEX_BUILD_TAG: 'test-build',
    _activeView: 'portfolio',
    _portfolioBackendSyncInFlight: false,
    _activePanelPortfolioId: opts.activePanelPortfolioId != null ? opts.activePanelPortfolioId : null,
    portfolioManager: pm,
    journalManager: { getAll: () => (opts.trades || []).slice() },
    positionManager: { getAll: () => (opts.trades || []).filter(t => t.status === 'OPEN' || t.status === 'PARTIAL') },
    ttCall,
    showToast: (m, k) => toasts.push([k, m]),
    renderPortfolioView: () => {},
    confirm: () => (opts.confirm !== false),
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_apexReadArray'),
    extractFn(HTML, 'apexStorageKey'),
    extractFn(HTML, 'isApexPreviewOrLocalEnv'),
    extractFn(HTML, 'isApexLocalDevEnv'),
    extractFn(HTML, 'apexStorageKeyVariants'),
    extractFn(HTML, 'apexNonDestructiveLoadArray'),
    extractFn(HTML, 'apexDumpStorageKeys'),
    extractFn(HTML, 'getPortfolioJournalReconciliation'),
    extractFn(HTML, 'apexDebugPortfolioState'),
    extractFn(HTML, 'backendListPortfolios'),
    extractFn(HTML, 'backendGetPortfolio'),
    extractFn(HTML, 'backendCreatePortfolio'),
    extractFn(HTML, 'backendUpdatePortfolio'),
    extractFn(HTML, 'backendDeletePortfolio'),
    extractFn(HTML, '_portfolioBackendUsable'),
    extractFn(HTML, '_syncPortfoliosFromBackend'),
    extractFn(HTML, 'portfolioApplyUpdate'),
  ].join('\n'), ctx);
  ctx._storage = storage;
  ctx._toasts = toasts;
  ctx._logs = logs;
  ctx._ttCall = ttCall;
  ctx._pm = pm;
  return ctx;
}

// ── 1 & 2. startup load hits GET /portfolios; non-empty -> 'backend' ──────────
(async function() {
  const tt = makeTtCall((p) => {
    if (p === '/portfolios') return { ok: true, portfolios: [
      { id: 7, name: 'Live', type: 'options' },
      { id: 'uuid-xyz', name: 'Testing', type: 'paper' },
    ], count: 2 };
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(tt._calls.some(c => c.path === '/portfolios' && c.method === 'GET'), '1: GET /portfolios called on load');
  assert(src === 'backend', '2: source becomes "backend" when backend has portfolios');
  assert(ctx._pm.getAll().length === 2, '2: cache populated from backend');
  assert(ctx._pm.getById('7') && ctx._pm.getById('uuid-xyz'), '2: ids preserved as strings (numeric + uuid)');
  assert(ctx._logs.log.some(l => l.indexOf('[PORTFOLIOS][BACKEND] load count=2') !== -1), '2: load count=2 logged');
  console.log('✓ 1/2 startup load -> backend authoritative, string ids');
})();

// ── 3. backend empty -> 'backend_empty', empty cache, NO fallback ────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [], count: 0 }));
  // seed a stale local cache to prove it is NEVER consulted (trapStorage throws if it is)
  const ctx = makeCtx({ ttCall: tt, seed: { /* no apex_portfolios — trap guards it */ } });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_empty', '3: backend empty -> source backend_empty');
  assert(ctx._pm.getAll().length === 0, '3: empty cache (no legacy local recovery)');
  assert(ctx._pm.getLoadError() === null, '3: empty is not an error');
  assert(ctx._logs.log.some(l => l.indexOf('[PORTFOLIOS][BACKEND] load count=0') !== -1), '3: load count=0 logged');
  console.log('✓ 3 backend empty -> empty state, no localStorage fallback');
})();

// ── 4. backend error -> error state, empty cache, NO local fallback ──────────
(async function() {
  const tt = makeTtCall(() => { throw new Error('401 invalid key'); });
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 1, name: 'Stale local' }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_error', '4: backend error -> source backend_error');
  assert(ctx._pm.getAll().length === 0, '4: cache cleared — stale local NOT shown as fallback');
  const e = ctx._pm.getLoadError();
  assert(e && e.reason === 'request_failed', '4: getLoadError reason request_failed');
  assert(ctx._logs.error.some(l => l.indexOf('[PORTFOLIOS][BACKEND] error reason=request_failed') !== -1),
    '4: error reason=request_failed logged');
  console.log('✓ 4 backend error -> error state, no local fallback');
})();

// ── 4b. backend ok:false response -> request_failed error ────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: false, error: 'boom' }));
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 1 }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_error', '4b: ok:false -> backend_error');
  assert(ctx._pm.getAll().length === 0, '4b: no local fallback on ok:false');
  console.log('✓ 4b backend ok:false -> error, no fallback');
})();

// ── 5. not configured (no BACKEND) -> not_configured, no GET ─────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [{ id: 9 }], count: 1 }));
  const ctx = makeCtx({ ttCall: tt, BACKEND: '' });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_error', '5: no BACKEND -> error state');
  assert(ctx._pm.getLoadError().reason === 'not_configured', '5: reason not_configured');
  assert(tt._calls.length === 0, '5: no backend call attempted');
  assert(ctx._logs.error.some(l => l.indexOf('error reason=not_configured') !== -1), '5: not_configured logged');
  console.log('✓ 5 backend not configured -> error, no call, no fallback');
})();

// ── 6. missing API key -> missing_api_key, no GET ────────────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [{ id: 9 }], count: 1 }));
  const ctx = makeCtx({ ttCall: tt, backendKey: '' });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_error', '6: missing key -> error state');
  assert(ctx._pm.getLoadError().reason === 'missing_api_key', '6: reason missing_api_key');
  assert(tt._calls.length === 0, '6: no backend call attempted');
  console.log('✓ 6 missing API key -> error, no call, no fallback');
})();

// ── 7. localhost dev env -> not usable, NO backend call, error state ─────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [{ id: 9 }], count: 1 }));
  const ctx = makeCtx({ ttCall: tt, host: 'localhost' });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(ctx._portfolioBackendUsable() === false, '7: localhost -> backend not usable');
  assert(tt._calls.length === 0, '7: localhost never calls backend');
  assert(src === 'backend_error', '7: localhost -> error state (no local fallback)');
  console.log('✓ 7 localhost: not usable, no backend call, no fallback');
})();

// ── 7b. deploy-preview WITH backend+key -> usable, DOES call backend ─────────
(async function() {
  const ctxUsable = makeCtx({ host: 'deploy-preview-256--apex.netlify.app', BACKEND: 'https://backend.example', backendKey: 'k-1' });
  assert(ctxUsable._portfolioBackendUsable() === true, '7b: deploy-preview + backend/key -> usable=true');
  const tt = makeTtCall((p) => (p === '/portfolios')
    ? { ok: true, portfolios: [{ id: 'a', name: 'Live', type: 'options' }], count: 1 } : { ok: false });
  const ctx = makeCtx({ ttCall: tt, host: 'deploy-preview-256--apex.netlify.app' });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(tt._calls.some(c => c.path === '/portfolios' && c.method === 'GET'), '7b: deploy-preview calls GET /portfolios');
  assert(src === 'backend', '7b: deploy-preview resolves from backend');
  console.log('✓ 7b deploy-preview: backend usable + GET /portfolios');
})();

// ── 8. create helper calls POST /portfolios, uses backend id (string) ────────
(async function() {
  const tt = makeTtCall((p, o) => {
    const body = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
    return { ok: true, id: 'srv-id', portfolio: Object.assign({ id: 'srv-id' }, body) };
  });
  const ctx = makeCtx({ ttCall: tt });
  const res = await ctx.backendCreatePortfolio({ name: 'New', description: 'type=options' });
  const post = tt._calls.find(c => c.method === 'POST');
  assert(post && post.path === '/portfolios', '8: create -> POST /portfolios');
  assert(res.ok === true && res.portfolio.id === 'srv-id', '8: returns backend-generated id');
  ctx._pm.upsertLocal(res.portfolio);
  assert(ctx._pm.getById('srv-id') && typeof ctx._pm.getById('srv-id').id === 'string', '8: cached by backend string id');
  console.log('✓ 8 create -> POST /portfolios with backend id');
})();

// ── 9. update calls PUT /portfolios/:id and never sends id/createdAt ─────────
(async function() {
  const tt = makeTtCall((p, o) => {
    const body = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
    return { ok: true, id: 'p1', portfolio: Object.assign({ id: 'p1', name: 'Old' }, body) };
  });
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 'p1', name: 'Old', createdAt: 'x' }] });
  await ctx.portfolioApplyUpdate('p1', { name: 'Renamed', id: 'HACK', createdAt: 'HACK' });
  const put = tt._calls.find(c => c.method === 'PUT');
  assert(put && put.path === '/portfolios/p1', '9: update -> PUT /portfolios/:id');
  const sentBody = typeof put.body === 'string' ? JSON.parse(put.body) : put.body;
  assert(sentBody.name === 'Renamed', '9: sends changed field');
  assert(!('id' in sentBody) && !('createdAt' in sentBody), '9: never sends id/createdAt');
  console.log('✓ 9 update -> PUT /portfolios/:id, id/createdAt stripped');
})();

// ── 9b. update blocked when backend unusable (no local change) ───────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true }));
  const ctx = makeCtx({ ttCall: tt, backendKey: '', portfolios: [{ id: 'p1', name: 'Old' }] });
  const res = await ctx.portfolioApplyUpdate('p1', { name: 'Renamed' });
  assert(res.ok === false, '9b: update returns error when backend unusable');
  assert(!tt._calls.some(c => c.method === 'PUT'), '9b: no PUT issued when backend unusable');
  assert(ctx._pm.getById('p1').name === 'Old', '9b: cache unchanged (no local-only update)');
  console.log('✓ 9b update blocked when backend unavailable');
})();

// ── 10. delete calls DELETE /portfolios/:id ──────────────────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true }));
  const ctx = makeCtx({ ttCall: tt });
  await ctx.backendDeletePortfolio('p9');
  const del = tt._calls.find(c => c.method === 'DELETE');
  assert(del && del.path === '/portfolios/p9', '10: delete -> DELETE /portfolios/:id');
  console.log('✓ 10 delete -> DELETE /portfolios/:id');
})();

// ── 11. reconciliation tolerant string matching (numeric id vs string pid) ───
(function() {
  const portfolios = [{ id: 1717171717, name: 'Live', type: 'options' }];
  const trades = [
    { id: 't1', portfolioId: '1717171717', ticker: 'AAA', status: 'OPEN' },
    { id: 't2', portfolioId: 1717171717, ticker: 'BBB', status: 'CLOSED' },
    { id: 't3', portfolioId: '999', ticker: 'CCC', status: 'OPEN' },
  ];
  const pm = makePortfolioManager([]);
  pm.setFromBackend(portfolios);
  const ctx = makeCtx({ portfolioManager: pm, trades });
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 2, '11: tolerant matching assigns numeric+string pid trades');
  assert(rec.unassignedTradeCount === 1, '11: dangling pid stays unassigned');
  console.log('✓ 11 reconciliation tolerant string-based matching');
})();

// ── 12. apexDebugPortfolioState exposes portfolioSource (no local cache field) ─
(async function() {
  const pm = makePortfolioManager([]);
  pm.setFromBackend([{ id: 'a', name: 'Live', type: 'options' }, { id: 'b', name: 'Testing', type: 'paper' }]);
  const ctx = makeCtx({ portfolioManager: pm, BACKEND: '' });
  const res = await ctx.apexDebugPortfolioState({ probeBackend: false });
  assert('portfolioSource' in res, '12: result has portfolioSource');
  assert(res.portfolioSource === 'backend', '12: portfolioSource reflects manager state');
  assert(res.portfoliosCount === 2, '12: portfoliosCount reflects in-memory backend cache');
  assert(!('localPortfolioCount' in res) && !('localPortfoliosMetadata' in res),
    '12: no local cache fields (portfolios are not in localStorage)');
  console.log('✓ 12 apexDebugPortfolioState exposes backend source, no local cache field');
})();

// ── 13. static guards: backend-only, no apex_portfolios storage, no fallback ──
(function() {
  // portfolioManager IIFE never touches apex_portfolios / localStorage / Date.now.
  const pmStart = HTML.indexOf('var portfolioManager = (function() {');
  const pmEnd = HTML.indexOf('})();', pmStart) + 5;
  const pmSrc = HTML.slice(pmStart, pmEnd);
  assert(pmSrc.indexOf('apex_portfolios') === -1, '13: portfolioManager never references apex_portfolios');
  assert(pmSrc.indexOf('localStorage') === -1, '13: portfolioManager never touches localStorage');
  assert(!/Date\.now\s*\(/.test(pmSrc), '13: portfolioManager mints no Date.now() ids');

  // The sync has no fallback states and never auto-imports.
  const syncSrc = extractFn(HTML, '_syncPortfoliosFromBackend');
  ['fallback_local', 'local_fallback', 'backend_empty_local_available', 'backend_empty_legacy_local_available']
    .forEach(tok => assert(syncSrc.indexOf(tok) === -1, '13: sync has no "' + tok + '"'));
  const syncCode = syncSrc.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(syncCode.indexOf('backendCreatePortfolio') === -1, '13: startup sync never POSTs/auto-imports');
  assert(syncCode.indexOf('localStorage') === -1, '13: startup sync never reads localStorage');

  // The legacy local-import helpers are gone entirely.
  assert(HTML.indexOf('function importLocalPortfoliosToBackend') === -1, '13: importLocalPortfoliosToBackend removed');
  assert(HTML.indexOf('function apexImportPortfoliosJson') === -1, '13: apexImportPortfoliosJson removed');
  assert(HTML.indexOf("apexNonDestructiveLoadArray('apex_portfolios')") === -1,
    '13: no apexNonDestructiveLoadArray(apex_portfolios) anywhere');
  console.log('✓ 13 backend-only static guards: no apex_portfolios storage, no fallback, no auto-import');
})();

// ── summary ──────────────────────────────────────────────────────────────────
setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') +
    ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 100);
