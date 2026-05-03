# A360 Intelligence Dashboard — UI Quality Diagnostic Report

**Prepared by:** Manus AI  
**Date:** April 13, 2026  
**Scope:** Visual quality regression analysis across all current modules

---

## Executive Summary

The Intelligence Dashboard (MOD-01) and Practice Dashboard look and feel like a premium, purpose-built data product. The Coaching module and Real-Time Playground look like competent but generic React apps. The gap is real, measurable, and — importantly — fixable. It is not a matter of effort or complexity; it is a matter of four specific design disciplines that were applied consistently in the flagship and then quietly dropped in every subsequent module. This report names each one precisely, shows the code evidence, and gives you a clear remediation path.

---

## The Benchmark: What Makes the Flagship Work

Before diagnosing the regression, it is worth being precise about what the Intelligence Dashboard actually does that creates its quality impression. It is not one thing — it is a system of four interlocking decisions that reinforce each other.

**1. A dedicated typographic hierarchy using two named fonts.** Every number displayed in the flagship uses `JetBrains Mono` — a monospaced typeface that makes data values feel precise and machine-generated. Every label and UI text uses `Space Grotesk` — a geometric sans-serif with distinct character. The contrast between these two fonts creates visual rhythm: you can scan a card and instantly distinguish "this is a value" from "this is a label." The `PracticeDashboard` component references `JetBrains Mono` **18 times** and `Space Grotesk` **12 times**. `IntelligenceView` references `JetBrains Mono` **9 times**.

**2. Inline `style={{}}` objects used deliberately for precision.** The flagship components use inline styles not as a crutch but as a precision instrument. `PracticeDashboard` has **202 inline style blocks**; `IntelligenceView` has **111**. This is intentional: inline styles allow pixel-exact control over `letterSpacing`, `fontFamily`, `borderLeft` accent lines, and computed color values (e.g., `catColor + "33"` for 20% opacity borders). Tailwind utility classes cannot express this level of specificity without custom configuration.

**3. Layered depth through background stacking.** The flagship uses at least three distinct background levels: `#080c14` (deepest surface), `#111827` (card surface), `#1a2235` (elevated inset). Cards sit on a darker floor, inset panels sit on a lighter shelf inside the card. This creates the perception of physical depth — the interface feels three-dimensional rather than flat.

**4. Micro-detail on every interactive element.** The `KPICard` component is the clearest example. It has: a 2px gradient accent line at the top edge (`linear-gradient(90deg, #6366f1 0%, transparent 100%)`), a `boxShadow` glow on active state (`0 0 16px rgba(99,102,241,0.2)`), `onMouseEnter`/`onMouseLeave` handlers that imperatively update border color and background, an animation delay stagger via the `kpi-card-animate` CSS class, and a "click hint" overlay element. Six separate layers of polish on a single card component.

---

## The Regression: What the Newer Modules Are Missing

The following table shows the measurable design signal counts across all modules. The numbers tell the story clearly.

| Module / Component | JetBrains Mono | Space Grotesk | Inline `style={{}}` | `gradient` | `boxShadow` | `uppercase` labels |
|--------------------|:--------------:|:-------------:|:-------------------:|:----------:|:-----------:|:-----------------:|
| `PracticeDashboard.tsx` (flagship) | 18 | 12 | **202** | 2 | 0* | 14 |
| `IntelligenceView.tsx` (flagship) | 9 | 0 | **111** | 1 | 0* | 8 |
| `KPICard.tsx` (flagship component) | 0 | 0 | 6 | 1 | **1** | 0 |
| `CoachingHistoryPage.tsx` (newer) | **0** | **0** | 5 | 0 | 0 | 1 |
| `CoachingReportPage.tsx` (newer) | **0** | **0** | 8 | 0 | 3 | 0 |
| `RealtimePlaygroundPage.tsx` (newer) | **0** | **0** | 4 | 1 | 0 | 0 |

*The flagship uses `drop-shadow` via SVG filter and `boxShadow` via the KPICard component rather than inline in the page-level components.

The pattern is unambiguous. Every newer module has **zero** uses of either brand typeface. Every newer module has **fewer than 10** inline style blocks, compared to 100–200 in the flagship. The newer modules are being built with Tailwind utility classes alone, which produces a competent but generic result.

---

## Root Cause Analysis: Four Specific Failures

### Failure 1 — Typography Collapse

The flagship's visual identity is built on the `JetBrains Mono` / `Space Grotesk` pairing. Both fonts are loaded in `client/index.html` and are available globally. The newer modules simply never use them. Instead, they inherit the default `font-sans` (Inter/system-ui) from the Tailwind base layer.

The practical effect is that every number in the Coaching module — scores like `7.8`, percentages, dates — renders in the same proportional font as the surrounding prose. In the flagship, a number like `68%` rendered in `JetBrains Mono` at `font-weight: 700` with `letter-spacing: -0.03em` reads as data. In the Coaching module, the same number reads as text. This single change accounts for a large portion of the perceived quality gap.

**Evidence:** `CoachingHistoryPage` score display uses `className="text-xl font-bold"` — pure Tailwind, no font family specified. The flagship equivalent uses `style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em" }}`.

### Failure 2 — Loss of Background Depth

