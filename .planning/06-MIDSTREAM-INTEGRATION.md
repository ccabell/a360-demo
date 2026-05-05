# Workstream 06 — Mid-Stream as the Operational Tool, Prototype as the Showcase

**Created:** 2026-05-04
**Replaces:** Workstream 02 (Patient Journey) — partially Workstream 03 (Variants) and 05 (End-to-End)

This is the corrected direction after a pivot. Mid-Stream already does the run-history / transcript-centric / HITL / variant work that Workstream 02 was duplicating. Don't build a parallel system.

The new mental model:

```
        ┌─────────────────────────────┐
        │ Mid-Stream                  │
        │ (Manus → GitHub repo)       │
        │ — operates on real data     │
        │ — reviews runs, HITL,       │
        │   triggers agents,          │
        │   manages practices         │
        └──────────────┬──────────────┘
                       │
                       ▼ pushes curated snapshots
                       │ (static JSON commits)
                       │
        ┌──────────────▼──────────────┐
        │ Prototype (a360-demo repo)  │
        │ — buyer-facing showcase     │
        │ — never queries production  │
        │ — renders snapshots only    │
        └─────────────────────────────┘
```

**Two repos. One live, one frozen-but-rendered. Snapshots flow one way.**

---

## 1. What Mid-Stream already has (audit)

Source: retired-but-mirrored `C:\Users\Chris\repos\Mid_Stream/src/pages/`. The Manus-deployed version is the active codebase, but the local clone reflects what's there structurally.

| Page | Purpose | Status (need to verify against live) |
|------|---------|--------------------------------------|
| `RunsPage.tsx` | List all runs, filter, sort | Functional |
| `RunDetailPage.tsx` | Single run with extraction output | Functional |
| `HITLVerificationPage.tsx` | Reviewer corrections + override capture | **Broken (see §4)** |
| `AgentsPage.tsx` | Trigger downstream agents on a run | **Broken (see §4)** |
| `CoachingPage.tsx` | Coaching pipeline output | Functional (calls internal Manus LLM) |
| `OpportunitiesPage.tsx` | Opportunity tracker | Likely functional |
| `PracticesPage.tsx` | Practice list | Likely functional |
| `PracticeLibraryPage.tsx` | Practice-level catalog | Likely functional |
| `TCPWrapperPage.tsx` | TCP integration | Unknown |
| `IntegrationsPage.tsx` | GHL / Zenoti / AesthetixCRM routing | Functional (UI only) |
| `DashboardPage.tsx` | Aggregate KPIs | Likely functional |
| `HubPage.tsx` | Landing | Functional |
| `PromptManager/` | Prompt set / version management | Likely functional |

**Translation:** every page Workstream 02 was going to add already exists in Mid-Stream. The variant compare from Workstream 03 fits naturally onto `RunDetailPage` — sibling runs against the same transcript can be displayed there. There is no functional gap that justifies a parallel system.

---

## 2. The boundary

| Concern | Lives in | Why |
|---------|---------|-----|
| Run history, transcript drilldown, HITL review, agent triggering, override capture, practice config, prompt management | **Mid-Stream** | Authoritative ops tool; queries Prompt Runner + Supabase live; backed by reviewer accounts |
| Buyer demo: curated examples, "look at this golden run", boulevard pitch, accuracy lab story, flywheel narrative, TCP marketing showcase | **Prototype** | Static, share-friendly, version-controlled, never breaks because the API is down |
| Bridge | `prototype/data/snapshots/*.json` | Snapshots committed to the prototype repo when an operator wants a real example to land in the showcase |

