# Portfolio Greeks — cross-browser audit (Chrome shows `--`, Firefox shows Greeks)

Same trade (ABBV `.ABBV260717P210`), same portfolio, same backend: Firefox renders
Greeks/totals, a **clean Chrome profile** shows the position but leaves
Greeks/totals as `--`. This documents the determined failure path and the fix.

> **Scope guard.** No change to option-symbol construction, Journal mapping,
> Portfolio CRUD, or the Greeks/totals/Beta-Weighted-Delta/Delta-Theta/Vega-Monitor
> formulas. The work only normalizes the `/portfolio/live-refresh` response shape,
> preserves previously-valid Greeks, orders applies, recovers a clean profile, and
> adds diagnostics + an explicit warning.

---

## 1. Determined failure path

From the Chrome console evidence (`greeks_unavailable`,
`no greeks available for .ABBV260717P210`, `legsLive currentPrice/bid/ask populated
but delta/theta/gamma/vega null`) and the code, the cause is **path E with a path‑A
trigger**, not a parser bug for the canonical shape:

| Path | Hypothesis | Verdict |
|---|---|---|
| A | Backend response contains **no** Greeks for the symbol this round | **Trigger** — `/portfolio/live-refresh` returned a fresh quote but `greeks_unavailable` for `.ABBV260717P210`. |
| B | Greeks present but frontend reads the wrong field | Not the canonical cause, but a **latent risk** — the cache-merge read only `o.greeks` and ignored `o.option.greeks` / `o.quote.greeks` / inlined shapes. Now normalized. |
| C | Backend returns **stale** Greeks and frontend rejects them | Not the trigger (quote was fresh, Greeks were absent, not merely stale). |
| D | Greeks applied then a later refresh / recalc overwrites with null | **Contributing** — a quote-only refresh rebuilt `legsLive` with null Greeks; with no prior cache to merge, the row blanked. |
| E | Firefox only works due to **previous local cache**, not a true backend response | **Primary** — `S.greeksCache` is in-memory only (never persisted). Firefox's session had an earlier refresh that resolved Greeks; those values survived later quote-only refreshes via `Object.assign`. A clean Chrome session never resolved Greeks once, so it had nothing to preserve. |

**In one line:** the row blanks whenever the backend returns a quote but no fresh
Greeks **and** there is no previously-valid Greek to preserve — exactly the state a
clean Chrome profile starts in.

### How the audit line pins it at runtime

`[PORTFOLIO-GREEKS-APPLY-AUDIT]` (one compact line per active option leg) makes the
path decidable by comparing a clean Chrome run to a Firefox run:

- `hasOptionPayload=false` → A (symbol absent from `options` map).
- `hasOptionPayload=true, hasGreeks=false, greeksStale=false, hasQuote=true` → A (quote only, no Greeks this round).
- `greeksStale=true` → C (backend flagged stale).
- `legHadGreeksBefore=true, legHasGreeksAfter=false` → D (overwrite — now prevented).
- `browser=firefox` populated while `browser=chrome` empty with `legHadGreeksBefore=false` → E (cache-only).

---

## 2. Fixes (all in `refreshPositionsLive` + new pure helpers)

1. **Parser normalization** — `_normalizeOptionGreeksPayload` / `_normalizeOptionQuotePayload`
   read Greeks/quote from every documented shape: `o.greeks`, `o.option.greeks`,
   `o.quote.greeks`, `greekValues`/`optionGreeks`, and Greeks inlined on the payload
   (`o.delta/…`), plus `volatility`/`impliedVolatility`/`iv` aliases. Normalized into
   `delta/theta/gamma/vega/volatility`.
2. **Preserve previously-valid Greeks** — `_applyOptionGreeksToCacheEntry` and the
   per-leg apply step keep prior finite Greeks (from the cache, the previous
   `legsLive`, or the stored journal trade) when a round returns no fresh Greeks. A
   quote-only / feed-stale refresh can **never null a valid Greek**.
3. **Out-of-order guard (sequence id)** — each refresh stamps a monotonic
   `S.portfolioGreeksApplySeq`; cache entries carry `greeksSeq`/`greeksAppliedAt`. An
   older-sequence response cannot overwrite newer Greeks, and a null/stale response
   never clears a newer valid state.
4. **Clean-browser recovery** — when active option legs still have no Greeks and
   nothing to preserve (and the market is open), a bounded direct Greeks read
   (`/market/greeks/:sym`) is attempted over a short poll budget, then applied to
   `legsLive` (net re-derived via the existing `_portfolioNetGreekFromActiveLegs`).
5. **Explicit warning** — if Greeks remain unavailable, a `warn` toast and
   `_apexPortfolioGreeksRefreshDiag.greeksWarning` are surfaced. Empty totals are
   never presented as a successful calculation.
6. **Audit** — `[PORTFOLIO-GREEKS-APPLY-AUDIT]` compact scalar line per refresh.

---

## 3. Regression tests

`tests/portfolio-greeks-apply-preserve.test.js` (exercises the real extracted helpers):

1. quote-only response after valid Greeks **preserves** the previous Greeks.
2. Greeks in an **alternate payload shape** are normalized and applied.
3. **out-of-order** refresh with null Greeks **cannot overwrite** newer valid Greeks.

Plus helper units (normalizers, leg snapshot, browser label) and integration wiring
assertions (audit line, recovery block, preservation, sequence id, warning).

```
node tests/portfolio-greeks-apply-preserve.test.js
node tests/portfolio-greeks-refresh-totals.test.js
node tests/portfolio-enriched-endpoint-shape.test.js
```
