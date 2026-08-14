// ─────────────────────────────────────────────────────────────────────────────
// SFS (Squeeze Fire Scanner) — UI PANEL
//
// PR 3 of the approved 3-PR SFS extraction (split D of audit #363: config/state ·
// scan service · UI panel), and the one that completes it. The 20 function
// declarations below were relocated BYTE-FOR-BYTE out of the inline monolith in
// index.html. Names, signatures, bodies, binding form (`function`), sync form and
// relative physical order are unchanged; only their location changed. No
// behaviour changed.
//
// WHAT THIS FILE OWNS
//   Everything in the SFS family that reads or writes the DOM, every interaction
//   handler that mutates view state and re-renders, and the helpers whose only
//   product is display output:
//     • one-time panel/tab/chart DOM injection — _sfsInit,
//     • the 4H detail state surface — _sfs4hDetailMessage,
//       _sfsRender4hDetailState,
//     • the RS-vs-SPY panel — _sfsRsPanelMsg, _sfsDrawRsPanel,
//     • scan progress and panel state — _sfsRenderProgress, _sfsActivePanelTab,
//       _sfsRender,
//     • the filter / timeframe / sort / overlay controls — _sfsTfToggle,
//       _sfsSetFilter, _sfsSortBy, _sfsToggleOverlay,
//     • the inline-chart lifecycle — _sfsToggleChart, _sfsOpenChart,
//       _sfsCloseChart, _sfsDrawCharts, _sfsDrawOneTf,
//     • keyboard navigation and its selection visuals —
//       _sfsUpdateSelectionVisual, _sfsOpenSelectedChart, _sfsInstallKeyboardNav.
//   Each of these functions has exactly ONE declaration site, and it is here.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   • No state. Every SFS binding these bodies read or write is declared by
//     js/services/sfs-config-state.js (PR 1) — this file declares none of them
//     and creates no second owner. _sfsSortBy writes _sfsSortCol/_sfsSortDir,
//     _sfsRender writes _sfsCandidateList, _sfsOpenChart writes
//     _sfsDetail4hPhase and _sfsInstallKeyboardNav writes
//     _sfsFocused/_sfsKbInstalled — all of them assignments to bindings someone
//     else declares.
//   • No scan/service logic. _sfsRender calls _sfsGetFilteredResults and
//     _sfsSortResults, _sfsDrawCharts calls _sfsResolveRenderPrice and
//     _sfsDrawRsPanel calls _sfsCandlesFromSyncSource — all declared by
//     js/services/sfs-scan-service.js (PR 2) and resolved globally at call time.
//   • No candle acquisition. _sfsOpenChart calls _sfsEnsureChartData /
//     _sfsEnsureDetail4hCandles and _sfsDrawRsPanel calls _sfsSpyReadOnly /
//     _sfsSpyDiag / _sfsCandlesUsable; every one of those is owned by the six
//     already-extracted sfs-candle-* modules and none is re-declared here.
//   • No transport. There is no fetch, XHR, WebSocket, EventSource or
//     AbortController here, and no endpoint literal. The panel reaches data only
//     by calling the owners above.
//   • No load-time statements. The three SFS load-time STATEMENTS stay inline in
//     the monolith and are absent from this file:
//         S.squeezeFireScanner = { … }   `S` is a monolith-scoped const, so no
//                                        earlier script can see it;
//         window.apexDebugSfsDetailChart = …   a load-time window assignment;
//         window.addEventListener('resize', …) a load-time listener whose timer
//                                        handle (_sfsResizeTimer) is owned by
//                                        sfs-config-state.js.
//
// CLASSIC SCRIPT, ZERO LOAD-TIME EFFECTS
//   No import/export/require, no module type, no wrapper, no IIFE, no namespace,
//   no `use strict` pragma: these stay plain global `function` declarations,
//   exactly as they were inside index.html. Loading this file only evaluates
//   those 20 declarations — it performs no call, no DOM read or write, no timer,
//   no listener, no fetch, no storage access and no window/globalThis
//   assignment. Every DOM operation, every addEventListener and every setTimeout
//   in this file lives INSIDE a function body and runs only when that function is
//   called. The free identifiers in those bodies (S, the SFS_* constants, the
//   scan-service and candle-module helpers, the sibling renderers) are resolved
//   at CALL time, never at load.
//
// LOAD ORDER
//   Loaded as a classic, non-deferred, non-async script AFTER
//   js/services/sfs-config-state.js, js/services/sfs-scan-service.js and the six
//   js/services/sfs-candle-*.js modules whose functions these bodies call, and
//   BEFORE the inline monolith.
//   Unlike PR 2, this boundary is a CALL-time dependency, not an evaluation-time
//   one, and this file does not pretend otherwise: nothing in the monolith reads
//   one of these 20 names while the monolith is still evaluating. The two places
//   the monolith names them are both deferred callbacks it merely REGISTERS at
//   load — the launch click handler (which calls _sfsInit) and the resize
//   listener (which calls _sfsDrawCharts). What must hold is that this file is
//   evaluated before either callback can fire; loading it here, with the rest of
//   the SFS family and ahead of the monolith that registers them, guarantees that
//   without depending on event timing.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Tab + chart-detail DOM injection (called once at app launch) ───────────
function _sfsInit() {
  if (!ffSqueezeFireScanner()) return;
  var tabRow = document.getElementById('panelTabRow');
  if (tabRow && !document.getElementById('ptab-sfs')) {
    var btn = document.createElement('button');
    btn.id = 'ptab-sfs';
    btn.className = 'ptab';
    btn.style.cssText = 'color:#7c6fff;border-color:rgba(124,111,255,.35)';
    btn.innerHTML = '&#x2B21; SQUEEZE FIRE';
    btn.onclick = function(){ switchPanelTab('sfs'); };
    tabRow.appendChild(btn);
  }
  var rsWrap = document.getElementById('rsDetailWrap');
  if (rsWrap && !document.getElementById('sfsDetailWrap')) {
    var sfsWrap = document.createElement('div');
    sfsWrap.id = 'sfsDetailWrap';
    sfsWrap.className = 'rs-detail-wrap';
    sfsWrap.style.display = 'none';
    sfsWrap.innerHTML =
      '<div class="dss-detail-hdr">' +
        '<div>' +
          '<div style="font-size:15px;font-weight:800" id="sfs-detail-sym"></div>' +
          '<div style="font-size:9px;color:var(--tx2)" id="sfs-detail-name"></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-left:14px">' +
          '<label class="dss-toggle"><input type="checkbox" id="sfs-sma8" checked onchange="_sfsToggleOverlay()"> SMA8</label>' +
        '</div>' +
        '<button onclick="_sfsCloseChart()" style="margin-left:auto;font-size:8px;font-family:var(--M);color:var(--tx3);background:transparent;border:1px solid var(--b0);border-radius:5px;padding:4px 10px;cursor:pointer">&#x2715; CLOSE</button>' +
      '</div>' +
      '<div style="padding:12px 16px">' +
        '<div class="rs-chart-grid">' +
          '<div class="rs-chart-col">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
              '<div class="dss-chart-col-title" id="sfs-label-1d">1D</div>' +
              '<span id="sfs-sqzlbl-1d" style="font-family:var(--M);font-size:8px;color:var(--tx3)">—</span>' +
            '</div>' +
            '<div id="sfs-sqzbar-1d" style="height:3px;border-radius:2px;background:#3a3a4a;margin-bottom:8px"></div>' +
            '<div class="dss-big-canvas-wrap" id="sfs-big-wrap-1d"><div class="dss-no-data">Loading…</div></div>' +
            '<div id="sfs-rsi-1d" style="width:100%;height:56px;margin-top:4px"></div>' +
            '<div id="sfs-rs-1d" style="width:100%;height:48px;margin-top:4px"></div>' +
          '</div>' +
          '<div class="rs-chart-col">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
              '<div class="dss-chart-col-title" id="sfs-label-4h">4H</div>' +
              '<span id="sfs-sqzlbl-4h" style="font-family:var(--M);font-size:8px;color:var(--tx3)">—</span>' +
            '</div>' +
            '<div id="sfs-sqzbar-4h" style="height:3px;border-radius:2px;background:#3a3a4a;margin-bottom:8px"></div>' +
            '<div class="dss-big-canvas-wrap" id="sfs-big-wrap-4h"><div class="dss-no-data">Loading…</div></div>' +
            '<div id="sfs-rsi-4h" style="width:100%;height:56px;margin-top:4px"></div>' +
            '<div id="sfs-rs-4h" style="width:100%;height:48px;margin-top:4px"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
    rsWrap.parentNode.insertBefore(sfsWrap, rsWrap.nextSibling);
  }
  _sfsInstallKeyboardNav();
}

