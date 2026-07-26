'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SCANNER SNAPSHOT panel — pure-helper validation.
//
// The panel is a read-only, diagnostic-preview view of the backend scheduled
// scanner (GET /scanner/status + GET /scanner/snapshot), rendered ALONGSIDE the
// existing frontend scanners. Its pure helpers are extracted from the
// RECONSTRUCTED application source (tests/lib/load-app-source) and exercised in a
// VM sandbox, so they keep being found after the twelve orchestration functions
// moved from index.html into js/services/backend-scanner-snapshot-service.js.
// The renderers/formatters they are tested alongside are still inline.
//
// Covered:
//   1. fresh/stale status formatting
//   2. safe parsing of the /scanner/status payload (incl. null/garbage)
//   3. safe parsing of the /scanner/snapshot payload (incl. missing diagnostics)
//   4. NO_SNAPSHOT detection
//   5. candidate rows derived WITHOUT mutating the source candidates array
//   6. scorePreview DESC sorting happens on a COPY, with stable fallback order
//   7. null direction/score rendered safely ("null" / inactive)
//   8. sparse candidates / missing diagnostic blocks never throw
//   9. light-polling start/stop: no duplicate interval, clean teardown
//  10. feature-flag default ON + localStorage override
//  11. the panel never wires POST /scanner/run (source-level guard)
//
// Run: node tests/backend-scanner-snapshot.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

// Extracts a named function (async or sync) from source, preserving async prefix.
function extractFn(src, name) {
  for (const prefix of ['async function ', 'function ']) {
    const sig = prefix + name + '(';
    const start = src.indexOf(sig);
    if (start < 0) continue;
    let i = src.indexOf('{', start);
    if (i < 0) continue;
    let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
    for (let j = i; j < src.length; j++) {
      const c = src[j], n = src[j + 1];
      if (inLine)  { if (c === '\n') inLine = false; continue; }
      if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
      if (inS) {
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === inS) inS = null;
        continue;
      }
      if (c === '/' && n === '/') { inLine = true; j++; continue; }
      if (c === '/' && n === '*') { inBlock = true; j++; continue; }
      if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
    }
  }
  throw new Error('function not found: ' + name);
}

// Strips // and /* */ comments (string/template-aware) so source-level guards
// match real code, not explanatory comments. (The panel module contains no
// quote-bearing regex literals, so the naive scanner is safe here.)
function stripComments(src) {
  let out = '', inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = 0; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine)  { if (c === '\n') { inLine = false; out += c; } continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; j++; } continue; }
    if (inS) {
      out += c;
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === inS) inS = null;
      continue;
    }
    if (c === '/' && n === '/') { inLine = true; j++; continue; }
    if (c === '/' && n === '*') { inBlock = true; j++; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; out += c; continue; }
    out += c;
  }
  return out;
}

// ── counters wired into the sandbox (polling test) ──────────────────────────
let intervalCount = 0, clearCount = 0, lastTimerId = 0, lastCleared = null;

// ── build sandbox ───────────────────────────────────────────────────────────
const mockLS = {};
const sandbox = {
  console,
  Date, Math, JSON, Number, Boolean, String, RegExp, Object, Array, Promise,
  isFinite, parseFloat, parseInt, Infinity, NaN,
  localStorage: {
    getItem:    (k) => Object.prototype.hasOwnProperty.call(mockLS, k) ? mockLS[k] : null,
    setItem:    (k, v) => { mockLS[k] = v; },
    removeItem: (k) => { delete mockLS[k]; },
  },
  // polling-timer mocks
  setInterval:  (fn, ms) => { intervalCount++; return ++lastTimerId; },
  clearInterval: (id) => { clearCount++; lastCleared = id; },
  // fetch helpers are stubbed — pure helpers under test never hit the network
  bssFetchStatus:   () => {},
  bssFetchSnapshot: () => {},
  _activeView: 'dashboard',
  S: {},
  // escHtml is provided here (not extracted): its body contains the regex /"/g,
  // which the naive source extractor misreads as a string delimiter. This is a
  // faithful copy of the in-app escHtml.
  escHtml: (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
};
vm.createContext(sandbox);

const FNS = [
  'ffBackendScannerSnapshot', 'bssState',
  'bssNum', 'bssInt', 'bssCount', 'bssCountStr', 'bssList', 'bssBoolYN',
  'bssFmtAgeMs', 'bssFmtClock',
  'bssParseStatus', 'bssParseSnapshot', 'bssIsNoSnapshot', 'bssFreshness',
  'bssScorePreviewOf', 'bssDeriveCandidateRows',
  'bssSD', 'bssBucketInfo', 'bssParityInfo', 'bssTechComplete', 'bssTechCompleteInfo',
  'bssFmtRs', 'bssDirDiagInfo', 'bssDirBadge', 'bssOperational', 'bssRankEligBadge',
  'bssBadge', 'bssKV', 'bssKVt', 'bssTopSymbolsHtml', 'bssCandidateTableHtml',
  'bssStartPolling', 'bssStopPolling',
];
vm.runInContext(FNS.map((n) => extractFn(HTML, n)).join('\n'), sandbox);
const X = sandbox; // shorthand for the extracted functions

// ── test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  PASS  ' + msg); }
  else       { fail++; console.log('  FAIL  ' + msg); }
}
function section(t) { console.log('\n' + t); }
function noThrow(fn) { try { fn(); return true; } catch (e) { return false; } }

