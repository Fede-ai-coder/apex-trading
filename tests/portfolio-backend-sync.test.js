'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND-ONLY PORTFOLIOS — load / CRUD client validation.
//
// Portfolios live EXCLUSIVELY in the backend (SQLite). There is NO localStorage
// fallback, no legacy recovery and no auto-import. This suite extracts the REAL
// portfolioManager IIFE and the REAL backend helpers from index.html and drives
// them in a vm sandbox with a mock ttCall + a recording localStorage, proving:
//
//   A.  _portfolioBackendUsable() gating (configured key + base URL, not local).
//   B.  Load: backend has portfolios -> source 'backend', cache = backend list,
//       backend ids preserved verbatim (UUID / numeric-string, no coercion).
//   C.  Load: backend EMPTY -> source 'backend', empty cache, "load count=0",
//       and NO localStorage is read even when a stale apex_portfolios exists.
//   D.  Load: backend error/throw -> source 'error', cache cleared, NO fallback,
//       console.error '[PORTFOLIOS][BACKEND] error reason=<reason>'.
//   E.  Load: backend not configured / missing key / local dev -> source 'error'
//       with the matching reason, and NO backend call.
//   F.  Load is read-only: never writes localStorage, never POST/PUT/DELETE.
//   G.  Create (real createPortfolio): POST /portfolios, uses the BACKEND id,
//       sends no client id, writes no localStorage.
//   H.  Create blocked when backend unusable: UI error, no POST, error log.
//   I.  Update (real portfolioApplyUpdate): PUT /portfolios/:id, strips id/createdAt,
//       updates the in-memory cache, writes no localStorage.
//   J.  Update blocked when unusable: no PUT, error log, no localStorage.
//   K.  Delete (real deletePortfolio): DELETE /portfolios/:id, removes from the
//       in-memory cache only (no cascade), writes no localStorage.
//   L.  Delete blocked when unusable: no DELETE, error log.
//   M.  portfolioManager is backend-only & string-id safe (setError clears cache;
//       getById tolerant; no numeric coercion of ids).
//   N.  Static guards: the manager + feature region never touch localStorage and
//       carry none of the removed fallback flows/strings.
//   O.  Reconciliation tolerant string matching (unchanged behaviour).
//   P.  apexDebugPortfolioState still reports portfolioSource.
//
// Run: node tests/portfolio-backend-sync.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a named (async) function declaration with balanced braces, ignoring
// braces inside strings/comments.
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

// Extract the `var portfolioManager = (function(){ ... })();` IIFE so the REAL
// manager (not a re-implementation) is what the behaviour tests exercise.
function extractIIFE(src, decl) {
  const start = src.indexOf(decl);
  if (start < 0) throw new Error('IIFE not found: ' + decl);
  let i = src.indexOf('{', start);
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
    else if (c === '}') {
      depth--;
      if (depth === 0) { const end = src.indexOf(';', j); return src.slice(start, end + 1); }
    }
  }
  throw new Error('IIFE end not found: ' + decl);
}

const stripComments = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

let passed = 0, failed = 0;
function assert(cond, msg) { if (cond) { passed++; } else { failed++; console.error('  ✗ ' + msg); } }
const J = (a) => JSON.stringify(a);

// ── fake DOM (just enough for createPortfolio / deletePortfolio) ─────────────
function makeEl() {
  const classes = new Set();
  return {
    value: '', textContent: '',
    style: { display: '' },
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    focus() {},
  };
}
function makeDocument() {
  const els = {};
  return {
    lastModified: 'Fri, 12 Jun 2026 00:00:00 GMT',
    getElementById(id) { return els[id] || (els[id] = makeEl()); },
    _els: els,
  };
}

// ── recording localStorage (proves the feature never reads/writes it) ────────
function makeStorage(seed) {
  const map = new Map(Object.entries(seed || {}));
  const reads = [], writes = [];
  return {
    getItem(k) { reads.push(k); return map.has(k) ? map.get(k) : null; },
    setItem(k, v) { writes.push(['set', k]); map.set(k, String(v)); },
    removeItem(k) { writes.push(['remove', k]); map.delete(k); },
    clear() { writes.push(['clear']); map.clear(); },
    key(i) { return Array.from(map.keys())[i]; },
    get length() { return map.size; },
    _reads() { return reads; },
    _writes() { return writes; },
    _dump() { return Object.fromEntries(map); },
  };
}

