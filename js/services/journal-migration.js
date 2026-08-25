// ── One-time migration: apex_trades → backend ─────────────────────
// Called after successful login (doLogin / doReconnectTT) once
// S.backendKey is confirmed available. Reads all apex_trades entries,
// fetches existing backend ids, and POSTs only the missing ones.
// _tradeForBackend strips live and normalises id to string on each POST.
// localStorage is left intact — local remains source of truth.
//
// _jMigrationDone prevents re-running in the same session.
// A 401 from the backend leaves the flag false so the next login
// attempt retriggers the migration automatically.
var _jMigrationDone = false;

async function jMigrateApexTradesToBackend() {
  if (_jMigrationDone) return;
  // INTENTIONAL: this is the only Journal path still gated on the BROAD
  // preview-or-local predicate. It auto-UPLOADS local apex_trades to the backend,
  // so it must stay disabled on deploy previews (no auto-upload of local trades
  // from a preview). Read/pull paths (_jSyncJournalFromBackend / jLoadFromBackend)
  // use isApexLocalDevEnv() so previews CAN read backend trades.
  if (isApexPreviewOrLocalEnv()) {
    console.log('[JOURNAL SYNC SKIP] preview/local env — Journal auto-upload (migration) disabled');
    return;
  }
  if (!S.backendKey) {
    console.log('[JOURNAL-MIGRATE] No API key — skipping');
    return;
  }
  console.log('[JOURNAL-MIGRATE] Starting migration: apex_trades → backend');
  try {
    var existingIds = new Set();
    try {
      var r = (typeof _ttCallWithRetry === 'function')
        ? await _ttCallWithRetry('/journal/trades')
        : await ttCall('/journal/trades');
      console.log('[JOURNAL-DIAG] migration /journal/trades response keys:', r ? Object.keys(r) : 'null');
      console.log('[JOURNAL-DIAG] migration r.trades type:', Array.isArray(r && r.trades) ? 'array' : typeof (r && r.trades), '| length:', (r && Array.isArray(r.trades)) ? r.trades.length : 'N/A');
      if (r && Array.isArray(r.trades)) {
        r.trades.forEach(function(t) { existingIds.add(String(t.id)); });
        console.log('[JOURNAL-MIGRATE] Backend already has ' + existingIds.size + ' trade(s)');
        // Backend trades observed here must be MERGED into local journal state —
        // not only used to compute "0 to migrate". Otherwise a fresh browser
        // (empty localStorage) would see the backend trade during migration but
        // still render the Portfolio with zero positions if the later
        // /journal/trades sync fails transiently. Merge + record last-known-good.
        if (r.trades.length > 0 && typeof journalManager !== 'undefined' && journalManager.loadFromBackend) {
          var _mNorm = r.trades.map(_normalizeBackendTradePortfolioId);
          var _mMerged = journalManager.loadFromBackend(_mNorm);
          if (typeof _jRecordBackendSnapshot === 'function') _jRecordBackendSnapshot(_mNorm);
          console.log('[JOURNAL SYNC] OK count=' + r.trades.length + ' (observed during migration, merged ' + _mMerged + ' into local)');
        }
      } else {
        console.warn('[JOURNAL-DIAG] migration: unexpected /journal/trades shape:', JSON.stringify(r).substring(0, 200));
      }
    } catch(e) {
      var msg = e.message || '';
      // Auth not ready: leave _jMigrationDone false so the next login retriggers.
      if (msg.indexOf('401') !== -1 || msg.toLowerCase().indexOf('api-key') !== -1 || msg.toLowerCase().indexOf('unauthorized') !== -1) {
        console.warn('[JOURNAL-MIGRATE] Auth not ready — will retry after login:', msg);
        return;
      }
      console.warn('[JOURNAL-MIGRATE] Could not fetch existing backend trades:', msg);
    }

    var local   = journalManager.getAll();
    var pending = local.filter(function(t) {
      return t.id && !existingIds.has(String(t.id));
    });
    console.log('[JOURNAL-MIGRATE] ' + local.length + ' local, ' + pending.length + ' to migrate');

    var ok = 0, fail = 0;
    for (var i = 0; i < pending.length; i++) {
      var sent = await jSaveRemote(_tradeForBackend(pending[i]));
      // jSaveRemote now returns a structured {ok,...} outcome (older mocks may
      // still return a bare boolean) — treat either shape's success uniformly.
      if (sent === true || (sent && sent.ok)) ok++; else fail++;
    }
    console.log('[JOURNAL-MIGRATE] Complete — migrated: ' + ok + ', failed: ' + fail);
    _jMigrationDone = true;
  } catch(e) {
    console.warn('[JOURNAL-MIGRATE] Migration error:', e.message);
  }
}
