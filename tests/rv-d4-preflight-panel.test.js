const test = require('node:test');
const assert = require('node:assert/strict');
const {renderD4Preflight} = require('../devtools/rv-pilot-audit.js');
const make = () => ({
  ok:true, readOnly:true, executionAuthorized:false, liveAcquisitionsStarted:false,
  version:'RV_D4_PROVIDER_PREFLIGHT_V1',
  decision:'NO_GO_UNTIL_PROVIDER_AND_EVIDENCE_GATES_VERIFIED',
  blockers:['ACCOUNT_WIDE_DXLINK_SESSION_BUDGET_UNVERIFIED'],
  providerBudget:{sessionsLimitVerified:false,entitlementVerified:false,quoteTokenRequestBudgetVerified:false},
  symbols:['AAPL','SPY'].map(symbol=>({symbol,rv20:{status:'UNAVAILABLE'},
    rv60:{status:'UNAVAILABLE'},pendingSessionEvidence:{rv20:[],rv60:[]}}))
});
test('renders NO-GO for AAPL and SPY',()=>{
  const html=renderD4Preflight(make());
  assert.match(html,/NO-GO/);
  assert.match(html,/AAPL/);
  assert.match(html,/SPY/);
});
test('rejects unsafe or incomplete responses',()=>{
  for(const change of [
    d=>{d.executionAuthorized=true},
    d=>{d.symbols.pop()},
    d=>{d.providerBudget.sessionsLimitVerified=true},
    d=>{d.readOnly=false}
  ]){
    const d=make();change(d);
    assert.throws(()=>renderD4Preflight(d),/D4_PREFLIGHT_INVALID_OR_UNSAFE_RESPONSE/);
  }
});