// ── recording ttCall: router(path, opts) -> response (or throw) ──────────────
function makeTtCall(router) {
  const calls = [];
  const fn = async function(path, opts) {
    opts = opts || {};
    const body = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
    calls.push({ path, method: opts.method || 'GET', body });
    return router(path, opts);
  };
  fn._calls = calls;
  return fn;
}

function makeCtx(opts) {
  opts = opts || {};
  const storage = makeStorage(opts.seed);
  const ttCall = opts.ttCall || makeTtCall(() => ({ ok: true, portfolios: [], count: 0 }));
  const logs = [], warns = [], errors = [], toasts = [];
  let renderCount = 0;
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: opts.protocol || 'https:' } },
    document: makeDocument(),
    localStorage: storage,
    console: {
      log: (...a) => logs.push(a.join(' ')),
      warn: (...a) => warns.push(a.join(' ')),
      error: (...a) => errors.push(a.join(' ')),
      table() {},
    },
    JSON, Array, Date, String, Object, Number, Boolean, Promise, Set, RegExp, encodeURIComponent, isFinite,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123' },
    APEX_BUILD_TAG: 'test-build',
    _activeView: 'portfolio',
    _portfolioBackendSyncInFlight: false,
    _activePanelPortfolioId: opts.activePanelPortfolioId != null ? opts.activePanelPortfolioId : null,
    ttCall,
    journalManager: { getAll: () => (opts.trades || []).slice() },
    positionManager: { getAll: () => (opts.trades || []).filter(t => t.status === 'OPEN' || t.status === 'PARTIAL') },
    showToast: (m, k) => toasts.push([k, m]),
    renderPortfolioView: () => { renderCount++; },
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
    extractIIFE(HTML, 'var portfolioManager = (function() {'),   // the REAL manager
    extractFn(HTML, 'backendListPortfolios'),
    extractFn(HTML, 'backendGetPortfolio'),
    extractFn(HTML, 'backendCreatePortfolio'),
    extractFn(HTML, 'backendUpdatePortfolio'),
    extractFn(HTML, 'backendDeletePortfolio'),
    extractFn(HTML, '_portfolioBackendUsable'),
    extractFn(HTML, '_syncPortfoliosFromBackend'),
    extractFn(HTML, 'portfolioApplyUpdate'),
    extractFn(HTML, 'createPortfolio'),
    extractFn(HTML, 'deletePortfolio'),
  ].join('\n'), ctx);
  ctx._storage = storage;
  ctx._ttCall = ttCall;
  ctx._logs = logs;
  ctx._warns = warns;
  ctx._errors = errors;
  ctx._toasts = toasts;
  ctx._renderCount = () => renderCount;
  return ctx;
}

// ── A. _portfolioBackendUsable gating ────────────────────────────────────────
(function() {
  assert(makeCtx({})._portfolioBackendUsable() === true, 'A: configured (key + base, non-local) -> usable');
  assert(makeCtx({ host: 'localhost' })._portfolioBackendUsable() === false, 'A: localhost -> not usable');
  assert(makeCtx({ host: '', protocol: 'file:' })._portfolioBackendUsable() === false, 'A: file:// -> not usable');
  assert(makeCtx({ BACKEND: '' })._portfolioBackendUsable() === false, 'A: no BACKEND -> not usable');
  assert(makeCtx({ backendKey: '' })._portfolioBackendUsable() === false, 'A: no API key -> not usable');
  // deploy previews still allowed (target the live backend)
  assert(makeCtx({ host: 'deploy-preview-9--apex.netlify.app' })._portfolioBackendUsable() === true,
    'A: deploy-preview + key -> usable');
  console.log('✓ A _portfolioBackendUsable gating');
})();

