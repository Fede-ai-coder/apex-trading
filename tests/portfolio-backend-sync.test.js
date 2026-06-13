'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND-BACKED PORTFOLIOS — sync / import / CRUD client validation.
//
// Extracts the REAL helpers from index.html and runs them in a vm sandbox with a
// mock ttCall + a faithful in-memory portfolioManager. Proves the contract from
// the feature spec:
//
//   1.  portfolioManager startup probe calls GET /portfolios.
//   2.  Backend has portfolios  -> source 'backend' (cache updated from backend).
//   3.  Backend empty + local   -> source 'backend_empty_local_available'.
//   4.  In that case NO POST /portfolios happens automatically (no auto-upload).
//   5.  Manual import POSTs every local portfolio.
//   6.  Import preserves legacy numeric ids exactly.
//   7.  Import re-reads the backend (GET /portfolios) afterwards.
//   8.  Create calls POST /portfolios.
//   9.  Update calls PUT /portfolios/:id (and never sends id/createdAt).
//   10. Delete calls DELETE /portfolios/:id.
//   11. Reconciliation matching is tolerant (String(pid) === String(id)).
//   12. apexDebugPortfolioState() includes portfolioSource + backend/local counts.
//   13. The feature code never clears localStorage / removes apex_portfolios,
//       never auto-imports on startup, never mutates trade.portfolioId.
//   14. The feature code touches no Greeks/Vega/Theta/BWD/risk-metric formulas.
//
// Run: node tests/portfolio-backend-sync.test.js
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
  if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); }
}

const J = (a) => JSON.stringify(a);

function makeStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  const writes = [];
  return {
    getItem(k) { return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { writes.push(['set', k]); map.set(k, String(v)); },
    removeItem(k) { writes.push(['remove', k]); map.delete(k); },
    clear() { writes.push(['clear']); map.clear(); },
    key(i) { return Array.from(map.keys())[i]; },
    get length() { return map.size; },
    _dump() { return Object.fromEntries(map); },
    _writes() { return writes; },
  };
}

// Faithful in-memory portfolioManager mirroring the real contract used by the
// extracted helpers (getAll/getSource/_setSource/setFromBackend/upsertLocal).
function makePortfolioManager(initial) {
  let list = (initial || []).slice();
  let source = 'local_fallback';
  return {
    getAll() { return list.slice(); },
    getById(id) { const s = String(id); return list.find(p => String(p.id) === s) || null; },
    getSource() { return source; },
    _setSource(s) { if (s) source = s; },
    setFromBackend(l) { if (!Array.isArray(l)) return false; list = l.slice(); source = 'backend'; return true; },
    upsertLocal(p) {
      if (!p || p.id == null) return false;
      const s = String(p.id); const i = list.findIndex(x => String(x.id) === s);
      if (i >= 0) list[i] = Object.assign({}, list[i], p); else list.push(p);
      return true;
    },
    removeLocalOnly(id) { const s = String(id); list = list.filter(p => String(p.id) !== s); },
    _list() { return list; },
  };
}

// Recording ttCall: a router(path, opts) returns the response object (or throws).
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
  const storage = makeStorage(opts.seed);
  const pm = opts.portfolioManager || makePortfolioManager(opts.portfolios || []);
  const ttCall = opts.ttCall || makeTtCall(() => ({ ok: true, portfolios: [], count: 0 }));
  const toasts = [];
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    document: { lastModified: 'Fri, 12 Jun 2026 00:00:00 GMT' },
    localStorage: storage,
    console: { log() {}, warn() {}, error() {}, table() {} },
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
    extractFn(HTML, 'importLocalPortfoliosToBackend'),
    extractFn(HTML, 'apexImportPortfoliosJson'),
    extractFn(HTML, 'portfolioApplyUpdate'),
  ].join('\n'), ctx);
  ctx._storage = storage;
  ctx._toasts = toasts;
  ctx._ttCall = ttCall;
  ctx._pm = pm;
  return ctx;
}

