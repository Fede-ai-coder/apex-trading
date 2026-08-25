'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL BACKEND SAVE — backend-aware confirmation.
//
// Root cause fixed: submitTrade() showed a green "Trade logged" toast the moment
// journalManager.add() persisted LOCALLY, while jSaveRemote() pushed to the backend
// fire-and-forget and swallowed 401/500/timeout in a console.warn. The backend could
// stay empty (tradesCount 0) while the UI claimed success.
//
// This suite verifies the new contract:
//   1. jSaveRemote returns a STRUCTURED outcome and never swallows errors silently.
//   2. backend 200+id            -> { ok:true,  source:'backend' }  + success toast
//   3. backend 401/500/timeout   -> { ok:false, source:'local' }    + local-only WARN
//   4. backend 200 without id    -> treated as failure (no false success)
//   5. backend not configured    -> local-only, neutral (not a scary warning)
//   6. jUpdateRemote (assignment/edit) follows the same contract (PUT).
//   7. _journalOutcomeToast maps outcome -> ok / warn / neutral correctly.
//   8. tagged logging: [JOURNAL SAVE][BACKEND OK|FAILED|LOCAL ONLY].
//   9. static guards: submitTrade awaits the backend write; manual save is NOT
//      preview-gated; only the bulk migration keeps the broad preview predicate.
//
// Run: node tests/journal-backend-save-confirm.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();
const WRITE_THROUGH = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'services', 'journal-backend-write-through.js'),
  'utf8'
);

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

// ttCall router: throwErr forces a rejection (mirrors ttCall throwing Error(message)
// with an embedded "HTTP <status>"); otherwise returns the given response.
function makeCtx(opts) {
  opts = opts || {};
  const logs = [];
  const toasts = [];
  const ctx = {
    window: { location: { hostname: opts.host || 'app.example.com', protocol: 'https:' } },
    console: { log: (...a) => logs.push(a.join(' ')), warn: (...a) => logs.push(a.join(' ')), error: () => {} },
    JSON, Array, Date, String, Object, Promise, Math, parseInt,
    BACKEND: opts.BACKEND !== undefined ? opts.BACKEND : 'https://backend.example',
    S: { backendKey: opts.backendKey !== undefined ? opts.backendKey : 'k-123', ttSessionId: 'sess-1' },
    ffBackendOffloadV1: () => false,
    jEnrichedDryRun: async () => {},
    showToast: (msg, kind) => toasts.push({ msg, kind }),
    _journalLastBackendSaveStatus: null,
    _recordBackendApiAuthResult: () => {},
    ttCall: opts.ttCall || (async () => ({ id: 'srv-1' })),
  };
  vm.createContext(ctx);
  vm.runInContext([
    extractFn(HTML, '_recordJournalBackendSave'),
    extractFn(HTML, '_httpStatusFromError'),
    extractFn(HTML, 'jSaveRemote'),
    extractFn(HTML, 'jUpdateRemote'),
    extractFn(HTML, '_journalOutcomeToast'),
    extractFn(HTML, '_awaitJournalBackendWrite'),
  ].join('\n'), ctx);
  ctx._logs = logs;
  ctx._toasts = toasts;
  return ctx;
}

// ── 1/2. backend 200+id -> confirmed backend save ────────────────────────────
(async function() {
  const ctx = makeCtx({ ttCall: async (p, o) => { assert(p === '/journal/trades' && o.method === 'POST', '2: POSTs /journal/trades'); return { id: 'srv-9' }; } });
  const r = await ctx.jSaveRemote({ id: 't1', ticker: 'AAA' });
  assert(r && typeof r === 'object' && 'ok' in r && 'source' in r, '1: jSaveRemote returns a structured {ok,source} object (no silent swallow)');
  assert(r.ok === true && r.source === 'backend' && r.configured === true, '2: backend 200+id -> ok:true source:backend');
  assert(ctx._journalLastBackendSaveStatus && ctx._journalLastBackendSaveStatus.ok === true && ctx._journalLastBackendSaveStatus.op === 'save', '2: lastBackendSaveStatus records the confirmed save');
  assert(ctx._logs.some(l => l.indexOf('[JOURNAL SAVE][BACKEND OK]') !== -1), '8: logs [JOURNAL SAVE][BACKEND OK]');
  console.log('✓ 1/2 backend 200+id -> confirmed backend save, tagged OK');
})();

