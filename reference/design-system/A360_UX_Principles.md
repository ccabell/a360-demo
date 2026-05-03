# A360 UX Principles

> **Architecture Note:** Like all A360 planning documents, this file is organized into two layers.
>
> **Layer 1 — Core Intelligence Principles** govern what is displayed, when it is displayed, and how outputs are written. These are permanent and implementation-agnostic.
>
> **Layer 2 — Implementation Guidance** covers interaction patterns, navigation, and component behavior for the current Manus/React implementation. These may be adapted for other front ends.

---

## LAYER 1: CORE INTELLIGENCE PRINCIPLES

---

### 1.1 The Fundamental UX Contract

**The interface must never lie by omission or by implication.** Every element visible on screen makes an implicit claim: "this information is meaningful and grounded in real data." If that claim cannot be supported, the element must not appear.

This means the interface is not a template that gets filled in — it is a dynamic surface that expands and contracts based on what the data actually supports.

---

### 1.2 Conditional Display Rules

**Show only what is grounded. Omit everything else.**

The following conditions must be evaluated before any section, card, or data point is rendered:

| Condition | Correct Behavior |
|---|---|
| No data for this field | Omit the field entirely |
| Data exists but threshold not met | Show contextual note or omit |
| Consultation type makes dimension inapplicable | Omit the dimension entirely |
| Only one data point exists | Do not display as a trend or pattern |
| Score would be based on a single observation | Do not display the score |

**The most common UX mistake in this system** is showing a card, section, or metric because it is part of a template, not because the data supports it. Every render decision must be conditional.

---

### 1.3 Output Writing Standards

All AI-generated text outputs must follow the four-part structure defined below. This structure applies to every strength, opportunity, observation, and recommendation in the system.

**The Four-Part Output Structure:**

**Part 1 — What Happened**
A plain-language statement of the specific behavior or event observed. No jargon. No insider terminology. Written for a provider who has never heard of A360 or sales coaching frameworks. Maximum two sentences.

*Example of correct output:*
> The financial discussion was brief. Framing the investment in terms of value and monthly options can make the decision easier for patients.

*Example of incorrect output:*
> Comprehensive LAER-based discovery that uncovered both surface concerns and deeper motivations. Identified the patient's 'confidence trigger' — wanting to feel as good as she looks.

The second example fails because it uses insider terminology (LAER, confidence trigger) without explanation and does not tell the reader what actually happened or why it matters to them.

**Part 2 — Why It Matters**
The clinical, commercial, or patient experience implication of what happened. Written for a provider without prior knowledge of the coaching framework. Maximum two sentences.

**Part 3 — The Evidence**
A verbatim quote from the transcript that supports the observation. Required for all strength and opportunity outputs. Format: *"[exact quote from transcript]"*

**Part 4 — What To Do**
A specific, actionable next step. Not a general principle — a concrete behavior the provider can perform in their next consultation. Maximum two sentences.

---

### 1.4 The Context Sufficiency Test

Before any output is finalized, apply this test:

> *Can the reader understand this output without any prior knowledge of A360, the coaching framework, or sales methodology?*

If the answer is no, rewrite it. The output must stand alone. A provider reading it for the first time should immediately understand what happened, why it matters, and what to do — without needing to ask a follow-up question.

---

### 1.5 Insider Terminology Rules

The following terms are internal-only and must never appear in provider-facing output without plain-language translation:

| Internal Term | Provider-Facing Translation |
|---|---|
| LAER | "a technique where you listen, acknowledge the concern, explore the real reason behind it, then respond directly" |
| Confidence trigger | Describe the specific motivation: "the patient's desire to feel like herself again" |
| Dimension score | Eliminated — do not use |
| Acknowledge-Explore-Resolve | "a technique where you validate the concern, explore the real reason behind it, then address it directly" |
| Cross-sell opportunity | "an opportunity to introduce a complementary treatment" |
| Conversion rate | "how often consultations result in a booking" |
| LAER Score | Eliminated — do not use |

---

### 1.6 Revenue Translation Rule

When a development area is identified and the consultation data supports a revenue estimate, a dollar figure must be included. The estimate must be grounded in the consultation data — not a generic industry statistic.

