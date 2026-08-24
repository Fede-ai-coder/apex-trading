'use strict';
const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve('tests/tools/temporary-mcx-regime-policy-repair.js');
let src = fs.readFileSync(sourcePath, 'utf8');

// DSB classifies every post-DSB MCX owner through the exact MCX inventory.  The
// regime-policy owner must therefore extend that inventory rather than sit in a
// parallel exemption list, otherwise it leaks into the frozen audit-time module
// baseline.
{
  const start = src.indexOf('function patchDsb(){');
  const endMarker = '\n\nfunction patchBss(){';
  const end = src.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('REPAIR_V3_DSB_FUNCTION_BOUNDARY');
  if (src.indexOf('function patchDsb(){', start + 1) >= 0) throw new Error('REPAIR_V3_DUPLICATE_DSB_FUNCTION');
  const replacement = `function patchDsb(){
  const file = 'tests/backend-directional-snapshot-boundary-contract.test.js';
  const before = read(file); let src = before;
  src = one(src,
    "  './js/services/mcx-backend-candles.js',\\n];",
    "  './js/services/mcx-backend-candles.js',\\n  './js/services/mcx-regime-policy.js',\\n];",
    'dsb exact MCX regime inventory');
  src = one(src,
    "eq(LOCAL_SCRIPTS.length + DECLARED_NON_DSB_SCRIPTS.length, 45,\\n   'index.html loads 26 local application scripts plus the named Stress, PESS, EIC, PRETRADE, three MCX and Journal Core extraction modules before the inline monolith');",
    "eq(LOCAL_SCRIPTS.length + DECLARED_NON_DSB_SCRIPTS.length, 46,\\n   'index.html loads 26 local application scripts plus the named Stress, PESS, EIC, PRETRADE, four MCX and Journal Core extraction modules before the inline monolith');",
    'dsb exact local script total');
  write(file, src, before);
}`;
  src = src.slice(0, start) + replacement + src.slice(end);
}

const start = src.indexOf('function patchProductionFootprint(file){');
const endMarker = '\n\nfunction patchPess(){';
const end = src.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('REPAIR_V3_FUNCTION_BOUNDARY');
if (src.indexOf('function patchProductionFootprint(file){', start + 1) >= 0) throw new Error('REPAIR_V3_DUPLICATE_FUNCTION');

const replacement = `function patchProductionFootprint(file){
  const before = read(file); let src = before;

  if (file === 'tests/pretrade-risk-rules-boundary-contract.test.js') {
    const old = "const allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL,JOURNAL_CORE_REL];";
    const next = "const allowedProduction=['index.html',MODULE_REL,TECHNICALS_REL,MODAL_REL,MCX_MODULE_REL,MCX_VIX_MODULE_REL,MCX_BACKEND_CANDLES_REL,JOURNAL_CORE_REL,'js/services/mcx-regime-policy.js'];";
    src = one(src, old, next, 'pretrade risk-rules production footprint');
    write(file, src, before);
    return;
  }

  const re = /same\\(changedProduction,\\s*\\[([\\s\\S]*?)\\]\\.sort\\(\\)/g;
  const matches = Array.from(src.matchAll(re));
  if (matches.length !== 1) throw new Error(file + ': expected one changedProduction assertion, got ' + matches.length);
  const m = matches[0];
  const body = m[1];
  if (body.includes('mcx-regime-policy.js')) throw new Error(file + ': regime footprint already present');
  const trimmed = body.replace(/\\s+$/, '');
  const comma = trimmed.trim().endsWith(',') ? '' : ',';
  const next = m[0].replace(body, trimmed + comma + "'js/services/mcx-regime-policy.js'");
  src = src.slice(0, m.index) + next + src.slice(m.index + m[0].length);
  write(file, src, before);
}`;

src = src.slice(0, start) + replacement + src.slice(end);
const out = '/tmp/temporary-mcx-regime-policy-repair-v3-exec.js';
fs.writeFileSync(out, src);
require(out);

// The DSB load-time profiler intentionally keeps complex literal initialisers in
// its visible residue. Regime Policy therefore belongs in that exact visible
// set, but unlike backend-config it performs no call at load time. Preserve the
// profiler's sensitivity and prove this newly visible owner is declaration-only
// rather than broadening the exemption threshold.
{
  const file = path.resolve('tests/backend-directional-snapshot-boundary-contract.test.js');
  let dsb = fs.readFileSync(file, 'utf8');
  const oldBlock = `  deepEq(withTopLevel.map(function (p) { return p.name; }),
    ['./js/config/backend-config.js'].concat(STRESS_COMPANION_SCRIPTS),
    'of the extracted modules, only backend-config.js and the Stress companion constants execute anything at load time');
  PESS_EXTRACTION_SCRIPTS.forEach(function (src) {`;
  const newBlock = `  deepEq(withTopLevel.map(function (p) { return p.name; }),
    ['./js/config/backend-config.js'].concat(STRESS_COMPANION_SCRIPTS).concat(['./js/services/mcx-regime-policy.js']),
    'the visible top-level residue is exactly backend-config.js, Stress constants and Regime Policy literal data');
  const regimePolicyPart = APP_PARTS.find(function (p) { return p.name === './js/services/mcx-regime-policy.js'; });
  ok(!!regimePolicyPart, 'Regime Policy is present for explicit load-time residue proof');
  const regimePolicyTopLevel = stripFunctions(maskSource(regimePolicyPart.code));
  ok(!/\\(/.test(regimePolicyTopLevel), 'Regime Policy performs NO call at load time');
  ok(!/(?<![A-Za-z0-9_$.])(?:S|WL|BACKEND|window|globalThis|document|localStorage)(?![A-Za-z0-9_$])/.test(regimePolicyTopLevel),
     'Regime Policy reads NO shared application/browser global at load time');
  const regimePolicyAssignments = regimePolicyTopLevel.match(/(?:^|\\n)\\s*[A-Za-z_$][A-Za-z0-9_$.]*\\s*=/g) || [];
  deepEq(regimePolicyAssignments, [], 'Regime Policy assigns to no pre-existing binding at load time');
  PESS_EXTRACTION_SCRIPTS.forEach(function (src) {`;
  const hits = dsb.split(oldBlock).length - 1;
  if (hits !== 1) throw new Error('REPAIR_V3_DSB_TOP_LEVEL_CLASSIFICATION: expected 1 exact match, got ' + hits);
  dsb = dsb.replace(oldBlock, newBlock);
  fs.writeFileSync(file, dsb);
}

// Journal Core is older than this extraction, so reconstruction must undo the
// newest Regime Policy layer first. The helper's exported name is intentionally
// explicit; keep the repair fail-closed on that exact API rather than aliasing it.
{
  const file = path.resolve('tests/journal-core-boundary-contract.test.js');
  let journal = fs.readFileSync(file, 'utf8');
  const oldCall = 'const preRegime = REGIME_U.undoRegimePolicy(INDEX, REGIME_MODULE);';
  const newCall = 'const preRegime = REGIME_U.undoMcxRegimePolicy(INDEX, REGIME_MODULE);';
  const hits = journal.split(oldCall).length - 1;
  if (hits !== 1) throw new Error('REPAIR_V3_JOURNAL_UNDO_SYMBOL: expected 1 exact match, got ' + hits);
  journal = journal.replace(oldCall, newCall);
  fs.writeFileSync(file, journal);
}
