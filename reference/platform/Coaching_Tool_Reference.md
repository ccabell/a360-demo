# Coaching Tool — Complete Reference Document

This document covers every file, prompt, schema, and framework reference used by the A360 Coaching Agent in the Mid_Stream project.

---

## Overview

The coaching tool is a **two-pass LLM chain** that evaluates a consultation transcript against the **Sales Excellence Framework for Aesthetic Medicine** and produces structured, actionable coaching feedback for the practitioner.

- **Pass 1 — Dimension Scoring:** Reads the transcript + extraction outputs and scores 8 framework dimensions (0–10) with brief evidence notes and key quotes.
- **Pass 2 — Coaching Report:** Uses the scores + transcript to generate a full coaching report: strengths (with quotes), improvement areas (with specific suggestions and rewrites), quick wins, and a primary coaching focus.

Results are stored in the database (`coaching_results` table) so the UI can retrieve them without re-running the LLM chain.

---

## Files

| File | Purpose |
|------|---------|
| `server/coachingRouter.ts` | Core server logic — prompts, LLM calls, DB storage, tRPC procedures |
| `server/coaching.test.ts` | Unit tests for prompt building, JSON parsing, score color logic |
| `client/src/pages/CoachingAgentPage.tsx` | Full UI — radar chart, dimension cards, strengths, improvements, quick wins |
| `client/src/pages/CoachingHistoryPage.tsx` | List view of all past coaching analyses |
| `drizzle/schema.ts` (excerpt) | `coaching_results` table definition |
| `server/routers.ts` | Wires `coachingRouter` into the main tRPC router as `coaching.*` |
| `upload/sales_excellence_framework_complete(1).md` | The full Sales Excellence Framework — the knowledge base the prompts reference |

---

## Database Schema

```typescript
export const coachingResults = mysqlTable("coaching_results", {
  id: int("id").autoincrement().primaryKey(),
  runId: varchar("runId", { length: 128 }).notNull().unique(),
  transcriptId: varchar("transcriptId", { length: 128 }),
  practitionerName: varchar("practitionerName", { length: 256 }),
  overallScore: text("overallScore"),           // decimal string e.g. "7.5"
  consultationSummary: text("consultationSummary"),
  dimensionScores: text("dimensionScores"),     // JSON array of dimension objects
  coachingReport: text("coachingReport"),       // JSON object with strengths/improvements/quick_wins
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

## The 8 Framework Dimensions

These are the dimensions scored in Pass 1. Each maps to a section of the Sales Excellence Framework.

| ID | Label | Description | Framework Reference |
|----|-------|-------------|---------------------|
| `rapport_trust` | Rapport & Trust Building | Opening warmth, personalised greeting, eye contact cues, connection before content, authentic presence | Part 2 (First 90 Seconds), Part 6 (Building Rapport and Trust) |
| `needs_assessment` | Needs Assessment & Discovery | Open-ended questions, funnel technique, active listening, uncovering emotional motivations, budget and timeline discovery | Part 3 (LAER – Listen/Explore), Part 4 (Needs Assessment) |
| `education` | Patient Education | Translating clinical concepts, visual aids, balancing science with emotional benefits, avoiding information overload | Part 5 (Education as a Sales Strategy) |
| `value_presentation` | Value Presentation | Connecting treatment to patient goals, leading with emotional benefits, ROI framing, premium positioning | Part 9 (Value Presentation), Part 5 (Balancing Science with Emotional Benefits) |
| `objection_handling` | Objection Handling | Proactive concern identification, Feel-Felt-Found method, price objection strategies, medical fear handling | Part 10 (Objection Handling) |
| `closing_commitment` | Closing & Commitment | Reading buying signals, trial closes, assumptive close, alternative choice close, clear next steps | Part 11 (Closing Techniques) |
| `upsell_crosssell` | Ethical Upselling & Cross-Selling | Complementary treatment recommendations, package presentation, synergy explanation, patient-centric framing | Part 13 (Ethical Upselling and Cross-Selling) |
| `follow_up` | Follow-Up & Continuity | Clear next steps communicated, follow-up timeline set, post-consultation plan discussed | Part 15 (The Follow-Up System) |

---

## Pass 1 Prompt — Dimension Scoring

```
You are an expert sales coach specialising in aesthetic medicine consultations.
You have deep knowledge of the Sales Excellence Framework for Aesthetic Medicine.

Your task is to score a consultation transcript across 8 framework dimensions.

## Consultation Transcript
{transcript}

## AI Extraction Summary (Pass 1 + Pass 2 outputs)
{extractionSummary}

