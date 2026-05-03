# Testing & Data-Flywheel Showcase — Planning Doc

**Created:** 2026-05-03
**Audience:** Boulevard, PE, strategic acquirers (same as the rest of the demo)
**Goal:** Add three new demo surfaces that show A360 is not a static prompt — it is a system that learns.

The pages should land the message: *we have a measurement loop, a feedback loop, and a learning loop. The platform gets better the more practices use it.*

---

## What we already have (audit of testing artifacts)

The Prompt Runner repo (`C:\Projects\Prompts`) has substantial real testing data we can show without inventing anything.

### 1. Batch test reports — model-comparison runs

| File | Label | Model | Sample | Successes | Avg latency |
|------|-------|-------|--------|-----------|-------------|
| `batch_report_v32_final_50.json` | v32_final_50 | Claude Haiku 4.5 (Bedrock) | 50 | 49 / 50 | 52.0s |
| `batch_report_v32_haiku45_50.json` | v32_haiku45_50 | Claude Haiku 4.5 | 50 | — | — |
| `batch_report_v32b_haiku45_28.json` | v32b_haiku45_28 | Claude Haiku 4.5 | 28 | — | — |
| `batch_report_v32c_test5.json` | v32c_test5 | Claude Haiku 4.5 | 5 | — | — |
| `batch_report_test_v32_haiku45_5.json` | test_v32_haiku45_5 | Claude Haiku 4.5 | 5 | — | — |

Each row contains: `transcript_id`, `consult_number`, `duration_minutes`, `consult_type`, `run_id`, `status`, `elapsed_seconds`, `p1_field_count`, `p2_field_count`.

**Demo angle:** "Here is what regression testing looks like for a single prompt change. We ran 50 transcripts, measured 52s avg latency, 98% success, and tracked field-population deltas vs the prior version."

### 2. Eval reports — accuracy metrics per run

`eval_report_v32_final_50.json` (60 KB) carries per-run and aggregate metrics:

**Aggregate (49 runs):**
- `schema_p1_compliance: 1.0` — every output is schema-valid
- `schema_p2_compliance: 1.0`
- `p1_field_population: 0.80` — 80% of expected P1 fields populated
- `evidence_coverage: 1.0` — every claim has an evidence quote
- `evidence_accuracy: 0.85` — 85% of evidence quotes verified to appear verbatim in the transcript
- `motivation_type_pct: 0.92`
- `cross_sell_summary_pct: 1.0`
- `outcome_commitment_consistent: 1.0`
- `checklist_structured_evidence: 468` (across all runs)
- `checklist_bare_string_evidence: 0`

**Per-run rows include:** disposition distribution, offerings count, signal_tag_count, hesitations / objections / concerns counts, an `issues: []` array, the `run_id`, and the `transcript_id`.

**Demo angle:** "Every run is graded on 12 metrics. Schema compliance 100%, evidence accuracy 85%, evidence coverage 100%. We can roll this up by transcript type, by model, by prompt version."

### 3. Pytest test suite

`C:\Projects\Prompts\tests\` — running production tests:
- `test_extraction.py` — JSON parsing, placeholder substitution, GL context injection, conditional blocks, dedupe logic, version detection
- `test_downstream.py` — downstream agent contracts
- `test_coaching_signals.py` — coaching pipeline regressions
- `test_gl_context.py` — Global Library context injection
- `test_revenue_leaks.py` — revenue-leak detection signals

**Demo angle:** show the test names + green checkmarks. The point is "this is engineered, not vibes."

### 4. HITL override log

The `v3_hitl_verification.md` prompt + a Supabase table (designed: `ie_run_overrides`) is where reviewer corrections land. Every time a human flips a disposition, fixes evidence, or rejects an offering, it persists. That is the training-signal substrate.

**Demo angle:** "When the human says 'this should be `recommended_declined` not `discussed`', that correction is logged. The next prompt iteration is graded against the corrected ground-truth set, not the old one."

### 5. Practice Library (the practice-adaptation layer)

The `pl_*` Supabase tables already use the COALESCE pattern: practice-specific overrides on top of Global Library defaults. This is the substrate of "model adapts to practice without retraining." It is not new — it is already running.

**Demo angle:** show the same prompt with two different practice contexts producing two different outputs. The model is the same; only the COALESCE-resolved Practice Library context differs.

### 6. Multiple prompt versions in the repo

`prompts/` has `v2_*`, `v3_*`, `v3.2_*`, `v4_*` versions of the extraction and cross-sell prompts. Plus `archive/`. This is the prompt evolution story — visible in git but more compelling rendered as a timeline.

---

## Suggested showcase: 3 new demo pages

The existing 6 pages tell the *what* story (extraction, agents, intelligence). These three tell the *how it stays good and keeps getting better* story.

### Page A — `demo-testing.html` ("Accuracy Lab")

**Headline:** *Every prompt change is measured against 50+ real consultations before it ships.*

**Sections:**

1. **Latest run vs previous run** — side-by-side bar charts of the 12 metrics (schema compliance, field population, evidence accuracy, evidence coverage, motivation type %, cross-sell summary %, etc.). Pull from `eval_report_v32_final_50.json` and the v32b version. Render the deltas in Boulevard teal/green/amber.

2. **Run-level table** — sortable, 49 rows: transcript_id (truncated), consult_type, duration, p1_field_count, evidence_accuracy, issues count. Click a row → drills into that run on `demo-extraction-live.html#<run_id>` (the live extraction page already supports a hash for run_id).

3. **Latency distribution** — histogram of `elapsed_seconds` from `batch_report_v32_final_50.json`. Highlight the 52s avg and the long tail. (Honest about TCP being slow.)

