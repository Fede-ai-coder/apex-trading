// ─────────────────────────────────────────────────────────────────────────────
// SFS (Squeeze Fire Scanner) — SCAN SERVICE
//
// PR 2 of the approved 3-PR SFS extraction (split D of audit #363: config/state ·
// scan service · UI panel). The 9 function declarations below were relocated
// BYTE-FOR-BYTE out of the inline monolith in index.html. Names, signatures,
// bodies, binding form (`function`), async form and relative physical order are
// unchanged; only their location changed. No behaviour changed.
//
// WHAT THIS FILE OWNS
//   The SFS scan pipeline and its non-DOM helpers:
//     • scan orchestration and lifecycle — _sfsRunScan (the only async member of
//       the family) and _sfsCancelScan,
//     • per-symbol/timeframe analysis and scoring — _sfsAnalyzeSymbolTimeframe,
//     • the result view pipeline the panel renders from — _sfsGetFilteredResults,
//       _sfsSortResults, _sfsResolveRenderPrice,
//     • the non-DOM candle/timing helpers the already-extracted sfs-candle-*
//       modules call — _sfsCandlesFromSyncSource, _sfsSleep,
//     • the non-DOM state inspector behind the debug exposure —
//       apexDebugSfsDetailChart.
//   Each of these functions has exactly ONE declaration site, and it is here.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   • No state. Every SFS binding it reads or writes is declared by
//     js/services/sfs-config-state.js (PR 1) — this file declares none of them
//     and creates no second owner.
//   • No DOM. Not one of the 9 reads or writes the document; _sfsRunScan drives
//     the panel only by CALLING _sfsRender / _sfsRenderProgress, which stay
//     inline for PR 3 and are resolved globally at call time.
//   • No transport. There is no fetch, XHR, WebSocket, EventSource or
//     AbortController here, and no endpoint literal. _sfsRunScan reaches the
//     network only through the existing owner:
//         _sfsRunScan → _sfsFetchBackendCandles (js/services/candle-dxlink-client.js)
//     That ownership is unchanged by this PR; no adapter was introduced.
//   • No load-time statements. The three SFS load-time STATEMENTS stay inline,
//     including `window.apexDebugSfsDetailChart = …`: this file DECLARES that
//     function, the monolith still performs the one-time window exposure. The
//     declaration and the exposure have different owners on purpose.
//
// CLASSIC SCRIPT, ZERO LOAD-TIME EFFECTS
//   No import/export/require, no module type, no wrapper, no IIFE, no namespace,
//   no `use strict` pragma: these stay plain global `function` declarations,
//   exactly as they were inside index.html. Loading this file only evaluates
//   those 9 declarations — it performs no call, no DOM access, no timer, no
//   listener, no fetch, no storage access and no window/globalThis assignment,
//   and reads no global. The free identifiers inside the function BODIES (S, WL,
//   the SFS_* constants, the indicator helpers, the panel renderers) are resolved
//   at CALL time, never at load.
//
// LOAD ORDER
//   Loaded as a classic, non-deferred, non-async script AFTER
//   js/services/sfs-config-state.js and BEFORE the inline monolith.
//   The monolith boundary is a REAL evaluation-time dependency, not a
//   convention: while the monolith itself is evaluating it runs
//       try { … window.apexDebugSfsDetailChart = apexDebugSfsDetailChart; } catch (e) {}
//   which READS a binding declared in this file. Loaded after the monolith (which
//   is also what `defer` produces) that read throws ReferenceError, the try/catch
//   swallows it, and the debug handle is silently never exposed.
//   Everything else is a CALL-time dependency: sfs-candle-spy-read.js and
//   sfs-candle-detail-4h.js call _sfsSleep / _sfsCandlesFromSyncSource, and the
//   inline panel calls the scan and result functions, all long after load.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Debug state inspector (declaration only; the window exposure stays inline) ─
function apexDebugSfsDetailChart(symbol) {
  var sel = S.squeezeFireScanner ? S.squeezeFireScanner.chartSymbol : null;
  symbol = symbol || sel;
  var cache = (S.squeezeFireScanner && S.squeezeFireScanner.chartCacheCandles) || {};
  var byTf  = (symbol && cache[symbol]) || {};
  var res   = _sfsDetail4hResult[symbol] || null;
  return {
    selectedSymbol: sel,
    has1d: _sfsCandlesUsable(byTf['1D']),
    has4h: _sfsCandlesUsable(byTf['4H']),
    backend4hReadStatus: res ? { ok: res.ok, status: res.status, count: res.count, reason: res.reason, source: res.source } : null,
    warmupAttempted: res ? res.warmupAttempted : false,
    warmupResponse: res ? res.warmupResponse : null,
    last4hError: res ? res.error : null,
    candleCounts: {
      '1D': (byTf['1D'] && byTf['1D'].length) || 0,
      '4H': (byTf['4H'] && byTf['4H'].length) || 0
    },
    phase: _sfsDetail4hPhase[symbol] || null,
    inFlightKeys: {
      detail4h: Object.keys(_sfsDetail4hInflight),
      tfFetch: Object.keys(_sfsTfFetchInflight)
    }
  };
}

