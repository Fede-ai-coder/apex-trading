// ── TRADE DETAIL MODAL ──────────────────────────────────────────
function closeTradeDetail() {
  document.getElementById('tradeDetailModal').style.display = 'none';
}

// ── Trade performance metrics (pure derived, never mutates trade) ──────────
function _tradeMetrics(trade) {
  // Duration
  var durationDays = null, durationLabel = '--';
  if (trade.entryDate) {
    var entryMs = new Date(trade.entryDate).getTime();
    var refDate  = (trade.status === 'CLOSED' || trade.exitDate) && trade.exitDate
      ? new Date(trade.exitDate).getTime()
      : Date.now();
    if (!isNaN(entryMs) && !isNaN(refDate)) {
      durationDays = Math.max(0, Math.round((refDate - entryMs) / 86400000));
      if (durationDays === 0)       durationLabel = 'today';
      else if (durationDays === 1)  durationLabel = '1 day';
      else if (durationDays < 7)    durationLabel = durationDays + ' days';
      else if (durationDays < 14)   durationLabel = '1 wk ' + (durationDays % 7) + 'd';
      else                          durationLabel = Math.floor(durationDays / 7) + ' wks ' + (durationDays % 7) + 'd';
    }
  }

  // Capital: sum every leg ever opened (trade.legs holds ALL legs across lifecycle,
  // including rolled-in replacement legs, each with its own entryPrice).
  var totalCreditReceived = 0, totalDebitPaid = 0, hasCapital = false;
  (trade.legs || []).forEach(function(leg) {
    var ep  = parseFloat(leg.entryPrice);
    var qty = parseFloat(leg.qty) || 0;
    if (isNaN(ep) || qty <= 0) return;
    hasCapital = true;
    var mult   = leg.type !== 'EQUITY' ? 100 : 1;
    var amount = ep * qty * mult;
    if (leg.side === 'SHORT') totalCreditReceived += amount;
    else                      totalDebitPaid      += amount;
  });
  totalCreditReceived = Math.round(totalCreditReceived * 100) / 100;
  totalDebitPaid      = Math.round(totalDebitPaid      * 100) / 100;
  var netCreditDebit  = Math.round((totalCreditReceived - totalDebitPaid) * 100) / 100;
  var netCreditDebitType = netCreditDebit > 0.005 ? 'CREDIT'
                         : netCreditDebit < -0.005 ? 'DEBIT' : 'FLAT';

  // P&L metrics
  var realizedPnL = (trade.realizedPnL !== undefined && trade.realizedPnL !== null)
    ? parseFloat(trade.realizedPnL) : null;
  var pnlPctOfNetCredit = null, pnlPerDay = null;
  if (realizedPnL !== null && hasCapital) {
    var absCreditDebit = Math.abs(netCreditDebit);
    if (absCreditDebit > 0)
      pnlPctOfNetCredit = Math.round(realizedPnL / absCreditDebit * 1000) / 10;
  }
  if (realizedPnL !== null && durationDays !== null && durationDays > 0)
    pnlPerDay = Math.round(realizedPnL / durationDays * 100) / 100;

  return {
    durationDays:       durationDays,
    durationLabel:      durationLabel,
    totalCreditReceived: hasCapital ? totalCreditReceived : null,
    totalDebitPaid:      hasCapital ? totalDebitPaid      : null,
    netCreditDebit:      hasCapital ? netCreditDebit      : null,
    netCreditDebitType:  hasCapital ? netCreditDebitType  : null,
    pnlPctOfNetCredit:  pnlPctOfNetCredit,
    pnlPctOfPortfolio:  null,
    pnlPerDay:          pnlPerDay,
  };
}

