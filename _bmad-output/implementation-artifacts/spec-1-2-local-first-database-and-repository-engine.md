---
title: 'Story 1.2: Local-First Database & Repository Engine (idb)'
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

**Problem:** The app must be 100% functional offline on campus in Ghana. All financial state (expenses, categories, monthly budgets, considered purchases, and sync queue) must persist locally with zero network latency.

**Approach:** Implement a robust IndexedDB data service using the `idb` library for `sep_local_db` with typed interfaces, automatic default category seeding, and local repository methods.

## Boundaries & Constraints

**Always:**
- Use IndexedDB via `idb` wrapper.
- Database name: `sep_local_db`.
- Object stores: `expenses`, `categories`, `monthly_budgets`, `purchases`, `sync_queue`.
- Seed default student categories if empty: Food & Chop, Transport / Trotro, Books & School, Social / Hangouts, Data & Utilities, Other.
- Zero network calls required for any local data mutation.
- Entity IDs are client-generated UUIDv4 strings.

**Never:**
- Never block UI thread on network calls during storage operations.
- Never use emojis in category records or icons; use vector icon keys exclusively.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Fresh launch | Empty IndexedDB | `sep_local_db` created and default categories seeded automatically | Catch upgrade error, log descriptive error |
| Add expense | Valid expense object | Stored in `expenses` store and queued in `sync_queue` under 100ms | Atomic transaction rollback on validation failure |
| Retrieve budget | Month key (e.g., `2026-05`) | Returns budget object or creates default month allowance | Returns fallback local budget |

</frozen-after-approval>

## Code Map

- `src/app/core/models/` -- Typed interfaces for `Expense`, `Category`, `MonthlyBudget`, `Purchase`, `SyncItem`
- `src/app/core/db/database.service.ts` -- `idb` wrapper managing `sep_local_db` lifecycle, migrations, and seeding
- `src/app/core/db/database.service.spec.ts` -- Unit tests verifying DB initialization, seeding, and operations

## Tasks & Acceptance

**Execution:**
- [x] `src/app/core/models/` -- Define TypeScript models for Expense, Category, MonthlyBudget, Purchase, SyncItem
- [x] `src/app/core/db/database.service.ts` -- Implement DatabaseService with `idb`, schema initialization, and category seeding
- [x] `src/app/core/db/database.service.spec.ts` -- Add unit tests for DatabaseService

**Acceptance Criteria:**
- Given the application initializes for the first time, when the database service starts, then an IndexedDB database named `sep_local_db` is created with stores `expenses`, `categories`, `monthly_budgets`, `purchases`, and `sync_queue`.
- Given an unseeded database, when initialized, then default student categories are populated with vector icon identifiers and zero emojis.
- Given any create or read operation, then it resolves locally from IndexedDB without network requests.

## Implementation Notes
