# Portfolio Stress Test — Model Specification v1.0.0

**Status:** `specification`
**Version:** `1.0.0`
**Runtime implemented:** `false`
**Architecture decision:** `reuse_first_backend_batch_frontend_render`

This document is the **human normative source** for the future `STRESS TEST` dashboard.
`config/risk-models/portfolio-stress-test-v1.json` is its **machine-readable mirror**.
Divergence between the two is a contract violation, enforced by
`tests/portfolio-stress-model-contract.test.js`.

This PR implements **nothing**. It records what already exists, proves what does not,
assigns ownership, and binds every subsequent PR to those decisions.

---

## 0. Table of contents

1. [Base, provenance and recovery point](#1-base-provenance-and-recovery-point)
2. [Scope of this PR](#2-scope-of-this-pr)
3. [Architectural principle](#3-architectural-principle)
4. [Reuse Manifest](#4-reuse-manifest)
5. [Mechanical reuse audit](#5-mechanical-reuse-audit)
6. [ABSENCE PROOF](#6-absence-proof)
7. [Portfolio audit](#7-portfolio-audit)
8. [Canonical units](#8-canonical-units)
9. [Reference architecture](#9-reference-architecture)
10. [Contract IDs](#10-contract-ids)
11. [Functional objective](#11-functional-objective)
12. [Snapshot](#12-snapshot)
13. [Hypothetical overlay and entry price](#13-hypothetical-overlay-and-entry-price)
14. [Scenario model and IV shock](#14-scenario-model-and-iv-shock)
15. [Pricing](#15-pricing)
16. [Results, matrix and outputs](#16-results-matrix-and-outputs)
17. [Data quality](#17-data-quality)
18. [Performance and benchmark plan](#18-performance-and-benchmark-plan)
19. [Indicative future endpoint](#19-indicative-future-endpoint)
20. [Monolith boundary](#20-monolith-boundary)
21. [Open decisions](#21-open-decisions)
22. [Hash identity and zero-runtime-change proof](#22-hash-identity-and-zero-runtime-change-proof)
23. [Plan of subsequent PRs](#23-plan-of-subsequent-prs)
24. [Document ownership (AGENTS.md decision)](#24-document-ownership-agentsmd-decision)

---

## 1. Base, provenance and recovery point

### Frontend

| Field | Value |
| --- | --- |
| Repository | `Fede-ai-coder/apex-trading` |
| Base branch | `origin/dev-clean` |
| Base commit (HEAD at audit) | `c226f5f2dd865c38ebcf7efef855a8437c4c6a35` |
| Base commit subject | `Merge pull request #355 from Fede-ai-coder/claude/swing-chart-cache-freshness-h1gjve` |
| Base commit date | `2026-07-31T16:51:17+02:00` |
| Working tree at audit start | clean (`git status --porcelain` empty) |
| Tracked files | 150 |
| `index.html` | 2 318 333 bytes |
| Extracted modules under `js/` | 24 |
| Test files | 106 |
| **Recovery point** | `c226f5f2dd865c38ebcf7efef855a8437c4c6a35` |

Sources **explicitly excluded** from the base, as required: PR #310, PR #352, PR #357,
any open or draft PR, any feature branch, any backup branch, and any commit not reachable
from `origin/dev-clean`. PR #357 remains entirely separate from this work.

### Frontend suite — before

```
$ node --test 'tests/*.test.js'
# tests 106
# pass 106
# fail 0
# duration_ms 34191.710682
```

> Note on the suite command: `node --test tests/` fails with `MODULE_NOT_FOUND` on this
> repository layout (Node 22 resolves the bare directory as a module). The working
> invocation is the glob form above. This is a pre-existing property of the repository,
> not something introduced here.

### Backend

| Field | Value |
| --- | --- |
| Repository | `Fede-ai-coder/apex-backend` |
| Branch analysed | `main` |
| Commit analysed | `6eebb9999a181084f1bda97c157b411986544a6d` |
| Commit subject | `Merge pull request #207 from Fede-ai-coder/claude/apex-option-chain-timeout-q6frrr` |
| Commit date | `2026-07-06T17:21:23+02:00` |
| Access mode | **READ ONLY** |
| Backend files modified by this PR | **0** |
| `server.js` | 18 939 lines |
| `lib/` modules | 43 |
| Backend test files | 65 |
| Express routes | 95 |

### Relevant open PRs

The audit deliberately does not read from open PRs. PR #357 in particular, if still open,
is not a source for this specification and must remain fully separate.

---

## 2. Scope of this PR

This PR is **exclusively**: audit, normative documentation, architecture, Reuse Manifest,
machine-readable contract, contract tests, mutation proof of the contract, and the plan of
subsequent PRs.

It **does not** implement: a working dashboard, a pricing engine, a stress engine, backend
endpoints, a runtime scenario matrix, a runtime hypothetical-option builder, behavioural
changes to Portfolio, new network calls, new runtime caches, new subscriptions, new timers,
or new production formulas.

### Files added

```
docs/risk-models/portfolio-stress-test-v1.md
config/risk-models/portfolio-stress-test-v1.json
tests/portfolio-stress-model-contract.test.js
tests/portfolio-stress-architecture-contract.test.js
tests/portfolio-stress-reuse-contract.test.js
```

### Files that must remain untouched

`index.html`, `js/**`, `css/**` — see [§22](#22-hash-identity-and-zero-runtime-change-proof).

Nothing is added to `index.html`: no comment, no documentation, no formula, no configuration,
no `<script>` tag, no CSS link, no mount point, no navigation entry, no state, no bootstrap,
and no reference to `STRESS TEST`.

---

## 3. Architectural principle

```
REUSE FIRST
EXTEND SECOND
CREATE NEW ONLY AFTER ABSENCE PROOF
```

No new responsibility may be introduced before it has been proven that it does not already
have a canonical owner. A new file is not automatically a good separation. A new file that
re-implements an existing responsibility is a duplication and must be rejected.

---

## 4. Reuse Manifest

Decision vocabulary — exactly one per responsibility:

| Decision | Meaning |
| --- | --- |
| `REUSE` | The responsibility already exists and must be called directly. |
| `EXTEND` | A correct owner exists but needs additional capability, added inside that owner or via thin composition — never by re-transcribing its logic. |
| `NEW` | No equivalent owner was found after a mechanical audit. Requires an absence proof. |
| `UNAVAILABLE` | The datum or behaviour cannot be honestly built from current sources. No fallback is invented. |

Line references are to the base commit. Frontend paths are in `apex-trading`; backend paths
are in `apex-backend`.

| Responsibility | Existing owner | Repository | Callers | Data/source | Decision | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| portfolio scope | `getOpenPortfolioRiskPositions`, `_portfolioPositionBelongsToPortfolio`, `_portfolioIdEq` | apex-trading | 2 (`aggregateGreeks`, `computePortfolioRiskMetrics`) | `positionManager.getByPortfolio(_activePanelPortfolioId)` | **REUSE** | `index.html:18593`, `:18588`, `:18582`; tests `portfolio-active-legs-audit`, `portfolio-greeks-scope-audit`, `portfolio-risk-metrics` |
| open-position filtering | `_portfolioTradeIsOpenForRisk` | apex-trading | 5 | `trade.status\|tradeStatus\|lifecycleStatus\|closeStatus\|state` | **REUSE** | `index.html:18571`; tests `portfolio-active-legs-audit`, `portfolio-greeks-scope-audit` |
| active-leg filtering | `isActivePortfolioLeg`, `getActivePortfolioLegs`, `_isTerminalPortfolioLeg`, `_portfolioLegHasCloseMarker` | apex-trading | 20 | leg status + close markers + residual qty | **REUSE** | `index.html:18665`, `:18679`, `:18652`, `:18638`; alias `_isActivePortfolioLeg` at `:18675`; tests `portfolio-active-legs-audit`, `portfolio-greeks-refresh-totals`, `portfolio-bwd-spy-missing` |
| residual quantity | `_portfolioLegEffectiveQty`, `_portfolioLegExplicitOpenQty`, `_portfolioFirstFiniteField` | apex-trading | 16 | 9 explicit residual fields, then `qty\|quantity\|contracts` | **REUSE** | `index.html:18630`, `:18618`, `:18610`; tests `portfolio-active-legs-audit`, `portfolio-greeks-refresh-totals`, `portfolio-unrealized-pnl` |
| SPY price resolution | one **three-part composed** owner: `resolveFreshSpyPrice` + `resolvePortfolioLivePrice` + `_resolveSpyPrice` | apex-trading | 13 | `/market/live/SPY` → `/market/quotes?symbols=SPY` → `/scanner?symbols=SPY` → `S.marketContextSnapshot`, then priceMap → aggregated live-refresh → previous cache → candle close (last resort) | **REUSE** | `index.html:19457`, `:19591`, `:19044`; single orchestration site at `:26735`; tests `portfolio-spy-price-freshness`, `portfolio-price-resolver-cascade`, `portfolio-bwd-spy-missing` |
| option-symbol construction | `buildCanonicalOptionSymbol` (backend, canonical for stress); `buildCompactOptionDxlinkSymbol` + `getPreferredOptionDxlinkSymbol` (frontend) | apex-backend + apex-trading | 10 | structured leg | **REUSE** | `lib/option-symbol.js:58`; `js/utils/option-symbols.js:55`; `index.html:22718`; tests `option-symbol.test.js` (BE), `portfolio-option-streamer-symbol`, `pure-utils-extraction` |
| option-chain retrieval | `fetchOptionChainNested` + `GET /option-chains/:symbol/nested` | apex-backend | 1 | Tastytrade nested chain via `ttFetch` | **REUSE** | `lib/option-chain-nested.js:246`; `server.js:5841`; test `option-chain-nested.test.js` |
| option-chain cache | `OptionChainCache` + `optionChainCache` singleton + `withCacheMeta` | apex-backend | 1 | wraps `fetchOptionChainNested` | **REUSE** | `lib/option-chain-cache.js:51`, `:150`, `:138`; test `option-chain-cache.test.js` |
| quote retrieval | `dxLinkManager.quoteCache` / `optionQuoteCache` via `/portfolio/live-refresh`, `/market/quotes`, `/market/live/:symbol`, `/market/option-live/:symbol` | apex-backend | 8 | DXLink Quote events | **REUSE** | `server.js:701`, `:711`; routes `:5059`, `:7269`, `:7294`, `:10979`; tests `portfolio-endpoints`, `portfolio-positions-enriched`, `no-yahoo-portfolio-quotes` |
| Greeks retrieval | `dxLinkManager.greeksCache` + `GET /market/greeks/:symbol` + live-refresh | apex-backend | 6 | DXLink Greeks events | **REUSE** | `server.js:705`, `:7275`, `:7397`, `:7409`; tests `portfolio-positions-enriched` (BE), `portfolio-greeks-refresh-totals`, `portfolio-greeks-stale-display` |
| beta retrieval | `lib/beta-provider.js` + `lib/beta-store.js` + `GET /market/betas/latest`; FE cache `_apexLatestBetaBySymbol` | apex-backend + apex-trading | 5 | Tastytrade → yahoo_beta → self_benchmark, persisted in `symbol_betas` | **REUSE** | `lib/beta-provider.js:196`; `lib/beta-store.js:245`; `server.js:18878`; `index.html:19729`, `:19749`; tests `beta-provider`, `beta-endpoints`, `portfolio-tastytrade-beta-latest`, `portfolio-beta-refresh` |
| VIX retrieval | `buildVixFamilySnapshot` + `GET /market-context/vix-family/live`; FE `S.vixFamily` | apex-backend + apex-trading | 4 | DXLink index-level cache for `$VIX.X`, `$VIX9D.X`, `$VIX3M.X`, `$VIX6M.X` | **REUSE** | `server.js:10395`, `:10308`, `:10612`; `index.html:1505`; tests `vix-family-live-endpoint` (BE), `vix-family-backend-source`, `vix-family-premature-close` |
| market snapshot | `GET /market-context/snapshot` + `computeTechnicals` | apex-backend | 2 | DXLink candle cache (SPY, VI3M) + `buildVixFamilySnapshot` | **EXTEND** | `server.js:10482`; `lib/market-context.js:240`; test `market-context-snapshot.test.js`. Owner exists and already carries VIX + freshness; **missing** run-scoped identity (`snapshotId`, hashes, SPY/VIX source+timestamp). Additive metadata on the same owner. |
| HTTP transport | `ttCall`, `_ttCallWithRetry` | apex-trading | 75 references over 24 endpoint paths | `BACKEND` base URL | **REUSE** | `js/api/backend-client.js:16`, `:71`; tests `backend-client-contract`, `backend-config-contract` |
| authentication | FE `ttCall` header assembly + `_backendAuthHeaders`; BE `requireApiKey` | apex-trading + apex-backend | 39 | `S.ttSessionId`, `S.backendKey`; BE `API_KEY` | **REUSE** | `js/api/backend-client.js:16-24`, `:43`; `server.js:2376`; tests `backend-client-contract`, `backend-candle-auth-gate` |
| retry/error classification | FE `_isTransientFetchError`, `_httpStatusFromError`, `_ttCallWithRetry`; BE `classifyOptionChainError`, `OptionChainError`, `isAbortLikeError` | apex-trading + apex-backend | 9 | error message/name strings | **REUSE** | `js/api/backend-client.js:96`, `:115`, `:71`; `lib/option-chain-nested.js:144`, `:49`, `:67`; tests `backend-client-contract`, `journal-transient-sync-resilience`, `option-chain-nested` |
| **pricing** | *(none)* | — | 0 | — | **NEW** | See [ABSENCE-PRICING](#61-absence-pricing--pricing-engine) |
| **scenario calculation** | *(none)* | — | 0 | — | **NEW** | See [ABSENCE-SCENARIO](#62-absence-scenario--scenario-engine) |
| **matrix calculation** | *(none)* | — | 0 | — | **NEW** | See [ABSENCE-MATRIX](#63-absence-matrix--matrix-engine) |
| UI state | `_activePanelPortfolioId`, `positionManager`, the `S` global | apex-trading | 50 | in-memory only; selection deliberately not persisted | **EXTEND** | `index.html:20288`, `:17640`, `:1500` region, non-persistence noted at `:17757`; tests `portfolio-storage-recovery`, `portfolio-debug-tools`. Selection is reused read-only; the ephemeral overlay slice is additive and must never write to `S.portfolioData`, `positionManager` or `localStorage`. |
| **UI rendering** | *(none for stress)* | — | 0 | — | **NEW** | See [ABSENCE-STRESS-UI](#66-absence-stress-ui--stress-test-ui). Follows the existing `js/ui/*-panel.js` extraction pattern (3 such modules exist), but owns a genuinely new responsibility. |

### Supplementary responsibilities (from §32 of the request)

| Responsibility | Existing owner | Repository | Decision | Evidence / constraint |
| --- | --- | --- | --- | --- |
| stress result cache | *(none)* | — | **NEW** | [ABSENCE-STRESS-CACHE](#64-absence-stress-cache--stress-result-cache). Caches **results only**, keyed on `snapshotId + scenarioHash + overlayHash`. Market data stays in the existing caches. |
| ephemeral overlay state | *(none)* | — | **NEW** | [ABSENCE-OVERLAY-STATE](#67-absence-overlay-state--ephemeral-overlay-state). In-memory only. |
| snapshot invalidation | *(none)* | — | **NEW** | [ABSENCE-SNAPSHOT-INVALIDATION](#65-absence-snapshot-invalidation--snapshot-invalidation). Must emit `INPUTS CHANGED — RERUN REQUIRED`. |
| single-flight / coalescing | `createRequestCoalescer` | apex-backend | **REUSE** | `lib/request-coalescer.js:29`, already used by the option-chain cache; test `request-coalescer.test.js` |
| server-side portfolio hydration by id | `buildPortfolioPositionsFromJournal` | apex-backend | **REUSE** | `server.js:12980`, used by `POST /portfolio/:portfolioId/positions/enriched`; tests `portfolio-positions-enriched`, `journal-portfolio-link` |

### Blockers on reused owners

None of the frontend portfolio helpers is exported on `window`. They are top-level
declarations inside the inline monolith and are reachable from an external **classic**
script loaded after `index.html` through lexical global scope — the same mechanism
`js/api/backend-client.js` already relies on in the opposite direction. They are **not**
reachable from an ES module or a worker.

Per §7 of the request, this is recorded as a blocker. It is **not** grounds for creating a
renamed copy: `PST-REUSE-003` forbids that unconditionally.

Two further blockers, both **partial**, and both requiring an *extension of the existing
owner* rather than a replacement:

- **SPY provenance is computed but not plumbed.** `resolveFreshSpyPrice` already returns
  `{price, source, isLive, stale, priorityUsed, reason, attempts}` — which is exactly the
  `spyPriceSource` / `spyPriceTimestamp` metadata `PST-SPY-003` requires. `_resolveSpyPrice`
  then discards everything except the number, and nothing transmits the triple to the
  backend. This is missing plumbing on an owner that already computes the answer, **not** a
  missing capability. See [PST-OPEN-008](#21-open-decisions).
- `ttCall` hardcodes `AbortSignal.timeout(20000)` and ignores `opts.headers`. A longer
  matrix budget must be an explicit parameterization of `ttCall` (`PST-TRANSPORT-004`).

### Note on the SPY owner being three functions

`PST-REUSE-002` requires one canonical owner per responsibility, and SPY resolution has
**one** — composed of three functions with distinct, documented roles, orchestrated from a
single call site (`index.html:26728-26745`):

1. `resolveFreshSpyPrice` (`:19457`) — the Portfolio-only **benchmark** resolver. SPY is the
   βΔ denominator, so before the Portfolio accepts a stale candle close it exhausts the
   fresher sources in order (`market_live` → `scanner` → `market_context`), recording per
   source whether it was attempted, succeeded or rejected, and why.
2. `resolvePortfolioLivePrice` (`:19591`) — the **generic per-symbol** resolver, invoked for
   SPY with `allowLiveFetch:false` (so it never re-runs the live fan-out
   `resolveFreshSpyPrice` just did) and with `allowCandle` gated on *both* fresher paths
   having failed.
3. `_resolveSpyPrice` (`:19044`) — a **pure reader** over values already resolved, used on
   the risk-metrics path.

The live `priceMap` short-circuits the whole chain with no fetch at all, so a healthy refresh
makes **zero** additional SPY calls. This is composition, not duplication, and
`tests/portfolio-stress-reuse-contract.test.js` allowlists exactly these three names — a
fourth SPY-resolver-shaped definition fails the build regardless of what it is called.

---

## 5. Mechanical reuse audit

The audit did not rely on the names suggested in the request. It searched by declaration,
by call site, by endpoint path, by log string, by response field, by test, by cache key, by
option-symbol format, by global state, by call graph, and by reconstructing the application
source through `tests/lib/load-app-source.js`.

### 5.1 Anchor verification

Every anchor name from §7 of the request, verified against the current head of `dev-clean`:

| Anchor | Exists | Declared in | Declarations | Refs in `index.html` | Test files referencing | Already extracted |
| --- | --- | --- | --- | --- | --- | --- |
| `ttCall` | yes | `js/api/backend-client.js:16` | 1 | 75 | 30 | **yes** |
| `_backendAuthHeaders` | yes | `js/api/backend-client.js:43` | 1 | 39 | 28 | **yes** |
| `_ttCallWithRetry` | yes | `js/api/backend-client.js:71` | 1 | 4 | 6 | **yes** |
| `_isTransientFetchError` | yes | `js/api/backend-client.js:96` | 1 | 2 | 6 | **yes** |
| `_httpStatusFromError` | yes | `js/api/backend-client.js:115` | 1 | 3 | 3 | **yes** |
| `getOpenPortfolioRiskPositions` | yes | `index.html:18593` | 1 | 3 | 8 | no — monolith |
| `getActivePortfolioLegs` | yes | `index.html:18679` | 1 | 3 | 8 | no — monolith |
| `isActivePortfolioLeg` | yes | `index.html:18665` | 1 | 20 | 14 | no — monolith |
| `_isActivePortfolioLeg` | yes | `index.html:18675` | 1 (thin alias) | 1 | 8 | no — monolith |
| `_portfolioLegEffectiveQty` | yes | `index.html:18630` | 1 | 16 | 13 | no — monolith |
| `_portfolioLegExplicitOpenQty` | yes | `index.html:18618` | 1 | 3 | 13 | no — monolith |
| `_isTerminalPortfolioLeg` | yes | `index.html:18652` | 1 | 2 | 12 | no — monolith |
| `_resolveSpyPrice` | yes | `index.html:19044` | 1 | 6 | 6 | no — monolith |
| `resolvePortfolioLivePrice` | yes | `index.html:19591` | 1 | 7 | 3 | no — monolith |
| `resolveFreshSpyPrice` † | yes | `index.html:19457` | 1 | 7 | 1 | no — monolith |
| `aggregateGreeks` | yes | `index.html:18834` | 1 | 16 | 11 | no — monolith |
| `computePortfolioRiskMetrics` | yes | `index.html:19170` | 1 | 6 | 4 | no — monolith |
| `computeRowBetaWeightedDelta` | yes | `index.html:19088` | 1 | 6 | 12 | no — monolith |
| `_portfolioNetGreekFromActiveLegs` | yes | `index.html:18692` | 1 | 4 | 12 | no — monolith |
| `buildStreamerSymbol` | yes | `js/utils/option-symbols.js:22` | 1 | 9 | 6 | **yes** |
| `getPreferredOptionDxlinkSymbol` | yes | `index.html:22718` | 1 | 10 | 5 | no — deliberately retained (reads `S`, emits `console.warn`) |
| `positionManager` | yes | `index.html:17640` | 1 | 50 | 8 | no — monolith |
| `S.portfolioData` | yes | `S` global | — | 17 | — | no — monolith |
| `_activePanelPortfolioId` | yes | `index.html:20288` | 1 | 14 | — | no — monolith |

† `resolveFreshSpyPrice` is **not** in the request's anchor list. It was found by the
structural anti-duplication scan in `tests/portfolio-stress-reuse-contract.test.js`, which
searches by *shape* rather than by guessed name — precisely the "no weak nominal search"
requirement. It is a genuine part of the canonical SPY owner and is recorded as such above.
Missing it would have produced an incomplete SPY manifest row and a wrong blocker.

Each of these is **canonical** (exactly one definition), and none is a duplicate. The single
alias in the set, `_isActivePortfolioLeg`, is a one-line delegation to `isActivePortfolioLeg`
— evidence the repository has already rejected a second implementation of active-leg
filtering once.

`js/utils/option-symbols.js` carries an explicit audit note explaining why
`getPreferredOptionDxlinkSymbol` was **not** extracted: it reads `S.debugPortfolioRefresh`
and emits `console.warn`. That is an ownership decision already taken and must be respected.

### 5.2 Ownership map

```
FRONTEND (apex-trading)
├── js/api/backend-client.js ......... transport, auth, retry, error classification
├── js/config/backend-config.js ...... BACKEND base URL
├── js/utils/option-symbols.js ....... pure option-symbol builders/parsers
├── js/utils/normalizers.js .......... normalizeGreekPoints, normalizeIvrPercent
├── js/utils/indicators.js ........... pure indicator math
├── js/services/* (12) ............... candle pipeline, snapshot services
├── js/adapters/* (2) ................ backend snapshot adapters
├── js/ui/* (3) ...................... extracted panels  ← pattern for the future stress panel
└── index.html (monolith)
    ├── portfolio scope / active-leg / residual quantity helpers   18571–18700
    ├── aggregateGreeks                                            18834
    ├── _resolveSpyPrice, computeRowBetaWeightedDelta              19044, 19088
    ├── computePortfolioRiskMetrics                                19170
    ├── resolvePortfolioLivePrice                                  19591
    ├── beta cache + refreshPortfolioBetas                         19729, 19749
    ├── positionManager, _activePanelPortfolioId                   17640, 20288
    ├── getPreferredOptionDxlinkSymbol + alias normalizers         22718
    ├── _optChainCache (frontend chain cache)                      22710
    └── portfolio refresh orchestration (refreshPositionsLive)     25520

BACKEND (apex-backend)
├── lib/option-symbol.js ............. buildCanonicalOptionSymbol (canonical)
├── lib/option-chain-nested.js ....... fetchOptionChainNested + structured errors
├── lib/option-chain-cache.js ........ TTL / SWR / stale fallback / coalescing
├── lib/request-coalescer.js ......... single-flight
├── lib/market-context.js ............ computeTechnicals + classifiers
├── lib/beta-provider.js, beta-store.js  beta resolution + persistence
├── lib/portfolio-store.js, portfolio-sqlite-store.js, portfolio-recovery.js
└── server.js
    ├── dxLinkManager caches: quote 701, greeks 705, optionQuote 711,
    │                         candle 716, indexLevel 783
    ├── requireApiKey                                              2376
    ├── buildVixFamilySnapshot                                     10395
    ├── GET  /market-context/snapshot                              10482
    ├── GET  /market-context/vix-family/live                       10612
    ├── POST /portfolio/live-refresh                               10979   ← production path
    ├── POST /portfolio/technical-refresh                          7747
    ├── POST /portfolio/:portfolioId/positions/enriched            12969   ← server-side hydration
    ├── POST /portfolio/full-refresh                               14558   ← AVAILABLE_NOT_ADOPTED
    ├── GET  /option-chains/:symbol/nested                         5841
    ├── GET  /market/betas/latest                                  18878
    └── GET  /eic/legs/:symbol                                     6637    ← hosts dead approxDelta
```

### 5.3 Call graph — portfolio risk path

```
_startPortfolioAutoRefresh (index.html:17116, setInterval 60000)
└── refreshPositionsLive (25520)
    ├── fetchBackendPortfolioPositionsEnriched  → POST /portfolio/:portfolioId/positions/enriched
    ├── ffBackendOffloadV1() ? fetchPortfolioFullRefresh → POST /portfolio/full-refresh   [flag OFF by default]
    │                        └── on failure → fetchPortfolioLiveRefresh
    ├── fetchPortfolioLiveRefresh               → POST /portfolio/live-refresh            [production path]
    ├── fetchPortfolioTechnicalRefresh          → POST /portfolio/technical-refresh
    ├── resolvePortfolioLivePrice (19591)       [per-symbol, only for symbols the batch left unresolved]
    │   ├── priceMap
    │   ├── ttCall('/scanner?symbols=…')
    │   ├── fetch BACKEND + '/market/live/:sym'
    │   ├── fetch BACKEND + '/market/quotes?symbols=…'
    │   └── aggregated live-refresh response → previous cached value
    └── SPY benchmark (26728–26745) — one orchestration, three composed functions
        ├── priceMap.SPY present?  → short-circuit, ZERO extra calls
        ├── resolveFreshSpyPrice (19457)  [only when SPY is absent from priceMap]
        │   ├── GET /market/live/SPY → GET /market/quotes?symbols=SPY   (source=market_live)
        │   ├── ttCall('/scanner?symbols=SPY')                          (source=scanner)
        │   └── S.marketContextSnapshot                                 (source=market_context)
        │   → { price, source, isLive, stale, priorityUsed, reason, attempts }
        └── resolvePortfolioLivePrice('SPY', { allowLiveFetch:false,
                                               allowCandle: no fresher source resolved })

renderPositionsPanel
└── aggregateGreeks (18834)
    ├── getOpenPortfolioRiskPositions (18593) → _portfolioTradeIsOpenForRisk (18571)
    ├── getActivePortfolioLegs (18679)        → isActivePortfolioLeg (18665)
    │                                             ├── _isTerminalPortfolioLeg (18652)
    │                                             ├── _portfolioLegHasCloseMarker (18638)
    │                                             └── _portfolioLegEffectiveQty (18630)
    │                                                 └── _portfolioLegExplicitOpenQty (18618)
    └── normalizeGreekPoints (js/utils/normalizers.js:12)   [delta, theta only]

computePortfolioRiskMetrics (19170)
├── getOpenPortfolioRiskPositions (18593)
├── _resolveSpyPrice (19044)
├── _portfolioNetGreekFromActiveLegs (18692)
└── computeRowBetaWeightedDelta (19088)
    ├── _apexLatestBetaBySymbol (19729)  ← GET /market/betas/latest
    └── _scanDataField (19062)
```

The future stress path must attach at the marked reuse points and **must not** re-enter this
graph with parallel copies.

### 5.4 Endpoints actually called by the frontend

Via `ttCall`: `/account/`, `/eic/chain-symbols/`, `/eic/legs/`, `/journal/*`,
`/market-context/snapshot`, `/market-context/vix-family/live`, `/market/candles*`,
`/market/earnings/`, `/options/ivr/`, `/pess/chain/`, `/pess/term-structure/`,
`/portfolios*`, `/quote-token`, `/scanner?symbols=`.

Via direct `fetch(BACKEND + …)`: `/auth/login`, `/dxlink/*`, `/health`, `/market/candles*`,
`/market/greeks/`, `/market/live/`, `/market/option-live/`, `/market/quotes`,
`/portfolio/full-refresh`, `/portfolio/live-refresh`, `/portfolio/technical-refresh`,
`/scanner/*`.

### 5.5 Endpoint exists ≠ endpoint adopted

`POST /portfolio/full-refresh` — full reconstruction:

| Aspect | Finding |
| --- | --- |
| Backend route | `server.js:14558` |
| Request schema | `{ positions[], benchmark='SPY', includeTechnicals, includeBeta, includeBwd, includeExitAlerts }`; returns `400 'positions required'` for an empty array |
| Response schema | `{ underlyings, underlyingsBySymbol, options, positions, betaBySymbol, betaWeightedDelta, portfolioAlignmentBySymbol, exitAlertsByPositionId, suggestedDeltaBand, fullRefreshDiagnostics, technicalsIncluded }` |
| Backend tests | `tests/portfolio-endpoints.test.js` |
| Frontend caller | `fetchPortfolioFullRefresh` (`index.html:23381`), invoked at `index.html:25795` |
| Feature flag | `ffBackendOffloadV1()` (`index.html:16831`) |
| Flag default | **OFF** — requires `localStorage.apex_ff_backend_offload_v1 === '1'` |
| Fallback | returns `null` on any failure; caller falls back to `fetchPortfolioLiveRefresh` with `fallbackToLegacyReason='full_refresh_failed'` |
| **Adoption status** | **`AVAILABLE_NOT_ADOPTED`** |

The route exists, is tested, and has a real caller — but the caller is gated behind a flag
that defaults to `false`. It is **not** part of the current production flow and must not be
described as such. `POST /journal/trades/enriched` is in the same state, explicitly labelled
*"dry-run for comparison only"* at `index.html:40052`.

The production portfolio path is `POST /portfolio/live-refresh`.

---

## 6. ABSENCE PROOF

Search axes applied to every claim below: declaration names, call sites, endpoint paths, log
strings, response field names, tests, cache keys, dependency manifests, documentation, dead
code, and the base branch. A responsibility is **not** declared absent merely because a
guessed name is missing — the search also covered formulas, inputs, outputs, characteristics,
dependencies and produced fields.

### 6.1 ABSENCE-PRICING — pricing engine

**Conclusion: `NO_CANONICAL_OWNER`.**

Terms searched across `apex-trading` (`index.html`, `js/**`, `tests/**`, root docs) and
`apex-backend` (`server.js`, `lib/**`, `tests/**`, `docs/**`, `package.json`):

`black-scholes`, `black scholes`, `merton`, `binomial`, `cox-ross`, `cox ross rubinstein`,
`rubinstein`, `theoretical value`, `theoValue`, `implied volatility solver`, `ivSolver`,
`newton-raphson`, `bisection`, `finite difference`, `early exercise`, `american option`,
`american style`, `european option`, `european style`, `exerciseStyle`, `intrinsic floor`,
`discount factor`, `dividend yield`, `riskFreeRate`, `risk-free`, `cumulativeNormal`,
`normCdf`, `erf(`, `N(d1)`, `repricing`, `vega × ΔIV`.

**Three hits. None is an owner.**

**(a) `approxDelta` — `apex-backend server.js:6643` — DEAD CODE.**

A route-local closure inside `GET /eic/legs/:symbol`:

```js
// ── Approximate delta via Black-Scholes d1 (no dividends) ──────
// Returns estimated delta for a European option given iv, dte, spot, strike.
// Used ONLY when real-time Greeks unavailable. Labelled as "estimated".
function approxDelta(type, spot, strike, ivDecimal, dteDays) {
  if (!ivDecimal || ivDecimal <= 0 || dteDay <= 0) return null;
  const T  = dteDay / 365;
  ...
}
```

Why it is not an owner:

- **Unreachable.** `grep -n 'approxDelta' server.js` returns **only the declaration line**.
  There is no call site anywhere in the repository.
- **Provably non-functional.** The parameter is `dteDays`; the body reads `dteDay` on two
  lines. Invoking it would throw `ReferenceError`.
- **Not exported.** It is a closure inside a route handler, not on any module boundary.
  `server.js` has no `export` and no `module.exports`.
- **Delta only.** No option value, no gamma, no vega, no theta.
- **No dividends, European only**, self-described as "estimated".
- **No test.**

It cannot be reused, extended, or delegated to.

**(b) Frontend `black-scholes` / `theoretical value` occurrences — PROHIBITIONS, NOT CODE.**

Every occurrence in `index.html` is inside an AI-analyst prompt string that *forbids*
estimation:

- `index.html:2183` — *"Use ONLY the real strikes from the data. Do NOT compute or substitute theoretical values."*
- `index.html:2232` — *"[ESTIMATED] = Black-Scholes calculation, NOT market data"*
- `index.html:16405` — *"NON stimare greeks. NON usare [THEORETICAL]. NON usare Black-Scholes."*
- `index.html:16666` — *"All greeks/bid/ask above are LIVE from DXLink. Do not estimate or use theoretical values."*

This is prompt copy. It is positive evidence that the application deliberately has no pricing
model today.

**(c) `index.html:15470` `data.DividendYield`** — an Alpha Vantage `OVERVIEW` fundamental
rendered as text. Never used in a calculation.

**Dependency check.** Neither repository declares any options-pricing, quant or math library.
`apex-backend`: `express`, `cors`, `node-fetch`, `dotenv`, `yahoo-finance2`, `better-sqlite3`,
`node-cron`, `ws`. `apex-trading` has no `package.json` at all and loads exactly one remote
CDN script, which `tests/lib/load-app-source.js` classifies and deliberately excludes from
application source.

**Greeks provenance.** Every Greek in the system today **arrives** from DXLink; none is
computed. `hasFreshOptionGreeks` (`server.js:7397`) and `hasUsableOptionGreeks` (`:7409`)
only validate the freshness of received values.

**Verdict:** pricing may be classified `NEW`. It is the only genuinely new *numerical*
responsibility with no partial owner.

### 6.2 ABSENCE-SCENARIO — scenario engine

**Conclusion: `NO_CANONICAL_OWNER`.**

- `grep -ric 'stress' --include=*.js --include=*.json --include=*.md` over `apex-backend`
  returns **zero** matches.
- `index.html` contains 12 `stress` occurrences, all belonging to `vixStressFlag`
  (`:30646`–`:30655`, `:33938`–`:33953`, `:39366`) — a **classifier** producing
  `NORMAL | SHORT_TERM_STRESS | FULL_CURVE_STRESS | UNKNOWN` from the *observed* VIX curve
  ordering. It applies no shock, prices nothing, and produces no P&L.
- The 85 `overlay` occurrences are chart series overlays and modal overlays — an unrelated
  homonym with no position-overlay semantics.
- The 11 `scenario` occurrences in `apex-backend lib/portfolio-recovery.js` are data-recovery
  scenarios for the SQLite store.

**Verdict:** scenario calculation may be classified `NEW`.

### 6.3 ABSENCE-MATRIX — matrix engine

**Conclusion: `NO_CANONICAL_OWNER`.** The two `matrix` occurrences in `index.html` are
CSS/layout usage. No numerical batch evaluation exists anywhere.

Note that **batching itself is not new**: `POST /portfolio/live-refresh` already demonstrates
the batch-hydration pattern the matrix engine must follow.

**Verdict:** matrix calculation may be classified `NEW`.

### 6.4 ABSENCE-STRESS-CACHE — stress result cache

**Conclusion: `NO_CANONICAL_OWNER`.** Sixteen module-level `Map`s exist in
`apex-backend server.js` (`quoteCache`, `greeksCache`, `optionQuoteCache`, `candleCache`,
`indexLevelCache`, `technicalComplete4hCache`, `technicalComplete1dCache`,
`inflightApprovedCandles`, …). Every one is keyed by symbol, or by symbol + timeframe. None
is keyed by a run, a scenario or an overlay, so none can serve a stress result.

`PST-REUSE-005` still applies: the new cache stores **results only**.

**Verdict:** may be classified `NEW`.

### 6.5 ABSENCE-SNAPSHOT-INVALIDATION — snapshot invalidation

**Conclusion: `NO_CANONICAL_OWNER`.** The closest existing mechanisms are `S.portfolioDirty`
(`index.html:17119`, a boolean consumed once at auto-refresh start) and the option-chain
cache TTL/SWR windows. Neither models *"the inputs of a completed computation changed, so the
displayed result is stale"*.

**Verdict:** may be classified `NEW`.

### 6.6 ABSENCE-STRESS-UI — Stress Test UI

**Conclusion: `NO_CANONICAL_OWNER`.** No navigation entry, view, panel, mount point or
renderer named `STRESS TEST`, `stress`, `scenario grid` or `what-if` exists in `index.html`
or `js/ui/**`. `grep -c 'STRESS TEST' index.html` returns `0`.

**Verdict:** may be classified `NEW`, following the existing `js/ui/*-panel.js` pattern.

### 6.7 ABSENCE-OVERLAY-STATE — ephemeral overlay state

**Conclusion: `NO_CANONICAL_OWNER`.** All position state today is persistent:
`positionManager`, `S.portfolioData`, the journal store, and the backend SQLite portfolio
store. There is no ephemeral, non-persistent position construct anywhere in either repository.

**Verdict:** may be classified `NEW`.

---

## 7. Portfolio audit

### 7.1 Scope

| Aspect | Owner / finding |
| --- | --- |
| Selected portfolio | `_activePanelPortfolioId` (`index.html:20288`), in-memory, deliberately **not** persisted (`:17757`) |
| Portfolio id equality | `_portfolioIdEq` (`:18582`) — string-coerced comparison |
| Other portfolios excluded | `_portfolioPositionBelongsToPortfolio` (`:18588`); a null/empty id means *do not filter* |
| Open trades | `_portfolioTradeIsOpenForRisk` (`:18571`) |
| Active legs | `isActivePortfolioLeg` (`:18665`) |
| Residual quantity | `_portfolioLegEffectiveQty` (`:18630`) over 9 explicit residual fields, then `qty\|quantity\|contracts` |
| closed / rolled / expired / assigned / exercised | `_isTerminalPortfolioLeg` (`:18652`) — matches `CLOSED, CLOSE, EXPIRED, EXPIRED_OTM, EXPIRED_ITM, ASSIGNED, EXERCISED, CASH_SETTLED, REMOVED, CANCELLED, CANCELED, TERMINAL, ROLLED, ADJUSTED` plus substring matches |
| Zero quantity | a leg with no close marker is active only when `\|effectiveQty\| > 0` |
| Partial close | a leg **with** a close marker stays active only when it also carries a non-zero explicit open quantity |
| Terminal placeholder | `_terminalPortfolioLegPlaceholder` (`:18686`) emits `priceSource:'terminal_leg_placeholder'`, which every aggregation explicitly skips |

`PST-ACTUAL-002` and `PST-ACTUAL-003` are satisfied by reusing exactly these helpers.

### 7.2 Refresh — measured, not perceived

| Measure | Value |
| --- | --- |
| Auto-refresh interval | **60 000 ms** (`index.html:17123`), gated on `_activePanelPortfolioId && _activeView === 'portfolio'` |
| Batch hydration requests per cycle | **1** (`POST /portfolio/live-refresh`) |
| Backend enriched probe | 1 (`POST /portfolio/:portfolioId/positions/enriched`) |
| Technical refresh | 0 or 1, plus at most 1 targeted retry for missing tickers |
| Requests per symbol | **0 in the healthy path** — `/scanner`, `/market/live/:sym`, `/market/quotes` and `fetchCandles` are reached only for symbols the batch left unresolved |
| Requests per leg | **0** |
| Requests per cell | **0** (no grid exists) |
| Quote / Greeks / beta / SPY / VIX | all served from the single batch response or from backend in-memory caches |
| Frontend computation | pure, in-memory: `aggregateGreeks`, `computePortfolioRiskMetrics`, `computeRowBetaWeightedDelta` perform **no** network I/O |

**Why the current Portfolio is sufficiently reactive** — from source, not from visual
perception:

1. The backend holds **one persistent DXLink WebSocket** and serves quotes/Greeks from
   in-memory `Map`s rather than fetching per request.
2. `POST /portfolio/live-refresh` deduplicates symbols into `Set`s before subscribing
   (`server.js:11046-11047`), so *N* legs on the same contract cost one subscription.
3. The route runs under an explicit server budget (`LIVE_REFRESH_MAX_SERVER_MS`) with
   per-phase timings published as `liveRefreshPhaseTimings`, so a slow phase **degrades**
   instead of blocking.
4. All portfolio aggregation is pure frontend math over data already in hand.
5. A storm circuit breaker (`_backendCircuitOpen`) suppresses per-symbol fan-out entirely
   while the backend is unreachable.

**Implication for the stress design.** The stress endpoint must reproduce this shape: **one
batch request carrying every scenario, hydrating each exact contract at most once per run.**
Any per-cell, per-leg or per-scenario request would be strictly worse than the pattern the
Portfolio already proves works. This is the measured basis on which the
`BACKEND BATCH COMPUTATION / FRONTEND STATE + RENDERING` decision is **confirmed**.

### 7.3 Data available today

| Datum | Present | Source / note |
| --- | --- | --- |
| underlying spot | yes | `underlyings[sym].price` from live-refresh; `resolvePortfolioLivePrice` cascade |
| bid / ask | yes | DXLink option quote cache |
| mark | yes | live-refresh `options[symbol]`; frontend mark mapping pinned by `tests/portfolio-enriched-mark-mapping.test.js` |
| last | yes | quote payload |
| implied volatility | yes | DXLink Greeks event `volatility` field |
| delta / gamma / theta / vega | yes | DXLink Greeks, per share |
| option symbol | yes | `buildCanonicalOptionSymbol` / `getPreferredOptionDxlinkSymbol` |
| strike / expiry / PUT-CALL | yes | leg fields, alias-normalized by `normalizeOptionLegSymbolAliases` |
| LONG / SHORT | yes | `leg.side`, or inferred from a negative quantity |
| contracts | yes | `_portfolioLegEffectiveQty` |
| **contract multiplier** | **no field** | see [§8](#8-canonical-units) — `UNAVAILABLE_AS_FIELD` |
| beta | yes | `_apexLatestBetaBySymbol` ← `GET /market/betas/latest`; fallbacks to `entrySnapshot.beta`, then `scanData` |
| NLV | yes, display only | `bal.netLiq` from `GET /account/:number/balances`, rendered at `index.html:3749`; **not** threaded into any risk computation |
| timestamps | partial | present on quote/Greeks/beta payloads; **discarded** for SPY before `_resolveSpyPrice` returns |
| freshness | yes | `greeksStale`, `quoteStale`, `candleFreshness`, `computeBetaAgeDays` |
| missing reason | yes | `resolvePortfolioLivePrice().attempts[]`, `row.missingReason`, `unresolvedLegs[].reason` |

---

## 8. Canonical units

Units are **not** inferred from names. The table below records the *target* normalization and,
separately, the *measured* current behaviour.

### 8.1 Target normalization

```
spot:             currency per share
option mark:      currency per share
quantity:         signed number of contracts
multiplier:       shares per contract
IV:               decimal, 0.30 = 30%
rate:             annual decimal
dividend yield:   annual decimal
time:             years
scenario return:  decimal
P&L:              total currency amount
```

**Quantity and multiplier MUST be applied exactly once.** A stress result MUST declare, per
input field, whether the value it consumed was per-share, per-contract, or already net.

### 8.2 Measured current behaviour

**Per-leg live Greeks are per share and NOT pre-scaled.** `aggregateGreeks`
(`index.html:18834`) multiplies each per-leg live Greek by `sign × abs(effectiveQty)`; it
never divides. The incoming value is therefore per contract-unit, unscaled by quantity or
multiplier.

**Delta and theta are points-normalized; gamma and vega are not.**
`normalizeGreekPoints` (`js/utils/normalizers.js:12`):

```js
function normalizeGreekPoints(value) {
  var n = Number(value);
  if (!isFinite(n)) return 0;
  if (Math.abs(n) > 0 && Math.abs(n) <= 1) return n * 100;
  return n;
}
```

It is applied to `delta` and `theta` only. Portfolio delta/theta totals are therefore in
**points** (a delta of `0.45` becomes `45`), while gamma and vega stay raw. This is a
**magnitude heuristic, not a declared unit**, and it is not idempotent for a true delta of
exactly `1.0`. Recorded as [`PST-OPEN-002`](#21-open-decisions).

**Position-level scalar Greeks are already net.** `computeRowBetaWeightedDelta`
(`index.html:19088`) states it explicitly: *"pos.delta is the net position delta already
shown in the row (sign × qty × multiplier applied upstream in refreshPositionsLive) — it is
used AS-IS and NEVER re-scaled by quantity here."*

**Contract multiplier — `UNAVAILABLE_AS_FIELD`.** No `contractMultiplier` field is carried on
portfolio legs at the base commit. Only three textual occurrences of `multiplier` exist in
`index.html`, none of them a leg field; the 100× factor appears only inside the unrealized-P&L
helper as a literal derived from leg type (`option → 100`, `equity → 1`). The stress contract
therefore **requires** an explicit `contractMultiplier` on every hypothetical leg
(`PST-OVERLAY-002`) and an explicitly resolved multiplier for every actual leg.

**VIX is in index points, IV is a decimal.** `18.0` means 18, not `0.18`. Any `VIX_PROXY`
conversion must be explicit — [`PST-OPEN-003`](#21-open-decisions).

**Beta-weighted delta formula, as it exists today** (`index.html:19088`, and the aggregate at
`:18944`):

```
βΔ WTD    = positionDelta × beta
βΔ SPY-EQ = positionDelta × beta × (underlyingPrice / spyPrice)
```

Two distinct metrics, never mixed. `βΔ SPY-EQ` requires all four inputs; when any is missing
the row renders an em dash, **never `0`**. The stress model inherits this discipline.

---

## 9. Reference architecture

The initial decision was:

```
BACKEND BATCH COMPUTATION
FRONTEND STATE + RENDERING
```

**Confirmed by the audit** on measured evidence — see [§7.2](#72-refresh--measured-not-perceived).
The production Portfolio already achieves its responsiveness through exactly this shape, and
`PST-PRICING-006` additionally forbids pricing in the frontend.

### Frontend owns

Portfolio selection (reusing `_activePanelPortfolioId`), scenario controls, the ephemeral
overlay, hypothetical-leg editing, request lifecycle, request id, abort, invalidation,
rendering, the visual scenario grid, breakdown, diagnostics, accessibility, responsive layout.

### Backend owns

Input validation, unit normalization, exact-contract hydration, market snapshot, pricing,
scenario execution, Actual, Overlay, Proposed, Difference, matrix batch, post-stress Greeks,
result diagnostics, performance budget, a short result cache, single-flight.

### Extension-first rule

The backend stress endpoint **composes** existing owners. It must not rebuild Portfolio
hydration, exact symbol construction, option chain retrieval, the option chain cache, quote
resolution, Greeks resolution, SPY resolution, VIX resolution or beta resolution.

Concretely, it must call: `buildPortfolioPositionsFromJournal`, `buildCanonicalOptionSymbol`,
`fetchOptionChainNested`, `optionChainCache`, `createRequestCoalescer`, the `dxLinkManager`
quote/Greeks/option-quote caches, `buildVixFamilySnapshot`, `getLatestBetas`, and
`requireApiKey`.

### Thin modules permitted

A future frontend client may exist to call the endpoint, but it must delegate to `ttCall`.
A future adapter may exist to translate a response, but it must not duplicate Portfolio scope
or market-data resolution.

---

## 10. Contract IDs

All 79 contract IDs are mirrored verbatim in the JSON. Levels are `MUST`, `MUST NOT` or `MAY`.

### Anti-duplication — `PST-REUSE-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-REUSE-001` | Inventory before design | MUST | Every future responsibility MUST appear in the Reuse Manifest before it is assigned to a module. |
| `PST-REUSE-002` | Single canonical owner | MUST | Every responsibility MUST have exactly one canonical owner. |
| `PST-REUSE-003` | No copied implementation | MUST NOT | An existing function MUST NOT be copied, transcribed or rewritten under a new name. |
| `PST-REUSE-004` | Thin delegation only | MAY | A new adapter MAY delegate to an existing owner, but MUST NOT re-transcribe its formulas, normalization or fallbacks. |
| `PST-REUSE-005` | No parallel caches | MUST NOT | No parallel cache for data already owned by Portfolio, DXLink, the option-chain cache, the candle store or market context. |
| `PST-REUSE-006` | No parallel market-data path | MUST NOT | No second path for SPY, VIX, option quotes, option Greeks, beta or underlying spot. |
| `PST-REUSE-007` | Extension before replacement | MUST | When a partial owner exists, the default decision MUST be `EXTEND`, not `NEW`. |
| `PST-REUSE-008` | Existing tests remain authoritative | MUST | Future implementations MUST continue to pass the tests of every reused owner. |
| `PST-REUSE-009` | No ownership by filename assumption | MUST NOT | A new file's name MUST NOT be decided before the ownership audit. |
| `PST-REUSE-010` | Reuse evidence | MUST | Every `REUSE`/`EXTEND` decision MUST state definition, callers, tests, units, dependencies and reason. |

### Transport — `PST-TRANSPORT-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-TRANSPORT-001` | Canonical transport | MUST | The Stress Test client MUST use the existing canonical backend transport (`ttCall`). |
| `PST-TRANSPORT-002` | No new direct fetch | MUST NOT | No new direct `fetch` when `ttCall` or the canonical client can perform the request. |
| `PST-TRANSPORT-003` | Reuse the transport policy | MUST | Authentication, API key, session id, timeout policy, JSON parsing and error classification MUST be reused. |
| `PST-TRANSPORT-004` | Budget as owner extension | MUST | A different timeout budget MUST be an explicit extension of the transport owner, never a parallel client. |

### SPY — `PST-SPY-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-SPY-001` | Canonical SPY origin | MUST | Every run MUST start from the SPY price already resolved by the canonical Portfolio path. |
| `PST-SPY-002` | No second SPY resolver | MUST NOT | A second SPY resolver MUST NOT be created. |
| `PST-SPY-003` | Frozen SPY snapshot fields | MUST | A run MUST freeze `spySnapshotPrice`, `spyPriceSource`, `spyPriceTimestamp`, `snapshotCreatedAt`. |
| `PST-SPY-004` | Percentage shock | MUST | `stressedSpyPrice = spySnapshotPrice × (1 + spyReturn)`. |
| `PST-SPY-005` | Absolute target | MUST | `impliedSpyReturn = targetSpyPrice / spySnapshotPrice - 1`. |
| `PST-SPY-006` | Missing SPY never becomes zero | MUST | Missing or stale SPY MUST produce `DEGRADED` or `UNAVAILABLE`, never zero. |

Worked example for `PST-SPY-004`:

```
spySnapshotPrice = 748.20
spyReturn        = -0.10
stressedSpyPrice = 673.38
```

### Actual portfolio — `PST-ACTUAL-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-ACTUAL-001` | Real selected portfolio | MUST | The baseline MUST be the portfolio actually selected. |
| `PST-ACTUAL-002` | Canonical scope helpers | MUST | The canonical scope and active-leg filtering helpers MUST be reused. |
| `PST-ACTUAL-003` | Terminal legs contribute zero | MUST | Closed, rolled, terminal and quantity-zero legs MUST contribute zero. |
| `PST-ACTUAL-004` | Other portfolios excluded | MUST | Positions of other portfolios MUST be excluded. |
| `PST-ACTUAL-005` | Immutable input | MUST | The Actual Portfolio input MUST be immutable. |
| `PST-ACTUAL-006` | No second Portfolio rule set | MUST NOT | No second, Stress-Test-specific set of Portfolio rules. |

### Option symbol — `PST-OPTION-SYMBOL-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-OPTION-SYMBOL-001` | Canonical builder | MUST | The backend MUST reuse the existing canonical option-symbol builder. |
| `PST-OPTION-SYMBOL-002` | No second formatter | MUST NOT | No second formatter for root, expiry, type or strike. |
| `PST-OPTION-SYMBOL-003` | Dotted roots preserved | MUST | Dotted roots such as `BRK.B` MUST preserve canonical semantics. |
| `PST-OPTION-SYMBOL-004` | Exact contract identity | MUST | Identified by underlying, expiration, strike, PUT/CALL. |
| `PST-OPTION-SYMBOL-005` | No nearest substitution | MUST NOT | Never substituted with the nearest strike or nearest expiry. |

`PST-OPTION-SYMBOL-003` is already guaranteed by the existing owner:
`normalizeOptionRoot` deliberately uses `/[^A-Z0-9.]/g` rather than `/[^A-Z0-9]/g`
so `BRK.B` survives, producing `.BRK.B260619C500`.

### Snapshot — `PST-SNAPSHOT-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-SNAPSHOT-001` | One snapshot per run | MUST | Actual, Overlay, Proposed and Difference MUST use the same frozen snapshot. |
| `PST-SNAPSHOT-002` | Snapshot identity fields | MUST | See [§12](#12-snapshot). |
| `PST-SNAPSHOT-003` | Invalidation | MUST | See [§12](#12-snapshot). |
| `PST-SNAPSHOT-004` | Stale result is announced | MUST | An invalidated result MUST show `INPUTS CHANGED — RERUN REQUIRED`. |

### Overlay and entry — `PST-OVERLAY-*`, `PST-ENTRY-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-OVERLAY-001` | Additive overlay | MUST | `Proposed = Actual + Overlay`. `Proposed = Overlay` is forbidden. |
| `PST-OVERLAY-002` | Leg definition | MUST | Every leg MUST carry `underlying`, `expiration`, `strike`, `optionType`, `side`, `contracts`, `contractMultiplier`. |
| `PST-OVERLAY-003` | Ephemeral and non-persistent | MUST NOT | MUST NOT modify Portfolio, Journal, backend trade store, `localStorage`, orders, real quantities, real legs, or any persistent cache. |
| `PST-OVERLAY-004` | Signed contracts | MUST | `signedContracts > 0` for LONG, `< 0` for SHORT, applied exactly once with `contractMultiplier`. |
| `PST-ENTRY-001` | Entry methods | MUST | `MARK`, `MID`, `BID`, `ASK`, `MANUAL` supported; method, price, source and timestamp reported. |
| `PST-ENTRY-002` | No double counting | MUST NOT | A debit MUST NOT be counted twice; a credit MUST NOT be declared as initial profit. |
| `PST-ENTRY-003` | Overlay P&L formula | MUST | `hypotheticalLegStressPnl = (stressedMark - estimatedEntryPrice) × signedContracts × contractMultiplier`. |

### Hydration — `PST-HYDRATION-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-HYDRATION-001` | Exact contract hydration | MUST | Each exact contract hydrated at most once per run, deduplicated by canonical symbol, through the existing nested chain, chain cache, coalescer and DXLink caches. |
| `PST-HYDRATION-002` | Provenance | MUST | Every hydrated leg MUST return provenance, timestamps and, when unresolved, a missing reason. |
| `PST-HYDRATION-003` | Contract not found | MUST | Yields `UNAVAILABLE — exact contract not found`. |

### Scenario and IV shock — `PST-SCENARIO-*`, `PST-IV-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-SCENARIO-001` | Independent SPY and VIX inputs | MUST | A VIX level MUST NOT automatically imply a single SPY move. |
| `PST-SCENARIO-002` | Scenario fields | MUST | `spyReturn`/`targetSpyPrice`, `vixCurrent`, `vixTarget`/`vixChangePct`, `horizonDays`, `ivShockMethod`. |
| `PST-SCENARIO-003` | Presets are illustrative | MUST | Presets are illustrative hypotheses, never forecasts. |
| `PST-IV-001` | IV shock methods | MUST | `DIRECT_IV_SHOCK` and `VIX_PROXY` both supported and clearly distinguished. |
| `PST-IV-002` | Relative vs points | MUST | A relative shock and a volatility-points shock are distinct, explicitly labelled modes. |
| `PST-IV-003` | No invented calibration | MUST NOT | Historical volatility betas MUST NOT be invented. Without real calibration: configurable coefficient, provenance, `DEGRADED` status, manual override. |
| `PST-IV-004` | No hidden clamps | MUST NOT | No hidden clamp on a shocked IV. Any bound MUST be declared and reported. |
| `PST-IV-005` | Declared limitations | MUST | Unsupported skew and term-structure behaviour MUST be declared as limitations. |

### Pricing — `PST-PRICING-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-PRICING-001` | Full repricing | MUST | Primary pricing MUST be full repricing. `Vega × ΔIV` MUST NOT be primary; it MAY be secondary diagnostics. |
| `PST-PRICING-002` | Pricing inputs | MUST | `spot`, `strike`, `timeToExpiry`, `impliedVolatility`, `riskFreeRate`, `dividendYield`, `optionType`, `exerciseStyle`. |
| `PST-PRICING-003` | American exercise | MUST | American-style options MUST support early exercise. |
| `PST-PRICING-004` | Anchored repricing | MUST | `stressedMark = currentMarketMark + stressedTheoreticalValue - baseTheoreticalValue`. |
| `PST-PRICING-005` | Pricing ownership | MUST | `NEW` only after the absence proof; any pricing owner found makes it `REUSE`/`EXTEND`. |
| `PST-PRICING-006` | Pricing is backend-owned | MUST NOT | No pricing formula in the frontend, and none in `index.html`. |

### Results and matrix — `PST-RESULT-*`, `PST-MATRIX-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-RESULT-001` | Four result sets | MUST | `actualResult`, `overlayResult`, `proposedResult`, `differenceResult`. |
| `PST-RESULT-002` | Additivity | MUST | `proposedStressPnl = actualStressPnl + overlayStressPnl` within a documented tolerance. |
| `PST-RESULT-003` | Incremental effect | MUST | `incrementalEffect = proposedStressPnl - actualStressPnl`. |
| `PST-RESULT-004` | Shared inputs | MUST | Actual and Proposed MUST use the same SPY, VIX, scenario, horizon, model, snapshot and sources. |
| `PST-MATRIX-001` | Backend batch matrix | MUST | Computed by the backend in a single batch request containing every scenario. |
| `PST-MATRIX-002` | Frontend renders only | MUST | The visual grid stays frontend-owned and computes no stress values. |
| `PST-MATRIX-003` | Minimum grid | MUST | SPY `0%, -5%, -10%, -15%, -20%` × VIX `current, +50%, +100%, +200%`. |
| `PST-MATRIX-004` | Cell fields | MUST | See [§16](#16-results-matrix-and-outputs). |
| `PST-MATRIX-005` | No per-cell work | MUST NOT | No request per cell, no full pricing loop in the renderer, no fetch per leg per scenario, no option-chain fetch per cell. |

### Performance, data quality, monolith — `PST-PERF-*`, `PST-DATA-*`, `PST-MONOLITH-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-PERF-001` | Benchmarks required | MUST | See [§18](#18-performance-and-benchmark-plan). |
| `PST-PERF-002` | No N+1 | MUST NOT | No request per position, per leg per scenario or per cell; no repeated chain request or duplicate quote hydration for the same exact contract within a run. |
| `PST-PERF-003` | Limits derive from measurement | MUST | Final limits MUST come from the benchmarks. |
| `PST-DATA-001` | Three statuses | MUST | Every result carries `VALID`, `DEGRADED` or `UNAVAILABLE`. |
| `PST-DATA-002` | Missing never becomes zero | MUST NOT | A missing input MUST NOT become zero. |
| `PST-DATA-003` | No silent exclusion | MUST NOT | An unavailable leg MUST NOT be silently included or silently dropped. |
| `PST-DATA-004` | Incomplete Proposed is not VALID | MUST NOT | An incomplete Proposed MUST NOT be reported as `VALID`. |
| `PST-DATA-005` | Coverage reporting | MUST | Legs requested/evaluated/excluded, reasons, excluded value, sources, timestamps, fallbacks. |
| `PST-MONOLITH-001` | Monolith boundary | MUST NOT | See [§20](#20-monolith-boundary). |
| `PST-MONOLITH-002` | Permitted monolith additions | MAY | Stylesheet link, script tag, `STRESS TEST` navigation entry, empty mount point, minimal bootstrap call site. |
| `PST-MONOLITH-003` | Specification PR is inert | MUST | This PR MUST NOT modify `index.html`, `js/**` or `css/**`, MUST NOT add an endpoint, implement behaviour, add persistence, or place an order. |

---

## 11. Functional objective

The future dashboard compares:

```
ACTUAL PORTFOLIO      = the real portfolio currently selected
HYPOTHETICAL OVERLAY  = options added to the simulation only
PROPOSED PORTFOLIO    = ACTUAL PORTFOLIO + HYPOTHETICAL OVERLAY
DIFFERENCE            = PROPOSED − ACTUAL
```

It must let the user understand:

1. how the real portfolio reacts;
2. how it changes when adding puts, calls or multi-leg structures;
3. the estimated cost or credit of those structures;
4. their contribution to Stress P&L;
5. the change in Delta;
6. the change in Beta-Weighted Delta;
7. the change in Gamma;
8. the change in Vega;
9. the change in Theta;
10. the difference across a SPY × VIX matrix.

The overlay is always **additive**:

```
FORBIDDEN:  Proposed = Overlay
REQUIRED:   Proposed = Actual + Overlay
```

---

## 12. Snapshot

Actual and Proposed must use the **same** snapshot. It must carry at least:

```
snapshotId            snapshotCreatedAt     modelVersion
activePortfolioId     portfolioRevision     positionsHash
spySnapshotPrice      spyPriceSource        spyPriceTimestamp
vixCurrent            vixSource             vixTimestamp
underlyingPrices      optionQuotes          impliedVolatilities
greeks                overlayHash           scenarioHash
```

The run is invalidated when any of these changes: portfolio, real position, residual quantity,
SPY, VIX, scenario, overlay, strike, expiry, side, contracts, entry method, model version.

The UI must then show:

```
INPUTS CHANGED — RERUN REQUIRED
```

It must not silently recompute, and must not silently present a stale result as current.

---

## 13. Hypothetical overlay and entry price

### Structures the user must be able to add

A single put; two or more puts; a call; a short call; a vertical spread; a bear put spread;
a bear call spread; a collar; supported multi-leg structures.

### Required leg fields

```
underlying   expiration   strike   optionType
side         contracts    contractMultiplier
```

### Properties

```
ADDITIVE
EPHEMERAL
NON-PERSISTENT
```

The overlay must not modify Portfolio, Journal, the backend trade store, `localStorage`,
orders, real quantities, real legs, or persistent caches.

### Hydration of hypothetical legs

The backend must: receive the economic definition; build the canonical symbol through the
existing owner; reuse the nested option chain; reuse the option-chain cache; reuse coalescing;
reuse DXLink quotes and Greeks; deduplicate exact symbols; fetch each contract at most once
per run; return provenance, timestamps and a missing reason.

Forbidden: a new chain cache; a new chain provider; a chain fetch per scenario; a chain fetch
per cell; a duplicated chain fetch for two identical legs.

Contract not found:

```
UNAVAILABLE — exact contract not found
```

### Entry price

Methods: `MARK`, `MID`, `BID`, `ASK`, `MANUAL`.
Displayed: bid, ask, spread, mark, entry method, estimated entry price, source, timestamp.

```
hypotheticalLegStressPnl =
  (stressedMark - estimatedEntryPrice) × signedContracts × contractMultiplier

signedContracts > 0  for LONG
signedContracts < 0  for SHORT
```

The debit must not be counted twice. The credit is not initial profit.

---

## 14. Scenario model and IV shock

Each scenario specifies separately:

```
spyReturn  or  targetSpyPrice
vixCurrent
vixTarget  or  vixChangePct
horizonDays
ivShockMethod
```

VIX and SPY are **distinct** inputs. A VIX level does not automatically determine a single
SPY move.

Minimum future presets — illustrative hypotheses, not forecasts:

```
PURE_VOLATILITY   CORRECTION   STRESS   CRASH   CUSTOM
```

### IV shock

**`DIRECT_IV_SHOCK`** — the user gives either a *relative* shock or *volatility points*.
The two modes must be clearly distinct and explicitly labelled.

**`VIX_PROXY`** — the VIX may be used as a proxy only transparently. Historical volatility
betas must not be invented. Absent a real calibration, the implementation must provide a
configurable coefficient, provenance, a `DEGRADED` status and a manual override. No hidden
clamps.

Declared limitations, unsupported in v1: volatility skew by strike; term-structure shape
changes across expiries; correlation changes between underlyings; interest-rate shocks.

---

## 15. Pricing

Primary pricing must be **full repricing**. It must not use only:

```
Vega × ΔIV
```

The Vega approximation may appear as secondary diagnostics.

For American-style options the future model must support early exercise.

Minimum inputs:

```
spot   strike   timeToExpiry   impliedVolatility
riskFreeRate   dividendYield   optionType   exerciseStyle
```

Anchored repricing:

```
stressedMark = currentMarketMark + stressedTheoreticalValue - baseTheoreticalValue
```

**Ownership.** The pricing engine is classified `NEW` **only** because
[ABSENCE-PRICING](#61-absence-pricing--pricing-engine) proved no owner exists. Had one been
found, the decision would have been `REUSE` or `EXTEND`.

`riskFreeRate` and `dividendYield` have **no source** in either repository today; see
[`PST-OPEN-005`](#21-open-decisions).

---

## 16. Results, matrix and outputs

### Result sets

The backend produces `actualResult`, `overlayResult`, `proposedResult`, `differenceResult`,
with:

```
proposedStressPnl  = actualStressPnl + overlayStressPnl
incrementalEffect  = proposedStressPnl - actualStressPnl
```

within a documented tolerance ([`PST-OPEN-007`](#21-open-decisions)). Actual and Proposed use
the same SPY, VIX, scenario, horizon, model, snapshot and sources.

### Scenario grid

The visual grid stays frontend-owned; the numerical computation is backend-owned and batch.

```
SPY: 0%, -5%, -10%, -15%, -20%
VIX: current, +50%, +100%, +200%
```

One request contains **all** scenarios. Forbidden: one request per cell; a full pricing loop
in the renderer; a fetch per leg per scenario; an option-chain fetch per cell.

Each cell receives:

```
scenarioId          spyReturn              stressedSpyPrice
vixTarget           actualStressPnl        proposedStressPnl
difference          actualStressPnlPctNlv  proposedStressPnlPctNlv
status
```

### Required outputs

Actual Stress P&L; Proposed Stress P&L; Difference; P&L % NLV; current value; stressed value;
Long Put Contribution; Short Put P&L; Long Call P&L; Short Call P&L; equity/ETF P&L; Delta;
Beta-Weighted Delta; Gamma; Vega; Theta; overlay debit/credit; overlay contribution; worst
positions; best protections; data coverage; missing data; stale data; fallbacks; model
version; elapsed time; cache status; reuse diagnostics.

---

## 17. Data quality

Every result carries a status:

```
VALID   DEGRADED   UNAVAILABLE
```

A missing input does not become zero. An unavailable leg is not silently included. An
incomplete Proposed cannot be `VALID`.

Reported: legs requested; legs evaluated; legs excluded; reasons; excluded value; sources;
timestamps; fallbacks.

This mirrors the discipline the Portfolio already enforces: `_resolveSpyPrice` returns `null`
rather than `0`; `computeRowBetaWeightedDelta` returns `null` with a `missingReason` and the
renderer shows an em dash; `GET /market-context/vix-family/live` returns
`{ok:false, error:'vix_family_unavailable', retryable:true}` rather than a zero VIX.

---

## 18. Performance and benchmark plan

Benchmarks to define:

```
10 legs × 20 scenarios
30 legs × 20 scenarios
60 legs × 20 scenarios
100 legs × 20 scenarios
```

Measured: elapsed time; CPU; memory; pricing count; provider calls; cache hits; requests
coalesced; request bytes; response bytes — under cold cache, warm cache, Actual only,
Actual + Overlay, and full matrix.

### N+1 contract

There must be no request per position, no request per leg per scenario, no request per cell,
no repeated option-chain request and no duplicate quote hydration for the same exact contract
within a run.

Final limits derive from the benchmarks; none is asserted here.

**Reference baseline:** `POST /portfolio/live-refresh` performs **one** batch request per 60 s
refresh cycle with zero per-leg and zero per-cell requests. The stress endpoint must not
regress from that shape.

---

## 19. Indicative future endpoint

```
POST /portfolio/stress-test/run
```

The name is **indicative only**. The final name must follow the backend's real conventions —
existing portfolio routes use `POST /portfolio/<verb-phrase>` (`live-refresh`,
`technical-refresh`, `full-refresh`) and `POST /portfolio/:portfolioId/positions/enriched`.

The endpoint is an **orchestrator** composing existing owners. It must not become a second
Portfolio backend.

### Indicative request

```json
{
  "modelVersion": "1.0.0",
  "requestId": "client-generated-id",
  "portfolioReference": {
    "portfolioId": "selected-portfolio-id",
    "portfolioRevision": "revision-or-hash"
  },
  "marketSnapshot": {
    "spyPrice": 748.2,
    "spyPriceSource": "portfolio_resolver",
    "spyPriceTimestamp": "2026-08-01T12:00:00Z",
    "vix": 18,
    "vixSource": "market_context",
    "vixTimestamp": "2026-08-01T12:00:00Z"
  },
  "hypotheticalOverlay": { "structures": [] },
  "scenarios": [],
  "options": {
    "includePostStressGreeks": true,
    "includePositionBreakdown": true,
    "includeLegBreakdown": true
  }
}
```

### Indicative response

```json
{
  "ok": true,
  "modelVersion": "1.0.0",
  "requestId": "client-generated-id",
  "snapshot": {},
  "actual": {},
  "overlay": {},
  "proposed": {},
  "difference": {},
  "matrix": [],
  "diagnostics": {}
}
```

### Audit finding on `portfolioId` vs transmitted snapshot

`POST /portfolio/live-refresh` and `POST /portfolio/full-refresh` both **require** a
client-supplied `positions[]` array and return `400 'positions required'` without one.
`POST /portfolio/:portfolioId/positions/enriched` is the **only** route that hydrates
server-side, via `buildPortfolioPositionsFromJournal(portfolioId)` (`server.js:12980`),
falling back to the request payload only when the journal has nothing for that id.

So the backend **does** own an authoritative portfolio source keyed by `portfolioId`, and
duplicating position data in the request is avoidable in principle. Whether the journal store
is authoritative for **every** portfolio the UI can select is **not** proven by this audit —
recorded as [`PST-OPEN-001`](#21-open-decisions), to be resolved before PR 2.

---

## 20. Monolith boundary

In future runtime PRs, `index.html` may receive **only**: a stylesheet link; a script tag; a
`STRESS TEST` navigation entry; an empty mount point; a minimal bootstrap call site.

Forbidden in the monolith, permanently: pricing; scenario engine; matrix engine; overlay
calculations; option-symbol logic; option-chain logic; a SPY resolver; a market-data resolver;
state; renderer; cache; data-quality rules; contract constants.

`tests/portfolio-stress-architecture-contract.test.js` enforces this with a token scan over
`index.html`, `js/**` and `css/**` that fails on any violation.

---

## 21. Open decisions

These are recorded as **open**, not silently resolved.

| ID | Question | Must resolve before |
| --- | --- | --- |
| `PST-OPEN-001` | Does the stress request pass a `portfolioId`, or a full client-side position snapshot? The backend owns `buildPortfolioPositionsFromJournal`, but its authority over every selectable portfolio is unproven. | PR 2 |
| `PST-OPEN-002` | Do stress inputs and outputs use raw per-share Greeks or the points-normalized values `normalizeGreekPoints` produces? Mixing the two would silently break `PST-RESULT-002` additivity. | PR 2 |
| `PST-OPEN-003` | What is the exact VIX→IV conversion for `VIX_PROXY`? VIX is in index points; IV is a decimal. No conversion and no calibration exists. | PR 2 |
| `PST-OPEN-004` | What does `Vega LP / \|Vega SP\| > 30` mean? | any PR surfacing this ratio |
| `PST-OPEN-005` | Where do `riskFreeRate` and `dividendYield` come from? Neither exists as a data source. | PR 2 |
| `PST-OPEN-006` | Where does NLV come from for the `% NLV` outputs? `netLiq` is display-only today. | PR 2 |
| `PST-OPEN-007` | What is the documented additivity tolerance for `PST-RESULT-002`? | PR 2 |
| `PST-OPEN-008` | Which end of the system freezes the SPY triple (price, source, timestamp) for a run? The provenance **already exists** in `resolveFreshSpyPrice`; only the plumbing is missing. Doing it at both ends would create two SPY sources for one run. | PR 2 |

### On `PST-OPEN-004` specifically

The expression is recorded **verbatim** from the requesting specification. It is **not**
reinterpreted as `30%` by this document. The ratio could mean a pure ratio of 30, a percentage
of 30%, or a differently-scaled comparison. Choosing one silently would encode an unapproved
threshold, so the semantics remain an **open decision**.

No unapproved threshold appears anywhere in this document or in the JSON mirror.

---

## 22. Hash identity and zero-runtime-change proof

### Method

Byte identity was proven at PR time by comparing `sha256` of every runtime file against the
base commit `c226f5f2dd865c38ebcf7efef855a8437c4c6a35`.

```
$ sha256sum index.html
4f4ea23b41d3d15350e7717f7e87b1bb68ad917b107a8d8a67094c70e2b306e4  index.html

$ git ls-files 'js/**' | sort | xargs sha256sum
```

### `index.html`

```
sha256(index.html base) === sha256(index.html HEAD)
  = 4f4ea23b41d3d15350e7717f7e87b1bb68ad917b107a8d8a67094c70e2b306e4
```

### `js/**` — 23 files, all identical

| File | sha256 |
| --- | --- |
| `js/adapters/backend-directional-adapter.js` | `eac12219a97ae1df06d09fbe40e23358b59afd22c81135cf9afe42e8878742b8` |
| `js/adapters/backend-directional-snapshot-adapter.js` | `a4458fc5a7377c073f619b86b7c9645dec3ee4d228434022d4e860591951f2d6` |
| `js/api/backend-client.js` | `d2c29b5ce7e577ec5227f8ebca430387cdb90e5cc63bb432264feba58abc58f6` |
| `js/config/backend-config.js` | `ae6f827bbd2bc279a8ae326f4d54f36b25e5a67eac09948c638367e97996b88e` |
| `js/services/backend-directional-snapshot-service.js` | `f2009e76501924e87566155b2113f091ddf51965b7fb4e92f0768d4117106407` |
| `js/services/backend-scanner-snapshot-service.js` | `4c725f8c6fe941d8ebd374b29697e38af83f15d99fdd7b60e25f585b27d8b795` |
| `js/services/candle-auth-gate.js` | `7d9e5939f91dd46da524b9e63c987dd77764da86b06547c987baa82f7c5b85a8` |
| `js/services/candle-dxlink-client.js` | `6d35fafc6ae95928e0b37b6b15e6f66910610a56ab7b7a32d5860484d3f11b85` |
| `js/services/candle-normalization.js` | `ecc6d27c76f9548b2942b62df7f8270913450947724b8e67448321db21a89422` |
| `js/services/candle-provenance.js` | `20fd5df606b907c8c6883ac3acd0de92d518ed3aaffea28985ec08fdae4a148b` |
| `js/services/candle-store-client.js` | `bafdcde511cdaad3993de68cde91bca9ba08ca24bd72021f42251cef7e3fd39c` |
| `js/services/sfs-candle-chart-hydration.js` | `f233e8265cdf24be25ef75a9b51a5021a666249d2d18881b1af025bfabc5c433` |
| `js/services/sfs-candle-detail-4h.js` | `f9be963f25b2dd077ca69a584e3bc560a164a1a421f1e6be6e6d0e714580337b` |
| `js/services/sfs-candle-generic-ensure.js` | `2b7341afa306fb175e2e52e457b7071346f7884ca4b088b7763922e14003b07c` |
| `js/services/sfs-candle-predicates.js` | `f21edd82c46d5ceda07b5adb740294e12d373f814353ea6532c5898217868a7d` |
| `js/services/sfs-candle-spy-read.js` | `69f6700ddb3330ac727e53824bbd3fd0b93ce35f6f7a788ac9ac9690b14e6722` |
| `js/services/sfs-candle-warmup.js` | `61c54fecf3d2aee7b55278fd0999bb3c19041545d3bfaa359efeec40a29be1ca` |
| `js/ui/backend-directional-preview.js` | `44041a8ae915a0c41eaa4489b4b12021e8326eac139966e392d9dd655c06afbd` |
| `js/ui/backend-directional-snapshot-panel.js` | `7287553e9438c0aab801f56553488005761646f05717410eb5d8cc8dd4be0b1d` |
| `js/ui/backend-scanner-snapshot-panel.js` | `15197a037ad955d148bb1a3bbf2e78272cadb0a81382ad1c9e7d87744b01a1f4` |
| `js/utils/indicators.js` | `3bb84ca7768becf50a25b4df336f550a14892d079a1d71df29bb6636ccb337f0` |
| `js/utils/normalizers.js` | `1bb243ac79b4660cafea6eb9a6c3efcf42e0f6af5d64d2d701b7d6a54d8f7ce3` |
| `js/utils/option-symbols.js` | `e9ac1432b5c0af5b52bd3ee8180581b6a0a0e00b53f14bf43793e7e93a6d0cd1` |

### `css/**`

**No `css/` directory is tracked at the base commit** — all styling lives inline in
`index.html`. `git ls-files 'css/*'` returns 0 files. The `css/**` byte-identity requirement
is therefore satisfied over an empty set, and the contract test asserts that emptiness
explicitly rather than silently skipping it.

### How this is enforced durably

A test that pins these hashes forever would go red the moment any *unrelated* PR touches the
actively-developed monolith, which would be a landmine rather than a guarantee. The contract
is therefore enforced along two axes, which together are strictly stronger than a bare hash pin:

1. **Change-set identity (git-derived, durable).** For every commit that touches this
   specification's file set, the test asserts that commit touches **no** file under
   `index.html`, `js/**` or `css/**`. This is true for any history and never breaks on
   unrelated changes. It skips with an explicit printed reason if git is unavailable.
2. **Structural boundary (always active).** `index.html`, `js/**` and `css/**` are scanned
   for stress-test runtime tokens (`portfolioStress`, `stressTest`, `STRESS_TEST`,
   `hypotheticalOverlay`, `stressPnl`, `scenarioMatrix`, `spySnapshotPrice`, `blackScholes`,
   `stressedMark`, …). Any occurrence fails the build.

Additionally, the recorded hashes are validated for shape and, when the base commit is
reachable, cross-checked against `git show <baseCommit>:<path>` so the recorded evidence
cannot silently rot.

This is a deliberate, stated engineering decision — the PR-time byte-identity proof above is
the evidence; the two test axes are what keep it enforceable afterwards.

### How "this PR is inert" is checked

Inertness is likewise asserted **structurally**, not by scanning the added files for the
words `fetch(` or `setInterval(`. A text scan would be actively wrong here: this
specification's job is to **quote** the constructs it bans — [§5.4](#54-endpoints-actually-called-by-the-frontend)
lists the real `fetch(BACKEND + …)` call sites, and the contract tests carry detector
literals for the very patterns they forbid. Flagging a document for describing what it bans
is a false positive, not a finding.

What actually makes this PR inert is checkable without any of that:

1. the machine-readable mirror **parses as JSON**, so it is pure data and can carry no
   executable surface at all;
2. no file this PR adds sits on a runtime path (`index.html`, `js/**`, `css/**`);
3. **no runtime file references any file this PR adds**, so nothing added here can ever be
   loaded, parsed or executed by the application;
4. the contract tests reach only an allowlist of Node builtins — no network module, no
   server, no browser storage — and the only external program any of them may execute is
   `git`.

Each of these four is mutation-proved in
`tests/portfolio-stress-architecture-contract.test.js` §9.

---

## 23. Plan of subsequent PRs

### PR 2 — Backend Stress Engine

Only after this specification is merged. Implements: composition of existing owners; snapshot;
exact-contract hydration; the genuinely-new pricing engine; the scenario engine;
Actual/Overlay/Proposed/Difference; matrix batch; a short result cache; single-flight via
`createRequestCoalescer`; benchmarks; mathematical tests; mutation proof.

Must not duplicate Portfolio, chain, quote, Greeks, SPY, VIX or beta.

### PR 3 — Frontend Stress Client

Thin client over the canonical transport; ephemeral overlay state; request identity; abort;
invalidation; response adapter; integration tests. **No pricing formula.**

### PR 4 — Dashboard

Navigation; mount point; `STRESS TEST`; controls; what-if builder; grid;
Actual/Proposed/Difference; diagnostics; separate CSS; minimal wiring; screenshot; smoke test.

Monolith additions permitted in PR 4 are exactly those listed in `PST-MONOLITH-002`.

---

## 24. Document ownership (AGENTS.md decision)

**`AGENTS.md` was not created and not updated.**

**Evidence.** No `AGENTS.md` and no `CLAUDE.md` exists anywhere in `Fede-ai-coder/apex-trading`
at the base commit — `git ls-files | grep -iE 'AGENTS|CLAUDE'` returns nothing.

**Decision.** The instruction was to update `AGENTS.md` *only if the audit proves it is the
repository's canonical development-rules document*. The audit proves the opposite: it does not
exist, so it is not canonical, and there is no equivalent owner to update.

The repository's established convention is **one topic-scoped contract document per subject at
the repository root** — `BACKEND_DIRECTIONAL_SCANNER_CONTRACT.md`,
`PORTFOLIO_OPTION_ENRICHMENT_CONTRACT.md`, `BACKEND_VIX_FAMILY_LIVE_CONTRACT.md`,
`BACKEND_SWING_COVERAGE_CONTRACT.md`, `BACKEND_ISSUE_PORTFOLIO_4H_FORMULA_PARITY.md`,
`PORTFOLIO_SPY_EQ_EARNINGS_SQZ_AUDIT.md` — each paired with an enforcing contract test under
`tests/`.

This specification follows that existing convention (document + machine-readable mirror +
contract tests) rather than introducing a second, competing instruction document, which the
request explicitly forbids.
