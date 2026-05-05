# Mid-Stream Agent Manager — Requirements (Manus-ready spec)

**Date:** 2026-05-04
**Audience:** Manus AI implementing in `https://github.com/ccabell/Mid_Stream`
**Companion docs (background, do not need to read):** `08-AGENT-BUILDER.md` (architectural rationale), `07-MIDSTREAM-EVALUATION.md` (existing-code audit)

This document is a self-contained specification. Manus should be able to implement the full Phase-1 deliverable from this doc alone. Backend work in Prompt Runner is called out separately for Claude Code to handle.

---

## 0. Critical configuration finding (read first)

The current Mid-Stream codebase points at the wrong Supabase project.

| File | Current value | Canonical A360 value |
|------|--------------|----------------------|
| `src/config/supabase.ts` line 8 | `https://gjqicqldjgvrwmtkliie.supabase.co` | `https://wvpgmawrizwkmvfnwqfl.supabase.co` |
| `src/config/supabase.ts` `SUPABASE_TABLES` | `products`, `services`, `categories`, `manufacturers`, `service_types`, `practice_products`, `practice_services` | `gl_products`, `gl_services`, `gl_concerns`, `gl_anatomy_areas`, `gl_categories`, `gl_packages`, `pl_products`, `pl_services`, `pl_packages` |

**REQ-0:** Before any agent-manager work begins, repoint the Supabase client to the canonical A360 Innovation Hub project. The `gl_*` tables there have 371 products, 126 services, 28 concerns, 23 anatomy areas, 4 categories.

**REQ-0 instructions for Manus:**

```ts
// src/config/supabase.ts — replace contents with:

export const SUPABASE_CONFIG = {
  url: 'https://wvpgmawrizwkmvfnwqfl.supabase.co',
  anonKey: 'sb_publishable_46g0tx0i3edrmqGV9SwoqQ_q2H4kSGr',
};

export const SUPABASE_TABLES = {
  // Global Library
  products: 'gl_products',
  services: 'gl_services',
  concerns: 'gl_concerns',
  anatomyAreas: 'gl_anatomy_areas',
  categories: 'gl_categories',
  packages: 'gl_packages',
  productConcerns: 'gl_product_concerns',
  serviceConcerns: 'gl_service_concerns',
  productAnatomyAreas: 'gl_product_anatomy_areas',
  serviceAnatomyAreas: 'gl_service_anatomy_areas',
  productContent: 'gl_product_content',
  serviceContent: 'gl_service_content',
  // Practice Library (mirror of GL minus pricing per user spec)
  practiceProducts: 'pl_products',
  practiceServices: 'pl_services',
  practicePackages: 'pl_packages',
} as const;
```

After this change, audit any code path that references the old `products`/`services`/etc. table names — the schema differs slightly (gl_* tables use UUIDs, may differ in column names). Address mismatches as they arise.

---

## 1. Goals

The Agent Manager replaces both the current `AgentsPage` (read-only list) and the current `PromptManager` page (consolidates them). It becomes the place where an internal A360 user:

- **G1.** Authors and edits agents of any type (single prompt, prompt pipeline, OpenAI workflow, external webhook, RAG)
- **G2.** Authors and edits prompt templates that those agents reference
- **G3.** Selects which slices of the Global Library each agent has access to
- **G4.** Toggles whether each agent reads Practice Library overrides
- **G5.** Tests an agent against a real transcript and sees structured output
- **G6.** Manages the Coaching Tool's agents from the same surface
- **G7.** Sees sync status for externally-defined agents (OpenAI, third-party)

---

## 2. Page structure

The route `/agents` becomes the entry to the Agent Manager. The existing standalone Prompts page (route `/prompts` if it exists) is **deleted**. Anything currently linking to `/prompts` redirects to `/agents?tab=prompts`.

### Top-level layout

```
┌────────────────────────────────────────────────────────────────┐
│ Mid-Stream › Agent Manager                                       │
│                                                                  │
│ [Tab: Agents] [Tab: Prompts] [Tab: Coaching] [Tab: GL Browser]  │
├────────────────────────────────────────────────────────────────┤
│ (tab content)                                                    │
└────────────────────────────────────────────────────────────────┘
```

