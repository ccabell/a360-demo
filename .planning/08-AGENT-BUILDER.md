# Workstream 08 — Agent Builder & Coaching Manager in Mid-Stream

**Created:** 2026-05-04
**Goal:** Make `https://midstream-kegfdzzz.manus.space/agents` the single place to author, register, configure, and operate every A360 agent — including the Coaching Tool — regardless of whether the agent runs in Prompt Runner, OpenAI's workflow service, the Coaching Tool's RAG stack, or a third-party webhook.

This is the planning doc. **No code changes.** The Mid-Stream side ships through Manus; the Prompt Runner side ships through Claude Code (the repo `ccabell/prompt-runner` is editable here).

---

## 1. The job to be done

A user opens the Agents page and can:

1. **Browse** every registered agent with type / status / data-scope filters
2. **Create** an agent in one of five forms:
   - **Single prompt** — picks a `prompt_template` from Prompt Runner
   - **Prompt pipeline** — chains N templates (like the 2-step extraction; output of step *k* feeds step *k+1*)
   - **OpenAI workflow** — references a workflow ID built in OpenAI's tool, optionally with an API key secret
   - **External webhook** — POSTs to a third-party agent endpoint (any tool that exposes HTTP)
   - **Coaching RAG** — points at the Coaching Tool's RAG endpoint (Gemini-backed)
3. **Define data scope** for each agent:
   - **Global Library:** toggle on/off + select which slices to inject (products, services, concerns, anatomy areas, packages)
   - **Practice Library:** toggle on/off + choose source (real PL database when it exists, or the current service-offerings list as a stand-in)
4. **Test** the agent against a real transcript and see structured output
5. **Sync** external agents (re-fetch their definition / schema from the source tool)
6. **Manage Coaching** — same UI, dedicated section, surfaces the four coaching-related agents (3 in Prompt Runner + 1 RAG in the Coaching Tool) and their prompts together

---

## 2. Today's surface (audit)

### Prompt Runner

`POST /agents` accepts:

```ts
{ name, type, description?, url?, workflow_id? }
```

That's it. No prompt linkage, no library scope, no pipeline definition, no output schema, no sync metadata. The `/run_downstream` endpoint dispatches by `agent.type` but the type vocabulary today is informal ("external", "openai_workflow", and the hard-coded built-in module IDs for cross_sell, opportunities, etc.).

The 7 production agents (`cross_sell_guidance_v3`, `opportunities_agent`, `email_campaign`, `coaching_evidence_extractor`, `coaching_generator`, `coaching_language_validator`, `coaching_pipeline`) are **built-in code paths**, not row-driven. They're registered as agents but their behavior comes from Python in the Prompt Runner repo, not from agent config.

### Mid-Stream

`AgentsPage.tsx` lists agents read-only. No create / edit / delete / test UI. `agentsApi` exposes `list, runDownstream, create, update, delete` but only `list` and `runDownstream` are wired in the UI.

### Coaching Tool

Per the global CLAUDE.md it's a separate app using Gemini 2.5 Flash with RAG. The user's earlier evaluation noted "the coaching agent is unaffected because it calls the internal Manus LLM directly, not the Prompt Runner." So today's coaching surface area is fragmented:

| Component | Location | Model | Type |
|-----------|----------|-------|------|
| `coaching_evidence_extractor` | Prompt Runner | gpt-4o-mini | prompt_template |
| `coaching_generator` | Prompt Runner | gpt-4o-mini | prompt_template |
| `coaching_language_validator` | Prompt Runner | gpt-4o-mini | prompt_template |
| `coaching_pipeline` | Prompt Runner | gpt-4o-mini × 3 | prompt_pipeline (built-in) |
| Aesthetics360 Coach (RAG chat) | Coaching Tool app | Gemini 2.5 Flash | coaching_rag |
| Coaching Report Generator | Coaching Tool app | Gemini 2.5 Flash | external (Manus internal call) |

Six pieces, three runtimes. Right now you'd need three different consoles to manage them.

---

## 3. The data model — Prompt Runner extensions

### Extended `agents` table

