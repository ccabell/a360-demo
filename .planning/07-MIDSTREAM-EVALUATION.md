# Mid-Stream — Evaluation Findings (read-only audit from Claude Code)

**Date:** 2026-05-04
**Scope:** Local clone at `C:\Users\Chris\repos\Mid_Stream` (mirror of `https://github.com/ccabell/Mid_Stream`, synced one-way from Manus)
**Method:** Static code read of `src/apiServices/*` and `src/agents/hitl/*`, cross-referenced against the live Prompt Runner OpenAPI spec at `https://prompt-runner-production.up.railway.app/openapi.json`
**Output:** Manus-ready instructions in §6. Do **not** commit changes from Claude Code — Manus → GitHub is one-way; commits would be overwritten.

---

## Executive summary

**The external report you received about Mid-Stream's broken endpoints is largely wrong.** Of the 5 issues it claimed, 4 are not real. The actual code uses the right endpoints. The one real issue is a dead-code helper (`getHITLVersion`) that's defined but never called at runtime, so it isn't even causing visible breakage today.

If Mid-Stream's HITL or downstream-agent UI is failing in production, the cause is **not** missing endpoints. Look for: wrong request bodies, auth/CORS, deploy-time env-var issues (`VITE_API_URL`), or stale build artifacts.

---

## 1. Architecture snapshot

| Aspect | Value |
|---|---|
| Stack | React 19 · TS · Vite · MUI v7 · Zustand · Supabase · axios |
| Pages | 13 (`Runs`, `RunDetail`, `HITLVerification`, `Agents`, `Coaching`, `Opportunities`, `Practices`, `PracticeLibrary`, `TCPWrapper`, `Integrations`, `Dashboard`, `Hub`, `PromptManager`) |
| API services | 8 files in `src/apiServices/` |
| Agent modules | `hitl`, `tcp`, `tcp-runner` (each with components/hooks/utils) |
| HTTP client | `src/apiServices/client.ts` — single axios instance, baseURL = `import.meta.env.VITE_API_URL ?? '/api'` |
| Backend | Prompt Runner (Railway) — read/write |
| Latest commit (local) | `064ac5e feat(round-21): CoachingPage, Supabase pl_ integration, @mui/system fix, todo.md` |

The codebase is well-organized. API services are cleanly separated by domain (runs, agents, opportunities, etc.). HITL and TCP have their own folder modules with hooks and components — good architecture.

---

## 2. Full API-call inventory (Mid-Stream → Prompt Runner)

Every endpoint Mid-Stream's apiServices layer calls, cross-referenced against the live OpenAPI spec.

