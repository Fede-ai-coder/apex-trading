// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SCANNER SNAPSHOT PANEL (BSS UI) — extracted from index.html
// (relocation only). The thirty-two declarations below are byte-identical to the
// contiguous inline block they were moved from: same signatures, same bodies,
// same comments, same physical order.
//
// Loaded as a CLASSIC script AFTER js/services/backend-scanner-snapshot-service.js
// and BEFORE js/adapters/backend-directional-adapter.js,
// js/ui/backend-directional-preview.js and the inline monolith. That position is
// deliberate: it makes the three shared formatters (bssNum, bssFmtAgeMs,
// bssFmtClock) exist before the preview script is parsed, so the preview's
// `typeof` guards can never degrade silently to their fallbacks.
//
// Contains ONLY the thirty-two function declarations and their associated
// comments — no top-level execution, no state, no bootstrap, no requests, no
// subscriptions, no timers, and no DOM or localStorage access at load time.
//
// Ownership: the formatters, the candidate derivation, the diagnostic readers,
// the HTML builders, the head badges, the collapse pair, bssRender and bssInit.
// The feature flag, the S.backendScanner accessor, the parsers, the freshness
// helper, the three GET readers, the manual refresh and the polling lifecycle
// stay in the service. The panel markup, the bss-* CSS, the static onclick
// handlers and the single `bssInit();` call site inside the #launchBtn handler
// stay in index.html.
//
// Runtime dependencies (ffBackendScannerSnapshot, bssState, bssFreshness,
// bssIsNoSnapshot, bssStartPolling, escHtml, bdspRender, dsbGetBackendSource,
// rsbGetBackendSource, WL, document, localStorage, Date, Math, Number, String,
// isFinite, Array, Object, JSON) remain global and are resolved LATE, at call
// time — never captured in module-level bindings and never read while this file
// loads.
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// BACKEND SCANNER SNAPSHOT — diagnostic-preview visibility panel
// ───────────────────────────────────────────────────────────────
// Read-only integration of the backend scheduled scanner. Consumes
//   GET /scanner/status   and   GET /scanner/snapshot
// and renders them ALONGSIDE the existing frontend scanners (Directional,
// RS vs SPY, Squeeze Fire) without replacing or mutating any of them.
//
// The backend scanner is still DIAGNOSTIC-ONLY: candidate.direction and
// candidate.score are null. scoreDiagnostics.scorePreview / scoreBucket /
// rankEligible are previews, NOT operational trade signals — the UI labels
// them as such. This panel NEVER calls POST /scanner/run and never opens new
// market-data (DXLink) subscriptions. It polls lightly (60 s) while the
// Dashboard is open and stops when the user leaves.
// ═══════════════════════════════════════════════════════════════

// ── safe formatting helpers (pure) ──────────────────────────────
function bssNum(v, digits) {
  if (v == null) return '—';
  if (typeof v === 'string' && v.trim() === '') return '—';
  var n = (typeof v === 'number') ? v : Number(v);
  if (!isFinite(n)) return '—';
  if (digits == null) return String(Math.round(n * 100) / 100);
  return n.toFixed(digits);
}
function bssInt(v) {
  if (v == null) return '—';
  var n = (typeof v === 'number') ? v : Number(v);
  if (!isFinite(n)) return '—';
  return String(Math.round(n));
}
function bssCount(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (Array.isArray(v)) return v.length;
  return null;
}
function bssCountStr(v) { var c = bssCount(v); return c == null ? '—' : String(c); }
function bssList(v, max) {
  if (!Array.isArray(v) || !v.length) return null;
  var lim = max || 8;
  var head = v.slice(0, lim).map(function(x) {
    if (x == null) return '?';
    if (typeof x === 'object') return String(x.symbol || x.sym || x.s || '?');
    return String(x);
  });
  var extra = v.length - lim;
  return head.join(', ') + (extra > 0 ? (' +' + extra) : '');
}
function bssBoolYN(v) {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '—';
}
function bssFmtAgeMs(ms) {
  if (ms == null || !isFinite(ms) || ms < 0) return '—';
  var s = Math.floor(ms / 1000);
  if (s < 60) return s + 's';
  var m = Math.floor(s / 60), rs = s % 60;
  if (m < 60) return m + 'm ' + (rs < 10 ? '0' : '') + rs + 's';
  var h = Math.floor(m / 60), rm = m % 60;
  return h + 'h ' + (rm < 10 ? '0' : '') + rm + 'm';
}
function bssFmtClock(iso) {
  if (iso == null || iso === '') return '—';
  var t = (typeof iso === 'number') ? iso : Date.parse(iso);
  if (!isFinite(t)) return '—';
  try {
    var d = new Date(t);
    var p = function(n) { return (n < 10 ? '0' : '') + n; };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  } catch (e) { return '—'; }
}

