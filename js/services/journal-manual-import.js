// ── Manual, console-only cross-host Journal trade import ──────────────────────
// localStorage is per-origin, so the ~96 trades on main production are invisible
// to the dev backend (which can be empty after a restore). This uploads a pasted
// trade array (or its JSON string) to the backend so the dev Portfolio cards can
// reconcile against real trades. It is NEVER called automatically — not on
// startup, not on Portfolio open, not on Journal open — only from the console.
//
//   main production console: copy(localStorage.getItem('apex_trades'))
//   deploy-preview console:  await window.apexImportJournalTradesJson(`PASTE_JSON_TRADES`)
//   then verify:             await apexDebugPortfolioState()   // tradesCount > 0
//
// Reuses the existing Journal backend path (jSaveRemote + _tradeForBackend), which
// preserves id / portfolioId / status / createdAt / legs / ticker|symbol and every
// other field (only the transient .live blob is dropped, id is stringified). The
// POST body carries portfolioId under every alias (portfolioId + portfolio_id, and
// portfolio when absent) so a backend that persists snake_case keeps the link.
// It never mutates the input trade.portfolioId, never touches positions/portfolios,
// never clears or removes any localStorage key, and never calls
// jMigrateApexTradesToBackend(). After import it pulls the backend via
// _jSyncJournalFromBackend() (which normalizes portfolioId from aliases) so
// journalManager is populated, then re-renders the Portfolio view if it is active.
//
// Re-import repair: a trade whose id already exists on the backend BUT is missing a
// portfolioId is UPDATED (PUT) to add the correct portfolioId — counted as
// `updated`, not skipped as `duplicate`. A trade that already has a portfolioId is
// left untouched and counted `duplicate`. Returns
//   { ok, imported, updated, duplicate, failed, errors, backendTradeCount,
//     tradesMissingPortfolioIdAfterImport }.

// Build the POST body for an imported trade: preserve all fields, attach
// portfolioId under every alias so the backend persists at least one. Never
// mutates the source trade.
function _journalImportPayload(t) {
  var body = _tradeForBackend(t);   // shallow clone; preserves fields, drops .live, stringifies id
  var pid = _resolveTradePortfolioId(t);
  if (pid != null) {
    body.portfolioId  = pid;
    body.portfolio_id = pid;
    if (body.portfolio == null) body.portfolio = pid;   // alias only; never clobber an existing value
  }
  return body;
}

// PUT a COMPLETE trade onto an existing backend record to repair a missing
// portfolioId. The backend's PUT /journal/trades/:id is a full replace (it
// enforces NOT NULL columns like trades.ticker), so a partial { portfolioId }
// body would fail — we send the whole trade via _journalImportPayload(), which
// preserves id/ticker|symbol/strategy/status/dates/legs/notes/pnl and attaches the
// portfolioId aliases. Returns true on success. Never mutates the source trade.
async function _journalRepairPortfolioIdRemote(id, trade) {
  try {
    await ttCall('/journal/trades/' + encodeURIComponent(String(id)), {
      method: 'PUT',
      body: _journalImportPayload(trade)
    });
    return true;
  } catch (e) {
    console.warn('[JOURNAL IMPORT JSON] portfolioId repair PUT failed for id=' + id + ':', e.message);
    return false;
  }
}

