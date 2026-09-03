// ══════════════════════════════════════════════════════════════════════════
// BACKEND-BACKED PORTFOLIOS — API client + sync
// ──────────────────────────────────────────────────────────────────────────
// Mirrors the Journal backend pattern (_jSyncJournalFromBackend): every call
// goes through ttCall(), which applies the BACKEND base URL and the x-api-key
// (S.backendKey) and surfaces 401/403 to the shared auth-validity gate. The
// backend (apex-backend PR #138) answers:
//   GET    /portfolios       -> { ok:true, portfolios, count }
//   GET    /portfolios/:id   -> { ok:true, id, portfolio }
//   POST   /portfolios       -> { ok:true, id, portfolio }
//   PUT    /portfolios/:id   -> { ok:true, id, portfolio }
//   DELETE /portfolios/:id   -> { ok:true, ... }    (soft delete)
//   errors                   -> { ok:false, error, code }
// Each helper NEVER throws to its caller: ttCall() rejections (network / 401 /
// timeout) are caught and normalised to { ok:false, error, code:'request_failed' }
// so a flaky backend can never break the Portfolio UI.
async function backendListPortfolios() {
  try { return await ttCall('/portfolios'); }
  catch (e) { console.warn('[PORTFOLIO BACKEND] GET /portfolios failed:', e.message); return { ok:false, error:e.message, code:'request_failed' }; }
}
async function backendGetPortfolio(id) {
  try { return await ttCall('/portfolios/' + encodeURIComponent(id)); }
  catch (e) { console.warn('[PORTFOLIO BACKEND] GET /portfolios/:id failed:', e.message); return { ok:false, error:e.message, code:'request_failed' }; }
}
async function backendCreatePortfolio(portfolio) {
  try { return await ttCall('/portfolios', { method:'POST', body: portfolio }); }
  catch (e) { console.warn('[PORTFOLIO BACKEND] POST /portfolios failed:', e.message); return { ok:false, error:e.message, code:'request_failed' }; }
}
async function backendUpdatePortfolio(id, patch) {
  try { return await ttCall('/portfolios/' + encodeURIComponent(id), { method:'PUT', body: patch }); }
  catch (e) { console.warn('[PORTFOLIO BACKEND] PUT /portfolios/:id failed:', e.message); return { ok:false, error:e.message, code:'request_failed' }; }
}
async function backendDeletePortfolio(id) {
  try { return await ttCall('/portfolios/' + encodeURIComponent(id), { method:'DELETE' }); }
  catch (e) { console.warn('[PORTFOLIO BACKEND] DELETE /portfolios/:id failed:', e.message); return { ok:false, error:e.message, code:'request_failed' }; }
}
try {
  window.backendListPortfolios   = backendListPortfolios;
  window.backendGetPortfolio     = backendGetPortfolio;
  window.backendCreatePortfolio  = backendCreatePortfolio;
  window.backendUpdatePortfolio  = backendUpdatePortfolio;
  window.backendDeletePortfolio  = backendDeletePortfolio;
} catch (e) {}

// Is the backend usable for portfolio sync right now? (configured key + base URL,
// and not a preview/local env where backend sync is intentionally disabled).
function _portfolioBackendUsable() {
  // Deploy previews ARE allowed (they target the live dev backend); only genuine
  // local dev (localhost / file://) is forced offline.
  if (isApexLocalDevEnv()) return false;
  if (typeof BACKEND === 'undefined' || !BACKEND) return false;
  if (!S.backendKey) return false;
  return true;
}

// Guard against overlapping startup probes (Portfolio tab can be opened rapidly).
var _portfolioBackendSyncInFlight = false;

