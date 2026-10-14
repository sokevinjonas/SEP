# Epic 1 Context: Core Ledger, Offline Budgeting & Fast Logging

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Enable Jonas to open the application cold on Android, view his real-time remaining budget and Budget Days immediately, log an expense in 3 taps or less whether offline or online, manage his expense categories, and export all data to CSV.

## Stories

- Story 1.1: Project Scaffold & Calm Ledger Design System
- Story 1.2: Local-First Database & Repository Engine (idb)
- Story 1.3: Home Dashboard with Breathing Balance & Budget Days
- Story 1.4: Rapid Expense Logging (≤ 3 Taps) Modal
- Story 1.5: Category Management & CSV Export

## Requirements & Constraints

- Fast manual expense logging in at most 3 taps from the first screen (FR1).
- Budget Days computation displayed with dynamic basis label: planned daily budget early in month; 7-day rolling average once 7 days of data exist (FR2).
- Category envelopes management and complete local data export to CSV (FR4).
- Offline-first architecture: IndexedDB via `idb` is the authoritative single source of truth. All reads and mutations occur synchronously against IndexedDB without awaiting network (NFR2).
- Native Android delivery via Ionic Framework with Angular standalone components and Capacitor Android (NFR1).
- Single-user solo application in English (NFR6).

## Technical Decisions

- Ionic 8 + Angular 18 standalone components (`@ionic/angular`, `@angular/core`, `@capacitor/android`).
- Client-side persistence: IndexedDB database `sep_local_db` accessed via `idb` library. Stores: `expenses`, `categories`, `monthly_budgets`, `sync_queue`.
- All entity IDs are client-generated UUIDv4 strings.
- Timestamps in ISO 8601 UTC string format; monetary amounts as floats rounded to 2 decimals with currency tag (`GHS` | `XOF`).
- Design System: Odoo Enterprise theme with Plum `#714B67`, Action Teal `#017e84`, Warning Amber `#ffac00` with dark text `#3a2a00`, Error Red `#c0392b`, Light Base `#F7F3F6`.
- Typography: Nunito font scale embedded locally.
- Strict rule: ZERO emojis in UI, only vector SVG/Ionicons.

## UX & Interaction Patterns

- Light theme with `#F7F3F6` background.
- Persistent bottom action bar in thumb zone: `I want to buy` (Plum) and `+ Add` (Teal) at 52dp touch target height, above 3-tab navigation (Home, Capture, Budget).
- Home dashboard breathing balance card with subtle pulsating dot indicator.
- Category pills with vector icons and quick incremental amount pills (+5, +10, +20, +50).
- Mascot integration: M. Pognon Option 2 golden coin character.
