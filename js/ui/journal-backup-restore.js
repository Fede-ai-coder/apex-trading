// ══════════════════════════════════════════════════════════════
// BACKUP / RESTORE PANEL
// ══════════════════════════════════════════════════════════════

function showBackupPanel() {
  document.getElementById('backupModal').style.display = 'flex';
  loadBackupList();
}

function closeBackupPanel() {
  document.getElementById('backupModal').style.display = 'none';
}

async function loadBackupList() {
  var el = document.getElementById('backupList');
  var st = document.getElementById('backupStatus');
  el.innerHTML = '<div style="font-size:9px;font-family:var(--M);color:var(--tx2);padding:16px 0">Loading backups...</div>';
  st.textContent = '';
  st.style.color = 'var(--tx2)';
  try {
    var r = await ttCall('/journal/backups');
    console.log('[BACKUP-DIAG] /journal/backups raw response type:', Array.isArray(r) ? 'array' : typeof r);
    console.log('[BACKUP-DIAG] /journal/backups response keys:', r && !Array.isArray(r) ? Object.keys(r) : 'bare array');
    var backups = Array.isArray(r) ? r : (r.backups || []);
    console.log('[BACKUP-DIAG] backup count:', backups.length);
    backups.forEach(function(b, i) {
      console.log('[BACKUP-DIAG] backup[' + i + ']:', JSON.stringify({
        filename: b.filename || b.name,
        createdAt: b.createdAt,
        fileSize: b.fileSize != null ? b.fileSize : b.size,
        tradeCount: b.tradeCount,
        allKeys: Object.keys(b),
      }));
    });
    st.textContent = backups.length + ' backup' + (backups.length !== 1 ? 's' : '') + ' found';
    renderBackupList(backups);
  } catch(e) {
    el.innerHTML = '<div style="font-size:9px;font-family:var(--M);color:var(--rd);padding:16px 0">Failed to load backups: ' + e.message + '</div>';
  }
}

function _bkFmtBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function _bkFmtDate(iso) {
  if (!iso) return '—';
  try {
    var d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
  } catch(e) { return iso; }
}