// ── 1 & 2. startup probe hits GET /portfolios; non-empty backend -> 'backend' ─
(async function() {
  const tt = makeTtCall((p) => {
    if (p === '/portfolios') return { ok: true, portfolios: [
      { id: 'aaa', name: 'Live', type: 'options' },
      { id: 'bbb', name: 'Testing', type: 'paper' },
    ], count: 2 };
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 1, name: 'Saxo', type: 'options' }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(tt._calls.some(c => c.path === '/portfolios' && c.method === 'GET'), '1: GET /portfolios called on sync');
  assert(src === 'backend', '2: source becomes "backend" when backend has portfolios');
  assert(ctx._pm.getAll().length === 2 && ctx._pm.getById('aaa'), '2: cache replaced with backend list');
  console.log('✓ 1/2 startup probe -> backend authoritative');
})();

// ── 3 & 4. backend empty + local present -> backend_empty_local_available, NO POST
(async function() {
  const tt = makeTtCall((p, o) => {
    if (p === '/portfolios' && (!o || (o.method || 'GET') === 'GET')) return { ok: true, portfolios: [], count: 0 };
    return { ok: true };
  });
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 7, name: 'Live', type: 'options' }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_empty_local_available', '3: source is backend_empty_local_available');
  assert(!tt._calls.some(c => c.method === 'POST'), '4: NO POST /portfolios auto-upload on sync');
  assert(ctx._pm.getAll().length === 1, '4: local cache preserved, not overwritten');
  console.log('✓ 3/4 backend-empty + local -> manual import state, no auto-upload');
})();

// ── backend empty + no local -> backend_empty ────────────────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [], count: 0 }));
  const ctx = makeCtx({ ttCall: tt, portfolios: [] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_empty', 'backend empty + no local -> backend_empty');
  console.log('✓ backend-empty + no local -> backend_empty');
})();

// ── backend error / 401 -> backend_unavailable (local fallback) ──────────────
(async function() {
  const tt = makeTtCall(() => { throw new Error('401 invalid key'); });
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 1, name: 'Saxo' }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend_unavailable', 'backend error -> backend_unavailable');
  assert(ctx._pm.getAll().length === 1, 'local fallback preserved on backend error');
  console.log('✓ backend error -> backend_unavailable, local fallback intact');
})();

// ── localhost dev env -> local_fallback, never calls backend ─────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [{ id: 9 }], count: 1 }));
  const ctx = makeCtx({ ttCall: tt, host: 'localhost', portfolios: [{ id: 1 }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'local_fallback', 'localhost -> local_fallback');
  assert(tt._calls.length === 0, 'localhost never calls backend');
  console.log('✓ localhost dev env -> local_fallback, no backend call');
})();

// ── file:// dev env -> local_fallback, never calls backend ───────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [{ id: 9 }], count: 1 }));
  const ctx = makeCtx({ ttCall: tt, host: '', protocol: 'file:', portfolios: [{ id: 1 }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'local_fallback', 'file:// -> local_fallback');
  assert(tt._calls.length === 0, 'file:// never calls backend');
  console.log('✓ file:// dev env -> local_fallback, no backend call');
})();

// ── Netlify deploy-preview WITH backend+key -> backend usable, DOES call backend
(async function() {
  // 1) _portfolioBackendUsable() is true on a deploy-preview host when configured
  const ctxUsable = makeCtx({ host: 'deploy-preview-256--apex.netlify.app', BACKEND: 'https://backend.example', backendKey: 'k-1' });
  assert(ctxUsable._portfolioBackendUsable() === true, 'deploy-preview + backend/key -> usable=true');
  // and false when the key is missing (config gate still applies)
  const ctxNoKey = makeCtx({ host: 'deploy-preview-256--apex.netlify.app', BACKEND: 'https://backend.example', backendKey: '' });
  assert(ctxNoKey._portfolioBackendUsable() === false, 'deploy-preview without key -> usable=false');

  // 2) sync on a deploy-preview must NOT force local_fallback — it hits the backend
  const tt = makeTtCall((p) => {
    if (p === '/portfolios') return { ok: true, portfolios: [{ id: 'a', name: 'Live', type: 'options' }], count: 1 };
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt, host: 'deploy-preview-256--apex.netlify.app', portfolios: [{ id: 1, name: 'Saxo' }] });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src !== 'local_fallback', 'deploy-preview does NOT force local_fallback');
  assert(tt._calls.some(c => c.path === '/portfolios' && c.method === 'GET'), 'deploy-preview calls GET /portfolios');
  assert(src === 'backend', 'deploy-preview resolves source from backend (backend)');
  console.log('✓ Netlify deploy-preview: backend usable + GET /portfolios, no forced local_fallback');
})();

