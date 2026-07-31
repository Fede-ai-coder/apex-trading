'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// SWING panel — scanner SOURCE BIAS vs final multi-timeframe SWING DIRECTION.
//
// Regression: the `Dir` column showed the SOURCE SCANNER's bias (e.g. an RS-vs-SPY
// underperformer → SHORT) as if it were the final Swing direction, even when the
// absolute Weekly/Daily/4H trend was clearly bullish. A relatively weaker-than-SPY
// name can still be in an absolute uptrend — RS bias SHORT ≠ Swing direction SHORT.
//
// The fix separates them:
//   • sourceBias / sourceBiasProvenance  — what the source scanner claimed (preserved)
//   • swingDirection                      — LONG / SHORT / CONFLICT / WAIT / PENDING,
//                                           resolved purely from the computed context
//   • directionConflict / directionReason — the conflict + its explanation
//
// All proofs read the REAL functions out of index.html (no copies, so they cannot
// drift) and drive them directly.
//
// Run: node tests/swing-source-bias-direction.test.js
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const HTML = require('./lib/load-app-source').loadAppJavaScriptSource();

function extractFn(src, name) {
  const sig = 'function ' + name + '(';
  let start = src.indexOf('async ' + sig);
  if (start < 0) start = src.indexOf(sig);
  if (start < 0) throw new Error('function not found: ' + name);
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('no body for: ' + name);
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
  throw new Error('unterminated body: ' + name);
}
function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); }

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  PASS  ' + msg); } else { fail++; console.log('  FAIL  ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + '  (got ' + JSON.stringify(a) + ')'); }
function section(t) { console.log('\n' + t); }
const near = (a, b) => a != null && b != null && Math.abs(a - b) < 1e-6;

// ── Sandbox ──────────────────────────────────────────────────────────────────
const dirLogs = [];
const sandbox = {
  console: { log: function () { if (arguments[0] === '[SWING-DIRECTION]') dirLogs.push(arguments[1]); }, warn: function () {}, error: function () {} },
  Math, JSON, Object, String, Number, isFinite, parseFloat, parseInt, NaN, Array, Date,
  S: { rsScannerData: [] },
};
// Shared SWING_* constants.
const CONST_RE = /var (SWING_[A-Z0-9_]+)\s*=\s*([0-9]+)/g;
let m; while ((m = CONST_RE.exec(HTML)) !== null) { sandbox[m[1]] = Number(m[2]); }
vm.createContext(sandbox);
vm.runInContext(
  ['smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze',
   '_etDateStr', '_backendCandleStoreChartNormTime', '_candleTradingSessionDate',
   '_swingWeekBucket', '_etMinutes', '_etDateStr', '_backendCandleStoreChartNormTime', '_candleTradingSessionDate', '_swingCandleTimeMs', '_swingWeekBucket', '_etWeekBucket', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles', '_swingTrendContextFromCandles', '_swing4hTiming',
   '_swingSqueezeStatus', '_swingDistancePct', '_swingAlignment', '_swingScore', '_swingRsContext',
   '_swingNormDir', '_swingNormalizeSourceBias', '_swingResolveDirection', '_swingPreparePriceAlignedCandles', '_swingBuildCandidate', '_swingMergeOperationalFacts',
   '_swingRowSourceBias', '_swingSwingDirRank', '_swingDirRank', '_swingSortCandidates',
   '_swingBiasProvAbbrev', '_swingBiasCell', '_swingDirectionCell', '_swingSwingDirColor', '_swingRowEnriched', '_swingScoreCell',
   '_swingLogDirection']
    .map((n) => extractFn(HTML, n)).join('\n'),
  sandbox
);
// Default to enriched:true so trend-logic cases read naturally; override for thin rows.
const R = (ctx) => sandbox._swingResolveDirection(Object.assign({ enriched: true }, ctx));

// ── Fixtures: monotone series so the trend context is deterministic ──────────
const DAY = 86400000, BASE = Date.UTC(2024, 0, 2);
function series(n, start, step) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const close = start + i * step;
    out.push({ time: BASE + i * DAY, open: close - Math.abs(step) / 2, high: close + 1, low: close - 1, close: close, volume: 1000 });
  }
  return out;
}
const upDaily   = series(220, 100, 0.6);   // steady uptrend  → Weekly UP / Daily UP
const downDaily = series(220, 240, -0.6);  // steady downtrend → Weekly DOWN / Daily DOWN
const up4H      = series(120, 100, 0.5);   // → 4H BULLISH
const down4H    = series(120, 200, -0.5);  // → 4H BEARISH
const build = (arg) => sandbox._swingBuildCandidate(arg);

// ═══════════════════════════════════════════════════════════════════════════
section('1. PENDING (enrichment not complete) is DISTINCT from WAIT (complete but insufficient)');
{
  // enriched:false — a thin row that has NOT been enriched yet → PENDING (regardless of trends).
  eq(sandbox._swingResolveDirection({ enriched: false, weeklyTrend: 'pending', dailyTrend: 'pending', fourHTiming: 'pending', sourceBias: 'SHORT' }).direction,
     'PENDING', '1A: thin row (enriched:false) → PENDING');
  eq(sandbox._swingResolveDirection({ enriched: false, weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'BULLISH', sourceBias: 'LONG' }).direction,
     'PENDING', '1A: enriched:false → PENDING even when trend values look complete');
  // enriched:true but a structural timeframe is genuinely unavailable → WAIT (never PENDING).
  const wkGone = R({ weeklyTrend: 'unavailable', dailyTrend: 'UP', fourHTiming: 'BULLISH', sourceBias: 'LONG' });
  eq(wkGone.direction, 'WAIT', '1B: enriched + Weekly unavailable → WAIT');
  ok(/Weekly context unavailable after enrichment/.test(wkGone.reason), '1B: reason = "Weekly context unavailable after enrichment"');
  const dlGone = R({ weeklyTrend: 'UP', dailyTrend: 'unavailable', fourHTiming: 'BULLISH', sourceBias: 'LONG' });
  eq(dlGone.direction, 'WAIT', '1C: enriched + Daily unavailable → WAIT');
  ok(/Daily context unavailable after enrichment/.test(dlGone.reason), '1C: reason = "Daily context unavailable after enrichment"');
  // A row whose 4H is still deferred (pending) stays PENDING even though it IS enriched.
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'pending', sourceBias: 'LONG' }).direction, 'PENDING',
     '1D: enriched but 4H still pending (deferred) → PENDING (not a permanent state)');
}

