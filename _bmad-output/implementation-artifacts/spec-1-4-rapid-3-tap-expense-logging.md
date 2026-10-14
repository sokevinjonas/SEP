---
title: 'Story 1.4: Rapid 3-Tap Expense Logging'
type: 'feature'
created: '2026-10-14'
status: 'done'
baseline_commit: 'fbd888cb96da860da4a2a453f2b866a000328aff'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Students on the go between classes need to log a purchase in under 3 taps without dealing with multi-step forms or delay.

**Approach:** Build a dedicated standalone modal component `QuickLogModalComponent` triggered by the persistent `+ Add` button with amount numpad/incremental pills, 1-tap category chips, instant IndexedDB commit, and reactive dashboard update.

## Boundaries & Constraints

**Always:**
- Maximum 3 taps to save a standard expense.
- Immediate IndexedDB persistence in `expenses` and queued in `sync_queue`.
- Rapid update of Home remaining budget without page reload.
- Clean vector icons for all categories (Food, Trotro, Books, Social, Utilities, Other). Zero emojis.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Quick log happy path | Amount 15 GHS, tap Food, tap Save | Expense saved, modal dismissed, Home balance updated | If amount is 0, highlight error toast |
| Fast quick pills | Tap +10, +5, tap Transport, Save | Amount 15 saved under Transport | Live recalculation in modal |
| Currency toggle in modal | Switch GHS/XOF | Saves with selected currency tag | Correct tag persisted in record |

</frozen-after-approval>

## Code Map

- `src/app/shared/components/quick-log-modal/quick-log-modal.component.ts` -- Modal with numpad, quick pills, and categories
- `src/app/app.component.ts` -- Opens QuickLogModal when `+ Add` is tapped from persistent ActionBar

## Tasks & Acceptance

**Execution:**
- [x] `src/app/shared/components/quick-log-modal/` -- Create QuickLogModalComponent with numpad, pills, and categories
- [x] `src/app/app.component.ts` -- Wire ActionBar `(quickLog)` event to launch QuickLogModalComponent using IonModalController
- [x] `src/app/home/home.page.ts` -- Refresh dashboard whenever an expense is added

## Implementation Notes
