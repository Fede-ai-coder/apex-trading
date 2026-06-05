'use strict';
// Backend Directional Preview (BDSP) tests. Extracts the real helpers from
// index.html and runs them in a vm sandbox so the preview cannot drift from app
// code. Run: node tests/backend-directional-preview.test.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) { if (esc) { esc = false; continue; } if (c === '\\') { esc = true; continue; } if (c === inS) inS = null; continue; }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error('unterminated body: ' + name);
}
function sourceBetween(a, b) {
  const start = HTML.indexOf(a), end = HTML.indexOf(b, start + a.length);
  if (start < 0 || end < 0) throw new Error('source markers not found');
  return HTML.slice(start, end);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

function mkCand(sym, dir, score, bucket, rs) {
  return {
    symbol: sym, price: 100 + score,
    rsi14: 60, sma8: 99, sma20: 97, sma30: 95, sma200: 80,
    distFromSma8: 1.1, distFromSma20: 3.2, distFromSma30: 5, distFromSma200: 25,
    squeezeState: false,
    relativeStrengthVsSpy: rs,
    directionDiagnostics: { candidateDirection: dir, confidence: 'high', directionSource: 'test' },
    directionParity: { comparable: true, matches: true, mismatchType: null },
    scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: score, scoreBucket: bucket },
    technicalCoverage: { completeCoreTechnicals: true },
    cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 251, reason: 'warm' },
    direction: null,
    score: null,
  };
}
const snapshot = { ok: true, stale: false, ageMs: 12000, updatedAt: '2026-06-03T14:30:00Z', nextScheduledRunAt: '2026-06-03T14:31:00Z', candidates: [
  mkCand('SPY', 'bullish', 79, 'B', 0.2),
  mkCand('AAPL', 'bullish', 94, 'A', 0.5),
  mkCand('MSFT', 'bullish', 72, 'B', 0.1),
] };
const status = { ok: true, schedulerEnabled: true };

const elements = {};
function el(id) {
  if (!elements[id]) {
    elements[id] = {
      id, style: {}, innerHTML: '', classList: {
        classes: new Set(),
        toggle(c, on) { if (on) this.classes.add(c); else this.classes.delete(c); },
        contains(c) { return this.classes.has(c); },
      }
    };
  }
  return elements[id];
}
const local = new Map();
const networkCalls = [];
function block(name) { return function () { networkCalls.push(name); throw new Error('blocked ' + name); }; }
let refreshCalls = 0;

