# Content Delivery Agents — Requirements (patient education + marketing + clinical context)

**Date:** 2026-05-04
**Audience:** Claude Code (Prompt Runner backend, Supabase seed) and Manus (Mid-Stream + prototype UI)
**Goal:** Surface relevant content (videos, images, PDFs, product comparisons, clinical references) to **patients** and **clinicians** via agents that pull from the Global Library. The agent decides *what* content to show; the user just gets the right thing in front of them.

This supersedes workstream 04 (TCP Content) with a richer scope: not just the TCP page, but every surface where a patient or doctor could benefit from grounded media.

---

## 1. Goals

- **G1.** A patient sees the right education content for their concerns and treatments — automatically curated by an agent, not hand-picked.
- **G2.** A patient sees the right marketing content (testimonials, case studies, before/after) tied to their interests, with appropriate handoff between aspirational and educational tone.
- **G3.** A clinician sees the right clinical context for the patient in front of them: contraindications, dosing references, prescribing info, comparison data — surfaced before they have to ask.
- **G4.** Content includes images, YouTube videos, PDFs, and structured product-comparison cards — not just text.
- **G5.** Every content recommendation is grounded in GL data (`gl_product_content`, `gl_service_content`, etc.) — no hallucinated URLs.
- **G6.** Agents are evaluatable (workstream 10) — "is this the right content for this patient?" can be scored.
- **G7.** Content can be authored once in the GL and reused across surfaces (TCP, patient portal, clinician dashboard, takeaway pack).

---

## 2. Audiences and surfaces

| Audience | Surface | Tone | Content mix |
|----------|---------|------|-------------|
| Patient | TCP Builder "Education" section (already exists, sparse) | Reassuring, plain-language | photos, B/A, videos, pre/post instructions |
| Patient | TCP Builder "Marketing" section (new) | Aspirational, social-proof | testimonials, case studies, ad creative, social posts |
| Patient | Patient Takeaway Pack (new — printable / shareable bundle) | Both | curated mix of education + light marketing |
| Patient | Patient Portal (future, out of scope here) | Both | full library access |
| Clinician | RunDetailPage / TCP Builder "Clinical Context" panel (new) | Technical, dense | prescribing info, contraindications, dosing, recent literature, comparison tables |
| Clinician | In-consult clinician dashboard (future) | Real-time | live recommendations during a visit |

The agents we design here serve all four current surfaces. The two future ones reuse the same agents.

---

## 3. The four agent types

Builds on the agent-type taxonomy from workstream 08. All four are `type: prompt_template` or `type: prompt_pipeline` agents, so they fit existing infrastructure.

### 3.1 Patient Education Agent (`patient_education_agent`)

| Field | Value |
|-------|-------|
| Type | `prompt_template` |
| Inputs | Selected concerns, anatomy areas, selected treatments (from TCP), patient context |
| Outputs | List of education-content cards: `{ content_id, title, kind, source_url, thumbnail_url, why_relevant }` |
| GL scope | `gl_product_content`, `gl_service_content`, `gl_products` (instructions), `gl_services` (instructions, expected_outcomes, recovery_timeline) |
| Tone | Reassuring, plain-language, evidence-based |

The agent's job: rank GL content by relevance to the patient's concerns + selected treatments. Surface 4–8 items per treatment. Always include pre/post instructions if a treatment is in the plan.

### 3.2 Patient Marketing Agent (`patient_marketing_agent`)

| Field | Value |
|-------|-------|
| Type | `prompt_template` |
| Inputs | Selected concerns + treatments, patient interests (Pass-1 extraction), motivating events (vacation, wedding) |
| Outputs | Marketing-content cards: testimonials, case studies, B/A galleries, social proof |
| GL scope | `gl_product_content` (notes, video_urls, document_urls), `gl_service_content`, plus a new optional `gl_marketing_content` table for testimonial/case-study assets |
| Tone | Aspirational, social-proof |

Differentiated from education by tone and source. Education = "what will happen and how to prepare." Marketing = "this is the result you want."

### 3.3 Clinical Context Agent (`clinical_context_agent`)

