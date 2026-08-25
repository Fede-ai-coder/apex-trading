// ══════════════════════════════════════════════════════════════
// JOURNAL REMOTE PERSISTENCE — v1
// Local localStorage is always source of truth for reads.
// Backend (Railway) is written to on every save/update/delete.
// On journal open: pull from backend → merge (backend wins on conflict).
// ══════════════════════════════════════════════════════════════

var jSyncing = false;
var jLastSync = null;

// ── Push single trade to backend ─────────────────────────────────
// Persist a new trade to the backend and return a STRUCTURED outcome so callers
// can distinguish a confirmed backend save from a local-only fallback. Never
// throws — the local copy is already persisted by journalManager before this runs.
//
//   backend confirmed → { ok:true,  source:'backend', configured:true,  trade }
//   backend failed     → { ok:false, source:'local',   configured:true,  error, status, trade }
//   not configured     → { ok:false, source:'local',   configured:false, trade }
//
// The local trade is ALWAYS preserved regardless of backend outcome (req: never
// break local/cache use). Logs with explicit tags so the console shows exactly
// whether the row reached the DB.
async function jSaveRemote(trade) {
  if (!BACKEND || !S.backendKey) {   // no backend configured → pure local, not a failure
    console.log('[JOURNAL SAVE][LOCAL ONLY] backend not configured — trade kept local', trade && trade.id);
    _recordJournalBackendSave({ op:'save', ok:false, source:'local', configured:false, id: trade && trade.id, reason:'not_configured' });
    return { ok:false, source:'local', configured:false, trade: trade };
  }
  try {
    var r = await ttCall('/journal/trades', {
      method: 'POST',
      body: trade,
    });
    if (r && r.id) {
      console.log('[JOURNAL SAVE][BACKEND OK] id=' + r.id);
      // FF_BACKEND_OFFLOAD_V1: optional enriched dry-run for comparison only.
      // Does NOT replace persistence; save:false is forwarded to backend.
      if (ffBackendOffloadV1()) { jEnrichedDryRun(trade).catch(function(){}); }
      _recordJournalBackendSave({ op:'save', ok:true, source:'backend', configured:true, id: r.id });
      return { ok:true, source:'backend', configured:true, trade: r };
    }
    // 2xx but no id → backend did not persist a record. Treat as a failure so the
    // UI never claims a backend save the DB cannot confirm.
    console.warn('[JOURNAL SAVE][BACKEND FAILED] POST /journal/trades returned no id');
    _recordJournalBackendSave({ op:'save', ok:false, source:'local', configured:true, id: trade && trade.id, reason:'no_id', status:200 });
    return { ok:false, source:'local', configured:true, error:'backend returned no id', status:200, trade: trade };
  } catch(e) {
    var status = _httpStatusFromError(e);
    console.warn('[JOURNAL SAVE][BACKEND FAILED]', 'status=' + status, (e && e.message) || e);
    _recordJournalBackendSave({ op:'save', ok:false, source:'local', configured:true, id: trade && trade.id, reason:(e && e.message) || String(e), status: status });
    return { ok:false, source:'local', configured:true, error:(e && e.message) || String(e), status: status, trade: trade };
  }
}