## Dimensions to Score
1. **Rapport & Trust Building** (id: "rapport_trust")
   Opening warmth, personalised greeting, eye contact cues, connection before content, authentic presence.
   Framework ref: Part 2 (First 90 Seconds), Part 6 (Building Rapport and Trust)

2. **Needs Assessment & Discovery** (id: "needs_assessment")
   Use of open-ended questions, funnel technique, active listening, uncovering emotional motivations, budget and timeline discovery.
   Framework ref: Part 3 (LAER – Listen/Explore), Part 4 (Needs Assessment)

3. **Patient Education** (id: "education")
   Translating clinical concepts, visual aids, balancing science with emotional benefits, avoiding information overload.
   Framework ref: Part 5 (Education as a Sales Strategy)

4. **Value Presentation** (id: "value_presentation")
   Connecting treatment to patient goals, leading with emotional benefits, ROI framing, premium positioning.
   Framework ref: Part 9 (Value Presentation), Part 5 (Balancing Science with Emotional Benefits)

5. **Objection Handling** (id: "objection_handling")
   Proactive concern identification, Feel-Felt-Found method, price objection strategies, medical fear handling.
   Framework ref: Part 10 (Objection Handling)

6. **Closing & Commitment** (id: "closing_commitment")
   Reading buying signals, trial closes, assumptive close, alternative choice close, clear next steps.
   Framework ref: Part 11 (Closing Techniques)

7. **Ethical Upselling & Cross-Selling** (id: "upsell_crosssell")
   Complementary treatment recommendations, package presentation, synergy explanation, patient-centric framing.
   Framework ref: Part 13 (Ethical Upselling and Cross-Selling)

8. **Follow-Up & Continuity** (id: "follow_up")
   Clear next steps communicated, follow-up timeline set, post-consultation plan discussed.
   Framework ref: Part 15 (The Follow-Up System)

## Instructions
For each dimension, provide:
- score: integer 0–10 (0 = completely absent, 5 = adequate, 10 = exemplary)
- evidence: 1–2 sentence summary of what you observed in the transcript that justifies the score
- key_quote: the single most relevant verbatim quote from the transcript (max 200 chars), or null if none

Return ONLY valid JSON matching this exact schema (no markdown fences):
{
  "dimensions": [
    {
      "id": "<dimension_id>",
      "label": "<dimension_label>",
      "score": <0-10>,
      "evidence": "<string>",
      "key_quote": "<string or null>"
    }
  ],
  "overall_score": <0-10 float>,
  "consultation_summary": "<2-3 sentence overall summary of the consultation quality>"
}
```

---

## Pass 2 Prompt — Coaching Report

```
You are an expert sales coach specialising in aesthetic medicine consultations.
You are providing a detailed, actionable coaching report for a practitioner.

{practitionerName if provided}

## Dimension Scores (from Pass 1 analysis)
- Rapport & Trust Building: {score}/10 — {evidence}
  Quote: "{key_quote}"
[... all 8 dimensions ...]

Overall Score: {overall_score}/10
Summary: {consultation_summary}

## Consultation Transcript
{transcript}

## Your Task
Generate a comprehensive coaching report with:

1. **Top 3 Strengths** — specific things the practitioner did well, with:
   - A verbatim quote from the transcript demonstrating the strength
   - Which framework principle this exemplifies
   - Why it matters for patient conversion / satisfaction

2. **Top 3 Improvement Areas** — the highest-priority areas to work on, with:
   - What was observed (or missing) in the transcript
   - A specific, actionable technique from the Sales Excellence Framework
   - A concrete example of how to phrase it differently next time (rewrite the moment)
   - Framework reference (Part and section name)

3. **Quick Wins** — 2–3 small, immediately implementable changes that would have the biggest impact

4. **Coaching Focus for Next Session** — one primary skill to practice before the next consultation