// ── candidate derivation: sorted COPY, never mutate the source array ──
function bssScorePreviewOf(cand) {
  if (!cand) return null;
  var sd = cand.scoreDiagnostics;
  if (sd && typeof sd === 'object' && typeof sd.scorePreview === 'number' && isFinite(sd.scorePreview)) return sd.scorePreview;
  if (typeof cand.scorePreview === 'number' && isFinite(cand.scorePreview)) return cand.scorePreview;
  return null;
}
function bssDeriveCandidateRows(snap) {
  var cands = (snap && Array.isArray(snap.candidates)) ? snap.candidates : [];
  // Build an indexed COPY — the raw snapshot array and its candidate objects are
  // never reordered or mutated. Sort the copy by scorePreview DESC; ties / missing
  // previews fall back to the original snapshot order (stable).
  var indexed = cands.map(function(c, i) { return { c: c, i: i, sp: bssScorePreviewOf(c) }; });
  var anySp = indexed.some(function(x) { return x.sp != null; });
  if (anySp) {
    indexed.sort(function(a, b) {
      var av = (a.sp == null) ? -Infinity : a.sp;
      var bv = (b.sp == null) ? -Infinity : b.sp;
      if (bv !== av) return bv - av;
      return a.i - b.i;
    });
  }
  return indexed.map(function(x) { return x.c; });
}