Four tabs:

| Tab | Purpose | URL |
|-----|---------|-----|
| Agents (default) | Browse, create, edit agents | `/agents` or `/agents?tab=agents` |
| Prompts | Browse, create, edit prompt templates and prompt sets | `/agents?tab=prompts` |
| Coaching | Filtered view of coaching-tagged agents + coaching-specific tools | `/agents?tab=coaching` |
| GL Browser | Read-only browser of Global Library data with row counts and search | `/agents?tab=gl-browser` |

The deleted `/prompts` route, any nav-bar link to "Prompts", and `pages/PromptManager/*` files all go away.

---

## 3. The Agents tab

### 3.1 List view (default)

```
┌─────────────────────────────────────────────────────────────┐
│ [+ New Agent]            [Filter: type ▾] [Search by name…] │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────┐            │
│ │ cross_sell_guidance  │ │ opportunities_agent  │            │
│ │ [BUILT-IN]           │ │ [BUILT-IN]           │            │
│ │ GL: products + svcs  │ │ GL: services         │            │
│ │ PL: yes (legacy)     │ │ PL: yes (legacy)     │            │
│ │ Live · 274 runs      │ │ Live · 271 runs      │            │
│ │ [Edit] [Test] [Run]  │ │ [Edit] [Test] [Run]  │            │
│ └──────────────────────┘ └──────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**REQ-1.** Render each agent as a card showing: name, type chip, GL scope summary (which slices are referenced — "products + services + concerns" etc.), PL toggle status, run count, action buttons.

**REQ-2.** Type filter chips: `All`, `Built-in`, `Prompt Template`, `Prompt Pipeline`, `OpenAI Workflow`, `External Webhook`, `Coaching RAG`. Selection is multi-select.

**REQ-3.** Search filter matches name + description + tags case-insensitive.

**REQ-4.** Empty state when no agents match: "No agents match the current filters" with reset button.

**REQ-5.** Action buttons per card:
- `Edit` opens the agent editor (REQ-7 onwards)
- `Test` opens the test panel inline beneath the card with a transcript picker
- `Run` triggers `POST /run_downstream` against a user-selected transcript (existing behavior — this is `agentsApi.runDownstream`)

### 3.2 New Agent button

**REQ-6.** Clicking `+ New Agent` opens the agent editor (REQ-7) on a blank record.

### 3.3 Agent editor (modal or `/agents/:id/edit` route)

Five tabs as defined in `08-AGENT-BUILDER.md` §4. Restated explicitly here for Manus:

#### REQ-7: Tab 1 — Basics
Fields:
- **Name** (text, required, unique)
- **Type** (radio with one selected): `prompt_template` · `prompt_pipeline` · `openai_workflow` · `external_webhook` · `coaching_rag`. (Built-in agents are not editable; the editor opens read-only for them with a banner: "Built-in agents are managed in the Prompt Runner Python codebase. Open the file at `prompt_runner/agents/<module_id>.py` to edit.")
- **Description** (multiline)
- **Tags** (chips, free-form, supports comma to add)

Validation: name required, type required.

#### REQ-8: Tab 2 — Configuration
Conditional rendering based on selected type.

##### REQ-8a: type = prompt_template
- **Prompt template picker** — autocomplete dropdown of all prompt templates from `GET /prompt_templates` (Prompt Runner). Shows name + version.
- **Edit prompt** button next to the picker — opens the prompt editor inline (REQ-12, lives in the Prompts tab) without leaving the agent editor. Uses a slide-in side panel.
- **Model override** (optional dropdown): `default · claude-haiku-4-5 · claude-sonnet-4-5 · gpt-4o-mini · gpt-4o · gemini-2.5-flash`
- **Temperature override** (optional slider 0.0–2.0, default off)

##### REQ-8b: type = prompt_pipeline
- **Steps editor** — ordered list. Each step row:
  - Step number (auto)
  - Prompt template picker (same dropdown as 8a)
  - Output variable name (text, default `step_N_output`)
  - Input variables checkboxes (lists previous steps' output variables that are available)
  - Reorder grip
  - Delete button
- `+ Add Step` button at bottom
- **Final output variable** dropdown — must be one of the steps' output variables
- Visual: a vertical line connecting the steps, with arrows showing data flow

##### REQ-8c: type = openai_workflow
- **Workflow ID** (text, required) — the OpenAI workflow identifier
- **API key secret** (dropdown of available env-var secret names, populated from `GET /system/secrets` — see REQ-21)
- **Input mapping** — JSON editor for mapping transcript fields into the workflow's input schema

##### REQ-8d: type = external_webhook
- **URL** (text, required) — must validate as URL
- **Method** (radio: POST default, GET, PUT)
- **Headers** — key/value editor (typical: `Content-Type`, `Authorization`)
- **Auth** — separate panel:
  - Auth type: none · bearer · basic · api-key-header · api-key-query
  - Secret name (dropdown of system secrets per REQ-21)
- **Request body template** — text editor with `{{variable}}` substitution preview:
  - Available variables: `{{transcript}}`, `{{transcript_id}}`, `{{run_id}}`, `{{practice_id}}`, `{{global_library}}`, `{{practice_library}}`
  - Live preview pane shows what the rendered request body looks like for a sample transcript
- **Response path** — JSONPath input (e.g., `$.result.output`) — extracts the result from the webhook response

##### REQ-8e: type = coaching_rag
- **RAG endpoint URL** (text, required)
- **Vector store ID** (text)
- **Retrieval k** (slider 1–20, default 5)
- **Final-shaping prompt** (optional template picker, same as 8a) — runs after retrieval to shape the output

#### REQ-9: Tab 3 — Data References

This is the heart of the user's request: agents declare what library data they read.

##### REQ-9a: Global Library section
- **Toggle:** "Inject Global Library context into this agent"
- When ON, show the slice picker. Each slice is a chip:

  | Slice | Source table | Live row count from GL Browser |
  |-------|--------------|-------------------------------|
  | Products | `gl_products` | 371 |
  | Services | `gl_services` | 126 |
  | Concerns | `gl_concerns` | 28 |
  | Anatomy Areas | `gl_anatomy_areas` | 23 |
  | Categories | `gl_categories` | 4 |
  | Packages | `gl_packages` | (count) |
  | Product Content | `gl_product_content` | (count — may be 0 today) |
  | Service Content | `gl_service_content` | (count — may be 0) |
  | Product↔Concerns junction | `gl_product_concerns` | (count) |
  | Service↔Concerns junction | `gl_service_concerns` | (count) |
  | Product↔Anatomy junction | `gl_product_anatomy_areas` | (count) |
  | Service↔Anatomy junction | `gl_service_anatomy_areas` | (count) |

  Counts pulled live from Supabase via `supabase.from(table).select('*', { count: 'exact', head: true })`.

- **Smart defaults** button: "Recommended for [type]" — pre-selects sensible slices given the agent's type:
  - `prompt_template` and `prompt_pipeline`: products + services + concerns + anatomy
  - `openai_workflow`, `external_webhook`: products + services (let the external tool decide what else)
  - `coaching_rag`: services + concerns

##### REQ-9b: Practice Library section
- **Toggle:** "Inject Practice Library context into this agent"
- When ON, show source dropdown:
  - **Practice Library database** — placeholder option, disabled until the `pl_*` tables are populated. Tooltip: "PL database mirrors GL minus pricing. Coming once seed data is loaded."
  - **Service offerings list (legacy)** — works today; pulls from the existing service-offerings endpoint
  - **None** — turns the toggle off
- Selected option becomes `agent.practice_library_source` on save.

##### REQ-9c: Preview pane (right side)
- Shows the rendered context block exactly as it will be passed to the agent at run time:
  - Section header per selected slice
  - First 3 rows shown, with "+N more" indicator
  - Total token count estimate
- Updates live as the user toggles slices on/off — useful for catching "this is way too much context" early.

#### REQ-10: Tab 4 — Output Schema
- JSON Schema editor (Monaco or CodeMirror).
- "Pre-fill from prompt template" button (visible when type = prompt_template, prompt_pipeline) — copies the `output_schema` from the underlying prompt template.
- "Validate sample" panel — paste a JSON sample, see schema-compliance result with line-by-line errors.
- Saved to `agent.output_schema`.

#### REQ-11: Tab 5 — Test & Sync

##### Test panel
- Transcript picker — autocomplete from `GET /transcripts` (returns 122 today)
- "Run agent" button → POST `/agents/{id}/test_run` (new endpoint, see REQ-19) with `{ transcript_id, dry_run: true }`
- Output area:
  - Elapsed time
  - Token usage (prompt + completion)
  - Cost estimate (model-specific rate × tokens)
  - Output JSON with schema-validation badge
  - Errors if any
- Test runs do **not** persist to the run's `outputs.downstream` — they're isolated. (Backend handles this.)

##### Sync panel (visible only for openai_workflow / external_webhook / coaching_rag)
- Last synced: timestamp + status pill (`ok` / `stale` / `error` / `manual`)
- "Sync now" button → POST `/agents/{id}/sync`
- After sync, show diff if input/output schema changed — gate the change behind a confirm dialog so an upstream tool change doesn't silently mutate the agent's contract.

##### Activity log
- Last 20 invocations of this agent (test runs + production)
- Columns: timestamp, run_id, status, elapsed, error if any
- Source: `GET /agents/{id}/activity?limit=20` (new endpoint, see REQ-19)

### 3.4 Validation rules

**REQ-12.** Before save:
- Name is unique across agents (case-insensitive)
- Type-specific config has all required fields
- For prompt_template: template_id exists
- For prompt_pipeline: at least one step; final_output_var matches one of the steps
- For openai_workflow: workflow_id is non-empty
- For external_webhook: URL is valid
- For coaching_rag: endpoint URL is valid

**REQ-13.** Show inline errors on the offending tab. Save button disabled until valid.

---

## 4. The Prompts tab

Prompt template management consolidated from the deleted Prompts page.

### REQ-14: Layout
```
┌─────────────────────────────────────────────────────────────┐
│ [+ New Prompt] [+ New Prompt Set]    [Filter: ▾] [Search…]  │
├─────────────────────────────────────────────────────────────┤
│ Prompt Templates (n)              Prompt Sets (n)            │
│ ┌──────────────────┐              ┌──────────────────┐       │
│ │ p1_extraction    │              │ 2step_v32        │       │
│ │ v3.2 · gpt-4o    │              │ Order: p1 → p2   │       │
│ │ used by 3 agents │              │ used by 1 agent  │       │
│ │ [Edit] [Clone]   │              │ [Edit]           │       │
│ └──────────────────┘              └──────────────────┘       │
│ ...                                ...                       │
└─────────────────────────────────────────────────────────────┘
```

### REQ-15: Prompt Template editor

Modal or page route, with:

- **Name** (text, required, unique)
- **Prompt ID** (text, machine-friendly slug, required)
- **Version** (text, e.g., `v3.2`)
- **Description** (multiline)
- **Content** (large textarea, monospace, required) — the prompt itself
- **System prompt** (optional textarea)
- **Input contract** (JSON Schema)
- **Output schema** (JSON Schema)
- **"Test prompt against a transcript"** — same panel pattern as agent Test (REQ-11), but runs the prompt as a one-shot using `POST /run_extraction` with this template
- **"Used by" panel** — list of agents that reference this template. Click an agent → opens the agent editor.

API: existing endpoints in `src/apiServices/prompts.api.ts` already cover CRUD. Wire them through.

### REQ-16: Prompt Set editor

- **Set ID, Name, Description**
- **Order** — ordered list of prompt template picker rows; reorder grip
- **Version pinning** — per template, optionally pin to a specific version
- API: existing `prompts.api.ts` `listSets`, `getSet`, `createSet` (extend with update/delete if missing)

### REQ-17: Deletion + nav cleanup

- Delete `src/pages/PromptManager/` entirely
- Remove any sidebar / nav-bar entry pointing to `/prompts`
- Add a redirect from old `/prompts` route to `/agents?tab=prompts` (for any deep links / bookmarks)

---

## 5. The Coaching tab

### REQ-18

Coaching tab is a filtered view of the Agents tab, showing only agents tagged `coaching` (or with name starting with `coaching_`).

In addition, a small dashboard at the top:

- 4 cards summarizing the four canonical coaching surfaces:
  - `coaching_evidence_extractor` (Prompt Runner)
  - `coaching_generator` (Prompt Runner)
  - `coaching_language_validator` (Prompt Runner)
  - `coaching_pipeline` (Prompt Runner — wraps the three above)
- Each card: last 7 days of invocations, error rate, average latency
- 2 cards for the Coaching Tool's external surfaces (registered as `coaching_rag` agents):
  - `aesthetics360_coach` (RAG chat)
  - `coaching_report_generator`
- Same cards format

The cards are clickable → opens the agent editor.

The first time the user lands on this tab and the Coaching Tool agents aren't registered yet, show a banner:

> "Coaching Tool agents not yet registered. Click below to register them as `coaching_rag` and `external_webhook` types pointing at the Coaching Tool's endpoints."

With a button that creates the agent records via `POST /agents` using preset configs. Endpoint URLs come from a config file (`src/config/coachingTool.ts` to be created).

---

## 6. The GL Browser tab

### REQ-19

A read-only browser of the canonical Global Library Supabase tables. Mirrors what the Pulse GL viewer does (`https://gl-viewer.vercel.app`), but inside Mid-Stream so users don't need a second tool.