// ── 1. fresh/stale formatting ─────────────────────────────────────────────────
section('1. fresh/stale status formatting');
ok(X.bssFreshness({ ok: true, stale: false }).label === 'FRESH', 'stale:false → FRESH');
ok(X.bssFreshness({ ok: true, stale: true }).label === 'STALE', 'stale:true → STALE');
ok(X.bssFreshness({ ok: true, stale: false }).cls === 'bss-b-ok', 'FRESH → ok class');
ok(X.bssFreshness({ ok: true, stale: true }).cls === 'bss-b-warn', 'STALE → warn class');
ok(X.bssFreshness({ ok: true, ageMs: 100, staleMs: 50 }).label === 'STALE', 'age>staleMs → STALE (computed)');
ok(X.bssFreshness({ ok: true, ageMs: 10, staleMs: 50 }).label === 'FRESH', 'age<staleMs → FRESH (computed)');
ok(X.bssFreshness({ ok: false }).label === '—', 'not-ok snapshot → dash');
ok(X.bssFreshness(null).label === '—', 'null snapshot → dash (no throw)');
ok(X.bssFmtAgeMs(5000) === '5s', 'age 5s');
ok(X.bssFmtAgeMs(65000) === '1m 05s', 'age 1m 05s');
ok(X.bssFmtAgeMs(3725000) === '1h 02m', 'age 1h 02m');
ok(X.bssFmtAgeMs(null) === '—' && X.bssFmtAgeMs(-1) === '—', 'age null/negative → dash');
ok(X.bssFmtClock(null) === '—' && X.bssFmtClock('not-a-date') === '—', 'clock null/garbage → dash');
ok(/^\d\d:\d\d:\d\d$/.test(X.bssFmtClock('2026-06-03T14:30:05Z')), 'clock formats ISO → HH:MM:SS');

// ── 2. safe parsing of status payload ─────────────────────────────────────────
section('2. safe /scanner/status parsing');
ok(X.bssParseStatus(null)._empty === true && X.bssParseStatus(null).ok === false, 'null → empty/not-ok');
ok(X.bssParseStatus(undefined)._empty === true, 'undefined → empty');
ok(X.bssParseStatus('nope')._empty === true, 'non-object → empty');
const st1 = X.bssParseStatus({ ok: true, schedulerEnabled: true, timerActive: true, running: false, runCount: 1, errorCount: 0, universeCount: 3, universeSource: 'env' });
ok(st1.ok === true && st1.schedulerEnabled === true && st1.timerActive === true && st1.runCount === 1, 'preserves known fields');
ok(st1.universeCount === 3 && st1.universeSource === 'env', 'preserves universe count/source');
ok(st1.lastError === null && st1.lastSchedulerSkipReason === null, 'missing fields default to null');
// Source of truth for the Swing "processed last run" panel: /scanner/status exposes the
// list of symbols scanned last cycle (often an ARRAY). The parser MUST preserve it verbatim
// (length not collapsed) — dropping it forced the panel onto a stale snapshot fallback.
const stP = X.bssParseStatus({ ok: true, processedSymbolsLastRun: ['A', 'B', 'C'], processedSymbols: 3, lastRunProcessedCount: 3, lastWindowSymbolsPreview: ['A'], currentWindowSymbols: 30, source: 'BACKEND_SCANNER_ENGINE' });
ok(Array.isArray(stP.processedSymbolsLastRun) && stP.processedSymbolsLastRun.length === 3, 'preserves processedSymbolsLastRun array (length intact)');
ok(stP.processedSymbols === 3 && stP.lastRunProcessedCount === 3, 'preserves processed counters');
ok(stP.currentWindowSymbols === 30 && stP.source === 'BACKEND_SCANNER_ENGINE', 'preserves window symbols + source');
ok(X.bssParseStatus({ ok: false }).ok === false, 'explicit ok:false respected');
ok(X.bssParseStatus({ schedulerEnabled: true }).ok === true, 'missing ok → treated ok');
ok(noThrow(() => X.bssParseStatus({ weird: { nested: [1, 2, 3] } })), 'nested junk → no throw');

