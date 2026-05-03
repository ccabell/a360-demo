# A360 Design System

> **Architecture Note:** This document is organized into two layers that must never be conflated.
>
> **Layer 1 — Core Intelligence Principles** are permanent, implementation-agnostic rules that govern how data is presented, what gets displayed, and how outputs are written. These rules hold regardless of which front-end framework, design system, or visual theme is in use. They cannot be overridden by visual preferences.
>
> **Layer 2 — Implementation Guidance** covers visual and component-level decisions that may vary across design systems, themes, or project contexts. These are defaults for the current Manus implementation and may be adapted for other front ends.

---

## LAYER 1: CORE INTELLIGENCE PRINCIPLES

*These rules are non-negotiable. They apply to every implementation of A360, regardless of technology stack, design system, or visual theme.*

---

### 1.1 The Grounding Rule

**Only display data that is grounded in what was actually spoken during the consultation.** Do not infer, extrapolate, or fill in gaps with plausible-sounding content. If a topic was not addressed in the transcript, it does not appear in the output.

This is the single most important rule in the entire system. Every other rule flows from it.

---

### 1.2 The Silence Rule

**Absence of data is not a failure state — it is information.** When a field, card, or section has no grounded data to display, it is omitted entirely. The UI must never show empty cards, placeholder text, dashes, or "N/A" values. Omission is the correct behavior.

**Examples of correct behavior:**
- No revenue leak detected → Revenue Leak card does not appear
- No objection raised → Objection Handling section does not appear
- Ask for sale not applicable (scheduled maintenance appointment) → Closing & Commitment does not appear

**Examples of incorrect behavior:**
- Showing a card with "No data available"
- Showing a score of 0 because the behavior was not observed
- Showing a section header with no content beneath it

---

### 1.3 The Minimum Data Rule

**Aggregate metrics and pattern-level observations require a minimum data threshold before they are displayed.** A single data point is not a pattern. Displaying a trend, score, or aggregate from insufficient data is misleading and undermines trust.

**Minimum thresholds by metric type:**

| Metric Type | Minimum Required |
|---|---|
| Provider-level aggregate score or trend | 5 consultations of the same type |
| Dimension-level observation (e.g., "strong at rapport") | 3 consultations where that dimension was observable |
| Revenue impact estimate | 5 consultations with relevant financial data |
| Team-level benchmark | 3 providers with ≥5 consultations each |
| "Most common objection" pattern | 5 instances of the same objection type |

When the threshold is not met, the metric is either omitted or replaced with a contextual note: *"More consultations needed to establish a reliable pattern in this area."*

---

### 1.4 The Consultation Type Classification Rule

**Not all consultations are the same type, and metrics must only be compared within the same type.** Comparing a new patient aesthetic consultation to a scheduled maintenance neurotoxin appointment is a category error.

**Consultation types:**

| Type | Definition | Applicable Metrics |
|---|---|---|
| New Patient Aesthetic Consultation | First visit, treatment planning discussion, goals assessment | All dimensions applicable |
| Existing Patient Upsell Consultation | Returning patient, introducing new treatment area | Needs assessment, cross-sell, plan clarity |
| Scheduled Maintenance Appointment | Pre-booked treatment, no decision required | Patient education, rapport only |
| Objection / Re-engagement Consultation | Patient expressed hesitation or declined previously | Objection handling, financial discussion |

**A provider should never receive a low score for "Ask for Sale" on a scheduled maintenance appointment.** The dimension simply does not apply and must not appear.

---

### 1.5 The Output Writing Standard

Every AI-generated text output must follow this four-part structure. All four parts are required when the data supports them.

**Part 1 — What Happened:** A plain-language statement of the specific behavior or event observed in the transcript. No jargon. No insider terminology. One to two sentences.

**Part 2 — Why It Matters:** The clinical, commercial, or patient experience implication of what happened. This must be written for a provider who has no prior knowledge of A360, sales methodology, or coaching frameworks. One to two sentences.

