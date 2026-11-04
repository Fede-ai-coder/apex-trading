'use strict';
// DEV Volatility Coverage Yang-Zhang projection: read-only, digest-and-session
// aligned join, no client calculation, no accidental certification or IV POST.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {
  checkYangZhangPage, attachYangZhangPages, matchingYangZhangRowForDetail,
  yangZhangCell, cc40Cell, spread40Diagnostic, spread40Cell, renderSpread40Detail,
  tenorSpreadDiagnostic, tenorSpreadCell, renderTenorSpreadsDetail,
  ohlcDiagnosticButton, renderPriceBasisOhlcAudit,
  renderYangZhangStatus,
  renderYangZhangDetail, renderTable, renderDetail, toCsv, sortRows, fetchJson
}=require('../../devtools/volatility-coverage-monitor.js');

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
  status:'PRELIMINARY',value:n===20?0.31:n===40?0.35:0.4,
  mathematicalValue:n===20?0.31:n===40?0.35:0.4,
  reason:null,reasons:[],category:null,returnsUsed:n,sessionsRequired:n+1,
  windowFrom:'2026-08-10',windowThrough:DATE,missingSessions:0,invalidSessions:0,
  blockedSessions:0,inputDigest:'b'.repeat(64)
});
function page(c,offset,n=Math.min(25,c.rows.length-offset)){
  return {ok:true,readOnly:true,certified:false,notForTrading:true,executionAuthorized:false,
    auditVersion:'RV_YANG_ZHANG_UNIVERSE_AUDIT_READ_ONLY_V1',
    rv40DiagnosticVersion:'RV40_CC_AND_YANG_ZHANG_STORED_1D_PRELIMINARY_V1',
    formulaVersion:'YANG_ZHANG_RV_252_V1',generatedAt:AFTER,asOfSessionDate:DATE,
    universe:{digest:DIGEST,count:c.rows.length,source:'SCANNER'},offset,limit:25,returned:n,
    nextOffset:offset+n<c.rows.length?offset+n:null,
    rows:c.rows.slice(offset,offset+n).map(r=>({symbol:r.symbol,universePosition:r.universePosition,
      readError:null,asOfSessionDate:DATE,rv20YZ:yzWindow(20),rv40YZ:yzWindow(40),rv60YZ:yzWindow(60),
      cc:{formulaVersion:'RV_LOGSQ_252_V1',rv40:{status:'PRELIMINARY',value:0.24,reason:null,priceAdjustment:'UNVERIFIED_NO_JUMP_DETECTED'}}}))};
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
  throws(()=>checkYangZhangPage({...p0,rv40DiagnosticVersion:null},0,c),'INCONSISTENT');
  const absent40=[...p0.rows];absent40[0]={...absent40[0],rv40YZ:null};
  throws(()=>checkYangZhangPage({...p0,rows:absent40},0,c),'WINDOW_INVALID');
  const badCC=[...p0.rows];badCC[0]={...badCC[0],cc:{rv40:{status:'PRELIMINARY',value:null}}};
  throws(()=>checkYangZhangPage({...p0,rows:badCC},0,c),'RV40_CC_WINDOW_INVALID');
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
  assert.equal(c.rows[25].yangZhang.rv40YZ.value,0.35);
  assert.equal(c.rows[25].yangZhang.cc.rv40.value,0.24);
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
  assert.match(table,/RV40 CC/);
  assert.match(table,/RV40 YZ/);
  assert.match(table,/IV40 − RV40 CC/);
  assert.match(table,/IV40 − RV40 YZ/);
  assert.match(table,/IV40/);
  assert.match(table,/RV20 YZ/);
  assert.match(table,/RV60 YZ/);
  assert.match(table,/31\.00%/);
  assert.match(table,/24\.00%/);
  assert.match(table,/35\.00%/);
  assert.match(table,/40\.00%/);
  assert.deepEqual(sortRows(c.rows.slice(0,2),'rv20YZ','desc').map(x=>x.symbol),['T0','T1']);
  assert.deepEqual(sortRows(c.rows.slice(0,2),'rv40CC','desc').map(x=>x.symbol),['T0','T1']);
  assert.deepEqual(sortRows(c.rows.slice(0,2),'rv40YZ','desc').map(x=>x.symbol),['T0','T1']);
  const csv=toCsv(c,null).trimEnd().split('\r\n');
  assert.equal(csv.length,27);
  const names=csv[0].split(','),values=csv[1].split(',');
  const val=k=>values[names.indexOf(k)];
  assert.equal(names.length,values.length);
  assert.equal(val('rv20'),'0.2','CC preserved');
  assert.equal(val('rv20_yz'),'0.31','backend precision preserved');
  assert.equal(val('rv60_yz'),'0.4');
  assert.equal(val('rv40_cc'),'0.24');
  assert.equal(val('rv40_cc_status'),'PRELIMINARY');
  assert.equal(val('iv40_minus_rv40_cc_status'),'UNAVAILABLE');
  assert.equal(val('iv40_minus_rv40_cc_pp'),'');
  assert.equal(val('iv40_minus_rv40_yz_pp'),'');
  assert.equal(val('rv40_yz'),'0.35');
  assert.equal(val('rv40_yz_returns_used'),'40');
  assert.ok(names.indexOf('rv40_cc')>names.indexOf('rv60_yz_category'),'RV40 columns strictly append');
  assert.equal(val('rv20_yz_status'),'PRELIMINARY');
  assert.equal(val('yz_read_status'),'READY');
  assert.equal(val('yz_generated_from'),AFTER);
  assert.equal(val('yz_generated_to'),AFTER);
  assert.ok(names.indexOf('rv20_yz')>names.indexOf('iv60_value'),'YZ fields append after existing CSV columns');
}


