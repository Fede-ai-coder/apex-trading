# Backend VIX Family (live) — frontend/backend contract

The VIX Family (VIX, VIX9D, VIX3M, VIX6M) used by the Market Context / regime
engine is now fetched by the **backend**, which already holds the stable DXLink
connection (see `GET /dxlink/status`), and **consumed** by the frontend
(`index.html`). This replaces the previous approach of opening a *second* DXLink
websocket from the browser, which was observed opening (HTTP 101), receiving
`SETUP`, then closing before `AUTH`/subscription/data:

```text
[VIX-FAMILY] ws opened
[VIX-FAMILY] ws closed code=1000 reason=Bye clean=false authorized=false subscribed=false setup=true feed=false priceMapKeys=[]
[VIX-FAMILY] fetch failed/incomplete; keeping previous VIX family
```

This file documents the exact contract the frontend consumes so the backend
(`Fede-ai-coder/apex-backend`) can implement it without guessing. The frontend
ships first and degrades gracefully until the backend endpoint exists.

## Frontend source cascade (already implemented)

1. **`GET /market-context/vix-family/live`** — primary. When it returns a family
   with at least one finite index value, the frontend applies it to `S.vixFamily`
   via `_applyFreshVixFamily()` (freshness + no-all-null guard) and does **not**
   open a frontend DXLink websocket.
2. **`vixFamily` block inside `GET /market-context/snapshot`** (optional, see
   below) — already consumed by `_mcxApplyBackendSnapshot()` when the MCX backend
   snapshot flag is on.
3. **Direct frontend DXLink websocket** (`fetchVixFamily()`) — a **bounded,
   diagnostic, opt-in** fallback used *only* when the backend endpoint fails. It
   is gated by `localStorage['apex_ff_vix_family_direct_ws_fallback']`
   (`'1'`=allowed, `'0'`=disabled; **default allowed** during backend rollout).
   It keeps the defensive behavior from the prior fix: one bounded retry, rich
   close diagnostics on `window._vixFamilyLastDiag`, and it never overwrites a
   valid `S.vixFamily` with an all-null result.

The frontend never triggers a fetch/scan run beyond a read-only GET. It must
**never** receive fabricated/placeholder VIX values from the backend.

## Auth / access

Same rules as the other market-context endpoints (e.g.
`GET /market-context/snapshot`): protected by the backend API key (`x-api-key`,
sent by the frontend as `S.backendKey`) and the session header (`x-session-id`).
`ttCall()` applies the backend base URL + these headers and throws on non-2xx.
A `401/403` puts the frontend into the "backend API key invalid" state and the
VIX endpoint is then skipped (no retry storm) until (re)login / key update.

## Data source

Must use the **existing backend DXLink manager / quote infrastructure** — the
same connection reported healthy by `GET /dxlink/status`
(`connected / ready / authorized / feed_ready`). Do **not** introduce a new
market-data provider, and do **not** add Yahoo or any HTTP scrape.

## Symbol candidates (priority order — first finite quote wins)

The backend must attempt these candidates per index, in order, and report which
symbol produced each value in `symbolsUsed`. This set must stay in sync with the
frontend's `fetchVixFamily()` fallback (13 symbols total):

```js
{
  vix:   ['$VIX.X',   'VIX',   '^VIX'],
  vix9d: ['$VIX9D.X', 'VIX9D', '^VIX9D'],
  vix3m: ['$VIX3M.X', '$VXMT.X', 'VIX3M', '^VIX3M'],   // CBOE relabelled VXMT → VIX3M
  vix6m: ['$VIX6M.X', 'VIX6M', '^VIX6M']
}
```

