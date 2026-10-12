---
name: Calm Ledger
colors:
  surface: '#fff7f9'
  surface-dim: '#e9d4e1'
  surface-bright: '#fff7f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ffeff7'
  surface-container: '#fde8f5'
  surface-container-high: '#f8e2ef'
  surface-container-highest: '#f2dde9'
  on-surface: '#231821'
  on-surface-variant: '#4e444a'
  inverse-surface: '#392d36'
  inverse-on-surface: '#ffebf7'
  outline: '#80747a'
  outline-variant: '#d1c3ca'
  surface-tint: '#79526f'
  primary: '#57344f'
  on-primary: '#ffffff'
  primary-container: '#714b67'
  on-primary-container: '#f0bfe0'
  inverse-primary: '#e9b8d9'
  secondary: '#00696e'
  on-secondary: '#ffffff'
  secondary-container: '#92eff5'
  on-secondary-container: '#006e73'
  tertiary: '#593a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#784f00'
  on-tertiary-container: '#ffc36c'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd7f1'
  primary-fixed-dim: '#e9b8d9'
  on-primary-fixed: '#2f1029'
  on-primary-fixed-variant: '#5f3b56'
  secondary-fixed: '#95f1f8'
  secondary-fixed-dim: '#78d5db'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#ffddb2'
  tertiary-fixed-dim: '#ffb94d'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#fff7f9'
  on-background: '#231821'
  surface-variant: '#f2dde9'
typography:
  display-hero:
    fontFamily: Nunito Sans
    fontSize: 52px
    fontWeight: '800'
    lineHeight: 58px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Nunito Sans
    fontSize: 44px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Nunito Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Nunito Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  caption-sm:
    fontFamily: Nunito Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption-currency:
    fontFamily: Nunito Sans
    fontSize: 11px
    fontWeight: '800'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  margin-tablet: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a tranquil, non-judgmental financial environment tailored to post-secondary students in West Africa navigating daily micro-budgets across Ghana (GHS) and neighboring Francophone corridors (XOF). Money management at this stage of life is fraught with anxiety, sudden social pressures, and volatile expenses. The visual narrative discards punitive, high-stress visual idioms—such as aggressive red alerts and sensory-overload dashboards—in favor of a grounded, reassuring "Calm Ledger" aesthetic.

By blending the deliberate restraint of classical editorial bookkeeping with warm, tactile modernism, the UI feels like a supportive companion rather than an auditor. The atmosphere balances quiet discipline with positive reinforcement, celebrating micro-savings milestones and reframing budget breaches as gentle course corrections.

## Colors

The palette operates under a strict, warm-tinted light mode designed for high outdoor legibility in bright sunlight while reducing cognitive fatigue during late-night study sessions.

- **Brand & Ledger Foundation (`#714B67`)**: A grounded, mature Plum serves as the institutional foundation for primary identity, header bars, and structural anchors.
- **Action & Reward (`#017E84`)**: Deep Teal commands forward-moving affordances, deposit confirmations, positive cash flow states, and milestone celebrations.
- **Budget Alerts & Warnings (`#FFAC00`)**: Warm Amber handles budget pace warnings, threshold cautions, and impulse friction alerts. Over-budget events must never trigger aggressive alarm states; instead, pair this amber with high-contrast Dark Ink (`#3A2A00`) text to preserve emotional clarity.
- **Critical System Failures (`#C0392B`)**: Purely reserved for blocking operational states (failed bank API transfers, zero network connectivity, auth lockouts). It is explicitly forbidden to use this red for student spending overruns.
- **Canvas (`#F7F3F6`)**: A soft, tinted plum-hued off-white canvas that eliminates harsh LCD white glare.
- **Surfaces (`#FFFFFF`)**: Pure white elevated cards, creating distinct contrast against the off-white ground.
- **Typography Inks**: Primary reading ink is Plum-Charcoal (`#2B1F28`) for AAA legibility; secondary supporting metadata uses muted Mauve-Gray (`#6B5966`).
- **Hairlines & Dividers (`#EADFE7`)**: Soft structural framing borders that mirror the plum undertone.

## Typography

Typography relies entirely on the rounded, highly legible forms of Nunito Sans. Its curved terminals counteract cold transactional financial records, lending an empathetic tone to balance numbers and financial summaries.

For currency figures (`GHS` and `XOF`), apply tabular lining figures to ensure vertical alignment within dual-currency balance sheets. Dual-currency comparative rows should pair primary display figures with uppercase ISO badges using `caption-currency` to avoid mathematical ambiguity across exchange rates.

## Layout & Spacing

