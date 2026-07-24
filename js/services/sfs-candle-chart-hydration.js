// ─────────────────────────────────────────────────────────────────────────────
// SFS self-sufficient 1D chart hydration.
//
// The single function declaration below was extracted VERBATIM from the inline
// monolith in index.html (no behaviour change). It hydrates ONLY the selected
// symbol's 1D candles by delegating to _sfsEnsureTfCandles (the generic-timeframe
// ensure, in js/services/sfs-candle-generic-ensure.js): it warms nothing directly,
// opens no subscription, performs no direct transport, touches no DOM, owns no
// state, requests only the 1D timeframe and swallows every rejection — a
// fire-and-forget hydration that resolves undefined. The 4H detail loader
// (_sfsEnsureDetail4hCandles) and the READ-ONLY SPY benchmark resolver
// (_sfsSpyReadOnly) intentionally remain in the monolith. This file is a classic
// (non-module) script: it declares one function only and executes nothing at load
// time.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Self-sufficient 1D chart hydration ───────────────────────────────────────
// Make the SFS 1D chart independent of any prior DSS/RS/SFS scan: ensure backend 1D
// candles exist for the selected symbol, fetching the series (if missing) through
// the existing warmup + candle endpoints. 4H is hydrated separately/on-demand by
// _sfsEnsureDetail4hCandles so a cold 4H never delays the 1D render. SPY is resolved
// READ-ONLY by the RS panel. No new data source, no Yahoo.
async function _sfsEnsureChartData(symbol) {
  try {
    // Hydrate ONLY the selected symbol's 1D candles so the 1D chart can render
    // IMMEDIATELY (normally a no-network cache hit from the scan/snapshot). 4H is
    // NO LONGER ensured here: backend 4H is derived server-side from 30M candles on
    // demand and can lag the warmup response, so a cold 4H must not block or delay
    // the 1D render. 4H is loaded separately, in the background, by the bounded
    // _sfsEnsureDetail4hCandles (read → one controlled 30M warmup → bounded re-read).
    // SPY is deliberately NOT warmed/ensured here — proactive SPY warmups opened
    // DXLink Candle subscriptions and breached the feed limit ("Your subscription
    // size for event type 'Candle' is too big"), which even starved the SPY 1D
    // benchmark buffer and broke 1D RS too. The RS panel resolves SPY READ-ONLY (no
    // warmup, no new subscription — _sfsDrawRsPanel / _sfsSpyReadOnly).
    var tfs  = ['1D'];
    var tasks = [];
    tfs.forEach(function(tf) {
      tasks.push(_sfsEnsureTfCandles(symbol, tf).catch(function() { return null; }));
    });
    if (tasks.length) await Promise.all(tasks);
  } catch (e) { /* defensive: never throw out of chart hydration */ }
}
