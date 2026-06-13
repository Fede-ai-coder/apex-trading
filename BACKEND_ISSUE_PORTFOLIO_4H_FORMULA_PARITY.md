# apex-backend issue — confirm 4H `formulaParity` for PortfolioTechnical (or omit 4H-specific parity keys)

> Draft for the `apex-backend` repo. The frontend (`apex-trading/index.html`) is
> behaving correctly and needs **no** workaround. This documents a backend payload
> gap so the 4H PortfolioTechnical block is actually consumed by the UI semaphores.

## Summary

`POST /portfolio/technical-refresh` returns a **raw `technical['4H']` block**, but the
frontend correctly **withholds** 4H technicals from PortfolioTechnical because the
required 4H `formulaParity` keys are **not confirmed**. This is a deliberate frontend
parity gate (it refuses to paint unverified 4H formulas into the traffic-light
semaphores). The result is the observed log discrepancy:

```text
[PortfolioTechnical] batched technical refresh complete  → with4h: 1   (raw 4H block present)
[PortfolioTechnical] backend technical fields mapped      → with4h: 0   (no 4H field applied)
[PortfolioTechnical] technical refresh applied …          → required1DParityConfirmed: true,
                                                              required4HParityConfirmed: false
```

The two counters measure different things, so this is **not** a frontend bug:
- `with4h: 1` counts presence of `row.technical['4H']` in the raw response.
- mapped `with4h: 0` counts symbols whose 4H fields were **applied**, which is gated
  behind `required4HParityConfirmed`.

## Root cause (backend payload)

The frontend parity gate (`buildFormulaParityGate` in `index.html`) treats the 4H
timeframe as **timeframe-specific** whenever the response's `formulaParity` object
contains **any** of these keys:

- `rsi14_4h`
- `sma_4h`
- `distanceFromSma_4h`

In that mode, `required4HParityConfirmed` is true **only if all three are
`'confirmed'`**. The backend currently emits one or more of these 4H-specific keys
with a value other than `'confirmed'`, so the gate evaluates to `false`, the 4H
fields are not applied (`applied4h = 0`), and `hasBackendTechnical4H` is never set.

```jsonc
// Frontend gate logic (for reference — DO NOT change the frontend):
required4HKeys = ['rsi14_4h', 'sma_4h', 'distanceFromSma_4h'];
has4HSpecificParity = required4HKeys.some(k => formulaParity.hasOwnProperty(k));
// timeframe_specific: all 3 must be 'confirmed'
// global_fallback (no 4H-specific keys present): inherit the confirmed 1D verdict
```

## Requested backend fix (pick ONE; do not require a frontend workaround)

**Option A — confirm 4H parity (preferred when 4H formulas are validated).**
Once the backend has validated that its 4H RSI(14), SMA, and distance-from-SMA
formulas match the agreed parity definitions, emit:

```jsonc
"formulaParity": {
  "rsi14": "confirmed",
  "sma": "confirmed",
  "distanceFromSma": "confirmed",
  "rsi14_4h": "confirmed",
  "sma_4h": "confirmed",
  "distanceFromSma_4h": "confirmed"
}
```

**Option B — inherit the 1D verdict via the existing fallback.**
If 4H is intended to share the 1D parity verdict (and 4H is not separately
validated), **omit** the 4H-specific keys (`rsi14_4h`, `sma_4h`,
`distanceFromSma_4h`) entirely. With no 4H-specific keys present, the frontend gate
switches to `global_fallback` and `required4HParityConfirmed` inherits the confirmed
1D verdict.

> Do NOT emit 4H-specific keys with a non-`'confirmed'` value unless 4H really is
> unconfirmed — that is exactly what suppresses the 4H semaphores today.

## Hard constraints (frontend will NOT change)

- The frontend parity gate stays as-is. We will **not** loosen it.
- We will **not** force PortfolioTechnical to accept 4H when parity is unconfirmed.
- Portfolio charts keep `/dev/market/candles-dxlink/` as the parity-authoritative
  backend candle source. This is unrelated to (and unaffected by) this issue.

## Acceptance criteria

1. When the backend has valid 4H technicals AND 4H formula parity holds, the
   response yields `required4HParityConfirmed: true` on the frontend.
2. With (1), the frontend logs `with4h: 1` in **both** the "batched technical refresh
   complete" and the "backend technical fields mapped" lines.
3. PortfolioTechnical traffic-light semaphores incorporate 4H bias only when (1) holds.
4. No change is required in `apex-trading/index.html`.

## Pointers (frontend, for reviewer context only)

- `buildBackendTechnicalByTickerFromResponse` / `buildFormulaParityGate` — `index.html` (~line 19851).
- 4H field application gate — `index.html` (~lines 19936–19948).
- Counters: raw `with4h` (~line 20246/20331) vs mapped `with4h` (~line 21596).
