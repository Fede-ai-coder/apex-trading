// _spyFreshNum — accept a strictly positive finite number, else null. Shared by the
// SPY freshness resolver so every source uses identical validity semantics (a zero /
// negative / NaN quote is never treated as a real price).
function _spyFreshNum(v) { var n = parseFloat(v); return (isFinite(n) && n > 0) ? n : null; }

// _spyContextPrice — read a usable SPY price from a market-context snapshot object
// (S.marketContextSnapshot shape). Prefers an explicit live/underlying price, then the
// 1D technical close, then 4H. Returns a positive finite number or null. Never throws;
// tolerant of missing / partial snapshots. Does NOT fetch — it only reads the snapshot
// the Market Context view already loaded (GET /market-context/snapshot).
function _spyContextPrice(snapshot) {
  try {
    if (!snapshot || !snapshot.data) return null;
    var d = snapshot.data;
    // Explicit SPY price fields, if the backend snapshot carries them.
    var direct = null;
    if (d.spyPrice != null) direct = _spyFreshNum(d.spyPrice);
    if (direct == null && d.spy) {
      direct = _spyFreshNum(d.spy.price != null ? d.spy.price
        : (d.spy.mark != null ? d.spy.mark
          : (d.spy.last != null ? d.spy.last : d.spy.close)));
    }
    if (direct != null) return direct;
    // Technicals close (1D preferred, 4H fallback) — the freshest SPY value the
    // already-fetched snapshot carries, still preferable to a fresh candle request.
    var tech = d.technicals && d.technicals.SPY;
    if (tech) {
      var oneD = (tech['1D'] && tech['1D'].ok !== false) ? _spyFreshNum(tech['1D'].close) : null;
      if (oneD != null) return oneD;
      var fourH = (tech['4H'] && tech['4H'].ok !== false) ? _spyFreshNum(tech['4H'].close) : null;
      if (fourH != null) return fourH;
    }
    return null;
  } catch (e) { return null; }
}

// _spyContextAvailableKeys — compact, log-safe summary of what a market-context snapshot
// actually carries, used only when it lacks a usable SPY price so the gap is diagnosable
// (data top-level keys, then the technicals symbols and SPY timeframe keys when present).
function _spyContextAvailableKeys(snapshot) {
  try {
    var d = snapshot && snapshot.data;
    if (!d) return 'none';
    var parts = ['data=' + Object.keys(d).join('|')];
    if (d.technicals && typeof d.technicals === 'object') {
      parts.push('technicals=' + Object.keys(d.technicals).join('|'));
      if (d.technicals.SPY && typeof d.technicals.SPY === 'object') {
        parts.push('SPY=' + Object.keys(d.technicals.SPY).join('|'));
      }
    }
    return parts.join(' ');
  } catch (e) { return 'unknown'; }
}

