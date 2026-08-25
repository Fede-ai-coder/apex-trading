// ── Patched wrappers: extend existing functions with remote calls ──

// Override jAddTrade to also push to backend
var _jAddTradeOrig = jAddTrade;
jAddTrade = function(trade) {
  var id = _jAddTradeOrig(trade);
  // Fire-and-forget remote save
  jSaveRemote(Object.assign({}, jLoad().find(function(t){return t.id===id;})));
  return id;
};

// Override jUpdateTrade to also update backend
var _jUpdateTradeOrig = jUpdateTrade;
jUpdateTrade = function(id, updates) {
  var result = _jUpdateTradeOrig(id, updates);
  var trade = jLoad().find(function(t){return t.id===id;});
  if (trade) jUpdateRemote(id, trade);
  return result;
};

// Override jDeleteTrade to also delete from backend
var _jDeleteTradeOrig = jDeleteTrade;
jDeleteTrade = function(id) {
  var result = _jDeleteTradeOrig(id);
  jDeleteRemote(id);
  return result;
};

// ═══════════════════════════════════════════════════════════════════
// journalManager → Backend Sync Layer
//
// Patches only terminal-state journalManager methods so that
// apex_trades (the source of truth) stays in sync with the backend
// after each complete, user-visible state change.
//
// NOT patched — these fire mid-sequence within a single user action
// and would push incomplete trade state to the backend:
//   addAdjustment      (before legs are rolled)
//   applyRollLegs      (before pnLAfter is set)
//   updateAdjustmentPnLAfter (before async snapshot arrives)
//   updateLive         (real-time Greeks, fires every DXLink tick)
//
// setAdjustmentSnapshot is the single terminal sync point for every
// adjustment type (NOTE / ROLL / TRANSFORM / ADD_LEG / REMOVE_LEG /
// PARTIAL_CLOSE). It fires once, asynchronously, after all mutations
// and the snapshot build are complete.
// ═══════════════════════════════════════════════════════════════════

// Strips the volatile real-time live field and normalises id to
// string before any backend call. live carries streaming Greeks that
// change every DXLink tick and have no place in journal records.
// String(id) makes numeric Date.now() ids safe for a backend that
// was designed for string ids.
function _tradeForBackend(trade) {
  var t = Object.assign({}, trade);
  delete t.live;
  t.id = String(t.id);
  var pid = _resolveTradePortfolioId(t);
  if (pid != null) {
    t.portfolioId = pid;
    t.portfolio_id = pid;
  }
  if (Array.isArray(t.legs)) {
    t.legs = t.legs.map(function(leg) {
      var l = normalizeTradeOptionLegAliases(t, leg);
      l.option_type = l.optionType || l.type || null;
      l.expiration_date = l.expiration || l.expiry || null;
      l.expiry_date = l.expiry || l.expiration || null;
      l.strike_price = l.strike != null ? l.strike : null;
      l.streamer_symbol = l.streamerSymbol || null;
      l.option_symbol = l.optionSymbol || l.streamerSymbol || null;
      l.dxlink_symbol = l.dxlinkSymbol || l.streamerSymbol || null;
      l.occ_symbol = l.occSymbol || null;
      if (!l.action && l.side) l.action = l.side;
      if ((l.quantity == null || l.quantity === '') && l.qty != null) l.quantity = l.qty;
      return l;
    });
  }
  return t;
}

