# TRADE / PORTFOLIO SAVE FLOW — END-TO-END AUDIT (read-only)

**Date:** 2026-07-02
**Frontend repo:** `Fede-ai-coder/apex-trading` — base `dev-clean`, audit branch `claude/trade-portfolio-save-audit-tgzbo2`
**Backend repo:** `Fede-ai-coder/apex-backend` — base `dev-4h-backend`
**Backend runtime (dev):** `https://apex-tastytrade-backend-dev-production.up.railway.app`
**Scope of this pass:** AUDIT ONLY. No fixes, no schema/migration/logic/auth changes, no DB reset, no seeding, no old-data import.

---

## ⚠️ Audit boundaries (what I could and could not inspect directly)

1. **Backend source code was NOT directly readable.** GitHub access in this session is scoped to `Fede-ai-coder/apex-trading` only; `apex-backend` is out of scope, so I could not read `server.js`, the SQLite schema, or the route handlers directly.
2. **Backend runtime was NOT reachable.** Outbound HTTPS to the Railway host is blocked by this environment's egress policy (proxy answered `403` to `CONNECT` — a policy denial that must be reported, not routed around). So I could not run live `GET /portfolios` / `GET /journal/trades` probes from here.
3. **Consequence:** the backend sections below (4, 5, 6) are reconstructed from the **authoritative contract the frontend encodes** (inline docs + the exact request shapes it sends) and the **frontend test suite**, not from backend source. Every backend claim is labelled **[from FE contract]** or **[unverifiable here]**. The runtime probes in §9 must be run by someone with backend/runtime access to close these gaps.

The frontend, by contrast, was audited directly and completely (`index.html`, single 40,896-line file).

---

## 1. Frontend endpoints called by Portfolio

Portfolios are **backend-only** (explicit design: no localStorage persistence, no local fallback). In-memory cache = last `GET /portfolios` response only.

API client helpers (`index.html:19498–19517`), all routed through `ttCall()`:

| Function | Method + path | Payload | When |
|---|---|---|---|
| `backendListPortfolios()` | `GET /portfolios` | — | tab open / startup (`_syncPortfoliosFromBackend`, `19547`) |
| `backendGetPortfolio(id)` | `GET /portfolios/:id` | — | detail |
| `backendCreatePortfolio(p)` | `POST /portfolios` | `{ name, description:"type=..." }` | `createPortfolio()` `19660` |
| `backendUpdatePortfolio(id,patch)` | `PUT /portfolios/:id` | `patch` (id/createdAt stripped) | `portfolioApplyUpdate()` `19605` |
| `backendDeletePortfolio(id)` | `DELETE /portfolios/:id` | — | `deletePortfolio()` `19697` |

- **Auth:** `ttCall()` sends `x-api-key: S.backendKey` and `x-session-id: S.ttSessionId` (`index.html:2204–2205`).
- **`+ NEW PORTFOLIO`:** button → `showNewPortfolioForm()` → `createPortfolio()` → **yes, it really calls `POST /portfolios`** (`19660`). On success it does **not** re-`GET /portfolios`; it merges the single returned object into the in-memory cache via `portfolioManager.upsertLocal(res.portfolio)` and re-renders (`19666–19671`). A full `GET /portfolios` reload happens on the next tab open (`_portfolioOpenBackendLoad`, `19591`). So the created portfolio survives refresh **iff** `POST /portfolios` actually persisted it.
- **Error handling / fallback:** **No localStorage fallback anywhere.** If the backend is unavailable, `createPortfolio()` **blocks** creation with a visible error (`19652–19657`) rather than creating a local-only portfolio. Load failures render a clear red "Portafogli non disponibili" state (`19719–19734`). This half of the system is honest — it cannot silently "look saved."
- **assigned/unassigned + positions grouping:** computed **frontend-side** (see §7 model). Source indicator shows `backend` / `backend (empty)` / `loading` / error.

**Verdict for Portfolio FE flow: complete and non-masking.**

---

## 2. Frontend endpoints called by Journal / new trade save

Two journal stores exist:
- **Active store = `journalManager`** (`index.html:30899`), backed by localStorage key `apexStorageKey('apex_trades')`. This is the "source of truth" per the code's own comment (`40281`).
- Legacy `jAddTrade/jLoad` path on key `apex_journal_v1` (`38777–38809`) — also patched with remote calls but **not** used by the current add form.

New-trade path: **`submitTrade()` (`35585`) → `journalManager.add(_addPayload)` (`35775`)**.

