// ─────────────────────────────────────────────────────────────────────────────
// BACKEND SCANNER SNAPSHOT SERVICE — extracted from index.html (relocation only), plus the
// shared single-flight join documented at the three GET readers below: concurrent callers of
// bssFetchStatus / bssFetchSnapshot / bssFetchCoverage now AWAIT the one request already in
// flight instead of being dropped with an immediate `undefined`. One request, one commit, one
// render per operation — unchanged; what changed is that later callers are no longer
// discarded before the data they asked for exists.
//
// Loaded as a CLASSIC script AFTER js/api/backend-client.js and
// js/config/backend-config.js and BEFORE
// js/ui/backend-scanner-snapshot-panel.js,
// js/adapters/backend-directional-adapter.js,
// js/ui/backend-directional-preview.js and the inline monolith. Contains ONLY
// the twelve function declarations below and their associated comments — no
// top-level execution, no state initialisation, no requests, no timers, no DOM
// or localStorage access at load time.
//
// Ownership: the feature flag, the S.backendScanner state accessor, the pure
// parsers/freshness helpers, the three GET readers, the manual refresh and the
// polling lifecycle. The thirty-two BSS renderer/formatter/badge/HTML-builder
// declarations live in js/ui/backend-scanner-snapshot-panel.js; the pure bds*
// Directional adapter lives in js/adapters/backend-directional-adapter.js; the
// bdsp* Directional preview lives in js/ui/backend-directional-preview.js. The
// single bssInit() call site, the bss-* panel markup and CSS, the static
// handlers and the remaining DSB/Swing consumers and other not-yet-extracted
// integrations stay in the inline monolith.
//
// Runtime dependencies (BACKEND, _backendAuthHeaders, S, _activeView, bssRender,
// _swingIsAbortError, document, localStorage, fetch, AbortSignal, Date.now,
// setInterval, clearInterval, setTimeout) remain global and are resolved LATE, at
// call time — never captured in module-level variables and never read while this
// file loads. bssRender in particular is still declared later, in
// js/ui/backend-scanner-snapshot-panel.js.
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
      // SHARED SINGLE-FLIGHT COMPLETION, one field per endpoint. The reader that starts the
      // ONE real request stores its completion Promise here; every concurrent caller JOINS
      // that Promise instead of being dropped, so a second consumer (Swing hydration, manual
      // refresh) can never resume before the request it is waiting on has actually finished.
      // Cleared back to null in the same finally that clears fetching*, on success AND on
      // every failure (abort, timeout, HTTP error, network/JSON reject, renderer throw), so a
      // reader can never latch permanently. State lives ONLY here, on S.backendScanner.
      statusPromise: null, snapshotPromise: null, coveragePromise: null,
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
//
// SINGLE-FLIGHT JOIN (all three readers below share this shape):
//   • the FIRST caller creates the completion Promise, stores it on the state field for its
//     endpoint, sets fetching*, issues the ONE request, commits, renders ONCE, then clears
//     both the flag and the Promise field;
//   • a CONCURRENT caller issues no request, mutates no state and renders nothing — it
//     returns the stored completion and therefore finishes exactly when the real request
//     finishes, with the committed snapshot already in S.backendScanner.
// This is a JOIN, not the previous first-started-wins/latest-started-loses drop: the first
// request is still the only request, but later callers are no longer discarded empty-handed.
// Nothing is cancelled here — there is no AbortController and no .abort(); the per-request
// AbortSignal.timeout budgets are untouched.
//
// Return value is unchanged: success and handled errors still resolve with `undefined` —
// only the COMPLETION is shared, never the payload/state/response.
async function bssFetchStatus() {
  var st = bssState();
  if (st.statusPromise) return st.statusPromise;   // concurrent caller → join, do not drop
  st.fetchingStatus = true;
  var settled = false;
  var p = (async function() {
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
      // Release BEFORE rendering: if bssRender() throws, every joined caller observes that
      // rejection, but the reader is already clean and the next call starts a fresh request.
      settled = true;
      st.fetchingStatus = false;
      st.statusPromise = null;
      bssRender();
    }
  })();
  // A fetch double / runtime that throws SYNCHRONOUSLY runs the finally above before this
  // assignment; storing an already-settled Promise would latch the reader permanently.
  if (!settled) st.statusPromise = p;
  return p;
}
async function bssFetchSnapshot() {
  var st = bssState();
  if (st.snapshotPromise) return st.snapshotPromise;   // concurrent caller → join, do not drop
  st.fetchingSnapshot = true;
  var settled = false;
  var p = (async function() {
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
      settled = true;
      st.fetchingSnapshot = false;
      st.snapshotPromise = null;
      bssRender();
    }
  })();
  if (!settled) st.snapshotPromise = p;
  return p;
}
// GET-only reader for the additive backend coverage endpoint (apex-backend #187:
// GET /scanner/coverage/status). Read-only; same auth headers as status/snapshot.
// Stores the parsed payload in S.backendScanner.coverage and degrades gracefully when
// the endpoint is missing (404 → remembered absent, no further fetches), errors, or the
// backend is not deployed yet — the panel then keeps "Candle coverage unavailable".
// The ONLY coverage change is the shared completion: the 18s timeout, the 404 latch,
// coverageEndpointAbsent, the st.coverage = null on failure/abort, the last-known-good cache
// on S.swing, the warnings and the _swingIsAbortError classification are all unchanged.
async function bssFetchCoverage() {
  var st = bssState();
  if (st.coveragePromise) return st.coveragePromise;   // concurrent caller → join, do not drop
  if (st.coverageEndpointAbsent) return;            // a prior 404 → endpoint not deployed; stop polling it
  st.fetchingCoverage = true;
  var settled = false;
  var p = (async function() {
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
      settled = true;
      st.fetchingCoverage = false;
      st.coveragePromise = null;
      bssRender();
    }
  })();
  if (!settled) st.coveragePromise = p;
  return p;
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