**Part 3 — The Evidence:** A verbatim quote from the transcript that supports the observation. This is required for all strength and opportunity observations. Format: *"[exact quote]"*

**Part 4 — What To Do:** A specific, actionable next step. Not a general principle — a concrete behavior the provider can perform in their next consultation. One to two sentences.

**The Context Sufficiency Test:** Before any output is finalized, apply this test: *Can the reader understand this output without any prior knowledge of A360, the coaching framework, or sales methodology?* If the answer is no, rewrite it.

**Insider Terminology Rule:** The following terms must never appear in provider-facing output without plain-language explanation:
- LAER (write: "listen, acknowledge, explore, respond technique")
- Confidence trigger (write: the specific motivation observed)
- Dimension score (eliminated — do not use)
- Acknowledge-Explore-Resolve (write: "a technique where you validate the concern, explore the real reason behind it, then address it directly")
- Cross-sell opportunity (write: "an opportunity to introduce a complementary treatment")
- Conversion rate (write: "how often consultations result in a booking")

---

### 1.6 The Coaching Model

**The dimension scoring system is eliminated.** Scores compress nuance into a number that cannot be acted on, invite defensiveness rather than curiosity, and are misleading when data is insufficient.

**The replacement model has two levels:**

**Session Analysis** (tied to a specific transcript):
- Strengths: What the provider did well, with evidence and explanation
- Opportunities: Specific areas where a different approach would have improved the outcome, with evidence and a suggested alternative
- Observations: Neutral contextual notes that do not fit the strength/opportunity frame

**Provider Analysis** (aggregate across ≥5 consultations of the same type):
- Consistent Strengths: Behaviors that appear in the majority of consultations
- Development Areas: Patterns of missed opportunity across multiple consultations
- High-Level Observations: Context about the provider's overall style and approach

**What is explicitly removed:**
- Numerical scores (1–10, percentages, LAER Score)
- Progress bars
- Score labels (Excellent, Good, Needs Work)
- Radar charts
- Any visualization that implies a single number summarizes a complex behavior

---

### 1.7 The Adaptive Card Sizing Rule

**Card width is determined by content volume and information type, not by layout symmetry and not by user preference.** When planning a layout, the question is never "how do you want these cards displayed?" — it is "what is the right width for this content?"

**Sizing decision table:**

| Content Type | Elements | Correct Width |
|---|---|---|
| Single-sentence insight, prompt, or tip | 1–2 | One-third column (3-col grid) |
| Opportunity card with evidence quote | 3–4 | Half column (2-col grid) |
| Strength or observation with full four-part output | 4–5 | Half column (2-col grid) |
| Primary focus area with revenue estimate | 5–6 | Two-thirds or full width |
| Session summary with multiple data points | 7+ | Full width |

**The Empty Space Test:** If more than 40% of a card's visible area is empty space, the card is too wide. Resize it.

**Specific rules for known card types:**
- Self-reflection prompt: one-third column — it is a single sentence
- One practice tip: one-third column — it is a single sentence
- Opportunity card (Financial Discussion, Plan Clarity, Referral Requesting): one-third column each, displayed as a three-column row
- Primary focus area: two-thirds width minimum — it carries the most important actionable content
- Transcript quote block: full width — quotes need breathing room and visual weight

**When in doubt:** Place cards in the narrowest column that fits the content without truncation. Expand only when the content genuinely requires it.

---

## LAYER 2: IMPLEMENTATION GUIDANCE

*These are defaults for the current Manus/React implementation. They may be adapted for other front-end design systems while Layer 1 rules remain in force.*

---

### 2.1 Visual Design Foundation

**Design Movement:** Terminal Intelligence — the aesthetic of high-stakes data environments (Bloomberg Terminal, Figma, Linear) applied to healthcare AI.

**Background Depth (three required layers):**

| Layer | Purpose | Value |
|---|---|---|
| Floor | Page background | `#080c14` |
| Card | Standard card background | `#111827` |
| Inset | Panel inside a card, code block, quote | `#1a2235` |

