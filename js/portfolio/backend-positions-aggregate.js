function _backendEnrichedPositionsToAggregatedOptions(enrichedResp) {
  var out = { options:{}, legCount:0, enrichedLegsCount:0, unresolvedLegs:[] };
  if (!enrichedResp || typeof enrichedResp !== 'object') return out;
  var positions = enrichedResp.positions || enrichedResp.openPositions || enrichedResp.data || [];
  if (!Array.isArray(positions)) positions = [];
  positions.forEach(function(pos) {
    var legs = pos && (pos.legs || pos.legsLive || pos.optionLegs || pos.enrichedLegs) || [];
    if (!Array.isArray(legs)) return;
    legs.forEach(function(leg, idx) {
      if (!leg || typeof leg !== 'object') return;
      var type = String(leg.type || leg.optionType || leg.right || '').toUpperCase();
      if (type && type !== 'CALL' && type !== 'PUT' && type !== 'C' && type !== 'P') return;
      out.legCount++;
      var sym = String(leg.streamerSymbol || leg.attemptedOptionSymbol || leg.optionSymbol || leg.symbol || '').trim();
      if (!sym) {
        out.unresolvedLegs.push({
          ticker: leg.ticker || pos.ticker || pos.symbol || null,
          expiration: leg.expiration || leg.expiry || null,
          strike: leg.strike != null ? leg.strike : null,
          optType: type || null,
          side: leg.side || null,
          attemptedOptionSymbol: null,
          reason: leg.reason || leg.failureReason || 'missing_option_symbol'
        });
        return;
      }
      var gSrc = leg.greeks || leg.greekValues || leg.optionGreeks || leg;
      var qSrc = leg.quote || leg.optionQuote || leg;
      var greeks = {
        delta: gSrc.delta != null ? gSrc.delta : null,
        theta: gSrc.theta != null ? gSrc.theta : null,
        gamma: gSrc.gamma != null ? gSrc.gamma : null,
        vega: gSrc.vega != null ? gSrc.vega : null,
        volatility: gSrc.volatility != null ? gSrc.volatility : (gSrc.impliedVolatility != null ? gSrc.impliedVolatility : (gSrc.iv != null ? gSrc.iv : null))
      };
      var hasGreeks = greeks.delta != null || greeks.theta != null || greeks.gamma != null || greeks.vega != null;
      var quote = {
        bidPrice: qSrc.bidPrice != null ? qSrc.bidPrice : (qSrc.bid != null ? qSrc.bid : null),
        askPrice: qSrc.askPrice != null ? qSrc.askPrice : (qSrc.ask != null ? qSrc.ask : null),
        mark: qSrc.mark != null ? qSrc.mark : (qSrc.mid != null ? qSrc.mid : qSrc.currentPrice),
        lastPrice: qSrc.lastPrice != null ? qSrc.lastPrice : (qSrc.last != null ? qSrc.last : null)
      };
      var hasQuote = quote.bidPrice != null || quote.askPrice != null || quote.mark != null || quote.lastPrice != null;
      if (hasGreeks || hasQuote) {
        out.enrichedLegsCount++;
        out.options[sym] = {
          symbol: sym,
          greeks: hasGreeks ? greeks : {},
          quote: hasQuote ? quote : null,
          greeksStale: leg.greeksStale === true,
          quoteStale: leg.quoteStale === true,
          greeksUnavailableReason: leg.reason || leg.failureReason || null,
          source: leg.source || 'backend_positions_enriched',
          legIndex: leg.legIndex != null ? leg.legIndex : idx
        };
      } else {
        out.unresolvedLegs.push({
          ticker: leg.ticker || pos.ticker || pos.symbol || null,
          expiration: leg.expiration || leg.expiry || null,
          strike: leg.strike != null ? leg.strike : null,
          optType: type || null,
          side: leg.side || null,
          attemptedOptionSymbol: sym,
          reason: leg.reason || leg.failureReason || 'missing_greeks_and_quote'
        });
      }
    });
  });
  if (Array.isArray(enrichedResp.unresolvedLegs)) out.unresolvedLegs = out.unresolvedLegs.concat(enrichedResp.unresolvedLegs);
  return out;
}
