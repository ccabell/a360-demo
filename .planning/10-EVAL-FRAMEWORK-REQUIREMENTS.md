# Evaluation Framework — Requirements (Real, Functional, Manus + Claude-Code split)

**Date:** 2026-05-04
**Audience:** Claude Code (Prompt Runner backend) and Manus (Mid-Stream UI)
**Goal:** Replace the placeholder Mid-Stream `/eval-tester` page with a working LLM-as-judge evaluation suite that drives the real DeepEval pipeline already in Prompt Runner. The user can author rubrics, batch-evaluate agents, track improvement over time, and compare prompt versions.

---

## 0. Audit findings — read these first

### 0.1 An LLM-as-judge engine already exists

`C:\Projects\Prompts\prompt_runner/` contains 1,636 lines of working evaluation code:

| File | Lines | Role |
|------|-------|------|
| `prompt_runner/evaluation.py` | 612 | DeepEval `GEval` runner. 3 rubrics: Accuracy, Completeness, Evidence Quality. `evaluate_single_run`, `evaluate_batch`, `run_comparison_evaluation`, `generate_evaluation_report`. |
| `prompt_runner/full_evaluation.py` | 548 | Resumable pipeline orchestrator: extract → evaluate → batch tracking. Handles rate limits, ETA. Tracks state in `ie_eval_batches`. |
| `prompt_runner/scripts/evaluate_extractions.py` | 476 | Deterministic (non-LLM) eval — schema compliance, evidence coverage, field population. Generates the `eval_report_*.json` files we already render in the prototype. |
| `prompt_runner/cli.py` | (relevant lines 88–250) | CLI commands: `_eval`, `_eval_compare`, `_eval_report`, `_full_eval`. |

Persistence:
- `ie_eval_results` Supabase table — per-run scores
- `ie_eval_batches` Supabase table — batch metadata + progress

Judge model: GPT-4o by default; Claude 3.5 Sonnet alternate (Anthropic API direct, not via Bedrock for the judge).

### 0.2 What's missing today

| Component | Status | Why it blocks the user |
|-----------|--------|------------------------|
| HTTP API exposure | ❌ Not present in OpenAPI spec | Mid-Stream can't call the engine |
| Mid-Stream `/eval-tester` UI | Exists at `https://midstream-kegfdzzz.manus.space/eval-tester` but **not in the local repo** | Likely a Manus-built placeholder; can't be evaluated from Claude Code |
| Custom rubric authoring | ❌ Rubrics are hardcoded constants in `evaluation.py` | User can't define their own criteria |
| Trend tracking | ❌ No views | User can't see "is v3.3 better than v3.2?" |
| Eval-test on demand from UI | ❌ CLI only | Users can't run from a button |

### 0.3 The `C:\Projects\Accuracy` directory

Despite the name and CLAUDE.md description ("LLM-as-Judge research"), the directory contains GL enrichment / pharma PDF extraction work — not eval pipeline code. It does contain one valuable doc:

- `AI Review_ What Was Built & LLM-as-Judge Pipeline Recommendations.md` — already recommends DeepEval. This recommendation has already been acted on; the engine in Prompts uses DeepEval.

`phase0_baseline.py` is a completeness-scoring script for GL products (different scope — product-data quality, not agent quality). Useful for GL maintenance but not what we're building here.

### 0.4 The Mid-Stream eval-tester page

Per Manus deployment URL, it exists. Per `C:\Users\Chris\repos\Mid_Stream/src/pages` listing, it doesn't. Means it was built directly in Manus and not synced to GitHub, or it's a thin placeholder. Either way, treat the existing page as a wireframe and rebuild against this spec.

---

## 1. Goals (the real, functional asks)