// Startup / on-open load. The backend (GET /portfolios) is the ONLY source of
// portfolios. There is NO localStorage fallback: if the backend is unconfigured,
// missing its API key, unreachable, or errors, the cache is cleared and an error
// state is recorded so the UI shows a clear "backend unavailable" message instead
// of stale local data. An empty backend list is shown as a normal empty state —
// never recovered from localStorage and never auto-imported. Returns the resolved
// source string ('backend' | 'backend_empty' | 'backend_error'). Never throws.
async function _syncPortfoliosFromBackend() {
  if (_portfolioBackendSyncInFlight) return portfolioManager.getSource();
  _portfolioBackendSyncInFlight = true;
  try {
    if (!_portfolioBackendUsable()) {
      var reason = (typeof BACKEND === 'undefined' || !BACKEND) ? 'not_configured'
                 : (!S.backendKey ? 'missing_api_key' : 'not_configured');
      portfolioManager.setLoadError(reason, 'backend not usable');
      console.error('[PORTFOLIOS][BACKEND] error reason=' + reason);
      return portfolioManager.getSource();
    }
    var res = await backendListPortfolios();
    if (!res || res.ok !== true) {
      portfolioManager.setLoadError('request_failed', (res && res.error) || 'no response');
      console.error('[PORTFOLIOS][BACKEND] error reason=request_failed');
      return portfolioManager.getSource();
    }
    var backendList = Array.isArray(res.portfolios) ? res.portfolios : [];
    portfolioManager.setFromBackend(backendList);   // in-memory copy of backend
    console.log('[PORTFOLIOS][BACKEND] load count=' + backendList.length);
    return portfolioManager.getSource();
  } catch (e) {
    portfolioManager.setLoadError('request_failed', e.message);
    console.error('[PORTFOLIOS][BACKEND] error reason=request_failed');
    return portfolioManager.getSource();
  } finally {
    _portfolioBackendSyncInFlight = false;
  }
}
try { window._syncPortfoliosFromBackend = _syncPortfoliosFromBackend; } catch (e) {}

// Combined backend READ run when the Portfolio tab opens. Loads the authoritative
// portfolios AND the journal trades from the backend in parallel, then re-renders
// the Portfolio cards so linkedTradeCount/openLinked/closedLinked reflect the
// backend trades — not just whatever happens to live in this browser's
// localStorage (the deploy-preview bug where trades showed as 0).
//
// Both branches are pure backend READS:
//   • _syncPortfoliosFromBackend() never auto-uploads (GET /portfolios only).
//   • _jSyncJournalFromBackend()    only GETs /journal/trades and merges via
//     journalManager.loadFromBackend(); it does NOT call
//     jMigrateApexTradesToBackend(), so NO local trade is ever uploaded from the
//     (deploy-preview) browser, and no trade.portfolioId is mutated.
// Extracted from showView() so the open-time wiring is unit-testable.
function _portfolioOpenBackendLoad() {
  return Promise.all([
    _syncPortfoliosFromBackend().catch(function() { return null; }),
    (typeof _jSyncJournalFromBackend === 'function'
      ? _jSyncJournalFromBackend().catch(function() { return false; })
      : Promise.resolve(false))
  ]).then(function() {
    if (_activeView === 'portfolio') renderPortfolioView();
  });
}
try { window._portfolioOpenBackendLoad = _portfolioOpenBackendLoad; } catch (e) {}

// Backend-backed update. Never sends id/createdAt (immutable). Updates the cache
// from the returned portfolio on success. Returns the backend response.
async function portfolioApplyUpdate(id, patch) {
  if (!_portfolioBackendUsable()) {
    showToast('Portfolio backend non raggiungibile — modifica non salvata.', 'warn');
    return { ok:false, error:'backend_unavailable', code:'backend_unavailable' };
  }
  var clean = Object.assign({}, patch || {});
  delete clean.id; delete clean.createdAt;
  var res = await backendUpdatePortfolio(id, clean);
  if (!res || res.ok !== true || !res.portfolio) {
    showToast('Backend error updating portfolio: ' + ((res && res.error) || 'unknown'), 'warn');
    return res || { ok:false, error:'no response', code:'request_failed' };
  }
  portfolioManager.upsertLocal(res.portfolio);
  console.log('[PORTFOLIOS][BACKEND] updated id=' + res.portfolio.id);
  try { if (_activeView === 'portfolio') renderPortfolioView(); } catch (e) {}
  return res;
}
try { window.apexUpdatePortfolio = portfolioApplyUpdate; } catch (e) {}


