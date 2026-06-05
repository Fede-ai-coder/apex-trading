'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// Backend Directional Scanner (BDS) adapter — pure-helper tests.
//
// These tests extract the REAL bds* adapter helpers from index.html (no copies,
// so they cannot drift) and run them in a vm sandbox. The adapter converts a
// backend scanner snapshot (the read-only structure surfaced by the PR #211
// Backend Scanner Snapshot panel / bssState()) into a Directional-Scanner-
// compatible row shape. It is the FIRST controlled migration step ONLY:
//   • it does NOT render, fetch, subscribe, or feed the existing scanner
//   • it reads DIAGNOSTIC fields (directionDiagnostics.candidateDirection,
//     scoreDiagnostics.scorePreview/scoreBucket/rankEligible) and keeps the
//     operational candidate.direction / candidate.score inert (expected null)
//   • it never mutates its inputs and never touches the network
//
// The sandbox installs throwing fetch / WebSocket / XMLHttpRequest / ttCall /
// subscribeDxlinkQuotes stubs: any accidental network/subscription call throws
// and fails the test.
//
// Run: node tests/backend-directional-adapter.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract a top-level `function NAME(...) {...}` by brace-matching. Skips braces
// inside strings, template literals, regex and comments so nested bodies are safe.
function extractFn(src, name) {
  const sigs = ['async function ' + name + '(', 'function ' + name + '('];
  let start = -1;
  for (const s of sigs) { const k = src.indexOf(s); if (k >= 0) { start = k; break; } }
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
  let depth = 0, inS = null, esc = false, inLine = false, inBlock = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j], n = src[j + 1];
    if (inLine) { if (c === '\n') inLine = false; continue; }
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
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

// ── Sandbox: real adapter helpers + blocked network/subscription surface ──────
const BDS_FNS = [
  '_bdsNum', '_bdsBoolOrNull', '_bdsStrOrNull',
  'bdsIsBackendDirectionalCandidate', 'bdsMapBackendCandidateToDirectionalRow',
  'bdsSortBackendDirectionalRows', 'bdsDeriveBackendDirectionalRows',
  'bdsBackendDirectionalSummary', 'bdsGetBackendDirectionalSourceState',
  'apexDebugBackendDirectionalAdapter',
];
const bdsSrc = BDS_FNS.map((n) => extractFn(HTML, n)).join('\n');

const networkCalls = [];
function blockNet(name) { return function () { networkCalls.push(name); throw new Error('network blocked: ' + name); }; }

const sandbox = {
  console, JSON, Object, String, Number, Math, isFinite, Array, Boolean,
  bssState: undefined, // set per-test for the debug-helper checks
  fetch: blockNet('fetch'),
  WebSocket: blockNet('WebSocket'),
  XMLHttpRequest: blockNet('XMLHttpRequest'),
  subscribeDxlinkQuotes: blockNet('subscribeDxlinkQuotes'),
  ttCall: blockNet('ttCall'),
};
vm.createContext(sandbox);
vm.runInContext(bdsSrc, sandbox);

const {
  bdsIsBackendDirectionalCandidate, bdsMapBackendCandidateToDirectionalRow,
  bdsSortBackendDirectionalRows, bdsDeriveBackendDirectionalRows,
  bdsBackendDirectionalSummary, bdsGetBackendDirectionalSourceState,
} = sandbox;

// ── Test harness ──────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function section(t) { console.log('\n' + t); }

// ── Fixtures ──────────────────────────────────────────────────────────────────
// A fully-valid, rank-eligible candidate in the diagnostic-only backend shape:
// candidate.direction / candidate.score are null (the backend invariant); the
// directional signal lives in directionDiagnostics / scoreDiagnostics.
function mkValid(sym, dir, score, bucket, rs) {
  return {
    symbol: sym, price: 100,
    rsi14: 60, sma8: 99, sma20: 97, sma30: 95, sma200: 80,
    distFromSma8: 1, distFromSma20: 3, distFromSma30: 5, distFromSma200: 25,
    squeezeState: false,
    relativeStrengthVsSpy: rs,
    relativeStrength: { value: rs, source: 'BACKEND_RS_VS_SPY' },
    directionDiagnostics: { candidateDirection: dir, confidence: 'high', directionSource: 'sma_stack' },
    directionParity: { comparable: true, matches: true, mismatchType: null },
    scoreDiagnostics: { usable: true, rankEligible: true, scorePreview: score, scoreBucket: bucket },
    cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 300, ageMs: 1500, reason: 'fresh' },
    technicalCoverage: { completeCoreTechnicals: true },
    direction: null, score: null,
  };
}
function clone(o) { return JSON.parse(JSON.stringify(o)); }

