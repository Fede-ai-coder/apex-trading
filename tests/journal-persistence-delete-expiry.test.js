'use strict';
// Backend persistence regressions for Journal Delete and Portfolio expiry cleanup.
// No production state / HTTP is used: real functions are extracted from the
// reconstructed shipped source and tested in a local VM with explicit promises.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const source = require('./lib/load-app-source').loadAppJavaScriptSource();

function extract(name) {
  const m = new RegExp('(?:async )?function ' + name + '\\(').exec(source);
  assert(m, name + ' must be present in shipped source');
  const start = m.index;
  let i = source.indexOf('{', start), depth = 0, inString = null, escaped = false, line = false, block = false;
  for (let j = i; j < source.length; j++) {
    const ch = source[j], next = source[j+1];
    if (line) { if (ch === '\n') line = false; continue; }
    if (block) { if (ch === '*' && next === '/') {block = false; j++;} continue; }
    if (inString) {
      if (escaped) {escaped = false; continue;}
      if (ch === '\\') {escaped = true; continue;}
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '/' && next === '/') {line = true; continue;}
    if (ch === '/' && next === '*') {block = true; j++; continue;}
    if (ch === "'" || ch === '"' || ch === String.fromCharCode(96)) {inString = ch; continue;}
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return source.slice(start, j+1);
  }
  throw new Error('Incomplete ' + name);
}
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function context(overrides) {
  const ctx = Object.assign({ console: { log() {}, warn() {} }, String, Array, Object, Promise, Date }, overrides);
  vm.createContext(ctx); return ctx;
}

(async () => {
  const fail = deferred(), events1 = [], toasts1 = [];
  const a = context({
    confirm: () => true, BACKEND: 'https://backend.invalid', S: {backendKey: 'key'},
    journalManager: { getById: () => ({id:'T1'}), remove: id => events1.push('removed '+id) },
    jDeleteRemote: () => {events1.push('delete requested'); return fail.promise;},
    _jConfirmedDeletedTradeIds: Object.create(null),
    _jLastKnownGoodTrades: [{id:'T1'}], _jLastKnownGoodCount: 1,
    showToast: (s,k) => toasts1.push([s,k]),
    renderPortfolioJournalView: () => events1.push('render'),
    isPortfolioViewActive: () => true, renderPortfolioView: () => {},
  });
  vm.runInContext(extract('deleteTrade'), a);
  const pendingFail = a.deleteTrade('T1');
  assert.deepEqual(events1, ['delete requested'], 'must not optimistically remove');
  fail.resolve(false); await pendingFail;
  assert.deepEqual(events1, ['delete requested'], 'backend failure keeps the row');
  assert.equal(a._jLastKnownGoodCount, 1, 'failure preserves recovery snapshot');
  assert.equal(a._jConfirmedDeletedTradeIds.T1, undefined, 'failure never tombstones');
  assert.ok(toasts1.some(x => x[1] === 'warn'), 'failed DELETE is visible warning');

  const ok = deferred(), events2 = [], toasts2 = [];
  const b = context({
    confirm: () => true, BACKEND: 'https://backend.invalid', S: {backendKey: 'key'},
    journalManager: { getById: () => ({id:'T1'}), remove: id => events2.push('removed '+id) },
    jDeleteRemote: () => {events2.push('delete requested'); return ok.promise;},
    _jConfirmedDeletedTradeIds: Object.create(null),
    _jLastKnownGoodTrades: [{id:'T1'},{id:'T2'}], _jLastKnownGoodCount: 2,
    showToast: (s,k) => toasts2.push([s,k]),
    renderPortfolioJournalView: () => events2.push('render'),
    isPortfolioViewActive: () => true, renderPortfolioView: () => {},
  });
  vm.runInContext(extract('deleteTrade'), b);
  const pendingOk = b.deleteTrade('T1');
  assert.deepEqual(events2, ['delete requested']);
  ok.resolve(true); await pendingOk;
  assert.equal(b._jConfirmedDeletedTradeIds.T1, true);
  assert.equal(b._jLastKnownGoodCount, 1);
  assert.deepEqual(b._jLastKnownGoodTrades.map(t=>t.id), ['T2']);
  assert.deepEqual(events2.slice(0,2), ['delete requested', 'removed T1']);
  assert.ok(toasts2.some(x => x[1] === 'ok'));
  assert.match(extract('_jSyncJournalFromBackend'), /!_jConfirmedDeletedTradeIds\[String\(t\.id\)\]/,
    'in-flight GET cannot resurrect a confirmed deletion');

  const one = deferred(), two = deferred();
  const jm = {_lastBackendWrite: null};
  const c = context({
    journalManager: jm,
    scanAll: () => [{trade:{id:'A'}},{trade:{id:'B'}}],
    applySafeOTMCleanup: id => {
      jm._lastBackendWrite = id === 'A' ? one.promise : two.promise;
      return {applied:1,reviewRequired:0};
    },
  });
  vm.runInContext(extract('applySafeOTMCleanupAll'), c);
  let completed = false;
  const cleanup = c.applySafeOTMCleanupAll('PF').then(r => { completed = true; return r; });
  await Promise.resolve(); assert.equal(completed, false, 'do not return early');
  one.resolve({ok:true,source:'backend'}); await Promise.resolve(); await Promise.resolve();
  assert.equal(completed, false, 'still waiting on the second trade');
  two.resolve({ok:false,source:'local',configured:true,error:'HTTP 500'});
  const result = await cleanup;
  assert.equal(result.applied, 2);
  assert.equal(result.backendConfirmedTrades, 1);
  assert.equal(result.backendFailedTrades, 1);

  const done = deferred(), messages = [];
  const d = context({
    portfolioExpiry: {
      scanAll: () => [{expiredLegs:[{classification:'OTM'}]}],
      applySafeOTMCleanupAll: () => done.promise
    },
    confirm: () => true,
    showToast: (s,k) => messages.push([s,k]),
    renderPositionsPanel() {},
    renderPortfolioJournalView() {},
    console: { warn() {} },
  });
  vm.runInContext(extract('_pfExpiryApply'), d);
  const task = d._pfExpiryApply('PF');
  assert.equal(messages.length,0,'no green toast while PUTs pending');
  done.resolve({applied:1,reviewRequired:0,backendFailedTrades:1,backendConfirmedTrades:0});
  await task;
  assert.equal(messages.length,1);
  assert.equal(messages[0][1],'warn');

  console.log('Journal persistence & expiry cleanup: 4 cases passed');
})().catch(e => { console.error(e); process.exitCode = 1; });