// ── B. load: backend has portfolios -> source backend, ids preserved verbatim ─
(async function() {
  const tt = makeTtCall((p) => {
    if (p === '/portfolios') return { ok: true, count: 3, portfolios: [
      { id: 'a1b2-uuid', name: 'Live',    type: 'options' },   // UUID
      { id: '1717171717', name: 'Testing', type: 'paper'   },  // numeric-looking STRING
      { id: 42,           name: 'Mixed',   type: 'mixed'   },   // numeric
    ] };
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(tt._calls.some(c => c.path === '/portfolios' && c.method === 'GET'), 'B: GET /portfolios called');
  assert(src === 'backend', 'B: source becomes "backend"');
  assert(ctx.portfolioManager.getAll().length === 3, 'B: cache = backend list (3)');
  const byUuid = ctx.portfolioManager.getById('a1b2-uuid');
  assert(byUuid && typeof byUuid.id === 'string' && byUuid.id === 'a1b2-uuid', 'B: UUID id preserved as string');
  const byNumStr = ctx.portfolioManager.getById('1717171717');
  assert(byNumStr && typeof byNumStr.id === 'string', 'B: numeric-looking id stays a STRING (no +id coercion)');
  assert(ctx._logs.some(l => l === '[PORTFOLIOS][BACKEND] load count=3'), 'B: logs "load count=3"');
  console.log('✓ B load -> backend authoritative, ids preserved verbatim');
})();

// ── C. load: backend EMPTY -> empty state, NEVER localStorage ────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true, portfolios: [], count: 0 }));
  // stale local data that the OLD code would have surfaced as a fallback:
  const ctx = makeCtx({ ttCall: tt, seed: { 'apex_portfolios': J([{ id: 1, name: 'LEGACY-LOCAL' }]) } });
  const src = await ctx._syncPortfoliosFromBackend();
  assert(src === 'backend', 'C: empty backend still resolves to source "backend"');
  assert(ctx.portfolioManager.getAll().length === 0, 'C: cache is EMPTY (no legacy localStorage recovery)');
  assert(ctx._logs.some(l => l === '[PORTFOLIOS][BACKEND] load count=0'), 'C: logs "load count=0"');
  assert(ctx._storage._reads().every(k => k !== 'apex_portfolios'), 'C: apex_portfolios never READ during load');
  assert(ctx._storage._writes().length === 0, 'C: no localStorage writes during load');
  assert(!tt._calls.some(c => c.method === 'POST'), 'C: empty backend triggers NO auto-import POST');
  console.log('✓ C empty backend -> empty state, no localStorage, no auto-import');
})();

// ── D. load: backend error / throw -> source error, cache cleared, no fallback ─
(async function() {
  // 4a) ttCall throws (network / 401)
  const ttThrow = makeTtCall(() => { throw new Error('401 invalid key'); });
  const ctx1 = makeCtx({ ttCall: ttThrow, seed: { 'apex_portfolios': J([{ id: 1, name: 'LEGACY' }]) } });
  const src1 = await ctx1._syncPortfoliosFromBackend();
  assert(src1 === 'error', 'D: ttCall throw -> source "error"');
  assert(ctx1.portfolioManager.getAll().length === 0, 'D: cache cleared on error (no local fallback)');
  assert(ctx1._errors.some(e => e.indexOf('[PORTFOLIOS][BACKEND] error reason=') === 0), 'D: console.error error reason logged');
  assert(ctx1._storage._reads().every(k => k !== 'apex_portfolios'), 'D: apex_portfolios never read on error');

  // 4b) backend responds ok:false with a code
  const ttBad = makeTtCall(() => ({ ok: false, code: 'server_error', error: 'boom' }));
  const ctx2 = makeCtx({ ttCall: ttBad });
  const src2 = await ctx2._syncPortfoliosFromBackend();
  assert(src2 === 'error', 'D: ok:false -> source "error"');
  assert(ctx2.portfolioManager.getErrorReason() === 'server_error', 'D: error reason taken from response code');
  assert(ctx2._errors.some(e => e === '[PORTFOLIOS][BACKEND] error reason=server_error'), 'D: reason logged verbatim');
  console.log('✓ D backend error -> error state, cache cleared, no fallback');
})();

// ── E. load: not configured / missing key / local dev -> error, NO backend call
(async function() {
  const cases = [
    { opts: { BACKEND: '' },              reason: 'backend_not_configured' },
    { opts: { backendKey: '' },           reason: 'missing_api_key' },
    { opts: { host: 'localhost' },        reason: 'local_dev' },
    { opts: { host: '', protocol: 'file:' }, reason: 'local_dev' },
  ];
  for (const cse of cases) {
    const tt = makeTtCall(() => ({ ok: true, portfolios: [{ id: 9 }], count: 1 }));
    const ctx = makeCtx(Object.assign({ ttCall: tt }, cse.opts));
    const src = await ctx._syncPortfoliosFromBackend();
    assert(src === 'error', 'E: ' + cse.reason + ' -> source "error"');
    assert(ctx.portfolioManager.getErrorReason() === cse.reason, 'E: reason=' + cse.reason);
    assert(ctx._errors.some(e => e === '[PORTFOLIOS][BACKEND] error reason=' + cse.reason), 'E: logs error reason=' + cse.reason);
    assert(tt._calls.length === 0, 'E: ' + cse.reason + ' never calls backend');
    assert(ctx.portfolioManager.getAll().length === 0, 'E: ' + cse.reason + ' shows no portfolios');
  }
  console.log('✓ E not configured / missing key / local dev -> error, no backend call');
})();

