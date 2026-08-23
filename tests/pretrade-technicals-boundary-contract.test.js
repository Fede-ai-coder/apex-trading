'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = 'ecb4b155b9ebe9841cbe807c6493ac269d922bc8';
const MODULE_REL = 'js/services/pretrade-technicals.js';
const RULES_REL = 'js/services/pretrade-risk-rules.js';
const RULES_TAG = '<script src="./js/services/pretrade-risk-rules.js"></script>\n';
const TAG = '<script src="./js/services/pretrade-technicals.js"></script>\n';
const MANIFEST = ['_fetchPretradeBackendCandles', 'ensurePreTradeTechnicals'];
const RESIDUAL = ['_closePreTradeRiskModal', '_showPreTradeRiskModal'];
const EXPECTED_DECL_CHARS = 8387;

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
  let depth=0;
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
  for (const sig of ['async function '+name+'(', 'function '+name+'(']) {
    let p=src.indexOf(sig);
    while (p>=0) {
      if (!isIdent(p ? src[p-1] : '')) {
        const open=src.indexOf('{',p), end=matchBrace(src,open);
        if (open<0 || end<0) return null;
        return {name,start:p,end:end+1,text:src.slice(p,end+1)};
      }
      p=src.indexOf(sig,p+1);
    }
  }
  return null;
}
function topLevelNames(src) {
  const out=[], re=/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m; while ((m=re.exec(src))) out.push(m[1]);
  return out;
}
function transformFromBase(base) {
  const first=findFunction(base,MANIFEST[0]), second=findFunction(base,MANIFEST[1]);
  if (!first || !second || first.start>=second.start) throw new Error('missing/ordered base targets');
  const module=base.slice(first.start,second.end);
  let index=base.slice(0,first.start)+base.slice(second.end);
  if (count(index,RULES_TAG)!==1) throw new Error('rules tag identity at base');
  index=index.replace(RULES_TAG,RULES_TAG+TAG);
  return {first,second,module,index,start:first.start,end:second.end};
}
function stripComments(src) {
  let out='', inS=null, esc=false, inLine=false, inBlock=false;
  for (let i=0; i<src.length; i++) {
    const c=src[i], n=src[i+1];
    if (inLine) { if (c==='\n') { inLine=false; out+=c; } continue; }
    if (inBlock) { if (c==='*' && n==='/') { inBlock=false; i++; } continue; }
    if (inS) { out+=c; if (esc) { esc=false; continue; } if (c==='\\') { esc=true; continue; } if (c===inS) inS=null; continue; }
    if (c==='/' && n==='/') { inLine=true; i++; continue; }
    if (c==='/' && n==='*') { inBlock=true; i++; continue; }
    if (c==='"' || c==="'" || c==='`') { inS=c; out+=c; continue; }
    out+=c;
  }
  return out;
}

