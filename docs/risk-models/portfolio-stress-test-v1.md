# Portfolio Stress Test — Model Specification v1.3.0

**Status:** `specification`
**Version:** `1.3.0`
**Runtime implemented:** `true`
**Architecture decision:** `reuse_first_backend_batch_frontend_render`

This document is the **human normative source** for the future `STRESS TEST` dashboard.
`config/risk-models/portfolio-stress-test-v1.json` is its **machine-readable mirror**.
Divergence between the two is a contract violation, enforced by
`tests/portfolio-stress-model-contract.test.js`.

The specification PR (#358) implemented **nothing**: it recorded what already existed,
proved what did not, assigned ownership, and bound every subsequent PR to those decisions.

Revision 1.2.3 was written from the **frontend companion PR**, which shipped the cross-tier
parity proof, the backend client contract and the null-safe response contract — and no UI at
all.

Revision **1.3.0 is written from the UI PR**, which builds the tier those contracts were
written for: the `STRESS TEST` tab, the scenario grid, the matrix renderer, the
Actual-vs-Proposed comparison and the ephemeral overlay builder. `runtimeImplemented`
therefore becomes `true` — it answers "can a user reach this from the application?", and the
answer is now yes. It is **not** a claim that every modelled feature is built; what is and is
not delivered is enumerated per tier in `implementationStatus` and in
`frontendUiIdentity.notDeliveredByThisPr`. See [§33](#33-implementation-status-per-tier) and
[§36](#36-frontend-ui-runtime-footprint).

## Revision 1.3.0 — what changed and why

> **1.3.0 — the renderer and the `STRESS TEST` tab exist. `runtimeImplemented`
> becomes `true`, by the criterion this document already set for it. Adds,
> rewrites and removes **no** contract.**

This revision builds the tier the contracts were already written for. It does not write new
ones, and that is a deliberate choice rather than an omission: `PST-MATRIX-001/002/005`
already say the matrix is one batch backend run rendered by a frontend grid that computes
nothing and never issues a request per cell; `PST-OVERLAY-001/002/003` already say
`Proposed = Actual + Overlay`, name the seven fields of a leg, and forbid the overlay from
touching the Portfolio, the Journal, storage or an order path; `PST-SCENARIO-*` and the
data-quality family already govern the rest. Minting `PST-UI-*` contracts to restate them —
or padding a factual-corrections list for a revision that corrects no fact — is the
dishonest way to make a revision record pass, so the record takes the `normativeChange:
NONE` branch and proves it by enumerating what it **re-derived** instead.

### `runtimeImplemented` — why it flips now

The field was never a measure of completeness. `implementationStatus.runtimeImplementedMeaning`
defined it, before any UI existed, as the answer to *can a user reach the Portfolio Stress Test
from the application?*, and bound it explicitly to the existence of **the renderer and the
tab**. Both now exist and are registered with `showView`, the canonical view owner. So the
field flips because its stated criterion is met — not because a PR shipped.

What it still does not claim: that every modelled feature is built (see
[§36](#36-frontend-ui-runtime-footprint) for what this PR leaves out), and anything at all
about what is deployed, which stays `productionDeployment`'s question.

`status` stays `specification`. This document is still the normative source, and no
alternative vocabulary for that field is defined anywhere in it; inventing one would be a
semantics change without a mandate.

### The boundary was narrowed, not relaxed

The monolith boundary banned every stress token from `index.html`, `js/**` and `css/**`, with
an exemption for the three companion modules. A renderer cannot satisfy that ban, so the
boundary now carries a **second declared exemption** — and it is smaller than it looks:

* exactly **two** JS modules are exempt, both enumerated in `frontendUiIdentity`;
* `css/portfolio-stress.css` is **deliberately not exempt**. Every class it declares is
  prefixed `pstx-`, which matches no forbidden token, so the stylesheet is scanned like any
  other runtime file and passes. An exemption it does not need is an exemption nobody would
  notice growing;
* `index.html` is still scanned **unchanged** apart from five enumerated line patterns — the
  stylesheet link, the two script tags, the `STRESS TEST` navigation entry and the empty
  mount point. Every other changed line must fall inside a declared owner function, and only
  `showView` is declared.

The exemption is paid for by rules a substring ban could never express: the state module is
held to the **same** inertness the client modules are (no DOM, no timer, no listener, no
fetch, no storage, no cache), and the renderer — which by definition needs the DOM — is
instead forbidden from doing the things a second engine, a second transport or a persisted
overlay would have to do.

---

## Revision 1.2.5 — what changed and why

> **1.2.5 — `pctNlvStatus` becomes the status of the DENOMINATOR alone. One
> field was answering two questions and got both wrong. Adds 2 contracts,
> rewrites and removes none.**

The backend published

```js
pctNlvStatus = pctNlvAvailable && proposedComplete ? VALID : UNAVAILABLE
```

which folded the quality of the NLV together with the completeness of the
Proposed set.

**Case A — a computable number withdrawn.** With a valid NLV, a complete Actual
and an incomplete Overlay, the response carried a finite `actualStressPnlPctNlv`
beside `pctNlvStatus: UNAVAILABLE`. A consumer applying the metric status to the
Actual percentage — the correct thing to do — withdrew a number that was never
in doubt and reported the contradiction as a contract violation.

**Case B — a stale denominator presented as authoritative.** `pctNlvAvailable`
rests on `usable`, and `usable` admits `DEGRADED`. A percentage resting on a
stale NLV was reported `VALID`.

Now:

```js
pctNlvStatus = pctNlvAvailable ? nlvInput.status : UNAVAILABLE
```

Each question has exactly one owner. This field says whether the denominator can
be divided by; the result-set statuses and completeness flags say whether the
numerators mean anything. A consumer takes the worst of the two — which is only
sound while neither is quietly answering the other's question.

The empty-portfolio branch no longer overrides the field either: an account with
no positions can have a perfectly good net liquidating value, and the
`UNAVAILABLE` result-set statuses already explain the null percentages.

**Versions.** The model moves to 1.2.5 because the response contract changed
meaning. The scope parity manifest version and the scope semantics version stay
at `2.1.0` and the manifest **logical fixture hash is unchanged** — position
semantics did not change. Only the manifest's **file-content** sha256 moves,
because `modelVersion` is a field of the manifest and not of its fixtures.

---

## Revision 1.2.4 — what changed and why

> **1.2.4 — the QUANTITY owner is reconciled across both tiers, every cross-tier
> expectation becomes backend-generated, and three frontend contract holes are
> closed. Additive: 10 new contracts, none rewritten or removed.**

Revision 1.2.3 proved the two tiers agreed on the seventeen fixtures that existed.
It did not prove they agreed about **quantity** — because no fixture ever exercised
a residual alias, and the two tiers carried different vocabularies, different
precedence and different presence rules underneath a green suite.

### 1. The producer audit, and its uncomfortable answer

Before changing anything, the question was: *which residual fields does any
producer actually write?*

> **NOT ONE of the eighteen alias names has a producer, in either tier.**

Every one occurs exactly once in the codebase — inside the array literal that
declares it. The Journal closes a leg by writing `status`, `exitPrice`,
`closePrice` and `closeDate`; it has no partial-close UI and never writes a
residual quantity. `leg.qty` is the only quantity any producer writes, and
`quantity` is echoed back by the enriched endpoint.

That makes the canonical vocabulary a **declaration, not a discovery**, and both
tiers record it as one rather than dressing it up as an audit result. Two things
follow: the vocabulary is the **union** of what the two tiers already claimed to
honour (narrowing it would mean one tier silently ignoring a field the other
reads), and every precedence choice that is *observable* is pinned by a fixture,
so the choice cannot drift once a producer finally appears.

### 2. Seven divergences closed

| | Before | After |
| --- | --- | --- |
| vocabulary + precedence | two nine-field lists, six shared, in different orders | one twelve-field union; the backend scope owner **re-exports** the list instead of copying it |
| close markers | the backend saw only `exitPrice`, so a leg the Journal closed with `closeDate` was open there and closed here | one set, exactly what the Journal writes |
| present-but-invalid residual | the frontend skipped it and fell through to the gross qty | both refuse — falling through answers with the size the leg **used to be** |
| malformed numeric strings | the frontend used `parseFloat`, so `'3abc'` became a 3-lot position | both use a strict finite read |
| trade `closedAt` | honoured by the backend, ignored by the frontend | both honour it — surfaced by the new `trade_closed_at` fixture |
| prototype reads | an inherited name could supply a quantity | own-property only, on both tiers |
| expected outcomes | `quantitySource`, `positionSide` and `terminalReason` were pinned in the **frontend test file** | generated by the backend owner, consumed by the frontend |

That last row was the worst of them: it made the **frontend** the authority for
what the **backend** produces — the very divergence the manifest exists to
prevent, reintroduced one layer up. The `EXTENDED` table is gone.

Six frontend owners were corrected, each minimally, each recorded in
`frontendCompanionIdentity.canonicalOwnerCorrectionsRequired` with its before and
after. **No fixture was adjusted to fit an owner**, and no parallel function was
created. The corrections are inert on real data — no producer writes a residual
alias, and `jCloseTrade` only ever writes `closedAt` together with
`status: 'closed'` — but the thirteen existing suites that exercise the quantity
owner were updated to load the reconciled helpers, so its sixteen call sites are
regression-covered against the new semantics.

### 3. Three frontend contract holes

**A nested-identity fallback.** `validatePortfolioScopeParityResponse` also read
the triple from a nested `portfolioScopeParity` object "in case a future envelope
appears". The **request** carries a claim under that exact name, so a backend
echoing the request back — or a proxy merging the two — would have satisfied the
check with the client's own claim. Removed: the top level is the whole
authoritative surface, and a future envelope needs a contract revision.

**A status-blind reader.** The normalizer read status and value independently, so
`{ actualStatus: 'UNAVAILABLE', actualStressPnl: 123 }` produced a presentable
`123`. Status is now **binding**: every field belongs to a result set, an
UNAVAILABLE set withdraws its numbers, and the contradiction is reported as a
contract violation instead of being swallowed.

**A published bypass.** The client exposed an injectable `transport` option for
its own tests — equally available to any caller as a way around the canonical
owner's auth, timeout and error handling. Removed; the suite substitutes `ttCall`
in its own sandbox, which exercises the real resolution path.

### 4. Versions and hashes

| | |
| --- | --- |
| manifest | `2.0.0` → **`2.1.0`** |
| scope semantics | `2.0.0` → **`2.1.0`** (precedence and vocabulary changed *semantically*) |
| fixtures | 17 → **50** |
| identity sha256 | `5dff46fb958c728ae48326a510fc79e6e5a94a8a85608b91538400125ec5d0cb` |
| file-content sha256 | `3ac27006096b8ba29af9b62951e604b733249506e588723ea1cd889ae56bf635` |

### 5. One gap this revision also closed

`implementationStatus` was **built and never assigned** by the 1.2.3 update: §33
described a block the JSON did not carry, and nothing asserted its presence, so
four suites stayed green over a document that disagreed with its own mirror. It
is present now.

---

## Revision 1.2.3 — what changed and why

> **1.2.3 — the backend implementation now EXISTS (draft PR #220 at `7027f0c`), and this
> companion PR delivers the frontend parity proof and the client contract. Additive:
> 18 new contracts, no existing contract rewritten or removed.**

Through revision 1.2.2 this document described a future. `POST /portfolio/stress-test/run`
was a *proposal*, the scope-parity contract was a *requirement*, and the audited backend
commit was the **base the work would start from**. All three have changed status.

### 1. The audit subject moved, and the deployed commit did not

| | Commit | What it is |
| --- | --- | --- |
| **Candidate implementation** | `7027f0ce0d0c0016e8732ba59e7c883dfd3093ff` | Carries the Stress Engine. Audited. Draft PR #220. **Not deployed.** |
| **Deployed backend** | `25dd84245d8176bd6c3daa05be98e52afe0a934a` | What `dev-4h-backend` runs today, proven by `GET /version`. |

These were the **same commit** in revisions 1.2.0–1.2.2, because no implementation existed
and the target was simply the base. They are now different, and the distinction is
load-bearing: `GET /version` returning `25dd8424` authorised the backend PR to *start*.
It is not, and never was, evidence that `7027f0c` reached Railway. The specification
records both, under separate names, and never describes the candidate as deployed.

Every audited `sha256`, every route line reference and every recorded zero count was
**recomputed from `7027f0c`** with `git show <commit>:<path>` — not copied from a
pull-request body and not truncated. The audited file set grew from 6 files to 19.

### 2. Six facts had to be relocated, and one had its semantics corrected

The candidate commit did not only add the engine; it **extracted** owners that used to be
route-local in `server.js`:

| Fact | Was | Is |
| --- | --- | --- |
| `FACT-BACKEND-OPEN-TRADE-FILTER` | `server.js`, unexported | `lib/portfolio-journal-scope.js`, exported |
| `FACT-BACKEND-OPEN-LEG-FILTER` | `server.js`, unexported | `lib/portfolio-journal-scope.js`, exported |
| `FACT-LIVE-REFRESH-BOUNDED-FALLBACK` | a route-local closure with inline bounds | `lib/underlying-last-close-fallback.js`, bounds declared once |
| `FACT-BACKEND-UNDERLYING-SPOT-OWNER` | an inline `getLiveQuote` read | an **injected** reader inside `resolveUnderlyingSpots` |

Each fact keeps its id and its claim and gains a `relocatedAtCandidate` note. The strict
test follows the evidence rather than being relaxed, and it additionally proves `server.js`
**imports** the extraction instead of forking it — an extraction that leaves a copy behind
is not an extraction.

One relocation carried a real **semantic change**, recorded as such: at `25dd8424` **any**
`exitPrice` retired a leg, which deleted the still-open 3 contracts of a 10-lot closed 7.
At `7027f0c` an `exitPrice` is terminal **only when no explicit residual survives**. That
moved the backend onto the semantics the frontend already applied, not the reverse.

### 3. Cross-tier parity is now proven by execution, not by assertion

`contracts/portfolio-scope-parity-manifest.json` is copied into this repository
**byte-identically** from the backend commit, and all **17** fixtures are run through the
**existing** frontend owners — `_portfolioTradeIsOpenForRisk`, `_isTerminalPortfolioLeg`,
`_portfolioLegHasCloseMarker`, `_portfolioLegHasExplicitOpenQty`,
`_portfolioLegEffectiveQty`. Every fixture agrees on `carriesCurrentRisk`,
`signedQuantity`, `quantityStatus`, `quantitySource`, `positionSide` and
`terminalReason`.

**No frontend owner needed correcting, and none was corrected.** Had a fixture revealed a
divergence, the rule was: fix the canonical owner minimally, add regression tests for its
existing consumers, and never adjust the fixture or add a parallel function.

The manifest carries **two different hashes**, and conflating them was a real hazard:

| Hash | Scope | Value |
| --- | --- | --- |
| **Manifest identity** | canonical JSON of the `fixtures` array only | `4a1a3d9835b0b859dc0d7452d39bca65546a654acabd6b18f7675a5d4b57fe1e` |
| **File content** | the whole file | `7b4ae33215369a232009e84b7d0c27d7c33da4ff03e5a6b80d0d8b5f78514870` |

Checking only the first would let an edited manifest keep a matching identity; checking only
the second would let a byte-identical copy carry a stale one. Both are verified, and a
negative control proves each failure is reported as *its own* kind of drift.

### 4. `runtimeImplemented` was not repurposed

It would have been easy to flip the boolean to `true` — something *is* implemented now.
That would have been the dishonest reading: the boolean has always meant "reachable from
the UI", and nothing is. It stays `false`, and the per-tier truth moved to
`implementationStatus` ([§33](#33-implementation-status-per-tier)), because overloading one
flag is exactly how partial delivery starts reading as completion.

### 5. The zero-runtime-change rule was narrowed, not deleted

Revision 1.2.2 enforced *"no commit touching the specification may also touch a runtime
file"*. That is **false** for this companion, which ships three modules by design. Deleting
the rule would have removed the only mechanical guard on scope, so it is replaced by
`frontendCompanionIdentity`: a declared, file-by-file footprint that the architecture
contract enforces. See [§34](#34-frontend-companion-runtime-footprint).

---

## Revision 1.2.2 — what changed and why

> **1.2.2 — rebased onto the post-PR #359 dev-clean base; all runtime identity,
> suite and deployment evidence re-derived; no normative contract change.**

`origin/dev-clean` advanced from `de7365c` to `0a16ea5a` when **PR #359**
(`refactor(swing): reject legacy candles in downstream consumers`) was merged. That PR
modified `index.html`, so every piece of evidence this specification anchors to the base
had to be re-derived. **No contract changed.** The 120 contracts, the architecture, the
Reuse Manifest and the Overlay lifecycle are exactly as approved in 1.2.1.

What was re-derived — none of it preserved as a target:

| Evidence | 1.2.1 (base `de7365c`) | 1.2.2 (base `0a16ea5a`) |
| --- | --- | --- |
| `hashIdentity.baseCommit` | `de7365c…` | `0a16ea5a…` |
| `sha256(index.html)` | `c67c073e…` | `e076c05c…` |
| `js/**` files | 23, unchanged | 23, **unchanged by PR #359** |
| `css/` | absent | absent |
| forbidden stress-token scan | 30 tokens, zero | 30 tokens, **still zero** |
| full frontend suite | 111 / 111 | **112 / 112** (PR #359 added one swing test file) |
| contract assertions | 446 | **459** (150 / 180 / 89 / 40) |
| mutation checks | 149 | **154** (151 rejection + 3 acceptance) |

### One real contradiction the rebase exposed

`vHashRecordMatchesBase` compared the recorded hashes against **the recorded base
commit**. That is self-consistent but circular: after the rebase, all four suites passed
while `hashIdentity` still named `de7365c` and the branch was actually stacked on
`0a16ea5a`. The record could go stale with nothing failing.

The specification claims the runtime files are *unchanged by this PR*, which is a claim
about **HEAD versus the base HEAD is stacked on** — not a claim about an arbitrary commit
named in a JSON field. A second validator now enforces exactly that: every recorded
runtime file must be byte-identical between `hashIdentity.baseCommit` and `HEAD`, and the
recorded base must be an ancestor of `HEAD`. Under 1.2.1's stale record the new check
fails, which is the point.

This is a test-side correction only. No contract text was touched.

## Revision 1.2.1 — what changed and why

Three corrections, all narrow.

**1. `PST-TEMPORAL-007` was too absolute and contradicted the hydration contract.**

It said *"Adding or editing the Overlay MUST NOT cause a new market read."* But when the user
adds a put, a call, a short call, a vertical, a collar — or changes an underlying, expiration,
strike or PUT/CALL, or swaps a leg — the overlay introduces **exact canonical symbols whose
quotes, IV and Greeks have never been read**. `PST-HYDRATION-001` *requires* hydrating them.
Read literally, 1.2.0 made a correct implementation impossible.

The prohibition belongs to the phase **after** snapshot completion, not to snapshot assembly.
`PST-TEMPORAL-007` is rewritten and `PST-TEMPORAL-008` adds the explicit lifecycle. See
[§29](#29-temporal-coherence-of-a-run).

**2. The deployment gate implicitly allowed a branch tip.** *"the audited commit **or the
branch tip at that time**"* is exactly the shortcut the gate exists to prevent. Only an
**exact** match authorises PR 2; anything else — including `null` and `UNAVAILABLE` — requires
a full delta audit. New family `PST-BACKEND-TARGET-001..003`. See
[§1](#1-base-provenance-and-recovery-point).

**3. Wording and counts.** `dev-4h-backend` is the **provisional backend development target**,
never the "correct" or "actually deployed" backend, until the deployment is verified. The PR
description said *5 files changed*; the PR contains **six**.

---

## Revision 1.2.0 — what changed and why

Revision 1.1.0 audited the **wrong backend branch**. It also left the snapshot's temporal
coherence unspecified, and its source-facts test verified the working tree rather than the
audited commit.

| # | 1.1.0 said | Corrected |
| --- | --- | --- |
| 1 | Backend = `main@6eebb99` | The evolved backend is **`dev-4h-backend@25dd8424`**, which is **DIVERGENT** from main — merge-base `6d0308b`, **6** commits main-only, **24** commits dev-4h-only. Neither is an ancestor of the other. Every `server.js` line reference, hash and count re-derived. See [§1](#1-base-provenance-and-recovery-point). |
| 2 | Underlying fallback = serial, unbounded inline `await getUnderlyingLastClose(sym)` | That is **main's** behaviour (`main server.js:11242`). The target backend replaced it in PR #210 with a **deferred, batched, bounded** phase: `runUnderlyingLastCloseFallbacks`, 2-worker pool, 450 ms per symbol, **1200 ms total budget**, plus `underlyingLastCloseFallbackDiagnostics`. |
| 3 | (not mentioned) | The live-refresh **IVR phase is bounded too** (PR #211) with its own `ivrDiagnostics`. |
| 4 | (under-reported) | market-metrics reads go through `getMarketMetricsItemCached` over the `createRequestCoalescer`-backed `marketMetricsCache` — a second real production consumer. |
| 5 | Scenario absence proof cited `lib/portfolio-recovery.js` | That file **does not exist** on the target backend (it is main-only, from PR #134). On dev-4h-backend **zero** `lib/` modules contain "scenario" — the proof is stronger, the citation was wrong. |
| 6 | (not recorded) | Three raw `ttFetch('/option-chains/:sym/nested')` call sites **bypass** both `fetchOptionChainNested` and `optionChainCache`. None is on a Portfolio route, but they are a pre-existing second chain path. |
| 7 | Netlify preview "not verifiable" | The Netlify deploy preview on `713eea0` reported **SUCCESS**. |

**Added:** the `PST-TEMPORAL-*` family (7 contracts) — snapshot freeze-before-calculation,
no-reread-during-matrix, assembly interval, per-input timestamps, cross-input skew, explicit
temporal policy, and identical temporal state for Actual/Proposed.

**Test change:** `portfolio-stress-source-facts.test.js` now reads the audited commit through
`git show <commit>:<path>` instead of the working tree, and gains a **strict mode**
(`PST_REQUIRE_BACKEND_SOURCE=1`) in which every "cannot verify" condition is a FAIL.

---

## Revision 1.1.0 — what changed and why

A second backend audit found that revision 1.0.0 asserted several things the audited source
contradicts, and left several architectural questions open that a Stress Engine cannot be
built without. Both are fixed here. Every load-bearing claim is now backed by a recorded
fact with verbatim evidence in [§25](#25-factual-source-assertions), checked by
`tests/portfolio-stress-source-facts.test.js`.

**Factual corrections**

| # | Revision 1.0.0 said | The audited source says |
| --- | --- | --- |
| 1 | `fetchOptionChainNested` depends on `ttFetch` | It *deliberately does not* call the global `ttFetch`. It performs a route-local fetch with **injected** `getAccessToken`, route-local timeout and deadline, and route-local error classification. Zero `ttFetch` call sites, zero imports. |
| 2 | `OptionChainCache` uses `createRequestCoalescer` | It owns `this.pending = new Map()` and its own `coalesce()`. Zero references to `createRequestCoalescer`. That module's real consumers are `marketMetricsCache` and `candlesResponseCache`. |
| 3 | "background revalidation **timer**" | A background revalidation **promise** gated on `softExpired`. Zero `setTimeout`, zero `setInterval` in the module. |
| 4 | Every exact contract hydrates through the nested chain | The production enriched path hydrates **by exact symbol** with **zero** option-chain access. The chain is a *discovery* owner. |
| 5 | `market snapshot` = **EXTEND** (add run identity to it) | It is deliberately **portfolio-agnostic**. Corrected to **REUSE**; run identity belongs to a separate **NEW** stress-run snapshot builder. |
| 6 | Leg Greeks are "per share" | The source proves only that they are **raw dxFeed event values**, unscaled. The economic unit is not established anywhere. |
| 7 | Frontend Portfolio helpers are the owners | They are not callable from the backend. Ownership is now **per execution tier** with a parity contract. |
| 8 | `serverJsLines: 18939`, `routeCount: 95` | `19364` lines, `93` routes. |

**Architectural gaps closed** — four new contract families (`PST-UNDERLYING-*`,
`PST-EQUITY-*`, `PST-PARITY-*`, `PST-UNITS-*`) plus `PST-HYDRATION-004..007`,
`PST-SNAPSHOT-005..006`, `PST-SPY-007`, `PST-PRICING-007..008` and `PST-REUSE-011`.
Eight decisions that were open in 1.0.0 are now **resolved**; only calibration, semantics,
provider-choice, tolerance and performance questions remain open.

**Base advanced** — PR #357 was merged into `dev-clean` after 1.0.0 was cut, so this branch
was rebased and every hash re-derived. See [§1](#1-base-provenance-and-recovery-point).

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
21. [Open and resolved decisions](#21-open-and-resolved-decisions)
22. [Non-SPY underlying shock](#22-nonspy-underlying-shock)
23. [Equities and ETFs](#23-equities-and-etfs)
24. [Exact-contract hydration](#24-exactcontract-hydration)
25. [Factual source assertions](#25-factual-source-assertions)
26. [Cross-tier Portfolio parity](#26-crosstier-portfolio-parity)
27. [Stress-run snapshot ownership](#27-stressrun-snapshot-ownership)
28. [Canonical SPY source of a run](#28-canonical-spy-source-of-a-run)
29. [Hash identity and zero-runtime-change proof](#30-hash-identity-and-zero-runtime-change-proof)
30. [Plan of subsequent PRs](#30-plan-of-subsequent-prs)
31. [Document ownership (AGENTS.md decision)](#31-document-ownership-agentsmd-decision)
32. [Implementation status per tier](#33-implementation-status-per-tier)
33. [Frontend companion runtime footprint](#34-frontend-companion-runtime-footprint)
34. [Cross-tier quantity owner](#35-cross-tier-quantity-owner)

---

## 1. Base, provenance and recovery point

### Frontend

| Field | Value |
| --- | --- |
| Repository | `Fede-ai-coder/apex-trading` |
| Base branch | `origin/dev-clean` |
| **Base commit (revision 1.2.2)** | `0a16ea5a92914f46d726c635e9d88ca3e08b1d13` |
| Base commit subject | `Merge pull request #359 from Fede-ai-coder/claude/swing-dxlink-sole-provider-h1gjve` |
| Base commit of revisions 1.1.0–1.2.1 | `de7365c13ce6318ab11874ab317d2c76d67b6063` |
| Base commit of revision 1.0.0 | `c226f5f2dd865c38ebcf7efef855a8437c4c6a35` |
| Working tree at audit start | clean (`git status --porcelain` empty) |
| Extracted modules under `js/` | 23 |
| **Recovery point** | `0a16ea5a92914f46d726c635e9d88ca3e08b1d13` |

### The base moved twice, and both moves are legitimate for the same reason

Revision 1.0.0 was cut at `c226f5f` and **excluded PR #357 precisely because it was still
open**. PR #357 was then **merged**, advancing `dev-clean` by three commits (`26ccb16`,
`3f4719d`, `de7365c`) which touched `index.html` and five swing test files.

Revision 1.2.1 was cut at `de7365c`. **PR #359**
(`refactor(swing): reject legacy candles in downstream consumers`) was then **merged**,
advancing `dev-clean` by four commits (`cdb8c2c`, `044875c`, `ea98385`, `0a16ea5a`) which
touched `index.html`, four existing swing test files, and added
`tests/swing-dxlink-sole-provider.test.js`.

In both cases the excluded work became part of the base **only after it was merged, never
before**. This branch was rebased onto each new head and **every recorded hash was
re-derived from it**. `js/**` was unchanged by PR #357 and by PR #359; `index.html` was
changed by both, so its recorded hash changed both times.

This specification does **not** modify, reinterpret, or depend on the Swing work in
PR #359. The Swing changes appear only as part of the base; they are absent from this
PR's diff.

Sources **still explicitly excluded**: PR #310, PR #352, any open or draft PR, any feature
branch, any backup branch, and any commit not reachable from `origin/dev-clean`.

### Frontend suite

```
before revision 1.1.0 :  node --test 'tests/*.test.js'  → 109 files, 109 pass, 0 fail
at revision 1.2.1     :  node --test 'tests/*.test.js'  → 111 files, 111 pass, 0 fail
at revision 1.2.2     :  node --test 'tests/*.test.js'  → 112 files, 112 pass, 0 fail
```

The count moved from 111 to 112 because **PR #359 added
`tests/swing-dxlink-sole-provider.test.js`** to the base. It is re-derived here, not
carried forward: this specification adds four test files of its own and the baseline it
reports is whatever the suite actually contains after the rebase. The seven `swing-*`
suites of the new base pass unmodified — this PR does not touch them.

> Note on the suite command: `node --test tests/` fails with `MODULE_NOT_FOUND` on this
> repository layout (Node 22 resolves the bare directory as a module). The working
> invocation is the glob form above. This is a pre-existing property of the repository,
> not something introduced here.

### Backend — which backend is the provisional development target

The repository has **two** Railway services and **two** divergent branches. Revision 1.1.0
conflated them. They are now stated separately.

| Reference | Value |
| --- | --- |
| **`backendProductionReference`** | service `https://apex-tastytrade-backend-production.up.railway.app` — used by the frontend on **every** host that is *not* localhost, *not* a deploy-preview and *not* the Netlify branch deploy (`js/config/backend-config.js:16`). Branch/commit **UNVERIFIED**. |
| **`backendDevelopmentReference`** | service `https://apex-tastytrade-backend-dev-production.up.railway.app` — used **only** on localhost, on hosts containing `deploy-preview`, and on `--spontaneous-queijadas-118823.netlify.app` (`js/config/backend-config.js:17`, `:24-30`). Branch/commit **UNVERIFIED**. |
| **`backendStressImplementationTarget`** | **`dev-4h-backend @ 25dd84245d8176bd6c3daa05be98e52afe0a934a`** (*Merge PR #219*, 2026-07-19) — the **PROVISIONAL BACKEND DEVELOPMENT TARGET**. Status `PROVISIONAL_BACKEND_DEVELOPMENT_TARGET_PENDING_DEPLOYMENT_VERIFICATION`. It MUST NOT be called the "correct" backend, nor the backend "actually deployed", until the deployment is verified. |
| **`backendDeploymentEvidence`** | **BLOCKED** — see below. |

### `backendDeploymentEvidence` — the deployed commit could NOT be determined

**Blocker.** Both Railway hosts are denied by this session's egress policy. The proxy answers
`403` to `CONNECT` and records the denial; its documentation states that a 403/407 is an
organization policy denial that must be **reported, not retried or routed around**.

| Method attempted | Result |
| --- | --- |
| `GET /version` on the **dev** service | `curl (56) CONNECT tunnel failed, response 403` · proxy: `connect_rejected — gateway answered 403 to CONNECT (policy denial or upstream failure)` |
| `GET /health` on the dev service | same 403 denial |
| `GET /` on the dev service | same 403 denial |
| `GET /version` on the **production** service | same 403 denial (recorded separately by the proxy) |
| `railway.toml` in the repository | **INCONCLUSIVE** — byte-identical on both branches. Declares only `builder = nixpacks`, `startCommand = "node server.js"`, restart policy and `TT_SANDBOX`. It pins **no branch, no service name and no commit**; the branch↔service mapping lives in the Railway dashboard. |
| `render.yaml` | **INCONCLUSIVE** — byte-identical on both branches, no branch binding. |
| startup log / baked build metadata | **NOT REACHABLE** without the host. |

**The authoritative procedure exists and is unambiguous — it just needs a caller who can
reach the host.** `GET /version` is present on **both** branches
(`dev-4h-backend server.js:19062`/`:19079`; `main:18763`/`:18781`) and returns
`RUNTIME_VERSION_INFO`:

```
{ gitCommit, source: 'env' | 'git' | 'unavailable', envVar }

resolution order:
  RAILWAY_GIT_COMMIT_SHA → RENDER_GIT_COMMIT → SOURCE_COMMIT → GIT_COMMIT
  → git rev-parse HEAD (if a .git checkout survived) → unavailable
```

Its own source comment states the design: *"Reports the git commit the RUNTIME is actually
built from … NEVER a hardcoded 'expected' sha: a wrong-but-plausible answer is worse than an
honest null."* A `null` is therefore informative in its own right.

```
curl -sS https://apex-tastytrade-backend-dev-production.up.railway.app/version
# compare gitCommit for EXACT equality with backendStressImplementationTarget.commit
```

### The gate — exact match, or a delta audit

| Case | Condition | Outcome |
| --- | --- | --- |
| **A** | `deployed gitCommit === audit.backend.commit` | PR 2 **MAY** start |
| **B** | anything else — a different commit, `null`, or `UNAVAILABLE` | PR 2 **MUST NOT** start until every step below is done |

**Case B required steps:** compare `audit.backend.commit` against the newly deployed commit ·
delta audit of every load-bearing owner · update `backendStressImplementationTarget.commit`,
`audit.backend.commit`, the audited file hashes, the line references, the source facts, the
Reuse Manifest, the route boundaries and the performance facts · run the **strict**
source-facts test against the new commit · update the specification through a dedicated PR, or
through a revision of this specification PR while it is still open.

> **An unaudited branch tip MUST NOT be accepted automatically.** Revision 1.2.0 implicitly
> allowed *"the audited commit or the branch tip at that time"*. That escape hatch is removed
> — it is precisely the shortcut this gate exists to prevent. Governed by
> `PST-BACKEND-TARGET-001..003`.

**PR 2 MUST NOT start until that exact comparison is performed.**

**No branch was inferred from its name.** That `dev-4h-backend` resembles `-dev-production`
is explicitly **not** treated as evidence.

### The branches are DIVERGENT, not one ahead of the other

```
merge-base                6d0308b  (Merge PR #206, 2026-07-05)
main-only commits         6
dev-4h-backend-only       24
main ancestor of dev4h?   NO
dev4h ancestor of main?   NO
```

| | main-only | dev-4h-backend-only |
| --- | --- | --- |
| Option-chain cache + SWR | `6eebb99`/`3406ab5` (PR #207) | **backported** as `ec447d2`/`30ad619` (PR #208) — resulting `lib/` files **byte-identical** |
| Orphaned portfolio recovery | `037ef2f`/`00a8087` (PR #134) + `lib/portfolio-recovery.js` | **ABSENT** |
| Bounded underlying fallback | — | `5afe1c0` (PR #210) |
| Bounded IVR phase | — | `b24bf9f` (PR #211) |
| Log throttling / greeks-log cap | — | `afa2eb0`, `3fbd769` (PR #213/#214) |
| Log-storm stability, `/market/quotes` breaker, CORS-on-error | — | `fdaa19c` (PR #209) |
| Side-effect-free incremental 4H reads | — | `13189db` (PR #219) |
| Reverted in place | — | PR #212 → reverted by `9830bc2`; PR #217 → reverted by `48055f3` |

**`lib/` module delta:** `lib/portfolio-recovery.js` is main-only; `lib/cors-error-handler.js`
and `lib/log-throttle.js` are dev-4h-only. The **five modules the Reuse Manifest depends on**
(`option-chain-nested`, `option-chain-cache`, `option-symbol`, `request-coalescer`,
`market-context`) are **byte-identical on both branches**, so every option-chain, coalescer,
option-symbol and market-context finding is branch-independent. Only `server.js` differs.

**Consequence for PR 2, recorded rather than glossed over:** basing on `dev-4h-backend` means
the orphaned-portfolio recovery work (PR #134) is **not present**. It must be forward-ported
or explicitly accepted before PR 2 merges.

### Provisional development target — audited facts

| Field | Value |
| --- | --- |
| Repository | `Fede-ai-coder/apex-backend` |
| Branch | `dev-4h-backend` |
| Commit | `25dd84245d8176bd6c3daa05be98e52afe0a934a` |
| Access mode | **READ ONLY** — 0 files modified |
| `server.js` | 19 675 lines (main: 19 364) |
| `lib/` modules | 42 (main: 43) |
| Backend test files | 69 (main: 65) |
| Express routes | 93 (same as main) |

### Audited backend file hashes

Recorded so the factual assertions in [§25](#25-factual-source-assertions) can be verified against exactly the
source that was audited. The five `lib/` hashes are **identical on both branches**; only `server.js` differs:

| File | sha256 |
| --- | --- |
| `lib/option-chain-nested.js` | `509cbc8fc53e7804c281c327f84096607ebde66610918bf2bf65baced6a8bc2a` |
| `lib/option-chain-cache.js` | `a8a39ba1f031b4233519c6c56f05b3b4f2d7ecad590f484f67fa5f5650901279` |
| `lib/option-symbol.js` | `5caa503cee91279406faa1887a59fc364c1c5712c6e5e11f6313d324ede028f7` |
| `lib/request-coalescer.js` | `adae83c8b4377e0ef5710bb73ed7e6545bc925d54a7b4048f7132f9baff72ae3` |
| `lib/market-context.js` | `72bd1fdf8a57ae2433eeddc38250e6851c631f89ae4e85a0c53958870916fb33` |
| `server.js` | `c025459fab2a293a2cbf01a20224567e7ee634fb6b4efec13d19071a4ae2b53a` |

### Relevant open PRs

The audit deliberately does not read from open PRs. PR #310 and PR #352 are not sources for
this specification.

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
tests/portfolio-stress-source-facts.test.js          ← added in revision 1.1.0
```

**Why a fourth test file.** Revision 1.0.0 passed 194 self-consistency assertions while
asserting things the audited backend contradicts. A test that only compares a document
against itself cannot catch that. `portfolio-stress-source-facts.test.js` checks the
specification's load-bearing claims against the **audited source**, and it is a separate
file because its dependency shape is genuinely different from the other three: it is the
only one that reaches outside this repository (to an `apex-backend` checkout, when one is
reachable) and the only one that degrades to a printed **SKIP** rather than a pass when its
subject is absent. Folding that conditional-subject behaviour into the other files would blur
what each of them guarantees unconditionally. With no backend checkout — the state of this
repository's own CI — it still runs 25 unconditional assertions and exits 0.

### Files that must remain untouched

`index.html`, `js/**`, `css/**` — see [§29](#30-hash-identity-and-zero-runtime-change-proof).

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

Ownership is stated **per execution tier**. `PST-REUSE-002` requires one canonical owner per
responsibility *per tier*, plus a parity contract across tiers — because a frontend
declaration inside `index.html` is **not callable from the backend**, and PR 2 is backend
work. See [§26](#26-crosstier-portfolio-parity).

| Responsibility | Existing owner | Repository | Callers | Data/source | Decision | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| portfolio scope | FE tier: `getOpenPortfolioRiskPositions` · BE tier: `buildPortfolioPositionsFromJournal` | apex-trading + apex-backend | 3 | FE `positionManager.getByPortfolio(…)` · BE `SELECT * FROM trades WHERE portfolio_id = ?` | **REUSE** | `index.html:18593`; BE `server.js:13601`, `:13615`; tests `portfolio-greeks-scope-audit`, BE `portfolio-positions-enriched`, BE `journal-portfolio-link` |
| open-position filtering | FE tier: `_portfolioTradeIsOpenForRisk` · BE tier: `isJournalTradeOpenForCurrentRisk` | apex-trading + apex-backend | 6 | trade status fields; BE also `closedAt` | **REUSE** | `index.html:18571`; BE `server.js:13587`. ⚠ vocabularies **diverge** — see [§26](#26-crosstier-portfolio-parity) |
| active-leg filtering | FE tier: `isActivePortfolioLeg` / `getActivePortfolioLegs` · BE tier: `isJournalLegOpenForCurrentRisk` | apex-trading + apex-backend | 21 | leg status + close markers + residual qty; BE also `exitPrice` | **REUSE** | `index.html:18665`, `:18679`; BE `server.js:13594`. ⚠ the BE has **no partial-close concept** — see [§26](#26-crosstier-portfolio-parity) |
| residual quantity | FE tier: `_portfolioLegEffectiveQty` (complete) · BE tier: **PARTIAL** — `finiteNumber(leg.qty) ?? 1` | apex-trading + apex-backend | 17 | FE 9 explicit residual fields then `qty\|quantity\|contracts` · BE `leg.qty`, **defaulting to 1** | **EXTEND** | `index.html:18630`, `:18618`; BE `server.js:13631`. The BE **default-to-1** is exactly what `PST-DATA-002` forbids on a stress input |
| SPY price resolution | **run-authoritative:** the backend underlying spot resolver inside `POST /portfolio/live-refresh` · **presentation:** the frontend three-part composed owner | apex-backend + apex-trading | 15 | BE `dxLinkManager.getLiveQuote(sym)` + freshness classification + `LAST_CLOSE` fallback · FE `/market/live/SPY` → `/market/quotes` → `/scanner` → `S.marketContextSnapshot` → priceMap → aggregated → cache → candle close | **REUSE** | BE `server.js:11208-11300`; FE `index.html:19457`, `:19591`, `:19044`, orchestrated at `:26735`; tests BE `portfolio-endpoints`, FE `portfolio-spy-price-freshness`, `portfolio-price-resolver-cascade`. **Run authority resolved to the BACKEND** — see [§28](#28-canonical-spy-source-of-a-run) |
| option-symbol construction | `buildCanonicalOptionSymbol` (backend, canonical for stress); `buildCompactOptionDxlinkSymbol` + `getPreferredOptionDxlinkSymbol` (frontend) | apex-backend + apex-trading | 10 | structured leg | **REUSE** | `lib/option-symbol.js:58`; `js/utils/option-symbols.js:55`; `index.html:22718`; tests `option-symbol.test.js` (BE), `portfolio-option-streamer-symbol`, `pure-utils-extraction` |
| option-chain retrieval | `fetchOptionChainNested` + `GET /option-chains/:symbol/nested` — **DISCOVERY role only** | apex-backend | 1 | Tastytrade nested chain via a **route-local** fetch (**not** `ttFetch`) with **injected** `getAccessToken` | **REUSE** | `lib/option-chain-nested.js:246`; `server.js:5841`; test `option-chain-nested.test.js`. Corrected — see [FACT-CHAIN-NO-TTFETCH](#25-factual-source-assertions) |
| option-chain cache | `OptionChainCache` + `optionChainCache` singleton + `withCacheMeta`; single-flight via its **own** `this.pending` Map and `coalesce()` | apex-backend | 1 | wraps `fetchOptionChainNested` | **REUSE** | `lib/option-chain-cache.js:51`, `:65`, `:118`, `:150`; test `option-chain-cache.test.js`. Corrected — **not** `createRequestCoalescer`, and revalidation is a **promise, not a timer** |
| quote retrieval | `dxLinkManager.quoteCache` / `optionQuoteCache` via `/portfolio/live-refresh`, `/market/quotes`, `/market/live/:symbol`, `/market/option-live/:symbol` | apex-backend | 8 | DXLink Quote events | **REUSE** | `server.js:701`, `:711`; routes `:5059`, `:7269`, `:7294`, `:10979`; tests `portfolio-endpoints`, `portfolio-positions-enriched`, `no-yahoo-portfolio-quotes` |
| Greeks retrieval | `dxLinkManager.greeksCache`, read **by exact symbol** via `readOptionLivePayloadForPortfolio` | apex-backend | 7 | DXLink Greeks events — **raw event units** | **REUSE** | `server.js:705`, `:7397`, `:7409`, `:13648`; tests `portfolio-positions-enriched` (BE), `portfolio-greeks-refresh-totals`, `portfolio-greeks-stale-display` |
| beta retrieval | `lib/beta-provider.js` + `lib/beta-store.js` + `GET /market/betas/latest`; FE cache `_apexLatestBetaBySymbol` | apex-backend + apex-trading | 5 | Tastytrade → yahoo_beta → self_benchmark, persisted in `symbol_betas` | **REUSE** | `lib/beta-provider.js:196`; `lib/beta-store.js:245`; `server.js:18878`; `index.html:19729`, `:19749`; tests `beta-provider`, `beta-endpoints`, `portfolio-tastytrade-beta-latest`, `portfolio-beta-refresh` |
| VIX retrieval | `buildVixFamilySnapshot` + `GET /market-context/vix-family/live`; FE `S.vixFamily` | apex-backend + apex-trading | 4 | DXLink index-level cache for `$VIX.X`, `$VIX9D.X`, `$VIX3M.X`, `$VIX6M.X` | **REUSE** | `server.js:10395`, `:10308`, `:10612`; `index.html:1505`; tests `vix-family-live-endpoint` (BE), `vix-family-backend-source`, `vix-family-premature-close` |
| market snapshot | `GET /market-context/snapshot` + `computeTechnicals` — **portfolio-agnostic** | apex-backend | 2 | DXLink candle cache (SPY, VI3M) + `buildVixFamilySnapshot` | **REUSE** | `server.js:10482`; `lib/market-context.js:240`; test `market-context-snapshot.test.js`. **Corrected from EXTEND** — see [§27](#27-stressrun-snapshot-ownership) |
| HTTP transport | `ttCall`, `_ttCallWithRetry` | apex-trading | 75 references over 24 endpoint paths | `BACKEND` base URL | **REUSE** | `js/api/backend-client.js:16`, `:71`; tests `backend-client-contract`, `backend-config-contract` |
| authentication | FE `ttCall` header assembly + `_backendAuthHeaders`; BE `requireApiKey` | apex-trading + apex-backend | 39 | `S.ttSessionId`, `S.backendKey`; BE `API_KEY` | **REUSE** | `js/api/backend-client.js:16-24`, `:43`; `server.js:2376`; tests `backend-client-contract`, `backend-candle-auth-gate` |
| retry/error classification | FE `_isTransientFetchError`, `_httpStatusFromError`, `_ttCallWithRetry`; BE `classifyOptionChainError`, `OptionChainError`, `isAbortLikeError` | apex-trading + apex-backend | 9 | error message/name strings | **REUSE** | `js/api/backend-client.js:96`, `:115`, `:71`; `lib/option-chain-nested.js:144`, `:49`, `:67`; tests `backend-client-contract`, `journal-transient-sync-resilience`, `option-chain-nested` |
| **pricing** | *(none)* | — | 0 | — | **NEW** | See [ABSENCE-PRICING](#61-absence-pricing--pricing-engine) |
| **scenario calculation** | *(none)* | — | 0 | — | **NEW** | See [ABSENCE-SCENARIO](#62-absence-scenario--scenario-engine) |
| **matrix calculation** | *(none)* | — | 0 | — | **NEW** | See [ABSENCE-MATRIX](#63-absence-matrix--matrix-engine) |
| UI state | `_activePanelPortfolioId`, `positionManager`, the `S` global | apex-trading | 50 | in-memory only; selection deliberately not persisted | **EXTEND** | `index.html:20288`, `:17640`, `:1500` region, non-persistence noted at `:17757`; tests `portfolio-storage-recovery`, `portfolio-debug-tools`. Selection is reused read-only; the ephemeral overlay slice is additive and must never write to `S.portfolioData`, `positionManager` or `localStorage`. |
| **UI rendering** | *(none for stress)* | — | 0 | — | **NEW** | See [ABSENCE-STRESS-UI](#66-absence-stress-ui--stress-test-ui). Follows the existing `js/ui/*-panel.js` extraction pattern (3 such modules exist), but owns a genuinely new responsibility. |

### Supplementary responsibilities

| Responsibility | Existing owner | Repository | Decision | Evidence / constraint |
| --- | --- | --- | --- | --- |
| **exact-contract hydration** | `readOptionLivePayloadForPortfolio` + canonical-symbol dedupe | apex-backend | **REUSE** | `server.js:13648`. **PRIMARY** hydration path; performs **zero** option-chain access. See [§24](#24-exactcontract-hydration) |
| **option-chain discovery / browsing** | `GET /option-chains/:symbol/nested` + `fetchOptionChainNested` + `OptionChainCache` | apex-backend | **REUSE** | `server.js:5841`, `:5898-5931`. **DISCOVERY / FALLBACK only** |
| option-chain single-flight | `OptionChainCache.coalesce` over its own `this.pending` Map | apex-backend | **REUSE** | `lib/option-chain-cache.js:65`, `:118`, `:130`. **Not** `createRequestCoalescer` |
| stress-run single-flight | `createRequestCoalescer` | apex-backend | **REUSE** *(available, not yet used for this)* | `lib/request-coalescer.js:29`; real consumers are `marketMetricsCache` (`server.js:3409`) and `candlesResponseCache` (`:3410`); tests `request-coalescer`, `backend-latency-guards` |
| backend portfolio execution scope | `buildPortfolioPositionsFromJournal` + `isJournalTradeOpenForCurrentRisk` + `isJournalLegOpenForCurrentRisk` + `buildPortfolioPositionsFromPayload` | apex-backend | **REUSE** | `server.js:13601`, `:13587`, `:13594`, `:13615`; tests `portfolio-positions-enriched`, `journal-portfolio-link` |
| backend underlying spot resolution | the resolver block inside `POST /portfolio/live-refresh` | apex-backend | **EXTEND** | `server.js:11208-11300`. The owner exists and already produces price + source + freshness, but is **route-local and unexported**. Sharing it is an *extraction*, not a new resolver. |
| **stress-run snapshot builder** | *(none)* | — | **NEW** | [ABSENCE-STRESS-RUN-SNAPSHOT](#68-absence-stress-run-snapshot--stressrun-snapshot-builder). Composes existing owners; see [§27](#27-stressrun-snapshot-ownership) |
| **underlying shock mapping** | *(none)* | — | **NEW** | [ABSENCE-UNDERLYING-SHOCK](#69-absence-underlying-shock--underlying-shock-mapping). See [§22](#22-nonspy-underlying-shock) |
| **equity/ETF stress calculation** | *(none)* | — | **NEW** | [ABSENCE-EQUITY-STRESS](#610-absence-equity-stress--equityetf-stress-calculation). See [§23](#23-equities-and-etfs) |
| **cross-tier parity contract + fixtures** | *(none)* | — | **NEW** | [ABSENCE-PARITY](#611-absence-parity--crosstier-parity). A contract-and-test responsibility, not a runtime module. See [§26](#26-crosstier-portfolio-parity) |
| stress result cache | *(none)* | — | **NEW** | [ABSENCE-STRESS-CACHE](#64-absence-stress-cache--stress-result-cache). Caches **results only**, keyed on `snapshotId + scenarioHash + overlayHash`. |
| ephemeral overlay state | *(none)* | — | **NEW** | [ABSENCE-OVERLAY-STATE](#67-absence-overlay-state--ephemeral-overlay-state). In-memory only. |
| snapshot invalidation | *(none)* | — | **NEW** | [ABSENCE-SNAPSHOT-INVALIDATION](#65-absence-snapshot-invalidation--snapshot-invalidation). Must emit `INPUTS CHANGED — RERUN REQUIRED`. |

### Derived counts

Counts are **derived from the manifest**, never a target to preserve. Revision 1.1.0 changed
the *composition* even though the core totals coincide with 1.0.0 — `market snapshot` moved
`EXTEND → REUSE` and `residual quantity` moved `REUSE → EXTEND`, cancelling out. The
supplementary tier grew from 5 rows to 13.

| Tier | Total | REUSE | EXTEND | NEW | UNAVAILABLE |
| --- | --- | --- | --- | --- | --- |
| Core | 21 | 15 | 2 | 4 | 0 |
| Supplementary | 13 | 5 | 1 | 7 | 0 |
| **Combined** | **34** | **20** | **3** | **11** | **0** |

`tests/portfolio-stress-reuse-contract.test.js` recomputes these from the manifest and fails
if the declared numbers drift from the actual rows.

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
  missing capability. **Resolved in 1.1.0:** the run's SPY is frozen by the BACKEND — see
  [§28](#28-canonical-spy-source-of-a-run).
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

### 6.8 ABSENCE-STRESS-RUN-SNAPSHOT — stress-run snapshot builder

**Conclusion: `NO_CANONICAL_OWNER`.** Searched: `snapshotId`, `runSnapshot`,
`stressSnapshot`, `positionsHash`, `overlayHash`, `scenarioHash`, `portfolioRevision`,
`marketDataAsOf`. **Zero** matches across `apex-backend`.

`GET /market-context/snapshot` is the closest construct and is deliberately
**portfolio-agnostic** — `lib/market-context.js` contains zero references to portfolio,
overlay or scenario. No existing construct binds a portfolio revision, an overlay and a
scenario set to one frozen market snapshot.

**Why this is not an EXTEND.** Adding `portfolioId` / `positionsHash` / `overlayHash` /
`scenarioHash` to the market-context snapshot would inject Portfolio and Stress-run semantics
into a *shared, globally cacheable market-data resource*, and would make a generic market
cache entry invalidate whenever a user edits an overlay. The correct composition runs the
other way: a **NEW** stress-run snapshot builder that *consumes* the market-context snapshot
unchanged. See [§27](#27-stressrun-snapshot-ownership).

**Verdict:** may be classified `NEW`.

### 6.9 ABSENCE-UNDERLYING-SHOCK — underlying shock mapping

**Conclusion: `NO_CANONICAL_OWNER`.** Searched: `downside beta`, `downsideBeta`,
`semi-beta`, `bear beta`, `shock`, `stressReturn`, `betaShockFactor`, `idiosyncratic`.

Both repositories contain **only ordinary beta** (`lib/beta-provider.js`,
`lib/beta-store.js`, `GET /market/betas/latest`, frontend `_apexLatestBetaBySymbol`), sourced
`tastytrade | yahoo_beta | self_benchmark`. A search for downside beta in any spelling
returns **zero** matches in either repository. No code anywhere maps a benchmark move to a
per-symbol move.

The beta *source* is REUSE; the *mapping* is new.

**Verdict:** may be classified `NEW`. Because no downside beta exists,
`PST-UNDERLYING-003` may not assume one, and `PST-UNDERLYING-004` requires an ordinary-beta
fallback to be labelled honestly and marked `DEGRADED`.

### 6.10 ABSENCE-EQUITY-STRESS — equity/ETF stress calculation

**Conclusion: `NO_CANONICAL_OWNER`.** No equity or ETF stress P&L calculation exists. The
only shares-vs-contracts distinction anywhere is inside the frontend unrealized-P&L helper,
where the multiplier is a literal derived from leg type (`option → 100`, `equity → 1`). That
helper computes **current unrealized** P&L from entry price, not **stressed** P&L from a
shocked spot.

**Verdict:** may be classified `NEW`.

### 6.11 ABSENCE-PARITY — cross-tier parity

**Conclusion: `NO_CANONICAL_OWNER`.** No cross-repository parity test exists today, and the
two tiers **already disagree**:

- `deleted` is backend-only; `ROLLED`, `ASSIGNED`, `EXERCISED`, `CASH_SETTLED` and `TERMINAL`
  are frontend-only;
- the backend has **no partial-close concept** at all — it rejects any leg carrying
  `exitPrice`, while the frontend keeps such a leg active when an explicit residual open
  quantity remains.

Nothing detects this divergence today.

**Verdict:** may be classified `NEW`. This is a contract-and-test responsibility, not a
runtime module.

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

### 7.2 Refresh — measured, not perceived, and measured on the provisional development target

> Revisions 1.0.0 and 1.1.0 answered this against `main@6eebb99`, where the underlying-price
> fallback was a **serial, unbounded inline await**. That is not the target backend's
> behaviour. Re-measured against the provisional development target `dev-4h-backend@25dd8424`.

| Measure | Value |
| --- | --- |
| Auto-refresh interval | **60 000 ms** (`index.html:17123`) |
| Batch hydration requests per cycle | **1** — `POST /portfolio/live-refresh` (`server.js:11029-13186`) |
| Backend enriched probe | 1 |
| Technical refresh | 0 or 1, plus at most 1 targeted retry |
| Requests per symbol | **0** in the healthy path |
| Requests per leg | **0** |
| Requests per cell | **0** |
| **Option-chain requests on either Portfolio route** | **0** — of *any* kind, owner or raw |
| Frontend computation | pure, in-memory, no network |

**Why the current Portfolio is sufficiently reactive** — from the source of the provisional
development target:

1. One persistent DXLink WebSocket; quotes/Greeks served from in-memory `Map`s
   (`quoteCache:722`, `greeksCache:726`, `optionQuoteCache:732`) rather than fetched per request.
2. Option hydration is **by exact symbol** with `Set`-based dedupe. Both Portfolio routes
   contain **zero** option-chain access, measured over their exact boundaries
   (`11029-13186` and `13235-13649`).
3. **The underlying-price fallback is deferred, batched and bounded** (PR #210). Symbols whose
   quote is unusable are collected into `underlyingFallbackNeeded` (`11432`, `11485`); then
   `runUnderlyingLastCloseFallbacks` (`11372`) runs **once** for the whole batch (`11489`),
   and the per-symbol loop reads the precomputed map (`11505`):

   ```
   UNDERLYING_LAST_CLOSE_FALLBACK_CONCURRENCY            = 2      (worker pool)
   UNDERLYING_LAST_CLOSE_FALLBACK_PER_SYMBOL_TIMEOUT_MS  = 450    (raced per symbol)
   UNDERLYING_LAST_CLOSE_FALLBACK_TOTAL_BUDGET_MS        = 1200   (hard stop)
   ```

   A slow or dead provider costs the request **at most 1.2 s regardless of portfolio size**;
   it cannot serialise into an unbounded stall. Symbols the budget never reaches are recorded
   as timed out, not left undefined.
4. **The IVR phase is bounded too** (PR #211): unresolved symbols are marked timed out via
   `markIvrTimeout` instead of extending the request, with `ivrDiagnostics` published.
5. market-metrics reads are coalesced and TTL-cached through `getMarketMetricsItemCached`
   (`3439`) over `marketMetricsCache` (`3430`), so N positions on one underlying cost one
   upstream call.
6. Underlying symbols are deduplicated into a `Set` before subscribing.
7. The route runs under an explicit server budget with per-phase timings.
8. Log throttling and greeks-log capping (PR #213/#214) plus the `/market/quotes` circuit
   breaker (PR #209) stop a degraded upstream becoming a log storm that slows the process itself.
9. A frontend storm circuit breaker suppresses per-symbol fan-out while the backend is down.

**Implication for the stress design.** One batch request carrying every scenario, each exact
contract hydrated at most once **by exact symbol**, chain for discovery only — and **every
remaining provider fallback given an explicit concurrency limit, per-item timeout and total
budget**, in the manner of `runUnderlyingLastCloseFallbacks`. Copying that *shape* is
required; copying its *code* is forbidden (`PST-REUSE-003`). The audited values
(2 / 450 ms / 1200 ms) are recorded as the reused owner's parameters, **not** as approved
stress thresholds — stress budgets derive from the PR 2 benchmarks (`PST-PERF-003`).

### 7.3 Data available today

| Datum | Present | Source / note |
| --- | --- | --- |
| underlying spot | yes | `underlyings[sym].price` from live-refresh; `resolvePortfolioLivePrice` cascade |
| bid / ask | yes | DXLink option quote cache |
| mark | yes | live-refresh `options[symbol]`; frontend mark mapping pinned by `tests/portfolio-enriched-mark-mapping.test.js` |
| last | yes | quote payload |
| implied volatility | yes | DXLink Greeks event `volatility` field |
| delta / gamma / theta / vega | yes | DXLink Greeks, **raw event units** (see [§8](#8-canonical-units)) |
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

**Per-leg live Greeks are RAW DXLINK EVENT UNITS, unscaled by quantity and unscaled by
contract multiplier.**

Revision 1.0.0 called these "per share". That was an **inference, not a proven provider
contract**, and it has been corrected. Precisely:

*What the audited source does prove.* The backend passes the values through unmodified, and
states in `server.js` that `volatility` is the fractional IV (e.g. `0.23`) and must **never**
be multiplied by 100. `aggregateGreeks` (`index.html:18834`) multiplies each per-leg live
Greek by `sign × abs(effectiveQty)` and never divides — so nothing upstream has pre-applied
quantity or multiplier.

*What no audited source proves.* Whether `delta` / `gamma` / `theta` / `vega` are
economically **per share** or **per contract**. The provider contract does not state it and
no test pins it.

The specification therefore records **raw event units** and requires the pricing engine to
establish the economic scaling **explicitly**, rather than inheriting an inference
(`PST-UNITS-001`).

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
exactly `1.0` (`1.0 → 100`, and `100` stays `100`).

**Resolved in revision 1.1.0 (`PST-UNITS-001..005`).** `normalizeGreekPoints` is classified
as a **presentation / compatibility transform of the current Portfolio**, not a unit
definition. Consequently:

- the pricing and scenario engines operate on their own **canonical mathematical units** and
  record the unit of every input they consume;
- `normalizeGreekPoints` output **MUST NOT** be an engine input;
- raw engine outputs and display outputs are **distinct fields** — a display transform never
  overwrites a raw value;
- Actual and Overlay are compared in the **same raw units**; mixing a raw Greek with a
  points-normalized Greek is forbidden;
- **no magnitude heuristic** may alter an engine input. Provider units are established by
  contract, not inferred from how large a number looks.

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
conversion must be explicit — [`PST-OPEN-003`](#21-open-and-resolved-decisions).

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

Input validation, unit normalization, the **stress-run snapshot**, exact-contract hydration,
**the frozen SPY and VIX triples**, **the per-symbol underlying shock mapping**, pricing,
**equity/ETF stress P&L**, scenario execution, Actual, Overlay, Proposed, Difference, matrix
batch, post-stress Greeks, result diagnostics, performance budget, a short result cache,
single-flight.

### Extension-first rule

The backend stress endpoint **composes** existing owners. It must not rebuild Portfolio
hydration, exact symbol construction, **exact-symbol quote and Greeks reads**, option chain
retrieval, the option chain cache, quote resolution, Greeks resolution, SPY resolution, VIX
resolution or beta resolution.

Concretely, it must call: `buildPortfolioPositionsFromJournal`,
`isJournalTradeOpenForCurrentRisk`, `isJournalLegOpenForCurrentRisk`, `buildCanonicalOptionSymbol`,
`readOptionLivePayloadForPortfolio`, the backend underlying spot resolver,
`buildVixFamilySnapshot`, `getLatestBetas`, the market-context snapshot, and `requireApiKey`.
It **may** compose `createRequestCoalescer` (stress-run single-flight) and
`fetchOptionChainNested` / `optionChainCache` (**discovery only**).

### Thin modules permitted

A future frontend client may exist to call the endpoint, but it must delegate to `ttCall`.
A future adapter may exist to translate a response, but it must not duplicate Portfolio scope
or market-data resolution.

---

## 10. Contract IDs

All **138** contract IDs are mirrored verbatim in the JSON. Levels are `MUST`,
`MUST NOT` or `MAY`.

### Anti-duplication — `PST-REUSE-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-REUSE-001` | Inventory before design | MUST | Every future responsibility MUST appear in the Reuse Manifest before it is assigned to a module. |
| `PST-REUSE-002` | One canonical owner **per execution tier** | MUST | Every responsibility MUST have exactly one canonical owner *per execution tier* (frontend presentation, backend execution). A responsibility owned in both tiers MUST declare both owners and MUST be covered by a parity contract; it MUST NOT be claimed that a frontend declaration inside `index.html` is directly callable from the backend. Within a single tier, two implementations remain forbidden. |
| `PST-REUSE-003` | No copied implementation | MUST NOT | An existing function MUST NOT be copied, transcribed or rewritten under a new name, **within a tier or across tiers**. Cross-tier agreement MUST be achieved by a parity contract over shared fixtures, not by physical duplication. |
| `PST-REUSE-004` | Thin delegation only | MAY | A new adapter MAY delegate to an existing owner, but MUST NOT re-transcribe its formulas, normalization or fallbacks. |
| `PST-REUSE-005` | No parallel caches | MUST NOT | No parallel cache for data already owned by Portfolio, DXLink, the option-chain cache, the candle store or market context. |
| `PST-REUSE-006` | No parallel market-data path | MUST NOT | No second path for SPY, VIX, option quotes, option Greeks, beta or underlying spot. |
| `PST-REUSE-007` | Extension before replacement | MUST | When a partial owner exists, the default decision MUST be `EXTEND`, not `NEW`. |
| `PST-REUSE-008` | Existing tests remain authoritative | MUST | Future implementations MUST continue to pass the tests of every reused owner. |
| `PST-REUSE-009` | No ownership by filename assumption | MUST NOT | A new file's name MUST NOT be decided before the ownership audit. |
| `PST-REUSE-010` | Reuse evidence | MUST | Every `REUSE`/`EXTEND` decision MUST state definition, callers, tests, units, dependencies and reason. |
| `PST-REUSE-011` | No third coalescing implementation | MUST NOT | Single-flight MUST reuse an existing owner. `OptionChainCache.coalesce` owns option-chain single-flight; `createRequestCoalescer` owns TTL micro-cache single-flight and is available for stress runs. A third implementation MUST NOT be introduced. |

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
| `PST-SPY-001` | **Run-authoritative SPY owner** | MUST | The run's SPY price MUST be frozen by the **backend** Stress Engine using the existing backend underlying spot owner and the same market-data snapshot as the rest of the run. The contract MUST NOT require the backend to call a frontend function. The frontend resolver remains canonical for Portfolio display and optional preflight comparison. |
| `PST-SPY-002` | No second SPY resolver | MUST NOT | A second SPY resolver MUST NOT be created **in either tier**. |
| `PST-SPY-003` | Frozen SPY snapshot fields | MUST | A run MUST freeze `spySnapshotPrice`, `spyPriceSource`, `spyPriceTimestamp`, `snapshotCreatedAt`, and the response MUST report them. |
| `PST-SPY-004` | Percentage shock | MUST | `stressedSpyPrice = spySnapshotPrice × (1 + spyReturn)`. |
| `PST-SPY-005` | Absolute target | MUST | `impliedSpyReturn = targetSpyPrice / spySnapshotPrice - 1`. |
| `PST-SPY-006` | Missing SPY never becomes zero | MUST | Missing or stale SPY MUST produce `DEGRADED` or `UNAVAILABLE`, never zero. |
| `PST-SPY-007` | **One run, one frozen SPY source** | MUST | A run MUST have exactly one frozen SPY source. The frontend MUST display the returned triple and MAY compare it with the price Portfolio already shows, but MUST NOT run a second resolver for the same run and MUST NOT substitute its own value after the run has started. |

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
| `PST-ACTUAL-002` | Canonical scope helpers **per tier** | MUST | The canonical scope and active-leg filtering owners **of the executing tier** MUST be reused. The backend Stress Engine MUST use the backend owners; it MUST NOT transcribe the frontend helpers. |
| `PST-ACTUAL-003` | Terminal legs contribute zero | MUST | Closed, rolled, terminal and quantity-zero legs MUST contribute zero. |
| `PST-ACTUAL-004` | Other portfolios excluded | MUST | Positions of other portfolios MUST be excluded. |
| `PST-ACTUAL-005` | Immutable input | MUST | The Actual Portfolio input MUST be immutable. |
| `PST-ACTUAL-006` | No second Portfolio rule set | MUST NOT | No second, Stress-Test-specific set of Portfolio rules **in either tier**. |

### Cross-tier parity — `PST-PARITY-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-PARITY-001` | Cross-tier scope agreement | MUST | The frontend and backend owners MUST agree, on the same fixture, about: trade open/closed, leg active/terminal, rolled, assigned, exercised, expired, partial close, and residual quantity zero versus non-zero. |
| `PST-PARITY-002` | Semantic parity, not physical duplication | MUST NOT | The frontend implementation MUST NOT be copied into the backend word for word when the backend already has its own owner. The objective is semantic parity. |
| `PST-PARITY-003` | Divergence fails the run | MUST | A divergence between the backend stress scope and the Portfolio UI scope MUST make the run unavailable and MUST produce diagnostics. It MUST NOT be tolerated silently. |
| `PST-PARITY-004` | Shared fixtures | MUST | Parity fixtures MUST be shared or generated from a common manifest, so the two tiers cannot drift behind two independent sets of expected values. |
| `PST-PARITY-005` | Taxonomy changes update both tiers | MUST | Any future change to the status taxonomy MUST update both owners and the parity tests in the same change. |

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
| `PST-SNAPSHOT-005` | **Market context stays portfolio-agnostic** | MUST NOT | The generic market-context snapshot MUST NOT be extended with portfolio identity, positions hash, overlay hash, scenario hash or any stress-run identity. It is reused as a market-data input only. |
| `PST-SNAPSHOT-006` | **Stress-run snapshot composes, never duplicates** | MUST | The stress-run snapshot builder MUST compose the existing portfolio, market-data, SPY, VIX, spot, quote and Greeks owners without duplicating any of their sources. An overlay change MUST invalidate the run **without** invalidating the global market-context cache. |

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
| `PST-HYDRATION-001` | **Exact-symbol hydration is the primary path** | MUST | When underlying, expiration, strike and PUT/CALL are already known, the backend MUST hydrate by: building the exact canonical symbol; deduplicating by canonical symbol; reading `optionQuoteCache` and `greeksCache` **directly**; applying the same freshness and missing-reason rules the enriched path already uses; optionally warming that single exact symbol through existing DXLink orchestration; and returning quote, Greeks, provenance and timestamps. **The nested option chain MUST NOT be on this path.** |
| `PST-HYDRATION-002` | **Nested chain is discovery and fallback** | MUST | The nested chain MUST be used only to populate expiration and strike selectors, to browse the chain, to confirm availability when needed, as a diagnostic fallback when the exact canonical symbol cannot be validated, and to retrieve metadata unobtainable from the exact-symbol path. |
| `PST-HYDRATION-003` | Contract not found | MUST | Yields `UNAVAILABLE — exact contract not found`. |
| `PST-HYDRATION-004` | One hydration per contract per run | MUST | Each exact contract hydrated at most once per run, deduplicated by canonical symbol. Two identical legs MUST cause exactly one hydration. |
| `PST-HYDRATION-005` | At most one chain fetch per underlying | MUST | When the chain is genuinely required it MUST be fetched at most once per underlying per run, through the existing chain cache and its coalescer. A chain fetch per scenario, per cell, or per already-identified leg is forbidden. |
| `PST-HYDRATION-006` | No mandatory chain when the exact symbol resolves | MUST NOT | A chain fetch MUST NOT be required when the exact symbol's quote and Greeks are already available. An unavailable or failing chain MUST NOT make an exact symbol `UNAVAILABLE` when the DXLink caches already hold its data. |
| `PST-HYDRATION-007` | Hydration provenance | MUST | Every hydrated leg MUST report which path resolved it (`exact_symbol_cache` \| `exact_symbol_warmed` \| `chain_confirmed` \| `unresolved`), with provenance, timestamps and, when unresolved, a missing reason. |

### Non-SPY underlying shock — `PST-UNDERLYING-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-UNDERLYING-001` | Canonical current spot | MUST | Every symbol MUST start from the current spot obtained from the canonical owners the Portfolio already uses. No second spot resolver. |
| `PST-UNDERLYING-002` | Manual symbol override | MAY | The user MAY set a symbol's percentage shock directly. It MUST take precedence over any beta-derived shock and MUST be visible in the diagnostics. |
| `PST-UNDERLYING-003` | Downside beta | MAY | When a **measured and documented** downside beta exists it MAY derive the symbol's shock from SPY's. A downside beta MUST NOT be invented. **None exists at the audited commit.** |
| `PST-UNDERLYING-004` | Ordinary beta fallback | MAY | Ordinary beta MAY be a fallback, but MUST NOT be called downside beta, its source MUST be shown, the result MUST be at least `DEGRADED`, and manual override MUST remain possible. |
| `PST-UNDERLYING-005` | Return formula | MUST | `symbolStressReturn = manualSymbolReturn` **or** `betaShockFactor × spyReturn + idiosyncraticReturnOverride`. `betaShockFactor` MUST declare its source; `idiosyncraticReturnOverride` MUST have an explicit, non-hidden default; a missing input MUST NOT silently become zero. |
| `PST-UNDERLYING-006` | Stressed spot | MUST | `stressedSpot = currentSpot × (1 + symbolStressReturn)`, finite and strictly `> 0`, carrying a source and a confidence/status. |
| `PST-UNDERLYING-007` | Missing mapping | MUST | With no manual override, no downside beta, no approved ordinary beta and no explicitly configured fallback, the position MUST be `UNAVAILABLE`. It MUST NOT be assumed to move with SPY and MUST NOT be assigned beta 1. |

### Equities and ETFs — `PST-EQUITY-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-EQUITY-001` | Signed shares | MUST | `signedShares > 0` for LONG, `< 0` for SHORT. The option contract multiplier MUST NOT be applied. |
| `PST-EQUITY-002` | Equity stress P&L | MUST | `equityStressPnl = (stressedSpot - currentSpot) × signedShares`. |
| `PST-EQUITY-003` | Reconciliation | MUST | `sum(optionLegStressPnl) + sum(equityStressPnl)` MUST reconcile exactly to the Portfolio Stress P&L, within the documented tolerance. |

### Temporal coherence — `PST-TEMPORAL-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-TEMPORAL-001` | Freeze before calculation | MUST | Every market input MUST be read and copied into the stress-run snapshot **before** any scenario calculation begins. No scenario, cell or leg may be evaluated against a value that was not already frozen. |
| `PST-TEMPORAL-002` | No reread during the matrix | MUST NOT | The pricing engine and the matrix engine MUST NOT reread the quote cache, the Greeks cache, SPY, VIX, underlying prices or Portfolio state while computing cells. **All cells MUST use the same frozen values.** |
| `PST-TEMPORAL-003` | Snapshot assembly interval | MUST | The snapshot MUST report `snapshotStartedAt`, `snapshotCompletedAt` and `snapshotAssemblyMs`. |
| `PST-TEMPORAL-004` | Per-input timestamp and age | MUST | Every input MUST report `source`, `asOf`, `ageMs`, `freshness` and `status` — for SPY, VIX, underlying prices, option quotes, implied volatilities, Greeks, beta and NLV. |
| `PST-TEMPORAL-005` | Cross-input skew | MUST | The snapshot MUST compute `oldestInputAsOf`, `newestInputAsOf`, `maxCrossInputSkewMs` and `maxInputAgeMs`. |
| `PST-TEMPORAL-006` | Explicit temporal policy | MUST | Thresholds MUST derive from the declared freshness policy and the PR 2 benchmarks. **No threshold may be hidden.** An input beyond threshold MUST produce `DEGRADED` or `UNAVAILABLE` by a declared rule. |
| `PST-TEMPORAL-007` | Same snapshot for Actual and Proposed | MUST | Actual, Overlay, Proposed and Difference MUST use the same snapshot id, prices, timestamps, implied volatilities, Greeks, beta and NLV. **Adding or editing the Overlay MUST NOT cause a new market read.** |

### Engine units — `PST-UNITS-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-UNITS-001` | Engine canonical units | MUST | The pricing and scenario engines MUST operate on their own canonical mathematical units and MUST record the unit of every input they consume. |
| `PST-UNITS-002` | No presentation transform as engine input | MUST NOT | `normalizeGreekPoints` MUST NOT be applied to any pricing or scenario engine input. |
| `PST-UNITS-003` | Raw and display outputs are distinct | MUST | Raw engine outputs and display outputs MUST be distinct fields; a display transform MUST NOT overwrite a raw value. |
| `PST-UNITS-004` | Actual and Overlay share units | MUST | Actual and Overlay MUST be compared in the same raw units. Mixing a raw Greek with a points-normalized Greek is forbidden. |
| `PST-UNITS-005` | No magnitude heuristics on engine inputs | MUST NOT | No heuristic based on a value's magnitude MUST alter an engine input. Provider units MUST be established by contract, not inferred from how large a number looks. |

### Backend implementation target — `PST-BACKEND-TARGET-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-BACKEND-TARGET-001` | Exact audited implementation target | MUST | The Backend Stress Engine PR MUST start from the backend commit **exactly** audited by this specification. If the branch or the deployment has advanced, a **delta audit and a specification update are mandatory** before the runtime PR begins. An unaudited branch tip MUST NOT be accepted automatically. |
| `PST-BACKEND-TARGET-002` | Deployment verification | MUST | The commit reported by `GET /version`, or read from the Railway dashboard, MUST equal the audited commit. A result of `null`, `UNAVAILABLE`, or a **different commit** does **not** automatically authorise PR 2. |
| `PST-BACKEND-TARGET-003` | No branch-name inference | MUST NOT | The deployed branch MUST NOT be inferred from the name of the Railway service. The blocker stays honest until the deployment is verified. |

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
| `PST-PRICING-007` | No hidden rate or yield defaults | MUST NOT | `riskFreeRate` and `dividendYield` MUST NOT have hidden defaults. A manual configuration MUST carry provenance, and a declared default MUST produce at least `DEGRADED`. |
| `PST-PRICING-008` | Absent rate or yield may make a leg unavailable | MUST | When the selected model requires a rate or dividend yield that cannot be sourced or configured, the affected leg MUST be `UNAVAILABLE` rather than priced on an invented input. |

### Results and matrix — `PST-RESULT-*`, `PST-MATRIX-*`

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-RESULT-001` | Four result sets | MUST | `actualResult`, `overlayResult`, `proposedResult`, `differenceResult`. |
| `PST-RESULT-002` | Additivity | MUST | `proposedStressPnl = actualStressPnl + overlayStressPnl` within a documented tolerance. |
| `PST-RESULT-003` | Incremental effect | MUST | `incrementalEffect = proposedStressPnl - actualStressPnl`. |
| `PST-RESULT-004` | Shared inputs | MUST | Actual and Proposed MUST use the same SPY, VIX, scenario, horizon, model, snapshot, **stressed spots** and sources. |
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
| `PST-DATA-002` | Missing never becomes a silent default | MUST NOT | A missing input MUST NOT be converted into zero, **nor into any other silent default such as a quantity of one or a beta of one**. |
| `PST-DATA-003` | No silent exclusion | MUST NOT | An unavailable leg MUST NOT be silently included or silently dropped. |
| `PST-DATA-004` | Incomplete Proposed is not VALID | MUST NOT | An incomplete Proposed MUST NOT be reported as `VALID`. |
| `PST-DATA-005` | Coverage reporting | MUST | Legs requested/evaluated/excluded, reasons, excluded value, sources, timestamps, fallbacks. |
| `PST-MONOLITH-001` | No **new** stress surface and no **new** duplicate owner in the monolith | MUST NOT | See [§20](#20-monolith-boundary). Audited legacy owners already in `index.html` are tolerated and out of scope. |
| `PST-MONOLITH-002` | Permitted monolith additions | MAY | Stylesheet link, script tag, `STRESS TEST` navigation entry, empty mount point, minimal bootstrap call site. |
| `PST-MONOLITH-003` | Specification PR is inert | MUST | This PR MUST NOT modify `index.html`, `js/**` or `css/**`, MUST NOT add an endpoint, implement behaviour, add persistence, or place an order. |

### Frontend parity runtime — `PST-PARITY-RUNTIME-*` *(1.2.3)*

The document-level parity contracts (`PST-PARITY-001..005`) say the two tiers must agree.
These say it must be **demonstrated by running the real owners over the real fixtures**.

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-PARITY-RUNTIME-001` | The frontend must reproduce the backend canonical outcome for every manifest fixture | MUST | The frontend MUST run every fixture of contracts/portfolio-scope-parity-manifest.json through its OWN existing scope owners and produce the outcome the backend recorded. Divergence in carriesCurrentRisk, signedQuantity, quantityStatus, quantitySource, positionSide or terminalReason MUST fail. A second scope owner written to satisfy this contract does not satisfy it: the outcome MUST come from the owners the Portfolio itself uses. |
| `PST-PARITY-RUNTIME-002` | Exactly one frontend parity identity owner, and its claim is atomic | MUST | The frontend MUST declare the three scope-parity identifiers in exactly ONE module, and its claim builder MUST produce all three or raise. It MUST NOT be possible to build a partial claim internally: a partial claim verifies one identifier, silently skips the other two, and still reads as compatible to anyone auditing the request. |
| `PST-PARITY-RUNTIME-003` | The manifest identity hash and the manifest file-content sha256 are distinct and both verified | MUST | The manifest IDENTITY hash covers the canonical JSON of the fixtures array only; the FILE-CONTENT sha256 covers the whole file. Both MUST be recorded and both MUST be verified. Treating either as the other MUST fail, because an edited manifest could otherwise keep a matching identity, and a byte-identical copy could otherwise carry a stale one. |
| `PST-PARITY-RUNTIME-004` | A stress response that does not carry the complete, matching triple is a divergence | MUST | The frontend MUST reject a response missing any one of the three identifiers, carrying a divergent value for any one of them, carrying null or an empty string, or carrying an invalid identity object. The error MUST be the canonical PORTFOLIO_SCOPE_PARITY_DIVERGENCE. Absence MUST NOT be read as agreement: a run whose vocabulary cannot be read is a run whose numbers cannot be compared. |
| `PST-PARITY-RUNTIME-005` | Divergence diagnostics carry the identifiers only, never Portfolio data | MUST NOT | A PORTFOLIO_SCOPE_PARITY_DIVERGENCE error MUST carry the expected and received value of each mismatched identifier so the divergence is actionable, and MUST NOT carry any Portfolio data — no portfolioId, no revision, no position, no quantity and no price. A non-string received value MUST be described by type rather than serialized. |
| `PST-PARITY-RUNTIME-006` | The authoritative parity identity is read from the response top level only | MUST | The frontend MUST read the three identifiers from the top level of the response and nowhere else. A nested identity object MUST NOT be accepted as a fallback: the REQUEST carries a portfolioScopeParity claim, so a backend that echoed the request back — or a proxy that merged the two — would satisfy the check with the client's own claim and prove nothing. A future envelope requires an explicit contract revision, not a preventive fallback. An identifier inherited from the prototype MUST be rejected. |
| `PST-PARITY-RUNTIME-007` | Expected cross-tier outcomes are generated by the backend, never held by the frontend | MUST NOT | The frontend MUST NOT hold its own table of expected cross-tier outcomes. Every expected block MUST be generated by the backend canonical owner and published in the manifest, and the frontend MUST compare against every field the manifest declares. A frontend-side expectation table makes the frontend the authority for what the backend produces, which is the divergence the manifest exists to prevent. |

### Frontend Stress client — `PST-CLIENT-*` *(1.2.3)*

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-CLIENT-001` | One endpoint, one method | MUST | The frontend stress client MUST issue POST /portfolio/stress-test/run and MUST declare that path exactly once. A second endpoint literal in the client MUST fail: two endpoints would mean two run identities and two contracts to keep in step. |
| `PST-CLIENT-002` | The client reuses the existing transport and authentication owner | MUST | The client MUST dispatch through the existing frontend transport owner (ttCall) for backend URL, authentication, request JSON, timeout/abort and error classification. It MUST NOT compose a backend URL, read an API key, build an auth header, call fetch directly or introduce any second HTTP system. |
| `PST-CLIENT-003` | portfolioRevision is mandatory at the client boundary | MUST | The client MUST refuse to build a request without a non-empty portfolioId and a non-empty portfolioRevision, and MUST NOT dispatch anything for a refused request. A run that is not pinned to a verifiable revision cannot be checked against the portfolio the backend loads. |
| `PST-CLIENT-004` | Every request carries the complete parity triple | MUST | Every stress request the client sends MUST carry portfolioScopeParity with all three identifiers, obtained from the parity identity owner rather than from a literal in the client. A request carrying a partial claim MUST be impossible to construct. |
| `PST-CLIENT-005` | The client never sends positions or a market snapshot | MUST NOT | The client MUST NOT send positions, marketSnapshot, spySnapshotPrice, spyPrice or snapshot. A caller supplying any of them MUST be refused with a named error rather than having the field silently dropped: a silent drop lets a caller believe it set the scope or the price. |
| `PST-CLIENT-006` | AbortSignal is honoured before dispatch and propagated to the transport | MUST | The client MUST accept an AbortSignal, MUST reject without dispatching when the signal is already aborted, and MUST forward the signal to the transport owner so an in-flight request is genuinely cancelled. Forwarding a signal to a transport that ignores it does not satisfy this contract. |
| `PST-CLIENT-007` | No frontend result cache, no persistence, no orders, no renderer | MUST NOT | The client MUST NOT memoize a result, write to any store, place an order, persist an Overlay or touch the DOM. Two identical runs MUST both reach the backend: the backend single-flight TTL is zero precisely so that no matrix is ever replayed from a market snapshot that no longer exists, and a frontend cache would reintroduce exactly that. |
| `PST-CLIENT-008` | Parity is verified before the response is exposed | MUST | The client MUST verify the complete scope-parity triple on the response BEFORE normalizing it and BEFORE returning anything to a caller. A divergent response MUST raise, not return a degraded result, and none of its numbers may reach the caller. |
| `PST-CLIENT-009` | The transport owner is not injectable at runtime | MUST NOT | The client MUST NOT accept transport, fetch, url, headers, apiKey, sessionId or any other option that routes a run around the canonical transport owner. A published seam is a published bypass, and it carries the auth, timeout and error handling with it. Tests MUST substitute the canonical owner in their own sandbox instead. |
| `PST-CLIENT-010` | Abort listeners are released on every outcome | MUST | The composed abort signal MUST release its listeners when a request ends — on success, caller abort, timeout and transport failure alike. `once: true` fires only on abort, so a request that completes normally would otherwise leave a listener attached to a caller signal that may be reused, and the leak grows exactly as fast as the feature is used. A caller abort MUST normalize to PORTFOLIO_STRESS_ABORTED and MUST NOT be reported as a backend timeout. |

### Response null safety — `PST-NULL-*` *(1.2.3)*

A portfolio that is not there has no delta. It does not have a delta of zero, and the
difference between those two statements is the difference between "no position" and "a
perfectly hedged position".

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-NULL-001` | null stays null on every authoritative result field | MUST | A frontend reader of a stress result MUST return null for any authoritative field the backend did not publish as a finite number. Number(value), value || 0, value ?? 0 and parseFloat(value) || 0 are FORBIDDEN on those fields: each turns "we do not know" into "we know it is zero". |
| `PST-NULL-002` | An empty or unknown Actual withdraws the Actual and Proposed Greeks | MUST | When the Actual portfolio is empty or does not exist, rawGreeks.actual, rawGreeks.proposed, partialRawGreeks.actual and partialRawGreeks.proposed MUST be null, rawGreekCompleteness.actual and .proposed MUST be false, rawGreekStatus.actual and .proposed MUST be UNAVAILABLE, and equityShareDelta MUST be null. Zero shares held is not the same claim as not knowing what is held. The Overlay entries MUST be left exactly as the Overlay earned them. |
| `PST-NULL-003` | Proposed Greeks are never the Overlay Greeks | MUST NOT | The frontend MUST NOT read rawGreeks.proposed from rawGreeks.overlay, from a fallback chain, or from any "nearest available vector" rule. With the Actual withdrawn the Overlay is the only non-null vector in the cell, which is exactly why the substitution is easy and exactly why it is forbidden: it presents a hypothetical structure as the resulting portfolio. |
| `PST-NULL-004` | UNAVAILABLE never becomes VALID; DEGRADED keeps its number but not its authority | MUST NOT | An UNAVAILABLE status MUST NOT be promoted to VALID and MUST NOT be rendered as 0. An unstated or unrecognised status MUST read as UNAVAILABLE, never as VALID. A DEGRADED result MUST keep its number — it is a real figure with a caveat — and MUST NOT be counted as authoritative. |
| `PST-NULL-005` | Partial sums stay partial | MUST NOT | A partial sum MUST stay under its partial* name and MUST NOT be promoted into an authoritative slot or presented as a total. An incomplete authoritative breakdown MUST stay null: a per-bucket sum over a set that lost legs is not a smaller total, it is a different number wearing the same label. |
| `PST-NULL-006` | Result status is binding on every field it governs | MUST | Every authoritative field belongs to a result set, and that set's status and completeness govern it. An UNAVAILABLE set MUST withdraw its numbers — the exposed value is null even when the payload carries a finite number — and the contradiction MUST be reported as a contract violation rather than silently swallowed. DEGRADED keeps its number and is never authoritative. A difference MUST require BOTH Actual and Proposed to be usable. |
| `PST-NULL-007` | The raw backend response is never exposed to a caller | MUST NOT | A normalized result MUST NOT carry the backend payload, a reference into it, or any key that reaches it. Only allowlisted, normalized values may leave the contract, because an escape hatch beside a normalizer is the path of least resistance and bypasses every rule the normalizer exists to apply. Mutating the backend payload after normalization MUST NOT change an existing result. |
| `PST-NULL-008` | A metric-specific status is binding, and can only take authority away | MUST | A field whose value depends on an input OUTSIDE its result set carries a metric-specific status of its own, and MUST be governed by the WORST of the two. An UNAVAILABLE metric status MUST withdraw the value and report the contradiction as a contract violation naming the metric-status field, so the report does not send a reader hunting through a healthy result set. A DEGRADED metric status keeps the number readable but MUST NOT let it be authoritative. A VALID metric status MUST NOT promote a DEGRADED or UNAVAILABLE result set: the direction is one-way. A metric status the backend did not publish reads UNAVAILABLE — silence never authorises. The metric statuses and their reasons MUST be republished in normalized form, because the raw response is never exposed and a withdrawal that cannot be explained is indistinguishable from a bug. |
| `PST-NULL-009` | pctNlvStatus describes the denominator, never the completeness of a result set | MUST | `pctNlvStatus` MUST report whether the NLV can be divided by, and nothing else: the descriptor's own status when the NLV is usable and strictly positive, and UNAVAILABLE otherwise. It MUST NOT fold in the completeness of the Proposed set or of any other result set — those questions are owned by the result-set statuses and completeness flags. A DEGRADED NLV MUST be reported as DEGRADED and never as VALID. An empty portfolio MUST NOT be reported as an unusable denominator. The same rule binds every metric status published beside a metric: one field, one question, or the consumer's worst-of-two rule is unsound because one side is quietly answering the other's question. |

### Cross-tier quantity owner — `PST-QUANTITY-*` *(1.2.4)*

The reconciliation the parity manifest was supposed to force. See
[§35](#35-cross-tier-quantity-owner) for the producer audit behind it.

| ID | Title | Level | Requirement |
| --- | --- | --- | --- |
| `PST-QUANTITY-001` | One residual vocabulary and one precedence across both tiers | MUST | Both tiers MUST read residual quantities from the SAME field list in the SAME order, and MUST fall back to the gross vocabulary only when no residual field is present. The list MUST be the union of what the tiers previously honoured: narrowing it would mean one tier silently ignoring a field the other reads. Every precedence choice that is observable — two aliases present with different values — MUST be pinned by a manifest fixture. |
| `PST-QUANTITY-002` | The first PRESENT field wins, even when its value is unreadable | MUST | PRESENT means an OWN property whose value is neither null nor undefined; an empty string IS present. A present-but-unreadable residual MUST yield UNAVAILABLE with quantitySource naming the field that failed, and MUST NOT fall through to a lower-precedence alias or to the gross quantity — falling through answers with the size the leg USED to be. A name inherited from the prototype MUST NOT be readable as a quantity. |
| `PST-QUANTITY-003` | Quantities are read strictly; parseFloat is forbidden | MUST NOT | A quantity MUST be a finite number or a well-formed non-empty numeric string. parseFloat MUST NOT be used: parseFloat("3abc") is 3, which turns a corrupted field into a plausible 3-lot position. Booleans, empty strings, objects, NaN and Infinity are never quantities. |
| `PST-QUANTITY-004` | Close markers are the set the Journal actually writes | MUST | Both tiers MUST recognise the same close-marker fields, and a close marker MUST retire a leg only when no explicit residual carries a strictly positive quantity. An empty string and an empty exitSnapshot record nothing and are not markers. A trade carrying closedAt is finished whatever its status word says. |

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

Owned by the **NEW stress-run snapshot builder** — see
[§27](#27-stressrun-snapshot-ownership). It composes existing owners and never extends the
portfolio-agnostic market-context snapshot.

Actual and Proposed must use the **same** snapshot. It must carry at least:

```
snapshotId            snapshotCreatedAt     modelVersion
activePortfolioId     portfolioRevision     positionsHash
spySnapshotPrice      spyPriceSource        spyPriceTimestamp
vixCurrent            vixSource             vixTimestamp
underlyingPrices      optionQuotes          impliedVolatilities
greeks                overlayHash           scenarioHash
marketDataAsOf
```

The run is invalidated when any of these changes: portfolio, real position, residual quantity,
SPY, VIX, scenario, overlay, strike, expiry, side, contracts, entry method, model version.

The UI must then show:

```
INPUTS CHANGED — RERUN REQUIRED
```

It must not silently recompute, and must not silently present a stale result as current.
An overlay change invalidates **the run** — it must not invalidate the **global
market-context cache** (`PST-SNAPSHOT-006`).

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
[`PST-OPEN-005`](#21-open-and-resolved-decisions).

---

## 16. Results, matrix and outputs

### Result sets

The backend produces `actualResult`, `overlayResult`, `proposedResult`, `differenceResult`,
with:

```
proposedStressPnl  = actualStressPnl + overlayStressPnl
incrementalEffect  = proposedStressPnl - actualStressPnl
```

within a documented tolerance ([`PST-OPEN-007`](#21-open-and-resolved-decisions)). Actual and Proposed use
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
version; elapsed time; cache status; reuse diagnostics; **hydration-path breakdown**
(`PST-HYDRATION-007`); **per-symbol shock diagnostics** ([§22](#22-nonspy-underlying-shock)).

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
  "modelVersion": "1.1.0",
  "requestId": "client-generated-id",
  "portfolioReference": {
    "portfolioId": "selected-portfolio-id",
    "portfolioRevision": "revision-or-hash"
  },
  "hypotheticalOverlay": { "structures": [] },
  "scenarios": [],
  "underlyingShockOverrides": {},
  "options": {
    "includePostStressGreeks": true,
    "includePositionBreakdown": true,
    "includeLegBreakdown": true,
    "includePerSymbolShockDiagnostics": true
  }
}
```

The `marketSnapshot` block that revision 1.0.0 put in the **request** is gone. The backend
freezes SPY and VIX itself, from its own owners and its own market-data snapshot
([§28](#28-canonical-spy-source-of-a-run)), and **returns** the triples in
`response.snapshot`. Sending them up would create a second SPY source for one run, which
`PST-SPY-007` forbids.

`underlyingShockOverrides` carries the per-symbol manual overrides of
[§22](#22-nonspy-underlying-shock).

### Indicative response

```json
{
  "ok": true,
  "modelVersion": "1.1.0",
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

So the backend **does** own an authoritative portfolio source keyed by `portfolioId`.

**Resolved in 1.1.0** ([`PST-OPEN-001`](#21-open-and-resolved-decisions)): the request carries
`portfolioId` + `portfolioRevision` and the backend hydrates server-side via
`buildPortfolioPositionsFromJournal`. Position data is **not** duplicated in the request body.
`buildPortfolioPositionsFromPayload` remains the audited fallback for a portfolio the journal
has nothing for, and **taking that fallback must be reported in the diagnostics** so a
silently-degraded scope is impossible.

### What the endpoint must compose

```
buildPortfolioPositionsFromJournal   isJournalTradeOpenForCurrentRisk
isJournalLegOpenForCurrentRisk       buildCanonicalOptionSymbol
readOptionLivePayloadForPortfolio    the backend underlying spot resolver
buildVixFamilySnapshot               getLatestBetas
the market-context snapshot          requireApiKey
```

It **may** compose `createRequestCoalescer` (stress-run single-flight) and
`fetchOptionChainNested` / `optionChainCache` (**discovery only**).

It **must not** rebuild Portfolio hydration, exact symbol construction, exact-symbol quote and
Greeks reads, option chain retrieval, the option chain cache, quote resolution, Greeks
resolution, SPY resolution, VIX resolution or beta resolution.

---

## 20. Monolith boundary

### The 1.0.0 formulation was self-contradictory

Revision 1.0.0 banned "a SPY resolver, option-symbol logic, a market-data resolver" from the
monolith *permanently and absolutely* — while the same document proved that the **canonical
owners of exactly those families already live in `index.html`**: `resolveFreshSpyPrice`,
`getPreferredOptionDxlinkSymbol`, `resolvePortfolioLivePrice`, `_optChainCache`, and the
Portfolio scope / active-leg / residual-quantity helpers. Read literally, the contract
outlawed the code it had just classified as `REUSE`.

Corrected: the ban targets **new stress surface and new duplicate owners**, not the audited
legacy owners.

### `PST-MONOLITH-001`

`index.html` **MUST NOT** receive:

- new Stress-Test-specific logic;
- a second implementation of an existing owner;
- new pricing formulas;
- a scenario engine;
- a matrix engine;
- overlay calculations;
- stress-run state;
- a stress renderer;
- a stress cache;
- stress data-quality rules;
- stress contract constants.

Audited legacy owners already present in `index.html` are **tolerated** and remain **out of
scope for this PR**. Their eventual extraction requires its own audit-and-extraction PR — not
the Stress Test dashboard.

### `PST-MONOLITH-002`

The only future additions permitted are: a stylesheet link; a script tag; a `STRESS TEST`
navigation entry; an empty mount point; a minimal bootstrap call site.

### What the tests enforce

`tests/portfolio-stress-architecture-contract.test.js` scans `index.html`, `js/**` and
`css/**` for **30 stress-test tokens**, each verified to have zero occurrences at the base
commit. It must intercept a new `resolveStressSpyPrice`, a new active-leg filter, inline
Stress Test formulas, inline overlay state and an inline renderer — while **not** declaring
the pre-existing canonical owners illegitimate. The token list is deliberately composed of
identifiers that cannot collide with legacy code, and matching is case-sensitive so the
prose `Black-Scholes` inside AI-prompt strings and the `vixStressFlag` classifier are not
false positives.

---

## 21. Open and resolved decisions

### Policy

| | Categories |
| --- | --- |
| **May remain open** | `CALIBRATION`, `SEMANTICS`, `PROVIDER`, `NUMERIC_TOLERANCE`, `PERFORMANCE` |
| **May NOT remain open** | `ARCHITECTURE`, `OWNERSHIP`, `UNITS`, `DATA_FLOW` |

No architectural, ownership, unit or data-flow decision may remain open at merge. Every such
decision from revision 1.0.0 has been resolved.

### Resolved in revision 1.1.0

| ID | Question | Resolution |
| --- | --- | --- |
| `PST-OPEN-001` | `portfolioId` or a transmitted position snapshot? | **`portfolioId` + `portfolioRevision`.** The backend hydrates via `buildPortfolioPositionsFromJournal`, exactly as `POST /portfolio/:portfolioId/positions/enriched` already does in production. Position data is **not** duplicated in the request body. `buildPortfolioPositionsFromPayload` stays the audited fallback, and taking it must be reported. |
| `PST-OPEN-002` | Raw Greeks or points-normalized? | **RAW.** The engine uses its own canonical units and must not consume `normalizeGreekPoints`. See `PST-UNITS-001..005`. |
| `PST-OPEN-008` | Which end freezes the SPY triple? | **The backend.** See [§28](#28-canonical-spy-source-of-a-run). *This ID is retired from the open list.* |
| `PST-OPEN-009` | Primary hydration path for an exactly-identified contract? | **Exact symbol.** See [§24](#24-exactcontract-hydration). |
| `PST-OPEN-010` | Who owns the stress-run snapshot? | **A NEW builder that composes existing owners.** See [§27](#27-stressrun-snapshot-ownership). |
| `PST-OPEN-011` | How do non-SPY underlyings get a stressed spot? | **Explicit mapping with declared precedence.** See [§22](#22-nonspy-underlying-shock). |
| `PST-OPEN-012` | How is equity/ETF stress P&L computed? | **Signed shares, no option multiplier.** See [§23](#23-equities-and-etfs). |
| `PST-OPEN-013` | How do the two tiers stay in agreement? | **A parity contract over shared fixtures.** See [§26](#26-crosstier-portfolio-parity). |

### Still open — and legitimately so

| ID | Category | Question | Must resolve before |
| --- | --- | --- | --- |
| `PST-OPEN-003` | `CALIBRATION` | The exact VIX→IV conversion for `VIX_PROXY`. VIX is in index points; IV is a decimal. No conversion and no calibration exists. | shipping `VIX_PROXY` |
| `PST-OPEN-004` | `SEMANTICS` | What `Vega LP / \|Vega SP\| > 30` means. | any PR surfacing this ratio |
| `PST-OPEN-005` | `PROVIDER` | Which provider supplies `riskFreeRate` and `dividendYield`. | shipping a model that needs them |
| `PST-OPEN-006` | `PROVIDER` | Which provider supplies NLV for the `% NLV` outputs. | shipping `% NLV` outputs |
| `PST-OPEN-007` | `NUMERIC_TOLERANCE` | The documented additivity tolerance for `PST-RESULT-002` and `PST-EQUITY-003`. | PR 2 completion |
| `PST-OPEN-014` | `PERFORMANCE` | The measured performance limits. | PR 2 completion |

**On rate and dividend yield.** Only the *choice of provider* is open. The behavioural rules
are already binding: no hidden defaults; a manual configuration carries provenance; a
declared default produces at least `DEGRADED`; and a value the selected model needs but
cannot source or configure makes the leg `UNAVAILABLE` (`PST-PRICING-007`, `PST-PRICING-008`).
The same discipline applies to NLV.

### On `PST-OPEN-004` specifically

The expression is recorded **verbatim** from the requesting specification. It is **not**
reinterpreted as `30%` by this document. The ratio could mean a pure ratio of 30, a percentage
of 30%, or a differently-scaled comparison. Choosing one silently would encode an unapproved
threshold, so the semantics remain an **open decision**.

No unapproved threshold appears anywhere in this document or in the JSON mirror.

---

## 22. Non-SPY underlying shock

Revision 1.0.0 defined the SPY shock but never said how any **other** underlying gets a
stressed spot — leaving the pricing of every non-SPY option undefined. Closed by
`PST-UNDERLYING-001..007`.

### Mapping precedence

```
MANUAL_OVERRIDE  →  DOWNSIDE_BETA  →  ORDINARY_BETA_FALLBACK  →  UNAVAILABLE
```

| Method | Status | Rule |
| --- | --- | --- |
| `MANUAL_OVERRIDE` | `VALID` | The user sets the symbol's shock directly. Wins over any beta-derived value. Must appear in the diagnostics. |
| `DOWNSIDE_BETA` | `VALID` | Only when a **measured and documented** downside beta exists. **None exists at the audited commit** — see [§6.9](#69-absence-underlying-shock--underlying-shock-mapping). |
| `ORDINARY_BETA_FALLBACK` | `DEGRADED` | Permitted, but it MUST NOT be called downside beta, its source MUST be shown, and manual override MUST stay possible. |
| `UNAVAILABLE` | `UNAVAILABLE` | No override, no downside beta, no approved ordinary beta, no configured fallback. **Never** assume the symbol moves with SPY; **never** assign beta 1. |

### Formulas

```
symbolStressReturn =
  manualSymbolReturn
  OR
  betaShockFactor × spyReturn + idiosyncraticReturnOverride

stressedSpot = currentSpot × (1 + symbolStressReturn)
```

`betaShockFactor` must declare its source. `stressedSpot` must be finite and strictly
positive, and carry a source and a status.

**`idiosyncraticReturnOverride` defaults to `0` — and that default is declared here.** That
makes it an explicit modelling choice, reported in the diagnostics whenever applied. It is
*not* a violation of `PST-DATA-002`, which forbids turning a **missing** input into a silent
default: a missing beta or a missing mapping never becomes `0` or `1`, it becomes
`UNAVAILABLE`.

### Per-symbol diagnostics

```
currentSpot   stressedSpot   symbolStressReturn   mappingMethod
betaValue     betaSource     manualOverride       idiosyncraticOverride
status        warnings
```

### Required tests

- SPY −10% with beta 1.2 → symbol −12% when no other override exists
- a manual override takes precedence over beta
- an ordinary-beta mapping produces `DEGRADED`
- a real downside beta is **not** labelled ordinary beta
- a missing beta becomes neither `0` nor `1`
- `stressedSpot` can never be `<= 0`
- Actual and Proposed use the **same** stressed spot for the same symbol
- position ordering changes nothing

---

## 23. Equities and ETFs

Revision 1.0.0 listed `equityEtfPnl` among the required outputs without ever defining it.
Closed by `PST-EQUITY-001..003`.

```
signedShares > 0   for LONG
signedShares < 0   for SHORT

equityStressPnl = (stressedSpot - currentSpot) × signedShares
```

The **option contract multiplier MUST NOT** be applied to shares. This is not hypothetical
pedantry: no `contractMultiplier` field exists on any leg today (see [§8](#8-canonical-units)),
and the only place the `100×` factor appears is a literal derived from leg type inside the
unrealized-P&L helper — so a careless implementation would inherit it.

**Reconciliation (`PST-EQUITY-003`).** `sum(optionLegStressPnl) + sum(equityStressPnl)` must
reconcile exactly to the Portfolio Stress P&L, within the documented tolerance
([`PST-OPEN-007`](#21-open-and-resolved-decisions)).

**Required tests:** 100 shares long; 100 shares short; zero shock → zero P&L; a negative
quantity treated as short rather than an error; shares + protective put reconciling; and no
multiplier of 100 applied to shares.

---

## 24. Exact-contract hydration

### The 1.0.0 path was wrong

Revision 1.0.0 required **every** exact contract to pass through the nested option chain, the
chain cache and DXLink. The audited production code does the opposite, and it is right to:

> `POST /portfolio/:portfolioId/positions/enriched` and `POST /portfolio/live-refresh`
> contain **zero** references to `optionChainCache`, `fetchOptionChainNested` or the nested
> chain. They build the canonical symbol, deduplicate into `uniqueOptionSymbols`, and read
> `dxLinkManager.getLiveGreeks(sym)` / `getLiveOptionQuote(sym)` **by exact symbol**.

Forcing a chain fetch would have made the stress path strictly slower and strictly more
fragile than the Portfolio path it is supposed to match.

### Primary path (`PST-HYDRATION-001`)

When `underlying`, `expiration`, `strike` and `PUT/CALL` are already known:

1. build the exact canonical symbol via `buildCanonicalOptionSymbol`;
2. deduplicate by canonical symbol;
3. read `optionQuoteCache` and `greeksCache` **directly**;
4. apply the same freshness and missing-reason rules the enriched path already uses;
5. optionally request or warm **that single exact symbol** through the existing DXLink
   orchestration;
6. return quote, Greeks, provenance and timestamps.

The nested chain is **not** on this path.

### Discovery path (`PST-HYDRATION-002`)

The nested chain is used **only** to: populate expiration and strike selectors; browse the
chain; confirm contract availability when needed; act as a diagnostic fallback when the exact
canonical symbol cannot be validated; and retrieve metadata unobtainable from the exact-symbol
path.

It **must not** be required per scenario, per cell, per already-identified leg, or per run
when the chain is already cached, and two legs on the same underlying must not fetch twice.

### Budget

| Rule | Contract |
| --- | --- |
| ≤ 1 exact-symbol hydration per contract per run | `PST-HYDRATION-004` |
| ≤ 1 nested-chain fetch per underlying per run, and only when genuinely needed | `PST-HYDRATION-005` |
| No chain fetch required when the exact symbol already resolves — and a failing chain must **not** make a cached exact symbol `UNAVAILABLE` | `PST-HYDRATION-006` |
| Every leg reports its resolution path: `exact_symbol_cache` \| `exact_symbol_warmed` \| `chain_confirmed` \| `unresolved` | `PST-HYDRATION-007` |
| Never substituted with a nearest strike or expiry | `PST-OPTION-SYMBOL-005` |

---

## 25. Factual source assertions

Contract tests that only check a document against itself will happily certify a confident
falsehood — which is exactly what happened in revision 1.0.0. Every load-bearing claim about
the audited backend is therefore recorded as a **fact with verbatim evidence**, and
`tests/portfolio-stress-source-facts.test.js` checks:

1. the specification's prose agrees with the recorded fact (always);
2. the recorded evidence is present **verbatim** in the audited file, and that file's `sha256`
   matches the audited hash (whenever an `apex-backend` checkout is reachable via
   `APEX_BACKEND_PATH`, `/workspace/apex-backend` or `../apex-backend` — otherwise it prints
   an explicit skip rather than passing silently).

No runtime implementation is copied into the tests; only claims and short quotations.

| Fact | Claim |
| --- | --- |
| `FACT-CHAIN-NO-TTFETCH` | `fetchOptionChainNested` does **not** call the global `ttFetch` — 0 code call sites, 0 imports |
| `FACT-CHAIN-INJECTED-AUTH` | it receives `getAccessToken` as an **injected** dependency |
| `FACT-CHAIN-ROUTE-LOCAL-BUDGET` | it owns a route-local timeout (16 000 ms) and total deadline (18 500 ms) |
| `FACT-CHAIN-LOCAL-ERROR-CLASSIFICATION` | it classifies errors route-locally via `OptionChainError` |
| `FACT-CACHE-OWN-PENDING-MAP` | `OptionChainCache` owns `this.pending` and `coalesce()` |
| `FACT-CACHE-NOT-COALESCER` | it does **not** use `createRequestCoalescer` — 0 references |
| `FACT-CACHE-NO-TIMER` | SWR uses a background **promise**; 0 `setTimeout`, 0 `setInterval` |
| `FACT-COALESCER-REAL-CONSUMERS` | `createRequestCoalescer`'s real consumers are `marketMetricsCache` and `candlesResponseCache` |
| `FACT-ENRICHED-BUILDS-CANONICAL-SYMBOL` | the enriched path builds the canonical symbol |
| `FACT-ENRICHED-EXACT-SYMBOL-KEY` | it keys its `options` map by the exact canonical symbol |
| `FACT-ENRICHED-EXACT-SYMBOL-DXLINK-READ` | it reads quotes and Greeks by exact symbol with **0** option-chain references |
| `FACT-ENRICHED-EXPOSES-QUALITY` | it exposes quote, Greeks, staleness and a missing reason |
| `FACT-GREEKS-RAW-UNITS` | backend Greeks are raw dxFeed values; `volatility` is fractional IV |
| `FACT-BACKEND-OPEN-TRADE-FILTER` | the backend owns `isJournalTradeOpenForCurrentRisk` |
| `FACT-BACKEND-OPEN-LEG-FILTER` | the backend owns `isJournalLegOpenForCurrentRisk` |
| `FACT-BACKEND-PORTFOLIO-HYDRATION` | the backend can hydrate from `portfolioId` alone |
| `FACT-BACKEND-UNDERLYING-SPOT-OWNER` | the backend owns an underlying spot resolver with source and freshness |
| `FACT-MARKET-CONTEXT-PORTFOLIO-AGNOSTIC` | `lib/market-context.js` has **0** portfolio/overlay/scenario references |
| `FACT-NO-STRESS-RUN-SNAPSHOT-OWNER` | **0** occurrences of any run-identity field |
| `FACT-NO-PRICING-ENGINE` | `approxDelta` is dead code with **0** call sites |
| `FACT-NO-DOWNSIDE-BETA` | **0** occurrences of downside beta in either repository |
| `FACT-LIVE-REFRESH-BOUNDED-FALLBACK` | the underlying fallback is deferred, batched and bounded (2 / 450 ms / 1200 ms) |
| `FACT-LIVE-REFRESH-FALLBACK-DIAGNOSTICS` | it publishes `underlyingLastCloseFallbackDiagnostics` |
| `FACT-LIVE-REFRESH-BOUNDED-IVR` | the IVR phase is bounded and publishes `ivrDiagnostics` |
| `FACT-MARKET-METRICS-COALESCED` | market-metrics reads go through `getMarketMetricsItemCached` over `marketMetricsCache` |
| `FACT-RAW-CHAIN-BYPASS-EXISTS` | three raw `ttFetch` chain call sites bypass the module **and** the cache |
| `FACT-PORTFOLIO-ROUTES-ZERO-CHAIN` | both Portfolio routes have **0** chain access, measured over exact boundaries |

### Facts added in revision 1.2.3 — the Stress Engine itself

None of these could be recorded before `7027f0c`, because none of the code existed at the
previously audited commit. That is precisely why the audit subject moved, and the negative
controls in `tests/portfolio-stress-source-facts.test.js` prove it by showing every one of
them **fails** against `25dd8424`.

| Fact | Claim |
| --- | --- |
| `FACT-STRESS-ENDPOINT-EXISTS` | `POST /portfolio/stress-test/run` exists and `requireApiKey` runs **before** the body parser |
| `FACT-STRESS-NO-POSITIONS-FALLBACK` | a client-supplied `positions` array is **rejected**, not ignored |
| `FACT-STRESS-REVISION-REQUIRED` | `portfolioRevision` is required **and** verified against the portfolio the backend loads |
| `FACT-STRESS-SINGLE-FLIGHT-TTL-ZERO` | the coalescer is single-flight only — result-cache TTL is literally `0` |
| `FACT-PARITY-SEMANTICS-VERSION` | backend scope semantics are `2.1.0` — the taxonomy **and** the quantity owner reconciled |
| `FACT-PARITY-MANIFEST-VERSION` | the manifest is `2.1.0`, its identity hash covers the fixtures only, and its expected blocks are **generated** |
| `FACT-PARITY-CLAIM-ATOMIC` | a partial scope-parity claim is a structured error — all three identifiers or none |
| `FACT-PARITY-IDENTITY-READ-FROM-MANIFEST` | the backend reads the three identifiers **from the manifest**, never from hand-copied literals |
| `FACT-STRESS-EMPTY-ACTUAL-GREEK-WITHDRAWAL` | an empty Actual withdraws the Actual **and Proposed** Greeks instead of publishing a zero vector |
| `FACT-STRESS-CRR-PROBABILITY-REFUSAL` | the lattice **refuses** a risk-neutral probability outside `[0,1]` rather than clamping it |
| `FACT-STRESS-RAW-GREEKS-NO-MULTIPLIER` | the contract multiplier is **not** applied to the published raw Greeks |
| `FACT-STRESS-NO-CHAIN-ON-STRESS-PATH` | the Stress route and the engine have **0** option-chain references |

Each fact also declares what the specification **may not say**: the option-chain retrieval row
may not list `ttFetch` as a dependency, the option-chain cache row may not list
`createRequestCoalescer`, the phrase "background revalidation timer" is banned, and the
market-context owner may not carry `overlayHash`, `positionsHash`, `scenarioHash`,
`snapshotId` or `portfolioRevision`. The test fails if the document drifts back.

---

## 26. Cross-tier Portfolio parity

### The problem

PR 2 is **backend** work. The backend cannot call `getOpenPortfolioRiskPositions`,
`isActivePortfolioLeg` or `_portfolioLegEffectiveQty` — they are top-level declarations inside
`index.html`. Revision 1.0.0 named them as the owners anyway, which would have left PR 2 with
only two options, both forbidden: transcribe them (`PST-REUSE-003`) or invent a second rule
set (`PST-ACTUAL-006`).

### The resolution

| Tier | Owns | Owners |
| --- | --- | --- |
| **Frontend presentation** | Portfolio UI, current Portfolio calculations, visible scope, visible active-leg state | `getOpenPortfolioRiskPositions`, `_portfolioTradeIsOpenForRisk`, `isActivePortfolioLeg`, `getActivePortfolioLegs`, `_portfolioLegEffectiveQty` |
| **Backend execution** | Stress Engine hydration and scope | `buildPortfolioPositionsFromJournal`, `isJournalTradeOpenForCurrentRisk`, `isJournalLegOpenForCurrentRisk`, `buildPortfolioPositionsFromPayload` |

`PST-REUSE-002` is restated as **one canonical owner per responsibility per execution tier,
plus an explicit parity contract across tiers**.

### The divergences that already exist

These are real, present today, and undetected by any test:

| Case | Frontend | Backend |
| --- | --- | --- |
| status `deleted` | not recognised | **closed** |
| `ROLLED`, `ASSIGNED`, `EXERCISED`, `CASH_SETTLED`, `TERMINAL` | **terminal** | not recognised |
| leg with `exitPrice` **and** a residual open quantity (partial close) | **ACTIVE** | **CLOSED** |
| leg with no quantity field | inactive (`null`, no residual) | **quantity defaults to 1** |

The last two matter most: a partially-closed leg would contribute risk on one tier and none
on the other, and a quantity-less leg would silently contribute one contract of risk on the
backend — precisely what `PST-DATA-002` forbids on a stress input.

### The contract

| ID | Requirement |
| --- | --- |
| `PST-PARITY-001` | Both tiers agree on the same fixture about trade open/closed, leg active/terminal, rolled, assigned, exercised, expired, partial close, residual quantity zero vs non-zero |
| `PST-PARITY-002` | Semantic parity, **not** word-for-word duplication |
| `PST-PARITY-003` | A divergence makes the run `UNAVAILABLE` with diagnostics — never tolerated silently |
| `PST-PARITY-004` | Fixtures are shared or generated from one manifest, so the tiers cannot drift behind independent expected values |
| `PST-PARITY-005` | A status-taxonomy change updates both owners and the parity tests in the same change |

---

## 27. Stress-run snapshot ownership

### Why the 1.0.0 plan was wrong

Revision 1.0.0 classified `market snapshot` as **EXTEND**, planning to add `snapshotId`,
`positionsHash`, `overlayHash` and `scenarioHash` to `GET /market-context/snapshot`. That
would have:

- injected Portfolio, Overlay and Stress-run semantics into a **deliberately
  portfolio-agnostic** market-data owner (`lib/market-context.js` has zero references to
  portfolio, overlay or scenario);
- made a **shared, globally cacheable** market resource invalidate whenever one user edits
  one overlay.

### The correct composition

| | |
| --- | --- |
| `market snapshot` | **REUSE** — consumed unchanged, for exactly what it owns |
| `stress-run snapshot builder` | **NEW** — absence-proved in [§6.8](#68-absence-stress-run-snapshot--stressrun-snapshot-builder) |

The builder **composes**:

```
actual portfolio snapshot   (backend portfolio execution scope)
market-data snapshot        (market-context snapshot, REUSE, unmodified)
SPY triple                  (backend underlying spot resolution)
VIX triple                  (buildVixFamilySnapshot)
underlying spots            (backend underlying spot resolution)
option quotes / IV / Greeks (exact-contract hydration)
overlay definition
scenario set
model version
```

and produces:

```
snapshotId          snapshotCreatedAt   portfolioRevision
positionsHash       overlayHash         scenarioHash
marketDataAsOf
```

`PST-SNAPSHOT-005` forbids adding run identity to the market context.
`PST-SNAPSHOT-006` requires the builder to compose without duplicating sources, and requires
that an overlay change invalidate **the run** without invalidating the **global market-context
cache**.

---

## 28. Canonical SPY source of a run

### The contradiction

Revision 1.0.0 held three positions that cannot all be true: the matrix is backend-computed;
the frontend SPY resolver is the mandatory source; and who freezes the price is an open
question. The backend cannot call a frontend function, so `PST-SPY-001` as written was
unimplementable.

### The decision: the backend freezes it

Pricing and the matrix are backend-owned, so the run's SPY price is frozen by the **backend
Stress Engine**, using the existing backend underlying spot owner
(`server.js:11208-11300`) and the same market-data snapshot as the rest of the run. That owner
already produces everything `PST-SPY-003` needs:

```
price, mark, bid, ask, last,
source              ∈ DXLINK | CACHED_DXLINK | LAST_CLOSE | UNKNOWN
quoteFreshness      ∈ live | usable_recent_stale | last_close | missing
updatedAt, isStale, quoteAgeMs, quoteUsableForPortfolioValuation,
fallbackLastClose, errors
```

An unresolved symbol yields `UNDERLYING_PRICE_MISSING` — never a zero price.

The response reports:

```
spySnapshotPrice
spyPriceSource
spyPriceTimestamp
```

### What the frontend does

- **displays** the returned triple;
- **may** compare it with the price Portfolio already shows, and surface a mismatch;
- **must not** run a second resolver for the same run;
- **must not** substitute its own value after the run has started.

The frontend resolver stays `REUSE` for the current Portfolio and for optional preflight or
display. It is not simultaneously a second authoritative source for the same run.

```
one run = exactly one frozen SPY source
```

Because the owner is route-local and unexported, sharing it is an **extraction of the existing
owner** (`EXTEND`), never a reimplementation — `PST-SPY-002` still forbids a second resolver
in either tier. `PST-OPEN-008` is retired.

---

## 29. Temporal coherence of a run

A twenty-cell matrix computed while the market moves underneath it is not a stress test — it
is twenty slightly different stress tests averaged by accident. `PST-TEMPORAL-*` closes that.

### Freeze, then compute

```
read every market input  ─┐
copy into the snapshot    ├─  BEFORE the first scenario calculation   (PST-TEMPORAL-001)
seal the snapshot        ─┘
                              ↓
        20 cells, all reading the SAME frozen values                  (PST-TEMPORAL-002)
```

During cell computation the engines MUST NOT reread the quote cache, the Greeks cache, SPY,
VIX, underlying prices or Portfolio state.

### What the snapshot must report

```
assembly :  snapshotStartedAt   snapshotCompletedAt   snapshotAssemblyMs
skew     :  oldestInputAsOf     newestInputAsOf
            maxCrossInputSkewMs maxInputAgeMs
per input:  source  asOf  ageMs  freshness  status
            for: SPY · VIX · underlying · option quote · IV · Greeks · beta · NLV
```

`maxCrossInputSkewMs` is the one that matters most in practice: it is entirely possible for
every individual input to look fresh while the *oldest* and *newest* are minutes apart, and
that spread is invisible unless it is computed.

### This is mostly propagation, not new measurement

The reused owners already produce nearly all of it:

| Owner | Already publishes |
| --- | --- |
| backend underlying resolver | `source`, `updatedAt`, `isStale`, `quoteAgeMs`, `quoteFreshness` per symbol |
| `readOptionLivePayloadForPortfolio` | `greeksStale`, `quoteStale`, `greeksUnavailableReason` per option |
| `buildVixFamilySnapshot` | `updatedAt`, `partial` |
| beta store | `asOfDate`, `computeBetaAgeDays` |
| bounded fallback phase | `underlyingLastCloseFallbackDiagnostics` with per-symbol resolution status |

`PST-TEMPORAL-004` is therefore largely a **propagation** requirement — carry what the owners
already know into the snapshot — rather than a demand for new instrumentation.

### Thresholds

Thresholds derive from the declared freshness policy and the PR 2 benchmarks; **none may be
hidden**, and an input beyond threshold produces `DEGRADED` or `UNAVAILABLE` by a declared
rule (`PST-TEMPORAL-006`).

### The overlay lifecycle — corrected in 1.2.1

Revision 1.2.0 said *"Adding or editing the Overlay MUST NOT cause a new market read."* That
is wrong, and it contradicted `PST-HYDRATION-001`. Adding a put, a call, a short call, a
vertical, a collar — or changing an underlying, expiration, strike or PUT/CALL, or swapping a
leg — introduces **exact canonical symbols nobody has ever read**. The next run *must* hydrate
their quotes, IV and Greeks. A contract forbidding that forbids a correct implementation.

The prohibition is about **when**, not **whether**:

```
overlay edit
   → invalidate previous run          (previous snapshot left UNMUTATED)
   → show INPUTS CHANGED — RERUN REQUIRED
   → hydrate required exact symbols   ← market reads ALLOWED here, bounded and deduplicated
   → build new frozen snapshot        ← snapshotCompletedAt: the boundary
   → calculate all result sets        ← market reads FORBIDDEN from here on
```

| Phase | Market reads | Governed by |
| --- | --- | --- |
| Snapshot assembly | **`ALLOWED_AND_BOUNDED`** | `PST-TEMPORAL-008`, `PST-HYDRATION-001`, `PST-HYDRATION-004` |
| After `snapshotCompletedAt` | **`FORBIDDEN`** | `PST-TEMPORAL-002`, `PST-TEMPORAL-007` |

**Allowed during snapshot assembly**

- reading the canonical caches
- hydrating a newly referenced exact canonical symbol
- bounded DXLink warmup of that exact symbol
- reading SPY, VIX, underlying spots, beta and NLV
- collecting timestamps · computing freshness · computing cross-input skew

**Forbidden after snapshot completion**

- rereading SPY during the matrix
- rereading quotes per scenario
- rereading Greeks for Proposed
- hydrating Overlay separately from Actual
- updating a single cell with newer data
- replacing snapshot data during pricing

Actual and Overlay **freeze together** in the new snapshot; Actual, Overlay, Proposed,
Difference and the whole matrix compute only after it is complete. Each exact symbol is
hydrated **at most once per run**, deduplicated by canonical symbol (`PST-HYDRATION-004`), and
a failing chain never invalidates an exact symbol the caches already hold
(`PST-HYDRATION-006`).

This is what makes `proposedStressPnl = actualStressPnl + overlayStressPnl`
(`PST-RESULT-002`) meaningful rather than coincidental: Actual and Proposed are not two
readings of a moving market, they are two arithmetic views of **one** frozen one.

### Consistency with the hydration and snapshot contracts

`PST-TEMPORAL-007` and `PST-TEMPORAL-008` are declared consistent with, and are checked
against, `PST-HYDRATION-001`, `PST-HYDRATION-004`, `PST-HYDRATION-006`, `PST-SNAPSHOT-003`,
`PST-SNAPSHOT-004`, `PST-SNAPSHOT-006`, `PST-TEMPORAL-001` and `PST-TEMPORAL-002`. The
architecture test fails if any of those disappears or if the consistency declaration drops one.

---

## 30. Hash identity and zero-runtime-change proof

### Method

Byte identity was proven at PR time by comparing `sha256` of every runtime file against the
base commit `0a16ea5a92914f46d726c635e9d88ca3e08b1d13`.

```
$ sha256sum index.html
e076c05c9af062dddc5ca73ba9d96b8b7ee7807871abc084596543a0b4dbea20  index.html

$ git ls-files 'js/**' | sort | xargs sha256sum
```

### `index.html`

```
sha256(index.html base) === sha256(index.html HEAD)
  = e076c05c9af062dddc5ca73ba9d96b8b7ee7807871abc084596543a0b4dbea20
```

> The recorded hash has now changed twice, both times because the **base** moved:
> `4f4ea23b…` at base `c226f5f`, then `c67c073e…` after PR #357 was merged, then
> `e076c05c…` after PR #359 was merged. Each time an upstream PR really did modify
> `index.html`. None of it is a modification by this PR: the specification's own commits
> touch zero runtime files, which is what the change-set identity check below verifies
> independently of whatever the base happens to be.
>
> The old hash is deliberately **not** carried forward. Copying it would have produced a
> record that still matched its own recorded base while no longer matching the branch —
> exactly the stale-record failure mode that revision 1.2.2 closes.

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

### Netlify deploy preview

The Netlify deploy preview on `713eea0` reported **SUCCESS**. Revision 1.1.0 described the
preview as unverifiable; that was wrong — the check exists and passed.

What it does **not** exercise: because `index.html`, `js/**` and `css/**` are byte-identical
to the base, the preview builds and serves exactly what `dev-clean` serves. It therefore
proves the specification does not break the app, and proves nothing at all about a Stress
Test dashboard — there is no runtime Stress Test surface for it to exercise. (The preview
host does select `DEV_BACKEND`, per `js/config/backend-config.js:24-30` — which is precisely
the service whose deployed commit could not be determined; see
[§1](#1-base-provenance-and-recovery-point).)

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

## 31. Plan of subsequent PRs

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

## 33. Implementation status per tier

`runtimeImplemented` answers exactly one question — *can a user reach the Portfolio Stress
Test from the application?* As of revision 1.3.0 the renderer and the tab exist and are wired
into `showView`, the canonical view owner, so the answer is **yes** and the field is `true`.

It is deliberately a narrow claim. It does **not** say every modelled feature is built, and it
does **not** say anything about what is deployed — that is `productionDeployment`'s question.
Everything else lives in `implementationStatus`, because a single boolean cannot express a
product that exists in one tier, exists in draft in another and does not exist in a third, and
overloading it is how a half-built feature starts reading as done.

| Tier | Status | Where |
| --- | --- | --- |
| Backend engine | `IMPLEMENTED_IN_DRAFT_PR_220` | `apex-backend` PR #220 (**draft**), commit `7027f0c` |
| Frontend parity / client contract | `IMPLEMENTED_IN_THIS_DRAFT_PR` | `apex-trading` `claude/portfolio-stress-backend-parity-v1` |
| Frontend renderer / UI | `IMPLEMENTED_IN_THIS_DRAFT_PR` | `apex-trading` `claude/portfolio-stress-ui-v1-stsyh3` |
| Production deployment | `NOT_YET_UPDATED` | deployed backend is still `25dd8424` |

Backend PR #220 must stay **draft**, must not be marked ready, and must not be merged from
this PR. This PR does not modify the backend.

### Proposed merge order — to be proposed, not executed

1. companion `apex-trading` green and audited;
2. backend #220 marked ready and merged into `dev-4h-backend`;
3. backend dev deploy;
4. verify `GET /version` returns the new merge commit;
5. small evidence update in the companion if needed;
6. merge the companion;
7. the future UI / Stress Test tab PR.

---

## 34. Frontend companion runtime footprint

This is the first revision whose PR ships runtime code, so the runtime footprint is
**declared** rather than merely bounded by a prohibition.

| Path | Kind |
| --- | --- |
| `contracts/portfolio-scope-parity-manifest.json` | added — byte-identical copy of the backend manifest |
| `js/services/portfolio-stress-parity.js` | added — the single frontend parity identity owner |
| `js/services/portfolio-stress-response.js` | added — the null-safe response contract |
| `js/services/portfolio-stress-client.js` | added — request/dispatch adapter, no UI |
| `index.html` | modified — **three `<script src>` lines only**, nothing removed |
| `js/api/backend-client.js` | modified — `ttCall` gained an optional `opts.signal` |

### Why `js/api/backend-client.js` was touched at all

The client contract requires `AbortSignal` support, and `ttCall` is the canonical owner of
backend URL, authentication, request JSON, timeout and error classification. Bringing a
second `fetch` in order to get cancellation would have created a **second HTTP owner** with
its own URL, auth and error handling — the duplication `PST-REUSE-006` exists to prevent.
Extending the one owner is the smaller change.

Existing callers are unaffected: with no caller signal, `_ttCallSignal` returns exactly
`AbortSignal.timeout(20000)`, the expression the line contained before. The architecture
contract proves it **structurally** rather than by inspection — removing the helper and
restoring the original fetch signal must reproduce the base file byte for byte.

### How the boundary is still enforced

`monolithBoundary.forbiddenTokensInRuntimeFiles` is by construction unsatisfiable for the
modules that *own* the stress vocabulary. The token scan therefore exempts **exactly** the
three declared files, plus the three declared `<script src>` lines in `index.html` —
everything else in `index.html` is scanned unchanged. The exemption is paid for by checks a
substring ban never provided: each companion module must be inert at load (declarations
only) and must contain **no** DOM access, timer, listener, direct `fetch`, storage access,
order path, overlay store, renderer or result cache.

And the change-set rule is narrowed rather than dropped: a commit touching the specification
may touch runtime files **only** from the declared footprint. A commit that also touched the
scanner, SWING, candles, charts, DSS, RS, MCX or the Journal still fails.

---

## 35. Cross-tier quantity owner

### The audit that came first

*Which residual/partial-close fields does any producer actually write?*

> **None of them.** Not one of the eighteen alias names carried by the two tiers
> has a producer. Each occurs exactly once in the codebase: inside the array
> literal that declares it.

Real producers, in full:

| Concern | Fields actually written |
| --- | --- |
| quantity | `qty` (the Journal, everywhere), `quantity`, `contracts` |
| residual | **none** |
| close markers | `exitPrice`, `closePrice`, `closeDate`, `exitSnapshot` |

So the vocabulary below is a **declaration**. Recording it as a discovery would
have been the dishonest way to present it.

### The canonical vocabulary

Residual, in precedence order — grouped by concept so that `openQuantity` and
`qtyOpen` sit adjacent as the same claim:

```
effectiveQty
openQty  openQuantity  qtyOpen  quantityOpen
remainingQty  remainingQuantity  qtyRemaining
residualQty  residualQuantity
currentQty  currentQuantity
```

Gross, reached only when **no** residual field is present: `qty`, `quantity`,
`contracts`.

Close markers: `exitPrice`, `closePrice`, `closeDate`, `closedAt`, `closedDate`,
`exitDate`, `exitSnapshot`.

### The rules

| Rule | |
| --- | --- |
| **precedence** | The FIRST residual field PRESENT wins outright. Only when no residual field is present does the gross vocabulary answer, in its own order. |
| **presence** | PRESENT means an OWN property whose value is neither null nor undefined. An empty string is present (and invalid). A name inherited from the prototype is never present. |
| **invalid value** | A present field whose value is not a finite number or a well-formed numeric string yields quantity null, status UNAVAILABLE, reason QUANTITY_INVALID, and quantitySource naming the field that failed. It NEVER falls through. |
| **gross fallback** | Only reached when no residual field is present at all. |
| **side / sign** | The sign is applied exactly once. A negative stored quantity means SHORT; a declared SHORT means SHORT; a negative quantity beside a declared LONG is SHORT — the stored sign wins. With no usable quantity there is no position, so positionSide is null. |
| **close marker** | A close marker retires the leg ONLY when no explicit residual carries a strictly positive quantity. An empty string, and an empty exitSnapshot, record nothing. |

### Why `effectiveQty` first

It is the only name that claims to **be** the effective size rather than to
describe a remainder. The rest are grouped by concept, and the choice is only
observable when two aliases disagree — which is exactly what the
`precedence_*` fixtures pin.

---

## 36. Frontend UI runtime footprint

Revision 1.3.0 ships the UI tier. Its footprint is **declared file by file**, beside — not
merged into — the companion tier's footprint in [§34](#34-frontend-companion-runtime-footprint).
The two declarations are enforced side by side and the real diff must be exactly their union.

| Path | Kind |
| --- | --- |
| `css/portfolio-stress.css` | added — the panel's presentation, the anticipated stylesheet link |
| `js/services/portfolio-stress-ui-state.js` | added — pure scenario grid, ephemeral overlay, run lifecycle, null-safe formatters |
| `js/ui/portfolio-stress-panel.js` | added — the renderer and the single-run controller |
| `index.html` | modified — five declared line patterns, plus `showView` |

### Why the state is separate from the renderer

The rules most likely to be broken quietly by a later edit are the lifecycle ones: *a stale
response can never overwrite a newer one*, *an overlay edit invalidates the displayed result*,
*a revision change invalidates it too*. They are also the hardest to test through a DOM.
Keeping them in a module with no DOM dependency means the contract suite exercises the **real**
rules rather than a re-implementation written to be testable.

### The request lifecycle

`IDLE → LOADING → SUCCESS | DEGRADED | ERROR | ABORTED`, with `DIRTY` reachable from any
settled state. One run at a time: starting a run aborts any run in flight **and** opens a new
monotonic run id, so a superseded response is disqualified twice over — its signal is aborted
and its id no longer matches. There is no automatic retry, no automatic rerun, no polling, no
timer and no request at load time.

### Staleness

A fingerprint of every request input is captured before dispatch and stored with the result.
Staleness is a **comparison**, not a flag somebody has to remember to set: the displayed
result is stale as soon as the active portfolio, the `portfolioRevision`, the scenario grid,
the overlay or the `pricingConfiguration` differs from what produced it. The stale result stays
visible and clearly labelled, because a previous run is useful evidence — what is forbidden is
presenting it as current, or "refreshing" it with frontend arithmetic.

### `null` never becomes `0`

The response contract already withdrew every figure its own producer disowned. The renderer's
job is to carry that decision to the screen without reviving it, so an absent figure renders as
`—` and never as zero, `DEGRADED` and `UNAVAILABLE` carry a **glyph** as well as a colour, and
the Overlay column is never promoted into the Proposed one.

### What this PR does not deliver

Option-chain-driven strike and expiry pickers; entry-price method selection
(`MARK`/`MID`/`BID`/`ASK`/`MANUAL`) in the builder; per-position and per-leg breakdown
rendering; the underlying-shock overrides UI; the `DIRECT_IV_SHOCK` relative-vs-points mode
selector. Overlay persistence and order entry are not "unbuilt" — they are **forbidden** by
`PST-OVERLAY-003`.

### Two decisions worth a reviewer's attention

**`vixCurrent` is not sent.** `PST-SCENARIO-002` lists it among a scenario's fields, but the
backend freezes the VIX a run is priced against, and a frontend-supplied current level would
make the frontend a second source for it — the thing `PST-SPY-007` forbids for SPY, for the
same reason. The UI sends the relative `vixChangePct` instead. If the deployed request
validator requires `vixCurrent`, this is the decision to revisit.

**`portfolioRevision` is read, never derived.** It comes from the backend portfolio record
(`portfolioRevision`, `revision`, `updatedAt`, `updated_at`, in that order), and when the
record publishes none the run is **blocked** with that reason stated. A frontend-derived
revision would match the backend's staleness check by construction and silently disable the
one guard that detects a portfolio moving underneath a run.

---

## 32. Document ownership (AGENTS.md decision)

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