// ─── Synchronous candle source — SFS cache, then the DXLink buffers ──────────
function _sfsCandlesFromSyncSource(sym, tf) {
  var cache = S.squeezeFireScanner.chartCacheCandles;
  var c = (cache[sym] && cache[sym][tf]) ? cache[sym][tf] : null;
  if (_sfsCandlesUsable(c)) return { candles: c, path: 'sfsCache' };

  var buf = (tf === '1D')
    ? (typeof _rsGetDailyCandles === 'function' ? _rsGetDailyCandles(sym) : null)
    : (typeof getFourHourCandles === 'function' ? getFourHourCandles(sym) : null);
  if (_sfsCandlesUsable(buf)) {
    if (!cache[sym]) cache[sym] = {};
    cache[sym][tf] = buf;
    return { candles: buf, path: 'dxlinkBuffer' };
  }
  return null;
}

// ─── Timing helper ───────────────────────────────────────────────────────────
function _sfsSleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, Math.max(0, ms || 0)); });
}

// ─── Analyze one symbol/timeframe — pure function, no side effects ───────────
function _sfsAnalyzeSymbolTimeframe(symbol, tf, candles) {
  var minBars = tf === '1D' ? SFS_MIN_BARS_1D : SFS_MIN_BARS_4H;
  if (!candles || candles.length < minBars) {
    return { skip: true, reason: 'insufficient_candles:' + (candles ? candles.length : 0) };
  }

  var closes = candles.map(function(c) { return c.close; });
  var rawC   = candles.map(function(c) { return { o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume, t: c.time }; });

  var sma20arr = smA(closes, 20);
  var sma30arr = smA(closes, 30);
  var rsiArr   = calcRSIWilder(closes);
  var bbData   = calcBB(closes);
  var kcData   = calcKC(rawC);
  var sqArr    = calcSqueeze(bbData, kcData);

  var n = candles.length - 1;
  var lastSqueeze  = sqArr[n];
  var lastSma20    = sma20arr[n];
  var lastSma30    = sma30arr[n];
  var lastRsi      = rsiArr[n];
  var lastBbUpper  = bbData.upper[n];
  var lastBbLower  = bbData.lower[n];
  var lastClose    = closes[n];

  if (lastSma20 == null || lastRsi == null || lastBbUpper == null || lastBbLower == null) {
    return { skip: true, reason: 'insufficient_indicator_data' };
  }
  if (lastSqueeze) {
    return { skip: true, reason: 'still_in_squeeze' };
  }

  // Was there a squeeze within the lookback window?
  var squeezeWasOnBarsAgo = -1;
  for (var lb = 1; lb <= SFS_FIRE_LOOKBACK; lb++) {
    if (n - lb >= 0 && sqArr[n - lb]) { squeezeWasOnBarsAgo = lb; break; }
  }
  if (squeezeWasOnBarsAgo < 0) {
    return { skip: true, reason: 'no_recent_squeeze' };
  }

  var bullish = lastClose > lastSma20 && lastRsi >= 55;
  var bearish = lastClose < lastSma20 && lastRsi <= 45;
  if (!bullish && !bearish) {
    return { skip: true, reason: 'direction_unclear' };
  }

  var direction   = bullish ? 'BULLISH' : 'BEARISH';
  var bbPosition  = lastClose > lastBbUpper ? 'aboveUpperBB' : (lastClose < lastBbLower ? 'belowLowerBB' : 'insideBands');
  var fireBarsAgo = squeezeWasOnBarsAgo;
  // fireType distinguishes fresh breakouts from post-squeeze continuation setups.
  // 'fire' = exited squeeze within SFS_RECENT_EXIT_BARS (fresh); 'continuation' = older exit still within SFS_FIRE_LOOKBACK.
  var fireType = fireBarsAgo <= SFS_RECENT_EXIT_BARS ? 'fire' : 'continuation';

  var reasons = [bullish ? 'bullish_fire' : 'bearish_fire'];
  if (fireType === 'continuation') reasons.push('post_squeeze_continuation');
  var pts = 0;

  if (bullish) {
    if (lastSma20 != null && lastSma30 != null && lastSma20 >= lastSma30) { pts++; reasons.push('sma20_gte_sma30'); }
    if (lastRsi >= 60)                                                     { pts++; reasons.push('rsi_gte_60');     }
    if (fireBarsAgo <= SFS_RECENT_EXIT_BARS)                               { pts++; reasons.push('recent_fire');   }
    if (bbPosition === 'aboveUpperBB')                                     { pts++; reasons.push('above_upper_bb');}
  } else {
    if (lastSma20 != null && lastSma30 != null && lastSma20 <= lastSma30) { pts++; reasons.push('sma20_lte_sma30'); }
    if (lastRsi <= 40)                                                     { pts++; reasons.push('rsi_lte_40');     }
    if (fireBarsAgo <= SFS_RECENT_EXIT_BARS)                               { pts++; reasons.push('recent_fire');   }
    if (bbPosition === 'belowLowerBB')                                     { pts++; reasons.push('below_lower_bb');}
  }

  return {
    skip: false,
    symbol: symbol,
    timeframe: tf,
    direction: direction,
    strength: pts >= 3 ? 'STRONG' : 'WEAK',
    fireType: fireType,
    fireBarsAgo: fireBarsAgo,
    latestClose: lastClose,
    rsi14: lastRsi,
    sma20: lastSma20,
    sma30: lastSma30,
    squeezeWasOnBarsAgo: squeezeWasOnBarsAgo,
    squeezeCurrent: false,
    bbPosition: bbPosition,
    bbUpper: lastBbUpper,
    bbLower: lastBbLower,
    score: Math.round((pts / 4) * 100),
    reasons: reasons,
    dataSource: 'BACKEND_DXLINK_CANDLES'
  };
}

