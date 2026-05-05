# Workstream 01 — Prototype ↔ Test Mode Toggle

**Goal:** Add a single global toggle that flips every page between two coherent modes — *Prototype* (curated, share-friendly) and *Test* (real backend, audit-friendly).

This is the foundation for everything else. Until we have it, "real data" leaks into the demo and "demo data" pollutes internal testing.

---

## User-facing behavior

### The toggle

Sits in the **top-right of the nav**, replaces nothing. Looks like a 2-position pill:

```
[ Prototype ] [ Test ]
   ^selected
```

- Prototype = orange-ish accent (`var(--amber)`)
- Test = green accent (`var(--green)`)
- Click flips, persists to localStorage as `a360_mode`
- Defaults to **Prototype** on first visit
- Persists across pages and sessions

### Visual difference per page

| Element | Prototype mode | Test mode |
|---------|---------------|-----------|
| Page header | Subtle orange "Prototype" pill next to the title | Subtle green "Live data" pill, plus a small `source: <thing>` line under the subtitle |
| Number formatting | Same JetBrains Mono | Same |
| Status banners | Stronger ("Concept demo, illustrative figures") | Quieter ("Live from Prompt Runner — last refreshed 14s ago") |
| API errors | Should never happen — pages only show static data | Show a tiny "test mode unavailable, falling back to prototype" toast and degrade gracefully |

### Per-page support matrix

Each page declares which modes it supports. If a user toggles to a mode the current page doesn't support, the toggle still flips (other pages will respect it) but the current page shows a small "not available in [mode]" banner.

| Page | Prototype | Test | Notes |
|------|-----------|------|-------|
| `demo-hero.html` | ✓ | ✓ | Test pulls aggregate stats from `/runs?count=true` etc. |
| `demo-extraction.html` | ✓ | — | Static-only by design |
| `demo-extraction-live.html` | ✓ | ✓ | Already test-mode-ish; prototype mode locks it to the golden run |
| `demo-agents.html` | ✓ | — | Curated pipeline view |
| `demo-tcp-builder.html` | ✓ | ✓ | Test mode pulls real practice context from Supabase |
| `demo-journey.html` (workstream 02) | ✓ | ✓ | Prototype walks the golden transcript; Test allows picking any of 122 |
| `demo-testing.html` | ✓ | ✓ | Same data either way; framing changes |
| `demo-flywheel.html` | ✓ | ✓ | Test fetches real practice configs |
| `demo-batch-test.html` | — | ✓ | Test-only by nature — replays real artifacts |
| `demo-intelligence.html` | ✓ | ✓ | Test queries Supabase aggregates |
| `demo-products.html` | ✓ | ✓ | Test runs live GL queries |

---

## Implementation

### New file: `mode-toggle.js`

Mirrors the `agent-info-panel.js` pattern — single self-contained component, drop-in via `<script>`.

```js
(function(){
  // Read/write localStorage
  const KEY = 'a360_mode';
  let mode = localStorage.getItem(KEY) || 'prototype';
  const listeners = [];

  // Inject CSS for the pill
  injectStyles();

  // Find the .nav-links and append the pill before/after it
  // (or wait for DOMContentLoaded, then inject)
  attachToggle();

  // Public API
  window.A360 = window.A360 || {};
  window.A360.mode = () => mode;
  window.A360.setMode = (m) => {
    if (m === mode) return;
    mode = m;
    localStorage.setItem(KEY, m);
    document.documentElement.dataset.a360Mode = m;
    listeners.forEach(fn => fn(m));
  };
  window.A360.onModeChange = (fn) => listeners.push(fn);

  // Set initial document attribute so CSS can react
  document.documentElement.dataset.a360Mode = mode;
})();
```

### Per-page integration pattern

Each page that wants to react to mode changes:

```html
<script src="agent-info-panel.js"></script>
<script src="mode-toggle.js"></script>
<script>
  // Page-level renderers
  function renderPrototype() { /* current code */ }
  function renderTest() { /* fetches from API */ }

  function rerender() {
    if (A360.mode() === 'test') renderTest();
    else renderPrototype();
  }

  A360.onModeChange(rerender);
  rerender();
</script>
```

