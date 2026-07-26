// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SCANNER SNAPSHOT SERVICE — extracted verbatim from index.html
// (relocation only; no behaviour change).
//
// Loaded as a CLASSIC script AFTER js/api/backend-client.js and
// js/config/backend-config.js and BEFORE the inline monolith. Contains ONLY the
// twelve function declarations below and their associated comments — no
// top-level execution, no state initialisation, no requests, no timers, no DOM
// or localStorage access at load time.
//
// Ownership: the feature flag, the S.backendScanner state accessor, the pure
// parsers/freshness helpers, the three GET readers, the manual refresh and the
// polling lifecycle. Every renderer, formatter, badge and HTML builder (bssRender,
// bssRenderHeadBadges, bssInit, bssApplyCollapse, bssToggleCollapse, bssNum,
// bssCandidateTableHtml, …), the whole bds*/bdsp* Directional preview and the
// Swing hydration/rendering stay in index.html and are unchanged.
//
// Runtime dependencies (BACKEND, _backendAuthHeaders, S, _activeView, bssRender,
// _swingIsAbortError, document, localStorage, fetch, AbortSignal, Date.now,
// setInterval, clearInterval, setTimeout) remain global and are resolved LATE, at
// call time — never captured in module-level variables and never read while this
// file loads. bssRender in particular is still declared later, in the monolith.
// ─────────────────────────────────────────────────────────────────────────────

function ffBackendScannerSnapshot() {
  // Default: ON everywhere (this is the deliverable visibility panel).
  // Disable via: localStorage.setItem('apex_ff_backend_scanner_snapshot','0'); location.reload();
  // Re-enable via: localStorage.setItem('apex_ff_backend_scanner_snapshot','1'); location.reload();
  try {
    var v = localStorage.getItem('apex_ff_backend_scanner_snapshot');
    if (v === '1') return true;
    if (v === '0') return false;
  } catch (e) {}
  return true;
}

function bssState() {
  if (!S.backendScanner) {
    S.backendScanner = {
      status: null, snapshot: null, coverage: null,
      statusError: null, snapshotError: null, coverageError: null,
      lastStatusAt: null, lastSnapshotAt: null, lastCoverageAt: null,
      fetchingStatus: false, fetchingSnapshot: false, fetchingCoverage: false,
      coverageEndpointAbsent: false, // set after a 404 so we stop re-fetching a missing endpoint
      timerId: null, collapsed: true,
    };
  }
  return S.backendScanner;
}