- **Table picker** — dropdown of every `gl_*` table from `SUPABASE_TABLES`
- **Search** — full-text on `name` (or analogous column)
- **Row count** at top
- **Table viewer** — paginated, sortable columns, JSON expand for jsonb fields
- **Download CSV** button per table
- **Sync status indicator** — "Last fetched 14s ago" — auto-refreshes every 60s

This view is the source-of-truth picker for what an agent's GL scope can include. Each row from this tab can be added to an in-progress agent's scope via a "Pin to agent" button (only visible if the user has an agent editor open in another tab).

---

## 7. Backend dependencies (for Claude Code, not Manus)

Manus implements the UI per the requirements above. The backend changes that have to land in Prompt Runner before some of these requirements can fully function:

| Backend req | What it adds | Workstream-08 phase |
|-------------|--------------|---------------------|
| **BE-1** | Extend `agents` table with the new columns from `08-AGENT-BUILDER.md §3` | Phase 1 |
| **BE-2** | New endpoint `POST /agents/{id}/test_run` | Phase 2 |
| **BE-3** | New endpoint `POST /agents/{id}/sync` | Phase 4 |
| **BE-4** | New endpoint `GET /agents/{id}/activity?limit=N` | Phase 2 |
| **BE-5** | New endpoint `GET /system/secrets` (returns names of available env-var-backed secrets, **never the values**) | Phase 4 |
| **BE-6** | Update `/run_downstream` to dispatch by `agent.type` per `08-AGENT-BUILDER.md §3` | Phases 3–5 |
| **BE-7** | GL/PL injection helpers — given an agent's `global_library_scope` and `practice_library_source`, fetch and format the context block | Phase 2 |