// The "clean dev backend" snapshot mirrored from the task's manual-validation
// expectation: 3 bullish, rank-eligible candidates (AAPL 94/A, SPY 79/B,
// MSFT 72/B). Deliberately stored out of score order to prove the sort.
function cleanSnapshot() {
  return {
    ok: true, stale: false, staleMs: 0, ageMs: 1500,
    updatedAt: '2026-06-03T14:00:00Z', nextScheduledRunAt: '2026-06-03T14:05:00Z',
    marketSession: 'regular', universe: ['AAPL', 'SPY', 'MSFT'],
    candidates: [
      mkValid('MSFT', 'bullish', 72, 'B', 1.1),
      mkValid('AAPL', 'bullish', 94, 'A', 2.4),
      mkValid('SPY', 'bullish', 79, 'B', 0.0),
    ],
    diagnostics: { scoreDiagnostics: true, directionDiagnostics: true, directionParity: true },
  };
}

// ── 1–8. bdsIsBackendDirectionalCandidate eligibility gate ────────────────────
section('1-8. bdsIsBackendDirectionalCandidate(candidate)');
{
  ok(bdsIsBackendDirectionalCandidate(mkValid('AAPL', 'bullish', 94, 'A', 2.4)) === true,
     '1: true for a valid bullish backend candidate');
  ok(bdsIsBackendDirectionalCandidate(mkValid('TSLA', 'bearish', 70, 'B', -1.5)) === true,
     '2: true for a valid bearish backend candidate');

  const notUsable = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); notUsable.scoreDiagnostics.usable = false;
  ok(bdsIsBackendDirectionalCandidate(notUsable) === false, '3: false when scoreDiagnostics.usable is false');

  const notRank = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); notRank.scoreDiagnostics.rankEligible = false;
  ok(bdsIsBackendDirectionalCandidate(notRank) === false, '4: false when rankEligible is false');

  const neutral = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); neutral.directionDiagnostics.candidateDirection = 'neutral';
  const nullDir = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); nullDir.directionDiagnostics.candidateDirection = null;
  ok(bdsIsBackendDirectionalCandidate(neutral) === false, '5: false when direction is neutral');
  ok(bdsIsBackendDirectionalCandidate(nullDir) === false, '5: false when direction is null');

  const noScore = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); delete noScore.scoreDiagnostics.scorePreview;
  const nanScore = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); nanScore.scoreDiagnostics.scorePreview = 'NaN';
  ok(bdsIsBackendDirectionalCandidate(noScore) === false, '6: false when scorePreview missing');
  ok(bdsIsBackendDirectionalCandidate(nanScore) === false, '6: false when scorePreview non-finite (string)');

  const noCache = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); noCache.cache = { source: 'OTHER', candleCount: 0 };
  ok(bdsIsBackendDirectionalCandidate(noCache) === false, '7: false when cache not ready / candleCount 0');
  const cacheByCount = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); cacheByCount.cache = { source: 'OTHER', candleCount: 12 };
  ok(bdsIsBackendDirectionalCandidate(cacheByCount) === true, '7: true when candleCount > 0 even if source differs');

  const incomplete = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4)); incomplete.technicalCoverage.completeCoreTechnicals = false;
  ok(bdsIsBackendDirectionalCandidate(incomplete) === false, '8: false when core technicals incomplete');

  // tolerance: nothing throws on empty / missing blocks
  let threw = false;
  try {
    bdsIsBackendDirectionalCandidate(null);
    bdsIsBackendDirectionalCandidate(undefined);
    bdsIsBackendDirectionalCandidate({});
    bdsIsBackendDirectionalCandidate({ symbol: 'X' });
  } catch (e) { threw = true; }
  ok(threw === false, 'tolerant: missing/empty candidate never throws (returns false)');
}

