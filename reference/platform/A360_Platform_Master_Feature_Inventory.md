# A360 Platform: Master Feature & Intelligence Inventory

**Date:** 2026-05-02 | **Author:** Claude Code (synthesized from 2 years of NewCO documents)  
**Purpose:** Comprehensive dump of all platform features, agents, infrastructure, and ideas — cross-referenced against current production state. Not a source of truth. A reference for future planning and identifying gaps.

**Sources scanned:** 200+ documents across `C:\Users\Chris\Dropbox\NewCO`, 8 major folder trees, 3+ levels deep. 1,014 lines of raw extraction across two domain-specific reports.

---

## How to Use This Document

This is an **inventory, not a plan.** It captures everything that has been envisioned, designed, prototyped, or discussed for A360 over the past 2 years. Use it to:

- Check whether a "new idea" was already explored
- Find the source document for a feature concept
- Identify what's built vs. designed vs. conceptual
- Feed agent improvement work with missing context
- Inform roadmap priorities with full visibility into what exists

---

## 1. Platform Products (5 Core)

| Product | Status | What It Does |
|---------|--------|-------------|
| **Scribe** | Production | Real-time transcription via Deepgram Nova-3, speaker diarization, medical vocabulary boosting (29K+ terms), Comprehend Medical NER, fuzzy-match correction, DynamoDB storage with 90-day TTL |
| **Consult** | Production | AI-generated SOAP notes (3 variants: general, explant, venous), provider-customizable output (language, detail level, perspective), single-shot Bedrock pattern |
| **TCP** | Production (slow) | Treatment & Care Plan with Good/Better/Best tiers, multi-agent architecture, HITL checkpoints, pricing logic. Currently takes 2-5 min to generate — commercially unviable in current form |
| **Reach** | Partial | Opportunity extraction + email follow-up. Email generation works. Automated delivery not at scale. CRM integration (GHL) done. HIPAA-compliant dual-zone architecture designed |
| **Intelligence** | Conceptual/Partial | 25+ KPI evaluation agents designed. Deterministic scoring running in Prompt Runner. LLM-based evaluation frameworks documented but not deployed as production agents |

---

## 2. Agent Inventory (62 Designed, ~15 Running)

### Production Agents (actually running today)

| Agent | System | Model | Status |
|-------|--------|-------|--------|
| Medical Relevance Gate | genai-platform (Step Functions) | Claude Haiku 4.5 | Running — unnecessary for scheduled consults |
| Treatment Care Plan | genai-platform | Claude Sonnet 4.5 | Running — 2-5 min generation |
| Clinical Notes SOAP | genai-platform | Claude Sonnet 4.5 | Running — 3 variants |
| Consultation Summary | genai-platform | Claude Sonnet 4.5 | Running |
| Follow-Up Email | genai-platform | Claude Sonnet 4.5 | Running |
| Clarifying Questions | genai-platform | Claude Sonnet 4.5 | Running |
| 2-Pass Extraction (P1+P2) | Prompt Runner | gpt-4o-mini | Running — should be upgraded |
| Cross-Sell Guidance | Prompt Runner | gpt-4o-mini | Running — no GL data |
| Opportunities Agent | Prompt Runner | gpt-4o-mini | Running — duplicated code |
| Email Campaign | Prompt Runner | gpt-4o-mini | Running — lowest quality (4/10) |
| Coaching Evidence Extractor | Prompt Runner | gpt-4o-mini | Running |
| Coaching Generator | Prompt Runner | gpt-4o-mini | Running — phantom fields |
| Coaching Language Validator | Prompt Runner | gpt-4o-mini | Running — could be rule-based |
| RAG Chat (Aesthetics360 Coach) | Coaching Tool | Gemini 2.5 Flash | Running |
| Coaching Report Generator | Coaching Tool | Gemini 2.5 Flash | Running |

### Designed but Not Built (in genai-platform feature branches)

| Agent | Purpose | Latency Target |
|-------|---------|---------------|
| Diarization Correction (AIML-400) | Fix speaker misattribution using clinical heuristics | <12s |
| Segmentation & Labeling (AIML-450) | Label segments with 9 categories, 8 dispositions, 20 signal tags | <12s |
| Catalog Validation (AIML-451) | Resolve informal references to canonical catalog entries | <6s |

### Agent Exchange (53 conceptual agents — none built)