// ── 3. safe parsing of snapshot payload ───────────────────────────────────────
section('3. safe /scanner/snapshot parsing');
const sn1 = X.bssParseSnapshot(null);
ok(sn1._empty === true && sn1.ok === false, 'null → empty/not-ok');
ok(Array.isArray(sn1.candidates) && sn1.candidates.length === 0, 'null → candidates []');
ok(sn1.diagnostics && typeof sn1.diagnostics === 'object', 'null → diagnostics {}');
const sn2 = X.bssParseSnapshot({ ok: true, stale: false, ageMs: 1200, marketSession: 'RTH', candidates: [{ symbol: 'SPY' }], diagnostics: { cache: { symbolsWithCandles: 3 } } });
ok(sn2.ok === true && sn2.stale === false && sn2.ageMs === 1200 && sn2.marketSession === 'RTH', 'parses ok snapshot fields');
ok(sn2.candidates.length === 1 && sn2.diagnostics.cache.symbolsWithCandles === 3, 'parses candidates + diagnostics');
ok(Object.keys(X.bssParseSnapshot({ ok: true, candidates: [] }).diagnostics).length === 0, 'missing diagnostics → {}');
ok(X.bssParseSnapshot({ ok: true, candidates: 'oops' }).candidates.length === 0, 'non-array candidates → []');
ok(noThrow(() => X.bssParseSnapshot(42)), 'number payload → no throw');

// ── 4. NO_SNAPSHOT state ──────────────────────────────────────────────────────
section('4. NO_SNAPSHOT detection');
const ns = X.bssParseSnapshot({ ok: false, reason: 'NO_SNAPSHOT' });
ok(ns.noSnapshot === true && ns.reason === 'NO_SNAPSHOT', 'reason NO_SNAPSHOT → noSnapshot flag');
ok(X.bssIsNoSnapshot(ns) === true, 'bssIsNoSnapshot → true');
ok(X.bssIsNoSnapshot(X.bssParseSnapshot({ ok: false, reason: 'no_snapshot' })) === true, 'case-insensitive');
ok(X.bssIsNoSnapshot(X.bssParseSnapshot({ ok: true, candidates: [] })) === false, 'ok snapshot → false');
ok(X.bssIsNoSnapshot(X.bssParseSnapshot({ ok: false, reason: 'OTHER' })) === false, 'other reason → false');
ok(X.bssIsNoSnapshot(null) === false, 'null → false (no throw)');

