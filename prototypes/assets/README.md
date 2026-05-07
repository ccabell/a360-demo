# Image assets — Reach RCS demo pages

The two RCS pages reference image files in this folder. Drop your real
images here at the exact paths below and they'll show up automatically
in the rich cards / carousels. The HTML stays unchanged.

| Filename | Where it appears | Notes |
|---|---|---|
| `cryolipolysis.jpg` | `demo-rcs-education.html` · main rich card | The "How CoolSculpting works" / cryolipolysis card. Square or 16:10 works best. |
| `cooltone.jpg` | `demo-rcs-education.html` · carousel card 1 | The CoolTone "Sculpting the Slopes" ad image you sent. 4:3 thumbnail target. |
| `morpheus8.jpg` | `demo-rcs-education.html` · carousel card 2 | The Morpheus8 device photo you sent. 4:3 thumbnail target. |
| `coolsculpting-areas.jpg` | (reserved — not currently rendered, available if a body-areas card is added) | The body diagram showing treatment zones. |

## Format notes

- JPG or PNG, both work
- The card image area has `aspect-ratio: 16/10` (main card) or `4/3` (carousel cards) — the CSS uses `background-size: cover`, so any aspect ratio works visually but ratio-matched looks tightest
- Keep file size under ~150 KB each so RCS-style preview feels snappy
- All images stay in this `assets/` folder; the same paths are mirrored at `prototypes/assets/` for the Vercel deploy

## Fallback behavior

If a file is missing, the card falls back to the gradient + icon placeholder — the page still renders cleanly. So you can drop images in incrementally without breaking anything.