This design system is optimized for native Android shells via Capacitor, enforcing strict thumb-zone ergonomics for single-handed usage on medium-to-large mobile viewports.

- **Grid Architecture**: Single-column vertical stream on mobile screens with a rigid 16px (`1rem`) outer screen gutter, expanding to a 24px (`1.5rem`) margin on tablet displays.
- **Thumb Zone Hierarchy**: Core destructive and conversion actions (e.g., Quick Log, Resist Impulse, Move to Vault) reside within the bottom 35% of the screen. Critical informational balances anchor the top-to-middle region.
- **Vertical Spacing Scale**: A consistent 8pt linear rhythm (implemented via 4px micro-increments: 4px, 8px, 16px, 24px, 32px) separates distinct ledger groupings, maintaining breathing room while avoiding excessive scrolling in transaction-heavy views.

## Elevation & Depth

Visual hierarchy rejects hard skeuomorphism and heavy drop shadows, opting instead for a soft, plum-tinted ambient depth that reinforces the physical presence of white paper cards lying over the `#F7F3F6` ledger base.

- **Level 0 (Base Canvas)**: Flat `#F7F3F6` background.
- **Level 1 (Ledger Cards & Surface Blocks)**: Pure `#FFFFFF` fill supported by a structural hairline border `1px solid #EADFE7` and tinted ambient shadow: `box-shadow: 0 2px 10px rgba(113, 75, 103, 0.08)`.
- **Level 2 (Modals, Coachmarks & Bottom Drawers)**: High-prominence overlays utilize `box-shadow: 0 8px 24px rgba(113, 75, 103, 0.14)` alongside standard border definition.
- **Level 3 (Tactile Press States)**: Interactive touch targets drop their ambient offset on active tap down to `box-shadow: 0 1px 3px rgba(113, 75, 103, 0.12)`, offering haptic-grade visual feedback.

## Shapes

The geometric signature emphasizes gentle, approachable curvature with consistent corner radii tailored to functional purpose:

- **Standard Cards**: 20px continuous corner radius (`rounded-2xl`).
- **Interactive Action Elements**: Form inputs and 52px-tall CTA buttons strictly adopt a 20px rounded rectangle profile to maintain uniform touch target silhouettes.
- **Status Badges & Currency Pills**: Full capsule profile (`border-radius: 9999px`).
- **Coach & Friction Bubbles**: Asymmetric speech card geometry featuring 24px curvature across three corners, anchored by a single 4px sharp corner indicating the focal target or trigger origin.

## Components

### Buttons
- **Primary CTA (Reward/Save)**: 52px fixed height, `#017E84` background, `#FFFFFF` text, `Nunito Sans 16px Bold`, 20px corner radius.
- **Brand Action**: 52px fixed height, `#714B67` background, `#FFFFFF` text.
- **Tertiary / Friction Breaker**: 52px height, transparent background with `1.5px solid #EADFE7`, `#6B5966` text. Active press applies a light plum tint (`rgba(113, 75, 103, 0.06)`).

### Cards & Ledger Containers
- Constructed on `#FFFFFF` surfaces with a 20px border radius, enveloped by `1px solid #EADFE7` and `box-shadow: 0 2px 10px rgba(113, 75, 103, 0.08)`.
- Inner content padding uses `16px` (`space-md`) on compact layouts and `24px` (`space-lg`) on balance overviews.

### Currency Switcher & Badges
- **Pill Badges**: Pill-shaped (`9999px`), 24px height, horizontal padding of 8px.
- **Active Currency Pill**: `#714B67` fill with `#FFFFFF` text.
- **Alternate Rate Comparison**: Outline variant in `#EADFE7` with `#6B5966` text for real-time conversion references (e.g., `≈ 4,250 XOF`).

### Alert Cards (Budget Resistance & Course Correction)
- Background `#FFF8E7`, stroke `1.5px solid #FFAC00`, text `#3A2A00`.
- Iconography rendered in solid `#FFAC00`.
- Non-punitive copy framing (e.g., "Pacing alert" instead of "Budget exceeded").

### Inputs
- 52px height, `#FFFFFF` fill, `1.5px solid #EADFE7` border, 20px corner radius.
- Floating currency prefix labels (`GHS` or `XOF`) set in `caption-sm` plum ink.
- Focus state: `1.5px solid #714B67` outline with zero exterior glow.

### Coach Bubble
- 24px border radius with one 4px anchor corner directed at the referenced UI control.
- White `#FFFFFF` fill with elevated Level 2 shadow (`0 8px 24px rgba(113, 75, 103, 0.14)`).
- Padding of 16px (`space-md`), housing micro-nudges designed to curb impulse spending.