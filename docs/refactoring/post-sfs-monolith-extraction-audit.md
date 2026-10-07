# Post-SFS monolith extraction audit

**AUDIT ONLY — NOTHING WAS EXTRACTED.** No production file changed. No runtime module was created.
This report is GENERATED from `tests/post-sfs-monolith-extraction-audit.test.js`; regenerate it with
`AUDIT_WRITE_DOC=1 node tests/post-sfs-monolith-extraction-audit.test.js`. An ordinary run of that suite fails if this file is stale.

Audit base: `dev-clean` at the merge of PR #368, with the SFS extraction complete (62 declarations / 39,822 chars shipped across three modules).
Audit #363 is treated as METHOD ONLY — its counts, family sizes, byte offsets and ranking all predate #365/#367/#368 and its winner (SFS) no longer exists inline.

## 1. The current inline monolith

| measure | value |
| --- | --- |
| `index.html` total | 2,253,990 chars |
| script tags | 31 (1 remote CDN, 29 local modules, 1 inline) |
| `defer` / `async` / `type=module` | none — relocation preserves global bindings |
| inline monolith | 2,142,350 chars |
| top-level declarations | 1,346 |
| declaration chars | 1,858,419 (86.75% of the inline script) |
| declaration forms | 5 const, 313 var, 894 function, 134 async function |
| top-level statement gaps | 1,347 (41 contain code, 19,400 code chars; the other 218,151 non-ws chars are comment banners) |
| contiguous declaration runs | 770 |
| candidate ownership families | 28 |
| SFS residual inline declarations | **0** |
| DSB residual inline declarations | **0** |

SFS and DSB are complete: neither appears as an inline declaration, as a family, or in the candidate set.

## 2. Families

Grouped by semantic ownership first (camelCase name prefix at a word boundary, longest match wins) and physical section second.
170 declarations are owned by a family other than the one their physical section implies — ownership genuinely overrides position.

