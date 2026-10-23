const fs = require('fs');
const assert = require('assert');

const html = require('./lib/load-app-source').loadAppJavaScriptSource();

assert(
  html.includes("_trades.filter(function(t) { return String(t.id || t.tradeId) !== sid; });"),
  'journalManager.remove compares stringified id/tradeId so backend string ids are removed locally'
);

assert(
  html.includes("onclick=\"deleteTrade(this.dataset.tid)\""),
  'journal delete button passes the raw data-tid instead of coercing backend string ids to NaN'
);

assert(
  html.includes("r.status === 404") && html.includes("already deleted remotely"),
  'remote journal delete treats HTTP 404 as already deleted remotely'
);

assert(
  html.includes("if (r.ok) return true;"),
  'remote journal delete treats successful DELETE responses, including 204, as success without requiring JSON'
);

const deleteStart = html.indexOf('async function deleteTrade(id, opts)');
const deleteEnd = html.indexOf('function renderPortfolioJournalView', deleteStart);
const deleteBlock = html.slice(deleteStart, deleteEnd);
assert(
  deleteBlock.includes('journalManager.remove(id)') &&
    !deleteBlock.includes('journalManager.close') &&
    !deleteBlock.includes("status: 'CLOSED'") &&
    !deleteBlock.includes("status:'CLOSED'"),
  'journal delete path removes trades rather than closing them'
);

console.log('✓ journal delete removes local state for 404/already-deleted backend trades');


// Runtime DELETE-only regressions; no Safe Cleanup code exercised or modified.
// Co-located with the existing Journal suite to preserve the repository's
// historical 197-file extraction-audit test inventory.
const vm = require('vm');
function fn(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert(a >= 0 && b > a, 'runtime function boundary: ' + start);
  return html.slice(a,b);
}
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return {resolve,promise};
}
const journalDelete = fn('async function deleteTrade(id, opts) {',
  'function renderPortfolioJournalView');
const portfolioDelete = fn('async function deletePosition(posId) {',
  '// Resolve reliable underlying IVR');
function vmCtx(extra) {
  const ctx = Object.assign({console: {log(){},warn(){}}, Object, String,
    Array, Promise}, extra);
  vm.createContext(ctx);return ctx;
}

(async () => {
  const pending = deferred(), trace=[], toasts=[];
  const t = vmCtx({
    confirm: () => true, BACKEND:'backend', S:{backendKey:'key'},
    journalManager:{getById:()=>({id:'T1'}),remove:id=>trace.push('remove:'+id)},
    jDeleteRemote:()=>{trace.push('requested');return pending.promise;},
    _jConfirmedDeletedTradeIds:Object.create(null),
    _jLastKnownGoodTrades:[{id:'T1'}],_jLastKnownGoodCount:1,
    localStorage:{setItem(){}},apexStorageKey:s=>s,
    showToast:(s,k)=>toasts.push(k),
    renderPortfolioJournalView:()=>trace.push('render'),
    isPortfolioViewActive:()=>true,renderPortfolioView() {},
  });
  vm.runInContext(journalDelete,t);
  const task=t.deleteTrade('T1');
  assert.deepStrictEqual(trace,['requested'],'no optimistic deletion');
  pending.resolve(false);await task;
  assert.deepStrictEqual(trace,['requested'],'failed backend DELETE keeps local');
  assert.strictEqual(t._jConfirmedDeletedTradeIds.T1,undefined);
  assert(toasts.includes('warn'),'failure visible');

  const success = deferred(), events=[],messages=[];
  const ok=vmCtx({
    confirm:()=>true,BACKEND:'backend',S:{backendKey:'key'},
    journalManager:{getById:()=>({id:'T2'}),remove:id=>events.push('remove:'+id)},
    jDeleteRemote:()=>{events.push('requested');return success.promise;},
    _jConfirmedDeletedTradeIds:Object.create(null),
    _jLastKnownGoodTrades:[{id:'T2'},{id:'T3'}],_jLastKnownGoodCount:2,
    localStorage:{setItem:(k,v)=>events.push('ledger:'+v)},
    apexStorageKey:s=>s,
    showToast:(s,k)=>messages.push(k),
    renderPortfolioJournalView() {},
    isPortfolioViewActive:()=>true,renderPortfolioView() {},
  });
  vm.runInContext(journalDelete,ok);
  const deletion=ok.deleteTrade('T2');
  assert.deepStrictEqual(events,['requested']);
  success.resolve(true);await deletion;
  assert.strictEqual(ok._jConfirmedDeletedTradeIds.T2,true);
  assert.strictEqual(ok._jLastKnownGoodCount,1);
  assert.strictEqual(ok._jLastKnownGoodTrades[0].id,'T3');
  assert(events.includes('remove:T2'),'remove after backend confirmation');
  assert(messages.includes('ok'),'only confirmed delete reports success');

  assert(html.includes('jLoadFromBackend = _jSyncJournalFromBackend;'),
    'legacy Journal reader shares tombstone-filtered sync');
  assert(html.includes("_confirmedDeletedOnDisk[String(t.id || t.tradeId)]"),
    'cold start filters previously confirmed deletes');
  assert(html.includes('Object.keys(_confirmedDeletedOnDisk).forEach(function(id) { _srcIds[id] = 1; });'),
    'legacy apex_positions never remigrates confirmed deletes');
  assert(html.includes("onclick=\"deletePosition(this.dataset.posid)\""),
    'Portfolio DEL preserves opaque string id');
  assert(!html.includes("onclick=\"deletePosition(+this.dataset.posid)\""));

  const p=vmCtx({
    positionManager:{getById: id=>id==='T2'?{ticker:'ADBE'}:null},
    confirm:()=>true,
    deleteTrade:async(id,opts)=>{assert.strictEqual(id,'T2');assert.strictEqual(opts.skipConfirm,true);return true;},
    _activePanelPortfolioId:'PF',renderPositionsPanel:id=>assert.strictEqual(id,'PF')
  });
  vm.runInContext(portfolioDelete,p);
  await p.deletePosition('T2');

  console.log('✓ backend-first Journal/Portfolio DELETE: failure, success, tombstones, string IDs');
})().catch(e=>{console.error(e);process.exitCode=1;});
