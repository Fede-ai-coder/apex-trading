# Backend-driven Directional Scanner — frontend/backend contract

The Directional Scanner UI (`index.html`, DSB module) is now a **consumer** of a
backend-computed directional snapshot. This file documents the exact contract the
frontend consumes, so the backend (`apex-backend`) can implement it without
guessing. The frontend ships first and degrades gracefully until the backend
endpoint exists.

## Frontend source cascade (already implemented)

1. **`GET /scanner/directional/snapshot`** — when it returns `ok:true`, the panel
   renders entirely from this payload. `S.scanData`, open charts and the Market
   Scanner UI are NOT consulted.
2. **Legacy `GET /scanner/snapshot`** (already deployed, polled by the Backend
   Scanner Snapshot panel) — used as fallback ONLY when its candidates carry an
   **operational** `direction` (`'bullish' | 'bearish'`, non-null). Today's
   diagnostic-only snapshot (`direction: null`) never activates this path, so
   promoting the legacy scanner to operational also lights up the backend-first
   Directional Scanner with no further frontend change.
3. **Frontend computation from `S.scanData`** — legacy path, unchanged rules,
   clearly labelled `SOURCE: frontend scan data` in the panel.

The frontend NEVER triggers a scan run (no POST of any kind from this module).
Snapshot generation is the backend scheduler's job; the UI offers a read-only
`↻ REFRESH` (re-GET) only.

## `GET /scanner/directional/snapshot` — expected payload

```jsonc
{
  "ok": true,                          // false + "reason" when no snapshot yet
  "generatedAt": "2026-06-11T14:30:00Z",
  "ageMs": 120000,                     // optional; frontend re-derives from generatedAt
  "stale": false,                      // backend's own freshness verdict (drives FRESH/STALE badge)
  "dataSource": "backend_candle_store",
  "symbolsScanned": 150,
  "symbolsPassed": 12,
  "symbolsSkipped": 3,
  "results": [
    {
      "symbol": "AAPL",
      "direction": "bullish",          // REQUIRED operational: "bullish" | "bearish"
                                       // ("LONG"/"SHORT" tolerated as aliases)
      "score": 87,                     // operational score (0–100); null tolerated
      "lastPrice": 228.40,
      "lastPriceSource": "dxlink_live",// dxlink_live | tastytrade | portfolio_refresh | backend_cache | candle_close
      "lastPriceUpdatedAt": "2026-06-11T14:29:58Z",
      "lastPriceIsLive": true,
      "lastPriceStaleReason": null,    // set when a non-live fallback price is used
      "timeframe1D": {
        "candlesCount": 251,
        "lastTimestamp": "2026-06-11",
        "stale": false,
        "indicators": {
          "rsi14": 64.2, "sma8": 226.1, "sma20": 221.3, "sma30": 218.8,
          "sma20AboveSma30": true,          // optional; derived from sma20/sma30 if absent
          "relativeStrengthVsSpy": 0.041,   // FRACTION (excess 20d return vs SPY), not percent
          "rsRising": true,
          "squeeze": false
        }
      },
      "timeframe4H": {
        "candlesCount": 120,
        "lastTimestamp": "2026-06-11T13:30:00Z",
        "source": "derived_30M",       // or "native_4H"
        "derivedFrom30M": true,
        "derivationReason": "aggregated_from_native_30M",
        "stale": false,
        "indicators": { "rsi14": 61.0 }
      },
      "reasons": ["rsi_above_59", "sma20_above_sma30", "rs_positive"],
      "warnings": [],
      "staleFlags": {}                 // any true value marks the row stale in the UI
    }
  ],
  "skipped": [
    { "symbol": "NVDA", "reason": "missing_4H_candles", "missingData": ["4H"], "queuedWarmup": true }
  ],
  "freshness": { "stale": false, "warnings": [] },
  "diagnostics": {
    "universe": { "count": 150 },
    "backendCandlesUsed": true,
    "frontendDependency": false,
    "warnings": ["SPY benchmark missing — RS flags not computed"]  // surfaced in the panel
  }
}
```

Frontend tolerance rules (implemented in `dsbParseSnapshot` / `dsbNormalizeResultRow`):

- `ok:false` bodies must come back as **HTTP 200** with a `reason` (mirrors the
  existing `/scanner/snapshot` NO_SNAPSHOT convention). HTTP 404 is interpreted
  as "endpoint not deployed" and silences errors.
- Missing optional fields degrade to `—` in the UI; rows without a safe symbol
  (`[A-Z0-9._/:-]`) or without results are dropped, never rendered.
- `direction: null` rows render as `missing_operational_direction` warnings and
  never appear in LONG/SHORT lists — no signal is fabricated from diagnostics.
- Skipped symbols must NOT appear in `results` — list them in `skipped` with
  `reason`/`missingData`/`queuedWarmup` instead (no false signals).

## Backend work still required in `apex-backend` (per task)

1. **Symbol universe** — persistent backend universe (scanner universe +
   portfolio + favorites + recent backend-tracked symbols + SPY always),
   deduped/normalized; optionally exposed as `GET /scanner/symbols/context`.
2. **Candle store freshness** — per-symbol 1D/30M/4H presence, counts, last
   timestamps, derivation of 4H from 30M, `stale` / `missingReason`; skip +
   queue warmup when data is missing.
3. **Last price resolution** — priority: DXLink live → Tastytrade/backend live →
   portfolio live-refresh → valid backend cache → last candle close (marked
   non-live, never deleting a previous valid price).
4. **Indicators** — backend-side SMA8/20/30, RSI14, RS vs SPY, squeeze (and the
   existing momentum/MACD where already used) on 1D + 4H. The DIRECTIONAL RULES
   THEMSELVES must mirror the current frontend rules (RSI>59 / RSI<39, SMA20 vs
   SMA30 trend, RS rising/positive vs falling/negative) — do not change the
   trading model, only move where it is computed.
5. **`POST /scanner/directional/run`** — builds universe → verifies/warms
   candles → resolves prices → computes indicators → applies rules → persists
   the snapshot → returns it. (Frontend does not call this; the scheduler does.)
6. **`GET /scanner/directional/snapshot`** — serves the last persisted snapshot
   in the shape above.
7. **Scheduler** — reuse the existing backend scanner scheduler to regenerate
   this snapshot (no duplicate timers/websockets); it must run with the frontend
   closed.

Alternative ship path: instead of new endpoints, populate operational
`direction`/`score` on the existing `/scanner/snapshot` candidates — the
frontend's legacy-operational fallback consumes that automatically.

## Frontend verification

- Tests: `node tests/backend-directional-snapshot.test.js` (and the full suite).
- Browser: open the SCANNER tab with no scan run; the panel shows the backend
  table once the endpoint serves `ok:true` (or the labelled frontend fallback +
  reason meanwhile). Console: `apexDebugBackendDirectionalSnapshot()`.
- Kill switches: `localStorage.setItem('apex_ff_backend_directional_snapshot','0')`
  (feature off) or the panel's `SOURCE: FRONTEND` toggle
  (`apex_dss_source_mode`).
