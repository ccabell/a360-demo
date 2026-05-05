# Manus Next Actions — Agent Manager Phase-3 (with GL access)

**Date:** 2026-05-04
**Audience:** Manus AI implementing in `https://github.com/ccabell/Mid_Stream`
**Self-contained:** This is the single doc to paste into Manus. Manus does **not** need to read 09, 11, 12, or the accuracy doc — every detail is here.

You shipped Phase-2 (3-tab modal, RAG picker, Run panel, 83 tests passing). This doc is what's next. Five tasks, sequenced.

---

## 1. Global Library — how to access it

Everything below assumes Mid-Stream's Supabase client is pointed at the canonical A360 GL project (per `09-AGENT-MANAGER-MANUS-REQUIREMENTS.md` REQ-0). If `src/config/supabase.ts` still points at `gjqicqldjgvrwmtkliie`, **fix that first** — the rest of this doc won't work otherwise.

### 1.1 Connection

| Project | Ref | URL | Anon key |
|---------|-----|-----|----------|
| Global Library | `wvpgmawrizwkmvfnwqfl` | `https://wvpgmawrizwkmvfnwqfl.supabase.co` | `sb_publishable_46g0tx0i3edrmqGV9SwoqQ_q2H4kSGr` |

### 1.2 Tables Mid-Stream agents need

| Table | Rows today | What it is |
|-------|-----------|------------|
| `gl_products` | 378 | Product catalog with `name`, `brand_name`, `manufacturer`, `category_id`, `product_type`, `description`, `indications`, `contraindications`, `active_ingredients`, `onset_time`, `peak_effect`, `duration_of_effect`, `dosing_guidelines` |
| `gl_product_facts` | 1,407 | Atomic, source-attributed claims about each product. Key columns: `product_id`, `category` (clinical / marketing / sales / pricing / retention / education / business / safety), `subcategory`, `fact`, `detail`, `source_type`, `source_name`, `source_url`, `authority` (fda_approved / manufacturer_official / peer_reviewed / expert_consensus / practitioner_opinion / anecdotal), `confidence`, `requires_disclaimer`, `is_off_label`, `is_time_sensitive` |
| `gl_product_guardrails` | 151 | Compliance rules. Columns: `product_id` (NULL = applies to ALL products), `category` (NULL = applies to all), `guardrail_type` (must_include / must_not_claim / must_disclaim / must_verify / must_refer), `rule`, `reason`, `severity` (critical / warning / info), `source` (compliance_policy / fda_label / legal_review / clinical_guideline), `is_active` |
| `agent_reference_docs` | 11 | Long-form domain knowledge. Columns: `slug`, `title`, `agent_type` (coaching / clinical / patient_education / reach / business / compliance), `category`, `tags TEXT[]`, `content` (markdown 3K-10K words), `word_count` |
| `v_agent_product_context` | 378 (view) | Pre-joined view: returns `product_name`, `manufacturer`, `brand_name`, `clinical_facts JSONB[]` (sorted by authority), `safety_facts JSONB[]`, `marketing_facts JSONB[]`, `pricing_facts JSONB[]`, `education_facts JSONB[]`, `guardrails JSONB[]` for one query per product |
| `gl_concerns`, `gl_anatomy_areas`, `gl_categories`, `gl_services` | as before | already used in Phase-2 |

### 1.3 Reference document slugs (you'll need these)

```
consultation-mastery                      coaching          7,588 words
objection-handling-mastery                coaching          3,300 words
patient-psychology-behavioral-intelligence coaching         3,966 words
sales-excellence-framework                coaching          9,715 words
clinical-protocols-treatment-combinations clinical          3,316 words
patient-education-communication           patient_education 4,633 words
retention-reengagement-followup           reach             4,188 words
marketing-patient-acquisition             reach             5,990 words
pricing-packaging-membership-strategy     business          3,269 words
practice-growth-operations                business          6,518 words
ethical-standards-compliance              compliance        6,813 words
```

### 1.4 Authority hierarchy (highest → lowest)

```
fda_approved          (1) — FDA labels, highest authority
manufacturer_official (2) — manufacturer's own website/docs
peer_reviewed         (3) — PubMed or clinical journals
expert_consensus      (4) — KOL videos, training materials
practitioner_opinion  (5) — podcast discussions, interviews
anecdotal             (6) — individual case reports, informal
```

When the user picks an "Authority Threshold" of `peer_reviewed`, the agent only sees facts with authority 1, 2, or 3.

### 1.5 Sample queries you'll need

