'use strict';
// DEV Volatility Coverage Yang-Zhang projection: read-only, digest-and-session
// aligned join, no client calculation, no accidental certification or IV POST.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {
  checkYangZhangPage, attachYangZhangPages, matchingYangZhangRowForDetail,
  yangZhangCell, renderYangZhangStatus,
  renderYangZhangDetail, renderTable, renderDetail, toCsv, sortRows, fetchJson
}=require('../devtools/volatility-coverage-monitor.js');

const DIGEST='a'.repeat(64);
const DATE='2026-11-02';
const AFTER='2026-11-03T12:00:00.000Z';
function row(i){
  return {
    symbol:'T'+i, universePosition:i, status:'PARTIAL', reasons:[],primaryReason:null,
    ivRef:{value:0.35,status:'IV_AVAILABLE',source:'test',selectedExpiration:'2026-12-18',selectedDte:45,acquisition:null},
    rv20:{value:0.2,basis:'PRELIMINARY',coverage:null,closesRequired:21,certified:{status:'UNAVAILABLE',reasons:[]}},
    rv60:{value:0.22,basis:'PRELIMINARY',coverage:null,closesRequired:61,certified:{status:'UNAVAILABLE',reasons:[]}},
    spreads:{ivMinusRv20Pp:{valuePp:15,basis:'RV_PRELIMINARY',missing:[]},
      ivMinusRv60Pp:{valuePp:13,basis:'RV_PRELIMINARY',missing:[]}},
    asOf:{rvSessionDate:DATE,ivAsOfDate:'2026-11-03',ivObservedAt:AFTER,datesDiffer:true},
    errors:{},ivTenors:undefined
  };
}
function coverage(count=26){
  return {version:'VOLATILITY_COVERAGE_V1',asOfSessionDate:DATE,ivAsOfDate:'2026-11-03',
    universe:{digest:DIGEST,source:'SCANNER',count},
    rows:Array.from({length:count},(_,i)=>row(i)),sources:{},generatedFrom:AFTER,
    generatedTo:AFTER,pageGeneratedAt:{},yangZhang:{status:'LOADING',readError:null}};
}
const yzWindow=(n)=>({
  status:'PRELIMINARY',value:n===20?0.31:0.4,mathematicalValue:n===20?0.31:0.4,
  reason:null,reasons:[],category:null,returnsUsed:n,sessionsRequired:n+1,
  windowFrom:'2026-08-10',windowThrough:DATE,missingSessions:0,invalidSessions:0,
  blockedSessions:0,inputDigest:'b'.repeat(64)
});
function page(c,offset,n=Math.min(25,c.rows.length-offset)){
  return {ok:true,readOnly:true,certified:false,notForTrading:true,executionAuthorized:false,
    auditVersion:'RV_YANG_ZHANG_UNIVERSE_AUDIT_READ_ONLY_V1',
    formulaVersion:'YANG_ZHANG_RV_252_V1',generatedAt:AFTER,asOfSessionDate:DATE,
    universe:{digest:DIGEST,count:c.rows.length,source:'SCANNER'},offset,limit:25,returned:n,
    nextOffset:offset+n<c.rows.length?offset+n:null,
    rows:c.rows.slice(offset,offset+n).map(r=>({symbol:r.symbol,universePosition:r.universePosition,
      readError:null,asOfSessionDate:DATE,rv20YZ:yzWindow(20),rv60YZ:yzWindow(60)}))};
}
function throws(f,token){assert.throws(f,new RegExp(token));}

