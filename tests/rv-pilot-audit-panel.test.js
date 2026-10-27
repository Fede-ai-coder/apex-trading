'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const {
  devContext, combinePages, classifyRow, summarizeRows, renderTable,
} = require('../js/ui/rv-pilot-audit.js');
const hash = 'a'.repeat(64);
const rows = Array.from({length:20}, (_,i)=>({
  symbol:'T'+String(i).padStart(2,'0'),
  sessionKindPolicy:{covered:false,basis:'POLICY_SYMBOL_NOT_COVERED'},
  corporateActions:{status:'NOT_PROVIDED'},
  rv20:{status:'UNAVAILABLE',value:null,reasons:['RV20_NOT_FINAL'],blockers:{},
    validatedSessions:0,closesRequired:21,priceAdjustment:null},
  rv60:{status:'UNAVAILABLE',value:null,reasons:['RV60_NOT_FINAL'],blockers:{},
    validatedSessions:0,closesRequired:61,priceAdjustment:null},
  evidence:{independentStandardAcquisitions:0}
}));
const pages=()=>Array.from({length:4},(_,i)=>({
  ok:true,readOnly:true,memberSource:'iv_pilot_members',memberCount:20,
  membershipHash:hash,offset:i*5,limit:5,returned:5,rows:rows.slice(i*5,i*5+5)
}));
test('only DEV hosts with the pinned DEV backend activate the panel',()=>{
  const dev='https://apex-tastytrade-backend-dev-production.up.railway.app';
  const prod='https://apex-tastytrade-backend-production.up.railway.app';
  assert.equal(devContext('localhost',dev),true);
  assert.equal(devContext('dev-clean--spontaneous-queijadas-118823.netlify.app',dev),true);
  assert.equal(devContext('deploy-preview-101--spontaneous-queijadas-118823.netlify.app',dev),true);
  assert.equal(devContext('spontaneous-queijadas-118823.netlify.app',dev),false);
  assert.equal(devContext('localhost',prod),false);
  assert.equal(devContext('evil.example.com',dev),false);
});
test('four immutable paginated members combine without fetching or synthesizing prices',()=>{
  const out=combinePages(pages());
  assert.equal(out.membershipHash,hash);
  assert.equal(out.rows.length,20);
  assert.deepEqual(out.rows.map(x=>x.symbol),rows.map(x=>x.symbol));
  assert.equal(summarizeRows(out.rows).policyBlocked,20);
  assert.equal(summarizeRows(out.rows).rv20Available,0);
});
test('membership drift across pages is a hard error, not a partial table',()=>{
  const p=pages();p[2].membershipHash='b'.repeat(64);
  assert.throws(()=>combinePages(p),/INCONSISTENT_PAGE/);
});
test('truncated/missing/repeated/out of order pages fail closed',()=>{
  const missing=pages();missing.pop();
  assert.throws(()=>combinePages(missing),/FOUR_PAGES/);
  const repeated=pages();repeated[1].rows=[...repeated[0].rows];
  assert.throws(()=>combinePages(repeated),/INCONSISTENT_ROW/);
  const order=pages();order[0].rows=[...order[0].rows].reverse();
  assert.throws(()=>combinePages(order),/MEMBERSHIP_ORDER_INVALID/);
});
test('policy is independent of finality and corporate adjustment blockers',()=>{
  const sample={...rows[0],sessionKindPolicy:{covered:true,basis:'DOCUMENTED_POLICY'},
    rv20:{status:'AVAILABLE',value:0.12,reasons:[],blockers:{},priceAdjustment:'UNVERIFIED_NO_JUMP_DETECTED'},
    rv60:{status:'UNAVAILABLE',value:null,reasons:['RV60_SPLIT_UNVERIFIED'],
      blockers:{NO_STORED_CANDLE:1},priceAdjustment:'SUSPECT_JUMP'}};
  const r=classifyRow(sample);
  assert.equal(r.policyEligible,true);
  assert.equal(r.rv20Available,true);
  assert.equal(r.rv60Available,false);
  assert.equal(r.noCandle,true);
  assert.equal(r.adjustmentBlocked,true);
  assert.ok(r.reasons.includes('NO_STORED_CANDLE'));
  assert.equal(summarizeRows([sample]).rv20Available,1);
});
test('HTML escapes arbitrary provider text; no keys or session tokens appear',()=>{
  const malicious={...rows[0],rv20:{...rows[0].rv20,reasons:['<img src=x onerror=alert(1)>']}};
  const html=renderTable({membershipHash:hash,rows:[malicious]});
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('x-api-key'));
});
test('new panel wiring is an opt-in DEV script with no index.html mutation',()=>{
  const fs=require('node:fs');
  const config=fs.readFileSync(require('node:path').join(__dirname,'../js/config/backend-config.js'),'utf8');
  assert.match(config,/BACKEND === DEV_BACKEND/);
  assert.match(config,/\.\/js\/ui\/rv-pilot-audit\.js/);
  assert.match(config,/typeof document !== 'undefined'/);
  assert.ok(!config.includes('ttCall('));
});
