# Workstream 02 — Patient Journey View

> **⚠️ SUPERSEDED (2026-05-04).** Building this in the prototype was the wrong call. **Mid-Stream already has this** — `RunsPage`, `RunDetailPage`, `HITLVerificationPage`, etc. cover the transcript-centric / run-history use case. Building it again here would be a parallel system with no win.
>
> **New direction:** see [`06-MIDSTREAM-INTEGRATION.md`](06-MIDSTREAM-INTEGRATION.md). Mid-Stream stays the operational tool. The prototype receives curated *snapshots* from Mid-Stream (static JSON committed into this repo) and renders them as buyer-facing examples.
>
> The notes below are kept as a record of what was considered. Do **not** build this page.

---

## Goal *(original framing — superseded)*

Pick a transcript, see *everything* that's been done with it — every extraction run, every downstream agent output, every variant, in chronological order. The transcript becomes the unit of analysis, not the run.

---

## The problem today

`demo-extraction-live.html` lets you pick a *run*. But a single transcript can have many runs:
- Different prompt versions (v3.1 → v3.2 → v4)
- Different models (gpt-4o-mini → Claude Haiku 4.5 → Sonnet 4.5)
- Re-runs after HITL corrections
- Downstream agent runs (cross-sell, opportunities, email, coaching) that share a transcript

Today's UI shows you one run at a time. You can't see the *history* of a transcript.

The real Prompt Runner DB has 122 transcripts and 274 runs — average ~2.2 runs per transcript, with the golden run alone having 5+ downstream agents.

---

## New page: `demo-journey.html`

### Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Top: Transcript picker                                         │
│  [Practice ▼] [Type ▼] [Search ...]    [Mode: Prototype/Test]  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ ⊳ Sarah Jenkins · Midwest Vein · follow-up · 37min ·   │    │
│  │   2026-04-22 · 5 runs · 3 agents                       │    │
│  └────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────┤
│  Header: transcript meta + collapsible raw text                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2abf90ef… · Midwest Vein · follow-up · 37.5min          │    │
│  │ ▸ View transcript (1,247 lines)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────┤
│  Stats strip                                                    │
│  [5 runs] [3 models] [Latest: v3.2 Haiku 4.5] [Last: 2026-04-22]│
├────────────────────────────────────────────────────────────────┤
│  Timeline (most recent first)                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 2026-04-22 14:21 · v3.2 · Haiku 4.5 · ✓ success         │    │
│  │ extraction · 9 offerings · 6 concerns · 84.6% acc       │    │
│  │ → cross_sell, opportunities, email, coaching            │    │
│  │ [Open detail →]                                          │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ 2026-04-15 09:03 · v3.1 · gpt-4o-mini · ✓ success       │    │
│  │ extraction · 7 offerings · 5 concerns · 71% acc         │    │
│  │ [Open detail →]                                          │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ 2026-03-30 11:55 · v3.0 · gpt-4o-mini · ✓ success       │    │
│  └─────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────┤
│  Latest run summary card (full extraction visible inline)       │
│  [same components as demo-extraction-live.html]                 │
├────────────────────────────────────────────────────────────────┤
│  Downstream activity                                            │
│  cross_sell_guidance_v3 · opportunities_agent ·                 │
│  email_campaign · coaching_pipeline                             │
├────────────────────────────────────────────────────────────────┤
│  Actions                                                        │
│  [▷ Run Variant]  [→ Build TCP from this transcript]           │
│  [→ View as Patient Journey]                                    │
└────────────────────────────────────────────────────────────────┘
```

### Picker behavior

- Search: matches transcript_id prefix, practice name, patient pseudonym
- Filter by practice (Lumiere, Midwest Vein, Skincare by Sharon, etc.)
- Filter by consult_type (initial, follow-up, treatment_visit, procedure)
- Sort by: most recent run, longest duration, most offerings, etc.
- URL hash carries transcript_id so links stick

### Timeline cards

Each card shows:
- Timestamp
- Prompt version + model used
- Success/failure
- Top-line metrics (offering count, concern count, evidence accuracy if eval ran)
- Downstream agents triggered
- Click → opens that specific run on `demo-extraction-live.html#<run_id>`

