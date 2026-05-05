# Agent Builder — Global Library Integration Requirements

## For: Manus Development Team
## Date: 2026-05-04
## Author: A360 Product Team

---

## 1. Context

A360 has built a **Global Library (GL)** — a structured product intelligence database for aesthetic medicine. It contains:

- **378 products** (injectables, devices, skincare) in `gl_products`
- **1,407 atomic, source-attributed facts** in `gl_product_facts`
- **151 guardrails** (safety rules, compliance constraints) in `gl_product_guardrails`
- **11 agent reference documents** (59K words of domain knowledge) in `agent_reference_docs`
- **A pre-joined view** `v_agent_product_context` that returns everything an agent needs about a product in one query

The agent builder UI should let users create agents that are **grounded in this data** — meaning agents reference specific facts with known provenance, respect guardrails, and weight authoritative sources higher than anecdotal ones.

### Supabase Connection

| Project | Ref | URL |
|---------|-----|-----|
| Global Library | `wvpgmawrizwkmvfnwqfl` | `https://wvpgmawrizwkmvfnwqfl.supabase.co` |

---

## 2. Data Architecture (What Agents Can Reference)

### 2.1 Product Facts (`gl_product_facts`)

Each row is one atomic claim about one product, with full source attribution.

```
id                  UUID
product_id          UUID        → references gl_products.id
category            TEXT        clinical | marketing | sales | pricing | retention | education | business | safety
subcategory         TEXT        indication | contraindication | mechanism | dosing | onset | duration | side_effect | combination | technique | pricing_model | price_range | patient_explanation | ...
fact                TEXT        The atomic statement (1-2 sentences)
detail              TEXT        Extended context (nullable)
source_type         TEXT        manufacturer_website | prescribing_info | clinical_study | pubmed | podcast_corpus | youtube | fda | practice_data
source_name         TEXT        e.g., "www.botoxcosmetic.com" or "PubMed PMID:12345"
source_url          TEXT        Direct link to source
authority           TEXT        fda_approved | manufacturer_official | peer_reviewed | expert_consensus | practitioner_opinion | anecdotal
confidence          FLOAT       0-1 extraction confidence
requires_disclaimer BOOLEAN     If true, agent must add caveat
is_off_label        BOOLEAN     If true, not FDA-approved for this use
is_time_sensitive   BOOLEAN     If true, data may be stale (pricing, availability)
```

**Authority Hierarchy** (agents should weight in this order):
1. `fda_approved` — from FDA labels, highest authority
2. `manufacturer_official` — from manufacturer's own website/documentation
3. `peer_reviewed` — from PubMed or clinical journals
4. `expert_consensus` — from KOL videos, training materials
5. `practitioner_opinion` — from podcast discussions, interviews
6. `anecdotal` — individual case reports, informal sources

### 2.2 Product Guardrails (`gl_product_guardrails`)

Rules that constrain what agents can and cannot say.

```
id                  UUID
product_id          UUID        NULL = applies to ALL products
category            TEXT        NULL = applies to all categories
guardrail_type      TEXT        must_include | must_not_claim | must_disclaim | must_verify | must_refer
rule                TEXT        The actual constraint
reason              TEXT        Why this guardrail exists
severity            TEXT        critical | warning | info
source              TEXT        compliance_policy | fda_label | legal_review | clinical_guideline
is_active           BOOLEAN
```

**Guardrail Types**:
| Type | Agent Behavior |
|------|---------------|
| `must_include` | Agent MUST include this statement in any response about this product |
| `must_not_claim` | Agent MUST NOT make this type of claim |
| `must_disclaim` | Agent must add a disclaimer/caveat when discussing this topic |
| `must_verify` | Agent must confirm this condition is met before recommending |
| `must_refer` | Agent must suggest referral to another professional |

**Severity Levels**:
| Level | Agent Behavior |
|-------|---------------|
| `critical` | Hard block — agent cannot proceed without compliance |
| `warning` | Soft flag — agent should include caveat but can proceed |
| `info` | Context only — agent uses for better responses |

### 2.3 Agent Reference Documents (`agent_reference_docs`)

Comprehensive domain knowledge documents, organized by agent type.