{
  const c=coverage(1),p=page(c,0);
  attachYangZhangPages(c,[p]);
  const r=c.rows[0];
  r.ivRef={...r.ivRef,observedAt:AFTER,
    timing:{policyVersion:'IV_RV_TIMING_V1',comparable:true,providerUpdateAttested:false}};
  r.ivTenors={iv40:{targetDte:40,status:'AVAILABLE',value:0.4,
    optionChainType:'Standard',horizonBasis:'CALENDAR_DTE_NOMINAL_PAIRING_WITH_TRADING_SESSION_RV',
    selectedDte:38,selectedExpiration:'2026-12-11',asOfDate:'2026-11-03',observedAt:AFTER}};
  const cc=spread40Diagnostic(r,'CC','READY'),yz=spread40Diagnostic(r,'YZ','READY');
  assert.equal(cc.status,'INDICATIVE');
  assert.equal(yz.status,'INDICATIVE');
  assert.ok(Math.abs(cc.valuePp-16)<1e-9);
  assert.ok(Math.abs(yz.valuePp-5)<1e-9);
  assert.equal(cc.actualDte,38);
  const table=renderTable([r],{key:'position',dir:'asc'},null,'READY');
  assert.match(table,/\+16\.00 pp/);
  assert.match(table,/\+5\.00 pp/);
  const h20=table.indexOf('data-sort="spread20"'),h60=table.indexOf('data-sort="spread60"');
  const curveKeys=['spread20TenorCC','spread40CC','spread60TenorCC',
    'spread20TenorYZ','spread40YZ','spread60TenorYZ'];
  const curvePositions=curveKeys.map(key=>table.indexOf('data-sort="'+key+'"'));
  assert.ok(h20>=0 && h20<h60 && h60<curvePositions[0] &&
    curvePositions.every((pos,i)=>pos>=0 && (i===0 || pos>curvePositions[i-1])),
    'old IV Ref headings stay before CC 20/40/60 and YZ 20/40/60');
  const tableCells=table.split('<tbody>')[1].split('</tr>')[0].split('<td>');
  assert.match(tableCells[11],/\+15\.00 pp/,'legacy 20 spread remains in column 11');
  assert.match(tableCells[12],/\+13\.00 pp/,'legacy 60 spread remains in column 12');
  assert.match(tableCells[14],/\+16\.00 pp/,'indicative CC40 follows CC20 in column 14');
  assert.match(tableCells[17],/\+5\.00 pp/,'indicative YZ40 follows YZ20 in column 17');
  assert.match(spread40Cell(r,'CC','READY'),/38 DTE calendario \/ 40 sedute/);
  const detail=renderSpread40Detail(r,r,'READY');
  assert.match(detail,/IV40 − RV40 CC/);
  assert.match(detail,/IV40 − RV40 YZ/);
  assert.match(detail,/orizzonti NON coincidono/);
  assert.match(renderSpread40Detail(r,null,'READY'),/RV40_SESSION_MISMATCH/);
  const csv=toCsv(c,null).trimEnd().split('\r\n');
  const head=csv[0].split(','),fields=csv[1].split(',');
  const value=k=>fields[head.indexOf(k)];
  assert.ok(Math.abs(Number(value('iv40_minus_rv40_cc_pp'))-16)<1e-9);
  assert.ok(Math.abs(Number(value('iv40_minus_rv40_yz_pp'))-5)<1e-9);
  assert.equal(value('iv40_minus_rv40_cc_status'),'INDICATIVE');
  assert.equal(value('iv40_minus_rv40_yz_reason'),'');
  assert.ok(head.indexOf('iv40_minus_rv40_cc_pp')>head.indexOf('rv40_yz_category'));
  assert.equal(spread40Diagnostic(r,'CC','LOADING').valuePp,null);
  assert.equal(spread40Diagnostic(r,'CC','LOADING').reason,'RV40_READ_LOADING');
  assert.equal(spread40Diagnostic({...r,ivRef:{...r.ivRef,timing:null}},'CC','READY').reason,
    'IV40_RV_TIMING_NOT_VERIFIED');
  assert.equal(spread40Diagnostic({...r,ivTenors:{iv40:{...r.ivTenors.iv40,observedAt:'2026-11-03T12:00:01Z'}}},'CC','READY').reason,
    'IV40_RV_TIMING_NOT_VERIFIED');
  assert.equal(spread40Diagnostic({...r,ivTenors:{iv40:{...r.ivTenors.iv40,status:'NOT_CURRENT',value:null}}},'CC','READY').reason,
    'IV40_NOT_CURRENT');
  assert.equal(spread40Diagnostic({...r,ivTenors:{iv40:{...r.ivTenors.iv40,horizonBasis:'UNDECLARED'}}},'CC','READY').reason,
    'IV40_PROVENANCE_UNVERIFIED');
  assert.equal(spread40Diagnostic({...r,yangZhang:{...r.yangZhang,asOfSessionDate:'2026-11-01'}},'YZ','READY').reason,
    'RV40_SESSION_MISMATCH');
  assert.equal(spread40Diagnostic({...r,yangZhang:{...r.yangZhang,
    cc:{rv40:{status:'EXPLORATORY_UNVERIFIED_SESSION_POLICY',value:0.24}}}},'CC','READY').reason,
    'RV40_EXPLORATORY_UNVERIFIED_SESSION_POLICY');
  assert.equal(spread40Diagnostic({...r,yangZhang:{...r.yangZhang,
    rv40YZ:{status:'BLOCKED_SESSION_POLICY',value:null,mathematicalValue:0.35}}},'YZ','READY').reason,
    'RV40_BLOCKED_SESSION_POLICY');
  assert.equal(spread40Diagnostic({...r,ivTenors:undefined},'CC','READY').reason,'IV40_NOT_EXPOSED');
  const sorted=sortRows([r,{...r,universePosition:1,ivTenors:undefined}],'spread40CC','desc');
  assert.equal(sorted[0].universePosition,0);
}