// ── F. load is read-only (no localStorage writes, no write verbs) ────────────
(async function() {
  const tt = makeTtCall((p) => p === '/portfolios'
    ? { ok: true, portfolios: [{ id: 'x', name: 'X' }], count: 1 } : { ok: false });
  const ctx = makeCtx({ ttCall: tt });
  await ctx._syncPortfoliosFromBackend();
  assert(ctx._storage._writes().length === 0, 'F: load writes no localStorage');
  assert(!tt._calls.some(c => c.method === 'POST' || c.method === 'PUT' || c.method === 'DELETE'),
    'F: load issues no POST/PUT/DELETE');
  console.log('✓ F load is read-only');
})();

// ── G. create (REAL createPortfolio): POST, backend id, no client id, no storage ─
(async function() {
  const tt = makeTtCall((p, o) => {
    if (p === '/portfolios' && (o.method || 'GET') === 'POST') {
      const b = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
      return { ok: true, id: 'srv-uuid-9', portfolio: Object.assign({ id: 'srv-uuid-9' }, b) };
    }
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt });
  ctx.document.getElementById('pfName').value = 'New Folio';
  ctx.document.getElementById('pfType').value = 'options';
  await ctx.createPortfolio();
  const post = tt._calls.find(c => c.method === 'POST');
  assert(post && post.path === '/portfolios', 'G: create -> POST /portfolios');
  assert(post && !('id' in (post.body || {})), 'G: create POST body carries NO client id');
  assert(ctx.portfolioManager.getById('srv-uuid-9'), 'G: cache uses the BACKEND id');
  assert(ctx.portfolioManager.getAll().length === 1 && ctx.portfolioManager.getAll()[0].id === 'srv-uuid-9',
    'G: backend id stored verbatim');
  assert(ctx._logs.some(l => l === '[PORTFOLIOS][BACKEND] created id=srv-uuid-9'), 'G: logs created id=<backend id>');
  assert(ctx._storage._writes().length === 0, 'G: create writes no localStorage');
  console.log('✓ G create -> POST, backend id used, no client id, no localStorage');
})();

// ── H. create blocked when backend unusable ──────────────────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true }));
  const ctx = makeCtx({ ttCall: tt, backendKey: '' });   // no key -> not usable
  ctx.document.getElementById('pfName').value = 'Blocked';
  ctx.document.getElementById('pfType').value = 'options';
  await ctx.createPortfolio();
  assert(!tt._calls.some(c => c.method === 'POST'), 'H: no POST when backend unusable');
  assert(ctx.document.getElementById('pfFormError').style.display === 'block', 'H: UI error shown');
  assert(/backend/i.test(ctx.document.getElementById('pfFormError').textContent), 'H: error mentions backend');
  assert(ctx._errors.some(e => e.indexOf('[PORTFOLIOS][BACKEND] error reason=') === 0), 'H: error reason logged');
  assert(ctx.portfolioManager.getAll().length === 0, 'H: nothing added locally');
  console.log('✓ H create blocked when backend unusable (no local create)');
})();

// ── I. update (REAL portfolioApplyUpdate): PUT, strips id/createdAt, no storage ─
(async function() {
  const tt = makeTtCall((p, o) => {
    if ((o.method || 'GET') === 'PUT') {
      const b = typeof o.body === 'string' ? JSON.parse(o.body) : o.body;
      return { ok: true, id: 'p1', portfolio: Object.assign({ id: 'p1', name: 'Old' }, b) };
    }
    return { ok: false };
  });
  const ctx = makeCtx({ ttCall: tt });
  ctx.portfolioManager.setFromBackend([{ id: 'p1', name: 'Old', createdAt: 'x' }]);
  const res = await ctx.portfolioApplyUpdate('p1', { name: 'Renamed', id: 'HACK', createdAt: 'HACK' });
  const put = tt._calls.find(c => c.method === 'PUT');
  assert(put && put.path === '/portfolios/p1', 'I: update -> PUT /portfolios/:id');
  assert(put.body.name === 'Renamed', 'I: sends changed field');
  assert(!('id' in put.body) && !('createdAt' in put.body), 'I: never sends id/createdAt');
  assert(res && res.ok === true, 'I: returns backend response');
  assert(ctx.portfolioManager.getById('p1').name === 'Renamed', 'I: cache updated from backend portfolio');
  assert(ctx._logs.some(l => l === '[PORTFOLIOS][BACKEND] updated id=p1'), 'I: logs updated id');
  assert(ctx._storage._writes().length === 0, 'I: update writes no localStorage');
  console.log('✓ I update -> PUT, id/createdAt stripped, no localStorage');
})();

