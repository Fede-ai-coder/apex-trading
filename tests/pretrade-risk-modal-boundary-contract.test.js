'use strict';

// ══════════════════════════════════════════════════════════════════════════
// PRETRADE PR3 — risk-modal extraction boundary contract.
//
// This is the LAST PRETRADE extraction. PR #382 moved the risk rules out of the
// inline monolith, PR #383 moved the technical enrichment, and the family was
// left with exactly two inline declarations: the modal opener and its closer.
// This contract pins the move of those two into js/ui/pretrade-risk-modal.js and
// takes the PRETRADE inline declaration residue from 2 to 0.
//
// The move is MECHANICAL. Every assertion below is written against the pinned
// base document rather than against a description of it: the owner must be the
// exact contiguous source slice, the index must be the exact transform of the
// base, and undoing the transform must reproduce the base byte for byte. A
// behavioural transcript is compared BASE-module vs HEAD-module so that "no
// behaviour changed" is measured, not asserted.
// ══════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
// The merge commit of PR #383. A commit, never a branch tip: a branch tip is a
// moving target and every offset, hash and slice below addresses this document.
const BASE_SHA = '0552fd129b9448a52ba379cae705e4077f8ad1e7';
const MODULE_REL = 'js/ui/pretrade-risk-modal.js';
const RULES_REL = 'js/services/pretrade-risk-rules.js';
const TECH_REL = 'js/services/pretrade-technicals.js';
const RULES_TAG = '<script src="./js/services/pretrade-risk-rules.js"></script>\n';
const TECH_TAG = '<script src="./js/services/pretrade-technicals.js"></script>\n';
const TAG = '<script src="./js/ui/pretrade-risk-modal.js"></script>\n';
const INLINE_OPEN = '<script>\n// ═══════════════════════════════════════════════════════════════\n// CONFIGURATION';
const MANIFEST = ['_closePreTradeRiskModal', '_showPreTradeRiskModal'];
const EXPECTED_DECL_CHARS = 5973;
const EXPECTED_MODULE_CHARS = 5975;
// Dependencies that stay where they are. The modal resolves both at CALL time,
// as classic scripts on one global — moving or copying either is the failure
// this PR is most likely to commit by accident, so both are pinned by owner.
const RULES_DEP = '_ptVolDeltaTolerance';
const INLINE_DEP = 'escHtml';
// escHtml's body is built from regex literals, which the declaration walker
// below (kept verbatim in step with the sibling PRETRADE contracts) does not
// parse. Its ownership is therefore pinned as the exact base bytes rather than
// re-derived — stricter than the walker, not weaker.
const INLINE_DEP_SIG = 'function ' + INLINE_DEP + '(';
const INLINE_DEP_DECL = "function escHtml(str) {\n  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');\n}";
// The application callsite, pinned verbatim from the base document. The em dash
// really is the six source characters \\u2014, not the character itself.
const CALLSITE = "        _showPreTradeRiskModal(_ptCheck, function() {\n          _doSaveNewTrade(true);   // async; local save already done, toast follows backend outcome\n        }, function() {\n          // user chose Edit/Cancel \\u2014 leave form open, do nothing\n        });";

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
// Declaration finder, not a regex: a regex over a 2 MB document matches text in
// strings, comments and unrelated identifiers. This walks to the real body.
function findFunctionFrom(src, name, from) {
  for (const sig of ['async function '+name+'(', 'function '+name+'(']) {
    let p=src.indexOf(sig, from||0);
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
function findFunction(src, name) { return findFunctionFrom(src, name, 0); }
function countDeclarations(src, name) {
  let n=0, from=0, d;
  while ((d = findFunctionFrom(src, name, from))) { n++; from = d.start + 1; }
  return n;
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
function topLevelNames(src) {
  const out=[], re=/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(|^(?:var|const|let)\s+([A-Za-z_$][\w$]*)/gm;
  let m; while ((m=re.exec(src))) out.push(m[1]||m[2]);
  return out;
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
// The whole transform, derived from the base rather than described. The owner is
// the contiguous slice spanning both declarations; the index is that slice cut
// out and one classic tag added directly after the technicals owner.
function transformFromBase(base) {
  const first=findFunction(base,MANIFEST[0]), second=findFunction(base,MANIFEST[1]);
  if (!first || !second || first.start>=second.start) throw new Error('missing/ordered base targets');
  const module=base.slice(first.start,second.end);
  let index=base.slice(0,first.start)+base.slice(second.end);
  if (count(index,TECH_TAG)!==1) throw new Error('technicals tag identity at base');
  index=index.replace(TECH_TAG,TECH_TAG+TAG);
  return {first,second,module,index,start:first.start,end:second.end};
}

const base=execFileSync('git',['show',BASE_SHA+':index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
// THE DOCUMENT THIS CONTRACT PINS predates the MCX market-context extraction,
// which has since been cut against it, so that extraction is undone FIRST —
// newest-first, the same rule the existing links follow. The helper re-verifies
// the document it hands back by length and SHA-256, so this hop is proved rather
// than assumed and every offset, hash and ratchet below still addresses exactly
// the document it was written against.
// The MCX VIX extraction (PR #389) is NEWER than every link below, so it is
// undone FIRST — newest-first, the rule the existing links already follow.
// Each helper re-verifies the document it hands back by length and SHA-256,
// so every offset below still addresses exactly the document it was written
// against.
const MCX_UNDO3 = require('./lib/mcx-pr3-undo.js');
const POST_JOURNAL_MCX3_UNDO = require('./lib/post-journal-mcx-pr3-undo.js');
const MCX_UNDO2 = require('./lib/mcx-pr2-undo.js');
const MCX_UNDO = require('./lib/mcx-pr1-undo.js');
const liveIndex=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const at392 = MCX_UNDO3.isApplied(liveIndex)
  ? POST_JOURNAL_MCX3_UNDO.undoMcxPr3AfterJournal(liveIndex, fs.readFileSync(path.join(ROOT,'js/services/mcx-backend-candles.js'),'utf8'))
  : liveIndex;
const at386 = MCX_UNDO2.isApplied(at392)
  ? MCX_UNDO2.undoMcxPr2(at392, fs.readFileSync(path.join(ROOT,'js/services/mcx-vix-market-context.js'),'utf8'))
  : at392;
const index = MCX_UNDO.isApplied(at386)
  ? MCX_UNDO.undoMcxPr1(at386, fs.readFileSync(path.join(ROOT,'js/services/mcx-market-context.js'),'utf8'))
  : at386;
const moduleSrc=fs.readFileSync(path.join(ROOT,MODULE_REL),'utf8');
const rulesSrc=fs.readFileSync(path.join(ROOT,RULES_REL),'utf8');
const techSrc=fs.readFileSync(path.join(ROOT,TECH_REL),'utf8');
const baseRules=execFileSync('git',['show',BASE_SHA+':'+RULES_REL],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});
const baseTech=execFileSync('git',['show',BASE_SHA+':'+TECH_REL],{cwd:ROOT,encoding:'utf8',maxBuffer:2*1024*1024});
const expected=transformFromBase(base);
// The runtime harness resolves the rules dependency by evaluating the owner's
// own declaration — not by restating its value here, which could drift.
const RULES_DEP_DECL=(findVar(rulesSrc,RULES_DEP)||{}).text;

section('1. pinned base identity and the source slices taken from it');
eq(execFileSync('git',['rev-parse',BASE_SHA+'^{commit}'],{cwd:ROOT,encoding:'utf8'}).trim(),BASE_SHA,'BASE_SHA resolves to a real commit, not an abbreviation or a tag');
eq(base.length,2101326,'pinned base index.html is exactly 2,101,326 chars');
eq(digest(base),'aa6a3189486e0511c4e4fea52132586eaf41b43784999a14f97a67e4edb4c5f5','pinned base index.html SHA-256 is the recorded one');
for (const name of MANIFEST) eq(countDeclarations(base,name),1,name+' is declared exactly once in the base monolith');
eq(expected.start,1865311,'slice start offset in the base document is pinned');
eq(expected.end,1871286,'slice end offset in the base document is pinned');
eq(expected.module.length,EXPECTED_MODULE_CHARS,'captured base slice is exactly 5,975 chars');
eq(digest(expected.module),'20215b85a7b0f927067ba5d4a83b1b329023692a60ba7c4e7a8d9098bb6a4693','captured base slice SHA-256 is the recorded one');
eq(base.slice(expected.first.end,expected.second.start),'\n\n','the two base declarations are adjacent — the slice smuggles nothing between them');

section('2. exact owner manifest and byte identity');
same(topLevelNames(moduleSrc),MANIFEST,'modal owner declares exactly the two intended top-level bindings, in order');
let declChars=0;
for (const name of MANIFEST) {
  const b=findFunction(base,name), m=findFunction(moduleSrc,name), i=findFunction(index,name);
  ok(!!b,name+' exists at pinned base');
  ok(!!m,name+' exists in modal owner');
  ok(!i,name+' is absent inline');
  eq(countDeclarations(moduleSrc,name),1,name+' is declared exactly once in the modal owner');
  eq(countDeclarations(index,name),0,name+' is declared zero times in index.html');
  if (b && m) { eq(m.text,b.text,name+' declaration is byte-identical to the base'); declChars += m.text.length; }
}
eq(declChars,EXPECTED_DECL_CHARS,'modal declaration chars are exactly 5,973');
eq(moduleSrc.length,EXPECTED_MODULE_CHARS,'modal owner file is exactly 5,975 chars');
eq(moduleSrc,expected.module,'whole modal owner is the exact contiguous base slice');

section('3. PRETRADE residual ratchet 2 -> 0 — the family is closed');
eq(MANIFEST.filter(n=>!!findFunction(index,n)).length,0,'PRETRADE inline declaration residue is 0');
// Every binding the three PRETRADE owners declare must now live outside the
// monolith. This is the terminal check: it is what "the family is extracted"
// means, and it re-fails the moment any of them is pasted back inline.
const familyNames=[];
for (const src of [rulesSrc,techSrc,moduleSrc]) for (const n of topLevelNames(src)) familyNames.push(n);
eq(familyNames.length,18,'the PRETRADE family is exactly 18 declarations across its three owners');
for (const n of familyNames) {
  const inline = n===RULES_DEP ? findVar(index,n) : findFunction(index,n);
  ok(!inline,'PRETRADE family binding is external, not inline: '+n);
}

section('4. mechanical transform, load order and classic-script semantics');
eq(index,expected.index,'index equals the exact mechanical transform of the pinned base');
const INLINE_SLOT=expected.start+TAG.length;
eq(index.slice(INLINE_SLOT),base.slice(expected.end),'everything after the excised slice is byte-identical to the base');
eq(index.slice(0,INLINE_SLOT),base.slice(0,expected.start).replace(TECH_TAG,TECH_TAG+TAG),'everything before the excised slice is the base plus exactly one new tag');
eq(count(index,RULES_TAG),1,'rules owner tag occurs exactly once');
eq(count(index,TECH_TAG),1,'technicals owner tag occurs exactly once');
eq(count(index,TAG),1,'modal owner tag occurs exactly once');
eq(count(index,'./js/ui/pretrade-risk-modal.js'),1,'the modal owner path appears exactly once in the whole document');
const rulesAt=index.indexOf(RULES_TAG), techAt=index.indexOf(TECH_TAG), modalAt=index.indexOf(TAG);
const inlineOpen=index.indexOf(INLINE_OPEN,modalAt);
ok(rulesAt>=0 && techAt===rulesAt+RULES_TAG.length,'technicals owner still loads immediately after the rules owner');
ok(modalAt===techAt+TECH_TAG.length,'modal owner loads immediately after the technicals owner');
ok(inlineOpen===modalAt+TAG.length,'modal owner loads immediately before the inline monolith');
ok(rulesAt<techAt && techAt<modalAt && modalAt<inlineOpen,'load order is rules -> technicals -> modal -> monolith');
eq(index.slice(modalAt,modalAt+TAG.length),TAG,'modal load tag is the exact classic src-only form');
ok(!/<script[^>]*pretrade-risk-modal[^>]*(defer|async|type=)/.test(index),'modal tag carries no defer, async or type attribute');

section('5. no wrapper, no load-time side effect');
const bare=stripComments(moduleSrc);
for (const token of ['import','export','require','module.exports','define(','__esModule']) {
  ok(bare.indexOf(token)<0,'modal owner introduces no '+token);
}
ok(!/^\s*['"]use strict['"]/.test(bare),'modal owner adds no strict-mode pragma the inline monolith did not have');
ok(!/^\s*\(function/.test(bare),'modal owner adds no IIFE wrapper');
// Structural: cut the two declarations out and NOTHING executable is left.
const residue=moduleSrc.slice(0,findFunction(moduleSrc,MANIFEST[0]).start)
  + moduleSrc.slice(findFunction(moduleSrc,MANIFEST[0]).end,findFunction(moduleSrc,MANIFEST[1]).start)
  + moduleSrc.slice(findFunction(moduleSrc,MANIFEST[1]).end);
eq(residue,'\n\n','outside the two declarations the owner file is whitespace only');
// Empirical: evaluate the owner with NO document, NO window, NO helpers. A file
// that touched anything at load time would throw here; a file that defined
// anything extra would show up in the sandbox key diff.
const probe={};
vm.createContext(probe);
const before=Object.keys(probe).sort();
let loadError=null;
try { vm.runInContext(moduleSrc,probe); } catch (e) { loadError=e; }
ok(!loadError,'modal owner evaluates with no globals present at all'+(loadError?': '+loadError.message:''));
same(Object.keys(probe).filter(k=>before.indexOf(k)<0).sort(),MANIFEST.slice().sort(),'evaluating the owner defines exactly the two functions and nothing else');
for (const name of MANIFEST) eq(typeof probe[name],'function',name+' is a plain function binding after load');

section('6. call-time dependencies stay with their current owners');
ok(!!findVar(rulesSrc,RULES_DEP),RULES_DEP+' is still owned by the PRETRADE rules owner');
ok(!findVar(moduleSrc,RULES_DEP),RULES_DEP+' was not copied into the modal owner');
ok(!findVar(index,RULES_DEP),RULES_DEP+' was not re-created inline');
eq(count(moduleSrc,'var '+RULES_DEP),0,'the modal owner declares no '+RULES_DEP);
ok(bare.indexOf(RULES_DEP)>=0,RULES_DEP+' is still READ by the modal owner — the dependency is real, not removed');
eq(count(base,INLINE_DEP_DECL),1,INLINE_DEP+' is declared exactly once at the pinned base');
eq(count(index,INLINE_DEP_DECL),1,INLINE_DEP+' is still owned inline, byte-identical and in exactly one place');
eq(count(index,INLINE_DEP_SIG),1,INLINE_DEP+' has exactly one declaration site inline');
eq(count(moduleSrc,INLINE_DEP_SIG),0,INLINE_DEP+' was not copied into the modal owner');
ok(bare.indexOf(INLINE_DEP+'(')>=0,INLINE_DEP+' is still CALLED by the modal owner');
eq(rulesSrc,baseRules,'js/services/pretrade-risk-rules.js is byte-identical to the pinned base');
eq(techSrc,baseTech,'js/services/pretrade-technicals.js is byte-identical to the pinned base');

section('7. the application callsite is untouched');
eq(count(base,CALLSITE),1,'the pinned callsite text occurs exactly once at the base');
eq(count(index,CALLSITE),1,'the pinned callsite text still occurs exactly once inline');
ok(index.indexOf(CALLSITE)>inlineOpen,'the callsite is still inside the inline monolith, after the modal owner loads');
eq(count(moduleSrc,'_doSaveNewTrade'),0,'no save logic followed the modal into the UI owner');
eq(count(index,'_showPreTradeRiskModal('),1,'_showPreTradeRiskModal is invoked from exactly one place inline');

section('8. round trip and the PRETRADE historical chain');
let rebuilt=index.slice(0,modalAt)+index.slice(modalAt+TAG.length);
rebuilt=rebuilt.slice(0,expected.start)+moduleSrc+rebuilt.slice(expected.start);
eq(rebuilt,base,'byte-exact PR3 undo reconstructs the pinned base index');
eq(digest(rebuilt),digest(base),'round-trip SHA-256 matches the pinned base');
// The shared helper is what the OLDER PRETRADE contracts chain through, so it is
// exercised here against the same documents they will hand it.
const PR3=require('./lib/pretrade-pr3-undo.js');
const PR2=require('./lib/pretrade-pr2-undo.js');
const PR1=require('./lib/pretrade-pr1-undo.js');
ok(PR3.isApplied(index),'the shared PR3 undo helper recognises this tree as extracted');
eq(PR3.undoPretradePr3(index,moduleSrc),base,'shared PR3 undo helper reproduces the pinned base');
const at382=PR2.undoPretradePr2(base,techSrc);
const at382Git=execFileSync('git',['show','ecb4b155b9ebe9841cbe807c6493ac269d922bc8:index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
eq(at382,at382Git,'chained PR2 undo reaches the post-#382 document');
const at0=PR1.undoPretradePr1(at382,rulesSrc);
const at0Git=execFileSync('git',['show','ade09125fa7d14a293643764bc04b235c067d30d:index.html'],{cwd:ROOT,encoding:'utf8',maxBuffer:8*1024*1024});
eq(at0,at0Git,'chained PR1 undo reaches the pre-#382 historical base — the whole chain closes');
// The helper must REFUSE a source it was not given, not silently rebuild garbage.
for (const [name,bad] of [['a truncated owner',moduleSrc.slice(0,-1)],['an equal-length byte mutation',moduleSrc.replace("display = 'flex'","display = 'Flex'")]]) {
  let threw=null; try { PR3.undoPretradePr3(index,bad); } catch (e) { threw=e.message; }
  eq(threw,'PRETRADE_PR3_UNDO_MODULE_IDENTITY','PR3 undo rejects '+name);
}
{
  let threw=null; try { PR3.undoPretradePr3(index.replace(TAG,TAG+TAG),moduleSrc); } catch (e) { threw=e.message; }
  eq(threw,'PRETRADE_PR3_UNDO_TAG_IDENTITY','PR3 undo rejects a duplicated load tag');
}
{
  let threw=null; try { PR3.undoPretradePr3(index.replace('<!-- deploy: 2026-04-23 -->','<!-- deploy: 2026-04-24 -->'),moduleSrc); } catch (e) { threw=e.message; }
  eq(threw,'PRETRADE_PR3_UNDO_BASE_IDENTITY','PR3 undo rejects an index that drifted outside the slice');
}

section('9. BASE-vs-HEAD behavioural transcript parity');
// The modal is run for real — base slice and extracted owner alike — against a
// deterministic DOM double. Every observable the PR promised not to change is
// recorded: the generated HTML, the display flips, the callback order, and what
// the modal had already done by the time each callback saw it.
function runModal(src, f) {
  const log=[];
  function makeEl(id) { return { id, style:{}, innerHTML:null }; }
  const el=f.noModal ? null : makeEl('preTradeRiskModal');
  const inner=f.noInner ? null : makeEl('preTradeRiskModalInner');
  const sandbox={
    Math, Number, Boolean, Array, Object, JSON, String, parseFloat, parseInt, isFinite, isNaN,
    document:{ getElementById(id) {
      log.push('getElementById:'+id);
      if (id==='preTradeRiskModal') return el;
      if (id==='preTradeRiskModalInner') return inner;
      return null;
    } },
    // Logged, so that DROPPING the escape call is visible in the transcript and
    // not merely invisible because the label happens to contain no markup.
    escHtml(s) { log.push('escHtml:'+String(s)); return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
  };
  sandbox.window=sandbox;
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  try {
    vm.runInContext(RULES_DEP_DECL,sandbox);
    vm.runInContext(src,sandbox);
    const beforeShow={ cancel:typeof sandbox._ptCancel, force:typeof sandbox._ptForceSave };
    log.push('beforeShow:'+beforeShow.cancel+'/'+beforeShow.force);
    sandbox.__show=sandbox._showPreTradeRiskModal;
    const cb=[];
    const onForceSave=function() { cb.push('onForceSave@display='+(el?String(el.style.display):'no-el')); };
    const onCancel=function() { cb.push('onCancel@display='+(el?String(el.style.display):'no-el')); };
    sandbox.__args=[f.check,onForceSave,onCancel];
    vm.runInContext('__show(__args[0],__args[1],__args[2])',sandbox);
    const afterShow={ display: el?String(el.style.display):null, html: inner?inner.innerHTML:null };
    const installed={ cancel:typeof sandbox._ptCancel, force:typeof sandbox._ptForceSave };
    if (installed.cancel==='function') { sandbox.__c=sandbox._ptCancel; vm.runInContext('__c()',sandbox); }
    const afterCancel=el?String(el.style.display):null;
    if (el) el.style.display='flex';
    if (installed.force==='function') { sandbox.__f=sandbox._ptForceSave; vm.runInContext('__f()',sandbox); }
    const afterForce=el?String(el.style.display):null;
    return { ok:true, log, afterShow, installed, cb, afterCancel, afterForce };
  } catch (e) {
    return { ok:false, name:e&&e.name, message:e&&e.message, log, cbLen:0 };
  }
}
const fixtures=[
  { name:'RED with reasons, tolerance band and short leg', check:{ status:'RED',
      reasons:['Trade delta points against the technical bias','Short leg is beyond the tolerance band'],
      inputs:{ symbol:'AAPL', bias:'LONG', estimatedTradeDelta:-42.5, deltaRangeStatus:'wrong_direction',
        deltaRange:[10,40], ivr:26.4, ivrSource:'TASTYTRADE', ivrReason:'from chain', vix3m:18.372,
        selectedVolRange:[-16,-8], toleranceBand:[-24,-4], worstShortLegDelta:-3.25, volatilityMode:'conservative' } } },
  { name:'WARNING above range, no tolerance band', check:{ status:'WARNING',
      reasons:['Position delta is above the bias range'],
      inputs:{ symbol:'QQQ', bias:'SHORT', estimatedTradeDelta:12, deltaRangeStatus:'above',
        deltaRange:[-40,-10], ivr:71, ivrSource:'TASTYTRADE', vix3m:30, selectedVolRange:[8,16],
        worstShortLegDelta:19.4, volatilityMode:'vix3m' } } },
  { name:'OK within range', check:{ status:'OK', reasons:[],
      inputs:{ symbol:'SPY', bias:'NEUTRAL', estimatedTradeDelta:0, deltaRangeStatus:'within',
        deltaRange:[-5,5], ivr:33, ivrSource:'TASTYTRADE', vix3m:15.5, selectedVolRange:[-10,10],
        worstShortLegDelta:2, volatilityMode:'ivr' } } },
  { name:'below range, IVR unavailable from a non-Tastytrade source', check:{ status:'WARNING',
      reasons:['Position delta is below the bias range'],
      inputs:{ symbol:'NVDA', bias:'LONG', estimatedTradeDelta:3, deltaRangeStatus:'below',
        deltaRange:[10,40], ivrSource:'DXLINK', vix3m:null } } },
  { name:'unknown delta status, everything unavailable', check:{ status:'RED',
      reasons:['No Greek data'], inputs:{ symbol:'MSFT', bias:'UNKNOWN', deltaRangeStatus:'unknown' } } },
  { name:'no inputs object at all', check:{ status:'WARNING', reasons:[] } },
  { name:'unrecognised status falls through to the default colour', check:{ status:'PENDING', reasons:['x'], inputs:{ symbol:'IWM', bias:'LONG' } } },
  { name:'reason text containing markup is still rendered exactly as today', check:{ status:'RED', reasons:['<b>alert</b> & more'], inputs:{ symbol:'A&B', bias:'SHORT' } } },
  { name:'modal element absent — falls straight through to force save', noModal:true, check:{ status:'RED', reasons:[] } },
  { name:'inner element absent — falls straight through to force save', noInner:true, check:{ status:'RED', reasons:[] } },
];
const transcripts=[];
for (const f of fixtures) {
  const b=runModal(expected.module,f), h=runModal(moduleSrc,f);
  ok(b.ok===h.ok,'fixture settles the same way in base and head: '+f.name);
  same(h,b,'BASE-vs-HEAD transcript parity: '+f.name);
  transcripts.push(h);
}
// The corpus has to actually reach the behaviour it claims to protect.
const rendered=transcripts.filter(t=>t.ok && t.afterShow.html);
ok(rendered.length>=8,'the corpus renders the modal in at least eight fixtures');
ok(rendered.every(t=>t.afterShow.display==='flex'),'every rendered fixture leaves the modal at display:flex');
ok(rendered.every(t=>t.installed.cancel==='function' && t.installed.force==='function'),'both window callbacks are installed on every rendered fixture');
ok(rendered.every(t=>t.afterCancel==='none' && t.afterForce==='none'),'both callbacks close the modal');
ok(rendered.every(t=>t.cb.length===2 && t.cb[0]==='onCancel@display=none' && t.cb[1]==='onForceSave@display=none'),'each callback closes BEFORE invoking its handler, and each fires exactly once');
ok(rendered.some(t=>t.afterShow.html.indexOf('Force save anyway — RED risk')>=0),'the corpus reaches the RED force-save wording');
ok(rendered.some(t=>t.afterShow.html.indexOf('>Force save anyway<')>=0),'the corpus reaches the non-RED force-save wording');
ok(rendered.some(t=>t.afterShow.html.indexOf('background:var(--rd);border:none;color:#fff;')>=0),'the corpus reaches the RED force-save style');
ok(rendered.some(t=>t.afterShow.html.indexOf('background:var(--am);border:none;color:#000;')>=0),'the corpus reaches the non-RED force-save style');
ok(rendered.some(t=>t.afterShow.html.indexOf('(tol. +8Δ)')>=0),'the corpus reaches the '+RULES_DEP+' display, resolved from the rules owner');
ok(rendered.some(t=>t.afterShow.html.indexOf('WRONG DIRECTION')>=0),'the corpus reaches the wrong-direction delta message');
ok(rendered.some(t=>t.afterShow.html.indexOf('▲ above')>=0) && rendered.some(t=>t.afterShow.html.indexOf('▼ below')>=0),'the corpus reaches both out-of-range delta messages');
ok(rendered.some(t=>t.afterShow.html.indexOf('unavailable (DXLINK — not used)')>=0),'the corpus reaches the non-Tastytrade IVR presentation');
ok(rendered.every(t=>t.log.filter(x=>x.indexOf('escHtml:')===0).length===1),INLINE_DEP+' is invoked exactly once per render, resolved from the inline owner');
ok(rendered.every(t=>t.log.indexOf('beforeShow:undefined/undefined')>=0),'neither window callback exists until the modal is actually shown');
const fell=transcripts.filter(t=>t.ok && !t.afterShow.html);
eq(fell.length,2,'exactly the two missing-element fixtures fall through without rendering');
ok(fell.every(t=>t.cb.length===1 && t.cb[0].indexOf('onForceSave')===0),'a missing element calls onForceSave once and nothing else');
ok(fell.every(t=>t.installed.cancel==='undefined' && t.installed.force==='undefined'),'a missing element installs no window callbacks');

section('10. independent guards and genuine mutants');
function ownerViolations(layout) {
  const v=[];
  if (JSON.stringify(topLevelNames(layout.module))!==JSON.stringify(MANIFEST)) v.push('OWNER_MANIFEST');
  for (const n of MANIFEST) {
    const b=findFunction(base,n), m=findFunction(layout.module,n);
    if (!m) v.push('OWNER_MISSING:'+n); else if (!b || m.text!==b.text) v.push('OWNER_BODY:'+n);
    if (countDeclarations(layout.module,n)!==1) v.push('OWNER_NOT_UNIQUE:'+n);
    if (findFunction(layout.index,n)) v.push('INLINE_DUPLICATE:'+n);
  }
  return v;
}
function loadViolations(layout) {
  const v=[];
  if (count(layout.index,TAG)!==1) v.push('LOAD_TAG_COUNT');
  const r=layout.index.indexOf(RULES_TAG), t=layout.index.indexOf(TECH_TAG), m=layout.index.indexOf(TAG);
  const open=layout.index.indexOf(INLINE_OPEN);
  if (r<0 || t!==r+RULES_TAG.length || m!==t+TECH_TAG.length || open!==m+TAG.length) v.push('LOAD_SLOT');
  return v;
}
function depViolations(layout) {
  const v=[];
  if (findVar(layout.module,RULES_DEP)) v.push('DEP_COPIED:'+RULES_DEP);
  if (count(layout.module,INLINE_DEP_SIG)) v.push('DEP_COPIED:'+INLINE_DEP);
  if (!findVar(layout.rules,RULES_DEP)) v.push('DEP_LOST:'+RULES_DEP);
  if (count(layout.index,INLINE_DEP_SIG)!==1) v.push('DEP_OWNER:'+INLINE_DEP);
  return v;
}
function callsiteViolations(layout) {
  return count(layout.index,CALLSITE)===1 ? [] : ['CALLSITE'];
}
function roundTripViolations(layout) {
  const t=layout.index.indexOf(TAG);
  if (t<0 || count(layout.index,TAG)!==1) return ['ROUNDTRIP_TAG'];
  let r=layout.index.slice(0,t)+layout.index.slice(t+TAG.length);
  r=r.slice(0,expected.start)+layout.module+r.slice(expected.start);
  return r===base ? [] : ['ROUNDTRIP_IDENTITY'];
}
function undoViolations(layout) {
  try { return PR3.undoPretradePr3(layout.index,layout.module)===base ? [] : ['UNDO_IDENTITY']; }
  catch (e) { return ['UNDO_REJECTED:'+e.message]; }
}
function behaviourViolations(layout) {
  const v=[];
  for (const f of fixtures) {
    const b=runModal(expected.module,f), h=runModal(layout.module,f);
    if (JSON.stringify(b)!==JSON.stringify(h)) { v.push('BEHAVIOUR:'+f.name); break; }
  }
  return v;
}
const guards={owner:ownerViolations,load:loadViolations,dep:depViolations,callsite:callsiteViolations,roundtrip:roundTripViolations,undo:undoViolations,behaviour:behaviourViolations};
const healthy={module:moduleSrc,index,rules:rulesSrc};
for (const [n,g] of Object.entries(guards)) same(g(healthy),[],n+' guard is clean on the healthy repository');
const f0=findFunction(moduleSrc,MANIFEST[0]), f1=findFunction(moduleSrc,MANIFEST[1]);
const baseDep=findVar(rulesSrc,RULES_DEP), baseEsc={text:INLINE_DEP_DECL};
const mutants=[
  ['a modal declaration stayed inline','owner',{module:moduleSrc,index:index.slice(0,INLINE_SLOT)+f0.text+'\n\n'+index.slice(INLINE_SLOT),rules:rulesSrc}],
  ['the second modal declaration stayed inline','owner',{module:moduleSrc,index:index.slice(0,INLINE_SLOT)+f1.text+'\n\n'+index.slice(INLINE_SLOT),rules:rulesSrc}],
  ['the extraction was never performed at all','owner',{module:'',index:base,rules:rulesSrc}],
  ['a declaration exists in both files','owner',{module:moduleSrc,index:index+'\n'+f1.text,rules:rulesSrc}],
  ['a declaration disappeared entirely','owner',{module:moduleSrc.replace(f0.text,''),index,rules:rulesSrc}],
  ['the second declaration disappeared entirely','owner',{module:moduleSrc.replace(f1.text,''),index,rules:rulesSrc}],
  ['a declaration is duplicated inside the owner','owner',{module:moduleSrc+'\n'+f0.text,index,rules:rulesSrc}],
  ['the declarations were reordered','owner',{module:f1.text+'\n\n'+f0.text,index,rules:rulesSrc}],
  ['a foreign declaration was bundled in','owner',{module:moduleSrc+'\nfunction foreignPretradeModalMutation(){}',index,rules:rulesSrc}],
  ['script order reversed against the technicals owner','load',{module:moduleSrc,index:index.replace(TECH_TAG+TAG,TAG+TECH_TAG),rules:rulesSrc}],
  ['script order reversed against the rules owner','load',{module:moduleSrc,index:index.replace(RULES_TAG+TECH_TAG+TAG,TAG+RULES_TAG+TECH_TAG),rules:rulesSrc}],
  ['modal script loaded AFTER the monolith','load',{module:moduleSrc,index:index.replace(TAG,'').replace('</body>',TAG+'</body>'),rules:rulesSrc}],
  ['modal script loaded twice','load',{module:moduleSrc,index:index.replace(TAG,TAG+TAG),rules:rulesSrc}],
  ['modal script tag removed','load',{module:moduleSrc,index:index.replace(TAG,''),rules:rulesSrc}],
  ['modal script path misspelled','load',{module:moduleSrc,index:index.replace('./js/ui/pretrade-risk-modal.js','./js/ui/pretrade-risk-modl.js'),rules:rulesSrc}],
  [RULES_DEP+' copied into the UI module','dep',{module:baseDep.text+'\n'+moduleSrc,index,rules:rulesSrc}],
  [INLINE_DEP+' copied into the UI module','dep',{module:moduleSrc+'\n'+baseEsc.text,index,rules:rulesSrc}],
  [RULES_DEP+' moved out of the rules owner','dep',{module:moduleSrc,index,rules:rulesSrc.replace(baseDep.text,'')}],
  [INLINE_DEP+' duplicated inline','dep',{module:moduleSrc,index:index+'\n'+baseEsc.text,rules:rulesSrc}],
  ['the callsite was removed','callsite',{module:moduleSrc,index:index.replace(CALLSITE,''),rules:rulesSrc}],
  ['the callsite was redirected to another function','callsite',{module:moduleSrc,index:index.replace(CALLSITE,CALLSITE.replace('_showPreTradeRiskModal(','_showPreTradeRiskModalV2(')),rules:rulesSrc}],
  ['the callsite lost its cancel callback','callsite',{module:moduleSrc,index:index.replace(CALLSITE,'        _showPreTradeRiskModal(_ptCheck, function() {\n          _doSaveNewTrade(true);\n        });'),rules:rulesSrc}],
  ['equal-length byte mutation inside the owner','roundtrip',{module:moduleSrc.replace("el.style.display = 'flex';","el.style.display = 'Flex';"),index,rules:rulesSrc}],
  ['index byte drift outside the extracted slice','roundtrip',{module:moduleSrc,index:index.replace('<!-- deploy: 2026-04-23 -->','<!-- deploy: 2026-04-24 -->'),rules:rulesSrc}],
  ['undo helper handed an incorrect source slice','undo',{module:moduleSrc.replace('var el    = document','var el =    document'),index,rules:rulesSrc}],
  ['undo helper handed a truncated source slice','undo',{module:moduleSrc.slice(0,-1),index,rules:rulesSrc}],
  ['_ptCancel stopped closing before invoking onCancel','behaviour',{module:moduleSrc.replace('    _closePreTradeRiskModal();\n    if (onCancel) onCancel();','    if (onCancel) onCancel();\n    _closePreTradeRiskModal();'),index,rules:rulesSrc}],
  ['_ptForceSave stopped closing before invoking onForceSave','behaviour',{module:moduleSrc.replace('    _closePreTradeRiskModal();\n    if (onForceSave) onForceSave();','    if (onForceSave) onForceSave();\n    _closePreTradeRiskModal();'),index,rules:rulesSrc}],
  ['the _ptCancel assignment was lost','behaviour',{module:moduleSrc.replace('  window._ptCancel = function() {\n    _closePreTradeRiskModal();\n    if (onCancel) onCancel();\n  };\n',''),index,rules:rulesSrc}],
  ['the _ptForceSave assignment was lost','behaviour',{module:moduleSrc.replace('  window._ptForceSave = function() {\n    _closePreTradeRiskModal();\n    if (onForceSave) onForceSave();\n  };\n',''),index,rules:rulesSrc}],
  ['the modal no longer opens at display:flex','behaviour',{module:moduleSrc.replace("el.style.display = 'flex';","el.style.display = 'block';"),index,rules:rulesSrc}],
  ['the missing-element fallback stopped force-saving','behaviour',{module:moduleSrc.replace('if (!el || !inner) { if (onForceSave) onForceSave(); return; }','if (!el || !inner) { return; }'),index,rules:rulesSrc}],
  ['the RED force-save wording was reworded','behaviour',{module:moduleSrc.replace("'Force save anyway — RED risk'","'Force save anyway - RED risk'"),index,rules:rulesSrc}],
  [RULES_DEP+' inlined as a literal instead of read from its owner','behaviour',{module:moduleSrc.replace("' (tol. +' + "+RULES_DEP+" + 'Δ)'","' (tol. +' + 4 + 'Δ)'"),index,rules:rulesSrc}],
  [INLINE_DEP+' dropped from the force-save label','behaviour',{module:moduleSrc.replace(INLINE_DEP+'(forceLbl)','forceLbl'),index,rules:rulesSrc}],
];
let killed=0,inert=0,harness=0;
for (const [name,guardName,layout] of mutants) {
  if (layout.module===healthy.module && layout.index===healthy.index && layout.rules===healthy.rules) { inert++; console.log('  INERT '+name); continue; }
  try { if (guards[guardName](layout).length) killed++; else console.log('  SURVIVOR '+name+' [guard '+guardName+']'); }
  catch (e) { harness++; console.log('  HARNESS '+name+': '+e.message); }
}
eq(inert,0,'no inert mutants');
eq(harness,0,'no mutation harness errors');
eq(killed,mutants.length,'all '+mutants.length+' genuine mutants killed by their intended guard');

section('11. production scope');
const changed=execFileSync('git',['diff','--name-only',BASE_SHA,'HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const changedProduction=changed.filter(p=>p==='index.html'||p.startsWith('js/')).sort();
// The diff is measured from the pre-modal base, so it now also spans the MCX
// market-context owner extracted on top. The list stays EXACT and named — an
// unplanned production file still fails here.
const MCX_MODULE_REL='js/services/mcx-market-context.js';
// PR #389 stacked the MCX VIX owner on top; the list stays EXACT and named.
const MCX_VIX_MODULE_REL='js/services/mcx-vix-market-context.js';
const MCX_BACKEND_CANDLES_REL='js/services/mcx-backend-candles.js';
const JOURNAL_CORE_REL='js/services/journal-core.js';
same(changedProduction,['index.html',MODULE_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL,JOURNAL_CORE_REL].sort(),'production footprint is exactly index.html + the modal owner + all three MCX owners + Journal Core');
const maintenanceScopeChanged=execFileSync('git',['diff','--name-only','9a0bf91e3ca79e1b042caaa2e98ff6e2bdd073aa','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
ok(!maintenanceScopeChanged.some(p=>p.startsWith('.github/')||p.startsWith('scripts/')),'no workflow or bootstrap script changed after the CI maintenance baseline');
ok(!changed.some(p=>p===RULES_REL||p===TECH_REL),'neither earlier PRETRADE owner was modified');

console.log('\nPRETRADE risk-modal boundary contract: '+pass+' passed, '+fail+' failed; mutants '+killed+'/'+mutants.length);
if (fail) process.exit(1);