4. **Test suite strip** — `pytest -v` output styled. Just the test names + green checks. Copy the actual file list from `tests/`.

5. **Prompt version history** — vertical timeline: v2 → v3 → v3.2 → v4 cross-sell. Each entry has date, what changed, and the eval delta. Commit history makes this trivial to populate.

**Build cost:** medium. Static page, embeds two real JSON files (~70 KB combined). All numbers are real.

### Page B — `demo-flywheel.html` ("How A360 Learns")

**Headline:** *The platform improves every time a practice uses it. Three loops, all running today.*

**Sections (each section = one loop):**

1. **Per-practice adaptation loop (Practice Library)** — diagram + before/after.
   - Same transcript run with practice context = "Lumiere Aesthetics" → Lumiere catalog, Lumiere pricing, Lumiere voice
   - Same transcript with practice context = "Skincare by Sharon" → different recommendations
   - The model is the same gpt-4o-mini. Only the COALESCE-resolved Practice Library context changes.
   - **Visual:** two-column diff of cross-sell output, with the GL/PL data deltas highlighted.

2. **HITL feedback loop (Override capture)** — animated/illustrated flow.
   - Reviewer flips `disposition: discussed` → `disposition: recommended_declined` in Mid-Stream
   - The override row is persisted with reviewer id, before, after, reason
   - The corrected example becomes part of the eval set
   - Next prompt version is graded against it
   - **Visual:** a stylized override log with 6–10 real-looking rows and a "→ added to eval set" stamp.

3. **Per-prompt version improvement loop (Batch eval gate)** — numbers.
   - Prompt v3.2 vs v3.1 deltas: evidence accuracy +5 pts, field population +12 pts, schema compliance held at 100%
   - Bar chart of improvements per release
   - Caption: "We never ship a prompt that loses ground on any metric."
   - **Visual:** ratchet graph (each version sets a new floor).

**Bonus section — practice-feedback agent (designed, not built):** show the slide-out we just built, opened to `practice_feedback_loop`. The card is gray ("Designed") — honest about what's running vs planned. *This is exactly the kind of thing the user mentioned: "show an agent that manages feedback from the practice."*

**Build cost:** medium-high. Section 1 needs two real practice contexts wired up. Sections 2–3 can use realistic-looking but partly-staged data — we have the override schema and eval reports, but the override log isn't fully populated yet.

### Page C — `demo-batch-test.html` ("Run a Batch Test")

**Headline:** *Pick a prompt version, pick a transcript set, watch it run.*

This is the *interactive* counterpart to the static Accuracy Lab. It wraps the `Batch Eval Runner` agent (already exists as a CLI in Prompt Runner — we'd need a thin API endpoint to launch it).

**MVP version (no new backend):**
- Dropdown of historical batch reports (the 5 `batch_report_*.json` files)
- Click → renders the report with the same components as Page A
- "Run new batch" button is disabled with a tooltip: "Available in v2"

**Full version (new backend endpoint):**
- `POST /run_batch {prompt_version, transcript_count, sample_strategy}`
- Streams progress (transcript-by-transcript) via Server-Sent Events
- Final eval report rendered live
- This is the most demo-able feature for a buyer in a live call: "I'm going to run our latest prompt against 10 transcripts right now."

**Build cost (MVP):** low — repurpose the Page A components.
**Build cost (full):** medium — needs a Prompt Runner endpoint + SSE streaming, plus rate-limit / queue logic so demo viewers can't hammer Bedrock.

---

## Recommended sequence

1. **First:** ship the info-panel + agent inventory (this PR). Surfaces what we already have.
2. **Next:** Page A — `demo-testing.html`. Pure render of real JSON. Highest credibility-per-hour.
3. **Then:** Page B — `demo-flywheel.html`. Tells the differentiation story. Mostly static.
4. **Last:** Page C MVP. Skip the live-batch backend until a buyer specifically asks for it on a call.

---

## Things we should be honest about in the demo

The Layer 1 design rule says *no empty cards, no fake data*. Carry that into the testing pages:

- **Don't show a flywheel diagram with zero overrides logged.** If the override log is empty for a practice, omit that section for that practice.
- **Don't claim "20-minute practice onboarding."** The Practice Library override flow exists in the schema but isn't fully tooled.
- **Do** show the eval reports — they are real, and they are what most buyers will not believe we have until they see the JSON.
- **Do** show the test suite output — `pytest tests/` is one command away from a screenshot that 90% of competitors can't produce.

---

## Open questions for the user

1. **Page A scope** — are you OK rendering the real JSON files directly, or do you want a sanitized / curated view? (The transcript_ids and run_ids are non-PHI but they expose how many practices we've tested against.)
2. **Page B section 1** — do we have a second practice context populated in Supabase besides Lumiere? If not, do we stage a synthetic one ("Skincare by Sharon" with different catalog) for the demo?
3. **Page C live mode** — is a live-batch demo worth the backend work? Or is the MVP (replay historical batches) enough?
4. **Override log volume** — how many real HITL overrides exist in `ie_run_overrides` today? Determines whether section 2 of Page B can be 100% real or needs synthetic supplements.

---

## What we built in this session that supports the testing story

The agent info-panel already includes three agents that map directly to the testing/flywheel narrative:

- `batch_eval_runner` (Live) — the agent behind Page A
- `hitl_verification` (Live) — the agent behind Page B section 2
- `practice_feedback_loop` (Designed) — the agent behind Page B section 1

So a buyer viewing the existing `demo-agents.html` pipeline can already click the info icon on these and read what they do. That's the bridge from "extraction demo" to "platform-that-learns demo."