// ── per-field badge / label helpers (pure) ──────────────────────
function bssSD(cand) { return (cand && cand.scoreDiagnostics && typeof cand.scoreDiagnostics === 'object') ? cand.scoreDiagnostics : {}; }
function bssBucketInfo(bucket) {
  if (bucket == null || bucket === '') return { label: '—', cls: 'bss-b-muted' };
  var b = String(bucket).trim().toUpperCase();
  var map = { A: 'bss-b-ok', B: 'bss-b-info', C: 'bss-b-warn', D: 'bss-b-muted' };
  return { label: b, cls: map[b] || 'bss-b-pu' };
}
function bssParityInfo(parity) {
  if (parity == null) return { label: 'n/c', cls: 'bss-b-muted', state: 'na' };
  if (typeof parity === 'string') {
    var s = parity.trim().toLowerCase();
    if (s === 'match' || s === 'matched' || s === 'true') return { label: 'match', cls: 'bss-b-ok', state: 'match' };
    if (s === 'mismatch' || s === 'mismatched' || s === 'false') return { label: 'mismatch', cls: 'bss-b-err', state: 'mismatch' };
    if (s === '' || s === 'na' || s === 'n/c' || s === 'not_comparable' || s === 'notcomparable') return { label: 'n/c', cls: 'bss-b-muted', state: 'na' };
    return { label: s, cls: 'bss-b-muted', state: 'other' };
  }
  if (typeof parity === 'object') {
    var comparable = (parity.comparable !== undefined) ? parity.comparable : (parity.isComparable !== undefined ? parity.isComparable : undefined);
    if (comparable === false) return { label: 'n/c', cls: 'bss-b-muted', state: 'na' };
    var m = (parity.match !== undefined) ? parity.match : (parity.matches !== undefined ? parity.matches : (parity.isMatch !== undefined ? parity.isMatch : undefined));
    if (m === true) return { label: 'match', cls: 'bss-b-ok', state: 'match' };
    if (m === false) return { label: 'mismatch', cls: 'bss-b-err', state: 'mismatch' };
    var st = parity.status || parity.result || parity.parity;
    if (st) return bssParityInfo(String(st));
  }
  return { label: 'n/c', cls: 'bss-b-muted', state: 'na' };
}
function bssTechComplete(tc) {
  if (tc == null) return null;
  if (typeof tc === 'boolean') return tc;
  if (typeof tc === 'object') {
    var keys = ['complete', 'coreComplete', 'completeCoreTechnicals', 'hasCompleteCoreTechnicals', 'isComplete', 'core'];
    for (var i = 0; i < keys.length; i++) { if (typeof tc[keys[i]] === 'boolean') return tc[keys[i]]; }
  }
  return null;
}
function bssTechCompleteInfo(tc) {
  var v = bssTechComplete(tc);
  if (v === true) return { label: 'yes', cls: 'bss-b-ok', complete: true };
  if (v === false) return { label: 'no', cls: 'bss-b-warn', complete: false };
  return { label: '—', cls: 'bss-b-muted', complete: null };
}
function bssFmtRs(v) {
  if (v == null) return '—';
  if (typeof v === 'number') return isFinite(v) ? bssNum(v, 2) : '—';
  if (typeof v === 'object') {
    var keys = ['value', 'ratio', 'rs', 'vsSpy', 'relativeStrength', 'percent', 'pct'];
    for (var i = 0; i < keys.length; i++) { if (typeof v[keys[i]] === 'number' && isFinite(v[keys[i]])) return bssNum(v[keys[i]], 2); }
    if (typeof v.strong === 'boolean') return v.strong ? 'strong' : 'weak';
    if (v.label) return String(v.label);
    return '—';
  }
  if (typeof v === 'string') return v;
  return '—';
}
function bssDirDiagInfo(cand) {
  var dd = cand && cand.directionDiagnostics;
  if (!dd || typeof dd !== 'object') return { dir: null, confidence: null };
  var dir = (dd.candidateDirection !== undefined) ? dd.candidateDirection : (dd.direction !== undefined ? dd.direction : null);
  var conf = (dd.confidence !== undefined) ? dd.confidence : (dd.score !== undefined ? dd.score : null);
  return { dir: dir, confidence: conf };
}
function bssDirBadge(dir) {
  if (dir == null || dir === '') return { label: '—', cls: 'bss-b-muted' };
  var d = String(dir).trim().toUpperCase();
  if (d === 'LONG' || d === 'BULL' || d === 'BULLISH' || d === 'UP') return { label: d, cls: 'bss-b-ok' };
  if (d === 'SHORT' || d === 'BEAR' || d === 'BEARISH' || d === 'DOWN') return { label: d, cls: 'bss-b-err' };
  if (d === 'NEUTRAL' || d === 'FLAT' || d === 'NONE') return { label: d, cls: 'bss-b-muted' };
  return { label: d, cls: 'bss-b-info' };
}
// Operational fields (candidate.direction / candidate.score) are expected to be
// null while the backend remains diagnostic-only — render them as inactive.
function bssOperational(v) {
  if (v == null) return { label: 'null', cls: 'bss-b-muted', active: false };
  return { label: String(v), cls: 'bss-b-pu', active: true };
}
function bssRankEligBadge(v) {
  if (v === true) return bssBadge('elig', 'bss-b-ok');
  if (v === false) return bssBadge('no', 'bss-b-muted');
  return bssBadge('—', 'bss-b-muted');
}