The toggle from Workstream 01 still applies, but its meaning sharpens:
- **Prototype mode** = render staged content + committed snapshots
- **Test mode** = link out to Mid-Stream for the real article (don't reimplement)

So `demo-extraction-live.html` in Test mode could become a thin wrapper that says "Open run XYZ in Mid-Stream →" rather than reimplementing the run viewer. Or it stays as it is (it's already useful for buyers). Decide per page.

---

## 3. The push-to-prototype pattern

### From Mid-Stream's side

Add a single button to `RunDetailPage`: **"Snapshot to Prototype"**.

```ts
// pseudocode in RunDetailPage
async function snapshotToPrototype() {
  const run = await fetchRun(runId);
  const transcript = await fetchTranscript(run.transcript_id);
  const downstream = await fetchDownstreamFor(runId);

  const snapshot = {
    snapshot_id: crypto.randomUUID(),
    captured_at: new Date().toISOString(),
    captured_by: currentUser.email,
    note: prompt('Why is this snapshot worth shipping to the prototype?'),
    run, transcript, downstream,
  };

  await saveSnapshotToRepo(snapshot);  // GitHub PR or commit-to-branch
}
```

### Snapshot storage

Snapshots land in `a360_demo/snapshots/<slug>.json`, where `<slug>` is something like `lumiere-microneedling-2026-04-22.json`. They're tracked in `snapshots/INDEX.json` so the prototype can list them.

### From the prototype's side

Prototype pages that want to render snapshots read `snapshots/INDEX.json` and offer a picker. The existing `eval_data_v32_final.json` and `batches_data.json` are early examples of this exact pattern.

### What the bridge avoids

- No live API dependency from the demo (a deploy can never fail because Prompt Runner is down)
- No PHI risk in shared demos (snapshots are reviewed before commit)
- Reviewer-controlled curation (operators pick what's demo-worthy)
- Auditable (every snapshot has a captured_by + captured_at + reason)

---

## 4. Mid-Stream issues to address

The user's separate note flagged that Mid-Stream is calling Prompt Runner endpoints that don't exist:

| Mid-Stream feature | Endpoint called | Reality |
|-------------------|-----------------|---------|
| Downstream agents (email, cross-sell, opportunities) | `POST /runs/{id}/downstream` | Does not exist |
| HITL Analyze | `POST /runs/{id}/hitl/analyze` | Does not exist |
| HITL Get/Submit | `GET/POST /runs/{id}/hitl` | Does not exist |
| Extraction result | `GET /extraction/{run_id}` | Should be `GET /runs/{id}/outputs/{prompt_key}` |
| Downstream history | `GET /runs/{id}/downstream` | Does not exist |

Working features: `/runs`, `/runs/{id}`, `/transcripts`, `/transcripts/{id}`, `/opportunities`, `/agents`, `/prompts/sets`, `POST /extraction/run`, `/practices`, `/catalogs`.

**Two repair paths:**

1. **Patch Mid-Stream to match the API.** Rewrite the broken calls. Smaller blast radius. Right answer if the missing endpoints aren't planned.
2. **Build the missing endpoints in Prompt Runner.** Larger blast radius but matches Mid-Stream's existing UI assumptions. Right answer if those endpoints were always intended.

To decide, the user should answer: are downstream/hitl endpoints in the Prompt Runner backlog, or were they never planned? See the follow-on Prompt Runner check.

---

## 5. Working on Mid-Stream from Claude Code

The user wants to evaluate and modify Mid-Stream from Claude Code rather than only via Manus. Workflow:

1. **Local clone:** `C:\Users\Chris\repos\Mid_Stream` (mirror of `https://github.com/ccabell/Mid_Stream`)
2. **Run dev server locally:** `cd C:\Users\Chris\repos\Mid_Stream && npm install && npm run dev` — opens Vite on localhost
3. **Edit + test in Claude Code** as you would any project
4. **Commit + push** to the GitHub repo
5. **The Manus → GitHub sync direction matters** — see CLAUDE.md note. Confirm with user before any large rewrite that Manus won't overwrite the Claude commits on next sync.

### Suggested first session of Mid-Stream work in Claude Code

**Goal:** Verify the broken-endpoint diagnosis and stand up an evaluation environment.

1. `cd C:\Users\Chris\repos\Mid_Stream && git pull && npm install && npm run dev`
2. Browse the running app, hit the broken pages (HITL, downstream agents) — confirm 404s in network tab
3. Check `src/apiServices/` for the actual fetch calls
4. Match against the working Prompt Runner endpoints from §4
5. Decide: patch Mid-Stream OR add endpoints to Prompt Runner
6. If patching: smallest possible diff, one PR per repaired feature

This evaluation pass is also where we discover anything else worth knowing about the Manus codebase before extending it.

---

## 6. The "snapshot to prototype" PR (when it lands)

Tactically:

| Step | Where | Effort |
|------|-------|--------|
| Add a `snapshots/` folder + `INDEX.json` schema to a360_demo | Prototype | XS — convention only |
| Add Snapshot button + GitHub-commit endpoint | Mid-Stream + a small backend / GitHub Actions workflow | S — the trickiest piece |
| Update prototype pages to read from snapshots | Prototype | S — same pattern as `eval_data_v32_final.json` |
| Document the workflow | CLAUDE.md, project READMEs | XS |

Total: small. The decision to do it at all is the bigger lift than the implementation.

---

## 7. What this changes about the other workstreams

| Workstream | Change |
|------------|--------|
| 01 — Mode Toggle | Still useful. Test mode now means "render committed snapshots", not "live API queries from the prototype". |
| 02 — Patient Journey | **Superseded.** Lives in Mid-Stream. |
| 03 — Transcript Variables | **Mostly superseded.** The "run with different model / prompt / practice" UI belongs in Mid-Stream's RunDetailPage. The prototype could still show *side-by-side variants from a snapshot* if that's useful for a demo, but the operator does the actual variant runs. |
| 04 — TCP Content | **Unchanged.** This is showcase work — content libraries, marketing/education materials. Lives in the prototype. |
| 05 — End-to-End | Reframed: instead of stitching prototype pages into a journey, the journey is "Mid-Stream operates → snapshots flow → prototype renders". The cross-page transcript_id stuff still applies to the prototype but as a navigation nicety, not the primary feature. |

---

## 8. Open questions to confirm with user

Before any code lands:

1. **Manus → GitHub sync direction.** Two-way? One-way? If one-way, Claude Code commits will be overwritten on the next Manus sync. Need to know before pushing anything substantial.
2. **Mid-Stream missing endpoints — patch or build?** §4 above. The right answer depends on Prompt Runner roadmap.
3. **Snapshot governance.** Who can push snapshots to the prototype? Anyone with Mid-Stream access? Or PR-gated for review? The latter is safer for a buyer-facing artifact.
4. **Snapshot redaction.** Real transcripts contain PHI by default. Do we redact transcript text in snapshots, or only ship runs against synthetic test transcripts?