- **G1.** A user can pick an agent (or a prompt set) + a transcript set + a judge model + a rubric, click "Run Evaluation", and get scored results in <5 minutes for a 50-transcript batch.
- **G2.** Scores are real (DeepEval `GEval` calls to a judge model), not heuristic. Each score has a written explanation from the judge.
- **G3.** A user can author and save custom rubrics (name + criteria text + scale + threshold + which fields to evaluate). Rubrics show up in the trigger UI.
- **G4.** The user can see how scores trend across prompt versions, agents, judge models. "Is v3.3 better than v3.2?" gets a one-glance answer.
- **G5.** Two batches can be compared side-by-side. Per-rubric deltas, regressions flagged.
- **G6.** Results are auditable — every score links back to the judge's reasoning, the run output that was scored, and the transcript.
- **G7.** The system survives PHI scrutiny: judge calls go through the same approved providers we already use; results stored in our own Supabase.

---

## 2. Recommendation: extend DeepEval, don't switch tools

The user asked: should we use a third-party tool?

| Tool | Verdict | Why |
|------|---------|-----|
| **DeepEval (already in use)** | **Keep** | The engine works, the rubrics exist, the persistence layer exists. Migrating away would throw out 1,636 lines of working code. |
| Confident AI (DeepEval hosted UI) | Optional add-on | Same project; could plug in their hosted dashboard later if a hosted UI becomes valuable. Zero code change to engine. |
| Braintrust | No | Excellent UX but means a full migration; commercial pricing; we'd lose control of where data lives. |
| Langfuse | No (for now) | Stronger as observability than as evals; free self-hosted is appealing but adds infra. |
| LangSmith | No | Tied to LangChain; we're not on LangChain. |
| Promptfoo | No | CLI-first; we already have a CLI. |
| Humanloop | No | Prompt-management focused; redundant with our prompt management plan (workstream 09). |

**Decision:** keep DeepEval as the engine. Build the API + UI we're missing. Re-evaluate hosted dashboards once the homegrown UI hits scale limits.

---

## 3. Data model

### 3.1 Existing tables (keep)

- `ie_eval_results` — per-run score rows. Add columns where noted in §3.3.
- `ie_eval_batches` — batch progress tracking.

### 3.2 New table — `ie_eval_rubrics`

User-authored evaluation criteria.

```sql
CREATE TABLE ie_eval_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  criteria_text TEXT NOT NULL,        -- the rubric the judge sees
  scale_min NUMERIC DEFAULT 1,
  scale_max NUMERIC DEFAULT 10,
  threshold NUMERIC DEFAULT 0.7,       -- DeepEval score threshold (0.0-1.0)
  evaluation_params TEXT[] DEFAULT ARRAY['INPUT','ACTUAL_OUTPUT'],
                                       -- which DeepEval params the judge sees
  default_judge_model TEXT DEFAULT 'gpt-4o',
  is_builtin BOOLEAN DEFAULT FALSE,    -- the 3 hardcoded rubrics get rows with this true
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Optional scoping
  applies_to_agent_types TEXT[],       -- e.g., ARRAY['prompt_template','prompt_pipeline']
  applies_to_agent_ids UUID[]          -- for rubrics tied to specific agents
);
```

Backfill: on migration, insert 3 rows for `Extraction Accuracy`, `Extraction Completeness`, `Evidence Quality` with `is_builtin = true` and `criteria_text` taken verbatim from the constants in `evaluation.py`. The Python code reads from this table going forward.

### 3.3 Extend `ie_eval_results`

```sql
ALTER TABLE ie_eval_results
  ADD COLUMN rubric_id UUID REFERENCES ie_eval_rubrics(id),
  ADD COLUMN judge_model TEXT,
  ADD COLUMN judge_reasoning TEXT,
  ADD COLUMN agent_id UUID REFERENCES agents(id),
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN evaluated_at TIMESTAMPTZ DEFAULT NOW();
```

### 3.4 New table — `ie_eval_comparisons`

Saved batch-vs-batch comparisons.

