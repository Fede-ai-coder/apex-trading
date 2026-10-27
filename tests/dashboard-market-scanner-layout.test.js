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
// No JS script tags were added: the classic-loader ordering is unchanged.
// No boot-time HTTP calls and no source/credential expansion to PROD.
assert.match(html, /<body onload="if \(\(location\.hostname/);
assert.match(html, /devtools\/rv-pilot-audit\.js/);
assert.equal((html.match(/<script\b/gi) || []).length, 115);
const uiSource=fs.readFileSync(path.join(__dirname, '..', 'devtools', 'rv-pilot-audit.js'),'utf8');
assert.match(uiSource,/setTimeout\(\(\) => controller\.abort\(\), 20000\)/);
assert.match(uiSource,/if \(current !== controller \|\| host !== runHost\) return;/);
assert.match(uiSource,/if \(current === controller && host === runHost\)/);
assert.doesNotMatch(uiSource,/localStorage|sessionStorage/);