// FF_BACKEND_OFFLOAD_V1: fire-and-forget enriched dry-run.
// Compares frontend snapshot against backend enrichment (IVR / VIX family / beta /
// alignment / leg greeks+quotes). Backend is told save:false; nothing is persisted.
async function jEnrichedDryRun(frontendTrade) {
  _apexBackendOffloadDiag.journalEnrichedDryRunLastAt = Date.now();
  try {
    var body = Object.assign({}, frontendTrade, { save: false });
    var resp = await ttCall('/journal/trades/enriched', { method: 'POST', body: body });
    var warnings = [];
    function _diff(label, a, b) {
      var aN = (a == null || a === '') ? null : a;
      var bN = (b == null || b === '') ? null : b;
      if (aN == null && bN == null) return;
      if (typeof aN === 'number' && typeof bN === 'number') {
        if (Math.abs(aN - bN) > Math.max(0.01, Math.abs(aN) * 0.01)) {
          warnings.push(label + ': frontend=' + aN + ' backend=' + bN);
        }
      } else if (JSON.stringify(aN) !== JSON.stringify(bN)) {
        warnings.push(label + ': frontend=' + JSON.stringify(aN) + ' backend=' + JSON.stringify(bN));
      }
    }
    var fe = frontendTrade || {};
    var enrichment = resp && resp.trade && resp.trade.enrichment ? resp.trade.enrichment : {};
    var diagnostics = resp && resp.enrichmentDiagnostics ? resp.enrichmentDiagnostics : {};
    _diff('ivr', fe.ivRank != null ? fe.ivRank : (fe.ivr != null ? fe.ivr : null),
                 enrichment.ivr != null ? enrichment.ivr : null);
    _diff('vixFamily', fe.vixFamily || null, enrichment.vixFamily || null);
    var beBeta = enrichment.beta && typeof enrichment.beta === 'object' && enrichment.beta.beta != null
      ? enrichment.beta.beta : (enrichment.beta != null ? enrichment.beta : null);
    _diff('beta', fe.beta != null ? fe.beta : null, beBeta);
    _diff('alignment', fe.portfolioAlignment || fe.alignment || null, enrichment.alignment || null);
    var feLegs = Array.isArray(fe.legs) ? fe.legs : [];
    var beLegs = Array.isArray(enrichment.legSnapshots) ? enrichment.legSnapshots : [];
    for (var i = 0; i < Math.max(feLegs.length, beLegs.length); i++) {
      var fl = feLegs[i] || {}; var bl = beLegs[i] || {};
      var blG = bl.greeks || {}; var blQ = bl.quote || {};
      _diff('leg['+i+'].delta', fl.delta, blG.delta);
      _diff('leg['+i+'].gamma', fl.gamma, blG.gamma);
      _diff('leg['+i+'].theta', fl.theta, blG.theta);
      _diff('leg['+i+'].vega', fl.vega, blG.vega);
      _diff('leg['+i+'].bid', fl.bid, blQ.bid);
      _diff('leg['+i+'].ask', fl.ask, blQ.ask);
      _diff('leg['+i+'].mark', fl.mark, blQ.mark);
    }
    _apexBackendOffloadDiag.journalEnrichedDryRunLastOk = !!(resp && resp.ok);
    _apexBackendOffloadDiag.journalEnrichedDryRunWarnings = warnings.concat(Array.isArray(diagnostics.warnings) ? diagnostics.warnings : []);
    console.log('[FF_BACKEND_OFFLOAD_V1] journal enriched dry-run', {
      ok: !!(resp && resp.ok),
      saved: !!(resp && resp.saved),
      warnings: _apexBackendOffloadDiag.journalEnrichedDryRunWarnings.length,
      details: _apexBackendOffloadDiag.journalEnrichedDryRunWarnings
    });
  } catch (e) {
    _apexBackendOffloadDiag.journalEnrichedDryRunLastOk = false;
    _apexBackendOffloadDiag.journalEnrichedDryRunWarnings = [e && e.message || String(e)];
    console.warn('[FF_BACKEND_OFFLOAD_V1] journal enriched dry-run failed', e && e.message || e);
  }
}

// ── Update single trade on backend ───────────────────────────────
// Structured outcome, same contract as jSaveRemote. Used by the portfolio
// assignment / edit paths so a failed PUT surfaces a warning instead of a
// silent "assigned". Never throws — local state is already updated.
async function jUpdateRemote(id, updates) {
  if (!BACKEND || !S.backendKey) {
    console.log('[JOURNAL SAVE][LOCAL ONLY] backend not configured — update kept local', id);
    _recordJournalBackendSave({ op:'update', ok:false, source:'local', configured:false, id: String(id), reason:'not_configured' });
    return { ok:false, source:'local', configured:false, id: String(id) };
  }
  try {
    var r = await ttCall('/journal/trades/' + id, {
      method: 'PUT',
      body: updates,
    });
    console.log('[JOURNAL SAVE][BACKEND OK] update id=' + String(id));
    _recordJournalBackendSave({ op:'update', ok:true, source:'backend', configured:true, id: String(id) });
    return { ok:true, source:'backend', configured:true, id: String(id), trade: r };
  } catch(e) {
    var status = _httpStatusFromError(e);
    console.warn('[JOURNAL SAVE][BACKEND FAILED]', 'update id=' + String(id), 'status=' + status, (e && e.message) || e);
    _recordJournalBackendSave({ op:'update', ok:false, source:'local', configured:true, id: String(id), reason:(e && e.message) || String(e), status: status });
    return { ok:false, source:'local', configured:true, id: String(id), error:(e && e.message) || String(e), status: status };
  }
}

