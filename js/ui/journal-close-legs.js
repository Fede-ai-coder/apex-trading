// ── CLOSE LEGS FORM ─────────────────────────────────────────────

var _closeLegsTradeId = null;

function showCloseLegsModal(tradeId) {
  var trade = journalManager.getById(tradeId);
  if (!trade) { showToast('Trade not found', 'warn'); return; }
  _closeLegsTradeId = tradeId;
  _renderCloseLegsForm(trade);
  document.getElementById('closeLegsModal').style.display = 'flex';
}

function closeLegsModal() {
  document.getElementById('closeLegsModal').style.display = 'none';
  _closeLegsTradeId = null;
}

function _renderCloseLegsForm(trade) {
  var content = document.getElementById('closeLegsContent');
  if (!content) return;
  var openItems = [];
  (trade.legs || []).forEach(function(leg, i) {
    if ((leg.legStatus || 'OPEN') !== 'CLOSED') openItems.push({leg: leg, idx: i});
  });
  if (!openItems.length) {
    content.innerHTML =
      '<div style="padding:30px;text-align:center;font-family:var(--M);font-size:11px;color:var(--tx3)">' +
      'All legs are already closed.</div>';
    return;
  }
  var today = new Date().toISOString().substring(0, 10);
  var thS = 'padding:4px 6px;text-align:left;border-bottom:1px solid var(--b0);font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em';
  var thR = 'padding:4px 6px;text-align:right;border-bottom:1px solid var(--b0);font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em';
  var legIdxList = openItems.map(function(it) { return it.idx; });

  var rows = openItems.map(function(item) {
    var leg  = item.leg;
    var idx  = item.idx;
    var tc   = leg.type === 'CALL' ? 'var(--bl)' : leg.type === 'PUT' ? 'var(--rd)' : 'var(--gr)';
    var sc   = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
    var mult = leg.type !== 'EQUITY' ? 100 : 1;
    return '<tr>' +
      '<td style="padding:8px 6px;vertical-align:middle">' +
        '<input type="checkbox" id="clChk' + idx + '" checked ' +
          'onchange="_clPnlPreview()" ' +
          'style="width:14px;height:14px;cursor:pointer;accent-color:var(--pu)"></td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:10px">' +
        '<span style="color:' + tc + ';font-weight:700">' + escHtml(leg.type) + '</span>' +
        ' <span style="color:' + sc + ';font-weight:700">' + escHtml(leg.side) + '</span>' +
        (leg.legLabel ? ' <span style="color:var(--tx3);font-size:9px">' + escHtml(leg.legLabel) + '</span>' : '') +
      '</td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:10px;text-align:right">' +
        (leg.qty || '--') + '</td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:10px;text-align:right;color:var(--tx2)">' +
        (leg.strike || '--') + '</td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:10px;color:var(--tx2)">' +
        (leg.expiry || '--') + '</td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:10px;text-align:right">' +
        (leg.entryPrice !== null && leg.entryPrice !== undefined ? '$' + parseFloat(leg.entryPrice).toFixed(2) : '--') + '</td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:9px;text-align:right;color:var(--tx3)">×' + mult + '</td>' +
      '<td style="padding:8px 6px">' +
        '<input type="number" id="clPrice' + idx + '" min="0" step="0.01" placeholder="0.00" ' +
          'oninput="_clPnlPreview()" ' +
          'style="width:88px;padding:5px 8px;background:var(--bg2);border:1px solid var(--b0);' +
          'border-radius:5px;color:var(--tx);font-family:var(--M);font-size:11px;outline:none"></td>' +
      '<td style="padding:8px 6px;font-family:var(--M);font-size:11px;font-weight:700;text-align:right;min-width:78px" id="clLPnl' + idx + '">' +
        '<span style="color:var(--tx3)">--</span></td>' +
    '</tr>';
  }).join('');

  content.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<div style="font-size:15px;font-weight:800;font-family:var(--M);letter-spacing:.05em">' +
        'CLOSE LEGS &mdash; ' + escHtml(trade.ticker || '--') + '</div>' +
      '<button onclick="closeLegsModal()" ' +
        'style="background:transparent;border:1px solid var(--b0);border-radius:6px;color:var(--tx3);' +
        'font-family:var(--M);font-size:10px;padding:5px 12px;cursor:pointer">&#x2715; CLOSE</button>' +
    '</div>' +
    '<div class="jfield" style="margin-bottom:14px;max-width:200px">' +
      '<label class="jlabel">CLOSE DATE <span style="color:var(--rd)">*</span></label>' +
      '<input class="jinput" id="clDate" type="date" value="' + today + '" oninput="_clPnlPreview()">' +
    '</div>' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:8px">' +
      'OPEN LEGS — check each leg to close and enter its execution price</div>' +
    '<div style="overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th style="' + thS + '"></th>' +
          '<th style="' + thS + '">LEG</th>' +
          '<th style="' + thR + '">QTY</th>' +
          '<th style="' + thR + '">STRIKE</th>' +
          '<th style="' + thS + '">EXPIRY</th>' +
          '<th style="' + thR + '">ENTRY</th>' +
          '<th style="' + thR + '">MULT</th>' +
          '<th style="' + thS + '">CLOSE PRICE <span style="color:var(--rd)">*</span></th>' +
          '<th style="' + thR + '">P&amp;L</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div style="background:var(--bg3);border:1px solid var(--b0);border-radius:6px;padding:12px 14px;' +
      'margin-top:12px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
      '<span style="font-family:var(--M);font-size:9px;color:var(--tx3);letter-spacing:.06em;min-width:90px">REALIZED P&amp;L</span>' +
      '<span id="clTotalPnl" style="font-family:var(--M);font-size:16px;font-weight:800;color:var(--tx3)">--</span>' +
      '<span style="font-family:var(--M);font-size:8px;color:var(--tx3)">' +
        'SHORT = (entry&minus;close)&times;qty&times;mult &nbsp;|&nbsp; LONG = (close&minus;entry)&times;qty&times;mult' +
      '</span>' +
    '</div>' +
    '<div id="clError" style="font-size:10px;font-family:var(--M);color:var(--rd);margin:8px 0;display:none"></div>' +
    '<div style="display:flex;gap:8px;margin-top:14px">' +
      '<button onclick="submitCloseLegs(' + JSON.stringify(legIdxList) + ')" class="runbtn" style="font-size:10px">' +
        'CONFIRM CLOSE</button>' +
      '<button onclick="closeLegsModal()" class="tbtn">CANCEL</button>' +
    '</div>';
}

