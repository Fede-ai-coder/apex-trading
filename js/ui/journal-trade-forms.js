// ── Journal form: chain-aware expiry / strike change handlers ────
function _onJtLegExpChange(idx, expiry) {
  if (_jtFormLegs[idx]) {
    _jtFormLegs[idx].expiry = expiry || null;
    _jtFormLegs[idx].expiration = expiry || null;
    _jtFormLegs[idx].expirationDate = expiry || null;
    _jtFormLegs[idx].expiryDate = expiry || null;
    _jtFormLegs[idx].strike = null;
    _jtFormLegs[idx].streamerSymbol = null;
    _jtFormLegs[idx].optionSymbol = null;
    _jtFormLegs[idx].dxlinkSymbol = null;
    _jtFormLegs[idx].symbol = null;
    console.log('[JT LEG EXP CHANGE]', JSON.stringify({ idx: idx, expiry: expiry }));
  }
  _renderJtLegsTable();
}

function _onJtLegStrikeChange(idx, strikeVal) {
  if (!_jtFormLegs[idx]) return;
  var sp = parseFloat(strikeVal);
  _jtFormLegs[idx].strike = isNaN(sp) ? null : sp;
  _jtFormLegs[idx].streamerSymbol = null;
  var ticker = ((document.getElementById('jtTicker') || {}).value || '').trim().toUpperCase();
  _setLegStreamerFromChain(_jtFormLegs, idx, ticker);
  // Fallback: if chain lookup didn't set it, use builder so state is never null after a valid selection
  if (!_jtFormLegs[idx].streamerSymbol) {
    var fb = _deriveJtLegStreamer(idx);
    if (fb) _jtFormLegs[idx].streamerSymbol = fb;
  }
  normalizeOptionLegSymbolAliases(ticker, _jtFormLegs[idx]);
  console.log('[JT LEG STRIKE CHANGE]', JSON.stringify({
    idx: idx, strike: _jtFormLegs[idx].strike, streamerSymbol: _jtFormLegs[idx].streamerSymbol,
  }));
  _renderJtLegsTable();
}

// ── JOURNAL MANUAL ENTRY FORM (multi-leg) ────────────────────────
var _jtFormLegs     = [];
var _jtFormStrategy = '';
var _jtFormStatus   = 'OPEN';
var _jtEditId       = null;   // null = new trade; number = editing existing trade by id
var _jtPreselectPfId = null;  // optional portfolio id preselected when opening the form

// Adjustment form state
var _adjFormTradeId     = null;
var _adjFormNewLegs     = [];
var _adjFormNewStrategy = '';
var _adjFormLegsToRoll      = [];
var _adjFormRollClosePrices = {};  // legTradeIdx -> close price (number|null)

function showAddTradeForm(preselectPortfolioId) {
  var portfolios = portfolioManager.getAll();
  if (!portfolios.length) {
    showToast('Create a portfolio first', 'warn');
    showView('portfolio');
    setTimeout(showNewPortfolioForm, 200);
    return;
  }
  _jtFormLegs     = [];
  _jtFormStrategy = '';
  _jtFormStatus   = 'OPEN';
  _jtEditId       = null;
  _jtPreselectPfId = (preselectPortfolioId != null && preselectPortfolioId !== '') ? String(preselectPortfolioId) : null;
  _renderJtForm();
  document.getElementById('addTradeFormWrap').style.display = 'block';
  document.getElementById('addTradeFormWrap').scrollIntoView({behavior:'smooth', block:'nearest'});
}

function showEditTradeForm(id) {
  var trade = journalManager.getById(id);
  if (!trade) { showToast('Trade not found', 'warn'); return; }
  _jtEditId       = id;
  _jtFormStrategy = trade.strategy || '';
  _jtFormStatus   = trade.status || (trade.exitDate ? 'CLOSED' : 'OPEN');
  _jtFormLegs     = (trade.legs || []).map(function(l) { return Object.assign({}, l); });
  _renderJtForm();
  document.getElementById('addTradeFormWrap').style.display = 'block';
  document.getElementById('addTradeFormWrap').scrollIntoView({behavior:'smooth', block:'nearest'});
}