**Clinical (12):** ComboOptimizer, CoolSculptPro, MedicalHistory, NutritionAdvisor, OutcomeTracker, PhotoDocumentor, PhotoManager, ProcedureGuide, ProtocolMaster, ProtocolPerfect, SkinAnalyzer, TreatmentSimulator

**Consultative (11):** AgeWell, BodyContourPro, ConsultAI, FinancialPlanner, InjectableExpert, LaserLogic, PatientEducator, PatientMatch, RecoveryRoadmap, SkinJourney, VirtualConsult

**Sales (13):** ClientConnect, ConversionCoach, EventMaster, LoyaltyArchitect, MarketingDirector, MembershipMaster, ObjectionSolver, PackageDesigner, PromotionPlanner, PricingStrategist, ReferralEngine, RetentionMaster, ReviewManager

**Administrative (12):** BusinessInsights, ComplianceGuard, ConsentPro, DocumentFlow, InventoryIQ, PatientJourney, PracticeGrowth, RevenueOptimizer, StaffSync, TeamPerformance, TrainingTracker

**Coaching (5):** ClientExperience, ConsultationCoach, MarketingMentor, ProviderDevelopment, TrainingCoach

---

## 3. Intelligence Extraction (192 Fields Cataloged)

| Category | Fields | Running | Designed | Not Built |
|----------|--------|---------|----------|-----------|
| Patient Context | 8 | 6 | 2 | 0 |
| Goals & Concerns | 4 | 3 | 1 | 0 |
| Clinical Constraints | 18 | 13 | 5 | 0 |
| Treatment & Services Intent | 11 | 7 | 4 | 0 |
| Commercial Signals | 21 | 5 | 16 | 0 |
| Scoring & Quality Metrics | 12 | 4 | 8 | 0 |
| Opportunity Extraction | 10 | 3 | 4 | 3 |
| Provider Behavior & Coaching | 8 | 0 | 8 | 0 |
| KPI Metrics (Derived) | 20 | 0 | 20 | 0 |
| Document Generation | 29 | 29 | 0 | 0 |
| Reach / Follow-Up Automation | 6 | 0 | 6 | 0 |
| Global Library (Products) | 18 | 18 | 0 | 0 |
| Global Library (Services) | 21 | 21 | 0 | 0 |
| Preprocessing (Pipeline) | 6 | 0 | 0 | 6 |
| **TOTAL** | **~192** | **~109** | **~74** | **~9** |

**Critical gap:** The pipeline generates documents (narrative outputs) but does not yet extract structured, queryable intelligence fields needed for coaching dashboards, opportunity boards, and revenue forecasting. The Master Prompt Intelligence Extraction Engine has been designed but never integrated.

---

## 4. Evaluation Frameworks & KPIs

### 25+ KPIs Across 8 Categories

**Categories:** Rapport, Discovery, Education, Treatment Planning, Closing, Follow-up, Emotional Intelligence, Team Coordination

**8 Specialized Evaluation Systems** (all designed, none deployed as production agents):
1. Safety/Clinical Screening (4 KPIs)
2. Financial/Financing Discussions (4 KPIs)
3. Follow-Up/Re-engagement (12 agents, 4 KPIs)
4. Emotional Intelligence/Empathy (4 KPIs)
5. Team Coordination/Handoffs (4 KPIs)
6. Timeline/Urgency Management (4 KPIs)
7. Referral/Word-of-Mouth Generation (4 KPIs)
8. Skincare Product Integration (4 KPIs)

### 20 Derived KPI Metrics (fully specified, not running)

Close Attempt Rate, Price Discussion Rate, Financing Mention Rate, Next Step Establishment Rate, Plan Clarity Average, Objection Resolution Rate, Safety Screening Rate, Risk Discussion Rate, Aftercare Discussion Rate, Benefits Explanation Rate, Follow-Up Scheduling Rate, Ask-for-Sale Rate, Goal Articulation Rate, Treatment Options Offered, High Intent Signal Rate, Patient Questions per Consult, and 4 more.

### 42 Deep Dive Coaching Playbooks

Across 10 categories: Core Consultation Excellence (5), Upsell/Cross-Sell/Packaging (5), Objection/Barrier Mastery (5), Education & Trust (3), Closing/Conversion (4), Practice-Level Excellence (3), Core Injectables (3), Laser/Energy (5), Advanced Skin (4), Specialty Services (4).

Source: `Conversational Intelligence/04_Deep_Dive_Playbooks/`