// ── 3. backend 401 -> local-only failure, NOT success ────────────────────────
(async function() {
  const ctx = makeCtx({ ttCall: async () => { throw new Error('Unauthorized (HTTP 401): bad api-key'); } });
  const r = await ctx.jSaveRemote({ id: 't2', ticker: 'BBB' });
  assert(r.ok === false && r.source === 'local' && r.configured === true, '3: 401 -> ok:false source:local (never a false success)');
  assert(r.status === 401, '3: HTTP 401 status surfaced on the outcome');
  assert(ctx._journalLastBackendSaveStatus.ok === false && ctx._journalLastBackendSaveStatus.status === 401, '3: lastBackendSaveStatus records the 401 failure');
  assert(ctx._logs.some(l => l.indexOf('[JOURNAL SAVE][BACKEND FAILED]') !== -1), '8: logs [JOURNAL SAVE][BACKEND FAILED]');
  console.log('✓ 3 backend 401 -> local-only failure surfaced (no false green)');
})();

// ── 3b. backend 500 + timeout -> local-only failure ──────────────────────────
(async function() {
  const c500 = makeCtx({ ttCall: async () => { throw new Error('HTTP 500'); } });
  const r500 = await c500.jSaveRemote({ id: 't3' });
  assert(r500.ok === false && r500.status === 500, '3b: 500 -> ok:false status:500');

  const cTimeout = makeCtx({ ttCall: async () => { throw new Error('The operation was aborted due to timeout'); } });
  const rT = await cTimeout.jSaveRemote({ id: 't4' });
  assert(rT.ok === false && rT.source === 'local' && rT.status === null, '3b: timeout -> ok:false source:local status:null');
  console.log('✓ 3b backend 500 + timeout -> local-only failure');
})();

// ── 4. backend 200 WITHOUT id -> failure (cannot confirm persistence) ────────
(async function() {
  const ctx = makeCtx({ ttCall: async () => ({ ok: true }) });   // 200 but no id
  const r = await ctx.jSaveRemote({ id: 't5' });
  assert(r.ok === false && r.source === 'local' && r.status === 200, '4: 200 without id -> treated as failure, not success');
  console.log('✓ 4 backend 200 without id -> not a false success');
})();

// ── 5. backend not configured -> pure local, neutral (not scary) ─────────────
(async function() {
  const ctx = makeCtx({ BACKEND: '', backendKey: '' });
  let called = false;
  ctx.ttCall = async () => { called = true; return { id: 'x' }; };
  const r = await ctx.jSaveRemote({ id: 't6' });
  assert(r.ok === false && r.source === 'local' && r.configured === false, '5: no backend -> configured:false local');
  assert(called === false, '5: no backend -> ttCall not attempted');
  assert(ctx._logs.some(l => l.indexOf('[JOURNAL SAVE][LOCAL ONLY]') !== -1), '8: logs [JOURNAL SAVE][LOCAL ONLY]');
  console.log('✓ 5 backend not configured -> pure local, tagged LOCAL ONLY');
})();

// ── 6. jUpdateRemote (assignment / edit) follows the same contract ───────────
(async function() {
  const okCtx = makeCtx({ ttCall: async (p, o) => { assert(o.method === 'PUT' && p === '/journal/trades/t7', '6: PUT /journal/trades/:id'); return { id: 't7' }; } });
  const ok = await okCtx.jUpdateRemote('t7', { portfolioId: 5, ticker: 'CCC' });
  assert(ok.ok === true && ok.source === 'backend', '6: PUT ok -> ok:true source:backend (assignment persisted)');

  const failCtx = makeCtx({ ttCall: async () => { throw new Error('HTTP 500'); } });
  const bad = await failCtx.jUpdateRemote('t7', { portfolioId: 5 });
  assert(bad.ok === false && bad.source === 'local' && bad.status === 500, '6: PUT 500 -> ok:false source:local (assignment NOT silently applied)');
  assert(failCtx._journalLastBackendSaveStatus.op === 'update', '6: lastBackendSaveStatus records op:update');
  console.log('✓ 6 jUpdateRemote assignment/edit follows backend-confirm contract');
})();

