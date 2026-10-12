---
name: Student Savings (SEP)
status: draft
sources:
  - {planning_artifacts}/prds/prd-SEP-2026-10-12/prd.md
  - {planning_artifacts}/prds/prd-SEP-2026-10-12/addendum.md
updated: 2026-10-12
---

# Student Savings — Experience Spine

## Foundation

Single-surface mobile: Android phone only (Capacitor), single user (Jonas), English UI, offline-first. No UI system is named; Android conventions apply for system gestures, back behaviour and font scaling. `DESIGN.md` is the visual reference. **One-handed use** is a design constraint on every screen. Light theme only.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Home | App open | Remaining budget (GHS + XOF), Budget Days, Avoided Total, category warnings; "I want to buy" and "+ Add" |
| Add expense | Home "+ Add" | Enter amount, category, save (≤ 3 taps) |
| Hesitation | Home "I want to buy" | Price in Budget Days and both currencies, "Do you really need it?" |
| Capture | Bottom tab | Import a receipt or payment screenshot; camera as a second option; pending offline queue |
| Preview | After extraction | Review and edit extracted data; duplicate warning; validate |
| Budget | Bottom tab | Monthly budget and daily remaining; per-category progress; Purchases by status; Expense history; entry to M. Pognon |
| M. Pognon (chat) | Budget tab | Chat with the assistant |
| Side menu | Home header | Currencies, Categories, Export, AI Settings (only once the OpenAI gateway works) |

Three bottom tabs (Home / Capture / Budget) plus a side menu. Modals stack one level deep. [ASSUMPTION: Add expense and Hesitation open as bottom sheets or full screens, not tabs.]

## Voice and Tone

Microcopy. Brand voice lives in `DESIGN.md.Brand & Style`. M. Pognon is a **strict coach and a teasing big brother**; his voice escalates with Severity (advice → warning → uncompromising). Thresholds are deterministic; the LLM only phrases.

| Do | Don't |
|---|---|
| "23 days of your budget. That's three weeks of food." | "Warning: high expense" |
| "I'm not stopping you. But think." | Insults about Jonas himself |
| Tease the purchase, not the person | Shame about money or being poor |
| Name the basis: "Based on your planned daily budget." | Show a number without its basis |
| "No network. Your capture is queued." | "Error 500" |

[ASSUMPTION: teasing targets the choice, never Jonas's situation, even at "uncompromising".]

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| Bottom action bar | Home | "I want to buy" and "+ Add" always visible, above the tabs |
| Remaining-budget card | Home | Updates immediately after an Expense, offline included |
| Budget Days line | Home, Hesitation | Always labelled "planned" or "average"; switches after 7 days of data |
| Warning pill | Home, Budget | Shows crossed Threshold; at most one alert per crossing |
| Hesitation actions | Hesitation | "Yes, buy" creates an Expense, Purchase becomes *bought*, no extra friction; "I'll think about it" sets *pending* and schedules the 24h email |
| Preview field | Preview | Uncertain fields highlighted; nothing saved until validate |
| Chat bubble | M. Pognon | Session-only memory; says clearly when offline |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Empty (new month) | Home | Big number is the full budget; M. Pognon line invites the first Expense |
| Overrun | Home, Budget | Amber pill and firmer M. Pognon line; never red |
| Offline | Everywhere | App works; Capture queues; chat says "No network"; no blocking banner on Home |
| Pending upload | Capture | Queue list with per-item status, uploads on reconnect |
| Extraction failed | Preview | Expense stays a draft; red inline error (real error); manual entry offered |
| Duplicate reference | Preview | Warning sheet: "This reference already exists." Jonas decides |
| AI cap reached | Chat | Graceful message; the rest of the app is unaffected |
| Stale email data | Emails | Timestamp of last sync shown |

## Interaction Primitives

- Tap to act; bottom-sheet pickers; swipe on list rows for secondary actions. [ASSUMPTION: swipe to delete an Expense with a confirm.]
- All primary actions reachable by thumb; no top-corner critical actions.
- Playful moments: breathing big number, discreet confetti when a Purchase is abandoned.
- **Banned:** streak counters, level badges, red for budget states, push notifications (email only).

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md`.

- TalkBack: every control labelled with role and state; budget pills announce category and percentage.
- Font scaling honoured; primary buttons never truncate at the largest setting.
- Reduce Motion: no breathing animation, no confetti; show the result directly.
- Touch targets ≥ 48dp. Colour never the only signal: warnings also carry text ("Food 78%").
- Focus order follows reading order.

## Inspiration & Anti-patterns

- **Lifted from Cleo:** an AI character with humour and frankness. M. Pognon is the same idea, but a strict coach, not a roast-only comedian.
- **Lifted from Monzo:** a single clear number as the home of the app.
- **Lifted from YNAB:** amber instead of red when a category is overspent.
- **Lifted from impulse-friction patterns:** reframing a price as time or concrete things, and a "think it over" option instead of a hard no.
- **Rejected — heavy gamification (levels, streaks):** would push for engagement, not for saving; the counter-metric SM-C1 warns against alert volume.

## Key Flows

### Flow 1 — Log a coffee (UJ-1, Jonas, between two lectures, one hand on the bag strap)

1. Jonas opens the app; Home shows GHS 412 remaining.
2. He taps "+ Add" with his thumb.
3. He enters the amount and picks "Food".
4. He taps Save.
5. **Climax:** Home returns with the new remaining amount, and the number gently settles.

Failure: offline → saved locally, same result.

### Flow 2 — Sneakers (UJ-2, Jonas in a shop, phone in one hand)

1. He taps "I want to buy" and enters GHS 320.
2. Hesitation shows "23 days of your budget · ≈ XOF 13,400" and "That's three weeks of food. Do you really need them?"
3. M. Pognon adds one frank line.
4. He taps "I'll think about it" (Purchase *pending*).
5. 24h later an email asks him to decide; he abandons it.
6. **Climax:** back on Home, the Avoided Total grows, with discreet confetti.

Alternate: "Yes, buy" turns the Purchase into an Expense immediately, with no further friction.

### Flow 3 — Receipt in a market without network (UJ-3, Jonas)

1. He opens Capture and imports the photo (or uses the camera) while offline.
2. The item appears in the pending queue.
3. Network returns; upload and extraction run automatically.
4. Preview opens with uncertain fields highlighted.
5. He corrects one field and validates.
6. **Climax:** the Expense is saved and the remaining budget updates.

Edge: duplicate reference → warning sheet before saving.

### Flow 4 — Drifting over budget (UJ-4, Jonas)

1. Food passes 90%; an email alert arrives, firmer than the 70% advice.
2. He opens the app; an amber "Food 92%" pill is on Home.
3. He taps into Budget, then M. Pognon.
4. He challenges his next purchase in the chat.
5. **Climax:** M. Pognon answers frankly, and the tone matches the current Severity.

## Open Items

- M. Pognon illustration (production and style) — [NOTE FOR UX].
- PRD alignment: FR-9 should state "import first, camera second".
- Nunito vs Poppins — confirm when mocks are built. [ASSUMPTION]
