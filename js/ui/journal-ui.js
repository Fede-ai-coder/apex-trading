// ══════════════════════════════════════════════════════════════
// JOURNAL UI
// ══════════════════════════════════════════════════════════════

var jView = 'list';    // 'list' | 'add' | 'edit' | 'detail' | 'analytics'
var jFilter = { strategy:'all', status:'all', decision:'all', grade:'all' };
var jDetailId = null;
var jEditLeg = null;

function runJournalPanel() {
  setAS('journal','ok','Trade Journal');
  // Render immediately from localStorage — never block on backend
  jView = 'list';
  renderJournalView();
  // Then sync from backend in background (non-blocking)
  {  // always attempt background sync (fails silently if backend unreachable)
    setTimeout(function() {
      jLoadFromBackend().then(function(synced) {
        if (synced) {
          showToast('Journal sincronizzato dal backend', 'ok');
          renderJournalView();  // re-render with merged data
        }
      }).catch(function(e) {
        console.warn('[JOURNAL] Background sync failed:', e.message);
      });
    }, 100);  // small delay so panel renders first
  }
}

function renderJournalView() {
  if      (jView==='add')       renderJournalAdd();
  else if (jView==='edit')      renderJournalEdit(jDetailId);
  else if (jView==='detail')    renderJournalDetail(jDetailId);
  else if (jView==='analytics') renderJournalAnalytics();
  else                          renderJournalList();
}

// ── VIEW: LIST ────────────────────────────────────────────────
function jStat(label, value, color) {
  return '<div style="flex:1;min-width:80px">' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3)">' + label + '</div>' +
    '<div style="font-size:11px;font-weight:700;font-family:var(--M);color:' + color + '">' + value + '</div>' +
  '</div>';
}

function jTradeCard(t) {
  var snap=t.snapshot||{};
  var pnlC=t.pnl>0?'var(--gr)':t.pnl<0?'var(--rd)':'var(--tx3)';
  var statusC=t.status==='open'?'var(--am)':'var(--tx3)';
  var decC=jDecisionColor(snap.finalTradingDecision);
  var gradeC=jGradeColor(snap.setupGrade);
  var caps='';
  if(snap.setupCapsTriggered&&snap.setupCapsTriggered.length){
    caps='<div style="margin-top:3px">'+snap.setupCapsTriggered.map(function(c){
      return '<span style="font-size:6px;padding:0 4px;border-radius:3px;'+
        'background:rgba(255,179,64,.12);color:var(--am)">'+c+'</span>';
    }).join(' ')+'</div>';
  }
  return '<div class="ai journal-row" data-jid="'+t.id+'" style="cursor:pointer;margin-bottom:5px">'+
    '<div style="display:flex;align-items:center;gap:8px">'+
      '<span style="font-size:11px;font-weight:700">'+t.ticker+'</span>'+
      '<span style="font-size:8px;font-family:var(--M);color:var(--tx3)">'+t.strategyType+'</span>'+
      '<span style="font-size:8px;font-family:var(--M);color:'+statusC+'">'+t.status.toUpperCase()+'</span>'+
      (t.pnl!=null?
        '<span style="font-size:10px;font-weight:700;margin-left:auto;color:'+pnlC+'">'+(t.pnl>0?'+':'')+t.pnl+'</span>':
        '<span style="font-size:8px;color:var(--tx3);margin-left:auto">PnL: —</span>')+
    '</div>'+
    '<div style="font-size:8px;font-family:var(--M);color:var(--tx2);margin-top:2px">'+
      t.openedAt.substring(0,10)+
      (snap.setupGrade?' · <span style="color:'+gradeC+'">'+snap.setupGrade+'('+snap.setupScore+')</span>':'')+
      (snap.finalTradingDecision?' · <span style="color:'+decC+'">'+snap.finalTradingDecision+'</span>':'')+
    '</div>'+caps+
  '</div>';
}

// ── jSelectFilter — helper per filter bar del journal ────────────
function jSelectFilter(name, options, label) {
  var current = jFilter[name] || 'all';
  var opts = options.map(function(o) {
    return '<option value="'+o+'"'+(o===current?' selected':'')+'>'+
      (o==='all'?label+': All':o)+'</option>';
  }).join('');
  return '<select data-jfilter="'+name+'" style="font-size:8px;font-family:var(--M);'+
    'background:var(--bg2);color:var(--tx);border:1px solid var(--b0);'+
    'border-radius:5px;padding:3px 6px;cursor:pointer">'+opts+'</select>';
}

function renderJournalList() {
  var trades = jLoad();

  // Apply filters
  var filtered = trades.filter(function(t){
    if(jFilter.strategy!=='all'&&t.strategyType!==jFilter.strategy) return false;
    if(jFilter.status!=='all'&&t.status!==jFilter.status) return false;
    if(jFilter.decision!=='all'){
      var dec=(t.snapshot&&t.snapshot.finalTradingDecision)||'unknown';
      if(dec!==jFilter.decision) return false;
    }
    if(jFilter.grade!=='all'){
      var gr=(t.snapshot&&t.snapshot.setupGrade)||'unknown';
      if(gr!==jFilter.grade) return false;
    }
    return true;
  });

  // Summary bar
  var stats=jComputeStats(trades);
  var openTrades=trades.filter(function(t){return t.status==='open';});
  var pnlColor=stats.totalPnl>0?'var(--gr)':stats.totalPnl<0?'var(--rd)':'var(--tx2)';

  // Sync status indicator
  var syncLabel=jLastSync?('&#9670; Sync: '+jLastSync.slice(11,16)+' UTC'):'&#9670; Locale (nessun sync)';
  var syncColor=jLastSync?'var(--gr)':'var(--tx3)';
  var summaryBar='<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px;'+
    'padding:8px 10px;background:var(--bg2);border-radius:8px;font-family:var(--M)">'+
    jStat('Total PnL','$'+stats.totalPnl,pnlColor)+
    jStat('Win Rate',stats.winRate+'%',stats.winRate>=50?'var(--gr)':'var(--rd)')+
    jStat('Expectancy','$'+stats.expectancy,stats.expectancy>0?'var(--gr)':'var(--rd)')+
    jStat('Open',stats.openCount,'var(--am)')+
    jStat('Closed',stats.closedCount,'var(--tx2)')+
    '<div style="flex:1;min-width:100px;text-align:right">'+
      '<span style="font-size:7px;font-family:var(--M);color:'+syncColor+'">'+syncLabel+'</span>'+
      '<button id="jSyncBtn" style="margin-left:6px;font-size:7px;font-family:var(--M);background:none;'+
        'border:1px solid var(--b0);border-radius:4px;padding:2px 6px;cursor:pointer;color:var(--tx2)">&#8593; Sync</button>'+
    '</div>'+
  '</div>';

  // Filter bar
  var strategies=[...new Set(trades.map(function(t){return t.strategyType;}))].filter(Boolean);
  var decisions=[...new Set(trades.map(function(t){return t.snapshot&&t.snapshot.finalTradingDecision;}))].filter(Boolean);
  var filterBar='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">'+
    jSelectFilter('strategy',['all'].concat(strategies),'Strategy')+
    jSelectFilter('status',['all','open','closed'],'Status')+
    jSelectFilter('decision',['all'].concat(decisions),'Decision')+
    jSelectFilter('grade',['all','STRONG','OK','WEAK'],'Grade')+
    '<button onclick="jView=\'add\';renderJournalView()" style="margin-left:auto;'+
      'background:var(--gr);color:#fff;border:none;border-radius:6px;padding:5px 12px;'+
      'font-family:var(--M);font-size:9px;font-weight:700;cursor:pointer">+ NEW TRADE</button>'+
    '<button onclick="jView=\'analytics\';renderJournalView()" style="'+
      'background:rgba(6,182,212,.15);color:#06b6d4;border:1px solid rgba(6,182,212,.3);'+
      'border-radius:6px;padding:5px 12px;font-family:var(--M);font-size:9px;cursor:pointer">📊 ANALYTICS</button>'+
    '<button onclick="showJournalExportModal()" style="'+
      'background:rgba(52,211,153,.12);color:#34d399;border:1px solid rgba(52,211,153,.3);'+
      'border-radius:6px;padding:5px 12px;font-family:var(--M);font-size:9px;cursor:pointer">⬇ EXPORT</button>'+
  '</div>';

  // Trade list
  var listHtml='';
  if(!filtered.length){
    listHtml='<div style="text-align:center;padding:30px;color:var(--tx3);font-family:var(--M);font-size:11px">'+
      'No trades match filters. <span onclick="jView=\'add\';renderJournalView()" style="cursor:pointer;color:#06b6d4">+ Add first trade</span></div>';
  } else {
    filtered.forEach(function(t){
    listHtml += jTradeCard(t);
  });

  }  // close else block
    // (continue renderJournalList)
    var jPanelHtml = summaryBar + filterBar + listHtml;
    setPanel('TRADE JOURNAL (' + filtered.length + ' / ' + trades.length + ')', jPanelHtml);
  setTimeout(function(){ var sb=document.getElementById('jSyncBtn'); if(sb) sb.addEventListener('click',function(){ jSyncToBackend().then(function(){ showToast('Sync completato','ok'); renderJournalView(); }); }); }, 50);
  setTimeout(function(){
    document.querySelectorAll('[data-jfilter]').forEach(function(el){
      el.addEventListener('change', function(){
        jFilter[this.getAttribute('data-jfilter')] = this.value;
        renderJournalView();
      });
    });
  }, 50);
    setTimeout(function(){
      document.querySelectorAll('.journal-row').forEach(function(el){
        el.addEventListener('click', function(){
          jDetailId = this.getAttribute('data-jid');
          jView = 'detail';
          renderJournalView();
        });
      });
    }, 50);
}