// ── 9–13. bdsMapBackendCandidateToDirectionalRow ──────────────────────────────
section('9-13. bdsMapBackendCandidateToDirectionalRow(candidate, index)');
{
  // 9: direction comes from directionDiagnostics.candidateDirection, never the
  //    operational candidate.direction (deliberately set to a conflicting value).
  const c9 = mkValid('AAPL', 'bullish', 94, 'A', 2.4); c9.direction = 'bearish';
  const r9 = bdsMapBackendCandidateToDirectionalRow(c9, 0);
  ok(r9.direction === 'bullish', '9: row.direction uses directionDiagnostics.candidateDirection');
  ok(r9.operationalDirection === 'bearish', '9: operationalDirection preserves candidate.direction (not used for direction)');

  // 10: scorePreview comes from scoreDiagnostics.scorePreview, never candidate.score.
  const c10 = mkValid('AAPL', 'bullish', 88, 'A', 2.4); c10.score = 11;
  const r10 = bdsMapBackendCandidateToDirectionalRow(c10, 0);
  ok(r10.scorePreview === 88, '10: row.scorePreview uses scoreDiagnostics.scorePreview');
  ok(r10.scoreBucket === 'A' && r10.rankEligible === true, '10: scoreBucket/rankEligible from scoreDiagnostics');
  ok(r10.operationalScore === 11, '10: operationalScore preserves candidate.score (not used for scorePreview)');

  // 11: with the real backend invariant (direction/score null) the operational
  //     fields are null while the diagnostic fields still populate.
  const r11 = bdsMapBackendCandidateToDirectionalRow(mkValid('MSFT', 'bullish', 72, 'B', 1.1), 2);
  ok(r11.operationalDirection === null && r11.operationalScore === null,
     '11: operationalDirection/operationalScore are null (backend invariant preserved)');
  ok(r11.direction === 'bullish' && r11.scorePreview === 72, '11: diagnostic direction/scorePreview still populate');
  ok(r11.source === 'BACKEND_SCANNER_SNAPSHOT' && r11.sourceLabel === 'Backend snapshot' && r11.sourceIndex === 2,
     '11: stable source/sourceLabel/sourceIndex');
  ok(r11.backendCandidate && r11.backendCandidate.symbol === 'MSFT', '11: backendCandidate retained for drilldown');

  // 12: missing optional blocks do not throw; warnings explain why.
  let mapThrew = false, r12 = null;
  try { r12 = bdsMapBackendCandidateToDirectionalRow({ symbol: 'NAKED' }, 0); } catch (e) { mapThrew = true; }
  ok(mapThrew === false && r12 !== null, '12: mapping a bare candidate does not throw');
  ok(r12.rsi14 === null && r12.sma200 === null && r12.squeezeState === null && r12.completeCoreTechnicals === null,
     '12: absent technicals/coverage map to null (no crash)');
  const w12 = r12.warnings;
  ok(w12.indexOf('missing_direction_diagnostics') >= 0, '12: warns missing_direction_diagnostics');
  ok(w12.indexOf('missing_score_preview') >= 0, '12: warns missing_score_preview');
  ok(w12.indexOf('not_rank_eligible') >= 0, '12: warns not_rank_eligible');
  ok(w12.indexOf('cache_not_ready') >= 0, '12: warns cache_not_ready');
  ok(w12.indexOf('core_technicals_incomplete') >= 0, '12: warns core_technicals_incomplete');
  const rMissingSym = bdsMapBackendCandidateToDirectionalRow({ scoreDiagnostics: { scorePreview: 5 } }, 0);
  ok(rMissingSym.warnings.indexOf('missing_symbol') >= 0, '12: warns missing_symbol');
  const rNeutral = bdsMapBackendCandidateToDirectionalRow({ symbol: 'X', directionDiagnostics: { candidateDirection: 'neutral' } }, 0);
  ok(rNeutral.direction === null && rNeutral.warnings.indexOf('direction_not_directional') >= 0,
     '12: non-directional candidateDirection warns direction_not_directional');

  // 13: parity mismatch produces a warning.
  const c13 = clone(mkValid('AAPL', 'bullish', 94, 'A', 2.4));
  c13.directionParity = { comparable: true, matches: false, mismatchType: 'opposite' };
  const r13 = bdsMapBackendCandidateToDirectionalRow(c13, 0);
  ok(r13.parityComparable === true && r13.parityMatches === false && r13.parityMismatchType === 'opposite',
     '13: parity fields mapped from directionParity');
  ok(r13.warnings.indexOf('parity_mismatch') >= 0, '13: parity mismatch produces parity_mismatch warning');
}