// ─── Precise 4H detail-panel copy for the “no candles yet” state ────────────
function _sfs4hDetailMessage(symbol) {
  var phase = _sfsDetail4hPhase[symbol];
  if (phase === 'loading') return { msg: 'Loading 4H…', label: '4H — loading' };
  if (phase === 'warming') return { msg: 'Warming 4H (deriving from backend 30M candles)…<br>This can take a few seconds.', label: '4H — warming pending' };
  var res = _sfsDetail4hResult[symbol];
  var reason = res && res.reason;
  switch (reason) {
    case 'SUBSCRIPTION_LIMIT_BACKOFF':
      return { msg: 'DXLink Candle subscription cap/backoff active.<br>4H will warm when capacity frees up.', label: '4H — subscription cap' };
    case 'INSUFFICIENT_30M_CANDLES':
      return { msg: 'Insufficient 30M candles to build 4H yet.<br>Backend is still backfilling history.', label: '4H — insufficient 30M' };
    case 'NO_CACHE':
      return { msg: 'Backend 4H cache not ready for ' + symbol + '.<br>Try again shortly.', label: '4H — cache not ready' };
    case 'ENDPOINT_UNAVAILABLE':
      return { msg: '4H backend endpoint unavailable.', label: '4H — endpoint unavailable' };
    case 'FETCH_ERROR':
      return { msg: 'Could not reach the backend candle cache for ' + symbol + ' 4H.<br>Check the connection and reopen.', label: '4H — fetch error' };
    case 'CANDLES_NOT_READY':
      return { msg: '4H warming pending — backend cache not ready yet.<br>Try again in a moment.', label: '4H — warming pending' };
    default:
      return { msg: '4H warming pending — data not ready yet.', label: '4H — warming pending' };
  }
}