// ── JOURNAL EXCEL EXPORT ──────────────────────────────────────────
function showJournalExportModal() {
  var old = document.getElementById('jExportModal');
  if (old) old.remove();

  var portfolios = portfolioManager.getAll();
  var trades = journalManager.getAll();   // same source as the Journal UI
  var symbols = trades.map(function(t){ return t.ticker; }).filter(Boolean)
    .filter(function(v,i,a){ return a.indexOf(v)===i; }).sort();
  // trades use t.strategy (journalManager field); fall back to t.strategyType for legacy records
  var strategies = trades.map(function(t){ return t.strategy || t.strategyType; }).filter(Boolean)
    .filter(function(v,i,a){ return a.indexOf(v)===i; }).sort();

  var sel = function(id, opts, dflt) {
    return '<select id="'+id+'" style="width:100%;background:var(--bg2);color:var(--tx);border:1px solid var(--b0);'+
      'border-radius:5px;padding:5px 7px;font-size:9px;font-family:var(--M)">' +
      opts.map(function(o){
        return '<option value="'+escHtml(String(o.v))+'"'+(o.v===dflt?' selected':'')+'>'+escHtml(o.l)+'</option>';
      }).join('') + '</select>';
  };

  var pfOpts = [{v:'all',l:'All Portfolios'}].concat(portfolios.map(function(p){ return {v:String(p.id),l:p.name}; }));
  var symOpts = [{v:'all',l:'All Symbols'}].concat(symbols.map(function(s){ return {v:s,l:s}; }));
  var stratOpts = [{v:'all',l:'All Strategies'}].concat(strategies.map(function(s){ return {v:s,l:s}; }));
  var statusOpts = [{v:'ALL',l:'All'},{v:'OPEN',l:'Open'},{v:'CLOSED',l:'Closed'}];
  var statusDflt = jFilter.status !== 'all' ? jFilter.status.toUpperCase() : 'ALL';
  var stratDflt  = jFilter.strategy !== 'all' ? jFilter.strategy : 'all';

  var lbl = function(t){ return '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);margin-bottom:3px">'+t+'</div>'; };
  var dateInp = function(id){ return '<input type="date" id="'+id+'" style="width:100%;background:var(--bg2);color:var(--tx);'+
    'border:1px solid var(--b0);border-radius:5px;padding:5px 7px;font-size:9px;font-family:var(--M);box-sizing:border-box">'; };

  var grid = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">'+
    '<div>'+lbl('PORTFOLIO')+sel('jex-pf', pfOpts, 'all')+'</div>'+
    '<div>'+lbl('SYMBOL')+sel('jex-sym', symOpts, 'all')+'</div>'+
    '<div>'+lbl('STRATEGY')+sel('jex-strat', stratOpts, stratDflt)+'</div>'+
    '<div>'+lbl('STATUS')+sel('jex-status', statusOpts, statusDflt)+'</div>'+
    '<div>'+lbl('FROM DATE')+dateInp('jex-from')+'</div>'+
    '<div>'+lbl('TO DATE')+dateInp('jex-to')+'</div>'+
  '</div>';

  var btns = '<div style="display:flex;gap:8px;justify-content:flex-end">'+
    '<button onclick="document.getElementById(\'jExportModal\').remove()" style="background:transparent;color:var(--tx2);'+
      'border:1px solid var(--b0);border-radius:6px;padding:6px 14px;font-family:var(--M);font-size:9px;cursor:pointer">Cancel</button>'+
    '<button id="jex-run" onclick="runJournalExport()" style="background:var(--gr);color:#fff;border:none;'+
      'border-radius:6px;padding:6px 16px;font-family:var(--M);font-size:9px;font-weight:700;cursor:pointer">Export Excel</button>'+
  '</div>';

  var modal = '<div id="jExportModal" class="modal-overlay" onclick="if(event.target===this)document.getElementById(\'jExportModal\').remove()" style="z-index:300">'+
    '<div class="modal-box" style="width:min(96vw,480px)">'+
      '<div class="modal-title" style="font-family:var(--M);margin-bottom:4px">Export Journal to Excel</div>'+
      '<div class="modal-sub">Filter the data to export. Leave at defaults to export everything.</div>'+
      grid + btns +
    '</div>'+
  '</div>';

  document.body.insertAdjacentHTML('beforeend', modal);
}