**Correct:**
> Closing this gap is estimated to recover $2,285/month in missed revenue based on your current consultation volume.

**Incorrect:**
> Studies show that practices that address this area see 15–30% revenue improvement.

The first is grounded in the provider's actual data. The second is a generic claim that could apply to anyone.

When the data does not support a specific estimate, the revenue translation is omitted. Do not substitute a generic statistic.

---

### 1.7 The Coaching Model

**Dimension scores are eliminated.** The replacement model is:

**Session Analysis** (per transcript):
- Strengths: What the provider did well, with evidence
- Opportunities: What could have been done differently, with evidence and a suggested alternative
- Observations: Neutral contextual notes

**Provider Analysis** (aggregate, ≥5 consultations of the same type):
- Consistent Strengths: Behaviors that appear across the majority of consultations
- Development Areas: Patterns of missed opportunity
- High-Level Observations: Context about overall style and approach

**What is removed:** Numerical scores, progress bars, score labels, radar charts, LAER Score, any visualization that implies a single number summarizes a complex behavior.

---

## LAYER 2: IMPLEMENTATION GUIDANCE

*These are defaults for the current Manus/React implementation. They may be adapted for other front ends while Layer 1 rules remain in force.*

---

### 2.1 Navigation Principles

**No dead ends.** Every page must have a clear path back to the module hub. Every module must have a clear path back to the main hub. If a user can navigate into a page, they can navigate out of it without using the browser back button.

**Persistent sidebar for module pages.** Once inside a module, the left sidebar remains visible and shows the module's internal navigation. The sidebar does not disappear on any sub-page.

**Module Hub as the home base.** The hub is the entry point for all modules. It shows module name, status (Live / Beta / Coming Soon), and a one-sentence description. Only Live modules are clickable. Coming Soon modules are visible but not interactive.

---

### 2.2 Empty States

**Empty states are not failure states.** When a module has no data yet, the empty state communicates what the module will show when data is available — not that something went wrong.

**Empty state structure:**
- Icon relevant to the module
- One-sentence explanation of what will appear here
- One-sentence instruction for how to get data into the module (e.g., "Run your first extraction to see results here")
- No error language, no apology, no "N/A"

---

### 2.3 Loading and Transition States

**Never show a loading spinner for more than 300ms without a progress indicator.** If a process takes longer than 300ms, show a progress bar or step indicator so the user knows the system is working.

**Entrance animations are required.** Cards and sections must not appear instantaneously. Use a staggered fade-in with upward translate (4px, 60ms stagger per card). This is not decorative — it communicates that the content was computed, not retrieved from a static template.

---

### 2.4 Interaction Patterns

**Expandable evidence.** Any card that references a transcript quote must have an expandable section that shows the full quote in context. The quote is collapsed by default; the user expands it to see more.

**Copy on demand.** Any text output that a provider might want to share, paste into a note, or send to a patient must have a copy button. This includes: self-reflection prompts, practice tips, suggested responses, treatment plan summaries.

**Drill-down from aggregate to session.** Any aggregate metric (provider-level pattern, team average) must be clickable and drill down to the specific sessions that contributed to it. A number without a source is not trustworthy.

---

### 2.5 Responsive Behavior

**The primary use case is desktop.** The dashboard is designed for a practice manager or provider reviewing data on a laptop or desktop monitor. Mobile is a secondary use case.

**Minimum supported width:** 1024px. Below this width, the layout collapses to a single column and the sidebar becomes a top navigation bar.

**Card grids on mobile:** All multi-column card grids collapse to single column on screens narrower than 768px.

---

### 2.6 Accessibility

**Color is never the only signal.** Every status indicator (strength, opportunity, warning) uses both color and an icon or label. A colorblind user must be able to interpret all content.

**Focus rings are always visible.** Do not suppress the browser's default focus ring. Style it to match the design system, but never remove it.

**Interactive elements have a minimum touch target of 44×44px.** This applies to buttons, links, and expandable sections.

---

*Last updated: April 2026 — Manus + GSD alignment revision*
*Layer 1 rules are permanent. Layer 2 defaults are subject to revision per implementation context.*