// IV20/IV60 paired with their own RV horizon (NOT legacy IV Ref), indicative only.
{
  const c=coverage(2), p=page(c,0);
  attachYangZhangPages(c,[p]);
  const r=c.rows[0], s=c.rows[1];
  r.ivRef={...r.ivRef,observedAt:AFTER,
    timing:{policyVersion:'IV_RV_TIMING_V1',comparable:true,providerUpdateAttested:false}};
  const tenor=(n,value,dte)=>({targetDte:n,status:'AVAILABLE',value,
    optionChainType:'Standard',horizonBasis:'CALENDAR_DTE_NOMINAL_PAIRING_WITH_TRADING_SESSION_RV',
    selectedDte:dte,selectedExpiration:'2026-12-11',asOfDate:'2026-11-03',observedAt:AFTER});
  r.ivTenors={iv20:tenor(20,.335,18),iv40:tenor(40,.4,38),iv60:tenor(60,.49,58)};
  const before=JSON.stringify(r);
  const vals=[
    [20,'CC',13.5],[20,'YZ',2.5],[60,'CC',27],[60,'YZ',9]
  ];
  for(const [n,est,want] of vals){
    const sp=tenorSpreadDiagnostic(r,n,est,'READY');
    assert.equal(sp.status,'INDICATIVE');
    assert.equal(sp.comparisonBasis,'CALENDAR_DTE_NOMINAL_PAIRING_WITH_TRADING_SESSION_RV');
    assert.ok(Math.abs(sp.valuePp-want)<1e-9, 'IV'+n+' - RV'+n+' '+est);
    assert.match(tenorSpreadCell(r,n,est,'READY'),/indicativo/);
  }
  assert.equal(JSON.stringify(r),before,'calculation never changes the source row');
  const table=renderTable([r],{key:'position',dir:'asc'},null,'READY');
  for(const label of ['IV20 − RV20 CC','IV20 − RV20 YZ','IV60 − RV60 CC','IV60 − RV60 YZ'])
    assert.ok(table.includes(label),'four new visible headers: '+label);
  const heads=['spread20TenorCC','spread40CC','spread60TenorCC',
    'spread20TenorYZ','spread40YZ','spread60TenorYZ'];
  const offsets=heads.map(k=>table.indexOf('data-sort="'+k+'"'));
  assert.ok(offsets.every(x=>x>=0)&&offsets.every((x,i)=>i===0||x>offsets[i-1]),
    'headers follow CC 20/40/60, then YZ 20/40/60, after legacy IV Ref columns');
  const cells=table.split('<tbody>')[1].split('</tr>')[0].split('<td>');
  for(const [i,expected] of [[11,'+15.00 pp'],[12,'+13.00 pp'],
    [13,'+13.50 pp'],[14,'+16.00 pp'],[15,'+27.00 pp'],
    [16,'+2.50 pp'],[17,'+5.00 pp'],[18,'+9.00 pp']])
    assert.ok(cells[i].includes(expected),'correct spread cell at '+i);
  const detail=renderTenorSpreadsDetail(r,r,'READY');
  assert.match(detail,/IV20 − RV20 CC/);assert.match(detail,/IV20 − RV20 YZ/);
  assert.match(detail,/IV60 − RV60 CC/);assert.match(detail,/IV60 − RV60 YZ/);
  assert.match(detail,/Orizzonti diversi/);assert.match(detail,/Nessun fallback alla IV Ref/);
  assert.match(renderTenorSpreadsDetail(r,null,'READY'),/RV20_SESSION_MISMATCH/);
  assert.equal(tenorSpreadDiagnostic(r,20,'CC','LOADING').status,'INDICATIVE',
    'CC value is independent of the separate YZ GET');
  assert.equal(tenorSpreadDiagnostic(r,20,'YZ','LOADING').reason,'RV20_READ_LOADING');
  assert.equal(tenorSpreadDiagnostic(r,60,'YZ','ERROR').reason,'RV60_READ_ERROR');
  const old=r.ivTenors, oldRef=r.ivRef;
  const noTenors={...r,ivTenors:undefined};
  assert.equal(tenorSpreadDiagnostic(noTenors,20,'CC','READY').reason,'IV20_NOT_EXPOSED');
  assert.equal(tenorSpreadDiagnostic(noTenors,60,'YZ','READY').reason,'IV60_NOT_EXPOSED');
  assert.equal(tenorSpreadDiagnostic({...r,ivTenors:{...old,iv60:{...old.iv60,status:'NOT_CURRENT',value:null}}},60,'CC','READY').reason,
    'IV60_NOT_CURRENT');
  assert.equal(tenorSpreadDiagnostic({...r,ivTenors:{...old,iv20:{...old.iv20,horizonBasis:'OTHER'}}},20,'CC','READY').reason,
    'IV20_PROVENANCE_UNVERIFIED');
  assert.equal(tenorSpreadDiagnostic({...r,ivTenors:{...old,iv20:{...old.iv20,observedAt:'2026-11-03T12:00:01Z'}}},20,'CC','READY').reason,
    'IV20_RV_TIMING_NOT_VERIFIED');
  assert.equal(tenorSpreadDiagnostic({...r,ivRef:{...oldRef,timing:{policyVersion:'IV_RV_TIMING_V1',comparable:false}}},60,'YZ','READY').reason,
    'IV60_RV_TIMING_NOT_VERIFIED');
  assert.equal(tenorSpreadDiagnostic({...r,yangZhang:{...r.yangZhang,asOfSessionDate:'2026-11-01'}},60,'YZ','READY').reason,
    'RV60_SESSION_MISMATCH');
  assert.equal(tenorSpreadDiagnostic({...r,yangZhang:{...r.yangZhang,rv20YZ:{
    ...r.yangZhang.rv20YZ,status:'BLOCKED_SESSION_POLICY',value:null,mathematicalValue:0.31}}},20,'YZ','READY').reason,
    'RV20_BLOCKED_SESSION_POLICY');
  assert.equal(tenorSpreadDiagnostic({...r,yangZhang:{...r.yangZhang,rv60YZ:{
    ...r.yangZhang.rv60YZ,status:'UNAVAILABLE',value:null,reason:'MISSING_COMPLETED_SESSIONS'}}},60,'YZ','READY').reason,
    'RV60_UNAVAILABLE');
  assert.equal(tenorSpreadDiagnostic({...r,rv20:{...r.rv20,basis:'EXPLORATORY',value:0.2}},20,'CC','READY').reason,
    'RV20_EXPLORATORY');
  assert.equal(tenorSpreadDiagnostic({...r,rv60:{...r.rv60,basis:'UNAVAILABLE',value:null}},60,'CC','READY').reason,
    'RV60_UNAVAILABLE');
  assert.equal(tenorSpreadDiagnostic(r,40,'YZ','READY').reason,'TENOR_SPREAD_PAIR_INVALID');
  assert.equal(JSON.stringify(r),before,'negative tests never mutate source data');
  // Missing values ALWAYS last, for both sort directions.
  s.ivTenors=undefined;
  assert.deepEqual(sortRows([s,r],'spread20TenorCC','desc').map(x=>x.symbol),['T0','T1']);
  assert.deepEqual(sortRows([s,r],'spread60TenorYZ','asc').map(x=>x.symbol),['T0','T1']);
  const csv=toCsv(c,null).trimEnd().split('\r\n');
  const headers=csv[0].split(','),row0=csv[1].split(','),row1=csv[2].split(',');
  assert.equal(headers.length,row0.length);assert.equal(headers.length,row1.length);
  const field=(name,row=row0)=>row[headers.indexOf(name)];
  const prefix= 'iv40_minus_rv40_yz_reason';
  assert.equal(headers.indexOf('iv20_minus_rv20_cc_pp'),headers.indexOf(prefix)+1,
    'all pre-existing CSV columns retain their offsets');
  for(const [n,est,want] of vals){
    const name='iv'+n+'_minus_rv'+n+'_'+est.toLowerCase();
    assert.ok(Math.abs(Number(field(name+'_pp'))-want)<1e-9);
    assert.equal(field(name+'_status'),'INDICATIVE');
    assert.equal(field(name+'_reason'),'');
    assert.equal(field(name+'_pp',row1),'');
    assert.equal(field(name+'_status',row1),'UNAVAILABLE');
  }
  assert.equal(field('iv20_minus_rv20_yz_pp'),String(100*(.335-.31)),
    'CSV keeps full JS numeric precision rather than display rounding');
  assert.equal(field('iv_minus_rv20_pp'),'15','legacy IV Ref spread unchanged');
  assert.equal(field('iv_minus_rv60_pp'),'13');
}