```sql
ALTER TABLE agents
  -- Type vocabulary becomes formal
  ALTER COLUMN type TYPE text,
    -- valid values: prompt_template | prompt_pipeline | openai_workflow
    -- | external_webhook | coaching_rag | builtin

  -- Config is type-specific (JSONB)
  ADD COLUMN config jsonb DEFAULT '{}'::jsonb,

  -- Library references
  ADD COLUMN uses_global_library boolean DEFAULT false,
  ADD COLUMN global_library_scope text[] DEFAULT '{}',
    -- e.g. {'gl_products', 'gl_concerns', 'gl_anatomy_areas'}
  ADD COLUMN uses_practice_library boolean DEFAULT false,
  ADD COLUMN practice_library_source text DEFAULT 'none',
    -- 'none' | 'pl_database' | 'service_offerings_legacy'

  -- I/O
  ADD COLUMN output_schema jsonb,

  -- Sync state (for external types)
  ADD COLUMN sync_source text,
  ADD COLUMN last_synced_at timestamptz,
  ADD COLUMN sync_status text DEFAULT 'manual';
    -- 'ok' | 'stale' | 'error' | 'manual'
```

### Per-type `config` shape

```ts
// type: prompt_template
config = {
  template_id: 'uuid',          // FK to prompt_templates
  model_override?: 'claude-haiku-4-5' | 'gpt-4o-mini' | ...,
  temperature_override?: number,
}

// type: prompt_pipeline
config = {
  steps: [
    { template_id: 'uuid', output_var: 'pass_1' },
    { template_id: 'uuid', output_var: 'pass_2', input_vars: ['pass_1'] },
  ],
  final_output_var: 'pass_2',
}

// type: openai_workflow
config = {
  workflow_id: 'wf_xxxx',
  api_key_secret: 'OPENAI_API_KEY',  // env var name
  input_mapping: { transcript: 'input.text', ... },
}

// type: external_webhook
config = {
  url: 'https://example.com/agent',
  method: 'POST',
  auth: { type: 'bearer', secret_env: 'EXAMPLE_TOKEN' },
  request_template: '{"transcript": {{transcript}}, "context": {{context}}}',
  response_path: '$.result',  // JSONPath to extract the result
}

// type: coaching_rag
config = {
  endpoint: 'https://coaching-tool.example.com/rag/query',
  vector_store_id: 'vs_xxxx',
  retrieval_k: 5,
  prompt_template_id?: 'uuid',  // optional final-shaping prompt in Prompt Runner
}

// type: builtin (existing 7 agents)
config = {
  module_id: 'cross_sell_guidance_v3',
}
```

### New + changed endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/agents` | (unchanged contract — gains new fields in response) |
| POST | `/agents` | Accepts the extended fields above |
| PATCH | `/agents/{id}` | Same |
| **POST** | **`/agents/{id}/test_run`** | New — run the agent against a `{ transcript_id }` sample, return output + timing |
| **POST** | **`/agents/{id}/sync`** | New — for openai_workflow / external_webhook / coaching_rag, re-fetch the source definition + update sync_status |
| **GET** | **`/library/global/scopes`** | New — list available GL slice IDs the user can pick (`gl_products`, `gl_services`, etc.) |
| **GET** | **`/library/practice/sources`** | New — list available PL sources (`pl_database`, `service_offerings_legacy`) |

### `/run_downstream` dispatch table extension

Today it routes by `module_id` to a hard-coded handler. The new `/run_downstream` reads `agent.type` first:

```python
def run_downstream(run_id: str, module_id: str, ...):
    agent = get_agent(module_id)
    if agent.type == 'builtin':
        return run_builtin_module(agent.config['module_id'], run_id)
    elif agent.type == 'prompt_template':
        return run_prompt_template(agent, run_id)
    elif agent.type == 'prompt_pipeline':
        return run_prompt_pipeline(agent, run_id)
    elif agent.type == 'openai_workflow':
        return run_openai_workflow(agent, run_id)
    elif agent.type == 'external_webhook':
        return run_external_webhook(agent, run_id)
    elif agent.type == 'coaching_rag':
        return run_coaching_rag(agent, run_id)
```

Each handler injects GL / PL context per `agent.uses_*` and `agent.*_scope` flags before invoking the underlying mechanism.

---