// ── J. update blocked when backend unusable ──────────────────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true }));
  const ctx = makeCtx({ ttCall: tt, BACKEND: '' });
  const res = await ctx.portfolioApplyUpdate('p1', { name: 'x' });
  assert(res && res.ok === false, 'J: returns ok:false when unusable');
  assert(!tt._calls.some(c => c.method === 'PUT'), 'J: no PUT when unusable');
  assert(ctx._errors.some(e => e.indexOf('[PORTFOLIOS][BACKEND] error reason=') === 0), 'J: error reason logged');
  assert(ctx._storage._writes().length === 0, 'J: no localStorage on blocked update');
  console.log('✓ J update blocked when backend unusable');
})();

// ── K. delete (REAL deletePortfolio): DELETE, in-memory removal, no storage ──
(async function() {
  const tt = makeTtCall((p, o) => (o.method === 'DELETE') ? { ok: true } : { ok: false });
  const ctx = makeCtx({ ttCall: tt });
  ctx.portfolioManager.setFromBackend([{ id: 'p9', name: 'X' }, { id: 'p8', name: 'Y' }]);
  await ctx.deletePortfolio('p9');
  const del = tt._calls.find(c => c.method === 'DELETE');
  assert(del && del.path === '/portfolios/p9', 'K: delete -> DELETE /portfolios/:id');
  assert(!ctx.portfolioManager.getById('p9'), 'K: removed from in-memory cache');
  assert(ctx.portfolioManager.getById('p8'), 'K: other portfolios untouched (no cascade)');
  assert(ctx._logs.some(l => l === '[PORTFOLIOS][BACKEND] deleted id=p9'), 'K: logs deleted id');
  assert(ctx._storage._writes().length === 0, 'K: delete writes no localStorage');
  console.log('✓ K delete -> DELETE, in-memory removal, no localStorage');
})();

// ── L. delete blocked when backend unusable ──────────────────────────────────
(async function() {
  const tt = makeTtCall(() => ({ ok: true }));
  const ctx = makeCtx({ ttCall: tt, backendKey: '' });
  ctx.portfolioManager.setFromBackend([{ id: 'p9', name: 'X' }]);
  await ctx.deletePortfolio('p9');
  assert(!tt._calls.some(c => c.method === 'DELETE'), 'L: no DELETE when unusable');
  assert(ctx.portfolioManager.getById('p9'), 'L: portfolio NOT removed when backend unusable');
  assert(ctx._errors.some(e => e.indexOf('[PORTFOLIOS][BACKEND] error reason=') === 0), 'L: error reason logged');
  console.log('✓ L delete blocked when backend unusable');
})();

// ── M. portfolioManager is backend-only & string-id safe ─────────────────────
(function() {
  const ctx = makeCtx({});
  const pm = ctx.portfolioManager;
  assert(pm.getSource() === 'init', 'M: starts in "init" (no localStorage seed)');
  assert(pm.getAll().length === 0, 'M: starts empty (never reads localStorage)');
  pm.setFromBackend([{ id: 'uuid-x', name: 'U' }, { id: '007', name: 'Z' }]);
  assert(pm.getSource() === 'backend', 'M: setFromBackend -> source backend');
  assert(typeof pm.getById('uuid-x').id === 'string' && typeof pm.getById('007').id === 'string',
    'M: ids stay strings (no numeric coercion)');
  assert(pm.getById(7) === null, 'M: getById does NOT coerce "007" to match numeric 7');
  pm.upsertLocal({ id: 'uuid-x', name: 'U2' });
  assert(pm.getById('uuid-x').name === 'U2' && pm.getAll().length === 2, 'M: upsertLocal merges in memory');
  pm.removeLocalOnly('007');
  assert(!pm.getById('007') && pm.getAll().length === 1, 'M: removeLocalOnly removes in memory');
  pm.setError('boom');
  assert(pm.getSource() === 'error' && pm.getErrorReason() === 'boom' && pm.getAll().length === 0,
    'M: setError clears cache + records reason');
  assert(ctx._storage._writes().length === 0 && ctx._storage._reads().length === 0,
    'M: manager performs ZERO localStorage I/O');
  console.log('✓ M portfolioManager backend-only & string-id safe');
})();