// resolveFreshSpyPrice — Portfolio-only SPY benchmark price resolver. SPY is the βΔ
// (beta-weighted delta) denominator, so BEFORE the Portfolio ever accepts a stale
// CANDLE_CLOSE_FALLBACK it must exhaust the FRESHER SPY sources in order and record,
// per source, whether it was attempted / succeeded / rejected (and why). Frontend
// only: it reuses existing endpoints (no backend change, no option-chain, no Greeks
// hydration) and NEVER requests candles here. Returns the freshest resolved SPY price
// or a null-price result; the caller then treats candle close as the explicit last
// resort. It does NOT change the βΔ formula — only which SPY price feeds it.
//
// Order (freshest first):
//   a. market_live    — GET /market/live/SPY (DXLink live quote); a stale (isStale) or
//                       price-less response falls through to GET /market/quotes?symbols=SPY
//                       (the same backend quote the Portfolio SPY fetch already trusts).
//                       Both are reported under source=market_live.
//   b. scanner        — ttCall('/scanner?symbols=SPY') mark/last/price (authenticated
//                       backend quote-batch), only when TT / backend auth is ready.
//   c. market_context — S.marketContextSnapshot SPY price/close, only when present.
// Diagnostics (always on): [PortfolioSpyPrice] source_attempt / source_success / source_rejected.
// deps (all optional; injected for tests): { ttConnected, backend, headers, fetchImpl,
//   ttCallImpl, snapshot, log }.
// Returns { price, source, isLive, stale, priorityUsed, reason, attempts }.
async function resolveFreshSpyPrice(deps) {
  deps = deps || {};
  var SYM = 'SPY';
  var attempts = [];
  var _log = deps.log !== false;
  var _fetch = deps.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  var _ttCall = deps.ttCallImpl || (typeof ttCall === 'function' ? ttCall : null);
  var _backend = deps.backend != null ? deps.backend : (typeof BACKEND !== 'undefined' ? BACKEND : '');
  var _headers = deps.headers || (typeof _backendAuthHeaders === 'function' ? _backendAuthHeaders() : {});
  var _snapshot = (deps.snapshot !== undefined) ? deps.snapshot
    : ((typeof S !== 'undefined' && S && S.marketContextSnapshot) ? S.marketContextSnapshot : null);
  var _signal = function () {
    return (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(4000) : undefined;
  };

  function _attempt(source) {
    if (_log) { try { console.log('[PortfolioSpyPrice] source_attempt source=' + source + ' symbol=' + SYM); } catch (e) {} }
  }
  function _success(source, price, isLive, priorityUsed) {
    attempts.push({ source: source, value: price, ok: true, isLive: !!isLive, reason: null });
    if (_log) { try { console.log('[PortfolioSpyPrice] source_success source=' + source + ' price=' + price); } catch (e) {} }
    return { price: price, source: source, isLive: !!isLive, stale: false, priorityUsed: priorityUsed, reason: null, attempts: attempts };
  }
  function _reject(source, reason, availableKeys) {
    var att = { source: source, value: null, ok: false, isLive: false, reason: reason };
    if (availableKeys != null) att.availableKeys = availableKeys;
    attempts.push(att);
    if (_log) { try { console.log('[PortfolioSpyPrice] source_rejected source=' + source + ' reason=' + reason + (availableKeys != null ? ' availableKeys=' + availableKeys : '')); } catch (e) {} }
  }

  // a. market_live — /market/live/SPY (DXLink live quote). A stale (isStale) or
  // price-less DXLink response is rejected as a live mark, but the backend quote-batch
  // /market/quotes?symbols=SPY (the same source fetchPortfolioData trusts, serving the
  // backend's cached/last quote when DXLink is closed) is still tried before giving up.
  _attempt('market_live');
  if (_fetch) {
    var mlReason = null;   // why the DXLink live quote itself was not usable
    try {
      var r = await _fetch(_backend + '/market/live/' + SYM, { headers: _headers, cache: 'no-store', signal: _signal() });
      var d = null; try { d = await r.json(); } catch (e2) { d = null; }
      if (!r || !r.ok) {
        mlReason = 'http_error';
      } else if (d && d.isStale === true) {
        mlReason = 'stale_live_quote';   // explicit: fresher-only, never a stale live mark
      } else {
        var dq = (d && d.quote) || null;
        var mid = (dq && _spyFreshNum(dq.bidPrice) != null && _spyFreshNum(dq.askPrice) != null)
          ? (_spyFreshNum(dq.bidPrice) + _spyFreshNum(dq.askPrice)) / 2 : null;
        var v = _spyFreshNum(d && (d.price != null ? d.price : (d.mark != null ? d.mark : (d.last != null ? d.last
          : (dq ? (dq.mark != null ? dq.mark : (mid != null ? mid : dq.lastPrice)) : null)))));
        if (v != null) return _success('market_live', v, true, 'market_live');
        mlReason = 'no_price_in_response';
      }
    } catch (e) { mlReason = 'fetch_failed'; }
    // Backend quote-batch fallback (still reported under source=market_live).
    try {
      var rq = await _fetch(_backend + '/market/quotes?symbols=' + SYM, { cache: 'no-store', signal: _signal() });
      var dq2 = null; try { dq2 = await rq.json(); } catch (e3) { dq2 = null; }
      var ql = (dq2 && Array.isArray(dq2.quotes)) ? dq2.quotes : [];
      var qm = ql.find(function (x) { return String((x && x.symbol) || '').toUpperCase() === SYM; }) || ql[0] || null;
      var v2 = qm ? _spyFreshNum(qm.price != null ? qm.price : (qm.mark != null ? qm.mark : qm.last)) : null;
      if (rq && rq.ok && v2 != null) return _success('market_live', v2, true, 'market_quotes');
    } catch (e) { /* quote-batch fallback failed — reject with the DXLink reason below */ }
    _reject('market_live', mlReason || 'no_price_in_response');
  } else {
    _reject('market_live', 'fetch_unavailable');
  }

  // b. scanner — ttCall('/scanner?symbols=SPY') mark/last/price, auth-gated.
  _attempt('scanner');
  if (deps.ttConnected && _ttCall) {
    try {
      var sc = await _ttCall('/scanner?symbols=' + SYM);
      var q = (sc && sc.quotes && typeof sc.quotes.find === 'function')
        ? sc.quotes.find(function (x) { return String((x && x.symbol) || '').toUpperCase() === SYM; }) : null;
      var vq = q ? _spyFreshNum(q.mark != null ? q.mark : (q.last != null ? q.last : q.price)) : null;
      if (vq != null) return _success('scanner', vq, true, 'scanner');
      _reject('scanner', q ? 'no_price_in_quote' : 'symbol_not_in_batch');
    } catch (e) { _reject('scanner', 'scanner_failed'); }
  } else {
    _reject('scanner', deps.ttConnected ? 'ttcall_unavailable' : 'backend_auth_not_ready');
  }

  // c. market_context — S.marketContextSnapshot SPY price/close, only when present. When
  // the snapshot is loaded but carries no SPY price, the rejection spells out the keys the
  // backend actually returned (availableKeys=…) so a genuine backend gap is diagnosable.
  _attempt('market_context');
  var ctxPrice = _spyContextPrice(_snapshot);
  if (ctxPrice != null) return _success('market_context', ctxPrice, false, 'market_context');
  if (_snapshot && _snapshot.data) _reject('market_context', 'no_spy_price_in_context', _spyContextAvailableKeys(_snapshot));
  else _reject('market_context', 'no_context_snapshot');

  return { price: null, source: null, isLive: false, stale: false, priorityUsed: null, reason: 'no_fresh_spy_source', attempts: attempts };
}

// Best already-known frontend underlying price a position row already carries, WITHOUT
// any fetch: the persisted live underlyingPrice / underlying_price (camelCase from
// updateLive, snake_case from backend position payloads), then a nested `live` copy. Used
// as the resolver's previous-price source so a valid price the row already holds is never
// dropped in favour of underlying_price_missing. Returns a finite positive number or null.
function _portfolioRowUnderlyingPrice(pos) {
  if (!pos) return null;
  var live = pos.live || {};
  var candidates = [pos.underlyingPrice, pos.underlying_price, live.underlyingPrice, live.underlying_price];
  for (var i = 0; i < candidates.length; i++) {
    var n = parseFloat(candidates[i]);
    if (isFinite(n) && n > 0) return n;
  }
  return null;
}
