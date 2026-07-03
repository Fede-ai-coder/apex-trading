# Portfolio βΔ SPY‑EQ / Earnings / SQZ — Field‑by‑Field Audit (AUDIT ONLY)

Date: 2026-07-03
Frontend branch: `claude/portfolio-spy-eq-earnings-sqz-gvlmwd` (apex-trading, tip = merge PR #290)
Backend branch:  `claude/portfolio-spy-eq-earnings-sqz-gvlmwd` (apex-backend, tip = merge PR #199)
Preview under test: `6a47e94b76fb4b0008648e42--spontaneous-queijadas-118823.netlify.app`

Scope: read‑only investigation of why **βΔ SPY‑EQ = "-"**, **Earnings = "--"**, **SQZ = "--"**
while Unreal P&L / Delta / Theta / Beta / βΔ WTD / IVR are populated. No code was
changed for this audit. Live backend capture was **blocked by egress policy**
(the Railway hosts are denied by this session's network policy — see §7), so all
findings are derived from the committed code of both repos.

---

## 1. Field‑by‑field summary table

### βΔ SPY‑EQ
| aspect | finding |
|---|---|
| backend source | `_spyPrice` (SPY benchmark, frontend‑resolved) + `pos.underlyingPrice` + `pos.delta` + `pos.beta`. **βΔ SPY‑EQ is FRONTEND‑computed**, not returned by the backend. |
| frontend expected key | `risk.spyPrice` (from `computePortfolioRiskMetrics`) and `pos.underlyingPrice`; per‑row via `computeRowBetaWeightedDelta` → `betaWeightedDeltaSpyEq` (index.html:20800). |
| actual backend key | n/a (computed on the frontend). SPY price arrives through `resolvePortfolioLivePrice('SPY',…)` → `CANDLE_CLOSE_FALLBACK`. |
| current value / reason | Formula `delta × beta × (underlyingPrice / spyPrice)` requires **all four** inputs (index.html:20800‑20801, 20624). It does **NOT** gate on price source/`isLive` — `CANDLE_CLOSE_FALLBACK` is accepted (only `> 0` is required, 20781). |
| old PR where introduced | βΔ WTD/SPY‑EQ split: commit `74ca79d` (in PR #290). `betaWeightedDelta` alias kept for back‑compat. |
| minimal fix | **No computation defect found.** With the runtime state described (AMD `underlyingPrice` persisted via `CACHE_PREVIOUS_PRICE`, `_spyPrice` set via `CANDLE_CLOSE_FALLBACK`, delta+beta present since βΔ WTD renders) the value **should compute**. Fix = render the existing `missingReason` **inline** instead of a bare "—" (currently only in the tooltip), so the live cell states `SPY_PRICE_UNAVAILABLE` / `MISSING_BENCHMARK_PRICE` / `underlyingPrice` and self‑diagnoses on the preview. Optionally re‑render once after SPY resolves. |

### Earnings
| aspect | finding |
|---|---|
| backend source | `GET /market/earnings/latest?symbols=…` → `earningsProvider.fetchEarningsForSymbols` → **live `ttFetch('/market-metrics')` on every request** (earnings-provider.js:156‑178). The module explicitly performs **NO persistence / NO caching** (earnings-provider.js:23). |
| frontend expected key | `refreshPortfolioEarnings` accepts `nextEarningsDate \| earningsDate \| nextEarnings \| date` (index.html:21591). |
| actual backend key | `/market/earnings/latest` returns `items[].nextEarningsDate` (server.js:5286) — key matches. Same data is **also embedded** per symbol in `/portfolio/technical-refresh` as `entry.earnings.nextEarningsDate` (server.js:7918, `toTechnicalRefreshEarnings`). |
| timeout location | Frontend `AbortSignal.timeout(8000)` (index.html:21575). Backend hits TT live; when TT is slow/cold the response exceeds 8 s → `DOMException: The operation timed out` (index.html:21623‑21627). |
| old PR where introduced | `/market/earnings/latest` + provider added in **PR #195**. PR #195 did **not** add a store — there is no cached earnings layer to fall back to. |
| minimal fix | Frontend should consume the **already‑fetched** technical‑refresh `entry.earnings` (no extra call) as a primary/fallback source, so earnings populate even when the dedicated call times out; add `EARNINGS_TIMEOUT` / `EARNINGS_UNAVAILABLE` provenance. Timeout handling is already non‑fatal (positions left untouched — index.html:21634‑21656), so it does **not** blank other fields today. |

### SQZ
| aspect | finding |
|---|---|
| backend source | `/portfolio/technical-refresh` → per‑symbol `entry.technical['1D'].squeeze` = `'ON' \| 'OFF' \| null` (server.js:8308‑8309), plus top‑level `formulaParity` (server.js:8051) and `with1d`/per‑symbol `oneDReason` (server.js:7578‑7579). Squeeze is **candle‑derived** and **independent** of the SMA/RSI/Bollinger parity gate. |
| frontend expected key | `_technicalTfSqueezeState` reads `squeeze \| squeezeOn \| inSqueeze \| sqz` (index.html:20491‑20498); mapped to `out.squeeze / squeeze1d / squeeze4h` (index.html:25314‑25319) → `priceMap[t].squeeze`. |
| actual backend key | `technical['1D'].squeeze` — key matches the aliases the frontend reads. |
| reason returnedTechnicalsCount=0 | **Two compounding causes.** (1) **Cold candle store** on the fresh preview → backend returns no 1D technicals (`with1d = 0`, `returnedTechnicalsCount = 0`, `durationMs ≈ 7002`) → no squeeze data at all. (2) **Frontend parity early‑return** at index.html:**25239** returns before the squeeze extraction at 25314‑25319, so whenever `required1DParityConfirmed` is false the squeeze is discarded **even if the backend returned it**. The comment at 25309 says squeeze is "independent of the parity gates" but the code path contradicts it. |
| old PR where introduced | Squeeze mapping from technical‑refresh: commits `00e1176` / `425048d` (PR #290). The parity gate/early‑return predates PR #290. |
| minimal fix | (a) Extract squeeze **before/independent of** the parity early‑return so valid squeeze renders regardless of `formulaParity`; (b) fix the skip‑reason priority (index.html:27028‑27031) so a no‑data response is reported as `no_technicals_in_response` / `no_1d_candles` instead of the misleading `formula_parity_not_confirmed`; (c) surface the backend's `oneDReason` (`DXLINK_1D_CANDLE_CACHE_EMPTY`) as the explicit SQZ reason when there is genuinely no 1D data. |

---

## 2. βΔ SPY‑EQ — detailed audit

**Where it is calculated (frontend, three consistent sites):**
- Per‑row: `computeRowBetaWeightedDelta(pos, spyPrice)` — index.html:20755. `betaWeightedDeltaSpyEq = (delta && beta && underlyingPrice && sp) ? delta*beta*(underlyingPrice/sp) : null` (20800‑20801).
- Aggregate bar: `aggregateGreeks` — `bwdTotal` at index.html:20624‑20627 (guarded by `pos.underlyingPrice && spyPrice`).
- KPI total: `computePortfolioRiskMetrics` — index.html:20837; returns `spyPrice` (20900); reuses the row helper (20859).

**Which inputs it requires:** `delta`, `beta`, `underlyingPrice`, `spyPrice` (SPY). Missing‑reason is
already computed as `delta | beta | underlyingPrice | spyPrice` (20783‑20787).

**Which SPY field it reads:** `_resolveSpyPrice(context.spyPrice)` (20840) → priority
`contextSpyPrice → global _spyPrice → S.portfolioData.spyPrice → scanData SPY row`
(20711‑20725). The render passes the global `_spyPrice` (21992, 21997), which is set by
`resolvePortfolioLivePrice('SPY',…)` including the `CANDLE_CLOSE_FALLBACK` branch (27493‑27502).

**Does the frontend refuse a `CANDLE_CLOSE_FALLBACK` SPY price?** **No.** The helper only
requires `isFinite(spyPrice) && spyPrice > 0` (20781); there is no `isLive`/source gate on
the SPY‑EQ math anywhere in the path.

**Does the backend return βΔ SPY‑EQ?** No — it is frontend‑computed. The backend supplies the
ingredients (beta via `/market/betas/latest`, SPY self_benchmark, and SPY candles for the
fallback price).

**Is PR #193's SPY beta still served?** Yes — `GET /market/betas/latest` returns SPY as
`{ beta: 1, source: 'self_benchmark' }` (server.js:13798, 18279). βΔ SPY‑EQ does not need SPY's
beta (SPY is the denominator price), so this is not the blocker.

**Is `underlyingPrice` persisted (not clobbered)?** Yes. `resolvePortfolioLivePrice` writes it via
`positionManager.updateLive` (27462‑27466), and `journalManager.updateLive` is a **field‑guarded
merge** (index.html:31978‑31997) — a later greeks‑only update does **not** null `underlyingPrice`.
`_tradeAsPosition` then reads `live.underlyingPrice` (19354).

**Conclusion:** the βΔ SPY‑EQ pipeline is correct end‑to‑end and accepts fallback prices. With the
exact runtime state reported, it should render a value. The audit could not reproduce a code‑level
"-". Because βΔ WTD (which shares delta+beta) renders, the only way SPY‑EQ blanks is a genuinely
missing `underlyingPrice` **or** `spyPrice` **at render time** — which the current bare "—" hides.
The minimal, safe fix is to surface the exact missing input inline so the preview self‑diagnoses
(this is also required by the "Do not silently show '-'" rule).

---

## 3. Earnings — detailed audit

- Frontend fn: `refreshPortfolioEarnings(positions, portfolioId)` — index.html:21497; called
  non‑fatally at index.html:28420.
- Endpoint called: `GET /market/earnings/latest?symbols=<open tickers>` — index.html:21527.
- Fetch: `AbortSignal.timeout(8000)` — index.html:21575. On abort → `fetchFailed=true`, warning,
  **positions untouched** (21623‑21656) → other fields are **not** blanked.
- Backend: `/market/earnings/latest` (server.js:5271) → `earningsProvider.fetchEarningsForSymbols`
  → **live** `ttFetch('/market-metrics?symbols=…')` per request (earnings-provider.js:163‑178),
  **no cache/persistence** (earnings-provider.js:23). Slow/cold TT ⇒ > 8 s ⇒ frontend abort.
- Key names: backend `nextEarningsDate` ↔ frontend accepts `nextEarningsDate/earningsDate/nextEarnings/date`
  — **no key mismatch**. Root‑field on TT is `earnings['expected-report-date']` (server.js:5319),
  already normalized by the backend.
- Is earnings available elsewhere the frontend already fetches? **Yes** — `/portfolio/technical-refresh`
  embeds `entry.earnings.nextEarningsDate` per symbol (server.js:7918), but the frontend's
  `buildBackendTechnicalByTickerFromResponse` **ignores** it (it maps technicals/squeeze only).
- Is earnings in `/portfolio/{id}/positions/enriched`? **No** — that endpoint is option‑leg
  greeks/quotes only (see §5).

**Minimal fix:** read `entry.earnings` from the technical‑refresh response the frontend already
fetches (primary/fallback, no extra network call); keep the dedicated call but classify its abort
as `EARNINGS_TIMEOUT` and a genuine no‑date as `EARNINGS_UNAVAILABLE`. Never Yahoo, no new provider.

---

## 4. SQZ — detailed audit

- Endpoint that supplies SQZ: `/portfolio/technical-refresh` (per‑symbol `technical['1D'].squeeze`,
  server.js:8308‑8309). Not the scanner, not market‑context.
- Frontend mapping: `buildBackendTechnicalByTickerFromResponse` (index.html:25199). The squeeze
  extraction (25309‑25319) sits **after** the early return at **25239**
  (`if (!technicalRespOk || !required1DParityConfirmed) return {usable:false}`).
- Parity gate keys: frontend `required1DKeys = ['rsi14','sma','distanceFromSma']` **unsuffixed**
  (25204). Backend default sets those `'confirmed'` (server.js:7237‑7239) but **downgrades to
  `'partial'` if ANY requested symbol lacks a complete 1D** (server.js:7741‑7744), and separately
  emits **suffixed** `rsi14_1d='confirmed'` (server.js:7771‑7773). The backend comment
  (server.js:7751) claims the frontend reads the `*_1d` keys — but it reads the **unsuffixed** ones
  (contract drift). Net effect: one cold symbol ⇒ parity `'partial'` ⇒ early return ⇒ **squeeze
  discarded for the whole batch**.
- Runtime `formulaParity: {}` + `returnedTechnicalsCount: 0` + "no 1D data" ⇒ **cold candle store**:
  the backend produced no 1D technicals at all, so there is no squeeze to map (and the frontend merge
  keeps its initial empty `formulaParity` at 25508).
- Misleading reason: skip‑reason priority (27028‑27031) reports `formula_parity_not_confirmed` even
  when the true cause is `returnedTechnicalsCount === 0` (no data). Backend already exposes the honest
  reason per symbol (`oneDReason = DXLINK_1D_CANDLE_CACHE_EMPTY`, server.js:7441/7578) and `with1d`.
- Squeeze key aliases already handled: `squeeze/squeezeOn/inSqueeze/sqz` (20491‑20498). `false`
  ('OFF') is preserved, not collapsed (19345).

**Minimal fix:** (a) make squeeze extraction parity‑independent (run it before the early return, or
in a dedicated pass), so a valid backend squeeze always renders; (b) correct the skip‑reason ordering
to prefer `no_technicals_in_response` / explicit `no_1d_candles` when `returnedTechnicalsCount === 0`;
(c) surface `oneDReason` as the SQZ cell reason (`no_1d_candles` / `insufficient_candles`). No scanner
or squeeze‑formula change.

---

## 5. Enriched endpoint audit — `POST /portfolio/{id}/positions/enriched`

Captured from code (server.js:12370‑12560). The payload is **option‑leg enrichment only**:
`{ ok, positions:[{ ticker, tradeId, legs:[{ …legMeta, greeks, quote, greeksStale, quoteStale,
greeksUnavailableReason }] }], options:{ [streamerSymbol]: {greeks,quote,…} },
optionResolutionDiagnostics, diagnostics }`.

It does **NOT** contain: SPY benchmark price, beta‑weighted delta / SPY‑EQ, earnings, SQZ, or
underlying technicals. Therefore βΔ SPY‑EQ, Earnings and SQZ **cannot** be sourced from enriched;
the frontend does not (and should not) look for them there. Enriched is correctly used only for
per‑leg greeks/quote + `greeksStale` provenance.

---

## 6. Greeks (not a primary blocker)

Market is closed and `lastGreeksEventAt: null`, so live greeks are unavailable
(`greeks stale because market is closed`). This is correctly classified and **does not** block
SPY‑EQ / Earnings / SQZ / IVR / Beta / Delta / Theta. Previous greeks are preserved
(`greeksStale: true`); when absent, an explicit `greeksUnavailableReason` is emitted
(server.js:12467‑12474). No change required.

---

## 7. Manual verification status

Live capture of `/version`, `/market/betas/latest`, `/market/earnings/latest`,
`/portfolio/technical-refresh`, and `/portfolio/{id}/positions/enriched` was **blocked**: this
session's egress policy returns HTTP 403 for
`apex-tastytrade-backend-dev-production.up.railway.app` (and prod). Per environment policy these
denials are reported, not routed around. Runtime confirmation of the SPY‑EQ inline‑reason and the
SQZ/earnings behavior must be done on the preview after the fix deploys (see §8 checklist).

Note: the preview already renders a distinct **βΔ WTD** column, which only exists after commit
`74ca79d`. So the preview is **not** stale w.r.t. the βΔ split — reinforcing that the SPY‑EQ "-" is
a genuinely missing input at render time (to be surfaced by the inline‑reason fix), not old code.

---

## 8. Minimal fixes — APPLIED (frontend-only; `apex-trading/index.html`)

Approved scope: SQZ + Earnings restored, beta-weighted-delta SPY-EQ diagnostic-only. Backend untouched.

1. **SQZ** - new `_extractBackendSqueezeByTicker` extracts squeeze (`squeeze/squeezeOn/inSqueeze/sqz`
   inside `technical['1D'|'4H']`) INDEPENDENT of the `required1DParityConfirmed` early return, and the
   refresh merges it into `backendTechnicalByTicker` (then `priceMap.squeeze`) regardless of
   `formulaParity`. When no squeeze can be sourced it records the backend's own reason (`oneDReason`)
   or explicit `no_1d_candles` / `insufficient_candles` / `squeeze_unavailable`, rendered in the SQZ
   cell tooltip. `_ingestRowMap` now also preserves `earnings` through the batch merge. No squeeze
   formula change.
2. **Earnings** - new `_applyTechnicalRefreshEarnings` maps `row.earnings.nextEarningsDate` from the
   technical-refresh response (already fetched) BEFORE the dedicated `GET /market/earnings/latest`
   call, so earnings populate without depending on that flaky round trip. The dedicated call stays
   non-fatal; its abort is classified `EARNINGS_TIMEOUT` (else `EARNINGS_UNAVAILABLE`) and surfaced in
   the cell tooltip. No Yahoo, no new provider, no global `ttFetch` change.
3. **SPY-EQ** - diagnostic only: the row renders the exact missing input inline
   (`MISSING_DELTA` / `MISSING_BETA` / `MISSING_UNDERLYING_PRICE` / `MISSING_SPY_PRICE`) and the
   headline card shows `SPY_PRICE_UNAVAILABLE` / `MISSING_BETA_WEIGHTED_DELTA`, plus a debug log,
   instead of a silent dash. The formula, beta source, and SPY resolution are UNCHANGED; a
   `CANDLE_CLOSE_FALLBACK` SPY price is still accepted (helpers gate only on `> 0`, no `isLive` gate).

Tests: `tests/portfolio-spy-eq-earnings-sqz-recovery.test.js` (32 assertions) + full suite 73/76
pass. The 3 failures are pre-existing and reproduce identically on the unmodified tree
(`journal-import-json`, `portfolio-entry-snapshot-fallback`, `portfolio-option-streamer-symbol` -
undefined cross-referenced helpers / an IVR-convention assertion, none in the touched paths).

Backend (`apex-backend`) - deliberately NOT changed (out of approved scope). The latent
`formulaParity` unsuffixed-vs-`*_1d` contract drift (server.js:7751 vs the frontend gate) is now
moot for SQZ because squeeze no longer depends on that gate; noted for a future backend-side
contract cleanup only.

### Verification checklist (post‑fix, on the preview)
- AMD `CACHE_PREVIOUS_PRICE` → row stays valid; βΔ SPY‑EQ renders a value **or** an explicit reason.
- SPY `CANDLE_CLOSE_FALLBACK` → βΔ SPY‑EQ populates.
- Earnings shows a date **or** `EARNINGS_TIMEOUT`/`EARNINGS_UNAVAILABLE`.
- SQZ shows value/status **or** `no_1d_candles`/`insufficient_candles`.
- No regression to Unreal P&L, Delta, Theta, Beta, βΔ WTD, IVR.