// Same ticker list, exact ordering, and AS_OF session are required.
{
  const c=coverage(26),p0=page(c,0),p25=page(c,25);
  assert.equal(checkYangZhangPage(p0,0,c),p0);
  assert.equal(checkYangZhangPage(p25,25,c),p25);
  throws(()=>checkYangZhangPage({...p0,universe:{...p0.universe,digest:'b'.repeat(64)}},0,c),'INCONSISTENT');
  throws(()=>checkYangZhangPage({...p0,asOfSessionDate:'2026-11-03'},0,c),'INCONSISTENT');
  throws(()=>checkYangZhangPage({...p0,readOnly:false},0,c),'INCONSISTENT');
  throws(()=>checkYangZhangPage({...p0,certified:true},0,c),'INCONSISTENT');
  throws(()=>checkYangZhangPage({...p0,executionAuthorized:true},0,c),'INCONSISTENT');
  throws(()=>checkYangZhangPage({...p0,rows:[{...p0.rows[0],symbol:'NOT_THE_SAME'},...p0.rows.slice(1)]},0,c),'ROW_MISMATCH');
  const wrong=[...p0.rows];wrong[0]={...wrong[0],rv20YZ:{...wrong[0].rv20YZ,status:'BLOCKED_SESSION_POLICY',value:0.3}};
  throws(()=>checkYangZhangPage({...p0,rows:wrong},0,c),'WINDOW_INVALID');
  const stale=[...p0.rows];stale[0]={...stale[0],readError:'CANDLE_READ_FAILED'};
  throws(()=>checkYangZhangPage({...p0,rows:stale},0,c),'FAILED_ROW_WITH_VALUE');
  throws(()=>attachYangZhangPages(c,[p0]),'PAGES_INCOMPLETE');
  const bad={...p25,formulaVersion:'SILENT_FORMULA_CHANGE'};
  throws(()=>attachYangZhangPages(c,[p0,bad]),'FORMULA_CHANGED');
  assert.equal(c.rows[0].yangZhang,undefined,'no partial join on invalid second page');
  assert.equal(c.yangZhang.status,'LOADING');
  attachYangZhangPages(c,[p0,p25]);
  assert.equal(c.yangZhang.status,'READY');
  assert.equal(c.rows[25].yangZhang.rv60YZ.value,0.4);
  // Actual Coverage :symbol API: NO top-level asOfSessionDate. The only
  // session reference is detail.row.asOf.rvSessionDate (verified in backend).
  const detail={
    ok:true,version:'VOLATILITY_COVERAGE_V1',readOnly:true,executionAuthorized:false,
    symbol:'T0',universePosition:0,universe:{count:26,digest:DIGEST},
    row:c.rows[0],
  };
  assert.equal(Object.hasOwn(detail,'asOfSessionDate'),false,'test must match real backend response shape');
  assert.equal(matchingYangZhangRowForDetail(detail,c),c.rows[0]);
  assert.equal(matchingYangZhangRowForDetail({...detail,row:{...detail.row,
    asOf:{...detail.row.asOf,rvSessionDate:'2026-11-03'}}},c),null,'reject stale detail session');
  assert.equal(matchingYangZhangRowForDetail({...detail,universe:{count:26,digest:'b'.repeat(64)}},c),null);
  assert.equal(matchingYangZhangRowForDetail({...detail,universePosition:1},c),null);
  assert.equal(matchingYangZhangRowForDetail({...detail,universe:{count:25,digest:DIGEST}},c),null);

  assert.match(renderYangZhangStatus(c),/26\/26/);
  assert.match(renderYangZhangStatus(c),/non atomica/);
  const table=renderTable(c.rows.slice(0,1),{key:'position',dir:'asc'},null,c.yangZhang.status);
  assert.match(table,/RV20 CC/);
  assert.match(table,/RV20 YZ/);
  assert.match(table,/RV60 YZ/);
  assert.match(table,/31\.00%/);
  assert.match(table,/40\.00%/);
  assert.deepEqual(sortRows(c.rows.slice(0,2),'rv20YZ','desc').map(x=>x.symbol),['T0','T1']);
  const csv=toCsv(c,null).trimEnd().split('\r\n');
  assert.equal(csv.length,27);
  const names=csv[0].split(','),values=csv[1].split(',');
  const val=k=>values[names.indexOf(k)];
  assert.equal(names.length,values.length);
  assert.equal(val('rv20'),'0.2','CC preserved');
  assert.equal(val('rv20_yz'),'0.31','backend precision preserved');
  assert.equal(val('rv60_yz'),'0.4');
  assert.equal(val('rv20_yz_status'),'PRELIMINARY');
  assert.equal(val('yz_read_status'),'READY');
  assert.equal(val('yz_generated_from'),AFTER);
  assert.equal(val('yz_generated_to'),AFTER);
  assert.ok(names.indexOf('rv20_yz')>names.indexOf('iv60_value'),'YZ fields append after existing CSV columns');
}

