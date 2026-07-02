# Backend Coverage / Scanner Coverage — read-only diagnostics contract

The Swing screen renders a **Backend Coverage / Scanner Coverage** panel
(`#swing-coverage`). It is **read-only** and derives everything it can from
endpoints the frontend already calls:

- `GET /scanner/status`   → universe count, scheduler state, `lastSnapshotUpdatedAt`
- `GET /scanner/snapshot` → `source`, `stale`, `updatedAt`, `marketSession`,
  `candidates[]`, `currentWindowCandidates`, and `diagnostics` (relative strength,
  direction diagnostics, processed counts)

From those, the panel already shows: snapshot status, universe / current-window /
candidate counts, RS computed/processed/missing, Directional bullish/bearish/
neutral/processed/missing, and per-tab candidate counts.

## What is NOT available today: per-timeframe candle coverage

The unified scanner snapshot does **not** expose how many universe symbols have
candles populated per timeframe (1D / 30M / 4H / 1W). Until a backend endpoint
provides it, the panel shows **"Candle coverage unavailable"** for that section.

The frontend already consumes an optional, forward-compatible payload at
`S.backendScanner.coverage`. If a read-only backend endpoint is added and its
response is stored there, the per-timeframe section lights up automatically — **no
further frontend change required**.

### Recommended endpoint (read-only, additive, no side effects)

`GET /scanner/coverage/status` (or `/market/candles/coverage`)

It MUST:
- be a pure GET — start NO scanner, NO warmup, mutate NO store/DB;
- be backward-compatible (additive);
- treat **1W as derivable from 1D** (mark `derived: true` and count a symbol as
  having 1W coverage when it has 1D), mirroring the frontend
  `derived_from_1d_store` weekly behaviour.

### Response shape consumed by the panel

```json
{
  "ok": true,
  "updatedAt": "2026-06-26T12:02:41.117Z",
  "universe": { "totalSymbols": 90, "currentWindowSymbols": 30, "processedSymbols": 65 },
  "candles": {
    "completeSymbols": 25,
    "byTimeframe": {
      "1D":  { "populated": 60, "missing": 5,  "stale": false, "sampleMissingSymbols": [] },
      "30M": { "populated": 40, "missing": 25, "stale": false, "sampleMissingSymbols": [] },
      "4H":  { "populated": 55, "missing": 10, "stale": false, "sampleMissingSymbols": [] },
      "1W":  { "populated": 50, "missing": 15, "stale": false, "derived": true }
    }
  },
  "scanners": {
    "rsVsSpy":     { "processed": 35, "computed": 30, "missing": 5, "candidates": 30 },
    "directional": { "processed": 30, "bullish": 11, "bearish": 8, "neutral": 11, "missing": 0, "candidates": 19 },
    "squeeze":     { "processed": 0, "candidates": 0, "missing": 0, "unavailable": 0, "source": "not_in_backend_snapshot" }
  }
}
```

The frontend reads `candles.byTimeframe[tf].populated|missing|stale|derived` and
`candles.completeSymbols`; scanner numbers are otherwise read from
`/scanner/snapshot` diagnostics, so the `scanners` block above is optional.

## Squeeze scanner

The unified backend scanner engine does **not** carry squeeze data — squeeze lives
in the frontend SFS scanner (`S.squeezeFireScanner.results`). The panel makes this
explicit ("Squeeze scanner not present in backend snapshot") instead of leaving the
empty Swing Squeeze tab ambiguous. If the backend later adds squeeze fields to the
snapshot candidates (`squeeze` / `squeezeStatus` / `squeezeFire` /
`squeezeDiagnostics`) or per-symbol squeeze in the coverage payload, the Squeeze tab
and coverage section pick them up automatically.
