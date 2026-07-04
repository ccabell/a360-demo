# Boulevard Design Kit — UI Style Reference

Extracted from Boulevard's production site (`joinblvd.com`). Use this as the authoritative reference when building Boulevard-styled UIs.

---

## Color Palette

### Primary Brand

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| `primary` | `#CEAA75` | rgb(206, 170, 117) | **Gold/champagne** — CTAs, brand accents, highlights |
| `primary-light` | `#C8AB7C` | rgb(200, 171, 124) | Lighter gold — hover states, secondary accent |
| `secondary` | `#183E43` | rgb(24, 62, 67) | **Deep teal** — dark backgrounds, secondary CTA |

### Neutrals

| Token | Hex | Usage |
|-------|-----|-------|
| `onyx` | `#000000` | Primary text, dark backgrounds, logo |
| `softblack` | `#212529` | Body text alternative |
| `iron` | `#807F7E` | Secondary text, muted elements |
| `stone` | `#CBCACA` | Borders, dividers, inactive elements |
| `silt` | `#E4E4DE` | Warm light gray — subtle section backgrounds |
| `fog` | `#F5F4F1` | **Off-white warm** — content areas, cards |
| `white` | `#FFFFFF` | Primary background, text on dark |

### Functional

| Hex | Usage |
|-----|-------|
| `#11B078` | Success/positive (green) |
| `#288E62` | Darker green variant |
| `#1369E1` | Links, interactive elements (blue) |
| `#8E2828` | Error/warning (deep red) |

### Extended Grays

`#303030` · `#4E4E4E` · `#555555` · `#6A6A6A` · `#757575` · `#818181` · `#979797` · `#B4B4B4` · `#BABABA` · `#D1D1D1` · `#E0E0E0` · `#E4E4E4` · `#E7E7E7` · `#EEEEEE` · `#F3F3F3` · `#F8F8F8` · `#FBFBFB`

---

## Typography

### Font Families

| Role | Font | Fallback | Weights |
|------|------|----------|---------|
| **Display/Headlines** | Rework Headline | Arial, sans-serif | 400, 600 |
| **Body/UI** | Basis Grotesque Pro | Arial, sans-serif | 400, 500, 700 |
| **Monospace** | Roboto Mono | monospace | 100–700 (variable) |

> **Note:** Rework Headline and Basis Grotesque Pro are licensed fonts. For open-source alternatives:
> - Rework Headline → **DM Sans** (display weight) or **Plus Jakarta Sans** (bold)
> - Basis Grotesque Pro → **Inter**, **DM Sans**, or **Plus Jakarta Sans**

### Type Scale

| Level | Size | Font | Weight |
|-------|------|------|--------|
| Display/Hero | 64–96px | Rework Headline | 400–600 |
| H1 | 36–40px | Rework Headline | 400–600 |
| H2 | 28–32px | Rework Headline | 400–600 |
| H3 | 22–24px | Rework Headline | 400–600 |
| Body Large | 18–20px | Basis Grotesque Pro | 400 |
| Body | 15–16px | Basis Grotesque Pro | 400 |
| Body Small | 13–14px | Basis Grotesque Pro | 400 |
| Caption/Label | 10–12px | Basis Grotesque Pro | 500–700 |

### Type Treatments

- **Navigation/CTAs:** UPPERCASE + letter-spacing `0.1em` (wide tracking)
- **Headings:** Tight tracking (near 0), line-height `1.14`–`1.3`
- **Body:** Line-height `1.4`–`1.625`
- **Labels:** Uppercase, weight 500–700, small size

---

## Component Patterns

### Buttons

| Style | Background | Text | Shape |
|-------|-----------|------|-------|
| **Primary CTA** | `#CEAA75` gold | White, uppercase, semibold, tracking `0.1em` | Pill (`border-radius: 9999px`) |
| **Dark CTA** | `#000000` black | White, uppercase | Pill |
| **Secondary CTA** | `#183E43` teal | White, uppercase | Pill |
| **Ghost/Text** | Transparent | `#C8AB7C` gold text | None |

**Key pattern:** Buttons are **pill-shaped** (fully rounded), **uppercase**, with **wide letter-spacing**.

### Cards

- Background: White or `#F5F4F1` (fog)
- Border: `#CBCACA` (stone) or `#807F7E` (iron) at low opacity
- Border-radius: `12px` (xl) or `16px` (2xl)
- Shadow: `0 5px 5px 0 rgba(0,0,0,0.1)` or `0 10px 15px 0 rgba(0,0,0,0.15)`

### Form Inputs

- Border-based (not filled backgrounds)
- Focus state: gold border (`#CEAA75`)
- Clean, minimal styling
- Font inherits body font

### Tables

- Sticky white header row
- Borders: `#E7E7E7`
- Cell padding: `10px`
- Subtle column shadows on scroll

### Navigation

- **Top horizontal nav bar** (not sidebar)
- Logo left, nav center/right, CTA right ("Get a Demo")
- Uppercase nav labels with wide letter-spacing
- Mega-menu dropdowns
- Dark footer (black bg, white text)

---

## Layout & Spacing

