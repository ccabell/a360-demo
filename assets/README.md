# Image assets — Reach RCS demo pages

This folder is reserved for image files referenced from the RCS rich
cards and carousels in `demo-rcs-booking.html` and `demo-rcs-education.html`.

## Current state

The current scripts use emoji/icon fallbacks only — no images are
loaded from this folder yet. Cards render the gradient + icon
placeholder defined in CSS (e.g. 💧 for the HydraFacial education
card, header bands for the booking plan cards).

## Adding images later

If you want to swap any card to use a real image:

1. Drop the file in this folder (matching path in `prototypes/assets/`
   for the Vercel mirror).
2. Extend the card renderer to honour an `image:` field on the step,
   e.g. `<div class="img" style="background-image:url('${escHTML(c.image)}')"></div>`
   when present, falling back to the icon when not.
3. Add `image: 'assets/<filename>.jpg'` to the relevant SCRIPT step.

## Format notes

- JPG or PNG, both work
- Main rich card image area is `aspect-ratio: 16/10`; carousel cards are `4/3`
- The CSS uses `background-size: cover`, so any aspect ratio works visually
- Keep file size under ~150 KB each so the preview feels snappy
- All images stay in this `assets/` folder; mirror to `prototypes/assets/` for the Vercel deploy

## Suggested filenames for the current flows

| Card | Suggested filename |
|---|---|
| Booking · Full Face Refresh combo card | `full-face-refresh.jpg` |
| Education · HydraFacial main card | `hydrafacial.jpg` |
| Education · LED Light carousel card | `led-light-therapy.jpg` |
| Education · Perk Lip carousel card | `perk-lip.jpg` |
| Education · Glow Recovery Kit carousel card | `glow-recovery-kit.jpg` |

## Fallback behavior

If an image file is missing (or the `image:` field isn't set), the card
falls back to the gradient + icon placeholder — the page still renders
cleanly. So you can drop images in incrementally without breaking anything.