**Manus should ship REQ-0, REQ-1 through REQ-6, REQ-14 through REQ-17, and REQ-19 first.** These don't depend on backend changes — they're UI work using existing endpoints (`/agents`, `/prompt_templates`, Supabase direct).

REQ-7 through REQ-13 (the editor) become functional in stages as Phase 1–4 of the backend lands.

REQ-18 (Coaching dashboard) needs BE-4 (activity endpoint).

---

## 8. State management

### REQ-20

- Use Zustand (already in the stack) for agent-editor state. One store: `agentEditor.store.ts`.
- The store holds: current draft agent, dirty flag, validation errors, selected tab.
- On save: optimistic update of the agent list, rollback on API error.
- On cancel: confirm dialog if dirty.

### REQ-21: Secrets handling

- Never display secret values in the UI.
- A "secret name" is just a string referring to an env-var on the Prompt Runner backend (e.g., `OPENAI_API_KEY`).
- The dropdown of available secret names comes from `GET /system/secrets` (BE-5). For phase 1 before BE-5 ships, hard-code a list of `['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GEMINI_API_KEY']` and show "(not yet configured on backend)" next to each.

---

## 9. Visual design notes

- Existing MUI v7 theme stays.
- Type chips use distinct colors per type — same palette family as the prototype's `agent-info-panel.js`:
  - prompt_template: blue
  - prompt_pipeline: green
  - openai_workflow: purple
  - external_webhook: orange
  - coaching_rag: pink
  - builtin: gray