// ── small HTML builders (pure string; escHtml-safe) ─────────────
function bssBadge(label, cls) { return '<span class="bss-b ' + cls + '">' + escHtml(label) + '</span>'; }
function bssKV(k, vHtml) { return '<div class="bss-kv"><div class="bss-k">' + escHtml(k) + '</div><div class="bss-v">' + vHtml + '</div></div>'; }
function bssKVt(k, text) { return bssKV(k, escHtml(text == null ? '—' : String(text))); }
function bssTopSymbolsHtml(sd) {
  var ts = sd && sd.topSymbols;
  if (!Array.isArray(ts) || !ts.length) return '<span class="bss-empty">—</span>';
  return '<div class="bss-chips">' + ts.slice(0, 12).map(function(x) {
    if (x == null) return '';
    if (typeof x === 'string') return bssBadge(x, 'bss-b-pu');
    var sym = x.symbol || x.sym || x.s || '?';
    var sp = (typeof x.scorePreview === 'number') ? (' ' + bssNum(x.scorePreview, 0)) : '';
    var bk = x.scoreBucket ? (' ' + String(x.scoreBucket)) : '';
    return bssBadge(String(sym) + sp + bk, 'bss-b-pu');
  }).join('') + '</div>';
}
function bssCandidateTableHtml(rows) {
  var cols = ['Symbol', 'Price', 'RSI14', 'RS vs SPY', 'Backend dir', 'Conf', 'Parity', 'Score prev', 'Bucket', 'Rank elig', 'Cache', 'Tech core', 'Op dir', 'Op score'];
  var head = '<tr>' + cols.map(function(t) { return '<th>' + escHtml(t) + '</th>'; }).join('') + '</tr>';
  var body = rows.map(function(cand) {
    var dd = bssDirDiagInfo(cand);
    var dirB = bssDirBadge(dd.dir);
    var par = bssParityInfo(cand && cand.directionParity);
    var sd = bssSD(cand);
    var sp = bssScorePreviewOf(cand);
    var bk = bssBucketInfo(sd.scoreBucket);
    var cache = (cand && cand.cache && typeof cand.cache === 'object') ? cand.cache : {};
    var candleCount = (cache.candleCount != null) ? cache.candleCount : (cache.count != null ? cache.count : null);
    var tech = bssTechCompleteInfo(cand && cand.technicalCoverage);
    var opDir = bssOperational(cand ? cand.direction : null);
    var opScore = bssOperational(cand ? cand.score : null);
    var rsv = (cand && cand.relativeStrengthVsSpy != null) ? cand.relativeStrengthVsSpy : (cand ? cand.relativeStrength : null);
    var cacheTxt = (candleCount == null ? '—' : escHtml(String(candleCount)))
      + (cache.source ? (' · ' + escHtml(String(cache.source))) : '')
      + (cache.reason ? (' · ' + escHtml(String(cache.reason))) : '');
    return '<tr>'
      + '<td><strong>' + escHtml(String((cand && cand.symbol) || '—')) + '</strong></td>'
      + '<td>' + escHtml(bssNum(cand && cand.price, 2)) + '</td>'
      + '<td>' + escHtml(bssNum(cand && cand.rsi14, 1)) + '</td>'
      + '<td>' + escHtml(bssFmtRs(rsv)) + '</td>'
      + '<td>' + bssBadge(dirB.label, dirB.cls) + '</td>'
      + '<td>' + escHtml(dd.confidence != null ? bssNum(dd.confidence, 2) : '—') + '</td>'
      + '<td>' + bssBadge(par.label, par.cls) + '</td>'
      + '<td>' + escHtml(sp != null ? bssNum(sp, 0) : '—') + '</td>'
      + '<td>' + bssBadge(bk.label, bk.cls) + '</td>'
      + '<td>' + bssRankEligBadge(sd.rankEligible) + '</td>'
      + '<td style="text-align:left">' + cacheTxt + '</td>'
      + '<td>' + bssBadge(tech.label, tech.cls) + '</td>'
      + '<td>' + bssBadge(opDir.label, opDir.cls) + '</td>'
      + '<td>' + bssBadge(opScore.label, opScore.cls) + '</td>'
      + '</tr>';
  }).join('');
  return '<div class="bss-tbl-wrap"><table class="bss-tbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>';
}