```ts
// Search products with manufacturer + name filter
const products = await supabase
  .from('gl_products')
  .select('id, name, brand_name, manufacturer, product_type, category_id')
  .ilike('name', `%${searchTerm}%`)
  .eq('manufacturer', selectedManufacturer)
  .order('name')
  .limit(50);

// Get all facts for a product, filtered by category and authority threshold
const facts = await supabase
  .from('gl_product_facts')
  .select('id, category, subcategory, fact, source_name, source_url, authority, requires_disclaimer, is_off_label, is_time_sensitive')
  .eq('product_id', productId)
  .in('category', selectedCategories)
  .in('authority', authorityListAtOrAboveThreshold)
  .order('authority', { ascending: true });  // fda_approved first

// Get guardrails for selected products (universal + product-specific)
const guardrails = await supabase
  .from('gl_product_guardrails')
  .select('id, product_id, category, guardrail_type, rule, reason, severity, source')
  .eq('is_active', true)
  .or(`product_id.is.null,product_id.in.(${selectedProductIds.join(',')})`)
  .order('severity', { ascending: true });  // critical first

// List reference docs, filter by agent_type
const docs = await supabase
  .from('agent_reference_docs')
  .select('slug, title, agent_type, category, tags, word_count')
  .eq('agent_type', selectedAgentType)
  .order('word_count', { ascending: false });

// Pre-joined product context (for context-preview pane)
const ctx = await supabase
  .from('v_agent_product_context')
  .select('*')
  .eq('product_id', productId)
  .single();
```

---

## 2. The five tasks

| Order | Task | Effort | Depends on |
|-------|------|--------|------------|
| **A** | **Sanity-check the path-rename** | 5 min | — |
| **B** | **Knowledge Sources panel** (replaces Phase-2 GL Library/RAG tab with the 5-section knowledge config) | Medium | none |
| **C** | **Test Agent dry-run mode** (new tab, paste transcript or pick one, see context + response + guardrail compliance + sources) | Small | B + Claude Code backend (`POST /agents/{id}/test`) |
| **D** | **RAG source search + filter** (live search and filter chips on every GL picker) | Small | none |
| **E** | **Agent versioning** (version badge, last-modified, version history side panel) | Small | Claude Code backend (schema migration) |

Build B first; C and D land easily on top of it. Then E once the backend ships the audit table.

---

## 3. TASK A — Path-rename sanity check (5 min)

In Phase-2 you reported:
> API path fix — /prompt_templates corrected to /prompts/templates throughout the router

Per the live Prompt Runner OpenAPI (`https://prompt-runner-production.up.railway.app/openapi.json`), the path is **still `/prompt_templates`**. The `/prompts/templates` rename is **not on the backend**.

**Action:**
1. Open the live deployed Mid-Stream
2. DevTools → Network tab
3. Trigger any prompt-template fetch (open the prompt picker in an agent editor)
4. Note the request URL

If the request is going to `/prompts/templates` and returning 404, revert your client calls back to `/prompt_templates`. If it's working, Claude Code will add aliases in Prompt Runner so both paths resolve. Either way, **report the answer back** so we know which side to fix.

---

## 4. TASK B — Knowledge Sources panel

Rename the Phase-2 **GL Library / RAG** tab to **Knowledge Sources**. Replace its body with the five sub-panels below. The existing `ms_agent_library_refs` table stays for backwards-compat with Phase-2 picks; new fields go on the `agents` table directly.

### 4.1 Five sub-panels (vertical stack, in order)

#### Panel 1: Product Scope

```
┌─ Product Scope ─────────────────────────────────────┐
│ ○ All products  ● Selected products  ○ Practice only │
│                                                     │
│ Filters: [Manufacturer ▾] [Category ▾] [Type ▾]     │
│ [🔍 Search products...]                             │
│                                                     │
│ ┌──────────────────────────────────────────────┐   │
│ │ ☑ BOTOX Cosmetic (Allergan)                  │   │
│ │ ☑ Juvederm Voluma (Allergan)                 │   │
│ │ ☐ Sculptra (Galderma)                        │   │
│ │ ☐ Morpheus8 (InMode)                         │   │
│ │ ... [scroll]                                  │   │
│ └──────────────────────────────────────────────┘   │
│                       12 of 378 selected            │
└─────────────────────────────────────────────────────┘
```

- Persist mode to `agents.product_scope_mode` (text: `all` / `selected` / `practice`)
- Persist selected product IDs to `agents.selected_product_ids UUID[]`
- Filters and search per task D (combined)

#### Panel 2: Fact Categories