function runJournalExport() {
  var pfId     = document.getElementById('jex-pf').value;
  var symbol   = document.getElementById('jex-sym').value;
  var strategy = document.getElementById('jex-strat').value;
  var status   = document.getElementById('jex-status').value;
  var fromDate = document.getElementById('jex-from').value;
  var toDate   = document.getElementById('jex-to').value;

  var allTrades = journalManager.getAll();   // same source as the Journal UI
  var trades = allTrades.filter(function(t) {
    if (pfId !== 'all' && String(t.portfolioId) !== pfId) return false;
    if (symbol !== 'all' && t.ticker !== symbol) return false;
    // journalManager trades use t.strategy; legacy right-panel trades use t.strategyType
    if (strategy !== 'all' && (t.strategy || t.strategyType) !== strategy) return false;
    if (status !== 'ALL' && (t.status || '').toUpperCase() !== status) return false;
    if (fromDate && t.entryDate && t.entryDate < fromDate) return false;
    if (toDate && t.entryDate && t.entryDate > toDate) return false;
    return true;
  });
  console.log('[JOURNAL EXPORT DEBUG]', JSON.stringify({
    totalTradesBeforeFilter: allTrades.length,
    filters: { pfId: pfId, symbol: symbol, strategy: strategy, status: status, fromDate: fromDate, toDate: toDate },
    totalTradesAfterFilter: trades.length,
    firstTradeSample: allTrades[0] ? {
      id: allTrades[0].id, ticker: allTrades[0].ticker,
      strategy: allTrades[0].strategy, strategyType: allTrades[0].strategyType,
      status: allTrades[0].status, entryDate: allTrades[0].entryDate,
      portfolioId: allTrades[0].portfolioId,
    } : null,
    reasonIfZeroRows: trades.length === 0 && allTrades.length > 0
      ? 'All ' + allTrades.length + ' trades excluded by filters'
      : trades.length === 0 ? 'journalManager.getAll() returned 0 trades' : 'ok',
  }));

  if (trades.length === 0) {
    showToast('No trades match the selected filters — nothing to export', 'warn');
    var btn2 = document.getElementById('jex-run');
    if (btn2) { btn2.disabled = false; btn2.textContent = 'Export Excel'; }
    return;
  }

  var ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  var parts = ['journal', ts];
  if (pfId !== 'all') {
    var pf = portfolioManager.getById(pfId);   // ids are strings; getById stringifies
    if (pf) parts.push(pf.name.replace(/\s+/g,'_'));
  }
  if (symbol !== 'all')   parts.push(symbol);
  if (strategy !== 'all') parts.push(strategy.replace(/\s+/g,'_'));
  if (status !== 'ALL')   parts.push(status);
  if (fromDate)           parts.push('from-'+fromDate);
  if (toDate)             parts.push('to-'+toDate);
  var fileName = parts.join('_') + '.xlsx';

  var btn = document.getElementById('jex-run');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

  _loadSheetJS(function(XLSX) {
    try {
      _doJournalExcelExport(XLSX, trades, fileName);
      document.getElementById('jExportModal').remove();
      showToast('Exported ' + trades.length + ' trade' + (trades.length !== 1 ? 's' : ''), 'ok');
    } catch(e) {
      showToast('Export error: ' + e.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = 'Export Excel'; }
    }
  }, function() {
    // SheetJS CDN unavailable — CSV fallback
    try {
      _doJournalCSVFallback(trades, fileName.replace('.xlsx','.csv'));
      document.getElementById('jExportModal').remove();
      showToast('Exported ' + trades.length + ' trades (CSV fallback — offline mode)', 'warn');
    } catch(e2) {
      showToast('Export failed: ' + e2.message, 'err');
      if (btn) { btn.disabled = false; btn.textContent = 'Export Excel'; }
    }
  });
}

function _loadSheetJS(onOk, onErr) {
  if (window.XLSX) { onOk(window.XLSX); return; }
  var s = document.createElement('script');
  s.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  s.onload  = function() { if (window.XLSX) onOk(window.XLSX); else onErr(); };
  s.onerror = onErr;
  document.head.appendChild(s);
}

// ── Export helpers ────────────────────────────────────────────────
function _jexNum(v, dec) {
  if (v === null || v === undefined || v === '') return '';
  var n = parseFloat(v);
  if (isNaN(n)) return '';
  if (dec !== undefined) return Math.round(n * Math.pow(10,dec)) / Math.pow(10,dec);
  return n;
}
function _jexStr(v)  { return (v === null || v === undefined) ? '' : String(v); }
function _jexBool(v) { return v ? 'true' : 'false'; }

