function _closePreTradeRiskModal() {
  var el = document.getElementById('preTradeRiskModal');
  if (el) el.style.display = 'none';
}

function _showPreTradeRiskModal(check, onForceSave, onCancel) {
  var el    = document.getElementById('preTradeRiskModal');
  var inner = document.getElementById('preTradeRiskModalInner');
  if (!el || !inner) { if (onForceSave) onForceSave(); return; }

  var inp = check.inputs || {};
  var STATUS_COLOR = { OK: 'var(--gr)', WARNING: 'var(--am)', RED: 'var(--rd)' };
  var sc = STATUS_COLOR[check.status] || 'var(--tx)';

  function fmtD(v) {
    if (v == null) return 'unavailable';
    return (v >= 0 ? '+' : '') + parseFloat(v).toFixed(1);
  }
  function fmtRange(r) {
    if (!r) return '—';
    return 'Δ' + (r[0] >= 0 ? '+' : '') + r[0] + ' – Δ' +
           (r[1] >= 0 ? '+' : '') + r[1];
  }
  function fmtAbsRange(r) {
    if (!r) return '—';
    return 'Δ' + Math.abs(r[0]) + ' – Δ' + Math.abs(r[1]);
  }

  var deltaRangeLabel = '—';
  if (inp.deltaRangeStatus === 'within') {
    deltaRangeLabel = 'within ' + inp.bias + ' bias range ' + fmtRange(inp.deltaRange);
  } else if (inp.deltaRangeStatus === 'above') {
    deltaRangeLabel = '▲ above ' + inp.bias + ' bias range ' + fmtRange(inp.deltaRange);
  } else if (inp.deltaRangeStatus === 'below') {
    deltaRangeLabel = '▼ below ' + inp.bias + ' bias range ' + fmtRange(inp.deltaRange);
  } else if (inp.deltaRangeStatus === 'wrong_direction') {
    deltaRangeLabel = '⚠ WRONG DIRECTION vs ' + inp.bias;
  } else if (inp.deltaRangeStatus === 'unknown') {
    deltaRangeLabel = 'unknown (no Greek data)';
  }

  function row(label, val, col) {
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;' +
      'padding:5px 0;border-bottom:1px solid var(--b0)">' +
      '<span style="font-size:9px;font-family:var(--M);color:var(--tx3);letter-spacing:.04em">' +
        label + '</span>' +
      '<span style="font-size:10px;font-family:var(--M);font-weight:600;color:' +
        (col || 'var(--tx)') + '">' + val + '</span>' +
    '</div>';
  }

  var biasColor = { LONG: 'var(--gr)', SHORT: 'var(--rd)', NEUTRAL: 'var(--tx2)', UNKNOWN: 'var(--tx3)' };
  var volRangeStr = inp.selectedVolRange ? fmtAbsRange(inp.selectedVolRange) : '—';
  var wsdStr = inp.worstShortLegDelta != null ? 'Δ' + inp.worstShortLegDelta.toFixed(1) : '—';
  var wsdColor = (inp.toleranceBand && inp.worstShortLegDelta != null &&
    inp.worstShortLegDelta > inp.toleranceBand[1]) ? 'var(--rd)' :
    (inp.worstShortLegDelta != null && inp.selectedVolRange &&
     inp.worstShortLegDelta > inp.selectedVolRange[1]) ? 'var(--am)' : 'var(--tx)';

  // IVR display: show reason if available
  var ivrDisplay = inp.ivr != null
    ? inp.ivr.toFixed(0) + '% (TASTYTRADE)' + (inp.ivrReason ? ' · ' + inp.ivrReason : '')
    : 'unavailable' + (inp.ivrSource && inp.ivrSource !== 'TASTYTRADE' ? ' (' + inp.ivrSource + ' — not used)' : '');

  // Vol range label: distinguish VIX3M-only from combined
  var volRangeLabel = 'Short-leg |Δ| target (' + (inp.volatilityMode || 'conservative') + ')';

  var reasonHtml = '';
  if (check.reasons.length) {
    reasonHtml = '<div style="margin-top:10px;padding:8px 10px;' +
      'background:rgba(0,0,0,.18);border-radius:6px;border-left:2px solid ' + sc + '">' +
      check.reasons.map(function(r) {
        return '<div style="font-size:9px;font-family:var(--M);color:var(--tx2);' +
          'margin-bottom:3px;line-height:1.55">‣ ' + r + '</div>';
      }).join('') +
    '</div>';
  }

  var forceLbl = check.status === 'RED'
    ? 'Force save anyway — RED risk'
    : 'Force save anyway';
  var forceStyle = check.status === 'RED'
    ? 'background:var(--rd);border:none;color:#fff;'
    : 'background:var(--am);border:none;color:#000;';

  inner.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
      '<div style="font-size:13px;font-weight:700;color:var(--tx)">Pre-Trade Risk Check</div>' +
      '<span style="font-size:11px;font-family:var(--M);font-weight:700;color:' + sc + ';' +
        'background:rgba(0,0,0,.22);padding:3px 10px;border-radius:20px;border:1px solid ' + sc + '">' +
        check.status + '</span>' +
    '</div>' +
    row('Symbol', inp.symbol || '—') +
    row('Technical bias', inp.bias || 'UNKNOWN', biasColor[inp.bias] || 'var(--tx3)') +
    row('Trade Δ', fmtD(inp.estimatedTradeDelta), sc) +
    row('Position Δ check', deltaRangeLabel) +
    row('Underlying IVR', ivrDisplay) +
    row('VIX3M', inp.vix3m != null ? inp.vix3m.toFixed(2) : 'unavailable') +
    (inp.selectedVolRange ? row(volRangeLabel,
      volRangeStr + (inp.toleranceBand ? ' (tol. +' + _ptVolDeltaTolerance + 'Δ)' : '')) : '') +
    (inp.worstShortLegDelta != null ? row('Current short-leg |Δ|', wsdStr, wsdColor) : '') +
    reasonHtml +
    '<div style="margin-top:8px;font-size:8px;font-family:var(--M);color:var(--tx3);' +
      'font-style:italic;line-height:1.5">' +
      'Force save records the override flag in the trade for audit trail. ' +
      'Consider adjusting strikes or reducing size if warnings apply.' +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button onclick="_ptCancel()" style="flex:1;background:var(--bg3);border:1px solid var(--b0);' +
        'border-radius:7px;color:var(--tx);font-family:var(--M);font-size:10px;font-weight:700;' +
        'padding:10px;cursor:pointer">Edit trade / Cancel</button>' +
      '<button onclick="_ptForceSave()" style="flex:1;' + forceStyle + 'border-radius:7px;' +
        'font-family:var(--M);font-size:10px;font-weight:700;padding:10px;cursor:pointer">' +
        escHtml(forceLbl) + '</button>' +
    '</div>';

  el.style.display = 'flex';

  window._ptCancel = function() {
    _closePreTradeRiskModal();
    if (onCancel) onCancel();
  };
  window._ptForceSave = function() {
    _closePreTradeRiskModal();
    if (onForceSave) onForceSave();
  };
}