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

1. **`GET /market-context/snapshot` → `snapshot.vixFamily`** — **first primary
   source**, because the backend already exposes VIX family here today (see
   "Current backend reality" below). The frontend normalizes it
   (`_normalizeBackendVixFamily`, accepting both `vix3m` and `vi3m`) and, when it
   carries at least one finite index value, applies it via `_applyFreshVixFamily()`
   (freshness + no-all-null guard). When valid, the frontend does **not** call the
   dedicated endpoint and does **not** open a frontend DXLink websocket.
2. **`GET /market-context/vix-family/live`** — second backend source (future
   dedicated endpoint). Same normalization and guards. Used only when the snapshot
   `vixFamily` is missing/incomplete.
3. **Direct frontend DXLink websocket** (`fetchVixFamily()`) — a **bounded,
   diagnostic, opt-in** fallback used *only* when **both** backend sources
   fail/incomplete. It is gated by
   `localStorage['apex_ff_vix_family_direct_ws_fallback']` (`'1'`=allowed,
   `'0'`=disabled; **default allowed** during backend rollout). It keeps the
   defensive behavior from the prior fix: one bounded retry, rich close
   diagnostics on `window._vixFamilyLastDiag`, and it never overwrites a valid
   `S.vixFamily` with an all-null result.

> The MCX view additionally consumes the rest of the snapshot (termStructure,
> regime, technicals) via `_mcxApplyBackendSnapshot()` under the
> `apex_ff_mcx_backend_snapshot` flag; that path is unchanged.

## Current backend reality (audit, 2026-06) and the `vi3m` field

The backend audit found that the dedicated `GET /market-context/vix-family/live`
endpoint **does not exist yet**, but the backend **already provides `vixFamily`
inside `GET /market-context/snapshot`** (alongside `termStructure`, `technicals`,
`regime`, freshness). Relevant backend helpers already present:
`buildVixFamilySnapshot`, `VIX_FAMILY_DXLINK`, `resolveVixCandidateLevel`.

**Field-name mismatch:** the current snapshot uses **`vi3m`** for the 3-month
value, while the frontend/regime engine works in terms of **`vix3m`**. This is
why the frontend previously logged `backend vixFamily missing/incomplete - keeping
frontend VIX fallback` even when the snapshot carried VIX family data.

Resolution (frontend, this PR):

- The frontend **accepts both `vi3m` and `vix3m`** and normalizes to `vix3m`:
  `vix3m = vf.vix3m ?? vf.vi3m ?? null` (explicit `vix3m` wins when both present).
- The snapshot `vixFamily` is consumed as the **first** primary source.
- The future dedicated endpoint **should** expose **`vix3m`** for consistency, but
  the frontend remains **backward-compatible with `vi3m`** indefinitely.

So the backend can ship the dedicated endpoint with `vix3m` and/or keep emitting
`vi3m` in the snapshot — the frontend handles either.

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

## `vixFamily` inside `GET /market-context/snapshot` (FIRST primary source)

This is what the backend exposes **today** and is the frontend's first source. The
shape below; note the frontend accepts `vi3m` **or** `vix3m` for the 3-month value:

```jsonc
{
  // … existing snapshot fields (termStructure, technicals, regime, freshness) …
  "vixFamily": {
    "vix":    19.73,
    "vix9d":  16.29,
    "vi3m":   19.76,   // current backend field; frontend normalizes vi3m → vix3m
    // "vix3m": 19.76, // also accepted; explicit vix3m wins if both are present
    "vix6m":  22.15,
    "source": "BACKEND_DXLINK",
    "timestamp": "2026-06-23T14:30:00Z"   // timestamp | updatedAt | generatedAt all accepted
  }
}
```

Frontend handling:

- Normalized via `_normalizeBackendVixFamily()`: each index coerced to a finite
  number or `null`; `vix3m = vix3m ?? vi3m ?? null`.
- Applied through `_applyFreshVixFamily()` when **at least one** index is finite
  (`_vixFamilyHasAnyValue`) — a strictly older `timestamp` won't clobber a newer
  cached family, and an all-null family is never stored.
- The MCX view still also reads termStructure/regime/technicals from the snapshot
  via `_mcxApplyBackendSnapshot()` under `apex_ff_mcx_backend_snapshot` (unchanged).

## Expected runtime after backend ships

On dashboard / MCX refresh the frontend logs, when the snapshot supplies VIX
family (the source today):

```text
[VIX-FAMILY] backend snapshot source ready
[VIX-FAMILY] applied backend snapshot VIX family
```

or, when the dedicated endpoint supplies it (after it ships):

```text
[VIX-FAMILY] backend source ready
[VIX-FAMILY] applied backend VIX family
```

When the snapshot `vixFamily` is present but incomplete, the frontend logs
`[VIX-FAMILY] backend snapshot vixFamily incomplete` (with the normalized values)
and falls through to the next source. In all cases the frontend no longer opens
`wss://tasty-openapi-dxlink-md-ws.dxfeed.com/realtime` for VIX family during
normal usage.

## Out of scope (must not change)

VIX formulas, regime thresholds/rules, the candidate symbol set, the VIX
dashboard layout (only source/status text + diagnostics logging), the RS scanner
/ RS universe auto-warmup / RS scoring, portfolio, journal, and unrelated
scanners. No Yahoo, no new market-data provider, no fabricated values.