Remote write helpers (`index.html:40060–40205`), through `ttCall()`:

| Function | Method + path | Payload | Trigger |
|---|---|---|---|
| `jSaveRemote(t)` | `POST /journal/trades` | full trade (`_tradeForBackend`) | `jm.add` patch (`40346`) |
| `jUpdateRemote(id,t)` | `PUT /journal/trades/:id` | full trade | `jm.update/close/…` (`40337`) |
| `jDeleteRemote(id)` | `DELETE /journal/trades/:id` | — | `jm.remove` (`40419`) |
| `jSyncToBackend()` | `POST /journal/sync` | `{ trades:[...] }` | manual "Sync" button (`39089`) |
| `jEnrichedDryRun(t)` | `POST /journal/trades/enriched` | `{...t, save:false}` | diagnostic only, **never persists** (`40087`) |

`journalManager` is patched (`40330–40435`) so terminal state changes fan out to the backend:
`add → jSaveRemote`, `update/close/closeLegs/setExitSnapshot/setAdjustmentSnapshot/patchSnapshotTech → jUpdateRemote`, `remove/removeByPortfolio → jDeleteRemote`.

- **A new trade IS pushed to the backend** (`POST /journal/trades`), **not local-only**. The write is **not** gated by the preview/local skip (see §3).
- **Response contract [from FE]:** `jSaveRemote` treats the save as OK only if the response has `.id` (`40067`). `POST /journal/sync` expects `{ total, created, updated }` (`40197`).
- **State update:** frontend state is updated **locally first** (localStorage), then the backend call fires.
- **BUT the write is fire-and-forget and error-swallowing** — see §8. This is the critical asymmetry vs the Portfolio flow.

**Verdict for Journal FE flow: writes are attempted, but success is assumed, not verified (masking risk).**

---

## 3. What `JOURNAL SYNC SKIP` actually disables

There are **two different predicates** and it matters which gates what:

- `isApexLocalDevEnv()` (`19309`) — **strict**: `localhost` / `127.0.0.1` / empty host / `file:` only. **Deploy previews are NOT included.**
- `isApexPreviewOrLocalEnv()` (`19299`) — **broad**: adds `deploy-preview-<n>` hosts.

Where each is used:

| Path | Function | Gate | Effect |
|---|---|---|---|
| Pull journal from backend | `_jSyncJournalFromBackend` `32230` | `isApexLocalDevEnv` (strict) | skipped only on genuine local dev |
| Pull journal (merge) | `jLoadFromBackend` `40210` | `isApexLocalDevEnv` (strict) | skipped only on genuine local dev |
| **Auto-upload / migration of local `apex_trades`** | `jMigrateApexTradesToBackend` `40456` | **`isApexPreviewOrLocalEnv` (broad)** | **disabled on previews AND local** |
| **Manual new-trade save** | `jSaveRemote` `40060` | **none** | **runs on preview and prod** |
| Portfolio save/create/delete | `_portfolioBackendUsable` `19528` | `isApexLocalDevEnv` (strict) | runs on previews; blocked only on genuine local |

**Answer to the key question:** `[JOURNAL SYNC SKIP] preview/local env` (`40457`) disables **only the one-time auto-migration/bulk-upload of pre-existing local trades** on deploy previews. It does **NOT** disable manual new-trade saves, journal reads, or portfolio saves. Deploy-preview is therefore **read+write for new data**, and only **read-only for legacy-migration**. Genuine `localhost/file://` is fully offline for journal+portfolio backend sync.

So: a new trade created on a deploy-preview **should** POST to the dev backend. On genuine localhost it will not (correct by design).

---

## 4. Backend Portfolio endpoints  **[from FE contract; not verified against backend source/runtime]**

Contract the frontend depends on (`index.html:19489–19494`):

| Endpoint | Expected response | Notes |
|---|---|---|
| `GET /portfolios` | `{ ok:true, portfolios:[], count }` | authoritative list |
| `GET /portfolios/:id` | `{ ok:true, id, portfolio }` | |
| `POST /portfolios` | `{ ok:true, id, portfolio }` | server generates id |
| `PUT /portfolios/:id` | `{ ok:true, id, portfolio }` | |
| `DELETE /portfolios/:id` | `{ ok:true, ... }` (soft delete) | may return `code:'portfolio_has_trades'` (`19699`) |
| errors | `{ ok:false, error, code }` | |