// ─── Render the 4H pending/unavailable state into the detail panel ──────────
function _sfsRender4hDetailState(symbol) {
  if (!S.squeezeFireScanner || S.squeezeFireScanner.chartSymbol !== symbol) return;
  var wrap = document.getElementById('sfs-big-wrap-4h');
  if (!wrap) return;
  if (wrap.querySelector && wrap.querySelector('canvas')) return;  // a chart is already drawn — leave it
  var st = _sfs4hDetailMessage(symbol);
  wrap.innerHTML = '<div class="dss-no-data">' + st.msg + '</div>';
  var lbl = document.getElementById('sfs-sqzlbl-4h');
  if (lbl) { lbl.textContent = st.label; lbl.style.color = 'var(--tx3)'; }
}

// ─── Concise non-data state for an RS panel ─────────────────────────────────
function _sfsRsPanelMsg(rsId, msg) {
  var w = document.getElementById(rsId);
  if (w) w.innerHTML = '<div style="display:flex;align-items:center;height:100%;padding-left:10px;font-size:9px;font-family:var(--M);color:var(--tx3)">' + msg + '</div>';
}

// ─── Draw the RS-vs-SPY panel for one symbol/timeframe ──────────────────────
function _sfsDrawRsPanel(symbol, tf, rsId, candles, viewLen) {
  var symN = (candles && candles.length) ? candles.length : 0;

  // Symbol's own (patched) series too short for RS — precise neutral placeholder.
  if (!_sfsCandlesUsable(candles)) {
    _sfsRsPanelMsg(rsId, 'RS: symbol ' + tf + ' not loaded');
    debugWarn('sfs', '[SFS RS] tf=' + tf + ' symbol=' + symbol + ' symN=' + symN + ' reason=SYMBOL_SHORT');
    return;
  }

  // Draw RS from a resolved SPY series (patched to its live mark, best-effort).
  // Guards the rolling-20 overlap so a too-short overlap reports a precise reason
  // instead of an empty/blank panel.
  function _drawWithSpy(spyRaw, pathLabel) {
    var spy = _patchLivePrice(spyRaw, 'SPY');
    if (Math.min(candles.length, spy.length) <= 20) {
      _sfsRsPanelMsg(rsId, 'RS: insufficient ' + tf + ' overlap');
      _sfsSpyDiag(tf, 'skipped', 'insufficient_overlap', { symbol:symbol, symN:symN, spyN:spy.length, path:pathLabel });
      debugWarn('sfs', '[SFS RS] tf=' + tf + ' symbol=' + symbol + ' symN=' + symN +
        ' spyN=' + spy.length + ' reason=INSUFFICIENT_OVERLAP');
      return;
    }
    _pfDrawRsPanel(rsId, candles, spy, viewLen);
    _sfsSpyDiag(tf, 'rs_drawn', 'sfs_rs_panel_drawn', { symbol:symbol, symN:symN, spyN:spy.length, path:pathLabel });
    debugLog('sfs', '[SFS RS] tf=' + tf + ' symbol=' + symbol + ' symN=' + symN +
      ' spyN=' + spy.length + ' path=' + pathLabel + ' status=OK');
  }

  // 1) Instant: already-available SPY (SFS cache or live DXLink buffer).
  var sync = _sfsCandlesFromSyncSource('SPY', tf);
  if (sync) { _drawWithSpy(sync.candles, sync.path); return; }

  // 2) Best-effort: precise 'not loaded' now, then upgrade to RS IF a deduped
  //    backend cache read or tiny single-symbol SPY warmup succeeds. Guarded
  //    against keyboard-nav changes.
  _sfsRsPanelMsg(rsId, 'RS: SPY ' + tf + ' not loaded');
  debugWarn('sfs', '[SFS RS] tf=' + tf + ' symbol=' + symbol + ' symN=' + symN +
    ' spyN=0 reason=SPY_NOT_LOADED (safe single-symbol backend warmup eligible)');
  _sfsSpyReadOnly(tf).then(function(spyArr) {
    if (S.squeezeFireScanner.chartSymbol !== symbol) {
      _sfsSpyDiag(tf, 'skipped', 'redraw_blocked_chart_symbol_changed', { requestedSymbol:symbol, currentSymbol:S.squeezeFireScanner.chartSymbol || null });
      return;
    }
    if (_sfsCandlesUsable(spyArr)) _drawWithSpy(spyArr, 'backendRead');
    else _sfsSpyDiag(tf, 'skipped', 'rs_panel_left_not_loaded_after_spy_flow', { symbol:symbol });
  }).catch(function(e) { _sfsSpyDiag(tf, 'skipped', 'rs_panel_spy_flow_exception', { symbol:symbol, error:(e && e.message) || String(e) }); });
}