Value derivation per symbol (matching the frontend's prior DXLink logic): prefer
the Quote mid (`(bidPrice + askPrice) / 2`) when both sides are present, else a
present positive side, else the Trade `price`. Indices frequently publish only a
Trade `price`. Round to 2 decimals. Do not invent values.

## `GET /market-context/vix-family/live` — ready payload

```jsonc
{
  "ok": true,
  "status": "ready",
  "source": "BACKEND_DXLINK",
  "timestamp": "2026-06-23T14:30:00Z",   // ISO; drives the frontend freshness guard
  "vix":   19.73,
  "vix9d": 16.29,
  "vix3m": 19.76,
  "vix6m": 22.15,
  "symbolsUsed": {                        // which candidate produced each value
    "vix":   "VIX",
    "vix9d": "VIX9D",
    "vix3m": "VIX3M",
    "vix6m": "VIX6M"
  },
  "diagnostics": {
    "backendDxlinkReady": true,
    "quoteTokenAvailable": true,
    "attemptedSymbols": ["$VIX.X","VIX","^VIX","$VIX9D.X","VIX9D","^VIX9D","$VIX3M.X","$VXMT.X","VIX3M","^VIX3M","$VIX6M.X","VIX6M","^VIX6M"],
    "priceMapKeys": ["VIX","VIX9D","VIX3M","VIX6M"],
    "missing": []
  }
}
```

### Frontend field handling

- `vix`, `vix9d`, `vix3m`, `vix6m` — each is applied only when **finite** (the
  frontend treats `null`/non-finite as "missing" — note `Number(null) === 0`, so
  the value must be genuinely absent as `null`, never `0` as a sentinel).
- `source` — stored as `S.vixFamily.source` (defaults to `"BACKEND_DXLINK"` if
  omitted). Surfaced in the small MCX source/status text only.
- `timestamp` — feeds `_applyFreshVixFamily()`; a strictly older timestamp will
  not overwrite a newer cached family.
- `symbolsUsed` — stored as `S.vixFamily.symbolsUsed`.
- `diagnostics` — logged/inspectable only; never affects values.

## Incomplete / error payload (no fabrication)

When the backend cannot resolve a usable family it must return a clearly failed
shape with `null` values — never placeholders:

```jsonc
{
  "ok": false,
  "status": "incomplete",
  "reason": "missing_vix_family_quotes",   // machine-readable; logged by the frontend
  "source": "BACKEND_DXLINK",
  "vix": null,
  "vix9d": null,
  "vix3m": null,
  "vix6m": null,
  "diagnostics": {
    "backendDxlinkReady": true,
    "quoteTokenAvailable": true,
    "attemptedSymbols": [ /* … */ ],
    "priceMapKeys": [],                     // symbols that did resolve, if any
    "missing": ["vix","vix9d","vix3m","vix6m"]
  }
}
```

Frontend behavior on incomplete/error (or any non-2xx):
- the previous valid `S.vixFamily` is **kept** (never overwritten with all-null);
- the bounded diagnostic websocket fallback runs **only** if allowed by the flag;
- `_vixFamilyPending` is always cleared (success, failure, timeout, close).

Other suggested `reason` values: `dxlink_not_ready`, `quote_token_unavailable`,
`partial_vix_family_quotes` (when some but not all four indices resolve — still
`ok:false` unless you choose to return the partials with the resolved subset).

## Optional: `vixFamily` inside `GET /market-context/snapshot`

If convenient, also embed the same family in the existing snapshot so MCX can
bridge it without a second call (already consumed by `_mcxApplyBackendSnapshot()`
when `apex_ff_mcx_backend_snapshot` is on):

```jsonc
{
  // … existing snapshot fields …
  "vixFamily": {
    "vix":   19.73,
    "vix9d": 16.29,
    "vix3m": 19.76,
    "vix6m": 22.15,
    "source": "BACKEND_DXLINK"
  }
}
```

The frontend applies this only when all four are finite, through the same
freshness guard, so a late snapshot can't clobber a newer live value.

## Expected runtime after backend ships

On dashboard / MCX refresh the frontend logs:

```text
[VIX-FAMILY] backend source ready
[VIX-FAMILY] applied backend VIX family
```

and no longer opens `wss://tasty-openapi-dxlink-md-ws.dxfeed.com/realtime` for
VIX family during normal usage.

## Out of scope (must not change)

VIX formulas, regime thresholds/rules, the candidate symbol set, the VIX
dashboard layout (only source/status text + diagnostics logging), the RS scanner
/ RS universe auto-warmup / RS scoring, portfolio, journal, and unrelated
scanners. No Yahoo, no new market-data provider, no fabricated values.