---

## 5. Architecture (Current Production)

### 5 Intelligence Layers

1. **Capture & Transcription** — Deepgram, Kinesis, speaker diarization, segment streaming
2. **Processing & Enrichment** — SOAP, TCP, summary, entity extraction, service/product matching
3. **Intelligence & Evaluation** — 25+ KPI agents (designed), opportunity extraction, scoring
4. **Analytics & Insights** — Practice dashboards, provider scorecards, trend analysis (not built)
5. **Action & Automation** — Email, CRM sync, reminders, re-engagement (partially built)

### Microservices (6 deployed)

| Service | Purpose | Infra |
|---------|---------|-------|
| Core API (FastAPI) | Patients, practice, consultations, auth, integrations | Fargate |
| Transcription Service | WebSocket + Deepgram, Kinesis streams, DynamoDB | Fargate |
| AI Customization Service | Output generation/editing, versioning, Bedrock | Fargate |
| Transcript Processing Workflow | Step Functions + Lambdas, 7 downstream agents | Lambda |
| Offerings Service | Product/service catalog with COALESCE | Fargate |
| Practice Service | Practice domain APIs, B&A assets | Fargate |

### Key Infrastructure

- **Compute:** ECS Fargate + Lambda
- **Database:** Aurora PostgreSQL (primary), DynamoDB (sessions/transcripts), Supabase (GL/prototyping)
- **AI:** Bedrock (Claude Sonnet 4.5), Comprehend Medical, Deepgram Nova-3
- **Streaming:** Kinesis (audio + transcript streams)
- **Real-time:** AppSync GraphQL subscriptions
- **Auth:** Cognito
- **IaC:** AWS CDK 2 (Python)
- **Environments:** IHS, Dev, Staging, Production, Sandbox

### Data Architecture

- **Medallion pattern:** Bronze (raw S3) → Silver (cleaned RDS, PHI-removed) → Gold (analytics S3/Athena, embeddings)
- **Data Lake:** Apache Iceberg + Dagster Cloud. 6.36M NLP records, 6.8K audio files, 50K scientific papers, 300K+ words GL content, 19 podcast feeds
- **Two-Tier Library:** Global Library (352 products, 126 services, Supabase) + Practice Library (COALESCE overrides, Aurora)

---

## 6. Multi-Agent Patterns (6 documented)

1. **Sequential Preprocessing Chain** — Diarization → Segmentation → Catalog Validation (designed, not running)
2. **Parallel Downstream Fan-Out** — 7 agents run in parallel on same preprocessed transcript (running)
3. **Multi-Pass Extraction with HITL Gate** — P1 → P2 → P3 → HITL → TCP/CrossSell/Objection (running in Prompt Runner)
4. **Modular Frontend Agents** — Isolated modules with standard interface, no cross-imports (designed)
5. **RAG-Augmented Coaching** — Transcript → extraction → embeddings → RAG retrieval → coaching (running in Coaching Tool)
6. **Intelligence-to-Revenue Chain** — Extraction feeds 5 revenue mechanisms: Treatment Acceptance, Pipeline Recovery, Pipeline Follow-Through, Conversion Rate Lift, Revenue Predictability

---

## 7. Integrations

| System | Status | Purpose |
|--------|--------|---------|
| Deepgram | Production | Transcription (Nova-3 medical, streaming WebSocket) |
| GoHighLevel (GHL) | Production | CRM, email sending, campaign sync |
| Amazon SES | Production | Email delivery |
| Amazon Bedrock | Production | AI model invocation (Claude) |
| Comprehend Medical | Production | Medical NER entity extraction |
| Supabase | Prototype/Staging | Global Library, extraction data, practice config |
| Zenoti | In Refinement | PMS integration (scheduling, checkout, packages) |
| PatientNow | Planned | PMS integration |
| HubSpot | Planned | CRM alternative |
| Salesforce | Planned | CRM alternative |

---

## 8. Marketing & Reach (A360 Reach)

### Opportunity Framework
- 4 categories: Primary, Secondary, Future, Missed
- 5 visit types: Initial, Follow-Up, Treatment, Pricing-Only, Mixed
- Valuation formula: Base Price × Interest × Timing × Sentiment multipliers
- Pipeline progression: New → Qualified → Nurturing → Converted/Lost

