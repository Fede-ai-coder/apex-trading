# Portfolio Option Greeks/Quote Enrichment — frontend audit + backend contract

Audit of the **existing** frontend logic that rebuilds option legs, derives the
DXLink/Tastytrade option symbol, fetches live quotes/Greeks, and feeds the
aggregate Greeks/risk formulas. This is the written contract the backend
(`apex-backend`, **PR #140** — `buildDxlinkOptionStreamerSymbol()` +
`POST /portfolio/:portfolioId/positions/enriched`) and the frontend consumer
(**PR #257** — `_backendEnrichedPositionsToAggregatedOptions()`) must match
**1:1**, so Greeks stop coming back empty (`legUpdated 0 / unresolvedCount 34`).

> **Scope guard.** This document describes the frontend as it exists in
> `index.html` on this branch. It changes **no** aggregate Greeks/risk formula,
> Beta-Weighted Delta, BWD, Delta/Theta, Vega Monitor, scanner, candles, Market
> Context, VIX family, trade ids, portfolio ids, or the just-stabilized
> import pipeline. It only pins the option-symbol format and the
> request/response shape exchanged with the backend.

Companion executable fixtures:
- `tests/portfolio-option-streamer-symbol.test.js` — pins the exact symbol.
- `tests/portfolio-enriched-endpoint-shape.test.js` — pins the response shape.

---

## 1. Relevant frontend functions

| Function | Location (`index.html`) | Responsibility |
|---|---|---|
| `buildStreamerSymbol(ticker, expiryDate, strike, side)` | ~18971 | Legacy/simple builder. `side` is already `'C'`/`'P'`. Format `.{TICKER}{YYMMDD}{C\|P}{STRIKE}`. Strike = integer string if whole, else decimal. Used by forms, display, and the frontend DXLink fallback. |
| `buildCompactOptionDxlinkSymbol(underlying, leg)` | ~19004 | **Canonical builder.** Normalizes `leg.type/optionType/right`, strips trailing zeros from the strike, keeps decimals. Produces the exact key used everywhere. |
| `buildOptionDxlinkSymbolCandidate(underlying, leg)` | ~18984 | **Fallback only.** Padded OCC-ish form: root `padEnd(6,' ')`, strike `×1000 padStart(8,'0')` → `.SPY␠␠␠260619C00825000`. Used **only** if the compact builder returns null. **Never** the map key. |
| `isOptionStreamerSymbolConsistent(underlying, leg, symbol)` | ~19036 | Validates a stored/candidate symbol against the leg (root, `YYMMDD`, C/P, strike within 1e-7). Rejects stale `×100` encodings and mismatched roots. |
| `getPreferredOptionDxlinkSymbol(underlying, leg)` | ~19062 | **Single source of truth for the key.** Precedence below. This is what keys `aggregatedResp.options[sym]` lookups. |
| `buildPortfolioLiveRefreshPayload(positions)` | ~19244 | Builds the POST body: per-leg `{type, side, strike, expiry, expiration, qty, streamerSymbol(=preferred), rawStreamerSymbol, symbol, optionSymbol}`. The `streamerSymbol` sent is the **preferred/canonical** symbol. |
| `refreshPositionsLive(portfolioId, opts)` | ~20958 | Orchestrator. Calls full/live refresh, reads `aggregatedResp.options`, merges into `S.greeksCache`, applies to legs, drives `legUpdated` / `unresolvedSymbols` / `unresolvedCount`, then calls `aggregateGreeks`. |
| `fetchPortfolioFullRefresh(positions)` | ~19335 | `POST /portfolio/full-refresh` (FF_BACKEND_OFFLOAD_V1). Normalizes backend shape to the live-refresh consumer shape. The PR #140 enriched endpoint slots in alongside this. |
| `fetchPortfolioGreeks(positions)` | ~2187 | Direct browser→Tastytrade DXLink WebSocket path (quote-token → SETUP/AUTH/CHANNEL/FEED). Subscribes `Quote` + `Greeks`, normalizes fields. The legacy `getLiveGreeks`/`getLiveOptionQuote` equivalent. |
| `fetchDXLinkGreeks(symbols)` | (frontend fallback) | Frontend DXLink fallback used only when backend is incomplete **and** `S.enableFrontendDxlinkFallback && S.ttConnected`. |
| `aggregateGreeks(positions, spyPrice, portfolioId)` | ~15888 | **Unchanged.** Consumes per-leg `delta/theta/gamma/vega` and produces portfolio totals. Not touched by this work. |
| `_apexPortfolioGreeksRefreshDiag` | ~21002 / 22453 / 22697 | Diagnostics counters: `activeLegs`, `terminalLegs`, `legUpdated`, `greeksUnavailable`, `pnlGuardSkipped`, `sources{}`, `updatedGreeksCount`. |

### `getPreferredOptionDxlinkSymbol` precedence (the key resolution)

1. `leg.streamerSymbol` / `leg['streamer-symbol']` — **iff** `isOptionStreamerSymbolConsistent`.
2. `leg.symbol` / `leg.rawSymbol` / `leg.optionSymbol` — iff dotted (`'.'…`) **and** consistent.
3. `buildCompactOptionDxlinkSymbol(...)` — **canonical build** (the normal path).
4. `buildOptionDxlinkSymbolCandidate(...)` — padded fallback only if (3) is null.

A stored symbol that disagrees with the leg (e.g. a stale `×100` encoding
`.SPY260619C82500`) is **discarded** and re-derived to the compact form.

---

## 2. Exact flow: journal trade / position → aggregateGreeks

```
Journal trade / position (ticker, legs[{type, side, strike, expiry, qty, …}])
  │
  ▼  per leg
getPreferredOptionDxlinkSymbol(pos.ticker, leg)        → canonical streamer symbol
  │                                                       (compact, e.g. .SPY260619C825)
  ▼
buildPortfolioLiveRefreshPayload(positions)            → POST body (streamerSymbol = canonical)
  │
  ▼
POST /portfolio/:portfolioId/positions/enriched        ← PR #140 backend
  │   (or /portfolio/full-refresh)                         backend builds the SAME symbol via
  │                                                         buildDxlinkOptionStreamerSymbol(),
  │                                                         subscribes DXLink, collects Quote+Greeks
  ▼
aggregatedResp.options[ <canonical symbol> ] = {greeks, quote, greeksStale, quoteStale, …}
  │
  ▼  refreshPositionsLive() — index.html:21960-22019
merge into S.greeksCache (fresh greeks/quote only; stale greeks never pollute cache)
  set aggregatedGreeksResolved[sym] / aggregatedQuoteResolved[sym]
  │
  ▼  index.html:22302-22457 — per leg, re-derive _effSym = getPreferredOptionDxlinkSymbol(...)
apply legLive.{delta,theta,gamma,vega,volatility,bid,ask}; mark = mid(bid,ask) or backend mark
  if any greek present → anyGreekData; _apexPortfolioGreeksRefreshDiag.legUpdated++
  else → unresolvedOptionSymbols.push(_effSym); unresolvedCount = totalOptionLegs - resolvedOptionLegs
  │
  ▼
aggregateGreeks(positions, spyPrice, portfolioId)      → Delta / Theta / Vega / Gamma totals (UNCHANGED)
```

Source precedence when applying a leg (index.html:22344-22450):
`backendOptionLiveBySymbol[_effSym]` (BACKEND_DXLINK) → `S.greeksCache[_effSym]`
with `source==='BACKEND_PORTFOLIO_REFRESH'` → frontend `greeksMap` (fallback) →
`greeksCache` → journal `entrySnapshot`. Backend data wins.

---

## 3. Exact option-symbol format

**Canonical (the map key):**

```
.{ROOT}{YYMMDD}{C|P}{STRIKE}
```

- `ROOT` — the ticker, uppercase, **verbatim** (dotted roots keep the dot: `BRK.B`).
- `YYMMDD` — 2-digit year + zero-padded month + day, from the leg expiry.
- `C` for CALL, `P` for PUT (from `type`/`optionType`/`right`; accepts `CALL/PUT/C/P`).
- `STRIKE` — integer string when whole (`825`); otherwise decimal with trailing
  zeros stripped (`480.5`). **No** `×1000` scaling, **no** zero-padding.

**Fallback (never the key):** `.{ROOT padEnd 6}{YYMMDD}{C|P}{strike×1000 padStart 8}`
→ `.SPY   260619C00825000`.

---

## 4. Real examples (verified by running the real functions)

| Ticker | Type | Strike | Expiry | Canonical symbol (= map key) | Padded fallback |
|---|---|---|---|---|---|
| SPY  | CALL | 825   | 2026-06-19 | `.SPY260619C825`    | `.SPY   260619C00825000` |
| SPY  | PUT  | 500   | 2026-04-20 | `.SPY260420P500`    | `.SPY   260420P00500000` |
| IWM  | PUT  | 210   | 2026-01-16 | `.IWM260116P210`    | `.IWM   260116P00210000` |
| CSCO | CALL | 55    | 2026-03-20 | `.CSCO260320C55`    | `.CSCO  260320C00055000` |
| BABA | CALL | 120   | 2026-09-18 | `.BABA260918C120`   | `.BABA  260918C00120000` |
| QQQ  | PUT  | 480   | 2026-06-19 | `.QQQ260619P480`    | `.QQQ   260619P00480000` |
| QQQ  | PUT  | 480.5 | 2026-06-19 | `.QQQ260619P480.5`  | `.QQQ   260619P00480500` |
| BRK.B| CALL | 440   | 2026-06-19 | `.BRK.B260619C440`  | `.BRK.B 260619C00440000` |

Futures roots (`/ES`, `/MES`) are passed through verbatim if present; the
frontend does not special-case them in the symbol builder — they are not the
source of the current empty-Greeks issue (equity options dominate `activeLegs`).

---

## 5. Differences vs backend PR #140

The backend example `.SPY260619C825` **matches** for whole-dollar equity strikes.
The likely (and silent) divergences that produce `legUpdated 0`:

| # | Risk in #140 | Frontend truth | Symptom |
|---|---|---|---|
| D1 | Fractional strike emitted as `.QQQ260619P480.500` or `.QQQ260619P480500` | `.QQQ260619P480.5` (decimal, trailing zeros stripped) | key miss → leg unresolved |
| D2 | Dotted root normalized to `BRKB` | `BRK.B` kept verbatim | key miss for BRK.B |
| D3 | Padded OCC form used as the `options` key (`.SPY   260619C00825000`) | compact is the key; padded is fallback only | total key miss |
| D4 | `volatility` returned `×100` (e.g. `21`) | raw DXLink fraction (e.g. `0.21`); frontend scales for display | wrong IV downstream |
| D5 | `options` returned as an **array** | must be an **object/map** keyed by symbol | `options_not_object_map` |
| D6 | Market-closed → HTTP error / `ok:false` | must be `ok:true` + diagnostics (`unresolvedReason`, `marketSessionStatus`) | whole refresh fails |
| D7 | Greeks & quote freshness coupled | independent: `greeksStale` vs `quoteStale` | usable quotes dropped |
| D8 | Quote fields named `bid/ask` | consumer reads `quote.bidPrice/askPrice/mark/lastPrice` | quote unresolved |

---

## 6. Corrections #140 must apply to match the frontend 1:1

`buildDxlinkOptionStreamerSymbol(ticker, expiry, strike, type)` must produce
**exactly** `getPreferredOptionDxlinkSymbol`'s compact output:

1. `'.' + ticker (verbatim, uppercased, dot preserved) + YYMMDD + (C|P)`.
2. Strike: `Number.isInteger(s) ? String(s) : String(s).replace(/\.0+$/,'')`
   (strip trailing zeros, keep significant decimal). **No** `×1000`, **no** padding.
3. Accept `CALL/PUT/C/P` (and `right`) for the type.
4. Key the `options` response map by this exact string.

Response (`POST /portfolio/:portfolioId/positions/enriched`):

5. `ok:true` even when degraded/closed; carry `optionResolutionDiagnostics`.
6. `options` is an **object map** `{ "<canonical symbol>": { … } }` (never an array).
7. Per option: `greeks:{delta,theta,gamma,vega,volatility}` (volatility = **raw
   fraction**), `quote:{bidPrice,askPrice,mark,lastPrice}`, `greeksStale`,
   `quoteStale`, optional `greeksUnavailableReason`.
8. Keep greeks/quote freshness independent (a leg can have a fresh quote and
   stale greeks).
9. `optionResolutionDiagnostics:{unresolvedReason, marketSessionStatus,
   greeksStaleExpected, staleGreeksReason, lastGreeksEventAt}`.
10. Include `underlyings` (or `underlyingsBySymbol`) and `generatedAt`.

PR #257 `_backendEnrichedPositionsToAggregatedOptions()` must produce the same
`aggregatedResp` shape consumed at `index.html:21960-22019` (see test #2).

---

## 7. Tests added with this contract

| Test | Pins |
|---|---|
| `tests/portfolio-option-streamer-symbol.test.js` | Exact canonical symbol for SPY/IWM/CSCO/BABA/QQQ, fractional strike, BRK.B, type aliases, padded-fallback boundary, stale-`×100` re-derivation, options-map **key parity**. Extracts the **real** builders from `index.html`. |
| `tests/portfolio-enriched-endpoint-shape.test.js` | Response shape via a faithful port of the real cache-merge reader: fresh greeks+quote, `lastPrice→mark` fallback, stale-greeks/fresh-quote independence, `MISSING`/`STALE`/explicit reasons, unresolved-leg diagnostics, top-level + market-closed `optionResolutionDiagnostics`, empty-options-not-a-failure. |

Run:

```
node tests/portfolio-option-streamer-symbol.test.js
node tests/portfolio-enriched-endpoint-shape.test.js
```

---

## 8. Success criteria (after #140 corrected + #257 deployed)

Opening **LIVE Beta** should log:
- `backend enriched legs count > 0`
- `unresolved legs count < activeLegs` (today: `unresolvedCount 34` of `activeLegs ~34`)
- `fallback used: no` (or partial only)
- Greeks no longer all empty; Delta/Theta/Vega/Gamma totals populate through the
  **existing, unchanged** `aggregateGreeks` formulas.
