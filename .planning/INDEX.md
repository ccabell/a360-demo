# End-to-End Prototype Plans — Index

**Created:** 2026-05-04
**Pivoted:** 2026-05-04 — see workstream 06

**Goal:** Evolve the prototype into a buyer-facing showcase that renders curated snapshots from real consultations. Operate-on-real-data work lives in **Mid-Stream**, not the prototype.

---

## The pivot (read this first)

Originally these plans tried to add transcript-history, run picking, variant comparison, and HITL into the prototype. **Wrong.** Mid-Stream already has all of that. We don't build a parallel system.

New mental model:

```
Mid-Stream  ────►  curated snapshots  ────►  Prototype
(operates)         (committed JSON)           (renders)
```

The prototype's job is to render curated examples beautifully. Mid-Stream's job is to operate on real data. They communicate by static JSON snapshots committed into the prototype repo.

---

## Workstreams (corrected)

| # | Plan | What it adds | Status |
|---|------|--------------|--------|
| 1 | [01-MODE-TOGGLE.md](01-MODE-TOGGLE.md) | Prototype ↔ Test toggle. Test mode now means "render snapshots", not "live API". | Active |
| 2 | [02-PATIENT-JOURNEY.md](02-PATIENT-JOURNEY.md) | ~~Pick a transcript, see its history~~ | **Superseded — lives in Mid-Stream** |
| 3 | 03-TRANSCRIPT-VARIABLES.md *(not written)* | ~~Run a transcript with different model / prompt / practice~~ | **Mostly superseded — variant runs belong in Mid-Stream's RunDetailPage** |
| 4 | 04-TCP-CONTENT.md *(not yet written)* | Real marketing + education content visible in TCP Builder (videos, PDFs, B/A photos, email templates) | Active — write next |
| 5 | 05-END-TO-END.md *(not written)* | ~~Stitch prototype pages into a journey~~ | Reframed — see workstream 06 §7 |
| 6 | [06-MIDSTREAM-INTEGRATION.md](06-MIDSTREAM-INTEGRATION.md) | Mid-Stream as ops tool; snapshot-to-prototype workflow; Mid-Stream evaluation; broken-endpoint repair plan | **Active — primary** |

Net: 2 active workstreams (01 + 04 + 06) and one structural framework (06) that supersedes most of what 02/03/05 were trying to do.

---

## Recommended sequence

1. **Workstream 06 evaluation pass** — the user wants to evaluate Mid-Stream from Claude Code. Land that first. It also surfaces the broken-endpoint repair.
2. **Workstream 01 — Mode Toggle** — small, foundational, useful regardless of where data comes from.
3. **Workstream 04 — TCP Content** — pure showcase. No backend dependency. Buyer-shareable on day one.
4. **Workstream 06 implementation** — actual snapshot-to-prototype mechanism. Comes after 01 and 04 so we have a real test target.

---

## What I had planned for the dropped workstreams (executive summary)

Keeping this for the record. The user asked for the planning outcome — here it is in compressed form.

### 02 — Patient Journey (DROPPED)

A new `demo-journey.html` page where you pick a transcript and see every run, every agent output, every variant in chronological order. Stats strip showing model count, evidence-accuracy trend across versions, downstream activity flat list. Connects to extraction-live for run detail, TCP Builder for plan generation.

Why dropped: this is exactly `RunsPage` + `RunDetailPage` in Mid-Stream.

### 03 — Transcript Variables (MOSTLY DROPPED)

"Run Variant" button — modal where you pick prompt version, model, practice context, optional P1 override, hit Run, watch new run appear in side-by-side compare with the previous one. Backend would need a `POST /transcripts/{id}/variants` endpoint and `runs.variant_of_run_id` lineage column.

Why mostly dropped: variant runs are operator work, not buyer-facing. Belongs in Mid-Stream's `RunDetailPage`. The prototype could still show committed snapshots of variant comparisons for demo purposes, but the variant *running* doesn't happen in the prototype.

### 05 — End-to-End Stitching (REFRAMED)

Cross-page transcript_id state, "Continue to TCP →" buttons at each stage, optional Sankey diagram visualizing the data flow.

Why reframed: the cross-page state and continue-buttons are still mild UX wins. They land naturally as a small follow-on to whatever workstream needs them. The Sankey is showcase-territory and can join workstream 04 if the visual is wanted.

---

## Backend dependencies (revised)

| Need | For | Status |
|------|-----|--------|
| `gl_product_content` / `gl_service_content` populated for ~10 items | Workstream 04 | Backfill task — small Supabase seed |
| Snapshots folder + `INDEX.json` schema | Workstream 06 | Convention only — no backend |
| GitHub Action / endpoint to commit a snapshot from Mid-Stream | Workstream 06 | New — small |
| Mid-Stream broken endpoints (downstream / HITL / extraction) | Mid-Stream eval — see workstream 06 §4 | **Decision needed: patch Mid-Stream or build endpoints in Prompt Runner** |

---

## Risks & open questions

1. **Manus → GitHub sync direction.** Before any Claude Code commit to Mid-Stream, confirm with the user whether Manus would overwrite it on the next sync. (See `CLAUDE.md` Mid-Stream section.)
2. **PHI in snapshots.** Real transcripts have PHI. Snapshots committed to a public-ish repo need redaction or use of synthetic test transcripts only. Decision needed before workstream 06 implementation.
3. **Snapshot governance.** Anyone-with-Mid-Stream can push, or PR-gated? PR-gated is safer for a buyer-facing artifact.
4. **Mid-Stream missing endpoints — patch vs build.** See workstream 06 §4.

---

## What this gets us when shipped

A buyer demo where:

1. The prototype renders polished, real (anonymized or synthetic) consultation snapshots curated by ops staff.
2. The mode toggle flips between "curated showcase view" (default) and "raw snapshot data" (auditor view).
3. TCP Builder shows real education + marketing content next to each treatment.
4. Mid-Stream remains the place where actual work happens — and we can now work on it from Claude Code rather than only Manus.

No parallel system. Two repos with a clean push-direction.