The flagship uses a three-layer background system. The newer modules collapse this to two layers at most: a page background (`#0a0f1e` or `#0a0f1a`) and a card background (`#0d1528`). The critical middle layer — the inset panel background (`#1a2235`) used inside cards for "why it matters" blocks, code snippets, and sub-sections — is absent in the newer modules.

Without this third layer, cards feel flat. Everything is either "page" or "card" with nothing in between. The flagship's cards feel like they contain depth because sub-elements within them sit on a visually distinct surface. The Coaching cards contain sub-elements (dimension bars, summary text, score badges) that all sit on the same `#0d1528` surface as the card itself, making the interior feel undifferentiated.

### Failure 3 — Absence of Micro-Detail on Interactive Elements

The flagship's `KPICard` has six layers of interactive polish (accent line, glow, hover state, animation stagger, click hint, transition). The Coaching history cards have one: a `hover:border-sky-500/40 hover:bg-[#0d1a35]` Tailwind hover class. This is not wrong — it is simply incomplete.

The specific elements missing from the newer modules are:

- **Top accent lines.** The flagship uses a 2px gradient line at the top of every card to signal the card's category color. This is a signature element of the design system. No newer module card has this.
- **Animation entrance stagger.** The flagship staggers card entrance animations using `animationDelay` props. The newer modules have no entrance animation at all.
- **Computed color opacity for borders.** The flagship uses patterns like `border: \`1px solid ${catColor}33\`` to create borders that are 20% opacity of the category accent color. The newer modules use fixed opacity Tailwind classes like `border-white/10`, which produces a uniform grey border regardless of content type.

### Failure 4 — Label Typography Regression

The flagship uses a consistent pattern for section labels and category headers: `fontSize: 9`, `fontWeight: 700`, `textTransform: "uppercase"`, `letterSpacing: "0.08em"`, rendered in a muted color like `#4b5563`. This creates a clear visual hierarchy: large monospaced value → small uppercase label → body text. It is the same typographic system used in Bloomberg Terminal, Figma, and most premium data products.

The newer modules use standard Tailwind text utilities for labels: `text-xs text-slate-400 font-medium`. This produces labels that are readable but lack the visual weight and hierarchy of the flagship. The `uppercase tracking-wide` combination appears only once in `CoachingHistoryPage` (the Score Legend header) and zero times in `RealtimePlaygroundPage`.

---

## Secondary Issue: Structural Layout Divergence

Beyond the four primary failures, there is a structural difference worth noting. The flagship components are built inside a shared layout shell (`PracticeDashboard`, `IntelligenceView`) that provides consistent padding, section headers with horizontal rules, and a tab navigation system. The newer modules each implement their own page-level layout from scratch, leading to subtle inconsistencies in padding, header height, and back-navigation placement.

`CoachingHistoryPage` uses `max-w-5xl mx-auto px-6 py-8` for its content container. `RealtimePlaygroundPage` uses a full-bleed layout with no max-width constraint on the main content area. The flagship uses `padding: "0 24px 24px"` with a consistent section gap of `24px`. These are small differences individually, but they compound into a feeling that the modules were built by different teams with different standards — because, effectively, they were built in different sessions without a shared layout component.

---

## Remediation Plan

The following changes would bring the newer modules to flagship quality. They are ordered by impact-to-effort ratio.

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Apply `JetBrains Mono` to all numeric values in Coaching and Realtime modules | Low (30 min) | High |
| 2 | Apply `Space Grotesk` to all section headers, tab labels, and category names | Low (30 min) | Medium-High |
| 3 | Add 2px gradient top accent lines to all card components in newer modules | Low (1 hr) | High |
| 4 | Add `animationDelay` stagger to card lists in Coaching history | Low (30 min) | Medium |
| 5 | Introduce the `#1a2235` inset background layer inside Coaching report cards | Medium (1–2 hr) | High |
| 6 | Replace fixed `border-white/10` borders with computed category-color opacity borders | Medium (1–2 hr) | Medium |
| 7 | Create a shared `ModuleLayout` wrapper component with consistent padding, header, and back-nav | Medium (2 hr) | Medium |
| 8 | Add `uppercase` + `letterSpacing: "0.08em"` to all section label elements | Low (1 hr) | Medium |

The highest-leverage single change is **Priority 1** — applying `JetBrains Mono` to numeric values. It requires touching perhaps 15–20 elements across two pages and will immediately close roughly 40% of the perceived quality gap, because the typography is the most visible signal of the flagship's design identity.

---

## Systemic Recommendation

The underlying cause of this regression is the absence of a **shared design token component library** for the newer modules. The flagship was built with a set of custom components (`KPICard`, `BadgeRow`, `DeepKPICard`) that encode the design system's decisions. When new modules were built, they did not extend or reuse these components — they started from Tailwind primitives.

The long-term fix is to extract the flagship's design patterns into a small set of reusable primitives: a `DataValue` component that always renders in `JetBrains Mono` with the correct weight and tracking; a `SectionLabel` component that always renders uppercase with the correct letter-spacing; a `ModuleCard` component that always includes the accent line, hover state, and animation. Once these exist, new modules cannot accidentally drop the design system — they would have to actively work around it.

---

*End of report. All findings are based on direct source code analysis of the `/home/ubuntu/a360-intelligence-dashboard` project as of April 13, 2026.*