// ── 14–19. bdsDeriveBackendDirectionalRows ────────────────────────────────────
section('14-19. bdsDeriveBackendDirectionalRows(snapshot, options)');
{
  // 14: bad input → []
  ok(Array.isArray(bdsDeriveBackendDirectionalRows(null)) && bdsDeriveBackendDirectionalRows(null).length === 0,
     '14: null snapshot → []');
  ok(bdsDeriveBackendDirectionalRows(undefined).length === 0, '14: undefined snapshot → []');
  ok(bdsDeriveBackendDirectionalRows({}).length === 0, '14: snapshot without ok:true → []');
  ok(bdsDeriveBackendDirectionalRows({ ok: false, candidates: [mkValid('AAPL', 'bullish', 94, 'A', 2)] }).length === 0,
     '14: ok:false → []');
  ok(bdsDeriveBackendDirectionalRows({ ok: true, candidates: 'nope' }).length === 0, '14: non-array candidates → []');

  // 15: derive does not mutate snapshot.candidates
  const snap15 = cleanSnapshot();
  const before15 = JSON.stringify(snap15);
  bdsDeriveBackendDirectionalRows(snap15, { includeNonEligible: true });
  ok(JSON.stringify(snap15) === before15, '15: derive does not mutate snapshot.candidates');
  ok(snap15.candidates[0].symbol === 'MSFT', '15: original candidate order preserved (input not reordered)');

  // 16: default derive sorts by scorePreview desc (uses a sorted copy)
  const rows16 = bdsDeriveBackendDirectionalRows(cleanSnapshot());
  ok(rows16.length === 3, '16: 3 eligible rows by default');
  ok(rows16.map((r) => r.symbol).join(',') === 'AAPL,SPY,MSFT', '16: sorted AAPL(94),SPY(79),MSFT(72)');
  ok(rows16[0].scorePreview === 94 && rows16[1].scorePreview === 79 && rows16[2].scorePreview === 72,
     '16: scorePreview strictly descending');

  // 17: directionFilter bullish / bearish
  const mixed = cleanSnapshot();
  mixed.candidates.push(mkValid('TSLA', 'bearish', 65, 'C', -2.0));
  mixed.candidates.push(mkValid('META', 'bearish', 50, 'C', -3.0));
  const bull = bdsDeriveBackendDirectionalRows(mixed, { directionFilter: 'bullish' });
  const bear = bdsDeriveBackendDirectionalRows(mixed, { directionFilter: 'bearish' });
  ok(bull.length === 3 && bull.every((r) => r.direction === 'bullish'), '17: directionFilter bullish keeps only bullish rows');
  ok(bear.length === 2 && bear.every((r) => r.direction === 'bearish'), '17: directionFilter bearish keeps only bearish rows');
  ok(bear.map((r) => r.symbol).join(',') === 'TSLA,META', '17: bearish sorted by scorePreview desc (TSLA 65, META 50)');

  // 18: includeNonEligible includes non-eligible mapped rows (with warnings)
  const snap18 = cleanSnapshot();
  const nonElig = mkValid('LOW', 'bullish', 30, 'D', 0.2); nonElig.scoreDiagnostics.rankEligible = false;
  snap18.candidates.push(nonElig);
  const def18 = bdsDeriveBackendDirectionalRows(snap18);
  const inc18 = bdsDeriveBackendDirectionalRows(snap18, { includeNonEligible: true });
  ok(def18.length === 3, '18: default excludes the non-eligible candidate');
  ok(inc18.length === 4, '18: includeNonEligible includes the non-eligible candidate');
  const lowRow = inc18.filter((r) => r.symbol === 'LOW')[0];
  ok(lowRow && lowRow.warnings.indexOf('not_rank_eligible') >= 0, '18: included non-eligible row keeps its warnings');

  // 19: maxRows
  const rows19 = bdsDeriveBackendDirectionalRows(cleanSnapshot(), { maxRows: 2 });
  ok(rows19.length === 2 && rows19.map((r) => r.symbol).join(',') === 'AAPL,SPY', '19: maxRows caps to the top N rows');
  ok(bdsDeriveBackendDirectionalRows(cleanSnapshot(), { maxRows: 0 }).length === 0, '19: maxRows 0 → []');
}

