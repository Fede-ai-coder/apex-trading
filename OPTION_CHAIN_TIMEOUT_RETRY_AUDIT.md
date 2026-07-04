# Option Chain — Timeout / Retry Storm / Partial Ticker Mismatch — AUDIT

**Scope:** Journal → Log Trade option-chain loader (and the sibling Portfolio "Add Position" loader).
**Status:** AUDIT ONLY. No code changed. No PR opened. Fix proposals below are for review before implementation.
**Repos inspected:** `apex-trading` (frontend, `index.html`) read/write-none; `apex-backend` (`server.js`, `lib/`) read-only.
**Preview referenced:** deploy-preview-292 · Backend: apex-tastytrade-backend-dev-production.

> This audit is explicitly **NOT** the Portfolio SQZ / Earnings / SPY-EQ PR #292 issue. Portfolio refresh, SQZ,
> Earnings, β/SPY-EQ, scanner formulas, journal persistence/DB, Yahoo, and the global `ttFetch` were **not touched**
> and are **not** part of any proposed fix (see §7D).

---

## TL;DR — Root-cause classification (§7A)

The symptoms are **frontend-only**. The backend timeout contract is *opaque* but *not the cause* of the mismatch/storm.

| # | Symptom | Root cause | Layer |
|---|---------|-----------|-------|
| 1 | `stale ignored ticker=FTNT current=FTN` drops a valid response | Stale check compares the **live, mutable DOM input value** (`_currentChainTicker()`) at promise-resolution time instead of the **committed** `_chainLatestTicker[formPrefix]`. Any transient divergence (mid-edit correction, form re-seed, AP per-keystroke request) discards a valid confirmed-ticker chain. | Frontend |
| 2 | requestId 7…12 all attach to one pending request | `force`/manual-retry bypasses only the **cache**, not the **in-flight dedup**. Each `_fetchAndRenderChain` call still increments `requestId` and attaches its **own** `.then()` to the shared promise. | Frontend |
| 3 | Duplicated timeout/error logs after retry | N deduped callers ⇒ N `.then()` handlers ⇒ N `[OPTION CHAIN] error … requestId=N` logs + N redundant re-renders for **one** network call. | Frontend |
| 4 | Retry can be spammed | RETRY button has **no disabled/pending state**; `force=true` runs immediately with no debounce; the ticker `onblur` fires an extra non-forced trigger when the button is clicked. | Frontend |
| 5 | Unclear timeout separation | Backend route returns generic `{ error: e.message }` (HTTP 500); frontend **synthesizes** the `timeout` label by string-matching. No structured `error`/`retryable`/`durationMs`. | Backend contract |

**Verdict:** Ship a **frontend-only** fix (§7C-A). The backend contract is acceptable-but-opaque; a **route-specific** structured-error upgrade (§7C-B) is *optional* and independent — **do not** reintroduce PR #196's global `ttFetch` change.

---

## §1 — Exact endpoint & timeout path

| Property | Value | Evidence |
|----------|-------|----------|
| **Endpoint** | `GET /option-chains/{TICKER}/nested` | `index.html:26258` `ttCall('/option-chains/' + encodeURIComponent(t) + '/nested')` |
| **Caller chain** | `_fetchAndRenderChain(formPrefix, force)` → `_fetchOptionChain(ticker, force)` → `ttCall(...)` | `index.html:26325`, `26242`, `2199` |
| **Frontend timeout** | `AbortSignal.timeout(20000)` = **20 s**, applied to *every* `ttCall` fetch | `index.html:2212` |
| **Backend timeout** | `AbortSignal.timeout(15000)` = **15 s**, inside shared `ttFetch` | `server.js:592` |
| **Which fires first** | **Backend (15 s)** aborts before the frontend (20 s). Frontend only self-aborts if the backend never responds within 20 s (proxy/network stall). | 15 s < 20 s |
| **Error shape (backend)** | Generic `res.status(e.status || 500).json({ error: e.message })`. An abort has no `.status` ⇒ **HTTP 500** `{ error: "The operation was aborted due to timeout" }` | `server.js:5409-5412`, `ttFetch` throws bare `Error` (no `.status`) at `server.js:599/604/609` |
| **Timeout label origin** | **Frontend synthesizes it.** `_fetchOptionChain` catch normalizes any message matching `/tim(e|ed)?\s?d?\s?out|abort/i` → `'timeout'`. | `index.html:26284-26288` |
| **Retryable classification** | **None exists.** Every failure collapses to a string; the banner always shows RETRY regardless of cause. | `index.html:26363-26365`, `33566-33575` |

