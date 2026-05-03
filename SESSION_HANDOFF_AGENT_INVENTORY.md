# Session Handoff: Agent Inventory & Prototype Agent Showcase

**Created:** 2026-05-03
**Previous Session:** Demo prototype build (5 static pages + 1 live extraction page)
**This Session:** Inventory all agents, select which to showcase, build agent slide-out UI

---

## Where We Left Off

We built a shareable A360 demo with 6 HTML pages (Boulevard teal/white design):
- **Overview** — KPI strip, pipeline, Boulevard AI gap table
- **Extraction** — Golden run with 9 offerings, goals, concerns, checklist
- **Live Extraction** — Dynamic page that fetches from Prompt Runner API, tabbed output (extraction/transcript/JSON/agent outputs), run picker, live agent execution
- **Agents** — Pipeline visualization with real downstream outputs
- **Intelligence** — Aggregate dashboard across 122 transcripts
- **Products** — Morpheus8 deep dive from Global Library

All deployed at: https://ccabell.github.io/a360-demo/

Prompt Runner is hardened and fully operational. All 7 agents pass on production.

---

## What This Session Needs to Do

### Step 1: Full Agent Inventory

Review and inventory ALL agents across all systems:

**Prompt Runner agents (7 running):**
- `cross_sell_guidance_v3` — Prioritized cross-sell/upsell recommendations
- `opportunities_agent` — Follow-up plan, sell plan, CRM context, marketing hooks
- `email_campaign` — Personalized patient follow-up email
- `coaching_evidence_extractor` — LAER evaluation, behaviors, KPI scores
- `coaching_generator` — Principle-based coaching feedback
- `coaching_language_validator` — Language policy validation
- `coaching_pipeline` — All 3 coaching stages in one call

**Platform agents (AWS Step Functions, 6 running):**
- Medical Relevance Gate (Claude Haiku)
- Clinical Notes / SOAP (Claude Sonnet, 3 variants)
- Treatment Care Plan (Claude Sonnet)
- Follow-Up Email (Claude Sonnet)
- Consultation Summary (Claude Sonnet)
- Clarifying Questions (Claude Sonnet)

**Designed but not built (from Master Feature Inventory):**
- 3 preprocessing agents: Diarization Correction, Segmentation & Labeling, Catalog Validation
- 53 Agent Exchange concepts (Clinical: 12, Consultative: 11, Sales: 13, Administrative: 12, Coaching: 5)

**Supabase `gl_agent_prompts` table (20 definitions):**
- 8 production, 12 planned
- Each has input schema, output schema, GL data requirements stored in `prompt_text` as JSON

**Any NEW agents the user pastes into the conversation** — these need to be added to the inventory.

### Step 2: User Selects Which Agents to Showcase

The user will tell you which agents they want visible in the demo prototype. Not all 60+ — probably 10-15 that tell the best story.

### Step 3: Build Agent Slide-Out UI

Add to the live extraction page (or a new agents page):
- Agent cards that show name, description, status (live/planned/concept)
- Click an agent card → **slide-out panel** from the right showing:
  - Agent description (1-2 sentences)
  - Input: what it needs
  - Output: what it produces (with field list)
  - Sample output from the golden run (if the agent has been executed)
  - "Run Agent" button (for Prompt Runner agents that support live execution)
  - The actual prompt template (for technical credibility)
  - Data flow: what GL data it uses, what it produces
- Slide-out should follow Boulevard design system (teal headers, tight layout)

---

## Key Files to Read

| File | What It Contains |
|------|-----------------|
| `CLAUDE.md` (project root) | Full project context, URLs, design system, agent list |
| `reference/platform/A360_Platform_Master_Feature_Inventory.md` | Complete 62-agent inventory with status |
| `reference/platform/A360_Complete_Analysis_Report_2026-04-27.md` | Extraction schema, revenue leaks, KPI framework |
| `reference/platform/Coaching_Tool_Reference.md` | 8-dimension coaching framework, prompts |
| `reference/design-system/A360_Design_System.md` | Layer 1 rules + Layer 2 visual guidance |
| `reference/design-system/A360_UX_Principles.md` | Conditional display, output writing standards |
| `prototypes/demo-extraction-live.html` | The live page to extend with slide-out |
| `prototypes/demo-agents.html` | Current static agents page |
| `prototypes/data/demo_data.json` | Golden run data including all downstream outputs |
| `prototypes/data/agents.json` | Current agent list from Prompt Runner API |

## Key Data Sources

**Prompt Runner API:** https://prompt-runner-production.up.railway.app
- `GET /agents` — list all 7 production agents
- `GET /runs/{golden_run_id}` — get golden run with downstream outputs
- `POST /run_downstream` — execute agent live: `{run_id, module_id, selected_outputs:[]}`
- `GET /prompt_templates` — get prompt library (the actual prompts)

**Golden Run:** `e76b2648-3cf6-4bf6-b0d8-63f6692b5801`
- Already has outputs from: cross_sell_guidance_v3, opportunities_agent, email_campaign, coaching_pipeline, coaching_evidence_extractor

**Supabase Global Library:**
- URL: `https://wvpgmawrizwkmvfnwqfl.supabase.co`
- Anon key: `sb_publishable_46g0tx0i3edrmqGV9SwoqQ_q2H4kSGr`
- `gl_agent_prompts` table has 20 agent definitions with schemas

## Design Constraints

- Boulevard teal/white theme (see CLAUDE.md)
- JetBrains Mono for all numeric values and code
- Slide-out panel: right-side, 400-500px wide, overlays content with scrim
- Follow A360 UX Principles: no empty sections, evidence-backed, no jargon without explanation
- Agent cards should show status badges: Live (green), Ready (blue), Planned (gray)

---

## Session Start Checklist

1. Read `CLAUDE.md` in the project root
2. Read `reference/platform/A360_Platform_Master_Feature_Inventory.md` for full agent inventory
3. Read `prototypes/data/agents.json` for current production agents
4. Verify Prompt Runner is up: `curl https://prompt-runner-production.up.railway.app/health`
5. Wait for the user to paste any new agent definitions
6. Build the inventory, let user select, then build the slide-out UI