- **Auth required [from FE]:** `x-api-key` (+ optional `x-session-id`) on all.
- **Store / table / DB path / validation / error handling:** **UNVERIFIABLE from here.** The claim "uses `/data/journal.db`, table `portfolios`, not a legacy JSON store" **cannot be confirmed** without backend source or a runtime probe. This is exactly the confirmation the audit asks for and the most likely place the bug lives (§12). **Open item.**

---

## 5. Backend Journal / Trades endpoints  **[from FE contract; not verified]**

Endpoints the frontend calls (so they are expected to exist):

| Endpoint | Expected response [from FE] |
|---|---|
| `GET /journal/trades` | `{ trades:[...] }` (`40216`, `32240`) |
| `POST /journal/trades` | `{ id, ... }` — `.id` present ⇒ OK (`40067`) |
| `PUT /journal/trades/:id` | full replace; enforces NOT-NULL cols e.g. `ticker` (`40562`) |
| `DELETE /journal/trades/:id` | 2xx or 404 (404 treated as already-deleted, `40166`) |
| `POST /journal/sync` | `{ total, created, updated }` (`40197`) |
| `POST /journal/trades/enriched` | `{ ok, saved, trade.enrichment, enrichmentDiagnostics }` — dry-run, `save:false` |

- **Alias `/trades`:** the frontend does **not** call a bare `/trades` write endpoint; everything is under `/journal/*`.
- **Do write endpoints exist?** The frontend assumes `POST/PUT/DELETE /journal/trades` and `POST /journal/sync` exist. **Whether they exist and persist to SQLite (`trade_legs`, `portfolio_id`, `status`, `createdAt/updatedAt`) is UNVERIFIABLE from here.** If any of these are missing or return a success-shaped body without writing, that is the gap — and the frontend would not notice (§8).
- **Leg / portfolioId persistence contract [from FE]:** `_tradeForBackend` (`40302`) sends legs with **snake_case + camelCase aliases** (`option_type`, `expiration_date`, `strike_price`, `streamer_symbol`, `occ_symbol`, `action`, `quantity`) and `portfolioId` **under both `portfolioId` and `portfolio_id`** so a snake_case backend keeps the link. Comments reference `trade_legs.status` surviving reload (`31646`), implying a `trade_legs` table exists — **[unverified]**.

---

## 6. Trade ↔ Portfolio relationship

- **`portfolioId` lives ON the trade record** (`t.portfolioId`, sent as `portfolioId`+`portfolio_id`, `40307–40309`). There is no separate join table on the frontend side.
- **Positions are derived from trades** (grouped by portfolio at render time).
- **assigned / unassigned / linked counters are computed FRONTEND-side** in `getPortfolioJournalReconciliation()` (`19845–19879`): it walks `journalManager.getAll()`, checks `t.portfolioId` against the valid portfolio id set, and tallies. **The backend does not compute these** (as far as the FE is concerned).
- **Assigning a trade to a portfolio** = editing the trade's `portfolioId` via the form → `journalManager.update()` → `_jmSyncUpdate` → **`PUT /journal/trades/:id`** with the full trade (`40337`). So assignment **does** trigger a backend write — but again fire-and-forget (§8), and it persists only if the backend PUT actually stores `portfolio_id`.

**Persistence of assignment is therefore only as reliable as the (unverified) backend PUT + the swallowed-error path.**

---

## 7. Error masking — where "saved" can be a lie

| Location | Pattern | Risk |
|---|---|---|
| `jSaveRemote` `40074` | `catch(e){ console.warn(...) } return false` | **HIGH.** New-trade POST failure is swallowed; caller ignores the return value. |
| `jm.add` patch `40346` | `jSaveRemote(...)` result **not awaited, not checked** | **HIGH.** `submitTrade` shows **`Trade logged` toast unconditionally** (`35793`) even if the POST 401s / times out / endpoint is missing. Trade stays in localStorage only. |
| `jUpdateRemote` `40147` | `catch(e){ console.warn }` | **MEDIUM.** Assignment / close / edit PUT failures swallowed. |
| `jSyncToBackend` `40201` | `catch(e){ console.warn }` | MEDIUM. |
| `backend*Portfolio` `19500–19516` | `catch → { ok:false, code:'request_failed' }` | **LOW/OK** — callers check `res.ok` and surface a visible error; **no** false success. |

**Net:** the **Portfolio** flow never fakes success (it blocks on failure). The **Journal/trade** flow **can** display success while the backend write silently failed. Nothing here does `res.json({ok:true, trades:[]})` on the FE, and no journal read does `catch → return []` masking (reads have retry/backoff + last-known-good). The masking is specifically on the **journal write** side.