So the user-visible "timeout" comes from the **backend's 15 s abort surfaced as a generic 500**, re-labelled by a frontend regex. Neither side emits a structured, machine-readable timeout.

---

## §2 — Partial ticker mismatch (`current=FTN` while request=`FTNT`)

### The defective guard
`_fetchAndRenderChain` reads the ticker **twice from the DOM at two different times**:

```js
// index.html:26327  — at request start
var ticker = _currentChainTicker(formPrefix);
_chainLatestTicker[formPrefix] = ticker;           // committed target
...
var requestedTicker = _currentChainTicker(formPrefix);      // :26338
if (!requestedTicker || requestedTicker !== _chainLatestTicker[formPrefix]) { ...skip... }  // :26341  ✅ uses committed

_fetchOptionChain(requestedTicker, force).then(function(result) {
  var current = _currentChainTicker(formPrefix);            // :26348  ← reads LIVE DOM again
  if (current !== requestedTicker) {                        // :26349  ❌ compares to live DOM, NOT _chainLatestTicker
    console.log('[OPTION CHAIN] stale ignored ticker=' + requestedTicker + ' current=' + current + ...);  // :26352
    return;
  }
```

`_currentChainTicker` (`index.html:26310-26313`) is `document.getElementById('jtTicker').value.trim().toUpperCase()` — the **raw, uncontrolled input value at the instant the promise settles** (up to 15–20 s after the request began).

### Why this is the mismatch
- The **request-start** guard (`:26341`) correctly compares against `_chainLatestTicker` (the committed request target).
- The **resolution** guard (`:26349`) does **not** — it compares against whatever text is in the field *now*. This is inconsistent with the start guard and is the bug.
- For `current` to read `FTN` while `requestedTicker`/`_chainLatestTicker` is `FTNT`, the field simply has to momentarily hold `FTN` at settle-time — e.g. the user backspaced to correct a typo, the field was re-seeded, or (Portfolio form) an intervening per-keystroke request resolved. The **valid FTNT chain is then silently discarded**, forcing the empty-expiry / banner state.

### Answers to the §2 checklist
- **Read from raw input while typing?** Yes — `_currentChainTicker` reads the raw DOM value; the resolution guard uses it directly (`:26348`).
- **Stale check uses raw field vs confirmed/normalized?** Raw field (`:26349`). It should use `_chainLatestTicker[formPrefix]`.
- **Autocomplete truncates FTNT→FTN?** **No autocomplete/datalist/typeahead exists** in `index.html` (verified: zero matches for `datalist|autocomplete|typeahead|*Suggest`). Truncation is not from autocomplete.
- **Request triggers before confirmation?**
  - **JT (Log Trade) form:** No. `oninput` only recomputes local streamers (`refreshAllJtLegStreamers()`); the fetch fires on **confirm** only — `onchange` + `onblur` (`index.html:33477-33479`).
  - **AP (Portfolio "Add Position") form:** **Yes** — `fieldWithChange` binds the handler to **both `oninput` and `onchange`** (`index.html:26471`), so `apTicker` fetches `/option-chains/…/nested` on **every keystroke** (`index.html:26055`). Confirm-only was fixed for JT in commit `45eccd2` but **never applied to AP**.
- **Old partial-symbol request still pending?** Possible on the **AP** form (e.g. `FTN` and `FTNT` become two separate `S._optChainPending` entries).
- **Current ticker from a different field?** No — same field (`#{prefix}Ticker`), read at two different moments.