// ── safe parsing of the two backend payloads (pure, never throw) ──
function bssParseStatus(raw) {
  if (!raw || typeof raw !== 'object') return { ok: false, _empty: true };
  var g = function(k) { return (raw[k] === undefined) ? null : raw[k]; };
  return {
    ok: raw.ok !== false, _empty: false,
    running: g('running'),
    schedulerEnabled: g('schedulerEnabled'),
    schedulerRunning: g('schedulerRunning'),
    timerActive: g('timerActive'),
    nextScheduledRunAt: g('nextScheduledRunAt'),
    lastScheduledRunAt: g('lastScheduledRunAt'),
    lastSchedulerAttemptAt: g('lastSchedulerAttemptAt'),
    lastSchedulerFinishedAt: g('lastSchedulerFinishedAt'),
    lastSchedulerDurationMs: g('lastSchedulerDurationMs'),
    lastSchedulerError: g('lastSchedulerError'),
    lastSchedulerSkipReason: g('lastSchedulerSkipReason'),
    lastStartedAt: g('lastStartedAt'),
    lastFinishedAt: g('lastFinishedAt'),
    lastDurationMs: g('lastDurationMs'),
    lastError: g('lastError'),
    lastSnapshotUpdatedAt: g('lastSnapshotUpdatedAt'),
    runCount: g('runCount'),
    errorCount: g('errorCount'),
    marketHoursIntervalMs: g('marketHoursIntervalMs'),
    offHoursIntervalMs: g('offHoursIntervalMs'),
    staleMs: g('staleMs'),
    universeCount: g('universeCount'),
    universeSource: g('universeSource'),
    // SOURCE OF TRUTH for "processed last run": /scanner/status exposes the list of symbols
    // actually scanned in the last cycle (often an ARRAY → its length is the count, e.g. 30).
    // These MUST survive parsing — dropping them forced the Swing coverage panel onto a stale
    // snapshot.diagnostics fallback (e.g. 1) even when status carried Array(30).
    processedSymbolsLastRun: g('processedSymbolsLastRun'),
    processedSymbols: g('processedSymbols'),
    lastRunProcessedCount: g('lastRunProcessedCount'),
    lastWindowSymbolsPreview: g('lastWindowSymbolsPreview'),
    currentWindowSymbols: g('currentWindowSymbols'),
    source: g('source'),
    warmupEnabled: g('warmupEnabled'),
    warmupMaxSymbols: g('warmupMaxSymbols'),
    warmupTimeframes: g('warmupTimeframes'),
    warmupWaitMs: g('warmupWaitMs'),
  };
}
function bssParseSnapshot(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, _empty: true, noSnapshot: false, reason: null, diagnostics: {}, candidates: [] };
  }
  var reason = (raw.reason != null) ? raw.reason : (raw.error != null ? raw.error : null);
  var ok = raw.ok === true;
  var noSnapshot = (ok === false) && /NO_SNAPSHOT/i.test(String(reason || ''));
  return {
    ok: ok, _empty: false, noSnapshot: noSnapshot, reason: reason,
    stale: (raw.stale === undefined ? null : raw.stale),
    staleMs: (raw.staleMs === undefined ? null : raw.staleMs),
    ageMs: (raw.ageMs === undefined ? null : raw.ageMs),
    updatedAt: (raw.updatedAt === undefined ? null : raw.updatedAt),
    nextScheduledRunAt: (raw.nextScheduledRunAt === undefined ? null : raw.nextScheduledRunAt),
    marketSession: (raw.marketSession === undefined ? null : raw.marketSession),
    universe: (raw.universe === undefined ? null : raw.universe),
    // Additive coverage fields (back-compat — undefined → null). Used by the Swing
    // Backend Coverage panel; never alters existing rendering.
    source: (raw.source === undefined ? (raw.engine === undefined ? null : raw.engine) : raw.source),
    currentWindowCandidates: (raw.currentWindowCandidates === undefined ? null : raw.currentWindowCandidates),
    currentWindowSymbols: (raw.currentWindowSymbols === undefined ? null : raw.currentWindowSymbols),
    processedSymbols: (raw.processedSymbols === undefined ? null : raw.processedSymbols),
    candidates: Array.isArray(raw.candidates) ? raw.candidates : [],
    diagnostics: (raw.diagnostics && typeof raw.diagnostics === 'object') ? raw.diagnostics : {},
  };
}
function bssIsNoSnapshot(snap) {
  if (!snap) return false;
  if (snap.noSnapshot === true) return true;
  return snap.ok === false && /NO_SNAPSHOT/i.test(String((snap && snap.reason) || ''));
}
function bssFreshness(snap) {
  if (!snap || snap._empty || snap.ok !== true) return { state: 'none', label: '—', cls: 'bss-b-muted' };
  if (snap.stale === true) return { state: 'stale', label: 'STALE', cls: 'bss-b-warn' };
  if (snap.stale === false) return { state: 'fresh', label: 'FRESH', cls: 'bss-b-ok' };
  if (typeof snap.ageMs === 'number' && typeof snap.staleMs === 'number') {
    return snap.ageMs > snap.staleMs
      ? { state: 'stale', label: 'STALE', cls: 'bss-b-warn' }
      : { state: 'fresh', label: 'FRESH', cls: 'bss-b-ok' };
  }
  return { state: 'unknown', label: '—', cls: 'bss-b-muted' };
}