---

## 8. Auth

- All writes go through `ttCall()` (`2199`) which attaches `x-api-key: S.backendKey` and `x-session-id: S.ttSessionId`. Helper `_backendAuthHeaders()` (`1523`) is the equivalent for direct `fetch` calls (used by `jDeleteRemote`, `40156–40158`).
- **401/403 handling:** `ttCall` records every status into `_recordBackendApiAuthResult()` (auth-validity gate) and **throws** on non-2xx (`2221`). For portfolio calls the throw becomes a visible error. **For journal writes the throw is swallowed** (§7) — so a 401/403 on a trade save is **not shown to the user**, only logged.
- **Preconditions:** `jSaveRemote` returns early only if **both** `S.backendKey` **and** `BACKEND` are missing (`40061`). If `BACKEND` is set but `S.backendKey` is empty (e.g. before login completes), it still POSTs **without** an `x-api-key` → likely `401` → swallowed. Portfolio create, by contrast, requires `S.backendKey` up front (`_portfolioBackendUsable`, `19533`) and blocks visibly.

---

## 9. Safe manual runtime test (to be run by someone with runtime access)

> These require reaching the backend / running the app; the egress policy blocked me from running them here.

**Portfolio (fully supported, non-masking):**
1. Open the app on the **dev/preview** deployment (so `BACKEND` = dev URL). Confirm in console: `[BACKEND CONFIG] host=… backend=https://apex-tastytrade-backend-dev-production…`.
2. `+ NEW PORTFOLIO` → name `TEST_DO_NOT_USE`, pick a type → create. Watch for `[PORTFOLIOS][BACKEND] created id=…` (success) vs a red error (blocked).
3. `GET /portfolios` (or reopen tab) → count > 0, `TEST_DO_NOT_USE` present.
4. Full page refresh → portfolio still listed.
5. Delete it → `GET /portfolios` count back to previous.

**Trade (masking-prone — verify the backend, not just the UI):**
1. On the same dev/preview deploy, create a trade with ticker `TEST`, one leg, status OPEN, assigned to `TEST_DO_NOT_USE`.
2. **Do NOT trust the green toast.** Open DevTools → Network → confirm `POST /journal/trades` returned **2xx with a body containing `id`**, and console shows `[JOURNAL] Remote save OK: <id>`. A `401/403/5xx/timeout` here is the smoking gun (UI will still say "Trade logged").
3. Independently `GET /journal/trades` → the trade is present **with** `portfolio_id`/`portfolioId` set.
4. Refresh (or relogin/redeploy) → trade still returned by `GET /journal/trades`.
5. Delete the test trade and the test portfolio.

**If step 2 shows the POST failing (or the endpoint 404s), that is the confirmed gap.** If there is no safe way to reach the backend, the gap stays documented and unconfirmed (as it is in this pass).

---

## 10 (as §12). Most probable cause the DB stays empty today

Ranked, given portfolios **and** trades are both `0`:

1. **Backend base-URL split (prod vs dev).** `resolveBackendUrl()` (`1361–1372`): production hostname → `PROD_BACKEND` (`apex-tastytrade-backend-production…`), while `localhost`/`deploy-preview`/the named Netlify branch host → `DEV_BACKEND` (the inspected one). **If the real usage is on the production site, every write went to the PROD backend and the DEV `/data/journal.db` being empty is expected, not a bug.** Cheapest thing to check first — read the `[BACKEND CONFIG]` console line in the browser that actually created data.
2. **Silent journal-write failure masked as success** (§7/§8). If usage was on dev/preview, a `401` (no `x-api-key` yet), a missing/500 `POST /journal/trades` route, or a backend that returns a success shape without inserting, would leave the DB empty while the UI said "Trade logged." Portfolios wouldn't be affected the same way (they block on failure) — **but** if `portfoliosCount` is also 0 on the backend the user actually wrote to, that points to #1 or #3 rather than #2.
3. **Backend persists to a non-`/data/journal.db` store** (legacy JSON / in-memory / a second DB file), so a redeploy/volume that only persists `/data/journal.db` shows empty. **Unverifiable here** — this is the item §4/§5 flag and must be confirmed in `apex-backend`.

**My single best hypothesis:** a combination of #1 (data was written to the *other* backend) and/or #2 (dev-side writes failing silently). Both are quick to confirm with §9 step 2 + the `[BACKEND CONFIG]` line. #3 needs backend-repo access.

---

## Consolidated answers to the requested output list

