---
name: Student Savings (SEP)
description: Personal Android finance assistant. Calm surfaces, playful touches, light theme only, a stern-but-teasing character (M. Pognon).
status: draft
sources:
  - {planning_artifacts}/prds/prd-SEP-2026-10-12/prd.md
  - {planning_artifacts}/prds/prd-SEP-2026-10-12/addendum.md
updated: 2026-10-12
colors:
  primary: '#714B67'
  action: '#017e84'
  warning: '#ffac00'
  on-warning: '#3a2a00'
  error: '#c0392b'
  surface-base: '#F7F3F6'
  surface-raised: '#FFFFFF'
  ink-primary: '#2B1F28'
  ink-secondary: '#6B5966'
  border-hairline: '#EADFE7'
  on-primary: '#FFFFFF'
  on-action: '#FFFFFF'
typography:
  display:
    fontFamily: 'Nunito'
    fontSize: 46px
    fontWeight: 800
    letterSpacing: -1px
  title:
    fontFamily: 'Nunito'
    fontSize: 22px
    fontWeight: 800
    lineHeight: 1.2
  body:
    fontFamily: 'Nunito'
    fontSize: 16px
    fontWeight: 600
  meta:
    fontFamily: 'Nunito'
    fontSize: 12px
    fontWeight: 600
rounded:
  sm: 12px
  md: 20px
  lg: 28px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
components:
  button-primary:
    backgroundColor: '{colors.action}'
    textColor: '{colors.on-action}'
    rounded: '{rounded.md}'
    height: 52px
  button-secondary:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.primary}'
    rounded: '{rounded.md}'
    height: 52px
  card:
    backgroundColor: '{colors.surface-raised}'
    rounded: '{rounded.md}'
  pill-warning:
    backgroundColor: '{colors.warning}'
    textColor: '{colors.on-warning}'
    rounded: '{rounded.full}'
---

## Brand & Style

Student Savings is a calm place that does not let you off the hook. The surface is quiet and airy, with one big number at the centre, and the playfulness comes from small moments: a number that gently breathes, discreet confetti when you abandon a purchase, and M. Pognon, an illustrated character with a moustache and a monocle who is half strict coach, half teasing big brother. The calm of the layout is the counterweight to the frankness of the messages. Only Jonas uses it, so the style serves one person's motivation, not a market.

Reference direction: **Calm Ledger** (`.working/directions-1.html`, direction A). Plum and teal come from Odoo Enterprise as colours only; nothing else is borrowed from Odoo.

## Colors

- **Plum `{colors.primary}`** — identity colour. Big money numbers, titles, secondary-button outline, the Hesitation "I'll think about it" fill.
- **Teal `{colors.action}`** — everything Jonas can act on: primary buttons, progress bars, the Avoided Total (the reward).
- **Amber `{colors.warning}`** with dark text `{colors.on-warning}` — every budget warning (70%, 90% and overrun pills). Overruns stay amber, never red.
- **Red `{colors.error}`** — real errors only (failed upload, failed extraction, network failure). Never a budget state.
- **Neutrals** — `{colors.surface-base}` page, `{colors.surface-raised}` cards, `{colors.ink-primary}` text, `{colors.ink-secondary}` captions, `{colors.border-hairline}` dividers. [ASSUMPTION: neutral values derived from the plum hue; Jonas gave only the three brand colours.]
- **Light theme only.** No dark tokens exist, by decision.

## Typography

Rounded and friendly: **Nunito**. [ASSUMPTION: Nunito chosen over Poppins; bundled with the app so it works offline.] `display` is reserved for the single big amount on Home and the day count on Hesitation. `title` for screen headings and M. Pognon's lines on Hesitation. `body` for everything else; `meta` for captions such as the Budget Days basis label. No all-caps labels. The type scale must survive Android's largest font setting without clipping the primary buttons.

## Layout & Spacing

Spacing scale 4 / 8 / 12 / 16 / 24 / 32. Single column, 16dp side margins. **One-handed use is a layout rule:** primary actions live in the bottom thumb zone, above the tab bar; the top of the screen holds only information and the settings entry point. Home has few elements and generous gaps (`{spacing.4}` between cards). Budget and Capture lists are denser, `{spacing.2}` between rows.

## Elevation & Depth

Soft, low elevation: cards use a faint plum-tinted shadow (`0 2px 8px` at ~10% plum) over `{colors.surface-base}`. The bottom action bar is separated by a hairline, not a shadow. No heavy shadows.

## Shapes

Generously rounded. Cards `{rounded.md}`, buttons `{rounded.md}`, warning pills `{rounded.full}`. Sheets and the M. Pognon bubble `{rounded.lg}` with one squared tail corner. Rounded corners carry the "friendly" half of the brand.

## Components

- **Remaining-budget card** — `{components.card}`. Meta caption, `display` amount in `{colors.primary}`, meta line with XOF equivalent and Budget Days + basis label, thin progress bar in `{colors.action}`.
- **Avoided card** — `{components.card}`. Amount in `{colors.action}`, small flexing emoji.
- **Primary / secondary buttons** — bottom action bar, "I want to buy" (`{components.button-secondary}`) left, "+ Add" (`{components.button-primary}`) right, equal width, 52dp tall, one-thumb reachable.
- **Warning pill** — `{components.pill-warning}`, category name + percentage (e.g. "Food 78%").
- **Hesitation screen** — white card on `{colors.surface-base}`: item and price in `meta`, day count in `display` in `{colors.primary}`, a concrete reframing line, then the question in `title`. Bottom bar: "Yes, buy" secondary, "I'll think about it" filled plum.
- **M. Pognon avatar & logo** — Stylized golden coin character (`app_logo_final.jpg`) winking with a distinguished monocle, handlebar moustache, and a plum bowler hat `{colors.primary}`. Shown in the app icon, chatbot header, and beside his lines in bubbles; the bubble is `{colors.primary}` with white text.
- **Capture entry** — large import tile (primary) with a smaller camera action.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Put primary actions in the bottom thumb zone | Put key actions at the top corners |
| Use amber for every budget state, including overruns | Use red for a budget state |
| Reserve red for real errors | Use red as decoration or emphasis |
| Keep Home quiet: one big number, few cards | Fill Home with charts and badges |
| Show the Avoided Total in teal as a reward | Use gamified clutter (levels, streaks) |
| Show both XOF and GHS on Hesitation | Show a single currency without the other |