| family | decls | chars | % mono | runs | span % | bindings | S.* owned | foreign writes in/out | suites | est. PRs | blocked by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PORTFOLIO | 318 | 656,455 | 30.64% | 200 | 82.8% | 67 | 28 | 2 / 8 | 97 | 24 | — |
| JOURNAL | 145 | 232,116 | 10.83% | 65 | 56.8% | 30 | 0 | 2 / 0 | 18 | 9 | — |
| SWING | 165 | 200,368 | 9.35% | 134 | 12.1% | 20 | 1 | 0 / 3 | 14 | 8 | **#361, #310** |
| CANDLE_PIPE | 108 | 100,797 | 4.70% | 67 | 65.4% | 44 | 0 | 1 / 3 | 51 | 4 | **#361** |
| RS_VS_SPY | 143 | 94,585 | 4.42% | 95 | 60.8% | 34 | 4 | 0 / 1 | 18 | 4 | — |
| SCANNER | 91 | 84,627 | 3.95% | 38 | 79.6% | 38 | 7 | 3 / 1 | 36 | 4 | **#361** |
| MCX | 89 | 77,424 | 3.61% | 56 | 87.7% | 29 | 5 | 6 / 0 | 21 | 3 | — |
| EIC | 11 | 67,352 | 3.14% | 10 | 3.2% | 0 | 1 | 0 / 0 | 0 | 3 | — |
| PRETRADE | 27 | 55,461 | 2.59% | 22 | 4.4% | 1 | 1 | 0 / 0 | 28 | 2 | — |
| PESS | 9 | 52,722 | 2.46% | 6 | 2.5% | 1 | 0 | 0 / 0 | 0 | 2 | — |
| DSS | 65 | 49,179 | 2.30% | 34 | 25.7% | 24 | 0 | 6 / 3 | 19 | 2 | — |
| CHART | 36 | 38,912 | 1.82% | 25 | 25.7% | 12 | 0 | 1 / 0 | 6 | 2 | — |
| AGENTS_CHAT | 23 | 35,950 | 1.68% | 7 | 34.1% | 1 | 3 | 0 / 0 | 11 | 2 | **#361** |
| DXLINK_INFRA | 37 | 15,564 | 0.73% | 16 | 0.9% | 8 | 3 | 0 / 0 | 16 | — | — |
| WATCHLIST | 1 | 11,412 | 0.53% | 1 | 0.5% | 1 | 0 | 0 / 0 | 0 | — | — |
| BACKUP_RESTORE | 9 | 10,670 | 0.50% | 1 | 0.5% | 0 | 0 | 0 / 0 | 0 | — | — |
| LOGIN_INIT | 8 | 10,602 | 0.49% | 5 | 0.8% | 2 | 7 | 0 / 0 | 3 | — | — |
| DECISION | 2 | 10,112 | 0.47% | 2 | 0.5% | 0 | 0 | 0 / 0 | 0 | — | — |
| SHELL_NAV | 7 | 9,540 | 0.45% | 4 | 39.8% | 1 | 0 | 0 / 0 | 15 | — | **#362** |
| DATA_FETCH | 10 | 9,167 | 0.43% | 6 | 0.8% | 1 | 0 | 0 / 0 | 12 | — | **#361** |
| FEATURE_FLAGS | 19 | 7,683 | 0.36% | 13 | 22.5% | 1 | 1 | 0 / 2 | 22 | — | — |
| STRATEGY_TEMPLATES | 1 | 7,382 | 0.34% | 1 | 0.3% | 1 | 0 | 0 / 0 | 1 | — | — |
| TT_AUTH | 3 | 5,850 | 0.27% | 2 | 0.3% | 0 | 0 | 0 / 0 | 0 | — | — |
| EARNINGS | 2 | 3,255 | 0.15% | 1 | 0.2% | 0 | 0 | 0 / 0 | 0 | — | — |
| FUNDAMENTALS | 1 | 3,220 | 0.15% | 1 | 0.2% | 0 | 0 | 0 / 0 | 0 | — | — |
| CORE_CONFIG_STATE | 6 | 3,171 | 0.15% | 3 | 0.5% | 2 | 0 | 0 / 0 | 18 | — | — |
| RULES | 5 | 2,877 | 0.13% | 1 | 0.1% | 0 | 1 | 0 / 0 | 0 | — | — |
| INDICATORS | 5 | 1,966 | 0.09% | 1 | 0.1% | 0 | 0 | 0 / 0 | 0 | — | — |

### Foreign-state writes (ownership-split risk)

A family whose binding another family writes is not independently extractable, whatever it scores.

| binding | owner | written by | times |
| --- | --- | --- | --- |
| `_candleQueue` | CANDLE_PIPE | RS_VS_SPY | 1 |
| `_schartResizeTimer` | CHART | SCANNER | 1 |
| `_dssDetailSymbol` | DSS | CANDLE_PIPE | 1 |
| `_dssDetailSymbol` | DSS | SWING | 1 |
| `_dssKeyHandler` | DSS | CANDLE_PIPE | 1 |
| `_dssKeyHandler` | DSS | SWING | 2 |
| `_dssResizeTimer` | DSS | CANDLE_PIPE | 1 |
| `_manualExpiryPortfolioId` | JOURNAL | PORTFOLIO | 2 |
| `_vixFamilyPending` | MCX | PORTFOLIO | 6 |
| `_portfolioRefreshTimer` | PORTFOLIO | FEATURE_FLAGS | 2 |
| `_scannerBackendCandleCache` | SCANNER | DSS | 3 |

## 3. Live open-PR conflict matrix

Each PR measured from its OWN merge-base with `dev-clean` — the five branched from three different commits (`8555ded1e9` ×3, `896aadae9b`, `61c4371574`).
An extraction here is a pure declaration relocation: spans are cut byte-for-byte, one `<script src>` is added, and call sites are never rewritten. So a PR editing a function that CALLS into a family is not a conflict; editing the BODY of a declaration we would move is, and so is writing state we own.