3. **`JOURNAL SYNC SKIP` disables:** only the **auto-migration/bulk-upload of pre-existing local trades** on deploy-preview/local (`isApexPreviewOrLocalEnv`). Reads use the strict `isApexLocalDevEnv`; **manual new-trade saves and portfolio saves are NOT disabled** on previews.
4. **Backend endpoints available:** [from FE contract] `GET/POST/PUT/DELETE /portfolios(/:id)`, `GET/POST/PUT/DELETE /journal/trades(/:id)`, `POST /journal/sync`, `POST /journal/trades/enriched`. Existence unverified against backend source/runtime.
5. **Backend endpoints missing:** **cannot be determined from here.** The audit's core backend question (do the journal **write** routes exist and persist to SQLite?) is **open** and needs backend-repo or runtime access.
6. **DB/tables used:** [from FE contract] `/data/journal.db`, tables `portfolios` + `trades` (+ `trade_legs`). **Not confirmed** — legacy-JSON-store question is unresolved.
7. **Trade ↔ portfolio:** `portfolioId` stored on the trade (dual alias); positions derived from trades; assigned/unassigned computed **frontend-side**; assignment write = `PUT /journal/trades/:id` (fire-and-forget).
8. **Masking points:** journal writes (`jSaveRemote`/`jUpdateRemote`) swallow errors; `submitTrade` toasts success unconditionally. Portfolio writes do **not** mask.
9. **New portfolio persistent E2E?** **Frontend: YES and honest** (blocks on failure, uses backend id). **Backend persistence unconfirmed** (§4). → **PARTIAL, pending backend confirmation.**
10. **New trade persistent E2E?** **Frontend attempts it but does not verify** (masking). **Backend persistence unconfirmed.** → **PARTIAL / at-risk.**
11. **Assignment persistent E2E?** Same as #10 — `PUT` fires but is fire-and-forget and unverified. → **PARTIAL / at-risk.**
12. **Most probable empty-DB cause:** prod/dev backend split (#1) and/or silently-failed dev writes (#2); possibly a non-persistent/legacy backend store (#3). See §10.

---

## 13. Minimal fix proposed (for a LATER PR, not this one)

Smallest change that removes the masking and would immediately reveal the real cause, **without** touching schema/migration/auth/portfolio/journal logic:

- Make the **new-trade save await + surface failure**: in the `jm.add` patch (`index.html:40342–40348`), `await jSaveRemote(...)` and, when it returns falsy, show a **warn** toast ("Trade saved locally but backend sync failed — not persisted") instead of the unconditional green "Trade logged" (`35793`). Mirror the Portfolio pattern.
- Optionally the same for `jUpdateRemote` on assignment/close.

This is a **micro-fix to user feedback only** — it does not change what is stored or the endpoints. It converts a silent failure into a visible one, which is the fastest way to confirm whether §10-#2 is happening. **Not to be implemented without your go-ahead.**

## 14. Files to modify in the follow-up PR
- `index.html` — only the journal remote-write feedback (`~40342–40348`, `~35793`), and only if the runtime test (§9 step 2) shows silent write failures.
- (Backend, separate repo/PR) `apex-backend` — confirm/repair `POST/PUT/DELETE /journal/trades` + `/journal/sync` persist to `/data/journal.db`; confirm portfolios table. **Requires backend access this session did not have.**

## 15. Files NOT to touch
`index.html` schema/migration/portfolio logic/journal logic/auth/scanner/market-context/VIX/candles/scheduler; any DB file; any test fixture. No DB reset, no legacy import, no seeding.

## 16. Test plan
- **Frontend (this pass, executed):** `node tests/*portfolio*.test.js` → 20 pass, 1 pre-existing fail (`portfolio-option-streamer-symbol.test.js`, `ReferenceError: _portfolioRefreshPayloadDebugEnabled` in the test sandbox — reproduces on `dev-clean`, unrelated to save flow). `node tests/*journal*.test.js` → 5 pass, 1 pre-existing fail (`journal-import-json.test.js`, `ReferenceError: normalizeTradeOptionLegAliases` — also reproduces on `dev-clean`). `node tests/*trade*.test.js` → **no files match the glob**.
- **Backend (could NOT run — repo/runtime not accessible here):** `node --check server.js`, `node --test tests/*portfolio*.test.js`, `…*journal*…`, `…*trade*…`, `…*sqlite*…`. **Must be run in `apex-backend` to close §4/§5.**
- **Runtime:** §9 manual checks (need runtime access).