```
slug                TEXT        Unique identifier (e.g., "consultation-mastery")
title               TEXT        Human-readable title
agent_type          TEXT        coaching | clinical | patient_education | reach | business | compliance
category            TEXT        consultation | objections | patient_psychology | sales | clinical | education | retention | marketing | pricing | operations | compliance
tags                TEXT[]      Searchable tags
content             TEXT        Full markdown document (3,000-10,000 words)
word_count          INTEGER
```

**Available Documents**:

| Slug | Agent Type | Words | Use Case |
|------|-----------|-------|----------|
| `consultation-mastery` | coaching | 7,588 | How to run consultations |
| `objection-handling-mastery` | coaching | 3,300 | How to handle patient objections |
| `patient-psychology-behavioral-intelligence` | coaching | 3,966 | Patient personas, intent signals |
| `sales-excellence-framework` | coaching | 9,715 | Complete sales methodology |
| `clinical-protocols-treatment-combinations` | clinical | 3,316 | Treatment sequencing and combinations |
| `patient-education-communication` | patient_education | 4,633 | How to explain procedures to patients |
| `retention-reengagement-followup` | reach | 4,188 | Follow-up timing and re-engagement |
| `marketing-patient-acquisition` | reach | 5,990 | Marketing channels and campaigns |
| `pricing-packaging-membership-strategy` | business | 3,269 | Pricing models and packages |
| `practice-growth-operations` | business | 6,518 | Staffing, compensation, scaling |
| `ethical-standards-compliance` | compliance | 6,813 | HIPAA, scope of practice, regulations |

### 2.4 Products (`gl_products`)

The product catalog.

```
id                  UUID
name                TEXT        Canonical product name
brand_name          TEXT
manufacturer        TEXT
product_type        TEXT
category_id         UUID
description         TEXT
indications         TEXT
contraindications   TEXT
active_ingredients  TEXT
onset_time          TEXT
peak_effect         TEXT
duration_of_effect  TEXT
dosing_guidelines   TEXT
```

### 2.5 Pre-Joined View (`v_agent_product_context`)

**One query returns everything an agent needs about a product:**

```sql
SELECT * FROM v_agent_product_context WHERE product_id = '<uuid>';
```

Returns:
- `product_name`, `manufacturer`, `brand_name`
- `clinical_facts` — JSONB array, sorted by authority (highest first)
- `safety_facts` — JSONB array, sorted by authority
- `marketing_facts` — JSONB array
- `pricing_facts` — JSONB array (with `is_time_sensitive` flags)
- `education_facts` — JSONB array
- `guardrails` — JSONB array of all applicable rules (universal + product-specific)

---

## 3. UI Requirements — Agent Builder

### 3.1 Agent Definition Screen

The agent builder should let users define an agent with these sections:

**A. Identity & Purpose**
- Agent name
- Agent type (dropdown): coaching, clinical, patient_education, reach, business, compliance
- Description / purpose statement
- System prompt (editable text area)

**B. Knowledge Sources Panel**

This is the key integration point. The user should be able to attach GL data to the agent:

