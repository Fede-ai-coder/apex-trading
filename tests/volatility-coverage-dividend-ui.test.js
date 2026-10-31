'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ui=require('../devtools/volatility-coverage-monitor.js');

const statuses={DIVIDEND_COMPATIBLE:0,INVALID_DATA:0,UNRESOLVED:0,
  IN_RANGE_UNDETERMINED:0,NO_EVENT:0,VALID_OHLC:0};
function audit(overrides={}){
  return {state:'COMPLETE',evidenceDate:'2026-10-31',completedDay:'2026-10-31',total:0,
    counts:{...statuses},readOnly:true,rvCertified:false,mayValidateRv:false,changesPrices:false,...overrides};
}
function row(symbol,index,auditValue){
  const rv=(n)=>({value:null,basis:null,closesRequired:n+1,coverage:null,
    certified:{status:'UNAVAILABLE',reasons:['RV'+n+'_NOT_FINAL'],validatedSessions:0},stored:null,lastCertified:null});
  return {symbol,universePosition:index,status:'UNAVAILABLE',primaryReason:null,reasons:[],
    ivRef:{value:null,status:'NOT_IN_PILOT',reason:'NOT_IN_IV_PILOT',source:'TASTYTRADE_SELECTED_REGULAR_EXPIRY_IV',
      censusState:'NOT_READ',pilotMember:false},
    rv20:rv(20),rv60:rv(60),spreads:{
      ivMinusRv20Pp:{valuePp:null,basis:null,missing:[]},
      ivMinusRv60Pp:{valuePp:null,basis:null,missing:[]}},
    asOf:{rvSessionDate:'2026-10-30',ivAsOfDate:null,datesDiffer:false},
    candleQuality:{issues:false,storedCandles:0,structurallyValidCandles:0,excludedRows:0,excludedByReason:{},duplicateSessions:0},
    errors:{},evidence:{available:false,error:null},historicalCertified:{state:'NOT_READ'},
    ...(auditValue===undefined?{}:{dividendAudit:auditValue})};
}
const reported=[
  row('PGR',0,audit({total:2,counts:{...statuses,DIVIDEND_COMPATIBLE:2}})),
  row('PARA',1,audit({total:1,counts:{...statuses,INVALID_DATA:1}})),
  row('XLB',2,audit({total:1,counts:{...statuses,UNRESOLVED:1}})),
  row('SPY',3,audit()),
];
function dataset(rows=reported,sourceState='COMPLETE'){
  return {rows,sources:{dividendAudit:{state:sourceState,evidenceDate:'2026-10-31',
    completedDay:sourceState==='COMPLETE'?'2026-10-31':null,evidenceCount:361}},
    universe:{source:'test',count:rows.length,digest:'a'.repeat(64)},
    asOfSessionDate:'2026-10-30',ivAsOfDate:'2026-10-31',
    generatedFrom:'2026-10-31T12:00:00Z',generatedTo:'2026-10-31T12:05:00Z',
    pageGeneratedAt:Object.fromEntries(rows.map(r=>[r.symbol,'2026-10-31T12:00:00Z'])),
    atomic:false,warnings:[]};
}
test('advisory audit row states and summary do not alter IV/RV or imply certification',()=>{
  const a=ui.dividendAuditOf(reported[0]);
  assert.equal(a.state,'COMPLETE');
  assert.equal(a.total,2);
  assert.equal(a.counts.DIVIDEND_COMPATIBLE,2);
  assert.match(ui.dividendAuditCell(reported[1]),/da verificare 1/);
  assert.match(ui.dividendAuditCell(reported[2]),/da verificare 1/);
  assert.match(ui.dividendAuditCell(reported[3]),/0.*rilievi/);
  const sum=ui.dividendAuditSummary(dataset());
  assert.match(sum,/361 rilievi nello storico audit complessivo/);
  assert.match(sum,/compatibili.*2/);
  assert.match(sum,/da approfondire.*2/);
  assert.match(sum,/NON significa data ex-dividendo verificata/);
  assert.match(ui.renderTable(reported,{key:'position',dir:'asc'},{}),/Audit dividendi/);
  assert.match(ui.renderTable([],null,{}),/colspan="14"/);
  assert.equal(ui.summarize(reported).ivRef,0);
  assert.equal(ui.summarize(reported).complete,0);
});
test('missing, disabled, error, partial evidence never turns into an inferred zero',()=>{
  for(const x of [undefined,audit({state:'NOT_RECORDED',total:null,counts:null}),
    audit({state:'DISABLED',total:null,counts:null}),
    audit({state:'ERROR',total:null,counts:null}),
    audit({state:'COMPLETE',total:9,counts:null})]){
    const r=row('PGR',0,x);
    assert.equal(ui.dividendAuditOf(r).total,null);
    assert.match(ui.dividendAuditCell(r),/—/);
    assert.equal(ui.filterRows([r],{dividend:'NO_FINDINGS'}).length,0);
    assert.equal(ui.filterRows([r],{dividend:'UNAVAILABLE'}).length,1);
  }
  const partial=row('SPY',0,audit({state:'IN_PROGRESS'}));
  assert.equal(ui.dividendAuditOf(partial).total,0);
  assert.match(ui.dividendAuditCell(partial),/finora/);
  assert.equal(ui.filterRows([partial],{dividend:'NO_FINDINGS'}).length,0);
  assert.equal(ui.filterRows([partial],{dividend:'UNAVAILABLE'}).length,1);
  assert.match(ui.dividendAuditSummary(dataset([partial],'IN_PROGRESS')),/Audit incompleto/);
  assert.match(ui.dividendAuditSummary(dataset([row('SPY',0)],'NOT_RECORDED')),/nessun conteggio dedotto/);
});
test('new filters are diagnostic only and independent of trading status',()=>{
  assert.deepEqual(ui.filterRows(reported,{dividend:'REVIEW'}).map(r=>r.symbol),['PARA','XLB']);
  assert.deepEqual(ui.filterRows(reported,{dividend:'COMPATIBLE'}).map(r=>r.symbol),['PGR']);
  assert.deepEqual(ui.filterRows(reported,{dividend:'NO_FINDINGS'}).map(r=>r.symbol),['SPY']);
  assert.deepEqual(ui.filterRows(reported,{dividend:'FINDINGS'}).map(r=>r.symbol),['PGR','PARA','XLB']);
  assert.equal(ui.filterRows(reported,{dividend:'NOT_A_FILTER'}).length,0);
  for(const r of reported) assert.equal(r.status,'UNAVAILABLE');
});
test('CSV retains original RV/IV fields and exports exact audit status and counts',()=>{
  const csv=ui.toCsv(dataset(),{});
  const lines=csv.trim().split(/\r?\n/),header=lines[0].split(',');
  const col=name=>header.indexOf(name);
  assert.ok(col('iv_ref')>=0);
  assert.ok(col('rv20')>=0);
  assert.ok(col('iv_minus_rv60_pp')>=0);
  assert.ok(col('dividend_audit_state')>=0);
  assert.ok(col('dividend_compatible')>=0);
  assert.ok(col('dividend_invalid_data')>=0);
  assert.ok(col('dividend_unresolved')>=0);
  const pgr=lines[1].split(','),para=lines[2].split(','),xlb=lines[3].split(',');
  assert.equal(pgr[col('dividend_audit_total')],'2');
  assert.equal(pgr[col('dividend_compatible')],'2');
  assert.equal(para[col('dividend_invalid_data')],'1');
  assert.equal(xlb[col('dividend_unresolved')],'1');
  assert.equal(pgr[col('iv_ref')],'');
  assert.equal(pgr[col('rv20')],'');
  assert.equal(pgr[col('iv_minus_rv60_pp')],'');
  assert.match(ui.toCsv(dataset([row('SPY',0)],'NOT_RECORDED'),{}),/dividend_audit_state/);
});
test('detail shows provider date semantics, bounds findings and escapes adversarial text',()=>{
  const detail={
    sources:{dividendAudit:{state:'COMPLETE'}},
    dividendAudit:{...audit({total:1,counts:{...statuses,DIVIDEND_COMPATIBLE:1}}),
      findings:[{timestamp:'2026-10-30T00:00:00Z',status:'DIVIDEND_COMPATIBLE',
        eventDate:'2026-10-31',amount:1.73,reason:'<img src=x onerror=alert(1)>',
        dateSemantics:'PROVIDER_OCCURRED_DATE_EX_DATE_UNVERIFIED'}],
      findingsTruncated:false},
  };
  const html=ui.renderDividendDetail(detail);
  assert.match(html,/importo 1.73/);
  assert.match(html,/PROVIDER_OCCURRED_DATE_EX_DATE_UNVERIFIED/);
  assert.match(html,/NON è verificata/);
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
  const old=ui.renderDividendDetail({sources:{}});
  assert.match(old,/Conteggi non disponibili/);
  assert.doesNotMatch(old,/0 rilievi/);
  const partial=ui.renderDividendDetail({dividendAudit:audit({state:'IN_PROGRESS'})});
  assert.match(partial,/Storico non attestato come completo/);
});
test('API page and detail of old backend still validate; additive data does not change core responses',()=>{
  const r=row('AAPL',0);
  const page={ok:true,version:'VOLATILITY_COVERAGE_V1',readOnly:true,notForTrading:true,
    executionAuthorized:false,universe:{count:1,digest:'a'.repeat(64)},
    offset:0,limit:25,rows:[r],returned:1,nextOffset:null,
    asOfSessionDate:'2026-10-30',ivAsOfDate:'2026-10-31'};
  assert.equal(ui.checkPage(page,0),page);
  const updated=structuredClone(page);
  updated.rows[0].dividendAudit=audit();
  updated.sources={dividendAudit:{state:'COMPLETE',evidenceCount:361}};
  assert.equal(ui.checkPage(updated,0),updated);
  assert.deepEqual(ui.filterRows(page.rows,{}),page.rows);
});

test('cross-page audit source changes are never presented as fully reconciled totals',()=>{
  const data=dataset();
  data.warnings=['SOURCES_CHANGED_DURING_READ'];
  const html=ui.dividendAuditSummary(data);
  assert.match(html,/Audit incompleto o non uniforme/);
  assert.match(html,/parziali/);
  assert.match(html,/NON significa data ex-dividendo verificata/);
});