Never collapse to two layers. The depth between floor and card is what makes cards read as elevated surfaces rather than flat boxes.

**Accent Color:**
- Primary: `#3b82f6` (blue-500) — interactive elements, active states
- Success: `#10b981` (emerald-500) — positive signals, confirmed items
- Warning: `#f59e0b` (amber-500) — attention, caution
- Destructive: `#ef4444` (red-500) — errors, critical flags

---

### 2.2 Typography System

**Font Stack:**
- Display / headings: `Space Grotesk` — geometric, authoritative
- Body / labels: `Inter` — readable, neutral
- Data values / numbers: `JetBrains Mono` — monospaced, precise

**The Mono Rule:** Every numeric value displayed in the UI must use `JetBrains Mono`. This includes scores, counts, percentages, currency values, durations, and timestamps. This is the single highest-leverage typography decision in the system.

**Label Hierarchy:**
```
Section label:  font-size: 9px | font-weight: 700 | text-transform: uppercase | letter-spacing: 0.08em | color: #6b7280
Card title:     font-size: 13px | font-weight: 600 | color: #e5e7eb
Body text:      font-size: 13px | font-weight: 400 | color: #9ca3af
Data value:     font-family: JetBrains Mono | font-size: varies | color: #f9fafb
```

---

### 2.3 Card Anatomy

Every card in the system must have all six of the following layers. Omitting any layer produces a visually flat card.

1. **Accent line:** 2px top border using the card's semantic color (blue for intelligence, green for strength, amber for opportunity)
2. **Background:** `#111827` with `border: 1px solid rgba(255,255,255,0.06)`
3. **Section label:** 9px uppercase label in the top-left corner
4. **Content:** Title, body, evidence, action — following the four-part output structure
5. **Hover state:** `background: #1a2235` transition on hover, 150ms ease
6. **Entrance animation:** Fade-in with 4px upward translate, staggered by 60ms per card

---

### 2.4 Component Library

Before implementing any UI feature, check whether a shared component already exists. The following components are defined and must be used rather than reimplemented:

- `DataValue` — renders any numeric value in JetBrains Mono with correct sizing
- `SectionLabel` — renders 9px uppercase label with correct spacing
- `ModuleCard` — base card with accent line, background, hover, and entrance animation
- `TranscriptQuote` — full-width quote block with italic formatting and attribution
- `FourPartOutput` — structured output following the What Happened / Why It Matters / Evidence / What To Do pattern
- `ConditionWrapper` — renders children only when a data condition is met; renders nothing otherwise

---

### 2.5 Navigation and Layout

**Module Hub:** The entry point for all modules. Cards display module name, status (Live / Beta / Coming Soon), and a one-sentence description. Only Live modules are clickable.

**Module Pages:** Each module page uses a persistent left sidebar for navigation within the module, a top header with the module name and session context, and a main content area. No module page is a dead end — every page has a clear path back to the hub.

**Sidebar:** Fixed width, `#0d1117` background, section labels for navigation groups, active state with left accent bar.

---

### 2.6 Technology Stack (Current Implementation)

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui |
| Routing | Wouter |
| Fonts | Google Fonts (Space Grotesk, JetBrains Mono, Inter) |
| Charts | Recharts (when data thresholds are met) |
| Animation | CSS transitions + Tailwind animate |

---

### 2.7 Repository and Commit Instructions

**Repository:** Connected to GitHub via `user_github` remote. All changes are committed to the `main` branch.

**Commit workflow:** Use `webdev_save_checkpoint` for all commits. Do not use `git reset --hard`. Use `webdev_rollback_checkpoint` to revert to a previous state.

**File structure:**
```
client/src/pages/        — Page-level components (one per module view)
client/src/components/   — Shared UI components and module sub-components
client/src/lib/          — Data files, utilities, type definitions
client/src/index.css     — Global design tokens (do not modify without design review)
```

---

*Last updated: April 2026 — Manus + GSD alignment revision*
*Layer 1 rules are permanent. Layer 2 defaults are subject to revision per implementation context.*
