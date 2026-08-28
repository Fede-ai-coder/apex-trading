// ── Shared post-authentication initialization ───────────────────
// Runs the full authenticated dashboard pipeline. Called after a NORMAL login
// (reason 'login') AND after a SUCCESSFUL reconnect (reason 'reconnect') — an
// initial login timeout followed by a reconnect MUST behave exactly like a clean
// login (same auth-state reset, quote-token/DXLink bring-up, VIX family, Market
// Context, dashboard context prewarm, scanner refresh + Directional live-price
// enrichment). Every step is idempotent (guarded singletons / single-flight), so
// repeated calls never create duplicate timers, sockets, VIX fetches, scanner
// refreshes or quote-token calls.
function _apexPostAuthInit(reason){
  reason = reason || 'login';
  try {
    // (a) Clear any transient auth-failure latch from BEFORE auth was ready, so
    //     backend_auth_not_ready / known-invalid-key / 401-backoff stop blocking
    //     the now-authenticated calls (this is what kept reconnect half-initialised).
    if (typeof _resetBackendApiAuthState === 'function') { try { _resetBackendApiAuthState(); } catch(e){} }
    // (b) Quote-token / DXLink: connect + 12s status polling (guarded singletons).
    //     On reconnect, if the feed is NOT already ready (e.g. the initial
    //     /dxlink/connect ran before auth and failed), re-arm the once-guard so a
    //     single fresh connect runs. If DXLink is already ready, do NOT reconnect.
    var _dxReady = !!(S.dxlinkStatus && String(S.dxlinkStatus.state || '').toLowerCase() === 'ready');
    if (reason !== 'login' && !_dxReady) { S.dxlinkConnectStarted = false; }
    // DXLink is Tastytrade-backed: never bring it up on a login that produced NO valid TT
    // session (avoids a "frontend not connected, DXLink connecting with a stale session"
    // mixed state). A failed/timed-out login leaves ttConnected=false AND ttSessionId=null
    // (the robust login clears the stale session), so this gate holds. Reconnect always
    // passes a freshly-validated session.
    var _ttReady = !!(S.ttConnected || S.ttSessionId);
    if (reason !== 'login' || _ttReady) {
      if (typeof startDxlinkConnectOnce === 'function') { try { startDxlinkConnectOnce(); } catch(e){} }
      if (typeof startDxlinkStatusPolling === 'function') { try { startDxlinkStatusPolling(); } catch(e){} }
      if (typeof _renderDxlinkDiag === 'function') { try { _renderDxlinkDiag(); } catch(e){} }
    } else {
      console.log('[APEX] post-auth init: DXLink bring-up skipped (no valid TT session yet)');
    }
    // (c) VIX family + Market Context / regime (shared + deduped; fetches VIX when
    //     missing, opens no new feed, draws no charts).
    if (typeof refreshSharedMarketRegime === 'function') { try { refreshSharedMarketRegime(reason === 'login' ? 'launch' : 'reconnect'); } catch(e){} }
    if (S.ttConnected && typeof _ensureVixFamily === 'function') { try { _ensureVixFamily(); } catch(e){} }
    // (d) Dashboard candle/context prewarm — retries past a pre-auth
    //     backend_auth_not_ready skip now that auth is ready.
    try { postCandleContext({reason:'dashboard_init',contextType:'dashboard',timeframes:['1D','30M','4H']}); } catch(e){}
    // (e) Scanner snapshot refresh + Directional live-price enrichment retry while
    //     the Dashboard is the active view (idempotent timers; readiness-gated, so
    //     no quote storm and no chart reset — preserves PR 265 behavior).
    if (typeof _activeView === 'undefined' || _activeView === 'dashboard') {
      if (typeof bssStartPolling === 'function') { try { bssStartPolling(); } catch(e){} }
      if (typeof dsbStartAutoRefresh === 'function') { try { dsbStartAutoRefresh(); } catch(e){} }
      if (typeof dsbEnrichVisibleRowsLive === 'function') { try { dsbEnrichVisibleRowsLive(); } catch(e){} }
    }
    // (f) One-time Journal migration (idempotent via _jMigrationDone).
    if (typeof jMigrateApexTradesToBackend === 'function') { try { jMigrateApexTradesToBackend(); } catch(e){} }
    // (g) Backend-driven Swing screen: if it is the active view, re-read the now-
    //     available /scanner/snapshot and populate its tabs (auth just became ready).
    if (typeof S !== 'undefined' && S.swing && S.swing.active && typeof _swingHydrateFromBackend === 'function') {
      try { _swingHydrateFromBackend({ reason: 'post_auth' }); } catch(e){}
    }
  } catch (e) {
    try { console.warn('[APEX] post-auth init error:', e && e.message); } catch(_){}
  }
}