// ── 7. _journalOutcomeToast maps outcomes to the right toast kind ────────────
(async function() {
  const ctx = makeCtx({});
  ctx._journalOutcomeToast({ ok: true, configured: true }, 'OK', 'FAIL', 'LOCAL');
  ctx._journalOutcomeToast({ ok: false, configured: true, status: 401 }, 'OK', 'FAIL', 'LOCAL');
  ctx._journalOutcomeToast({ ok: false, configured: false }, 'OK', 'FAIL', 'LOCAL');
  assert(ctx._toasts[0].kind === 'ok' && ctx._toasts[0].msg === 'OK', '7: confirmed -> green ok toast');
  assert(ctx._toasts[1].kind === 'warn' && ctx._toasts[1].msg.indexOf('FAIL') === 0 && ctx._toasts[1].msg.indexOf('401') !== -1, '7: configured+failed -> warn toast with status');
  assert(ctx._toasts[2].kind === 'ok' && ctx._toasts[2].msg === 'LOCAL', '7: not configured -> neutral local ok toast');
  console.log('✓ 7 _journalOutcomeToast: ok / warn / neutral mapping');
})();

// ── 8. _awaitJournalBackendWrite tolerates null + rejected promises ──────────
(async function() {
  const ctx = makeCtx({});
  assert((await ctx._awaitJournalBackendWrite(null)) === null, '8: null promise -> null outcome (nothing to await)');
  const pass = await ctx._awaitJournalBackendWrite(Promise.resolve({ ok: true, source: 'backend', configured: true }));
  assert(pass.ok === true, '8: resolved outcome passes through');
  const rej = await ctx._awaitJournalBackendWrite(Promise.reject(new Error('boom')));
  assert(rej.ok === false && rej.configured === true, '8: rejected promise -> local failure outcome (still warns)');
  console.log('✓ 8 _awaitJournalBackendWrite null/resolve/reject handling');
})();

// ── 9. static guards on the wired-up flow ────────────────────────────────────
(function() {
  const submit = extractFn(HTML, 'submitTrade');
  assert(submit.indexOf('_awaitJournalBackendWrite') !== -1 && submit.indexOf('_journalOutcomeToast') !== -1,
    '9: submitTrade awaits the backend write and toasts via _journalOutcomeToast');
  assert(submit.indexOf("showToast('Trade logged:") === -1,
    '9: old unconditional green "Trade logged" toast removed from submitTrade');

  // Manual save path (jm.add sync layer) stashes an awaitable backend promise and is
  // NOT gated by any preview/local predicate.
  assert(WRITE_THROUGH.indexOf('jm._lastBackendWrite = jSaveRemote') !== -1,
    '9: sync layer stashes jm._lastBackendWrite for the manual add path');
  assert(WRITE_THROUGH.indexOf('isApexPreviewOrLocalEnv') === -1 && WRITE_THROUGH.indexOf('isApexLocalDevEnv') === -1,
    '9: manual save/update/delete sync layer is NOT preview/local gated');

  // Only the bulk migration keeps the broad preview predicate.
  const migrate = extractFn(HTML, 'jMigrateApexTradesToBackend');
  assert(migrate.indexOf('isApexPreviewOrLocalEnv()') !== -1,
    '9: bulk migration (auto-upload) keeps the broad preview-or-local guard');
  console.log('✓ 9 static guards: awaited toast, manual save ungated, migration preview-gated');
})();

// ── 10. debug helper exposes journalSource + lastBackendSaveStatus ───────────
(function() {
  const dbg = extractFn(HTML, 'apexDebugPortfolioState');
  assert(dbg.indexOf('journalSource:') !== -1, '10: apexDebugPortfolioState exposes journalSource');
  assert(dbg.indexOf('lastBackendSaveStatus:') !== -1, '10: apexDebugPortfolioState exposes lastBackendSaveStatus');
  assert(dbg.indexOf('localTradesCount:') !== -1, '10: apexDebugPortfolioState exposes localTradesCount');
  console.log('✓ 10 debug helper exposes journalSource / lastBackendSaveStatus / localTradesCount');
})();

setTimeout(function() {
  console.log('\n' + (failed === 0 ? 'ALL PASSED' : failed + ' FAILED') + ' (' + passed + ' assertions)');
  if (failed > 0) process.exit(1);
}, 100);
