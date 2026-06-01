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

// 8. Forced VIX-family refresh (regime freshness, req D) ----------------------
// refreshSharedMarketRegime(reason, {force:true}) must bypass the cached-reuse
// short-circuit in _ensureVixFamily and actually re-fetch the VIX family, then
// call _regimeRefresh() to update BOTH the dashboard compact alert and MCX alert.
const sharedRegimeBody = fnBody('refreshSharedMarketRegime');
check('refreshSharedMarketRegime exists', sharedRegimeBody.length > 0);
check('refreshSharedMarketRegime accepts an opts arg',
  /function refreshSharedMarketRegime\s*\(\s*reason\s*,\s*opts\s*\)/.test(SRC));
check('force flag derived from opts.force === true',
  sharedRegimeBody.includes('opts.force === true'));
check('force path calls real fetchVixFamily() (not just _ensureVixFamily reuse)',
  sharedRegimeBody.includes('fetchVixFamily('));
check('force path dedupes concurrent fetch via _vixFamilyPending',
  sharedRegimeBody.includes('_vixFamilyPending'));
check('non-force path still uses deduped _ensureVixFamily',
  sharedRegimeBody.includes('_ensureVixFamily'));
check('calls _regimeRefresh() after the fetch (updates dashboard + MCX alerts)',
  sharedRegimeBody.includes('_regimeRefresh('));
check('logs [VIX][REFRESH] on forced refresh',
  sharedRegimeBody.includes('[VIX][REFRESH]'));

// Dashboard open + MCX open must request a forced refresh.
const showViewBody = fnBody('showView');
check('Dashboard open forces refresh: dashboard_open with { force: true }',
  /refreshSharedMarketRegime\(\s*'dashboard_open'\s*,\s*\{\s*force:\s*true\s*\}\s*\)/.test(SRC));
check('MCX open forces refresh: mcx_open with { force: true }',
  /refreshSharedMarketRegime\(\s*'mcx_open'\s*,\s*\{\s*force:\s*true\s*\}\s*\)/.test(SRC));
const mcxInitBody2 = fnBody('_mcxInit');
check('MCX open path (_mcxInit) invokes the forced shared-regime refresh',
  mcxInitBody2.includes("refreshSharedMarketRegime('mcx_open', { force: true })"));
// Forced VIX refresh must not introduce Yahoo or a new WebSocket of its own.
check('forced regime refresh introduces no Yahoo', !/yahoo/i.test(sharedRegimeBody));
check('forced regime refresh creates no new WebSocket', !sharedRegimeBody.includes('new WebSocket'));

// 9. Dashboard VIX/regime 60s auto-refresh timer (req: keep VIX fresh while open)
const startDashRegimeBody = fnBody('_startDashboardRegimeRefresh');
const stopDashRegimeBody  = fnBody('_stopDashboardRegimeRefresh');
check('_startDashboardRegimeRefresh exists', startDashRegimeBody.length > 0);
check('_stopDashboardRegimeRefresh exists', stopDashRegimeBody.length > 0);
check('dedicated dashboard regime timer var declared', SRC.includes('_dashboardRegimeRefreshTimer'));
check('dashboard regime pending guard var declared', SRC.includes('_dashboardRegimeRefreshPending'));
check('dashboard regime last-refresh timestamp var declared', SRC.includes('_dashboardRegimeLastRefreshAt'));
check('dashboard regime timer uses a single 60s setInterval',
  (startDashRegimeBody.match(/setInterval/g) || []).length === 1 && startDashRegimeBody.includes('60000'));
check('dashboard regime timer only starts when _activeView === \'dashboard\'',
  startDashRegimeBody.includes("_activeView !== 'dashboard'"));
check('dashboard regime timer only starts when S.ttConnected',
  startDashRegimeBody.includes('S.ttConnected'));
check('dashboard regime timer clears any prior timer first (no duplicates)',
  startDashRegimeBody.includes('_stopDashboardRegimeRefresh()'));
check('dashboard regime timer honours a pending guard',
  startDashRegimeBody.includes('_dashboardRegimeRefreshPending'));
check('dashboard regime timer calls refreshSharedMarketRegime(dashboard_auto_60s, {force:true})',
  /refreshSharedMarketRegime\(\s*'dashboard_auto_60s'\s*,\s*\{\s*force:\s*true\s*\}\s*\)/.test(startDashRegimeBody));
check('dashboard regime timer never renders MCX charts',
  !startDashRegimeBody.includes('_mcxRenderCharts'));
check('_stopDashboardRegimeRefresh clears the interval', stopDashRegimeBody.includes('clearInterval'));
// showView wiring: dashboard open starts the timer; leaving dashboard stops it.
check('showView starts dashboard regime timer on dashboard open',
  showViewBody.includes('_startDashboardRegimeRefresh('));
check('showView stops dashboard regime timer when leaving dashboard',
  showViewBody.includes('_stopDashboardRegimeRefresh('));
check('dashboard regime auto-refresh emits non-spammy [VIX][REFRESH] (via refreshSharedMarketRegime)',
  startDashRegimeBody.includes('dashboard_auto_60s') && sharedRegimeBody.includes('[VIX][REFRESH]'));

// 7. Trigger path: MCX open/refresh invokes the snapshot-aware refresh ---------
// Regression guard for the bug where _mcxInit() called _ensureVixFamily() directly,
// so the backend snapshot bridge never fired on MCX open (flag ON).
const initBody = fnBody('_mcxInit');
check('_mcxInit exists', initBody.length > 0);
check('MCX open path (_mcxInit) invokes _mcxRefreshVixData()',
  initBody.includes('_mcxRefreshVixData('));
check('MCX open path no longer invokes _ensureVixFamily() directly (avoids DXLink pre-fill race)',
  !initBody.includes('_ensureVixFamily('));
const refreshBody = fnBody('_mcxRefresh');
check('MCX refresh path (_mcxRefresh) invokes _mcxRefreshVixData()',
  refreshBody.includes('_mcxRefreshVixData('));
// Single 60s interval only — no duplicate timer / double fetch in start-auto-refresh.
const startBody = fnBody('_mcxStartAutoRefresh');
check('_mcxStartAutoRefresh owns exactly one setInterval (no duplicate timer)',
  (startBody.match(/setInterval/g) || []).length === 1);
// Diagnostic logs required by the bridge.
check('logs "[MCX-SNAPSHOT] refresh requested" when flag ON', refreshVixBody.includes('[MCX-SNAPSHOT] refresh requested'));
check('logs "[MCX-SNAPSHOT] VIX family bridged from backend" on successful bridge',
  applyBody.includes('[MCX-SNAPSHOT] VIX family bridged from backend'));

// ---------------------------------------------------------------------------
console.log('\n' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) {
  console.log('FAILED:\n - ' + failures.join('\n - '));
  process.exit(1);
}
console.log('ALL TESTS PASSED');