// ── 5/6. candidate rows derived without mutation + sorted on a copy ────────────
section('5/6. candidate derivation: no mutation, scorePreview-desc on a copy');
const A = { symbol: 'A', scoreDiagnostics: { scorePreview: 50 } };
const B = { symbol: 'B', scoreDiagnostics: { scorePreview: 94 } };
const C = { symbol: 'C', scoreDiagnostics: { scorePreview: 72 } };
const snap = { ok: true, candidates: [A, B, C] };
const srcRef = snap.candidates;
const rows = X.bssDeriveCandidateRows(snap);
ok(rows.map((r) => r.symbol).join(',') === 'B,C,A', 'sorted by scorePreview DESC (94,72,50)');
ok(snap.candidates === srcRef, 'source array reference unchanged');
ok(snap.candidates[0] === A && snap.candidates[1] === B && snap.candidates[2] === C, 'source order NOT mutated');
ok(rows !== snap.candidates, 'returns a NEW array (copy)');
ok(A.scoreDiagnostics.scorePreview === 50 && B.scoreDiagnostics.scorePreview === 94, 'source candidate objects untouched');
const X1 = { symbol: 'X' }, Y1 = { symbol: 'Y' }, Z1 = { symbol: 'Z' };
ok(X.bssDeriveCandidateRows({ ok: true, candidates: [X1, Y1, Z1] }).map((r) => r.symbol).join(',') === 'X,Y,Z',
  'no scorePreview anywhere → original order preserved (fallback)');
const P = { symbol: 'P', scoreDiagnostics: { scorePreview: 80 } };
const Q = { symbol: 'Q' };
const R = { symbol: 'R', scoreDiagnostics: { scorePreview: 90 } };
ok(X.bssDeriveCandidateRows({ ok: true, candidates: [P, Q, R] }).map((r) => r.symbol).join(',') === 'R,P,Q',
  'mixed: scored desc then unscored last (stable)');
ok(X.bssDeriveCandidateRows({ ok: true, candidates: [] }).length === 0, 'empty candidates → []');
ok(X.bssDeriveCandidateRows(null).length === 0, 'null snapshot → [] (no throw)');
ok(X.bssScorePreviewOf({ scoreDiagnostics: { scorePreview: 79 } }) === 79, 'reads scoreDiagnostics.scorePreview');
ok(X.bssScorePreviewOf({ scorePreview: 42 }) === 42, 'falls back to top-level scorePreview');
ok(X.bssScorePreviewOf({}) === null && X.bssScorePreviewOf(null) === null, 'missing/null → null');

