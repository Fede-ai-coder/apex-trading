'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = 'ade09125fa7d14a293643764bc04b235c067d30d';
const MODULE_REL = 'js/services/pretrade-risk-rules.js';
const TAG = '<script src="./js/services/pretrade-risk-rules.js"></script>\n';
const MANIFEST = [
  '_ptBias', '_ptTradeDelta', '_ptStructureCount', '_ptVolDeltaTolerance',
  '_ptNormalizeGreekPointsSigned', '_ptNormalizeGreekPointsAbs', '_ptNormalizeIvrPercent',
  '_ptGetIvrDeltaRange', '_ptGetVix3mDeltaRange', '_ptSelectConservativeVolDeltaRange',
  '_ptGetDeltaRangeForBias', '_ptWorstShortLegDelta', '_ptVolRange', 'runPreTradeRiskCheck',
];
const RESIDUAL = [
  '_closePreTradeRiskModal', '_showPreTradeRiskModal',
  '_fetchPretradeBackendCandles', 'ensurePreTradeTechnicals',
];
const EXPECTED_DECL_CHARS = 11406;

let pass = 0, fail = 0;
function ok(v, msg) { if (v) pass++; else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + (a === b ? '' : ' (expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a) + ')')); }
function same(a, b, msg) { eq(JSON.stringify(a), JSON.stringify(b), msg); }
function section(s) { console.log('\n' + s); }
function digest(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex'); }
function count(src, needle) { let n=0,p=0; while ((p=src.indexOf(needle,p))>=0) { n++; p += needle.length; } return n; }
function isIdent(c) { return !!c && /[A-Za-z0-9_$]/.test(c); }
function skipQuoted(src, i) {
  const q = src[i];
  for (let j=i+1; j<src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === q) return j;
  }
  return src.length - 1;
}
function matchBrace(src, open) {
  let depth = 0;
  for (let i=open; i<src.length; i++) {
    const c=src[i], n=src[i+1];
    if (c==='/' && n==='/') { i+=2; while (i<src.length && src[i] !== '\n') i++; continue; }
    if (c==='/' && n==='*') { i+=2; while (i<src.length && !(src[i]==='*' && src[i+1]==='/')) i++; i++; continue; }
    if (c==='"' || c==="'" || c==='`') { i=skipQuoted(src,i); continue; }
    if (c==='{') depth++;
    else if (c==='}') { depth--; if (depth===0) return i; }
  }
  return -1;
}
function findFunction(src, name) {
  for (const sig of ['function '+name+'(', 'async function '+name+'(']) {
    let p = src.indexOf(sig);
    while (p >= 0) {
      if (!isIdent(p ? src[p-1] : '')) {
        const open = src.indexOf('{', p), end = matchBrace(src, open);
        if (open < 0 || end < 0) return null;
        return { name, start:p, end:end+1, text:src.slice(p,end+1) };
      }
      p = src.indexOf(sig, p+1);
    }
  }
  return null;
}
function findVar(src, name) {
  const sig = 'var ' + name;
  let start = src.indexOf(sig);
  while (start >= 0 && isIdent(src[start-1])) start = src.indexOf(sig, start+1);
  if (start < 0) return null;
  let pa=0, br=0, sq=0;
  for (let i=start; i<src.length; i++) {
    const c=src[i], n=src[i+1];
    if (c==='/' && n==='/') { i+=2; while (i<src.length && src[i] !== '\n') i++; continue; }
    if (c==='/' && n==='*') { i+=2; while (i<src.length && !(src[i]==='*' && src[i+1]==='/')) i++; i++; continue; }
    if (c==='"' || c==="'" || c==='`') { i=skipQuoted(src,i); continue; }
    if (c==='(') pa++; else if (c===')') pa--;
    else if (c==='{') br++; else if (c==='}') br--;
    else if (c==='[') sq++; else if (c===']') sq--;
    else if (c===';' && pa===0 && br===0 && sq===0) return { name, start, end:i+1, text:src.slice(start,i+1) };
  }
  return null;
}
function decl(src, name) { return name === '_ptVolDeltaTolerance' ? findVar(src,name) : findFunction(src,name); }
function topLevelNames(src) {
  const out=[], re=/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:var|const|let)\s+([A-Za-z_$][\w$]*)/gm;
  let m; while ((m=re.exec(src))) out.push(m[1]||m[2]);
  return out;
}
function transformFromBase(base) {
  const ds=MANIFEST.map(n=>decl(base,n));
  if (ds.some(d=>!d)) throw new Error('missing base target');
  const start=ds[0].start, end=ds[ds.length-1].end;
  const module=base.slice(start,end);
  const scriptOpen=base.lastIndexOf('<script',start);
  const without=base.slice(0,start)+base.slice(end);
  return { module, index:without.slice(0,scriptOpen)+TAG+without.slice(scriptOpen), start, end, scriptOpen };
}
function clone(v) { return JSON.parse(JSON.stringify(v)); }