// ─── Main scan orchestration — the family’s only async declaration ───────────
async function _sfsRunScan() {
  if (!ffSqueezeFireScanner()) return;
  var sfs = S.squeezeFireScanner;
  if (sfs.running) return;

  var tfs1d = sfs.filters.timeframes['1D'];
  var tfs4h = sfs.filters.timeframes['4H'];
  if (!tfs1d && !tfs4h) { showToast('Select at least one timeframe (1D or 4H).', 'warn'); return; }

  sfs.running = true;
  sfs.cancelled = false;
  sfs.results = [];
  sfs.lastRunAt = null;
  sfs.progress = { done: 0, total: 0 };
  sfs.chartCacheCandles = {};
  _sfsRender();

  var symbols = WL.map(function(w) { return w.t; });
  var timeframes = [];
  if (tfs1d) timeframes.push('1D');
  if (tfs4h) timeframes.push('4H');

  var warmupTfs = [];
  if (tfs1d) warmupTfs.push('1D');
  if (tfs4h) warmupTfs.push('30M'); // 4H is derived from 30M server-side

  sfs.progress.total = symbols.length * timeframes.length;
  _sfsRender();

  for (var batchStart = 0; batchStart < symbols.length; batchStart += SFS_BATCH_SIZE) {
    if (sfs.cancelled) break;
    var batch = symbols.slice(batchStart, batchStart + SFS_BATCH_SIZE);

    // Do not bulk-warm scan batches. PR #210 diagnostics showed the previous
    // 20-symbol ['1D','30M'] warmups were the remaining DXLink Candle pressure
    // source. The scan now reads the backend cache only; selected/open charts warm
    // their own missing symbol data through the capped _sfsWarmupBatch path.
    if (batchStart === 0) {
      _recordCandleSubscriptionRequest({ requester:'_sfsRunScan', reason:'squeeze_fire_scan', eventType:'Candle', timeframes:warmupTfs, symbols:[], action:'skipped', detail:'bulk_scan_warmup_disabled_cache_reads_only', context:{ batchSize:SFS_BATCH_SIZE } });
    }
    if (sfs.cancelled) break;

    var batchTasks = [];
    for (var bi = 0; bi < batch.length; bi++) {
      for (var ti = 0; ti < timeframes.length; ti++) {
        batchTasks.push({ symbol: batch[bi], tf: timeframes[ti] });
      }
    }

    for (var t = 0; t < batchTasks.length; t += SFS_MAX_CONCURRENT_READS) {
      if (sfs.cancelled) break;
      var chunk = batchTasks.slice(t, t + SFS_MAX_CONCURRENT_READS);
      var chunkResults = await Promise.all(chunk.map(function(task) {
        if (sfs.cancelled) return Promise.resolve(null);
        return _sfsFetchBackendCandles(task.symbol, task.tf).then(function(fetched) {
          sfs.progress.done++;
          _sfsRenderProgress();
          if (!fetched.ok) return null;
          if (!sfs.chartCacheCandles[task.symbol]) sfs.chartCacheCandles[task.symbol] = {};
          sfs.chartCacheCandles[task.symbol][task.tf] = fetched.candles;
          var analysis = _sfsAnalyzeSymbolTimeframe(task.symbol, task.tf, fetched.candles);
          return analysis.skip ? null : analysis;
        });
      }));
      chunkResults.forEach(function(r) { if (r) sfs.results.push(r); });
    }
  }

  sfs.running = false;
  sfs.lastRunAt = new Date();
  _sfsRender({ keepChart: !!sfs.chartSymbol });
}