// ── extra: bdsSortBackendDirectionalRows never mutates its input ───────────────
section('extra. bdsSortBackendDirectionalRows is non-mutating');
{
  const input = [
    { symbol: 'C', scorePreview: 10, rankEligible: true, scoreBucket: 'B', direction: 'bullish', relativeStrengthVsSpy: 1, sourceIndex: 0 },
    { symbol: 'A', scorePreview: 90, rankEligible: true, scoreBucket: 'A', direction: 'bullish', relativeStrengthVsSpy: 2, sourceIndex: 1 },
    { symbol: 'B', scorePreview: 50, rankEligible: true, scoreBucket: 'A', direction: 'bullish', relativeStrengthVsSpy: 3, sourceIndex: 2 },
  ];
  const orderBefore = input.map((r) => r.symbol).join(',');
  const sorted = bdsSortBackendDirectionalRows(input);
  ok(sorted.map((r) => r.symbol).join(',') === 'A,B,C', 'sort orders by scorePreview desc');
  ok(input.map((r) => r.symbol).join(',') === orderBefore, 'sort does not mutate the input array');
  ok(sorted !== input, 'sort returns a new array (copy)');
}

// ── 20. bdsBackendDirectionalSummary ──────────────────────────────────────────
section('20. bdsBackendDirectionalSummary(rows)');
{
  const snap = {
    ok: true, stale: false,
    candidates: [
      mkValid('AAPL', 'bullish', 94, 'A', 2.4),
      mkValid('SPY', 'bullish', 79, 'B', 0.0),
      mkValid('MSFT', 'bullish', 72, 'B', 1.1),
      (function () { const c = mkValid('TSLA', 'bearish', 65, 'C', -2.0); c.directionParity = { comparable: true, matches: false, mismatchType: 'opposite' }; return c; })(),
      (function () {
        const c = mkValid('XYZ', 'bullish', 40, 'D', 0.1);
        c.scoreDiagnostics.rankEligible = false;       // non-eligible
        c.technicalCoverage.completeCoreTechnicals = false; // incomplete technicals
        delete c.cache;                                 // no cache
        c.directionParity = { comparable: false, matches: null, mismatchType: null };
        return c;
      })(),
    ],
  };
  const rows = bdsDeriveBackendDirectionalRows(snap, { includeNonEligible: true });
  const s = bdsBackendDirectionalSummary(rows);
  ok(s.total === 5, '20: total counts every row (5)');
  ok(s.bullish === 4 && s.bearish === 1, '20: bullish 4 / bearish 1');
  ok(s.rankEligible === 4, '20: rankEligible 4 (XYZ excluded)');
  ok(s.bucketCounts.A === 1 && s.bucketCounts.B === 2 && s.bucketCounts.C === 1 && s.bucketCounts.D === 1,
     '20: bucketCounts A1 B2 C1 D1');
  ok(s.parityMatches === 3, '20: parityMatches 3');
  ok(s.parityMismatches === 1, '20: parityMismatches 1 (TSLA)');
  ok(s.withCompleteTechnicals === 4, '20: withCompleteTechnicals 4 (XYZ incomplete)');
  ok(s.withCache === 4, '20: withCache 4 (XYZ has no cache)');
  ok(s.topSymbols[0] === 'AAPL' && s.topSymbols.length === 5, '20: topSymbols begins with AAPL');
  ok(bdsBackendDirectionalSummary(null).total === 0, '20: summary tolerant of non-array input');
}