| Field | Value |
|-------|-------|
| Type | `prompt_pipeline` (2-step: retrieve + synthesize) |
| Inputs | Patient concerns + treatments + clinical history fields (allergies, contraindications, current medications), the practice's clinical preferences |
| Outputs | Clinical context bundle: contraindication flags, dosing references, prescribing-info links, comparable-product table, recent-literature cards |
| GL scope | `gl_products` (contraindications, dosing_guidelines, indications, FDA-related fields), `gl_services` (clinical_protocols), `gl_categories`. Plus pharma-PDF index from `C:\Projects\Accuracy/pdf_inventory.json` (if surfaced via Supabase) |
| Tone | Technical, dense, citation-forward |

The clinical agent's most important job is **flagging contraindications**. If the agent finds a contraindication, it should be the first card in the output, marked critical.

### 3.4 Product Comparison Agent (`product_comparison_agent`)

| Field | Value |
|-------|-------|
| Type | `prompt_template` |
| Inputs | A list of 2–4 product/service IDs + the patient's concerns |
| Outputs | Comparison table: per-product fields side-by-side (price, recovery, FDA indications, downtime, sessions needed, contraindications) + a recommended choice with rationale |
| GL scope | `gl_products`, `gl_services`, `gl_product_concerns`, `gl_service_concerns` (relevance scoring) |
| Tone | Patient-facing version: simple. Clinician-facing version: full data. Driven by `audience` parameter on the call. |

Used in two contexts:
- TCP Builder "Patient comparison" section: "Botox vs Daxxify — which is right for you?"
- Clinician panel "Clinical comparison": full data dump with contraindication overlay

Single agent, two output rendering modes.

---

## 4. Content data model

### 4.1 Existing GL tables — what we already have

From workstream 08 audit and the TCP requirements doc:

| Table | Status | Useful fields for content delivery |
|-------|--------|-----------------------------------|
| `gl_products` | 371 rows ✓ | description, indications, contraindications, dosing_guidelines, pre_procedure_instructions, post_procedure_instructions |
| `gl_services` | 126 rows ✓ | description, expected_outcomes, recovery_timeline, pre/post_procedure_instructions |
| `gl_product_content` | **empty** ❌ | logo_url, notes, video_urls, document_urls, prescribing_info_url, patient_brochure_url, training_video_url, consult_reference |
| `gl_service_content` | **empty** ❌ | same structure |
| `gl_concerns` | 28 rows ✓ | label, category, aliases, commonly_in_areas, typical_treatments |
| `gl_anatomy_areas` | 23 rows ✓ | label, sub_areas, related_concerns |

The two `*_content` tables are the most valuable for this workstream and they're empty. **Seeding them is a prerequisite for the patient-education and patient-marketing agents to do anything real.**

### 4.2 Proposed new tables

Three new tables to round out the content surface:

```sql
-- Marketing content beyond what fits in *_content tables
CREATE TABLE gl_marketing_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,                  -- 'testimonial' | 'case_study' | 'before_after' | 'social_post' | 'ad_creative'
  title TEXT,
  body TEXT,                            -- text content if any
  image_urls TEXT[],
  video_url TEXT,
  source_url TEXT,                      -- canonical web URL
  anonymized BOOLEAN DEFAULT TRUE,      -- PHI hygiene
  -- Targeting
  targets_concerns UUID[] REFERENCES gl_concerns(id),
  targets_products UUID[] REFERENCES gl_products(id),
  targets_services UUID[] REFERENCES gl_services(id),
  targets_anatomy UUID[] REFERENCES gl_anatomy_areas(id),
  -- Metadata
  source_practice_id UUID,              -- if practice-contributed
  patient_consent_on_file BOOLEAN DEFAULT FALSE,
  approved_for_use BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clinical reference materials
CREATE TABLE gl_clinical_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,                  -- 'prescribing_info' | 'fda_safety' | 'paper' | 'protocol' | 'comparison_chart'
  title TEXT NOT NULL,
  description TEXT,
  source_url TEXT NOT NULL,
  document_pdf_url TEXT,
  -- Targeting
  about_products UUID[] REFERENCES gl_products(id),
  about_services UUID[] REFERENCES gl_services(id),
  -- Metadata
  publication_date DATE,
  authority_tier INT DEFAULT 3,         -- 1=FDA/manufacturer, 2=peer-reviewed, 3=secondary, 4=informal
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-baked comparison tables — caches Product Comparison Agent outputs
CREATE TABLE gl_comparison_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                   -- e.g., 'Botox vs Daxxify vs Dysport'
  audience TEXT DEFAULT 'patient',      -- 'patient' | 'clinician'
  product_ids UUID[],
  service_ids UUID[],
  comparison_data JSONB,                -- the rendered comparison table
  created_at TIMESTAMPTZ DEFAULT NOW(),
  refreshed_at TIMESTAMPTZ              -- last regenerated by the agent
);
```