| PR | subject | head | files | index.html decls +/~/− |
| --- | --- | --- | --- | --- |
| #363 | previous extraction audit | `07db24f651` | 2 | — (does not touch index.html) |
| #362 | Portfolio Stress UI | `9b2e0f4694` | 20 | 0 / 1 / 0 |
| #361 | scanner / runScan DXLink migration | `b17377ac9c` | 14 | 8 / 20 / 2 |
| #352 | option-chain retry | `a2c68e7621` | 2 | — (does not touch index.html) |
| #310 | SWING persisted candle chart loader | `d74fd6daf3` | 3 | 14 / 4 / 0 |

| family | #363 | #362 | #361 | #352 | #310 | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| PORTFOLIO | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| JOURNAL | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| SWING | BOOKKEEPING | LOAD-ORDER | DECLARATION-BODY | BOOKKEEPING | DECLARATION-BODY | **BLOCKED** |
| CANDLE_PIPE | BOOKKEEPING | LOAD-ORDER | DECLARATION-BODY | BOOKKEEPING | DISTANT SAME-FILE | **BLOCKED** |
| RS_VS_SPY | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| SCANNER | BOOKKEEPING | LOAD-ORDER | DECLARATION-BODY | BOOKKEEPING | DISTANT SAME-FILE | **BLOCKED** |
| MCX | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| EIC | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| PRETRADE | BOOKKEEPING | STATE-OWNER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| PESS | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| DSS | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| CHART | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| AGENTS_CHAT | BOOKKEEPING | LOAD-ORDER | DECLARATION-BODY | BOOKKEEPING | DISTANT SAME-FILE | **BLOCKED** |
| DXLINK_INFRA | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| WATCHLIST | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| BACKUP_RESTORE | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| LOGIN_INIT | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| DECISION | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| SHELL_NAV | BOOKKEEPING | DECLARATION-BODY | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | **BLOCKED** |
| DATA_FETCH | BOOKKEEPING | LOAD-ORDER | DECLARATION-BODY | BOOKKEEPING | DISTANT SAME-FILE | **BLOCKED** |
| FEATURE_FLAGS | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| STRATEGY_TEMPLATES | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| TT_AUTH | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| EARNINGS | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| FUNDAMENTALS | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| CORE_CONFIG_STATE | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| RULES | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |
| INDICATORS | BOOKKEEPING | LOAD-ORDER | DISTANT SAME-FILE | BOOKKEEPING | DISTANT SAME-FILE | available |

Severity ladder, least to most serious: NONE → BOOKKEEPING → TEST-ONLY → DISTANT SAME-FILE → LOAD-ORDER → STATE-OWNER → SEMANTIC → DECLARATION-BODY → BLOCKED.

- **#361** touches 30 inline declarations (8 added, 20 modified, 2 deleted) and blocks SWING, CANDLE_PIPE, SCANNER, AGENTS_CHAT and DATA_FETCH.
- **#310** touches 18 SWING declarations (14 added, 4 modified), blocking SWING a second time.
- **#362** modifies exactly one inline declaration (`showView`) and adds two script tags; it also writes `S.portfolioDirty`, which PRETRADE owns — a blocker-class state conflict with no textual overlap at all.
- **#363** and **#352** touch no inline declaration; #352 edits `js/api/backend-client.js` internally without changing its export set.

## 4. Rankings

Two rankings, deliberately not combined. A blocked family keeps its architectural value and still scores zero on execution.

**Weights (declared, not tuned):**

```
architectural value : size 0.3  ·  ownership 0.22  ·  cohesion 0.2  ·  surface 0.16  ·  coverage 0.12
execution priority  : arch 0.26  ·  conflict 0.24  ·  cohesion 0.2  ·  tractability 0.18  ·  coverage 0.07  ·  reuse 0.05
```