function showNewPortfolioForm() {
  document.getElementById('newPortfolioFormWrap').style.display = 'block';
  document.getElementById('pfName').focus();
}

async function createPortfolio() {
  var errEl = document.getElementById('pfFormError');
  errEl.style.display = 'none';
  var name = (document.getElementById('pfName').value || '').trim();
  var type = document.getElementById('pfType').value;
  document.getElementById('pfName').classList.remove('err');
  document.getElementById('pfType').classList.remove('err');
  if (!name) {
    document.getElementById('pfName').classList.add('err');
    errEl.textContent = 'Portfolio name is required.';
    errEl.style.display = 'block';
    return;
  }
  if (!type) {
    document.getElementById('pfType').classList.add('err');
    errEl.textContent = 'Select a portfolio type.';
    errEl.style.display = 'block';
    return;
  }
  // Backend is authoritative for new portfolios. If it is unavailable we BLOCK
  // creation with a clear error rather than create a local-only portfolio that
  // would diverge between browsers (the exact bug this feature fixes).
  if (!_portfolioBackendUsable()) {
    errEl.textContent = 'Portfolio backend unavailable — cannot create a synced portfolio. ' +
      'Check your API key / connection and try again.';
    errEl.style.display = 'block';
    return;
  }
  // Let the backend generate the id for brand-new portfolios (legacy import is
  // the only path that preserves a client-provided id).
  var res = await backendCreatePortfolio({ name: name, description: type ? ('type=' + type) : '' });
  if (!res || res.ok !== true || !res.portfolio) {
    errEl.textContent = 'Backend error: ' + ((res && res.error) || 'could not create portfolio');
    errEl.style.display = 'block';
    return;
  }
  portfolioManager.upsertLocal(res.portfolio);   // use the backend id
  console.log('[PORTFOLIOS][BACKEND] created id=' + res.portfolio.id);
  document.getElementById('pfName').value = '';
  document.getElementById('pfType').value = '';
  document.getElementById('newPortfolioFormWrap').style.display = 'none';
  renderPortfolioView();
  showToast('Portfolio created: ' + (res.portfolio.name || name), 'ok');
}

async function deletePortfolio(id) {
  var p = portfolioManager.getById(id);
  if (!p) return;
  // Backend delete is a SOFT delete: linked journal trades and positions are
  // preserved and NOT modified. Warn (read-only) if trades are linked, but never
  // touch them or their portfolioId.
  var linkedCount = 0;
  try {
    var rec = getPortfolioJournalReconciliation();
    var slot = rec.perPortfolio && (rec.perPortfolio[String(p.id)] || rec.perPortfolio[p.id]);
    if (slot) linkedCount = slot.linkedTradeCount || 0;
  } catch (e) {}
  var msg = 'Delete portfolio "' + p.name + '"?';
  if (linkedCount > 0) {
    msg += '\n\nThis portfolio has ' + linkedCount + ' linked journal trade(s). ' +
      'They will NOT be deleted or modified — but they may appear as unassigned until reassigned.';
  }
  if (!confirm(msg)) return;
  if (!_portfolioBackendUsable()) {
    showToast('Portfolio backend unavailable — cannot delete. Changes will not be synced.', 'warn');
    return;
  }
  var res = await backendDeletePortfolio(id);
  if (!res || res.ok !== true) {
    if (res && res.code === 'portfolio_has_trades') {
      console.warn('[PORTFOLIOS][BACKEND] delete_blocked id=' + id + ' reason=portfolio_has_trades');
      showToast('Non puoi eliminare questo portafoglio perché contiene trade collegate.', 'warn');
      return;
    }
    showToast('Backend error deleting portfolio: ' + ((res && res.error) || 'unknown'), 'warn');
    return;
  }
  console.log('[PORTFOLIOS][BACKEND] deleted id=' + id);
  portfolioManager.removeLocalOnly(id);   // no cascade — trades/positions untouched
  renderPortfolioView();
  showToast('Portfolio deleted', 'warn');
}