### 4.3 Content pack — what to render

The agents return a normalized "content pack" that all rendering surfaces understand:

```ts
interface ContentPack {
  audience: 'patient' | 'clinician';
  for_treatment_id?: string;            // when scoped to a single treatment
  cards: ContentCard[];
}

interface ContentCard {
  id: string;
  kind: 'image' | 'video' | 'pdf' | 'text' | 'comparison_table' | 'instruction_list' | 'contraindication_alert';
  title: string;
  description?: string;
  source: {
    table: 'gl_product_content' | 'gl_service_content' | 'gl_marketing_content' | 'gl_clinical_references' | 'gl_comparison_views';
    row_id: string;
    url?: string;                       // for embeds
    thumbnail_url?: string;
  };
  why_relevant: string;                 // the agent's rationale, 1-2 sentences
  authority?: 'manufacturer' | 'peer_reviewed' | 'practice_curated' | 'patient_testimonial';
  warning_level?: 'critical' | 'caution' | null;  // for clinical alerts
}
```

The renderer is dumb: given a `ContentCard`, it knows how to display it based on `kind`. The agent is smart: it picks which cards belong in the pack.

---

## 5. Agent prompt patterns (sketch)

### 5.1 Patient Education Agent prompt skeleton

```
You are a patient education curator at a medical aesthetics practice.

Patient context:
- Concerns: {concerns}
- Selected treatments: {treatments}
- Goals: {goals}
- Visit type: {visit_type}

Available education content from the practice's library:
{gl_product_content_rows}
{gl_service_content_rows}
{gl_products_instructions}

Task: select 4–8 content items from the available content that are most relevant.
For each item, write a one-sentence "why_relevant" explaining why this patient
should see this content. Prioritize content tied to selected treatments.

Always include pre-procedure and post-procedure instructions if those exist
for the selected treatments.

Output JSON matching the ContentPack schema with audience='patient'.
```

### 5.2 Clinical Context Agent prompt skeleton (step 1 of pipeline)

```
You are a clinical decision support agent at a medical aesthetics practice.
Patient information:
- Allergies: {allergies}
- Current medications: {medications}
- Selected treatments: {treatments}

Available clinical references:
{gl_products_clinical_fields}
{gl_clinical_references_rows}

Step 1: Check for contraindications between any patient factor and any
selected treatment. List each as a Critical alert with the specific
reference URL.

Step 2: For each treatment, surface the most relevant prescribing info,
dosing reference, and any comparable products in the same class.

Output: structured list of cards, contraindications first, then references.
```

The 2-step pipeline lets us chain a deterministic safety check (step 1) with a more freeform synthesis (step 2). This matches the `prompt_pipeline` agent type from workstream 08.

---

## 6. Where content lives in the UI

### 6.1 TCP Builder enhancements (replaces workstream 04)

Add to `demo-tcp-builder.html` (prototype) and the production TCP page:

1. **Education section per treatment** — currently has placeholder thumbnails. Replace with real `ContentCard` rendering driven by `patient_education_agent` output. Already wired in the prototype's REC structure.

2. **Marketing section per treatment** — new. Below education. Cards rendered from `patient_marketing_agent` output. Always-collapsed by default; expand reveals 2–6 cards.

3. **Clinical context drawer** — new. Right-side slide-out drawer, clinician-only. Shows `clinical_context_agent` output for the entire plan. Critical contraindication alerts appear at top of the drawer with red border + acknowledgment checkbox.

4. **Patient comparison cards** — new. When the plan has 2+ treatments addressing the same concern, surface a "How these compare for you" expandable card driven by `product_comparison_agent` (audience=patient).

### 6.2 RunDetailPage (Mid-Stream) enhancements

Add a "Clinical Context" tab on the run detail page (clinician-only). Renders the `clinical_context_agent` output for the run's extracted patient + treatments. Visible only if the run has a confirmed treatment plan.