`tractability` is what stops "biggest" from meaning "next": it is derived from the largest module the repository has actually shipped (28,128 owned declaration bytes, `js/ui/sfs-panel.js`).

### A. Architectural value — what is most worth isolating at all

| # | family | score |
| --- | --- | --- |
| 1 | PORTFOLIO | 0.6299 |
| 2 | PESS | 0.5881 |
| 3 | EIC | 0.5871 |
| 4 | SWING | 0.5522 |
| 5 | CANDLE_PIPE | 0.5453 |
| 6 | AGENTS_CHAT | 0.5374 |
| 7 | JOURNAL | 0.5202 |
| 8 | CHART | 0.5076 |
| 9 | SCANNER | 0.4900 |
| 10 | MCX | 0.4876 |
| 11 | RS_VS_SPY | 0.4824 |
| 12 | DSS | 0.4783 |
| 13 | PRETRADE | 0.3775 |

### B. Execution priority — what should actually be done next

| # | family | score | status |
| --- | --- | --- | --- |
| 1 | PESS | 0.7801 | available |
| 2 | DSS | 0.7708 | available |
| 3 | EIC | 0.7697 | available |
| 4 | PRETRADE | 0.7476 | available |
| 5 | CHART | 0.7364 | available |
| 6 | MCX | 0.7009 | available |
| 7 | RS_VS_SPY | 0.6897 | available |
| 8 | JOURNAL | 0.6458 | available |
| 9 | PORTFOLIO | 0.5276 | available |
| 10 | CANDLE_PIPE | _0.6254 (raw)_ | **BLOCKED** by #361 |
| 11 | AGENTS_CHAT | _0.6179 (raw)_ | **BLOCKED** by #361 |
| 12 | SCANNER | _0.6157 (raw)_ | **BLOCKED** by #361 |
| 13 | SWING | _0.4831 (raw)_ | **BLOCKED** by #361, #310 |

PORTFOLIO is the most valuable family to isolate and only 9th on execution: 656,455 chars over 200 runs and 82.8% of the file is a programme, not a next step (24 PRs at the shipped slice size).
SWING carries the third-largest payoff and ranks last: it is blocked twice over.

## 5. Sensitivity

| test | result |
| --- | --- |
| ±20% on each weight, one at a time (22 runs) | **0 flips** — PESS wins all 22 |
| thinnest single-weight margin | 0.0007 (`exec.reuse` +20%) |
| 2,000 simultaneous randomized ±20% reweightings | PESS 1,754 (87.7%) · DSS 246 (12.3%) |
| runner-up frequency | EIC 46.2% · DSS 41.5% · PESS 12.3% |
| base margin over the runner-up | 0.0093 |

**PESS is the winner at the declared weights, but it is NOT a clear winner on score.** 12.3% of simultaneous reweightings prefer DSS, and three weight moves (`exec.reuse` +20%, `exec.cohesion` −20%, `exec.arch` −20%) bring DSS within 0.004. PESS, DSS and EIC are near-equivalent on score, and this audit does not tighten the weights until they look otherwise.

### The tie-break that actually decides it

Two structural facts separate the three, and neither depends on a weight:

1. **DSS is an ownership-split risk.** SWING and CANDLE_PIPE write three DSS-owned bindings (`_dssKeyHandler`, `_dssDetailSymbol`, `_dssResizeTimer`) six times between them. A family whose state another family writes is not independently extractable.
2. **EIC carries a duplicate-declaration hazard.** `eicFetchLegs` and `eicLiqFromLegs` are each declared twice, byte-identical, 12.5 KB apart. A byte-for-byte relocation cannot move a duplicated declaration without first deciding which copy survives — a behaviour-affecting decision that belongs to a fix, not to an extraction.

PESS has neither. **That, not 0.0093 of score, is the reason for the recommendation.**

