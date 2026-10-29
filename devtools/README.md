# Apex Trading — DEV RV20/RV60 pilot audit

This is an **on-demand panel in the existing APEX DEV session**; it uses the already-loaded `S.backendKey` in memory. It never requests, prints, stores or exports the key. No backend flags are modified and no market data acquisitions are started.

The frontend's historical extraction contracts pin every byte of `index.html`. Because a new dashboard button would invalidate those signed reconstruction points, this diagnostic currently uses an **explicit, on-demand launcher** until a separately reviewed change introduces a legitimate extensibility point.

## Open in APEX DEV

1. Open the **current PR #551 deploy preview** at `https://deploy-preview-551--spontaneous-queijadas-118823.netlify.app`, log in to APEX there, and confirm that the active `BACKEND` is `https://apex-tastytrade-backend-dev-production.up.railway.app`. The ordinary production Netlify hostname is deliberately rejected; other DEV hosts are not automatically authorized.
2. In the browser DevTools **Console**, paste the following *once*:

```js
(()=>{if(document.getElementById('apex-rv-pilot-launcher'))return;const s=document.createElement('script');s.src='/devtools/rv-pilot-audit.js';document.head.appendChild(s);})();
```

3. Click the **RV20 / RV60 · DEV** button, then **Analizza i 20 titoli**. Four pages of five are read in sequence, pinned to the initial membership hash. Your existing APEX API key is sent only as an authenticated request header to the pinned Railway DEV backend.

### Bookmarklet alternative

Create a browser bookmark, paste this code into its **URL** field, then click the bookmark while logged into APEX DEV:

```text
javascript:(()=>{if(document.getElementById('apex-rv-pilot-launcher'))return;const s=document.createElement('script');s.src='/devtools/rv-pilot-audit.js';document.head.appendChild(s);})();
```

The panel has a secondary *exact preview hostname + DEV backend URL* check and will not initialize on the production Netlify host. If the button does not appear after loading, verify that the preview actually serves `/devtools/rv-pilot-audit.js`, that the page's content-security policy permits that same-origin script, and that `BACKEND` matches the exact DEV URL; do not work around the guard with an external script URL. The button is session-local and not permanently installed; the bookmarklet is repeatable. If the server returns 403 because diagnostic flags are disabled, it reports the error rather than changing settings.

### Non-goals / follow-up

This is not yet a native permanent dashboard button. Such an integration requires its own refactoring contract update to preserve the intentionally strict byte-exact extraction invariants. This PR deliberately makes **no modification to `index.html` or `js/**`**. No new `*.test.js` file is added (the suite cardinality remains pinned).

Do not run the bookmarklet on other sites. The loader is relative to the current origin; the module itself checks the exact DEV backend URL.

## D4 readiness checklist — provider headroom and evidence (2026-10-28)

The D4 preflight button is **GET-only and always NO-GO**. Its `admission.available`
proves only the local persistent SQLite admission schema is readable. It **does
not** prove account-wide market-data capacity, price finality, entitlement or
execution permission.

### DXLink provider budget — what is known versus unverified

Tastytrade's official streaming documentation publishes limits **per credential
set**: **5 concurrent DXLink market-data sessions**, 25,000 subscriptions per
session, 100 Candle/Order/Series subscriptions *for each event type*, and
10,000 subscription changes per minute:

- https://developer.tastytrade.com/docs/guides/rate-limits-and-backoff/
- https://developer.tastytrade.com/docs/concepts/streaming/
- https://developer.tastytrade.com/reference/accounts-and-customers/getApiQuoteTokens/

The GET `/api-quote-tokens` returns a token, DXLink URL and entitlement
level; **it is not an inventory of currently open sessions**. A connected
`MAIN FEED`, a valid local quote token or local subscription counts do not
prove how many other services, workers, browser clients, third-party tools or
other applications are using the *same tastytrade credentials*. The official
pages above do not provide a way to read the account-wide occupied session
count from the API response.

**Operator checklist before any live provider experiment** (outside this panel):
1. Identify every concurrently active market-data streamer using those exact
   credentials: DEV, both production services, other deployments/replicas,
   scripts, personal applications and third-party clients. Do not equate the
   number of Railway services with the number of WebSocket sessions.
2. Independently confirm the real provider-side concurrent-session occupancy
   and entitlement with trustworthy provider/account instrumentation or
   tastytrade support. If unknown, the result is **UNKNOWN / NO-GO**, even if
   local main feed reports healthy. Do not auto-set any attestation flag.
3. Verify quote-token entitlement and provider-side budget independently.
   A token's existence does not prove available additional streamer capacity.
4. Verify local DXLink health, lack of subscription pressure and SQLite
   shared gate, and the **current NYSE session close +45m** requirement.
   The current-date rule is re-evaluated on every request, including days
   after earlier missing sessions.