### 6.3 Patient Takeaway Pack (new, prototype + future production)

A new printable / shareable view that bundles:
- Visit summary (1 page)
- Per-treatment education cards (selectable — patient checks "include this")
- Pre/post instructions (always included if treatment is on the plan)
- Pricing summary (already in TCP)
- Follow-up schedule (already in TCP)

UI: a sidebar in the TCP Builder labeled "Build Takeaway Pack". User toggles which content cards to include. Click "Generate Pack" → opens a print-styled HTML page. PDF export via `usePrintTCPtoPDF` (already exists in production a360-web-app).

---

## 7. Phasing

| Phase | What | Who |
|-------|------|-----|
| **P-0** | Seed `gl_product_content` and `gl_service_content` for ~10 priority products + ~10 priority services. Real video URLs + PDF links + sample B/A photos (anonymized). Without this seed, the patient-education agent has nothing to recommend. | User / Claude Code |
| **P-1** | Define the 4 agents in the new Agent Manager (workstream 09 must be at least Phase-2 for this). Wire them into Prompt Runner via the `prompt_template` / `prompt_pipeline` types from workstream 08. | Claude Code (Prompt Runner) |
| **P-2** | Replace TCP Builder Education placeholders with `ContentCard` rendering driven by `patient_education_agent`. Prototype-only first; production behind a feature flag. | Manus + Claude Code |
| **P-3** | Add Marketing section to TCP Builder. Requires `gl_marketing_content` table seeded with 5–10 anonymized testimonials/case studies for at least one beta practice. | Claude Code (DDL + seed) + Manus (UI) |
| **P-4** | Add Clinical Context drawer + Critical Alert presentation. New `gl_clinical_references` table + minimal seed for the top 5 prescription drugs in catalog (Botox, Daxxify, Dysport, Juvederm, Restylane). | Claude Code + Manus |
| **P-5** | Add Patient Comparison cards in TCP. Cache outputs in `gl_comparison_views` for the 10 most common comparison sets. | Claude Code + Manus |
| **P-6** | Patient Takeaway Pack — bundle + print export. | Manus (prototype first, then production) |

P-0 is gating. **No agent in this workstream produces useful output until the GL content tables have data.** Anything before that is staging on placeholder content. The current TCP Builder prototype works because it uses staged content; the real version doesn't.

---

## 8. Manus-ready instructions (Phase P-2 only — when ready)

> **Manus task: replace TCP Builder Education section with agent-driven content cards**
>
> Pre-reqs: workstream-09 Phase-1 has shipped (Agent Manager Mid-Stream UI exists), workstream-08 Phase-2/3 backend has shipped (`prompt_template` agents work via `/run_downstream`), `patient_education_agent` row has been created, `gl_product_content` / `gl_service_content` have seed data for at least the products/services in the Lumiere golden run.
>
> 1. **Create `src/components/content/ContentCard.tsx`** — renders a single `ContentCard` per the schema in §4.3. Switch on `card.kind`:
>    - `image`: `<img src={source.url} />` with caption
>    - `video`: lazy-loaded YouTube iframe if URL contains `youtube.com`/`youtu.be`, else `<video>` element
>    - `pdf`: `<embed>` with thumbnail + open-in-new-tab fallback
>    - `text`: rich text block
>    - `comparison_table`: render the `comparison_data` JSONB as a styled table
>    - `instruction_list`: bulleted list with sub-headers for pre / post
>    - `contraindication_alert`: red bordered alert card with acknowledge checkbox
>
> 2. **Create `src/components/content/ContentPack.tsx`** — renders a list of `ContentCard`s with optional grouping by `for_treatment_id`.
>
> 3. **In the TCP Builder page** (find the existing Education section), replace placeholder thumbnails with `<ContentPack pack={educationPack} />`. Fetch `educationPack` by:
>
>    ```ts
>    const educationPack = await agentsApi.runDownstream({
>      run_id: tcp.run_id,
>      module_id: 'patient_education_agent',
>      selected_outputs: tcp.treatments.map(t => t.id),
>    });
>    ```
>
> 4. **Add a loading + error state.** When the agent is mid-run, show a skeleton loader. On error, fall back to the existing placeholder rendering with a small "automated content unavailable" banner.
>
> 5. **No new API service file needed** — `agentsApi.runDownstream` from workstream-09 already returns the agent output.
>
> 6. **Acceptance criteria:**
>    - [ ] TCP Builder Education section shows real content cards from `gl_product_content` for the Lumiere golden run
>    - [ ] At least one of: image, video, PDF rendering modes is exercised
>    - [ ] Skeleton loader appears during agent fetch
>    - [ ] Error fallback works when the agent endpoint returns 4xx/5xx
>    - [ ] Component accepts a `audience` prop (`patient` | `clinician`) and the rendering adjusts (denser layout for clinician)

