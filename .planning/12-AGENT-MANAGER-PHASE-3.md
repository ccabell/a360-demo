# Agent Manager — Phase 3 (Manus next steps + knowledge grounding integration)

**Date:** 2026-05-04
**Status:** Phase-2 shipped (3 tabs, RAG picker, run panel, 83 tests passing). This doc covers Phase-3 — the three Manus-suggested follow-ons + the knowledge-grounding layer from `C:\Projects\accuracy\MANUS_AGENT_BUILDER_REQUIREMENTS.md`.

---

## 1. What Manus shipped in Phase-2

From the user's report:

- Tabbed modal with **Core**, **GL Library/RAG**, **Sync** tabs
- `ms_agent_library_refs` table backing the picker (services, products, concerns, anatomy areas)
- Enriched cards with RAG source count badge, workflow_id chip, tools chips, green Run button
- Run Agent panel with transcript picker + RAG source preview + `triggerRun` wired
- API path correction: `/prompt_templates` → `/prompts/templates` (Mid-Stream side)
- 83 tests passing, 0 TypeScript errors

**Verification done from Claude Code:**
- Mid-Stream local clone is on commit `064ac5e` (round-21) — Phase-2 hasn't synced down yet, expected for Manus → GitHub one-way sync
- Prompt Runner OpenAPI at `/openapi.json` still shows `/prompt_templates` (singular path), 30 endpoints, no drift since the workstream-07 audit
- ⚠️ The Mid-Stream API-path "fix" to `/prompts/templates` is calling a path that **does not exist** on the live Prompt Runner. Either (a) Manus ships their own prompt-templates proxy elsewhere, (b) the rename happens on the next Prompt Runner deploy (not yet visible), or (c) the calls quietly fail today. Worth a network-tab check on the live Mid-Stream.

---

## 2. Reconciling the accuracy doc with our existing plans

The doc at `C:\Projects\accuracy\MANUS_AGENT_BUILDER_REQUIREMENTS.md` (3,008 words, generated 2026-05-04) is a deeper spec than workstream 09 in the knowledge-grounding dimension. It adds:

| New concept | What it is | Where it fits in our plans |
|-------------|-----------|----------------------------|
| `gl_product_facts` (1,407 atomic facts) | Sourced, authority-tagged claims about each product | **Replaces** the loose "GL scope" picker in workstream 09 §REQ-9. Agents now select fact *categories* (clinical, safety, marketing, sales, pricing, education, business, retention) plus an *authority threshold* |
| `gl_product_guardrails` (151 rules) | Compliance constraints — must_include / must_not_claim / must_disclaim / must_verify / must_refer at critical/warning/info severity | **New panel** in the agent editor. Universal guardrails are non-toggleable. Workstream 11 §9 ("clinical contraindication safety case") gets concrete implementation here |
| `agent_reference_docs` (11 docs, 59K words) | Long-form domain knowledge by agent_type (coaching, clinical, patient_education, reach, business, compliance) | Maps directly to **Reference Documents picker** in agent editor — auto-suggests by agent_type. Replaces the "RAG source" abstraction in our plan |
| Authority hierarchy (FDA → Manufacturer → Peer-reviewed → Expert → Practitioner → Anecdotal) | 6-tier ranking | New **Authority Threshold** slider in agent editor |
| `v_agent_product_context` view | Pre-joined product + facts + guardrails in a single query | Backend should always use this view, not raw table joins |
| Context-budget indicator | Live word/token count as user adds reference docs | New UX detail in the Reference Documents picker |
| Response validation pipeline | Post-generation guardrail compliance check | New backend endpoint we hadn't specified |

**Net effect on workstream 09:**
- §REQ-9 "Data References" tab is replaced by a richer **Knowledge Sources** panel with five sub-sections (Product Scope, Fact Categories, Authority Threshold, Reference Documents, Guardrails)
- §REQ-11 Test panel grows: shows assembled context, response, guardrail compliance, source attribution
- Backend endpoints in workstream 09 §7 are replaced by the 7 endpoints in the accuracy doc §4.4

**Net effect on workstream 11 (content delivery):**
- The four agents proposed (patient_education, patient_marketing, clinical_context, product_comparison) all consume the new `gl_product_facts` + `gl_product_guardrails` + `agent_reference_docs` infrastructure
- Workstream 11's `gl_marketing_content` and `gl_clinical_references` tables become *additions* to the accuracy doc's data model, not replacements — they handle non-product content (testimonials, papers about treatment combinations, etc.)
- Workstream 11's "deterministic step 1 contraindication check" is now a guardrail with `severity=critical`, `guardrail_type=must_verify`

