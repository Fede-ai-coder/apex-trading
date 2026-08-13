// ─────────────────────────────────────────────────────────────────────────────
// SFS (Squeeze Fire Scanner) — CONFIG + STATE
//
// PR 1 of the approved 3-PR SFS extraction (split D of audit #363: config/state ·
// scan service · UI panel). The 33 declarations below were relocated
// BYTE-FOR-BYTE out of the inline monolith in index.html. Names, binding form
// (`var`), values, initialisers and relative physical order are unchanged; only
// their location changed. No behaviour changed.
//
// WHAT THIS FILE OWNS
//   The complete SFS configuration and mutable state surface:
//     • 15 SFS_* tuning constants (batching, bar minimums, cooldowns, retry
//       budgets, debounce windows),
//     • the per-(symbol|timeframe) in-flight / cooldown / last-failure maps,
//     • the warmup queue, its dedupe key set and its last-send timestamp,
//     • the detail-4H phase / result / in-flight maps,
//     • the SPY read-only benchmark in-flight and cooldown maps,
//     • the table sort column/direction, the keyboard-nav candidate list,
//       focus and install flags,
//     • both SFS timer HANDLES (_sfsWarmupDrainTimer, _sfsResizeTimer).
//   Each of these bindings has exactly ONE declaration site, and it is here.
//
// WHAT THIS FILE DELIBERATELY DOES NOT OWN
//   Nothing that scans, orchestrates, formats or renders. The 29 remaining SFS
//   function declarations stay inline for PR 2 (scan service) and PR 3 (UI
//   panel). The three SFS load-time STATEMENTS also stay inline, because they
//   cannot run from here:
//     • `S.squeezeFireScanner = {…}` — `S` is a script-scoped `const` declared
//       inside the monolith itself, so it does not exist while this file runs;
//     • `window.apexDebugSfsDetailChart = …` — a load-time window assignment;
//     • `window.addEventListener('resize', …)` — a load-time listener.
//   The resize TIMER HANDLE moved here; the listener that assigns it did not.
//
// CLASSIC SCRIPT, ZERO LOAD-TIME EFFECTS
//   No import/export/require, no module type, no wrapper, no IIFE, no namespace,
//   no `use strict` pragma: these stay plain global `var` declarations, exactly
//   as they were inside index.html. Every initialiser is an inert literal
//   (number, string, boolean, `null`, `{}`, `[]`), so loading this file performs
//   no call, no DOM access, no timer, no listener, no fetch, no storage access,
//   no subscription and no window/globalThis assignment, and reads no global —
//   it has no free variables at all.
//
// LOAD ORDER
//   Loaded as a classic, non-deferred, non-async script BEFORE every SFS consumer
//   and BEFORE the inline monolith. It has no dependency of its own, so nothing
//   needs to precede it. Its consumers resolve these names GLOBALLY at CALL time:
//   js/services/sfs-candle-warmup.js, sfs-candle-generic-ensure.js,
//   sfs-candle-spy-read.js and sfs-candle-detail-4h.js, plus the SFS functions
//   still declared in the monolith.
//
// A NOTE ON THIS HEADER
//   It deliberately does not reproduce the banner text that marks the SFS region
//   inside index.html. Sibling suites locate that region by searching the
//   reconstructed application source for that banner, and this module is
//   concatenated BEFORE the monolith — so repeating the banner here, even inside
//   a comment, would capture this file as the start of the region.
// ─────────────────────────────────────────────────────────────────────────────
// ─── Scan tuning constants ────────────────────────────────────────────────────
var SFS_BATCH_SIZE           = 20;
var SFS_MAX_CONCURRENT_READS = 5;
var SFS_FIRE_LOOKBACK        = 5;
var SFS_RECENT_EXIT_BARS     = 3;
var SFS_MIN_BARS_1D          = 80;
var SFS_MIN_BARS_4H          = 60;

// ─── Generic per-timeframe fetch: in-flight, warmup cooldown, last failure ────
var _sfsTfFetchInflight = {};
var _sfsWarmupCooldown  = {};
var _sfsLastFailReason  = {};
var SFS_WARMUP_COOLDOWN_MS = 30000;

// ─── Detail-chart 4H: in-flight, phase, result, post-warm retry budget ───────
var _sfsDetail4hInflight = {};
var _sfsDetail4hPhase    = {};
var _sfsDetail4hResult   = {};
var SFS_DETAIL_4H_POST_WARM_ATTEMPTS = 3;
var SFS_DETAIL_4H_POST_WARM_DELAY_MS = 1200;

// ─── SPY read-only benchmark: in-flight, cooldowns, post-warm retry budget ───
var _sfsSpyReadInflight = {};
var _sfsSpyReadCooldown = {};
var SFS_SPY_READ_COOLDOWN_MS = 30000;
var SFS_SPY_WARM_COOLDOWN_MS = 120000;
var SFS_SPY_POST_WARM_READ_ATTEMPTS = 4;
var SFS_SPY_POST_WARM_RETRY_DELAY_MS = 900;

// ─── Warmup queue: caps, debounce, queue, dedupe keys, drain timer handle ────
var SFS_WARMUP_BATCH_CAP = 3;
var SFS_WARMUP_DEBOUNCE_MS = 10000;
var _sfsWarmupLastSentAt = 0;
var _sfsWarmupQueue = [];
var _sfsWarmupQueuedKeys = {};
var _sfsWarmupDrainTimer = null;

// ─── Results table sort state ────────────────────────────────────────────────
var _sfsSortCol = 'score';
var _sfsSortDir = 'desc';

// ─── Keyboard navigation state ───────────────────────────────────────────────
var _sfsCandidateList = [];
var _sfsFocused       = false;
var _sfsKbInstalled   = false;

// ─── Resize debounce timer handle ────────────────────────────────────────────
var _sfsResizeTimer = null;