- Use `@mui/icons-material` icons for type indicators: `MessageOutlined`, `AccountTreeOutlined`, `OpenInNewOutlined`, `LinkOutlined`, `PsychologyOutlined`, `SmartToyOutlined` respectively.
- Density: comfortable on the agent list view (cards are 280px wide × auto), compact in the editor (forms are tight, MUI `size="small"`).

---

## 10. Acceptance criteria

A working Phase-1 Manus deliverable means:

- [ ] REQ-0 — Supabase config repointed to `wvpgmawrizwkmvfnwqfl`; old hardcoded `gjqicqldjgvrwmtkliie` removed
- [ ] Old `PromptManager` page deleted; redirect from `/prompts` working
- [ ] Agent Manager page lives at `/agents` with four tabs
- [ ] Agents tab lists all current agents from `GET /agents` with type chips, scope summaries, action buttons
- [ ] New Agent button opens the editor; saves via `POST /agents` succeed for all five types using only the Phase-1 backend fields (REQ-7 + REQ-8a stubs work; REQ-9 toggles work even though Phase-1 backend doesn't actually inject context yet)
- [ ] Prompts tab lists templates and sets; create / edit / delete templates work via existing prompts.api.ts
- [ ] GL Browser tab opens the new Supabase project and lists tables; row counts populate; search works on `gl_products`
- [ ] Coaching tab renders agents tagged `coaching` (and shows the "register Coaching Tool agents" banner if none are tagged yet)
- [ ] No code references the deleted Prompts page or the old Supabase URL

Phase 2+ acceptance lands as the backend pieces ship.

---

## 11. Things deliberately out of scope

To keep this PR shippable:

- Real-time test runs streaming results as tokens arrive — Phase 5+
- Agent versioning and rollback — Phase 5+
- Agent run scheduling / cron — separate feature
- Multi-tenant agent visibility (per-practice agents) — separate feature
- Pulse integration — Pulse is not a target per CLAUDE.md
- Aurora / production-DB migration of the new `agents` schema — separate ETL
- Web-hook signing / allow-listing — Phase-4 backend concern, not UI

---

## 12. Open questions for the user

Manus can ship Phase-1 without resolution on these. Flag them so the user can answer before Phase-2 starts.

1. **Practice Library schema:** is the user OK with us drafting `pl_*` tables (mirror of GL minus pricing) as a separate plan, then seeding from existing service-offerings data? Or stay on the legacy list indefinitely?
2. **Coaching Tool endpoints:** do we have stable HTTPS URLs for `aesthetics360_coach` and `coaching_report_generator`? If not, the "register Coaching Tool agents" banner needs a different default.
3. **Built-in agents — convert to row-driven?** Today the 7 built-ins are Python code paths. We could migrate them to `prompt_template` rows in the agents table and let users edit their underlying prompts. Higher leverage, larger blast radius. Worth a separate plan.
4. **Test-run cost cap:** test runs hit real models. Per-user / per-day caps? Default rate limit?
5. **Sync direction:** if Manus → GitHub is one-way, can Manus's edits to Mid-Stream be considered authoritative for this repo, or is there an equivalent path for Claude Code to ship UI changes? The user has confirmed Claude Code is read-only on this repo, so the answer is "Manus-only for UI." Confirming for the record.