If two runs have very different outputs, **highlight the diff** — this is the visual hook for workstream 03's variant view.

---

## Data shape

### Prototype mode

Curated example using the golden run + 3-4 staged "earlier runs" of the same transcript. Show the platform improving over versions:

```js
const PROTOTYPE_TRANSCRIPT = {
  id: '2abf90ef-6e10-4b6c-9452-4b19f582a885',
  patient: 'Sarah Jenkins',
  practice: 'Lumiere Aesthetics',
  consult_type: 'follow_up',
  duration_minutes: 37.5,
  raw_text: '...', // first 200 lines
};
const PROTOTYPE_RUNS = [
  {
    run_id: 'e76b2648...',
    prompt_version: 'v3.2',
    model: 'claude-haiku-4-5',
    timestamp: '2026-04-22T14:21:35Z',
    status: 'success',
    metrics: { offerings: 9, concerns: 6, evidence_accuracy: 0.846 },
    downstream: ['cross_sell_guidance_v3', 'opportunities_agent', 'email_campaign', 'coaching_pipeline'],
  },
  // 3-4 earlier runs showing version improvement
];
```

### Test mode

Real Prompt Runner data:

```
GET /transcripts                      → list 122 transcripts
GET /transcripts/{id}                 → single transcript detail
GET /runs?transcript_id={id}          → all runs for that transcript
GET /runs/{run_id}                    → single run with downstream outputs
```

**Backend question to confirm:** does `GET /runs` already support `transcript_id` filter? If not, do client-side filter (only 274 rows) or add it.

---

## UI subtleties

### Visual lineage

When a run is a variant of another (workstream 03), show a small "→ variant of <run_id>" line.

### Outdated runs

Older runs against an older prompt version are visually de-emphasized (opacity 0.7, gray border) so the latest stands out.

### Empty / sparse transcripts

Some transcripts only have 1 run. Don't render an empty timeline — just show the single run prominently.

### Failed runs

Failure rows show in a soft red. Click to see the error message + retry button (Test mode).

---

## Connecting to other pages

Buttons at the bottom act as launching points:

| Action | Goes to | State carried |
|--------|---------|---------------|
| `Run Variant` | Modal (workstream 03) | transcript_id |
| `Build TCP from this` | demo-tcp-builder.html | transcript_id, latest run_id (URL hash) |
| `View extraction detail` | demo-extraction-live.html#<run_id> | run_id |
| `See coaching report` | demo-agents.html?run=<run_id> | run_id |

---

## Hero/landing changes

`demo-hero.html` should grow a "Pick a transcript" entry point — clicking jumps to demo-journey.html. This positions the journey view as the primary workflow entry, not just a side page.

---

## Scope split

This workstream is large enough to ship in two PRs.

### PR A — Prototype path (this workstream's first PR)

- New page `demo-journey.html`
- Hardcoded transcript picker (5 staged transcripts)
- Hardcoded timeline of 4 runs against the golden transcript
- All UI components (cards, timeline, stats strip, action buttons)
- Wire transcript_id into URL hash
- Buttons launch other pages with the right hash

### PR B — Test path

- Replace hardcoded picker with API fetch (`/transcripts`)
- Replace hardcoded timeline with API fetch (`/runs?transcript_id=`)
- Cancel in-flight on mode change
- Loading + error states
- Add transcript_id filter to `/runs` if backend missing

### Out of scope (later workstreams)

- Variant runs UI (workstream 03)
- Cross-page state synchronization beyond URL hash (workstream 05)
- Sankey / flow diagram (workstream 05)

---

## Estimated size

- PR A: ~400 lines (new page + integration)
- PR B: ~200 lines (swap hardcoded → fetch + states)

---

## Demo value

This is the page where the buyer's "where's the audit trail?" question gets answered. They pick a transcript, scroll the timeline, and see the platform's reasoning evolve over time — with version stamps, model stamps, and metric deltas.

It's also the page where internal review happens: "show me all 5 runs against this transcript, did v4 actually improve over v3.2?"