```sql
CREATE TABLE ie_eval_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  batch_a_id UUID REFERENCES ie_eval_batches(batch_id),
  batch_b_id UUID REFERENCES ie_eval_batches(batch_id),
  comparison_summary JSONB,             -- per-rubric deltas, regressions
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. Backend — Prompt Runner API surface (Claude Code work)

### 4.1 New endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/eval/rubrics` | List rubrics (built-in + custom) |
| POST | `/eval/rubrics` | Create custom rubric |
| GET | `/eval/rubrics/{id}` | Single rubric detail |
| PATCH | `/eval/rubrics/{id}` | Update (built-ins read-only) |
| DELETE | `/eval/rubrics/{id}` | Delete (built-ins protected) |
| POST | `/eval/runs` | Evaluate a single run. Body: `{ run_id, rubric_ids[], judge_model? }`. Returns `eval_result_id`. Synchronous; for batch use `/eval/batches`. |
| POST | `/eval/batches` | Start a batch. Body: `{ name, transcript_ids? OR run_ids? OR filter, agent_id? OR prompt_set_id?, rubric_ids[], judge_model }`. Returns `{ batch_id, status: 'running' }`. Backed by `full_evaluation.py`. |
| GET | `/eval/batches/{batch_id}` | Batch status + aggregate scores |
| GET | `/eval/batches/{batch_id}/results` | Per-run results in batch (paginated) |
| POST | `/eval/batches/{batch_id}/cancel` | Cancel a running batch |
| GET | `/eval/runs/{run_id}/history` | Eval history for a run (multiple evaluations over time) |
| POST | `/eval/comparisons` | Compare two batches; saved row in `ie_eval_comparisons` |
| GET | `/eval/comparisons/{id}` | Saved comparison |
| GET | `/eval/trends` | Trend data; query params: `agent_id`, `prompt_version`, `judge_model`, `rubric_id`, `from_date`, `to_date`. Returns time series of avg scores. |

### 4.2 Implementation notes for the Prompt Runner team

- Wrap existing `evaluate_single_run`, `evaluate_batch`, `run_comparison_evaluation`, `generate_evaluation_report` as the handlers.
- Move the 3 hardcoded rubrics in `evaluation.py` into seed rows in `ie_eval_rubrics`. The function should fetch from DB rather than reading constants. This is the single largest refactor required.
- `/eval/batches` runs async — kick off a background worker (Railway supports background tasks via APScheduler or a simple thread). Don't block the request.
- Pagination on results: default `limit=50`, accept `offset`.
- All responses include `judge_model`, `rubric_id`, `evaluated_at` so the UI can display scoring metadata.
- Add a feature flag `EVAL_ENABLED` so the pipeline can be turned off in case of judge-API costs spiraling.

### 4.3 OpenAPI

Update the OpenAPI spec to expose all 13 endpoints with full schemas. The Mid-Stream `eval.api.ts` (REQ-19 below) generates from the spec.

### 4.4 Claude Code phasing

| PR | What |
|----|------|
| **B-1** | Migrations: `ie_eval_rubrics`, `ie_eval_comparisons`, `ie_eval_results` columns. Seed 3 built-in rubrics. |
| **B-2** | Refactor `evaluation.py` to fetch rubrics from DB instead of hardcoded constants. No behavior change. Tests cover the refactor. |
| **B-3** | Add CRUD endpoints for `/eval/rubrics`. |
| **B-4** | Add `/eval/runs` (synchronous single-run). |
| **B-5** | Add `/eval/batches` (async batch + status + results endpoints). Background worker plumbing. |
| **B-6** | Add `/eval/comparisons` and `/eval/trends`. |

Each PR ships small (~150-400 lines including tests). B-1 + B-2 first; the others can land in parallel.

---

## 5. Frontend — Mid-Stream UI (Manus work)

### 5.1 Page name and route

Replace `/eval-tester` with **Eval Lab** at `/evals`. The old route redirects to `/evals/run`.