// ── Universe diagnostics (UI/diagnostic ONLY) ───────────────────────────────
// Read-only comparison of the four independently-maintained universes. Reads
// already-cached state (rsbGetBackendSource / dsbGetBackendSource are pure parsers,
// no fetch). Never changes scanner universes, ETFs, rules, or backend behavior.
function bssUniverseDiagHtml(status, snap) {
  var g = [];
  var wl = (typeof WL !== 'undefined' && WL && WL.length != null) ? WL.length : null;
  g.push(bssKVt('Frontend WL universe', wl != null ? (wl + ' symbols (Directional + Squeeze)') : 'unavailable'));

  var uc = (status && status.universeCount != null) ? status.universeCount : null;
  g.push(bssKVt('Backend scanner universeCount', uc != null ? (uc + '  · /scanner/status') : 'backend-defined — unavailable (not cached)'));

  var snapUni = (snap && Array.isArray(snap.universe)) ? snap.universe.length
              : (snap && typeof snap.universe === 'number') ? snap.universe : null;
  g.push(bssKVt('Backend snapshot universe', snapUni != null ? (snapUni + '  · /scanner/snapshot') : 'backend-defined — unavailable (not cached)'));

  var rs = (typeof rsbGetBackendSource === 'function') ? rsbGetBackendSource() : null;
  if (rs && rs.available) {
    g.push(bssKVt('RS snapshot universe', (rs.universe != null ? rs.universe : '—')
      + '  · candidates ' + (rs.rows ? rs.rows.length : 0)
      + ' · skipped ' + (rs.skipped ? rs.skipped.length : 0) + '  · /scanner/rs/snapshot'));
  } else {
    g.push(bssKVt('RS snapshot universe', 'backend-defined — unavailable' + (rs && rs.reason ? (' (' + rs.reason + ')') : ' (open RS tab to populate)')));
  }

  var ds = (typeof dsbGetBackendSource === 'function') ? dsbGetBackendSource() : null;
  if (ds && ds.available) {
    g.push(bssKVt('Directional snapshot', 'rows ' + (ds.rows ? ds.rows.length : 0)
      + ' · skipped ' + (ds.skipped ? ds.skipped.length : 0) + '  · /scanner/directional/snapshot'));
  } else {
    g.push(bssKVt('Directional snapshot', 'backend-defined — unavailable' + (ds && ds.reason ? (' (' + ds.reason + ')') : ' (not cached)')));
  }

  if (wl != null && uc != null && wl !== uc) {
    g.push(bssKV('Mismatch', bssBadge('WL ' + wl + ' ≠ backend ' + uc, 'bss-b-warn')));
  }

  return '<div class="bss-sub">Universe diagnostics <span style="color:var(--tx3);text-transform:none;letter-spacing:0">— UI only · read-only · no scanner/backend change</span></div>'
    + '<div class="bss-grid">' + g.join('') + '</div>'
    + '<div style="font-size:8px;color:var(--tx3);margin-top:4px">"backend-defined — unavailable" = value lives on the backend and is not currently cached in the UI (open the matching tab to populate). WL is the frontend watchlist iterated by Directional + Squeeze; the backend scanner / RS / directional snapshots and the candle store maintain their own universes.</div>';
}