function renderPortfolioView() {
  var el = document.getElementById('portfolioListContent');
  if (!el) return;
  // Backend-only: if the last backend load failed (unconfigured / missing API
  // key / unreachable / error) surface a clear error instead of any local data.
  var _pfErr = portfolioManager.getLoadError ? portfolioManager.getLoadError() : null;
  if (_pfErr) {
    var _reasonText = {
      not_configured:  'il backend non è configurato',
      missing_api_key: 'manca la API key del backend',
      request_failed:  'il backend non è raggiungibile'
    }[_pfErr.reason] || 'il backend non è raggiungibile';
    el.innerHTML =
      '<div class="empty-state" style="border:1px solid var(--rd);border-radius:6px;color:var(--rd)">' +
        '<span class="big">&#9888;</span>Portafogli non disponibili: ' + escHtml(_reasonText) + '.<br>' +
        '<span style="color:var(--tx2);font-size:11px">I portafogli sono salvati solo nel backend (SQLite). ' +
        'Nessun dato locale viene mostrato.' +
        (_pfErr.message ? '<br>Dettaglio: ' + escHtml(_pfErr.message) : '') + '</span>' +
      '</div>';
    var _pp = document.getElementById('positionsPanel');
    if (_pp) _pp.style.display = 'none';
    return;
  }
  // Controlled storm-state banner (backend temporarily unavailable / technical
  // data partial). Non-blocking: it sits above the list; positions still render.
  if (typeof _updateStormBanner === 'function') _updateStormBanner();
  var portfolios = portfolioManager.getAll();
  var rec = getPortfolioJournalReconciliation();
  if (_portfolioRiskDebugEnabled()) console.debug('[PORTFOLIO-DIAG] renderPortfolioView reconciliation', {
    totalJournalTrades: rec.totalJournalTrades,
    openJournalTrades: rec.openJournalTrades,
    closedJournalTrades: rec.closedJournalTrades,
    portfolioCount: rec.portfolioCount,
    unassignedTradeCount: rec.unassignedTradeCount,
    perPortfolio: rec.perPortfolio
  });

  var explainer =
    '<div class="port-explainer" style="border:1px solid var(--b0);border-radius:6px;padding:10px 12px;margin-bottom:12px;background:var(--bg3);font-family:var(--M);font-size:10px;color:var(--tx2);line-height:1.5">' +
      '<strong style="color:var(--tx)">Portfolio</strong> shows current positions grouped by portfolio. ' +
      'Full trade history is in <strong style="color:var(--tx)">Trading Journal</strong>.' +
    '</div>';

  // ── Portfolio source indicator (backend-only) ─────────────────────────────
  var _src = (typeof portfolioManager !== 'undefined' && portfolioManager.getSource)
    ? portfolioManager.getSource() : 'loading';
  var _srcLabel = { backend: 'backend', backend_empty: 'backend (empty)', loading: 'loading…' }[_src] || _src;
  var sourceIndicator =
    '<div class="port-source" style="font-family:var(--M);font-size:9px;color:var(--tx3);margin-bottom:8px;letter-spacing:.03em">' +
      'Portfolio source: <span style="color:var(--gr);font-weight:700">' + _srcLabel + '</span>' +
    '</div>';
  // No localStorage fallback and no auto-import affordance: an empty backend is a
  // normal empty state, not a prompt to recover local data.
  var importBanner = '';

  var summary =
    '<div class="jstats" style="margin-bottom:12px">' +
      jStatBox('JOURNAL TOTAL', rec.totalJournalTrades, 'var(--tx)') +
      jStatBox('JOURNAL OPEN', rec.openJournalTrades, 'var(--am)') +
      jStatBox('JOURNAL CLOSED', rec.closedJournalTrades, 'var(--bl)') +
      jStatBox('ASSIGNED', rec.assignedTradeCount, 'var(--tx2)') +
      jStatBox('UNASSIGNED', rec.unassignedTradeCount, rec.unassignedTradeCount > 0 ? 'var(--am)' : 'var(--tx2)') +
    '</div>';

  var unassignedBanner = '';
  if (rec.unassignedTradeCount > 0) {
    unassignedBanner =
      '<div style="border:1px solid var(--am);border-radius:6px;padding:10px 12px;margin-bottom:12px;background:rgba(255,160,0,.06);font-family:var(--M);font-size:10px;color:var(--tx);display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<span>There are <strong style="color:var(--am)">' + rec.unassignedTradeCount + '</strong> Journal trades not assigned to any portfolio. ' +
          '<em style="color:var(--tx3);font-style:normal">New trades require portfolio assignment.</em></span>' +
        '<button onclick="viewUnassignedTradesInJournal()" class="tbtn" style="font-size:9px">VIEW UNASSIGNED IN JOURNAL</button>' +
      '</div>';
  }

  if (!portfolios.length) {
    el.innerHTML = explainer + sourceIndicator + importBanner + summary + unassignedBanner +
      '<div class="empty-state"><span class="big">&#9674;</span>No portfolios yet.<br>Click <strong>+ NEW PORTFOLIO</strong> to get started.</div>';
    document.getElementById('positionsPanel').style.display = 'none';
    return;
  }
  var html = explainer + sourceIndicator + importBanner + summary + unassignedBanner + '<div class="port-grid">';
  portfolios.forEach(function(p) {
    // Positions: source of truth for open/live state (positionManager)
    var openCount = journalManager.getOpenTrades(p.id).length;
    // Realized stats: from journalManager (historical closed trades only)
    var jStats = journalManager.getStats(p.id);
    var linked = rec.perPortfolio[String(p.id)] || rec.perPortfolio[p.id] || { linkedTradeCount:0, openLinked:0, closedLinked:0 };
    if (_portfolioRiskDebugEnabled()) console.debug('[PORTFOLIO-DIAG] portfolio card', {
      portfolioId: p.id, name: p.name,
      openPositions: openCount,
      linkedTradeCount: linked.linkedTradeCount,
      openLinked: linked.openLinked,
      closedLinked: linked.closedLinked
    });
    var pnlColor = jStats.totalPnL > 0 ? 'var(--gr)' : jStats.totalPnL < 0 ? 'var(--rd)' : 'var(--tx)';
    var pnlStr = jStats.totalPnL !== 0 ? (jStats.totalPnL >= 0 ? '+' : '') + '$' + jStats.totalPnL.toFixed(2) : '--';
    var rawType = p.type || p.description || '';
    var typeLabel = rawType ? String(rawType).replace(/^type=/, '').toUpperCase() : 'PORTFOLIO';
    var typeClass = p.type ? String(p.type) : 'portfolio';
    html += '<div class="port-card type-' + escHtml(typeClass) + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div><div class="port-name">' + escHtml(p.name) + '</div>' +
        '<div class="port-type">' + escHtml(typeLabel) + '</div></div>' +
        '<button data-pid="' + p.id + '" onclick="deletePortfolio(this.dataset.pid)" ' +
          'style="background:transparent;border:1px solid var(--b0);border-radius:4px;color:var(--tx3);font-family:var(--M);font-size:8px;padding:2px 7px;cursor:pointer">DEL</button>' +
      '</div>' +
      '<div class="port-meta">' +
        portStat('OPEN POSITIONS', openCount, openCount > 0 ? 'var(--am)' : 'var(--tx2)') +
        portStat('REALIZED P&L', pnlStr, pnlColor) +
        portStat('WIN RATE', jStats.closed ? jStats.winRate + '%' : '--', jStats.winRate >= 50 ? 'var(--gr)' : 'var(--tx2)') +
        portStat('CLOSED TRADES', jStats.closed, 'var(--tx2)') +
      '</div>' +
      '<div class="port-meta" style="margin-top:6px">' +
        portStat('LINKED JOURNAL', linked.linkedTradeCount, 'var(--tx2)') +
        portStat('OPEN LINKED', linked.openLinked, linked.openLinked > 0 ? 'var(--am)' : 'var(--tx2)') +
        portStat('CLOSED LINKED', linked.closedLinked, 'var(--tx2)') +
      '</div>' +
      '<div class="port-actions">' +
        '<button data-pid="' + p.id + '" onclick="showPositionsPanel(this.dataset.pid)" ' +
          'style="flex:1;background:var(--bg3);border:1px solid var(--b0);border-radius:6px;color:var(--tx);font-family:var(--M);font-size:9px;font-weight:700;padding:7px;cursor:pointer;letter-spacing:.04em">VIEW POSITIONS (' + openCount + ')</button>' +
        '<button data-pid="' + p.id + '" onclick="viewLinkedTradesInJournal(this.dataset.pid)" ' +
          'style="flex:1;background:var(--bg3);border:1px solid var(--b0);border-radius:6px;color:var(--tx);font-family:var(--M);font-size:9px;font-weight:700;padding:7px;cursor:pointer;letter-spacing:.04em">VIEW LINKED TRADES IN JOURNAL (' + linked.linkedTradeCount + ')</button>' +
        '<button data-pid="' + p.id + '" onclick="showView(\'journal\');showAddTradeForm(this.dataset.pid)" ' +
          'style="flex:1;background:var(--pu);border:none;border-radius:6px;color:#fff;font-family:var(--M);font-size:9px;font-weight:700;padding:7px;cursor:pointer;letter-spacing:.04em">+ LOG TRADE</button>' +
      '</div>' +
      '<div style="margin-top:8px;font-size:8px;font-family:var(--M);color:var(--tx3)">Created ' + new Date(p.createdAt).toLocaleDateString() + '</div>' +
    '</div>';
  });
  html += '</div>';
  el.innerHTML = html;
}