// ─── Render progress text only ──────────────────────────────────────────────
function _sfsRenderProgress() {
  var el = document.getElementById('sfs-progress');
  if (!el) return;
  var p = S.squeezeFireScanner.progress;
  if (p) el.textContent = 'Scanning ' + p.done + '/' + p.total + '…';
}

// ─── Mark SFS tab active (clears all other tab highlights) ──────────────────
function _sfsActivePanelTab() {
  ['live', 'scanner', 'rs', 'sfs'].forEach(function(t) {
    var el = document.getElementById('ptab-' + t);
    if (el) el.className = 'ptab' + (t === 'sfs' ? ' active' : '');
  });
}

// ─── Filter helpers — timeframe toggle ──────────────────────────────────────
function _sfsTfToggle(tf) {
  S.squeezeFireScanner.filters.timeframes[tf] = !S.squeezeFireScanner.filters.timeframes[tf];
  _sfsRender({ keepChart: true });
}

// ─── Filter helpers — filter assignment ─────────────────────────────────────
function _sfsSetFilter(key, val) {
  S.squeezeFireScanner.filters[key] = val;
  _sfsRender({ keepChart: true });
}

// ─── Sort state ─────────────────────────────────────────────────────────────
function _sfsSortBy(col) {
  if (_sfsSortCol === col) { _sfsSortDir = _sfsSortDir === 'desc' ? 'asc' : 'desc'; }
  else { _sfsSortCol = col; _sfsSortDir = 'desc'; }
  _sfsRender({ keepChart: true });
}