// ── full body HTML from current state (guards every block) ──────
function bssBodyHtml() {
  var st = bssState();
  var status = st.status, snap = st.snapshot;
  var H = [];

  if (st.statusError) H.push('<div class="bss-err-box">GET /scanner/status failed: ' + escHtml(st.statusError) + '</div>');
  if (st.snapshotError) H.push('<div class="bss-err-box">GET /scanner/snapshot failed: ' + escHtml(st.snapshotError) + '</div>');

  if ((!status || status._empty) && (!snap || snap._empty) && !st.statusError && !st.snapshotError) {
    H.push('<div class="bss-empty">Loading backend scanner status…</div>');
    return H.join('');
  }

  // 1) Status header
  H.push('<div class="bss-sub" style="border-top:none;padding-top:0">Scheduler / status</div>');
  if (status && !status._empty) {
    var fr = bssFreshness(snap);
    var sg = [];
    sg.push(bssKV('Scheduler', bssBadge(status.schedulerEnabled === true ? 'ON' : status.schedulerEnabled === false ? 'OFF' : '—', status.schedulerEnabled === true ? 'bss-b-ok' : status.schedulerEnabled === false ? 'bss-b-off' : 'bss-b-muted')));
    sg.push(bssKV('Scheduler running', bssBadge(bssBoolYN(status.schedulerRunning), status.schedulerRunning === true ? 'bss-b-ok' : 'bss-b-muted')));
    sg.push(bssKV('Timer', bssBadge(status.timerActive === true ? 'active' : status.timerActive === false ? 'inactive' : '—', status.timerActive === true ? 'bss-b-ok' : 'bss-b-off')));
    sg.push(bssKV('Running', bssBadge(bssBoolYN(status.running), status.running === true ? 'bss-b-info' : 'bss-b-muted')));
    sg.push(bssKVt('Last updated', bssFmtClock(status.lastSnapshotUpdatedAt != null ? status.lastSnapshotUpdatedAt : (snap && snap.updatedAt))));
    sg.push(bssKV('Age', escHtml(bssFmtAgeMs(snap && snap.ageMs)) + ' ' + bssBadge(fr.label, fr.cls)));
    sg.push(bssKVt('Next run', bssFmtClock(status.nextScheduledRunAt != null ? status.nextScheduledRunAt : (snap && snap.nextScheduledRunAt))));
    sg.push(bssKVt('Last sched run', bssFmtClock(status.lastScheduledRunAt)));
    sg.push(bssKVt('Run count', bssInt(status.runCount)));
    sg.push(bssKV('Error count', bssBadge(bssInt(status.errorCount), (typeof status.errorCount === 'number' && status.errorCount > 0) ? 'bss-b-warn' : 'bss-b-muted')));
    sg.push(bssKVt('Last duration', status.lastDurationMs != null ? (bssInt(status.lastDurationMs) + ' ms') : '—'));
    H.push('<div class="bss-grid">' + sg.join('') + '</div>');
    if (status.lastError) H.push('<div class="bss-err-box">Last error: ' + escHtml(String(status.lastError)) + '</div>');
    if (status.lastSchedulerError) H.push('<div class="bss-err-box">Scheduler error: ' + escHtml(String(status.lastSchedulerError)) + '</div>');
    if (status.lastSchedulerSkipReason) H.push('<div class="bss-grid">' + bssKVt('Last scheduler skip reason', String(status.lastSchedulerSkipReason)) + '</div>');
  } else {
    H.push('<div class="bss-empty">Scheduler status unavailable.</div>');
  }

  // 2) Snapshot health
  H.push('<div class="bss-sub">Snapshot health</div>');
  if (bssIsNoSnapshot(snap)) {
    H.push('<div class="bss-err-box">No backend snapshot yet'
      + (snap && snap.reason ? (' (' + escHtml(String(snap.reason)) + ')') : '')
      + '. ' + (status && status.schedulerEnabled === true ? 'Scheduler is ON — a snapshot should appear shortly.' : 'See scheduler status above.') + '</div>');
  } else if (snap && snap.ok === true) {
    var d = snap.diagnostics || {};
    var fr2 = bssFreshness(snap);
    var uniCount = (status && status.universeCount != null) ? status.universeCount : bssCount(snap.universe);
    var uniSrc = (status && status.universeSource != null) ? status.universeSource : null;
    var hg = [];
    hg.push(bssKV('Snapshot', bssBadge('ok', 'bss-b-ok')));
    hg.push(bssKVt('Market session', snap.marketSession));
    hg.push(bssKVt('Universe', (uniCount == null ? '—' : uniCount) + (uniSrc ? (' · ' + uniSrc) : '')));
    hg.push(bssKV('Freshness', bssBadge(fr2.label, fr2.cls) + ' <span style="color:var(--tx3)">' + escHtml(bssFmtAgeMs(snap.ageMs)) + '</span>'));
    H.push('<div class="bss-grid">' + hg.join('') + '</div>');

    var w = (d.warmup && typeof d.warmup === 'object') ? d.warmup : null;
    if (w) {
      var wg = [];
      wg.push(bssKV('Warmup', bssBadge(w.enabled === true ? 'enabled' : w.enabled === false ? 'disabled' : '—', w.enabled === true ? 'bss-b-ok' : 'bss-b-off')));
      wg.push(bssKVt('Symbols warmed', bssCountStr(w.symbolsWarmed)));
      wg.push(bssKVt('Still cold', bssCountStr(w.symbolsStillCold)));
      wg.push(bssKVt('Warm attempts', w.warmAttempts != null ? bssInt(w.warmAttempts) : '—'));
      if (w.reason != null && w.reason !== '') wg.push(bssKVt('Warmup reason', String(w.reason)));
      H.push('<div class="bss-grid">' + wg.join('') + '</div>');
    }

    var c = (d.cache && typeof d.cache === 'object') ? d.cache : null;
    if (c) {
      var cg = [];
      cg.push(bssKVt('With candles', bssCountStr(c.symbolsWithCandles)));
      cg.push(bssKVt('Without candles', bssCountStr(c.symbolsWithoutCandles)));
      var coldN = bssCount(c.coldSymbols), coldL = bssList(c.coldSymbols, 10);
      cg.push(bssKVt('Cold symbols', (coldN == null ? '—' : coldN) + (coldL ? (' · ' + coldL) : '')));
      var staleN = bssCount(c.staleSymbols), staleL = bssList(c.staleSymbols, 10);
      cg.push(bssKVt('Stale symbols', (staleN == null ? '—' : staleN) + (staleL ? (' · ' + staleL) : '')));
      H.push('<div class="bss-grid">' + cg.join('') + '</div>');
    }

    var tc = (d.technicalCoverage && typeof d.technicalCoverage === 'object') ? d.technicalCoverage : null;
    if (tc) {
      H.push('<div class="bss-grid">'
        + bssKVt('Complete core technicals', bssInt(tc.candidatesWithCompleteCoreTechnicals))
        + bssKVt('Candidates total', bssInt(tc.candidatesTotal))
        + '</div>');
    }

    var dp = (d.directionParity && typeof d.directionParity === 'object') ? d.directionParity : null;
    if (dp) {
      var mr = dp.matchRate;
      var mrTxt = (typeof mr === 'number' && isFinite(mr)) ? ((mr <= 1 ? (mr * 100) : mr).toFixed(0) + '%') : '—';
      var mrCls = (typeof mr === 'number') ? ((mr >= 0.999 || mr >= 99) ? 'bss-b-ok' : (mr >= 0.5 || mr >= 50) ? 'bss-b-warn' : 'bss-b-err') : 'bss-b-muted';
      H.push('<div class="bss-grid">'
        + bssKVt('Comparable', bssInt(dp.candidatesComparable))
        + bssKVt('Matches', bssInt(dp.matches))
        + bssKVt('Mismatches', bssInt(dp.mismatches))
        + bssKV('Match rate', bssBadge(mrTxt, mrCls))
        + '</div>');
    }

    var sd2 = (d.scoreDiagnostics && typeof d.scoreDiagnostics === 'object') ? d.scoreDiagnostics : null;
    if (sd2) {
      H.push('<div class="bss-grid">'
        + bssKVt('Candidates usable', bssInt(sd2.candidatesUsable))
        + bssKVt('Rank-eligible', bssInt(sd2.rankEligibleCount))
        + bssKVt('Avg score preview', bssNum(sd2.averageScorePreview, 1))
        + bssKVt('Max score preview', bssNum(sd2.maxScorePreview, 1))
        + '</div>');
      H.push('<div class="bss-kv" style="margin-bottom:9px"><div class="bss-k">Top symbols (diagnostic preview)</div><div class="bss-v">' + bssTopSymbolsHtml(sd2) + '</div></div>');
    }
  } else if (st.snapshotError) {
    H.push('<div class="bss-empty">Snapshot unavailable.</div>');
  } else {
    H.push('<div class="bss-empty">Waiting for snapshot…</div>');
  }

  // 2.5) Universe diagnostics (UI only) — WL vs backend universes, read-only
  H.push(bssUniverseDiagHtml(status, snap));

  // 3) Candidate table (derived copy, sorted by scorePreview desc)
  if (snap && snap.ok === true) {
    H.push('<div class="bss-sub">Candidates <span style="color:var(--tx3);text-transform:none;letter-spacing:0">— diagnostic preview · operational direction/score inactive</span></div>');
    var rows = bssDeriveCandidateRows(snap);
    if (!rows.length) H.push('<div class="bss-empty">No candidates in snapshot.</div>');
    else H.push(bssCandidateTableHtml(rows));
  }

  return H.join('');
}