function _renderJtForm() {
  var wrap = document.getElementById('addTradeFormWrap');
  if (!wrap) return;
  var isEdit    = !!_jtEditId;
  var editTrade = isEdit ? journalManager.getById(_jtEditId) : null;
  var isClosed  = (_jtFormStatus === 'CLOSED');

  var portfolios = portfolioManager.getAll();
  var selPfId;
  if (editTrade) {
    selPfId = (editTrade.portfolioId != null) ? editTrade.portfolioId : '__unassigned';
  } else {
    selPfId = _jtPreselectPfId != null ? _jtPreselectPfId : '';
  }
  var pfOpts = '<option value="">&#8212; Select Portfolio &#8212;</option>' +
    portfolios.map(function(p) {
      return '<option value="' + p.id + '"' + (String(p.id) === String(selPfId) ? ' selected' : '') + '>' +
        escHtml(p.name) + '</option>';
    }).join('') +
    '<option value="__unassigned"' + (String(selPfId) === '__unassigned' ? ' selected' : '') + '>&#8212; Unassigned (explicit) &#8212;</option>';

  var stratOpts = '<option value="">Select strategy...</option>' +
    Object.keys(STRATEGY_TEMPLATES).map(function(k) {
      return '<option value="' + k + '"' + (k === _jtFormStrategy ? ' selected' : '') + '>' +
        STRATEGY_TEMPLATES[k].label + '</option>';
    }).join('');

  var tickerVal    = editTrade ? escHtml(editTrade.ticker || '') : escHtml(S.selectedTicker || '');
  var entryDateVal = editTrade ? (editTrade.entryDate || '') : new Date().toISOString().substring(0, 10);
  var exitDateVal  = editTrade ? (editTrade.exitDate  || '') : '';
  var pnlVal       = (editTrade && editTrade.realizedPnL !== null && editTrade.realizedPnL !== undefined)
                     ? editTrade.realizedPnL : '';
  var notesVal     = editTrade ? escHtml(editTrade.notes || '') : '';
  var pnlSuffix    = isClosed ? '<span style="color:var(--rd)">*</span>' : '<span style="color:var(--tx3)">opt</span>';
  var exitSuffix   = isClosed ? '<span style="color:var(--rd)">*</span>' : '<span style="color:var(--tx3)">opt</span>';

  wrap.innerHTML =
    '<div class="jform">' +
      '<div class="jform-title">' + (isEdit ? 'Edit Trade' : 'Log Trade') + '</div>' +
      '<div class="jform-sub">Fields marked <span style="color:var(--rd)">*</span> are required</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1.4fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
        '<div class="jfield"><label class="jlabel">PORTFOLIO <span style="color:var(--rd)">*</span></label>' +
          '<select class="jinput req" id="jtPortfolio">' + pfOpts + '</select></div>' +
        '<div class="jfield"><label class="jlabel">TICKER <span style="color:var(--rd)">*</span></label>' +
          '<input class="jinput req" id="jtTicker" type="text" placeholder="e.g. AAPL" ' +
            'style="text-transform:uppercase" value="' + tickerVal + '" ' +
            // oninput: local streamer recompute only (no network). The option chain is
            // fetched only once the ticker is CONFIRMED (onchange = Enter/blur, or the
            // blur handler), so typing "AMD" never fires /option-chains/A or /AM.
            'oninput="refreshAllJtLegStreamers()" ' +
            'onchange="refreshAllJtLegStreamers();_fetchAndRenderChain(\'jt\')" ' +
            'onblur="_fetchAndRenderChain(\'jt\')"></div>' +
        '<div class="jfield"><label class="jlabel">STRATEGY <span style="color:var(--rd)">*</span></label>' +
          '<select class="jinput req" id="jtStrategy" onchange="onJtStrategyChange()">' + stratOpts + '</select></div>' +
        '<div class="jfield"><label class="jlabel">ENTRY DATE <span style="color:var(--rd)">*</span></label>' +
          '<input class="jinput req" id="jtEntryDate" type="date" value="' + entryDateVal + '"></div>' +
        '<div class="jfield"><label class="jlabel">STATUS <span style="color:var(--rd)">*</span></label>' +
          '<select class="jinput req" id="jtStatus" onchange="onJtStatusChange()">' +
            '<option value="OPEN"'   + (_jtFormStatus === 'OPEN'   ? ' selected' : '') + '>OPEN</option>' +
            '<option value="CLOSED"' + (_jtFormStatus === 'CLOSED' ? ' selected' : '') + '>CLOSED (backfill)</option>' +
          '</select></div>' +
      '</div>' +
      '<div id="jtLegsWrap"></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 2fr;gap:10px;margin-top:10px">' +
        '<div class="jfield"><label class="jlabel" id="jtPnLLabel">REALIZED P&amp;L ($) ' + pnlSuffix + '</label>' +
          '<input class="jinput' + (isClosed ? ' req' : '') + '" id="jtRealizedPnL" type="number" step="0.01" ' +
            'value="' + pnlVal + '" placeholder="e.g. 185.00 or -42.00"></div>' +
        '<div class="jfield"><label class="jlabel" id="jtExitLabel">EXIT DATE ' + exitSuffix + '</label>' +
          '<input class="jinput' + (isClosed ? ' req' : '') + '" id="jtExitDate" type="date" value="' + exitDateVal + '"></div>' +
        '<div class="jfield"><label class="jlabel">NOTES</label>' +
          '<input class="jinput" id="jtNotes" type="text" value="' + notesVal + '" ' +
            'placeholder="Strategy rationale, setup quality..."></div>' +
      '</div>' +
      '<div id="jtFormError" style="font-size:10px;font-family:var(--M);color:var(--rd);margin:8px 0;display:none"></div>' +
      '<div style="display:flex;gap:8px;margin-top:12px">' +
        '<button onclick="submitTrade()" class="runbtn" style="font-size:10px">' +
          (isEdit ? 'UPDATE TRADE' : 'LOG TRADE') + '</button>' +
        '<button onclick="cancelJtForm()" class="tbtn">CANCEL</button>' +
      '</div>' +
    '</div>';

  if (_jtFormLegs.length) _renderJtLegsTable();
  // Pre-fetch chain when form opens with a ticker already filled (e.g. edit mode)
  if (tickerVal) _fetchAndRenderChain('jt');
}

function onJtStrategyChange() {
  var sel = document.getElementById('jtStrategy');
  if (!sel || !sel.value) return;
  _jtFormStrategy = sel.value;
  var tmpl = STRATEGY_TEMPLATES[_jtFormStrategy];
  if (!tmpl) return;
  _jtFormLegs = tmpl.legs.map(function(l) { return Object.assign({}, l); });
  _renderJtLegsTable();
}

function onJtStatusChange() {
  var sel = document.getElementById('jtStatus');
  if (!sel) return;
  _jtFormStatus = sel.value;
  var isClosed = (_jtFormStatus === 'CLOSED');
  var pnlEl   = document.getElementById('jtRealizedPnL');
  var exitEl  = document.getElementById('jtExitDate');
  var pnlLbl  = document.getElementById('jtPnLLabel');
  var exitLbl = document.getElementById('jtExitLabel');
  if (pnlEl)  pnlEl.classList.toggle('req', isClosed);
  if (exitEl) exitEl.classList.toggle('req', isClosed);
  if (pnlLbl)  pnlLbl.innerHTML = 'REALIZED P&amp;L ($) ' +
    (isClosed ? '<span style="color:var(--rd)">*</span>' : '<span style="color:var(--tx3)">opt</span>');
  if (exitLbl) exitLbl.innerHTML = 'EXIT DATE ' +
    (isClosed ? '<span style="color:var(--rd)">*</span>' : '<span style="color:var(--tx3)">opt</span>');
}