// Policy-blocked mathematical diagnostics must NOT masquerade as usable RV.
{
  const c=coverage(1),p=page(c,0);
  p.rows[0].rv20YZ={...p.rows[0].rv20YZ,status:'BLOCKED_SESSION_POLICY',
    value:null,mathematicalValue:0.111,reason:'SESSION_POLICY_NOT_COVERED'};
  p.rows[0].rv60YZ={...p.rows[0].rv60YZ,status:'UNAVAILABLE',
    value:null,mathematicalValue:null,reason:'MISSING_COMPLETED_SESSIONS'};
  attachYangZhangPages(c,[p]);
  const cc=c.rows[0];
  const cell=yangZhangCell(cc,20,'READY');
  assert.match(cell,/solo valore matematico/);
  assert.doesNotMatch(cell,/11\.10%/);
  assert.match(yangZhangCell(cc,60,'READY'),/MISSING_COMPLETED_SESSIONS/);
  const detail=renderYangZhangDetail(cc,'READY');
  assert.match(detail,/non certificati/);
  const names=toCsv(c,null).trimEnd().split('\r\n');
  const cols=names[0].split(','),fields=names[1].split(',');
  const val=k=>fields[cols.indexOf(k)];
  assert.equal(val('rv20_yz'),'');
  assert.equal(val('rv20_yz_status'),'BLOCKED_SESSION_POLICY');
  assert.equal(val('rv20_yz_mathematical_diagnostic'),'0.111');
  assert.equal(val('rv60_yz'),'');
}
{
  const c=coverage(1),p=page(c,0);
  p.rows[0]={symbol:'T0',universePosition:0,readError:'CANDLE_READ_FAILED',rv20YZ:null,rv60YZ:null};
  attachYangZhangPages(c,[p]);
  assert.match(yangZhangCell(c.rows[0],20,'READY'),/candele non leggibili/);
}
{
  const c=coverage(1);
  c.yangZhang={status:'ERROR',readError:'YANG_ZHANG_PAGE_INCONSISTENT'};
  assert.match(renderYangZhangStatus(c),/non disponibili/);
  assert.match(yangZhangCell(c.rows[0],20,'ERROR'),/errore lettura/);
  const cols=toCsv(c,null).trimEnd().split('\r\n');
  const idx=cols[0].split(',').indexOf('yz_read_status');
  assert.equal(cols[1].split(',')[idx],'ERROR');
}

// HTTP guard: Yang-Zhang is read-only; any attempt to POST to it fails BEFORE fetch.
{
  const oldFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=async()=>{calls++;throw Error('NETWORK_SHOULD_NOT_BE_REACHED');};
  (async()=>{
    await assert.rejects(fetchJson('https://example.test/debug/volatility-carry/rv-yang-zhang',
      'key',new AbortController().signal,{}),/COVERAGE_POST_NOT_ALLOWED/);
    assert.equal(calls,0);
  })().finally(()=>{globalThis.fetch=oldFetch;});
}

// Source-level guards on the UI lifecycle: close aborts the YZ request; auto-refresh
// reuses GET-only analyze, never auto-starts /iv-refresh/jobs.
const src=readFileSync(join(__dirname,'..','devtools','volatility-coverage-monitor.js'),'utf8');
assert.match(src,/const YZ_PATH = '\/debug\/volatility-carry\/rv-yang-zhang'/);
assert.match(src,/if \(yzCurrent\) yzCurrent\.abort\(\)/);
assert.match(src,/void loadYangZhang\(data\)/);
assert.match(src,/readOnly !== true/);
assert.doesNotMatch(src,/fetchJson\(BACKEND \+ YZ_PATH[^\n]*,\s*S\.backendKey,\s*signal,\s*\{/);
console.log('Volatility Coverage Yang-Zhang: atomic joins, CSV, detail, classification, network guard OK');
