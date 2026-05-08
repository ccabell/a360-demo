# CLAUDE.md — A360 Demo Prototype

## Cross-Project Hub — READ FIRST

This project is one of 10+ parallel A360 workstreams. Before starting work, read the hub:

| File | Why |
|------|-----|
| `C:\Projects\A360_Hub\STATE.md` | What's in flight, blocked, done across ALL projects |
| `C:\Projects\A360_Hub\README_FOR_AGENTS.md` | Hard rules, common mistakes |
| `C:\Projects\A360_Hub\plans\a360-demo.md` | This project's hub plan |
| `C:\Projects\A360_Hub\PLATFORM.md` | Product capabilities, live URLs, agent inventory |

### Key cross-project facts (as of May 2026)

- **Pulse is RETIRED.** This repo (a360-demo) is the buyer prototype. Pulse is dead. Mid-Stream is internal admin.
- **Mid-Stream URL changed:** `midstream-kegfdzzz.manus.space` (NOT `mid-stream.vercel.app` — that's retired).
- **Reach Campaign Agent v1 shipped** (May 7) — new demo-able capability for Reach pages.
- **Agent registry is `a360_agents`** (42 rows), not the 62-agent count from older docs.
- **Supabase keys: use `GL_SUPABASE_*`** (`sb_secret_` format).

---

This project is a shareable demo app that shows Boulevard/PE buyers what A360 does.

## Project Context

**Audience:** Boulevard (med spa SaaS, $800M valuation), PE firms evaluating med spa tech, strategic acquirers.
**Not pitching practices.** Pitching the technology asset and data moat.

**Approach:** Static HTML prototypes → review → React build (forked from Mid-Stream).
We are currently in the HTML prototype phase with a live extraction page connected to Prompt Runner.

## Key URLs

| Resource | URL |
|----------|-----|
| Demo (GitHub Pages) | https://ccabell.github.io/a360-demo/ |
| Live Extraction | https://ccabell.github.io/a360-demo/demo-extraction-live.html |
| Prompt Runner API | https://prompt-runner-production.up.railway.app |
| Health Check | https://prompt-runner-production.up.railway.app/health |
| Mid-Stream Admin UI | https://midstream-kegfdzzz.manus.space |
| GL Viewer | https://gl-viewer.vercel.app (password: A360) |
| GitHub Repo | https://github.com/ccabell/a360-demo |

## Golden Run

**Run ID:** `e76b2648-3cf6-4bf6-b0d8-63f6692b5801`
- 9 offerings with diverse dispositions (performed, discussed, declined, hesitant, purchased, scheduled)
- 6 concerns, 2 objections, 2 hesitations, 15 checklist items, 3 next steps
- All 7 downstream agents tested and passing
- Transcript: 37.5 min treatment visit at Lumiere Aesthetics (transcript ID: 2abf90ef-6e10-4b6c-9452-4b19f582a885)

## Architecture

- **Prompt Runner** = Backend API (FastAPI on Railway, auto-deploys from `ccabell/prompt-runner` master)
- **Mid-Stream** = Admin UI (React 19 + MUI 7, deployed on Vercel)
- **This repo** = Demo prototypes (static HTML, deployed via GitHub Pages)
- **Supabase** = Global Library database (project: wvpgmawrizwkmvfnwqfl)

## Design System

**Visual style:** Boulevard-inspired — teal header bars (`#1b4f6b`), white backgrounds, Inter + JetBrains Mono, tight data-dense layout.

**Layer 1 rules (non-negotiable, from A360 Design System doc):**
- Only display data grounded in transcript evidence
- Absence of data = omit section entirely (no empty cards, no N/A)
- All numeric values use JetBrains Mono
- Cards sized by content volume, not layout symmetry

**Reference documents in `reference/`:**
- `reference/design-system/A360_Design_System.md` — Full Layer 1 + Layer 2 rules
- `reference/design-system/A360_UX_Principles.md` — Conditional display, output writing standards
- `reference/design-system/UI_Quality_Diagnostic_Report.md` — What makes flagship UI premium
- `reference/boulevard/Boulevard_Deep_Reference.pdf` — Boulevard company profile, AI gaps, integration plan
- `reference/platform/A360_Complete_Analysis_Report_2026-04-27.md` — Full extraction schema, revenue leaks, KPIs
- `reference/platform/A360_Platform_Master_Feature_Inventory.md` — agent inventory, 192 fields, architecture (note: `a360_agents` registry has 42 rows as of May 2026)

## Current Pages

**Note:** This list may be incomplete — check the repo for the actual file list. As of May 2026, 11+ pages exist including Reach prototype pages shipped in PR #4.

| Page | File | Status |
|------|------|--------|
| Overview/Hero | `demo-hero.html` | Static, real stats |
| Extraction | `demo-extraction.html` | Static, golden run data |
| **Live Extraction** | `demo-extraction-live.html` | **Dynamic** — fetches from Prompt Runner API, run picker, agent execution, tabbed output |
| Agents | `demo-agents.html` | Static, real agent outputs |
| Intelligence | `demo-intelligence.html` | Static, aggregate data |
| Products | `demo-products.html` | Static, Morpheus8 from GL |
| Reach Overview | `demo-reach.html` | Static, Reach intelligence |
| Reach Strategy | `demo-reach-strategy.html` | Static, campaign strategy |
| Reach Email | `demo-reach-email.html` | Static, email generation |
| Reach SMS | `demo-reach-sms.html` | Static, SMS generation |
| Reach Deliver | `demo-reach-deliver.html` | Static, delivery pipeline |

## Prompt Runner API (Key Endpoints)

```
GET  /health                    — env var + DB check
GET  /transcripts?limit=50      — list transcripts (122 total)
GET  /transcripts/{id}          — get transcript with raw text
GET  /runs?limit=50             — list runs (274 total)
GET  /runs/{run_id}             — get run with full outputs
POST /run_downstream            — run agent: {run_id, module_id, selected_outputs:[]}
GET  /agents                    — list 7 production agents
GET  /opportunities             — 335 opportunities with stages
GET  /prompt_templates          — prompt library
GET  /practices                 — practice list
```

## Production Agents (Prompt Runner)

| Agent ID | Name | What It Does |
|----------|------|-------------|
| `cross_sell_guidance_v3` | Cross-sell guidance | Prioritized recommendations from extraction + catalog |
| `opportunities_agent` | Opportunities agent | Follow-up plan, sell plan, CRM personalization, marketing hooks |
| `email_campaign` | Email campaign | Personalized patient follow-up email |
| `coaching_evidence_extractor` | Coaching Evidence | LAER evaluation, behaviors, coaching moments, KPI scores |
| `coaching_generator` | Coaching Generator | Principle-based coaching feedback from evidence |
| `coaching_language_validator` | Coaching Language Validator | Validates coaching output against language policy |
| `coaching_pipeline` | Full Coaching Pipeline | All 3 coaching stages in one call |

## Platform Agents (AWS Step Functions — production a360-genai-platform)

| Agent | Model | Purpose |
|-------|-------|---------|
| Medical Relevance Gate | Claude Haiku | Filter non-clinical transcripts |
| Clinical Notes (SOAP) | Claude Sonnet | 3 variants: general, explant, venous |
| Treatment Care Plan | Claude Sonnet | Good/Better/Best tiers with pricing |
| Follow-Up Email | Claude Sonnet | Personalized patient communication |
| Consultation Summary | Claude Sonnet | Patient-friendly visit summary |
| Clarifying Questions | Claude Sonnet | Information gap identification |

## Coding Standards

- HTML prototypes: self-contained, no build tooling, open in browser
- When we move to React: fork Mid-Stream, apply Boulevard theme to MUI
- All data should be real (from Prompt Runner API or Supabase GL)
- Follow A360 Design System Layer 1 rules (grounding, silence, adaptive sizing)
- JetBrains Mono for all numeric values
- Teal header bars on table/card sections
- Tight spacing, data-dense, no decorative padding

## Railway Configuration

- **Project:** patient-smile (in Aesthetics360 workspace)
- **Project ID:** 2c1821aa-59f4-45c3-839c-822ddcd2de67
- **Service ID:** f1f6168b-725c-477b-9e09-91f816ea9f45
- **Auto-deploys from:** github.com/ccabell/prompt-runner master
- **CORS origins include:** ccabell.github.io, localhost:3000, localhost:5173

## What NOT to Do

- Don't rebuild from scratch — fork Mid-Stream for React phase
- Don't add auth/login — hardcode demo practice
- Don't touch Prompt Runner code without testing locally first
- Don't build 20 pages — 5 core pages max
- Don't add features beyond what's asked
- Don't show empty cards/sections — omit when no data (Layer 1 silence rule)