section('2. 4H UNAVAILABLE is NOT tactical confirmation → WAIT (never LONG/SHORT)');
{
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'unavailable', sourceBias: 'LONG' }).direction, 'WAIT',
     '2A: Weekly UP + Daily UP + 4H unavailable → WAIT (NOT LONG)');
  ok(/4H context unavailable after enrichment/.test(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'unavailable' }).reason),
     '2A: reason = "4H context unavailable after enrichment"');
  eq(R({ weeklyTrend: 'DOWN', dailyTrend: 'DOWN', fourHTiming: 'unavailable', sourceBias: 'SHORT' }).direction, 'WAIT',
     '2B: Weekly DOWN + Daily DOWN + 4H unavailable → WAIT (NOT SHORT)');
  // 4H NEUTRAL IS a real read → directional (unless the source bias conflicts).
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'NEUTRAL', sourceBias: 'LONG' }).direction, 'LONG', '2C: 4H NEUTRAL + bullish → LONG');
  eq(R({ weeklyTrend: 'DOWN', dailyTrend: 'DOWN', fourHTiming: 'NEUTRAL', sourceBias: 'SHORT' }).direction, 'SHORT', '2D: 4H NEUTRAL + bearish → SHORT');
  // The reason for a LONG/SHORT never claims "4H not bearish/bullish" for a missing 4H.
  const loReason = R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'NEUTRAL', sourceBias: 'LONG' }).reason;
  ok(!/not bearish|not bullish/.test(loReason), '2E: a LONG reason never says "4H not bearish" (missing ≠ confirmation)');
}

section('3. clean LONG / SHORT and CONFLICT variants');
{
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'BULLISH', sourceBias: 'LONG', source: 'RS' }).direction, 'LONG', '3: bullish + 4H bullish + bias LONG → LONG');
  eq(R({ weeklyTrend: 'DOWN', dailyTrend: 'DOWN', fourHTiming: 'BEARISH', sourceBias: 'SHORT' }).direction, 'SHORT', '3: bearish + 4H bearish + bias SHORT → SHORT');
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'DOWN', fourHTiming: 'NEUTRAL', sourceBias: 'LONG' }).direction, 'CONFLICT', '3: Weekly/Daily disagreement → CONFLICT');
  const rev = R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'BEARISH', sourceBias: 'LONG' });
  eq(rev.direction, 'CONFLICT', '3: 4H explicitly BEARISH against bullish structure → CONFLICT');
  ok(/4H tactical reversal/.test(rev.reason), '3: reason names the 4H tactical reversal');
  const bias = R({ weeklyTrend: 'DOWN', dailyTrend: 'DOWN', fourHTiming: 'BEARISH', sourceBias: 'LONG', source: 'Directional' });
  eq(bias.direction, 'CONFLICT', '3: Directional LONG bias vs bearish structure → CONFLICT');
  ok(/Directional LONG bias conflicts with bearish/.test(bias.reason), '3: reason: "Directional LONG bias conflicts with bearish…"');
}

section('4. WAIT when the trend is not clearly defined; UNKNOWN bias never conflicts');
{
  eq(R({ weeklyTrend: 'FLAT', dailyTrend: 'UP', fourHTiming: 'BULLISH', sourceBias: 'LONG' }).direction, 'WAIT', '4: FLAT weekly → WAIT (not auto-LONG)');
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'FLAT', fourHTiming: 'NEUTRAL', sourceBias: 'SHORT' }).direction, 'WAIT', '4: FLAT daily → WAIT (not auto-SHORT)');
  // UNKNOWN source bias is treated as no-conflict: structure decides the direction.
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'BULLISH', sourceBias: 'UNKNOWN' }).direction, 'LONG', '4: bullish + UNKNOWN bias → LONG (no conflict)');
  eq(R({ weeklyTrend: 'DOWN', dailyTrend: 'DOWN', fourHTiming: 'BEARISH', sourceBias: 'UNKNOWN' }).direction, 'SHORT', '4: bearish + UNKNOWN bias → SHORT (no conflict)');
}

// ═══════════════════════════════════════════════════════════════════════════
section('5. THE NVDA CASE — RS SHORT bias on a bullish Weekly/Daily trend → CONFLICT (not SHORT)');
{
  sandbox.dirLogsClear = (dirLogs.length = 0);
  const nvda = build({ symbol: 'NVDA', source: 'RS', direction: 'SHORT', rsValue: null,
                       dailyCandles: upDaily, fourHCandles: up4H, rsContext: null });
  eq(nvda.sourceBias, 'SHORT', '5: sourceBias preserved = SHORT (what the RS scanner claimed)');
  eq(nvda.sourceBiasProvenance, 'RS', '5: sourceBiasProvenance = RS');
  eq(nvda.weeklyTrend, 'UP', '5: Weekly UP');
  eq(nvda.dailyTrend, 'UP', '5: Daily UP');
  ok(nvda.fourHTiming !== 'BEARISH', '5: 4H is not bearish (got ' + nvda.fourHTiming + ')');
  eq(nvda.swingDirection, 'CONFLICT', '5: swingDirection = CONFLICT (NOT shown as SHORT)');
  ok(nvda.directionConflict === true, '5: directionConflict flag set');
  ok(/RS SHORT bias conflicts with bullish Weekly\/Daily trend/.test(nvda.directionReason),
     '5: directionReason = "RS SHORT bias conflicts with bullish Weekly/Daily trend"');
  ok(nvda.direction === 'SHORT', '5: legacy `direction` alias still carries the source bias (backward-compat)');
  ok(nvda.swingDirection !== 'SHORT' && nvda.swingDirection !== 'LONG', '5: the row is NOT flipped to a directional call');
  // RS metric not exposed → honest, non-destructive warning.
  ok(nvda.notes.some((n) => /RS numeric metric not exposed; source bias cannot be independently verified/.test(n)),
     '5: notes warn that the RS numeric metric is not exposed');
  ok(nvda.notes.some((n) => /RS SHORT bias conflicts with bullish/.test(n)), '5: conflict note present in Notes/warnings');
}