## 6. Top three, in depth

|  | PESS | DSS | EIC |
| --- | --- | --- | --- |
| declaration sites | 9 | 65 | 11 (9 distinct names) |
| declaration chars | 52,722 | 49,179 | 67,352 |
| physical runs | 6 | 34 | 10 |
| span | 53,864 chars | 550,541 chars | 68,577 chars |
| declaration density in span | 97.9% | 8.9% | 98.2% |
| interleaved load-time statements | 0 | 2 | 0 |
| top-level bindings owned | 1 | 24 | 0 |
| `S.*` keys owned | none | none | `eicShowAll` |
| inbound foreign writes | 0 | **6** | 0 |
| outbound foreign writes | 0 | 3 | 0 |
| calls out to | AGENTS_CHAT, SHELL_NAV | CANDLE_PIPE, CORE_CONFIG_STATE, FEATURE_FLAGS, PORTFOLIO, RS_VS_SPY, SCANNER, SHELL_NAV | AGENTS_CHAT, DECISION, SHELL_NAV |
| shipped modules reused | js/api/backend-client.js | 7 modules | js/api/backend-client.js |
| inline `on*` handlers | pessAnalyzeAll | 8 | eicAnalyzeAll, runEICPanel |
| suites exercising it | 0 | 19 | 0 |
| duplicate declarations | 0 | 0 | **2** |
| blocked by | nothing | nothing | nothing |

## 7. MCX — does the previous audit's next candidate still win?

**No.** MCX ranks 6th on execution priority and 10th on architectural value.

| measure | value |
| --- | --- |
| declarations / chars | 89 / 77,424 |
| physical runs | 56 |
| span | 1,878,466 chars — 87.7% of the whole monolith |
| sections it is scattered across | INDICATORS, MCX, PORTFOLIO, PRETRADE |
| …of which live in the LIVE PORTFOLIO section | 14 |
| …and in the PRE-TRADE RISK CHECK section | 6 |
| cache/state self-owned? | yes — 29 bindings, 0 outbound foreign writes |
| but written from outside? | yes — PORTFOLIO writes `_vixFamilyPending` 6 times |
| `S.*` keys owned | `marketContextRisk`, `marketContextSummary`, `marketContextTimestamp`, `marketContextValidMinutes`, `marketRegime` |
| open-PR conflict | none — no PR blocks MCX |
| suites | 21 |

MCX is unblocked and its own state is self-owned, which is why it still ranks mid-table. What it is not is CONTIGUOUS: 56 runs across four sections and 87.7% of the file, with its backend candle cache living inside the PRE-TRADE section and its snapshot renderers inside LIVE PORTFOLIO.

- **An adapter is NOT justified.** MCX owns no transport beyond its own candle cache; there is no parse/normalise layer of the kind DSB had.
- **config/state + service + panel IS the shape it would need** (~3 PRs), not a smaller 1- or 2-module split — its 29 bindings, 18 timer calls and 42 DOM reads do not fit one module under the shipped size guidance.
- Nothing here was reweighted to preserve or to demote the historical ranking; MCX simply loses on fragmentation.

## 8. Recommended split for the winner (PESS)

PESS is a four-layer DAG with no upward calls: pure rules → live transport → analysis → panel.

### Manifest (original physical order)

| # | declaration | form | chars | layer |
| --- | --- | --- | --- | --- |
| 1 | `pessIVRRegime` | function | 585 | rules/config |
| 2 | `pessIVEdge` | function | 558 | rules/config |
| 3 | `runPESSPanel` | function | 3,685 | panel |
| 4 | `pessRejectCard` | function | 593 | rules/config |
| 5 | `pessGetStreamerSymbols` | async function | 3,809 | live transport |
| 6 | `PESS_LIVE_MIN` | var | 50 | rules/config |
| 7 | `pessRunDXLink` | async function | 5,318 | live transport |
| 8 | `pessAnalyzeTicker` | async function | 22,013 | per-ticker analysis |
| 9 | `pessAnalyzeAll` | async function | 16,111 | batch analysis |