```
┌─ Fact Categories ─────────────────────────┐
│ ☑ Clinical    ☑ Safety    ☑ Education    │
│ ☑ Sales       ☐ Pricing   ☐ Marketing    │
│ ☐ Business    ☐ Retention                  │
└───────────────────────────────────────────┘
```

- 8 checkboxes. All on by default for new agents.
- Persist to `agents.fact_categories TEXT[]`

#### Panel 3: Authority Threshold

```
┌─ Authority Threshold ──────────────────────────┐
│ Minimum authority level for facts:             │
│ ○ FDA Only  ○ Manufacturer+  ● Peer-reviewed+ │
│ ○ Expert+   ○ Practitioner+  ○ All sources    │
└────────────────────────────────────────────────┘
```

- Segmented control, single selection. Default = `peer_reviewed`.
- Persist to `agents.authority_threshold TEXT`

#### Panel 4: Reference Documents

```
┌─ Reference Documents ──────────────────────────┐
│ [Search docs...] [Type: coaching ▾] [Words ▾]  │
│                                                │
│ Auto-suggested for coaching agent:             │
│ ☑ Consultation Mastery (7,588 words)           │
│ ☑ Objection Handling Mastery (3,300 words)     │
│ ☑ Patient Psychology (3,966 words)             │
│ ☑ Sales Excellence Framework (9,715 words)     │
│ ☐ Clinical Protocols (3,316 words)             │
│ ☐ Patient Education (4,633 words)              │
│                                                │
│ Context: 24,569 / 30,000 words   [████░░░ 82%] │
└────────────────────────────────────────────────┘
```

- Multi-select from `agent_reference_docs`
- Auto-check docs whose `agent_type` matches the agent's selected type — toast: "Reference doc suggestions updated for [agent_type]" — fires once per agent_type change
- Live word-count: amber over 25K, red over 30K
- Persist to `agents.reference_doc_slugs TEXT[]`

#### Panel 5: Guardrails

```
┌─ Active Guardrails ───────────────────────────┐
│ 🔴 CRITICAL (12)              [collapsible]   │
│ ▸ Must verify contraindications before rec   │
│ ▸ No off-label claims without FDA authority  │
│ ▸ Licensed provider must perform procedure   │
│ ... [show all]                                │
│                                                │
│ 🟡 WARNING (3)                                 │
│ ▸ Disclaim pricing as approximate            │
│ ▸ Combination protocols are practitioner-based│
│ ▸ Individual results vary                     │
│                                                │
│ ℹ️  INFO (8)              [collapsible]        │
│                                                │
│ ─────────────                                  │
│ Custom Guardrails (practice-specific)         │
│ [+ Add rule]                                   │
└────────────────────────────────────────────────┘
```

- Read-only main list — pulled live from `gl_product_guardrails` filtered by `selected_product_ids` ∪ universal (`product_id IS NULL`)
- Each entry shows `rule` (bold), `reason` (italic), `source` (small caps)
- Critical at top, red border. Warning amber. Info gray.
- "Universal guardrails ON" toggle is **always on, non-toggleable**. Show a tooltip: "Universal guardrails are required by compliance and cannot be disabled."
- **Custom Guardrails** sub-panel below the read-only list. Form: rule (text), severity (radio: critical/warning/info), reason (text). Persist to `agents.custom_guardrails JSONB[]` with shape `[{rule, severity, reason, created_at}]`.

### 4.2 Right-side Context Preview pane

Adjacent to the form (or below on narrow viewports), a live preview pane that shows the actual prompt-context block the agent will see at run time:

```
┌─ Context Preview ────────────────────────────────┐
│ Showing: BOTOX Cosmetic                          │
│ [↻ Refresh] [Sample product ▾]                   │
│ ─────────────────────────────────                │
│ === GUARDRAILS ===                               │
│                                                  │
│ CRITICAL:                                        │
│ - Must verify no history of botulinum sensitivity│
│ - Licensed provider must perform procedure       │
│                                                  │
│ === PRODUCT CONTEXT: BOTOX Cosmetic ===          │
│                                                  │
│ CLINICAL FACTS (sorted by authority):            │
│ - [FDA] FDA-approved for moderate-to-severe...   │
│ - [MANUFACTURER] Recommended dose 4U per area... │
│ - [PEER-REVIEWED] Onset 24-72h, peak day 14...   │
│                                                  │
│ SAFETY FACTS:                                    │
│ - [FDA] Contraindicated in patients with botul.. │
│                                                  │
│ === REFERENCE KNOWLEDGE ===                      │
│ (24,569 words from 4 documents)                  │
│ [Expand to view inline ▾]                        │
└──────────────────────────────────────────────────┘
```