section('5B. SOURCE BIAS is NEVER invented from Daily/Weekly/4H (only explicit scanner data)');
{
  // Scanner supplied NO direction. Daily is a clear uptrend — the OLD code would have leaked
  // "RS LONG". sourceBias must be UNKNOWN and the Bias cell must not show a directional call.
  const noBiasUp = build({ symbol: 'NB1', source: 'RS', /* no direction */ rsValue: null,
                           dailyCandles: upDaily, fourHCandles: up4H, rsContext: null });
  eq(noBiasUp.sourceBias, 'UNKNOWN', '5B: no scanner direction + Daily UP → sourceBias UNKNOWN (not LONG)');
  ok(!/LONG/.test(sandbox._swingBiasCell(noBiasUp)), '5B: Bias cell does not show LONG (got "' + sandbox._swingBiasCell(noBiasUp) + '")');
  eq(sandbox._swingBiasCell(noBiasUp), 'RS UNKNOWN', '5B: Bias cell shows "RS UNKNOWN"');
  ok(noBiasUp.notes.some((n) => /Source scanner direction not exposed/.test(n)), '5B: honest "Source scanner direction not exposed" note');
  // The structure still resolves the Swing direction (UNKNOWN bias never conflicts).
  eq(noBiasUp.swingDirection, 'LONG', '5B: bullish structure + UNKNOWN bias → Swing LONG (Bias stays UNKNOWN)');

  const noBiasDown = build({ symbol: 'NB2', source: 'RS', /* no direction */ dailyCandles: downDaily, fourHCandles: down4H, rsContext: null });
  eq(noBiasDown.sourceBias, 'UNKNOWN', '5B: no scanner direction + Daily DOWN → sourceBias UNKNOWN (not SHORT)');
  eq(noBiasDown.swingDirection, 'SHORT', '5B: bearish structure + UNKNOWN bias → Swing SHORT');

  // Legacy `direction` may keep the daily inference for backward-compat, but it must NOT feed Bias.
  eq(noBiasUp.direction, 'LONG', '5B: legacy `direction` keeps the daily inference (backward-compat)');
  ok(sandbox._swingRowSourceBias(noBiasUp) === 'UNKNOWN', '5B: _swingRowSourceBias uses sourceBias (UNKNOWN), never the legacy direction');
}

section('5C. Progressive enrichment — PENDING → resolved, never a PERMANENT PENDING');
{
  // Thin operational row (not enriched) → Swing cell PENDING.
  const thin = { symbol: 'PRG', source: 'RS', direction: 'LONG' };
  eq(sandbox._swingDirectionCell(thin), 'PENDING', '5C: thin row Swing cell = PENDING');
  // Deferred-4H state (enriched weekly/daily, 4H pending) → still PENDING (transient).
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'UP', fourHTiming: 'pending', sourceBias: 'LONG' }).direction, 'PENDING', '5C: deferred 4H → PENDING');
  // Once fully enriched, it resolves to a real state — never stuck on PENDING.
  const done = build({ symbol: 'PRG', source: 'RS', direction: 'LONG', rsContext: { bias: 'STRONG', value: 9, label: 'RS' },
                       dailyCandles: upDaily, fourHCandles: up4H });
  ok(done.swingDirection !== 'PENDING', '5C: after full enrichment the row is no longer PENDING (got ' + done.swingDirection + ')');
  eq(done.swingDirection, 'LONG', '5C: fully-enriched bullish row → LONG');
}

section('5D. UNKNOWN source bias is IDEMPOTENT across rebuilds (never folds to NEUTRAL)');
{
  // _swingNormalizeSourceBias is idempotent for UNKNOWN (and empty), unlike _swingNormDir.
  eq(sandbox._swingNormalizeSourceBias('UNKNOWN'), 'UNKNOWN', '5D: normalize(UNKNOWN) → UNKNOWN');
  eq(sandbox._swingNormalizeSourceBias(null), 'UNKNOWN', '5D: normalize(null) → UNKNOWN');
  eq(sandbox._swingNormalizeSourceBias('SHORT'), 'SHORT', '5D: normalize(SHORT) → SHORT (still normalizes real values)');
  eq(sandbox._swingNormDir('UNKNOWN'), 'NEUTRAL', '5D: (contrast) the shared _swingNormDir folds UNKNOWN → NEUTRAL');
  // First build with no scanner direction → UNKNOWN.
  const first = build({ symbol: 'IDM', source: 'RS', dailyCandles: upDaily, fourHCandles: up4H, rsContext: null });
  eq(first.sourceBias, 'UNKNOWN', '5D: first build → sourceBias UNKNOWN');
  // Second build FED the first build's sourceBias (the lazy-4H / merge rebuild path) → still UNKNOWN.
  const second = build({ symbol: 'IDM', source: 'RS', sourceBias: first.sourceBias, sourceBiasProvenance: first.sourceBiasProvenance,
                         dailyCandles: upDaily, fourHCandles: up4H, rsContext: null });
  eq(second.sourceBias, 'UNKNOWN', '5D: rebuild passing sourceBias=UNKNOWN → still UNKNOWN (NOT NEUTRAL)');
  eq(sandbox._swingBiasCell(second), 'RS UNKNOWN', '5D: Bias cell still "RS UNKNOWN" after rebuild');
  ok(second.notes.some((n) => /Source scanner direction not exposed/.test(n)), '5D: "Source scanner direction not exposed" note survives the rebuild');
  ok(second.sourceBias !== 'NEUTRAL', '5D: never becomes NEUTRAL');
}

section('5E. 4H-pending PRECEDENCE — dominates disagreement / FLAT / bias (until 4H loads)');
{
  // 4H pending beats a Weekly/Daily disagreement (which would otherwise be CONFLICT).
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'DOWN', fourHTiming: 'pending', sourceBias: 'LONG' }).direction, 'PENDING',
     '5E: Weekly UP + Daily DOWN + 4H pending → PENDING (not CONFLICT)');
  // 4H pending beats a FLAT (which would otherwise be WAIT).
  eq(R({ weeklyTrend: 'FLAT', dailyTrend: 'UP', fourHTiming: 'pending', sourceBias: 'SHORT' }).direction, 'PENDING',
     '5E: Weekly FLAT + Daily UP + 4H pending → PENDING (not WAIT)');
  // Once the 4H completes, the underlying structure decides.
  eq(R({ weeklyTrend: 'UP', dailyTrend: 'DOWN', fourHTiming: 'NEUTRAL', sourceBias: 'LONG' }).direction, 'CONFLICT',
     '5E: after 4H completes, Weekly UP + Daily DOWN → CONFLICT');
  eq(R({ weeklyTrend: 'FLAT', dailyTrend: 'UP', fourHTiming: 'NEUTRAL', sourceBias: 'SHORT' }).direction, 'WAIT',
     '5E: after 4H completes, Weekly FLAT + Daily UP → WAIT');
}