### Email System
- 5-email sequences over 30 days: Immediate (24h), Value reinforcement (3-5d), Social proof (7-10d), Re-engagement (14-21d), Final (30d)
- Sequence types: High-Interest, Event-Driven, Product-Specific, Re-Engagement, Value Reinforcement
- Compliance: Practice-level acknowledgment required, consent verification per message, all events logged

### Marketing Intelligence Extraction
- Treatment interest extraction with category, level, timing, context
- Life event detection: wedding, vacation, reunion, professional, holiday, birthday
- Motivational factors: confidence, anti-aging, self-care, professional image, special occasion
- Campaign trigger generation with timing, theme, content focus, CTA

---

## 9. Global Library Data (Current State)

| Table | Records | Status |
|-------|---------|--------|
| gl_products | 324 enriched | Active |
| gl_services | 126 | Active |
| gl_concerns | 39 (571 aliases) | Active |
| gl_anatomy_areas | 32 | Active |
| gl_product_relationships | 348 typed | Active |
| gl_agent_prompts | 20 definitions | Active |
| gl_agent_references | 65 reference docs | Active |
| gl_product_content | Audience content, podcasts | Active |
| gl_product_concerns | 144 rows | Partial (FDA-only) |
| gl_product_anatomy_areas | 170 rows | Partial (~14% coverage) |

**Key gap:** Product-to-concern and product-to-anatomy junction tables are severely underpopulated. This blocks Layers 2-3 of the real-time matching system.

---

## 10. RAG & Training Data

### Manufacturer Content
- **Allergan:** Botox prescribing info, Juvederm line, CoolSculpting manuals, Kybella, education tools (~10 PDFs)
- **Candela:** GentleMax Pro, PicoWay, Exceed, CO2RE, elosPlus, marketing playbooks, patient consultation guide (90+ files)

