'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = (html.match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';

assert.match(html, /id="scanArea" class="scan-area"/,
  'Market Scanner uses the dedicated viewport layout class');
assert.match(html, /id="scanResults" class="scan-results"/,
  'results use the dedicated internal scroll region');
assert.match(css, /\.main\{[^}]*overflow-y:auto;[^}]*overflow-x:hidden;[^}]*min-height:0;/,
  'the center column retains intentional external vertical scrolling');
assert.doesNotMatch(css, /\.main\{[^}]*overflow:hidden;/,
  'the center column does not clip lower detail panels');
assert.match(css, /\.dashboard-primary-viewport\{[^}]*flex:0 0 100%;[^}]*height:100%;[^}]*min-height:0;[^}]*display:flex;[^}]*flex-direction:column;/,
  'the primary dashboard content owns exactly the first center-column viewport');
assert.match(css, /\.scan-area\{[^}]*flex:1 1 auto;[^}]*min-height:0;[^}]*overflow:hidden;/,
  'Market Scanner receives remaining height and contains page-level overflow');
assert.match(css, /\.scan-results\{[^}]*flex:1 1 auto;[^}]*min-height:0;[^}]*overflow:auto;/,
  'result body grows, can shrink, and scrolls internally');
assert.match(css, /\.rt th\{[^}]*position:sticky;[^}]*top:0;/,
  'result column headers remain sticky');
assert.doesNotMatch(html, /id="scanArea"[^>]*(?:max-height:52%|overflow-y:auto)/,
  'the old scanner height cap and nested outer scroll are removed');
assert.match(css, /\.bss-body\{[^}]*max-height:min\(34dvh,360px\);[^}]*overflow-y:auto;/,
  'expanded Backend Snapshot is bounded responsively and scrolls internally');

const primaryStart = html.indexOf('<div class="dashboard-primary-viewport">');
const primaryEnd = html.indexOf('</div><!-- /dashboard-primary-viewport -->');
assert.ok(primaryStart >= 0 && primaryEnd > primaryStart,
  'primary viewport wrapper has explicit, auditable boundaries');
const primary = html.slice(primaryStart, primaryEnd);
['dash-regime-wrap', 'scanArea', 'bss-panel'].forEach((id) => {
  assert.match(primary, new RegExp(`id="${id}"`), `${id} is inside the primary viewport`);
});
['dssDetailWrap', 'scannerInlineChartPanel', 'rsDetailWrap', 'chatArea', 'chartWrap'].forEach((id) => {
  assert.doesNotMatch(primary, new RegExp(`id="${id}"`), `${id} remains outside the primary viewport`);
  assert.ok(html.indexOf(`id="${id}"`) > primaryEnd, `${id} follows the primary viewport in external scroll flow`);
});
assert.ok(html.indexOf('id="schart-big-wrap-4h"') > primaryEnd,
  'the inline scanner 4H chart remains in the externally scrollable section');
assert.ok(html.indexOf('id="dss-big-wrap-4h"') > primaryEnd,
  'Directional detail remains reachable through center-column scrolling');
assert.ok(html.indexOf('id="rs-big-wrap-4h"') > primaryEnd,
  'RS detail remains reachable through center-column scrolling');

console.log('dashboard-market-scanner-layout: all assertions passed');


// RV pilot panel integration uses an existing test file: extraction contracts
// pin the repository's EXACT number of test files and the js/** footprint.
const rv = require('../devtools/rv-pilot-audit.js');
const day = '2026-10-26';
const digest = 'a'.repeat(64);
const sampleRow = (n) => ({
  symbol:'T'+String(n).padStart(2,'0'),
  sessionKindPolicy:{covered:false,basis:'POLICY_SYMBOL_NOT_COVERED'},
  corporateActions:{status:'NOT_ASSESSED'},
  rv20:{status:'UNAVAILABLE',value:null,reasons:['RV20_GAP_IN_WINDOW'],blockers:{NO_STORED_CANDLE:1},
    validatedSessions:20,closesRequired:21,returnsUsed:0,inputsDigest:null,priceAdjustment:null,windowThrough:day},
  rv60:{status:'UNAVAILABLE',value:null,reasons:['RV60_GAP_IN_WINDOW'],blockers:{NO_STORED_CANDLE:1},
    validatedSessions:60,closesRequired:61,returnsUsed:0,inputsDigest:null,priceAdjustment:null,windowThrough:day},
  evidence:{independentStandardAcquisitions:0}
});
const pilotRows = Array.from({length:20},(_,n)=>sampleRow(n));
const pilotPages = () => Array.from({length:4},(_,i)=>({
  ok:true,readOnly:true,memberSource:'iv_pilot_members',memberCount:20,
  membershipHash:digest,offset:i*5,limit:5,returned:5,rows:pilotRows.slice(i*5,i*5+5)
}));
const devBackend='https://apex-tastytrade-backend-dev-production.up.railway.app';
assert.equal(rv.devContext('localhost',devBackend),true);
assert.equal(rv.devContext('spontaneous-queijadas-118823.netlify.app',devBackend),false);
assert.equal(rv.devContext('localhost','https://apex-tastytrade-backend-production.up.railway.app'),false);
assert.equal(rv.devContext('deploy-preview-545--spontaneous-queijadas-118823.netlify.app',devBackend),true);
const merged=rv.combinePages(pilotPages());
assert.equal(merged.rows.length,20);
assert.equal(rv.summarizeRows(merged.rows).policyBlocked,20);
assert.equal(rv.summarizeRows(merged.rows).missingCandle,20);
const drifting=pilotPages();
drifting[2].membershipHash='b'.repeat(64);
assert.throws(()=>rv.combinePages(drifting),/INCONSISTENT_PAGE/);
const duplicate=pilotPages();
duplicate[3].rows[0]=duplicate[0].rows[0];
assert.throws(()=>rv.combinePages(duplicate),/INCONSISTENT_ROW/);
const validWindow={status:'AVAILABLE',value:0.15,returnsUsed:20,validatedSessions:21,
  closesRequired:21,inputsDigest:digest};
assert.equal(rv.available(validWindow),true);
assert.equal(rv.available({...validWindow,inputsDigest:null}),false);
assert.equal(rv.available({...validWindow,validatedSessions:20}),false);
assert.equal(rv.available({...validWindow,status:'UNAVAILABLE'}),false);
const malicious={...pilotRows[0],rv20:{...pilotRows[0].rv20,reasons:['<img src=x onerror=alert(1)>']}};
const rendered=rv.renderTable({membershipHash:digest,rows:[malicious]});
assert.ok(rendered.includes('&lt;img'));
assert.ok(!rendered.includes('<img'));
assert.ok(!rendered.includes('x-api-key'));
// Historical extraction contracts pin the full SHA256 of index.html.
// This feature does NOT alter the document or modify its JS script count.
assert.doesNotMatch(html, /devtools\/rv-pilot-audit\.js/);
assert.equal((html.match(/<script\b/gi) || []).length, 115);
const uiSource=fs.readFileSync(path.join(__dirname, '..', 'devtools', 'rv-pilot-audit.js'),'utf8');
assert.match(uiSource,/setTimeout\(\(\) => controller\.abort\(\), 20000\)/);
assert.match(uiSource,/if \(current !== controller \|\| host !== runHost\) return;/);
assert.match(uiSource,/if \(current === controller && host === runHost\)/);
assert.doesNotMatch(uiSource,/localStorage|sessionStorage/);


// Exercise the actual browser lifecycle, not only source-code regexes. A late
// resolved fetch must neither enqueue more requests nor corrupt a reopened UI.
// A late timeout from the cancelled run must not abort the new controller.
const vm = require('vm');
async function testRvCloseReopenLifecycle() {
  const roots = [], hosts = [], requests = [], timeouts = [];
  let launcher = null;
  function element() {
    return {
      style: {}, handlers: {}, textContent: '', innerHTML: '',
      addEventListener(type, fn) { this.handlers[type] = fn; },
      setAttribute() {},
      focus() { this.focused = true; },
      remove() { this.removed = true; },
      click() { return this.handlers.click(); }
    };
  }
  const document = {
    readyState: 'complete',
    getElementById(id) { return id === 'apex-rv-pilot-launcher' ? launcher : null; },
    createElement(tag) {
      const el = element();
      if (tag === 'div') {
        const fields = Object.fromEntries(
          ['run', 'runD4', 'state', 'results', 'close'].map(id => [id, element()]));
        fields.shade = element();
        const root = {
          fields, getElementById(id) { return fields[id]; },
          querySelector(selector) {
            assert.equal(selector, '.shade');
            return fields.shade;
          }
        };
        el.attachShadow = () => root;
        roots.push(root);
        hosts.push(el);
      }
      return el;
    },
    body: {
      appendChild(el) {
        if (el.id === 'apex-rv-pilot-launcher') launcher = el;
      }
    }
  };
  const context = {
    module: { exports: {} }, document,
    window: { location: { hostname: 'deploy-preview-545--spontaneous-queijadas-118823.netlify.app' } },
    BACKEND: devBackend, S: { backendKey: 'fixture-only-api-key' },
    AbortController,
    setTimeout(fn) { timeouts.push(fn); return timeouts.length; },
    clearTimeout() {},
    fetch(url, options) {
      return new Promise(resolve => requests.push({ url, options, resolve }));
    }
  };
  vm.runInNewContext(uiSource, context, { filename: 'rv-pilot-audit.js' });
  assert.ok(launcher, 'DEV launcher mounts on the exact preview hostname');

  launcher.click();
  const first = roots[0].fields;
  const firstRun = first.run.click();
  assert.equal(requests.length, 1, 'first run begins with one GET');
  await first.run.click();
  assert.equal(requests.length, 1, 'concurrent click cannot enqueue duplicate GET');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers['x-api-key'], 'fixture-only-api-key');
  assert.ok(requests[0].url.startsWith(devBackend + '/debug/volatility-carry/rv-pilot-readiness?'));
  first.close.click();
  assert.equal(hosts[0].removed, true);
  assert.equal(requests[0].options.signal.aborted, true, 'close aborts only the old run');

  launcher.click();
  assert.equal(roots.length, 2, 'open creates an independent panel');
  const second = roots[1].fields;
  const secondRun = second.run.click();
  assert.equal(requests.length, 2, 'reopen starts another run');
  await second.run.click();
  assert.equal(requests.length, 2, 'second panel also serializes concurrent clicks');
  timeouts[0]();  // Deliberately fire an obsolete timer even after clearTimeout.
  assert.equal(requests[1].options.signal.aborted, false,
    'stale timer cannot abort a newly opened run');

  // Simulate a network API that resolves despite abort(), as JSON parsing can.
  requests[0].resolve({ ok: true, status: 200, json: async () => pilotPages()[0] });
  await new Promise(resolve => setImmediate(resolve));
  await firstRun;
  assert.equal(requests.length, 2, 'old run cannot enqueue page 2 after closing');
  assert.equal(second.state.textContent.startsWith('Lettura 1/4'), true,
    'old completion does not overwrite the reopened status');

  const pages = pilotPages();
  for (let i = 0; i < 4; i++) {
    requests[i + 1].resolve({ ok: true, status: 200, json: async () => pages[i] });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.length, Math.min(2 + i + 1, 5),
      'only the live run advances one page at a time');
  }
  await secondRun;
  assert.match(second.state.textContent, /Completato: 20 membri verificati/);
  assert.match(second.results.innerHTML, /T19/);
  assert.equal(second.run.disabled, false, 'button is restored');
  assert.equal(requests[1].options.signal.aborted, false);
  second.shade.click();
  assert.equal(hosts[1].removed, true, 'backdrop closes the completed panel');
}
assert.equal(rv.devContext('evil-deploy-preview.netlify.app', devBackend), false,
  'DEV host check rejects unrelated preview hosts');
assert.equal(rv.devContext('deploy-preview-545--spontaneous-queijadas-118823.netlify.app.evil.example', devBackend), false,
  'DEV host check rejects deceptive suffixes');
// Historical extraction scopes must reject rogue files WITHIN an extraction,
// while ignoring later commits that do not touch an extraction-owned artifact.
{
  const scope = require('./lib/extraction-change-scope');
  const contract = path.join(__dirname, 'ai-scan-context-boundary-contract.test.js');
  const owners = scope.contractOwners(contract);
  assert.ok(owners.includes('js/services/ai-scan-context.js'));
  assert.ok(owners.includes('tests/ai-scan-context-boundary-contract.test.js'));
  const git = (args) => require('child_process').execFileSync('git', args, {
    cwd: path.join(__dirname, '..'), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024
  });
  const historical = scope.historicalChangedFiles(git, 'aa76d50', contract).split('\n').filter(Boolean);
  assert.ok(historical.includes('js/services/ai-scan-context.js'),
    'the real audited original extraction remains included');
  assert.equal(historical.includes('devtools/rv-pilot-audit.js'), false,
    'the real later RV preview module does not become an AI scan extraction');
  assert.equal(historical.includes('devtools/README.md'), false,
    'later preview docs are not retroactively attributed to the old extraction');
  assert.equal(scope.ownsCommit(['devtools/rv-pilot-audit.js', 'tests/dashboard-market-scanner-layout.test.js'], owners), false,
    'unrelated DEV feature does not become an older extraction');
  assert.equal(scope.ownsCommit(['js/services/ai-scan-context.js', 'devtools/sneaky.js'], owners), true,
    'an undeclared file riding an owner commit remains attributable');
  assert.deepStrictEqual(scope.includeOwnedCommits(
    ['index.html', 'js/services/ai-scan-context.js'],
    [
      { touched: ['devtools/rv-pilot-audit.js', 'devtools/README.md'] },
      { touched: ['js/services/ai-scan-context.js', 'devtools/undeclared.js'] },
      { touched: ['tests/dashboard-market-scanner-layout.test.js', 'devtools/another-new-file.js'] },
    ],
    owners
  ), ['devtools/undeclared.js', 'index.html', 'js/services/ai-scan-context.js'],
  'historical digest paths remain, unrelated commits vanish, unauthorized owner-commit files survive');
}
testRvCloseReopenLifecycle().catch(error => {
  console.error('rv-pilot close/reopen lifecycle failed:', error);
  process.exitCode = 1;
});