// ── data fetching: GET-only, graceful errors, NEVER POST /scanner/run ──
async function bssFetchStatus() {
  var st = bssState();
  if (st.fetchingStatus) return;
  st.fetchingStatus = true;
  try {
    var r = await fetch(BACKEND + '/scanner/status', { headers: _backendAuthHeaders(), signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var data = await r.json();
    st.status = bssParseStatus(data);
    st.statusError = null;
    st.lastStatusAt = Date.now();
  } catch (e) {
    st.statusError = (e && e.message) ? e.message : String(e);
  } finally {
    st.fetchingStatus = false;
    bssRender();
  }
}
async function bssFetchSnapshot() {
  var st = bssState();
  if (st.fetchingSnapshot) return;
  st.fetchingSnapshot = true;
  try {
    // NO_SNAPSHOT comes back as HTTP 200 with ok:false — only transport/HTTP
    // failures throw; the ok:false body is parsed and surfaced gracefully.
    var r = await fetch(BACKEND + '/scanner/snapshot', { headers: _backendAuthHeaders(), signal: AbortSignal.timeout(9000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var data = await r.json();
    st.snapshot = bssParseSnapshot(data);
    st.snapshotError = null;
    st.lastSnapshotAt = Date.now();
  } catch (e) {
    st.snapshotError = (e && e.message) ? e.message : String(e);
  } finally {
    st.fetchingSnapshot = false;
    bssRender();
  }
}
// GET-only reader for the additive backend coverage endpoint (apex-backend #187:
// GET /scanner/coverage/status). Read-only; same auth headers as status/snapshot.
// Stores the parsed payload in S.backendScanner.coverage and degrades gracefully when
// the endpoint is missing (404 → remembered absent, no further fetches), errors, or the
// backend is not deployed yet — the panel then keeps "Candle coverage unavailable".
async function bssFetchCoverage() {
  var st = bssState();
  if (st.fetchingCoverage) return;
  if (st.coverageEndpointAbsent) return;            // a prior 404 → endpoint not deployed; stop polling it
  st.fetchingCoverage = true;
  try {
    // Tolerant timeout (18s, was 9s): /scanner/coverage/status aggregates full-universe
    // operational + candle coverage and can be slow on a cold/busy Railway backend. 9s was
    // too aggressive → spurious "The operation timed out" aborts that blanked the coverage
    // sections even though the data was about to arrive. Snapshot/status keep their own
    // (separate) timeouts; no shared controller, no polling, no retry added.
    var r = await fetch(BACKEND + '/scanner/coverage/status', { headers: _backendAuthHeaders(), signal: AbortSignal.timeout(18000) });
    if (r.status === 404) {                          // not deployed yet → remember + clean fallback
      st.coverageEndpointAbsent = true; st.coverage = null;
      st.coverageError = 'HTTP 404';
      try { console.warn('[SWING][COVERAGE] backend coverage unavailable (HTTP 404 — endpoint not deployed)'); } catch (e) {}
      return;
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    var data = await r.json();
    // Accept only a well-formed ok payload; anything else → unavailable fallback.
    st.coverage = (data && data.ok === true) ? data : null;
    st.coverageError = (data && data.ok === true) ? null : 'coverage_not_ok';
    st.lastCoverageAt = Date.now();
    // Last-known-good cache: remember the most recent VALID coverage so a later timeout/abort
    // can still show it (clearly marked stale) instead of blanking the operational/candle
    // sections. Read-only snapshot of the payload; never used to invent candidates.
    if (st.coverage && typeof S !== 'undefined' && S.swing) {
      S.swing.lastGoodCoverageStatus = st.coverage;
      S.swing.lastGoodCoverageStatusAt = st.lastCoverageAt;
    }
    if (!st.coverage) { try { console.warn('[SWING][COVERAGE] backend coverage unavailable (response not ok)'); } catch (e) {} }
  } catch (e) {
    st.coverage = null;
    st.coverageError = (e && e.message) ? e.message : String(e);
    // Distinguish a client-side timeout/abort from a hard failure so the panel can fall back
    // to last-known-good coverage and show a precise "coverage status request timed out" note.
    var _covAborted = (typeof _swingIsAbortError === 'function') && _swingIsAbortError(st.coverageError);
    try {
      console.warn('[SWING][COVERAGE] ' + (_covAborted
        ? ('coverage status request timed out (' + st.coverageError + ') — snapshot/status still used; last-known-good coverage shown if present')
        : ('backend coverage unavailable (' + st.coverageError + ')')));
    } catch (_) {}
  } finally {
    st.fetchingCoverage = false;
    bssRender();
  }
}
// Manual "Refresh snapshot" — re-fetches GET status + snapshot ONLY.
function bssRefresh() {
  var btn = document.getElementById('bss-refresh');
  if (btn) { btn.disabled = true; setTimeout(function() { var b = document.getElementById('bss-refresh'); if (b) b.disabled = false; }, 1500); }
  bssFetchStatus();
  bssFetchSnapshot();
}

function bssStartPolling() {
  if (!ffBackendScannerSnapshot()) return;
  if (typeof _activeView !== 'undefined' && _activeView !== 'dashboard') return;
  var st = bssState();
  if (!st.timerId) {                          // never stack duplicate timers
    st.timerId = setInterval(function() {
      if (typeof _activeView !== 'undefined' && _activeView !== 'dashboard') { bssStopPolling(); return; }
      bssFetchStatus();
      bssFetchSnapshot();
    }, 60000);
  }
  bssFetchStatus();                           // fetch once on mount / dashboard open
  bssFetchSnapshot();
}
function bssStopPolling() {
  var st = bssState();
  if (st.timerId) { clearInterval(st.timerId); st.timerId = null; }
}