// ─── Main render ────────────────────────────────────────────────────────────
function _sfsRender(opts) {
  if (!ffSqueezeFireScanner()) return;
  opts = opts || {};
  _sfsActivePanelTab();
  S.squeezeFireScanner.active = true;

  var sfs = S.squeezeFireScanner;
  var f   = sfs.filters;

  function tfBtn(tf, label) {
    var on = f.timeframes[tf];
    return '<button onclick="_sfsTfToggle(\'' + tf + '\')" style="font-size:8px;font-family:var(--M);padding:2px 7px;border-radius:4px;cursor:pointer;' +
      'border:1px solid ' + (on ? 'var(--pu)' : 'var(--b1)') +
      ';background:' + (on ? 'rgba(124,111,255,.15)' : 'transparent') +
      ';color:' + (on ? 'var(--pu)' : 'var(--tx3)') + '">' + label + '</button>';
  }
  function filterBtn(key, val, label, ac) {
    var on = sfs.filters[key] === val;
    return '<button onclick="_sfsSetFilter(\'' + key + '\',\'' + val + '\')" style="font-size:8px;font-family:var(--M);padding:2px 7px;border-radius:4px;cursor:pointer;' +
      'border:1px solid ' + (on ? (ac || 'var(--pu)') : 'var(--b1)') +
      ';background:' + (on ? 'rgba(124,111,255,.12)' : 'transparent') +
      ';color:' + (on ? (ac || 'var(--pu)') : 'var(--tx3)') + '">' + label + '</button>';
  }

  var controlsHtml =
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:5px;align-items:center">' +
      '<span style="font-size:8px;font-family:var(--M);color:var(--tx3)">TF</span>' +
      tfBtn('1D', '1D') + tfBtn('4H', '4H') +
      '<span style="color:var(--b1)">|</span>' +
      filterBtn('strength',  'both',    'ALL STR', 'var(--tx2)') +
      filterBtn('strength',  'strong',  'STRONG',  'var(--gr)')  +
      filterBtn('strength',  'weak',    'WEAK',    'var(--am)')  +
      '<span style="color:var(--b1)">|</span>' +
      filterBtn('direction', 'both',    'ALL DIR', 'var(--tx2)') +
      filterBtn('direction', 'bullish', '▲ BULL', 'var(--gr)') +
      filterBtn('direction', 'bearish', '▼ BEAR', 'var(--rd)') +
    '</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center">' +
      '<input id="sfs-search" type="text" placeholder="Symbol…" value="' + (f.search || '') + '" ' +
        'oninput="S.squeezeFireScanner.filters.search=this.value;_sfsRender({keepChart:true})" ' +
        'style="font-family:var(--M);font-size:8px;padding:2px 6px;background:var(--bg3);border:1px solid var(--b1);border-radius:4px;color:var(--tx);width:90px">' +
      (sfs.running
        ? '<button onclick="_sfsCancelScan()" style="font-size:8px;font-family:var(--M);padding:2px 10px;border-radius:4px;cursor:pointer;border:1px solid var(--rd);background:rgba(232,68,90,.1);color:var(--rd)">&#x25A0; STOP</button>'
        : '<button onclick="_sfsRunScan()" style="font-size:8px;font-family:var(--M);padding:2px 10px;border-radius:4px;cursor:pointer;border:1px solid var(--gr);background:rgba(0,212,138,.1);color:var(--gr)">&#x25BA; SCAN</button>') +
      (sfs.lastRunAt ? '<span style="font-size:8px;font-family:var(--M);color:var(--tx3)">Last: ' + sfs.lastRunAt.toLocaleTimeString() + '</span>' : '') +
    '</div>';

  var bodyHtml;
  if (sfs.running) {
    // No selectable rows while scanning — drop keyboard-nav state.
    _sfsCandidateList = [];
    sfs.selectedIndex = -1;
    var p = sfs.progress;
    bodyHtml = '<div id="sfs-progress" style="font-family:var(--M);font-size:9px;color:var(--tx2);padding:12px 0">' +
      (p ? 'Scanning ' + p.done + '/' + p.total + '…' : 'Starting scan…') + '</div>';
  } else {
    var filtered = _sfsGetFilteredResults();
    var sorted   = _sfsSortResults(filtered);
    // Visible (filtered+sorted) list backing keyboard navigation. Clamp the
    // selection so it stays aligned with the rows actually on screen.
    _sfsCandidateList = sorted;
    if (sfs.selectedIndex >= sorted.length) sfs.selectedIndex = sorted.length - 1;
    if (sfs.selectedIndex < 0) sfs.selectedIndex = -1;
    if (!sfs.lastRunAt) {
      bodyHtml = '<div style="font-family:var(--M);font-size:9px;color:var(--tx3);padding:12px 0">Click SCAN to find post-squeeze breakouts.</div>';
    } else if (!sorted.length) {
      bodyHtml = '<div style="font-family:var(--M);font-size:9px;color:var(--tx3);padding:12px 0">No results match filters. Try 1D+4H or relax strength/direction.</div>';
    } else {
      function sortInd(col) { return _sfsSortCol === col ? (_sfsSortDir === 'desc' ? ' ▾' : ' ▴') : ''; }
      function thS(col, lbl) { return '<th onclick="_sfsSortBy(\'' + col + '\')" style="cursor:pointer;white-space:nowrap">' + lbl + sortInd(col) + '</th>'; }
      var rows = sorted.map(function(r, i) {
        var dirColor  = r.direction === 'BULLISH' ? 'var(--gr)' : 'var(--rd)';
        var strColor  = r.strength  === 'STRONG'  ? 'var(--gr)' : 'var(--am)';
        var ftColor   = r.fireType  === 'fire'    ? 'var(--gr)' : 'var(--tx3)';
        var ftLabel   = r.fireType  === 'fire'    ? '⚡ FIRE'   : '~ CONT';
        var isOpen    = sfs.chartSymbol === r.symbol;
        var isSel     = sfs.selectedIndex === i;
        return '<tr data-sfs-idx="' + i + '"' + (isSel ? ' class="sfs-selected"' : '') +
          ' onclick="_sfsToggleChart(\'' + r.symbol + '\',' + i + ')" style="cursor:pointer' +
          (isOpen ? ';background:rgba(124,111,255,.08)' : '') + '">' +
          '<td style="font-weight:700">' + r.symbol + '</td>' +
          '<td><span style="font-size:7px;font-family:var(--M);border:1px solid var(--b1);border-radius:3px;padding:1px 4px;color:var(--tx2)">' + r.timeframe + '</span></td>' +
          '<td><span style="color:' + dirColor + ';font-size:8px;font-family:var(--M)">' + (r.direction === 'BULLISH' ? '▲' : '▼') + ' ' + r.direction + '</span></td>' +
          '<td><span style="color:' + strColor + ';font-size:8px;font-family:var(--M)">' + r.strength + '</span></td>' +
          '<td><span style="font-size:7px;font-family:var(--M);color:' + ftColor + '">' + ftLabel + '</span></td>' +
          '<td style="font-family:var(--M);font-size:9px;text-align:center">' + r.fireBarsAgo + '</td>' +
          '<td style="font-family:var(--M);font-size:9px;text-align:right">' + (r.rsi14 != null ? r.rsi14.toFixed(1) : '—') + '</td>' +
          '<td style="font-family:var(--M);font-size:9px;text-align:right">' + (r.score || 0) + '</td>' +
          '<td><button onclick="event.stopPropagation();_sfsToggleChart(\'' + r.symbol + '\',' + i + ')" ' +
            'style="font-size:7px;font-family:var(--M);padding:1px 5px;border-radius:3px;cursor:pointer;border:1px solid var(--b1);background:transparent;color:var(--tx3)">CHART</button></td>' +
        '</tr>';
      }).join('');
      bodyHtml =
        '<div class="dss-tbl-scroll">' +
        '<table class="dss-tbl"><thead><tr>' +
          thS('symbol',     'SYMBOL') +
          thS('timeframe',  'TF') +
          thS('direction',  'DIR') +
          thS('strength',   'STRENGTH') +
          '<th>TYPE</th>' +
          thS('fireBarsAgo','AGO') +
          thS('rsi14',      'RSI') +
          thS('score',      'SCORE') +
          '<th></th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }
  }

  document.getElementById('panelContent').innerHTML = '<div id="sfs-scan-root" style="padding:8px">' + controlsHtml + bodyHtml + '</div>';
  document.getElementById('panelHeader').textContent = 'SQUEEZE FIRE SCANNER';

  if (opts.keepChart && sfs.chartSymbol) {
    _sfsOpenChart(sfs.chartSymbol);
  }
}

// ─── Inline-chart overlay toggle (SMA8) ─────────────────────────────────────
function _sfsToggleOverlay() {
  var cb = document.getElementById('sfs-sma8');
  S.squeezeFireScanner.chartOverlay.sma8 = !!(cb && cb.checked);
  if (S.squeezeFireScanner.chartSymbol) _sfsDrawCharts(S.squeezeFireScanner.chartSymbol);
}

// ─── Chart open / close / toggle ────────────────────────────────────────────
function _sfsToggleChart(symbol, idx) {
  var sfs = S.squeezeFireScanner;
  // Keep keyboard selection aligned with a mouse click on a row.
  if (typeof idx === 'number' && idx >= 0) sfs.selectedIndex = idx;
  if (sfs.chartSymbol === symbol) { _sfsCloseChart(); }
  else { sfs.chartSymbol = symbol; _sfsRender({ keepChart: true }); }
}

// ─── Chart open ─────────────────────────────────────────────────────────────
function _sfsOpenChart(symbol) {
  var wrap = document.getElementById('sfsDetailWrap');
  if (!wrap) return;
  var symEl  = document.getElementById('sfs-detail-sym');
  var nameEl = document.getElementById('sfs-detail-name');
  if (symEl) symEl.textContent = symbol;
  if (nameEl) {
    var wlEntry = WL.find(function(w) { return w.t === symbol; });
    nameEl.textContent = wlEntry ? wlEntry.n : '';
  }
  var lbl1d = document.getElementById('sfs-label-1d');
  var lbl4h = document.getElementById('sfs-label-4h');
  if (lbl1d) lbl1d.textContent = symbol + ' · 1D';
  if (lbl4h) lbl4h.textContent = symbol + ' · 4H';
  var sma8cb = document.getElementById('sfs-sma8');
  if (sma8cb) sma8cb.checked = !!S.squeezeFireScanner.chartOverlay.sma8;
  wrap.style.display = 'block';
  // 1D renders IMMEDIATELY (normally a no-network cache hit from the scan/snapshot)
  // — it never waits on the 4H warmup. The chartSymbol guards ensure a slow hydrate
  // can't draw a stale chart after keyboard nav moved to another symbol.
  _sfsEnsureChartData(symbol).then(function() {
    if (S.squeezeFireScanner.chartSymbol !== symbol) return;
    setTimeout(function() {
      if (S.squeezeFireScanner.chartSymbol === symbol) _sfsDrawCharts(symbol);
    }, 60);
  });
  // 4H loads on demand in the BACKGROUND via a bounded backend warmup + read. Show a
  // precise pending state now (never "Run scan first"); the loader updates ONLY the
  // 4H panel when it resolves — selected symbol, the 1D chart, filters and the result
  // table are all preserved. Deduped per symbol, so repeated CHART clicks / arrow
  // browsing reuse the same in-flight request instead of stacking warmups.
  _sfsDetail4hPhase[symbol] = 'loading';   // first 4H paint shows "Loading 4H…", not a stale reason
  _sfsRender4hDetailState(symbol);
  _sfsEnsureDetail4hCandles(symbol).then(function(res) {
    if (S.squeezeFireScanner.chartSymbol !== symbol) return;   // navigated away — no stale render
    if (res && res.ok) _sfsDrawCharts(symbol);                  // 4H now cached → draw both consistently
    else _sfsRender4hDetailState(symbol);                       // precise reason in the 4H panel only
  });
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Chart close ────────────────────────────────────────────────────────────
function _sfsCloseChart() {
  S.squeezeFireScanner.chartSymbol = null;
  var wrap = document.getElementById('sfsDetailWrap');
  if (wrap) wrap.style.display = 'none';
}

// ─── Move the .sfs-selected highlight without a full re-render ──────────────
function _sfsUpdateSelectionVisual(scroll) {
  var sfs = S.squeezeFireScanner;
  var pc  = document.getElementById('panelContent');
  if (!pc) return;
  var prev = pc.querySelector('tr.sfs-selected');
  if (prev) prev.classList.remove('sfs-selected');
  if (sfs.selectedIndex < 0) return;
  var row = pc.querySelector('tr[data-sfs-idx="' + sfs.selectedIndex + '"]');
  if (row) {
    row.classList.add('sfs-selected');
    if (scroll) row.scrollIntoView({ block: 'nearest' });
  }
}

// ─── Open/update the inline chart for the selected row ──────────────────────
function _sfsOpenSelectedChart(idx) {
  var sfs  = S.squeezeFireScanner;
  var list = _sfsCandidateList;
  if (!list || idx < 0 || idx >= list.length || !list[idx]) return;
  var sym = list[idx].symbol;
  sfs.selectedIndex = idx;
  if (sfs.chartSymbol === sym) {
    // Symbol already open — just move the row highlight (no rebuild/redraw).
    _sfsUpdateSelectionVisual(true);
    return;
  }
  sfs.chartSymbol = sym;
  // Re-render so the row highlight + open-row tint stay consistent, preserving
  // the list scroll position across the rebuild, then open/draw the chart and
  // bring the selected row into view.
  var oldScroll = document.querySelector('#sfs-scan-root .dss-tbl-scroll');
  var savedTop  = oldScroll ? oldScroll.scrollTop : 0;
  _sfsRender({ keepChart: true });
  var newScroll = document.querySelector('#sfs-scan-root .dss-tbl-scroll');
  if (newScroll) newScroll.scrollTop = savedTop;
  _sfsUpdateSelectionVisual(true);
}

// ─── Keyboard navigation for the Squeeze Fire result list ───────────────────
function _sfsInstallKeyboardNav() {
  if (_sfsKbInstalled) return;
  _sfsKbInstalled = true;
  // Track whether the last pointer interaction was inside the Squeeze Fire
  // results container or its inline chart detail — arrow nav only activates
  // afterwards. Scoped to SFS-specific elements (not the shared .panel) so a
  // click in any other panel can never enable SFS keyboard navigation.
  document.addEventListener('mousedown', function(e) {
    var root   = document.getElementById('sfs-scan-root');
    var detail = document.getElementById('sfsDetailWrap');
    _sfsFocused = !!((root && root.contains(e.target)) ||
                     (detail && detail.contains(e.target)));
  }, true);

  document.addEventListener('keydown', function(e) {
    var sfs = S.squeezeFireScanner;
    if (!sfs || !sfs.active || !_sfsFocused) return;
    // Never interfere with typing (symbol search) or with a focused control
    // (SCAN button, filter buttons, etc.) — only act from the list/body context.
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable ||
              t.tagName === 'BUTTON' || t.tagName === 'SELECT' || t.tagName === 'A')) return;
    var list = _sfsCandidateList;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!list || !list.length) return;
      e.preventDefault();
      var cur = sfs.selectedIndex < 0 ? (e.key === 'ArrowDown' ? -1 : 0) : sfs.selectedIndex;
      var next = e.key === 'ArrowDown'
        ? Math.min(cur + 1, list.length - 1)
        : Math.max(cur - 1, 0);
      // Auto-open/update the chart for the newly selected row (no Enter needed).
      _sfsOpenSelectedChart(next);
    } else if (e.key === 'Enter') {
      if (sfs.selectedIndex >= 0 && list && list[sfs.selectedIndex]) {
        e.preventDefault();
        _sfsToggleChart(list[sfs.selectedIndex].symbol, sfs.selectedIndex);
      }
    } else if (e.key === 'Escape') {
      if (sfs.chartSymbol) { e.preventDefault(); _sfsCloseChart(); }
    }
  });
}