// Renders the leg rows inside #jtLegsWrap from _jtFormLegs state.
// Expiry and strike render as guided dropdowns when chain data is cached for the ticker.
function _renderJtLegsTable() {
  var wrap = document.getElementById('jtLegsWrap');
  if (!wrap) return;
  var isCustom = (_jtFormStrategy === 'CUSTOM');
  var ticker = ((document.getElementById('jtTicker') || {}).value || '').trim().toUpperCase();
  var chain  = ticker ? _optChainCache[ticker] : null;

  var typeOpts = function(sel) {
    return ['CALL','PUT','EQUITY'].map(function(t) {
      return '<option value="' + t + '"' + (sel === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
  };
  var sideOpts = function(sel) {
    return ['LONG','SHORT'].map(function(s) {
      return '<option value="' + s + '"' + (sel === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
  };

  // Option-chain failure banner: when the chain for the CONFIRMED ticker timed out
  // or 500'd, show a clear message + Retry instead of a mute empty date input. The
  // date-input Expiry fallback below still works, so manual entry is never blocked.
  var html = '';
  var _cErr = _chainError && _chainError.jt;
  if (_cErr && ticker && _cErr.ticker === ticker) {
    var _cMsg = _optionChainErrorText(ticker, _cErr.message);
    html += '<div id="jtChainErr" style="font-size:10px;font-family:var(--M);color:var(--am);' +
      'background:var(--bg3);border:1px solid var(--am);border-radius:5px;padding:6px 8px;margin-bottom:8px;' +
      'display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<span>' + _cMsg + ' Enter expiry manually, or</span>' +
      '<button onclick="_fetchAndRenderChain(\'jt\',true)" class="tbtn" style="font-size:9px">RETRY OPTION CHAIN</button>' +
      '</div>';
  } else if (chain && chain.stale === true) {
    // Backend served a cached/stale chain (provider slow). The chain is usable —
    // show a non-blocking "cached" badge + a Refresh action instead of an error.
    html += '<div id="jtChainStale" style="font-size:10px;font-family:var(--M);color:var(--tx);' +
      'background:var(--bg3);border:1px solid var(--bd);border-radius:5px;padding:6px 8px;margin-bottom:8px;' +
      'display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
      '<span style="background:var(--am);color:#000;border-radius:3px;padding:1px 5px;font-weight:700">CACHED</span>' +
      '<span>Showing a recently cached option chain for ' + escHtml(ticker) + ' (provider slow). Data is usable.</span>' +
      '<button onclick="_fetchAndRenderChain(\'jt\',true)" class="tbtn" style="font-size:9px">REFRESH</button>' +
      '</div>';
  }

  html += '<div style="overflow-x:auto"><table class="leg-table"><thead><tr>' +
    '<th style="min-width:130px">LEG</th>' +
    '<th>TYPE</th><th>SIDE</th><th>QTY</th><th>ENTRY $</th><th>STRIKE</th>' +
    '<th>EXPIRY</th><th>STREAMER SYM (auto)</th>' +
    (isCustom ? '<th></th>' : '') +
  '</tr></thead><tbody>';

  _jtFormLegs.forEach(function(leg, idx) {
    var derived    = _deriveJtLegStreamer(idx);
    var symVal     = leg.streamerSymbol || '';
    var mismatch   = symVal && derived && symVal !== derived;
    var legDisplay = isCustom ? ('Leg ' + (idx + 1)) : (leg.legLabel || ('Leg ' + (idx + 1)));

    // EXPIRY cell — dropdown when chain available, else date input
    var expiryCell;
    var chainExps = chain && chain.expirations && chain.expirations.length ? chain.expirations : null;
    if (chainExps) {
      var expOpts = chainExps.map(function(d) {
        return '<option value="' + d + '"' + (leg.expiry === d ? ' selected' : '') + '>' + d + '</option>';
      }).join('');
      expiryCell = '<select class="jinput" id="jtLegExpiry' + idx + '" style="padding:4px 6px;font-size:10px;width:130px" ' +
        'onchange="_onJtLegExpChange(' + idx + ',this.value)">' +
        '<option value="">-- expiry --</option>' + expOpts + '</select>';
    } else {
      expiryCell = '<input class="jinput" id="jtLegExpiry' + idx + '" type="date" style="padding:4px 6px;font-size:10px;width:130px" ' +
        'value="' + (leg.expiry || '') + '" ' +
        'oninput="updateJtLegField(' + idx + ',\'expiry\',this.value||null);updateJtLegStreamer(' + idx + ')">';
    }

    // STRIKE cell — dropdown when chain has strikes for selected expiry, else number input
    var strikeCell;
    var chainStrikes = chain && leg.expiry && chain.byExp[leg.expiry] ? chain.byExp[leg.expiry] : null;
    if (chainStrikes && chainStrikes.length) {
      var stOpts = chainStrikes.map(function(s) {
        var isSel = (leg.strike !== null && Math.abs(s.strikePrice - leg.strike) < 0.001) ? ' selected' : '';
        return '<option value="' + s.strikePrice + '"' + isSel + '>' + s.strikePrice + '</option>';
      }).join('');
      strikeCell = '<select class="jinput" id="jtLegStrike' + idx + '" style="padding:4px 6px;font-size:10px;width:90px" ' +
        'onchange="_onJtLegStrikeChange(' + idx + ',this.value)">' +
        '<option value="">-- strike --</option>' + stOpts + '</select>';
    } else {
      strikeCell = '<input class="jinput" id="jtLegStrike' + idx + '" type="number" min="0" step="0.5" ' +
        'style="padding:4px 6px;font-size:10px;width:68px" value="' + (leg.strike !== null ? leg.strike : '') + '" ' +
        'placeholder="350" oninput="updateJtLegField(' + idx + ',\'strike\',this.value===\'\'?null:+this.value);updateJtLegStreamer(' + idx + ')">';
    }

    html += '<tr>' +
      '<td style="font-size:9px;font-family:var(--M);color:var(--tx2);line-height:1.4;padding:4px 6px;max-width:160px;white-space:normal">' +
        escHtml(legDisplay) + '</td>' +
      '<td><select class="jinput" id="jtLegType' + idx + '" style="padding:4px 6px;font-size:10px;min-width:74px" ' +
        'onchange="updateJtLegField(' + idx + ',\'type\',this.value);updateJtLegStreamer(' + idx + ')">' +
        typeOpts(leg.type) + '</select></td>' +
      '<td><select class="jinput" id="jtLegSide' + idx + '" style="padding:4px 6px;font-size:10px;min-width:68px" ' +
        'onchange="updateJtLegField(' + idx + ',\'side\',this.value)">' +
        sideOpts(leg.side) + '</select></td>' +
      '<td><input class="jinput req" id="jtLegQty' + idx + '" type="number" min="1" step="1" ' +
        'style="padding:4px 6px;font-size:10px;width:56px" value="' + (leg.qty || '') + '" ' +
        'oninput="updateJtLegField(' + idx + ',\'qty\',this.value===\'\'?null:+this.value)"></td>' +
      '<td><input class="jinput req" type="number" min="0" step="0.01" ' +
        'style="padding:4px 6px;font-size:10px;width:72px" value="' + (leg.entryPrice !== null ? leg.entryPrice : '') + '" ' +
        'placeholder="e.g. 2.50" oninput="updateJtLegField(' + idx + ',\'entryPrice\',this.value===\'\'?null:+this.value)"></td>' +
      '<td>' + strikeCell + '</td>' +
      '<td>' + expiryCell + '</td>' +
      '<td><input class="jinput" type="text" id="jtLegSym' + idx + '" ' +
        'style="padding:4px 6px;font-size:10px;width:160px;text-transform:uppercase' +
          (mismatch ? ';border-color:var(--am)' : '') + '" ' +
        'value="' + escHtml(symVal) + '" ' +
        'placeholder="' + escHtml(derived || 'auto') + '" ' +
        (mismatch ? 'title="Does not match derived: ' + escHtml(derived) + '" ' : '') +
        'oninput="updateJtLegField(' + idx + ',\'streamerSymbol\',this.value.trim().toUpperCase()||null);' +
          '_validateJtSymbol(' + idx + ')"></td>' +
      (isCustom ? '<td><button onclick="removeJtLeg(' + idx + ')" ' +
        'style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:16px;line-height:1;padding:2px 5px" ' +
        'title="Remove leg">&#215;</button></td>' : '') +
    '</tr>';
  });

  html += '</tbody></table></div>';
  if (isCustom) {
    html += '<button onclick="addJtCustomLeg()" class="tbtn" style="margin-top:6px;font-size:9px">+ ADD LEG</button>';
  }
  wrap.innerHTML = html;
}

function updateJtLegField(idx, field, value) {
  if (!_jtFormLegs[idx]) return;
  _jtFormLegs[idx][field] = value;
  if (field === 'expiry') {
    _jtFormLegs[idx].expiration = value || null;
    _jtFormLegs[idx].expirationDate = value || null;
    _jtFormLegs[idx].expiryDate = value || null;
  }
  if (field === 'streamerSymbol') {
    _jtFormLegs[idx].optionSymbol = value || null;
    _jtFormLegs[idx].dxlinkSymbol = value || null;
    _jtFormLegs[idx].symbol = value || null;
  }
}

function _syncJtFormLegsFromDom() {
  _jtFormLegs.forEach(function(leg, idx) {
    if (!leg) return;
    var typeEl = document.getElementById('jtLegType' + idx);
    var sideEl = document.getElementById('jtLegSide' + idx);
    var qtyEl = document.getElementById('jtLegQty' + idx);
    var expiryEl = document.getElementById('jtLegExpiry' + idx);
    var strikeEl = document.getElementById('jtLegStrike' + idx);
    var symEl = document.getElementById('jtLegSym' + idx);
    if (typeEl && typeEl.value) leg.type = typeEl.value;
    if (sideEl && sideEl.value) leg.side = sideEl.value;
    if (qtyEl && qtyEl.value !== '') leg.qty = +qtyEl.value;
    if (expiryEl && expiryEl.value) {
      leg.expiry = expiryEl.value;
      leg.expiration = expiryEl.value;
      leg.expirationDate = expiryEl.value;
      leg.expiryDate = expiryEl.value;
    }
    if (strikeEl && strikeEl.value !== '') leg.strike = +strikeEl.value;
    if (symEl && symEl.value.trim()) {
      leg.streamerSymbol = symEl.value.trim().toUpperCase();
      leg.optionSymbol = leg.streamerSymbol;
      leg.dxlinkSymbol = leg.streamerSymbol;
      leg.symbol = leg.streamerSymbol;
    }
    normalizeOptionLegSymbolAliases((((document.getElementById('jtTicker') || {}).value) || '').trim().toUpperCase(), leg);
  });
  try {
    console.log('[JOURNAL-SUBMIT-AUDIT] synced form legs from DOM', JSON.stringify({
      ticker: (((document.getElementById('jtTicker') || {}).value) || '').trim().toUpperCase(),
      legs: _jtFormLegs.map(function(leg, idx) {
        return {
          legIndex: idx, type: leg.type || null, strike: leg.strike != null ? leg.strike : null,
          expiry: leg.expiry || null, expiration: leg.expiration || null,
          expirationDate: leg.expirationDate || null, streamerSymbol: leg.streamerSymbol || null,
          optionSymbol: leg.optionSymbol || null
        };
      })
    }));
  } catch(_syncAuditErr) {}
}

function addJtCustomLeg() {
  _jtFormLegs.push({legLabel:'',type:'CALL',side:'LONG',qty:1,strike:null,expiry:null,entryPrice:null,streamerSymbol:null});
  _renderJtLegsTable();
}

function removeJtLeg(idx) {
  if (_jtFormLegs.length <= 1) return;
  _jtFormLegs.splice(idx, 1);
  _renderJtLegsTable();
}

function _deriveJtLegStreamer(idx) {
  var leg = _jtFormLegs[idx];
  if (!leg || (leg.type !== 'CALL' && leg.type !== 'PUT') || !leg.strike || !leg.expiry) return null;
  var ticker = ((document.getElementById('jtTicker') || {}).value || '').trim().toUpperCase();
  if (!ticker) return null;
  return buildCompactOptionDxlinkSymbol(ticker, leg);
}

function updateJtLegStreamer(idx) {
  var leg = _jtFormLegs[idx];
  if (!leg) return;
  var ticker = ((document.getElementById('jtTicker') || {}).value || '').trim().toUpperCase();
  // Chain path: prefer real streamer symbol from cached chain data
  if (ticker && _optChainCache[ticker] && leg.expiry && leg.strike != null &&
      (leg.type === 'CALL' || leg.type === 'PUT')) {
    _setLegStreamerFromChain(_jtFormLegs, idx, ticker);
    // If chain lookup didn't produce a symbol, fall back to builder — never leave state as null
    if (!leg.streamerSymbol) {
      var fbSym = _deriveJtLegStreamer(idx);
      if (fbSym) leg.streamerSymbol = fbSym;
    }
    var el = document.getElementById('jtLegSym' + idx);
    if (el && leg.streamerSymbol) {
      el.value = leg.streamerSymbol;
      el.placeholder = leg.streamerSymbol;
    } else if (el) {
      el.placeholder = _deriveJtLegStreamer(idx) || 'auto';
    }
    return;
  }
  // Fallback: build symbol from structured inputs
  var derived = _deriveJtLegStreamer(idx);
  var el2 = document.getElementById('jtLegSym' + idx);
  if (!el2) return;
  el2.placeholder = derived || 'auto';
  if (derived && !el2.value.trim()) {
    el2.value = derived;
    if (_jtFormLegs[idx]) _jtFormLegs[idx].streamerSymbol = derived;
  }
  _validateJtSymbol(idx);
}

function _validateJtSymbol(idx) {
  var el = document.getElementById('jtLegSym' + idx);
  if (!el) return;
  var derived = _deriveJtLegStreamer(idx);
  var val = el.value.trim();
  if (val && derived && val !== derived) {
    el.style.borderColor = 'var(--am)';
    el.title = 'Symbol does not match derived: ' + derived;
  } else {
    el.style.borderColor = '';
    el.title = '';
  }
}

function refreshAllJtLegStreamers() {
  _jtFormLegs.forEach(function(_, i) { updateJtLegStreamer(i); });
}

function cancelJtForm() {
  _jtFormLegs     = [];
  _jtFormStrategy = '';
  _jtFormStatus   = 'OPEN';
  _jtEditId       = null;
  document.getElementById('addTradeFormWrap').style.display = 'none';
}

// ── ADJUSTMENT FORM ──────────────────────────────────────────────

function showAddAdjustmentForm(tradeId) {
  var trade = journalManager.getById(tradeId);
  if (!trade) { showToast('Trade not found', 'warn'); return; }
  _adjFormTradeId         = tradeId;
  _adjFormNewLegs         = [];
  _adjFormNewStrategy     = '';
  _adjFormLegsToRoll      = [];
  _adjFormRollClosePrices = {};
  _renderAdjustmentForm(trade);
  document.getElementById('adjustmentModal').style.display = 'flex';
}

function closeAdjustmentModal() {
  document.getElementById('adjustmentModal').style.display = 'none';
  _adjFormTradeId         = null;
  _adjFormNewLegs         = [];
  _adjFormNewStrategy     = '';
  _adjFormLegsToRoll      = [];
  _adjFormRollClosePrices = {};
}

function _adjTypeNeedsLegs(type) {
  return type === 'ROLL' || type === 'ADD_LEG' || type === 'REMOVE_LEG' || type === 'TRANSFORM';
}

function _renderAdjustmentForm(trade) {
  var content = document.getElementById('adjustmentModalContent');
  if (!content) return;

  var typeOpts = ['ROLL','ADD_LEG','REMOVE_LEG','TRANSFORM','PARTIAL_CLOSE','NOTE'].map(function(t) {
    return '<option value="' + t + '">' + t.replace(/_/g, ' ') + '</option>';
  }).join('');

  var stratOpts = '<option value="">No change / not applicable</option>' +
    Object.keys(STRATEGY_TEMPLATES).map(function(k) {
      return '<option value="' + k + '">' + STRATEGY_TEMPLATES[k].label + '</option>';
    }).join('');

  var today           = new Date().toISOString().substring(0, 10);
  var currentStratLbl = (STRATEGY_TEMPLATES[trade.strategy] && STRATEGY_TEMPLATES[trade.strategy].label)
                        || escHtml(trade.strategy || '--');
  var tdB = 'padding:3px 6px;vertical-align:middle';

  var prevLegsRows = (trade.legs || []).filter(function(leg) {
    return (leg.legStatus || 'OPEN') !== 'CLOSED';
  }).map(function(leg) {
    var tc = leg.type === 'CALL' ? 'var(--bl)' : leg.type === 'PUT' ? 'var(--rd)' : 'var(--gr)';
    var sc = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
    return '<tr style="font-size:9px;font-family:var(--M)">' +
      '<td style="' + tdB + ';color:var(--tx2)">'  + escHtml(leg.legLabel || 'Leg') + '</td>' +
      '<td style="' + tdB + ';color:' + tc + ';font-weight:700">' + escHtml(leg.type || '') + '</td>' +
      '<td style="' + tdB + ';color:' + sc + ';font-weight:700">' + escHtml(leg.side || '') + '</td>' +
      '<td style="' + tdB + ';text-align:right;color:var(--tx)">' + (leg.qty  || '--')  + '</td>' +
      '<td style="' + tdB + ';text-align:right;color:var(--tx)">' + (leg.strike ? '$' + leg.strike : '--') + '</td>' +
      '<td style="' + tdB + ';color:var(--tx)">'  + (leg.expiry || '--') + '</td>' +
      '<td style="' + tdB + ';text-align:right;color:var(--tx)">' +
        (leg.entryPrice !== null && leg.entryPrice !== undefined ? '$' + parseFloat(leg.entryPrice).toFixed(2) : '--') +
      '</td>' +
    '</tr>';
  }).join('');

  var thS = 'style="text-align:left;padding:2px 6px;font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em;border-bottom:1px solid var(--b0)"';
  var thR = 'style="text-align:right;padding:2px 6px;font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em;border-bottom:1px solid var(--b0)"';

  var prevLegsTable = prevLegsRows
    ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th ' + thS + '>LEG</th><th ' + thS + '>TYPE</th><th ' + thS + '>SIDE</th>' +
          '<th ' + thR + '>QTY</th><th ' + thR + '>STRIKE</th>' +
          '<th ' + thS + '>EXPIRY</th><th ' + thR + '>ENTRY</th>' +
        '</tr></thead>' +
        '<tbody>' + prevLegsRows + '</tbody>' +
      '</table></div>'
    : '<div style="font-size:9px;color:var(--tx3);font-family:var(--M)">No legs recorded</div>';

  content.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<div style="font-size:15px;font-weight:800;font-family:var(--M);letter-spacing:.05em">' +
        'ADD ADJUSTMENT &mdash; ' + escHtml(trade.ticker || '--') +
      '</div>' +
      '<button onclick="closeAdjustmentModal()" style="background:transparent;border:1px solid var(--b0);' +
        'border-radius:6px;color:var(--tx3);font-family:var(--M);font-size:10px;padding:5px 12px;cursor:pointer">' +
        '&#x2715; CLOSE</button>' +
    '</div>' +
    '<div style="background:var(--bg3);border:1px solid var(--b0);border-radius:6px;padding:10px 12px;margin-bottom:14px">' +
      '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:6px">CURRENT TRADE STATE (will be captured as previousLegs / previousStrategy)</div>' +
      '<div style="font-size:10px;font-family:var(--M);color:var(--tx2);margin-bottom:6px">' +
        '<span style="color:var(--tx3)">STRATEGY:</span> <span style="color:var(--tx)">' + currentStratLbl + '</span>' +
      '</div>' +
      prevLegsTable +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">' +
      '<div class="jfield"><label class="jlabel">TYPE <span style="color:var(--rd)">*</span></label>' +
        '<select class="jinput" id="adjType" onchange="_onAdjTypeChange()">' + typeOpts + '</select></div>' +
      '<div class="jfield"><label class="jlabel">DATE</label>' +
        '<input class="jinput" id="adjDate" type="date" value="' + today + '"></div>' +
      '<div class="jfield"><label class="jlabel">REALIZED P&amp;L DELTA ($)</label>' +
        '<input class="jinput" id="adjPnlDelta" type="number" step="0.01" ' +
          'placeholder="e.g. 85.00 or -45.00"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">' +
      '<div class="jfield"><label class="jlabel">NEW STRATEGY</label>' +
        '<select class="jinput" id="adjNewStrategy" onchange="_onAdjStrategyChange()">' + stratOpts + '</select></div>' +
      '<div class="jfield"><label class="jlabel">NOTES</label>' +
        '<input class="jinput" id="adjNotes" type="text" ' +
          'placeholder="Rolled up and out, added hedge leg..."></div>' +
    '</div>' +
    '<div id="adjNewLegsWrap"></div>' +
    '<div id="adjFormError" style="font-size:10px;font-family:var(--M);color:var(--rd);margin:8px 0;display:none"></div>' +
    '<div style="display:flex;gap:8px;margin-top:12px">' +
      '<button onclick="submitAdjustment()" class="runbtn" style="font-size:10px">SAVE ADJUSTMENT</button>' +
      '<button onclick="closeAdjustmentModal()" class="tbtn">CANCEL</button>' +
    '</div>';
}

function _onAdjTypeChange() {
  var typeEl  = document.getElementById('adjType');
  var adjType = typeEl ? typeEl.value : 'NOTE';
  if (adjType === 'ROLL') {
    var trade = _adjFormTradeId ? journalManager.getById(_adjFormTradeId) : null;
    _adjFormLegsToRoll      = [];
    _adjFormRollClosePrices = {};
    if (trade) {
      (trade.legs || []).forEach(function(leg, i) {
        if ((leg.legStatus || 'OPEN') !== 'CLOSED') _adjFormLegsToRoll.push(i);
      });
    }
    _autoPopulateRollLegs();
  }
  _renderAdjNewLegsTable();
}

function _onAdjStrategyChange() {
  var sel = document.getElementById('adjNewStrategy');
  if (!sel) return;
  _adjFormNewStrategy = sel.value;
  if (_adjFormNewStrategy && STRATEGY_TEMPLATES[_adjFormNewStrategy]) {
    _adjFormNewLegs = STRATEGY_TEMPLATES[_adjFormNewStrategy].legs.map(function(l) { return Object.assign({}, l); });
  } else {
    _adjFormNewLegs = [];
  }
  _renderAdjNewLegsTable();
}

function _renderAdjNewLegsTable() {
  var wrap = document.getElementById('adjNewLegsWrap');
  if (!wrap) return;
  var typeEl  = document.getElementById('adjType');
  var adjType = typeEl ? typeEl.value : 'NOTE';
  if (!_adjTypeNeedsLegs(adjType)) { wrap.innerHTML = ''; return; }

  var mkTypeOpts = function(sel) {
    return ['CALL','PUT','EQUITY'].map(function(t) {
      return '<option value="' + t + '"' + (sel === t ? ' selected' : '') + '>' + t + '</option>';
    }).join('');
  };
  var mkSideOpts = function(sel) {
    return ['LONG','SHORT'].map(function(s) {
      return '<option value="' + s + '"' + (sel === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
  };

  var rows = _adjFormNewLegs.map(function(leg, idx) {
    return '<tr>' +
      '<td style="font-size:9px;font-family:var(--M);color:var(--tx2);padding:4px 6px">' +
        escHtml(leg.legLabel || ('Leg ' + (idx + 1))) + '</td>' +
      '<td><select class="jinput" style="padding:4px 6px;font-size:10px;min-width:74px" ' +
        'onchange="_adjUpdateLegField(' + idx + ',\'type\',this.value)">' +
        mkTypeOpts(leg.type) + '</select></td>' +
      '<td><select class="jinput" style="padding:4px 6px;font-size:10px;min-width:68px" ' +
        'onchange="_adjUpdateLegField(' + idx + ',\'side\',this.value)">' +
        mkSideOpts(leg.side) + '</select></td>' +
      '<td><input class="jinput" type="number" min="1" step="1" ' +
        'style="padding:4px 6px;font-size:10px;width:56px" value="' + (leg.qty || '') + '" ' +
        'oninput="_adjUpdateLegField(' + idx + ',\'qty\',this.value===\'\'?null:+this.value)"></td>' +
      '<td><input class="jinput" type="number" min="0" step="0.5" ' +
        'style="padding:4px 6px;font-size:10px;width:68px" ' +
        'value="' + (leg.strike !== null && leg.strike !== undefined ? leg.strike : '') + '" ' +
        'placeholder="350" ' +
        'oninput="_adjUpdateLegField(' + idx + ',\'strike\',this.value===\'\'?null:+this.value)"></td>' +
      '<td><input class="jinput" type="date" style="padding:4px 6px;font-size:10px;width:130px" ' +
        'value="' + (leg.expiry || '') + '" ' +
        'oninput="_adjUpdateLegField(' + idx + ',\'expiry\',this.value||null)"></td>' +
      '<td><input class="jinput" type="number" min="0" step="0.01" ' +
        'style="padding:4px 6px;font-size:10px;width:72px" ' +
        'value="' + (leg.entryPrice !== null && leg.entryPrice !== undefined ? leg.entryPrice : '') + '" ' +
        'placeholder="2.50" ' +
        'oninput="_adjUpdateLegField(' + idx + ',\'entryPrice\',this.value===\'\'?null:+this.value)"></td>' +
      '<td><button onclick="_adjRemoveLeg(' + idx + ')" ' +
        'style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:16px;line-height:1;padding:2px 5px" ' +
        'title="Remove leg">&#215;</button></td>' +
    '</tr>';
  }).join('');

  var newLegsSection =
    '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:6px">' +
      (adjType === 'ROLL' ? 'REPLACEMENT LEGS' : 'NEW LEGS (after adjustment)') +
    '</div>' +
    '<div style="overflow-x:auto"><table class="leg-table"><thead><tr>' +
      '<th style="min-width:100px">LEG</th>' +
      '<th>TYPE</th><th>SIDE</th><th>QTY</th><th>STRIKE</th><th>EXPIRY</th><th>ENTRY $</th><th></th>' +
    '</tr></thead><tbody>' +
      (rows || '<tr><td colspan="8" style="text-align:center;color:var(--tx3);font-size:10px;padding:12px">' +
        'No new legs — click below to add</td></tr>') +
    '</tbody></table></div>' +
    '<button onclick="_adjAddLeg()" class="tbtn" style="margin-top:6px;font-size:9px">+ ADD LEG</button>';

  if (adjType !== 'ROLL') {
    wrap.innerHTML = newLegsSection;
    return;
  }

  // ROLL type: show checkbox selector for open legs to roll, then replacement legs
  var trade = _adjFormTradeId ? journalManager.getById(_adjFormTradeId) : null;
  var openLegs = [];
  if (trade) {
    (trade.legs || []).forEach(function(leg, i) {
      if ((leg.legStatus || 'OPEN') !== 'CLOSED') openLegs.push({leg: leg, i: i});
    });
  }

  var tdB = 'padding:3px 8px;vertical-align:middle';
  var checkboxRows = openLegs.map(function(item) {
    var leg      = item.leg;
    var idx      = item.i;
    var isRolled = _adjFormLegsToRoll.indexOf(idx) !== -1;
    var checked  = isRolled ? ' checked' : '';
    var tc = leg.type === 'CALL' ? 'var(--bl)' : leg.type === 'PUT' ? 'var(--rd)' : 'var(--gr)';
    var sc = leg.side === 'SHORT' ? 'var(--am)' : 'var(--tl)';
    var cpVal = (_adjFormRollClosePrices[idx] !== null && _adjFormRollClosePrices[idx] !== undefined)
      ? _adjFormRollClosePrices[idx] : '';
    var cpCell = isRolled
      ? '<input class="jinput" type="number" min="0" step="0.01" ' +
          'style="padding:3px 5px;font-size:10px;width:70px" ' +
          'value="' + cpVal + '" placeholder="0.00" ' +
          'oninput="_adjUpdateRollClosePrice(' + idx + ',this.value)">'
      : '<span style="color:var(--tx3);font-size:9px">—</span>';
    var pnlCell = isRolled
      ? '<span id="rollPnlPrev_' + idx + '">' + _rollLegPnlPreview(idx) + '</span>'
      : '';
    return '<tr style="font-size:9px;font-family:var(--M)">' +
      '<td style="' + tdB + ';text-align:center">' +
        '<input type="checkbox" onchange="_onAdjRollLegToggle(' + idx + ')"' + checked + '>' +
      '</td>' +
      '<td style="' + tdB + ';color:var(--tx2)">'  + escHtml(leg.legLabel || 'Leg') + '</td>' +
      '<td style="' + tdB + ';color:' + tc + ';font-weight:700">' + escHtml(leg.type || '') + '</td>' +
      '<td style="' + tdB + ';color:' + sc + ';font-weight:700">' + escHtml(leg.side || '') + '</td>' +
      '<td style="' + tdB + ';text-align:right;color:var(--tx)">' + (leg.qty || '--') + '</td>' +
      '<td style="' + tdB + ';text-align:right;color:var(--tx)">' + (leg.strike ? '$' + leg.strike : '--') + '</td>' +
      '<td style="' + tdB + ';color:var(--tx)">'   + (leg.expiry || '--') + '</td>' +
      '<td style="' + tdB + '">' + cpCell + '</td>' +
      '<td style="' + tdB + ';text-align:right;min-width:64px">' + pnlCell + '</td>' +
    '</tr>';
  }).join('');

  var thS = 'style="text-align:left;padding:2px 6px;font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em;border-bottom:1px solid var(--b0)"';
  var thR = 'style="text-align:right;padding:2px 6px;font-size:7px;font-family:var(--M);color:var(--tx3);letter-spacing:.06em;border-bottom:1px solid var(--b0)"';

  var selectSection = openLegs.length
    ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th ' + thS + '>ROLL</th>' +
          '<th ' + thS + '>LEG</th><th ' + thS + '>TYPE</th><th ' + thS + '>SIDE</th>' +
          '<th ' + thR + '>QTY</th><th ' + thR + '>STRIKE</th><th ' + thS + '>EXPIRY</th>' +
          '<th ' + thR + '>CLOSE $<span style="color:var(--rd)"> *</span></th>' +
          '<th ' + thR + '>REALIZED P&amp;L</th>' +
        '</tr></thead>' +
        '<tbody>' + checkboxRows + '</tbody>' +
      '</table></div>'
    : '<div style="font-size:9px;color:var(--tx3);font-family:var(--M)">No open legs to roll</div>';

  wrap.innerHTML =
    '<div style="background:var(--bg3);border:1px solid var(--b0);border-radius:6px;padding:10px 12px;margin-bottom:10px">' +
      '<div style="font-size:8px;font-family:var(--M);color:var(--tx3);letter-spacing:.08em;margin-bottom:8px">SELECT LEGS TO ROLL</div>' +
      selectSection +
    '</div>' +
    newLegsSection;
}

function _adjUpdateLegField(idx, field, value) {
  if (_adjFormNewLegs[idx]) _adjFormNewLegs[idx][field] = value;
}

function _adjAddLeg() {
  _adjFormNewLegs.push({legLabel:'', type:'CALL', side:'LONG', qty:1,
    strike:null, expiry:null, entryPrice:null, streamerSymbol:null});
  _renderAdjNewLegsTable();
}

function _adjRemoveLeg(idx) {
  _adjFormNewLegs.splice(idx, 1);
  _renderAdjNewLegsTable();
}

function _adjUpdateRollClosePrice(legTradeIdx, value) {
  _adjFormRollClosePrices[legTradeIdx] = (value === '' || value === null) ? null : parseFloat(value);
  var el = document.getElementById('rollPnlPrev_' + legTradeIdx);
  if (el) el.innerHTML = _rollLegPnlPreview(legTradeIdx);
}

function _rollLegPnlPreview(legTradeIdx) {
  var trade = _adjFormTradeId ? journalManager.getById(_adjFormTradeId) : null;
  if (!trade) return '';
  var leg = trade.legs[legTradeIdx];
  if (!leg) return '';
  var cp    = _adjFormRollClosePrices[legTradeIdx];
  if (cp === null || cp === undefined || isNaN(+cp)) return '<span style="color:var(--tx3)">--</span>';
  var entry = parseFloat(leg.entryPrice);
  var qty   = parseFloat(leg.qty) || 0;
  var mult  = leg.type !== 'EQUITY' ? 100 : 1;
  if (isNaN(entry) || qty <= 0) return '<span style="color:var(--tx3)">--</span>';
  var pnl = leg.side === 'SHORT' ? (entry - cp) * qty * mult : (cp - entry) * qty * mult;
  pnl = Math.round(pnl * 100) / 100;
  return '<span style="font-weight:700;color:' + (pnl >= 0 ? 'var(--gr)' : 'var(--rd)') + '">' +
    (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2) + '</span>';
}

function _onAdjRollLegToggle(legTradeIdx) {
  var pos = _adjFormLegsToRoll.indexOf(legTradeIdx);
  if (pos === -1) {
    _adjFormLegsToRoll.push(legTradeIdx);
  } else {
    _adjFormLegsToRoll.splice(pos, 1);
    delete _adjFormRollClosePrices[legTradeIdx];
  }
  _autoPopulateRollLegs();
  _renderAdjNewLegsTable();
}

function _autoPopulateRollLegs() {
  var trade = _adjFormTradeId ? journalManager.getById(_adjFormTradeId) : null;
  if (!trade) { _adjFormNewLegs = []; return; }

  var selectedLegs = _adjFormLegsToRoll.map(function(i) {
    return trade.legs[i];
  }).filter(Boolean);

  // Preserve user edits: match existing new-legs by type+side, otherwise build from selected
  var preserved = {};
  _adjFormNewLegs.forEach(function(nl) {
    var key = (nl.type || '') + '|' + (nl.side || '');
    if (!preserved[key]) preserved[key] = nl;
  });

  _adjFormNewLegs = selectedLegs.map(function(leg) {
    var key = (leg.type || '') + '|' + (leg.side || '');
    if (preserved[key]) {
      var kept = preserved[key];
      delete preserved[key];
      return kept;
    }
    return {
      legLabel: leg.legLabel || '',
      type:     leg.type     || 'CALL',
      side:     leg.side     || 'LONG',
      qty:      leg.qty      || 1,
      strike:   null,
      expiry:   null,
      entryPrice: null,
      streamerSymbol: null,
    };
  });
}

function _validateRollTypeMatch(trade, legsToRoll, newLegs) {
  var selectedLegs = legsToRoll.map(function(i) { return trade.legs[i]; }).filter(Boolean);
  for (var i = 0; i < selectedLegs.length; i++) {
    var orig    = selectedLegs[i];
    var replace = newLegs[i];
    if (!replace) continue;
    if (orig.type === 'CALL' && replace.type !== 'CALL') {
      return 'Leg "' + (orig.legLabel || orig.type) + '" is a CALL — replacement must also be a CALL.';
    }
    if (orig.type === 'PUT' && replace.type !== 'PUT') {
      return 'Leg "' + (orig.legLabel || orig.type) + '" is a PUT — replacement must also be a PUT.';
    }
  }
  return null;
}

async function submitAdjustment() {
  var errEl = document.getElementById('adjFormError');
  function adjErr(msg) {
    if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
  }
  if (errEl) { errEl.style.display = 'none'; errEl.innerHTML = ''; }

  if (!_adjFormTradeId) { adjErr('No trade selected.'); return; }
  var trade = journalManager.getById(_adjFormTradeId);
  if (!trade)           { adjErr('Trade not found.');   return; }

  var typeEl     = document.getElementById('adjType');
  var dateEl     = document.getElementById('adjDate');
  var pnlDeltaEl = document.getElementById('adjPnlDelta');
  var notesEl    = document.getElementById('adjNotes');
  var newStratEl = document.getElementById('adjNewStrategy');

  var adjType        = typeEl     ? typeEl.value     : 'NOTE';
  var adjDate        = (dateEl && dateEl.value) ? dateEl.value : new Date().toISOString().substring(0, 10);
  var adjPnlDeltaRaw = pnlDeltaEl ? pnlDeltaEl.value : '';
  var adjNotes       = notesEl    ? notesEl.value.trim() : '';
  var adjNewStrat    = (newStratEl && newStratEl.value) ? newStratEl.value : null;

  var pnlDelta = null;
  if (adjPnlDeltaRaw !== '') {
    pnlDelta = parseFloat(adjPnlDeltaRaw);
    if (isNaN(pnlDelta)) { adjErr('P&L Delta must be a valid number.'); return; }
  }

  var newLegs = _adjFormNewLegs.length
    ? _adjFormNewLegs.map(function(l) { return Object.assign({}, l); })
    : null;

  // For ROLL: validate and compute everything before writing
  var rollPrevLegs   = null;
  var rollPnlDelta   = null;
  if (adjType === 'ROLL') {
    if (!_adjFormLegsToRoll.length) { adjErr('Select at least one leg to roll.'); return; }
    if (!newLegs || !newLegs.length) { adjErr('Add at least one replacement leg.'); return; }
    var typeErr = _validateRollTypeMatch(trade, _adjFormLegsToRoll, newLegs);
    if (typeErr) { adjErr(typeErr); return; }
    // Validate every selected leg has a close price
    for (var ri = 0; ri < _adjFormLegsToRoll.length; ri++) {
      var ridx = _adjFormLegsToRoll[ri];
      var rcp  = _adjFormRollClosePrices[ridx];
      if (rcp === null || rcp === undefined || rcp === '' || isNaN(+rcp)) {
        adjErr('Enter a close price for every selected leg.'); return;
      }
    }
    // Build enriched previousLegs snapshot for the timeline (only rolled legs, with price + P&L)
    rollPnlDelta = 0;
    rollPrevLegs = _adjFormLegsToRoll.map(function(ridx) {
      var leg   = trade.legs[ridx];
      var cp    = parseFloat(_adjFormRollClosePrices[ridx]);
      var entry = parseFloat(leg.entryPrice);
      var qty   = parseFloat(leg.qty) || 0;
      var mult  = leg.type !== 'EQUITY' ? 100 : 1;
      var legPnL = null;
      if (!isNaN(entry) && !isNaN(cp) && qty > 0) {
        legPnL = Math.round(
          (leg.side === 'SHORT' ? (entry - cp) * qty * mult : (cp - entry) * qty * mult) * 100
        ) / 100;
        rollPnlDelta += legPnL;
      }
      return Object.assign({}, leg, {closePrice: cp, legRealizedPnL: legPnL});
    });
    rollPnlDelta = Math.round(rollPnlDelta * 100) / 100;
  }

  // For TRANSFORM: block if any open legs exist — no close-price UI, use ROLL instead
  if (adjType === 'TRANSFORM') {
    var openLegCount = (trade.legs || []).filter(function(l) {
      return (l.legStatus || 'OPEN') !== 'CLOSED';
    }).length;
    if (openLegCount > 0) {
      adjErr('TRANSFORM closes ' + openLegCount + ' existing leg' + (openLegCount === 1 ? '' : 's') +
             ' — close prices are required for each leg. Use ROLL to provide per-leg close prices.');
      return;
    }
  }

  try {
    // For non-ROLL types capture all active legs as previousLegs snapshot
    var prevActiveLegs = rollPrevLegs !== null
      ? rollPrevLegs
      : (trade.legs || [])
          .filter(function(l) { return (l.legStatus || 'OPEN') !== 'CLOSED'; })
          .map(function(l) { return Object.assign({}, l); });

    // Disable save button during async snapshot build
    var saveBtn = document.querySelector('#adjustmentModalContent .runbtn');
    if (saveBtn) saveBtn.disabled = true;

    var adjRecord = journalManager.addAdjustment(_adjFormTradeId, {
      timestamp:        adjDate + 'T12:00:00.000Z',
      type:             adjType,
      previousStrategy: trade.currentStrategy || trade.strategy || null,
      newStrategy:      adjNewStrat,
      previousLegs:     prevActiveLegs.length ? prevActiveLegs : null,
      newLegs:          newLegs,
      realizedPnLDelta: adjType === 'ROLL' ? rollPnlDelta : pnlDelta,
      notes:            adjNotes || null,
      snapshot:         null,
    });
    // For ROLL: apply selective close with prices and append replacement legs
    if (adjType === 'ROLL') {
      journalManager.applyRollLegs(
        _adjFormTradeId, adjDate,
        _adjFormLegsToRoll.slice(), _adjFormRollClosePrices,
        newLegs, adjNewStrat, adjRecord.adjustmentId
      );
    }
    // For TRANSFORM: append new legs only (pre-validation above ensures no open legs remain)
    if (adjType === 'TRANSFORM' && newLegs && newLegs.length) {
      journalManager.applyRollLegs(
        _adjFormTradeId, adjDate,
        null, null,
        newLegs, adjNewStrat, adjRecord.adjustmentId
      );
    }
    // Record trade P&L after mutations so the adjustment has a complete before/after audit
    var _postAdjTrade = journalManager.getById(_adjFormTradeId);
    if (_postAdjTrade) {
      journalManager.updateAdjustmentPnLAfter(_adjFormTradeId, adjRecord.adjustmentId, _postAdjTrade.realizedPnL);
    }

    // Build and attach adjustment snapshot asynchronously
    try {
      await _journalSnapshotPrefetch(trade.ticker || '', trade.legs || []);
      var adjCacheMerge = _greeksMergeFromCache(trade.ticker || '', trade.legs || []);
      var adjSnap = await _buildRichSnapshot(trade.ticker || '', adjCacheMerge);
      journalManager.setAdjustmentSnapshot(_adjFormTradeId, adjRecord.adjustmentId, adjSnap);
    } catch (snapErr) { /* snapshot failure is non-fatal */ }

    var savedTradeId = _adjFormTradeId;
    closeAdjustmentModal();
    showTradeDetails(savedTradeId);
    showToast('Adjustment saved for ' + (trade.ticker || 'trade'), 'ok');
  } catch(e) {
    adjErr(e.message);
    var saveBtn2 = document.querySelector('#adjustmentModalContent .runbtn');
    if (saveBtn2) saveBtn2.disabled = false;
  }
}