// ── N. static guards ─────────────────────────────────────────────────────────
(function() {
  const managerSrc = stripComments(extractIIFE(HTML, 'var portfolioManager = (function() {'));
  ['localStorage', 'apexNonDestructiveLoadArray', 'apexCreateBackup', 'Date.now', 'setItem', 'removeItem']
    .forEach(tok => assert(managerSrc.indexOf(tok) === -1, 'N: portfolioManager code has no ' + tok));

  const region = stripComments([
    'backendListPortfolios', 'backendCreatePortfolio', 'backendUpdatePortfolio',
    'backendDeletePortfolio', '_portfolioBackendUsable', '_syncPortfoliosFromBackend',
    'portfolioApplyUpdate', 'createPortfolio', 'deletePortfolio',
  ].map(n => extractFn(HTML, n)).join('\n'));
  ['fallback_local', 'local_fallback', 'backend_empty_local_available', 'backend_unavailable',
   'backend_empty_legacy_local_available']
    .forEach(tok => assert(region.indexOf(tok) === -1, 'N: feature region has no "' + tok + '"'));
  assert(region.indexOf('localStorage') === -1, 'N: feature region never touches localStorage');

  // removed localStorage->portfolio bridges are gone entirely
  assert(HTML.indexOf('function importLocalPortfoliosToBackend') === -1, 'N: importLocalPortfoliosToBackend removed');
  assert(HTML.indexOf('function apexImportPortfoliosJson') === -1, 'N: apexImportPortfoliosJson removed');

  // compact backend logs present
  assert(HTML.indexOf('[PORTFOLIOS][BACKEND] load count=') !== -1, 'N: "load count=" log present');
  assert(HTML.indexOf('[PORTFOLIOS][BACKEND] error reason=') !== -1, 'N: "error reason=" log present');

  // no numeric coercion of the portfolio id at the positions-panel boundary
  assert(HTML.indexOf('showPositionsPanel(+this.dataset.pid)') === -1, 'N: no +this.dataset.pid coercion');
  assert(HTML.indexOf('showPositionsPanel(this.dataset.pid)') !== -1, 'N: passes raw string pid');
  console.log('✓ N static guards: backend-only, no localStorage, no removed fallbacks/flows');
})();

// ── O. reconciliation tolerant string matching (unchanged behaviour) ─────────
(function() {
  const ctx = makeCtx({ trades: [
    { id: 't1', portfolioId: '1717171717', ticker: 'AAA', status: 'OPEN' },
    { id: 't2', portfolioId: 1717171717, ticker: 'BBB', status: 'CLOSED' },
    { id: 't3', portfolioId: '999', ticker: 'CCC', status: 'OPEN' },
  ] });
  ctx.portfolioManager.setFromBackend([{ id: 1717171717, name: 'Live', type: 'options' }]);
  const rec = ctx.getPortfolioJournalReconciliation();
  assert(rec.assignedTradeCount === 2, 'O: tolerant matching assigns numeric+string pid trades');
  assert(rec.unassignedTradeCount === 1, 'O: dangling pid stays unassigned');
  console.log('✓ O reconciliation tolerant string matching');
})();

// ── P. apexDebugPortfolioState reports source ────────────────────────────────
(async function() {
  const ctx = makeCtx({ BACKEND: '' });   // no probe
  ctx.portfolioManager.setFromBackend([{ id: 'a', name: 'Live' }, { id: 'b', name: 'Test' }]);
  const res = await ctx.apexDebugPortfolioState({ probeBackend: false });
  assert('portfolioSource' in res && res.portfolioSource === 'backend', 'P: reports portfolioSource');
  assert(res.portfoliosCount === 2, 'P: reports cache count');
  console.log('✓ P apexDebugPortfolioState reports source');
})();

// ── summary ──────────────────────────────────────────────────────────────────
setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 150);