const sandbox = {
  console, JSON, Object, String, Number, Math, isFinite, Array, Boolean, Date, Intl,
  S: { scanData: [{ ticker: 'UNCHANGED', score: 1 }], backendDirectionalPreview: { enabled: false } },
  document: { getElementById: el },
  localStorage: { getItem: (k) => local.has(k) ? local.get(k) : null, setItem: (k, v) => local.set(k, String(v)) },
  bssState: () => ({ snapshot, status }),
  bssRefresh: () => { refreshCalls++; },
  escHtml: (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  fetch: block('fetch'), WebSocket: block('WebSocket'), XMLHttpRequest: block('XMLHttpRequest'),
  subscribeDxlinkQuotes: block('subscribeDxlinkQuotes'), ttCall: block('ttCall'),
  window: {},
};
vm.createContext(sandbox);

const FNS = [
  '_bdsNum','_bdsBoolOrNull','_bdsStrOrNull',
  'bdsIsBackendDirectionalCandidate','bdsMapBackendCandidateToDirectionalRow','bdsSortBackendDirectionalRows','bdsDeriveBackendDirectionalRows','bdsBackendDirectionalSummary','bdsGetBackendDirectionalSourceState',
  'bssNum','bssFmtAgeMs','bssFmtClock',
  'bdspStorageKey','bdspState','bdspLoadPersistedEnabled','bdspPersistEnabled','bdspIsEnabled','bdspSetEnabled','bdspToggle','bdspRefresh',
  'bdspBadge','bdspKV','bdspFmtNum','bdspFmtAge','bdspFmtClock','bdspFreshBadge','bdspDirBadge','bdspBucketBadge','bdspBoolBadge','bdspParityBadge','bdspOperationalBadge',
  'bdspRenderSourceState','bdspRenderSummary','bdspRenderRows','bdspIsScannerSourceActive','bdspGetRowsForScannerResults','bdspRenderBackendResultEmptyState','bdspRenderBackendResultRows','bdspRenderScannerResultsOverride','bdspMaybeRenderScannerResults','bdspRestoreFrontendScannerResults','bdspRender','bdspInit','apexDebugBackendDirectionalPreview',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);

section('1. default OFF and persistence');
ok(sandbox.bdspLoadPersistedEnabled() === false, 'localStorage missing defaults OFF');
sandbox.bdspInit();
ok(sandbox.bdspIsEnabled() === false, 'bdspInit keeps Backend Preview OFF by default');
ok(el('scanResults').style.display === 'block', 'frontend scanner result area visible by default');
ok(el('bdsp-preview').style.display === 'none', 'separate backend preview panel hidden by default');

section('2. toggle does not network and preserves frontend state');
const beforeScan = JSON.stringify(sandbox.S.scanData);
sandbox.bdspSetEnabled(true);
ok(networkCalls.length === 0, 'toggle ON makes no fetch/WebSocket/subscription calls');
ok(JSON.stringify(sandbox.S.scanData) === beforeScan, 'toggle ON does not mutate existing scanner candidate array');
ok(el('scanResults').style.display === 'block' && el('bdsp-preview').style.display === 'none', 'toggle ON renders override in the main scanner result area only');
ok(/Backend Preview source active/.test(el('scanResults').innerHTML), 'toggle ON injects the backend preview scanner-results override');
sandbox.bdspSetEnabled(false);
ok(networkCalls.length === 0, 'toggle OFF makes no network calls');
ok(JSON.stringify(sandbox.S.scanData) === beforeScan, 'toggle OFF leaves frontend scanner state untouched');
ok(el('scanResults').style.display === 'block' && !/Backend Preview source active/.test(el('scanResults').innerHTML), 'toggle OFF restores/hides backend scanner-results override');
ok(local.get('apex_directional_backend_preview') === '0', 'persistence writes OFF as 0');

section('3. renders rows, summary and source state');
sandbox.bdspSetEnabled(true);
const html = el('scanResults').innerHTML;
ok(/Backend Preview/.test(html) && /DIAGNOSTIC ONLY/.test(html) && /NOT OPERATIONAL/.test(html), 'preview is clearly labelled diagnostic/not operational');
ok(/Backend available/.test(html) && />yes</.test(html) && /Scheduler/.test(html) && />ON</.test(html), 'renders source state available true and scheduler ON');
ok(html.indexOf('AAPL') < html.indexOf('SPY') && html.indexOf('SPY') < html.indexOf('MSFT'), 'rows use adapter sort order by score');
ok(/AAPL/.test(html) && /94 preview/.test(html) && />A</.test(html) && /BULLISH/.test(html), 'renders backend-derived candidate fields');
ok(/Score Preview/.test(html) && /Diagnostic only/.test(html), 'scorePreview is labelled preview/diagnostic, not operational score');
ok(/null \/ inactive/.test(html), 'operational direction/score render as null/inactive');
ok(/Total rows/.test(html) && /Bullish/.test(html) && /Buckets/.test(html) && /Top symbols/.test(html), 'renders summary block');

section('4. unavailable, NO_SNAPSHOT and empty rows');
sandbox.bssState = () => null;
ok((() => { try { sandbox.bdspRender(); return /Backend snapshot unavailable/.test(el('scanResults').innerHTML); } catch (e) { return false; } })(), 'missing bssState/state does not crash');
sandbox.bssState = () => ({ snapshot: { ok: false, reason: 'NO_SNAPSHOT', candidates: [] }, status });
ok((() => { try { sandbox.bdspRender(); return /Backend snapshot unavailable/.test(el('scanResults').innerHTML) && /snapshot_not_ok/.test(el('scanResults').innerHTML); } catch (e) { return false; } })(), 'NO_SNAPSHOT renders scanner-result fallback without crash');
sandbox.bssState = () => ({ snapshot: { ok: true, candidates: [] }, status });
sandbox.bdspRender();
ok(/Backend available/.test(el('scanResults').innerHTML) && /no_candidates/.test(el('scanResults').innerHTML), 'unavailable source state renders reason');
ok(/Backend snapshot unavailable — switch back to Frontend Scanner or wait for scheduler/.test(el('scanResults').innerHTML), 'empty rows render clear scanner-result fallback state');

section('5. refresh and escaping');
sandbox.bssState = () => ({ snapshot: { ok: true, stale: false, candidates: [Object.assign(mkCand('BAD<', 'bullish', 50, 'C', 0), { directionParity: { comparable: true, matches: false, mismatchType: 'bad<type' } })] }, status });
sandbox.bdspRender();
ok(/BAD&lt;/.test(el('scanResults').innerHTML) && !/BAD</.test(el('scanResults').innerHTML), 'missing diagnostics/warnings render safely with HTML escaping');
refreshCalls = 0;
sandbox.bdspRefresh();
ok(refreshCalls === 1 && networkCalls.length === 0, 'Refresh preview delegates to bssRefresh only');

section('6. source-level guards');
const bdspSrc = sourceBetween('// ── Backend Directional Preview (BDSP)', '// ── Data-source label helpers');
const noComments = stripComments(bdspSrc);
ok(!/POST\s*\/scanner\/run|scanner\/run/.test(noComments), 'BDSP source contains no POST /scanner/run path');
ok(!/subscribeDxlinkQuotes|subscribe-quotes|new\s+WebSocket|_initCandleStream|FEED_SUBSCRIPTION/.test(noComments), 'BDSP source contains no market-data subscription/WebSocket code');
ok(!/\.candidates\s*=|\.push\.apply\(|S\.scanData\s*=/.test(noComments), 'BDSP source does not mutate backend candidates or S.scanData');
ok(!/function\s+runScan\s*\(|function\s+computeDirectionalSetupCandidates\s*\(|function\s+renderScanResults\s*\(/.test(bdspSrc), 'BDSP block does not redefine existing scanner run/derive/render functions');
ok(!/fetch\s*\(|ttCall\s*\(|XMLHttpRequest/.test(noComments), 'BDSP source does not fetch independently');

section('7. debug helper');
sandbox.bssState = () => ({ snapshot, status });
const dbg = sandbox.apexDebugBackendDirectionalPreview();
ok(dbg.enabled === true && dbg.renderingScannerResults === true && dbg.sourceState.available === true && dbg.summary.total === 3 && dbg.rowCount === 3 && dbg.scanDataUntouched === true, 'debug helper reports enabled, scanner-result rendering, sourceState, summary, row count and scanData status');

console.log('\nResult: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