Phases P-3 through P-6 will get their own dedicated Manus instructions when those backend pieces land.

---

## 9. The clinical contraindication safety case

Of all the surfaces this workstream adds, the clinical alerts have the highest stakes — a missed contraindication can cause real harm. Some safeguards baked into the design:

- **Step 1 of the pipeline is a deterministic check**, not a freeform LLM judgment. The Clinical Context Agent's first step is "given allergies + medications + treatments, is there a known contraindication in `gl_products.contraindications`?" That step uses keyword + structured matching, not the LLM.
- **The LLM only runs on step 2** (synthesizing the surfaced references). Step 1's flags are passed through verbatim.
- **All clinical content has an `authority_tier`** — 1=FDA/manufacturer is preferred. The agent's output ranks tier-1 sources first.
- **Acknowledgment checkbox** on every Critical alert. The clinician must affirmatively dismiss before the TCP can be marked ready-to-present.
- **Audit log** — every clinical-content view + acknowledgment is logged to a new `clinical_alert_acknowledgments` table for compliance review.

Worth treating this surface as in scope for HIPAA / clinical risk review before going to production.

---

## 10. Evaluation (workstream 10 ties in)

Each agent gets eval rubrics in workstream 10:

| Agent | Rubrics |
|-------|---------|
| `patient_education_agent` | Relevance to concerns, plain-language tone, source authority, completeness (pre/post instructions present) |
| `patient_marketing_agent` | Relevance, social-proof quality, anonymization compliance, tone match |
| `clinical_context_agent` | **Contraindication recall** (highest weight), citation accuracy, technical depth, concision |
| `product_comparison_agent` | Field completeness, recommendation rationale, audience-appropriate language |

The contraindication recall metric for the clinical agent is critical — false negatives are dangerous. Recommend running the clinical agent through eval gates with a higher threshold (≥ 9.0/10) before any production rollout.

---

## 11. Open questions for the user

1. **Content seeding pace.** P-0 requires real content URLs in `gl_product_content`. Does the practice (or beta clients) have ready-to-use videos / PDFs for top products, or do we need a content-acquisition workstream first?
2. **Marketing content sourcing.** Testimonials + case studies require patient consent. Do beta practices have a consent-capture workflow today, or do we need to design that?
3. **Clinical reference depth.** Tier-1 (FDA / manufacturer) only, or do we ingest peer-reviewed papers too? `C:\Projects\Accuracy/pdf_inventory.json` already has 1,000+ PDFs cataloged from pharma sources — could be the seed for `gl_clinical_references`.
4. **Audience switching.** Single TCP page that toggles audience between patient and clinician (one user clicks a button), or two separate pages?
5. **Patient takeaway pack delivery.** Print only, or also email + SMS share?
6. **Prototype-first vs Mid-Stream-first.** Do we build the content rendering in the prototype (a360-demo) first as a showcase, or in Mid-Stream first as the production path? The prototype is faster but doesn't ship to clinicians directly.

---

## 12. Document map

| Doc | Concern |
|-----|---------|
| 08-AGENT-BUILDER.md | Agent type taxonomy + Prompt Runner extensions |
| 09-AGENT-MANAGER-MANUS-REQUIREMENTS.md | Mid-Stream Agent Manager UI |
| 10-EVAL-FRAMEWORK-REQUIREMENTS.md | LLM-as-judge evaluation suite |
| **11 (this doc)** | **Content delivery agents — what they produce and where it renders** |

11 depends on 08+09 for agent infrastructure and 10 for evaluating safety-critical clinical agents. Independent of 06 (Mid-Stream integration) and 07 (Mid-Stream evaluation).