Eval Lab is a sibling page to Agent Manager — both are top-level entries in Mid-Stream's nav.

### 5.2 Tab structure

```
Mid-Stream › Eval Lab

[Tab: Run] [Tab: Rubrics] [Tab: Trends] [Tab: Compare]
```

### 5.3 Tab — Run (default)

#### 5.3.1 Trigger panel
- **Target picker** (radio):
  - "Run against existing extraction outputs" — pick by agent_id and/or transcript_id filters
  - "Run new extractions then evaluate" — pick a prompt_set_id, transcript filter, kicks off `/extraction/run` then `/eval/batches`
- **Transcript filter** — multi-select from `GET /transcripts` (122 today). Power-filters: by practice, by consult_type, by run_id with no eval yet, custom range
- **Rubric picker** — multi-select chips of available rubrics from `GET /eval/rubrics`. "Run all 3 built-ins" preset button.
- **Judge model dropdown** — `gpt-4o` (default), `claude-3-5-sonnet`, `gpt-4o-mini` (cheap baseline)
- **Batch name** — text, defaults to `eval_<datetime>`
- **Cost preview** — based on chosen judge model, transcript count, rubric count: estimated tokens × judge price = `$X.XX`
- **Run** button

#### 5.3.2 Active batches list
- Below the trigger panel, list batches in `running` status with progress bar, ETA, cancel button.

#### 5.3.3 Recent batches
- Below active, list completed batches with summary scores. Click → batch detail view.

### 5.4 Batch detail view (`/evals/batches/:id`)

```
┌────────────────────────────────────────────────────────────────┐
│ Batch: eval_v32_haiku45_20260504  ·  ✓ complete  ·  2.4 min    │
├────────────────────────────────────────────────────────────────┤
│ Aggregate (49 runs)                                              │
│ Accuracy:    [████████░░] 8.2/10   Completeness:  7.9/10        │
│ Evidence:    [█████████░] 9.1/10   Custom-A:      6.5/10        │
│ Cost: $4.21  Judge: gpt-4o  Prompt: 2step_v32                   │
├────────────────────────────────────────────────────────────────┤
│ Per-run table (sortable, click to drill in)                      │
│ run_id   transcript     accuracy compl  evidence  custom-A      │
│ 3e52a17… 77d852dd…     8.5      8.1   9.4       7.0           │
│ 81462d9… 67de7833…     7.2      6.8   8.7       5.2           │
│ ...                                                              │
├────────────────────────────────────────────────────────────────┤
│ Worst-performing fields (auto-flagged)                           │
│ - Evidence quality on objections: 5.4 avg across 12 runs        │
│ - Completeness on hesitations: 6.1 avg across 8 runs            │
└────────────────────────────────────────────────────────────────┘
```

Each per-run row drills into a **run eval detail** page:
- Run output (extraction JSON viewer)
- Per-rubric: score + judge's full reasoning + worst fields list
- "Re-run with different judge" button
- Link back to the original run on `/runs/:id`

### 5.5 Tab — Rubrics

#### 5.5.1 List view
Card grid: name, scale, threshold, judge model default, applies-to scope.

#### 5.5.2 Editor (modal or `/evals/rubrics/:id/edit`)
- **Name** (required, unique)
- **Description** (multiline)
- **Criteria text** (large textarea, monospace) — the prompt the judge sees. Live preview pane on the right shows how it'll be rendered into a DeepEval `GEval` call.
- **Scale min/max** (numeric, default 1/10)
- **Threshold** (slider 0–1, default 0.7)
- **Evaluation params** (multi-select):
  - INPUT (the transcript)
  - ACTUAL_OUTPUT (the extraction)
  - RETRIEVAL_CONTEXT (the transcript again for grounding)
  - EXPECTED_OUTPUT (if user provides ground truth)
