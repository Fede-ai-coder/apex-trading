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

console.log('dashboard-market-scanner-layout: all assertions passed');
