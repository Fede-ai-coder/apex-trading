// ── [JOURNAL-PORTFOLIO-MAP-AUDIT] — gated mapping diagnostics ─────────────────
// Verbose per-leg audit output is DISABLED by default so preview/production
// consoles are not flooded on every Portfolio render / Greeks refresh / chart
// open / scanner flow.
//
// Enable the verbose audit manually from the browser console with either:
//   window.APEX_DEBUG_JOURNAL_MAP = true
//   localStorage.setItem('APEX_DEBUG_JOURNAL_MAP', '1')   // persists across reloads
//
// When the flag is OFF we still surface real anomalies (missing portfolioId /
// expiry / streamerSymbol / optionType, built-vs-selected symbol mismatch,
// unsupported leg shape) — but nothing when the mapping is clean.
function _journalMapAuditEnabled() {
  try { if (typeof window !== 'undefined' && window.APEX_DEBUG_JOURNAL_MAP === true) return true; } catch (_e1) {}
  try { if (typeof localStorage !== 'undefined' && localStorage.getItem('APEX_DEBUG_JOURNAL_MAP') === '1') return true; } catch (_e2) {}
  return false;
}

// Pure: derive a compact summary + anomaly list from per-leg diagnostics.
// `diags` is an array of optionLegScalarDiagnostics() results. Kept side-effect
// free so it can be unit-tested without a DOM/console.
function _journalMapAuditSummarize(t, diags) {
  t = t || {};
  diags = diags || [];
  var anomalies = [];
  var portfolioIdMissing = (t.portfolioId == null || t.portfolioId === '');
  if (portfolioIdMissing) anomalies.push({ kind: 'missing-portfolioId', tradeId: t.id, ticker: t.ticker });
  var allLegsHaveExpiry = true;
  var allLegsHaveStreamerSymbol = true;
  diags.forEach(function (d) {
    d = d || {};
    var isOptionLeg = !!(d.type || d.optionType || d.right || d.strike != null);
    var hasExpiry = !!(d.expiry || d.expiration);
    var hasStreamer = !!(d.streamerSymbol || d.optionSymbol);
    var hasOptionType = !!(d.optionType || d.right);
    if (!hasExpiry) allLegsHaveExpiry = false;
    if (!hasStreamer) allLegsHaveStreamerSymbol = false;
    if (!isOptionLeg) {
      anomalies.push({ kind: 'unsupported-leg-shape', tradeId: t.id, legIndex: d.legIndex });
      return;
    }
    if (!hasExpiry)     anomalies.push({ kind: 'missing-expiry',         tradeId: t.id, legIndex: d.legIndex });
    if (!hasStreamer)   anomalies.push({ kind: 'missing-streamerSymbol', tradeId: t.id, legIndex: d.legIndex });
    if (!hasOptionType) anomalies.push({ kind: 'missing-optionType',     tradeId: t.id, legIndex: d.legIndex });
    // Declared streamer symbol exists but the resolver did not accept it
    // (preferredSymbol fell back to a freshly built candidate) → real mismatch.
    var declared = d.streamerSymbol || d.optionSymbol || null;
    if (declared && d.preferredSymbol && declared !== d.preferredSymbol) {
      anomalies.push({ kind: 'symbol-mismatch', tradeId: t.id, legIndex: d.legIndex, selected: declared, expected: d.preferredSymbol });
    }
  });
  return {
    summary: {
      tradeId: t.id,
      ticker: t.ticker,
      legsCount: diags.length,
      portfolioId: portfolioIdMissing ? 'missing' : 'present',
      allLegsHaveExpiry: allLegsHaveExpiry,
      allLegsHaveStreamerSymbol: allLegsHaveStreamerSymbol,
      anomalyCount: anomalies.length
    },
    anomalies: anomalies
  };
}

// Logging wrapper: verbose console.debug when the debug flag is on, otherwise a
// single compact anomaly warning only when something is actually wrong.
function _journalMapAudit(t, legs) {
  try {
    var enabled = _journalMapAuditEnabled();
    var diags = (legs || []).map(function (leg, idx) {
      return optionLegScalarDiagnostics(t.ticker, t.id, idx, leg);
    });
    var res = _journalMapAuditSummarize(t, diags);
    if (enabled) {
      // Verbose: full per-leg diagnostics, but on console.debug (filtered out of
      // the default console level) rather than console.log.
      console.debug('[JOURNAL-PORTFOLIO-MAP-AUDIT] _tradeAsPosition', JSON.stringify({
        summary: res.summary,
        anomalies: res.anomalies,
        legs: diags
      }));
    } else if (res.anomalies.length) {
      // Quiet mode: surface anomalies only, as a compact summary — no full JSON.
      console.warn('[JOURNAL-PORTFOLIO-MAP-AUDIT] anomalies', JSON.stringify({
        summary: res.summary,
        anomalies: res.anomalies
      }));
    }
  } catch (_mapAuditErr) {}
}