**Product Scope Selector**
- Multi-select list of products from `gl_products`
- Filter by manufacturer, category, product type
- Option: "All products" (agent can reference any product)
- Option: "Practice products only" (filter by practice's catalog)

**Fact Categories Selector**
- Checkboxes for which fact categories the agent can access:
  - [ ] Clinical (indications, contraindications, dosing, mechanism)
  - [ ] Safety (side effects, warnings, adverse events)
  - [ ] Marketing (positioning, messaging, seasonal angles)
  - [ ] Sales (consultation scripts, objection handling)
  - [ ] Pricing (price ranges, packages, membership models)
  - [ ] Education (patient explanations, analogies, expectations)
  - [ ] Business (ROI, staffing, inventory, operations)
  - [ ] Retention (rebooking, follow-up, re-engagement)

**Authority Threshold Selector**
- Slider or dropdown: minimum authority level for facts this agent can cite
  - All sources (including anecdotal)
  - Practitioner opinion and above (default)
  - Expert consensus and above
  - Peer-reviewed and above
  - Manufacturer official and above
  - FDA-approved only (most restrictive)

**Reference Documents Selector**
- Multi-select from `agent_reference_docs`
- Auto-suggest based on agent type (e.g., coaching agent → consultation-mastery, objection-handling, patient-psychology, sales-excellence)
- Show word count so user understands context load

**C. Guardrails Panel**

- Toggle: "Apply universal guardrails" (on by default — should NOT be turnable off)
- Toggle: "Apply product-specific guardrails" (on by default)
- Read-only display of applicable guardrails based on selected products
- Severity indicators: red badge for `critical`, yellow for `warning`
- Custom guardrails: user can add practice-specific rules (e.g., "Never mention competitor pricing")

### 3.2 Agent Preview / Test Panel

After configuration, the user should be able to test the agent with a sample query and see:

1. The **assembled context** — what facts, guardrails, and reference docs were injected into the prompt
2. The **agent response** — what the agent generated
3. **Guardrail compliance check** — did the response violate any guardrails? (highlight violations in red)
4. **Source attribution** — which facts were used, with source links

### 3.3 Agent List / Dashboard

- List of all configured agents
- For each: name, type, product scope, last tested, status
- Quick actions: edit, duplicate, test, activate/deactivate

---

## 4. Backend Requirements

### 4.1 Agent Context Assembly

When an agent receives a query, the backend must assemble its context from the GL. The assembly order matters:

```
STEP 1: Identify relevant products
  - From query content (NER or keyword match)
  - From agent's product scope configuration
  - From conversation context (if multi-turn)

STEP 2: Fetch guardrails (ALWAYS — before anything else)
  - Universal guardrails: SELECT * FROM gl_product_guardrails WHERE product_id IS NULL AND is_active = TRUE
  - Product guardrails: SELECT * FROM gl_product_guardrails WHERE product_id IN (<product_ids>) AND is_active = TRUE
  - Custom practice guardrails (from agent config)

STEP 3: Fetch relevant facts
  - Filter by: product_id, category (from agent config), authority >= threshold
  - Sort by authority (highest first)
  - Cap at reasonable context budget (e.g., top 50 facts per product)
  
  SELECT * FROM gl_product_facts
  WHERE product_id IN (<product_ids>)
    AND category IN (<agent_categories>)
    AND authority >= '<threshold>'
  ORDER BY
    CASE authority
      WHEN 'fda_approved' THEN 1
      WHEN 'manufacturer_official' THEN 2
      WHEN 'peer_reviewed' THEN 3
      WHEN 'expert_consensus' THEN 4
      WHEN 'practitioner_opinion' THEN 5
      WHEN 'anecdotal' THEN 6
    END
  LIMIT 50;

STEP 4: Fetch reference documents
  - From agent's reference doc configuration
  - Full content or relevant excerpts (depending on context budget)
  
  SELECT content FROM agent_reference_docs
  WHERE slug IN (<agent_doc_slugs>);

STEP 5: Assemble the prompt
  - System prompt = agent's system prompt + guardrails block + reference doc excerpts
  - Context = sourced facts (with authority labels)
  - User message = the actual query
```

### 4.2 Prompt Assembly Template

The backend should inject GL data into the agent prompt in this format:

```
=== GUARDRAILS (you MUST follow these) ===

CRITICAL:
- [guardrail rule 1]
- [guardrail rule 2]

WARNING:
- [guardrail rule 3]

=== PRODUCT CONTEXT: {product_name} ===

CLINICAL FACTS (sorted by authority):
- [MANUFACTURER] {fact} (source: {source_name})
- [PEER-REVIEWED] {fact} (source: {source_name})
- [PRACTITIONER] {fact} (source: {source_name})

SAFETY FACTS:
- [MANUFACTURER] {contraindication} 
- [FDA] {safety warning}

PRICING FACTS (⚠️ time-sensitive — may not reflect current rates):
- [PRACTITIONER] {pricing fact}

=== REFERENCE KNOWLEDGE ===

{reference document content — truncated to fit context}

=== INSTRUCTIONS ===

When responding:
1. Prioritize facts marked [FDA] and [MANUFACTURER] over [PRACTITIONER]
2. If citing [PRACTITIONER]-sourced information, add: "Based on industry practice..."
3. If a fact has requires_disclaimer=true, add: "Verify with manufacturer labeling."
4. If a fact has is_off_label=true, add: "This is an off-label use not approved by the FDA."
5. NEVER violate a CRITICAL guardrail.
6. For WARNING guardrails, include the recommended caveat.
```

### 4.3 Response Validation (Post-Generation)

After the agent generates a response, the backend should:

1. **Check guardrail compliance**:
   - Scan response for violations of `must_not_claim` rules
   - Verify `must_include` statements are present
   - Flag if `must_verify` conditions weren't checked
   
2. **Attach source attribution**:
   - For each claim in the response, identify which fact(s) it's based on
   - Return source metadata alongside the response
   
3. **Flag confidence levels**:
   - If the response relies primarily on `practitioner_opinion` facts, flag as "based on industry experience"
   - If grounded in `manufacturer_official` or higher, flag as "based on manufacturer/clinical data"

### 4.4 API Endpoints

The agent builder backend should expose:

```
GET  /api/gl/products
  → List products (with filters: manufacturer, category, type)
  → Used by: Product Scope Selector

GET  /api/gl/products/:id/facts
  → All facts for a product, grouped by category, sorted by authority
  → Used by: Agent Preview, Context Assembly

GET  /api/gl/products/:id/guardrails
  → All guardrails for a product (universal + product-specific)
  → Used by: Guardrails Panel, Context Assembly

GET  /api/gl/products/:id/context
  → Pre-assembled agent context (facts + guardrails + product info)
  → Uses the v_agent_product_context view
  → Used by: Context Assembly at inference time

GET  /api/gl/reference-docs
  → List available reference documents (with agent_type filter)
  → Used by: Reference Documents Selector

GET  /api/gl/reference-docs/:slug
  → Full document content
  → Used by: Context Assembly

POST /api/gl/agents/:id/test
  → Test an agent with a sample query
  → Body: { "query": "...", "product_ids": [...] }
  → Returns: { "response": "...", "context_used": {...}, "guardrail_check": {...}, "sources": [...] }

POST /api/gl/agents/:id/validate
  → Validate a response against guardrails
  → Body: { "response": "...", "product_ids": [...] }
  → Returns: { "violations": [...], "warnings": [...], "compliance_score": 0.95 }
```

---

## 5. Data Queries for Common Agent Scenarios

### Scenario 1: Patient asks about BOTOX during consultation

```sql
-- Get clinical and education facts for BOTOX, manufacturer-level and above
SELECT fact, authority, source_name, requires_disclaimer
FROM gl_product_facts
WHERE product_id = '68639b72-1baf-4444-a2d1-b7ab66f238b1'
  AND category IN ('clinical', 'education', 'safety')
  AND authority IN ('fda_approved', 'manufacturer_official', 'peer_reviewed')
ORDER BY CASE authority
  WHEN 'fda_approved' THEN 1
  WHEN 'manufacturer_official' THEN 2
  WHEN 'peer_reviewed' THEN 3
END;
```

### Scenario 2: Coaching agent evaluating a consultation

```sql
-- Get the consultation mastery reference doc
SELECT content FROM agent_reference_docs WHERE slug = 'consultation-mastery';

-- Get objection handling reference
SELECT content FROM agent_reference_docs WHERE slug = 'objection-handling-mastery';

-- Get product-specific sales facts for products discussed
SELECT fact, subcategory FROM gl_product_facts
WHERE product_id IN (<discussed_product_ids>)
  AND category = 'sales';
```

### Scenario 3: Reach agent generating follow-up email

```sql
-- Get retention reference doc
SELECT content FROM agent_reference_docs WHERE slug = 'retention-reengagement-followup';

-- Get product-specific marketing and retention facts
SELECT fact, category FROM gl_product_facts
WHERE product_id IN (<treatment_product_ids>)
  AND category IN ('marketing', 'retention', 'education');

-- Get pricing facts (with time-sensitivity flag)
SELECT fact, is_time_sensitive FROM gl_product_facts
WHERE product_id IN (<treatment_product_ids>)
  AND category = 'pricing';
```

### Scenario 4: TCP agent building a treatment plan

```sql
-- Get the full product context view (everything in one query)
SELECT * FROM v_agent_product_context
WHERE product_id IN (<candidate_product_ids>);

-- Get clinical protocols reference
SELECT content FROM agent_reference_docs WHERE slug = 'clinical-protocols-treatment-combinations';

-- Get guardrails for all candidate products
SELECT * FROM gl_product_guardrails
WHERE (product_id IN (<candidate_product_ids>) OR product_id IS NULL)
  AND is_active = TRUE;
```

---

## 6. Data Volume & Performance

| Table | Current Rows | Expected Growth | Query Pattern |
|-------|-------------|----------------|---------------|
| `gl_products` | 378 | 500+ | Filter by manufacturer/category |
| `gl_product_facts` | 1,407 | 5,000+ (as more sources processed) | Filter by product_id + category, sort by authority |
| `gl_product_guardrails` | 151 | 300+ | Filter by product_id (including NULL for universal) |
| `agent_reference_docs` | 11 | 20-30 | Fetch by slug or agent_type |
| `v_agent_product_context` | 378 (view) | — | Single-row fetch by product_id |

**Performance Notes**:
- All tables are indexed on `product_id` and key filter columns
- The view `v_agent_product_context` does aggregation at query time — for production, consider materializing or caching
- Reference docs are large (3-10K words each) — fetch selectively, not all at once
- Facts table will grow as we add PubMed, YouTube, and more manufacturer data — plan for 10K+ rows

---

## 7. UI Mockup — Agent Knowledge Configuration

```
┌──────────────────────────────────────────────────────────────┐
│  Agent: Consultation Coach v2                    [Save] [Test]│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Product Scope ─────────────────────────────────────────┐ │
│  │ ○ All products  ● Selected products  ○ Practice only    │ │
│  │                                                         │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ ☑ BOTOX Cosmetic (Allergan)                        │ │ │
│  │ │ ☑ Juvederm (Allergan)                              │ │ │
│  │ │ ☑ Sculptra (Galderma)                              │ │ │
│  │ │ ☑ Morpheus8 (InMode)                               │ │ │
│  │ │ ☐ CoolSculpting Elite (Allergan)                   │ │ │
│  │ │ ☐ Halo (Sciton)                                    │ │ │
│  │ │ [Search products...]                                │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Fact Categories ───────────────────────────────────────┐ │
│  │ ☑ Clinical    ☑ Safety    ☑ Education                   │ │
│  │ ☑ Sales       ☐ Pricing   ☐ Marketing                   │ │
│  │ ☐ Business    ☐ Retention                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Authority Threshold ───────────────────────────────────┐ │
│  │ Minimum authority level:                                 │ │
│  │ ○ FDA Only  ○ Manufacturer+  ● Peer-reviewed+           │ │
│  │ ○ Expert+   ○ Practitioner+  ○ All sources               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Reference Documents ───────────────────────────────────┐ │
│  │ Auto-suggested for coaching agent:                       │ │
│  │ ☑ Consultation Mastery (7,588 words)                     │ │
│  │ ☑ Objection Handling Mastery (3,300 words)               │ │
│  │ ☑ Patient Psychology (3,966 words)                       │ │
│  │ ☑ Sales Excellence Framework (9,715 words)               │ │
│  │ ☐ Clinical Protocols (3,316 words)                       │ │
│  │ ☐ Patient Education (4,633 words)                        │ │
│  │                                     Context: 24,569/30K  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Active Guardrails (read-only) ─────────────────────────┐ │
│  │ 🔴 CRITICAL (12):                                        │ │
│  │   • No off-label claims without FDA authority             │ │
│  │   • Must verify contraindications before recommending     │ │
│  │   • Licensed healthcare provider must perform procedure   │ │
│  │   • BOTOX: verify no history of botulinum sensitivity     │ │
│  │   • Sculptra: verify no active skin infection             │ │
│  │   [Show all 12...]                                        │ │
│  │                                                           │ │
│  │ 🟡 WARNING (3):                                           │ │
│  │   • Disclaim pricing data as approximate                  │ │
│  │   • Disclaim combination protocols as practitioner-based  │ │
│  │   • Individual results vary                               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Non-Functional Requirements

### Security
- GL data access requires authenticated Supabase connection with service role key
- Agent configurations should be stored per-practice (multi-tenant)
- Guardrails cannot be disabled by end users — only by admin role
- Audit log every agent configuration change

### Performance
- Agent context assembly should complete in <500ms
- Cache product facts and guardrails (5-minute TTL) — facts don't change frequently
- Reference docs can be cached longer (1-hour TTL)
- The `v_agent_product_context` view may need materialization for >100 concurrent agents

### Data Freshness
- Facts with `is_time_sensitive=true` should display a "last updated" indicator in UI
- Reference docs show `updated_at` timestamp
- Agent builder should warn if referenced data is >90 days old

### Extensibility
- The fact category list will grow (new categories as new sources are added)
- Authority levels may gain new tiers (e.g., `clinical_guideline` between `peer_reviewed` and `expert_consensus`)
- New guardrail types may be added
- Design the schema queries to be additive, not hardcoded to current values