### Options compared

| option | shape | modules | declarations per module | chars per module | largest | vs 35,609 B advisory |
| --- | --- | --- | --- | --- | --- | --- |
| A | one module | 1 | 9 | 52,722 | 52,722 | **exceeds** |
| B | state/config + behaviour | 2 | 1 / 8 | 50 / 52,672 | 52,672 | **exceeds** |
| C | service + UI | 2 | 8 / 1 | 49,037 / 3,685 | 49,037 | **exceeds** |
| D | config/state + service + UI | 3 | 4 / 4 / 1 | 1,786 / 47,251 / 3,685 | 47,251 | **exceeds** |
| E | ownership-driven: rules · transport · batch analysis · panel+drilldown | 4 | 4 / 2 / 1 / 2 | 1,786 / 9,127 / 16,111 / 25,698 | 25,698 | clears |

Options A–D all leave one module above the advisory ceiling because `pessAnalyzeTicker` (22,013 B) and `pessAnalyzeAll` (16,111 B) are both analysis-and-render monoliths; a service/UI cut cannot separate them without editing bodies, which a byte-for-byte relocation must not do.
More modules earn nothing on their own — option E wins because each of its four modules is a genuine ownership layer, and because `pessAnalyzeTicker` and `pessAnalyzeAll` share no call edge, so separating them cuts nothing.

**RECOMMENDED: option E — four modules, four PRs.**

| PR | module | declarations | chars |
| --- | --- | --- | --- |
| 1 | `js/services/pess-config-rules.js` | `PESS_LIVE_MIN`, `pessIVRRegime`, `pessIVEdge`, `pessRejectCard` | 1,786 |
| 2 | `js/services/pess-live-transport.js` | `pessGetStreamerSymbols`, `pessRunDXLink` | 9,127 |
| 3 | `js/services/pess-analysis-service.js` | `pessAnalyzeAll` | 16,111 |
| 4 | `js/ui/pess-panel.js` | `runPESSPanel`, `pessAnalyzeTicker` | 25,698 |

### Exact first extraction slice — NOT implemented here

PR 1 only, names and sizes only:

| declaration | form | chars |
| --- | --- | --- |
| `PESS_LIVE_MIN` | var | 50 |
| `pessIVRRegime` | function | 585 |
| `pessIVEdge` | function | 558 |
| `pessRejectCard` | function | 593 |
| **total** | **4 declarations** | **1,786** |

These four are the pure layer: no DOM, no network, no timers, no state writes. They mirror `js/services/sfs-config-state.js` (33 decls / 1,059 B) in role and scale.

### Statements that must stay inline

**None.** PESS has 0 interleaved load-time statements inside its territory and 1 top-level binding (`PESS_LIVE_MIN`), which is a plain initialiser that relocates with its declaration.
The one inline `on*` handler that names a PESS declaration (`pessAnalyzeAll`) is built inside an HTML string and resolves through the global binding, which a classic `<script src>` preserves — no rewiring, no `window.*` export.

### Risks carried

- **State-owner risk: none.** PESS owns no `S.*` key, takes no inbound foreign write and makes no outbound one.
- **Load-order risk: low.** PESS calls out only to AGENTS_CHAT and SHELL_NAV (`setAS`, `logEv`, `callAgent`, `appendSysMsg`, `appendAgentMsg`, `showToast`, `setPanel`), all of which stay inline and are resolved at call time, not at load time. Its four modules must load in layer order and after `js/api/backend-client.js`, which it already reuses for `ttCall`.
- **Regression risk: the real one.** PESS has **no dedicated test suite**. The extraction must ship its own boundary contract, as DSB and SFS did, because there is no sibling suite that would notice a mistake.
- **Sibling-test footprint: minimal.** 0 existing suites reference any PESS declaration, so no sibling suite needs updating; the new boundary contract is the whole test cost.