const FIXED_NOW = Date.UTC(2026,7,18,12,0,0);
function runOutcome(src, f) {
  class FixedDate extends Date {
    constructor(...a) { super(...(a.length ? a : [FIXED_NOW])); }
    static now() { return FIXED_NOW; }
  }
  FixedDate.UTC = Date.UTC; FixedDate.parse = Date.parse;
  const sandbox = {
    console, Math, Number, Boolean, Array, Object, JSON, isFinite, isNaN, parseFloat, parseInt,
    Date: FixedDate,
    S: { greeksCache: clone(f.greeks || {}) },
    buildStreamerSymbol: (ticker, expiry, strike, cp) => [ticker,expiry,strike,cp].join('|'),
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  try {
    vm.runInContext(src + '\n;globalThis.__run = runPreTradeRiskCheck;', sandbox);
    const value = sandbox.__run(f.ticker, clone(f.legs), clone(f.snapshot));
    return { ok:true, value:clone(value) };
  } catch (e) {
    return { ok:false, name:e && e.name, message:e && e.message };
  }
}

const base = execFileSync('git',['show',BASE_SHA+':index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
// THE DOCUMENT THIS CONTRACT PINS is index.html as PR #382 left it. TWO further
// PRETRADE extractions have since been cut against it — PR #383 (technicals) and
// PRETRADE PR3 (the risk modal) — so they are undone NEWEST FIRST, restoring the
// exact post-#382 index that every offset, hash and ratchet below addresses.
// Each helper re-verifies the document it hands back by length and SHA-256, so
// the reconstruction is proved at every hop, not assumed, and this contract
// keeps checking the same invariants byte-for-byte.
const PRETRADE_PR3 = require('./lib/pretrade-pr3-undo.js');
const PRETRADE_PR2 = require('./lib/pretrade-pr2-undo.js');
const liveIndex = fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const at383 = PRETRADE_PR3.isApplied(liveIndex)
  ? PRETRADE_PR3.undoPretradePr3(liveIndex, fs.readFileSync(path.join(ROOT,'js/ui/pretrade-risk-modal.js'),'utf8'))
  : liveIndex;
const index = PRETRADE_PR2.isApplied(at383)
  ? PRETRADE_PR2.undoPretradePr2(at383, fs.readFileSync(path.join(ROOT,'js/services/pretrade-technicals.js'),'utf8'))
  : at383;
const moduleSrc = fs.readFileSync(path.join(ROOT,MODULE_REL),'utf8');
const expected = transformFromBase(base);

section('1. manifest, ownership and byte identity');
eq(topLevelNames(moduleSrc).length, MANIFEST.length, 'owner declares exactly 14 top-level bindings');
same(topLevelNames(moduleSrc), MANIFEST, 'owner top-level declaration order is exactly the manifest — foreign declarations cannot hide');
let sum=0;
for (const name of MANIFEST) {
  const b=decl(base,name), m=decl(moduleSrc,name), i=decl(index,name);
  ok(!!b, name+' exists at base');
  ok(!!m, name+' exists in owner');
  ok(!i, name+' absent inline');
  if (b && m) { eq(m.text,b.text,name+' declaration byte-identical'); sum += m.text.length; }
}
eq(sum, EXPECTED_DECL_CHARS, 'declaration chars are exactly 11,406');
eq(moduleSrc, expected.module, 'whole owner is exact contiguous source slice from base');

section('2. residual and ratchet');
for (const name of RESIDUAL) {
  const b=decl(base,name), i=decl(index,name), m=decl(moduleSrc,name);
  ok(!!i, name+' remains inline');
  ok(!m, name+' is not pulled into owner');
  if (b && i) eq(i.text,b.text,name+' remains byte-identical');
}
eq(MANIFEST.filter(n=>!!decl(index,n)).length,0,'moved inline residue is zero');
eq(RESIDUAL.filter(n=>!!decl(index,n)).length,4,'PRETRADE ratchet is 18 -> 4, not terminal');

section('3. mechanical transform, load slot and round trip');
eq(index, expected.index, 'index equals mechanical base transform only');
eq(count(index,TAG),1,'script tag occurs exactly once');
const tagAt=index.indexOf(TAG);
const inlineOpen=index.indexOf('<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION',tagAt);
ok(tagAt >= 0 && inlineOpen === tagAt + TAG.length, 'PRETRADE owner is immediately before the inline monolith');
eq(index.slice(tagAt,tagAt+TAG.length),TAG,'load tag is exact classic src-only form');
let rebuilt=index.slice(0,tagAt)+index.slice(tagAt+TAG.length);
rebuilt=rebuilt.slice(0,expected.start)+moduleSrc+rebuilt.slice(expected.start);
eq(rebuilt,base,'byte-exact undo reconstructs pinned base');
eq(digest(rebuilt),digest(base),'round-trip SHA-256 matches pinned base content');

section('4. completed-family ratchets remain terminal');
const terminalModules=[
  'js/adapters/backend-directional-snapshot-adapter.js','js/services/backend-directional-snapshot-service.js','js/ui/backend-directional-snapshot-panel.js',
  'js/services/sfs-config-state.js','js/services/sfs-scan-service.js','js/ui/sfs-panel.js',
  'js/services/pess-config-rules.js','js/services/pess-live-transport.js','js/ui/pess-batch-panel.js','js/ui/pess-panel.js',
  'js/services/eic-screening-rules.js','js/services/eic-decision-rules.js','js/ui/eic-panel.js','js/ui/eic-ticker-analysis-panel.js','js/ui/eic-live-deep-dive.js'
];
const terminalNames=[];
for (const rel of terminalModules) {
  for (const n of topLevelNames(fs.readFileSync(path.join(ROOT,rel),'utf8'))) {
    if (n !== 'apexDebugBackendDirectionalAdapter') terminalNames.push(n);
  }
}
for (const n of terminalNames) ok(!decl(index,n),'completed-family binding remains external: '+n);

section('5. real BASE-vs-HEAD behavioral parity');
const fixtures=[
  { name:'unavailable indicators', ticker:'SPY', legs:[], greeks:{}, snapshot:{indicatorSource:'UNAVAILABLE'} },
  { name:'bullish short put in range', ticker:'AAPL', legs:[{type:'PUT',side:'SHORT',qty:1,streamerSymbol:'P1'}],
    greeks:{P1:{delta:-0.12,cachedAt:'2026-08-18T11:00:00.000Z'}},
    snapshot:{indicatorSource:'DXLINK',tech1d:{rsi14:62,sma20:210,sma30:200,distFromSma20:2,relStrengthVsSpy:1},ivr:25,ivrSource:'TASTYTRADE',vix3m:18} },
  { name:'bearish short call', ticker:'QQQ', legs:[{type:'CALL',side:'SHORT',qty:1,streamerSymbol:'C1'}],
    greeks:{C1:{delta:0.18,cachedAt:'2026-08-18T11:00:00.000Z'}},
    snapshot:{indicatorSource:'DXLINK',tech1d:{rsi14:38,sma20:480,sma30:490,distFromSma20:-2,relStrengthVsSpy:-1},ivr:70,ivrSource:'TASTYTRADE',vix3m:30} },
  { name:'wrong direction red', ticker:'MSFT', legs:[{type:'CALL',side:'SHORT',qty:1,streamerSymbol:'C2'}],
    greeks:{C2:{delta:0.20,cachedAt:'2026-08-18T11:00:00.000Z'}},
    snapshot:{indicatorSource:'DXLINK',tech1d:{rsi14:65,sma20:520,sma30:500,distFromSma20:3,relStrengthVsSpy:1},ivr:45,ivrSource:'TASTYTRADE',vix3m:19} },
  { name:'stale option Greeks', ticker:'NVDA', legs:[{type:'PUT',side:'SHORT',qty:1,streamerSymbol:'P2'}],
    greeks:{P2:{delta:-0.10,cachedAt:'2026-08-15T11:00:00.000Z'}},
    snapshot:{indicatorSource:'DXLINK',tech1d:{rsi14:60,sma20:180,sma30:170,distFromSma20:2,relStrengthVsSpy:1},ivr:30,ivrSource:'TASTYTRADE',vix3m:17} },
  { name:'equity only', ticker:'SPY', legs:[{type:'EQUITY',side:'LONG',qty:5}], greeks:{},
    snapshot:{indicatorSource:'DXLINK',tech1d:{rsi14:50,sma20:650,sma30:650,distFromSma20:0,relStrengthVsSpy:0}} },
];
const outcomes=[];
for (const f of fixtures) {
  const b=runOutcome(expected.module,f), h=runOutcome(moduleSrc,f);
  ok(b.ok && h.ok,'fixture settles without harness error: '+f.name);
  same(h,b,'BASE-vs-HEAD transcript parity: '+f.name);
  if (h.ok) outcomes.push(h.value);
}
ok(outcomes.some(x=>x.status==='RED'),'parity corpus reaches RED');
ok(outcomes.some(x=>x.status==='WARNING'),'parity corpus reaches WARNING');
ok(outcomes.some(x=>x.status==='OK'),'parity corpus reaches OK');
ok(outcomes.some(x=>x.inputs && x.inputs.estimatedTradeDelta != null),'parity corpus reaches real Greeks/equity delta computation');
ok(outcomes.some(x=>x.inputs && x.inputs.worstShortLegDelta != null),'parity corpus reaches short-leg volatility check');

section('6. independent guard model + genuine mutants');
function ownerViolations(layout) {
  const v=[], names=topLevelNames(layout.module);
  if (JSON.stringify(names)!==JSON.stringify(MANIFEST)) v.push('OWNER_MANIFEST');
  for (const n of MANIFEST) {
    const m=decl(layout.module,n), b=decl(base,n);
    if (!m) v.push('OWNER_MISSING:'+n);
    else if (!b || m.text!==b.text) v.push('OWNER_BODY:'+n);
    if (decl(layout.index,n)) v.push('INLINE_DUPLICATE:'+n);
  }
  for (const n of RESIDUAL) {
    const i=decl(layout.index,n), b=decl(base,n);
    if (!i) v.push('RESIDUAL_MISSING:'+n);
    else if (!b || i.text!==b.text) v.push('RESIDUAL_BODY:'+n);
    if (decl(layout.module,n)) v.push('RESIDUAL_IN_OWNER:'+n);
  }
  return v;
}
function loadViolations(layout) {
  const v=[];
  if (count(layout.index,TAG)!==1) v.push('LOAD_TAG_COUNT');
  const at=layout.index.indexOf(TAG);
  const open=layout.index.indexOf('<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION');
  if (at<0 || open !== at+TAG.length) v.push('LOAD_SLOT');
  return v;
}
function terminalViolations(layout) {
  const v=[];
  for (const n of terminalNames) if (decl(layout.index,n)) { v.push('TERMINAL_REOPENED:'+n); break; }
  return v;
}
function roundTripViolations(layout) {
  const at=layout.index.indexOf(TAG);
  if (at<0 || count(layout.index,TAG)!==1) return ['ROUNDTRIP_TAG'];
  let r=layout.index.slice(0,at)+layout.index.slice(at+TAG.length);
  r=r.slice(0,expected.start)+layout.module+r.slice(expected.start);
  return r===base ? [] : ['ROUNDTRIP_IDENTITY'];
}
const healthy={module:moduleSrc,index};
for (const [n,g] of [['owner',ownerViolations],['load',loadViolations],['terminal',terminalViolations],['roundtrip',roundTripViolations]]) {
  same(g(healthy),[],n+' guard is clean on healthy repository');
}
const d0=decl(moduleSrc,MANIFEST[0]), d1=decl(moduleSrc,MANIFEST[1]), r0=decl(index,RESIDUAL[0]);
const mutants=[
  ['missing owner declaration','owner',{module:moduleSrc.replace(d0.text,''),index}],
  ['duplicate moved binding inline','owner',{module:moduleSrc,index:index+'\n'+d1.text}],
  ['move residual into owner','owner',{module:moduleSrc+'\n'+r0.text,index:index.replace(r0.text,'')}],
  ['delete residual inline','owner',{module:moduleSrc,index:index.replace(r0.text,'')}],
  ['reorder declarations','owner',{module:moduleSrc.slice(0,d0.start)+d1.text+moduleSrc.slice(d0.end,d1.start)+d0.text+moduleSrc.slice(d1.end),index}],
  ['mutate declaration body','owner',{module:moduleSrc.replace('return Math.max(1, minQty || 1);','return Math.max(2, minQty || 1);'),index}],
  ['add foreign top-level declaration','owner',{module:moduleSrc+'\nfunction foreignPretradeMutation(){}',index}],
  ['wrong script path','load',{module:moduleSrc,index:index.replace('./js/services/pretrade-risk-rules.js','./js/services/pretrade-risk-rulez.js')}],
  ['remove script tag','load',{module:moduleSrc,index:index.replace(TAG,'')}],
  ['duplicate script tag','load',{module:moduleSrc,index:index.replace(TAG,TAG+TAG)}],
  ['move script after monolith','load',{module:moduleSrc,index:index.replace(TAG,'').replace('</body>',TAG+'</body>')}],
  ['reopen terminal family','terminal',{module:moduleSrc,index:index+'\n'+decl(fs.readFileSync(path.join(ROOT,'js/services/eic-decision-rules.js'),'utf8'),'computeFinalDecision').text}],
  ['equal-length module byte mutation','roundtrip',{module:moduleSrc.replace('var _ptVolDeltaTolerance = 8;','var _ptVolDeltaTolerance = 9;'),index}],
  ['index byte drift outside slice','roundtrip',{module:moduleSrc,index:index.replace('<!-- deploy: 2026-04-23 -->','<!-- deploy: 2026-04-24 -->')}],
];
const guards={owner:ownerViolations,load:loadViolations,terminal:terminalViolations,roundtrip:roundTripViolations};
let killed=0, inert=0, harness=0;
for (const [name,guardName,layout] of mutants) {
  if (layout.module===healthy.module && layout.index===healthy.index) { inert++; console.log('  INERT '+name); continue; }
  try {
    const v=guards[guardName](layout);
    if (v.length) killed++; else console.log('  SURVIVOR '+name);
  } catch (e) { harness++; console.log('  HARNESS '+name+': '+e.message); }
}
eq(inert,0,'no inert mutants');
eq(harness,0,'no mutation harness errors');
eq(killed,mutants.length,'all '+mutants.length+' genuine mutants killed by their intended guard');

section('7. production scope');
const changed=execFileSync('git',['diff','--name-only',BASE_SHA,'HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
// The diff is measured from the PRE-#382 base, so it spans ALL THREE stacked
// PRETRADE extractions: this PR's owner, the technicals owner PR #383 added on
// top, and the risk-modal owner that closed the family.
// The list stays EXACT and named — an unplanned production file still fails.
const TECHNICALS_REL='js/services/pretrade-technicals.js';
const MODAL_REL='js/ui/pretrade-risk-modal.js';
const allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL];
const changedProduction=changed.filter(p=>p==='index.html'||p.startsWith('js/')).sort();
same(changedProduction,allowedProduction.slice().sort(),'production footprint is exactly index.html + all three stacked PRETRADE owners');
ok(!changed.some(p=>p.startsWith('.github/')||p.startsWith('scripts/')),'no bootstrap workflow/script remains in final tree');

console.log('\nPRETRADE boundary contract: '+pass+' passed, '+fail+' failed; mutants '+killed+'/'+mutants.length);
if (fail) process.exit(1);
