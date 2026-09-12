// ── Interactive crosshair / tooltip engine for _drawCandleChart ──────────────
// A second, transparent canvas is layered on top of the base chart so hover
// rendering never re-paints the candles (keeps mousemove cheap / lag-free).
// All geometry + series needed for the tooltip is stashed on wrap.__chart by
// _drawCandleChart; these helpers only READ it (no recompute of any indicator).
function _chartPad2(n){ n = '' + n; return n.length < 2 ? '0' + n : n; }
function _chartFmtDateTime(t, intraday){
  var d = new Date(t);
  if (isNaN(+d)) return '—';
  var base = (d.getMonth()+1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(2);
  if (intraday) base += ' ' + _chartPad2(d.getHours()) + ':' + _chartPad2(d.getMinutes());
  return base;
}
function _chartFmtVol(v){
  if (v == null || !isFinite(v) || v <= 0) return null;
  if (v >= 1e9) return (v/1e9).toFixed(2) + 'B';
  if (v >= 1e6) return (v/1e6).toFixed(2) + 'M';
  if (v >= 1e3) return (v/1e3).toFixed(1) + 'K';
  return '' + Math.round(v);
}

// ── Horizontal zoom / pan view window for _drawCandleChart ───────────────────
// The base chart draws a [start,end) slice of the FULL candle array (and the
// matching, index-aligned indicator slices). The window lives on wrap.__chartView
// so it survives live redraws; it resets to the default trailing range whenever
// the data identity (symbol / timeframe / series) changes. Purely a view concern:
// no candle data or indicator formula is ever recomputed here.
var _CHART_DEFAULT_VISIBLE = 75;   // default trailing candles (matches pre-zoom behavior)
var _CHART_MIN_VISIBLE     = 20;   // most-zoomed-in clamp (min visible candles)

// Visual right-side "future space": empty candle slots reserved to the right of the
// last visible candle so it isn't glued to the plot edge and the current-price tag
// gets natural breathing room. Purely a rendering concern — NO fake candles are ever
// added to the data arrays; only the index→x mapping reserves room on the right.
var _CHART_RIGHT_PAD_SLOTS = 4;    // ~3–6 candle slots of future space (visual only)

// Index→x denominator for a chart with `nv` visible candles. The last candle sits at
// index nv-1, which now maps to BEFORE the right edge: the trailing
// _CHART_RIGHT_PAD_SLOTS slots stay empty (future space). Guarded so a single visible
// candle still spans sensibly. Used by every index↔x mapping (draw, hover, wheel,
// drag) so candle placement, crosshair snapping, zoom anchoring and pan all agree.
function _chartXSpan(nv){
  var base = (nv - 1) > 0 ? (nv - 1) : 1;
  return base + _CHART_RIGHT_PAD_SLOTS;
}

// Identity key: stable across live appends of the SAME series (first bars don't
// change) but differs across symbol/timeframe switches (first bar time, candle
// spacing, and the leading OHLC all change). No length/last-bar terms so live
// ticks don't churn the key.
function _chartViewKey(candles){
  if (!candles || !candles.length) return 'empty';
  var f = candles[0] || {};
  var ft = f.time != null ? +new Date(f.time) : 0;
  var sp = 0;
  if (candles.length > 1 && candles[1] && candles[1].time != null) {
    sp = (+new Date(candles[1].time)) - ft;
  }
  var sig = '';
  for (var k = 0; k < Math.min(3, candles.length); k++) {
    var c = candles[k] || {};
    sig += '|' + c.open + ',' + c.close;
  }
  return ft + '@' + sp + sig;
}

// Resolve (and store) the current view window for a wrap given the full dataset.
// Returns { key, start, end, anchored }. `anchored` means the window is pinned to
// the most-recent candle, so live appends keep following the latest bar; once the
// user pans away from the right edge the absolute window is preserved instead.
function _chartResolveView(wrap, candles){
  var total = candles ? candles.length : 0;
  var minV  = Math.min(_CHART_MIN_VISIBLE, total);
  var defC  = Math.min(_CHART_DEFAULT_VISIBLE, total);
  var key   = _chartViewKey(candles);
  var vw    = wrap.__chartView;
  if (!vw || vw.key !== key) {
    vw = { key: key, start: total - defC, end: total, anchored: true };
  } else {
    var count = vw.end - vw.start;
    if (count < minV)  count = minV;
    if (count > total) count = total;
    if (vw.anchored) {
      vw.end = total; vw.start = total - count;
    } else {
      if (vw.end > total) vw.end = total;
      vw.start = vw.end - count;
      if (vw.start < 0) { vw.start = 0; vw.end = count; }
      if (vw.end >= total) vw.anchored = true;
    }
  }
  if (vw.start < 0) vw.start = 0;
  if (vw.end > total) vw.end = total;
  wrap.__chartView = vw;
  return vw;
}

// Redraw a chart in place from the snapshot stashed on wrap.__chart (full candles
// + indicators + opts). Used by the zoom/pan/reset handlers; reads the current
// wrap.__chartView, so callers mutate the window first, then call this.
function _chartRedraw(wrap){
  var st = wrap && wrap.__chart;
  if (!st || !st.wrapId || !st.candles) return;
  _drawCandleChart(st.wrapId, st.candles, st.ind, st.opts);
}
// Clear the hover overlay (mouse left the chart / no candle under cursor).
// Reads wrap.__chart fresh each call, so after a live redraw it always targets
// the CURRENT overlay context — a stale octx from a prior redraw is never used.
function _chartClearHover(wrap){
  var st = wrap && wrap.__chart;
  if (!st || !st.octx || !st.overlay || !st.overlay.isConnected) return;
  try { st.octx.clearRect(0, 0, st.W, st.H); } catch(e){ /* detached canvas */ }
}
// Render crosshair + tooltip for the candle nearest CSS-pixel (mx,my).
// Defensive: if the overlay was recreated by a redraw and the old one detached,
// or its layout collapsed to a zero rect, exit cleanly (never throw on mousemove).
function _chartDrawHover(wrap, mx, my){
  var st = wrap && wrap.__chart;
  if (!st || !st.octx || !st.overlay || !st.overlay.isConnected) return;
  if (!(st.W > 0) || !(st.H > 0)) return;
  var ctx = st.octx;
  var PAD = st.PAD, W = st.W, H = st.H, nv = st.nv;
  var plotW = st.plotW, plotH = st.plotH;
  ctx.clearRect(0, 0, W, H);
  if (nv < 1) return;
  // Only react inside the plot area (a little horizontal slack on the edges).
  if (mx < PAD.left - 4 || mx > W - PAD.right + 4) return;
  if (my < PAD.top - 4 || my > H - PAD.bottom + 4) return;

  // Reserve future space on the right (see _chartXSpan): the last candle maps to
  // before the plot edge, so xOf / the inverse below both use the stashed span.
  var xSpan = st.xSpan || _chartXSpan(nv);
  function xOf(i){ return PAD.left + (i/xSpan) * plotW; }
  function yOf(p){ return PAD.top + (1-(p-st.minP)/(st.maxP-st.minP)) * plotH; }

  // Hovering in the empty future space (past the last candle) snaps to the last
  // candle, so the inverse is clamped to [0, nv-1].
  var i = Math.round((mx - PAD.left) / (plotW || 1) * xSpan);
  if (i < 0) i = 0; if (i > nv - 1) i = nv - 1;
  var c = st.view[i];
  if (!c) return;
  var cx = xOf(i);

  // Vertical crosshair (snapped for crispness)
  var vx = Math.round(cx) + 0.5;
  ctx.save();
  ctx.strokeStyle = 'rgba(160,160,200,.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(vx, PAD.top); ctx.lineTo(vx, H - PAD.bottom); ctx.stroke();

  // Horizontal guide follows the cursor (clamped to the plot)
  var hy = Math.max(PAD.top, Math.min(H - PAD.bottom, my));
  var hyS = Math.round(hy) + 0.5;
  ctx.beginPath(); ctx.moveTo(PAD.left, hyS); ctx.lineTo(W - PAD.right, hyS); ctx.stroke();
  ctx.setLineDash([]);

  // Price tag for the guide on the right axis
  var guidePrice = st.minP + (1 - (hy - PAD.top) / (plotH || 1)) * (st.maxP - st.minP);
  ctx.font = '10px monospace';
  var pTxt = '$' + guidePrice.toFixed(2);
  var pW = ctx.measureText(pTxt).width + 8;
  ctx.fillStyle = 'rgba(20,20,32,.92)';
  ctx.fillRect(W - PAD.right + 2, hy - 8, Math.min(pW, PAD.right - 4), 16);
  ctx.fillStyle = '#c8c8e0'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(pTxt, W - PAD.right + 6, hy);
  ctx.textBaseline = 'alphabetic';

  // Marker dot at the candle close
  var isUp = c.close >= c.open;
  ctx.beginPath(); ctx.arc(cx, yOf(c.close), 3, 0, Math.PI*2);
  ctx.fillStyle = isUp ? '#00d48a' : '#e8445a'; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.stroke();

  // ── Build tooltip rows ─────────────────────────────────────────────────────
  var rows = [];
  rows.push({ label: _chartFmtDateTime(c.time, st.intraday), color: '#e8e8f0', head: true });
  var chg = (c.open ? ((c.close - c.open) / c.open * 100) : 0);
  rows.push({ label: 'O', val: c.open.toFixed(2),  color: '#9a9ab8' });
  rows.push({ label: 'H', val: c.high.toFixed(2),  color: '#9a9ab8' });
  rows.push({ label: 'L', val: c.low.toFixed(2),   color: '#9a9ab8' });
  rows.push({ label: 'C', val: c.close.toFixed(2) + '  (' + (chg>=0?'+':'') + chg.toFixed(2) + '%)',
              color: isUp ? '#00d48a' : '#e8445a' });
  var volTxt = _chartFmtVol(c.volume != null ? c.volume : c.v);
  if (volTxt) rows.push({ label: 'Vol', val: volTxt, color: '#9a9ab8' });
  function pushMa(key, lbl, col){
    var a = st.vind[key];
    if (a && a[i] != null) rows.push({ label: lbl, val: (+a[i]).toFixed(2), color: col });
  }
  if (st.opts.showSMA8) pushMa('sma8', 'SMA8', '#f5a623');
  pushMa('sma20', 'SMA20', '#00d4aa');
  pushMa('sma30', 'SMA30', '#a78bfa');
  if (st.rsiView && st.rsiView[i] != null)
    rows.push({ label: 'RSI14', val: (+st.rsiView[i]).toFixed(1), color: '#7c6fff' });
  if (st.opts.rs !== undefined && st.opts.rs != null && isFinite(parseFloat(st.opts.rs))) {
    var rsN = parseFloat(st.opts.rs);
    rows.push({ label: 'RS vs SPY', val: (rsN>=0?'+':'') + rsN.toFixed(1) + '%',
                color: rsN >= 0 ? '#00d48a' : '#e8445a' });
  }
  if (st.vind.squeeze && st.vind.squeeze[i] != null)
    rows.push({ label: 'Squeeze', val: st.vind.squeeze[i] ? 'ON' : 'off',
                color: st.vind.squeeze[i] ? '#e8445a' : '#8a8aa8' });

  // ── Tooltip box (kept inside chart bounds) ─────────────────────────────────
  ctx.font = '10px monospace';
  var lineH = 13, padX = 7, padY = 6;
  var boxW = 0;
  rows.forEach(function(r){
    var t = r.head ? r.label : (r.label + '  ' + r.val);
    boxW = Math.max(boxW, ctx.measureText(t).width);
  });
  boxW += padX * 2;
  var boxH = rows.length * lineH + padY * 2;
  var bx = cx + 12;
  if (bx + boxW > W - PAD.right) bx = cx - 12 - boxW;       // flip to the left
  if (bx < PAD.left) bx = PAD.left;                          // last-resort clamp
  var by = my + 12;
  if (by + boxH > H - PAD.bottom) by = H - PAD.bottom - boxH;
  if (by < PAD.top) by = PAD.top;

  ctx.fillStyle = 'rgba(14,14,24,.94)';
  ctx.strokeStyle = 'rgba(124,111,255,.45)';
  ctx.lineWidth = 1;
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, boxW, boxH, 5); ctx.fill(); ctx.stroke(); }
  else { ctx.fillRect(bx, by, boxW, boxH); ctx.strokeRect(bx, by, boxW, boxH); }

  ctx.textAlign = 'left';
  var ty = by + padY + 9;
  rows.forEach(function(r){
    if (r.head){
      ctx.fillStyle = r.color; ctx.fillText(r.label, bx + padX, ty);
    } else {
      ctx.fillStyle = '#6e6e8a'; ctx.fillText(r.label, bx + padX, ty);
      ctx.fillStyle = r.color;
      ctx.fillText(r.val, bx + padX + ctx.measureText(r.label + '  ').width, ty);
    }
    ty += lineH;
  });
  ctx.restore();
}
// ── Shared global drag dispatcher ───────────────────────────────────────────
// One pair of window listeners for ALL charts (bound once for the whole app), so
// transient chart wraps — scanner/portfolio panels created and destroyed as the
// user navigates — never accumulate their own window listeners. Only one drag is
// ever active at a time, so the active wrap + its pan context live on the shared
// _chartDragState while dragging and are cleared on mouseup. If the active wrap is
// detached mid-drag (panel closed), the drag is abandoned cleanly on the next move.
var _chartDragState = null;   // { wrap, startClientX, start, count, scheduleRedraw } | null
var _chartDragBound = false;
function _chartEndDrag(){
  var ds = _chartDragState;
  _chartDragState = null;
  if (ds && ds.wrap){
    ds.wrap.__dragging = false;
    if (ds.wrap.isConnected) ds.wrap.style.cursor = 'crosshair';
  }
}
function _chartEnsureDragDispatcher(){
  if (_chartDragBound) return;
  _chartDragBound = true;
  // Track on window so a drag keeps panning even if the cursor leaves the wrap.
  window.addEventListener('mousemove', function(e){
    var ds = _chartDragState; if (!ds) return;          // no active drag → no work
    var wrap = ds.wrap;
    if (!wrap.isConnected) { _chartEndDrag(); return; } // panel removed mid-drag
    var st = wrap.__chart; if (!st || !st.candles) { _chartEndDrag(); return; }
    var total = st.candles.length; if (total < 2) return;
    var slot = st.plotW / (st.xSpan || _chartXSpan(st.nv));
    var dIdx = Math.round((e.clientX - ds.startClientX) / (slot || 1));
    var count = ds.count;
    var newStart = ds.start - dIdx;            // drag right → reveal earlier bars
    if (newStart < 0) newStart = 0;
    if (newStart > total - count) newStart = total - count;
    var vw = wrap.__chartView || {};
    vw.start = newStart; vw.end = newStart + count;
    vw.anchored = (vw.end >= total);
    wrap.__chartView = vw;
    ds.scheduleRedraw();
  });
  window.addEventListener('mouseup', _chartEndDrag);
}
// Bind hover + zoom/pan/reset listeners to a chart wrap exactly once. Listeners
// persist across the full redraws done by live updates (wrap.innerHTML is cleared,
// but the wrap node and these listeners survive); they always read the latest
// wrap.__chart / wrap.__chartView, so a single bind covers every redraw.
function _chartBindInteractions(wrap){
  if (wrap.__interactBound) return;
  wrap.__interactBound = true;
  // IMPORTANT: all pointer events are captured on the WRAP element, not on the
  // overlay canvas (the overlay keeps pointer-events:none). The overlay/base are
  // recreated on every _drawCandleChart redraw, so binding to them would lose
  // listeners on each live update; the wrap node is stable, so these listeners
  // are bound exactly once and always read the freshest state.
  var hoverRaf = null, drawRaf = null, pending = null;

  function flushHover(){ hoverRaf = null; if (pending) _chartDrawHover(wrap, pending.x, pending.y); }
  function scheduleRedraw(){ if (drawRaf == null) drawRaf = requestAnimationFrame(function(){ drawRaf = null; _chartRedraw(wrap); }); }
  // Map a client point to overlay-local CSS pixels; null when no live overlay.
  function pos(clientX, clientY){
    var st = wrap.__chart;
    if (!st || !st.overlay || !st.overlay.isConnected) return null;
    var rect = st.overlay.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;   // collapsed/hidden panel
    return { x: clientX - rect.left, y: clientY - rect.top, st: st };
  }
  function inPlot(st, x, y){
    return x >= st.PAD.left && x <= st.W - st.PAD.right &&
           y >= st.PAD.top  && y <= st.H - st.PAD.bottom;
  }
  function hoverMove(clientX, clientY){
    if (wrap.__dragging) return;                     // panning: suppress crosshair
    var p = pos(clientX, clientY);
    if (!p) { pending = null; return; }
    pending = { x: p.x, y: p.y };
    if (hoverRaf == null) hoverRaf = requestAnimationFrame(flushHover);
  }

  // ── Drag to pan ────────────────────────────────────────────────────────────
  // mousedown opens a drag on the SHARED global dispatcher (see _chartDragState);
  // the actual pan math + mouseup teardown live there, so this wrap never attaches
  // its own window listeners and can be torn down without leaking any.
  wrap.addEventListener('mousedown', function(e){
    if (e.button !== 0) return;
    var p = pos(e.clientX, e.clientY); if (!p) return;
    var st = p.st;
    // Reset chip hit-test (takes priority over starting a drag).
    if (st.resetBtn && p.x >= st.resetBtn.x && p.x <= st.resetBtn.x + st.resetBtn.w &&
        p.y >= st.resetBtn.y && p.y <= st.resetBtn.y + st.resetBtn.h){
      wrap.__chartView = null; _chartClearHover(wrap); scheduleRedraw();
      e.preventDefault(); return;
    }
    if (!inPlot(st, p.x, p.y)) return;
    var vw = wrap.__chartView; if (!vw) return;
    _chartEnsureDragDispatcher();
    _chartDragState = { wrap: wrap, startClientX: e.clientX, start: vw.start,
                        count: vw.end - vw.start, scheduleRedraw: scheduleRedraw };
    wrap.__dragging = true;
    wrap.style.cursor = 'grabbing';
    _chartClearHover(wrap);
    e.preventDefault();
  });

  // ── Wheel to zoom horizontally around the cursor ─────────────────────────────
  wrap.addEventListener('wheel', function(e){
    var p = pos(e.clientX, e.clientY); if (!p) return;
    var st = p.st;
    if (!inPlot(st, p.x, p.y)) return;             // outside plot → allow page scroll
    e.preventDefault();                             // inside plot → take over the wheel
    var total = st.candles ? st.candles.length : 0; if (total < 2) return;
    var vw = wrap.__chartView; if (!vw) return;
    var nv = st.nv, plotW = st.plotW, PAD = st.PAD;
    var xSpan = st.xSpan || _chartXSpan(nv);
    var iView = Math.round((p.x - PAD.left) / (plotW || 1) * xSpan);
    if (iView < 0) iView = 0; if (iView > nv - 1) iView = nv - 1;
    var relPos    = (nv > 1) ? iView / (nv - 1) : 0;
    var anchorAbs = vw.start + iView;               // dataset index under the cursor
    var minV = Math.min(_CHART_MIN_VISIBLE, total), maxV = total;
    var count = vw.end - vw.start;
    var newCount = Math.round(count * (e.deltaY < 0 ? 0.85 : 1.18));  // up = zoom in
    if (newCount < minV) newCount = minV;
    if (newCount > maxV) newCount = maxV;
    if (newCount === count) return;
    var newStart = Math.round(anchorAbs - relPos * (newCount - 1));   // keep cursor bar fixed
    if (newStart < 0) newStart = 0;
    if (newStart > total - newCount) newStart = total - newCount;
    vw.start = newStart; vw.end = newStart + newCount;
    vw.anchored = (vw.end >= total);
    wrap.__chartView = vw;
    scheduleRedraw();
  }, { passive: false });

  // ── Double-click to reset the view ───────────────────────────────────────────
  wrap.addEventListener('dblclick', function(e){
    wrap.__chartView = null;                        // forces default trailing window
    _chartClearHover(wrap);
    scheduleRedraw();
    e.preventDefault();
  });

  // ── Hover crosshair / tooltip ────────────────────────────────────────────────
  wrap.addEventListener('mousemove', function(e){ hoverMove(e.clientX, e.clientY); });
  wrap.addEventListener('mouseleave', function(){
    pending = null;
    if (hoverRaf != null) { cancelAnimationFrame(hoverRaf); hoverRaf = null; }
    if (!wrap.__dragging) _chartClearHover(wrap);
  });
  // Touch: update crosshair without blocking scroll; clear when the touch ends.
  wrap.addEventListener('touchmove', function(e){
    if (e.touches && e.touches.length) hoverMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  wrap.addEventListener('touchend', function(){ _chartClearHover(wrap); }, { passive: true });
}
