// Backend-owned portfolio option-leg enrichment.  The backend endpoint is the
// source of truth for reconstructing journal trades/current-risk legs and for
// resolving the exact Tastytrade/DXLink option symbols.  The frontend sends its
// current open positions only as diagnostic/fallback context; no journal trade,
// portfolioId, or trade id is mutated by this path.
async function fetchBackendPortfolioPositionsEnriched(portfolioId, positions) {
  var positionList = Array.isArray(positions) ? positions : [];
  if (!portfolioId || !positionList.length) return null;
  var endpoint = '/portfolio/' + encodeURIComponent(String(portfolioId)) + '/positions/enriched';
  var payload = buildPortfolioLiveRefreshPayload(positionList);
  payload.portfolioId = portfolioId;
  payload.includeDiagnostics = true;
  payload.source = 'portfolio_panel';
  try {
    var res = await fetch(BACKEND + endpoint, {
      method: 'POST',
      headers: _backendAuthHeaders({'Content-Type':'application/json'}),
      cache: 'no-store',
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(18000)
    });
    if (!res.ok) {
      var txt = '';
      try { txt = (await res.text() || '').slice(0, 240); } catch (_e) {}
      console.warn('[PortfolioRefresh] backend enriched positions failed', { status: res.status, body: txt });
      return null;
    }
    var data = await res.json();
    if (!data || data.ok === false) {
      console.warn('[PortfolioRefresh] backend enriched positions not ok', data && (data.reason || data.error || data.message));
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[PortfolioRefresh] backend enriched positions unavailable', e && e.message || String(e));
    return null;
  }
}