function bssRenderHeadBadges() {
  var el = document.getElementById('bss-head-badges');
  if (!el) return;
  var st = bssState();
  var status = st.status, snap = st.snapshot;
  var out = [];
  if (status && !status._empty) {
    out.push(bssBadge(status.schedulerEnabled === true ? 'SCHED ON' : status.schedulerEnabled === false ? 'SCHED OFF' : 'SCHED ?',
      status.schedulerEnabled === true ? 'bss-b-ok' : status.schedulerEnabled === false ? 'bss-b-off' : 'bss-b-muted'));
  } else if (st.statusError) {
    out.push(bssBadge('STATUS ERR', 'bss-b-err'));
  }
  if (snap && snap.ok === true) {
    var f = bssFreshness(snap);
    out.push(bssBadge(f.label, f.cls));
    if (snap.ageMs != null) out.push(bssBadge('age ' + bssFmtAgeMs(snap.ageMs), 'bss-b-muted'));
    if (Array.isArray(snap.candidates)) out.push(bssBadge(snap.candidates.length + ' cand', 'bss-b-muted'));
  } else if (bssIsNoSnapshot(snap)) {
    out.push(bssBadge('NO SNAPSHOT', 'bss-b-warn'));
  } else if (st.snapshotError) {
    out.push(bssBadge('SNAP ERR', 'bss-b-err'));
  }
  el.innerHTML = out.join('');
}

