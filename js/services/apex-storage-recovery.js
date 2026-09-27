// ── Non-destructive storage recovery helpers ──────────────────────────────
// apexStorageKey() namespaces apex_portfolios / apex_trades / apex_positions
// per environment (production = base, deploy-preview = base__preview_N,
// localhost = base__local). A regression — or data that was entered on a
// different host — can leave the PRIMARY key empty while the real portfolios /
// positions still live under a sibling or legacy key. These helpers READ ONLY
// from siblings; they never delete or overwrite the source, and they back up
// before any copy. They exist purely to recover already-saved data and do not
// touch the portfolio formulas, the data schema, or the Trading Journal store.

// All historical / sibling variants of a base key, in recovery priority order:
// current-env primary first, then the plain (pre-namespacing / production) key,
// then the localhost namespace, then every deploy-preview namespace that is
// actually present in localStorage right now.
function apexStorageKeyVariants(base) {
  var out = [];
  function push(k) { if (k && out.indexOf(k) === -1) out.push(k); }
  push(apexStorageKey(base));   // primary for the current host
  push(base);                   // plain key (production / pre-refactor)
  push(base + '__local');       // localhost namespace
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(base + '__preview_') === 0) push(k);
    }
  } catch (e) {}
  return out;
}

// Read a localStorage value as a JSON array. Never throws.
function _apexReadArray(key) {
  try {
    var raw = localStorage.getItem(key);
    if (raw == null) return { exists: false, arr: [], bytes: 0 };
    var v = JSON.parse(raw);
    return { exists: true, arr: Array.isArray(v) ? v : [], bytes: raw.length };
  } catch (e) { return { exists: false, arr: [], bytes: 0 }; }
}

// Non-destructive load for an array-backed store. Returns the primary key's
// data when present; otherwise scans sibling/legacy variants and returns the
// richest one. NEVER writes or deletes. Returns metadata so the caller can log
// a store-specific recovery line. No logging here (callers log).
function apexNonDestructiveLoadArray(base) {
  var variants   = apexStorageKeyVariants(base);
  var primaryKey = variants[0];
  var primary    = _apexReadArray(primaryKey);
  if (primary.exists && primary.arr.length) {
    return { arr: primary.arr, sourceKey: primaryKey, primaryKey: primaryKey,
             primaryEmpty: false, usedFallback: false, count: primary.arr.length };
  }
  var best = null, bestKey = null;
  for (var i = 1; i < variants.length; i++) {
    var r = _apexReadArray(variants[i]);
    if (r.exists && r.arr.length && (!best || r.arr.length > best.arr.length)) {
      best = r; bestKey = variants[i];
    }
  }
  if (best) {
    return { arr: best.arr.slice(), sourceKey: bestKey, primaryKey: primaryKey,
             primaryEmpty: true, usedFallback: true, count: best.arr.length };
  }
  return { arr: [], sourceKey: primaryKey, primaryKey: primaryKey,
           primaryEmpty: true, usedFallback: false, count: 0 };
}

// Timestamped backup key: apex_backup_<name>_YYYYMMDD_HHMMSS
function apexBackupKey(base) {
  var d = new Date();
  function p(n) { return (n < 10 ? '0' : '') + n; }
  var stamp = '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '_' +
              p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  return 'apex_backup_' + base.replace(/^apex_/, '') + '_' + stamp;
}

// Snapshot sourceKey into a fresh apex_backup_* key. Pure copy — it never
// deletes or overwrites the source. Returns the backup key (or null on no-op).
function apexCreateBackup(base, sourceKey) {
  try {
    var raw = localStorage.getItem(sourceKey);
    if (raw == null) return null;
    var bkey  = apexBackupKey(base);
    localStorage.setItem(bkey, raw);
    var count = 0; try { var v = JSON.parse(raw); count = Array.isArray(v) ? v.length : 0; } catch (e) {}
    console.log('[' + base.replace(/^apex_/, '').toUpperCase() + ' STORAGE BACKUP]' +
      '\n  sourceKey=' + sourceKey +
      '\n  backupKey=' + bkey +
      '\n  bytes=' + raw.length +
      '\n  count=' + count);
    return bkey;
  } catch (e) { return null; }
}