### Does a stale/old response overwrite a newer success?
Protected **only while the DOM still reflects the newest ticker**: an older cross-ticker response settling later fails `current !== requestedTicker` and is dropped (`:26349`), so success is preserved (§9-D holds). The failure mode is the **opposite** — the guard is *too aggressive* and discards **valid current-ticker** responses (§2 above).

---

## §3 — requestId + dedup lifecycle

### The dedup (network layer) is correct; the caller layer is not
```js
// _fetchOptionChain — index.html:26242
if (!force && cached && (Date.now() - cached.fetchedAt) < 5*60*1000) return cached;   // :26248  force bypasses CACHE
if (S._optChainPending && S._optChainPending[t]) {                                     // :26250  dedup — NO force check
  _pdOc.optionChainDedupHits++;
  console.log('[PERF-DIAG] option-chain dedup hit ticker=' + t + ' totalHits=' + ...); // :26253
  return S._optChainPending[t];                                                        // returns the SHARED promise
}
...
S._optChainPending[t] = _pending;                                                      // :26292
try { return await _pending; } finally { delete S._optChainPending[t]; }               // :26294  keyed by ticker ✅
```

- **Dedup returns the same promise, but each caller increments its own requestId and attaches its own `.then()`.** `requestId = ++_chainRequestId[formPrefix]` (`:26345`) happens in `_fetchAndRenderChain` per **user action**, decoupled from actual network calls. Reqs 8–12 are dedup **no-ops** at the network layer yet each emits a "request start" + a final "error" log and a re-render.
- **`force` does NOT bypass the dedup** (only the cache, `:26248`). So a manual RETRY *during a pending request* starts **no new network request** — it silently joins the existing one. This contradicts the stated intent in the comment at `index.html:26246-26247` ("manual Retry bypasses the 5-min cache so the user can re-hit a backend that was transiently timing out").
- **Every deduped caller attaches a final error handler.** When the shared promise resolves to `null` (timeout), **all** attached `.then()` callbacks run → each sets the same `_chainError` and logs `[OPTION CHAIN] error … requestId=N` (`:26365`). Result: **1 banner, but N duplicate error logs + N redundant re-renders**.
- **Two-tier logging explains the transcript:** `[OPTION CHAIN ERROR] FTNT timeout` (`:26288`) fires **once per real network attempt** (inside `_fetchOptionChain`'s catch); `[OPTION CHAIN] error … requestId=N` (`:26365`) fires **once per caller/requestId**. Hence one real error but six requestId errors.
- **Pending cleanup** is correct and identity-safe: `delete S._optChainPending[t]` in `finally` (`:26294`), keyed by ticker. Init is safe (`S._optChainPending:{}` at `index.html:1472`).

**Net:** one in-flight request per ticker at the *network* level (good), but multiple user-visible requestIds and multiple final handlers at the *caller* level (bad) → the "storm."

---

## §4 — Retry button UX

RETRY is rendered inside `_renderJtLegsTable()`:
```js
// index.html:33566-33575
if (_cErr && ticker && _cErr.ticker === ticker) {
  html += '…<button onclick="_fetchAndRenderChain(\'jt\',true)" class="tbtn" …>RETRY OPTION CHAIN</button>…';
}
```

| Expected | Actual | Evidence |
|----------|--------|----------|
| Retry disabled/ignored while pending | **No** disabled/`Retrying…` state; button is re-rendered enabled on every error re-render | `index.html:33574` (no `disabled`), no pending guard |
| One new request per click | `force=true` ⇒ `run()` immediately, **no debounce** (`:26372`); each click = new requestId + new `.then()`; may dedup onto existing pending (no new network) | `index.html:26372`, `26250` |
| Double-click ⇒ one request | Double-click ⇒ two requestIds, two handlers | — |
| Retry doesn't clear old error too early | OK — `_chainError` cleared only on a **successful** load for the same ticker (`:26356`) | `index.html:26356` |
| Retry doesn't inherit a failed promise | **Can inherit** — deduped `force` retry attaches to the already-failing pending promise (§3) | `index.html:26250` |
| Manual expiry/strike preserved | **OK** — banner is additive; the date/number fallbacks always render (`renderLegsTable`/`_renderJtLegsTable`), so manual entry is never blocked | `index.html:26118-26139`, `33591-33599` |
| Extra hidden trigger | Clicking RETRY blurs `#jtTicker` ⇒ `onblur` fires `_fetchAndRenderChain('jt')` (non-forced) ⇒ an **extra** debounced requestId (explains `requestId=11` with no `(manual retry)`) | `index.html:33479` |

---

## §5 — Backend timeout contract (READ-ONLY)

### Current behavior (post-PR #197 revert)
```js
// server.js:5404-5413
app.get('/option-chains/:symbol/nested', requireApiKey, async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const data = await ttFetch(`/option-chains/${sym}/nested`);   // 15 s abort inside ttFetch (server.js:592)
    res.json(data);
  } catch(e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message });                // GENERIC — no classification
  }
});
```

| Question | Answer |
|----------|--------|
| Route-specific timeout? | **No.** Inherits `ttFetch`'s global 15 s (`server.js:592`). |
| Structured JSON on timeout? | **No.** `{ error: e.message }`, HTTP 500 (abort has no `.status`). |
| Classifies timeout / auth / not_found / malformed? | **No.** All collapse to `{ error: <string> }`. |
| Frontend relies on structured codes? | **No.** Frontend only string-matches `timeout|abort` (`index.html:26286`); it consumes no `error` code, so the opaque contract does **not** break the frontend today. |
| `/options/chain/:symbol` still used? | Route **exists** (`server.js:5375`) but the frontend chain loader **never calls it** — the only frontend `/options/*` calls are `/options/ivr/*` (IVR, unrelated). It is effectively dead for Log Trade. |

### What PR #196 did — and why "don't reintroduce blindly" is right
PR #196 (`a3a1c05` "Fix option chain timeout responses" + `2e861d9`) solved a **real** contract gap but mixed two scopes:
- ✅ **Route-specific (good):** added `lib/option-chain-errors.js` with `buildOptionChainError()` → structured `{ ok, ticker, error, message, retryable, durationMs, source }`, distinct HTTP codes (504/404/502/503), and `OPTION_CHAIN_TIMEOUT_MS` (env `OPTION_CHAIN_TT_TIMEOUT_MS`, default **14000**). This is **exactly** the minimal contract requested in the task.
- ⚠️ **Global (risky):** modified the shared `ttFetch` to attach `err.status` to **every** thrown error and made the timeout configurable for **all** callers, and added a `summary.empty ⇒ 404` branch to the route. PR #197 reverted the whole thing "due to regression." The global `ttFetch` surface change (every route's error object mutates) and the new empty⇒404 behavior are the parts to **avoid**.

`buildOptionChainError` classification (from the reverted `lib/option-chain-errors.js`, for reference):

| Condition | HTTP | `error` code | `retryable` |
|-----------|------|--------------|-------------|
| abort/timeout | 504 | `option_chain_timeout` | true |
| 401/403/session/token | upstream/503 | `option_chain_auth_unavailable` | true |
| 404 | 404 | `option_chain_not_found` | false |
| invalid JSON / HTML / empty | 502 | `option_chain_malformed_response` | true |
| other 4xx/5xx | upstream/502 | `option_chain_upstream_error` | true |

---

## §6 — PR #292 is unrelated (confirmed)

- **PR #292** = `Merge #292 … portfolio-spy-eq-earnings-sqz` (`5bdd66f`). Its `index.html` diff touches **zero** option-chain lines: grep of the merge diff for `option.?chain|_fetchOptionChain|_fetchAndRenderChain|ttCall|requestId|stale ignored|RETRY OPTION` returns **nothing**. It changed only Portfolio SQZ/Earnings/SPY-EQ code + `PORTFOLIO_SPY_EQ_EARNINGS_SQZ_AUDIT.md` + a portfolio test.
- **The option-chain logic under audit predates #292.** It was introduced by commit **`45eccd2`** *"fix(journal): reliable option-chain expiry loader (confirm-only fetch, ticker-based stale guard, error/retry)"* — the work described in the task as **Frontend PR #291**. Its message documents the prior seq-based guard bug (`stale ticker=AMD current=AMD`) that motivated the ticker-based guard now under audit. So the mismatch/storm exist on the #291 line and are **not** a #292 regression.
- No merge node for a literal "#291" exists in this branch's ancestry; the substantive change lives in `45eccd2` (merged ahead of #292). Either way, **#292 did not touch this code**.

---

## §7 — Root cause / Evidence / Fix / Safety

### §7A Root-cause classification
**Primary: frontend retry/dedup lifecycle + frontend partial-ticker-mismatch.** Secondary/contributing: backend upstream (Tastytrade) slowness makes the 15 s abort fire in the first place; the opaque backend contract makes diagnosis harder but is **not** the cause. → **Combination, but fixable frontend-only.**

### §7B Evidence (exact anchors)
- **Endpoint / caller:** `index.html:26258` (`ttCall … /nested`), `26242` (`_fetchOptionChain`), `26325` (`_fetchAndRenderChain`).
- **Timeouts:** frontend `AbortSignal.timeout(20000)` `index.html:2212`; backend `AbortSignal.timeout(15000)` `server.js:592`.
- **State vars:** `_chainRequestId` `index.html:26302`; `_chainLatestTicker` `26303`; `_chainError` `26306`; `_optChainCache` `24109`; `_optChainLastError` `26240`; pending map `S._optChainPending` init `1472`, keys are **ticker** (`26292`).
- **Stale comparison (the bug):** `var current = _currentChainTicker(formPrefix)` `index.html:26348` → `if (current !== requestedTicker)` `26349`; inconsistent with start guard `26341` which uses `_chainLatestTicker`.
- **RequestId lifecycle:** `++_chainRequestId` `26345` per caller; dedup no-force `26250`; per-caller `.then()` error log `26365`.
- **Retry button:** `index.html:33574` (no disabled), immediate `run()` on force `26372`, hidden onblur trigger `33479`.
- **Backend generic error:** `server.js:5411`; `ttFetch` bare throws `599/604/609`.

### §7C Minimal fix proposal
**Recommended: (A) frontend-only.** (B) is an optional, independent backend hardening.

**(A) Frontend — `index.html` only, all inside `_fetchAndRenderChain` / `_fetchOptionChain` / `_renderJtLegsTable`:**
1. **Stale guard by committed target, not live DOM.** In the `.then()` at `:26348-26349`, compare `requestedTicker !== _chainLatestTicker[formPrefix]` (drop the `_currentChainTicker()` re-read). A response for the confirmed ticker is applied even if the field momentarily shows a different value. Fixes §2 (FTNT dropped as FTN) and keeps "old never overwrites new" (a superseded trigger updates `_chainLatestTicker`).
2. **One handler per network request.** Move the `requestId`/final-error logging + `_chainError` set + re-render so that deduped callers do **not** each attach a final handler — e.g. tag `_fetchOptionChain` to run the "apply/error/render" side-effect once per settled network call, or gate the `.then()` body on `requestId === _chainRequestId[formPrefix]` so only the **latest** caller renders. Kills duplicate error logs (§3) and redundant re-renders.
3. **Force retry must mean one new network request.** Either (a) disable/ignore RETRY while `S._optChainPending[ticker]` is set, **or** (b) make `force` mark the existing pending stale and start exactly one new request. Recommended: **(a) disable** — render RETRY as disabled/`Retrying…` when `_chainLatestTicker`'s ticker is pending; re-enable on settle. Fixes §4 spam + §3 force-bypass contradiction.
4. **Suppress the hidden onblur double-trigger** when RETRY is the blur target (or debounce/coalesce onchange+onblur so a single confirm = a single trigger).
5. *(Optional consistency)* Make the **AP** Portfolio form confirm-only too (stop `fieldWithChange` binding `oninput` for `apTicker`, or split it), so partial `FTN` is never requested. Out of the strict Log-Trade scope but removes the AP per-keystroke class of mismatch.

**(B) Backend — OPTIONAL, route-specific only (`server.js` + a small `lib/` helper), if a structured contract is later wanted:**
- Reintroduce **only** the route handler classification for `GET /option-chains/:symbol/nested`, returning `{ ok:false, ticker, error:'option_chain_timeout'|…, retryable, durationMs, source:'tastytrade' }` with 504/404/502/503.
- **Do not** modify the shared `ttFetch`; pass a route-local `AbortSignal.timeout(...)` via `opts.signal` **scoped to this route** (or wrap the call), leaving every other caller's `ttFetch` behavior byte-for-byte unchanged.
- Frontend can then read `body.error`/`body.retryable` to show cause-specific banners and hide RETRY when `retryable === false` — but this is **not required** for (A) to work.

### §7D Safety statement
- **Portfolio refresh / SQZ / Earnings / β / SPY-EQ:** untouched. Proposed changes live only in the option-chain loader functions.
- **Scanner formulas:** untouched.
- **Journal persistence / DB schema:** untouched (this is view/fetch logic only).
- **No Yahoo / no external providers** added.
- **Global `ttFetch`:** not modified (frontend `ttCall` and backend `ttFetch` signatures/behavior unchanged; any backend option (B) is route-scoped).
- **Manual expiry/strike entry:** preserved — the date/number fallbacks (`index.html:26118-26139`, `33591`) render regardless of chain availability; the banner is additive.
- **PR #196 not reintroduced blindly** — only the route-specific classifier is a candidate, never the global `ttFetch`/empty⇒404 changes that caused the #197 revert.

---

## §8 — Test plan (only if implementing; harness already exists)

Frontend tests use `vm` + `extractFn(HTML, name)` against `index.html` (see `tests/journal-option-chain-expiry.test.js`, `tests/backend-candle-auth-gate.test.js`). New file: **`tests/journal-option-chain-timeout-retry.test.js`**:
1. Confirmed `FTNT` response is applied even when `_currentChainTicker` momentarily returns `FTN` (guard uses `_chainLatestTicker`, not live DOM).
2. No option-chain request for an unconfirmed partial ticker (JT confirm-only; AP if fixed).
3. Manual retry while pending creates **no** new requestId / attaches **no** duplicate handler (RETRY disabled-while-pending, or single coalesced network request).
4. A dedup hit produces **exactly one** final error log/render, not N.
5. RETRY is disabled/ignored while a request for the ticker is pending.
6. An older cross-ticker failure settling after a newer success is ignored (success preserved).
7. A single timeout renders **exactly one** banner.
8. Manual expiry/strike inputs remain present/usable when the chain is unavailable.

Backend tests **only if option (B) is implemented** (`apex-backend/tests/option-chain-nested-contract.test.js`):
- timeout ⇒ structured JSON `option_chain_timeout` (504, `retryable:true`); fix is **route-specific**, shared `ttFetch` unchanged (assert other routes' error shape unaffected); auth ⇒ `option_chain_auth_unavailable`; empty ⇒ `option_chain_not_found`; malformed upstream ⇒ `option_chain_malformed_response`; valid nested TT shape passes through unchanged.

---

## §9 — Manual verification plan (after fix; preview or deploy-preview-292)

- **A — timeout, no retry:** Ticker `FTNT`, don't click retry. Expect: one request, at most one banner, manual expiry/strike usable.
- **B — retry:** Ticker `FTNT`, click RETRY once. Expect: exactly one new network request, RETRY disabled while pending, no requestId storm, ≤1 final error.
- **C — partial typing:** Type `FTN` then `FTNT` quickly. Expect: no request for unconfirmed `FTN` (JT), and `FTNT` is **not** stale-ignored due to a transient `current=FTN`.
- **D — good symbol:** Use a symbol whose chain loads. Expect: chain applies, banner clears, no stale error overwrites the success.