// ─── Draw both timeframe charts ─────────────────────────────────────────────
function _sfsDrawCharts(symbol) {
  // ── Resolve ONE current price for BOTH timeframes (1D/4H parity) ────────────
  // Same resolver/patch the Directional Scanner uses (PR #207): resolve the latest
  // APEX price once per render cycle (DXLink mark in-session, else last RTH daily
  // close — never Yahoo/AH/PM), then patch each timeframe's final candle with this
  // identical value so 1D and 4H can never disagree. _sfsResolveRenderPrice adds an
  // SFS-cache fallback so the price is non-null even when scanData has no row for
  // this symbol (the cause of the residual 1D/4H label mismatch). Both timeframes
  // are drawn in this single synchronous call (after _sfsEnsureChartData), so there
  // is no late poll path that could re-resolve a divergent price.
  var live = _sfsResolveRenderPrice(symbol);
  debugLog('sfs', '[SFS-CHART-LIVE-PATCH] ' + symbol + ' price=' +
    (live.price != null ? live.price.toFixed(2) : 'n/a') +
    ' appliedTo=1D,4H source=' + (live.source || 'none'));
  _sfsDrawOneTf(symbol, '1D', 'sfs-big-wrap-1d', 'sfs-rsi-1d', 'sfs-rs-1d', 'sfs-sqzbar-1d', 'sfs-sqzlbl-1d', live.price);
  _sfsDrawOneTf(symbol, '4H', 'sfs-big-wrap-4h', 'sfs-rsi-4h', 'sfs-rs-4h', 'sfs-sqzbar-4h', 'sfs-sqzlbl-4h', live.price);
}

