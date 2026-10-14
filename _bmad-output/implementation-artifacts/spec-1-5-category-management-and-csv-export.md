---
title: 'Story 1.5: Category Management & CSV Data Export'
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

**Problem:** Jonas needs full ownership of his financial data, the ability to adjust category envelopes, configure his manual XOF/GHS exchange rate, and export all recorded expenses to CSV without external dependencies.

**Approach:** Implement a Settings & Category modal / screen with category envelope editing, manual rate input (`1 GHS = X XOF`), and a pure client-side RFC 4180 CSV export generator.

## Boundaries & Constraints

**Always:**
- RFC 4180 CSV formatting with headers: `ID,Date,Amount,Currency,Category,Merchant,Note,Source,TransactionRef`.
- Trigger client download via Blob URL.
- Allow updating category allocations and manual exchange rate stored in IndexedDB.
- Zero emojis. Use vector Ionicons exclusively.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| CSV Export with expenses | 10 expenses recorded in IndexedDB | Browser/device downloads `SEP_Expenses_<date>.csv` | Toast confirmation |
| Empty export | 0 expenses | CSV generated with headers only | Friendly alert |
| Manual rate update | Enters `42.5` | Saved to `monthly_budgets` and live converted across views | Validate rate > 0 |

</frozen-after-approval>

## Code Map

- `src/app/shared/components/settings-modal/settings-modal.component.ts` -- Modal for Categories, Manual Rate & CSV Export
- `src/app/core/services/export.service.ts` -- CSV generation and download trigger
- `src/app/home/home.page.html` -- Header settings button triggers SettingsModal

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/services/export.service.ts` -- Build ExportService to generate CSV string and trigger client download
- [x] `src/app/shared/components/settings-modal/` -- Build SettingsModalComponent for managing exchange rate, categories, and triggering CSV export
- [x] `src/app/home/home.page.ts` -- Connect top header settings icon to launch SettingsModalComponent

## Implementation Notes