## 4. The UI — Mid-Stream Agents page redesign

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│ Agents                                          [+ New Agent]   │
│                                                                  │
│ [Filter: All | Built-in | Prompts | Pipelines | OpenAI |        │
│         Webhook | Coaching ]    [Search]                        │
├────────────────────────────────────────────────────────────────┤
│ Coaching Hub  ──────────── 4 agents ─────── [Open Hub →]        │
│   - coaching_evidence_extractor (prompt_template)                │
│   - coaching_generator (prompt_template)                         │
│   - coaching_language_validator (prompt_template)                │
│   - aesthetics360_coach (coaching_rag) ↻ synced 2h ago          │
├────────────────────────────────────────────────────────────────┤
│ All Agents                                                      │
│ ┌──────────────────────────┐ ┌──────────────────────────┐       │
│ │ cross_sell_guidance_v3   │ │ opportunities_agent      │       │
│ │ builtin · GL: products   │ │ builtin · GL: services   │       │
│ │ Live · 274 runs          │ │ Live · 271 runs          │       │
│ │ [Edit] [Test] [Run]      │ │ [Edit] [Test] [Run]      │       │
│ └──────────────────────────┘ └──────────────────────────┘       │
│ ...                                                              │
└────────────────────────────────────────────────────────────────┘
```

### Agent editor (modal or `/agents/:id/edit` page)

Five tabs:

#### Tab 1 — Basics
- Name (string)
- Type (radio: Prompt Template, Prompt Pipeline, OpenAI Workflow, External Webhook, Coaching RAG)
- Description (multiline)
- Tags (chips, free-form)

#### Tab 2 — Configuration (type-specific)
- **Prompt Template:** dropdown of `prompt_templates`, optional model override, optional temperature override
- **Prompt Pipeline:** ordered list of steps. Each step row: prompt picker + output variable name + input-variable checkboxes. "Add step" button. Visual line connecting steps.
- **OpenAI Workflow:** workflow_id input, secret name dropdown, input-mapping editor
- **External Webhook:** URL, method, headers, request-body template editor with `{{variable}}` syntax preview, response-path JSONPath
- **Coaching RAG:** endpoint URL, vector store ID, retrieval_k slider (1-20), optional final-shaping prompt picker

#### Tab 3 — Data References
- **Global Library section:**
  - Toggle: "Inject Global Library context"
  - When on: multi-select chips for which slices to inject
    - `gl_products` (371 rows)
    - `gl_services` (126 rows)
    - `gl_concerns` (28 rows)
    - `gl_anatomy_areas` (23 rows)
    - `gl_packages`
    - `gl_*_content` (education content)
  - Counts pulled live from Supabase so the user sees actual scope size
- **Practice Library section:**
  - Toggle: "Inject Practice Library context"
  - When on: source dropdown
    - "Practice Library database" (placeholder — lit up when the table exists)
    - "Current service offerings list" (legacy default for now — works today)
  - Note: per the user's spec, PL is provisional. The toggle works regardless of which backing exists; the dispatcher in Prompt Runner picks the right source.

#### Tab 4 — Output Schema
- JSON Schema editor (CodeMirror or Monaco textarea)
- Pre-fill from prompt template's `output_schema` if Type = Prompt Template
- Visual schema preview (key list + type per key)
- "Validate sample output" button — paste JSON, see schema-compliance result

#### Tab 5 — Test & Sync
- **Test panel:**
  - Pick a transcript from the practice (or one of 122 historical)
  - Click "Run agent" → spinner → output panel with elapsed time, tokens, cost estimate
- **Sync panel** (for openai_workflow / external_webhook / coaching_rag):
  - Last synced timestamp + status pill
  - "Sync now" button — fetches current definition from source tool
  - Diff view if a sync changes the input/output schema
- **Activity log** — last N test runs and production invocations against this agent

---

## 5. Coaching Hub — special case

A dedicated section at the top of the Agents page that surfaces:

| Surface | Purpose | Lives in |
|---------|---------|----------|
| coaching_evidence_extractor | extract LAER, behaviors, KPI scores | Prompt Runner |
| coaching_generator | turn evidence into principle-based feedback | Prompt Runner |
| coaching_language_validator | enforce coaching language policy | Prompt Runner |
| coaching_pipeline | one-shot wrapper of the three above | Prompt Runner |
| aesthetics360_coach (RAG chat) | conversational coach grounded in practice transcripts | Coaching Tool app |
| coaching_report_generator | multi-week report | Coaching Tool app |

The Coaching Hub aggregates these into a single editable surface:
- Edit any coaching prompt without leaving Agents
- Adjust the RAG retrieval_k for the chat agent
- Run any of them against a sample transcript
- See cumulative coaching usage stats (calls / week, error rates)

The Coaching Hub is just a filtered view of the Agents page with `tag = "coaching"` plus a few hub-specific aggregations. The right-hand pane offers the same Tab 1–5 editor.

**Connecting the Coaching Tool:** register `aesthetics360_coach` and `coaching_report_generator` as `coaching_rag` and `external_webhook` agents in Prompt Runner. The Coaching Tool's actual RAG infrastructure stays where it is — Prompt Runner just dispatches to its endpoint. This is the cheapest way to bring it under one roof.

---

## 6. Build phasing

This is multi-PR work. Suggested order:

| Phase | Backend (Prompt Runner — Claude Code) | Frontend (Mid-Stream — Manus) | PR pattern |
|-------|---------------------------------------|-------------------------------|------------|
| **0** | Snapshot current behavior + add unit tests for the 7 built-in agents | None | One Claude PR — locks regression behavior |
| **1** | Migrate `agents` table to the new schema; backfill existing rows as `type=builtin`; gain `config` JSONB | Update Mid-Stream `Agent` type and `agents.api.ts` to include the new fields; the AgentsPage gains type pills and shows the data-scope chips | One Claude PR (backend) + one Manus task |
| **2** | New endpoints: `POST /agents/{id}/test_run`, `GET /library/global/scopes`, `GET /library/practice/sources` | New Agent editor with Tabs 1, 3, 5 (Basics, Data References, Test). No pipeline builder yet. CRUD wired. | One Claude PR + one Manus task |
| **3** | Implement `prompt_template` and `prompt_pipeline` dispatch in `/run_downstream` | Pipeline builder UI in Tab 2. Output-schema viewer in Tab 4. | One Claude PR + one Manus task |
| **4** | Implement `external_webhook` and `openai_workflow` dispatch | Type-specific config editors for those two types in Tab 2. `POST /agents/{id}/sync` button. | One Claude PR + one Manus task |
| **5** | Implement `coaching_rag` dispatch + register the Coaching Tool's RAG endpoint as a `coaching_rag` agent | Coaching Hub section at top of AgentsPage; tag-based filter | One Claude PR + one Manus task |

**Phase 0 is mandatory before any of the others.** Without regression tests on the existing built-in handlers, type-routing changes will silently break production.

Total: 5 paired PRs. Each is small (~300-600 lines of changes per side). Ship-able incrementally.

---

## 7. Manus-ready instructions — Phase 1 (when ready)

> **Manus task: extend Mid-Stream Agent type and surface new fields on the AgentsPage**
>
> Wait for the Prompt Runner Phase-1 PR to ship before pasting this into Manus. Once the backend `/agents` response includes the new fields, do this:
>
> 1. **Update the `Agent` interface** in `src/apiServices/types.ts` (currently lines 73–80) to add:
>    ```ts
>    export interface Agent {
>      id: string;
>      name: string;
>      type:
>        | 'prompt_template'
>        | 'prompt_pipeline'
>        | 'openai_workflow'
>        | 'external_webhook'
>        | 'coaching_rag'
>        | 'builtin';
>      description?: string;
>      url?: string;
>      workflow_id?: string;
>      // New in Phase 1
>      config?: Record<string, unknown>;
>      uses_global_library?: boolean;
>      global_library_scope?: string[];
>      uses_practice_library?: boolean;
>      practice_library_source?: 'none' | 'pl_database' | 'service_offerings_legacy';
>      output_schema?: Record<string, unknown>;
>      sync_source?: string;
>      last_synced_at?: string;
>      sync_status?: 'ok' | 'stale' | 'error' | 'manual';
>      tags?: string[];
>    }
>    ```
>
> 2. **In `src/pages/AgentsPage.tsx`**, the existing card renders `<Chip label={agent.type}>` and `<Chip label={agent.id}>`. Replace the `agent.type` chip with a more informative type pill. Add a row underneath showing data-scope:
>    ```tsx
>    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
>      <TypeChip type={agent.type} />
>      {agent.uses_global_library && <Chip size="small" icon={<DatasetIcon/>} label={`GL: ${(agent.global_library_scope ?? []).length} slices`} />}
>      {agent.uses_practice_library && <Chip size="small" icon={<StorefrontIcon/>} label={`PL: ${agent.practice_library_source}`} />}
>      {agent.sync_status === 'stale' && <Chip size="small" color="warning" label="Stale — sync needed" />}
>    </Box>
>    ```
>
> 3. **Create `src/components/agents/TypeChip.tsx`** — small component that maps each of the 6 type values to a color + label. Match the existing color palette in `theme/`.
>
> 4. **Add type filter** above the agent grid:
>    ```tsx
>    <ToggleButtonGroup value={typeFilter} onChange={(_, v) => setTypeFilter(v)}>
>      <ToggleButton value="all">All</ToggleButton>
>      <ToggleButton value="builtin">Built-in</ToggleButton>
>      <ToggleButton value="prompt_template">Prompts</ToggleButton>
>      <ToggleButton value="prompt_pipeline">Pipelines</ToggleButton>
>      <ToggleButton value="openai_workflow">OpenAI</ToggleButton>
>      <ToggleButton value="external_webhook">Webhook</ToggleButton>
>      <ToggleButton value="coaching_rag">Coaching</ToggleButton>
>    </ToggleButtonGroup>
>    ```
>
> 5. **No new API calls in Phase 1.** The list endpoint just returns more fields on the existing response. Test by hitting `https://prompt-runner-production.up.railway.app/agents` after the backend PR ships and confirming the new fields are populated.
>
> Reason: Phase 1 makes the data layer expressive without changing any user-facing flows. The Agent editor lands in Phase 2 — this is preparation.