// ── Sheet 1: Trades Summary ───────────────────────────────────────
function _jexTradesSummary(XLSX, trades) {
  var hdr = [
    'tradeId','portfolio','symbol','strategy','originalStrategy','currentStrategy',
    'status','entryDate','exitDate','durationDays',
    'realizedPnL','consolidatedPnL','pnlPerDay','pnlPctOfNetCredit',
    'totalCreditReceived','totalDebitPaid','netCreditDebit','netCreditDebitType',
    'numberOfLegs','strikes','expirations',
    'adjustmentsCount','totalAdjustmentPnL','hasRolls'
  ];
  var rows = [hdr];
  trades.forEach(function(t) {
    var pf      = portfolioManager.getById(t.portfolioId);
    var metrics = _tradeMetrics(t);
    var consolidated = journalManager.getConsolidatedPnL(t.id);
    var adjs    = t.adjustments || [];
    var adjPnL  = adjs.reduce(function(s,a){
      return s + (a.realizedPnLDelta !== null && a.realizedPnLDelta !== undefined ? parseFloat(a.realizedPnLDelta)||0 : 0);
    }, 0);
    var hasRolls = adjs.some(function(a){ return a.type === 'ROLL'; });
    var legs    = t.legs || [];
    var strikes = legs.map(function(l){ return l.strike||''; }).filter(Boolean).join(', ');
    var expirations = legs.map(function(l){ return l.expiry||''; }).filter(Boolean)
      .filter(function(v,i,a){ return a.indexOf(v)===i; }).join(', ');
    rows.push([
      _jexStr(t.id),
      pf ? _jexStr(pf.name) : '',
      _jexStr(t.ticker),
      _jexStr(t.strategyType || t.strategy),
      _jexStr(t.originalStrategy),
      _jexStr(t.currentStrategy || t.strategy),
      _jexStr(t.status),
      _jexStr(t.entryDate),
      _jexStr(t.exitDate),
      _jexNum(metrics.durationDays),
      _jexNum(t.realizedPnL, 2),
      consolidated !== null ? _jexNum(consolidated, 2) : '',
      _jexNum(metrics.pnlPerDay, 2),
      metrics.pnlPctOfNetCredit !== null ? _jexNum(metrics.pnlPctOfNetCredit, 1) : '',
      _jexNum(metrics.totalCreditReceived, 2),
      _jexNum(metrics.totalDebitPaid, 2),
      _jexNum(metrics.netCreditDebit, 2),
      _jexStr(metrics.netCreditDebitType),
      legs.length,
      _jexStr(strikes),
      _jexStr(expirations),
      adjs.length,
      _jexNum(adjPnL, 2),
      _jexBool(hasRolls)
    ]);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

// ── Sheet 2: Legs ─────────────────────────────────────────────────
function _jexLegs(XLSX, trades) {
  var hdr = [
    'tradeId','symbol','legIndex','status','side','type','quantity',
    'strike','expiry','entryPrice','closePrice','legRealizedPnL',
    'openDate','closeDate','streamerSymbol','closedByAdjustmentId'
  ];
  var rows = [hdr];
  trades.forEach(function(t) {
    (t.legs || []).forEach(function(l, i) {
      var closePrice = l.exitPrice !== undefined ? l.exitPrice : (l.closePrice !== undefined ? l.closePrice : null);
      rows.push([
        _jexStr(t.id),
        _jexStr(t.ticker),
        i + 1,
        _jexStr(l.legStatus || 'OPEN'),
        _jexStr(l.side),
        _jexStr(l.type),
        _jexNum(l.qty),
        _jexNum(l.strike, 2),
        _jexStr(l.expiry),
        _jexNum(l.entryPrice, 4),
        _jexNum(closePrice, 4),
        _jexNum(l.legRealizedPnL, 2),
        _jexStr(l.openDate || t.entryDate),
        _jexStr(l.closeDate || ((l.legStatus||'OPEN')==='CLOSED' ? t.exitDate : '')),
        _jexStr(l.streamerSymbol),
        _jexStr(l.closedByAdjustmentId)
      ]);
    });
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

// ── Sheet 3: Adjustments ──────────────────────────────────────────
function _jexAdjustments(XLSX, trades) {
  var hdr = [
    'adjustmentId','tradeId','symbol','type','timestamp',
    'realizedPnLDelta','tradeRealizedPnLBefore','tradeRealizedPnLAfter',
    'previousStrategy','newStrategy','notes'
  ];
  var rows = [hdr];
  trades.forEach(function(t) {
    (t.adjustments || []).forEach(function(a) {
      rows.push([
        _jexStr(a.adjustmentId),
        _jexStr(t.id),
        _jexStr(t.ticker),
        _jexStr(a.type),
        _jexStr(a.timestamp),
        _jexNum(a.realizedPnLDelta, 2),
        _jexNum(a.tradeRealizedPnLBefore, 2),
        _jexNum(a.tradeRealizedPnLAfter, 2),
        _jexStr(a.previousStrategy),
        _jexStr(a.newStrategy),
        _jexStr(a.notes)
      ]);
    });
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

// ── Sheet 4: Snapshots ────────────────────────────────────────────
function _jexSnapshots(XLSX, trades) {
  // ── Header ────────────────────────────────────────────────────────────────
  var hdr = [
    // ── Existing 19 columns (preserved, unchanged) ─────────────────────────
    'tradeId','symbol','snapshotType','timestamp',
    'underlyingPrice','delta','theta','gamma','vega',
    'ivr','vix','marketRegime','rsi14','squeeze',
    'sma8','sma13','sma20','sma30','sma200',
    // ── Indicator source ────────────────────────────────────────────────────
    'indicatorSource',
    // ── VIX Family (15 columns) ─────────────────────────────────────────────
    'snap_vix','snap_vix9d','snap_vix3m','snap_vix6m',
    'snap_vixSpread_9d_0','snap_vixSpread_3m_0','snap_vixSpread_6m_3m',
    'snap_vixRatio_9d_0','snap_vixRatio_3m_0','snap_vixRatio_6m_3m',
    'snap_vixCurveState','snap_vixStressFlag',
    'snap_vixTimestamp','snap_vixSource','snap_vixSymbolsUsed',
    // ── DXLink 4H (17 columns) ──────────────────────────────────────────────
    'snap_4h_rsi14','snap_4h_rsVsSpy',
    'snap_4h_sma8','snap_4h_sma13','snap_4h_sma20','snap_4h_sma30','snap_4h_sma200',
    'snap_4h_squeeze',
    'snap_4h_bbStatus','snap_4h_bbUpper','snap_4h_bbMid','snap_4h_bbLower',
    'snap_4h_kcStatus','snap_4h_kcUpper','snap_4h_kcMid','snap_4h_kcLower',
    'snap_4h_betweenKCandBB',
    // ── DXLink 1D (17 columns) ──────────────────────────────────────────────
    'snap_1d_rsi14','snap_1d_rsVsSpy',
    'snap_1d_sma8','snap_1d_sma13','snap_1d_sma20','snap_1d_sma30','snap_1d_sma200',
    'snap_1d_squeeze',
    'snap_1d_bbStatus','snap_1d_bbUpper','snap_1d_bbMid','snap_1d_bbLower',
    'snap_1d_kcStatus','snap_1d_kcUpper','snap_1d_kcMid','snap_1d_kcLower',
    'snap_1d_betweenKCandBB',
  ];

  // Derive a readable band-status string from the three boolean fields
  function _bandStatus(above, inside, below) {
    if (above)  return 'above';
    if (inside) return 'inside';
    if (below)  return 'below';
    return '';
  }

  var rows = [hdr];
  trades.forEach(function(t) {
    [['entrySnapshot','entry'],['exitSnapshot','exit']].forEach(function(pair) {
      var snap = t[pair[0]];
      if (!snap) return;
      var h4 = snap.tech4h || {};  // null-safe
      var h1d = snap.tech1d || {}; // null-safe
      rows.push([
        // ── Existing 19 columns (unchanged) ──────────────────────────────
        _jexStr(t.id),
        _jexStr(t.ticker),
        pair[1],
        _jexStr(snap.timestamp),
        _jexNum(snap.underlyingPrice, 4),
        _jexNum(snap.delta, 4),
        _jexNum(snap.theta, 4),
        _jexNum(snap.gamma, 4),
        _jexNum(snap.vega, 4),
        _jexNum(snap.ivr, 2),
        _jexNum(snap.vix, 2),
        // marketRegime: export the label string, not [object Object]
        snap.marketRegime ? _jexStr(snap.marketRegime.label || '') : '',
        _jexNum(snap.rsi !== undefined ? snap.rsi : snap.rsi14, 2),
        _jexStr(snap.squeeze),
        _jexNum(snap.sma8, 4),
        _jexNum(snap.sma13, 4),
        _jexNum(snap.sma20 !== undefined ? snap.sma20 : snap.ma20, 4),
        _jexNum(snap.sma30, 4),
        _jexNum(snap.sma200, 4),
        // ── indicatorSource ───────────────────────────────────────────────
        _jexStr(snap.indicatorSource),
        // ── VIX Family ────────────────────────────────────────────────────
        _jexNum(snap.vix, 2),
        _jexNum(snap.vix9d, 2),
        _jexNum(snap.vix3m, 2),
        _jexNum(snap.vix6m, 2),
        _jexNum(snap.vixSpread_9d_0, 2),
        _jexNum(snap.vixSpread_3m_0, 2),
        _jexNum(snap.vixSpread_6m_3m, 2),
        _jexNum(snap.vixRatio_9d_0, 3),
        _jexNum(snap.vixRatio_3m_0, 3),
        _jexNum(snap.vixRatio_6m_3m, 3),
        _jexStr(snap.vixCurveState),
        _jexStr(snap.vixStressFlag),
        _jexStr(snap.vixTimestamp),
        _jexStr(snap.vixSource),
        snap.vixSymbolsUsed ? JSON.stringify(snap.vixSymbolsUsed) : '',
        // ── DXLink 4H ─────────────────────────────────────────────────────
        _jexNum(h4.rsi14, 2),
        _jexNum(h4.relStrengthVsSpy, 2),
        _jexNum(h4.sma8, 4),
        _jexNum(h4.sma13, 4),
        _jexNum(h4.sma20, 4),
        _jexNum(h4.sma30, 4),
        _jexNum(h4.sma200, 4),
        _jexStr(h4.squeeze != null ? String(h4.squeeze) : ''),
        _jexStr(_bandStatus(h4.aboveUpperBB, h4.insideBB, h4.belowLowerBB)),
        _jexNum(h4.bbUpper, 4),
        _jexNum(h4.bbMiddle, 4),
        _jexNum(h4.bbLower, 4),
        _jexStr(_bandStatus(h4.aboveUpperKC, h4.insideKC, h4.belowLowerKC)),
        _jexNum(h4.kcUpper, 4),
        _jexNum(h4.kcMiddle, 4),
        _jexNum(h4.kcLower, 4),
        _jexStr(h4.priceBetweenKCandBB != null ? String(h4.priceBetweenKCandBB) : ''),
        // ── DXLink 1D ─────────────────────────────────────────────────────
        _jexNum(h1d.rsi14, 2),
        _jexNum(h1d.relStrengthVsSpy, 2),
        _jexNum(h1d.sma8, 4),
        _jexNum(h1d.sma13, 4),
        _jexNum(h1d.sma20, 4),
        _jexNum(h1d.sma30, 4),
        _jexNum(h1d.sma200, 4),
        _jexStr(h1d.squeeze != null ? String(h1d.squeeze) : ''),
        _jexStr(_bandStatus(h1d.aboveUpperBB, h1d.insideBB, h1d.belowLowerBB)),
        _jexNum(h1d.bbUpper, 4),
        _jexNum(h1d.bbMiddle, 4),
        _jexNum(h1d.bbLower, 4),
        _jexStr(_bandStatus(h1d.aboveUpperKC, h1d.insideKC, h1d.belowLowerKC)),
        _jexNum(h1d.kcUpper, 4),
        _jexNum(h1d.kcMiddle, 4),
        _jexNum(h1d.kcLower, 4),
        _jexStr(h1d.priceBetweenKCandBB != null ? String(h1d.priceBetweenKCandBB) : ''),
      ]);
    });
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

// ── Sheet 5: Data Quality ─────────────────────────────────────────
function _jexDataQuality(XLSX, trades) {
  var hdr = [
    'tradeId','symbol',
    'missingEntrySnapshot','missingExitSnapshot',
    'missingGreeks','missingUnderlying','missingClosePrice',
    'missingLegPnL','pnlMismatch'
  ];
  var rows = [hdr];
  trades.forEach(function(t) {
    var legs      = t.legs || [];
    var eSnap     = t.entrySnapshot;
    var xSnap     = t.exitSnapshot;
    var closedLegs = legs.filter(function(l){ return (l.legStatus||'OPEN') === 'CLOSED'; });

    var missingGreeks     = !eSnap || (eSnap.delta === null || eSnap.delta === undefined);
    var missingUnderlying = !eSnap || (eSnap.underlyingPrice === null || eSnap.underlyingPrice === undefined);
    var missingClosePrice = closedLegs.some(function(l){
      return (l.exitPrice === null || l.exitPrice === undefined) &&
             (l.closePrice === null || l.closePrice === undefined);
    });
    var missingLegPnL = closedLegs.some(function(l){ return l.legRealizedPnL === null || l.legRealizedPnL === undefined; });

    var pnlMismatch = false;
    if (closedLegs.length > 0 &&
        t.realizedPnL !== null && t.realizedPnL !== undefined &&
        closedLegs.every(function(l){ return typeof l.legRealizedPnL === 'number'; })) {
      var legSum = closedLegs.reduce(function(s,l){ return s + l.legRealizedPnL; }, 0);
      pnlMismatch = Math.abs(legSum - parseFloat(t.realizedPnL)) > 0.05;
    }

    rows.push([
      _jexStr(t.id),
      _jexStr(t.ticker),
      _jexBool(!eSnap),
      t.status === 'CLOSED' ? _jexBool(!xSnap) : '',
      _jexBool(missingGreeks),
      _jexBool(missingUnderlying),
      _jexBool(missingClosePrice),
      _jexBool(missingLegPnL),
      _jexBool(pnlMismatch)
    ]);
  });
  return XLSX.utils.aoa_to_sheet(rows);
}

// ── Main xlsx writer ──────────────────────────────────────────────
function _doJournalExcelExport(XLSX, trades, fileName) {
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, _jexTradesSummary(XLSX, trades), 'Trades Summary');
  XLSX.utils.book_append_sheet(wb, _jexLegs(XLSX, trades),          'Legs');
  XLSX.utils.book_append_sheet(wb, _jexAdjustments(XLSX, trades),   'Adjustments');
  XLSX.utils.book_append_sheet(wb, _jexSnapshots(XLSX, trades),     'Snapshots');
  XLSX.utils.book_append_sheet(wb, _jexDataQuality(XLSX, trades),   'Data Quality');
  XLSX.writeFile(wb, fileName);
}

// ── CSV fallback (Trades Summary only) ───────────────────────────
function _doJournalCSVFallback(trades, fileName) {
  var csvRows = [
    ['tradeId','symbol','strategy','status','entryDate','exitDate','realizedPnL','durationDays','adjustmentsCount']
  ];
  trades.forEach(function(t) {
    var m = _tradeMetrics(t);
    csvRows.push([
      _jexStr(t.id), _jexStr(t.ticker), _jexStr(t.strategyType||t.strategy),
      _jexStr(t.status), _jexStr(t.entryDate), _jexStr(t.exitDate),
      _jexNum(t.realizedPnL,2), _jexNum(m.durationDays), (t.adjustments||[]).length
    ]);
  });
  var csv = csvRows.map(function(row){
    return row.map(function(c){
      var s = String(c===null||c===undefined?'':c);
      return (s.indexOf(',')>=0||s.indexOf('"')>=0||s.indexOf('\n')>=0) ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(',');
  }).join('\n');
  var blob = new Blob([csv], {type:'text/csv'});
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
}

// ── UI HELPERS ────────────────────────────────────────────────────
function jField(label, id, val, type, ph) {
  return '<div>' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);margin-bottom:2px">' + label + '</div>' +
    '<input id="' + id + '" type="' + type + '" value="' + val + '" placeholder="' + ph + '" ' +
    'style="width:100%;background:var(--bg2);color:var(--tx);border:1px solid var(--b0);' +
    'border-radius:5px;padding:4px 7px;font-size:9px;font-family:var(--M);box-sizing:border-box"></div>';
}

function jFieldSelect(label, id, opts, val, onChange) {
  return '<div>' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);margin-bottom:2px">' + label + '</div>' +
    '<select id="' + id + '" ' + (onChange ? 'onchange="' + onChange + '"' : '') + ' style="width:100%;background:var(--bg2);color:var(--tx);border:1px solid var(--b0);' +
    'border-radius:5px;padding:4px 7px;font-size:9px;font-family:var(--M)">' +
    opts.map(function(o){ return '<option value="' + o + '" ' + (o === val ? 'selected' : '') + '>' + o + '</option>'; }).join('') +
    '</select></div>';
}

function jFieldArea(label, id, val) {
  return '<div>' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3);margin-bottom:2px">' + label + '</div>' +
    '<textarea id="' + id + '" rows="2" style="width:100%;background:var(--bg2);color:var(--tx);' +
    'border:1px solid var(--b0);border-radius:5px;padding:4px 7px;font-size:9px;font-family:var(--M);' +
    'resize:vertical;box-sizing:border-box">' + val + '</textarea></div>';
}

function jSelect(id, opts, val, style) {
  return '<select id="' + id + '" style="background:var(--bg2);color:var(--tx);border:1px solid var(--b0);' +
    'border-radius:4px;padding:2px 4px;' + style + '">' +
    opts.map(function(o){ return '<option value="' + o + '" ' + (o === val ? 'selected' : '') + '>' + o + '</option>'; }).join('') +
    '</select>';
}

function jInput(id, val, type, ph) {
  return '<input id="' + id + '" type="' + type + '" value="' + (val || '') + '" placeholder="' + ph + '" ' +
    'style="background:var(--bg2);color:var(--tx);border:1px solid var(--b0);border-radius:4px;' +
    'padding:3px 5px;font-size:8px;font-family:var(--M);width:100%;box-sizing:border-box">';
}

function jPill(label, value, color) {
  return '<span style="font-size:7px;font-family:var(--M);padding:2px 6px;border-radius:4px;' +
    'background:var(--bg2);border:1px solid var(--b0);color:' + color + '">' +
    '<span style="color:var(--tx3)">' + label + ': </span>' + value + '</span>';
}

function jAnalyticCard(label, value, color) {
  return '<div style="padding:8px;background:var(--bg2);border-radius:6px;border-left:3px solid ' + color + '">' +
    '<div style="font-size:7px;font-family:var(--M);color:var(--tx3)">' + label + '</div>' +
    '<div style="font-size:12px;font-weight:700;color:' + color + '">' + value + '</div></div>';
}

// ── Leg templates per strategy type ───────────────────────────────
var J_LEG_TEMPLATES = {
  'EIC':              [{side:'sell',optType:'put'},{side:'sell',optType:'call'},{side:'buy',optType:'put'},{side:'buy',optType:'call'}],
  'PESS':             [{side:'buy',optType:'put'},{side:'buy',optType:'call'}],
  'strangle':         [{side:'sell',optType:'put'},{side:'sell',optType:'call'}],
  'bull put spread':  [{side:'sell',optType:'put'},{side:'buy',optType:'put'}],
  'bear call spread': [{side:'sell',optType:'call'},{side:'buy',optType:'call'}],
  'bear put spread':  [{side:'buy',optType:'put'},{side:'sell',optType:'put'}],
  'bull call spread': [{side:'buy',optType:'call'},{side:'sell',optType:'call'}],
  'Custom':           [],
};

function jOnStrategyChange(strategy) {
  var template = J_LEG_TEMPLATES[strategy] || [];
  for (var i = 0; i < 4; i++) {
    var sideEl = document.getElementById('jl_side_' + i);
    var typeEl = document.getElementById('jl_type_' + i);
    if (!sideEl || !typeEl) continue;
    if (i < template.length) {
      sideEl.value = template[i].side;
      typeEl.value = template[i].optType;
    }
  }
}

// ── VIEW: ADD TRADE ────────────────────────────────────────────────
function renderJournalAdd(prefill) {
  var pf = prefill || {};
  var autoTicker = (pf.ticker || S.selectedTicker || '').toUpperCase();
  var snapHint = '';
  if (autoTicker) {
    var d = S.scanData.find(function(x){ return x.ticker === autoTicker; });
    if (d && d.eicFinalDecision) {
      snapHint = '<div style="font-size:8px;font-family:var(--M);color:var(--gr);padding:5px 8px;' +
        'background:rgba(15,110,86,.08);border-radius:5px;margin-bottom:8px">' +
        '&#10003; Snapshot auto-populated from last EIC analysis (' + autoTicker + ')</div>';
    }
  }

  var initLegs = pf.legs || [
    {side:'sell', optType:'put',  qty:1, strike:'', expiration:'', entryPrice:''},
    {side:'sell', optType:'call', qty:1, strike:'', expiration:'', entryPrice:''},
    {side:'buy',  optType:'put',  qty:1, strike:'', expiration:'', entryPrice:''},
    {side:'buy',  optType:'call', qty:1, strike:'', expiration:'', entryPrice:''},
  ];

  var legsHtml = '<div style="font-size:8px;font-family:var(--M);font-weight:700;color:var(--tx2);margin:8px 0 4px">LEGS</div>' +
    '<div style="display:grid;grid-template-columns:60px 50px 40px 70px 90px 70px;gap:4px;' +
    'font-size:7px;font-family:var(--M);color:var(--tx3);margin-bottom:3px">' +
    '<span>Side</span><span>Type</span><span>Qty</span><span>Strike</span><span>Expiry</span><span>Entry $</span></div>';

  initLegs.forEach(function(leg, i) {
    legsHtml += '<div style="display:grid;grid-template-columns:60px 50px 40px 70px 90px 70px;gap:4px;margin-bottom:4px">' +
      jSelect('jl_side_' + i, ['sell','buy'], leg.side, 'font-size:8px') +
      jSelect('jl_type_' + i, ['put','call'], leg.optType, 'font-size:8px') +
      jInput('jl_qty_' + i, leg.qty, 'number', 'Qty') +
      jInput('jl_str_' + i, leg.strike, 'number', 'Strike') +
      jInput('jl_exp_' + i, leg.expiration, 'date', '') +
      jInput('jl_ep_' + i, leg.entryPrice, 'number', '0.00') +
    '</div>';
  });

  var form = '<div style="display:flex;flex-direction:column;gap:6px">' +
    snapHint +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      jField('Ticker', 'jticker', autoTicker, 'text', 'AAPL') +
      jField('Date Opened', 'jopenedAt', new Date().toISOString().slice(0,10), 'date', '') +
    '</div>' +
    jFieldSelect('Strategy', 'jstrategy', ['EIC','PESS','strangle','bull put spread','bear call spread','bear put spread','bull call spread','Custom'], pf.strategyType || 'EIC', 'jOnStrategyChange(this.value)') +
    legsHtml +
    jFieldArea('Notes', 'jnotes', pf.notes || '') +
    '<div style="display:flex;gap:8px;margin-top:6px">' +
      '<button onclick="jSubmitAdd()" style="flex:1;background:var(--gr);color:#fff;border:none;' +
        'border-radius:7px;padding:8px;font-family:var(--M);font-size:9px;font-weight:700;cursor:pointer">SAVE TRADE</button>' +
      '<button onclick="jView=\'list\';renderJournalView()" style="background:var(--bg2);color:var(--tx2);' +
        'border:1px solid var(--b0);border-radius:7px;padding:8px 12px;font-family:var(--M);font-size:9px;cursor:pointer">Cancel</button>' +
    '</div>' +
  '</div>';

  setPanel('NEW TRADE', form);
}

function jSubmitAdd() {
  var ticker = (document.getElementById('jticker').value || '').toUpperCase().trim();
  if (!ticker) { showToast('Ticker required', 'warn'); return; }
  var legs = [];
  for (var i = 0; i < 4; i++) {
    var s = document.getElementById('jl_str_' + i);
    if (s && s.value) {
      legs.push({
        side:        document.getElementById('jl_side_' + i).value,
        optType:     document.getElementById('jl_type_' + i).value,
        qty:         +document.getElementById('jl_qty_' + i).value || 1,
        strike:      +document.getElementById('jl_str_' + i).value,
        expiration:  document.getElementById('jl_exp_' + i).value,
        entryPrice:  +document.getElementById('jl_ep_' + i).value || null,
        exitPrice:   null,
      });
    }
  }
  var trade = {
    ticker, status: 'open',
    openedAt:     document.getElementById('jopenedAt').value || new Date().toISOString().slice(0,10),
    closedAt:     null,
    strategyType: document.getElementById('jstrategy').value,
    legs, pnl: null, pnlPct: null,
    notes:     document.getElementById('jnotes').value,
    exitNotes: null,
    snapshot:  jBuildSnapshot(ticker),
  };
  var id = jAddTrade(trade);
  showToast('Trade ' + ticker + ' saved', 'ok');
  jView = 'detail'; jDetailId = id; renderJournalView();
}

// ── VIEW: EDIT TRADE ────────────────────────────────────────────────
function renderJournalEdit(id) {
  var trades = jLoad();
  var t = trades.find(function(x){ return x.id === id; });
  if (!t) { jView = 'list'; renderJournalView(); return; }

  var initLegs = (t.legs && t.legs.length) ? t.legs.slice() : [
    {side:'sell', optType:'put',  qty:1, strike:'', expiration:'', entryPrice:''},
    {side:'sell', optType:'call', qty:1, strike:'', expiration:'', entryPrice:''},
    {side:'buy',  optType:'put',  qty:1, strike:'', expiration:'', entryPrice:''},
    {side:'buy',  optType:'call', qty:1, strike:'', expiration:'', entryPrice:''},
  ];
  while (initLegs.length < 4) {
    initLegs.push({side:'sell', optType:'put', qty:1, strike:'', expiration:'', entryPrice:''});
  }

  var legsHtml = '<div style="font-size:8px;font-family:var(--M);font-weight:700;color:var(--tx2);margin:8px 0 4px">LEGS</div>' +
    '<div style="display:grid;grid-template-columns:60px 50px 40px 70px 90px 70px;gap:4px;' +
    'font-size:7px;font-family:var(--M);color:var(--tx3);margin-bottom:3px">' +
    '<span>Side</span><span>Type</span><span>Qty</span><span>Strike</span><span>Expiry</span><span>Entry $</span></div>';
  initLegs.slice(0, 4).forEach(function(leg, i) {
    legsHtml += '<div style="display:grid;grid-template-columns:60px 50px 40px 70px 90px 70px;gap:4px;margin-bottom:4px">' +
      jSelect('jl_side_' + i, ['sell','buy'], leg.side || 'sell', 'font-size:8px') +
      jSelect('jl_type_' + i, ['put','call'], leg.optType || 'put', 'font-size:8px') +
      jInput('jl_qty_' + i, leg.qty, 'number', 'Qty') +
      jInput('jl_str_' + i, leg.strike, 'number', 'Strike') +
      jInput('jl_exp_' + i, leg.expiration, 'date', '') +
      jInput('jl_ep_' + i, leg.entryPrice, 'number', '0.00') +
    '</div>';
  });

  var allStrategies = ['EIC','PESS','strangle','bull put spread','bear call spread','bear put spread','bull call spread','Custom'];
  var form = '<div style="display:flex;flex-direction:column;gap:6px">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
      jField('Ticker', 'jticker', t.ticker, 'text', 'AAPL') +
      jField('Date Opened', 'jopenedAt', t.openedAt || new Date().toISOString().slice(0,10), 'date', '') +
    '</div>' +
    jFieldSelect('Strategy', 'jstrategy', allStrategies, t.strategyType || 'EIC', 'jOnStrategyChange(this.value)') +
    legsHtml +
    jFieldArea('Notes', 'jnotes', t.notes || '') +
    '<div style="display:flex;gap:8px;margin-top:6px">' +
      '<button onclick="jSubmitEdit(\'' + id + '\')" style="flex:1;background:var(--gr);color:#fff;border:none;' +
        'border-radius:7px;padding:8px;font-family:var(--M);font-size:9px;font-weight:700;cursor:pointer">SAVE CHANGES</button>' +
      '<button onclick="jView=\'detail\';jDetailId=\'' + id + '\';renderJournalView()" style="background:var(--bg2);color:var(--tx2);' +
        'border:1px solid var(--b0);border-radius:7px;padding:8px 12px;font-family:var(--M);font-size:9px;cursor:pointer">Cancel</button>' +
    '</div>' +
  '</div>';

  setPanel('EDIT TRADE', form);
}

function jSubmitEdit(id) {
  var ticker = (document.getElementById('jticker').value || '').toUpperCase().trim();
  if (!ticker) { showToast('Ticker required', 'warn'); return; }
  var existing = jLoad().find(function(t){ return t.id === id; });
  var existingLegs = existing ? (existing.legs || []) : [];
  var legs = [];
  for (var i = 0; i < 4; i++) {
    var s = document.getElementById('jl_str_' + i);
    if (s && s.value) {
      var exLeg = existingLegs[i] || {};
      legs.push({
        side:        document.getElementById('jl_side_' + i).value,
        optType:     document.getElementById('jl_type_' + i).value,
        qty:         +document.getElementById('jl_qty_' + i).value || 1,
        strike:      +document.getElementById('jl_str_' + i).value,
        expiration:  document.getElementById('jl_exp_' + i).value,
        entryPrice:  +document.getElementById('jl_ep_' + i).value || null,
        exitPrice:   exLeg.exitPrice != null ? exLeg.exitPrice : null,
      });
    }
  }
  jUpdateTrade(id, {
    ticker:       ticker,
    openedAt:     document.getElementById('jopenedAt').value,
    strategyType: document.getElementById('jstrategy').value,
    legs:         legs,
    notes:        document.getElementById('jnotes').value,
  });
  showToast('Trade ' + ticker + ' updated', 'ok');
  jView = 'detail'; jDetailId = id; renderJournalView();
}

// ── VIEW: DETAIL ────────────────────────────────────────────────────
function renderJournalDetail(id) {
  var trades = jLoad();
  var t = trades.find(function(x){ return x.id === id; });
  if (!t) { jView = 'list'; renderJournalView(); return; }

  var snap = t.snapshot || {};
  var pnlC = t.pnl > 0 ? 'var(--gr)' : t.pnl < 0 ? 'var(--rd)' : 'var(--tx2)';
  var decC  = jDecisionColor(snap.finalTradingDecision);
  var gradeC = jGradeColor(snap.setupGrade);

  var legsTable = '<table style="width:100%;border-collapse:collapse;font-size:8px;font-family:var(--M);margin:6px 0">' +
    '<thead><tr style="border-bottom:1px solid var(--b0)">' +
    ['Side','Type','Qty','Strike','Expiry','Entry','Exit'].map(function(h){
      return '<th style="text-align:left;padding:3px 5px;color:var(--tx3)">' + h + '</th>';
    }).join('') + '</tr></thead><tbody>';
  (t.legs || []).forEach(function(l){
    var sC = l.side === 'sell' ? 'var(--rd)' : 'var(--gr)';
    legsTable += '<tr style="border-bottom:1px solid rgba(0,0,0,.05)">' +
      '<td style="padding:3px 5px;color:' + sC + ';font-weight:700">' + l.side.toUpperCase() + '</td>' +
      '<td style="padding:3px 5px">' + l.optType.toUpperCase() + '</td>' +
      '<td style="padding:3px 5px;text-align:center">' + l.qty + '</td>' +
      '<td style="padding:3px 5px;text-align:center">$' + l.strike + '</td>' +
      '<td style="padding:3px 5px;text-align:center">' + (l.expiration || '—') + '</td>' +
      '<td style="padding:3px 5px;text-align:center">' + (l.entryPrice != null ? '$' + l.entryPrice : '—') + '</td>' +
      '<td style="padding:3px 5px;text-align:center">' + (l.exitPrice  != null ? '$' + l.exitPrice  : '—') + '</td>' +
    '</tr>';
  });
  legsTable += '</tbody></table>';

  var snapPills = '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">' +
    jPill('Setup', (snap.setupGrade || '—') + ' (' + (snap.setupScore || '—') + ')', gradeC) +
    jPill('Decision', snap.finalTradingDecision || '—', decC) +
    jPill('Exec', snap.executionVerdict || '—', 'var(--tx2)') +
    jPill('DXLink', (snap.dxlinkConfidence || 'none').toUpperCase(), 'var(--tx3)') +
    jPill('MCX', snap.marketContextRisk || '—', 'var(--tx2)') +
    jPill('IVR', snap.ivr != null ? normalizeIvrPercent(snap.ivr).toFixed(0) + '%' : '—', 'var(--tx2)') +
    (snap.theoreticalCredit != null ? jPill('Theo', '$' + snap.theoreticalCredit, 'var(--tx2)') : '') +
    (snap.marketCredit      != null ? jPill('Mkt',  '$' + snap.marketCredit,      'var(--tx2)') : '') +
    (snap.slippagePct       != null ? jPill('Slip',  snap.slippagePct + '%', snap.slippagePct > 30 ? 'var(--rd)' : 'var(--tx2)') : '') +
  '</div>' +
  (snap.setupCapsTriggered && snap.setupCapsTriggered.length ?
    '<div style="margin-top:4px">' + snap.setupCapsTriggered.map(function(c){
      return '<span style="font-size:7px;padding:1px 5px;border-radius:3px;' +
        'background:rgba(255,179,64,.12);color:var(--am);margin-right:3px">' + c + '</span>';
    }).join('') + '</div>' : '');

  var closeForm = '';
  if (t.status === 'open') {
    closeForm = '<div style="margin-top:10px;padding:8px;background:var(--bg2);border-radius:7px">' +
      '<div style="font-size:8px;font-family:var(--M);font-weight:700;margin-bottom:6px">CLOSE TRADE</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">' +
        jField('Close Date', 'jclose_date', new Date().toISOString().slice(0,10), 'date', '') +
        jField('P&L ($)',    'jclose_pnl',  '', 'number', 'e.g. 250') +
        jField('P&L %',     'jclose_pct',  '', 'number', 'e.g. 12.5') +
      '</div>' +
      jFieldArea('Exit Notes', 'jclose_notes', '') +
      '<button class="jclose-btn" data-tid="' + id + '" style="margin-top:6px;width:100%;background:var(--rd);color:#fff;border:none;border-radius:6px;padding:7px;font-family:var(--M);font-size:9px;font-weight:700;cursor:pointer">CLOSE TRADE</button>' +


    '</div>';
  }

  var detailHtml = '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">' +
    '<button onclick="jView=\'list\';renderJournalView()" style="font-size:9px;font-family:var(--M);' +
      'background:var(--bg2);border:1px solid var(--b0);border-radius:5px;padding:3px 8px;cursor:pointer">&#8592; Back</button>' +
    '<span style="font-size:14px;font-weight:700">' + t.ticker + '</span>' +
    '<span style="font-size:9px;font-family:var(--M);color:var(--tx3)">' + t.strategyType + ' &middot; ' + t.openedAt + '</span>' +
    '<span style="font-size:10px;font-weight:700;color:' + pnlC + ';margin-left:auto">' +
      (t.pnl != null ? (t.pnl > 0 ? '+' : '') + t.pnl : 'PnL: —') + '</span>' +
    '<button class="jedit-btn" data-tid="' + id + '" style="font-size:8px;color:var(--tx2);background:none;border:1px solid var(--b0);border-radius:4px;padding:2px 6px;cursor:pointer">&#9998;</button>' +
    '<button class="jdel-btn" data-tid="' + id + '" style="font-size:8px;color:var(--rd);background:none;border:none;cursor:pointer">&#10005;</button>' +
  '</div>' +
  legsTable + snapPills +
  (t.notes ? '<div style="font-size:8px;font-family:var(--M);color:var(--tx2);margin-top:6px;padding:6px;' +
    'background:var(--bg2);border-radius:5px">' + t.notes + '</div>' : '') +
  closeForm;

  setPanel('TRADE DETAIL', detailHtml);
  setTimeout(function(){
    var cb = document.querySelector('.jclose-btn');
    if(cb) cb.addEventListener('click', function(){ jCloseTrade(this.getAttribute('data-tid')); });
    var eb = document.querySelector('.jedit-btn');
    if(eb) eb.addEventListener('click', function(){
      jView='edit'; jDetailId=this.getAttribute('data-tid'); renderJournalView();
    });
    var db = document.querySelector('.jdel-btn');
    if(db) db.addEventListener('click', function(){
      if(confirm('Delete this trade?')){ jDeleteTrade(this.getAttribute('data-tid')); jView='list'; renderJournalView(); }
    });
  }, 50);
}

function jCloseTrade(id) {
  var pnl    = parseFloat(document.getElementById('jclose_pnl').value);
  var pnlPct = parseFloat(document.getElementById('jclose_pct').value);
  var closeDate = document.getElementById('jclose_date').value;
  var notes  = document.getElementById('jclose_notes').value;
  if (isNaN(pnl)) { showToast('Enter valid P&L', 'warn'); return; }
  jUpdateTrade(id, {
    status: 'closed', pnl: +pnl.toFixed(2),
    pnlPct: isNaN(pnlPct) ? null : +pnlPct.toFixed(2),
    closedAt: closeDate, exitNotes: notes,
  });
  showToast('Trade closed. P&L: ' + (pnl > 0 ? '+' : '') + pnl, 'ok');
  renderJournalDetail(id);
}

// ── VIEW: ANALYTICS ─────────────────────────────────────────────────
function renderJournalAnalytics() {
  var stats = jComputeStats(jLoad());

  function statTable(data, label) {
    var entries = Object.entries(data);
    if (!entries.length) return '';
    var rows = entries.sort(function(a,b){ return b[1].pnl - a[1].pnl; }).map(function(e){
      var k = e[0], v = e[1];
      var wr = v.count > 0 ? +(v.wins / v.count * 100).toFixed(0) : 0;
      var pC = v.pnl > 0 ? 'var(--gr)' : v.pnl < 0 ? 'var(--rd)' : 'var(--tx2)';
      return '<tr>' +
        '<td style="padding:4px 8px">' + k + '</td>' +
        '<td style="padding:4px 8px;text-align:center">' + v.count + '</td>' +
        '<td style="padding:4px 8px;text-align:center;color:' + pC + '">$' + v.pnl.toFixed(0) + '</td>' +
        '<td style="padding:4px 8px;text-align:center">' + wr + '%</td></tr>';
    }).join('');
    return '<div style="margin-bottom:14px">' +
      '<div style="font-size:9px;font-family:var(--M);font-weight:700;color:var(--tx2);margin-bottom:4px">' + label + '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:8px;font-family:var(--M);background:var(--bg2);border-radius:6px">' +
      '<thead><tr style="border-bottom:1px solid var(--b0)">' +
      '<th style="text-align:left;padding:4px 8px;color:var(--tx3)">' + label + '</th>' +
      '<th style="padding:4px 8px;color:var(--tx3)">Trades</th>' +
      '<th style="padding:4px 8px;color:var(--tx3)">PnL</th>' +
      '<th style="padding:4px 8px;color:var(--tx3)">Win%</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div>';
  }

  var backBtn = '<button onclick="jView=\'list\';renderJournalView()" style="font-size:9px;padding:3px 8px;' +
    'background:var(--bg2);border:1px solid var(--b0);border-radius:5px;cursor:pointer;margin-bottom:10px">&#8592; Back</button>';

  if (!stats.closedCount) {
    setPanel('ANALYTICS', backBtn +
      '<div style="text-align:center;padding:30px;color:var(--tx3);font-family:var(--M)">No closed trades yet.</div>');
    return;
  }

  var pnlC = stats.totalPnl > 0 ? 'var(--gr)' : stats.totalPnl < 0 ? 'var(--rd)' : 'var(--tx2)';
  var analyticsHtml = backBtn +
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">' +
      jAnalyticCard('Total PnL',   '$' + stats.totalPnl,  pnlC) +
      jAnalyticCard('Win Rate',    stats.winRate + '%',    stats.winRate >= 50 ? 'var(--gr)' : 'var(--rd)') +
      jAnalyticCard('Expectancy',  '$' + stats.expectancy, stats.expectancy > 0 ? 'var(--gr)' : 'var(--rd)') +
      jAnalyticCard('Avg Winner',  '$' + stats.avgWinner,  'var(--gr)') +
      jAnalyticCard('Avg Loser',   '$' + stats.avgLoser,   'var(--rd)') +
      jAnalyticCard('Closed',      stats.closedCount,      'var(--tx2)') +
    '</div>' +
    statTable(stats.byStrategy, 'By Strategy') +
    statTable(stats.byGrade,    'By Setup Grade') +
    statTable(stats.byCap,      'By Cap Triggered') +
    statTable(stats.byContext,  'By Market Context');

  setPanel('ANALYTICS (' + stats.closedCount + ' closed)', analyticsHtml);
}

// ── Quick capture: pre-fill ADD form from current EIC analysis ──────
function jQuickCapture(ticker) {
  var d = S.scanData.find(function(x){ return x.ticker === ticker; });
  if (!d) { showToast('Ticker not in scan data', 'warn'); return; }
  var prefill = {
    ticker,
    strategyType: d.eicFinalDecision ? 'EIC' : 'Custom',
    legs: [],
  };
  if (d.eicLegs && d.eicLegs.legs) {
    Object.entries(d.eicLegs.legs).forEach(function(e){
      var k = e[0], l = e[1];
      prefill.legs.push({
        side:       k.startsWith('short') ? 'sell' : 'buy',
        optType:    k.includes('Call')    ? 'call'  : 'put',
        qty:        1,
        strike:     l.strike,
        expiration: d.eicLegs.expiration || '',
        entryPrice: l.mid || null,
        exitPrice:  null,
      });
    });
  }
  jView = 'add';
  renderJournalAdd(prefill);
}

function jDecisionColor(d) {
  return d === 'APPROVED'             ? 'var(--gr)'  :
         d === 'APPROVED_WITH_CAUTION'? 'var(--am)'  :
         d === 'WATCHLIST_ONLY'       ? '#f97316'    :
         d === 'AVOID' || d === 'BLOCKED_BY_CONTEXT' ? 'var(--rd)' : 'var(--tx3)';
}

function jGradeColor(g) {
  return g === 'STRONG' ? 'var(--gr)' :
         g === 'OK'     ? 'var(--am)' :
         g === 'WEAK'   ? 'var(--rd)' : 'var(--tx3)';
}