// Policy-blocked mathematical diagnostics must NOT masquerade as usable RV.
{
  const c=coverage(1),p=page(c,0);
  p.rows[0].rv20YZ={...p.rows[0].rv20YZ,status:'BLOCKED_SESSION_POLICY',
    value:null,mathematicalValue:0.111,reason:'SESSION_POLICY_NOT_COVERED'};
  p.rows[0].rv40YZ={...p.rows[0].rv40YZ,status:'BLOCKED_SESSION_POLICY',
    value:null,mathematicalValue:0.333,reason:'SESSION_POLICY_NOT_COVERED'};
  p.rows[0].cc.rv40={status:'EXPLORATORY_UNVERIFIED_SESSION_POLICY',value:0.199,reason:'SESSION_POLICY_NOT_VERIFIED'};
  p.rows[0].rv60YZ={...p.rows[0].rv60YZ,status:'UNAVAILABLE',
    value:null,mathematicalValue:null,reason:'MISSING_COMPLETED_SESSIONS'};
  attachYangZhangPages(c,[p]);
  const cc=c.rows[0];
  const cell=yangZhangCell(cc,20,'READY');
  assert.match(cell,/solo valore matematico/);
  assert.doesNotMatch(cell,/11\.10%/);
  assert.match(yangZhangCell(cc,60,'READY'),/MISSING_COMPLETED_SESSIONS/);
  assert.match(yangZhangCell(cc,40,'READY'),/solo valore matematico/);
  assert.doesNotMatch(yangZhangCell(cc,40,'READY'),/33\.30%/);
  assert.match(cc40Cell(cc,'READY'),/esplorativa, non confrontabile/);
  const detail=renderYangZhangDetail(cc,'READY');
  assert.match(detail,/non certificati/);
  const names=toCsv(c,null).trimEnd().split('\r\n');
  const cols=names[0].split(','),fields=names[1].split(',');
  const val=k=>fields[cols.indexOf(k)];
  assert.equal(val('rv20_yz'),'');
  assert.equal(val('rv20_yz_status'),'BLOCKED_SESSION_POLICY');
  assert.equal(val('rv20_yz_mathematical_diagnostic'),'0.111');
  assert.equal(val('rv60_yz'),'');
  assert.equal(val('rv40_yz'),'');
  assert.equal(val('rv40_yz_mathematical_diagnostic'),'0.333');
  assert.equal(val('rv40_cc'),'0.199');
  assert.equal(val('rv40_cc_status'),'EXPLORATORY_UNVERIFIED_SESSION_POLICY');
}
{
  const c=coverage(1),p=page(c,0);
  p.rows[0]={symbol:'T0',universePosition:0,readError:'CANDLE_READ_FAILED',rv20YZ:null,rv40YZ:null,rv60YZ:null,cc:null};
  attachYangZhangPages(c,[p]);
  assert.match(yangZhangCell(c.rows[0],20,'READY'),/candele non leggibili/);
  assert.match(cc40Cell(c.rows[0],'READY'),/candele non leggibili/);
}
{
  const c=coverage(1);
  c.yangZhang={status:'ERROR',readError:'YANG_ZHANG_PAGE_INCONSISTENT'};
  assert.match(renderYangZhangStatus(c),/non disponibili/);
  assert.match(yangZhangCell(c.rows[0],20,'ERROR'),/errore lettura/);
  assert.match(cc40Cell(c.rows[0],'ERROR'),/errore lettura/);
  const cols=toCsv(c,null).trimEnd().split('\r\n');
  const idx=cols[0].split(',').indexOf('yz_read_status');
  assert.equal(cols[1].split(',')[idx],'ERROR');
}