5. Keep `VOLATILITY_CARRY_EVIDENCE_DAILY_EXECUTION_ENABLED` and
   `VOLATILITY_CARRY_D4_PROVIDER_BUDGET_ATTESTED` absent/false until
   independently verified and explicitly approved. This panel never sets them.

### AAPL / SPY evidence triage

The preflight `symbols[].pendingSessionEvidence.rv20/rv60` names the exact
currently unvalidated 21/61-session windows, calculated by the existing
backend RV diagnostics. Expand **Verifica delle singole sedute** to view
*stored* candle, *structurallyValid*, *distinctAcquisitions* and
*observationSpanMs*. `null` or absent is **NON NOTO**. An empty pending list
is only a per-session finding, not proof of a usable RV.

For `OBSERVED_STABLE` the existing RV contract requires >=2 **distinct real
provider acquisitions**, observed at least **900000 ms (15 minutes)** apart,
and the same accepted OHLC fingerprint after any revision. Data must be
observed after the session close + the finalization grace, and must pass
REGULAR-session, structurally valid, source and corporate-action gates.
These are **necessary checks, not a claim of provider-confirmed finality**.
The backend's provider-final signal registry and corporate-actions
exhaustiveness registry are currently empty; never fabricate either.

On 2026-10-28 the authenticated audit showed both AAPL and SPY at RV20
19/21 and RV60 59/61, with 2026-10-26 and 2026-10-27 marked UNVERIFIED.
This is a **dated observation, not a permanent remediation list**. At every
subsequent preflight read the current `asOfSessionDate` and exact pending
dates again; new completed NYSE sessions may enter the rolling windows.

Do **not** backfill by inserting synthetic acquisitions, copying existing
candles, relabeling regular sessions, assuming 15 minutes elapsed makes a
candle stable, or marking split actions exhaustive. Do not start the D4 pilot
to "test" account capacity. Provider access is a separate, explicitly
authorized phase. The read-only panel makes **no requests beyond its existing
authenticated GET**, does not save tokens, and makes no trading decision.

## Volatility Coverage & Spread Monitor (DEV)

`devtools/volatility-coverage-monitor.js` is a second on-demand, **read-only** panel, under the same rules as the RV
panel above: the same DEV host and backend gate, the session's `S.backendKey` sent only as a request header, GET only,
no storage, no polling, and no change to `index.html` or `js/**`. Load it from the Console of the deploy preview:

```js
(()=>{if(document.getElementById('apex-vol-coverage-launcher'))return;const s=document.createElement('script');s.src='/devtools/volatility-coverage-monitor.js';document.head.appendChild(s);})();
```

Then click **IV − RV · DEV** and **Analizza universo**. The panel reads `GET /debug/volatility-carry/coverage` 25 symbols
at a time, in sequence. From page 2 on, every page is pinned to the universe digest of page 1, and a read whose RV
session date or IV date changes midway is refused. A timeout of 20 s applies to each page. Clicking a symbol reads
`GET /debug/volatility-carry/coverage/:symbol` once. These endpoints come from the matching `apex-backend` change; until
that change runs on DEV, the panel says *Endpoint non ancora disponibile*.

What it shows (every value is the backend's):

- **IV Ref**: the IV pilot's selected Regular expiry nearest 40 DTE, and nothing else. *IV Market* (the scanner's
  Tastytrade IV index, when the page holds it) is shown apart as informational only. It never enters a spread and never
  replaces a missing IV Ref.
- **RV20 / RV60**: labelled *certificata*, *preliminare* or *esplorativa*. An exploratory RV is never compared with IV.
  The last certified RV of the daily store is shown separately and never used for the current spread.
- **IV − RV20 / IV − RV60**: the backend's `100 × (ivRef − rv)` in percentage points, rounded to 2 decimals **only on
  screen**. The sign is the unrounded value's. The CSV keeps full precision. Green means IV > RV, red IV < RV, neutral
  equal, grey not available: the colours show the sign only and are not trading signals.
- For each unavailable spread, the missing operand (`IV_REF`, `RV20`, `RV60`, `TIMING`) and the engine's own code, with
  a readable explanation. Unknown codes are shown as they are, without an invented meaning.
- Detail: the counts of each 21 / 61-session window, and every session in it that is not validated. *Absent*, *present
  but structurally invalid*, *valid but not final* and *not REGULAR* are kept as separate facts. The detail also shows
  the corporate-action status and the IV timing and census. It never estimates how many days would make a window valid.

The summary counters are counts of the rows read. *Dati insufficienti* means at least one window without any RV.
*Problemi candele* means the backend's `candleQuality.issues` flag.