| Method | Path | File:line | Status |
|--------|------|-----------|--------|
| GET | `/agents` | `agents.api.ts:12` | ✅ |
| POST | `/agents` | `agents.api.ts:30` | ✅ |
| PATCH | `/agents/{id}` | `agents.api.ts:33` | ✅ |
| DELETE | `/agents/{id}` | `agents.api.ts:36` | ✅ |
| **POST** | **`/run_downstream`** | **`agents.api.ts:21`** | **✅** (report claimed this was broken — it isn't) |
| GET | `/opportunities` | `opportunities.api.ts:6` | ✅ |
| PATCH | `/opportunities/{id}` | `opportunities.api.ts:11` | ✅ |
| GET | `/practices` | `practices.api.ts:6` | ✅ |
| GET | `/practices/{id}` | `practices.api.ts:12` | ✅ |
| GET | `/prompt_templates` | `prompts.api.ts` (list/health) | ✅ |
| GET | `/prompt_templates/{slug}` | `prompts.api.ts:149` | ✅ |
| POST | `/prompt_templates` | `prompts.api.ts` (create) | ✅ |
| PATCH | `/prompt_templates/{id}` | `prompts.api.ts` (update) | ✅ |
| DELETE | `/prompt_templates/{id}` | `prompts.api.ts` (delete) | ✅ |
| GET | `/prompt_sets` | `prompts.api.ts` (listSets) | ✅ |
| GET | `/prompt_sets/{id}` | `prompts.api.ts` (getSet) | ✅ |
| POST | `/prompt_sets` | `prompts.api.ts` (createSet) | ✅ |
| GET | `/runs` | `runs.api.ts:134` | ✅ |
| GET | `/runs/{id}` | `runs.api.ts:141` | ✅ |
| GET | `/runs/neighbors` | `runs.api.ts:145` | ✅ |
| PATCH | `/runs/{id}` | `runs.api.ts:153` | ✅ |
| GET | `/runs/{id}/hitl` | `runs.api.ts:163` | ✅ (report claimed missing — wrong) |
| **GET** | **`/runs/{id}/hitl/version`** | **`runs.api.ts:169`** | **❌ does not exist in PR — but never called at runtime, see §4** |
| POST | `/runs/{id}/hitl` | `runs.api.ts:194` | ✅ (report claimed missing — wrong) |
| POST | `/runs/{id}/hitl/analyze` | `runs.api.ts:229` | ✅ (report claimed missing — wrong) |
| GET | `/transcripts` | `transcripts.api.ts:7` | ✅ |
| GET | `/transcripts/{id}` | `transcripts.api.ts:14` | ✅ |

**26 calls total. 25 are correct. 1 (`getHITLVersion`) targets a non-existent path, but is dead code.**

---

## 3. Endpoints the report claimed Mid-Stream was calling — that it isn't

A grep across `C:\Users\Chris\repos\Mid_Stream\src` for these paths returned **zero matches**:

- `/extraction` (any path)
- `/run_extraction` (Mid-Stream doesn't trigger extractions — that's correct, this happens elsewhere)
- `/runs/.../downstream` (the path the report said Mid-Stream called)
- `/runs/.../outputs` (the path the report suggested as the fix — also doesn't exist in PR)

Conclusion: the report describes a Mid-Stream that doesn't match the GitHub repo. Possible explanations: (a) report writer was looking at a stale build, (b) was looking at a *different* tool, (c) hallucinated. Either way, the diagnosis as given is unreliable.

---

## 4. The one real issue — `getHITLVersion` is dead code

`src/apiServices/runs.api.ts:166-169`:

```ts
/**
 * Get current HITL version info for conflict detection
 */
getHITLVersion: (runId: string) =>
  client.get<HITLVersionedResponse>(`/runs/${runId}/hitl/version`).then((r) => r.data),
```

`/runs/{id}/hitl/version` does not exist in the Prompt Runner API. But:

- Grep across the repo: only one usage outside `runs.api.ts` itself, in `src/agents/hitl/hooks/useHITLState.ts:938`, and that line is **commented out**:
  ```ts
  // In production: const serverVersion = await runsApi.getVersion(runId);
  ```
- That commented line also has the wrong method name (`getVersion` vs `getHITLVersion`) — it's not even up-to-date placeholder code.

**Runtime impact:** none. Nothing calls it. It's a stub for a planned feature (HITL version conflict detection — `If-Match` header + 409 handling, see `runs.api.ts:175-222`).

**What to do:** either (a) delete the stub, or (b) keep it and add the backend endpoint when version-conflict detection is implemented. The conflict-detection plumbing in `saveHITL` is ready to use it.

---

## 5. What might explain a real failure of HITL or downstream-agent UI

If those features are visibly broken in the deployed Mid-Stream and the API endpoints are correct, the cause is somewhere else. Things to check:

| Possibility | How to verify |
|---|---|
| `VITE_API_URL` env var not set in the Manus-deployed build | Open the live site, network tab — confirm requests go to `prompt-runner-production.up.railway.app`, not `/api` (which only works behind the Vite dev proxy) |
| CORS preflight failing | Network tab → look for OPTIONS rejections |
| Request body schema mismatch | Compare the `RunDownstreamRequest`, `HITLAnalyzeRequest`, `HITLSubmitRequest` shapes in `runs.api.ts` and `agents.api.ts` against the OpenAPI request schemas — quick to do once we have access to the live request payloads |
| Stale build cached at the CDN | Hard refresh; check `Cache-Control` headers |
| Auth header missing if PR added auth recently | Search Mid-Stream for any auth interceptor; the current `client.ts` doesn't add one |

The right diagnostic move is to open the deployed Mid-Stream, hit the failing UI, and capture the actual network request + response. The codebase audit can't tell us anything more without that signal.

---

## 6. Manus-ready instructions

Two options. Pick one and paste into Manus.

### Option A — Minimal cleanup (recommended)

> **Manus task: clean up dead HITL-version stub in runs.api.ts**
>
> File: `src/apiServices/runs.api.ts`
>
> 1. **Delete the `HITLVersionedResponse` interface** (currently at roughly line 25–29):
>    ```ts
>    export interface HITLVersionedResponse {
>      version: number;
>      lastModified: string;
>      lastModifiedBy: string;
>    }
>    ```
> 2. **Delete the `getHITLVersion` method** in the `runsApi` object (currently lines 165–169):
>    ```ts
>    /**
>     * Get current HITL version info for conflict detection
>     */
>    getHITLVersion: (runId: string) =>
>      client.get<HITLVersionedResponse>(`/runs/${runId}/hitl/version`).then((r) => r.data),
>    ```
> 3. **Update the commented-out reference** in `src/agents/hitl/hooks/useHITLState.ts:938` from:
>    ```ts
>    // In production: const serverVersion = await runsApi.getVersion(runId);
>    ```
>    to:
>    ```ts
>    // TODO: implement HITL version conflict detection — requires backend endpoint
>    // GET /runs/{run_id}/hitl/version (not yet in Prompt Runner)
>    ```
>
> Reason: `getHITLVersion` calls `GET /runs/{run_id}/hitl/version`, which does not exist in the Prompt Runner API. The method is never called at runtime (the only reference is a commented-out line), so there is no behavior change. Removing it eliminates a dead dependency and makes the missing-endpoint situation explicit in the comment.
>
> The conflict-detection plumbing in `saveHITL` (lines 175–222) keeps the `If-Match` header and 409 handling. That code is fine — it's preparation for when the backend endpoint exists. This cleanup just removes the dead helper.

### Option B — Investigate first, change nothing yet

> **Manus task: capture live failure signal from the deployed Mid-Stream**
>
> Goal: confirm whether HITL and downstream-agent UI are actually broken in the live deployment, and if so, what the failure mode is.
>
> 1. Open `https://midstream-kegfdzzz.manus.space/` in a browser
> 2. Navigate to a run that has extraction output (any from `/runs` list)
> 3. Open browser DevTools → Network tab; filter to `XHR/Fetch`
> 4. Click "Run downstream agent" / "HITL Verify" / etc. — every action that was reported as broken
> 5. Capture: request URL, method, request body, response status, response body. Paste them into a new evaluation document.
>
> Once we have actual failure data, the right fix becomes obvious. Without it, we're patching ghosts.
>
> If the network tab shows requests succeeding (200 OK with sensible bodies) but the UI still looks broken, the bug is in render code, not the API layer — different investigation.

**Recommended order:** do Option B first (10 min), then Option A regardless (housekeeping that's safe in isolation).

---

## 7. Other things noticed during the audit

These are observations, not action items. Evidence for thinking about future Manus tasks.

1. **`practiceLibrary` is its own subfolder** under `apiServices/` — separate from `practices.api.ts`. Suggests two slightly different domain models (practice metadata vs library). Worth a closer look if we're going to surface practice-level catalog overrides.
2. **`tcp-runner` exists as a separate agent module** alongside `tcp` — possibly the start of a refactor, possibly two implementations. Worth understanding before extending TCP.
3. **`useHITLState.ts` is 938+ lines** — single hook, lots of state. If we extend HITL, this file is the centerpiece and a candidate for split.
4. **`SnapshotToPrototype` button doesn't exist yet** (we'd add it on `RunDetailPage` per workstream 06). It would call something like:
   ```ts
   POST /api/snapshot-to-prototype  // or hit a GitHub Action webhook directly
   { run_id, transcript_id, note }
   ```
   This needs design — separate plan when we're ready.
5. **No tests visible in api services layer.** `transformExtraction.test.ts` exists in HITL utils but the apiServices files are untested. Adding even 1-2 contract tests against the OpenAPI spec would catch the kind of drift the original report worried about.

---

## 8. Open questions for the user

1. **Do you have a network-tab capture of the actual failing request?** That settles whether anything is really broken vs the report being mistaken.
2. **Manus task format preference** — markdown blocks like §6, or do you want this rewritten as a JIRA-style ticket?
3. **Snapshot-to-prototype button design** — start sketching this, or wait until current Mid-Stream issues are resolved?