(function() {
  var jm = journalManager;

  function _jmSyncUpdate(id) {
    var trade = jm.getById(id);
    if (!trade) return null;
    console.log('[JOURNAL-SYNC] update trade', String(id));
    // Expose the backend PUT promise so an awaiting caller (e.g. submitTrade /
    // portfolio assignment) can gate its success toast on a confirmed backend
    // write instead of assuming success. Fire-and-forget callers are unaffected.
    var p = jUpdateRemote(String(id), _tradeForBackend(trade));
    jm._lastBackendWrite = p;
    return p;
  }

  // ── add ──────────────────────────────────────────────────────────
  // Terminal: new trade, complete state at creation.
  var _origAdd = jm.add.bind(jm);
  jm.add = function(trade) {
    var result = _origAdd(trade);
    console.log('[JOURNAL-SYNC] add trade', String(result.id));
    // jm.add stays synchronous and still returns the trade (callers rely on
    // result.id). The backend POST promise is stashed on jm._lastBackendWrite so
    // submitTrade can await the structured outcome and toast accordingly.
    jm._lastBackendWrite = jSaveRemote(_tradeForBackend(result));
    return result;
  };

  // ── update ───────────────────────────────────────────────────────
  // Terminal: explicit user edit submitted from form.
  var _origUpdate = jm.update.bind(jm);
  jm.update = function(id, data) {
    var result = _origUpdate(id, data);
    _jmSyncUpdate(id);
    return result;
  };

  // ── close ────────────────────────────────────────────────────────
  // Terminal: exitSnapshot is already embedded inside the trade when
  // close() calls _save(), so the PUT carries the complete record.
  var _origClose = jm.close.bind(jm);
  jm.close = function(id, realizedPnL, exitDate, closeNotes, greeksAtClose, exitSnapshot) {
    var result = _origClose(id, realizedPnL, exitDate, closeNotes, greeksAtClose, exitSnapshot);
    _jmSyncUpdate(id);
    return result;
  };

  // ── closeLegs ────────────────────────────────────────────────────
  // Terminal for partial-close (some legs remain open — no snapshot
  // follows). For all-legs-close, setExitSnapshot fires afterwards
  // as the final sync point.
  var _origCloseLegs = jm.closeLegs.bind(jm);
  jm.closeLegs = function(tradeId, legCloses) {
    var result = _origCloseLegs(tradeId, legCloses);
    _jmSyncUpdate(tradeId);
    return result;
  };

  // ── setExitSnapshot ───────────────────────────────────────────────
  // Terminal for all-legs-close. The original has a first-write-wins
  // guard (returns early if exitSnapshot already set), so this fires
  // at most once per trade.
  var _origSetExitSnapshot = jm.setExitSnapshot.bind(jm);
  jm.setExitSnapshot = function(tradeId, snapshot) {
    _origSetExitSnapshot(tradeId, snapshot);
    _jmSyncUpdate(tradeId);
  };

  // ── setAdjustmentSnapshot ─────────────────────────────────────────
  // Terminal for every adjustment flow. addAdjustment / applyRollLegs
  // / updateAdjustmentPnLAfter are all intermediate — this is the
  // single PUT that carries the fully-mutated, snapshotted trade.
  // First-write-wins guard in the original ensures it fires once per
  // adjustment.
  var _origSetAdjustmentSnapshot = jm.setAdjustmentSnapshot.bind(jm);
  jm.setAdjustmentSnapshot = function(tradeId, adjustmentId, snapshot) {
    _origSetAdjustmentSnapshot(tradeId, adjustmentId, snapshot);
    _jmSyncUpdate(tradeId);
  };

  // ── patchSnapshotTech ─────────────────────────────────────────────
  // Fires at most once per trade event (2.5 s delay, via
  // _scheduleSnapshotTechRetry) when DXLink candle data arrives after
  // the snapshot was written. Only syncs when the patch actually ran
  // (patchSnapshotTech returns false if trade or snapshot is missing).
  var _origPatchSnapshotTech = jm.patchSnapshotTech.bind(jm);
  jm.patchSnapshotTech = function(tradeId, snapshotKey, techData) {
    var patched = _origPatchSnapshotTech(tradeId, snapshotKey, techData);
    if (patched) _jmSyncUpdate(tradeId);
    return patched;
  };

  // ── remove ────────────────────────────────────────────────────────
  var _origRemove = jm.remove.bind(jm);
  jm.remove = function(id) {
    var result = _origRemove(id);
    console.log('[JOURNAL-SYNC] remove trade', String(id));
    jDeleteRemote(String(id));
    return result;
  };

  // ── removeByPortfolio ─────────────────────────────────────────────
  // Snapshot ids before removal — they are gone from jm after the call.
  var _origRemoveByPortfolio = jm.removeByPortfolio.bind(jm);
  jm.removeByPortfolio = function(portfolioId) {
    var ids = jm.getByPortfolio(portfolioId).map(function(t) { return String(t.id); });
    var result = _origRemoveByPortfolio(portfolioId);
    ids.forEach(function(id) {
      console.log('[JOURNAL-SYNC] remove trade (portfolio delete)', id);
      jDeleteRemote(id);
    });
    return result;
  };
})();