Pages that are mode-locked declare it via a `data-supported-modes` attribute on `<body>`:

```html
<body data-supported-modes="prototype">  <!-- demo-extraction.html -->
<body data-supported-modes="test">       <!-- demo-batch-test.html -->
<body data-supported-modes="prototype,test"> <!-- everything else -->
```

`mode-toggle.js` reads this and shows the "not available in this mode" banner if needed.

### CSS hooks

A few CSS variables flip based on mode:

```css
:root[data-a360-mode="prototype"] {
  --mode-accent: var(--amber);
  --mode-banner-bg: var(--amber-bg);
}
:root[data-a360-mode="test"] {
  --mode-accent: var(--green);
  --mode-banner-bg: var(--green-bg);
}
```

Pages can use `var(--mode-accent)` for their mode-pill styling, banners, etc.

### Page header pill

Add to each page header:

```html
<span class="mode-pill"></span>
```

Auto-populated by `mode-toggle.js`:
- Prototype mode: `<span class="mode-pill prototype">PROTOTYPE</span>`
- Test mode: `<span class="mode-pill test">TEST · LIVE DATA</span>`

---

## Data sources for Test mode

We don't need to ship Test data wiring in this PR — the toggle is the foundation; Test renderers come per-page. But to set expectations:

| Page | Test mode data source |
|------|----------------------|
| Hero | `GET /transcripts?count=true`, `GET /runs?count=true`, Supabase aggregates |
| Live Extraction | Already wired to Prompt Runner (no change) |
| Patient Journey | `GET /transcripts`, `GET /runs?transcript_id=<id>` |
| TCP Builder | Supabase: `gl_concerns`, `gl_anatomy_areas`, `pl_products`, `pl_services` |
| Testing | `GET /eval_reports/latest` (or static JSON if no endpoint yet) |
| Flywheel | Supabase: practice config + override log |
| Intelligence | Supabase aggregate views |
| Products | Supabase: `gl_products`, `pl_products` |

---

## Edge cases

1. **First visit + Test mode is broken.** localStorage default is Prototype. If the user explicitly clicked Test and the API is down, fall back to Prototype with a toast.
2. **Mode change mid-fetch.** Cancel in-flight requests when mode changes. Use AbortController.
3. **Mode change with unsaved edits** (TCP Builder, journey notes). Confirm before discarding.
4. **Demo recording.** Add a URL param `?mode=prototype` that overrides localStorage for the duration of the page load — useful for screenshots / Loom recordings.
5. **Sub-pages opened in new tabs.** localStorage propagates automatically. Listen to `storage` event so a mode change in one tab updates others.

---

## Scope

**In:**
- `mode-toggle.js` — toggle UI, state management, public API, data attribute on root, storage event listener
- CSS variables for `--mode-accent`, `--mode-banner-bg`
- Page-header `.mode-pill` rendering
- `data-supported-modes` body attribute and "not supported" banner
- Wire toggle into nav of all 11 existing pages
- Each page renders the prototype path the same as today (no behavior change yet)
- Each page registers a no-op `onModeChange` handler so the toggle doesn't visibly break

**Out (future workstreams):**
- Per-page Test renderers (lands incrementally with workstreams 02–05)
- Cross-page transcript_id state (workstream 05)

---

## Estimated size

~250 lines of new code: `mode-toggle.js` (~150) + CSS hooks + 11 nav-bar updates (~100 via script).

## Sequencing within this workstream

1. Build and unit-test `mode-toggle.js` standalone
2. Add toggle to one page (demo-hero.html), verify localStorage round-trips
3. Apply via Python loop to all 11 pages (root + prototypes/)
4. Add `data-supported-modes` to mode-locked pages
5. Smoke-test by toggling and navigating; verify no visual breakage
6. Commit + PR

---

## Demo value once shipped

Even before any Test renderer exists, the toggle:
- Signals to buyers that the platform has both share-mode and audit-mode
- Lets us land Test wiring per-page without coordinating a global cutover
- Makes mode an explicit, visible choice in screenshots and recordings