// Read-only reconciliation between Portfolio (current open positions) and
// Trading Journal (full historical record). Does NOT mutate any trade or
// portfolio. Safe to call from console: getPortfolioJournalReconciliation().
function getPortfolioJournalReconciliation() {
  var all = (typeof journalManager !== 'undefined' && journalManager.getAll) ? journalManager.getAll() : [];
  var portfolios = (typeof portfolioManager !== 'undefined' && portfolioManager.getAll) ? portfolioManager.getAll() : [];
  var validIds = {};
  portfolios.forEach(function(p) { validIds[String(p.id)] = true; });
  var open = 0, closed = 0, assigned = 0, unassigned = 0;
  var perPortfolio = {};
  portfolios.forEach(function(p) { perPortfolio[String(p.id)] = { linkedTradeCount:0, openLinked:0, closedLinked:0 }; });
  all.forEach(function(t) {
    var isOpen = (t.status === 'OPEN' || t.status === 'PARTIAL');
    if (isOpen) open++; else if (t.status === 'CLOSED') closed++;
    var pid = t.portfolioId;
    var pidStr = pid != null ? String(pid) : null;
    if (pidStr != null && validIds[pidStr]) {
      assigned++;
      var slot = perPortfolio[pidStr];
      if (slot) {
        slot.linkedTradeCount++;
        if (isOpen) slot.openLinked++;
        else if (t.status === 'CLOSED') slot.closedLinked++;
      }
    } else {
      unassigned++;
    }
  });
  return {
    totalJournalTrades: all.length,
    openJournalTrades: open,
    closedJournalTrades: closed,
    portfolioCount: portfolios.length,
    assignedTradeCount: assigned,
    unassignedTradeCount: unassigned,
    perPortfolio: perPortfolio
  };
}
window.getPortfolioJournalReconciliation = getPortfolioJournalReconciliation;

function viewLinkedTradesInJournal(portfolioId) {
  var pidStr = String(portfolioId);
  var linked = (typeof journalManager !== 'undefined' && journalManager.getAll)
    ? journalManager.getAll().filter(function(t) { return String(t.portfolioId) === pidStr; })
    : [];
  console.log('[PORTFOLIO-DIAG] linked trades for portfolio', portfolioId, '— count:', linked.length, linked.map(function(t){ return { id:t.id, ticker:t.ticker, status:t.status }; }));
  showView('journal');
  setTimeout(function() {
    var sel = document.getElementById('jFilterPortfolio');
    if (sel) { sel.value = pidStr; renderPortfolioJournalView(); }
  }, 0);
}
window.viewLinkedTradesInJournal = viewLinkedTradesInJournal;