// ── 21–22. bdsGetBackendDirectionalSourceState ────────────────────────────────
section('21-22. bdsGetBackendDirectionalSourceState(snapshot, status)');
{
  // 21: available only when snapshot + diagnostics (+ no status error) are usable
  const okState = bdsGetBackendDirectionalSourceState(cleanSnapshot(), { schedulerEnabled: true, statusError: null, snapshotError: null });
  ok(okState.available === true && okState.reason === null, '21: available true for a usable snapshot');
  ok(okState.snapshotOk === true && okState.schedulerEnabled === true, '21: snapshotOk + schedulerEnabled reported');
  ok(okState.diagnosticsReady === true && okState.scoreDiagnosticsReady === true &&
     okState.directionDiagnosticsReady === true && okState.parityReady === true, '21: diagnostics readiness flags true');

  ok(bdsGetBackendDirectionalSourceState(null, null).available === false &&
     bdsGetBackendDirectionalSourceState(null, null).reason === 'no_snapshot', '21: no snapshot → available false / no_snapshot');
  ok(bdsGetBackendDirectionalSourceState({ ok: false }, null).available === false, '21: ok:false → available false');
  ok(bdsGetBackendDirectionalSourceState({ ok: true, candidates: [] }, null).reason === 'no_candidates',
     '21: empty candidates → no_candidates');
  ok(bdsGetBackendDirectionalSourceState(cleanSnapshot(), { statusError: 'boom' }).available === false &&
     bdsGetBackendDirectionalSourceState(cleanSnapshot(), { statusError: 'boom' }).reason === 'status_error',
     '21: status error → available false / status_error');
  const noDiag = { ok: true, candidates: [{ symbol: 'X', cache: { source: 'BACKEND_DXLINK_CANDLE_CACHE', candleCount: 1 } }] };
  ok(bdsGetBackendDirectionalSourceState(noDiag, null).reason === 'diagnostics_not_ready',
     '21: candidates without diagnostics → diagnostics_not_ready');
  ok(bdsGetBackendDirectionalSourceState(cleanSnapshot(), null).available === true,
     '21: usable snapshot with no status object is still available');

  // 22: stale snapshot is reported
  const staleSnap = cleanSnapshot(); staleSnap.stale = true; staleSnap.staleMs = 90000;
  const staleState = bdsGetBackendDirectionalSourceState(staleSnap, { schedulerEnabled: true });
  ok(staleState.stale === true, '22: stale snapshot reported as stale:true');
  ok(staleState.ageMs === 1500 && staleState.updatedAt === '2026-06-03T14:00:00Z' &&
     staleState.nextScheduledRunAt === '2026-06-03T14:05:00Z', '22: freshness metadata surfaced');
  ok(bdsGetBackendDirectionalSourceState(cleanSnapshot(), null).stale === false, '22: fresh snapshot reported as stale:false');
}

// ── 23. debug helper returns rows + summary without any network call ──────────
section('23. apexDebugBackendDirectionalAdapter()');
{
  networkCalls.length = 0;
  sandbox.bssState = function () { return { snapshot: cleanSnapshot(), status: { schedulerEnabled: true, statusError: null, snapshotError: null } }; };
  let dbg = null, threw = false;
  try { dbg = sandbox.apexDebugBackendDirectionalAdapter(); } catch (e) { threw = true; }
  ok(threw === false, '23: debug helper does not throw');
  ok(networkCalls.length === 0, '23: debug helper triggers NO network/subscription calls');
  ok(dbg && dbg.rows.length === 3 && dbg.summary.total === 3, '23: returns rows + summary from bssState()');
  ok(dbg.summary.bullish === 3 && dbg.summary.rankEligible === 3, '23: summary reflects the snapshot');
  ok(dbg.sourceState.available === true, '23: sourceState available true for the clean snapshot');
  ok(dbg.rows[0].symbol === 'AAPL', '23: rows sorted (AAPL first)');

  // safe degrade when bssState is absent (this branch, before PR #211 lands)
  networkCalls.length = 0;
  sandbox.bssState = undefined;
  let dbg2 = null, threw2 = false;
  try { dbg2 = sandbox.apexDebugBackendDirectionalAdapter(); } catch (e) { threw2 = true; }
  ok(threw2 === false, '23: debug helper safe when bssState is undefined (no throw)');
  ok(dbg2 && dbg2.rows.length === 0 && dbg2.sourceState.available === false && dbg2.sourceState.reason === 'no_snapshot',
     '23: returns empty-state shape when bssState is absent');
  ok(networkCalls.length === 0, '23: no network call in the absent-bssState path');
}