function bssApplyCollapse() {
  var st = bssState();
  var panel = document.getElementById('bss-panel');
  var body = document.getElementById('bss-body');
  if (panel) panel.classList.toggle('bss-open', !st.collapsed);
  if (body) body.style.display = st.collapsed ? 'none' : 'block';
}
function bssToggleCollapse() {
  var st = bssState();
  st.collapsed = !st.collapsed;
  try { localStorage.setItem('apex_bss_collapsed', st.collapsed ? '1' : '0'); } catch (e) {}
  bssApplyCollapse();
  if (!st.collapsed) bssRender();
}
function bssRender() {
  if (!ffBackendScannerSnapshot()) return;
  var panel = document.getElementById('bss-panel');
  if (!panel) return;
  bssRenderHeadBadges();
  var st = bssState();
  var body = document.getElementById('bss-body');
  if (body && !st.collapsed) {
    var prevTop = body.scrollTop;
    body.innerHTML = bssBodyHtml();
    try { body.scrollTop = prevTop; } catch (e) {}
  }
  if (typeof bdspRender === 'function') bdspRender();
}

function bssInit() {
  var panel = document.getElementById('bss-panel');
  if (!panel) return;
  if (!ffBackendScannerSnapshot()) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  var st = bssState();
  try {
    var c = localStorage.getItem('apex_bss_collapsed');
    if (c === '0') st.collapsed = false; else if (c === '1') st.collapsed = true;
  } catch (e) {}
  bssApplyCollapse();
  bssRender();
  bssStartPolling();
}