// ── 5/6/7. manual import POSTs each local portfolio, preserves ids, re-GETs ───
(async function() {
  let posted = [];
  const tt = makeTtCall((p, o) => {
    o = o || {};
    if (p === '/portfolios' && (o.method || 'GET') === 'POST') {
      const body = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
      posted.push(body);
      return { ok: true, id: body.id, portfolio: body };
    }
    if (p === '/portfolios') { // GET after import
      return { ok: true, portfolios: posted.slice(), count: posted.length };
    }
    return { ok: false };
  });
  const locals = [
    { id: 1717171717, name: 'Live', type: 'options', createdAt: '2025-01-01' },   // legacy numeric id
    { id: 1818181818, name: 'Testing', type: 'paper', createdAt: '2025-02-02' },
  ];
  const ctx = makeCtx({ ttCall: tt, portfolios: locals });
  const report = await ctx.importLocalPortfoliosToBackend({ skipConfirm: true });
  const posts = tt._calls.filter(c => c.method === 'POST');
  assert(posts.length === 2, '5: POST /portfolios called once per local portfolio');
  assert(posted[0].id === 1717171717 && posted[1].id === 1818181818, '6: legacy numeric ids preserved exactly');
  assert(tt._calls.filter(c => c.path === '/portfolios' && c.method === 'GET').length >= 1, '7: GET /portfolios re-read after import');
  assert(report.imported === 2 && report.failed === 0, '5: import report counts imported');
  assert(ctx._pm.getSource() === 'backend', '7: source flips to backend after successful import');
  console.log('✓ 5/6/7 manual import: POST per portfolio, ids preserved, re-GET, source->backend');
})();

// ── import reports duplicates without creating them ──────────────────────────
(async function() {
  const tt = makeTtCall((p, o) => {
    o = o || {};
    if (p === '/portfolios' && (o.method || 'GET') === 'POST') return { ok: false, error: 'exists', code: 'duplicate' };
    if (p === '/portfolios') return { ok: true, portfolios: [{ id: 1, name: 'Live' }], count: 1 };
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt, portfolios: [{ id: 1, name: 'Live' }] });
  const report = await ctx.importLocalPortfoliosToBackend({ skipConfirm: true });
  assert(report.duplicate === 1 && report.imported === 0, 'duplicate reported, not counted as imported');
  console.log('✓ import duplicate handling');
})();

// ── import requires backend; blocked when unavailable ────────────────────────
(async function() {
  const ctx = makeCtx({ backendKey: '', portfolios: [{ id: 1 }] });
  const report = await ctx.importLocalPortfoliosToBackend({ skipConfirm: true });
  assert(report.ok === false && report.reason === 'backend_unavailable', 'import blocked when backend unusable');
  console.log('✓ import blocked when backend unavailable');
})();