async function apexImportJournalTradesJson(jsonOrArray, opts) {
  opts = opts || {};
  var EMPTY = { ok:false, imported:0, updated:0, duplicate:0, failed:0, errors:[], backendTradeCount:null, tradesMissingPortfolioIdAfterImport:null };
  var list = jsonOrArray;
  if (typeof jsonOrArray === 'string') {
    try { list = JSON.parse(jsonOrArray); }
    catch (e) {
      console.error('[JOURNAL IMPORT JSON] invalid JSON string:', e.message);
      return Object.assign({}, EMPTY, { errors:['invalid JSON: ' + e.message] });
    }
  }
  if (!Array.isArray(list)) {
    console.error('[JOURNAL IMPORT JSON] input is not an array of trades. ' +
      'Pass an array, or the JSON string of localStorage["apex_trades"] from main production.');
    return Object.assign({}, EMPTY, { errors:['input is not an array'] });
  }
  if (typeof BACKEND === 'undefined' || !BACKEND || !S.backendKey) {
    console.warn('[JOURNAL IMPORT JSON] backend unavailable (no BACKEND/x-api-key) — aborting. No local data touched.');
    return Object.assign({}, EMPTY, { errors:['backend_unavailable'] });
  }
  if (!list.length) {
    console.warn('[JOURNAL IMPORT JSON] empty array — nothing to import.');
    return Object.assign({}, EMPTY, { ok:true });
  }
  // Read existing backend trades so we can: skip true duplicates, and REPAIR
  // existing trades that are missing a portfolioId (rather than duplicating).
  var existing = {};   // id -> backend trade
  try {
    var r0 = await ttCall('/journal/trades');
    if (r0 && Array.isArray(r0.trades)) r0.trades.forEach(function(t) { if (t && t.id != null) existing[String(t.id)] = t; });
  } catch (e) {
    console.warn('[JOURNAL IMPORT JSON] could not read existing backend trades (treating all as new):', e.message);
  }
  var imported = 0, updated = 0, duplicate = 0, failed = 0, errors = [];
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      failed++; errors.push('item ' + i + ': not a trade object'); continue;
    }
    var sid    = t.id != null ? String(t.id) : null;
    var inPid  = _resolveTradePortfolioId(t);
    var exTrade = sid != null ? existing[sid] : null;
    if (exTrade) {
      var exPid = _resolveTradePortfolioId(exTrade);
      if (exPid != null) { duplicate++; continue; }            // already linked — leave untouched
      if (inPid != null) {                                     // repair: PUT the full trade w/ portfolioId
        var ok = await _journalRepairPortfolioIdRemote(sid, t);
        if (ok) { updated++; exTrade.portfolio_id = inPid; }   // reflect repair in local existing map
        else { failed++; errors.push((t.ticker || t.symbol || ('id=' + sid)) + ': portfolioId repair failed'); }
      } else { duplicate++; }                                  // nothing to add
      continue;
    }
    // New trade: POST with portfolioId carried under every alias.
    var sent = await jSaveRemote(_journalImportPayload(t));
    if (sent === true || (sent && sent.ok)) { imported++; if (sid != null) existing[sid] = t; }
    else { failed++; errors.push((t.ticker || t.symbol || ('id=' + sid)) + ': remote save failed'); }
  }
  // Pull the backend into journalManager (normalizes portfolioId from aliases).
  try { await _jSyncJournalFromBackend(); } catch (e) {}
  // Report authoritative backend count + how many still lack a portfolioId.
  var backendTradeCount = null, tradesMissingPortfolioIdAfterImport = null;
  try {
    var rc = await ttCall('/journal/trades');
    if (rc && Array.isArray(rc.trades)) {
      backendTradeCount = rc.trades.length;
      tradesMissingPortfolioIdAfterImport = rc.trades.filter(function(t) { return _resolveTradePortfolioId(t) == null; }).length;
    }
  } catch (e) {}
  if (typeof _activeView !== 'undefined' && _activeView === 'portfolio') {
    try { renderPortfolioView(); } catch (e) {}
  }
  var report = { ok: failed === 0, imported: imported, updated: updated, duplicate: duplicate, failed: failed,
    errors: errors, backendTradeCount: backendTradeCount, tradesMissingPortfolioIdAfterImport: tradesMissingPortfolioIdAfterImport };
  var msg = 'Import completed: ' + imported + ' imported, ' + updated + ' updated, ' + duplicate + ' already present, ' + failed + ' failed.';
  console.log('[JOURNAL IMPORT JSON] ' + msg, report);
  try { showToast(msg, failed ? 'warn' : 'ok'); } catch (e) {}
  return report;
}