## 9. Global ratchet re-assessment

| family | shipped modules | inline residual decls | inline residual chars | ratchet safe today? |
| --- | --- | --- | --- | --- |
| DSB | 3 | 0 | 0 | **yes — floor reached** |
| PORTFOLIO | 3 | 318 | 656,455 | no |
| SCANNER | 1 | 91 | 84,627 | no |
| SFS | 10 | 0 | 0 | **yes — floor reached** |

**Recommendation: arm it for SFS and DSB only, and only inside this audit.** Both are at zero and no open PR adds a declaration to either. PORTFOLIO and SCANNER each own a narrow sub-domain (`portfolio-stress-*`, `candle-store-client`) while hundreds of legitimate inline residuals remain, and a SCANNER-scoped ratchet would be violated on contact — PR #361 adds three `_scanner*` declarations inline. No ratchet is implemented here; this is a recommendation, and any ratchet must live entirely inside an audit test with zero effect on production.

## 10. Size advisory

The DSB contract pins `SIZE_CEILING = 35,609 B` = 1.5 × the largest module that had shipped when THAT audit ran (`js/ui/backend-scanner-snapshot-panel.js`, 23,739 B), and preserves it by excluding modules shipped since. That is a historical concern belonging to that contract. **This audit does not fix it, redesign it, or add an exclusion to it.** It only records that the recommended split clears it: largest module 25,698 B, under both 35,609 B and the 42,192 B a present-day 1.5× would give.

## 11. Incidental findings — recorded, NOT fixed

| finding | status | evidence |
| --- | --- | --- |
| duplicate EIC declarations | **still present** | `eicFetchLegs` @1,961,914 and @1,974,457; `eicLiqFromLegs` @1,962,129 and @1,974,672 — both pairs byte-identical |
| `ma200dist` renders an exact zero as `+0%` | **still present** | `ma200dist:(d200>=0?'+':'')+d200+'%'` takes the `+` branch at d200 === 0 |
| stale SFS module header | not reproduced | all three SFS module headers correctly describe a completed 3-PR extraction |
| orphaned extraction comments | not reproduced | no inline `moved to js/…` comment remains |
| node-20 `FORBIDDEN_GLOBAL` known failures | out of scope | four boundary suites fail on node 20 on a vm-sandbox proxy-trap difference; pinned to their measured fingerprints in `tests/lib/node20-known-failures.js` and untouched here |

None of these were fixed. Fixing any of them changes application bytes, which an audit must not do. The EIC duplicates in particular must be resolved BEFORE EIC could ever be extracted.

## 12. Audit integrity

| check | result |
| --- | --- |
| parser fixtures reproduced | 6 / 6 exactly (DSB 19/6,789 · 26/26,385 · 9/14,945 — SFS 33/1,059 · 9/10,635 · 20/28,128) |
| regex-keyword lookback | masks 494 chars on this monolith |
| astral characters in the monolith | 1 — a code-point split would shift every later index |
| open-PR records re-derived live from git | 5 / 5 |
| mutants | 30 (LOAD 5, OWNER 4, PARSER 2, PLAN 6, SOURCE 13) |
| survivors | **0** |
| assertions | 448 |

Mutant categories: SOURCE (declaration omitted / duplicated / de-duplicated, binding form, async form, signature drift, body drift, endpoint, timer, subscription, load-time statement misclassified, SFS reintroduced, DSB reintroduced), OWNER (wrong family, exception misrouted, ownership split hidden, state writer misattributed), LOAD (tag omitted, tags reordered, `defer`, `async`, `type=module`), PLAN (conflict lowered, blocked family promoted, state-owner conflict dropped, manifest change hidden, two weight manipulations), PARSER (regex-keyword lookback disabled, code-point split).