- **Default judge model** (dropdown)
- **Applies to** (optional):
  - Agent types (multi-select chips)
  - Specific agents (autocomplete)
- **Test rubric** button — paste a sample run output, score with the rubric, see judge reasoning. Useful to sanity-check the criteria text before saving.

Built-in rubrics show as read-only with a "Clone" button.

### 5.6 Tab — Trends

Time-series charts for tracking improvement.

```
Filter: [Agent ▾] [Prompt version ▾] [Rubric ▾] [Judge ▾] [Date range ▾]

Chart 1: Accuracy score over time
  | 9.0 ─────────────────────────────────────╮
  | 8.0    ●        ●     ●   ●●●●●●●         │
  | 7.0  ●    ●  ●           ●            ●   │
  | 6.0                                       │
  +───v3.0───v3.1───v3.2───v3.2.1───v3.3──────┘

Chart 2: Score distribution per rubric (boxplot)
Chart 3: Judge agreement matrix (when GPT-4o vs Claude both ran on the same batch)
```

Backed by `GET /eval/trends`. Re-renders on filter change.

**Regression alert banner** at top: if the most recent batch shows any rubric below the prior batch's score by ≥ 0.5, show a yellow warning with a "View comparison" button.

### 5.7 Tab — Compare

#### 5.7.1 Picker
Two-batch picker: select Batch A and Batch B from completed batches.

#### 5.7.2 Comparison view
Side-by-side:
- Per-rubric deltas (Batch B – Batch A) with color (green up, red down)
- Per-run scatter plot — if the same transcript appears in both, plot A vs B scores
- "Regressions" panel — runs where Batch B scored worse than Batch A on any rubric, sorted by delta size
- "Improvements" panel — same in reverse
- "Save comparison" button → persists via `POST /eval/comparisons`

### 5.8 API service file in Mid-Stream

`src/apiServices/eval.api.ts`:

```ts
export interface EvalRubric { /* maps to ie_eval_rubrics row */ }
export interface EvalBatch { /* maps to ie_eval_batches */ }
export interface EvalResult { /* maps to ie_eval_results */ }
export interface EvalComparison { /* maps to ie_eval_comparisons */ }

export const evalApi = {
  rubrics: {
    list: () => client.get<{data:EvalRubric[]}>('/eval/rubrics').then(r=>r.data.data),
    get: (id:string) => client.get<EvalRubric>(`/eval/rubrics/${id}`).then(r=>r.data),
    create: (body:Partial<EvalRubric>) => client.post<EvalRubric>('/eval/rubrics', body).then(r=>r.data),
    update: (id:string, body:Partial<EvalRubric>) => client.patch<EvalRubric>(`/eval/rubrics/${id}`, body).then(r=>r.data),
    remove: (id:string) => client.delete(`/eval/rubrics/${id}`).then(r=>r.data),
  },
  batches: {
    start: (body: StartBatchPayload) => client.post<EvalBatch>('/eval/batches', body).then(r=>r.data),
    get:   (id:string) => client.get<EvalBatch>(`/eval/batches/${id}`).then(r=>r.data),
    results: (id:string, params?:{limit?:number;offset?:number}) =>
      client.get<{data:EvalResult[];total:number}>(`/eval/batches/${id}/results`, {params}).then(r=>r.data),
    cancel: (id:string) => client.post(`/eval/batches/${id}/cancel`).then(r=>r.data),
    list:   (params?:{status?:string;limit?:number}) =>
      client.get<{data:EvalBatch[]}>('/eval/batches', {params}).then(r=>r.data.data),
  },
  runs: {
    evaluate: (body:{run_id:string; rubric_ids:string[]; judge_model?:string}) =>
      client.post<EvalResult>('/eval/runs', body).then(r=>r.data),
    history:  (run_id:string) =>
      client.get<{data:EvalResult[]}>(`/eval/runs/${run_id}/history`).then(r=>r.data.data),
  },
  comparisons: {
    create: (body:{name:string; batch_a_id:string; batch_b_id:string}) =>
      client.post<EvalComparison>('/eval/comparisons', body).then(r=>r.data),
    get:    (id:string) => client.get<EvalComparison>(`/eval/comparisons/${id}`).then(r=>r.data),
  },
  trends: (params:TrendsQuery) =>
    client.get<TrendPoint[]>('/eval/trends', {params}).then(r=>r.data),
};
```

