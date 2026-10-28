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
