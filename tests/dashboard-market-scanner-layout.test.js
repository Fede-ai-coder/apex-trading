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