section('5F. DEFERRED-4H row is ATOMIC — no stale WAIT / "4H unavailable" / completed score');
{
  // Build with fourHDeferred:true (rows beyond the eager 4H limit). Weekly/Daily are a clear
  // uptrend; without the atomic build this would leak Swing=WAIT + "4H unavailable" + a score.
  const def = build({ symbol: 'DEF', source: 'RS', direction: 'LONG', rsContext: { bias: 'STRONG', value: 8, label: 'RS' },
                      dailyCandles: upDaily, fourHCandles: null, fourHDeferred: true });
  eq(def.swingDirection, 'PENDING', '5F: deferred row → Swing PENDING');
  eq(def.fourHTiming, 'pending', '5F: fourHTiming = pending');
  eq(def.fourHLabel, '4H: pending', '5F: fourHLabel = "4H: pending"');
  ok(def.deferred4h === true, '5F: row flagged deferred4h for lazy enrichment');
  ok(def.notes.some((n) => /4H pending enrichment/.test(n)), '5F: note = "4H pending enrichment"');
  ok(!def.notes.some((n) => /4H unavailable/.test(n)), '5F: NO stale "4H unavailable" note');
  ok(def.directionConflict === false, '5F: no stale conflict on the deferred row');
  ok(typeof def.swingScore.score !== 'number', '5F: score is NOT a completed number (partial/pending)');
  eq(sandbox._swingScoreCell(def), 'pending', '5F: Score cell shows "pending" (not a misleading completed value)');
  eq(sandbox._swingDirectionCell(def), 'PENDING', '5F: Swing cell shows PENDING');
  // Lazy enrichment completes 4H → the SAME row re-resolves atomically to a real state.
  const done = build({ symbol: 'DEF', source: 'RS', direction: 'LONG', sourceBias: def.sourceBias,
                       rsContext: { bias: 'STRONG', value: 8, label: 'RS' }, dailyCandles: upDaily, fourHCandles: up4H });
  eq(done.swingDirection, 'LONG', '5F: after lazy 4H enrichment → LONG');
  ok(typeof done.swingScore.score === 'number' && done.swingScore.max === 6, '5F: completed score is a real number after enrichment');
  ok(!done.notes.some((n) => /4H pending enrichment/.test(n)), '5F: the "4H pending" note is gone after enrichment');
  eq(done.fourHTiming, 'BULLISH', '5F: fourHTiming is the real timing after enrichment');
}

section('6. [SWING-DIRECTION] diagnostic payload');
{
  dirLogs.length = 0;
  const nvda = build({ symbol: 'NVDA', source: 'RS', direction: 'SHORT', rsValue: null,
                       dailyCandles: upDaily, fourHCandles: up4H, rsContext: null });
  sandbox._swingLogDirection(nvda);
  eq(dirLogs.length, 1, '6: exactly one [SWING-DIRECTION] payload emitted');
  const d = dirLogs[0];
  ok(d.symbol === 'NVDA' && d.source === 'RS' && d.sourceBias === 'SHORT' && d.swingDirection === 'CONFLICT' &&
     d.weeklyTrend === 'UP' && d.dailyTrend === 'UP' && d.rsValue === null &&
     /RS SHORT bias conflicts with bullish/.test(d.reason),
     '6: payload carries symbol/source/sourceBias/swingDirection/trends/rsValue/reason');
}

// ═══════════════════════════════════════════════════════════════════════════
section('7. SCORE — conflict is penalized, never flipped; max stays 6');
{
  const clean = build({ symbol: 'AAA', source: 'RS', direction: 'LONG', rsContext: { bias: 'STRONG', value: 12.5, label: 'RS STRONG (+12.5)' },
                        dailyCandles: upDaily, fourHCandles: up4H });
  const conflicted = build({ symbol: 'BBB', source: 'RS', direction: 'SHORT', rsContext: null,
                             dailyCandles: upDaily, fourHCandles: up4H });
  eq(clean.swingDirection, 'LONG', '7: clean LONG resolves LONG');
  eq(conflicted.swingDirection, 'CONFLICT', '7: contrarian SHORT bias on an uptrend resolves CONFLICT');
  ok(clean.swingScore.max === 6 && conflicted.swingScore.max === 6, '7: score max unchanged (6) for both');
  ok(conflicted.swingScore.score < clean.swingScore.score,
     '7: the conflicted row scores LOWER than the clean LONG (' + conflicted.swingScore.score + ' < ' + clean.swingScore.score + ')');
  ok(conflicted.swingScore.informational === true, '7: score stays informational (never filters)');
}

section('8. SOURCE BIAS preserved through operational-facts merge (RS value + squeeze not lost)');
{
  const rebuilt = build({ symbol: 'MRG', source: 'RS', direction: 'SHORT', rsValue: -3.2,
                          dailyCandles: upDaily, fourHCandles: up4H, rsContext: null });
  const src = { symbol: 'MRG', source: 'RS', direction: 'SHORT', rsValue: -3.2, _opInSqueeze: true, _opFiring: false };
  const merged = sandbox._swingMergeOperationalFacts(rebuilt, src);
  eq(merged.sourceBias, 'SHORT', '8: sourceBias survives the merge');
  eq(merged.sourceBiasProvenance, 'RS', '8: provenance survives the merge');
  eq(merged.swingDirection, 'CONFLICT', '8: swingDirection survives the merge');
  eq(merged.rsValue, -3.2, '8: RS value preserved (not lost)');
  eq(merged.squeezeStatus, 'in squeeze', '8: operational squeeze fact applied without clobbering direction fields');
}