- **Grid:** Tailwind CSS utility-based
- **Breakpoints:** 390px (xsm), 640px (sm), 768px (md), 1024px (lg), 2xl
- **Whitespace:** Generous — luxury-appropriate spacing between sections
- **Content density:** Low to medium
- **Common spacing:** 10px, 16px, 28px (Tailwind 4px base)
- **Pattern:** Alternating text + image section layouts

---

## Visual Style

### Overall: **Flat design with subtle depth**

- **No colorful gradients** — gradients only used for structural overlays (fade-to-transparent)
- **Subtle shadows** — refined, not heavy
- **Color used sparingly** — gold accent draws eye to key actions

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 2px | Small elements |
| `rounded` | 4px | Default |
| `rounded-md` | 6px | Inputs |
| `rounded-xl` | 12px | Cards |
| `rounded-2xl` | 16px | Large cards |
| `rounded-[30px]` | 30px | Pill badges |
| `rounded-full` | 9999px | Pill buttons, circular elements |

### Shadows

```
--shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
--shadow-md:  0 5px 5px rgba(0,0,0,0.1);
--shadow-lg:  0 10px 15px -3px rgba(0,0,0,0.1);
```

### Icons

- SVG-based, `currentColor` for fills/strokes
- Clean, minimal line style

### Animation

- `fadeUpIn` keyframe for scroll-reveal
- Horizontal scroll carousels with configurable duration

---

## Mode & Theme

- **Light mode dominant** — white/fog backgrounds, black text
- **Dark sections** — hero areas and footer use black/softblack backgrounds with white text
- **No user-toggled dark mode** — sections have fixed light/dark assignments
- **Product dashboard:** Light/white interface, color used only for staff schedule differentiation and status indicators

---

## Brand Personality

**Premium minimalism with warmth.**

- Clean and refined — not sterile (warm gold + off-white prevent coldness)
- Luxury-adjacent — befitting med spa/salon audience
- Confident restraint — color is sparse and intentional
- Sophisticated sans-serif typography with editorial flair
- Professional but approachable
- Content-first — generous whitespace, clear hierarchy

---

## CSS Custom Properties (Copy-Paste Ready)

```css
:root {
  /* Colors */
  --blvd-primary: #CEAA75;
  --blvd-primary-light: #C8AB7C;
  --blvd-secondary: #183E43;
  --blvd-onyx: #000000;
  --blvd-softblack: #212529;
  --blvd-iron: #807F7E;
  --blvd-stone: #CBCACA;
  --blvd-silt: #E4E4DE;
  --blvd-fog: #F5F4F1;
  --blvd-white: #FFFFFF;
  --blvd-green: #11B078;
  --blvd-blue: #1369E1;
  --blvd-red: #8E2828;

  /* Typography */
  --blvd-font-body: "Basis Grotesque Pro", "Inter", Arial, sans-serif;
  --blvd-font-headline: "Rework Headline", "DM Sans", Arial, sans-serif;
  --blvd-font-mono: "Roboto Mono", monospace;

  /* Border Radius */
  --blvd-radius-sm: 2px;
  --blvd-radius-md: 6px;
  --blvd-radius-lg: 12px;
  --blvd-radius-xl: 16px;
  --blvd-radius-pill: 9999px;

  /* Shadows */
  --blvd-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --blvd-shadow-md: 0 5px 5px rgba(0,0,0,0.1);
  --blvd-shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
}
```

---

## Tailwind Config (Copy-Paste Ready)

```js
// tailwind.config.js — Boulevard theme
module.exports = {
  theme: {
    extend: {
      colors: {
        blvd: {
          primary: '#CEAA75',
          'primary-light': '#C8AB7C',
          secondary: '#183E43',
          onyx: '#000000',
          softblack: '#212529',
          iron: '#807F7E',
          stone: '#CBCACA',
          silt: '#E4E4DE',
          fog: '#F5F4F1',
          green: '#11B078',
          blue: '#1369E1',
          red: '#8E2828',
        },
      },
      fontFamily: {
        headline: ['"Rework Headline"', '"DM Sans"', 'Arial', 'sans-serif'],
        body: ['"Basis Grotesque Pro"', '"Inter"', 'Arial', 'sans-serif'],
        mono: ['"Roboto Mono"', 'monospace'],
      },
      borderRadius: {
        'blvd-sm': '2px',
        'blvd-md': '6px',
        'blvd-lg': '12px',
        'blvd-xl': '16px',
        'blvd-pill': '9999px',
      },
      boxShadow: {
        'blvd-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'blvd-md': '0 5px 5px rgba(0,0,0,0.1)',
        'blvd-lg': '0 10px 15px -3px rgba(0,0,0,0.1)',
      },
    },
  },
};
```

---

## Product Dashboard Patterns (SaaS App)

The actual Boulevard product (behind login) uses:

- **Light/white interface** — black text on white
- **Top nav bar** — horizontal menu (Schedule, Appointments, etc.), NOT a sidebar
- **Calendar primary view** — "Front Desk" is default; Day/Today/4-Day/Week views
- **Color-coded staff schedules** — each provider gets a custom color
- **Slide-up/slide-out panels** — booking triggers bottom panel; checkout triggers right pane
- **Client profiles** — tabbed layout (history, purchases, forms)
- **Minimal color** — black text on white, color only for meaningful differentiation
- **Typography-driven hierarchy** — size and weight guide attention, not color
