# Next monolith extraction — conflict-aware audit

<!-- GENERATED FILE — do not edit by hand.
     Every number here is emitted by tests/next-monolith-extraction-audit.test.js
     from the source it measures. Regenerate with:
       AUDIT_WRITE_DOC=1 node tests/next-monolith-extraction-audit.test.js
     An ordinary run of that suite fails if this file is stale. -->

Audit only — no application file is modified by the change that adds it.

## Residue

| measure | value |
| --- | --- |
| inline application script | 2182172 chars |
| top-level declarations | 1408 |
| declaration chars | 1898241 (87.0% of inline) |
| top-level statement gaps | 44 (19400 non-ws chars) |
| clusters | 23 |
| local application scripts | 26 |

## Clusters

`gate` is owner integrity: PASS means the cluster mutates no binding declared
outside itself, so moving it splits no cache, timer or subscription owner.

| cluster | decls | chars | runs | cov | arch | conflict | gate |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| swing | 165 | 200368 | 3 | 96.4% | 74 | BLOCKED | FAIL |
| sfs | 62 | 39822 | 1 | 79.0% | 70 | LOW | PASS |
| option-chain | 29 | 18077 | 2 | 86.2% | 65 | MEDIUM | FAIL |
| rs-vs-spy | 143 | 94585 | 9 | 72.7% | 64 | LOW | FAIL |
| mcx | 84 | 73162 | 5 | 58.3% | 61 | MEDIUM | PASS |
| eic | 13 | 77464 | 1 | 0.0% | 60 | LOW | PASS |
| dss-frontend | 65 | 49179 | 3 | 55.4% | 59 | HIGH | FAIL |
| pess | 9 | 52722 | 1 | 0.0% | 59 | LOW | PASS |
| watchlist | 1 | 11412 | 1 | 100.0% | 59 | LOW | PASS |
| scanner-acquisition | 65 | 43747 | 1 | 21.5% | 57 | BLOCKED | FAIL |
| candle-pipeline-chart | 101 | 126230 | 6 | 56.4% | 55 | BLOCKED | FAIL |
| agents-chat | 15 | 18617 | 1 | 0.0% | 53 | LOW | PASS |
| candle-stream | 76 | 35055 | 12 | 73.7% | 52 | HIGH | PASS |
| login-init | 8 | 10602 | 1 | 75.0% | 52 | LOW | PASS |
| fundamentals-rules | 6 | 6097 | 1 | 0.0% | 51 | LOW | PASS |
| journal | 155 | 266208 | 4 | 19.4% | 50 | LOW | FAIL |
| tastytrade-auth | 3 | 5850 | 1 | 0.0% | 47 | LOW | FAIL |
| market-regime | 7 | 6413 | 1 | 0.0% | 45 | LOW | PASS |
| portfolio-live | 277 | 600960 | 12 | 66.4% | 42 | MEDIUM | FAIL |
| candle-context-parity | 18 | 32183 | 6 | 83.3% | 41 | LOW | FAIL |
| bootstrap-config | 55 | 44838 | 2 | 49.1% | 39 | LOW | PASS |
| pre-trade-risk | 30 | 72345 | 3 | 43.3% | 33 | LOW | FAIL |
| view-navigation | 21 | 12305 | 5 | 71.4% | 31 | HIGH | PASS |

## Architectural ranking (top 5)

| # | cluster | architectural score | conflict |
| ---: | --- | ---: | --- |
| 1 | swing | 74 | BLOCKED |
| 2 | sfs | 70 | LOW |
| 3 | option-chain | 65 | MEDIUM |
| 4 | rs-vs-spy | 64 | LOW |
| 5 | mcx | 61 | MEDIUM |

## Execution priority (top 5)

Gated on conflict ≤ MEDIUM **and** owner integrity, then ordered by the same
architectural score. The best target and the best *next* target differ.

| # | cluster | architectural score | conflict | decls / chars | coverage |
| ---: | --- | ---: | --- | --- | ---: |
| 1 | sfs | 70 | LOW | 62 / 39822 | 79.0% |
| 2 | mcx | 61 | MEDIUM | 84 / 73162 | 58.3% |
| 3 | eic | 60 | LOW | 13 / 77464 | 0.0% |
| 4 | pess | 59 | LOW | 9 / 52722 | 0.0% |
| 5 | watchlist | 59 | LOW | 1 / 11412 | 100.0% |

## Excluded, and why

| cluster | arch | reason |
| --- | ---: | --- |
| swing | 74 | conflict BLOCKED; mutates foreign bindings: `_dssDetailSymbol`, `_dssKeyHandler` |
| option-chain | 65 | mutates foreign bindings: `_formLegs`, `_jtFormLegs` |
| rs-vs-spy | 64 | mutates foreign bindings: `_candleQueue`, `_candleSubscribed` |
| dss-frontend | 59 | conflict HIGH; mutates foreign bindings: `_scannerBackendCandleCache` |
| scanner-acquisition | 57 | conflict BLOCKED; mutates foreign bindings: `_earningsCache` |
| candle-pipeline-chart | 55 | conflict BLOCKED; mutates foreign bindings: `_dssDetailSymbol`, `_dssKeyHandler`, `_scannerBackendCandleCache` |
| candle-stream | 52 | conflict HIGH |
| journal | 50 | mutates foreign bindings: `_apexBackendOffloadDiag` |
| tastytrade-auth | 47 | mutates foreign bindings: `_earningsCache`, `_ivrCache` |
| portfolio-live | 42 | mutates foreign bindings: `_apexBackendOffloadDiag`, `_browser4hFallbackState`, `_rsBenchmarkDiagLog`, `_rsSpy1dBenchmarkSessionCache`, `_rsSpy4hBenchmarkSessionCache`, `journalManager` |
| candle-context-parity | 41 | mutates foreign bindings: `_candleCtxChartOpenLast`, `_candleCtxCounts`, `_candleCtxDebounceTimer`, `_candleCtxFirstPendingAt`, `_candleCtxLast`, `_candleCtxPending`, `_ivrCache` |
| pre-trade-risk | 33 | mutates foreign bindings: `journalManager` |
| view-navigation | 31 | conflict HIGH |