### 5.9 Routing changes

- Add `/evals` route → Eval Lab Run tab
- Add `/evals/rubrics`, `/evals/rubrics/:id/edit`, `/evals/batches/:id`, `/evals/runs/:run_id`, `/evals/compare`, `/evals/comparisons/:id`
- Redirect old `/eval-tester` route (and any nav links) to `/evals`
- Delete the existing eval-tester page once the new one is up

---

## 6. Manus-ready instructions (Phase-1 UI deliverable)

Manus implements REQ-1 through REQ-7 below as a single PR. Backend can land in parallel — the UI degrades gracefully if endpoints aren't there yet (shows "API unavailable" state instead of failing).

> **Manus task: build Eval Lab in Mid-Stream**

> **REQ-1.** Create `src/apiServices/eval.api.ts` with the structure shown in §5.8. All methods just call the corresponding `/eval/*` endpoints — no business logic in the API service.

> **REQ-2.** Create `src/pages/EvalLab/` with these files:
>   - `EvalLab.tsx` — top-level page with tab nav. Reads `?tab=` query param.
>   - `tabs/RunTab.tsx` — the trigger panel + active/recent batches list per §5.3
>   - `tabs/RubricsTab.tsx` — list + editor per §5.5
>   - `tabs/TrendsTab.tsx` — charts per §5.6 (use `@mui/x-charts` which is already in package.json)
>   - `tabs/CompareTab.tsx` — comparison view per §5.7
>   - `BatchDetail.tsx` — drill-in at `/evals/batches/:id`
>   - `RunEvalDetail.tsx` — drill-in at `/evals/runs/:run_id`
>   - `RubricEditor.tsx` — modal/page for editing a rubric per §5.5.2

> **REQ-3.** Add Eval Lab to the Mid-Stream nav. Put it next to Agent Manager.

> **REQ-4.** Replace any existing `/eval-tester` route with a redirect to `/evals`. Delete the existing eval-tester page files entirely. Search the codebase for "eval-tester" / "EvalTester" and remove all references.

> **REQ-5.** State management — one Zustand store: `evalLab.store.ts`. Holds: active batches (polled every 5s while any are running), selected rubric drafts, current filters on the Trends tab. Use existing patterns from `tcpBuilder.store.ts` etc.

> **REQ-6.** Empty / error states — when the backend `/eval/*` endpoints are not yet deployed (404), show a banner: "Evaluation backend not available — see workstream-10 backend phasing in `.planning/`. Front-end build is complete and will activate when endpoints land." Don't crash.

> **REQ-7.** Cost preview math (§5.3.1). Hardcode a small price-per-token table in `src/constants/judgeCosts.ts`:
> ```ts
> export const JUDGE_COSTS_PER_M_TOKENS = {
>   'gpt-4o':              { input: 2.50, output: 10.00 },
>   'gpt-4o-mini':         { input: 0.15, output: 0.60 },
>   'claude-3-5-sonnet':   { input: 3.00, output: 15.00 },
> };
> ```
> Estimate tokens at: transcript_count × ~4000 input + ~500 output × rubric_count. Multiply by price. Show as "≈ $X.XX (estimate)".

### Acceptance criteria for the Manus PR