// ─── Scan cancellation ───────────────────────────────────────────────────────
function _sfsCancelScan() {
  S.squeezeFireScanner.cancelled = true;
}

// ─── Result filtering ────────────────────────────────────────────────────────
function _sfsGetFilteredResults() {
  var sfs = S.squeezeFireScanner;
  var f = sfs.filters;
  return sfs.results.filter(function(r) {
    if (!f.timeframes[r.timeframe]) return false;
    if (f.strength !== 'both' && r.strength.toLowerCase() !== f.strength) return false;
    if (f.direction !== 'both' && r.direction.toLowerCase() !== f.direction.toLowerCase()) return false;
    if (f.search && f.search.trim()) {
      if (r.symbol.indexOf(f.search.trim().toUpperCase()) < 0) return false;
    }
    return true;
  });
}

// ─── Result sorting ──────────────────────────────────────────────────────────
function _sfsSortResults(results) {
  var col = _sfsSortCol, dir = _sfsSortDir === 'desc' ? -1 : 1;
  return results.slice().sort(function(a, b) {
    var av, bv;
    switch(col) {
      case 'symbol':    av = a.symbol;    bv = b.symbol;    return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      case 'timeframe': av = a.timeframe; bv = b.timeframe; return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      case 'direction': av = a.direction; bv = b.direction; return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      case 'strength':  av = a.strength;  bv = b.strength;  return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
      case 'fireBarsAgo': return ((a.fireBarsAgo||0) - (b.fireBarsAgo||0)) * dir;
      case 'rsi14':       return ((a.rsi14||0)       - (b.rsi14||0))       * dir;
      case 'score':       return ((a.score||0)        - (b.score||0))       * dir;
      default: return 0;
    }
  });
}

// ─── Render price resolution — pure read, never mutates the raw cache ────────
function _sfsResolveRenderPrice(symbol) {
  var r = (typeof resolveLatestDisplayPrice === 'function') ? resolveLatestDisplayPrice(symbol) : null;
  if (r && r.price != null) return r;
  var byTf = S.squeezeFireScanner.chartCacheCandles && S.squeezeFireScanner.chartCacheCandles[symbol];
  var tfs  = ['1D', '4H'];
  for (var i = 0; i < tfs.length; i++) {
    var arr = byTf && byTf[tfs[i]];
    if (arr && arr.length) {
      var px = parseFloat(arr[arr.length - 1].close);
      if (isFinite(px) && px > 0) return { price: px, source: 'sfsCache:' + tfs[i] };
    }
  }
  return { price: null, source: null };
}