The Phase 2 / 3 / 4 / 5 Manus instructions will be drafted when those phases land. Each will get its own dedicated section here as the implementation progresses.

---

## 8. The Prompt Runner side — Claude Code can ship this directly

The Prompt Runner repo (`ccabell/prompt-runner` at `C:\Projects\Prompts`) is editable in Claude Code. Phases 0, 1, 2 backend work are doable here:

| Phase 0 (testing) | Phase 1 (schema) | Phase 2 (endpoints) |
|-------------------|------------------|---------------------|
| Add `tests/test_downstream_dispatch.py` covering the 7 built-in agents end-to-end against real fixtures | Alembic migration: extend `agents` table per §3; backfill existing rows as `type=builtin` with `config={'module_id': agent.id}` | New endpoints: `/agents/{id}/test_run`, `/agents/{id}/sync`, `/library/global/scopes`, `/library/practice/sources`. Update OpenAPI / pydantic models. Tests for each. |

Want me to kick off Phase 0 (regression tests against the current built-in agents) right now? It's a low-risk Claude Code task that locks the existing behavior before any schema work. The output is a new test suite committed to `ccabell/prompt-runner`, no dispatch code touched.

---

## 9. Open questions for the user

1. **Practice Library: real schema or just keep using service offerings?** You said it's a placeholder. Want me to draft the actual `pl_*` schema (mirror of GL minus pricing, fewer products) as a separate plan? It would unblock the PL toggle's "real source" option later.
2. **OpenAI workflows — which auth model?** Per-agent API key in env var, or a single shared key? The latter is simpler; the former lets different practices BYOK.
3. **External webhook security.** Outbound to third-party URLs needs allow-listing or signing. Want me to design that in the plan, or treat as a Phase-4 detail?
4. **Coaching Tool sync — is the Coaching Tool repo accessible from Claude Code?** If not, registering `aesthetics360_coach` as a `coaching_rag` agent requires the Coaching Tool team to expose a stable HTTP endpoint we can configure here.
5. **Test runs: cost cap?** Each test run hits a real model. Should we rate-limit / cap them per user per day to avoid expensive accidents?

---

## 10. What this gets you when shipped

- One console for every agent regardless of where it runs
- Authoring path for new agents that doesn't require a code change in Prompt Runner (for prompt-template and external types — built-in still needs Python)
- Honest separation between agent definition and runtime, which means the dispatcher can be tested independently
- Coaching unified in one place across three different runtimes
- Library-reference flags become first-class data — every agent's data scope is queryable, auditable, and visible in the UI
- Sync mechanism that keeps OpenAI / external agents from silently drifting

The Agents page becomes the most-used screen in Mid-Stream because it's where you manage the platform's actual capability surface.