Return ONLY valid JSON matching this exact schema (no markdown fences):
{
  "strengths": [
    {
      "title": "<short title>",
      "observation": "<what was done well>",
      "quote": "<verbatim transcript quote>",
      "framework_principle": "<principle name>",
      "framework_ref": "<Part X: Section Name>",
      "impact": "<why this matters>"
    }
  ],
  "improvements": [
    {
      "title": "<short title>",
      "priority": "high" | "medium",
      "observation": "<what was observed or missing>",
      "technique": "<specific framework technique>",
      "framework_ref": "<Part X: Section Name>",
      "rewrite": "<how to say it better — provide actual example language>",
      "expected_impact": "<what improvement this would drive>"
    }
  ],
  "quick_wins": [
    {
      "action": "<specific action>",
      "rationale": "<why this is a quick win>"
    }
  ],
  "coaching_focus": "<one primary skill to practice>",
  "coaching_focus_rationale": "<why this is the top priority>"
}
```

---

## tRPC Procedures

All procedures are under the `coaching` namespace (i.e., `trpc.coaching.*`).

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `runCoaching` | mutation | `{ run_id, transcript_text?, practitioner_name?, force_rerun? }` | Runs the two-pass LLM chain. Checks cache first unless `force_rerun: true`. Stores result in DB. |
| `getCoachingResult` | query | `{ run_id }` | Fetches a previously stored coaching result for a run. Returns null if not found. |
| `listCoachingResults` | query | `{ limit?, offset? }` | Lists all coaching results (for the history view). Default limit 20. |

---

## Score Color Logic

Used in both the UI and tests to colour-code dimension scores:

```typescript
function scoreColor(score: number): string {
  if (score >= 8) return "#00e676";  // Green — Excellent
  if (score >= 6) return "#00e5ff";  // Cyan — Good
  if (score >= 4) return "#ffab00";  // Amber — Developing
  return "#ff1744";                  // Red — Needs Work
}

function scoreLabel(score: number): string {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Developing";
  return "Needs Work";
}
```

---

## LLM Parameters

- **Pass 1 (Scoring):** `max_tokens: 4096`
- **Pass 2 (Report):** `max_tokens: 6144`
- Both use `invokeLLM()` from `server/_core/llm.ts` — no model specification needed, uses platform default.
- Both prompts are sent as a single `user` message (no system message).
- JSON fence stripping is applied to both responses before `JSON.parse()`.

---

## Extraction Summary Input

Before Pass 1 runs, the system builds an `extractionSummary` from the run's existing outputs (Pass 1 + Pass 2 extraction results from the Prompt Runner). This gives the coaching agent context about what was already extracted from the consultation.

- Keys `downstream` and `downstream_history` are skipped.
- For each output key, `parsed_json` is preferred over `raw_text`.
- Each output is truncated: `parsed_json` to 3,000 chars, `raw_text` to 2,000 chars.
- If no extraction outputs exist, the summary is `"No extraction outputs available."`

---

## UI Components

### CoachingAgentPage (`/coaching/:run_id`)
- **Radar Chart** — pure SVG, 8-axis polygon showing dimension scores with glow effect
- **Dimension Cards** — expandable cards for each of the 8 dimensions, showing score bar, evidence, and key quote
- **Strength Cards** — green-accented cards with verbatim quote, framework principle badge, and impact statement
- **Improvement Cards** — orange/amber-accented cards with observation, technique, rewrite example, and framework ref
- **Quick Wins** — compact list of 2–3 immediately actionable changes
- **Coaching Focus** — highlighted primary skill to practice

### CoachingHistoryPage (`/coaching`)
- Lists all past coaching analyses with overall score, practitioner name, run ID, and date
- Links to individual coaching reports

---

## The Sales Excellence Framework

The full framework is at: `/home/ubuntu/upload/sales_excellence_framework_complete(1).md`

Key parts referenced by the coaching prompts:

| Part | Title |
|------|-------|
| Part 2 | The Consultation Process — First 90 Seconds |
| Part 3 | LAER — Listen, Acknowledge, Explore, Respond |
| Part 4 | Needs Assessment |
| Part 5 | Education as a Sales Strategy |
| Part 6 | Building Rapport and Trust |
| Part 9 | Value Presentation |
| Part 10 | Objection Handling |
| Part 11 | Closing Techniques |
| Part 13 | Ethical Upselling and Cross-Selling |
| Part 15 | The Follow-Up System |

Core philosophy: **Sales equals education, not persuasion.** Patients make emotional decisions and apply rational justifications afterward. The practitioner's role is trusted advisor, not salesperson.

---

## How to Copy This to a New Project

1. Copy `server/coachingRouter.ts` — contains all prompts and LLM logic
2. Copy `server/coaching.test.ts` — unit tests
3. Copy the `coaching_results` table from `drizzle/schema.ts`
4. Add `coaching: coachingRouter` to `server/routers.ts`
5. Copy `client/src/pages/CoachingAgentPage.tsx` and `CoachingHistoryPage.tsx`
6. Run `pnpm db:push` to create the table
7. The Sales Excellence Framework document (`sales_excellence_framework_complete(1).md`) is embedded in the prompts — no external lookup needed
