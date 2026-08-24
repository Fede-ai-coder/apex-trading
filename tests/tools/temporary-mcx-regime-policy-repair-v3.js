'use strict';
const fs = require('fs');
const path = require('path');

const sourcePath = path.resolve('tests/tools/temporary-mcx-regime-policy-repair.js');
let src = fs.readFileSync(sourcePath, 'utf8');
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
