---
title: 'Story 1.3: Home Dashboard & Budget Days Calculation'
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

**Problem:** Jonas needs to immediately see his live remaining balance, dual-currency conversion (GHS/XOF), avoided savings counter, and dynamic Budget Days runway calculation (planned early in month, real average after 7 days) without manual calculation.

**Approach:** Connect `HomePage` to `DatabaseService` to calculate real-time remaining budget, distinct days spent, dynamic Budget Days with the correct basis label, and display real stored transactions.

## Boundaries & Constraints

**Always:**
- Dynamic Budget Days calculation:
  - When distinct days with expenses in month < 7: `Remaining Budget / Planned Daily Allowance` with label `"(planned)"`.
  - When distinct days >= 7: `Remaining Budget / Real Daily Average` with label `"(average)"`.
- Display dual currency with manual rate (1 GHS = X XOF).
- Display Avoided Total from abandoned purchases in `purchases` store.
- Zero emojis. Use vector Ionicons exclusively.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Month start (< 7 spend days) | 3 recorded days, 500 GHS left, planned 20 GHS/day | 25 Budget Days, label "(planned)" | Guard against zero planned allowance |
| Mid-month (>= 7 spend days) | 10 days, 250 GHS spent (25 GHS/day avg), 350 GHS left | 14 Budget Days, label "(average)" | Fallback to planned if avg is 0 |
| Currency toggle | Jonas taps GHS/XOF | Live amounts recompute to XOF without page reload | Instant recalculation |

</frozen-after-approval>

## Code Map

- `src/app/home/home.page.ts` -- Home logic reading from DatabaseService, computing Budget Days and Avoided Total
- `src/app/home/home.page.html` -- Home template rendering breathing balance, budget days badge, and recent logs

## Tasks & Acceptance

**Execution:**
- [x] `src/app/home/home.page.ts` -- Wire HomePage to DatabaseService, implement Budget Days algorithm (planned vs average), currency conversion, and reactive state
- [x] `src/app/home/home.page.html` -- Update template with real dynamic data binding, progress bar, and logs list

## Implementation Notes