## Active-PR conflict map

| PR | title | edits index.html | residual declarations rewritten |
| --- | --- | --- | ---: |
| #310 | fix(swing): load SWING chart candles from the persisted candle store | yes | 6 |
| #352 | fix(option-chain): add final bounded retry and transport dedup | no | 0 |
| #361 | refactor(scanner): migrate runScan candles to Tastytrade DXLink | yes | 24 |
| #362 | feat(stress): add portfolio stress test dashboard | yes | 1 |

- **candle-pipeline-chart** — BLOCKED: #361 rewrites 5 of its declarations; #361 — DSS-adjacent candle acquisition.
- **scanner-acquisition** — BLOCKED: #361 rewrites 11 of its declarations; #361 — runScan / scanner acquisition path.
- **swing** — BLOCKED: #310 rewrites 6 of its declarations; #361 rewrites 7 of its declarations; #361 rewrites 10 functions it calls.
- **candle-stream** — HIGH: #361 rewrites 1 of its declarations; #361 — the DXLink stream runScan is being migrated onto.
- **dss-frontend** — HIGH: #361 rewrites 3 functions it calls; #361 — DSS path.
- **view-navigation** — HIGH: #362 rewrites 1 of its declarations; #362 — stress showView lifecycle.
- **mcx** — MEDIUM: #361 rewrites 3 functions it calls.
- **option-chain** — MEDIUM: #352 — owns the option-chain transport in js/api/backend-client.js.
- **portfolio-live** — MEDIUM: #361 rewrites 6 functions it calls; #362 rewrites 3 functions it calls.

## Operational winner: sfs

| property | value |
| --- | --- |
| manifest | 62 declarations, 39822 chars |
| sync / async / bindings | 28 / 1 / 33 |
| physical spans | 1 run, 482125..531715 |
| state owner | `S.squeezeFireScanner` (also written by `switchPanelTab`) |
| network | 0 fetch calls, 0 endpoints, 0 AbortController |
| timers / listeners / subscriptions | 2 / 2 / 0 |
| DOM ids / storage keys | 16 / 0 |
| window exposure | `apexDebugSfsDetailChart` |
| foreign bindings read / written | `WL` / none |
| internal / inbound / outbound edges | 53 / 3 / 17 |
| external consumers | 4 (all `sfs-candle-*`, extracted from this family) |
| test coverage | 49/62 declarations across 16 suites |
| load-time side effects | 3 |

### Split decision: D

Option C (adapter · service · UI) is ruled out by measurement, not preference:
an adapter translates a transport payload, and this cluster performs 0 fetch
calls against 0 endpoints.

Proposed files (3 pull requests, one module each):

- `js/services/sfs-config-state.js`
- `js/services/sfs-scan-service.js`
- `js/ui/sfs-panel.js`

Stays inline — these run before the monolith declares `S`, and every extracted
module loads *before* the monolith:

- S.squeezeFireScanner = {…} initialiser
- window.addEventListener('resize', …)

## Sensitivity

- ±20% on each of the 11 weights individually: winner is `sfs`.
- 1000 random ±20% reweightings of all weights at once: `sfs` 1000/1000.

Declared weights:

| weight | value |
| --- | ---: |
| `cohesion` | 18 |
| `reduction` | 20 |
| `coverage` | 16 |
| `contiguity` | 12 |
| `ownership` | 14 |
| `reversibility` | 10 |
| `callTimeSafety` | 10 |
| `pInbound` | 8 |
| `pUnverifiedLifecycle` | 12 |
| `pNetwork` | 6 |
| `pForeignConsumers` | 6 |

## Boundary rule for future inline growth

A retroactive "no new logic inline when an owner module exists" ban is not
usable: 117 declarations violate it today. The enforceable form is a
ratchet over those 117 frozen names — the allowance may only shrink, and any
*new* owned-prefix declaration fails immediately.

| owner module | inline declarations currently allowed |
| --- | ---: |
| `js/services/sfs-candle-*.js` | 60 |
| `js/services/candle-*.js` | 55 |
| `js/api/backend-client.js` | 2 |

Safe to introduce now: no pull request currently open adds a declaration the
ratchet would block.

## Recorded incidental findings

- The DSB family has **zero** residual inline declarations — that extraction is complete.
- The monolith declares `eicFetchLegs` and `eicLiqFromLegs` twice each, byte-identical,
  12,543 chars apart. Harmless today; a hazard for whoever extracts EIC.

