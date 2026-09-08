// ═══════════════════════════════════════════════════════════════
// MULTI-LEG STRATEGY TEMPLATES
// Each template defines the leg skeleton. Null fields are filled by the user.
// ═══════════════════════════════════════════════════════════════
var STRATEGY_TEMPLATES = {
  SHORT_STRANGLE:   { label:'SHORT STRANGLE', legs:[
    {legLabel:'Short Call (OTM, upper strike)',          type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Put (OTM, lower strike)',           type:'PUT', side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  SHORT_STRADDLE:   { label:'SHORT STRADDLE', legs:[
    {legLabel:'Short Call (ATM)',                        type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Put (ATM)',                         type:'PUT', side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  LONG_STRANGLE:    { label:'LONG STRANGLE', legs:[
    {legLabel:'Long Call (OTM, upper strike)',           type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Put (OTM, lower strike)',            type:'PUT', side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  IRON_CONDOR:      { label:'IRON CONDOR', legs:[
    {legLabel:'Short Call (upper short strike)',         type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Call (upper wing, further OTM)',     type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Put (lower short strike)',          type:'PUT', side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Put (lower wing, further OTM)',      type:'PUT', side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  BULL_PUT_SPREAD:  { label:'BULL PUT SPREAD', legs:[
    {legLabel:'Short Put (higher strike, collects premium)', type:'PUT',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Put (lower strike, defines max loss)',    type:'PUT',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  BEAR_CALL_SPREAD: { label:'BEAR CALL SPREAD', legs:[
    {legLabel:'Short Call (lower strike, collects premium)', type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Call (higher strike, defines max loss)', type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  BEAR_PUT_SPREAD:  { label:'BEAR PUT SPREAD', legs:[
    {legLabel:'Long Put (higher strike, in-the-money wing)', type:'PUT',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Put (lower strike, caps max profit)',    type:'PUT',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  BULL_CALL_SPREAD: { label:'BULL CALL SPREAD', legs:[
    {legLabel:'Long Call (lower strike)',                     type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Call (higher strike, caps max profit)',  type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  VERTICAL_SPREAD:  { label:'VERTICAL SPREAD', legs:[
    {legLabel:'Long Call (lower strike)',                     type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Call (higher strike)',                   type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  PMCC:             { label:"POOR MAN'S COVERED CALL", legs:[
    {legLabel:'Long Call (LEAPS, lower strike, far expiry)',  type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Call (near-term, higher strike)',        type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  PMCP:             { label:"POOR MAN'S COVERED PUT", legs:[
    {legLabel:'Long Put (LEAPS, higher strike, far expiry)',  type:'PUT', side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Put (near-term, lower strike)',          type:'PUT', side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  LONG:             { label:'LONG (EQUITY)', legs:[
    {legLabel:'Long Equity position',                        type:'EQUITY',side:'LONG', qty:100,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  SHORT:            { label:'SHORT (EQUITY)', legs:[
    {legLabel:'Short Equity position',                       type:'EQUITY',side:'SHORT',qty:100,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  SHORT_PUT:        { label:'SHORT PUT', legs:[
    {legLabel:'Short Put',                                            type:'PUT', side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  LONG_PUT:         { label:'LONG PUT', legs:[
    {legLabel:'Long Put',                                             type:'PUT', side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  SHORT_CALL:       { label:'SHORT CALL', legs:[
    {legLabel:'Short Call',                                           type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  LONG_CALL:        { label:'LONG CALL', legs:[
    {legLabel:'Long Call',                                            type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  SHORT_CALL_RATIO_SPREAD: { label:'SHORT CALL RATIO SPREAD', legs:[
    {legLabel:'Long Call (lower strike)',                              type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Call (higher strike, 2x)',                       type:'CALL',side:'SHORT',qty:2,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  LONG_CALL_RATIO_SPREAD:  { label:'LONG CALL RATIO SPREAD', legs:[
    {legLabel:'Short Call (lower strike)',                             type:'CALL',side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Call (higher strike, 2x)',                        type:'CALL',side:'LONG', qty:2,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  SHORT_PUT_RATIO_SPREAD:  { label:'SHORT PUT RATIO SPREAD', legs:[
    {legLabel:'Short Put (lower strike, 2x)',                         type:'PUT', side:'SHORT',qty:2,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Long Put (higher strike)',                              type:'PUT', side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  LONG_PUT_RATIO_SPREAD:   { label:'LONG PUT RATIO SPREAD', legs:[
    {legLabel:'Long Put (lower strike, 2x)',                          type:'PUT', side:'LONG', qty:2,strike:null,expiry:null,entryPrice:null,streamerSymbol:null},
    {legLabel:'Short Put (higher strike)',                             type:'PUT', side:'SHORT',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
  CUSTOM:           { label:'CUSTOM', legs:[
    {legLabel:'Leg 1',                                       type:'CALL',side:'LONG', qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null}]},
};