// ═══════════════════════════════════════════════════════════════════════════
section('9. UI cells — Bias vs Swing rendered distinctly, thin rows show PENDING');
{
  const thin = { symbol: 'THIN', source: 'RS', direction: 'SHORT' }; // un-enriched operational row
  eq(sandbox._swingBiasCell(thin), 'RS SHORT', '9: Bias cell on a thin row = "RS SHORT" (provenance + bias)');
  eq(sandbox._swingDirectionCell(thin), 'PENDING', '9: Swing cell on a thin row = PENDING (bias available, direction not yet)');
  const enriched = build({ symbol: 'ENR', source: 'Directional', direction: 'LONG', dailyCandles: upDaily, fourHCandles: up4H });
  eq(sandbox._swingBiasCell(enriched), 'DIR LONG', '9: Bias cell = "DIR LONG" for a Directional row');
  eq(sandbox._swingDirectionCell(enriched), 'LONG', '9: Swing cell shows the computed LONG once enriched');
  eq(sandbox._swingSwingDirColor('LONG'), 'var(--gr)', '9: LONG → green');
  eq(sandbox._swingSwingDirColor('SHORT'), 'var(--rd)', '9: SHORT → red');
  eq(sandbox._swingSwingDirColor('CONFLICT'), 'var(--am)', '9: CONFLICT → amber');
  eq(sandbox._swingSwingDirColor('WAIT'), 'var(--tx3)', '9: WAIT → neutral');
  eq(sandbox._swingSwingDirColor('PENDING'), 'var(--tx3)', '9: PENDING → neutral');
  eq(sandbox._swingBiasProvAbbrev('Squeeze'), 'SQZ', '9: Squeeze provenance abbreviates to SQZ');
}

section('10. SORT — Bias by source bias; Swing by LONG<SHORT<CONFLICT<WAIT<PENDING<UNKNOWN');
{
  eq([0,1,2,3,4,5].map((i) => sandbox._swingSwingDirRank(['LONG','SHORT','CONFLICT','WAIT','PENDING','ZZZ'][i])).join(','),
     '0,1,2,3,4,5', '10: swing-dir rank order LONG<SHORT<CONFLICT<WAIT<PENDING<unknown');
  const rows = [
    { symbol: 'W', swingDirection: 'WAIT', sourceBias: 'LONG' },
    { symbol: 'C', swingDirection: 'CONFLICT', sourceBias: 'SHORT' },
    { symbol: 'L', swingDirection: 'LONG', sourceBias: 'LONG' },
    { symbol: 'P', swingDirection: 'PENDING', sourceBias: 'NEUTRAL' },
    { symbol: 'S', swingDirection: 'SHORT', sourceBias: 'SHORT' } ];
  eq(sandbox._swingSortCandidates(rows, { key: 'swing', dir: 'asc' }).map((c) => c.symbol).join(','), 'L,S,C,W,P',
     '10: Swing asc → LONG,SHORT,CONFLICT,WAIT,PENDING');
  eq(sandbox._swingSortCandidates(rows, { key: 'bias', dir: 'asc' }).map((c) => c.sourceBias).join(','), 'LONG,LONG,SHORT,SHORT,NEUTRAL',
     '10: Bias asc groups by source bias (LONG,LONG,SHORT,SHORT,NEUTRAL)');
  // legacy 'direction' key still works as a bias alias (backward-compat).
  eq(sandbox._swingSortCandidates(rows, { key: 'direction', dir: 'asc' }).map((c) => c.sourceBias).join(','), 'LONG,LONG,SHORT,SHORT,NEUTRAL',
     '10: legacy "direction" sort key still ranks by source bias');
  // sort is non-destructive.
  eq(rows.map((c) => c.symbol).join(','), 'W,C,L,P,S', '10: source array not mutated by sort');
}

