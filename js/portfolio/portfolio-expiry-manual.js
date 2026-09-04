// ── Manual expiry resolution (ITM/UNKNOWN expired legs) ──────────
// Opens a modal listing every ITM/UNKNOWN expired leg with a per-leg
// resolution form. Never auto-closes at $0 and never fabricates P&L.
var _manualExpiryPortfolioId = null;
function _pfExpiryManualClose() {
  var m = document.getElementById('manualExpiryModal');
  if (m) m.style.display = 'none';
  _manualExpiryPortfolioId = null;
}
function _pfExpiryResolveManual(portfolioId) {
  var scan = portfolioExpiry.scanAll(portfolioId);
  var items = [];
  scan.forEach(function(r) {
    r.expiredLegs.forEach(function(e) {
      if (e.classification !== 'OTM') items.push({trade: r.trade, exp: e});
    });
  });
  if (!items.length) {
    showToast('No ITM/uncertain expired legs to resolve.', 'ok');
    return;
  }
  _manualExpiryPortfolioId = portfolioId;
  var content = document.getElementById('manualExpiryContent');
  if (!content) {
    // Fallback if modal DOM is unavailable for any reason.
    var lines = items.map(function(it) {
      return '• ' + (it.trade.ticker || '?') + ' #' + it.trade.id +
        ' — ' + (it.exp.leg.side || '?') + ' ' + (it.exp.leg.type || '?') +
        ' ' + (it.exp.leg.strike != null ? it.exp.leg.strike : '?') +
        ' exp ' + it.exp.expiry + ' [' + it.exp.classification + ']';
    });
    alert('MANUAL RESOLUTION required for these legs:\n\n' + lines.join('\n') +
          '\n\nThese legs cannot be auto-closed at $0. Choose the correct ' +
          'resolution in the Trading Journal: assigned, exercised, cash-settled, ' +
          'or manually closed.');
    return;
  }
  var today = new Date().toISOString().substring(0, 10);
  var statusOpts =
    '<option value="">Choose resolution...</option>' +
    '<option value="EXPIRED_ITM_REVIEW">EXPIRED_ITM_REVIEW (mark for review, stays active)</option>' +
    '<option value="ASSIGNED">ASSIGNED (terminal)</option>' +
    '<option value="EXERCISED">EXERCISED (terminal)</option>' +
    '<option value="CASH_SETTLED">CASH_SETTLED (terminal)</option>' +
    '<option value="CLOSED_MANUAL">CLOSED_MANUAL (terminal)</option>';
  var thS = 'padding:4px 6px;text-align:left;border-bottom:1px solid var(--b0);font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em';
  var thR = 'padding:4px 6px;text-align:right;border-bottom:1px solid var(--b0);font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em';
  var rows = items.map(function(it, i) {
    var leg = it.exp.leg;
    var tc  = leg.type === 'CALL' ? 'var(--bl)' : leg.type === 'PUT' ? 'var(--rd)' : 'var(--gr)';
    var sc  = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
    return '<tr data-tid="' + it.trade.id + '" data-lidx="' + it.exp.legIdx + '">' +
      '<td style="padding:6px;font-family:var(--M);font-size:10px">' +
        '<strong>' + escHtml(it.trade.ticker || '?') + '</strong>' +
        '<div style="font-size:8px;color:var(--tx3)">#' + it.trade.id + '</div></td>' +
      '<td style="padding:6px;font-family:var(--M);font-size:10px">' +
        '<span style="color:' + tc + ';font-weight:700">' + escHtml(leg.type || '') + '</span> ' +
        '<span style="color:' + sc + ';font-weight:700">' + escHtml(leg.side || '') + '</span>' +
        ' x' + (leg.qty || 1) +
        '<div style="font-size:9px;color:var(--tx3)">K ' + (leg.strike != null ? leg.strike : '?') +
          ' &middot; exp ' + (it.exp.expiry || '?') +
          ' &middot; <span style="color:var(--am)">' + escHtml(it.exp.classification) + '</span></div></td>' +
      '<td style="padding:6px"><select class="jinput mer-status" ' +
        'style="padding:4px 6px;font-size:10px;min-width:170px">' + statusOpts + '</select></td>' +
      '<td style="padding:6px"><input class="jinput mer-exit" type="number" step="0.01" min="0" placeholder="exit $" ' +
        'style="width:80px;padding:4px 6px;font-size:10px"></td>' +
      '<td style="padding:6px"><input class="jinput mer-pnl" type="number" step="0.01" placeholder="P&L $" ' +
        'style="width:90px;padding:4px 6px;font-size:10px"></td>' +
      '<td style="padding:6px"><input class="jinput mer-date" type="date" value="' + (it.exp.expiry || today) + '" ' +
        'style="padding:4px 6px;font-size:10px;width:130px"></td>' +
      '<td style="padding:6px"><input class="jinput mer-note" type="text" placeholder="note" ' +
        'style="width:140px;padding:4px 6px;font-size:10px"></td>' +
    '</tr>';
  }).join('');
  content.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
      '<div style="font-size:15px;font-weight:800;font-family:var(--M);letter-spacing:.05em">' +
        'MANUAL EXPIRY RESOLUTION</div>' +
      '<button onclick="_pfExpiryManualClose()" ' +
        'style="background:transparent;border:1px solid var(--b0);border-radius:6px;color:var(--tx3);' +
        'font-family:var(--M);font-size:10px;padding:5px 12px;cursor:pointer">&#x2715; CLOSE</button>' +
    '</div>' +
    '<div style="font-size:10px;color:var(--tx2);margin-bottom:14px;line-height:1.5">' +
      'These legs cannot be auto-closed at $0. Choose the correct resolution: ' +
      'assigned, exercised, cash-settled, or manually closed. ' +
      'Provide exit price <em>or</em> realized P&amp;L (P&amp;L is derived from exit price if left blank). ' +
      'Settlement Greeks/quotes captured at this moment are from the current cache and are NOT official expiry-time values.' +
    '</div>' +
    '<div style="overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th style="' + thS + '">TRADE</th>' +
          '<th style="' + thS + '">LEG</th>' +
          '<th style="' + thS + '">RESOLUTION</th>' +
          '<th style="' + thR + '">EXIT $</th>' +
          '<th style="' + thR + '">REAL P&amp;L $</th>' +
          '<th style="' + thS + '">DATE</th>' +
          '<th style="' + thS + '">NOTE</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">' +
      '<button class="tbtn" onclick="_pfExpiryManualClose()">CANCEL</button>' +
      '<button class="runbtn" style="font-size:10px" onclick="_pfExpiryManualSubmit()">APPLY RESOLUTIONS</button>' +
    '</div>';
  document.getElementById('manualExpiryModal').style.display = 'flex';
}
function _pfExpiryManualSubmit() {
  var rows = document.querySelectorAll('#manualExpiryContent tbody tr');
  // Terminal statuses require user-entered exitPrice or realizedPnl —
  // never fabricate settlement P&L. EXPIRED_ITM_REVIEW is review-only
  // and may be submitted with no P&L.
  var TERMINAL = {ASSIGNED:1, EXERCISED:1, CASH_SETTLED:1, CLOSED_MANUAL:1};
  var byTrade = {};
  var anyChosen = false;
  var missingPnL = false;
  rows.forEach(function(tr) {
    var status = tr.querySelector('.mer-status').value;
    if (!status) return; // explicit placeholder — skip silently
    anyChosen = true;
    var tid   = +tr.getAttribute('data-tid');
    var lidx  = +tr.getAttribute('data-lidx');
    var exitV = tr.querySelector('.mer-exit').value;
    var pnlV  = tr.querySelector('.mer-pnl').value;
    var dateV = tr.querySelector('.mer-date').value;
    var noteV = tr.querySelector('.mer-note').value;
    if (TERMINAL[status] && exitV === '' && pnlV === '') {
      missingPnL = true;
      return;
    }
    if (!byTrade[tid]) byTrade[tid] = [];
    byTrade[tid].push({
      legIdx:      lidx,
      status:      status,
      exitPrice:   exitV !== '' ? +exitV : null,
      realizedPnl: pnlV  !== '' ? +pnlV  : null,
      closeDate:   dateV || null,
      note:        noteV || null,
    });
  });
  if (!anyChosen) {
    showToast('Choose a resolution for at least one expired leg.', 'warn');
    return;
  }
  if (missingPnL) {
    showToast('Terminal expiry resolutions require exit price or realized P&L.', 'warn');
    return;
  }
  var totalApplied = 0, totalReview = 0;
  Object.keys(byTrade).forEach(function(tid) {
    var res = portfolioExpiry.applyManualResolution(+tid, byTrade[tid]);
    totalApplied += res.applied;
    totalReview  += res.reviewMarked;
  });
  showToast('Manual resolution: ' + totalApplied + ' applied' +
            (totalReview ? ', ' + totalReview + ' marked for review' : ''),
            totalApplied || totalReview ? 'ok' : 'warn');
  _pfExpiryManualClose();
  if (_manualExpiryPortfolioId != null) renderPositionsPanel(_manualExpiryPortfolioId);
  else if (typeof renderPositionsPanel === 'function' && typeof _activePanelPortfolioId !== 'undefined' && _activePanelPortfolioId != null) {
    renderPositionsPanel(_activePanelPortfolioId);
  }
  if (typeof renderPortfolioJournalView === 'function') renderPortfolioJournalView();
}