**Updates to make:**

- [ ] Add a "**Superseded** by §3 of `12-AGENT-MANAGER-PHASE-3.md` and the accuracy doc" banner to workstream 09 §REQ-9
- [ ] Add a cross-reference from workstream 11's clinical safety case to the guardrails system
- [ ] No code changes — these are documentation reconciliations

---

## 3. Phase-3 deliverables

Three work items, in suggested order:

| Order | Item | Owner | Effort |
|-------|------|-------|--------|
| **1** | Knowledge Sources panel (replaces Phase-2 GL Library tab) | Manus | Medium — 5 sub-panels, real GL queries |
| **2** | Test Agent dry-run mode (Manus's suggestion #1) | Manus | Small — single panel, reuses Phase-2 infra |
| **3** | RAG source search + filter (Manus's suggestion #2) | Manus | Small — text input + debounced filter |
| **4** | Agent versioning (Manus's suggestion #3) | Manus + Claude Code | Medium — schema column + UI surfacing |

Manus suggested 1/2/3; the accuracy doc adds the Knowledge Sources work (the highest-leverage piece). Build that *first* because items 2/3 land naturally on top of it.

### 3.1 Manus-ready instructions for **Knowledge Sources panel**

> **Manus task: replace Phase-2 GL Library/RAG tab with the Knowledge Sources panel from the accuracy doc**
>
> Pre-reqs: Phase-2 modal exists. The Phase-2 GL Library tab uses `ms_agent_library_refs` to store picks against `gl_services / gl_products / gl_concerns / gl_anatomy_areas`. The Phase-3 panel keeps that table for backwards compatibility (Phase-2 agents continue to work) AND adds new fields for fact categories, authority threshold, reference docs, and guardrails.
>
> **REQ-K1.** Rename the **GL Library/RAG** tab to **Knowledge Sources**.
>
> **REQ-K2.** Inside the tab, render five sub-panels in this order, each in a `<Card>`:
>
> 1. **Product Scope** — radio: All products / Selected products / Practice only. When "Selected products," show the existing multi-select from Phase-2 (already wired). Add manufacturer + category filters at top of the picker.
>
> 2. **Fact Categories** — checkbox grid (8 boxes): Clinical · Safety · Marketing · Sales · Pricing · Education · Business · Retention. All on by default for new agents. Selection persists to a new column `agents.fact_categories text[]`.
>
> 3. **Authority Threshold** — segmented control with 6 options: FDA only · Manufacturer+ · Peer-reviewed+ · Expert+ · Practitioner+ · All sources. Default = "Peer-reviewed+". Persists to `agents.authority_threshold text`.
>
> 4. **Reference Documents** — multi-select list backed by `agent_reference_docs` table (`SELECT slug, title, agent_type, word_count FROM agent_reference_docs ORDER BY agent_type, title`). Auto-suggest the docs whose `agent_type` matches the agent's selected type (e.g., a coaching agent auto-checks consultation-mastery, objection-handling-mastery, patient-psychology, sales-excellence). Show running word count: `Context: 24,569 / 30,000`. Color the count amber over 25K, red over 30K. Persists to `agents.reference_doc_slugs text[]`.
>
> 5. **Guardrails (read-only)** — list of all guardrails matching the agent's product scope. Pulled from `gl_product_guardrails` filtered by selected `product_id`s plus universal rules (`product_id IS NULL`). Group by severity (Critical first, red badge; Warning, yellow; Info, gray). Show `rule`, `reason`, `source` for each. Add a **Custom Guardrails** sub-panel below where the user can add free-form practice-specific rules — these persist to a new column `agents.custom_guardrails jsonb[]` with shape `{rule, severity, created_at}`.
>
> **REQ-K3.** Add a real-time **Context Preview** pane on the right side of the Knowledge Sources tab. Shows what the actual prompt-context block will look like for a sample product (first selected, or default = BOTOX). Renders the assembly format from the accuracy doc §4.2 with markdown formatting. Updates live as the user toggles categories / threshold / docs.
>
> **REQ-K4.** When the user changes Agent Type (in the Core tab), the Reference Documents auto-suggestion in this tab re-runs and pre-checks the recommended docs. Show a one-time toast: "Reference doc suggestions updated for [agent_type]."
>
> **REQ-K5.** Save flow — the existing Phase-2 save submits to `PATCH /agents/{id}`. Extend the request body to include the new fields (`fact_categories`, `authority_threshold`, `reference_doc_slugs`, `custom_guardrails`). The backend (B-1 below) will accept these.
>
> **REQ-K6.** Migration of existing Phase-2 agents: when loading an agent that doesn't have the new fields populated, default to: all 8 fact categories on, authority_threshold = `peer_reviewed`, reference_doc_slugs = `[]` (auto-suggested when user opens the tab), custom_guardrails = `[]`.

#### Acceptance criteria for REQ-K
- [ ] Phase-2 agents still load correctly with sensible defaults
- [ ] All 5 sub-panels render and persist
- [ ] Context preview updates within 200ms of any toggle
- [ ] Reference doc auto-suggest triggers on agent-type change
- [ ] Guardrails panel shows critical-severity rules at the top, in red

### 3.2 Manus-ready instructions for **Test Agent dry-run mode**

> **Manus task: add a dry-run test panel to the agent editor**
>
> **REQ-D1.** Add a "Test" tab as the **last** tab in the agent editor modal.
>
> **REQ-D2.** Layout: two columns.
>   - **Left:** input area
>     - Radio: "Use a transcript" / "Paste raw text"
>     - If transcript: existing transcript picker from the Run panel
>     - If raw: large textarea
>     - Optional: "Override sample query" — short text input to add a query string on top of the transcript (useful for product-specific questions)
>     - Run button
>   - **Right:** output area
>     - Shows agent response, assembled context (collapsible), guardrail compliance check (per-rule pass/fail), source attribution list
>
> **REQ-D3.** Dry-run does NOT create a row in `runs` or write to `outputs.downstream`. Backend dependency: new endpoint `POST /agents/{id}/test` (B-2 below) that accepts `{ transcript_text?, transcript_id?, query? }` and returns `{ response, context_used, guardrails_check, sources }`.
>
> **REQ-D4.** Add a **Save sample** button — captures the current input as a named sample for later regression testing. Saves to a new table `ms_agent_test_samples` with `{ agent_id, name, input, expected_response_summary, created_at }`. Sample list visible in a sidebar.
>
> **REQ-D5.** Show last 5 dry-runs in a "Recent tests" strip beneath the run button, each clickable to re-run.
>
> **REQ-D6.** On the response, show **token usage and cost estimate** using the same `JUDGE_COSTS_PER_M_TOKENS` table from workstream 10 §6 REQ-7.

#### Acceptance criteria for REQ-D
- [ ] Test tab visible in editor; doesn't show for built-in agents (read-only)
- [ ] Dry-run completes without creating a run record (verify by checking `/runs` count before/after)
- [ ] Guardrail compliance check shows per-rule status
- [ ] Source attribution links back to specific `gl_product_facts.id` rows

### 3.3 Manus-ready instructions for **RAG source search + filter**

> **Manus task: add live search + filter to all GL pickers in the agent editor**
>
> **REQ-S1.** Top of every GL picker (products, services, concerns, anatomy areas, reference docs), add a search input with debounced (250ms) filter.
>
> **REQ-S2.** Search matches: name, brand_name (for products), aliases (for concerns), tags (for reference docs). Case-insensitive substring match.
>
> **REQ-S3.** For Products picker, add filter chips above search:
>   - Manufacturer (dropdown of distinct values from `gl_products.manufacturer`)
>   - Category (dropdown of distinct values from `gl_categories.name`)
>   - Product type (dropdown)
>
> **REQ-S4.** For Reference Documents picker, add filter chips:
>   - Agent type (coaching · clinical · patient_education · reach · business · compliance)
>   - Word count: All / Under 5K / 5–10K / Over 10K
>
> **REQ-S5.** Show "N matching" count next to the search input. Empty state: "No products match the current filters" with a Clear filters button.
>
> **REQ-S6.** Performance: queries should hit Supabase with proper filtering (don't fetch all 378 products and filter client-side). Use `.ilike()` for name search, `.eq()` for chip filters.

#### Acceptance criteria for REQ-S
- [ ] Typing in search filters within 250ms
- [ ] Filter chips combine (AND semantics)
- [ ] Network tab shows a single Supabase query per keystroke (debounced)
- [ ] Empty state has a Clear button

### 3.4 Joint Manus + Claude Code instructions for **Agent versioning**

#### Backend (Claude Code — Prompt Runner)

> **B-1. Extend `agents` table:**
> ```sql
> ALTER TABLE agents
>   ADD COLUMN version INTEGER DEFAULT 1,
>   ADD COLUMN last_modified_at TIMESTAMPTZ DEFAULT NOW(),
>   ADD COLUMN last_modified_by TEXT,
>   ADD COLUMN fact_categories TEXT[] DEFAULT ARRAY['clinical','safety','marketing','sales','pricing','education','business','retention'],
>   ADD COLUMN authority_threshold TEXT DEFAULT 'peer_reviewed',
>   ADD COLUMN reference_doc_slugs TEXT[] DEFAULT '{}',
>   ADD COLUMN custom_guardrails JSONB DEFAULT '[]'::jsonb;
> ```
>
> Trigger to auto-bump `version` and `last_modified_at` on UPDATE:
> ```sql
> CREATE OR REPLACE FUNCTION bump_agent_version() RETURNS trigger AS $$
> BEGIN
>   NEW.version = OLD.version + 1;
>   NEW.last_modified_at = NOW();
>   RETURN NEW;
> END;
> $$ LANGUAGE plpgsql;
>
> CREATE TRIGGER agents_version_bump
>   BEFORE UPDATE ON agents
>   FOR EACH ROW
>   WHEN (OLD.* IS DISTINCT FROM NEW.*)
>   EXECUTE FUNCTION bump_agent_version();
> ```
>
> **B-2. New endpoint `POST /agents/{id}/test`** — body `{ transcript_text?, transcript_id?, query?, dry_run: true }`. Implementation:
>   - Assemble context per the accuracy doc §4.1 5-step pipeline
>   - Call the agent's underlying handler (prompt template / pipeline / webhook / etc.)
>   - Run post-generation guardrail validation per accuracy doc §4.3
>   - Return `{ response, context_used, guardrails_check, sources }` without writing to `runs.outputs.downstream`
>
> **B-3. New endpoint `GET /agents/{id}/history`** — returns version history (each row: version, last_modified_at, last_modified_by, diff_summary). Requires a new audit table `agents_audit` populated by the trigger.
>
> **B-4. Update `POST /agents/{id}/sync`** (if it exists from Phase-2 already, otherwise add it) — when an OpenAI workflow is re-fetched, store the previous definition in `agents_audit` and bump version. Return a diff in the response so Mid-Stream's Sync tab can render "what changed."

#### Frontend (Manus)

> **REQ-V1.** In the agent list view, add a small `v3` badge next to the agent name (where 3 is the current `version`).
>
> **REQ-V2.** In the Sync tab, add a "Last synced" row showing `last_synced_at` (already in Phase-2) and "Last modified" showing `last_modified_at`.
>
> **REQ-V3.** Add a "Version history" link in the Sync tab. Clicking opens a side panel listing all versions for this agent. Each entry shows: version, last_modified_at, last_modified_by, optional diff_summary. Click to view full diff (read-only).
>
> **REQ-V4.** When saving an agent, show a toast: "Saved as v{version}" — gives the user feedback that their change bumped the version.

---

## 4. What Claude Code can ship now without waiting

While Manus iterates the UI, the Prompt Runner backend can land:

### 4.1 Schema migration (B-1)

Single Alembic migration adding the 7 new columns + trigger + audit table. Low risk because all columns have defaults; existing agents continue to work unchanged.

### 4.2 Test endpoint (B-2)

The hardest piece because it requires implementing the **context assembly pipeline** from the accuracy doc §4.1 + §4.2. Translate the SQL queries into Python:

```python
# pseudocode
def test_agent(agent_id: str, transcript_text: str = None, query: str = None):
    agent = get_agent(agent_id)
    products = identify_relevant_products(query or transcript_text, agent.product_scope)
    guardrails = fetch_guardrails(products)  # universal + product + custom
    facts = fetch_facts(products, agent.fact_categories, agent.authority_threshold)
    docs  = fetch_reference_docs(agent.reference_doc_slugs)
    prompt = assemble_prompt(agent.system_prompt, guardrails, facts, docs, transcript_text, query)
    response = call_llm(agent.model, prompt)
    compliance = validate_guardrails(response, guardrails)
    sources = extract_source_attribution(response, facts)
    return {"response": response, "context_used": ..., "guardrails_check": compliance, "sources": sources}
```

Estimated 250–400 lines of new Python in `prompt_runner/agent_runtime.py`. Tests should cover:
- Guardrail enforcement: critical violations get blocked
- Authority filtering: when threshold=`fda_approved`, only fda-tier facts are included
- Context budget: facts trimmed when exceeding token limit
- Source attribution: response claims map back to `gl_product_facts.id`s

### 4.3 The path-rename concern

Mid-Stream Phase-2 calls `/prompts/templates`. The live OpenAPI shows `/prompt_templates`. **Recommended Claude Code work:** add path aliases in Prompt Runner so both paths route to the same handlers. Two-line FastAPI router change. Eliminates Mid-Stream's dependency on a path that doesn't exist today.

```python
# prompt_runner/api/prompts.py — add at the bottom of router setup
@router.get("/prompts/templates")
async def list_prompt_templates_alias(...):
    return await list_prompt_templates(...)

# Repeat for /prompts/templates/{id} → /prompt_templates/{id}, etc.
```

Also document in OpenAPI so the new paths show up in the spec.

---

## 5. Recommended sequence

1. **Claude Code: ship path aliases for `/prompts/templates`** — unblocks anything in Mid-Stream Phase-2 that's currently failing silently. ~30-min PR.
2. **Claude Code: ship B-1 (schema migration)** — small, low risk, unblocks K and V.
3. **Manus: ship REQ-K (Knowledge Sources panel)** — biggest UI win. Can ship before B-2 because the new fields just persist; the runtime semantics (using authority threshold etc.) only matter once test endpoints exist.
4. **Claude Code: ship B-2 (test endpoint)** — most complex. Estimate 1–2 days of work because it requires the full context-assembly pipeline.
5. **Manus: ship REQ-D (Test panel) + REQ-S (search/filter)** — both reuse REQ-K infrastructure.
6. **Joint: ship REQ-V (versioning)** — small in both directions, lands once the audit table exists.

---

## 6. Open questions

1. **Path-rename alignment.** Did Manus rename Mid-Stream's calls to `/prompts/templates` because they expect the backend to be renamed, or was this a typo? Confirm before Claude Code adds aliases — if the rename is intentional, we should pick one canonical path and migrate the spec. (Recommended canonical: `/prompts/templates` because it's more REST-y.)
2. **Multi-tenancy for guardrails.** The accuracy doc lists "Custom guardrails: user can add practice-specific rules." Should custom guardrails apply per-practice or per-agent? Today our schema is per-agent; per-practice would need a different table.
3. **Guardrail enforcement strictness.** The doc says critical guardrails are a "hard block." Means the backend refuses to return a response if a critical guardrail is violated? Or warns and returns? Recommend: hard block in production, soft warning in dry-run / Test panel so users can iterate.
4. **`v_agent_product_context` view.** The accuracy doc says it exists. Worth confirming with `select * from v_agent_product_context limit 1` before backend code depends on it.
5. **Audit retention.** Agent versions could grow unbounded if users edit frequently. Cap at 100 versions per agent? Or compress diffs?

---

## 7. Document map

| Doc | Concern |
|-----|---------|
| 08-AGENT-BUILDER.md | Original architectural rationale |
| 09-AGENT-MANAGER-MANUS-REQUIREMENTS.md | Phase-1 + Phase-2 PRD (REQ-9 superseded by §3 here + accuracy doc) |
| 10-EVAL-FRAMEWORK-REQUIREMENTS.md | LLM-as-judge eval suite |
| 11-CONTENT-DELIVERY-AGENTS.md | Patient + clinician content agents (clinical safety case implemented as guardrails per this doc) |
| **12 (this doc)** | **Phase-3: knowledge grounding + 3 next-step items + path-alias backend fix** |
| External: `C:\Projects\accuracy\MANUS_AGENT_BUILDER_REQUIREMENTS.md` | Source of truth for the knowledge-grounding model (facts, guardrails, authority, reference docs, context-assembly pipeline) |

11 + 12 + the accuracy doc converge on the same data model. They differ only in surface — 11 is about *content delivery* (rendering to patients/clinicians), 12 is about *agent authoring* (configuring what data the agent sees). Same `gl_product_facts` / `gl_product_guardrails` / `agent_reference_docs` tables underneath.