- Shows the assembled context for one sample product (default = first selected, fallback = BOTOX)
- Updates within 200ms of any toggle change in the form
- Use `v_agent_product_context` for the per-product fetch
- Pre-filtered by the agent's authority threshold + fact categories

### 4.3 New columns on `agents` table

These persist what the form captures. Backend (Claude Code) will add the schema migration. Until then, the request body silently includes the fields and the backend persists what it can.

```sql
-- Backend Alembic migration (Claude Code will ship this)
ALTER TABLE agents
  ADD COLUMN product_scope_mode TEXT DEFAULT 'all',
  ADD COLUMN selected_product_ids UUID[] DEFAULT '{}',
  ADD COLUMN fact_categories TEXT[] DEFAULT
    ARRAY['clinical','safety','marketing','sales','pricing','education','business','retention'],
  ADD COLUMN authority_threshold TEXT DEFAULT 'peer_reviewed',
  ADD COLUMN reference_doc_slugs TEXT[] DEFAULT '{}',
  ADD COLUMN custom_guardrails JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN last_modified_by TEXT;
```

### 4.4 Backwards-compatibility for Phase-2 agents

When loading an agent that doesn't have these new fields populated:
- `product_scope_mode = 'all'`
- `fact_categories = [all 8]`
- `authority_threshold = 'peer_reviewed'`
- `reference_doc_slugs = []` (auto-suggest fires when user opens the tab)
- `custom_guardrails = []`

### 4.5 Acceptance criteria

- [ ] All 5 panels render and persist
- [ ] Search works on Products and Reference Docs (debounced 250ms)
- [ ] Auto-suggest fires when agent_type changes; toast appears
- [ ] Word-count badge changes color at 25K and 30K
- [ ] Guardrails panel pulls live data; critical-severity at top, red
- [ ] Custom guardrails form persists to `custom_guardrails` JSONB
- [ ] Context Preview updates within 200ms of toggle changes
- [ ] Phase-2 agents load with sensible defaults

---

## 5. TASK C — Test Agent dry-run mode

Add a **Test** tab as the **last** tab of the agent editor modal.

### 5.1 Layout