// D4 preflight assertions share the existing DEV RV panel suite to preserve
// the repository's ratcheted count of 197 test files.


const {renderD4Preflight} = require('../devtools/rv-pilot-audit.js');
const make = () => ({
  ok:true, readOnly:true, executionAuthorized:false, liveAcquisitionsStarted:false,
  version:'RV_D4_PROVIDER_PREFLIGHT_V1',
  decision:'NO_GO_UNTIL_PROVIDER_AND_EVIDENCE_GATES_VERIFIED',
  blockers:['ACCOUNT_WIDE_DXLINK_SESSION_BUDGET_UNVERIFIED'],
  providerBudget:{sessionsLimitVerified:false,entitlementVerified:false,quoteTokenRequestBudgetVerified:false},
  symbols:['AAPL','SPY'].map(symbol=>({symbol,rv20:{status:'UNAVAILABLE'},
    rv60:{status:'UNAVAILABLE'},pendingSessionEvidence:{rv20:[{sessionDate:'2026-10-26',reason:'NOT_VALIDATED'}],rv60:[]}}))
});
require('node:test')('renders NO-GO for AAPL and SPY',()=>{
  const html=renderD4Preflight(make());
  assert.match(html,/NO-GO/);
  assert.match(html,/AAPL/);
  assert.match(html,/SPY/);
});
require('node:test')('rejects unsafe or incomplete responses',()=>{
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

require('node:test')('renders structured pending session evidence, not object coercion',()=>{
  const html=renderD4Preflight(make());
  assert.ok(html.includes('2026-10-26 (NOT_VALIDATED)'));
  assert.ok(!html.includes('[object Object]'));
});

require('node:test')('D4 preflight explains unavailable SQLite gate and NYSE close+45m without granting GO',()=>{
  const d=make();
  d.admission={available:false,reason:'D2_LEDGER_ABSENT',activeLease:null,startsPastHour:null};
  d.timing={todayIsSession:true,afterCloseGrace:false,closeEpochMs:Date.parse('2026-10-27T20:00:00Z')};
  const html=renderD4Preflight(d);
  assert.match(html,/Gate SQLite: disponibile NO/);
  assert.match(html,/D2_LEDGER_ABSENT/);
  assert.match(html,/dopo close\+45m NO/);
  assert.match(html,/2026-10-27T20:45:00\.000Z/);
  assert.match(html,/non autorizza acquisizioni/);
  assert.match(html,/Nessuna acquisizione autorizzata/);
});

require('node:test')('D4 preflight treats absent/invalid timing and unknown gate reason conservatively',()=>{
  const d=make(); d.admission={available:false};
  d.timing={todayIsSession:false,afterCloseGrace:false,closeEpochMs:Infinity};
  const html=renderD4Preflight(d);
  assert.match(html,/NON_RIPORTATO/);
  assert.match(html,/non verificabile/);
  assert.match(html,/dopo close\+45m NO/);
});

require('node:test')('D4 gate diagnostic reason is HTML escaped',()=>{
  const d=make();d.admission={available:false,reason:'<script>alert(1)</script>'};
  const html=renderD4Preflight(d);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});


require('node:test')('D4 evidence per session discloses stored, structural and independent acquisition facts without asserting finality',()=>{
  const d=make();
  d.symbols[0].rv20={status:'UNAVAILABLE',validatedSessions:19,closesRequired:21,reasons:['RV20_NOT_FINAL']};
  d.symbols[0].pendingSessionEvidence.rv20=[
    {sessionDate:'2026-10-26',reason:'UNVERIFIED',stored:true,structurallyValid:true,
      distinctAcquisitions:1,observationSpanMs:0},
    {sessionDate:'2026-10-27',reason:'UNVERIFIED',stored:true,structurallyValid:true,
      distinctAcquisitions:2,observationSpanMs:900000}
  ];
  const body=renderD4Preflight(d);
  assert.match(body,/Verifica delle singole sedute \(2\)/);
  assert.match(body,/2026-10-26 · causa UNVERIFIED · candela salvata SÌ · struttura valida SÌ · acquisizioni distinte 1 · intervallo osservazioni 0 ms/);
  assert.match(body,/2026-10-27 · causa UNVERIFIED · candela salvata SÌ · struttura valida SÌ · acquisizioni distinte 2 · intervallo osservazioni 900000 ms/);
  assert.match(body,/NON bastano da sole a validare/);
  assert.match(body,/limite documentato 5 sessioni simultanee/);
  assert.match(body,/sessioni effettivamente attive, disponibilità residua/);
  assert.match(body,/NON VERIFICATI/);
  assert.match(body,/Nessuna acquisizione autorizzata/);
});

require('node:test')('D4 details never invent missing numbers or accept hostile session metadata',()=>{
  const d=make();
  d.symbols[0].pendingSessionEvidence.rv20=[
    {sessionDate:'2026-10-26',reason:'<img src=x onerror=alert(1)>',
      stored:null,structurallyValid:undefined,distinctAcquisitions:Infinity,
      observationSpanMs:-1},
    {sessionDate:'2026-10-27',reason:'UNVERIFIED',stored:false,structurallyValid:false,
      distinctAcquisitions:0,observationSpanMs:0},
    {sessionDate:'javascript:alert(1)',reason:'BAD'}
  ];
  d.symbols[1].pendingSessionEvidence.rv20=null;
  const body=renderD4Preflight(d);
  assert.doesNotMatch(body,/<img/);
  assert.match(body,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(body,/candela salvata NON NOTO · struttura valida NON NOTO · acquisizioni distinte NON NOTO · intervallo osservazioni NON NOTO ms/);
  assert.match(body,/candela salvata NO · struttura valida NO · acquisizioni distinte 0 · intervallo osservazioni 0 ms/);
  assert.match(body,/Elemento non verificabile/);
  assert.match(body,/Dettagli sedute: non verificabili/);
  assert.doesNotMatch(body,/javascript:alert/);
});

require('node:test')('D4 triage module and launcher remain strictly GET-only and do not touch credentials or flags',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','devtools','rv-pilot-audit.js'),'utf8');
  assert.doesNotMatch(source,/method:\s*['"]POST['"]/);
  assert.doesNotMatch(source,/localStorage|sessionStorage|VOLATILITY_CARRY_D4_PROVIDER_BUDGET_ATTESTED/);
  assert.doesNotMatch(source,/new WebSocket|FEED_SUBSCRIPTION|prepare-admission/);
  assert.match(source,/fetchD4Preflight\(S\.backendKey, controller\.signal\)/);
});

// ── Volatility Coverage & Spread Monitor (devtools/volatility-coverage-monitor.js) ──────────────────────────────────
// Same file, same reason as the RV and D4 panels above: the suite's file count is ratcheted. Every fixture below
// mirrors the backend's VOLATILITY_COVERAGE_V1 rows; the values are SYNTHETIC.
const cov = require('../devtools/volatility-coverage-monitor.js');
const covSource = fs.readFileSync(path.join(__dirname, '..', 'devtools', 'volatility-coverage-monitor.js'), 'utf8');
const COV_DIGEST = 'c'.repeat(64);
const COV_HOSTILE = '<img src=x onerror=alert(1)>';
function covWindow(n, value, basis, extra) {
  const certified = basis === 'CERTIFIED';
  return Object.assign({
    value, basis: value === null ? null : basis, closesRequired: n + 1,
    certified: { status: certified ? 'AVAILABLE' : 'UNAVAILABLE', value: certified ? value : null,
      reasons: certified ? [] : ['RV' + n + '_NOT_FINAL'], validatedSessions: certified ? n + 1 : 0,
      finalityBasis: certified ? 'OBSERVED_STABLE' : null, priceAdjustment: 'UNVERIFIED_NO_JUMP_DETECTED',
      windowFrom: '2026-09-25', windowThrough: '2026-10-23', inputsDigest: null },
    stored: null,
    coverage: { required: n + 1, present: n + 1, structurallyValid: n + 1, validated: certified ? n + 1 : 0,
      absent: 0, presentNotValid: 0, validNotFinal: certified ? 0 : n + 1, validNotRegular: 0, missing: certified ? 0 : n + 1 },
    lastCertified: null,
  }, extra || {});
}
function covRow(symbol, position, o) {
  o = o || {};
  const iv = o.iv === undefined ? null : o.iv;
  const spread = v => v === null || v === undefined
    ? { valuePp: null, basis: null, missing: [{ operand: 'IV_REF', reason: iv === null ? 'NOT_IN_IV_PILOT' : 'X' }] }
    : { valuePp: v, basis: o.basis === 'PRELIMINARY' ? 'RV_PRELIMINARY' : 'RV_CERTIFIED', missing: [] };
  const reasons = o.reasons || (iv === null ? ['NOT_IN_IV_PILOT'] : []);
  return {
    symbol, universePosition: position, status: o.status || (iv === null ? 'UNAVAILABLE' : 'COMPLETE'),
    primaryReason: reasons[0] || null, reasons,
    asOf: { rvSessionDate: '2026-10-23', ivAsOfDate: iv === null ? null : '2026-10-24',
      ivObservedAt: iv === null ? null : '2026-10-24T15:00:00.000Z', datesDiffer: iv !== null },
    ivRef: { value: iv, status: iv === null ? 'NOT_IN_PILOT' : 'AVAILABLE', reason: iv === null ? 'NOT_IN_IV_PILOT' : null,
      source: 'TASTYTRADE_SELECTED_REGULAR_EXPIRY_IV', version: 'SELECTED_REGULAR_IV_V1', pilotMember: iv !== null,
      asOfDate: '2026-10-24', observedAt: iv === null ? null : '2026-10-24T15:00:00.000Z',
      selectedExpiration: iv === null ? null : '2026-12-04', selectedDte: iv === null ? null : 41,
      settlementType: iv === null ? null : 'PM', census: null, censusState: 'NOT_READ', censusReason: 'CENSUS_DISABLED' },
    rv20: covWindow(20, o.rv20 === undefined ? 0.2 : o.rv20, o.basis || 'EXPLORATORY', o.rv20Extra),
    rv60: covWindow(60, o.rv60 === undefined ? 0.25 : o.rv60, o.basis || 'EXPLORATORY', o.rv60Extra),
    spreads: { ivMinusRv20Pp: spread(o.s20), ivMinusRv60Pp: spread(o.s60) },
    candleQuality: o.candleQuality === undefined ? { storedCandles: 289, structurallyValidCandles: 289, excludedRows: 0,
      excludedByReason: {}, duplicateSessions: 0, lastWindowPresentNotValid: 0, issues: false } : o.candleQuality,
    sessionPolicy: { certifiedCovered: false, certifiedBasis: null, preliminaryCovered: false, storedPolicyStatus: null },
    evidence: { available: false, error: 'NO_OBSERVATIONS_FILE', truncated: false },
    historicalCertified: { state: 'NOT_READ', reason: 'RV_DAILY_DISABLED' },
    errors: o.errors || {},
  };
}
const covSources = () => ({ candles: { source: 'APEX_TT_CANDLE_STORE_1D', readOnly: true },
  observations: { available: true, reason: null, error: null },
  ivPilot: { enabled: true, available: true, reason: null, error: null, members: 3, digest: 'e'.repeat(64),
    version: 'SELECTED_REGULAR_IV_V1' },
  census: { enabled: true, available: true, reason: null, error: null },
  rvDaily: { enabled: false, available: false, reason: 'RV_DAILY_DISABLED', error: null } });
function covPages(symbols, rowFor) {
  const pages = [];
  for (let offset = 0; offset < symbols.length; offset += 25) {
    const rows = symbols.slice(offset, offset + 25).map((s, i) => (rowFor ? rowFor(s, offset + i) : covRow(s, offset + i)));
    pages.push({ ok: true, version: 'VOLATILITY_COVERAGE_V1', readOnly: true, notForTrading: true, executionAuthorized: false,
      generatedAt: '2026-10-24T22:00:0' + pages.length + '.000Z', asOfSessionDate: '2026-10-23', ivAsOfDate: '2026-10-24',
      snapshot: { atomic: false, scope: 'PAGE' },
      universe: { source: 'default:APEX_SCANNER_UNIVERSE', count: symbols.length, digest: COV_DIGEST },
      offset, limit: 25, returned: rows.length,
      nextOffset: offset + rows.length < symbols.length ? offset + rows.length : null, sources: covSources(), rows });
  }
  return pages;
}
const covUniverse = n => Array.from({ length: n }, (_, i) => 'U' + String(i).padStart(3, '0'));
// A mixed page: certified spreads of every sign, preliminary, missing IV, candle issue, stale and error rows.
const covMixed = () => covPages(['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III'], (s, i) => covRow(s, i, ({
  AAA: { iv: 0.3, basis: 'CERTIFIED', s20: 24.86, s60: 25 },
  BBB: { iv: 0.18, basis: 'CERTIFIED', s20: -4.0000000000000036, s60: 0 },
  CCC: { iv: 0.2, basis: 'PRELIMINARY', s20: 0.004, s60: -0.004, status: 'COMPLETE' },
  DDD: {},
  EEE: { rv20: null, rv60: null, reasons: ['NOT_IN_IV_PILOT', 'RV20_INSUFFICIENT_CLOSES'] },
  FFF: { candleQuality: { storedCandles: 289, structurallyValidCandles: 288, excludedRows: 1,
    excludedByReason: { NOT_POSITIVE_PRICE: 1 }, duplicateSessions: 0, lastWindowPresentNotValid: 1, issues: true } },
  GGG: { status: 'STALE', reasons: ['MEMBERSHIP_OR_CENSUS_CHANGED'] },
  HHH: { status: 'ERROR', rv20: null, rv60: null, candleQuality: null, errors: { candles: 'SQLITE_BUSY' },
    reasons: ['CANDLE_READ_FAILED'] },
  III: { rv60: null, reasons: ['NOT_IN_IV_PILOT', 'RV60_INSUFFICIENT_CLOSES'] },
})[s]));

require('node:test')('coverage monitor: GET plus ONE guarded POST (IV refresh job), no storage, no streaming; index.html fetches it only from the DEV launcher', async () => {
  // The single write: the POST that starts or reuses the backend IV refresh job. No other method, no other write.
  assert.doesNotMatch(covSource, /method:\s*['"](PUT|PATCH|DELETE)['"]/);
  assert.equal((covSource.match(/method:\s*['"]POST['"]/g) || []).length, 1, 'one POST, in fetchJson');
  assert.match(covSource, /const REFRESH_PATH = '\/debug\/volatility-carry\/iv-refresh';/);
  assert.match(covSource, /if \(postBody !== undefined && String\(url\)\.slice\(-\(REFRESH_PATH\.length \+ 5\)\) !== REFRESH_PATH \+ '\/jobs'\)\n\s+throw Error\('COVERAGE_POST_NOT_ALLOWED'\);/);
  assert.doesNotMatch(covSource, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.doesNotMatch(covSource, /setInterval|new WebSocket|EventSource|subscribe/i);
  assert.equal((covSource.match(/fetch\(/g) || []).length, 1, 'one fetch call site: fetchJson');
  assert.match(covSource, /method: 'GET', cache: 'no-store'/);
  // Behaviour, not only text: a POST to any other URL is refused before any request leaves the page.
  const realFetch = global.fetch;
  let sent = 0;
  global.fetch = async () => { sent++; return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  try {
    for (const url of [devBackend + '/debug/volatility-carry/coverage', devBackend + '/debug/volatility-carry/iv-refresh/jobs/x',
      devBackend + '/debug/volatility-carry/iv-refresh/jobsX', devBackend + '/orders', 'https://evil.example/debug/volatility-carry/iv-refresh/jobs?x'])
      await assert.rejects(cov.fetchJson(url, 'k', undefined, { universeDigest: 'a' }), /COVERAGE_POST_NOT_ALLOWED/, url);
    assert.equal(sent, 0);
    await cov.fetchJson(devBackend + '/debug/volatility-carry/iv-refresh/jobs', 'k', undefined, { universeDigest: 'a' });
    assert.equal(sent, 1, 'control: the allowed POST is sent');
  } finally { global.fetch = realFetch; }
  assert.equal(cov.REFRESH_POLL_MS, 5000);
  assert.equal(cov.REFRESH_MAX_POLLS, 720);
  assert.equal(html.split('devtools/volatility-coverage-monitor.js').length - 1, 1,
    'index.html names the module once, in the DEV launcher (asserted with the launcher, at the end of this file)');
  assert.doesNotMatch(html, /<script[^>]*volatility-coverage-monitor/, '…and never in a script tag');
  assert.equal((html.match(/<script\b/gi) || []).length, 115);
  // The RV panel's gate plus one exact host, the dev-clean branch deploy, so the panel can be used every day on the
  // stable DEV URL. Every row states both gates, so neither can widen without failing here.
  const DEV_CLEAN_HOST = 'dev-clean--spontaneous-queijadas-118823.netlify.app';
  const prodBackend = 'https://apex-tastytrade-backend-production.up.railway.app';
  for (const [host, backend, expected] of [
    ['deploy-preview-552--spontaneous-queijadas-118823.netlify.app', devBackend, true], ['localhost', devBackend, true],
    ['127.0.0.1', devBackend, true], [DEV_CLEAN_HOST, devBackend, true],
    ['spontaneous-queijadas-118823.netlify.app', devBackend, false],
    ['main--spontaneous-queijadas-118823.netlify.app', devBackend, false],
    ['x' + DEV_CLEAN_HOST, devBackend, false], [DEV_CLEAN_HOST + '.evil.example', devBackend, false],
    ['deploy-preview-552--spontaneous-queijadas-118823.netlify.app.evil.example', devBackend, false],
    ['deploy-preview-552--spontaneous-queijadas-118823.netlify.app', prodBackend, false],
    [DEV_CLEAN_HOST, prodBackend, false], ['localhost', prodBackend, false],
  ]) {
    assert.equal(cov.devContext(host, backend), expected, 'coverage gate: ' + host + ' with ' + backend);
    assert.equal(rv.devContext(host, backend), expected && host !== DEV_CLEAN_HOST,
      'RV gate: the same, except the dev-clean branch deploy: ' + host + ' with ' + backend);
  }
});

require('node:test')('coverage monitor: every universe symbol once, one digest, one RV date and one IV date', () => {
  const universe = covUniverse(60);
  const pages = covPages(universe);
  assert.deepEqual(pages.map(p => p.rows.length), [25, 25, 10]);
  const data = cov.combinePages(pages);
  assert.deepEqual(data.rows.map(r => r.symbol), universe);
  assert.deepEqual([data.universe.digest, data.asOfSessionDate, data.ivAsOfDate, data.warnings], [COV_DIGEST, '2026-10-23', '2026-10-24', []]);
  const broken = [
    [p => { p[1].universe.digest = 'd'.repeat(64); }, /COVERAGE_PAGE_INCONSISTENT_AT_25/],
    [p => { p.pop(); }, /COVERAGE_UNIVERSE_INCOMPLETE/],
    [p => { p[2].rows[0].symbol = 'U000'; }, /COVERAGE_DUPLICATE_SYMBOL/],
    [p => { p[1].rows[3].universePosition = 99; }, /COVERAGE_ROW_INCONSISTENT_AT_28/],
    [p => { p[1].ivAsOfDate = '2026-10-25'; }, /COVERAGE_DATES_CHANGED_DURING_READ/],
    [p => { p[2].asOfSessionDate = '2026-10-26'; }, /COVERAGE_DATES_CHANGED_DURING_READ/],
    [p => { p[0].executionAuthorized = true; }, /COVERAGE_PAGE_INCONSISTENT_AT_0/],
    [p => { p[0].readOnly = false; }, /COVERAGE_PAGE_INCONSISTENT_AT_0/],
    [p => { p[0].version = 'VOLATILITY_COVERAGE_V2'; }, /COVERAGE_PAGE_INCONSISTENT_AT_0/],
    [p => { p[1].nextOffset = null; }, /COVERAGE_PAGE_INCONSISTENT_AT_25/],
    [p => { p[1].rows.pop(); p[1].returned = 24; }, /COVERAGE_PAGE_INCONSISTENT_AT_25/],
    [p => { p[0].rows[0].status = 'OK'; }, /COVERAGE_ROW_INCONSISTENT_AT_0/],
  ];
  for (const [mutate, error] of broken) { const p = covPages(universe); mutate(p); assert.throws(() => cov.combinePages(p), error); }
  const changed = covPages(universe);
  changed[2].sources.ivPilot.members = 4;
  assert.deepEqual(cov.combinePages(changed).warnings, ['SOURCES_CHANGED_DURING_READ'], 'a source change is stated, not hidden');
});

require('node:test')('coverage monitor: the counters are counts of the rows read, nothing estimated', () => {
  const s = cov.summarize(cov.combinePages(covMixed()).rows);
  assert.deepEqual(s, { total: 9, ivRef: 3,
    rv20: { any: 7, CERTIFIED: 2, PRELIMINARY: 1, EXPLORATORY: 4 }, rv60: { any: 6, CERTIFIED: 2, PRELIMINARY: 1, EXPLORATORY: 3 },
    complete: 3, certifiedPairs: 2, dxlinkPairs: 1,
    ivAboveRv20: 2, ivBelowRv20: 1, ivEqualRv20: 0, ivAboveRv60: 1, ivBelowRv60: 1, ivEqualRv60: 1,
    insufficientData: 3, candleIssues: 1, stale: 1, errors: 1 });
});

require('node:test')('coverage monitor: stored 1D spreads work without two acquisitions but never masquerade as certified', () => {
  const data = cov.combinePages(covMixed());
  const [certified, , fromStore] = data.rows;
  const cards = cov.renderSummary(data);
  const table = cov.renderTable([certified, fromStore], null, null);
  assert.match(cards, /Entrambi gli spread disponibili/);
  assert.match(cards, /Entrambi certificati APEX/);
  assert.match(cards, /Con RV da store 1D/);
  assert.match(cards, /non occorrono due acquisizioni per mostrare il valore/);
  assert.match(cards, /non autorizzano trading automatico/);
  assert.match(table, /SPREAD CERTIFICATI/);
  assert.match(table, /SPREAD DISPONIBILI/);
  assert.match(table, /non certificati APEX/);
  assert.match(table, /DA STORE 1D · non certificata/);
  assert.match(table, /presenti 21\/21/);
  assert.match(table, /validate APEX 0\/21/);
  assert.match(table, /Non validate 20/);
  assert.doesNotMatch(table, /Copertura RV20|Mancanti 20/);
  assert.equal(fromStore.status, 'COMPLETE', 'backend contract is not redefined');
  assert.equal(fromStore.spreads.ivMinusRv20Pp.basis, 'RV_PRELIMINARY');
  assert.equal(fromStore.spreads.ivMinusRv60Pp.basis, 'RV_PRELIMINARY');
  const csv = cov.toCsv(data, null);
  assert.match(csv, /RV_PRELIMINARY/);
  const missing = covRow('AAA', 0, { iv: 0.25, basis: 'PRELIMINARY', s20: 1, s60: 2 });
  missing.rv20.coverage.present = 19;
  missing.rv20.coverage.validated = 0;
  const missingTable = cov.renderTable([missing], null, null);
  assert.match(missingTable, /presenti 19\/21/);
  assert.match(missingTable, /validate APEX 0\/21/);
  assert.doesNotMatch(missingTable, /presenti 0\/21/);
  const detail = covDetail(d => {
    d.row.status = 'COMPLETE';
    d.row.rv20.basis = 'PRELIMINARY';
    d.row.rv60.basis = 'PRELIMINARY';
    d.row.spreads.ivMinusRv20Pp = { valuePp: 1, basis: 'RV_PRELIMINARY', missing: [] };
    d.row.spreads.ivMinusRv60Pp = { valuePp: 2, basis: 'RV_PRELIMINARY', missing: [] };
  });
  assert.match(cov.renderDetail(detail, null), /non certificati APEX/);
});

require('node:test')('coverage monitor: spreads keep the sign of the unrounded value; colours give the sign only', () => {
  const cases = [[-4.0000000000000036, '−4.00 pp', 'neg'], [0.004, '+0.00 pp', 'pos'], [-0.004, '−0.00 pp', 'neg'],
    [0, '0.00 pp', 'zero'], [-0, '0.00 pp', 'zero'], [24.86, '+24.86 pp', 'pos'], [null, '—', 'na'], [NaN, '—', 'na'],
    [Infinity, '—', 'na'], ['1', '—', 'na'], [undefined, '—', 'na']];
  for (const [v, text, cls] of cases) {
    assert.equal(cov.formatPp(v), text, String(v));
    assert.equal(cov.spreadClass(v), cls, String(v));
  }
  assert.equal(cov.formatPct(0.05137021096990555), '5.14%');
  assert.equal(cov.formatPct(null), '—');
});

require('node:test')('coverage monitor: sorting by either spread, missing values last in both directions', () => {
  const rows = cov.combinePages(covMixed()).rows;
  const order = (key, dir) => cov.sortRows(rows, key, dir).map(r => r.symbol).join(',');
  assert.equal(order('spread20', 'asc'), 'BBB,CCC,AAA,DDD,EEE,FFF,GGG,HHH,III');
  assert.equal(order('spread20', 'desc'), 'AAA,CCC,BBB,DDD,EEE,FFF,GGG,HHH,III');
  assert.equal(order('spread60', 'asc'), 'CCC,BBB,AAA,DDD,EEE,FFF,GGG,HHH,III');
  assert.equal(order('spread60', 'desc'), 'AAA,BBB,CCC,DDD,EEE,FFF,GGG,HHH,III');
  assert.equal(order('position', 'desc'), 'III,HHH,GGG,FFF,EEE,DDD,CCC,BBB,AAA');
  assert.equal(cov.sortRows(rows.slice().reverse(), 'spread20', 'asc').map(r => r.symbol).join(','),
    'BBB,CCC,AAA,DDD,EEE,FFF,GGG,HHH,III', 'ties fall back to the universe order whatever the input order');
  assert.equal(order('nonsense', 'asc'), 'AAA,BBB,CCC,DDD,EEE,FFF,GGG,HHH,III', 'an unknown key falls back to the universe order');
  assert.deepEqual(rows.map(r => r.symbol), ['AAA', 'BBB', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'III'], 'the input is not reordered');
});

require('node:test')('coverage monitor: every filter, exactly', () => {
  const rows = cov.combinePages(covMixed()).rows;
  const pick = f => cov.filterRows(rows, f).map(r => r.symbol).join(',');
  assert.equal(pick({ search: ' cc ' }), 'CCC');
  assert.equal(pick({ availability: 'IVREF_YES' }), 'AAA,BBB,CCC');
  assert.equal(pick({ availability: 'IVREF_NO' }), 'DDD,EEE,FFF,GGG,HHH,III');
  assert.equal(pick({ availability: 'RV20_NO' }), 'EEE,HHH');
  assert.equal(pick({ availability: 'RV60_YES' }), 'AAA,BBB,CCC,DDD,FFF,GGG');
  assert.equal(pick({ availability: 'COMPLETE' }), 'AAA,BBB,CCC');
  assert.equal(pick({ availability: 'CERTIFIED_PAIR' }), 'AAA,BBB');
  assert.equal(pick({ availability: 'DXLINK_PAIR' }), 'CCC');
  assert.equal(pick({ availability: 'INCOMPLETE' }), 'DDD,EEE,FFF,GGG,HHH,III');
  assert.equal(pick({ availability: 'RV60_NO' }), 'EEE,HHH,III');
  assert.equal(pick({ availability: 'PROBLEMS' }), 'FFF,GGG,HHH');
  const erred = rows.map(r => (r.symbol === 'AAA' ? Object.assign({}, r, { status: 'ERROR', errors: { census: 'SQLITE_CORRUPT' } }) : r));
  assert.equal(cov.filterRows(erred, { availability: 'COMPLETE' }).map(r => r.symbol).join(','), 'AAA,BBB,CCC',
    'both spreads computed: complete, whatever another source\'s read error did to the status');
  assert.deepEqual([cov.summarize(erred).complete, cov.summarize(erred).errors], [3, 2]);
  const partial = covRow('PPP', 0, { iv: 0.3, basis: 'CERTIFIED', s20: 1.5, status: 'PARTIAL' });
  assert.deepEqual([cov.filterRows([partial], { availability: 'COMPLETE' }).length, cov.filterRows([partial], { availability: 'INCOMPLETE' }).length,
    cov.summarize([partial]).complete], [0, 1, 0], 'one spread of two is not complete');
  assert.equal(pick({ spread: 'IV_GT_RV20' }), 'AAA,CCC');
  assert.equal(pick({ spread: 'IV_LT_RV20' }), 'BBB');
  assert.equal(pick({ spread: 'IV_GT_RV60' }), 'AAA');
  assert.equal(pick({ spread: 'IV_LT_RV60' }), 'CCC');
  assert.equal(pick({ spread: 'ANY_POSITIVE' }), 'AAA,CCC');
  assert.equal(pick({ spread: 'ANY_NEGATIVE' }), 'BBB,CCC');
  assert.equal(pick({ status: 'STALE' }), 'GGG');
  assert.equal(pick({ reason: 'RV20_INSUFFICIENT_CLOSES' }), 'EEE');
  assert.equal(pick({ availability: 'IVREF_NO', reason: 'NOT_IN_IV_PILOT' }), 'DDD,EEE,FFF,III');
  assert.equal(pick({ availability: 'NOT_A_FILTER' }), '', 'an unknown filter matches nothing');
  assert.deepEqual(cov.reasonCodes(rows), ['CANDLE_READ_FAILED', 'MEMBERSHIP_OR_CENSUS_CHANGED', 'NOT_IN_IV_PILOT',
    'RV20_INSUFFICIENT_CLOSES', 'RV60_INSUFFICIENT_CLOSES']);
});

require('node:test')('coverage monitor: CSV keeps full precision, timestamps and reasons, and never starts a formula', () => {
  const data = cov.combinePages(covMixed());
  data.rows[3].reasons = ['=HYPERLINK("http://x")'];
  data.rows[3].primaryReason = '+SUM(A1)';
  const csv = cov.toCsv(data, { AAA: { iv: 0.42, source: 'TASTYTRADE', updatedAt: Date.parse('2026-10-24T14:00:00Z') } });
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 11, 'header + 9 rows + final CRLF');
  const header = lines[0].split(',');
  assert.deepEqual(header, ['symbol', 'universe_position', 'status', 'primary_reason', 'reasons', 'iv_ref', 'iv_ref_status',
    'iv_ref_reason', 'iv_ref_source', 'iv_ref_expiration', 'iv_ref_dte', 'iv_observed_at', 'iv_as_of_date',
    'rv20', 'rv20_basis', 'rv20_validated', 'rv20_required', 'rv20_missing', 'rv20_certified_reasons',
    'rv60', 'rv60_basis', 'rv60_validated', 'rv60_required', 'rv60_missing', 'rv60_certified_reasons',
    'iv_minus_rv20_pp', 'iv_minus_rv20_basis', 'iv_minus_rv20_missing', 'iv_minus_rv60_pp', 'iv_minus_rv60_basis',
    'iv_minus_rv60_missing', 'rv_session_date', 'iv_rv_dates_differ', 'rv20_last_certified', 'rv20_last_certified_session',
    'rv60_last_certified', 'rv60_last_certified_session', 'candle_issues', 'census_state', 'historical_state',
    'evidence_available', 'evidence_error', 'dividend_audit_state', 'dividend_audit_date', 'dividend_audit_completed_day',
    'dividend_audit_total', 'dividend_compatible', 'dividend_invalid_data', 'dividend_unresolved',
    'dividend_in_range_undetermined', 'dividend_no_event', 'errors', 'iv_market_informational', 'iv_market_source',
    'iv_market_updated_at', 'page_generated_at', 'generated_from', 'generated_to', 'universe_source', 'universe_digest',
    // IV acquisition provenance, appended after every pre-existing column (positions above unchanged).
    'iv_mode', 'iv_refresh_job_id', 'iv_refresh_job_state', 'iv_refresh_snapshot_complete', 'iv_ref_from_current_job',
    'iv_freshness', 'iv_requested_at', 'iv_fetched_at', 'iv_provider_as_of', 'iv_provider_as_of_field', 'iv_chain_fetched_at',
    'iv_error_class', 'iv_selection_version', 'iv_policy_version', 'iv_timing_policy_version', 'iv_timing_comparable',
    'iv_timing_basis', 'iv_timing_reason', 'iv_provider_update_attested', 'iv_last_successful', 'iv_last_successful_fetched_at',
    'iv_last_successful_job_id']);
  const col = name => header.indexOf(name);
  assert.equal(lines[1].split(',')[col('iv_mode')], 'IV_PILOT', 'a pilot read says so in every row');
  assert.equal(lines[1].split(',')[col('iv_ref_from_current_job')], '', 'no refresh provenance is invented for pilot rows');
  const bbb = lines[2].split(',');
  assert.equal(bbb[col('iv_minus_rv20_pp')], '-4.0000000000000036', 'never rounded in the export');
  assert.equal(bbb[col('iv_minus_rv60_pp')], '0');
  assert.equal(bbb[col('iv_observed_at')], '2026-10-24T15:00:00.000Z');
  assert.equal(bbb[col('rv_session_date')], '2026-10-23');
  assert.equal(bbb[col('iv_rv_dates_differ')], 'true');
  assert.equal(lines[1].split(',')[col('iv_market_informational')], '0.42');
  assert.equal(lines[1].split(',')[col('iv_market_updated_at')], '2026-10-24T14:00:00.000Z');
  assert.ok(lines[4].includes(`"'=HYPERLINK(""http://x"")"`), 'a text cell is quoted, its quotes doubled, its formula defused');
  assert.ok(lines[4].includes(",'+SUM(A1),"));
  assert.equal(lines[8].split(',')[col('status')], 'ERROR');
  assert.equal(lines[8].split(',')[col('candle_issues')], '', 'unknown candle quality stays empty, never false');
  assert.equal(lines[8].split(',')[col('errors')], 'candles: SQLITE_BUSY');
  assert.deepEqual([bbb[col('census_state')], bbb[col('historical_state')], bbb[col('evidence_available')], bbb[col('evidence_error')]],
    ['NOT_READ', 'NOT_READ', 'false', 'NO_OBSERVATIONS_FILE']);
  assert.equal(bbb[col('page_generated_at')], '2026-10-24T22:00:00.000Z', 'each row carries the reference instant of its page');
  assert.doesNotMatch(csv, /x-api-key|backendKey/);
  assert.equal(cov.csvCell(-1.5), '-1.5', 'a number is a number, not a defused text');
  assert.equal(cov.csvCell('-1.5'), "'-1.5");
});

require('node:test')('coverage monitor: hostile backend strings are escaped everywhere they are drawn', () => {
  const data = cov.combinePages(covMixed());
  const row = data.rows[3];
  row.reasons = [COV_HOSTILE]; row.primaryReason = COV_HOSTILE;
  row.spreads.ivMinusRv20Pp.missing = [{ operand: COV_HOSTILE, reason: COV_HOSTILE }];
  row.rv20.lastCertified = { value: 0.2, sessionDate: COV_HOSTILE, revision: 1 }; row.rv20.value = null;
  data.sources.ivPilot.reason = COV_HOSTILE; data.sources.ivPilot.available = false;
  data.warnings.push(COV_HOSTILE);
  for (const out of [cov.renderTable(data.rows, { key: 'spread20', dir: 'asc' }, null), cov.renderSummary(data)]) {
    assert.doesNotMatch(out, /<img/);
    assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;/);
  }
});

function covDetail(mutate) {
  const row = covRow('AAPL', 0, { iv: 0.3, basis: 'EXPLORATORY', status: 'UNAVAILABLE', reasons: ['RV20_NOT_FINAL'] });
  row.rv20.lastCertified = { value: 0.21, sessionDate: '2026-10-22', revision: 1 };
  row.rv20.certified.priceAdjustment = 'SUSPECT_JUMP';
  const sessions = Array.from({ length: 61 }, (_, i) => ({ sessionDate: '2026-08-' + String(i % 28 + 1).padStart(2, '0'),
    available: true, valid: true, validated: true, reason: null, sessionKind: 'REGULAR' }));
  Object.assign(sessions[60], { sessionDate: '2026-10-23' });
  Object.assign(sessions[56], { sessionDate: '2026-10-19', available: false, valid: false, validated: false, reason: 'NO_STORED_CANDLE' });
  Object.assign(sessions[57], { sessionDate: '2026-10-20', valid: false, validated: false, reason: 'NOT_POSITIVE_PRICE' });
  Object.assign(sessions[58], { sessionDate: '2026-10-21', validated: false, reason: 'UNVERIFIED', finalityLevel: 'OBSERVED_ONCE',
    distinctAcquisitions: 1, spanMs: 0 });
  Object.assign(sessions[59], { sessionDate: '2026-10-22', validated: false, reason: 'NOT_REGULAR_SESSION', sessionKind: 'UNKNOWN',
    sessionKindBasis: 'POLICY_SYMBOL_NOT_COVERED' });
  Object.assign(sessions[60], { validated: false, reason: 'UNVERIFIED', sessionKind: 'UNKNOWN' });
  const d = { ok: true, version: 'VOLATILITY_COVERAGE_V1', readOnly: true, notForTrading: true, executionAuthorized: false,
    symbol: 'AAPL', universePosition: 0, sources: covSources(), row,
    rvDiagnostics: { sessions, missingSessions: ['2026-10-19'], corporateActions: { status: 'NOT_PROVIDED' } },
    pendingSessions: { rv20: [], rv60: [] }, storedRv: null, historicalCertified: { available: true }, iv: { pilotRow: null, census: null } };
  if (mutate) mutate(d);
  return d;
}

require('node:test')('coverage monitor detail: absent, invalid, not final and not REGULAR stay four facts; history stays apart', () => {
  const out = cov.renderDetail(covDetail(), null);
  assert.match(out, /2026-10-19 · ASSENTE · <code>NO_STORED_CANDLE<\/code>/);
  assert.match(out, /2026-10-20 · PRESENTE, STRUTTURALMENTE NON VALIDA · <code>NOT_POSITIVE_PRICE<\/code>/);
  assert.match(out, /2026-10-21 · VALIDA, FINALITÀ INSUFFICIENTE · <code>UNVERIFIED<\/code>[^<]*<span class="sub">[^<]*<\/span> · finalità OBSERVED_ONCE · acquisizioni distinte 1/);
  assert.match(out, /2026-10-22 · NON REGULAR · <code>NOT_REGULAR_SESSION<\/code>/);
  assert.match(out, /2026-10-23 · VALIDA, FINALITÀ INSUFFICIENTE \+ NON REGULAR/);
  assert.match(out, /Sedute non validate \(5 di 21\)/);
  assert.match(out, /Sedute non validate \(5 di 61\)/);
  assert.match(out, /RV certificata storica: 21\.00% al 2026-10-22 \(rev\. 1\) · <span class="warn">la RV certificata corrente NON è disponibile<\/span> · mai usata per lo spread corrente/);
  assert.match(out, /BLOCCO AZIONI SOCIETARIE/);
  assert.match(out, /diagnostica numerica, mai confrontata con la IV/);
  assert.match(out, /Sedute assenti dallo store: 2026-10-19/);
  assert.match(out, /Nessuna stima di quanti giorni servano/);
  assert.doesNotMatch(out, /\d+ (giorni|sedute) (in più|ancora)|basta(no)? attendere/i, 'never "X more days fix it"');
  const sessionsUnknown = cov.renderDetail(covDetail(d => { d.rvDiagnostics = null; }), null);
  assert.match(sessionsUnknown, /Elenco sedute non verificabile/);
  assert.deepEqual(cov.sessionFacts({ sessionDate: 'x' }), null);
  assert.deepEqual(cov.sessionFacts({ sessionDate: '2026-10-23', available: true, valid: true, validated: false, reason: null,
    sessionKind: 'REGULAR' }).facts, ['VALIDA, NON VALIDATA'], 'a valid unvalidated session with no stated cause is not given one');
});

require('node:test')('coverage monitor detail: IV Ref only from the pilot; IV Market informational, never a substitute', () => {
  const cache = { AAPL: { iv: 0.55, source: 'TASTYTRADE', updatedAt: Date.parse('2026-10-24T14:00:00Z') } };
  const noRef = covDetail(d => { d.row.ivRef.value = null; d.row.ivRef.status = 'UNSUPPORTED'; d.row.ivRef.reason = 'CHAIN_NO_REGULAR'; });
  const out = cov.renderDetail(noRef, cache);
  assert.match(out, /Valore: <strong>—<\/strong> · stato UNSUPPORTED · <code>CHAIN_NO_REGULAR<\/code>/);
  assert.match(out, /metrica non supportata per questo simbolo/);
  assert.match(out, /IV Market \(IV index Tastytrade dello scanner, solo informativa, mai usata negli spread\): 55\.00%/);
  const table = cov.renderTable([noRef.row], null, cache);
  assert.match(table, /<strong>—<\/strong><div class="sub">UNSUPPORTED<\/div><div class="sub mkt">IV Market 55\.00% \(informativa\)<\/div>/);
  assert.equal(cov.ivMarketOf('AAPL', { AAPL: { iv: 0 } }), null);
  assert.equal(cov.ivMarketOf('AAPL', { AAPL: { iv: '0.5' } }), null);
  assert.equal(cov.ivMarketOf('AAPL', null), null);
  for (const unsafe of [d => { d.executionAuthorized = true; }, d => { d.readOnly = false; }, d => { d.version = 'X'; },
    d => { d.row.symbol = 'MSFT'; }, d => { d.row.status = 'GREAT'; }, d => { d.ok = false; }])
    assert.throws(() => cov.renderDetail(covDetail(unsafe), null), /COVERAGE_DETAIL_INVALID_RESPONSE/);
});

require('node:test')('coverage monitor: reason codes stay visible with a readable text; unknown codes are not given a meaning', () => {
  assert.equal(cov.reasonText('RV60_GAP_IN_WINDOW'), 'RV60: una seduta di borsa della finestra non è nello store');
  assert.equal(cov.reasonText('RV20_SPLIT_UNVERIFIED'), 'RV20: salto di prezzo compatibile con uno split non verificato: finestra bloccata');
  assert.equal(cov.reasonText('NOT_REGULAR_SESSION'), 'seduta non riconosciuta come REGULAR dalla policy');
  assert.equal(cov.reasonText('SOMETHING_NEW'), 'codice del motore, senza descrizione in questo pannello');
  assert.equal(cov.reasonText('toString'), 'codice del motore, senza descrizione in questo pannello', 'no prototype key is a reason');
  assert.equal(cov.reasonText('UNVERIFIED_NO_JUMP_DETECTED'),
    'nessuna azione elencata, esaustività non garantita, nessun salto sospetto: NON è una verifica');
  const table = cov.renderTable(cov.combinePages(covMixed()).rows, null, null);
  assert.match(table, /<code>RV20_INSUFFICIENT_CLOSES<\/code>|<code>NOT_IN_IV_PILOT<\/code>/);
});

require('node:test')('coverage monitor: a read is not atomic, and it says when the IV pilot or a source changed', () => {
  const universe = covUniverse(60);
  const data = cov.combinePages(covPages(universe));
  assert.deepEqual([data.atomic, data.warnings], [false, []]);
  assert.equal(data.pageGeneratedAt.U000, '2026-10-24T22:00:00.000Z');
  assert.equal(data.pageGeneratedAt.U030, '2026-10-24T22:00:01.000Z');
  assert.equal(data.pageGeneratedAt.U059, '2026-10-24T22:00:02.000Z');
  assert.match(cov.renderSummary(data), /Lettura NON atomica: ogni pagina è calcolata a un proprio istante di riferimento/);
  assert.match(cov.renderSummary(data), /non l’istante di lettura del singolo simbolo/);
  const pilot = covPages(universe); pilot[2].sources.ivPilot.digest = 'f'.repeat(64);
  assert.deepEqual(cov.combinePages(pilot).warnings, ['IV_PILOT_CHANGED_DURING_READ'], 'a new pilot state alone is named as such');
  const both = covPages(universe); both[1].sources.ivPilot.digest = 'f'.repeat(64); both[1].sources.census.error = 'boom';
  assert.deepEqual(cov.combinePages(both).warnings, ['IV_PILOT_CHANGED_DURING_READ', 'SOURCES_CHANGED_DURING_READ']);
  const atomic = covPages(universe); atomic.forEach(p => { p.snapshot.atomic = true; });
  assert.doesNotMatch(cov.renderSummary(cov.combinePages(atomic)), /Lettura NON atomica/, 'the note follows what the pages declare');
});

require('node:test')('coverage monitor: source states are shown as read, never as "missing"', () => {
  const data = cov.combinePages(covMixed());
  const text = obs => { data.sources.observations = obs; return cov.renderSummary(data); };
  assert.match(text({ available: false, reason: 'NO_OBSERVATIONS_FILE', error: null }), /evidenze non disponibili \(NO_OBSERVATIONS_FILE\)/);
  assert.match(text({ available: null, reason: null, error: null }), /evidenze stato non dichiarato/);
  assert.match(text({ available: false, reason: null, error: 'disk I/O error' }), /evidenze ERRORE: disk I\/O error/);
  assert.match(text({ available: true, reason: null, error: null }), /evidenze disponibili/);
  const detailFor = (mutate) => cov.renderDetail(covDetail(mutate), null);
  assert.match(detailFor(d => { d.row.ivRef.censusState = 'ERROR'; d.row.errors = { census: 'SQLITE_CORRUPT' }; }),
    /Census: <span class="error">ERRORE di lettura<\/span> · SQLITE_CORRUPT/);
  assert.match(detailFor(d => { d.row.ivRef.censusState = 'NOT_IN_UNIVERSE'; }), /Census: simbolo assente dall’universo persistito/);
  assert.match(detailFor(d => { d.row.ivRef.censusState = 'NOT_READ'; d.row.ivRef.censusReason = 'CENSUS_DISABLED'; }),
    /Census: non letto \(CENSUS_DISABLED\)/);
  assert.match(detailFor(d => { d.row.ivRef.censusState = 'FOUND';
    d.row.ivRef.census = { status: 'REGULAR_AVAILABLE', fresh: true, checkedAt: '2026-10-24T12:00:00.000Z' }; }),
  /Census: REGULAR_AVAILABLE · fresco · 2026-10-24T12:00:00.000Z/);
  assert.match(detailFor(d => { d.row.ivRef.censusState = undefined; }), /Census: stato non riportato/);
  assert.match(detailFor(d => { d.row.historicalCertified = { state: 'ERROR', reason: 'RV_DAILY_READ_FAILED' }; }),
    /Stato delle letture: RV storiche ERRORE di lettura/);
  assert.match(detailFor(), /RV storiche non lette \(RV_DAILY_DISABLED\) · evidenze non disponibili · <code>NO_OBSERVATIONS_FILE<\/code>/);
  assert.match(detailFor(d => { d.row.evidence = { available: true, error: null, truncated: true }; }), /evidenze disponibili · <span class="warn">troncate<\/span>/);
  assert.equal(cov.reasonText('CENSUS_READ_FAILED'), 'lettura del census fallita: non si può dire perché il simbolo non ha IV Ref');
});


require('node:test')('coverage monitor: persisted DEV 1D checkpoint is distinct from global OHLC and certified RV', () => {
  const v = {
    ok:true,readOnly:true,version:'APEX_1D_ALWAYS_ON_RECOVERY_STATE_V1',
    mode:'canary',enabled:false,killSwitch:{enabled:false},
    stateFile:{source:'FILE_READ_ONLY'},totals:{insertedTotal:7,providerAttemptsTotal:9},
    counts:{recoverableSessions:527,due:216,parked:0},
    timestamps:{lastSuccessfulRecoveryAt:'2026-10-31T16:46:51.410Z'},
    lastCompletedNyseSession:'2026-10-30',generatedAt:'2026-10-31T16:48:00.000Z',
    blockedReason:'KILL_SWITCH_OFF'
  };
  const html = cov.renderRecoveryStatus(v);
  assert.match(html,/Controller <strong>SPENTO<\/strong>/);
  assert.match(html,/Candele inserite \(checkpoint\)/);
  assert.match(html,/>7<\/strong>/);
  assert.match(html,/Sedute recuperabili \(checkpoint\)/);
  assert.match(html,/527/);
  assert.match(html,/NON all’audit OHLC globale/);
  assert.match(html,/NON certificano RV/);
  assert.doesNotMatch(html,/backup verificato/i);
  const notPersisted = cov.renderRecoveryStatus({...v,stateFile:{source:'NOT_LOADED'}});
  assert.match(notPersisted,/nessun checkpoint verificabile/);
  assert.doesNotMatch(notPersisted,/>7<\/strong>/, 'unloaded checkpoint cannot claim previous writes');
  assert.match(notPersisted,/<strong>—<\/strong>/, 'unknown is not zero');
  for (const broken of [null,{}, {...v,readOnly:false}, {...v,version:'UNTRUSTED'},
    {...v,killSwitch:{enabled:'true'}}, {...v,ok:false}])
    assert.match(cov.renderRecoveryStatus(broken),/non verificabile/);
  const xss = cov.renderRecoveryStatus({...v,blockedReason:'<img src=x onerror=alert(1)>'});
  assert.doesNotMatch(xss,/<img/);
  assert.match(xss,/&lt;img src=x onerror=alert\(1\)&gt;/);
});

// The browser lifecycle, as for the RV panel: a manual run reads pages in order with the pinned digest, a closed
// panel never advances, a timer never fires a second read, and nothing but GET with the session key is sent.
async function testCoverageLifecycle() {
  const roots = [], hosts = [], requests = [], timeouts = [], blobs = [];
  let launcher = null;
  const element = () => ({
    style: {}, handlers: {}, attrs: {}, textContent: '', innerHTML: '', value: '', hidden: false, disabled: false,
    addEventListener(type, fn) { this.handlers[type] = fn; },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    focus() {}, remove() { this.removed = true; }, click() { return this.handlers.click && this.handlers.click({ target: this }); },
  });
  const document = {
    readyState: 'complete',
    getElementById(id) { return id === 'apex-vol-coverage-launcher' ? launcher : null; },
    createElement(tag) {
      const el = element();
      if (tag === 'a') el.click = () => { el.clicked = true; };
      if (tag === 'div') {
        const fields = Object.fromEntries(['run', 'refresh-run', 'refresh', 'recovery-run', 'recovery', 'csv', 'state', 'summary', 'filters', 'search', 'availability', 'spread', 'dividend',
          'status', 'reason', 'count', 'table', 'detail', 'close', 'shade'].map(id => [id, element()]));
        const root = { fields, appended: [], getElementById(id) { return fields[id]; },
          querySelector(sel) { assert.equal(sel, '.shade'); return fields.shade; }, appendChild(x) { this.appended.push(x); } };
        el.attachShadow = () => root;
        roots.push(root); hosts.push(el);
      }
      return el;
    },
    body: { appendChild(el) { if (el.id === 'apex-vol-coverage-launcher') launcher = el; } },
  };
  const context = {
    module: { exports: {} }, document, BACKEND: devBackend, S: { backendKey: 'fixture-only-api-key' }, AbortController,
    window: { location: { hostname: 'deploy-preview-552--spontaneous-queijadas-118823.netlify.app' } },
    setTimeout(fn) { timeouts.push(fn); return timeouts.length; }, clearTimeout() {},
    fetch(url, options) { return new Promise(resolve => requests.push({ url, options, resolve })); },
    Blob: function (parts, options) { blobs.push({ parts, options }); },
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
  };
  vm.runInNewContext(covSource, context, { filename: 'volatility-coverage-monitor.js' });
  assert.ok(launcher, 'the launcher mounts on the exact preview hostname with the DEV backend');
  const ok = body => ({ ok: true, status: 200, json: async () => body });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const universe = covUniverse(60), pages = covPages(universe);

  const REFRESH = devBackend + '/debug/volatility-carry/iv-refresh';
  const refreshJob = (state, processed, extra) => Object.assign({ jobId: 'job-fixture-0001', state,
    universe: { source: 'TEST', digest: COV_DIGEST, count: 60 }, requestedAt: '2026-10-26T13:00:00.000Z',
    finishedAt: state === 'RUNNING' ? null : '2026-10-26T13:08:00.000Z', backoffUntil: null,
    progress: { total: 60, processed, pending: 60 - processed, retrying: 0, done: processed, failed: 0,
      ivAvailable: processed, ivUnavailable: 0, errors: 0 } }, extra || {});

  // Opening the panel reads page 1 at once (the latest available data); a click while that read runs adds nothing.
  launcher.click();
  const first = roots[0].fields;
  first.csv.handlers.click();
  assert.equal(blobs.length, 0, 'no export before a complete read');
  const firstRun = first.run.click();
  await first.run.click();
  assert.equal(requests.length, 1, 'the opening read is joined, never duplicated, by «Analizza universo»');
  assert.equal(requests[0].url, devBackend + '/debug/volatility-carry/coverage?offset=0&limit=25');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[0].options.headers['x-api-key'], 'fixture-only-api-key');
  first.close.click();
  assert.equal(requests[0].options.signal.aborted, true, 'close aborts the run');
  requests[0].resolve(ok(pages[0]));
  await firstRun; await tick(); await tick();
  assert.equal(requests.length, 1, 'a closed panel never asks for page 2, nor starts a refresh');

  launcher.click();
  const second = roots[1].fields;
  const secondRun = second.run.click();
  for (let i = 0; i < 3; i++) {
    assert.equal(requests.length, 2 + i);
    if (i > 0) assert.equal(requests[1 + i].url, devBackend + '/debug/volatility-carry/coverage?offset=' + i * 25 +
      '&limit=25&universeDigest=' + COV_DIGEST, 'pages 2…n pin the digest of page 1');
    requests[1 + i].resolve(ok(pages[i]));
    await tick(); await tick();
  }
  await secondRun; await tick();
  // After the complete read, exactly ONE authenticated POST starts or reuses the refresh job of THAT universe digest.
  assert.equal(requests.length, 5, 'exactly one request per page, then one refresh request');
  const post = requests[4];
  assert.equal(post.url, REFRESH + '/jobs');
  assert.equal(post.options.method, 'POST');
  assert.equal(post.options.headers['x-api-key'], 'fixture-only-api-key');
  assert.equal(post.options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(post.options.body), { universeDigest: COV_DIGEST }, 'no force on the automatic request');
  assert.equal(second['refresh-run'].disabled, true, 'no second request while the first is in flight');
  post.resolve(ok({ ok: true, created: false, reused: 'RECENT', superseded: [], job: refreshJob('COMPLETE', 60) }));
  await tick(); await tick();
  assert.match(second.refresh.innerHTML, /Nessuna nuova acquisizione: riuso del job concluso il 2026-10-26T13:08:00\.000Z/,
    'a reused job is declared as such, never as a new acquisition');
  assert.match(second.refresh.innerHTML, /Elaborati <strong>60\/60<\/strong> · con IV valida <strong>60<\/strong>/);
  assert.equal(second['refresh-run'].disabled, false, 'a new acquisition can be requested explicitly');
  assert.match(second.state.textContent, /Completato: 60 titoli in 3 pagine · IV Ref presente per \d+\./);
  assert.equal(second.filters.hidden, false);
  assert.equal(second.csv.disabled, false);
  assert.match(second.table.innerHTML, /U059/);
  for (const fn of timeouts.splice(0)) fn();
  await tick();
  assert.equal(requests.length, 5, 'with a concluded job no timer ever starts another read: there is no polling');
  assert.equal(requests[1].options.signal.aborted, true, 'a late per-page timer only aborts its own, finished run');

  second.search.value = 'U05';
  second.search.handlers.input();
  assert.match(second.count.textContent, /^10 di 60 titoli mostrati\.$/);
  second.table.handlers.click({ target: { closest: () => ({ getAttribute: k => (k === 'data-sort' ? 'spread20' : null) }) } });
  assert.match(second.table.innerHTML, /aria-sort="ascending"/);
  second.table.handlers.click({ target: { closest: () => ({ getAttribute: k => (k === 'data-sort' ? 'spread20' : null) }) } });
  assert.match(second.table.innerHTML, /aria-sort="descending"/);

  second.csv.handlers.click();
  assert.equal(blobs.length, 1);
  assert.match(blobs[0].parts[0], /^symbol,universe_position,status,/);
  assert.doesNotMatch(blobs[0].parts[0], /fixture-only-api-key/);
  assert.equal(roots[1].appended[0].download, 'volatility-coverage-2026-10-23-cccccccc.csv');

  const detailRun = second.table.handlers.click({ target: { closest: () => ({ getAttribute: k => (k === 'data-symbol' ? 'U007' : null) }) } });
  assert.equal(requests.length, 6);
  assert.equal(requests[5].url, devBackend + '/debug/volatility-carry/coverage/U007');
  requests[5].resolve({ ok: false, status: 404, json: async () => ({ ok: false, error: 'COVERAGE_SYMBOL_NOT_IN_UNIVERSE' }) });
  await detailRun; await tick(); await tick();
  assert.match(second.detail.innerHTML, /COVERAGE_HTTP_404: COVERAGE_SYMBOL_NOT_IN_UNIVERSE/);

  const thirdRun = second.run.click();
  requests[6].resolve({ ok: false, status: 404, json: async () => { throw SyntaxError('Unexpected token <'); } });
  await thirdRun;
  assert.match(second.state.textContent, /Endpoint non ancora disponibile sul backend DEV/);
  assert.equal(second.state.className, 'error');
  assert.equal(requests.length, 7, 'a failed re-read starts no refresh: one refresh request per panel opening');
  assert.ok(requests.every((r, i) => (i === 4 ? r.options.method === 'POST' && r.url === REFRESH + '/jobs'
    : r.options.method === 'GET' && r.url.startsWith(devBackend + '/debug/volatility-carry/coverage'))),
    'every request is a coverage GET except the single refresh POST');
  second.shade.click();
  assert.equal(hosts[1].removed, true);

  // Closed while its LAST page is in flight: the late page must not complete the closed run, nor leave data that a
  // reopened panel could export.
  launcher.click();
  const third = roots[2].fields;
  const lastPageRun = third.run.click();
  third.close.click();
  requests[7].resolve(ok(covPages(covUniverse(3))[0]));
  await lastPageRun; await tick(); await tick();
  assert.equal(third.summary.innerHTML, '');
  assert.doesNotMatch(third.state.textContent, /Completato/);
  assert.equal(requests.length, 8, 'the closed run starts no refresh');
  launcher.click();
  roots[3].fields.csv.handlers.click();
  assert.equal(blobs.length, 1, 'nothing from the closed run is exportable');
  // The recovery checkpoint is not fetched by panel open or universe analysis.
  // It is fetched only on its separate button, once, via the same authenticated
  // GET helper; a stale response after close cannot update the reopened panel.
  const fourth = roots[3].fields;
  assert.equal(requests.length, 9, 'the reopened panel reads page 1 (its own opening read), nothing else');
  assert.equal(requests[8].url, devBackend + '/debug/volatility-carry/coverage?offset=0&limit=25');
  assert.equal(fourth.recovery.innerHTML, '');
  const recoveryRun = fourth['recovery-run'].click();
  assert.equal(requests.length, 10);
  assert.equal(requests[9].url, devBackend + '/dev/market/candles/store/recovery-always-on?offset=0&limit=1');
  assert.equal(requests[9].options.method, 'GET');
  assert.equal(requests[9].options.headers['x-api-key'], 'fixture-only-api-key');
  await fourth['recovery-run'].click();
  assert.equal(requests.length, 10, 'an in-flight read is joined/refused, not duplicated');
  requests[9].resolve(ok({
    ok:true,readOnly:true,version:'APEX_1D_ALWAYS_ON_RECOVERY_STATE_V1',
    mode:'canary',enabled:false,killSwitch:{enabled:false},
    stateFile:{source:'FILE_READ_ONLY'},
    totals:{insertedTotal:7,providerAttemptsTotal:9},
    counts:{recoverableSessions:527,due:216,parked:0},
    timestamps:{lastSuccessfulRecoveryAt:'2026-10-31T16:46:51.410Z'},
    generatedAt:'2026-10-31T16:49:00Z',
    lastCompletedNyseSession:'2026-10-30'
  }));
  await recoveryRun;
  assert.match(fourth.recovery.innerHTML,/Acquisizione e salvataggio 1D/);
  assert.match(fourth.recovery.innerHTML,/527/);
  assert.equal(fourth['recovery-run'].disabled,false);
  const lateRun = fourth['recovery-run'].click();
  assert.equal(requests.length,11);
  fourth.close.click();
  assert.equal(requests[10].options.signal.aborted,true);
  assert.equal(requests[8].options.signal.aborted,true, 'close also aborts the opening read');
  requests[10].resolve(ok({ok:true,readOnly:true,version:'BAD'}));
  await lateRun;
  assert.doesNotMatch(fourth.recovery.innerHTML,/non verificabile/,
    'a response after close cannot overwrite the previous rendered checkpoint');

  // A NEW job: progress polled by GET only, one re-read when it ends, then an explicit new acquisition (force).
  const small = covPages(covUniverse(3))[0];
  const progress = n => ({ total: 3, processed: n, pending: 3 - n, retrying: 0, done: n, failed: 0, ivAvailable: n, ivUnavailable: 0, errors: 0 });
  const smallJob = (state, n) => refreshJob(state, n, { universe: { source: 'TEST', digest: COV_DIGEST, count: 3 }, progress: progress(n) });
  launcher.click();
  const fifth = roots[4].fields;
  requests[11].resolve(ok(small));
  await tick(); await tick(); await tick();
  assert.equal(requests.length, 13);
  assert.deepEqual([requests[12].url, requests[12].options.method], [REFRESH + '/jobs', 'POST']);
  requests[12].resolve({ ok: true, status: 202, json: async () => ({ ok: true, created: true, reused: null, superseded: [],
    job: smallJob('RUNNING', 1) }) });
  await tick(); await tick();
  assert.match(fifth.refresh.innerHTML, /Nuova acquisizione IV avviata/);
  assert.match(fifth.refresh.innerHTML, /acquisizione in corso/);
  assert.match(fifth.refresh.innerHTML, /Elaborati <strong>1\/3<\/strong>/);
  assert.equal(fifth['refresh-run'].disabled, true, 'no explicit request while a job runs');
  timeouts.pop()();                                  // the status poll
  assert.equal(requests.length, 14);
  assert.deepEqual([requests[13].url, requests[13].options.method, requests[13].options.body],
    [REFRESH + '/jobs/job-fixture-0001', 'GET', undefined], 'a poll is a GET of the job status, never an acquisition');
  requests[13].resolve(ok({ ok: true, job: smallJob('RUNNING', 2) }));
  await tick(); await tick();
  assert.match(fifth.refresh.innerHTML, /Elaborati <strong>2\/3<\/strong>/);
  assert.doesNotMatch(fifth.refresh.innerHTML, /Nuova acquisizione IV avviata/, 'a poll is not reported as a new start');
  timeouts.pop()();
  requests[14].resolve(ok({ ok: true, job: smallJob('COMPLETE', 3) }));
  await tick(); await tick();
  assert.equal(requests.length, 16, 'the concluded job triggers exactly one coverage re-read');
  assert.equal(requests[15].url, devBackend + '/debug/volatility-carry/coverage?offset=0&limit=25');
  requests[15].resolve(ok(small));
  await tick(); await tick(); await tick();
  assert.equal(requests.length, 16, 'the re-read starts no second refresh');
  assert.match(fifth.refresh.innerHTML, /acquisizione completata/);
  assert.equal(fifth['refresh-run'].disabled, false);
  for (const fn of timeouts.splice(0)) fn();
  await tick();
  assert.equal(requests.length, 16, 'no polling after the job ended');
  fifth['refresh-run'].click();
  fifth['refresh-run'].click();
  assert.equal(requests.length, 17, 'a double click sends one request');
  assert.deepEqual(JSON.parse(requests[16].options.body), { universeDigest: COV_DIGEST, force: true });
  requests[16].resolve(ok({ ok: true, created: false, reused: 'RECENT', superseded: [], job: smallJob('COMPLETE', 3) }));
  await tick(); await tick();
  assert.match(fifth.refresh.innerHTML, /Nessuna nuova acquisizione/, 'a refused explicit request is declared, not hidden');
  fifth.close.click();

  // An old or disabled backend: stated once, never retried, the already-read values stay.
  launcher.click();
  const sixth = roots[5].fields;
  requests[17].resolve(ok(small));
  await tick(); await tick(); await tick();
  requests[18].resolve({ ok: false, status: 404, json: async () => { throw SyntaxError('Unexpected token <'); } });
  await tick(); await tick();
  assert.match(sixth.refresh.innerHTML, /Refresh IV non avviato: Endpoint non ancora disponibile sul backend DEV/);
  assert.match(sixth.refresh.innerHTML, /I valori mostrati restano quelli già letti/);
  assert.match(sixth.state.textContent, /Completato: 3 titoli/);
  for (const fn of timeouts.splice(0)) fn();
  await tick();
  assert.equal(requests.length, 19, 'no automatic retry');
  sixth.close.click();

  // Closing while a poll is scheduled: the timer firing later sends nothing.
  launcher.click();
  const seventh = roots[6].fields;
  requests[19].resolve(ok(small));
  await tick(); await tick(); await tick();
  requests[20].resolve(ok({ ok: true, created: false, reused: 'ACTIVE', superseded: [], job: smallJob('RUNNING', 1) }));
  await tick(); await tick();
  assert.match(seventh.refresh.innerHTML, /già in corso: pannello ricollegato allo stesso job/);
  const pending = timeouts.pop();
  seventh.close.click();
  pending();
  await tick();
  assert.equal(requests.length, 21, 'a closed panel never polls');

  // Closing while the refresh POST is in flight aborts it.
  launcher.click();
  requests[21].resolve(ok(small));
  await tick(); await tick(); await tick();
  assert.equal(requests.length, 23);
  roots[7].fields.close.click();
  assert.equal(requests[22].options.signal.aborted, true, 'close aborts the in-flight refresh request');

  const productionContext = Object.assign({}, context, { BACKEND: 'https://apex-tastytrade-backend-production.up.railway.app' });
  launcher = null;
  vm.runInNewContext(covSource, productionContext, { filename: 'volatility-coverage-monitor.js' });
  assert.equal(launcher, null, 'no launcher against the production backend');
}
// A lifecycle that never settles would let the process exit 0 with its later assertions unrun: completion is checked.
let coverageLifecycleDone = false;
testCoverageLifecycle().then(() => { coverageLifecycleDone = true; }, error => {
  console.error('volatility coverage lifecycle failed:', error);
  process.exitCode = 1;
});
process.on('exit', () => {
  if (!coverageLifecycleDone && !process.exitCode) {
    console.error('volatility coverage lifecycle did not complete');
    process.exitCode = 1;
  }
});

// Full-universe IV refresh: job validation, status wording and per-row provenance (pure renderers).
require('node:test')('IV refresh: job shape is checked; status never presents a reused job as new; rows show history apart', () => {
  const job = { jobId: 'job-fixture-0001', state: 'RUNNING', universe: { digest: COV_DIGEST }, requestedAt: '2026-11-01T10:00:00.000Z',
    finishedAt: null, progress: { total: 319, processed: 20, pending: 299, retrying: 0, done: 20, failed: 0, ivAvailable: 18, ivUnavailable: 2, errors: 0 } };
  assert.equal(cov.checkRefreshJob(job), job);
  for (const bad of [null, {}, { ...job, state: 'DONE' }, { ...job, jobId: 'x' }, { ...job, universe: { digest: 'abc' } },
    { ...job, progress: { ...job.progress, processed: 320 } }, { ...job, progress: { ...job.progress, errors: -1 } },
    { ...job, progress: { ...job.progress, ivAvailable: 1.5 } }])
    assert.equal(cov.checkRefreshJob(bad), null, JSON.stringify(bad).slice(0, 80));
  const running = cov.renderRefreshStatus(job, { created: true });
  assert.match(running, /Nuova acquisizione IV avviata/);
  assert.match(running, /Elaborati <strong>20\/319<\/strong> · con IV valida <strong>18<\/strong> · senza IV 2 · errori 0 · in attesa 299/);
  assert.match(running, /non titoli con IV verificata/);
  assert.match(running, /Tastytrade non attesta quando ha aggiornato la singola IV/);
  const reused = cov.renderRefreshStatus({ ...job, state: 'COMPLETE', finishedAt: '2026-11-01T10:04:00.000Z' }, { reused: 'RECENT' });
  assert.match(reused, /Nessuna nuova acquisizione: riuso del job concluso il 2026-11-01T10:04:00\.000Z/);
  assert.doesNotMatch(reused, /Nuova acquisizione IV avviata/);
  assert.match(cov.renderRefreshStatus(job, { reused: 'ACTIVE' }), /ricollegato allo stesso job/);
  assert.match(cov.renderRefreshStatus(null, { error: '<b>x</b>' }), /&lt;b&gt;x&lt;\/b&gt;/);
  assert.match(cov.renderRefreshStatus({ ...job, backoffUntil: '2026-11-01T10:30:00.000Z' }, {}), /Limite del provider: pausa fino a 2026-11-01T10:30:00\.000Z/);

  const acquisition = { jobId: 'job-fixture-0001', jobState: 'RUNNING', freshness: 'PREVIOUS_ONLY', fetchedAt: null,
    lastSuccessful: { jobId: 'job-old-00001', iv: 0.2, fetchedAt: '2026-10-31T15:00:00.000Z', selectedExpiration: '2026-12-18' } };
  const pending = cov.acquisitionCell({ value: null, status: 'NOT_CHECKED', acquisition });
  assert.match(pending, /non ancora aggiornata nel job corrente/);
  assert.match(pending, /storica 20\.00% del 2026-10-31T15:00:00\.000Z · esclusa dagli spread/);
  const current = cov.acquisitionCell({ value: 0.31, acquisition: { ...acquisition, freshness: 'CURRENT_JOB', fetchedAt: '2026-11-01T10:01:00.000Z' },
    timing: { comparable: true, basis: 'FETCHED_BETWEEN_SESSIONS', reason: null } });
  assert.match(current, /acquisita nel job corrente · acquisita 2026-11-01T10:01:00\.000Z/);
  assert.match(current, /confrontabile con la RV \(FETCHED_BETWEEN_SESSIONS\)/);
  assert.doesNotMatch(current, /storica/, 'no history line when the value is this job\'s');
  assert.match(cov.acquisitionCell({ value: 0.31, acquisition: { freshness: 'CURRENT_JOB' },
    timing: { comparable: false, reason: 'IV_OBSERVED_AFTER_NEXT_SESSION_CLOSED' } }), /non confrontabile: IV_OBSERVED_AFTER_NEXT_SESSION_CLOSED/);
  assert.equal(cov.acquisitionCell({ value: 0.31 }), '', 'pilot rows carry no acquisition line');

  // CSV of a refresh read: this job's value and the earlier IV are separate columns; a running job is not a complete snapshot.
  const data = cov.combinePages(covMixed());
  data.sources = { ...data.sources, ivMode: 'FULL_UNIVERSE_REFRESH' };
  data.ivRefresh = { jobId: 'job-fixture-0001', jobState: 'RUNNING' };
  data.rows[0].ivRef = { ...data.rows[0].ivRef, acquisition: { ...acquisition, freshness: 'CURRENT_JOB', fetchedAt: '2026-11-01T10:01:00.000Z',
    providerAsOf: null }, timing: { comparable: true, basis: 'FETCHED_BETWEEN_SESSIONS', reason: null, providerUpdateAttested: false } };
  data.rows[1].ivRef = { ...data.rows[1].ivRef, acquisition };
  const lines = cov.toCsv(data, {}).split('\r\n'), header = lines[0].split(','), col = n => header.indexOf(n);
  const r0 = lines[1].split(','), r1 = lines[2].split(',');
  assert.deepEqual([r0[col('iv_mode')], r0[col('iv_refresh_job_state')], r0[col('iv_refresh_snapshot_complete')]],
    ['FULL_UNIVERSE_REFRESH', 'RUNNING', 'false']);
  assert.deepEqual([r0[col('iv_ref_from_current_job')], r0[col('iv_fetched_at')], r0[col('iv_provider_as_of')], r0[col('iv_provider_update_attested')]],
    ['true', '2026-11-01T10:01:00.000Z', '', 'false']);
  assert.deepEqual([r1[col('iv_ref_from_current_job')], r1[col('iv_freshness')], r1[col('iv_last_successful')], r1[col('iv_last_successful_job_id')]],
    ['false', 'PREVIOUS_ONLY', '0.2', 'job-old-00001']);
  // A job that progresses (or changes) while the pages are read is stated by its own warning, not hidden, and is not
  // reported as a generic source change.
  const withRefresh = (pages, states) => pages.map((p, i) => ({ ...p, sources: { ...p.sources, ivMode: 'FULL_UNIVERSE_REFRESH',
    ivRefresh: states[i] } }));
  const st = (jobId, processed) => ({ jobId, jobState: 'RUNNING', progress: { total: 60, processed } });
  const pagesOf = covPages(covUniverse(60));
  assert.deepEqual(cov.combinePages(withRefresh(pagesOf, [st('job-a-000001', 5), st('job-a-000001', 5), st('job-a-000001', 5)])).warnings, []);
  const moved = cov.combinePages(withRefresh(pagesOf, [st('job-a-000001', 5), st('job-a-000001', 9), st('job-a-000001', 12)]));
  assert.deepEqual(moved.warnings, ['IV_REFRESH_PROGRESSED_DURING_READ']);
  assert.equal(moved.ivRefresh.progress.processed, 12, 'the summary shows the LAST page\'s job state');
  assert.deepEqual(cov.combinePages(withRefresh(pagesOf, [st('job-a-000001', 5), st('job-b-000001', 0), st('job-b-000001', 0)])).warnings,
    ['IV_REFRESH_JOB_CHANGED_DURING_READ']);
});

// The fixed DEV button. The launcher at the end of the inline script in index.html is the only place the page fetches
// the coverage module. It runs here as the browser runs it: after the real js/config/backend-config.js, in the same
// global scope, over a fake DOM that records every element, script, listener, timer, storage access and network call.
// Same file once more, for the ratcheted suite file count.
const LAUNCHER_START = '(function apexVolCoverageLauncher() {';
const launcherAt = html.indexOf(LAUNCHER_START);
const launcherSource = html.slice(launcherAt, html.indexOf('\n})();\n', launcherAt) + '\n})();\n'.length);
const backendConfigSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'config', 'backend-config.js'), 'utf8');
const launcherProdBackend = 'https://apex-tastytrade-backend-production.up.railway.app';
const DEV_CLEAN = 'dev-clean--spontaneous-queijadas-118823.netlify.app';
const PREVIEW = 'deploy-preview-553--spontaneous-queijadas-118823.netlify.app';
function launcherPage(hostname, options) {
  options = options || {};
  const calls = [], scripts = [], listeners = [], mounted = [], roots = [];
  const element = tag => ({
    tag, id: '', type: '', src: '', textContent: '', innerHTML: '', value: '', disabled: false, hidden: false,
    removed: false, style: {}, handlers: {}, attrs: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] ?? null; },
    focus() {}, remove() { this.removed = true; },
    click() { return this.handlers.click && this.handlers.click({ target: this }); },
  });
  const document = {
    readyState: options.readyState || 'complete',
    addEventListener(type, fn, opts) { listeners.push({ type, fn, opts }); },
    getElementById(id) { return mounted.find(el => el.id === id && !el.removed) || null; },
    createElement(tag) {
      const el = element(tag);
      if (tag === 'div') el.attachShadow = () => {
        const fields = Object.fromEntries(['run', 'refresh-run', 'refresh', 'recovery-run', 'recovery', 'csv', 'state', 'summary', 'filters', 'search', 'availability', 'spread', 'dividend',
          'status', 'reason', 'count', 'table', 'detail', 'close', 'shade'].map(id => [id, element('field')]));
        const root = { fields, getElementById: id => fields[id], querySelector: () => fields.shade, appendChild() {} };
        roots.push(root);
        return root;
      };
      return el;
    },
    head: { appendChild(el) { scripts.push(el); } },
    body: { appendChild(el) { mounted.push(el); } },
  };
  const spy = name => function () { calls.push(name); };
  const location = { hostname };
  const sandbox = {
    console: { log() {} }, location, window: { location }, document, S: { backendKey: 'fixture-only-api-key' },
    AbortController, clearTimeout() {},
    fetch: options.fetch || spy('fetch'), setTimeout: options.setTimeout || spy('setTimeout'),
    XMLHttpRequest: spy('XMLHttpRequest'), WebSocket: spy('WebSocket'), EventSource: spy('EventSource'),
    setInterval: spy('setInterval'),
  };
  for (const name of ['localStorage', 'sessionStorage', 'indexedDB'])
    Object.defineProperty(sandbox, name, { get() { calls.push(name); return undefined; } });
  if (options.override !== undefined) sandbox.window.__APEX_BACKEND_URL__ = options.override;
  const context = vm.createContext(sandbox);
  vm.runInContext(backendConfigSource, context, { filename: 'backend-config.js' });
  const loadModule = () => vm.runInContext(covSource, context, { filename: 'volatility-coverage-monitor.js' });
  if (options.moduleFirst) loadModule();
  vm.runInContext(launcherSource, context, { filename: 'index.html#apexVolCoverageLauncher' });
  return { context, calls, scripts, listeners, mounted, roots, loadModule, backend: vm.runInContext('BACKEND', context),
    boot: () => document.getElementById('apex-vol-coverage-boot'),
    launcher: () => document.getElementById('apex-vol-coverage-launcher') };
}

require('node:test')('coverage launcher: a button only on an authorised DEV host whose BACKEND is the DEV backend', () => {
  for (const [hostname, override, expected] of [
    ['localhost', undefined, true], ['127.0.0.1', undefined, true], [DEV_CLEAN, undefined, true], [PREVIEW, undefined, true],
    ['deploy-preview-1--spontaneous-queijadas-118823.netlify.app', undefined, true],
    // Production and look-alikes. backend-config resolves the DEV backend for most of them; the hostname refuses them.
    ['spontaneous-queijadas-118823.netlify.app', undefined, false], ['main--spontaneous-queijadas-118823.netlify.app', undefined, false],
    ['claude-volatility-coverage-launcher--spontaneous-queijadas-118823.netlify.app', undefined, false],
    ['x' + DEV_CLEAN, undefined, false], [DEV_CLEAN + '.evil.example', undefined, false], [PREVIEW + '.evil.example', undefined, false],
    ['evil.' + PREVIEW, undefined, false],
    ['deploy-preview-x--spontaneous-queijadas-118823.netlify.app', undefined, false], ['evil-deploy-preview.netlify.app', undefined, false],
    ['apex.example.com', undefined, false], ['', undefined, false],
    // Accidental overrides of the backend URL: neither the DEV backend on another host, nor another backend on a DEV host.
    ['spontaneous-queijadas-118823.netlify.app', devBackend, false], ['apex.example.com', devBackend + '/', false],
    [DEV_CLEAN, launcherProdBackend, false], [PREVIEW, launcherProdBackend, false], ['localhost', launcherProdBackend, false],
    [DEV_CLEAN, 'https://evil.example', false], [DEV_CLEAN, devBackend + '/', true],
  ]) {
    const page = launcherPage(hostname, { override });
    const label = (hostname || '(empty hostname)') + (override === undefined ? '' : ' with override ' + override);
    assert.equal(!!page.boot(), expected, (expected ? 'button: ' : 'no button: ') + label);
    assert.equal(!!page.boot(), cov.devContext(hostname, page.backend), 'the launcher and the module agree: ' + label);
    assert.equal(page.scripts.length, 0, 'nothing fetched before a click: ' + label);
    assert.deepStrictEqual(page.calls, [], 'no request, timer or storage access: ' + label);
  }
  for (const hostname of ['main--spontaneous-queijadas-118823.netlify.app', DEV_CLEAN + '.evil.example', 'evil-deploy-preview.netlify.app'])
    assert.equal(launcherPage(hostname).backend, devBackend, 'backend-config resolves DEV; the hostname refuses: ' + hostname);
  assert.equal(launcherPage('spontaneous-queijadas-118823.netlify.app').backend, launcherProdBackend);
  assert.equal(launcherPage('spontaneous-queijadas-118823.netlify.app', { override: devBackend }).backend, devBackend,
    'the production override really reaches the DEV backend, and still gets no button');
  // Control: the recorders record, so the empty lists above are measurements.
  const control = launcherPage('localhost');
  vm.runInContext("fetch('/x'); setTimeout(function () {}); void localStorage;", control.context);
  assert.deepStrictEqual(control.calls, ['fetch', 'setTimeout', 'localStorage']);
});

require('node:test')('coverage launcher: the first click fetches the module once and opens the panel, which reads page 1 at once', async () => {
  const requests = [], timers = [];
  const page = launcherPage(DEV_CLEAN, {
    fetch: (url, options) => new Promise(resolve => requests.push({ url, options, resolve })),
    setTimeout: fn => { timers.push(fn); return timers.length; },
  });
  const boot = page.boot();
  assert.equal(boot.type, 'button');
  assert.equal(boot.textContent, 'IV − RV · DEV');
  boot.click();
  assert.equal(page.scripts.length, 1, 'the first click fetches the module');
  assert.equal(page.scripts[0].src, './devtools/volatility-coverage-monitor.js', '…from the same origin');
  assert.equal(boot.disabled, true);
  assert.equal(boot.textContent, 'IV − RV · caricamento…');
  boot.click();
  assert.equal(page.scripts.length, 1, 'a click while it loads fetches nothing more');
  page.loadModule();  // the browser runs the fetched module, then fires load
  page.scripts[0].onload();
  const launcher = page.launcher();
  assert.ok(launcher, 'the module mounted its own launcher');
  assert.equal(boot.removed, true, '…which takes the place of this button');
  assert.equal(launcher.style.cssText, boot.style.cssText, '…in the same place, with the same look');
  assert.equal(launcher.textContent, 'IV − RV · DEV');
  assert.equal(launcher.attrs['aria-label'], boot.attrs['aria-label']);
  assert.equal(page.roots.length, 1, 'the click that fetched the module also opened the panel');
  assert.equal(requests.length, 1, 'opening the panel reads page 1 of the coverage at once');
  assert.equal(requests[0].url, devBackend + '/debug/volatility-carry/coverage?offset=0&limit=25');
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(timers.length, 1, '…with its one per-page timeout');
  const panel = page.roots[0].fields;
  const run = panel.run.click();  // «Analizza universo» while the opening read runs
  assert.equal(requests.length, 1, '«Analizza universo» joins the opening read');
  panel.close.click();
  requests[0].resolve({ ok: true, status: 200, json: async () => covPages(covUniverse(3))[0] });
  await run; await new Promise(r => setImmediate(r));
  assert.equal(requests.length, 1, 'a panel closed during its read sends nothing more (no refresh request)');
  launcher.click();
  assert.equal(page.roots.length, 2, 'later clicks go to the module launcher and reopen the panel');
  assert.equal(page.scripts.length, 1, '…never fetch the module again');
  assert.equal(requests.length, 2, '…and the reopened panel reads page 1 again, nothing else');
  assert.equal(requests[1].options.method, 'GET');
  assert.deepStrictEqual(page.calls, []);
});

require('node:test')('coverage launcher: a failed fetch is reported and retried only on a click; a module that does not mount opens nothing', () => {
  const page = launcherPage(PREVIEW);
  const boot = page.boot();
  boot.click();
  page.scripts[0].onerror();
  assert.equal(page.scripts[0].removed, true, 'the failed script element is removed');
  assert.equal(boot.disabled, false);
  assert.equal(boot.textContent, 'IV − RV · caricamento fallito, riprova');
  assert.equal(page.scripts.length, 1, 'no retry by itself');
  boot.click();
  assert.equal(page.scripts.length, 2, 'a click retries');
  page.scripts[1].onload();  // loaded, yet no launcher: the module refused this page
  assert.equal(boot.removed, false);
  assert.equal(boot.disabled, true);
  assert.equal(boot.textContent, 'IV − RV · pannello non disponibile');
  boot.click();
  assert.equal(page.scripts.length, 2, 'a refusal is final: nothing is fetched again');
  assert.equal(page.roots.length, 0, 'no panel');
  assert.deepStrictEqual(page.calls, []);
});

require('node:test')('coverage launcher: a module already loaded from the Console is reused, not fetched again', () => {
  const page = launcherPage('localhost', { moduleFirst: true });
  const boot = page.boot();
  assert.ok(boot && page.launcher(), 'both buttons exist until the first click');
  boot.click();
  assert.equal(page.scripts.length, 0, 'nothing fetched');
  assert.equal(boot.removed, true);
  assert.equal(page.roots.length, 1, 'the loaded module opened its panel');
  assert.deepStrictEqual(page.calls, ['setTimeout', 'fetch'], '…whose opening read is its only network call (with its timeout)');
});

require('node:test')('coverage launcher: waits for DOMContentLoaded while the document loads, and mounts one button', () => {
  const page = launcherPage(DEV_CLEAN, { readyState: 'loading' });
  assert.equal(page.boot(), null, 'nothing is mounted while the document loads');
  assert.equal(page.listeners.length, 1);
  assert.equal(page.listeners[0].type, 'DOMContentLoaded');
  assert.equal(page.listeners[0].opts.once, true);
  page.listeners[0].fn();
  page.listeners[0].fn();
  assert.equal(page.mounted.filter(el => el.id === 'apex-vol-coverage-boot').length, 1, 'one button');
  assert.equal(launcherPage('spontaneous-queijadas-118823.netlify.app', { readyState: 'loading' }).listeners.length, 0,
    'production registers no listener at all');
});

require('node:test')('coverage launcher: one block, the last statement of the inline script, with no request, storage or timer API', () => {
  assert.equal(html.split(LAUNCHER_START).length - 1, 1, 'one launcher');
  assert.ok(html.endsWith(launcherSource + '\n</script>\n</body>\n</html>\n'), 'the last statement of the inline script');
  assert.doesNotMatch(launcherSource,
    /fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|cookie|setTimeout|setInterval|__APEX_BACKEND_URL__/);
  assert.equal(launcherSource.split("createElement('script')").length - 1, 1, 'one script element, created on the click');
  assert.ok(launcherSource.includes("script.src = './devtools/volatility-coverage-monitor.js';"), 'the one module path');
  assert.equal(vm.runInNewContext(backendConfigSource + '\nDEV_BACKEND;', { console: { log() {} }, window: {}, location: { hostname: '' } }),
    devBackend, 'DEV_BACKEND, which the launcher compares BACKEND with, is the backend the module pins');
});

// Dividend audit regression suite, rehomed from PR #554 into the existing
// frontend contract test file to preserve the protected test-file inventory.
(function dividendCoverageUiRegression() {
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const ui=require('../devtools/volatility-coverage-monitor.js');

const statuses={DIVIDEND_COMPATIBLE:0,INVALID_DATA:0,UNRESOLVED:0,
  IN_RANGE_UNDETERMINED:0,NO_EVENT:0,VALID_OHLC:0};
function audit(overrides={}){
  return {state:'COMPLETE',evidenceDate:'2026-10-31',completedDay:'2026-10-31',total:0,
    counts:{...statuses},readOnly:true,rvCertified:false,mayValidateRv:false,changesPrices:false,...overrides};
}
function row(symbol,index,auditValue){
  const rv=(n)=>({value:null,basis:null,closesRequired:n+1,coverage:null,
    certified:{status:'UNAVAILABLE',reasons:['RV'+n+'_NOT_FINAL'],validatedSessions:0},stored:null,lastCertified:null});
  return {symbol,universePosition:index,status:'UNAVAILABLE',primaryReason:null,reasons:[],
    ivRef:{value:null,status:'NOT_IN_PILOT',reason:'NOT_IN_IV_PILOT',source:'TASTYTRADE_SELECTED_REGULAR_EXPIRY_IV',
      censusState:'NOT_READ',pilotMember:false},
    rv20:rv(20),rv60:rv(60),spreads:{
      ivMinusRv20Pp:{valuePp:null,basis:null,missing:[]},
      ivMinusRv60Pp:{valuePp:null,basis:null,missing:[]}},
    asOf:{rvSessionDate:'2026-10-30',ivAsOfDate:null,datesDiffer:false},
    candleQuality:{issues:false,storedCandles:0,structurallyValidCandles:0,excludedRows:0,excludedByReason:{},duplicateSessions:0},
    errors:{},evidence:{available:false,error:null},historicalCertified:{state:'NOT_READ'},
    ...(auditValue===undefined?{}:{dividendAudit:auditValue})};
}
const reported=[
  row('PGR',0,audit({total:2,counts:{...statuses,DIVIDEND_COMPATIBLE:2}})),
  row('PARA',1,audit({total:1,counts:{...statuses,INVALID_DATA:1}})),
  row('XLB',2,audit({total:1,counts:{...statuses,UNRESOLVED:1}})),
  row('SPY',3,audit()),
];
function dataset(rows=reported,sourceState='COMPLETE'){
  return {rows,sources:{dividendAudit:{state:sourceState,evidenceDate:'2026-10-31',
    completedDay:sourceState==='COMPLETE'?'2026-10-31':null,evidenceCount:361}},
    universe:{source:'test',count:rows.length,digest:'a'.repeat(64)},
    asOfSessionDate:'2026-10-30',ivAsOfDate:'2026-10-31',
    generatedFrom:'2026-10-31T12:00:00Z',generatedTo:'2026-10-31T12:05:00Z',
    pageGeneratedAt:Object.fromEntries(rows.map(r=>[r.symbol,'2026-10-31T12:00:00Z'])),
    atomic:false,warnings:[]};
}
test('advisory audit row states and summary do not alter IV/RV or imply certification',()=>{
  const a=ui.dividendAuditOf(reported[0]);
  assert.equal(a.state,'COMPLETE');
  assert.equal(a.total,2);
  assert.equal(a.counts.DIVIDEND_COMPATIBLE,2);
  assert.match(ui.dividendAuditCell(reported[1]),/da verificare 1/);
  assert.match(ui.dividendAuditCell(reported[2]),/da verificare 1/);
  assert.match(ui.dividendAuditCell(reported[3]),/0.*rilievi/);
  const sum=ui.dividendAuditSummary(dataset());
  assert.match(sum,/361 rilievi nello storico audit complessivo/);
  assert.match(sum,/compatibili.*2/);
  assert.match(sum,/da approfondire.*2/);
  assert.match(sum,/NON significa data ex-dividendo verificata/);
  assert.match(ui.renderTable(reported,{key:'position',dir:'asc'},{}),/Audit dividendi/);
  assert.match(ui.renderTable([],null,{}),/colspan="14"/);
  assert.equal(ui.summarize(reported).ivRef,0);
  assert.equal(ui.summarize(reported).complete,0);
});
test('missing, disabled, error, partial evidence never turns into an inferred zero',()=>{
  for(const x of [undefined,audit({state:'NOT_RECORDED',total:null,counts:null}),
    audit({state:'DISABLED',total:null,counts:null}),
    audit({state:'ERROR',total:null,counts:null}),
    audit({state:'COMPLETE',total:9,counts:null})]){
    const r=row('PGR',0,x);
    assert.equal(ui.dividendAuditOf(r).total,null);
    assert.match(ui.dividendAuditCell(r),/—/);
    assert.equal(ui.filterRows([r],{dividend:'NO_FINDINGS'}).length,0);
    assert.equal(ui.filterRows([r],{dividend:'UNAVAILABLE'}).length,1);
  }
  const partial=row('SPY',0,audit({state:'IN_PROGRESS'}));
  assert.equal(ui.dividendAuditOf(partial).total,0);
  assert.match(ui.dividendAuditCell(partial),/finora/);
  assert.equal(ui.filterRows([partial],{dividend:'NO_FINDINGS'}).length,0);
  assert.equal(ui.filterRows([partial],{dividend:'UNAVAILABLE'}).length,1);
  assert.match(ui.dividendAuditSummary(dataset([partial],'IN_PROGRESS')),/Audit incompleto/);
  assert.match(ui.dividendAuditSummary(dataset([row('SPY',0)],'NOT_RECORDED')),/nessun conteggio dedotto/);
});
test('new filters are diagnostic only and independent of trading status',()=>{
  assert.deepEqual(ui.filterRows(reported,{dividend:'REVIEW'}).map(r=>r.symbol),['PARA','XLB']);
  assert.deepEqual(ui.filterRows(reported,{dividend:'COMPATIBLE'}).map(r=>r.symbol),['PGR']);
  assert.deepEqual(ui.filterRows(reported,{dividend:'NO_FINDINGS'}).map(r=>r.symbol),['SPY']);
  assert.deepEqual(ui.filterRows(reported,{dividend:'FINDINGS'}).map(r=>r.symbol),['PGR','PARA','XLB']);
  assert.equal(ui.filterRows(reported,{dividend:'NOT_A_FILTER'}).length,0);
  for(const r of reported) assert.equal(r.status,'UNAVAILABLE');
});
test('CSV retains original RV/IV fields and exports exact audit status and counts',()=>{
  const csv=ui.toCsv(dataset(),{});
  const lines=csv.trim().split(/\r?\n/),header=lines[0].split(',');
  const col=name=>header.indexOf(name);
  assert.ok(col('iv_ref')>=0);
  assert.ok(col('rv20')>=0);
  assert.ok(col('iv_minus_rv60_pp')>=0);
  assert.ok(col('dividend_audit_state')>=0);
  assert.ok(col('dividend_compatible')>=0);
  assert.ok(col('dividend_invalid_data')>=0);
  assert.ok(col('dividend_unresolved')>=0);
  const pgr=lines[1].split(','),para=lines[2].split(','),xlb=lines[3].split(',');
  assert.equal(pgr[col('dividend_audit_total')],'2');
  assert.equal(pgr[col('dividend_compatible')],'2');
  assert.equal(para[col('dividend_invalid_data')],'1');
  assert.equal(xlb[col('dividend_unresolved')],'1');
  assert.equal(pgr[col('iv_ref')],'');
  assert.equal(pgr[col('rv20')],'');
  assert.equal(pgr[col('iv_minus_rv60_pp')],'');
  assert.match(ui.toCsv(dataset([row('SPY',0)],'NOT_RECORDED'),{}),/dividend_audit_state/);
});
test('detail shows provider date semantics, bounds findings and escapes adversarial text',()=>{
  const detail={
    sources:{dividendAudit:{state:'COMPLETE'}},
    dividendAudit:{...audit({total:1,counts:{...statuses,DIVIDEND_COMPATIBLE:1}}),
      findings:[{timestamp:'2026-10-30T00:00:00Z',status:'DIVIDEND_COMPATIBLE',
        eventDate:'2026-10-31',amount:1.73,reason:'<img src=x onerror=alert(1)>',
        dateSemantics:'PROVIDER_OCCURRED_DATE_EX_DATE_UNVERIFIED'}],
      findingsTruncated:false},
  };
  const html=ui.renderDividendDetail(detail);
  assert.match(html,/importo 1.73/);
  assert.match(html,/PROVIDER_OCCURRED_DATE_EX_DATE_UNVERIFIED/);
  assert.match(html,/NON è verificata/);
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
  const old=ui.renderDividendDetail({sources:{}});
  assert.match(old,/Conteggi non disponibili/);
  assert.doesNotMatch(old,/0 rilievi/);
  const partial=ui.renderDividendDetail({dividendAudit:audit({state:'IN_PROGRESS'})});
  assert.match(partial,/Storico non attestato come completo/);
});
test('API page and detail of old backend still validate; additive data does not change core responses',()=>{
  const r=row('AAPL',0);
  const page={ok:true,version:'VOLATILITY_COVERAGE_V1',readOnly:true,notForTrading:true,
    executionAuthorized:false,universe:{count:1,digest:'a'.repeat(64)},
    offset:0,limit:25,rows:[r],returned:1,nextOffset:null,
    asOfSessionDate:'2026-10-30',ivAsOfDate:'2026-10-31'};
  assert.equal(ui.checkPage(page,0),page);
  const updated=structuredClone(page);
  updated.rows[0].dividendAudit=audit();
  updated.sources={dividendAudit:{state:'COMPLETE',evidenceCount:361}};
  assert.equal(ui.checkPage(updated,0),updated);
  assert.deepEqual(ui.filterRows(page.rows,{}),page.rows);
});

test('cross-page audit source changes are never presented as fully reconciled totals',()=>{
  const data=dataset();
  data.warnings=['SOURCES_CHANGED_DURING_READ'];
  const html=ui.dividendAuditSummary(data);
  assert.match(html,/Audit incompleto o non uniforme/);
  assert.match(html,/parziali/);
  assert.match(html,/NON significa data ex-dividendo verificata/);
});

})();
