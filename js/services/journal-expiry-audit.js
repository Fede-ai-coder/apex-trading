// ── [JOURNAL-EXPIRY-AUDIT] — gated expiry/option-symbol preservation diagnostics ─
// This verbose audit dumps full per-leg expiry + option symbol data on every
// localStorage write/read and on every trade add/submit. That floods the
// preview/production console (it runs once per trade, many times per session)
// even though it is purely diagnostic — it does not affect Journal persistence,
// localStorage behavior, or any Greeks/expiry preservation logic.
//
// It is DISABLED by default. Enable it manually from the browser console with:
//   window.APEX_DEBUG_JOURNAL_EXPIRY = true
//   localStorage.setItem('APEX_DEBUG_JOURNAL_EXPIRY', '1')   // persists across reloads
function _journalExpiryAuditEnabled() {
  try { if (typeof window !== 'undefined' && window.APEX_DEBUG_JOURNAL_EXPIRY === true) return true; } catch (_e1) {}
  try { if (typeof localStorage !== 'undefined' && localStorage.getItem('APEX_DEBUG_JOURNAL_EXPIRY') === '1') return true; } catch (_e2) {}
  return false;
}

function journalTradeLegExpiryAudit(label, trade) {
  try {
    if (!_journalExpiryAuditEnabled()) return;
    var t = trade || {};
    var legs = (t.legs || []).map(function(leg, idx) {
      return {
        legIndex: idx,
        expiry: leg && leg.expiry != null ? leg.expiry : null,
        expiration: leg && leg.expiration != null ? leg.expiration : null,
        expirationDate: leg && leg.expirationDate != null ? leg.expirationDate : null,
        streamerSymbol: leg && leg.streamerSymbol != null ? leg.streamerSymbol : null,
        optionSymbol: leg && leg.optionSymbol != null ? leg.optionSymbol : null
      };
    });
    // Verbose dump on console.debug (filtered out of the default console level)
    // rather than console.log so it never appears in a normal preview console.
    console.debug('[JOURNAL-EXPIRY-AUDIT] ' + label, JSON.stringify({
      tradeId: t.id || t.tradeId || null,
      ticker: t.ticker || t.symbol || null,
      tradeExpiry: t.expiry || t.expiryDate || t.expiration || t.expirationDate || null,
      legs: legs
    }));
  } catch (_auditErr) {}
}