function showTradeDetails(id) {
  var trade = journalManager.getById(id);
  if (!trade) {
    var availIds = journalManager.getAll().map(function(t) { return t.id; });
    console.warn('[JOURNAL DETAIL WARN] trade not found id=' + id + ' availableIds=' + JSON.stringify(availIds));
    showToast('Trade not found', 'warn');
    return;
  }
  var portfolio = portfolioManager.getById(trade.portfolioId);
  var pfName    = portfolio ? escHtml(portfolio.name)
    : (trade.portfolioName || trade.portfolio
        ? escHtml(trade.portfolioName || trade.portfolio)
        : '<span style="color:var(--tx3)">--</span>');
  var status    = trade.status || (trade.exitDate ? 'CLOSED' : 'OPEN');
  var live      = trade.live || {};
  var legsLive  = live.legsLive || [];
  var allLegs   = trade.legs || [];

  // Split legs into active (OPEN/PARTIAL) and closed (CLOSED) sets.
  // Backward-compat: legs without legStatus are treated as OPEN.
  var activeLegs = [], closedLegs = [];
  allLegs.forEach(function(leg, i) {
    if ((leg.legStatus || 'OPEN') === 'CLOSED') closedLegs.push({leg: leg, i: i});
    else                                         activeLegs.push({leg: leg, i: i});
  });

  // Unrealized P&L: computed only from active legs with live marks.
  var computedUnrealizedPnL = null;
  if (status !== 'CLOSED') {
    activeLegs.forEach(function(item) {
      var ll    = legsLive[item.i] || {};
      var mark  = ll.currentPrice;
      var entry = parseFloat(item.leg.entryPrice);
      var qty   = parseFloat(item.leg.qty) || 0;
      var mult  = item.leg.type !== 'EQUITY' ? 100 : 1;
      if (mark !== null && mark !== undefined && !isNaN(entry) && qty > 0) {
        var lp = item.leg.side === 'SHORT' ? (entry - mark) * qty * mult : (mark - entry) * qty * mult;
        if (computedUnrealizedPnL === null) computedUnrealizedPnL = 0;
        computedUnrealizedPnL += lp;
      }
    });
  }

  // Status badge (supports OPEN / PARTIAL / CLOSED)
  var sBadgeColors = {OPEN: 'var(--am)', PARTIAL: 'var(--pu)', CLOSED: 'var(--bl)'};
  var sBadgeColor  = sBadgeColors[status] || 'var(--am)';
  var sBadge = '<span style="font-family:var(--M);font-size:9px;font-weight:700;color:' + sBadgeColor +
    ';border:1px solid ' + sBadgeColor + ';border-radius:3px;padding:1px 6px">' + escHtml(status) + '</span>';

  // Summary P&L cell
  var rp = trade.realizedPnL;
  var pnlHtml;
  if (status === 'CLOSED') {
    pnlHtml = (rp !== null && rp !== undefined)
      ? '<span style="color:' + (rp >= 0 ? 'var(--gr)' : 'var(--rd)') + ';font-weight:700">' +
          (rp >= 0 ? '+' : '') + '$' + parseFloat(rp).toFixed(2) + '</span>' +
          ' <span style="font-size:9px;color:var(--tx3)">realized</span>'
      : '<span style="color:var(--tx3)">--</span>';
  } else if (status === 'PARTIAL') {
    var realPart = (rp !== null && rp !== undefined)
      ? '<span style="color:' + (rp >= 0 ? 'var(--gr)' : 'var(--rd)') + ';font-weight:700">' +
          (rp >= 0 ? '+' : '') + '$' + parseFloat(rp).toFixed(2) + '</span>' +
          ' <span style="font-size:8px;color:var(--tx3)">realized</span>'
      : '';
    var unrealPart = computedUnrealizedPnL !== null
      ? ' <span style="color:' + (computedUnrealizedPnL >= 0 ? 'var(--gr)' : 'var(--rd)') + ';font-weight:700">' +
          (computedUnrealizedPnL >= 0 ? '+' : '') + '$' + computedUnrealizedPnL.toFixed(2) + '</span>' +
          ' <span style="font-size:8px;color:var(--tx3)">unreal.</span>'
      : '';
    pnlHtml = (realPart || unrealPart) ? (realPart + unrealPart) : '<span style="color:var(--tx3)">--</span>';
  } else {
    pnlHtml = computedUnrealizedPnL !== null
      ? '<span style="color:' + (computedUnrealizedPnL >= 0 ? 'var(--gr)' : 'var(--rd)') + ';font-weight:700">' +
          (computedUnrealizedPnL >= 0 ? '+' : '') + '$' + computedUnrealizedPnL.toFixed(2) + '</span>' +
          ' <span style="font-size:9px;color:var(--tx3)">unrealized</span>'
      : '<span style="color:var(--tx3)">-- (no live marks)</span>';
  }

  var refreshedStr = live.lastRefreshed
    ? '<span style="color:var(--tx3);font-size:9px">last refreshed ' +
        new Date(live.lastRefreshed).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) + '</span>'
    : '';

  // Strategy display: show original → current if they differ (roll history)
  var origStrat = trade.originalStrategy || trade.strategy || trade.strategyType || trade.direction || '--';
  var currStrat = trade.currentStrategy  || trade.strategy || trade.strategyType || trade.direction || '--';
  var stratDisplay = (origStrat !== currStrat && origStrat && currStrat)
    ? escHtml(origStrat) + ' <span style="color:var(--tx3)">&rarr;</span> <span style="color:var(--tx)">' + escHtml(currStrat) + '</span>'
    : escHtml(currStrat || origStrat || '--');

  // Helpers
  function fmtNum(v, dec, prefix) {
    if (v === null || v === undefined) return '<span style="color:var(--tx3)">--</span>';
    var n = parseFloat(v);
    if (isNaN(n)) return '<span style="color:var(--tx3)">--</span>';
    return (prefix || '') + n.toFixed(dec !== undefined ? dec : 2);
  }
  var _thBase = 'font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.07em;padding:5px 6px;border-bottom:1px solid var(--b0);white-space:nowrap';
  var thStyle = 'style="' + _thBase + ';text-align:left"';
  var thR     = 'style="' + _thBase + ';text-align:right;font-variant-numeric:tabular-nums"';
  var _tdBase = 'padding:4px 6px;vertical-align:middle;border-bottom:1px solid rgba(255,255,255,.04)';
  var tdNum   = _tdBase + ';text-align:right;font-variant-numeric:tabular-nums;font-family:var(--M);font-size:10px';
  var tdC     = _tdBase + ';text-align:center;font-family:var(--M);font-size:10px';

  // ── Active legs table ────────────────────────────────────────────
  // _legDisplayType: only show EQUITY when the leg is explicitly an equity position
  // (no strike). A stored EQUITY with a strike is a legacy incomplete option leg.
  function _legDisplayType(leg) {
    var t = leg.type || '';
    if (t === 'EQUITY' && leg.strike) return '';
    return t;
  }

  var underlyingPrice = live.underlyingPrice !== undefined ? live.underlyingPrice : null;
  var activeRows = activeLegs.length
    ? activeLegs.map(function(item) {
        var leg = item.leg, i = item.i;
        var ll = legsLive[i] || {};
        var dt = _legDisplayType(leg);
        var typeColor = dt === 'CALL' ? 'var(--bl)' : dt === 'PUT' ? 'var(--rd)' : dt === 'EQUITY' ? 'var(--gr)' : 'var(--tx3)';
        var sideColor = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
        var mark  = ll.currentPrice;
        var entry = parseFloat(leg.entryPrice);
        var qty   = parseFloat(leg.qty) || 0;
        var mult  = leg.type === 'EQUITY' ? 1 : 100;
        var moneyness = computeMoneyness(dt, leg.strike, underlyingPrice);
        var mColor = moneyness === 'ITM' ? 'var(--gr)' : moneyness === 'ATM' ? 'var(--am)' : 'var(--rd)';
        var mHtml  = moneyness
          ? '<span style="font-family:var(--M);font-size:9px;font-weight:700;color:' + mColor + '">' + moneyness + '</span>'
          : '<span style="color:var(--tx3)">--</span>';
        var dte    = computeDTE(leg.expiry);
        var dColor = dte === null ? 'var(--tx3)' : dte <= 7 ? 'var(--rd)' : dte <= 21 ? 'var(--am)' : 'var(--tx)';
        var dteHtml = dte !== null
          ? '<span style="font-variant-numeric:tabular-nums;color:' + dColor + '">' + dte + 'd</span>'
          : '<span style="color:var(--tx3)">--</span>';
        var legPnlHtml = '<span style="color:var(--tx3)">--</span>';
        if (mark !== null && mark !== undefined && !isNaN(entry)) {
          var lp = leg.side === 'SHORT' ? (entry - mark) * qty * mult : (mark - entry) * qty * mult;
          legPnlHtml = '<span style="color:' + (lp >= 0 ? 'var(--gr)' : 'var(--rd)') + ';font-weight:600">' +
            (lp >= 0 ? '+' : '') + '$' + lp.toFixed(2) + '</span>';
        }
        var typeCell = dt
          ? '<span style="font-family:var(--M);font-size:8px;font-weight:700;color:' + typeColor + '">' + escHtml(dt) + '</span>'
          : '<span style="font-family:var(--M);font-size:8px;color:var(--tx3)" title="Legacy incomplete leg">--</span>';
        return '<tr>' +
          '<td style="' + tdC + '">' + mHtml + '</td>' +
          '<td style="' + tdC + '">' + dteHtml + '</td>' +
          '<td style="' + _tdBase + '">' + typeCell + '</td>' +
          '<td style="' + _tdBase + ';font-family:var(--M);font-size:9px;color:' + sideColor + ';font-weight:700">' + escHtml(leg.side || '--') + '</td>' +
          '<td style="' + tdNum + '">' + (qty || '--') + '</td>' +
          '<td style="' + tdNum + ';min-width:52px">' + (leg.strike || '--') + '</td>' +
          '<td style="' + _tdBase + ';font-family:var(--M);font-size:9px;color:var(--tx2);min-width:68px">' + (leg.expiry || '--') + '</td>' +
          '<td style="' + tdNum + ';min-width:54px">' + fmtNum(leg.entryPrice, 2, '$') + '</td>' +
          '<td style="' + tdNum + ';min-width:90px">' + _priceCellHtml(mark, ll) + '</td>' +
          '<td style="' + tdNum + ';min-width:64px">' + legPnlHtml + '</td>' +
          '<td style="' + tdNum + '">' + fmtNum(ll.delta, 4)   + '</td>' +
          '<td style="' + tdNum + '">' + fmtNum(ll.theta, 4)   + '</td>' +
          '<td style="' + tdNum + '">' + fmtNum(ll.gamma, 5)   + '</td>' +
          '<td style="' + tdNum + '">' + fmtNum(ll.vega,  4)   + '</td>' +
          '<td style="' + tdNum + '">' + (ll.volatility != null ? (ll.volatility * 100).toFixed(1) + '%' : '<span style="color:var(--tx3)">--</span>') + '</td>' +
          '<td style="' + _tdBase + ';font-family:var(--M);font-size:8px;color:var(--tx3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escHtml(leg.streamerSymbol || '') + '">' + escHtml(leg.streamerSymbol || '--') + '</td>' +
        '</tr>';
      }).join('')
    : '<tr><td colspan="16" style="text-align:center;color:var(--tx3);font-size:10px;padding:14px">No active legs</td></tr>';

  // ── Closed legs table ────────────────────────────────────────────
  var closedRows = closedLegs.map(function(item) {
    var leg = item.leg;
    var dt  = _legDisplayType(leg);
    var tc  = dt === 'CALL' ? 'var(--bl)' : dt === 'PUT' ? 'var(--rd)' : dt === 'EQUITY' ? 'var(--gr)' : 'var(--tx3)';
    var sc  = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
    var legPnl = typeof leg.legRealizedPnL === 'number' ? leg.legRealizedPnL : null;
    var legPnlHtml = legPnl !== null
      ? '<span style="color:' + (legPnl >= 0 ? 'var(--gr)' : 'var(--rd)') + ';font-weight:700">' +
          (legPnl >= 0 ? '+' : '') + '$' + legPnl.toFixed(2) + '</span>'
      : '<span style="color:var(--tx3)">--</span>';
    var closePriceHtml = leg.closePrice !== null && leg.closePrice !== undefined
      ? '$' + parseFloat(leg.closePrice).toFixed(2)
      : '<span style="color:var(--tx3);font-size:9px">rolled</span>';
    return '<tr style="opacity:.65">' +
      '<td style="' + _tdBase + '">' + (dt ? '<span style="font-family:var(--M);font-size:8px;font-weight:700;color:' + tc + '">' + escHtml(dt) + '</span>' : '<span style="font-family:var(--M);font-size:8px;color:var(--tx3)" title="Legacy incomplete leg">--</span>') + '</td>' +
      '<td style="' + _tdBase + ';font-family:var(--M);font-size:9px;color:' + sc + ';font-weight:700">' + escHtml(leg.side || '--') + '</td>' +
      '<td style="' + tdNum + '">' + (parseFloat(leg.qty) || '--') + '</td>' +
      '<td style="' + tdNum + ';min-width:52px">' + (leg.strike || '--') + '</td>' +
      '<td style="' + _tdBase + ';font-family:var(--M);font-size:9px;color:var(--tx2);min-width:68px">' + (leg.expiry || '--') + '</td>' +
      '<td style="' + tdNum + ';min-width:54px">' + fmtNum(leg.entryPrice, 2, '$') + '</td>' +
      '<td style="' + tdNum + ';min-width:54px;font-family:var(--M);font-size:10px">' + closePriceHtml + '</td>' +
      '<td style="' + tdNum + ';min-width:64px">' + legPnlHtml + '</td>' +
      '<td style="' + _tdBase + ';font-family:var(--M);font-size:9px;color:var(--tx3)">' + (leg.closeDate || '--') + '</td>' +
    '</tr>';
  }).join('');

  // ── Build HTML ───────────────────────────────────────────────────
  var hasOpenLegs = activeLegs.length > 0 && status !== 'CLOSED';
  var _tm = _tradeMetrics(trade);
  var html =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">' +
      '<div>' +
        '<div style="font-size:18px;font-weight:800;font-family:var(--M);letter-spacing:.06em">' + escHtml(trade.ticker || '--') + '</div>' +
        '<div style="font-size:11px;color:var(--tx2);margin-top:2px">' + stratDisplay +
          ' &nbsp;&middot;&nbsp; ' + pfName + ' &nbsp;&middot;&nbsp; ' + sBadge + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        (hasOpenLegs
          ? '<button data-tid="' + trade.id + '" onclick="showCloseLegsModal(+this.dataset.tid)" ' +
              'style="background:var(--rd);border:none;border-radius:6px;color:#fff;font-family:var(--M);' +
              'font-size:9px;font-weight:700;padding:5px 12px;cursor:pointer;letter-spacing:.04em">CLOSE LEGS</button>'
          : '') +
        '<button onclick="closeTradeDetail()" ' +
          'style="background:transparent;border:1px solid var(--b0);border-radius:6px;color:var(--tx3);' +
          'font-family:var(--M);font-size:10px;padding:5px 12px;cursor:pointer">&#x2715; CLOSE</button>' +
      '</div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:16px;padding:12px;background:var(--bg3);border-radius:8px;border:1px solid var(--b0)">' +
      _detailCell('ENTRY DATE', trade.entryDate || trade.openedAt || trade.createdAt || '--') +
      _detailCell('EXIT DATE',  trade.exitDate  || '--') +
      _detailCell('P&L',        pnlHtml, true) +
      _detailCell('NOTES',      trade.notes
        ? '<span title="' + escHtml(trade.notes) + '">' + escHtml(trade.notes.length > 40 ? trade.notes.slice(0, 40) + '…' : trade.notes) + '</span>'
        : '--', true) +
    '</div>' +

    // ── Performance metrics strip ─────────────────────────────────
    (function() {
      var nd = function(v, suffix, decimals) {
        if (v === null || v === undefined || isNaN(v)) return '--';
        var n = (typeof decimals === 'number') ? v.toFixed(decimals) : v;
        return (suffix || '') + n;
      };
      var ndc = function(v, prefix) {
        if (v === null || v === undefined || isNaN(v)) return '--';
        return (prefix || '') + (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);
      };
      var pct = function(v) {
        if (v === null || v === undefined || isNaN(v)) return '--';
        return (v >= 0 ? '+' : '') + v.toFixed(1) + '%';
      };
      var ncColor = _tm.netCreditDebit === null ? 'var(--tx3)'
        : _tm.netCreditDebit >= 0 ? 'var(--cy)' : 'var(--am)';
      var netLabel = _tm.netCreditDebitType === null ? 'NET CR/DB'
        : 'NET ' + _tm.netCreditDebitType;
      var netVal   = _tm.netCreditDebit !== null
        ? '<span style="color:' + ncColor + '">' +
            (_tm.netCreditDebit >= 0 ? '+$' : '-$') + Math.abs(_tm.netCreditDebit).toFixed(2) +
          '</span>'
        : '--';
      var pctVal = _tm.pnlPctOfNetCredit !== null
        ? '<span style="color:' + (_tm.pnlPctOfNetCredit >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
            pct(_tm.pnlPctOfNetCredit) + '</span>'
        : '--';
      var pdVal  = _tm.pnlPerDay !== null
        ? '<span style="color:' + (_tm.pnlPerDay >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
            ndc(_tm.pnlPerDay) + '/day</span>'
        : '--';
      return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));' +
        'gap:8px;margin-bottom:12px;padding:10px 12px;background:var(--bg3);' +
        'border-radius:8px;border:1px solid var(--b0)">' +
        _detailCell('DURATION', _tm.durationLabel +
          (_tm.durationDays !== null ? '<span style="font-size:8px;color:var(--tx3)"> (' + _tm.durationDays + 'd)</span>' : '')) +
        _detailCell(netLabel, netVal, true) +
        _detailCell('P&L % NET CR/DB', pctVal, true) +
        _detailCell('P&L / DAY', pdVal, true) +
        (_tm.pnlPctOfPortfolio !== null
          ? _detailCell('P&L % PORTFOLIO', pct(_tm.pnlPctOfPortfolio), true)
          : '') +
      '</div>';
    })() +

    (refreshedStr ? '<div style="margin-bottom:10px">' + refreshedStr + '</div>' : '') +

    // ACTIVE LEGS
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
      '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em">' +
        'CURRENT ACTIVE LEGS (' + activeLegs.length + ')</div>' +
    '</div>' +
    '<div style="overflow-x:auto;margin-bottom:14px"><table style="width:100%;border-collapse:collapse">' +
      '<thead><tr>' +
        '<th style="' + _thBase + ';text-align:center">ITM?</th>' +
        '<th style="' + _thBase + ';text-align:center">DTE</th>' +
        '<th ' + thStyle + '>TYPE</th><th ' + thStyle + '>SIDE</th>' +
        '<th ' + thR + '>QTY</th>' +
        '<th style="' + _thBase + ';text-align:right;min-width:52px">STRIKE</th>' +
        '<th style="' + _thBase + ';text-align:left;min-width:68px">EXPIRY</th>' +
        '<th style="' + _thBase + ';text-align:right;min-width:54px">ENTRY$</th>' +
        '<th style="' + _thBase + ';text-align:right;min-width:90px">MARK</th>' +
        '<th style="' + _thBase + ';text-align:right;min-width:64px">P&L</th>' +
        '<th ' + thR + '>&Delta;</th><th ' + thR + '>&Theta;</th>' +
        '<th ' + thR + '>&Gamma;</th><th ' + thR + '>&Nu;</th>' +
        '<th ' + thR + '>IV%</th><th ' + thStyle + '>STREAMER</th>' +
      '</tr></thead>' +
      '<tbody style="font-size:10px">' + activeRows + '</tbody>' +
    '</table></div>';

  // ── Closed / historical legs ─────────────────────────────────────
  if (closedLegs.length) {
    html +=
      '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:6px">' +
        'CLOSED / HISTORICAL LEGS (' + closedLegs.length + ')</div>' +
      '<div style="overflow-x:auto;margin-bottom:14px">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr>' +
            '<th style="' + _thBase + ';text-align:left">TYPE</th>' +
            '<th style="' + _thBase + ';text-align:left">SIDE</th>' +
            '<th style="' + _thBase + ';text-align:right">QTY</th>' +
            '<th style="' + _thBase + ';text-align:right;min-width:52px">STRIKE</th>' +
            '<th style="' + _thBase + ';text-align:left;min-width:68px">EXPIRY</th>' +
            '<th style="' + _thBase + ';text-align:right;min-width:54px">ENTRY$</th>' +
            '<th style="' + _thBase + ';text-align:right;min-width:54px">CLOSE$</th>' +
            '<th style="' + _thBase + ';text-align:right;min-width:64px">REAL. P&amp;L</th>' +
            '<th style="' + _thBase + ';text-align:left">CLOSE DATE</th>' +
          '</tr></thead>' +
          '<tbody style="font-size:10px">' + closedRows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  // ── Snapshot rendering helpers ──────────────────────────────────────────────
  function _snapCell(label, value) {
    return '<div style="background:var(--bg2);border-radius:5px;padding:5px 7px">' +
      '<div style="font-size:7px;color:var(--tx3);letter-spacing:.06em;margin-bottom:2px">' + label + '</div>' +
      '<div style="color:var(--tx);font-weight:600;font-size:9px">' + value + '</div>' +
    '</div>';
  }
  function _snapGroup(title, cells) {
    return '<div style="margin-bottom:8px">' +
      '<div style="font-size:6px;font-family:var(--M);color:var(--tx3);letter-spacing:.1em;margin-bottom:4px;' +
        'text-transform:uppercase;border-bottom:1px solid var(--b0);padding-bottom:2px">' + title + '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:5px;font-family:var(--M)">' +
        cells +
      '</div>' +
    '</div>';
  }

  function _snapHtml(label, snap) {
    if (!snap) return '';
    function sv(v, dec) {
      if (v === null || v === undefined) return '<span style="color:var(--tx3)">--</span>';
      var n = parseFloat(v);
      return isNaN(n) ? escHtml(String(v)) : n.toFixed(dec !== undefined ? dec : 4);
    }
    function pct(v) {
      if (v === null || v === undefined) return '<span style="color:var(--tx3)">--</span>';
      var n = parseFloat(v);
      if (isNaN(n)) return '<span style="color:var(--tx3)">--</span>';
      var c = n >= 0 ? 'var(--gr)' : 'var(--rd)';
      return '<span style="color:' + c + '">' + (n >= 0 ? '+' : '') + n.toFixed(2) + '%</span>';
    }
    function boolBadge(v, trueLabel, trueColor, falseLabel, falseColor) {
      if (v === null || v === undefined) return '<span style="color:var(--tx3)">--</span>';
      return v
        ? '<span style="color:' + (trueColor  || 'var(--gr)') + ';font-weight:700">' + (trueLabel  || 'YES') + '</span>'
        : '<span style="color:' + (falseColor || 'var(--tx3)') + '">' + (falseLabel || 'NO') + '</span>';
    }
    function smaDistCell(sma, dist, label) {
      if (sma === null || sma === undefined) return _snapCell(label, '--');
      var distStr = dist != null
        ? ' <span style="font-size:8px;color:' + (dist >= 0 ? 'var(--gr)' : 'var(--rd)') + '">(' +
            (dist >= 0 ? '+' : '') + dist.toFixed(2) + '%)</span>'
        : '';
      return _snapCell(label, '$' + parseFloat(sma).toFixed(2) + distStr);
    }

    var ts = snap.timestamp
      ? new Date(snap.timestamp).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})
      : '--';
    var _priceSrc = snap.priceSource || snap.underlyingPriceSource || null;
    var priceStr = snap.underlyingPrice != null
      ? '$' + parseFloat(snap.underlyingPrice).toFixed(2) +
        (_priceSrc ? ' <span style="font-size:7px;color:var(--tx3)">(' + escHtml(_priceSrc) + ')</span>' : '')
      : '--';
    var mr = snap.marketRegime;
    var mrStr = mr
      ? escHtml(mr.label || '--') +
        (mr.ivrSource ? ' <span style="color:var(--tx3);font-size:8px">(' + escHtml(mr.ivrSource) + ')</span>' : '')
      : '--';

    // Squeeze status cell
    var sqzStr = snap.squeeze !== null && snap.squeeze !== undefined
      ? (snap.squeeze
          ? '<span style="color:var(--am);font-weight:700">ACTIVE</span>'
          : '<span style="color:var(--tx3)">off</span>')
      : '<span style="color:var(--tx3)">--</span>';

    // BB / KC status
    var bbStatus = snap.aboveUpperBB ? 'ABOVE UPPER'
                 : snap.belowLowerBB ? 'BELOW LOWER'
                 : snap.insideBB     ? 'INSIDE'
                 : '--';
    var bbStatusColor = snap.aboveUpperBB ? 'var(--am)'
                      : snap.belowLowerBB ? 'var(--bl)'
                      : snap.insideBB     ? 'var(--gr)' : 'var(--tx3)';
    var kcStatus = snap.aboveUpperKC ? 'ABOVE UPPER'
                 : snap.belowLowerKC ? 'BELOW LOWER'
                 : snap.insideKC     ? 'INSIDE'
                 : '--';
    var kcStatusColor = snap.aboveUpperKC ? 'var(--am)'
                      : snap.belowLowerKC ? 'var(--bl)'
                      : snap.insideKC     ? 'var(--gr)' : 'var(--tx3)';

    // Data source footer — only show recognised DXLink indicator sources.
    // Legacy values (cached_scan, yahoo_via_railway) from old snapshots are silently suppressed.
    var _dxIndSrcs = { DXLINK_1H: 1, DXLINK_4H: 1, DXLINK_1D: 1, UNAVAILABLE: 1 };
    var srcParts = [];
    if (snap.priceSource) srcParts.push('price: ' + escHtml(snap.priceSource));
    if (snap.indicatorSource && _dxIndSrcs[snap.indicatorSource]) {
      var _indWarn = snap.indicatorSource === 'UNAVAILABLE';
      srcParts.push('ind: <span style="' + (_indWarn ? 'color:var(--am);font-weight:700' : '') + '">' +
        escHtml(snap.indicatorSource) + '</span>');
    }
    if (snap.ivSource) srcParts.push('iv: ' + escHtml(snap.ivSource));
    if (snap.indicatorMissingReason) srcParts.push('<span style="color:var(--am)">' + escHtml(snap.indicatorMissingReason) + '</span>');
    var srcHtml = srcParts.length
      ? '<div style="margin-top:6px;font-size:7px;font-family:var(--M);color:var(--tx3)">SOURCES: ' + srcParts.join(' &middot; ') + '</div>'
      : '';

    return '<div style="background:var(--bg3);border:1px solid var(--b1);border-radius:8px;padding:10px 12px;margin-bottom:10px">' +
      '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:10px;' +
        'display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-weight:700;color:var(--tx2)">' + escHtml(label) + '</span>' +
        '<span>' + ts + '</span>' +
      '</div>' +

      _snapGroup('1 — Price / Greeks',
        _snapCell('UNDERLYING', priceStr) +
        _snapCell('DELTA',      sv(snap.delta)) +
        _snapCell('THETA',      sv(snap.theta)) +
        _snapCell('GAMMA',      sv(snap.gamma, 5)) +
        _snapCell('VEGA',       sv(snap.vega)) +
        _snapCell('VEGA CALL',  sv(snap.vegaCall)) +
        _snapCell('VEGA PUT',   sv(snap.vegaPut)) +
        _snapCell('BETA',       sv(snap.beta, 2)) +
        _snapCell('BWD',        sv(snap.betaWeightedDelta, 6))
      ) +

      _snapGroup('2 — Volatility / Earnings / Market Regime',
        _snapCell('IVR', snap.ivr != null ? normalizeIvrPercent(snap.ivr).toFixed(1) + '%' : '--') +
        _snapCell('EARNINGS', snap.nextEarnings || '--') +
        _snapCell('DTE EARN', snap.dteEarnings != null ? snap.dteEarnings + 'd' : '--') +
        _snapCell('REGIME', mrStr)
      ) +

      _snapGroup('3 — Technicals — ' + (snap.indicatorSource || 'PRIMARY'),
        _snapCell('RSI 14',       sv(snap.rsi14, 1)) +
        _snapCell('RS vs SPY',    pct(snap.relStrengthVsSpy)) +
        smaDistCell(snap.sma8,   snap.distFromSma8,   'SMA 8') +
        smaDistCell(snap.sma13,  snap.distFromSma13,  'SMA 13') +
        smaDistCell(snap.sma20,  snap.distFromSma20,  'SMA 20') +
        smaDistCell(snap.sma30,  snap.distFromSma30,  'SMA 30') +
        smaDistCell(snap.sma200, snap.distFromSma200, 'SMA 200')
      ) +

      _snapGroup('4 — Bands / Channels / Squeeze',
        _snapCell('SQUEEZE',     sqzStr) +
        _snapCell('BB STATUS',   '<span style="color:' + bbStatusColor + '">' + bbStatus + '</span>') +
        _snapCell('BB UPPER',    snap.bbUpper  != null ? '$' + parseFloat(snap.bbUpper).toFixed(2)  : '--') +
        _snapCell('BB MID',      snap.bbMiddle != null ? '$' + parseFloat(snap.bbMiddle).toFixed(2) : '--') +
        _snapCell('BB LOWER',    snap.bbLower  != null ? '$' + parseFloat(snap.bbLower).toFixed(2)  : '--') +
        _snapCell('KC STATUS',   '<span style="color:' + kcStatusColor + '">' + kcStatus + '</span>') +
        _snapCell('KC UPPER',    snap.kcUpper  != null ? '$' + parseFloat(snap.kcUpper).toFixed(2)  : '--') +
        _snapCell('KC MID',      snap.kcMiddle != null ? '$' + parseFloat(snap.kcMiddle).toFixed(2) : '--') +
        _snapCell('KC LOWER',    snap.kcLower  != null ? '$' + parseFloat(snap.kcLower).toFixed(2)  : '--') +
        _snapCell('BTW KC&amp;BB', boolBadge(snap.priceBetweenKCandBB, 'YES', 'var(--pu)', 'NO', 'var(--tx3)'))
      ) +

      (function() {
        // Render a combined SMAs + Bands section for a specific TF tech object.
        // Always renders; shows -- for each field when tech is null (not yet available).
        function _techBlock(t, prefix) {
          var tc = t || {};
          var unavail = !t;
          var titleSuffix = unavail ? ' <span style="color:var(--am);font-weight:600">UNAVAILABLE</span>' : '';
          var tcSqzStr = tc.squeeze !== null && tc.squeeze !== undefined
            ? (tc.squeeze ? '<span style="color:var(--am);font-weight:700">ACTIVE</span>' : '<span style="color:var(--tx3)">off</span>')
            : '<span style="color:var(--tx3)">--</span>';
          var tcBBSt   = tc.aboveUpperBB ? 'ABOVE UPPER' : tc.belowLowerBB ? 'BELOW LOWER' : tc.insideBB ? 'INSIDE' : '--';
          var tcBBC    = tc.aboveUpperBB ? 'var(--am)' : tc.belowLowerBB ? 'var(--bl)' : tc.insideBB ? 'var(--gr)' : 'var(--tx3)';
          var tcKCSt   = tc.aboveUpperKC ? 'ABOVE UPPER' : tc.belowLowerKC ? 'BELOW LOWER' : tc.insideKC ? 'INSIDE' : '--';
          var tcKCC    = tc.aboveUpperKC ? 'var(--am)' : tc.belowLowerKC ? 'var(--bl)' : tc.insideKC ? 'var(--gr)' : 'var(--tx3)';
          function sdCell(sma, dist, lbl) {
            if (sma === null || sma === undefined) return _snapCell(lbl, '--');
            var dStr = dist != null
              ? ' <span style="font-size:8px;color:' + (dist >= 0 ? 'var(--gr)' : 'var(--rd)') + '">(' +
                  (dist >= 0 ? '+' : '') + dist.toFixed(2) + '%)</span>' : '';
            return _snapCell(lbl, '$' + parseFloat(sma).toFixed(2) + dStr);
          }
          return _snapGroup(prefix + ' — Technicals' + titleSuffix,
            _snapCell('RSI 14',    sv(tc.rsi14, 1)) +
            _snapCell('RS vs SPY', pct(tc.relStrengthVsSpy)) +
            sdCell(tc.sma8,   tc.distFromSma8,   'SMA 8') +
            sdCell(tc.sma13,  tc.distFromSma13,  'SMA 13') +
            sdCell(tc.sma20,  tc.distFromSma20,  'SMA 20') +
            sdCell(tc.sma30,  tc.distFromSma30,  'SMA 30') +
            sdCell(tc.sma200, tc.distFromSma200, 'SMA 200') +
            _snapCell('SQUEEZE',   tcSqzStr) +
            _snapCell('BB STATUS', '<span style="color:' + tcBBC + '">' + tcBBSt + '</span>') +
            _snapCell('BB UPPER',  tc.bbUpper  != null ? '$' + parseFloat(tc.bbUpper).toFixed(2)  : '--') +
            _snapCell('BB MID',    tc.bbMiddle != null ? '$' + parseFloat(tc.bbMiddle).toFixed(2) : '--') +
            _snapCell('BB LOWER',  tc.bbLower  != null ? '$' + parseFloat(tc.bbLower).toFixed(2)  : '--') +
            _snapCell('KC STATUS', '<span style="color:' + tcKCC + '">' + tcKCSt + '</span>') +
            _snapCell('KC UPPER',  tc.kcUpper  != null ? '$' + parseFloat(tc.kcUpper).toFixed(2)  : '--') +
            _snapCell('KC MID',    tc.kcMiddle != null ? '$' + parseFloat(tc.kcMiddle).toFixed(2) : '--') +
            _snapCell('KC LOWER',  tc.kcLower  != null ? '$' + parseFloat(tc.kcLower).toFixed(2)  : '--') +
            _snapCell('BTW KC&amp;BB', boolBadge(tc.priceBetweenKCandBB, 'YES', 'var(--pu)', 'NO', 'var(--tx3)'))
          );
        }
        return _techBlock(snap.tech4h, 'DXLINK 4H') +
               _techBlock(snap.tech1d, 'DXLINK 1D');
      })() +

      (snap.vix != null || snap.vix9d != null || snap.vix3m != null || snap.vix6m != null ||
       snap.vixCurveState !== undefined
        ? (function() {
            function vn(v) { return v != null ? v.toFixed(2) : '--'; }
            function vspd(v) {
              if (v == null) return '--';
              var c = v > 0 ? 'var(--rd)' : v < 0 ? 'var(--gr)' : 'var(--tx3)';
              return '<span style="color:' + c + '">' + (v >= 0 ? '+' : '') + v.toFixed(2) + '</span>';
            }
            var curveColors = { CONTANGO: 'var(--gr)', BACKWARDATION: 'var(--rd)', MIXED: 'var(--am)', UNKNOWN: 'var(--tx3)' };
            var stressColors = { NORMAL: 'var(--gr)', SHORT_TERM_STRESS: 'var(--am)', FULL_CURVE_STRESS: 'var(--rd)', UNKNOWN: 'var(--tx3)' };
            var cs = snap.vixCurveState || 'UNKNOWN';
            var sf = snap.vixStressFlag || 'UNKNOWN';
            return _snapGroup('5 — VIX Structure',
              _snapCell('VIX',         vn(snap.vix)) +
              _snapCell('VIX 9D',      vn(snap.vix9d)) +
              _snapCell('VIX 3M',      vn(snap.vix3m)) +
              _snapCell('VIX 6M',      vn(snap.vix6m)) +
              _snapCell('SPD 9D-0',    vspd(snap.vixSpread_9d_0)) +
              _snapCell('SPD 3M-0',    vspd(snap.vixSpread_3m_0)) +
              _snapCell('SPD 6M-3M',   vspd(snap.vixSpread_6m_3m)) +
              _snapCell('RATIO 9D/0',  snap.vixRatio_9d_0  != null ? snap.vixRatio_9d_0.toFixed(3)  : '--') +
              _snapCell('RATIO 3M/0',  snap.vixRatio_3m_0  != null ? snap.vixRatio_3m_0.toFixed(3)  : '--') +
              _snapCell('RATIO 6M/3M', snap.vixRatio_6m_3m != null ? snap.vixRatio_6m_3m.toFixed(3) : '--') +
              _snapCell('CURVE',       '<span style="color:' + (curveColors[cs] || 'var(--tx3)') + '">' + cs + '</span>') +
              _snapCell('STRESS',      '<span style="color:' + (stressColors[sf] || 'var(--tx3)') + '">' + sf.replace(/_/g, ' ') + '</span>')
            );
          })()
        : '') +

      srcHtml +
    '</div>';
  }

  // Build snapshots HTML — entry + exit + any adjustment snapshots
  function _adjSnapLabel(adj, n) {
    var type = adj.type || 'NOTE';
    var prefix = 'ADJ SNAPSHOT #' + n;
    function legDesc(leg) {
      if (!leg) return '?';
      var parts = [];
      if (leg.side) parts.push(leg.side);
      if (leg.type && leg.type !== 'EQUITY') {
        parts.push(leg.type);
        if (leg.strike != null) parts.push(String(leg.strike));
      } else if (leg.type) {
        parts.push(leg.type);
      }
      return parts.join(' ') || 'LEG';
    }
    function legsStr(legs) {
      if (!legs || !legs.length) return '';
      var items = legs.slice(0, 3).map(legDesc);
      if (legs.length > 3) items.push('+' + (legs.length - 3) + ' more');
      return items.join(' + ');
    }
    if (type === 'ROLL' && adj.previousLegs && adj.previousLegs.length && adj.newLegs && adj.newLegs.length) {
      return prefix + ' — Closed ' + legsStr(adj.previousLegs) + ' → Opened ' + legsStr(adj.newLegs);
    }
    if (type === 'ADD_LEG' && adj.newLegs && adj.newLegs.length) {
      return prefix + ' — Added ' + legsStr(adj.newLegs);
    }
    if (type === 'TRANSFORM') {
      var sc = (adj.previousStrategy && adj.newStrategy)
        ? adj.previousStrategy + ' → ' + adj.newStrategy
        : (adj.newStrategy || null);
      return prefix + ' (TRANSFORM)' + (sc ? ': ' + sc : '');
    }
    return prefix + ' (' + type + ')';
  }
  var adjSnapHtmls = (trade.adjustments || []).reduce(function(acc, adj, idx) {
    if (!adj.snapshot) return acc;
    return acc + _snapHtml(_adjSnapLabel(adj, idx + 1), adj.snapshot);
  }, '');

  var snapshotsHtml = _snapHtml('ENTRY SNAPSHOT', trade.entrySnapshot || null) +
                      _snapHtml('EXIT SNAPSHOT',  trade.exitSnapshot  || null) +
                      adjSnapHtmls;
  if (snapshotsHtml) {
    html += '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin:14px 0 6px">SNAPSHOTS</div>' + snapshotsHtml;
  }

  // ── Adjustments section ──────────────────────────────────────
  var adjustments    = trade.adjustments || [];
  var consolidatedPnL = journalManager.getConsolidatedPnL(trade.id);

  // Consolidated P&L banner: only shown when adjustments carry P&L deltas
  if (adjustments.length > 0) {
    var adjPnlSum = adjustments.reduce(function(s, a) {
      return s + (a.realizedPnLDelta !== null && a.realizedPnLDelta !== undefined
        ? (parseFloat(a.realizedPnLDelta) || 0) : 0);
    }, 0);
    var showConsolidated = (adjPnlSum !== 0) ||
      (trade.realizedPnL !== null && trade.realizedPnL !== undefined);
    if (showConsolidated && consolidatedPnL !== null) {
      var cColor = consolidatedPnL >= 0 ? 'var(--gr)' : 'var(--rd)';
      var basePart = (trade.realizedPnL !== null && trade.realizedPnL !== undefined)
        ? '<span style="font-size:10px;font-family:var(--M);color:var(--tx3)">Realized: ' +
            '<span style="color:' + (trade.realizedPnL >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
            (trade.realizedPnL >= 0 ? '+' : '') + '$' + parseFloat(trade.realizedPnL).toFixed(2) +
            '</span></span> '
        : '';
      var adjPart = adjPnlSum !== 0
        ? '<span style="font-size:10px;font-family:var(--M);color:var(--tx3)">Adj (timeline): ' +
            '<span style="color:' + (adjPnlSum >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
            (adjPnlSum >= 0 ? '+' : '') + '$' + adjPnlSum.toFixed(2) +
            '</span></span> '
        : '';
      html +=
        '<div style="background:var(--bg3);border:1px solid var(--b0);border-radius:8px;' +
          'padding:10px 14px;margin:14px 0 2px;display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
          '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;min-width:120px">' +
            'CONSOLIDATED P&amp;L</div>' +
          basePart + adjPart +
          '<span style="font-size:14px;font-family:var(--M);font-weight:800;color:' + cColor + '">' +
            (consolidatedPnL >= 0 ? '+' : '') + '$' + consolidatedPnL.toFixed(2) +
            ' <span style="font-size:8px;font-weight:400;color:var(--tx3)">consolidated</span>' +
          '</span>' +
        '</div>';
    }
  }

  html +=
    '<div style="display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px">' +
      '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em">' +
        'ADJUSTMENTS TIMELINE (' + adjustments.length + ')</div>' +
      '<button data-tid="' + trade.id + '" onclick="showAddAdjustmentForm(+this.dataset.tid)" ' +
        'style="background:transparent;border:1px solid var(--pu);border-radius:4px;color:var(--pu);' +
        'font-family:var(--M);font-size:8px;padding:3px 10px;cursor:pointer">+ ADD ADJUSTMENT</button>' +
    '</div>';

  if (adjustments.length) {
    html += '<div style="padding:12px 14px;background:var(--bg3);border:1px solid var(--b0);' +
      'border-radius:8px;margin-bottom:10px">' +
      _renderAdjustmentTimeline(adjustments) +
    '</div>';
  } else {
    html += '<div style="font-size:10px;color:var(--tx3);font-family:var(--M);padding:14px;' +
      'background:var(--bg3);border:1px solid var(--b0);border-radius:8px;margin-bottom:10px;' +
      'text-align:center">' +
      'No adjustments recorded. Use <strong style="color:var(--pu)">+ ADD ADJUSTMENT</strong> ' +
      'to track rolls, leg changes, partial closes, or notes.' +
    '</div>';
  }

  document.getElementById('tradeDetailContent').innerHTML = html;
  document.getElementById('tradeDetailModal').style.display = 'flex';
}

// Renders the vertical timeline of adjustments inside the trade detail modal.
function _renderAdjustmentTimeline(adjustments) {
  if (!adjustments || !adjustments.length) return '';
  var typeColors = {
    ROLL: 'var(--bl)', ADD_LEG: 'var(--gr)', REMOVE_LEG: 'var(--rd)',
    TRANSFORM: 'var(--pu)', PARTIAL_CLOSE: 'var(--am)', NOTE: 'var(--tx3)',
  };
  return adjustments.map(function(adj, idx) {
    var color = typeColors[adj.type] || 'var(--tx3)';
    var ts    = adj.timestamp
      ? new Date(adj.timestamp).toLocaleDateString([], {month:'short', day:'numeric', year:'numeric'})
      : '--';

    var pnlHtml = (adj.realizedPnLDelta !== null && adj.realizedPnLDelta !== undefined)
      ? ' <span style="font-family:var(--M);font-size:10px;font-weight:700;color:' +
          (adj.realizedPnLDelta >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
          (adj.realizedPnLDelta >= 0 ? '+' : '') + '$' +
          parseFloat(adj.realizedPnLDelta).toFixed(2) + '</span>'
      : '';

    var stratHtml = (adj.previousStrategy || adj.newStrategy)
      ? '<div style="font-size:9px;color:var(--tx2);margin-top:3px">' +
          (adj.previousStrategy
            ? '<span style="color:var(--tx3)">' + escHtml(adj.previousStrategy) + '</span>'
            : '') +
          (adj.previousStrategy && adj.newStrategy ? ' &rarr; ' : '') +
          (adj.newStrategy
            ? '<span style="color:var(--tx)">' + escHtml(adj.newStrategy) + '</span>'
            : '') +
        '</div>'
      : '';

    var notesHtml = adj.notes
      ? '<div style="font-size:10px;color:var(--tx2);margin-top:4px;font-style:italic">' +
          escHtml(adj.notes) + '</div>'
      : '';

    // For ROLL: show closed (rolled-out) legs with close price and realized P&L
    var prevLegsHtml = '';
    if (adj.type === 'ROLL' && adj.previousLegs && adj.previousLegs.length) {
      prevLegsHtml = '<div style="margin-top:6px">' +
        '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em;margin-bottom:3px">ROLLED OUT</div>' +
        adj.previousLegs.map(function(leg) {
          var lc  = leg.type === 'CALL' ? 'var(--bl)' : leg.type === 'PUT' ? 'var(--rd)' : 'var(--gr)';
          var sc  = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
          var cpStr  = (leg.closePrice !== null && leg.closePrice !== undefined)
            ? ' @$' + parseFloat(leg.closePrice).toFixed(2) : '';
          var pnlStr = '';
          if (leg.legRealizedPnL !== null && leg.legRealizedPnL !== undefined) {
            var lp = parseFloat(leg.legRealizedPnL);
            pnlStr = ' <span style="color:' + (lp >= 0 ? 'var(--gr)' : 'var(--rd)') +
              ';font-weight:700">' + (lp >= 0 ? '+' : '') + '$' + lp.toFixed(2) + '</span>';
          }
          return '<span style="font-family:var(--M);font-size:9px;background:var(--bg2);border-radius:3px;' +
            'padding:2px 6px;margin-right:4px;display:inline-block;margin-bottom:3px;opacity:.75">' +
            '<span style="color:' + sc + '">' + escHtml((leg.side || '?')[0]) + '</span>' +
            '<span style="color:' + lc + '">' + escHtml((leg.type || '?')[0]) + '</span>' +
            (leg.strike ? ' <span style="color:var(--tx2)">' + leg.strike + '</span>' : '') +
            (leg.expiry ? ' <span style="color:var(--tx3)">' + escHtml(leg.expiry) + '</span>' : '') +
            '<span style="color:var(--tx3)">' + escHtml(cpStr) + '</span>' +
            pnlStr +
          '</span>';
        }).join('') +
      '</div>';
    }

    var newLegsHtml = '';
    if (adj.newLegs && adj.newLegs.length) {
      var newLegsLabel = adj.type === 'ROLL' ? 'REPLACEMENT LEGS' : 'NEW LEGS';
      newLegsHtml = '<div style="margin-top:6px">' +
        '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em;margin-bottom:3px">' + newLegsLabel + '</div>' +
        adj.newLegs.map(function(leg) {
          var lc = leg.type === 'CALL' ? 'var(--bl)' : leg.type === 'PUT' ? 'var(--rd)' : 'var(--gr)';
          var sc = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
          return '<span style="font-family:var(--M);font-size:9px;background:var(--bg2);border-radius:3px;' +
            'padding:2px 6px;margin-right:4px;display:inline-block;margin-bottom:3px">' +
            '<span style="color:' + sc + '">' + escHtml((leg.side || '?')[0]) + '</span>' +
            '<span style="color:' + lc + '">' + escHtml((leg.type || '?')[0]) + '</span>' +
            (leg.strike ? ' <span style="color:var(--tx)">' + leg.strike + '</span>' : '') +
            (leg.expiry ? ' <span style="color:var(--tx3)">' + escHtml(leg.expiry) + '</span>' : '') +
          '</span>';
        }).join('') +
      '</div>';
    }

    var connector = idx < adjustments.length - 1
      ? '<div style="width:1px;flex:1;background:var(--b0);margin-top:3px;min-height:16px"></div>'
      : '';

    return '<div style="display:flex;gap:12px;margin-bottom:0">' +
      '<div style="display:flex;flex-direction:column;align-items:center;min-width:14px">' +
        '<div style="width:10px;height:10px;border-radius:50%;background:' + color +
          ';margin-top:4px;flex-shrink:0"></div>' +
        connector +
      '</div>' +
      '<div style="flex:1;padding-bottom:14px">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<span style="font-family:var(--M);font-size:9px;font-weight:700;color:' + color +
            ';background:' + color + '22;border-radius:3px;padding:2px 7px">' +
            escHtml(adj.type.replace(/_/g, ' ')) + '</span>' +
          '<span style="font-family:var(--M);font-size:9px;color:var(--tx3)">' + ts + '</span>' +
          pnlHtml +
        '</div>' +
        stratHtml + notesHtml + prevLegsHtml + newLegsHtml +
      '</div>' +
    '</div>';
  }).join('');
}

// Renders the MID price cell for the detail modal legs table.
// Shows mid value + source badge + bid/ask sub-line when available.
function _priceCellHtml(mark, ll) {
  if (mark === null || mark === undefined) {
    return '<span style="color:var(--tx3);font-family:var(--M);font-size:10px">--</span>';
  }
  var src    = ll.priceSource || null;
  var badge  = '';
  if (src === 'live_mid') {
    badge = '<span style="font-family:var(--M);font-size:7px;color:var(--gr);border:1px solid var(--gr);border-radius:2px;padding:0 3px;margin-left:4px">LIVE</span>';
  } else if (src === 'close_mid') {
    badge = '<span style="font-family:var(--M);font-size:7px;color:var(--am);border:1px solid var(--am);border-radius:2px;padding:0 3px;margin-left:4px" title="Last session close bid/ask — market is closed">CLOSE</span>';
  } else if (src === 'equity_live' || src === 'equity_close') {
    badge = '<span style="font-family:var(--M);font-size:7px;color:var(--tl);border:1px solid var(--tl);border-radius:2px;padding:0 3px;margin-left:4px">EQUITY</span>';
  }
  var sub = '';
  if (ll.bid !== null && ll.ask !== null) {
    sub = '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);margin-top:1px">' +
      ll.bid.toFixed(2) + ' / ' + ll.ask.toFixed(2) +
      '</div>';
  }
  return '<div style="display:inline-block;text-align:right">' +
    '<div style="font-family:var(--M);font-size:10px;font-weight:600">$' + parseFloat(mark).toFixed(2) + badge + '</div>' +
    sub +
  '</div>';
}

function _detailCell(label, valueHtml, raw) {
  return '<div>' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:3px">' + label + '</div>' +
    '<div style="font-size:11px;' + (raw ? '' : 'font-family:var(--M);') + 'color:var(--tx)">' + valueHtml + '</div>' +
  '</div>';
}