// Backend's existing price-basis :symbol GET exposes exact dates, deviations,
// dollar/bp size, and persisted dividend-evidence state. One manual click only,
// never a price update, never a provider fetch.
{
  const reason='OHLC_INCOMPATIBLE_WITH_YANG_ZHANG',c=coverage(1),p=page(c,0);
  const dateFrom={20:'2026-10-05',40:'2026-09-04',60:'2026-08-07'};
  for(const n of [20,40,60])
    p.rows[0]['rv'+n+'YZ']={...p.rows[0]['rv'+n+'YZ'],windowFrom:dateFrom[n]};
  for(const n of [40,60]){
    const w=p.rows[0]['rv'+n+'YZ'];
    p.rows[0]['rv'+n+'YZ']={...w,status:'UNAVAILABLE',value:null,mathematicalValue:null,
      reason,category:'INVALID_OHLC',blockedSessions:n===40?1:2,inputDigest:null};
  }
  attachYangZhangPages(c,[p]);
  const joined=c.rows[0];
  const session=(date,kind,extra={})=>({
    sessionDate:date,kind,yzStrictOhlcValid:false,source:'dxlink',
    ...extra
  });
  const small=session('2026-09-17','MINOR',{
    side:'CLOSE_BELOW_LOW',deviation:0.01,reference:148,relativeDeviation:0.01/148,
    dividendEvidence:null,finding:null
  });
  const material=session('2026-08-21','MATERIAL',{
    side:'CLOSE_BELOW_LOW',deviation:1.22,reference:144,relativeDeviation:1.22/144,
    dividendEvidence:'DIVIDEND_COMPATIBLE',
    finding:{status:'DIVIDEND_COMPATIBLE',amount:1.22,eventDate:'2026-08-21'}
  });
  const report={
    symbol:'T0',asOfSessionDate:DATE,version:'RV_PRICE_BASIS_DAILY_ONLY_DIAGNOSTIC_V1',
    readOnly:true,certified:false,changesPrices:false,readError:null,
    evidence:{dividendCheckpoint:{state:'COMPLETE'}},
    rv20:{windowFrom:dateFrom[20],windowThrough:DATE,
      yz:{status:joined.yangZhang.rv20YZ.status,reason:joined.yangZhang.rv20YZ.reason,
        inputDigest:joined.yangZhang.rv20YZ.inputDigest},sessions:[]},
    rv60:{windowFrom:dateFrom[60],windowThrough:DATE,
      yz:{status:joined.yangZhang.rv60YZ.status,reason:joined.yangZhang.rv60YZ.reason,
        inputDigest:joined.yangZhang.rv60YZ.inputDigest},sessions:[small,material]},
  };
  const reply={
    ok:true,readOnly:true,certified:false,changesPrices:false,notForTrading:true,
    version:'RV_PRICE_BASIS_DAILY_ONLY_DIAGNOSTIC_V1',
    asOfSessionDate:DATE,universe:{digest:DIGEST,count:1},report
  };
  assert.match(ohlcDiagnosticButton(joined,'READY'),/Analizza sedute OHLC e dividendi/);
  assert.equal(ohlcDiagnosticButton(joined,'LOADING'),'');
  assert.equal(ohlcDiagnosticButton({...joined,yangZhang:null},'READY'),'');
  const html=renderPriceBasisOhlcAudit(reply,c,joined);
  assert.match(html,/2026-08-21/);
  assert.match(html,/2026-09-17/);
  assert.match(html,/CLOSE_BELOW_LOW/);
  assert.match(html,/MATERIAL/);
  assert.match(html,/MINOR/);
  assert.match(html,/DIVIDEND_COMPATIBLE/);
  assert.match(html,/2 sedute anomale distinte/);
  assert.match(html,/RV20 0, RV40 1, RV60 2/);
  assert.match(html,/40\/60/);
  assert.match(html,/Nessuna correzione, acquisizione/);
  assert.doesNotMatch(html,/<script|onerror=|onload=/i);
  assert.ok(html.indexOf('2026-08-21')<html.indexOf('2026-09-17'));
  const structured=session('2026-09-19','STRUCTURAL',{
    structuralIssue:'NOT_POSITIVE_OR_NON_FINITE_PRICE'});
  const withStructural={...reply,report:{...report,rv60:{...report.rv60,
    sessions:[small,material,structured]}}};
  assert.match(renderPriceBasisOhlcAudit(withStructural,c,joined),
    /NOT_POSITIVE_OR_NON_FINITE_PRICE/);
  const bad=x=>throws(()=>renderPriceBasisOhlcAudit(x,c,joined),'PRICE_BASIS_DETAIL_INCONSISTENT');
  bad({...reply,readOnly:false});
  bad({...reply,changesPrices:true});
  bad({...reply,certified:true});
  bad({...reply,universe:{digest:'b'.repeat(64),count:1}});
  bad({...reply,universe:{digest:DIGEST,count:2}});
  bad({...reply,asOfSessionDate:'2026-11-03'});
  bad({...reply,version:'ANOTHER_VERSION'});
  bad({...reply,report:{...report,symbol:'T1'}});
  bad({...reply,report:{...report,readOnly:false}});
  bad({...reply,report:{...report,asOfSessionDate:'2026-11-03'}});
  bad({...reply,report:{...report,rv60:{...report.rv60,
    yz:{...report.rv60.yz,reason:'MISSING_COMPLETED_SESSIONS'}}}});
  bad({...reply,report:{...report,rv60:{...report.rv60,sessions:[
    small,material,{...structured,structuralIssue:'<svg onload=alert(1)>'}]}}});
  bad({...reply,report:{...report,rv60:{...report.rv60,sessions:[small,small]}}});
  bad({...reply,report:{...report,rv60:{...report.rv60,sessions:[
    {...small,sessionDate:'2027-12-01'},material]}}});
  bad({...reply,report:{...report,rv60:{...report.rv60,sessions:[
    {...small,side:'<svg onload=alert(1)>'},material]}}});
  bad({...reply,report:{...report,rv60:{...report.rv60,sessions:[
    {...small,yzStrictOhlcValid:true},material]}}});
  bad({...reply,report:{...report,rv60:{...report.rv60,sessions:[material]}}});
  const drift={...joined,yangZhang:{...joined.yangZhang,rv60YZ:{
    ...joined.yangZhang.rv60YZ,reason:'MISSING_COMPLETED_SESSIONS'}}};
  throws(()=>renderPriceBasisOhlcAudit(reply,c,drift),'PRICE_BASIS_DETAIL_INCONSISTENT');
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
const src=readFileSync(join(__dirname,'..','..','devtools','volatility-coverage-monitor.js'),'utf8');
assert.match(src,/const YZ_PATH = '\/debug\/volatility-carry\/rv-yang-zhang'/);
assert.match(src,/const RV40_DIAGNOSTIC_VERSION =/);
assert.match(src,/const PRICE_BASIS_PATH =/);
assert.match(src,/const PRICE_BASIS_VERSION =/);
assert.match(src,/if \(yzCurrent\) yzCurrent\.abort\(\)/);
assert.match(src,/if \(ohlcCurrent\) ohlcCurrent\.abort\(\)/);
assert.match(src,/detail\.addEventListener\('click', async event =>/);
assert.match(src,/fetchJson\(BACKEND\+PRICE_BASIS_PATH\+'\/'\+encodeURIComponent\(symbol\)/);
assert.doesNotMatch(src,/fetchJson\(BACKEND\+PRICE_BASIS_PATH\+'\/'\+encodeURIComponent\(symbol\)[^\n]*,\s*S\.backendKey,\s*controller\.signal,\s*\{/);
assert.match(src,/void loadYangZhang\(data\)/);
assert.match(src,/if \(detailCurrent\) detailCurrent\.abort\(\);\s*\/\/[^\n]*\n[\s\S]*?detailSnapshot = null;\s*const controller = new AbortController\(\);/,
  'changing selected symbol clears the earlier detail before the new request');
assert.match(src,/const html = renderDetail\(json,[\s\S]*?detailSnapshot = json;\s*detail\.innerHTML = html;/,
  'only a successfully rendered backend detail is retained for YZ refresh');
assert.match(src,/readOnly !== true/);
assert.doesNotMatch(src,/fetchJson\(BACKEND \+ YZ_PATH[^\n]*,\s*S\.backendKey,\s*signal,\s*\{/);
console.log('Volatility Coverage Yang-Zhang: atomic joins, CSV, detail, classification, network guard OK');