// ── apexImportPortfoliosJson: JSON-string import, id preservation, no mutation ─
(async function() {
  let posted = [];
  const tt = makeTtCall((p, o) => {
    o = o || {};
    if (p === '/portfolios' && (o.method || 'GET') === 'POST') {
      const b = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
      posted.push(b);
      return { ok: true, id: b.id, portfolio: b };
    }
    if (p === '/portfolios') return { ok: true, portfolios: posted.slice(), count: posted.length };
    return { ok: false };
  });
  const trades = [{ id: 't1', portfolioId: 1717171717, ticker: 'AAA', status: 'OPEN' }];
  const ctx = makeCtx({ ttCall: tt, portfolios: [], trades });
  const tradesBefore = J(ctx.journalManager.getAll());
  const posBefore    = J(ctx.positionManager.getAll());
  const json = JSON.stringify([
    { id: 1717171717, name: 'Live', type: 'options', createdAt: '2025-01-01' },  // legacy numeric id
    { id: 1818181818, name: 'Testing', type: 'paper' },
  ]);
  const rep = await ctx.apexImportPortfoliosJson(json);
  assert(posted.length === 2, 'JSON import POSTs each portfolio');
  assert(posted[0].id === 1717171717 && posted[1].id === 1818181818, 'JSON import preserves legacy numeric ids exactly');
  assert(tt._calls.filter(c => c.path === '/portfolios' && c.method === 'GET').length >= 1, 'JSON import re-reads GET /portfolios after');
  assert(rep.ok === true && rep.imported === 2 && rep.failed === 0, 'report { ok, imported } correct');
  assert(J(ctx.journalManager.getAll()) === tradesBefore, 'JSON import does NOT mutate journal trades');
  assert(J(ctx.positionManager.getAll()) === posBefore, 'JSON import does NOT mutate positions');
  assert(!tt._calls.some(c => /journal|positions/.test(c.path)), 'JSON import never touches journal/positions endpoints');
  assert(ctx._storage._writes().every(w => w[0] !== 'clear' && !(w[0] === 'remove')), 'JSON import never clears/removes localStorage');
  assert(ctx._pm.getSource() === 'backend', 'JSON import flips source to backend');
  console.log('✓ apexImportPortfoliosJson: JSON import, id preservation, no trade/position mutation');
})();

// ── apexImportPortfoliosJson: accepts array; validates non-array / bad JSON ───
(async function() {
  const tt = makeTtCall((p, o) => {
    o = o || {};
    if (p === '/portfolios' && (o.method || 'GET') === 'POST') {
      const b = typeof o.body === 'string' ? JSON.parse(o.body) : o.body; return { ok: true, id: b.id, portfolio: b };
    }
    if (p === '/portfolios') return { ok: true, portfolios: [{ id: 5, name: 'X' }], count: 1 };
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt, portfolios: [] });
  const rep = await ctx.apexImportPortfoliosJson([{ id: 5, name: 'X', type: 'options' }]);
  assert(rep.imported === 1, 'accepts a plain array argument');
  const bad = await ctx.apexImportPortfoliosJson('{"not":"array"}');
  assert(bad.ok === false && bad.imported === 0 && bad.failed === 0, 'rejects non-array JSON (object)');
  const badStr = await ctx.apexImportPortfoliosJson('not valid json{');
  assert(badStr.ok === false, 'rejects invalid JSON string');
  console.log('✓ apexImportPortfoliosJson: array input + non-array/bad-JSON validation');
})();

// ── 8. create helper calls POST /portfolios ──────────────────────────────────
(async function() {
  const tt = makeTtCall((p, o) => {
    const body = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
    return { ok: true, id: 'srv-id', portfolio: Object.assign({ id: 'srv-id' }, body) };
  });
  const ctx = makeCtx({ ttCall: tt });
  const res = await ctx.backendCreatePortfolio({ name: 'New', type: 'options' });
  const post = tt._calls.find(c => c.method === 'POST');
  assert(post && post.path === '/portfolios', '8: create -> POST /portfolios');
  assert(res.ok === true && res.portfolio.id === 'srv-id', '8: returns backend-generated id');
  console.log('✓ 8 create -> POST /portfolios with backend id');
})();

// ── 9. update calls PUT /portfolios/:id and never sends id/createdAt ──────────
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
    { id: 't1', portfolioId: '1717171717', ticker: 'AAA', status: 'OPEN' },   // string pid vs numeric id
    { id: 't2', portfolioId: 1717171717, ticker: 'BBB', status: 'CLOSED' },   // numeric pid
    { id: 't3', portfolioId: '999', ticker: 'CCC', status: 'OPEN' },          // unassigned
  ];
  const ctx = makeCtx({ portfolios, trades });
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 2, '11: tolerant matching assigns both numeric+string pid trades');
  assert(rec.unassignedTradeCount === 1, '11: dangling pid stays unassigned');
  console.log('✓ 11 reconciliation tolerant string-based matching');
})();