function _clPnlPreview() {
  var trade = _closeLegsTradeId ? journalManager.getById(_closeLegsTradeId) : null;
  if (!trade) return;
  var total = 0, hasAny = false;
  (trade.legs || []).forEach(function(leg, idx) {
    var chk   = document.getElementById('clChk' + idx);
    var price = document.getElementById('clPrice' + idx);
    var pnlEl = document.getElementById('clLPnl' + idx);
    if (!chk || !price || !pnlEl) return;
    if (!chk.checked || price.value === '') { pnlEl.innerHTML = '<span style="color:var(--tx3)">--</span>'; return; }
    var cp    = parseFloat(price.value);
    var entry = parseFloat(leg.entryPrice);
    var qty   = parseFloat(leg.qty) || 0;
    var mult  = leg.type !== 'EQUITY' ? 100 : 1;
    if (isNaN(cp) || isNaN(entry) || qty <= 0) { pnlEl.innerHTML = '<span style="color:var(--tx3)">--</span>'; return; }
    var legPnL = leg.side === 'SHORT' ? (entry - cp) * qty * mult : (cp - entry) * qty * mult;
    legPnL = Math.round(legPnL * 100) / 100;
    pnlEl.innerHTML = '<span style="color:' + (legPnL >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
      (legPnL >= 0 ? '+' : '') + '$' + legPnL.toFixed(2) + '</span>';
    total += legPnL;
    hasAny = true;
  });
  var totEl = document.getElementById('clTotalPnl');
  if (totEl) {
    totEl.style.color = hasAny ? (total >= 0 ? 'var(--gr)' : 'var(--rd)') : 'var(--tx3)';
    totEl.textContent = hasAny ? ((total >= 0 ? '+' : '') + '$' + total.toFixed(2)) : '--';
  }
}

async function submitCloseLegs(legIdxList) {
  var errEl = document.getElementById('clError');
  if (errEl) errEl.style.display = 'none';
  function clErr(msg) { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } }

  if (!_closeLegsTradeId) { clErr('No trade selected.'); return; }
  var trade = journalManager.getById(_closeLegsTradeId);
  if (!trade)             { clErr('Trade not found.'); return; }

  var dateEl    = document.getElementById('clDate');
  var closeDate = dateEl ? dateEl.value : new Date().toISOString().substring(0, 10);
  if (!closeDate) { clErr('Close date is required.'); return; }

  var legCloses = [], checkedCount = 0, missingPrice = false;
  (legIdxList || []).forEach(function(idx) {
    var chk   = document.getElementById('clChk' + idx);
    var price = document.getElementById('clPrice' + idx);
    if (!chk || !chk.checked) return;
    checkedCount++;
    var cp = price ? parseFloat(price.value) : NaN;
    if (!price || price.value === '' || isNaN(cp)) { missingPrice = true; return; }
    legCloses.push({idx: idx, closeDate: closeDate, closePrice: cp});
  });

  if (checkedCount === 0) { clErr('Select at least one leg to close.'); return; }
  if (missingPrice)       { clErr('Enter close price for every selected leg.'); return; }

  // Disable confirm button during async snapshot build
  var confirmBtn = document.querySelector('#closeLegsContent .runbtn');
  if (confirmBtn) confirmBtn.disabled = true;

  try {
    // Determine if this close will close ALL remaining open legs
    var openLegIdxs = (trade.legs || []).reduce(function(acc, l, i) {
      if ((l.legStatus || 'OPEN') !== 'CLOSED') acc.push(i);
      return acc;
    }, []);
    var closingIdxs = legCloses.map(function(lc) { return lc.idx; });
    var allWillClose = openLegIdxs.every(function(i) { return closingIdxs.indexOf(i) !== -1; });

    // Build Greeks snapshot from current live data
    var greeksSnap = null;
    if (S.ttConnected || (trade.live && trade.live.legsLive)) {
      try {
        var pos = positionManager.getById(trade.id);
        if (pos) greeksSnap = aggregateGreeks([pos], _spyPrice);
      } catch (e) { /* ok */ }
    }
    var greeksMerge = greeksSnap ? {
      delta:            greeksSnap.totalDelta        !== null ? greeksSnap.totalDelta        : undefined,
      theta:            greeksSnap.totalTheta        !== null ? greeksSnap.totalTheta        : undefined,
      gamma:            greeksSnap.totalGamma        !== null ? greeksSnap.totalGamma        : undefined,
      vega:             greeksSnap.totalVega         !== null ? greeksSnap.totalVega         : undefined,
      vegaCall:         greeksSnap.vegaCall          !== null ? greeksSnap.vegaCall          : undefined,
      vegaPut:          greeksSnap.vegaPut           !== null ? greeksSnap.vegaPut           : undefined,
      beta:             greeksSnap.avgBeta           !== null ? greeksSnap.avgBeta           : undefined,
      betaWeightedDelta:greeksSnap.betaWeightedDelta !== null ? greeksSnap.betaWeightedDelta : undefined,
    } : {};

    journalManager.closeLegs(_closeLegsTradeId, legCloses);

    // Attach exit snapshot once — only when all legs just closed (and not already set)
    if (allWillClose) {
      var updatedTrade = journalManager.getById(_closeLegsTradeId);
      if (updatedTrade && !updatedTrade.exitSnapshot) {
        await _journalSnapshotPrefetch(updatedTrade.ticker || '', updatedTrade.legs || []);
        var exitSnapshot = await _buildRichSnapshot(trade.ticker || '', greeksMerge);
        journalManager.setExitSnapshot(_closeLegsTradeId, exitSnapshot);
        if (exitSnapshot.indicatorSource === 'UNAVAILABLE') {
          _scheduleSnapshotTechRetry(_closeLegsTradeId, updatedTrade.ticker || '', 'exitSnapshot', exitSnapshot);
        }
      }
    }

    var tid = _closeLegsTradeId;
    closeLegsModal();
    showTradeDetails(tid);
    renderPortfolioJournalView();
    renderPortfolioView();
    showToast('Leg(s) closed for ' + (trade.ticker || 'trade'), 'ok');
  } catch(e) {
    clErr(e.message);
    if (confirmBtn) confirmBtn.disabled = false;
  }
}