### Clinical Training
- Plastic surgery textbooks (Grabb & Smith's, Core Procedures)
- Botox injection patterns
- ASPS Statistics 2020
- Aesthetic Medicine journal articles

### ML Datasets
- 9,940 RealSelf reviews (sentiment + procedure classification)
- 214 MB podcast transcription corpus
- Procedure classification training data (JSONL)
- Combined HIPAA consultation transcripts

### Sales Excellence Knowledge Base
- A360 Sales Excellence System prompt library
- TeriRoss sales methodology
- De-identified consultation transcripts for coaching RAG

---

## 11. Cost Considerations

### Per-Consultation Pipeline Cost (~$3.18 current)
- Deepgram streaming: $0.12
- Deepgram Read API (intents/sentiment): $0.03
- **Comprehend Medical: $3.00** (85% of total — dominant cost)
- Lambda + DynamoDB + AppSync + Kinesis: $0.03
- Bedrock agents (if triggered): $0.05-0.37 depending on documents requested

### Comprehend Migration Path
- Deepgram Audio Intelligence includes entity/intent/sentiment in base price
- At 100K consults/month: Comprehend = $80K/mo vs Deepgram = $11K/mo (86% savings)
- Migration plan documented in `REAL_TIME_INTELLIGENCE_IMPLEMENTATION_PLAN.md`

---

## 12. Key Gaps: What's Designed but Not Running

| Gap | Impact | Effort |
|-----|--------|--------|
| **Structured intelligence extraction** (192 fields, only 109 running) | No coaching dashboards, no opportunity boards, no forecasting | High — needs Master Extraction Engine integration |
| **AIML-450 signal tags not consumed** | 20 signal tags extracted but never aggregated into consultation-level fields | Medium |
| **GL data disconnected from agents** | 324 products, 348 relationships, 571 concern aliases sitting unused | Medium — GL context helper module needed |
| **No learning loop** | HITL corrections captured but never fed back to prompts | Medium |
| **No provider-level tracking** | Can't coach growth over time, no practice benchmarking | Medium |
| **Practice dashboards** (Layer 4) | No practice-level analytics visible to users | High |
| **Real-time intelligence** (Layer 1 expansion) | Only transcript shown during capture, entities/intents/sentiments stored but hidden | Medium — the real-time recommendations project addresses this |
| **Automated email delivery at scale** | Email generation works, sending is manual/limited | Medium — compliance gating needed |

---

## 13. Source Document Locations

### Highest-Value Folders in NewCO

| Folder | Size | What's Inside | Agent Relevance |
|--------|------|--------------|-----------------|
| `A360 - CORE DOCUMENTS` | 41.3 GB | Everything: CI system, architecture, requirements, Reach docs, playbooks, project index | Critical |
| `Intelligence Extraction` | 9.49 GB | Extraction pipeline architecture, master reference, gap analysis, prompt library | Critical |
| `Coaching` | Variable | Sales Excellence system, coaching tool backend, combined transcripts | High |
| `Agents` | Variable | 53 Agent Exchange definitions, ML datasets, RealSelf reviews | High |
| `Prompts` | Variable | Historical prompt library, multiple versions | High |
| `RAG Content` | Variable | Allergan + Candela manufacturer content, clinical training | High |
| `MasterDocs` | 33.4 MB | Comprehensive system breakdowns, intelligence layers narrative, Bedrock architecture | High |
| `architecture_master` | Variable | 12 architecture documents, bounded contexts, runtime topology | High |
| `Transcripts` | 1.32 GB | Real consultation transcripts for testing/training | High |
| `Training` + `Training DOcs` | Variable | Clinical textbooks, injection patterns, journal articles | Medium |
| `Global Library` | Variable | Product catalog vision, enrichment pipeline | Medium |
| `TCP` | Variable | Treatment care plan concepts and prototypes | Medium |

### Key Individual Documents

| Document | Location | What It Contains |
|----------|----------|-----------------|
| Master Extraction Reference | `Intelligence Extraction/A360_Extraction_Project/A360_Master_Extraction_Reference.md` | 192 field definitions, 20 derived KPIs, implementation status |
| Pipeline vs Revenue Gap Analysis | `Intelligence Extraction/A360_Extraction_Project/A360_Pipeline_vs_Revenue_Gap_Analysis.md` | Gap between what's generated and what's needed for revenue |
| Intelligence-to-Revenue Trace | `Intelligence Extraction/A360_Extraction_Project/A360_Intelligence_to_Revenue_Trace.md` | How extraction feeds 5 revenue mechanisms |
| Consultation Evaluation System | `A360 - CORE DOCUMENTS/Conversational Intelligence/01_Core_System_Documents/CONSULTATION_EVALUATION_SYSTEM.md` | 25+ KPI definitions, 8 evaluation categories |
| Master Evaluation Prompt | `A360 - CORE DOCUMENTS/Conversational Intelligence/01_Core_System_Documents/MASTER_CONSULTATION_EVALUATION_PROMPT.md` | Full orchestration prompt for multi-KPI evaluation |
| Opportunity Extraction Framework | `A360 - CORE DOCUMENTS/Conversational Intelligence/OPPORTUNITY_EXTRACTION_FRAMEWORK.md` | 4 opportunity categories, valuation formula, pipeline stages |
| Email Follow-Up System Requirements | `A360 - CORE DOCUMENTS/06_A360_Reach/EMAIL_FOLLOWUP_SYSTEM_REQUIREMENTS.md` | 5-email sequence specs, compliance, timing |
| Reach Marketing Agent Prompt | `A360 - CORE DOCUMENTS/06_A360_Reach/REACH_MARKETING_AGENT_PROMPT.md` | Full marketing intelligence extraction prompt |
| Intelligence Abstraction Layer Design | `A360 - CORE DOCUMENTS/Requirements/INTELLIGENCE_ABSTRACTION_LAYER_DESIGN.md` | Provider-agnostic interface, unified entity types |
| Real-Time Intelligence Implementation Plan | `A360 - CORE DOCUMENTS/Requirements/REAL_TIME_INTELLIGENCE_IMPLEMENTATION_PLAN.md` | Comprehend → Deepgram migration, 86% cost savings |
| TCP Engine Requirements | `A360 - CORE DOCUMENTS/Core Documents/tcp_treatment_care_plan_intelligence_engine.md` | Full TCP vision with HITL model |
| Bedrock Multi-Agent Architecture | `A360 - CORE DOCUMENTS/MasterDocs/BEDROCK_STEP_FUNCTIONS_MULTI_AGENT_ARCHITECTURE.md` | Step Functions + Bedrock orchestration plan |
| Agent Improvement Audit | `C:\Projects\Prompts\docs\AGENT_IMPROVEMENT_AUDIT.md` | Full audit of all production prompts/agents with 25-task improvement plan |

---

*Synthesized from 1,014 lines of domain extraction across core documents, architecture, agents, prompts, intelligence systems, products, and integrations. Cross-referenced against CLAUDE.md (production state) and AGENT_IMPROVEMENT_AUDIT.md (current gaps).*
