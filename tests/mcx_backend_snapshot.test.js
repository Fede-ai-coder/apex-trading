#!/usr/bin/env node
/*
 * Static source-level tests for the MCX Backend Snapshot V1 bridge.
 *
 * index.html is a single monolithic file (no module system / no DOM test harness),
 * so these are lightweight static assertions over the source text. They guard the
 * V1 scope contract: feature-flag behaviour, the backend fetch helper, the
 * production backend guard, graceful fallback, and the "do not migrate" limits.
 *
 * Run: node tests/mcx_backend_snapshot.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let passed = 0;
const failures = [];
function check(name, cond) {
  if (cond) { passed++; console.log('  PASS ' + name); }
  else { failures.push(name); console.log('  FAIL ' + name); }
}
// Extract a function body by brace matching, starting at `function <name>`.
function fnBody(name) {
  const start = SRC.indexOf('function ' + name);
  if (start === -1) return '';
  const open = SRC.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    const c = SRC[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return SRC.slice(start, i + 1); }
  }
  return SRC.slice(start);
}

console.log('MCX Backend Snapshot bridge - static tests\n');

// 1. Feature flag: name + default/override behaviour --------------------------
const flagBody = fnBody('ffMcxBackendSnapshot');
check('feature flag function ffMcxBackendSnapshot exists', flagBody.length > 0);
check('flag key is apex_ff_mcx_backend_snapshot', SRC.includes("getItem('apex_ff_mcx_backend_snapshot')"));
check("localStorage '1' override returns true", /v === '1'\)?\s*return true/.test(flagBody) || flagBody.includes("=== '1') return true"));
check("localStorage '0' override returns false", flagBody.includes("=== '0') return false"));
check('production default is OFF (no unconditional return true)', flagBody.length > 0 && !/^\s*return true;/m.test(flagBody.replace(/.*=== '1'.*\n/g, '')));
check('flag default gated on localhost/deploy-preview (matches app convention)',
  flagBody.includes("'localhost'") && flagBody.includes('deploy-preview'));

// 2. Backend fetch helper -----------------------------------------------------
const fetchBody = fnBody('fetchMarketContextSnapshotFromBackend');
check('fetchMarketContextSnapshotFromBackend exists', fetchBody.length > 0);
check('fetch helper calls /market-context/snapshot', fetchBody.includes('/market-context/snapshot'));
check('fetch helper uses ttCall (which sets x-api-key header)', fetchBody.includes('ttCall('));
check('ttCall applies x-api-key header from S.backendKey',
  /x-api-key'?\]?\s*=\s*S\.backendKey/.test(SRC) || SRC.includes("h['x-api-key'] = S.backendKey") || SRC.includes("headers['x-api-key']=S.backendKey"));
check('fetch helper is wrapped in try/catch (no throw into render loop)',
  fetchBody.includes('try') && fetchBody.includes('catch'));
check('fetch helper returns structured failure (ok:false) rather than throwing',
  fetchBody.includes('ok:false'));

// 3. Production backend URL guard not changed to dev --------------------------
check('PROD_BACKEND points to production railway host',
  SRC.includes("const PROD_BACKEND = 'https://apex-tastytrade-backend-production.up.railway.app'"));
check('DEV_BACKEND still distinct dev host',
  SRC.includes("https://apex-tastytrade-backend-dev-production.up.railway.app"));
const resolveBody = fnBody('resolveBackendUrl');
check('resolveBackendUrl defaults to PROD_BACKEND (production not hardcoded to dev)',
  resolveBody.includes('return PROD_BACKEND'));
check('snapshot code does not hardcode the dev backend URL',
  !(fetchBody.includes('backend-dev-production')));

// 4. Fallback behaviour -------------------------------------------------------
const refreshVixBody = fnBody('_mcxRefreshVixData');
check('_mcxRefreshVixData exists', refreshVixBody.length > 0);
check('falls back to existing _ensureVixFamily flow', refreshVixBody.includes('_ensureVixFamily'));
check('flag OFF path preserves current behavior (_ensureVixFamily + _mcxDrawVixCurve)',
  refreshVixBody.includes('ffMcxBackendSnapshot()') && refreshVixBody.includes('_mcxDrawVixCurve'));
const applyBody = fnBody('_mcxApplyBackendSnapshot');
check('apply requires finite VIX values before bridging', applyBody.includes('_mcxFiniteNum'));
check('apply rejects UNAVAILABLE vix source', applyBody.includes("'UNAVAILABLE'"));
check('apply bridges vi3m -> vix3m naming', applyBody.includes('vix3m: vf.vi3m'));

// 5. Scope limits: no migration / no new infra -------------------------------
const snapshotRegion = [flagBody, fetchBody, applyBody, refreshVixBody,
  fnBody('_mcxUpdateSnapshotStatus')].join('\n');
check('no Yahoo fallback introduced by snapshot bridge', !/yahoo/i.test(snapshotRegion));
check('no new WebSocket created by snapshot bridge', !snapshotRegion.includes('new WebSocket'));
check('chart pipeline preserved (_mcxRenderCharts still present)', SRC.includes('_mcxRenderCharts'));
check('existing DXLink VIX fetch preserved (fetchVixFamily still present)', SRC.includes('function fetchVixFamily'));
check('technicals stored for inspection, not migrated into charts',
  applyBody.includes('st.technicals = d.technicals'));

// 6. State container ----------------------------------------------------------
check('S.marketContextSnapshot state container added', SRC.includes('marketContextSnapshot:'));

// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('ALL TESTS PASSED');