// ── Delete trade from backend ─────────────────────────────────────
async function jDeleteRemote(id) {
  if (!S.backendKey && !BACKEND) {
    console.log('[JOURNAL SAVE][LOCAL ONLY] backend not configured — delete kept local', String(id));
    _recordJournalBackendSave({ op:'delete', ok:false, source:'local', configured:false, id: String(id), reason:'not_configured' });
    return true;
  }
  try {
    var headers = {};
    if (S.ttSessionId) headers['x-session-id'] = S.ttSessionId;
    if (S.backendKey) headers['x-api-key'] = S.backendKey;
    var path = '/journal/trades/' + encodeURIComponent(String(id));
    var r = await fetch(BACKEND + path, {
      method: 'DELETE',
      headers: headers,
      signal: AbortSignal.timeout(20000)
    });
    if (typeof _recordBackendApiAuthResult === 'function') _recordBackendApiAuthResult(path, r.status);
    if (r.status === 404) {
      // Already gone on the backend — the delete goal is satisfied.
      console.log('[JOURNAL SAVE][BACKEND OK] Trade ' + String(id) + ' already deleted remotely');
      _recordJournalBackendSave({ op:'delete', ok:true, source:'backend', configured:true, id: String(id), status:404 });
      return true;
    }
    if (r.ok) return true;
    var raw = '';
    try { raw = (await r.text() || '').slice(0, 160); } catch(_readErr) {}
    console.warn('[JOURNAL SAVE][BACKEND FAILED] delete id=' + String(id), 'HTTP ' + r.status + (raw ? ': ' + raw : ''));
    _recordJournalBackendSave({ op:'delete', ok:false, source:'local', configured:true, id: String(id), reason:raw || ('HTTP ' + r.status), status:r.status });
    return false;
  } catch(e) {
    var msg = e && e.message ? e.message : String(e);
    if (/\b404\b|not found/i.test(msg)) {
      console.log('[JOURNAL SAVE][BACKEND OK] Trade ' + String(id) + ' already deleted remotely');
      _recordJournalBackendSave({ op:'delete', ok:true, source:'backend', configured:true, id: String(id), status:404 });
      return true;
    }
    console.warn('[JOURNAL SAVE][BACKEND FAILED] delete id=' + String(id), msg);
    _recordJournalBackendSave({ op:'delete', ok:false, source:'local', configured:true, id: String(id), reason:msg, status:_httpStatusFromError(e) });
    return false;
  }
}

// ── Bulk sync: local → backend (POST /journal/sync) ──────────────
async function jSyncToBackend() {
  if (jSyncing) return;
  jSyncing = true;
  try {
    var trades = jLoad();
    if (!trades.length) { jSyncing = false; return; }
    var r = await ttCall('/journal/sync', {
      method: 'POST',
      body: { trades: trades },
    });
    if (r && r.total != null) {
      jLastSync = new Date().toISOString();
      console.log('[JOURNAL] Sync OK: created=' + r.created + ' updated=' + r.updated);
    }
  } catch(e) {
    console.warn('[JOURNAL] Sync failed:', e.message);
  }
  jSyncing = false;
}

// ── Pull from backend → merge into localStorage ───────────────────
// Backend wins on id conflict (more recent updatedAt).
async function jLoadFromBackend() {
  if (isApexLocalDevEnv()) {
    console.log('[JOURNAL SYNC SKIP] local dev env (localhost/127.0.0.1/file) — backend Journal sync disabled');
    return false;
  }
  try {
    var r = await ttCall('/journal/trades');
    if (!r || !Array.isArray(r.trades)) return false;
    var remote = r.trades;
    if (!remote.length) return false;

    var local = jLoad();
    var localMap = {};
    local.forEach(function(t){ localMap[t.id] = t; });

    var changed = 0;
    remote.forEach(function(rt) {
      var lt = localMap[rt.id];
      // Take remote if: not in local, OR remote is newer
      if (!lt || (rt.updatedAt && lt.updatedAt && rt.updatedAt > lt.updatedAt)) {
        localMap[rt.id] = rt;
        changed++;
      }
    });

    if (changed > 0) {
      var merged = Object.values(localMap).sort(function(a,b){
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      jSave(merged);
      console.log('[JOURNAL] Pulled ' + remote.length + ' trades from backend, merged ' + changed + ' updates');
    }
    jLastSync = new Date().toISOString();
    return true;
  } catch(e) {
    console.warn('[JOURNAL] Pull from backend failed (using local):', e.message);
    return false;
  }
}