// ─── Draw one timeframe chart ───────────────────────────────────────────────
function _sfsDrawOneTf(symbol, tf, wrapId, rsiId, rsId, sqzBarId, sqzLblId, livePrice) {
  var cache   = S.squeezeFireScanner.chartCacheCandles;
  var rawCandles = (cache[symbol] && cache[symbol][tf]) ? cache[symbol][tf] : null;
  // Patch the final candle with the render-scoped price FIRST (resolved once in
  // _sfsDrawCharts), so price/indicators/RS/squeeze reflect the same latest APEX
  // value across 1D & 4H. Reuses the shared PR #207 primitive; no-op when no valid
  // price resolved (no Yahoo, no new source). Indicators are computed below on the
  // patched dataset so every label derives from the same final candle. The visible
  // right-axis last-price label in _drawCandleChart is the last close of THIS
  // patched array (it carries no overriding currentPrice/livePrice/lastPrice opt),
  // so 1D and 4H labels end on the identical resolved price.
  var rawLast = (rawCandles && rawCandles.length) ? parseFloat(rawCandles[rawCandles.length - 1].close) : null;
  var candles = patchLastCandleWithLivePrice(rawCandles, livePrice);
  var patLast = (candles && candles.length) ? parseFloat(candles[candles.length - 1].close) : null;
  debugLog('sfs', '[SFS-CHART-LIVE-PATCH] ' + symbol + ' tf=' + tf + ' live=' +
    (livePrice != null && isFinite(+livePrice) ? (+livePrice).toFixed(2) : 'n/a') +
    ' lastBefore=' + (rawLast != null && isFinite(rawLast) ? rawLast.toFixed(2) : 'n/a') +
    ' lastAfter='  + (patLast != null && isFinite(patLast) ? patLast.toFixed(2) : 'n/a'));
  var wrap    = document.getElementById(wrapId);
  if (!wrap) return;

  if (!candles || candles.length < 5) {
    // Precise, non-misleading empty state. Backend 4H derives from 30M candles ON
    // DEMAND, so route its copy through the detail-4H loader's phase/reason (Loading
    // 4H… / warming pending / subscription cap / insufficient 30M / cache not ready)
    // rather than the old "Run scan first" message. 1D shows a clear cache state.
    var msg, lbl;
    if (tf === '4H' && typeof _sfs4hDetailMessage === 'function') {
      var st = _sfs4hDetailMessage(symbol);
      msg = st.msg; lbl = st.label;
    } else {
      msg = 'Backend ' + tf + ' candles for ' + symbol + ' not ready yet.<br>Loading from the backend candle cache…';
      lbl = tf + ' — unavailable';
    }
    wrap.innerHTML = '<div class="dss-no-data">' + msg + '</div>';
    var sqzLblEl = document.getElementById(sqzLblId);
    if (sqzLblEl) { sqzLblEl.textContent = lbl; sqzLblEl.style.color = 'var(--tx3)'; }
    return;
  }

  var ind = computeCandleIndicators(candles);
  if (!ind) {
    wrap.innerHTML = '<div class="dss-no-data">Insufficient data for indicators.</div>';
    return;
  }

  var viewLen = Math.min(75, candles.length);
  _drawCandleChart(wrapId, candles, ind, { showSMA8: S.squeezeFireScanner.chartOverlay.sma8, lastSma8: ind.lastSma8, showBB: true, showKC: true, source: 'BACKEND_DXLINK_CANDLES', rsi: ind.lastRsi });
  _mcxDrawRsi(rsiId, ind.rsi, viewLen);

  // RS vs SPY — self-sufficient: uses cached SPY for this TF, else fetches it once
  // and redraws RS asynchronously (guarded against keyboard-nav symbol changes).
  _sfsDrawRsPanel(symbol, tf, rsId, candles, viewLen);

  var sqz      = ind.lastSqueeze;
  var sqzFired = false;
  if (ind.squeeze && !sqz) {
    var sq = ind.squeeze, sn = sq.length - 1;
    for (var si = Math.max(0, sn - SFS_FIRE_LOOKBACK); si < sn; si++) { if (sq[si]) { sqzFired = true; break; } }
  }
  var sqzBarEl = document.getElementById(sqzBarId);
  if (sqzBarEl) { sqzBarEl.style.background = sqz ? '#e8445a' : sqzFired ? '#00d48a' : '#3a3a4a'; sqzBarEl.style.opacity = (sqzFired && !sqz) ? '0.75' : '1'; }
  var sqzLblEl2 = document.getElementById(sqzLblId);
  if (sqzLblEl2) { sqzLblEl2.textContent = sqz ? 'SQUEEZE: ON' : sqzFired ? 'SQUEEZE: FIRED' : 'SQUEEZE: OFF'; sqzLblEl2.style.color = sqz ? '#e8445a' : sqzFired ? '#00d48a' : 'var(--tx3)'; }
}