function renderBackupList(backups) {
  var el = document.getElementById('backupList');
  if (!backups.length) {
    el.innerHTML = '<div style="font-size:9px;font-family:var(--M);color:var(--tx2);padding:24px 0;text-align:center">No backups yet. Click <strong>+ CREATE BACKUP</strong> to create one.</div>';
    return;
  }
  var rows = backups.map(function(b) {
    var fn = b.filename || b.name || '';
    var safeFn = fn.replace(/'/g, "\\'");
    return '<tr style="border-top:1px solid var(--b0)">' +
      '<td style="padding:9px 8px;font-size:9px;font-family:var(--M);color:var(--tx);word-break:break-all;max-width:200px">' + fn + '</td>' +
      '<td style="padding:9px 8px;font-size:9px;font-family:var(--M);color:var(--tx2);white-space:nowrap">' + _bkFmtDate(b.createdAt) + '</td>' +
      '<td style="padding:9px 8px;font-size:9px;font-family:var(--M);color:var(--tx2);white-space:nowrap">' + _bkFmtBytes(b.fileSize != null ? b.fileSize : b.size) + '</td>' +
      '<td style="padding:9px 8px;font-size:9px;font-family:var(--M);color:var(--tx2);text-align:right">' + (b.tradeCount != null ? b.tradeCount : '—') + '</td>' +
      '<td style="padding:9px 8px;white-space:nowrap;text-align:right">' +
        '<button onclick="restoreBackup(\'' + safeFn + '\')" style="font-size:8px;font-family:var(--M);font-weight:700;background:rgba(251,191,36,.15);color:var(--am);border:1px solid rgba(251,191,36,.35);border-radius:5px;padding:5px 9px;cursor:pointer;margin-right:5px">RESTORE</button>' +
        '<button onclick="deleteBackup(\'' + safeFn + '\')" style="font-size:8px;font-family:var(--M);font-weight:700;background:rgba(255,77,106,.12);color:var(--rd);border:1px solid rgba(255,77,106,.3);border-radius:5px;padding:5px 9px;cursor:pointer">DELETE</button>' +
      '</td>' +
    '</tr>';
  }).join('');
  el.innerHTML =
    '<table style="width:100%;border-collapse:collapse">' +
      '<thead><tr>' +
        '<th style="padding:5px 8px;font-size:8px;font-family:var(--M);color:var(--tx3);text-align:left;font-weight:600;letter-spacing:.06em">FILENAME</th>' +
        '<th style="padding:5px 8px;font-size:8px;font-family:var(--M);color:var(--tx3);text-align:left;font-weight:600;letter-spacing:.06em">CREATED</th>' +
        '<th style="padding:5px 8px;font-size:8px;font-family:var(--M);color:var(--tx3);text-align:left;font-weight:600;letter-spacing:.06em">SIZE</th>' +
        '<th style="padding:5px 8px;font-size:8px;font-family:var(--M);color:var(--tx3);text-align:right;font-weight:600;letter-spacing:.06em">TRADES</th>' +
        '<th style="padding:5px 8px;font-size:8px;font-family:var(--M);color:var(--tx3);text-align:right;font-weight:600;letter-spacing:.06em">ACTIONS</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

async function createBackup() {
  var btn = document.getElementById('createBackupBtn');
  var st = document.getElementById('backupStatus');
  btn.disabled = true;
  btn.textContent = 'Creating...';
  st.textContent = '';
  st.style.color = 'var(--tx2)';
  try {
    // Log trade count on the live DB before snapshotting
    try {
      var _bkPre = await ttCall('/journal/trades');
      var _bkCount = (_bkPre && Array.isArray(_bkPre.trades)) ? _bkPre.trades.length : 'unknown';
      console.log('[BACKUP-DIAG] createBackup: live trade count at snapshot time:', _bkCount);
    } catch(e) {
      console.warn('[BACKUP-DIAG] createBackup: pre-backup count fetch failed:', e.message);
    }
    var r = await ttCall('/journal/backup', {method: 'POST'});
    console.log('[BACKUP-DIAG] createBackup response:', JSON.stringify(r));
    st.textContent = 'Backup created: ' + (r.filename || r.name || 'OK');
    st.style.color = 'var(--gr)';
    await loadBackupList();
  } catch(e) {
    st.textContent = 'Error creating backup: ' + e.message;
    st.style.color = 'var(--rd)';
  }
  btn.disabled = false;
  btn.textContent = '+ CREATE BACKUP';
  setTimeout(function() { st.style.color = 'var(--tx2)'; }, 6000);
}

async function restoreBackup(filename) {
  // First confirmation
  var ok1 = window.confirm(
    'RESTORE BACKUP\n\n' +
    'File: "' + filename + '"\n\n' +
    'WARNING: This will permanently replace the current database with the backup contents.\n' +
    'All current journal data will be overwritten. This cannot be undone.\n\n' +
    'A safety backup of the current database will be created automatically before restore.\n\n' +
    'Continue?'
  );
  if (!ok1) return;

  // Second confirmation
  var ok2 = window.confirm(
    'FINAL CONFIRMATION — RESTORE\n\n' +
    '"' + filename + '"\n\n' +
    'The CURRENT database will be PERMANENTLY REPLACED.\n' +
    'Press OK to proceed, or Cancel to abort.'
  );
  if (!ok2) return;

  var st = document.getElementById('backupStatus');
  st.textContent = 'Restoring from backup...';
  st.style.color = 'var(--am)';

  // Log live trade count BEFORE restore so we can compare after
  try {
    var _preFetch = await ttCall('/journal/trades');
    var _preCount = (_preFetch && Array.isArray(_preFetch.trades)) ? _preFetch.trades.length : 'unknown';
    console.log('[BACKUP-DIAG] PRE-RESTORE live trade count from /journal/trades:', _preCount);
    console.log('[BACKUP-DIAG] PRE-RESTORE response keys:', _preFetch ? Object.keys(_preFetch) : 'null');
  } catch(e) {
    console.warn('[BACKUP-DIAG] PRE-RESTORE fetch failed:', e.message);
  }

  try {
    console.log('[JOURNAL-DIAG] restoreBackup: filename =', filename);
    var r = await ttCall('/journal/restore', {
      method: 'POST',
      body: {filename: filename},
    });
    console.log('[JOURNAL-DIAG] restore response keys:', r ? Object.keys(r) : 'null/undefined');
    console.log('[JOURNAL-DIAG] restore response:', JSON.stringify(r).substring(0, 400));
    var msg = 'Restore complete.';
    if (r.safetyBackup) msg += ' Safety backup: ' + r.safetyBackup;
    st.textContent = msg;
    st.style.color = 'var(--gr)';
    showToast('Restore complete' + (r.safetyBackup ? ' — safety backup: ' + r.safetyBackup : '') + '.', 'ok');
    await loadBackupList();

    // Raw re-check immediately after restore (no merge — just count what the backend now has)
    try {
      var _postFetch = await ttCall('/journal/trades');
      var _postCount = (_postFetch && Array.isArray(_postFetch.trades)) ? _postFetch.trades.length : 'unknown';
      console.log('[BACKUP-DIAG] POST-RESTORE (immediate) live trade count from /journal/trades:', _postCount);
      if (_postCount === 0) {
        console.warn('[BACKUP-DIAG] Backend has 0 trades after restore — backup may have been empty (schema only)');
      }
    } catch(e) {
      console.warn('[BACKUP-DIAG] POST-RESTORE immediate fetch failed:', e.message);
    }

    // Delayed re-check (2 s) in case backend needs time to flush/commit the restore
    setTimeout(function() {
      ttCall('/journal/trades').then(function(_delayedFetch) {
        var _delayedCount = (_delayedFetch && Array.isArray(_delayedFetch.trades)) ? _delayedFetch.trades.length : 'unknown';
        console.log('[BACKUP-DIAG] POST-RESTORE (2 s delay) live trade count from /journal/trades:', _delayedCount);
      }).catch(function(e) {
        console.warn('[BACKUP-DIAG] POST-RESTORE delayed fetch failed:', e.message);
      });
    }, 2000);

    // Re-fetch restored trades from backend so Journal UI reflects restored data
    console.log('[JOURNAL-DIAG] Starting post-restore backend sync...');
    _jSyncJournalFromBackend().then(function(hadTrades) {
      console.log('[JOURNAL-DIAG] Post-restore sync complete. hadTrades:', hadTrades,
        '| journalManager count:', journalManager.getAll().length);
      renderPortfolioJournalView();
    }).catch(function(e) {
      console.warn('[JOURNAL-DIAG] Post-restore sync error:', e && e.message);
    });
  } catch(e) {
    st.textContent = 'Restore failed: ' + e.message;
    st.style.color = 'var(--rd)';
    showToast('Restore failed: ' + e.message, 'err');
  }
  setTimeout(function() { st.style.color = 'var(--tx2)'; }, 10000);
}

async function deleteBackup(filename) {
  var ok = window.confirm('Delete backup "' + filename + '"?\n\nThis action cannot be undone.');
  if (!ok) return;

  var st = document.getElementById('backupStatus');
  st.textContent = 'Deleting backup...';
  st.style.color = 'var(--am)';
  try {
    await ttCall('/journal/backups/' + encodeURIComponent(filename), {method: 'DELETE'});
    st.textContent = 'Backup deleted.';
    st.style.color = 'var(--gr)';
    await loadBackupList();
  } catch(e) {
    st.textContent = 'Delete failed: ' + e.message;
    st.style.color = 'var(--rd)';
  }
  setTimeout(function() { st.style.color = 'var(--tx2)'; }, 5000);
}