// ── 24. source-level guards: adapter is inert wrt network + existing scanners ──
section('24. source-level anti-regression guards');
{
  const adapterBodies = BDS_FNS.map((n) => stripComments(extractFn(HTML, n))).join('\n');
  ok(!/\bfetch\s*\(/.test(adapterBodies), '24: adapter makes no fetch() call');
  ok(!/new\s+WebSocket/.test(adapterBodies), '24: adapter opens no new WebSocket');
  ok(!/scanner\/run/.test(adapterBodies), '24: adapter never references POST /scanner/run');
  ok(!/subscribeDxlinkQuotes/.test(adapterBodies), '24: adapter never calls subscribeDxlinkQuotes');
  ok(!/subscribe-quotes/.test(adapterBodies), '24: adapter never references subscribe-quotes');
  ok(!/\bttCall\s*\(/.test(adapterBodies), '24: adapter makes no ttCall() backend request');
  ok(!/_ensureCandleSubscription|_subscribeQuotes|_initCandleStream|XMLHttpRequest/.test(adapterBodies),
     '24: adapter touches no candle-subscription / XHR pipeline');

  // The existing scanner generation/render functions must NOT reference the
  // adapter — proving the adapter is not wired into the live scanner yet.
  ['computeDirectionalSetupCandidates', 'computeRsCandidates', 'renderDirectionalSetupScanner', 'runScan'].forEach((n) => {
    const body = stripComments(extractFn(HTML, n));
    ok(!/\bbds[A-Z]/.test(body) && !/_bds[A-Z]/.test(body) && !/apexDebugBackendDirectional/.test(body),
       '24: ' + n + ' does not reference the BDS adapter (not wired into the live scanner)');
  });

  // index.html exposes the debug helper on window exactly once and never auto-calls it.
  ok(/window\.apexDebugBackendDirectionalAdapter\s*=\s*apexDebugBackendDirectionalAdapter/.test(HTML),
     '24: window.apexDebugBackendDirectionalAdapter is exposed for manual console use');
  ok(!/apexDebugBackendDirectionalAdapter\s*\(\s*\)\s*;/.test(HTML.replace(/window\.apexDebugBackendDirectionalAdapter\s*=\s*apexDebugBackendDirectionalAdapter\s*;/, '')),
     '24: debug helper is never invoked automatically');
}

// ── manual-validation mirror: exact expected output for the dev backend ───────
section('Manual-validation mirror (task acceptance values)');
{
  const snapshot = cleanSnapshot();
  const status = { schedulerEnabled: true, statusError: null, snapshotError: null };
  const rows = bdsDeriveBackendDirectionalRows(snapshot, { includeNonEligible: true });
  const summary = bdsBackendDirectionalSummary(rows);
  const sourceState = bdsGetBackendDirectionalSourceState(snapshot, status);

  ok(sourceState.available === true, 'mirror: sourceState.available true');
  ok(summary.total === 3, 'mirror: summary.total 3');
  ok(summary.bullish === 3, 'mirror: summary.bullish 3');
  ok(summary.bearish === 0, 'mirror: summary.bearish 0');
  ok(summary.rankEligible === 3, 'mirror: summary.rankEligible 3');
  ok(summary.topSymbols[0] === 'AAPL', 'mirror: topSymbols begins with AAPL');

  const expect = [
    { symbol: 'AAPL', scorePreview: 94, scoreBucket: 'A', direction: 'bullish' },
    { symbol: 'SPY', scorePreview: 79, scoreBucket: 'B', direction: 'bullish' },
    { symbol: 'MSFT', scorePreview: 72, scoreBucket: 'B', direction: 'bullish' },
  ];
  expect.forEach((e, i) => {
    const r = rows[i];
    ok(r && r.symbol === e.symbol && r.scorePreview === e.scorePreview && r.scoreBucket === e.scoreBucket && r.direction === e.direction,
       'mirror: row ' + i + ' = ' + e.symbol + ' scorePreview ' + e.scorePreview + ' bucket ' + e.scoreBucket + ' ' + e.direction);
    ok(r.operationalDirection === null && r.operationalScore === null,
       'mirror: ' + e.symbol + ' operationalDirection/operationalScore null (diagnostic-only invariant)');
  });
}

// ── done ──────────────────────────────────────────────────────────────────────
console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