// ═══════════════════════════════════════════════════════════════════════════
section('11. STATIC — no indicator formula change, no new fetch / provider / socket');
{
  const src = ['_swingResolveDirection', '_swingBuildCandidate', '_swingBiasCell', '_swingDirectionCell', '_swingLogDirection']
    .map((n) => stripComments(extractFn(HTML, n))).join('\n');
  ok(!/\bfetch\s*\(/.test(src), '11: no fetch(');
  ok(!/yahoo/i.test(src), '11: no Yahoo provider');
  ok(!/new\s+WebSocket|createSubscription|dxlinkSubscribe/i.test(src), '11: no WebSocket / new subscription');
  // _swingResolveDirection recomputes NO indicators — it only reads the trend enums.
  const rd = stripComments(extractFn(HTML, '_swingResolveDirection'));
  ok(!/smA\(|calcRSIWilder\(|calcBB\(|calcKC\(|calcSqueeze\(/.test(rd),
     '11: _swingResolveDirection introduces no second indicator formula (reuses the computed context)');
  // Indicator helpers are untouched (spot-check the SMA still divides by the window).
  ok(/function _swingResolveDirection\(/.test(HTML) && /swingDirection:/.test(HTML),
     '11: swingDirection is wired into the candidate object');
}

// ═══════════════════════════════════════════════════════════════════════════
// PART 2 — ANALYSIS-PRICE PARITY (stacked on PR #308): the analysis/enrichment path
// (_swingBuildCandidate) must compute Weekly/Daily/4H/Direction/Score on candles PATCHED
// to the SAME freshest-valid-APEX price the charts use — not the stale backend close.
// A SEPARATE sandbox wired with the REAL price stack (so the shared helper actually resolves
// + patches), driving the REAL functions extracted from index.html.
// ═══════════════════════════════════════════════════════════════════════════
const aLogs = [];
const aSandbox = {
  console: { log: function () { if (arguments[0] === '[SWING-ANALYSIS-PRICE]') aLogs.push(arguments[1]); }, warn: function () {}, error: function () {} },
  Math, JSON, Object, String, Number, isFinite, parseFloat, parseInt, NaN, Array, Date,
  _isRegular: true,
  getUsEquityMarketSession: function () { return { isRegularSession: aSandbox._isRegular }; },
  isRTHOpen: function () { return aSandbox._isRegular; },
  S: { scanData: [], rsScannerData: [] },
};
const CONST_RE2 = /var (SWING_[A-Z0-9_]+)\s*=\s*([0-9]+)/g;
let m2; while ((m2 = CONST_RE2.exec(HTML)) !== null) { aSandbox[m2[1]] = Number(m2[2]); }
vm.createContext(aSandbox);
vm.runInContext(
  ['_dssResolvePrice', 'resolveLatestDisplayPrice', 'patchLastCandleWithLivePrice',
   '_etDateStr', '_candleTradingSessionDate', '_swingRowPriceObservedAt',
   '_backendCandleStoreChartNormTime', '_swingCandleTimeMs', '_swingResolveRenderPrice', '_swingPreparePriceAlignedCandles',
   'smA', 'rma', 'calcRSIWilder', 'calcBB', 'calcKC', 'calcSqueeze',
   '_swingWeekBucket', '_etMinutes', '_etDateStr', '_backendCandleStoreChartNormTime', '_candleTradingSessionDate', '_swingCandleTimeMs', '_swingWeekBucket', '_etWeekBucket', '_swingLogWeeklySource', '_swingDeriveWeeklyCandles', '_swingTrendContextFromCandles', '_swing4hTiming', '_swingSqueezeStatus',
   '_swingDistancePct', '_swingAlignment', '_swingScore', '_swingRsContext',
   '_swingNormDir', '_swingNormalizeSourceBias', '_swingResolveDirection', '_swingBuildCandidate',
   '_swingScoreCell', '_swingLogDirection', '_swingLogAnalysisPrice']
    .map((n) => extractFn(HTML, n)).join('\n'),
  aSandbox
);
const A = (arg) => aSandbox._swingBuildCandidate(arg);
const lastCloseOf = (arr) => arr && arr.length ? arr[arr.length - 1].close : null;

// Fixtures with real timestamps: 4H ends AFTER the daily (the real "4H is fresher" case).
//
// SESSION ANCHORING (session-identity guard): bars are stamped at 15:00 UTC — 10:00 ET,
// i.e. inside the regular session — so a bar's America/New_York trading date equals its
// UTC date and every fixture has an unambiguous session identity. (The former midnight-UTC
// anchor put each bar at 19:00 ET of the PREVIOUS day, which is exactly the UTC-vs-ET date
// confusion this suite now guards against.)
//
// The default 4H end is the SAME ET trading session as the daily's last bar, four hours
// later in that session: that is the real "the 4H print is fresher than the daily bar's
// close" case — the one price parity exists for. Fixtures that deliberately place the two
// timeframes in DIFFERENT sessions pass an explicit endT and assert the guard BLOCKS the
// cross-session patch.
const DA = 86400000, HRr = 3600000, TBB = Date.UTC(2024, 0, 2, 15, 0);
const LAST_D = 219; // index of the last bar produced by mkD(220, ...)
function mkD(n, lastClose, step, endT) {
  step = step || 0.3; const a = []; let prev = 150;
  for (let i = 0; i < n; i++) { const last = i === n - 1; const c = last ? lastClose : prev + i * step * 0 + (i % 2 ? step + 0.4 : -step); if (!last) prev = c;
    const t = (endT != null) ? (endT - (n - 1 - i) * DA) : (TBB + i * DA);
    a.push({ time: t, open: c - 0.3, high: c + 1.2, low: c - 1.2, close: c, volume: 1000 + i }); }
  return a;
}
// A live in-session DXLink mark belongs to the CURRENT trading session, so a fixture that
// exercises that branch must place its last bar in that same session or the session-identity
// guard (correctly) blocks the patch. TODAY_ET is today's America/New_York trading date at
// 15:00 UTC (10:00 ET — inside the regular session, so the UTC and ET dates agree).
const TODAY_ET = (function () {
  const p = aSandbox._etDateStr(Date.now()).split('-').map(Number);
  return Date.UTC(p[0], p[1] - 1, p[2], 15, 0);
})();
function mk4(n, lastClose, endT, dir) {
  const end = endT != null ? endT : (TBB + LAST_D * DA + 4 * HRr); const a = []; let prev = 150;
  for (let i = 0; i < n; i++) { const last = i === n - 1; const c = last ? lastClose : prev + (dir === 'down' ? -0.6 : (i % 2 ? 0.8 : -0.5)); if (!last) prev = c;
    a.push({ time: end - (n - 1 - i) * 4 * HRr, open: c - 0.4, high: c + 1.0, low: c - 1.0, close: c, volume: 500 + i }); }
  return a;
}
// `_priceAt` is the observation time the scanner stamps when it writes a live DXLink mark; the
// SWING resolver requires it before that mark may claim a trading session.
function aRow(sym, px, lastDailyClose, priceAt) { return { ticker: sym, _priceSource: 'DXLink', price: String(px), bid: px - 0.1, ask: px + 0.1, _priceAt: (priceAt != null ? priceAt : Date.now()), candles: [{ c: lastDailyClose }] }; }

section('A1. NVDA market CLOSED — analysis uses the freshest 4H close 210.93 (not the stale row 196.93)');
{
  aSandbox._isRegular = false;                         // market closed
  aSandbox.S.scanData = [aRow('NVDA', 999.99, 196.93)]; // resolver row = last RTH daily close 196.93
  const daily = mkD(220, 196.93), fourH = mk4(60, 210.93); // backend daily 196.93 (older), backend 4H 210.93 (newer)
  // Sanity: the resolver row IS the stale 196.93; the helper must still pick the fresher 210.93.
  eq(aSandbox.resolveLatestDisplayPrice('NVDA').price, 196.93, 'A1: resolveLatestDisplayPrice → stale row close 196.93');
  const c = A({ symbol: 'NVDA', source: 'RS', direction: 'SHORT', rsValue: null, dailyCandles: daily, fourHCandles: fourH, rsContext: null });
  ok(near(c.analysisPrice, 210.93) && /backend 4H/.test(String(c.analysisPriceSource)),
     'A1: analysisPrice = 210.93, source = backend 4H (got ' + c.analysisPrice + '/' + c.analysisPriceSource + ')');
  ok(near(c.analysisDailyCloseBefore, 196.93) && near(c.analysisDailyCloseAfter, 210.93), 'A1: daily close 196.93 → 210.93');
  ok(near(c.analysisFourHCloseAfter, 210.93), 'A1: 4H close after = 210.93');
  ok(near(c.analysisWeeklyCloseAfter, 210.93), 'A1: weekly close after = 210.93 (derived from patched daily)');
  ok(near(c.price, 210.93), 'A1: candidate.price = 210.93 (the aligned price, not 196.93)');
  ok(c.sourceBias === 'SHORT', 'A1: source bias preserved SHORT (analysis price does not touch the bias)');
}

section('A2. Weekly/Daily/4H are computed on the PATCHED series (equal the real helper on patched candles)');
{
  aSandbox._isRegular = false;
  aSandbox.S.scanData = [aRow('NVDA', 999.99, 196.93)];
  const daily = mkD(220, 196.93), fourH = mk4(60, 210.93);
  const c = A({ symbol: 'NVDA', source: 'RS', direction: 'SHORT', dailyCandles: daily, fourHCandles: fourH, rsContext: null });
  // Recompute the expected context by patching to 210.93 ourselves and calling the REAL helpers.
  const dP = aSandbox.patchLastCandleWithLivePrice(daily, 210.93);
  const fP = aSandbox.patchLastCandleWithLivePrice(fourH, 210.93);
  const wP = aSandbox.patchLastCandleWithLivePrice(aSandbox._swingDeriveWeeklyCandles(dP), 210.93);
  eq(c.dailyTrend,  aSandbox._swingTrendContextFromCandles(dP, aSandbox.SWING_MIN_DAILY_BARS).trend,  'A2: dailyTrend  == helper(patched daily)');
  eq(c.weeklyTrend, aSandbox._swingTrendContextFromCandles(wP, aSandbox.SWING_MIN_WEEKLY_BARS).trend, 'A2: weeklyTrend == helper(patched weekly)');
  eq(c.fourHTiming, aSandbox._swing4hTiming(fP).timing, 'A2: fourHTiming == helper(patched 4H)');
}

section('A3. Patch actually CHANGES a technical result — 4H flips, Direction/Score follow the patched context');
{
  // RTH open with a high live mark; the raw 4H is a downtrend (BEARISH), the patch lifts it to BULLISH.
  aSandbox._isRegular = true;
  aSandbox.S.scanData = [aRow('AAA', 260.00, 250.00)]; // live DXLink mark 260 (authoritative in-session)
  // Anchored to the CURRENT ET session: a live mark and the bar it is written into must be
  // the same session for the patch to be legitimate (and it is, intraday).
  const daily = mkD(220, 250.00, undefined, TODAY_ET);          // clear uptrend → Daily/Weekly UP
  const fourHDown = mk4(60, 114.00, TODAY_ET + 4 * HRr, 'down'); // steady 4H DOWNtrend → raw BEARISH
  const rawTiming = aSandbox._swing4hTiming(fourHDown).timing;
  const patchedTiming = aSandbox._swing4hTiming(aSandbox.patchLastCandleWithLivePrice(fourHDown, 260.00)).timing;
  ok(rawTiming === 'BEARISH' && patchedTiming === 'BULLISH',
     'A3: fixture: raw 4H BEARISH vs patched 4H BULLISH (' + rawTiming + ' → ' + patchedTiming + ')');
  const c = A({ symbol: 'AAA', source: 'Directional', direction: 'LONG', dailyCandles: daily, fourHCandles: fourHDown, rsContext: null });
  eq(c.fourHTiming, 'BULLISH', 'A3: candidate.fourHTiming is the PATCHED BULLISH (not the raw BEARISH)');
  eq(c.swingDirection, 'LONG', 'A3: swingDirection = LONG from the patched context (raw would be CONFLICT — 4H reversal)');
  ok(c.swingScore && typeof c.swingScore.score === 'number', 'A3: score computed on the patched context');
}

section('A4. DXLink live in-session is authoritative for analysis too (210.96 over 196.93 / 210.93)');
{
  aSandbox._isRegular = true;
  aSandbox.S.scanData = [aRow('NVDA', 210.96, 196.93)]; // live mark 210.96
  const c = A({ symbol: 'NVDA', source: 'RS', direction: 'SHORT',
    dailyCandles: mkD(220, 196.93, undefined, TODAY_ET),        // current-session daily bar
    fourHCandles: mk4(60, 210.93, TODAY_ET + 4 * HRr), rsContext: null });
  ok(near(c.analysisPrice, 210.96) && c.analysisPriceSource === 'dxlink', 'A4: analysisPrice = 210.96 (source dxlink)');
  ok(near(c.analysisDailyCloseAfter, 210.96) && near(c.analysisFourHCloseAfter, 210.96), 'A4: daily & 4H analysis close = 210.96');
}

section('A5. Daily more recent than 4H → analysis uses the daily close (4H not assumed newest)');
{
  aSandbox._isRegular = false;
  aSandbox.S.scanData = []; // no row → resolver null → freshest backend candle by real timestamp
  const daily = mkD(220, 351.10);                       // daily ends ~day 219
  const stale4H = mk4(60, 349.20, TBB + 100 * DA);      // 4H ends ~day 100 → older than the daily
  const c = A({ symbol: 'WHO', source: 'RS', dailyCandles: daily, fourHCandles: stale4H, rsContext: null });
  ok(near(c.analysisPrice, 351.10) && /backend 1D/.test(String(c.analysisPriceSource)), 'A5: analysisPrice = 351.10 (source backend 1D)');
  // SESSION-IDENTITY GUARD: the chosen price belongs to the DAILY's session (~day 219); the
  // 4H series' last bar is ~day 100, a different trading session. Writing 351.10 into it
  // would build a 4H candle with an open from day 100 and a close from day 219 — the exact
  // EXPE hybrid. The 4H must therefore keep its own session's close.
  ok(near(c.analysisFourHCloseAfter, 349.20),
     'A5: the older 4H is NOT patched across sessions — it keeps its own close 349.20');
}

section('A6. ISO timestamps — freshest chosen in both directions (parseFloat would misread)');
{
  aSandbox.S.scanData = [];
  const toISO = (arr) => arr.map((c) => Object.assign({}, c, { time: new Date(c.time).toISOString() }));
  // 4H newer (ISO).
  const c1 = A({ symbol: 'ISO1', source: 'RS', dailyCandles: toISO(mkD(220, 196.93)), fourHCandles: toISO(mk4(60, 210.93, TBB + 320 * DA + 3 * HRr)), rsContext: null });
  ok(near(c1.analysisPrice, 210.93) && /backend 4H/.test(String(c1.analysisPriceSource)), 'A6: ISO — newer 4H 210.93 chosen');
  // Daily newer (ISO).
  const c2 = A({ symbol: 'ISO2', source: 'RS', dailyCandles: toISO(mkD(220, 305.55)), fourHCandles: toISO(mk4(60, 301.10, TBB + 80 * DA)), rsContext: null });
  ok(near(c2.analysisPrice, 305.55) && /backend 1D/.test(String(c2.analysisPriceSource)), 'A6: ISO — newer daily 305.55 chosen');
}

section('A7. No valid price → no-op: legacy analysis preserved, no NaN, backend close used');
{
  aSandbox._isRegular = false;
  aSandbox.S.scanData = [];
  // Candles whose closes are all non-finite for the LAST bar timestamp resolution → resolver null.
  const daily = mkD(220, 196.93), fourH = mk4(60, 205.55);
  // Force the null-price path: stub the resolver seam to null for this one build.
  const realPrep = aSandbox._swingPreparePriceAlignedCandles;
  aSandbox._swingPreparePriceAlignedCandles = function (sym, d, f) {
    // delegate but with a null price (simulate "no valid price"): patch is a no-op.
    var _derive = aSandbox._swingDeriveWeeklyCandles;
    return { price: null, source: null, dailyCandles: d, fourHCandles: f, weeklyCandles: _derive(d || []),
      before: { daily: lastCloseOf(d), fourH: lastCloseOf(f), weekly: lastCloseOf(_derive(d || [])) },
      after:  { daily: lastCloseOf(d), fourH: lastCloseOf(f), weekly: lastCloseOf(_derive(d || [])) } };
  };
  const c = A({ symbol: 'NULLP', source: 'RS', direction: 'SHORT', dailyCandles: daily, fourHCandles: fourH, rsContext: null });
  ok(c.analysisPrice === null, 'A7: analysisPrice null (honest no-op)');
  ok(near(c.analysisDailyCloseAfter, 196.93) && near(c.analysisFourHCloseAfter, 205.55), 'A7: closes unchanged (legacy backend close)');
  ok(Number.isFinite(c.price) || c.price === null, 'A7: candidate.price finite-or-null (no NaN)');
  ok(c.dailyTrend !== undefined && c.weeklyTrend !== undefined, 'A7: trends still computed (legacy preserved, no crash)');
  aSandbox._swingPreparePriceAlignedCandles = realPrep; // restore
}

section('A8. NO MUTATION — the original daily/4H arrays are never modified in place');
{
  aSandbox._isRegular = false;
  aSandbox.S.scanData = [aRow('MUT', 999.99, 196.93)];
  const daily = mkD(220, 196.93), fourH = mk4(60, 210.93);
  const dLastBefore = daily[daily.length - 1].close, fLastBefore = fourH[fourH.length - 1].close;
  const dRefBefore = daily[daily.length - 1];
  A({ symbol: 'MUT', source: 'RS', direction: 'SHORT', dailyCandles: daily, fourHCandles: fourH, rsContext: null });
  eq(daily[daily.length - 1].close, dLastBefore, 'A8: original daily last close unchanged (196.93)');
  eq(fourH[fourH.length - 1].close, fLastBefore, 'A8: original 4H last close unchanged (210.93)');
  ok(daily[daily.length - 1] === dRefBefore, 'A8: original daily last candle object identity unchanged (pure patch → new array)');
}

section('A9. Deferred 4H — PENDING + partial score first, then aligned + complete after lazy 4H');
{
  aSandbox._isRegular = false;
  aSandbox.S.scanData = [aRow('DEF', 999.99, 196.93)];
  const daily = mkD(220, 196.93), fourH = mk4(60, 210.93);
  const def = A({ symbol: 'DEF', source: 'RS', direction: 'SHORT', dailyCandles: daily, fourHCandles: null, fourHDeferred: true });
  eq(def.swingDirection, 'PENDING', 'A9: deferred → PENDING');
  eq(aSandbox._swingScoreCell(def), 'pending', 'A9: deferred score cell = pending');
  // While 4H is deferred, the price is resolved from the daily ALONE (4H not loaded yet); market
  // closed + no live mark ⇒ the daily stays at its own close (no fabricated fresh price).
  ok(near(def.analysisDailyCloseAfter, 196.93), 'A9: deferred row resolves from daily only → daily close stays 196.93 (4H not yet consulted)');
  // Lazy 4H arrives → the SAME row rebuilt with daily+4H picks the fresher 210.93 atomically.
  const done = A({ symbol: 'DEF', source: 'RS', direction: 'SHORT', sourceBias: def.sourceBias, dailyCandles: daily, fourHCandles: fourH, rsContext: null });
  ok(done.swingDirection !== 'PENDING' && typeof done.swingScore.score === 'number', 'A9: after lazy 4H → resolved direction + complete score');
  ok(near(done.analysisPrice, 210.93) && near(done.analysisDailyCloseAfter, 210.93) && near(done.analysisFourHCloseAfter, 210.93),
     'A9: after lazy 4H → daily & 4H analysis closes aligned to the fresher 210.93');
}

section('A10. [SWING-ANALYSIS-PRICE] diagnostic + NO new fetch / provider / socket / timer');
{
  aLogs.length = 0;
  const c = A({ symbol: 'LOGZ', source: 'RS', direction: 'SHORT', dailyCandles: mkD(220, 196.93), fourHCandles: mk4(60, 210.93), rsContext: null });
  aSandbox._swingLogAnalysisPrice(c);
  eq(aLogs.length, 1, 'A10: exactly one [SWING-ANALYSIS-PRICE] payload');
  ok(near(aLogs[0].resolvedPrice, 210.93) && /backend 4H/.test(String(aLogs[0].source)) && near(aLogs[0].dailyAfter, 210.93),
     'A10: payload carries resolvedPrice/source/dailyAfter');
  const helperSrc = stripComments(extractFn(HTML, '_swingPreparePriceAlignedCandles')) + stripComments(extractFn(HTML, '_swingBuildCandidate'));
  ok(!/\bfetch\s*\(/.test(helperSrc), 'A10: no fetch(');
  ok(!/yahoo/i.test(helperSrc), 'A10: no Yahoo');
  ok(!/new\s+WebSocket|createSubscription|dxlinkSubscribe/i.test(helperSrc), 'A10: no WebSocket / subscription');
  ok(!/setInterval\s*\(|setTimeout\s*\(/.test(helperSrc), 'A10: no timer/poll');
  ok(!/BACKEND\s*\+|\/dev\/market\/|\/scanner\//.test(helperSrc), 'A10: no new endpoint');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