// ── 12. apexDebugPortfolioState includes portfolioSource + counts ────────────
(async function() {
  const pm = makePortfolioManager([{ id: 1, name: 'Saxo', type: 'options' }]);
  pm.setFromBackend([{ id: 'a', name: 'Live', type: 'options' }, { id: 'b', name: 'Testing', type: 'paper' }]);
  const ctx = makeCtx({
    portfolioManager: pm,
    seed: { 'apex_portfolios': J([{ id: 1, name: 'Saxo', type: 'options' }]) },
    BACKEND: '', // no probe
  });
  const res = await ctx.apexDebugPortfolioState({ probeBackend: false });
  assert('portfolioSource' in res, '12: result has portfolioSource');
  assert(res.portfolioSource === 'backend', '12: portfolioSource reflects manager state');
  assert('backendPortfolioCount' in res && 'localPortfolioCount' in res, '12: has backend/local counts');
  assert('backendPortfolios' in res && 'localPortfoliosMetadata' in res, '12: has backend/local portfolio lists');
  assert(res.localPortfolioCount === 1, '12: localPortfolioCount read from localStorage cache');
  assert(res.localPortfoliosMetadata.every(m => !('positions' in m) && !('trades' in m)), '12: metadata is lean (no payloads)');
  console.log('✓ 12 apexDebugPortfolioState exposes source + backend/local counts');
})();

// ── 13. static guard: feature code is non-destructive, no auto-import ─────────
(function() {
  const region = [
    'backendListPortfolios', 'backendCreatePortfolio', 'backendUpdatePortfolio',
    'backendDeletePortfolio', '_portfolioBackendUsable', '_syncPortfoliosFromBackend',
    'importLocalPortfoliosToBackend', 'apexImportPortfoliosJson', 'portfolioApplyUpdate',
  ].map(n => extractFn(HTML, n)).join('\n');

  assert(region.indexOf('localStorage.clear') === -1, '13: feature never calls localStorage.clear');
  assert(region.indexOf("removeItem('apex_portfolios')") === -1 &&
         region.indexOf('removeItem("apex_portfolios")') === -1, '13: feature never removes apex_portfolios');
  assert(region.indexOf('removeItem') === -1, '13: feature never calls removeItem at all');
  // No code path mutates a trade's portfolioId (strip comments first)
  const codeOnly = region.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(codeOnly.indexOf('.portfolioId =') === -1 && codeOnly.indexOf('.portfolioId=') === -1,
    '13: feature never assigns trade.portfolioId');

  // The startup probe must NOT auto-import: _syncPortfoliosFromBackend must not
  // call importLocalPortfoliosToBackend or POST.
  const syncCode = extractFn(HTML, '_syncPortfoliosFromBackend')
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert(syncCode.indexOf('importLocalPortfoliosToBackend') === -1, '13: startup sync never auto-imports');
  assert(syncCode.indexOf('backendCreatePortfolio') === -1, '13: startup sync never POSTs portfolios');
  console.log('✓ 13 non-destructive: no clear/removeItem/auto-import/pid-mutation');
})();

// ── 14. static guard: feature touches no Greeks/Vega/Theta/BWD/risk formulas ─
(function() {
  const region = [
    'backendListPortfolios', 'backendCreatePortfolio', 'backendUpdatePortfolio',
    'backendDeletePortfolio', '_portfolioBackendUsable', '_syncPortfoliosFromBackend',
    'importLocalPortfoliosToBackend', 'apexImportPortfoliosJson', 'portfolioApplyUpdate',
  ].map(n => extractFn(HTML, n)).join('\n');
  ['aggregateGreeks', 'computePortfolioRisk', 'portfolioRiskMetrics', 'calcVega',
   'calcTheta', 'betaWeightedDelta', 'computeBWD']
    .forEach(fn => assert(region.indexOf(fn) === -1, '14: feature does not reference ' + fn));
  console.log('✓ 14 feature is formula-free (no Greeks/Vega/Theta/BWD/risk APIs)');
})();

// ── summary ──────────────────────────────────────────────────────────────────
setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') +
    ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 100);