- [ ] `/evals` route renders, four tabs visible
- [ ] Run tab: trigger form is filled in, but the Run button shows the "API unavailable" banner if endpoints don't exist yet
- [ ] Rubrics tab: list view renders (will show empty state until rubrics endpoint exists)
- [ ] Trends tab: empty chart area + filter row
- [ ] Compare tab: batch picker stub
- [ ] Old `/eval-tester` redirected; old page files deleted
- [ ] No console errors on tab switching
- [ ] Cost preview calculator works with mock inputs
- [ ] No reference to the deleted eval-tester page anywhere in src/

---

## 7. The story over time

Once both halves ship, here's the user flow that didn't exist before:

1. User opens Eval Lab → Rubrics → Clone "Extraction Accuracy"
2. Edits the criteria text to add a new field they care about ("how well did the agent identify the patient's primary concern?")
3. Saves as "Accuracy v2 — Concern Focus"
4. Goes to Run tab → picks 50 transcripts, picks the new rubric, picks GPT-4o judge, hits Run
5. Watches the progress bar; gets a Slack/email when it finishes (Phase 5+)
6. Drills into a low-scoring run, reads the judge's reasoning, decides whether to fix the prompt or retrain
7. Edits the agent's prompt template (in Agent Manager), runs the same 50-transcript batch with the new prompt
8. Goes to Compare tab → picks the two batches → sees +0.8 average score on the new rubric
9. Saves the comparison; ships the prompt change

That's a real test suite. Real LLM-as-judge. Real improvement tracking.

---

## 8. Phasing summary

| Phase | Backend (Claude Code) | Frontend (Manus) | When user can…  |
|-------|----------------------|------------------|------------------|
| 1 | B-1, B-2 (migrations + rubric refactor) | REQ-1 to REQ-7 (UI scaffolding) | …see the new pages, but Run/Trends/Compare are "API unavailable" |
| 2 | B-3 (`/eval/rubrics` CRUD) | — | …author and save custom rubrics |
| 3 | B-4 (`/eval/runs`) | — | …evaluate a single run from a button |
| 4 | B-5 (`/eval/batches`) | — | …kick off batch evals from the UI |
| 5 | B-6 (`/eval/comparisons`, `/eval/trends`) | — | …compare batches and see trends |

Phase 1 unblocks both teams to work in parallel. Phases 2–5 each ship a backend PR that immediately lights up an existing UI surface.

---

## 9. Open questions for the user

1. **Judge cost ceiling.** A 50-transcript batch with 3 rubrics × GPT-4o ≈ $5–8. Worth a per-day or per-batch cap? Recommended: $50/day default, configurable.
2. **Slack / email notifications when batch completes** — useful but adds infra. In or out of scope?
3. **Ground truth / EXPECTED_OUTPUT.** Some rubrics work better when the user can supply an expected answer (e.g., HITL-corrected output as ground truth for accuracy). Want this in Phase 1 or later?
4. **Built-in rubrics: keep all 3, or rationalize?** The 3 hardcoded ones (Accuracy, Completeness, Evidence Quality) are the minimum. Worth adding a 4th for "Pricing/Commercial" since the eval reports already show that's the weakest field today (`pricing_approach_pct: 0%`).
5. **PHI in judge prompts.** GPT-4o is OpenAI direct, not Bedrock. We're already passing transcripts to it via `evaluation.py`. Confirm this is acceptable, or restrict to Bedrock-only judges?
6. **Migration plan for the eval-tester page.** What does it currently show? If it has any in-flight state Manus has built, we should preserve test cases / mock fixtures even if we delete the page.

---

## 10. Document map

This requirements doc lives at `.planning/10-EVAL-FRAMEWORK-REQUIREMENTS.md` in the a360-demo repo (PR #3). It pairs with:

- `.planning/08-AGENT-BUILDER.md` — agent management architecture (related, not blocked-on)
- `.planning/09-AGENT-MANAGER-MANUS-REQUIREMENTS.md` — agent UI (Mid-Stream Agent Manager)
- This doc (10) — eval framework

Together: 9 specifies *what* an agent is; 10 specifies *how to grade* whether it's any good.