// ── 7. null direction/score rendered safely ───────────────────────────────────
section('7. operational direction/score null shown as inactive');
ok(X.bssOperational(null).label === 'null' && X.bssOperational(null).active === false, 'null → "null"/inactive');
ok(X.bssOperational(undefined).label === 'null', 'undefined → "null"');
ok(X.bssOperational('LONG').active === true, 'value present → active');
const full = [{
  symbol: 'SPY', price: 441.31, rsi14: 55.2, relativeStrengthVsSpy: 1.02,
  directionDiagnostics: { candidateDirection: 'LONG', confidence: 0.7 },
  directionParity: { comparable: true, match: true },
  scoreDiagnostics: { scorePreview: 79, scoreBucket: 'B', rankEligible: true },
  cache: { candleCount: 500, source: 'backend' },
  technicalCoverage: { complete: true },
  direction: null, score: null,
}];
const hFull = X.bssCandidateTableHtml(full);
ok(/SPY/.test(hFull) && /LONG/.test(hFull) && />79</.test(hFull) && /match/.test(hFull), 'renders symbol/dir/score/parity');
ok(/bss-b-muted">null</.test(hFull), 'operational direction & score render as null badges');

// ── 8. sparse candidates / missing diagnostics never crash ────────────────────
section('8. sparse candidates & missing blocks never throw');
let hSparse;
ok(noThrow(() => { hSparse = X.bssCandidateTableHtml([{ symbol: 'AAPL' }]); }), 'sparse candidate → no throw');
ok(/AAPL/.test(hSparse) && /null/.test(hSparse), 'sparse candidate still renders symbol + null ops');
ok(noThrow(() => X.bssCandidateTableHtml([null, undefined, {}])), 'null/empty candidate entries → no throw');
ok(typeof X.bssCandidateTableHtml([]) === 'string', 'empty rows → string');
ok(X.bssTopSymbolsHtml(null).indexOf('—') >= 0, 'no topSymbols → dash');
ok(X.bssTopSymbolsHtml({ topSymbols: ['AAPL', 'MSFT'] }).indexOf('AAPL') >= 0, 'topSymbols strings rendered');
ok(X.bssTopSymbolsHtml({ topSymbols: [{ symbol: 'SPY', scorePreview: 79, scoreBucket: 'B' }] }).indexOf('SPY') >= 0, 'topSymbols objects rendered');
// XSS / html-escape safety
const evil = X.bssCandidateTableHtml([{ symbol: '<img src=x onerror=alert(1)>' }]);
ok(evil.indexOf('<img src=x') < 0 && evil.indexOf('&lt;img') >= 0, 'candidate symbol is HTML-escaped');

// per-field badge helpers
section('8b. per-field badge/label helpers');
ok(X.bssBucketInfo('A').cls === 'bss-b-ok' && X.bssBucketInfo('A').label === 'A', 'bucket A → ok class');
ok(X.bssBucketInfo('b').label === 'B', 'bucket normalised to upper');
ok(X.bssBucketInfo(null).label === '—', 'bucket null → dash');
ok(X.bssParityInfo({ comparable: true, match: true }).state === 'match', 'parity obj match');
ok(X.bssParityInfo({ comparable: true, match: false }).state === 'mismatch', 'parity obj mismatch');
ok(X.bssParityInfo({ comparable: false }).state === 'na', 'parity not comparable');
ok(X.bssParityInfo('match').state === 'match' && X.bssParityInfo(null).label === 'n/c', 'parity string / null');
ok(X.bssTechCompleteInfo({ complete: true }).complete === true, 'tech complete:true');
ok(X.bssTechCompleteInfo({ coreComplete: false }).complete === false, 'tech coreComplete:false');
ok(X.bssTechCompleteInfo(true).complete === true && X.bssTechCompleteInfo(null).complete === null, 'tech boolean / null');
ok(X.bssDirDiagInfo({ directionDiagnostics: { candidateDirection: 'SHORT', confidence: 0.4 } }).dir === 'SHORT', 'dir-diag candidateDirection');
ok(X.bssDirDiagInfo({}).dir === null, 'dir-diag missing → null');
ok(X.bssFmtRs(1.5) === '1.50' && X.bssFmtRs({ value: 0.8 }) === '0.80' && X.bssFmtRs(null) === '—', 'RS number/object/null');

// ── 9. polling: no duplicate interval, clean teardown ─────────────────────────
section('9. light-polling start/stop (no duplicate timers, clean teardown)');
delete mockLS['apex_ff_backend_scanner_snapshot']; // default ON
sandbox.S = {}; sandbox._activeView = 'dashboard';
intervalCount = 0; clearCount = 0; lastTimerId = 0;
X.bssStartPolling();
ok(intervalCount === 1, 'first start → exactly one interval');
const id1 = sandbox.S.backendScanner.timerId;
ok(id1 != null, 'timerId stored in state');
X.bssStartPolling();
ok(intervalCount === 1, 'second start while running → NO duplicate interval');
ok(sandbox.S.backendScanner.timerId === id1, 'timerId unchanged on re-start');
X.bssStopPolling();
ok(clearCount === 1 && lastCleared === id1, 'stop clears the interval');
ok(sandbox.S.backendScanner.timerId === null, 'stop nulls the timerId');
X.bssStartPolling();
ok(intervalCount === 2 && sandbox.S.backendScanner.timerId != null, 'restart after stop → fresh interval');
X.bssStopPolling();
// non-dashboard view must not create a timer
sandbox.S = {}; sandbox._activeView = 'portfolio';
const before = intervalCount;
X.bssStartPolling();
ok(intervalCount === before, 'non-dashboard view → no interval created');
ok(!sandbox.S.backendScanner || sandbox.S.backendScanner.timerId == null, 'non-dashboard view → timerId stays null');
sandbox._activeView = 'dashboard';

// ── 10. feature flag default + override ───────────────────────────────────────
section('10. feature flag (default ON, localStorage override)');
delete mockLS['apex_ff_backend_scanner_snapshot'];
ok(X.ffBackendScannerSnapshot() === true, 'default → ON');
mockLS['apex_ff_backend_scanner_snapshot'] = '0';
ok(X.ffBackendScannerSnapshot() === false, 'localStorage "0" → OFF');
mockLS['apex_ff_backend_scanner_snapshot'] = '1';
ok(X.ffBackendScannerSnapshot() === true, 'localStorage "1" → ON');
delete mockLS['apex_ff_backend_scanner_snapshot'];

// ── 10b. bssState() shape + single-flight Promise ownership ───────────────────
section('10b. bssState() shape (18 fields) + shared in-flight Promise ownership');
sandbox.S = {};
const bssShape = X.bssState();
const BSS_LEGACY_FIELDS = ['status', 'snapshot', 'coverage', 'statusError', 'snapshotError', 'coverageError',
  'lastStatusAt', 'lastSnapshotAt', 'lastCoverageAt', 'fetchingStatus', 'fetchingSnapshot', 'fetchingCoverage',
  'coverageEndpointAbsent', 'timerId', 'collapsed'];
// The three shared single-flight completions added so a concurrent reader JOINS the request
// already in flight instead of being dropped with an immediate `undefined`.
const BSS_PROMISE_FIELDS = ['statusPromise', 'snapshotPromise', 'coveragePromise'];
ok(BSS_LEGACY_FIELDS.every(k => Object.prototype.hasOwnProperty.call(bssShape, k)), 'all 15 legacy state fields still present');
ok(BSS_PROMISE_FIELDS.every(k => Object.prototype.hasOwnProperty.call(bssShape, k)), 'the three single-flight Promise fields are present');
ok(Object.keys(bssShape).length === 18, 'state shape is exactly 18 fields (15 legacy + 3 single-flight)');
ok(BSS_PROMISE_FIELDS.every(k => bssShape[k] === null), 'the three Promise fields start null');
ok(X.bssState() === sandbox.S.backendScanner, 'state lives on S.backendScanner (no module-private container)');
ok(X.bssState() === X.bssState(), 'bssState() is an idempotent singleton');

// ── 11. source-level guard: panel never wires POST /scanner/run ────────────────
section('11. source guard: no automatic POST /scanner/run in the panel module');
// The panel is now split across two physical files: the twelve orchestration
// functions (flag, state accessor, parsers, the three GET readers, refresh and
// polling) live in js/services/backend-scanner-snapshot-service.js, while every
// renderer/formatter stays inline in index.html. The guard is applied to the
// RECONSTRUCTED closure — service source + inline UI slice — so it keeps covering
// exactly the same code as before the relocation. No implementation is copied here.
const serviceSrc = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'services', 'backend-scanner-snapshot-service.js'), 'utf8');
const modStart = HTML.indexOf('BACKEND SCANNER SNAPSHOT — diagnostic-preview visibility panel');
const modEnd = HTML.indexOf('function showView(name)', modStart);
const moduleSrc = serviceSrc + '\n' + HTML.slice(modStart, modEnd);
const moduleCode = stripComments(moduleSrc); // real code only — comments mention /scanner/run intentionally
ok(modStart > 0 && modEnd > modStart && serviceSrc.length > 0, 'panel module block located in source (service + inline UI)');
ok(moduleCode.indexOf('/scanner/run') < 0, "module CODE never references '/scanner/run' (comments may)");
ok(moduleCode.indexOf("method: 'POST'") < 0 && moduleCode.indexOf('method:"POST"') < 0, 'module issues no POST requests');
ok(moduleCode.indexOf('/scanner/status') >= 0 && moduleCode.indexOf('/scanner/snapshot') >= 0, "module reads GET '/scanner/status' + '/scanner/snapshot'");
ok((moduleCode.match(/subscribe-quotes|subscribeDxlinkQuotes|new WebSocket/g) || []).length === 0, 'module opens no new market-data subscriptions');
// The shared single-flight completion is a JOIN, never a cancellation: no controller is
// created and no in-flight request is ever aborted by a later caller.
const svcCode = stripComments(serviceSrc);
ok(svcCode.indexOf('new AbortController') < 0 && !/\.abort\s*\(/.test(svcCode), 'service creates no AbortController and never calls .abort()');
ok((svcCode.match(/(?:^|[^.\w])fetch\s*\(/g) || []).length === 3, 'service keeps exactly three fetch call sites (status, snapshot, coverage)');
['statusPromise', 'snapshotPromise', 'coveragePromise'].forEach(f => {
  ok(new RegExp('st\\.' + f + '\\s*=\\s*null').test(svcCode), f + ' is released back to null inside the service');
  ok(!new RegExp('(?:var|let|const)\\s+' + f).test(svcCode), f + ' is never a module-level variable');
});

// ── summary ───────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
console.log('ALL TESTS PASSED');