const base=execFileSync('git',['show',BASE_SHA+':index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
// THE DOCUMENT THIS CONTRACT PINS is index.html as PR #383 left it. PRETRADE PR3
// (the risk-modal extraction) has since been cut AGAINST that document, so it is
// undone first — newest-first — restoring the exact post-#383 index that every
// offset, hash and ratchet below addresses. The helper re-verifies the document
// it hands back by length and SHA-256, so the reconstruction is proved, not
// assumed, and this contract keeps checking the same invariants byte-for-byte.
const PRETRADE_PR3 = require('./lib/pretrade-pr3-undo.js');
// The MCX market-context extraction is NEWER than the risk modal, so it is
// undone first; each helper re-verifies by length and SHA-256, which is what
// makes the order safe to depend on.
const MCX_UNDO = require('./lib/mcx-pr1-undo.js');
const liveIndex=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const at385 = MCX_UNDO.isApplied(liveIndex)
  ? MCX_UNDO.undoMcxPr1(liveIndex, fs.readFileSync(path.join(ROOT,'js/services/mcx-market-context.js'),'utf8'))
  : liveIndex;
const index = PRETRADE_PR3.isApplied(at385)
  ? PRETRADE_PR3.undoPretradePr3(at385, fs.readFileSync(path.join(ROOT,'js/ui/pretrade-risk-modal.js'),'utf8'))
  : at385;
const moduleSrc=fs.readFileSync(path.join(ROOT,MODULE_REL),'utf8');
const rulesSrc=fs.readFileSync(path.join(ROOT,RULES_REL),'utf8');
const baseRules=execFileSync('git',['show',BASE_SHA+':'+RULES_REL],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});
const expected=transformFromBase(base);

section('1. exact owner manifest and byte identity');
same(topLevelNames(moduleSrc),MANIFEST,'technical owner declares exactly the two intended top-level functions, in order');
let declChars=0;
for (const name of MANIFEST) {
  const b=findFunction(base,name), m=findFunction(moduleSrc,name), i=findFunction(index,name);
  ok(!!b,name+' exists at pinned base');
  ok(!!m,name+' exists in technical owner');
  ok(!i,name+' is absent inline');
  if (b && m) { eq(m.text,b.text,name+' declaration is byte-identical'); declChars += m.text.length; }
}
eq(declChars,EXPECTED_DECL_CHARS,'technical declaration chars are exactly 8,387');
eq(moduleSrc,expected.module,'whole technical owner is the exact contiguous base slice');

section('2. PRETRADE residual ratchet 4 -> 2');
for (const name of RESIDUAL) {
  const b=findFunction(base,name), i=findFunction(index,name), m=findFunction(moduleSrc,name);
  ok(!!i,name+' remains inline');
  ok(!m,name+' is not pulled into technical owner');
  if (b && i) eq(i.text,b.text,name+' remains byte-identical');
}
eq(MANIFEST.filter(n=>!!findFunction(index,n)).length,0,'both technical declarations left the monolith');
eq(RESIDUAL.filter(n=>!!findFunction(index,n)).length,2,'PRETRADE inline residual is exactly two modal functions');

section('3. mechanical transform, load order and round trip');
eq(index,expected.index,'index equals the exact mechanical transform of post-#382 base');
eq(count(index,RULES_TAG),1,'rules owner tag remains exactly once');
eq(count(index,TAG),1,'technical owner tag occurs exactly once');
const rulesAt=index.indexOf(RULES_TAG), techAt=index.indexOf(TAG);
const inlineOpen=index.indexOf('<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION',techAt);
ok(rulesAt>=0 && techAt===rulesAt+RULES_TAG.length,'technical owner loads immediately after PRETRADE rules owner');
ok(inlineOpen===techAt+TAG.length,'technical owner loads immediately before inline monolith');
eq(index.slice(techAt,techAt+TAG.length),TAG,'technical load tag is exact classic src-only form');
let rebuilt=index.slice(0,techAt)+index.slice(techAt+TAG.length);
rebuilt=rebuilt.slice(0,expected.start)+moduleSrc+rebuilt.slice(expected.start);
eq(rebuilt,base,'byte-exact PR2 undo reconstructs post-#382 index');
eq(digest(rebuilt),digest(base),'round-trip SHA-256 matches post-#382 base');

section('4. earlier PRETRADE owner is immutable');
eq(rulesSrc,baseRules,'pretrade-risk-rules.js is byte-identical to post-#382 base');

section('5. source-policy invariants preserved');
const fetchSrc=stripComments(findFunction(moduleSrc,'_fetchPretradeBackendCandles').text);
const ensureSrc=stripComments(findFunction(moduleSrc,'ensurePreTradeTechnicals').text);
ok(/\/dev\/market\/candles-dxlink\/warmup/.test(fetchSrc),'DXLink warmup endpoint preserved');
ok(/\/dev\/market\/candles-dxlink\//.test(fetchSrc),'DXLink candle read endpoint preserved');
ok(!/\/market\/candles(?!-dxlink)/.test(fetchSrc),'non-DXLink /market/candles remains forbidden in backend helper');
ok(!/yahoo/i.test(fetchSrc),'backend helper remains Yahoo-free');
ok(!/new WebSocket/.test(fetchSrc),'backend helper opens no WebSocket');
ok(/ffBackendCandlesPretradeSnapshot/.test(ensureSrc),'feature-flag branch preserved');
ok(/fetchCandles\(/.test(ensureSrc),'legacy flag-false fetchCandles path preserved');
ok(/BACKEND_DXLINK_CANDLES_UNAVAILABLE/.test(ensureSrc),'backend-unavailable diagnostic preserved');
ok(ensureSrc.indexOf('BACKEND_DXLINK_CANDLES_UNAVAILABLE') < ensureSrc.indexOf('fetchCandles('),'flag-true unavailable route still precedes legacy fallback');

section('6. independent guards and genuine mutants');
function ownerViolations(layout) {
  const v=[];
  if (JSON.stringify(topLevelNames(layout.module))!==JSON.stringify(MANIFEST)) v.push('OWNER_MANIFEST');
  for (const n of MANIFEST) {
    const b=findFunction(base,n), m=findFunction(layout.module,n);
    if (!m) v.push('OWNER_MISSING:'+n); else if (!b || m.text!==b.text) v.push('OWNER_BODY:'+n);
    if (findFunction(layout.index,n)) v.push('INLINE_DUPLICATE:'+n);
  }
  for (const n of RESIDUAL) {
    const b=findFunction(base,n), i=findFunction(layout.index,n);
    if (!i) v.push('RESIDUAL_MISSING:'+n); else if (!b || i.text!==b.text) v.push('RESIDUAL_BODY:'+n);
    if (findFunction(layout.module,n)) v.push('RESIDUAL_IN_OWNER:'+n);
  }
  return v;
}
function loadViolations(layout) {
  const v=[];
  if (count(layout.index,TAG)!==1) v.push('LOAD_TAG_COUNT');
  const r=layout.index.indexOf(RULES_TAG), t=layout.index.indexOf(TAG);
  const open=layout.index.indexOf('<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION');
  if (r<0 || t!==r+RULES_TAG.length || open!==t+TAG.length) v.push('LOAD_SLOT');
  return v;
}
function roundTripViolations(layout) {
  const t=layout.index.indexOf(TAG);
  if (t<0 || count(layout.index,TAG)!==1) return ['ROUNDTRIP_TAG'];
  let r=layout.index.slice(0,t)+layout.index.slice(t+TAG.length);
  r=r.slice(0,expected.start)+layout.module+r.slice(expected.start);
  return r===base ? [] : ['ROUNDTRIP_IDENTITY'];
}
function rulesViolations(layout) { return layout.rules===baseRules ? [] : ['RULES_OWNER_CHANGED']; }
const healthy={module:moduleSrc,index,rules:rulesSrc};
const guards={owner:ownerViolations,load:loadViolations,roundtrip:roundTripViolations,rules:rulesViolations};
for (const [n,g] of Object.entries(guards)) same(g(healthy),[],n+' guard is clean on healthy repository');
const f0=findFunction(moduleSrc,MANIFEST[0]), f1=findFunction(moduleSrc,MANIFEST[1]), r0=findFunction(index,RESIDUAL[0]);
const mutants=[
  ['missing technical declaration','owner',{module:moduleSrc.replace(f0.text,''),index,rules:rulesSrc}],
  ['duplicate technical declaration inline','owner',{module:moduleSrc,index:index+'\n'+f1.text,rules:rulesSrc}],
  ['move modal residual into owner','owner',{module:moduleSrc+'\n'+r0.text,index:index.replace(r0.text,''),rules:rulesSrc}],
  ['delete modal residual','owner',{module:moduleSrc,index:index.replace(r0.text,''),rules:rulesSrc}],
  ['reorder technical declarations','owner',{module:f1.text+'\n'+f0.text,index,rules:rulesSrc}],
  ['mutate technical body','owner',{module:moduleSrc.replace("technicalFallbackReason: 'missing_ticker'","technicalFallbackReason: 'missing_symbol'"),index,rules:rulesSrc}],
  ['add foreign top-level function','owner',{module:moduleSrc+'\nfunction foreignPretradeTechnicalMutation(){}',index,rules:rulesSrc}],
  ['wrong technical script path','load',{module:moduleSrc,index:index.replace('./js/services/pretrade-technicals.js','./js/services/pretrade-technicalz.js'),rules:rulesSrc}],
  ['remove technical script tag','load',{module:moduleSrc,index:index.replace(TAG,''),rules:rulesSrc}],
  ['duplicate technical script tag','load',{module:moduleSrc,index:index.replace(TAG,TAG+TAG),rules:rulesSrc}],
  ['mutate earlier rules owner','rules',{module:moduleSrc,index,rules:rulesSrc+'\n// mutation'}],
  ['equal-length technical byte mutation','roundtrip',{module:moduleSrc.replace('waitMs: 15000','waitMs: 15001'),index,rules:rulesSrc}],
];
let killed=0,inert=0,harness=0;
for (const [name,guardName,layout] of mutants) {
  if (layout.module===healthy.module && layout.index===healthy.index && layout.rules===healthy.rules) { inert++; console.log('  INERT '+name); continue; }
  try { if (guards[guardName](layout).length) killed++; else console.log('  SURVIVOR '+name); }
  catch (e) { harness++; console.log('  HARNESS '+name+': '+e.message); }
}
eq(inert,0,'no inert mutants');
eq(harness,0,'no mutation harness errors');
eq(killed,mutants.length,'all '+mutants.length+' genuine mutants killed by intended guard');

section('7. production scope');
const changed=execFileSync('git',['diff','--name-only',BASE_SHA,'HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
// The diff is measured from the post-#382 base, so it spans BOTH extractions
// stacked since: this contract's technical owner and the risk-modal owner added
// on top. The list stays EXACT and named — an unplanned production file still fails.
const MODAL_REL='js/ui/pretrade-risk-modal.js';
const changedProduction=changed.filter(p=>p==='index.html'||p.startsWith('js/')).sort();
const MCX_MODULE_REL='js/services/mcx-market-context.js';
same(changedProduction,['index.html',MODULE_REL,MODAL_REL,MCX_MODULE_REL].sort(),'production footprint is exactly index.html + technical owner + risk-modal owner + MCX owner');
ok(!changed.some(p=>p.startsWith('.github/')||p.startsWith('scripts/')),'no bootstrap workflow/script remains in final tree');

console.log('\nPRETRADE technical boundary contract: '+pass+' passed, '+fail+' failed; mutants '+killed+'/'+mutants.length);
if (fail) process.exit(1);