```
┌─ Test Agent ─────────────────────────────────────────────┐
│ Input                          │ Output                    │
│ ─────────                      │ ─────────                 │
│ ○ Use existing transcript      │ Response:                 │
│ ● Paste raw text                │   [agent's response]      │
│                                │                           │
│ [textarea — paste here]        │ Context Used (collapsible)│
│                                │ ▸ Products: BOTOX, Juverm │
│ Override query (optional):     │ ▸ Facts injected: 47      │
│ [_______________________]      │ ▸ Reference docs: 4       │
│                                │                           │
│ [▷ Run dry-run]               │ Guardrail Compliance:     │
│                                │  ✅ All critical passed    │
│ Cost estimate: ≈ $0.18         │  ⚠️ 1 warning unmet       │
│                                │                           │
│ Recent tests:                  │ Source Attribution:       │
│ ▸ "BOTOX onset?" 2m ago       │ - [FDA] dosing_guidelines │
│ ▸ "filler vs neurotoxin" 5m   │ - [MANUFACTURER] onset    │
│ ▸ "objection: cost" 1h        │                           │
│                                │ [Save as sample] [Re-run] │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Behavior

- **Does NOT** create a row in `runs` or write to `outputs.downstream` — strictly dry-run
- Calls `POST /agents/{id}/test` with body `{ transcript_id?, transcript_text?, query?, dry_run: true }` (Claude Code will ship this endpoint per `.planning/12 §4.2`)
- Response shape: `{ response, context_used, guardrails_check, sources }`
- For built-in agents, the Test tab is read-only with a banner explaining built-in agents are managed in Python
- Cost estimate uses the price table from `.planning/10 §6 REQ-7` (or hardcode locally)

### 5.3 Save sample feature

- "Save as sample" button captures `{ name, input_text, query, agent_response_preview }` to a new table `ms_agent_test_samples`
- Sample list visible in a sidebar (left of the Input column)
- Click a sample to re-populate the input

### 5.4 Acceptance criteria

- [ ] Test tab visible; hidden for built-in agents
- [ ] Dry-run completes; no `runs` row created (verify by checking `/runs` count before/after)
- [ ] Response, context, compliance, sources all rendered
- [ ] Recent tests strip works (last 5)
- [ ] Save sample persists to `ms_agent_test_samples`

---

## 6. TASK D — RAG source search + filter

This is small. Apply to **every** GL picker in the editor (products, services, concerns, anatomy areas, reference docs).

- **Search input** at top of each picker (debounced 250ms, matches name / brand / aliases / tags)
- **Filter chips** specific to the picker:
  - Products: Manufacturer, Category, Type
  - Services: Service category, Type
  - Reference Docs: Agent type, Word-count band (Under 5K / 5–10K / Over 10K)
  - Concerns / Anatomy: Category
- **"N matching" count** next to search input
- **Empty state**: "No items match the current filters" + Clear button
- **Performance:** queries hit Supabase with proper filters, not client-side
- **Acceptance:** Network tab shows ≤ 1 Supabase query per debounced keystroke

---

## 7. TASK E — Agent versioning

Backend (Claude Code) ships:
- `agents.version`, `agents.last_modified_at`, `agents.last_modified_by` (in §4.3 migration above)
- Trigger that auto-bumps version + timestamp on UPDATE
- New table `agents_audit` populated by trigger
- New endpoint `GET /agents/{id}/history` returning version list

Mid-Stream UI:

- **REQ-V1:** In the agent list view, add a small `v3` badge next to the agent name (where 3 is `version`)
- **REQ-V2:** In the Sync tab, show "Last synced" (already exists from Phase-2) + "Last modified" (`last_modified_at`)
- **REQ-V3:** Add a "Version history" link in the Sync tab. Opens a side panel listing all versions for this agent with `version`, `last_modified_at`, `last_modified_by`, optional `diff_summary`. Each entry expandable to show full diff (read-only).
- **REQ-V4:** On save, toast: "Saved as v{version}"

---

## 8. Sequencing recommendation

1. **Task A** (5 min) — confirm path-rename status, report back
2. **Task B** (knowledge sources panel) — biggest, most valuable; ships independently of backend (extra fields just persist)
3. **Task D** (search + filter) — small, applies to B's pickers, do it as a sub-task of B
4. **Task C** (dry-run test) — once Claude Code ships `POST /agents/{id}/test`
5. **Task E** (versioning) — once Claude Code ships the schema migration + audit table

You can parallelize: B+D in one PR, C in a follow-on PR after backend is ready, E as a third PR.

---

## 9. What Claude Code is shipping in parallel

Claude Code is doing this Prompt Runner work alongside Manus's UI:

- Schema migration adding the 9 new `agents` columns + version trigger + `agents_audit` table
- Path aliases for `/prompts/templates` ↔ `/prompt_templates` (depending on Task A's answer)
- New endpoint `POST /agents/{id}/test` implementing the 5-step context assembly pipeline (products → guardrails → facts → reference docs → prompt → response → guardrail-compliance check)
- New endpoint `GET /agents/{id}/history` for version timeline

Mid-Stream's UI will degrade gracefully when backend isn't deployed yet — show "API unavailable" banners on the Test tab and Version history panel.

---

## 10. Things to NOT do

- Don't rebuild the Phase-2 modal from scratch — extend it
- Don't move the path of `/agents` or any other Phase-2 routes — Mid-Stream URLs stay stable
- Don't make universal guardrails toggleable — the toggle exists but is always on
- Don't fetch all 378 products on picker open — page or filter
- Don't auto-save form changes mid-edit — explicit Save button only (per existing pattern)
- Don't break Phase-2's existing `ms_agent_library_refs` writes — new fields go on `agents`, not in this table
- Don't ship reference-doc full content to the browser unless the user explicitly opens a doc — only fetch slug+title+word_count for the picker; full content fetched on demand (the docs are 3-10K words each, easily 100KB+ payload)

---

## 11. Open questions to surface back

If anything in this doc is unclear or contradicts your existing implementation, flag it before building. Specifically:

1. Path-rename — what does Task A turn up?
2. Multi-tenant guardrails — should `custom_guardrails` be per-agent (current spec) or per-practice? Current spec is per-agent for simplicity. If per-practice is needed, we add a `practice_guardrails` table.
3. Fact-category list extensibility — the doc lists 8 categories. If new categories appear in `gl_product_facts.category` over time, the UI should display them dynamically rather than hardcoding 8 boxes. Recommend `SELECT DISTINCT category FROM gl_product_facts ORDER BY category` to populate the checkbox list.

---

## 12. Acceptance summary across all tasks

When all five tasks ship, a user can:

1. Configure an agent with precise GL knowledge scope: products, fact categories, authority threshold, reference docs, custom guardrails
2. See live context-preview as they configure
3. Dry-run the agent on raw transcript text or an existing transcript, see the response + assembled context + guardrail compliance + source attribution
4. Search any GL picker with manufacturer/category/type filters
5. See agent version, last-modified, and full version history with per-version diff

That's a complete, grounded, auditable agent authoring experience.
